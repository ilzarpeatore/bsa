import apiClient from './client';
import { ApiMessageResponse } from './types';

// Bloqueo de usuario (item 11 del roadmap -- requisito para reactivar
// COMMUNITY_ENABLED, ver docs/PENDIENTE_BACKEND_ADMIN.md). Un bloqueo oculta
// el contenido de la otra persona en ambas direcciones (feed/comentarios) y
// evita comentar/dar like sobre el contenido de la otra -- todo resuelto en
// el backend (Posting/Comment::scopeExcludeBlockedUsers()), el cliente solo
// necesita disparar block/unblock y listar mis bloqueados.
export interface BlockedUser {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  username: string;
  phone_number: string;
  profile_image: string | null;
}

export const userBlockApi = {
  block: (userId: number) => apiClient.post<ApiMessageResponse>('block-user', { user_id: userId }),

  unblock: (userId: number) => apiClient.post<ApiMessageResponse>('unblock-user', { user_id: userId }),

  getMyBlockedUsers: () => apiClient.get<{ data: BlockedUser[] }>('my-blocked-users'),
};
