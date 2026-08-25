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

# IMP-003 — Unificar nombres de color duplicados

**Estado:** ✅ Aplicada
**Categoría:** Otros
**Fase:** Pre-Fase 2 — Cierre de mejoras detectadas

## Descripción

`theme.ts` tenía 5 nombres distintos (`primary`, `brand50`, `brand60`, `gray70`, `gray80`) que valían literalmente el mismo hex (`#E5E5EA` en claro, `#3A3A3C` en oscuro). Cuando alguien necesitaba "el gris de acento" no tenía ninguna señal de cuál de los 5 nombres usar.

## Motivación

Un solo nombre canónico reduce el riesgo de que un futuro cambio de color solo actualice 1 de los 5 alias y deje inconsistencias.

## Cambio aplicado

Añadido un nuevo token canónico `accent` (mismo valor que los 5 anteriores, en `C` y `C_DARK`). Marcados `gray70`, `gray80`, `brand50`, `brand60` y `primary` con un comentario JSDoc `@deprecated` apuntando a `accent` — no se han borrado ni renombrado (siguen funcionando exactamente igual en todo el código existente), solo se marca cuál es la opción activa para código nuevo. Al estar el `@deprecated` en la declaración de `C` (de la que `C_DARK` hereda el tipo vía `typeof C`), el aviso de "deprecated" del editor aplica también a cualquier acceso a esos mismos campos en `C_DARK`.

## Archivos afectados

- `pages/migrated/theme.ts` (única definición tocada — sin cambio funcional en el resto de archivos, es un refactor de nombres puro, mismo valor en todos los casos).

## Verificación

`tsc --noEmit -p .` y `eslint --quiet` limpios tras el cambio (los 5 alias siguen existiendo con el mismo valor, cero rotura).

**Resultado:** ✅ Correcto

---

# IMP-004 — Usar el sistema de variantes del componente `Button` compartido en vez de padding/radio a mano

**Estado:** ✅ Aplicada
**Categoría:** UI
**Fase:** Pre-Fase 2 — Cierre de mejoras detectadas

## Descripción

Al revisar `my_program_calendar_screen.tsx` para esta mejora se comprobó que sus botones "Enviar solicitud"/"Guardar cambios" **ya** usaban el componente `Button`/`ButtonText` compartido (a diferencia de lo que decía la auditoría original, que hablaba de `StyleSheet` a mano sin usar el componente en absoluto — desactualizado tras las migraciones de esta sesión) — pero le pasaban un `style` que reimplementaba a mano el padding y el radio (`paddingHorizontal/paddingVertical/borderRadius`) en vez de usar las props `size`/`radius` propias del componente. `change_pwd_screen.tsx` también usa ya `<Button>` para "Guardar", pero sin `size` ni `radius` explícitos (mismo patrón que BUG-012).

## Motivación

Usar las props `size`/`radius` del propio componente en vez de bypassearlas con estilos a mano reduce el riesgo de que un botón vuelva a divergir del resto de CTAs de la app sin que nadie lo note (la causa raíz de BUG-013).

## Cambio aplicado

- `my_program_calendar_screen.tsx`: los 2 botones ahora usan `size="sm" radius="pill"`; el `style` que se les pasa se redujo a solo `backgroundColor: C.orange` (el único aspecto que el sistema de variantes del componente no cubre — no hay una variante "naranja" entre `default/destructive/outline/secondary/ghost/link`). Se quitó el import ya no usado de `RADIUS`.
- `change_pwd_screen.tsx`: añadido `size="lg" radius="pill"` al botón "Guardar", igualándolo a la convención ya establecida (mismo patrón que BUG-012).

## Archivos afectados

- `pages/migrated/my_program_calendar_screen.tsx`
- `pages/migrated/change_pwd_screen.tsx`

## Verificación

`tsc --noEmit -p .` y `eslint --quiet` limpios. **Pendiente confirmación visual** (mismo caso que BUG-012/013 en `BUGS_AND_FIXES.md`) — el tamaño/forma exactos de estos botones solo pueden confirmarse viendo la app renderizada.

**Resultado:** 🔵 Aplicada, pendiente de confirmación visual en la prueba final

## Notas

Recomendación explícita de `docs/AUDITORIA_UIUX_2026-08-24.md` (sección 3.1).

---

# IMP-005 — Fase 2 (Visual System): escalas ampliadas, mapa de iconos, tarjeta unificada

**Estado:** ✅ Aplicada (parcial, alcance deliberado — ver "no aplicado" abajo)
**Categoría:** Otros
**Fase:** Fase 2 — Visual System

