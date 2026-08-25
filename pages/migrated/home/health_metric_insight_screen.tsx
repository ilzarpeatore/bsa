import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@components/ui/box";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { Icon } from "@components/ui/icon";
import { Card } from "@components/ui/card";
import { HStack } from "@components/ui/hstack";
import { VStack } from "@components/ui/vstack";
import { FONT } from "../theme";
import { useAppColorMode } from "@helper/useAppColorMode";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function buildMetricData(C: ReturnType<typeof useAppColorMode>["colors"]): Record<string, any> {
  return {
  heart_rate: {
    label: "Frecuencia cardíaca",
    icon: "heart",
    iconColor: C.destructive50,
    peak: "145 lpm",
    average: "72 lpm",
    min: "58 lpm",
    max: "145 lpm",
    score: 85,
    trend: [65, 70, 72, 68, 75, 72, 70],
    recommendations: [
      "Mantén sesiones de cardio regulares 3x/semana",
      "Vigila la frecuencia cardíaca en reposo por si cambia",
      "Considera entrenamiento de HRV para la recuperación",
    ],
  },
  steps: {
    label: "Pasos",
    icon: "footsteps",
    iconColor: C.brand50,
    peak: "12.450",
    average: "8.200",
    min: "3.100",
    max: "12.450",
    score: 72,
    trend: [6500, 8200, 9800, 7400, 10200, 8200, 7800],
    recommendations: [
      "Intenta llegar a 10.000 pasos diarios",
      "Haz pausas para caminar cada hora",
      "Usa las escaleras en vez del ascensor",
    ],
  },
  weight: {
    label: "Peso",
    icon: "scale-outline",
    iconColor: C.blue50,
    peak: "72 kg",
    average: "70,5 kg",
    min: "69,8 kg",
    max: "72 kg",
    score: 90,
    trend: [71, 70.8, 70.5, 70.3, 70.1, 70, 70],
    recommendations: [
      "El peso es estable — sigue así",
      "Continúa el seguimiento semanal",
      "Mantén una nutrición equilibrada",
    ],
  },
  hydration: {
    label: "Hidratación",
    icon: "water",
    iconColor: C.blue50,
    peak: "2,8L",
    average: "2,1L",
    min: "1,5L",
    max: "2,8L",
    score: 78,
    trend: [1.5, 1.8, 2.1, 1.9, 2.3, 2.1, 2.0],
    recommendations: [
      "Aumenta la ingesta de agua a 2,5L diarios",
      "Bebe agua antes de cada comida",
      "Lleva una botella de agua contigo durante el día",
    ],
  },
  sleep: {
    label: "Sueño",
    icon: "moon",
    iconColor: C.purple50,
    peak: "8h 45m",
    average: "7h 20m",
    min: "5h 30m",
    max: "8h 45m",
    score: 82,
    trend: [6.5, 7.2, 7.5, 7.0, 7.8, 7.3, 7.5],
    recommendations: [
      "Mantén un horario de sueño constante",
      "Evita las pantallas 1h antes de dormir",
      "Mantén el dormitorio fresco y a oscuras",
    ],
  },
  nutrition: {
    label: "Nutrición",
    icon: "restaurant",
    iconColor: C.brand50,
    peak: "2.200 kcal",
    average: "1.850 kcal",
    min: "1.400 kcal",
    max: "2.200 kcal",
    score: 88,
    trend: [1600, 1750, 1850, 1800, 1900, 1850, 1820],
    recommendations: [
      "La ingesta de proteína va bien encaminada",
      "Aumenta las raciones de verduras",
      "Vigila la ingesta de micronutrientes",
    ],
  },
  };
}

function CircularProgress({ score }: { score: number }) {
  const { colors: C } = useAppColorMode();
  const cpStyles = useMemo(() => createCpStyles(C), [C]);
  const size = 120;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <View style={[cpStyles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          cpStyles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: C.gray30,
          },
        ]}
      />
      <View
        style={[
          cpStyles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: C.brand50,
            borderLeftColor: C.gray30,
            borderBottomColor: C.gray30,
          },
        ]}
      />
      <View style={cpStyles.label}>
        <Text style={cpStyles.score}>{score}</Text>
        <Text style={cpStyles.of}>/100</Text>
      </View>
    </View>
  );
}

function createCpStyles(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return StyleSheet.create({
  wrapper: { alignItems: "center", justifyContent: "center" },
  circle: { position: "absolute" },
  label: { alignItems: "center" },
  score: { fontSize: 32, lineHeight: 38, fontFamily: FONT.bold, color: C.white },
  of: { fontSize: 14, fontFamily: FONT.regular, color: C.gray50 },
  });
}

export default function HealthMetricInsightScreen({ route }: any) {
  const { colors: C } = useAppColorMode();
  const METRIC_DATA = useMemo(() => buildMetricData(C), [C]);
  const metricType = route?.params?.metricType || "heart_rate";
  const data = METRIC_DATA[metricType] || METRIC_DATA.heart_rate;

  const maxTrend = Math.max(...data.trend);

  return (
    <Box className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <Box className="flex-row items-center gap-3 px-5 py-4 bg-card border-b border-border">
          <Icon name={data.icon} size={28} color={data.iconColor} />
          <Heading size="md">Análisis de {data.label}</Heading>
        </Box>

        <ScrollView contentContainerStyle={styles.content}>
          <Box className="flex-row flex-wrap gap-2.5" style={{ marginBottom: 24 }}>
            {[
              { label: "Pico", value: data.peak },
              { label: "Media", value: data.average },
              { label: "Mín", value: data.min },
              { label: "Máx", value: data.max },
            ].map((item) => (
              <Box
                key={item.label}
                className="flex-1 bg-card rounded-md border border-border p-3.5"
                style={{ minWidth: "45%" }}
              >
                <Text size="xs" muted style={{ marginBottom: 4 }}>{item.label}</Text>
                <Text size="md" weight="bold">{item.value}</Text>
              </Box>
            ))}
          </Box>

          <Box className="items-center" style={{ marginBottom: 28 }}>
            <Text weight="semibold" size="lg" style={{ marginBottom: 16 }}>Estado actual</Text>
            <CircularProgress score={data.score} />
          </Box>

          <Box style={{ marginBottom: 28 }}>
            <Text weight="semibold" size="lg" style={{ marginBottom: 16 }}>Tendencia diaria</Text>
            <View style={styles.chartRow}>
              {DAYS.map((day, i) => (
                <View key={day} style={styles.chartCol}>
                  <View style={styles.chartBarWrapper}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: (data.trend[i] / maxTrend) * 100,
                          backgroundColor: data.iconColor,
                        },
                      ]}
                    />
                  </View>
                  <Text size="xs" muted style={{ marginTop: 6 }}>{day}</Text>
                </View>
              ))}
            </View>
          </Box>

          <Box style={{ marginBottom: 32 }}>
            <Text weight="semibold" size="lg" style={{ marginBottom: 16 }}>Recomendaciones</Text>
            {data.recommendations.map((rec: string, i: number) => (
              <Box key={i} className="flex-row items-center gap-2.5" style={{ marginBottom: 12 }}>
                <Icon name="checkmark-circle" size={20} color={C.success50} />
                <Text size="sm" muted style={{ flex: 1 }}>{rec}</Text>
              </Box>
            ))}
          </Box>
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120 },
  chartCol: { alignItems: "center", flex: 1 },
  chartBarWrapper: { height: 100, justifyContent: "flex-end" },
  chartBar: { width: 20, borderRadius: 6 },
});
