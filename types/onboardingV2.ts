// Tipos del nuevo onboarding (4 etapas: datos personales, PAR-Q, cuestionario
// de entrenamiento, cuestionario de nutrición). Ver docs/ONBOARDING_V2.md
// para el contrato completo de preguntas + endpoints.

// 'credentials' (pedido explícito 2026-08-29: registro eliminado como
// pantalla aparte, el onboarding ES el registro) -- las 2 últimas
// preguntas (email/contraseña) que crean la cuenta al terminar. No tiene
// endpoint propio como las otras 4 -- submitStage() en
// onboarding_v2_screen.tsx la ignora a propósito, la cuenta se crea vía
// authApi.register() en su lugar. Solo se muestra a usuarios todavía
// anónimos -- ver `questions` (filtro por state.isAuthenticated) en
// onboarding_v2_screen.tsx: alguien que ya tenía cuenta y reanuda un
// onboarding a medias no vuelve a pasar por aquí.
export type OnboardingStageId = 'personal_data' | 'par_q' | 'training_questionnaire' | 'nutrition_questionnaire' | 'credentials';

export interface OnboardingStageMeta {
  id: OnboardingStageId;
  label: string;
}

export const ONBOARDING_STAGES: OnboardingStageMeta[] = [
  { id: 'personal_data', label: 'Datos personales' },
  { id: 'par_q', label: 'PAR-Q' },
  { id: 'training_questionnaire', label: 'Entrenamiento' },
  { id: 'nutrition_questionnaire', label: 'Nutrición' },
  { id: 'credentials', label: 'Crear cuenta' },
];

export interface OnboardingOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: string; // nombre de icono Ionicons, o un emoji si `emoji` es true
  emoji?: boolean;
}

export type OnboardingQuestionType =
  | 'name'
  | 'single_choice'
  | 'ruler'
  | 'number_wheel'
  | 'scale'
  | 'text'
  | 'textarea'
  | 'email'
  | 'password';

interface OnboardingQuestionBase {
  id: string;
  stage: OnboardingStageId;
  type: OnboardingQuestionType;
  title: string;
  subtitle?: string;
  required?: boolean; // por defecto true
}

export interface NameQuestion extends OnboardingQuestionBase {
  type: 'name';
}

export interface SingleChoiceQuestion extends OnboardingQuestionBase {
  type: 'single_choice';
  options: OnboardingOption[];
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

export interface EmailQuestion extends OnboardingQuestionBase {
  type: 'email';
  placeholder?: string;
}

export interface PasswordQuestion extends OnboardingQuestionBase {
  type: 'password';
  placeholder?: string;
}

export type OnboardingQuestion =
  | NameQuestion
  | SingleChoiceQuestion
  | RulerQuestion
  | NumberWheelQuestion
  | ScaleQuestion
  | TextQuestion
  | TextAreaQuestion
  | EmailQuestion
  | PasswordQuestion;

export type OnboardingAnswerValue =
  | string
  | number
  | boolean
  | { first_name: string; last_name: string }
  | { value: number; unit: string }
  | undefined;

export type OnboardingAnswers = Record<string, OnboardingAnswerValue>;
