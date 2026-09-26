import AsyncStorage from '@react-native-async-storage/async-storage';
import { endWorkoutLiveActivity } from './liveActivity';
import {
  ACTIVE_SESSION_STORAGE_KEY,
  clearActiveWorkoutSession,
  getActiveWorkoutSession,
} from './workoutSessionBus';

// Descarta del todo la sesión en curso guardada en el dispositivo: la sesión
// persistida (AsyncStorage), el bus que alimenta la barra flotante y la Live
// Activity -- lo mismo que hace clearPersistedSession() dentro de
// workout_session_screen.tsx, pero usable desde fuera de esa pantalla.
//
// Caso real (2026-09-24): si el coach quita del calendario un entrenamiento
// que el cliente tenía minimizado, la barra seguía apuntando a un día que ya
// no existe -- al abrirla solo salía "No se pudo cargar", no había forma de
// descartarla, y como no se puede empezar otro entrenamiento con uno en
// curso, el cliente se quedaba bloqueado.
//
// Las series ya marcadas se guardan en el backend al marcarlas (logSets), así
// que descartar solo pierde el cierre de la sesión (feedback/resumen), no las
// series.
//
// identityKey: si se pasa, solo descarta cuando la sesión guardada es ESA
// (nunca borrar por error otra sesión distinta que sí siga en curso).
export async function discardActiveWorkoutSession(identityKey?: string | null): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    const storedKey = raw ? JSON.parse(raw)?.identityKey : null;
    if (!identityKey || storedKey == null || storedKey === identityKey) {
      await AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  } catch {
    // Datos corruptos: mejor borrarlos que dejar al cliente bloqueado.
    await AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY).catch(() => {});
  }

  const active = getActiveWorkoutSession();
  if (!identityKey || !active || active.identityKey === identityKey) {
    clearActiveWorkoutSession();
    endWorkoutLiveActivity();
  }
}
