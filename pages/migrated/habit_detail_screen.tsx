import React, { useState, useCallback, useMemo } from 'react';
import {  StyleSheet, ScrollView, Alert, TextInput, useWindowDimensions  } from 'react-native';
import {  SafeAreaView, useSafeAreaInsets  } from 'react-native-safe-area-context';
import {  useFocusEffect  } from '@react-navigation/native';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  Card  } from '@components/ui/card';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Badge, BadgeText  } from '@components/ui/badge';
import {  Button, ButtonText  } from '@components/ui/button';
import {  Modal, ModalBackdrop, ModalContent  } from '@components/ui/modal';
import {  isGlassEffectAPIAvailable  } from '@components/ui/glass-view';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { showToast } from '@helper/toast';
import { FONT, SHADOW, RADIUS } from './theme';
import {  habitsApi, Habit, HabitLogEntry, HABIT_HISTORY_DAYS  } from '../../api/habits';
import {  habitIoniconFor  } from '../../constants/habitIcons';
import {  habitProgressRatio, habitCellColor  } from '../../constants/habitColor';

type Period = 'week' | 'month' | 'quarter' | 'half' | 'year';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: 'week', label: 'Semana', days: 7 },
  { key: 'month', label: 'Mes', days: 30 },
  { key: 'quarter', label: 'Trimestre', days: 90 },
  { key: 'half', label: 'Semestre', days: 180 },
  { key: 'year', label: 'Año', days: HABIT_HISTORY_DAYS },
];

