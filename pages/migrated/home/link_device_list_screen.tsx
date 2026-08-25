import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@components/ui/box";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { HStack } from "@components/ui/hstack";
import { VStack } from "@components/ui/vstack";
import { Pressable } from "@components/ui/pressable";
import { Button, ButtonText } from "@components/ui/button";
import { Icon } from "@components/ui/icon";

const DEVICES = [
  { name: "Garmin", icon: "watch", desc: "Garmin smartwatch" },
  { name: "Fitbit", icon: "watch", desc: "Fitbit tracker" },
  { name: "Apple Watch", icon: "watch", desc: "Apple Watch Series" },
  { name: "Samsung Galaxy Watch", icon: "watch", desc: "Galaxy Watch series" },
];

export default function LinkDeviceListScreen({ navigation }: any) {
  const handleConnect = () => {
    navigation.navigate("MigratedEmparejando");
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <VStack className="flex-1" space="lg" style={{ padding: 20, paddingBottom: 40 }}>
        <Pressable
          className="w-10 h-10 rounded-sm bg-card border border-border items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Pressable>

        <VStack space="xs">
          <Heading size="xl">Select Device</Heading>
          <Text muted>Choose your wearable to start syncing</Text>
        </VStack>

        <VStack space="md">
          {DEVICES.map((device) => (
            <HStack
              key={device.name}
              space="md"
              className="items-center bg-card rounded-md border border-border"
              style={{ padding: 16 }}
            >
              <Box
                className="rounded-sm bg-secondary items-center justify-center"
                style={{ width: 52, height: 52 }}
              >
                <Icon name={device.icon as any} size={28} className="text-foreground" />
              </Box>
              <VStack className="flex-1" space="xs">
                <Text weight="semibold">{device.name}</Text>
                <Text size="xs" muted>{device.desc}</Text>
              </VStack>
              <Button size="sm" onPress={handleConnect}>
                <ButtonText>Connect</ButtonText>
              </Button>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
