// Precarga de la carga con "la última que el cliente usó DENTRO del rango de
// reps que le toca hacer" (pedido explícito 2026-09-26). Lógica pura, sin
// React: la usa buildInitialRows (workout_session_screen.tsx) y tiene sus
// propios tests (workoutPrefill.test.ts).

export interface RepRange {
  min: number;
  max: number;
}

export interface PerformanceSession {
  /** Y-m-d de la sesión (informativo). */
  date?: string | null;
  sets: Record<string, any>[];
}

/** "12" / "12,5" -> true; "12-15", "Subir", "" -> false. */
export function isNumericValue(v: unknown): boolean {
  if (v == null) return false;
  const t = String(v).trim().replace(',', '.');
  return t !== '' && !Number.isNaN(Number(t));
}

function toNumber(v: unknown): number {
  return Number(String(v).trim().replace(',', '.'));
}

/**
 * Rango de reps prescrito. Entiende "12-15" (también con guion largo o "a":
 * "12 a 15"), "10" y el número suelto. Cualquier otra cosa ("AMRAP",
 * "10-12/lado", "al fallo", vacío) devuelve null: no hay rango que comparar.
 */
export function parseRepRange(raw: unknown): RepRange | null {
  if (raw == null) return null;
  const t = String(raw).trim().replace(/,/g, '.');
  const range = t.match(/^(\d+(?:\.\d+)?)\s*(?:[-–—]|a)\s*(\d+(?:\.\d+)?)$/i);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
  }
  const single = t.match(/^(\d+(?:\.\d+)?)$/);
  if (single) {
    const n = Number(single[1]);
    return { min: n, max: n };
  }
  return null;
}

/**
 * Historial a mirar, del más nuevo al más viejo: `recent_performance` si el
 * backend lo trae y, si no (backend antiguo, workout sin historial reciente),
 * solo la última sesión (`last_performance`).
 */
export function performanceSessions(
  recent: PerformanceSession[] | null | undefined,
  last: { sets: Record<string, any>[] } | null | undefined
): PerformanceSession[] {
  if (Array.isArray(recent) && recent.length > 0) return recent;
  return last && Array.isArray(last.sets) && last.sets.length > 0 ? [{ sets: last.sets }] : [];
}

/**
 * Series de la sesión MÁS RECIENTE que tenga alguna con reps dentro del rango
 * (inclusive) y carga numérica, en su orden original. Vacío si ninguna sesión
 * tiene una serie comparable.
 */
export function findSetsInRange(sessions: PerformanceSession[], range: RepRange): Record<string, any>[] {
  for (const session of sessions) {
    const sets = (Array.isArray(session?.sets) ? session.sets : []).filter(
      (s) =>
        s != null &&
        isNumericValue(s.reps) &&
        isNumericValue(s.carga) &&
        toNumber(s.reps) >= range.min &&
        toNumber(s.reps) <= range.max
    );
    if (sets.length > 0) return sets;
  }
  return [];
}

/**
 * Serie de referencia para la fila `rowIndex` (0-based): la de la misma
 * posición entre las series en rango; si esta fila tiene más series que las
 * que hay en rango (o es una pirámide más corta), la última de ellas.
 */
export function pickReferenceSet(
  inRangeSets: Record<string, any>[],
  rowIndex: number
): Record<string, any> | undefined {
  if (inRangeSets.length === 0) return undefined;
  return inRangeSets[Math.min(rowIndex, inRangeSets.length - 1)];
}