## Descripción

Primer incremento de Fase 2 (`docs/AUDITORIA_UIUX_2026-08-24.md`, línea 458), acotado a lo verificable por `tsc`/aritmética sin necesidad de ver la app renderizada.

## Cambio aplicado

- **`RADIUS`/`SPACING`/`TYPE` ampliados** en `theme.ts` a la escala propuesta por la auditoría (`RADIUS: xs:8,sm:12,md:16,lg:20,xl:28,pill:999`; `SPACING` de 8 pasos + alias; `TYPE.screenTitle` 32→28). Re-numerar `RADIUS.md`/`lg` cambiaba el valor de esas claves (antes md=20,lg=28 → ahora md=16,lg=20) — el único consumidor real de antes (`components/TrendCard.tsx`) se migró de `RADIUS.md` a `RADIUS.lg` para conservar exactamente el mismo radio renderizado (20px, verificable por aritmética).
- **`constants/icons.ts`** (nuevo, mismo patrón que `constants/habitIcons.ts`): mapa canónico `ACTION_ICONS` para volver/editar/favorito-guardado/eliminar-descartar. La investigación encontró que de los 4 conceptos con variantes, solo "volver" (`chevron-back` vs `arrow-back`) era una inconsistencia real sin justificación — corregida en `home/link_device_choice_screen.tsx` y `home/link_device_list_screen.tsx` (únicos 2 archivos supervivientes tras el borrado de pantallas de esta misma sesión; los otros 6 archivos con `arrow-back` se retiraron con el onboarding v1). Los otros 3 conceptos ("editar", "guardar/favorito", "eliminar/descartar") resultaron ser 2 conceptos legítimamente distintos cada uno, no inconsistencias — documentados con nombre en vez de forzados a converger (ver BUG-024 en `BUGS_AND_FIXES.md` para el caso de "eliminar/descartar", donde forzar la convergencia habría sido una regresión).
- **Tarjeta divergente de `edit_profile_screen.tsx`**: su `borderRadius: 16` a mano ahora usa `RADIUS.md` (mismo valor, ahora nombrado, gracias a la escala ampliada).

## Explícitamente NO aplicado (documentado, no ocultado)

- **Migración masiva de literales sueltos**: medidos ~309 usos de `borderRadius:<número>` (top valores: 12×78, 20×30, 16×30, 4×24, 8×22, 10×22, 14×19) y ~536 de `fontSize:<número>` (top: 13×104, 16×81, 12×71, 14×67, 11×47) repartidos en ~80 archivos de `pages/migrated`. La propia auditoría califica esto "Alta/adopción gradual" — migrarlo a ciegas sin poder verificar visualmente en este entorno arriesga regresiones invisibles hasta que alguien abra la app. Los números exactos quedan medidos aquí para cuando se aborde con verificación visual real.
- **Regla de ESLint** que prohíba números literales en `fontSize`/`borderRadius`/`padding` fuera de `theme.ts` — depende de tener primero la migración anterior hecha (si no, la regla bloquearía la mayoría de los archivos existentes desde el primer commit).
- **Adopción de `LoadingSkeleton`/`EmptyState`** en pantallas de `pages/migrated` (hoy 0 usos ahí — sí se usan en 2 pantallas de `pages/` fuera de `migrated`: `DietList.tsx`, `DietDashboard.tsx`). Requiere decidir dónde insertar estados de carga/vacío en pantallas existentes, un cambio de UX más invasivo que los bugs de color ya corregidos (BUG-023).
- **Variante `cardCompact` con nombre en el componente `Card` compartido** (`components/ui/card/index.tsx`) — ampliar la API pública de un componente usado en muchos sitios merece su propia verificación dedicada.

## Archivos afectados

- `pages/migrated/theme.ts`
- `components/TrendCard.tsx`
- `constants/icons.ts` (nuevo)
- `pages/migrated/home/link_device_choice_screen.tsx`
- `pages/migrated/home/link_device_list_screen.tsx`
- `pages/migrated/edit_profile_screen.tsx`

## Verificación

`eslint --quiet` limpio en todos los archivos. `tsc --noEmit -p .` completo limpio (confirma que `RADIUS.lg` sigue valiendo 20 tras el re-numerado, sin regresión de tipos). Cambios de radio/tipografía en sí **pendientes de confirmación visual** en la prueba final.

**Resultado:** 🔵 Aplicado, pendiente de confirmación visual para los cambios de radio/tipografía; la migración masiva y la regla de ESLint quedan explícitamente para una fase futura con capacidad de verificación visual.
