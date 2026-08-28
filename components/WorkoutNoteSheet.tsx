import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import SimpleBottomSheet from './SimpleBottomSheet';

interface WorkoutNoteSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseTitle?: string;
  value: string;
  onSave: (note: string) => void;
}

// Sustituye el recuadro de "Añadir nota..." que vivía siempre visible dentro
// del acordeón de cada ejercicio (pedido explícito, MigratedWorkoutSession,
// 2026-08-27): un icono de comentario abre esta hoja en vez de dejar el
// input permanentemente en pantalla. Mismo patrón que PainReportSheet
// (SimpleBottomSheet + reset del formulario al abrir) — aquí no hay envío a
// un endpoint propio, `onSave` delega en setNoteValue/syncExerciseLog, que
// ya existían en workout_session_screen.tsx antes de este cambio.
export default function WorkoutNoteSheet({ visible, onClose, exerciseTitle, value, onSave }: WorkoutNoteSheetProps) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const handleSave = () => {
    onSave(draft.trim());
    onClose();
  };

  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={s.handle} />
      <View style={s.headerRow}>
        <View style={s.headerTextWrap}>
          <Text style={s.title}>Nota para tu entrenador</Text>
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

      <TextInput
        style={s.input}
        placeholder="Escribe aquí lo que quieras que tu entrenador sepa sobre este ejercicio..."
        placeholderTextColor={C.textSecondary}
        value={draft}
        onChangeText={setDraft}
        multiline
        textAlignVertical="top"
        autoFocus
      />

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Text style={s.submitBtnText}>GUARDAR NOTA</Text>
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
  input: {
    marginHorizontal: 24,
    marginTop: 14,
    minHeight: 120,
    maxHeight: 220,
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textPrimary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  submitBtn: {
    backgroundColor: C.accentBlack,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnText: { fontFamily: FONT.bold, fontSize: 14, color: C.accentBlackForeground, letterSpacing: 0.5 },
  });
}
