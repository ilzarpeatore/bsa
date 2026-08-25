import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Spinner } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import { useAppColorMode } from '@helper/useAppColorMode';
import { recipesApi } from '../../api/recipes';
import logger from '@helper/logger';

interface RecipeItem {
  id: number;
  title: string;
  recipeImage: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  preparationTime?: string;
  recipeCategory?: string[];
  [key: string]: any;
}

interface FavouriteRecipeScreenProps {
  navigation: any;
}

export default function FavouriteRecipeScreen(props: FavouriteRecipeScreenProps) {
  const { colors: C } = useAppColorMode();
  const [recipeList, setRecipeList] = useState<RecipeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const isLastPageRef = useRef(false);
  const _scrollController = useRef<FlatList | null>(null);

  const _fetchRecipes = useCallback(async () => {
    if (page === 1) setIsLoading(true);
    try {
      const value = await recipesApi.getFavourite(page);
      const items: RecipeItem[] = (value.data.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        recipeImage: r.recipe_image || '',
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        recipeCategory: r.recipe_category,
      }));
      if (page === 1) setRecipeList(items);
      else setRecipeList((prev) => [...prev, ...items]);
      isLastPageRef.current = value.data.pagination?.currentPage === value.data.pagination?.totalPages;
    } catch (e) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    _fetchRecipes();
  }, [_fetchRecipes]);

  const handleEndReached = () => {
    if (!isLastPageRef.current && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  const _showRecipeDetailBottomSheet = (item: RecipeItem) => {
    props.navigation.navigate('MigratedDietDetail', {
      recipeId: item.id,
      recipeImage: item.recipeImage,
    });
  };

  const renderRecipeItem = ({ item }: { item: RecipeItem }) => {
    const subtitle = item.recipeCategory
      ?.filter((t) => t?.length > 0)
      .join(', ') || '';

    return (
      <Pressable
        className="bg-secondary rounded-md p-3"
        onPress={() => _showRecipeDetailBottomSheet(item)}
      >
        <Box className="flex-row items-center">
          <Image
            source={{ uri: item.recipeImage || '' }}
            className="rounded-md bg-card"
            style={{ width: 60, height: 60 }}
          />
          <Box className="flex-1" style={{ marginLeft: 12 }}>
            <Text weight="bold" size="sm" numberOfLines={1}>
              {item.title}
            </Text>
            {subtitle.length > 0 && (
              <Text muted size="xs" numberOfLines={1} style={{ marginTop: 4 }}>
                {subtitle}
              </Text>
            )}
          </Box>
          <Box className="items-end" style={{ marginLeft: 8 }}>
            <Text muted size="xs">{item.calories} kcal</Text>
            {item.preparationTime ? (
              <Text muted size="xs" style={{ marginTop: 4 }}>{item.preparationTime} min</Text>
            ) : null}
          </Box>
        </Box>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScreenHeader title="Recetas favoritas" onBack={() => props.navigation.goBack()} />

      <Box className="flex-1">
        <FlatList
          ref={_scrollController}
          data={recipeList}
          renderItem={renderRecipeItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          ListEmptyComponent={
            !isLoading ? (
              <Box style={{ paddingVertical: 60 }} className="flex-1 items-center justify-center">
                <Text muted size="sm">No se encontraron recetas favoritas</Text>
              </Box>
            ) : null
          }
        />
        {isLoading && (
          <Box style={StyleSheet.absoluteFill} className="items-center justify-center">
            <Spinner size="large" color={C.orange} />
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
}
