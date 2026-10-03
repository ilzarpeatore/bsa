import type { TrainingTechniqueItem } from '../../api/workoutTemplate';

// Técnica especial de un ejercicio (cluster, rest-pause, drop sets...), lista
// para mostrar. Lógica pura, sin red -- el catálogo lo carga
// getTrainingTechniques() en workoutViewShared.ts.

export interface TechniqueInfo {
  key: string;
  label: string;
  /** Qué es, en una o dos frases ('' si no hay). */
  description: string;
  steps: string[];
  mistakes: string[];
  /** Cómo apuntar la serie en la app ('' si no hay). */
  logging: string;
  /** true = solo en la última serie. */
  lastSetOnly: boolean;
}

/**
 * Técnica del ejercicio lista para mostrar, o null si no lleva. Sin catálogo
 * (aún cargando o sin red) usa la clave legible, para no ocultar la técnica.
 */
export function resolveTechnique(
  prescribed: Record<string, any> | null | undefined,
  catalog: TrainingTechniqueItem[]
): TechniqueInfo | null {
  const key = String(prescribed?.tecnica ?? '').trim();
  if (!key) return null;
  const item = catalog.find((t) => t.key === key);
  const otra = String(prescribed?.tecnica_otra ?? '').trim();
  const label = key === 'otra' ? otra || item?.label || 'Técnica especial' : item?.label ?? key.replace(/_/g, ' ');
  return {
    key,
    label,
    description: item?.description ?? '',
    steps: item?.steps ?? [],
    mistakes: item?.mistakes ?? [],
    logging: item?.logging ?? '',
    lastSetOnly: prescribed?.tecnica_series === 'ultima',
  };
}

/** "Rest-pause · última serie" */
export function formatTechnique(info: TechniqueInfo): string {
  return info.lastSetOnly ? `${info.label} · última serie` : info.label;
}

// --- Registro por partes (2026-10-03) ---
// Las técnicas de abajo se apuntan por tramos: la serie guarda el primer
// tramo (lo que cuenta para 1RM y récords) y cada bajada / mini-serie va en
// `partes`. Antes se apuntaba todo junto ("80 kg × 13") y el backend
// estimaba un 1RM inflado (ver bckbs LoggedSetMath).

export interface TechniquePartsConfig {
  /** Texto del botón para añadir un tramo. */
  addLabel: string;
  /** Nombre corto de cada tramo ("Bajada 1"). */
  partLabel: string;
  /** Pausa entre tramos en segundos (null = sin pausa, se encadena). */
  pauseSeconds: number | null;
  /** Peso propuesto para el tramo nuevo, a partir del anterior. */
  nextWeight: (prev: number | null) => number | null;
}

const sameWeight = (prev: number | null) => prev;
// Bajada típica de un drop set: ~20 %, redondeado a 2,5 kg (nunca a 0).
export function dropWeight(prev: number | null): number | null {
  if (prev == null || !isFinite(prev) || prev <= 0) return null;
  const w = Math.round((prev * 0.8) / 2.5) * 2.5;
  return w > 0 && w < prev ? w : Math.max(0, prev - 2.5) || null;
}

export const PARTS_TECHNIQUES: Record<string, TechniquePartsConfig> = {
  drop_sets: { addLabel: 'Bajada', partLabel: 'Bajada', pauseSeconds: null, nextWeight: dropWeight },
  drop_sets_mecanicos: { addLabel: 'Variante', partLabel: 'Variante', pauseSeconds: null, nextWeight: sameWeight },
  rest_pause: { addLabel: 'Mini-serie', partLabel: 'Mini-serie', pauseSeconds: 15, nextWeight: sameWeight },
  rest_pause_ampliado: { addLabel: 'Mini-serie', partLabel: 'Mini-serie', pauseSeconds: 15, nextWeight: sameWeight },
  cluster_sets: { addLabel: 'Mini-serie', partLabel: 'Mini-bloque', pauseSeconds: 15, nextWeight: sameWeight },
  myo_reps: { addLabel: 'Mini-serie', partLabel: 'Mini-serie', pauseSeconds: 15, nextWeight: sameWeight },
  parciales: { addLabel: 'Parciales', partLabel: 'Parciales', pauseSeconds: null, nextWeight: sameWeight },
};

/** Máximo de tramos extra por serie (mismo límite que el backend). */
export const MAX_TECHNIQUE_PARTS = 6;

/** Descanso fijo tras cada serie de BFR (la ficha pide ~30 s con la banda puesta). */
export const BFR_REST_SECONDS = 30;

/** ¿La técnica se aplica a la serie `rowIdx`? (todas, o solo la última). */
export function techniqueAppliesToRow(info: TechniqueInfo | null, rowIdx: number, rowCount: number): boolean {
  if (!info) return false;
  return info.lastSetOnly ? rowIdx === rowCount - 1 : true;
}

export function partsConfigFor(info: TechniqueInfo | null): TechniquePartsConfig | null {
  return info ? (PARTS_TECHNIQUES[info.key] ?? null) : null;
}

export interface TechniquePart {
  carga: string;
  reps: string;
}

/** Tramos listos para enviar: solo los que tienen reps > 0. */
export function partsPayload(parts: TechniquePart[] | undefined): { carga: number | null; reps: number }[] {
  return (parts ?? [])
    .map((p) => ({ carga: parseFloat(p.carga), reps: parseInt(p.reps, 10) }))
    .filter((p) => Number.isFinite(p.reps) && p.reps > 0)
    .slice(0, MAX_TECHNIQUE_PARTS)
    .map((p) => ({ carga: Number.isFinite(p.carga) ? p.carga : null, reps: p.reps }));
}

/** Total de repeticiones de la serie con sus tramos ("8 + 3 + 2 = 13"). */
export function totalReps(mainReps: string | undefined, parts: TechniquePart[] | undefined): number {
  const main = parseInt(mainReps ?? '', 10);
  return (Number.isFinite(main) ? main : 0) + partsPayload(parts).reduce((s, p) => s + p.reps, 0);
}
