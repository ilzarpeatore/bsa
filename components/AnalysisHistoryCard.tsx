import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { ExerciseAnalysisSession } from '../api/exerciseInfo';

interface Props {
  session: ExerciseAnalysisSession;
}

// Clave con la que el backend marca el PR de carga dentro de
// prs_this_session (ver docs/pantalla ejercicio.md, seccion 8.1).
const LOAD_PR_KEY = 'carga_maxima';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnalysisHistoryCard({ session }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    session.sets.forEach((set) => {
      Object.keys(set).forEach((k) => {
        if (k !== 'set_number') keys.add(k);
      });
    });
    return Array.from(keys);
  }, [session.sets]);

  const hasPr = session.prs_this_session && session.prs_this_session.length > 0;

  // prs_this_session solo indica que hubo PR de carga en ALGUN punto de la
  // sesion, no en que serie concreta — se aproxima marcando la(s) serie(s)
  // con el valor de carga mas alto de esa sesion, igual que hace
  // bestValueForMetric() en exercise_info_screen.tsx para la grafica.
  const loadPrValue = useMemo(() => {
    if (!session.prs_this_session?.includes(LOAD_PR_KEY)) return null;
    const nums = session.sets.reduce<number[]>((acc, s) => {
      const n = Number(s.carga);
      if (Number.isFinite(n)) acc.push(n);
      return acc;
    }, []);
    return nums.length > 0 ? Math.max(...nums) : null;
  }, [session]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
        {session.workout_title ? (
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {session.workout_title}
          </Text>
        ) : null}
        {hasPr ? (
          <View style={styles.prBadge}>
            <Ionicons name="trophy" size={11} color="#FFFFFF" />
            <Text style={styles.prBadgeText}>PR</Text>
          </View>
        ) : null}
      </View>

      {columns.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.headCell, styles.serieCol, styles.serieText]}>#</Text>
            {columns.map((col) => (
              <Text key={col} style={[styles.headCell, styles.metricCol]}>
                {col}
              </Text>
            ))}
          </View>
          {session.sets.map((set, idx) => {
            const isLoadPrRow = loadPrValue !== null && Number(set.carga) === loadPrValue;
            return (
              <View key={set.set_number} style={styles.tableRow}>
                <View style={[styles.serieCol, styles.serieCellWrap]}>
                  <Text style={[styles.cell, styles.serieText]}>{set.set_number ?? idx + 1}</Text>
                  {isLoadPrRow ? (
                    <Ionicons name="trophy" size={12} color={C.warning40} style={styles.trophyIcon} />
                  ) : null}
                </View>
                {columns.map((col) => (
                  <Text key={col} style={[styles.cell, styles.metricCol, col === 'carga' && isLoadPrRow && styles.cellPr]}>
                    {set[col] ?? '-'}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export const AnalysisHistoryCardMem = React.memo(AnalysisHistoryCard);

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  card: {
    backgroundColor: C.surfaceLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  date: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.white,
  },
  workoutTitle: {
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: C.textSecondary,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    backgroundColor: C.brand50,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  prBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 10,
    color: C.white,
  },
  table: {},
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  headCell: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
    color: C.textSecondary,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  cell: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: C.white,
    textAlign: 'center',
  },
  serieCol: { width: 28 },
  serieText: { textAlign: 'left' },
  serieCellWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trophyIcon: { marginTop: -1 },
  metricCol: { flex: 1 },
  cellPr: { fontFamily: FONT.bold, color: C.warning40 },
  });
}
