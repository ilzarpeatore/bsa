import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { View, Linking } from 'react-native';
import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
// Herramienta temporal de desarrollo (ver components/ScreenReviewFab.tsx) —
// borrar este import + el ref + el mount del FAB mas abajo cuando ya no haga falta.
import ScreenReviewFab from '@components/ScreenReviewFab';
import ScreenExplorerFab from '@components/ScreenExplorerFab';
import WorkoutMinimizedBar from '@components/WorkoutMinimizedBar';
import TutorialOverlay from '@components/tutorial/TutorialOverlay';
import ToastHost from '@components/ToastHost';
import { DEV_TOOLS_ENABLED } from '@constants/featureFlags';
import { TutorialProvider } from '@store/TutorialContext';
import { hydratePersistedWorkoutSession, getActiveWorkoutSession } from '@helper/workoutSessionBus';
import { showToast } from '@helper/toast';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@store/AuthContext';
import '@helper/reminderNotifications';
import NavigationTab from '@components/NavigationTab';
import { NavigationTabOptionsInterface, IoniconName } from '@components/_types/NavigationTab.i';
import { TabBarScrollProvider } from '@store/TabBarScrollContext';
import { AppColorModeProvider, useAppColorMode } from '@helper/useAppColorMode';
import { AppReloadProvider, useAppReload } from '@store/AppReloadContext';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
const screenReviewNavigationRef = createNavigationContainerRef(); // registra el handler de notificaciones locales al arrancar, sin depender de visitar las pantallas de recordatorios


const WelcomeAuthScreen = React.lazy(() => import('@pages/auth/WelcomeAuthScreen'));
const LoginScreen = React.lazy(() => import('@pages/auth/LoginScreen'));
const ForgotPasswordOptionsScreen = React.lazy(
  () => import('@pages/auth/ForgotPasswordOptionsScreen'),
);
const ForgotPasswordEmailScreen = React.lazy(() => import('@pages/auth/ForgotPasswordEmailScreen'));
const PasswordResetSentScreen = React.lazy(() => import('@pages/auth/PasswordResetSentScreen'));

const DietDashboard = React.lazy(() => import('@pages/DietDashboard'));
const DietList = React.lazy(() => import('@pages/DietList'));
const ScreenExplorer = React.lazy(() => import('@pages/ScreenExplorer'));

const AboutAppScreen = React.lazy(() => import('@pages/migrated/about_app_screen'));
const AboutUsScreen = React.lazy(() => import('@pages/migrated/about_us_screen'));
const ActivityTrackerScreen = React.lazy(() => import('@pages/migrated/activity_tracker_screen'));
const AddPostScreen = React.lazy(() => import('@pages/migrated/add_post_screen'));
const AddShoppingListScreen = React.lazy(() => import('@pages/migrated/add_shopping_list_screen'));
const AppFeedbackScreen = React.lazy(() => import('@pages/migrated/app_feedback_screen'));
const AppearanceScreen = React.lazy(() => import('@pages/migrated/appearance_screen'));
const BlogDetailScreen = React.lazy(() => import('@pages/migrated/blog_detail_screen'));
const BlogScreen = React.lazy(() => import('@pages/migrated/blog_screen'));
const BodyMetricsScreen = React.lazy(() => import('@pages/migrated/body_metrics_screen'));
const BookmarkScreen = React.lazy(() => import('@pages/migrated/bookmark_screen'));
const ChangePwdScreen = React.lazy(() => import('@pages/migrated/change_pwd_screen'));
const ChattingScreen = React.lazy(() => import('@pages/migrated/chatting_screen'));
const CheckInsListScreen = React.lazy(() => import('@pages/migrated/checkins_list_screen'));
const CheckInFillScreen = React.lazy(() => import('@pages/migrated/checkin_fill_screen'));
const CommunityScreen = React.lazy(() => import('@pages/migrated/community_screen'));

