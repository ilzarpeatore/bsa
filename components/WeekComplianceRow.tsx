import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@components/ui/icon';
import AnimatedRing from '@components/AnimatedRing';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// HabitLogLike/computeWeekCompliance/computeWeekProgress viven en
// ./weekCompliance.ts (no en este archivo) para que este módulo solo exporte
// el componente y así Fast Refresh pueda preservar su estado.

interface Props {
  /** 7 booleanos, Lunes a Domingo de la semana actual. */
  completedDays: boolean[];
  /** Opcional: 7 fracciones (0..1), Lunes a Domingo -- para hábitos con
   * objetivo numérico (ver computeWeekProgress), rellena cada círculo por
   * porcentaje real en vez de solo hecho/no hecho (pedido explícito: "si el
   * hábito es leer 2 libros de 4 que la gráfica se rellene al 50%"). Cuando
   * se pasa, sustituye la lectura de `completedDays` para el relleno visual
   * (que se sigue pidiendo igualmente por compatibilidad con el resto de
   * llamadas que no tienen objetivo numérico). */
  progressDays?: number[];
  color?: string;
  size?: number;
}

/** Fila de 7 círculos de cumplimiento semanal (pedido explícito, con captura
 * de referencia de otra app, 2026-08-27: círculo con check en vez del
 * recuadro redondeado de antes, y la etiqueta del día debajo en vez de
 * encima) — mismo componente en Actividad Semanal, Hábitos (Home) y
 * `habits_list_screen.tsx`, para que las 3 pantallas se vean idénticas. No
 * incluye `DayCell` de `habit_detail_screen.tsx` a propósito: ese es un
 * widget distinto (rejilla mensual/tocable con fechas), no esta fila de
 * resumen semanal de solo lectura. */
export default function WeekComplianceRow({ completedDays, progressDays, color, size = 28 }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const resolvedColor = color ?? C.orange;
  const strokeWidth = Math.max(2, Math.round(size * 0.12));
  return (
    <View style={styles.row}>
      {DAY_LABELS.map((label, i) => {
        const done = !!completedDays[i];
        const progress = progressDays?.[i] ?? (done ? 1 : 0);
        return (
          <View key={label} style={styles.day}>
            {progressDays ? (
              <AnimatedRing size={size} strokeWidth={strokeWidth} percent={progress * 100} color={resolvedColor} trackColor={C.border} style={styles.dotSpacing}>
                {progress >= 1 && <Icon name="checkmark" size={Math.min(16, size * 0.5)} color={resolvedColor} />}
              </AnimatedRing>
            ) : (
              <View
                style={[
                  styles.dot,
                  styles.dotSpacing,
                  { width: size, height: size, borderRadius: size / 2 },
                  done && { backgroundColor: resolvedColor, borderColor: resolvedColor },
                ]}
              >
                {done && <Icon name="checkmark" size={Math.min(16, size * 0.55)} color="#FFFFFF" />}
              </View>
            )}
            <Text style={styles.label}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    day: { alignItems: 'center' },
    dot: { borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    dotSpacing: { marginBottom: 6 },
    label: { fontSize: 11, color: C.textSecondary, fontFamily: FONT.medium },
  });
}
