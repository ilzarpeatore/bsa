// Tests de workout_session_screen.tsx (2026-09-24):
// - Pantalla "Ya tienes un entrenamiento en curso" (+ componente
//   WorkoutInProgressConflict). Bug real reportado con captura de iPhone:
//   con un entrenamiento minimizado, al intentar empezar otro, ningún botón
//   de esa pantalla funcionaba.
// - Tabla de series: el número de la serie es el botón de completarla.
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
import { workoutHistoryApi } from '../../api/workoutHistory';
import { showToast } from '@helper/toast';
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
jest.mock('@helper/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }));
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
// Doble de la hoja de RIR/RPE: solo pinta un botón que elige "2" cuando está visible.
jest.mock('../../components/IntensityCheckSheet', () => {
  const RN = require('react-native');
  const Sheet = ({ visible, onRegister }: any) =>
    visible ? (
      <RN.Pressable onPress={() => onRegister('2')}>
        <RN.Text>Elegir intensidad 2</RN.Text>
      </RN.Pressable>
    ) : null;
  return { __esModule: true, default: Sheet };
});
jest.mock('../../components/PainReportSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/WorkoutNoteSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('../../api/workoutHistory', () => ({
  workoutHistoryApi: { logCalendarSets: jest.fn(async () => ({ data: {} })) },
}));
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

// Tabla de series (2026-09-24): el número de la serie es el botón de
// completarla y ejecuta el mismo toggle que el antiguo check (sync con el
// backend incluido). De paso cubre "todas las series desmarcadas" ->
// logged_sets: [] y el session_key.
test('tocar el número de la serie la marca/desmarca y sincroniza con el backend', async () => {
  clearActiveWorkoutSession();
  const logMock = workoutHistoryApi.logCalendarSets as jest.Mock;
  logMock.mockClear();
  fetchMock.mockResolvedValueOnce({
    blocks: [
      {
        id: 10,
        title: 'Bloque',
        exercises: [
          {
            id: 100,
            exerciseId: 7,
            title: 'Sentadilla',
            image: null,
            bodyPartId: null,
            videoUrl: null,
            prescribed: { series: '2', reps: '10', carga: '60', rir: '2' },
            enabledMetrics: ['reps', 'carga', 'rir'],
            coachNotes: null,
            lastPerformance: null,
            sequence: 1,
            loadSuggestion: null,
          },
        ],
      },
    ],
  });
  const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dispatch: jest.fn() };
  await render(
    <WorkoutSessionScreen navigation={navigation} route={{ params: { programDayAssignmentId: 5, mTitle: 'Pierna' } }} />
  );
  const first = await screen.findByLabelText('Marcar serie 1 como hecha');
  expect(screen.getByLabelText('Marcar serie 2 como hecha')).toBeTruthy();

  // Fila 1: reps / carga / RIR (obligatorios para poder marcarla).
  const inputs = screen.getAllByPlaceholderText('-');
  await fireEvent.changeText(inputs[0], '10');
  await fireEvent.changeText(inputs[1], '60');
  await fireEvent.changeText(inputs[2], '2');

  await fireEvent.press(first);
  expect(screen.getByLabelText('Desmarcar serie 1')).toBeTruthy();
  expect(logMock).toHaveBeenCalledTimes(1);
  const payload = logMock.mock.calls[0][0];
  expect(payload.workout_template_exercise_id).toBe(100);
  expect(payload.logged_sets).toHaveLength(1);
  expect(payload.session_key).toMatch(/^pda:5:\d+$/);

  await fireEvent.press(screen.getByLabelText('Desmarcar serie 1'));
  expect(screen.getByLabelText('Marcar serie 1 como hecha')).toBeTruthy();
  expect(logMock).toHaveBeenCalledTimes(2);
  expect(logMock.mock.calls[1][0].logged_sets).toEqual([]);
  expect(logMock.mock.calls[1][0].session_key).toBe(payload.session_key);
});


