import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
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
import MuscleBodyMap, { MuscleVolumeGroup } from '../../components/MuscleBodyMap';
import { ViewSide } from '../../constants/bodyMusclesPaths';
import DaySelectorStrip, { DaySelectorItem } from '../../components/DaySelectorStrip';
import { buildWeekRange, toLocalISODate } from '../../components/dayRange';
import { muscleVolumeApi, MuscleVolumeSeriesGroup } from '../../api/muscleVolume';

interface Props {
  navigation?: any;
  route?: any;
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function weekLabel(days: DaySelectorItem[]): string {
  const start = new Date(days[0].date + 'T00:00:00');
  const end = new Date(days[days.length - 1].date + 'T00:00:00');
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}-${end.getDate()} ${MONTHS_ES[start.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS_ES[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTHS_ES[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
}

const onHelp = () =>
  Alert.alert(
    '¿Qué muestra este mapa?',
    'El color de cada zona refleja el volumen entrenado en los últimos 7 días terminando en el día seleccionado (igual que el gráfico corporal de la pantalla principal de Estadísticas). La tabla de abajo muestra las series registradas por grupo muscular en esa misma ventana.'
  );

export default function StatisticsBodyDistributionScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const weekDays = useMemo(() => buildWeekRange(weekAnchor), [weekAnchor]);
  const todayISO = useMemo(() => toLocalISODate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    const days = buildWeekRange(new Date());
    const today = toLocalISODate(new Date());
    return days.some((d) => d.date === today) ? today : days[days.length - 1].date;
  });

  const [volumeByMuscle, setVolumeByMuscle] = useState<MuscleVolumeGroup[]>([]);
  const [seriesByMuscle, setSeriesByMuscle] = useState<MuscleVolumeSeriesGroup[]>([]);
  const [totalSeries, setTotalSeries] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    // Ventana de 7 dias terminando en selectedDate — MISMA semantica que el
    // selector de dias de la pantalla principal (statistics_screen.tsx,
    // seccion "Grafico corporal de los ultimos 7 dias"), tal y como pide
    // docs/Pantallas_Estadisticas.md ("Idéntico al de la sección 1 de la
    // pantalla principal — reutilizar el mismo componente... recalcula el
    // heatmap con la ventana de 7 días terminando en ese día"). Antes se
    // pedia days=1 (un unico dia), lo que hacia que este heatmap NUNCA
    // coincidiera con el de la pantalla principal para la misma fecha —
    // bug reportado 2026-08-13 ("el heatmap no esta sincronizado con el de
    // MigratedStatistics"). El navegador de semana solo mueve que semana se
    // muestra en el selector de dias; la ventana de datos siempre son los
    // 7 dias terminando en el dia seleccionado dentro de esa semana.
    muscleVolumeApi
      .getMy(7, selectedDate)
      .then((res) => {
        if (!active) return;
        const data = res.data?.data || res.data;
        setVolumeByMuscle(data?.volumeByMuscle || []);
        setSeriesByMuscle(data?.seriesByMuscle || []);
        setTotalSeries(data?.totalSeries || 0);
      })
      .catch(() => {
        if (!active) return;
        setVolumeByMuscle([]);
        setSeriesByMuscle([]);
        setTotalSeries(0);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  const seriesByGroup = useMemo(() => {
    const map = new Map<string, number>();
    seriesByMuscle.forEach((m) => map.set(m.group, m.series));
    return map;
  }, [seriesByMuscle]);

  // Solo se listan los grupos musculares con al menos 1 serie registrada en
  // la ventana de 7 días terminando en selectedDate — mostrar la tabla
  // completa (incluyendo grupos con 0 series) no aporta nada si solo se han
  // entrenado dos o tres grupos. El mapa corporal (heatmap) se deja con el
  // dataset completo tal cual, solo se filtra la tabla.
  const trainedMuscles = useMemo(
    () => volumeByMuscle.filter((m) => (seriesByGroup.get(m.group) ?? 0) > 0),
    [volumeByMuscle, seriesByGroup]
  );

  const goPrevWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(d);
    setSelectedDate(buildWeekRange(d)[0].date);
  };
  const goNextWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(d);
    const days = buildWeekRange(d);
    setSelectedDate(days.some((x) => x.date === todayISO) ? todayISO : days[0].date);
  };

  const shareRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const onShare = async () => {
    if (!shareRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 0.92 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir mapa corporal' });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar la imagen para compartir.');
    } finally {
      setIsSharing(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
        <Heading size="sm" className="flex-1 text-center mx-1" numberOfLines={1}>
          Distribución del cuerpo
        </Heading>
        <HStack space="sm">
          <Pressable
            className="rounded-pill bg-card items-center justify-center shadow-card"
            style={{ width: 32, height: 32 }}
            onPress={onHelp}
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
        <HStack className="items-center justify-center" style={{ gap: 16, marginTop: 8 }}>
          <Pressable onPress={goPrevWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevron-back" size={18} className="text-muted-foreground" />
          </Pressable>
          <Text weight="semibold" size="md">{weekLabel(weekDays)}</Text>
          <Pressable onPress={goNextWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevron-forward" size={18} className="text-muted-foreground" />
          </Pressable>
        </HStack>

        <Box style={{ marginTop: 18 }}>
          <DaySelectorStrip days={weekDays} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </Box>

        <Box
          ref={shareRef}
          collapsable={false}
          className="bg-card rounded-lg justify-center shadow-card"
          style={{ marginTop: 16, paddingVertical: 12, minHeight: 180 }}
        >
          {isLoading ? (
            <Spinner size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
          ) : (
            <HStack className="justify-around">
              <MuscleBodyMap data={volumeByMuscle} height={190} showToggle={false} forcedView={ViewSide.FRONT} />
              <MuscleBodyMap data={volumeByMuscle} height={190} showToggle={false} forcedView={ViewSide.BACK} />
            </HStack>
          )}
        </Box>

        <Box className="bg-card rounded-lg shadow-card" style={{ marginTop: 16, overflow: 'hidden' }}>
          <HStack className="justify-between bg-muted" style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
            <Text weight="semibold" size="xs" muted style={{ letterSpacing: 0.4 }}>MÚSCULO</Text>
            <Text weight="semibold" size="xs" muted style={{ letterSpacing: 0.4 }}>SERIES</Text>
          </HStack>
          <HStack className="justify-between border-b border-border" style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
            <Text weight="bold" size="md" style={{ fontSize: 15.5 }}>Total</Text>
            <Text weight="bold" size="md" style={{ fontSize: 15.5 }}>{totalSeries}</Text>
          </HStack>
          {trainedMuscles.length === 0 ? (
            <Box style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              <Text size="xs" muted className="flex-1 text-center">Sin series registradas en estos 7 días.</Text>
            </Box>
          ) : (
            trainedMuscles.map((m, idx) => (
              <HStack
                key={m.group}
                className={`justify-between${idx < trainedMuscles.length - 1 ? ' border-b border-border' : ''}`}
                style={{ paddingHorizontal: 18, paddingVertical: 14 }}
              >
                <Text size="sm" style={{ fontSize: 14.5 }}>{m.group}</Text>
                <Text size="sm" style={{ fontSize: 14.5 }}>{seriesByGroup.get(m.group) ?? 0}</Text>
              </HStack>
            ))
          )}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
