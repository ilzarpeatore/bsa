import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@store/AuthContext";
import { Colors } from "@constants/colors";
import { showToast } from "@helper/toast";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showToast("Error", { description: "Introduce tu email y contraseña", variant: "error" });
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password, user_type: "user" });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Error al iniciar sesión";
      showToast("Error al iniciar sesión", { description: message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

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

          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

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
                placeholder="Introduce tu contraseña"
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

          <Pressable
            style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.2 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.btnText}>Iniciar sesión</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ForgotOptions")}
            style={({ pressed }) => [styles.forgotBtn, pressed && { opacity: 0.2 }]}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.2 }]}>
            <Ionicons name="logo-google" size={20} color={Colors.TEXT_PRIMARY} />
            <Text style={styles.googleBtnText}>Continuar con Google</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
            <Pressable
              onPress={() => navigation.navigate("RegisterFlow")}
              style={({ pressed }) => pressed && { opacity: 0.2 }}
            >
              <Text style={styles.footerLink}>Regístrate</Text>
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
  inputGroup: { marginBottom: 20 } as const,
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
    marginBottom: 16,
  } as const,
  btnDisabled: { opacity: 0.6 } as const,
  btnText: { fontFamily: "Gilroy-Bold" as const, fontSize: 17, color: "#000000" } as const,
  forgotBtn: { alignItems: "flex-end" as const, marginBottom: 24 } as const,
  // Texto de enlace: ACCENT_START/ACCENT_ACTIVE son ahora gris claro (E5E5EA),
  // ilegibles como color de TEXTO sobre fondo claro - se usa TEXT_PRIMARY
  // (#000000) en su lugar, el peso "Bold" ya distingue el enlace visualmente.
  forgotText: { fontFamily: "Gilroy-Medium" as const, fontSize: 14, color: Colors.TEXT_PRIMARY || "#000000" } as const,
  dividerRow: { flexDirection: "row" as const, alignItems: "center" as const, marginBottom: 24 } as const,
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.TEXT_MUTED || "#2A2844" } as const,
  dividerText: { fontFamily: "Gilroy-Medium" as const, fontSize: 13, color: Colors.TEXT_SECONDARY, marginHorizontal: 16 } as const,
  googleBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.BG_CARD || "#141227",
    borderRadius: 14,
    height: 54,
    borderWidth: 1,
    borderColor: Colors.TEXT_MUTED || "#2A2844",
    marginBottom: 32,
    gap: 10,
  } as const,
  googleBtnText: { fontFamily: "Gilroy-Medium" as const, fontSize: 15, color: Colors.TEXT_PRIMARY } as const,
  footer: { flexDirection: "row" as const, justifyContent: "center" as const, alignItems: "center" } as const,
  footerText: { fontFamily: "Gilroy-Regular" as const, fontSize: 15, color: Colors.TEXT_SECONDARY } as const,
  footerLink: { fontFamily: "Gilroy-Bold" as const, fontSize: 15, color: Colors.TEXT_PRIMARY || "#000000" } as const,
};
