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

import { useAppColorMode } from "@helper/useAppColorMode";
import { FONT } from "../theme";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LogStepsFormScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [stepCount, setStepCount] = useState(0);
  const [distance, setDistance] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleSave = () => {
    if (stepCount === 0) {
      Alert.alert("Error", "Ingresa la cantidad de pasos");
      return;
    }
    Alert.alert("Ã‰xito", "Pasos registrados correctamente", [
      { text: "OK", onPress: () => navigation.navigate("MigratedStepsLogged") },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Registrar pasos</Text>

        <View style={styles.datePickerRow}>
          <Ionicons name="calendar-outline" size={20} color={C.textPrimary} />
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <Pressable
            onPress={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d);
            }}
            style={({ pressed }) => pressed && { opacity: 0.2 }}
          >
            <Ionicons name="chevron-back" size={20} color={C.gray} />
          </Pressable>
          <Pressable
            onPress={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d);
            }}
            style={({ pressed }) => pressed && { opacity: 0.2 }}
          >
            <Ionicons name="chevron-forward" size={20} color={C.gray} />
          </Pressable>
        </View>

        <View style={styles.stepCounter}>
          <Pressable
            style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.2 }]}
            onPress={() => setStepCount(Math.max(0, stepCount - 100))}
          >
            <Ionicons name="remove" size={24} color={C.white} />
          </Pressable>
          <View style={styles.stepDisplay}>
            <Text style={styles.stepCount}>{stepCount.toLocaleString()}</Text>
            <Text style={styles.stepLabel}>pasos</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.2 }]}
            onPress={() => setStepCount(stepCount + 100)}
          >
            <Ionicons name="add" size={24} color={C.white} />
          </Pressable>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Distancia (km)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="navigate-outline" size={18} color={C.gray} />
            <Text style={styles.inputText}>
              {distance || "0.0"}
            </Text>
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Hora</Text>
          <View style={styles.inputRow}>
            <Ionicons name="time-outline" size={18} color={C.gray} />
            <Text style={styles.inputText}>
              {new Date().toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.2 }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      lineHeight: 29,
      fontFamily: FONT.bold,
      color: C.text,
      marginBottom: 24,
    },
    datePickerRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      gap: 12,
    },
    dateText: {
      flex: 1,
      fontSize: 16,
      fontFamily: FONT.medium,
      color: C.text,
    },
    stepCounter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 32,
      gap: 24,
    },
    stepButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: C.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    stepDisplay: {
      alignItems: "center",
    },
    stepCount: {
      fontSize: 48,
      lineHeight: 57,
      fontFamily: FONT.bold,
      color: C.text,
    },
    stepLabel: {
      fontSize: 14,
      color: C.gray,
      fontFamily: FONT.medium,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: FONT.medium,
      color: C.gray,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      gap: 10,
    },
    inputText: {
      fontSize: 16,
      fontFamily: FONT.medium,
      color: C.text,
    },
    saveButton: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 24,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: FONT.bold,
      color: C.white,
    },
  });
}