const DietDetailScreen = React.lazy(() => import('@pages/migrated/diet_detail_screen'));
const AssignedMealsScreen = React.lazy(() => import('@pages/migrated/assigned_meals_screen'));
const EditProfileScreen = React.lazy(() => import('@pages/migrated/edit_profile_screen'));
const ExerciseInfoScreen = React.lazy(() => import('@pages/migrated/exercise_info_screen'));
const FavouriteRecipeScreen = React.lazy(() => import('@pages/migrated/favourite_recipe_screen'));
const FavouriteScreen = React.lazy(() => import('@pages/migrated/favourite_screen'));

const HomeScreenModernV2 = React.lazy(() => import('@pages/migrated/home_screen_modern_v2'));
const HabitsListScreen = React.lazy(() => import('@pages/migrated/habits_list_screen'));
const HabitDetailScreen = React.lazy(() => import('@pages/migrated/habit_detail_screen'));
const HabitAddScreen = React.lazy(() => import('@pages/migrated/habit_add_screen'));
const MuscleProgressScreen = React.lazy(() => import('@pages/migrated/muscle_progress_screen'));
const MyProgramCalendarScreen = React.lazy(
  () => import('@pages/migrated/my_program_calendar_screen'),
);
const NotificationScreen = React.lazy(() => import('@pages/migrated/notification_screen'));
const NotificationSettingsScreen = React.lazy(
  () => import('@pages/migrated/notification_settings_screen'),
);
const OnboardingDataScreen = React.lazy(() => import('@pages/migrated/onboarding_data_screen'));
const OnboardingV2Screen = React.lazy(
  () => import('@pages/migrated/onboarding_v2/onboarding_v2_screen'),
);
const OtherUserProfileScreen = React.lazy(
  () => import('@pages/migrated/other_user_profile_screen'),
);
const PlanScreen = React.lazy(() => import('@pages/migrated/plan_screen'));
const PostDetailsScreen = React.lazy(() => import('@pages/migrated/post_details_screen'));
const PrivacyPolicyScreen = React.lazy(() => import('@pages/migrated/privacy_policy_screen'));
const ProfileScreenMigrated = React.lazy(() => import('@pages/migrated/profile_screen'));
const ProgressScreen = React.lazy(() => import('@pages/migrated/progress_screen'));
const StatisticsScreen = React.lazy(() => import('@pages/migrated/statistics_screen'));
const StatisticsMuscleDistributionScreen = React.lazy(
  () => import('@pages/migrated/statistics_muscle_distribution_screen'),
);
const StatisticsBodyDistributionScreen = React.lazy(
  () => import('@pages/migrated/statistics_body_distribution_screen'),
);
const StatisticsSeriesCountScreen = React.lazy(
  () => import('@pages/migrated/statistics_series_count_screen'),
);
const StatisticsTopExercisesScreen = React.lazy(
  () => import('@pages/migrated/statistics_top_exercises_screen'),
);
const StatisticsPersonalRecordsScreen = React.lazy(
  () => import('@pages/migrated/statistics_personal_records_screen'),
);
const StatisticsMonthlyReportScreen = React.lazy(
  () => import('@pages/migrated/statistics_monthly_report_screen'),
);
const ComingSoonScreen = React.lazy(() => import('@pages/migrated/coming_soon_screen'));
const RecipeCategoryListScreen = React.lazy(
  () => import('@pages/migrated/recipe_category_list_screen'),
);
const RecipeListScreenV2 = React.lazy(() => import('@pages/migrated/recipe_list_screen_v2'));
const RecipeMainScreen = React.lazy(() => import('@pages/migrated/recipe_main_screen'));
const WorkoutTemplateListScreen = React.lazy(
  () => import('@pages/migrated/workout_template_list_screen'),
);
const RecipeTagListScreen = React.lazy(() => import('@pages/migrated/recipe_tag_list_screen'));
const ResourceDetailScreen = React.lazy(() => import('@pages/migrated/resource_detail_screen'));
const ResourcesListScreen = React.lazy(() => import('@pages/migrated/resources_list_screen'));
const SearchScreen = React.lazy(() => import('@pages/migrated/search_screen'));
const SessionHistoryDetailScreen = React.lazy(
  () => import('@pages/migrated/session_history_detail_screen'),
);
const ShoppingListDetailScreen = React.lazy(
  () => import('@pages/migrated/shopping_list_detail_screen'),
);
const ShoppingListScreen = React.lazy(() => import('@pages/migrated/shopping_list_screen'));
const TrainingAvailabilityScreen = React.lazy(() => import('@pages/migrated/training_availability_screen'));

