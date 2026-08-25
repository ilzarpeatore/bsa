import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
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
import SimpleBottomSheet from '../../components/SimpleBottomSheet';
import { muscleVolumeApi, MuscleVolumeSeriesGroup } from '../../api/muscleVolume';
import { toLocalISODate } from '../../components/dayRange';
import { MACRO_MUSCLE_GROUPS, MacroMuscleGroup, macroGroupFor } from '../../constants/bodyMusclesMap';

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
  { key: '7', label: 'Últimos 7 días', days: 7 },
  { key: '30', label: 'Últimos 30 días', days: 30 },
  { key: '90', label: 'Últimos 90 días', days: 90 },
  { key: 'meso', label: 'Este mesociclo', days: 42 },
];

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function macroSeriesTotals(data: MuscleVolumeSeriesGroup[]): Record<MacroMuscleGroup, number> {
  const out: Record<string, number> = {};
  MACRO_MUSCLE_GROUPS.forEach((g) => (out[g] = 0));
  data.forEach((m) => {
    const macro = macroGroupFor(m.group);
    if (macro) out[macro] += m.series;
  });
  return out as Record<MacroMuscleGroup, number>;
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const { colors: C } = useAppColorMode();
  const delta = current - previous;
  if (delta === 0) {
    return (
      <Text weight="semibold" size="xs" muted style={{ fontSize: 11.5 }}>=</Text>
    );
  }
  const positive = delta > 0;
  return (
    <Text weight="semibold" size="xs" style={{ fontSize: 11.5, color: positive ? C.success60 : C.destructive60 }}>
      {positive ? '↑' : '↓'} {Math.abs(delta)}
    </Text>
  );
}

function MacroBar({ group, current, previous, maxValue }: { group: string; current: number; previous: number; maxValue: number }) {
  const { colors: C } = useAppColorMode();
  const pct = maxValue > 0 ? Math.max(current > 0 ? 4 : 0, (current / maxValue) * 100) : 0;
  return (
    <HStack className="items-center" style={{ marginBottom: 16 }}>
      <Text weight="medium" size="xs" numberOfLines={1} style={{ width: 76, fontSize: 12.5 }}>
        {group}
      </Text>
      <Box className="flex-1 bg-border overflow-hidden" style={{ height: 10, borderRadius: 5, marginHorizontal: 10 }}>
        <Box style={{ height: 10, width: `${pct}%`, borderRadius: 5, backgroundColor: C.orange }} />
      </Box>
      <Text weight="semibold" size="xs" className="text-right" style={{ width: 24, fontSize: 12.5 }}>{current}</Text>
      <Box className="items-end" style={{ width: 46 }}>
        <DeltaBadge current={current} previous={previous} />
      </Box>
    </HStack>
  );
}

export default function StatisticsSeriesCountScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [range, setRange] = useState(RANGE_OPTIONS[1]);
  const [currentTotals, setCurrentTotals] = useState<Record<MacroMuscleGroup, number>>({} as any);
  const [previousTotals, setPreviousTotals] = useState<Record<MacroMuscleGroup, number>>({} as any);
  const [totalSeries, setTotalSeries] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [rangeSheetVisible, setRangeSheetVisible] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    const today = new Date();
    const currentEndISO = toLocalISODate(today);
    const previousEndISO = toLocalISODate(subDays(today, range.days));

    Promise.all([
      muscleVolumeApi.getMy(range.days, currentEndISO),
      muscleVolumeApi.getMy(range.days, previousEndISO),
    ])
      .then(([curRes, prevRes]) => {
        if (!active) return;
        const curData = curRes.data?.data || curRes.data;
        const prevData = prevRes.data?.data || prevRes.data;
        setCurrentTotals(macroSeriesTotals(curData?.seriesByMuscle || []));
        setPreviousTotals(macroSeriesTotals(prevData?.seriesByMuscle || []));
        setTotalSeries(curData?.totalSeries || 0);
      })
      .catch(() => {
        if (!active) return;
        setCurrentTotals({} as any);
        setPreviousTotals({} as any);
        setTotalSeries(0);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const sortedGroups = useMemo(() => {
    return [...MACRO_MUSCLE_GROUPS].sort((a, b) => (currentTotals[b] ?? 0) - (currentTotals[a] ?? 0));
  }, [currentTotals]);
  const maxValue = Math.max(1, ...MACRO_MUSCLE_GROUPS.map((g) => currentTotals[g] ?? 0));

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
        <Heading size="sm" className="flex-1 text-center mx-1" numberOfLines={1}>
          Recuento de series
        </Heading>
        <Box style={{ width: 36, height: 36 }} />
      </HStack>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Pressable
          className="flex-row items-center self-start bg-card rounded-pill shadow-card gap-2"
          style={{ paddingHorizontal: 18, paddingVertical: 10, marginTop: 12 }}
          onPress={() => setRangeSheetVisible(true)}
        >
          <Text weight="semibold" size="sm">{range.label}</Text>
          <Icon name="chevron-down" size={16} className="text-foreground" />
        </Pressable>

        <Box className="bg-card rounded-lg items-center shadow-card" style={{ marginTop: 16, padding: 22 }}>
          {/* lineHeight explícito: Gilroy-Black recorta el glifo a este tamaño si se
              deja el lineHeight por defecto (el className size="md" aporta 24, muy por
              debajo de fontSize 34). */}
          <Text weight="black" style={{ fontSize: 34, lineHeight: 41 }}>{totalSeries}</Text>
          <Text size="xs" muted style={{ marginTop: 4 }}>series totales registradas</Text>
        </Box>

        <Box className="bg-card rounded-lg shadow-card" style={{ marginTop: 16, padding: 20 }}>
          <HStack className="justify-between" style={{ marginBottom: 14 }}>
            <Text weight="semibold" size="xs" muted style={{ fontSize: 11, letterSpacing: 0.4 }}>ZONA</Text>
            <Text weight="semibold" size="xs" muted style={{ fontSize: 11, letterSpacing: 0.4 }}>VS. PERIODO ANTERIOR</Text>
          </HStack>
          {isLoading ? (
            <Spinner size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
          ) : (
            sortedGroups.map((group) => (
              <MacroBar
                key={group}
                group={group}
                current={currentTotals[group] ?? 0}
                previous={previousTotals[group] ?? 0}
                maxValue={maxValue}
              />
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
    </SafeAreaView>
  );
}
