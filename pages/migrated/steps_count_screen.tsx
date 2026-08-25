import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedRing from '@components/AnimatedRing';
import ScreenHeader from '@components/ScreenHeader';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { useResponsiveStyleSheet } from '@helper/responsiveStyleSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CHART_FILTERS = ['Diario', 'Semanal', 'Mensual'];

export default function StepsCountScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [steps, setSteps] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [selectedPickerIndex, setSelectedPickerIndex] = useState(0);
  const [currentFilter, setCurrentFilter] = useState('Daily');
  const [logList, setLogList] = useState<any[]>([]);

  useEffect(() => {
    initSteps();
  }, []);

  const initSteps = async () => {
    // Simulate step controller init
    setIsLoading(false);
  };

  const getGoalMessage = () => {
    if (dailyGoal === 0) return 'Establece tu objetivo diario';
    const diff = dailyGoal - steps;
    if (diff > 0) return `Solo ${diff} pasos restantes`;
    if (diff === 0) return '¡Objetivo alcanzado!';
    return `¡${Math.abs(diff)} pasos por encima del objetivo!`;
  };

  const handleSaveGoal = async () => {
    setEditingGoal(false);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const req = {
      id: 0,
      value: dailyGoal !== 0 ? dailyGoal : 1000,
      type: 'step_track',
      unit: 'steps',
      date: today,
    };
    // await setProgressApi(req);
    await initSteps();
  };

  const progress = dailyGoal > 0 ? Math.min(steps / dailyGoal, 1.0) : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Seguimiento de pasos" onBack={() => props.navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.goalInfoBox}>
          <Text style={styles.goalInfoText}>{getGoalMessage()}</Text>
        </View>

        <View style={styles.progressContainer}>
          <AnimatedRing size={240} strokeWidth={12} percent={progress * 100} color={C.orange} trackColor={C.gray10}>
            <View style={styles.progressInner}>
              <Ionicons name="walk-sharp" size={60} color={C.orange} />
              <Text style={styles.stepCount}>{steps}</Text>
              <Text style={styles.stepsLabel}>Pasos</Text>
            </View>
          </AnimatedRing>
        </View>

        <LinearGradient
          colors={[C.orangeGradient1, C.orangeGradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dailyGoalCard}
        >
          <View style={styles.dailyGoalHeader}>
            <View style={styles.dailyGoalTitleRow}>
              <Ionicons name="water" size={20} color="#FFFFFF" />
              <Text style={styles.dailyGoalTitle}>Objetivo diario</Text>
            </View>
            <Pressable
              onPress={() => setEditingGoal(!editingGoal)}
              style={({ pressed }) => pressed && { opacity: 0.2 }}
            >
              <Ionicons
                name={dailyGoal === 0 ? 'add' : 'create'}
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {editingGoal ? (
            <View>
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 100 }, (_, i) => (i + 1) * 1000).map((val) => (
                    <Pressable
                      key={val}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        selectedPickerIndex === Math.floor(val / 1000) - 1 && styles.pickerItemActive,
                        pressed && { opacity: 0.2 },
                      ]}
                      onPress={() => {
                        setSelectedPickerIndex(Math.floor(val / 1000) - 1);
                        setDailyGoal(val);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{val}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable
                style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.2 }]}
                onPress={handleSaveGoal}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.dailyGoalValue}>
              {dailyGoal === 0 ? '' : `${dailyGoal} pasos`}
            </Text>
          )}
        <View style={{ height: 15 }} />
        </LinearGradient>

        {logList.length > 0 && dailyGoal !== 0 ? (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Pasos</Text>
              <View style={styles.filterRow}>
                {CHART_FILTERS.map((f) => (
                  <Pressable
                    key={f}
                    style={({ pressed }) => [
                      styles.filterChip,
                      currentFilter === f && styles.filterChipActive,
                      pressed && { opacity: 0.2 },
                    ]}
                    onPress={() => setCurrentFilter(f)}
                  >
                    <Text style={[styles.filterText, currentFilter === f && styles.filterTextActive]}>
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>Gráfico</Text>
            </View>
          </View>
        ) : isLoading ? (
          <ActivityIndicator size="large" color={C.orange} style={{ marginTop: 20 }} />
        ) : null}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    gap: 12,
  },
  appBarTitle: { fontSize: 20, fontFamily: FONT.semiBold, color: C.textPrimary },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  goalInfoBox: {
    backgroundColor: C.brand10,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 25,
  },
  goalInfoText: { fontSize: 14, fontFamily: FONT.semiBold, color: C.textPrimary, textAlign: 'center' },
  progressContainer: { alignItems: 'center', marginVertical: 20 },
  progressInner: { alignItems: 'center' },
  stepCount: { color: C.textPrimary, fontSize: 40, lineHeight: 47, fontFamily: FONT.bold, marginTop: 8 },
  stepsLabel: { fontSize: 16, color: C.gray40, fontFamily: FONT.regular },
  dailyGoalCard: { borderRadius: 16, padding: 16, marginVertical: 20 },
  dailyGoalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyGoalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyGoalTitle: { fontSize: 20, fontFamily: FONT.semiBold, color: '#FFFFFF' },
  dailyGoalValue: { fontSize: 18, fontFamily: FONT.medium, color: '#FFFFFF', marginTop: 8 },
  pickerContainer: { height: 150, marginTop: 12 },
  pickerScroll: { flex: 1 },
  pickerItem: { paddingVertical: 8, alignItems: 'center' },
  pickerItemActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8 },
  pickerItemText: { fontSize: 22, fontFamily: FONT.semiBold, color: '#FFFFFF' },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: { fontSize: 16, fontFamily: FONT.bold, color: C.orange },
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle: { fontSize: 17, fontFamily: FONT.bold, color: C.textPrimary },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  filterChipActive: { backgroundColor: C.brand10 },
  filterText: { fontSize: 13, color: C.gray40, fontFamily: FONT.regular },
  filterTextActive: { color: C.textPrimary, fontFamily: FONT.semiBold },
  chartPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center' },
  chartPlaceholderText: { color: C.gray30, fontSize: 14 },
  });
}
