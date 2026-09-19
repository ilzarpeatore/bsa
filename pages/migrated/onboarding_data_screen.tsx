import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Button, ButtonText } from '@components/ui/button';
import { Spinner } from '@components/ui/spinner';
import { Input, InputField } from '@components/ui/input';
import { Textarea, TextareaInput } from '@components/ui/textarea';
import { Icon } from '@components/ui/icon';
import ScreenHeader from '@components/ScreenHeader';
import { showToast } from '@helper/toast';
import logger from '@helper/logger';
import { useAppColorMode } from '@helper/useAppColorMode';
import { useAuth } from '@store/AuthContext';
import {
  onboardingV2Api,
  ParQPayload,
  TrainingQuestionnairePayload,
  NutritionQuestionnairePayload,
} from '../../api/onboardingV2';
import { ONBOARDING_QUESTIONS } from '../../constants/onboardingV2Questions';
import { OnboardingQuestion, OnboardingOption } from '../../types/onboardingV2';
import { FONT, RADIUS } from './theme';

// Pantalla nueva (2026-09-18, pedido explícito): "Cuenta" solo dejaba editar
// nombre/foto/peso/altura (MigratedEditProfile) y disponibilidad de
// entrenamiento (MigratedTrainingAvailability, ver ese archivo) -- todo lo
// demás del onboarding (PAR-Q, cuestionario de entrenamiento, cuestionario de
// nutrición) quedaba fijo para siempre tras completarlo una vez. Esta pantalla
// lista TODO lo ya rellenado (GET v1/onboarding/my-answers, nuevo) en formato
// scroll vertical, más simple que el carrusel del onboarding -- un campo por
// fila en vez de una pregunta por pantalla -- y permite editarlo.
//
// Reutiliza ONBOARDING_QUESTIONS (constants/onboardingV2Questions.ts) para no
// duplicar el texto de las preguntas/opciones -- es la misma fuente que ya usa
// el onboarding real, así que un cambio de copy ahí se refleja aquí solo.
// Reutiliza también los 3 endpoints POST existentes (par-q,
// training-questionnaire, nutrition-questionnaire): los tres ya hacían
// updateOrCreate desde que se escribieron, así que sirven tal cual para
// guardar una edición -- no hizo falta ningún endpoint nuevo de escritura.
//
// Días/duración de entrenamiento NO se edita aquí a propósito -- vive en su
// propia pantalla (MigratedTrainingAvailability, con su propio endpoint
// training-availability-update) desde 2026-09-16. Esta pantalla solo muestra
// una fila de acceso directo a ella, para no duplicar esa lógica.
//
// Nombre, edad, altura y peso tampoco se editan aquí -- ya viven en
// MigratedEditProfile (pedido explícito, mismo motivo: no duplicar).

const QUESTION_BY_ID: Record<string, OnboardingQuestion> = Object.fromEntries(
  ONBOARDING_QUESTIONS.map((q) => [q.id, q])
);

// FIX (reportado 2026-09-19, caso real Osas Ehigiator / Alberto Martín): el
// onboarding de registro de ambos falló a mitad (bug ya solucionado) y nunca
// llegó a guardar PAR-Q ni cuestionario de nutrición -- el backend devuelve
// `null` para esas etapas (ver getMyAnswers() más abajo). Esta pantalla solo
// sabía "editar" una respuesta que ya existía: si venía `null` mostraba un
// texto fijo sin ningún formulario, sin forma real de rellenarlo por primera
// vez. `id`/`user_id` ahora son opcionales -- solo los trae un registro que
// YA existe en el backend; un formulario recién scaffoldeado para rellenar
// desde cero no los tiene todavía (se obtienen recargando tras el primer
// guardado, ver loadAnswers()).
type ParQForm = Partial<ParQPayload> & { id?: number; user_id?: number };
type TrainingForm = Partial<TrainingQuestionnairePayload> & { id?: number; user_id?: number };
type NutritionForm = Partial<NutritionQuestionnairePayload> & { id?: number; user_id?: number };

