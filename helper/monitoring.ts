import AsyncStorage from '@react-native-async-storage/async-storage';
import type React from 'react';
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

// Monitorización en producción (2026-10-03, ROADMAP ítems 58 y 62):
//   - Sentry: crashes nativos y errores de JS en segundo plano, con la
//     pantalla y los pasos previos (breadcrumbs de navegación).
//   - PostHog: qué pantallas usan los clientes (un evento `$screen` por
//     cambio de ruta), servidor en la UE.
// Las dos claves llegan como EXPO_PUBLIC_* (Expo las inlina en el bundle al
// compilar, igual que EXPO_PUBLIC_DEV_TOOLS en constants/featureFlags.ts);
// en los builds de CI salen de los secrets SENTRY_DSN / POSTHOG_API_KEY de
// ios-build.yml / android-build.yml. Sin clave, cada servicio queda apagado
// y todas las funciones de aquí son no-ops -- la app funciona igual.
// Son claves de cliente (pensadas para ir dentro de la app), no secretos de
// servidor. En __DEV__ no se envía nada para no ensuciar los datos reales.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

const isDev = __DEV__ ?? false;

export const sentryEnabled = !!SENTRY_DSN && !isDev;
const analyticsConfigured = !!POSTHOG_KEY && !isDev;

const navigationIntegration = sentryEnabled ? Sentry.reactNavigationIntegration() : null;

if (sentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Solo el id numérico del usuario (setUser más abajo): sin IP, email ni
    // cuerpos de peticiones.
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    integrations: navigationIntegration ? [navigationIntegration] : [],
  });
}

export const posthog: PostHog | null = analyticsConfigured
  ? new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, captureAppLifecycleEvents: true })
  : null;

// Sentry.wrap añade el ErrorBoundary raíz y el perfilado de arranque; sin DSN
// se devuelve el componente tal cual.
export function wrapRoot<P extends Record<string, unknown>>(
  Root: React.ComponentType<P>,
): React.ComponentType<P> {
  return sentryEnabled ? Sentry.wrap(Root) : Root;
}

// Llamar desde el onReady del NavigationContainer.
export function registerNavigation(navigationRef: unknown) {
  navigationIntegration?.registerNavigationContainer(navigationRef);
}

let lastScreen: string | null = null;

// Llamar desde onReady y onStateChange del NavigationContainer con el nombre
// de la ruta activa. Ignora repeticiones (re-render sin cambio de pantalla).
export function trackScreen(name: string | undefined) {
  if (!name || name === lastScreen) return;
  lastScreen = name;
  posthog?.screen(name);
}

export function identifyUser(user: { id?: number | string; access_tier?: string } | null) {
  if (!user?.id) {
    if (sentryEnabled) Sentry.setUser(null);
    posthog?.reset();
    return;
  }
  const id = String(user.id);
  if (sentryEnabled) Sentry.setUser({ id });
  posthog?.identify(id, user.access_tier ? { access_tier: user.access_tier } : undefined);
}

// Para logger.error: manda el primer Error de los argumentos (con su stack)
// o, si no hay ninguno, el texto del log como mensaje.
export function reportError(args: unknown[]) {
  if (!sentryEnabled) return;
  const error = args.find((a): a is Error => a instanceof Error);
  const text = args
    .filter((a) => !(a instanceof Error))
    .map((a) => (typeof a === 'string' ? a : safeStringify(a)))
    .join(' ');
  if (error) {
    Sentry.captureException(error, text ? { extra: { message: text } } : undefined);
  } else if (text) {
    Sentry.captureMessage(text, 'error');
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// --- Ajuste «Compartir datos de uso» (Privacidad) ---
// Activado por defecto; apagarlo hace optOut en PostHog (deja de enviar y
// borra la cola local). No afecta a Sentry: los informes de fallos solo
// llevan el id del usuario y sirven para arreglar errores.
const ANALYTICS_OPT_OUT_KEY = '@bestronger_analytics_opt_out';

export const analyticsAvailable = analyticsConfigured;

export async function isAnalyticsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ANALYTICS_OPT_OUT_KEY)) !== 'true';
  } catch {
    return true;
  }
}

export async function setAnalyticsEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ANALYTICS_OPT_OUT_KEY, enabled ? 'false' : 'true');
  if (enabled) await posthog?.optIn();
  else await posthog?.optOut();
}

// Aplica al arrancar el opt-out guardado en un arranque anterior.
if (posthog) {
  isAnalyticsEnabled().then((enabled) => {
    if (!enabled) posthog?.optOut();
  });
}
