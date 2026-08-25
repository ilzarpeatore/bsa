import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '@components/ScreenHeader';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WEEK_DATA = [
  { day: 'Lun', hours: 7.5, isToday: true },
  { day: 'Mar', hours: 8.0, isToday: false },
  { day: 'Mié', hours: 6.5, isToday: false },
  { day: 'Jue', hours: 7.8, isToday: true },
  { day: 'Vie', hours: 7.2, isToday: false },
  { day: 'Sáb', hours: 8.5, isToday: false },
  { day: 'Dom', hours: 6.0, isToday: false },
];

type Styles = ReturnType<typeof createStyles>;
type Colors = ReturnType<typeof useAppColorMode>['colors'];

// Subcomponentes fuera del componente principal (crearlos dentro del render
// dispara "Cannot create components during render" -- react-hooks/static-
// components -- y reinicia su estado en cada render) -- reciben `styles`/`C`
// como props en vez de capturarlos por clausura, ya que ambos son ahora
// dinámicos (dependen del tema).
function SleepStat({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.statContainer}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PhaseRow({ color, label, duration, percentage, styles }: { color: string; label: string; duration: string; percentage: number; styles: Styles }) {
  return (
    <View style={styles.phaseRow}>
      <View style={[styles.phaseDot, { backgroundColor: color }]} />
      <Text style={styles.phaseLabel}>{label}</Text>
      <View style={styles.phaseBarBg}>
        <View style={[styles.phaseBarFill, { width: `${percentage * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.phaseDuration}>{duration}</Text>
    </View>
  );
}

function WeekBar({ day, hours, isToday, styles, C }: { day: string; hours: number; isToday: boolean; styles: Styles; C: Colors }) {
  const maxHours = 9.0;
  const heightFactor = hours / maxHours;
  const barHeight = 80 * heightFactor;

  return (
    <View style={styles.weekBarCol}>
      {isToday && (
        <View style={styles.todayBadge}>
          <Text style={styles.todayBadgeText}>Hoy</Text>
        </View>
      )}
      <View style={{ height: 4 }} />
      <View
        style={[
          styles.weekBar,
          {
            height: barHeight,
            backgroundColor: isToday ? C.orange : C.gray70,
          },
        ]}
      />
      <View style={{ height: 4 }} />
      <Text
        style={[
          styles.weekBarHours,
          { color: isToday ? C.orange : C.gray30 },
        ]}
      >
        {Math.floor(hours)}h
      </Text>
    </View>
  );
}

export default function SleepMonitoringScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const PHASES = [
    { color: C.blue, label: 'Sueño profundo', duration: '2h 15m', percentage: 0.29 },
    { color: C.orange, label: 'Sueño ligero', duration: '3h 40m', percentage: 0.48 },
    { color: C.success, label: 'Sueño REM', duration: '1h 30m', percentage: 0.19 },
    { color: C.gray30, label: 'Despierto', duration: '17m', percentage: 0.04 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Monitor de Sueño"
        hideBack
        rightAction={<Ionicons name="ellipsis-horizontal" size={24} color={C.gray30} onPress={() => {}} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.paddingH}>
          <LinearGradient
            colors={[C.surfaceLight, C.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>Calidad del Sueño</Text>
            <View style={styles.qualityCircle}>
              <View style={styles.qualityCircleBorder}>
                <Text style={styles.qualityTime}>7h 42m</Text>
                <Text style={styles.qualityLabel}>Buena</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <SleepStat label="Acostarse" value="10:30 PM" styles={styles} />
              <SleepStat label="Despertar" value="6:12 AM" styles={styles} />
              <SleepStat label="Duración" value="7h 42m" styles={styles} />
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 24 }} />

        <View style={styles.paddingH}>
          <Text style={styles.sectionTitle}>Fases del Sueño</Text>
          <View style={{ height: 16 }} />
          <View style={styles.phasesCard}>
            {PHASES.map((phase, i) => (
              <React.Fragment key={phase.label}>
                {i > 0 && <View style={{ height: 12 }} />}
                <PhaseRow {...phase} styles={styles} />
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />

        <View style={styles.paddingH}>
          <Text style={styles.sectionTitle}>Esta Semana</Text>
          <View style={{ height: 16 }} />
          <View style={styles.weekChartContainer}>
            <View style={styles.weekBarsRow}>
              {WEEK_DATA.map((d) => (
                <WeekBar key={d.day} {...d} styles={styles} C={C} />
              ))}
            </View>
            <View style={styles.weekLabelsRow}>
              {WEEK_DATA.map((d) => (
                <Text key={d.day} style={styles.weekLabel}>{d.day}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
  },
  appBarTitle: { fontSize: 20, fontFamily: FONT.bold, color: C.white },
  scrollContent: { paddingBottom: 32 },
  paddingH: { paddingHorizontal: 20 },
  summaryCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  summaryTitle: { fontSize: 14, color: C.gray30, fontFamily: FONT.regular },
  qualityCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: 'rgba(255,152,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  qualityCircleBorder: { alignItems: 'center' },
  qualityTime: { fontSize: 28, lineHeight: 33, fontFamily: FONT.bold, color: C.white },
  qualityLabel: { fontSize: 14, color: C.orange, fontFamily: FONT.semiBold },
  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', marginTop: 16 },
  statContainer: { alignItems: 'center' },
  statValue: { fontSize: 15, fontFamily: FONT.semiBold, color: C.white },
  statLabel: { fontSize: 11, color: C.gray30, marginTop: 4, fontFamily: FONT.regular },
  sectionTitle: { fontSize: 18, fontFamily: FONT.bold, color: C.white },
  phasesCard: { backgroundColor: C.surface, borderRadius: 16, padding: 20 },
  phaseRow: { flexDirection: 'row', alignItems: 'center' },
  phaseDot: { width: 12, height: 12, borderRadius: 3 },
  phaseLabel: { fontSize: 14, color: C.white, marginLeft: 12, flex: 1, fontFamily: FONT.regular },
  phaseBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: C.gray70,
    borderRadius: 4,
    overflow: 'hidden',
  },
  phaseBarFill: { height: 6, borderRadius: 4 },
  phaseDuration: { fontSize: 13, color: C.gray30, fontFamily: FONT.medium, textAlign: 'right', width: 50, marginLeft: 12 },
  weekChartContainer: {},
  weekBarsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  weekBarCol: { alignItems: 'center', flex: 1 },
  todayBadge: { backgroundColor: C.orange, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  todayBadgeText: { fontSize: 9, color: '#FFFFFF', fontFamily: FONT.regular },
  weekBar: { width: 32, borderRadius: 8 },
  weekBarHours: { fontSize: 10, fontFamily: FONT.semiBold, marginTop: 4 },
  weekLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  weekLabel: { fontSize: 11, color: C.gray30, fontFamily: FONT.regular, textAlign: 'center', flex: 1 },
  });
}
