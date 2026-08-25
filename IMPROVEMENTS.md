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

**Resultado:** 🔵 Aplicado, pendiente de confirmación visual para los cambios de radio/tipografía; la regla de ESLint queda explícitamente para una fase futura. La migración masiva de `borderRadius` sí se completó parcialmente en el mismo día — ver IMP-006.

---

# IMP-006 — Migración masiva de `borderRadius` a tokens `RADIUS` (subconjunto seguro)

**Estado:** ✅ Aplicada (parcial, alcance deliberado)
**Categoría:** Otros
**Fase:** Fase 2 — Visual System (cierre antes de Fase 3, a petición explícita del usuario)

## Descripción

IMP-005 había diferido la migración masiva de literales por considerarla de riesgo alto sin poder verificar visualmente. Al revisar de nuevo el problema real: migrar un literal a un token **solo cuando su valor coincide exactamente** con uno de la escala (`RADIUS.xs=8, sm=12, md=16, lg=20, xl=28, pill=999`) no cambia ningún valor renderizado — es una sustitución de mismo-valor, verificable por comparación numérica, no por vista. El riesgo real estaba en forzar valores _no coincidentes_ al token más cercano (eso sí cambiaría el resultado visual), que este cambio evita explícitamente.

## Cambio aplicado

Script de migración (no manual, para evitar errores de transcripción en ~40 archivos): localiza cada `borderRadius: N` en `pages/migrated/**` y `components/**`, sustituye por `RADIUS.<token>` únicamente si `N` coincide exactamente con un valor de la escala, y añade `RADIUS` al import de `theme.ts` de ese archivo (a su import existente si ya importaba algo de ahí, o como import nuevo con la ruta relativa correcta si no). Cualquier valor sin coincidencia exacta (10, 3, 4, 14, 2, 18, 26, 6, 5, 44, 48, 22, 34, 42, 36, 32, 30, 24, 17, 13...) se dejó intacto — son huérfanos reales de la escala, forzarlos habría sido un cambio de diseño no pedido.

Resultado: **41 archivos modificados, 147 sustituciones** (`pages/migrated`: 29 archivos/135 cambios; `components`: 12 archivos/12 cambios). `components/ui/card/index.tsx` (único `borderRadius: 20` restante detectado) se dejó deliberadamente sin tocar — es un valor de seguridad ("safety net") ya documentado en el propio componente base del design system, no un descuido de una pantalla.

## Archivos afectados

41 archivos en `pages/migrated/**` y `components/**` — lista completa en el commit correspondiente (mensaje detallado con el desglose exacto por archivo).

## Verificación

`eslint --fix` limpio (0 errores, solo warnings preexistentes no relacionados) en los 41 archivos. `tsc --noEmit -p .` completo del proyecto: limpio, 0 errores. Verificación adicional específica de este cambio: cada sustitución es matemáticamente idéntica al literal que reemplaza (mismo valor exacto), no requiere confirmación visual como los cambios de IMP-005 — es un refactor de nombres puro sobre un subconjunto ya filtrado por coincidencia exacta.

**Resultado:** ✅ Correcto

## Notas

Quedan sin migrar los literales que NO coinciden con ningún token de la escala (más de 100 casos restantes) y toda la migración de `fontSize`→`TYPE` (estructuralmente más compleja: `TYPE` empaqueta `fontSize`+`fontWeight` como objeto, no solo un número — migrarlo requeriría verificar que ambos coincidan y que ninguna otra propiedad del mismo objeto de estilos se pierda, un riesgo real que si necesita revisión visual). La regla de ESLint que fuerce el uso de tokens sigue diferida — solo tendría sentido una vez migrados también los valores huérfanos (si no, bloquearía la mayoría de archivos existentes desde el primer commit).

---

# IMP-007 — Fase 3 (UX): hitSlop, accesibilidad, Toast, correcciones puntuales

**Estado:** ✅ Aplicada (bloque seguro completo, ver diferido)
**Categoría:** Accesibilidad / UX / Otros
**Fase:** Fase 3 — UX

## Descripción

Continuación directa de la auditoría UI/UX (`docs/AUDITORIA_UIUX_2026-08-24.md`), Fase 3: accesibilidad en primitivos compartidos, `hitSlop` en botones de icono ajustados, componente Toast nuevo. Antes de implementar, 3 agentes Explore remidieron cada punto contra el estado actual del repo (no los números de la auditoría original, ya desactualizados tras el borrado de 30 pantallas) y encontraron 6 bugs nuevos reales (BUG-025 a BUG-030, ver `BUGS_AND_FIXES.md`).

## Cambios aplicados

