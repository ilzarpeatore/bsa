import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  ScrollView, Alert,
  View,
} from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  TAB_BAR_CLEARANCE  } from '@components/NavigationTab';
import {  useTabBarScroll  } from '@store/TabBarScrollContext';
import {  Gesture, GestureDetector  } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, SharedValue } from 'react-native-reanimated';
import {  runOnJS  } from 'react-native-worklets';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  Card  } from '@components/ui/card';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Button, ButtonText  } from '@components/ui/button';
import { FONT, RADIUS } from './theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  workoutHistoryApi, CompletedSessionItem  } from '../../api/workoutHistory';
import {  adaptiveWeekPlansApi  } from '../../api/adaptiveWeekPlans';
import {  checkinsApi, checkinTypeLabel, CheckInAssignment  } from '../../api/checkins';

interface CalendarWorkout {
  title?: string;
  assignmentId?: number;
  workoutTemplateId?: number;
}

// Mismo fallback por palabra clave que usa MigratedSchedule (schedule_screen.tsx) —
// el backend de getMyCalendar no expone thumbnail real del WorkoutTemplate, así que
// se replica aquí el mismo criterio para que ambas pantallas se vean consistentes.
function getWorkoutImage(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('cardio') || t.includes('hiit')) return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400';
  if (t.includes('strength') || t.includes('power') || t.includes('lift')) return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400';
  if (t.includes('rope') || t.includes('aero')) return 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400';
  return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400';
}

interface CalendarDayModel {
  date: string;
  inMonth: boolean;
  workouts: CalendarWorkout[];
}

interface MyProgramCalendarScreenProps {
  navigation?: any;
  route?: any;
}

interface DropZone {
  dateKey: string;
  yStart: number;
  yEnd: number;
}

function hitTestDropZone(y: number, zones: DropZone[]): string | null {
  'worklet';
  for (const z of zones) {
    if (y >= z.yStart && y <= z.yEnd) return z.dateKey;
  }
  return null;
}

interface DraggableWorkoutCardProps {
  dateKey: string;
  assignmentId: number | null;
  canDrag: boolean;
  dragAssignmentId: SharedValue<number | null>;
  dragTranslateX: SharedValue<number>;
  dragTranslateY: SharedValue<number>;
  dropZones: SharedValue<DropZone[]>;
  onDragStart: () => void;
  onDragHover: (dateKey: string | null) => void;
  onDragEnd: (toDateKey: string | null) => void;
  children: React.ReactElement;
}

