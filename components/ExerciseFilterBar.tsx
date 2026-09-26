import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { HStack } from '@components/ui/hstack';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { FONT, RADIUS } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { exercisesApi, BodyPartItem, EquipmentItem, LevelItem, EXERCISE_TYPES } from '../api/exercises';

// Filtros del buscador "Añadir ejercicio" de la sesión en curso. Cubre todas
// las dimensiones por las que GET exercise-list sabe filtrar (grupo muscular,
// equipo, nivel, tipo de ejercicio -- ver API\ExerciseController::getList),
// que son todas las columnas categorizables de la tabla exercises (is_premium
// no aplica al cliente). Mismo aspecto y comportamiento que los filtros de
// ExercisePickerModal (creador de entrenamientos personalizados).

export interface ExerciseFilters {
  bodyPartId: number | null;
  equipmentId: number | null;
  levelId: number | null;
  exerciseType: string | null;
}

export const EMPTY_EXERCISE_FILTERS: ExerciseFilters = {
  bodyPartId: null,
  equipmentId: null,
  levelId: null,
  exerciseType: null,
};

type FilterKey = 'equipment' | 'level' | 'type';

// La API a veces devuelve null/objeto en vez de lista (catálogo vacío, error
// manejado en backend): nunca dejar que un .map() reviente la pantalla.
function asList<T extends { id: unknown }>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]).filter((it) => it != null && (it as any).id != null) : [];
}

interface Catalog {
  bodyParts: BodyPartItem[];
  equipment: EquipmentItem[];
  levels: LevelItem[];
}

// Cacheado en memoria mientras dura la app: los catálogos no cambian y el
// buscador se abre muchas veces durante una sesión.
let catalogCache: Catalog | null = null;

// Carga (una sola vez) grupos musculares, equipo y niveles. `enabled` permite
// diferir la petición hasta que el buscador se abre por primera vez.
export function useExerciseFilterCatalog(enabled: boolean): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(catalogCache ?? { bodyParts: [], equipment: [], levels: [] });

  useEffect(() => {
    if (!enabled || catalogCache) return;
    let cancelled = false;
    Promise.all([
      exercisesApi.getBodyParts(1).then((r) => asList<BodyPartItem>(r.data?.data)).catch(() => [] as BodyPartItem[]),
      exercisesApi.getEquipment(1).then((r) => asList<EquipmentItem>(r.data?.data)).catch(() => [] as EquipmentItem[]),
      exercisesApi.getLevels(1).then((r) => asList<LevelItem>(r.data?.data)).catch(() => [] as LevelItem[]),
    ]).then(([bodyParts, equipment, levels]) => {
      const next = { bodyParts, equipment, levels };
      // No cachear un fallo total (sin red): que el siguiente intento reintente.
      if (bodyParts.length || equipment.length || levels.length) catalogCache = next;
      if (!cancelled) setCatalog(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return catalog;
}

interface Props {
  filters: ExerciseFilters;
  onChange: (next: ExerciseFilters) => void;
  catalog: Catalog;
}

export default function ExerciseFilterBar({ filters, onChange, catalog }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const { bodyParts, equipment, levels } = catalog;

  const set = (patch: Partial<ExerciseFilters>) => onChange({ ...filters, ...patch });

  const activeCount = [filters.bodyPartId, filters.equipmentId, filters.levelId, filters.exerciseType].filter(
    (v) => v != null
  ).length;

  const filterLabel = (key: FilterKey): string => {
    if (key === 'equipment') return equipment.find((e) => e.id === filters.equipmentId)?.title ?? 'Equipo';
    if (key === 'level') return levels.find((l) => l.id === filters.levelId)?.title ?? 'Nivel';
    return EXERCISE_TYPES.find((t) => t.id === filters.exerciseType)?.title ?? 'Tipo';
  };
  const filterActive = (key: FilterKey) =>
    key === 'equipment'
      ? filters.equipmentId != null
      : key === 'level'
        ? filters.levelId != null
        : filters.exerciseType != null;

  const renderChip = (label: string, active: boolean, onPress: () => void, key: string | number) => (
    <Pressable
      key={key}
      className="px-4 py-2 rounded-pill"
      style={{ backgroundColor: active ? C.accentBlack : C.surfaceLight }}
      onPress={onPress}
    >
      {/* lineHeight explícito: Gilroy semibold sin él recorta el glifo en iOS. */}
      <Text
        weight="semibold"
        style={{ fontSize: 12.5, lineHeight: 16, color: active ? C.accentBlackForeground : C.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const openOptions: { id: number | string; title: string }[] =
    openFilter === 'equipment' ? equipment : openFilter === 'level' ? levels : openFilter === 'type' ? EXERCISE_TYPES : [];
  const openValue =
    openFilter === 'equipment' ? filters.equipmentId : openFilter === 'level' ? filters.levelId : filters.exerciseType;
  const setOpenValue = (v: number | string | null) => {
    if (openFilter === 'equipment') set({ equipmentId: v as number | null });
    else if (openFilter === 'level') set({ levelId: v as number | null });
    else if (openFilter === 'type') set({ exerciseType: v as string | null });
  };

  return (
    <>
      {/* Grupo muscular: fila de chips siempre visible (el filtro más usado).
          flexGrow/flexShrink 0 (ver styles.chipRow) para que la lista de
          resultados de debajo sea la que cede alto, no las filas de chips. */}
      {bodyParts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10, alignItems: 'flex-start' }}
        >
          {renderChip('Todos', filters.bodyPartId === null, () => set({ bodyPartId: null }), 'all')}
          {bodyParts.map((bp) =>
            renderChip(
              bp.title,
              filters.bodyPartId === bp.id,
              () => set({ bodyPartId: filters.bodyPartId === bp.id ? null : bp.id }),
              bp.id
            )
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
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${key === 'equipment' ? 'equipo' : key === 'level' ? 'nivel' : 'tipo'}`}
          >
            <Text
              weight="semibold"
              style={{ fontSize: 12.5, lineHeight: 16, color: filterActive(key) ? C.accentBlackForeground : C.textPrimary }}
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
        {activeCount > 0 && (
          <Pressable
            onPress={() => {
              onChange(EMPTY_EXERCISE_FILTERS);
              setOpenFilter(null);
            }}
            style={styles.clearFiltersBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpiar filtros"
          >
            <Text style={{ fontSize: 12.5, lineHeight: 16, color: C.textSecondary, fontFamily: FONT.medium }}>
              Limpiar ({activeCount})
            </Text>
          </Pressable>
        )}
      </HStack>
      {openFilter && openOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12, alignItems: 'flex-start' }}
        >
          {renderChip('Cualquiera', openValue == null, () => setOpenValue(null), 'any')}
          {openOptions.map((o) =>
            renderChip(o.title, openValue === o.id, () => setOpenValue(openValue === o.id ? null : o.id), o.id)
          )}
        </ScrollView>
      )}
    </>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    chipRow: { flexGrow: 0, flexShrink: 0 },
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
  });
}
