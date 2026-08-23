import { workoutTemplateApi, MetricCatalogItem } from '../../api/workoutTemplate';
import { workoutHistoryApi } from '../../api/workoutHistory';

// Pantallas de Workout (Preview + Sesión en marcha) — lógica compartida
// para normalizar los dos orígenes posibles de un "click en un workout"
// del sistema v2 (WorkoutTemplate/ProgramDayAssignment) en una única
// forma de datos. Ver docs/PANTALLAS WORKOUT.md.

// Imágenes de reserva mientras el backend no manda thumbnail real (coach no
// ha subido foto todavía) — antes esas pantallas se quedaban con un
// degradado/icono vacío, aquí se alterna entre dos fotos de stock ya
// empaquetadas en assets/workout/ para previsualizar cómo quedan cabecera + imagen.
const WORKOUT_FALLBACK_IMAGES = [
  require('../../assets/workout/Workoutimg.png'),
  require('../../assets/workout/Workoutimg2.png'),
];

export function pickWorkoutFallbackImage(seed?: number | null) {
  const n = Math.abs(seed ?? 0);
  return WORKOUT_FALLBACK_IMAGES[n % WORKOUT_FALLBACK_IMAGES.length];
}

export interface UnifiedExercise {
  id: number; // workout_template_exercise_id — clave para log-sets
  exerciseId: number;
  title: string;
  image: string | null;
  /** body_parts.id del musculo principal — heatmap aislado en ExerciseThumb. */
  bodyPartId: number | null;
  videoUrl: string | null;
  prescribed: Record<string, any>;
  enabledMetrics: string[];
  coachNotes: string | null;
  lastPerformance: { sets: Record<string, any>[] } | null;
  sequence: number;
}

export interface UnifiedBlock {
  id: number;
  title: string;
  instructions: string | null;
  exercises: UnifiedExercise[];
}

export interface UnifiedWorkout {
  title: string;
  description: string | null;
  thumbnail: string | null;
  isRest: boolean;
  // Semana adaptativa aplicada (2026-08-12): true si el día tenía
  // entrenamiento real pero se ocultó entero para ESTE cliente por una
  // semana adaptativa aprobada — distinto de isRest.
  isAdjusted: boolean;
  blocks: UnifiedBlock[];
  exerciseCount: number;
  programDayAssignmentId: number | null;
  workoutTemplateId: number | null;
  // Gating de Workouts sueltos (2026-07-30) — solo se rellena cuando viene por
  // workoutTemplateId; el flujo por programDayAssignmentId ya implica que el
  // cliente tiene el programa asignado, siempre accesible.
  isExclusive: boolean;
  isAccessible: boolean;
  // Solo tiene sentido cuando viene por workoutTemplateId (navegacion
  // libre desde el catalogo) - un dia de programa asignado no es "algo"
  // que se guarde en favoritos por si mismo.
  isFavourite: boolean;
}

export interface WorkoutViewParams {
  programDayAssignmentId?: number | null;
  workoutTemplateId?: number | null;
  fallbackTitle?: string;
}

export async function fetchUnifiedWorkout(params: WorkoutViewParams): Promise<UnifiedWorkout> {
  if (params.programDayAssignmentId) {
    const res = await workoutHistoryApi.getMyCalendarDayDetail(params.programDayAssignmentId);
    const data = res.data.data;
    const blocks: UnifiedBlock[] = (data.blocks ?? []).map((b) => ({
      id: b.block_id,
      title: b.title,
      instructions: null,
      exercises: (b.exercises ?? []).map((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        title: e.title || 'Ejercicio',
        image: e.exercise_image,
        bodyPartId: e.body_part_id ?? null,
        videoUrl: e.video_url,
        prescribed: e.sets || {},
        enabledMetrics: e.enabled_metrics || [],
        coachNotes: e.coach_notes,
        lastPerformance: e.last_performance,
        sequence: e.sequence,
      })),
    }));

    return {
      title: params.fallbackTitle || 'Entrenamiento',
      description: null,
      thumbnail: null,
      isRest: data.is_rest === 1,
      isAdjusted: !!data.is_adjusted,
      blocks,
      exerciseCount: blocks.reduce((sum, b) => sum + b.exercises.length, 0),
      programDayAssignmentId: params.programDayAssignmentId,
      workoutTemplateId: null,
      isExclusive: false,
      isAccessible: true,
      isFavourite: false,
    };
  }

  if (params.workoutTemplateId) {
    const res = await workoutTemplateApi.getClientDetail(params.workoutTemplateId);
    const data = res.data.data;
    const blocks: UnifiedBlock[] = (data.blocks ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      instructions: b.instructions,
      exercises: (b.exercises ?? []).map((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        title: e.title || e.exercise?.title || 'Ejercicio',
        image: e.exercise_image,
        bodyPartId: e.body_part_id ?? null,
        videoUrl: e.video_url,
        prescribed: e.prescribed || {},
        enabledMetrics: e.enabled_metrics || [],
        coachNotes: e.notes,
        lastPerformance: e.last_performance ?? null,
        sequence: e.sequence,
      })),
    }));

    return {
      title: data.title || params.fallbackTitle || 'Entrenamiento',
      description: data.description,
      thumbnail: data.thumbnail,
      isRest: false,
      isAdjusted: false,
      blocks,
      exerciseCount: blocks.reduce((sum, b) => sum + b.exercises.length, 0),
      programDayAssignmentId: null,
      workoutTemplateId: params.workoutTemplateId,
      isExclusive: !!data.is_exclusive,
      isAccessible: data.is_accessible ?? true,
      isFavourite: !!data.is_favourite,
    };
  }

  throw new Error('fetchUnifiedWorkout: falta programDayAssignmentId o workoutTemplateId');
}

/** Subtítulo "{sets} series de {reps} reps" — adaptativo según qué claves prescritas existan realmente. */
export function formatPrescribedSubtitle(prescribed: Record<string, any>): string {
  const series = prescribed?.series;
  const reps = prescribed?.reps;
  const tiempo = prescribed?.tiempo;

  const seriesText = series != null ? `${series} series` : null;

  if (reps != null) {
    return seriesText ? `${seriesText} de ${reps} reps` : `${reps} reps`;
  }
  if (tiempo != null) {
    return seriesText ? `${seriesText} de ${tiempo}s` : `${tiempo}s`;
  }
  return seriesText || '';
}

let metricsCatalogCache: MetricCatalogItem[] | null = null;
let metricsCatalogPromise: Promise<MetricCatalogItem[]> | null = null;

/** Catálogo de métricas (label/unit/input_type por key), cacheado en memoria durante la sesión. */
export async function getMetricsCatalog(): Promise<MetricCatalogItem[]> {
  if (metricsCatalogCache) return metricsCatalogCache;
  if (!metricsCatalogPromise) {
    metricsCatalogPromise = workoutTemplateApi
      .getMetricsCatalog()
      .then((res) => {
        metricsCatalogCache = res.data.data || [];
        return metricsCatalogCache;
      })
      .catch(() => {
        metricsCatalogPromise = null;
        return [];
      });
  }
  return metricsCatalogPromise;
}
