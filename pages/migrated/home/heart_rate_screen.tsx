import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppColorMode } from "@helper/useAppColorMode";
import { FONT } from "../theme";

const PERIODS = ["1d", "1w", "1m", "1y"];

const RECENT = [
  { time: "10:32 AM", bpm: 72, status: "normal" },
  { time: "09:15 AM", bpm: 68, status: "normal" },
  { time: "07:45 AM", bpm: 62, status: "normal" },
  { time: "Yesterday 8:20 PM", bpm: 85, status: "high" },
  { time: "Yesterday 6:10 PM", bpm: 72, status: "normal" },
];

const CHART_DATA = [65, 70, 72, 68, 75, 72, 70, 68, 74, 72, 76, 72, 70, 68];
const MAX_CHART = Math.max(...CHART_DATA);

export default function HeartRateScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [period, setPeriod] = useState("1d");

  const statusColor = (s: string) => {
    if (s === "high") return C.warning40;
    if (s === "low") return C.blue50;
    return C.success50;
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </Pressable>
            <Text style={styles.headerTitle}>Heart Rate</Text>
          </View>

          <View style={styles.bpmCard}>
            <Ionicons name="heart" size={28} color={C.destructive50} />
            <Text style={styles.bpmValue}>72</Text>
            <Text style={styles.bpmUnit}>BPM</Text>
          </View>

          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <Pressable
                key={p}
                style={({ pressed }) => [
                  styles.periodBtn,
                  period === p && styles.periodBtnActive,
                  pressed && { opacity: 0.2 },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.chartRow}>
              {CHART_DATA.map((val, i) => (
                <View key={i} style={styles.chartCol}>
                  <View style={styles.chartBarWrapper}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: (val / MAX_CHART) * 100, backgroundColor: C.destructive50 },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.alertCard, pressed && { opacity: 0.2 }]}>
            <Ionicons name="warning" size={20} color={C.warning40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Abnormality Detected</Text>
              <Text style={styles.alertText}>Elevated heart rate on Jun 23 during rest</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.gray50} />
          </Pressable>

          <View style={styles.highlightsRow}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Best</Text>
              <Text style={styles.highlightValue}>62 bpm</Text>
            </View>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Peak</Text>
              <Text style={styles.highlightValue}>145 bpm</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Readings</Text>
          {RECENT.map((r) => (
            <Pressable
              key={r.time}
              style={({ pressed }) => [styles.entry, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.navigate("MigratedHeartRateDetails")}
            >
              <View style={styles.entryLeft}>
                <View style={[styles.dot, { backgroundColor: statusColor(r.status) }]} />
                <Text style={styles.entryTime}>{r.time}</Text>
              </View>
              <Text style={styles.entryBpm}>{r.bpm} bpm</Text>
            </Pressable>
          ))}

          <View style={styles.deviceInfo}>
            <Ionicons name="watch" size={20} color={C.textPrimary} />
            <View>
              <Text style={styles.deviceName}>Apple Watch Series 8</Text>
              <Text style={styles.deviceStatus}>Connected</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recCard}>
            <Text style={styles.recText}>Maintain consistent cardio for optimal heart health</Text>
          </View>
          <View style={styles.recCard}>
            <Text style={styles.recText}>Monitor resting heart rate daily for trend analysis</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.navigate("MigratedHeartRateZones")}
            >
              <Ionicons name="color-filter" size={18} color={C.textPrimary} />
              <Text style={styles.actionBtnText}>Zones</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.navigate("MigratedHeartRateInsight")}
            >
              <Ionicons name="eye" size={18} color={C.textPrimary} />
              <Text style={styles.actionBtnText}>Insight</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.navigate("MigratedHeartRateHistory")}
            >
              <Ionicons name="time" size={18} color={C.textPrimary} />
              <Text style={styles.actionBtnText}>History</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: 20, paddingBottom: 40 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 22, lineHeight: 26, fontFamily: FONT.bold, color: C.white },
    bpmCard: {
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 28,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 20,
    },
    bpmValue: { fontSize: 64, lineHeight: 76, fontFamily: FONT.extraBold, color: C.white, marginTop: 8 },
    bpmUnit: { fontSize: 16, fontFamily: FONT.medium, color: C.gray50 },
    periodRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
    periodBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
    },
    periodBtnActive: { backgroundColor: C.brand50, borderColor: C.brand50 },
    periodText: { fontSize: 14, fontFamily: FONT.medium, color: C.gray50 },
    periodTextActive: { color: C.white },
    chartContainer: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 20,
    },
    chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 100 },
    chartCol: { alignItems: "center", flex: 1 },
    chartBarWrapper: { height: 80, justifyContent: "flex-end" },
    chartBar: { width: 14, borderRadius: 4 },
    alertCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.warning5,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: C.warning40,
      marginBottom: 20,
    },
    alertTitle: { fontSize: 14, fontFamily: FONT.semiBold, color: C.white },
    alertText: { fontSize: 12, fontFamily: FONT.regular, color: C.gray50, marginTop: 2 },
    highlightsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
    highlightCard: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    highlightLabel: { fontSize: 12, fontFamily: FONT.regular, color: C.gray50, marginBottom: 4 },
    highlightValue: { fontSize: 18, fontFamily: FONT.bold, color: C.white },
    sectionTitle: { fontSize: 18, fontFamily: FONT.semiBold, color: C.white, marginBottom: 12 },
    entry: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 8,
    },
    entryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    entryTime: { fontSize: 14, fontFamily: FONT.regular, color: C.gray50 },
    entryBpm: { fontSize: 16, fontFamily: FONT.bold, color: C.white },
    deviceInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginVertical: 20,
    },
    deviceName: { fontSize: 14, fontFamily: FONT.semiBold, color: C.white },
    deviceStatus: { fontSize: 12, fontFamily: FONT.regular, color: C.success50 },
    recCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 8,
    },
    recText: { fontSize: 14, fontFamily: FONT.regular, color: C.gray50 },
    actionRow: { flexDirection: "row", gap: 12, marginTop: 24 },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: C.brand10,
      borderRadius: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: C.brand50,
    },
    actionBtnText: { fontSize: 14, fontFamily: FONT.semiBold, color: C.textPrimary },
  });
}
