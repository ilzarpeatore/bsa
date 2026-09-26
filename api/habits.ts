import apiClient from './client';
import { ApiMessageResponse } from './types';

export type HabitFrequency = 'daily' | 'weekly';
export type HabitSourceType = 'coach_assigned' | 'library' | 'personal';

export interface HabitLogEntry {
  id?: number;
  date: string;
  is_completed: boolean;
  value_logged?: number | string | null;
}

export interface Habit {
  id: number;
  title: string;
  icon: string | null;
  target_value: number | string | null;
  target_unit: string | null;
  frequency: HabitFrequency;
  source_type: HabitSourceType;
  current_streak: number;
  logs: HabitLogEntry[];
}

export interface HabitTemplate {
  id: number;
  title: string;
  icon: string | null;
  /** Categoría de la biblioteca ("Mañana", "Salud y fitness"...); null si el coach no la puso. */
  category?: string | null;
  target_value: number | string | null;
  target_unit: string | null;
  frequency: HabitFrequency;
}

export interface CreatePersonalHabitInput {
  title: string;
  icon?: string | null;
  target_value?: number | null;
  target_unit?: string | null;
  frequency: HabitFrequency;
}

// Se pide el histórico completo (53 semanas) de una sola vez — las 5 pestañas
// de periodo (semanal/mensual/trimestral/semestral/anual) se derivan todas
// recortando este mismo array en el cliente, sin volver a pedir al backend
// cada vez que el usuario cambia de pestaña.
export const HABIT_HISTORY_DAYS = 371;

export const habitsApi = {
  // Mis hábitos: asignados por el coach + adoptados de biblioteca + personales.
  getMyList: (days: number = HABIT_HISTORY_DAYS) =>
    apiClient.get<{ data: Habit[] }>('habit-my-list', { params: { days } }),

  // Biblioteca global (hábitos comunes creados por el coach) — solo lectura.
  getLibrary: () => apiClient.get<{ data: HabitTemplate[] }>('habit-library'),

  // Adoptar un hábito de la biblioteca — crea mi propia copia trackeable.
  adopt: (templateId: number) =>
    apiClient.post<{ data: Habit } & ApiMessageResponse>('habit-adopt', { template_id: templateId }),

  // Crear un hábito 100% propio, sin coach ni biblioteca de por medio.
  createPersonal: (payload: CreatePersonalHabitInput) =>
    apiClient.post<{ data: Habit } & ApiMessageResponse>('habit-personal-store', payload),

  // Registrar/actualizar mi log de un día concreto (por defecto hoy).
  logHabit: (habitId: number, params?: { date?: string; is_completed?: boolean; value_logged?: number }) =>
    apiClient.post<{ data: HabitLogEntry }>('habit-my-log', { habit_id: habitId, ...params }),

  // Quitar un hábito de mi lista (no borra la plantilla de biblioteca de origen).
  remove: (id: number) => apiClient.post<ApiMessageResponse>('habit-my-delete', { id }),
};
