import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import SimpleBottomSheet from './SimpleBottomSheet';

// Consulta de intensidad tras completar una serie -- pedido explícito del
// usuario con capturas de referencia de otra app, 2026-08-26 (RIR primero,
// RPE después con el mismo criterio: "deben ser reemplazables"). Un único
// componente parametrizado por `metric` en vez de dos casi-duplicados --
// RIR (Reps In Reserve) y RPE (Ratio de Esfuerzo Percibido) son la MISMA
// escala de intensidad de 5 tramos vista desde 2 ángulos inversos (RIR 0 =
// RPE 10, RIR 4+ = RPE ≤6), así que comparten estructura, colores y flujo;
// solo cambian etiqueta, pregunta, valores mostrados/guardados y texto de
// ayuda. Se abre automáticamente desde workout_session_screen.tsx al marcar
// una serie como completada -- ver getIntensityMode() ahí para cómo se
// decide si toca RIR o RPE para ese ejercicio concreto (columna
// intercambiable, el usuario elige tocando la cabecera "RIR"/"RPE").
// Mismo patrón que ReadinessCheckSheet.tsx (SimpleBottomSheet + reset al
// reabrir); el valor elegido no se envía a ningún endpoint propio -- se
// escribe directamente en la celda correspondiente de la fila
// (setCellValue), exactamente igual que si el cliente lo hubiera tecleado
// a mano.

export type IntensityMetric = 'rir' | 'rpe';

interface IntensityOption {
  /** Valor real que se guarda en la celda -- p.ej. "4" representa "4 o más" RIR. */
  value: string;
  /** Texto del círculo ("+"/"≤" son solo visuales). */
  display: string;
  label: string;
  color: string;
}

const TIER_LABELS = ['Ligero', 'Moderado', 'Difícil', 'Muy difícil', 'Máximo'];
const TIER_COLORS = ['#4A90D9', undefined, '#F2C94C', undefined, undefined] as const; // success/warning/destructive se resuelven con C

function getOptions(metric: IntensityMetric, C: ReturnType<typeof useAppColorMode>['colors']): IntensityOption[] {
  const colors = [TIER_COLORS[0]!, C.success, TIER_COLORS[2]!, C.warning, C.destructive];
  if (metric === 'rir') {
    const values = ['4', '3', '2', '1', '0'];
    const displays = ['4+', '3', '2', '1', '0'];
    return values.map((value, i) => ({ value, display: displays[i], label: TIER_LABELS[i], color: colors[i] }));
  }
  // RPE: escala inversa a RIR sobre la misma estructura de 5 tramos.
  const values = ['6', '7', '8', '9', '10'];
  const displays = ['≤6', '7', '8', '9', '10'];
  return values.map((value, i) => ({ value, display: displays[i], label: TIER_LABELS[i], color: colors[i] }));
}

const METRIC_COPY: Record<IntensityMetric, { title: string; question: string; explanationTitle: string; explanation: string }> = {
  rir: {
    title: 'Repeticiones en reserva',
    question: '¿Cuántas repeticiones más podrías haber hecho?',
    explanationTitle: 'Repeticiones en Reserva',
    explanation:
      'RIR (Reps In Reserve) es una manera de medir la dificultad de una serie. Indicas cuántas repeticiones podrías haber realizado con buena forma. Si hiciste 10 repeticiones, pero podrías haber hecho 12 con buena técnica, entonces tuviste 2 RIR.',
  },
  rpe: {
    title: 'Esfuerzo percibido',
    question: '¿Qué tan duro sentiste esta serie?',
    explanationTitle: 'Ratio de Esfuerzo Percibido',
    explanation:
      'RPE (Ratio de Esfuerzo Percibido) mide en una escala del 1 al 10 lo dura que sentiste una serie. 10 significa que no podrías haber hecho ni una repetición más; 6 o menos significa que te quedaba margen de sobra. Es la misma idea que el RIR, vista al revés: RPE 10 equivale a 0 RIR, RPE 9 a 1 RIR, y así sucesivamente.',
  },
};

interface IntensityCheckSheetProps {
  visible: boolean;
  metric: IntensityMetric;
  onClose: () => void;
  onRegister: (value: string) => void;
  /** "#2 Set: 10 x 40 kg" -- contexto de la serie que se está valorando. */
  setLabel: string;
  autoOpenEnabled: boolean;
  onToggleAutoOpen: (enabled: boolean) => void;
}

