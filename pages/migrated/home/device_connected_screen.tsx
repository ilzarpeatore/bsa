import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@components/ui/box";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { VStack } from "@components/ui/vstack";
import { Button, ButtonText } from "@components/ui/button";
import { Icon } from "@components/ui/icon";

export default function DeviceConnectedScreen({ navigation, route }: any) {
  const isHealthSource = route?.params?.source === "health";

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <VStack className="flex-1 items-center justify-center px-8" space="2xl">
        <Box className="items-center justify-center rounded-pill bg-success" style={{ width: 96, height: 96 }}>
          <Icon name="checkmark" size={56} className="text-success-foreground" />
        </Box>

        <VStack space="sm" className="items-center">
          <Heading size="xl" className="text-center">{"¡Conectado!"}</Heading>
          <Text muted className="text-center">
            {isHealthSource
              ? "Tus datos de salud ya se están sincronizando."
              : "Tu wearable está sincronizado correctamente."}
          </Text>
        </VStack>

        <Button
          size="lg"
          className="px-12"
          onPress={() => navigation.navigate("Home", { screen: "PlanDiarioTab" })}
        >
          <ButtonText>Volver al inicio</ButtonText>
        </Button>
      </VStack>
    </SafeAreaView>
  );
}
