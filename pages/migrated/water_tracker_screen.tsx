import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { showToast } from '@helper/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AnimatedRing from '@components/AnimatedRing';
import SimpleBottomSheet from '@components/SimpleBottomSheet';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { FONT, RADIUS, SPACING } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { waterApi, WaterGoalDaySummary } from '../../api/water';
import { profileApi } from '../../api/profile';
import logger from '@helper/logger';

// Cantidades de registro rápido (mL). Pedido explícito: registrar debe ser
// UN toque, sin pasos intermedios de "+ / + / Registrar ahora" como en la
// versión anterior.
const QUICK_AMOUNTS_ML = [250, 500, 750];

// Objetivos sugeridos al configurar por primera vez (chips del bottom
// sheet), para no forzar a escribir un número desde cero.
const SUGGESTED_GOALS_ML = [2000, 2500, 3000];

// Ventana de "Deshacer" tras registrar una toma (ms).
const UNDO_WINDOW_MS = 5000;

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

// Formatea mL como litros con coma decimal ("1500" -> "1,5 L"), convención
// española usada en el resto de la app (ver profile_screen.tsx toLocaleDateString('es-ES', ...)).
function formatLiters(ml: number): string {
  const liters = Math.max(0, ml) / 1000;
  return `${liters.toFixed(1).replace('.', ',')} L`;
}

