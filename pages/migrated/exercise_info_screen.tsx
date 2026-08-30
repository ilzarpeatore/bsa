import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
} from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  Card  } from '@components/ui/card';
import {  HStack  } from '@components/ui/hstack';
import {  Divider  } from '@components/ui/divider';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import { FONT, RADIUS } from './theme';
import {  ExerciseMediaHeaderMem, ExerciseHeaderFloatingIcons, HEADER_HEIGHT_RATIO  } from '../../components/ExerciseMediaHeader';
import {  MuscleIsolateIconMem  } from '../../components/MuscleIsolateIcon';
import {  AnalysisHistoryCardMem  } from '../../components/AnalysisHistoryCard';
import {  ErrorRetryMem  } from '../../components/ErrorRetry';
import MetricLineChart from '../../components/MetricLineChart';
import GlassSegmentedBar from '../../components/GlassSegmentedBar';
import {
  exerciseInfoApi,
  ExerciseDetailData,
  ExerciseAnalysisData,
  ExerciseAnalysisSession,
} from '../../api/exerciseInfo';

// Claves de logged_sets que no son metricas numericas graficables, mas
// "descanso" (excluida a peticion: no aporta como indicador de progreso).
const EXCLUDED_METRIC_KEYS = ['set_number', 'tempo', 'descanso'];

// "series" no es una clave dentro de cada set (cada elemento de logged_sets
// YA es una serie) — es el numero de series de la sesion, sacado aparte con
// session.sets.length en vez de bestValueForMetric().
const SERIES_METRIC_KEY = 'series';

function bestValueForMetric(session: ExerciseAnalysisSession, key: string): number | null {
  const nums = session.sets.reduce<number[]>((acc, s) => {
    const n = Number(s[key]);
    if (Number.isFinite(n)) acc.push(n);
    return acc;
  }, []);
  return nums.length > 0 ? Math.max(...nums) : null;
}
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_HEIGHT * HEADER_HEIGHT_RATIO;

type TabKey = 'muscle' | 'instructions' | 'equipment' | 'analysis';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'muscle', label: 'MÚSCULO' },
  { key: 'instructions', label: 'INSTRUCCIONES' },
  { key: 'equipment', label: 'EQUIPAMIENTO' },
  { key: 'analysis', label: 'ANÁLISIS' },
];

interface Props {
  navigation?: any;
  route?: any;
}

