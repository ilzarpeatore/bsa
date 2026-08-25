import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { FRONT_MUSCLES, BACK_MUSCLES, MUSCLE_MAP, ViewSide, MuscleDef } from '../constants/bodyMusclesPaths';
import { bodyMusclesIdsFor, bodyMusclesIdsForBodyPartId } from '../constants/bodyMusclesMap';
import { useAppColorMode } from '@helper/useAppColorMode';

const CONTEXT_FILL = '#E4E4E7';

/**
 * Extrae el bounding box aproximado de un `d` de path SVG sin depender de
 * ningun motor de render (react-native-svg no expone getBBox como el DOM).
 * No es geometricamente exacto para curvas 'c' (los puntos de control se
 * tratan igual que puntos on-curve), pero eso solo produce una caja igual o
 * ligeramente mayor que la real — sobra para recortar un icono, nunca falta.
 */
function computePathBounds(d: string): [number, number, number, number] | null {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let cx = 0;
  let cy = 0;
  let cmd: string | null = null;
  let idx = 0;

  const touch = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  while (idx < tokens.length) {
    const tok = tokens[idx];
    if (/^[a-zA-Z]$/.test(tok)) {
      cmd = tok;
      idx++;
      continue;
    }
    if (!cmd) {
      idx++;
      continue;
    }
    const lower = cmd.toLowerCase();
    const relative = cmd === lower;

    if (lower === 'z') {
      idx++;
    } else if (lower === 'h') {
      const val = parseFloat(tok);
      idx++;
      cx = relative ? cx + val : val;
      touch(cx, cy);
    } else if (lower === 'v') {
      const val = parseFloat(tok);
      idx++;
      cy = relative ? cy + val : val;
      touch(cx, cy);
    } else {
      const x = parseFloat(tok);
      const y = parseFloat(tokens[idx + 1]);
      idx += 2;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      cx = relative ? cx + x : x;
      cy = relative ? cy + y : y;
      touch(cx, cy);
    }
  }

  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

const BOUNDS_BY_ID = new Map<string, [number, number, number, number]>();
for (const m of MUSCLE_MAP) {
  const bounds = computePathBounds(m.path);
  if (bounds) BOUNDS_BY_ID.set(m.id, bounds);
}
const DEF_BY_ID = new Map<string, MuscleDef>(MUSCLE_MAP.map((m) => [m.id, m]));

interface Resolved {
  view: ViewSide;
  idsInView: Set<string>;
  viewBox: string;
}

function resolve(rawIds: string[]): Resolved | null {
  const defs = rawIds.map((id) => DEF_BY_ID.get(id)).filter((d): d is MuscleDef => !!d);
  if (defs.length === 0) return null;

  const frontCount = defs.filter((d) => d.view === ViewSide.FRONT).length;
  const backCount = defs.length - frontCount;
  const view = backCount > frontCount ? ViewSide.BACK : ViewSide.FRONT;
  const idsInView = defs.reduce((set, d) => {
    if (d.view === view) set.add(d.id);
    return set;
  }, new Set<string>());
  if (idsInView.size === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of idsInView) {
    const b = BOUNDS_BY_ID.get(id);
    if (!b) continue;
    minX = Math.min(minX, b[0]);
    minY = Math.min(minY, b[1]);
    maxX = Math.max(maxX, b[2]);
    maxY = Math.max(maxY, b[3]);
  }
  if (!Number.isFinite(minX)) return null;

  // Recorte cuadrado centrado en el musculo, con margen proporcional a su
  // tamano — asi un musculo pequeno (biceps) no queda tan "pegado" al borde
  // como uno grande (dorsales), y siempre se ve "de cerca" sin recortar de mas.
  const w = maxX - minX;
  const h = maxY - minY;
  const pad = Math.max(w, h) * 0.35 + 1.5;
  const side = Math.max(w, h) + pad * 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    view,
    idsInView,
    viewBox: `${cx - side / 2} ${cy - side / 2} ${side} ${side}`,
  };
}

interface Props {
  /** body_parts.id numerico (ej. exercise.bodypart_ids[0] / body_part_id de la API). */
  bodyPartId?: number | null;
  /** Alternativa: nombre de grupo canonico (ej. "Pecho") cuando ya se tiene el nombre y no el id — usado en la pantalla de detalle de ejercicio. */
  muscleName?: string | null;
  size?: number;
  color?: string;
  style?: any;
}

function MuscleIsolateIcon({ bodyPartId, muscleName, size = 44, color, style }: Props) {
  const { colors: C } = useAppColorMode();
  const resolvedColor = color ?? C.orange;
  const resolved = useMemo(() => {
    const rawIds = muscleName
      ? bodyMusclesIdsFor(muscleName)
      : bodyPartId != null
        ? bodyMusclesIdsForBodyPartId(bodyPartId)
        : [];
    return resolve(rawIds);
  }, [bodyPartId, muscleName]);

  if (!resolved) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Ionicons name="body-outline" size={size * 0.6} color={C.gray30} />
      </View>
    );
  }

  const muscles = resolved.view === ViewSide.FRONT ? FRONT_MUSCLES : BACK_MUSCLES;

  return (
    <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      <Svg width={size} height={size} viewBox={resolved.viewBox}>
        {muscles.map((m) => (
          <Path key={m.id} d={m.path} fill={resolved.idsInView.has(m.id) ? resolvedColor : CONTEXT_FILL} />
        ))}
      </Svg>
    </View>
  );
}

export const MuscleIsolateIconMem = React.memo(MuscleIsolateIcon);
export default MuscleIsolateIcon;
