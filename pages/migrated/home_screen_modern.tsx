import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet, ScrollView, RefreshControl, Dimensions, useWindowDimensions, Modal, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { Image as ExpoImage } from 'expo-image';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Pressable } from '@components/ui/pressable';
import { Icon } from '@components/ui/icon';
import { Spinner } from '@components/ui/spinner';
import { Card } from '@components/ui/card';
import { HStack } from '@components/ui/hstack';
import { VStack } from '@components/ui/vstack';
import { Divider } from '@components/ui/divider';
import AppIcon from '@components/AppIcon';
import AnimatedRing from '@components/AnimatedRing';
import { AvatarMem } from '@components/Avatar';
import { FONT } from './theme';
import { useAppColorMode } from '@helper/useAppColorMode';
import { dashboardApi } from '../../api/dashboard';
import { workoutHistoryApi } from '../../api/workoutHistory';
import { dietApi } from '../../api/diet';
import { blogApi } from '../../api/blog';
import { workoutTemplateApi, WorkoutTemplateListItem } from '../../api/workoutTemplate';
import { resourcesApi, ResourceListItem } from '../../api/resources';
import { checkinsApi, checkinTypeLabel, CheckInAssignment } from '../../api/checkins';
import { habitsApi, Habit } from '../../api/habits';
import { healthApi, HealthReading, HealthDataSource } from '../../api/health';
import { isHealthAvailable, getHealthSnapshot } from '../../helper/health';
import { habitIoniconFor } from '../../constants/habitIcons';
import WeekComplianceRow from '@components/WeekComplianceRow';
import { computeWeekCompliance } from '@components/weekCompliance';
import { useAuth } from '../../store/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIGMA_W = 375;
const FIGMA_H = 812;

interface HomeScreenModernProps {
  navigation?: any;
  route?: any;
}

