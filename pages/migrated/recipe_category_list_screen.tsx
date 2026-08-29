import React, { useState, useEffect, useCallback } from 'react';
import {  ScrollView, Dimensions  } from 'react-native';
import {  Image  } from 'expo-image';
import {  SafeAreaView  } from 'react-native-safe-area-context';
import {  Box  } from '@components/ui/box';
import {  Text  } from '@components/ui/text';
import {  Pressable  } from '@components/ui/pressable';
import {  Icon  } from '@components/ui/icon';
import {  Spinner  } from '@components/ui/spinner';
import ScreenHeader from '@components/ScreenHeader';
import {  recipesApi  } from '../../api/recipes';
import {  RADIUS  } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RecipeCategory {
  id: number;
  title: string;
  recipeCategoryImage?: string;
}

export default function RecipeCategoryListScreen(props: any) {
  const { colors: C } = useAppColorMode();
  const [mCategoryList, setMCategoryList] = useState<RecipeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getCategoryData();
  }, []);

  const getCategoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      let page = 1;
      let totalPages = 1;
      const allCategories: RecipeCategory[] = [];
      while (page <= totalPages) {
        const res = await recipesApi.getCategories(page);
        totalPages = res.data.pagination?.totalPages ?? 1;
        allCategories.push(
          ...(res.data.data ?? []).map((c) => ({
            id: c.id,
            title: c.title,
            recipeCategoryImage: c.recipe_category_image ?? undefined,
          }))
        );
        page++;
      }
      setMCategoryList(allCategories);
    } catch (e: any) {
      // toast(e.toString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const columnWidth = (SCREEN_WIDTH - 48) / 2;

  const handleCategoryPress = (item: RecipeCategory) => {
    props.navigation.navigate('MigratedRecipeListV2', {
      categoryId: item.id,
      title: item.title,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScreenHeader title="Categorías" onBack={() => props.navigation.goBack()} />

      <Box className="flex-1">
        {isLoading ? (
          <Box className="flex-1 items-center justify-center">
            <Spinner size="large" color="#A2CDD4" />
          </Box>
        ) : mCategoryList.length === 0 ? (
          <Box className="flex-1 items-center justify-center">
            <Icon name="folder-open-outline" size={64} className="text-muted-foreground" />
            <Text weight="medium" style={{ marginTop: 12 }}>No se encontraron categorías</Text>
          </Box>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Box className="flex-row flex-wrap justify-between">
              {mCategoryList.map((item) => (
                <Pressable
                  key={item.id}
                  style={{ width: columnWidth, marginBottom: 16 }}
                  onPress={() => handleCategoryPress(item)}
                >
                  {item.recipeCategoryImage ? (
                    <Image
                      source={{ uri: item.recipeCategoryImage }}
                      style={{ width: columnWidth, height: 120, borderRadius: RADIUS.sm }}
                      contentFit="cover"
                    />
                  ) : (
                    <Box
                      style={{ width: columnWidth, height: 120 }}
                      className="rounded-md bg-secondary"
                    />
                  )}
                  <Text weight="bold" style={{ marginTop: 8 }} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </Box>
          </ScrollView>
        )}
      </Box>
    </SafeAreaView>
  );
}
