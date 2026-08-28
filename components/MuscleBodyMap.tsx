import React, { useMemo, useState } from 'react';
import {  View, StyleSheet, Pressable, Text  } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {  FRONT_MUSCLES, BACK_MUSCLES, FRONT_VIEW_BOX, BACK_VIEW_BOX, ViewSide  } from '../constants/bodyMusclesPaths';
import {  bodyMusclesIdsFor  } from '../constants/bodyMusclesMap';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { FONT, RADIUS } from '../pages/migrated/theme';
// Mismo degradado 0-10 que usa el heatmap del admin panel (body-muscles,
// INTENSITY_COLORS) — mantenido igual a mano para que ambas plataformas se
// vean iguales, ya que aqui no se puede importar el paquete npm (es DOM-only).
const INTENSITY_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#fde047',
  2: '#facc15',
  3: '#eab308',
  4: '#fb923c',
  5: '#f97316',
  6: '#ea580c',
  7: '#ef4444',
  8: '#dc2626',
  9: '#b91c1c',
  10: '#7f1d1d',
};
const NEUTRAL_FILL = '#d4d4d8';
const SELECTED_STROKE = '#111827';

export interface MuscleVolumeGroup {
  group: string;
  volume: number;
}

interface MuscleBodyMapProps {
  /** Volumen por grupo canonico — colorea por intensidad relativa al maximo del set. */
  data?: MuscleVolumeGroup[];
  /** Modo selector: un solo muscle-id resaltado (para elegir zona, no ver volumen). */
  selectedMuscleId?: string | null;
  /** Toca un musculo del mapa — recibe el muscle-id tocado (ej. "chest-upper-left"). */
  onMusclePress?: (muscleId: string) => void;
  /** Alto del SVG en px — el ancho se ajusta proporcionalmente (35:93 por vista). */
  height?: number;
  showToggle?: boolean;
  /** Fuerza una vista sin toggle interno — para mostrar frontal+posterior lado a lado (2 instancias). Ignorado si showToggle=true. */
  forcedView?: ViewSide;
}

export default function MuscleBodyMap({
  data,
  selectedMuscleId,
  onMusclePress,
  height = 320,
  showToggle = true,
  forcedView,
}: MuscleBodyMapProps) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [view, setView] = useState<ViewSide>(forcedView ?? ViewSide.FRONT);

  const fillById = useMemo(() => {
    const map = new Map<string, string>();
    if (!data || data.length === 0) return map;
    const maxVolume = Math.max(1, ...data.map((d) => d.volume));
    for (const { group, volume } of data) {
      if (volume <= 0) continue;
      const intensity = Math.max(1, Math.min(10, Math.round((volume / maxVolume) * 10)));
      for (const muscleId of bodyMusclesIdsFor(group)) {
        map.set(muscleId, INTENSITY_COLORS[intensity]);
      }
    }
    return map;
  }, [data]);

  const muscles = view === ViewSide.FRONT ? FRONT_MUSCLES : BACK_MUSCLES;
  const viewBox = view === ViewSide.FRONT ? FRONT_VIEW_BOX : BACK_VIEW_BOX;
  const width = height * (35 / 93);

  return (
    <View style={styles.container}>
      {showToggle && (
        <View style={styles.toggleRow}>
          <Pressable
            style={({ pressed }) => [
              styles.toggleBtn,
              view === ViewSide.FRONT && styles.toggleBtnActive,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => setView(ViewSide.FRONT)}
          >
            <Text style={[styles.toggleText, view === ViewSide.FRONT && styles.toggleTextActive]}>Frontal</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.toggleBtn,
              view === ViewSide.BACK && styles.toggleBtnActive,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => setView(ViewSide.BACK)}
          >
            <Text style={[styles.toggleText, view === ViewSide.BACK && styles.toggleTextActive]}>Trasera</Text>
          </Pressable>
        </View>
      )}
      <Svg width={width} height={height} viewBox={viewBox}>
        {muscles.map((m) => {
          const isSelected = selectedMuscleId === m.id;
          const fill = isSelected ? '#f97316' : fillById.get(m.id) ?? NEUTRAL_FILL;
          return (
            <Path
              key={m.id}
              d={m.path}
              fill={fill}
              stroke={isSelected ? SELECTED_STROKE : 'transparent'}
              strokeWidth={isSelected ? 0.3 : 0}
              onPress={onMusclePress ? () => onMusclePress(m.id) : undefined}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { alignItems: 'center' },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: C.surface,
      borderRadius: RADIUS.sm,
      padding: 4,
      marginBottom: 12,
      gap: 4,
    },
    toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.xs },
    toggleBtnActive: { backgroundColor: C.accentBlack },
    toggleText: { fontFamily: FONT.semiBold, fontSize: 12, color: C.textSecondary },
    toggleTextActive: { color: C.accentBlackForeground },
  });
}
