import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAppColorMode } from "@helper/useAppColorMode";
import { FONT } from "../theme";
import { stepsApi } from "@api/steps";

const { width } = Dimensions.get("window");

function Confetti({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    color: ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6C5CE7", "#FF9FF3"][i % 5],
    delay: Math.random() * 2000,
  }));

  const [anims] = useState(() => pieces.map(() => new Animated.Value(0)));

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(pieces[i].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
    // `pieces` se queda fuera a propósito: se recalcula (Math.random) en cada
    // render y este efecto solo debe correr una vez al montar, usando los
    // delays de las piezas iniciales (las mismas que capturó `anims`).
    // Añadirlo reiniciaría todos los loops de confeti en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anims]);

  return (
    <View style={styles.confettiContainer}>
      {pieces.map((piece, i) => (
        <Animated.View
          key={piece.id}
          style={{
            position: "absolute",
            left: piece.x,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: piece.color,
            opacity: anims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            transform: [
              {
                translateY: anims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 400],
                }),
              },
              {
                rotate: anims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

export default function StepGoalCompletedScreen({ navigation, route }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [goal, setGoal] = useState<number>(route?.params?.goal ?? 10000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route?.params?.goal) return;
    stepsApi
      .getGoalList()
      .then((res) => {
        const latest = res.data?.data?.[0];
        if (latest?.value) setGoal(latest.value);
      })
      .catch(() => {});
  }, [route?.params?.goal]);

  const confirmGoal = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await stepsApi.saveGoal(goal, today);
    } catch {
      // deja el valor local visible aunque el guardado falle; el usuario puede reintentar
    } finally {
      setSaving(false);
      setShowEditSheet(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Confetti styles={styles} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trophyContainer}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
          </View>
        </View>

        <Text style={styles.congratsText}>¡Meta alcanzada!</Text>
        <Text style={styles.stepsText}>{goal.toLocaleString()} pasos completados</Text>

        <View style={styles.streakCard}>
          <Ionicons name="flame-outline" size={24} color="#FF6B6B" />
          <Text style={styles.streakText}>3 días seguidos</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.editGoalButton, pressed && { opacity: 0.2 }]}
          onPress={() => setShowEditSheet(true)}
        >
          <Text style={styles.editGoalText}>Editar meta</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.2 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </ScrollView>

      {showEditSheet && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Editar meta</Text>
          <Text style={styles.sheetGoal}>{goal.toLocaleString()} pasos</Text>
          <View style={styles.sliderRow}>
            <Pressable
              onPress={() => setGoal(Math.max(1000, goal - 1000))}
              style={({ pressed }) => pressed && { opacity: 0.2 }}
            >
              <Ionicons name="remove-circle" size={32} color={C.textPrimary} />
            </Pressable>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${(goal / 20000) * 100}%` },
                ]}
              />
            </View>
            <Pressable
              onPress={() => setGoal(Math.min(20000, goal + 1000))}
              style={({ pressed }) => pressed && { opacity: 0.2 }}
            >
              <Ionicons name="add-circle" size={32} color={C.textPrimary} />
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [styles.sheetConfirmBtn, pressed && { opacity: 0.2 }]}
            onPress={confirmGoal}
            disabled={saving}
          >
            <Text style={styles.sheetConfirmText}>{saving ? "Guardando..." : "Confirmar"}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    confettiContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
    },
    content: {
      flexGrow: 1,
      padding: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    trophyContainer: {
      marginBottom: 24,
    },
    trophyCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: "#FFF8E1",
      justifyContent: "center",
      alignItems: "center",
    },
    congratsText: {
      fontSize: 28,
      lineHeight: 33,
      fontFamily: FONT.bold,
      color: C.text,
      marginBottom: 8,
    },
    stepsText: {
      fontSize: 16,
      fontFamily: FONT.medium,
      color: C.gray,
      marginBottom: 24,
    },
    streakCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      gap: 10,
      marginBottom: 32,
    },
    streakText: {
      fontSize: 16,
      fontFamily: FONT.bold,
      color: C.text,
    },
    editGoalButton: {
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.primary,
      marginBottom: 16,
    },
    editGoalText: {
      fontSize: 14,
      fontFamily: FONT.medium,
      color: C.textPrimary,
    },
    backButton: {
      paddingVertical: 12,
    },
    backButtonText: {
      fontSize: 14,
      fontFamily: FONT.medium,
      color: C.gray,
    },
    bottomSheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: C.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.gray + "40",
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontFamily: FONT.bold,
      color: C.text,
      textAlign: "center",
      marginBottom: 16,
    },
    sheetGoal: {
      fontSize: 32,
      lineHeight: 38,
      fontFamily: FONT.bold,
      color: C.textPrimary,
      textAlign: "center",
      marginBottom: 20,
    },
    sliderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    },
    sliderTrack: {
      flex: 1,
      height: 8,
      backgroundColor: C.bg,
      borderRadius: 4,
      overflow: "hidden",
    },
    sliderFill: {
      height: "100%",
      backgroundColor: C.primary,
      borderRadius: 4,
    },
    sheetConfirmBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    sheetConfirmText: {
      fontSize: 16,
      fontFamily: FONT.bold,
      color: C.white,
    },
  });
}
