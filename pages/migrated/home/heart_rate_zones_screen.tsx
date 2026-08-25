import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppColorMode } from "@helper/useAppColorMode";
import { FONT } from "../theme";

function getZones(C: ReturnType<typeof useAppColorMode>['colors']) {
  return [
    {
      name: "Resting",
      range: "50-60%",
      bpm: "58-72 bpm",
      color: C.success50,
      gradient: [C.success60, C.success50],
      desc: "Light activity, recovery zone",
      details: [
        "Burns primarily fat for fuel",
        "Improves basic endurance",
        "Ideal for recovery sessions",
        "Can sustain for extended periods",
      ],
    },
    {
      name: "Fat Burn",
      range: "60-70%",
      bpm: "72-84 bpm",
      color: C.warning40,
      gradient: [C.warning50, C.warning40],
      desc: "Moderate intensity, optimal fat burning",
      details: [
        "Optimal zone for weight management",
        "Increases metabolic rate",
        "Improves cardiovascular fitness",
        "Moderate calorie burn per session",
      ],
    },
    {
      name: "Cardio",
      range: "70-80%",
      bpm: "84-96 bpm",
      color: C.orange,
      gradient: [C.orange, C.warning50],
      desc: "High intensity, improves cardio health",
      details: [
        "Strengthens heart and lungs",
        "IncreasesVO2 max",
        "Higher calorie burn",
        "Improve race performance",
      ],
    },
    {
      name: "Peak",
      range: "80-90%",
      bpm: "96-108 bpm",
      color: C.destructive50,
      gradient: [C.destructive60, C.destructive50],
      desc: "Maximum effort, anaerobic zone",
      details: [
        "Maximum power output",
        "Improves sprint performance",
        "Significant calorie burn",
        "Should be limited to short intervals",
      ],
    },
  ];
}

export default function HeartRateZoneScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const ZONES = useMemo(() => getZones(C), [C]);
  const [expanded, setExpanded] = useState<number | null>(null);

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
            <Text style={styles.headerTitle}>Heart Rate Zones</Text>
          </View>

          <View style={styles.gradientBarContainer}>
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              colors={[C.success50, C.warning40, C.orange, C.destructive50]}
              style={styles.gradientBar}
            />
            <View style={styles.gradientLabels}>
              <Text style={styles.gradientLabel}>50%</Text>
              <Text style={styles.gradientLabel}>90%</Text>
            </View>
          </View>

          {ZONES.map((zone, i) => (
            <Pressable
              key={zone.name}
              style={({ pressed }) => [styles.zoneCard, pressed && { opacity: 0.7 }]}
              onPress={() => setExpanded(expanded === i ? null : i)}
            >
              <View style={styles.zoneHeader}>
                <View style={[styles.zoneIndicator, { backgroundColor: zone.color }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneRange}>{zone.bpm}</Text>
                </View>
                <View style={[styles.zonePercent, { backgroundColor: zone.color + "20" }]}>
                  <Text style={[styles.zonePercentText, { color: zone.color }]}>{zone.range}</Text>
                </View>
                <Ionicons
                  name={expanded === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={C.gray50}
                />
              </View>

              <Text style={styles.zoneDesc}>{zone.desc}</Text>

              {expanded === i && (
                <View style={styles.zoneDetails}>
                  {zone.details.map((d, j) => (
                    <View key={j} style={styles.detailItem}>
                      <Ionicons name="checkmark-circle" size={16} color={zone.color} />
                      <Text style={styles.detailText}>{d}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
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
    gradientBarContainer: { marginBottom: 28 },
    gradientBar: { height: 12, borderRadius: 6 },
    gradientLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    gradientLabel: { fontSize: 12, fontFamily: FONT.regular, color: C.gray50 },
    zoneCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12,
    },
    zoneHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    zoneIndicator: { width: 8, height: 36, borderRadius: 4 },
    zoneInfo: { flex: 1 },
    zoneName: { fontSize: 16, fontFamily: FONT.semiBold, color: C.white },
    zoneRange: { fontSize: 13, fontFamily: FONT.regular, color: C.gray50, marginTop: 2 },
    zonePercent: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    zonePercentText: { fontSize: 12, fontFamily: FONT.semiBold },
    zoneDesc: { fontSize: 13, fontFamily: FONT.regular, color: C.gray50, marginTop: 10, marginLeft: 20 },
    zoneDetails: { marginTop: 12, marginLeft: 20, gap: 8 },
    detailItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    detailText: { fontSize: 13, fontFamily: FONT.regular, color: C.gray50 },
  });
}
