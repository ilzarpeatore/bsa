import React, { useEffect, useState } from "react";
import { Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { HStack } from "@components/ui/hstack";
import { VStack } from "@components/ui/vstack";
import { Icon } from "@components/ui/icon";
import { useAppColorMode } from "@helper/useAppColorMode";

export default function EmparejandoScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [dot1] = useState(() => new Animated.Value(0));
  const [dot2] = useState(() => new Animated.Value(0));
  const [dot3] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const dots = [dot1, dot2, dot3];
    const dotAnimations = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    dotAnimations.forEach((a) => a.start());

    const timer = setTimeout(() => {
      navigation.replace("MigratedDeviceConnected");
    }, 3000);

    return () => {
      pulse.stop();
      dotAnimations.forEach((a) => a.stop());
      clearTimeout(timer);
    };
  }, [pulseAnim, dot1, dot2, dot3, navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <VStack className="flex-1 items-center justify-center" space="xl">
        <Animated.View
          className="items-center justify-center rounded-pill bg-primary"
          style={{ width: 120, height: 120, transform: [{ scale: pulseAnim }] }}
        >
          <Icon name="bluetooth-outline" size={48} className="text-primary-foreground" />
        </Animated.View>

        <VStack space="xs" className="items-center">
          <Heading size="lg">Emparejando...</Heading>
          <Text muted size="sm">Buscando dispositivos cercanos...</Text>
        </VStack>

        <HStack space="md">
          <Animated.View className="w-3 h-3 rounded-pill bg-primary" style={{ opacity: dot1 }} />
          <Animated.View className="w-3 h-3 rounded-pill bg-primary" style={{ opacity: dot2 }} />
          <Animated.View className="w-3 h-3 rounded-pill bg-primary" style={{ opacity: dot3 }} />
        </HStack>
      </VStack>
    </SafeAreaView>
  );
}