const ViewAllBlogScreen = React.lazy(() => import('@pages/migrated/view_all_blog_screen'));
const ViewBodyPartScreen = React.lazy(() => import('@pages/migrated/view_body_part_screen'));
const ViewEquipmentScreen = React.lazy(() => import('@pages/migrated/view_equipment_screen'));
const WaterTrackerScreen = React.lazy(() => import('@pages/migrated/water_tracker_screen'));
const WebViewScreen = React.lazy(() => import('@pages/migrated/web_view_screen'));
const WorkoutHistoryScreen = React.lazy(() => import('@pages/migrated/workout_history_screen'));
const WorkoutPreviewScreen = React.lazy(() => import('@pages/migrated/workout_preview_screen'));
const CustomWorkoutBuilderScreen = React.lazy(() => import('@pages/migrated/custom_workout_builder_screen'));
const WorkoutSessionScreenMig = React.lazy(() => import('@pages/migrated/workout_session_screen'));
const WorkoutFeedbackScreen = React.lazy(() => import('@pages/migrated/workout_feedback_screen'));
const WorkoutSummaryScreenMig = React.lazy(() => import('@pages/migrated/workout_summary_screen'));
const YoutubePlayerScreen = React.lazy(() => import('@pages/migrated/youtube_player_screen'));

const AssessmentResultScreen = React.lazy(
  () => import('@pages/migrated/onboarding/assessment_result_screen'),
);

enableScreens();
const Stack = createNativeStackNavigator();
const LazyFallback = () => <View style={{ flex: 1, backgroundColor: '#EBEBF0' }} />;

const Tab = createBottomTabNavigator();

// Cada pestaña comparte el mismo stack completo (MigratedNavigator, ~100
// pantallas) -- solo cambia su pantalla raíz. `descriptors[route].options`
// del Tab.Navigator EXTERIOR solo se re-evalúa cuando cambia el estado de
// ESE nivel (qué pestaña está activa), nunca cuando el usuario navega más
// adentro dentro del stack interno de una pestaña -- por eso la barra se
// quedaba visible siempre, tapando botones de pantallas de detalle como
// WorkoutPreview ("el menú coincide con botones que no se pueden pulsar").
// Fix estándar de React Navigation: `options` como función que lee el
// nombre de pantalla actualmente enfocado DENTRO del stack anidado
// (getFocusedRouteNameFromRoute) y solo muestra la barra cuando esa
// pantalla enfocada es la raíz de la propia pestaña.
// Segundo rediseño de la barra (2026-08-23, pedido explícito): Home v2
// había quedado inalcanzable desde el rediseño anterior (ya no era raíz de
// ninguna pestaña, solo llegable navegando a mano) -- vuelve a serlo, como
// "Inicio", sustituyendo a Perfil en la barra fija. Perfil pasa al menú "+"
// de accesos rápidos (ver QUICK_ACTIONS en NavigationTab.tsx), junto con
// Blog/Comunidad/Métricas/Check-ins.
const TAB_ROOT_SCREEN: Record<string, string> = {
  InicioTab: 'MigratedHomeModernV2',
  PlanDiarioTab: 'MigratedMyProgramCalendar',
  NutritionTab: 'MigratedPlan',
  HabitsTab: 'MigratedHabits',
};

function tabScreenOptions(tabName: keyof typeof TAB_ROOT_SCREEN, icon: IoniconName, label: string) {
  return ({ route }: { route: any }) => {
    const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? TAB_ROOT_SCREEN[tabName];
    return {
      icon,
      label,
      tabBarVisible: focusedRouteName === TAB_ROOT_SCREEN[tabName],
    } as NavigationTabOptionsInterface;
  };
}

