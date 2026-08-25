import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import SimpleBottomSheet from './SimpleBottomSheet';
import { BODY_PART_ID_TO_NAME } from '../constants/bodyMusclesMap';

interface MuscleFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (bodyPartId: number, name: string) => void;
  selectedId?: number | null;
}

const OPTIONS = Object.entries(BODY_PART_ID_TO_NAME)
  .map(([id, name]) => ({ id: Number(id), name }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

// Reutilizado por Search, Marcas personales y Ejercicios principales — mismo
// catalogo de 18 body_parts reales de la BD (constants/bodyMusclesMap.ts),
// para no mantener 3 listas de musculos por separado.
export default function MuscleFilterSheet({ visible, onClose, onSelect, selectedId }: MuscleFilterSheetProps) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <View style={s.handle} />
      <Text style={s.title}>Filtrar por grupo muscular</Text>
      <ScrollView style={s.scroll}>
        {selectedId ? (
          <Pressable style={({ pressed }) => [s.row, pressed && { opacity: 0.2 }]} onPress={() => onSelect(0, '')}>
            <Text style={[s.rowText, s.clearText]}>Quitar filtro</Text>
            <Ionicons name="close-circle-outline" size={18} color={C.textSecondary} />
          </Pressable>
        ) : null}
        {OPTIONS.map((opt) => (
          <Pressable key={opt.id} style={({ pressed }) => [s.row, pressed && { opacity: 0.2 }]} onPress={() => onSelect(opt.id, opt.name)}>
            <Text style={s.rowText}>{opt.name}</Text>
            {selectedId === opt.id ? <Ionicons name="checkmark" size={18} color={C.orange} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </SimpleBottomSheet>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray60, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
    title: { fontSize: 17, fontFamily: FONT.bold, color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
    scroll: { maxHeight: 420, paddingHorizontal: 24 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    rowText: { fontSize: 15, fontFamily: FONT.medium, color: C.textPrimary },
    clearText: { color: C.textSecondary },
  });
}
