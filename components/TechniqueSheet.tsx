import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import SimpleBottomSheet from './SimpleBottomSheet';
import type { TechniqueInfo } from '../pages/migrated/workoutTechnique';

interface TechniqueSheetProps {
  visible: boolean;
  onClose: () => void;
  info: TechniqueInfo;
  exerciseTitle?: string;
}

/**
 * Ficha de una técnica especial (rest-pause, drop sets...): qué es, en qué
 * series se aplica, paso a paso, errores comunes y cómo apuntarla. Se abre al
 * pulsar cualquier TechniqueChip. Contenido: catálogo del backend
 * (Bckbs App\Support\TrainingTechniques). Mismo patrón que WorkoutNoteSheet.
 */
export default function TechniqueSheet({ visible, onClose, info, exerciseTitle }: TechniqueSheetProps) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);

  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={s.handle} />
      <View style={s.headerRow}>
        <View style={s.iconWrap}>
          <Ionicons name="flash" size={18} color={C.orange60} />
        </View>
        <View style={s.headerTextWrap}>
          <Text style={s.kicker}>TÉCNICA ESPECIAL</Text>
          <Text style={s.title}>{info.label}</Text>
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
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.62 }} contentContainerStyle={s.body}>
        <View style={s.scopePill}>
          <Ionicons name={info.lastSetOnly ? 'flag-outline' : 'layers-outline'} size={14} color={C.orange60} />
          <Text style={s.scopeText}>{info.lastSetOnly ? 'Solo en la última serie' : 'En todas las series'}</Text>
        </View>

        {info.description ? <Text style={s.paragraph}>{info.description}</Text> : null}

        {info.steps.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Paso a paso</Text>
            {info.steps.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNumber}>
                  <Text style={s.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </>
        ) : null}

        {info.mistakes.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Evita</Text>
            {info.mistakes.map((m, i) => (
              <View key={i} style={s.bulletRow}>
                <Ionicons name="alert-circle-outline" size={16} color={C.warning60} style={{ marginTop: 1 }} />
                <Text style={s.bulletText}>{m}</Text>
              </View>
            ))}
          </>
        ) : null}

        {info.logging ? (
          <>
            <Text style={s.sectionTitle}>Cómo apuntarlo</Text>
            <View style={s.bulletRow}>
              <Ionicons name="create-outline" size={16} color={C.textSecondary} style={{ marginTop: 1 }} />
              <Text style={s.bulletText}>{info.logging}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={s.footer}>
        <Pressable style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]} onPress={onClose} accessibilityRole="button">
          <Text style={s.submitBtnText}>ENTENDIDO</Text>
        </Pressable>
      </View>
    </SimpleBottomSheet>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray60, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6 },
    iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.orange10, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
    headerTextWrap: { flex: 1, marginRight: 12 },
    kicker: { fontSize: 11, fontFamily: FONT.bold, color: C.orange60, letterSpacing: 0.6 },
    title: { fontSize: 18, fontFamily: FONT.bold, color: C.textPrimary, marginTop: 1 },
    subtitle: { fontSize: 13, fontFamily: FONT.regular, color: C.textSecondary, marginTop: 2 },
    body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
    scopePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: C.orange10,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 12,
    },
    scopeText: { fontFamily: FONT.semiBold, fontSize: 12.5, color: C.orange60, marginLeft: 6 },
    paragraph: { fontFamily: FONT.regular, fontSize: 14, lineHeight: 20, color: C.textPrimary },
    sectionTitle: { fontFamily: FONT.bold, fontSize: 14, color: C.textPrimary, marginTop: 18, marginBottom: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    stepNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 0 },
    stepNumberText: { fontFamily: FONT.bold, fontSize: 12, color: '#FFFFFF' },
    stepText: { flex: 1, fontFamily: FONT.regular, fontSize: 14, lineHeight: 20, color: C.textPrimary },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    bulletText: { flex: 1, fontFamily: FONT.regular, fontSize: 13.5, lineHeight: 19, color: C.textSecondary, marginLeft: 8 },
    footer: { paddingHorizontal: 24, paddingTop: 12 },
    submitBtn: { backgroundColor: C.accentBlack, borderRadius: 30, paddingVertical: 15, alignItems: 'center' },
    submitBtnText: { fontFamily: FONT.bold, fontSize: 14, color: C.accentBlackForeground, letterSpacing: 0.5 },
  });
}