function Homenavigator() {
  return (
    <TabBarScrollProvider>
      <Tab.Navigator
        initialRouteName="InicioTab"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <NavigationTab {...props} />}
        backBehavior="order">
        {/* Las 4 pestañas comparten el mismo stack completo (MigratedNavigator,
            con las ~100 pantallas migradas) para no duplicar rutas -- solo
            cambia la pantalla inicial de cada una via initialParams.initialScreen. */}
        <Tab.Screen
          name="InicioTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: 'MigratedHomeModernV2' }}
          options={tabScreenOptions('InicioTab', 'home-outline', 'Inicio')}
        />
        <Tab.Screen
          name="PlanDiarioTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: 'MigratedMyProgramCalendar' }}
          options={tabScreenOptions('PlanDiarioTab', 'calendar-outline', 'Plan del día')}
        />
        <Tab.Screen
          name="NutritionTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: 'MigratedPlan' }}
          options={tabScreenOptions('NutritionTab', 'nutrition-outline', 'Nutrición')}
        />
        <Tab.Screen
          name="HabitsTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: 'MigratedHabits' }}
          options={tabScreenOptions('HabitsTab', 'flame-outline', 'Hábitos')}
        />
      </Tab.Navigator>
    </TabBarScrollProvider>
  );
}

// A nivel de módulo: crear el navigator dentro del componente lo recreaba en
// cada render y remontaba todo el stack (pantallas en blanco al hacer push).
const MStack = createNativeStackNavigator();

