import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {  BackHandler, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, StyleSheet  } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Input, InputField, InputSlot  } from '@components/ui/input';
import {  Textarea, TextareaInput  } from '@components/ui/textarea';
import {  Button, ButtonText  } from '@components/ui/button';
import {  Spinner  } from '@components/ui/spinner';
import {  Icon  } from '@components/ui/icon';
import {  useAuth  } from '@store/AuthContext';
import { showToast } from '@helper/toast';
import { setToken } from '@helper/secureToken';
import logger from '@helper/logger';
import { authApi } from '../../../api/auth';
import { onboardingV2Api } from '../../../api/onboardingV2';
import { deriveActivityLevel, ONBOARDING_QUESTIONS, PARQ_CONDITIONS } from '../../../constants/onboardingV2Questions';
import {
  ONBOARDING_SECTIONS,
  OnboardingAnswers,
  OnboardingQuestion,
  PAYLOAD_STAGES,
  resolveText,
  RulerQuestion,
  StrengthReferencesAnswer,
} from '../../../types/onboardingV2';
import OnboardingHeader from '../../../components/onboarding_v2/OnboardingHeader';
import OptionCards from '../../../components/onboarding_v2/OptionCards';
import ScaleSelector from '../../../components/onboarding_v2/ScaleSelector';
import RulerPicker from '../../../components/onboarding_v2/RulerPicker';
import NumberWheelPicker from '../../../components/onboarding_v2/NumberWheelPicker';
import { FONT, RADIUS } from '../theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import GlassSegmentedBar from '@components/GlassSegmentedBar';

// Motor genérico del onboarding (ver docs/ONBOARDING_V2.md): UNA sola screen
// recorre `ONBOARDING_QUESTIONS` con un índice interno (no hay una ruta de
// navegación por pregunta) -- así el "atrás" entre preguntas es instantáneo
// y no ensucia el stack de React Navigation.
//
// Rediseño 2026-09-29 (ver docs/ONBOARDING_INVESTIGACION.md):
// - Secciones visibles (barra de progreso) separadas de las etapas de envío
//   (endpoints): cada pregunta tiene `section` y, si guarda algo, `stage`.
// - Pantallas `intro` al inicio de cada sección (por qué preguntamos y cómo
//   lo usa el entrenador).
// - Preguntas de un toque (`autoAdvance`) avanzan solas tras elegir, con
//   vibración ligera; transición animada entre pantallas.

// Checkpoint de respuestas por usuario (bug real 2026-08-29: con una clave
// global, una cuenta nueva heredaba las respuestas de la anterior en el mismo
// dispositivo). SIN cuenta todavía no se persiste nada: si la persona A deja
// el onboarding a medias sin registrarse, la persona B no debe heredar sus
// respuestas de salud en el mismo dispositivo -- perder el progreso antes de
// crear la cuenta es un coste menor y aceptado.
function answersStorageKey(userId: number): string {
  return `@bestronger_onboarding_v2_answers_${userId}`;
}

// Puente entre el registro diferido (handleContinue) y el remount que provoca
// RootNavigator (App.tsx) en cuanto hydrateSession despacha
// isAuthenticated=true: la nueva instancia lee esta clave y salta directa al
// resumen en vez de volver a preguntar todo.
const PENDING_RESULT_KEY = '@bestronger_onboarding_v2_pending_result';

// Pausa antes de avanzar solo, para que se vea la opción marcada.
const AUTO_ADVANCE_DELAY_MS = 320;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigits(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[^0-9+]/g, '') : '';
}

function isValidPhone(value: unknown): boolean {
  const digits = phoneDigits(value).replace('+', '');
  return digits.length >= 9 && digits.length <= 15;
}

const QUESTION_BY_ID: Record<string, OnboardingQuestion> = Object.fromEntries(
  ONBOARDING_QUESTIONS.map((q) => [q.id, q])
);

// Respuesta de una pregunta condicionada (showIf) solo si HOY sigue visible:
// si el usuario abrió una puerta (p. ej. injury_has = Sí), rellenó los
// detalles y luego volvió atrás y la cerró, los detalles siguen en `answers`
// pero ya no aplican -- no se envían (el backend además los pone a NULL
// cuando la puerta llega cerrada).
function visibleAnswer(answers: OnboardingAnswers, id: string) {
  const q = QUESTION_BY_ID[id];
  if (q?.showIf && !q.showIf(answers)) return undefined;
  return answers[id];
}

