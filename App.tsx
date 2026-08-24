import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { View } from 'react-native';
import React, { useCallback, useEffect, useState, Suspense } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from "expo-font";
import { DefaultTheme, NavigationContainer, createNavigationContainerRef, getFocusedRouteNameFromRoute } from "@react-navigation/native";
// Herramienta temporal de desarrollo (ver components/ScreenReviewFab.tsx) —
// borrar este import + el ref + el mount del FAB mas abajo cuando ya no haga falta.
import ScreenReviewFab from "@components/ScreenReviewFab";
import ScreenExplorerFab from "@components/ScreenExplorerFab";
import WorkoutMinimizedBar from "@components/WorkoutMinimizedBar";
import TutorialOverlay from "@components/tutorial/TutorialOverlay";
import { TutorialProvider } from "@store/TutorialContext";
import { hydratePersistedWorkoutSession } from "@helper/workoutSessionBus";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { enableScreens } from "react-native-screens";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@store/AuthContext";
import "@helper/reminderNotifications";
import NavigationTab from "@components/NavigationTab";
import { NavigationTabOptionsInterface, IoniconName } from "@components/_types/NavigationTab.i";
import { TabBarScrollProvider } from "@store/TabBarScrollContext";
import { AppColorModeProvider } from "@helper/useAppColorMode";
import { AppReloadProvider, useAppReload } from "@store/AppReloadContext";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
const screenReviewNavigationRef = createNavigationContainerRef(); // registra el handler de notificaciones locales al arrancar, sin depender de visitar las pantallas de recordatorios

const Home = React.lazy(() => import('@pages/Home'));

const WelcomeAuthScreen = React.lazy(() => import('@pages/auth/WelcomeAuthScreen'));
const LoginScreen = React.lazy(() => import('@pages/auth/LoginScreen'));
const ForgotPasswordOptionsScreen = React.lazy(() => import('@pages/auth/ForgotPasswordOptionsScreen'));
const ForgotPasswordEmailScreen = React.lazy(() => import('@pages/auth/ForgotPasswordEmailScreen'));
const PasswordResetSentScreen = React.lazy(() => import('@pages/auth/PasswordResetSentScreen'));
const RegisterScreen = React.lazy(() => import('@pages/auth/RegisterScreen'));

const DietDashboard = React.lazy(() => import('@pages/DietDashboard'));
const DietList = React.lazy(() => import('@pages/DietList'));
const ScreenExplorer = React.lazy(() => import('@pages/ScreenExplorer'));

const AboutAppScreen = React.lazy(() => import('@pages/migrated/about_app_screen'));
const AboutUsScreen = React.lazy(() => import('@pages/migrated/about_us_screen'));
const ActivityTrackerScreen = React.lazy(() => import('@pages/migrated/activity_tracker_screen'));
const AddPostScreen = React.lazy(() => import('@pages/migrated/add_post_screen'));
const AddShoppingListScreen = React.lazy(() => import('@pages/migrated/add_shopping_list_screen'));
const AppearanceScreen = React.lazy(() => import('@pages/migrated/appearance_screen'));
const BlogDetailScreen = React.lazy(() => import('@pages/migrated/blog_detail_screen'));
const BlogScreen = React.lazy(() => import('@pages/migrated/blog_screen'));
const BodyMetricsScreen = React.lazy(() => import('@pages/migrated/body_metrics_screen'));
const BookmarkScreen = React.lazy(() => import('@pages/migrated/bookmark_screen'));
const ChangePwdScreen = React.lazy(() => import('@pages/migrated/change_pwd_screen'));
const ChattingImageScreen = React.lazy(() => import('@pages/migrated/chatting_image_screen'));
const ChattingScreen = React.lazy(() => import('@pages/migrated/chatting_screen'));
const CheckInsListScreen = React.lazy(() => import('@pages/migrated/checkins_list_screen'));
const CheckInFillScreen = React.lazy(() => import('@pages/migrated/checkin_fill_screen'));
const ChewieScreen = React.lazy(() => import('@pages/migrated/chewie_screen'));
const CommunityScreen = React.lazy(() => import('@pages/migrated/community_screen'));

