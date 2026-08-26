import { NativeModules, Platform } from 'react-native';

/**
 * Puente a LiveActivityModule (ios/befit/LiveActivityModule.swift). Solo
 * existe en iOS -- en Android (y en Expo Go, donde el módulo nativo no está
 * compilado) todas las funciones son no-op seguras.
 */

export interface WorkoutActivityState {
  exerciseName: string;
  exerciseIndex: number;
  totalExercises: number;
  setLabel: string;
  isResting: boolean;
  /** epoch ms, solo relevante cuando isResting = true */
  restEndDate?: number | null;
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
