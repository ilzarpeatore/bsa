import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Box } from '@components/ui/box';
import { HStack } from '@components/ui/hstack';
import { Text } from '@components/ui/text';
import { Heading } from '@components/ui/heading';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { Divider } from '@components/ui/divider';
import { Button, ButtonText } from '@components/ui/button';
import { FONT, RADIUS } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import {
  exercisesApi,
  ExerciseItem,
  BodyPartItem,
  EquipmentItem,
  LevelItem,
  EXERCISE_TYPES,
} from '../api/exercises';

// Buscador de ejercicios con TODOS los filtros que ya soporta
// GET exercise-list (título, grupo muscular, equipo, nivel, tipo), con
// selección múltiple -- usado por el creador de entrenamientos
// personalizados (custom_workout_builder_screen.tsx). El buscador en vivo de
// workout_session_screen.tsx tiene el suyo propio (uno a uno, solo grupo
// muscular) y no se toca.

type FilterKey = 'equipment' | 'level' | 'type';

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (items: ExerciseItem[]) => void;
}

const PAGE_SIZE = 20;

// Catálogos (grupos musculares/equipo/nivel) cacheados en memoria durante
// la sesión: no cambian mientras se usa la app y el picker se abre muchas
// veces seguidas al montar un entrenamiento.
let catalogCache: { bodyParts: BodyPartItem[]; equipment: EquipmentItem[]; levels: LevelItem[] } | null = null;