export default function IntensityCheckSheet({
  visible,
  metric,
  onClose,
  onRegister,
  setLabel,
  autoOpenEnabled,
  onToggleAutoOpen,
}: IntensityCheckSheetProps) {
  const { colors: C } = useAppColorMode();
  const s = createStyles(C);
  const options = getOptions(metric, C);
  const copy = METRIC_COPY[metric];
  const [selected, setSelected] = useState<IntensityOption | null>(null);
  const [showAutoOpenBanner, setShowAutoOpenBanner] = useState(true);

  // Reset al reabrir -- mismo criterio que ReadinessCheckSheet/PainReportSheet,
  // para no arrastrar la selección de la serie anterior (ni la de la otra
  // métrica, si se cambió de RIR a RPE entre una apertura y la siguiente).
  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setShowAutoOpenBanner(true);
  }, [visible, metric]);

  const headline =
    selected == null
      ? 'Selecciona una opción'
      : metric === 'rir'
        ? `${selected.display} repetición${selected.display === '1' ? '' : 'es'} más`
        : `RPE ${selected.display}`;

  const onInfoPress = () => {
    Alert.alert(copy.explanationTitle, copy.explanation);
  };

  const onSubmit = () => {
    if (!selected) return;
    onRegister(selected.value);
  };

  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={s.handle} />

      {showAutoOpenBanner && (
        <View style={s.autoOpenBanner}>
          <View style={s.autoOpenHeaderRow}>
            <Text style={s.autoOpenQuestion}>
              ¿Debe continuar abriéndose esta consulta de intensidad automáticamente después de cada serie?
            </Text>
            <Pressable
              onPress={() => setShowAutoOpenBanner(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => pressed && { opacity: 0.6 }}
            >
              <Ionicons name="close" size={18} color={C.textPrimary} />
            </Pressable>
          </View>
          <View style={s.autoOpenToggleRow}>
            <Text style={s.autoOpenToggleLabel}>{metric.toUpperCase()} (consulta automática)</Text>
            <Switch
              value={autoOpenEnabled}
              onValueChange={onToggleAutoOpen}
              trackColor={{ false: C.gray70, true: C.blue }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      )}

      <View style={s.headerRow}>
        <Text style={s.title}>{copy.title}</Text>
        <Pressable onPress={onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={C.textSecondary} />
        </Pressable>
      </View>

      <View style={s.body}>
        <Text style={s.question}>{copy.question}</Text>
        <Text style={s.setLabel}>{setLabel}</Text>

        <Text style={[s.headline, selected && { color: selected.color }]}>{headline}</Text>

        <View style={s.scaleRow}>
          {options.map((opt) => {
            const isSelected = selected?.value === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSelected(opt)}
                style={({ pressed }) => [s.scaleItem, pressed && { opacity: 0.75 }]}
              >
                <View
                  style={[
                    s.scaleCircle,
                    { backgroundColor: opt.color },
                    isSelected && s.scaleCircleSelected,
                  ]}
                >
                  <Text style={s.scaleCircleText}>{opt.display}</Text>
                </View>
                <Text style={s.scaleItemLabel} numberOfLines={1}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.footer}>
        <Pressable
          onPress={onSubmit}
          disabled={!selected}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Text style={[s.registerText, !selected && s.registerTextDisabled]}>Registrar</Text>
        </Pressable>
      </View>
    </SimpleBottomSheet>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray60, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    autoOpenBanner: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 14,
      padding: 16,
      borderRadius: 16,
      backgroundColor: C.surfaceLight,
    },
    autoOpenHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    autoOpenQuestion: { flex: 1, fontFamily: FONT.semiBold, fontSize: 14, color: C.textPrimary, lineHeight: 19 },
    autoOpenToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    autoOpenToggleLabel: { fontFamily: FONT.bold, fontSize: 14, color: C.textPrimary },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 6,
    },
    title: { fontSize: 17, fontFamily: FONT.bold, color: C.blue },
    body: { paddingHorizontal: 24, paddingTop: 8 },
    question: { fontSize: 14, fontFamily: FONT.regular, color: C.textPrimary, lineHeight: 20 },
    setLabel: { fontSize: 13, fontFamily: FONT.regular, color: C.textSecondary, marginTop: 4 },
    headline: {
      textAlign: 'center',
      fontFamily: FONT.bold,
      fontSize: 16,
      color: C.textPrimary,
      marginTop: 22,
      marginBottom: 16,
    },
    scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
    scaleItem: { alignItems: 'center', width: 60 },
    scaleCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scaleCircleSelected: { borderWidth: 2.5, borderColor: C.textPrimary },
    scaleCircleText: { fontFamily: FONT.bold, fontSize: 14, color: '#FFFFFF' },
    scaleItemLabel: { fontFamily: FONT.medium, fontSize: 10.5, color: C.textSecondary, marginTop: 6, textAlign: 'center' },
    footer: {
      alignItems: 'flex-end',
      paddingHorizontal: 24,
      paddingTop: 18,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    registerText: { fontFamily: FONT.bold, fontSize: 15, color: C.blue },
    registerTextDisabled: { opacity: 0.35 },
  });
}
