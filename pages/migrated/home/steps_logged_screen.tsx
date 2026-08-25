import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

export default function StepsLoggedScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const handleBack = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={60} color={C.white} />
        </View>

        <Text style={styles.title}>Â¡Pasos registrados!</Text>
        <Text style={styles.stepsText}>4,523 pasos guardados</Text>
        <Text style={styles.subtitle}>
          Registra tus pasos maÃ±ana tambiÃ©n
        </Text>

        <Pressable style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.2 }]} onPress={handleBack}>
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    lineHeight: 33,
    fontFamily: FONT.bold,
    color: C.text,
    marginBottom: 12,
  },
  stepsText: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.gray,
    marginBottom: 48,
    textAlign: "center",
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.white,
  },
  });
}
