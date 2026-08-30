import React from "react";
import { Text, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { Colors } from "@constants/colors";
import { GRADIENT } from "../../pages/migrated/theme";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AuthPrimaryButton({ label, onPress, loading = false, disabled = false }: Props) {
  const styles = useStyle();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.container, disabled && styles.disabled, pressed && { opacity: 0.2 }]}
    >
      <LinearGradient
        start={{ x: 0.24, y: -0.09 }}
        end={{ x: 0.5, y: 1 }}
        // Antes Colors.ACCENT_START/END (gris, alias de C.brand50/60) --
        // pedido explícito 2026-08-29 de usar el color de marca en todos
        // los botones. Colors.TEXT_PRIMARY ya resuelve a un gris casi negro
        // (ver C.white en theme.ts), así que el texto sigue legible encima
        // sin tocarlo.
        colors={GRADIENT.brand}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.TEXT_PRIMARY} size="small" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function useStyle() {
  return useResponsiveStyleSheet({
    container: {
      width: "100%",
      height: "56@ratio",
      borderRadius: "16@ratio",
      overflow: "hidden",
    },
    gradient: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "16@ratio",
    },
    label: {
      fontFamily: "Gilroy-Bold",
      fontSize: "18@ratio",
      color: Colors.TEXT_PRIMARY,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
