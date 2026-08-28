import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { showToast } from '@helper/toast';
import {  Image  } from 'expo-image';
import {  SafeAreaView, useSafeAreaInsets  } from 'react-native-safe-area-context';
import {  LinearGradient  } from 'expo-linear-gradient';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  Card  } from '@components/ui/card';
import {  HStack  } from '@components/ui/hstack';
import {  Divider  } from '@components/ui/divider';
import {  Button, ButtonText  } from '@components/ui/button';
import TutorialTarget from '../../components/tutorial/TutorialTarget';
import { useTutorial } from '@store/TutorialContext';
import { FONT, SHADOW, RADIUS } from './theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import { WORKOUT_MINIBAR_CLEARANCE } from '@components/WorkoutMinimizedBar';
import {  ExerciseThumbMem  } from '../../components/ExerciseThumb';
import {  workoutTemplateApi  } from '../../api/workoutTemplate';
import {  readinessApi, ReadinessValues  } from '../../api/readiness';
import {
  fetchUnifiedWorkout,
  formatPrescribedSubtitle,
  pickWorkoutFallbackImage,
  UnifiedWorkout,
  UnifiedExercise,
} from './workoutViewShared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getSeriesCount(prescribed: Record<string, any>): number | null {
  const series = parseInt(prescribed?.series, 10);
  return Number.isFinite(series) && series > 0 ? series : null;
}

function formatLastPerformance(ex: UnifiedExercise): string | null {
  const sets = ex.lastPerformance?.sets;
  if (!sets || sets.length === 0) return null;
  const first = sets[0];
  const parts: string[] = [];
  if (first.carga != null && first.carga !== '') parts.push(`${first.carga} kg`);
  if (first.reps != null && first.reps !== '') parts.push(`${first.reps} reps`);
  if (parts.length === 0) return `Completado la última vez (${sets.length} series)`;
  return `${parts.join(' × ')} · ${sets.length} ${sets.length === 1 ? 'serie' : 'series'}`;
}

// ═══════════════════════════ Readiness gate ═══════════════════════════
// Formulario diario obligatorio (salvo que el admin lo desactive para este
// cliente) que se rellena antes de ver el contenido del workout. Un
// registro por usuario/dia (backend: daily_readiness_checks).

const SLEEP_LABELS = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];
const ENERGY_LABELS = ['Agotado', 'Bajo', 'Normal', 'Alto', 'Muy alto'];
const STRESS_LABELS = ['Muy relajado', 'Relajado', 'Normal', 'Estresado', 'Muy estresado'];

function ScaleRow({
  count,
  value,
  onChange,
  labels,
  rs,
}: {
  count: number;
  value: number | null;
  onChange: (v: number) => void;
  labels?: string[];
  rs: ReturnType<typeof createReadinessStyles>;
}) {
  return (
    <HStack space="sm" className="items-center flex-wrap" style={{ marginTop: 12 }}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          style={[rs.scaleChip, value === n && rs.scaleChipActive]}
          onPress={() => onChange(n)}
        >
          <Text style={[rs.scaleChipText, value === n && rs.scaleChipTextActive]}>{n}</Text>
        </Pressable>
      ))}
      {labels && value ? <Text style={rs.scaleHint}>{labels[value - 1]}</Text> : null}
    </HStack>
  );
}

