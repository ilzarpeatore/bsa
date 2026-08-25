import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {  StyleSheet, ScrollView, TextInput, Dimensions, FlatList  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import {  HStack  } from '@components/ui/hstack';
import {  VStack  } from '@components/ui/vstack';
import {  Button  } from '@components/ui/button';
import {  Badge, BadgeText  } from '@components/ui/badge';
import ScreenHeader from '@components/ScreenHeader';
import {  useResponsiveStyleSheet  } from '@helper/responsiveStyleSheet';
import { FONT, RADIUS } from './theme';
import {  useAppColorMode  } from '@helper/useAppColorMode';
import {  recipesApi, RecipeListItem  } from '../../api/recipes';
import logger from '@helper/logger';

// Rediseño (2026-08-22): de un hub de categorías (mosaicos con la foto de la
// categoría, casi siempre sin imagen subida en el backend -> huecos grises,
// ver captura del usuario) a un feed de recetas reales organizado por franja
// horaria (Desayuno/Comida/Cena/Snacks) más un carrusel "Lo que está de
// moda", según la referencia de Lifesum que pidió el usuario. Las fotos
// salen ahora de la propia receta (`recipe_image`, siempre presente) en vez
// de la imagen de categoría (a menudo vacía). Categorías y Etiquetas se
// conservan como enlaces discretos al final para no perder esos dos caminos
// de navegación (MigratedRecipeCategoryList / MigratedRecipeTagList).

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const SEARCH_CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP) / 2;
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const MEAL_CARD_WIDTH = SCREEN_WIDTH * 0.4;

const MEAL_SECTIONS: { key: string; label: string }[] = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch', label: 'Comida' },
  { key: 'dinner', label: 'Cena' },
  { key: 'snacks', label: 'Snacks' },
];

interface RecipeCardItem {
  id: number;
  title: string;
  image?: string;
  calories?: number;
  preparationTime?: number;
  mealType?: string[];
  isFavourite?: boolean;
  isPremium?: boolean;
  isAccessible?: boolean;
}

function mapRecipe(r: RecipeListItem): RecipeCardItem {
  return {
    id: r.id,
    title: r.title,
    image: r.recipe_image ?? undefined,
    calories: r.calories,
    preparationTime: r.preparation_time,
    mealType: r.meal_type,
    isFavourite: !!r.is_favourite,
    isPremium: r.is_premium,
    isAccessible: r.is_accessible,
  };
}

