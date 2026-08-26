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

---

# IMP-008 — Fase 4 (Polish): haptics, feedback de press, transición de navegación, iconos

**Estado:** ✅ Aplicada (bloque completo, todo lo visual queda 🔵 pendiente de confirmación en dispositivo)
**Categoría:** UX / Otros
**Fase:** Fase 4 — Polish

## Descripción

Última fase del roadmap de la auditoría (`docs/AUDITORIA_UIUX_2026-08-24.md`): _"Haptics en acciones frecuentes. Feedback de 'press' consistente. Transición de navegación con identidad propia. Consistencia de outline/filled en iconos según estado activo/inactivo."_ 3 agentes Explore remidieron cada punto contra el estado actual del repo antes de implementar, siguiendo el mismo criterio de todas las fases anteriores.

## Cambios aplicados

1. **Haptics** — instalado `expo-haptics` (`~57.0.1`, alineado con el resto de módulos de Expo SDK 57 del proyecto). Nuevo `helper/haptics.ts` (`hapticLight()`/`hapticSuccess()`) cableado en los 5 puntos de mayor frecuencia confirmados con evidencia: `workout_session_screen.tsx::toggleRowComplete` (completar una serie), `workout_session_screen.tsx::markAllRows` (completar todas, impacto success), `habits_list_screen.tsx::toggleToday`, `community_screen.tsx::toggleLike`, `plan_screen.tsx::toggleRecipeCompletion` — en todos los casos solo al pasar a completado/dado-like, no al deshacer. **El proyecto tiene carpeta `ios/` nativa propia** (no es Expo Go puro) — el haptic no vibrará de verdad hasta que se regenere el proyecto nativo (`pod install` como mínimo), mismo tipo de limitación ya documentado para HealthKit en `docs/PENDIENTE_BACKEND_ADMIN.md`. El código compila y pasa `tsc` en este entorno; la confirmación funcional en dispositivo queda pendiente.
2. **Feedback de "press" centralizado** — `components/ui/pressable/index.tsx` (el wrapper compartido) usa `createPressable` de gluestack-ui, que ya emitía automáticamente `dataSet={{active}}` sin que nadie lo aprovechara. Añadida una sola clase, `data-[active=true]:opacity-20`, junto al `data-[disabled=true]:opacity-40` ya existente — adopta el valor que ya era mayoritario en el propio repo (30 usos de `pressed && {opacity: 0.2}`, incluyendo `NavigationTab.tsx`) y coincide con el default histórico de `TouchableOpacity` en React Native. Efecto: los ~310 `Pressable` de `pages/migrated/**` que hoy no tenían ningún feedback al tocar pasan a tenerlo automáticamente, sin tocar cada archivo uno a uno. Los ~60 sitios que ya definían su propio `style={({pressed}) => ...}` no se tocan — ese `style` explícito se sigue pasando después del `className` en el wrapper, así que sigue ganando donde ya existía.
3. **Transición de navegación con identidad propia** — nuevo `helper/motion.ts` con `screenTransitionSpec` (spring `{friction: 8, tension: 80}`, los mismos valores ya usados en `NavigationTab.tsx` para el menú "+", reutilizados para que la transición de pantalla completa se sienta de la misma familia — no se inventó ningún número nuevo). Cableado en `screenOptions` de los 2 stacks de `App.tsx` que sí renderizan transición de tarjeta (`Stack`/`RootNavigator` y `MStack`/`MigratedNavigator` — el `Tab` de abajo es `bottom-tabs`, no aplica `transitionSpec`/`cardStyleInterpolator`), manteniendo `CardStyleInterpolators.forHorizontalIOS` (el mismo estilo visual de slide, solo cambia el timing/curva, no el tipo de transición). **Bug real encontrado en el proceso**: `@react-navigation/stack` no exporta el tipo `TransitionSpec` en su punto de entrada público (solo `TransitionSpecs`, el namespace de presets, y `TransitionPreset`, que sí lo re-exporta indirectamente) — `tsc` lo marcó de inmediato (`TS2724`). Corregido tipando la constante como `TransitionPreset['transitionSpec']['open']` en vez de importar un tipo inexistente.
4. **Consistencia outline/filled en iconos** — `components/NavigationTab.tsx`: los 4 iconos de la barra de tabs (antes siempre `-outline`, solo cambiaba el color con el foco) ahora usan la variante filled cuando la tab está activa, mismo mecanismo que los 13 sitios de la app que ya lo hacían bien (`heart`/`heart-outline`, `bookmark`/`bookmark-outline`, etc.). `checkins_list_screen.tsx`: el estado "completado" pasa de `checkmark-circle-outline` a `checkmark-circle` (filled), igualándolo al mismo concepto ya resuelto en `workout_session_screen.tsx`.

