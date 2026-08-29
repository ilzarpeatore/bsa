import React from "react";
import { Text, Pressable, View } from "react-native";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { Colors } from "@constants/colors";

interface Props {
  prefix: string;
  linkText: string;
  onPress: () => void;
  // Overrides opcionales (pedido explícito 2026-08-29, primer uso en
  // WelcomeAuthScreen.tsx sobre foto de fondo): por defecto siguen usando
  // los mismos colores fijos de siempre (Colors.TEXT_SECONDARY/TEXT_PRIMARY,
  // pensados para el fondo claro plano que usan ForgotPasswordOptionsScreen/
  // ForgotPasswordEmailScreen), así que esos dos no cambian.
  prefixColor?: string;
  linkColor?: string;
}

export function AuthLinkRow({ prefix, linkText, onPress, prefixColor, linkColor }: Props) {
  const styles = useStyle();

  return (
    <View style={styles.container}>
      <Text style={[styles.prefix, prefixColor && { color: prefixColor }]}>{prefix} </Text>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.2 }}>
        <Text style={[styles.link, linkColor && { color: linkColor }]}>{linkText}</Text>
      </Pressable>
    </View>
  );
}

function useStyle() {
  return useResponsiveStyleSheet({
    container: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "20@ratio",
    },
    prefix: {
      fontFamily: "Gilroy-Regular",
      fontSize: "14@ratio",
      color: Colors.TEXT_SECONDARY,
    },
    link: {
      fontFamily: "Gilroy-Bold",
      fontSize: "14@ratio",
      color: Colors.TEXT_PRIMARY,
    },
  });
}
