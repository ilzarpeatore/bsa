import React, { useEffect, useState } from 'react';
import { StyleSheet, BackHandler } from 'react-native';
import { showToast } from '@helper/toast';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import GlassButton from './GlassButton';
import { WORKOUT_MINIBAR_CLEARANCE } from './WorkoutMinimizedBar';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { useTutorial } from '@store/TutorialContext';
import { hapticLight, hapticMedium, hapticSoft, hapticSuccess, hapticError } from '@helper/haptics';
import { readinessApi, ReadinessValues } from '../api/readiness';

// Rediseño "progressive disclosure" del gate diario de readiness (pedido
// explícito 2026-08-29, con guía de integración adjunta: una sola métrica
// por pantalla en vez de las 4 tarjetas simultáneas con scroll de antes --
// Ley de Hick, menos carga cognitiva). Vive en su propio archivo -- antes
// era una función interna de workout_preview_screen.tsx, pero con
// progreso/animaciones/resumen ya no encaja como función local sin
// perjudicar la legibilidad de esa pantalla (que sigue siendo quien decide
// CUÁNDO mostrar este gate, ver readinessNeeded ahí).
//
// Reutiliza exactamente la misma llamada a la API y el mismo evento de
// tutorial que la versión anterior (readinessApi.submit + reportAction
// ('readiness_submitted')) -- el reto "primer entrenamiento" del sistema de
// tutoriales completa ese paso por acción, no por posición en pantalla (ver
// constants/tutorialChallenges.ts), así que este cambio de interfaz no
// rompe nada de ese sistema.

type MetricKey = 'sleep' | 'soreness' | 'energy' | 'stress';

interface MetricConfig {
  key: MetricKey;
  title: string;
  subtitle: string;
  icon: string;
  max: number;
  labels?: string[];
  emojis: string[];
}

// Mismos 4 datos y mismas etiquetas/hint que llevaba el formulario anterior
// (ver git blame de workout_preview_screen.tsx) -- solo cambia CÓMO se
// presentan, no qué se pregunta ni el nombre de los campos que espera
// readinessApi.submit.
const METRICS: MetricConfig[] = [
  {
    key: 'sleep',
    title: 'Descanso nocturno',
    subtitle: '¿Cómo dormiste anoche?',
    icon: 'moon-outline',
    max: 5,
    labels: ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'],
    emojis: ['😫', '😕', '😐', '🙂', '😴'],
  },
  {
    key: 'soreness',
    title: 'Nivel de agujetas',
    subtitle: '1 = ninguna · 10 = muy intensas',
    icon: 'body-outline',
    max: 10,
    emojis: ['😎', '🙂', '😗', '😐', '😬', '😖', '😣', '😫', '😵', '🤯'],
  },
  {
    key: 'energy',
    title: 'Nivel de energía',
    subtitle: '¿Cómo te sientes ahora mismo?',
    icon: 'flash-outline',
    max: 5,
    labels: ['Agotado', 'Bajo', 'Normal', 'Alto', 'Muy alto'],
    emojis: ['🪫', '😪', '😐', '💪', '🔥'],
  },
  {
    key: 'stress',
    title: 'Estrés mental',
    subtitle: '¿Cómo está tu cabeza hoy?',
    icon: 'thunderstorm-outline',
    max: 5,
    labels: ['Muy relajado', 'Relajado', 'Normal', 'Estresado', 'Muy estresado'],
    emojis: ['🧘', '😌', '🤔', '😤', '🤯'],
  },
];

const TOTAL_METRIC_STEPS = METRICS.length;
const SUMMARY_STEP = TOTAL_METRIC_STEPS;
// Respiro entre tocar una respuesta y el auto-avance -- deja ver el chip
// resaltado un instante antes de saltar de paso (ver selectValue).
const ANSWER_ADVANCE_DELAY = 350;
// Mismo casi-negro que components/GlassButton.tsx (LABEL_COLOR) -- texto
// sobre relleno teal sólido NUNCA blanco (contraste real ~2.1:1,
// insuficiente; ~9.9:1 con este tono).
const TEAL_TEXT = '#12312C';

