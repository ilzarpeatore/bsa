import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Vibration,
  StyleSheet,
  View,
  BackHandler,
} from 'react-native';
import {  Image  } from 'expo-image';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {  Gesture, GestureDetector  } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import {  Box  } from '@components/ui/box';
import {  HStack  } from '@components/ui/hstack';
import {  Text  } from '@components/ui/text';
import {  Heading  } from '@components/ui/heading';
import {  Card  } from '@components/ui/card';
import {  Button, ButtonText  } from '@components/ui/button';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  Divider  } from '@components/ui/divider';
import { FONT, RADIUS } from './theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { hapticLight, hapticSuccess } from '@helper/haptics';
import { showToast } from '@helper/toast';
import {
  startWorkoutLiveActivity,
  updateWorkoutLiveActivity,
  endWorkoutLiveActivity,
  WorkoutActivityState,
} from '@helper/liveActivity';
import {  ExerciseThumbMem  } from '../../components/ExerciseThumb';
import {  ConfirmDialogMem  } from '../../components/ConfirmDialog';
import TutorialTarget from '@components/tutorial/TutorialTarget';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import {  useTutorial  } from '@store/TutorialContext';
import PainReportSheet from '../../components/PainReportSheet';
import WorkoutNoteSheet from '../../components/WorkoutNoteSheet';
import IntensityCheckSheet, { IntensityMetric } from '../../components/IntensityCheckSheet';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView } from '@components/ui/glass-view';
import {  useAuth  } from '../../store/AuthContext';
import {  workoutHistoryApi  } from '../../api/workoutHistory';
import {  MetricCatalogItem  } from '../../api/workoutTemplate';
import {  exercisesApi, ExerciseItem  } from '../../api/exercises';
import ExerciseFilterBar, {
  EMPTY_EXERCISE_FILTERS,
  ExerciseFilters,
  useExerciseFilterCatalog,
} from '../../components/ExerciseFilterBar';
import {  loadSuggestionApi, pickPendingSuggestion, LoadSuggestion  } from '../../api/loadSuggestion';
import {
  ACTIVE_SESSION_STORAGE_KEY,
  updateActiveWorkoutSession,
  setWorkoutSessionMinimized,
  clearActiveWorkoutSession,
  getActiveWorkoutSession,
  ActiveWorkoutSession,
} from '../../helper/workoutSessionBus';
import { discardActiveWorkoutSession } from '../../helper/discardWorkoutSession';
import WorkoutInProgressConflict from '../../components/WorkoutInProgressConflict';
import {
  fetchUnifiedWorkout,
  formatPrescribedSubtitle,
  getMetricsCatalog,
  UnifiedExercise,
} from './workoutViewShared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Petición 2026-08-19: al añadir un ejercicio nuevo con "Añadir ejercicio +"
// debe venir SIEMPRE con series/reps/descanso/rir (o rpe) por defecto, no
// vacío. Se mantiene 'carga' (peso) aunque la nota no lo mencione
// explícitamente -- ya estaba antes y quitarlo sería una regresión no
// pedida (sin carga no se puede registrar el peso levantado). 'series' no
// es una columna en sí (ver buildInitialRows: decide el NÚMERO de filas a
// partir de prescribed.series, no un valor por fila), así que su default
// vive en ADHOC_DEFAULT_SERIES, aplicado a `prescribed` en onAddExercise.
// Mismas keys que usa el resto de la app (ver exercise_info_screen.tsx,
// prioridad ['series','carga','reps','rir','rpe','tiempo']) — se elige
// 'rir' como default único entre "rir o rpe" que pide la nota.
// Diálogo "Salir del entrenamiento" (onClose). Compartido tal cual con
// "Cancelar entrenamiento en curso" de la pantalla de conflicto
// (2026-09-24, pedido explícito: el MISMO diálogo, no otro distinto).
const EXIT_SESSION_DIALOG = {
  icon: 'log-out-outline' as const,
  title: 'Salir del entrenamiento',
  message:
    'Todavía no has finalizado esta sesión. Si sales ahora se perderá la duración y el feedback (las series ya marcadas quedan guardadas).',
  confirmText: 'Salir sin finalizar',
  cancelText: 'Seguir entrenando',
};

const ADHOC_DEFAULT_METRICS = ['carga', 'reps', 'descanso', 'rir'];
const ADHOC_DEFAULT_SERIES = 3;
// Orden pedido explícitamente por el usuario (2026-08-26): series,
// repeticiones, carga, rir/rpe y descanso -- distinto del orden crudo que a
// veces trae `enabledMetrics` del backend/plantilla. Solo de cara al
// render, no reordena el array real de la plantilla. `rir` y `rpe`
// comparten el mismo rango (mismo "slot" intercambiable, ver
// getIntensityMode más abajo -- solo uno de los dos aparece a la vez).
// tiempo (no mencionado) va al final.
const METRIC_DISPLAY_RANK: Record<string, number> = {
  series: 0,
  reps: 1,
  carga: 2,
  rir: 3,
  rpe: 3,
  descanso: 4,
  tiempo: 5,
};
function sortMetricKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ai = METRIC_DISPLAY_RANK[a];
    const bi = METRIC_DISPLAY_RANK[b];
    if (ai === undefined && bi === undefined) return a.localeCompare(b);
    if (ai === undefined) return 1;
    if (bi === undefined) return -1;
    return ai - bi;
  });
}
// Estilos del renderItem del picker de "Añadir ejercicio", fuera del
// componente para no reconstruirlos en cada fila del FlatList.
const PICKER_RESULT_IMAGE_STYLE = { width: 44, height: 44, borderRadius: RADIUS.xs, marginRight: 12 };
const PICKER_RESULT_PLACEHOLDER_STYLE = { width: 44, height: 44, marginRight: 12 };
const PICKER_RESULT_TITLE_STYLE = { fontSize: 14, marginRight: 8 };
const RESISTANCE_TRAINING_MET = 5.0;
const FALLBACK_WEIGHT_KG = 70;
// Sesion activa sin guardar (punto 3/4/5 del encargo): se persiste el
// timestamp real de inicio + el estado de las series/notas en curso, para
// que 1) la duracion mostrada nunca se "pause" por bloqueo de pantalla o
// segundo plano (siempre se calcula como Date.now() - startedAt, nunca
// acumulando en JS) y 2) si la app se cierra sin finalizar el
// entrenamiento, al reabrir esta misma pantalla (mismo
// programDayAssignmentId/workoutTemplateId) se retome tal cual se dejo, sin
// limite de dias. Solo se trackea UNA sesion activa a la vez (slot unico) -
// si el cliente abre un workout distinto mientras otro quedo sin cerrar, el
// nuevo pisa al viejo (simplificacion deliberada, ver resumen de la tarea).
// ACTIVE_SESSION_STORAGE_KEY vive en helper/workoutSessionBus.ts (import de
// arriba) -- se centralizo ahi porque App.tsx tambien la lee al arrancar.

interface Props {
  navigation?: any;
  route?: any;
}

interface SetRow {
  values: Record<string, string>;
  completed: boolean;
}

interface SessionExercise extends UnifiedExercise {
  rows: SetRow[];
  note: string;
  // true para ejercicios anadidos con "Anadir ejercicio +" - no tienen
  // workout_template_exercise_id real (no forman parte de la plantilla
  // del coach), se identifican y guardan por exerciseId directamente.
  isAdhoc?: boolean;
}

interface SessionBlock {
  id: number;
  title: string;
  exercises: SessionExercise[];
}

interface PersistedSession {
  identityKey: string;
  startedAt: number;
  blocks: SessionBlock[];
  activeIndexByBlock: Record<number, number>;
  mTitle?: string;
  // Claves (exerciseSyncKey) de los ejercicios de los que ya se ha enviado
  // al menos una serie al backend en esta sesion (2026-09-24). Opcional:
  // sesiones persistidas por versiones anteriores de la app no lo traen --
  // en ese caso se deduce de las filas completadas (ver seedSyncedKeys).
  syncedExerciseKeys?: string[];
}

/**
 * Identidad de un ejercicio tal y como la ve el backend en
 * my-calendar-log-sets: workout_template_exercise_id para los prescritos por
 * el coach, exercise_id para los añadidos ad-hoc (2026-09-24). Se usa para
 * recordar qué ejercicios ya tienen series enviadas en esta sesión.
 */
function exerciseSyncKey(ex: SessionExercise): string {
  return ex.isAdhoc ? `e:${ex.exerciseId}` : `t:${ex.id}`;
}

/**
 * Semilla del registro de "ejercicios ya sincronizados" al retomar una
 * sesión persistida (2026-09-24): usa la lista guardada si existe y, por si
 * la sesión la guardó una versión anterior de la app (sin ese campo), añade
 * cualquier ejercicio que tuviera alguna serie completada -- esas series ya
 * se enviaron al marcarlas. Todo defensivo: datos de AsyncStorage pueden
 * venir malformados.
 */
function seedSyncedKeys(persisted: PersistedSession | null): Set<string> {
  const keys = new Set<string>();
  if (!persisted) return keys;
  if (Array.isArray(persisted.syncedExerciseKeys)) {
    persisted.syncedExerciseKeys.forEach((k) => {
      if (typeof k === 'string') keys.add(k);
    });
  }
  (Array.isArray(persisted.blocks) ? persisted.blocks : []).forEach((b) => {
    (Array.isArray(b?.exercises) ? b.exercises : []).forEach((ex) => {
      if (Array.isArray(ex?.rows) && ex.rows.some((r) => r?.completed)) keys.add(exerciseSyncKey(ex));
    });
  });
  return keys;
}

/**
 * session_key de my-calendar-log-sets (2026-09-24): id estable de ESTA
 * sesión concreta = identityKey + timestamp real de inicio. sessionStartedAt
 * se restaura desde AsyncStorage al retomar tras reiniciar la app, así que
 * la clave sobrevive a reinicios. El backend solo acepta [A-Za-z0-9_:-] y
 * máximo 64 caracteres -- se sanea por si acaso.
 */
function buildSessionKey(identityKey: string | null, startedAt: number): string | undefined {
  if (!identityKey || !Number.isFinite(startedAt)) return undefined;
  const key = `${identityKey}:${Math.round(startedAt)}`.replace(/[^A-Za-z0-9_:-]/g, '').slice(0, 64);
  return key || undefined;
}

/**
 * Superpone sobre los bloques recien cargados del servidor (fuente de
 * verdad para prescribed/coachNotes/lastPerformance, que pueden haber
 * cambiado) las filas/nota en curso que el cliente ya habia rellenado en la
 * sesion persistida — y reinyecta los ejercicios "Anadir ejercicio +"
 * (isAdhoc) de la sesion persistida, que nunca van a volver del servidor
 * porque no son parte de la plantilla del coach.
 */
function mergePersistedBlocks(freshBlocks: SessionBlock[], persistedBlocks: SessionBlock[]): SessionBlock[] {
  const persistedById = new Map<number, SessionExercise>();
  const persistedAdhocByBlock = new Map<number, SessionExercise[]>();
  persistedBlocks.forEach((b, bIdx) => {
    b.exercises.forEach((ex) => {
      persistedById.set(ex.id, ex);
      if (ex.isAdhoc) {
        const list = persistedAdhocByBlock.get(bIdx) ?? [];
        list.push(ex);
        persistedAdhocByBlock.set(bIdx, list);
      }
    });
  });

  return freshBlocks.map((block, bIdx) => {
    const exercises = block.exercises.map((ex) => {
      const prev = persistedById.get(ex.id);
      if (!prev) return ex;
      return { ...ex, rows: prev.rows, note: prev.note };
    });
    const seenIds = new Set(exercises.map((e) => e.id));
    const extraAdhoc = (persistedAdhocByBlock.get(bIdx) ?? []).filter((ex) => !seenIds.has(ex.id));
    return { ...block, exercises: [...exercises, ...extraAdhoc] };
  });
}

