import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface StepsGoalItem {
  id: number;
  value: number;
  date: string;
  time: string | null;
  created_at: string;
  updated_at: string;
}

// Respuesta real de `v1/user-daily-steps-goal-list` (ver
// UserDailyGoalController::getV1DailyStepGoalList en Bckbs): una fila por
// día ya resuelta (MAX(id) de ese día), con el objetivo vigente ese día
// (`today_goal`) y los pasos acumulados registrados ese día (`value`). No
// lleva `id` -- este tipo antes copiaba una forma que este endpoint no
// devuelve (ver mismo fix en api/water.ts, WaterGoalDaySummary).
export interface StepsGoalDaySummary {
  today_goal: number;
  value: number;
  date: string;
}

// Registro manual real de pasos (Guideline 2.2, 2026-09-10:
// activity_tracker_screen.tsx mostraba datos 100% inventados en el layout --
// "6,842" pasos, gráfica semanal y lista de actividades fijas en el código,
// sin ningún estado ni llamada a la API). Mismo mecanismo genérico de
// histórico que water_track (ver UserGraphController::saveGraphData): cada
// registro crea una fila nueva con el total ACUMULADO del día, la última
// fila por fecha es el valor vigente. `created_at` (con hora real) es lo
// único que sirve para reconstruir un historial de registros del día --
// `date` en user_graphs es solo la fecha (columna DATE, sin hora).
export interface StepsLogEntry {
  id: number;
  value: number | string;
  type: string;
  date: string;
  unit: string | null;
  created_at: string;
}

export const stepsApi = {
  saveGoal: (value: number, date: string) =>
    apiClient.post<ApiMessageResponse>('user-daily-steps-goal-save', { value, date }),

  getGoalList: (date?: string) =>
    apiClient.get<{ data: StepsGoalItem[] }>('user-daily-steps-goal-list', {
      params: date ? { date } : undefined,
    }),

  // `filter` -- 'week' | 'month' | 'year' | 'every' (ver DailyStepsGoal::scopeFilter).
  getGoalListV1: (filter: 'week' | 'month' | 'year' | 'every' = 'week') =>
    apiClient.get<{ data: StepsGoalDaySummary[] }>('v1/user-daily-steps-goal-list', {
      params: { filter },
    }),

  logSteps: (value: number, date: string) =>
    apiClient.post<ApiMessageResponse>('usergraph-save', { type: 'step_track', value, date }),

  getTodayLog: (date: string) =>
    apiClient.get<{ data: StepsLogEntry[] }>('usergraph-list', {
      params: { type: 'step_track', date, per_page: 50, orderby: 'asc' },
    }),
};
