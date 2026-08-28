import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {  FlatList, ActivityIndicator, Dimensions, TextInput, StyleSheet  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Heading  } from '@components/ui/heading';
import {  HStack  } from '@components/ui/hstack';
import {  Button, ButtonText  } from '@components/ui/button';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Input, InputField  } from '@components/ui/input';
import {  Spinner  } from '@components/ui/spinner';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from '@components/ui/actionsheet';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  recipesApi  } from '../../api/recipes';
import logger from '@helper/logger';
import {  RADIUS  } from './theme';

// Rediseño (2026-08-22, referencia Lifesum aportada por el usuario): la
// cabecera con título + botón de favoritos/filtro se sustituye por una barra
// de búsqueda con flecha atrás integrada, seguida de "chips" quitables por
// cada filtro activo (franja horaria, favoritos, calorías) -- el botón de
// filtro pasa a mostrar un contador en vez de un icono cuando hay filtros
// aplicados. Cada tarjeta ahora tiene su propio corazón de favorito (antes
// solo existía un favorito "global" en la cabecera que filtraba la lista).

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RecipeItem {
  id: number;
  title: string;
  recipeImage?: string;
  calories?: number;
  isFavourite?: boolean;
  isPremium?: boolean;
  isAccessible?: boolean;
}

const MEAL_TYPE_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snacks: 'Snacks',
};

interface RecipeFilterModel {
  title?: string;
  mealTypes?: string[];
  recipeCategoryIds?: number[];
  recipeTagIds?: number[];
  startCalories?: number;
  endCalories?: number;
  startProtein?: number;
  endProtein?: number;
  startCarbs?: number;
  endCarbs?: number;
  startFats?: number;
  endFats?: number;
  minPreparationTime?: number;
  maxPreparationTime?: number;
  isFavourite?: number | null;
}

interface Props {
  categoryId?: number;
  tagId?: number;
  mealType?: string;
  title: string;
}

