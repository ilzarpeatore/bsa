import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { showToast } from '@helper/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { HStack } from '@components/ui/hstack';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { useAppColorMode } from '@helper/useAppColorMode';
import RadarChart from '../../components/RadarChart';
import SimpleBottomSheet from '../../components/SimpleBottomSheet';
import { MACRO_MUSCLE_GROUPS, MacroMuscleGroup, macroGroupFor } from '../../constants/bodyMusclesMap';
import { muscleVolumeApi, MuscleVolumeGroup } from '../../api/muscleVolume';
import { statisticsApi, PeriodStats } from '../../api/statistics';
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
  { key: '7', label: 'Últimos 7 días', days: 7 },
  { key: '30', label: 'Últimos 30 días', days: 30 },
  { key: '90', label: 'Últimos 90 días', days: 90 },
  { key: 'meso', label: 'Este mesociclo', days: 42 },
];

const ZERO_PERIOD: PeriodStats = { sessionsCount: 0, durationSeconds: 0, avgDurationSeconds: 0, volumeKg: 0 };

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}
function formatDuration(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}
function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}
function macroValues(data: MuscleVolumeGroup[]): Record<MacroMuscleGroup, number> {
  const out: Record<string, number> = {};
  MACRO_MUSCLE_GROUPS.forEach((g) => (out[g] = 0));
  data.forEach((m) => {
    const macro = macroGroupFor(m.group);
    if (macro) out[macro] += m.volume;
  });
  return out as Record<MacroMuscleGroup, number>;
}

function DeltaText({ current, previous, format }: { current: number; previous: number; format: (n: number) => string }) {
  const { colors: C } = useAppColorMode();
  const delta = current - previous;
  if (previous === 0 && current === 0) {
    return (
      <Text weight="semibold" size="xs" muted style={{ marginTop: 4 }}>
        —
      </Text>
    );
  }
  const positive = delta >= 0;
  return (
    <Text
      weight="semibold"
      size="xs"
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ marginTop: 4, color: positive ? C.success60 : C.destructive60 }}
    >
      {positive ? '↑' : '↓'} {format(Math.abs(delta))}
    </Text>
  );
}

export default function StatisticsMuscleDistributionScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [range, setRange] = useState(RANGE_OPTIONS[1]);
  const [currentVolume, setCurrentVolume] = useState<MuscleVolumeGroup[]>([]);
  const [previousVolume, setPreviousVolume] = useState<MuscleVolumeGroup[]>([]);
  const [currentSeries, setCurrentSeries] = useState(0);
  const [previousSeries, setPreviousSeries] = useState(0);
  const [currentStats, setCurrentStats] = useState<PeriodStats>(ZERO_PERIOD);
  const [previousStats, setPreviousStats] = useState<PeriodStats>(ZERO_PERIOD);
  const [isLoading, setIsLoading] = useState(false);
  const [rangeSheetVisible, setRangeSheetVisible] = useState(false);
  const [helpSheetVisible, setHelpSheetVisible] = useState(false);

  useEffect(() => {
    const today = new Date();
    const currentEndISO = toLocalISODate(today);
    const currentStartMinus1 = subDays(today, range.days);
    const previousEndISO = toLocalISODate(currentStartMinus1);

    let active = true;
    setIsLoading(true);
    Promise.all([
      muscleVolumeApi.getMy(range.days, currentEndISO),
      muscleVolumeApi.getMy(range.days, previousEndISO),
      statisticsApi.getMyPeriodStats(range.days, currentEndISO),
      statisticsApi.getMyPeriodStats(range.days, previousEndISO),
    ])
      .then(([curVol, prevVol, curStats, prevStats]) => {
        if (!active) return;
        const curData = curVol.data?.data || curVol.data;
        const prevData = prevVol.data?.data || prevVol.data;
        setCurrentVolume(curData?.volumeByMuscle || []);
        setPreviousVolume(prevData?.volumeByMuscle || []);
        setCurrentSeries(curData?.totalSeries || 0);
        setPreviousSeries(prevData?.totalSeries || 0);
        setCurrentStats(curStats.data?.data || ZERO_PERIOD);
        setPreviousStats(prevStats.data?.data || ZERO_PERIOD);
      })
      .catch(() => {
        if (!active) return;
        setCurrentVolume([]);
        setPreviousVolume([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const { currentAxis, previousAxis } = useMemo(() => {
    const cur = macroValues(currentVolume);
    const prev = macroValues(previousVolume);
    const max = Math.max(1, ...MACRO_MUSCLE_GROUPS.map((g) => Math.max(cur[g], prev[g])));
    return {
      currentAxis: MACRO_MUSCLE_GROUPS.map((g) => cur[g] / max),
      previousAxis: MACRO_MUSCLE_GROUPS.map((g) => prev[g] / max),
    };
  }, [currentVolume, previousVolume]);

  const openRangePicker = useCallback(() => setRangeSheetVisible(true), []);
  const openHelp = useCallback(() => setHelpSheetVisible(true), []);
  const shareRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const onShare = async () => {
    if (!shareRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 0.92 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showToast('No disponible', { description: 'Compartir no está disponible en este dispositivo.', variant: 'warning' });
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir distribución muscular' });
    } catch (e) {
      showToast('Error', { description: 'No se pudo generar la imagen para compartir.', variant: 'error' });
    } finally {
      setIsSharing(false);
    }
  };

  const kpis: { label: string; value: string; current: number; previous: number; format: (n: number) => string }[] = [
    { label: 'Entrenamientos', value: String(currentStats.sessionsCount), current: currentStats.sessionsCount, previous: previousStats.sessionsCount, format: (n) => String(Math.round(n)) },
    { label: 'Duración media', value: formatDuration(currentStats.avgDurationSeconds), current: currentStats.avgDurationSeconds, previous: previousStats.avgDurationSeconds, format: formatDuration },
    { label: 'Volumen', value: formatVolume(currentStats.volumeKg), current: currentStats.volumeKg, previous: previousStats.volumeKg, format: formatVolume },
    { label: 'Series', value: String(currentSeries), current: currentSeries, previous: previousSeries, format: (n) => String(Math.round(n)) },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
        <Heading size="sm" className="flex-1 text-center mx-1" numberOfLines={1}>
          Balance muscular
        </Heading>
        <HStack space="sm">
          <Pressable
            className="rounded-pill bg-card items-center justify-center shadow-card"
            style={{ width: 32, height: 32 }}
            onPress={openHelp}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Ayuda"
          >
            <Text weight="bold" size="xs" muted>?</Text>
          </Pressable>
          <Pressable
            className="rounded-pill bg-card items-center justify-center shadow-card"
            style={{ width: 32, height: 32 }}
            onPress={onShare}
            disabled={isSharing}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Compartir"
          >
            {isSharing ? (
              <Spinner size="small" color={C.textSecondary} />
            ) : (
              <Icon name="share-outline" size={16} className="text-muted-foreground" />
            )}
          </Pressable>
        </HStack>
      </HStack>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Pressable
          className="flex-row items-center self-start bg-card rounded-pill shadow-card gap-2"
          style={{ paddingHorizontal: 18, paddingVertical: 10, marginTop: 12 }}
          onPress={openRangePicker}
        >
          <Text weight="semibold" size="sm">{range.label}</Text>
          <Icon name="chevron-down" size={16} className="text-foreground" />
        </Pressable>

        <Box ref={shareRef} collapsable={false}>
          <Box className="bg-card rounded-lg shadow-card" style={{ marginTop: 16, paddingVertical: 20 }}>
            {isLoading ? (
              <Spinner size="large" color={C.textSecondary} style={{ paddingVertical: 80 }} />
            ) : (
              <>
                <Box className="items-center">
                  <RadarChart
                    axisLabels={MACRO_MUSCLE_GROUPS as unknown as string[]}
                    size={260}
                    series={[
                      { values: currentAxis, fillColor: C.orange, fillOpacity: 0.3, strokeColor: C.orange, strokeWidth: 2 },
                      { values: previousAxis, fillColor: C.textSecondary, fillOpacity: 0.1, strokeColor: C.textSecondary, strokeWidth: 2, dashed: true },
                    ]}
                  />
                </Box>
                <HStack className="justify-end px-5" style={{ marginTop: 12, gap: 16 }}>
                  <HStack space="xs" className="items-center">
                    <Box style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange }} />
                    <Text weight="medium" size="sm" muted>Actual</Text>
                  </HStack>
                  <HStack space="xs" className="items-center">
                    <Box style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.textSecondary }} />
                    <Text weight="medium" size="sm" muted>Anterior</Text>
                  </HStack>
                </HStack>
              </>
            )}
          </Box>

          <Box className="flex-row flex-wrap gap-3" style={{ marginTop: 20 }}>
            {kpis.map((kpi) => (
              <Box key={kpi.label} className="border border-border bg-muted rounded-md" style={{ width: '47%', padding: 18 }}>
                <Text weight="medium" size="sm" muted numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 13.5 }}>{kpi.label}</Text>
                <Text weight="extrabold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 24, lineHeight: 29, marginTop: 6 }}>{kpi.value}</Text>
                <DeltaText current={kpi.current} previous={kpi.previous} format={kpi.format} />
              </Box>
            ))}
          </Box>
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

      <SimpleBottomSheet visible={helpSheetVisible} onClose={() => setHelpSheetVisible(false)}>
        <Box style={{ padding: 24 }}>
          <Heading size="sm" style={{ marginBottom: 10 }}>¿Qué muestra este gráfico?</Heading>
          <Text muted style={{ lineHeight: 20 }}>
            Compara el volumen entrenado en cada gran zona muscular durante el periodo seleccionado (Actual) frente
            al mismo número de días inmediatamente anterior (Anterior), para ver si tu reparto de entrenamiento se
            mantiene equilibrado.
          </Text>
        </Box>
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}
