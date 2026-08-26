import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { HStack } from '@components/ui/hstack';
import { Button } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { SHADOW } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import MuscleBodyMap, { MuscleVolumeGroup } from '../../components/MuscleBodyMap';
import { ViewSide } from '../../constants/bodyMusclesPaths';
import DaySelectorStrip from '../../components/DaySelectorStrip';
import { buildDayRange } from '../../components/dayRange';
import SimpleBottomSheet from '../../components/SimpleBottomSheet';
import { muscleVolumeApi } from '../../api/muscleVolume';

interface Props {
  navigation?: any;
  route?: any;
}

interface AdvancedItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string | null;
  params?: Record<string, any>;
}

const ADVANCED_ITEMS: AdvancedItem[] = [
  {
    key: 'series',
    icon: 'bar-chart-outline',
    title: 'Series por grupo muscular',
    subtitle: 'Total agregado por zona en un rango (7/30/90 días), comparado con el periodo anterior',
    route: 'MigratedStatisticsSeriesCount',
  },
  {
    key: 'muscles',
    icon: 'analytics-outline',
    title: 'Balance muscular',
    subtitle: 'Compara la distribución actual y previa de tus músculos entrenados',
    route: 'MigratedStatisticsMuscles',
  },
  {
    key: 'body',
    icon: 'body-outline',
    title: 'Mapa de calor corporal',
    subtitle: 'El mismo heatmap de los últimos 7 días, con navegador para moverte entre semanas',
    route: 'MigratedStatisticsBody',
  },
  {
    key: 'topExercises',
    icon: 'podium-outline',
    title: 'Ejercicios más frecuentes',
    subtitle: 'Lista de los ejercicios que realizas con más frecuencia',
    route: 'MigratedStatisticsTopExercises',
  },
  {
    key: 'prs',
    icon: 'trophy-outline',
    title: 'Mejores marcas',
    subtitle: 'Ranking de tus mejores marcas por ejercicio',
    route: 'MigratedStatisticsPersonalRecords',
  },
  {
    key: 'monthly',
    icon: 'document-text-outline',
    title: 'Resumen mensual',
    subtitle: 'Resumen de tus entrenamientos y estadísticas del mes',
    route: 'MigratedStatisticsMonthlyReport',
  },
];

export default function StatisticsScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const days7 = useMemo(() => buildDayRange(7), []);
  const [selectedDate, setSelectedDate] = useState(days7[days7.length - 1].date);
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolumeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    muscleVolumeApi
      .getMy(7, selectedDate)
      .then((res) => {
        if (!active) return;
        const data = res.data?.data || res.data;
        setMuscleVolume(data?.volumeByMuscle || []);
      })
      .catch(() => {
        if (active) setMuscleVolume([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  const openHelp = useCallback(() => setHelpVisible(true), []);

  const onPressItem = (item: AdvancedItem) => {
    if (item.route) {
      navigation?.navigate(item.route, item.params);
    } else {
      navigation?.navigate('MigratedComingSoon', { title: item.title });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Box className="bg-background flex-1">
        <HStack className="items-center justify-between px-3 py-3">
          <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
            <Icon name="chevron-back" size={22} className="text-foreground" />
          </Button>
          <Heading size="sm">Estadísticas</Heading>
          <Box style={{ width: 36, height: 36 }} />
        </HStack>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <HStack className="items-center justify-between px-5" style={{ marginTop: 8, marginBottom: 14 }}>
            <Text weight="semibold" size="sm" className="flex-1" style={{ marginRight: 12 }}>
              Gráfico corporal de los últimos 7 días
            </Text>
            <Pressable
              className="rounded-pill bg-card items-center justify-center"
              style={{ width: 28, height: 28, ...SHADOW.card }}
              onPress={openHelp}
            >
              <Text weight="bold" size="xs" muted>?</Text>
            </Pressable>
          </HStack>

          <Box className="px-5" style={{ marginBottom: 16 }}>
            <DaySelectorStrip days={days7} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </Box>

          <Box
            className="bg-card rounded-lg mx-5 justify-center"
            style={{ paddingVertical: 12, minHeight: 180, ...SHADOW.card }}
          >
            {isLoading ? (
              <Spinner size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
            ) : (
              <HStack className="justify-around">
                <MuscleBodyMap data={muscleVolume} height={190} showToggle={false} forcedView={ViewSide.FRONT} />
                <MuscleBodyMap data={muscleVolume} height={190} showToggle={false} forcedView={ViewSide.BACK} />
              </HStack>
            )}
          </Box>

          <Box className="px-5" style={{ marginTop: 28, marginBottom: 12 }}>
            <Text weight="semibold" size="xs" muted style={{ letterSpacing: 0.5 }}>ANÁLISIS AVANZADO</Text>
          </Box>

          <Box className="px-5 gap-3">
            {ADVANCED_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                className="flex-row items-center bg-card rounded-lg"
                style={{ paddingVertical: 14, paddingHorizontal: 16, ...SHADOW.card }}
                onPress={() => onPressItem(item)}
              >
                <Icon name={item.icon} size={22} color={C.textSecondary} style={{ marginRight: 14 }} />
                <Box className="flex-1">
                  <Text weight="semibold" size="sm">{item.title}</Text>
                  <Text size="xs" muted numberOfLines={2} style={{ marginTop: 3 }}>
                    {item.subtitle}
                  </Text>
                </Box>
                <Icon name="chevron-forward" size={18} color={C.gray40} />
              </Pressable>
            ))}
          </Box>
        </ScrollView>

        <SimpleBottomSheet visible={helpVisible} onClose={() => setHelpVisible(false)}>
          <Box className="p-6">
            <Heading size="sm" style={{ marginBottom: 10 }}>¿Qué significa el color?</Heading>
            <Text muted style={{ lineHeight: 20 }}>
              La intensidad del color de cada zona muestra cuánto volumen has entrenado ese grupo muscular en los
              últimos 7 días respecto al resto: cuanto más oscuro/saturado, más volumen relativo ha recibido esa zona.
            </Text>
          </Box>
        </SimpleBottomSheet>
      </Box>
    </SafeAreaView>
  );
}
