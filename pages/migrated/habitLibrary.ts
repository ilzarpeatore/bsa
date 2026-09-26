// Biblioteca de hábitos de "Añadir hábito" (habit_add_screen.tsx): plantillas del
// coach + los hábitos propios del cliente, con búsqueda por texto y categorías.
// Lógica pura, sin React, con sus propios tests (habitLibrary.test.ts).
import { fuzzyFilter } from '../../helper/textSearch';

export const ALL_CATEGORY = 'all';
export const MINE_CATEGORY = 'mine';
export const MINE_LABEL = 'Creados por mí';
export const OTHER_LABEL = 'Otros';

// Orden en el que se muestran las categorías del coach; las que no estén aquí
// van después, por orden alfabético, y "Otros" (sin categoría) al final.
const CATEGORY_ORDER = ['Mañana', 'Salud y fitness', 'Bienestar mental', 'Productividad', 'Social y hogar'];

export interface TemplateLike {
  id: number;
  title: string;
  icon: string | null;
  category?: string | null;
  target_value: number | string | null;
  target_unit: string | null;
  frequency: 'daily' | 'weekly';
}

export interface OwnHabitLike {
  id: number;
  title: string;
  icon: string | null;
  target_value: number | string | null;
  target_unit: string | null;
  frequency: 'daily' | 'weekly';
  source_type: string;
}

export interface LibraryEntry {
  /** Clave única para la lista (las plantillas y los hábitos propios pueden compartir id). */
  key: string;
  kind: 'template' | 'mine';
  id: number;
  title: string;
  icon: string | null;
  category: string;
  targetValue: number | string | null;
  targetUnit: string | null;
  frequency: 'daily' | 'weekly';
}

export interface CategoryChip {
  id: string;
  label: string;
  count: number;
}

export interface EntrySection {
  title: string;
  data: LibraryEntry[];
}

function categoryRank(label: string): number {
  if (label === OTHER_LABEL) return 1000;
  const i = CATEGORY_ORDER.indexOf(label);
  return i === -1 ? 100 : i;
}

function compareCategories(a: string, b: string): number {
  const d = categoryRank(a) - categoryRank(b);
  return d !== 0 ? d : a.localeCompare(b, 'es');
}

/** Plantillas del coach + hábitos que el propio cliente creó (source_type "personal"). */
export function buildEntries(templates: TemplateLike[], ownHabits: OwnHabitLike[]): LibraryEntry[] {
  const fromTemplates: LibraryEntry[] = templates
    .filter((t) => t && typeof t.title === 'string')
    .map((t) => ({
      key: `t${t.id}`,
      kind: 'template',
      id: t.id,
      title: t.title,
      icon: t.icon ?? null,
      category: (t.category ?? '').toString().trim() || OTHER_LABEL,
      targetValue: t.target_value ?? null,
      targetUnit: t.target_unit ?? null,
      frequency: t.frequency,
    }));
  const mine: LibraryEntry[] = ownHabits
    .filter((h) => h && h.source_type === 'personal' && typeof h.title === 'string')
    .map((h) => ({
      key: `m${h.id}`,
      kind: 'mine',
      id: h.id,
      title: h.title,
      icon: h.icon ?? null,
      category: MINE_LABEL,
      targetValue: h.target_value ?? null,
      targetUnit: h.target_unit ?? null,
      frequency: h.frequency,
    }));
  return [...mine, ...fromTemplates];
}

/** "Todos" + una por categoría del coach (con datos) + "Creados por mí" si el cliente tiene alguno. */
export function categoryChips(entries: LibraryEntry[]): CategoryChip[] {
  const counts = new Map<string, number>();
  let mine = 0;
  entries.forEach((e) => {
    if (e.kind === 'mine') mine += 1;
    else counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  });
  const chips: CategoryChip[] = [{ id: ALL_CATEGORY, label: 'Todos', count: entries.length }];
  if (mine > 0) chips.push({ id: MINE_CATEGORY, label: MINE_LABEL, count: mine });
  [...counts.keys()]
    .sort(compareCategories)
    .forEach((label) => chips.push({ id: label, label, count: counts.get(label) ?? 0 }));
  return chips;
}

/** Aplica la categoría elegida y el texto buscado (sin acentos y tolerante a erratas). */
export function filterEntries(entries: LibraryEntry[], query: string, categoryId: string): LibraryEntry[] {
  const inCategory = entries.filter((e) => {
    if (categoryId === ALL_CATEGORY) return true;
    if (categoryId === MINE_CATEGORY) return e.kind === 'mine';
    return e.kind === 'template' && e.category === categoryId;
  });
  const q = query.trim();
  return q ? fuzzyFilter(inCategory, q, (e) => [e.title, e.category], { rank: true }) : inCategory;
}

/** Secciones para la lista: "Creados por mí" primero y luego cada categoría, sin secciones vacías. */
export function groupEntries(entries: LibraryEntry[]): EntrySection[] {
  const byCategory = new Map<string, LibraryEntry[]>();
  entries.forEach((e) => {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  });
  const labels = [...byCategory.keys()].sort((a, b) => {
    if (a === MINE_LABEL) return -1;
    if (b === MINE_LABEL) return 1;
    return compareCategories(a, b);
  });
  return labels.map((title) => ({ title, data: byCategory.get(title) ?? [] }));
}
