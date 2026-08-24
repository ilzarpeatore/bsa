import apiClient from './client';

export type AppFeedbackType = 'feature_request' | 'bug_report';
export type AppFeedbackSection = 'workout' | 'nutrition' | 'habits' | 'metrics' | 'other';

export interface AppFeedbackSubmission {
  type: AppFeedbackType;
  title: string;
  description: string;
  section: AppFeedbackSection;
  section_other?: string;
  // Buffer local de helper/logger.ts (solo si "Habilitar diagnósticos" está
  // activo) -- contexto real de depuración para el desarrollador, no un
  // campo decorativo.
  diagnostics_log?: string;
  app_version?: string;
  platform?: string;
}

// "Solicitar una función" / "Informar de un error" (Ajustes, pedido
// explícito) -- mismo mecanismo que api/screenReview.ts (guardar en el
// backend para poder consultarlo desde el admin panel), aplicado a
// feedback de producto en vez de a la revisión de las 200+ pantallas
// migradas. Endpoint todavía no existe en el backend -- ver
// docs/PENDIENTE_BACKEND_ADMIN.md para el contrato completo (payload, SQL,
// nota de admin panel).
export const appFeedbackApi = {
  submit: (payload: AppFeedbackSubmission) => apiClient.post('v1/app-feedback', payload),
};
