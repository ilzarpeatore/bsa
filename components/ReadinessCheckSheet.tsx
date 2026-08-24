import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, FONT } from '../pages/migrated/theme';
import SimpleBottomSheet from './SimpleBottomSheet';
import { readinessApi, ReadinessValues } from '../api/readiness';

// Versión opcional/descartable del mismo formulario diario que
// workout_preview_screen.tsx muestra como gate obligatorio antes de un
// entrenamiento (daily_readiness_checks, un registro por usuario/día). Aquí
// se ofrece desde Home como acción voluntaria (no bloquea nada, se puede
// cerrar sin rellenar) — por eso vive como su propio componente en vez de
// reutilizar el ReadinessForm de workout_preview_screen.tsx, que asume
// pantalla completa y respuesta obligatoria.

interface ReadinessCheckSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: (values: ReadinessValues) => void;
}

const SLEEP_LABELS = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];
const ENERGY_LABELS = ['Agotado', 'Bajo', 'Normal', 'Alto', 'Muy alto'];
const STRESS_LABELS = ['Muy relajado', 'Relajado', 'Normal', 'Estresado', 'Muy estresado'];

function ScaleRow({
  count,
  value,
  onChange,
  labels,
}: {
  count: number;
  value: number | null;
  onChange: (v: number) => void;
  labels?: string[];
}) {
  return (
    <View style={s.scaleRow}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          style={({ pressed }) => [s.scaleChip, value === n && s.scaleChipActive, pressed && { opacity: 0.75 }]}
          onPress={() => onChange(n)}
        >
          <Text style={[s.scaleChipText, value === n && s.scaleChipTextActive]}>{n}</Text>
        </Pressable>
      ))}
      {labels && value ? <Text style={s.scaleHint}>{labels[value - 1]}</Text> : null}
    </View>
  );
}

export default function ReadinessCheckSheet({ visible, onClose, onSubmitted }: ReadinessCheckSheetProps) {
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset al reabrir -- evita arrastrar una respuesta a medias de una
  // apertura anterior (mismo criterio que PainReportSheet).
  useEffect(() => {
    if (!visible) return;
    setSleepQuality(null);
    setSorenessLevel(null);
    setEnergyLevel(null);
    setStressLevel(null);
  }, [visible]);

  const canSubmit = !!sleepQuality && !!sorenessLevel && !!energyLevel && !!stressLevel && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    const values: ReadinessValues = {
      sleep_quality: sleepQuality!,
      soreness_level: sorenessLevel!,
      energy_level: energyLevel!,
      stress_level: stressLevel!,
    };
    setSubmitting(true);
    try {
      await readinessApi.submit(values);
      onSubmitted(values);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar tu chequeo diario. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={s.handle} />
      <View style={s.headerRow}>
        <View style={s.headerTextWrap}>
          <Text style={s.title}>¿Cómo llegas hoy?</Text>
          <Text style={s.subtitle}>Ayuda a estimar tu recuperación de hoy.</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={({ pressed }) => pressed && { opacity: 0.2 }}>
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.question}>Valora tu descanso nocturno</Text>
        <ScaleRow count={5} value={sleepQuality} onChange={setSleepQuality} labels={SLEEP_LABELS} />

        <Text style={s.question}>Nivel de agujetas</Text>
        <Text style={s.questionHint}>1 = ninguna · 10 = muy intensas</Text>
        <ScaleRow count={10} value={sorenessLevel} onChange={setSorenessLevel} />

        <Text style={s.question}>Nivel de energía</Text>
        <ScaleRow count={5} value={energyLevel} onChange={setEnergyLevel} labels={ENERGY_LABELS} />

        <Text style={s.question}>Nivel de estrés mental</Text>
        <ScaleRow count={5} value={stressLevel} onChange={setStressLevel} labels={STRESS_LABELS} />
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.submitBtn, !canSubmit && s.submitBtnDisabled, pressed && { opacity: 0.85 }]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.submitBtnText}>GUARDAR</Text>}
        </Pressable>
      </View>
    </SimpleBottomSheet>
  );
}

const s = StyleSheet.create({
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray60, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTextWrap: { flex: 1, marginRight: 12 },
  title: { fontSize: 18, fontFamily: FONT.bold, color: C.textPrimary },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, color: C.textSecondary, marginTop: 2 },
  scroll: { maxHeight: 460, paddingHorizontal: 24 },
  question: { fontSize: 14, fontFamily: FONT.bold, color: C.textPrimary, marginTop: 18, marginBottom: 4 },
  questionHint: { fontSize: 11.5, fontFamily: FONT.regular, color: C.textSecondary, marginBottom: 4 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 6 },
  scaleChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleChipActive: { backgroundColor: C.accentBlack },
  scaleChipText: { fontFamily: FONT.bold, fontSize: 13, color: C.textSecondary },
  scaleChipTextActive: { color: '#FFFFFF' },
  scaleHint: { width: '100%', marginTop: 6, fontFamily: FONT.medium, fontSize: 12.5, color: C.textSecondary },
  footer: { paddingHorizontal: 24, paddingTop: 14 },
  submitBtn: {
    backgroundColor: C.accentBlack,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 14, color: '#FFFFFF', letterSpacing: 0.5 },
});
