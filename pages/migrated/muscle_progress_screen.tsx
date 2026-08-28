import React, { useEffect, useMemo, useState } from 'react';
import {  ScrollView, ActivityIndicator  } from 'react-native';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Heading  } from '@components/ui/heading';
import {  Button  } from '@components/ui/button';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import MuscleBodyMap, { MuscleVolumeGroup } from '../../components/MuscleBodyMap';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import {  muscleVolumeApi, MuscleVolumeData  } from '../../api/muscleVolume';
import {  RADIUS  } from './theme';

interface Props {
  navigation?: any;
  route?: any;
}

type RangeKey = 'week' | 'month';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: 'week', label: 'Semanal', days: 7 },
  { key: 'month', label: 'Mensual', days: 30 },
];

const EMPTY: MuscleVolumeData = { volumeByMuscle: [], seriesByMuscle: [], volumeByDate: [], volumeByDateAndMuscle: [], totalVolume: 0, sessionsCount: 0, totalSeries: 0 };

function MuscleVolumeBar({ item, maxVolume }: { item: MuscleVolumeGroup; maxVolume: number }) {
  const pct = maxVolume > 0 ? Math.max(4, (item.volume / maxVolume) * 100) : 0;
  return (
    <Box className="flex-row items-center" style={{ marginBottom: 12 }}>
      <Text weight="medium" size="xs" numberOfLines={1} style={{ width: 90 }}>
        {item.group}
      </Text>
      <Box className="flex-1 bg-border overflow-hidden" style={{ height: 10, marginHorizontal: 8, borderRadius: 5 }}>
        <Box className="bg-primary" style={{ height: 10, width: `${pct}%`, borderRadius: 5 }} />
      </Box>
      <Text weight="medium" size="xs" className="text-muted-foreground text-right" style={{ width: 60 }}>
        {Math.round(item.volume)} kg
      </Text>
    </Box>
  );
}

export default function MuscleProgressScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [range, setRange] = useState<RangeKey>('week');
  const [data, setData] = useState<MuscleVolumeData>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? RANGES[0].days;
    let active = true;
    setIsLoading(true);
    muscleVolumeApi
      .getMy(days)
      .then((res) => {
        if (!active) return;
        setData(res.data?.data || res.data || EMPTY);
      })
      .catch(() => {
        if (active) setData(EMPTY);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const sortedMuscles = useMemo(
    () => [...data.volumeByMuscle].filter((m) => m.volume > 0).sort((a, b) => b.volume - a.volume),
    [data.volumeByMuscle]
  );
  const maxVolume = sortedMuscles[0]?.volume ?? 0;
  const isEmpty = !isLoading && sortedMuscles.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Box className="flex-row items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={24} className="text-foreground" />
        </Button>
        <Heading size="sm">Progreso muscular</Heading>
        <Box style={{ width: 32 }} />
      </Box>

      <Box
        className="flex-row self-center bg-card shadow-card"
        style={{ borderRadius: RADIUS.sm, padding: 4, gap: 4, marginBottom: 12 }}
      >
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.xs }}
            className={range === r.key ? 'bg-primary' : ''}
            onPress={() => setRange(r.key)}
          >
            <Text
              weight="semibold"
              size="sm"
              className={range === r.key ? 'text-primary-foreground' : 'text-muted-foreground'}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </Box>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 + WORKOUT_MINIBAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <Box className="bg-card rounded-md items-center justify-center shadow-card" style={{ paddingVertical: 16, minHeight: 200 }}>
          {isLoading ? (
            <ActivityIndicator size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
          ) : isEmpty ? (
            <Text size="xs" muted className="text-center" style={{ paddingVertical: 60, paddingHorizontal: 24 }}>
              Todavía no hay entrenamientos registrados en este periodo.
            </Text>
          ) : (
            <MuscleBodyMap data={sortedMuscles} height={320} />
          )}
        </Box>

        {!isLoading && sortedMuscles.length > 0 && (
          <Box className="bg-card rounded-md shadow-card" style={{ padding: 18, marginTop: 16 }}>
            <Text weight="bold" size="xs" muted className="uppercase" style={{ letterSpacing: 0.5, marginBottom: 14 }}>
              Distribución del volumen
            </Text>
            {sortedMuscles.map((m) => (
              <MuscleVolumeBar key={m.group} item={m} maxVolume={maxVolume} />
            ))}
          </Box>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
