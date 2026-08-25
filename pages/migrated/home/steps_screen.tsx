import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const PERIODS = ["1d", "1w", "1m", "1y", "All"];

const DAILY_DATA = [1200, 3400, 2100, 4523, 1800, 2900, 3200];

const RECENT_HISTORY = [
  { id: "1", time: "08:30", steps: 2500, intensity: "High" },
  { id: "2", time: "14:15", steps: 1200, intensity: "Moderate" },
  { id: "3", time: "19:00", steps: 823, intensity: "Low" },
];

const RECOMMENDATIONS = [
  "Aumenta tu tiempo de caminata en 10 minutos al dÃ­a",
  "Intenta alcanzar 8,000 pasos al menos 3 veces por semana",
  "Camina despuÃ©s de cada comida principal",
];

function getIntensityColor(intensity: string) {
  switch (intensity) {
    case "High":
      return "#F44336";
    case "Moderate":
      return "#FF9800";
    default:
      return "#4CAF50";
  }
}

export default function StepsScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [period, setPeriod] = useState("1d");
  const currentSteps = 4523;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepCount}>{currentSteps.toLocaleString()}</Text>
        <Text style={styles.stepLabel}>pasos hoy</Text>

        <View style={styles.periodTabs}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              style={({ pressed }) => [
                styles.periodTab,
                period === p && styles.periodTabActive,
                pressed && { opacity: 0.2 },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[styles.periodText, period === p && styles.periodTextActive]}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.barChart}>
            {DAILY_DATA.map((value, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(value / 5000) * 100}%`,
                        backgroundColor:
                          index === DAILY_DATA.length - 1
                            ? C.primary
                            : C.gray + "40",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {["L", "M", "X", "J", "V", "S", "D"][index]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Historial reciente</Text>
        {RECENT_HISTORY.map((entry) => (
          <Pressable
            key={entry.id}
            style={({ pressed }) => [styles.historyCard, pressed && { opacity: 0.2 }]}
            onPress={() => navigation.navigate("MigratedStepsDetails")}
          >
            <Text style={styles.historyTime}>{entry.time}</Text>
            <Text style={styles.historySteps}>{entry.steps.toLocaleString()}</Text>
            <View
              style={[
                styles.intensityBadge,
                { backgroundColor: getIntensityColor(entry.intensity) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.intensityText,
                  { color: getIntensityColor(entry.intensity) },
                ]}
              >
                {entry.intensity}
              </Text>
            </View>
          </Pressable>
        ))}

        <View style={styles.deviceCard}>
          <Ionicons name="watch-outline" size={20} color={C.textPrimary} />
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>Apple Watch</Text>
            <Text style={styles.deviceStatus}>Conectado</Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
        </View>

        <Pressable
          style={({ pressed }) => [styles.registerButton, pressed && { opacity: 0.2 }]}
          onPress={() => navigation.navigate("MigratedLogStepsForm")}
        >
          <Ionicons name="add-circle-outline" size={20} color={C.white} />
          <Text style={styles.registerButtonText}>Registrar pasos</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Recomendaciones</Text>
        {RECOMMENDATIONS.map((rec, i) => (
          <View key={i} style={styles.recCard}>
            <Ionicons name="bulb-outline" size={18} color="#FFC107" />
            <Text style={styles.recText}>{rec}</Text>
          </View>
        ))}
      </ScrollView>
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
    padding: 20,
  },
  stepCount: {
    fontSize: 56,
    lineHeight: 66,
    fontFamily: FONT.bold,
    color: C.text,
    textAlign: "center",
  },
  stepLabel: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: C.gray,
    textAlign: "center",
    marginBottom: 20,
  },
  periodTabs: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.card,
    alignItems: "center",
  },
  periodTabActive: {
    backgroundColor: C.primary,
  },
  periodText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.gray,
  },
  periodTextActive: {
    color: C.white,
  },
  chartContainer: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  barChart: {
    flexDirection: "row",
    height: 120,
    alignItems: "flex-end",
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: C.gray,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.text,
    marginBottom: 12,
    marginTop: 4,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  historyTime: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.gray,
    width: 48,
  },
  historySteps: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.text,
  },
  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontFamily: FONT.bold,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: C.text,
  },
  deviceStatus: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: C.gray,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 24,
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.white,
  },
  recCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    alignItems: "flex-start",
  },
  recText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.text,
    lineHeight: 20,
  },
  });
}
