import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
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
import {
  customWorkoutsApi,
  CustomWorkoutDetail,
  CustomWorkoutMetricKey,
  newCustomWorkoutRequestId,
} from '../../api/customWorkouts';

// Creador de entrenamientos personalizados del propio cliente (pedido
// 2026-09-24). Se llega desde Home > Entrenamientos ("Crear entrenamiento
// personalizado", fecha = hoy) o desde Mi programa ("Crear sesión
// personalizada", fecha = día seleccionado en el calendario). Al guardar,
// el backend lo coloca en el calendario personal del cliente ese día (y,
// si se pide, el mismo día de las semanas siguientes); a partir de ahí se
// entrena como cualquier otro día del calendario.
//
// Modo edición (2026-09-24): con route.params.editAssignmentId se carga el
// entrenamiento ya creado (GET my-custom-workout-detail), se prerrellena y
// al guardar se llama a my-custom-workouts-update en vez de crear. La fecha
// no se puede cambiar (se muestra como texto, sin selector de día ni
// repetición semanal). Si es de una serie semanal, antes de guardar se
// pregunta si aplicar a "solo este día" o "este y los siguientes" (salvo
// que ya venga route.params.editScope).

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
  // Solo en modo edición (2026-09-24): datos que este creador no muestra
  // pero que el entrenamiento guardado podía traer -- se reenvían tal cual
  // para no perderlos al editar.
  notes?: string | null;
  tiempo?: string;
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
// Mismos topes que valida el backend (ClientCustomWorkoutController::store).
const MAX_SECTIONS = 20;
const MAX_EXERCISES_PER_SECTION = 40;
const MAX_EXERCISES = 60;
// 52 = "1 año" (2026-09-24), el máximo que acepta el backend.
const REPEAT_OPTIONS = [4, 8, 12, 16, 24, 52];
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
  // En modo edición la fecha viene del servidor: si no es YYYY-MM-DD válida,
  // mejor no mostrar nada que "undefined, NaN de undefined".
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const d = parseDateKey(key);
  if (Number.isNaN(d.getTime())) return '';
  return `${WEEKDAY_TITLE[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}-${Date.now()}-${keySeq++}`;

const newSection = (index: number): BuilderSection => ({
  key: nextKey('s'),
  title: index === 0 ? 'Calentamiento' : `Sección ${index + 1}`,
  exercises: [],
});

// Mientras se escribe: solo dígitos y, como mucho, UN separador decimal
// ("22.5") o, en reps, UN guion de rango ("8-10") -- antes se aceptaba
// "1.2.3" o "8--10", que luego no se podían leer como número.
const sanitizeNumber = (v: string, allowRange = false) => {
  if (allowRange) {
    const digitsAndDash = v.replace(/[^0-9-]/g, '').replace(/^-+/, '');
    const [first, ...rest] = digitsAndDash.split('-');
    return (rest.length ? `${first}-${rest.join('')}` : first).slice(0, 7);
  }
  const digitsAndDot = v.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [int, ...dec] = digitsAndDot.split('.');
  return (dec.length ? `${int}.${dec.join('')}` : int).slice(0, 7);
};

// Al guardar: valor final limpio (sin "8-", "." suelto, fuera de rango...).
// El backend vuelve a normalizar igual, esto evita mandar basura.
function cleanMetricValue(key: 'reps' | 'carga' | 'descanso' | 'rir' | 'rpe', raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (key === 'reps') {
    const m = v.match(/^(\d+)(?:-(\d+))?/);
    if (!m) return undefined;
    const a = Math.max(1, parseInt(m[1], 10));
    const b = m[2] ? Math.max(1, parseInt(m[2], 10)) : null;
    return b == null || a === b ? String(a) : `${Math.min(a, b)}-${Math.max(a, b)}`;
  }
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return undefined;
  const [min, max] = key === 'carga' ? [0, 1000] : key === 'descanso' ? [0, 3600] : key === 'rir' ? [0, 10] : [1, 10];
  const clamped = Math.min(max, Math.max(min, n));
  return String(key === 'descanso' ? Math.round(clamped) : Math.round(clamped * 100) / 100);
}

