import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Platform ,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Modal,
  Alert,
  Switch,
  Linking,
  Share,
  Pressable as RNPressable,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CLEARANCE } from '@components/NavigationTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
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
import StartupChecklist, { StartupChecklistStep } from '@components/StartupChecklist';
import TutorialTarget from '@components/tutorial/TutorialTarget';
import { useTutorial } from '@store/TutorialContext';
import { TUTORIAL_CHALLENGES } from '../../constants/tutorialChallenges';
import { AvatarMem } from '@components/Avatar';
import { FONT } from './theme';
import { useAppColorMode } from '../../helper/useAppColorMode';
import { useTabBarScroll } from '@store/TabBarScrollContext';
import { useAppReload } from '@store/AppReloadContext';
import { APP_STORE_ID, PLAY_STORE_PUBLISHED, SOCIAL_LINKS } from '@constants/appLinks';
import { CHAT_ENABLED, ACTIVITY_TRACKER_ENABLED, WATER_TRACKER_ENABLED } from '@constants/featureFlags';
import { loadDiagnosticsEnabled, setDiagnosticsEnabled, getDiagnosticsReportText } from '@helper/logger';
import { showToast } from '@helper/toast';
import { dashboardApi, BannerSliderItem, WaterSummary, StepsSummary, WorkoutSummary } from '../../api/dashboard';
import { motivationalPhraseApi } from '../../api/motivationalPhrase';
import { workoutHistoryApi, CompletedSessionItem } from '../../api/workoutHistory';
import { dietApi } from '../../api/diet';
import { blogApi } from '../../api/blog';
import { workoutTemplateApi, WorkoutTemplateListItem } from '../../api/workoutTemplate';
import { pickWorkoutFallbackImage } from './workoutViewShared';
import { resourcesApi, ResourceListItem, ResourceCategory } from '../../api/resources';
import { checkinsApi, checkinTypeLabel, CheckInAssignment } from '../../api/checkins';
import { habitsApi, Habit } from '../../api/habits';
import { readinessApi, ReadinessValues, ReadinessTodayResponse } from '../../api/readiness';
import ReadinessCheckSheet from '@components/ReadinessCheckSheet';
import { healthApi, HealthReading, HealthDataSource } from '../../api/health';
import { isHealthAvailable, getHealthSnapshot } from '../../helper/health';
import { habitIoniconFor } from '../../constants/habitIcons';
import WeekComplianceRow from '@components/WeekComplianceRow';
import { computeWeekCompliance, computeWeekProgress } from '@components/weekCompliance';
import { useAuth } from '../../store/AuthContext';

const FIGMA_W = 375;
const FIGMA_H = 812;

// Apple Health / Google Health diferido a una próxima versión (2026-08-28,
// pedido explícito). Esta app nunca ha pedido permiso de salud desde ningún
// flujo alcanzable (requestHealthPermissions() solo vive en
// link_device_choice_screen.tsx, pantalla sin ruta de navegación desde Home
// -- ver docs/DEAD_SCREENS.md), así que el sync automático de más abajo
// intentaba leer HealthKit/Health Connect sin autorización real. En iOS
// concretamente esto es más que "no trae datos": sin la capability
// `com.apple.developer.healthkit` (bloqueada por cuenta gratuita de Apple
// Developer, ver docs/PENDIENTE_BACKEND_ADMIN.md) cualquier llamada real a
// HealthKit puede crashear la app -- mismo motivo ya documentado en
// link_device_choice_screen.tsx para ocultar la integración en iOS.
// Apágalo aquí (una sola constante) cuando exista permiso real de la tienda
// para usarlo: cuenta de pago de Apple Developer (HealthKit) + declaración
// de Health Connect aprobada en Play Console (Android).
const HEALTH_SYNC_ENABLED = false;

// Fondo fijo de Home v2 (pedido explícito 2026-08-26, con 2 capturas de
// referencia de otra app): la misma foto del hero, pero FUERA del
// ScrollView -- no se desplaza con el contenido, se queda detrás de toda la
// pantalla. Un oscurecido progresivo (ver homeBgDarkenAnimatedStyle más
// abajo) se va cerrando encima a medida que se hace scroll, desde
// HOME_BG_MIN_OPACITY al principio hasta HOME_BG_MAX_OPACITY justo al llegar
// a "Mi plan de hoy" -- a partir de ahí se queda fijo en el máximo hasta el
// final de la pantalla (pedido explícito 2026-08-27, reintroducido tras
// haberse quitado del todo: ver miPlanOffsetY, que mide en tiempo real dónde
// empieza esa sección en vez de usar un nº de píxeles de scroll fijo).
//
// MAX bajado de 0.9 a 0.45 el 2026-08-27 (reportado con captura): en modo
// claro homeBgDarkenLayer fundía hacia C.bg (#F4F4F7, OPACO), así que al 0.9
// la foto quedaba prácticamente tapada del todo por debajo de "Mi plan de
// hoy" -- un bloque gris claro plano sin foto detrás. Bajar el máximo evitó
// el bloque, pero dejó el efecto casi imperceptible al hacer scroll normal
// (reportado de nuevo 2026-08-28: "no se aplica la opacidad de forma
// progresiva") -- 0.2→0.45 sobre un color CASI BLANCO apenas cambia el brillo
// percibido de la foto. La causa real no era el número, era el color: fundir
// hacia un tono opaco casi blanco en vez de negro. Con homeBgDarkenLayer
// ahora en negro semitransparente (ver más abajo) sí se puede volver al 0.9
// original sin recrear el bloque -- negro al 90% oscurece de verdad la foto
// (efecto buscado), nunca la sustituye por un color sólido plano.
// MIN subido de 0.2 a 0.35 (reportado con capturas, 2026-08-28: "la screen
// en la parte superior debe empezar ya con un poco de opacidad, ahora
// empieza totalmente clara") -- 0.2 se notaba demasiado poco nada más entrar
// en la pantalla, antes de tocar el scroll.
// MIN bajado de 0.35 a 0.28 (pedido explícito, mismo día): la pantalla en
// reposo debe llevar una opacidad ligera -- algo por debajo del valor con el
// que arranca el oscurecido de scroll, no igual de fuerte -- que ya ayude a
// leer el contenido de encima sin oscurecer tanto la foto antes de tocarla.
const HOME_BG_MIN_OPACITY = 0.28;
const HOME_BG_MAX_OPACITY = 0.9;

// Segunda capa -- ver homeBgSolidAnimatedStyle y homeBgSolidLayer más abajo.
// homeBgDarkenLayer se queda fijo en negro (nunca C.bg -- ver su comentario,
// evita el bloque plano del BUG-054), así que por sí sola nunca termina de
// convertirse en el fondo real de la app. homeBgSolidLayer es esa segunda
// capa, del color de tema real (C.bg, distinto en claro/oscuro).
//
// Antes fundía de 0 a 1 en una ventana corta (160px) DESPUÉS de que
// homeBgDarkenLayer ya hubiera llegado a su máximo -- es decir, primero todo
// el scroll se veía cada vez más negro, y solo al final, de golpe, viraba a
// gris en un tramo muy corto. Reportado con capturas (2026-08-28): "la
// opacidad progresiva es muy agresiva... llega un momento en que la pantalla
// es totalmente oscura y luego cambia de forma muy radical a gris". La causa
// era que las dos capas usaban rangos de scroll DISTINTOS (una todo el
// recorrido, la otra solo el final) en vez del mismo. Ahora ambas capas
// interpolan sobre el MISMO rango [0, miPlanOffsetY]: el gris empieza a
// asomar desde el primer scroll (a la vez que el negro, no después) y ambas
// llegan a su valor final exactamente en el mismo punto ("Mi plan de hoy"),
// una sola transición continua en vez de dos fases pegadas una a otra.

