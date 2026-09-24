import apiClient from './client';

// Entrenamientos personalizados creados por el propio cliente (pedido
// 2026-09-24). El backend (Bckbs::ClientCustomWorkoutController) los guarda
// como un workout_template normal + program_day_assignment en el calendario
// personal del cliente, así que una vez creados se abren/entrenan/registran
// exactamente igual que cualquier otro día del calendario
// (MigratedWorkoutPreview con programDayAssignmentId).

export type CustomWorkoutMetricKey = 'reps' | 'carga' | 'descanso' | 'rir' | 'rpe' | 'tiempo';

export interface CustomWorkoutExercisePayload {
  exercise_id: number;
  // Mismas claves que el prescrito del coach (ver METRIC_DISPLAY_RANK en
  // workout_session_screen.tsx). `series` solo define el nº de filas.
  prescribed: Partial<Record<'series' | CustomWorkoutMetricKey, string>>;
  enabled_metrics: CustomWorkoutMetricKey[];
  notes?: string | null;
}

export interface CustomWorkoutBlockPayload {
  title: string;
  exercises: CustomWorkoutExercisePayload[];
}

export interface CreateCustomWorkoutPayload {
  // Idempotencia: el mismo id en un reintento devuelve lo ya creado en vez
  // de duplicarlo (backend: ClientCustomWorkoutController::store()).
  client_request_id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  repeat_weeks?: number; // 1 = sin repetir
  blocks: CustomWorkoutBlockPayload[];
}

export interface CreatedCustomWorkout {
  series_uuid: string | null;
  assignments: { assignment_id: number; workout_template_id: number; date: string }[];
}

export interface ActiveProgram {
  program_client_assignment_id: number;
  training_program_id: number;
  title: string;
  start_date: string;
  end_date: string | null;
  num_weeks: number;
  current_week: number; // 0 = todavía no ha empezado
  sessions_this_week: number;
  completed_this_week: number;
}

// Id de petición para client_request_id (backend: [A-Za-z0-9_-], máx. 36).
export function newCustomWorkoutRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const customWorkoutsApi = {
  // Timeout propio (60 s en vez de los 15 s globales): repetir un
  // entrenamiento largo durante muchas semanas crea bastantes filas, y un
  // timeout en la app con el servidor todavía guardando llevaba al usuario a
  // pulsar Guardar otra vez (el client_request_id ya evita el duplicado, esto
  // evita además el falso error).
  create: (payload: CreateCustomWorkoutPayload) =>
    apiClient.post<{ message: string; replayed?: boolean; data: CreatedCustomWorkout }>('v1/my-custom-workouts', payload, {
      timeout: 60000,
    }),

  // scope 'following' = esta y las siguientes repeticiones semanales.
  remove: (programDayAssignmentId: number, scope: 'single' | 'following' = 'single') =>
    apiClient.post<{ message: string; data: { deleted: number } }>('v1/my-custom-workouts-delete', {
      program_day_assignment_id: programDayAssignmentId,
      scope,
    }),

  getActivePrograms: () => apiClient.get<{ data: ActiveProgram[] }>('v1/my-active-programs'),
};
