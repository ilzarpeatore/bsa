import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { showToast } from '@helper/toast';
import { hapticLight } from '@helper/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AnimatedRing from '@components/AnimatedRing';
import SimpleBottomSheet from '@components/SimpleBottomSheet';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { FONT, RADIUS, SPACING } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { stepsApi, StepsGoalDaySummary, StepsLogEntry } from '../../api/steps';
import logger from '@helper/logger';

// Antes (Guideline 2.2, rechazo 2026-09-10): esta pantalla mostraba pasos,
// calorías, minutos, una gráfica semanal y una lista de "actividades de hoy"
// -- todo literal en el código ("6,842", barras con alturas fijas, "Upper
// Body Workout"...), sin ningún estado ni llamada a la API detrás. Se
// sustituyó por un registro manual real de pasos. NO hay dato real de
// km/kcal/minutos activos para pasos en el backend -- no se reintroducen con
// una fórmula inventada (eso fue justo el motivo del rechazo). NO hay
// integración con el podómetro del móvil (HealthKit/Health Connect se quitó
// del proyecto el 2026-09-10, ver constants/featureFlags.ts) -- el registro
// sigue siendo manual a propósito.
//
// Rediseño (2026-09-26): el flujo de "escribe un número + botón Registrar"
// no lo usaba nadie de verdad -- se sustituye por presets de un toque
// (+500/+1.000/+2.000) más un bottom sheet para cantidades no cubiertas.
// Se añade historial de hoy (tandas reales, calculadas como delta entre
// filas consecutivas de usergraph-list -- cada fila es el ACUMULADO del día,
// no un delta) y una barra semanal desde v1/user-daily-steps-goal-list
// (filter=week), que ya viene agregado por día desde el backend.
//
// Mejora futura posible (NO implementada ahora, requiere permisos nuevos y
// no fue lo pedido): leer pasos automáticamente con expo-sensors/Pedometer.

const GOAL_SUGGESTIONS = [8000, 10000, 12000];
const QUICK_ADD_PRESETS = [500, 1000, 2000];
const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface HistoryEntry {
  id: number;
  delta: number;
  time: string;
}

