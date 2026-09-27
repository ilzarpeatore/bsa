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
