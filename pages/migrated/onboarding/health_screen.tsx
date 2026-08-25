import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const SLEEP_DATA = [
  { day: "L", hours: 7 },
  { day: "M", hours: 6 },
  { day: "X", hours: 8 },
  { day: "J", hours: 5 },
  { day: "V", hours: 7 },
  { day: "S", hours: 9 },
  { day: "D", hours: 8 },
];

const TIPS = [
  { icon: "water" as const, title: "Hidrátate", desc: "Bebe al menos 2 litros de agua al día" },
  { icon: "moon" as const, title: "Duerme bien", desc: "Intenta dormir entre 7-9 horas cada noche" },
  { icon: "nutrition" as const, title: "Come balanceado", desc: "Incluye proteínas, carbohidratos y grasas saludables" },
];

const maxSleep = Math.max(...SLEEP_DATA.map((d) => d.hours));

export default function HealthScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <Text style={[localStyles.title, { color: C.textPrimary }]}>Tu salud</Text>

        <View style={localStyles.card}>
          <View style={localStyles.cardHeader}>
            <Ionicons name="heart" size={20} color="#E91E63" />
            <Text style={[localStyles.cardTitle, { color: C.white }]}>Presión arterial</Text>
          </View>
          <View style={localStyles.gaugeContainer}>
            <View style={localStyles.gauge}>
              <View style={[localStyles.gaugeFill, { backgroundColor: "#4CAF50" }]} />
              <View style={[localStyles.gaugeMid, { backgroundColor: "#FF9800" }]} />
              <View style={[localStyles.gaugeEnd, { backgroundColor: "#F44336" }]} />
            </View>
            <View style={[localStyles.gaugeIndicator, { left: "35%" }]} />
          </View>
          <View style={localStyles.gaugeLabels}>
            <Text style={[localStyles.gaugeLabel, { color: C.gray }]}>Baja</Text>
            <Text style={[localStyles.gaugeLabel, { color: "#4CAF50", fontFamily: FONT.bold }]}>Normal Range</Text>
            <Text style={[localStyles.gaugeLabel, { color: C.gray }]}>Alta</Text>
          </View>
        </View>

        <View style={localStyles.card}>
          <View style={localStyles.cardHeader}>
            <Ionicons name="bed-outline" size={20} color="#7C4DFF" />
            <Text style={[localStyles.cardTitle, { color: C.white }]}>Análisis del sueño</Text>
          </View>
          <View style={localStyles.chartContainer}>
            {SLEEP_DATA.map((item, idx) => (
              <View key={item.day} style={localStyles.barColumn}>
                <Text style={[localStyles.barHours, { color: C.white }]}>{item.hours}h</Text>
                <View style={localStyles.barTrack}>
                  <View style={[localStyles.barFill, { height: `${(item.hours / maxSleep) * 100}%`, backgroundColor: idx === 5 ? C.primary : C.primary + "60" }]} />
                </View>
                <Text style={[localStyles.barDay, { color: C.gray }]}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[localStyles.tipsTitle, { color: C.white }]}>Consejos de salud</Text>
        {TIPS.map((tip) => (
          <View key={tip.title} style={localStyles.tipCard}>
            <View style={[localStyles.tipIcon, { backgroundColor: C.primary + "15" }]}>
              <Ionicons name={tip.icon} size={24} color={C.textPrimary} />
            </View>
            <View style={localStyles.tipContent}>
              <Text style={[localStyles.tipTitle, { color: C.white }]}>{tip.title}</Text>
              <Text style={[localStyles.tipDesc, { color: C.gray }]}>{tip.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            localStyles.continueBtn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.2 },
          ]}
          onPress={() => navigation.navigate("MigratedArticles")}
        >
          <Text style={[localStyles.continueBtnText, { color: C.white }]}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 24, lineHeight: 29, fontFamily: FONT.bold, marginBottom: 20, textAlign: "center" },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontFamily: FONT.bold },
  gaugeContainer: { height: 24, marginBottom: 8, position: "relative" },
  gauge: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" },
  gaugeFill: { flex: 1 },
  gaugeMid: { flex: 1 },
  gaugeEnd: { flex: 1 },
  gaugeIndicator: { position: "absolute", top: 0, width: 4, height: 20, backgroundColor: C.surface, borderRadius: 2 },
  gaugeLabels: { flexDirection: "row", justifyContent: "space-between" },
  gaugeLabel: { fontSize: 11 },
  chartContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 140, paddingTop: 10 },
  barColumn: { alignItems: "center", flex: 1 },
  barHours: { fontSize: 10, marginBottom: 4 },
  barTrack: { width: 24, height: 100, backgroundColor: C.gray40, borderRadius: 12, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 12 },
  barDay: { fontSize: 11, marginTop: 4 },
  tipsTitle: { fontSize: 18, fontFamily: FONT.bold, marginBottom: 12 },
  tipCard: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, alignItems: "center" },
  tipIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontFamily: FONT.bold, marginBottom: 2 },
  tipDesc: { fontSize: 12 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: C.surface },
  continueBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  continueBtnText: { fontSize: 16, fontFamily: FONT.bold },
  });
}