// Construye un formulario en blanco a partir de la lista de preguntas de una
// etapa -- un campo por pregunta, sin preseleccionar ninguna respuesta
// (textarea empieza en '', el resto en `undefined`). Importante NO defaultear
// las preguntas sí/no del PAR-Q (p. ej. "¿tiene una enfermedad cardíaca?") a
// "No" solo por comodidad -- FieldRow/PillOptions tratan `undefined` como "sin
// responder todavía" (ningún pill resaltado), igual que el onboarding real
// nunca preselecciona una opción de single_choice.
function buildEmptyAnswers<T>(questions: OnboardingQuestion[]): T {
  const obj: Record<string, unknown> = {};
  for (const q of questions) {
    obj[q.id] = q.type === 'textarea' ? '' : undefined;
  }
  return obj as unknown as T;
}

// Solo para el caso "formulario nuevo, nunca rellenado": a diferencia de la
// vista de edición (que remite días/duración a su propia pantalla, ver
// comentario de cabecera), aquí hacen falta también training_days_per_week y
// session_duration_preference -- ese endpoint dedicado (training-availability-
// update) exige que el cuestionario YA exista, así que en el alta inicial no
// se puede delegar todavía, hay que pedirlos en este mismo formulario.
// training_experience_years se excluye a propósito: el campo real
// (training_experience_months) usa su propio input numérico más abajo, igual
// en el caso nuevo que en el de edición.
const TRAINING_QUESTIONS_FOR_NEW = ONBOARDING_QUESTIONS.filter(
  (q) => q.stage === 'training_questionnaire' && q.id !== 'training_experience_years'
);

// IDs de ONBOARDING_QUESTIONS cuyo valor es boolean en el backend pero se
// presenta como Sí/No ('yes'/'no') en las opciones del onboarding -- misma
// traducción que ya hace submitStage() en onboarding_v2_screen.tsx.
const BOOLEAN_FIELDS = new Set([
  'parq_heart_condition',
  'parq_chest_pain_activity',
  'parq_chest_pain_rest_last_month',
  'parq_dizziness_balance',
  'parq_bone_joint_problem',
  'parq_bp_or_heart_medication',
  'parq_reason_not_to_exercise',
  'parq_pregnant_or_possible',
  'parq_menstrual_change_or_stress_fracture',
  'parq_eating_disorder_history',
  'cooks_for_others',
]);

function PillOptions({
  options,
  value,
  onChange,
  C,
}: {
  options: OnboardingOption[];
  value: string;
  onChange: (v: string) => void;
  C: ReturnType<typeof useAppColorMode>['colors'];
}) {
  const styles = createStyles(C);
  return (
    <Box style={styles.pillWrap}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, selected && { backgroundColor: `${C.orange}26`, borderColor: C.orange }]}
          >
            <Text style={[styles.pillText, selected && { fontFamily: FONT.bold, color: C.textPrimary }]}>
              {opt.icon && opt.emoji ? `${opt.icon} ` : ''}
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

function FieldRow({
  question,
  value,
  onChange,
  C,
}: {
  question: OnboardingQuestion;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
  C: ReturnType<typeof useAppColorMode>['colors'];
}) {
  const styles = createStyles(C);
  const isBoolean = BOOLEAN_FIELDS.has(question.id);

  return (
    <Box style={styles.fieldRow}>
      <Text style={styles.fieldTitle}>{question.title}</Text>
      {question.type === 'single_choice' &&
        (() => {
          const opts = (question as any).options as OnboardingOption[];
          // `undefined` = pregunta todavía sin responder (formulario nuevo) --
          // no se resalta ningún pill, a diferencia de antes que un booleano
          // sin responder se mostraba como "No" ya seleccionado.
          const stringValue =
            value === undefined ? '' : isBoolean ? (value ? 'yes' : 'no') : String(value);
          return (
            <PillOptions
              options={opts}
              value={stringValue}
              onChange={(v) => onChange(isBoolean ? v === 'yes' : v)}
              C={C}
            />
          );
        })()}
      {(question.type === 'scale' || question.type === 'number_wheel') && (
        <Input style={styles.numberInput}>
          <InputField
            keyboardType="numeric"
            value={String(value ?? '')}
            onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
          />
        </Input>
      )}
      {question.type === 'textarea' && (
        <Textarea className="h-auto" style={{ minHeight: 90, backgroundColor: C.surface }}>
          <TextareaInput
            value={String(value ?? '')}
            onChangeText={(t) => onChange(t)}
            placeholder={(question as any).placeholder}
            numberOfLines={3}
            style={{ paddingTop: 10 }}
          />
        </Textarea>
      )}
    </Box>
  );
}

