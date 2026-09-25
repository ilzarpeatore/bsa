import apiClient from './client';
import { ApiMessageResponse } from './types';
import { profileApi } from './profile';

// API del nuevo onboarding de 4 etapas. Ver docs/ONBOARDING_V2.md para el
// contrato completo (payload/response, y el esquema de BD sugerido).
//
// Etapa 1 (datos personales) reutiliza el endpoint YA real `update-profile`
// (age/height/weight/gender ya existen en `user_profiles` -- confirmado en
// api/profile.ts). Las etapas 2-4 (PAR-Q, cuestionario de entrenamiento,
// cuestionario de nutrición) y el marcado de completado llaman a endpoints
// `v1/onboarding/*` que, a pesar de lo que decía este comentario antes
// (corregido 2026-09-14, tras confirmar en el servidor real -- ver
// routes/api.php y app/Http/Controllers/API/OnboardingController.php --
// que las 4 rutas SÍ existen y persisten de verdad, incl. `complete`
// marcando `users.onboarding_completed_at`), ya están implementados en el
// backend. El flujo de onboarding_v2_screen.tsx las sigue tratando como
// "best effort" de todos modos (las respuestas se guardan localmente
// primero, ver ONBOARDING_ANSWERS_STORAGE_KEY), lo cual sigue siendo
// razonable como defensa ante un fallo de red puntual, pero ya no por
// asumir que el endpoint no existe.

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
  // 2026-09-16 (Bckbs PR #19): obligatorios en el backend SOLO si
  // gender==='female' -- opcionales aquí porque para el resto de perfiles ni
  // se muestran ni se envían (ver showIf en constants/onboardingV2Questions.ts
  // y submitStage() en onboarding_v2_screen.tsx).
  parq_pregnant_or_possible?: boolean;
  parq_menstrual_change_or_stress_fracture?: boolean;
  // A diferencia de las 2 anteriores, esta SÍ es obligatoria siempre, cualquier género.
  parq_eating_disorder_history: boolean;
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
  // Opcionales (2026-09-25): si no se envían, el backend conserva lo ya guardado.
  medications?: string;
  supplements?: string;
  disliked_foods: string;
  liked_foods: string;
  current_meals_per_day: number;
  desired_meals_per_day: number;
  typical_day_meals: string;
  favorite_meats: string;
  favorite_fish: string;
  favorite_fruits_vegetables: string;
  favorite_combined_dishes: string;
  // 3 campos nuevos (2026-09-16, Bckbs PR #19), obligatorios, sin condición
  // de género -- disponibilidad real de cocina para el agente de nutrición.
  cooking_minutes_per_meal: number; // 0-180
  cooking_skill_level: 'beginner' | 'intermediate' | 'advanced';
  cooks_for_others: boolean;
}

// Endpoint nuevo (2026-09-16, Bckbs PR #19), no forma parte del onboarding --
// cambia SOLO disponibilidad de entrenamiento (días/semana + duración de
// sesión) sin reenviar todo TrainingQuestionnairePayload, que exige todos sus
// campos como obligatorios y por tanto no sirve para un simple "cambié de
// horario". Requiere que el cliente ya haya completado la etapa 3 del
// onboarding -- si no, el backend responde 422.
export interface TrainingAvailabilityUpdatePayload {
  training_days_per_week: number; // 1-7
  session_duration_preference: '30' | '45' | '60' | '90' | '90_plus';
}

export interface MyOnboardingAnswers {
  par_q: (ParQPayload & { id: number; user_id: number }) | null;
  training_questionnaire: (TrainingQuestionnairePayload & { id: number; user_id: number }) | null;
  nutrition_questionnaire: (NutritionQuestionnairePayload & { id: number; user_id: number }) | null;
}

export interface MyOnboardingAnswersResponse {
  data: MyOnboardingAnswers;
}

export const onboardingV2Api = {
  // Nuevo (2026-09-18) -- lectura de las propias respuestas de onboarding,
  // para la pantalla de edición en Cuenta (pages/migrated/onboarding_data_screen.tsx).
  // Cada clave puede venir `null` si esa etapa nunca se completó (ver el caso
  // real de Osas Ehigiator/Alberto Martín, docs del incidente 2026-09-18).
  getMyAnswers: () => apiClient.get<MyOnboardingAnswersResponse>('v1/onboarding/my-answers'),

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

  // Real (confirmado 2026-09-14 en el servidor, ver comentario de arriba) --
  // persiste en `par_q_answers`.
  submitParQ: (payload: ParQPayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/par-q', payload),

  // Real (confirmado 2026-09-14) -- persiste en `training_questionnaire_answers`.
  submitTrainingQuestionnaire: (payload: TrainingQuestionnairePayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/training-questionnaire', payload),

  // Real (confirmado 2026-09-14) -- persiste en `nutrition_questionnaire_answers`.
  submitNutritionQuestionnaire: (payload: NutritionQuestionnairePayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/nutrition-questionnaire', payload),

  // Real (confirmado 2026-09-14, ver comentario de arriba): marca
  // `users.onboarding_completed_at = now()` para el usuario autenticado
  // (mismo mecanismo user_id vía token que el resto de esta API), y ese
  // valor es justo lo que login()/userDetail() devuelven después como
  // `onboarding_completed`. AuthContext.completeOnboarding() la sigue
  // llamando best-effort (no bloquea el paso a Home si falla por red), pero
  // ya no por asumir que el endpoint no existe -- el flag local y el objeto
  // `USER` cacheado (ver fix 2026-09-14 en AuthContext.tsx) son ahora un
  // respaldo para *fallos puntuales*, no la única fuente de verdad real.
  completeOnboarding: () => apiClient.post<ApiMessageResponse>('v1/onboarding/complete'),

  // Nuevo (2026-09-16, Bckbs PR #19, ver comentario del payload arriba) --
  // pantalla de ajustes, fuera del flujo de onboarding.
  updateTrainingAvailability: (payload: TrainingAvailabilityUpdatePayload) =>
    apiClient.post<ApiMessageResponse>('v1/onboarding/training-availability-update', payload),
};
