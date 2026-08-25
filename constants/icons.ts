import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Mapa canónico de iconos por concepto de acción (Fase 2 — Visual System,
 * docs/AUDITORIA_UIUX_2026-08-24.md sección 13). Mismo patrón que
 * constants/habitIcons.ts, pero para acciones de UI recurrentes en vez de
 * iconos de hábito elegibles por el usuario -- son constantes fijas, no
 * hace falta un resolver con fallback (no hay "key desconocida" en tiempo
 * de ejecución, cada uso importa directamente `ACTION_ICONS.back`, etc.).
 *
 * Investigación previa a este mapa (grep de Ionicons reales en uso, no
 * suposición) encontró 4 conceptos con variantes -- de los cuales solo
 * "volver" era una inconsistencia real sin justificación; los otros 3
 * resultaron ser 2 conceptos legítimamente distintos cada uno, no una
 * inconsistencia a corregir:
 *
 * - Volver: `chevron-back` ya es mayoritario (ScreenHeader.tsx + la mayoría
 *   de pantallas); `arrow-back` era la variante suelta, ya migrada a
 *   `chevron-back` en los 2 archivos que la usaban
 *   (home/link_device_choice_screen.tsx, home/link_device_list_screen.tsx).
 * - Editar: `create-outline` ("editar sección/formulario") y `pencil`
 *   ("editar avatar/entrada inline") son usos distintos en la práctica, no
 *   una inconsistencia -- se documentan ambos con nombre en vez de forzar
 *   uno solo sin evidencia de cuál es "el correcto".
 * - Guardar/Favorito: `heart`/`heart-outline` (favorito, toggle real) y
 *   `bookmark`/`bookmark-outline` (guardado/bookmarks) son features
 *   distintas de la app, no la misma acción con dos iconos.
 * - Eliminar/Descartar: `trash-outline` para eliminar un elemento YA
 *   guardado (fila de una lista persistida) vs. `close-circle` para
 *   descartar un elemento aún no guardado (miniatura de imagen
 *   seleccionada, chip de un formulario) -- son dos momentos distintos del
 *   ciclo de vida del dato, el patrón estándar de badge "×" sobre una
 *   miniatura es `close-circle`, no `trash-outline`.
 */
export const ACTION_ICONS = {
  back: 'chevron-back' as IoniconName,

  editSection: 'create-outline' as IoniconName,
  editInline: 'pencil' as IoniconName,

  favorite: 'heart-outline' as IoniconName,
  favoriteActive: 'heart' as IoniconName,
  bookmark: 'bookmark-outline' as IoniconName,
  bookmarkActive: 'bookmark' as IoniconName,

  delete: 'trash-outline' as IoniconName,
  dismiss: 'close-circle' as IoniconName,
} as const;
