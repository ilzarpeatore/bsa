import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@store/AuthContext";
import { Colors } from "@constants/colors";
import { authApi } from "../../api/auth";

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register: authRegister } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Código de invitación de cliente de entrenamiento personal (Niveles de
  // acceso, 2026-07-30) — opcional. Quien se registre con un código válido
  // queda is_personal_client=true automáticamente (lo decide el backend).
  const [inviteCode, setInviteCode] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  const checkInvite = useCallback(async (code: string) => {
    if (!code.trim()) {
      setInviteStatus("idle");
      return;
    }
    setInviteStatus("checking");
    try {
      const res = await authApi.checkInviteCode(code.trim());
      setInviteStatus(res.data?.data?.valid ? "valid" : "invalid");
    } catch {
      setInviteStatus("invalid");
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => checkInvite(inviteCode), 500);
    return () => clearTimeout(timeout);
  }, [inviteCode, checkInvite]);

  const handleRegister = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Introduce tu nombre");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Introduce tu email");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const parts = name.trim().split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || parts[0];

      await authRegister({
        username: name.trim(),
        email: email.trim(),
        password,
        first_name: firstName,
        last_name: lastName,
        user_type: "user",
        status: "active",
        gender: "other",
        invite_code: inviteStatus === "valid" ? inviteCode.trim() : undefined,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.username?.[0] ||
        err?.message ||
        "No se pudo completar el registro";
      Alert.alert("Error en el registro", message);
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirmPassword, authRegister, inviteCode, inviteStatus]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.TEXT_PRIMARY} />
          </Pressable>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Regístrate para empezar</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={Colors.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Introduce tu nombre"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={Colors.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Introduce tu email"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.2 }]}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.TEXT_SECONDARY}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite la contraseña"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código de invitación (opcional)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key-outline" size={20} color={Colors.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. ABCD-1234"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {inviteStatus === "checking" && <ActivityIndicator size="small" color={Colors.TEXT_SECONDARY} style={styles.eyeBtn} />}
            </View>
            {inviteStatus === "valid" && (
              <Text style={[styles.inviteHint, { color: Colors.SUCCESS }]}>
                ✓ Código válido — tendrás acceso completo como cliente de entrenamiento personal.
              </Text>
            )}
            {inviteStatus === "invalid" && (
              <Text style={[styles.inviteHint, { color: Colors.DANGER }]}>
                Este código no es válido o ya fue usado.
              </Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.2 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.btnText}>Crear cuenta</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
            <Pressable
              onPress={() => navigation.navigate("LoginAuth")}
              style={({ pressed }) => pressed && { opacity: 0.2 }}
            >
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: Colors.BG_PRIMARY } as const,
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 } as const,
  backBtn: { width: 40, height: 40, justifyContent: "center" as const, marginBottom: 16 } as const,
  title: { fontFamily: "Gilroy-ExtraBold" as const, fontSize: 30, color: Colors.TEXT_PRIMARY, marginBottom: 6 } as const,
  subtitle: { fontFamily: "Gilroy-Regular" as const, fontSize: 16, color: Colors.TEXT_SECONDARY, marginBottom: 32 } as const,
  inputGroup: { marginBottom: 18 } as const,
  inviteHint: { fontFamily: "Gilroy-Regular" as const, fontSize: 13, marginTop: 6 } as const,
  label: { fontFamily: "Gilroy-Medium" as const, fontSize: 14, color: Colors.TEXT_SECONDARY, marginBottom: 8 } as const,
  inputWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.BG_CARD || "#141227",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.TEXT_MUTED || "#2A2844",
  } as const,
  inputIcon: { marginLeft: 14 } as const,
  input: { flex: 1, height: 52, paddingHorizontal: 12, fontFamily: "Gilroy-Regular" as const, fontSize: 16, color: Colors.TEXT_PRIMARY } as const,
  eyeBtn: { paddingHorizontal: 14 } as const,
  btn: {
    backgroundColor: Colors.ACCENT_START || "#E5E5EA",
    borderRadius: 14,
    height: 54,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginTop: 8,
    marginBottom: 24,
  } as const,
  btnDisabled: { opacity: 0.6 } as const,
  btnText: { fontFamily: "Gilroy-Bold" as const, fontSize: 17, color: "#000000" } as const,
  footer: { flexDirection: "row" as const, justifyContent: "center" as const, alignItems: "center" } as const,
  footerText: { fontFamily: "Gilroy-Regular" as const, fontSize: 15, color: Colors.TEXT_SECONDARY } as const,
  // Texto de enlace: ACCENT_START/ACCENT_ACTIVE son ahora beige claro,
  // ilegibles como color de texto sobre fondo claro - se usa TEXT_PRIMARY.
  footerLink: { fontFamily: "Gilroy-Bold" as const, fontSize: 15, color: Colors.TEXT_PRIMARY || "#000000" } as const,
};
