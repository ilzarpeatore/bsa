import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const METRICS = [
  { label: "Active Minutes", value: "45", icon: "timer-outline" },
  { label: "Distance", value: "3.2 km", icon: "navigate-outline" },
  { label: "Duration", value: "1h 15m", icon: "hourglass-outline" },
];

export default function StepsDetailsScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepCount}>4,523</Text>
        <Text style={styles.stepLabel}>pasos</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Moderate</Text>
        </View>

        <Text style={styles.dateTime}>
          Hoy, {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </Text>

        <View style={styles.insightCard}>
          <Ionicons name="bulb-outline" size={20} color="#FFC107" />
          <Text style={styles.insightText}>
            Has alcanzado el 45% de tu meta diaria. Â¡Sigue caminando para llegar
            a tu objetivo!
          </Text>
        </View>

        <Text style={styles.metricsTitle}>Key Metrics</Text>
        {METRICS.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Ionicons name={metric.icon as any} size={22} color={C.textPrimary} />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.insightButton, pressed && { opacity: 0.2 }]}
          onPress={() => navigation.navigate("MigratedStepsInsight")}
        >
          <Text style={styles.insightButtonText}>Ver insight</Text>
        </Pressable>
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
    alignItems: "center",
  },
  stepCount: {
    fontSize: 56,
    lineHeight: 66,
    fontFamily: FONT.bold,
    color: C.text,
  },
  stepLabel: {
    fontSize: 16,
    fontFamily: FONT.medium,
    color: C.gray,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: "#FF9800",
  },
  dateTime: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.gray,
    marginBottom: 20,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 28,
    width: "100%",
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.text,
    lineHeight: 20,
  },
  metricsTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.text,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    width: "100%",
    marginBottom: 10,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.gray,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.text,
    marginTop: 2,
  },
  insightButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 20,
  },
  insightButtonText: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: C.white,
  },
  });
}
