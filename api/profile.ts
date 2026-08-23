import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface UserProfile {
  id: number;
  age: string;
  weight: string;
  weight_unit: string;
  height: string;
  height_unit: string;
  address: string;
  user_id: number;
  activity: string;
  goal: string;
  macro_type: string;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
  // Ya calculados en el backend (UserProfile::getBmiAttribute/getBmrAttribute/
  // getIdealWeightAttribute, Mifflin-St Jeor + fórmula Devine) — null si falta
  // algún dato base (altura/peso/género) para calcularlos.
  bmi: string | null;
  bmr: string | null;
  ideal_weight: string | null;
  water_reminder_settings?: Record<string, any> | null;
  meal_reminder_settings?: Record<string, any> | null;
}

export interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  username: string;
  gender: string;
  status: string;
  user_type: string;
  phone_number: string;
  profile_image: string;
  login_type: string;
  created_at: string;
  updated_at: string;
  user_profile: UserProfile;
  is_subscribe: number;
  is_personal_client: boolean;
  access_tier: 'free' | 'subscriber' | 'personal';
  // Pendiente de backend -- ver docs/ONBOARDING_V2.md ("Marcar onboarding
  // completado server-side"). Opcional a propósito: hasta que el backend lo
  // mande, AuthContext cae al flag local (AsyncStorage) que ya existía.
  onboarding_completed?: boolean;
}

export interface UserResponse {
  data: UserData;
}

export interface GraphItem {
  id: number;
  value: string;
  type: string;
  date: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface GraphListResponse {
  data: GraphItem[];
  pagination: {
    total_items: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

export interface ReminderSettingsPayload {
  water_reminder_settings?: Record<string, any>;
  meal_reminder_settings?: Record<string, any>;
}

export interface ReminderSettingsResponse {
  data: UserProfile;
}

export interface UserSocialStats {
  posting_count: number;
  workout_count: number;
}

export const profileApi = {
  getUserDetail: (id: number) =>
    apiClient.get<UserResponse>(`user-detail?id=${id}`),

  getSocialStats: (userId: number) =>
    apiClient.get<{ data: UserSocialStats }>(`user-social-stats?user_id=${userId}`),

  updateProfile: (payload: Record<string, any>) =>
    apiClient.post<ApiMessageResponse>('update-profile', payload),

  saveGraph: (payload: { type: string; value: string; date: string }) =>
    apiClient.post<ApiMessageResponse>('usergraph-save', payload),

  deleteGraph: (id: number) =>
    apiClient.post<ApiMessageResponse>('usergraph-delete', { id }),

  getGraphList: (type: string, page: number = 1, duration?: string) =>
    apiClient.get<GraphListResponse>(`usergraph-list?type=${type}&page=${page}${duration ? `&duration=${duration}` : ''}`),

  getGraphDetail: (type: string) =>
    apiClient.get<{ data: GraphItem }>(`usergraph-detail?type=${type}`),

  setReminderSettings: (payload: ReminderSettingsPayload) =>
    apiClient.post<ReminderSettingsResponse>('set-reminder-settings', payload),
};
