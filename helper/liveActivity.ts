import { NativeModules, Platform } from 'react-native';

/**
 * Puente a LiveActivityModule (ios/befit/LiveActivityModule.swift). Solo
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
};

const native: NativeLiveActivityModule | undefined =
  Platform.OS === 'ios' ? NativeModules.LiveActivityModule : undefined;

export function startWorkoutLiveActivity(workoutTitle: string, state: WorkoutActivityState): void {
  native?.startActivity({ workoutTitle, ...state });
}

export function updateWorkoutLiveActivity(state: WorkoutActivityState): void {
  native?.updateActivity(state);
}

export function endWorkoutLiveActivity(): void {
  native?.endActivity();
}
