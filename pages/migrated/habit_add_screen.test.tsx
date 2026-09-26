// Tests de habit_add_screen.tsx: flujo "Crear el mío" (hábito personal).
// Se renderiza la pantalla REAL; solo se sustituyen por dobles lo nativo y los
// componentes de UI de gluestack/nativewind, que jest no transforma.
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import HabitAddScreen from './habit_add_screen';
import { habitsApi } from '../../api/habits';
import { showToast } from '@helper/toast';

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) },
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []) }));
jest.mock('@store/TutorialContext', () => ({ useTutorial: () => ({ reportAction: jest.fn() }) }));
jest.mock('@helper/toast', () => ({ showToast: jest.fn() }));
jest.mock('@helper/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }));
jest.mock('@helper/useAppColorMode', () => ({
  useAppColorMode: () => ({ colors: new Proxy({}, { get: () => '#000000' }), mode: 'light' }),
}));
jest.mock('@components/ui/box', () => ({ Box: require('react-native').View }));
jest.mock('@components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('@components/ui/pressable', () => ({ Pressable: require('react-native').Pressable }));
jest.mock('@components/ui/button', () => ({
  Button: require('react-native').Pressable,
  ButtonText: require('react-native').Text,
}));
jest.mock('@components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@components/ScreenHeader', () => ({ __esModule: true, default: () => null }));
jest.mock('@components/WorkoutMinimizedBar', () => ({ WORKOUT_MINIBAR_CLEARANCE: 0 }));
jest.mock('../../api/habits', () => ({
  habitsApi: { getLibrary: jest.fn(), adopt: jest.fn(), createPersonal: jest.fn() },
}));

const api = habitsApi as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  api.getLibrary.mockResolvedValue({ data: { data: [] } });
});

test('crear un hábito propio llama a la API y navega al detalle', async () => {
  api.createPersonal.mockResolvedValue({ data: { data: { id: 77 } } });
  const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
  await render(<HabitAddScreen navigation={navigation} />);

  await fireEvent.press(await screen.findByText('Crear el mío'));
  await fireEvent.changeText(screen.getByPlaceholderText('p. ej. Beber agua'), 'Beber agua');
  await fireEvent.press(screen.getByText('CREAR HÁBITO'));

  await waitFor(() => expect(api.createPersonal).toHaveBeenCalledTimes(1));
  expect(api.createPersonal).toHaveBeenCalledWith({
    title: 'Beber agua',
    icon: 'fitness',
    target_value: null,
    target_unit: null,
    frequency: 'daily',
  });
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('MigratedHabitDetail', { habitId: 77 }));
});

test('si el backend rechaza la creación se muestra su mensaje', async () => {
  api.createPersonal.mockRejectedValue({ response: { data: { message: 'Título inválido' } } });
  await render(<HabitAddScreen navigation={{ goBack: jest.fn(), replace: jest.fn() }} />);

  await fireEvent.press(await screen.findByText('Crear el mío'));
  await fireEvent.changeText(screen.getByPlaceholderText('p. ej. Beber agua'), 'X');
  await fireEvent.press(screen.getByText('CREAR HÁBITO'));

  await waitFor(() => expect(showToast).toHaveBeenCalledWith('Error', expect.objectContaining({ description: 'Título inválido' })));
  // El motivo también se ve dentro de la propia pantalla, no solo en el toast.
  expect(screen.getByText('Título inválido')).toBeTruthy();
});

test('sin nombre no llama a la API y avisa en pantalla', async () => {
  await render(<HabitAddScreen navigation={{ goBack: jest.fn(), replace: jest.fn() }} />);

  await fireEvent.press(await screen.findByText('Crear el mío'));
  await fireEvent.press(screen.getByText('CREAR HÁBITO'));

  expect(api.createPersonal).not.toHaveBeenCalled();
  expect(screen.getByText('Ponle un nombre a tu hábito.')).toBeTruthy();
});

test('un doble toque rápido crea el hábito una sola vez', async () => {
  // Respuesta lenta: el segundo toque llega con la primera petición en vuelo.
  api.createPersonal.mockImplementation(
    () => new Promise((r) => setTimeout(() => r({ data: { data: { id: 1 } } }), 100))
  );
  const navigation = { goBack: jest.fn(), replace: jest.fn() };
  await render(<HabitAddScreen navigation={navigation} />);

  await fireEvent.press(await screen.findByText('Crear el mío'));
  await fireEvent.changeText(screen.getByPlaceholderText('p. ej. Beber agua'), 'Leer');
  await fireEvent.press(screen.getByText('CREAR HÁBITO'));
  await fireEvent.press(screen.getByLabelText('Crear hábito'));

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledTimes(1));
  expect(api.createPersonal).toHaveBeenCalledTimes(1);
});
