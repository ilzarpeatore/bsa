import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Button, ButtonText } from '@components/ui/button';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { showToast } from '@helper/toast';
import logger from '@helper/logger';
import { useAppColorMode } from '@helper/useAppColorMode';
import { onboardingV2Api } from '../../api/onboardingV2';
import { FONT, RADIUS } from './theme';

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
type DurationValue = '30' | '45' | '60' | '90' | '90_plus';
const DURATION_OPTIONS: { value: DurationValue; label: string }[] = [
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '60 minutos' },
  { value: '90', label: '90 minutos' },
  { value: '90_plus', label: 'Más de 90 minutos' },
];

// Pantalla nueva (2026-09-16, Bckbs PR #19): cambia SOLO disponibilidad de
// entrenamiento (días/semana + duración de sesión) sin repetir el
// cuestionario completo de la etapa 3 del onboarding -- ver
// onboardingV2Api.updateTrainingAvailability() en api/onboardingV2.ts.
//
// El backend no expone (todavía) ningún GET para leer la disponibilidad
// actual -- a propósito NO se preselecciona ningún valor por defecto al
// entrar: mostrar un "3 días / 60 min" que en realidad no corresponde a lo
// que el cliente tiene guardado invitaría a guardarlo sin querer como si
// fuera un cambio real. El botón "Guardar" se queda deshabilitado hasta que
// el cliente elige explícitamente ambos campos.
export default function TrainingAvailabilityScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [days, setDays] = useState<number | null>(null);
  const [duration, setDuration] = useState<DurationValue | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = days !== null && duration !== null && !saving;

  const handleSave = useCallback(async () => {
    if (days === null || duration === null) return;
    setSaving(true);
    try {
      await onboardingV2Api.updateTrainingAvailability({
        training_days_per_week: days,
        session_duration_preference: duration,
      });
      showToast('Disponibilidad actualizada', {
        description: 'Tu coach ya ve tu nueva disponibilidad de entrenamiento.',
        variant: 'success',
      });
      props.navigation?.goBack();
    } catch (e: any) {
      // 422 esperable si el cliente todavía no completó la etapa 3 del
      // onboarding (precondición real del backend) -- se muestra el mensaje
      // que devuelve el servidor en vez de uno genérico, es accionable.
      const message = e?.response?.data?.message || 'No se pudo actualizar tu disponibilidad. Inténtalo de nuevo.';
      logger.error('[training_availability] fallo al guardar', e);
      showToast('Error al guardar', { description: message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }, [days, duration, props.navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Disponibilidad de entrenamiento" onBack={() => props.navigation?.goBack()} />
      <Box style={styles.content}>
        <Text style={styles.sectionLabel}>¿Cuántos días a la semana puedes entrenar?</Text>
        <Box style={styles.daysRow}>
          {DAY_OPTIONS.map((d) => {
            const selected = d === days;
            return (
              <Pressable key={d} onPress={() => setDays(d)} style={[styles.dayPill, selected && styles.dayPillSelected]}>
                <Text style={[styles.dayPillText, selected && styles.dayPillTextSelected]}>{d}</Text>
              </Pressable>
            );
          })}
        </Box>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
          ¿Cuánto tiempo quieres que duren tus entrenamientos?
        </Text>
        <Box style={styles.durationList}>
          {DURATION_OPTIONS.map((opt) => {
            const selected = opt.value === duration;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setDuration(opt.value)}
                style={[styles.durationCard, selected && styles.durationCardSelected]}
              >
                <Text style={[styles.durationLabel, selected && styles.durationLabelSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </Box>
      </Box>
      <Box style={styles.footer}>
        <Button size="lg" radius="pill" onPress={handleSave} disabled={!canSave}>
          {saving ? <Spinner size="small" color="#FFFFFF" /> : <ButtonText>Guardar</ButtonText>}
        </Button>
      </Box>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    sectionLabel: { fontSize: 14.5, fontFamily: FONT.semiBold, color: C.textPrimary, marginBottom: 12 },
    sectionLabelSpaced: { marginTop: 28 },
    daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dayPill: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    dayPillSelected: { backgroundColor: C.orange, borderColor: C.orange },
    dayPillText: { fontSize: 15, fontFamily: FONT.bold, color: C.textPrimary },
    dayPillTextSelected: { color: '#FFFFFF' },
    durationList: { gap: 10 },
    durationCard: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: RADIUS.md,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    durationCardSelected: { backgroundColor: `${C.orange}26`, borderColor: C.orange },
    durationLabel: { fontSize: 15, fontFamily: FONT.medium, color: C.textPrimary },
    durationLabelSelected: { fontFamily: FONT.bold },
    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  });
}
