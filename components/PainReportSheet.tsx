import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import SimpleBottomSheet from './SimpleBottomSheet';
import {
  painReportsApi,
  blocksProgression,
  PainReportTipo,
  PainReportMomento,
} from '../api/painReports';

interface PainReportSheetProps {
  visible: boolean;
  onClose: () => void;
  // Misma fuente de verdad que ya usa workout_session_screen.tsx para
  // logSets()/finishSession(): program_day_assignment_id por defecto, o
  // workout_template_id (con isWorkoutTemplate=true) para un workout suelto.
  sessionId?: number;
  isWorkoutTemplate?: boolean;
  exerciseId: number;
  exerciseTitle?: string;
}

const TIPO_OPTIONS: { value: PainReportTipo; label: string; hint: string }[] = [
  { value: 'molestia_leve', label: 'Molestia leve', hint: 'Se puede seguir entrenando con cuidado' },
  { value: 'dolor_agudo', label: 'Dolor agudo', hint: 'Dolor puntual, claramente distinto de la fatiga normal' },
  { value: 'dolor_que_empeora_durante_sesion', label: 'Dolor que empeora durante la sesión', hint: 'Va a más según avanza el ejercicio' },
];

const MOMENTO_OPTIONS: { value: PainReportMomento; label: string }[] = [
  { value: 'al_iniciar', label: 'Al iniciar' },
  { value: 'durante_ejecucion', label: 'Durante el ejercicio' },
  { value: 'al_finalizar', label: 'Al finalizar' },
  { value: 'al_dia_siguiente', label: 'Al día siguiente' },
];

// Sin lista fija en el backend (localizacion es texto libre, max 100) — esta
// es una lista corta razonable de zonas corporales habituales en molestias
// de entrenamiento. "Otro" revela un campo de texto libre.
const LOCATION_OPTIONS = [
  'Hombro',
  'Codo',
  'Muñeca',
  'Espalda baja',
  'Espalda alta',
  'Cadera',
  'Rodilla',
  'Tobillo',
  'Cuello',
  'Otro',
];

const INTENSITY_LABELS = ['Muy leve', 'Leve', 'Moderada', 'Intensa', 'Muy intensa'];