const DietDetailScreen = React.lazy(() => import('@pages/migrated/diet_detail_screen'));
const AssignedMealsScreen = React.lazy(() => import('@pages/migrated/assigned_meals_screen'));
const EditProfileScreen = React.lazy(() => import('@pages/migrated/edit_profile_screen'));
const ExerciseInfoScreen = React.lazy(() => import('@pages/migrated/exercise_info_screen'));
const FavouriteRecipeScreen = React.lazy(() => import('@pages/migrated/favourite_recipe_screen'));
const FavouriteScreen = React.lazy(() => import('@pages/migrated/favourite_screen'));

const HomeScreenModern = React.lazy(() => import('@pages/migrated/home_screen_modern'));
const HomeScreenModernV2 = React.lazy(() => import('@pages/migrated/home_screen_modern_v2'));
const HabitsListScreen = React.lazy(() => import('@pages/migrated/habits_list_screen'));
const HabitDetailScreen = React.lazy(() => import('@pages/migrated/habit_detail_screen'));
const HabitAddScreen = React.lazy(() => import('@pages/migrated/habit_add_screen'));
const LanguageScreen = React.lazy(() => import('@pages/migrated/language_screen'));
const MainGoalScreen = React.lazy(() => import('@pages/migrated/main_goal_screen'));
const MealsRemindersScreen = React.lazy(() => import('@pages/migrated/meals_reminders_screen'));
const MealsWaterReminderScreen = React.lazy(() => import('@pages/migrated/meals_water_reminder_screen'));
const MuscleProgressScreen = React.lazy(() => import('@pages/migrated/muscle_progress_screen'));
const MyProgramCalendarScreen = React.lazy(() => import('@pages/migrated/my_program_calendar_screen'));
const NotificationScreen = React.lazy(() => import('@pages/migrated/notification_screen'));
const NotificationSettingsScreen = React.lazy(() => import('@pages/migrated/notification_settings_screen'));
const OnboardingScreen = React.lazy(() => import('@pages/migrated/onboarding_screen'));
const OnboardingV2Screen = React.lazy(() => import('@pages/migrated/onboarding_v2/onboarding_v2_screen'));
const OtherUserProfileScreen = React.lazy(() => import('@pages/migrated/other_user_profile_screen'));
const PlanScreen = React.lazy(() => import('@pages/migrated/plan_screen'));
const PostDetailsScreen = React.lazy(() => import('@pages/migrated/post_details_screen'));
const PrivacyPolicyScreen = React.lazy(() => import('@pages/migrated/privacy_policy_screen'));
const ProfileScreenMigrated = React.lazy(() => import('@pages/migrated/profile_screen'));
const ProgressScreen = React.lazy(() => import('@pages/migrated/progress_screen'));
const StatisticsScreen = React.lazy(() => import('@pages/migrated/statistics_screen'));
const StatisticsMuscleDistributionScreen = React.lazy(() => import('@pages/migrated/statistics_muscle_distribution_screen'));
const StatisticsBodyDistributionScreen = React.lazy(() => import('@pages/migrated/statistics_body_distribution_screen'));
const StatisticsSeriesCountScreen = React.lazy(() => import('@pages/migrated/statistics_series_count_screen'));
const StatisticsTopExercisesScreen = React.lazy(() => import('@pages/migrated/statistics_top_exercises_screen'));
const StatisticsPersonalRecordsScreen = React.lazy(() => import('@pages/migrated/statistics_personal_records_screen'));
const StatisticsMonthlyReportScreen = React.lazy(() => import('@pages/migrated/statistics_monthly_report_screen'));
const ComingSoonScreen = React.lazy(() => import('@pages/migrated/coming_soon_screen'));
const RecipeCategoryListScreen = React.lazy(() => import('@pages/migrated/recipe_category_list_screen'));
const RecipeListScreenV2 = React.lazy(() => import('@pages/migrated/recipe_list_screen_v2'));
const RecipeMainScreen = React.lazy(() => import('@pages/migrated/recipe_main_screen'));
const WorkoutTemplateListScreen = React.lazy(() => import('@pages/migrated/workout_template_list_screen'));
const RecipeTagListScreen = React.lazy(() => import('@pages/migrated/recipe_tag_list_screen'));
const ReminderScreen = React.lazy(() => import('@pages/migrated/reminder_screen'));
const ResourceDetailScreen = React.lazy(() => import('@pages/migrated/resource_detail_screen'));
const ResourcesListScreen = React.lazy(() => import('@pages/migrated/resources_list_screen'));
const SearchScreen = React.lazy(() => import('@pages/migrated/search_screen'));
const SessionHistoryDetailScreen = React.lazy(() => import('@pages/migrated/session_history_detail_screen'));
const SetReminderScreen = React.lazy(() => import('@pages/migrated/set_reminder_screen'));
const ShoppingListDetailScreen = React.lazy(() => import('@pages/migrated/shopping_list_detail_screen'));
const ShoppingListScreen = React.lazy(() => import('@pages/migrated/shopping_list_screen'));