/**
 * Detalle del servidor -> secciones del creador (modo edición, 2026-09-24).
 * Todo defensivo: cualquier campo puede faltar o venir con otro tipo.
 * `prescribed` son strings; rir vs rpe se decide por cuál de las dos claves
 * trae valor (o, sin valor, por enabled_metrics).
 */
function detailToSections(detail: CustomWorkoutDetail): BuilderSection[] {
  const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
  const blocks = Array.isArray(detail?.blocks) ? detail.blocks.slice(0, MAX_SECTIONS) : [];
  let total = 0;
  return blocks.map((b, i) => {
    const rawExercises = Array.isArray(b?.exercises) ? b.exercises.slice(0, MAX_EXERCISES_PER_SECTION) : [];
    const exercises: BuilderExercise[] = [];
    rawExercises.forEach((ex) => {
      const exerciseId = Number(ex?.exercise_id);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0 || total >= MAX_EXERCISES) return;
      total += 1;
      const p: Record<string, unknown> = ex?.prescribed && typeof ex.prescribed === 'object' ? ex.prescribed : {};
      const metrics = Array.isArray(ex?.enabled_metrics) ? ex.enabled_metrics : [];
      const rir = str(p.rir).trim();
      const rpe = str(p.rpe).trim();
      const intensity: Intensity = rpe && !rir ? 'rpe' : !rir && metrics.includes('rpe') && !metrics.includes('rir') ? 'rpe' : 'rir';
      const seriesNum = parseInt(str(p.series), 10);
      const tiempo = str(p.tiempo).trim();
      exercises.push({
        key: nextKey('e'),
        exerciseId,
        title: typeof ex?.title === 'string' && ex.title.trim() ? ex.title : 'Ejercicio',
        image: typeof ex?.image === 'string' && ex.image ? ex.image : null,
        series: Number.isFinite(seriesNum) ? Math.min(MAX_SERIES, Math.max(1, seriesNum)) : DEFAULT_SERIES,
        reps: sanitizeNumber(str(p.reps), true),
        carga: sanitizeNumber(str(p.carga)),
        descanso: sanitizeNumber(str(p.descanso)),
        intensity,
        intensityValue: sanitizeNumber(intensity === 'rpe' ? rpe : rir),
        notes: typeof ex?.notes === 'string' && ex.notes.trim() ? ex.notes : null,
        tiempo: tiempo && metrics.includes('tiempo') ? tiempo : undefined,
      });
    });
    return {
      key: nextKey('s'),
      title: typeof b?.title === 'string' && b.title.trim() ? b.title : `Sección ${i + 1}`,
      exercises,
    };
  });
}

