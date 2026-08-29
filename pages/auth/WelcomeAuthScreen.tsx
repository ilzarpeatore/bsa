import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { SandowLogo } from "@components/auth/SandowLogo";
import { AuthSocialButton } from "@components/auth/AuthSocialButton";
import { AuthLinkRow } from "@components/auth/AuthLinkRow";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { Colors } from "@constants/colors";

export default function WelcomeAuthScreen() {
  const navigation = useNavigation<any>();
  const styles = useStyle();

  return (
    <View
      style={styles.bg}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.top}>
          <SandowLogo size={80} />
          <Text style={styles.title}>Bienvenido a{"\n"}Be Stronger!</Text>
          <Text style={styles.subtitle}>Elige cómo quieres continuar.</Text>
        </View>

        <View style={styles.bottom}>
          <AuthSocialButton
            variant="email"
            label="Iniciar sesión"
            onPress={() => navigation.navigate("LoginAuth")}
          />
          <AuthLinkRow
            prefix="¿No tienes una cuenta?"
            linkText="Regístrate"
            onPress={() => navigation.navigate("RegisterFlow")}
          />
        </View>

        <StatusBar style="dark" />
      </SafeAreaView>
    </View>
  );
}

function useStyle() {
  return useResponsiveStyleSheet({
    bg: {
      width: "100%",
      height: "100%",
      backgroundColor: Colors.BG_PRIMARY,
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
      color: Colors.TEXT_PRIMARY,
      textAlign: "center",
      marginTop: "24@ratio",
      lineHeight: "38@ratio",
    },
    subtitle: {
      fontFamily: "Gilroy-Regular",
      fontSize: "16@ratio",
      color: Colors.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: "10@ratio",
    },
    bottom: {
      paddingBottom: "20@ratio",
    },
  });
}
