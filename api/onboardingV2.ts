import apiClient from './client';
import { ApiMessageResponse } from './types';
import { profileApi } from './profile';

// API del nuevo onboarding de 4 etapas. Ver docs/ONBOARDING_V2.md para el
// contrato completo (payload/response, y el esquema de BD sugerido).
//
// Etapa 1 (datos personales) reutiliza el endpoint YA real `update-profile`
// (age/height/weight/gender ya existen en `user_profiles` -- confirmado en
// api/profile.ts). Las etapas 2-4 (PAR-Q, cuestionario de entrenamiento,
// cuestionario de nutrición) llaman a endpoints `v1/onboarding/*` que TODAVÍA
// NO EXISTEN en el backend -- están preparados aquí (tipos + payload) para
// que quien implemente el backend solo tenga que crear las rutas/tablas
// descritas en el MD. Hasta entonces estas llamadas devolverán 404, por lo
// que el flujo de onboarding_v2_screen.tsx las trata como "best effort": si
// fallan, no bloquean el avance del usuario (las respuestas siempre se
// guardan localmente primero, ver ONBOARDING_ANSWERS_STORAGE_KEY).

export interface PersonalDataPayload {
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number;
  height_unit: 'cm' | 'ft';
  weight: number;
  weight_unit: 'kg' | 'lbs';
}

export interface ParQPayload {
  parq_heart_condition: boolean;
  parq_chest_pain_activity: boolean;
  parq_chest_pain_rest_last_month: boolean;
  parq_dizziness_balance: boolean;
  parq_bone_joint_problem: boolean;
  parq_bp_or_heart_medication: boolean;
  parq_reason_not_to_exercise: boolean;
  parq_fitness_level: number; // 1-10
  parq_medical_history: string;
  parq_goals: string;
}

export interface TrainingQuestionnairePayload {
  goal_type: 'lose_fat' | 'gain_muscle' | 'recomposition' | 'maintain';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  lifestyle_type: 'mostly_sitting' | 'sometimes_standing' | 'mostly_standing' | 'always_moving' | 'heavy_labor';
  training_experience_months: number;
  training_days_per_week: number; // 1-7
  session_duration_preference: '30' | '45' | '60' | '90' | '90_plus';
  training_mindset: 'rushed' | 'calm' | 'motivated' | 'unmotivated';
  previous_coaching: 'online_coach' | 'in_person_coach' | 'self_trained';
  current_routine_style: 'improvised' | 'copied' | 'structured' | 'always_same' | 'very_varied';
  weekly_split_preference: 'upper_lower' | 'push_pull' | 'full_body' | 'no_preference';
  technique_level: number; // 1-10
  realistic_goal: string;
}

export interface NutritionQuestionnairePayload {
  allergies_intolerances: string;
  disliked_foods: string;
  liked_foods: string;
  current_meals_per_day: number;
  desired_meals_per_day: number;
  typical_day_meals: string;
  favorite_meats: string;
  favorite_fish: string;
  favorite_fruits_vegetables: string;
  favorite_combined_dishes: string;
}

export const onboardingV2Api = {
  // Real hoy: mismo endpoint que ProfileSetupFormScreen/EditProfile.
  // `username`/`email` son obligatorios en UserRequest::rules() aunque esta
  // pantalla no los pida -- sin ambos el guardado devuelve 422 aunque el
  // resto del payload sea válido (mismo bug ya documentado en
  // profile_setup_form_screen.tsx / edit_profile_screen.tsx).
  submitPersonalData: (payload: PersonalDataPayload, username: string, email: string) =>
    profileApi.updateProfile({
      username,
      email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      gender: payload.gender,
      user_profile: {
        age: String(payload.age),
        height: String(payload.height),
        height_unit: payload.height_unit,
        weight: String(payload.weight),
        weight_unit: payload.weight_unit,
      },
    }),

  // Pendiente de backend -- ver docs/ONBOARDING_V2.md ("Tabla par_q_answers").
  submitParQ: (payload: ParQPayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/par-q', payload),

  // Pendiente de backend -- ver docs/ONBOARDING_V2.md ("Tabla training_questionnaire_answers").
  submitTrainingQuestionnaire: (payload: TrainingQuestionnairePayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/training-questionnaire', payload),

  // Pendiente de backend -- ver docs/ONBOARDING_V2.md ("Tabla nutrition_questionnaire_answers").
  submitNutritionQuestionnaire: (payload: NutritionQuestionnairePayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/nutrition-questionnaire', payload),
};
