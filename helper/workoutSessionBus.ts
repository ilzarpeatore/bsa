import AsyncStorage from '@react-native-async-storage/async-storage';

// Misma clave que usaba antes workout_session_screen.tsx localmente -- se
// centraliza aqui porque ahora tambien la lee App.tsx al arrancar (ver
// hydratePersistedWorkoutSession) para poder mostrar la barra flotante de
// entrenamiento minimizado incluso si el cliente aun no volvio a entrar a
// la pantalla de sesion en este arranque de la app.
export const ACTIVE_SESSION_STORAGE_KEY = '@bestronger/active_workout_session';

export interface ActiveWorkoutSession {
  identityKey: string;
  programDayAssignmentId?: number;
  workoutTemplateId?: number;
  mTitle?: string;
  startedAt: number;
  completedSets: number;
  totalSets: number;
}

type Listener = (session: ActiveWorkoutSession | null, minimized: boolean) => void;

let currentSession: ActiveWorkoutSession | null = null;
let isMinimized = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(currentSession, isMinimized));
}

// Bus minimo pub/sub (sin dependencias externas) para que la barra flotante
// en App.tsx (fuera del stack de navegacion de workout_session_screen) se
// entere en vivo del progreso de la sesion sin pasar por props/contexto de
// navegacion.
export function subscribeWorkoutSession(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentSession, isMinimized);
  return () => {
    listeners.delete(listener);
  };
}

// Lectura síncrona puntual (sin suscribirse) — usada por
// workout_session_screen.tsx al montar para saber si YA hay un
// entrenamiento distinto en curso antes de arrancar/retomar uno nuevo
// (petición 2026-08-19: "no se pueda empezar un workout si ya hay uno
// empezado"). Cualquier punto de entrada a esa pantalla (preview, o el
// minimizador) pasa por el mismo mount, así que basta con comprobarlo ahí.
export function getActiveWorkoutSession(): ActiveWorkoutSession | null {
  return currentSession;
}

export function updateActiveWorkoutSession(session: ActiveWorkoutSession) {
  currentSession = session;
  notify();
}

export function setWorkoutSessionMinimized(minimized: boolean) {
  if (!currentSession) return;
  isMinimized = minimized;
  notify();
}

export function clearActiveWorkoutSession() {
  currentSession = null;
  isMinimized = false;
  notify();
}

function parseIdentityKey(identityKey: string): { programDayAssignmentId?: number; workoutTemplateId?: number } {
  const [type, rawId] = identityKey.split(':');
  const id = Number(rawId);
  if (!Number.isFinite(id)) return {};
  return type === 'pda' ? { programDayAssignmentId: id } : { workoutTemplateId: id };
}

// Se llama una vez al arrancar la app (App.tsx): si quedo una sesion sin
// finalizar de un cierre en frio anterior (nunca paso por
// clearPersistedSession -- finishSession/onClose la borran), rehidrata el
// bus para que la barra flotante aparezca ya minimizada sin que el cliente
// tenga que volver a abrir manualmente esa pantalla.
export async function hydratePersistedWorkoutSession() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.identityKey || !parsed?.startedAt) return;
    let completedSets = 0;
    let totalSets = 0;
    (parsed.blocks || []).forEach((b: any) => {
      (b.exercises || []).forEach((ex: any) => {
        (ex.rows || []).forEach((r: any) => {
          totalSets += 1;
          if (r.completed) completedSets += 1;
        });
      });
    });
    updateActiveWorkoutSession({
      identityKey: parsed.identityKey,
      ...parseIdentityKey(parsed.identityKey),
      mTitle: parsed.mTitle,
      startedAt: parsed.startedAt,
      completedSets,
      totalSets,
    });
    setWorkoutSessionMinimized(true);
  } catch {}
}