function MigratedNavigator({ route }: { route?: { params?: { initialScreen?: string } } }) {
  return (
    <MStack.Navigator
      initialRouteName={route?.params?.initialScreen ?? 'MigratedHomeModernV2'}
      screenOptions={{
        headerShown: false,
      }}>
      <MStack.Screen name="MigratedAboutApp" component={AboutAppScreen} />
      <MStack.Screen name="MigratedAboutUs" component={AboutUsScreen} />
      <MStack.Screen name="MigratedActivityTracker" component={ActivityTrackerScreen} />
      <MStack.Screen name="MigratedAddPost" component={AddPostScreen} />
      <MStack.Screen name="MigratedAddShoppingList" component={AddShoppingListScreen} />
      <MStack.Screen name="MigratedAppFeedback" component={AppFeedbackScreen} />
      <MStack.Screen name="MigratedAppearance" component={AppearanceScreen} />
      <MStack.Screen name="MigratedBlogDetail" component={BlogDetailScreen} />
      <MStack.Screen name="MigratedBlog" component={BlogScreen} />
      <MStack.Screen name="MigratedBodyMetrics" component={BodyMetricsScreen} />
      <MStack.Screen name="MigratedBookmark" component={BookmarkScreen} />
      <MStack.Screen name="MigratedChangePwd" component={ChangePwdScreen} />
      <MStack.Screen name="MigratedChatting" component={ChattingScreen} />
      <MStack.Screen name="MigratedCheckIns" component={CheckInsListScreen} />
      <MStack.Screen name="MigratedCheckInFill" component={CheckInFillScreen} />
      <MStack.Screen name="MigratedHabits" component={HabitsListScreen} />
      <MStack.Screen name="MigratedHabitDetail" component={HabitDetailScreen} />
      <MStack.Screen name="MigratedHabitAdd" component={HabitAddScreen} />
      <MStack.Screen name="MigratedCommunity" component={CommunityScreen} />
      <MStack.Screen name="MigratedDietDetail" component={DietDetailScreen as any} />
      <MStack.Screen name="MigratedAssignedMeals" component={AssignedMealsScreen} />
      <MStack.Screen name="MigratedEditProfile" component={EditProfileScreen} />
      <MStack.Screen name="MigratedExerciseInfo" component={ExerciseInfoScreen} />
      <MStack.Screen name="MigratedFavouriteRecipe" component={FavouriteRecipeScreen} />
      <MStack.Screen name="MigratedFavourite" component={FavouriteScreen as any} />
      <MStack.Screen name="MigratedHomeModernV2" component={HomeScreenModernV2} />
      <MStack.Screen name="MigratedMuscleProgress" component={MuscleProgressScreen} />
      <MStack.Screen name="MigratedMyProgramCalendar" component={MyProgramCalendarScreen} />
      <MStack.Screen name="MigratedNotification" component={NotificationScreen} />
      {/* Distinto de MigratedNotification de arriba (esa es el buzón/feed de
          notificaciones ya recibidas, notification_screen.tsx) -- esta es el
          ajuste de permiso de notificaciones push, pedido explícito con
          captura de referencia (Bevel). */}
      <MStack.Screen name="MigratedNotificationSettings" component={NotificationSettingsScreen} />
      <MStack.Screen name="MigratedOnboardingData" component={OnboardingDataScreen} />
      <MStack.Screen name="MigratedOtherUserProfile" component={OtherUserProfileScreen} />
      <MStack.Screen name="MigratedPlan" component={PlanScreen} />
      <MStack.Screen name="MigratedPostDetails" component={PostDetailsScreen} />
      <MStack.Screen name="MigratedPrivacyPolicy" component={PrivacyPolicyScreen} />
      <MStack.Screen name="MigratedProfile" component={ProfileScreenMigrated as any} />
      {/* Misma screen que MigratedProfile de arriba, registrada una segunda vez
          bajo otro nombre de ruta con presentation:'modal' -- pedido
          explícito: el icono de ajustes de Home v2 debe abrir Perfil como un
          diálogo (desliza desde abajo, X para cerrar), pero entrar desde
          cualquier otro sitio (navegación normal a "MigratedProfile") tiene
          que verse exactamente igual que siempre. Cero contenido duplicado:
          es el mismo componente, la screen sabe si está en modo modal
          comprobando `route.name` (ver profile_screen.tsx). */}
      <MStack.Screen
        name="MigratedProfileModal"
        component={ProfileScreenMigrated as any}
        options={{ presentation: 'modal' }}
      />
      <MStack.Screen name="MigratedProgress" component={ProgressScreen} />
      <MStack.Screen name="MigratedStatistics" component={StatisticsScreen} />
      <MStack.Screen
        name="MigratedStatisticsMuscles"
        component={StatisticsMuscleDistributionScreen}
      />
      <MStack.Screen name="MigratedStatisticsBody" component={StatisticsBodyDistributionScreen} />
      <MStack.Screen name="MigratedStatisticsSeriesCount" component={StatisticsSeriesCountScreen} />
      <MStack.Screen
        name="MigratedStatisticsTopExercises"
        component={StatisticsTopExercisesScreen}
      />
      <MStack.Screen
        name="MigratedStatisticsPersonalRecords"
        component={StatisticsPersonalRecordsScreen}
      />
      <MStack.Screen
        name="MigratedStatisticsMonthlyReport"
        component={StatisticsMonthlyReportScreen}
      />
      <MStack.Screen name="MigratedComingSoon" component={ComingSoonScreen} />
      <MStack.Screen name="MigratedRecipeCategoryList" component={RecipeCategoryListScreen} />
      <MStack.Screen name="MigratedRecipeListV2" component={RecipeListScreenV2} />
      <MStack.Screen name="MigratedRecipeMain" component={RecipeMainScreen} />
      <MStack.Screen name="MigratedRecipeTagList" component={RecipeTagListScreen} />
      <MStack.Screen name="MigratedResourceDetail" component={ResourceDetailScreen} />
      <MStack.Screen name="MigratedResourcesList" component={ResourcesListScreen} />
      <MStack.Screen name="MigratedSearch" component={SearchScreen} />
      <MStack.Screen name="MigratedSessionHistoryDetail" component={SessionHistoryDetailScreen} />
      <MStack.Screen name="MigratedShoppingListDetail" component={ShoppingListDetailScreen} />
      <MStack.Screen name="MigratedShoppingList" component={ShoppingListScreen} />
      <MStack.Screen name="MigratedTrainingAvailability" component={TrainingAvailabilityScreen} />
      <MStack.Screen name="MigratedViewAllBlog" component={ViewAllBlogScreen} />
      <MStack.Screen name="MigratedViewBodyPart" component={ViewBodyPartScreen} />
      <MStack.Screen name="MigratedViewEquipment" component={ViewEquipmentScreen} />
      <MStack.Screen name="MigratedWaterTracker" component={WaterTrackerScreen} />
      <MStack.Screen name="MigratedWebView" component={WebViewScreen} />
      <MStack.Screen name="MigratedWorkoutHistory" component={WorkoutHistoryScreen} />
      <MStack.Screen name="MigratedWorkoutPreview" component={WorkoutPreviewScreen} />
      <MStack.Screen name="MigratedCustomWorkoutBuilder" component={CustomWorkoutBuilderScreen} />
      <MStack.Screen name="MigratedWorkoutSession" component={WorkoutSessionScreenMig} />
      <MStack.Screen name="MigratedWorkoutFeedback" component={WorkoutFeedbackScreen} />
      <MStack.Screen name="MigratedWorkoutSummary" component={WorkoutSummaryScreenMig} />
      <MStack.Screen name="MigratedWorkoutTemplateList" component={WorkoutTemplateListScreen} />
      <MStack.Screen name="MigratedYoutubePlayer" component={YoutubePlayerScreen} />
      <MStack.Screen name="MigratedAssessmentResult" component={AssessmentResultScreen} />
    </MStack.Navigator>
  );
}

