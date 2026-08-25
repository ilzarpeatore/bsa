import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, InputField } from '@components/ui/input';
import { Textarea, TextareaInput } from '@components/ui/textarea';
import { Button, ButtonText } from '@components/ui/button';
import { Spinner } from '@components/ui/spinner';
import { useAuth } from '@store/AuthContext';
import logger from '@helper/logger';
import { onboardingV2Api } from '../../../api/onboardingV2';
import { ONBOARDING_QUESTIONS } from '../../../constants/onboardingV2Questions';
import {
  ONBOARDING_STAGES,
  OnboardingAnswers,
  OnboardingQuestion,
  RulerQuestion,
} from '../../../types/onboardingV2';
import OnboardingHeader from '../../../components/onboarding_v2/OnboardingHeader';
import OptionCards from '../../../components/onboarding_v2/OptionCards';
import ScaleSelector from '../../../components/onboarding_v2/ScaleSelector';
import RulerPicker from '../../../components/onboarding_v2/RulerPicker';
import NumberWheelPicker from '../../../components/onboarding_v2/NumberWheelPicker';
import { FONT } from '../theme';
import { useAppColorMode } from '@helper/useAppColorMode';

// Motor genérico del nuevo onboarding (4 etapas, ver docs/ONBOARDING_V2.md):
// UNA sola screen recorre `ONBOARDING_QUESTIONS` con un índice interno (no
// hay una ruta de navegación por pregunta) -- así el "atrás" entre preguntas
// es instantáneo y no ensucia el stack de React Navigation con 36 entradas.
// Las respuestas se guardan en AsyncStorage en cada paso (permite reanudar
// si la app se cierra a medias) y se envían a la API al terminar cada etapa.

const ANSWERS_STORAGE_KEY = '@befit_onboarding_v2_answers';

