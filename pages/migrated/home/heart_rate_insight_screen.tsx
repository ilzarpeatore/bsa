import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppColorMode } from "@helper/useAppColorMode";
import { FONT } from "../theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TREND = [65, 70, 72, 68, 75, 72, 70];
const MAX_TREND = Math.max(...TREND);

const OVERVIEW = [
  { label: "Peak", value: "145", icon: "trending-up" },
  { label: "Resting", value: "58", icon: "bed" },
  { label: "HRV", value: "42ms", icon: "pulse" },
  { label: "Average", value: "72", icon: "analytics" },
];

const ALERTS = [
  { text: "Elevated heart rate detected during rest on Jun 23", time: "2 days ago" },
];

const RECOMMENDATIONS = [
  "Aim for 30 minutes of moderate cardio daily",
  "Practice deep breathing exercises for HRV",
  "Monitor resting heart rate each morning",
  "Stay hydrated to support cardiovascular health",
];

export default function HeartRateInsightScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView>
          <LinearGradient colors={[C.gray60, C.bg]} style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Ionicons name="heart" size={24} color={C.destructive50} />
            <Text style={styles.headerTitle}>Heart Rate Insight</Text>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.overviewRow}>
              {OVERVIEW.map((item) => (
                <View key={item.label} style={styles.overviewCard}>
                  <Ionicons name={item.icon as any} size={18} color={C.textPrimary} />
                  <Text style={styles.overviewValue}>{item.value}</Text>
                  <Text style={styles.overviewLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.scoreSection}>
              <Text style={styles.sectionTitle}>Current Status</Text>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>85</Text>
                <Text style={styles.scoreOf}>/100</Text>
              </View>
            </View>

            {ALERTS.length > 0 && (
              <View style={styles.alertSection}>
                <Text style={styles.sectionTitle}>Irregular Heartbeat Alerts</Text>
                {ALERTS.map((a, i) => (
                  <View key={i} style={styles.alertCard}>
                    <Ionicons name="warning" size={20} color={C.warning40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertText}>{a.text}</Text>
                      <Text style={styles.alertTime}>{a.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Daily Trend</Text>
              <View style={styles.chartRow}>
                {DAYS.map((day, i) => (
                  <View key={day} style={styles.chartCol}>
                    <View style={styles.chartBarWrapper}>
                      <View
                        style={[
                          styles.chartBar,
                          { height: (TREND[i] / MAX_TREND) * 100, backgroundColor: C.destructive50 },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartDay}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.recSection}>
              <Text style={styles.sectionTitle}>Health Recommendations</Text>
              {RECOMMENDATIONS.map((rec, i) => (
                <View key={i} style={styles.recItem}>
                  <Ionicons name="checkmark-circle" size={20} color={C.success50} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 22, lineHeight: 26, fontFamily: FONT.bold, color: '#FFFFFF' },
    content: { padding: 20, paddingBottom: 40 },
    overviewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
    overviewCard: {
      width: "47%",
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      gap: 6,
    },
    overviewValue: { fontSize: 22, lineHeight: 26, fontFamily: FONT.bold, color: C.white },
    overviewLabel: { fontSize: 12, fontFamily: FONT.regular, color: C.gray50 },
    scoreSection: { alignItems: "center", marginBottom: 28 },
    sectionTitle: { fontSize: 18, fontFamily: FONT.semiBold, color: C.white, marginBottom: 16 },
    scoreCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 8,
      borderColor: C.brand50,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    scoreValue: { fontSize: 36, lineHeight: 42, fontFamily: FONT.bold, color: C.white },
    scoreOf: { fontSize: 14, fontFamily: FONT.regular, color: C.gray50 },
    alertSection: { marginBottom: 28 },
    alertCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.warning5,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.warning40,
      marginBottom: 8,
    },
    alertText: { fontSize: 14, fontFamily: FONT.regular, color: C.white },
    alertTime: { fontSize: 12, fontFamily: FONT.regular, color: C.gray50, marginTop: 4 },
    chartSection: { marginBottom: 28 },
    chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120 },
    chartCol: { alignItems: "center", flex: 1 },
    chartBarWrapper: { height: 100, justifyContent: "flex-end" },
    chartBar: { width: 20, borderRadius: 6 },
    chartDay: { fontSize: 11, fontFamily: FONT.regular, color: C.gray50, marginTop: 6 },
    recSection: { marginBottom: 32 },
    recItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    recText: { fontSize: 14, fontFamily: FONT.regular, color: C.gray50, flex: 1 },
  });
}
