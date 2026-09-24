// Pantalla "Ya tienes un entrenamiento en curso" (workout_session_screen.tsx
// + components/WorkoutInProgressConflict.tsx), 2026-09-24. Bug real
// reportado con captura de iPhone: con un entrenamiento minimizado, al
// intentar empezar otro, ningún botón de esa pantalla funcionaba.
//
// Se renderiza la pantalla de sesión REAL; solo se sustituyen por dobles lo
// nativo (reanimated, gesture-handler, vídeo...) y los componentes de UI de
// gluestack/nativewind, que jest no transforma.
import React from 'react';
import { Pressable as RNPressable, Text as RNText } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// jest.mock() se eleva por encima de estos imports (babel-jest), así que la
// pantalla ya se importa con todos los dobles de abajo.
import WorkoutSessionScreen from './workout_session_screen';
import { fetchUnifiedWorkout } from './workoutViewShared';
import {
  clearActiveWorkoutSession,
  getActiveWorkoutSession,
  setWorkoutSessionMinimized,
  updateActiveWorkoutSession,
} from '../../helper/workoutSessionBus';

// Las factorías de jest.mock no pueden usar los imports del módulo: require()
// dentro de ellas es lo idiomático.
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: { View: RN.View, Text: RN.Text, ScrollView: RN.ScrollView, createAnimatedComponent: (c: any) => c },
    useAnimatedStyle: () => ({}),
    useSharedValue: (v: any) => ({ value: v }),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    runOnJS: (f: any) => f,
  };
});
jest.mock('react-native-gesture-handler', () => {
  const chain: any = new Proxy({}, { get: () => () => chain });
  return { Gesture: { Pan: () => chain, Tap: () => chain }, GestureDetector: ({ children }: any) => children };
});
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-video', () => ({ VideoView: () => null, useVideoPlayer: () => ({ play: jest.fn() }) }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => children ?? null }));
jest.mock('./../../store/AuthContext', () => ({ useAuth: () => ({ state: { user: null } }) }));
jest.mock('@store/TutorialContext', () => ({ useTutorial: () => ({ reportAction: jest.fn() }) }));
jest.mock('@components/tutorial/TutorialTarget', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('@helper/liveActivity', () => ({
  startWorkoutLiveActivity: jest.fn(),
  updateWorkoutLiveActivity: jest.fn(),
  endWorkoutLiveActivity: jest.fn(),
}));
jest.mock('@helper/haptics', () => ({ hapticLight: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('@helper/toast', () => ({ showToast: jest.fn() }));
jest.mock('@helper/useAppColorMode', () => ({
  useAppColorMode: () => ({ colors: new Proxy({}, { get: () => '#000000' }), mode: 'light' }),
}));
jest.mock('@components/ui/box', () => ({ Box: require('react-native').View }));
jest.mock('@components/ui/hstack', () => ({ HStack: require('react-native').View }));
jest.mock('@components/ui/card', () => ({ Card: require('react-native').View }));
jest.mock('@components/ui/divider', () => ({ Divider: () => null }));
jest.mock('@components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('@components/ui/heading', () => ({ Heading: require('react-native').Text }));
jest.mock('@components/ui/pressable', () => ({ Pressable: require('react-native').Pressable }));
jest.mock('@components/ui/button', () => ({
  Button: require('react-native').Pressable,
  ButtonText: require('react-native').Text,
}));
jest.mock('@components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@components/ui/spinner', () => ({ Spinner: () => null }));
jest.mock('@components/ui/glass-view', () => ({
  GlassView: require('react-native').View,
  isGlassEffectAPIAvailable: () => false,
}));
jest.mock('@components/WorkoutMinimizedBar', () => ({ WORKOUT_MINIBAR_CLEARANCE: 0 }));
// Doble mínimo del diálogo propio de la app: pinta título y botones solo
// cuando está visible.
jest.mock('../../components/ConfirmDialog', () => {
  const RN = require('react-native');
  const Dialog = ({ visible, title, confirmText, cancelText = 'Cancelar', onConfirm, onCancel }: any) =>
    visible ? (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        <RN.Pressable onPress={onConfirm}>
          <RN.Text>{confirmText}</RN.Text>
        </RN.Pressable>
        <RN.Pressable onPress={onCancel}>
          <RN.Text>{cancelText}</RN.Text>
        </RN.Pressable>
      </RN.View>
    ) : null;
  return { __esModule: true, default: Dialog, ConfirmDialogMem: Dialog };
});
jest.mock('../../components/ExerciseThumb', () => ({ ExerciseThumbMem: () => null }));
jest.mock('../../components/IntensityCheckSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/PainReportSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/WorkoutNoteSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('../../api/workoutHistory', () => ({ workoutHistoryApi: {} }));
jest.mock('../../api/exercises', () => ({ exercisesApi: {} }));
jest.mock('../../api/loadSuggestion', () => ({ loadSuggestionApi: {}, pickPendingSuggestion: () => null }));
jest.mock('../../api/workoutTemplate', () => ({}));
jest.mock('./workoutViewShared', () => ({
  fetchUnifiedWorkout: jest.fn(async () => ({ blocks: [] })),
  formatPrescribedSubtitle: () => '',
  getMetricsCatalog: jest.fn(async () => []),
}));
jest.mock('./theme', () => ({
  FONT: new Proxy({}, { get: () => 'System' }),
  RADIUS: new Proxy({}, { get: () => 8 }),
}));


const CONFLICT_TITLE = 'Ya tienes un entrenamiento en curso';
const fetchMock = fetchUnifiedWorkout as jest.Mock;

function startActiveSessionA() {
  clearActiveWorkoutSession();
  updateActiveWorkoutSession({
    identityKey: 'pda:1',
    programDayAssignmentId: 1,
    mTitle: 'Pierna',
    startedAt: Date.now(),
    completedSets: 2,
    totalSets: 9,
  });
  setWorkoutSessionMinimized(true);
}

async function renderConflictForB() {
  const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dispatch: jest.fn() };
  await render(
    <WorkoutSessionScreen navigation={navigation} route={{ params: { programDayAssignmentId: 2, mTitle: 'Torso' } }} />
  );
  await screen.findByText(CONFLICT_TITLE);
  return navigation;
}

beforeEach(() => {
  fetchMock.mockClear();
  startActiveSessionA();
});

test('"Continuar entrenamiento en curso" abre aquí mismo el entrenamiento en curso', async () => {
  await renderConflictForB();
  expect(fetchMock).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText('Continuar entrenamiento en curso'));

  expect(screen.queryByText(CONFLICT_TITLE)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatchObject({ programDayAssignmentId: 1 });
  // Sigue siendo la misma sesión en curso, no se descarta nada.
  expect(getActiveWorkoutSession()?.identityKey).toBe('pda:1');
});

test('"Cancelar entrenamiento en curso" pide el mismo diálogo de salir y, al confirmar, descarta y empieza el nuevo', async () => {
  await renderConflictForB();

  await fireEvent.press(screen.getByText('Cancelar entrenamiento en curso'));
  expect(screen.getByText('Salir del entrenamiento')).toBeTruthy();

  await fireEvent.press(screen.getByText('Salir sin finalizar'));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(getActiveWorkoutSession()).toBeNull();
  expect(screen.queryByText(CONFLICT_TITLE)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatchObject({ programDayAssignmentId: 2 });
});

test('cancelar el diálogo no hace nada', async () => {
  const navigation = await renderConflictForB();

  await fireEvent.press(screen.getByText('Cancelar entrenamiento en curso'));
  await fireEvent.press(screen.getByText('Seguir entrenando'));

  expect(screen.queryByText('Salir del entrenamiento')).toBeNull();
  expect(screen.getByText(CONFLICT_TITLE)).toBeTruthy();
  expect(getActiveWorkoutSession()?.identityKey).toBe('pda:1');
  expect(fetchMock).not.toHaveBeenCalled();
  expect(navigation.goBack).not.toHaveBeenCalled();
});

test('la X y "Volver" salen sin tocar nada', async () => {
  const navigation = await renderConflictForB();

  await fireEvent.press(screen.getByLabelText('Cerrar'));
  await fireEvent.press(screen.getByText('Volver'));

  expect(navigation.goBack).toHaveBeenCalledTimes(2);
  expect(getActiveWorkoutSession()?.identityKey).toBe('pda:1');
  expect(fetchMock).not.toHaveBeenCalled();
});

// Con la navegación real (pestañas + stack anidado, como App.tsx): la barra
// flotante navega desde la raíz a 'MigratedWorkoutSession'. Como la ruta
// actual ya se llama así, React Navigation 7 solo le cambia los params (no
// monta otra instancia) -- antes la pantalla se quedaba en el conflicto.
test('tocar la barra flotante desde la pantalla de conflicto abre el entrenamiento en curso', async () => {
  const Tab = createBottomTabNavigator();
  const Stack = createNativeStackNavigator();
  const ref = createNavigationContainerRef<any>();
  const Preview = ({ navigation }: any) => (
    <RNPressable
      onPress={() => navigation.navigate('MigratedWorkoutSession', { programDayAssignmentId: 2, mTitle: 'Torso' })}
    >
      <RNText>Empezar</RNText>
    </RNPressable>
  );
  const Nested = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Preview" component={Preview} />
      <Stack.Screen name="MigratedWorkoutSession" component={WorkoutSessionScreen as any} />
    </Stack.Navigator>
  );
  await render(
    <NavigationContainer ref={ref}>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="InicioTab" component={Nested} />
      </Tab.Navigator>
    </NavigationContainer>
  );
  await fireEvent.press(screen.getByText('Empezar'));
  await screen.findByText(CONFLICT_TITLE);

  // Lo mismo que hace WorkoutMinimizedBar::restore.
  await act(async () => {
    ref.navigate('MigratedWorkoutSession', { programDayAssignmentId: 1, mTitle: 'Pierna' });
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(screen.queryByText(CONFLICT_TITLE)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatchObject({ programDayAssignmentId: 1 });
});
