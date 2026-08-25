import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

export default function ProfileSetupIntroScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  return (
    <SafeAreaView style={localStyles.container}>
      <View style={localStyles.content}>
        <View style={[localStyles.iconContainer, { backgroundColor: C.primary + "15" }]}>
          <Ionicons name="shield-checkmark-outline" size={64} color={C.textPrimary} />
        </View>

        <Text style={[localStyles.title, { color: C.textPrimary }]}>Configura tu perfil</Text>
        <Text style={[localStyles.subtitle, { color: C.gray }]}>
          Tu informaciÃ³n es privada y segura. Nos ayuda a personalizar tu experiencia y crear planes de entrenamiento adaptados a ti.
        </Text>

        <View style={localStyles.featureList}>
          <View style={localStyles.featureRow}>
            <View style={[localStyles.featureIcon, { backgroundColor: C.primary + "15" }]}>
              <Ionicons name="lock-closed" size={20} color={C.textPrimary} />
            </View>
            <View style={localStyles.featureContent}>
              <Text style={[localStyles.featureTitle, { color: C.white }]}>Datos protegidos</Text>
              <Text style={[localStyles.featureDesc, { color: C.gray }]}>EncriptaciÃ³n de extremo a extremo</Text>
            </View>
          </View>
          <View style={localStyles.featureRow}>
            <View style={[localStyles.featureIcon, { backgroundColor: C.primary + "15" }]}>
              <Ionicons name="fitness" size={20} color={C.textPrimary} />
            </View>
            <View style={localStyles.featureContent}>
              <Text style={[localStyles.featureTitle, { color: C.white }]}>Experiencia personalizada</Text>
              <Text style={[localStyles.featureDesc, { color: C.gray }]}>Planes adaptados a tu perfil</Text>
            </View>
          </View>
          <View style={localStyles.featureRow}>
            <View style={[localStyles.featureIcon, { backgroundColor: C.primary + "15" }]}>
              <Ionicons name="time" size={20} color={C.textPrimary} />
            </View>
            <View style={localStyles.featureContent}>
              <Text style={[localStyles.featureTitle, { color: C.white }]}>Solo toma 2 minutos</Text>
              <Text style={[localStyles.featureDesc, { color: C.gray }]}>RÃ¡pido y sencillo de completar</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            localStyles.startBtn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.2 },
          ]}
          onPress={() => navigation.navigate("MigratedProfileSetupForm")}
        >
          <Text style={[localStyles.startBtnText, { color: C.white }]}>Comenzar</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [localStyles.helpLink, pressed && { opacity: 0.2 }]}>
          <Ionicons name="help-circle-outline" size={18} color={C.gray} />
          <Text style={[localStyles.helpText, { color: C.gray }]}>Â¿Necesitas ayuda?</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
    iconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", marginBottom: 24 },
    title: { fontSize: 28, lineHeight: 34, fontFamily: FONT.bold, marginBottom: 12, textAlign: "center" },
    subtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 32 },
    featureList: { width: "100%", gap: 16 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    featureIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
    featureContent: { flex: 1 },
    featureTitle: { fontSize: 14, fontFamily: FONT.bold, marginBottom: 2 },
    featureDesc: { fontSize: 12 },
    bottomBar: { padding: 20, paddingBottom: 30 },
    startBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
    startBtnText: { fontSize: 16, fontFamily: FONT.bold },
    helpLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8 },
    helpText: { fontSize: 14 },
  });
}
