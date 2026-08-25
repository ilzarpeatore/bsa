import React, { useMemo } from 'react';
import {  View, Text, StyleSheet, Pressable  } from 'react-native';
import { FONT, RADIUS } from '../pages/migrated/theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';

export interface DaySelectorItem {
  /** YYYY-MM-DD */
  date: string;
  dayLetter: string;
  dayNumber: string;
}

// toLocalISODate/buildDayRange/buildWeekRange viven en ./dayRange.ts (no en este
// archivo) para que este módulo solo exporte el componente y así Fast Refresh
// pueda preservar su estado.

interface DaySelectorStripProps {
  days: DaySelectorItem[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export default function DaySelectorStrip({ days, selectedDate, onSelect }: DaySelectorStripProps) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.row}>
      {days.map((d) => {
        const isSelected = d.date === selectedDate;
        return (
          <Pressable
            key={d.date}
            style={({ pressed }) => [s.item, pressed && { opacity: 0.75 }]}
            onPress={() => onSelect(d.date)}
          >
            <Text style={s.letter}>{d.dayLetter}</Text>
            {isSelected ? (
              <View style={s.selectedCircle}>
                <Text style={s.selectedNumber}>{d.dayNumber}</Text>
              </View>
            ) : (
              <View style={s.card}>
                <Text style={s.number}>{d.dayNumber}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  item: { alignItems: 'center', width: 44 },
  letter: { fontFamily: FONT.medium, fontSize: 12, color: C.textSecondary, marginBottom: 6 },
  card: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontFamily: FONT.bold, fontSize: 15, color: C.textPrimary },
  selectedCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: C.accentBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedNumber: { fontFamily: FONT.bold, fontSize: 15, color: '#FFFFFF' },
  });
}