function AnimatedEmoji({ emoji }: { emoji: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 6, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
  }, [emoji, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.Text style={[styles.emoji, style]}>{emoji}</Animated.Text>;
}

function ProgressDots({ current, total, C }: { current: number; total: number; C: ReturnType<typeof useAppColorMode>['colors'] }) {
  return (
    <Box style={styles.progressRow}>
      {Array.from({ length: total }, (_, i) => (
        <Box key={i} style={[styles.progressDot, { backgroundColor: i <= current ? C.orange : C.border }]} />
      ))}
    </Box>
  );
}

function ScaleSelector({
  max,
  value,
  onChange,
  C,
}: {
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  C: ReturnType<typeof useAppColorMode>['colors'];
}) {
  return (
    <Box style={styles.scaleRow}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const isSelected = value === n;
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`Valor ${n}${isSelected ? ', seleccionado' : ''}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              hapticMedium();
              onChange(n);
            }}
            style={[
              styles.scaleChip,
              {
                backgroundColor: isSelected ? C.orange : C.surface,
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: C.border,
                transform: [{ scale: isSelected ? 1.08 : 1 }],
              },
            ]}
          >
            <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: isSelected ? TEAL_TEXT : C.textSecondary }}>{n}</Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

interface ReadinessWizardProps {
  onDone: () => void;
}

export default function ReadinessWizard({ onDone }: ReadinessWizardProps) {
  const { colors: C } = useAppColorMode();
  const insets = useSafeAreaInsets();
  const { reportAction } = useTutorial();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<MetricKey, number | null>>({
    sleep: null,
    soreness: null,
    energy: null,
    stress: null,
  });
  const [saving, setSaving] = useState(false);

  const isSummary = step === SUMMARY_STEP;
  const currentMetric = isSummary ? null : METRICS[step];
  const currentValue = currentMetric ? values[currentMetric.key] : null;
  const allAnswered = METRICS.every((m) => values[m.key] !== null);

  // Atrás por paso en vez de salir de la pantalla -- mismo criterio que el
  // botón "Atrás" en pantalla, solo que para el botón físico de Android
  // (sección 10 de la guía de integración). En el paso 0 se deja el
  // comportamiento por defecto del sistema (return false), igual que antes
  // de este cambio.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        hapticSoft();
        setStep((s) => s - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

  // Auto-avance (pedido explícito 2026-08-31): al responder, un pequeño
  // respiro (ver ANSWER_ADVANCE_DELAY) deja ver la selección resaltada
  // antes de pasar de paso -- sin él, el cambio de pantalla sería
  // instantáneo y no daría tiempo a percibir qué se tocó. advanceTimeoutRef
  // permite cancelar el avance pendiente si el usuario cambia de respuesta
  // dentro de esa ventana (el timer se reinicia, no se acumulan dos avances).
  const advanceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  const selectValue = (n: number) => {
    if (!currentMetric) return;
    setValues((prev) => ({ ...prev, [currentMetric.key]: n }));
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      hapticSoft();
      setStep((s) => Math.min(s + 1, SUMMARY_STEP));
    }, ANSWER_ADVANCE_DELAY);
  };

  const goBack = () => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (step === 0) return;
    hapticSoft();
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async () => {
    if (!allAnswered || saving) return;
    setSaving(true);
    try {
      const payload: ReadinessValues = {
        sleep_quality: values.sleep!,
        soreness_level: values.soreness!,
        energy_level: values.energy!,
        stress_level: values.stress!,
      };
      await readinessApi.submit(payload);
      hapticSuccess();
      reportAction('readiness_submitted');
      onDone();
    } catch (e) {
      hapticError();
      showToast('Error', { description: 'No se pudo guardar tu chequeo diario. Inténtalo de nuevo.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <Box style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {!isSummary && <ProgressDots current={step} total={TOTAL_METRIC_STEPS} C={C} />}

        <Box style={styles.content}>
          {currentMetric ? (
            <Animated.View key={`step-${step}`} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.stepInner}>
              <Text style={[styles.stepLabel, { color: C.textTertiary }]}>
                Paso {step + 1} de {TOTAL_METRIC_STEPS}
              </Text>
              <AnimatedEmoji emoji={currentValue ? currentMetric.emojis[currentValue - 1] : '❔'} />
              <Box style={[styles.badge, { backgroundColor: C.orange10 }]}>
                <Icon name={currentMetric.icon as any} size={20} color={C.orange60} />
              </Box>
              <Text style={[styles.title, { color: C.textPrimary }]}>{currentMetric.title}</Text>
              <Text style={[styles.subtitle, { color: C.textSecondary }]}>{currentMetric.subtitle}</Text>
              {currentMetric.labels && currentValue ? (
                <Text style={[styles.valueLabel, { color: C.textPrimary }]}>{currentMetric.labels[currentValue - 1]}</Text>
              ) : null}
              <ScaleSelector max={currentMetric.max} value={currentValue} onChange={selectValue} C={C} />
            </Animated.View>
          ) : (
            <Animated.View key="summary" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
              <Box style={{ alignItems: 'center' }}>
                <Box style={[styles.badge, { backgroundColor: C.success10 }]}>
                  <Icon name="checkmark-circle" size={22} color={C.success60} />
                </Box>
                <Text style={[styles.title, { color: C.textPrimary }]}>Todo listo</Text>
                <Text style={[styles.subtitle, { color: C.textSecondary }]}>Revisa tus respuestas antes de empezar</Text>
              </Box>
              <Box style={{ marginTop: 16 }}>
                {METRICS.map((m, i) => {
                  const v = values[m.key];
                  return (
                    <Pressable
                      key={m.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${m.title}`}
                      onPress={() => {
                        hapticLight();
                        setStep(i);
                      }}
                      style={[styles.summaryRow, { borderBottomColor: C.border }]}
                    >
                      <Box style={styles.summaryLeft}>
                        <Icon name={m.icon as any} size={16} color={C.textSecondary} />
                        <Text style={{ fontFamily: FONT.medium, fontSize: 14, color: C.textPrimary }}>{m.title}</Text>
                      </Box>
                      <Box style={styles.summaryRight}>
                        <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: C.textPrimary }}>
                          {v ?? '--'} {v ? m.emojis[v - 1] : ''}
                        </Text>
                        <Icon name="chevron-forward" size={14} color={C.textSecondary} />
                      </Box>
                    </Pressable>
                  );
                })}
              </Box>
            </Animated.View>
          )}
        </Box>

        <Box style={[styles.navRow, { paddingBottom: Math.max(insets.bottom, 12) + 6 + WORKOUT_MINIBAR_CLEARANCE }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Paso anterior"
            onPress={goBack}
            disabled={step === 0}
            pointerEvents={step === 0 ? 'none' : 'auto'}
            style={[styles.backBtn, { opacity: step === 0 ? 0 : 1 }]}
          >
            <Icon name="chevron-back" size={18} color={C.textSecondary} />
            <Text style={{ fontFamily: FONT.medium, fontSize: 14, color: C.textSecondary, marginLeft: 2 }}>Atrás</Text>
          </Pressable>

          {/* Sin botón "Siguiente" en los pasos de pregunta -- pedido
              explícito 2026-08-31: responder ya avanza sola (ver
              selectValue/ANSWER_ADVANCE_DELAY). El resumen sí conserva su
              CTA final porque no es una respuesta, es el envío. */}
          {isSummary && (
            <Box style={{ flex: 1 }}>
              <GlassButton label="CONTINUAR AL ENTRENAMIENTO" loading={saving} disabled={!allAnswered} onPress={onSubmit} />
            </Box>
          )}
        </Box>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1 },
  stepInner: { flex: 1, alignItems: 'center' },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 32 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontFamily: FONT.semiBold, fontSize: 12.5, letterSpacing: 0.3, marginBottom: 22, textAlign: 'center' },
  emoji: { fontSize: 68, textAlign: 'center', lineHeight: 78, marginBottom: 18 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontFamily: FONT.extraBold, fontSize: 22, textAlign: 'center' },
  subtitle: { fontFamily: FONT.regular, fontSize: 13.5, textAlign: 'center', marginTop: 14, lineHeight: 19, paddingHorizontal: 12 },
  valueLabel: { fontFamily: FONT.bold, fontSize: 14, marginTop: 20 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 34 },
  scaleChip: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
});
