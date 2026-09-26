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
  habitsApi: { getLibrary: jest.fn(), getMyList: jest.fn(), adopt: jest.fn(), createPersonal: jest.fn() },
}));

const api = habitsApi as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  api.getLibrary.mockResolvedValue({ data: { data: [] } });
  api.getMyList.mockResolvedValue({ data: { data: [] } });
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


// ── Biblioteca: buscador, categorías y "Creados por mí" ──────────────────────
const TEMPLATES = [
  { id: 15, title: 'Beber agua', icon: 'water', category: 'Salud y fitness', target_value: 8, target_unit: 'vasos', frequency: 'daily' },
  { id: 8, title: 'Despertarse temprano', icon: 'sun', category: 'Mañana', target_value: null, target_unit: null, frequency: 'daily' },
  { id: 30, title: 'Gratitud', icon: 'mood', category: 'Bienestar mental', target_value: null, target_unit: null, frequency: 'daily' },
];
const MY_HABITS = [
  { id: 6, title: 'Yoga en casa', icon: 'fitness', target_value: 10, target_unit: 'min', frequency: 'daily', source_type: 'personal', current_streak: 0, logs: [] },
  { id: 7, title: 'Adoptado del coach', icon: 'water', target_value: null, target_unit: null, frequency: 'daily', source_type: 'library', current_streak: 0, logs: [] },
];

async function renderLibrary(navigation: any = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() }) {
  api.getLibrary.mockResolvedValue({ data: { data: TEMPLATES } });
  api.getMyList.mockResolvedValue({ data: { data: MY_HABITS } });
  await render(<HabitAddScreen navigation={navigation} />);
  await screen.findByText('Gratitud');
  return navigation;
}

test('la biblioteca agrupa por categoría y muestra los hábitos propios en "Creados por mí"', async () => {
  await renderLibrary();

  // Cabeceras de sección (mayúsculas por CSS, aquí llegan tal cual) y chips de categoría.
  expect(screen.getAllByText('Creados por mí').length).toBeGreaterThanOrEqual(2); // chip + sección
  expect(screen.getByText('Yoga en casa')).toBeTruthy();
  expect(screen.getByText('Creado por ti · ya está en tu lista')).toBeTruthy();
  // Los adoptados de la biblioteca no se duplican como "propios".
  expect(screen.queryByText('Adoptado del coach')).toBeNull();
  expect(screen.getAllByText('Mañana')).toHaveLength(2); // chip + cabecera de sección
});

test('el buscador filtra sin acentos ni mayúsculas, también entre los propios', async () => {
  await renderLibrary();

  await fireEvent.changeText(screen.getByLabelText('Buscar hábito'), 'GRATITÚD');
  expect(screen.getByText('Gratitud')).toBeTruthy();
  expect(screen.queryByText('Beber agua')).toBeNull();

  await fireEvent.changeText(screen.getByLabelText('Buscar hábito'), 'yoga');
  expect(screen.getByText('Yoga en casa')).toBeTruthy();
  expect(screen.queryByText('Gratitud')).toBeNull();

  await fireEvent.changeText(screen.getByLabelText('Buscar hábito'), 'zzzzzz');
  expect(screen.getByText(/No hay hábitos que coincidan/)).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Borrar búsqueda'));
  expect(screen.getByText('Gratitud')).toBeTruthy();
});

test('elegir una categoría deja solo sus hábitos', async () => {
  await renderLibrary();

  // El chip "Mañana" (no la cabecera de sección: con "Todos" hay un único "Mañana" por chip + sección).
  await fireEvent.press(screen.getAllByText('Mañana')[0]);

  expect(screen.getByText('Despertarse temprano')).toBeTruthy();
  expect(screen.queryByText('Gratitud')).toBeNull();
  expect(screen.queryByText('Yoga en casa')).toBeNull();
});

test('tocar un hábito propio lo abre; tocar una plantilla la añade', async () => {
  api.adopt.mockResolvedValue({ data: { data: { id: 99 } } });
  const navigation = await renderLibrary();

  await fireEvent.press(screen.getByLabelText('Abrir tu hábito Yoga en casa'));
  expect(navigation.navigate).toHaveBeenCalledWith('MigratedHabitDetail', { habitId: 6 });

  await fireEvent.press(screen.getByLabelText('Añadir hábito Gratitud'));
  await waitFor(() => expect(api.adopt).toHaveBeenCalledWith(30));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('MigratedHabitDetail', { habitId: 99 }));
});

test('si falla la carga de mis hábitos la biblioteca se ve igual', async () => {
  api.getLibrary.mockResolvedValue({ data: { data: TEMPLATES } });
  api.getMyList.mockRejectedValue(new Error('Network Error'));
  await render(<HabitAddScreen navigation={{ goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() }} />);

  expect(await screen.findByText('Gratitud')).toBeTruthy();
  expect(screen.queryByText('Yoga en casa')).toBeNull();
});
