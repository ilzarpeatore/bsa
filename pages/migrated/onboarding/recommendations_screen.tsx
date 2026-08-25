import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";
import { useAuth } from "@store/AuthContext";

const ACTIVITIES = [
  { id: "1", icon: "walk-outline" as const, name: "Jogging", duration: "30 min", calories: "250 kcal" },
  { id: "2", icon: "water-outline" as const, name: "Swimming", duration: "45 min", calories: "400 kcal" },
  { id: "3", icon: "bicycle-outline" as const, name: "Cycling", duration: "40 min", calories: "350 kcal" },
];

const MUSCLE_ZONES = [
  { label: "Pecho", top: "22%", left: "35%" },
  { label: "Brazos", top: "30%", left: "12%" },
  { label: "Piernas", top: "58%", left: "30%" },
  { label: "Core", top: "38%", left: "38%" },
] as const;

export default function RecommendationsScreen({ navigation }: any) {
  const { state } = useAuth();
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  const isPersonalClient = !!state.user?.is_personal_client;

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <Text style={[localStyles.title, { color: C.textPrimary }]}>Tus recomendaciones</Text>

        <Text style={[localStyles.sectionTitle, { color: C.white }]}>Ideas para empezar (generales)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.activitiesScroll}>
          {ACTIVITIES.map((act) => (
            <View key={act.id} style={localStyles.activityCard}>
              <View style={[localStyles.activityIcon, { backgroundColor: C.primary + "15" }]}>
                <Ionicons name={act.icon} size={28} color={C.textPrimary} />
              </View>
              <Text style={[localStyles.activityName, { color: C.white }]}>{act.name}</Text>
              <Text style={[localStyles.activityDetail, { color: C.gray }]}>{act.duration}</Text>
              <Text style={[localStyles.activityCal, { color: C.textPrimary }]}>{act.calories}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={[localStyles.sectionTitle, { color: C.white, marginTop: 20 }]}>Macronutrientes</Text>
        <View style={localStyles.card}>
          <Text style={[localStyles.planText, { color: C.gray }]}>
            Calcularemos tus macros exactos (proteína, carbohidratos y grasas) en cuanto tengamos tu peso, altura y objetivo — los verás en tu Plan de Nutrición.
          </Text>
        </View>

        {isPersonalClient && (
          <>
            <Text style={[localStyles.sectionTitle, { color: C.white }]}>Tu entrenamiento</Text>
            <View style={localStyles.card}>
              <Text style={[localStyles.planText, { color: C.white }]}>
                Como cliente de entrenamiento personal, tu coach revisará tu perfil y te asignará tu plan real desde el panel — lo verás en "Mi Programa" en cuanto esté listo.
              </Text>
            </View>
          </>
        )}

        {!isPersonalClient && (
          <>
            <Text style={[localStyles.sectionTitle, { color: C.white }]}>Plan de entrenamiento</Text>
            <View style={localStyles.card}>
              <View style={localStyles.planRow}>
                <Ionicons name="calendar-outline" size={20} color={C.textPrimary} />
                <Text style={[localStyles.planText, { color: C.white }]}>4 sesiones por semana</Text>
              </View>
              <View style={localStyles.planRow}>
                <Ionicons name="time-outline" size={20} color={C.textPrimary} />
                <Text style={[localStyles.planText, { color: C.white }]}>60 min por sesión</Text>
              </View>
              <View style={localStyles.planRow}>
                <Ionicons name="trending-up-outline" size={20} color={C.textPrimary} />
                <Text style={[localStyles.planText, { color: C.white }]}>Progresión semanal</Text>
              </View>
              <Text style={[localStyles.activityDetail, { color: C.gray, marginTop: 8 }]}>
                Sugerencia general de referencia — explora Workouts y Programas para elegir el tuyo.
              </Text>
            </View>
          </>
        )}

        <Text style={[localStyles.sectionTitle, { color: C.white }]}>Zonas musculares objetivo</Text>
        <View style={localStyles.bodyDiagram}>
          <View style={localStyles.bodyOutline}>
            <Ionicons name="body-outline" size={180} color={C.primary + "40"} />
            {MUSCLE_ZONES.map((zone) => (
              <View key={zone.label} style={[localStyles.muscleZone, { top: zone.top, left: zone.left }]}>
                <View style={[localStyles.muscleDot, { backgroundColor: C.primary }]} />
                <Text style={[localStyles.muscleLabel, { color: C.textPrimary }]}>{zone.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            localStyles.continueBtn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.2 },
          ]}
          onPress={() => navigation.navigate("MigratedHealth")}
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
    sectionTitle: { fontSize: 16, fontFamily: FONT.bold, marginBottom: 12 },
    activitiesScroll: { marginBottom: 8 },
    activityCard: { width: 150, backgroundColor: C.surface, borderRadius: 14, padding: 14, marginRight: 12, alignItems: "center" },
    activityIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center", marginBottom: 8 },
    activityName: { fontSize: 14, fontFamily: FONT.bold, marginBottom: 2 },
    activityDetail: { fontSize: 12, marginBottom: 4 },
    activityCal: { fontSize: 13, fontFamily: FONT.semiBold },
    card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16 },
    macroRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    macroLabel: { width: 90, fontSize: 13 },
    macroTrack: { flex: 1, height: 10, backgroundColor: C.gray40, borderRadius: 5, marginHorizontal: 10, overflow: "hidden" },
    macroFill: { height: 10, borderRadius: 5 },
    macroValue: { width: 35, fontSize: 13, fontFamily: FONT.bold, textAlign: "right" },
    coachCard: { flexDirection: "row", alignItems: "center" },
    coachAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginRight: 14 },
    coachInfo: { flex: 1 },
    coachName: { fontSize: 15, fontFamily: FONT.bold, marginBottom: 2 },
    coachSpec: { fontSize: 12, marginBottom: 4 },
    coachRating: { flexDirection: "row", alignItems: "center", gap: 4 },
    coachRatingText: { fontSize: 13, fontFamily: FONT.semiBold },
    planRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    planText: { fontSize: 14 },
    bodyDiagram: { backgroundColor: C.surface, borderRadius: 14, padding: 20, alignItems: "center", marginBottom: 16 },
    bodyOutline: { width: 200, height: 250, position: "relative", justifyContent: "center", alignItems: "center" },
    muscleZone: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 4 },
    muscleDot: { width: 8, height: 8, borderRadius: 4 },
    muscleLabel: { fontSize: 11, fontFamily: FONT.bold },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: C.surface },
    continueBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
    continueBtnText: { fontSize: 16, fontFamily: FONT.bold },
  });
}
