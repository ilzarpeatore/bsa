// Envoltorio común de respuestas de la API Be Stronger.
// La mayoría de endpoints responden { data, message, status }.
// Usado para tipar llamadas cuyo cuerpo no se consume (fire-and-forget).

export interface ApiEnvelope<T = unknown> {
  data: T;
  message?: string;
  status?: boolean;
}

export interface ApiMessageResponse {
  message?: string;
  status?: boolean;
}
