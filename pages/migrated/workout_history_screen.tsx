import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Box } from '@components/ui/box';
import { VStack } from '@components/ui/vstack';
import { HStack } from '@components/ui/hstack';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { workoutHistoryApi, CompletedSessionItem } from '../../api/workoutHistory';
import { pickWorkoutFallbackImage } from './workoutViewShared';
import logger from '@helper/logger';
import { useAppColorMode } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';

function formatDuration(totalSeconds: number | null): string {
  if (!totalSeconds) return '--';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m} min`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WorkoutHistoryScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [sessions, setSessions] = useState<CompletedSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await workoutHistoryApi.getMyCompletedSessions();
      setSessions(res.data?.data ?? []);
    } catch (e) {
      logger.error('WorkoutHistory load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const openDetail = (item: CompletedSessionItem) => {
    props.navigation?.navigate('MigratedSessionHistoryDetail', {
      programDayAssignmentId: item.program_day_assignment_id,
      workoutTemplateId: item.workout_template_id,
      date: item.date.slice(0, 10),
      title: item.title,
    });
  };

  const renderItem = (item: CompletedSessionItem) => (
    <Pressable key={item.id} className="bg-card rounded-lg p-3.5" onPress={() => openDetail(item)}>
      <HStack space="md" className="items-center">
        <Box className="w-12 h-12 rounded-md bg-muted items-center justify-center overflow-hidden">
          <ExpoImage
            source={item.thumbnail ? { uri: item.thumbnail } : pickWorkoutFallbackImage(item.id)}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        </Box>
        <VStack space="xs" className="flex-1">
          <Text weight="bold" size="sm" numberOfLines={1}>{item.title}</Text>
          <Text size="xs" muted>{formatDate(item.date)}</Text>
          <HStack>
            <Text size="xs" weight="medium" className="text-muted-foreground">{formatDuration(item.duration_seconds)}</Text>
            {item.volume_kg != null && <Text size="xs" weight="medium" className="text-muted-foreground"> · {Math.round(item.volume_kg).toLocaleString('es-ES')} kg</Text>}
            {item.difficulty_label && <Text size="xs" weight="medium" className="text-muted-foreground"> · {item.difficulty_label}</Text>}
          </HStack>
        </VStack>
        <Icon name="chevron-forward" size={20} className="text-muted-foreground" />
      </HStack>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => props.navigation?.goBack()}>
          <Icon name="chevron-back" size={24} className="text-foreground" />
        </Button>
        <Heading size="sm">Historial de entrenamientos</Heading>
        <Box className="w-8" />
      </HStack>

      {isLoading ? (
        <Box className="flex-1 items-center justify-center px-8 gap-3">
          <Spinner size="large" color="#6B6B70" />
        </Box>
      ) : sessions.length === 0 ? (
        <Box className="flex-1 items-center justify-center px-8 gap-3">
          <Icon name="barbell-outline" size={40} className="text-muted-foreground" />
          <Text size="sm" muted className="text-center">Todavía no has completado ningún entrenamiento</Text>
        </Box>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
          <VStack space="sm">
            {sessions.map(renderItem)}
          </VStack>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
