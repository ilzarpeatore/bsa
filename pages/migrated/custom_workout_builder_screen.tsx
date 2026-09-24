import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { Switch } from '@components/ui/switch';
import { Button, ButtonText } from '@components/ui/button';
import { FONT, RADIUS } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { showToast } from '@helper/toast';
import { hapticLight, hapticSuccess } from '@helper/haptics';
import ExercisePickerModal from '../../components/ExercisePickerModal';
import { ConfirmDialogMem } from '../../components/ConfirmDialog';
import { ExerciseItem } from '../../api/exercises';
import { customWorkoutsApi, CustomWorkoutMetricKey } from '../../api/customWorkouts';

// Creador de entrenamientos personalizados del propio cliente (pedido
// 2026-09-24). Se llega desde Home > Entrenamientos ("Crear entrenamiento
// personalizado", fecha = hoy) o desde Mi programa ("Crear sesión
// personalizada", fecha = día seleccionado en el calendario). Al guardar,
// el backend lo coloca en el calendario personal del cliente ese día (y,
// si se pide, el mismo día de las semanas siguientes); a partir de ahí se
// entrena como cualquier otro día del calendario.

type Intensity = 'rir' | 'rpe';

interface BuilderExercise {
  key: string;
  exerciseId: number;
  title: string;
  image: string | null;
  series: number;
  reps: string;
  carga: string;
  descanso: string;
  intensity: Intensity;
  intensityValue: string;
}

interface BuilderSection {
  key: string;
  title: string;
  exercises: BuilderExercise[];
}

const DEFAULT_SERIES = 3;
const DEFAULT_REPS = '10';
const DEFAULT_REST = '90';
const DEFAULT_RIR = '2';
const MAX_SERIES = 20;
const REPEAT_OPTIONS = [4, 8, 12, 16, 24];
const DEFAULT_REPEAT_WEEKS = 8;
const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAY_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAY_TITLE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function toDateKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (dow - 1));
  return x;
}

