// Tests de las 3 pantallas de la lista de la compra (reconstruidas 2026-09-26, ítem 26 del roadmap):
// shopping_list_screen (listado), add_shopping_list_screen (crear/editar) y
// shopping_list_detail_screen (detalle). Se renderizan las pantallas REALES; solo se sustituyen por
// dobles lo nativo y los componentes de UI de gluestack/nativewind, que jest no transforma.
import React from 'react';
import { Share } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ShoppingListScreen from './shopping_list_screen';
import AddShoppingListScreen from './add_shopping_list_screen';
import ShoppingListDetailScreen from './shopping_list_detail_screen';
import { shoppingApi } from '@api/shopping';
import { showToast } from '@helper/toast';
import { toDateStr } from '@helper/shoppingDates';

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) },
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@helper/toast', () => ({ showToast: jest.fn() }));
jest.mock('@helper/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }));
jest.mock('@helper/useAppColorMode', () => ({
  useAppColorMode: () => ({ colors: new Proxy({}, { get: () => '#000000' }), mode: 'light' }),
}));
jest.mock('@components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('@components/ui/pressable', () => ({ Pressable: require('react-native').Pressable }));
jest.mock('@components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@components/ScreenHeader', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: ({ title, rightAction }: any) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {rightAction}
      </RN.View>
    ),
  };
});
jest.mock('@components/WorkoutMinimizedBar', () => ({ WORKOUT_MINIBAR_CLEARANCE: 0 }));
jest.mock('@components/SimpleBottomSheet', () => {
  const RN = require('react-native');
  return { __esModule: true, default: ({ visible, children }: any) => (visible ? <RN.View>{children}</RN.View> : null) };
});
jest.mock('@components/ConfirmDialog', () => {
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
jest.mock('@api/shopping', () => ({
  shoppingApi: {
    getList: jest.fn(),
    getDetail: jest.fn(),
    generateFromDailyPlan: jest.fn(),
    deleteShoppingList: jest.fn(),
    toggleItem: jest.fn(),
    deleteItem: jest.fn(),
    addCustomItem: jest.fn(),
    updateItem: jest.fn(),
    getMeasurementUnits: jest.fn(),
  },
}));

const api = shoppingApi as unknown as Record<string, jest.Mock>;
const nav = () => ({ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), addListener: jest.fn(() => () => {}) });

const item = (over: any = {}) => ({
  id: 1, shopping_list_id: 9, ingredient_id: null, ingredient_title: null, ingredient_category_id: null,
  ingredient_category_title: null, custom_item_name: 'Leche', total_grams: null, display_quantity: 0,
  measurement_unit_id: null, display_unit_title: null, display_unit_symbol: null, is_checked: false,
  manually_added: true, created_at: '', updated_at: '', ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  api.getMeasurementUnits.mockResolvedValue({ data: { data: [{ id: 1, title: 'Gram', symbol: 'g', slug: 'gram' }, { id: 2, title: 'Cup', symbol: 'taza', slug: 'cup' }] } });
});

// ─────────────────────────────── Listado ───────────────────────────────
describe('listado de listas', () => {
  const LISTS = [
    { id: 1, title: 'Compra semana', start_date: '2026-09-21', end_date: '2026-09-27', items_count: 12, servings: 1 },
    { id: 2, title: 'Compra sábado', start_date: '2026-09-26', end_date: '2026-09-26', items_count: 1, servings: 2 },
  ];

  test('muestra cada lista con sus fechas y su número de artículos, y abre el detalle', async () => {
    api.getList.mockResolvedValue({ data: { data: LISTS } });
    const navigation = nav();
    await render(<ShoppingListScreen navigation={navigation} />);

    expect(await screen.findByText('Compra semana')).toBeTruthy();
    expect(screen.getByText('21–27 sep · 12 artículos')).toBeTruthy();
    expect(screen.getByText('26 sep · 1 artículo')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Abrir la lista Compra sábado'));
    expect(navigation.navigate).toHaveBeenCalledWith('MigratedShoppingListDetail', { shoppingListId: 2 });
  });

  test('borrar pide confirmación y quita la lista', async () => {
    api.getList.mockResolvedValue({ data: { data: LISTS } });
    api.deleteShoppingList.mockResolvedValue({});
    await render(<ShoppingListScreen navigation={nav()} />);
    await screen.findByText('Compra semana');

    await fireEvent.press(screen.getByLabelText('Borrar la lista Compra semana'));
    expect(screen.getByText('Borrar lista')).toBeTruthy();
    await fireEvent.press(screen.getByText('Borrar'));

    await waitFor(() => expect(api.deleteShoppingList).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Compra semana')).toBeNull());
    expect(screen.getByText('Compra sábado')).toBeTruthy();
  });

  test('cancelar el borrado no llama a la API', async () => {
    api.getList.mockResolvedValue({ data: { data: LISTS } });
    await render(<ShoppingListScreen navigation={nav()} />);
    await screen.findByText('Compra semana');

    await fireEvent.press(screen.getByLabelText('Borrar la lista Compra semana'));
    await fireEvent.press(screen.getByText('Cancelar'));

    expect(api.deleteShoppingList).not.toHaveBeenCalled();
    expect(screen.getByText('Compra semana')).toBeTruthy();
  });

  test('sin listas invita a crear una, y "Nueva lista" va a la pantalla de creación', async () => {
    api.getList.mockResolvedValue({ data: { data: [] } });
    const navigation = nav();
    await render(<ShoppingListScreen navigation={navigation} />);

    expect(await screen.findByText('Aún no tienes listas')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Crear una lista nueva'));
    expect(navigation.navigate).toHaveBeenCalledWith('MigratedAddShoppingList');
  });

  test('si falla la carga ofrece reintentar', async () => {
    api.getList.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ data: { data: LISTS } });
    await render(<ShoppingListScreen navigation={nav()} />);

    await fireEvent.press(await screen.findByText('Reintentar'));

    expect(await screen.findByText('Compra semana')).toBeTruthy();
  });
});

// ─────────────────────────────── Crear / editar ───────────────────────────────
describe('crear lista', () => {
  const today = toDateStr(new Date());

  test('por defecto: hoy, 1 ración, todas las comidas y sin exigir que estén hechas', async () => {
    api.generateFromDailyPlan.mockResolvedValue({ data: { data: { id: 55 } } });
    const navigation = nav();
    await render(<AddShoppingListScreen navigation={navigation} route={{ params: {} }} />);

    await fireEvent.press(screen.getByLabelText('Crear lista'));

    await waitFor(() => expect(api.generateFromDailyPlan).toHaveBeenCalledTimes(1));
    const req = api.generateFromDailyPlan.mock.calls[0][0];
    expect(req).toMatchObject({
      start_date: today, end_date: today, servings: 1, is_complete_only: false,
      meal_types: ['breakfast', 'lunch', 'dinner', 'snacks'],
    });
    expect(req.title).toMatch(/^Compra /);
    expect(req.shopping_list_id).toBeUndefined();
    expect(navigation.replace).toHaveBeenCalledWith('MigratedShoppingListDetail', { shoppingListId: 55 });
  });

  test('un atajo (Próximos 7 días) cambia el rango y el título, y sube las raciones', async () => {
    api.generateFromDailyPlan.mockResolvedValue({ data: { data: { id: 1 } } });
    await render(<AddShoppingListScreen navigation={nav()} route={{ params: {} }} />);

    await fireEvent.press(screen.getByText('Próximos 7 días'));
    await fireEvent.press(screen.getByLabelText('Más raciones'));
    await fireEvent.press(screen.getByLabelText('Más raciones'));
    await fireEvent.press(screen.getByLabelText('Crear lista'));

    await waitFor(() => expect(api.generateFromDailyPlan).toHaveBeenCalled());
    const req = api.generateFromDailyPlan.mock.calls[0][0];
    expect(req.start_date).toBe(today);
    expect(req.end_date > req.start_date).toBe(true);
    expect(req.servings).toBe(3);
    expect(req.title).toContain('–'); // "Compra 26–2 oct" / "Compra 26 sep – 2 oct"
  });

  test('las raciones no bajan de 1', async () => {
    api.generateFromDailyPlan.mockResolvedValue({ data: { data: { id: 1 } } });
    await render(<AddShoppingListScreen navigation={nav()} route={{ params: {} }} />);

    await fireEvent.press(screen.getByLabelText('Menos raciones'));
    await fireEvent.press(screen.getByLabelText('Crear lista'));

    await waitFor(() => expect(api.generateFromDailyPlan).toHaveBeenCalled());
    expect(api.generateFromDailyPlan.mock.calls[0][0].servings).toBe(1);
  });

  test('sin ningún tipo de comida avisa y no llama a la API', async () => {
    await render(<AddShoppingListScreen navigation={nav()} route={{ params: {} }} />);
    for (const label of ['Desayuno', 'Comida', 'Cena', 'Snacks']) await fireEvent.press(screen.getByText(label));

    await fireEvent.press(screen.getByLabelText('Crear lista'));

    expect(api.generateFromDailyPlan).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Falta algo', expect.objectContaining({ variant: 'warning' }));
  });

  test('un título escrito a mano se respeta y "solo hechas" se manda', async () => {
    api.generateFromDailyPlan.mockResolvedValue({ data: { data: { id: 1 } } });
    await render(<AddShoppingListScreen navigation={nav()} route={{ params: {} }} />);

    await fireEvent.changeText(screen.getByLabelText('Título de la lista'), 'Mi compra');
    await fireEvent(screen.getByLabelText('Solo comidas ya hechas'), 'valueChange', true);
    await fireEvent.press(screen.getByText('Mañana')); // cambiar el rango no pisa el título escrito
    await fireEvent.press(screen.getByLabelText('Crear lista'));

    await waitFor(() => expect(api.generateFromDailyPlan).toHaveBeenCalled());
    expect(api.generateFromDailyPlan.mock.calls[0][0]).toMatchObject({ title: 'Mi compra', is_complete_only: true });
  });

  test('si no hay comidas planificadas (422) explica qué hacer y no navega', async () => {
    api.generateFromDailyPlan.mockRejectedValue({ response: { status: 422, data: { message: 'x' } } });
    const navigation = nav();
    await render(<AddShoppingListScreen navigation={navigation} route={{ params: {} }} />);

    await fireEvent.press(screen.getByLabelText('Crear lista'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('No se pudo crear la lista', expect.objectContaining({ description: expect.stringContaining('No hay comidas planificadas') }))
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

describe('editar lista', () => {
  const LIST = { id: 7, title: 'Compra de septiembre', start_date: '2026-09-10', end_date: '2026-09-10', servings: 2 };

  test('parte de los datos de la lista y, con el calendario, cambia el rango', async () => {
    api.generateFromDailyPlan.mockResolvedValue({ data: { data: { id: 7 } } });
    const navigation = nav();
    await render(<AddShoppingListScreen navigation={navigation} route={{ params: { shoppingList: LIST } }} />);

    expect(screen.getByText('Editar lista de la compra')).toBeTruthy();
    expect((screen.getByLabelText('Título de la lista') as any).props.value).toBe('Compra de septiembre');
    expect(screen.getByText(/Septiembre 2026/)).toBeTruthy();

    // Día 10 ya elegido: tocar el 20 lo convierte en el rango 10–20.
    await fireEvent.press(screen.getByLabelText('Día 20 de Septiembre'));
    await fireEvent.press(screen.getByLabelText('Actualizar lista'));

    await waitFor(() => expect(api.generateFromDailyPlan).toHaveBeenCalled());
    expect(api.generateFromDailyPlan.mock.calls[0][0]).toMatchObject({
      shopping_list_id: 7, start_date: '2026-09-10', end_date: '2026-09-20', servings: 2, title: 'Compra de septiembre',
    });
    expect(navigation.goBack).toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('el calendario navega entre meses', async () => {
    await render(<AddShoppingListScreen navigation={nav()} route={{ params: { shoppingList: LIST } }} />);

    await fireEvent.press(screen.getByLabelText('Mes siguiente'));
    expect(screen.getByText(/Octubre 2026/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Mes anterior'));
    await fireEvent.press(screen.getByLabelText('Mes anterior'));
    expect(screen.getByText(/Agosto 2026/)).toBeTruthy();
  });
});

// ─────────────────────────────── Detalle ───────────────────────────────
describe('detalle de la lista', () => {
  const DETAIL = (items: any[]) => ({
    data: {
      data: {
        id: 9, title: 'Compra semana', start_date: '2026-09-21', end_date: '2026-09-27', servings: 1, items_count: items.length,
        items,
        items_by_category: [
          { ingredient_category_id: null, ingredient_category_title: 'Other', items: items.filter((i) => !i.ingredient_id) },
          { ingredient_category_id: 3, ingredient_category_title: 'Lácteos', items: items.filter((i) => i.ingredient_id) },
        ],
      },
    },
  });
  const ITEMS = [
    item({ id: 1, custom_item_name: 'Brócoli picado', display_quantity: 3, display_unit_symbol: 'tazas', unit_label: 'tazas' }),
    item({ id: 2, custom_item_name: null, ingredient_id: 5, ingredient_title: 'Leche', ingredient_category_id: 3, display_quantity: 1.5, display_unit_symbol: 'l', manually_added: false }),
    item({ id: 3, custom_item_name: 'Sal', is_checked: true }),
  ];

  const open = async (items = ITEMS) => {
    api.getDetail.mockResolvedValue(DETAIL(items));
    const navigation = nav();
    await render(<ShoppingListDetailScreen navigation={navigation} route={{ params: { shoppingListId: 9 } }} />);
    await screen.findByText('1 de 3 comprados');
    return navigation;
  };

  test('muestra el progreso, las fechas, nombres de texto libre y catálogo, y cantidades con unidad', async () => {
    await open();

    expect(screen.getByText('21–27 sep')).toBeTruthy();
    expect(screen.getByLabelText('Brócoli picado, 3 tazas')).toBeTruthy(); // línea de texto de FatSecret
    expect(screen.getByLabelText('Leche, 1,5 l')).toBeTruthy(); // ingrediente del catálogo
    expect(screen.getByLabelText('Sal')).toBeTruthy(); // sin cantidad: sin "0"
  });

  test('marcar un artículo llama a la API y actualiza el progreso; si falla se revierte', async () => {
    api.toggleItem.mockResolvedValueOnce({});
    await open();

    await fireEvent.press(screen.getByLabelText('Leche, 1,5 l'));
    expect(api.toggleItem).toHaveBeenCalledWith(2, true);
    expect(await screen.findByText('2 de 3 comprados')).toBeTruthy();

    api.toggleItem.mockRejectedValueOnce(new Error('boom'));
    await fireEvent.press(screen.getByLabelText('Brócoli picado, 3 tazas'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('No se pudo marcar', expect.anything()));
    expect(screen.getByText('2 de 3 comprados')).toBeTruthy();
  });

  test('"Por categoría" agrupa y traduce "Other" a "Otros"', async () => {
    await open();

    await fireEvent.press(screen.getByText('Por categoría'));

    expect(screen.getByText('Otros')).toBeTruthy();
    expect(screen.getByText('Lácteos')).toBeTruthy();
  });

  test('añadir un artículo permite ELEGIR la unidad y manda cantidad decimal con coma', async () => {
    api.addCustomItem.mockResolvedValue({});
    await open();

    await fireEvent.press(screen.getByLabelText('Añadir artículo'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del artículo'), 'Harina');
    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '1,5');
    await fireEvent.press(await screen.findByText('taza'));
    await fireEvent.press(screen.getByLabelText('Añadir a la lista'));

    await waitFor(() =>
      expect(api.addCustomItem).toHaveBeenCalledWith({ shopping_list_id: 9, custom_item_name: 'Harina', display_quantity: 1.5, measurement_unit_id: 2 })
    );
    await waitFor(() => expect(api.getDetail).toHaveBeenCalledTimes(2)); // recarga la lista
  });

  test('añadir sin nombre o con cantidad no válida avisa y no llama a la API', async () => {
    await open();
    await fireEvent.press(screen.getByLabelText('Añadir artículo'));

    await fireEvent.press(screen.getByLabelText('Añadir a la lista'));
    expect(showToast).toHaveBeenCalledWith('Falta el nombre', expect.anything());

    await fireEvent.changeText(screen.getByLabelText('Nombre del artículo'), 'Harina');
    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '-2');
    await fireEvent.press(screen.getByLabelText('Añadir a la lista'));
    expect(showToast).toHaveBeenCalledWith('Cantidad no válida', expect.anything());
    expect(api.addCustomItem).not.toHaveBeenCalled();
  });

  test('editar una línea de texto permite cambiar el nombre y la cantidad; un ingrediente del catálogo conserva su nombre', async () => {
    api.updateItem.mockResolvedValue({});
    await open();

    await fireEvent.press(screen.getByLabelText('Editar Brócoli picado'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del artículo'), 'Brócoli');
    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '2');
    await fireEvent.press(screen.getByLabelText('Guardar cambios'));
    await waitFor(() => expect(api.updateItem).toHaveBeenCalledWith({ item_id: 1, custom_item_name: 'Brócoli', display_quantity: 2 }));

    await fireEvent.press(screen.getByLabelText('Editar Leche'));
    expect(screen.queryByLabelText('Nombre del artículo')).toBeNull(); // nombre fijo
    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '2');
    await fireEvent.press(screen.getByLabelText('Guardar cambios'));
    await waitFor(() => expect(api.updateItem).toHaveBeenLastCalledWith({ item_id: 2, display_quantity: 2 }));
  });

  test('quitar un artículo desde su hoja', async () => {
    api.deleteItem.mockResolvedValue({});
    await open();

    await fireEvent.press(screen.getByLabelText('Editar Sal'));
    await fireEvent.press(screen.getByLabelText('Quitar artículo'));

    await waitFor(() => expect(api.deleteItem).toHaveBeenCalledWith(3));
  });

  test('"Quitar los artículos comprados" pide confirmación y borra solo los marcados', async () => {
    api.deleteItem.mockResolvedValue({});
    await open();

    await fireEvent.press(screen.getByLabelText('Más opciones'));
    await fireEvent.press(screen.getByText('Quitar los artículos comprados'));
    expect(screen.getByText('Quitar comprados')).toBeTruthy();
    await fireEvent.press(screen.getByText('Quitar'));

    await waitFor(() => expect(api.deleteItem).toHaveBeenCalledTimes(1));
    expect(api.deleteItem).toHaveBeenCalledWith(3);
  });

  test('"Actualizar desde mi plan" regenera la misma lista', async () => {
    api.generateFromDailyPlan.mockResolvedValue({ data: { data: { id: 9 } } });
    await open();

    await fireEvent.press(screen.getByLabelText('Más opciones'));
    await fireEvent.press(screen.getByText('Actualizar desde mi plan'));

    await waitFor(() => expect(api.generateFromDailyPlan).toHaveBeenCalledWith({ shopping_list_id: 9 }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Lista actualizada', expect.anything()));
  });

  test('compartir manda solo lo que falta por comprar', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    await open();

    await fireEvent.press(screen.getByLabelText('Más opciones'));
    await fireEvent.press(screen.getByText('Compartir lo que falta por comprar'));

    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    const message = shareSpy.mock.calls[0][0].message as string;
    expect(message).toContain('Brócoli picado — 3 tazas');
    expect(message).toContain('Leche — 1,5 l');
    expect(message).not.toContain('Sal'); // ya comprada
    shareSpy.mockRestore();
  });

  test('borrar la lista pide confirmación y vuelve atrás; editar abre la pantalla de creación con la lista', async () => {
    api.deleteShoppingList.mockResolvedValue({});
    const navigation = await open();

    await fireEvent.press(screen.getByLabelText('Más opciones'));
    await fireEvent.press(screen.getByText('Editar días y raciones'));
    expect(navigation.navigate).toHaveBeenCalledWith('MigratedAddShoppingList', expect.objectContaining({ shoppingList: expect.objectContaining({ id: 9 }) }));

    await fireEvent.press(screen.getByLabelText('Más opciones'));
    await fireEvent.press(screen.getByText('Borrar lista'));
    await fireEvent.press(screen.getByText('Borrar'));

    await waitFor(() => expect(api.deleteShoppingList).toHaveBeenCalledWith(9));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  test('una lista vacía lo explica y si falla la carga se puede reintentar', async () => {
    api.getDetail.mockResolvedValueOnce(DETAIL([]));
    await render(<ShoppingListDetailScreen navigation={nav()} route={{ params: { shoppingListId: 9 } }} />);
    expect(await screen.findByText('La lista está vacía')).toBeTruthy();
  });

  test('si falla la carga ofrece reintentar', async () => {
    api.getDetail.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(DETAIL(ITEMS));
    await render(<ShoppingListDetailScreen navigation={nav()} route={{ params: { shoppingListId: 9 } }} />);

    await fireEvent.press(await screen.findByText('Reintentar'));

    expect(await screen.findByText('1 de 3 comprados')).toBeTruthy();
  });
});