// Huella de lo editable, para saber en modo edición si hay cambios sin
// guardar (el aviso de descartar no debe saltar si solo se ha mirado).
function sectionsSnapshot(title: string, sections: BuilderSection[]): string {
  return JSON.stringify([
    title,
    sections.map((s) => [
      s.title,
      s.exercises.map((e) => [e.exerciseId, e.series, e.reps, e.carga, e.descanso, e.intensity, e.intensityValue]),
    ]),
  ]);
}

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

  // Modo edición (2026-09-24). El id puede llegar como string según desde
  // dónde se navegue: solo vale un entero positivo.
  const editAssignmentId: number | null = (() => {
    const n = Number(route?.params?.editAssignmentId);
    return Number.isInteger(n) && n > 0 ? n : null;
  })();
  const isEdit = editAssignmentId != null;
  const editScopeParam: 'single' | 'following' | null =
    route?.params?.editScope === 'single' || route?.params?.editScope === 'following' ? route.params.editScope : null;

  const [title, setTitle] = useState('Entrenamiento personalizado');
  const [date, setDate] = useState<string>(initialDate);
  const [sections, setSections] = useState<BuilderSection[]>(() => (isEdit ? [] : [newSection(0), newSection(1)]));
  const [editLoading, setEditLoading] = useState(isEdit);
  const [editError, setEditError] = useState<string | null>(null);
  const [editMeta, setEditMeta] = useState<{ isRepeating: boolean; isCompleted: boolean } | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [editReloadSeq, setEditReloadSeq] = useState(0);
  // Alert de "solo este día / este y los siguientes" abierto: evita que un
  // doble toque en Guardar abra dos.
  const askingScopeRef = useRef(false);
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(DEFAULT_REPEAT_WEEKS);
  const [pickerSectionKey, setPickerSectionKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [startNow, setStartNow] = useState<{ assignmentId: number; title: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Doble toque en Guardar: `saving` (estado) no se refleja hasta el
  // siguiente render, así que dos toques seguidos podían lanzar dos POST.
  const savingRef = useRef(false);
  // Un id por pantalla de creación: si el POST se repite (timeout, doble
  // envío), el backend devuelve lo ya creado en vez de duplicarlo.
  const requestIdRef = useRef(newCustomWorkoutRequestId());
  // Salir con cambios sin guardar (botón atrás, gesto de swipe, botón físico
  // de Android): pregunta antes de descartar. `saved` desactiva la
  // protección una vez guardado; `leaveAction` ejecuta la navegación
  // pendiente DESPUÉS del render que ya ha quitado la protección.
  const [saved, setSaved] = useState(false);
  const [leaveAction, setLeaveAction] = useState<null | (() => void)>(null);
  const pendingNavActionRef = useRef<any>(null);

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

  const removeSection = (key: string) => {
    const section = sections.find((s) => s.key === key);
    const doRemove = () => setSections((prev) => prev.filter((s) => s.key !== key));
    // Un toque accidental en la "x" no debe llevarse por delante los
    // ejercicios ya configurados: solo se pregunta si la sección tiene alguno.
    if (!section || section.exercises.length === 0) {
      doRemove();
      return;
    }
    Alert.alert(
      'Eliminar sección',
      `"${section.title || 'Esta sección'}" tiene ${section.exercises.length} ejercicio${section.exercises.length !== 1 ? 's' : ''}. ¿Eliminarla?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doRemove },
      ]
    );
  };

  const onPickerConfirm = (picked: ExerciseItem[]) => {
    const sectionKey = pickerSectionKey;
    setPickerSectionKey(null);
    if (!sectionKey) return;
    const section = sections.find((s) => s.key === sectionKey);
    if (!section) return;
    // Topes del backend: por sección y en total.
    const room = Math.max(
      0,
      Math.min(MAX_EXERCISES_PER_SECTION - section.exercises.length, MAX_EXERCISES - exerciseCount)
    );
    const items = picked.slice(0, room);
    if (items.length < picked.length) {
      showToast('Demasiados ejercicios', {
        description: `Máximo ${MAX_EXERCISES_PER_SECTION} por sección y ${MAX_EXERCISES} en total. Se han añadido ${items.length}.`,
        variant: 'warning',
      });
    }
    if (items.length === 0) return;
    updateSection(sectionKey, (s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        ...items.map((item) => ({
          key: nextKey('e'),
          exerciseId: item.id,
          title: item.title || 'Ejercicio',
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
  const currentSnapshot = useMemo(() => (isEdit ? sectionsSnapshot(title, sections) : ''), [isEdit, title, sections]);
  // En creación basta con tener algún ejercicio; en edición, con haber
  // cambiado algo respecto a lo cargado.
  const hasUnsavedChanges = isEdit ? initialSnapshot != null && currentSnapshot !== initialSnapshot : hasContent;

  // Carga del entrenamiento a editar. Nunca rompe: cualquier fallo o
  // respuesta malformada acaba en editError (mensaje + volver/reintentar).
  useEffect(() => {
    if (editAssignmentId == null) return;
    let cancelled = false;
    // editLoading/editError ya parten de true/null (estado inicial) y el
    // botón Reintentar los reinicia antes de subir editReloadSeq.
    customWorkoutsApi
      .getDetail(editAssignmentId)
      .then((res) => {
        if (cancelled) return;
        const detail = res?.data?.data;
        if (!detail || typeof detail !== 'object' || !Array.isArray(detail.blocks)) {
          setEditError('No se pudo leer este entrenamiento.');
          return;
        }
        const loadedTitle = typeof detail.title === 'string' && detail.title.trim() ? detail.title : 'Entrenamiento personalizado';
        const loadedSections = detailToSections(detail);
        const finalSections = loadedSections.length > 0 ? loadedSections : [newSection(0)];
        setTitle(loadedTitle);
        if (typeof detail.date === 'string') setDate(detail.date);
        setSections(finalSections);
        setEditMeta({ isRepeating: detail.is_repeating === true, isCompleted: detail.is_completed === true });
        setInitialSnapshot(sectionsSnapshot(loadedTitle, finalSections));
      })
      .catch((e: any) => {
        if (cancelled) return;
        const message = e?.response?.data?.message;
        setEditError(typeof message === 'string' && message ? message : 'No se pudo cargar el entrenamiento. Revisa tu conexión.');
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editAssignmentId, editReloadSeq]);

  usePreventRemove(hasUnsavedChanges && !saved && !leaveAction, ({ data }) => {
    if (savingRef.current) return; // guardando: no se puede salir a medias
    pendingNavActionRef.current = data.action;
    setDiscardVisible(true);
  });

  useEffect(() => {
    if (leaveAction) leaveAction();
  }, [leaveAction]);

  const leave = (fn: () => void) => setLeaveAction(() => fn);

  // El aviso de descartar lo lanza usePreventRemove cuando hay contenido.
  const onBack = () => navigation?.goBack();

  const buildBlocks = () =>
    sections
      .filter((s) => s.exercises.length > 0)
      .map((s, i) => ({
        title: s.title.trim() || `Sección ${i + 1}`,
        exercises: s.exercises.map((e) => {
          const prescribed: Partial<Record<'series' | CustomWorkoutMetricKey, string>> = {
            series: String(e.series),
          };
          const reps = cleanMetricValue('reps', e.reps);
          const carga = cleanMetricValue('carga', e.carga);
          const descanso = cleanMetricValue('descanso', e.descanso);
          const intensity = cleanMetricValue(e.intensity, e.intensityValue);
          if (reps) prescribed.reps = reps;
          if (carga) prescribed.carga = carga;
          if (descanso) prescribed.descanso = descanso;
          if (intensity) prescribed[e.intensity] = intensity;
          const enabled: CustomWorkoutMetricKey[] = ['reps', 'carga', 'descanso', e.intensity];
          if (e.tiempo) {
            prescribed.tiempo = e.tiempo;
            enabled.push('tiempo');
          }
          return {
            exercise_id: e.exerciseId,
            prescribed,
            enabled_metrics: enabled,
            ...(e.notes ? { notes: e.notes } : {}),
          };
        }),
      }));

  const validateBeforeSave = () => {
    if (!title.trim()) {
      showToast('Ponle un nombre', { description: 'El entrenamiento necesita un nombre.', variant: 'warning' });
      return false;
    }
    if (exerciseCount === 0) {
      showToast('Sin ejercicios', { description: 'Añade al menos un ejercicio a alguna sección.', variant: 'warning' });
      return false;
    }
    return true;
  };

  const saveEdit = async (scope: 'single' | 'following') => {
    if (editAssignmentId == null || savingRef.current || saved) return;
    if (!validateBeforeSave()) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await customWorkoutsApi.update({
        program_day_assignment_id: editAssignmentId,
        scope,
        title: title.trim(),
        blocks: buildBlocks(),
      });
      hapticSuccess();
      setSaved(true);
      const message = res?.data?.message;
      showToast('Entrenamiento actualizado', {
        description: typeof message === 'string' && message ? message : 'Cambios guardados.',
        variant: 'success',
      });
      leave(() => navigation?.goBack());
    } catch (e: any) {
      const message = e?.response?.data?.message;
      showToast('No se pudo guardar', {
        description: typeof message === 'string' ? message : 'Inténtalo de nuevo en unos minutos.',
        variant: 'error',
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const onSaveEditPress = () => {
    if (savingRef.current || saved || askingScopeRef.current) return;
    if (!editMeta || editMeta.isCompleted) return;
    if (!validateBeforeSave()) return;
    if (editScopeParam || !editMeta.isRepeating) {
      saveEdit(editScopeParam ?? 'single');
      return;
    }
    askingScopeRef.current = true;
    const done = () => {
      askingScopeRef.current = false;
    };
    Alert.alert(
      'Entrenamiento repetido',
      'Este entrenamiento se repite cada semana. ¿A cuáles quieres aplicar los cambios?',
      [
        { text: 'Cancelar', style: 'cancel', onPress: done },
        {
          text: 'Solo este día',
          onPress: () => {
            done();
            saveEdit('single');
          },
        },
        {
          text: 'Este y los siguientes',
          onPress: () => {
            done();
            saveEdit('following');
          },
        },
      ],
      { cancelable: true, onDismiss: done }
    );
  };

  const save = async () => {
    if (isEdit) {
      onSaveEditPress();
      return;
    }
    if (savingRef.current || saved) return;
    if (!validateBeforeSave()) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await customWorkoutsApi.create({
        client_request_id: requestIdRef.current,
        title: title.trim(),
        date,
        repeat_weeks: repeat ? repeatWeeks : 1,
        blocks: buildBlocks(),
      });
      hapticSuccess();
      setSaved(true);
      const assignments = Array.isArray(res.data?.data?.assignments) ? res.data.data.assignments : [];
      const first = assignments[0];
      if (first && first.date === todayKey && typeof first.assignment_id === 'number') {
        setStartNow({ assignmentId: first.assignment_id, title: title.trim() });
      } else {
        showToast('Entrenamiento creado', {
          description: res.data?.message ?? 'Ya lo tienes en tu calendario.',
          variant: 'success',
        });
        leave(() => navigation?.goBack());
      }
    } catch (e: any) {
      const message = e?.response?.data?.message;
      showToast('No se pudo guardar', {
        description: typeof message === 'string' ? message : 'Inténtalo de nuevo en unos minutos.',
        variant: 'error',
      });
    } finally {
      savingRef.current = false;
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
        <Text style={styles.headerTitle}>{isEdit ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}</Text>
        <Box style={{ width: 26 }} />
      </HStack>

      {isEdit && (editLoading || editError != null || !editMeta || editMeta.isCompleted) ? (
        <VStack style={styles.stateWrap}>
          {editLoading ? (
            <Spinner size="large" color={C.orange} />
          ) : (
            <>
              <Icon
                name={editMeta?.isCompleted && editError == null ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={40}
                color={C.textSecondary}
              />
              <Text style={styles.stateText}>
                {editError ??
                  (editMeta?.isCompleted
                    ? 'Este entrenamiento ya está completado y no se puede editar.'
                    : 'No se pudo cargar el entrenamiento.')}
              </Text>
              {editError != null && (
                <Button
                  radius="pill"
                  style={[styles.saveBtn, { marginTop: 16, paddingHorizontal: 24 }] as any}
                  onPress={() => {
                    setEditLoading(true);
                    setEditError(null);
                    setEditReloadSeq((n) => n + 1);
                  }}
                >
                  <ButtonText style={styles.saveText}>Reintentar</ButtonText>
                </Button>
              )}
              <Pressable onPress={onBack} hitSlop={8} style={{ marginTop: 14 }} accessibilityRole="button">
                <Text style={styles.stateLink}>Volver</Text>
              </Pressable>
            </>
          )}
        </VStack>
      ) : (
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
          {isEdit ? (
            // En edición la fecha no se puede cambiar (2026-09-24).
            <Text style={styles.dateFixed}>{formatLongDate(date) || date}</Text>
          ) : (
          <>
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
                      {w === 52 ? '1 año' : `${w} semanas`}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            )}
          </Box>
          </>
          )}

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

              <Pressable
                style={[
                  styles.addExerciseBtn,
                  (section.exercises.length >= MAX_EXERCISES_PER_SECTION || exerciseCount >= MAX_EXERCISES) && { opacity: 0.4 },
                ]}
                disabled={section.exercises.length >= MAX_EXERCISES_PER_SECTION || exerciseCount >= MAX_EXERCISES}
                onPress={() => setPickerSectionKey(section.key)}
              >
                <Icon name="add-circle-outline" size={18} color={C.orange60} />
                <Text style={styles.addExerciseText}>Añadir ejercicio</Text>
              </Pressable>
            </Box>
          ))}

          {sections.length < MAX_SECTIONS && (
            <Pressable style={styles.addSectionBtn} onPress={addSection}>
              <Icon name="layers-outline" size={18} color={C.textPrimary} />
              <Text style={styles.addSectionText}>Añadir sección</Text>
            </Pressable>
          )}
        </ScrollView>

        <Box style={styles.footer}>
          <Button
            radius="pill"
            style={[styles.saveBtn, (saving || exerciseCount === 0) && { opacity: 0.6 }] as any}
            onPress={save}
            disabled={saving || saved}
          >
            {saving ? (
              <Spinner size="small" color={C.accentBlackForeground} />
            ) : (
              <ButtonText style={styles.saveText}>
                {isEdit ? 'Guardar cambios' : 'Guardar entrenamiento'}
                {exerciseCount > 0 ? ` · ${exerciseCount} ejercicio${exerciseCount !== 1 ? 's' : ''}` : ''}
              </ButtonText>
            )}
          </Button>
        </Box>
      </KeyboardAvoidingView>
      )}

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
        title={isEdit ? '¿Descartar cambios?' : '¿Descartar entrenamiento?'}
        message={isEdit ? 'Perderás los cambios que has hecho en este entrenamiento.' : 'Perderás las secciones y ejercicios que has añadido.'}
        confirmText="Descartar"
        cancelText="Seguir editando"
        destructive
        onCancel={() => {
          pendingNavActionRef.current = null;
          setDiscardVisible(false);
        }}
        onConfirm={() => {
          setDiscardVisible(false);
          const action = pendingNavActionRef.current;
          pendingNavActionRef.current = null;
          leave(() => (action ? navigation?.dispatch(action) : navigation?.goBack()));
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
          leave(() => navigation?.goBack());
        }}
        onConfirm={() => {
          const s = startNow;
          setStartNow(null);
          if (!s) return;
          const params = { programDayAssignmentId: s.assignmentId, mTitle: s.title };
          leave(() =>
            navigation?.replace
              ? navigation.replace('MigratedWorkoutPreview', params)
              : navigation?.navigate('MigratedWorkoutPreview', params)
          );
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
    stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    stateText: {
      fontSize: 15,
      fontFamily: FONT.medium,
      color: C.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 21,
    },
    stateLink: { fontSize: 15, fontFamily: FONT.semiBold, color: C.orange60, lineHeight: 20 },
    dateFixed: { fontSize: 15, fontFamily: FONT.semiBold, color: C.textPrimary, lineHeight: 20 },
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
