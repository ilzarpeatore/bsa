import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import DateRangePicker from '@components/DateRangePicker';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { useAppColorMode } from '@helper/useAppColorMode';
import { logger } from '@helper/logger';
import { showToast } from '@helper/toast';
import {
  DateRange,
  defaultListTitle,
  describeRange,
  rangeDays,
  rangePresets,
  sameRange,
  toDateStr,
} from '@helper/shoppingDates';
import { shoppingApi, ShoppingMealType } from '@api/shopping';
import { FONT, RADIUS } from './theme';

// "Nueva lista de la compra" / "Editar lista" (reconstruida 2026-09-26, ítem 26 del roadmap).
// Antes: el selector de fecha y el de rango no hacían nada (el rango siempre fallaba con
// "Selecciona un rango de fechas"), la fecha era siempre hoy y "Solo comidas completas" venía
// activado, así que casi nunca salía ninguna lista. Ahora: atajos + calendario real para un día o
// un rango, raciones, tipos de comida y título automático editable. Siempre se manda
// start_date/end_date (un día = mismo inicio y fin) y por defecto entran TODAS las comidas
// planificadas, no solo las ya hechas.

const MEAL_TYPES: { key: ShoppingMealType; label: string }[] = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch', label: 'Comida' },
  { key: 'dinner', label: 'Cena' },
  { key: 'snacks', label: 'Snacks' },
];

const NO_MEALS_MESSAGE = 'No hay comidas planificadas en esas fechas. Prueba con otro día o con más tipos de comida.';

function initialRange(list: any, today: string): DateRange {
  if (list?.start_date && list?.end_date) return { start: String(list.start_date).slice(0, 10), end: String(list.end_date).slice(0, 10) };
  return { start: today, end: today };
}

export default function AddShoppingListScreen({ navigation, route }: any) {
  const { colors: C } = useAppColorMode();
  const editing = route?.params?.shoppingList;
  const isEdit = !!editing?.id;

  const today = useMemo(() => toDateStr(new Date()), []);
  const presets = useMemo(() => rangePresets(today), [today]);
  const [range, setRange] = useState<DateRange>(() => initialRange(editing, today));
  const [title, setTitle] = useState<string>(() => editing?.title ?? defaultListTitle(initialRange(editing, today)));
  const [titleTouched, setTitleTouched] = useState(isEdit);
  const [servings, setServings] = useState<number>(() => Number(editing?.servings) || 1);
  const [mealTypes, setMealTypes] = useState<ShoppingMealType[]>(MEAL_TYPES.map((m) => m.key));
  const [completeOnly, setCompleteOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // El título sigue al rango mientras el cliente no lo haya tocado.
  useEffect(() => {
    if (!titleTouched) setTitle(defaultListTitle(range));
  }, [range, titleTouched]);

  const toggleMeal = (key: ShoppingMealType) =>
    setMealTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const changeServings = (delta: number) => setServings((s) => Math.min(20, Math.max(1, s + delta)));

  const submit = async () => {
    if (submitting) return;
    if (mealTypes.length === 0) {
      showToast('Falta algo', { description: 'Elige al menos un tipo de comida.', variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await shoppingApi.generateFromDailyPlan({
        ...(isEdit ? { shopping_list_id: editing.id } : {}),
        title: title.trim() || defaultListTitle(range),
        start_date: range.start,
        end_date: range.end,
        servings,
        meal_types: mealTypes,
        is_complete_only: completeOnly,
      });
      const newId = res.data?.data?.id ?? editing?.id;
      if (isEdit || !newId) navigation.goBack();
      else navigation.replace('MigratedShoppingListDetail', { shoppingListId: newId });
    } catch (e: any) {
      logger.error('Error generando la lista de la compra:', e);
      const status = e?.response?.status;
      const msg = status === 422 ? NO_MEALS_MESSAGE : e?.response?.data?.message || 'No se pudo guardar la lista de la compra.';
      showToast('No se pudo crear la lista', { description: msg, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const sectionTitle = (text: string) => (
    <Text weight="bold" size="xs" muted className="uppercase" style={{ letterSpacing: 0.3, marginBottom: 8, marginTop: 20 }}>
      {text}
    </Text>
  );

  const chip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill, backgroundColor: active ? C.accentBlack : C.surface }}
    >
      <Text weight="semibold" size="sm" style={{ color: active ? C.accentBlackForeground : C.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );

  const days = rangeDays(range);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title={isEdit ? 'Editar lista de la compra' : 'Nueva lista de la compra'} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sectionTitle('¿Para qué días?')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {presets.map((p) => chip(p.label, sameRange(range, p.range), () => setRange(p.range), p.id))}
        </ScrollView>
        <DateRangePicker value={range} onChange={setRange} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Icon name="calendar-outline" size={16} color={C.textSecondary} />
          <Text size="sm" muted>
            {describeRange(range)} · {days} {days === 1 ? 'día' : 'días'}
            {days === 1 ? '' : ' (toca dos días para cambiar el rango)'}
          </Text>
        </View>

        {sectionTitle('Título')}
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setTitleTouched(true);
          }}
          placeholder="Título de la lista"
          placeholderTextColor={C.textSecondary}
          maxLength={80}
          accessibilityLabel="Título de la lista"
          style={{ height: 48, paddingHorizontal: 14, borderRadius: RADIUS.sm, backgroundColor: C.surface, color: C.textPrimary, fontFamily: FONT.regular, fontSize: 16 }}
        />

        {sectionTitle('Raciones')}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={() => changeServings(-1)}
            accessibilityRole="button"
            accessibilityLabel="Menos raciones"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="remove" size={20} color={C.textPrimary} />
          </Pressable>
          <Text weight="bold" size="lg" accessibilityLabel={`${servings} raciones`}>{servings}</Text>
          <Pressable
            onPress={() => changeServings(1)}
            accessibilityRole="button"
            accessibilityLabel="Más raciones"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="add" size={20} color={C.textPrimary} />
          </Pressable>
          <Text size="sm" muted className="flex-1">Multiplica las cantidades de cada comida.</Text>
        </View>

        {sectionTitle('Comidas a incluir')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MEAL_TYPES.map((m) => chip(m.label, mealTypes.includes(m.key), () => toggleMeal(m.key), m.key))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <Text weight="semibold">Solo comidas ya hechas</Text>
            <Text size="sm" muted style={{ marginTop: 2 }}>
              {completeOnly
                ? 'Solo entran las comidas que ya has marcado como completadas.'
                : 'Entran todas las comidas planificadas, también las de días futuros.'}
            </Text>
          </View>
          <Switch
            value={completeOnly}
            onValueChange={setCompleteOnly}
            accessibilityLabel="Solo comidas ya hechas"
            trackColor={{ false: C.gray60, true: C.accentBlack }}
          />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: C.bg }}>
        <Pressable
          onPress={submit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? 'Actualizar lista' : 'Crear lista'}
          style={{ height: 52, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentBlack, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={C.accentBlackForeground} />
          ) : (
            <Text weight="bold" style={{ letterSpacing: 0.5, color: C.accentBlackForeground, fontSize: 15 }}>
              {isEdit ? 'ACTUALIZAR LISTA' : 'CREAR LISTA'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