// Saludo dinamico por hora local del dispositivo (no posicion solar, no hace
// falta suncalc) -- mismos rangos que usaria cualquier reloj: mañana antes de
// mediodia, tarde hasta el atardecer, noche el resto.
// Franja de madrugada (0-5h) añadida aparte (reportado con captura a la
// 1:38): "hour < 12" sin más metía la 1 de la madrugada en "Buenos días",
// que es justo el saludo contrario al que le conviene a alguien despierto
// a esa hora.
function greetingForHour(hour: number): string {
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// "Hoy" en fecha LOCAL del dispositivo, como YYYY-MM-DD -- NO usar
// toISOString().split('T')[0] para esto: toISOString() siempre da la fecha
// en UTC, así que en cualquier huso horario por delante de UTC (España
// incluida) sigue devolviendo el día de AYER durante las primeras horas de
// la madrugada. Bug real (reportado con captura a la 1:41, ya día 29 en
// local): "Actividad de Hoy" seguía mostrando las tareas del día 28 porque
// buscaba en el calendario con la fecha UTC, no la local. Mismo patrón que
// toDateKey en my_program_calendar_screen.tsx.
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Recovery del hero -- estimación 100% cliente a partir del chequeo
// subjetivo diario que el cliente ya rellena (daily_readiness_checks, mismo
// dato que consume workout_preview_screen.tsx). NO es el `combined_score`
// real que calcula `ReadinessCalculationService` en el backend (ese cruza
// esto con HRV/sueño objetivo de wearable vía `readiness_scores`, y hoy no
// hay endpoint que lo exponga al cliente) -- es una media simple de las 4
// respuestas normalizadas a 0-100, pensada como aproximación honesta
// mientras no exista ese endpoint, no como sustituto exacto del score real.
function computeRecoveryScore(v: ReadinessValues): number {
  const sleep = ((v.sleep_quality - 1) / 4) * 100; // 1-5, mayor = mejor
  const energy = ((v.energy_level - 1) / 4) * 100; // 1-5, mayor = mejor
  const soreness = ((10 - v.soreness_level) / 9) * 100; // 1-10, invertido (mayor = peor)
  const stress = ((5 - v.stress_level) / 4) * 100; // 1-5, invertido (mayor = peor)
  return Math.round((sleep + energy + soreness + stress) / 4);
}

// Fondo real del hero (sustituye al LinearGradient plano) -- 3 fotos fijas
// del cliente, elegidas por hora local del dispositivo. Mismo criterio que
// greetingForHour: no hace falta posición solar real, basta con franjas
// horarias razonables. Amanecer/atardecer comparten foto (misma luz cálida).
const HERO_IMAGES = {
  sunriseSunset: require('../../assets/hero-sunrise-sunset.jpg'),
  day: require('../../assets/hero-day.jpg'),
  night: require('../../assets/hero-night.jpg'),
};

type HeroMood = keyof typeof HERO_IMAGES;

function getHeroMoodForHour(hour: number): HeroMood {
  if (hour >= 5 && hour < 8) return 'sunriseSunset'; // amanecer
  if (hour >= 8 && hour < 19) return 'day';
  if (hour >= 19 && hour < 21) return 'sunriseSunset'; // atardecer
  return 'night';
}

// Imagen de recurso: todavía no existe `image_url` en el backend (pendiente,
// ver docs/TAREAS.md), así que mientras tanto se previsualiza con una foto
// real de internet (LoremFlickr, sin API key) elegida por categoría -- más
// fiable que buscar por el título suelto (en español, frase libre), que da
// resultados peores en un buscador de fotos en inglés. `lock` fija la misma
// foto para el mismo recurso en cada carga (si no, cambiaría en cada pull-to-
// refresh). Sustituir por `r.image_url` en cuanto el backend lo mande.
const RESOURCE_CATEGORY_KEYWORDS: Record<ResourceCategory, string> = {
  entrenamiento: 'fitness,workout',
  nutricion: 'healthy,food',
  habitos_mindset: 'meditation,mindfulness',
  onboarding: 'welcome,journey',
  planes_actuales: 'planning,goals',
};

function resourceImageSource(r: ResourceListItem) {
  if (r.image_url) return { uri: r.image_url };
  const keyword = r.category ? RESOURCE_CATEGORY_KEYWORDS[r.category] : (r.type === 'video' ? 'video,camera' : 'reading,book');
  return { uri: `https://loremflickr.com/400/300/${keyword}?lock=${r.id}` };
}

interface HomeScreenModernProps {
  navigation?: any;
  route?: any;
}

export default function HomeScreenModernV2(props: HomeScreenModernProps) {
  const { navigation } = props;
  const { state, logout } = useAuth();
  const user = state.user;

  // Modo oscuro automático por hora (solo Home v2 por ahora, ver
  // helper/useAppColorMode.ts) -- "C" queda con el mismo nombre que el
  // import estático de siempre para no reescribir los ~85 usos C.xxx de
  // este fichero; sigue el modo salvo que el usuario lo fije a mano.
  const { preference: themePreference, colors: C } = useAppColorMode();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const firstLoadDone = useRef(false);

  // scrollY alimenta tanto el plegado de la barra de pestañas (ver
  // reportScrollY más abajo) como el oscurecido progresivo del fondo (ver
  // homeBgDarkenAnimatedStyle).
  const scrollY = useSharedValue(0);
  const heroScrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  // Punto de scroll (en px) donde empieza la sección "Mi plan de hoy" --
  // medido en tiempo real vía onLayout (ver handleMiPlanLayout) en vez de un
  // nº de píxeles fijo, porque la altura de todo lo que hay ANTES de esa
  // sección (banner de error condicional, StartupChecklist con 7 pasos)
  // varía. El oscurecido progresivo usa esto como tope: sube de
  // HOME_BG_MIN_OPACITY a HOME_BG_MAX_OPACITY hasta llegar aquí y se queda
  // fijo en el máximo a partir de ese punto (Extrapolation.CLAMP). Arranca
  // en 0 -- antes de que onLayout mida el valor real, scrollY también vale 0
  // así que el resultado sigue siendo HOME_BG_MIN_OPACITY, no hay parpadeo.
  const miPlanOffsetY = useSharedValue(0);
  const handleMiPlanLayout = useCallback((e: LayoutChangeEvent) => {
    miPlanOffsetY.value = e.nativeEvent.layout.y;
  }, [miPlanOffsetY]);
  // Plegar la barra de pestañas al hacer scroll (pedido explícito, ver
  // store/TabBarScrollContext.tsx) -- reutiliza el mismo scrollY que ya
  // existía para el efecto de blur del hero. Mismo patrón que
  // showCompactSummary en plan_screen.tsx: reaccionar sobre el booleano ya
  // resuelto (no el scrollY crudo) y solo avisar a React cuando cambia de
  // lado, para no cruzar al hilo de JS en cada frame de scroll.
  const { reportScrollY } = useTabBarScroll();
  const { reloadApp } = useAppReload();

  // "Habilitar diagnósticos" (Ajustes, pedido explícito) -- refleja el
  // flag real guardado en AsyncStorage vía helper/logger.ts, no un estado
  // local suelto (mismo motivo que el switch de notificaciones: si se
  // inicializa en false a ciegas, un usuario que ya lo activó antes vería
  // el switch "apagado" hasta tocarlo, desincronizado del buffer real que
  // sí está activo).
  const [diagnosticsOn, setDiagnosticsOnState] = useState(false);
  useEffect(() => {
    loadDiagnosticsEnabled().then(setDiagnosticsOnState);
  }, []);
  const handleToggleDiagnostics = useCallback((value: boolean) => {
    setDiagnosticsOnState(value);
    setDiagnosticsEnabled(value);
  }, []);
  const handleRateApp = useCallback(() => {
    if (Platform.OS === 'ios') {
      if (!APP_STORE_ID) {
        showToast('Aún no disponible', { description: 'Be Stronger todavía no tiene ficha publicada en la App Store.', variant: 'info' });
        return;
      }
      Linking.openURL(`itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`);
    } else {
      if (!PLAY_STORE_PUBLISHED) {
        showToast('Aún no disponible', { description: 'Be Stronger todavía no tiene ficha publicada en Google Play.', variant: 'info' });
        return;
      }
      const pkg = Constants.expoConfig?.android?.package;
      Linking.openURL(`market://details?id=${pkg}`).catch(() =>
        Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`)
      );
    }
  }, []);
  const handleSendLogs = useCallback(async () => {
    const report = getDiagnosticsReportText();
    if (!report) {
      showToast('No hay registros que enviar', {
        description: 'Activa "Habilitar diagnósticos" primero para que la app empiece a guardar registros que luego puedas enviar.',
        variant: 'warning',
      });
      return;
    }
    const header = `Be Stronger ${Constants.expoConfig?.version ?? ''} · ${Platform.OS}\n\n`;
    try {
      await Share.share({ message: header + report });
    } catch {
      // Usuario canceló el share sheet -- no hace falta feedback.
    }
  }, []);
  useAnimatedReaction(
    () => scrollY.value > 8,
    (collapsed, prevCollapsed) => {
      if (collapsed !== prevCollapsed) runOnJS(reportScrollY)(scrollY.value);
    }
  );
  // Oscurecido progresivo del fondo fijo de toda la pantalla (ver
  // HOME_BG_MIN/MAX_OPACITY y miPlanOffsetY arriba).
  const homeBgDarkenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, Math.max(miPlanOffsetY.value, 1)],
      [HOME_BG_MIN_OPACITY, HOME_BG_MAX_OPACITY],
      Extrapolation.CLAMP
    ),
  }));
  // Segunda capa, color de tema real -- mismo rango de scroll que
  // homeBgDarkenAnimatedStyle (ver comentario junto a HOME_BG_MIN_OPACITY),
  // así que ambas avanzan a la vez en vez de una detrás de la otra.
  const homeBgSolidAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, Math.max(miPlanOffsetY.value, 1)],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));
  // Este bloque ("Reto para empezar") es la entrada al tutorial guiado:
  // cada paso es uno de los 7 retos esenciales (ver constants/tutorialChallenges.ts).
  // Se excluyen los marcados `hidden` porque su primer paso vive en una
  // pantalla solo alcanzable encadenada desde otro reto, nunca desde Home.
  // "done" viene de useTutorial() (persistido, se marca solo cuando el
  // usuario completa la acción real -- nunca a mano aquí). Tocar un paso
  // lanza su spotlight (TutorialOverlay) en vez de navegar directamente.
  const { isDone: isTutorialDone, startChallenge, resetAll: resetTutorial } = useTutorial();
  const startupSteps: StartupChecklistStep[] = useMemo(
    () =>
      TUTORIAL_CHALLENGES.filter((challenge) => !challenge.hidden).map((challenge) => ({
        id: challenge.id,
        label: challenge.label,
        done: isTutorialDone(challenge.id),
        onPress: () => startChallenge(challenge.id),
      })),
    [isTutorialDone, startChallenge]
  );
  const { width: winW, height: winH } = useWindowDimensions();
  const sc = useMemo(() => Math.min(winW / FIGMA_W, winH / FIGMA_H), [winW, winH]);
  const r = useCallback((n: number) => Math.round(n * sc), [sc]);
  const insets = useSafeAreaInsets();

  // Mood del hero (amanecer/atardecer, día o noche) por hora local -- se
  // recalcula por render (barato, solo lee la hora actual) y elige qué foto
  // de fondo mostrar (ver HERO_IMAGES arriba).
  const heroMood = getHeroMoodForHour(new Date().getHours());
  const [showMenu, setShowMenu] = useState(false);
  // Antes: dos Switch reales (appleHealthOn por defecto en `true`, sin
  // ninguna llamada a HealthKit/Health Connect detrás) -- parecían un ajuste
  // persistido y funcional cuando no hacían nada. Ninguna integración de
  // salud/wearable existe todavía en esta versión (ver
  // docs/PENDIENTE_BACKEND_ADMIN.md, "Bloqueantes de infraestructura"), así
  // que la fila ahora es un aviso "Próximamente", no un control.
  const HEALTH_SYNC_COMING_SOON_NAME = Platform.OS === 'ios' ? 'Apple Health' : 'Google Health';

  // Nueva cabecera (estilo Helix, ver docs/Nueva_Cabecera_Home_Helix.md).
  const [motivationalPhrase, setMotivationalPhrase] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<BannerSliderItem | null>(null);
  // Estado B del banner (slider real conectado) solo aplica si el cliente ya
  // dio permisos de HealthKit/Health Connect -- esa integracion (ver
  // react-native-health-link en el doc) todavia no existe en la app, asi que
  // por ahora esto siempre es false y el Estado A (demo) es el unico
  // disponible. El codigo del Estado B ya queda listo, solo inactivo.
  const hasHealthConnected = false;

  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<boolean[]>([]);
  // Fracción (0..1) de entrenamientos completados sobre los asignados cada
  // día -- p.ej. 2 asignados y 1 completado -> 0.5, para que el anillo de
  // WeekComplianceRow se rellene a la mitad en vez de marcar el día entero
  // como hecho/no hecho (pedido explícito, ver cálculo en fetchData).
  const [weeklyWorkoutsProgress, setWeeklyWorkoutsProgress] = useState<number[]>([]);
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  // Agua/Actividad (sustituyen los placeholders "Sueño"/"Balance de carga") --
  // ya venían en dashboard-detail sin leerse (ver fetchData).
  const [water, setWater] = useState<WaterSummary | null>(null);
  const [steps, setSteps] = useState<StepsSummary | null>(null);
  const [workout, setWorkout] = useState<WorkoutSummary | null>(null);
  const [workoutTemplateList, setWorkoutTemplateList] = useState<WorkoutTemplateListItem[]>([]);
  const [resourcesList, setResourcesList] = useState<ResourceListItem[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<CheckInAssignment[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  // Tocar un entrenamiento ya completado en "Mi plan de hoy" debe abrir el
  // resumen (mismo patrón que MigratedMyProgramCalendar::goToWorkout), no el
  // preview de la plantilla — de ahí este set de assignment_id completados.
  const [completedAssignmentIds, setCompletedAssignmentIds] = useState<Set<number>>(new Set());
  // Recovery real (opción 1 + 3 del hueco Recovery/Strain del hero, ver
  // computeRecoveryScore arriba): `readinessToday` es null mientras no se
  // resuelve la petición (evita el parpadeo de mostrar el CTA un instante
  // antes de saber si ya se rellenó hoy). `showReadinessSheet` abre el
  // formulario opcional (ReadinessCheckSheet) al tocar el anillo cuando
  // todavía no hay chequeo de hoy.
  const [readinessToday, setReadinessToday] = useState<ReadinessTodayResponse['data'] | null>(null);
  const [showReadinessSheet, setShowReadinessSheet] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    // Transparente a propósito (antes C.bg opaco): el fondo fijo de la foto
    // (ver homeBgFixedLayer más abajo) vive por debajo de todo, y necesita
    // que este contenedor y el ScrollView no lo tapen con un color sólido.
    container: { flex: 1 },
    // Oscurecido progresivo: negro fijo en ambos modos, nunca un color de
    // chrome de la app (C.bg/tono por mood, como se hacía antes). Esta capa
    // va SOBRE una foto, no sobre UI -- fundir hacia negro es lo único que de
    // verdad se lee como "la foto se oscurece" al hacer scroll, sea cual sea
    // el tema. Fundir hacia C.bg (#F4F4F7, opaco) es lo que causó el bloque
    // gris claro plano del BUG-054: al subir la opacidad, en vez de oscurecer
    // la foto la sustituía por un color sólido casi blanco. Con negro no hay
    // ese riesgo: incluso al máximo (HOME_BG_MAX_OPACITY) la foto se ve muy
    // oscura pero nunca se convierte en un bloque de color plano ajeno a ella.
    homeBgDarkenLayer: { backgroundColor: '#000000' },
    // Segunda capa, encima de homeBgDarkenLayer -- ver
    // homeBgSolidAnimatedStyle. Esta sí es C.bg (el tema real, distinto en
    // claro/oscuro): avanza en paralelo con homeBgDarkenLayer, del negro
    // subiendo debajo a la vez, así que cuando el gris empieza a notarse ya
    // hay foto oscurecida detrás -- no repite el bloque plano de BUG-054,
    // que pasaba con la foto todavía nítida.
    homeBgSolidLayer: { backgroundColor: C.bg },
    // Nueva cabecera estilo Helix (docs/Nueva_Cabecera_Home_Helix.md). Fondo
    // con foto real de fondo (amanecer/atardecer, día o noche, ver
    // getHeroMoodForHour). Sin border-radius inferior ni degradado de cierre a propósito (revisión 2026-08-26,
    // pedido explícito repetido: la foto debe llenar la pantalla entera sin
    // ningún degradado de transición, ni dentro de la foto ni entre esta y
    // "Mi plan de hoy" -- los intentos anteriores con degradado de cierre
    // (heroCloseGradient/seamGradient) se han quitado del todo).
    // height: winH crudo, sin restar inset inferior ni barra de pestañas --
    // versiones previas restaban esas zonas para dejar hueco a la barra
    // flotante, pero el resultado seguía sin leerse como "pantalla
    // completa" (reportado con captura, 2026-08-26); esta vez se prioriza
    // que la foto ocupe el 100% del viewport visible al entrar, aunque deje
    // más foto sin contenido de UI encima en pantallas altas.
    heroHeader: {
      height: winH,
      paddingBottom: r(24),
      paddingHorizontal: r(20),
      overflow: 'hidden' as const,
    },
    // Barra fija (calendario / saludo / notificaciones / ajustes) — vive
    // FUERA del ScrollView como overlay con blur (ver stickyHeader más abajo)
    // para poder quedar estática al hacer scroll. heroTopBar ya no forma
    // parte del contenido que se desplaza.
    heroTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' as const, paddingHorizontal: r(20), paddingBottom: r(12) },
    heroIconBtn: { width: r(38), height: r(38), borderRadius: r(19), backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center' as const, justifyContent: 'center' as const },
    heroGreeting: { flex: 1, fontSize: r(15), fontFamily: FONT.bold, color: '#FFFFFF', textAlign: 'center' as const, marginHorizontal: r(10) },
    notifBadge: { position: 'absolute', top: r(-2), right: r(-2), width: r(16), height: r(16), borderRadius: r(8), backgroundColor: C.destructive, alignItems: 'center' as const, justifyContent: 'center' as const },
    notifBadgeText: { fontSize: r(8), fontFamily: FONT.bold, color: '#FFFFFF' },
    stickyHeader: { position: 'absolute' as const, top: 0, left: 0, right: 0, zIndex: 20, elevation: 20, overflow: 'hidden' as const },
    // Altura del contenido de la barra fija (sin contar el inset superior) —
    // se usa como paddingTop del header degradado para que ningún contenido
    // del ScrollView quede tapado por la barra fija.
    ringsRow: { alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: r(16), minHeight: r(120) },
    ringSide: { flex: 1, justifyContent: 'center' as const },
    // lineHeight explícito (mayor que el fontSize) — sin esto, con
    // FONT.extraBold el número quedaba cortado por arriba/abajo dentro de su
    // propia caja de texto (mismo patrón de "números entrecortados" ya visto
    // en otras screens con fuentes bold). Ver nota de revisión 2026-08-19.
    ringValue: { fontSize: r(26), lineHeight: r(32), fontFamily: FONT.extraBold, color: '#FFFFFF' },
    ringLabel: { fontSize: r(10), lineHeight: r(14), fontFamily: FONT.semiBold, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.5, marginTop: r(2) },
    ringSubLabel: { fontSize: r(9), lineHeight: r(13), color: 'rgba(255,255,255,0.5)' },
    readinessCtaHint: { fontSize: r(11), color: 'rgba(255,255,255,0.6)', textAlign: 'center' as const, marginTop: r(-8) },
    // Agua/Actividad -- ahora viven DENTRO de heroHeader (debajo del banner
    // de demo, todavía sobre la foto), no a caballo sobre el degradado como
    // las tarjetas placeholder que sustituyen. Sin paddingHorizontal propio:
    // ya lo hereda de heroHeader.
    miniCardsRow: { marginTop: r(16) },
    heroPhrase: { fontSize: r(14), color: 'rgba(255,255,255,0.92)', textAlign: 'center' as const, lineHeight: r(20), marginBottom: r(16) },
    bannerCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: r(18), padding: r(16), alignItems: 'center' as const, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
    bannerTitle: { fontSize: r(14), fontFamily: FONT.bold, color: '#FFFFFF', marginTop: r(8) },
    bannerText: { fontSize: r(12), color: 'rgba(255,255,255,0.75)', textAlign: 'center' as const, marginTop: r(4), lineHeight: r(17) },
    miniCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: r(16), padding: r(14) },
    miniCardTitle: { fontSize: r(12), fontFamily: FONT.semiBold, color: 'rgba(255,255,255,0.75)' },
    miniCardValue: { fontSize: r(18), fontFamily: FONT.extraBold, color: '#FFFFFF', marginTop: r(8) },
    miniCardValueMuted: { fontSize: r(12), fontFamily: FONT.semiBold, color: 'rgba(255,255,255,0.55)' },
    miniCardAddBtn: {
      width: r(22),
      height: r(22),
      borderRadius: r(11),
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    glassGrid: { flexWrap: 'wrap' as const, gap: r(4), marginTop: r(8) },
    miniCardSubRow: { fontSize: r(10.5), fontFamily: FONT.medium, color: 'rgba(255,255,255,0.7)' },
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
    resourceTypeBadge: {
      position: 'absolute' as const,
      top: r(8),
      right: r(8),
      width: r(26),
      height: r(26),
      borderRadius: r(13),
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
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
    menuSheet: { backgroundColor: C.bg, borderTopLeftRadius: r(24), borderTopRightRadius: r(24), paddingBottom: r(24), maxHeight: '85%' as const },
    menuHandle: { width: r(40), height: r(4), borderRadius: r(2), backgroundColor: C.border, alignSelf: 'center' as const, marginTop: r(10), marginBottom: r(4) },
    menuHeaderBar: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: r(14), paddingHorizontal: r(20) },
    menuTitle: { fontSize: r(17), fontFamily: FONT.bold, color: C.textPrimary },
    menuCloseBtn: {
      position: 'absolute' as const,
      left: r(20),
      width: r(32),
      height: r(32),
      borderRadius: r(16),
      backgroundColor: C.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    menuScroll: { paddingHorizontal: r(20) },
    menuSectionLabel: { fontSize: r(13), fontFamily: FONT.semiBold, color: C.textSecondary, marginTop: r(20), marginBottom: r(8), marginLeft: r(4) },
    menuCard: { backgroundColor: C.surface, borderRadius: r(16), overflow: 'hidden' as const },
    menuItemText: { fontSize: r(15), fontFamily: FONT.semiBold, color: C.textPrimary },
    menuItemSubtext: { fontSize: r(12), color: C.textSecondary, marginTop: r(1) },
    menuLogoutBtn: { backgroundColor: C.surface, borderRadius: r(16), paddingVertical: r(14), alignItems: 'center' as const, marginTop: r(20) },
    menuLogoutText: { fontSize: r(15), fontFamily: FONT.semiBold, color: C.destructive },
    menuActionBtn: { backgroundColor: C.surface, borderRadius: r(16), paddingVertical: r(14), alignItems: 'center' as const, marginTop: r(12) },
    menuActionBtnText: { fontSize: r(14), fontFamily: FONT.semiBold, color: C.textPrimary },
    menuFooterText: { fontSize: r(12), color: C.textSecondary, marginTop: r(6) },
    comingSoonPill: { backgroundColor: C.gray10, borderRadius: r(999), paddingHorizontal: r(10), paddingVertical: r(4) },
    comingSoonPillText: { fontSize: r(11), fontFamily: FONT.semiBold, color: C.textSecondary },
  }), [sc, r, C, winH, heroMood]);

  const fetchData = useCallback(async (mode?: 'initial' | 'silent') => {
    if (mode !== 'silent') {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const now = new Date();
      const todayStr = localDateKey(now);
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [dashRes, calendarRes, dietRes, blogRes, workoutTemplatesRes, resourcesRes, checkinsRes, habitsRes, phraseRes, completedRes, readinessRes] = await Promise.allSettled([
        dashboardApi.getDashboard(),
        workoutHistoryApi.getMyCalendar(currentMonth, currentYear),
        dietApi.getDailyPlan(todayStr),
        blogApi.getList(1, { per_page: 3, order_by: 'created_at', order_dir: 'desc' }),
        workoutTemplateApi.getList(1, 3),
        resourcesApi.getList({ per_page: 3 }),
        checkinsApi.getAssignedList(),
        habitsApi.getMyList(7),
        motivationalPhraseApi.getPhrase(),
        workoutHistoryApi.getMyCompletedSessions(),
        readinessApi.getToday(),
      ]);

      const errors: string[] = [];

      if (dashRes.status === 'fulfilled') {
        const d: any = dashRes.value.data.data;
        setNotificationCount(d?.notification_data?.unread_total_count ?? 0);
        // Estado B del banner (ver seccion 2 del encargo) -- solo se pinta si
        // hasHealthConnected es true (todavia no, sin integracion de salud),
        // pero se guarda igual para que el codigo ya quede conectado.
        const banners: BannerSliderItem[] = d?.banner_slider ?? [];
        setActiveBanner(banners.length > 0 ? banners[0] : null);
        setWater(d?.water ?? null);
        setSteps(d?.steps ?? null);
        setWorkout(d?.workout ?? null);
      } else {
        errors.push('dashboard');
      }

      if (phraseRes.status === 'fulfilled') {
        setMotivationalPhrase(phraseRes.value.data?.data?.text ?? null);
      }

      // Sesiones completadas -- se necesita ANTES del bloque de calendarRes
      // (ver más abajo) porque "Cumplimiento semanal" tiene que comprobar si
      // el entrenamiento de cada día se completó de verdad, no solo si
      // había uno asignado. Se reutiliza el mismo Set para
      // setCompletedAssignmentIds() más abajo, sin recalcularlo dos veces.
      const completedSessions: CompletedSessionItem[] = completedRes.status === 'fulfilled' ? (completedRes.value.data?.data ?? []) : [];
      const completedAssignmentIdSet = new Set(
        completedSessions.filter((s) => s.program_day_assignment_id != null).map((s) => s.program_day_assignment_id as number)
      );

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
        const weekProgress: number[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const dateStr = localDateKey(d);
          const dayData: any = daysByDate.get(dateStr);
          const dayWorkouts: any[] = dayData?.workouts ?? [];
          // Bug real (reportado con captura, 2026-08-24): antes marcaba el
          // día como cumplido con solo tener un workout ASIGNADO ese día
          // (dayData.workouts.length > 0), sin comprobar si el cliente lo
          // completó de verdad -- por eso "Cumplimiento semanal" podía
          // mostrar 7 de 7 con entrenamientos sin hacer. Ahora exige que al
          // menos uno de los workouts asignados ese día esté en
          // completedAssignmentIdSet (mismas sesiones completadas que ya
          // usa "Mi plan de hoy" para distinguir tarjeta completada/pendiente).
          const dayCompleted = dayWorkouts.some((w: any) => completedAssignmentIdSet.has(w.assignment_id));
          weekBools.push(dayCompleted);
          // Fracción completados/asignados ese día (pedido explícito, ver
          // weeklyWorkoutsProgress) -- p.ej. 2 asignados y 1 completado
          // rellena el anillo a la mitad. 0 si no hay nada asignado ese día.
          const completedCount = dayWorkouts.filter((w: any) => completedAssignmentIdSet.has(w.assignment_id)).length;
          weekProgress.push(dayWorkouts.length > 0 ? completedCount / dayWorkouts.length : 0);
        }
        setWeeklyWorkouts(weekBools);
        setWeeklyWorkoutsProgress(weekProgress);
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

      if (completedRes.status === 'fulfilled') {
        setCompletedAssignmentIds(completedAssignmentIdSet);
      }

      if (readinessRes.status === 'fulfilled') {
        setReadinessToday(readinessRes.value.data.data);
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
    if (!HEALTH_SYNC_ENABLED) return;
    const LAST_SYNC_KEY = 'health_last_sync_date';

    (async () => {
      try {
        const today = localDateKey(new Date());
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
    // Fondo opaco explícito -- a diferencia del render principal (más abajo),
    // esta pantalla de carga no tiene detrás la capa fija de la foto (ver
    // homeBgFixedLayer), así que styles.container (transparente a propósito
    // para dejar ver esa foto) dejaría esto en negro/vacío.
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
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

  // "Reiniciar tutorial" (auditoría 2026-08-29, P2-1): resetAll() ya existía
  // en TutorialContext desde antes, sin ninguna UI que lo llamara -- un
  // usuario que quisiera volver a ver los coach-marks no tenía forma de
  // hacerlo salvo desinstalar la app. Mismo patrón/confirmación destructiva
  // que "Borrar caché y recargar todos los datos", justo debajo en el menú.
  const handleResetTutorial = () => {
    Alert.alert(
      'Reiniciar tutorial',
      'Todos los retos volverán a aparecer como pendientes en "Reto para empezar".',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reiniciar', style: 'destructive', onPress: () => { setShowMenu(false); resetTutorial(); } },
      ]
    );
  };

  const navigateFromMenu = (routeName: string, params?: object) => {
    setShowMenu(false);
    navigation?.navigate(routeName, params);
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
      // Solo el primer check-in visible actúa como objetivo del reto
      // "Rellena tu check-in" -- con varios pendientes, señalar todos a la
      // vez no tendría sentido.
      const isFirstCheckin = visibleTodayItems.findIndex((x) => x.kind === 'checkin') === i;
      const checkinCard = (
        <Pressable
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
      return isFirstCheckin ? (
        <TutorialTarget key={item.key} id="home-checkin-card" scrollRef={scrollRef}>{checkinCard}</TutorialTarget>
      ) : (
        <Box key={item.key}>{checkinCard}</Box>
      );
    }
    const w = item.data;
    // Si ya está completado, abre el resumen de lo que rellenó el cliente
    // (mismo destino y params que MigratedMyProgramCalendar::goToWorkout para
    // un workout ya hecho) en vez del preview de la plantilla.
    const isCompleted = w.assignment_id != null && completedAssignmentIds.has(w.assignment_id);
    // Solo el primer workout visible es el objetivo del reto "Accede a tu
    // entrenamiento de hoy" -- mismo criterio que con los check-ins.
    const isFirstWorkout = visibleTodayItems.findIndex((x) => x.kind === 'workout') === i;
    const workoutCard = (
      <Pressable
        style={rowStyle}
        onPress={() =>
          isCompleted
            ? navigation?.navigate('MigratedSessionHistoryDetail', { programDayAssignmentId: w.assignment_id, title: w.title || 'Entrenamiento' })
            : navigation?.navigate('MigratedWorkoutPreview', { programDayAssignmentId: w.assignment_id, mTitle: w.title || 'Entrenamiento' })
        }
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
    return isFirstWorkout ? (
      <TutorialTarget key={item.key} id="home-today-workout-card" scrollRef={scrollRef}>{workoutCard}</TutorialTarget>
    ) : (
      <Box key={item.key}>{workoutCard}</Box>
    );
  };

  // Agua: sin campo real de "vasos" en el backend (solo total/goal en ml,
  // ver api/dashboard.ts WaterSummary) -- se deriva una rejilla de vasos
  // asumiendo un tamaño de vaso estándar, igual que hacen la mayoría de apps
  // de agua cuando el usuario no fija su propio tamaño de vaso.
  const GLASS_SIZE_ML = 250;
  const waterTotal = water?.total ?? 0;
  const waterGoal = water?.goal ?? 0;
  const totalGlasses = waterGoal > 0 ? Math.max(1, Math.round(waterGoal / GLASS_SIZE_ML)) : 8;
  const filledGlasses = Math.min(totalGlasses, Math.floor(waterTotal / GLASS_SIZE_ML));

  // Actividad: el backend no calcula kcal a partir de pasos (solo cuenta de
  // pasos), así que se estima con el mismo factor ~0.03 kcal/paso que usan
  // la mayoría de wearables para una persona media -- las kcal reales de
  // entrenamiento (totalCalories) sí vienen del backend tal cual.
  const KCAL_PER_STEP = 0.03;
  const stepsCount = steps?.total ?? 0;
  const stepsKcal = Math.round(stepsCount * KCAL_PER_STEP);
  const workoutKcal = workout?.totalCalories ?? 0;
  const activityKcal = stepsKcal + workoutKcal;
  const activityGoalKcal = steps?.goal ? Math.round(steps.goal * KCAL_PER_STEP) : 0;

  // Recovery del anillo del hero -- null mientras no se resuelve la petición
  // (evita parpadeo del CTA), número real una vez que hay chequeo de hoy.
  const recoveryScore = readinessToday?.today ? computeRecoveryScore(readinessToday.today) : null;
  const recoveryColor = recoveryScore == null ? '#FFFFFF' : recoveryScore >= 70 ? C.success : recoveryScore >= 40 ? C.warning : C.destructive;
  const readinessCtaVisible = readinessToday != null && !readinessToday.submitted_today;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Fondo fijo de toda la pantalla (pedido explícito 2026-08-26, con 2
          capturas de referencia de otra app): la misma foto del hero, pero
          FUERA del ScrollView -- no se desplaza con el contenido, se queda
          detrás de todo. Dos capas de oscurecido EN PARALELO al hacer scroll
          (pedido explícito 2026-08-28, ver comentario junto a
          HOME_BG_MIN_OPACITY): homeBgDarkenAnimatedStyle (negro) y
          homeBgSolidAnimatedStyle (C.bg, el tema real) interpolan sobre el
          mismo rango de scroll [0, "Mi plan de hoy"] a la vez, en vez de una
          detrás de la otra -- el gris ya se nota desde el principio del
          scroll, mezclado con el negro que sigue oscureciendo la foto, y las
          dos llegan a su valor final juntas. El scroll termina de verdad en
          el fondo real de la app en los dos modos, no en una foto
          oscurecida indefinida. El "mood" de la foto en sí (heroMood) sigue
          la hora del día, sin
          relación con el tema claro/oscuro. */}
      <Box style={StyleSheet.absoluteFill} pointerEvents="none">
        <ExpoImage source={HERO_IMAGES[heroMood]} contentFit="cover" style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.homeBgDarkenLayer, homeBgDarkenAnimatedStyle]} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.homeBgSolidLayer, homeBgSolidAnimatedStyle]} />
      </Box>
      {/* Barra fija con efecto glass (calendario / saludo / notificaciones /
          ajustes) — se mantiene estática al hacer scroll, mostrando
          desenfocado lo que pasa por debajo (petición 2026-08-19). Vive fuera
          del ScrollView a propósito. */}
      <Box style={styles.stickyHeader}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Box style={{ paddingTop: insets.top + r(10) }}>
          <HStack style={styles.heroTopBar}>
            <Pressable
              style={styles.heroIconBtn}
              onPress={() => navigation?.navigate('MigratedMyProgramCalendar')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Calendario">
              <Icon name="calendar-outline" size={19} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.heroGreeting} numberOfLines={1}>
              {greetingForHour(new Date().getHours())}, {displayName}
            </Text>
            <HStack space="sm" className="items-center">
              <Pressable
                style={styles.heroIconBtn}
                onPress={() => navigation?.navigate('MigratedNotification')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Notificaciones">
                <Icon name="notifications-outline" size={18} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <Box style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                  </Box>
                )}
              </Pressable>
              <Pressable
                style={styles.heroIconBtn}
                onPress={() => setShowMenu(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Ajustes">
                <Icon name="settings-outline" size={18} color="#FFFFFF" />
              </Pressable>
            </HStack>
          </HStack>
        </Box>
      </Box>
      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        onScroll={heroScrollHandler}
        scrollEventThrottle={16}
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
        {/* Header (nueva cabecera estilo Helix, ver docs/Nueva_Cabecera_Home_Helix.md).
            paddingTop incluye insets.top + la altura de la barra fija de
            arriba (stickyHeader, ~r(58)) para que ningún contenido quede
            tapado detrás de ella. */}
        <Box style={[styles.heroHeader, { paddingTop: insets.top + r(64) }]}>
          {/* La foto de fondo (amanecer/atardecer, día o noche) ya no vive
              aquí -- ahora es homeBgFixedLayer, fuera del ScrollView, fija
              para toda la pantalla (ver más arriba). Este Box se queda
              transparente y deja verla a través, sin ningún scrim/oscurecido
              encima (pedido explícito 2026-08-27: quitar el efecto glass que
              había sobre la foto). */}

          {/* Anillos Recovery/Strain. Strain sigue en placeholder "-%" -- sin
              fuente de datos real todavía (necesitaría el ACWR que ya
              calcula el backend en `readiness_scores`, no expuesto al
              cliente aún). Recovery ya no es placeholder: si el cliente
              rellenó su chequeo diario hoy, se muestra la estimación real
              (computeRecoveryScore); si no, el anillo es un CTA tocable que
              abre ReadinessCheckSheet (opción 3 del hueco Recovery/Strain
              del hero). Mientras `readinessToday` no resuelve, se mantiene
              el placeholder de siempre para no parpadear un CTA de más. */}
          <Pressable
            disabled={!readinessCtaVisible}
            onPress={() => setShowReadinessSheet(true)}
            style={({ pressed }) => [pressed && readinessCtaVisible && { opacity: 0.75 }]}
          >
            <HStack style={styles.ringsRow}>
              <VStack style={styles.ringSide}>
                <Text style={[styles.ringValue, recoveryScore != null && { color: recoveryColor }]}>
                  {recoveryScore != null ? `${recoveryScore}%` : '-%'}
                </Text>
                <Text style={styles.ringLabel}>RECOVERY</Text>
              </VStack>
              <AnimatedRing
                size={r(120)}
                strokeWidth={r(9)}
                percent={recoveryScore ?? 0}
                color={recoveryScore != null ? recoveryColor : 'rgba(255,255,255,0.85)'}
                trackColor="rgba(255,255,255,0.18)"
                duration={0}
              >
                <Icon name={readinessCtaVisible ? 'add-circle-outline' : 'fitness-outline'} size={26} color="rgba(255,255,255,0.6)" />
              </AnimatedRing>
              <VStack style={[styles.ringSide, { alignItems: 'flex-end' as const }]}>
                <Text style={styles.ringValue}>-%</Text>
                <Text style={styles.ringLabel}>STRAIN</Text>
              </VStack>
            </HStack>
            {readinessCtaVisible && <Text style={styles.readinessCtaHint}>Toca para registrar cómo llegas hoy</Text>}
          </Pressable>

          {/* Frase contextual (motivational-phrase, ver sección 4) */}
          {motivationalPhrase && <Text style={styles.heroPhrase}>{motivationalPhrase}</Text>}

          {/* Banner condicional — Estado A (demo) por defecto; Estado B
              (BannerSlider real, ya conectado vía dashboard-detail) solo si
              hasHealthConnected — hoy siempre false, sin integración de salud
              todavía, deja el código listo para cuando exista. */}
          {hasHealthConnected && activeBanner ? (
            <Pressable
              style={styles.bannerCard}
              onPress={() => {
                if (activeBanner.type === 'workout' && activeBanner.workout_id) {
                  navigation?.navigate('MigratedWorkoutPreview', { workoutTemplateId: activeBanner.workout_id, mTitle: activeBanner.title });
                }
              }}
            >
              {activeBanner.bannerslider_image ? (
                <ExpoImage source={{ uri: activeBanner.bannerslider_image }} style={{ width: '100%', height: r(90), borderRadius: r(12) }} contentFit="cover" />
              ) : null}
              <Text style={styles.bannerTitle}>{activeBanner.title}</Text>
            </Pressable>
          ) : (
            // Sin botón "Continuar" a propósito (pedido explícito
            // 2026-08-29): descartaba el aviso vía demoBannerDismissed y no
            // había ningún banner real (activeBanner) detrás que ocupara su
            // sitio -- la pantalla se quedaba con un hueco vacío donde antes
            // estaba este aviso. Fijo mientras no haya banners reales que
            // mostrar en su lugar.
            <Box style={styles.bannerCard}>
              <Icon name="information-circle-outline" size={26} color="#FFFFFF" />
              <Text style={styles.bannerTitle}>Esto son datos de demostración</Text>
              <Text style={styles.bannerText}>
                Los anillos de Recovery/Strain se activarán con datos reales cuando puedas conectar Apple Health o
                Google Health, disponible en una próxima versión de la app.
              </Text>
            </Box>
          )}

          {/* Agua / Actividad -- sustituyen los placeholders "Sueño"/"Balance
              de carga" (pedido explícito: moverlas dentro de la foto del
              hero, justo debajo del banner de demo, y sacar "Reto para
              empezar" fuera de la imagen). Datos reales de dashboard-detail
              (agua: total/goal en ml; actividad: kcal estimadas de pasos +
              kcal reales de entrenamientos). */}
          <HStack space="sm" style={styles.miniCardsRow}>
            <Box style={styles.miniCard}>
              <HStack className="items-center justify-between">
                <HStack space="xs" className="items-center">
                  <Icon name="water" size={15} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.miniCardTitle}>Agua</Text>
                </HStack>
                {/* Water Tracker desactivado en esta primera versión (ver
                    constants/featureFlags.ts, WATER_TRACKER_ENABLED). */}
                <Pressable
                  style={styles.miniCardAddBtn}
                  onPress={() =>
                    WATER_TRACKER_ENABLED
                      ? navigation?.navigate('MigratedWaterTracker')
                      : showToast('Próximamente', { description: 'Podrás registrar tu agua en la próxima versión de la app.' })
                  }
                  hitSlop={8}
                >
                  <Icon name="add" size={14} color="#FFFFFF" />
                </Pressable>
              </HStack>
              <Text style={styles.miniCardValue}>
                {waterTotal}<Text style={styles.miniCardValueMuted}>/{waterGoal || '--'} mL</Text>
              </Text>
              <HStack style={styles.glassGrid}>
                {Array.from({ length: totalGlasses }, (_, i) => (
                  <Icon
                    key={i}
                    name={i < filledGlasses ? 'water' : 'water-outline'}
                    size={13}
                    color={i < filledGlasses ? '#7DD3FC' : 'rgba(255,255,255,0.35)'}
                  />
                ))}
              </HStack>
            </Box>
            <Box style={styles.miniCard}>
              <HStack className="items-center justify-between">
                <HStack space="xs" className="items-center">
                  <Icon name="walk" size={15} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.miniCardTitle}>Actividad</Text>
                </HStack>
                {/* Activity Tracker desactivado en esta primera versión (ver
                    constants/featureFlags.ts, ACTIVITY_TRACKER_ENABLED). */}
                <Pressable
                  style={styles.miniCardAddBtn}
                  onPress={() =>
                    ACTIVITY_TRACKER_ENABLED
                      ? navigation?.navigate('MigratedActivityTracker')
                      : showToast('Próximamente', { description: 'Podrás registrar tu actividad en la próxima versión de la app.' })
                  }
                  hitSlop={8}
                >
                  <Icon name="add" size={14} color="#FFFFFF" />
                </Pressable>
              </HStack>
              <Text style={styles.miniCardValue}>
                {activityKcal}<Text style={styles.miniCardValueMuted}>/{activityGoalKcal || '--'} kcal</Text>
              </Text>
              <VStack style={{ marginTop: r(6), gap: r(4) }}>
                <Text style={styles.miniCardSubRow}>Pasos · {stepsCount} · {stepsKcal} kcal</Text>
                <Text style={styles.miniCardSubRow}>Entrenamientos · {workoutKcal} kcal</Text>
              </VStack>
            </Box>
          </HStack>
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

        <Box style={{ paddingHorizontal: r(20), marginTop: r(16) }}>
          <StartupChecklist steps={startupSteps} />
        </Box>

        {/* Mi plan de hoy — para un cliente 1:1 esta ES su sección personalizada
            (viene del calendario que le asigna su coach, ProgramDayAssignment),
            así que se relabela y se destaca en vez de dejarla igual que
            cualquier otra sección genérica. Fusiona workouts de hoy CON
            check-ins/formularios pendientes (obligaciones con fecha, is_due
            calculado por el backend) en un solo bloque — antes eran dos
            secciones separadas. Máximo 3 items visibles; con más, un botón
            lleva al calendario completo (que ya abre en el día de hoy por
            defecto, sin necesidad de parámetros). onLayout mide dónde
            empieza esta sección para el oscurecido progresivo del fondo (ver
            miPlanOffsetY). */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }} onLayout={handleMiPlanLayout}>
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
          <WeekComplianceRow completedDays={weeklyWorkouts} progressDays={weeklyWorkoutsProgress} color={C.orange} size={r(28)} />
        </Card>

        {/* Hábitos — a diferencia de Check-ins (que se oculta si no hay nada
            pendiente porque el cliente no puede crear uno por su cuenta),
            esta sección SIEMPRE se muestra: con 0 hábitos, "Ver todos"/tocar
            la tarjeta es el único camino real para llegar a Añadir hábito
            (biblioteca o personal) — ocultarla dejaría al cliente sin forma
            de empezar. Mismo patrón que Recursos (visible con estado vacío). */}
        <HStack className="justify-between items-center px-5" style={{ marginTop: r(24), marginBottom: r(12) }}>
          <Text style={styles.sectionTitle}>Hábitos</Text>
          <TutorialTarget id="home-habits-link" scrollRef={scrollRef}>
            <Pressable onPress={() => navigation?.navigate(habits.length > 0 ? 'MigratedHabits' : 'MigratedHabitAdd')}>
              <Text style={styles.seeAll}>{habits.length > 0 ? `Ver todos (${habits.length})` : 'Añadir'}</Text>
            </Pressable>
          </TutorialTarget>
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
                <WeekComplianceRow
                  completedDays={computeWeekCompliance(h.logs)}
                  progressDays={computeWeekProgress(h.logs, h.target_value)}
                  color={C.orange}
                  size={r(24)}
                />
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
          <TutorialTarget id="home-nutrition-link" scrollRef={scrollRef}>
            <Pressable style={styles.nutritionLink} onPress={() => navigation?.navigate('MigratedPlan')}>
              <Text style={styles.nutritionLinkText}>Añadir comidas</Text>
              <Icon name="arrow-forward" size={14} color={C.orange} style={{ marginLeft: r(8) }} />
            </Pressable>
          </TutorialTarget>
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
                    <ExpoImage
                      source={w.thumbnail ? { uri: w.thumbnail } : pickWorkoutFallbackImage(w.id)}
                      style={styles.blogImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
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
                  <Box style={styles.blogImage}>
                    <ExpoImage source={resourceImageSource(r)} style={styles.blogImage} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                    <Box style={styles.resourceTypeBadge}>
                      <Icon
                        name={r.type === 'video' ? 'play-circle-outline' : r.type === 'link' ? 'link-outline' : 'document-text-outline'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </Box>
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

        {/* Need Help → FitBot -- chat desactivado en esta primera versión
            (ver constants/featureFlags.ts, CHAT_ENABLED): sin moderación ni
            forma de reportar mensajes todavía, riesgo real de rechazo en
            revisión de Apple/Google. */}
        <Box style={{ height: r(16) }} />
        <Pressable
          onPress={() =>
            CHAT_ENABLED
              ? navigation?.navigate('MigratedChatting', { isDirect: true })
              : showToast('Próximamente', { description: 'Podrás hablar con Be Stronger AI en la próxima versión de la app.' })
          }
        >
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

        <Box style={{ height: TAB_BAR_CLEARANCE }} />
      </Animated.ScrollView>

      {/* Chequeo diario opcional (ver nota en el anillo Recovery más arriba)
          -- al guardar, se refleja al instante en el anillo sin esperar a un
          refetch completo de fetchData(). */}
      <ReadinessCheckSheet
        visible={showReadinessSheet}
        onClose={() => setShowReadinessSheet(false)}
        onSubmitted={(values) => setReadinessToday({ required: readinessToday?.required ?? false, submitted_today: true, today: values })}
      />

      {/* Menú de usuario (perfil, favoritos, ajustes, salud, comunidad, logout).
          Rediseño 2026-08-23 (pedido explícito, capturas de referencia de la
          propia Bevel real): en vez de una lista plana con divisores finos,
          tarjetas blancas agrupadas por sección sobre fondo gris, con una
          barra superior fija (cerrar + título "Ajustes"), igual que el
          "Ajustes" real de Bevel. */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        {/* RNPressable nativo aqui a proposito, no el wrapper @components/ui/pressable
            (basado en usePress de react-aria) -- ese wrapper no bloquea de forma
            fiable la propagacion del toque al padre via stopPropagation, asi que
            cualquier toque dentro de la hoja tambien cerraba el menu (mismo patron
            ya usado y verificado en ConfirmDialog.tsx). */}
        <RNPressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <RNPressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
            <Box style={styles.menuHandle} />
            <Box style={styles.menuHeaderBar}>
              <Pressable style={styles.menuCloseBtn} onPress={() => setShowMenu(false)}>
                <Icon name="close" size={18} color={C.textPrimary} />
              </Pressable>
              <Text style={styles.menuTitle}>Ajustes</Text>
            </Box>

            <ScrollView style={styles.menuScroll} contentContainerStyle={{ paddingBottom: r(24) }} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSectionLabel}>Cuenta</Text>
              <Box style={styles.menuCard}>
                {/* MigratedProfileModal (no MigratedProfile) -- misma screen,
                    registrada aparte en App.tsx con presentation:'modal' para
                    que abrirla desde aquí se sienta como un diálogo, sin
                    duplicar el contenido de profile_screen.tsx. */}
                <Pressable onPress={() => navigateFromMenu('MigratedProfileModal')}>
                  <HStack space="md" className="items-center px-4 py-3">
                    <AvatarMem uri={user?.profile_image} name={user?.display_name || displayName} size={40} />
                    <VStack className="flex-1">
                      <Text style={styles.menuItemText}>{user?.display_name || displayName}</Text>
                      <Text style={styles.menuItemSubtext}>Ver tu perfil</Text>
                    </VStack>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                <Pressable onPress={() => navigateFromMenu('MigratedFavourite')}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="heart-outline" size={18} color={C.destructive} bg={C.destructive10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Mis Favoritos</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
              </Box>

              <Text style={styles.menuSectionLabel}>Salud y dispositivos</Text>
              <Box style={styles.menuCard}>
                <Pressable
                  onPress={() =>
                    showToast('Próximamente', {
                      description: `Podrás empezar a sincronizar ${HEALTH_SYNC_COMING_SOON_NAME} en la siguiente versión de la app.`,
                    })
                  }
                >
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="fitness-outline" size={18} color={C.success} bg={C.success10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>{HEALTH_SYNC_COMING_SOON_NAME}</Text>
                    <Box style={styles.comingSoonPill}>
                      <Text style={styles.comingSoonPillText}>Próximamente</Text>
                    </Box>
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                <Pressable
                  onPress={() =>
                    showToast('Próximamente', {
                      description: 'Podrás conectar tu smartwatch en una próxima versión de la app.',
                    })
                  }
                >
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="watch-outline" size={18} color={C.blue} bg={C.blue10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Smart Watch</Text>
                    <Box style={styles.comingSoonPill}>
                      <Text style={styles.comingSoonPillText}>Próximamente</Text>
                    </Box>
                  </HStack>
                </Pressable>
              </Box>

              {/* Modo oscuro automático por hora (2026-08-21) -- "Auto" sigue
                  la hora del dispositivo (isNightHour en theme.ts), el usuario
                  puede fijarlo a Claro/Oscuro y eso manda hasta que vuelva a
                  elegir Auto. Ver helper/useAppColorMode.ts. El selector
                  inline de 3 botones se sustituye por una fila que lleva a
                  MigratedAppearance (pedido explícito, captura de referencia
                  de Bevel: "Aspecto" con tarjetas de vista previa) -- tener
                  las dos formas de cambiar el mismo ajuste en el mismo menú
                  habría sido redundante. Sección renombrada de "Apariencia" a
                  "General" (mismo nombre que la referencia) al añadir aquí
                  también la fila de Notificaciones -- ya no es solo aspecto. */}
              <Text style={styles.menuSectionLabel}>General</Text>
              <Box style={styles.menuCard}>
                <Pressable onPress={() => navigateFromMenu('MigratedAppearance')}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="contrast-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <VStack className="flex-1">
                      <Text style={styles.menuItemText}>Aspecto</Text>
                      <Text style={styles.menuItemSubtext}>
                        {themePreference === 'auto' ? 'Automático' : themePreference === 'light' ? 'Leve' : 'Oscuro'}
                      </Text>
                    </VStack>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                {/* MigratedNotificationSettings (no MigratedNotification, que
                    es el buzón de notificaciones ya recibidas) -- pedido
                    explícito, captura de referencia: switch que refleja el
                    permiso real del sistema, ver notification_settings_screen.tsx. */}
                <Pressable onPress={() => navigateFromMenu('MigratedNotificationSettings')}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="notifications-outline" size={18} color={C.warning60} bg={C.warning10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Notificaciones</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
              </Box>

              <Text style={styles.menuSectionLabel}>Más</Text>
              <Box style={styles.menuCard}>
                <Pressable onPress={() => navigateFromMenu('MigratedCommunity')}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="people-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Comunidad</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                {/* Reemplaza el botón "+" flotante de debug que se quitó del
                    hero (se solapaba con el "+" real de accesos rápidos) --
                    sin esto ScreenExplorer se quedaba sin ningún punto de
                    entrada real en la app. */}
                <Pressable onPress={() => navigateFromMenu('ScreenExplorer')}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="construct-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Screen Explorer</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
              </Box>

              {/* "Recursos" (pedido explícito, captura de referencia). Las 2
                  primeras filas abren MigratedAppFeedback -- formulario real
                  que guarda en el backend (mismo mecanismo que
                  ScreenReviewFab/"Revisar pantalla": v1/app-feedback,
                  visible después desde el admin panel, ver
                  docs/PENDIENTE_BACKEND_ADMIN.md -- el endpoint todavía no
                  existe, pero el formulario y la llamada sí son reales). La
                  3ª depende de configuración que hoy está vacía en
                  constants/appLinks.ts (ID de App Store, publicación en
                  Play Store) -- con eso vacío, avisa que aún no está
                  disponible en vez de abrir un deep link a una ficha
                  inexistente. */}
              <Text style={styles.menuSectionLabel}>Recursos</Text>
              <Box style={styles.menuCard}>
                <Pressable onPress={() => navigateFromMenu('MigratedAppFeedback', { type: 'feature_request' })}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="bulb-outline" size={18} color={C.textSecondary} bg={C.gray70} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Solicitar una función</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                <Pressable onPress={() => navigateFromMenu('MigratedAppFeedback', { type: 'bug_report' })}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="bug-outline" size={18} color={C.textSecondary} bg={C.gray70} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Informar de un error</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                <Pressable onPress={handleRateApp}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="star-outline" size={18} color={C.textSecondary} bg={C.gray70} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Valora Be Stronger en la tienda</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
              </Box>

              {/* Aviso legal (pedido explícito, captura de referencia) --
                  ambas pantallas ya existían y ya funcionaban (usadas en el
                  flujo de registro/onboarding), solo no estaban enlazadas
                  todavía desde Ajustes. */}
              <Text style={styles.menuSectionLabel}>Aviso legal</Text>
              <Box style={styles.menuCard}>
                {/* "Términos del servicio" abre la web real (pedido
                    explícito) en vez de navegar a MigratedTermsAndConditions
                    -- esa pantalla interna solo tenía un texto placeholder en
                    inglés sin actualizar, la web es la fuente real. */}
                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    Linking.openURL('https://bestronger.es/terms-and-conditions/');
                  }}
                >
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="document-text-outline" size={18} color={C.textSecondary} bg={C.gray70} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Términos del servicio</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
                <Divider className="ml-4" />
                <Pressable onPress={() => navigateFromMenu('MigratedPrivacyPolicy')}>
                  <HStack className="items-center px-4 py-3">
                    <AppIcon name="shield-checkmark-outline" size={18} color={C.textSecondary} bg={C.gray70} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                    <Text style={[styles.menuItemText, { flex: 1 }]}>Política de privacidad</Text>
                    <Icon name="chevron-forward" size={18} color={C.textSecondary} />
                  </HStack>
                </Pressable>
              </Box>

              {/* "Borrar caché y recargar todos los datos" -- remonta el
                  NavigationContainer entero (ver AppReloadContext.tsx), no
                  vacía AsyncStorage (perdería sesión de entrenamiento en
                  curso / borrador de onboarding / recordatorios locales sin
                  backend). Confirmación primero porque descarta cualquier
                  estado en memoria de las pantallas montadas. */}
              <Pressable
                style={styles.menuActionBtn}
                onPress={() =>
                  Alert.alert(
                    'Recargar todos los datos',
                    'Se recargará toda la app desde cero. Cualquier cambio sin guardar en la pantalla actual se perderá.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Recargar', style: 'destructive', onPress: () => { setShowMenu(false); reloadApp(); } },
                    ]
                  )
                }
              >
                <Text style={styles.menuActionBtnText}>Borrar caché y recargar todos los datos</Text>
              </Pressable>

              <Pressable style={styles.menuActionBtn} onPress={handleResetTutorial}>
                <Text style={styles.menuActionBtnText}>Reiniciar tutorial</Text>
              </Pressable>

              {/* "Habilitar diagnósticos" (pedido explícito) -- sin SDK de
                  crash-reporting instalado, el switch activa/desactiva un
                  buffer real en memoria de los propios logs de la app (ver
                  helper/logger.ts), no un flag decorativo. Fila con Switch,
                  no un botón de tap: es un ajuste persistente (igual que
                  Apple Health/Smart Watch arriba), no una acción puntual. */}
              <Text style={styles.menuSectionLabel}>Diagnóstico</Text>
              <Box style={styles.menuCard}>
                <HStack className="items-center px-4 py-3">
                  <AppIcon name="pulse-outline" size={18} color={C.textSecondary} bg={C.gray70} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                  <VStack className="flex-1" style={{ marginRight: r(12) }}>
                    <Text style={styles.menuItemText}>Habilitar diagnósticos</Text>
                    <Text style={styles.menuItemSubtext}>Guarda un registro local que puedes enviar al desarrollador</Text>
                  </VStack>
                  <Switch
                    value={diagnosticsOn}
                    onValueChange={handleToggleDiagnostics}
                    trackColor={{ false: C.gray70, true: C.primary }}
                    thumbColor={C.white}
                  />
                </HStack>
              </Box>
              <Pressable style={styles.menuActionBtn} onPress={handleSendLogs}>
                <Text style={styles.menuActionBtnText}>Enviar registros al desarrollador</Text>
              </Pressable>

              {/* Redes sociales (pedido explícito) -- constants/appLinks.ts
                  no tiene handles reales todavía (SOCIAL_LINKS vacío), así
                  que esta fila no se renderiza hasta que se rellenen: un
                  icono que no lleva a ninguna URL real sería el mismo
                  problema que ya tenía about_us_screen.tsx. */}
              {SOCIAL_LINKS.length > 0 && (
                <HStack className="justify-center" space="lg" style={{ marginTop: r(20) }}>
                  {SOCIAL_LINKS.map((s) => (
                    <Pressable key={s.name} onPress={() => Linking.openURL(s.url)}>
                      <AppIcon name={s.icon} size={20} color={C.textSecondary} bg={C.gray70} containerSize={r(40)} />
                    </Pressable>
                  ))}
                </HStack>
              )}

              {/* Logo + versión real (Constants.expoConfig), no hardcodeada. */}
              <Box className="items-center" style={{ marginTop: r(24), marginBottom: r(8) }}>
                <ExpoImage source={require('../../assets/applogo.png')} style={{ width: r(32), height: r(32), borderRadius: r(8) }} contentFit="cover" />
                <Text style={styles.menuFooterText}>Be Stronger {Constants.expoConfig?.version ?? ''}</Text>
              </Box>

              <Pressable style={styles.menuLogoutBtn} onPress={handleLogout}>
                <Text style={styles.menuLogoutText}>Cerrar sesión</Text>
              </Pressable>
            </ScrollView>
          </RNPressable>
        </RNPressable>
      </Modal>
    </SafeAreaView>
  );
}
