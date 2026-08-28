import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { HStack } from '@components/ui/hstack';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { useAppColorMode } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import SimpleBottomSheet from '../../components/SimpleBottomSheet';
import MuscleFilterSheet from '../../components/MuscleFilterSheet';
import { exerciseStatsApi, TopExerciseItem } from '../../api/exerciseStats';
import { toLocalISODate } from '../../components/dayRange';

interface Props {
  navigation?: any;
  route?: any;
}

interface RangeOption {
  key: string;
  label: string;
  days: number;
}

const RANGE_OPTIONS: RangeOption[] = [
  { key: '30', label: 'Últimos 30 días', days: 30 },
  { key: '90', label: 'Últimos 90 días', days: 90 },
  { key: '180', label: 'Últimos 6 meses', days: 180 },
  { key: 'all', label: 'Todo el historial', days: 0 },
];

function TopExerciseRow({ item, rank, onPress }: { item: TopExerciseItem; rank: number; onPress: () => void }) {
  const { colors: C } = useAppColorMode();
  return (
    <Pressable className="flex-row items-center" style={{ padding: 12, gap: 12 }} onPress={onPress}>
      <Text weight="bold" size="sm" muted style={{ width: 20, textAlign: 'center' }}>{rank}</Text>
      {item.image ? (
        <Image source={{ uri: item.image }} contentFit="cover" style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.gray5 }} />
      ) : (
        <Box className="items-center justify-center bg-muted" style={{ width: 48, height: 48, borderRadius: 10 }}>
          <Icon name="barbell-outline" size={18} className="text-muted-foreground" />
        </Box>
      )}
      <Box className="flex-1">
        <Text weight="semibold" size="sm" numberOfLines={2} style={{ fontSize: 14.5 }}>
          {item.title}
        </Text>
        <Text size="xs" muted style={{ marginTop: 3 }}>
          {item.sessions} {item.sessions === 1 ? 'sesión' : 'sesiones'} · {item.sets} series
        </Text>
      </Box>
      <Icon name="chevron-forward" size={18} className="text-muted-foreground" />
    </Pressable>
  );
}

export default function StatisticsTopExercisesScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [range, setRange] = useState(RANGE_OPTIONS[0]);
  const [items, setItems] = useState<TopExerciseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rangeSheetVisible, setRangeSheetVisible] = useState(false);
  const [muscleId, setMuscleId] = useState<number | null>(null);
  const [muscleName, setMuscleName] = useState<string>('');
  const [muscleSheetVisible, setMuscleSheetVisible] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    exerciseStatsApi
      .getMyTopExercises(range.days, toLocalISODate(new Date()), 30, muscleId ?? undefined)
      .then((res) => {
        if (!active) return;
        setItems(res.data?.data || []);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, muscleId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
        <Heading size="sm" className="flex-1 text-center mx-1" numberOfLines={1}>
          Ejercicios más frecuentes
        </Heading>
        <Button variant="ghost" size="icon" onPress={() => setMuscleSheetVisible(true)}>
          <Icon name="body-outline" size={22} color={muscleId ? C.orange : C.textPrimary} />
        </Button>
      </HStack>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <HStack className="items-center flex-wrap gap-2" style={{ marginTop: 12 }}>
          <Pressable
            className="flex-row items-center self-start bg-card rounded-pill shadow-card gap-2"
            style={{ paddingHorizontal: 18, paddingVertical: 10 }}
            onPress={() => setRangeSheetVisible(true)}
          >
            <Text weight="semibold" size="sm">{range.label}</Text>
            <Icon name="chevron-down" size={16} className="text-foreground" />
          </Pressable>
          {muscleId ? (
            <Pressable
              className="flex-row items-center rounded-pill gap-1.5"
              style={{ backgroundColor: C.orange, paddingHorizontal: 14, paddingVertical: 10 }}
              onPress={() => { setMuscleId(null); setMuscleName(''); }}
            >
              <Text weight="semibold" size="sm" style={{ color: C.white }}>{muscleName}</Text>
              <Icon name="close" size={14} color={C.white} />
            </Pressable>
          ) : null}
        </HStack>

        <Box className="bg-card rounded-lg shadow-card" style={{ marginTop: 16, padding: 8 }}>
          {isLoading ? (
            <Spinner size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
          ) : items.length === 0 ? (
            <Text size="xs" muted className="text-center" style={{ paddingVertical: 52 }}>
              Todavía no hay ejercicios registrados en este periodo.
            </Text>
          ) : (
            items.map((item, idx) => (
              <Box key={item.exercise_id}>
                <TopExerciseRow
                  item={item}
                  rank={idx + 1}
                  onPress={() =>
                    navigation?.navigate('MigratedExerciseInfo', {
                      mExerciseId: item.exercise_id,
                      mExerciseName: item.title,
                      initialTab: 'analysis',
                    })
                  }
                />
                {idx < items.length - 1 && <Box className="border-b border-border" style={{ marginLeft: 76 }} />}
              </Box>
            ))
          )}
        </Box>
      </ScrollView>

      <SimpleBottomSheet visible={rangeSheetVisible} onClose={() => setRangeSheetVisible(false)}>
        <Box style={{ padding: 24 }}>
          {RANGE_OPTIONS.map((opt) => {
            const active = opt.key === range.key;
            return (
              <Pressable
                key={opt.key}
                className="flex-row items-center justify-between"
                style={{ paddingVertical: 14 }}
                onPress={() => {
                  setRange(opt);
                  setRangeSheetVisible(false);
                }}
              >
                <Text size="sm" weight={active ? 'bold' : 'medium'}>{opt.label}</Text>
                {active ? <Icon name="checkmark" size={18} className="text-foreground" /> : null}
              </Pressable>
            );
          })}
        </Box>
      </SimpleBottomSheet>

      <MuscleFilterSheet
        visible={muscleSheetVisible}
        onClose={() => setMuscleSheetVisible(false)}
        selectedId={muscleId}
        onSelect={(id, name) => {
          if (id === 0) {
            setMuscleId(null);
            setMuscleName('');
          } else {
            setMuscleId(id);
            setMuscleName(name);
          }
          setMuscleSheetVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
