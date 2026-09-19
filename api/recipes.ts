import apiClient from './client';
import { DailyPlanDetailResponse } from './diet';
import { ApiMessageResponse } from './types';

export interface RecipeListItem {
  id: number;
  title: string;
  slug: string;
  type: string;
  meal_type: string[];
  recipe_category: string[];
  recipe_tag: string[];
  preparation_time: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  recipe_image: string | null;
  is_favourite: number;
  is_premium: boolean;
  is_accessible: boolean;
}

export interface RecipeDetail {
  id: number;
  title: string;
  slug: string;
  type: string;
  meal_type: string;
  description: string;
  preparation_time: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  recipe_image?: string | null;
  is_favourite: number;
  is_premium: boolean;
  is_accessible: boolean;
  recipe_categories: { id: number; name: string }[];
  recipe_tags: { id: number; name: string }[];
}

export interface RecipeStep {
  id: number;
  instruction: string;
  sequence: number;
}

export interface RecipeIngredient {
  id: number;
  ingredient_id: number;
  ingredient_title: string;
  measurement_unit_id: number;
  measurement_unit_title: string;
  quantity: number;
  amount: number;
  quantity_grams: number;
  quantity_display: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export interface RecipeDetailResponse {
  data: RecipeDetail;
  recipe_steps: RecipeStep[];
  recipe_ingredients: RecipeIngredient[];
}

export interface RecipeCategory {
  id: number;
  title: string;
  slug: string;
  status: string;
  recipe_category_image: string | null;
}

export interface RecipeTag {
  id: number;
  title: string;
  slug: string;
  status: string;
  // Grupo real asignado desde el admin (duration/fat_loss/muscle_gain/
  // performance/spain_regional/country/diet/meal_type/other), nullable
  // mientras el admin no lo haya rellenado para ese tag -- ver
  // recipe_tag_list_screen.tsx::classifyTag() para el fallback.
  group: string | null;
  recipe_tag_image: string | null;
}

export interface MacroNutrient {
  id: number;
  title: string;
  value: string;
  unit: string;
}

export interface Pagination {
  total_items: number;
  per_page: number;
  currentPage: number;
  totalPages: number;
}

export interface RecipeListResponse {
  data: RecipeListItem[];
  pagination: Pagination;
}

export const recipesApi = {
  getFilteredList: (params?: Record<string, any>) =>
    apiClient.get<RecipeListResponse>('recipe-filter-list', { params }),

  getDetail: (id: number) =>
    apiClient.get<RecipeDetailResponse>(`recipe-detail/${id}`),

  saveDailyPlanRecipe: (daily_plan_id: number, recipe_id: number, meal_type: string) =>
    apiClient.post<ApiMessageResponse>('save-daily-plan-recipe', { daily_plan_id, recipe_id, meal_type }),

  // Sustituir/añadir una comida por una receta de FatSecret en vez de una
  // propia -- mismo endpoint, backend acepta EXACTAMENTE uno de recipe_id /
  // fatsecret_recipe_id (ver docs/FATSECRET_INTEGRATION.md en Bckbs).
  saveDailyPlanRecipeFromFatSecret: (daily_plan_id: number, fatsecret_recipe_id: number, meal_type: string) =>
    apiClient.post<ApiMessageResponse>('save-daily-plan-recipe', { daily_plan_id, fatsecret_recipe_id, meal_type }),

  updateDailyPlanRecipe: (id: number, daily_plan_id: number, recipe_id: number, meal_type: string, is_complete: boolean) =>
    apiClient.post<DailyPlanDetailResponse>('save-daily-plan-recipe', { id, daily_plan_id, recipe_id, meal_type, is_complete }),

  deleteDailyPlanRecipe: (id: number) =>
    apiClient.post<ApiMessageResponse>('daily-plan-recipe-delete', { id }),

  deleteAllDailyPlanRecipes: (daily_plan_id: number) =>
    apiClient.post<ApiMessageResponse>('daily-plan-recipe-delete-all', { daily_plan_id }),

  getMacroNutrients: () =>
    apiClient.get<{ data: MacroNutrient[] }>('get-macro-nutrient'),

  getCategories: (page: number = 1, per_page?: number) =>
    apiClient.get<{ data: RecipeCategory[]; pagination: Pagination }>('recipecategory-list', { params: { page, per_page } }),

  getTags: (page: number = 1, per_page?: number) =>
    apiClient.get<{ data: RecipeTag[]; pagination: Pagination }>('recipetag-list', { params: { page, per_page } }),

  setFavourite: (recipe_id: number) =>
    apiClient.post<ApiMessageResponse>('set-favourite-recipe', { recipe_id }),

  getFavourite: (page: number = 1) =>
    apiClient.get<RecipeListResponse>(`get-favourite-recipe?page=${page}`),
};
