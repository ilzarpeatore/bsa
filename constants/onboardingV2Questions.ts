import { OnboardingQuestion } from '../types/onboardingV2';

// Definición declarativa de las 36 preguntas del nuevo onboarding, agrupadas
// en las 4 etapas pedidas por el usuario (datos personales / PAR-Q /
// cuestionario de entrenamiento / cuestionario de nutrición). Una única
// screen genérica (onboarding_v2_screen.tsx) recorre este array y renderiza
// el widget correcto según `type`. Ver docs/ONBOARDING_V2.md para el
// contrato de cada pregunta (id de respuesta, tipo, endpoint destino).

// cm -> pies decimales (ej. 170cm ~= 5.6 ft) y de vuelta -- solo para el
// número mostrado en el toggle cm/ft, el valor guardado siempre es en cm
// (ver comentario de unidad base en RulerPicker.tsx).
const CM_TO_FT_DECIMAL = (cm: number) => Math.round((cm / 2.54 / 12) * 10) / 10;
const FT_DECIMAL_TO_CM = (ft: number) => Math.round(ft * 12 * 2.54);
const KG_TO_LB = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const LB_TO_KG = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  // ---------- Etapa 1: Datos personales ----------
  {
    id: 'name',
    stage: 'personal_data',
    type: 'name',
    title: '¿Cómo te llamas?',
    subtitle: 'Así nos dirigiremos a ti dentro de la app',
  },
  {
    id: 'gender',
    stage: 'personal_data',
    type: 'single_choice',
    title: '¿Cuál es tu sexo?',
    subtitle: 'Lo usamos para calcular tu metabolismo basal con precisión',
    options: [
      { value: 'male', label: 'Hombre', icon: '♂️', emoji: true },
      { value: 'female', label: 'Mujer', icon: '♀️', emoji: true },
      // Antes usaba el emoji ⚧️, que en iOS sale a todo color (icono azul
      // relleno) muy distinto al trazo fino de los símbolos ♂️/♀️ de las otras
      // dos opciones -- se sustituye por un icono Ionicons real (mismo path
      // de render que el resto de la app, sin `emoji: true`) para que las 3
      // opciones tengan el mismo estilo de icono de sistema, monocromo.
      { value: 'other', label: 'Otro / Prefiero no decirlo', icon: 'male-female-outline' },
    ],
  },
  {
    id: 'age',
    stage: 'personal_data',
    type: 'number_wheel',
    title: '¿Cuántos años tienes?',
    subtitle: 'Usamos esta información para calcular tus necesidades nutricionales personalizadas',
    min: 14,
    max: 90,
    defaultValue: 27,
    suffix: 'años',
  },
  {
    id: 'height',
    stage: 'personal_data',
    type: 'ruler',
    title: '¿Cuál es tu estatura?',
    subtitle: 'Usamos esta información para calcular tus necesidades nutricionales personalizadas',
    min: 140,
    max: 220,
    decimals: 0,
    defaultValue: 170,
    units: [
      { value: 'cm', label: 'cm', toBase: (v) => v, fromBase: (v) => v },
      { value: 'ft', label: 'ft', toBase: FT_DECIMAL_TO_CM, fromBase: CM_TO_FT_DECIMAL },
    ],
  },
  {
    id: 'weight',
    stage: 'personal_data',
    type: 'ruler',
    title: '¿Cuál es tu peso actual?',
    subtitle: 'No pasa nada si lo aproximas, podrás actualizarlo más tarde',
    min: 30,
    max: 200,
    decimals: 1,
    defaultValue: 73.4,
    units: [
      { value: 'kg', label: 'kg', toBase: (v) => v, fromBase: (v) => v },
      { value: 'lbs', label: 'lbs', toBase: LB_TO_KG, fromBase: KG_TO_LB },
    ],
  },

  // ---------- Etapa 2: PAR-Q ----------
  // Numeración conservada tal cual la aportó el usuario (continúa un
  // cuestionario PAR-Q+ estándar cuyas preguntas 1-2 no se piden aquí).
  {
    id: 'parq_heart_condition',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Le ha dicho su médico alguna vez que padece una enfermedad cardiaca y que solo debe hacer aquella actividad física que le aconseje un médico?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_chest_pain_activity',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Tiene dolor en el pecho cuando hace actividad física?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_chest_pain_rest_last_month',
    stage: 'par_q',
    type: 'single_choice',
    title: 'En el último mes, ¿ha tenido dolor en el pecho cuando no hacía actividad física?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_dizziness_balance',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Pierde el equilibrio debido a mareos o se ha desmayado alguna vez?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_bone_joint_problem',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Tiene problemas en huesos o articulaciones (por ejemplo, espalda, rodilla o cadera) que puedan empeorar si aumenta la actividad física?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_bp_or_heart_medication',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Le receta su médico algún medicamento para la tensión arterial o un problema cardíaco?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_reason_not_to_exercise',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Conoce alguna razón por la cual no debería realizar actividad física?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_fitness_level',
    stage: 'par_q',
    type: 'scale',
    title: 'En una escala del 1 al 10, ¿cómo calificarías tu nivel de condición física actual?',
    min: 1,
    max: 10,
  },
  {
    id: 'parq_medical_history',
    stage: 'par_q',
    type: 'textarea',
    title: 'Indica cualquier historial médico relevante que pueda afectar a tu capacidad para realizar actividades físicas.',
    placeholder: 'Escribe aquí (o indica que no aplica)',
    required: false,
  },
  {
    id: 'parq_goals',
    stage: 'par_q',
    type: 'textarea',
    title: '¿Cuáles son tus objetivos?',
    placeholder: 'Ej. perder grasa, ganar músculo, mejorar mi salud general...',
  },

  // ---------- Etapa 3: Cuestionario de entrenamiento ----------
  // Añadida 2026-08-23 (pedido explícito): antes no había ninguna pregunta
  // estructurada de objetivo -- solo el texto libre `realistic_goal` más
  // abajo, que la pantalla de resultado (assessment_result_screen.tsx) no
  // podía usar para nada concreto. Con esto el coach recibe un dato
  // estructurado real en vez de tener que inferirlo (o peor, que la app se
  // lo invente con una fórmula genérica).
  {
    id: 'goal_type',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Cuál es tu objetivo principal?',
    subtitle: 'Tu coach lo usará para orientar tu plan de entrenamiento y nutrición',
    options: [
      { value: 'lose_fat', label: 'Perder grasa', icon: '🔥', emoji: true },
      { value: 'gain_muscle', label: 'Ganar masa muscular', icon: '💪', emoji: true },
      { value: 'recomposition', label: 'Recomposición corporal', icon: '⚖️', emoji: true },
      { value: 'maintain', label: 'Mantener mi forma física', icon: '🎯', emoji: true },
    ],
  },
  {
    id: 'activity_level',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Cuál es tu nivel de actividad?',
    subtitle: 'Tu movimiento diario general, fuera de tus entrenamientos',
    options: [
      { value: 'sedentary', label: 'Sedentario', subtitle: 'Poco o ningún ejercicio', icon: '🛋️', emoji: true },
      { value: 'light', label: 'Ligero', subtitle: 'Ejercicio ligero 1-3 días/semana', icon: '🚶', emoji: true },
      { value: 'moderate', label: 'Moderado', subtitle: 'Ejercicio moderado 3-5 días/semana', icon: '🏃', emoji: true },
      { value: 'active', label: 'Activo', subtitle: 'Ejercicio intenso 6-7 días/semana', icon: '💪', emoji: true },
      { value: 'very_active', label: 'Muy activo', subtitle: 'Ejercicio muy intenso o trabajo físico', icon: '🔥', emoji: true },
    ],
  },
  {
    id: 'lifestyle_type',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Cuál es tu estilo de vida?',
    subtitle: 'Solo toma en consideración tu movimiento diario, no tus entrenamientos.',
    options: [
      { value: 'mostly_sitting', label: 'Mayormente sentado', subtitle: 'Trabajo de escritorio o desde casa', icon: '🧑‍💻', emoji: true },
      { value: 'sometimes_standing', label: 'A veces de pie', subtitle: 'Mezcla de estar sentado y moverte', icon: '🧍', emoji: true },
      { value: 'mostly_standing', label: 'Mayormente de pie', subtitle: 'De pie o caminando con regularidad', icon: '🚶', emoji: true },
      { value: 'always_moving', label: 'En movimiento todo el día', subtitle: 'Trabajo físico o caminatas frecuentes', icon: '🏃', emoji: true },
      { value: 'heavy_labor', label: 'Trabajo físico intenso', subtitle: 'Labor pesada', icon: '👷', emoji: true },
    ],
  },
  {
    // El campo real del backend (training_experience_months, ver
    // api/onboardingV2.ts) sigue en meses -- solo cambia lo que se le
    // pregunta al usuario (pedido explícito: años en vez de meses, más
    // natural de estimar). La conversión ×12 se hace al enviar la etapa,
    // ver submitStage() en onboarding_v2_screen.tsx.
    id: 'training_experience_years',
    stage: 'training_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántos años llevas entrenando?',
    subtitle: 'Si nunca has entrenado, deja el valor en 0',
    min: 0,
    max: 30,
    defaultValue: 0,
    suffix: 'años',
  },
  {
    id: 'training_days_per_week',
    stage: 'training_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántos días a la semana puedes entrenar?',
    min: 1,
    max: 7,
    defaultValue: 3,
    suffix: 'días/semana',
  },
  {
    id: 'session_duration_preference',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Cuánto tiempo quieres que duren tus entrenamientos?',
    options: [
      { value: '30', label: '30 minutos', icon: '⚡', emoji: true },
      { value: '45', label: '45 minutos', icon: '⏱️', emoji: true },
      { value: '60', label: '60 minutos', icon: '🕐', emoji: true },
      { value: '90', label: '90 minutos', icon: '🕜', emoji: true },
      { value: '90_plus', label: 'Más de 90 minutos', icon: '⏳', emoji: true },
    ],
  },
  {
    id: 'training_mindset',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Cómo sueles entrenar?',
    options: [
      { value: 'rushed', label: 'Con prisa', icon: '🏃', emoji: true },
      { value: 'calm', label: 'Con calma', icon: '😌', emoji: true },
      { value: 'motivated', label: 'Con motivación', icon: '🔥', emoji: true },
      { value: 'unmotivated', label: 'Sin ganas', icon: '😴', emoji: true },
    ],
  },
  {
    id: 'previous_coaching',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Has tenido previamente un entrenador/a personal ya sea online o presencial? ¿O te has encargado tú de tus entrenamientos?',
    options: [
      { value: 'online_coach', label: 'Sí, entrenador/a online', icon: '💻', emoji: true },
      { value: 'in_person_coach', label: 'Sí, entrenador/a presencial', icon: '🧑‍🏫', emoji: true },
      { value: 'self_trained', label: 'No, yo mismo/a', icon: '🙋', emoji: true },
    ],
  },
  {
    id: 'current_routine_style',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Actualmente cómo son tus rutinas?',
    options: [
      { value: 'improvised', label: 'Improvisadas', icon: '🎲', emoji: true },
      { value: 'copied', label: 'Copiadas', icon: '📋', emoji: true },
      { value: 'structured', label: 'Con estructuración lógica', icon: '📐', emoji: true },
      { value: 'always_same', label: 'Siempre lo mismo', icon: '🔁', emoji: true },
      { value: 'very_varied', label: 'Muy variadas', icon: '🌀', emoji: true },
    ],
  },
  {
    id: 'weekly_split_preference',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Qué preferencia tienes de cara a estructurar tu plan semanal?',
    options: [
      { value: 'upper_lower', label: 'Torso - Pierna', icon: '🏋️', emoji: true },
      { value: 'push_pull', label: 'Empuje - Tirón', icon: '🔄', emoji: true },
      { value: 'full_body', label: 'Full body', icon: '🧍', emoji: true },
      { value: 'no_preference', label: 'Lo que mejor me convenga', icon: '🤷', emoji: true },
    ],
  },
  {
    id: 'technique_level',
    stage: 'training_questionnaire',
    type: 'scale',
    title: 'Valora tu nivel (o percepción) de la técnica de ejecución de los ejercicios que realizas',
    min: 1,
    max: 10,
  },
  {
    id: 'realistic_goal',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: '¿Cuál es tu objetivo realista?',
    placeholder: 'Describe tu objetivo con tus propias palabras',
  },

  // ---------- Etapa 4: Cuestionario de nutrición ----------
  {
    id: 'allergies_intolerances',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Tienes alguna alergia o intolerancia?',
    placeholder: 'Ej. lactosa, frutos secos, gluten... (o "ninguna")',
  },
  {
    id: 'disliked_foods',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Qué comidas o alimentos no te gustan y no quieres incluir en el plan nutricional?',
    required: false,
  },
  {
    id: 'liked_foods',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Qué comidas o alimentos te gustan y quieres incluir en el plan nutricional?',
    required: false,
  },
  {
    id: 'current_meals_per_day',
    stage: 'nutrition_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántas comidas realizas normalmente al día?',
    min: 1,
    max: 8,
    defaultValue: 3,
    suffix: 'comidas',
  },
  {
    id: 'desired_meals_per_day',
    stage: 'nutrition_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántas comidas te gustaría realizar al día?',
    min: 1,
    max: 8,
    defaultValue: 3,
    suffix: 'comidas',
  },
  {
    id: 'typical_day_meals',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: 'Explícame lo que comes durante un día entero (desayuno, comida, merienda y cena).',
  },
  {
    id: 'favorite_meats',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Cuáles son tus carnes favoritas?',
    required: false,
  },
  {
    id: 'favorite_fish',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Cuáles son tus pescados favoritos?',
    required: false,
  },
  {
    id: 'favorite_fruits_vegetables',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Cuáles son tus frutas y verduras preferidas?',
    required: false,
  },
  {
    id: 'favorite_combined_dishes',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Cuáles son tus comidas combinadas favoritas?',
    required: false,
  },
];
