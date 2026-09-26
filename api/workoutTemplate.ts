import apiClient from './client';

// V2 system: WorkoutTemplate / WorkoutTemplateBlock / WorkoutTemplateExercise.
// Backend: app/Http/Controllers/API/WorkoutTemplateController.php (getClientDetail).

export interface WorkoutTemplateExerciseModel {
  id: number;
  exercise_id: number;
  sequence: number;
  prescribed: Record<string, any> | null;
  enabled_metrics: string[] | null;
  notes: string | null;
  title: string | null;
  exercise_image: string | null;
  video_url: string | null;
  body_part_id: number | null;
  last_performance?: { sets: Record<string, any>[] } | null;
  recent_performance?: { date: string | null; sets: Record<string, any>[] }[] | null;
  exercise?: {
    id: number;
    title: string;
    bodypart_ids?: number[] | null;
    [key: string]: any;
  } | null;
}

export interface WorkoutTemplateBlockModel {
  id: number;
  title: string;
  instructions: string | null;
  order: number;
  exercises: WorkoutTemplateExerciseModel[];
}

export interface WorkoutTemplateDetailData {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  is_exclusive?: boolean;
  is_accessible?: boolean;
  is_favourite?: boolean;
  blocks: WorkoutTemplateBlockModel[];
}

// Item plano de la lista de "Workouts sueltos" (navegación libre, sin programa).
export interface WorkoutTemplateListItem {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  is_exclusive: boolean;
  is_accessible: boolean;
}

export interface WorkoutTemplateListResponse {
  pagination: { total_items: number; per_page: number; currentPage: number; totalPages: number };
  data: WorkoutTemplateListItem[];
}

export interface MetricCatalogItem {
  id: number;
  key: string;
  label: string;
  unit: string | null;
  input_type: 'number' | 'text' | 'time';
  higher_is_better: boolean | null;
  order: number;
}

export const workoutTemplateApi = {
  getClientDetail: (id: number) =>
    apiClient.get<{ data: WorkoutTemplateDetailData }>('v1/workout-template-detail', { params: { id } }),

  getMetricsCatalog: () =>
    apiClient.get<{ data: MetricCatalogItem[] }>('v1/metrics-catalog-list'),

  getList: (page: number, perPage = 20) =>
    apiClient.get<WorkoutTemplateListResponse>('v1/workout-template-list', { params: { page, per_page: perPage } }),

  getFavourite: (page: number, perPage = 20) =>
    apiClient.get<WorkoutTemplateListResponse>('v1/workout-template-list', {
      params: { page, per_page: perPage, only_favourites: 1 },
    }),

  setFavourite: (workoutTemplateId: number) =>
    apiClient.post<{ data: { is_favourite: boolean } }>('v1/workout-template-set-favourite', {
      workout_template_id: workoutTemplateId,
    }),
};