export default function HomeScreenModern(props: HomeScreenModernProps) {
  const { navigation } = props;
  const { state, logout } = useAuth();
  const user = state.user;
  const { colors: C } = useAppColorMode();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const firstLoadDone = useRef(false);
  const { width: winW, height: winH } = useWindowDimensions();
  const sc = useMemo(() => Math.min(winW / FIGMA_W, winH / FIGMA_H), [winW, winH]);
  const r = useCallback((n: number) => Math.round(n * sc), [sc]);

  const [showMenu, setShowMenu] = useState(false);
  const [appleHealthOn, setAppleHealthOn] = useState(true);
  const [smartWatchOn, setSmartWatchOn] = useState(false);

  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<boolean[]>([]);
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [workoutTemplateList, setWorkoutTemplateList] = useState<WorkoutTemplateListItem[]>([]);
  const [resourcesList, setResourcesList] = useState<ResourceListItem[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<CheckInAssignment[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    darkHeader: { backgroundColor: C.gray80, borderBottomLeftRadius: r(32), borderBottomRightRadius: r(32), paddingBottom: r(20) },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: r(20), paddingTop: r(16) },
    headerTitle: { flex: 1, fontSize: r(16), fontFamily: FONT.bold, color: C.white, textAlign: 'center' as const },
    notifBtn: { width: r(40), height: r(40), borderRadius: r(20), backgroundColor: C.brand5, alignItems: 'center' as const, justifyContent: 'center' as const },
    notifBadge: { position: 'absolute', top: r(6), right: r(6), width: r(16), height: r(16), borderRadius: r(8), backgroundColor: C.destructive, alignItems: 'center' as const, justifyContent: 'center' as const },
    notifBadgeText: { fontSize: r(8), fontFamily: FONT.bold, color: '#FFFFFF' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: r(20), marginTop: 16 },
    scoreTitle: { fontSize: r(16), fontFamily: FONT.bold, color: C.white },
    scoreSub: { fontSize: r(13), color: C.white, marginTop: r(4) },
    sectionTitle: { fontSize: r(17), fontFamily: FONT.bold, color: C.white },
    seeAll: { fontSize: r(13), fontFamily: FONT.semiBold, color: C.orange },
    todayWorkoutTitle: { fontSize: r(15), fontFamily: FONT.bold, color: C.white },
    todayWorkoutSub: { fontSize: r(12), color: C.textSecondary, marginTop: r(2) },
    noWorkoutText: { fontSize: r(13), color: C.textSecondary },
    activityWeekTitle: { fontSize: r(14), fontFamily: FONT.semiBold, color: C.white },
    activityWeekCount: { fontSize: r(12), color: C.textSecondary },
    nutritionCalCenter: { alignItems: 'center' as const },
    // Antes fontSize r(20) dentro de un ring de r(96) — con valores de 4
    // cifras (ej. 2734 kcal) el número se salía del círculo tanto en iOS
    // como Android. Se agranda el ring y se reduce la fuente base (con
    // adjustsFontSizeToFit + minimumFontScale como red de seguridad extra
    // para 5 cifras) para que quepa con margen incluso en pantallas pequeñas.
    nutritionCalValue: { fontSize: r(16), fontFamily: FONT.extraBold, color: C.white },
    nutritionCalLabel: { fontSize: r(10), color: C.textSecondary },
    nutritionSide: { alignItems: 'center' as const },
    nutritionSideLabel: { fontSize: r(10), color: C.textSecondary },
    nutritionSideValue: { fontSize: r(14), fontFamily: FONT.bold, color: C.white, marginTop: r(2) },
    nutritionMsg: { fontSize: r(12), color: C.textSecondary, textAlign: 'center' as const, marginTop: r(8), marginBottom: r(8) },
    nutritionLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: r(8) },
    nutritionLinkText: { fontSize: r(13), fontFamily: FONT.semiBold, color: C.orange },
    macroBar: { flex: 1, alignItems: 'center' as const },
    macroTrack: { height: r(6), borderRadius: r(4), backgroundColor: C.gray70, width: '100%', overflow: 'hidden' },
    macroFill: { height: r(6), borderRadius: r(4) },
    macroLabel: { fontSize: r(10), color: C.textSecondary, marginTop: r(6) },
    macroValue: { fontSize: r(11), fontFamily: FONT.semiBold, color: C.white, marginTop: r(2) },
    blogCard: { width: r(220), marginRight: r(14), backgroundColor: C.surfaceLight, borderRadius: r(16), borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    blogImage: { height: r(100), backgroundColor: C.gray70, width: '100%' },
    blogContent: { padding: r(12) },
    blogTag: { backgroundColor: 'rgba(255,107,53,0.15)', borderRadius: r(8), paddingHorizontal: r(8), paddingVertical: r(2), alignSelf: 'flex-start' as const },
    blogTagText: { fontSize: r(9), fontFamily: FONT.semiBold, color: C.orange },
    blogTitle: { fontSize: r(13), fontFamily: FONT.semiBold, color: C.white, marginTop: r(6) },
    blogDate: { fontSize: r(10), color: C.textSecondary, marginTop: r(4) },
    seeAllImage: { backgroundColor: C.orange, alignItems: 'center' as const, justifyContent: 'center' as const },
    lockBadge: { position: 'absolute' as const, top: r(8), right: r(8), flexDirection: 'row' as const, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: r(10), paddingHorizontal: r(7), paddingVertical: r(3), gap: r(4) },
    lockBadgeText: { fontSize: r(9), color: '#FFFFFF', fontFamily: FONT.semiBold },
    supportTitle: { flex: 1, fontSize: r(14), fontFamily: FONT.bold, color: C.white },
    supportLink: { fontSize: r(12), fontFamily: FONT.semiBold, color: C.orange, marginTop: r(6) },
    emptySection: { paddingHorizontal: r(20), paddingVertical: r(12), marginBottom: r(8) },
    myProgramBadgeText: { fontSize: r(11), fontFamily: FONT.semiBold, color: C.textPrimary },
    seeAllTasksBtnText: { fontSize: r(13), fontFamily: FONT.semiBold, color: C.orange },
    emptyText: { fontSize: r(13), color: C.textSecondary, textAlign: 'center' as const },
    errorBanner: { backgroundColor: C.destructive10, borderRadius: r(12), padding: r(12), marginHorizontal: r(20), marginBottom: r(12), flexDirection: 'row', alignItems: 'center' },
    errorText: { flex: 1, fontSize: r(12), color: C.destructive, marginLeft: r(8) },
    loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
    menuSheet: { backgroundColor: C.surface, borderTopLeftRadius: r(24), borderTopRightRadius: r(24), paddingBottom: r(24), maxHeight: '85%' as const },
    menuHandle: { width: r(40), height: r(4), borderRadius: r(2), backgroundColor: C.border, alignSelf: 'center' as const, marginTop: r(10), marginBottom: r(4) },
    menuGreeting: { fontSize: r(12), color: C.textSecondary },
    menuUserName: { fontSize: r(17), fontFamily: FONT.bold, color: C.white, marginTop: r(2) },
    menuCloseBtn: { width: r(32), height: r(32), borderRadius: r(16), backgroundColor: C.surfaceLight, alignItems: 'center' as const, justifyContent: 'center' as const },
    menuItemText: { flex: 1, fontSize: r(15), fontFamily: FONT.semiBold, color: C.white },
    menuItemTextDanger: { color: C.destructive },
  }), [sc, r, C]);

  const fetchData = useCallback(async (mode?: 'initial' | 'silent') => {
    if (mode !== 'silent') {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [dashRes, calendarRes, dietRes, blogRes, workoutTemplatesRes, resourcesRes, checkinsRes, habitsRes] = await Promise.allSettled([
        dashboardApi.getDashboard(),
        workoutHistoryApi.getMyCalendar(currentMonth, currentYear),
        dietApi.getDailyPlan(todayStr),
        blogApi.getList(1, { per_page: 3, order_by: 'created_at', order_dir: 'desc' }),
        workoutTemplateApi.getList(1, 3),
        resourcesApi.getList({ per_page: 3 }),
        checkinsApi.getAssignedList(),
        habitsApi.getMyList(7),
      ]);

      const errors: string[] = [];

      if (dashRes.status === 'fulfilled') {
        const d: any = dashRes.value.data.data;
        setNotificationCount(d?.notification_data?.unread_total_count ?? 0);
      } else {
        errors.push('dashboard');
      }

      if (calendarRes.status === 'fulfilled') {
        const calData: any = calendarRes.value.data.data;
        const days = calData?.days ?? [];
        const daysByDate = new Map<string, any>(days.map((day: any) => [day.date, day]));
        const today = daysByDate.get(todayStr);
        setTodayWorkouts(today?.workouts ?? []);

        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOffset);
        const weekBools: boolean[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const dayData: any = daysByDate.get(dateStr);
          weekBools.push(!!(dayData?.workouts && dayData.workouts.length > 0));
        }
        setWeeklyWorkouts(weekBools);
      } else {
        errors.push('calendario');
      }

      if (dietRes.status === 'fulfilled') {
        setDailyPlan(dietRes.value.data.data ?? null);
      }

      if (blogRes.status === 'fulfilled') {
        setBlogPosts((blogRes.value.data.data ?? []).slice(0, 3));
      }

      if (workoutTemplatesRes.status === 'fulfilled') {
        setWorkoutTemplateList((workoutTemplatesRes.value.data.data ?? []).slice(0, 3));
      }

      if (resourcesRes.status === 'fulfilled') {
        setResourcesList((resourcesRes.value.data.data ?? []).slice(0, 3));
      }

      if (checkinsRes.status === 'fulfilled') {
        setPendingCheckins((checkinsRes.value.data.data ?? []).filter((a) => a.is_due));
      }

      if (habitsRes.status === 'fulfilled') {
        setHabits(habitsRes.value.data.data ?? []);
      }

      if (errors.length > 0) {
        setErrorMessage(`No se pudo cargar: ${errors.join(', ')}. Desliza para reintentar.`);
      }
    } catch (e: any) {
      setErrorMessage('Error al cargar los datos. Desliza para reintentar.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData(firstLoadDone.current ? 'silent' : 'initial');
      firstLoadDone.current = true;
    }, [fetchData])
  );

  // Motor de Auto-Regulación de Carga — Fase 4, readiness score (2026-08-12).
  // Sync de salud SOLO en primer plano, al montar Home, máximo 1 vez/día
  // (gate por AsyncStorage) — deliberadamente sin expo-background-fetch/
  // expo-task-manager, para no introducir una dependencia nativa nueva ni
  // un rebuild. Corre una sola vez por sesión de la app (useEffect de
  // montaje, no useFocusEffect — evita repetir en cada vuelta a Home).
  useEffect(() => {
    const LAST_SYNC_KEY = 'health_last_sync_date';

    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
        if (lastSync === today) return;

        const available = await isHealthAvailable();
        if (!available) return;

        const snapshot = await getHealthSnapshot();
        const source: HealthDataSource = Platform.OS === 'ios' ? 'apple_health' : 'google_health';
        const readings: HealthReading[] = [];

        if (snapshot.hrv != null) readings.push({ source, metric_type: 'hrv', value: snapshot.hrv, recorded_date: today });
        if (snapshot.restingHeartRateBpm != null) readings.push({ source, metric_type: 'resting_hr', value: snapshot.restingHeartRateBpm, recorded_date: today });
        if (snapshot.sleepMinutes != null) readings.push({ source, metric_type: 'sleep_hours', value: Math.round((snapshot.sleepMinutes / 60) * 100) / 100, recorded_date: today });
        if (snapshot.steps != null) readings.push({ source, metric_type: 'steps', value: snapshot.steps, recorded_date: today });

        if (readings.length > 0) {
          await healthApi.sync(readings);
        }
        await AsyncStorage.setItem(LAST_SYNC_KEY, today);
      } catch {
        // Silencioso a propósito: el sync de salud nunca debe romper Home
        // ni mostrar un error al cliente — es una mejora en segundo plano,
        // no una acción que el cliente haya pedido.
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Box style={styles.loader}>
          <Spinner size="large" color={C.orange} />
        </Box>
      </SafeAreaView>
    );
  }

  const displayName = user?.first_name || user?.display_name || 'Usuario';

  const handleLogout = () => {
    setShowMenu(false);
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const navigateFromMenu = (routeName: string) => {
    setShowMenu(false);
    navigation?.navigate(routeName);
  };

  // "Mi plan de hoy" — fusiona check-ins/formularios pendientes (obligaciones
  // con fecha, is_due calculado por el backend) con los workouts de hoy en UN
  // solo bloque, en vez de dos secciones separadas como antes. Máximo 3 items
  // visibles; si hay más, un botón "Ver todas las tareas" lleva al calendario
  // completo (MyProgramCalendarScreen ya abre por defecto en el día de hoy,
  // no hace falta pasar ningún parámetro de fecha).
  type TodayItem =
    | { kind: 'checkin'; key: string; data: CheckInAssignment }
    | { kind: 'workout'; key: string; data: any };
  const todayItems: TodayItem[] = [
    ...pendingCheckins.map((a): TodayItem => ({ kind: 'checkin', key: `checkin-${a.id}`, data: a })),
    ...todayWorkouts.map((w: any, i: number): TodayItem => ({ kind: 'workout', key: `workout-${w.assignment_id}-${i}`, data: w })),
  ];
  const visibleTodayItems = todayItems.slice(0, 3);

  const renderTodayItem = (item: TodayItem, i: number) => {
    const rowStyle = i > 0 ? { marginTop: r(12), paddingTop: r(12), borderTopWidth: 1, borderTopColor: C.border } : {};
    if (item.kind === 'checkin') {
      const a = item.data;
      return (
        <Pressable
          key={item.key}
          style={rowStyle}
          onPress={() => navigation?.navigate('MigratedCheckInFill', { formAssignmentId: a.id, formId: a.form_id, title: a.form.title })}
        >
          <HStack space="md" className="items-center" style={{ marginBottom: r(12) }}>
            <AppIcon name="clipboard-outline" size={20} color={C.warning60} bg={C.warning10} containerSize={r(44)} borderRadius={r(12)} />
            <VStack className="flex-1">
              <Text style={styles.todayWorkoutTitle}>{a.form.title}</Text>
              <Text style={styles.todayWorkoutSub}>{checkinTypeLabel(a)}</Text>
            </VStack>
            <Icon name="chevron-forward" size={20} color={C.textSecondary} />
          </HStack>
        </Pressable>
      );
    }
    const w = item.data;
    return (
      <Pressable
        key={item.key}
        style={rowStyle}
        onPress={() => navigation?.navigate('MigratedWorkoutPreview', { programDayAssignmentId: w.assignment_id, mTitle: w.title || 'Entrenamiento' })}
      >
        <HStack space="md" className="items-center" style={{ marginBottom: r(12) }}>
          <AppIcon name="barbell" size={22} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={r(44)} borderRadius={r(12)} />
          <VStack className="flex-1">
            <Text style={styles.todayWorkoutTitle}>{w.title || 'Entrenamiento'}</Text>
            <Text style={styles.todayWorkoutSub}>Toca para ver detalles</Text>
          </VStack>
          <Icon name="chevron-forward" size={20} color={C.textSecondary} />
        </HStack>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchData('silent');
            }}
            tintColor={C.orange}
          />
        }
      >
        {/* Header */}
        <Box style={styles.darkHeader}>
          <HStack style={styles.headerTop}>
            <Pressable onPress={() => setShowMenu(true)}>
              <AvatarMem uri={user?.profile_image} name={displayName} size={40} />
            </Pressable>
            <Text style={styles.headerTitle}>Hola, {displayName}!</Text>
            <Pressable style={styles.notifBtn} onPress={() => navigation?.navigate('MigratedNotification')}>
              <Icon name="notifications-outline" size={22} color={C.white} />
              {notificationCount > 0 && (
                <Box style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                </Box>
              )}
            </Pressable>
          </HStack>

          {/* Sandow Score → Solo acceso rápido a Progreso (sin número hardcodeado) */}
          <Pressable style={styles.scoreRow} onPress={() => navigation?.navigate('MigratedProgress')}>
            <AppIcon name="trending-up" size={28} color="#FFFFFF" bg={C.orange} containerSize={r(64)} borderRadius={r(20)} style={{ marginRight: r(14) }} />
            <VStack className="flex-1">
              <Text style={styles.scoreTitle}>Mi Progreso</Text>
              <HStack className="items-center" style={{ marginTop: 4 }}>
                <Icon name="heart" size={14} color={C.white} />
                <Text style={styles.scoreSub}>Ver reporte completo</Text>
              </HStack>
            </VStack>
            <Icon name="chevron-forward" size={24} color={C.white} />
          </Pressable>
        </Box>

        {errorMessage && (
          <HStack style={styles.errorBanner}>
            <Icon name="warning" size={16} color={C.destructive} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={() => fetchData()}>
              <Icon name="refresh" size={16} color={C.destructive} />
            </Pressable>
          </HStack>
        )}

        {/* Mi plan de hoy — para un cliente 1:1 esta ES su sección personalizada
            (viene del calendario que le asigna su coach, ProgramDayAssignment),
            así que se relabela y se destaca en vez de dejarla igual que
            cualquier otra sección genérica. Fusiona workouts de hoy CON
            check-ins/formularios pendientes (obligaciones con fecha, is_due
            calculado por el backend) en un solo bloque — antes eran dos
            secciones separadas. Máximo 3 items visibles; con más, un botón
            lleva al calendario completo (que ya abre en el día de hoy por
            defecto, sin necesidad de parámetros). */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>
            {state.user?.is_personal_client ? 'Mi plan de hoy' : 'Actividad de Hoy'}
          </Text>
          <Pressable onPress={() => navigation?.navigate('MigratedMyProgramCalendar')}>
            <Text style={styles.seeAll}>Ver Calendario</Text>
          </Pressable>
        </HStack>
        {state.user?.is_personal_client && (
          <HStack className="items-center" style={{ gap: r(5), paddingHorizontal: r(20), marginBottom: r(8) }}>
            <Icon name="person-circle" size={14} color={C.textPrimary} />
            <Text style={styles.myProgramBadgeText}>Personalizado por tu coach</Text>
          </HStack>
        )}
        {todayItems.length > 0 ? (
          <>
            <Card variant="outline" className="mx-5 p-4" style={{ marginBottom: r(12) }}>
              {visibleTodayItems.map((item, i) => renderTodayItem(item, i))}
            </Card>
            {todayItems.length > 3 && (
              <Pressable onPress={() => navigation?.navigate('MigratedMyProgramCalendar')}>
                <HStack
                  className="items-center justify-center"
                  style={{ marginHorizontal: r(20), marginTop: r(-2), marginBottom: r(12), paddingVertical: r(6), gap: r(6) }}
                >
                  <Text style={styles.seeAllTasksBtnText}>Ver todas las tareas ({todayItems.length})</Text>
                  <Icon name="arrow-forward" size={14} color={C.orange} />
                </HStack>
              </Pressable>
            )}
          </>
        ) : (
          <Card variant="outline" className="mx-5 p-4 items-center" style={{ marginBottom: r(12) }}>
            <AppIcon name="bed-outline" size={26} color={C.textSecondary} bg={C.brand10} containerSize={r(48)} />
            <Text style={[styles.noWorkoutText, { marginTop: r(8) }]}>Día de descanso</Text>
            <Text style={[styles.noWorkoutText, { fontSize: r(11) }]}>No hay entrenamientos programados para hoy</Text>
          </Card>
        )}

        {/* Actividad semanal */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Cumplimiento semanal</Text>
        </HStack>
        <Card variant="outline" className="mx-5 p-4" style={{ marginBottom: r(12) }}>
          <HStack className="justify-between items-center" style={{ marginBottom: r(12) }}>
            <Text style={styles.activityWeekTitle}>Esta semana</Text>
            <Text style={styles.activityWeekCount}>
              {weeklyWorkouts.filter(Boolean).length} de {Math.max(weeklyWorkouts.length, 7)} días
            </Text>
          </HStack>
          <WeekComplianceRow completedDays={weeklyWorkouts} color={C.orange} size={r(28)} />
        </Card>

        {/* Hábitos — a diferencia de Check-ins (que se oculta si no hay nada
            pendiente porque el cliente no puede crear uno por su cuenta),
            esta sección SIEMPRE se muestra: con 0 hábitos, "Ver todos"/tocar
            la tarjeta es el único camino real para llegar a Añadir hábito
            (biblioteca o personal) — ocultarla dejaría al cliente sin forma
            de empezar. Mismo patrón que Recursos (visible con estado vacío). */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Hábitos</Text>
          <Pressable onPress={() => navigation?.navigate(habits.length > 0 ? 'MigratedHabits' : 'MigratedHabitAdd')}>
            <Text style={styles.seeAll}>{habits.length > 0 ? `Ver todos (${habits.length})` : 'Añadir'}</Text>
          </Pressable>
        </HStack>
        {habits.length > 0 ? (
          <Card variant="outline" className="mx-5 p-4" style={{ marginBottom: r(12) }}>
            {habits.slice(0, 3).map((h, i) => (
              <Pressable
                key={h.id}
                style={i > 0 ? { marginTop: r(12), paddingTop: r(12), borderTopWidth: 1, borderTopColor: C.border } : {}}
                onPress={() => navigation?.navigate('MigratedHabitDetail', { habitId: h.id })}
              >
                {/* marginLeft explícito además del gap del HStack — el
                    icono y el título quedaban muy pegados sin margen visible. */}
                <HStack space="md" className="items-center" style={{ marginBottom: r(12) }}>
                  <AppIcon name={habitIoniconFor(h.icon)} size={20} color={C.textPrimary} bg={C.bg} containerSize={r(44)} borderRadius={r(12)} />
                  <VStack className="flex-1" style={{ marginLeft: r(10) }}>
                    <Text style={styles.todayWorkoutTitle}>{h.title}</Text>
                    <Text style={styles.todayWorkoutSub}>{h.current_streak ? `🔥 ${h.current_streak} días de racha` : 'Sin racha activa todavía'}</Text>
                  </VStack>
                  <Icon name="chevron-forward" size={20} color={C.textSecondary} />
                </HStack>
                <WeekComplianceRow completedDays={computeWeekCompliance(h.logs)} color={C.orange} size={r(24)} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Pressable onPress={() => navigation?.navigate('MigratedHabitAdd')}>
            <Card variant="outline" className="mx-5 p-4" style={{ marginBottom: r(12) }}>
              <HStack space="md" className="items-center">
                <AppIcon name="flame-outline" size={20} color={C.textPrimary} bg={C.bg} containerSize={r(44)} borderRadius={r(12)} />
                <VStack className="flex-1">
                  <Text style={styles.todayWorkoutTitle}>Todavía no tienes hábitos</Text>
                  <Text style={styles.todayWorkoutSub}>Elige uno de la biblioteca o crea el tuyo propio</Text>
                </VStack>
                <Icon name="chevron-forward" size={20} color={C.textSecondary} />
              </HStack>
            </Card>
          </Pressable>
        )}

        {/* Nutrición — subida junto a las secciones de uso diario (antes vivía
            enterrada después de los catálogos y Programas). */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Nutrición</Text>
          <Pressable onPress={() => navigation?.navigate('DietDashboard')}>
            <Text style={styles.seeAll}>Ver dieta</Text>
          </Pressable>
        </HStack>
        <Card variant="outline" className="mx-5 p-4" style={{ marginBottom: r(12) }}>
          {dailyPlan ? (
            <>
              <HStack className="justify-between items-center" style={{ marginBottom: r(12) }}>
                <Box style={styles.nutritionSide}>
                  <Text style={styles.nutritionSideLabel}>Objetivo</Text>
                  <Text style={styles.nutritionSideValue}>{dailyPlan.daily_kcal ?? 0}</Text>
                </Box>
                <Box style={styles.nutritionCalCenter}>
                  <AnimatedRing
                    size={r(112)}
                    strokeWidth={r(8)}
                    percent={Math.min(((dailyPlan.eaten ?? 0) / Math.max(dailyPlan.daily_kcal ?? 1, 1)) * 100, 100)}
                    color={C.orange}
                    trackColor={C.gray70}
                    duration={900}
                  >
                    <Text style={styles.nutritionCalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{dailyPlan.eaten ?? 0}</Text>
                    <Text style={styles.nutritionCalLabel}>consumido</Text>
                  </AnimatedRing>
                </Box>
                <Box style={styles.nutritionSide}>
                  <Text style={styles.nutritionSideLabel}>Restante</Text>
                  <Text style={styles.nutritionSideValue}>{dailyPlan.left_eat ?? 0}</Text>
                </Box>
              </HStack>
              <Box style={{ flexDirection: 'row', marginTop: r(12) }}>
                <Box style={styles.macroBar}>
                  <Box style={styles.macroTrack}>
                    <Box style={[styles.macroFill, { width: `${Math.min(((dailyPlan.protein ?? 0) / Math.max((dailyPlan.daily_kcal ?? 1) / 4, 1)) * 100, 100)}%`, backgroundColor: C.orange }]} />
                  </Box>
                  <Text style={styles.macroLabel}>Proteína</Text>
                  <Text style={styles.macroValue}>{dailyPlan.protein ?? 0}g</Text>
                </Box>
                <Box style={[styles.macroBar, { marginHorizontal: r(12) }]}>
                  <Box style={styles.macroTrack}>
                    <Box style={[styles.macroFill, { width: `${Math.min(((dailyPlan.fats ?? 0) / Math.max((dailyPlan.daily_kcal ?? 1) / 9, 1)) * 100, 100)}%`, backgroundColor: C.purple }]} />
                  </Box>
                  <Text style={styles.macroLabel}>Grasas</Text>
                  <Text style={styles.macroValue}>{dailyPlan.fats ?? 0}g</Text>
                </Box>
                <Box style={styles.macroBar}>
                  <Box style={styles.macroTrack}>
                    <Box style={[styles.macroFill, { width: `${Math.min(((dailyPlan.carbs ?? 0) / Math.max((dailyPlan.daily_kcal ?? 1) / 4, 1)) * 100, 100)}%`, backgroundColor: C.blue }]} />
                  </Box>
                  <Text style={styles.macroLabel}>Carbos</Text>
                  <Text style={styles.macroValue}>{dailyPlan.carbs ?? 0}g</Text>
                </Box>
              </Box>
              <Text style={styles.nutritionMsg}>
                {(dailyPlan.left_eat ?? 0) > 0
                  ? `Te quedan ${dailyPlan.left_eat} kcal por consumir. ¡Sigue así!`
                  : '¡Meta de calorías alcanzada hoy!'}
              </Text>
            </>
          ) : (
            <Box style={{ alignItems: 'center', paddingVertical: r(12) }}>
              <AppIcon name="nutrition-outline" size={26} color={C.success} bg={C.success10} containerSize={r(48)} />
              <Text style={[styles.nutritionMsg, { marginTop: r(8) }]}>Sin plan de alimentación hoy</Text>
            </Box>
          )}
          <Pressable style={styles.nutritionLink} onPress={() => navigation?.navigate('MigratedPlan')}>
            <Text style={styles.nutritionLinkText}>Añadir comidas</Text>
            <Icon name="arrow-forward" size={14} color={C.orange} style={{ marginLeft: r(8) }} />
          </Pressable>
        </Card>

        {/* Explorar — accesos directos portados desde pages/Today.tsx (pantalla
            huérfana, retirada). MigratedRecipeMain es hoy el único punto de
            entrada real al catálogo libre de Recipe (Main/ListV2/CategoryList/
            TagList) — sin esta tarjeta ese catálogo queda inalcanzable. */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Explorar</Text>
        </HStack>
        <Card variant="outline" className="mx-5 p-4" style={{ marginBottom: r(12) }}>
          <Pressable onPress={() => navigation?.navigate('MigratedRecipeMain')}>
            <HStack space="md" className="items-center">
              <AppIcon name="restaurant-outline" size={20} color={C.success} bg={C.success10} containerSize={r(44)} borderRadius={r(12)} />
              <VStack className="flex-1">
                <Text style={styles.todayWorkoutTitle}>Recetas y Nutrición</Text>
                <Text style={styles.todayWorkoutSub}>Explora recetas y tu plan de comidas</Text>
              </VStack>
              <Icon name="chevron-forward" size={20} color={C.textSecondary} />
            </HStack>
          </Pressable>
          <Divider style={{ marginVertical: r(12) }} />
          <Pressable onPress={() => navigation?.navigate('MigratedViewBodyPart')}>
            <HStack space="md" className="items-center">
              <AppIcon name="body-outline" size={20} color={C.blue} bg={C.blue10} containerSize={r(44)} borderRadius={r(12)} />
              <VStack className="flex-1">
                <Text style={styles.todayWorkoutTitle}>Buscar por músculo</Text>
                <Text style={styles.todayWorkoutSub}>Toca una zona del mapa para ver sus ejercicios</Text>
              </VStack>
              <Icon name="chevron-forward" size={20} color={C.textSecondary} />
            </HStack>
          </Pressable>
        </Card>

        {/* Workouts — catálogo genérico de exploración (sistema v2). "Rutinas"
            (v1 legacy) se quitó del Home: era un callejón sin salida, se podía
            explorar y marcar favorito pero no había forma de empezar una
            sesión real desde ahí — Workouts cubre lo mismo y sí es funcional
            de punta a punta. Un cliente 1:1 ya tiene su entrenamiento real en
            "Mi Programa" arriba, así que este catálogo se oculta para ellos. */}
        {!state.user?.is_personal_client && (
          <>
            <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
              <Text style={styles.sectionTitle}>Entrenamientos</Text>
            </HStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
              {workoutTemplateList.map((w) => {
                const locked = w.is_exclusive && !w.is_accessible;
                return (
                  <Pressable
                    key={w.id}
                    style={styles.blogCard}
                    onPress={() => navigation?.navigate('MigratedWorkoutPreview', { workoutTemplateId: w.id, mTitle: w.title })}
                  >
                    {w.thumbnail ? (
                      <ExpoImage source={{ uri: w.thumbnail }} style={styles.blogImage} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                    ) : (
                      <Box style={styles.blogImage} />
                    )}
                    {locked && (
                      <Box style={styles.lockBadge}>
                        <Icon name="lock-closed" size={11} color={'#FFFFFF'} />
                        <Text style={styles.lockBadgeText}>Exclusivo</Text>
                      </Box>
                    )}
                    <Box style={styles.blogContent}>
                      <Text style={styles.blogTitle} numberOfLines={2}>{w.title}</Text>
                    </Box>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.blogCard}
                onPress={() => navigation?.navigate('MigratedWorkoutTemplateList')}
              >
                <Box style={[styles.blogImage, styles.seeAllImage]}>
                  <Icon name="arrow-forward-circle" size={32} color="#FFFFFF" />
                </Box>
                <Box style={styles.blogContent}>
                  <Text style={[styles.blogTitle, { textAlign: 'center' }]}>Ver todos los workouts</Text>
                </Box>
              </Pressable>
            </ScrollView>
          </>
        )}

        {/* Recursos — visible para todos (free y 1:1), a diferencia de
            Workouts: un cliente 1:1 tambien puede tener guias o
            documentos asignados individualmente por su coach. */}
        {resourcesList.length > 0 && (
          <>
            <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
              <Text style={styles.sectionTitle}>Recursos</Text>
            </HStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
              {resourcesList.map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.blogCard}
                  onPress={() => navigation?.navigate('MigratedResourceDetail', { resourceId: r.id, title: r.title })}
                >
                  <Box style={[styles.blogImage, styles.seeAllImage]}>
                    <Icon
                      name={r.type === 'video' ? 'play-circle-outline' : r.type === 'link' ? 'link-outline' : 'document-text-outline'}
                      size={32}
                      color="#FFFFFF"
                    />
                  </Box>
                  <Box style={styles.blogContent}>
                    <Text style={styles.blogTitle} numberOfLines={2}>{r.title}</Text>
                  </Box>
                </Pressable>
              ))}
              <Pressable
                style={styles.blogCard}
                onPress={() => navigation?.navigate('MigratedResourcesList')}
              >
                <Box style={[styles.blogImage, styles.seeAllImage]}>
                  <Icon name="arrow-forward-circle" size={32} color="#FFFFFF" />
                </Box>
                <Box style={styles.blogContent}>
                  <Text style={[styles.blogTitle, { textAlign: 'center' }]}>Ver todos los recursos</Text>
                </Box>
              </Pressable>
            </ScrollView>
          </>
        )}

        {/* Blog */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Blog</Text>
          <Pressable onPress={() => navigation?.navigate('MigratedViewAllBlog')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </Pressable>
        </HStack>
        {blogPosts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
            {blogPosts.map((post: any) => (
              <Pressable key={post.id} style={styles.blogCard} onPress={() => navigation?.navigate('MigratedBlogDetail', { id: post.id })}>
                {post.post_image ? (
                  <ExpoImage source={{ uri: post.post_image }} style={styles.blogImage} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                ) : (
                  <Box style={styles.blogImage} />
                )}
                <Box style={styles.blogContent}>
                  {post.blog_category && (
                    <Box style={styles.blogTag}>
                      <Text style={styles.blogTagText}>{post.blog_category.title}</Text>
                    </Box>
                  )}
                  <Text style={styles.blogTitle} numberOfLines={2}>{post.title}</Text>
                  {post.datetime && <Text style={styles.blogDate}>{post.datetime}</Text>}
                </Box>
              </Pressable>
            ))}
            <Pressable style={styles.blogCard} onPress={() => navigation?.navigate('MigratedViewAllBlog')}>
              <Box style={[styles.blogImage, styles.seeAllImage]}>
                <Icon name="arrow-forward-circle" size={32} color="#FFFFFF" />
              </Box>
              <Box style={styles.blogContent}>
                <Text style={[styles.blogTitle, { textAlign: 'center' }]}>Ver todas las publicaciones</Text>
              </Box>
            </Pressable>
          </ScrollView>
        ) : (
          <Box style={styles.emptySection}>
            <Text style={styles.emptyText}>No hay artículos disponibles</Text>
          </Box>
        )}

        {/* Sueño — sin integración con wearables todavía (diferido, ver
            docs/TAREAS.md). Placeholder honesto en vez de horas inventadas:
            no se muestra ningún número falso, solo la invitación a conectar
            un dispositivo real. */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Sueño</Text>
        </HStack>
        <Card variant="outline" className="mx-5 px-4 py-5 items-center" style={{ marginBottom: r(12) }}>
          <AppIcon name="moon-outline" size={26} color={C.textSecondary} bg={C.brand10} containerSize={r(48)} />
          <Text style={[styles.noWorkoutText, { marginTop: r(10), textAlign: 'center' }]}>
            Conecta tu reloj o app de salud para ver tus datos de sueño aquí
          </Text>
        </Card>

        {/* Need Help → FitBot */}
        <Box style={{ height: r(16) }} />
        <Pressable onPress={() => navigation?.navigate('MigratedChatting', { isDirect: true })}>
          <Card variant="outline" className="mx-5 p-4">
            <HStack className="items-center">
              <VStack className="flex-1">
                <Text style={styles.supportTitle}>¿Necesitas ayuda? Soluciona tus dudas con el bot</Text>
                <Text style={styles.supportLink}>Be Stronger AI</Text>
              </VStack>
              <AppIcon name="chatbubble-ellipses" size={28} color={C.orange} bg="rgba(255,107,53,0.15)" containerSize={r(52)} />
            </HStack>
          </Card>
        </Pressable>

        <Box style={{ height: r(16) }} />
      </ScrollView>

      <Pressable
        onPress={() => navigation?.navigate('ScreenExplorer')}
        style={{ position: 'absolute', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 8px rgba(229, 229, 234, 0.3)', zIndex: 999 }}
      >
        <Text style={{ fontSize: 28, color: '#000000', marginTop: -2 }}>+</Text>
      </Pressable>

      {/* Menú de usuario (perfil, favoritos, ajustes, salud, comunidad, logout) */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
            <Box style={styles.menuHandle} />
            <HStack space="md" className="items-center px-5 py-4">
              <AvatarMem uri={user?.profile_image} name={user?.display_name || displayName} size={48} />
              <VStack className="flex-1">
                <Text style={styles.menuGreeting}>Hola</Text>
                <Text style={styles.menuUserName}>{user?.display_name || displayName}</Text>
              </VStack>
              <Pressable style={styles.menuCloseBtn} onPress={() => setShowMenu(false)}>
                <Icon name="close" size={18} color={C.white} />
              </Pressable>
            </HStack>
            <Divider className="mx-5" />

            <Pressable onPress={() => navigateFromMenu('MigratedProfile')}>
              <HStack className="items-center px-5 py-3.5">
                <AppIcon name="person-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                <Text style={styles.menuItemText}>Mi Perfil</Text>
                <Icon name="chevron-forward" size={18} color={C.textSecondary} />
              </HStack>
            </Pressable>

            <Pressable onPress={() => navigateFromMenu('MigratedFavourite')}>
              <HStack className="items-center px-5 py-3.5">
                <AppIcon name="heart-outline" size={18} color={C.destructive} bg={C.destructive10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                <Text style={styles.menuItemText}>Mis Favoritos</Text>
                <Icon name="chevron-forward" size={18} color={C.textSecondary} />
              </HStack>
            </Pressable>

            <HStack className="items-center px-5 py-3.5">
              <AppIcon name="fitness-outline" size={18} color={C.success} bg={C.success10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
              <Text style={styles.menuItemText}>Apple Health</Text>
              <Switch
                value={appleHealthOn}
                onValueChange={setAppleHealthOn}
                trackColor={{ false: C.gray70, true: C.primary }}
                thumbColor={C.white}
              />
            </HStack>

            <HStack className="items-center px-5 py-3.5">
              <AppIcon name="watch-outline" size={18} color={C.blue} bg={C.blue10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
              <Text style={styles.menuItemText}>Smart Watch</Text>
              <Switch
                value={smartWatchOn}
                onValueChange={setSmartWatchOn}
                trackColor={{ false: C.gray70, true: C.primary }}
                thumbColor={C.white}
              />
            </HStack>

            <Pressable onPress={() => navigateFromMenu('MigratedCommunity')}>
              <HStack className="items-center px-5 py-3.5">
                <AppIcon name="people-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                <Text style={styles.menuItemText}>Comunidad</Text>
                <Icon name="chevron-forward" size={18} color={C.textSecondary} />
              </HStack>
            </Pressable>

            <Divider className="mx-5" />

            <Pressable onPress={handleLogout}>
              <HStack className="items-center px-5 py-3.5">
                <AppIcon name="log-out-outline" size={18} color={C.destructive} bg={C.destructive10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Cerrar sesión</Text>
              </HStack>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
