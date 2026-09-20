import React, { useState, useEffect, useMemo } from 'react';
import {  StyleSheet, ScrollView, Dimensions, Linking  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView, useSafeAreaInsets  } from 'react-native-safe-area-context';
import {  Gesture, GestureDetector  } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {  runOnJS  } from 'react-native-worklets';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Divider  } from '@components/ui/divider';
import { FONT, RADIUS } from './theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import GlassSegmentedBar from '@components/GlassSegmentedBar';
import {  dietApi  } from '../../api/diet';
import {  recipesApi, RecipeStep, RecipeIngredient  } from '../../api/recipes';
import {  fatSecretApi  } from '../../api/fatsecret';
import logger from '@helper/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DietModel {
  id?: number;
  title?: string;
  dietImage?: string;
  calories?: string;
  carbs?: string;
  fat?: string;
  protein?: string;
  totalTime?: string;
  ingredients?: string;
  description?: string;
  isFavourite?: number;
  isPremium?: number;
  isAccessible?: number;
  [key: string]: any;
}

interface DietDetailScreenProps {
  navigation: any;
  route: {
    params: {
      dietModel?: DietModel;
      id?: number;
      recipeId?: number;
      fatsecretRecipeId?: number;
      recipeImage?: string;
      isCategory?: boolean;
      isFeatured?: boolean;
    };
  };
}

