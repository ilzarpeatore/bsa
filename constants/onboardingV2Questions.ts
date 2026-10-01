import { firstNameOf, MultiChoiceOption, OnboardingAnswers, OnboardingQuestion } from '../types/onboardingV2';

// Definición declarativa del onboarding. Una única screen genérica
// (onboarding_v2_screen.tsx) recorre este array y renderiza el widget
// correcto según `type`. Ver docs/ONBOARDING_V2.md para el contrato de cada
// pregunta (id de respuesta, tipo, endpoint destino).
//
// Rediseño 2026-09-29 (pedido explícito: "optimiza el onboarding"; base en
// docs/ONBOARDING_INVESTIGACION.md):
// - Secciones ordenadas por esfuerzo: un gancho corto y rápido (objetivo,
//   nombre), después lo que más cuesta responder (nutrición, entrenamiento) y
//   al final lo más rápido (salud, día a día, medidas, cuenta).
// - Cada sección empieza con una pantalla `intro`: por qué lo preguntamos y
//   cómo lo usa el entrenador.
// - Textos libres convertidos en "puertas" Sí/No o checklists (alergias,
//   medicación, dietas previas, PAR-Q): la mayoría responde con un toque y
//   solo quien tiene algo que contar ve el campo de texto.
// - Preguntas que no aplican se ocultan (showIf): embarazo solo a mujeres,
//   detalles de lesión solo si hay lesión, historial de entrenamiento solo
//   si ya ha entrenado...
// - Fusionadas: lugar + material (una pantalla), favoritos (una pantalla con
//   4 campos), email + teléfono. Eliminadas por redundantes: nivel de
//   actividad (se deriva de estilo de vida + días de entreno, ver
//   deriveActivityLevel), horario de comidas (va dentro del "día normal"),
//   alimentos que te gustan (cubierto por los favoritos) y el detalle de
//   material por separado.

// cm -> pies decimales (ej. 170cm ~= 5.6 ft) y de vuelta -- solo para el
// número mostrado en el toggle cm/ft, el valor guardado siempre es en cm
// (ver comentario de unidad base en RulerPicker.tsx).
const CM_TO_FT_DECIMAL = (cm: number) => Math.round((cm / 2.54 / 12) * 10) / 10;
const FT_DECIMAL_TO_CM = (ft: number) => Math.round(ft * 12 * 2.54);
const KG_TO_LB = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const LB_TO_KG = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;

