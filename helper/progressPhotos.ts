import type { ProgressPhoto, ProgressPhotoPose } from '../api/progressPhotos';
import type { BodyMetricChartData } from '../api/bodyMetrics';

// Lógica pura de la pantalla de Fotos de progreso (sin React), para poder
// probarla con Jest: agrupar por sesión (fecha), elegir la pareja por defecto
// del comparador y calcular el cambio de peso/cintura entre dos fechas.

export interface PhotoSession {
  date: string; // YYYY-MM-DD
  photos: ProgressPhoto[];
}

const POSE_ORDER: Record<ProgressPhotoPose, number> = { front: 0, side: 1, back: 2, other: 3 };

// Una "sesión" = todas las fotos de un mismo día, más reciente primero y,
// dentro del día, en orden frente, perfil, espalda.
export function groupByDate(photos: ProgressPhoto[]): PhotoSession[] {
  const map = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    const list = map.get(p.taken_at) ?? [];
    list.push(p);
    map.set(p.taken_at, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({
      date,
      photos: [...list].sort((a, b) => POSE_ORDER[a.pose] - POSE_ORDER[b.pose] || a.id - b.id),
    }));
}

// La última foto de una pose (para mostrarla en transparencia al hacer la
// siguiente y repetir el encuadre).
export function latestOfPose(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose,
): ProgressPhoto | null {
  return (
    photos
      .filter((p) => p.pose === pose)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at) || b.id - a.id)[0] ?? null
  );
}

// Fechas (ascendente) que tienen foto de esa pose.
export function datesWithPose(photos: ProgressPhoto[], pose: ProgressPhotoPose): string[] {
  return [...new Set(photos.filter((p) => p.pose === pose).map((p) => p.taken_at))].sort();
}

// Pareja por defecto del comparador: la primera foto y la última de la pose
// elegida. null si no hay al menos dos fechas distintas.
export function defaultComparison(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose,
): { before: string; after: string } | null {
  const dates = datesWithPose(photos, pose);
  if (dates.length < 2) return null;
  return { before: dates[0], after: dates[dates.length - 1] };
}

export function photoFor(
  photos: ProgressPhoto[],
  pose: ProgressPhotoPose,
  date: string,
): ProgressPhoto | null {
  return (
    photos.filter((p) => p.pose === pose && p.taken_at === date).sort((a, b) => b.id - a.id)[0] ??
    null
  );
}

// Valor de una medida en una fecha: la medida más cercana dentro de ±14 días
// (las fotos y la báscula rara vez caen el mismo día).
export function metricNear(
  chart: BodyMetricChartData,
  key: string,
  date: string,
  maxDays = 14,
): number | null {
  const points = chart[key]?.data ?? [];
  const target = Date.parse(date);
  let best: { value: number; diff: number } | null = null;
  for (const p of points) {
    const diff = Math.abs(Date.parse(p.date.slice(0, 10)) - target) / 86400000;
    if (diff <= maxDays && (!best || diff < best.diff)) best = { value: Number(p.value), diff };
  }
  return best ? best.value : null;
}

export interface MetricChange {
  key: string;
  label: string;
  unit: string;
  before: number;
  after: number;
  delta: number;
}

const COMPARE_METRICS = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'body_fat', label: 'Grasa', unit: '%' },
];

export function metricChanges(
  chart: BodyMetricChartData,
  before: string,
  after: string,
): MetricChange[] {
  const out: MetricChange[] = [];
  for (const m of COMPARE_METRICS) {
    const a = metricNear(chart, m.key, before);
    const b = metricNear(chart, m.key, after);
    if (a === null || b === null) continue;
    out.push({
      ...m,
      unit: chart[m.key]?.unit || m.unit,
      before: a,
      after: b,
      delta: Math.round((b - a) * 10) / 10,
    });
  }
  return out;
}

// Días entre dos fechas YYYY-MM-DD, para "en 84 días".
export function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(Date.parse(b) - Date.parse(a)) / 86400000);
}

// 2026-09-01 -> "1 sept 2026"
export function formatPhotoDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// EXIF "2026:09:01 10:20:00" -> "2026-09-01" (para fotos elegidas de la galería).
export function dateFromExif(exif: Record<string, unknown> | null | undefined): string | null {
  const raw = (exif?.DateTimeOriginal ?? exif?.DateTime) as string | undefined;
  const m = typeof raw === 'string' ? raw.match(/^(\d{4}):(\d{2}):(\d{2})/) : null;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
