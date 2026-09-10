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

export interface StepsGraphItem {
  id: number;
  value: string;
  date: string;
}

// Registro manual real de pasos (Guideline 2.2, 2026-09-10:
// activity_tracker_screen.tsx mostraba datos 100% inventados en el layout --
// "6,842" pasos, gráfica semanal y lista de actividades fijas en el código,
// sin ningún estado ni llamada a la API). Mismo mecanismo genérico de
// histórico que water_track (ver UserGraphController::saveGraphData): cada
// registro crea una fila nueva con el total ACUMULADO del día, la última
// fila por fecha es el valor vigente.
export interface StepsLogEntry {
  id: number;
  value: number | string;
  type: string;
  date: string;
  unit: string | null;
}

export const stepsApi = {
  saveGoal: (value: number, date: string) =>
    apiClient.post<ApiMessageResponse>('user-daily-steps-goal-save', { value, date }),

  getGoalList: (date?: string) =>
    apiClient.get<{ data: StepsGoalItem[] }>('user-daily-steps-goal-list', {
      params: date ? { date } : undefined,
    }),

  getGoalListV1: () =>
    apiClient.get<{ data: StepsGraphItem[] }>('v1/user-daily-steps-goal-list'),

  logSteps: (value: number, date: string) =>
    apiClient.post<ApiMessageResponse>('usergraph-save', { type: 'step_track', value, date }),

  getTodayLog: (date: string) =>
    apiClient.get<{ data: StepsLogEntry[] }>('usergraph-list', {
      params: { type: 'step_track', date, per_page: 50, orderby: 'desc' },
    }),
};
