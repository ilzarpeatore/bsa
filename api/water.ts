import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface WaterGoalItem {
  id: number;
  // BUG REAL (encontrado 2026-09-26 al reconstruir water_tracker_screen.tsx):
  // este campo se llamaba `goal_ml` aquí, pero `DailyWaterGoal::$fillable` en
  // el backend (Bckbs) solo acepta `value`/`goal_value`/`date`/`time`/`user_id`
  // -- `goal_ml` no es un campo real ni de la tabla ni del $fillable, así que
  // `saveGoal` lo enviaba y Eloquent lo descartaba en silencio (mass
  // assignment) sin guardar el objetivo. `DailyWaterGoalResource` (lo que de
  // verdad devuelve `user-daily-water-goal-list`) tampoco expone nunca
  // `goal_ml`, solo `value` -- por eso `getGoalList` leía siempre `undefined`.
  // Mismo campo que ya usa correctamente `stepsApi` (ver api/steps.ts).
  value: number;
  date: string;
  time: string | null;
  created_at: string;
  updated_at: string;
}

// Respuesta real de `v1/user-daily-water-goal-list` (ver
// UserDailyGoalController::getV1DailyWaterGoalList en Bckbs): una fila por
// día ya resuelta (MAX(id) de ese día), con el objetivo vigente ese día
// (`today_goal`) y el consumo acumulado registrado ese día (`value`). No
// lleva `id` ni `unit` -- antes este tipo copiaba la forma de WaterGoalItem,
// que no es la que este endpoint realmente devuelve.
export interface WaterGoalDaySummary {
  today_goal: number;
  value: number;
  date: string;
}

// Registro real de consumo (Guideline 2.2, 2026-09-10: water_tracker_screen.tsx
// solo tenía UI, sin ninguna llamada real detrás -- "Registrar ahora" no
// guardaba nada). Usa el mismo mecanismo genérico de histórico que ya usa el
// backend para step_track/weight_track (ver UserGraphController::saveGraphData):
// cada registro crea una fila nueva con el total ACUMULADO del día (no un
// delta), la última fila por fecha es el valor vigente. `created_at` (con
// hora real) es lo único que sirve para reconstruir un historial de tomas
// del día -- `date` en user_graphs es solo la fecha (columna DATE, sin hora).
export interface WaterLogEntry {
  id: number;
  value: number | string;
  type: string;
  date: string;
  unit: string | null;
  created_at: string;
}

export const waterApi = {
  saveGoal: (value: number, date: string) =>
    apiClient.post<ApiMessageResponse>('user-daily-water-goal-save', { value, date }),

  getGoalList: (date?: string) =>
    apiClient.get<{ data: WaterGoalItem[] }>('user-daily-water-goal-list', {
      params: date ? { date } : undefined,
    }),

  // `filter` -- 'week' | 'month' | 'year' | 'every' (ver DailyWaterGoal::scopeFilter).
  getGoalListV1: (filter: 'week' | 'month' | 'year' | 'every' = 'week') =>
    apiClient.get<{ data: WaterGoalDaySummary[] }>('v1/user-daily-water-goal-list', {
      params: { filter },
    }),

  logIntake: (value_ml: number, date: string) =>
    apiClient.post<ApiMessageResponse>('usergraph-save', { type: 'water_track', value: value_ml, date }),

  getTodayLog: (date: string) =>
    apiClient.get<{ data: WaterLogEntry[] }>('usergraph-list', {
      params: { type: 'water_track', date, per_page: 50, orderby: 'asc' },
    }),
};