// Cada fila se rellena con lo que el cliente hizo REALMENTE la ultima vez
// (serie por serie, ej. 20/25/30/40 kg) en vez del objetivo marcado por el
// coach - asi el cliente ve y edita desde su progreso real, no desde cero.
// El numero de filas sigue el plan actual (prescribed.series), no el numero
// de series de la ultima sesion. El objetivo del coach (prescribed) se
// muestra aparte, como referencia, en la propia celda (ver renderizado).
function buildInitialRows(ex: UnifiedExercise): SetRow[] {
  const count = Number(ex.prescribed?.series) || 1;
  const lastSets = ex.lastPerformance?.sets ?? [];
  return Array.from({ length: count }, (_, i) => {
    const lastSet = lastSets[i];
    const values: Record<string, string> = {};
    ex.enabledMetrics.forEach((key) => {
      if (lastSet && lastSet[key] != null && lastSet[key] !== '') {
        values[key] = String(lastSet[key]);
      } else if (key !== 'rir' && key !== 'rpe' && ex.prescribed?.[key] != null) {
        // RIR/RPE prescrito por el coach es un rango ("0-3"), no un valor
        // numérico único -- el Motor de Auto-Regulación no puede leerlo.
        // Se deja vacío para que el cliente registre el dato real de la
        // serie; el rango sigue visible aparte como referencia ("Obj: X",
        // ver más abajo en el render), pedido explícito 2026-09-17.
        //
        // La carga prescrita puede ser una indicación de texto del coach
        // ("Mantener", "Subir", "Bajar") en vez de kilos: no se precarga en
        // el input numérico (se registraría como carga inválida); sigue
        // visible como objetivo ("Obj: Subir") bajo la celda.
        if (key === 'carga' && Number.isNaN(Number(String(ex.prescribed[key]).replace(',', '.')))) return;
        values[key] = String(ex.prescribed[key]);
      }
    });
    return { values, completed: false };
  });
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Acepta "90" (segundos) o "1:30" (mm:ss) -- el catalogo real no fija un
// formato unico para "descanso", asi que se manejan los dos sin asumir.
function parseRestSeconds(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.includes(':')) {
    const [m, s] = trimmed.split(':').map(Number);
    if (Number.isFinite(m) && Number.isFinite(s)) return m * 60 + s;
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface WorkoutExercisePlayerProps {
  ex: SessionExercise;
  exercisePositionLabel: string;
  positionIndex: number;
  totalCount: number;
  elapsedSeconds: number;
  displayMetrics: string[];
  metricLabel: (key: string) => string;
  metricInputType: (key: string) => 'number' | 'text' | 'time';
  intensityMode: IntensityMetric | null;
  onToggleIntensityMode: () => void;
  suggestion?: LoadSuggestion;
  onChangeCell: (rowIndex: number, key: string, value: string) => void;
  onToggleRowComplete: (rowIndex: number) => void;
  onAddRow: () => void;
  onMarkAllRows: () => void;
  onOpenProgress: () => void;
  onOpenNotes: () => void;
  onOpenPainReport: () => void;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  restBar: React.ReactNode;
}

// Modo guiado a pantalla completa por ejercicio (pedido explícito
// 2026-08-27, captura de referencia de otra app): vídeo/gif del ejercicio +
// registro serie a serie, con la misma tabla de métricas que ya usaba el
// acordeón (mismos props/callbacks, sin lógica duplicada) y navegación
// Anterior/Siguiente ejercicio entre bloques. Componente aparte (no inline
// en WorkoutSessionScreen) porque useVideoPlayer es un hook -- debe montarse
// y desmontarse entero con el Modal que lo envuelve, nunca llamarse
// condicionalmente dentro del componente padre (que ya tiene decenas de
// hooks propios y sigue vivo aunque el reproductor esté cerrado).
// Ancho de la columna "SERIE" (número/botón de completar) -- el mismo en
// cabecera y filas para que todo quede alineado.
const SET_NUMBER_COL_WIDTH = 38;

/**
 * Número de la serie = botón de completarla (2026-09-24, pedido explícito
 * con captura de iPhone: con reps + carga + RIR/RPE + descanso, el check de
 * la derecha quedaba fuera de la pantalla y había que deslizar para verlo).
 * Ya no hay columna de check: se toca el propio número. Pendiente = círculo
 * con el número; hecha = círculo relleno verde (mismo color que el check
 * "completado" de antes) con ✓ blanco. Solo cambia DÓNDE se pulsa: onPress
 * es el mismo toggle de siempre (toggleRowComplete / onToggleRowComplete).
 */
function SetNumberToggle({
  index,
  completed,
  onPress,
  C,
}: {
  index: number;
  completed: boolean;
  onPress: () => void;
  C: ReturnType<typeof useAppColorMode>['colors'];
}) {
  const n = index + 1;
  return (
    <Pressable
      onPress={onPress}
      // 28 + 8 por lado = 44 pt de zona táctil.
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={completed ? `Desmarcar serie ${n}` : `Marcar serie ${n} como hecha`}
      accessibilityState={{ checked: completed }}
      style={{ width: SET_NUMBER_COL_WIDTH, alignItems: 'center', marginTop: 2 }}
    >
      <Box
        className="items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: completed ? 0 : 1.5,
          borderColor: C.border,
          backgroundColor: completed ? C.success : 'transparent',
        }}
      >
        {completed ? (
          <Icon name="checkmark" size={16} color="#FFFFFF" />
        ) : (
          <Text weight="semibold" className="text-foreground" style={{ fontSize: 12, lineHeight: 16 }}>
            {n}
          </Text>
        )}
      </Box>
    </Pressable>
  );
}