1. **`hitSlop={{top:8,bottom:8,left:8,right:8}}`** (o valores reducidos en grids con gap ajustado, para evitar solapar áreas táctiles entre botones adyacentes) en los ~10 patrones de botón-icono confirmados: `profile_screen.tsx` (×2), `my_program_calendar_screen.tsx` (×4), `home_screen_modern_v2.tsx` (×3), `habit_add_screen.tsx` (×2), `checkin_fill_screen.tsx`, `body_metrics_screen.tsx`, `statistics_body_distribution_screen.tsx` (×2), `statistics_muscle_distribution_screen.tsx` (×2), `add_post_screen.tsx`.
2. **`accessibilityRole="button"` + `accessibilityLabel`** (más `accessibilityState={{selected}}` en patrones de selección/toggle) en los patrones `Pressable`+`Icon` de solo-icono confirmados: `plan_screen.tsx`, `habit_detail_screen.tsx` (×3), `edit_profile_screen.tsx`, `chatting_screen.tsx`, `workout_session_screen.tsx` (×4), `add_post_screen.tsx`, `post_details_screen.tsx` (×5, junto con BUG-025/026), `main_goal_screen.tsx` (BUG-029), `home/fitness_metrics_screen.tsx` (patrón Card-pulsable, con label compuesto a partir de nombre+valor+estado de la métrica).
3. **BUG-025/026** — botones "compartir" y "más opciones" muertos en `post_details_screen.tsx`, corregidos (ver `BUGS_AND_FIXES.md`).
4. **BUG-027** — flag `-r` roto de `helper/responsiveStyleSheet.tsx`, corregido.
5. **Limpieza `SCREEN_WIDTH` muerto** en `home_screen_modern_v2.tsx` (import de `Dimensions` completo eliminado, sin otro uso en el archivo). No se tocó en `home_screen_modern.tsx` porque ese archivo se retiró en el mismo pase (BUG-030).
6. **Componente Toast nuevo** (`components/ui/toast/index.tsx`) — sigue el mismo patrón que `components/ui/button/index.tsx` (envuelve la factoría headless `createToast`/`createToastHook` de `@gluestack-ui/core/toast/creator`, estilado con los tokens semánticos ya existentes en `global.css`: `bg-success`/`bg-warning`/`bg-destructive`/`bg-info` + sus `-foreground`). Exporta `Toast`, `Toast.Title`/`ToastTitle`, `Toast.Description`/`ToastDescription`, `useToast()`. `ToastProvider` ya envolvía la app entera (`GluestackUIProvider`) desde antes — no hubo que tocar el árbol de providers. **No se ha migrado ningún `Alert.alert` existente a este componente en este pase** (ver diferido).
7. **BUG-030** — retirada de `home_screen_modern.tsx` (código huérfano, solo alcanzable vía la herramienta de debug de BUG-028), mismo protocolo que la retirada de 30 pantallas de la sesión anterior: verificación de 0 referencias de navegación real, borrado del archivo y su test, limpieza de `App.tsx` y `pages/ScreenExplorer.tsx`.

## Explícitamente diferido

- **Migrar los ~70-75 `Alert.alert` de feedback simple al nuevo Toast** — cambia comportamiento real (no bloqueante, timing, posición en pantalla), necesita verificación visual no disponible en este entorno. El Toast queda listo para cuando se aborde con acceso a dispositivo/simulador. Los `Alert.alert` de confirmación destructiva se quedan como están (la propia auditoría lo pide así).
- **Migrar Home v1/v2 al helper de responsive compartido** — ya no aplica a v1 (retirado, BUG-030); en v2 sigue diferido porque `useResponsiveStyleSheet` usa `Math.ceil` por defecto y Home usa `Math.round` — adoptar la anotación `"N@ratio"` tal cual cambiaría el valor renderizado en la mitad de los casos fraccionarios. Sustituir solo el `useMemo` de escala por `useScale()` (fórmula idéntica, sin cambiar el `Math.round` local) seguiría siendo seguro pero no se ha hecho en este pase.
- **BUG-028 (ScreenExplorerFab sin gate de producción)** — cerrado como comportamiento intencional, confirmado por el usuario. Sin cambio de código.
- **BUG-026, pieza de backend/admin panel** — reportar publicación desde el cliente ya funciona (usa un endpoint `report-on-posting` que ya existía en `api/posts.ts` sin consumidor); la capacidad de que un entrenador/admin vea los reportes y borre la publicación desde el panel es 100% servidor y queda fuera de este repositorio (documentado en `docs/PENDIENTE_BACKEND_ADMIN.md`, sección 12).
- **`components/ui/card/index.tsx` con variante `cardCompact`** — diferido desde Fase 2 (IMP-005), sigue igual.

## Archivos afectados

`pages/migrated/profile_screen.tsx`, `my_program_calendar_screen.tsx`, `home_screen_modern_v2.tsx`, `habit_add_screen.tsx`, `checkin_fill_screen.tsx`, `body_metrics_screen.tsx`, `statistics_body_distribution_screen.tsx`, `statistics_muscle_distribution_screen.tsx`, `add_post_screen.tsx`, `plan_screen.tsx`, `habit_detail_screen.tsx`, `edit_profile_screen.tsx`, `chatting_screen.tsx`, `workout_session_screen.tsx`, `post_details_screen.tsx`, `main_goal_screen.tsx`, `home/fitness_metrics_screen.tsx`; `helper/responsiveStyleSheet.tsx`; `components/ui/toast/index.tsx` (nuevo); `App.tsx`, `pages/ScreenExplorer.tsx` (BUG-030); `docs/PENDIENTE_BACKEND_ADMIN.md`; `pages/migrated/home_screen_modern.tsx` + su test (borrados).

## Verificación

`npx eslint --quiet` limpio en cada bloque de archivos tocados. `tsc --noEmit -p .` completo del proyecto (mismo run que cierra IMP-006): limpio, 0 errores. Todos los cambios de `hitSlop`/accesibilidad son puramente aditivos (props nuevas, sin tocar ningún valor de estilo/layout existente) — no requieren verificación visual real, aunque un smoke-test con VoiceOver/TalkBack en dispositivo confirmaría que los botones ahora anuncian rol+etiqueta correctamente. BUG-030 verificado por grep (0 referencias colgantes tras el borrado).

**Resultado:** 🔵 Correcto por inspección de código y `tsc` limpio — pendiente de smoke-test visual real en dispositivo
