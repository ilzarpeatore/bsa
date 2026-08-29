import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { SandowLogo } from "@components/auth/SandowLogo";
import { AuthLinkRow } from "@components/auth/AuthLinkRow";
import GlassButton from "@components/GlassButton";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { C } from "../migrated/theme";

// Rediseño "más moderno" (pedido explícito 2026-08-29, foto de referencia
// adjunta): foto de fondo a pantalla completa + degradado oscuro (más
// fuerte hacia abajo, donde vive el botón) en vez del fondo gris plano de
// antes. Los colores de texto pasan a blanco fijo -- ya NO usan
// `Colors`/`useColors()` (esa paleta da texto oscuro pensado para fondo
// claro, invisible sobre una foto oscura) -- mismo criterio que el texto
// del hero de Home v2 (heroGreeting/heroPhrase, blanco fijo, no reactivo
// al tema, porque su fondo también es una foto oscurecida siempre).
//
// Botón de acceso: GlassButton (color de marca #49C5B6 + Liquid Glass, ver
// components/GlassButton.tsx) en vez de AuthSocialButton -- mismo botón ya
// usado en workout_preview_screen.tsx/ReadinessWizard, unifica el look
// "moderno" de la marca en vez de introducir un tercer estilo de botón.
export default function WelcomeAuthScreen() {
  const navigation = useNavigation<any>();
  const styles = useStyle();

  return (
    <View style={styles.bg}>
      <ExpoImage
        source={require("../../assets/welcome-auth-bg.webp")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.container}>
        <View style={styles.top}>
          <SandowLogo size={80} />
          <Text style={styles.title}>Bienvenido a{"\n"}Be Stronger!</Text>
          <Text style={styles.subtitle}>Elige cómo quieres continuar.</Text>
        </View>

        <View style={styles.bottom}>
          <GlassButton
            label="Iniciar sesión"
            iconName="mail-outline"
            onPress={() => navigation.navigate("LoginAuth")}
            style={styles.loginBtn}
          />
          <AuthLinkRow
            prefix="¿No tienes una cuenta?"
            linkText="Regístrate"
            onPress={() => navigation.navigate("RegisterFlow")}
            prefixColor="rgba(255,255,255,0.75)"
            linkColor={C.orange}
          />
        </View>

        <StatusBar style="light" />
      </SafeAreaView>
    </View>
  );
}

function useStyle() {
  return useResponsiveStyleSheet({
    bg: {
      width: "100%",
      height: "100%",
      backgroundColor: "#000000",
    },
    container: {
      flex: 1,
      paddingHorizontal: "28@ratio",
    },
    top: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontFamily: "Gilroy-ExtraBold",
      fontSize: "30@ratio",
      color: "#FFFFFF",
      textAlign: "center",
      marginTop: "24@ratio",
      lineHeight: "38@ratio",
    },
    subtitle: {
      fontFamily: "Gilroy-Regular",
      fontSize: "16@ratio",
      color: "rgba(255,255,255,0.82)",
      textAlign: "center",
      marginTop: "10@ratio",
    },
    bottom: {
      paddingBottom: "20@ratio",
    },
    loginBtn: {
      marginBottom: "16@ratio",
    },
  });
}
