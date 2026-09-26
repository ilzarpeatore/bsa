import {
  ALL_CATEGORY,
  MINE_CATEGORY,
  MINE_LABEL,
  OTHER_LABEL,
  buildEntries,
  categoryChips,
  filterEntries,
  groupEntries,
} from './habitLibrary';

const tpl = (id: number, title: string, category: string | null, extra: any = {}) => ({
  id,
  title,
  icon: 'water',
  category,
  target_value: null,
  target_unit: null,
  frequency: 'daily' as const,
  ...extra,
});
const own = (id: number, title: string, source_type = 'personal') => ({
  id,
  title,
  icon: 'fitness',
  target_value: 8,
  target_unit: 'veces',
  frequency: 'daily' as const,
  source_type,
});

const TEMPLATES = [
  tpl(15, 'Beber agua', 'Salud y fitness'),
  tpl(8, 'Despertarse temprano', 'Mañana'),
  tpl(30, 'Gratitud', 'Bienestar mental'),
  tpl(23, 'Leer', 'Productividad'),
  tpl(99, 'Sin categoría', null),
];

describe('buildEntries', () => {
  test('mezcla plantillas y solo los hábitos personales del cliente', () => {
    const entries = buildEntries(TEMPLATES, [own(6, 'Yoga en casa'), own(7, 'Adoptado', 'library'), own(8, 'Del coach', 'coach_assigned')]);
    expect(entries.filter((e) => e.kind === 'mine').map((e) => e.title)).toEqual(['Yoga en casa']);
    expect(entries).toHaveLength(6);
  });
  test('claves únicas aunque plantilla y hábito propio compartan id; sin categoría -> "Otros"', () => {
    const entries = buildEntries([tpl(6, 'A', null)], [own(6, 'B')]);
    expect(new Set(entries.map((e) => e.key)).size).toBe(2);
    expect(entries.find((e) => e.kind === 'template')?.category).toBe(OTHER_LABEL);
  });
  test('ignora datos malformados', () => {
    expect(buildEntries([null as any, { id: 1 } as any], [null as any])).toEqual([]);
  });
});

describe('categoryChips', () => {
  test('Todos, Creados por mí (si hay) y las categorías en su orden, con "Otros" al final', () => {
    const chips = categoryChips(buildEntries(TEMPLATES, [own(6, 'Yoga')]));
    expect(chips.map((c) => c.label)).toEqual([
      'Todos',
      MINE_LABEL,
      'Mañana',
      'Salud y fitness',
      'Bienestar mental',
      'Productividad',
      OTHER_LABEL,
    ]);
    expect(chips[0].count).toBe(6);
  });
  test('sin hábitos propios no aparece "Creados por mí"', () => {
    expect(categoryChips(buildEntries(TEMPLATES, [])).some((c) => c.id === MINE_CATEGORY)).toBe(false);
  });
});

describe('filterEntries', () => {
  const entries = buildEntries(TEMPLATES, [own(6, 'Beber té verde')]);

  test('por categoría', () => {
    expect(filterEntries(entries, '', 'Mañana').map((e) => e.title)).toEqual(['Despertarse temprano']);
    expect(filterEntries(entries, '', MINE_CATEGORY).map((e) => e.title)).toEqual(['Beber té verde']);
    expect(filterEntries(entries, '', ALL_CATEGORY)).toHaveLength(6);
  });
  test('búsqueda sin acentos, sin mayúsculas y tolerante a erratas; incluye los propios', () => {
    expect(filterEntries(entries, 'GRATITUD', ALL_CATEGORY).map((e) => e.title)).toEqual(['Gratitud']);
    expect(filterEntries(entries, 'despertarze', ALL_CATEGORY).map((e) => e.title)).toEqual(['Despertarse temprano']);
    expect(filterEntries(entries, 'beber', ALL_CATEGORY).map((e) => e.title).sort()).toEqual(['Beber agua', 'Beber té verde']);
  });
  test('también busca por el nombre de la categoría', () => {
    expect(filterEntries(entries, 'productividad', ALL_CATEGORY).map((e) => e.title)).toEqual(['Leer']);
  });
  test('la búsqueda respeta la categoría elegida', () => {
    expect(filterEntries(entries, 'beber', 'Salud y fitness').map((e) => e.title)).toEqual(['Beber agua']);
  });
  test('sin resultados -> vacío', () => {
    expect(filterEntries(entries, 'zzzzzz', ALL_CATEGORY)).toEqual([]);
  });
});

describe('groupEntries', () => {
  test('"Creados por mí" primero, luego las categorías en orden y sin secciones vacías', () => {
    const sections = groupEntries(buildEntries(TEMPLATES, [own(6, 'Yoga')]));
    expect(sections.map((s) => s.title)).toEqual([MINE_LABEL, 'Mañana', 'Salud y fitness', 'Bienestar mental', 'Productividad', OTHER_LABEL]);
    expect(groupEntries([])).toEqual([]);
  });
});