function RootNavigator() {
  const { state } = useAuth();

  if (state.isLoading) return null;

  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator
        key={state.isAuthenticated ? (state.onboardingCompleted ? 'main' : 'onboarding') : 'auth'}
        initialRouteName={
          !state.isAuthenticated
            ? 'WelcomeAuth'
            : !state.onboardingCompleted
              ? 'MigratedOnboardingV2'
              : 'Home'
        }
        screenOptions={{
          headerShown: false,
        }}>
        {!state.isAuthenticated ? (
          <>
            <Stack.Screen name="WelcomeAuth" component={WelcomeAuthScreen} />
            <Stack.Screen name="LoginAuth" component={LoginScreen} />
            {/* Pedido explícito 2026-08-29: sin screen de registro aparte, el
              onboarding ES el registro -- "Regístrate" (WelcomeAuthScreen/
              LoginScreen) navega aquí directamente, todavía sin cuenta. Ver
              handleContinue en onboarding_v2_screen.tsx (registro diferido
              a la última pregunta) y el comentario de hydrateSession en
              store/AuthContext.tsx. */}
            <Stack.Screen name="MigratedOnboardingV2" component={OnboardingV2Screen} />
            <Stack.Screen name="ForgotOptions" component={ForgotPasswordOptionsScreen} />
            <Stack.Screen name="ForgotEmail" component={ForgotPasswordEmailScreen} />
            <Stack.Screen name="ResetSent" component={PasswordResetSentScreen} />
          </>
        ) : !state.onboardingCompleted ? (
          <>
            <Stack.Screen name="MigratedOnboardingV2" component={OnboardingV2Screen} />
            <Stack.Screen name="MigratedAssessmentResult" component={AssessmentResultScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={Homenavigator} />

            {/* Diet */}
            <Stack.Screen name="DietDashboard" component={DietDashboard} />
            <Stack.Screen name="DietList" component={DietList} />

            {/* Migrated screens (nested navigator) */}
            <Stack.Screen name="Migrated" component={MigratedNavigator} />

            <Stack.Screen name="ScreenExplorer" component={ScreenExplorer} />
          </>
        )}
      </Stack.Navigator>
    </Suspense>
  );
}

// Extraído del return de App() para poder leer useAppReload() -- "Borrar
// caché y recargar todos los datos" (Ajustes, ver store/AppReloadContext.tsx)
// remonta SOLO este NavigationContainer (key={reloadKey}), no AuthProvider
// ni TutorialProvider por encima -- recargar datos no debe cerrar sesión.
function AppNavigationContainer({
  navigationRef,
  onReady,
}: {
  navigationRef: any;
  onReady: () => void;
}) {
  const { reloadKey } = useAppReload();
  return (
    <NavigationContainer
      key={reloadKey}
      ref={navigationRef}
      theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#EBEBF0' } }}
      onReady={onReady}>
      <RootNavigator />
    </NavigationContainer>
  );
}