function formatLongDate(key: string): string {
  const d = parseDateKey(key);
  return `${WEEKDAY_TITLE[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}-${Date.now()}-${keySeq++}`;

const newSection = (index: number): BuilderSection => ({
  key: nextKey('s'),
  title: index === 0 ? 'Calentamiento' : `Sección ${index + 1}`,
  exercises: [],
});

// Solo dígitos y separador decimal/rango ("8-10", "22.5").
const sanitizeNumber = (v: string, allowRange = false) =>
  v.replace(',', '.').replace(allowRange ? /[^0-9.\-]/g : /[^0-9.]/g, '').slice(0, 7);

interface Props {
  navigation?: any;
  route?: any;
}

export default function CustomWorkoutBuilderScreen({ navigation, route }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  // Solo la semana en curso -- misma regla que Mi programa (el cliente no
  // puede ver ni trabajar semanas futuras); para las siguientes semanas está
  // la opción de repetir.
  const weekDays = useMemo(() => {
    const monday = startOfWeekMonday(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return toDateKey(d);
    });
  }, [today]);
  const initialDate: string = weekDays.includes(route?.params?.date) ? route.params.date : todayKey;

  const [title, setTitle] = useState('Entrenamiento personalizado');
  const [date, setDate] = useState<string>(initialDate);
  const [sections, setSections] = useState<BuilderSection[]>(() => [newSection(0), newSection(1)]);
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(DEFAULT_REPEAT_WEEKS);
  const [pickerSectionKey, setPickerSectionKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [startNow, setStartNow] = useState<{ assignmentId: number; title: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const exerciseCount = sections.reduce((n, s) => n + s.exercises.length, 0);
  const weekdayIdx = (() => {
    const d = parseDateKey(date).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const updateSection = (key: string, updater: (s: BuilderSection) => BuilderSection) =>
    setSections((prev) => prev.map((s) => (s.key === key ? updater(s) : s)));

  const updateExercise = (sectionKey: string, exKey: string, patch: Partial<BuilderExercise>) =>
    updateSection(sectionKey, (s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.key === exKey ? { ...e, ...patch } : e)),
    }));

  const moveExercise = (sectionKey: string, idx: number, dir: -1 | 1) =>
    updateSection(sectionKey, (s) => {
      const target = idx + dir;
      if (target < 0 || target >= s.exercises.length) return s;
      const list = [...s.exercises];
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...s, exercises: list };
    });

  const removeExercise = (sectionKey: string, exKey: string) =>
    updateSection(sectionKey, (s) => ({ ...s, exercises: s.exercises.filter((e) => e.key !== exKey) }));

  const addSection = () => {
    hapticLight();
    setSections((prev) => [...prev, newSection(prev.length)]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const removeSection = (key: string) => setSections((prev) => prev.filter((s) => s.key !== key));

  const onPickerConfirm = (items: ExerciseItem[]) => {
    const sectionKey = pickerSectionKey;
    setPickerSectionKey(null);
    if (!sectionKey) return;
    updateSection(sectionKey, (s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        ...items.map((item) => ({
          key: nextKey('e'),
          exerciseId: item.id,
          title: item.title,
          image: item.exercise_image || null,
          series: DEFAULT_SERIES,
          reps: DEFAULT_REPS,
          carga: '',
          descanso: DEFAULT_REST,
          intensity: 'rir' as Intensity,
          intensityValue: DEFAULT_RIR,
        })),
      ],
    }));
  };

  const hasContent = exerciseCount > 0;
  const onBack = () => {
    if (hasContent && !saving) setDiscardVisible(true);
    else navigation?.goBack();
  };

  const save = async () => {
    if (!title.trim()) {
      showToast('Ponle un nombre', { description: 'El entrenamiento necesita un nombre.', variant: 'warning' });
      return;
    }
    if (exerciseCount === 0) {
      showToast('Sin ejercicios', { description: 'Añade al menos un ejercicio a alguna sección.', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const res = await customWorkoutsApi.create({
        title: title.trim(),
        date,
        repeat_weeks: repeat ? repeatWeeks : 1,
        blocks: sections
          .filter((s) => s.exercises.length > 0)
          .map((s, i) => ({
            title: s.title.trim() || `Sección ${i + 1}`,
            exercises: s.exercises.map((e) => {
              const prescribed: Partial<Record<'series' | CustomWorkoutMetricKey, string>> = {
                series: String(e.series),
              };
              if (e.reps) prescribed.reps = e.reps;
              if (e.carga) prescribed.carga = e.carga;
              if (e.descanso) prescribed.descanso = e.descanso;
              if (e.intensityValue) prescribed[e.intensity] = e.intensityValue;
              return {
                exercise_id: e.exerciseId,
                prescribed,
                enabled_metrics: ['reps', 'carga', 'descanso', e.intensity] as CustomWorkoutMetricKey[],
              };
            }),
          })),
      });
      hapticSuccess();
      const first = res.data?.data?.assignments?.[0];
      if (first && first.date === todayKey) {
        setStartNow({ assignmentId: first.assignment_id, title: title.trim() });
      } else {
        showToast('Entrenamiento creado', {
          description: res.data?.message ?? 'Ya lo tienes en tu calendario.',
          variant: 'success',
        });
        navigation?.goBack();
      }
    } catch (e: any) {
      const message = e?.response?.data?.message;
      showToast('No se pudo guardar', {
        description: typeof message === 'string' ? message : 'Inténtalo de nuevo en unos minutos.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderMetricInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { unit?: string; allowRange?: boolean; placeholder?: string } = {}
  ) => (
    <VStack style={styles.metricCol}>
      <Text style={styles.metricLabel}>{label}</Text>
      <HStack style={styles.metricInputWrap}>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(sanitizeNumber(v, opts.allowRange))}
          keyboardType={opts.allowRange ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder={opts.placeholder ?? '-'}
          placeholderTextColor={C.textTertiary}
          style={styles.metricInput}
          maxLength={7}
          selectTextOnFocus
        />
        {!!opts.unit && <Text style={styles.metricUnit}>{opts.unit}</Text>}
      </HStack>
    </VStack>
  );

  const renderExercise = (section: BuilderSection, ex: BuilderExercise, idx: number) => (
    <Box key={ex.key} style={styles.exerciseCard}>
      <HStack className="items-center">
        {ex.image ? (
          <Image source={{ uri: ex.image }} contentFit="cover" style={styles.exerciseImage} />
        ) : (
          <Box style={[styles.exerciseImage, { backgroundColor: C.bg }]} />
        )}
        <Text style={styles.exerciseTitle} numberOfLines={2}>
          {ex.title}
        </Text>
        <HStack style={{ gap: 2 }}>
          <Pressable
            onPress={() => moveExercise(section.key, idx, -1)}
            disabled={idx === 0}
            hitSlop={6}
            style={styles.iconBtn}
            accessibilityLabel="Subir ejercicio"
          >
            <Icon name="chevron-up" size={18} color={idx === 0 ? C.border : C.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => moveExercise(section.key, idx, 1)}
            disabled={idx === section.exercises.length - 1}
            hitSlop={6}
            style={styles.iconBtn}
            accessibilityLabel="Bajar ejercicio"
          >
            <Icon
              name="chevron-down"
              size={18}
              color={idx === section.exercises.length - 1 ? C.border : C.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => removeExercise(section.key, ex.key)}
            hitSlop={6}
            style={styles.iconBtn}
            accessibilityLabel="Quitar ejercicio"
          >
            <Icon name="trash-outline" size={18} color={C.destructive} />
          </Pressable>
        </HStack>
      </HStack>

      {/* Series: stepper (define el nº de filas de la sesión). */}
      <HStack className="items-center justify-between" style={{ marginTop: 12 }}>
        <Text style={styles.seriesLabel}>Series</Text>
        <HStack className="items-center" style={{ gap: 12 }}>
          <Pressable
            style={styles.stepBtn}
            onPress={() => updateExercise(section.key, ex.key, { series: Math.max(1, ex.series - 1) })}
            accessibilityLabel="Menos series"
          >
            <Icon name="remove" size={18} color={C.textPrimary} />
          </Pressable>
          <Text style={styles.seriesValue}>{ex.series}</Text>
          <Pressable
            style={styles.stepBtn}
            onPress={() => updateExercise(section.key, ex.key, { series: Math.min(MAX_SERIES, ex.series + 1) })}
            accessibilityLabel="Más series"
          >
            <Icon name="add" size={18} color={C.textPrimary} />
          </Pressable>
        </HStack>
      </HStack>

      <HStack style={{ gap: 8, marginTop: 10 }}>
        {renderMetricInput('Reps', ex.reps, (v) => updateExercise(section.key, ex.key, { reps: v }), {
          allowRange: true,
          placeholder: '8-10',
        })}
        {renderMetricInput('Carga', ex.carga, (v) => updateExercise(section.key, ex.key, { carga: v }), { unit: 'kg' })}
        {renderMetricInput('Descanso', ex.descanso, (v) => updateExercise(section.key, ex.key, { descanso: v }), {
          unit: 's',
        })}
        <VStack style={styles.metricCol}>
          {/* RIR o RPE: el mismo "slot" intercambiable (igual que en la sesión). */}
          <Pressable
            onPress={() =>
              updateExercise(section.key, ex.key, {
                intensity: ex.intensity === 'rir' ? 'rpe' : 'rir',
                intensityValue: ex.intensity === 'rir' ? '8' : DEFAULT_RIR,
              })
            }
            hitSlop={6}
          >
            <HStack className="items-center" style={{ gap: 2 }}>
              <Text style={[styles.metricLabel, { color: C.orange60 }]}>{ex.intensity.toUpperCase()}</Text>
              <Icon name="swap-horizontal" size={11} color={C.orange60} />
            </HStack>
          </Pressable>
          <HStack style={styles.metricInputWrap}>
            <TextInput
              value={ex.intensityValue}
              onChangeText={(v) => updateExercise(section.key, ex.key, { intensityValue: sanitizeNumber(v) })}
              keyboardType="decimal-pad"
              placeholder="-"
              placeholderTextColor={C.textTertiary}
              style={styles.metricInput}
              maxLength={4}
              selectTextOnFocus
            />
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <HStack style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver">
          <Icon name="chevron-back" size={26} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Nuevo entrenamiento</Text>
        <Box style={{ width: 26 }} />
      </HStack>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Pierna en casa"
            placeholderTextColor={C.textTertiary}
            style={styles.titleInput}
            maxLength={120}
            selectTextOnFocus
          />

          <Text style={[styles.label, { marginTop: 18 }]}>Día</Text>
          <HStack style={styles.dayRow}>
            {weekDays.map((key, i) => {
              const active = key === date;
              const d = parseDateKey(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => setDate(key)}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.dayPillLetter, active && styles.dayPillTextActive]}>{WEEKDAY_SHORT[i]}</Text>
                  <Text style={[styles.dayPillNumber, active && styles.dayPillTextActive]}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </HStack>
          <Text style={styles.dateHint}>{formatLongDate(date)}</Text>

          {/* Repetición semanal */}
          <Box style={styles.repeatCard}>
            <HStack className="items-center justify-between">
              <VStack style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.repeatTitle}>Repetir cada semana</Text>
                <Text style={styles.repeatSub}>
                  {repeat
                    ? `Todos los ${WEEKDAY_LONG[weekdayIdx]} durante ${repeatWeeks} semanas`
                    : `Actívalo para que se repita todos los ${WEEKDAY_LONG[weekdayIdx]}`}
                </Text>
              </VStack>
              <Switch value={repeat} onValueChange={setRepeat} trackColor={{ true: C.orange, false: C.border }} />
            </HStack>
            {repeat && (
              <HStack style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {REPEAT_OPTIONS.map((w) => (
                  <Pressable
                    key={w}
                    onPress={() => setRepeatWeeks(w)}
                    style={[styles.weeksChip, repeatWeeks === w && styles.weeksChipActive]}
                  >
                    <Text style={[styles.weeksChipText, repeatWeeks === w && styles.weeksChipTextActive]}>
                      {w} semanas
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            )}
          </Box>

          {/* Secciones */}
          {sections.map((section, sIdx) => (
            <Box key={section.key} style={styles.sectionCard}>
              <HStack className="items-center" style={{ gap: 8 }}>
                <Box style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{sIdx + 1}</Text>
                </Box>
                <TextInput
                  value={section.title}
                  onChangeText={(v) => updateSection(section.key, (s) => ({ ...s, title: v }))}
                  placeholder={`Sección ${sIdx + 1}`}
                  placeholderTextColor={C.textTertiary}
                  style={styles.sectionTitleInput}
                  maxLength={120}
                />
                {sections.length > 1 && (
                  <Pressable
                    onPress={() => removeSection(section.key)}
                    hitSlop={8}
                    accessibilityLabel="Eliminar sección"
                  >
                    <Icon name="close-circle-outline" size={22} color={C.textSecondary} />
                  </Pressable>
                )}
              </HStack>

              {section.exercises.map((ex, idx) => renderExercise(section, ex, idx))}

              <Pressable style={styles.addExerciseBtn} onPress={() => setPickerSectionKey(section.key)}>
                <Icon name="add-circle-outline" size={18} color={C.orange60} />
                <Text style={styles.addExerciseText}>Añadir ejercicio</Text>
              </Pressable>
            </Box>
          ))}

          <Pressable style={styles.addSectionBtn} onPress={addSection}>
            <Icon name="layers-outline" size={18} color={C.textPrimary} />
            <Text style={styles.addSectionText}>Añadir sección</Text>
          </Pressable>
        </ScrollView>

        <Box style={styles.footer}>
          <Button
            radius="pill"
            style={[styles.saveBtn, (saving || exerciseCount === 0) && { opacity: 0.6 }] as any}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <Spinner size="small" color={C.accentBlackForeground} />
            ) : (
              <ButtonText style={styles.saveText}>
                Guardar entrenamiento{exerciseCount > 0 ? ` · ${exerciseCount} ejercicio${exerciseCount !== 1 ? 's' : ''}` : ''}
              </ButtonText>
            )}
          </Button>
        </Box>
      </KeyboardAvoidingView>

      {pickerSectionKey != null && (
        <ExercisePickerModal
          visible
          title={sections.find((s) => s.key === pickerSectionKey)?.title || 'Añadir ejercicios'}
          onClose={() => setPickerSectionKey(null)}
          onConfirm={onPickerConfirm}
        />
      )}

      <ConfirmDialogMem
        visible={discardVisible}
        icon="trash-outline"
        title="¿Descartar entrenamiento?"
        message="Perderás las secciones y ejercicios que has añadido."
        confirmText="Descartar"
        cancelText="Seguir editando"
        destructive
        onCancel={() => setDiscardVisible(false)}
        onConfirm={() => {
          setDiscardVisible(false);
          navigation?.goBack();
        }}
      />

      <ConfirmDialogMem
        visible={startNow != null}
        icon="barbell-outline"
        title="Entrenamiento creado"
        message="Lo tienes en tu calendario de hoy. ¿Quieres empezarlo ahora?"
        confirmText="Empezar ahora"
        cancelText="Más tarde"
        onCancel={() => {
          setStartNow(null);
          navigation?.goBack();
        }}
        onConfirm={() => {
          const s = startNow;
          setStartNow(null);
          if (!s) return;
          const params = { programDayAssignmentId: s.assignmentId, mTitle: s.title };
          if (navigation?.replace) navigation.replace('MigratedWorkoutPreview', params);
          else navigation?.navigate('MigratedWorkoutPreview', params);
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerTitle: { fontSize: 18, fontFamily: FONT.bold, color: C.textPrimary, lineHeight: 24 },
    label: { fontSize: 13, fontFamily: FONT.semiBold, color: C.textSecondary, marginBottom: 8, lineHeight: 18 },
    titleInput: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: FONT.semiBold,
      color: C.textPrimary,
    },
    dayRow: { justifyContent: 'space-between' },
    dayPill: {
      width: 42,
      paddingVertical: 8,
      borderRadius: RADIUS.sm,
      backgroundColor: C.surface,
      alignItems: 'center',
    },
    dayPillActive: { backgroundColor: C.accentBlack },
    dayPillLetter: { fontSize: 11, fontFamily: FONT.medium, color: C.textSecondary, lineHeight: 14 },
    dayPillNumber: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary, lineHeight: 20, marginTop: 2 },
    dayPillTextActive: { color: C.accentBlackForeground },
    dateHint: { fontSize: 12.5, fontFamily: FONT.medium, color: C.textSecondary, marginTop: 8, lineHeight: 16 },
    repeatCard: { backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
    repeatTitle: { fontSize: 15, fontFamily: FONT.semiBold, color: C.textPrimary, lineHeight: 20 },
    repeatSub: { fontSize: 12.5, fontFamily: FONT.regular, color: C.textSecondary, marginTop: 2, lineHeight: 16 },
    weeksChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
      backgroundColor: C.bg,
    },
    weeksChipActive: { backgroundColor: C.accentBlack },
    weeksChipText: { fontSize: 12.5, fontFamily: FONT.semiBold, color: C.textSecondary, lineHeight: 16 },
    weeksChipTextActive: { color: C.accentBlackForeground },
    sectionCard: { backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
    sectionBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: C.orange10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionBadgeText: { fontSize: 13, fontFamily: FONT.bold, color: C.orange60, lineHeight: 16 },
    sectionTitleInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: FONT.bold,
      color: C.textPrimary,
      paddingVertical: 4,
    },
    exerciseCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: RADIUS.sm,
      backgroundColor: C.bg,
    },
    exerciseImage: { width: 44, height: 44, borderRadius: RADIUS.xs, marginRight: 10 },
    exerciseTitle: { flex: 1, fontSize: 14, fontFamily: FONT.semiBold, color: C.textPrimary, lineHeight: 18 },
    iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    seriesLabel: { fontSize: 13, fontFamily: FONT.semiBold, color: C.textPrimary, lineHeight: 18 },
    seriesValue: { fontSize: 16, fontFamily: FONT.bold, color: C.textPrimary, minWidth: 22, textAlign: 'center', lineHeight: 20 },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricCol: { flex: 1 },
    metricLabel: { fontSize: 11, fontFamily: FONT.semiBold, color: C.textSecondary, marginBottom: 4, lineHeight: 14 },
    metricInputWrap: {
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: RADIUS.xs,
      paddingHorizontal: 8,
      height: 38,
    },
    metricInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONT.semiBold,
      color: C.textPrimary,
      paddingVertical: 0,
      minWidth: 0,
    },
    metricUnit: { fontSize: 11, fontFamily: FONT.medium, color: C.textSecondary, marginLeft: 2 },
    addExerciseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 11,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: C.orange,
    },
    addExerciseText: { fontSize: 14, fontFamily: FONT.semiBold, color: C.orange60, lineHeight: 18 },
    addSectionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: RADIUS.md,
      backgroundColor: C.surface,
    },
    addSectionText: { fontSize: 14, fontFamily: FONT.semiBold, color: C.textPrimary, lineHeight: 18 },
    footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: C.bg },
    saveBtn: { backgroundColor: C.accentBlack, height: 52 },
    saveText: { color: C.accentBlackForeground, fontFamily: FONT.bold, fontSize: 15 },
  });
}
