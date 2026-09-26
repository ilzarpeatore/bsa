import apiClient from './client';
import { ApiMessageResponse } from './types';

export interface ShoppingListItem {
  id: number;
  user_id: number;
  daily_plan_id: number | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  servings: number;
  status: string;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItemDetail {
  id: number;
  shopping_list_id: number;
  ingredient_id: number | null;
  ingredient_title: string | null;
  ingredient_category_id: number | null;
  ingredient_category_title: string | null;
  custom_item_name: string | null;
  total_grams: number | null;
  display_quantity: number;
  measurement_unit_id: number | null;
  display_unit_title: string | null;
  display_unit_symbol: string | null;
  /** Unidad en texto libre de las líneas de FatSecret ("tazas", "cucharada"...); sin unidad del catálogo. */
  unit_label?: string | null;
  is_checked: boolean;
  manually_added: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItemsByCategory {
  ingredient_category_id: number | null;
  ingredient_category_title: string | null;
  items: ShoppingListItemDetail[];
}

export interface ShoppingListDetail extends ShoppingListItem {
  items: ShoppingListItemDetail[];
  items_by_category: ShoppingListItemsByCategory[];
}

export interface ShoppingListResponse {
  data: ShoppingListItem[];
}

export interface MeasurementUnit {
  id: number;
  title: string;
  symbol: string;
  slug: string;
}

export type ShoppingMealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface GenerateShoppingListParams {
  shopping_list_id?: number;
  daily_plan_id?: number;
  start_date?: string;
  end_date?: string;
  meal_types?: ShoppingMealType[];
  is_complete_only?: boolean;
  title?: string;
  servings?: number;
}

export const shoppingApi = {
  getList: () => apiClient.get<ShoppingListResponse>('shopping-list'),

  getDetail: (id: number) =>
    apiClient.get<{ data: ShoppingListDetail }>('shopping-list-detail', { params: { id } }),

  generateFromDailyPlan: (params: GenerateShoppingListParams) =>
    apiClient.post<{ message: string; data: ShoppingListItem }>('daily-plan-shopping-list-generate', params),

  deleteShoppingList: (id: number) =>
    apiClient.post<ApiMessageResponse>('shopping-list-delete', { id }),

  toggleItem: (item_id: number, is_checked: boolean) =>
    apiClient.post<{ message: string; data: ShoppingListItemDetail }>('shopping-list-item-toggle', {
      item_id,
      is_checked,
    }),

  deleteItem: (item_id: number) =>
    apiClient.post<ApiMessageResponse>('shopping-list-item-delete', { item_id }),

  addCustomItem: (params: {
    shopping_list_id: number;
    custom_item_name: string;
    display_quantity?: number;
    measurement_unit_id?: number;
  }) => apiClient.post<{ message: string; data: ShoppingListItemDetail }>('shopping-list-item-add', params),

  updateItem: (params: {
    item_id: number;
    custom_item_name?: string;
    display_quantity?: number;
    measurement_unit_id?: number;
    is_checked?: boolean;
  }) => apiClient.post<{ message: string; data: ShoppingListItemDetail }>('shopping-list-item-update', params),

  getMeasurementUnits: () =>
    apiClient.get<{ data: MeasurementUnit[] }>('get-measurementunit', { params: { per_page: -1 } }),
};
