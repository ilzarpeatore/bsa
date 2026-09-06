import React, { useState } from "react";
import { Platform } from "react-native";
import { showToast } from "@helper/toast";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@components/ui/box";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { VStack } from "@components/ui/vstack";
import { Pressable } from "@components/ui/pressable";
import { Icon } from "@components/ui/icon";
import { Spinner } from "@components/ui/spinner";
import { isHealthAvailable, requestHealthPermissions } from "@helper/health";
import { useAppColorMode } from "@helper/useAppColorMode";

const HEALTH_APP_NAME = Platform.OS === "ios" ? "Apple Salud" : "Health Connect";
// HealthKit exige la capability 'com.apple.developer.healthkit', que Apple solo concede
// a cuentas de pago de Apple Developer Program. Esta app se firma hoy con un Apple ID
// personal/gratuito (vía iloader) -> el entitlement no se puede conceder y cualquier
// llamada a HealthKit crashea la app al instante. Oculto en iOS hasta tener cuenta de pago;
// Health Connect en Android no tiene esta restricción, se deja activo.
//
// AUDITORÍA PLAY STORE (2026-09-06): pese a HEALTH_INTEGRATION_AVAILABLE=true en Android,
// esta pantalla (LinkDeviceChoiceScreen, handleConnectHealthApp más abajo) sigue sin tener
// ningún llamador real en producción -- su única referencia es pages/ScreenExplorer.tsx, que
// a su vez solo es alcanzable con DEV_TOOLS_ENABLED=true (constants/featureFlags.ts), false
// para el build de tienda. El punto de entrada real y visible ("Dispositivos" en
// profile_screen.tsx) apunta a MigratedComingSoon, no aquí -- mismo criterio que resolvió el
// rechazo real de Apple (Guideline 2.5.1, ver commit "Identifica Apple Health/HealthKit en la
// UI"). Por eso hoy NO hace falta declarar permisos de Health Connect (android.permissions) ni
// registrar el plugin de Expo de 'react-native-health-connect' en app.json -- declararlos sin
// que esta pantalla sea alcanzable reproduciría en Android el mismo patrón de "permiso
// declarado sin función visible" que causó el rechazo de Apple. Si en el futuro se conecta de
// verdad "Dispositivos" a esta pantalla (o se activa DEV_TOOLS_ENABLED de forma duradera),
// hacen falta AMBAS cosas antes de subir a Play Console: (1) declarar en app.json los permisos
// Health Connect que se usen de verdad (helper/health.ts pide Steps/HeartRate/SleepSession/
// Hydration/HeartRateVariabilityRmssd/RestingHeartRate) vía el plugin de la librería o
// android.permissions, verificando el nombre exacto de cada permiso contra
// https://matinzd.github.io/react-native-health-connect/docs/permissions antes de asumirlo; y
// (2) rellenar la sección "Health Connect permissions"/Data safety de la ficha de Play
// Console explicando el uso -- declarar el permiso en el manifest no sustituye esa declaración
// en la consola, son dos pasos independientes.
const HEALTH_INTEGRATION_AVAILABLE = Platform.OS === "android";

const renderOption = (
  icon: string,
  iconBg: string,
  iconColor: string,
  title: string,
  desc: string,
  onPress: () => void,
  C: ReturnType<typeof useAppColorMode>['colors'],
  opts?: { disabled?: boolean; loading?: boolean }
) => (
  <Pressable
    className="flex-row items-center bg-card rounded-lg border border-border"
    style={{ padding: 20, gap: 16 }}
    onPress={onPress}
    disabled={opts?.disabled}
  >
    <Box className={`w-14 h-14 rounded-sm items-center justify-center ${iconBg}`}>
      {opts?.loading ? (
        <Spinner color={C.textPrimary} />
      ) : (
        <Icon name={icon as any} size={32} className={iconColor} />
      )}
    </Box>
    <VStack className="flex-1" space="xs">
      <Text weight="semibold">{title}</Text>
      <Text size="xs" muted>{desc}</Text>
    </VStack>
    <Icon name="chevron-forward" size={20} className="text-muted-foreground" />
  </Pressable>
);

export default function LinkDeviceChoiceScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const [connecting, setConnecting] = useState(false);

  const handleConnectHealthApp = async () => {
    setConnecting(true);
    try {
      const available = await isHealthAvailable();
      if (!available) {
        showToast(`${HEALTH_APP_NAME} no disponible`, {
          description:
            Platform.OS === "android"
              ? "Instala la app Health Connect desde Play Store para poder sincronizar tus datos."
              : "Este dispositivo no tiene Salud disponible.",
          variant: "warning",
        });
        return;
      }
      const result = await requestHealthPermissions();
      if (result.granted) {
        navigation.replace("MigratedDeviceConnected", { source: "health" });
      } else {
        showToast("Permiso no concedido", {
          description: `Puedes activar el acceso más tarde desde los ajustes de ${HEALTH_APP_NAME}.`,
          variant: "warning",
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <VStack className="flex-1" space="lg" style={{ padding: 20, paddingBottom: 40 }}>
        <Pressable
          className="w-10 h-10 rounded-sm bg-card border border-border items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Pressable>

        <VStack space="xs">
          <Heading size="xl">Connect your device</Heading>
          <Text muted>Choose how you want to track your fitness data</Text>
        </VStack>

        <VStack space="md">
          {HEALTH_INTEGRATION_AVAILABLE &&
            renderOption(
              "heart",
              "bg-secondary",
              "text-foreground",
              HEALTH_APP_NAME,
              "Sincroniza pasos, ritmo cardíaco y más",
              handleConnectHealthApp,
              C,
              { disabled: connecting, loading: connecting }
            )}

          {renderOption(
            "watch",
            "bg-secondary",
            "text-foreground",
            "Wearable Device",
            "Connect via Bluetooth",
            () => navigation.navigate("MigratedLinkDeviceList"),
            C
          )}
        </VStack>

        <Pressable className="flex-row items-center justify-center" style={{ gap: 8, marginTop: 20 }}>
          <Icon name="help-circle-outline" size={20} className="text-primary" />
          <Text size="sm" weight="medium" className="text-primary">Need help connecting?</Text>
        </Pressable>
      </VStack>
    </SafeAreaView>
  );
}
