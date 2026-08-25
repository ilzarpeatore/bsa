import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const AVATAR_STORAGE_KEY = "@befit_onboarding_avatar_icon";

const PRESET_AVATARS = [
  { id: "1", icon: "person" as const },
  { id: "2", icon: "body" as const },
  { id: "3", icon: "fitness" as const },
  { id: "4", icon: "walk" as const },
  { id: "5", icon: "bicycle" as const },
  { id: "6", icon: "barbell" as const },
];

export default function AvatarSetupScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AVATAR_STORAGE_KEY).then((v) => {
      if (v) setSelectedAvatar(v);
    });
  }, []);

  const selectAvatar = (id: string) => {
    setSelectedAvatar(id);
    AsyncStorage.setItem(AVATAR_STORAGE_KEY, id).catch(() => {});
  };

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <Text style={[localStyles.title, { color: C.textPrimary }]}>Elige tu avatar</Text>

        <View style={localStyles.profileSection}>
          <View style={[localStyles.profileCircle, { backgroundColor: C.primary + "20", borderColor: C.primary }]}>
            <Ionicons
              name={(PRESET_AVATARS.find((a) => a.id === selectedAvatar)?.icon ?? "person") as any}
              size={48}
              color={C.textPrimary}
            />
          </View>
        </View>

        <Text style={[localStyles.sectionLabel, { color: C.gray }]}>Selecciona un avatar</Text>

        <View style={localStyles.avatarGrid}>
          {PRESET_AVATARS.map((avatar) => (
            <Pressable
              key={avatar.id}
              style={({ pressed }) => [
                localStyles.avatarOption,
                { backgroundColor: C.surface, borderColor: selectedAvatar === avatar.id ? C.primary : C.border },
                selectedAvatar === avatar.id && { borderColor: C.primary, backgroundColor: C.primary + "10" },
                pressed && { opacity: 0.2 },
              ]}
              onPress={() => selectAvatar(avatar.id)}
            >
              <Ionicons name={avatar.icon as any} size={32} color={selectedAvatar === avatar.id ? C.primary : C.gray} />
              {selectedAvatar === avatar.id && (
                <View style={[localStyles.checkBadge, { backgroundColor: C.primary }]}>
                  <Ionicons name="checkmark" size={12} color={C.white} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={localStyles.bottomBar}>
        <Pressable
          style={({ pressed }) => [localStyles.skipBtn, pressed && { opacity: 0.2 }]}
          onPress={() => navigation.navigate("MigratedPrivacyPolicyOnboard")}
        >
          <Text style={[localStyles.skipBtnText, { color: C.gray }]}>Omitir</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            localStyles.continueBtn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.2 },
          ]}
          onPress={() => navigation.navigate("MigratedPrivacyPolicyOnboard")}
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
  scrollContent: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 24, lineHeight: 29, fontFamily: FONT.bold, marginBottom: 24, textAlign: "center" },
  profileSection: { alignItems: "center", marginBottom: 30 },
  profileCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", borderWidth: 3, marginBottom: 12 },
  uploadBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  uploadBtnText: { fontSize: 14, fontFamily: FONT.semiBold },
  sectionLabel: { fontSize: 13, marginBottom: 12, textAlign: "center" },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  avatarOption: { width: 80, height: 80, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  checkBadge: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 20, paddingBottom: 30, backgroundColor: C.surface, gap: 12 },
  skipBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: C.border },
  skipBtnText: { fontSize: 16, fontFamily: FONT.semiBold },
  continueBtn: { flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  continueBtnText: { fontSize: 16, fontFamily: FONT.bold },
  });
}