export default function PainReportSheet({
  visible,
  onClose,
  sessionId,
  isWorkoutTemplate,
  exerciseId,
  exerciseTitle,
}: PainReportSheetProps) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  const [tipo, setTipo] = useState<PainReportTipo | null>(null);
  const [locationChip, setLocationChip] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState('');
  const [intensidad, setIntensidad] = useState<number | null>(null);
  const [momento, setMomento] = useState<PainReportMomento>('durante_ejecucion');
  const [submitting, setSubmitting] = useState(false);

  // Reset del formulario cada vez que se abre para un ejercicio nuevo - evita
  // arrastrar la selección del reporte anterior a la siguiente apertura.
  useEffect(() => {
    if (!visible) return;
    setTipo(null);
    setLocationChip(null);
    setCustomLocation('');
    setIntensidad(null);
    setMomento('durante_ejecucion');
  }, [visible, exerciseId]);

  const localizacion = locationChip === 'Otro' ? customLocation.trim() : locationChip ?? '';
  const canSubmit =
    !!tipo &&
    !!intensidad &&
    localizacion.length > 0 &&
    localizacion.length <= 100 &&
    !!sessionId &&
    !submitting;

  const onSubmit = async () => {
    if (!canSubmit || !tipo || !intensidad || !sessionId) return;
    setSubmitting(true);
    try {
      await painReportsApi.report(
        sessionId,
        {
          exercise_id: exerciseId,
          tipo,
          localizacion,
          intensidad,
          momento,
        },
        isWorkoutTemplate
      );
      const coachNotified = blocksProgression(tipo, intensidad);
      onClose();
      Alert.alert(
        'Dolor reportado',
        coachNotified
          ? 'Gracias por avisar. Hemos notificado a tu entrenador para que lo revise.'
          : 'Gracias por avisar, queda registrado en tu sesión.'
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={s.handle} />
      <View style={s.headerRow}>
        <View style={s.headerTextWrap}>
          <Text style={s.title}>Reportar dolor</Text>
          {exerciseTitle ? (
            <Text style={s.subtitle} numberOfLines={1}>
              {exerciseTitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => pressed && { opacity: 0.2 }}
        >
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.question}>¿Qué tipo de molestia es?</Text>
        <View style={s.tipoList}>
          {TIPO_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={({ pressed }) => [
                s.tipoRow,
                tipo === opt.value && s.tipoRowActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setTipo(opt.value)}
            >
              <View style={s.tipoRowText}>
                <Text style={[s.tipoLabel, tipo === opt.value && s.tipoLabelActive]}>{opt.label}</Text>
                <Text style={s.tipoHint}>{opt.hint}</Text>
              </View>
              <Ionicons
                name={tipo === opt.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={tipo === opt.value ? C.accentBlack : C.gray30}
              />
            </Pressable>
          ))}
        </View>

        <Text style={s.question}>¿Dónde?</Text>
        <View style={s.chipRow}>
          {LOCATION_OPTIONS.map((loc) => (
            <Pressable
              key={loc}
              style={({ pressed }) => [
                s.chip,
                locationChip === loc && s.chipActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setLocationChip(loc)}
            >
              <Text style={[s.chipText, locationChip === loc && s.chipTextActive]}>{loc}</Text>
            </Pressable>
          ))}
        </View>
        {locationChip === 'Otro' ? (
          <TextInput
            style={s.customInput}
            placeholder="Describe la zona..."
            placeholderTextColor={C.textSecondary}
            value={customLocation}
            onChangeText={setCustomLocation}
            maxLength={100}
          />
        ) : null}

        <Text style={s.question}>Intensidad</Text>
        <View style={s.scaleRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              style={({ pressed }) => [
                s.scaleChip,
                intensidad === n && s.scaleChipActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setIntensidad(n)}
            >
              <Text style={[s.scaleChipText, intensidad === n && s.scaleChipTextActive]}>{n}</Text>
            </Pressable>
          ))}
          {intensidad ? <Text style={s.scaleHint}>{INTENSITY_LABELS[intensidad - 1]}</Text> : null}
        </View>

        <Text style={s.question}>¿Cuándo?</Text>
        <View style={s.chipRow}>
          {MOMENTO_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={({ pressed }) => [
                s.chip,
                momento === opt.value && s.chipActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setMomento(opt.value)}
            >
              <Text style={[s.chipText, momento === opt.value && s.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [
            s.submitBtn,
            !canSubmit && s.submitBtnDisabled,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.submitBtnText}>REPORTAR</Text>
          )}
        </Pressable>
      </View>
    </SimpleBottomSheet>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
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
  question: { fontSize: 14, fontFamily: FONT.bold, color: C.textPrimary, marginTop: 18, marginBottom: 10 },
  tipoList: { gap: 8 },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 12,
  },
  tipoRowActive: { backgroundColor: C.gray10 },
  tipoRowText: { flex: 1, marginRight: 10 },
  tipoLabel: { fontSize: 14, fontFamily: FONT.semiBold, color: C.textPrimary },
  tipoLabelActive: { color: C.textPrimary },
  tipoHint: { fontSize: 11.5, fontFamily: FONT.regular, color: C.textSecondary, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.bg,
  },
  chipActive: { backgroundColor: C.accentBlack },
  chipText: { fontSize: 12.5, fontFamily: FONT.semiBold, color: C.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  customInput: {
    marginTop: 10,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textPrimary,
  },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  submitBtn: {
    backgroundColor: C.destructive,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 14, color: '#FFFFFF', letterSpacing: 0.5 },
  });
}