export default function ActivityTrackerScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [steps, setSteps] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [todayLog, setTodayLog] = useState<StepsLogEntry[]>([]);
  const [week, setWeek] = useState<StepsGoalDaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    initStepsData();
  }, []);

  const initStepsData = async () => {
    setIsLoading(true);
    const today = todayDateKey();
    try {
      const [goalRes, logRes, weekRes] = await Promise.all([
        stepsApi.getGoalList(today),
        stepsApi.getTodayLog(today),
        stepsApi.getGoalListV1('week'),
      ]);
      const goalItems = goalRes.data.data ?? [];
      const latestGoal = goalItems.reduce<typeof goalItems[number] | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setDailyGoal(latestGoal ? latestGoal.value : 0);

      const logItems = logRes.data.data ?? [];
      setTodayLog(logItems);
      const latestLog = logItems.reduce<StepsLogEntry | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setSteps(latestLog ? Number(latestLog.value) || 0 : 0);

      setWeek(weekRes.data.data ?? []);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo cargar tu registro de pasos.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // `todayLog` llega ordenado asc (orderby: 'asc' en la API) y cada fila es
  // el ACUMULADO del día en ese momento, no una tanda -- el delta contra la
  // fila anterior es la tanda real añadida en ese registro. Ej: filas
  // {value:3000},{value:5000} -> tandas [3000, 2000]. Se muestra de más
  // reciente a más antigua (reverse al final).
  const history: HistoryEntry[] = useMemo(() => {
    const sorted = [...todayLog].sort((a, b) => a.id - b.id);
    const entries: HistoryEntry[] = [];
    let prevValue = 0;
    for (const item of sorted) {
      const value = Number(item.value) || 0;
      const delta = value - prevValue;
      if (delta > 0) {
        entries.push({ id: item.id, delta, time: formatTime(item.created_at) });
      }
      prevValue = value;
    }
    return entries.reverse();
  }, [todayLog]);

  const getBannerText = () => {
    if (dailyGoal === 0) return 'Configura tu objetivo diario de pasos';
    const diff = dailyGoal - steps;
    if (diff > 0) return `Solo ${diff.toLocaleString()} pasos para alcanzar tu objetivo`;
    if (diff === 0) return '¡Has alcanzado tu objetivo diario!';
    return `Has superado tu objetivo por ${Math.abs(diff).toLocaleString()} pasos`;
  };

  const addSteps = useCallback(
    async (amount: number) => {
      if (!amount || amount <= 0 || isLogging) return;
      hapticLight();
      const previousSteps = steps;
      const previousLog = todayLog;
      const total = previousSteps + amount;
      const optimisticEntry: StepsLogEntry = {
        id: Math.max(0, ...previousLog.map((l) => l.id)) + 1,
        value: total,
        type: 'step_track',
        date: todayDateKey(),
        unit: null,
        created_at: new Date().toISOString(),
      };
      setSteps(total);
      setTodayLog([...previousLog, optimisticEntry]);
      setIsLogging(true);
      try {
        await stepsApi.logSteps(total, todayDateKey());
      } catch (e) {
        logger.error(e);
        setSteps(previousSteps);
        setTodayLog(previousLog);
        showToast('Error', { description: 'No se pudo registrar los pasos. Inténtalo de nuevo.', variant: 'error' });
      } finally {
        setIsLogging(false);
      }
    },
    [steps, todayLog, isLogging]
  );

  const openCustomSheet = () => {
    setCustomText('');
    setCustomSheetVisible(true);
  };

  const confirmCustomAdd = async () => {
    const amount = parseInt(customText, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Info', { description: 'Introduce un número de pasos válido', variant: 'info' });
      return;
    }
    setCustomSheetVisible(false);
    await addSteps(amount);
  };

  const openGoalSheet = () => {
    setGoalText(dailyGoal > 0 ? String(dailyGoal) : '');
    setGoalSheetVisible(true);
  };

  const saveGoal = async (value?: number) => {
    const goal = value ?? parseInt(goalText, 10);
    if (isNaN(goal) || goal <= 0) {
      showToast('Info', { description: 'Introduce un número de pasos válido', variant: 'info' });
      return;
    }
    setIsSavingGoal(true);
    try {
      await stepsApi.saveGoal(goal, todayDateKey());
      setDailyGoal(goal);
      setGoalSheetVisible(false);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo guardar el objetivo. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setIsSavingGoal(false);
    }
  };

  const progress = dailyGoal > 0 ? Math.min(steps / dailyGoal, 1) : 0;
  const weekMax = Math.max(1, ...week.map((d) => d.value), ...week.map((d) => d.today_goal));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => props.navigation?.goBack()} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Pasos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {dailyGoal === 0 ? (
          <View style={styles.welcomeCard}>
            <Ionicons name="walk" size={36} color={C.orange} />
            <Text style={styles.welcomeTitle}>Elige tu objetivo diario</Text>
            <Text style={styles.welcomeSubtitle}>
              Así podremos mostrarte tu progreso real del día en vez de un contador vacío.
            </Text>
            <View style={styles.chipRow}>
              {GOAL_SUGGESTIONS.map((g) => (
                <Pressable
                  key={g}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.5 }]}
                  onPress={() => saveGoal(g)}
                  disabled={isSavingGoal}
                >
                  <Text style={styles.chipText}>{g.toLocaleString()}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.welcomeCustomBtn, pressed && { opacity: 0.5 }]}
              onPress={openGoalSheet}
            >
              <Text style={styles.welcomeCustomBtnText}>Otro objetivo</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ height: 10 }} />
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{getBannerText()}</Text>
            </View>

            <View style={styles.progressContainer}>
              <AnimatedRing size={240} strokeWidth={12} percent={progress * 100} color={C.orange} trackColor={C.gray10}>
                <View style={styles.progressInner}>
                  <Ionicons name="walk" size={44} color={C.orange} />
                  <Text style={styles.consumedValue}>{steps.toLocaleString()}</Text>
                  <Text style={styles.glassesLabel}>de {dailyGoal.toLocaleString()} pasos</Text>
                </View>
              </AnimatedRing>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Registrar pasos</Text>
        <View style={styles.quickAddRow}>
          {QUICK_ADD_PRESETS.map((amount) => (
            <Pressable
              key={amount}
              style={({ pressed }) => [styles.quickAddTile, pressed && { opacity: 0.5 }]}
              onPress={() => addSteps(amount)}
              disabled={isLogging}
            >
              <Text style={styles.quickAddTileText}>+{amount.toLocaleString()}</Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.quickAddTile, styles.quickAddOther, pressed && { opacity: 0.5 }]}
            onPress={openCustomSheet}
            disabled={isLogging}
          >
            <Ionicons name="add" size={16} color={C.orange} />
            <Text style={[styles.quickAddTileText, { color: C.orange }]}>Otra cantidad</Text>
          </Pressable>
        </View>

        {history.length > 0 && (
          <View style={{ marginTop: SPACING.xxl }}>
            <Text style={styles.sectionTitle}>Historial de hoy</Text>
            <View style={styles.historyCard}>
              {history.map((entry, idx) => (
                <View
                  key={entry.id}
                  style={[styles.historyRow, idx < history.length - 1 && styles.historyRowBorder]}
                >
                  <View style={styles.historyIconWrap}>
                    <Ionicons name="walk" size={16} color={C.orange} />
                  </View>
                  <Text style={styles.historyDelta}>+{entry.delta.toLocaleString()} pasos</Text>
                  <Text style={styles.historyTime}>{entry.time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {week.length > 0 && (
          <View style={{ marginTop: SPACING.xxl }}>
            <Text style={styles.sectionTitle}>Esta semana</Text>
            <View style={styles.weekCard}>
              <View style={styles.weekBarsRow}>
                {week.map((day, idx) => {
                  const barHeight = Math.max(4, (day.value / weekMax) * 90);
                  const achieved = day.today_goal > 0 && day.value >= day.today_goal;
                  const d = new Date(day.date + 'T00:00:00');
                  const label = isNaN(d.getTime()) ? WEEKDAY_LABELS[idx % 7] : WEEKDAY_LABELS[d.getDay()];
                  const isToday = day.date === todayDateKey();
                  return (
                    <View key={day.date} style={styles.weekBarCol}>
                      <View style={styles.weekBarTrack}>
                        <View
                          style={[
                            styles.weekBarFill,
                            {
                              height: barHeight,
                              backgroundColor: achieved ? C.orange : C.gray20,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.weekBarLabel, isToday && { color: C.orange, fontFamily: FONT.bold }]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={{ marginTop: SPACING.xxl }}>
          <Text style={styles.sectionTitle}>Objetivo diario</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeaderLeft}>
              <Ionicons name="flag" size={22} color={C.orange} />
              <Text style={styles.goalValue}>
                {dailyGoal > 0 ? `${dailyGoal.toLocaleString()} pasos` : 'Sin configurar'}
              </Text>
            </View>
            <Pressable onPress={openGoalSheet} style={({ pressed }) => [styles.goalEditBtn, pressed && { opacity: 0.5 }]}>
              <Ionicons name="pencil" size={18} color={C.orange} />
            </Pressable>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={C.orange} />
        </View>
      )}

      <SimpleBottomSheet visible={customSheetVisible} onClose={() => setCustomSheetVisible(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Añadir pasos</Text>
          <TextInput
            style={styles.sheetInput}
            value={customText}
            onChangeText={setCustomText}
            keyboardType="number-pad"
            placeholder="Ej. 1.500"
            placeholderTextColor={C.gray40}
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [styles.sheetSaveBtn, pressed && { opacity: 0.5 }]}
            onPress={confirmCustomAdd}
          >
            <Text style={styles.sheetSaveBtnText}>Añadir</Text>
          </Pressable>
        </View>
      </SimpleBottomSheet>

      <SimpleBottomSheet visible={goalSheetVisible} onClose={() => setGoalSheetVisible(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Objetivo diario de pasos</Text>
          <View style={styles.chipRow}>
            {GOAL_SUGGESTIONS.map((g) => (
              <Pressable
                key={g}
                style={({ pressed }) => [
                  styles.chip,
                  String(g) === goalText && styles.chipSelected,
                  pressed && { opacity: 0.5 },
                ]}
                onPress={() => setGoalText(String(g))}
              >
                <Text style={[styles.chipText, String(g) === goalText && styles.chipTextSelected]}>
                  {g.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.sheetInput}
            value={goalText}
            onChangeText={setGoalText}
            keyboardType="number-pad"
            placeholder="Introduce los pasos"
            placeholderTextColor={C.gray40}
          />
          <Pressable
            style={({ pressed }) => [styles.sheetSaveBtn, pressed && { opacity: 0.5 }, isSavingGoal && { opacity: 0.5 }]}
            onPress={() => saveGoal()}
            disabled={isSavingGoal}
          >
            {isSavingGoal ? (
              // C.white NO es blanco en tema claro (es "#262729", ver
              // theme.ts) -- se usa el mismo literal que ya usa
              // sheetSaveBtnText.color justo abajo para el mismo botón.
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sheetSaveBtnText}>Guardar</Text>
            )}
          </Pressable>
        </View>
      </SimpleBottomSheet>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 20,
    color: C.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30 + WORKOUT_MINIBAR_CLEARANCE,
  },
  banner: {
    padding: 14,
    backgroundColor: C.brand10,
    borderRadius: RADIUS.sm,
  },
  bannerText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: C.textPrimary,
  },
  progressContainer: {
    width: 240,
    height: 240,
    alignSelf: 'center',
    marginTop: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumedValue: {
    fontFamily: FONT.bold,
    fontSize: 32,
    lineHeight: 38,
    color: C.textPrimary,
    marginTop: 8,
  },
  glassesLabel: {
    fontFamily: FONT.regular,
    fontSize: 15,
    color: C.textSecondary,
    marginTop: 4,
  },
  welcomeCard: {
    marginTop: 10,
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.textPrimary,
    marginTop: 12,
  },
  welcomeSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  welcomeCustomBtn: {
    marginTop: 14,
  },
  welcomeCustomBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: C.orange,
  },
  sectionTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: C.textPrimary,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickAddTile: {
    flexGrow: 1,
    minWidth: 70,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickAddOther: {
    flexDirection: 'row',
    borderColor: C.orange,
  },
  quickAddTileText: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: C.textPrimary,
  },
  historyCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  historyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  historyIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.brand10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDelta: {
    flex: 1,
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: C.textPrimary,
  },
  historyTime: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
  },
  weekCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  weekBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
  },
  weekBarCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    height: '100%',
  },
  weekBarTrack: {
    width: 16,
    height: 90,
    justifyContent: 'flex-end',
  },
  weekBarFill: {
    width: 16,
    borderRadius: 8,
  },
  weekBarLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 8,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalValue: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: C.textPrimary,
  },
  goalEditBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.brand10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 4,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: C.brand10,
  },
  chipSelected: {
    backgroundColor: C.orange,
  },
  chipText: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    color: C.textPrimary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sheetTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  sheetInput: {
    backgroundColor: C.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    fontSize: 16,
    fontFamily: FONT.medium,
    color: C.textPrimary,
    textAlign: 'center',
    marginTop: 12,
  },
  sheetSaveBtn: {
    backgroundColor: C.orange,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  sheetSaveBtnText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  });
}
