import apiClient from './client';

// Búsqueda de recetas de FatSecret desde la propia app, para sustituir una
// comida ya asignada por otra (pedido explícito 2026-09-19). Backend: ver
// Bckbs::App\Http\Controllers\API\FatSecretController (throttle:100,1440
// por cliente) y docs/FATSECRET_INTEGRATION.md en ese repo. Nunca se guarda
// nada de esto en la app -- solo se usa para elegir y mandar
// fatsecret_recipe_id a save-daily-plan-recipe (ver api/recipes.ts).
export interface FatSecretRecipeResult {
  fatsecret_recipe_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FatSecretRecipeSearchResponse {
  data: {
    results: FatSecretRecipeResult[];
    total_results: number;
    page_number: number;
  };
}

// Detalle completo -- ver DietDetailScreen (modo FatSecret). directions/
// ingredients vienen ya normalizados por el backend (FatSecretRecipeCache,
// cache-aside de corta duración, ver docs/FATSECRET_INTEGRATION.md).
export interface FatSecretIngredientLine {
  description: string | null;
  food_id: number | null;
  number_of_units: number | null;
  measurement_description: string | null;
}

export interface FatSecretRecipeDetail {
  fatsecret_recipe_id: number;
  name: string;
  image_url: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  number_of_servings: number | null;
  preparation_time_min: number | null;
  cooking_time_min: number | null;
  directions: string[];
  ingredients: FatSecretIngredientLine[];
}

// Filtros server-side reales de recipes.search.v3 (2026-09-20, ver
// docs/FATSECRET_INTEGRATION.md sección 13 en Bckbs), todos opcionales y
// disponibles en plan Basic. Los % de macro son sobre calorías (lo único
// que expone la API, no hay filtro de gramos absolutos).
export interface FatSecretRecipeSearchFilters {
  caloriesFrom?: number;
  caloriesTo?: number;
  proteinPercentageFrom?: number;
  proteinPercentageTo?: number;
  carbPercentageFrom?: number;
  carbPercentageTo?: number;
  fatPercentageFrom?: number;
  fatPercentageTo?: number;
  prepTimeFrom?: number;
  prepTimeTo?: number;
  recipeType?: string;
  mustHaveImages?: boolean;
  sortBy?: 'newest' | 'oldest' | 'caloriesPerServingAscending' | 'caloriesPerServingDescending';
}

function buildRecipeSearchParams(query: string, page: number, filters: FatSecretRecipeSearchFilters) {
  const params: Record<string, string | number> = { q: query, page };
  if (filters.caloriesFrom != null) params.calories_from = filters.caloriesFrom;
  if (filters.caloriesTo != null) params.calories_to = filters.caloriesTo;
  if (filters.proteinPercentageFrom != null) params.protein_percentage_from = filters.proteinPercentageFrom;
  if (filters.proteinPercentageTo != null) params.protein_percentage_to = filters.proteinPercentageTo;
  if (filters.carbPercentageFrom != null) params.carb_percentage_from = filters.carbPercentageFrom;
  if (filters.carbPercentageTo != null) params.carb_percentage_to = filters.carbPercentageTo;
  if (filters.fatPercentageFrom != null) params.fat_percentage_from = filters.fatPercentageFrom;
  if (filters.fatPercentageTo != null) params.fat_percentage_to = filters.fatPercentageTo;
  if (filters.prepTimeFrom != null) params.prep_time_from = filters.prepTimeFrom;
  if (filters.prepTimeTo != null) params.prep_time_to = filters.prepTimeTo;
  if (filters.mustHaveImages) params.must_have_images = 'true';
  if (filters.sortBy) params.sort_by = filters.sortBy;
  // Clave con [] literal (no un array de JS) -- así el backend (PHP) lo
  // interpreta como recipe_types=['X'] sin depender de cómo axios
  // serialice arrays, que no es consistente entre versiones.
  if (filters.recipeType) params['recipe_types[]'] = filters.recipeType;
  return params;
}

export const fatSecretApi = {
  searchRecipes: (query: string, page: number = 0, filters: FatSecretRecipeSearchFilters = {}) =>
    apiClient.get<FatSecretRecipeSearchResponse>('fatsecret/recipes/search', {
      params: buildRecipeSearchParams(query, page, filters),
    }),

  getRecipeDetail: (fatsecretRecipeId: number) =>
    apiClient.get<{ data: FatSecretRecipeDetail }>(`fatsecret/recipes/${fatsecretRecipeId}`),

  getRecipeTypes: () => apiClient.get<{ data: string[] }>('fatsecret/recipe-types'),
};
