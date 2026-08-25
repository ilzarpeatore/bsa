# Improvements

Registro de mejoras detectadas o aplicadas durante el desarrollo y auditoría de la aplicación — cosas que **funcionaban correctamente** pero podían hacerse mejor. No mezclar con `BUGS_AND_FIXES.md`: un bug es un comportamiento incorrecto respecto a lo esperado; una mejora es una oportunidad de hacer algo que ya funciona de forma más consistente, mantenible o pulida.

---

# IMP-001 — Ajuste de paleta de neutros a partir de capturas de referencia

**Estado:** ✅ Aplicada
**Categoría:** UI
**Fase:** Fase 1 — Ajuste de paleta

## Descripción

El usuario proporcionó 2 capturas de referencia (modo claro y oscuro) y pidió que los colores neutros de la app (`bg`, `surface`, `textPrimary`, `textSecondary`) se ajustaran para igualar esas referencias.

## Motivación

Alinear la paleta visual de la app con una referencia de diseño real, en vez de valores estimados a ojo.

## Cambio aplicado

Colores re-muestreados por píxel (no a ojo) de las capturas, tanto para `C` como para `C_DARK` en `pages/migrated/theme.ts`. `border` se mantuvo sin cambios en ambos modos porque las capturas no mostraban ningún trazo de borde visible entre tarjetas (se separan por espacio + sombra).

## Archivos afectados

- `pages/migrated/theme.ts`

## Notas

Documentado con comentarios explicando la metodología (pixel-muestreado vs. estimado) directamente en `theme.ts`, para que futuros ajustes de paleta sepan qué valores vienen de evidencia real y cuáles son estimaciones.

---

# IMP-002 — Documentación de metodología de color en `theme.ts`

**Estado:** ✅ Aplicada
**Categoría:** Otros
**Fase:** Fase 1

## Descripción

Los cambios de paleta y contraste WCAG se documentaron con comentarios explicativos directamente en `pages/migrated/theme.ts`, explicando el origen de cada valor y el razonamiento detrás de decisiones de compromiso (p. ej. por qué `textTertiary` no llega al 4.5:1 completo).

## Motivación

Evitar que futuros cambios de color deshagan sin saberlo una decisión de contraste/jerarquía ya tomada deliberadamente.

## Cambio aplicado

Comentarios añadidos en los bloques de `C` y `C_DARK`.

## Archivos afectados

- `pages/migrated/theme.ts`

---

# IMP-003 — Unificar nombres de color duplicados (pendiente, no aplicada)

**Estado:** 🔲 No aplicada — oportunidad detectada, no implementada
**Categoría:** Otros
**Fase:** Auditoría (docs/AUDITORIA_UIUX_2026-08-24.md)

## Descripción

`theme.ts` tiene 5 nombres distintos (`primary`, `brand50`, `brand60`, `gray70`, `gray80`) que valen literalmente el mismo hex (`#E5E5EA`). Cuando alguien necesita "el gris de acento" no tiene ninguna señal de cuál de los 5 nombres usar, lo que ya ha causado inconsistencias de nomenclatura entre pantallas (p. ej. `plan_screen.tsx` usa la generación vieja de nombres, `edit_profile_screen.tsx` la nueva).

## Motivación

Un solo nombre canónico reduce el riesgo de que un futuro cambio de color solo actualice 1 de los 5 alias y deje inconsistencias.

## Propuesta (no aplicada)

Un solo nombre (`accent` o `brandAccent`), dejando los otros 4 como alias de compatibilidad marcados `@deprecated` en comentario, no como opciones activas a usar en código nuevo.

## Archivos afectados (si se aplicara)

- `pages/migrated/theme.ts` (definición)
- Sin cambio funcional en el resto de archivos — es un refactor de nombres puro, mismo valor.

## Notas

No se implementó en esta ronda porque no formaba parte de lo pedido explícitamente (cierre de bugs de modo oscuro) y es un refactor de mayor alcance (tocaría el naming en muchos archivos). Se deja documentada como mejora para una futura fase.

---

# IMP-004 — Migrar botones de `StyleSheet` a mano al componente `Button` compartido

**Estado:** 🔲 No aplicada — oportunidad detectada, no implementada
**Categoría:** UI
**Fase:** Fase 1 — Cierre (contraste, CTA, catches)

## Descripción

`my_program_calendar_screen.tsx` tiene 2 botones ("Enviar solicitud"/"Guardar cambios") implementados a mano con `StyleSheet` en vez de usar el componente `Button` compartido del design system. `change_pwd_screen.tsx` tiene un caso similar en su botón "Guardar".

## Motivación

Usar el componente compartido en vez de reimplementar botones a mano reduciría el riesgo de que vuelvan a divergir en tamaño/radio del resto de CTAs de la app — la causa raíz de BUG-013.

## Propuesta (no aplicada)

Migrar esos 2-3 botones al componente `Button` compartido (`@components/ui/button`), en vez de solo tokenizar su radio (que es lo que sí se hizo en BUG-013, un fix más conservador y de menor alcance).

## Archivos afectados (si se aplicara)

- `pages/migrated/my_program_calendar_screen.tsx`
- `pages/migrated/change_pwd_screen.tsx`

## Notas

Recomendación explícita de `docs/AUDITORIA_UIUX_2026-08-24.md` (sección 3.1). Se optó por el fix mínimo (BUG-013: tokenizar el radio) para no ampliar el alcance del cierre de bugs pedido; esta migración más completa queda como mejora futura.