// Puente entre AppColorModeProvider y GluestackUIProvider (2026-08-25):
// useAppColorMode() solo es invocable dentro de la subtree de
// AppColorModeProvider, así que GluestackUIProvider (que necesita el `mode`
// actual para que los componentes Gluestack/NativeWind -- Box/Text/Card/
// Button con className="bg-card" etc. -- respondan a modo oscuro) tiene que
// vivir DENTRO de AppColorModeProvider, no envolviéndolo por fuera como
// antes (mode="light" fijo). Ver global.css para los valores de color que
// esto activa (resincronizados con C/C_DARK de pages/migrated/theme.ts en
// el mismo commit).
function GluestackModeBridge({ children }: { children: React.ReactNode }) {
  const { mode } = useAppColorMode();
  return <GluestackUIProvider mode={mode}>{children}</GluestackUIProvider>;
}

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Si quedo una sesion de entrenamiento sin finalizar de un cierre en frio
  // anterior, rehidrata la barra flotante global (WorkoutMinimizedBar) sin
  // esperar a que el cliente vuelva a entrar manualmente a esa pantalla.
  useEffect(() => {
    hydratePersistedWorkoutSession();
  }, []);

  // Deep link de vuelta desde la Live Activity del entreno (rediseño
  // 2026-09-26, ver ios/bestrongerWidgets/WorkoutLiveActivityView.swift):
  // los chips de reps/carga y "Serie hecha" abren
  // com.pfndesign.bestronger://workout/focus?field=reps|carga|done -- un
  // solo parámetro, sin id de sesión ni de serie, porque
  // workout_session_screen.tsx ya sabe resolver sola "la serie pendiente de
  // la sesión activa" (mismo patrón que WorkoutMinimizedBar.restore(), que
  // retoma la sesión activa sin pasar ningún id). Si no hay ninguna sesión
  // activa (el entreno ya terminó, o la Live Activity quedó obsoleta), no
  // tiene sentido navegar con params vacíos -- se avisa con un toast en vez
  // de aterrizar en una pantalla de sesión rota.
  //
  // navigationRef puede no estar listo todavía si la app arranca en frío
  // desde este mismo link (el sistema entrega la URL antes de que el primer
  // NavigationContainer termine de montar) -- se reintenta con un intervalo
  // corto, mismo problema que ya resuelve restoringRef en
  // WorkoutMinimizedBar.restore() pero aquí con reintento en vez de
  // descartar el toque.
  const pendingDeepLinkFieldRef = useRef<string | null>(null);

  useEffect(() => {
    // Parseo manual, sin `new URL()`/`URLSearchParams`: son un esquema
    // propio (`com.pfndesign.bestronger://…`), no http(s) -- otras
    // pantallas de esta app ya usan `new URL(...).origin/.hostname` pero
    // solo sobre URLs web reales; no hay garantía de que el URL de Hermes
    // trate igual un esquema personalizado, y no hay simulador aquí para
    // comprobarlo. El formato es fijo y lo controlamos en los dos lados
    // (este parser y WorkoutLiveActivityView.swift), así que un split de
    // strings es más robusto que fiarse de un polyfill parcial.
    const PREFIX = 'com.pfndesign.bestronger://workout/focus?';

    function handleUrl(url: string | null) {
      if (!url || !url.startsWith(PREFIX)) return;
      const query = url.slice(PREFIX.length);
      const field = query
        .split('&')
        .map((pair) => pair.split('='))
        .find(([key]) => key === 'field')?.[1];
      if (!field) return;
      pendingDeepLinkFieldRef.current = decodeURIComponent(field);
      flushPendingDeepLink();
    }

    function flushPendingDeepLink() {
      const field = pendingDeepLinkFieldRef.current;
      if (!field) return;
      if (!screenReviewNavigationRef.current?.isReady?.()) return;
      pendingDeepLinkFieldRef.current = null;
      const session = getActiveWorkoutSession();
      if (!session) {
        showToast('Info', { description: 'Ese entrenamiento ya no está activo.', variant: 'info' });
        return;
      }
      screenReviewNavigationRef.current.navigate('MigratedWorkoutSession', {
        programDayAssignmentId: session.programDayAssignmentId,
        workoutTemplateId: session.workoutTemplateId,
        mTitle: session.mTitle,
        focusField: field,
        // Token único por toque (no solo el nombre del campo): si el
        // usuario toca el mismo chip dos veces seguidas ("carga" otra vez
        // tras corregir), focusField no cambia de valor -- un efecto en
        // workout_session_screen.tsx que dependa solo de focusField no
        // volvería a dispararse en el segundo toque aunque sí llegó un
        // navigate() nuevo.
        focusToken: Date.now(),
      });
    }

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then(handleUrl);

    // Reintento corto: cubre la ventana entre "llegó la URL" y "el
    // NavigationContainer ya está listo" en un arranque en frío.
    const retryId = setInterval(flushPendingDeepLink, 200);
    const retryTimeout = setTimeout(() => clearInterval(retryId), 4000);

    return () => {
      sub.remove();
      clearInterval(retryId);
      clearTimeout(retryTimeout);
    };
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'Gilroy-Light': {
            uri: require('@assets/font/Gilroy-Light.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-Lightitalic': {
            uri: require('@assets/font/Gilroy-LightItalic.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-ExtraBold': {
            uri: require('@assets/font/Gilroy-ExtraBold.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-Bold': {
            uri: require('@assets/font/Gilroy-Bold.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-SemiBold': {
            uri: require('@assets/font/Gilroy-SemiBold.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-Regular': {
            uri: require('@assets/font/Gilroy-Regular.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-Black': {
            uri: require('@assets/font/Gilroy-Black.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
          'Gilroy-Medium': {
            uri: require('@assets/font/Gilroy-Medium.ttf'),
            display: Font.FontDisplay.FALLBACK,
          },
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {/* Cerca de la raíz (no solo alrededor de Home v2) para que
            cualquier pantalla que consuma useAppColorMode() -- hoy son
            decenas, tras la migración a modo oscuro dinámico -- comparta el
            mismo estado real, ver helper/useAppColorMode.ts. AppReloadProvider
            por fuera de AuthProvider/TutorialProvider a propósito -- "recargar
            todos los datos" (Ajustes) solo debe remontar el
            NavigationContainer de abajo (AppNavigationContainer), nunca
            cerrar la sesión. GluestackUIProvider vive DENTRO de
            AppColorModeProvider (vía GluestackModeBridge) -- ver el
            comentario de esa función para el porqué. */}
        <AppReloadProvider>
          <AppColorModeProvider>
            <GluestackModeBridge>
              <AuthProvider>
                <TutorialProvider navigationRef={screenReviewNavigationRef}>
                  <AppNavigationContainer
                    navigationRef={screenReviewNavigationRef}
                    onReady={onLayoutRootView}
                  />
                  {/* Ocultos para el build oficial (pedido explícito
                      2026-08-31, ver constants/featureFlags.ts,
                      DEV_TOOLS_ENABLED) -- no son para usuarios finales.
                      No se desmontan del árbol, se reactivan después de
                      este build. */}
                  {DEV_TOOLS_ENABLED && (
                    <>
                      <ScreenReviewFab navigationRef={screenReviewNavigationRef} />
                      <ScreenExplorerFab navigationRef={screenReviewNavigationRef} />
                    </>
                  )}
                  <WorkoutMinimizedBar navigationRef={screenReviewNavigationRef} />
                  <TutorialOverlay />
                  <ToastHost />
                </TutorialProvider>
              </AuthProvider>
            </GluestackModeBridge>
          </AppColorModeProvider>
        </AppReloadProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