const SleepMonitoringScreen = React.lazy(() => import('@pages/migrated/sleep_monitoring_screen'));
const SplashScreenMigrated = React.lazy(() => import('@pages/migrated/splash_screen'));
const StepsCountScreen = React.lazy(() => import('@pages/migrated/steps_count_screen'));
const TermsAndConditionsScreen = React.lazy(() => import('@pages/migrated/terms_and_conditions_screen'));
const TipsScreen = React.lazy(() => import('@pages/migrated/tips_screen'));
const VideoDetailScreen = React.lazy(() => import('@pages/migrated/video_detail_screen'));
const VideoScreen = React.lazy(() => import('@pages/migrated/video_screen'));
const ViewAllBlogScreen = React.lazy(() => import('@pages/migrated/view_all_blog_screen'));
const ViewBodyPartScreen = React.lazy(() => import('@pages/migrated/view_body_part_screen'));
const ViewEquipmentScreen = React.lazy(() => import('@pages/migrated/view_equipment_screen'));
const WaterRemindersScreen = React.lazy(() => import('@pages/migrated/water_reminders_screen'));
const WaterTrackerScreen = React.lazy(() => import('@pages/migrated/water_tracker_screen'));
const WebViewScreen = React.lazy(() => import('@pages/migrated/web_view_screen'));
const WorkoutDetailScreenMig = React.lazy(() => import('@pages/migrated/workout_detail_screen'));
const WorkoutHistoryScreen = React.lazy(() => import('@pages/migrated/workout_history_screen'));
const WorkoutPreviewScreen = React.lazy(() => import('@pages/migrated/workout_preview_screen'));
const WorkoutSessionScreenMig = React.lazy(() => import('@pages/migrated/workout_session_screen'));
const WorkoutFeedbackScreen = React.lazy(() => import('@pages/migrated/workout_feedback_screen'));
const WorkoutSummaryScreenMig = React.lazy(() => import('@pages/migrated/workout_summary_screen'));
const YoutubePlayerScreen = React.lazy(() => import('@pages/migrated/youtube_player_screen'));



const DeviceConnectedScreen = React.lazy(() => import('@pages/migrated/home/device_connected_screen'));
const EmparejandoScreen = React.lazy(() => import('@pages/migrated/home/emparejando_screen'));
const FitnessMetricsScreen = React.lazy(() => import('@pages/migrated/home/fitness_metrics_screen'));
const HealthMetricInsightScreen = React.lazy(() => import('@pages/migrated/home/health_metric_insight_screen'));
const HeartRateDetailsScreen = React.lazy(() => import('@pages/migrated/home/heart_rate_details_screen'));
const HeartRateHistoryScreen = React.lazy(() => import('@pages/migrated/home/heart_rate_history_screen'));
const HeartRateInsightScreen = React.lazy(() => import('@pages/migrated/home/heart_rate_insight_screen'));
const HeartRateScreen = React.lazy(() => import('@pages/migrated/home/heart_rate_screen'));
const HeartRateZoneScreen = React.lazy(() => import('@pages/migrated/home/heart_rate_zones_screen'));
const LinkDeviceChoiceScreen = React.lazy(() => import('@pages/migrated/home/link_device_choice_screen'));
const LinkDeviceListScreen = React.lazy(() => import('@pages/migrated/home/link_device_list_screen'));
const LogStepsFormScreen = React.lazy(() => import('@pages/migrated/home/log_steps_form_screen'));
const ManageHealthMetricsScreen = React.lazy(() => import('@pages/migrated/home/manage_health_metrics_screen'));
const StepGoalCompletedScreen = React.lazy(() => import('@pages/migrated/home/step_goal_completed_screen'));
const StepGoalScreen = React.lazy(() => import('@pages/migrated/home/step_goal_screen'));
const StepsDetailsScreen = React.lazy(() => import('@pages/migrated/home/steps_details_screen'));
const StepsHistoryScreen = React.lazy(() => import('@pages/migrated/home/steps_history_screen'));
const StepsInsightScreenHome = React.lazy(() => import('@pages/migrated/home/steps_insight_screen'));
const StepsLoggedScreen = React.lazy(() => import('@pages/migrated/home/steps_logged_screen'));
const StepsScreen = React.lazy(() => import('@pages/migrated/home/steps_screen'));

