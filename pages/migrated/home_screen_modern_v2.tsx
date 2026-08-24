import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Platform ,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CLEARANCE } from '@components/NavigationTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedProps,
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
import { computeWeekCompliance } from '@components/weekCompliance';
import { useAuth } from '../../store/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIGMA_W = 375;
const FIGMA_H = 812;

// Modulo-scope, igual que AnimatedImage en NavigationTab -- evita recrear el
// wrapper animado de BlurView en cada render.
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
// Recorrido de scroll (px) sobre el que el header pasa de nitido a
// glass-effect total, estilo KOTCHA: 0 = arriba del todo (foto con toda su
// claridad), HERO_BLUR_SCROLL_RANGE = la foto ya no se distingue -- blur al
// máximo (casi opaco de por sí) + oscurecido animado por encima que la tapa
// del todo, para que "desaparezca" de verdad y no se quede a medias. Subido
// de 160 a 280 (pedido explícito: el oscurecido se notaba "de golpe"), y
// ahora de 280 a 420 (mismo pedido repetido: seguía notándose demasiado
// rápido nada más empezar a hacer scroll) para repartir el mismo recorrido
// de opacidad en todavía más scroll.
const HERO_BLUR_SCROLL_RANGE = 420;
const HERO_BLUR_MAX_INTENSITY = 100;
const HERO_DARKEN_MAX_OPACITY = 0.92;
// Antes de hacer scroll (scrollY=0) el oscurecido animado partía de 0 -- la
// foto se veía "demasiado clara" en reposo. Con este suelo, ya arranca algo
// oscurecida en reposo y sube hasta HERO_DARKEN_MAX_OPACITY con el scroll.
const HERO_DARKEN_MIN_OPACITY = 0.18;

