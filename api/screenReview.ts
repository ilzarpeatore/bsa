import apiClient from './client';

// Herramienta temporal de desarrollo (ver components/ScreenReviewFab.tsx) —
// borrar este archivo junto con el resto del feature cuando ya no haga falta.

// 'comment' (2026-09-24): comentario libre sobre la pantalla, sin juicio de estado.
export type ScreenReviewStatus = 'comment' | 'delete' | 'done' | 'confused';

export interface ScreenReviewMark {
  id: number;
  route_name: string;
  status: ScreenReviewStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export const screenReviewApi = {
  mark: (routeName: string, status: ScreenReviewStatus, note?: string) =>
    apiClient.post<{ data: ScreenReviewMark }>('v1/screen-review-mark', { route_name: routeName, status, note: note || undefined }),

  // Una marca vigente por pantalla (updateOrCreate en el backend) — para
  // precargar en el FAB lo que ya se guardo antes en esta misma pantalla.
  getForRoute: (routeName: string) =>
    apiClient.get<{ data: ScreenReviewMark[] }>('v1/screen-review-marks', { params: { route_name: routeName } }),
};
