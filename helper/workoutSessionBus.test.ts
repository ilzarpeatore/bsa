import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ACTIVE_SESSION_STORAGE_KEY,
  clearActiveWorkoutSession,
  getActiveWorkoutSession,
  hydratePersistedWorkoutSession,
  setWorkoutSessionMinimized,
  subscribeWorkoutSession,
  updateActiveWorkoutSession,
} from './workoutSessionBus';

// async-storage v3 ya no incluye su mock de jest: almacén en memoria mínimo
// con los métodos que usa workoutSessionBus.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

const session = {
  identityKey: 'pda:42',
  programDayAssignmentId: 42,
  startedAt: 1_700_000_000_000,
  completedSets: 1,
  totalSets: 5,
};

describe('workoutSessionBus', () => {
  beforeEach(async () => {
    clearActiveWorkoutSession();
    await AsyncStorage.clear();
  });

  it('notifica el estado actual al suscribirse y cada cambio posterior', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeWorkoutSession(listener);
    expect(listener).toHaveBeenLastCalledWith(null, false);

    updateActiveWorkoutSession(session);
    expect(listener).toHaveBeenLastCalledWith(session, false);
    expect(getActiveWorkoutSession()).toEqual(session);

    unsubscribe();
    clearActiveWorkoutSession();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('no permite minimizar si no hay ninguna sesión activa', () => {
    const listener = jest.fn();
    subscribeWorkoutSession(listener);
    setWorkoutSessionMinimized(true);
    expect(listener).toHaveBeenCalledTimes(1);

    updateActiveWorkoutSession(session);
    setWorkoutSessionMinimized(true);
    expect(listener).toHaveBeenLastCalledWith(session, true);
  });

  it('clearActiveWorkoutSession deja el bus sin sesión y sin minimizar', () => {
    updateActiveWorkoutSession(session);
    setWorkoutSessionMinimized(true);
    clearActiveWorkoutSession();

    const listener = jest.fn();
    subscribeWorkoutSession(listener);
    expect(listener).toHaveBeenLastCalledWith(null, false);
    expect(getActiveWorkoutSession()).toBeNull();
  });

  it('rehidrata una sesión persistida, contando series y ya minimizada', async () => {
    await AsyncStorage.setItem(
      ACTIVE_SESSION_STORAGE_KEY,
      JSON.stringify({
        identityKey: 'wt:7',
        mTitle: 'Pierna',
        startedAt: 1_700_000_000_000,
        blocks: [
          { exercises: [{ rows: [{ completed: true }, { completed: false }] }] },
          { exercises: [{ rows: [{ completed: true }] }] },
        ],
      }),
    );

    const listener = jest.fn();
    subscribeWorkoutSession(listener);
    await hydratePersistedWorkoutSession();

    expect(listener).toHaveBeenLastCalledWith(
      {
        identityKey: 'wt:7',
        workoutTemplateId: 7,
        mTitle: 'Pierna',
        startedAt: 1_700_000_000_000,
        completedSets: 2,
        totalSets: 3,
      },
      true,
    );
  });

  it('ignora datos persistidos incompletos o corruptos', async () => {
    await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({ mTitle: 'sin identityKey' }));
    await hydratePersistedWorkoutSession();
    expect(getActiveWorkoutSession()).toBeNull();

    await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, '{no es json');
    await hydratePersistedWorkoutSession();
    expect(getActiveWorkoutSession()).toBeNull();
  });
});