export default function RecipeListScreenV2(props: any) {
  const { colors: C } = useAppColorMode();
  const styles = useMemo(() => createStyles(C), [C]);
  const { categoryId, tagId, mealType, title }: Props = props.route?.params ?? {};
  const [recipeList, setRecipeList] = useState<RecipeItem[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const isLastPageRef = useRef(false);
  const [filter, setFilter] = useState<RecipeFilterModel>({ mealTypes: mealType ? [mealType] : undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [mealTypeDraft, setMealTypeDraft] = useState<string[]>(mealType ? [mealType] : []);
  const [favouriteDraft, setFavouriteDraft] = useState(false);
  const [calMinDraft, setCalMinDraft] = useState('');
  const [calMaxDraft, setCalMaxDraft] = useState('');
  const scrollRef = useRef<FlatList>(null);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await recipesApi.getFilteredList({
        title: filter.title,
        meal_type: filter.mealTypes,
        recipe_category_ids: filter.recipeCategoryIds ?? (categoryId ? [categoryId] : undefined),
        recipe_tag_ids: filter.recipeTagIds ?? (tagId ? [tagId] : undefined),
        start_calories: filter.startCalories,
        end_calories: filter.endCalories,
        start_protein: filter.startProtein,
        end_protein: filter.endProtein,
        start_carbs: filter.startCarbs,
        end_carbs: filter.endCarbs,
        start_fats: filter.startFats,
        end_fats: filter.endFats,
        min_preparation_time: filter.minPreparationTime,
        max_preparation_time: filter.maxPreparationTime,
        is_favourite: filter.isFavourite ?? undefined,
        page,
      });
      const items = (res.data.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        recipeImage: r.recipe_image ?? undefined,
        calories: r.calories,
        isFavourite: !!r.is_favourite,
        isPremium: r.is_premium,
        isAccessible: r.is_accessible,
      }));
      if (page === 1) {
        setRecipeList(items);
      } else {
        setRecipeList((prev) => [...prev, ...items]);
      }
      const totalPages = res.data.pagination?.totalPages ?? 1;
      isLastPageRef.current = page >= totalPages;
    } catch (e: any) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [page, filter, categoryId, tagId]);

  useEffect(() => {
    loadRecipes();
  }, [page, filter, loadRecipes]);

  // Búsqueda por título dentro de este listado ya filtrado, con debounce
  // (mismo patrón que MigratedRecipeMain).
  useEffect(() => {
    const handle = setTimeout(() => {
      const query = searchQuery.trim();
      setFilter((prev) => (prev.title === (query || undefined) ? prev : { ...prev, title: query || undefined }));
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const handleRecipeListEndReached = () => {
    if (!isLastPageRef.current && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  const handleToggleFavourite = useCallback((item: RecipeItem) => {
    const nextFavourite = !item.isFavourite;
    const apply = (favourite: boolean) =>
      setRecipeList((prev) => prev.map((r) => (r.id === item.id ? { ...r, isFavourite: favourite } : r)));
    apply(nextFavourite);
    recipesApi.setFavourite(item.id).catch((e) => {
      logger.error(e);
      apply(item.isFavourite ?? false);
    });
  }, []);

  const removeMealTypeFilter = (mt: string) => {
    setFilter((prev) => {
      const next = (prev.mealTypes ?? []).filter((v) => v !== mt);
      return { ...prev, mealTypes: next.length > 0 ? next : undefined };
    });
    setPage(1);
  };
  const removeFavouriteFilter = () => {
    setFilter((prev) => ({ ...prev, isFavourite: null }));
    setPage(1);
  };
  const removeCaloriesFilter = () => {
    setFilter((prev) => ({ ...prev, startCalories: undefined, endCalories: undefined }));
    setPage(1);
  };

  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...(filter.mealTypes ?? []).map((mt) => ({
      key: `meal-${mt}`,
      label: (MEAL_TYPE_LABELS[mt] ?? mt).toUpperCase(),
      onRemove: () => removeMealTypeFilter(mt),
    })),
    ...(filter.isFavourite === 1 ? [{ key: 'fav', label: 'FAVORITOS', onRemove: removeFavouriteFilter }] : []),
    ...(filter.startCalories != null || filter.endCalories != null
      ? [
          {
            key: 'cal',
            label:
              filter.startCalories != null && filter.endCalories != null
                ? `${filter.startCalories}-${filter.endCalories} KCAL`
                : filter.startCalories != null
                ? `DESDE ${filter.startCalories} KCAL`
                : `HASTA ${filter.endCalories} KCAL`,
            onRemove: removeCaloriesFilter,
          },
        ]
      : []),
  ];
  const activeFilterCount = chips.length;

  const columnWidth = (SCREEN_WIDTH - 48) / 2;

  const renderRecipeItem = useCallback(
    ({ item }: { item: RecipeItem }) => (
      <Pressable
        style={{ width: columnWidth, marginBottom: 20 }}
        onPress={() => props.navigation.navigate('MigratedDietDetail', { recipeId: item.id, recipeImage: item.recipeImage })}
      >
        <Box style={{ position: 'relative' }}>
          {item.recipeImage ? (
            <Image
              source={{ uri: item.recipeImage }}
              style={{ width: columnWidth, height: 130, borderRadius: RADIUS.sm }}
              contentFit="cover"
            />
          ) : (
            <Box className="bg-card" style={{ width: columnWidth, height: 130, borderRadius: RADIUS.sm }} />
          )}
          {item.isPremium && !item.isAccessible && (
            <HStack
              className="items-center rounded-pill"
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                gap: 4,
              }}
            >
              <Icon name="lock-closed" size={12} color="#FFFFFF" />
              <Text size="xs" weight="semibold" style={{ color: '#FFFFFF' }}>Exclusive</Text>
            </HStack>
          )}
        </Box>
        <Text weight="bold" size="sm" numberOfLines={2} style={{ marginTop: 8 }}>
          {item.title}
        </Text>
        <HStack style={{ marginTop: 6, alignItems: 'center', justifyContent: 'space-between' }}>
          {item.calories != null ? (
            <Text size="xs" muted>{item.calories} kcal</Text>
          ) : (
            <Box />
          )}
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e: any) => {
              e.stopPropagation?.();
              handleToggleFavourite(item);
            }}
          >
            <Icon
              name={item.isFavourite ? 'heart' : 'heart-outline'}
              size={18}
              color={item.isFavourite ? C.red : C.gray40}
            />
          </Pressable>
        </HStack>
      </Pressable>
    ),
    [props.navigation, columnWidth, handleToggleFavourite, C]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <HStack style={styles.topBar}>
        <Pressable onPress={() => props.navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} className="text-foreground" />
        </Pressable>
        <HStack style={styles.searchWrap} className="flex-1">
          <Icon name="search-outline" size={18} color={C.gray40} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar recetas"
            placeholderTextColor={C.gray40}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={C.gray40} />
            </Pressable>
          )}
        </HStack>
        <Pressable onPress={() => setShowFilterSheet(true)} style={styles.filterBtn}>
          {activeFilterCount > 0 ? (
            <Box style={styles.filterBadge}>
              <Text weight="bold" size="xs" style={{ color: '#FFFFFF' }}>{activeFilterCount}</Text>
            </Box>
          ) : (
            <Icon name="options-outline" size={22} className="text-foreground" />
          )}
        </Pressable>
      </HStack>

      {!mealType && title ? (
        <Text weight="bold" size="lg" style={{ paddingHorizontal: 16, marginBottom: 4 }}>{title}</Text>
      ) : null}

      {chips.length > 0 && (
        <HStack style={styles.chipsRow}>
          {chips.map((chip) => (
            <Pressable key={chip.key} onPress={chip.onRemove} style={styles.chip}>
              <Text weight="bold" size="xs" style={{ color: '#FFFFFF' }}>{chip.label}</Text>
              <Icon name="close" size={14} color="#FFFFFF" />
            </Pressable>
          ))}
        </HStack>
      )}

      <Box className="flex-1">
        {isLoading && page === 1 ? (
          <Box className="flex-1 items-center justify-center">
            <Spinner size="large" color={C.orange} />
          </Box>
        ) : !isLoading && recipeList.length === 0 ? (
          <Box className="flex-1 items-center justify-center">
            <Text weight="medium" muted>No se encontraron recetas</Text>
          </Box>
        ) : (
          <FlatList
            ref={scrollRef}
            data={recipeList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRecipeItem}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={{ padding: 16, paddingTop: 4 }}
            onEndReached={handleRecipeListEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoading && page > 1 ? (
                <ActivityIndicator size="small" color={C.orange} style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        )}
      </Box>

      <Actionsheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onOpen={() => {
          setMealTypeDraft(filter.mealTypes ?? []);
          setFavouriteDraft(filter.isFavourite === 1);
          setCalMinDraft(filter.startCalories != null ? String(filter.startCalories) : '');
          setCalMaxDraft(filter.endCalories != null ? String(filter.endCalories) : '');
        }}
      >
        <ActionsheetBackdrop />
        <ActionsheetContent className="items-stretch rounded-t-lg p-6" style={{ backgroundColor: C.bg }}>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
            <Heading size="lg" style={{ marginBottom: 16 }}>Filtros</Heading>

            <Text weight="semibold" muted size="sm" style={{ marginTop: 16, marginBottom: 10 }}>Tipo de comida</Text>
            <Box className="flex-row flex-wrap gap-2">
              {MEAL_TYPE_OPTIONS.map((mt) => {
                const selected = mealTypeDraft.includes(mt);
                return (
                  <Pressable
                    key={mt}
                    className="rounded-pill"
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: selected ? C.brand5 : C.gray60,
                      backgroundColor: selected ? C.brand5 : 'transparent',
                    }}
                    onPress={() =>
                      setMealTypeDraft((prev) =>
                        prev.includes(mt) ? prev.filter((v) => v !== mt) : [...prev, mt]
                      )
                    }
                  >
                    <Text size="sm" weight="medium" style={{ color: selected ? C.white : C.gray30 }}>
                      {MEAL_TYPE_LABELS[mt]}
                    </Text>
                  </Pressable>
                );
              })}
            </Box>

            <Text weight="semibold" muted size="sm" style={{ marginTop: 16, marginBottom: 10 }}>Favoritos</Text>
            <Pressable
              className="rounded-pill"
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: favouriteDraft ? C.brand5 : C.gray60,
                backgroundColor: favouriteDraft ? C.brand5 : 'transparent',
              }}
              onPress={() => setFavouriteDraft((prev) => !prev)}
            >
              <Text size="sm" weight="medium" style={{ color: favouriteDraft ? C.white : C.gray30 }}>
                Solo favoritos
              </Text>
            </Pressable>

            <Text weight="semibold" muted size="sm" style={{ marginTop: 16, marginBottom: 10 }}>Calorías (kcal)</Text>
            <HStack className="items-center">
              <Input className="flex-1">
                <InputField
                  placeholder="Mín"
                  keyboardType="numeric"
                  value={calMinDraft}
                  onChangeText={setCalMinDraft}
                />
              </Input>
              <Text muted style={{ marginHorizontal: 12 }}>-</Text>
              <Input className="flex-1">
                <InputField
                  placeholder="Máx"
                  keyboardType="numeric"
                  value={calMaxDraft}
                  onChangeText={setCalMaxDraft}
                />
              </Input>
            </HStack>

            <Button
              size="lg"
              style={{ marginTop: 24 }}
              onPress={() => {
                setFilter((prev) => ({
                  ...prev,
                  mealTypes: mealTypeDraft.length > 0 ? mealTypeDraft : undefined,
                  isFavourite: favouriteDraft ? 1 : null,
                  startCalories: calMinDraft ? Number(calMinDraft) : undefined,
                  endCalories: calMaxDraft ? Number(calMaxDraft) : undefined,
                }));
                setShowFilterSheet(false);
                setPage(1);
              }}
            >
              <ButtonText>Aplicar filtros</ButtonText>
            </Button>
        </ActionsheetContent>
      </Actionsheet>
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
    topBar: {
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    searchWrap: {
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.surfaceLight,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
    filterBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    filterBadge: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.orange,
    },
    chipsRow: { flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: RADIUS.lg,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: C.orange,
    },
  });
}
