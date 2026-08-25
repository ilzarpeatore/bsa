import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppColorMode } from "@helper/useAppColorMode";
import { FONT } from "../theme";

const METRICS = [
  { label: "Average", value: "72 bpm", icon: "analytics" },
  { label: "Peak", value: "145 bpm", icon: "trending-up" },
  { label: "Variability", value: "42ms", icon: "pulse" },
  { label: "Trend", value: "↑ 3%", icon: "swap-vertical" },
];

export default function HeartRateDetailsScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>

          <View style={styles.bpmCenter}>
            <Ionicons name="heart" size={32} color={C.destructive50} />
            <Text style={styles.bpmValue}>72</Text>
            <Text style={styles.bpmUnit}>BPM</Text>
            <Text style={styles.dateTime}>Today, 10:32 AM</Text>
          </View>

          <View style={styles.grid}>
            {METRICS.map((m) => (
              <View key={m.label} style={styles.gridCard}>
                <Ionicons name={m.icon as any} size={20} color={C.textPrimary} />
                <Text style={styles.gridLabel}>{m.label}</Text>
                <Text style={styles.gridValue}>{m.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.2 }]}
              onPress={() => navigation.navigate("MigratedHeartRateInsight")}
            >
              <Ionicons name="eye" size={18} color={C.white} />
              <Text style={styles.btnPrimaryText}>Ver insight</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.2 }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color={C.textPrimary} />
              <Text style={styles.btnSecondaryText}>Consultar AI Coach</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: 20, paddingBottom: 40 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    bpmCenter: { alignItems: "center", marginBottom: 32 },
    bpmValue: {
      fontSize: 72,
      lineHeight: 86,
      fontFamily: FONT.extraBold,
      color: C.white,
      marginTop: 8,
    },
    bpmUnit: { fontSize: 16, fontFamily: FONT.medium, color: C.gray50, marginTop: -4 },
    dateTime: { fontSize: 14, fontFamily: FONT.regular, color: C.gray50, marginTop: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
    gridCard: {
      width: "47%",
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      gap: 8,
    },
    gridLabel: { fontSize: 13, fontFamily: FONT.regular, color: C.gray50 },
    gridValue: { fontSize: 18, fontFamily: FONT.bold, color: C.white },
    buttons: { gap: 12 },
    btnPrimary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.brand50,
      borderRadius: 14,
      paddingVertical: 16,
    },
    btnPrimaryText: { fontSize: 15, fontFamily: FONT.semiBold, color: C.white },
    btnSecondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.brand10,
      borderRadius: 14,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: C.brand50,
    },
    btnSecondaryText: { fontSize: 15, fontFamily: FONT.semiBold, color: C.textPrimary },
  });
}