// Arrastre real (finger drag) del entrenamiento -- solo se activa cuando
// canDrag es true (semana en curso + vista Semana/Lista, ver renderWorkoutCard).
// Fuera de ese caso el gesto queda deshabilitado y la tarjeta se comporta
// exactamente igual que antes (solo toque). El wrapper anima su propia
// posición leyendo los shared values del padre -- solo la tarjeta que
// realmente se está arrastrando (dragAssignmentId coincide) se mueve.
function DraggableWorkoutCard({
  dateKey,
  assignmentId,
  canDrag,
  dragAssignmentId,
  dragTranslateX,
  dragTranslateY,
  dropZones,
  onDragStart,
  onDragHover,
  onDragEnd,
  children,
}: DraggableWorkoutCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = assignmentId != null && dragAssignmentId.value === assignmentId;
    return {
      transform: [
        { translateX: isDragging ? dragTranslateX.value : 0 },
        { translateY: isDragging ? dragTranslateY.value : 0 },
      ],
      zIndex: isDragging ? 50 : 0,
      elevation: isDragging ? 12 : 0,
      shadowOpacity: isDragging ? 0.2 : 0,
      opacity: isDragging ? 0.96 : 1,
    };
  });

  const panGesture = Gesture.Pan()
    .enabled(canDrag)
    .onStart(() => {
      // Reset explícito -- si el rebote (withSpring) de un drag anterior
      // sobre OTRA tarjeta todavía no había terminado, dragTranslateX/Y
      // podían traer un valor residual y esta tarjeta "saltaría" antes de
      // empezar a seguir el dedo.
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      // Se fija aquí, en el hilo de UI, para que la tarjeta empiece a
      // seguir el dedo sin esperar a la vuelta por runOnJS/JS thread.
      dragAssignmentId.value = assignmentId;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      dragTranslateX.value = e.translationX;
      dragTranslateY.value = e.translationY;
      runOnJS(onDragHover)(hitTestDropZone(e.absoluteY, dropZones.value));
    })
    .onEnd((e) => {
      const hovered = hitTestDropZone(e.absoluteY, dropZones.value);
      dragTranslateX.value = withSpring(0);
      // dragAssignmentId solo se limpia cuando el spring termina de verdad
      // (y sigue siendo esta tarjeta la que está "activa") -- limpiarlo ya
      // mismo haría que useAnimatedStyle deje de leer dragTranslateY y la
      // tarjeta saltase de golpe a su sitio en vez de verse el rebote.
      dragTranslateY.value = withSpring(0, undefined, (finished) => {
        if (finished && dragAssignmentId.value === assignmentId) {
          dragAssignmentId.value = null;
        }
      });
      runOnJS(onDragEnd)(hovered);
    });

  return (
    <Animated.View style={animatedStyle}>
      {canDrag ? <GestureDetector gesture={panGesture}>{children}</GestureDetector> : children}
    </Animated.View>
  );
}

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function startOfWeekMonday(d: Date): Date {
  const copy = toDateOnly(d);
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(copy, diff);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${MONTH_NAMES_SHORT[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTH_NAMES_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function chunkIntoWeeks<T>(days: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export default function MyProgramCalendarScreen(props: MyProgramCalendarScreenProps) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const today = toDateOnly(new Date());
  const todayKey = toDateKey(today);
  const { reportScrollY } = useTabBarScroll();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mDays, setMDays] = useState<CalendarDayModel[]>([]);
  const [loadedYm, setLoadedYm] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<CompletedSessionItem[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<CheckInAssignment[]>([]);
  // Check-ins/formularios con fecha fija (scheduled_date) puesta por el
  // coach, agrupados por dateKey -- a diferencia de pendingCheckins (solo
  // recurrentes/cuestionarios, solo válidos para "hoy"), estos sí se
  // proyectan sobre cualquier día del calendario. Ver getAssignedCalendar.
  const [scheduledTasksByDate, setScheduledTasksByDate] = useState<Record<string, CheckInAssignment[]>>({});

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [periodMode, setPeriodMode] = useState<'week' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(today));
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(today));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(todayKey);

  // Modo vida real (2026-08-12): el cliente marca desde su calendario qué
  // días no podrá entrenar. Sigue pasando por aprobación del coach — esto
  // solo crea la propuesta (POST request-unavailable), nunca aplica nada
  // directamente.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [submittingSelection, setSubmittingSelection] = useState(false);

  // Vida real (2026-08-21): el cliente solo puede ver la programación de la
  // semana en curso en vista "Semana" -- ir más allá muestra un aviso en vez
  // de navegar. La vista "Mes" no se restringe (sirve para consultar
  // historial/planificación general, no para "trabajar" el día a día).
  const [weekBlockedMessage, setWeekBlockedMessage] = useState<string | null>(null);
  const weekBlockedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (weekBlockedTimeoutRef.current) clearTimeout(weekBlockedTimeoutRef.current);
  }, []);
  const showWeekBlockedMessage = (message: string) => {
    if (weekBlockedTimeoutRef.current) clearTimeout(weekBlockedTimeoutRef.current);
    setWeekBlockedMessage(message);
    weekBlockedTimeoutRef.current = setTimeout(() => setWeekBlockedMessage(null), 3500);
  };

  // Reorganizar entrenamientos moviéndolos de día -- solo tiene sentido
  // dentro de la semana en curso (la única que el cliente puede "trabajar",
  // ver bloqueo de semanas futuras más arriba). Igual que selectionMode,
  // construye una propuesta (moves) que se envía al coach: no reordena el
  // calendario real hasta que se aprueba.
  const [reorderMode, setReorderMode] = useState(false);
  const [movingWorkout, setMovingWorkout] = useState<{ assignmentId: number; fromDate: string; title: string } | null>(null);
  const [pendingMoves, setPendingMoves] = useState<Map<number, { fromDate: string; toDate: string; title: string }>>(new Map());
  const [submittingReorder, setSubmittingReorder] = useState(false);

  // Arrastre real con el dedo (solo semana en curso + vista Semana/Lista,
  // ver canDrag en renderWorkoutCard) -- comparte el mismo movingWorkout/
  // pendingMoves que el flujo de "toca para seleccionar" de arriba, así que
  // ambos caminos conviven sin duplicar lógica de negocio. Los shared values
  // viven aquí (un solo drag activo a la vez) y solo la tarjeta cuyo
  // assignmentId coincide con dragAssignmentId anima su posición.
  const dragAssignmentId = useSharedValue<number | null>(null);
  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const dropZones = useSharedValue<DropZone[]>([]);
  const [dragHoverDateKey, setDragHoverDateKey] = useState<string | null>(null);
  const dayRowRefs = useRef<Record<string, View | null>>({});

  // Las zonas de suelta solo tienen sentido en Semana+Lista (único caso con
  // canDrag=true) -- al salir de esa combinación se descartan para no
  // arrastrar coordenadas obsoletas si se vuelve a entrar más tarde.
  useEffect(() => {
    if (periodMode !== 'week' || viewMode !== 'list') {
      dropZones.value = [];
      dayRowRefs.current = {};
    }
  }, [periodMode, viewMode, dropZones]);

  // Semanas de diferencia entre la semana de dateKey y la semana en curso
  // (0 = semana actual, 1 = la siguiente, etc). Único punto de cálculo:
  // reutilizado tanto por la navegación de goNext (vista Semana) como por
  // goToWorkout (bloquea abrir/empezar un entrenamiento de una semana
  // futura sin importar por qué vista se llegó hasta él -- mes, semana o
  // lista -- ver bug real reportado: se pudo iniciar un entrenamiento de
  // dentro de 2 semanas seleccionando el día directamente en vista Mes).
  const weeksAheadForDate = (dateKey: string): number => {
    const weekStart = startOfWeekMonday(new Date(`${dateKey}T00:00:00`));
    const currentWeekStart = startOfWeekMonday(today);
    return Math.round((weekStart.getTime() - currentWeekStart.getTime()) / (7 * 86400000));
  };

  const weekBlockedMessageFor = (weeksAhead: number): string =>
    weeksAhead === 1
      ? 'Todavía no puedes ver la próxima semana. Se desbloqueará cuando comience.'
      : 'Tienes semanas anteriores sin completar. Ponte al día antes de avanzar.';

  // Reorganizar solo opera sobre la semana en curso, sea cual sea la vista
  // desde la que se entra (Mes, Semana o Lista) -- ver reorderMode más abajo.
  const isCurrentWeekDate = (dateKey: string): boolean => weeksAheadForDate(dateKey) === 0;

  const cancelReorderMode = () => {
    setReorderMode(false);
    setMovingWorkout(null);
    setPendingMoves(new Map());
    setDragHoverDateKey(null);
    dropZones.value = [];
  };

  const selectWorkoutToMove = (w: CalendarWorkout, dateKey: string) => {
    if (w.assignmentId == null || !isCurrentWeekDate(dateKey)) return;
    setMovingWorkout({ assignmentId: w.assignmentId, fromDate: dateKey, title: w.title || 'Entrenamiento' });
  };

  // Re-mide las zonas de suelta justo antes de empezar a arrastrar (ver
  // handleDragStart) -- onLayout NO se dispara al hacer scroll (solo cuando
  // cambia el layout de verdad), así que si el usuario baja la lista antes
  // de agarrar una tarjeta, las coordenadas cacheadas en el montaje
  // quedarían desactualizadas. Repetir la medición aquí, con el scroll ya
  // bloqueado justo después (ver ScrollView de la vista Lista), asegura que
  // el hit-test del drag usa siempre la posición real en pantalla.
  const measureDropZones = () => {
    Object.entries(dayRowRefs.current).forEach(([dateKey, node]) => {
      if (!node || !isCurrentWeekDate(dateKey)) return;
      node.measureInWindow((x, y, width, height) => {
        dropZones.value = [
          ...dropZones.value.filter((z) => z.dateKey !== dateKey),
          { dateKey, yStart: y, yEnd: y + height },
        ];
      });
    });
  };

  // onDragStart/onDragHover/onDragEnd: llamados desde el worklet del pan
  // gesture vía runOnJS (ver DraggableWorkoutCard) -- el drag reutiliza
  // exactamente el mismo selectWorkoutToMove/applyMoveToDay que el flujo de
  // toque, así que hereda gratis la validación de "semana en curso".
  const handleDragStart = (w: CalendarWorkout, dateKey: string) => {
    measureDropZones();
    selectWorkoutToMove(w, dateKey);
  };

  const handleDragHover = (hoveredDateKey: string | null) => {
    setDragHoverDateKey(hoveredDateKey);
  };

  const handleDragEnd = (toDateKey: string | null) => {
    setDragHoverDateKey(null);
    if (toDateKey) applyMoveToDay(toDateKey);
    else setMovingWorkout(null);
  };

  const applyMoveToDay = (toDateKey: string) => {
    if (!movingWorkout) return;
    if (toDateKey === movingWorkout.fromDate) {
      setMovingWorkout(null);
      return;
    }
    if (!isCurrentWeekDate(toDateKey)) {
      // Deja movingWorkout activo -- el usuario puede seguir eligiendo un
      // día válido sin tener que volver a tocar el entrenamiento.
      showWeekBlockedMessage('Solo puedes mover entrenamientos dentro de la semana en curso.');
      return;
    }
    setPendingMoves((prev) => {
      const next = new Map(prev);
      next.set(movingWorkout.assignmentId, { fromDate: movingWorkout.fromDate, toDate: toDateKey, title: movingWorkout.title });
      return next;
    });
    setMovingWorkout(null);
  };

  const submitReorder = async () => {
    if (pendingMoves.size === 0) return;
    setSubmittingReorder(true);
    // Cambio directo, sin aprobación del coach (pedido explícito
    // 2026-08-23) -- antes esto creaba una propuesta vía
    // adaptiveWeekPlansApi.requestReorder que el calendario real no
    // reflejaba hasta que el coach la aprobaba. Ahora aplica el movimiento
    // al instante y recarga el mes para ver el resultado real.
    let ok = false;
    try {
      await workoutHistoryApi.moveCalendarAssignments(
        Array.from(pendingMoves, ([assignmentId, m]) => ({ assignmentId, toDate: m.toDate }))
      );
      ok = true;
    } catch {
      ok = false;
    } finally {
      setSubmittingReorder(false);
    }
    const count = pendingMoves.size;
    cancelReorderMode();
    if (ok) {
      const [yearStr, monthStr] = ym.split('-');
      getData(Number(monthStr), Number(yearStr), ym);
      Alert.alert(
        'Guardado',
        count > 1 ? `Se movieron ${count} entrenamientos de día.` : 'Se movió el entrenamiento de día.'
      );
    } else {
      Alert.alert('No se pudo guardar', 'Inténtalo de nuevo en unos minutos.');
    }
  };

  const dominantAnchor = periodMode === 'week' ? addDays(weekAnchor, 3) : selectedMonth;
  const ym = `${dominantAnchor.getFullYear()}-${dominantAnchor.getMonth() + 1}`;

  const getData = useCallback(async (month: number, year: number, ymKey: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await workoutHistoryApi.getMyCalendar(month, year);
      const calData: any = res.data.data;
      const days = calData?.days ?? [];
      const mapped: CalendarDayModel[] = days.map((d: any) => ({
        date: d.date,
        inMonth: !!d.in_month,
        workouts: (d.workouts ?? []).map((w: any) => ({
          title: w.title,
          assignmentId: w.assignment_id,
          workoutTemplateId: w.id,
        })),
      }));
      setMDays(mapped);
      setLoadedYm(ymKey);
    } catch {
      setErrorMessage('No se pudo cargar el calendario.');
    } finally {
      setIsLoading(false);
    }

    // Best-effort, independiente del calendario de workouts -- si falla no
    // debe tumbar la carga del calendario en sí.
    checkinsApi
      .getAssignedCalendar(month, year)
      .then((res) => {
        const grouped: Record<string, CheckInAssignment[]> = {};
        (res.data?.data ?? []).forEach((a) => {
          const key = (a.scheduled_date || '').slice(0, 10);
          if (!key) return;
          (grouped[key] ||= []).push(a);
        });
        setScheduledTasksByDate(grouped);
      })
      .catch(() => setScheduledTasksByDate({}));
  }, []);

  useEffect(() => {
    if (ym === loadedYm) return;
    // Deriva mes/año de `ym` (ya en las deps) en vez de releer
    // dominantAnchor.getMonth()/getFullYear() directamente -- dominantAnchor
    // es un Date nuevo en cada render (addDays/selectedMonth), añadirlo a
    // las deps dispararía el efecto en renders donde el año/mes real no
    // cambió.
    const [yearStr, monthStr] = ym.split('-');
    getData(Number(monthStr), Number(yearStr), ym);
  }, [ym, loadedYm, getData]);

  // BUG REAL (2026-08-13, reportado por cliente): antes había un tercer
  // criterio `completedByDate.has(dateKey)` que marcaba TODOS los workouts
  // de un día como "hechos" en cuanto había CUALQUIER sesión completada esa
  // fecha, sin comprobar a qué assignment/template pertenecía realmente esa
  // sesión. Con datos reales (cliente 8, 2026-08-07) ese día tenía 6
  // workouts programados (varios programas activos coincidiendo en la misma
  // fecha) y solo 3 estaban realmente completados — el fallback por fecha
  // pintaba los 6 en verde. Se elimina: solo cuentan como "hecho" los dos
  // matches específicos (por program_day_assignment_id o por
  // fecha+workout_template_id), igual que hace el backend para decidir el
  // detalle de sesión (SessionDetailController).
  useEffect(() => {
    workoutHistoryApi
      .getMyCompletedSessions()
      .then((res) => setCompletedSessions(res.data?.data ?? []))
      .catch(() => setCompletedSessions([]));
  }, []);

  // Sincroniza con "Mi plan de hoy" de Home (home_screen_modern.tsx): las
  // mismas tareas no-workout del coach (check-ins/formularios pendientes)
  // deben verse también aquí. A diferencia de los workouts (que sí tienen
  // fecha exacta vía ProgramDayAssignment), un CheckInAssignment solo tiene
  // recurrencia (daily/weekly/monthly) y un `is_due` que el backend calcula
  // para "ahora" — no hay una fecha de vencimiento concreta que se le pueda
  // asignar a un día pasado o futuro del calendario. Por eso solo se
  // muestran en el panel del día seleccionado cuando ese día es HOY (ver
  // uso más abajo), en vez de intentar proyectarlos sobre una celda
  // concreta del grid con datos que no existen.
  useEffect(() => {
    checkinsApi
      .getAssignedList()
      // Las de fecha fija (scheduled_date) se resuelven vía
      // scheduledTasksByDate/getAssignedCalendar más arriba, sea o no hoy su
      // fecha -- si se dejaran aquí también, un scheduled_date de hoy
      // aparecería duplicado (una vez por cada fuente).
      .then((res) => setPendingCheckins((res.data?.data ?? []).filter((a) => a.is_due && !a.scheduled_date)))
      .catch(() => setPendingCheckins([]));
  }, []);

  const completedAssignmentIds = useMemo(
    () => new Set(completedSessions.filter((s) => s.program_day_assignment_id != null).map((s) => s.program_day_assignment_id as number)),
    [completedSessions]
  );
  const completedByTemplate = useMemo(
    () => completedSessions.reduce((set, s) => {
      if (s.workout_template_id != null && s.date) {
        set.add(`${String(s.date).slice(0, 10)}|${s.workout_template_id}`);
      }
      return set;
    }, new Set<string>()),
    [completedSessions]
  );

  const isWorkoutCompleted = useCallback(
    (w: CalendarWorkout, dateKey: string) =>
      (w.assignmentId != null && completedAssignmentIds.has(w.assignmentId)) ||
      (w.workoutTemplateId != null && completedByTemplate.has(`${dateKey}|${w.workoutTemplateId}`)),
    [completedAssignmentIds, completedByTemplate]
  );

  // Swipe vertical dentro del propio grid del calendario (números/celdas, no
  // la pantalla entera): arriba -> vista semanal, abajo -> vista mensual. Se
  // limita al modo calendario (no en selectionMode, donde arrastrar sobre
  // las celdas sirve para marcar días) y exige una distancia vertical clara
  // y predominante para no robarle el scroll vertical normal a la
  // ScrollView que lo envuelve.
  const CALENDAR_SWIPE_THRESHOLD = 40;
  // startOfWeekMonday/startOfMonth son funciones normales de JS (no
  // worklets) -- llamarlas directamente dentro de .onEnd() las ejecutaria en
  // el hilo de UI y crashea la app en produccion. Se envuelve toda la logica
  // en una funcion JS y se salta al hilo de JS una unica vez con runOnJS.
  const applyWeekSwipe = useCallback(() => {
    setPeriodMode('week');
    setWeekAnchor(startOfWeekMonday(today));
    setSelectedDayKey(todayKey);
  }, [today, todayKey]);
  const applyMonthSwipe = useCallback(() => {
    setPeriodMode('month');
    setSelectedMonth(startOfMonth(today));
    setSelectedDayKey(todayKey);
  }, [today, todayKey]);
  const calendarSwipeGesture = Gesture.Pan()
    .enabled(!selectionMode)
    .activeOffsetY([-20, 20])
    .failOffsetX([-18, 18])
    .onEnd((e) => {
      if (e.translationY <= -CALENDAR_SWIPE_THRESHOLD) {
        runOnJS(applyWeekSwipe)();
      } else if (e.translationY >= CALENDAR_SWIPE_THRESHOLD) {
        runOnJS(applyMonthSwipe)();
      }
    });

  const goPrev = () => {
    setSelectedDayKey(null);
    if (periodMode === 'month') {
      setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else {
      setWeekAnchor((prev) => addDays(prev, -7));
    }
  };

  const goNext = () => {
    if (periodMode === 'week') {
      const nextAnchor = addDays(weekAnchor, 7);
      const weeksAhead = weeksAheadForDate(toDateKey(nextAnchor));
      if (weeksAhead >= 1) {
        showWeekBlockedMessage(weekBlockedMessageFor(weeksAhead));
        return;
      }
    }
    setSelectedDayKey(null);
    if (periodMode === 'month') {
      setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else {
      setWeekAnchor((prev) => addDays(prev, 7));
    }
  };

  const weekDays: CalendarDayModel[] = (() => {
    const anchorKey = toDateKey(weekAnchor);
    const idx = mDays.findIndex((d) => d.date === anchorKey);
    if (idx === -1) return [];
    return mDays.slice(idx, idx + 7);
  })();

  const visibleDays = periodMode === 'week' ? weekDays : mDays;
  const monthWeeks = periodMode === 'month' ? chunkIntoWeeks(mDays) : [];
  const selectedDay = visibleDays.find((d) => d.date === selectedDayKey) || null;

  // Cualquier día puede tener tareas de coach (check-ins recurrentes solo si
  // es HOY, o de fecha fija en cualquier día) sin tener ningún workout
  // programado — no debe tratarse como "día de descanso" ni desaparecer del
  // listado en ese caso.
  const checkinsForDay = useCallback(
    (dateKey: string): CheckInAssignment[] => [
      ...(dateKey === todayKey ? pendingCheckins : []),
      ...(scheduledTasksByDate[dateKey] ?? []),
    ],
    [pendingCheckins, scheduledTasksByDate, todayKey]
  );
  const daysWithWorkouts = visibleDays.filter(
    (d) => (d.workouts.length > 0 || checkinsForDay(d.date).length > 0) && (periodMode === 'week' || d.inMonth)
  );

  const goToWorkout = (w: CalendarWorkout, dateKey: string) => {
    if (w.assignmentId == null) return;
    const weeksAhead = weeksAheadForDate(dateKey);
    if (weeksAhead >= 1) {
      showWeekBlockedMessage(weekBlockedMessageFor(weeksAhead));
      return;
    }
    if (isWorkoutCompleted(w, dateKey)) {
      // Día ya realizado: vista de solo lectura de lo que se hizo de verdad
      // (mismo destino que Historial de entrenamientos), no el editor/preview
      // de la plantilla. IMPORTANTE: no mandar también workoutTemplateId aquí
      // — a diferencia de CompletedSessionItem (donde asignación y plantilla
      // suelta son mutuamente excluyentes), en el calendario ambos IDs
      // siempre vienen rellenos a la vez; si se manda workout_template_id el
      // backend (SessionDetailController::getSessionDetail) lo trata como
      // sesión "standalone" y busca el review por workout_template_id+fecha
      // en vez de por program_day_assignment_id, perdiendo las series reales
      // registradas (verificado con curl: total_sets pasa de 15 a 0).
      navigation?.navigate('MigratedSessionHistoryDetail', {
        programDayAssignmentId: w.assignmentId,
        title: w.title,
      });
      return;
    }
    navigation?.navigate('MigratedWorkoutPreview', {
      programDayAssignmentId: w.assignmentId,
      mTitle: w.title,
    });
  };

  const renderWorkoutCard = (w: CalendarWorkout, dateKey: string, key: string | number) => {
    const completed = isWorkoutCompleted(w, dateKey);
    const pendingMove = w.assignmentId != null ? pendingMoves.get(w.assignmentId) : undefined;
    const isSelectedToMove = !!movingWorkout && movingWorkout.assignmentId === w.assignmentId && movingWorkout.fromDate === dateKey;
    const canMove = reorderMode && !completed && w.assignmentId != null && isCurrentWeekDate(dateKey);
    // Arrastre real solo en Semana+Lista (días completos y grandes como
    // zona de suelta) -- en Mes/vista Calendario sigue disponible el toque
    // (canMove) para elegir día, pero no el drag por el tamaño de celda.
    const canDrag = canMove && periodMode === 'week' && viewMode === 'list';
    return (
      <DraggableWorkoutCard
        key={key}
        dateKey={dateKey}
        assignmentId={w.assignmentId ?? null}
        canDrag={canDrag}
        dragAssignmentId={dragAssignmentId}
        dragTranslateX={dragTranslateX}
        dragTranslateY={dragTranslateY}
        dropZones={dropZones}
        onDragStart={() => handleDragStart(w, dateKey)}
        onDragHover={handleDragHover}
        onDragEnd={handleDragEnd}
      >
        <Pressable
          onPress={() => (reorderMode ? (canMove && selectWorkoutToMove(w, dateKey)) : goToWorkout(w, dateKey))}
          disabled={reorderMode && !canMove}
        >
          <Card
            variant="elevated"
            className="flex-row items-center p-3"
            style={[
              completed ? styles.workoutCardCompleted : { marginTop: 8 },
              isSelectedToMove && styles.workoutCardMoving,
            ]}
          >
            <Image source={{ uri: getWorkoutImage(w.title || '') }} contentFit="cover" style={styles.workoutImage} />
            <VStack style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.workoutTitle} numberOfLines={2}>{w.title || ''}</Text>
              {completed && (
                <HStack space="xs" style={{ marginTop: 4 }}>
                  <Icon name="checkmark-circle" size={13} color={C.success} />
                  <Text style={styles.completedBadgeText}>Completado</Text>
                </HStack>
              )}
              {pendingMove && (
                <HStack space="xs" style={{ marginTop: 4 }}>
                  <Icon name="arrow-forward-circle" size={13} color={C.orange} />
                  <Text style={styles.pendingMoveText}>Propuesto para {formatDayLabel(pendingMove.toDate)}</Text>
                </HStack>
              )}
            </VStack>
            {reorderMode ? (
              canMove && (
                <Icon
                  name={canDrag ? 'reorder-three' : 'reorder-three-outline'}
                  size={20}
                  color={isSelectedToMove ? C.orange : C.textSecondary}
                />
              )
            ) : (
              <Icon name="chevron-forward" size={20} color={C.textSecondary} />
            )}
          </Card>
        </Pressable>
      </DraggableWorkoutCard>
    );
  };

  const renderCheckinCard = (a: CheckInAssignment) => (
    <Pressable
      key={`checkin-${a.id}`}
      onPress={() => navigation?.navigate('MigratedCheckInFill', { formAssignmentId: a.id, formId: a.form_id, title: a.form.title })}
    >
      <Card variant="elevated" className="flex-row items-center p-3" style={{ marginTop: 8 }}>
        <Box style={styles.checkinIconWrap}>
          <Icon name="clipboard-outline" size={26} color={C.warning60} />
        </Box>
        <VStack style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.workoutTitle} numberOfLines={2}>{a.form.title}</Text>
          <Text style={styles.checkinSubtitle}>{checkinTypeLabel(a)}</Text>
        </VStack>
        <Icon name="chevron-forward" size={20} color={C.textSecondary} />
      </Card>
    </Pressable>
  );

  const toggleDaySelection = (day: CalendarDayModel) => {
    if (day.workouts.length === 0) return; // nada que marcar en un día de descanso real
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(day.date)) next.delete(day.date);
      else next.add(day.date);
      return next;
    });
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedDates(new Set());
  };

  const submitUnavailableSelection = async () => {
    if (selectedDates.size === 0) return;

    // Agrupar por semana (lunes) -- una solicitud = una semana calendario,
    // igual que el flujo del coach (AdaptiveWeekPlanner::persist()).
    const byWeek = new Map<string, number[]>();
    const mDaysByDate = new Map(mDays.map((d) => [d.date, d]));
    for (const dateKey of selectedDates) {
      const dateObj = new Date(`${dateKey}T00:00:00`);
      const weekStartKey = toDateKey(startOfWeekMonday(dateObj));
      const day = mDaysByDate.get(dateKey);
      const ids = (day?.workouts ?? []).map((w) => w.assignmentId).filter((id): id is number => id != null);
      if (!ids.length) continue;
      byWeek.set(weekStartKey, [...(byWeek.get(weekStartKey) ?? []), ...ids]);
    }

    if (byWeek.size === 0) return;

    setSubmittingSelection(true);
    let okCount = 0;
    let errCount = 0;
    try {
      const results = await Promise.allSettled(
        Array.from(byWeek, ([weekStart, ids]) => adaptiveWeekPlansApi.requestUnavailable(weekStart, ids))
      );
      okCount = results.filter((r) => r.status === 'fulfilled').length;
      errCount = results.length - okCount;
    } finally {
      setSubmittingSelection(false);
    }
    cancelSelectionMode();

    if (errCount === 0) {
      Alert.alert(
        'Solicitud enviada',
        okCount > 1
          ? `Se enviaron ${okCount} solicitudes (una por semana). Tu entrenador las revisará antes de que se apliquen.`
          : 'Tu entrenador la revisará antes de que se aplique a tu calendario.'
      );
    } else {
      Alert.alert('Solicitud parcial', `${okCount} semana(s) enviada(s) correctamente, ${errCount} fallaron. Inténtalo de nuevo.`);
    }
  };

  const renderDayCell = (day: CalendarDayModel, keyPrefix: string, big: boolean) => {
    const isToday = day.date === todayKey;
    const isSelected = day.date === selectedDayKey;
    const hasWorkout = day.workouts.length > 0;
    const hasCompletedWorkout = day.workouts.some((w) => isWorkoutCompleted(w, day.date));
    // Hoy puede tener check-ins/formularios pendientes sin ningún workout —
    // igual que en el panel del día seleccionado, se refleja con un punto
    // propio (color warning) para que la celda no se vea como día libre.
    const hasCheckinTasks = checkinsForDay(day.date).length > 0;
    const isMarkedUnavailable = selectionMode && selectedDates.has(day.date);
    const isReorderDropTarget = reorderMode && !!movingWorkout && isCurrentWeekDate(day.date) && day.date !== movingWorkout.fromDate;
    const dateObj = new Date(`${day.date}T00:00:00`);
    return (
      <Pressable
        key={`${keyPrefix}-${day.date}`}
        style={[
          styles.dayCell,
          big && styles.dayCellBig,
          isSelected && !selectionMode && (big ? styles.dayCellBigSelected : styles.dayCellSelected),
          isToday && !isSelected && styles.dayCellToday,
          isMarkedUnavailable && styles.dayCellUnavailable,
          isReorderDropTarget && styles.dayCellDropTarget,
        ]}
        disabled={selectionMode && !hasWorkout}
        onPress={() => {
          if (selectionMode) return toggleDaySelection(day);
          if (reorderMode && movingWorkout) return applyMoveToDay(day.date);
          setSelectedDayKey(day.date);
        }}
      >
        {big && (
          <Text style={styles.dayCellLetter}>
            {WEEKDAY_LABELS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]}
          </Text>
        )}
        <Text
          style={[
            styles.dayCellText,
            !day.inMonth && periodMode === 'month' && styles.dayCellTextMuted,
          ]}
        >
          {dateObj.getDate()}
        </Text>
        {isMarkedUnavailable ? (
          <Icon name="close-circle" size={12} color={C.destructive} />
        ) : (
          (hasWorkout || hasCheckinTasks) && (
            <Box
              style={[
                styles.dayDot,
                hasCompletedWorkout && styles.dayDotCompleted,
                !hasWorkout && hasCheckinTasks && styles.dayDotCheckin,
              ]}
            />
          )
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HStack style={styles.headerRow}>
        <Text style={styles.header}>
          {selectionMode ? 'Marca los días' : reorderMode ? 'Reorganiza tu semana' : 'Mi programa'}
        </Text>
        {selectionMode ? (
          <Pressable onPress={cancelSelectionMode}>
            <Text style={styles.unavailableCancelText}>Cancelar</Text>
          </Pressable>
        ) : reorderMode ? (
          <Pressable onPress={cancelReorderMode}>
            <Text style={styles.unavailableCancelText}>Cancelar</Text>
          </Pressable>
        ) : (
          <HStack style={styles.viewToggle}>
            <Pressable
              style={styles.viewToggleBtn}
              onPress={() => setReorderMode(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Reorganizar semana"
            >
              <Icon name="swap-vertical-outline" size={18} color={C.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.viewToggleBtn}
              onPress={() => setSelectionMode(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Marcar días"
            >
              <Icon name="close-circle-outline" size={18} color={C.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('calendar')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Vista calendario"
              accessibilityState={{ selected: viewMode === 'calendar' }}
            >
              <Icon name="calendar-outline" size={18} color={viewMode === 'calendar' ? '#FFFFFF' : C.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Vista lista"
              accessibilityState={{ selected: viewMode === 'list' }}
            >
              <Icon name="list-outline" size={18} color={viewMode === 'list' ? '#FFFFFF' : C.textSecondary} />
            </Pressable>
          </HStack>
        )}
      </HStack>
      {selectionMode && (
        <Text style={styles.unavailableHint}>
          Toca los días con entrenamiento que no vas a poder hacer. Tu entrenador revisará la solicitud antes de aplicarla.
        </Text>
      )}
      {reorderMode && (
        <Text style={styles.unavailableHint}>
          {movingWorkout
            ? `Toca el día de esta semana al que quieres mover "${movingWorkout.title}".`
            : 'Toca un entrenamiento de la semana en curso para elegir un nuevo día. Tu entrenador revisará los cambios.'}
        </Text>
      )}

      <HStack space="sm" style={styles.periodToggleRow}>
        <Pressable
          style={[styles.periodChip, periodMode === 'week' && styles.periodChipActive]}
          onPress={() => {
            setPeriodMode('week');
            setWeekAnchor(startOfWeekMonday(today));
            setSelectedDayKey(todayKey);
          }}
        >
          <Text style={[styles.periodChipText, periodMode === 'week' && styles.periodChipTextActive]}>Semana</Text>
        </Pressable>
        <Pressable
          style={[styles.periodChip, periodMode === 'month' && styles.periodChipActive]}
          onPress={() => {
            setPeriodMode('month');
            setSelectedMonth(startOfMonth(today));
            setSelectedDayKey(todayKey);
          }}
        >
          <Text style={[styles.periodChipText, periodMode === 'month' && styles.periodChipTextActive]}>Mes</Text>
        </Pressable>
      </HStack>

      <HStack style={styles.monthRow}>
        <Pressable style={styles.monthBtn} onPress={goPrev}>
          <Icon name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.monthText}>
          {periodMode === 'month' ? formatMonthYear(selectedMonth) : formatWeekRange(weekAnchor)}
        </Text>
        <Pressable style={styles.monthBtn} onPress={goNext}>
          <Icon name="chevron-forward" size={22} color={C.textPrimary} />
        </Pressable>
      </HStack>

      {weekBlockedMessage && (
        <Box style={styles.weekBlockedBanner}>
          <Icon name="lock-closed" size={16} color={C.textSecondary} />
          <Text style={styles.weekBlockedText}>{weekBlockedMessage}</Text>
        </Box>
      )}

      {isLoading ? (
        <Box style={styles.loader}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      ) : errorMessage ? (
        <Box style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{errorMessage}</Text>
        </Box>
      ) : viewMode === 'calendar' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
          onScroll={(e) => reportScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
        >
          <GestureDetector gesture={calendarSwipeGesture}>
            <View>
              {periodMode === 'month' && (
                <HStack style={styles.weekdayHeaderRow}>
                  {WEEKDAY_LABELS.map((l) => (
                    <Text key={l} style={styles.weekdayHeaderText}>{l}</Text>
                  ))}
                </HStack>
              )}

              {periodMode === 'month' ? (
                monthWeeks.map((week, wi) => (
                  <HStack key={wi} style={styles.weekRow}>
                    {week.map((day) => renderDayCell(day, `m${wi}`, false))}
                  </HStack>
                ))
              ) : (
                <HStack style={styles.weekRow}>
                  {weekDays.map((day) => renderDayCell(day, 'w', true))}
                </HStack>
              )}
            </View>
          </GestureDetector>

          <Box style={styles.selectedDaySection}>
            <Text style={styles.selectedDayTitle}>
              {selectedDayKey ? formatDayLabel(selectedDayKey) : 'Selecciona un día'}
            </Text>
            {selectedDayKey && checkinsForDay(selectedDayKey).map(renderCheckinCard)}
            {selectedDay && selectedDay.workouts.length > 0 ? (
              selectedDay.workouts.map((w, wi) => renderWorkoutCard(w, selectedDay.date, wi))
            ) : selectedDayKey && checkinsForDay(selectedDayKey).length === 0 ? (
              <Card variant="ghost" className="flex-row items-center gap-2 p-3.5 rounded-sm" style={{ marginTop: 8 }}>
                <Icon name="moon-outline" size={18} color={C.textSecondary} />
                <Text style={styles.restDayText}>Día de descanso</Text>
              </Card>
            ) : null}
          </Box>
        </ScrollView>
      ) : daysWithWorkouts.length === 0 && periodMode === 'month' ? (
        <Box style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes entrenamientos programados este mes.</Text>
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: TAB_BAR_CLEARANCE }}
          scrollEnabled={!(reorderMode && movingWorkout)}
          onScroll={(e) => reportScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
        >
          {(periodMode === 'week' ? visibleDays : daysWithWorkouts).map((day) => {
            const isDropTarget = reorderMode && !!movingWorkout && isCurrentWeekDate(day.date) && movingWorkout.fromDate !== day.date;
            const isHoveredDropTarget = isDropTarget && dragHoverDateKey === day.date;
            return (
              <Box
                key={day.date}
                ref={(node: View | null) => { dayRowRefs.current[day.date] = node; }}
                onLayout={() => {
                  if (!isCurrentWeekDate(day.date)) return;
                  // measureInWindow necesita el layout ya asentado -- se
                  // reintenta en el siguiente frame para evitar medidas a 0
                  // justo tras el montaje.
                  requestAnimationFrame(() => {
                    dayRowRefs.current[day.date]?.measureInWindow((x, y, width, height) => {
                      dropZones.value = [
                        ...dropZones.value.filter((z) => z.dateKey !== day.date),
                        { dateKey: day.date, yStart: y, yEnd: y + height },
                      ];
                    });
                  });
                }}
                style={[
                  styles.daySection,
                  isDropTarget && styles.daySectionDropTarget,
                  isHoveredDropTarget && styles.daySectionDropTargetHover,
                ]}
              >
                <Pressable disabled={!isDropTarget} onPress={() => applyMoveToDay(day.date)}>
                  <HStack className="items-center justify-between">
                    <Text style={styles.dayDate}>{formatDayLabel(day.date)}</Text>
                    {isDropTarget && (
                      <HStack space="xs" className="items-center">
                        <Icon name="arrow-down-circle-outline" size={16} color={C.orange} />
                        <Text style={styles.dropTargetText}>{isHoveredDropTarget ? 'Suelta aquí' : 'Mover aquí'}</Text>
                      </HStack>
                    )}
                  </HStack>
                </Pressable>
                {checkinsForDay(day.date).map(renderCheckinCard)}
                {day.workouts.length > 0 ? (
                  day.workouts.map((w, wIdx) => renderWorkoutCard(w, day.date, wIdx))
                ) : checkinsForDay(day.date).length === 0 ? (
                  <Card variant="ghost" className="flex-row items-center gap-2 p-3.5 rounded-sm" style={{ marginTop: 8 }}>
                    <Icon name="moon-outline" size={16} color={C.textSecondary} />
                    <Text style={styles.restDayText}>Día de descanso</Text>
                  </Card>
                ) : null}
              </Box>
            );
          })}
        </ScrollView>
      )}

      {selectionMode && selectedDates.size > 0 && (
        <HStack style={styles.unavailableBar}>
          <Text style={styles.unavailableBarText}>
            {selectedDates.size} día{selectedDates.size !== 1 ? 's' : ''} seleccionado{selectedDates.size !== 1 ? 's' : ''}
          </Text>
          <Button
            size="sm"
            radius="pill"
            style={[styles.unavailableSubmitBtn, submittingSelection && { opacity: 0.6 }] as any}
            onPress={submitUnavailableSelection}
            disabled={submittingSelection}
          >
            {submittingSelection ? (
              <Spinner size="small" color="#FFFFFF" />
            ) : (
              <ButtonText style={styles.unavailableSubmitText}>Enviar solicitud</ButtonText>
            )}
          </Button>
        </HStack>
      )}

      {reorderMode && pendingMoves.size > 0 && (
        <HStack style={styles.unavailableBar}>
          <Text style={styles.unavailableBarText}>
            {pendingMoves.size} cambio{pendingMoves.size !== 1 ? 's' : ''} de día
          </Text>
          <Button
            size="sm"
            radius="pill"
            style={[styles.unavailableSubmitBtn, submittingReorder && { opacity: 0.6 }] as any}
            onPress={submitReorder}
            disabled={submittingReorder}
          >
            {submittingReorder ? (
              <Spinner size="small" color="#FFFFFF" />
            ) : (
              <ButtonText style={styles.unavailableSubmitText}>Guardar cambios</ButtonText>
            )}
          </Button>
        </HStack>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: { fontSize: 20, fontFamily: FONT.bold, color: C.textPrimary },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: C.surfaceLight,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    width: 34,
    height: 30,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: { backgroundColor: '#1C1C1E' },
  periodToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
    backgroundColor: C.surfaceLight,
  },
  periodChipActive: { backgroundColor: '#1C1C1E' },
  periodChipText: { fontFamily: FONT.semiBold, fontSize: 13, color: C.textSecondary },
  periodChipTextActive: { color: '#FFFFFF' },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  monthBtn: { padding: 8 },
  monthText: { fontSize: 16, fontFamily: FONT.bold, color: C.textPrimary },
  weekBlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: C.surfaceLight,
  },
  weekBlockedText: { flex: 1, fontSize: 13, fontFamily: FONT.medium, color: C.textSecondary },
  weekdayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  weekdayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: C.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayCellBig: {
    aspectRatio: 0.85,
    borderWidth: 1,
    borderColor: C.gray70,
    paddingVertical: 10,
    gap: 4,
  },
  dayCellBigSelected: {
    backgroundColor: C.surface,
    borderColor: C.orange,
    borderWidth: 1.5,
  },
  dayCellSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: C.orange,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: C.textPrimary,
  },
  dayCellUnavailable: {
    backgroundColor: C.destructive5,
    borderWidth: 1.5,
    borderColor: C.destructive,
  },
  dayCellDropTarget: {
    backgroundColor: C.brand10,
    borderWidth: 1.5,
    borderColor: C.orange,
  },
  dayCellLetter: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: C.textSecondary,
  },
  dayCellText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: C.textPrimary,
  },
  dayCellTextMuted: {
    color: C.textTertiary,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.orange,
  },
  dayDotCompleted: {
    backgroundColor: C.success,
  },
  dayDotCheckin: {
    backgroundColor: C.warning60,
  },
  selectedDaySection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  selectedDayTitle: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: C.textPrimary,
    marginBottom: 8,
  },
  daySection: { marginBottom: 16 },
  daySectionDropTarget: {
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingTop: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: C.brand10,
  },
  daySectionDropTargetHover: {
    backgroundColor: C.success10,
    borderWidth: 1.5,
    borderColor: C.success,
  },
  dropTargetText: { fontFamily: FONT.semiBold, fontSize: 12, color: C.orange, marginRight: 8 },
  dayDate: { fontSize: 13, fontFamily: FONT.regular, color: C.textSecondary },
  workoutImage: { width: 72, height: 72, borderRadius: RADIUS.md },
  checkinIconWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: C.warning10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinSubtitle: { fontFamily: FONT.regular, fontSize: 12, color: C.textSecondary, marginTop: 2 },
  workoutCardCompleted: {
    marginTop: 8,
    backgroundColor: C.success10,
    borderWidth: 1,
    borderColor: C.success50,
  },
  workoutCardMoving: {
    borderWidth: 1,
    borderColor: C.orange,
    backgroundColor: C.brand10,
  },
  workoutTitle: { flex: 1, fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary },
  completedBadgeText: { fontFamily: FONT.semiBold, fontSize: 11.5, color: C.success60 },
  pendingMoveText: { fontFamily: FONT.semiBold, fontSize: 11.5, color: C.orange },
  restDayText: { fontFamily: FONT.regular, fontSize: 13, color: C.textSecondary },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontFamily: FONT.medium, color: C.textSecondary, textAlign: 'center' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unavailableCancelText: { fontFamily: FONT.medium, fontSize: 14, color: C.destructive },
  unavailableHint: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: C.textSecondary,
    paddingHorizontal: 20,
    marginTop: -8,
    marginBottom: 8,
  },
  unavailableBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.gray70,
    backgroundColor: C.bg,
  },
  unavailableBarText: { fontFamily: FONT.medium, fontSize: 14, color: C.textPrimary },
  // Solo el color de fondo -- padding/radio ahora los da el propio
  // componente Button (size="sm" + radius="pill") en vez de reimplementarlos
  // a mano. `C.orange` no es uno de los variants del componente (default/
  // destructive/outline/secondary/ghost/link), así que sigue haciendo falta
  // este override -- lo que se elimina es la duplicación de padding/radio.
  unavailableSubmitBtn: {
    backgroundColor: C.orange,
  },
  unavailableSubmitText: { fontFamily: FONT.semiBold, fontSize: 14, color: '#FFFFFF' },
  });
}