export default function ExerciseInfoScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { navigation, route } = props;
  const exerciseId: number | undefined = route?.params?.id ?? route?.params?.mExerciseId;

  const [activeTab, setActiveTab] = useState<TabKey>(route?.params?.initialTab ?? 'muscle');
  const [detail, setDetail] = useState<ExerciseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const isSavingFeedbackRef = useRef(false);

  const [analysis, setAnalysis] = useState<ExerciseAnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  const [tipsExpanded, setTipsExpanded] = useState(false);

  const loadDetail = useCallback(async (isRefresh = false) => {
    if (!exerciseId) {
      setError(true);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await exerciseInfoApi.getDetail(exerciseId);
      setDetail(res.data.data);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    loadDetail();
    // El navegador de React Navigation puede reutilizar esta misma instancia
    // de pantalla al saltar de un ejercicio a otro (misma ruta, params
    // distintos) sin desmontarla — sin este reset, el análisis del
    // ejercicio anterior se quedaba pegado en pantalla para el nuevo.
    setAnalysis(null);
    setAnalysisError(false);
  }, [loadDetail]);

  const loadAnalysis = useCallback(async () => {
    if (!exerciseId) return;
    setAnalysisLoading(true);
    setAnalysisError(false);
    try {
      const res = await exerciseInfoApi.getAnalysis(exerciseId);
      setAnalysis(res.data.data);
    } catch (e) {
      setAnalysisError(true);
    } finally {
      setAnalysisLoading(false);
    }
  }, [exerciseId]);

  const onRefresh = useCallback(() => {
    loadDetail(true);
    if (activeTab === 'analysis') loadAnalysis();
  }, [loadDetail, loadAnalysis, activeTab]);

  // Cubre tanto el cambio manual de pestaña como llegar ya con
  // initialTab: 'analysis' (ej. desde "Ejercicios principales") — en ese
  // caso la pestaña nace activa y nunca pasa por onSelectTab, así que sin
  // este efecto la petición no se disparaba nunca y se veía "Aún no hay
  // datos." aunque sí hubiera sesiones registradas.
  useEffect(() => {
    if (activeTab === 'analysis' && !analysis && !analysisLoading) {
      loadAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, exerciseId]);

  const onSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
  };

  const onFeedback = async (value: 'like' | 'dislike') => {
    if (!detail || isSavingFeedbackRef.current) return;
    const next = detail.user_feedback === value ? null : value;
    const prev = detail.user_feedback;
    setDetail({ ...detail, user_feedback: next });
    isSavingFeedbackRef.current = true;
    try {
      await exerciseInfoApi.sendFeedback(detail.id, next);
    } catch (e) {
      setDetail((d) => (d ? { ...d, user_feedback: prev } : d));
    } finally {
      isSavingFeedbackRef.current = false;
    }
  };

  const toggleTips = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTipsExpanded((v) => !v);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ExerciseHeaderFloatingIcons
          onBack={() => navigation?.goBack()}
          isFavourite={false}
          onToggleFavourite={() => {}}
        />
        <Box style={styles.loader}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ExerciseHeaderFloatingIcons
          onBack={() => navigation?.goBack()}
          isFavourite={false}
          onToggleFavourite={() => {}}
        />
        <Box style={styles.loader}>
          <ErrorRetryMem message="No se pudo cargar el ejercicio." onRetry={loadDetail} />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ExerciseHeaderFloatingIcons
        onBack={() => navigation?.goBack()}
        isFavourite={detail.user_feedback === 'like'}
        onToggleFavourite={() => onFeedback('like')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + WORKOUT_MINIBAR_CLEARANCE }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textSecondary} />
        }
      >
        <ExerciseMediaHeaderMem
          headerHeight={HEADER_HEIGHT}
          thumbnailUrl={detail.thumbnail_url}
          onPlayPress={
            detail.media_type === 'video' && detail.media_url
              ? () =>
                  navigation?.navigate('MigratedYoutubePlayer', {
                    url: detail.media_url,
                    img: detail.thumbnail_url ?? undefined,
                  })
              : undefined
          }
        />

        <Box style={styles.panel}>
          {/* Badges */}
          <HStack space="sm" className="flex-wrap" style={{ marginBottom: 12 }}>
            {detail.muscle?.primary ? (
              <Box style={styles.muscleBadge}>
                <Text style={styles.muscleBadgeText}>{detail.muscle.primary.name.toUpperCase()}</Text>
              </Box>
            ) : null}
            {detail.is_popular ? (
              <Box style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MUY POPULAR</Text>
              </Box>
            ) : null}
          </HStack>

          <Text style={styles.title}>{detail.title}</Text>

          {/* Feedback row */}
          <HStack className="items-center" style={{ marginBottom: 20 }}>
            <Text style={styles.feedbackText}>
              ¿Cómo te gustaría que te recomendemos este ejercicio?
            </Text>
            <HStack style={{ gap: 10 }}>
              <Pressable
                style={[styles.feedbackBtn, detail.user_feedback === 'like' && styles.feedbackBtnActive]}
                onPress={() => onFeedback('like')}
              >
                <Icon
                  name="thumbs-up"
                  size={20}
                  color={detail.user_feedback === 'like' ? '#FFFFFF' : C.textSecondary}
                />
              </Pressable>
              <Pressable
                style={[styles.feedbackBtn, detail.user_feedback === 'dislike' && styles.feedbackBtnActiveNegative]}
                onPress={() => onFeedback('dislike')}
              >
                <Icon
                  name="thumbs-down"
                  size={20}
                  color={detail.user_feedback === 'dislike' ? '#FFFFFF' : C.textSecondary}
                />
              </Pressable>
            </HStack>
          </HStack>

          {/* Tab bar -- Liquid Glass real en iOS 26+ (pedido explícito
              2026-08-29), superficie plana igual que antes en el resto. */}
          <GlassSegmentedBar style={styles.tabBar}>
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                style={[styles.tabPill, activeTab === t.key && styles.tabPillActive]}
                onPress={() => onSelectTab(t.key)}
              >
                <Text style={[styles.tabPillText, activeTab === t.key && styles.tabPillTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </GlassSegmentedBar>

          {/* Tab content */}
          <Box style={styles.tabContent}>
            {activeTab === 'muscle' && (
              <MuscleTab primary={detail.muscle?.primary ?? null} secondary={detail.muscle?.secondary ?? []} />
            )}
            {activeTab === 'instructions' && (
              <InstructionsTab
                steps={detail.instructions?.steps ?? []}
                tips={detail.instructions?.tips ?? []}
                tipsExpanded={tipsExpanded}
                onToggleTips={toggleTips}
              />
            )}
            {activeTab === 'equipment' && <EquipmentTab equipment={detail.equipment} />}
            {activeTab === 'analysis' && (
              <AnalysisTab
                loading={analysisLoading}
                error={analysisError}
                data={analysis}
                onRetry={loadAnalysis}
              />
            )}
          </Box>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}

function MuscleTab({
  primary,
  secondary,
}: {
  primary: ExerciseDetailData['muscle']['primary'];
  secondary: ExerciseDetailData['muscle']['secondary'];
}) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <Box>
      {primary ? (
        <Box style={styles.muscleSection}>
          <Text style={styles.muscleSectionTitle}>PRINCIPAL</Text>
          <MuscleRow name={primary.name} />
        </Box>
      ) : (
        <Text style={styles.emptyText}>No hay información muscular disponible.</Text>
      )}

      {secondary.length > 0 && (
        <Box style={styles.muscleSection}>
          <Text style={styles.muscleSectionTitle}>SECUNDARIA</Text>
          {secondary.map((m, idx) => (
            <Box key={m.name}>
              <MuscleRow name={m.name} />
              {idx < secondary.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function MuscleRow({ name }: { name: string }) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <HStack className="items-center py-2.5">
      <Box style={styles.muscleIconWrap}>
        <MuscleIsolateIconMem muscleName={name} size={56} />
      </Box>
      <Text style={styles.muscleRowText}>{name}</Text>
    </HStack>
  );
}

function InstructionsTab({
  steps,
  tips,
  tipsExpanded,
  onToggleTips,
}: {
  steps: string[];
  tips: string[];
  tipsExpanded: boolean;
  onToggleTips: () => void;
}) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  return (
    <Box>
      {steps.length === 0 ? (
        <Text style={styles.emptyText}>Aún no hay instrucciones disponibles para este ejercicio.</Text>
      ) : (
        steps.map((step, idx) => (
          <Box key={idx}>
            <HStack className="py-3">
              <Text style={styles.stepNumber}>{idx + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </HStack>
            {idx < steps.length - 1 && <Divider />}
          </Box>
        ))
      )}

      {tips.length > 0 && (
        <Card variant="ghost" className="rounded-2xl p-3.5" style={{ marginTop: 16 }}>
          <Pressable style={styles.tipsHeader} onPress={onToggleTips}>
            <Text style={styles.tipsHeaderText}>CONSEJOS IMPORTANTES</Text>
            <Icon
              name="chevron-down"
              size={18}
              color={C.textSecondary}
              style={{ transform: [{ rotate: tipsExpanded ? '180deg' : '0deg' }] }}
            />
          </Pressable>
          {tipsExpanded && (
            <Box style={styles.tipsBody}>
              {tips.map((tip, idx) => (
                <HStack key={idx} style={{ marginBottom: 8 }}>
                  <Text style={styles.tipBullet}>{'•'}</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </HStack>
              ))}
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}

function EquipmentTab({ equipment }: { equipment: ExerciseDetailData['equipment'] }) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  if (!equipment) {
    return <Text style={styles.emptyText}>Este ejercicio no requiere equipamiento.</Text>;
  }
  return (
    <HStack className="items-center py-3">
      {equipment.image_url ? (
        <Image source={{ uri: equipment.image_url }} style={styles.equipmentImage} contentFit="cover" />
      ) : (
        <Box style={[styles.equipmentImage, styles.equipmentImageFallback]}>
          <Icon name="barbell-outline" size={32} color={C.gray30} />
        </Box>
      )}
      <Text style={styles.equipmentName}>{equipment.name}</Text>
    </HStack>
  );
}

function ProgressChartSection({ sessions }: { sessions: ExerciseAnalysisSession[] }) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const METRIC_META: Record<string, { label: string; unit: string; color: string }> = useMemo(() => ({
    series: { label: 'Series', unit: '', color: C.gray50 },
    carga: { label: 'Carga', unit: 'kg', color: C.orange },
    reps: { label: 'Repeticiones', unit: '', color: C.blue60 },
    rir: { label: 'RIR', unit: '', color: C.purple60 },
    rpe: { label: 'RPE', unit: '', color: C.destructive60 },
    tiempo: { label: 'Tiempo', unit: 's', color: C.success60 },
  }), [C]);
  const metricMeta = useCallback(
    (key: string) => METRIC_META[key] ?? { label: key.charAt(0).toUpperCase() + key.slice(1), unit: '', color: C.textSecondary },
    [METRIC_META, C]
  );
  // El backend devuelve las sesiones mas recientes primero (una fila por dia,
  // "el log mas reciente de cada dia" = estado final de esa sesion) —
  // invertimos para pintar la grafica en orden cronologico (izq = antiguo).
  const chronoSessions = useMemo(() => [...sessions].reverse(), [sessions]);

  const numericMetricKeys = useMemo(() => {
    const keys = new Set<string>();
    // "series" siempre disponible (se saca de sets.length, no de una clave
    // dentro de cada set) mientras haya al menos una sesion con series.
    if (chronoSessions.some((session) => session.sets.length > 0)) {
      keys.add(SERIES_METRIC_KEY);
    }
    chronoSessions.forEach((session) => {
      session.sets.forEach((set) => {
        Object.keys(set).forEach((k) => {
          if (EXCLUDED_METRIC_KEYS.includes(k)) return;
          const n = Number(set[k]);
          if (Number.isFinite(n)) keys.add(k);
        });
      });
    });
    // orden fijo y predecible: series, carga, reps, rir, rpe, tiempo, luego el resto
    const priority = ['series', 'carga', 'reps', 'rir', 'rpe', 'tiempo'];
    return Array.from(keys).sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [chronoSessions]);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  useEffect(() => {
    if (numericMetricKeys.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics([numericMetricKeys[0]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericMetricKeys]);

  const valuesByMetric = useMemo(() => {
    const map: Record<string, (number | null)[]> = {};
    numericMetricKeys.forEach((key) => {
      map[key] =
        key === SERIES_METRIC_KEY
          ? chronoSessions.map((session) => (session.sets.length > 0 ? session.sets.length : null))
          : chronoSessions.map((session) => bestValueForMetric(session, key));
    });
    return map;
  }, [chronoSessions, numericMetricKeys]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length > 0 ? next : prev; // siempre al menos una seleccionada
      }
      return [...prev, key];
    });
  };

  if (numericMetricKeys.length === 0) {
    return null;
  }

  const chartSeries = selectedMetrics.map((key) => ({
    key,
    color: metricMeta(key).color,
    values: valuesByMetric[key],
  }));

  return (
    <Card variant="ghost" className="rounded-2xl p-4" style={{ marginBottom: 16 }}>
      <Text style={styles.chartSectionTitle}>Evolución</Text>

      <HStack space="sm" className="flex-wrap" style={{ marginBottom: 14 }}>
        {(() => {
          const selectedMetricsSet = new Set(selectedMetrics);
          return numericMetricKeys.map((key) => {
            const meta = metricMeta(key);
            const active = selectedMetricsSet.has(key);
            return (
              <Pressable
                key={key}
                style={[styles.metricChip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                onPress={() => toggleMetric(key)}
              >
                <Text style={[styles.metricChipText, active && styles.metricChipTextActive]}>{meta.label}</Text>
              </Pressable>
            );
          });
        })()}
      </HStack>

      {chronoSessions.length < 2 ? (
        <Text style={styles.emptyText}>Necesitas al menos 2 sesiones registradas para ver la evolución.</Text>
      ) : (
        <>
          <MetricLineChart series={chartSeries} pointCount={chronoSessions.length} width={SCREEN_WIDTH - 72} height={170} />
          <HStack className="justify-between" style={{ marginTop: 6 }}>
            <Text style={styles.chartDateText}>{formatShortDate(chronoSessions[0].date)}</Text>
            <Text style={styles.chartDateText}>{formatShortDate(chronoSessions[chronoSessions.length - 1].date)}</Text>
          </HStack>
          <HStack space="md" className="flex-wrap" style={{ marginTop: 14 }}>
            {selectedMetrics.map((key) => {
              const meta = metricMeta(key);
              const values = valuesByMetric[key].filter((v): v is number => v !== null);
              const latest = values.length > 0 ? values[values.length - 1] : null;
              return (
                <HStack key={key} className="items-center" style={{ gap: 6 }}>
                  <Box style={[styles.legendDot, { backgroundColor: meta.color }]} />
                  <Text style={styles.legendText}>
                    {meta.label}: {latest !== null ? `${latest}${meta.unit ? ` ${meta.unit}` : ''}` : '—'}
                  </Text>
                </HStack>
              );
            })}
          </HStack>
        </>
      )}
    </Card>
  );
}

function AnalysisTab({
  loading,
  error,
  data,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  data: ExerciseAnalysisData | null;
  onRetry: () => void;
}) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  if (loading) {
    return (
      <Box style={{ paddingVertical: 30 }}>
        <Spinner size="small" color={C.textPrimary} />
      </Box>
    );
  }
  if (error) {
    return <ErrorRetryMem message="No se pudo cargar el historial." onRetry={onRetry} />;
  }
  if (!data || data.total_sessions === 0) {
    return <Text style={styles.emptyText}>Aún no hay datos.</Text>;
  }
  return (
    <Box>
      <ProgressChartSection sessions={data.sessions} />
      {data.sessions.map((session) => (
        <AnalysisHistoryCardMem key={session.date} session={session} />
      ))}
    </Box>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  muscleBadge: {
    backgroundColor: C.brand20,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  muscleBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: C.textPrimary,
    letterSpacing: 0.5,
  },
  popularBadge: {
    backgroundColor: C.warning10,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  popularBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: C.warning40,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: FONT.extraBold,
    fontSize: 30,
    lineHeight: 36,
    color: C.white,
    marginBottom: 18,
  },
  feedbackText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
    marginRight: 12,
  },
  feedbackBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBtnActive: {
    backgroundColor: C.success60,
  },
  feedbackBtnActiveNegative: {
    backgroundColor: C.destructive60,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surfaceLight,
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 26,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: C.brand50,
  },
  tabPillText: {
    fontFamily: FONT.bold,
    fontSize: 10,
    color: C.textSecondary,
    letterSpacing: 0.3,
  },
  tabPillTextActive: {
    color: C.white,
  },
  tabContent: {
    minHeight: 200,
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    paddingVertical: 30,
  },
  muscleSection: {
    marginBottom: 20,
  },
  muscleSectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 12,
    color: C.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  muscleIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
    backgroundColor: C.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  muscleRowText: {
    marginLeft: 14,
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: C.white,
  },
  stepNumber: {
    width: 28,
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.textPrimary,
  },
  stepText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.white,
    lineHeight: 21,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipsHeaderText: {
    fontFamily: FONT.bold,
    fontSize: 12,
    color: C.white,
    letterSpacing: 0.5,
  },
  tipsBody: {
    marginTop: 12,
  },
  tipBullet: {
    width: 16,
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.textSecondary,
  },
  tipText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
  },
  equipmentImage: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.sm,
    backgroundColor: C.surface,
  },
  equipmentImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceLight,
  },
  equipmentName: {
    marginLeft: 16,
    fontFamily: FONT.semiBold,
    fontSize: 16,
    color: C.white,
    flex: 1,
  },
  chartSectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.white,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  metricChipText: {
    fontFamily: FONT.semiBold,
    fontSize: 11.5,
    color: C.textSecondary,
  },
  metricChipTextActive: {
    color: '#FFFFFF',
  },
  chartDateText: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: C.textSecondary,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: C.white,
  },
  });
}
