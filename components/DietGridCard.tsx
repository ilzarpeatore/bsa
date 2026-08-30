import React from "react";
import { Text, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { Colors } from "@constants/colors";
import { C } from "../pages/migrated/theme";

interface Props {
  title: string;
  calories?: number;
  totalTime?: string;
  image?: string;
  isFavourite?: boolean;
  onPress: () => void;
  onToggleFavourite?: () => void;
}

function DietGridCard({
  title,
  calories,
  totalTime,
  image,
  isFavourite,
  onPress,
  onToggleFavourite,
}: Props) {
  const styles = useStyle();

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} contentFit="cover" style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        {onToggleFavourite ? (
          <Pressable
            style={styles.favouriteBadge}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e: any) => {
              e.stopPropagation?.();
              onToggleFavourite();
            }}
          >
            <Ionicons
              name={isFavourite ? "star" : "star-outline"}
              size={15}
              // Antes Colors.ACCENT_START (gris) -- color de marca (pedido
              // explícito 2026-08-29, "todos los botones"). Teal puro, no
              // orange60: el fondo de este badge es oscuro (rgba(0,0,0,0.45)
              // sobre foto), no la superficie clara donde orange60 hace
              // falta por contraste (ver comentario junto a C.orange).
              color={isFavourite ? C.orange : "#FFFFFF"}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {(calories != null || totalTime) && (
        <View style={styles.metaRow}>
          {calories != null && <Text style={styles.metaText}>{calories} kcal</Text>}
          {calories != null && totalTime ? <Text style={styles.metaText}> · </Text> : null}
          {totalTime ? <Text style={styles.metaText}>{totalTime}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

export const DietGridCardMem = React.memo(DietGridCard);

function useStyle() {
  return useResponsiveStyleSheet({
    container: {
      width: "48%",
      marginBottom: "20@ratio",
    },
    imageWrap: {
      position: "relative",
    },
    image: {
      width: "100%",
      height: "130@ratio",
      borderRadius: "14@ratio",
    },
    imagePlaceholder: {
      backgroundColor: Colors.BG_CARD,
    },
    favouriteBadge: {
      position: "absolute",
      top: "8@ratio",
      right: "8@ratio",
      width: "28@ratio",
      height: "28@ratio",
      borderRadius: "14@ratio",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    title: {
      fontFamily: "Gilroy-Bold",
      fontSize: "14@ratio",
      color: Colors.TEXT_PRIMARY,
      marginTop: "8@ratio",
    },
    metaRow: {
      flexDirection: "row",
      marginTop: "4@ratio",
    },
    metaText: {
      fontFamily: "Gilroy-Regular",
      fontSize: "12@ratio",
      color: Colors.TEXT_SECONDARY,
    },
  });
}
