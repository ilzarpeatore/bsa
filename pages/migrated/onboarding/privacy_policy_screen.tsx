import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const SECTIONS = [
  { title: "RecopilaciÃ³n de datos", text: "Recopilamos informaciÃ³n personal como nombre, edad, peso, altura y datos de salud para personalizar tu experiencia fitness. TambiÃ©n recopilamos datos de uso de la aplicaciÃ³n para mejorar nuestros servicios." },
  { title: "Uso de datos", text: "Utilizamos tus datos para crear planes de entrenamiento personalizados, dar recomendaciones nutricionales y mejorar la precisiÃ³n de nuestras herramientas de seguimiento de fitness." },
  { title: "Compartir datos", text: "No vendemos tus datos personales. Solo compartimos informaciÃ³n con entrenadores certificados cuando tÃº lo autorizas expresamente, y con proveedores de servicios que nos ayudan a operar la plataforma." },
  { title: "Seguridad", text: "Implementamos medidas de seguridad tÃ©cnicas y organizativas para proteger tus datos contra acceso no autorizado, alteraciÃ³n, divulgaciÃ³n o destrucciÃ³n. Utilizamos encriptaciÃ³n de extremo a extremo." },
  { title: "Tus derechos", text: "Tienes derecho a acceder, corregir, eliminar tus datos personales y a oponerte al procesamiento de los mismos. Puedes ejercer estos derechos contactando a nuestro equipo de privacidad." },
];

export default function PrivacyPolicyScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const canContinue = acceptedPrivacy && acceptedTerms;

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <View style={localStyles.headerIcon}>
          <Ionicons name="shield-checkmark" size={40} color={C.textPrimary} />
        </View>
        <Text style={[localStyles.title, { color: C.textPrimary }]}>PolÃ­tica de privacidad</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={localStyles.section}>
            <Text style={[localStyles.sectionTitle, { color: C.white }]}>{section.title}</Text>
            <Text style={[localStyles.sectionText, { color: C.gray }]}>{section.text}</Text>
          </View>
        ))}

        <View style={localStyles.checkboxes}>
          <Pressable
            style={({ pressed }) => [localStyles.checkRow, pressed && { opacity: 0.2 }]}
            onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
          >
            <View style={[localStyles.checkbox, { borderColor: acceptedPrivacy ? C.primary : C.border }, acceptedPrivacy && { backgroundColor: C.primary }]}>
              {acceptedPrivacy && <Ionicons name="checkmark" size={14} color={C.white} />}
            </View>
            <Text style={[localStyles.checkLabel, { color: C.white }]}>Acepto la polÃ­tica de privacidad</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [localStyles.checkRow, pressed && { opacity: 0.2 }]}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View style={[localStyles.checkbox, { borderColor: acceptedTerms ? C.primary : C.border }, acceptedTerms && { backgroundColor: C.primary }]}>
              {acceptedTerms && <Ionicons name="checkmark" size={14} color={C.white} />}
            </View>
            <Text style={[localStyles.checkLabel, { color: C.white }]}>Acepto los tÃ©rminos y condiciones</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            localStyles.continueBtn,
            { backgroundColor: canContinue ? C.primary : C.border },
            pressed && { opacity: 0.2 },
          ]}
          disabled={!canContinue}
          onPress={() => navigation.navigate("MigratedNotificationsOnboard")}
        >
          <Text style={[localStyles.continueBtnText, { color: canContinue ? C.white : C.textMuted }]}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: 20, paddingBottom: 100 },
    headerIcon: { alignSelf: "center", marginBottom: 12 },
    title: { fontSize: 22, fontFamily: FONT.bold, marginBottom: 20, textAlign: "center" },
    section: { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontFamily: FONT.bold, marginBottom: 6 },
    sectionText: { fontSize: 13, lineHeight: 20 },
    checkboxes: { marginTop: 8 },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: "center", alignItems: "center" },
    checkLabel: { fontSize: 14, flex: 1 },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: C.surface },
    continueBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
    continueBtnText: { fontSize: 16, fontFamily: FONT.bold },
  });
}
