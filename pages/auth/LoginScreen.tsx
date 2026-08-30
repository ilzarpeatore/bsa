import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@store/AuthContext";
import { Colors } from "@constants/colors";
import { showToast } from "@helper/toast";
import GlassButton from "@components/GlassButton";
import { C } from "../migrated/theme";

// Mismo fondo que WelcomeAuthScreen.tsx (pedido explícito 2026-08-29) --
// aquí con una capa de oscurecido MÁS fuerte en todos los puntos del
// degradado (0.55→0.68→0.88 frente a 0.15→0.4→0.82 en Welcome): esta
// pantalla tiene texto/inputs en toda la superficie, no solo arriba y
// abajo, así que necesita más contraste de fondo de principio a fin.
// Textos que flotan directamente sobre la foto (título, subtítulo, flecha
// atrás, "¿Olvidaste tu contraseña?", footer) pasan a blanco fijo -- ya NO
// `Colors.TEXT_PRIMARY/SECONDARY` (paleta pensada para fondo claro,
// siempre oscura, mismo problema ya corregido en WelcomeAuthScreen.tsx).
// Los inputs SÍ siguen usando `Colors` -- son tarjetas blancas opacas
// propias, no dependen del fondo.
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
    <View style={styles.bg}>
      <ExpoImage
        source={require("../../assets/welcome-auth-bg.webp")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.68)", "rgba(0,0,0,0.88)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

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
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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

          <GlassButton
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            style={styles.btn}
          />

          <Pressable
            onPress={() => navigation.navigate("ForgotOptions")}
            style={({ pressed }) => [styles.forgotBtn, pressed && { opacity: 0.2 }]}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
            <Pressable
              // Pedido explícito 2026-08-29: sin screen de registro aparte,
              // el onboarding ES el registro -- ver mismo cambio en
              // WelcomeAuthScreen.tsx.
              onPress={() => navigation.navigate("MigratedOnboardingV2")}
              style={({ pressed }) => pressed && { opacity: 0.2 }}
            >
              <Text style={styles.footerLink}>Regístrate</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="light" />
      </SafeAreaView>
    </View>
  );
}

const styles = {
  // Fondo real detrás de la foto (ver ExpoImage/LinearGradient arriba) --
  // mismo criterio que WelcomeAuthScreen.tsx.
  bg: { width: "100%", height: "100%", backgroundColor: "#000000" } as const,
  container: { flex: 1 } as const,
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 } as const,
  backBtn: { width: 40, height: 40, justifyContent: "center" as const, marginBottom: 16 } as const,
  // Título/subtítulo/enlaces flotan directamente sobre la foto -- blanco
  // fijo, no `Colors.TEXT_PRIMARY/SECONDARY` (esa paleta da texto oscuro
  // pensado para fondo claro, invisible aquí). Los inputs de abajo NO
  // cambian: son tarjetas blancas opacas propias.
  title: { fontFamily: "Gilroy-ExtraBold" as const, fontSize: 30, color: "#FFFFFF", marginBottom: 6 } as const,
  subtitle: { fontFamily: "Gilroy-Regular" as const, fontSize: 16, color: "rgba(255,255,255,0.82)", marginBottom: 32 } as const,
  inputGroup: { marginBottom: 20 } as const,
  // Las etiquetas "Email"/"Contraseña" van ENCIMA de la tarjeta blanca del
  // input, no dentro -- flotan sobre la foto igual que title/subtitle.
  label: { fontFamily: "Gilroy-Medium" as const, fontSize: 14, color: "rgba(255,255,255,0.82)", marginBottom: 8 } as const,
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
  // Ya no lleva backgroundColor/height propios -- GlassButton (color de
  // marca #49C5B6 + Liquid Glass) trae su propio estilo, esto solo aporta
  // el espaciado con los elementos de alrededor. Sustituye al botón gris
  // plano (Colors.ACCENT_START) de antes -- pedido explícito 2026-08-29:
  // "pinta el botón de nuestro color de marca".
  btn: { marginTop: 8, marginBottom: 16 } as const,
  forgotBtn: { alignItems: "flex-end" as const, marginBottom: 24 } as const,
  forgotText: { fontFamily: "Gilroy-Medium" as const, fontSize: 14, color: "rgba(255,255,255,0.82)" } as const,
  footer: { flexDirection: "row" as const, justifyContent: "center" as const, alignItems: "center" } as const,
  footerText: { fontFamily: "Gilroy-Regular" as const, fontSize: 15, color: "rgba(255,255,255,0.75)" } as const,
  // Acento de marca -- mismo criterio que "Regístrate" en WelcomeAuthScreen.tsx.
  footerLink: { fontFamily: "Gilroy-Bold" as const, fontSize: 15, color: C.orange } as const,
};
