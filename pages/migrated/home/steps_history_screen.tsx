import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

interface StepEntry {
  id: string;
  time: string;
  steps: number;
  intensity: "High" | "Moderate" | "Low";
  calories: number;
  date: string;
}

const INITIAL_DATA: StepEntry[] = [
  { id: "1", time: "08:30", steps: 2500, intensity: "High", calories: 120, date: "today" },
  { id: "2", time: "14:15", steps: 1200, intensity: "Moderate", calories: 55, date: "today" },
  { id: "3", time: "19:00", steps: 823, intensity: "Low", calories: 35, date: "today" },
  { id: "4", time: "07:45", steps: 3100, intensity: "High", calories: 150, date: "yesterday" },
  { id: "5", time: "12:30", steps: 1800, intensity: "Moderate", calories: 80, date: "yesterday" },
  { id: "6", time: "18:00", steps: 2400, intensity: "Moderate", calories: 110, date: "yesterday" },
];

const FILTERS = ["All", "High", "Moderate", "Low"];

function getIntensityColor(intensity: string) {
  switch (intensity) {
    case "High":
      return "#F44336";
    case "Moderate":
      return "#FF9800";
    default:
      return "#4CAF50";
  }
}

export default function StepsHistoryScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [filter, setFilter] = useState("All");
  const [data, setData] = useState(INITIAL_DATA);

  const filtered = data.filter(
    (entry) => filter === "All" || entry.intensity === filter
  );

  const todayEntries = filtered.filter((e) => e.date === "today");
  const yesterdayEntries = filtered.filter((e) => e.date === "yesterday");

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar", "Â¿Eliminar este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => setData((prev) => prev.filter((e) => e.id !== id)),
      },
    ]);
  };

  const renderEntry = (entry: StepEntry) => (
    <Pressable
      key={entry.id}
      style={({ pressed }) => [styles.entryCard, pressed && { opacity: 0.2 }]}
      onPress={() => navigation.navigate("MigratedStepsDetails")}
      onLongPress={() => handleDelete(entry.id)}
    >
      <View style={styles.entryLeft}>
        <Text style={styles.entryTime}>{entry.time}</Text>
        <View
          style={[
            styles.intensityBadge,
            { backgroundColor: getIntensityColor(entry.intensity) + "20" },
          ]}
        >
          <Text
            style={[
              styles.intensityText,
              { color: getIntensityColor(entry.intensity) },
            ]}
          >
            {entry.intensity}
          </Text>
        </View>
      </View>
      <View style={styles.entryRight}>
        <Text style={styles.entrySteps}>{entry.steps.toLocaleString()}</Text>
        <Text style={styles.entryCalories}>{entry.calories} cal</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterBar}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              style={({ pressed }) => [
                styles.filterBtn,
                filter === f && styles.filterBtnActive,
                pressed && { opacity: 0.2 },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[styles.filterText, filter === f && styles.filterTextActive]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {todayEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            {todayEntries.map(renderEntry)}
          </View>
        )}

        {yesterdayEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yesterday</Text>
            {yesterdayEntries.map(renderEntry)}
          </View>
        )}
      </ScrollView>
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
    padding: 20,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.card,
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: C.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.gray,
  },
  filterTextActive: {
    color: C.white,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.text,
    marginBottom: 10,
  },
  entryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  entryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  entryTime: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.gray,
    width: 48,
  },
  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontFamily: FONT.bold,
  },
  entryRight: {
    alignItems: "flex-end",
  },
  entrySteps: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: C.text,
  },
  entryCalories: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: C.gray,
    marginTop: 2,
  },
  });
}
