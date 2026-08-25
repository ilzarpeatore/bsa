import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedRing from '@components/AnimatedRing';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';

type WaterChartFilter = 'week' | 'month' | 'year' | 'every';

const FILTER_LABELS: Record<WaterChartFilter, string> = {
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
  every: 'Todo',
};

export default function WaterTrackerScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  // Dentro del componente (no a nivel de módulo) para poder capturar `C` y
  // `styles` -- ambos dependen del tema en vivo.
  const roundBtn = (icon: string, onPress: () => void) => (
    <Pressable style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.2 }]} onPress={onPress}>
      <Ionicons name={icon as any} size={24} color={C.blue} />
    </Pressable>
  );
  const [logValue, setLogValue] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [consumed, setConsumed] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<WaterChartFilter>('week');
  const [logList, setLogList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initWaterData();
  }, []);

  const initWaterData = async () => {
    setIsLoading(true);
    try {
      // await waterController.init() equivalent
      // Load consumed, dailyGoal, logList from API
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const getBannerText = () => {
    if (dailyGoal === 0) return 'Configura tu objetivo diario de agua';
    const diff = dailyGoal - consumed;
    if (diff > 0) return `Solo ${diff} vasos para alcanzar tu objetivo`;
    if (diff === 0) return '¡Has alcanzado tu objetivo diario!';
    return `Has superado tu objetivo por ${Math.abs(diff)} vasos`;
  };

  const decrementLog = () => {
    if (logValue > 0) setLogValue((prev) => prev - 1);
  };

  const incrementLog = () => {
    setLogValue((prev) => prev + 1);
  };

  const logNow = async () => {
    if (dailyGoal === 0) {
      Alert.alert('Info', 'Configura primero tu objetivo diario de agua');
      return;
    }
    if (logValue <= 0) {
      Alert.alert('Info', 'El valor debe ser mayor que cero');
      return;
    }

    const total = consumed + logValue;
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const req = {
      value: total,
      date: currentDate,
      time: currentTime,
    };

    try {
      // await setUserDailyWaterGoalApi(req);
      setLogValue(0);
      await initWaterData();
    } catch (e) {
    }
  };

  const saveGoal = async () => {
    const goal = parseInt(goalText, 10);
    if (!isNaN(goal) && goal > 0) {
      setDailyGoal(goal);
      setEditingGoal(false);
      // await waterController.saveGoal()
    }
  };

  const progress = dailyGoal > 0 ? Math.min(consumed / dailyGoal, 1) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => props.navigation?.goBack()} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Seguimiento de agua</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ height: 10 }} />

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{getBannerText()}</Text>
        </View>

        {/* Circular Progress */}
        <View style={styles.progressContainer}>
          <AnimatedRing size={240} strokeWidth={12} percent={progress * 100} color={C.blue} trackColor={C.gray10}>
            <View style={styles.progressInner}>
              <Ionicons name="water" size={60} color={C.blue} />
              <Text style={styles.consumedValue}>{consumed}</Text>
              <Text style={styles.glassesLabel}>Vasos</Text>
            </View>
          </AnimatedRing>
        </View>

        {/* Counter */}
        <View style={styles.counterRow}>
          {roundBtn('remove', decrementLog)}
          <Text style={styles.counterValue}>{logValue}</Text>
          {roundBtn('add', incrementLog)}
        </View>

        {/* Log Now Button */}
        <Pressable style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.2 }]} onPress={logNow}>
          <Text style={styles.logBtnText}>Registrar ahora</Text>
        </Pressable>

        {/* Daily Goal Card */}
        <LinearGradient
          colors={[C.orangeGradient1, C.orangeGradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <View style={styles.goalHeaderLeft}>
              <Ionicons name="water" size={22} color="#FFFFFF" />
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
                placeholder="Introduce los vasos"
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
            <Text style={styles.goalValue}>{dailyGoal} vasos</Text>
          )}
        </LinearGradient>

        {/* Chart Section */}
        {logList.length > 0 && dailyGoal !== 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Consumo diario de agua</Text>
              <View style={styles.filterRow}>
                {(['week', 'month', 'year', 'every'] as WaterChartFilter[]).map((filter) => (
                  <Pressable
                    key={filter}
                    style={({ pressed }) => [
                      styles.filterChip,
                      currentFilter === filter && styles.filterChipActive,
                      pressed && { opacity: 0.2 },
                    ]}
                    onPress={() => setCurrentFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        currentFilter === filter && styles.filterChipTextActive,
                      ]}
                    >
                      {FILTER_LABELS[filter]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {/* Chart placeholder */}
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>Área del gráfico</Text>
            </View>
          </View>
        )}

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
    paddingBottom: 30,
  },
  banner: {
    padding: 14,
    backgroundColor: C.brand10,
    borderRadius: 12,
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
    fontSize: 40,
    lineHeight: 47,
    color: C.textPrimary,
    marginTop: 8,
  },
  glassesLabel: {
    fontFamily: FONT.regular,
    fontSize: 16,
    color: C.textSecondary,
    marginTop: 4,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 20,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.blue10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontFamily: FONT.medium,
    fontSize: 20,
    color: C.white,
    minWidth: 40,
    textAlign: 'center',
  },
  logBtn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logBtnText: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  goalCard: {
    borderRadius: 16,
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
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: C.textPrimary,
    marginTop: 8,
  },
  goalSaveBtn: {
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  goalSaveBtnText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.orange,
  },
  chartCard: {
    backgroundColor: C.surfaceLight,
    borderRadius: 16,
    padding: 12,
    marginTop: 30,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontFamily: FONT.bold,
    fontSize: 17,
    color: C.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.blue10,
  },
  filterChipText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: C.textSecondary,
  },
  filterChipTextActive: {
    color: C.blue,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.gray40,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  });
}
