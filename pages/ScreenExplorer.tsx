import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface ScreenItem {
  name: string;
  route: string | null;
  category: string;
  file?: string;
  /** Pantalla superada por otra implementación real — candidata a borrar (no se borra sola, solo se marca aquí para decidir). */
  deletionCandidate?: string;
  /** Checklist de la migración StyleSheet → Gluestack UI/NativeWind (ver plan de migración). Default false: aún no migrada. */
  gluestackMigrated?: boolean;
}

const ALL_SCREENS: ScreenItem[] = [
  // === ORIGINAL INTEGRATED ===
  { name: 'Welcome Auth', route: 'WelcomeAuth', category: 'Original - Auth', file: 'WelcomeAuthScreen.tsx' },
  { name: 'Login', route: 'LoginAuth', category: 'Original - Auth', file: 'LoginScreen.tsx' },
  { name: 'Forgot Password Options', route: 'ForgotOptions', category: 'Original - Auth', file: 'ForgotPasswordOptionsScreen.tsx' },
  { name: 'Forgot Password Email', route: 'ForgotEmail', category: 'Original - Auth', file: 'ForgotPasswordEmailScreen.tsx' },
  { name: 'Password Reset Sent', route: 'ResetSent', category: 'Original - Auth', file: 'PasswordResetSentScreen.tsx' },
  {
    name: 'Profile Edit',
    route: 'ProfileEdit',
    category: 'Original - Auth',
    file: 'ProfileEditScreen.tsx',
    deletionCandidate:
      'Sin llamador real: su unico punto de entrada era pages/Home.tsx, que ya no se monta en ningun sitio (import muerto en App.tsx). Reemplazada por "Edit Profile" (MigratedEditProfile), enlazada desde el menu de Profile.',
  },
  {
    name: 'Change Password',
    route: 'ChangePassword',
    category: 'Original - Auth',
    file: 'ChangePasswordScreen.tsx',
    deletionCandidate:
      'Mismo caso que Profile Edit: solo se llegaba desde pages/Home.tsx (huerfano). Reemplazada por "Change Password" (MigratedChangePwd), enlazada desde el menu de Profile.',
  },

  // === ORIGINAL INTEGRADO PERO HUERFANO (pre-migracion, sin ningun camino de navegacion real) ===
  // pages/Home.tsx era el unico punto de entrada a todo este cluster y ya no
  // se renderiza en ningun sitio: en App.tsx se importa con React.lazy pero
  // nunca se usa como component={} (ver docs/TAREAS.md, "Limpieza tecnica").
  // La ruta 'Home' del stack apunta hoy a Homenavigator -> MigratedHomeModernV2,
  // no a este archivo. Solo alcanzables ya desde este Screen Explorer.
  {
    name: 'Workout List',
    route: 'WorkoutList',
    category: 'Huerfano - Workout (pre-migracion)',
    file: 'WorkoutList.tsx',
    deletionCandidate:
      'Huerfana: solo alcanzable desde pages/Home.tsx, que no se monta en ningun sitio. Reemplazada por "Mi Programa" (MigratedMyProgramCalendar) y "Workout History" (MigratedWorkoutHistory).',
  },
  {
    name: 'Workout Detail',
    route: 'WorkoutDetail',
    category: 'Huerfano - Workout (pre-migracion)',
    file: 'WorkoutDetail.tsx',
    deletionCandidate:
      'Huerfana, mismo cluster que Workout List (solo se llegaba desde ahi). Reemplazada por "Workout Detail (migrated)" (MigratedWorkoutDetail).',
  },
  {
    name: 'Workout Day Exercises',
    route: 'WorkoutDayExercises',
    category: 'Huerfano - Workout (pre-migracion)',
    file: 'WorkoutDayExercises.tsx',
    deletionCandidate:
      'Huerfana, mismo cluster que Workout List. El flujo real de sesion hoy pasa por "Workout Session (migrated)" (MigratedWorkoutSession).',
  },
  {
    name: 'Workout Session',
    route: 'WorkoutSession',
    category: 'Huerfano - Workout (pre-migracion)',
    file: 'WorkoutSessionScreen.tsx',
    deletionCandidate:
      'Huerfana: solo alcanzable via Workout Detail/Workout Day Exercises/Exercise Detail, todos igualmente huerfanos. Reemplazada por "Workout Session (migrated)" (MigratedWorkoutSession).',
  },
  {
    name: 'Exercise Detail',
    route: 'ExerciseDetail',
    category: 'Huerfano - Exercise (pre-migracion)',
    file: 'ExerciseDetail.tsx',
    deletionCandidate:
      'Sin llamador real en ningun flujo vivo. Reemplazada por "Exercise Info" (MigratedExerciseInfo).',
  },
  { name: 'Diet Dashboard', route: 'DietDashboard', category: 'Original - Diet', file: 'DietDashboard.tsx' },
  { name: 'Diet List', route: 'DietList', category: 'Original - Diet', file: 'DietList.tsx' },
  {
    name: 'Community Feed',
    route: 'CommunityFeed',
    category: 'Huerfano - Social (pre-migracion)',
    file: 'CommunityFeed.tsx',
    deletionCandidate:
      'Solo alcanzable desde pages/Home.tsx (huerfano). Reemplazada por "Community (migrated)" (MigratedCommunity).',
  },
  {
    name: 'Post Detail',
    route: 'PostDetail',
    category: 'Huerfano - Social (pre-migracion)',
    file: 'PostDetail.tsx',
    deletionCandidate:
      'Solo alcanzable desde Community Feed, que ya es huerfana. Reemplazada por "Post Details" (MigratedPostDetails).',
  },

  // === MIGRATED - ROOT ===
  { name: 'About App', route: 'MigratedAboutApp', category: 'Migrated - Info', file: 'about_app_screen.tsx', gluestackMigrated: true },
  { name: 'About Us', route: 'MigratedAboutUs', category: 'Migrated - Info', file: 'about_us_screen.tsx', gluestackMigrated: true },
  { name: 'Privacy Policy (mismo componente que "Privacy Policy (onboard)"; el boton del menu About aun no esta conectado, ver about_app_screen.tsx)', route: 'MigratedPrivacyPolicy', category: 'Migrated - Info', file: 'privacy_policy_screen.tsx', gluestackMigrated: true },
  { name: 'Terms & Conditions', route: 'MigratedTermsAndConditions', category: 'Migrated - Info', file: 'terms_and_conditions_screen.tsx', gluestackMigrated: true },
  { name: 'Activity Tracker', route: 'MigratedActivityTracker', category: 'Migrated - Health', file: 'activity_tracker_screen.tsx' },
  { name: 'Water Tracker', route: 'MigratedWaterTracker', category: 'Migrated - Health', file: 'water_tracker_screen.tsx' },
  {
    name: 'Home (tab raiz)',
    route: 'Home',
    category: 'Migrated - Dashboard',
    // Sin `file`: la ruta 'Home' del stack ya no renderiza pages/Home.tsx (import
    // muerto en App.tsx, ver docs/TAREAS.md). Hoy monta Homenavigator, cuyo unico
    // tab renderiza MigratedNavigator con initialRouteName 'MigratedHomeModernV2'
    // -- es decir, es un alias en vivo a Home Modern V2.
  },
  { name: 'Home Modern V2 (nueva cabecera)', route: 'MigratedHomeModernV2', category: 'Migrated - Dashboard', file: 'home_screen_modern_v2.tsx', gluestackMigrated: true },
  { name: 'Workout Detail (migrated)', route: 'MigratedWorkoutDetail', category: 'Migrated - Workout', file: 'workout_detail_screen.tsx', gluestackMigrated: true },
  { name: 'Workout History', route: 'MigratedWorkoutHistory', category: 'Migrated - Workout', file: 'workout_history_screen.tsx', gluestackMigrated: true },
  { name: 'Session History Detail', route: 'MigratedSessionHistoryDetail', category: 'Migrated - Workout', file: 'session_history_detail_screen.tsx', gluestackMigrated: true },
  { name: 'Workout Preview', route: 'MigratedWorkoutPreview', category: 'Migrated - Workout', file: 'workout_preview_screen.tsx', gluestackMigrated: true },
  { name: 'Workout Session (migrated)', route: 'MigratedWorkoutSession', category: 'Migrated - Workout', file: 'workout_session_screen.tsx', gluestackMigrated: true },
  { name: 'Workout Feedback', route: 'MigratedWorkoutFeedback', category: 'Migrated - Workout', file: 'workout_feedback_screen.tsx', gluestackMigrated: true },
  { name: 'Workout Summary (migrated)', route: 'MigratedWorkoutSummary', category: 'Migrated - Workout', file: 'workout_summary_screen.tsx', gluestackMigrated: true },
  { name: 'View Body Parts', route: 'MigratedViewBodyPart', category: 'Migrated - Exercise', file: 'view_body_part_screen.tsx', gluestackMigrated: true },
  { name: 'View Equipment', route: 'MigratedViewEquipment', category: 'Migrated - Exercise', file: 'view_equipment_screen.tsx', gluestackMigrated: true },
  { name: 'Search', route: 'MigratedSearch', category: 'Migrated - Exercise', file: 'search_screen.tsx', gluestackMigrated: true },
  { name: 'Diet Detail', route: 'MigratedDietDetail', category: 'Migrated - Diet', file: 'diet_detail_screen.tsx', gluestackMigrated: true },
  { name: 'Favourite Recipe', route: 'MigratedFavouriteRecipe', category: 'Migrated - Diet', file: 'favourite_recipe_screen.tsx', gluestackMigrated: true },
  { name: 'Plan Screen', route: 'MigratedPlan', category: 'Migrated - Diet', file: 'plan_screen.tsx', gluestackMigrated: true },
  { name: 'Recipe Main', route: 'MigratedRecipeMain', category: 'Migrated - Recipes', file: 'recipe_main_screen.tsx', gluestackMigrated: true },
  { name: 'Recipe List V2', route: 'MigratedRecipeListV2', category: 'Migrated - Recipes', file: 'recipe_list_screen_v2.tsx', gluestackMigrated: true },
  { name: 'Recipe Category List', route: 'MigratedRecipeCategoryList', category: 'Migrated - Recipes', file: 'recipe_category_list_screen.tsx', gluestackMigrated: true },
  { name: 'Recipe Tag List', route: 'MigratedRecipeTagList', category: 'Migrated - Recipes', file: 'recipe_tag_list_screen.tsx', gluestackMigrated: true },
  { name: 'Shopping List', route: 'MigratedShoppingList', category: 'Migrated - Shopping', file: 'shopping_list_screen.tsx', gluestackMigrated: true },
  { name: 'Shopping List Detail', route: 'MigratedShoppingListDetail', category: 'Migrated - Shopping', file: 'shopping_list_detail_screen.tsx', gluestackMigrated: true },
  { name: 'Add Shopping List', route: 'MigratedAddShoppingList', category: 'Migrated - Shopping', file: 'add_shopping_list_screen.tsx', gluestackMigrated: true },
  { name: 'Community (migrated)', route: 'MigratedCommunity', category: 'Migrated - Social', file: 'community_screen.tsx', gluestackMigrated: true },
  { name: 'Post Details', route: 'MigratedPostDetails', category: 'Migrated - Social', file: 'post_details_screen.tsx', gluestackMigrated: true },
  { name: 'Other User Profile', route: 'MigratedOtherUserProfile', category: 'Migrated - Social', file: 'other_user_profile_screen.tsx', gluestackMigrated: true },
  { name: 'Bookmark', route: 'MigratedBookmark', category: 'Migrated - Social', file: 'bookmark_screen.tsx', gluestackMigrated: true },
  { name: 'Add Post', route: 'MigratedAddPost', category: 'Migrated - Social', file: 'add_post_screen.tsx', gluestackMigrated: true },
  { name: 'Blog Screen', route: 'MigratedBlog', category: 'Migrated - Content', file: 'blog_screen.tsx', gluestackMigrated: true },
  { name: 'Blog Detail', route: 'MigratedBlogDetail', category: 'Migrated - Content', file: 'blog_detail_screen.tsx', gluestackMigrated: true },
  { name: 'View All Blog', route: 'MigratedViewAllBlog', category: 'Migrated - Content', file: 'view_all_blog_screen.tsx', gluestackMigrated: true },
  { name: 'Tips', route: 'MigratedTips', category: 'Migrated - Content', file: 'tips_screen.tsx', gluestackMigrated: true },
  { name: 'Video Screen', route: 'MigratedVideo', category: 'Migrated - Content', file: 'video_screen.tsx', gluestackMigrated: true },
  { name: 'Video Detail', route: 'MigratedVideoDetail', category: 'Migrated - Content', file: 'video_detail_screen.tsx', gluestackMigrated: true },
  { name: 'YouTube Player', route: 'MigratedYoutubePlayer', category: 'Migrated - Content', file: 'youtube_player_screen.tsx', gluestackMigrated: true },
  { name: 'Chewie Player', route: 'MigratedChewie', category: 'Migrated - Content', file: 'chewie_screen.tsx', gluestackMigrated: true },
  { name: 'Web View', route: 'MigratedWebView', category: 'Migrated - Content', file: 'web_view_screen.tsx', gluestackMigrated: true },
  { name: 'Favourite Screen', route: 'MigratedFavourite', category: 'Migrated - Misc', file: 'favourite_screen.tsx', gluestackMigrated: true },
  { name: 'Progress', route: 'MigratedProgress', category: 'Migrated - Progress', file: 'progress_screen.tsx', gluestackMigrated: true },
  { name: 'Profile (migrated)', route: 'MigratedProfile', category: 'Migrated - Profile', file: 'profile_screen.tsx', gluestackMigrated: true },
  { name: 'Edit Profile', route: 'MigratedEditProfile', category: 'Migrated - Profile', file: 'edit_profile_screen.tsx', gluestackMigrated: true },
  { name: 'Language', route: 'MigratedLanguage', category: 'Migrated - Profile', file: 'language_screen.tsx', gluestackMigrated: true },
  { name: 'Notification', route: 'MigratedNotification', category: 'Migrated - Profile', file: 'notification_screen.tsx', gluestackMigrated: true },
  { name: 'My Program Calendar', route: 'MigratedMyProgramCalendar', category: 'Migrated - Schedule', file: 'my_program_calendar_screen.tsx', gluestackMigrated: true },

  // === MIGRATED - AUTH ===
  { name: 'Change Pwd', route: 'MigratedChangePwd', category: 'Migrated - Auth', file: 'change_pwd_screen.tsx', gluestackMigrated: true },

  // === MIGRATED - HOME (Health Tracking) ===
  { name: 'Emparejando', route: 'MigratedEmparejando', category: 'Migrated - Home', file: 'emparejando_screen.tsx', gluestackMigrated: true },
  { name: 'Device Connected', route: 'MigratedDeviceConnected', category: 'Migrated - Home', file: 'device_connected_screen.tsx', gluestackMigrated: true },
  { name: 'Link Device Choice', route: 'MigratedLinkDeviceChoice', category: 'Migrated - Home', file: 'link_device_choice_screen.tsx', gluestackMigrated: true },
  { name: 'Link Device List', route: 'MigratedLinkDeviceList', category: 'Migrated - Home', file: 'link_device_list_screen.tsx', gluestackMigrated: true },

  // === MIGRATED - ONBOARDING ===
  { name: 'Assessment Result', route: 'MigratedAssessmentResult', category: 'Migrated - Onboarding', file: 'assessment_result_screen.tsx' },

  // === MIGRATED - AÑADIDAS (estaban registradas en App.tsx pero faltaban aquí) ===
  { name: 'Estadísticas', route: 'MigratedStatistics', category: 'Migrated - Estadísticas', file: 'statistics_screen.tsx', gluestackMigrated: true },
  { name: 'Balance muscular', route: 'MigratedStatisticsMuscles', category: 'Migrated - Estadísticas', file: 'statistics_muscle_distribution_screen.tsx', gluestackMigrated: true },
  { name: 'Mapa de calor corporal', route: 'MigratedStatisticsBody', category: 'Migrated - Estadísticas', file: 'statistics_body_distribution_screen.tsx', gluestackMigrated: true },
  { name: 'Series por grupo muscular', route: 'MigratedStatisticsSeriesCount', category: 'Migrated - Estadísticas', file: 'statistics_series_count_screen.tsx', gluestackMigrated: true },
  { name: 'Ejercicios más frecuentes', route: 'MigratedStatisticsTopExercises', category: 'Migrated - Estadísticas', file: 'statistics_top_exercises_screen.tsx', gluestackMigrated: true },
  { name: 'Mejores marcas', route: 'MigratedStatisticsPersonalRecords', category: 'Migrated - Estadísticas', file: 'statistics_personal_records_screen.tsx', gluestackMigrated: true },
  { name: 'Resumen mensual', route: 'MigratedStatisticsMonthlyReport', category: 'Migrated - Estadísticas', file: 'statistics_monthly_report_screen.tsx', gluestackMigrated: true },
  { name: 'Coming Soon (placeholder)', route: 'MigratedComingSoon', category: 'Migrated - Estadísticas', file: 'coming_soon_screen.tsx', gluestackMigrated: true },
  { name: 'Antropometría', route: 'MigratedBodyMetrics', category: 'Migrated - Estadísticas', file: 'body_metrics_screen.tsx', gluestackMigrated: true },
  { name: 'Progreso muscular', route: 'MigratedMuscleProgress', category: 'Migrated - Exercise', file: 'muscle_progress_screen.tsx', gluestackMigrated: true },
  { name: 'Exercise Info (implementacion unica; el antiguo alias root ExerciseInfo apuntaba al mismo archivo y se elimino de este listado)', route: 'MigratedExerciseInfo', category: 'Migrated - Exercise', file: 'exercise_info_screen.tsx', gluestackMigrated: true },
  { name: 'Workout Template List', route: 'MigratedWorkoutTemplateList', category: 'Migrated - Workout', file: 'workout_template_list_screen.tsx', gluestackMigrated: true },
  { name: 'Chatting', route: 'MigratedChatting', category: 'Migrated - Social', file: 'chatting_screen.tsx', gluestackMigrated: true },
  { name: 'Chatting Image', route: 'MigratedChattingImage', category: 'Migrated - Social', file: 'chatting_image_screen.tsx', gluestackMigrated: true },
  { name: 'Habits List', route: 'MigratedHabits', category: 'Migrated - Habits', file: 'habits_list_screen.tsx', gluestackMigrated: true },
  { name: 'Habit Detail', route: 'MigratedHabitDetail', category: 'Migrated - Habits', file: 'habit_detail_screen.tsx', gluestackMigrated: true },
  { name: 'Habit Add', route: 'MigratedHabitAdd', category: 'Migrated - Habits', file: 'habit_add_screen.tsx', gluestackMigrated: true },
  { name: 'Check-ins List', route: 'MigratedCheckIns', category: 'Migrated - Check-ins', file: 'checkins_list_screen.tsx', gluestackMigrated: true },
  { name: 'Check-in Fill', route: 'MigratedCheckInFill', category: 'Migrated - Check-ins', file: 'checkin_fill_screen.tsx', gluestackMigrated: true },
  { name: 'Resources List', route: 'MigratedResourcesList', category: 'Migrated - Resources', file: 'resources_list_screen.tsx', gluestackMigrated: true },
  { name: 'Resource Detail', route: 'MigratedResourceDetail', category: 'Migrated - Resources', file: 'resource_detail_screen.tsx', gluestackMigrated: true },
  { name: 'Assigned Meals', route: 'MigratedAssignedMeals', category: 'Migrated - Diet', file: 'assigned_meals_screen.tsx', gluestackMigrated: true },
];