export default function DietDetailScreen(props: DietDetailScreenProps) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  const getVitamins = (icon: string, title: string, subTitle: string) => (
    <VStack className="items-center flex-1">
      <Icon name={icon as any} size={26} color={C.textPrimary} />
      <Text style={localStyles.vitaminTitle}>{title}</Text>
      <Text style={localStyles.vitaminSubtitle}>{subTitle}</Text>
    </VStack>
  );
  const dietModel = props.route.params?.dietModel ?? {};
  const fallbackId = props.route.params?.id;
  const recipeId = props.route.params?.recipeId;
  // FIX (2026-09-20, bug real confirmado en vivo): antes esta pantalla solo
  // sabía mostrar una receta propia -- tocar el título/imagen de una comida
  // de FatSecret no llevaba a ningún sitio (plan_screen.tsx cortaba antes de
  // navegar). isAnyRecipeMode cubre el render compartido (mismas pestañas
  // Ingredientes/Instrucciones); isLockedRecipe/favoritos siguen siendo
  // exclusivos de una receta propia -- FatSecret no tiene ese concepto.
  const fatsecretRecipeId = props.route.params?.fatsecretRecipeId;
  const recipeImageParam = props.route.params?.recipeImage;
  const isRecipeMode = !!recipeId;
  const isFatSecretMode = !!fatsecretRecipeId;
  const isAnyRecipeMode = isRecipeMode || isFatSecretMode;
  const [select, setSelect] = useState(true);
  const [dietState, setDietState] = useState<DietModel>(dietModel);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeSteps, setRecipeSteps] = useState<RecipeStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // Swipe horizontal sincronizado con las pestañas Ingredientes/Instrucciones:
  // deslizar cambia `select` (y por tanto qué pestaña se ve activa arriba),
  // igual que tocar el pill lo hace. translateX solo da feedback visual
  // durante el gesto -- el contenido en sí no se anima entre secciones (se
  // sustituye al soltar), por eso siempre vuelve a 0 con spring.
  const swipeX = useSharedValue(0);
  const SWIPE_THRESHOLD = 60;

  const goToIngredients = () => setSelect(true);
  const goToInstructions = () => setSelect(false);

  // activeOffsetX debe ser MENOR que failOffsetY: si no, un swipe real (que
  // casi nunca es perfectamente horizontal) supera el umbral vertical de
  // fallo antes de llegar al umbral de activación horizontal y el gesto se
  // cancela casi siempre -- exactamente el bug reportado ("no es posible
  // navegar deslizando"). Con activeOffsetX pequeño y failOffsetY holgado el
  // swipe horizontal gana incluso con el desvío diagonal natural del dedo,
  // mientras que un scroll claramente vertical sigue fallando el pan y cede
  // al ScrollView.
  const contentSwipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      swipeX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD) {
        runOnJS(goToInstructions)();
      } else if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(goToIngredients)();
      }
      swipeX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const contentSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value * 0.2 }],
  }));

  useEffect(() => {
    // Fallback for when the screen is navigated with only { id } instead of the
    // full dietModel object (e.g. deep links / notifications) — fetch from the API.
    if (!dietModel?.id && fallbackId) {
      setIsLoading(true);
      dietApi
        .getDetail(fallbackId)
        .then((res) => {
          const d = res.data?.data;
          if (!d) return;
          setDietState({
            id: d.id,
            title: d.title,
            dietImage: d.diet_image,
            calories: d.calories,
            carbs: d.carbs,
            fat: d.fat,
            protein: d.protein,
            totalTime: d.total_time,
            ingredients: d.ingredients,
            description: d.description,
            isPremium: d.is_premium,
            isFavourite: 0,
          });
        })
        .catch((e) => logger.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [fallbackId, dietModel?.id]);

  useEffect(() => {
    // Recipe mode: fetch a real recipe (with structured ingredients/steps) instead
    // of a legacy Diet model.
    if (recipeId) {
      setIsLoading(true);
      recipesApi
        .getDetail(recipeId)
        .then((res) => {
          const d = res.data?.data;
          if (!d) return;
          setDietState({
            id: d.id,
            title: d.title,
            dietImage: d.recipe_image || recipeImageParam,
            calories: String(d.calories ?? ''),
            carbs: String(d.carbs ?? ''),
            fat: String(d.fats ?? ''),
            protein: String(d.protein ?? ''),
            totalTime: d.preparation_time ? `${d.preparation_time} min` : '',
            description: d.description,
            isPremium: d.is_premium ? 1 : 0,
            isAccessible: d.is_accessible === false ? 0 : 1,
            isFavourite: d.is_favourite ?? 0,
          });
          setRecipeIngredients(res.data?.recipe_ingredients ?? []);
          setRecipeSteps(
            (res.data?.recipe_steps ?? []).slice().sort((a, b) => a.sequence - b.sequence)
          );
        })
        .catch((e) => logger.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [recipeId, recipeImageParam]);

  useEffect(() => {
    // Modo FatSecret: se adapta la respuesta a los MISMOS shapes que ya
    // usa el modo receta propia (RecipeStep/RecipeIngredient) para
    // reutilizar el render de ingredients()/instruction() sin duplicarlo --
    // ver docs/FATSECRET_INTEGRATION.md en Bckbs para el contrato real de
    // esta respuesta (directions: string[], ingredients: {description,...}[]).
    if (fatsecretRecipeId) {
      setIsLoading(true);
      fatSecretApi
        .getRecipeDetail(fatsecretRecipeId)
        .then((res) => {
          const d = res.data?.data;
          if (!d) return;
          const totalMinutes = (d.preparation_time_min ?? 0) + (d.cooking_time_min ?? 0);
          setDietState({
            id: d.fatsecret_recipe_id,
            title: d.name,
            dietImage: d.image_url || recipeImageParam,
            calories: String(Math.round(d.calories ?? 0)),
            carbs: String(Math.round(d.carbs ?? 0)),
            fat: String(Math.round(d.fat ?? 0)),
            protein: String(Math.round(d.protein ?? 0)),
            totalTime: totalMinutes ? `${totalMinutes} min` : '',
            isPremium: 0,
            isAccessible: 1,
            isFavourite: 0,
          });
          setRecipeIngredients(
            (d.ingredients ?? []).map((ing, index) => ({
              id: index,
              ingredient_id: ing.food_id ?? 0,
              ingredient_title: ing.description || 'Ingrediente',
              measurement_unit_id: 0,
              measurement_unit_title: '',
              quantity: ing.number_of_units ?? 0,
              amount: 0,
              quantity_grams: 0,
              quantity_display: '',
              calories: 0,
              protein: 0,
              fats: 0,
              carbs: 0,
            }))
          );
          setRecipeSteps(
            (d.directions ?? []).map((instruction, index) => ({
              id: index,
              instruction,
              sequence: index,
            }))
          );
        })
        .catch((e) => logger.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [fatsecretRecipeId, recipeImageParam]);

  const setDiet = async (id?: number) => {
    // FatSecret no tiene concepto de favorito -- el botón se oculta para
    // este modo (ver JSX), esto es solo una red de seguridad extra.
    if (!id || isFatSecretMode) return;
    setIsLoading(true);
    try {
      if (isRecipeMode) {
        await recipesApi.setFavourite(id);
      } else {
        await dietApi.setFavourite(id);
      }
      setDietState((prev) => ({
        ...prev,
        isFavourite: prev.isFavourite === 1 ? 0 : 1,
      }));
    } catch (e) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // App Store rejection (Guideline 2.2 + 3.1.1, 2026-09-10): esta rama ya no
  // debería alcanzarse navegando dentro de la app (recipe_list_screen_v2.tsx /
  // recipe_main_screen.tsx filtran las recetas exclusivas no accesibles antes
  // de enlazar aquí) -- se deja como red de seguridad para un favorito
  // guardado antes del filtro, sin sugerir compra ni sujeto ("tu coach").
  const isLockedRecipe = isRecipeMode && dietState.isPremium === 1 && dietState.isAccessible === 0;

  const ingredients = () =>
    isLockedRecipe ? (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>
          Este contenido no está disponible en este momento.
        </Text>
      </Box>
    ) : isAnyRecipeMode ? (
      <Box style={localStyles.htmlContent}>
        {recipeIngredients.length === 0 ? (
          <Text style={localStyles.htmlText}>No hay ingredientes.</Text>
        ) : (
          recipeIngredients.map((ing) => (
            <HStack key={ing.id} className="items-center" style={{ marginBottom: 10 }}>
              <Box style={localStyles.ingredientDot} />
              <Text style={[localStyles.htmlText, { flex: 1 }]}>{ing.ingredient_title}</Text>
              {/* ing.quantity=0 en modo FatSecret (la cantidad ya viene
                  incluida en ingredient_title, ver mapeo en el useEffect de
                  fatsecretRecipeId) -- sin el guard mostraría "0" suelto. */}
              <Text style={localStyles.ingredientQty}>
                {ing.quantity_display || (ing.quantity ? `${ing.quantity} ${ing.measurement_unit_title}` : '')}
              </Text>
            </HStack>
          ))
        )}
      </Box>
    ) : (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>{dietState.ingredients || ''}</Text>
      </Box>
    );

  const instruction = () =>
    isLockedRecipe ? (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>
          Este contenido no está disponible en este momento.
        </Text>
      </Box>
    ) : isAnyRecipeMode ? (
      <Box style={localStyles.htmlContent}>
        {recipeSteps.length === 0 ? (
          <Text style={localStyles.htmlText}>No hay instrucciones.</Text>
        ) : (
          recipeSteps.map((step, index) => (
            <Text key={step.id} style={[localStyles.htmlText, { marginBottom: 10 }]}>
              {index + 1}. {step.instruction}
            </Text>
          ))
        )}
      </Box>
    ) : (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>{dietState.description || ''}</Text>
      </Box>
    );

  return (
    <SafeAreaView style={localStyles.container} edges={['bottom']}>
      {/* Header Image */}
      <Box style={localStyles.headerSection}>
        <Image
          source={{ uri: dietState.dietImage || '' }}
          style={localStyles.headerImage}
          contentFit="cover"
        />
        <Box style={localStyles.headerOverlay} />

        {/* Back Button */}
        <Pressable
          style={[localStyles.backBtn, { top: insets.top + 8 }]}
          onPress={() => props.navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={'#FFFFFF'} />
        </Pressable>

        {/* App Store rejection Guideline 2.1(b) (2026-09-12): un badge "PRO"
            visible sin ninguna explicación de cómo se consigue -- junto con la
            política de privacidad mencionando "suscripción" -- basta para que
            un revisor pregunte por el modelo de negocio y contenido de pago
            sin IAP. Se quita: el acceso real ya lo decide el backend
            (is_accessible) y el contenido accesible se ve exactamente igual
            que cualquier otro, sin distinción visual que sugiera un
            desbloqueo dentro de la app. */}

        {/* Favourite Button -- oculto en modo FatSecret, no existe ese
            concepto para una receta de ese origen (ver setDiet). */}
        {!isFatSecretMode && (
          <Pressable
            style={[localStyles.favBtn, { top: insets.top + 18 }]}
            onPress={() => setDiet(dietState.id)}
          >
            <Box style={localStyles.favBtnInner}>
              <Icon
                name={dietState.isFavourite === 1 ? 'heart' : 'heart-outline'}
                size={20}
                color={dietState.isFavourite === 1 ? C.red : C.white}
              />
            </Box>
          </Pressable>
        )}

        {/* Title + Time */}
        <Box style={localStyles.titleRow}>
          <Text style={localStyles.dietTitle} numberOfLines={2}>
            {dietState.title || ''}
          </Text>
          <Box style={localStyles.timeBadge}>
            <Icon name="time-outline" size={16} color={'#FFFFFF'} />
            <Text style={localStyles.timeText}>{dietState.totalTime || ''}</Text>
          </Box>
        </Box>
      </Box>

      {/* Content Sheet */}
      <Box style={localStyles.contentSheet}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 + WORKOUT_MINIBAR_CLEARANCE }}>
          {/* Nutrients Row */}
          <HStack className="items-center justify-around px-2.5 py-2">
            {getVitamins('flame-outline', `${dietState.calories || '0'} Kcal`, 'Calorías')}
            <Divider orientation="vertical" className="mx-1" style={{ height: 65 }} />
            {getVitamins('leaf-outline', `${dietState.carbs || '0'} g`, 'Carbohidratos')}
            <Divider orientation="vertical" className="mx-1" style={{ height: 65 }} />
            {getVitamins('water-outline', `${dietState.fat || '0'} g`, 'Grasas')}
            <Divider orientation="vertical" className="mx-1" style={{ height: 65 }} />
            {getVitamins('nutrition-outline', `${dietState.protein || '0'} g`, 'Proteína')}
          </HStack>

          {/* Cita de la fuente de los datos nutricionales (Guideline 1.4.1,
              rechazo real de Apple 2026-09-04: "provides health or medical
              recommendations in the Recetas section without citations").
              Para una receta propia, los valores salen de USDA FoodData
              Central (ver UsdaNutritionService.php en el backend). Para una
              receta de FatSecret, la atribución tiene que ser a FatSecret
              -- es una obligación real de sus términos de uso mientras la
              cuenta no sea Premier (ver docs/FATSECRET_INTEGRATION.md en
              Bckbs sección 0), no solo una cuestión de precisión. */}
          <Pressable
            style={localStyles.sourceLink}
            onPress={() => Linking.openURL(isFatSecretMode ? 'https://www.fatsecret.com' : 'https://fdc.nal.usda.gov/')}
          >
            <Icon name="information-circle-outline" size={13} color={C.textSecondary} />
            <Text style={localStyles.sourceLinkText}>
              {isFatSecretMode ? 'Receta y datos nutricionales: FatSecret' : 'Datos nutricionales: USDA FoodData Central'}
            </Text>
          </Pressable>

          <Divider className="mx-4" style={{ height: 0.5 }} />

          {/* Tabs: Ingredients / Instruction -- Liquid Glass real en iOS
              26+ (pedido explícito 2026-08-29); antes HStack con
              backgroundColor: C.surface fijo. */}
          <Box style={localStyles.tabsRowWrap}>
            <GlassSegmentedBar className="flex-row rounded-full p-1" style={{ backgroundColor: C.surface }}>
              <Pressable
                style={[localStyles.tabPill, select && localStyles.tabPillActive]}
                onPress={() => setSelect(true)}
              >
                <Text style={[localStyles.tabPillText, select && localStyles.tabPillTextActive]}>
                  Ingredientes
                </Text>
              </Pressable>
              <Pressable
                style={[localStyles.tabPill, !select && localStyles.tabPillActive]}
                onPress={() => setSelect(false)}
              >
                <Text style={[localStyles.tabPillText, !select && localStyles.tabPillTextActive]}>
                  Instrucciones
                </Text>
              </Pressable>
            </GlassSegmentedBar>
          </Box>

          <GestureDetector gesture={contentSwipeGesture}>
            <Animated.View style={[{ padding: 16 }, contentSwipeStyle]}>
              {select ? ingredients() : instruction()}
            </Animated.View>
          </GestureDetector>
        </ScrollView>
      </Box>

      {isLoading && (
        <Box style={localStyles.loaderContainer}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  // Antes 'rgba(0,0,0,0.45)': pensado para una presentación modal transparente
  // que esta pantalla nunca tuvo (se registra como push normal en App.tsx),
  // así que se veía como un velo negro translúcido sobre toda la pantalla.
  container: { flex: 1, backgroundColor: C.bg },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    paddingBottom: 10,
  },
  sourceLinkText: {
    fontSize: 11,
    color: C.textSecondary,
    textDecorationLine: 'underline',
  },
  headerSection: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.37,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  favBtn: {
    position: 'absolute',
    right: 16,
  },
  favBtnInner: {
    padding: 5,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  titleRow: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dietTitle: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  timeText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  contentSheet: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  vitaminTitle: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  vitaminSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  tabsRowWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 26,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: C.brand50,
  },
  tabPillText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.textSecondary,
  },
  tabPillTextActive: {
    color: C.white,
  },
  htmlContent: {
    paddingHorizontal: 8,
  },
  htmlText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 22,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.orange,
    marginRight: 10,
  },
  ingredientQty: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
    marginLeft: 8,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  });
}
