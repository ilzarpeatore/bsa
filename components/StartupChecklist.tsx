import React, { useMemo, useState } from 'react';
import { Modal, Pressable as RNPressable, StyleSheet } from 'react-native';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Card } from '@components/ui/card';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import AnimatedRing from '@components/AnimatedRing';
import { useAppColorMode } from '@helper/useAppColorMode';
import { FONT } from '../pages/migrated/theme';

export interface StartupChecklistStep {
  id: string;
  label: string;
  done: boolean;
  onPress?: () => void;
}

interface StartupChecklistProps {
  title?: string;
  steps: StartupChecklistStep[];
}

// Solo la mecánica (ring de progreso + fila resumen + hoja con el listado).
// El contenido real de los pasos y qué señal marca cada uno como "done" se
// define más adelante — steps llega desde fuera como placeholder por ahora.
export default function StartupChecklist({ title = 'Reto para empezar', steps }: StartupChecklistProps) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [expanded, setExpanded] = useState(false);

  const doneCount = useMemo(() => steps.filter((s) => s.done).length, [steps]);
  const percent = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
  const activeStep = useMemo(() => steps.find((s) => !s.done) ?? null, [steps]);
  const subtitle = activeStep ? activeStep.label : '¡Completado!';

  return (
    <>
      <Pressable onPress={() => setExpanded(true)}>
        <Card variant="elevated" className="flex-row items-center p-3">
          <AnimatedRing size={44} strokeWidth={5} percent={percent} color={C.success} trackColor={C.gray10}>
            <Text style={styles.ringPercentText}>{percent}%</Text>
          </AnimatedRing>
          <VStack style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </VStack>
          <Icon name="chevron-forward" size={20} color={C.textSecondary} />
        </Card>
      </Pressable>

      <Modal visible={expanded} transparent animationType="slide" onRequestClose={() => setExpanded(false)}>
        <Box style={styles.overlay}>
          <RNPressable style={StyleSheet.absoluteFill} onPress={() => setExpanded(false)} />
          <Box style={styles.sheet}>
            <Box style={styles.handle} />

            <HStack style={styles.sheetHeader}>
              <AnimatedRing size={56} strokeWidth={6} percent={percent} color={C.success} trackColor={C.gray10}>
                <Text style={styles.ringPercentTextLg}>{percent}%</Text>
              </AnimatedRing>
              <VStack style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>{subtitle}</Text>
              </VStack>
              <Pressable onPress={() => setExpanded(false)} style={styles.closeBtn}>
                <Icon name="chevron-down" size={20} color={C.textSecondary} />
              </Pressable>
            </HStack>

            <Box style={styles.divider} />

            {steps.map((step) => {
              const isActive = !step.done && step.id === activeStep?.id;
              return (
                <Pressable
                  key={step.id}
                  onPress={() => {
                    // Cierra esta hoja ANTES de lanzar el reto: dos <Modal>
                    // de React Native presentados a la vez (esta hoja +
                    // TutorialOverlay) hace que iOS descarte en silencio la
                    // segunda presentación -- el tutorial "no arrancaba" al
                    // tocar un paso porque su Modal nunca llegaba a mostrarse.
                    setExpanded(false);
                    step.onPress?.();
                  }}
                  disabled={!step.onPress}
                  style={[styles.stepRow, isActive && styles.stepRowActive]}
                >
                  <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]} numberOfLines={1}>
                    {step.label}
                  </Text>
                  {step.done ? (
                    <Box style={styles.checkCircle}>
                      <Icon name="checkmark" size={14} color="#FFFFFF" />
                    </Box>
                  ) : (
                    <Box style={styles.outlineCircle}>
                      <Icon name="chevron-forward" size={14} color={C.textSecondary} />
                    </Box>
                  )}
                </Pressable>
              );
            })}
          </Box>
        </Box>
      </Modal>
    </>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  ringPercentText: { fontSize: 11, fontFamily: FONT.bold, color: C.textPrimary },
  ringPercentTextLg: { fontSize: 14, fontFamily: FONT.bold, color: C.textPrimary },
  title: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  sheetHeader: { alignItems: 'center', paddingVertical: 8 },
  sheetTitle: { fontSize: 18, fontFamily: FONT.bold, color: C.textPrimary },
  sheetSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  stepRowActive: { backgroundColor: C.success5, borderLeftWidth: 3, borderLeftColor: C.success },
  stepLabel: { flex: 1, fontSize: 15, fontFamily: FONT.medium, color: C.textPrimary, marginRight: 12 },
  stepLabelDone: { color: C.textSecondary },
  checkCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  outlineCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  });
}