// Saludo dinamico por hora local del dispositivo (no posicion solar, no hace
// falta suncalc) -- mismos rangos que usaria cualquier reloj: mañana antes de
// mediodia, tarde hasta el atardecer, noche el resto.
function greetingForHour(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
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

// Degradados por mood -- antes eran un único marrón cálido fijo
// (rgba(20,11,6,...)) reutilizado para las 3 fotos, así que desentonaba con
// el cielo azul de la foto de día y quedaba raro sobre la foto de noche (ya
// oscura de por sí). Cada mood tiene su propio tono: cálido dorado para
// amanecer/atardecer, azul frío para día, casi negro/navy para noche.
// `seam` mantiene el criterio ya establecido (revisión 2026-08-20): el
// último color SIEMPRE es C.bg, nunca alpha 0, para que la transición acabe
// en el color de fondo real de la app en vez de un lavado sucio.
const HERO_GRADIENTS: Record<
  HeroMood,
  { scrim: [string, string]; close: [string, string]; darken: string; seam: (bg: string) => [string, string, string, string] }
> = {
  sunriseSunset: {
    scrim: ['rgba(40,20,8,0.22)', 'rgba(28,13,5,0.52)'],
    close: ['rgba(40,18,6,0)', 'rgba(30,14,6,0.68)'],
    darken: '#2B1608',
    seam: (bg) => ['rgba(30,14,6,0.68)', 'rgba(30,14,6,0.42)', 'rgba(30,14,6,0.16)', bg],
  },
  day: {
    scrim: ['rgba(10,22,38,0.18)', 'rgba(8,16,30,0.48)'],
    close: ['rgba(8,16,30,0)', 'rgba(10,20,34,0.62)'],
    darken: '#0E1B2E',
    seam: (bg) => ['rgba(10,20,34,0.62)', 'rgba(10,20,34,0.38)', 'rgba(10,20,34,0.14)', bg],
  },
  night: {
    scrim: ['rgba(0,4,12,0.3)', 'rgba(0,3,9,0.6)'],
    close: ['rgba(0,3,9,0)', 'rgba(2,4,10,0.7)'],
    darken: '#04070D',
    seam: (bg) => ['rgba(2,4,10,0.7)', 'rgba(2,4,10,0.44)', 'rgba(2,4,10,0.16)', bg],
  },
};

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
  const { preference: themePreference, setPreference: setThemePreference, colors: C } = useAppColorMode();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const firstLoadDone = useRef(false);

  // Glass-effect progresivo del hero header: a medida que se hace scroll,
  // la imagen/gradiente de fondo se va desenfocando (como en KOTCHA) en vez
  // de desaparecer de golpe bajo el resto del contenido.
  const scrollY = useSharedValue(0);
  const heroScrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  // Plegar la barra de pestañas al hacer scroll (pedido explícito, ver
  // store/TabBarScrollContext.tsx) -- reutiliza el mismo scrollY que ya
  // existía para el efecto de blur del hero. Mismo patrón que
  // showCompactSummary en plan_screen.tsx: reaccionar sobre el booleano ya
  // resuelto (no el scrollY crudo) y solo avisar a React cuando cambia de
  // lado, para no cruzar al hilo de JS en cada frame de scroll.
  const { reportScrollY } = useTabBarScroll();
  useAnimatedReaction(
    () => scrollY.value > 8,
    (collapsed, prevCollapsed) => {
      if (collapsed !== prevCollapsed) runOnJS(reportScrollY)(scrollY.value);
    }
  );
  const heroBlurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(scrollY.value, [0, HERO_BLUR_SCROLL_RANGE], [0, HERO_BLUR_MAX_INTENSITY], Extrapolation.CLAMP),
  }));
  // El blur solo desenfoca -- no basta para que la foto "desaparezca" del
  // todo (sigue habiendo luz/color de fondo). Un oscurecido animado encima,
  // que sube de 0 a casi opaco en el mismo recorrido, es lo que de verdad la
  // tapa hasta el punto de no verse.
  const heroDarkenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HERO_BLUR_SCROLL_RANGE], [HERO_DARKEN_MIN_OPACITY, HERO_DARKEN_MAX_OPACITY], Extrapolation.CLAMP),
  }));

  // Este bloque ("Reto para empezar") es la entrada al tutorial guiado:
  // cada paso es uno de los 7 retos esenciales (ver constants/tutorialChallenges.ts).
  // "done" viene de useTutorial() (persistido, se marca solo cuando el
  // usuario completa la acción real -- nunca a mano aquí). Tocar un paso
  // lanza su spotlight (TutorialOverlay) en vez de navegar directamente.
  const { isDone: isTutorialDone, startChallenge } = useTutorial();
  const startupSteps: StartupChecklistStep[] = useMemo(
    () =>
      TUTORIAL_CHALLENGES.map((challenge) => ({
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
  // recalcula por render (barato, solo lee la hora actual) y sirve tanto
  // para elegir la foto de fondo como su paleta de degradado a juego (ver
  // HERO_GRADIENTS más abajo).
  const heroMood = getHeroMoodForHour(new Date().getHours());
  const heroGradient = HERO_GRADIENTS[heroMood];
  const [showMenu, setShowMenu] = useState(false);
  const [appleHealthOn, setAppleHealthOn] = useState(true);
  const [smartWatchOn, setSmartWatchOn] = useState(false);

  // Nueva cabecera (estilo Helix, ver docs/Nueva_Cabecera_Home_Helix.md).
  const [motivationalPhrase, setMotivationalPhrase] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<BannerSliderItem | null>(null);
  // Estado B del banner (slider real conectado) solo aplica si el cliente ya
  // dio permisos de HealthKit/Health Connect -- esa integracion (ver
  // react-native-health-link en el doc) todavia no existe en la app, asi que
  // por ahora esto siempre es false y el Estado A (demo) es el unico
  // disponible. El codigo del Estado B ya queda listo, solo inactivo.
  const hasHealthConnected = false;
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<boolean[]>([]);
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
    container: { flex: 1, backgroundColor: C.bg },
    // Nueva cabecera estilo Helix (docs/Nueva_Cabecera_Home_Helix.md). Fondo
    // Con foto real de fondo (amanecer/atardecer, día o noche, ver
    // getHeroMoodForHour) + scrim oscuro -- antes era un LinearGradient
    // plano; el texto blanco de encima sigue necesitando fondo oscuro real,
    // ahora lo da el scrim. Sin border-radius inferior a propósito (revisión
    // 2026-08-19): el bloque superior se funde con "Mi plan de hoy" mediante
    // degradado de color (ver seamGradient más abajo), no con una esquina
    // redondeada -- mismo criterio aplicado ahora a la foto.
    // paddingBottom subido de 24 a 48 (pedido explícito: "haz la imagen un
    // poco más vertical") -- más foto real antes de que empiece el
    // degradado de cierre, no solo un recorrido de gradiente más largo.
    // height: winH (petición explícita, 2026-08-22 -- "quiero que la imagen
    // ocupe todo el tamaño de la screen según entras") -- con el 100% de
    // winH crudo el contenido se quedaba anclado arriba dejando un margen
    // muerto enorme debajo, porque winH incluye zonas que ya no son
    // "pantalla visible" (status bar, home indicator, barra flotante de
    // pestañas). Se probó luego un 64% fijo, pero al ser una fracción fija
    // el hueco muerto reaparece en pantallas más altas (revisión 2026-08-24,
    // reportado con captura). Fix real: altura = viewport visible exacto
    // (winH menos el inset inferior seguro menos la barra flotante), así la
    // foto llena TODO lo que se ve al entrar en cualquier tamaño de
    // pantalla, sin cálculo de porcentaje de por medio.
    heroHeader: {
      height: Math.max(r(360), winH - insets.bottom - TAB_BAR_CLEARANCE),
      paddingBottom: r(48),
      paddingHorizontal: r(20),
      overflow: 'hidden' as const,
    },
    heroDarkenLayer: { backgroundColor: heroGradient.darken },
    heroCloseGradient: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, height: r(120) },
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
    // Degradado de transición entre el bloque superior y "Mi plan de hoy" —
    // sustituye el borde redondeado que había antes (petición 2026-08-19).
    // Revisión 2026-08-20: el degradado quedaba "cutre" (salto duro de solo 2
    // colores planos, naranja -> bg) y terminaba antes de llegar a la altura
    // de las tarjetas de Sueño/Balance de carga. Se sube la altura para que
    // el tramo visible llegue hasta, aproximadamente, la mitad vertical de
    // esas tarjetas (ver miniCardsRow) — mismo marginTop = -altura/2 de
    // antes, solo escalado hacia arriba para cubrir más superficie.
    seamGradient: { height: r(130), marginTop: r(-1) },
    // Agua/Actividad -- ahora viven DENTRO de heroHeader (debajo del banner
    // de demo, todavía sobre la foto), no a caballo sobre el degradado como
    // las tarjetas placeholder que sustituyen. Sin paddingHorizontal propio:
    // ya lo hereda de heroHeader.
    miniCardsRow: { marginTop: r(16) },
    heroPhrase: { fontSize: r(14), color: 'rgba(255,255,255,0.92)', textAlign: 'center' as const, lineHeight: r(20), marginBottom: r(16) },
    bannerCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: r(18), padding: r(16), alignItems: 'center' as const, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
    bannerTitle: { fontSize: r(14), fontFamily: FONT.bold, color: '#FFFFFF', marginTop: r(8) },
    bannerText: { fontSize: r(12), color: 'rgba(255,255,255,0.75)', textAlign: 'center' as const, marginTop: r(4), lineHeight: r(17) },
    bannerBtn: { backgroundColor: '#FFFFFF', borderRadius: r(999), paddingHorizontal: r(24), paddingVertical: r(9), marginTop: r(12) },
    bannerBtnText: { fontSize: r(13), fontFamily: FONT.bold, color: C.orange },
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
    themeOptionBtn: {
      flex: 1,
      paddingVertical: r(9),
      borderRadius: r(10),
      alignItems: 'center' as const,
      backgroundColor: C.gray70,
    },
    themeOptionBtnActive: { backgroundColor: C.orange },
    themeOptionText: { fontSize: r(13), fontFamily: FONT.semiBold, color: C.textSecondary },
    themeOptionTextActive: { color: '#FFFFFF' },
  }), [sc, r, C, winH, insets.bottom, heroGradient]);

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
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const dayData: any = daysByDate.get(dateStr);
          // Bug real (reportado con captura, 2026-08-24): antes marcaba el
          // día como cumplido con solo tener un workout ASIGNADO ese día
          // (dayData.workouts.length > 0), sin comprobar si el cliente lo
          // completó de verdad -- por eso "Cumplimiento semanal" podía
          // mostrar 7 de 7 con entrenamientos sin hacer. Ahora exige que al
          // menos uno de los workouts asignados ese día esté en
          // completedAssignmentIdSet (mismas sesiones completadas que ya
          // usa "Mi plan de hoy" para distinguir tarjeta completada/pendiente).
          const dayCompleted = !!dayData?.workouts?.some((w: any) => completedAssignmentIdSet.has(w.assignment_id));
          weekBools.push(dayCompleted);
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
        <TutorialTarget key={item.key} id="home-checkin-card">{checkinCard}</TutorialTarget>
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
      <TutorialTarget key={item.key} id="home-today-workout-card">{workoutCard}</TutorialTarget>
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
      {/* Barra fija con efecto glass (calendario / saludo / notificaciones /
          ajustes) — se mantiene estática al hacer scroll, mostrando
          desenfocado lo que pasa por debajo (petición 2026-08-19). Vive fuera
          del ScrollView a propósito. */}
      <Box style={styles.stickyHeader}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Box style={{ paddingTop: insets.top + r(10) }}>
          <HStack style={styles.heroTopBar}>
            <Pressable style={styles.heroIconBtn} onPress={() => navigation?.navigate('MigratedMyProgramCalendar')}>
              <Icon name="calendar-outline" size={19} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.heroGreeting} numberOfLines={1}>
              {greetingForHour(new Date().getHours())}, {displayName}
            </Text>
            <HStack space="sm" className="items-center">
              <Pressable style={styles.heroIconBtn} onPress={() => navigation?.navigate('MigratedNotification')}>
                <Icon name="notifications-outline" size={18} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <Box style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                  </Box>
                )}
              </Pressable>
              <Pressable style={styles.heroIconBtn} onPress={() => setShowMenu(true)}>
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
          {/* Foto real de fondo (amanecer/atardecer, día o noche según la
              hora) en vez del degradado plano anterior. */}
          <ExpoImage
            source={HERO_IMAGES[heroMood]}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          {/* Scrim oscuro sobre la foto -- el texto/iconos en blanco de la
              cabecera necesitan contraste real, la foto sola (sobre todo
              día/amanecer, cielo muy claro) no lo da. Color a juego con el
              mood de la foto (ver HERO_GRADIENTS) -- antes era un negro
              plano fijo para las 3 fotos, por lo que no seguía la tonalidad
              real de cada una (cálida en amanecer/atardecer, fría en día,
              casi negra ya en noche). */}
          <LinearGradient
            colors={heroGradient.scrim}
            style={StyleSheet.absoluteFill}
          />
          {/* Glass-effect progresivo (estilo KOTCHA): el fondo del hero se
              desenfoca a medida que se hace scroll -- se renderiza primero
              para quedar detrás del contenido (texto/iconos), que se
              mantiene nítido encima. */}
          <AnimatedBlurView
            style={StyleSheet.absoluteFill}
            animatedProps={heroBlurAnimatedProps}
            tint="dark"
            pointerEvents="none"
          />
          {/* Oscurecido animado: sube junto con el blur hasta tapar la foto
              casi del todo -- sin esto el blur por sí solo no llega a "no
              verse", se queda en una foto borrosa pero reconocible. */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.heroDarkenLayer, heroDarkenAnimatedStyle]}
          />
          {/* Degradado de cierre, fijo (no animado): sin él, el límite
              inferior de la foto contra el resto del contenido se nota como
              un corte -- este remate suaviza esa transición siempre, esté o
              no en marcha el efecto de scroll. Color a juego con el mood de
              la foto, mismo criterio que el scrim de arriba. */}
          <LinearGradient
            colors={heroGradient.close}
            style={styles.heroCloseGradient}
            pointerEvents="none"
          />

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
            !demoBannerDismissed && (
              <Box style={styles.bannerCard}>
                <Icon name="information-circle-outline" size={26} color="#FFFFFF" />
                <Text style={styles.bannerTitle}>Esto son datos de demostración</Text>
                <Text style={styles.bannerText}>
                  Los anillos de Recovery/Strain se activarán con datos reales en cuanto conectes Apple Health o
                  Health Connect.
                </Text>
                <Pressable style={styles.bannerBtn} onPress={() => setDemoBannerDismissed(true)}>
                  <Text style={styles.bannerBtnText}>Continuar</Text>
                </Pressable>
              </Box>
            )
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
                <Pressable style={styles.miniCardAddBtn} onPress={() => navigation?.navigate('MigratedWaterTracker')} hitSlop={8}>
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
                <Pressable style={styles.miniCardAddBtn} onPress={() => navigation?.navigate('MigratedActivityTracker')} hitSlop={8}>
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

        {/* Degradado de transición hacia "Mi plan de hoy" (petición
            2026-08-19: fusión por color, no por borde redondeado; revisión
            2026-08-20: varios pasos intermedios de opacidad en vez de saltar
            de golpe entre 2 colores planos, para que la costura no se vea
            como un corte duro). Recoloreado de naranja a la misma paleta
            oscura/cálida del heroCloseGradient de arriba -- con foto de fondo
            real el remate ya no es naranja, tiene que continuar el mismo
            tono para que ambos degradados se lean como uno solo. Termina en
            C.bg opaco (no en alpha 0): desvanecer un color oscuro sobre un
            fondo claro dejaba un lavado grisáceo/sucio en vez de una
            transición limpia -- pedido explícito de que la imagen "termine
            con un degradado hacia el color de fondo del resto de la
            pantalla", literal. Revisión 2026-08-24: el tono ya no es un
            marrón fijo para las 3 fotos -- sigue el mismo mood (heroGradient)
            que el scrim y el heroCloseGradient de arriba, para que las 3
            franjas horarias se lean como una sola transición coherente en
            vez de un remate genérico desconectado de la foto real. */}
        <LinearGradient
          colors={heroGradient.seam(C.bg)}
          locations={[0, 0.3, 0.6, 1]}
          style={styles.seamGradient}
        />

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
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
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
                <HStack className="items-center px-4 py-3">
                  <AppIcon name="fitness-outline" size={18} color={C.success} bg={C.success10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                  <Text style={[styles.menuItemText, { flex: 1 }]}>Apple Health</Text>
                  <Switch
                    value={appleHealthOn}
                    onValueChange={setAppleHealthOn}
                    trackColor={{ false: C.gray70, true: C.primary }}
                    thumbColor={C.white}
                  />
                </HStack>
                <Divider className="ml-4" />
                <HStack className="items-center px-4 py-3">
                  <AppIcon name="watch-outline" size={18} color={C.blue} bg={C.blue10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                  <Text style={[styles.menuItemText, { flex: 1 }]}>Smart Watch</Text>
                  <Switch
                    value={smartWatchOn}
                    onValueChange={setSmartWatchOn}
                    trackColor={{ false: C.gray70, true: C.primary }}
                    thumbColor={C.white}
                  />
                </HStack>
              </Box>

              {/* Modo oscuro automático por hora (2026-08-21) -- "Auto" sigue
                  la hora del dispositivo (isNightHour en theme.ts), el usuario
                  puede fijarlo a Claro/Oscuro y eso manda hasta que vuelva a
                  elegir Auto. Ver helper/useAppColorMode.ts. */}
              <Text style={styles.menuSectionLabel}>Apariencia</Text>
              <Box style={[styles.menuCard, { padding: r(14) }]}>
                <HStack className="items-center" style={{ marginBottom: r(12) }}>
                  <AppIcon name="contrast-outline" size={18} color={C.textPrimary} bg={C.brand10} containerSize={r(36)} borderRadius={r(12)} style={{ marginRight: r(14) }} />
                  <Text style={styles.menuItemText}>Tema</Text>
                </HStack>
                <HStack space="xs">
                  {(['auto', 'light', 'dark'] as const).map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.themeOptionBtn, themePreference === option && styles.themeOptionBtnActive]}
                      onPress={() => setThemePreference(option)}
                    >
                      <Text style={[styles.themeOptionText, themePreference === option && styles.themeOptionTextActive]}>
                        {option === 'auto' ? 'Automático' : option === 'light' ? 'Claro' : 'Oscuro'}
                      </Text>
                    </Pressable>
                  ))}
                </HStack>
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

              <Pressable style={styles.menuLogoutBtn} onPress={handleLogout}>
                <Text style={styles.menuLogoutText}>Cerrar sesión</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