export default function OnboardingDataScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { state } = useAuth();
  const isFemale = state.user?.gender === 'female';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<null | 'par_q' | 'training' | 'nutrition'>(null);
  // `null` real solo significa "la carga inicial falló del todo" (ver
  // loadAnswers) -- una etapa nunca rellenada YA NO se queda en `null`, se
  // rellena con un formulario en blanco (buildEmptyAnswers) para que se
  // pueda completar aquí mismo. isNewParQ/isNewTraining/isNewNutrition (más
  // abajo) distinguen "formulario en blanco todavía sin guardar" de "ya
  // existe" mirando si trae `id` (un registro real del backend siempre lo
  // trae; el scaffold en blanco no).
  const [parQ, setParQ] = useState<ParQForm | null>(null);
  const [training, setTraining] = useState<TrainingForm | null>(null);
  const [nutrition, setNutrition] = useState<NutritionForm | null>(null);

  const isNewParQ = !parQ?.id;
  const isNewTraining = !training?.id;
  const isNewNutrition = !nutrition?.id;

  const parQQuestions = useMemo(
    () =>
      ONBOARDING_QUESTIONS.filter((q) => q.stage === 'par_q' && (q.showIf === undefined || isFemale)),
    [isFemale]
  );
  // Formulario nuevo (nunca guardado): incluye también
  // training_days_per_week/session_duration_preference, que si no habría que
  // pedir en la pantalla de disponibilidad de entrenamiento -- pero esa
  // pantalla exige que el cuestionario YA exista (ver TRAINING_QUESTIONS_FOR_NEW
  // arriba). Una vez guardado una vez (isNewTraining pasa a false tras
  // loadAnswers), esos 2 campos se excluyen y se editan en su propia pantalla,
  // como siempre.
  const trainingQuestions = useMemo(
    () =>
      isNewTraining
        ? TRAINING_QUESTIONS_FOR_NEW
        : ONBOARDING_QUESTIONS.filter(
            (q) =>
              q.stage === 'training_questionnaire' &&
              q.id !== 'training_days_per_week' &&
              q.id !== 'session_duration_preference' &&
              q.id !== 'training_experience_years'
          ),
    [isNewTraining]
  );
  const nutritionQuestions = useMemo(() => ONBOARDING_QUESTIONS.filter((q) => q.stage === 'nutrition_questionnaire'), []);

  // Extraída para poder recargar tras cada guardado (no solo al entrar a la
  // pantalla): un formulario recién guardado por primera vez necesita el
  // `id` real que le asigna el backend para dejar de tratarse como "nuevo"
  // (p. ej. para que días/duración del entrenamiento pasen a editarse en su
  // propia pantalla en vez de seguir pidiéndose aquí).
  const loadAnswers = useCallback(async () => {
    try {
      const res = await onboardingV2Api.getMyAnswers();
      setParQ(res.data.data.par_q ?? buildEmptyAnswers<ParQForm>(parQQuestions));
      setTraining(res.data.data.training_questionnaire ?? buildEmptyAnswers<TrainingForm>(TRAINING_QUESTIONS_FOR_NEW));
      setNutrition(res.data.data.nutrition_questionnaire ?? buildEmptyAnswers<NutritionForm>(nutritionQuestions));
    } catch (e) {
      logger.error('[onboarding_data] fallo al cargar', e);
      showToast('No se pudieron cargar tus datos', { variant: 'error' });
    }
  }, [parQQuestions, nutritionQuestions]);

  useEffect(() => {
    (async () => {
      await loadAnswers();
      setLoading(false);
       
    })();
  }, []);

  const saveParQ = useCallback(async () => {
    if (!parQ) return;
    setSaving('par_q');
    try {
      await onboardingV2Api.submitParQ(parQ as ParQPayload);
      showToast(isNewParQ ? 'Cribado médico guardado' : 'Cribado médico actualizado', {
        description: 'Si cambiaste alguna respuesta a "sí", tu coach lo revisará antes de tu próximo ciclo.',
        variant: 'success',
      });
      await loadAnswers();
    } catch (e: any) {
      logger.error('[onboarding_data] fallo al guardar par_q', e);
      showToast('No se pudo guardar', { description: e?.response?.data?.message, variant: 'error' });
    } finally {
      setSaving(null);
    }
  }, [parQ, isNewParQ, loadAnswers]);

  const saveTraining = useCallback(async () => {
    if (!training) return;
    setSaving('training');
    try {
      await onboardingV2Api.submitTrainingQuestionnaire(training as TrainingQuestionnairePayload);
      showToast(isNewTraining ? 'Cuestionario de entrenamiento guardado' : 'Cuestionario de entrenamiento actualizado', { variant: 'success' });
      await loadAnswers();
    } catch (e: any) {
      logger.error('[onboarding_data] fallo al guardar training', e);
      showToast('No se pudo guardar', { description: e?.response?.data?.message, variant: 'error' });
    } finally {
      setSaving(null);
    }
  }, [training, isNewTraining, loadAnswers]);

  const saveNutrition = useCallback(async () => {
    if (!nutrition) return;
    setSaving('nutrition');
    try {
      await onboardingV2Api.submitNutritionQuestionnaire(nutrition as NutritionQuestionnairePayload);
      showToast(isNewNutrition ? 'Cuestionario de nutrición guardado' : 'Cuestionario de nutrición actualizado', { variant: 'success' });
      await loadAnswers();
    } catch (e: any) {
      logger.error('[onboarding_data] fallo al guardar nutrition', e);
      showToast('No se pudo guardar', { description: e?.response?.data?.message, variant: 'error' });
    } finally {
      setSaving(null);
    }
  }, [nutrition, isNewNutrition, loadAnswers]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Mis respuestas" onBack={() => props.navigation?.goBack()} />
        <Box style={styles.loadingBox}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Mis respuestas" onBack={() => props.navigation?.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Días/duración vive en su propia pantalla (ver comentario de arriba) --
            solo un acceso directo aquí, no se duplica el formulario. Solo
            tiene sentido una vez el cuestionario ya existe de verdad (esa
            pantalla exige que ya esté guardado, ver TRAINING_QUESTIONS_FOR_NEW). */}
        {training && !isNewTraining && (
          <Pressable
            style={styles.linkRow}
            onPress={() => props.navigation?.navigate('MigratedTrainingAvailability')}
          >
            <Box>
              <Text style={styles.linkTitle}>Días y duración de entrenamiento</Text>
              <Text style={styles.linkSubtitle}>
                {training.training_days_per_week} días/semana · {training.session_duration_preference} min por sesión
              </Text>
            </Box>
            <Icon name="chevron-forward" size={18} color={C.gray50} />
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>Cribado médico (PAR-Q)</Text>
        {parQ === null ? (
          <Box style={styles.emptyCard}>
            <Text style={styles.emptyText}>No se pudieron cargar tus datos. Vuelve a intentarlo más tarde.</Text>
          </Box>
        ) : (
          <Box style={styles.card}>
            {isNewParQ && (
              <Text style={styles.newBanner}>
                Todavía no has completado esta parte del onboarding -- rellénala y guarda para terminarla.
              </Text>
            )}
            {parQQuestions.map((q) => (
              <FieldRow
                key={q.id}
                question={q}
                value={(parQ as any)[q.id]}
                onChange={(v) => setParQ({ ...parQ, [q.id]: v } as ParQForm)}
                C={C}
              />
            ))}
            <Button size="lg" radius="pill" onPress={saveParQ} disabled={saving === 'par_q'} style={styles.saveButton}>
              {saving === 'par_q' ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <ButtonText>{isNewParQ ? 'Guardar cribado médico' : 'Actualizar cribado médico'}</ButtonText>
              )}
            </Button>
          </Box>
        )}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Cuestionario de entrenamiento</Text>
        {training === null ? (
          <Box style={styles.emptyCard}>
            <Text style={styles.emptyText}>No se pudieron cargar tus datos. Vuelve a intentarlo más tarde.</Text>
          </Box>
        ) : (
          <Box style={styles.card}>
            {isNewTraining && (
              <Text style={styles.newBanner}>
                Todavía no has completado esta parte del onboarding -- rellénala y guarda para terminarla.
              </Text>
            )}
            {trainingQuestions.map((q) => (
              <FieldRow
                key={q.id}
                question={q}
                value={(training as any)[q.id]}
                onChange={(v) => setTraining({ ...training, [q.id]: v } as TrainingForm)}
                C={C}
              />
            ))}
            <Box style={styles.fieldRow}>
              <Text style={styles.fieldTitle}>Meses de experiencia entrenando</Text>
              <Input style={styles.numberInput}>
                <InputField
                  keyboardType="numeric"
                  value={String(training.training_experience_months ?? '')}
                  onChangeText={(t) =>
                    setTraining({ ...training, training_experience_months: Number(t.replace(/[^0-9]/g, '')) || 0 })
                  }
                />
              </Input>
            </Box>
            <Button size="lg" radius="pill" onPress={saveTraining} disabled={saving === 'training'} style={styles.saveButton}>
              {saving === 'training' ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <ButtonText>{isNewTraining ? 'Guardar cuestionario de entrenamiento' : 'Actualizar cuestionario de entrenamiento'}</ButtonText>
              )}
            </Button>
          </Box>
        )}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Cuestionario de nutrición</Text>
        {nutrition === null ? (
          <Box style={styles.emptyCard}>
            <Text style={styles.emptyText}>No se pudieron cargar tus datos. Vuelve a intentarlo más tarde.</Text>
          </Box>
        ) : (
          <Box style={styles.card}>
            {isNewNutrition && (
              <Text style={styles.newBanner}>
                Todavía no has completado esta parte del onboarding -- rellénala y guarda para terminarla.
              </Text>
            )}
            {nutritionQuestions.map((q) => (
              <FieldRow
                key={q.id}
                question={q}
                value={(nutrition as any)[q.id]}
                onChange={(v) => setNutrition({ ...nutrition, [q.id]: v } as NutritionForm)}
                C={C}
              />
            ))}
            <Button size="lg" radius="pill" onPress={saveNutrition} disabled={saving === 'nutrition'} style={styles.saveButton}>
              {saving === 'nutrition' ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <ButtonText>{isNewNutrition ? 'Guardar cuestionario de nutrición' : 'Actualizar cuestionario de nutrición'}</ButtonText>
              )}
            </Button>
          </Box>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    sectionLabel: { fontSize: 13, fontFamily: FONT.semiBold, color: C.gray50, textTransform: 'uppercase', letterSpacing: 0.06, marginBottom: 10 },
    sectionLabelSpaced: { marginTop: 24 },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, padding: 16 },
    emptyCard: { backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, padding: 16 },
    emptyText: { fontSize: 13.5, color: C.gray50 },
    newBanner: {
      fontSize: 12.5,
      color: C.orange,
      backgroundColor: `${C.orange}1A`,
      borderRadius: RADIUS.sm,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 16,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    linkTitle: { fontSize: 14.5, fontFamily: FONT.semiBold, color: C.textPrimary },
    linkSubtitle: { fontSize: 12.5, color: C.gray50, marginTop: 2 },
    fieldRow: { marginBottom: 18 },
    fieldTitle: { fontSize: 13.5, fontFamily: FONT.bold, color: C.textPrimary, marginBottom: 8, lineHeight: 18 },
    pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: RADIUS.pill ?? 999,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
    },
    pillText: { fontSize: 13, fontFamily: FONT.medium, color: C.textPrimary },
    numberInput: { maxWidth: 120 },
    saveButton: { marginTop: 4 },
  });
}
