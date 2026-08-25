import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";
import { stepsApi } from "@api/steps";

export default function StepGoalScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [goal, setGoal] = useState(10000);
  const savedGoalRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const current = 3000;
  const percentage = Math.round((current / goal) * 100);

  useEffect(() => {
    stepsApi
      .getGoalList()
      .then((res) => {
        const latest = res.data?.data?.[0];
        if (latest?.value) {
          setGoal(latest.value);
          savedGoalRef.current = latest.value;
        }
      })
      .catch(() => {});
  }, []);

  const confirmGoal = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await stepsApi.saveGoal(goal, today);
      savedGoalRef.current = goal;
    } catch {
      // deja el valor local visible aunque el guardado falle; el usuario puede reintentar
    } finally {
      setSaving(false);
      setShowEditSheet(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressRing}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.percentageText}>{percentage}%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.stepsText}>
          {current.toLocaleString()} / {goal.toLocaleString()} pasos
        </Text>
        <Text style={styles.progressLabel}>Progress</Text>

        <Pressable
          style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.2 }]}
          onPress={() => setShowEditSheet(true)}
        >
          <Ionicons name="create-outline" size={18} color={C.textPrimary} />
          <Text style={styles.editButtonText}>Editar meta</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.insightsButton, pressed && { opacity: 0.2 }]}
          onPress={() => navigation.navigate("MigratedStepsInsight")}
        >
          <Ionicons name="bar-chart-outline" size={18} color={C.white} />
          <Text style={styles.insightsButtonText}>Ver insights</Text>
        </Pressable>
      </View>

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

function createStyles(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRing: {
    marginBottom: 24,
  },
  ringOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  ringInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  percentageText: {
    fontSize: 36,
    lineHeight: 42,
    fontFamily: FONT.bold,
    color: C.textPrimary,
  },
  stepsText: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: C.text,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.gray,
    marginBottom: 32,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
    marginBottom: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.textPrimary,
  },
  insightsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  insightsButtonText: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: C.white,
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
