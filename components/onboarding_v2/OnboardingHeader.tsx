import React from 'react';
import {  View, Pressable, StyleSheet  } from 'react-native';
import {  Ionicons  } from '@expo/vector-icons';
import {  useSafeAreaInsets  } from 'react-native-safe-area-context';
import { C, RADIUS } from '../../pages/migrated/theme';
interface Props {
  onBack?: () => void;
  stageCount: number;
  currentStageIndex: number; // 0-based
  stageProgress: number; // 0-1, progreso dentro de la etapa actual
}

// Círculo "atrás" + barra de progreso segmentada (una franja por etapa,
// según las capturas de referencia del usuario) -- cada franja se rellena
// del todo al completar esa etapa, y proporcionalmente mientras se está en
// ella.
export default function OnboardingHeader({ onBack, stageCount, currentStageIndex, stageProgress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 12 }]}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
      <View style={styles.segments}>
        {Array.from({ length: stageCount }, (_, i) => {
          const fillRatio = i < currentStageIndex ? 1 : i === currentStageIndex ? stageProgress : 0;
          return (
            <View key={i} style={styles.segmentTrack}>
              <View style={[styles.segmentFill, { width: `${fillRatio * 100}%` }]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
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
});
