import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { logger } from './logger';

/**
 * Puente a LiveActivityModule (ios/bestronger/LiveActivityModule.swift). Solo
 * existe en iOS -- en Android (y en Expo Go, donde el módulo nativo no está
 * compilado) todas las funciones son no-op seguras.
 */

export interface WorkoutActivityState {
  exerciseName: string;
  exerciseImageURL?: string | null;
  exerciseIndex: number;
  totalExercises: number;
  /** "Serie N/M" de la próxima serie por hacer (sirve tanto sin descansar
   * -- lo que toca ahora -- como descansando -- lo que viene después). */
  setLabel: string;
  /** Los mismos números que ya forman setLabel, sueltos -- el hueco
   * COMPACTO de la Dynamic Island (lado nativo, ver
   * WorkoutActivityAttributes.swift) necesita "N/M" sin la palabra
   * "Serie", y parsear setLabel en español sería frágil. null cuando no
   * hay una fila objetivo válida (mismo caso que "Última serie" en
   * setLabel). */
  setIndex?: number | null;
  totalSets?: number | null;
  reps?: string | null;
  load?: string | null;
  /** "RIR" | "RPE", según cuál tenga activo el ejercicio (nunca los dos). */
  intensityLabel?: string | null;
  intensityValue?: string | null;
  isResting: boolean;
  /** epoch ms, solo relevante cuando isResting = true */
  restEndDate?: number | null;
  /** Solo con isResting: nombre del ejercicio de la próxima serie, SOLO si
   * es distinto al ejercicio actual (el actual ya no tiene series pendientes). */
  nextExerciseName?: string | null;
}

type NativeLiveActivityModule = {
  startActivity: (params: { workoutTitle: string } & WorkoutActivityState) => void;
  updateActivity: (params: WorkoutActivityState) => void;
  endActivity: () => void;
  diagnose?: () => Promise<{ enabled: boolean; activeCount: number; lastStartResult: string; classicLayout?: boolean }>;
  setClassicLayout?: (classic: boolean) => void;
  testActivity?: () => Promise<{ ok: boolean; id?: string; error?: string }>;
};

// La Live Activity no aparecía nunca (2026-09-28). RN 0.86 corre siempre en
// la nueva arquitectura (bridgeless): un módulo nativo "legacy"
// (RCT_EXTERN_MODULE) puede no aparecer en NativeModules y sí en
// TurboModuleRegistry (capa de interoperabilidad). Antes, si faltaba, cada
// llamada era un no-op silencioso por el `native?.`; ahora se busca por las
// dos vías y se deja constancia en el log de diagnóstico.
function resolveNative(): { module: NativeLiveActivityModule | undefined; source: string } {
  if (Platform.OS !== 'ios') return { module: undefined, source: 'no-ios' };
  const fromNativeModules = NativeModules.LiveActivityModule as NativeLiveActivityModule | undefined;
  if (fromNativeModules) return { module: fromNativeModules, source: 'NativeModules' };
  try {
    const fromTurbo = TurboModuleRegistry.get('LiveActivityModule') as unknown as NativeLiveActivityModule | null;
    if (fromTurbo) return { module: fromTurbo, source: 'TurboModuleRegistry' };
  } catch {
    // TurboModuleRegistry.get no debería lanzar, pero no puede tumbar el entreno
  }
  return { module: undefined, source: 'no-disponible' };
}

const resolved = resolveNative();
const native = resolved.module;

export function startWorkoutLiveActivity(workoutTitle: string, state: WorkoutActivityState): void {
  if (!native) {
    if (Platform.OS === 'ios') logger.warn('[LiveActivity] módulo nativo LiveActivityModule no disponible: no se puede iniciar');
    return;
  }
  logger.info(`[LiveActivity] startActivity (módulo vía ${resolved.source})`);
  native.startActivity({ workoutTitle, ...state });
}

export function updateWorkoutLiveActivity(state: WorkoutActivityState): void {
  native?.updateActivity(state);
}

export function endWorkoutLiveActivity(): void {
  native?.endActivity();
}

/**
 * Ajustes → Diagnóstico → «Probar Live Activity»: texto con cada eslabón
 * de la cadena (módulo nativo, permiso, último arranque real, prueba).
 */
export async function diagnoseLiveActivity(): Promise<string> {
  if (Platform.OS !== 'ios') return 'Las Live Activities solo existen en iOS.';
  const lines: string[] = [];
  if (!native) {
    lines.push('❌ Módulo nativo LiveActivityModule NO disponible en esta build (ni en NativeModules ni en TurboModuleRegistry).');
    lines.push('La app no puede crear la Live Activity: el fallo es de registro del módulo nativo.');
    return lines.join('\n');
  }
  lines.push(`✅ Módulo nativo disponible (vía ${resolved.source}).`);
  if (!native.diagnose || !native.testActivity) {
    lines.push('⚠️ Esta build no incluye los métodos de diagnóstico del módulo.');
    return lines.join('\n');
  }
  try {
    const d = await native.diagnose();
    lines.push(d.enabled ? '✅ iOS permite Live Activities para la app.' : '❌ iOS NO permite Live Activities para la app (Ajustes → Be Stronger → Live Activities).');
    lines.push(`Live Activities de entreno activas ahora: ${d.activeCount}`);
    lines.push(`Último arranque en un entreno: ${d.lastStartResult}`);
    if (typeof d.classicLayout === 'boolean') {
      lines.push(`Diseño: ${d.classicLayout ? 'clásico (1.0.1)' : 'nuevo'}`);
    }
  } catch (e) {
    lines.push(`❌ diagnose() falló: ${String(e)}`);
  }
  try {
    const t = await native.testActivity();
    lines.push(
      t.ok
        ? '✅ Live Activity de prueba creada (dura 20 s). Sal YA a la pantalla de inicio: en la Dynamic Island y en la pantalla de bloqueo debe verse el ejercicio «Prueba», «Serie 2/4» y «8 reps · 40 kg · RIR 2»; a los 6 s pasa a un descanso de 12 s con cuenta atrás. Mientras la app está abierta iOS la oculta.'
        : `❌ La Live Activity de prueba no se pudo crear: ${t.error}`,
    );
  } catch (e) {
    lines.push(`❌ testActivity() falló: ${String(e)}`);
  }
  const text = lines.join('\n');
  logger.warn(`[LiveActivity] diagnóstico:\n${text}`);
  return text;
}

/**
 * Diseño de la Live Activity (Ajustes → Diagnóstico). null si esta build no
 * tiene el interruptor (módulo antiguo o no iOS).
 */
export async function getLiveActivityClassicLayout(): Promise<boolean | null> {
  if (!native?.diagnose || !native.setClassicLayout) return null;
  try {
    const d = await native.diagnose();
    return typeof d.classicLayout === 'boolean' ? d.classicLayout : null;
  } catch {
    return null;
  }
}

/** Se aplica a la siguiente Live Activity que se cree (no a la que ya está en pantalla). */
export function setLiveActivityClassicLayout(classic: boolean): void {
  native?.setClassicLayout?.(classic);
  logger.info(`[LiveActivity] diseño ${classic ? 'clásico' : 'nuevo'}`);
}
