import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Linking, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import ScreenHeader from '@components/ScreenHeader';
import { ensureNotificationPermissionsAsync } from '@helper/reminderNotifications';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT } from './theme';

// Pantalla nueva (pedido explícito, captura de referencia Bevel): "Permitir
// notificaciones" -- NO es un flag propio de la app, refleja el permiso REAL
// del sistema operativo (Notifications.getPermissionsAsync(), mismo helper
// que ya usan los recordatorios de agua/comidas/personalizados en
// helper/reminderNotifications.ts -- ensureNotificationPermissionsAsync()).
// Ninguna app puede REVOCAR ese permiso de forma programática una vez
// concedido (ni iOS ni Android lo permiten), así que apagar el switch
// estando ya concedido -- igual que reactivarlo tras haberlo denegado antes
// -- abre los Ajustes del sistema en vez de fingir un toggle que no existe a
// ese nivel. Mismo patrón que usa prácticamente cualquier app real para este
// control ("permission mirror", no un ajuste de verdad bidireccional).
export default function NotificationSettingsScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [granted, setGranted] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    const res = await Notifications.getPermissionsAsync();
    setGranted(res.status === 'granted');
  }, []);

  useEffect(() => {
    refreshStatus();
    // El usuario puede cambiar el permiso desde los Ajustes del sistema y
    // volver a la app -- refrescar al recuperar el foco para que el switch
    // no se quede desincronizado del estado real.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshStatus();
    });
    return () => sub.remove();
  }, [refreshStatus]);

  const openSystemSettings = () => Linking.openSettings();

  const handleToggle = async (value: boolean) => {
    if (value) {
      const nowGranted = await ensureNotificationPermissionsAsync();
      if (nowGranted) {
        setGranted(true);
      } else {
        Alert.alert(
          'Notificaciones desactivadas',
          'Ya las denegaste antes -- actívalas desde los Ajustes del sistema para recibir avisos de recordatorios.',
          [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir Ajustes', onPress: openSystemSettings }]
        );
      }
    } else {
      Alert.alert(
        'Desactivar notificaciones',
        'Este permiso solo se puede desactivar desde los Ajustes del sistema.',
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir Ajustes', onPress: openSystemSettings }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Notificaciones" onBack={() => props.navigation.goBack()} />
      <Box style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Box style={styles.card}>
          <HStack className="items-center justify-between">
            <VStack style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.title}>Permitir notificaciones</Text>
              <Text style={styles.subtitle}>Habilita las notificaciones push.</Text>
            </VStack>
            <Switch
              value={!!granted}
              onValueChange={handleToggle}
              disabled={granted === null}
              trackColor={{ false: C.gray70, true: C.primary }}
              thumbColor={C.white}
            />
          </HStack>
        </Box>
      </Box>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    card: { backgroundColor: C.surface, borderRadius: 16, padding: 16 },
    title: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary },
    subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  });
}