const ArticlesScreen = React.lazy(() => import('@pages/migrated/onboarding/articles_screen'));
const AssessmentResultScreen = React.lazy(() => import('@pages/migrated/onboarding/assessment_result_screen'));
const AvatarSetupScreen = React.lazy(() => import('@pages/migrated/onboarding/avatar_setup_screen'));
const HealthScreen = React.lazy(() => import('@pages/migrated/onboarding/health_screen'));
const NotificationsScreen = React.lazy(() => import('@pages/migrated/onboarding/notifications_screen'));
const PrivacyPolicyScreenOnboard = React.lazy(() => import('@pages/migrated/onboarding/privacy_policy_screen'));
const ProfileSetupFormScreen = React.lazy(() => import('@pages/migrated/onboarding/profile_setup_form_screen'));
const ProfileSetupIntroScreen = React.lazy(() => import('@pages/migrated/onboarding/profile_setup_intro_screen'));
const RecommendationsScreen = React.lazy(() => import('@pages/migrated/onboarding/recommendations_screen'));

enableScreens();
const Stack = createStackNavigator();
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
  InicioTab: "MigratedHomeModernV2",
  PlanDiarioTab: "MigratedMyProgramCalendar",
  NutritionTab: "MigratedPlan",
  HabitsTab: "MigratedHabits",
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
        backBehavior="order"
      >
        {/* Las 4 pestañas comparten el mismo stack completo (MigratedNavigator,
            con las ~100 pantallas migradas) para no duplicar rutas -- solo
            cambia la pantalla inicial de cada una via initialParams.initialScreen. */}
        <Tab.Screen
          name="InicioTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: "MigratedHomeModernV2" }}
          options={tabScreenOptions("InicioTab", "home-outline", "Inicio")}
        />
        <Tab.Screen
          name="PlanDiarioTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: "MigratedMyProgramCalendar" }}
          options={tabScreenOptions("PlanDiarioTab", "calendar-outline", "Plan del día")}
        />
        <Tab.Screen
          name="NutritionTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: "MigratedPlan" }}
          options={tabScreenOptions("NutritionTab", "nutrition-outline", "Nutrición")}
        />
        <Tab.Screen
          name="HabitsTab"
          component={MigratedNavigator}
          initialParams={{ initialScreen: "MigratedHabits" }}
          options={tabScreenOptions("HabitsTab", "flame-outline", "Hábitos")}
        />
      </Tab.Navigator>
    </TabBarScrollProvider>
  );
}

