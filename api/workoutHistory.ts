import apiClient from './client';
import { ApiMessageResponse } from './types';
import { WorkoutDayExercise } from './workouts';

export interface WorkoutSet {
  reps: string;
  weight: string;
  time?: string;
}

export interface StoreWorkoutExercisePayload {
  workout_id: number;
  exercise_id: number;
  sets: WorkoutSet[];
  date: string;
  // Sin esto el backend nunca puede devolver la entrada en el historial
  // (get-user-workout-exercise exige workout_day_id no nulo).
  workout_day_id?: number;
}

export interface WorkoutExerciseHistoryItem {
  id: number;
  workout_id: number;
  exercise_id: number;
  date: string;
  sets: WorkoutSet[];
}

export interface WorkoutExerciseHistoryResponse {
  data: WorkoutExerciseHistoryItem[];
  pagination: {
    total_items: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

export interface CalendarMonthWorkout {
  assignment_id: number; // = program_day_assignment_id
  id: number; // = workout_template_id
  title: string | null;
}

export interface CalendarMonthDay {
  date: string;
  in_month: boolean;
  workouts: CalendarMonthWorkout[];
}

export interface CalendarDayExercise {
  id: number; // workout_template_exercise_id
  exercise_id: number;
  title: string | null;
  video_url: string | null;
  exercise_image: string | null;
  body_part_id: number | null;
  sets: Record<string, any>; // prescribed values merged with overrides/progression, e.g. { series: 3, reps: 10, carga: 50 }
  coach_notes: string | null;
  enabled_metrics: string[];
  last_performance: { sets: Record<string, any>[] } | null;
  sequence: number;
}

export interface CalendarDayBlock {
  block_id: number;
  title: string;
  order: number;
  exercises: CalendarDayExercise[];
}

export interface CalendarDayDetail {
  workout_day_id: number; // = program_day_assignment_id
  sequence: number;
  is_rest: number;
  // Semana adaptativa aplicada (2026-08-12): true si el día tenía
  // entrenamiento real pero el motor lo ocultó entero para este cliente —
  // distinto de is_rest (que es a nivel de plantilla compartida por todos
  // los clientes del programa).
  is_adjusted?: boolean;
  blocks: CalendarDayBlock[];
}

/** @deprecated old placeholder shape, kept only so any stale references still typecheck */
export interface CalendarDayItem {
  id: number;
  date: string;
  workout_id: number;
  title: string;
  workout_image: string;
}

export interface CompletedSessionItem {
  id: number;
  program_day_assignment_id: number | null;
  workout_template_id: number | null;
  title: string;
  thumbnail: string | null;
  date: string;
  duration_seconds: number | null;
  volume_kg: number | null;
  calories_burned: number | null;
  difficulty_rating: number | null;
  difficulty_label: string | null;
}

export interface SessionDetailSet {
  set: number;
  weight: number;
  reps: number;
  rpe_rir: string | number | null;
  one_rm: number;
  volume: number;
}

export interface SessionDetailExercise {
  exercise_id: number;
  workout_template_exercise_id: number;
  prescribed: Record<string, any>;
  notes: string | null;
  client_note: string | null;
  title: string | null;
  exercise_image: string | null;
  video_url: string | null;
  enabled_metrics: string[];
  logged: boolean;
  sets: SessionDetailSet[];
  prs_this_session?: number;
  exercise_volume?: number;
}

export interface SessionDetailBlock {
  block_id: number;
  title: string;
  exercises: SessionDetailExercise[];
}

export interface SessionDetail {
  title: string;
  date: string;
  difficulty_label: string | null;
  comment: string | null;
  total_sets: number;
  total_volume: number;
  total_reps: number;
  total_prs: number;
  blocks: SessionDetailBlock[];
}

export const workoutHistoryApi = {
  // Historial real de entrenamientos completados (WorkoutSessionReview,
  // mismo dato que ya ve el coach en "Entrenamientos completados" del panel
  // admin) — reemplaza al histórico get-user-workout-exercise (sistema V1,
  // sin datos reales desde que ese flujo dejó de usarse).
  getMyCompletedSessions: () =>
    apiClient.get<{ data: CompletedSessionItem[] }>('my-completed-sessions'),

  getMySessionDetail: (params: { program_day_assignment_id?: number; workout_template_id?: number; date?: string }) =>
    apiClient.get<{ data: SessionDetail }>('my-session-detail', { params }),

  storeWorkoutExercise: (payload: StoreWorkoutExercisePayload) =>
    apiClient.post<ApiMessageResponse>('v1/store-user-workout-exercise', payload),

  getWorkoutExerciseHistory: (params: {
    workout_id?: number;
    exercise_id?: number;
    page?: number;
  }) =>
    apiClient.get<WorkoutExerciseHistoryResponse>('v1/get-user-workout-exercise', { params }),

  getWorkoutDayExercise: (params: { workout_day_id: number; exercise_id: number }) =>
    apiClient.get<{ data: WorkoutDayExercise[] }>('v1/workoutday-exercise-list', { params }),

  getMyCalendar: (month: number, year: number) =>
    apiClient.get<{ data: { days: CalendarMonthDay[] } }>('v1/my-calendar', { params: { month, year } }),

  getMyCalendarDayDetail: (programDayAssignmentId: number) =>
    apiClient.get<{ data: CalendarDayDetail }>('v1/my-calendar-day-detail', { params: { program_day_assignment_id: programDayAssignmentId } }),

  // Mover entrenamientos ya asignados a otro día DENTRO de la misma semana en
  // curso -- aplicado directamente, sin pasar por aprobación del coach
  // (pedido explícito 2026-08-23: hasta ahora "reorganizar tu semana" solo
  // creaba una propuesta vía adaptiveWeekPlansApi.requestReorder, que el
  // calendario real no reflejaba hasta que el coach la aprobaba -- se quería
  // el cambio al instante). Distinto del flujo adaptive-week-plans, que
  // sigue existiendo tal cual para "marcar días no disponibles".
  // TODO backend (fuera de este repo, ver docs/TAREAS.md): implementar
  // POST v1/my-calendar-move-assignments -- valida que todos los
  // assignment_id pertenezcan al cliente autenticado y que to_date caiga
  // dentro de la misma semana ISO que la fecha actual del assignment, y
  // actualiza ProgramDayAssignment.date directamente (sin AdaptiveWeekPlan).
  moveCalendarAssignments: (moves: { assignmentId: number; toDate: string }[]) =>
    apiClient.post<ApiMessageResponse>('v1/my-calendar-move-assignments', {
      moves: moves.map((m) => ({ assignment_id: m.assignmentId, to_date: m.toDate })),
    }),

  logCalendarSets: (payload: {
    // Uno de los dos es obligatorio: workout_template_exercise_id para
    // ejercicios prescritos por el coach, exercise_id para ejercicios
    // anadidos ad-hoc durante la sesion (sin WorkoutTemplateExercise).
    workout_template_exercise_id?: number;
    exercise_id?: number;
    logged_sets: Record<string, any>[];
    program_day_assignment_id?: number | null;
    notes?: string;
  }) => apiClient.post<ApiMessageResponse>('v1/my-calendar-log-sets', payload),

  finishCalendarSession: (payload: {
    // Uno de los dos es obligatorio: program_day_assignment_id (dia de
    // programa asignado) o workout_template_id (Workout suelto sin programa).
    program_day_assignment_id?: number;
    workout_template_id?: number;
    duration_seconds?: number;
    volume_kg?: number;
    difficulty_rating?: number;
    comment?: string;
    // IDs reales de ejercicio (Exercise.id) tocados en la sesion, solo para
    // que el backend calcule los logros del resumen (cargas/reps/RPE
    // mejorados respecto a la vez anterior) - no se persisten.
    exercise_ids?: number[];
  }) => apiClient.post<{
    data: { calories_burned: number | null; [key: string]: any };
    achievements: {
      weight_up_count: number;
      weight_up_exercises: string[];
      reps_up_count: number;
      reps_up_exercises: string[];
      better_rpe_count: number;
      better_rpe_exercises: string[];
    };
  }>('v1/my-calendar-finish-session', payload),
};