## Excluido explícitamente, sin cambio de código

Al revisar el contexto real de otras 2 "inconsistencias" señaladas por el agente de investigación (mismo tipo de verificación que evitó un fix incorrecto en BUG-024 esta sesión):

- `change_pwd_screen.tsx` (`eye-outline`/`eye-off-outline`) — son dos símbolos de acción distintos (mostrar/ocultar contraseña), no un mismo estado sin fillear; forzar un filled aquí sería inventar una convención que ningún otro toggle de visibilidad de contraseña usa.
- `habit_detail_screen.tsx:492` (rama `create-outline` en un ternario de 3 vías) — esa rama representa una acción distinta (editar un valor numérico), no el mismo estado "hecho/no hecho" sin fillear.

## Archivos afectados

`package.json`/`package-lock.json` (nueva dependencia); `helper/haptics.ts` (nuevo), `helper/motion.ts` (nuevo); `pages/migrated/workout_session_screen.tsx`, `habits_list_screen.tsx`, `community_screen.tsx`, `plan_screen.tsx`, `checkins_list_screen.tsx`; `components/ui/pressable/index.tsx`, `components/NavigationTab.tsx`; `App.tsx`.

## Verificación

`npx eslint --quiet` limpio en todos los archivos tocados. `tsc --noEmit -p .` completo del proyecto sin errores. Los cambios de haptics son puramente aditivos (llamadas a una API que no renderiza nada) — sin riesgo visual, pero sin poder confirmar la vibración real en dispositivo desde este entorno (requiere `pod install`/rebuild nativo). Los cambios de press feedback, transición de navegación e iconos SÍ tienen efecto visual real y quedan marcados 🔵 pendientes de confirmación en dispositivo/simulador — mismo criterio que el resto de bugs de esta sesión que necesitan ojos reales.

**Resultado:** 🔵 Correcto por inspección de código y `tsc` limpio — pendiente de smoke-test visual y funcional real en dispositivo (haptics necesita además rebuild nativo)

---

# IMP-009 — Renombra los títulos de "Estadísticas" para no coincidir con la app de referencia

**Estado:** ✅ Aplicada
**Categoría:** Contenido / naming
**Fase:** Post-sesión (pedido explícito del usuario, 2026-08-26)

## Descripción

El usuario pidió cambiar los títulos de sección de `MigratedStatistics` (`statistics_screen.tsx`) porque coincidían literalmente con los de la app de referencia en la que se inspiró el diseño (Bevel, mencionada en otras partes de esta sesión).

## Cambio aplicado

Reescritos el encabezado de sección y los 6 títulos del listado "Estadísticas avanzadas", manteniendo el mismo significado/función pero con redacción propia:

| Antes                                    | Ahora                     |
| ---------------------------------------- | ------------------------- |
| ESTADÍSTICAS AVANZADAS                   | ANÁLISIS AVANZADO         |
| Recuento de series por grupo de músculos | Series por grupo muscular |
| Distribución de los músculos             | Balance muscular          |
| Distribución del cuerpo                  | Mapa de calor corporal    |
| Ejercicios principales                   | Ejercicios más frecuentes |
| Marcas personales                        | Mejores marcas            |
| Informe mensual                          | Resumen mensual           |

Los subtítulos (descripciones bajo cada título) no se tocaron — el pedido era específicamente sobre los títulos.

**Actualizados también los encabezados de las 6 pantallas de destino** (`statistics_series_count_screen.tsx`, `statistics_muscle_distribution_screen.tsx`, `statistics_body_distribution_screen.tsx`, `statistics_top_exercises_screen.tsx`, `statistics_personal_records_screen.tsx`, `statistics_monthly_report_screen.tsx`) para que coincidan con el nuevo nombre del listado — sin esto, tocar una fila mostraría un título distinto al que aparecía en `statistics_screen.tsx`, una inconsistencia nueva peor que la original. Mismo criterio aplicado a las entradas del catálogo de `pages/ScreenExplorer.tsx` (herramienta de debug interna, cosmético).

