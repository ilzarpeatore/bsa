import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { VStack } from '@components/ui/vstack';
import { HStack } from '@components/ui/hstack';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Card } from '@components/ui/card';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import DaySelectorStrip from '../../components/DaySelectorStrip';
import { buildDayRange, toLocalISODate } from '../../components/dayRange';
import { C } from './theme';
import { dietApi, AssignedMealsSummary, AssignedMealRecipe } from '../../api/diet';
import { recipesApi } from '../../api/recipes';
import logger from '@helper/logger';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

// Próximos 7 días (hoy incluido) para elegir a qué día del plan se añade la
// opción de comida -- el mismo horizonte que usa el selector de plan_screen,
// pero mirando hacia adelante (aquí se añade algo nuevo, no se consulta lo ya
// planeado).
function buildUpcomingWeek(): { date: string; dayLetter: string; dayNumber: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 6);
  return buildDayRange(7, end);
}

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

function isMealType(value: unknown): value is MealType {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snacks';
}

export default function AssignedMealsScreen(props: any) {
  const dietId: number | undefined = props.route?.params?.dietId;
  const dietTitle: string | undefined = props.route?.params?.dietTitle;
  const isDietMode = !!dietId;
  // Enlace directo desde MigratedPlan ("Ver opciones asignadas" en cada
  // sección) -- arranca ya en la pestaña de esa sección en vez de siempre en
  // "breakfast".
  const initialMealType: MealType = isMealType(props.route?.params?.mealType)
    ? props.route.params.mealType
    : 'breakfast';

  const [goal, setGoal] = useState<AssignedMealsSummary['goal'] | null>(null);
  const [meals, setMeals] = useState<AssignedMealsSummary['meals'] | null>(null);
  const [title, setTitle] = useState<string>(dietTitle ?? 'Assigned to Me');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MealType>(initialMealType);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Añadir una opción de comida a un día concreto del plan (se refleja en
  // MigratedPlan vía el mismo endpoint save-daily-plan-recipe que usa
  // plan_screen.tsx al añadir desde allí). Por defecto, hoy.
  const upcomingDays = useMemo(() => buildUpcomingWeek(), []);
  const [selectedDate, setSelectedDate] = useState(() => toLocalISODate(new Date()));
  const [dailyPlanId, setDailyPlanId] = useState<number | null>(null);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  useEffect(() => {
    let ignore = false;
    dietApi
      .getDailyPlan(selectedDate)
      .then((res) => {
        if (ignore) return;
        setDailyPlanId(res.data?.data?.id ?? null);
      })
      .catch((e) => {
        if (!ignore) {
          logger.error('Daily plan fetch error (assigned meals):', e);
          setDailyPlanId(null);
        }
      });
    return () => {
      ignore = true;
    };
  }, [selectedDate]);

  const selectedDayLabel = useCallback(() => {
    const today = toLocalISODate(new Date());
    if (selectedDate === today) return 'hoy';
    const d = new Date(`${selectedDate}T00:00:00`);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }, [selectedDate]);

  const addRecipeToDay = async (recipe: AssignedMealRecipe) => {
    if (!dailyPlanId) {
      Alert.alert('Error', 'No se pudo preparar el plan de ese día. Inténtalo de nuevo.');
      return;
    }
    setAddingIds((prev) => new Set(prev).add(recipe.id));
    try {
      await recipesApi.saveDailyPlanRecipe(dailyPlanId, recipe.id, activeTab);
      Alert.alert('Añadido', `"${recipe.title}" se añadió a ${MEAL_TYPES.find(m => m.key === activeTab)?.label} de ${selectedDayLabel()}. Ya lo verás en tu Plan diario.`);
    } catch (e) {
      logger.error('Add recipe to day error:', e);
      Alert.alert('Error', 'No se pudo añadir esta comida. Inténtalo de nuevo.');
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(recipe.id);
        return next;
      });
    }
  };

  const addSelectedToDay = async () => {
    if (!dailyPlanId || selectedIds.size === 0) return;
    setIsBulkAdding(true);
    try {
      const recipes = allRecipes.filter((r) => selectedIds.has(r.id));
      await Promise.all(recipes.map((r) => recipesApi.saveDailyPlanRecipe(dailyPlanId, r.id, activeTab)));
      Alert.alert('Añadido', `${recipes.length} comida(s) añadidas a ${selectedDayLabel()}. Ya las verás en tu Plan diario.`);
      setSelectedIds(new Set());
    } catch (e) {
      logger.error('Bulk add to day error:', e);
      Alert.alert('Error', 'No se pudieron añadir todas las comidas. Inténtalo de nuevo.');
    } finally {
      setIsBulkAdding(false);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isDietMode) {
        const res = await dietApi.getDietMealItems(dietId!);
        setMeals(res.data.meals);
        setTitle(res.data.diet?.title ?? dietTitle ?? 'Diet');
      } else {
        const res = await dietApi.getAssignedMealsSummary();
        setGoal(res.data.goal);
        setMeals(res.data.meals);
      }
    } catch (e) {
      logger.error('Failed to load meals', e);
    } finally {
      setIsLoading(false);
    }
  }, [isDietMode, dietId, dietTitle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openRecipe = (recipe: AssignedMealRecipe) => {
    props.navigation.navigate('MigratedDietDetail', {
      recipeId: recipe.id,
      recipeImage: recipe.recipe_image ?? undefined,
    });
  };

  const activeRecipes = meals?.[activeTab] ?? [];

  const toggleSelected = (recipeId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  };

  const allRecipes: AssignedMealRecipe[] = meals
    ? (['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).flatMap((key) => meals[key] ?? [])
    : [];
  const selectedRecipes = allRecipes.filter((r) => selectedIds.has(r.id));
  const selectedKcal = selectedRecipes.reduce((sum, r) => sum + (Number(r.calories) || 0), 0);
  const goalKcal = Number(goal?.kcal) || 0;
  const kcalRatio = goalKcal > 0 ? selectedKcal / goalKcal : 0;
  const kcalStatus: 'under' | 'onTarget' | 'over' | null =
    !isDietMode && goalKcal > 0 && selectedIds.size > 0
      ? kcalRatio > 1.1
        ? 'over'
        : kcalRatio >= 0.9
        ? 'onTarget'
        : 'under'
      : null;
  const kcalStatusColor = kcalStatus === 'over' ? C.red : kcalStatus === 'onTarget' ? C.success : C.orange;
  const kcalStatusText =
    kcalStatus === 'over'
      ? `Te pasas ${Math.round(selectedKcal - goalKcal)} kcal de tu objetivo`
      : kcalStatus === 'onTarget'
      ? 'Esta combinación se ajusta a tu objetivo'
      : kcalStatus === 'under'
      ? `Aún te faltan ${Math.round(goalKcal - selectedKcal)} kcal para tu objetivo`
      : '';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScreenHeader title={title} onBack={() => props.navigation.goBack()} />

      {isLoading ? (
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      ) : (
        <>
          {!isDietMode && (
            <Card variant="ghost" className="mx-4" style={{ marginTop: 16, marginBottom: 12 }}>
              <HStack space="sm" className="items-center justify-center">
                <Icon name="flame-outline" size={22} color={C.orange} />
                <Text weight="extrabold" size="xl">{goal?.kcal ?? 0}</Text>
                <Text size="xs" muted>kcal / day goal</Text>
              </HStack>
              <HStack className="justify-around" style={{ marginTop: 14 }}>
                <VStack className="items-center">
                  <Text weight="bold" size="sm">{goal?.protein ?? 0}g</Text>
                  <Text size="xs" muted style={{ marginTop: 2 }}>Protein</Text>
                </VStack>
                <VStack className="items-center">
                  <Text weight="bold" size="sm">{goal?.carbs ?? 0}g</Text>
                  <Text size="xs" muted style={{ marginTop: 2 }}>Carbs</Text>
                </VStack>
                <VStack className="items-center">
                  <Text weight="bold" size="sm">{goal?.fats ?? 0}g</Text>
                  <Text size="xs" muted style={{ marginTop: 2 }}>Fats</Text>
                </VStack>
              </HStack>
            </Card>
          )}

          {!isDietMode && selectedIds.size > 0 && (
            <Card
              variant="ghost"
              className="mx-4"
              style={{ marginBottom: 12, borderWidth: 1.5, borderColor: kcalStatusColor }}
            >
              <Text weight="extrabold" size="lg">
                {selectedKcal} <Text size="xs" muted>/ {goalKcal} kcal seleccionadas</Text>
              </Text>
              <Text weight="semibold" size="xs" style={{ color: kcalStatusColor, marginTop: 4 }}>
                {kcalStatusText}
              </Text>
              <Pressable
                className="flex-row items-center justify-center rounded-md bg-primary"
                style={{ marginTop: 10, paddingVertical: 10, opacity: isBulkAdding || !dailyPlanId ? 0.6 : 1 }}
                disabled={isBulkAdding || !dailyPlanId}
                onPress={addSelectedToDay}
              >
                {isBulkAdding ? (
                  <Spinner size="small" color={C.white} />
                ) : (
                  <>
                    <Icon name="add-circle-outline" size={18} className="text-primary-foreground" />
                    <Text weight="semibold" size="sm" className="text-primary-foreground" style={{ marginLeft: 6 }}>
                      Añadir {selectedIds.size} a {selectedDayLabel()}
                    </Text>
                  </>
                )}
              </Pressable>
            </Card>
          )}

          {/* En modo dieta (isDietMode) no se pinta la tarjeta de kcal de
              arriba, así que esta fila de pestañas pasa a ser el primer
              bloque tras ScreenHeader -- necesita su propio marginTop
              (en el otro modo ya lo da el marginBottom de esa tarjeta). */}
          <HStack space="sm" className="px-4" style={{ marginTop: isDietMode ? 16 : 0, marginBottom: 12 }}>
            {MEAL_TYPES.map(({ key, label }) => (
              <Pressable
                key={key}
                className={`flex-1 items-center py-2 rounded-md ${activeTab === key ? 'bg-primary' : 'bg-secondary'}`}
                onPress={() => setActiveTab(key)}
              >
                <Text
                  weight="semibold"
                  size="xs"
                  className={activeTab === key ? 'text-primary-foreground' : 'text-muted-foreground'}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </HStack>

          <Box className="px-4" style={{ marginBottom: 16 }}>
            <Text size="xs" weight="semibold" muted style={{ marginBottom: 8 }}>
              Añadir a tu plan del día
            </Text>
            <DaySelectorStrip days={upcomingDays} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </Box>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {activeRecipes.length === 0 ? (
              <Box className="items-center" style={{ paddingVertical: 60 }}>
                <Icon name="restaurant-outline" size={40} color={C.gray30} />
                <Text size="sm" style={{ color: C.gray30, marginTop: 10 }}>
                  No {MEAL_TYPES.find(m => m.key === activeTab)?.label.toLowerCase()} assigned yet.
                </Text>
              </Box>
            ) : (
              activeRecipes.map(recipe => (
                <Box
                  key={recipe.id}
                  className="flex-row items-center bg-card rounded-lg"
                  style={{
                    marginBottom: 10,
                    borderWidth: 1.5,
                    borderColor: !isDietMode && selectedIds.has(recipe.id) ? C.brand50 : 'transparent',
                  }}
                >
                  {!isDietMode && (
                    <Pressable
                      style={{ paddingLeft: 12, paddingVertical: 12 }}
                      onPress={() => toggleSelected(recipe.id)}
                    >
                      <Icon
                        name={selectedIds.has(recipe.id) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selectedIds.has(recipe.id) ? C.brand50 : C.gray40}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    className="flex-1 flex-row items-center p-3"
                    style={{ paddingLeft: 0 }}
                    onPress={() => openRecipe(recipe)}
                  >
                    {recipe.recipe_image ? (
                      <Image source={{ uri: recipe.recipe_image }} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 10, marginRight: 12 }} />
                    ) : (
                      <Box className="bg-muted" style={{ width: 52, height: 52, borderRadius: 10, marginRight: 12 }} />
                    )}
                    <Box className="flex-1">
                      <Text weight="bold" size="sm" numberOfLines={1} style={{ marginBottom: 4 }}>{recipe.title}</Text>
                      <HStack space="sm">
                        <Text size="xs" weight="semibold">{recipe.calories} kcal</Text>
                        <Text size="xs" muted>P {recipe.protein}g</Text>
                        <Text size="xs" muted>C {recipe.carbs}g</Text>
                        <Text size="xs" muted>F {recipe.fats}g</Text>
                      </HStack>
                    </Box>
                  </Pressable>
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ paddingHorizontal: 14, paddingVertical: 12, opacity: !dailyPlanId ? 0.5 : 1 }}
                    disabled={addingIds.has(recipe.id) || !dailyPlanId}
                    onPress={() => addRecipeToDay(recipe)}
                  >
                    {addingIds.has(recipe.id) ? (
                      <Spinner size="small" color={C.orange} />
                    ) : (
                      <Icon name="add-circle-outline" size={24} color={C.orange} />
                    )}
                  </Pressable>
                </Box>
              ))
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
