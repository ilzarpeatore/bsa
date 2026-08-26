import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Box } from '@components/ui/box';
import { VStack } from '@components/ui/vstack';
import { HStack } from '@components/ui/hstack';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Icon } from '@components/ui/icon';
import { Badge, BadgeText } from '@components/ui/badge';
import { Spinner } from '@components/ui/spinner';
import { workoutHistoryApi, SessionDetail } from '../../api/workoutHistory';
import logger from '@helper/logger';
import { useAppColorMode } from '@helper/useAppColorMode';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SessionHistoryDetailScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const { programDayAssignmentId, workoutTemplateId, date, title } = props.route?.params ?? {};
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await workoutHistoryApi.getMySessionDetail({
        program_day_assignment_id: programDayAssignmentId ?? undefined,
        workout_template_id: workoutTemplateId ?? undefined,
        date: workoutTemplateId ? date : undefined,
      });
      setDetail(res.data?.data ?? null);
    } catch (e) {
      logger.error('SessionHistoryDetail load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [programDayAssignmentId, workoutTemplateId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => props.navigation?.goBack()}>
          <Icon name="chevron-back" size={24} className="text-foreground" />
        </Button>
        <Heading size="sm" className="flex-1 text-center" numberOfLines={1}>
          {title ?? detail?.title ?? 'Entrenamiento'}
        </Heading>
        <Box className="w-8" />
      </HStack>

      {isLoading ? (
        <Box className="flex-1 items-center justify-center px-8 gap-3">
          <Spinner size="large" color="#6B6B70" />
        </Box>
      ) : !detail ? (
        <Box className="flex-1 items-center justify-center px-8 gap-3">
          <Icon name="alert-circle-outline" size={36} className="text-muted-foreground" />
          <Text size="sm" muted className="text-center">No se pudo cargar este entrenamiento</Text>
        </Box>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VStack space="md">
          <Text size="xs" weight="medium" muted>{formatDate(detail.date)}</Text>

          <HStack space="sm">
            <Card variant="elevated" className="flex-1 items-center py-3">
              <Text weight="bold" size="lg">{detail.total_sets}</Text>
              <Text size="xs" muted>series</Text>
            </Card>
            <Card variant="elevated" className="flex-1 items-center py-3">
              <Text weight="bold" size="lg">{Math.round(detail.total_volume).toLocaleString('es-ES')}</Text>
              <Text size="xs" muted>kg volumen</Text>
            </Card>
            <Card variant="elevated" className="flex-1 items-center py-3">
              <Text weight="bold" size="lg">{detail.total_reps}</Text>
              <Text size="xs" muted>reps</Text>
            </Card>
            {detail.total_prs > 0 && (
              <Card variant="elevated" className="flex-1 items-center py-3">
                <Text weight="bold" size="lg" className="text-warning">{detail.total_prs}</Text>
                <Text size="xs" muted>PRs</Text>
              </Card>
            )}
          </HStack>

          {(detail.difficulty_label || detail.comment) && (
            <Card variant="elevated">
              {detail.difficulty_label && (
                <HStack space="xs" className="items-center">
                  <Icon name="happy-outline" size={16} className="text-muted-foreground" />
                  <Text weight="medium" size="sm">Sensación: {detail.difficulty_label}</Text>
                </HStack>
              )}
              {detail.comment && (
                <Text size="xs" muted className="italic" style={{ marginTop: 6 }}>"{detail.comment}"</Text>
              )}
            </Card>
          )}

          {detail.blocks.map((block) => (
            <VStack key={block.block_id} space="sm">
              <Text
                weight="bold"
                size="sm"
                muted
                className="uppercase"
                style={{ letterSpacing: 0.5 }}
              >
                {block.title}
              </Text>
              {block.exercises.map((ex) => (
                <Card key={ex.workout_template_exercise_id} variant="elevated">
                  <HStack space="sm" className="items-center">
                    {ex.exercise_image ? (
                      <ExpoImage source={{ uri: ex.exercise_image }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
                    ) : (
                      <Box className="w-10 h-10 rounded-sm bg-muted items-center justify-center">
                        <Icon name="barbell-outline" size={18} className="text-muted-foreground" />
                      </Box>
                    )}
                    <VStack space="xs" className="flex-1">
                      <Text weight="bold" size="sm" numberOfLines={1}>{ex.title ?? 'Ejercicio'}</Text>
                      {!ex.logged && <Text size="xs" muted>Sin series registradas</Text>}
                      {ex.prs_this_session ? (
                        <Badge action="warning" className="self-start">
                          <Icon name="trophy" size={11} className="text-warning-foreground" />
                          <BadgeText>PR</BadgeText>
                        </Badge>
                      ) : null}
                    </VStack>
                  </HStack>

                  {ex.logged && ex.sets.length > 0 && (
                    <Box style={{ marginTop: 10 }}>
                      <HStack
                        className="border-b border-border"
                        style={{ paddingBottom: 6, marginBottom: 4 }}
                      >
                        <Text size="xs" weight="semibold" className="text-muted-foreground uppercase" style={{ flex: 0.6 }}>Serie</Text>
                        <Text size="xs" weight="semibold" className="text-muted-foreground uppercase" style={{ flex: 1 }}>Peso</Text>
                        <Text size="xs" weight="semibold" className="text-muted-foreground uppercase" style={{ flex: 1 }}>Reps</Text>
                        <Text size="xs" weight="semibold" className="text-muted-foreground uppercase" style={{ flex: 1 }}>RIR/RPE</Text>
                      </HStack>
                      {ex.sets.map((set) => (
                        <HStack key={set.set} className="py-1">
                          <Text size="sm" weight="medium" style={{ flex: 0.6 }}>{set.set}</Text>
                          <Text size="sm" weight="medium" style={{ flex: 1 }}>{set.weight} kg</Text>
                          <Text size="sm" weight="medium" style={{ flex: 1 }}>{set.reps}</Text>
                          <Text size="sm" weight="medium" style={{ flex: 1 }}>{set.rpe_rir ?? '--'}</Text>
                        </HStack>
                      ))}
                    </Box>
                  )}
                </Card>
              ))}
            </VStack>
          ))}
        </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