function ReadinessForm({ onDone }: { onDone: () => void }) {
  const { colors: C } = useAppColorMode();
  const rs = useMemo(() => createReadinessStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { reportAction } = useTutorial();
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const allAnswered = sleepQuality && sorenessLevel && energyLevel && stressLevel;

  const onSubmit = async () => {
    if (!allAnswered) return;
    setSaving(true);
    try {
      const values: ReadinessValues = {
        sleep_quality: sleepQuality!,
        soreness_level: sorenessLevel!,
        energy_level: energyLevel!,
        stress_level: stressLevel!,
      };
      await readinessApi.submit(values);
      reportAction('readiness_submitted');
      onDone();
    } catch (e) {
      showToast('Error', { description: 'No se pudo guardar tu chequeo diario. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={rs.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={[rs.scroll, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Box style={rs.badge}>
          <Icon name="pulse-outline" size={22} color={C.textPrimary} />
        </Box>
        <Text style={rs.title}>¿Cómo llegas hoy?</Text>
        <Text style={rs.subtitle}>
          Responde antes de empezar — ayuda a tu coach a ajustar tu entrenamiento a cómo te sientes de verdad.
        </Text>

        <Card variant="elevated" style={{ marginBottom: 14 }}>
          <Text style={rs.question}>Valora tu descanso nocturno</Text>
          <ScaleRow count={5} value={sleepQuality} onChange={setSleepQuality} labels={SLEEP_LABELS} rs={rs} />
        </Card>

        <Card variant="elevated" style={{ marginBottom: 14 }}>
          <Text style={rs.question}>Nivel de agujetas</Text>
          <Text style={rs.questionHint}>1 = ninguna · 10 = muy intensas</Text>
          <ScaleRow count={10} value={sorenessLevel} onChange={setSorenessLevel} rs={rs} />
        </Card>

        <Card variant="elevated" style={{ marginBottom: 14 }}>
          <Text style={rs.question}>Nivel de energía</Text>
          <ScaleRow count={5} value={energyLevel} onChange={setEnergyLevel} labels={ENERGY_LABELS} rs={rs} />
        </Card>

        <Card variant="elevated" style={{ marginBottom: 14 }}>
          <Text style={rs.question}>Nivel de estrés mental</Text>
          <ScaleRow count={5} value={stressLevel} onChange={setStressLevel} labels={STRESS_LABELS} rs={rs} />
        </Card>
      </ScrollView>

      <Box style={{ paddingHorizontal: 24, backgroundColor: C.bg, paddingBottom: Math.max(insets.bottom, 12) + 6 }}>
        <Divider style={{ marginBottom: 12 }} />
        <TutorialTarget id="workout-preview-readiness-submit">
          <Button
            onPress={onSubmit}
            disabled={!allAnswered || saving}
            radius="pill"
            className="py-4"
          >
            {saving ? (
              <Spinner size="small" color={C.accentBlackForeground} />
            ) : (
              <ButtonText style={{ fontFamily: FONT.bold, fontSize: 15, letterSpacing: 0.5 }}>CONTINUAR AL ENTRENAMIENTO</ButtonText>
            )}
          </Button>
        </TutorialTarget>
      </Box>
    </SafeAreaView>
  );
}

// ═══════════════════════════ Preview screen ═══════════════════════════

interface Props {
  navigation?: any;
  route?: any;
}

export default function WorkoutPreviewScreen(props: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { navigation, route } = props;
  const insets = useSafeAreaInsets();
  const programDayAssignmentId: number | undefined = route?.params?.programDayAssignmentId;
  const workoutTemplateId: number | undefined = route?.params?.workoutTemplateId;
  const fallbackTitle: string | undefined = route?.params?.mTitle;

  const [workout, setWorkout] = useState<UnifiedWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

  const [readinessResolved, setReadinessResolved] = useState(false);
  const [readinessNeeded, setReadinessNeeded] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const data = await fetchUnifiedWorkout({
        programDayAssignmentId,
        workoutTemplateId,
        fallbackTitle,
      });
      setWorkout(data);
      setIsFavourite(data.isFavourite);
    } catch (e) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [programDayAssignmentId, workoutTemplateId, fallbackTitle]);

  useEffect(() => {
    load();
    readinessApi
      .getToday()
      .then((res) => {
        const { required, submitted_today } = res.data.data;
        setReadinessNeeded(required && !submitted_today);
      })
      .catch(() => {
        // Si el chequeo de readiness falla (red, etc.) no bloqueamos el
        // entrenamiento - mejor dejar entrenar que dejar a alguien atascado.
        setReadinessNeeded(false);
      })
      .finally(() => setReadinessResolved(true));
  }, [load]);

  const onToggleFavourite = () => {
    if (!workoutTemplateId) return;
    const next = !isFavourite;
    setIsFavourite(next);
    workoutTemplateApi.setFavourite(workoutTemplateId).catch(() => {
      setIsFavourite(!next);
    });
  };

  const totalSeries = (workout?.blocks ?? []).reduce(
    (sum, block) => sum + block.exercises.reduce((s, ex) => s + (getSeriesCount(ex.prescribed) ?? 0), 0),
    0
  );

  const onStart = () => {
    navigation?.navigate('MigratedWorkoutSession', {
      programDayAssignmentId,
      workoutTemplateId,
      mTitle: workout?.title || fallbackTitle,
    });
  };

  if (!readinessResolved || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Box style={styles.loader}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      </SafeAreaView>
    );
  }

  if (readinessNeeded) {
    return <ReadinessForm onDone={() => setReadinessNeeded(false)} />;
  }

  if (error || !workout) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Pressable style={[styles.backBtnStatic, { marginTop: insets.top + 8 }]} onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <Box style={styles.loader}>
          <Text style={styles.emptyText}>No se pudo cargar el entrenamiento.</Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (workout.isRest || workout.isAdjusted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Pressable style={[styles.backBtnStatic, { marginTop: insets.top + 8 }]} onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <Box style={styles.loader}>
          <Icon name="moon-outline" size={40} color={C.textSecondary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>
            {workout.isAdjusted ? 'Sesión ajustada por tu entrenador' : 'Día de descanso'}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (workout.isExclusive && !workout.isAccessible) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Pressable style={[styles.backBtnStatic, { marginTop: insets.top + 8 }]} onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <Box style={styles.loader}>
          <Icon name="lock-closed-outline" size={40} color={C.textSecondary} />
          <Text style={[styles.title, { textAlign: 'center', marginTop: 16 }]}>{workout.title}</Text>
          <Text style={[styles.emptyText, { marginTop: 8 }]}>
            Contenido exclusivo — hazte cliente 1:1 o compra un paquete con acceso completo a Workouts.
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 170 + WORKOUT_MINIBAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header image */}
        <Box style={styles.heroSection}>
          <Image
            source={workout.thumbnail ? { uri: workout.thumbnail } : pickWorkoutFallbackImage(workoutTemplateId ?? programDayAssignmentId)}
            style={styles.heroImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
            style={styles.heroTopFade}
          />
          <Pressable style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation?.goBack()}>
            <Icon name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </Box>

        {/* Title row — sin numberOfLines: es el título de la propia pantalla
            (dentro de un ScrollView con espacio de sobra), así que se deja
            envolver en tantas líneas como haga falta en vez de cortarlo con
            "..." cuando el nombre del workout es largo. */}
        <HStack className="justify-between items-start px-5" style={{ paddingTop: 18 }}>
          <Text style={styles.title}>
            {workout.title}
          </Text>
          {workoutTemplateId ? (
            <Box style={styles.titleActions}>
              <Pressable style={styles.iconBtn} onPress={onToggleFavourite}>
                <Icon name={isFavourite ? 'bookmark' : 'bookmark-outline'} size={18} color={isFavourite ? C.accentBlack : C.textPrimary} />
              </Pressable>
            </Box>
          ) : null}
        </HStack>

        {workout.description ? (
          <Text style={styles.description}>{workout.description}</Text>
        ) : null}

        {/* Stats row */}
        <Card variant="elevated" className="mx-5 px-0 py-4" style={{ marginTop: 20 }}>
          <HStack className="items-center">
            <Box style={styles.statItem}>
              <Text style={styles.statValue}>{workout.exerciseCount}</Text>
              <Text style={styles.statLabel}>Ejercicios</Text>
            </Box>
            {totalSeries > 0 && (
              <>
                <Divider orientation="vertical" style={{ height: 28, width: 1 }} />
                <Box style={styles.statItem}>
                  <Text style={styles.statValue}>{totalSeries}</Text>
                  <Text style={styles.statLabel}>Series totales</Text>
                </Box>
              </>
            )}
            {workout.blocks.length > 1 && (
              <>
                <Divider orientation="vertical" style={{ height: 28, width: 1 }} />
                <Box style={styles.statItem}>
                  <Text style={styles.statValue}>{workout.blocks.length}</Text>
                  <Text style={styles.statLabel}>Bloques</Text>
                </Box>
              </>
            )}
          </HStack>
        </Card>

        {/* Exercise list */}
        <Box style={styles.exerciseList}>
          {workout.blocks.map((block) => (
            <Box key={block.id}>
              {workout.blocks.length > 1 && block.title ? (
                <Text style={styles.blockTitle}>{block.title}</Text>
              ) : null}
              {block.exercises.map((ex) => {
                const seriesCount = getSeriesCount(ex.prescribed);
                const lastPerformance = formatLastPerformance(ex);
                const noteExpanded = expandedNoteId === ex.id;
                return (
                  <Card key={ex.id} variant="elevated" className="p-3.5" style={{ marginBottom: 12 }}>
                    <Pressable
                      onPress={() =>
                        navigation?.navigate('MigratedExerciseInfo', {
                          mExerciseId: ex.exerciseId,
                          mExerciseName: ex.title,
                        })
                      }
                    >
                      <HStack className="items-center">
                        <ExerciseThumbMem image={ex.image} bodyPartId={ex.bodyPartId} />
                        <Box style={styles.exerciseInfo}>
                          <Text style={styles.exerciseTitle} numberOfLines={2}>
                            {ex.title}
                          </Text>
                          <HStack space="sm" className="items-center" style={{ marginTop: 6 }}>
                            {seriesCount != null && (
                              <Box style={styles.seriesChip}>
                                <Text style={styles.seriesChipText}>{seriesCount} series</Text>
                              </Box>
                            )}
                            <Text style={styles.exerciseSubtitle} numberOfLines={1}>
                              {formatPrescribedSubtitle(ex.prescribed)}
                            </Text>
                          </HStack>
                        </Box>
                      </HStack>
                    </Pressable>

                    {lastPerformance && (
                      <>
                        <Divider style={{ marginTop: 10 }} />
                        <HStack space="xs" className="items-center" style={{ paddingTop: 10 }}>
                          <Box style={styles.lastPerformanceIconWrap}>
                            <Icon name="time-outline" size={13} color={C.blue60} />
                          </Box>
                          <Text style={styles.lastPerformanceLabel}>Última vez</Text>
                          <Text style={styles.lastPerformanceText}>{lastPerformance}</Text>
                        </HStack>
                      </>
                    )}

                    {ex.coachNotes ? (
                      <Pressable
                        style={styles.coachNoteBanner}
                        onPress={() => setExpandedNoteId(noteExpanded ? null : ex.id)}
                      >
                        <HStack space="xs" className="items-center">
                          <Icon name="warning-outline" size={15} color={C.warning60} />
                          <Text style={styles.coachNoteHeaderText}>Revisa las notas de este ejercicio</Text>
                          <Icon
                            name={noteExpanded ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color={C.warning60}
                          />
                        </HStack>
                        {noteExpanded ? <Text style={styles.coachNoteBody}>{ex.coachNotes}</Text> : null}
                      </Pressable>
                    ) : null}
                  </Card>
                );
              })}
            </Box>
          ))}
        </Box>
      </ScrollView>

      {/* Sticky start button */}
      <Box style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <Divider style={{ marginBottom: 12 }} />
        <TutorialTarget id="workout-preview-start-button">
          <Button onPress={onStart} radius="pill" className="py-4">
            <ButtonText style={{ fontFamily: FONT.bold, fontSize: 15, letterSpacing: 0.5 }}>INICIAR ENTRENAMIENTO</ButtonText>
          </Button>
        </TutorialTarget>
      </Box>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FONT.regular, fontSize: 15, color: C.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  heroSection: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.38,
  },
  heroImage: { width: '100%', height: '100%' },
  heroTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnStatic: {
    marginLeft: 16,
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: C.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  title: {
    flex: 1,
    fontFamily: FONT.extraBold,
    fontSize: 24,
    lineHeight: 29,
    color: C.textPrimary,
    marginRight: 12,
  },
  titleActions: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: C.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  description: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
    paddingHorizontal: 20,
    marginTop: 10,
    lineHeight: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: FONT.extraBold,
    fontSize: 21,
    lineHeight: 25,
    color: C.textPrimary,
  },
  statLabel: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 2,
  },
  exerciseList: { paddingHorizontal: 20, marginTop: 24 },
  blockTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.textSecondary,
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  exerciseInfo: { flex: 1, marginLeft: 14 },
  exerciseTitle: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: C.textPrimary,
  },
  seriesChip: {
    backgroundColor: C.brand50,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  seriesChipText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: C.textPrimary,
  },
  exerciseSubtitle: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
  },
  lastPerformanceIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.blue5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastPerformanceLabel: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: C.blue60,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lastPerformanceText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: C.textSecondary,
    flex: 1,
  },
  coachNoteBanner: {
    marginTop: 10,
    backgroundColor: C.warning5,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  coachNoteHeaderText: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 12,
    color: C.warning60,
  },
  coachNoteBody: {
    marginTop: 6,
    fontFamily: FONT.regular,
    fontSize: 12.5,
    color: C.textSecondary,
    lineHeight: 18,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    backgroundColor: C.bg,
  },
  });
}

function createReadinessStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 + WORKOUT_MINIBAR_CLEARANCE },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...SHADOW.card,
  },
  title: {
    fontFamily: FONT.extraBold,
    fontSize: 24,
    lineHeight: 29,
    color: C.textPrimary,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 13.5,
    color: C.textSecondary,
    marginTop: 6,
    lineHeight: 19,
    marginBottom: 24,
  },
  question: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: C.textPrimary,
  },
  questionHint: {
    fontFamily: FONT.regular,
    fontSize: 11.5,
    color: C.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  scaleChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleChipActive: {
    backgroundColor: C.accentBlack,
  },
  scaleChipText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.textSecondary,
  },
  scaleChipTextActive: {
    color: C.accentBlackForeground,
  },
  scaleHint: {
    width: '100%',
    marginTop: 6,
    fontFamily: FONT.medium,
    fontSize: 12.5,
    color: C.textSecondary,
  },
  });
}