## Archivos modificados

- `pages/migrated/statistics_screen.tsx`
- `pages/migrated/statistics_series_count_screen.tsx`
- `pages/migrated/statistics_muscle_distribution_screen.tsx`
- `pages/migrated/statistics_body_distribution_screen.tsx`
- `pages/migrated/statistics_top_exercises_screen.tsx`
- `pages/migrated/statistics_personal_records_screen.tsx`
- `pages/migrated/statistics_monthly_report_screen.tsx`
- `pages/ScreenExplorer.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio puramente de texto (ningún string se usa como key/id en ningún sitio del código, confirmado por grep antes de tocarlos) — sin riesgo funcional. Pendiente de que el usuario confirme que la nueva redacción le convence.

---

# IMP-010 — Sistema de Toast global + migración de 90 `Alert.alert` de feedback simple

**Estado:** ✅ Aplicada
**Categoría:** UX / feedback
**Fase:** Post-sesión (pedido explícito del usuario, 2026-08-26 — "migrar los 70-65 alert.alert")

## Contexto

Fase 3 de la auditoría (`IMP-007`) ya había construido el componente visual `Toast`/`ToastTitle`/`ToastDescription` (`components/ui/toast/`, primitivas de `@gluestack-ui/core`) pero sin ningún consumidor real — se quedó como pieza lista pero inactiva, con la migración de `Alert.alert` diferida explícitamente ("cambia comportamiento real... diferido a cuando haya verificación visual real"). El usuario ha pedido ahora ejecutar esa migración.

## Problema con `Alert.alert` para feedback simple

`Alert.alert` es un diálogo nativo bloqueante (modal del sistema) — apropiado para una elección real (confirmar/cancelar, un menú de acciones), pero desproporcionado para un aviso de una sola dirección ("no se pudo guardar", "hecho", "próximamente"): interrumpe el flujo, exige un toque extra para descartarlo, y no encaja con el resto de la app (que ya usa overlays/sheets propios en vez de diálogos nativos del sistema en casi todo lo demás).

## Infraestructura nueva

Las primitivas de `components/ui/toast/` son de bajo nivel (`useToast()` de `@gluestack-ui/core`, un _hook_ que exige contexto de componente) — no sirven para reemplazar una función plana importable desde cualquier sitio como `Alert.alert`. Se construyó un controlador global imperativo encima, mismo patrón ya usado en el repo para estado global sin Context (ver `helper/workoutSessionBus.ts` + `WorkoutMinimizedBar.tsx`):

- **`helper/toast.ts`** — pub/sub a nivel de módulo. `showToast(title, { description?, variant?, duration? })` es una función plana, importable y llamable desde cualquier `catch`/handler, exactamente igual que `Alert.alert` antes.
- **`components/ToastHost.tsx`** — componente montado una sola vez cerca de la raíz (`App.tsx`, junto a `WorkoutMinimizedBar`/`TutorialOverlay`), se suscribe al controlador y pinta la pila de toasts activos usando los componentes visuales ya existentes de Fase 3, con auto-dismiss (3.5s por defecto, configurable por toast) y toque para descartar antes de tiempo.
- Vive por encima del `NavigationContainer` (mismo nivel que el resto de overlays globales), así que un toast sobrevive a una navegación inmediata después de mostrarlo (relevante para los casos que antes usaban `onPress` del botón "OK" del `Alert.alert` para navegar — ver más abajo).

## Criterio de migración (qué se convierte, qué no)

Se revisaron los 107 `Alert.alert` del repo uno a uno, no en bloque:

- **90 convertidos a `showToast`**: todos los que solo mostraban información o el resultado de una acción con un único botón implícito ("OK"), sin ninguna elección real del usuario — validaciones de formulario, errores de red, confirmaciones de éxito, avisos de "próximamente"/"no disponible", permisos denegados.
- **17 se quedan como `Alert.alert`, a propósito**: confirmaciones destructivas con Cancelar + acción (cerrar sesión, borrar hábito/medida/lista/plan, limpiar chat, recargar la app) y menús de elección real con varios botones (elegir foto de galería/cámara, motivo de un reporte, opciones de una publicación). Un toast no bloquea ni puede sustituir una decisión real — forzarlo ahí sería un downgrade de UX, no una mejora.
- **Caso especial resuelto**: los `Alert.alert` de éxito que encadenaban una navegación en el botón "OK" (p. ej. `app_feedback_screen.tsx`, `checkin_fill_screen.tsx`) pasan a mostrar el toast y navegar inmediatamente después, en vez de esperar al toque del usuario — mismo comportamiendo "no bloqueante" que motivó todo el cambio; el toast sigue visible durante la transición porque vive por encima del navigator.

## Archivos modificados

Infraestructura: `helper/toast.ts` (nuevo), `components/ToastHost.tsx` (nuevo), `App.tsx` (montaje).

Migrados (90 `Alert.alert` → `showToast` en 30 archivos): `components/PainReportSheet.tsx`, `components/ReadinessCheckSheet.tsx`, `pages/auth/{ForgotPasswordOptionsScreen,LoginScreen,RegisterScreen,WelcomeAuthScreen}.tsx`, `pages/migrated/{add_post_screen,add_shopping_list_screen,app_feedback_screen,assigned_meals_screen,blog_screen,change_pwd_screen,checkin_fill_screen,community_screen,edit_profile_screen,habit_add_screen,habit_detail_screen,home_screen_modern_v2,my_program_calendar_screen,plan_screen,post_details_screen,shopping_list_detail_screen,statistics_body_distribution_screen,statistics_muscle_distribution_screen,view_body_part_screen,water_tracker_screen,workout_preview_screen,workout_summary_screen}.tsx`, `pages/migrated/home/link_device_choice_screen.tsx`.

Sin cambios, a propósito (17 `Alert.alert` reales): `pages/Home.tsx`, `pages/migrated/{shopping_list_detail_screen,add_post_screen,notification_settings_screen,chatting_image_screen,profile_screen,chatting_screen,home_screen_modern_v2,habit_detail_screen,post_details_screen,edit_profile_screen,body_metrics_screen,community_screen,plan_screen}.tsx` (varios de estos archivos tienen AMBOS: alguno migrado y otro que se queda, ver detalle de cada uno en el propio código).

## Verificación

`eslint --quiet` limpio en los 32 archivos tocados, `tsc --noEmit -p .` completo del proyecto sin errores (detectado y corregido en el proceso un error real de JSX en `App.tsx` — un `</TutorialProvider>` que se había quedado sin cerrar al montar `ToastHost`, capturado por el propio `tsc` antes de llegar a commitear). Cambio de comportamiento visual real (aparece un toast donde antes había un diálogo nativo) — **pendiente de confirmación visual en dispositivo real**, mismo criterio que el resto de cambios de esta sesión.

---

# IMP-011 — Consulta de intensidad (RIR/RPE, intercambiables) tras completar una serie

**Estado:** ✅ Aplicada
**Categoría:** UX / entrenamiento
**Fase:** Post-sesión (pedido explícito del usuario con capturas de referencia, 2026-08-26 — RIR primero, RPE después con el mismo criterio: "deben ser reemplazables")

## Contexto

`MigratedWorkoutSession` ya tenía "rir"/"rpe" como columnas más de entrada libre de texto (cuando el ejercicio las trae en `enabledMetrics`), pero sin ninguna ayuda para rellenarlas — el cliente tenía que saber de memoria la escala y escribir el número a mano. Pedido en 2 pasos: (1) un selector guiado tipo otra app de referencia para RIR, que se abre solo al completar una serie; (2) lo mismo para RPE, con series/repeticiones/carga/descanso como métricas fijas pero RIR y RPE **intercambiables** — el cliente elige cuál de las dos rellenar tocando el título de la columna, en vez de que ambas convivan como columnas separadas.

## Qué se construyó

- **`components/IntensityCheckSheet.tsx`** (nuevo) — un único componente parametrizado por `metric: 'rir'|'rpe'`, no dos casi-duplicados: RIR (Reps In Reserve) y RPE (Ratio de Esfuerzo Percibido) son la MISMA escala de intensidad de 5 tramos vista desde 2 ángulos inversos (RIR 0 = RPE 10, RIR 4+ = RPE ≤6), así que comparten estructura/colores/flujo y solo cambian etiqueta, pregunta, valores mostrados/guardados y texto de ayuda. Reutiliza `SimpleBottomSheet` (mismo patrón que `ReadinessCheckSheet.tsx`/`PainReportSheet.tsx`): escala de 5 círculos coloreados (Ligero azul, Moderado verde, Difícil amarillo, Muy difícil naranja, Máximo rojo), titular dinámico que cambia de color según la opción elegida, línea de contexto de la serie ("#N Set: reps x carga kg"), icono de información con la explicación de la métrica activa (`Alert.alert` nativo a propósito — es la única forma de garantizar que se vea POR ENCIMA de un sheet ya abierto, sin depender del z-index del `ToastHost` global), y un banner superior descartable con el interruptor "seguir preguntando automáticamente" (persistido en `AsyncStorage`, clave `intensity_check_auto_open` — una sola preferencia para ambas métricas, son el mismo "slot").
- **Columna RIR/RPE intercambiable** (`pages/migrated/workout_session_screen.tsx`): `getIntensityMode(ex)` decide cuál de las dos toca mostrar para cada ejercicio (por defecto, la que traiga `enabledMetrics` de la plantilla; si el cliente la cambia, se recuerda por `exerciseId` durante toda la sesión vía `intensityModeOverride`). `getDisplayMetrics(ex)` colapsa `enabledMetrics` quitando 'rir'/'rpe' sueltos y reinserta solo la métrica activa, antes de pasar por `sortMetricKeys` (rango compartido para ambas en `METRIC_DISPLAY_RANK`, así ocupan siempre el mismo puesto en la tabla: series, repeticiones, carga, RIR/RPE, descanso). El título de esa columna es tocable (`toggleIntensityMode`) y alterna entre las dos.
- Al marcar una serie como completada (`toggleRowComplete`, solo al marcar, nunca al desmarcar — mismo criterio que el disparo del cronómetro de descanso ya existente), si `getIntensityMode` devuelve algo y la preferencia de apertura automática sigue activa, se abre `IntensityCheckSheet` con esa métrica y el contexto de la fila exacta. Al pulsar "Registrar", el valor se escribe con `setCellValue(...,intensityCheckTarget.metric, valor)` — la MISMA función que ya usa la celda de texto libre, así que el dato queda exactamente donde ya se guardaba. La opción "4+"/"≤6" se guarda como número real (`"4"`/`"6"`), no como string con símbolo — evita un valor no numérico en un campo que `exercise_info_screen.tsx` intenta parsear como número al decidir si graficarlo.

## Archivos modificados

- `components/IntensityCheckSheet.tsx` (nuevo — sustituye al `RirCheckSheet.tsx` de la primera iteración, generalizado antes de llegar a commitear)
- `pages/migrated/workout_session_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Feature nueva con interacción real (sheet que se abre solo, escala de colores, columna tocable, toggle persistido) — **pendiente de confirmación en dispositivo real**, mismo criterio que el resto de cambios visuales de esta sesión.

