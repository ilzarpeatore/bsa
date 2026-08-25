// Sin consumidores hoy (huérfano). Se conserva como referencia de la lógica
// de sparkline SVG (Polyline/Circle a mano) para el Tier D de la migración a
// Gluestack — recrear un sparkline desde cero sería trabajo repetido. El
// layout de card sí debe reconstruirse con el nuevo componente Card de
// Fase 1 cuando se retome.
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, Circle } from "react-native-svg";
import { RADIUS, SPACING, SHADOW } from "@pages/migrated/theme";
import { useAppColorMode } from "@helper/useAppColorMode";

export type TrendStatus = "success" | "warning" | "danger" | "neutral";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  statusText?: string;
  status?: TrendStatus;
  data?: number[];
  onPress?: () => void;
}

function buildStatusColor(C: ReturnType<typeof useAppColorMode>['colors']): Record<TrendStatus, string> {
  return {
    success: C.statusSuccess,
    warning: C.statusWarning,
    danger: C.statusDanger,
    neutral: C.textSecondary,
  };
}

const SPARK_WIDTH = 150;
const SPARK_HEIGHT = 50;
const SPARK_PADDING = 6;

function buildPoints(data: number[]): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (SPARK_WIDTH - SPARK_PADDING * 2) / (data.length - 1);
  return data
    .map((v, i) => {
      const x = SPARK_PADDING + i * step;
      const y =
        SPARK_PADDING +
        (1 - (v - min) / range) * (SPARK_HEIGHT - SPARK_PADDING * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

// Mini-gráfico de línea hecho a mano con react-native-svg (sin librería de
// sparklines, ver Encargo2_Theme_Bevel.md sección 2.4). Punto final con
// halo de color (círculo grande translúcido detrás del punto sólido).
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <View style={{ width: SPARK_WIDTH, height: SPARK_HEIGHT }} />;
  const points = buildPoints(data);
  const last = points.split(" ").pop()!.split(",").map(Number);

  return (
    <Svg width={SPARK_WIDTH} height={SPARK_HEIGHT}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last[0]} cy={last[1]} r={9} fill={color} opacity={0.2} />
      <Circle cx={last[0]} cy={last[1]} r={4} fill={color} />
    </Svg>
  );
}

// Tarjeta de tendencia con sparkline, patrón Bevel (Encargo2_Theme_Bevel.md
// sección 2.4): icono + nombre, valor grande, indicador de estado, mini
// gráfico. Sin datos → EmptyStateCard, no esta.
export default function TrendCard({ icon, label, value, statusText, status = "neutral", data = [], onPress }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const STATUS_COLOR = useMemo(() => buildStatusColor(C), [C]);
  const color = STATUS_COLOR[status];
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      style={
        onPress
          ? ({ pressed }: { pressed: boolean }) => [styles.card, pressed && { opacity: 0.7 }]
          : styles.card
      }
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={16} color={C.textSecondary} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
        {statusText ? (
          <View style={styles.statusRow}>
            <Ionicons
              name={status === "danger" || status === "warning" ? "arrow-down" : "checkmark-circle"}
              size={14}
              color={color}
            />
            <Text style={[styles.statusText, { color }]}>{statusText}</Text>
          </View>
        ) : null}
      </View>
      <Sparkline data={data} color={color} />
    </Wrapper>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 120,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.cardPadding,
    ...SHADOW.card,
  },
  left: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textSecondary,
  },
  value: {
    fontSize: 32,
    fontWeight: "700",
    color: C.textPrimary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  });
}
