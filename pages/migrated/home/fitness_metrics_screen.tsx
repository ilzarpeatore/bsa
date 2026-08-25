import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@components/ui/box";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { Pressable } from "@components/ui/pressable";
import { Icon } from "@components/ui/icon";
import { Card } from "@components/ui/card";
import { HStack } from "@components/ui/hstack";
import { VStack } from "@components/ui/vstack";
import { useAppColorMode } from "@helper/useAppColorMode";

function buildMetrics(C: ReturnType<typeof useAppColorMode>["colors"]) {
  return [
    { id: "heart_rate", name: "Heart Rate", value: "72", unit: "bpm", status: "Normal", statusColor: C.success50, icon: "heart", iconBg: C.destructive5, iconColor: C.destructive50, chart: [65, 68, 72, 70, 74, 72] },
    { id: "steps", name: "Steps", value: "1,258", unit: "left", status: "1,225 left", statusColor: C.warning40, icon: "footsteps", iconBg: C.brand5, iconColor: C.brand50, chart: [200, 450, 680, 890, 1050, 1258] },
    { id: "weight", name: "Weight", value: "70", unit: "kg", status: "Stable", statusColor: C.success50, icon: "scale-outline", iconBg: C.blue5, iconColor: C.blue50, chart: [71, 70.5, 70.2, 70, 70, 70] },
    { id: "hydration", name: "Hydration", value: "2.1", unit: "L", status: "Good", statusColor: C.success50, icon: "water", iconBg: C.blue5, iconColor: C.blue50, chart: [0.5, 1.0, 1.4, 1.7, 1.9, 2.1] },
    { id: "blood_pressure", name: "Blood Pressure", value: "128/80", unit: "mmHg", status: "Normal", statusColor: C.success50, icon: "pulse", iconBg: C.destructive5, iconColor: C.destructive50, chart: [130, 128, 126, 128, 127, 128] },
    { id: "sleep", name: "Sleep", value: "7h 30m", unit: "", status: "Good", statusColor: C.success50, icon: "moon", iconBg: C.purple5, iconColor: C.purple50, chart: [6.5, 7.0, 7.5, 7.2, 7.8, 7.5] },
    { id: "nutrition", name: "Nutrition", value: "1,850", unit: "kcal", status: "On Track", statusColor: C.brand50, icon: "restaurant", iconBg: C.brand5, iconColor: C.brand50, chart: [1600, 1750, 1800, 1850, 1820, 1850] },
    { id: "mood", name: "Mood", value: "Good", unit: "", status: "Stable", statusColor: C.success50, icon: "happy", iconBg: C.warning5, iconColor: C.warning40, chart: [3, 3, 4, 4, 4, 4] },
  ];
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View style={miniStyles.row}>
      {data.map((val, i) => {
        const height = ((val - min) / range) * 24 + 4;
        return (
          <View
            key={i}
            style={[
              miniStyles.bar,
              {
                height,
                backgroundColor: color,
                opacity: 0.3 + (i / data.length) * 0.7,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const miniStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  bar: { width: 4, borderRadius: 2 },
});

export default function FitnessMetricsScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();
  const METRICS = useMemo(() => buildMetrics(C), [C]);
  const handlePress = (metric: (typeof METRICS)[number]) => {
    navigation.navigate("MigratedHealthMetricInsight", { metricType: metric.id });
  };

  return (
    <Box className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <Box className="px-5" style={{ paddingTop: 12, paddingBottom: 8 }}>
          <Heading size="xl">Fitness Metrics</Heading>
        </Box>
        <ScrollView contentContainerStyle={styles.list}>
          {METRICS.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => handlePress(m)}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}, ${m.value}${m.unit ? ` ${m.unit}` : ''}, ${m.status}`}
            >
              <Card variant="outline" className="flex-row items-center p-4 gap-3">
                <Box
                  className="w-11 h-11 rounded-pill items-center justify-center"
                  style={{ backgroundColor: m.iconBg }}
                >
                  <Icon name={m.icon as any} size={22} color={m.iconColor} />
                </Box>
                <VStack className="flex-1">
                  <Text size="sm" weight="medium" muted>{m.name}</Text>
                  <HStack space="xs" className="items-center" style={{ marginTop: 4 }}>
                    <Text size="xl" weight="bold">{m.value}</Text>
                    {m.unit ? <Text size="sm" muted style={{ marginRight: 8 }}>{m.unit}</Text> : null}
                    <Box className="rounded-sm px-2 py-0.5" style={{ backgroundColor: m.statusColor + "20" }}>
                      <Text size="xs" weight="semibold" style={{ color: m.statusColor }}>{m.status}</Text>
                    </Box>
                  </HStack>
                </VStack>
                <MiniChart data={m.chart} color={m.iconColor} />
                <Icon name="chevron-forward" size={16} className="text-muted-foreground" />
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
});
