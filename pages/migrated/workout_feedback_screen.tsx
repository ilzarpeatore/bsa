import React, { useState } from 'react';
import { ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Pressable } from '@components/ui/pressable';
import { Textarea, TextareaInput } from '@components/ui/textarea';
import { useAppColorMode } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { workoutHistoryApi } from '../../api/workoutHistory';

interface Props {
  navigation?: any;
  route?: any;
}

const DIFFICULTY_OPTIONS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😩', label: 'Muy duro' },
  { value: 2, emoji: '😕', label: 'Duro' },
  { value: 3, emoji: '🙂', label: 'Normal' },
  { value: 4, emoji: '💪', label: 'Fácil' },
  { value: 5, emoji: '🔥', label: 'Genial' },
];

export default function WorkoutFeedbackScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const { navigation, route } = props;
  const {
    programDayAssignmentId,
    workoutTemplateId,
    mTitle,
    durationSeconds = 0,
    volumeKg = 0,
    caloriesBurned = 0,
    exerciseCount = 0,
    completedSets = 0,
    exerciseIds = [],
    muscleVolumeSets = [],
    exercisesSummary = [],
  } = route?.params ?? {};

  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const goToSummary = (caloriesFinal?: number | null, achievements?: any) => {
    navigation?.replace('MigratedWorkoutSummary', {
      mTitle,
      durationSeconds,
      volumeKg,
      caloriesBurned: caloriesFinal ?? caloriesBurned,
      exerciseCount,
      completedSets,
      difficultyRating: difficulty,
      achievements,
      muscleVolumeSets,
      exercisesSummary,
    });
  };

  const onContinue = async () => {
    setIsSaving(true);
    try {
      const res = await workoutHistoryApi.finishCalendarSession({
        program_day_assignment_id: programDayAssignmentId,
        workout_template_id: workoutTemplateId,
        duration_seconds: durationSeconds,
        volume_kg: volumeKg,
        difficulty_rating: difficulty ?? undefined,
        comment: comment.trim() || undefined,
        exercise_ids: exerciseIds,
      });
      goToSummary(res.data?.data?.calories_burned, res.data?.achievements);
    } catch (e) {
      // No bloqueamos el resumen local por un fallo de red — el dato ya
      // se fue guardando serie a serie durante la sesión.
      goToSummary();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Heading size="lg" className="text-center">¡Entrenamiento completado!</Heading>
          <Text size="sm" muted className="text-center" style={{ marginTop: 6, marginBottom: 36 }}>
            {mTitle || 'Entrenamiento'}
          </Text>

          <Text weight="bold" size="sm" style={{ marginBottom: 16 }}>¿Cómo te ha resultado hoy?</Text>
          <Box className="flex-row justify-between" style={{ marginBottom: 36 }}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = difficulty === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  className="items-center flex-1"
                  onPress={() => setDifficulty(opt.value)}
                >
                  <Box
                    className="items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: active ? '#1C1C1E' : C.surfaceLight,
                    }}
                  >
                    <Text size="lg" style={{ fontSize: 24, lineHeight: 30 }}>{opt.emoji}</Text>
                  </Box>
                  <Text
                    size="xs"
                    weight={active ? 'bold' : 'medium'}
                    className="text-center"
                    style={{ fontSize: 10, marginTop: 6, color: active ? C.textPrimary : C.textSecondary }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </Box>

          <Text weight="bold" size="sm" style={{ marginBottom: 16 }}>¿Algo que quieras contarnos?</Text>
          <Textarea className="h-auto" style={{ minHeight: 100, borderRadius: 14 }}>
            <TextareaInput
              placeholder="Cómo te has sentido, alguna molestia, qué te gustaría cambiar..."
              value={comment}
              onChangeText={setComment}
              numberOfLines={4}
              style={{ paddingTop: 14 }}
            />
          </Textarea>
        </ScrollView>

        <Box
          className="border-t border-border"
          style={{
            paddingHorizontal: 24,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 16 : 20,
            backgroundColor: C.bg,
          }}
        >
          <Pressable
            className="items-center rounded-pill"
            style={{ backgroundColor: C.brand50, paddingVertical: 16 }}
            onPress={onContinue}
            disabled={isSaving}
          >
            <Text weight="bold" size="sm" style={{ letterSpacing: 0.5 }}>
              {isSaving ? 'Guardando...' : 'CONTINUAR'}
            </Text>
          </Pressable>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