---

# IMP-012 — Live Activity de iOS para el entrenamiento en curso (Lock Screen / Dynamic Island)

**Estado:** 🔵 Aplicada, pendiente de verificación en build/dispositivo real
**Categoría:** iOS nativo / entrenamiento
**Fase:** Post-sesión (pedido explícito del usuario con captura de referencia de otra app, "Symmetry", 2026-08-26)

## Contexto

El usuario pidió una notificación/popup en la barra de notificaciones de iOS como la de la app de referencia (Lock Screen + Dynamic Island mostrando el entrenamiento en curso). Inicialmente se le dijo que esto requería Xcode y no se podría verificar desde este entorno — el usuario corrigió (correctamente): su PC tampoco tiene Xcode, y **toda** la app hasta ahora se construyó igual, a ciegas, verificando solo vía el build de CI (`ios-build.yml`, runner `macos-latest`). Esta feature se implementó con el mismo método: edición directa de `project.pbxproj` sin Xcode local, a verificar en el próximo build de IPA.

## Qué se construyó

- **Nuevo target de extensión de Widget** (`befitWidgetsExtension`, producto `befitWidgets.appex`) añadido a mano en `ios/befit.xcodeproj/project.pbxproj` — target, fases de build (Sources/Frameworks/Resources vacía), configuraciones Debug/Release, dependencia + fase "Embed Foundation Extensions" en el target `befit` para que el `.appex` se empaquete dentro del `.app`. **Sin App Group ni entitlement nuevo**: la extensión solo RENDERIZA el `ContentState` que ActivityKit le entrega, no lee nada compartido en disco, así que no hace falta compartir `UserDefaults`/ficheros entre targets. El scheme compartido "befit" (usado por `ios-build.yml` vía `$(basename WORKSPACE .xcworkspace)`) no necesitó tocarse — las dependencias de target se respetan igual en el build sin firmar (`CODE_SIGNING_ALLOWED=NO`) que usa el workflow.
- **`ios/befitWidgets/`** (nuevo): `WorkoutActivityAttributes.swift` (struct `ActivityAttributes` compartido, compilado en AMBOS targets — app y extensión — porque ActivityKit exige el mismo tipo en quien crea la actividad y quien la renderiza), `BefitWidgetsBundle.swift` (`@main WidgetBundle`), `WorkoutLiveActivityView.swift` (vista de Lock Screen + Dynamic Island con `Text(timerInterval:countsDown:)` para la cuenta atrás de descanso y `Text(startDate, style: .timer)` para el tiempo transcurrido — ambos se actualizan solos, sin que la app tenga que reenviar el estado cada segundo), `Info.plist` (extensión WidgetKit).
- **`ios/befit/LiveActivityModule.swift` + `.m`** (nuevo): puente nativo `@objc` con 3 métodos (`startActivity`/`updateActivity`/`endActivity`) que llaman a `Activity<WorkoutActivityAttributes>.request/update/end`. `IPHONEOS_DEPLOYMENT_TARGET = 16.4` ya cubre el mínimo de ActivityKit (16.1+), así que no hizo falta ningún `@available`/`#available`.
- **`ios/befit/Info.plist` + `app.json`**: `NSSupportsLiveActivities = true`.
- **`helper/liveActivity.ts`** (nuevo): wrapper JS del módulo nativo, no-op seguro fuera de iOS (`Platform.OS !== 'ios'`) y donde el módulo nativo aún no esté compilado (Expo Go).
- **`pages/migrated/workout_session_screen.tsx`**: arranca la Live Activity una vez que la sesión termina de cargar (real o retomada), la actualiza en cada cambio relevante (ejercicio con foco — el último donde el cliente marcó una serie, ya que la pantalla puede tener varios bloques con ejercicio activo propio a la vez —, próxima serie pendiente, descanso en curso con su fecha de fin real), y la cierra (`endWorkoutLiveActivity()`) desde `clearPersistedSession()` — el único punto común a "finalizar" y "cerrar/abandonar" el entrenamiento. Al minimizar (`onMinimize`) la Live Activity sigue viva a propósito: el entrenamiento sigue en curso.
- **Alcance recortado a propósito**: sin los botones interactivos (-10s/+10s/"Omitir") de la captura de referencia — eso requiere App Intents (iOS 17+), una pieza separada y más grande. Esta primera versión es de solo lectura.

