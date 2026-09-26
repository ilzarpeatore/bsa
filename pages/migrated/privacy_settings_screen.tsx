import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { showToast } from '@helper/toast';
import logger from '@helper/logger';
import { profileApi } from '../../api/profile';
import { FONT, RADIUS } from './theme';

// Privacidad (2026-09-26): unico ajuste por ahora -- si otros usuarios pueden ver, en tu
// perfil de Comunidad, un resumen AGREGADO de tus entrenamientos. Apagado por defecto;
// el servidor (PrivacyStatsController) solo devuelve esos cuatro numeros, nunca cargas,
// peso, salud ni fechas.
export default function PrivacySettingsScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [showStats, setShowStats] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    profileApi
      .getPrivacySettings()
      .then((res) => {
        if (!ignore) setShowStats(!!res.data?.data?.show_public_stats);
      })
      .catch((e) => {
        logger.error('Privacy settings fetch error:', e);
        if (!ignore) {
          setShowStats(false);
          showToast('Error', { description: 'No se pudo cargar tu ajuste de privacidad.', variant: 'error' });
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const toggle = async (next: boolean) => {
    const previous = showStats;
    setShowStats(next);
    setSaving(true);
    try {
      const res = await profileApi.setPrivacySettings(next);
      setShowStats(!!res.data?.data?.show_public_stats);
    } catch (e) {
      logger.error('Privacy settings save error:', e);
      setShowStats(previous);
      showToast('Error', { description: 'No se pudo guardar el cambio. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Privacidad" onBack={() => props.navigation.goBack()} />
      <Box style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Box style={styles.card}>
          <HStack className="items-center justify-between">
            <VStack style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.title}>Mostrar mis estadísticas en mi perfil</Text>
              <Text style={styles.subtitle}>
                Otros usuarios verán cuántos entrenamientos has hecho el último mes, tus récords, la duración media y tu
                racha de semanas. Nunca se muestran cargas, peso, datos de salud ni fechas concretas.
              </Text>
            </VStack>
            <Switch
              value={!!showStats}
              onValueChange={toggle}
              disabled={showStats === null || saving}
              trackColor={{ false: C.gray70, true: C.primary }}
              thumbColor={C.white}
            />
          </HStack>
        </Box>
        <Text style={[styles.subtitle, { marginTop: 12, paddingHorizontal: 4 }]}>
          Está desactivado por defecto: nadie ve tus estadísticas hasta que tú lo actives.
        </Text>
      </Box>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 16 },
    title: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary },
    subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 },
  });
}
