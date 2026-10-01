// Tipos del onboarding. Ver docs/ONBOARDING_V2.md para el contrato completo
// de preguntas + endpoints.

// Etapa = ENDPOINT al que viaja la respuesta (una por tabla del backend).
// 'credentials' (pedido explícito 2026-08-29: registro eliminado como
// pantalla aparte, el onboarding ES el registro) -- email/teléfono/contraseña,
// que crean la cuenta al terminar vía authApi.register(), sin submitStage
// propio.
export type OnboardingStageId = 'personal_data' | 'par_q' | 'training_questionnaire' | 'nutrition_questionnaire' | 'credentials';

export const PAYLOAD_STAGES: Exclude<OnboardingStageId, 'credentials'>[] = [
  'personal_data',
  'par_q',
  'training_questionnaire',
  'nutrition_questionnaire',
];

// Sección = bloque VISIBLE (franja de la barra de progreso + pantalla de
// introducción). Rediseño 2026-09-29: el orden de las secciones ya no
// coincide con el de los endpoints -- se ordenan por esfuerzo (gancho rápido,
// luego lo que más cuesta responder, y al final lo más rápido), ver
// docs/ONBOARDING_INVESTIGACION.md. Una sección puede mezclar preguntas de
// varios endpoints (p. ej. 'goal' tiene goal_type -> entrenamiento,
// parq_goals -> PAR-Q y name/gender -> datos personales).
export type OnboardingSectionId = 'goal' | 'nutrition' | 'training' | 'health' | 'lifestyle' | 'about' | 'account';

export interface OnboardingSectionMeta {
  id: OnboardingSectionId;
  label: string;
}

export const ONBOARDING_SECTIONS: OnboardingSectionMeta[] = [
  { id: 'goal', label: 'Tu objetivo' },
  { id: 'nutrition', label: 'Nutrición' },
  { id: 'training', label: 'Entrenamiento' },
  { id: 'health', label: 'Salud' },
  { id: 'lifestyle', label: 'Tu día a día' },
  { id: 'about', label: 'Sobre ti' },
  { id: 'account', label: 'Tu cuenta' },
];

export interface OnboardingOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: string; // nombre de icono Ionicons, o un emoji si `emoji` es true
  emoji?: boolean;
}

export type OnboardingQuestionType =
  | 'intro'
  | 'name'
  | 'single_choice'
  | 'multi_choice'
  | 'strength_references'
  | 'text_group'
  | 'ruler'
  | 'number_wheel'
  | 'scale'
  | 'text'
  | 'textarea'
  | 'contact'
  | 'password';

// Texto que puede personalizarse con las respuestas ya dadas (p. ej. el
// nombre: "Perfecto, Ana").
export type DynamicText = string | ((answers: OnboardingAnswers) => string);

interface OnboardingQuestionBase {
  id: string;
  section: OnboardingSectionId;
  // Endpoint donde viaja la respuesta. Sin `stage` = pregunta solo de la app
  // (pantallas de introducción y "puertas" como has_allergies, que no tienen
  // columna propia y se traducen al enviar -- ver submitStage()).
  stage?: OnboardingStageId;
  type: OnboardingQuestionType;
  title: DynamicText;
  subtitle?: DynamicText;
  required?: boolean; // por defecto true
  // Visibilidad condicionada a respuestas previas (embarazo solo para mujer,
  // detalles de lesión solo si hay lesión...). Se evalúa contra `answers` --
  // ver el filtro de `questions` en onboarding_v2_screen.tsx. La pregunta de
  // la que depende debe ir ANTES en el array.
  showIf?: (answers: OnboardingAnswers) => boolean;
  // Pregunta de un solo toque: al elegir, avanza sola (tras una pausa corta
  // para que se vea la selección). Solo single_choice.
  autoAdvance?: boolean;
}

