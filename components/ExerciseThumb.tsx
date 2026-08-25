import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppColorMode } from "@helper/useAppColorMode";
import { MuscleIsolateIconMem } from "./MuscleIsolateIcon";

interface Props {
  image?: string | null;
  /** body_parts.id del musculo principal (ver body_part_id en getDayDetail/getClientDetail) — pinta el heatmap aislado en la insignia; sin él, icono generico. */
  bodyPartId?: number | null;
  size?: number;
}

const BADGE_SIZE = 26;

/** Miniatura cuadrada de ejercicio + insignia circular superpuesta (esquina inferior derecha) con el musculo aislado resaltado. */
function ExerciseThumb({ image, bodyPartId, size = 56 }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Ionicons name="barbell-outline" size={size * 0.4} color={C.gray40} />
        </View>
      )}
      <View style={styles.badge}>
        <MuscleIsolateIconMem bodyPartId={bodyPartId} size={BADGE_SIZE - 4} />
      </View>
    </View>
  );
}

export const ExerciseThumbMem = React.memo(ExerciseThumb);

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    wrap: {
      position: "relative",
    },
    image: {
      width: "100%",
      height: "100%",
      borderRadius: 10,
      backgroundColor: C.surface,
    },
    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceLight,
    },
    badge: {
      position: "absolute",
      bottom: -6,
      right: -6,
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      backgroundColor: C.brand60,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: C.bg,
    },
  });
}
