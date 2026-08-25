import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { Badge, BadgeText } from '@components/ui/badge';
import { Divider } from '@components/ui/divider';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { dietApi } from '../../api/diet';
import { recipesApi, RecipeStep, RecipeIngredient } from '../../api/recipes';
import logger from '@helper/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DietModel {
  id?: number;
  title?: string;
  dietImage?: string;
  calories?: string;
  carbs?: string;
  fat?: string;
  protein?: string;
  totalTime?: string;
  ingredients?: string;
  description?: string;
  isFavourite?: number;
  isPremium?: number;
  isAccessible?: number;
  [key: string]: any;
}

interface DietDetailScreenProps {
  navigation: any;
  route: {
    params: {
      dietModel?: DietModel;
      id?: number;
      recipeId?: number;
      recipeImage?: string;
      isCategory?: boolean;
      isFeatured?: boolean;
    };
  };
}

export default function DietDetailScreen(props: DietDetailScreenProps) {
  const { colors: C } = useAppColorMode();
  const localStyles = useMemo(() => createStyles(C), [C]);
  const getVitamins = (icon: string, title: string, subTitle: string) => (
    <VStack className="items-center flex-1">
      <Icon name={icon as any} size={26} color={C.textPrimary} />
      <Text style={localStyles.vitaminTitle}>{title}</Text>
      <Text style={localStyles.vitaminSubtitle}>{subTitle}</Text>
    </VStack>
  );
  const dietModel = props.route.params?.dietModel ?? {};
  const fallbackId = props.route.params?.id;
  const recipeId = props.route.params?.recipeId;
  const recipeImageParam = props.route.params?.recipeImage;
  const isRecipeMode = !!recipeId;
  const [select, setSelect] = useState(true);
  const [dietState, setDietState] = useState<DietModel>(dietModel);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeSteps, setRecipeSteps] = useState<RecipeStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // Swipe horizontal sincronizado con las pestañas Ingredientes/Instrucciones:
  // deslizar cambia `select` (y por tanto qué pestaña se ve activa arriba),
  // igual que tocar el pill lo hace. translateX solo da feedback visual
  // durante el gesto -- el contenido en sí no se anima entre secciones (se
  // sustituye al soltar), por eso siempre vuelve a 0 con spring.
  const swipeX = useSharedValue(0);
  const SWIPE_THRESHOLD = 60;

  const goToIngredients = () => setSelect(true);
  const goToInstructions = () => setSelect(false);

  // activeOffsetX debe ser MENOR que failOffsetY: si no, un swipe real (que
  // casi nunca es perfectamente horizontal) supera el umbral vertical de
  // fallo antes de llegar al umbral de activación horizontal y el gesto se
  // cancela casi siempre -- exactamente el bug reportado ("no es posible
  // navegar deslizando"). Con activeOffsetX pequeño y failOffsetY holgado el
  // swipe horizontal gana incluso con el desvío diagonal natural del dedo,
  // mientras que un scroll claramente vertical sigue fallando el pan y cede
  // al ScrollView.
  const contentSwipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      swipeX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD) {
        runOnJS(goToInstructions)();
      } else if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(goToIngredients)();
      }
      swipeX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const contentSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value * 0.2 }],
  }));

  useEffect(() => {
    // Fallback for when the screen is navigated with only { id } instead of the
    // full dietModel object (e.g. deep links / notifications) — fetch from the API.
    if (!dietModel?.id && fallbackId) {
      setIsLoading(true);
      dietApi
        .getDetail(fallbackId)
        .then((res) => {
          const d = res.data?.data;
          if (!d) return;
          setDietState({
            id: d.id,
            title: d.title,
            dietImage: d.diet_image,
            calories: d.calories,
            carbs: d.carbs,
            fat: d.fat,
            protein: d.protein,
            totalTime: d.total_time,
            ingredients: d.ingredients,
            description: d.description,
            isPremium: d.is_premium,
            isFavourite: 0,
          });
        })
        .catch((e) => logger.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [fallbackId, dietModel?.id]);

  useEffect(() => {
    // Recipe mode: fetch a real recipe (with structured ingredients/steps) instead
    // of a legacy Diet model.
    if (recipeId) {
      setIsLoading(true);
      recipesApi
        .getDetail(recipeId)
        .then((res) => {
          const d = res.data?.data;
          if (!d) return;
          setDietState({
            id: d.id,
            title: d.title,
            dietImage: d.recipe_image || recipeImageParam,
            calories: String(d.calories ?? ''),
            carbs: String(d.carbs ?? ''),
            fat: String(d.fats ?? ''),
            protein: String(d.protein ?? ''),
            totalTime: d.preparation_time ? `${d.preparation_time} min` : '',
            description: d.description,
            isPremium: d.is_premium ? 1 : 0,
            isAccessible: d.is_accessible === false ? 0 : 1,
            isFavourite: d.is_favourite ?? 0,
          });
          setRecipeIngredients(res.data?.recipe_ingredients ?? []);
          setRecipeSteps(
            (res.data?.recipe_steps ?? []).slice().sort((a, b) => a.sequence - b.sequence)
          );
        })
        .catch((e) => logger.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [recipeId, recipeImageParam]);

  const setDiet = async (id?: number) => {
    if (!id) return;
    setIsLoading(true);
    try {
      if (isRecipeMode) {
        await recipesApi.setFavourite(id);
      } else {
        await dietApi.setFavourite(id);
      }
      setDietState((prev) => ({
        ...prev,
        isFavourite: prev.isFavourite === 1 ? 0 : 1,
      }));
    } catch (e) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isLockedRecipe = isRecipeMode && dietState.isPremium === 1 && dietState.isAccessible === 0;

  const ingredients = () =>
    isLockedRecipe ? (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>
          Contenido exclusivo de tu coach.
        </Text>
      </Box>
    ) : isRecipeMode ? (
      <Box style={localStyles.htmlContent}>
        {recipeIngredients.length === 0 ? (
          <Text style={localStyles.htmlText}>No hay ingredientes.</Text>
        ) : (
          recipeIngredients.map((ing) => (
            <HStack key={ing.id} className="items-center" style={{ marginBottom: 10 }}>
              <Box style={localStyles.ingredientDot} />
              <Text style={[localStyles.htmlText, { flex: 1 }]}>{ing.ingredient_title}</Text>
              <Text style={localStyles.ingredientQty}>
                {ing.quantity_display || `${ing.quantity} ${ing.measurement_unit_title}`}
              </Text>
            </HStack>
          ))
        )}
      </Box>
    ) : (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>{dietState.ingredients || ''}</Text>
      </Box>
    );

  const instruction = () =>
    isLockedRecipe ? (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>
          Contenido exclusivo de tu coach.
        </Text>
      </Box>
    ) : isRecipeMode ? (
      <Box style={localStyles.htmlContent}>
        {recipeSteps.length === 0 ? (
          <Text style={localStyles.htmlText}>No hay instrucciones.</Text>
        ) : (
          recipeSteps.map((step, index) => (
            <Text key={step.id} style={[localStyles.htmlText, { marginBottom: 10 }]}>
              {index + 1}. {step.instruction}
            </Text>
          ))
        )}
      </Box>
    ) : (
      <Box style={localStyles.htmlContent}>
        <Text style={localStyles.htmlText}>{dietState.description || ''}</Text>
      </Box>
    );

  return (
    <SafeAreaView style={localStyles.container} edges={['bottom']}>
      {/* Header Image */}
      <Box style={localStyles.headerSection}>
        <Image
          source={{ uri: dietState.dietImage || '' }}
          style={localStyles.headerImage}
          contentFit="cover"
        />
        <Box style={localStyles.headerOverlay} />

        {/* Back Button */}
        <Pressable
          style={[localStyles.backBtn, { top: insets.top + 8 }]}
          onPress={() => props.navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={'#FFFFFF'} />
        </Pressable>

        {/* Premium Badge */}
        {dietState.isPremium === 1 && (
          <Badge
            action="warning"
            className="rounded px-1.5 py-0.5"
            style={{ position: 'absolute', left: 16, top: insets.top + 16 }}
          >
            <BadgeText className="text-[10px] font-gilroy-bold">PRO</BadgeText>
          </Badge>
        )}

        {/* Favourite Button */}
        <Pressable
          style={[localStyles.favBtn, { top: insets.top + 18 }]}
          onPress={() => setDiet(dietState.id)}
        >
          <Box style={localStyles.favBtnInner}>
            <Icon
              name={dietState.isFavourite === 1 ? 'heart' : 'heart-outline'}
              size={20}
              color={dietState.isFavourite === 1 ? C.red : C.white}
            />
          </Box>
        </Pressable>

        {/* Title + Time */}
        <Box style={localStyles.titleRow}>
          <Text style={localStyles.dietTitle} numberOfLines={2}>
            {dietState.title || ''}
          </Text>
          <Box style={localStyles.timeBadge}>
            <Icon name="time-outline" size={16} color={'#FFFFFF'} />
            <Text style={localStyles.timeText}>{dietState.totalTime || ''}</Text>
          </Box>
        </Box>
      </Box>

      {/* Content Sheet */}
      <Box style={localStyles.contentSheet}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Nutrients Row */}
          <HStack className="items-center justify-around px-2.5 py-2">
            {getVitamins('flame-outline', `${dietState.calories || '0'} Kcal`, 'Calorías')}
            <Divider orientation="vertical" className="mx-1" style={{ height: 65 }} />
            {getVitamins('leaf-outline', `${dietState.carbs || '0'} g`, 'Carbohidratos')}
            <Divider orientation="vertical" className="mx-1" style={{ height: 65 }} />
            {getVitamins('water-outline', `${dietState.fat || '0'} g`, 'Grasas')}
            <Divider orientation="vertical" className="mx-1" style={{ height: 65 }} />
            {getVitamins('nutrition-outline', `${dietState.protein || '0'} g`, 'Proteína')}
          </HStack>

          <Divider className="mx-4" style={{ height: 0.5 }} />

          {/* Tabs: Ingredients / Instruction */}
          <Box style={localStyles.tabsRowWrap}>
            <HStack className="rounded-full bg-white p-1">
              <Pressable
                style={[localStyles.tabPill, select && localStyles.tabPillActive]}
                onPress={() => setSelect(true)}
              >
                <Text style={[localStyles.tabPillText, select && localStyles.tabPillTextActive]}>
                  Ingredientes
                </Text>
              </Pressable>
              <Pressable
                style={[localStyles.tabPill, !select && localStyles.tabPillActive]}
                onPress={() => setSelect(false)}
              >
                <Text style={[localStyles.tabPillText, !select && localStyles.tabPillTextActive]}>
                  Instrucciones
                </Text>
              </Pressable>
            </HStack>
          </Box>

          <GestureDetector gesture={contentSwipeGesture}>
            <Animated.View style={[{ padding: 16 }, contentSwipeStyle]}>
              {select ? ingredients() : instruction()}
            </Animated.View>
          </GestureDetector>
        </ScrollView>
      </Box>

      {isLoading && (
        <Box style={localStyles.loaderContainer}>
          <Spinner size="large" color={C.textPrimary} />
        </Box>
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof useAppColorMode>['colors']) {
  return StyleSheet.create({
  // Antes 'rgba(0,0,0,0.45)': pensado para una presentación modal transparente
  // que esta pantalla nunca tuvo (se registra como push normal en App.tsx),
  // así que se veía como un velo negro translúcido sobre toda la pantalla.
  container: { flex: 1, backgroundColor: C.bg },
  headerSection: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.37,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  favBtn: {
    position: 'absolute',
    right: 16,
  },
  favBtnInner: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  titleRow: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dietTitle: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  timeText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  contentSheet: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  vitaminTitle: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  vitaminSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  tabsRowWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 26,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: C.brand50,
  },
  tabPillText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.textSecondary,
  },
  tabPillTextActive: {
    color: C.white,
  },
  htmlContent: {
    paddingHorizontal: 8,
  },
  htmlText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 22,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.orange,
    marginRight: 10,
  },
  ingredientQty: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: C.textSecondary,
    marginLeft: 8,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  });
}
