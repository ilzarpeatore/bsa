import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@components/ui/box";
import { Text } from "@components/ui/text";
import { Heading } from "@components/ui/heading";
import { Pressable } from "@components/ui/pressable";
import { Icon } from "@components/ui/icon";
import { Button, ButtonText } from "@components/ui/button";
import { useAppColorMode } from "@helper/useAppColorMode";

interface Metric {
  id: string;
  name: string;
  icon: string;
}

const INITIAL_METRICS: Metric[] = [
  { id: "1", name: "Weight", icon: "scale-outline" },
  { id: "2", name: "Blood Pressure", icon: "heart-outline" },
  { id: "3", name: "Heart Rate", icon: "pulse-outline" },
  { id: "4", name: "Steps", icon: "footsteps-outline" },
  { id: "5", name: "Sleep", icon: "moon-outline" },
  { id: "6", name: "Hydration", icon: "water-outline" },
  { id: "7", name: "Nutrition", icon: "nutrition-outline" },
  { id: "8", name: "Mood", icon: "happy-outline" },
];

function handleSave() {
  Alert.alert("Éxito", "Métricas guardadas correctamente");
}

export default function ManageHealthMetricsScreen({ navigation }: any) {
  const { colors: C } = useAppColorMode();

  const [metrics, setMetrics] = useState<Metric[]>(INITIAL_METRICS);

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar", "¿Eliminar esta métrica?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => setMetrics((prev) => prev.filter((m) => m.id !== id)),
      },
    ]);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...metrics];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setMetrics(updated);
  };

  const moveDown = (index: number) => {
    if (index === metrics.length - 1) return;
    const updated = [...metrics];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setMetrics(updated);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Heading size="lg" style={{ marginBottom: 24 }}>Gestionar métricas</Heading>

        {metrics.map((metric, index) => (
          <Box
            key={metric.id}
            className="flex-row items-center justify-between bg-card rounded-sm p-4"
            style={{ marginBottom: 10 }}
          >
            <Box className="flex-row items-center">
              <Icon name="reorder-three-outline" size={20} className="text-muted-foreground" />
              <Icon
                name={metric.icon as any}
                size={20}
                className="text-foreground"
                style={{ marginHorizontal: 12 }}
              />
              <Text size="md" weight="medium">{metric.name}</Text>
            </Box>
            <Box className="flex-row items-center gap-4">
              <Pressable onPress={() => moveUp(index)}>
                <Icon name="chevron-up" size={18} className="text-muted-foreground" />
              </Pressable>
              <Pressable onPress={() => moveDown(index)}>
                <Icon name="chevron-down" size={18} className="text-muted-foreground" />
              </Pressable>
              <Pressable onPress={() => handleDelete(metric.id)}>
                <Icon name="trash-outline" size={18} color="#F44336" />
              </Pressable>
            </Box>
          </Box>
        ))}

        <Button style={{ marginTop: 24 }} onPress={handleSave}>
          <ButtonText>Guardar</ButtonText>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