export default function RecipeMainScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const s = useMemo(() => createStyles(C), [C]);
  const [featuredRecipes, setFeaturedRecipes] = useState<RecipeCardItem[]>([]);
  const [mealSections, setMealSections] = useState<Record<string, RecipeCardItem[]>>({});
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecipeCardItem[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  // Scroll infinito de la búsqueda (bug real corregido, reportado: solo se
  // veían 10 resultados como máximo -- antes siempre se pedía page:1 y nunca
  // se pedían más páginas). Mismo patrón ya usado en plan_screen.tsx para el
  // buscador de "Añadir comida": refs (no state) para la página actual y si
  // ya se llegó a la última, para no disparar peticiones de más tras el
  // final ni relanzar en cada render.
  const [isSearchLoadingMore, setIsSearchLoadingMore] = useState(false);
  const searchPageRef = useRef(1);
  const searchIsLastPageRef = useRef(false);
  const styles = useStyle();

  const isSearching = searchQuery.trim().length > 0;

  const fetchFeed = useCallback(async () => {
    setIsFeedLoading(true);
    try {
      const [featuredRes, ...sectionResponses] = await Promise.all([
        recipesApi.getFilteredList({ page: 1 }),
        ...MEAL_SECTIONS.map((section) => recipesApi.getFilteredList({ meal_type: [section.key], page: 1 })),
      ]);
      setFeaturedRecipes((featuredRes.data.data ?? []).slice(0, 6).map(mapRecipe));
      const nextSections: Record<string, RecipeCardItem[]> = {};
      MEAL_SECTIONS.forEach((section, index) => {
        nextSections[section.key] = (sectionResponses[index].data.data ?? []).slice(0, 6).map(mapRecipe);
      });
      setMealSections(nextSections);
    } catch (e) {
      logger.error(e);
    } finally {
      setIsFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Búsqueda por título en el catálogo completo (soportada por el backend vía
  // el parámetro `title` de recipe-filter-list), con debounce + scroll
  // infinito. per_page:20 (antes sin especificar -- el backend cae a su
  // default de 10, de ahí el tope de 10 resultados reportado).
  const searchRecipes = useCallback(async (query: string, page: number) => {
    if (page === 1) {
      setIsSearchLoading(true);
    } else {
      setIsSearchLoadingMore(true);
    }
    try {
      const res = await recipesApi.getFilteredList({ title: query, per_page: 20, page });
      const items = (res.data.data ?? []).map(mapRecipe);
      setSearchResults((prev) => (page === 1 ? items : [...prev, ...items]));
      const totalPages = res.data?.pagination?.totalPages ?? 1;
      searchIsLastPageRef.current = page >= totalPages;
    } catch (e) {
      logger.error(e);
      if (page === 1) setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
      setIsSearchLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearchLoading(false);
      searchIsLastPageRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      searchPageRef.current = 1;
      searchIsLastPageRef.current = false;
      searchRecipes(query, 1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery, searchRecipes]);

  const handleSearchEndReached = () => {
    if (searchIsLastPageRef.current || isSearchLoading || isSearchLoadingMore) return;
    const nextPage = searchPageRef.current + 1;
    searchPageRef.current = nextPage;
    searchRecipes(searchQuery.trim(), nextPage);
  };

  // `source` identifica dónde vive el item que cambió (la misma receta puede
  // aparecer a la vez en "Lo que está de moda" y en su franja horaria) para
  // actualizar solo esa lista de forma optimista, con rollback si falla.
  const handleToggleFavourite = useCallback((item: RecipeCardItem, source: 'search' | 'featured' | string) => {
    const nextFavourite = !item.isFavourite;
    const apply = (favourite: boolean) => {
      const updater = (prev: RecipeCardItem[]) =>
        prev.map((r) => (r.id === item.id ? { ...r, isFavourite: favourite } : r));
      if (source === 'search') {
        setSearchResults(updater);
      } else if (source === 'featured') {
        setFeaturedRecipes(updater);
      } else {
        setMealSections((prev) => ({ ...prev, [source]: updater(prev[source] ?? []) }));
      }
    };

    apply(nextFavourite);
    recipesApi.setFavourite(item.id).catch((e) => {
      logger.error(e);
      apply(item.isFavourite ?? false);
    });
  }, []);

  const navigateToTagList = () => props.navigation.navigate('MigratedRecipeTagList');
  const navigateToCategoryList = () => props.navigation.navigate('MigratedRecipeCategoryList');
  const navigateToFavourites = () => props.navigation.navigate('MigratedFavouriteRecipe');
  const navigateToRecipeDetail = (item: RecipeCardItem) => {
    props.navigation.navigate('MigratedDietDetail', { recipeId: item.id, recipeImage: item.image });
  };
  const navigateToMealSection = (key: string, label: string) => {
    props.navigation.navigate('MigratedRecipeListV2', { mealType: key, title: label });
  };

  const renderRecipeCard = (item: RecipeCardItem, containerStyle: any, favouriteSource: string) => (
    <Pressable key={item.id} style={[s.recipeCard, containerStyle]} onPress={() => navigateToRecipeDetail(item)}>
      <Box style={s.recipeImageWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={s.recipeImage} contentFit="cover" />
        ) : (
          <Box style={[s.recipeImage, { backgroundColor: C.surfaceLight }]} />
        )}
        {item.isPremium && !item.isAccessible && (
          <Badge action="muted" className="bg-black/60" style={{ position: 'absolute', top: 8, left: 8 }}>
            <Icon name="lock-closed" size={11} className="text-white" />
            <BadgeText className="text-white" style={{ fontSize: 11 }}>Exclusive</BadgeText>
          </Badge>
        )}
        <Pressable
          style={s.favBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e: any) => {
            e.stopPropagation?.();
            handleToggleFavourite(item, favouriteSource);
          }}
        >
          <Icon name={item.isFavourite ? 'heart' : 'heart-outline'} size={16} color={item.isFavourite ? C.red : '#FFFFFF'} />
        </Pressable>
      </Box>
      <Text style={[s.recipeTitle, styles.fontBold]} numberOfLines={1}>
        {item.title}
      </Text>
      {(item.calories != null || item.preparationTime != null) && (
        <HStack style={s.recipeMetaRow}>
          {item.calories != null && <Text style={[s.recipeMeta, styles.fontRegular]}>{item.calories} kcal</Text>}
          {item.calories != null && item.preparationTime != null && (
            <Text style={[s.recipeMeta, styles.fontRegular]}> · </Text>
          )}
          {item.preparationTime != null && <Text style={[s.recipeMeta, styles.fontRegular]}>{item.preparationTime} min</Text>}
        </HStack>
      )}
    </Pressable>
  );

  const hasFeed =
    featuredRecipes.length > 0 || MEAL_SECTIONS.some((section) => (mealSections[section.key]?.length ?? 0) > 0);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScreenHeader
        title="Recetas"
        onBack={() => props.navigation.goBack()}
        rightAction={
          <Button variant="ghost" size="icon" onPress={navigateToFavourites}>
            <Icon name="heart-outline" size={22} className="text-foreground" />
          </Button>
        }
      />

      {/* Barra de búsqueda -- fija fuera del ScrollView/FlatList de abajo (antes
          vivía dentro del ScrollView del feed) para que siga visible mientras
          se hace scroll infinito por los resultados. */}
      <HStack space="sm" style={s.searchWrap}>
        <Icon name="search-outline" size={18} color={C.gray40} />
        <TextInput
          style={[s.searchInput, styles.fontRegular]}
          placeholder="Buscar recetas..."
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

      {isSearching ? (
        isSearchLoading ? (
          <Spinner size="small" color={C.orange} style={{ paddingVertical: 24 }} />
        ) : searchResults.length === 0 ? (
          <VStack space="sm" style={s.emptyBox}>
            <Icon name="search-outline" size={40} color={C.gray30} />
            <Text style={[s.emptyText, styles.fontMedium]}>Sin resultados para "{searchQuery.trim()}"</Text>
          </VStack>
        ) : (
          // FlatList (no el ScrollView del feed de abajo) -- scroll infinito
          // real vía onEndReached, mismo patrón ya usado en plan_screen.tsx
          // para el buscador de "Añadir comida".
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={s.gridRow}
            contentContainerStyle={s.searchListContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <Text style={[s.sectionTitle, styles.fontBold]}>Resultados ({searchResults.length})</Text>
            }
            renderItem={({ item }) => renderRecipeCard(item, { width: SEARCH_CARD_WIDTH }, 'search')}
            onEndReached={handleSearchEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isSearchLoadingMore ? <Spinner size="small" color={C.orange} style={{ paddingVertical: 16 }} /> : null
            }
          />
        )
      ) : isFeedLoading ? (
        <Spinner size="large" color={C.orange} style={{ paddingVertical: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {featuredRecipes.length > 0 && (
              <Box style={s.section}>
                <Text style={[s.sectionTitle, styles.fontBold]}>Lo que está de moda</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featuredRow}>
                  {featuredRecipes.map((item) => (
                    <Pressable key={item.id} style={s.featuredCard} onPress={() => navigateToRecipeDetail(item)}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={s.featuredImage} contentFit="cover" />
                      ) : (
                        <Box style={[s.featuredImage, { backgroundColor: C.surfaceLight }]} />
                      )}
                      <Box style={s.featuredOverlay} />
                      <Text style={[s.featuredTitle, styles.fontBold]} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Box>
            )}

            {MEAL_SECTIONS.map((section) => {
              const items = mealSections[section.key] ?? [];
              if (items.length === 0) return null;
              return (
                <Box key={section.key} style={s.section}>
                  <HStack style={s.sectionHeaderRow}>
                    <Text style={[s.sectionTitle, styles.fontBold, s.sectionHeaderTitle]}>
                      {section.label.toUpperCase()}
                    </Text>
                    <Pressable onPress={() => navigateToMealSection(section.key, section.label)}>
                      <Text style={[s.viewAll, styles.fontSemiBold]}>Ver todo</Text>
                    </Pressable>
                  </HStack>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mealRow}>
                    {items.map((item) =>
                      renderRecipeCard(item, { width: MEAL_CARD_WIDTH, marginRight: GRID_GAP }, section.key)
                    )}
                  </ScrollView>
                </Box>
              );
            })}

            {!hasFeed && (
              <VStack space="sm" style={s.emptyBox}>
                <Icon name="restaurant-outline" size={36} color={C.gray30} />
                <Text style={[s.emptyText, styles.fontMedium]}>No hay recetas todavía</Text>
              </VStack>
            )}

            <Pressable style={s.tagsLink} onPress={navigateToCategoryList}>
              <Icon name="grid-outline" size={16} color={C.textSecondary} />
              <Text style={[s.tagsLinkText, styles.fontSemiBold]}>Ver por categorías</Text>
              <Icon name="chevron-forward" size={16} color={C.gray40} />
            </Pressable>
            <Pressable style={s.tagsLink} onPress={navigateToTagList}>
              <Icon name="pricetag-outline" size={16} color={C.textSecondary} />
              <Text style={[s.tagsLinkText, styles.fontSemiBold]}>Ver por etiquetas</Text>
              <Icon name="chevron-forward" size={16} color={C.gray40} />
            </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 16, paddingBottom: 32 },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: C.surfaceLight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
    // marginHorizontal (antes solo lo daba el padding:16 del ScrollView del
    // feed) -- ahora la barra de búsqueda vive fuera de ese ScrollView (fija,
    // para no desaparecer al hacer scroll infinito por los resultados), así
    // que necesita su propio margen lateral.
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  section: { marginBottom: 24 },
  sectionHeaderRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderTitle: { marginBottom: 0 },
  sectionTitle: { fontSize: 16, color: C.textPrimary, marginBottom: 14, letterSpacing: 0.3 },
  viewAll: { fontSize: 13, color: C.orange },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  emptyText: { fontSize: 13, color: C.gray40, textAlign: 'center' },
  featuredRow: { gap: GRID_GAP },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  featuredTitle: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    fontSize: 17,
    color: '#FFFFFF',
  },
  mealRow: { paddingRight: 16 },
  tagsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginTop: 4,
  },
  tagsLinkText: { flex: 1, fontSize: 13.5, color: C.textSecondary },
  // Resultados de búsqueda: FlatList numColumns=2 en vez del HStack+wrap
  // anterior (necesario para el scroll infinito real vía onEndReached).
  searchListContent: { paddingHorizontal: 16, paddingBottom: 32 },
  gridRow: { justifyContent: 'space-between' },
  recipeCard: { marginBottom: 16 },
  recipeImageWrap: { position: 'relative' },
  recipeImage: { width: '100%', height: 130, borderRadius: RADIUS.sm },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTitle: { fontSize: 14, color: C.textPrimary, marginTop: 8 },
  recipeMetaRow: { marginTop: 4 },
  recipeMeta: { fontSize: 12, color: C.textSecondary },
  });
}

function useStyle() {
  return useResponsiveStyleSheet({
    fontBold: { fontFamily: FONT.bold },
    fontMedium: { fontFamily: FONT.medium },
    fontRegular: { fontFamily: FONT.regular },
    fontSemiBold: { fontFamily: FONT.semiBold },
  });
}