function MigratedNavigator({ route }: { route?: { params?: { initialScreen?: string } } }) {
  const MStack = createStackNavigator();
  return (
    <MStack.Navigator initialRouteName={route?.params?.initialScreen ?? "MigratedHomeModernV2"} screenOptions={{ headerShown: false }}>
      <MStack.Screen name="MigratedAboutApp" component={AboutAppScreen} />
      <MStack.Screen name="MigratedAboutUs" component={AboutUsScreen} />
      <MStack.Screen name="MigratedActivityTracker" component={ActivityTrackerScreen} />
      <MStack.Screen name="MigratedAddPost" component={AddPostScreen} />
      <MStack.Screen name="MigratedAddShoppingList" component={AddShoppingListScreen} />
      <MStack.Screen name="MigratedAppearance" component={AppearanceScreen} />
      <MStack.Screen name="MigratedBlogDetail" component={BlogDetailScreen} />
      <MStack.Screen name="MigratedBlog" component={BlogScreen} />
      <MStack.Screen name="MigratedBodyMetrics" component={BodyMetricsScreen} />
      <MStack.Screen name="MigratedBookmark" component={BookmarkScreen} />
      <MStack.Screen name="MigratedChangePwd" component={ChangePwdScreen} />
      <MStack.Screen name="MigratedChattingImage" component={ChattingImageScreen} />
      <MStack.Screen name="MigratedChatting" component={ChattingScreen} />
      <MStack.Screen name="MigratedCheckIns" component={CheckInsListScreen} />
      <MStack.Screen name="MigratedCheckInFill" component={CheckInFillScreen} />
      <MStack.Screen name="MigratedHabits" component={HabitsListScreen} />
      <MStack.Screen name="MigratedHabitDetail" component={HabitDetailScreen} />
      <MStack.Screen name="MigratedHabitAdd" component={HabitAddScreen} />
      <MStack.Screen name="MigratedChewie" component={ChewieScreen} />
      <MStack.Screen name="MigratedCommunity" component={CommunityScreen} />
      <MStack.Screen name="MigratedDietDetail" component={DietDetailScreen as any} />
      <MStack.Screen name="MigratedAssignedMeals" component={AssignedMealsScreen} />
      <MStack.Screen name="MigratedEditProfile" component={EditProfileScreen} />
      <MStack.Screen name="MigratedExerciseInfo" component={ExerciseInfoScreen} />
      <MStack.Screen name="MigratedFavouriteRecipe" component={FavouriteRecipeScreen} />
      <MStack.Screen name="MigratedFavourite" component={FavouriteScreen as any} />
      <MStack.Screen name="MigratedHomeModern" component={HomeScreenModern} />
      <MStack.Screen name="MigratedHomeModernV2" component={HomeScreenModernV2} />
      <MStack.Screen name="MigratedLanguage" component={LanguageScreen} />
      <MStack.Screen name="MigratedMainGoal" component={MainGoalScreen} />
      <MStack.Screen name="MigratedMealsReminders" component={MealsRemindersScreen} />
      <MStack.Screen name="MigratedMealsWaterReminder" component={MealsWaterReminderScreen} />
      <MStack.Screen name="MigratedMuscleProgress" component={MuscleProgressScreen} />
      <MStack.Screen name="MigratedMyProgramCalendar" component={MyProgramCalendarScreen} />
      <MStack.Screen name="MigratedNotification" component={NotificationScreen} />
      {/* Distinto de MigratedNotification de arriba (esa es el buzón/feed de
          notificaciones ya recibidas, notification_screen.tsx) -- esta es el
          ajuste de permiso de notificaciones push, pedido explícito con
          captura de referencia (Bevel). */}
      <MStack.Screen name="MigratedNotificationSettings" component={NotificationSettingsScreen} />
      <MStack.Screen name="MigratedOnboarding" component={OnboardingScreen} />
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
      <MStack.Screen name="MigratedStatisticsMuscles" component={StatisticsMuscleDistributionScreen} />
      <MStack.Screen name="MigratedStatisticsBody" component={StatisticsBodyDistributionScreen} />
      <MStack.Screen name="MigratedStatisticsSeriesCount" component={StatisticsSeriesCountScreen} />
      <MStack.Screen name="MigratedStatisticsTopExercises" component={StatisticsTopExercisesScreen} />
      <MStack.Screen name="MigratedStatisticsPersonalRecords" component={StatisticsPersonalRecordsScreen} />
      <MStack.Screen name="MigratedStatisticsMonthlyReport" component={StatisticsMonthlyReportScreen} />
      <MStack.Screen name="MigratedComingSoon" component={ComingSoonScreen} />
      <MStack.Screen name="MigratedRecipeCategoryList" component={RecipeCategoryListScreen} />
      <MStack.Screen name="MigratedRecipeListV2" component={RecipeListScreenV2} />
      <MStack.Screen name="MigratedRecipeMain" component={RecipeMainScreen} />
      <MStack.Screen name="MigratedRecipeTagList" component={RecipeTagListScreen} />
      <MStack.Screen name="MigratedReminder" component={ReminderScreen} />
      <MStack.Screen name="MigratedResourceDetail" component={ResourceDetailScreen} />
      <MStack.Screen name="MigratedResourcesList" component={ResourcesListScreen} />
      <MStack.Screen name="MigratedSearch" component={SearchScreen} />
      <MStack.Screen name="MigratedSessionHistoryDetail" component={SessionHistoryDetailScreen} />
      <MStack.Screen name="MigratedSetReminder" component={SetReminderScreen} />
      <MStack.Screen name="MigratedShoppingListDetail" component={ShoppingListDetailScreen} />
      <MStack.Screen name="MigratedShoppingList" component={ShoppingListScreen} />
      <MStack.Screen name="MigratedSleepMonitoring" component={SleepMonitoringScreen} />
      <MStack.Screen name="MigratedSplash" component={SplashScreenMigrated} />
      <MStack.Screen name="MigratedStepsCount" component={StepsCountScreen} />
      <MStack.Screen name="MigratedTermsAndConditions" component={TermsAndConditionsScreen} />
      <MStack.Screen name="MigratedTips" component={TipsScreen} />
      <MStack.Screen name="MigratedVideoDetail" component={VideoDetailScreen} />
      <MStack.Screen name="MigratedVideo" component={VideoScreen} />
      <MStack.Screen name="MigratedViewAllBlog" component={ViewAllBlogScreen} />
      <MStack.Screen name="MigratedViewBodyPart" component={ViewBodyPartScreen} />
      <MStack.Screen name="MigratedViewEquipment" component={ViewEquipmentScreen} />
      <MStack.Screen name="MigratedWaterReminders" component={WaterRemindersScreen} />
      <MStack.Screen name="MigratedWaterTracker" component={WaterTrackerScreen} />
      <MStack.Screen name="MigratedWebView" component={WebViewScreen} />
      <MStack.Screen name="MigratedWorkoutDetail" component={WorkoutDetailScreenMig} />
      <MStack.Screen name="MigratedWorkoutHistory" component={WorkoutHistoryScreen} />
      <MStack.Screen name="MigratedWorkoutPreview" component={WorkoutPreviewScreen} />
      <MStack.Screen name="MigratedWorkoutSession" component={WorkoutSessionScreenMig} />
      <MStack.Screen name="MigratedWorkoutFeedback" component={WorkoutFeedbackScreen} />
      <MStack.Screen name="MigratedWorkoutSummary" component={WorkoutSummaryScreenMig} />
      <MStack.Screen name="MigratedWorkoutTemplateList" component={WorkoutTemplateListScreen} />
      <MStack.Screen name="MigratedYoutubePlayer" component={YoutubePlayerScreen} />
      <MStack.Screen name="MigratedDeviceConnected" component={DeviceConnectedScreen} />
      <MStack.Screen name="MigratedEmparejando" component={EmparejandoScreen} />
      <MStack.Screen name="MigratedFitnessMetrics" component={FitnessMetricsScreen} />
      <MStack.Screen name="MigratedHealthMetricInsight" component={HealthMetricInsightScreen} />
      <MStack.Screen name="MigratedHeartRateDetails" component={HeartRateDetailsScreen} />
      <MStack.Screen name="MigratedHeartRateHistory" component={HeartRateHistoryScreen} />
      <MStack.Screen name="MigratedHeartRateInsight" component={HeartRateInsightScreen} />
      <MStack.Screen name="MigratedHeartRate" component={HeartRateScreen} />
      <MStack.Screen name="MigratedHeartRateZones" component={HeartRateZoneScreen} />
      <MStack.Screen name="MigratedLinkDeviceChoice" component={LinkDeviceChoiceScreen} />
      <MStack.Screen name="MigratedLinkDeviceList" component={LinkDeviceListScreen} />
      <MStack.Screen name="MigratedLogStepsForm" component={LogStepsFormScreen} />
      <MStack.Screen name="MigratedManageHealthMetrics" component={ManageHealthMetricsScreen} />
      <MStack.Screen name="MigratedStepGoalCompleted" component={StepGoalCompletedScreen} />
      <MStack.Screen name="MigratedStepGoal" component={StepGoalScreen} />
      <MStack.Screen name="MigratedStepsDetails" component={StepsDetailsScreen} />
      <MStack.Screen name="MigratedStepsHistory" component={StepsHistoryScreen} />
      <MStack.Screen name="MigratedStepsInsight" component={StepsInsightScreenHome} />
      <MStack.Screen name="MigratedStepsLogged" component={StepsLoggedScreen} />
      <MStack.Screen name="MigratedSteps" component={StepsScreen} />
      <MStack.Screen name="MigratedArticles" component={ArticlesScreen} />
      <MStack.Screen name="MigratedAssessmentResult" component={AssessmentResultScreen} />
      <MStack.Screen name="MigratedAvatarSetup" component={AvatarSetupScreen} />
      <MStack.Screen name="MigratedHealth" component={HealthScreen} />
      <MStack.Screen name="MigratedNotificationsOnboard" component={NotificationsScreen} />
      <MStack.Screen name="MigratedPrivacyPolicyOnboard" component={PrivacyPolicyScreenOnboard} />
      <MStack.Screen name="MigratedProfileSetupForm" component={ProfileSetupFormScreen} />
      <MStack.Screen name="MigratedProfileSetupIntro" component={ProfileSetupIntroScreen} />
      <MStack.Screen name="MigratedRecommendations" component={RecommendationsScreen} />
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
        initialRouteName={!state.isAuthenticated ? 'WelcomeAuth' : !state.onboardingCompleted ? 'MigratedOnboardingV2' : 'Home'}
        screenOptions={{ headerShown: false }}
      >
        {!state.isAuthenticated ? (
        <>
          <Stack.Screen name="WelcomeAuth" component={WelcomeAuthScreen} />
          <Stack.Screen name="LoginAuth" component={LoginScreen} />
          <Stack.Screen name="RegisterFlow" component={RegisterScreen} />
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

          {/* Exercise */}
          <Stack.Screen name="ExerciseInfo" component={ExerciseInfoScreen} />

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
function AppNavigationContainer({ navigationRef, onReady }: { navigationRef: any; onReady: () => void }) {
  const { reloadKey } = useAppReload();
  return (
    <NavigationContainer
      key={reloadKey}
      ref={navigationRef}
      theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: "#EBEBF0" } }}
      onReady={onReady}
    >
      <RootNavigator />
    </NavigationContainer>
  );
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

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          "Gilroy-Light": {
            uri: require("@assets/font/Gilroy-Light.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-Lightitalic": {
            uri: require("@assets/font/Gilroy-LightItalic.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-ExtraBold": {
            uri: require("@assets/font/Gilroy-ExtraBold.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-Bold": {
            uri: require("@assets/font/Gilroy-Bold.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-SemiBold": {
            uri: require("@assets/font/Gilroy-SemiBold.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-Regular": {
            uri: require("@assets/font/Gilroy-Regular.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-Black": {
            uri: require("@assets/font/Gilroy-Black.ttf"),
            display: Font.FontDisplay.FALLBACK,
          },
          "Gilroy-Medium": {
            uri: require("@assets/font/Gilroy-Medium.ttf"),
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
      <GluestackUIProvider mode="light">
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          {/* Cerca de la raíz (no solo alrededor de Home v2) para que
              cualquier pantalla que consuma useAppColorMode() -- hoy Home v2
              y MigratedAppearance -- comparta el mismo estado real, ver
              helper/useAppColorMode.ts. AppReloadProvider por fuera de
              AuthProvider/TutorialProvider a propósito -- "recargar todos
              los datos" (Ajustes) solo debe remontar el NavigationContainer
              de abajo (AppNavigationContainer), nunca cerrar la sesión. */}
          <AppReloadProvider>
            <AppColorModeProvider>
              <AuthProvider>
                <TutorialProvider navigationRef={screenReviewNavigationRef}>
                  <AppNavigationContainer navigationRef={screenReviewNavigationRef} onReady={onLayoutRootView} />
                  <ScreenReviewFab navigationRef={screenReviewNavigationRef} />
                  <ScreenExplorerFab navigationRef={screenReviewNavigationRef} />
                  <WorkoutMinimizedBar navigationRef={screenReviewNavigationRef} />
                  <TutorialOverlay />
                </TutorialProvider>
              </AuthProvider>
            </AppColorModeProvider>
          </AppReloadProvider>
        </SafeAreaProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