export default function ScreenExplorer({ navigation }: any) {
  const [search, setSearch] = useState('');

  const sections = useMemo(() => {
    const filtered = search.trim()
      ? ALL_SCREENS.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.category.toLowerCase().includes(search.toLowerCase()) ||
            (s.file ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : ALL_SCREENS;

    const grouped: Record<string, ScreenItem[]> = {};
    filtered.forEach((screen) => {
      if (!grouped[screen.category]) grouped[screen.category] = [];
      grouped[screen.category].push(screen);
    });

    const categorySections = Object.keys(grouped)
      .sort()
      .map((category) => ({
        title: category,
        data: grouped[category],
        count: grouped[category].length,
      }));

    // Se muestran también dentro de su categoría normal (esto solo las
    // marca para decidir, no las mueve ni las oculta) — igual que
    // docs/DEAD_SCREENS.md, no se borra nada automáticamente aquí.
    const candidates = filtered.filter((s) => s.deletionCandidate);
    if (candidates.length > 0) {
      categorySections.unshift({
        title: '⚠️ Candidatas a eliminar',
        data: candidates,
        count: candidates.length,
      });
    }

    return categorySections;
  }, [search]);

  const totalCount = ALL_SCREENS.length;
  const navigableCount = ALL_SCREENS.filter((s) => s.route).length;
  const gluestackMigratedCount = ALL_SCREENS.filter((s) => s.gluestackMigrated).length;

  const handleScreenPress = useCallback(
    (route: string | null) => {
      if (!route) return;
      if (route.startsWith('Migrated')) {
        navigation.navigate('Migrated', { screen: route });
      } else {
        navigation.navigate(route);
      }
    },
    [navigation]
  );

  const renderScreenItem = useCallback(
    ({ item }: { item: ScreenItem }) => (
      <Pressable
        style={({ pressed }) => [styles.screenItem, pressed && { opacity: 0.2 }]}
        onPress={() => handleScreenPress(item.route)}
        disabled={!item.route}
      >
        <View style={styles.screenInfo}>
          <View style={[styles.statusDot, item.route ? styles.statusDotGreen : styles.statusDotGray]} />
          <View style={styles.screenNameCol}>
            <Text style={styles.screenName} numberOfLines={1}>
              {item.gluestackMigrated ? '🟢 ' : ''}
              {item.name}
              {item.file ? <Text style={styles.screenFile}> ({item.file})</Text> : null}
            </Text>
            {item.deletionCandidate ? (
              <Text style={styles.deletionReason} numberOfLines={3}>
                {item.deletionCandidate}
              </Text>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8A8CB2" />
      </Pressable>
    ),
    [handleScreenPress]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.2 }]}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Screen Explorer</Text>
          <Text style={styles.subtitle}>
            {navigableCount}/{totalCount} screens · {gluestackMigratedCount} en Gluestack
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#8A8CB2" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search screens..."
          placeholderTextColor="#8A8CB2"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={({ pressed }) => pressed && { opacity: 0.2 }}>
            <Ionicons name="close-circle" size={18} color="#8A8CB2" />
          </Pressable>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.name + index}
        stickySectionHeadersEnabled={true}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.count}</Text>
          </View>
        )}
        renderItem={renderScreenItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1735' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1 },
  title: { fontSize: 22, color: '#fff', fontFamily: 'Gilroy-Bold' },
  subtitle: { fontSize: 13, color: '#8A8CB2', fontFamily: 'Gilroy-Regular', marginTop: 2 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1C3A',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, fontFamily: 'Gilroy-Regular' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#141227', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2A2844',
  },
  sectionTitle: { fontSize: 13, color: '#7773FA', fontFamily: 'Gilroy-Bold', textTransform: 'uppercase', letterSpacing: 1 },
  sectionCount: { fontSize: 12, color: '#8A8CB2', fontFamily: 'Gilroy-Regular' },
  listContent: { paddingBottom: 40 },
  screenItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2A2844',
  },
  screenInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  screenNameCol: { flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  statusDotGreen: { backgroundColor: '#34D399' },
  statusDotGray: { backgroundColor: '#4A4868' },
  screenName: { fontSize: 14, color: '#fff', fontFamily: 'Gilroy-Regular', flex: 1 },
  screenFile: { fontSize: 12, color: '#8A8CB2', fontFamily: 'Gilroy-Regular' },
  deletionReason: { fontSize: 11, color: '#E17568', fontFamily: 'Gilroy-Regular', marginTop: 3 },
});
