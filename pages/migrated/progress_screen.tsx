import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { SHADOW } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import MuscleBodyMap from '@components/MuscleBodyMap';
import { ViewSide } from '../../constants/bodyMusclesPaths';
import { bodyMetricsApi, BodyMetricChartData } from '../../api/bodyMetrics';
import { statisticsApi, PeriodStats, Adherence } from '../../api/statistics';
import { muscleVolumeApi, MuscleVolumeData } from '../../api/muscleVolume';
import { habitCellColor } from '@constants/habitColor';
import logger from '@helper/logger';

// Los 4 componentes de "Composición corporal" que pidió el usuario, por sus
// value fijos del catálogo global sembrado (ver body_metric_types) — el resto
// de tipos (cuello, pecho, cintura, cadera, bíceps, muslo, pantorrilla, y
// cualquier tipo custom que añada el coach) viven en la pantalla de
// Antropometría completa, no aquí.
const COMPOSITION_METRICS: { key: string; label: string }[] = [
  { key: 'weight', label: 'Peso' },
  { key: 'body_fat', label: 'Grasa corporal' },
  { key: 'muscle_mass', label: 'Masa muscular' },
  { key: 'visceral_fat', label: 'Grasa visceral' },
];

const EMPTY_VOLUME: MuscleVolumeData = { volumeByMuscle: [], seriesByMuscle: [], volumeByDate: [], volumeByDateAndMuscle: [], totalVolume: 0, sessionsCount: 0, totalSeries: 0 };

function CompositionTile({
  label,
  entry,
  delta,
  onPress,
}: {
  label: string;
  entry: { value: number; unit: string | null } | null;
  delta: number | null;
  onPress: () => void;
}) {
  const { colors: C } = useAppColorMode();
  return (
    <Pressable
      className="rounded-md bg-card"
      style={{ flex: 1, minHeight: 104, padding: 14, ...SHADOW.card }}
      onPress={onPress}
    >
      <Text size="xs" weight="medium" muted>{label}</Text>
      {entry ? (
        <>
          <Text weight="bold" size="xl" style={{ marginTop: 6 }}>
            {entry.value}
            <Text size="xs" weight="medium" muted> {entry.unit}</Text>
          </Text>
          {delta !== null ? (
            <Box
              className="flex-row items-center self-start rounded-sm"
              style={{
                gap: 3,
                paddingHorizontal: 7,
                paddingVertical: 3,
                marginTop: 6,
                backgroundColor: delta < 0 ? C.success10 : delta > 0 ? C.warning10 : C.gray5,
              }}
            >
              <Icon
                name={delta < 0 ? 'arrow-down' : delta > 0 ? 'arrow-up' : 'remove'}
                size={10}
                color={delta < 0 ? C.statusSuccess : delta > 0 ? C.statusWarning : C.gray40}
              />
              <Text weight="bold" size="xs" style={{ color: delta < 0 ? C.statusSuccess : delta > 0 ? C.statusWarning : C.gray40 }}>
                {Math.abs(delta).toFixed(1)}
              </Text>
            </Box>
          ) : (
            <Text size="xs" muted style={{ marginTop: 6 }}>Primera medida</Text>
          )}
        </>
      ) : (
        <Text size="xs" muted style={{ marginTop: 8 }}>Sin datos</Text>
      )}
    </Pressable>
  );
}

