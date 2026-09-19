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

export const fatSecretApi = {
  searchRecipes: (query: string, page: number = 0) =>
    apiClient.get<FatSecretRecipeSearchResponse>('fatsecret/recipes/search', { params: { q: query, page } }),
};
