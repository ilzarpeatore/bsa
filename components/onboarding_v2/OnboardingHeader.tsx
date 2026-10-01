import React, { useEffect } from 'react';
import {  View, Text, Pressable, StyleSheet  } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {  Ionicons  } from '@expo/vector-icons';
import {  useSafeAreaInsets  } from 'react-native-safe-area-context';
import { C, FONT, RADIUS } from '../../pages/migrated/theme';
interface Props {
  onBack?: () => void;
  stageCount: number;
  currentStageIndex: number; // 0-based
  stageProgress: number; // 0-1, progreso dentro de la etapa actual
  label?: string; // nombre de la sección actual
}

// Círculo "atrás" + barra de progreso segmentada (una franja por sección) --
// cada franja se rellena del todo al completar esa sección, y
// proporcionalmente mientras se está en ella. El relleno se anima
// (2026-09-29): ver avanzar la barra refuerza la sensación de progreso.
export default function OnboardingHeader({ onBack, stageCount, currentStageIndex, stageProgress, label }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 12 }}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.segments}>
          {Array.from({ length: stageCount }, (_, i) => (
            <Segment
              key={i}
              fillRatio={i < currentStageIndex ? 1 : i === currentStageIndex ? stageProgress : 0}
            />
          ))}
        </View>
      </View>
      {label ? (
        <Text style={styles.label}>
          {label} · {currentStageIndex + 1} de {stageCount}
        </Text>
      ) : null}
    </View>
  );
}

function Segment({ fillRatio }: { fillRatio: number }) {
  const width = useSharedValue(fillRatio);
  useEffect(() => {
    width.value = withTiming(fillRatio, { duration: 350 });
  }, [fillRatio, width]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={styles.segmentTrack}>
      <Animated.View style={[styles.segmentFill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segmentTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 3, backgroundColor: C.accentBlack },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 12.5,
    color: C.textSecondary,
    paddingLeft: 72,
    paddingTop: 6,
    paddingBottom: 12,
  },
});
