import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Platform, StyleSheet, TextInput } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { Divider } from '@components/ui/divider';
import { Button, ButtonText } from '@components/ui/button';
import { FONT, RADIUS } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { exercisesApi, ExerciseItem } from '../api/exercises';
import ExerciseFilterBar, {
  EMPTY_EXERCISE_FILTERS,
  ExerciseFilters,
  useExerciseFilterCatalog,
} from './ExerciseFilterBar';

// Buscador de ejercicios con selección múltiple -- usado por el creador de
// entrenamientos personalizados (custom_workout_builder_screen.tsx). Los
// filtros (grupo muscular, equipo, nivel, tipo) son los MISMOS que en el
// buscador de la sesión en curso (workout_session_screen.tsx): ambos usan
// components/ExerciseFilterBar.tsx.

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (items: ExerciseItem[]) => void;
}

const PAGE_SIZE = 20;

export default function ExercisePickerModal({ visible, title = 'Añadir ejercicios', onClose, onConfirm }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilters>(EMPTY_EXERCISE_FILTERS);
  const catalog = useExerciseFilterCatalog(visible);

  const [results, setResults] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const isLastPageRef = useRef(false);
  const requestIdRef = useRef(0);

  // Selección en el orden en que se tocan (así se añaden en ese orden).
  const [selected, setSelected] = useState<ExerciseItem[]>([]);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  // Doble toque en "Añadir N ejercicios" antes de que el padre desmonte el
  // modal: añadiría la misma selección dos veces.
  const confirmedRef = useRef(false);
  const confirm = () => {
    if (confirmedRef.current || selected.length === 0) return;
    confirmedRef.current = true;
    onConfirm(selected);
  };

  // Quien lo usa lo monta solo mientras está abierto (ver
  // custom_workout_builder_screen.tsx), así que cada apertura empieza con
  // búsqueda/filtros/selección limpios sin tener que resetearlos a mano.
  const runSearch = useCallback(
    async (page: number) => {
      const requestId = ++requestIdRef.current;
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await exercisesApi.getFilteredList({
          title: query.trim() || undefined,
          bodypart_id: filters.bodyPartId ?? undefined,
          equipment_id: filters.equipmentId ?? undefined,
          level_ids: filters.levelId ?? undefined,
          exercise_type: filters.exerciseType ?? undefined,
          page,
          per_page: PAGE_SIZE,
        });
        if (requestId !== requestIdRef.current) return; // respuesta obsoleta
        const raw = res.data?.data;
        const items = (Array.isArray(raw) ? raw : []).filter((it) => it && typeof it.id === 'number');
        // Si el catálogo cambia entre página y página el mismo ejercicio
        // puede venir dos veces -- claves duplicadas en la FlatList.
        setResults((prev) => {
          if (page === 1) return items;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...items.filter((it) => !seen.has(it.id))];
        });
        const totalPages = res.data?.pagination?.totalPages ?? 1;
        isLastPageRef.current = page >= totalPages;
      } catch {
        if (requestId === requestIdRef.current && page === 1) setResults([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, filters]
  );

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      pageRef.current = 1;
      isLastPageRef.current = false;
      runSearch(1);
    }, 300);
    return () => clearTimeout(t);
  }, [visible, runSearch]);

  const onEndReached = () => {
    if (isLastPageRef.current || loading || loadingMore) return;
    pageRef.current += 1;
    runSearch(pageRef.current);
  };

  const toggle = (item: ExerciseItem) => {
    setSelected((prev) => (prev.some((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : [...prev, item]));
  };

  const renderItem = ({ item }: { item: ExerciseItem }) => {
    const isSelected = selectedIds.has(item.id);
    const bodyPartNames = Array.isArray(item.bodypart_name)
      ? item.bodypart_name.map((b) => b?.title).filter(Boolean).join(', ')
      : '';
    const subtitle = [bodyPartNames, item.equipment_title].filter(Boolean).join(' · ');
    return (
      <Pressable className="flex-row items-center py-2.5" onPress={() => toggle(item)}>
        {item.exercise_image ? (
          <Image source={{ uri: item.exercise_image }} contentFit="cover" style={styles.resultImage} />
        ) : (
          <Box className="rounded-md bg-card" style={styles.resultImage} />
        )}
        <Box style={{ flex: 1, marginRight: 8 }}>
          <Text weight="semibold" className="text-foreground" style={{ fontSize: 14 }} numberOfLines={2}>
            {item.title || 'Ejercicio sin nombre'}
          </Text>
          {!!subtitle && (
            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </Box>
        <Icon
          name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
          size={24}
          color={isSelected ? C.orange : C.textPrimary}
        />
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* SafeAreaProvider propio DENTRO del Modal (2026-09-24, bug real con
          captura de iPhone: la X y el título quedaban detrás de la hora y la
          X no se podía pulsar). Un <Modal> de RN es una ventana nativa aparte
          en iOS y el SafeAreaView de dentro no recibía los insets del
          SafeAreaProvider raíz (quedaba con inset 0). Es el arreglo que
          recomienda react-native-safe-area-context para Modals. */}
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}>
        <Box
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 }}
        >
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Icon name="close" size={26} className="text-foreground" />
          </Pressable>
          <Heading size="sm">{title}</Heading>
          <Box style={{ width: 26 }} />
        </Box>

        <TextInput
          className="mx-5 bg-card rounded-md px-3.5 py-3 text-foreground"
          style={{ fontFamily: FONT.regular, fontSize: 14, marginBottom: 12, color: C.textPrimary }}
          placeholder="Buscar ejercicio..."
          placeholderTextColor={C.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />

        <ExerciseFilterBar filters={filters} onChange={setFilters} catalog={catalog} />

        {loading ? (
          <Box className="flex-1 items-center justify-center">
            <Spinner size="large" color={C.textPrimary} />
          </Box>
        ) : (
          <FlatList
            data={results}
            // flex: 1 (2026-09-24): ver styles.chipRow -- la lista es la
            // que debe ocupar (y ceder) el alto restante, no las filas de chips.
            style={{ flex: 1 }}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            ItemSeparatorComponent={Divider}
            ListEmptyComponent={
              <Text muted className="text-center" style={{ fontSize: 15, marginTop: 24 }}>
                No se encontraron ejercicios con estos filtros.
              </Text>
            }
            ListFooterComponent={
              loadingMore ? <Spinner size="small" color={C.textPrimary} style={{ marginVertical: 16 }} /> : null
            }
            renderItem={renderItem}
          />
        )}

        {selected.length > 0 && (
          <Box style={styles.footer}>
            <Button radius="pill" style={styles.confirmBtn as any} onPress={confirm}>
              <ButtonText style={styles.confirmText}>
                Añadir {selected.length} ejercicio{selected.length !== 1 ? 's' : ''}
              </ButtonText>
            </Button>
          </Box>
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    resultImage: { width: 44, height: 44, borderRadius: RADIUS.xs, marginRight: 12 },
    resultSubtitle: { fontSize: 12, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 2 },
    footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, backgroundColor: C.bg },
    confirmBtn: { backgroundColor: C.accentBlack, height: 50 },
    confirmText: { color: C.accentBlackForeground, fontFamily: FONT.bold, fontSize: 15 },
  });
}