// ── Caso Ayoub (2026-09-21..24): series rellenadas pero nunca marcadas ──────
async function renderSquat() {
  clearActiveWorkoutSession();
  const logMock = workoutHistoryApi.logCalendarSets as jest.Mock;
  logMock.mockReset();
  logMock.mockResolvedValue({ data: {} });
  (showToast as jest.Mock).mockClear();
  fetchMock.mockResolvedValueOnce({
    blocks: [
      {
        id: 10,
        title: 'Bloque',
        exercises: [
          {
            id: 100,
            exerciseId: 7,
            title: 'Sentadilla',
            image: null,
            bodyPartId: null,
            videoUrl: null,
            prescribed: { series: '2', reps: '10', carga: '60', rir: '2' },
            enabledMetrics: ['reps', 'carga', 'rir'],
            coachNotes: null,
            lastPerformance: null,
            sequence: 1,
            loadSuggestion: null,
          },
        ],
      },
    ],
  });
  const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn(), dispatch: jest.fn() };
  await render(
    <WorkoutSessionScreen navigation={navigation} route={{ params: { programDayAssignmentId: 5, mTitle: 'Pierna' } }} />
  );
  await screen.findByLabelText('Marcar serie 1 como hecha');
  return { logMock, navigation };
}

test('elegir el RIR en la hoja completa la serie y la envía (no hay que volver a pulsar)', async () => {
  const { logMock } = await renderSquat();
  const inputs = screen.getAllByPlaceholderText('-');
  await fireEvent.changeText(inputs[0], '10');
  await fireEvent.changeText(inputs[1], '60');

  // Sin RIR: no se marca, abre la hoja.
  await fireEvent.press(screen.getByLabelText('Marcar serie 1 como hecha'));
  expect(screen.getByLabelText('Marcar serie 1 como hecha')).toBeTruthy();
  expect(logMock).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText('Elegir intensidad 2'));

  expect(screen.getByLabelText('Desmarcar serie 1')).toBeTruthy();
  expect(logMock).toHaveBeenCalledTimes(1);
  expect(logMock.mock.calls[0][0].logged_sets[0]).toMatchObject({ reps: 10, carga: 60, rir: '2' });
});

test('finalizar con series rellenadas sin marcar avisa en vez de cerrar la sesión vacía', async () => {
  const { navigation } = await renderSquat();
  const inputs = screen.getAllByPlaceholderText('-');
  await fireEvent.changeText(inputs[0], '10');
  await fireEvent.changeText(inputs[1], '60');
  await fireEvent.changeText(inputs[2], '2'); // RIR puesto, serie NO marcada

  await fireEvent.press(screen.getByText('✓ FINALIZAR ENTRENAMIENTO'));

  expect(screen.getByText('Tienes series sin marcar')).toBeTruthy();
  expect(screen.queryByText('No has registrado ninguna serie')).toBeNull();
  expect(navigation.navigate).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText('Revisar series'));
  expect(screen.queryByText('Tienes series sin marcar')).toBeNull();
});

test('si el guardado de la serie falla se avisa (ya no se traga el error)', async () => {
  const { logMock } = await renderSquat();
  logMock.mockRejectedValueOnce(new Error('Network Error'));
  const inputs = screen.getAllByPlaceholderText('-');
  await fireEvent.changeText(inputs[0], '10');
  await fireEvent.changeText(inputs[1], '60');
  await fireEvent.changeText(inputs[2], '2');

  await fireEvent.press(screen.getByLabelText('Marcar serie 1 como hecha'));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(showToast).toHaveBeenCalledWith('No se pudo guardar la serie', expect.objectContaining({ variant: 'error' }));
});

test('si el cliente cambia a RPE, el RPE tecleado se envía (antes se descartaba)', async () => {
  const { logMock } = await renderSquat();
  await fireEvent.press(screen.getByLabelText('Cambiar entre RIR y RPE (actual: RIR)'));
  const inputs = screen.getAllByPlaceholderText('-');
  await fireEvent.changeText(inputs[0], '10');
  await fireEvent.changeText(inputs[1], '60');
  await fireEvent.changeText(inputs[2], '8'); // ahora la columna es RPE

  await fireEvent.press(screen.getByLabelText('Marcar serie 1 como hecha'));

  expect(logMock).toHaveBeenCalledTimes(1);
  const set = logMock.mock.calls[0][0].logged_sets[0];
  expect(set.rpe).toBe('8');
  expect(set.rir).toBeUndefined();
});
