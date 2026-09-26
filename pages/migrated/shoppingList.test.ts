import { categoryTitle, itemName, listSubtitle, listToText, progressOf, quantityText, sortUnchecked } from './shoppingList';

const item = (over: any = {}) => ({
  id: 1, shopping_list_id: 1, ingredient_id: null, ingredient_title: null, ingredient_category_id: null,
  ingredient_category_title: null, custom_item_name: null, total_grams: null, display_quantity: 0,
  measurement_unit_id: null, display_unit_title: null, display_unit_symbol: null, is_checked: false,
  manually_added: false, created_at: '', updated_at: '', ...over,
});

describe('itemName', () => {
  test('ingrediente del catálogo, texto libre (FatSecret / a mano) o marcador', () => {
    expect(itemName(item({ ingredient_title: 'Arroz' }))).toBe('Arroz');
    expect(itemName(item({ custom_item_name: 'Brócoli picado' }))).toBe('Brócoli picado');
    expect(itemName(item({ ingredient_title: 'Arroz', custom_item_name: 'otro' }))).toBe('Arroz');
    expect(itemName(item())).toBe('Artículo sin nombre');
  });
});

describe('quantityText', () => {
  test('cantidad con unidad, decimales con coma y sin ceros de más', () => {
    expect(quantityText(item({ display_quantity: 200, display_unit_symbol: 'g' }))).toBe('200 g');
    expect(quantityText(item({ display_quantity: 1.5, display_unit_symbol: 'tazas' }))).toBe('1,5 tazas');
    expect(quantityText(item({ display_quantity: 0.6300001, display_unit_symbol: 'tsp' }))).toBe('0,63 tsp');
  });
  test('sin cantidad no enseña un 0 (líneas de texto): solo la unidad si la hay', () => {
    expect(quantityText(item({ display_quantity: 0 }))).toBe('');
    expect(quantityText(item({ display_quantity: 0, display_unit_title: 'al gusto' }))).toBe('al gusto');
    expect(quantityText(item({ display_quantity: 3 }))).toBe('3');
  });
});

describe('progressOf y sortUnchecked', () => {
  const items = [item({ id: 1 }), item({ id: 2 }), item({ id: 3 }), item({ id: 4 })];
  const checked = (i: { id: number }) => i.id === 2 || i.id === 4;
  test('progreso', () => {
    expect(progressOf(items, checked)).toEqual({ checked: 2, total: 4, ratio: 0.5 });
    expect(progressOf([])).toEqual({ checked: 0, total: 0, ratio: 0 });
  });
  test('los marcados van al final sin alterar el orden dentro de cada grupo', () => {
    expect(sortUnchecked(items, checked).map((i) => i.id)).toEqual([1, 3, 2, 4]);
  });
});

describe('textos', () => {
  test('categoryTitle traduce "Other" y vacío', () => {
    expect(categoryTitle('Other')).toBe('Otros');
    expect(categoryTitle(null)).toBe('Otros');
    expect(categoryTitle('Lácteos')).toBe('Lácteos');
  });
  test('listSubtitle con singular/plural y comprados', () => {
    expect(listSubtitle({ items_count: 1 })).toBe('1 artículo');
    expect(listSubtitle({ items_count: 12 }, 3)).toBe('12 artículos · 3 comprados');
    expect(listSubtitle({ items_count: 5 }, 1)).toBe('5 artículos · 1 comprado');
  });
  test('listToText marca lo comprado y admite solo pendientes', () => {
    const items = [
      item({ id: 1, ingredient_title: 'Arroz', display_quantity: 200, display_unit_symbol: 'g' }),
      item({ id: 2, custom_item_name: 'Sal' }),
    ];
    const isChecked = (i: { id: number }) => i.id === 2;
    expect(listToText('Compra', items, isChecked)).toBe('Compra\n\n[ ] Arroz — 200 g\n[x] Sal');
    expect(listToText('Compra', items, isChecked, true)).toBe('Compra\n\n[ ] Arroz — 200 g');
  });
});
