// Lógica de presentación de la lista de la compra (lista y detalle). Pura, con tests
// (shoppingList.test.ts).
import type { ShoppingListItem, ShoppingListItemDetail } from '../../api/shopping';

/** Nombre a mostrar: ingrediente del catálogo o texto libre (añadido a mano o de FatSecret). */
export function itemName(item: ShoppingListItemDetail): string {
  return (item.ingredient_title || item.custom_item_name || '').trim() || 'Artículo sin nombre';
}

function formatQuantity(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

/** "3 tazas", "200 g", "" si no hay cantidad (las líneas de texto sin cantidad). */
export function quantityText(item: ShoppingListItemDetail): string {
  const qty = Number(item.display_quantity ?? 0);
  const unit = (item.display_unit_symbol || item.display_unit_title || '').trim();
  if (!(qty > 0)) return unit;
  return `${formatQuantity(qty)}${unit ? ` ${unit}` : ''}`;
}

export interface ListProgress {
  checked: number;
  total: number;
  /** 0..1 */
  ratio: number;
}

export function progressOf(items: { is_checked?: boolean }[], isChecked?: (i: any) => boolean): ListProgress {
  const total = items.length;
  const checked = items.filter((i) => (isChecked ? isChecked(i) : i.is_checked === true)).length;
  return { checked, total, ratio: total === 0 ? 0 : checked / total };
}

/** Sin marcar primero, marcados al final; dentro de cada grupo se conserva el orden original. */
export function sortUnchecked<T extends { id: number }>(items: T[], isChecked: (i: T) => boolean): T[] {
  return [...items.filter((i) => !isChecked(i)), ...items.filter((i) => isChecked(i))];
}

/** Título de categoría: el backend manda "Other" para lo que no tiene. */
export function categoryTitle(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  return !t || t.toLowerCase() === 'other' ? 'Otros' : t;
}

/** Texto plano de la lista para compartirla (WhatsApp, notas...). Sin marcados si `onlyPending`. */
export function listToText(
  title: string,
  items: ShoppingListItemDetail[],
  isChecked: (i: ShoppingListItemDetail) => boolean,
  onlyPending = false
): string {
  const lines = items
    .filter((i) => !onlyPending || !isChecked(i))
    .map((i) => {
      const q = quantityText(i);
      return `${isChecked(i) ? '[x]' : '[ ]'} ${itemName(i)}${q ? ` — ${q}` : ''}`;
    });
  return [title, '', ...lines].join('\n');
}

/** Texto bajo el título de una lista del listado: "12 artículos · 3 comprados". */
export function listSubtitle(list: Pick<ShoppingListItem, 'items_count'>, checked?: number): string {
  const n = list.items_count ?? 0;
  const base = `${n} ${n === 1 ? 'artículo' : 'artículos'}`;
  return checked && checked > 0 ? `${base} · ${checked} ${checked === 1 ? 'comprado' : 'comprados'}` : base;
}
