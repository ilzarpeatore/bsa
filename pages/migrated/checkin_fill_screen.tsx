import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Input, InputField } from '@components/ui/input';
import { Textarea, TextareaInput } from '@components/ui/textarea';
import { Card } from '@components/ui/card';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { useTutorial } from '@store/TutorialContext';
import { useAppColorMode } from '@helper/useAppColorMode';
import {
  checkinsApi,
  CheckInForm,
  CheckInQuestion,
  CheckInAnswerInput,
  UNSUPPORTED_QUESTION_TYPES,
} from '../../api/checkins';

type AnswerValue = string | string[];

// Mismo patrón visual que el ScaleRow del chequeo de preparación
// (workout_preview_screen.tsx) - números o estrellas en fila, tap para elegir.
function ChoiceRow({
  count,
  value,
  onChange,
  icon,
}: {
  count: number;
  value: number | null;
  onChange: (v: number) => void;
  icon?: boolean;
}) {
  const { colors: C } = useAppColorMode();
  return (
    <Box className="flex-row flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const active = value !== null && n <= value;
        return (
          <Pressable
            key={n}
            className="items-center justify-center rounded-pill"
            style={{ width: 34, height: 34, backgroundColor: active ? C.accentBlack : C.bg }}
            onPress={() => onChange(n)}
          >
            {icon ? (
              <Icon name="star" size={16} color={active ? '#FFFFFF' : C.textSecondary} />
            ) : (
              <Text weight="bold" size="sm" style={{ color: active ? '#FFFFFF' : C.textSecondary }}>{n}</Text>
            )}
          </Pressable>
        );
      })}
    </Box>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: CheckInQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const { colors: C } = useAppColorMode();
  const unsupported = UNSUPPORTED_QUESTION_TYPES.includes(question.type);

  return (
    <Card variant="elevated" style={{ marginBottom: 12 }}>
      <Text weight="bold" size="sm" style={{ marginBottom: 10 }}>
        {question.question_text}
        {question.is_required && <Text style={{ color: C.destructive }}> *</Text>}
      </Text>

      {unsupported ? (
        <Box className="flex-row items-start rounded-sm" style={{ gap: 8, backgroundColor: C.warning5, padding: 10 }}>
          <Icon name="information-circle-outline" size={16} color={C.warning60} />
          <Text size="xs" style={{ flex: 1, color: C.warning60, lineHeight: 17 }}>
            Este tipo de pregunta (foto/firma) aún no se puede responder desde la app. Pídele a tu coach que te ayude a completarlo por otro medio.
          </Text>
        </Box>
      ) : question.type === 'text' ? (
        <Input>
          <InputField
            placeholder={question.placeholder || 'Tu respuesta'}
            value={(value as string) || ''}
            onChangeText={(t) => onChange(t)}
          />
        </Input>
      ) : question.type === 'textarea' ? (
        <Textarea className="h-auto" style={{ minHeight: 90 }}>
          <TextareaInput
            placeholder={question.placeholder || 'Tu respuesta'}
            value={(value as string) || ''}
            onChangeText={(t) => onChange(t)}
            numberOfLines={4}
            style={{ paddingTop: 12 }}
          />
        </Textarea>
      ) : question.type === 'number' || question.type === 'metric' ? (
        <>
          <Input>
            <InputField
              placeholder={question.placeholder || '0'}
              value={(value as string) || ''}
              onChangeText={(t) => onChange(t.replace(/[^0-9.\-]/g, ''))}
              keyboardType="decimal-pad"
            />
          </Input>
          {question.type === 'metric' && question.metric && (
            <Text size="xs" muted style={{ marginTop: 6 }}>
              Se sincroniza con {question.metric.label}{question.metric.unit ? ` (${question.metric.unit})` : ''}
            </Text>
          )}
        </>
      ) : question.type === 'date' ? (
        <Input>
          <InputField
            placeholder="AAAA-MM-DD"
            value={(value as string) || ''}
            onChangeText={(t) => onChange(t)}
          />
        </Input>
      ) : question.type === 'scale' ? (
        <ChoiceRow count={question.scale_max || 10} value={value ? Number(value) : null} onChange={(n) => onChange(String(n))} />
      ) : question.type === 'star_rating' ? (
        <ChoiceRow count={question.star_max || 5} value={value ? Number(value) : null} onChange={(n) => onChange(String(n))} icon />
      ) : question.type === 'yes_no' ? (
        <Box className="flex-row" style={{ gap: 10 }}>
          {(['yes', 'no'] as const).map((opt) => {
            const active = value === opt;
            return (
              <Pressable
                key={opt}
                className="flex-1 items-center rounded-sm"
                style={{ paddingVertical: 12, backgroundColor: active ? C.accentBlack : C.bg }}
                onPress={() => onChange(opt)}
              >
                <Text weight="bold" style={{ color: active ? '#FFFFFF' : C.textSecondary }}>{opt === 'yes' ? 'Sí' : 'No'}</Text>
              </Pressable>
            );
          })}
        </Box>
      ) : question.type === 'multiple_choice' ? (
        <Box className="flex-row flex-wrap gap-2">
          {(() => {
            const selectedSet = question.allow_multiple && Array.isArray(value) ? new Set(value) : null;
            return (question.options || []).map((opt) => {
              const selected = question.allow_multiple
                ? !!selectedSet?.has(opt)
                : value === opt;
              return (
                <Pressable
                  key={opt}
                  className="rounded-pill"
                  style={{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: selected ? C.accentBlack : C.bg }}
                  onPress={() => {
                    if (question.allow_multiple) {
                      const current = Array.isArray(value) ? value : [];
                      onChange(current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt]);
                    } else {
                      onChange(opt);
                    }
                  }}
                >
                  <Text weight="semibold" size="xs" style={{ color: selected ? '#FFFFFF' : C.textSecondary }}>{opt}</Text>
                </Pressable>
              );
            });
          })()}
        </Box>
      ) : null}
    </Card>
  );
}