// Estas 4 pestañas ocupan casi toda la pantalla (celdas grandes, calculadas
// con el alto real del dispositivo) — "Semana" se queda compacta a propósito,
// ya pedido así explícitamente, a diferencia del resto.
const BIG_PERIODS: Period[] = ['month', 'quarter', 'half', 'year'];

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// OJO: NUNCA usar d.toISOString() aqui. `startOfDay()` deja la fecha en
// medianoche LOCAL; convertirla despues a ISO/UTC la desplaza un dia hacia
// atras en cualquier huso horario positivo (España incluida, UTC+1/+2)
// practicamente todo el dia. Eso hacia que marcar un habito como hecho desde
// esta pantalla guardara el log bajo la fecha de AYER, y por eso nunca
// aparecia como completado en habits_list_screen.tsx (que compara contra el
// dia de hoy real). Construimos el string YYYY-MM-DD a partir de los
// componentes locales de la fecha, sin pasar por UTC.
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
/** Lunes = 0 ... Domingo = 6 (a diferencia de Date#getDay(), que empieza en domingo). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function buildLogMap(logs: HabitLogEntry[]): Map<string, HabitLogEntry> {
  const map = new Map<string, HabitLogEntry>();
  logs.forEach((l) => map.set(l.date.slice(0, 10), l));
  return map;
}

interface DayCellProps {
  date: Date;
  fillColor: string;
  isCompleted: boolean;
  future: boolean;
  size: number;
  onPress: () => void;
  showLabel?: boolean;
}

function DayCell({ date, fillColor, isCompleted, future, size, onPress, showLabel }: DayCellProps) {
  const { colors: C } = useAppColorMode();
  const cellStyles = useMemo(() => createCellStyles(C), [C]);
  return (
    <Pressable
      disabled={future}
      onPress={onPress}
      style={[
        cellStyles.cell,
        { width: size, height: size, borderRadius: size >= 24 ? size * 0.28 : 3, backgroundColor: fillColor },
        future && cellStyles.cellFuture,
      ]}
    >
      {showLabel && size >= 26 && (
        <Text style={[cellStyles.cellLabel, { fontSize: Math.min(15, size * 0.3) }, isCompleted && cellStyles.cellLabelDone]}>{date.getDate()}</Text>
      )}
      {showLabel && size >= 26 && isCompleted && (
        <Icon name="checkmark" size={Math.min(22, size * 0.42)} color="#FFFFFF" style={{ position: 'absolute' }} />
      )}
    </Pressable>
  );
}

function createCellStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    cell: { alignItems: 'center', justifyContent: 'center' },
    cellFuture: { opacity: 0.35 },
    cellLabel: { fontFamily: FONT.medium, color: C.textSecondary },
    cellLabelDone: { color: 'rgba(255,255,255,0.01)' },
  });
}

interface Props {
  navigation?: any;
  route?: any;
}

export default function HabitDetailScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const cellStyles = useMemo(() => createCellStyles(C), [C]);
  const { navigation, route } = props;
  const habitId: number | undefined = route?.params?.habitId;
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [habit, setHabit] = useState<Habit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [topSectionHeight, setTopSectionHeight] = useState(0);
  const [valueModalDate, setValueModalDate] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState('');
  const [savingValue, setSavingValue] = useState(false);

  const load = useCallback(async () => {
    if (!habitId) { setError(true); setIsLoading(false); return; }
    setIsLoading(true);
    setError(false);
    try {
      const res = await habitsApi.getMyList();
      const found = (res.data?.data ?? []).find((h) => h.id === habitId) ?? null;
      setHabit(found);
      if (!found) setError(true);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [habitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logMap = useMemo(() => (habit ? buildLogMap(habit.logs) : new Map<string, HabitLogEntry>()), [habit]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = toIso(today);

  // Hábitos con objetivo numérico (p.ej. "10.000 pasos") piden el valor real
  // conseguido ese día en vez de un simple hecho/no-hecho — así el color del
  // recuadro puede reflejar % de cumplimiento, no solo si se tocó el botón.
  const isGoalHabit = !!habit && habit.target_value != null && Number(habit.target_value) > 0;

  const toggleDay = async (date: Date) => {
    if (!habit || date > today || pendingDate) return;
    const iso = toIso(date);
    const wasCompleted = !!logMap.get(iso)?.is_completed;
    setPendingDate(iso);
    try {
      await habitsApi.logHabit(habit.id, { date: iso, is_completed: !wasCompleted });
      await load();
    } catch (e) {
      showToast('Error', { description: 'No se pudo actualizar ese día. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setPendingDate(null);
    }
  };

  const openValueModal = (date: Date) => {
    if (date > today) return;
    const iso = toIso(date);
    const existing = logMap.get(iso)?.value_logged;
    setValueInput(existing != null ? String(existing) : '');
    setValueModalDate(iso);
  };

  const handleDayPress = (date: Date) => {
    if (isGoalHabit) {
      openValueModal(date);
    } else {
      toggleDay(date);
    }
  };

  const handleQuickAdd = () => (isGoalHabit ? openValueModal(today) : toggleDay(today));

  const submitValue = async () => {
    if (!habit || !valueModalDate) return;
    const raw = valueInput.trim();
    const num = raw === '' ? 0 : Number(raw.replace(',', '.'));
    if (Number.isNaN(num) || num < 0) {
      showToast('Valor no válido', { description: 'Introduce un número válido.', variant: 'warning' });
      return;
    }
    setSavingValue(true);
    try {
      await habitsApi.logHabit(habit.id, { date: valueModalDate, value_logged: num });
      await load();
      setValueModalDate(null);
    } catch (e) {
      showToast('Error', { description: 'No se pudo guardar el registro. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setSavingValue(false);
    }
  };

  const handleDelete = () => {
    if (!habit) return;
    Alert.alert('Eliminar hábito', `¿Seguro que quieres quitar "${habit.title}" de tu lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await habitsApi.remove(habit.id);
            navigation?.goBack();
          } catch (e) {
            showToast('Error', { description: 'No se pudo eliminar el hábito.', variant: 'error' });
          }
        },
      },
    ]);
  };

  // ═══ Semana: Lunes-Domingo de la semana actual ═══════════════════════
  const weekDays = useMemo(() => {
    const monday = addDays(today, -mondayIndex(today));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [today]);

  // ═══ Mes: calendario del mes actual, con relleno de días vacíos ══════
  const monthCells = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const leadingBlanks = mondayIndex(firstOfMonth);
    const cells: (Date | null)[] = Array(leadingBlanks).fill(null);
    for (let d = 1; d <= lastOfMonth.getDate(); d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [today]);
  const monthRows = monthCells.length / 7;

  // ═══ Trimestre/Semestre/Año: heatmap por semanas (estilo contribution graph) ═══
  const heatmapWeeks = useMemo(() => {
    if (period !== 'quarter' && period !== 'half' && period !== 'year') return [];
    const cfg = PERIODS.find((p) => p.key === period)!;
    const endMonday = addDays(today, -mondayIndex(today));
    const totalWeeks = Math.ceil(cfg.days / 7);
    const startMonday = addDays(endMonday, -(totalWeeks - 1) * 7);
    const weeks: Date[][] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = addDays(startMonday, w * 7);
      weeks.push(Array.from({ length: 7 }, (_, d) => addDays(weekStart, d)));
    }
    return weeks;
  }, [period, today]);

  // ═══ Cálculo del tamaño de celda para que mes/trimestre/semestre/año
  // ocupen prácticamente toda la pantalla (a diferencia de semana, que se
  // queda compacta a propósito) — se resta lo que ya ocupan cabecera,
  // resumen+pestañas, y el botón inferior, y se reparte el resto entre las
  // filas/columnas reales de cada vista. ═══
  const footerHeight = 70 + insets.bottom;
  const headerHeight = 48 + insets.top;
  const bigAreaHeight = Math.max(160, screenHeight - headerHeight - topSectionHeight - footerHeight - 24);
  const bigAreaWidth = screenWidth - 40; // paddingHorizontal 20 a cada lado

  const monthCellSize = useMemo(() => {
    const cardPadding = 32;
    const headerRow = 28;
    const rowGaps = (monthRows - 1) * 6;
    const byHeight = (bigAreaHeight - cardPadding - headerRow - rowGaps) / monthRows;
    const byWidth = (bigAreaWidth - cardPadding - 6 * 6) / 7;
    return Math.max(30, Math.floor(Math.min(byHeight, byWidth)));
  }, [bigAreaHeight, bigAreaWidth, monthRows]);


  const rangeStats = useMemo(() => {
    if (!habit) return { completed: 0, total: 0 };
    const cfg = PERIODS.find((p) => p.key === period)!;
    const from = addDays(today, -(cfg.days - 1));
    let completed = 0;
    let total = 0;
    habit.logs.forEach((l) => {
      const d = new Date(l.date.slice(0, 10) + 'T00:00:00');
      if (d >= from && d <= today) {
        total++;
        if (l.is_completed) completed++;
      }
    });
    return { completed, total: Math.min(cfg.days, Math.round((today.getTime() - from.getTime()) / 86400000) + 1) };
  }, [habit, period, today]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Box style={styles.header}>
        <Pressable onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Volver">
          <Icon name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{habit?.title || 'Hábito'}</Text>
        <Pressable
          onPress={handleDelete}
          disabled={!habit}
          accessibilityRole="button"
          accessibilityLabel="Eliminar hábito">
          <Icon name="trash-outline" size={20} color={C.destructive} />
        </Pressable>
      </Box>

      {isLoading ? (
        <Box style={styles.center}><Spinner size="large" color={C.textPrimary} /></Box>
      ) : error || !habit ? (
        <Box style={styles.center}><Text style={styles.emptyText}>No se pudo cargar este hábito.</Text></Box>
      ) : (
        <>
          <Box style={styles.topSection} onLayout={(e) => setTopSectionHeight(e.nativeEvent.layout.height)}>
            <Box style={styles.summaryCard}>
              <Box style={styles.summaryIconWrap}>
                <Icon name={habitIoniconFor(habit.icon)} size={26} color={C.textPrimary} />
              </Box>
              <Box style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>{habit.title}</Text>
                {habit.target_value && habit.target_unit && (
                  <Text style={styles.summarySub}>{habit.target_value} {habit.target_unit} / {habit.frequency === 'daily' ? 'día' : 'semana'}</Text>
                )}
              </Box>
              {!!habit.current_streak && (
                <Box style={styles.streakBadge}>
                  <Icon name="flame" size={16} color={C.warning60} />
                  <Text style={styles.streakBadgeText}>{habit.current_streak}</Text>
                </Box>
              )}
              <Pressable
                style={styles.quickAddBtn}
                onPress={handleQuickAdd}
                disabled={pendingDate === todayStr}
                accessibilityRole="button"
                accessibilityLabel="Registrar hoy"
              >
                <Icon name="add" size={22} color="#FFFFFF" />
              </Pressable>
            </Box>

            <Box style={styles.tabsRow}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p.key}
                  style={[styles.tab, period === p.key && styles.tabActive]}
                  onPress={() => setPeriod(p.key)}
                >
                  <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>{p.label}</Text>
                </Pressable>
              ))}
            </Box>

            <Text style={styles.rangeStat}>{rangeStats.completed}/{rangeStats.total} días completados</Text>
          </Box>

          {period === 'week' ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Box style={styles.weekCard}>
                <Box style={styles.weekHeaderRow}>
                  {WEEKDAY_LABELS.map((l) => <Text key={l} style={styles.weekdayLabel}>{l}</Text>)}
                </Box>
                <Box style={styles.weekCellsRow}>
                  {weekDays.map((d) => {
                    const iso = toIso(d);
                    const log = logMap.get(iso);
                    const ratio = isGoalHabit ? habitProgressRatio(log?.value_logged, habit.target_value) : null;
                    const isCompleted = !!log?.is_completed;
                    return (
                      <DayCell
                        key={iso}
                        date={d}
                        fillColor={habitCellColor(ratio, isCompleted, C.bg)}
                        isCompleted={isCompleted}
                        future={d > today}
                        size={40}
                        showLabel
                        onPress={() => handleDayPress(d)}
                      />
                    );
                  })}
                </Box>
              </Box>
            </ScrollView>
          ) : (
            <Box style={styles.bigArea}>
              {period === 'month' && (
                <Box style={[styles.weekCard, styles.bigCard]}>
                  <Box style={styles.weekHeaderRow}>
                    {WEEKDAY_LABELS.map((l) => <Text key={l} style={[styles.weekdayLabel, { width: monthCellSize }]}>{l}</Text>)}
                  </Box>
                  {Array.from({ length: monthRows }, (_, row) => (
                    <Box key={row} style={styles.weekCellsRow}>
                      {monthCells.slice(row * 7, row * 7 + 7).map((d, i) => {
                        if (!d) return <Box key={i} style={{ width: monthCellSize, height: monthCellSize }} />;
                        const iso = toIso(d);
                        const log = logMap.get(iso);
                        const ratio = isGoalHabit ? habitProgressRatio(log?.value_logged, habit.target_value) : null;
                        const isCompleted = !!log?.is_completed;
                        return (
                          <DayCell
                            key={iso}
                            date={d}
                            fillColor={habitCellColor(ratio, isCompleted, C.bg)}
                            isCompleted={isCompleted}
                            future={d > today}
                            size={monthCellSize}
                            showLabel
                            onPress={() => handleDayPress(d)}
                          />
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              )}

              {(period === 'quarter' || period === 'half' || period === 'year') && (
                <Box style={[styles.weekCard, styles.bigCard]}>
                  <Box style={styles.heatGrid}>
                    {heatmapWeeks.map((week, wi) => (
                      <Box key={wi} style={styles.heatColumn}>
                        {week.map((d) => {
                          const iso = toIso(d);
                          const log = logMap.get(iso);
                          const ratio = isGoalHabit ? habitProgressRatio(log?.value_logged, habit.target_value) : null;
                          const future = d > today;
                          return (
                            <Pressable
                              key={iso}
                              disabled={future}
                              onPress={() => handleDayPress(d)}
                              style={[styles.heatCell, { backgroundColor: habitCellColor(ratio, !!log?.is_completed, C.bg) }, future && cellStyles.cellFuture]}
                            />
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Box style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
            {(() => {
              const todayLog = logMap.get(todayStr);
              const isTodayDone = !!todayLog?.is_completed;
              const todayRatio = isGoalHabit ? habitProgressRatio(todayLog?.value_logged, habit.target_value) : null;
              const todayBtnBg = isGoalHabit ? habitCellColor(todayRatio, isTodayDone, C.bg) : undefined;
              const goalLabel = todayLog?.value_logged != null
                ? `${todayLog.value_logged} ${habit.target_unit || ''} hoy`
                : `Registrar ${habit.target_unit || 'progreso'} de hoy`;
              return (
                <Pressable
                  style={[
                    styles.todayBtn,
                    isTodayDone && styles.todayBtnDone,
                    isGoalHabit && !isTodayDone && todayBtnBg ? { backgroundColor: todayBtnBg, borderColor: todayBtnBg } : null,
                  ]}
                  onPress={handleQuickAdd}
                  disabled={pendingDate === todayStr}
                >
                  {pendingDate === todayStr ? (
                    <Spinner size="small" color={isTodayDone ? '#FFFFFF' : C.textPrimary} />
                  ) : (
                    <>
                      <Icon
                        name={isTodayDone ? 'checkmark-circle' : isGoalHabit ? 'create-outline' : 'checkmark-circle-outline'}
                        size={20}
                        color={isTodayDone ? '#FFFFFF' : C.textPrimary}
                      />
                      <Text style={[styles.todayBtnText, isTodayDone && styles.todayBtnTextDone]}>
                        {isGoalHabit ? goalLabel : (isTodayDone ? 'Completado hoy' : 'Marcar hoy como completado')}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })()}
          </Box>
        </>
      )}

      <Modal isOpen={!!valueModalDate} onClose={() => setValueModalDate(null)} avoidKeyboard>
        <ModalBackdrop />
        <ModalContent
          className="items-stretch"
          style={{
            borderRadius: RADIUS.lg,
            padding: 20,
            maxWidth: 360,
            width: '100%',
            ...SHADOW.card,
            ...(isGlassEffectAPIAvailable() ? null : { backgroundColor: C.surface }),
          }}
        >
          <Text style={styles.modalTitle}>{habit?.title}</Text>
          <Text style={styles.modalSub}>
            {valueModalDate === todayStr ? 'Hoy' : valueModalDate} · Objetivo: {habit?.target_value} {habit?.target_unit}
          </Text>
          <TextInput
            style={styles.modalInput}
            keyboardType="decimal-pad"
            placeholder={habit?.target_value != null ? String(habit.target_value) : '0'}
            placeholderTextColor={C.textTertiary}
            value={valueInput}
            onChangeText={setValueInput}
            autoFocus
          />
          <Box style={styles.modalActions}>
            <Pressable style={styles.modalCancelBtn} onPress={() => setValueModalDate(null)} disabled={savingValue}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.modalSaveBtn} onPress={submitValue} disabled={savingValue}>
              {savingValue ? <Spinner size="small" color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Guardar</Text>}
            </Pressable>
          </Box>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FONT.bold, fontSize: 16, color: C.textPrimary, marginHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { fontFamily: FONT.regular, fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  topSection: { paddingHorizontal: 20 },
  bigArea: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  bigCard: { flex: 1, justifyContent: 'center', marginBottom: 0 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    ...SHADOW.card,
  },
  summaryIconWrap: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.textPrimary },
  summarySub: { fontFamily: FONT.regular, fontSize: 12.5, color: C.textSecondary, marginTop: 3 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.warning5, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  streakBadgeText: { fontFamily: FONT.bold, fontSize: 14, color: C.warning60 },
  quickAddBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentBlack, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 4, marginBottom: 12, ...SHADOW.card },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.accentBlack },
  tabText: { fontFamily: FONT.semiBold, fontSize: 11, color: C.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
  rangeStat: { fontFamily: FONT.medium, fontSize: 12.5, color: C.textSecondary, marginBottom: 12, textAlign: 'center' },
  weekCard: { backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 16, ...SHADOW.card },
  weekHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  weekdayLabel: { width: 38, textAlign: 'center', fontFamily: FONT.medium, fontSize: 11, color: C.textTertiary },
  weekCellsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  // Trimestre/semestre/año: celdas 100% flexibles (sin tamaño fijo en px) para
  // que la cuadrícula rellene TODO el recuadro, ancho y alto, sin dejar
  // márgenes en blanco ni necesitar scroll — a petición explícita del usuario.
  heatGrid: { flex: 1, flexDirection: 'row', gap: 4 },
  heatColumn: { flex: 1, gap: 4 },
  heatCell: { flex: 1, borderRadius: 3 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 26,
    paddingVertical: 14,
  },
  todayBtnDone: { backgroundColor: C.success50, borderColor: C.success50 },
  todayBtnText: { fontFamily: FONT.bold, fontSize: 14, color: C.textPrimary },
  todayBtnTextDone: { color: '#FFFFFF' },
  modalTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.textPrimary, textAlign: 'center' },
  modalSub: { fontFamily: FONT.regular, fontSize: 12.5, color: C.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: FONT.bold,
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.bg },
  modalSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.accentBlack },
  modalCancelText: { fontFamily: FONT.semiBold, fontSize: 14, color: C.textPrimary },
  modalSaveText: { fontFamily: FONT.bold, fontSize: 14, color: '#FFFFFF' },
  });
}
