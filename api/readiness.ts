import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface ReadinessValues {
  sleep_quality: number; // 1-5
  soreness_level: number; // 1-10
  energy_level: number; // 1-5
  stress_level: number; // 1-5
}

export interface ReadinessTodayResponse {
  data: {
    required: boolean;
    submitted_today: boolean;
    today: ReadinessValues | null;
  };
}

// Combined_score/band/acwr REALES del Motor de Auto-Regulación (Fase 4,
// readiness_scores), distinto de la aproximación 100% subjetiva de arriba
// -- ver home_screen_modern_v2.tsx::computeRecoveryScore()/normalizeAcwr()
// para cómo se usa como fuente preferida cuando hay datos.
export interface ReadinessScoreLatest {
  has_data: boolean;
  date: string | null;
  combined_score: number | null;
  band: string | null;
  acwr: number | null;
  hrv_z_score: number | null;
  sueno_z_score: number | null;
  subjetivo_score: number | null;
  calculated_at: string | null;
}

export interface ReadinessScoreLatestResponse {
  data: ReadinessScoreLatest;
}

export const readinessApi = {
  getToday: () => apiClient.get<ReadinessTodayResponse>('v1/readiness-today'),

  submit: (values: ReadinessValues) => apiClient.post<ApiMessageResponse>('v1/readiness-store', values),

  getLatest: () => apiClient.get<ReadinessScoreLatestResponse>('v1/readiness-scores-latest'),
};