## Archivos modificados/nuevos

- `ios/befit.xcodeproj/project.pbxproj` (target nuevo + wiring)
- `ios/befitWidgets/{WorkoutActivityAttributes.swift,BefitWidgetsBundle.swift,WorkoutLiveActivityView.swift,Info.plist}` (nuevos)
- `ios/befit/{LiveActivityModule.swift,LiveActivityModule.m}` (nuevos)
- `ios/befit/Info.plist`, `app.json`
- `helper/liveActivity.ts` (nuevo)
- `pages/migrated/workout_session_screen.tsx`

## Verificación

`eslint --quiet` y `tsc --noEmit -p .` limpios en el lado JS/TS. **El `project.pbxproj` y el código Swift NO se pueden verificar en este entorno** (no hay Xcode/macOS aquí, igual que con `pod install` — ver `docs/BUILD_IPA.md`) — la única verificación real es el próximo build de IPA en `ios-build.yml` (runner `macos-latest`), y es razonablemente probable que haga falta más de un intento si el `pbxproj` editado a mano tiene algún objeto mal referenciado. Chequeo estructural básico hecho localmente (llaves/paréntesis balanceados, sin IDs de objeto duplicados, todas las referencias cruzadas resuelven a un objeto definido) pero eso no sustituye a que `xcodebuild` lo abra de verdad.