function yesNo(value: unknown): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Referencias de fuerza: vacío o no numérico = null ("no lo hace / no lo sabe").
// Acepta coma decimal (teclado español).
function parseLoad(value: string | undefined, integer: boolean): number | null {
  if (!value) return null;
  const n = integer ? parseInt(value, 10) : parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isAnswered(question: OnboardingQuestion, answers: OnboardingAnswers): boolean {
  if (question.type === 'intro') return true;
  if (question.type === 'contact') {
    const email = answers.email;
    const phone = answers.phone_number;
    const emailOk = typeof email === 'string' && EMAIL_RE.test(email.trim());
    const phoneOk = !phoneDigits(phone) || isValidPhone(phone);
    return emailOk && phoneOk;
  }
  if (question.required === false) return true;
  const value = answers[question.id];
  if (question.type === 'name') {
    const v = value as { first_name: string; last_name: string } | undefined;
    return !!v?.first_name?.trim() && !!v?.last_name?.trim();
  }
  if (question.type === 'password') {
    return typeof value === 'string' && value.length >= 8;
  }
  if (question.type === 'multi_choice') {
    return Array.isArray(value) && value.length > 0;
  }
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

// Una pregunta opcional sin nada escrito: el botón dice "Omitir".
function isEmptyOptional(question: OnboardingQuestion, answers: OnboardingAnswers): boolean {
  if (question.required !== false) return false;
  if (question.type === 'text_group') return question.fields.every((f) => !optionalText(answers[f.id]));
  if (question.type === 'strength_references') {
    const refs = (answers[question.id] as StrengthReferencesAnswer | undefined) ?? {};
    return Object.values(refs).every((r) => !r?.kg && !r?.reps);
  }
  return !optionalText(answers[question.id]);
}

export default function OnboardingV2Screen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { state, updateUser, hydrateSession } = useAuth();
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // El ScaleSelector vive dentro del ScrollView: en un arrastre rápido el
  // scroll nativo le robaba eventos (ver ScaleSelector.tsx). Se desactiva el
  // scroll mientras se arrastra.
  const [scaleDragging, setScaleDragging] = useState(false);
  // Id de la pregunta que debe avanzar sola cuando se aplique su respuesta
  // (ver el efecto de auto-avance más abajo).
  const [pendingAdvance, setPendingAdvance] = useState<string | null>(null);

  // La sección 'account' (email/teléfono/contraseña) solo tiene sentido si
  // todavía no hay cuenta: quien ya la tiene y reanuda un onboarding a medias
  // no vuelve a pasar por ella.
  const questions = useMemo(
    () =>
      ONBOARDING_QUESTIONS.filter(
        (q) => (!state.isAuthenticated || q.section !== 'account') && (q.showIf === undefined || q.showIf(answers))
      ),
    [state.isAuthenticated, answers]
  );
  const visibleSections = useMemo(
    () => ONBOARDING_SECTIONS.filter((s) => questions.some((q) => q.section === s.id)),
    [questions]
  );

  const userId = state.user?.id;
  // Reanudación: si el usuario cerró la app a mitad del onboarding, recupera
  // sus respuestas (nunca el índice -- más seguro volver a la primera
  // pregunta que arriesgarse a un índice fuera de rango si la lista cambia
  // entre versiones). Solo con cuenta ya creada, ver answersStorageKey.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = await AsyncStorage.getItem(PENDING_RESULT_KEY).catch(() => null);
      if (cancelled) return;
      if (pending) {
        await AsyncStorage.removeItem(PENDING_RESULT_KEY).catch(() => {});
        navigation.replace('MigratedAssessmentResult', { answers: JSON.parse(pending) });
        return;
      }
      if (!userId) {
        setRestored(true);
        return;
      }
      const saved = await AsyncStorage.getItem(answersStorageKey(userId)).catch((e) => {
        logger.error(e);
        return null;
      });
      if (cancelled) return;
      if (saved) setAnswers(JSON.parse(saved));
      setRestored(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, navigation]);

  useEffect(() => {
    if (!restored || !userId) return;
    AsyncStorage.setItem(answersStorageKey(userId), JSON.stringify(answers)).catch((e) => logger.error(e));
  }, [answers, restored, userId]);

  const question = questions[Math.min(questionIndex, questions.length - 1)];
  const sectionIndex = visibleSections.findIndex((s) => s.id === question.section);
  const sectionQuestions = useMemo(
    () => questions.filter((q) => q.section === question.section),
    [questions, question.section]
  );
  const indexWithinSection = sectionQuestions.findIndex((q) => q.id === question.id);
  const sectionProgress = indexWithinSection / sectionQuestions.length;
  const isLastQuestion = questionIndex === questions.length - 1;

  const setAnswer = useCallback((id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  // ruler/number_wheel muestran su defaultValue desde el primer render, pero
  // hasta que el usuario mueve el dedo no había respuesta y "Continuar"
  // quedaba deshabilitado aunque el valor mostrado fuera justo el suyo. Se
  // siembra el default al entrar en la pregunta.
  useEffect(() => {
    if (!restored) return;
    if ((question.type === 'ruler' || question.type === 'number_wheel') && answers[question.id] === undefined) {
      setAnswer(question.id, question.defaultValue);
    }
  }, [question, restored, answers, setAnswer]);

  const submitStage = useCallback(
    // overrideUser: solo lo pasa el registro diferido -- en ese punto la
    // cuenta se acaba de crear sin pasar por AuthContext (ver hydrateSession
    // en store/AuthContext.tsx), así que state.user sigue siendo null.
    // Cada etapa se reintenta hasta 3 veces (incidente 2026-09-18: un fallo
    // de red puntual hacía perder la etapa entera en el registro diferido).
    async (stageId: string, overrideUser?: { username: string; email: string }): Promise<boolean> => {
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (stageId === 'personal_data') {
          const name = answers.name as { first_name: string; last_name: string } | undefined;
          const personalData = {
            first_name: name?.first_name ?? '',
            last_name: name?.last_name ?? '',
            gender: (answers.gender as any) ?? 'other',
            age: Number(answers.age) || 0,
            height: Number(answers.height) || 0,
            height_unit: heightUnit,
            weight: Number(answers.weight) || 0,
            weight_unit: weightUnit,
          };
          await onboardingV2Api.submitPersonalData(
            personalData,
            overrideUser?.username ?? state.user?.username ?? '',
            overrideUser?.email ?? state.user?.email ?? ''
          );
          // El endpoint no devuelve el usuario actualizado: sin esto, el
          // nombre recién enviado nunca llega a state.user y Home sigue
          // mostrando "Usuario".
          if (state.user) {
            updateUser({
              ...state.user,
              first_name: personalData.first_name,
              last_name: personalData.last_name,
              gender: personalData.gender,
            });
          }
        } else if (stageId === 'par_q') {
          // El checklist `parq_conditions` se traduce a un booleano por
          // columna. Las 2 preguntas de mujer solo se envían si aplica: para
          // male/other el backend las guarda como NULL ("no aplica"), no false.
          const isFemale = answers.gender === 'female';
          const conditions = Array.isArray(answers.parq_conditions) ? (answers.parq_conditions as string[]) : [];
          const flags: Record<string, boolean> = {};
          for (const c of PARQ_CONDITIONS) {
            if (c.femaleOnly && !isFemale) continue;
            flags[c.id] = conditions.includes(c.id);
          }
          await onboardingV2Api.submitParQ({
            ...(flags as any),
            parq_fitness_level: Number(answers.parq_fitness_level) || 0,
            parq_medical_history: optionalText(visibleAnswer(answers, 'parq_medical_history')) ?? '',
            parq_goals: String(answers.parq_goals ?? ''),
            injury_has: yesNo(answers.injury_has),
            injury_zone: visibleAnswer(answers, 'injury_zone') as any,
            injury_painful_movement: optionalText(visibleAnswer(answers, 'injury_painful_movement')),
            injury_phase: visibleAnswer(answers, 'injury_phase') as any,
            injury_worsens_with_impact: visibleAnswer(answers, 'injury_worsens_with_impact') as any,
            injury_professional_clearance: visibleAnswer(answers, 'injury_professional_clearance') as any,
            injury_other_notes: optionalText(visibleAnswer(answers, 'injury_other_notes')),
          });
        } else if (stageId === 'training_questionnaire') {
          const refs = (visibleAnswer(answers, 'strength_references') as StrengthReferencesAnswer | undefined) ?? {};
          const technique = visibleAnswer(answers, 'technique_level');
          const weeks = Number(visibleAnswer(answers, 'target_event_weeks'));
          await onboardingV2Api.submitTrainingQuestionnaire({
            goal_type: answers.goal_type as any,
            // Ya no se pregunta: se deriva de estilo de vida + días de entreno.
            activity_level: deriveActivityLevel(answers),
            lifestyle_type: answers.lifestyle_type as any,
            // Se pregunta en años, el backend guarda meses.
            training_experience_months: (Number(answers.training_experience_years) || 0) * 12,
            training_days_per_week: Number(answers.training_days_per_week) || 0,
            session_duration_preference: answers.session_duration_preference as any,
            // Solo si ya ha entrenado (showIf); si no, null -- el backend las
            // exige solo con experiencia > 0.
            training_mindset: (visibleAnswer(answers, 'training_mindset') as any) ?? null,
            previous_coaching: (visibleAnswer(answers, 'previous_coaching') as any) ?? null,
            current_routine_style: (visibleAnswer(answers, 'current_routine_style') as any) ?? null,
            weekly_split_preference: (visibleAnswer(answers, 'weekly_split_preference') as any) ?? null,
            technique_level: technique !== undefined ? Number(technique) : null,
            realistic_goal: optionalText(visibleAnswer(answers, 'realistic_goal')),
            practices_other_sport: yesNo(answers.practices_other_sport),
            other_sport_description: optionalText(visibleAnswer(answers, 'other_sport_description')),
            has_target_event: yesNo(answers.has_target_event),
            target_event_description: optionalText(visibleAnswer(answers, 'target_event_description')),
            // Se pregunta en semanas (no hay selector de fecha).
            target_event_date:
              weeks > 0 ? new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10) : null,
            work_schedule: answers.work_schedule as any,
            training_time_of_day: answers.training_time_of_day as any,
            sleep_hours: answers.sleep_hours !== undefined ? Number(answers.sleep_hours) : undefined,
            sleep_regularity: answers.sleep_regularity as any,
            stress_level: answers.stress_level !== undefined ? Number(answers.stress_level) : undefined,
            training_location: answers.training_location as any,
            equipment_notes: optionalText(visibleAnswer(answers, 'equipment_notes')),
            strength_squat_kg: parseLoad(refs.squat?.kg, false),
            strength_squat_reps: parseLoad(refs.squat?.reps, true),
            strength_deadlift_kg: parseLoad(refs.deadlift?.kg, false),
            strength_deadlift_reps: parseLoad(refs.deadlift?.reps, true),
            strength_db_bench_kg: parseLoad(refs.db_bench?.kg, false),
            strength_db_bench_reps: parseLoad(refs.db_bench?.reps, true),
            strength_db_row_kg: parseLoad(refs.db_row?.kg, false),
            strength_db_row_reps: parseLoad(refs.db_row?.reps, true),
          });
        } else if (stageId === 'nutrition_questionnaire') {
          await onboardingV2Api.submitNutritionQuestionnaire({
            // Puerta has_allergies: sin alergias se guarda "Ninguna"
            // (obligatorio en el backend).
            allergies_intolerances:
              answers.has_allergies === 'yes' ? String(answers.allergies_intolerances ?? '') : 'Ninguna',
            medications: optionalText(visibleAnswer(answers, 'medications')),
            supplements: optionalText(visibleAnswer(answers, 'supplements')),
            disliked_foods: String(answers.disliked_foods ?? ''),
            current_meals_per_day: Number(answers.current_meals_per_day) || 0,
            desired_meals_per_day: Number(answers.desired_meals_per_day) || 0,
            typical_day_meals: String(answers.typical_day_meals ?? ''),
            favorite_meats: String(answers.favorite_meats ?? ''),
            favorite_fish: String(answers.favorite_fish ?? ''),
            favorite_fruits_vegetables: String(answers.favorite_fruits_vegetables ?? ''),
            favorite_combined_dishes: String(answers.favorite_combined_dishes ?? ''),
            cooking_minutes_per_meal: Number(answers.cooking_minutes_per_meal) || 0,
            cooking_skill_level: answers.cooking_skill_level as 'beginner' | 'intermediate' | 'advanced',
            cooks_for_others: answers.cooks_for_others === 'yes',
            weekly_food_budget: answers.weekly_food_budget as any,
            meals_away_from_home: answers.meals_away_from_home as any,
            intermittent_fasting: yesNo(answers.intermittent_fasting),
            alcohol_frequency: answers.alcohol_frequency as any,
            water_intake: answers.water_intake as any,
            previous_diets: optionalText(visibleAnswer(answers, 'previous_diets')),
          });
        }
        return true;
      } catch (e) {
        // Incidente 2026-09-18: antes este catch daba cualquier fallo por
        // bueno y la etapa se perdía en silencio. Ahora reintenta; si aun así
        // falla devuelve false (handleContinue no borra el checkpoint local) y
        // el backend no deja completar el onboarding con etapas pendientes.
        if (attempt < MAX_ATTEMPTS) {
          logger.error(`[onboarding_v2] fallo al enviar etapa ${stageId} (intento ${attempt}/${MAX_ATTEMPTS}), reintentando`, e);
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          continue;
        }
        logger.error(`[onboarding_v2] fallo al enviar etapa ${stageId} tras ${MAX_ATTEMPTS} intentos, se deja pendiente`, e);
        return false;
      }
      }
      return false;
    },
    [answers, heightUnit, weightUnit, state.user, updateUser]
  );

  // Registro diferido (pedido explícito 2026-08-29): crea la cuenta con lo
  // acumulado en `answers`. Llama a authApi.register() DIRECTAMENTE, no a
  // register() de AuthContext, para que isAuthenticated no pase a true (y
  // RootNavigator no remonte el stack) antes de enviar las etapas.
  const registerAnonymousUser = useCallback(async () => {
    const name = answers.name as { first_name: string; last_name: string } | undefined;
    const firstName = name?.first_name?.trim() ?? '';
    const lastName = name?.last_name?.trim() ?? '';
    const email = String(answers.email ?? '').trim();
    const password = String(answers.password ?? '');
    const username = `${firstName} ${lastName}`.trim() || email;
    const phone = phoneDigits(answers.phone_number);
    try {
      const response = await authApi.register({
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        user_type: 'user',
        status: 'active',
        gender: (answers.gender as string) ?? 'other',
        ...(phone ? { phone_number: phone } : {}),
      });
      return response.data.data;
    } catch (e: any) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.email?.[0] ||
        e?.response?.data?.errors?.phone_number?.[0] ||
        e?.response?.data?.errors?.username?.[0] ||
        e?.message ||
        'No se pudo completar el registro';
      showToast('Error en el registro', { description: message, variant: 'error' });
      return null;
    }
  }, [answers]);

  // Resumen: activity_level ya no se pregunta, pero la pantalla de resultado
  // lo usa para el gasto calórico -- se añade derivado.
  const answersForResult = useCallback((): OnboardingAnswers => {
    const result: OnboardingAnswers = { ...answers, activity_level: deriveActivityLevel(answers) };
    // La contraseña no sobrevive más de lo estrictamente necesario.
    delete result.password;
    return result;
  }, [answers]);

  const handleContinue = useCallback(async () => {
    setPendingAdvance(null);
    // Con cuenta ya creada (reanudando), cada endpoint se envía en cuanto se
    // pasa su última pregunta visible -- las secciones mezclan endpoints, así
    // que no basta con "fin de sección". Sin cuenta todavía se envía todo
    // junto al final, tras registrar (antes daría 401).
    let stagesSubmitted = true;
    if (state.isAuthenticated) {
      const due = PAYLOAD_STAGES.filter((stage) => {
        let last = -1;
        questions.forEach((q, i) => {
          if (q.stage === stage) last = i;
        });
        return last === questionIndex;
      });
      if (due.length > 0) {
        setSubmitting(true);
        for (const stage of due) {
          stagesSubmitted = (await submitStage(stage)) && stagesSubmitted;
        }
        setSubmitting(false);
      }
    }

    if (isLastQuestion) {
      if (!state.isAuthenticated) {
        setSubmitting(true);
        const userData = await registerAnonymousUser();
        if (!userData) {
          setSubmitting(false);
          return;
        }
        // Token activo YA para que los envíos de abajo vayan autenticados;
        // hydrateSession va DESPUÉS a propósito (ver AuthContext.tsx).
        await setToken(userData.api_token);
        for (const stage of PAYLOAD_STAGES) {
          await submitStage(stage, { username: userData.username, email: userData.email });
        }
        await AsyncStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(answersForResult())).catch(() => {});
        setSubmitting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Remonta RootNavigator: esta instancia se destruye y la siguiente
        // salta al resumen gracias a PENDING_RESULT_KEY.
        await hydrateSession(userData, false);
        return;
      }

      if (stagesSubmitted && userId) {
        await AsyncStorage.removeItem(answersStorageKey(userId)).catch(() => {});
      }
      navigation.replace('MigratedAssessmentResult', { answers: answersForResult() });
      return;
    }
    setDirection('forward');
    setQuestionIndex((i) => i + 1);
  }, [
    isLastQuestion,
    questions,
    questionIndex,
    submitStage,
    navigation,
    userId,
    state.isAuthenticated,
    registerAnonymousUser,
    hydrateSession,
    answersForResult,
  ]);

  // Auto-avance: se dispara en un efecto (no en el onPress) para que
  // handleContinue ya vea la respuesta recién elegida -- y, si esa respuesta
  // abre o cierra preguntas condicionadas, la lista `questions` ya
  // recalculada.
  const handleContinueRef = useRef(handleContinue);
  useEffect(() => {
    handleContinueRef.current = handleContinue;
  }, [handleContinue]);
  useEffect(() => {
    if (!pendingAdvance || pendingAdvance !== question.id) return;
    const timer = setTimeout(() => {
      handleContinueRef.current();
    }, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingAdvance, question.id]);

  const handleSelect = useCallback(
    (id: string, value: any, autoAdvance?: boolean) => {
      Haptics.selectionAsync().catch(() => {});
      setAnswer(id, value);
      if (autoAdvance) setPendingAdvance(id);
    },
    [setAnswer]
  );

  const handleBack = useCallback(() => {
    setPendingAdvance(null);
    if (questionIndex === 0) {
      if (navigation.canGoBack()) navigation.goBack();
      return;
    }
    setDirection('back');
    setQuestionIndex((i) => i - 1);
  }, [questionIndex, navigation]);

  // Botón físico "atrás" de Android = flecha de la cabecera (antes salía del
  // onboarding perdiendo el progreso). En iOS el gesto está desactivado para
  // esta pantalla (ONBOARDING_SCREEN_OPTIONS en App.tsx).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  if (!restored) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <Spinner size="large" color={C.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const title = resolveText(question.title, answers);
  const subtitle = resolveText(question.subtitle, answers);
  const buttonLabel =
    question.type === 'intro'
      ? questionIndex === 0
        ? 'Empezar'
        : 'Vamos'
      : isLastQuestion
        ? state.isAuthenticated
          ? 'Terminar'
          : 'Crear mi cuenta'
        : isEmptyOptional(question, answers)
          ? 'Omitir'
          : 'Continuar';
  const entering = (direction === 'forward' ? FadeInRight : FadeInLeft).duration(260);

  return (
    // 'top' se queda fuera: OnboardingHeader gestiona su propio safe-area top.
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OnboardingHeader
        onBack={handleBack}
        stageCount={visibleSections.length}
        currentStageIndex={sectionIndex}
        stageProgress={sectionProgress}
        label={visibleSections[sectionIndex]?.label}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scaleDragging}
        >
          <Animated.View key={question.id} entering={entering}>
            {question.type === 'intro' ? (
              <IntroContent question={question} title={title ?? ''} styles={styles} />
            ) : (
              <>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                <View style={styles.body}>
                  <QuestionInput
                    question={question}
                    answers={answers}
                    setAnswer={setAnswer}
                    onSelect={handleSelect}
                    heightUnit={heightUnit}
                    setHeightUnit={setHeightUnit}
                    weightUnit={weightUnit}
                    setWeightUnit={setWeightUnit}
                    defaultFirstName={state.user?.first_name}
                    defaultLastName={state.user?.last_name}
                    onScaleDraggingChange={setScaleDragging}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((v) => !v)}
                    styles={styles}
                    C={C}
                  />
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            size="lg"
            radius="pill"
            onPress={handleContinue}
            disabled={!isAnswered(question, answers) || submitting}
          >
            {submitting ? <Spinner size="small" color="#FFFFFF" /> : <ButtonText>{buttonLabel}</ButtonText>}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Pantalla de introducción de sección: qué viene, por qué y cómo lo usa el
// entrenador. Entra con una animación escalonada (emoji, título, tarjetas).
function IntroContent({
  question,
  title,
  styles,
}: {
  question: Extract<OnboardingQuestion, { type: 'intro' }>;
  title: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.introBox}>
      <Animated.Text entering={ZoomIn.springify().damping(12)} style={styles.introEmoji}>
        {question.emoji}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(120).duration(300)} style={[styles.title, styles.introTitle]}>
        {title}
      </Animated.Text>
      {question.minutes ? (
        <Animated.View entering={FadeIn.delay(200)} style={styles.introChip}>
          <Text style={styles.introChipText}>⏱ {question.minutes}</Text>
        </Animated.View>
      ) : null}
      <Animated.View entering={FadeInDown.delay(260).duration(320)} style={styles.introCard}>
        <Text style={styles.introCardLabel}>Por qué te lo preguntamos</Text>
        <Text style={styles.introCardText}>{question.why}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(380).duration(320)} style={styles.introCard}>
        <Text style={styles.introCardLabel}>Cómo lo usará tu entrenador</Text>
        <Text style={styles.introCardText}>{question.coachUse}</Text>
      </Animated.View>
    </View>
  );
}