function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return v.trim().length > 0;
}

interface Props {
  navigation?: any;
  route?: any;
}

export default function CheckInFillScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const { navigation, route } = props;
  const insets = useSafeAreaInsets();
  const formAssignmentId: number | undefined = route?.params?.formAssignmentId;
  const formId: number | undefined = route?.params?.formId;
  const fallbackTitle: string | undefined = route?.params?.title;

  const [form, setForm] = useState<CheckInForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const { reportAction } = useTutorial();

  const load = useCallback(async () => {
    if (!formId) { setError(true); setIsLoading(false); return; }
    setIsLoading(true);
    setError(false);
    try {
      const res = await checkinsApi.getFormDetail(formId);
      setForm(res.data?.data ?? null);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  const questions = useMemo(() => form?.questions ?? [], [form]);

  const blockingQuestions = useMemo(
    () => questions.filter((q) => q.is_required && UNSUPPORTED_QUESTION_TYPES.includes(q.type)),
    [questions]
  );
  const missingRequired = useMemo(
    () => questions.filter((q) => q.is_required && !UNSUPPORTED_QUESTION_TYPES.includes(q.type) && !isAnswered(answers[q.id])),
    [questions, answers]
  );
  const canSubmit = blockingQuestions.length === 0 && missingRequired.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit || !formAssignmentId) return;
    setSubmitting(true);
    try {
      const payload: CheckInAnswerInput[] = questions.reduce<CheckInAnswerInput[]>((acc, q) => {
        if (!UNSUPPORTED_QUESTION_TYPES.includes(q.type) && isAnswered(answers[q.id])) {
          acc.push({ form_question_id: q.id, answer_value: answers[q.id] as string | string[] });
        }
        return acc;
      }, []);

      await checkinsApi.submit(formAssignmentId, payload);
      reportAction('checkin_submitted');
      Alert.alert('Enviado', 'Tu respuesta se ha guardado correctamente.', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el formulario. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['bottom']}>
      <ScreenHeader title={form?.title || fallbackTitle || 'Formulario'} onBack={() => navigation?.goBack()} />

      {isLoading ? (
        <Box className="flex-1 items-center justify-center px-8" style={{ paddingTop: 60 }}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      ) : error || !form ? (
        <Box className="flex-1 items-center justify-center px-8" style={{ paddingTop: 60 }}>
          <Text muted className="text-center">No se pudo cargar el formulario.</Text>
        </Box>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {form.description && (
              <Text muted style={{ fontSize: 13.5, lineHeight: 19, marginBottom: 16 }}>{form.description}</Text>
            )}

            {questions.length === 0 ? (
              <Box className="items-center justify-center px-8" style={{ paddingTop: 60 }}>
                <Text muted className="text-center">Este formulario todavía no tiene preguntas.</Text>
              </Box>
            ) : (
              questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
              ))
            )}
          </ScrollView>

          <Box
            className="border-t border-border"
            style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 6 }}
          >
            {blockingQuestions.length > 0 && (
              <Text weight="medium" size="xs" className="text-center" style={{ color: C.warning60, marginBottom: 8 }}>
                Hay preguntas obligatorias que requieren completarse por otro medio.
              </Text>
            )}
            <Button size="lg" radius="pill" onPress={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? <Spinner size="small" color="#FFFFFF" /> : <ButtonText>ENVIAR</ButtonText>}
            </Button>
          </Box>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