function isAnswered(question: OnboardingQuestion, answers: OnboardingAnswers): boolean {
  if (question.required === false) return true;
  const value = answers[question.id];
  if (question.type === 'name') {
    const v = value as { first_name: string; last_name: string } | undefined;
    return !!v?.first_name?.trim() && !!v?.last_name?.trim();
  }
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

export default function OnboardingV2Screen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { state } = useAuth();
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);

  // Reanudación: si el usuario cerró la app a mitad del onboarding, recupera
  // sus respuestas ya dadas (nunca el índice de pregunta -- más simple y
  // seguro volver a la primera pregunta sin responder que arriesgarse a un
  // índice fuera de rango si esta lista de preguntas cambia entre versiones).
  useEffect(() => {
    AsyncStorage.getItem(ANSWERS_STORAGE_KEY)
      .then((raw) => {
        if (raw) setAnswers(JSON.parse(raw));
      })
      .catch((e) => logger.error(e))
      .finally(() => setRestored(true));
  }, []);

  useEffect(() => {
    if (!restored) return;
    AsyncStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers)).catch((e) => logger.error(e));
  }, [answers, restored]);

  const question = ONBOARDING_QUESTIONS[questionIndex];
  const stageIndex = ONBOARDING_STAGES.findIndex((s) => s.id === question.stage);
  const stageQuestions = useMemo(
    () => ONBOARDING_QUESTIONS.filter((q) => q.stage === question.stage),
    [question.stage]
  );
  const indexWithinStage = stageQuestions.findIndex((q) => q.id === question.id);
  const stageProgress = indexWithinStage / stageQuestions.length;
  const isLastQuestion = questionIndex === ONBOARDING_QUESTIONS.length - 1;
  const isLastOfStage = indexWithinStage === stageQuestions.length - 1;

  const setAnswer = useCallback((id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Bug real reportado: ruler/number_wheel muestran su defaultValue en el
  // picker desde el primer render (para no arrancar vacíos), pero hasta que
  // el usuario mueve el dedo no se llama a setAnswer -- si el valor que
  // quiere es justo el que ya se ve preseleccionado (ej. su edad real
  // coincide con el default mostrado), "Continuar" se queda deshabilitado
  // porque isAnswered() lee `answers[question.id]` (todavía undefined), no
  // lo que hay pintado en pantalla. Sembrar aquí el default en cuanto se
  // entra a una pregunta de este tipo hace que el valor mostrado y el
  // guardado sean el mismo desde el principio, sin esperar a un gesto.
  useEffect(() => {
    if (!restored) return;
    if ((question.type === 'ruler' || question.type === 'number_wheel') && answers[question.id] === undefined) {
      setAnswer(question.id, question.defaultValue);
    }
  }, [question, restored, answers, setAnswer]);

  const submitStage = useCallback(
    async (stageId: string): Promise<boolean> => {
      try {
        if (stageId === 'personal_data') {
          const name = answers.name as { first_name: string; last_name: string } | undefined;
          await onboardingV2Api.submitPersonalData(
            {
              first_name: name?.first_name ?? '',
              last_name: name?.last_name ?? '',
              gender: (answers.gender as any) ?? 'other',
              age: Number(answers.age) || 0,
              height: Number(answers.height) || 0,
              height_unit: heightUnit,
              weight: Number(answers.weight) || 0,
              weight_unit: weightUnit,
            },
            state.user?.username ?? '',
            state.user?.email ?? ''
          );
        } else if (stageId === 'par_q') {
          await onboardingV2Api.submitParQ({
            parq_heart_condition: answers.parq_heart_condition === 'yes',
            parq_chest_pain_activity: answers.parq_chest_pain_activity === 'yes',
            parq_chest_pain_rest_last_month: answers.parq_chest_pain_rest_last_month === 'yes',
            parq_dizziness_balance: answers.parq_dizziness_balance === 'yes',
            parq_bone_joint_problem: answers.parq_bone_joint_problem === 'yes',
            parq_bp_or_heart_medication: answers.parq_bp_or_heart_medication === 'yes',
            parq_reason_not_to_exercise: answers.parq_reason_not_to_exercise === 'yes',
            parq_fitness_level: Number(answers.parq_fitness_level) || 0,
            parq_medical_history: String(answers.parq_medical_history ?? ''),
            parq_goals: String(answers.parq_goals ?? ''),
          });
        } else if (stageId === 'training_questionnaire') {
          await onboardingV2Api.submitTrainingQuestionnaire({
            goal_type: answers.goal_type as any,
            activity_level: answers.activity_level as any,
            lifestyle_type: answers.lifestyle_type as any,
            // El usuario responde en años (training_experience_years, ver
            // constants/onboardingV2Questions.ts) -- el backend sigue
            // esperando meses, se convierte aquí antes de enviar.
            training_experience_months: (Number(answers.training_experience_years) || 0) * 12,
            training_days_per_week: Number(answers.training_days_per_week) || 0,
            session_duration_preference: answers.session_duration_preference as any,
            training_mindset: answers.training_mindset as any,
            previous_coaching: answers.previous_coaching as any,
            current_routine_style: answers.current_routine_style as any,
            weekly_split_preference: answers.weekly_split_preference as any,
            technique_level: Number(answers.technique_level) || 0,
            realistic_goal: String(answers.realistic_goal ?? ''),
          });
        } else if (stageId === 'nutrition_questionnaire') {
          await onboardingV2Api.submitNutritionQuestionnaire({
            allergies_intolerances: String(answers.allergies_intolerances ?? ''),
            disliked_foods: String(answers.disliked_foods ?? ''),
            liked_foods: String(answers.liked_foods ?? ''),
            current_meals_per_day: Number(answers.current_meals_per_day) || 0,
            desired_meals_per_day: Number(answers.desired_meals_per_day) || 0,
            typical_day_meals: String(answers.typical_day_meals ?? ''),
            favorite_meats: String(answers.favorite_meats ?? ''),
            favorite_fish: String(answers.favorite_fish ?? ''),
            favorite_fruits_vegetables: String(answers.favorite_fruits_vegetables ?? ''),
            favorite_combined_dishes: String(answers.favorite_combined_dishes ?? ''),
          });
        }
        return true;
      } catch (e) {
        // Best-effort: etapas 2-4 aún no tienen endpoint real (ver
        // docs/ONBOARDING_V2.md), y ni siquiera la etapa 1 debe bloquear el
        // alta de un usuario por un fallo de red puntual -- las respuestas
        // ya quedaron a salvo en AsyncStorage. El valor de retorno (false)
        // sí se usa -- ver handleContinue: si la ÚLTIMA etapa falla, no se
        // borra el checkpoint de AsyncStorage, para no perder la única copia
        // de unas respuestas que nunca llegaron a guardarse en el backend.
        logger.error(`[onboarding_v2] fallo al enviar etapa ${stageId}`, e);
        return false;
      }
    },
    [answers, heightUnit, weightUnit, state.user]
  );

  const handleContinue = useCallback(async () => {
    let stageSubmitted = true;
    if (isLastOfStage) {
      setSubmitting(true);
      stageSubmitted = await submitStage(question.stage);
      setSubmitting(false);
    }
    if (isLastQuestion) {
      // Se pasan las respuestas por params en vez de depender de que la
      // screen de resultado las relea de AsyncStorage -- se borran justo
      // antes de navegar (una fila más abajo), así que para cuando esa
      // pantalla montase ya no estarían disponibles ahí. Si la última etapa
      // falló al enviarse, NO se borra el checkpoint -- es la única copia
      // de esas respuestas fuera del backend, y borrarla en ese momento
      // eliminaría cualquier posibilidad de reintentar el envío más
      // adelante (ver comentario de submitStage).
      const finalAnswers = answers;
      if (stageSubmitted) {
        await AsyncStorage.removeItem(ANSWERS_STORAGE_KEY).catch(() => {});
      }
      navigation.replace('MigratedAssessmentResult', { answers: finalAnswers });
      return;
    }
    setQuestionIndex((i) => i + 1);
  }, [isLastOfStage, isLastQuestion, question.stage, submitStage, navigation, answers]);

  const handleBack = useCallback(() => {
    if (questionIndex === 0) {
      if (navigation.canGoBack()) navigation.goBack();
      return;
    }
    setQuestionIndex((i) => i - 1);
  }, [questionIndex, navigation]);

  if (!restored) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <Spinner size="large" color={C.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    // 'top' se queda fuera a propósito: OnboardingHeader ya gestiona su
    // propio safe-area top con useSafeAreaInsets (mismo patrón que
    // ScreenHeader.tsx) -- añadirlo aquí también duplicaría el hueco
    // superior, el mismo bug ya corregido esta sesión en otras pantallas.
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OnboardingHeader
        onBack={handleBack}
        stageCount={ONBOARDING_STAGES.length}
        currentStageIndex={stageIndex}
        stageProgress={stageProgress}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{question.title}</Text>
          {question.subtitle ? <Text style={styles.subtitle}>{question.subtitle}</Text> : null}

          <View style={styles.body}>
            <QuestionInput
              question={question}
              answers={answers}
              setAnswer={setAnswer}
              heightUnit={heightUnit}
              setHeightUnit={setHeightUnit}
              weightUnit={weightUnit}
              setWeightUnit={setWeightUnit}
              defaultFirstName={state.user?.first_name}
              defaultLastName={state.user?.last_name}
              styles={styles}
              C={C}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            size="lg"
            radius="pill"
            onPress={handleContinue}
            disabled={!isAnswered(question, answers) || submitting}
          >
            {submitting ? <Spinner size="small" color="#FFFFFF" /> : <ButtonText>Continuar</ButtonText>}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function QuestionInput({
  question,
  answers,
  setAnswer,
  heightUnit,
  setHeightUnit,
  weightUnit,
  setWeightUnit,
  defaultFirstName,
  defaultLastName,
  styles,
  C,
}: {
  question: OnboardingQuestion;
  answers: OnboardingAnswers;
  setAnswer: (id: string, value: any) => void;
  heightUnit: 'cm' | 'ft';
  setHeightUnit: (u: 'cm' | 'ft') => void;
  weightUnit: 'kg' | 'lbs';
  setWeightUnit: (u: 'kg' | 'lbs') => void;
  defaultFirstName?: string;
  defaultLastName?: string;
  styles: ReturnType<typeof createStyles>;
  C: ReturnType<typeof useAppColorMode>['colors'];
}) {
  if (question.type === 'name') {
    const value = (answers.name as { first_name: string; last_name: string } | undefined) ?? {
      first_name: defaultFirstName ?? '',
      last_name: defaultLastName ?? '',
    };
    // Antes eran 2 pills sueltas flotando sobre el fondo gris, sin más
    // jerarquía que el placeholder -- agrupadas en una sola tarjeta con
    // etiqueta encima de cada campo y un divisor fino entre filas, mismo
    // patrón que ya usa edit_profile_screen.tsx (pedido explícito: acercar
    // esta pantalla al nivel visual de esa otra).
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
        onChange={(v) => setAnswer(question.id, v)}
      />
    );
  }

  if (question.type === 'scale') {
    return (
      <ScaleSelector
        min={question.min}
        max={question.max}
        value={answers[question.id] as number | undefined}
        onChange={(v) => setAnswer(question.id, v)}
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
    // Cast explícito: TS infiere el parámetro de la unión de ambos setters
    // como `never` (los literales 'cm'|'ft' y 'kg'|'lbs' son disjuntos), no
    // por ningún motivo real -- `unit.value` siempre es el string correcto
    // para el setter elegido según `isHeight`.
    const setUnit = (isHeight ? setHeightUnit : setWeightUnit) as (u: string) => void;
    const baseValue = (answers[q.id] as number | undefined) ?? q.defaultValue;
    const activeUnitDef = q.units.find((u) => u.value === unit) ?? q.units[0];
    const displayValue = activeUnitDef.fromBase(baseValue);
    // `q.decimals` describe la precisión de la unidad BASE (cm=0, kg=1); una
    // unidad convertida (ft/lbs) casi nunca cae en un número entero, así que
    // siempre se muestra con 1 decimal salvo que sea la propia unidad base.
    const isBaseUnit = activeUnitDef.value === q.units[0].value;
    const displayDecimals = isBaseUnit ? q.decimals : 1;

    return (
      <View style={{ alignItems: 'center' }}>
        <View style={styles.unitToggle}>
          {q.units.map((u) => (
            <Pressable
              key={u.value}
              onPress={() => setUnit(u.value)}
              style={[styles.unitPill, unit === u.value && styles.unitPillActive]}
            >
              <Text style={[styles.unitPillText, unit === u.value && styles.unitPillTextActive]}>{u.label}</Text>
            </Pressable>
          ))}
        </View>
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

  // textarea -- el componente compartido (components/ui/textarea) no fija
  // ningún bg-* en modo claro (solo dark:bg-input/30), así que el bloque
  // quedaba transparente, mezclándose con el fondo gris de la pantalla y
  // distinguiéndose solo por el borde fino. Fondo blanco explícito (C.surface,
  // ya se adapta solo a modo oscuro) para que se note como un bloque propio.
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: FONT.extraBold, color: C.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 14.5, lineHeight: 20, fontFamily: FONT.regular, color: C.textSecondary, marginBottom: 28 },
  body: { marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  bigNumber: { fontSize: 46, fontFamily: FONT.extraBold, color: C.textPrimary, marginTop: 24 },
  unitLabel: { fontSize: 13, fontFamily: FONT.medium, color: C.textSecondary },
  unitToggle: { flexDirection: 'row', backgroundColor: C.border, borderRadius: 20, padding: 4 },
  unitPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
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
  // C.gray80 (alias deprecado de `accent`, casi idéntico a C.bg/border) dejaba
  // esta tarjeta prácticamente invisible sobre el fondo -- mismo bug ya
  // corregido antes en edit_profile_screen.tsx, que usa C.surface.
  nameCard: { backgroundColor: C.surface, borderRadius: 16 },
  nameRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  nameRowLast: { borderBottomWidth: 0 },
  nameLabel: { fontFamily: FONT.medium, fontSize: 13, color: C.textSecondary, marginBottom: 4 },
  nameInput: { borderWidth: 0, height: 26, backgroundColor: 'transparent' },
  });
}
