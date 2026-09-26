import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { useAppColorMode } from '@helper/useAppColorMode';
import {
  DateRange,
  MONTH_NAMES,
  WEEKDAYS_SHORT,
  monthGrid,
  nextRange,
  parseDateStr,
  toDateStr,
} from '@helper/shoppingDates';

// Calendario de un mes para elegir un día o un rango (lista de la compra). Toques: el
// primero elige un día, el segundo cierra el rango (en cualquier orden) y otro más vuelve a
// empezar -- ver nextRange(). Sin dependencias nativas.

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: Props) {
  const { colors: C } = useAppColorMode();
  const today = useMemo(() => toDateStr(new Date()), []);
  const startDate = parseDateStr(value.start);
  const [cursor, setCursor] = useState({ year: startDate.getFullYear(), month: startDate.getMonth() + 1 });

  // Un atajo (o un toque en otro mes) que cambia el inicio lleva el calendario a ese mes.
  useEffect(() => {
    const d = parseDateStr(value.start);
    setCursor({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }, [value.start]);

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const weeks = useMemo(() => {
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);

  const shiftMonth = (delta: number) => {
    const m = cursor.month - 1 + delta;
    setCursor({ year: cursor.year + Math.floor(m / 12), month: (((m % 12) + 12) % 12) + 1 });
  };

  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Icon name="chevron-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text weight="bold">
          {MONTH_NAMES[cursor.month - 1]} {cursor.year}
        </Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Icon name="chevron-forward" size={20} color={C.textPrimary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <View key={`${d}${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text size="xs" muted>{d}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => {
            if (!date) return <View key={`e${wi}-${di}`} style={{ flex: 1, height: 38 }} />;
            const inRange = date >= value.start && date <= value.end;
            const edge = date === value.start || date === value.end;
            const dayNumber = parseInt(date.slice(8, 10), 10);
            return (
              <Pressable
                key={date}
                onPress={() => onChange(nextRange(value, date))}
                accessibilityRole="button"
                accessibilityLabel={`Día ${dayNumber} de ${MONTH_NAMES[cursor.month - 1]}`}
                accessibilityState={{ selected: inRange }}
                style={{ flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: edge ? C.accentBlack : inRange ? C.surfaceLight : 'transparent',
                    borderWidth: date === today && !edge ? 1 : 0,
                    borderColor: C.textSecondary,
                  }}
                >
                  <Text
                    weight={edge ? 'bold' : 'medium'}
                    size="sm"
                    style={{ color: edge ? C.accentBlackForeground : C.textPrimary }}
                  >
                    {dayNumber}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
