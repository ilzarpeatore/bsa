import { OnboardingQuestion } from '../types/onboardingV2';

// Definición declarativa de las preguntas del nuevo onboarding, agrupadas
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

// Opciones Sí/No de las preguntas añadidas el 2026-09-29 (las anteriores
// repiten el mismo array inline).
const YES_NO = [
  { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
  { value: 'no', label: 'No', icon: '❌', emoji: true },
];

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
  // Lesión/molestia principal, estructurada (2026-09-29): el agente de
  // entrenamiento necesita zona, gesto que duele, fase y si empeora con
  // impacto para sustituir ejercicios -- con solo el Sí/No de arriba y un
  // texto libre se bloqueaba por datos ambiguos. Las 6 de detalle solo se
  // muestran si `injury_has` es "Sí" (y solo se envían en ese caso, ver
  // submitStage()).
  {
    id: 'injury_has',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Tienes o has tenido alguna lesión o molestia que debamos tener en cuenta al entrenar?',
    options: YES_NO,
  },
  {
    id: 'injury_zone',
    stage: 'par_q',
    type: 'single_choice',
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
    stage: 'par_q',
    type: 'textarea',
    title: '¿Qué movimiento o gesto concreto te provoca dolor?',
    placeholder: 'Ej. bajar en sentadilla profunda, levantar el brazo por encima de la cabeza, correr...',
    showIf: (a) => a.injury_has === 'yes',
  },
  {
    id: 'injury_phase',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿En qué momento está esa lesión?',
    showIf: (a) => a.injury_has === 'yes',
    options: [
      { value: 'acute', label: 'Aguda', subtitle: 'Me duele ahora o es muy reciente', icon: '🔴', emoji: true },
      { value: 'recovering', label: 'En recuperación', subtitle: 'Estoy en rehabilitación o volviendo a entrenar', icon: '🟡', emoji: true },
      { value: 'chronic_controlled', label: 'Antigua o controlada', subtitle: 'No me limita en el día a día, pero quiero tenerla en cuenta', icon: '🟢', emoji: true },
    ],
  },
  {
    id: 'injury_worsens_with_impact',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿El dolor empeora con impacto o con la actividad?',
    subtitle: 'Por ejemplo al correr, saltar o cambiar de dirección',
    showIf: (a) => a.injury_has === 'yes',
    options: [...YES_NO, { value: 'unknown', label: 'No lo sé', icon: '🤷', emoji: true }],
  },
  {
    id: 'injury_professional_clearance',
    stage: 'par_q',
    type: 'single_choice',
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
    stage: 'par_q',
    type: 'textarea',
    title: '¿Tienes alguna otra lesión o molestia?',
    placeholder: 'Descríbela brevemente (o déjalo en blanco)',
    required: false,
    showIf: (a) => a.injury_has === 'yes',
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
  // 3 preguntas nuevas (2026-09-16, Bckbs PR #19 -- ver
  // docs/PENDIENTE_BACKEND_ADMIN.md): cribado de seguridad que faltaba en el
  // PAR-Q+ original. Las 2 primeras solo aplican a un perfil de mujer
  // (`showIf`, evaluado contra la respuesta ya dada a `gender` en la etapa
  // 1) -- el backend las exige obligatorias solo en ese caso y las ignora
  // para el resto, así que ni se muestran ni se envían para male/other. La
  // de trastorno alimentario es la única de las 3 que SIEMPRE se muestra.
  {
    id: 'parq_pregnant_or_possible',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Estás embarazada o existe la posibilidad de que lo estés?',
    showIf: (answers) => answers.gender === 'female',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_menstrual_change_or_stress_fracture',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Has perdido la menstruación de forma inesperada, o has tenido una fractura por estrés?',
    showIf: (answers) => answers.gender === 'female',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'parq_eating_disorder_history',
    stage: 'par_q',
    type: 'single_choice',
    title: '¿Tienes o has tenido un trastorno de la conducta alimentaria?',
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
  // Pedido explícito 2026-09-29: antes era la última pregunta del PAR-Q
  // ("¿Cuáles son tus objetivos?"); ahora va justo después de goal_type para
  // que el usuario detalle el objetivo que acaba de elegir. Se muestra en la
  // etapa de entrenamiento pero se sigue ENVIANDO con el PAR-Q (campo
  // `parq_goals` de POST v1/onboarding/par-q, obligatorio en el backend) --
  // ver submitStage() y handleContinue() en onboarding_v2_screen.tsx.
  {
    id: 'parq_goals',
    stage: 'training_questionnaire',
    payloadStage: 'par_q',
    type: 'textarea',
    title: 'Especifica más tus objetivos',
    placeholder: 'Ej. perder 5 kg de grasa, ganar fuerza en sentadilla, mejorar mi salud general...',
  },
  // Deporte concurrente y evento objetivo (2026-09-29): el agente necesita
  // conocer la carga de otra actividad y, si hay fecha, periodizar hacia ella.
  {
    id: 'practices_other_sport',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Practicas algún otro deporte además del gimnasio?',
    subtitle: 'Running, fútbol, pádel, ciclismo...',
    options: YES_NO,
  },
  {
    id: 'other_sport_description',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: '¿Qué deporte practicas y cuánto?',
    placeholder: 'Ej. running 3 días a la semana, unos 25 km; pádel los domingos',
    showIf: (a) => a.practices_other_sport === 'yes',
  },
  {
    id: 'has_target_event',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Te estás preparando para alguna competición o fecha concreta?',
    subtitle: 'Una carrera, un HYROX, unas oposiciones, una boda...',
    options: YES_NO,
  },
  {
    id: 'target_event_description',
    stage: 'training_questionnaire',
    type: 'text',
    title: '¿Qué evento es?',
    placeholder: 'Ej. HYROX Madrid, media maratón de Valencia...',
    showIf: (a) => a.has_target_event === 'yes',
  },
  // El backend guarda una fecha (target_event_date); aquí se pregunta en
  // semanas porque la app no tiene selector de fecha -- se convierte al
  // enviar, ver submitStage() en onboarding_v2_screen.tsx.
  {
    id: 'target_event_weeks',
    stage: 'training_questionnaire',
    type: 'number_wheel',
    title: '¿Cuántas semanas faltan, aproximadamente?',
    showIf: (a) => a.has_target_event === 'yes',
    min: 1,
    max: 104,
    defaultValue: 12,
    suffix: 'semanas',
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
  // Contexto de vida (2026-09-29): horario, sueño y estrés condicionan el
  // volumen tolerable y la recuperación (contexto_vida en el perfil del
  // agente de entrenamiento).
  {
    id: 'work_schedule',
    stage: 'training_questionnaire',
    type: 'single_choice',
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
    id: 'training_time_of_day',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿A qué hora del día sueles entrenar?',
    options: [
      { value: 'morning', label: 'Por la mañana', icon: '🌅', emoji: true },
      { value: 'midday', label: 'A mediodía', icon: '☀️', emoji: true },
      { value: 'afternoon', label: 'Por la tarde', icon: '🌇', emoji: true },
      { value: 'evening', label: 'Por la noche', icon: '🌙', emoji: true },
      { value: 'variable', label: 'Depende del día', icon: '🔀', emoji: true },
    ],
  },
  {
    id: 'sleep_hours',
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
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Tu horario de sueño es regular?',
    options: [
      { value: 'regular', label: 'Sí, regular', subtitle: 'Me acuesto y me levanto a horas parecidas', icon: '😴', emoji: true },
      { value: 'irregular', label: 'No, irregular', subtitle: 'Turnos, horarios muy cambiantes o me acuesto muy tarde', icon: '🌀', emoji: true },
    ],
  },
  {
    id: 'stress_level',
    stage: 'training_questionnaire',
    type: 'scale',
    title: 'Del 1 al 10, ¿cuánto estrés sueles tener en tu día a día?',
    min: 1,
    max: 10,
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
  // Dónde entrena y con qué (2026-09-29): sin esto no se pueden elegir
  // ejercicios (material_disponible en el perfil del agente).
  {
    id: 'training_location',
    stage: 'training_questionnaire',
    type: 'single_choice',
    title: '¿Dónde vas a entrenar?',
    options: [
      { value: 'full_gym', label: 'Gimnasio completo', subtitle: 'Máquinas, barras, mancuernas, poleas', icon: '🏋️', emoji: true },
      { value: 'basic_gym', label: 'Gimnasio básico', subtitle: 'De comunidad, hotel o con poco material', icon: '🏢', emoji: true },
      { value: 'home', label: 'En casa', icon: '🏠', emoji: true },
      { value: 'outdoor', label: 'Al aire libre', subtitle: 'Parque, calistenia', icon: '🌳', emoji: true },
      { value: 'mixed', label: 'Combino varios sitios', icon: '🔀', emoji: true },
    ],
  },
  {
    id: 'home_equipment',
    stage: 'training_questionnaire',
    type: 'multi_choice',
    title: '¿Qué material tienes disponible?',
    subtitle: 'Marca todo lo que tengas',
    showIf: (a) => a.training_location !== undefined && a.training_location !== 'full_gym',
    options: [
      { value: 'dumbbells', label: 'Mancuernas' },
      { value: 'barbell_plates', label: 'Barra y discos' },
      { value: 'rack', label: 'Rack o jaula' },
      { value: 'bench', label: 'Banco' },
      { value: 'pullup_bar', label: 'Barra de dominadas' },
      { value: 'kettlebells', label: 'Kettlebells' },
      { value: 'bands', label: 'Bandas elásticas' },
      { value: 'suspension', label: 'TRX o anillas' },
      { value: 'cables', label: 'Poleas o máquinas' },
      { value: 'cardio_machine', label: 'Máquina de cardio' },
      { value: 'none', label: 'Nada, solo mi peso corporal', exclusive: true },
    ],
  },
  {
    id: 'equipment_notes',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: '¿Algún detalle del material?',
    placeholder: 'Ej. mancuernas hasta 20 kg, bandas de 3 resistencias...',
    required: false,
    showIf: (a) => a.training_location !== undefined && a.training_location !== 'full_gym',
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
  // Referencias de fuerza (2026-09-29): cargas de la primera semana sin
  // adivinar. Opcional por ejercicio -- sin datos, el agente hace una semana
  // de calibración (referencias_carga en su perfil).
  {
    id: 'strength_references',
    stage: 'training_questionnaire',
    type: 'strength_references',
    title: '¿Cuánto peso mueves en estos ejercicios?',
    subtitle: 'El peso con el que haces unas 8-10 repeticiones con buena técnica. Si no haces un ejercicio o no lo sabes, déjalo en blanco',
    required: false,
    exercises: [
      { key: 'squat', label: 'Sentadilla con barra', hint: 'Peso total (barra + discos)' },
      { key: 'deadlift', label: 'Peso muerto', hint: 'Peso total (barra + discos)' },
      { key: 'db_bench', label: 'Press banca con mancuernas', hint: 'Peso de cada mancuerna' },
      { key: 'db_row', label: 'Remo con mancuerna', hint: 'Peso de la mancuerna' },
    ],
  },
  // Pedido explícito 2026-09-29: sustituye a "¿Cuál es tu objetivo
  // realista?" (el objetivo ya se detalla en parq_goals, arriba). Se reutiliza
  // el campo del backend `realistic_goal` (training_questionnaire_answers) tal
  // cual, sin migración -- solo cambia la pregunta; su contenido es ahora
  // cómo entrenaba el usuario antes.
  {
    id: 'realistic_goal',
    stage: 'training_questionnaire',
    type: 'textarea',
    title: 'Describe cómo entrenabas anteriormente',
    subtitle: 'Por ejemplo: cómo dividías los grupos musculares, qué tipos de ejercicios hacías, cómo los organizabas, etc.',
    placeholder: 'Ej. 4 días torso-pierna, básicos con barra y algo de máquinas, sin una progresión fija...',
  },

  // ---------- Etapa 4: Cuestionario de nutrición ----------
  {
    id: 'allergies_intolerances',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Tienes alguna alergia o intolerancia?',
    placeholder: 'Ej. lactosa, frutos secos, gluten... (o "ninguna")',
  },
  // Opcionales (2026-09-25): el backend y el admin ya los guardan/muestran
  // (nutrition_questionnaire_answers.medications/supplements, Bckbs); una app
  // antigua que no los envía no borra lo ya rellenado.
  {
    id: 'medications',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Tomas algún medicamento?',
    subtitle: 'Nos ayuda a ajustar tu plan con seguridad',
    placeholder: 'Ej. anticoagulantes, metformina... (o "ninguno")',
    required: false,
  },
  {
    id: 'supplements',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Tomas algún suplemento?',
    placeholder: 'Ej. creatina, proteína, vitamina D... (o "ninguno")',
    required: false,
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
  // Nutrición práctica (2026-09-29): horarios y dónde come condicionan qué
  // plan es realista de seguir, no solo cuántas calorías.
  {
    id: 'meal_schedule',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿A qué horas sueles comer?',
    placeholder: 'Ej. desayuno 7:30, comida 14:00, cena 21:30',
    required: false,
  },
  {
    id: 'intermittent_fasting',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    title: '¿Haces ayuno intermitente?',
    options: YES_NO,
  },
  {
    id: 'meals_away_from_home',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    title: 'Entre semana, ¿dónde sueles comer al mediodía?',
    options: [
      { value: 'home', label: 'En casa', icon: '🏠', emoji: true },
      { value: 'tupper', label: 'Me llevo tupper', icon: '🥡', emoji: true },
      { value: 'restaurant', label: 'Restaurante o menú del día', icon: '🍽️', emoji: true },
      { value: 'mixed', label: 'Depende del día', icon: '🔀', emoji: true },
    ],
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

  // 3 preguntas nuevas (2026-09-16, Bckbs PR #19): disponibilidad real de
  // cocina, que el agente de nutrición necesita y el cuestionario original
  // nunca pedía -- ver docs/PENDIENTE_BACKEND_ADMIN.md.
  {
    id: 'cooking_minutes_per_meal',
    stage: 'nutrition_questionnaire',
    type: 'number_wheel',
    title: '¿Cuánto tiempo tienes normalmente para cocinar cada comida?',
    subtitle: 'El tiempo real que sueles tener, no un ideal',
    min: 0,
    max: 180,
    step: 5,
    defaultValue: 20,
    suffix: 'minutos',
  },
  {
    id: 'cooking_skill_level',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    title: '¿Cómo te definirías cocinando?',
    options: [
      { value: 'beginner', label: 'Principiante', icon: '🥄', emoji: true },
      { value: 'intermediate', label: 'Intermedio', icon: '🍳', emoji: true },
      { value: 'advanced', label: 'Avanzado', icon: '👨‍🍳', emoji: true },
    ],
  },
  {
    id: 'cooks_for_others',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    title: '¿Cocinas también para otras personas (pareja, familia)?',
    options: [
      { value: 'yes', label: 'Sí', icon: '✅', emoji: true },
      { value: 'no', label: 'No', icon: '❌', emoji: true },
    ],
  },
  {
    id: 'weekly_food_budget',
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    title: '¿Cuánto sueles gastar a la semana en comida para ti?',
    subtitle: 'Solo tu parte, aproximada',
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
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
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
    stage: 'nutrition_questionnaire',
    type: 'single_choice',
    title: '¿Cuánta agua bebes al día?',
    options: [
      { value: 'under_1l', label: 'Menos de 1 litro' },
      { value: '1_1_5l', label: 'Entre 1 y 1,5 litros' },
      { value: '1_5_2l', label: 'Entre 1,5 y 2 litros' },
      { value: '2_3l', label: 'Entre 2 y 3 litros' },
      { value: 'over_3l', label: 'Más de 3 litros' },
    ],
  },
  {
    id: 'previous_diets',
    stage: 'nutrition_questionnaire',
    type: 'textarea',
    title: '¿Has seguido alguna dieta antes? ¿Qué tal te fue?',
    placeholder: 'Ej. keto 3 meses, perdí peso pero lo recuperé al dejarla...',
    required: false,
  },

  // ---------- Etapa 5: Crear cuenta ----------
  // Pedido explícito 2026-08-29: se elimina la pantalla de registro aparte
  // -- el botón "Regístrate" lleva directo aquí (MigratedOnboardingV2,
  // anónimo), y estas 2 últimas preguntas son las que de verdad crean la
  // cuenta al terminar (ver handleContinue en onboarding_v2_screen.tsx).
  // Solo se muestran si todavía no hay cuenta -- ver el filtro `questions`
  // en esa misma pantalla.
  {
    id: 'email',
    stage: 'credentials',
    type: 'email',
    title: '¿Cuál es tu correo electrónico?',
    subtitle: 'Lo usaremos para que puedas acceder a tu cuenta',
    placeholder: 'Introduce tu email',
  },
  {
    id: 'password',
    stage: 'credentials',
    type: 'password',
    title: 'Crea una contraseña',
    subtitle: 'Mínimo 8 caracteres',
    placeholder: 'Introduce tu contraseña',
  },
];
