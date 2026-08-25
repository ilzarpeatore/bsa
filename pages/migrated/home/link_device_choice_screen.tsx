import React, { useState } from "react";
import { Platform, Alert } from "react-native";
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
        Alert.alert(
          `${HEALTH_APP_NAME} no disponible`,
          Platform.OS === "android"
            ? "Instala la app Health Connect desde Play Store para poder sincronizar tus datos."
            : "Este dispositivo no tiene Salud disponible."
        );
        return;
      }
      const result = await requestHealthPermissions();
      if (result.granted) {
        navigation.replace("MigratedDeviceConnected", { source: "health" });
      } else {
        Alert.alert(
          "Permiso no concedido",
          `Puedes activar el acceso más tarde desde los ajustes de ${HEALTH_APP_NAME}.`
        );
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <VStack className="flex-1" space="lg" style={{ padding: 20, paddingBottom: 40 }}>
        <Pressable
          className="w-10 h-10 rounded-sm bg-card border border-border items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={22} className="text-foreground" />
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

          {renderOption(
            "create-outline",
            "bg-success",
            "text-success-foreground",
            "Manual Entry",
            "Log steps manually",
            () => navigation.navigate("MigratedLogStepsForm"),
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
