import apiClient from './client';

export type ResourceCategory =
  | 'entrenamiento'
  | 'nutricion'
  | 'habitos_mindset'
  | 'onboarding'
  | 'planes_actuales';

export interface ResourceListItem {
  id: number;
  title: string;
  type: 'article' | 'video' | 'link' | 'doc';
  scope: 'shared' | 'assigned';
  category: ResourceCategory | null;
  content: string | null;
  external_url: string | null;
  created_at: string;
  // Todavía no existe en el backend (columna pendiente de añadir a
  // `resources` + devolverla en resource-list/resource-detail) — se deja
  // tipado en optimista para que en cuanto se implemente empiece a usarse
  // sola, sin más cambios en el cliente. Ver docs/TAREAS.md.
  image_url?: string | null;
}

export interface Pagination {
  total_items: number;
  per_page: number;
  currentPage: number;
  totalPages: number;
}

export interface ResourceListResponse {
  data: ResourceListItem[];
  pagination: Pagination;
}

export const resourcesApi = {
  // Trae todo lo visible para el cliente autenticado (compartidos + los
  // que tenga asignados individualmente) - se separa en pestañas en el
  // cliente por el campo `scope`, en vez de pedir 2 listas aparte.
  getList: (params?: { type?: string; per_page?: number; page?: number }) =>
    apiClient.get<ResourceListResponse>('resource-list', { params }),

  getDetail: (id: number) =>
    apiClient.get<{ data: ResourceListItem }>('resource-detail', { params: { id } }),
};
