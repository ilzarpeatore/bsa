import { useMemo } from 'react';
import { C } from '../pages/migrated/theme';
import { useAppColorMode } from '@helper/useAppColorMode';

function buildColors(c: typeof C) {
  return {
    BG_PRIMARY: c.bg,
    BG_INPUT: c.surface,
    BG_CARD: c.surfaceLight,

    ACCENT_START: c.brand50,
    ACCENT_END: c.brand60,
    ACCENT_ACTIVE: c.brand60,

    TEXT_PRIMARY: c.white,
    TEXT_SECONDARY: c.textSecondary,
    TEXT_MUTED: c.textMuted,

    // Hex sueltos, no pasan por c a proposito en ambos modos - Actualizados
    // para que DietCard tenga un fondo real claro en vez de quedar oscuro
    // con texto oscuro encima (Encargo 2), independientemente del tema.
    BORDER_START: "rgba(0,0,0,0.08)",
    BORDER_END: "rgba(0,0,0,0)",

    PINK_ACCENT: c.pink,
    SUCCESS: c.success,
    DANGER: c.destructive,

    CARD_START: "#FFFFFF",
    CARD_END: "#FFFFFF",
  } as const;
}

// Export estatico original -- SIN cambios de comportamiento para sus
// consumidores existentes (pantallas de auth, DietCard, etc.): siempre
// devuelve la paleta CLARA, calculada una vez al importar el modulo. NO
// reacciona al modo oscuro de la app -- ver useColors() para eso.
export const Colors = buildColors(C);

// Version reactiva de Colors, para pantallas que si deben seguir el modo
// oscuro real de la app (BUG-046: DietDashboard.tsx/DietList.tsx se veian
// siempre en modo claro pese a tener el resto de la app en oscuro, porque
// Colors se calculaba una sola vez con la paleta clara `C` en vez de leer
// useAppColorMode()). Memoizado sobre `c` (la referencia de colores de
// useAppColorMode, estable hasta que cambia el modo) para no recalcular en
// cada render.
export function useColors() {
  const { colors: c } = useAppColorMode();
  return useMemo(() => buildColors(c), [c]);
}
