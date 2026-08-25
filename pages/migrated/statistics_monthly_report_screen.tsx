import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Button, ButtonText } from '@components/ui/button';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Card } from '@components/ui/card';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { statisticsApi, PeriodStats, MonthlySessionItem, MonthlyPrEvent } from '../../api/statistics';
import { muscleVolumeApi, MuscleVolumeGroup, MuscleVolumeByDate } from '../../api/muscleVolume';
import { toLocalISODate } from '../../components/dayRange';
import SimpleBottomSheet from '../../components/SimpleBottomSheet';

interface Props {
  navigation?: any;
  route?: any;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const RECORD_TYPE_LABEL: Record<string, string> = {
  max_weight: 'Peso máximo',
  max_1rm: '1RM estimado',
  max_volume: 'Volumen en una serie',
};

const ZERO_PERIOD: PeriodStats = { sessionsCount: 0, durationSeconds: 0, avgDurationSeconds: 0, volumeKg: 0 };

function formatDuration(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}
function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function DeltaText({ current, previous, format }: { current: number; previous: number; format: (n: number) => string }) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const delta = current - previous;
  if (previous === 0 && current === 0) return <Text style={styles.deltaNeutral}>—</Text>;
  const positive = delta >= 0;
  return (
    <Text style={positive ? styles.deltaUp : styles.deltaDown}>
      {positive ? '↑' : '↓'} {format(Math.abs(delta))} vs mes anterior
    </Text>
  );
}