// "created_at" llega como "YYYY-MM-DD HH:mm:ss" (o ISO) -- ninguna de las
// dos formas parsea de forma fiable con espacio en todos los motores, por
// eso se normaliza a "T" antes de construir el Date.
function formatTime(createdAt: string): string {
  const iso = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface HistoryEntry {
  id: number;
  deltaMl: number;
  createdAt: string;
}

// Cada fila de usergraph-list es el TOTAL ACUMULADO del día en ese momento,
// no un delta -- para mostrar tomas reales hay que restar cada fila de la
// anterior (ya vienen ordenadas ascendente por created_at/id, ver
// waterApi.getTodayLog). La primera fila del día es su propio delta
// (valor - 0). Se descartan deltas <= 0 (edición manual hacia abajo,
// duplicados) para no mostrar una "toma" negativa o vacía falsa.
function computeHistory(entries: { id: number; value: number | string; created_at: string }[]): HistoryEntry[] {
  const sorted = [...entries].sort((a, b) => a.id - b.id);
  const out: HistoryEntry[] = [];
  let prevValue = 0;
  for (const e of sorted) {
    const value = Number(e.value) || 0;
    const delta = value - prevValue;
    if (delta > 0) {
      out.push({ id: e.id, deltaMl: delta, createdAt: e.created_at });
    }
    prevValue = value;
  }
  return out.reverse(); // más reciente primero
}

export default function WaterTrackerScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [isLoading, setIsLoading] = useState(true);
  const [consumedMl, setConsumedMl] = useState(0);
  const [dailyGoalMl, setDailyGoalMl] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [weekSummary, setWeekSummary] = useState<WaterGoalDaySummary[]>([]);
  const [loggingAmount, setLoggingAmount] = useState<number | null>(null);

  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [customText, setCustomText] = useState('');

  // Deshacer: la última toma registrada por el usuario en esta sesión de
  // pantalla, válida ~5s. Se borra con el mismo endpoint genérico que ya usa
  // profileApi.deleteGraph (usergraph-delete por id) -- no existe un
  // endpoint dedicado a agua, este es el mecanismo real ya usado en el
  // proyecto para el mismo tipo de dato (ver api/profile.ts).
  const [undoState, setUndoState] = useState<{ entryId: number; previousMl: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initWaterData();
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const initWaterData = async () => {
    setIsLoading(true);
    const today = todayDateKey();
    try {
      const [goalRes, logRes, weekRes] = await Promise.all([
        waterApi.getGoalList(today),
        waterApi.getTodayLog(today),
        waterApi.getGoalListV1('week'),
      ]);
      const goalItems = goalRes.data.data ?? [];
      const latestGoal = goalItems.reduce<typeof goalItems[number] | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setDailyGoalMl(latestGoal ? Number(latestGoal.value) || 0 : 0);

      const logItems = logRes.data.data ?? [];
      const latestLog = logItems.reduce<typeof logItems[number] | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setConsumedMl(latestLog ? Number(latestLog.value) || 0 : 0);
      setHistory(computeHistory(logItems));

      setWeekSummary(weekRes.data.data ?? []);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo cargar tu registro de agua.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  // Registro de un toque: optimista (UI se actualiza al instante), revierte
  // si la llamada falla. Tras confirmarse, vuelve a leer usergraph-list para
  // saber el id real de la fila creada (usergraph-save no lo devuelve) y así
  // poder ofrecer "Deshacer" con el endpoint genérico de borrado.
  const logAmount = useCallback(
    async (amountMl: number) => {
      if (amountMl <= 0 || loggingAmount !== null) return;
      const today = todayDateKey();
      const previousMl = consumedMl;
      const previousHistory = history;
      const newTotal = previousMl + amountMl;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setLoggingAmount(amountMl);
      setConsumedMl(newTotal);
      setHistory([{ id: -Date.now(), deltaMl: amountMl, createdAt: new Date().toISOString() }, ...previousHistory]);
      clearUndoTimer();
      setUndoState(null);

      try {
        await waterApi.logIntake(newTotal, today);
      } catch (e) {
        logger.error(e);
        setConsumedMl(previousMl);
        setHistory(previousHistory);
        showToast('Error', { description: 'No se pudo registrar el agua. Inténtalo de nuevo.', variant: 'error' });
        setLoggingAmount(null);
        return;
      }

      // El registro YA se guardó en el servidor en este punto -- lo que
      // sigue es solo refrescar el detalle real (id exacto para "Deshacer").
      // Si esta segunda llamada falla (red intermitente), NO hay que
      // revertir ni decir "no se pudo registrar": sería mostrar un error
      // falso sobre algo que sí tuvo éxito. Se mantiene el estado optimista
      // ya puesto (newTotal) y simplemente no se ofrece "Deshacer" esta vez.
      try {
        const logRes = await waterApi.getTodayLog(today);
        const logItems = logRes.data.data ?? [];
        const latestLog = logItems.reduce<typeof logItems[number] | null>(
          (max, item) => (!max || item.id > max.id ? item : max),
          null
        );
        setConsumedMl(latestLog ? Number(latestLog.value) || 0 : newTotal);
        setHistory(computeHistory(logItems));
        if (latestLog) {
          setUndoState({ entryId: latestLog.id, previousMl });
          undoTimerRef.current = setTimeout(() => setUndoState(null), UNDO_WINDOW_MS);
        }
      } catch (e) {
        logger.error(e);
      } finally {
        setLoggingAmount(null);
      }
    },
    [consumedMl, history, loggingAmount]
  );

  const handleUndo = async () => {
    if (!undoState) return;
    const { entryId, previousMl } = undoState;
    clearUndoTimer();
    setUndoState(null);
    const today = todayDateKey();
    try {
      await profileApi.deleteGraph(entryId);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo deshacer el registro.', variant: 'error' });
      return;
    }

    // El borrado YA tuvo éxito -- si el refresco posterior falla, se cae a
    // un estado optimista calculado a mano (en vez de repetir la lectura del
    // servidor) para no decir "no se pudo deshacer" sobre algo que sí se
    // deshizo.
    try {
      const logRes = await waterApi.getTodayLog(today);
      const logItems = logRes.data.data ?? [];
      const latestLog = logItems.reduce<typeof logItems[number] | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setConsumedMl(latestLog ? Number(latestLog.value) || 0 : previousMl);
      setHistory(computeHistory(logItems));
    } catch (e) {
      logger.error(e);
      setConsumedMl(previousMl);
      setHistory((prev) => prev.filter((h) => h.id !== entryId));
    }
    showToast('Listo', { description: 'Registro deshecho.', variant: 'success' });
  };

  const openGoalSheet = () => {
    setGoalText(dailyGoalMl > 0 ? String(dailyGoalMl) : '');
    setGoalSheetVisible(true);
  };

  const saveGoal = async (value?: number) => {
    const goal = value ?? parseInt(goalText, 10);
    if (!goal || isNaN(goal) || goal <= 0) {
      showToast('Info', { description: 'Introduce una cantidad válida en mL', variant: 'info' });
      return;
    }
    setIsSavingGoal(true);
    try {
      await waterApi.saveGoal(goal, todayDateKey());
      setDailyGoalMl(goal);
      setGoalSheetVisible(false);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo guardar el objetivo. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setIsSavingGoal(false);
    }
  };

  const submitCustomAmount = () => {
    const amount = parseInt(customText, 10);
    if (!amount || isNaN(amount) || amount <= 0) {
      showToast('Info', { description: 'Introduce una cantidad válida en mL', variant: 'info' });
      return;
    }
    setCustomSheetVisible(false);
    setCustomText('');
    logAmount(amount);
  };

  const progress = dailyGoalMl > 0 ? Math.min(consumedMl / dailyGoalMl, 1) : 0;
  const remainingMl = dailyGoalMl - consumedMl;

  const getStatusText = () => {
    if (dailyGoalMl === 0) return null;
    if (remainingMl > 0) return `Te faltan ${formatLiters(remainingMl)} para tu objetivo`;
    if (remainingMl === 0) return '¡Objetivo cumplido!';
    return `Has superado tu objetivo por ${formatLiters(Math.abs(remainingMl))}`;
  };
  const statusText = getStatusText();

  const maxWeekValue = Math.max(1, ...weekSummary.map((d) => Number(d.value) || 0), ...weekSummary.map((d) => Number(d.today_goal) || 0));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => props.navigation?.goBack()} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Agua</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {dailyGoalMl === 0 ? (
            // Sin objetivo configurado: en vez de un anillo vacío y una
            // tarjeta que diga "0 mL" (parecía roto), se muestra una
            // invitación clara a elegir uno como primer contenido.
            <View style={styles.welcomeCard}>
              <Ionicons name="water" size={36} color={C.blue} />
              <Text style={styles.welcomeTitle}>Elige tu objetivo diario de agua</Text>
              <Text style={styles.welcomeSubtitle}>Así podremos mostrarte tu progreso del día</Text>
              <View style={styles.chipsRow}>
                {SUGGESTED_GOALS_ML.map((g) => (
                  <Pressable
                    key={g}
                    style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                    onPress={() => saveGoal(g)}
                  >
                    <Text style={styles.chipText}>{formatLiters(g)}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.5 }]} onPress={openGoalSheet}>
                <Text style={styles.linkBtnText}>Otra cantidad</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Hero */}
              <View style={styles.progressContainer}>
                <AnimatedRing size={220} strokeWidth={16} percent={progress * 100} color={C.blue} trackColor={C.gray10}>
                  <View style={styles.progressInner}>
                    <Text style={styles.consumedValue}>{formatLiters(consumedMl)}</Text>
                    <Text style={styles.goalOfLabel}>de {formatLiters(dailyGoalMl)}</Text>
                  </View>
                </AnimatedRing>
              </View>

              {statusText && (
                <View style={[styles.banner, remainingMl <= 0 && { backgroundColor: C.success10 }]}>
                  <Ionicons
                    name={remainingMl <= 0 ? 'checkmark-circle' : 'water-outline'}
                    size={18}
                    color={remainingMl <= 0 ? C.success : C.blue}
                  />
                  <Text style={[styles.bannerText, remainingMl <= 0 && { color: C.success }]}>{statusText}</Text>
                </View>
              )}
            </>
          )}

          {/* Registro rápido de un toque */}
          <Text style={styles.sectionTitle}>Registro rápido</Text>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS_ML.map((amt) => (
              <Pressable
                key={amt}
                style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.6 }]}
                onPress={() => logAmount(amt)}
                disabled={loggingAmount !== null}
              >
                {loggingAmount === amt ? (
                  <ActivityIndicator size="small" color={C.blue} />
                ) : (
                  <>
                    <Ionicons name="water" size={22} color={C.blue} />
                    <Text style={styles.quickTileText}>{amt} mL</Text>
                  </>
                )}
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.quickTile, styles.quickTileOther, pressed && { opacity: 0.6 }]}
              onPress={() => {
                setCustomText('');
                setCustomSheetVisible(true);
              }}
              disabled={loggingAmount !== null}
            >
              <Ionicons name="add" size={22} color={C.textSecondary} />
              <Text style={[styles.quickTileText, { color: C.textSecondary }]}>Otra cantidad</Text>
            </Pressable>
          </View>

          {undoState && (
            <Pressable style={({ pressed }) => [styles.undoBar, pressed && { opacity: 0.7 }]} onPress={handleUndo}>
              <Ionicons name="arrow-undo" size={16} color={C.blue} />
              <Text style={styles.undoText}>Deshacer último registro</Text>
            </Pressable>
          )}

          {/* Esta semana */}
          <Text style={styles.sectionTitle}>Esta semana</Text>
          <View style={styles.weekCard}>
            {weekSummary.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no hay datos de esta semana.</Text>
            ) : (
              <View style={styles.weekBarsRow}>
                {weekSummary.map((d, idx) => {
                  const value = Number(d.value) || 0;
                  const goal = Number(d.today_goal) || 0;
                  const hitGoal = goal > 0 && value >= goal;
                  const barHeight = Math.max(4, (value / maxWeekValue) * 90);
                  const dayIdx = new Date(`${d.date}T00:00:00`).getDay();
                  const label = isNaN(dayIdx) ? '' : DAY_LABELS[dayIdx];
                  return (
                    <View key={`${d.date}-${idx}`} style={styles.weekBarCol}>
                      <View style={styles.weekBarTrack}>
                        <View
                          style={[
                            styles.weekBarFill,
                            { height: barHeight, backgroundColor: hitGoal ? C.success : C.blue },
                          ]}
                        />
                      </View>
                      <Text style={styles.weekBarLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Historial de hoy */}
          <Text style={styles.sectionTitle}>Hoy</Text>
          <View style={styles.historyCard}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no has registrado agua hoy.</Text>
            ) : (
              history.map((h, idx) => (
                <View key={h.id} style={[styles.historyRow, idx > 0 && styles.historyRowBorder]}>
                  <View style={styles.historyLeft}>
                    <Ionicons name="water" size={16} color={C.blue} />
                    <Text style={styles.historyAmount}>{h.deltaMl} mL</Text>
                  </View>
                  <Text style={styles.historyTime}>{formatTime(h.createdAt)}</Text>
                </View>
              ))
            )}
          </View>

          {/* Objetivo diario */}
          {dailyGoalMl > 0 && (
            <>
              <Text style={styles.sectionTitle}>Objetivo diario</Text>
              <View style={styles.goalCard}>
                <View style={styles.goalCardLeft}>
                  <Ionicons name="flag" size={20} color={C.blue} />
                  <Text style={styles.goalCardValue}>{formatLiters(dailyGoalMl)}</Text>
                </View>
                <Pressable onPress={openGoalSheet} style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.5 }]}>
                  <Ionicons name="pencil" size={18} color={C.textSecondary} />
                </Pressable>
              </View>
            </>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Bottom sheet: editar objetivo */}
      <SimpleBottomSheet visible={goalSheetVisible} onClose={() => setGoalSheetVisible(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Objetivo diario de agua</Text>
          <TextInput
            style={styles.sheetInput}
            value={goalText}
            onChangeText={setGoalText}
            keyboardType="numeric"
            placeholder="Cantidad en mL"
            placeholderTextColor={C.gray40}
          />
          <View style={styles.chipsRow}>
            {SUGGESTED_GOALS_ML.map((g) => (
              <Pressable
                key={g}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                onPress={() => setGoalText(String(g))}
              >
                <Text style={styles.chipText}>{formatLiters(g)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.sheetSaveBtn, pressed && { opacity: 0.7 }, isSavingGoal && { opacity: 0.5 }]}
            onPress={() => saveGoal()}
            disabled={isSavingGoal}
          >
            {isSavingGoal ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sheetSaveBtnText}>Guardar</Text>}
          </Pressable>
        </View>
      </SimpleBottomSheet>

      {/* Bottom sheet: cantidad personalizada */}
      <SimpleBottomSheet visible={customSheetVisible} onClose={() => setCustomSheetVisible(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Registrar cantidad</Text>
          <TextInput
            style={styles.sheetInput}
            value={customText}
            onChangeText={setCustomText}
            keyboardType="numeric"
            placeholder="Cantidad en mL"
            placeholderTextColor={C.gray40}
            autoFocus
          />
          <Pressable style={({ pressed }) => [styles.sheetSaveBtn, pressed && { opacity: 0.7 }]} onPress={submitCustomAmount}>
            <Text style={styles.sheetSaveBtnText}>Registrar</Text>
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
    loaderCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 30 + WORKOUT_MINIBAR_CLEARANCE,
    },
    welcomeCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.xxl,
      alignItems: 'center',
      gap: 8,
    },
    welcomeTitle: {
      fontFamily: FONT.semiBold,
      fontSize: 18,
      color: C.textPrimary,
      textAlign: 'center',
      marginTop: 4,
    },
    welcomeSubtitle: {
      fontFamily: FONT.regular,
      fontSize: 14,
      color: C.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    linkBtn: {
      marginTop: 4,
      padding: 6,
    },
    linkBtnText: {
      fontFamily: FONT.medium,
      fontSize: 14,
      color: C.blue,
    },
    progressContainer: {
      width: 220,
      height: 220,
      alignSelf: 'center',
      marginTop: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressInner: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    consumedValue: {
      fontFamily: FONT.bold,
      fontSize: 34,
      color: C.textPrimary,
    },
    goalOfLabel: {
      fontFamily: FONT.regular,
      fontSize: 14,
      color: C.textSecondary,
      marginTop: 4,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: C.blue5,
      borderRadius: RADIUS.sm,
      marginTop: 16,
      alignSelf: 'center',
    },
    bannerText: {
      fontFamily: FONT.medium,
      fontSize: 14,
      color: C.textPrimary,
    },
    sectionTitle: {
      fontFamily: FONT.semiBold,
      fontSize: 16,
      color: C.textPrimary,
      marginTop: 24,
      marginBottom: 10,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 10,
    },
    quickTile: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    quickTileOther: {
      borderStyle: 'dashed',
    },
    quickTileText: {
      fontFamily: FONT.medium,
      fontSize: 13,
      color: C.textPrimary,
      textAlign: 'center',
    },
    undoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 10,
      backgroundColor: C.blue5,
      borderRadius: RADIUS.sm,
    },
    undoText: {
      fontFamily: FONT.medium,
      fontSize: 13,
      color: C.blue,
    },
    weekCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      padding: 16,
    },
    weekBarsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 120,
    },
    weekBarCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    weekBarTrack: {
      width: 14,
      height: 90,
      justifyContent: 'flex-end',
      borderRadius: 7,
      backgroundColor: C.gray10,
      overflow: 'hidden',
    },
    weekBarFill: {
      width: '100%',
      borderRadius: 7,
    },
    weekBarLabel: {
      fontFamily: FONT.medium,
      fontSize: 12,
      color: C.textSecondary,
    },
    historyCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      padding: 4,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    historyRowBorder: {
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    historyAmount: {
      fontFamily: FONT.medium,
      fontSize: 15,
      color: C.textPrimary,
    },
    historyTime: {
      fontFamily: FONT.regular,
      fontSize: 13,
      color: C.textSecondary,
    },
    emptyText: {
      fontFamily: FONT.regular,
      fontSize: 14,
      color: C.textSecondary,
      padding: 12,
      textAlign: 'center',
    },
    goalCard: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    goalCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    goalCardValue: {
      fontFamily: FONT.semiBold,
      fontSize: 17,
      color: C.textPrimary,
    },
    editBtn: {
      padding: 6,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: C.blue5,
    },
    chipText: {
      fontFamily: FONT.medium,
      fontSize: 13,
      color: C.blue,
    },
    sheetContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 14,
    },
    sheetTitle: {
      fontFamily: FONT.semiBold,
      fontSize: 18,
      color: C.textPrimary,
    },
    sheetInput: {
      backgroundColor: C.bg,
      borderRadius: RADIUS.sm,
      padding: 14,
      fontSize: 16,
      fontFamily: FONT.medium,
      color: C.textPrimary,
    },
    sheetSaveBtn: {
      backgroundColor: C.blue,
      borderRadius: RADIUS.sm,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    sheetSaveBtnText: {
      fontFamily: FONT.semiBold,
      fontSize: 16,
      color: '#FFFFFF',
    },
  });
}