function WorkoutExercisePlayer({
  ex,
  exercisePositionLabel,
  positionIndex,
  totalCount,
  elapsedSeconds,
  displayMetrics,
  metricLabel,
  metricInputType,
  intensityMode,
  onToggleIntensityMode,
  suggestion,
  onChangeCell,
  onToggleRowComplete,
  onAddRow,
  onMarkAllRows,
  onOpenProgress,
  onOpenNotes,
  onOpenPainReport,
  onClose,
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  restBar,
}: WorkoutExercisePlayerProps) {
  const { colors: C } = useAppColorMode();
  const insets = useSafeAreaInsets();
  const videoSource = ex.videoUrl || null;
  // useVideoPlayer siempre se llama (con source null si no hay vídeo) --
  // reglas de los hooks, nunca condicional. play() sí es condicional, en un
  // efecto aparte, solo cuando hay vídeo real que reproducir.
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (videoSource) player.play();
  }, [videoSource, player]);

  // Botón físico Atrás en Android -- antes lo resolvía gratis el <Modal> que
  // envolvía este componente (onRequestClose); al pasar a una vista normal
  // superpuesta (ver comentario junto al Modal eliminado, en el punto de
  // montaje) hay que engancharlo a mano para no perder el comportamiento.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);

  // Entrada deslizando desde abajo -- reemplaza el animationType="slide" que
  // traía gratis el <Modal> eliminado (ver comentario en el punto de
  // montaje). Un solo withTiming al montar, igual de una sola vez que antes
  // (este componente se desmonta del todo al cerrar, nunca se reutiliza).
  const enterY = useSharedValue(SCREEN_HEIGHT);
  useEffect(() => {
    enterY.value = withTiming(0, { duration: 280 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deslizar hacia la derecha cierra el modo guiado y vuelve a la pantalla
  // anterior (pedido explícito) -- mismo criterio que el gesto de minimizar
  // ya usado en la pantalla principal (ver minimizeGesture más abajo):
  // umbral de traslación O de velocidad, failOffsetY cede de inmediato ante
  // cualquier intento de scroll vertical (la tabla de series se desplaza
  // verticalmente encima de este mismo gesto).
  const CLOSE_DRAG_THRESHOLD = 90;
  const closeDragX = useSharedValue(0);
  const closeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(15)
        .failOffsetY([-15, 15])
        .onUpdate((e) => {
          if (e.translationX > 0) closeDragX.value = e.translationX;
        })
        .onEnd((e) => {
          if (e.translationX > CLOSE_DRAG_THRESHOLD || e.velocityX > 800) {
            runOnJS(hapticLight)();
            runOnJS(onClose)();
          }
          closeDragX.value = withSpring(0);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const closeDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: closeDragX.value }, { translateY: enterY.value }],
  }));

  return (
    <GestureDetector gesture={closeGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: C.bg }, closeDragStyle]}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          {/* Hero a pantalla completa (vídeo o imagen del ejercicio), con
              overlays flotantes en "glass" -- mismo lenguaje visual que ya
              usa NavigationTab.tsx (GlassView + recorte propio en un View
              aparte, ver ese archivo). Modernización pedida explícitamente
              con captura de referencia de otra app (2026-08-28). */}
          <Box style={{ width: '100%', height: HERO_HEIGHT, backgroundColor: '#000' }}>
            {videoSource ? (
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                nativeControls={false}
              />
            ) : ex.image ? (
              <Image source={{ uri: ex.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Box className="items-center justify-center" style={{ width: '100%', height: '100%', backgroundColor: C.gray10 }}>
                <ExerciseThumbMem image={ex.image} bodyPartId={ex.bodyPartId} size={96} />
              </Box>
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
            />

            <Box
              className="flex-row items-center justify-between px-5"
              style={{ position: 'absolute', left: 0, right: 0, top: Math.max(insets.top, 12) }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }}>
                <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
                <Pressable
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modo guiado"
                >
                  <Icon name="close" size={22} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={{ borderRadius: 999, overflow: 'hidden' }}>
                <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
                <Box style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text weight="semibold" style={{ fontSize: 13, color: '#FFFFFF' }}>
                    {exercisePositionLabel}
                  </Text>
                </Box>
              </View>

              <Box style={{ width: 40 }} />
            </Box>

            {/* Cronómetro de la sesión (mismo elapsedSeconds del header
                original, dato real -- no un botón de pausa decorativo: no
                existe "pausar sesión" como función en la app, así que solo
                se muestra el tiempo, sin fingir un control que no hace
                nada). */}
            <Box style={{ position: 'absolute', left: 20, bottom: 34 }}>
              <Text weight="bold" style={{ fontSize: 15, color: '#FFFFFF' }}>
                {formatTimer(elapsedSeconds)}
              </Text>
            </Box>

            {/* Segmentos de progreso -- uno por ejercicio de TODO el
                entrenamiento (no solo del bloque actual, mismo criterio que
                flatPositions), relleno hasta el actual. */}
            <HStack style={{ position: 'absolute', left: 20, right: 20, bottom: 14 }} space="xs">
              {Array.from({ length: totalCount }).map((_, idx) => (
                <Box
                  key={idx}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: idx <= positionIndex ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </HStack>
          </Box>

          {/* "Hoja" con el contenido editable -- esquinas superiores
              redondeadas simulando una sheet (pedido de modernización); el
              tirador de arriba es solo visual, el cierre real es el gesto de
              swipe o el botón (✕) de la cabecera. */}
          <Box className="flex-1 bg-card" style={{ borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden' }}>
            <Box className="items-center" style={{ paddingTop: 10 }}>
              <Box style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
            </Box>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <HStack className="items-start justify-between px-5" style={{ marginTop: 14 }}>
                <Box style={{ flex: 1 }}>
                  <Heading size="md">{ex.title}</Heading>
                  <Text muted style={{ fontSize: 13, marginTop: 4 }}>
                    {formatPrescribedSubtitle(ex.prescribed)}
                  </Text>
                </Box>
                <HStack space="xs" style={{ marginTop: 2 }}>
                  <Pressable
                    className="p-2"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={onOpenNotes}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir nota para tu entrenador"
                  >
                    <Icon name="chatbox-ellipses-outline" size={20} className="text-muted-foreground" />
                  </Pressable>
                  <Pressable
                    className="p-2"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={onOpenProgress}
                    accessibilityRole="button"
                    accessibilityLabel="Ver progreso de este ejercicio"
                  >
                    <Icon name="analytics-outline" size={20} className="text-foreground" />
                  </Pressable>
                  <Pressable
                    className="p-2"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={onOpenPainReport}
                    accessibilityRole="button"
                    accessibilityLabel="Reportar dolor"
                  >
                    <Icon name="medkit-outline" size={20} className="text-muted-foreground" />
                  </Pressable>
                </HStack>
              </HStack>

              {restBar && <Box className="px-5" style={{ marginTop: 14 }}>{restBar}</Box>}

              {/* Misma tabla de series/métricas que el acordeón de la pantalla
                  principal (ver renderBlockPage) -- estilos y estructura
                  idénticos a propósito, solo cambian los callbacks (recibidos
                  por props en vez de cerrar sobre blockIdx/exIdx
                  directamente). El check de completar pasa de círculo-outline
                  a cuadrado relleno en verde al completarse, y se añade una
                  línea divisoria de descanso entre series (pedido de
                  modernización, captura de referencia) -- puramente
                  informativa, no sustituye a la columna "Descanso" editable
                  si el ejercicio la tiene habilitada. */}
              {/* 2026-09-24: sin columna de check (se completa tocando el
                  número, ver SetNumberToggle) y columnas de métricas a flex
                  en vez de 72 px fijos -- con 4-5 métricas todo cabe sin
                  scroll horizontal, que ya no hace falta. Cabecera, casilla
                  y "Obj: X" comparten la misma columna flex, así que siguen
                  alineados. Etiquetas de cabecera hasta 2 líneas: la
                  cabecera crece, no se solapa con los inputs. */}
              <Box style={{ marginTop: 20 }}>
                <Box className="px-5">
                  <HStack style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                    <Text
                      weight="semibold"
                      muted
                      className="text-center"
                      style={{ fontSize: 11, lineHeight: 13, width: SET_NUMBER_COL_WIDTH }}
                    >
                      SERIE
                    </Text>
                    {displayMetrics.map((key) => {
                      const isIntensity = key === 'rir' || key === 'rpe';
                      const label = (
                        <Text
                          weight="semibold"
                          muted={!isIntensity}
                          className="text-center"
                          style={[{ fontSize: 11, lineHeight: 13 }, isIntensity && { color: C.blue }]}
                          numberOfLines={2}
                        >
                          {metricLabel(key)}
                        </Text>
                      );
                      return isIntensity ? (
                        <Pressable
                          key={key}
                          style={{ flex: 1, minWidth: 0, marginHorizontal: 2 }}
                          onPress={onToggleIntensityMode}
                          hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Cambiar entre RIR y RPE (actual: ${(intensityMode ?? key).toUpperCase()})`}
                        >
                          {label}
                        </Pressable>
                      ) : (
                        <Box key={key} style={{ flex: 1, minWidth: 0, marginHorizontal: 2 }}>
                          {label}
                        </Box>
                      );
                    })}
                  </HStack>

                  {ex.rows.map((row, rowIdx) => (
                    <React.Fragment key={rowIdx}>
                      <HStack
                        className="items-start rounded-sm"
                        style={{
                          marginBottom: 8,
                          paddingVertical: row.completed ? 4 : 0,
                          backgroundColor: row.completed ? C.success5 : 'transparent',
                        }}
                      >
                        <SetNumberToggle
                          index={rowIdx}
                          completed={row.completed}
                          onPress={() => onToggleRowComplete(rowIdx)}
                          C={C}
                        />
                        {displayMetrics.map((key) => {
                          const suggestedValue = key === 'carga' ? suggestion?.weight : key === 'reps' ? suggestion?.reps : null;
                          const hasSuggestion = suggestedValue != null;
                          const target = hasSuggestion ? suggestedValue : ex.prescribed?.[key];
                          return (
                            <Box key={key} style={{ flex: 1, minWidth: 0, marginHorizontal: 2 }}>
                              <TextInput
                                className="bg-card rounded-sm text-foreground"
                                style={{ paddingVertical: 8, paddingHorizontal: 2, fontFamily: FONT.regular, fontSize: 13, textAlign: 'center', borderWidth: 1, borderColor: C.border }}
                                value={row.values[key] ?? ''}
                                onChangeText={(t) => onChangeCell(rowIdx, key, t)}
                                keyboardType={metricInputType(key) === 'number' ? 'numeric' : 'default'}
                                placeholder="-"
                                placeholderTextColor={C.textSecondary}
                              />
                              {target != null && target !== '' ? (
                                <Text
                                  className="text-center"
                                  style={{
                                    fontSize: 9.5,
                                    marginTop: 2,
                                    fontFamily: hasSuggestion ? FONT.semiBold : FONT.regular,
                                    color: hasSuggestion ? C.warning60 : C.textSecondary,
                                  }}
                                  numberOfLines={1}
                                >
                                  {hasSuggestion ? `Sugerido: ${target}` : `Obj: ${target}`}
                                </Text>
                              ) : null}
                            </Box>
                          );
                        })}
                      </HStack>

                      {ex.prescribed?.descanso && rowIdx < ex.rows.length - 1 ? (
                        <HStack className="items-center" style={{ marginBottom: 8 }} space="sm">
                          <Divider className="flex-1" />
                          <Text muted style={{ fontSize: 10.5 }}>
                            Descanso {ex.prescribed.descanso}
                          </Text>
                          <Divider className="flex-1" />
                        </HStack>
                      ) : null}
                    </React.Fragment>
                  ))}
                </Box>
              </Box>

              {/* Añadir serie (acción principal) y marcar todas (secundaria)
                  -- notas/progreso/dolor ya subieron junto al título, así
                  que esta fila queda solo para lo que actúa sobre las
                  series. */}
              <HStack className="items-center justify-between px-5" style={{ marginTop: 22 }} space="sm">
                <Pressable
                  className="flex-1 flex-row items-center justify-center rounded-pill border border-border"
                  style={{ gap: 6, paddingVertical: 12 }}
                  onPress={onAddRow}
                >
                  <Icon name="add" size={18} className="text-foreground" />
                  <Text weight="semibold" className="text-foreground" style={{ fontSize: 13 }}>
                    Añadir serie
                  </Text>
                </Pressable>
                <Pressable
                  className="p-2 items-center"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={onMarkAllRows}
                  accessibilityRole="button"
                  accessibilityLabel="Marcar todas las series"
                >
                  <Text weight="semibold" className="text-foreground text-center" style={{ fontSize: 12 }}>
                    Marcar todas
                  </Text>
                </Pressable>
              </HStack>
            </ScrollView>

            <HStack
              className="px-5 border-t border-border"
              style={{ gap: 10, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 14) + 6, backgroundColor: C.bg }}
            >
              <Button variant="outline" radius="pill" size="lg" className="flex-1" onPress={onBack} disabled={!canGoBack}>
                <Icon name="chevron-back" size={16} className="text-foreground" />
                <ButtonText>Anterior</ButtonText>
              </Button>
              <Button radius="pill" size="lg" className="flex-1" onPress={onNext} disabled={!canGoNext}>
                <ButtonText>Siguiente ejercicio</ButtonText>
                <Icon name="chevron-forward" size={16} color="#FFFFFF" />
              </Button>
            </HStack>
          </Box>
        </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}

export default function WorkoutSessionScreen(props: Props) {
  const { navigation, route } = props;
  const { colors: C } = useAppColorMode();
  const { state } = useAuth();
  const { reportAction } = useTutorial();
  const insets = useSafeAreaInsets();
  // Qué entrenamiento es esta instancia: por defecto el de route.params,
  // pero la pantalla de conflicto ("Ya tienes un entrenamiento en curso")
  // puede convertir ESTA MISMA instancia en el entrenamiento en curso
  // (sessionTarget) sin navegar -- ver continueActiveSession más abajo.
  const [sessionTarget, setSessionTarget] = useState<{
    programDayAssignmentId?: number;
    workoutTemplateId?: number;
    mTitle?: string;
  } | null>(null);
  const programDayAssignmentId: number | undefined = sessionTarget
    ? sessionTarget.programDayAssignmentId
    : route?.params?.programDayAssignmentId;
  const workoutTemplateId: number | undefined = sessionTarget
    ? sessionTarget.workoutTemplateId
    : route?.params?.workoutTemplateId;
  const mTitle: string | undefined = sessionTarget ? sessionTarget.mTitle : route?.params?.mTitle;
  // Sube cada vez que hay que (re)arrancar el flujo de montaje (retomar /
  // empezar + load) en esta misma instancia.
  const [bootSeq, setBootSeq] = useState(0);

  // Misma fuente de verdad que ya usan logSets()/finishSession() en el
  // backend para identificar esta sesion: program_day_assignment_id por
  // defecto, o workout_template_id (workout suelto sin programa) cuando no
  // hay asignacion de programa - usado para POST /sessions/{id}/pain-report.
  const painReportSessionId = programDayAssignmentId ?? workoutTemplateId;
  const painReportIsWorkoutTemplate = programDayAssignmentId == null && workoutTemplateId != null;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  // 'gone' = el entrenamiento ya no existe o ya no es de este cliente (404/
  // 403: el coach lo quitó o movió del calendario) -> se descarta la sesión
  // guardada, reintentar no serviría de nada. 'network' = cualquier otro
  // fallo (sin conexión, 5xx) -> se conserva para poder reintentar.
  const [loadErrorKind, setLoadErrorKind] = useState<'gone' | 'network' | null>(null);
  const persistedRef = useRef<PersistedSession | null>(null);
  // Ejercicios (exerciseSyncKey) de los que ya se ha enviado alguna serie
  // en esta sesión -- necesario para mandar logged_sets: [] cuando el
  // cliente desmarca TODAS las series de uno (2026-09-24), y solo de esos.
  const syncedExerciseKeysRef = useRef<Set<string>>(new Set());
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [activeIndexByBlock, setActiveIndexByBlock] = useState<Record<number, number>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [metricsCatalog, setMetricsCatalog] = useState<MetricCatalogItem[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<ExerciseItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerLoadingMore, setPickerLoadingMore] = useState(false);
  const pickerPageRef = useRef(1);
  const pickerIsLastPageRef = useRef(false);
  // Filtros del buscador: grupo muscular + equipo + nivel + tipo (todo lo que
  // filtra GET exercise-list), ver components/ExerciseFilterBar.tsx.
  const [pickerFilters, setPickerFilters] = useState<ExerciseFilters>(EMPTY_EXERCISE_FILTERS);
  const pickerCatalog = useExerciseFilterCatalog(isPickerVisible);
  const [closeConfirmVisible, setCloseConfirmVisible] = useState(false);
  const [emptyFinishConfirmVisible, setEmptyFinishConfirmVisible] = useState(false);
  const [painReportTarget, setPainReportTarget] = useState<SessionExercise | null>(null);
  // Nota para el entrenador (WorkoutNoteSheet, sustituye el TextInput fijo
  // que antes vivía siempre visible dentro del acordeón) y reproductor de
  // ejercicio a pantalla completa (WorkoutExercisePlayer más abajo en el
  // JSX) -- ambos guardan coordenadas (blockIdx/exIdx), no el objeto
  // SessionExercise entero, mismo criterio que intensityCheckTarget: siguen
  // apuntando a la fila correcta aunque `blocks` cambie mientras están
  // abiertos (p.ej. autoguardado de otra fila).
  const [notesTarget, setNotesTarget] = useState<{ blockIdx: number; exIdx: number } | null>(null);
  const [playerTarget, setPlayerTarget] = useState<{ blockIdx: number; exIdx: number } | null>(null);
  // Consulta de intensidad (RIR o RPE) tras completar una serie
  // (IntensityCheckSheet) -- guarda las coordenadas de la fila recién
  // marcada + qué métrica tocaba en ese momento, no el objeto entero (a
  // diferencia de painReportTarget), porque necesita seguir apuntando a la
  // fila correcta aunque `blocks` cambie mientras el sheet está abierto.
  const [intensityCheckTarget, setIntensityCheckTarget] = useState<{
    blockIdx: number;
    exIdx: number;
    rowIndex: number;
    metric: IntensityMetric;
  } | null>(null);
  // RIR y RPE son la misma "columna de intensidad" vista desde 2 escalas
  // inversas -- pedido explícito 2026-08-26: "deben de ser reemplazables",
  // el cliente elige tocando la cabecera de la columna. Por ejercicio (no
  // global): un mismo entrenamiento puede tener ejercicios donde interese
  // usar una u otra. Sin entrada aquí -> se usa el default de
  // getIntensityMode (lo que ya traiga `enabledMetrics` de la plantilla).
  const [intensityModeOverride, setIntensityModeOverride] = useState<Record<number, IntensityMetric>>({});
  const getIntensityMode = (ex: SessionExercise): IntensityMetric => {
    const override = intensityModeOverride[ex.exerciseId];
    if (override) return override;
    if (ex.enabledMetrics.includes('rir')) return 'rir';
    if (ex.enabledMetrics.includes('rpe')) return 'rpe';
    // RIR/RPE es obligatorio (uno u otro) desde el backend -- todo ejercicio
    // debería traer ya uno de los dos en enabledMetrics. Este fallback solo
    // cubre una plantilla vieja en caché sin ninguno de los dos.
    return 'rir';
  };
  const toggleIntensityMode = (exerciseId: number, current: IntensityMetric) => {
    setIntensityModeOverride((prev) => ({ ...prev, [exerciseId]: current === 'rir' ? 'rpe' : 'rir' }));
  };
  // Columnas a pintar para este ejercicio: enabledMetrics tal cual, pero con
  // 'rir'/'rpe' colapsados a un único slot (el que decida getIntensityMode)
  // en vez de poder aparecer los dos a la vez.
  const getDisplayMetrics = (ex: SessionExercise): string[] => {
    const withoutIntensity = ex.enabledMetrics.filter((k) => k !== 'rir' && k !== 'rpe');
    const mode = getIntensityMode(ex);
    return sortMetricKeys(mode ? [...withoutIntensity, mode] : withoutIntensity);
  };
  // Guard "no se puede empezar un workout si ya hay uno empezado" (petición
  // 2026-08-19) -- si al montar esta pantalla YA hay una sesión activa con
  // un identityKey DISTINTO al que se pide aquí, se bloquea por completo
  // (nunca se llama a load()) y se ofrece continuar con la sesión existente
  // en su lugar. Cualquier forma de "empezar/abrir" un workout pasa por el
  // montaje de esta misma pantalla (preview o minimizador), así que este es
  // el único sitio que hace falta para cubrir todos los casos.
  const [conflictingSession, setConflictingSession] = useState<ActiveWorkoutSession | null>(null);
  // Popup de descanso: segundos restantes, o null si no hay ninguno activo.
  // Se dispara al marcar una serie como hecha (nunca al desmarcarla) si esa
  // serie concreta tiene un valor de "descanso" (metrica real del catalogo
  // -- series/reps/carga/tiempo/tempo/descanso/rir/rpe) configurado.
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  // epoch ms del fin del descanso -- espejo de restCountdown pero como fecha
  // absoluta, que es lo que necesita la Live Activity (Text(timerInterval:)
  // del lado nativo cuenta atras sola, sin que la app le mande un tick cada
  // segundo).
  const [restEndDate, setRestEndDate] = useState<number | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Live Activity (Lock Screen/Dynamic Island, pedido explícito 2026-08-26):
  // como esta pantalla puede tener varios bloques con su propio ejercicio
  // activo a la vez (accordion por bloque), se usa el ULTIMO ejercicio en el
  // que el cliente marcó una serie como "el que se está viendo ahora" -- es
  // la señal más reciente y real de foco, más fiable que asumir el bloque 0.
  const currentFocusRef = useRef<{ blockIdx: number; exIdx: number }>({ blockIdx: 0, exIdx: 0 });
  const liveActivityStartedRef = useRef(false);
  // Motor de Auto-Regulacion: sugerencia de carga PENDIENTE (aun no
  // aprobada por el coach) por exerciseId, cargada bajo demanda solo para
  // el ejercicio activo/expandido (ver fetchLoadSuggestion). Las ya
  // aplicadas/aprobadas NO necesitan esto -- llegan directas en
  // ex.prescribed porque el backend ya las fusiona (ClientExerciseOverride).
  const [pendingLoadSuggestions, setPendingLoadSuggestions] = useState<Record<number, LoadSuggestion>>({});
  const requestedSuggestionsRef = useRef<Set<number>>(new Set());

  // Timestamp real de inicio de sesion (Date.now()), NUNCA un contador
  // incremental en JS -- ver comentario del punto 3 mas abajo. Se
  // sobreescribe con el valor persistido (si lo hay) en cuanto se resuelve
  // la carga inicial desde AsyncStorage.
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(() => Date.now());
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const pagerRef = useRef<FlatList>(null);

  const identityKey = useMemo(() => {
    if (programDayAssignmentId != null) return `pda:${programDayAssignmentId}`;
    if (workoutTemplateId != null) return `wt:${workoutTemplateId}`;
    return null;
  }, [programDayAssignmentId, workoutTemplateId]);

  // Punto 3: "el tiempo no debe pausarse cuando se bloquea la pantalla o la
  // app pasa a segundo plano". Un setInterval que hace +1 se para/desfasa
  // cuando el hilo JS se suspende. En vez de acumular, esto solo fuerza un
  // re-render cada segundo (nowTick) y el tiempo real se recalcula siempre
  // como Date.now() - sessionStartedAt -- en cuanto la app vuelve a primer
  // plano y el intervalo retoma, el siguiente tick ya muestra la duracion
  // correcta sin importar cuanto tiempo estuvo suspendida.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((nowTick - sessionStartedAt) / 1000));

  // Peso real del perfil (si existe) para el estimado de calorias en vivo -
  // el valor final/autoritativo se calcula en el backend con el mismo MET
  // al cerrar sesion (finishSession), esto es solo para el contador en vivo.
  const weightKg = useMemo(() => {
    const profile = state.user?.user_profile;
    const raw = profile?.weight ? parseFloat(profile.weight) : NaN;
    if (!Number.isFinite(raw) || raw <= 0) return FALLBACK_WEIGHT_KG;
    return profile?.weight_unit === 'lbs' ? raw * 0.453592 : raw;
  }, [state.user]);

  const liveCalories = Math.round(RESISTANCE_TRAINING_MET * weightKg * (elapsedSeconds / 3600));

  const clearPersistedSession = useCallback(() => {
    AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY).catch(() => {});
    clearActiveWorkoutSession();
    // Único choque comun a "finalizar" (navigateToFeedback) y "cerrar/
    // abandonar" (onClose) -- justo donde la sesion persistida deja de
    // existir de verdad, a diferencia de minimizar (onMinimize), que no
    // llama a esto porque el entrenamiento sigue en curso.
    liveActivityStartedRef.current = false;
    endWorkoutLiveActivity();
  }, []);

  const load = useCallback(
    async (persisted?: PersistedSession | null) => {
      setIsLoading(true);
      setError(false);
      setLoadErrorKind(null);
      try {
        const [data, catalog] = await Promise.all([
          fetchUnifiedWorkout({ programDayAssignmentId, workoutTemplateId, fallbackTitle: mTitle }),
          getMetricsCatalog(),
        ]);
        setMetricsCatalog(catalog);
        let mappedBlocks: SessionBlock[] = data.blocks.map((b) => ({
          id: b.id,
          title: b.title,
          exercises: b.exercises.map((ex) => ({
            ...ex,
            rows: buildInitialRows(ex),
            note: '',
          })),
        }));
        let initialActiveIndex: Record<number, number> = {};
        if (persisted?.blocks?.length) {
          mappedBlocks = mergePersistedBlocks(mappedBlocks, persisted.blocks);
          initialActiveIndex = persisted.activeIndexByBlock || {};
        }
        setBlocks(mappedBlocks);
        setActiveIndexByBlock(initialActiveIndex);
        setPageIndex(0);
      } catch (e: any) {
        const status = e?.response?.status;
        const gone = status === 404 || status === 403;
        setLoadErrorKind(gone ? 'gone' : 'network');
        // Si era la sesión minimizada, deja de estarlo: si no, la barra
        // flotante seguiría llevando aquí para siempre y bloquearía empezar
        // cualquier otro entrenamiento.
        if (gone) discardActiveWorkoutSession(identityKey).catch(() => {});
        setError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [programDayAssignmentId, workoutTemplateId, mTitle, identityKey]
  );

  // Punto 4: al entrar en esta pantalla, mira si ya habia una sesion sin
  // guardar pendiente para este MISMO workout (mismo identityKey) guardada
  // en AsyncStorage -- si la hay, retoma su timestamp real de inicio (asi
  // la duracion sigue contando desde ahi, sin limite de dias) y fusiona las
  // series/notas que ya se habian rellenado. Si no hay nada o es de otro
  // workout distinto, arranca en limpio con startedAt = ahora.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Guard "no empezar un workout si ya hay uno empezado": si la sesión
      // activa global es de OTRO workout (identityKey distinto), se bloquea
      // aquí mismo, antes de tocar AsyncStorage o llamar a load() -- nunca
      // llega a pisar/mezclar el progreso del que ya estaba en curso.
      const active = getActiveWorkoutSession();
      if (active && identityKey && active.identityKey !== identityKey) {
        if (!cancelled) {
          setConflictingSession(active);
          setIsLoading(false);
        }
        return;
      }

      let persisted: PersistedSession | null = null;
      if (identityKey) {
        try {
          const raw = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
          if (raw) {
            const parsed: PersistedSession = JSON.parse(raw);
            if (parsed.identityKey === identityKey) persisted = parsed;
          }
        } catch {}
      }
      if (cancelled) return;
      const startedAt = persisted?.startedAt ?? Date.now();
      setSessionStartedAt(startedAt);
      setNowTick(Date.now());
      persistedRef.current = persisted;
      syncedExerciseKeysRef.current = seedSyncedKeys(persisted);
      load(persisted);
    })();
    return () => {
      cancelled = true;
    };
    // Al montar y cada vez que la pantalla de conflicto pide rearrancar
    // (bootSeq) -- identityKey/load ya son los del nuevo objetivo en ese
    // render (sessionTarget se fija en el mismo lote que bootSeq).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootSeq]);

  // Rearranca esta misma instancia (sale del modo conflicto) para el
  // entrenamiento indicado -- null = el de route.params.
  const rebootAs = useCallback(
    (target: { programDayAssignmentId?: number; workoutTemplateId?: number; mTitle?: string } | null) => {
      setSessionTarget(target);
      setConflictingSession(null);
      setIsLoading(true);
      setBootSeq((n) => n + 1);
    },
    []
  );

  // Bug real (2026-09-24, captura de iPhone): en la pantalla de conflicto
  // tocar la barra flotante del entrenamiento en curso no hacía nada. La
  // barra navega a 'MigratedWorkoutSession' con los params del en curso, y
  // en React Navigation 7 navigate() a una ruta con el MISMO nombre que la
  // actual solo actualiza sus params (StackRouter: "If the route matches
  // the current one, then navigate to it") -- no se monta otra instancia,
  // y esta seguía en modo conflicto porque el arranque solo corría al
  // montar. Ahora, si cambian los params mientras se muestra el conflicto,
  // se rearranca con ellos.
  // (Patrón de React "ajustar estado cuando cambia una prop", durante el
  // render y con guarda, en vez de un efecto.)
  const routeIdentity = `${route?.params?.programDayAssignmentId ?? ''}|${route?.params?.workoutTemplateId ?? ''}`;
  const [prevRouteIdentity, setPrevRouteIdentity] = useState(routeIdentity);
  if (prevRouteIdentity !== routeIdentity) {
    setPrevRouteIdentity(routeIdentity);
    if (conflictingSession) rebootAs(null);
  }

  // Persiste la sesion en curso (debounced) cada vez que cambia algo
  // relevante -- asi si la app se mata sin previo aviso (no hay evento
  // fiable "voy a cerrar" en RN), lo ultimo escrito en AsyncStorage sigue
  // siendo una version reciente de la sesion real.
  useEffect(() => {
    if (isLoading || !identityKey || blocks.length === 0) return;
    const payload: PersistedSession = {
      identityKey,
      startedAt: sessionStartedAt,
      blocks,
      activeIndexByBlock,
      mTitle,
      syncedExerciseKeys: Array.from(syncedExerciseKeysRef.current),
    };
    const t = setTimeout(() => {
      AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
    }, 400);
    let completedSets = 0;
    let totalSets = 0;
    blocks.forEach((b) =>
      b.exercises.forEach((ex) =>
        ex.rows.forEach((r) => {
          totalSets += 1;
          if (r.completed) completedSets += 1;
        })
      )
    );
    updateActiveWorkoutSession({
      identityKey,
      programDayAssignmentId,
      workoutTemplateId,
      mTitle,
      startedAt: sessionStartedAt,
      completedSets,
      totalSets,
    });
    return () => clearTimeout(t);
  }, [isLoading, identityKey, blocks, activeIndexByBlock, sessionStartedAt, mTitle, programDayAssignmentId, workoutTemplateId]);

  // La barra flotante global (WorkoutMinimizedBar, montada en App.tsx) solo
  // debe verse cuando esta pantalla NO esta en primer plano -- aqui es
  // donde ya se ve la sesion en vivo. Cualquier forma de salir (boton
  // minimizar, gesto de swipe-back, boton fisico Atras) desmonta esta
  // pantalla y dispara este cleanup por igual, asi que no hace falta
  // repetir la llamada en cada handler de salida por separado.
  // Si esta pantalla esta bloqueada por conflictingSession (punto e), NO se
  // toca el estado global de minimizado -- esta instancia no es la sesion
  // activa real, y ocultar la barra aqui la dejaria sin forma de volver a
  // la sesion que SI esta en curso (justo el bug del punto d: "el
  // minimizador desaparece").
  useEffect(() => {
    if (conflictingSession) return;
    setWorkoutSessionMinimized(false);
    return () => setWorkoutSessionMinimized(true);
  }, [conflictingSession]);

  const metricLabel = useCallback(
    (key: string) => {
      const m = metricsCatalog.find((c) => c.key === key);
      if (!m) return key;
      return m.unit ? `${m.label} (${m.unit})` : m.label;
    },
    [metricsCatalog]
  );

  const metricInputType = useCallback(
    (key: string): 'number' | 'text' | 'time' => {
      const m = metricsCatalog.find((c) => c.key === key);
      return (m?.input_type as any) || 'number';
    },
    [metricsCatalog]
  );

  const allExercises = useMemo(() => blocks.flatMap((b) => b.exercises), [blocks]);

  // Orden plano de {blockIdx, exIdx} (mismo criterio de iteración que
  // allExercises, así que ambos quedan siempre alineados índice a índice) --
  // usado solo por el reproductor a pantalla completa (WorkoutExercisePlayer)
  // para "ejercicio anterior"/"siguiente ejercicio", que necesita moverse
  // entre bloques, no solo dentro de uno.
  const flatPositions = useMemo(
    () => blocks.flatMap((b, bIdx) => b.exercises.map((_, eIdx) => ({ blockIdx: bIdx, exIdx: eIdx }))),
    [blocks]
  );
  const playerFlatIdx = playerTarget
    ? flatPositions.findIndex((p) => p.blockIdx === playerTarget.blockIdx && p.exIdx === playerTarget.exIdx)
    : -1;
  const canGoToPreviousExercise = playerFlatIdx > 0;
  const canGoToNextExercise = playerFlatIdx !== -1 && playerFlatIdx < flatPositions.length - 1;
  const playerEx = playerTarget ? blocks[playerTarget.blockIdx]?.exercises[playerTarget.exIdx] : null;
  const notesEx = notesTarget ? blocks[notesTarget.blockIdx]?.exercises[notesTarget.exIdx] : null;

  // Mueve el reproductor a pantalla completa al ejercicio anterior/siguiente
  // (delta -1/+1) -- actualiza activeIndexByBlock y, si el ejercicio cae en
  // OTRO bloque, desplaza también el pager horizontal de fondo, para que al
  // cerrar el reproductor el acordeón de debajo ya esté en el ejercicio
  // correcto (misma actualización que hace tocar una fila colapsada).
  const goToRelativeExercise = (delta: number) => {
    if (playerFlatIdx === -1) return;
    const pos = flatPositions[playerFlatIdx + delta];
    if (!pos) return;
    setActiveIndexByBlock((prev) => ({ ...prev, [pos.blockIdx]: pos.exIdx }));
    if (pos.blockIdx !== playerTarget?.blockIdx) goToPage(pos.blockIdx);
    fetchLoadSuggestion(blocks[pos.blockIdx].exercises[pos.exIdx]);
    setPlayerTarget(pos);
  };

  const volumeKg = useMemo(() => {
    let total = 0;
    allExercises.forEach((ex) => {
      ex.rows.forEach((row) => {
        if (!row.completed) return;
        const carga = parseFloat(row.values.carga);
        const reps = parseFloat(row.values.reps);
        if (!isNaN(carga) && !isNaN(reps)) total += carga * reps;
      });
    });
    return Math.round(total);
  }, [allExercises]);

  // Sets planos {exercise_id, weight, reps} de todas las series completadas
  // de la sesion - se envian tal cual a muscleVolumeApi.compute() en la
  // pantalla de resumen, sin depender de que ya esten guardadas en BD.
  const muscleVolumeSets = useMemo(() => {
    const sets: { exercise_id: number; weight: number | null; reps: number | null }[] = [];
    allExercises.forEach((ex) => {
      ex.rows.forEach((row) => {
        if (!row.completed) return;
        const carga = parseFloat(row.values.carga);
        const reps = parseFloat(row.values.reps);
        sets.push({
          exercise_id: ex.exerciseId,
          weight: isNaN(carga) ? null : carga,
          reps: isNaN(reps) ? null : reps,
        });
      });
    });
    return sets;
  }, [allExercises]);

  const syncExerciseLog = useCallback(
    (ex: SessionExercise) => {
      const loggedSets = ex.rows.reduce<Record<string, any>[]>((acc, r) => {
        if (!r.completed) return acc;
        const clean: Record<string, any> = {};
        ex.enabledMetrics.forEach((key) => {
          if (r.values[key] == null || r.values[key] === '') return;
          if (key === 'reps' || key === 'carga') {
            // Bug real (2026-09-17): si el cliente marca la serie sin editar
            // el objetivo precargado (ej. reps "12-15"), esto guardaba el
            // rango tal cual como string. MuscleVolumeService::computeVolume
            // (VPS) descarta con is_numeric() cualquier set así -- esa serie
            // desaparecía del todo de Home/Estadísticas (0 volumen, 0
            // series), aunque muscleVolumeSets/volumeKg más abajo en este
            // mismo fichero SÍ la contaban, vía parseFloat truncando el
            // rango a su primer número -- de ahí que el resumen post-entreno
            // mostrase el heatmap bien y Home/Estadísticas no. Mismo
            // parseFloat aquí para que lo persistido coincida con lo que ya
            // se muestra en el resumen.
            const n = parseFloat(r.values[key]);
            if (!isNaN(n)) clean[key] = n;
            return;
          }
          clean[key] = r.values[key];
        });
        acc.push(clean);
        return acc;
      }, []);
      const note = ex.note.trim();
      // Bug real (reportado por el usuario, 2026-08-27): antes se cortaba
      // aquí sin más si no había NINGUNA serie completada -- una nota sola
      // (p.ej. "no tengo esta máquina", justo el caso en que el cliente
      // nunca va a poder marcar ninguna serie de este ejercicio) no llegaba
      // nunca al entrenador. Ahora también se envía si hay nota, aunque
      // logged_sets vaya vacío -- solo se corta de verdad cuando no hay
      // absolutamente nada que guardar.
      //
      // Bug real (2026-09-24): si el cliente desmarcaba TODAS las series de
      // un ejercicio que ya había enviado, se cortaba aquí y el backend se
      // quedaba con la última foto (con series) -- el entrenador veía como
      // hechas series que el cliente había deshecho. Ahora, si ese
      // ejercicio ya tenía series enviadas en esta sesión, se manda
      // logged_sets: [] para que la última foto quede vacía. Los que nunca
      // se enviaron siguen sin generar ninguna petición.
      const syncKey = exerciseSyncKey(ex);
      const wasSynced = syncedExerciseKeysRef.current.has(syncKey);
      if (loggedSets.length === 0 && !note && !wasSynced) return;
      if (loggedSets.length > 0) syncedExerciseKeysRef.current.add(syncKey);
      workoutHistoryApi
        .logCalendarSets({
          workout_template_exercise_id: ex.isAdhoc ? undefined : ex.id,
          exercise_id: ex.isAdhoc ? ex.exerciseId : undefined,
          logged_sets: loggedSets,
          program_day_assignment_id: programDayAssignmentId ?? null,
          notes: note || undefined,
          session_key: buildSessionKey(identityKey, sessionStartedAt),
        })
        .catch(() => {});
    },
    [programDayAssignmentId, identityKey, sessionStartedAt]
  );

  const updateExercise = (
    blockIdx: number,
    exIdx: number,
    updater: (ex: SessionExercise) => SessionExercise
  ) => {
    setBlocks((prev) => {
      const next = [...prev];
      const block = { ...next[blockIdx] };
      const exercisesList = [...block.exercises];
      exercisesList[exIdx] = updater(exercisesList[exIdx]);
      block.exercises = exercisesList;
      next[blockIdx] = block;
      return next;
    });
  };

  const setCellValue = (blockIdx: number, exIdx: number, rowIndex: number, key: string, value: string) => {
    updateExercise(blockIdx, exIdx, (ex) => {
      const rows = [...ex.rows];
      rows[rowIndex] = { ...rows[rowIndex], values: { ...rows[rowIndex].values, [key]: value } };
      return { ...ex, rows };
    });
  };

  const setNoteValue = (blockIdx: number, exIdx: number, note: string) => {
    updateExercise(blockIdx, exIdx, (ex) => ({ ...ex, note }));
  };

  const startRestCountdown = (seconds: number) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestCountdown(seconds);
    setRestEndDate(Date.now() + seconds * 1000);
    restIntervalRef.current = setInterval(() => {
      setRestCountdown((prev) => (prev != null && prev > 1 ? prev - 1 : null));
    }, 1000);
  };

  const dismissRestCountdown = () => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    setRestCountdown(null);
    setRestEndDate(null);
  };

  // fires once when the countdown reaches zero on its own (the ref guard
  // distinguishes that from dismissRestCountdown, which already clears the
  // ref before setting restCountdown to null). Kept out of setRestCountdown's
  // updater above: React may re-invoke that updater, and it must stay pure.
  useEffect(() => {
    if (restCountdown === null && restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
      setRestEndDate(null);
      Vibration.vibrate([0, 400, 200, 400]);
    }
  }, [restCountdown]);

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  // Live Activity: construye el ContentState actual a partir del ejercicio
  // con foco (ver currentFocusRef) -- null si aun no hay bloques cargados.
  // "target" (pedido explícito 2026-08-26, con captura de referencia): la
  // próxima serie por hacer, con sus datos reales (reps/carga/RIR o RPE) --
  // el mismo cálculo sirve para "lo que toca ahora" (sin descansar) y para
  // "lo que viene después del descanso" (descansando), y si el ejercicio
  // actual ya no tiene series pendientes, salta al primer ejercicio
  // siguiente en el orden de la plantilla (isNewExercise).
  const buildLiveActivityState = useCallback((): WorkoutActivityState | null => {
    const { blockIdx, exIdx } = currentFocusRef.current;
    const ex = blocks[blockIdx]?.exercises[exIdx];
    if (!ex) return null;

    const flat: SessionExercise[] = [];
    blocks.forEach((b) => b.exercises.forEach((e) => flat.push(e)));
    const currentFlatIdx = flat.indexOf(ex);
    const exerciseIndex = currentFlatIdx === -1 ? 1 : currentFlatIdx + 1;
    const totalExercises = flat.length || 1;

    let targetEx = ex;
    let targetRowIdx = ex.rows.findIndex((r) => !r.completed);
    let isNewExercise = false;
    if (targetRowIdx === -1 && currentFlatIdx !== -1) {
      const nextEx = flat[currentFlatIdx + 1];
      if (nextEx) {
        targetEx = nextEx;
        targetRowIdx = 0;
        isNewExercise = true;
      }
    }
    const targetRow = targetRowIdx >= 0 ? targetEx.rows[targetRowIdx] : null;
    const cargaUnit = metricsCatalog.find((c) => c.key === 'carga')?.unit;
    const intensityMode = getIntensityMode(targetEx);
    const intensityValue = intensityMode && targetRow ? targetRow.values[intensityMode] : null;

    return {
      exerciseName: ex.title,
      exerciseImageURL: ex.image ?? null,
      exerciseIndex,
      totalExercises,
      setLabel: targetRowIdx >= 0 ? `Serie ${targetRowIdx + 1}/${targetEx.rows.length}` : 'Última serie',
      reps: targetRow?.values.reps || null,
      load: targetRow?.values.carga ? (cargaUnit ? `${targetRow.values.carga} ${cargaUnit}` : targetRow.values.carga) : null,
      intensityLabel: intensityMode ? intensityMode.toUpperCase() : null,
      intensityValue: intensityValue || null,
      isResting: restCountdown != null,
      restEndDate: restCountdown != null ? restEndDate : null,
      nextExerciseName: isNewExercise ? targetEx.title : null,
    };
  }, [blocks, restCountdown, restEndDate, metricsCatalog]);

  // Arranca la Live Activity una sola vez, en cuanto la sesion termina de
  // cargar (real o retomada) -- nunca si conflictingSession bloqueo la
  // pantalla, porque en ese caso blocks nunca llega a poblarse (ver el
  // efecto de carga mas arriba).
  useEffect(() => {
    if (isLoading || blocks.length === 0 || liveActivityStartedRef.current) return;
    const initial = buildLiveActivityState();
    if (!initial) return;
    liveActivityStartedRef.current = true;
    startWorkoutLiveActivity(mTitle || 'Entrenamiento', initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, blocks.length]);

  useEffect(() => {
    if (!liveActivityStartedRef.current) return;
    const state = buildLiveActivityState();
    if (state) updateWorkoutLiveActivity(state);
  }, [buildLiveActivityState]);

  const toggleRowComplete = (blockIdx: number, exIdx: number, rowIndex: number) => {
    currentFocusRef.current = { blockIdx, exIdx };
    const currentEx = blocks[blockIdx].exercises[exIdx];
    const wasCompleted = currentEx.rows[rowIndex].completed;

    // RIR/RPE es obligatorio (uno u otro) al registrar una serie -- igual
    // que reps/carga, no se puede marcar completada sin rellenar. Solo se
    // exige al MARCAR (no al desmarcar), y solo para los campos que este
    // ejercicio realmente tiene habilitados.
    if (!wasCompleted) {
      const targetValues = currentEx.rows[rowIndex].values;
      const intensityMetric = getIntensityMode(currentEx);
      const missing: string[] = [];
      if (currentEx.enabledMetrics.includes('reps') && !targetValues.reps) missing.push('Reps');
      if (currentEx.enabledMetrics.includes('carga') && !targetValues.carga) missing.push('Carga');
      if (!targetValues[intensityMetric]) missing.push(intensityMetric.toUpperCase());

      if (missing.length > 0) {
        hapticLight();
        showToast('Faltan datos para completar la serie', {
          description: missing.join(', '),
          variant: 'warning',
        });
        if (!targetValues[intensityMetric]) {
          setIntensityCheckTarget({ blockIdx, exIdx, rowIndex, metric: intensityMetric });
        }
        return;
      }
    }

    const rows = [...currentEx.rows];
    rows[rowIndex] = { ...rows[rowIndex], completed: !wasCompleted };
    const ex = { ...currentEx, rows };

    // side effects live outside the updater below: setBlocks's updater must
    // stay pure since React may re-invoke it, which would duplicate the
    // network sync and could start overlapping rest timers.
    setBlocks((prev) => {
      const next = [...prev];
      const block = { ...next[blockIdx] };
      const exercisesList = [...block.exercises];
      exercisesList[exIdx] = ex;
      block.exercises = exercisesList;
      next[blockIdx] = block;
      return next;
    });
    syncExerciseLog(ex);
    if (!wasCompleted) {
      reportAction('workout_set_logged');
      hapticLight();
    }
    // Solo al MARCAR (no al desmarcar) y solo si esta serie concreta tiene
    // un valor de descanso real configurado -- sin dato, no se inventa.
    if (!wasCompleted && ex.enabledMetrics.includes('descanso')) {
      const seconds = parseRestSeconds(rows[rowIndex].values.descanso);
      if (seconds != null) startRestCountdown(seconds);
    }
    // El IntensityCheckSheet ya se fuerza a abrir en el guard de arriba
    // cuando falta el dato (RIR/RPE obligatorio) -- si llegamos aquí es
    // porque ya estaba relleno, no hace falta reabrirlo.
  };

  const addRow = (blockIdx: number, exIdx: number) => {
    updateExercise(blockIdx, exIdx, (ex) => {
      const last = ex.rows[ex.rows.length - 1];
      const values = last ? { ...last.values } : {};
      return { ...ex, rows: [...ex.rows, { values, completed: false }] };
    });
  };

  const markAllRows = (blockIdx: number, exIdx: number) => {
    const currentEx = blocks[blockIdx].exercises[exIdx];
    // Replica los datos reales de la 1a serie (reps/carga/RIR ya rellenados
    // a mano por el cliente, ver buildInitialRows -- el RIR ya no llega
    // precargado con el rango del coach) al resto de series antes de
    // marcarlas, para no dejarlas completadas con datos vacíos o el rango
    // objetivo sin sustituir. Pedido explícito 2026-09-17.
    const firstRowValues = currentEx.rows[0]?.values ?? {};
    const ex = {
      ...currentEx,
      rows: currentEx.rows.map((r, i) => ({
        ...r,
        values: i === 0 ? r.values : { ...r.values, ...firstRowValues },
        completed: true,
      })),
    };

    setBlocks((prev) => {
      const next = [...prev];
      const block = { ...next[blockIdx] };
      const exercisesList = [...block.exercises];
      exercisesList[exIdx] = ex;
      block.exercises = exercisesList;
      next[blockIdx] = block;
      return next;
    });
    syncExerciseLog(ex);
    hapticSuccess();
  };

  const openExerciseInfo = (ex: SessionExercise) => {
    navigation?.navigate('MigratedExerciseInfo', {
      mExerciseId: ex.exerciseId,
      mExerciseName: ex.title,
      initialTab: 'analysis',
    });
  };

  // Punto 1: carga bajo demanda (solo para el ejercicio activo/expandido,
  // una vez por exerciseId) la sugerencia PENDIENTE del Motor de
  // Auto-Regulacion para ese ejercicio, si existe. Silenciosa ante
  // cualquier error -- es un dato "extra" sobre el objetivo normal, nunca
  // debe bloquear ni romper la sesion si falla.
  const fetchLoadSuggestion = useCallback(
    (ex: SessionExercise) => {
      const clientId = state.user?.id;
      if (!clientId || requestedSuggestionsRef.current.has(ex.exerciseId)) return;
      requestedSuggestionsRef.current.add(ex.exerciseId);
      loadSuggestionApi
        .getProgressionHistory(ex.exerciseId, clientId)
        .then((res) => {
          const suggestion = pickPendingSuggestion(res.data?.data?.targets);
          if (suggestion) {
            setPendingLoadSuggestions((prev) => ({ ...prev, [ex.exerciseId]: suggestion }));
          }
        })
        .catch(() => {});
    },
    [state.user?.id]
  );

  // Al cargar la sesion (fresca o retomada), pide de una vez la sugerencia
  // del ejercicio que arranca activo/expandido en cada bloque (indice 0 por
  // defecto, o el que se retomo de la sesion persistida).
  useEffect(() => {
    if (isLoading) return;
    blocks.forEach((block, blockIdx) => {
      const activeIdx = activeIndexByBlock[blockIdx] ?? 0;
      const ex = block.exercises[activeIdx];
      if (ex) fetchLoadSuggestion(ex);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, blocks.length]);

  // ─────────────────────── Picker "Añadir ejercicio" ───────────────────────
  const runPickerSearch = useCallback(async (query: string, filters: ExerciseFilters, page: number) => {
    if (page === 1) setPickerLoading(true);
    else setPickerLoadingMore(true);
    try {
      const res = await exercisesApi.getFilteredList({
        title: query.trim() || undefined,
        bodypart_id: filters.bodyPartId ?? undefined,
        equipment_id: filters.equipmentId ?? undefined,
        level_ids: filters.levelId ?? undefined,
        exercise_type: filters.exerciseType ?? undefined,
        page,
        per_page: 20,
      });
      const items = res.data?.data ?? [];
      setPickerResults((prev) => (page === 1 ? items : [...prev, ...items]));
      const totalPages = res.data?.pagination?.totalPages ?? 1;
      pickerIsLastPageRef.current = page >= totalPages;
    } catch (e) {
      if (page === 1) setPickerResults([]);
    } finally {
      setPickerLoading(false);
      setPickerLoadingMore(false);
    }
  }, []);

  const openExercisePicker = () => {
    setPickerQuery('');
    setPickerFilters(EMPTY_EXERCISE_FILTERS);
    pickerPageRef.current = 1;
    pickerIsLastPageRef.current = false;
    setIsPickerVisible(true);
    runPickerSearch('', EMPTY_EXERCISE_FILTERS, 1);
  };

  useEffect(() => {
    if (!isPickerVisible) return;
    const timeout = setTimeout(() => {
      pickerPageRef.current = 1;
      pickerIsLastPageRef.current = false;
      runPickerSearch(pickerQuery, pickerFilters, 1);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerQuery, pickerFilters, isPickerVisible]);

  const onPickerEndReached = () => {
    if (pickerIsLastPageRef.current || pickerLoading || pickerLoadingMore) return;
    const nextPage = pickerPageRef.current + 1;
    pickerPageRef.current = nextPage;
    runPickerSearch(pickerQuery, pickerFilters, nextPage);
  };

  const onAddExercise = useCallback(
    (item: ExerciseItem) => {
      const targetBlockIdx = Math.min(pageIndex, blocks.length - 1);
      const baseExercise: UnifiedExercise = {
        id: -item.id, // synthetic, solo para key de React - no se envia al backend
        exerciseId: item.id,
        title: item.title,
        image: item.exercise_image,
        bodyPartId: item.bodypart_name?.[0]?.id ?? null,
        videoUrl: item.video_url,
        // series: solo define el NÚMERO de filas iniciales (ver
        // buildInitialRows) -- no es una columna de enabledMetrics.
        prescribed: { series: ADHOC_DEFAULT_SERIES },
        enabledMetrics: ADHOC_DEFAULT_METRICS,
        coachNotes: null,
        lastPerformance: null,
        loadSuggestion: null,
        sequence: (blocks[targetBlockIdx]?.exercises.length ?? 0) + 1,
      };
      const newExercise: SessionExercise = {
        ...baseExercise,
        rows: buildInitialRows(baseExercise),
        note: '',
        isAdhoc: true,
      };
      const newIdx = blocks[targetBlockIdx]?.exercises.length ?? 0;
      setBlocks((prev) => {
        const next = [...prev];
        const block = { ...next[targetBlockIdx] };
        block.exercises = [...block.exercises, newExercise];
        next[targetBlockIdx] = block;
        return next;
      });
      setActiveIndexByBlock((prevActive) => ({ ...prevActive, [targetBlockIdx]: newIdx }));
      fetchLoadSuggestion(newExercise);
      setIsPickerVisible(false);
    },
    [pageIndex, blocks, fetchLoadSuggestion]
  );

  const renderPickerResultItem = useCallback(
    ({ item }: { item: ExerciseItem }) => (
      <Pressable className="flex-row items-center py-2.5" onPress={() => onAddExercise(item)}>
        {item.exercise_image ? (
          <Image source={{ uri: item.exercise_image }} contentFit="cover" style={PICKER_RESULT_IMAGE_STYLE} />
        ) : (
          <Box className="rounded-md bg-card" style={PICKER_RESULT_PLACEHOLDER_STYLE} />
        )}
        <Text weight="semibold" className="flex-1 text-foreground" style={PICKER_RESULT_TITLE_STYLE} numberOfLines={2}>
          {item.title}
        </Text>
        <Icon name="add-circle-outline" size={22} className="text-foreground" />
      </Pressable>
    ),
    [onAddExercise]
  );

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPageIndex(idx);
  };

  const goToPage = (idx: number) => {
    pagerRef.current?.scrollToIndex({ index: idx, animated: true });
    setPageIndex(idx);
  };

  const navigateToFeedback = () => {
    // El cliente ya pulso "Finalizar" -> a partir de aqui la sesion pasa a
    // la pantalla de Feedback (que hara el POST real de finishSession), asi
    // que deja de ser una "sesion sin guardar" que haya que retomar.
    clearPersistedSession();
    const exerciseIds = Array.from(new Set(allExercises.map((ex) => ex.exerciseId)));
    // Solo ejercicios con al menos una serie completada, en el orden en que
    // aparecen en la sesion — para la lista de ejercicios del carrusel de
    // resumen (pantallas 4 y 6 de Pantallas_Resumen_Entrenamiento.md).
    const exercisesSummary = allExercises.reduce<{ title: string; sets: number }[]>((acc, ex) => {
      const sets = ex.rows.filter((r) => r.completed).length;
      if (sets > 0) acc.push({ title: ex.title, sets });
      return acc;
    }, []);
    navigation?.navigate('MigratedWorkoutFeedback', {
      programDayAssignmentId,
      workoutTemplateId,
      mTitle,
      durationSeconds: elapsedSeconds,
      volumeKg,
      caloriesBurned: liveCalories,
      exerciseCount: allExercises.length,
      completedSets: allExercises.reduce((sum, ex) => sum + ex.rows.filter((r) => r.completed).length, 0),
      exerciseIds,
      muscleVolumeSets,
      exercisesSummary,
    });
  };

  const onFinish = () => {
    const completedSets = allExercises.reduce((sum, ex) => sum + ex.rows.filter((r) => r.completed).length, 0);
    if (completedSets === 0) {
      setEmptyFinishConfirmVisible(true);
      return;
    }
    navigateToFeedback();
  };

  const onClose = () => {
    // Siempre confirma mientras el entrenamiento está en curso -- antes se
    // saltaba el diálogo si no había ninguna serie marcada (hasAnyProgress),
    // así que cerrar justo al empezar (0 series, cronómetro ya corriendo)
    // salía directo sin preguntar. onConfirm ya hace clearPersistedSession()
    // + goBack(), así que el comportamiento de "sin progreso" no cambia,
    // solo se deja de saltar la confirmación.
    setCloseConfirmVisible(true);
  };

  // Punto 5: "minimizar" -- sale de la pantalla SIN preguntar y SIN borrar
  // la sesion persistida (a diferencia de onClose), porque el entrenamiento
  // sigue activo y retomable: basta con volver a entrar a este mismo
  // workout (mismo programDayAssignmentId/workoutTemplateId) para
  // continuarlo con el tiempo real ya transcurrido y las series ya
  // rellenadas intactas (ver efecto de persistencia/retomado mas arriba).
  const onMinimize = () => {
    navigation?.goBack();
  };

  // Punto (a): deslizar hacia abajo desde la zona de cabecera (título +
  // stats + puntos de bloque + fila de añadir ejercicio, ver JSX del
  // return) minimiza el entrenamiento -- misma acción que el botón
  // chevron-down, solo que accesible desde un área mucho más grande que
  // antes. activeOffsetY(15) de un único valor positivo = solo activa con
  // desplazamiento hacia ABAJO mayor a 15px (nunca con gestos hacia arriba,
  // ver docs de react-native-gesture-handler); failOffsetX cede de
  // inmediato ante cualquier intento de gesto horizontal.
  const MINIMIZE_DRAG_THRESHOLD = 90;
  const dragY = useSharedValue(0);
  const minimizeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(15)
        .failOffsetX([-15, 15])
        .onUpdate((e) => {
          if (e.translationY > 0) dragY.value = e.translationY;
        })
        .onEnd((e) => {
          if (e.translationY > MINIMIZE_DRAG_THRESHOLD || e.velocityY > 800) {
            runOnJS(onMinimize)();
          }
          dragY.value = withSpring(0);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  // Conflicto -> "Continuar entrenamiento en curso": esta misma instancia
  // pasa a ser la sesión en curso (lee su sesión guardada y la carga, igual
  // que al abrirla desde la barra). Sin navegar: nada que pueda quedarse a
  // medias entre pestañas/instancias.
  const continueActiveSession = () => {
    const active = getActiveWorkoutSession() ?? conflictingSession;
    if (!active) {
      // Ya no hay nada en curso (se descartó desde la barra): se empieza el
      // que se había abierto.
      rebootAs(null);
      return;
    }
    const [kind, rawId] = String(active.identityKey || '').split(':');
    const parsedId = Number(rawId);
    const hasParsedId = Number.isFinite(parsedId) && parsedId > 0;
    rebootAs({
      programDayAssignmentId:
        active.programDayAssignmentId ?? (kind === 'pda' && hasParsedId ? parsedId : undefined),
      workoutTemplateId: active.workoutTemplateId ?? (kind === 'wt' && hasParsedId ? parsedId : undefined),
      mTitle: active.mTitle,
    });
  };

  // Conflicto -> "Cancelar entrenamiento en curso" (tras el mismo diálogo
  // que "Salir del entrenamiento"): descarta el que estaba en curso
  // (AsyncStorage + barra + Live Activity) y arranca aquí el que se quería
  // empezar, en vez de dejar una pantalla vacía.
  const discardActiveAndStartThis = () => {
    setCloseConfirmVisible(false);
    const activeKey = (getActiveWorkoutSession() ?? conflictingSession)?.identityKey ?? null;
    discardActiveWorkoutSession(activeKey)
      .catch(() => {})
      .finally(() => rebootAs(null));
  };

  // Punto (e): ya hay OTRO workout en curso -- se bloquea el arranque de
  // este por completo (nunca se llegó a llamar load()) y se ofrece
  // continuar con el que ya estaba activo, en vez de arrancar dos sesiones
  // en paralelo.
  if (conflictingSession) {
    // Pantalla de conflicto rehecha (2026-09-24, reportado con captura de
    // iPhone: ningún botón hacía nada). Ya no depende de navegar a otra
    // instancia de esta misma ruta para nada: "Continuar" convierte ESTA
    // instancia en el entrenamiento en curso y "Cancelar entrenamiento en
    // curso" lo descarta y arranca aquí mismo el que se quería empezar.
    return (
      <>
        <WorkoutInProgressConflict
          activeTitle={conflictingSession.mTitle}
          onContinue={continueActiveSession}
          onCancelActive={() => setCloseConfirmVisible(true)}
          onBack={() => navigation?.goBack()}
        />
        <ConfirmDialogMem
          visible={closeConfirmVisible}
          {...EXIT_SESSION_DIALOG}
          destructive
          onCancel={() => setCloseConfirmVisible(false)}
          onConfirm={discardActiveAndStartThis}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      </SafeAreaView>
    );
  }

  if (error || blocks.length === 0) {
    const gone = loadErrorKind === 'gone';
    const empty = !error && blocks.length === 0;
    const confirmDiscard = () =>
      Alert.alert(
        'Descartar entrenamiento',
        'Se cerrará este entrenamiento sin finalizarlo. Las series que ya marcaste siguen guardadas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              discardActiveWorkoutSession(identityKey)
                .catch(() => {})
                .finally(() => navigation?.goBack());
            },
          },
        ]
      );
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <Box
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 }}
        >
          <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Icon name="close" size={26} color={C.textPrimary} />
          </Pressable>
        </Box>
        <Box className="flex-1 items-center justify-center px-8">
          <Icon name={gone ? 'calendar-clear-outline' : 'cloud-offline-outline'} size={44} color={C.warning60} />
          <Heading size="md" className="text-center" style={{ marginTop: 16 }}>
            {gone
              ? 'Este entrenamiento ya no está disponible'
              : empty
                ? 'Este entrenamiento no tiene ejercicios'
                : 'No se pudo cargar el entrenamiento'}
          </Heading>
          <Text muted className="text-center" style={{ marginTop: 8, fontSize: 14 }}>
            {gone
              ? 'Tu entrenador lo ha quitado o cambiado de día en tu calendario. Las series que ya marcaste siguen guardadas.'
              : empty
                ? 'Consulta con tu entrenador o elige otro entrenamiento.'
                : 'Revisa tu conexión e inténtalo de nuevo.'}
          </Text>
          {!gone && !empty && (
            <Button
              radius="pill"
              style={{ marginTop: 24, alignSelf: 'stretch' }}
              onPress={() => load(persistedRef.current)}
            >
              <ButtonText>Reintentar</ButtonText>
            </Button>
          )}
          {gone ? (
            <Button radius="pill" style={{ marginTop: 24, alignSelf: 'stretch' }} onPress={() => navigation?.goBack()}>
              <ButtonText>Volver</ButtonText>
            </Button>
          ) : (
            <Pressable style={{ marginTop: 16 }} onPress={confirmDiscard}>
              <Text style={{ fontSize: 13, color: C.destructive }}>Descartar entrenamiento</Text>
            </Pressable>
          )}
        </Box>
      </SafeAreaView>
    );
  }


  // Extraído para reutilizarse tal cual dentro del reproductor a pantalla
  // completa (WorkoutExercisePlayer, ver Modal más abajo) -- mismo
  // restCountdown/dismissRestCountdown que ya usaba la pantalla principal,
  // no una copia independiente, así que ambas vistas quedan siempre en
  // sincronía sin importar desde cuál se marcó la serie.
  const renderRestCountdownBar = (extraStyle?: object) =>
    restCountdown != null ? (
      <HStack
        space="sm"
        className="items-center justify-between px-5 rounded-md"
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          backgroundColor: C.accentBlack,
          ...extraStyle,
        }}
      >
        <HStack space="sm" className="items-center">
          <Icon name="time-outline" size={18} color={C.accentBlackForeground} />
          <Text weight="bold" style={{ fontSize: 15, color: C.accentBlackForeground }}>
            Descanso: {formatTimer(restCountdown)}
          </Text>
        </HStack>
        <Pressable onPress={dismissRestCountdown} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text weight="semibold" style={{ fontSize: 13, color: C.accentBlackForeground }}>
            Saltar
          </Text>
        </Pressable>
      </HStack>
    ) : null;

  const renderBlockPage = ({ item: block, index: blockIdx }: { item: SessionBlock; index: number }) => {
    const activeExIdx = activeIndexByBlock[blockIdx] ?? 0;
    return (
      <ScrollView
        style={{ width: SCREEN_WIDTH }}
        contentContainerStyle={{ paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        {block.exercises.map((ex, exIdx) =>
          exIdx === activeExIdx ? (
            <Card key={ex.id} variant="elevated" className="mx-4" style={{ marginBottom: 10 }}>
              <HStack className="items-center">
                <Pressable
                  className="flex-1 flex-row items-center"
                  onPress={() => openExerciseInfo(ex)}
                >
                  <ExerciseThumbMem image={ex.image} bodyPartId={ex.bodyPartId} size={56} />
                  <Box className="flex-1" style={{ marginLeft: 12 }}>
                    <Text weight="bold" className="text-foreground" style={{ fontSize: 16 }} numberOfLines={2}>
                      {ex.title}
                    </Text>
                    <Text muted style={{ fontSize: 13, marginTop: 4 }}>
                      {formatPrescribedSubtitle(ex.prescribed)}
                    </Text>
                  </Box>
                </Pressable>
                {/* Nota para el entrenador (pedido explícito 2026-08-27):
                    sustituye el TextInput que antes vivía siempre visible
                    aquí debajo -- ahora es un diálogo aparte (ver
                    WorkoutNoteSheet más abajo en el JSX), a la izquierda del
                    icono de reportar dolor. Un puntito naranja marca si ya
                    hay una nota escrita, para no tener que abrir el diálogo
                    solo para comprobarlo. */}
                <Pressable
                  className="p-1"
                  style={{ marginLeft: 8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setNotesTarget({ blockIdx, exIdx })}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir nota para tu entrenador"
                >
                  <Box>
                    <Icon name="chatbox-ellipses-outline" size={20} className="text-muted-foreground" />
                    {!!ex.note?.trim() && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: -1,
                          right: -1,
                          width: 7,
                          height: 7,
                          borderRadius: 3.5,
                          backgroundColor: C.orange,
                        }}
                      />
                    )}
                  </Box>
                </Pressable>
                <Pressable
                  className="p-1"
                  style={{ marginLeft: 8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setPainReportTarget(ex)}
                  accessibilityRole="button"
                  accessibilityLabel="Reportar dolor"
                >
                  <Icon name="medkit-outline" size={20} className="text-muted-foreground" />
                </Pressable>
                {/* Reproductor a pantalla completa (pedido explícito
                    2026-08-27): sustituye el chevron-up de "plegar" -- con
                    solo un ejercicio activo por bloque a la vez (ver
                    activeIndexByBlock), "plegar sin activar otro" apenas se
                    usaba; el hueco lo ocupa ahora la acción principal de
                    abrir el modo guiado (vídeo + registro serie a serie). */}
                <Pressable
                  className="p-1"
                  style={{ marginLeft: 8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setPlayerTarget({ blockIdx, exIdx })}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir modo guiado del ejercicio"
                >
                  <Icon name="play-circle" size={22} color={C.orange} />
                </Pressable>
              </HStack>

              {ex.coachNotes ? (
                <HStack
                  space="sm"
                  className="items-start rounded-md p-2.5"
                  style={{ marginTop: 14, backgroundColor: C.warning5 }}
                >
                  <Icon name="chatbubble-ellipses-outline" size={14} color={C.warning60} />
                  <Text muted className="flex-1" style={{ fontSize: 12.5, lineHeight: 18 }}>
                    {ex.coachNotes}
                  </Text>
                </HStack>
              ) : null}

              {/* Con muchas métricas (reps, carga, rir, rpe, tempo, descanso...) las
                  columnas a flex:1 se apretaban tanto que las etiquetas de
                  cabecera envolvían a 2 líneas y se solapaban con la fila de
                  inputs de abajo. Ancho fijo por columna + toda la tabla
                  como una única fila horizontalmente scrolleable (en vez de
                  comprimir texto) mantiene # / métricas / ✓ siempre alineados.
                  Orden de columnas fijo vía getDisplayMetrics/sortMetricKeys
                  (series, reps, carga, rir/rpe, descanso) -- pedido
                  explícito 2026-08-26. La columna RIR/RPE es tocable: son
                  la misma "casilla" de intensidad intercambiable
                  (getIntensityMode/toggleIntensityMode), el cliente elige
                  cuál rellenar tocando su título.
                  2026-09-24 (pedido explícito, captura de iPhone): con reps +
                  carga + RIR/RPE + descanso, el check de la derecha quedaba
                  fuera de la pantalla y había que deslizar. Ahora se completa
                  tocando el número de la serie (SetNumberToggle), sin columna
                  de check, y las métricas se reparten el ancho con flex en
                  vez de 72 px fijos: con 4-5 métricas todo cabe y el scroll
                  horizontal deja de hacer falta. Etiquetas de cabecera hasta
                  2 líneas (la cabecera crece, no pisa los inputs). */}
              <Box>
                <Box style={{ marginTop: 16 }}>
                  <HStack style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                    <Text
                      weight="semibold"
                      muted
                      className="text-center"
                      style={{ fontSize: 11, lineHeight: 13, width: SET_NUMBER_COL_WIDTH }}
                    >
                      SERIE
                    </Text>
                    {getDisplayMetrics(ex).map((key) => {
                      const isIntensity = key === 'rir' || key === 'rpe';
                      const label = (
                        <Text
                          weight="semibold"
                          muted={!isIntensity}
                          className="text-center"
                          style={[{ fontSize: 11, lineHeight: 13 }, isIntensity && { color: C.blue }]}
                          numberOfLines={2}
                        >
                          {metricLabel(key)}
                        </Text>
                      );
                      return isIntensity ? (
                        <Pressable
                          key={key}
                          style={{ flex: 1, minWidth: 0, marginHorizontal: 2 }}
                          onPress={() => toggleIntensityMode(ex.exerciseId, key as IntensityMetric)}
                          hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Cambiar entre RIR y RPE (actual: ${key.toUpperCase()})`}
                        >
                          {label}
                        </Pressable>
                      ) : (
                        <Box key={key} style={{ flex: 1, minWidth: 0, marginHorizontal: 2 }}>
                          {label}
                        </Box>
                      );
                    })}
                  </HStack>

                  {ex.rows.map((row, rowIdx) => (
                    <HStack
                      key={rowIdx}
                      className="items-start rounded-sm"
                      style={{
                        marginBottom: 8,
                        paddingVertical: row.completed ? 4 : 0,
                        backgroundColor: row.completed ? C.success5 : 'transparent',
                      }}
                    >
                      {/* items-start (no items-center) en el HStack de arriba
                          -- las celdas de métrica son más altas que el
                          círculo del número porque llevan debajo el texto
                          "Obj: X"; el marginTop de SetNumberToggle lo alinea
                          contra el propio recuadro del input (reportado con
                          captura, 2026-08-26). El número ES el botón de
                          completar (2026-09-24) -- el TutorialTarget del
                          paso "Marca una serie como hecha" pasa aquí desde
                          el antiguo check de la derecha. */}
                      {(() => {
                        const toggleBtn = (
                          <SetNumberToggle
                            index={rowIdx}
                            completed={row.completed}
                            onPress={() => toggleRowComplete(blockIdx, exIdx, rowIdx)}
                            C={C}
                          />
                        );
                        // exIdx === 0 añadido (auditoría 2026-08-29): sin
                        // esto, con más de un ejercicio en el bloque 0 este
                        // mismo id se registraba en la fila 0 de CADA
                        // ejercicio de ese bloque (se pisaban entre sí en
                        // targetsRef, ver store/TutorialContext.tsx
                        // registerTarget) -- mismo criterio que ya usa
                        // isTutorialMetric más abajo para las métricas.
                        return blockIdx === 0 && exIdx === 0 && rowIdx === 0 ? (
                          <TutorialTarget id="workout-session-first-set-toggle">{toggleBtn}</TutorialTarget>
                        ) : (
                          toggleBtn
                        );
                      })()}
                      {getDisplayMetrics(ex).map((key) => {
                        // Punto 1 (Motor de Auto-Regulacion de Carga): si hay una
                        // sugerencia PENDIENTE del motor para este ejercicio, esa
                        // es la carga/reps real que hay que usar -- se muestra en
                        // vez del objetivo generico del coach (que sigue siendo el
                        // fallback si no hay sugerencia, comportamiento de siempre).
                        const suggestion = pendingLoadSuggestions[ex.exerciseId];
                        const suggestedValue =
                          key === 'carga' ? suggestion?.weight : key === 'reps' ? suggestion?.reps : null;
                        const hasSuggestion = suggestedValue != null;
                        const target = hasSuggestion ? suggestedValue : ex.prescribed?.[key];
                        // Solo la primera fila del primer ejercicio de la
                        // sesión es el objetivo del tutorial "Registra tu
                        // primera serie" (una explicación por métrica) --
                        // mismo criterio que ya usa el toggle de completar
                        // más abajo (blockIdx===0 && rowIdx===0).
                        const isTutorialMetric =
                          blockIdx === 0 &&
                          exIdx === 0 &&
                          rowIdx === 0 &&
                          ['reps', 'carga', 'descanso', 'rir', 'rpe'].includes(key);
                        // Con TutorialTarget el View wrapper pasa a ser el hijo
                        // directo del HStack: sin flex propio se encogía al
                        // contenido y la 1a serie salía con las celdas
                        // aplastadas (reportado con captura, IPA 2026-09-26;
                        // las series 2+ no llevan wrapper y se veían bien).
                        // El flex/margen vive en el wrapper y la celda lo llena.
                        const cell = (
                          <Box
                            key={key}
                            style={isTutorialMetric ? { width: '100%' } : { flex: 1, minWidth: 0, marginHorizontal: 2 }}
                          >
                            <TextInput
                              className="bg-card rounded-sm text-foreground"
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 2,
                                fontFamily: FONT.regular,
                                fontSize: 13,
                                textAlign: 'center',
                                borderWidth: 1,
                                borderColor: C.border,
                              }}
                              value={row.values[key] ?? ''}
                              onChangeText={(t) => setCellValue(blockIdx, exIdx, rowIdx, key, t)}
                              onFocus={isTutorialMetric ? () => reportAction(`metric_focus_${key}`) : undefined}
                              keyboardType={metricInputType(key) === 'number' ? 'numeric' : 'default'}
                              placeholder="-"
                              placeholderTextColor={C.textSecondary}
                            />
                            {target != null && target !== '' ? (
                              <Text
                                className="text-center"
                                style={{
                                  fontSize: 9.5,
                                  marginTop: 2,
                                  fontFamily: hasSuggestion ? FONT.semiBold : FONT.regular,
                                  color: hasSuggestion ? C.warning60 : C.textSecondary,
                                }}
                                numberOfLines={1}
                              >
                                {hasSuggestion ? `Sugerido: ${target}` : `Obj: ${target}`}
                              </Text>
                            ) : null}
                          </Box>
                        );
                        return isTutorialMetric ? (
                          <TutorialTarget
                            key={key}
                            id={`workout-session-metric-${key}`}
                            style={{ flex: 1, minWidth: 0, marginHorizontal: 2 }}
                          >
                            {cell}
                          </TutorialTarget>
                        ) : (
                          cell
                        );
                      })}
                    </HStack>
                  ))}
                </Box>
              </Box>

              {/* Fila de acciones modernizada (pedido explícito 2026-08-26):
                  "Progreso" abre el análisis histórico de ESTE ejercicio
                  (misma navegación que ya usa el thumbnail/título de arriba,
                  openExerciseInfo -- MigratedExerciseInfo con
                  initialTab:'analysis'), al lado de "Añadir serie" y
                  "Marcar todas" (antes en una fila propia de solo 2 botones,
                  sin icono compartido ni separador). */}
              <HStack
                className="items-center justify-between"
                style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}
              >
                <Pressable
                  className="flex-1 flex-row items-center justify-center"
                  style={{ gap: 5 }}
                  onPress={() => openExerciseInfo(ex)}
                >
                  <Icon name="analytics-outline" size={15} className="text-foreground" />
                  <Text weight="semibold" className="text-foreground" style={{ fontSize: 11 }}>
                    PROGRESO
                  </Text>
                </Pressable>
                <Box style={{ width: 1, height: 18, backgroundColor: C.border }} />
                <Pressable
                  className="flex-1 flex-row items-center justify-center"
                  style={{ gap: 5 }}
                  onPress={() => addRow(blockIdx, exIdx)}
                >
                  <Icon name="add" size={16} className="text-foreground" />
                  <Text weight="semibold" className="text-foreground" style={{ fontSize: 11 }}>
                    AÑADIR SERIE
                  </Text>
                </Pressable>
                <Box style={{ width: 1, height: 18, backgroundColor: C.border }} />
                <Pressable
                  className="flex-1 flex-row items-center justify-center"
                  style={{ gap: 5 }}
                  onPress={() => markAllRows(blockIdx, exIdx)}
                >
                  <Icon name="checkmark-done" size={15} className="text-foreground" />
                  <Text weight="semibold" className="text-foreground" style={{ fontSize: 11 }}>
                    MARCAR TODAS
                  </Text>
                </Pressable>
              </HStack>
            </Card>
          ) : (
            <Pressable
              key={ex.id}
              className="flex-row items-center mx-4 p-3 rounded-lg bg-card"
              style={{ marginBottom: 10 }}
              onPress={() => {
                setActiveIndexByBlock((prev) => ({ ...prev, [blockIdx]: exIdx }));
                fetchLoadSuggestion(ex);
              }}
            >
              <Pressable onPress={() => openExerciseInfo(ex)}>
                <ExerciseThumbMem image={ex.image} bodyPartId={ex.bodyPartId} size={48} />
              </Pressable>
              <Box className="flex-1" style={{ marginLeft: 12 }}>
                <Text weight="semibold" className="text-foreground" style={{ fontSize: 14 }} numberOfLines={2}>
                  {ex.title}
                </Text>
                <Text muted style={{ fontSize: 12, marginTop: 3 }}>
                  {formatPrescribedSubtitle(ex.prescribed)}
                </Text>
              </Box>
              {/* Punto 2: el boton de reportar dolor solo se ve con el
                  acordeon del ejercicio abierto (tarjeta activa, arriba) --
                  aqui, en fila colapsada, se quita. */}
              <Icon name="chevron-down" size={18} className="text-muted-foreground" />
            </Pressable>
          )
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Punto (a) de la nota 2026-08-19: antes solo se podía deslizar para
          minimizar desde el bloque de título — el gesto nativo de "volver
          atrás" del stack lo capta ahí porque es la única zona que no es un
          FlatList/ScrollView (el propio pager horizontal de bloques se
          queda con cualquier gesto sobre el contenido). En vez de pelear
          por la prioridad de gesto contra ese FlatList/las ScrollView
          horizontales de la tabla de métricas (alto riesgo de romper el
          paso entre bloques o el scroll de la tabla), se añade aquí un
          gesto propio de "deslizar hacia ABAJO para minimizar" sobre TODA
          la zona de cabecera (título + stats en vivo + puntos de bloque +
          fila de añadir ejercicio) — mucha más área que antes, sin tocar en
          absoluto el pager ni las listas de ejercicios. */}
      <GestureDetector gesture={minimizeGesture}>
        <Animated.View style={dragStyle}>
          {/* Header */}
          <Box
            className="flex-row items-center justify-between px-5"
            style={{ paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 }}
          >
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Icon name="close" size={26} className="text-foreground" />
            </Pressable>
            <Heading size="sm" className="flex-1 text-center mx-3" numberOfLines={1}>
              {mTitle || 'Entrenamiento'}
            </Heading>
            <Pressable
              onPress={onMinimize}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Minimizar entrenamiento"
            >
              <Icon name="chevron-down-circle-outline" size={24} className="text-muted-foreground" />
            </Pressable>
          </Box>

          {/* Live stats */}
          <HStack className="px-5 py-4">
            <Box className="flex-1 items-center">
              <HStack space="xs" className="items-center">
                <Box className="w-2 h-2 rounded-pill bg-success" />
                <Text weight="bold" className="text-foreground" style={{ fontSize: 17 }}>
                  {formatTimer(elapsedSeconds)}
                </Text>
              </HStack>
              <Text muted style={{ fontSize: 12, marginTop: 4 }}>
                Duración
              </Text>
            </Box>
            <Box className="flex-1 items-center">
              <Text weight="bold" className="text-foreground" style={{ fontSize: 17 }}>
                {liveCalories}
              </Text>
              <Text muted style={{ fontSize: 12, marginTop: 4 }}>
                Calorías (est.)
              </Text>
            </Box>
            <Box className="flex-1 items-center">
              <Text weight="bold" className="text-foreground" style={{ fontSize: 17 }}>
                {volumeKg}
              </Text>
              <Text muted style={{ fontSize: 12, marginTop: 4 }}>
                Volumen (kg)
              </Text>
            </Box>
          </HStack>

          {/* Block progress dots + count/add row */}
          {blocks.length > 1 && (
            <HStack space="sm" className="justify-center items-center" style={{ marginBottom: 8 }}>
              {blocks.map((b, idx) => (
                <Pressable key={b.id} onPress={() => goToPage(idx)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Box
                    className="rounded-pill"
                    style={{
                      width: idx === pageIndex ? 18 : 7,
                      height: 7,
                      backgroundColor: idx === pageIndex ? C.textPrimary : C.border,
                    }}
                  />
                </Pressable>
              ))}
            </HStack>
          )}

          <HStack space="md" className="items-center justify-between px-5" style={{ marginBottom: 12 }}>
            <Text weight="bold" muted className="flex-1" style={{ fontSize: 13, letterSpacing: 0.5 }} numberOfLines={1}>
              {blocks.length > 1
                ? `${blocks[pageIndex]?.title || `BLOQUE ${pageIndex + 1}`} · ${blocks[pageIndex]?.exercises.length ?? 0} EJERCICIOS`
                : `${allExercises.length} EJERCICIOS`}
            </Text>
            <Pressable onPress={openExercisePicker}>
              <Text weight="semibold" className="text-foreground" style={{ fontSize: 13 }}>
                Añadir ejercicio +
              </Text>
            </Pressable>
          </HStack>
        </Animated.View>
      </GestureDetector>

      {/* Horizontal pager — una página por bloque */}
      <FlatList
        ref={pagerRef}
        data={blocks}
        keyExtractor={(b) => b.id.toString()}
        renderItem={renderBlockPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerScrollEnd}
        style={{ flex: 1 }}
      />

      {/* Countdown de descanso — aparece al completar una serie con
          "descanso" configurado, vibra al llegar a 0. Mismo bloque
          (renderRestCountdownBar) se reutiliza dentro del reproductor a
          pantalla completa -- pedido explícito de que el descanso se vea
          igual ahí que en la pantalla principal. */}
      {renderRestCountdownBar({ marginHorizontal: 20, marginBottom: 10 })}

      {/* Sticky finish button — siempre visible, sin importar el bloque activo */}
      <Box
        className="px-5 border-t border-border"
        style={{ paddingTop: 10, paddingBottom: Math.max(insets.bottom, 14) + 6, backgroundColor: C.bg }}
      >
        <TutorialTarget id="workout-session-finish-button">
          <Button size="lg" radius="pill" onPress={onFinish}>
            <ButtonText style={{ letterSpacing: 0.5 }}>✓ FINALIZAR ENTRENAMIENTO</ButtonText>
          </Button>
        </TutorialTarget>
      </Box>

      <Modal
        visible={isPickerVisible}
        animationType="slide"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        {/* SafeAreaProvider propio dentro del Modal (2026-09-24): un <Modal>
            de RN es una ventana nativa aparte en iOS y el SafeAreaView de
            dentro no recibía los insets del provider raíz -- la cabecera
            quedaba detrás de la hora y la X no se podía pulsar (mismo bug
            reportado en ExercisePickerModal). */}
        <SafeAreaProvider>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}>
          <Box
            className="flex-row items-center justify-between px-5"
            style={{ paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 }}
          >
            <Pressable
              onPress={() => setIsPickerVisible(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Icon name="close" size={26} className="text-foreground" />
            </Pressable>
            <Heading size="sm">Añadir ejercicio</Heading>
            <Box style={{ width: 26 }} />
          </Box>
          <TextInput
            className="mx-5 bg-card rounded-md px-3.5 py-3 text-foreground"
            style={{ fontFamily: FONT.regular, fontSize: 14, marginBottom: 12 }}
            placeholder="Buscar ejercicio..."
            placeholderTextColor={C.textSecondary}
            value={pickerQuery}
            onChangeText={setPickerQuery}
          />
          {/* Filtros: grupo muscular (chips) + equipo / nivel / tipo
              (desplegables) -- ver components/ExerciseFilterBar.tsx. */}
          <ExerciseFilterBar filters={pickerFilters} onChange={setPickerFilters} catalog={pickerCatalog} />
          {pickerLoading ? (
            <Box className="flex-1 items-center justify-center">
              <Spinner size="large" color={C.textPrimary} />
            </Box>
          ) : (
            <FlatList
              data={pickerResults}
              style={{ flex: 1 }}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              onEndReached={onPickerEndReached}
              onEndReachedThreshold={0.4}
              ItemSeparatorComponent={Divider}
              ListEmptyComponent={
                <Text muted className="text-center" style={{ fontSize: 15 }}>
                  No se encontraron ejercicios.
                </Text>
              }
              ListFooterComponent={
                pickerLoadingMore ? (
                  <Spinner size="small" color={C.textPrimary} style={{ marginVertical: 16 }} />
                ) : null
              }
              renderItem={renderPickerResultItem}
            />
          )}
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* Modo guiado a pantalla completa (pedido explícito 2026-08-27) --
          desmontado del todo (no solo visible=false) al cerrarse, para que
          useVideoPlayer libere el recurso nativo en vez de seguir
          decodificando en segundo plano.
          Vista normal superpuesta, NO <Modal> (cambiado, reportado con
          captura: al marcar una serie o pasar de ejercicio con Anterior/
          Siguiente dentro del modo guiado, el cambio se aplicaba de verdad
          -- se veía bien al volver a la pantalla principal -- pero no se
          repintaba AQUÍ hasta salir y reabrir). <Modal> monta su contenido
          en una superficie/surface nativa aparte de la pantalla que lo
          abre; en New Architecture (Fabric, siempre activa desde RN 0.76,
          ver package.json) esa superficie no siempre recibe a tiempo los
          commits de una actualización de estado que se origina fuera de
          ella, aunque el estado en sí sea correcto -- de ahí que la
          pantalla principal (que SÍ vive en la superficie normal) mostrase
          el dato bien y este modo guiado no. Una View absoluta normal vive
          en la MISMA superficie que el resto de la pantalla, así que se
          repinta en el mismo commit que cualquier otro estado de este
          componente -- sin ambigüedad posible. A cambio hay que reponer a
          mano dos cosas que <Modal> daba gratis: el slide de entrada (ver
          enterY en WorkoutExercisePlayer) y el botón físico Atrás de
          Android (ver el listener de BackHandler ahí mismo). */}
      {playerTarget && playerEx && (
        <View style={StyleSheet.absoluteFill}>
          <WorkoutExercisePlayer
            ex={playerEx}
            exercisePositionLabel={`Ejercicio ${playerFlatIdx + 1} de ${flatPositions.length}`}
            positionIndex={playerFlatIdx}
            totalCount={flatPositions.length}
            elapsedSeconds={elapsedSeconds}
            displayMetrics={getDisplayMetrics(playerEx)}
            metricLabel={metricLabel}
            metricInputType={metricInputType}
            intensityMode={getIntensityMode(playerEx)}
            onToggleIntensityMode={() => {
              const mode = getIntensityMode(playerEx);
              if (mode) toggleIntensityMode(playerEx.exerciseId, mode);
            }}
            suggestion={pendingLoadSuggestions[playerEx.exerciseId]}
            onChangeCell={(rowIndex, key, value) =>
              setCellValue(playerTarget.blockIdx, playerTarget.exIdx, rowIndex, key, value)
            }
            onToggleRowComplete={(rowIndex) => toggleRowComplete(playerTarget.blockIdx, playerTarget.exIdx, rowIndex)}
            onAddRow={() => addRow(playerTarget.blockIdx, playerTarget.exIdx)}
            onMarkAllRows={() => markAllRows(playerTarget.blockIdx, playerTarget.exIdx)}
            onOpenProgress={() => openExerciseInfo(playerEx)}
            onOpenNotes={() => setNotesTarget({ blockIdx: playerTarget.blockIdx, exIdx: playerTarget.exIdx })}
            onOpenPainReport={() => setPainReportTarget(playerEx)}
            onClose={() => setPlayerTarget(null)}
            onBack={() => goToRelativeExercise(-1)}
            onNext={() => goToRelativeExercise(1)}
            canGoBack={canGoToPreviousExercise}
            canGoNext={canGoToNextExercise}
            restBar={renderRestCountdownBar()}
          />
        </View>
      )}

      <ConfirmDialogMem
        visible={closeConfirmVisible}
        {...EXIT_SESSION_DIALOG}
        destructive
        onCancel={() => setCloseConfirmVisible(false)}
        onConfirm={() => {
          setCloseConfirmVisible(false);
          clearPersistedSession();
          navigation?.goBack();
        }}
      />

      <ConfirmDialogMem
        visible={emptyFinishConfirmVisible}
        icon="alert-circle-outline"
        destructive
        title="No has registrado ninguna serie"
        message="¿Seguro que quieres finalizar el entrenamiento sin apuntar ningún dato?"
        confirmText="Finalizar igualmente"
        cancelText="Seguir entrenando"
        onCancel={() => setEmptyFinishConfirmVisible(false)}
        onConfirm={() => {
          setEmptyFinishConfirmVisible(false);
          navigateToFeedback();
        }}
      />

      <PainReportSheet
        visible={!!painReportTarget}
        onClose={() => setPainReportTarget(null)}
        sessionId={painReportSessionId}
        isWorkoutTemplate={painReportIsWorkoutTemplate}
        exerciseId={painReportTarget?.exerciseId ?? 0}
        exerciseTitle={painReportTarget?.title}
      />

      <WorkoutNoteSheet
        visible={!!notesTarget}
        onClose={() => setNotesTarget(null)}
        exerciseTitle={notesEx?.title}
        value={notesEx?.note ?? ''}
        onSave={(note) => {
          if (!notesTarget || !notesEx) return;
          setNoteValue(notesTarget.blockIdx, notesTarget.exIdx, note);
          syncExerciseLog({ ...notesEx, note });
        }}
      />

      <IntensityCheckSheet
        visible={!!intensityCheckTarget}
        metric={intensityCheckTarget?.metric ?? 'rir'}
        onClose={() => setIntensityCheckTarget(null)}
        onRegister={(value) => {
          if (!intensityCheckTarget) return;
          setCellValue(
            intensityCheckTarget.blockIdx,
            intensityCheckTarget.exIdx,
            intensityCheckTarget.rowIndex,
            intensityCheckTarget.metric,
            value
          );
          setIntensityCheckTarget(null);
        }}
        setLabel={(() => {
          if (!intensityCheckTarget) return '';
          const row = blocks[intensityCheckTarget.blockIdx]?.exercises[intensityCheckTarget.exIdx]?.rows[intensityCheckTarget.rowIndex];
          const reps = row?.values.reps || '-';
          const carga = row?.values.carga || '-';
          return `#${intensityCheckTarget.rowIndex + 1} Set: ${reps} x ${carga} kg`;
        })()}
      />
    </SafeAreaView>
  );
}