export default function StatisticsMonthlyReportScreen(props: Props) {
  const { navigation } = props;
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const today = useMemo(() => new Date(), []);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [stats, setStats] = useState<PeriodStats>(ZERO_PERIOD);
  const [prevStats, setPrevStats] = useState<PeriodStats>(ZERO_PERIOD);
  const [totalSeries, setTotalSeries] = useState(0);
  const [prevTotalSeries, setPrevTotalSeries] = useState(0);
  const [muscles, setMuscles] = useState<MuscleVolumeGroup[]>([]);
  const [prevMuscles, setPrevMuscles] = useState<MuscleVolumeGroup[]>([]);
  const [volumeByDate, setVolumeByDate] = useState<MuscleVolumeByDate[]>([]);
  const [sessions, setSessions] = useState<MonthlySessionItem[]>([]);
  const [prEvents, setPrEvents] = useState<MonthlyPrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // "Ver más" abre un modal con la lista completa en vez de desplegarla
  // inline en el scroll principal — con muchas marcas/entrenamientos ese
  // despliegue inline se convertía en una lista interminable dentro de la
  // pantalla (reportado por el usuario). El modal aisla el scroll de la lista.
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
  const [prsModalVisible, setPrsModalVisible] = useState(false);

  const isCurrentMonth = monthAnchor.getFullYear() === today.getFullYear() && monthAnchor.getMonth() === today.getMonth();
  const isFutureMonth = monthAnchor > today;

  useEffect(() => {
    if (isFutureMonth) return;
    let active = true;
    setIsLoading(true);

    const year = monthAnchor.getFullYear();
    const month0 = monthAnchor.getMonth();
    const firstDay = new Date(year, month0, 1);
    const lastDay = new Date(year, month0 + 1, 0);
    const end = isCurrentMonth ? today : lastDay;
    const days = Math.round((end.getTime() - firstDay.getTime()) / 86400000) + 1;
    const endISO = toLocalISODate(end);

    const prevMonthDate = new Date(year, month0 - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth0 = prevMonthDate.getMonth();
    const prevDays = daysInMonth(prevYear, prevMonth0);
    const prevEnd = new Date(prevYear, prevMonth0 + 1, 0);
    const prevEndISO = toLocalISODate(prevEnd);

    Promise.all([
      statisticsApi.getMyPeriodStats(days, endISO),
      statisticsApi.getMyPeriodStats(prevDays, prevEndISO),
      muscleVolumeApi.getMy(days, endISO),
      muscleVolumeApi.getMy(prevDays, prevEndISO),
      statisticsApi.getMyMonthlyExtras(year, month0 + 1),
    ])
      .then(([statsRes, prevStatsRes, volRes, prevVolRes, extrasRes]) => {
        if (!active) return;
        setStats(statsRes.data?.data || ZERO_PERIOD);
        setPrevStats(prevStatsRes.data?.data || ZERO_PERIOD);
        const volData = volRes.data?.data || volRes.data;
        const prevVolData = prevVolRes.data?.data || prevVolRes.data;
        setTotalSeries(volData?.totalSeries || 0);
        setPrevTotalSeries(prevVolData?.totalSeries || 0);
        setMuscles(volData?.volumeByMuscle || []);
        setPrevMuscles(prevVolData?.volumeByMuscle || []);
        setVolumeByDate(volData?.volumeByDate || []);
        const extras = extrasRes.data?.data;
        setSessions(extras?.sessions || []);
        setPrEvents(extras?.prEvents || []);
      })
      .catch(() => {
        if (!active) return;
        setStats(ZERO_PERIOD);
        setPrevStats(ZERO_PERIOD);
        setTotalSeries(0);
        setPrevTotalSeries(0);
        setMuscles([]);
        setPrevMuscles([]);
        setVolumeByDate([]);
        setSessions([]);
        setPrEvents([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthAnchor]);

  const weeklyBreakdown = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    volumeByDate.forEach((d) => {
      const day = Number(d.date.slice(8, 10));
      const idx = Math.min(4, Math.floor((day - 1) / 7));
      buckets[idx] += d.volume;
    });
    const lastWeek = Math.min(4, Math.floor((daysInMonth(monthAnchor.getFullYear(), monthAnchor.getMonth()) - 1) / 7));
    return buckets.slice(0, lastWeek + 1).map((volume, i) => ({ label: `Sem ${i + 1}`, volume }));
  }, [volumeByDate, monthAnchor]);
  const maxWeekVolume = Math.max(1, ...weeklyBreakdown.map((w) => w.volume));

  const { musclesUp, musclesDown } = useMemo(() => {
    const prevByGroup = new Map(prevMuscles.map((m) => [m.group, m.volume]));
    const allGroups = new Set([...muscles.map((m) => m.group), ...prevMuscles.map((m) => m.group)]);
    const deltas = Array.from(allGroups).map((group) => {
      const current = muscles.find((m) => m.group === group)?.volume ?? 0;
      const previous = prevByGroup.get(group) ?? 0;
      return { group, current, previous, delta: current - previous };
    });
    const up = deltas.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    const down = deltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
    return { musclesUp: up, musclesDown: down };
  }, [muscles, prevMuscles]);

  const exercisesWithProgress = useMemo(() => new Set(prEvents.map((e) => e.exercise_id)).size, [prEvents]);
  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1)), [sessions]);
  const visibleSessions = sortedSessions.slice(0, 4);
  const visiblePrs = prEvents.slice(0, 4);

  const goPrevMonth = () => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HStack className="items-center justify-between px-3 py-3">
        <Button variant="ghost" size="icon" onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} className="text-foreground" />
        </Button>
        <Text style={styles.appBarTitle} numberOfLines={1}>
          Informe mensual
        </Text>
        <Box style={styles.iconBtn} />
      </HStack>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HStack space="lg" className="items-center justify-center" style={{ marginTop: 8, marginBottom: 8 }}>
          <Pressable onPress={goPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevron-back" size={18} className="text-muted-foreground" />
          </Pressable>
          <Text style={styles.monthNavLabel}>
            {MONTHS_ES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
          </Text>
          <Pressable onPress={goNextMonth} disabled={isCurrentMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevron-forward" size={18} color={isCurrentMonth ? C.border : C.textSecondary} />
          </Pressable>
        </HStack>

        {isLoading ? (
          <ActivityIndicator size="large" color={C.textSecondary} style={{ paddingVertical: 60 }} />
        ) : (
          <>
            {/* KPIs con comparativa vs mes anterior */}
            <HStack space="md" className="flex-wrap" style={{ marginTop: 12 }}>
              <Card variant="outline" className="bg-muted p-4" style={{ width: '47%' }}>
                <Text style={styles.kpiLabel}>Entrenamientos</Text>
                <Text style={styles.kpiValue}>{stats.sessionsCount}</Text>
                <DeltaText current={stats.sessionsCount} previous={prevStats.sessionsCount} format={(n) => String(Math.round(n))} />
              </Card>
              <Card variant="outline" className="bg-muted p-4" style={{ width: '47%' }}>
                <Text style={styles.kpiLabel}>Duración</Text>
                <Text style={styles.kpiValue}>{formatDuration(stats.durationSeconds)}</Text>
                <DeltaText current={stats.durationSeconds} previous={prevStats.durationSeconds} format={formatDuration} />
              </Card>
              <Card variant="outline" className="bg-muted p-4" style={{ width: '47%' }}>
                <Text style={styles.kpiLabel}>Volumen</Text>
                <Text style={styles.kpiValue}>{formatVolume(stats.volumeKg)}</Text>
                <DeltaText current={stats.volumeKg} previous={prevStats.volumeKg} format={formatVolume} />
              </Card>
              <Card variant="outline" className="bg-muted p-4" style={{ width: '47%' }}>
                <Text style={styles.kpiLabel}>Series</Text>
                <Text style={styles.kpiValue}>{totalSeries}</Text>
                <DeltaText current={totalSeries} previous={prevTotalSeries} format={(n) => String(Math.round(n))} />
              </Card>
            </HStack>

            {/* Desglose semanal */}
            {weeklyBreakdown.length > 0 && (
              <Card variant="elevated" style={{ marginTop: 16 }}>
                <Text style={styles.cardTitle}>Desglose semanal</Text>
                <HStack className="items-end justify-around" style={{ height: 120 }}>
                  {weeklyBreakdown.map((w) => {
                    const heightPct = maxWeekVolume > 0 ? Math.max(w.volume > 0 ? 6 : 2, (w.volume / maxWeekVolume) * 100) : 2;
                    return (
                      <VStack key={w.label} className="flex-1 items-center justify-end" style={{ height: '100%' }}>
                        <VStack className="flex-1 justify-end" style={{ width: 22 }}>
                          <Box style={[styles.weekBarFill, { height: `${heightPct}%` }]} />
                        </VStack>
                        <Text style={styles.weekLabel}>{w.label}</Text>
                      </VStack>
                    );
                  })}
                </HStack>
              </Card>
            )}

            {/* PRs y progreso */}
            <Card variant="elevated" style={{ marginTop: 16 }}>
              <Text style={styles.cardTitle}>Progreso y marcas</Text>
              <HStack space="md" style={{ marginBottom: 8 }}>
                <Card variant="ghost" className="flex-1 items-center bg-muted rounded-2xl p-3.5">
                  <Text style={styles.progressStatValue}>{exercisesWithProgress}</Text>
                  <Text style={styles.progressStatLabel}>ejercicios con progreso</Text>
                </Card>
                <Card variant="ghost" className="flex-1 items-center bg-muted rounded-2xl p-3.5">
                  <Text style={styles.progressStatValue}>{prEvents.length}</Text>
                  <Text style={styles.progressStatLabel}>marcas personales batidas</Text>
                </Card>
              </HStack>
              {prEvents.length > 0 && (
                <>
                  {visiblePrs.map((p) => (
                    <HStack key={`${p.exercise_id}-${p.record_type}`} className="items-center py-2.5" style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 8 }}>
                      <Icon name="trophy" size={14} color={C.orange} style={{ marginRight: 8 }} />
                      <Box style={{ flex: 1 }}>
                        <Text style={styles.prTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                        <Text style={styles.prSubtitle}>
                          {RECORD_TYPE_LABEL[p.record_type] || p.record_type}: {p.value} kg
                          {p.achieved_at ? ` · ${formatDate(p.achieved_at)}` : ''}
                        </Text>
                      </Box>
                    </HStack>
                  ))}
                  {prEvents.length > 4 && (
                    <Button variant="link" className="p-0" style={{ paddingTop: 12 }} onPress={() => setPrsModalVisible(true)}>
                      <ButtonText style={styles.expandBtnText}>{`Ver las ${prEvents.length}`}</ButtonText>
                    </Button>
                  )}
                </>
              )}
            </Card>

            {/* Músculos que suben / bajan */}
            {(musclesUp.length > 0 || musclesDown.length > 0) && (
              <Card variant="elevated" style={{ marginTop: 16 }}>
                <Text style={styles.cardTitle}>Cambios de volumen por músculo</Text>
                {musclesUp.length > 0 && (
                  <Box style={styles.muscleDeltaGroup}>
                    <Text style={styles.muscleDeltaGroupLabel}>Suben</Text>
                    {musclesUp.map((m) => (
                      <HStack key={m.group} className="items-center justify-between py-1.5">
                        <Text style={styles.muscleDeltaName} numberOfLines={1}>
                          {m.group}
                        </Text>
                        <Text style={styles.deltaUp}>↑ {formatVolume(m.delta)}</Text>
                      </HStack>
                    ))}
                  </Box>
                )}
                {musclesDown.length > 0 && (
                  <Box style={styles.muscleDeltaGroup}>
                    <Text style={styles.muscleDeltaGroupLabel}>Bajan</Text>
                    {musclesDown.map((m) => (
                      <HStack key={m.group} className="items-center justify-between py-1.5">
                        <Text style={styles.muscleDeltaName} numberOfLines={1}>
                          {m.group}
                        </Text>
                        <Text style={styles.deltaDown}>↓ {formatVolume(Math.abs(m.delta))}</Text>
                      </HStack>
                    ))}
                  </Box>
                )}
              </Card>
            )}

            {/* Lista de entrenamientos */}
            <Card variant="elevated" style={{ marginTop: 16 }}>
              <Text style={styles.cardTitle}>Entrenamientos del mes</Text>
              {sortedSessions.length === 0 ? (
                <Text style={styles.emptyText}>Sin entrenamientos registrados este mes.</Text>
              ) : (
                <>
                  {visibleSessions.map((sess) => (
                    <HStack key={sess.date} className="items-center py-2.5" style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 8 }}>
                      <Box style={styles.sessionDateWrap}>
                        <Text style={styles.sessionDate}>{formatDate(sess.date)}</Text>
                      </Box>
                      <Box style={{ flex: 1 }}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>
                          {sess.title}
                        </Text>
                        <Text style={styles.sessionSubtitle}>
                          {formatDuration(sess.duration_seconds)} · {formatVolume(sess.volume_kg)}
                        </Text>
                      </Box>
                    </HStack>
                  ))}
                  {sortedSessions.length > 4 && (
                    <Button variant="link" className="p-0" style={{ paddingTop: 12 }} onPress={() => setSessionsModalVisible(true)}>
                      <ButtonText style={styles.expandBtnText}>{`Ver los ${sortedSessions.length}`}</ButtonText>
                    </Button>
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <SimpleBottomSheet visible={prsModalVisible} onClose={() => setPrsModalVisible(false)}>
        <Box style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Progreso y marcas ({prEvents.length})</Text>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          {prEvents.map((p) => (
            <HStack key={`${p.exercise_id}-${p.record_type}`} className="items-center py-2.5" style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 8 }}>
              <Icon name="trophy" size={14} color={C.orange} style={{ marginRight: 8 }} />
              <Box style={{ flex: 1 }}>
                <Text style={styles.prTitle} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={styles.prSubtitle}>
                  {RECORD_TYPE_LABEL[p.record_type] || p.record_type}: {p.value} kg
                  {p.achieved_at ? ` · ${formatDate(p.achieved_at)}` : ''}
                </Text>
              </Box>
            </HStack>
          ))}
        </ScrollView>
      </SimpleBottomSheet>

      <SimpleBottomSheet visible={sessionsModalVisible} onClose={() => setSessionsModalVisible(false)}>
        <Box style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Entrenamientos del mes ({sortedSessions.length})</Text>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          {sortedSessions.map((sess) => (
            <HStack key={sess.date} className="items-center py-2.5" style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 8 }}>
              <Box style={styles.sessionDateWrap}>
                <Text style={styles.sessionDate}>{formatDate(sess.date)}</Text>
              </Box>
              <Box style={{ flex: 1 }}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {sess.title}
                </Text>
                <Text style={styles.sessionSubtitle}>
                  {formatDuration(sess.duration_seconds)} · {formatVolume(sess.volume_kg)}
                </Text>
              </Box>
            </HStack>
          ))}
        </ScrollView>
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  appBarTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: FONT.bold, color: C.textPrimary, marginHorizontal: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  monthNavLabel: { fontFamily: FONT.semiBold, fontSize: 16, color: C.textPrimary, minWidth: 150, textAlign: 'center' },
  kpiLabel: { fontFamily: FONT.medium, fontSize: 13, color: C.textSecondary },
  // lineHeight explícito: Gilroy-ExtraBold/Black recortan el glifo a estos
  // tamaños si se deja el lineHeight por defecto (mismo bug documentado en
  // workout_summary_screen.tsx).
  kpiValue: { fontFamily: FONT.extraBold, fontSize: 20, lineHeight: 24, color: C.textPrimary, marginTop: 5 },
  deltaUp: { fontFamily: FONT.semiBold, fontSize: 11, color: C.success60, marginTop: 4 },
  deltaDown: { fontFamily: FONT.semiBold, fontSize: 11, color: C.destructive60, marginTop: 4 },
  deltaNeutral: { fontFamily: FONT.semiBold, fontSize: 11, color: C.textSecondary, marginTop: 4 },
  cardTitle: { fontFamily: FONT.bold, fontSize: 14, color: C.textPrimary, marginBottom: 16 },
  emptyText: { fontFamily: FONT.regular, fontSize: 13, color: C.textSecondary, textAlign: 'center', paddingVertical: 12 },

  weekBarFill: { width: 22, backgroundColor: C.orange, borderRadius: 6 },
  weekLabel: { fontFamily: FONT.medium, fontSize: 11, color: C.textSecondary, marginTop: 8 },

  progressStatValue: { fontFamily: FONT.extraBold, fontSize: 22, lineHeight: 26, color: C.textPrimary },
  progressStatLabel: { fontFamily: FONT.regular, fontSize: 11, color: C.textSecondary, marginTop: 3, textAlign: 'center' },
  prTitle: { fontFamily: FONT.semiBold, fontSize: 13.5, color: C.textPrimary },
  prSubtitle: { fontFamily: FONT.regular, fontSize: 11.5, color: C.textSecondary, marginTop: 2 },

  muscleDeltaGroup: { marginTop: 8 },
  muscleDeltaGroupLabel: { fontFamily: FONT.semiBold, fontSize: 11, color: C.textSecondary, letterSpacing: 0.4, marginBottom: 8 },
  muscleDeltaName: { flex: 1, fontFamily: FONT.medium, fontSize: 13, color: C.textPrimary, marginRight: 8 },

  sessionDateWrap: { width: 56 },
  sessionDate: { fontFamily: FONT.semiBold, fontSize: 12.5, color: C.textSecondary, textTransform: 'capitalize' },
  sessionTitle: { fontFamily: FONT.semiBold, fontSize: 14, color: C.textPrimary },
  sessionSubtitle: { fontFamily: FONT.regular, fontSize: 12, color: C.textSecondary, marginTop: 2 },

  expandBtnText: { fontFamily: FONT.semiBold, fontSize: 12.5, color: C.accentBlack },

  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray60, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontFamily: FONT.bold, color: C.textPrimary, textAlign: 'center', marginBottom: 8, paddingHorizontal: 24 },
  modalScroll: { maxHeight: 420, paddingHorizontal: 24 },
  modalScrollContent: { paddingBottom: 24 },
  });
}
