import React, { useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { FONT } from "./theme";
import { useAppColorMode } from "@helper/useAppColorMode";

import { useAuth } from "../../store/AuthContext";

const { width: SCREEN_W } = Dimensions.get("window");

const PAGES = [
  { icon: "hand-right-outline" as const, title: "Bienvenido", subtitle: "Tu plataforma de fitness inteligente con IA avanzada." },
  { icon: "speedometer-outline" as const, title: "Fitness Score", subtitle: "Un puntaje Ãºnico que mide tu nivel de condiciÃ³n fÃ­sica." },
  { icon: "flash-outline" as const, title: "Recomendaciones de Actividad", subtitle: "Actividades personalizadas segÃºn tu nivel y objetivos." },
  { icon: "stats-chart-outline" as const, title: "MÃ©tricas de Fitness", subtitle: "Peso, presiÃ³n arterial, frecuencia cardÃ­aca y mÃ¡s." },
  { icon: "sparkles" as const, title: "Coach con IA", subtitle: "Un entrenador personal impulsado por inteligencia artificial." },
  { icon: "people-outline" as const, title: "Encuentra un Coach", subtitle: "Conecta con entrenadores certificados." },
  { icon: "barbell-outline" as const, title: "Biblioteca de Entrenamientos", subtitle: "Cientos de rutinas para todos los niveles." },
  { icon: "nutrition-outline" as const, title: "NutriciÃ³n", subtitle: "Plan alimenticio personalizado y seguimiento de macros." },
  { icon: "moon-outline" as const, title: "Seguimiento del SueÃ±o", subtitle: "Monitorea tus ciclos de sueÃ±o y descansa mejor." },
  { icon: "chatbubbles-outline" as const, title: "Comunidad", subtitle: "Conecta, comparte y entrena con otros usuarios." },
  { icon: "trophy-outline" as const, title: "Logros", subtitle: "Desbloquea insignias y mantÃ©n tu racha activa." },
];

export default function OnboardingScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useStyle(C);
  const { completeOnboarding } = useAuth();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = page === PAGES.length - 1;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= PAGES.length) return;
    setPage(idx);
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.skipRow}>
          {!isLast && (
            <Pressable onPress={() => completeOnboarding()} style={({ pressed }) => pressed && { opacity: 0.2 }}>
              <Text style={styles.skipText}>Saltar</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
        >
          {PAGES.map((p) => (
            <View key={p.title} style={styles.page}>
              <View style={styles.iconCircle}>
                <Ionicons name={p.icon} size={48} color={C.textPrimary} />
              </View>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.subtitle}>{p.subtitle}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {PAGES.map((p, i) => (
            <View
              key={p.title}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          {page > 0 && (
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
              onPress={() => goTo(page - 1)}
            >
              <Ionicons name="arrow-back" size={20} color={C.white} />
              <Text style={styles.backText}>AtrÃ¡s</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          {isLast ? (
            <Pressable
              style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.2 }]}
              onPress={() => completeOnboarding()}
            >
              <Text style={styles.startText}>Empezar</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.2 }]}
              onPress={() => goTo(page + 1)}
            >
              <Text style={styles.nextText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={20} color={C.textPrimary} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function useStyle(C: ReturnType<typeof useAppColorMode>['colors']) {
  return useResponsiveStyleSheet({
    root: { flex: 1, backgroundColor: C.bg },
    skipRow: { alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 8, minHeight: 40 },
    skipText: { fontSize: 14, fontFamily: FONT.semiBold, color: C.gray50 },
    page: { width: SCREEN_W, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: C.brand10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 32,
    },
    title: { fontSize: 24, lineHeight: 29, fontFamily: FONT.bold, color: C.white, textAlign: "center", marginBottom: 12 },
    subtitle: { fontSize: 15, fontFamily: FONT.regular, color: C.gray50, textAlign: "center", lineHeight: 22 },
    dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 16 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gray30, marginHorizontal: 4 },
    dotActive: { width: 20, backgroundColor: C.brand50 },
    footer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 24 },
    backBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 },
    backText: { fontSize: 14, fontFamily: FONT.semiBold, color: C.white, marginLeft: 8 },
    nextBtn: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, borderWidth: 1, borderColor: C.border },
    nextText: { fontSize: 15, fontFamily: FONT.semiBold, color: C.textPrimary, marginRight: 8 },
    startBtn: { backgroundColor: C.brand50, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
    startText: { fontSize: 16, fontFamily: FONT.bold, color: C.white },
  });
}
