import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface WaterGoalItem {
  id: number;
  goal_ml: number;
  date: string;
  created_at: string;
}

export interface WaterGraphItem {
  id: number;
  value: string;
  date: string;
}

// Registro real de consumo (Guideline 2.2, 2026-09-10: water_tracker_screen.tsx
// solo tenía UI, sin ninguna llamada real detrás -- "Registrar ahora" no
// guardaba nada). Usa el mismo mecanismo genérico de histórico que ya usa el
// backend para step_track/weight_track (ver UserGraphController::saveGraphData):
// cada registro crea una fila nueva con el total ACUMULADO del día (no un
// delta), la última fila por fecha es el valor vigente.
export interface WaterLogEntry {
  id: number;
  value: number | string;
  type: string;
  date: string;
  unit: string | null;
}

export const waterApi = {
  saveGoal: (goal_ml: number, date: string) =>
    apiClient.post<ApiMessageResponse>('user-daily-water-goal-save', { goal_ml, date }),

  getGoalList: (date?: string) =>
    apiClient.get<{ data: WaterGoalItem[] }>('user-daily-water-goal-list', {
      params: date ? { date } : undefined,
    }),

  getGoalListV1: () =>
    apiClient.get<{ data: WaterGraphItem[] }>('v1/user-daily-water-goal-list'),

  logIntake: (value_ml: number, date: string) =>
    apiClient.post<ApiMessageResponse>('usergraph-save', { type: 'water_track', value: value_ml, date }),

  getTodayLog: (date: string) =>
    apiClient.get<{ data: WaterLogEntry[] }>('usergraph-list', {
      params: { type: 'water_track', date, per_page: 50, orderby: 'desc' },
    }),
};
