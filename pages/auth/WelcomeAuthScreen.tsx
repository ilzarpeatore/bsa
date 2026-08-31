import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
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
          {/* logoBackdrop (2026-08-31, pedido explícito -- "se ve mal y
              borroso, además de lo blanco"): el PNG en sí ya es así de
              origen -- un acabado "cristal" translúcido sin contorno sólido
              (mismo arte que assets/applogo.png, el icono de la app), no un
              problema de escalado. Sin nada sólido detrás se lava contra la
              foto de fondo. Placa oscura semitransparente redondeada detrás
              SOLO en esta pantalla (no se toca el PNG compartido con el
              icono de la app) para que el contraste no dependa de qué haya
              justo detrás en la foto. */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBackdrop} />
            <ExpoImage source={require("../../assets/bestronger-logo.png")} style={styles.logo} contentFit="contain" />
          </View>
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
            // Pedido explícito 2026-08-29: se elimina la screen de registro
            // aparte -- el onboarding ES el registro (termina con 2
            // preguntas que crean la cuenta, ver
            // constants/onboardingV2Questions.ts, etapa 'credentials'), así
            // que "Regístrate" lleva directo ahí en vez de a un formulario
            // previo. MigratedOnboardingV2 ahora también vive en el stack
            // sin autenticar (ver App.tsx).
            onPress={() => navigation.navigate("MigratedOnboardingV2")}
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
    // Logo real (assets/bestronger-logo.png, fondo blanco recortado a
    // transparente) sustituye al círculo gris con una "S" de antes
    // (SandowLogo, ya eliminado -- sin más usos en la app). Proporción
    // 959x551 del PNG original -- ancho fijo, alto en la misma relación
    // para no deformarlo.
    logoWrap: {
      width: "220@ratio",
      height: "140@ratio",
      alignItems: "center",
      justifyContent: "center",
    },
    // Placa de contraste detrás del logo (ver comentario junto al JSX) --
    // algo más pequeña que logoWrap, para que se note como un respaldo con
    // aire alrededor y no como un rectángulo pegado a los bordes del logo.
    logoBackdrop: {
      position: "absolute",
      width: "210@ratio",
      height: "130@ratio",
      borderRadius: "28@ratio",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    logo: {
      width: "180@ratio",
      height: "103.5@ratio",
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
