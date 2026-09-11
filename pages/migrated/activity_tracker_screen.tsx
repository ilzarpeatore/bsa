import React, { useState, useEffect, useMemo } from 'react';
import {  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator  } from 'react-native';
import { showToast } from '@helper/toast';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Ionicons  } from '@expo/vector-icons';
import {  LinearGradient  } from 'expo-linear-gradient';
import AnimatedRing from '@components/AnimatedRing';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { FONT, RADIUS } from './theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  stepsApi  } from '../../api/steps';
import logger from '@helper/logger';

// Antes (Guideline 2.2, rechazo 2026-09-10): esta pantalla mostraba pasos,
// calorías, minutos, una gráfica semanal y una lista de "actividades de hoy"
// -- todo literal en el código ("6,842", barras con alturas fijas, "Upper
// Body Workout"...), sin ningún estado ni llamada a la API detrás. Se
// sustituye por un registro manual real de pasos (mismo patrón que
// water_tracker_screen.tsx) -- las calorías/minutos/entrenamientos de hoy no
// tienen todavía un endpoint de agregación diaria fiable (ver nota en
// pages/migrated/home_screen_modern_v2.tsx sobre dashboard-detail), así que
// no se inventan: se deja solo lo que sí se puede registrar y mostrar real.

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

export default function ActivityTrackerScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [stepsToAdd, setStepsToAdd] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [steps, setSteps] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initStepsData();
  }, []);

  const initStepsData = async () => {
    setIsLoading(true);
    const today = todayDateKey();
    try {
      const [goalRes, logRes] = await Promise.all([
        stepsApi.getGoalList(today),
        stepsApi.getTodayLog(today),
      ]);
      const goalItems = goalRes.data.data ?? [];
      const latestGoal = goalItems.reduce<typeof goalItems[number] | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setDailyGoal(latestGoal ? latestGoal.value : 0);

      const logItems = logRes.data.data ?? [];
      const latestLog = logItems.reduce<typeof logItems[number] | null>(
        (max, item) => (!max || item.id > max.id ? item : max),
        null
      );
      setSteps(latestLog ? Number(latestLog.value) || 0 : 0);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo cargar tu registro de pasos.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getBannerText = () => {
    if (dailyGoal === 0) return 'Configura tu objetivo diario de pasos';
    const diff = dailyGoal - steps;
    if (diff > 0) return `Solo ${diff.toLocaleString()} pasos para alcanzar tu objetivo`;
    if (diff === 0) return '¡Has alcanzado tu objetivo diario!';
    return `Has superado tu objetivo por ${Math.abs(diff).toLocaleString()} pasos`;
  };

  const logNow = async () => {
    if (dailyGoal === 0) {
      showToast('Info', { description: 'Configura primero tu objetivo diario de pasos', variant: 'info' });
      return;
    }
    const toAdd = parseInt(stepsToAdd, 10);
    if (isNaN(toAdd) || toAdd <= 0) {
      showToast('Info', { description: 'Introduce un número de pasos válido', variant: 'info' });
      return;
    }

    const total = steps + toAdd;
    setIsSaving(true);
    try {
      await stepsApi.logSteps(total, todayDateKey());
      setSteps(total);
      setStepsToAdd('');
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo registrar los pasos. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveGoal = async () => {
    const goal = parseInt(goalText, 10);
    if (isNaN(goal) || goal <= 0) {
      showToast('Info', { description: 'Introduce un número de pasos válido', variant: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      await stepsApi.saveGoal(goal, todayDateKey());
      setDailyGoal(goal);
      setEditingGoal(false);
    } catch (e) {
      logger.error(e);
      showToast('Error', { description: 'No se pudo guardar el objetivo. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const progress = dailyGoal > 0 ? Math.min(steps / dailyGoal, 1) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => props.navigation?.goBack()} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Registro de pasos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ height: 10 }} />

        <View style={styles.banner}>
          <Text style={styles.bannerText}>{getBannerText()}</Text>
        </View>

        <View style={styles.progressContainer}>
          <AnimatedRing size={240} strokeWidth={12} percent={progress * 100} color={C.orange} trackColor={C.gray10}>
            <View style={styles.progressInner}>
              <Ionicons name="walk" size={60} color={C.orange} />
              <Text style={styles.consumedValue}>{steps.toLocaleString()}</Text>
              <Text style={styles.glassesLabel}>Pasos</Text>
            </View>
          </AnimatedRing>
        </View>

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={stepsToAdd}
            onChangeText={setStepsToAdd}
            keyboardType="numeric"
            placeholder="Añadir pasos"
            placeholderTextColor={C.gray40}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.2 }, isSaving && { opacity: 0.5 }]}
          onPress={logNow}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.logBtnText}>Registrar ahora</Text>
          )}
        </Pressable>

        <LinearGradient
          colors={[C.orangeGradient1, C.orangeGradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <View style={styles.goalHeaderLeft}>
              <Ionicons name="walk" size={22} color="#FFFFFF" />
              <Text style={styles.goalTitle}>Objetivo diario</Text>
            </View>
            <Pressable onPress={() => setEditingGoal(!editingGoal)} style={({ pressed }) => pressed && { opacity: 0.2 }}>
              <Ionicons name="pencil" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {editingGoal ? (
            <View>
              <TextInput
                style={styles.goalInput}
                value={goalText}
                onChangeText={setGoalText}
                keyboardType="numeric"
                placeholder="Introduce los pasos"
                placeholderTextColor={C.gray40}
              />
              <Pressable
                style={({ pressed }) => [styles.goalSaveBtn, pressed && { opacity: 0.2 }]}
                onPress={saveGoal}
              >
                <Text style={styles.goalSaveBtnText}>Guardar</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.goalValue}>{dailyGoal.toLocaleString()} pasos</Text>
          )}
        </LinearGradient>

        <View style={{ height: 30 }} />
      </ScrollView>

      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={C.orange} />
        </View>
      )}
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
    fontSize: 16,
    color: C.textSecondary,
    marginTop: 4,
  },
  addRow: {
    marginTop: 20,
  },
  addInput: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    fontSize: 16,
    fontFamily: FONT.medium,
    color: C.textPrimary,
    textAlign: 'center',
  },
  logBtn: {
    backgroundColor: C.orange,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  logBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  goalCard: {
    borderRadius: RADIUS.md,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontFamily: FONT.semiBold,
    fontSize: 20,
    color: '#FFFFFF',
  },
  goalValue: {
    fontFamily: FONT.medium,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 8,
  },
  goalInput: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.sm,
    padding: 12,
    fontSize: 16,
    color: C.textPrimary,
    marginTop: 8,
  },
  goalSaveBtn: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.xs,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  goalSaveBtnText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.orange,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  });
}