export default function ExercisePickerModal({ visible, title = 'Añadir ejercicios', onClose, onConfirm }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);

  const [query, setQuery] = useState('');
  const [bodyPartId, setBodyPartId] = useState<number | null>(null);
  const [equipmentId, setEquipmentId] = useState<number | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [exerciseType, setExerciseType] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const [bodyParts, setBodyParts] = useState<BodyPartItem[]>(catalogCache?.bodyParts ?? []);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(catalogCache?.equipment ?? []);
  const [levels, setLevels] = useState<LevelItem[]>(catalogCache?.levels ?? []);

  const [results, setResults] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const isLastPageRef = useRef(false);
  const requestIdRef = useRef(0);

  // Selección en el orden en que se tocan (así se añaden en ese orden).
  const [selected, setSelected] = useState<ExerciseItem[]>([]);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  // Quien lo usa lo monta solo mientras está abierto (ver
  // custom_workout_builder_screen.tsx), así que cada apertura empieza con
  // búsqueda/filtros/selección limpios sin tener que resetearlos a mano.
  useEffect(() => {
    if (!catalogCache) {
      Promise.all([
        exercisesApi.getBodyParts(1).then((r) => r.data?.data ?? []).catch(() => [] as BodyPartItem[]),
        exercisesApi.getEquipment(1).then((r) => r.data?.data ?? []).catch(() => [] as EquipmentItem[]),
        exercisesApi.getLevels(1).then((r) => r.data?.data ?? []).catch(() => [] as LevelItem[]),
      ]).then(([bp, eq, lv]) => {
        if (bp.length || eq.length || lv.length) catalogCache = { bodyParts: bp, equipment: eq, levels: lv };
        setBodyParts(bp);
        setEquipment(eq);
        setLevels(lv);
      });
    }
  }, []);

  const runSearch = useCallback(
    async (page: number) => {
      const requestId = ++requestIdRef.current;
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await exercisesApi.getFilteredList({
          title: query.trim() || undefined,
          bodypart_id: bodyPartId ?? undefined,
          equipment_id: equipmentId ?? undefined,
          level_ids: levelId ?? undefined,
          exercise_type: exerciseType ?? undefined,
          page,
          per_page: PAGE_SIZE,
        });
        if (requestId !== requestIdRef.current) return; // respuesta obsoleta
        const items = res.data?.data ?? [];
        setResults((prev) => (page === 1 ? items : [...prev, ...items]));
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
    [query, bodyPartId, equipmentId, levelId, exerciseType]
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

  const activeFilterCount = [equipmentId, levelId, exerciseType].filter((v) => v != null).length;

  const filterLabel = (key: FilterKey): string => {
    if (key === 'equipment') return equipment.find((e) => e.id === equipmentId)?.title ?? 'Equipo';
    if (key === 'level') return levels.find((l) => l.id === levelId)?.title ?? 'Nivel';
    return EXERCISE_TYPES.find((t) => t.id === exerciseType)?.title ?? 'Tipo';
  };
  const filterActive = (key: FilterKey) =>
    key === 'equipment' ? equipmentId != null : key === 'level' ? levelId != null : exerciseType != null;

  const renderChip = (label: string, active: boolean, onPress: () => void, key: string | number) => (
    <Pressable
      key={key}
      className="px-4 py-2 rounded-pill"
      style={{ backgroundColor: active ? C.accentBlack : C.surfaceLight }}
      onPress={onPress}
    >
      <Text weight="semibold" style={{ fontSize: 12.5, color: active ? C.accentBlackForeground : C.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );

  const openFilterOptions: { id: number | string; title: string }[] =
    openFilter === 'equipment' ? equipment : openFilter === 'level' ? levels : openFilter === 'type' ? EXERCISE_TYPES : [];
  const openFilterValue = openFilter === 'equipment' ? equipmentId : openFilter === 'level' ? levelId : exerciseType;
  const setOpenFilterValue = (v: number | string | null) => {
    if (openFilter === 'equipment') setEquipmentId(v as number | null);
    else if (openFilter === 'level') setLevelId(v as number | null);
    else if (openFilter === 'type') setExerciseType(v as string | null);
  };

  const renderItem = ({ item }: { item: ExerciseItem }) => {
    const isSelected = selectedIds.has(item.id);
    const subtitle = [item.bodypart_name?.map((b) => b.title).join(', '), item.equipment_title].filter(Boolean).join(' · ');
    return (
      <Pressable className="flex-row items-center py-2.5" onPress={() => toggle(item)}>
        {item.exercise_image ? (
          <Image source={{ uri: item.exercise_image }} contentFit="cover" style={styles.resultImage} />
        ) : (
          <Box className="rounded-md bg-card" style={styles.resultImage} />
        )}
        <Box style={{ flex: 1, marginRight: 8 }}>
          <Text weight="semibold" className="text-foreground" style={{ fontSize: 14 }} numberOfLines={2}>
            {item.title}
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
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <Box
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 }}
        >
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
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

        {/* Grupo muscular: fila de chips siempre visible (el filtro más usado). */}
        {bodyParts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10 }}
          >
            {renderChip('Todos', bodyPartId === null, () => setBodyPartId(null), 'all')}
            {bodyParts.map((bp) =>
              renderChip(bp.title, bodyPartId === bp.id, () => setBodyPartId(bodyPartId === bp.id ? null : bp.id), bp.id)
            )}
          </ScrollView>
        )}

        {/* Equipo / Nivel / Tipo: chips desplegables -- al tocar uno se abre
            debajo su fila de opciones. */}
        <HStack style={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10, flexWrap: 'wrap' }}>
          {(['equipment', 'level', 'type'] as FilterKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setOpenFilter(openFilter === key ? null : key)}
              style={[styles.filterChip, (filterActive(key) || openFilter === key) && styles.filterChipActive]}
            >
              <Text
                weight="semibold"
                style={{ fontSize: 12.5, color: filterActive(key) ? C.accentBlackForeground : C.textPrimary }}
                numberOfLines={1}
              >
                {filterLabel(key)}
              </Text>
              <Icon
                name={openFilter === key ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={filterActive(key) ? C.accentBlackForeground : C.textSecondary}
              />
            </Pressable>
          ))}
          {activeFilterCount > 0 && (
            <Pressable
              onPress={() => {
                setEquipmentId(null);
                setLevelId(null);
                setExerciseType(null);
                setOpenFilter(null);
              }}
              style={styles.clearFiltersBtn}
            >
              <Text style={{ fontSize: 12.5, color: C.textSecondary, fontFamily: FONT.medium }}>Limpiar</Text>
            </Pressable>
          )}
        </HStack>
        {openFilter && openFilterOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
          >
            {renderChip('Cualquiera', openFilterValue == null, () => setOpenFilterValue(null), 'any')}
            {openFilterOptions.map((o) =>
              renderChip(o.title, openFilterValue === o.id, () => setOpenFilterValue(openFilterValue === o.id ? null : o.id), o.id)
            )}
          </ScrollView>
        )}

        {loading ? (
          <Box className="flex-1 items-center justify-center">
            <Spinner size="large" color={C.textPrimary} />
          </Box>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
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
            <Button radius="pill" style={styles.confirmBtn as any} onPress={() => onConfirm(selected)}>
              <ButtonText style={styles.confirmText}>
                Añadir {selected.length} ejercicio{selected.length !== 1 ? 's' : ''}
              </ButtonText>
            </Button>
          </Box>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    resultImage: { width: 44, height: 44, borderRadius: RADIUS.xs, marginRight: 12 },
    resultSubtitle: { fontSize: 12, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 2 },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      maxWidth: 160,
    },
    filterChipActive: { backgroundColor: C.accentBlack, borderColor: C.accentBlack },
    clearFiltersBtn: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center' },
    footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, backgroundColor: C.bg },
    confirmBtn: { backgroundColor: C.accentBlack, height: 50 },
    confirmText: { color: C.accentBlackForeground, fontFamily: FONT.bold, fontSize: 15 },
  });
}