const YES_NO = [
  { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
  { value: 'no', label: 'No', icon: '❌', emoji: true },
];

const isFemale = (a: OnboardingAnswers) => a.gender === 'female';
const hasTrained = (a: OnboardingAnswers) => Number(a.training_experience_years) > 0;
const selected = (a: OnboardingAnswers, id: string, value: string) =>
  Array.isArray(a[id]) && (a[id] as string[]).includes(value);

// Preguntas Sí/No del PAR-Q+ (columnas booleanas de par_q_answers). En el
// onboarding se responden todas en UNA pantalla tipo checklist
// (`parq_conditions`, con "Ninguna de estas" excluyente), en vez de 7-10
// pantallas de Sí/No; submitStage() traduce la lista a un booleano por
// columna. La pantalla "Mis respuestas" (onboarding_data_screen.tsx) las
// sigue mostrando una a una a partir de esta misma lista.
export const PARQ_CONDITIONS: { id: string; label: string; femaleOnly?: boolean }[] = [
  { id: 'parq_heart_condition', label: 'Un médico me ha dicho que tengo una enfermedad cardiaca y que solo haga la actividad física que me recomiende' },
  { id: 'parq_chest_pain_activity', label: 'Siento dolor en el pecho cuando hago actividad física' },
  { id: 'parq_chest_pain_rest_last_month', label: 'En el último mes he tenido dolor en el pecho estando en reposo' },
  { id: 'parq_dizziness_balance', label: 'Pierdo el equilibrio por mareos o me he desmayado alguna vez' },
  { id: 'parq_bone_joint_problem', label: 'Tengo problemas de huesos o articulaciones (espalda, rodilla, cadera...) que podrían empeorar con más actividad' },
  { id: 'parq_bp_or_heart_medication', label: 'Tomo medicación para la tensión arterial o para el corazón' },
  { id: 'parq_reason_not_to_exercise', label: 'Conozco otra razón por la que no debería hacer actividad física' },
  { id: 'parq_eating_disorder_history', label: 'Tengo o he tenido un trastorno de la conducta alimentaria' },
  { id: 'parq_pregnant_or_possible', label: 'Estoy embarazada o podría estarlo', femaleOnly: true },
  { id: 'parq_menstrual_change_or_stress_fracture', label: 'He perdido la menstruación de forma inesperada o he tenido una fractura por estrés', femaleOnly: true },
];

// El backend sigue guardando activity_level (lo usa la pantalla de resumen
// para el multiplicador de gasto calórico), pero preguntarlo aparte de
// lifestyle_type era redundante -- ambos describían el movimiento diario.
// Se deriva: movimiento fuera del gimnasio + días de entrenamiento.
export function deriveActivityLevel(a: OnboardingAnswers): 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' {
  const lifestyleScore: Record<string, number> = {
    mostly_sitting: 0,
    sometimes_standing: 1,
    mostly_standing: 2,
    always_moving: 3,
    heavy_labor: 4,
  };
  const days = Number(a.training_days_per_week) || 0;
  const trainingScore = days <= 2 ? 0 : days <= 4 ? 1 : 2;
  const score = (lifestyleScore[String(a.lifestyle_type)] ?? 0) + trainingScore;
  if (score <= 0) return 'sedentary';
  if (score === 1) return 'light';
  if (score === 2) return 'moderate';
  if (score === 3) return 'active';
  return 'very_active';
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  // ======================= 1. Tu objetivo (gancho) =======================
  // Rápido a propósito: las primeras pantallas deciden si la persona sigue.
  // Empezar con su objetivo (como Duolingo/Noom) crea compromiso antes de
  // pedir esfuerzo.
  {
    id: 'intro_goal',
    section: 'goal',
    type: 'intro',
    emoji: '👋',
    title: 'Vamos a diseñar tu plan',
    why: 'Tu plan lo prepara un entrenador de verdad, no una plantilla. Cuanto mejor te conozca, mejor se ajustará a ti desde el primer día.',
    coachUse: 'Tu entrenador leerá todas tus respuestas antes de preparar tu plan de entrenamiento y nutrición. Podrás cambiarlas cuando quieras desde tu perfil.',
    minutes: '5-7 min',
  },
  {
    id: 'goal_type',
    section: 'goal',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cuál es tu objetivo principal?',
    options: [
      { value: 'lose_fat', label: 'Perder grasa', icon: '🔥', emoji: true },
      { value: 'gain_muscle', label: 'Ganar masa muscular', icon: '💪', emoji: true },
      { value: 'recomposition', label: 'Recomposición corporal', subtitle: 'Perder grasa y ganar músculo a la vez', icon: '⚖️', emoji: true },
      { value: 'maintain', label: 'Mantener mi forma física', icon: '🎯', emoji: true },
    ],
  },
  // Pedido explícito 2026-09-29: justo después de goal_type. Se guarda con
  // el PAR-Q (campo parq_goals de POST v1/onboarding/par-q).
  {
    id: 'parq_goals',
    section: 'goal',
    stage: 'par_q',
    type: 'textarea',
    title: 'Especifica más tus objetivos',
    subtitle: 'Cuanto más concreto, mejor: qué quieres conseguir y para cuándo',
    placeholder: 'Ej. perder 5 kg antes del verano, hacer 10 dominadas, sentirme con más energía...',
  },
  {
    id: 'name',
    section: 'goal',
    stage: 'personal_data',
    type: 'name',
    title: '¿Cómo te llamas?',
    subtitle: 'Así te llamará tu entrenador',
  },
  {
    id: 'gender',
    section: 'goal',
    stage: 'personal_data',
    type: 'single_choice',
    autoAdvance: true,
    title: (a) => (firstNameOf(a) ? `Encantados, ${firstNameOf(a)}. ¿Cuál es tu sexo?` : '¿Cuál es tu sexo?'),
    subtitle: 'Lo usamos para calcular tu metabolismo y adaptar las preguntas de salud',
    options: [
      { value: 'male', label: 'Hombre', icon: '♂️', emoji: true },
      { value: 'female', label: 'Mujer', icon: '♀️', emoji: true },
      // Icono Ionicons (no emoji ⚧️, que en iOS sale a todo color) para que
      // las 3 opciones tengan el mismo estilo monocromo.
      { value: 'other', label: 'Otro / Prefiero no decirlo', icon: 'male-female-outline' },
    ],
  },
  {
    id: 'has_target_event',
    section: 'goal',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Te estás preparando para alguna fecha concreta?',
    subtitle: 'Una carrera, un HYROX, unas oposiciones, una boda...',
    options: YES_NO,
  },
  {
    id: 'target_event_description',
    section: 'goal',
    stage: 'training_questionnaire',
    type: 'text',
    title: '¿Qué evento es?',
    placeholder: 'Ej. HYROX Madrid, media maratón de Valencia...',
    showIf: (a) => a.has_target_event === 'yes',
  },
  // El backend guarda una fecha (target_event_date); aquí se pregunta en
  // semanas porque la app no tiene selector de fecha -- se convierte al
  // enviar, ver submitStage().
  {
    id: 'target_event_weeks',
    section: 'goal',
    stage: 'training_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántas semanas faltan, aproximadamente?',
    showIf: (a) => a.has_target_event === 'yes',
    min: 1,
    max: 104,
    defaultValue: 12,
    suffix: 'semanas',
  },

  // ===================== 2. Nutrición (la que más cuesta) =====================
  {
    id: 'intro_nutrition',
    section: 'nutrition',
    type: 'intro',
    emoji: '🥗',
    title: (a) => (firstNameOf(a) ? `Hablemos de cómo comes, ${firstNameOf(a)}` : 'Hablemos de cómo comes'),
    why: 'Un plan de nutrición que no encaja con tu día a día no se cumple. Queremos partir de lo que ya comes y te gusta, no de una dieta genérica.',
    coachUse: 'Tu entrenador ajustará calorías, número de comidas y recetas a tus gustos, alergias, horarios, presupuesto y tiempo para cocinar.',
    minutes: '2-3 min',
  },
  {
    id: 'typical_day_meals',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: 'Cuéntanos qué comes en un día normal',
    subtitle: 'Desayuno, comida, merienda y cena, con la hora aproximada de cada una',
    placeholder: 'Ej. 7:30 café con tostadas · 14:00 arroz con pollo · 18:00 yogur · 21:30 tortilla y ensalada',
  },
  {
    id: 'disliked_foods',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Hay algo que no te guste o no quieras en tu plan?',
    placeholder: 'Ej. brócoli, hígado, pescado azul... (o déjalo en blanco)',
    required: false,
  },
  {
    id: 'favorite_foods',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'text_group',
    title: '¿Cuáles son tus favoritos?',
    subtitle: 'Los usaremos para que tu plan te apetezca. Rellena solo los que quieras',
    required: false,
    fields: [
      { id: 'favorite_meats', label: 'Carnes', placeholder: 'Ej. pollo, ternera' },
      { id: 'favorite_fish', label: 'Pescados', placeholder: 'Ej. salmón, merluza' },
      { id: 'favorite_fruits_vegetables', label: 'Frutas y verduras', placeholder: 'Ej. plátano, espinacas' },
      { id: 'favorite_combined_dishes', label: 'Platos', placeholder: 'Ej. lentejas, paella' },
    ],
  },
  // Puerta: sin alergias se envía "Ninguna" a allergies_intolerances
  // (obligatorio en el backend), ver submitStage().
  {
    id: 'has_allergies',
    section: 'nutrition',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Tienes alguna alergia o intolerancia alimentaria?',
    options: YES_NO,
  },
  {
    id: 'allergies_intolerances',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Cuáles? ¿Es alergia o intolerancia?',
    subtitle: 'Si es una alergia grave, indícalo',
    placeholder: 'Ej. intolerancia a la lactosa; alergia grave a los frutos secos',
    showIf: (a) => a.has_allergies === 'yes',
  },
  {
    id: 'meds_supps',
    section: 'nutrition',
    type: 'multi_choice',
    title: '¿Tomas medicación o suplementos?',
    subtitle: 'Nos ayuda a ajustar tu plan con seguridad',
    options: [
      { value: 'medications', label: 'Medicación', icon: '💊', emoji: true },
      { value: 'supplements', label: 'Suplementos', subtitle: 'Proteína, creatina, vitaminas...', icon: '🧴', emoji: true },
      { value: 'none', label: 'Ninguno', icon: '🚫', emoji: true, exclusive: true },
    ],
  },
  {
    id: 'medications',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Qué medicación tomas?',
    placeholder: 'Ej. anticoagulantes, metformina...',
    showIf: (a) => selected(a, 'meds_supps', 'medications'),
  },
  {
    id: 'supplements',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Qué suplementos tomas?',
    placeholder: 'Ej. creatina, proteína, vitamina D...',
    showIf: (a) => selected(a, 'meds_supps', 'supplements'),
  },
  {
    id: 'has_previous_diets',
    section: 'nutrition',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Has seguido alguna dieta antes?',
    options: YES_NO,
  },
  {
    id: 'previous_diets',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Cuál y qué tal te fue?',
    subtitle: 'Saber qué no te funcionó es tan útil como saber qué sí',
    placeholder: 'Ej. keto 3 meses, perdí peso pero lo recuperé al dejarla',
    showIf: (a) => a.has_previous_diets === 'yes',
  },
  {
    id: 'current_meals_per_day',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántas comidas haces normalmente al día?',
    min: 1,
    max: 8,
    defaultValue: 3,
    suffix: 'comidas',
  },
  {
    id: 'desired_meals_per_day',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'number_wheel',
    title: '¿Y cuántas te gustaría hacer?',
    min: 1,
    max: 8,
    defaultValue: 3,
    suffix: 'comidas',
  },
  {
    id: 'meals_away_from_home',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: 'Entre semana, ¿dónde sueles comer al mediodía?',
    options: [
      { value: 'home', label: 'En casa', icon: '🏠', emoji: true },
      { value: 'tupper', label: 'Me llevo tupper', icon: '🥡', emoji: true },
      { value: 'restaurant', label: 'Restaurante o menú del día', icon: '🍽️', emoji: true },
      { value: 'mixed', label: 'Depende del día', icon: '🔀', emoji: true },
    ],
  },
  {
    id: 'intermittent_fasting',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Haces ayuno intermitente?',
    options: YES_NO,
  },
  {
    id: 'cooking_minutes_per_meal',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'number_wheel',
    title: '¿Cuánto tiempo tienes para cocinar cada comida?',
    subtitle: 'El tiempo real que sueles tener, no un ideal',
    min: 0,
    max: 180,
    step: 5,
    defaultValue: 20,
    suffix: 'minutos',
  },
  {
    id: 'cooking_skill_level',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cómo te defines cocinando?',
    options: [
      { value: 'beginner', label: 'Principiante', icon: '🥄', emoji: true },
      { value: 'intermediate', label: 'Intermedio', icon: '🍳', emoji: true },
      { value: 'advanced', label: 'Avanzado', icon: '👨‍🍳', emoji: true },
    ],
  },
  {
    id: 'cooks_for_others',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cocinas también para otras personas?',
    subtitle: 'Pareja, familia, compañeros de piso...',
    options: YES_NO,
  },
  {
    id: 'weekly_food_budget',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cuánto sueles gastar a la semana en comida para ti?',
    options: [
      { value: 'under_40', label: 'Menos de 40 €' },
      { value: '40_70', label: 'Entre 40 y 70 €' },
      { value: '70_100', label: 'Entre 70 y 100 €' },
      { value: '100_150', label: 'Entre 100 y 150 €' },
      { value: 'over_150', label: 'Más de 150 €' },
      { value: 'unknown', label: 'No lo sé' },
    ],
  },
  {
    id: 'alcohol_frequency',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Con qué frecuencia tomas alcohol?',
    options: [
      { value: 'never', label: 'Nunca' },
      { value: 'occasional', label: 'Ocasionalmente', subtitle: '1-2 veces al mes' },
      { value: 'weekends', label: 'Los fines de semana' },
      { value: 'several_per_week', label: 'Varias veces por semana' },
      { value: 'daily', label: 'A diario' },
    ],
  },
  {
    id: 'water_intake',
    section: 'nutrition',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cuánta agua bebes al día?',
    options: [
      { value: 'under_1l', label: 'Menos de 1 litro' },
      { value: '1_1_5l', label: 'Entre 1 y 1,5 litros' },
      { value: '1_5_2l', label: 'Entre 1,5 y 2 litros' },
      { value: '2_3l', label: 'Entre 2 y 3 litros' },
      { value: 'over_3l', label: 'Más de 3 litros' },
    ],
  },

  // ============================ 3. Entrenamiento ============================
  {
    id: 'intro_training',
    section: 'training',
    type: 'intro',
    emoji: '🏋️',
    title: 'Ahora, tu entrenamiento',
    why: 'Con tu experiencia, tu material y tu tiempo real evitamos rutinas que no puedes hacer o que se te quedan cortas.',
    coachUse: 'Tu entrenador elegirá ejercicios que puedas hacer con lo que tienes, ajustará las cargas de la primera semana a tu nivel y repartirá los días según tu disponibilidad.',
    minutes: '2 min',
  },
  // Va primero: de ella dependen las preguntas de historial (solo si ya ha
  // entrenado). El backend sigue en meses (×12 al enviar, ver submitStage()).
  {
    id: 'training_experience_years',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántos años llevas entrenando?',
    subtitle: 'Si nunca has entrenado, deja el valor en 0',
    min: 0,
    max: 30,
    defaultValue: 0,
    suffix: 'años',
  },
  // Reutiliza la columna realistic_goal (antes "¿Cuál es tu objetivo
  // realista?"), sin migración.
  {
    id: 'realistic_goal',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: 'Describe cómo entrenabas anteriormente',
    subtitle: 'Por ejemplo: cómo dividías los grupos musculares, qué tipos de ejercicios hacías, cómo los organizabas, etc.',
    placeholder: 'Ej. 4 días torso-pierna, básicos con barra y algo de máquinas, sin una progresión fija...',
    showIf: hasTrained,
  },
  {
    id: 'strength_references',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'strength_references',
    title: '¿Cuánto peso mueves en estos ejercicios?',
    subtitle: 'El peso con el que haces unas 8-10 repeticiones con buena técnica. Si no haces un ejercicio o no lo sabes, déjalo en blanco',
    required: false,
    showIf: hasTrained,
    exercises: [
      { key: 'squat', label: 'Sentadilla con barra', hint: 'Peso total (barra + discos)' },
      { key: 'deadlift', label: 'Peso muerto', hint: 'Peso total (barra + discos)' },
      { key: 'db_bench', label: 'Press banca con mancuernas', hint: 'Peso de cada mancuerna' },
      { key: 'db_row', label: 'Remo con mancuerna', hint: 'Peso de la mancuerna' },
    ],
  },
  // Lugar + material en UNA pregunta (pedido explícito 2026-09-29), en vez
  // de "dónde entrenas" y luego "qué material tienes".
  {
    id: 'training_location',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Dónde vas a entrenar y con qué material?',
    options: [
      { value: 'full_gym', label: 'Gimnasio completo', subtitle: 'Máquinas, barras, mancuernas, poleas', icon: '🏋️', emoji: true },
      { value: 'gym_basic', label: 'Gimnasio con poco material', subtitle: 'De comunidad, hotel o pequeño', icon: '🏢', emoji: true },
      { value: 'gym_no_equipment', label: 'Gimnasio sin material', subtitle: 'Sala diáfana, solo peso corporal', icon: '🧱', emoji: true },
      { value: 'home_full', label: 'En casa con mucho material', subtitle: 'Rack, barra, discos, banco...', icon: '🏠', emoji: true },
      { value: 'home_basic', label: 'En casa con poco material', subtitle: 'Mancuernas, bandas, kettlebell...', icon: '🏡', emoji: true },
      { value: 'home_none', label: 'En casa sin material', subtitle: 'Solo peso corporal', icon: '🧘', emoji: true },
    ],
  },
  {
    id: 'equipment_notes',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: '¿Qué material tienes exactamente?',
    subtitle: 'Opcional, pero ayuda mucho a elegir tus ejercicios',
    placeholder: 'Ej. mancuernas de hasta 20 kg, bandas elásticas y una barra de dominadas',
    required: false,
    showIf: (a) => a.training_location === 'home_basic' || a.training_location === 'gym_basic',
  },
  {
    id: 'practices_other_sport',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Practicas algún otro deporte?',
    subtitle: 'Running, fútbol, pádel, ciclismo...',
    options: YES_NO,
  },
  {
    id: 'other_sport_description',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: '¿Qué deporte y cuánto?',
    placeholder: 'Ej. running 3 días a la semana, unos 25 km; pádel los domingos',
    showIf: (a) => a.practices_other_sport === 'yes',
  },
  {
    id: 'training_days_per_week',
    section: 'training',
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
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
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
    id: 'training_time_of_day',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿A qué hora del día sueles entrenar?',
    options: [
      { value: 'morning', label: 'Por la mañana', icon: '🌅', emoji: true },
      { value: 'midday', label: 'A mediodía', icon: '☀️', emoji: true },
      { value: 'afternoon', label: 'Por la tarde', icon: '🌇', emoji: true },
      { value: 'evening', label: 'Por la noche', icon: '🌙', emoji: true },
      { value: 'variable', label: 'Depende del día', icon: '🔀', emoji: true },
    ],
  },
  // Solo si ya ha entrenado: a quien empieza de cero no le aportan nada (el
  // backend las admite vacías en ese caso, ver trainingRules en Bckbs).
  {
    id: 'weekly_split_preference',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cómo prefieres organizar tu semana?',
    showIf: hasTrained,
    options: [
      { value: 'upper_lower', label: 'Torso - Pierna', icon: '🏋️', emoji: true },
      { value: 'push_pull', label: 'Empuje - Tirón', icon: '🔄', emoji: true },
      { value: 'full_body', label: 'Full body', icon: '🧍', emoji: true },
      { value: 'no_preference', label: 'Lo que mejor me convenga', icon: '🤷', emoji: true },
    ],
  },
  {
    id: 'previous_coaching',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Has tenido entrenador/a personal antes?',
    showIf: hasTrained,
    options: [
      { value: 'online_coach', label: 'Sí, online', icon: '💻', emoji: true },
      { value: 'in_person_coach', label: 'Sí, presencial', icon: '🧑‍🏫', emoji: true },
      { value: 'self_trained', label: 'No, me entreno yo', icon: '🙋', emoji: true },
    ],
  },
  {
    id: 'current_routine_style',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cómo son tus rutinas ahora?',
    showIf: hasTrained,
    options: [
      { value: 'improvised', label: 'Improvisadas', icon: '🎲', emoji: true },
      { value: 'copied', label: 'Copiadas', icon: '📋', emoji: true },
      { value: 'structured', label: 'Con estructuración lógica', icon: '📐', emoji: true },
      { value: 'always_same', label: 'Siempre lo mismo', icon: '🔁', emoji: true },
      { value: 'very_varied', label: 'Muy variadas', icon: '🌀', emoji: true },
    ],
  },
  {
    id: 'training_mindset',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cómo sueles entrenar?',
    showIf: hasTrained,
    options: [
      { value: 'rushed', label: 'Con prisa', icon: '🏃', emoji: true },
      { value: 'calm', label: 'Con calma', icon: '😌', emoji: true },
      { value: 'motivated', label: 'Con motivación', icon: '🔥', emoji: true },
      { value: 'unmotivated', label: 'Sin ganas', icon: '😴', emoji: true },
    ],
  },
  {
    id: 'technique_level',
    section: 'training',
    stage: 'training_questionnaire',
    type: 'scale',
    title: 'Del 1 al 10, ¿cómo valoras tu técnica en los ejercicios?',
    showIf: hasTrained,
    min: 1,
    max: 10,
  },

  // ============================== 4. Salud ==============================
  {
    id: 'intro_health',
    section: 'health',
    type: 'intro',
    emoji: '🩺',
    title: 'Tu salud es lo primero',
    why: 'Son las preguntas de seguridad estándar (cuestionario PAR-Q+) que se hacen antes de empezar cualquier programa de ejercicio.',
    coachUse: 'Si algo requiere precaución, tu entrenador lo revisará antes de asignarte el plan y adaptará o sustituirá los ejercicios que puedan molestarte. Tus respuestas son confidenciales.',
    minutes: '1 min',
  },
  // Checklist en UNA pantalla en vez de un Sí/No por pantalla. Obligatorio
  // marcar algo ("Ninguna de estas" incluido): no responder no puede
  // confundirse con un "no".
  {
    id: 'parq_conditions',
    section: 'health',
    type: 'multi_choice',
    title: '¿Te aplica alguna de estas situaciones?',
    subtitle: 'Marca todas las que correspondan',
    options: [
      ...PARQ_CONDITIONS.map(
        (c): MultiChoiceOption => ({ value: c.id, label: c.label, showIf: c.femaleOnly ? isFemale : undefined })
      ),
      { value: 'none', label: 'Ninguna de estas', icon: '👍', emoji: true, exclusive: true },
    ],
  },
  {
    id: 'parq_medical_history',
    section: 'health',
    stage: 'par_q',
    type: 'textarea',
    title: 'Cuéntanos un poco más',
    subtitle: 'Diagnóstico, desde cuándo, si estás en tratamiento... Tu entrenador lo tendrá en cuenta',
    placeholder: 'Escribe aquí',
    required: false,
    showIf: (a) => Array.isArray(a.parq_conditions) && a.parq_conditions.some((v) => v !== 'none'),
  },
  // Lesión principal, estructurada: el agente de entrenamiento necesita
  // zona, gesto que duele, fase e impacto para sustituir ejercicios. Los
  // detalles solo si hay lesión.
  {
    id: 'injury_has',
    section: 'health',
    stage: 'par_q',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Tienes o has tenido alguna lesión o molestia que debamos tener en cuenta?',
    options: YES_NO,
  },
  {
    id: 'injury_zone',
    section: 'health',
    stage: 'par_q',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Dónde está la lesión o molestia principal?',
    subtitle: 'Si tienes varias, elige la que más te limita. Podrás contarnos el resto después',
    showIf: (a) => a.injury_has === 'yes',
    options: [
      { value: 'neck', label: 'Cuello' },
      { value: 'shoulder', label: 'Hombro' },
      { value: 'elbow', label: 'Codo' },
      { value: 'wrist_hand', label: 'Muñeca o mano' },
      { value: 'upper_back', label: 'Espalda alta' },
      { value: 'lower_back', label: 'Zona lumbar' },
      { value: 'hip', label: 'Cadera' },
      { value: 'knee', label: 'Rodilla' },
      { value: 'ankle_foot', label: 'Tobillo o pie' },
      { value: 'other', label: 'Otra' },
    ],
  },
  {
    id: 'injury_painful_movement',
    section: 'health',
    stage: 'par_q',
    type: 'textarea',
    title: '¿Qué movimiento o gesto te provoca dolor?',
    placeholder: 'Ej. bajar en sentadilla profunda, levantar el brazo por encima de la cabeza, correr...',
    showIf: (a) => a.injury_has === 'yes',
  },
  {
    id: 'injury_phase',
    section: 'health',
    stage: 'par_q',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿En qué momento está esa lesión?',
    showIf: (a) => a.injury_has === 'yes',
    options: [
      { value: 'acute', label: 'Aguda', subtitle: 'Me duele ahora o es muy reciente', icon: '🔴', emoji: true },
      { value: 'recovering', label: 'En recuperación', subtitle: 'Estoy en rehabilitación o volviendo a entrenar', icon: '🟡', emoji: true },
      { value: 'chronic_controlled', label: 'Antigua o controlada', subtitle: 'No me limita en el día a día', icon: '🟢', emoji: true },
    ],
  },
  {
    id: 'injury_worsens_with_impact',
    section: 'health',
    stage: 'par_q',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿El dolor empeora con impacto o con la actividad?',
    subtitle: 'Por ejemplo al correr, saltar o cambiar de dirección',
    showIf: (a) => a.injury_has === 'yes',
    options: [...YES_NO, { value: 'unknown', label: 'No lo sé', icon: '🤷', emoji: true }],
  },
  {
    id: 'injury_professional_clearance',
    section: 'health',
    stage: 'par_q',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Algún médico o fisio te ha dado el visto bueno para entrenar?',
    showIf: (a) => a.injury_has === 'yes',
    options: [
      { value: 'cleared', label: 'Sí, puedo entrenar con normalidad', icon: '✅', emoji: true },
      { value: 'with_limits', label: 'Sí, pero con limitaciones', icon: '⚠️', emoji: true },
      { value: 'not_consulted', label: 'No lo he consultado', icon: '❔', emoji: true },
    ],
  },
  {
    id: 'injury_other_notes',
    section: 'health',
    stage: 'par_q',
    type: 'textarea',
    title: '¿Alguna otra lesión o molestia?',
    placeholder: 'Descríbela brevemente (o déjalo en blanco)',
    required: false,
    showIf: (a) => a.injury_has === 'yes',
  },
  {
    id: 'parq_fitness_level',
    section: 'health',
    stage: 'par_q',
    type: 'scale',
    title: 'Del 1 al 10, ¿cómo está tu forma física ahora mismo?',
    min: 1,
    max: 10,
  },

  // =========================== 5. Tu día a día ===========================
  {
    id: 'intro_lifestyle',
    section: 'lifestyle',
    type: 'intro',
    emoji: '🌙',
    title: 'Tu día a día',
    why: 'Lo que pasa fuera del gimnasio (trabajo, sueño, estrés) decide cuánto entrenamiento puedes recuperar.',
    coachUse: 'Tu entrenador ajustará el volumen y la intensidad a tu descanso y tu estrés, y colocará sesiones y comidas en horarios que te encajen.',
    minutes: '1 min',
  },
  {
    id: 'lifestyle_type',
    section: 'lifestyle',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cuánto te mueves en tu día a día?',
    subtitle: 'Sin contar tus entrenamientos',
    options: [
      { value: 'mostly_sitting', label: 'Mayormente sentado', subtitle: 'Trabajo de escritorio o desde casa', icon: '🧑‍💻', emoji: true },
      { value: 'sometimes_standing', label: 'A veces de pie', subtitle: 'Mezcla de estar sentado y moverte', icon: '🧍', emoji: true },
      { value: 'mostly_standing', label: 'Mayormente de pie', subtitle: 'De pie o caminando con regularidad', icon: '🚶', emoji: true },
      { value: 'always_moving', label: 'En movimiento todo el día', subtitle: 'Trabajo físico o caminatas frecuentes', icon: '🏃', emoji: true },
      { value: 'heavy_labor', label: 'Trabajo físico intenso', subtitle: 'Labor pesada', icon: '👷', emoji: true },
    ],
  },
  {
    id: 'work_schedule',
    section: 'lifestyle',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Cómo es tu horario de trabajo o estudios?',
    options: [
      { value: 'morning', label: 'Fijo de mañana', icon: '🌅', emoji: true },
      { value: 'afternoon', label: 'Fijo de tarde', icon: '🌇', emoji: true },
      { value: 'split', label: 'Jornada partida', icon: '🕐', emoji: true },
      { value: 'rotating_shifts', label: 'Turnos rotativos', icon: '🔄', emoji: true },
      { value: 'night', label: 'Nocturno', icon: '🌙', emoji: true },
      { value: 'flexible', label: 'Flexible', icon: '🧘', emoji: true },
      { value: 'not_working', label: 'No trabajo ni estudio ahora', icon: '🏠', emoji: true },
    ],
  },
  {
    id: 'sleep_hours',
    section: 'lifestyle',
    stage: 'training_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántas horas duermes normalmente?',
    min: 3,
    max: 12,
    defaultValue: 7,
    suffix: 'horas',
  },
  {
    id: 'sleep_regularity',
    section: 'lifestyle',
    stage: 'training_questionnaire',
    type: 'single_choice',
    autoAdvance: true,
    title: '¿Tu horario de sueño es regular?',
    options: [
      { value: 'regular', label: 'Sí, regular', subtitle: 'Me acuesto y me levanto a horas parecidas', icon: '😴', emoji: true },
      { value: 'irregular', label: 'No, irregular', subtitle: 'Turnos, horarios cambiantes o me acuesto muy tarde', icon: '🌀', emoji: true },
    ],
  },
  {
    id: 'stress_level',
    section: 'lifestyle',
    stage: 'training_questionnaire',
    type: 'scale',
    title: 'Del 1 al 10, ¿cuánto estrés tienes en tu día a día?',
    min: 1,
    max: 10,
  },

  // ============================ 6. Sobre ti ============================
  {
    id: 'intro_about',
    section: 'about',
    type: 'intro',
    emoji: '📏',
    title: 'Últimos datos',
    why: 'Con tu edad, altura y peso calculamos tu gasto de energía de partida.',
    coachUse: 'Tu entrenador usará estas cifras para fijar tus calorías iniciales y seguir tu evolución semana a semana.',
    minutes: '30 s',
  },
  {
    id: 'age',
    section: 'about',
    stage: 'personal_data',
    type: 'number_wheel',
    title: '¿Cuántos años tienes?',
    min: 14,
    max: 90,
    defaultValue: 27,
    suffix: 'años',
  },
  {
    id: 'height',
    section: 'about',
    stage: 'personal_data',
    type: 'ruler',
    title: '¿Cuánto mides?',
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
    section: 'about',
    stage: 'personal_data',
    type: 'ruler',
    title: '¿Cuánto pesas?',
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

  // ============================ 7. Tu cuenta ============================
  // Registro diferido al final (pedido explícito 2026-08-29): estas
  // preguntas crean la cuenta (ver handleContinue). Solo se muestran si
  // todavía no hay cuenta -- ver el filtro `questions` en la pantalla.
  {
    id: 'intro_account',
    section: 'account',
    type: 'intro',
    emoji: '🎉',
    title: (a) => (firstNameOf(a) ? `¡Ya casi está, ${firstNameOf(a)}!` : '¡Ya casi está!'),
    why: 'Crea tu cuenta para guardar tus respuestas. Sin ella, no podemos preparar tu plan.',
    coachUse: 'Tu entrenador verá tu perfil completo y podrá ponerse en contacto contigo para darte la bienvenida.',
  },
  {
    id: 'contact',
    section: 'account',
    stage: 'credentials',
    type: 'contact',
    title: '¿Dónde te contactamos?',
    subtitle: 'Tu email será tu usuario para entrar en la app',
  },
  {
    id: 'password',
    section: 'account',
    stage: 'credentials',
    type: 'password',
    title: 'Crea una contraseña',
    subtitle: 'Mínimo 8 caracteres',
    placeholder: 'Introduce tu contraseña',
  },
];
