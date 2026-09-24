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
  // 'coach_calendar' (2026-09-24) = el calendario personal del cliente
  // cuando el entrenador le ha asignado sesiones sueltas esta semana
  // ("Plan de tu entrenador"; num_weeks/current_week = 0, end_date null, y
  // los contadores excluyen los entrenamientos creados por el cliente).
  // Sin `kind` (backend anterior) = 'program'.
  kind?: 'program' | 'coach_calendar';
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

// Detalle de un entrenamiento personalizado para editarlo (2026-09-24,
// backend: GET v1/my-custom-workout-detail). `prescribed` son strings tal
// cual se guardaron; trae `rir` o `rpe`, nunca los dos.
export interface CustomWorkoutDetailExercise {
  exercise_id: number;
  title: string;
  image: string | null;
  prescribed: Partial<Record<'series' | CustomWorkoutMetricKey, string>>;
  enabled_metrics: string[];
  notes: string | null;
}

export interface CustomWorkoutDetail {
  assignment_id: number;
  date: string; // YYYY-MM-DD
  title: string;
  is_repeating: boolean;
  is_completed: boolean;
  blocks: { title: string; exercises: CustomWorkoutDetailExercise[] }[];
}

export interface UpdateCustomWorkoutPayload {
  program_day_assignment_id: number;
  // 'following' = este día y las siguientes repeticiones semanales.
  scope: 'single' | 'following';
  title: string;
  blocks: CustomWorkoutBlockPayload[];
}

// Fecha LOCAL del dispositivo en YYYY-MM-DD (no toISOString(), que da la
// fecha UTC y de madrugada/noche puede ser el día anterior/siguiente).
export function localTodayYmd(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
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

  getDetail: (programDayAssignmentId: number) =>
    apiClient.get<{ data: CustomWorkoutDetail }>('v1/my-custom-workout-detail', {
      params: { program_day_assignment_id: programDayAssignmentId },
    }),

  // Mismo timeout largo que create: con scope 'following' puede reescribir
  // muchas repeticiones semanales.
  update: (payload: UpdateCustomWorkoutPayload) =>
    apiClient.post<{ message: string; data: { updated: number; skipped_completed: number } }>(
      'v1/my-custom-workouts-update',
      payload,
      { timeout: 60000 }
    ),

  // `today` = fecha local del dispositivo (2026-09-24): el backend calcula
  // "esta semana" y la semana actual del programa con ella en vez de con su
  // propia zona horaria. Backends anteriores ignoran el parámetro.
  getActivePrograms: () =>
    apiClient.get<{ data: ActiveProgram[] }>('v1/my-active-programs', {
      params: { today: localTodayYmd() },
    }),
};
