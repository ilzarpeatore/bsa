// Fechas de la lista de la compra (selector de "Nueva lista"): todo en fecha LOCAL,
// nunca con toISOString() (en zonas con offset desplaza el día). Lógica pura, con
// tests (shoppingDates.test.ts).

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
export const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD, >= start
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parsea 'YYYY-MM-DD' (o 'YYYY-MM-DD hh:mm:ss') como fecha local. */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Lunes de la semana de `dateStr` (semana lunes-domingo). */
export function startOfWeek(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return addDays(dateStr, -((d.getDay() + 6) % 7));
}

export interface RangePreset {
  id: string;
  label: string;
  range: DateRange;
}

/** Atajos habituales, calculados desde `today`. */
export function rangePresets(today: string): RangePreset[] {
  const weekStart = startOfWeek(today);
  const t = parseDateStr(today);
  const monthEnd = toDateStr(new Date(t.getFullYear(), t.getMonth() + 1, 0));
  return [
    { id: 'today', label: 'Hoy', range: { start: today, end: today } },
    { id: 'tomorrow', label: 'Mañana', range: { start: addDays(today, 1), end: addDays(today, 1) } },
    { id: 'week', label: 'Esta semana', range: { start: weekStart, end: addDays(weekStart, 6) } },
    { id: 'next7', label: 'Próximos 7 días', range: { start: today, end: addDays(today, 6) } },
    { id: 'month', label: 'Este mes', range: { start: today, end: monthEnd } },
  ];
}

export function sameRange(a: DateRange, b: DateRange): boolean {
  return a.start === b.start && a.end === b.end;
}

/**
 * Selección con toques en el calendario: 1er toque = ese día; 2º toque (otro día) =
 * rango entre ambos (en cualquier orden); un toque más = vuelve a empezar.
 */
export function nextRange(current: DateRange | null, tapped: string): DateRange {
  if (!current || current.start !== current.end) return { start: tapped, end: tapped };
  if (tapped === current.start) return current;
  return tapped > current.start ? { start: current.start, end: tapped } : { start: tapped, end: current.start };
}

/** Celdas del mes (lunes primero): null para los huecos antes/después del mes. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const total = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array((first.getDay() + 6) % 7).fill(null);
  for (let d = 1; d <= total; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const dayMonth = (s: string) => {
  const d = parseDateStr(s);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
};

/** "27 sep" / "27–30 sep" / "28 sep – 3 oct". */
export function describeRange(r: DateRange): string {
  if (r.start === r.end) return dayMonth(r.start);
  const a = parseDateStr(r.start);
  const b = parseDateStr(r.end);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${MONTH_SHORT[b.getMonth()]}`;
  }
  return `${dayMonth(r.start)} – ${dayMonth(r.end)}`;
}

/** Título por defecto de una lista nueva. */
export function defaultListTitle(r: DateRange): string {
  return `Compra ${describeRange(r)}`;
}

/** Días naturales que abarca el rango (inclusive). */
export function rangeDays(r: DateRange): number {
  const ms = parseDateStr(r.end).getTime() - parseDateStr(r.start).getTime();
  return Math.round(ms / 86400000) + 1;
}