// Pantalla sin respuesta al inicio de cada sección: por qué preguntamos esto
// y cómo lo usa el entrenador (pedido explícito 2026-09-29).
export interface IntroQuestion extends OnboardingQuestionBase {
  type: 'intro';
  emoji: string;
  why: string;
  coachUse: string;
  minutes?: string; // ej. "2 min"
}

export interface NameQuestion extends OnboardingQuestionBase {
  type: 'name';
}

export interface SingleChoiceQuestion extends OnboardingQuestionBase {
  type: 'single_choice';
  options: OnboardingOption[];
}

// La respuesta es un string[]. `exclusive` (p. ej. "Ninguna") deselecciona
// las demás y viceversa; `showIf` por opción oculta opciones que no aplican
// (p. ej. embarazo para un hombre en el checklist del PAR-Q).
export interface MultiChoiceOption extends OnboardingOption {
  exclusive?: boolean;
  showIf?: (answers: OnboardingAnswers) => boolean;
}

export interface MultiChoiceQuestion extends OnboardingQuestionBase {
  type: 'multi_choice';
  options: MultiChoiceOption[];
}

// Referencias de fuerza: una sola pantalla con varios ejercicios, cada uno
// con kg y repeticiones opcionales (vacío = no lo hace o no lo sabe).
export interface StrengthReferencesQuestion extends OnboardingQuestionBase {
  type: 'strength_references';
  exercises: { key: string; label: string; hint?: string }[];
}

export type StrengthReferencesAnswer = Record<string, { kg?: string; reps?: string }>;

// Varios campos de texto cortos en una sola pantalla (p. ej. carnes,
// pescados, frutas y platos favoritos). Cada campo es una respuesta propia
// con su `id` -- la pregunta en sí no guarda nada bajo su propio id.
export interface TextGroupQuestion extends OnboardingQuestionBase {
  type: 'text_group';
  fields: { id: string; label: string; placeholder?: string }[];
}

export interface RulerQuestion extends OnboardingQuestionBase {
  type: 'ruler';
  min: number;
  max: number;
  decimals: 0 | 1;
  defaultValue: number;
  units: { value: string; label: string; toBase: (v: number) => number; fromBase: (v: number) => number }[];
}

export interface NumberWheelQuestion extends OnboardingQuestionBase {
  type: 'number_wheel';
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  suffix?: string; // ej. "días", "meses"
}

export interface ScaleQuestion extends OnboardingQuestionBase {
  type: 'scale';
  min: number;
  max: number;
}

export interface TextQuestion extends OnboardingQuestionBase {
  type: 'text';
  placeholder?: string;
}

export interface TextAreaQuestion extends OnboardingQuestionBase {
  type: 'textarea';
  placeholder?: string;
}

// Email + teléfono en la misma pantalla (2026-09-29). Guarda `email` y
// `phone_number` como respuestas separadas; el teléfono es opcional.
export interface ContactQuestion extends OnboardingQuestionBase {
  type: 'contact';
}

export interface PasswordQuestion extends OnboardingQuestionBase {
  type: 'password';
  placeholder?: string;
}

export type OnboardingQuestion =
  | IntroQuestion
  | NameQuestion
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | StrengthReferencesQuestion
  | TextGroupQuestion
  | RulerQuestion
  | NumberWheelQuestion
  | ScaleQuestion
  | TextQuestion
  | TextAreaQuestion
  | ContactQuestion
  | PasswordQuestion;

export type OnboardingAnswerValue =
  | string
  | number
  | boolean
  | { first_name: string; last_name: string }
  | { value: number; unit: string }
  | string[]
  | StrengthReferencesAnswer
  | undefined;

export type OnboardingAnswers = Record<string, OnboardingAnswerValue>;

export function resolveText(text: DynamicText | undefined, answers: OnboardingAnswers): string | undefined {
  return typeof text === 'function' ? text(answers) : text;
}

// Nombre de pila ya respondido, para personalizar textos.
export function firstNameOf(answers: OnboardingAnswers): string {
  const name = answers.name as { first_name?: string } | undefined;
  return name?.first_name?.trim() ?? '';
}
