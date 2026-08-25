import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField } from '@components/ui/input';
import { Card } from '@components/ui/card';
import { Stepper } from '@components/ui/stepper';
import { Switch } from '@components/ui/switch';
import { Checkbox, CheckboxIndicator, CheckboxLabel } from '@components/ui/checkbox';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import logger from '@helper/logger';
import { dietApi } from '@api/diet';
import { shoppingApi, ShoppingMealType } from '@api/shopping';

const AVAILABLE_MEAL_TYPES: { key: ShoppingMealType; label: string }[] = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch', label: 'Comida' },
  { key: 'dinner', label: 'Cena' },
  { key: 'snacks', label: 'Snacks' },
];

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const renderCheckboxRow = (label: string, checked: boolean, onPress: () => void, key?: string) => (
  <Checkbox
    key={key}
    value={key ?? label}
    isChecked={checked}
    onChange={() => onPress()}
    className="py-2">
    <CheckboxIndicator>
      {checked && <Icon name="checkmark" size={14} className="text-primary-foreground" />}
    </CheckboxIndicator>
    <CheckboxLabel className="flex-1">{label}</CheckboxLabel>
  </Checkbox>
);

export default function AddShoppingListScreen({ navigation, route }: any) {
  const { colors: C } = useAppColorMode();
  const shoppingList = route?.params?.shoppingList;
  const isDefaultSpecificDate = route?.params?.isDefaultSpecificDate ?? true;

  const isEditMode = !!shoppingList;

  const [title, setTitle] = useState('');
  const [isSpecificDate, setIsSpecificDate] = useState(isDefaultSpecificDate);
  const [selectedDate, setSelectedDate] = useState(() =>
    shoppingList?.daily_plan_id && shoppingList?.start_date
      ? new Date(shoppingList.start_date)
      : new Date(),
  );
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(() =>
    !shoppingList?.daily_plan_id && shoppingList?.start_date && shoppingList?.end_date
      ? new Date(shoppingList.start_date)
      : null,
  );
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(() =>
    !shoppingList?.daily_plan_id && shoppingList?.start_date && shoppingList?.end_date
      ? new Date(shoppingList.end_date)
      : null,
  );
  const [isCompleteOnly, setIsCompleteOnly] = useState(true);
  const [selectedMealTypes, setSelectedMealTypes] = useState<ShoppingMealType[]>([]);
  const [servings, setServings] = useState(() => shoppingList?.servings ?? 1);
  const dailyPlanIdRef = useRef<number | null>(null);
  const [isFetchingPlan, setIsFetchingPlan] = useState(false);
  const loadingRef = useRef(false);

  // Sin closures reactivos propios (recibe `date` como parametro), estable
  // para siempre -- useCallback([]) evita que prefillForEdit tenga que
  // recrearse por esto.
  const fetchDailyPlanId = useCallback(async (date: Date) => {
    setIsFetchingPlan(true);
    dailyPlanIdRef.current = null;
    try {
      const res = await dietApi.getDailyPlan(formatDate(date));
      dailyPlanIdRef.current = res.data?.data?.id ?? null;
    } catch (e) {
      logger.error('Error fetching daily plan:', e);
    } finally {
      setIsFetchingPlan(false);
    }
  }, []);

  const prefillForEdit = useCallback(() => {
    if (!shoppingList) {
      fetchDailyPlanId(selectedDate);
      return;
    }
    setTitle(shoppingList.title ?? '');
    if (shoppingList.daily_plan_id) {
      setIsSpecificDate(true);
      dailyPlanIdRef.current = shoppingList.daily_plan_id;
      if (shoppingList.start_date) {
        setSelectedDate(new Date(shoppingList.start_date));
      }
    } else {
      setIsSpecificDate(false);
      setServings(shoppingList.servings ?? 1);
      if (shoppingList.start_date && shoppingList.end_date) {
        setDateRangeStart(new Date(shoppingList.start_date));
        setDateRangeEnd(new Date(shoppingList.end_date));
      }
    }
  }, [shoppingList, selectedDate, fetchDailyPlanId]);

  useEffect(() => {
    setSelectedMealTypes(AVAILABLE_MEAL_TYPES.map((t) => t.key));
    prefillForEdit();
  }, [prefillForEdit]);

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Introduce un título');
      return;
    }
    if (selectedMealTypes.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un tipo de comida');
      return;
    }

    const req: any = {
      title: title.trim(),
      is_complete_only: isCompleteOnly,
      meal_types: selectedMealTypes,
    };

    if (isEditMode) {
      req.shopping_list_id = shoppingList.id;
    }

    if (isSpecificDate) {
      if (dailyPlanIdRef.current === null && !isFetchingPlan) {
        Alert.alert('Error', 'No se encontró un plan diario para esta fecha');
        return;
      }
      if (isFetchingPlan) {
        Alert.alert('Error', 'Espera a que se cargue el plan diario');
        return;
      }
      req.daily_plan_id = dailyPlanIdRef.current;
    } else {
      if (!dateRangeStart || !dateRangeEnd) {
        Alert.alert('Error', 'Selecciona un rango de fechas');
        return;
      }
      req.start_date = formatDate(dateRangeStart);
      req.end_date = formatDate(dateRangeEnd);
      req.servings = servings;
    }

    loadingRef.current = true;
    try {
      await shoppingApi.generateFromDailyPlan(req);
      loadingRef.current = false;
      navigation.goBack(true);
    } catch (e: any) {
      loadingRef.current = false;
      const msg = e?.response?.data?.message ?? 'No se pudo guardar la lista de la compra';
      Alert.alert('Error', msg);
    }
  };

  const toggleMealType = (key: ShoppingMealType) => {
    setSelectedMealTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScreenHeader
        title={isEditMode ? 'Editar lista de la compra' : 'Añadir lista de la compra'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        {/* Date / Range Selection */}
        <Card variant="outline">
          <HStack className="items-center justify-between">
            <Text weight="semibold">Fecha concreta</Text>
            <Switch
              value={isSpecificDate}
              onValueChange={(value) => {
                setIsSpecificDate(value);
                if (value && !isEditMode) fetchDailyPlanId(selectedDate);
              }}
              trackColor={{ false: C.gray60, true: C.brand5 }}
              thumbColor={C.white}
            />
          </HStack>

          {isSpecificDate ? (
            <HStack className="items-center justify-between" style={{ marginTop: 12 }}>
              <Text weight="semibold">Fecha</Text>
              <Pressable className="flex-row items-center gap-2">
                <Text size="sm" muted>
                  {formatDate(selectedDate)}
                </Text>
                <Icon name="calendar-outline" size={18} className="text-muted-foreground" />
              </Pressable>
            </HStack>
          ) : (
            <HStack className="items-center justify-between" style={{ marginTop: 12 }}>
              <Text weight="semibold">Rango de fechas</Text>
              <Pressable className="flex-row items-center gap-2">
                <Text size="sm" muted>
                  {dateRangeStart && dateRangeEnd
                    ? `${formatDate(dateRangeStart)} - ${formatDate(dateRangeEnd)}`
                    : 'Selecciona un rango'}
                </Text>
                <Icon name="calendar-outline" size={18} className="text-muted-foreground" />
              </Pressable>
            </HStack>
          )}

          {isFetchingPlan && isSpecificDate && (
            <ActivityIndicator size="small" color={C.orange} style={{ marginTop: 8 }} />
          )}
        </Card>

        {/* Title */}
        <Card variant="outline">
          <Text weight="semibold">Título</Text>
          <Input style={{ marginTop: 8 }}>
            <InputField placeholder="Introduce un título" value={title} onChangeText={setTitle} />
          </Input>
        </Card>

        {/* Servings (only when not specific date) */}
        {!isSpecificDate && (
          <Card variant="outline">
            <HStack className="items-center justify-between">
              <Text weight="semibold" className="flex-1">
                Raciones
              </Text>
              <Stepper value={servings} onChange={setServings} min={1} />
            </HStack>
          </Card>
        )}

        {/* Meal Types */}
        <Card variant="outline">
          <Text weight="semibold">Tipos de comida</Text>
          {AVAILABLE_MEAL_TYPES.map((type) =>
            renderCheckboxRow(
              type.label,
              selectedMealTypes.includes(type.key),
              () => toggleMealType(type.key),
              type.key,
            ),
          )}
        </Card>

        {/* Is Complete Only */}
        <Card variant="outline">
          {renderCheckboxRow('Solo comidas completas', isCompleteOnly, () =>
            setIsCompleteOnly(!isCompleteOnly),
          )}
        </Card>
      </ScrollView>

      {/* Bottom button */}
      <Box className="p-4">
        <Button size="lg" onPress={submit}>
          <ButtonText>{isEditMode ? 'Actualizar lista' : 'Generar lista'}</ButtonText>
        </Button>
      </Box>
    </SafeAreaView>
  );
}