export default function ProgressScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [loading, setLoading] = useState(true);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricChartData>({});
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolumeData>(EMPTY_VOLUME);

  const load = async () => {
    setLoading(true);
    try {
      const [bodyMetricsRes, periodRes, adherenceRes, volumeRes] = await Promise.allSettled([
        bodyMetricsApi.getChart(),
        statisticsApi.getMyPeriodStats(30),
        statisticsApi.getMyAdherence(30),
        muscleVolumeApi.getMy(7),
      ]);

      if (bodyMetricsRes.status === 'fulfilled') setBodyMetrics(bodyMetricsRes.value.data?.data ?? {});
      if (periodRes.status === 'fulfilled') setPeriodStats(periodRes.value.data?.data ?? null);
      if (adherenceRes.status === 'fulfilled') setAdherence(adherenceRes.value.data?.data ?? null);
      if (volumeRes.status === 'fulfilled') setMuscleVolume(volumeRes.value.data?.data ?? EMPTY_VOLUME);
    } catch (e) {
      logger.error('Progress init error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const composition = useMemo(() => {
    return COMPOSITION_METRICS.map((m) => {
      const points = [...(bodyMetrics[m.key]?.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      const latest = points[points.length - 1] ?? null;
      const previous = points[points.length - 2] ?? null;
      return {
        ...m,
        entry: latest ? { value: latest.value, unit: bodyMetrics[m.key]?.unit ?? null } : null,
        delta: latest && previous ? latest.value - previous.value : null,
      };
    });
  }, [bodyMetrics]);

  const goToMetric = (metricType: string) => props.navigation?.navigate('MigratedBodyMetrics', { metricType });

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['bottom']}>
      <ScreenHeader title="Informe" onBack={() => props.navigation?.goBack()} />

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <Spinner size="large" color={C.orange} />
        </Box>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Composición corporal */}
          <Text size="sm" weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>Composición corporal</Text>
          {/* 2 filas explicitas de flex:1, no flex-wrap -- con flexBasis 0
              (lo que da flex:1 sin width fijo) Yoga no sabe cuantos caben por
              fila, así que un contenedor flex-wrap con 4 tiles a flex:1 no
              garantiza 2 columnas. Filas explicitas si dan un ancho exacto,
              gap-aware, sin el desajuste de "47%" que dejaba a este bloque
              mas estrecho que el Button de abajo (mismo ancho que el
              contenedor en ambos, alineados en los 2 bordes). COMPOSITION_METRICS
              tiene siempre 4 items -- si se anade un 5º, esto necesita revisarse. */}
          <Box className="gap-3">
            <Box className="flex-row gap-3">
              {composition.slice(0, 2).map((m) => (
                <CompositionTile key={m.key} label={m.label} entry={m.entry} delta={m.delta} onPress={() => goToMetric(m.key)} />
              ))}
            </Box>
            <Box className="flex-row gap-3">
              {composition.slice(2, 4).map((m) => (
                <CompositionTile key={m.key} label={m.label} entry={m.entry} delta={m.delta} onPress={() => goToMetric(m.key)} />
              ))}
            </Box>
          </Box>
          <Button
            radius="pill"
            className="py-4"
            style={{ marginTop: 14 }}
            onPress={() => props.navigation?.navigate('MigratedBodyMetrics')}
          >
            <ButtonText>Ver todas las medidas (cintura, cadera, pecho...)</ButtonText>
            <Icon name="chevron-forward" size={18} className="text-primary-foreground" />
          </Button>

          {/* Constancia */}
          <Text size="sm" weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>Constancia</Text>
          <Box className="rounded-md bg-card" style={{ padding: 16, ...SHADOW.card }}>
            {adherence?.mode === 'program' ? (
              <>
                <Box className="flex-row items-center justify-between">
                  <Box>
                    <Text weight="bold" size="2xl">
                      {adherence.ratio !== null ? Math.round(adherence.ratio * 100) : '--'}
                      <Text size="sm" weight="medium" muted>%</Text>
                    </Text>
                    <Text size="xs" muted style={{ marginTop: 3 }}>
                      {adherence.completedCount}/{adherence.scheduledCount} entrenamientos programados (últimos {adherence.periodDays} días)
                    </Text>
                  </Box>
                  <Box className="flex-row items-center gap-1 rounded-sm px-2.5 py-1.5" style={{ backgroundColor: 'rgba(255,107,53,0.12)' }}>
                    <Icon name="flame" size={16} color={C.orange} />
                    <Text weight="bold" size="sm" style={{ color: C.orange }}>{adherence.currentStreak}</Text>
                  </Box>
                </Box>
                {adherence.days.length > 0 && (
                  <Box className="flex-row flex-wrap gap-1" style={{ marginTop: 14 }}>
                    {adherence.days.slice(-21).map((d) => (
                      <Box key={d.date} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: habitCellColor(d.completed ? 1 : 0, d.completed, C.gray10) }} />
                    ))}
                  </Box>
                )}
              </>
            ) : adherence?.mode === 'freeform' ? (
              <Box className="flex-row items-center justify-between">
                <Box>
                  <Text weight="bold" size="2xl">{adherence.sessionsCount}</Text>
                  <Text size="xs" muted style={{ marginTop: 3 }}>
                    entrenamientos en los últimos {adherence.periodDays} días · {adherence.daysActive} días activos
                  </Text>
                </Box>
                <Box className="flex-row items-center gap-1 rounded-sm px-2.5 py-1.5" style={{ backgroundColor: 'rgba(255,107,53,0.12)' }}>
                  <Icon name="flame" size={16} color={C.orange} />
                  <Text weight="bold" size="sm" style={{ color: C.orange }}>{adherence.currentStreak}</Text>
                </Box>
              </Box>
            ) : (
              <Text size="xs" muted>Sin datos todavía</Text>
            )}
          </Box>

          {/* Entrenamiento */}
          <Text size="sm" weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>Entrenamiento</Text>
          <Box className="rounded-md bg-card" style={{ padding: 16, ...SHADOW.card }}>
            <Box className="flex-row">
              <Box className="flex-1 items-center">
                <MuscleBodyMap data={muscleVolume.volumeByMuscle} height={150} showToggle={false} forcedView={ViewSide.FRONT} />
              </Box>
              <Box className="flex-1 items-center">
                <MuscleBodyMap data={muscleVolume.volumeByMuscle} height={150} showToggle={false} forcedView={ViewSide.BACK} />
              </Box>
            </Box>
            <Text size="xs" muted className="text-center" style={{ marginTop: 4 }}>Volumen muscular de los últimos 7 días</Text>
            {periodStats && (
              <Text size="xs" muted className="text-center" style={{ marginTop: 4 }}>
                {periodStats.sessionsCount} sesiones · {Math.round(periodStats.volumeKg).toLocaleString('es-ES')} kg en los últimos 30 días
              </Text>
            )}
            <Box className="flex-row gap-2.5" style={{ marginTop: 14 }}>
              <Button className="flex-1" onPress={() => props.navigation?.navigate('MigratedStatistics')}>
                <Icon name="stats-chart-outline" size={18} className="text-primary-foreground" />
                <ButtonText>Estadísticas</ButtonText>
              </Button>
              <Button className="flex-1" onPress={() => props.navigation?.navigate('MigratedMuscleProgress')}>
                <Icon name="body-outline" size={18} className="text-primary-foreground" />
                <ButtonText>Progreso muscular</ButtonText>
              </Button>
            </Box>
          </Box>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