function QuestionInput({
  question,
  answers,
  setAnswer,
  onSelect,
  heightUnit,
  setHeightUnit,
  weightUnit,
  setWeightUnit,
  defaultFirstName,
  defaultLastName,
  onScaleDraggingChange,
  showPassword,
  onTogglePassword,
  styles,
  C,
}: {
  question: OnboardingQuestion;
  answers: OnboardingAnswers;
  setAnswer: (id: string, value: any) => void;
  onSelect: (id: string, value: any, autoAdvance?: boolean) => void;
  heightUnit: 'cm' | 'ft';
  setHeightUnit: (u: 'cm' | 'ft') => void;
  weightUnit: 'kg' | 'lbs';
  setWeightUnit: (u: 'kg' | 'lbs') => void;
  defaultFirstName?: string;
  defaultLastName?: string;
  onScaleDraggingChange: (dragging: boolean) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  styles: ReturnType<typeof createStyles>;
  C: ReturnType<typeof useAppColorMode>['colors'];
}) {
  if (question.type === 'name') {
    const value = (answers.name as { first_name: string; last_name: string } | undefined) ?? {
      first_name: defaultFirstName ?? '',
      last_name: defaultLastName ?? '',
    };
    // Una tarjeta con etiqueta por campo, mismo patrón que edit_profile_screen.tsx.
    const initials = [value.first_name[0], value.last_name[0]].filter(Boolean).join('').toUpperCase() || '?';
    return (
      <View>
        <View style={styles.nameAvatar}>
          <Text style={styles.nameAvatarText}>{initials}</Text>
        </View>
        <View style={styles.nameCard}>
          <View style={styles.nameRow}>
            <Text style={styles.nameLabel}>Nombre</Text>
            <Input style={styles.nameInput}>
              <InputField
                placeholder="Nombre"
                value={value.first_name}
                onChangeText={(t) => setAnswer('name', { ...value, first_name: t })}
              />
            </Input>
          </View>
          <View style={[styles.nameRow, styles.nameRowLast]}>
            <Text style={styles.nameLabel}>Apellidos</Text>
            <Input style={styles.nameInput}>
              <InputField
                placeholder="Apellidos"
                value={value.last_name}
                onChangeText={(t) => setAnswer('name', { ...value, last_name: t })}
              />
            </Input>
          </View>
        </View>
      </View>
    );
  }

  if (question.type === 'single_choice') {
    return (
      <OptionCards
        options={question.options}
        value={answers[question.id] as string | undefined}
        onChange={(v) => onSelect(question.id, v, question.autoAdvance)}
      />
    );
  }

  if (question.type === 'multi_choice') {
    const options = question.options.filter((o) => !o.showIf || o.showIf(answers));
    const current = (answers[question.id] as string[] | undefined) ?? [];
    const toggle = (v: string) => {
      const option = options.find((o) => o.value === v);
      if (current.includes(v)) {
        onSelect(question.id, current.filter((x) => x !== v));
      } else if (option?.exclusive) {
        onSelect(question.id, [v]);
      } else {
        const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.value));
        onSelect(question.id, [...current.filter((x) => !exclusive.has(x)), v]);
      }
    };
    return <OptionCards options={options} value={current} onChange={toggle} />;
  }

  if (question.type === 'text_group') {
    return (
      <View style={styles.groupCard}>
        {question.fields.map((field, i) => (
          <View key={field.id} style={[styles.nameRow, i === question.fields.length - 1 && styles.nameRowLast]}>
            <Text style={styles.nameLabel}>{field.label}</Text>
            <Input style={styles.nameInput}>
              <InputField
                placeholder={field.placeholder}
                value={(answers[field.id] as string | undefined) ?? ''}
                onChangeText={(t) => setAnswer(field.id, t)}
              />
            </Input>
          </View>
        ))}
      </View>
    );
  }

  if (question.type === 'strength_references') {
    const refs = (answers[question.id] as StrengthReferencesAnswer | undefined) ?? {};
    const update = (key: string, field: 'kg' | 'reps', text: string) => {
      const clean = field === 'kg' ? text.replace(/[^0-9.,]/g, '') : text.replace(/[^0-9]/g, '');
      setAnswer(question.id, { ...refs, [key]: { ...refs[key], [field]: clean } });
    };
    return (
      <View style={styles.groupCard}>
        {question.exercises.map((ex, i) => (
          <View key={ex.key} style={[styles.strengthRow, i === question.exercises.length - 1 && styles.nameRowLast]}>
            <Text style={styles.strengthLabel}>{ex.label}</Text>
            {ex.hint ? <Text style={styles.strengthHint}>{ex.hint}</Text> : null}
            <View style={styles.strengthInputs}>
              <Input style={styles.strengthInput}>
                <InputField
                  placeholder="kg"
                  keyboardType="decimal-pad"
                  value={refs[ex.key]?.kg ?? ''}
                  onChangeText={(t) => update(ex.key, 'kg', t)}
                />
              </Input>
              <Text style={styles.strengthTimes}>×</Text>
              <Input style={styles.strengthInput}>
                <InputField
                  placeholder="reps"
                  keyboardType="number-pad"
                  value={refs[ex.key]?.reps ?? ''}
                  onChangeText={(t) => update(ex.key, 'reps', t)}
                />
              </Input>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (question.type === 'scale') {
    return (
      <ScaleSelector
        min={question.min}
        max={question.max}
        value={answers[question.id] as number | undefined}
        onChange={(v) => setAnswer(question.id, v)}
        onDraggingChange={onScaleDraggingChange}
      />
    );
  }

  if (question.type === 'number_wheel') {
    const value = (answers[question.id] as number | undefined) ?? question.defaultValue;
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <NumberWheelPicker
          min={question.min}
          max={question.max}
          step={question.step}
          value={value}
          onChange={(v) => setAnswer(question.id, v)}
        />
        {question.suffix ? <Text style={styles.unitLabel}>{question.suffix}</Text> : null}
      </View>
    );
  }

  if (question.type === 'ruler') {
    const q = question as RulerQuestion;
    const isHeight = q.id === 'height';
    const unit = isHeight ? heightUnit : weightUnit;
    // Cast: TS infiere el parámetro de la unión de ambos setters como `never`.
    const setUnit = (isHeight ? setHeightUnit : setWeightUnit) as (u: string) => void;
    const baseValue = (answers[q.id] as number | undefined) ?? q.defaultValue;
    const activeUnitDef = q.units.find((u) => u.value === unit) ?? q.units[0];
    const displayValue = activeUnitDef.fromBase(baseValue);
    // `q.decimals` es la precisión de la unidad BASE; una unidad convertida
    // (ft/lbs) se muestra siempre con 1 decimal.
    const isBaseUnit = activeUnitDef.value === q.units[0].value;
    const displayDecimals = isBaseUnit ? q.decimals : 1;

    return (
      <View style={{ alignItems: 'center' }}>
        {/* Liquid Glass real en iOS 26+ (pedido explícito 2026-08-29). */}
        <GlassSegmentedBar style={styles.unitToggle}>
          {q.units.map((u) => (
            <Pressable
              key={u.value}
              onPress={() => setUnit(u.value)}
              style={[styles.unitPill, unit === u.value && styles.unitPillActive]}
            >
              <Text style={[styles.unitPillText, unit === u.value && styles.unitPillTextActive]}>{u.label}</Text>
            </Pressable>
          ))}
        </GlassSegmentedBar>
        <Text style={styles.bigNumber}>
          {displayDecimals === 1 ? displayValue.toFixed(1).replace('.', ',') : Math.round(displayValue)}
        </Text>
        <Text style={styles.unitLabel}>{activeUnitDef.label}</Text>
        <View style={{ marginTop: 12, width: '100%' }}>
          <RulerPicker
            min={q.min}
            max={q.max}
            decimals={q.decimals}
            value={baseValue}
            onChange={(v) => setAnswer(q.id, v)}
          />
        </View>
      </View>
    );
  }

  if (question.type === 'text') {
    return (
      <Input>
        <InputField
          placeholder={question.placeholder}
          value={(answers[question.id] as string | undefined) ?? ''}
          onChangeText={(t) => setAnswer(question.id, t)}
        />
      </Input>
    );
  }

  // Email + teléfono (2026-09-29). El teléfono es opcional: hacerlo
  // obligatorio es de los campos que más abandono provocan (ver
  // docs/ONBOARDING_INVESTIGACION.md).
  if (question.type === 'contact') {
    const phone = answers.phone_number as string | undefined;
    const phoneInvalid = !!phoneDigits(phone) && !isValidPhone(phone);
    return (
      <View style={{ gap: 18 }}>
        <View>
          <Text style={styles.fieldLabel}>Email</Text>
          <Input>
            <InputField
              placeholder="tu@email.com"
              value={(answers.email as string | undefined) ?? ''}
              onChangeText={(t) => setAnswer('email', t)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </Input>
        </View>
        <View>
          <Text style={styles.fieldLabel}>Teléfono (opcional)</Text>
          <Input>
            <InputField
              placeholder="+34 600 000 000"
              value={phone ?? ''}
              onChangeText={(t) => setAnswer('phone_number', t)}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </Input>
          <Text style={[styles.fieldHint, phoneInvalid && { color: C.red }]}>
            {phoneInvalid
              ? 'Revisa el número: debe tener entre 9 y 15 dígitos'
              : 'Para que tu entrenador pueda contactarte más rápido. No lo compartimos con nadie.'}
          </Text>
        </View>
      </View>
    );
  }

  if (question.type === 'password') {
    return (
      <Input>
        <InputField
          placeholder={question.placeholder}
          value={(answers[question.id] as string | undefined) ?? ''}
          onChangeText={(t) => setAnswer(question.id, t)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <InputSlot className="pr-3" onPress={onTogglePassword}>
          <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} className="text-muted-foreground" />
        </InputSlot>
      </Input>
    );
  }

  if (question.type !== 'textarea') return null;

  // textarea -- fondo explícito (C.surface): el componente compartido no fija
  // ningún bg en modo claro y se confundía con el fondo de la pantalla.
  return (
    <Textarea className="h-auto" style={{ minHeight: 120, backgroundColor: C.surface }}>
      <TextareaInput
        placeholder={question.placeholder}
        value={(answers[question.id] as string | undefined) ?? ''}
        onChangeText={(t) => setAnswer(question.id, t)}
        numberOfLines={5}
        style={{ paddingTop: 12 }}
      />
    </Textarea>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE },
  title: { fontSize: 24, lineHeight: 30, fontFamily: FONT.extraBold, color: C.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 14.5, lineHeight: 20, fontFamily: FONT.regular, color: C.textSecondary, marginBottom: 28 },
  body: { marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  bigNumber: { fontSize: 46, fontFamily: FONT.extraBold, color: C.textPrimary, marginTop: 24 },
  unitLabel: { fontSize: 13, fontFamily: FONT.medium, color: C.textSecondary },
  unitToggle: { flexDirection: 'row', backgroundColor: C.border, borderRadius: RADIUS.lg, padding: 4 },
  unitPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.md },
  unitPillActive: { backgroundColor: C.surface },
  unitPillText: { fontSize: 13, fontFamily: FONT.semiBold, color: C.textSecondary },
  unitPillTextActive: { color: C.textPrimary },
  nameAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  nameAvatarText: { fontFamily: FONT.extraBold, fontSize: 26, color: '#FFFFFF' },
  // C.surface, no C.gray80: sobre el fondo la tarjeta quedaba invisible.
  nameCard: { backgroundColor: C.surface, borderRadius: RADIUS.md },
  nameRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  nameRowLast: { borderBottomWidth: 0 },
  nameLabel: { fontFamily: FONT.medium, fontSize: 13, color: C.textSecondary, marginBottom: 4 },
  nameInput: { borderWidth: 0, height: 26, backgroundColor: 'transparent' },
  groupCard: { backgroundColor: C.surface, borderRadius: RADIUS.md },
  strengthRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  strengthLabel: { fontFamily: FONT.bold, fontSize: 15, color: C.textPrimary },
  strengthHint: { fontFamily: FONT.regular, fontSize: 12.5, color: C.textSecondary, marginTop: 2 },
  strengthInputs: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  strengthInput: { flex: 1 },
  strengthTimes: { fontFamily: FONT.bold, fontSize: 16, color: C.textSecondary },
  fieldLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: C.textSecondary, marginBottom: 6 },
  fieldHint: { fontFamily: FONT.regular, fontSize: 12.5, color: C.textSecondary, marginTop: 6 },
  introBox: { alignItems: 'center', paddingTop: 12 },
  introEmoji: { fontSize: 64, marginBottom: 16 },
  introTitle: { textAlign: 'center' },
  introChip: {
    backgroundColor: `${C.orange}26`,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  introChipText: { fontFamily: FONT.semiBold, fontSize: 12.5, color: C.textPrimary },
  introCard: {
    alignSelf: 'stretch',
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
  },
  introCardLabel: { fontFamily: FONT.bold, fontSize: 13, color: C.orange, marginBottom: 6 },
  introCardText: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 21, color: C.textPrimary },
  });
}
