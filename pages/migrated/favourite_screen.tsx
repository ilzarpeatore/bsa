import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import ScreenHeader from '@components/ScreenHeader';
import { workoutTemplateApi } from '../../api/workoutTemplate';
import { recipesApi } from '../../api/recipes';
import logger from '@helper/logger';

// Fuera del componente para no reconstruir el objeto en cada fila del FlatList.
const THUMBNAIL_STYLE = { width: 44, height: 44, borderRadius: 8 };

interface FavouriteScreenProps {
  navigation: any;
  route: {
    params: {
      index?: number;
    };
  };
}

export default function FavouriteScreen(props: FavouriteScreenProps) {
  const initialIndex = props.route.params?.index ?? 0;

  const [select, setSelect] = useState(() => initialIndex === 0);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['bottom']}>
      {/* App Bar */}
      <ScreenHeader title="Entrenamientos y recetas favoritas" onBack={() => props.navigation.goBack()} />

      {/* Tab Bar */}
      <Box className="border-b border-border px-4" style={{ marginTop: 16 }}>
        <Box className="flex-row">
          <Pressable
            style={{ paddingTop: 12, paddingBottom: 10 }}
            className={`flex-1 items-center border-b-2 ${select ? 'border-foreground' : 'border-transparent'}`}
            onPress={() => setSelect(true)}
          >
            <Text weight="bold" size="sm" className={select ? 'text-foreground' : 'text-muted-foreground'}>
              Entrenamientos
            </Text>
          </Pressable>
          <Pressable
            style={{ paddingTop: 12, paddingBottom: 10 }}
            className={`flex-1 items-center border-b-2 ${!select ? 'border-foreground' : 'border-transparent'}`}
            onPress={() => setSelect(false)}
          >
            <Text weight="bold" size="sm" className={!select ? 'text-foreground' : 'text-muted-foreground'}>
              Recetas
            </Text>
          </Pressable>
        </Box>
      </Box>

      {/* Content */}
      <Box className="flex-1">
        {select ? (
          <WorkoutsFavContent navigation={props.navigation} />
        ) : (
          <RecipesFavContent navigation={props.navigation} />
        )}
      </Box>
    </SafeAreaView>
  );
}

function WorkoutsFavContent({ navigation }: { navigation: any }) {
  // Antes leia workoutsApi.getFavourite() (Workout v1 legacy, "Rutinas" - ya
  // retirado de Home). El cliente hoy favorita WorkoutTemplate (v2) desde el
  // boton bookmark de workout_preview_screen.tsx (workoutTemplateApi.setFavourite) -
  // por eso nunca se veia nada aqui aunque el usuario si marcara favoritos.
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setIsLoading(true);
    try {
      const res = await workoutTemplateApi.getFavourite(1, 50);
      setWorkouts(res.data.data ?? []);
    } catch (e) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkoutPress = useCallback(
    (workoutTemplateId: number, mTitle: string) => {
      navigation.navigate('MigratedWorkoutPreview', { workoutTemplateId, mTitle });
    },
    [navigation]
  );

  const renderWorkoutFavItem = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        className="flex-row items-center gap-3 bg-secondary rounded-lg p-4"
        onPress={() => handleWorkoutPress(item.id, item.title)}
      >
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} contentFit="cover" style={THUMBNAIL_STYLE} />
        ) : null}
        <Text weight="semibold" size="sm" className="flex-1">
          {item.title || ''}
        </Text>
      </Pressable>
    ),
    [handleWorkoutPress]
  );

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
      </Box>
    );
  }

  if (workouts.length === 0) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Text muted size="sm">No tienes entrenamientos favoritos</Text>
      </Box>
    );
  }

  return (
    <FlatList
      data={workouts}
      keyExtractor={(item, i) => `${item.id}-${i}`}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={renderWorkoutFavItem}
    />
  );
}

function RecipesFavContent({ navigation }: { navigation: any }) {
  // Antes leia dietApi.getFavourite() (Diet legacy - catalogo de dietas
  // completas, no lo que el usuario marca favorito de verdad). Las recetas
  // reales se favoritan desde diet_detail_screen.tsx (recipesApi.setFavourite),
  // mismo endpoint que ya usa favourite_recipe_screen.tsx.
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const res = await recipesApi.getFavourite(1);
      setRecipes(res.data.data ?? []);
    } catch (e) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipePress = useCallback(
    (recipeId: number, recipeImage: string) => {
      navigation.navigate('MigratedDietDetail', { recipeId, recipeImage });
    },
    [navigation]
  );

  const renderRecipeFavItem = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        className="flex-row items-center gap-3 bg-secondary rounded-lg p-4"
        onPress={() => handleRecipePress(item.id, item.recipe_image || '')}
      >
        {item.recipe_image ? (
          <Image source={{ uri: item.recipe_image }} contentFit="cover" style={THUMBNAIL_STYLE} />
        ) : null}
        <Text weight="semibold" size="sm" className="flex-1">
          {item.title || ''}
        </Text>
      </Pressable>
    ),
    [handleRecipePress]
  );

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
      </Box>
    );
  }

  if (recipes.length === 0) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Text muted size="sm">No tienes recetas favoritas</Text>
      </Box>
    );
  }

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item, i) => `${item.id}-${i}`}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={renderRecipeFavItem}
    />
  );
}
