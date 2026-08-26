import React from "react";
import { ImageBackground, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import MaskedView from "@react-native-masked-view/masked-view";
import { ForgotOptionTile } from "@components/auth/ForgotOptionTile";
import { AuthLinkRow } from "@components/auth/AuthLinkRow";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { Colors } from "@constants/colors";
import { showToast } from "@helper/toast";

export default function ForgotPasswordOptionsScreen() {
  const navigation = useNavigation<any>();
  const styles = useStyle();

  return (
    <View
      style={styles.bg}
    >
      <SafeAreaView style={styles.container}>
        {/* title */}
        <MaskedView
          style={styles.masklabel}
          maskElement={
            <View style={styles.masklabelview}>
              <Text style={styles.masklabeltext}>Olvidé</Text>
            </View>
          }
        >
          <ImageBackground
            source={require("@assets/pagetitlemask2.png")}
            style={styles.masklabelimg}
            imageStyle={styles.masklabelimgresize}
          />
        </MaskedView>

        <View style={styles.content}>
          <Text style={styles.heading}>Restablecer contraseña</Text>
          <Text style={styles.subheading}>
            Elige cómo quieres restablecer tu contraseña.
          </Text>

          <View style={styles.options}>
            <ForgotOptionTile
              icon="mail-outline"
              label="Restablecer por Email"
              onPress={() => navigation.navigate("ForgotEmail")}
            />
            <ForgotOptionTile
              icon="chatbubble-outline"
              label="Restablecer por SMS"
              onPress={() => showToast("Próximamente", { description: "El restablecimiento por SMS estará disponible pronto.", variant: "info" })}
            />
          </View>
        </View>

        <AuthLinkRow
          prefix="¿Recuerdas tu contraseña?"
          linkText="Volver a iniciar sesión"
          onPress={() => navigation.goBack()}
        />

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
      paddingTop: "40@ratio",
    },
    masklabel: {
      height: "49@ratio",
      marginBottom: "30@ratio",
    },
    masklabelview: {
      backgroundColor: "transparent",
      height: "49@ratio",
      alignItems: "center",
      justifyContent: "center",
    },
    masklabeltext: {
      fontSize: "36@ratio",
      color: Colors.TEXT_PRIMARY,
      fontFamily: "Gilroy-ExtraBold",
    },
    masklabelimg: {
      width: "100%",
      height: "200@ratio",
      marginTop: "-55@ratio",
    },
    masklabelimgresize: {
      resizeMode: "cover",
    },
    content: {
      flex: 1,
    },
    heading: {
      fontFamily: "Gilroy-ExtraBold",
      fontSize: "24@ratio",
      color: Colors.TEXT_PRIMARY,
      marginBottom: "8@ratio",
    },
    subheading: {
      fontFamily: "Gilroy-Regular",
      fontSize: "16@ratio",
      color: Colors.TEXT_SECONDARY,
      marginBottom: "30@ratio",
    },
    options: {
      gap: 12,
    },
  });
}
