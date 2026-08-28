export interface HabitLogLike {
  date: string;
  is_completed: boolean;
  value_logged?: number | string | null;
}

/** 7 booleanos (Lunes..Domingo de la semana en curso) a partir de un array de logs con fecha + is_completed. */
export function computeWeekCompliance(logs: HabitLogLike[]): boolean[] {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));

  const completedDates = logs.reduce((set, l) => {
    if (l.is_completed) set.add(l.date.slice(0, 10));
    return set;
  }, new Set<string>());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return completedDates.has(d.toISOString().slice(0, 10));
  });
}

/** Igual que computeWeekCompliance, pero devuelve por día la FRACCIÓN (0..1)
 * de cumplimiento respecto a un objetivo numérico (p.ej. hábito "leer 4
 * libros" con 2 registrados ese día -> 0.5), en vez de un simple hecho/no
 * hecho -- pedido explícito del usuario para que el círculo de
 * WeekComplianceRow se rellene por porcentaje en hábitos con objetivo
 * numérico (mismo concepto que `isGoalHabit`/`target_value`/`value_logged`
 * ya usado en habit_detail_screen.tsx). Sin `targetValue` (o <= 0), cae al
 * mismo criterio binario que computeWeekCompliance (1 si is_completed, si no
 * 0) -- mismo comportamiento de siempre para hábitos sin objetivo numérico. */
export function computeWeekProgress(logs: HabitLogLike[], targetValue?: number | string | null): number[] {
  const target = Number(targetValue);
  const hasTarget = Number.isFinite(target) && target > 0;
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));

  const logsByDate = logs.reduce((map, l) => {
    map.set(l.date.slice(0, 10), l);
    return map;
  }, new Map<string, HabitLogLike>());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const log = logsByDate.get(d.toISOString().slice(0, 10));
    if (!log) return 0;
    if (hasTarget) {
      const value = Number(log.value_logged);
      if (!Number.isFinite(value)) return log.is_completed ? 1 : 0;
      return Math.min(1, Math.max(0, value / target));
    }
    return log.is_completed ? 1 : 0;
  });
}
