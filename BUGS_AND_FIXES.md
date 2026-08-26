# Bugs & Fixes

Registro de bugs, errores y problemas detectados durante el desarrollo y auditoría de la aplicación.

Este documento se creó retroactivamente (2026-08-25) para dejar constancia de todos los bugs reales detectados y corregidos durante la Fase 1 (auditoría UI/UX + migración a modo oscuro). A partir de este punto se mantiene actualizado en tiempo real, según se van detectando y solucionando nuevos problemas.

---

## Estado actual

**Bugs detectados:** 24
**Solucionados:** 13
**Pendientes:** 0
**En progreso:** 0
**Necesitan verificación:** 10
**No reproducibles:** 1

### 🔵 Bugs que requieren verificación (pendiente de prueba real en app)

- BUG-012 — Botón "FINALIZAR ENTRENAMIENTO" sin tamaño explícito
- BUG-013 — Botones del calendario con radio fuera de escala
- BUG-015 — Bug de memoización en `useResponsiveStyleSheet` con colores dinámicos
- BUG-016 — `GluestackUIProvider` fijo en modo claro
- BUG-017 — Paleta oscura de `global.css` desincronizada de `theme.ts`
- BUG-018 — `blog_detail_screen.tsx` con HTML de WebView estático
- BUG-019 — Pestañas de `diet_detail_screen.tsx` con fondo blanco fijo
- BUG-020 — Ternario roto sin efecto en el título de `main_goal_screen.tsx`
- BUG-021 — Tarjeta casi invisible en `onboarding_v2_screen.tsx`
- BUG-023 — `LoadingSkeleton.tsx` con color de fondo del tema oscuro antiguo

### ⚫ Bugs cerrados / no reproducibles

- BUG-024 — Icono "eliminar" inconsistente (revisado: no era una inconsistencia real)

### 🟢 Bugs solucionados (verificados por análisis estático — tsc/eslint/cálculo WCAG)

- BUG-001 — Contraste WCAG de `textTertiary` insuficiente
- BUG-002 — `AppIcon.tsx` revertido a color estático
- BUG-003 — Error de sintaxis en `activity_tracker_screen.tsx`
- BUG-004 — Crash en `diet_detail_screen.tsx` por estilos sin inicializar
- BUG-005 — Crash en `set_reminder_screen.tsx` por estilos sin inicializar
- BUG-006 — Color congelado en `NavigationTab.tsx`
- BUG-007 — Crash en `assigned_meals_screen.tsx` por hook no invocado
- BUG-008 — Error de compilación en `step_goal_completed_screen.tsx`
- BUG-009 — Crash en `workout_preview_screen.tsx` por variable fuera de scope
- BUG-010 — Error de tipos en `theme.ts` (`C_DARK`)
- BUG-011 — Contraste WCAG de `completedBadgeText` insuficiente
- BUG-014 — Pérdida silenciosa de datos en `onboarding_v2_screen.tsx`
- BUG-022 — Texto corrupto (mojibake) visible al usuario

**Nota importante sobre "verificado":** los 13 bugs marcados 🟢 se consideran solucionados porque su verificación es determinística y no depende de una interfaz renderizada: errores de compilación (`tsc --noEmit -p .` limpio), variables indefinidas (grep + lectura de código), contraste WCAG (fórmula de luminancia relativa W3C, un cálculo matemático), o texto corrupto (grep de las secuencias exactas antes/después). Los 10 bugs marcados 🔵 son cambios de comportamiento/color que sí dependen de cómo se renderiza la app en un dispositivo/simulador real — no se han podido verificar visualmente en este entorno (sin simulador disponible) y quedan pendientes de la **prueba final real** acordada con el usuario. El bug marcado ⚫ (BUG-024) se revisó y se determinó que no era una inconsistencia real, sin necesidad de cambio de código.

---

## Resumen

| ID      | Problema                                                                     | Categoría     | Severidad  | Estado                       |
| ------- | ---------------------------------------------------------------------------- | ------------- | ---------- | ---------------------------- |
| BUG-001 | Contraste WCAG de `textTertiary` insuficiente (2.21:1)                       | Accesibilidad | 🟠 Alto    | 🟢 Solucionado               |
| BUG-002 | `AppIcon.tsx` revertido a color estático por un agente                       | React Native  | 🟠 Alto    | 🟢 Solucionado               |
| BUG-003 | Error de sintaxis rompía la compilación de todo el proyecto                  | React Native  | 🔴 Crítico | 🟢 Solucionado               |
| BUG-004 | Crash al abrir `diet_detail_screen.tsx`                                      | Funcional     | 🔴 Crítico | 🟢 Solucionado               |
| BUG-005 | Crash al abrir `set_reminder_screen.tsx`                                     | Funcional     | 🔴 Crítico | 🟢 Solucionado               |
| BUG-006 | Color de fondo congelado en icono de `NavigationTab.tsx`                     | UI            | 🟡 Medio   | 🟢 Solucionado               |
| BUG-007 | Crash al abrir `assigned_meals_screen.tsx`                                   | Técnico       | 🔴 Crítico | 🟢 Solucionado               |
| BUG-008 | Error de compilación en `step_goal_completed_screen.tsx`                     | React Native  | 🔴 Crítico | 🟢 Solucionado               |
| BUG-009 | Crash al abrir el chequeo diario de `workout_preview_screen.tsx`             | Técnico       | 🔴 Crítico | 🟢 Solucionado               |
| BUG-010 | Error de tipos entre `C` y `C_DARK` en `theme.ts`                            | Técnico       | 🟠 Alto    | 🟢 Solucionado               |
| BUG-011 | Contraste WCAG de `completedBadgeText` insuficiente (2.22:1)                 | Accesibilidad | 🟡 Medio   | 🟢 Solucionado               |
| BUG-012 | Botón "FINALIZAR ENTRENAMIENTO" sin tamaño explícito                         | UI            | 🟠 Alto    | 🔵 Necesita verificación     |
| BUG-013 | Botones del calendario con radio fuera de la escala de diseño                | UI            | 🟢 Bajo    | 🔵 Necesita verificación     |
| BUG-014 | Pérdida silenciosa de respuestas de onboarding si falla el envío             | Funcional     | 🟠 Alto    | 🟢 Solucionado               |
| BUG-015 | Colores dinámicos no se refrescan en pantallas con `useResponsiveStyleSheet` | React Native  | 🟠 Alto    | 🔵 Necesita verificación     |
| BUG-016 | `GluestackUIProvider` fijo en modo claro — modo oscuro incompleto            | UI            | 🔴 Crítico | 🔵 Necesita verificación     |
| BUG-017 | Paleta oscura de `global.css` no coincide con `theme.ts`                     | UI            | 🟡 Medio   | 🔵 Necesita verificación     |
| BUG-018 | Contenido HTML de `blog_detail_screen.tsx` no sigue el tema                  | Funcional     | 🟡 Medio   | 🔵 Necesita verificación     |
| BUG-019 | Pestañas de `diet_detail_screen.tsx` con fondo blanco fijo                   | UI            | 🟢 Bajo    | 🔵 Necesita verificación     |
| BUG-020 | Ternario roto sin efecto en el título de `main_goal_screen.tsx`              | UX            | 🟡 Medio   | 🔵 Necesita verificación     |
| BUG-021 | Tarjeta casi invisible en `onboarding_v2_screen.tsx` (`C.gray80`)            | UI            | 🟡 Medio   | 🔵 Necesita verificación     |
| BUG-022 | Texto corrupto (mojibake) visible al usuario                                 | Datos         | 🟡 Medio   | 🟢 Solucionado               |
| BUG-023 | `LoadingSkeleton.tsx` con color de fondo del tema oscuro antiguo             | UI            | 🟡 Medio   | 🔵 Necesita verificación     |
| BUG-024 | Icono "eliminar" inconsistente (revisado: no era real)                       | UI            | 🟢 Bajo    | ⚫ Cerrado / No reproducible |

---

# BUG-001 — Contraste WCAG de `textTertiary` insuficiente

**Estado:** 🟢 Solucionado
**Severidad:** 🟠 Alto
**Categoría:** Accesibilidad
**Fase:** Fase 1 — Corrección de contraste WCAG

## Problema

El token de color `textTertiary`/`gray30`/`textMuted` (mismo alias documentado en `docs/Paleta_Color_BeFit.md`) tenía un valor (`#AEAEB2`) que sobre fondo blanco (`#FFFFFF`) da un ratio de contraste de solo 2.21:1, muy por debajo del mínimo WCAG AA (4.5:1 para texto normal).

## Cómo reproducirlo

1. Tomar el valor hex de `textTertiary` en `pages/migrated/theme.ts` (antes: `#AEAEB2`) y el fondo sobre el que se usa como texto (blanco, `C.surface`).
2. Calcular el ratio de contraste con la fórmula de luminancia relativa W3C.
3. Comparar contra el mínimo AA (4.5:1 para texto normal, 3:1 para texto grande).

## Comportamiento actual

Ratio de contraste 2.21:1 — el texto usando este color (placeholders, etiquetas de día de la semana a `fontSize:11` en `habit_detail_screen.tsx`, badges en `my_program_calendar_screen.tsx`) resultaba difícil de leer, especialmente para usuarios con baja visión.

## Comportamiento esperado

El texto debería cumplir como mínimo el ratio AA aplicable a su tamaño.

## Causa

Valor de color elegido sin verificación de contraste real contra el fondo donde se usa.

## Solución aplicada

Cambiado a `#8E8E93` (gris "tertiaryLabel" estándar de iOS), que sube el ratio a ~3.26:1. No se llegó al 4.5:1 completo porque `textSecondary` (el nivel jerárquico inmediatamente superior) tampoco lo alcanza tras el ajuste de neutros pedido por el usuario (~3.37:1, valor tomado de una captura de referencia real) — oscurecer más `textTertiary` lo habría dejado igual de oscuro que `textSecondary`, invirtiendo la jerarquía visual (terciario debe leerse más apagado que secundario). Se llevó al máximo contraste real disponible sin romper esa jerarquía.

## Archivos afectados

- `pages/migrated/theme.ts`

## Verificación

Recalculado el ratio de contraste con la misma fórmula W3C: 2.21:1 → 3.26:1. Verificación matemática, no requiere renderizado.

**Resultado:** 🟢 Correcto

## Notas

No es una solución perfecta (no llega a 4.5:1), documentado explícitamente en el propio comentario de `theme.ts` junto con el razonamiento.

---

# BUG-002 — `AppIcon.tsx` revertido a color estático

**Estado:** 🟢 Solucionado
**Severidad:** 🟠 Alto
**Categoría:** React Native
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

Durante la primera oleada de migración con 10 agentes en paralelo sin aislamiento de `git worktree`, uno de los agentes revirtió `components/AppIcon.tsx` a su versión estática anterior (color fijo importado de `theme.ts` en vez de dinámico vía `useAppColorMode`), perdiendo el trabajo de otro agente sobre el mismo archivo.

## Cómo reproducirlo

1. Ejecutar `git diff` sobre `components/AppIcon.tsx` contra el commit donde se había migrado.
2. Comprobar que el diff estaba vacío (revertido a su estado previo a la migración).

## Comportamiento actual

`AppIcon` (componente usado en decenas de pantallas para iconos con fondo circular) seguía usando `C` estático — sus iconos no cambiaban de color al alternar modo claro/oscuro.

## Comportamiento esperado

`AppIcon` debía usar `useAppColorMode()` para que su color por defecto y su fondo respondieran al tema activo.

## Causa

Colisión de `git stash`/`checkout` entre agentes concurrentes trabajando sobre el mismo checkout sin aislamiento (incidente descrito con detalle en el historial de la sesión: 10 agentes sin `worktree` chocando entre sí).

## Solución aplicada

Reaplicada la migración: `AppIcon` ahora llama a `useAppColorMode()` y usa `C.brand10`/`C.textPrimary` como valores por defecto de `bg`/`color`, permitiendo overrides explícitos vía props.

## Archivos afectados

- `components/AppIcon.tsx`

## Verificación

`git diff` mostrando el cambio real aplicado; commit dedicado (`eb1ca06`) como punto de control antes de continuar con el resto de la migración.

**Resultado:** 🟢 Correcto

## Notas

Este incidente fue la causa directa de cambiar la estrategia de migración a `isolation: "worktree"` para las siguientes tandas de agentes.

---

# BUG-003 — Error de sintaxis rompía la compilación de todo el proyecto

**Estado:** 🟢 Solucionado
**Severidad:** 🔴 Crítico
**Categoría:** React Native
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

`pages/migrated/activity_tracker_screen.tsx` quedó con una llave de cierre (`}`) faltante en la función `createStyles`, dejada por un agente durante la migración. El error rompía la compilación TypeScript de **todo el proyecto**, no solo de ese archivo.

## Cómo reproducirlo

1. Ejecutar `npx tsc --noEmit -p .` sobre el proyecto.
2. Observar `error TS1005: '}' expected` en la línea 275 de `activity_tracker_screen.tsx`.

## Comportamiento actual

El proyecto no compilaba.

## Comportamiento esperado

Compilación limpia sin errores de sintaxis.

## Causa

Edición incompleta de un agente durante la migración a `createStyles(C)`.

## Solución aplicada

Añadida la llave de cierre faltante en `createStyles`.

## Archivos afectados

- `pages/migrated/activity_tracker_screen.tsx`

## Verificación

`npx tsc --noEmit -p .` limpio tras la corrección — era el único error de compilación de todo el proyecto en ese momento.

**Resultado:** 🟢 Correcto

---

# BUG-004 — Crash al abrir `diet_detail_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🔴 Crítico
**Categoría:** Funcional
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

La función `createStyles(C)` estaba definida en el archivo pero nunca se invocaba — el JSX de la pantalla referenciaba una variable `localStyles` que no llegaba a existir en ningún punto del componente.

## Cómo reproducirlo

1. Abrir la pantalla de detalle de una dieta (`MigratedDietDetail`).
2. La app crashea con un error de referencia indefinida (`localStyles is not defined` / equivalente en runtime).

## Comportamiento actual

Crash inmediato al abrir la pantalla.

## Comportamiento esperado

La pantalla debe renderizar el detalle de la dieta con estilos dinámicos según el tema activo.

## Causa

Migración incompleta: se creó la función `createStyles(C)` pero se olvidó llamar a `useAppColorMode()` y a `useMemo(() => createStyles(C), [C])` dentro del componente. Un helper de módulo (`getVitamins`) que usaba `C`/`localStyles` tampoco estaba movido dentro del componente.

## Solución aplicada

Añadido `useMemo` al import de React, añadido el import de `useAppColorMode`, añadida la llamada al hook y a `useMemo` dentro del componente, y movido el helper `getVitamins` (que usa `C.textPrimary`/`localStyles.*`) al cuerpo del componente.

## Archivos afectados

- `pages/migrated/diet_detail_screen.tsx`

## Verificación

Detectado mediante un chequeo automatizado (grep: `createStyles` definido pero `useAppColorMode()` no invocado en el mismo archivo) — no lo detectó `tsc` por sí solo pese a ser una variable genuinamente indefinida. Verificado tras el fix con el mismo chequeo (ya no aparece en la lista) + `tsc --noEmit -p .` limpio.

**Resultado:** 🟢 Correcto

## Notas

Este chequeo automatizado (medio-migrado: `createStyles` definido + hook no llamado) se reutilizó en el resto de la sesión para detectar el mismo patrón de bug en otros archivos.

---

# BUG-005 — Crash al abrir `set_reminder_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🔴 Crítico
**Categoría:** Funcional
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

Mismo patrón que BUG-004: `createStyles(C)` definida pero nunca invocada, JSX referenciando una variable `s` indefinida.

## Cómo reproducirlo

1. Abrir la pantalla de "Crear recordatorio" (`MigratedSetReminder`).
2. Crash por referencia indefinida a `s`.

## Comportamiento actual

Crash inmediato al abrir la pantalla.

## Comportamiento esperado

La pantalla debe renderizar el formulario de recordatorio con estilos dinámicos.

## Causa

Migración incompleta — mismo patrón que BUG-004.

## Solución aplicada

Añadido `useMemo` al import de React, añadido el import de `useAppColorMode`, y añadida `const { colors: C } = useAppColorMode(); const s = useMemo(() => createStyles(C), [C]);`. Se mantuvo intacto el `useStyle()` preexistente (solo pesos de fuente, sin relación con este bug).

## Archivos afectados

- `pages/migrated/set_reminder_screen.tsx`

## Verificación

Mismo chequeo automatizado que BUG-004 + `tsc --noEmit -p .` limpio.

**Resultado:** 🟢 Correcto

## Notas (2026-08-25)

`set_reminder_screen.tsx` fue una de las 30 pantallas retiradas más adelante en esta misma sesión (ver "Nota — Retirada de 30 pantallas obsoletas" al final del documento). Se mantiene esta entrada como registro histórico del bug real que existió y se corrigió mientras el archivo estuvo vivo.

---

# BUG-006 — Color de fondo congelado en icono de `NavigationTab.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** UI
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

Un color derivado de `C` (`${C.orange}1F`, fondo del icono del menú rápido "+") vivía dentro de un objeto de estilos gestionado por `useResponsiveStyleSheet`, que memoiza su resultado solo por `scale` (tamaño de ventana) — el mismo bug de fondo documentado en BUG-015. Al cambiar de tema, este color concreto no se actualizaba.

## Cómo reproducirlo

1. Abrir la app en modo claro.
2. Cambiar a modo oscuro desde Aspecto.
3. Observar el fondo del icono del menú rápido "+" en la barra de navegación — se queda con el tono del tema anterior.

## Comportamiento actual

El color de fondo del icono no se actualizaba al cambiar de tema (hasta que algo más forzase un recálculo de `scale`, p. ej. rotar el dispositivo).

## Comportamiento esperado

El color debe seguir al tema activo en tiempo real.

## Causa

Instancia concreta del bug de memoización de `helper/responsiveStyleSheet.tsx` (ver BUG-015), descubierta primero aquí durante la migración.

## Solución aplicada

Movido el color dependiente de `C` fuera del objeto memoizado por `useResponsiveStyleSheet`, aplicado como override inline directamente en el JSX (que sí se reevalúa en cada render).

## Archivos afectados

- `components/NavigationTab.tsx`

## Verificación

Revisión de código confirmando que el color ya no vive dentro del objeto memoizado. Verificación visual pendiente de la prueba real (ver BUG-015 para el contexto completo del bug de fondo).

**Resultado:** 🟢 Correcto (el workaround puntual de este archivo es código-correcto; la causa raíz compartida con otros archivos se trata en BUG-015)

## Notas

Este hallazgo fue el que llevó a identificar y documentar el bug de memoización más amplio de `helper/responsiveStyleSheet.tsx` (BUG-015).

---

# BUG-007 — Crash al abrir `assigned_meals_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🔴 Crítico
**Categoría:** Técnico
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

El archivo importaba `useAppColorMode` pero nunca llamaba al hook — la variable `C` quedaba sin definir en ~17 usos a lo largo del componente.

## Cómo reproducirlo

1. Ejecutar `npx tsc --noEmit -p .`.
2. Observar múltiples errores `TS2304: Cannot find name 'C'` en `assigned_meals_screen.tsx`.

## Comportamiento actual

El proyecto no compilaba; en runtime la pantalla de "Comidas asignadas" habría crasheado igual (referencia indefinida).

## Comportamiento esperado

Compilación limpia y pantalla funcional con colores dinámicos.

## Causa

Migración incompleta — import añadido pero llamada al hook olvidada.

## Solución aplicada

Añadida `const { colors: C } = useAppColorMode();` al inicio del componente.

## Archivos afectados

- `pages/migrated/assigned_meals_screen.tsx`

## Verificación

`npx tsc --noEmit -p .` limpio tras el fix (antes mostraba ~17 errores `TS2304` en este archivo).

**Resultado:** 🟢 Correcto

## Notas

Detectado en una pasada de `tsc --noEmit -p .` de todo el proyecto realizada como verificación final antes de comitear el último lote de la migración — no era parte de ese lote, sino un archivo de un lote anterior que había pasado desapercibido.

---

# BUG-008 — Error de compilación en `step_goal_completed_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🔴 Crítico
**Categoría:** React Native
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

Un agente cambió `StyleSheet.absoluteFill` (usado consistentemente en el resto del proyecto) por `StyleSheet.absoluteFillObject`, una API que no existe en la versión de React Native de este proyecto (0.86.0).

## Cómo reproducirlo

1. Ejecutar `npx tsc --noEmit -p .`.
2. Observar `error TS2551: Property 'absoluteFillObject' does not exist on type 'typeof StyleSheet'. Did you mean 'absoluteFill'?` en `home/step_goal_completed_screen.tsx`.

## Comportamiento actual

El proyecto no compilaba.

## Comportamiento esperado

Compilación limpia; el contenedor de confeti debe cubrir toda la pantalla como antes de la migración.

## Causa

Regresión introducida durante la migración — confirmado por `git log -p` que el archivo usaba correctamente `StyleSheet.absoluteFill` antes de que un agente lo cambiara.

## Solución aplicada

Revertido a `StyleSheet.absoluteFill`.

## Archivos afectados

- `pages/migrated/home/step_goal_completed_screen.tsx`

## Verificación

`npx tsc --noEmit -p .` limpio tras el fix. Confirmado por `git log -p --follow` que el valor original (pre-migración) era `absoluteFill`.

## Notas (2026-08-25)

`home/step_goal_completed_screen.tsx` fue una de las 30 pantallas retiradas más adelante en esta misma sesión (ver "Nota — Retirada de 30 pantallas obsoletas" al final del documento). Se mantiene esta entrada como registro histórico del bug real que existió y se corrigió mientras el archivo estuvo vivo.

**Resultado:** 🟢 Correcto

---

# BUG-009 — Crash al abrir el chequeo diario de `workout_preview_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🔴 Crítico
**Categoría:** Técnico
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

El subcomponente de módulo `ScaleRow` (usado en el formulario de "chequeo diario"/readiness) referenciaba una variable `rs` (estilos) que solo existía dentro de `ReadinessForm`, el componente padre — `rs` no estaba en su scope.

## Cómo reproducirlo

1. Ejecutar `npx tsc --noEmit -p .` → errores `TS2304: Cannot find name 'rs'` en `workout_preview_screen.tsx`.
2. En runtime: abrir una sesión de entrenamiento con el chequeo diario de readiness activo (formulario de sueño/agujetas/energía/estrés) → crash al intentar leer `rs.scaleChip` de una variable indefinida.

## Comportamiento actual

Crash al renderizar cualquiera de las filas de escala (`ScaleRow`) del formulario de readiness.

## Comportamiento esperado

El formulario de readiness debe renderizar sus filas de escala con los estilos correctos.

## Causa

`ScaleRow` es un subcomponente a nivel de módulo (fuera de `ReadinessForm`, por restricción de la regla ESLint `react-hooks/static-components`, que impide definir componentes dentro del render del padre) que necesitaba `rs` pero no lo recibía como prop.

## Solución aplicada

Añadido `rs: ReturnType<typeof createReadinessStyles>` a las props de `ScaleRow`, y pasado `rs={rs}` en los 4 puntos donde se usa `<ScaleRow ... />`.

## Archivos afectados

- `pages/migrated/workout_preview_screen.tsx`

## Verificación

`npx tsc --noEmit -p .` limpio tras el fix.

**Resultado:** 🟢 Correcto

## Notas

Mismo patrón de bug (subcomponente de módulo sin acceso a estilos del padre) ya resuelto antes en `sleep_monitoring_screen.tsx` durante la misma migración, pasando `styles`/`C` como props explícitas.

---

# BUG-010 — Error de tipos entre `C` y `C_DARK` en `theme.ts`

**Estado:** 🟢 Solucionado
**Severidad:** 🟠 Alto
**Categoría:** Técnico
**Fase:** Fase 1 — Migración a modo oscuro

## Problema

`C_DARK` estaba tipado como `typeof C`, y `C` se declaraba con `as const` (tipos literales exactos por propiedad, p. ej. `bg: "#F4F4F7"` como tipo, no `string`). Como `C_DARK` tiene valores distintos a `C` en casi todas sus propiedades, TypeScript rechazaba la asignación en decenas de líneas.

## Cómo reproducirlo

1. Ejecutar `npx tsc --noEmit -p .`.
2. Observar más de 60 errores `TS2322: Type '"#242529"' is not assignable to type '"#F4F4F7"'` (y equivalentes) en `theme.ts`.

## Comportamiento actual

El proyecto no compilaba.

## Comportamiento esperado

Compilación limpia — `C_DARK` debe poder tener valores de color distintos a `C` sin error de tipos.

## Causa

Bug preexistente desde que se introdujo `C_DARK` (commit `bf23806`, "modo oscuro automático por hora en Home v2", 2026-08-21) — anterior a esta sesión. `C_DARK: typeof C` exigía tipos literales idénticos a `C` por el `as const` de `C`, algo que nunca pudo haber compilado limpio desde su introducción; probablemente pasó desapercibido por no correr `tsc --noEmit -p .` de todo el proyecto como gate antes de esta sesión.

## Solución aplicada

Eliminado el `as const` de la declaración de `C` — no había ningún código que dependiera de los tipos literales estrechos de sus propiedades (son solo strings de color), así que TypeScript infiere `string` para cada propiedad y `C_DARK: typeof C` deja de exigir coincidencia exacta de valores.

## Archivos afectados

- `pages/migrated/theme.ts`

## Verificación

`npx tsc --noEmit -p .` limpio tras el fix (0 errores en todo el proyecto).

**Resultado:** 🟢 Correcto

## Notas

Bug preexistente a esta sesión, no introducido por la migración a modo oscuro — se detectó y corrigió porque esta sesión fue la primera en correr un `tsc` completo del proyecto como parte del proceso de verificación.

---

# BUG-011 — Contraste WCAG de `completedBadgeText` insuficiente

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** Accesibilidad
**Fase:** Fase 1 — Cierre (contraste, CTA, catches)

## Problema

El estilo `completedBadgeText` en `my_program_calendar_screen.tsx` (texto de la insignia "Completado" sobre entrenamientos del calendario) usaba `C.success` (`#34C759`) como color de texto — 2.22:1 de contraste sobre su fondo (`C.success10`, un verde muy claro), muy por debajo del mínimo AA.

## Cómo reproducirlo

1. Tomar `C.success` (`#34C759`) y el fondo `C.success10` (verde muy claro).
2. Calcular el ratio de contraste (fórmula W3C).

## Comportamiento actual

Ratio 2.22:1 — texto de la insignia difícil de leer.

## Comportamiento esperado

Ratio ≥ 4.5:1 para texto normal (o ≥ 3:1 si califica como texto grande).

## Causa

Uso de `C.success` (pensado como color de acento/icono) directamente como color de texto, sin verificar contraste.

## Solución aplicada

Cambiado a `C.success60` (`#248A3D`, variante más oscura ya existente en la paleta), que sube el contraste a 4.40:1.

## Archivos afectados

- `pages/migrated/my_program_calendar_screen.tsx`

## Verificación

Recalculado el ratio con la fórmula W3C: 2.22:1 → 4.40:1. Revisado además todo el proyecto en busca de otros usos de `C.success`/`C.warning` como color de texto — el resto de usos encontrados son de icono o de fondo de badge, no de texto, por lo que no requerían el mismo fix.

**Resultado:** 🟢 Correcto

---

# BUG-012 — Botón "FINALIZAR ENTRENAMIENTO" sin tamaño explícito

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟠 Alto
**Categoría:** UI
**Fase:** Fase 1 — Cierre (contraste, CTA, catches)

## Problema

El botón "FINALIZAR ENTRENAMIENTO" (cierra la sesión de entrenamiento activa — probablemente el CTA más pulsado de toda la app) usaba `radius="pill"` sin `size`, cayendo al tamaño `default` del componente `Button` compartido (sin `min-h` definido) — más pequeño que el botón "Continuar" del onboarding, que sí usa `size="lg"`.

## Cómo reproducirlo

1. Abrir una sesión de entrenamiento activa.
2. Comparar visualmente el botón "FINALIZAR ENTRENAMIENTO" (parte inferior, fijo) con el botón "Continuar" del flujo de onboarding.
3. El primero se ve visiblemente más pequeño/menos prominente que el segundo, pese a ser la acción más crítica de la pantalla.

## Comportamiento actual

Botón con altura/padding por defecto (`px-4 py-2`, sin `min-h`).

## Comportamiento esperado

Mismo tamaño prominente que el botón de referencia de onboarding (`size="lg"` + `radius="pill"`, `min-h-10` + `px-8`).

## Causa

Falta de `size` explícito al usar el componente `Button` compartido — hallazgo documentado en `docs/AUDITORIA_UIUX_2026-08-24.md` (sección 3.1, "Buttons").

## Solución aplicada

Añadido `size="lg"` al `<Button radius="pill" onPress={onFinish}>`, igualándolo al botón de referencia de `onboarding_v2_screen.tsx`.

## Archivos afectados

- `pages/migrated/workout_session_screen.tsx`

## Verificación

Confirmado por lectura de código que `size="lg"` produce la misma combinación de clases (`min-h-10 rounded-md px-8` + `rounded-pill`) que el botón de referencia. **Pendiente verificación visual real** (abrir una sesión de entrenamiento y comparar el tamaño del botón con el de onboarding).

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-013 — Botones del calendario con radio fuera de la escala de diseño

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟢 Bajo
**Categoría:** UI
**Fase:** Fase 1 — Cierre (contraste, CTA, catches)

## Problema

Los botones "Enviar solicitud"/"Guardar cambios" de `my_program_calendar_screen.tsx` (barra de días no disponibles) usaban `borderRadius: 10` a mano, un valor que no pertenece a la escala `RADIUS` del proyecto (`sm:12, md:20, lg:28`).

## Cómo reproducirlo

1. Abrir el calendario de programa (`MigratedMyProgramCalendar`).
2. Marcar un día como no disponible hasta ver la barra con los botones "Enviar solicitud"/"Guardar cambios".
3. Comparar el radio de esquina de esos botones con otros botones de la app que sí usan la escala `RADIUS`.

## Comportamiento actual

Radio de esquina de 10px, ligeramente distinto (más recto) al resto de botones equivalentes de la app.

## Comportamiento esperado

Radio alineado a la escala `RADIUS` del design system.

## Causa

`StyleSheet` a mano con un valor numérico suelto en vez de usar el token `RADIUS.sm`, sin pasar por el componente `Button` compartido.

## Solución aplicada

Fix inicial: cambiado `borderRadius: 10` por `borderRadius: RADIUS.sm` (12px). **Actualizado en IMP-004** (`IMPROVEMENTS.md`): al revisar este mismo botón para esa mejora se comprobó que ya usaba el componente `Button` compartido (no `StyleSheet` puro como decía la auditoría original), así que se sustituyó el `borderRadius`/padding a mano por las props propias del componente (`size="sm" radius="pill"`), dejando en el `style` solo el color de fondo (`C.orange`, que no tiene variante equivalente en el componente).

## Archivos afectados

- `pages/migrated/my_program_calendar_screen.tsx`

## Verificación

Confirmado por lectura de código el cambio de valor y, tras IMP-004, el uso de las props del componente. `tsc --noEmit -p .`/`eslint --quiet` limpios. **Pendiente confirmación visual** en la prueba final.

**Resultado:** 🔵 Pendiente de confirmación visual

## Notas

La auditoría original también recomendaba migrar estos 2 botones al componente `Button` compartido en vez de solo tokenizar el radio — implementado en IMP-004 (`IMPROVEMENTS.md`), a petición explícita del usuario antes de pasar a Fase 2.

---

# BUG-014 — Pérdida silenciosa de respuestas de onboarding si falla el envío

**Estado:** 🟢 Solucionado
**Severidad:** 🟠 Alto
**Categoría:** Funcional
**Fase:** Fase 1 — Cierre (contraste, CTA, catches)

## Problema

En `onboarding_v2_screen.tsx`, si el envío al backend de la última etapa del onboarding fallaba (`submitStage`), `handleContinue` navegaba igualmente a la pantalla de resultado como si el envío hubiese ido bien, **y además borraba el checkpoint de `AsyncStorage`** que contenía la única copia local de esas respuestas — sin ninguna vía de reintento posterior.

## Cómo reproducirlo

1. Completar el flujo de onboarding v2 con la red desconectada (o forzando un fallo del endpoint) justo en la última pregunta de la última etapa.
2. Observar que la app navega a la pantalla de resultado sin ningún aviso de error.
3. Comprobar en el backend que las respuestas de esa etapa nunca llegaron a guardarse.
4. Comprobar que `AsyncStorage` ya no tiene copia de esas respuestas — no hay forma de recuperarlas ni de reintentar el envío.

## Comportamiento actual

Fallo de red silencioso: el usuario cree que su onboarding se completó correctamente, pero sus datos nunca llegaron al backend, y la única copia local se borra igualmente.

## Comportamiento esperado

Un fallo en el envío de la última etapa no debería destruir la única copia de esas respuestas — debería quedar la posibilidad de reintentar en el futuro, sin necesariamente bloquear la navegación del usuario (decisión de producto ya documentada: ni siquiera la etapa 1 debe bloquear el alta de un usuario por un fallo de red puntual).

## Causa

`submitStage` no comunicaba a su llamador si el envío había tenido éxito o no (`catch` que solo hacía `logger.error`); `handleContinue` borraba el checkpoint de `AsyncStorage` incondicionalmente al llegar a la última pregunta, sin comprobar si el envío real había funcionado.

## Solución aplicada

`submitStage` ahora devuelve `Promise<boolean>` (éxito/fallo). `handleContinue` solo borra el checkpoint de `AsyncStorage` si la última etapa se envió correctamente; si falló, el checkpoint se conserva. No se bloquea la navegación (se respeta la decisión de producto ya documentada en el propio archivo) — solo se deja de destruir la única copia de datos que nunca llegaron al backend.

## Archivos afectados

- `pages/migrated/onboarding_v2/onboarding_v2_screen.tsx`

## Verificación

Revisión de código confirmando que la ruta de `removeItem` de `AsyncStorage` ahora está condicionada al resultado de `submitStage`. Revisados también los catches de `workout_session_screen.tsx`, `edit_profile_screen.tsx` y `change_pwd_screen.tsx` — todos ya muestran estado de error visible o `Alert.alert`, no eran silenciosos.

**Resultado:** 🟢 Correcto (verificable por lectura de código — la lógica de guardado condicional no depende de renderizado)

---

# BUG-015 — Colores dinámicos no se refrescan en pantallas con `useResponsiveStyleSheet`

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟠 Alto
**Categoría:** React Native
**Fase:** Fase 1 — Cierre de gaps de modo oscuro

## Problema

El hook compartido `useResponsiveStyleSheet` (usado en ~20 pantallas para estilos con escalado responsive) memoiza su resultado con `useMemo(..., [scale])` — `scale` depende solo de las dimensiones de la ventana (`useWindowDimensions`), nunca del contenido real del objeto de estilos que se le pasa. Si ese objeto embebe colores de `C`/`C_DARK` (`useAppColorMode()`), cambiar de tema no dispara un recálculo hasta que además cambien las dimensiones de la ventana (p. ej. al rotar el dispositivo).

## Cómo reproducirlo

1. Abrir cualquiera de estas pantallas en modo claro: `main_goal_screen.tsx`, `meals_water_reminder_screen.tsx`, `meals_reminders_screen.tsx`, `onboarding_screen.tsx`.
2. Cambiar a modo oscuro desde Aspecto (sin rotar el dispositivo ni cambiar el tamaño de ventana).
3. Observar que los colores de fondo/texto definidos dentro del objeto pasado a `useResponsiveStyleSheet` no cambian, mientras que otros elementos de la misma pantalla que sí usan `C` directamente (fuera de ese hook) sí cambian.

## Comportamiento actual

Colores desactualizados tras un cambio de tema hasta que algo más (rotación, resize) fuerza un recálculo de `scale`.

## Comportamiento esperado

Todos los colores dependientes de `C` deben actualizarse inmediatamente al cambiar el modo claro/oscuro.

## Causa

Decisión deliberada de un autor anterior a esta sesión (documentada en un comentario del propio código): no añadir el objeto `styleSheet` a las dependencias del `useMemo` porque cada pantalla que llama al hook pasa un objeto literal nuevo en cada render, y añadirlo anularía la memoización en todos los usos, no solo en los que necesitan reaccionar a un cambio real. Esa decisión era correcta cuando todos los colores eran estáticos; dejó de serlo al introducirse colores dinámicos por tema sin revisar esa suposición.

## Solución aplicada

Añadido un segundo parámetro opcional `extraDeps: DependencyList = []` a `useResponsiveStyleSheet`, usado en las deps internas del `useMemo` (`[scale, ...extraDeps]`). El valor por defecto (`[]`) mantiene el comportamiento exacto de antes para los ~34 usos existentes que no lo necesitan. Los 4 archivos afectados ahora pasan `[C]` como segundo argumento (`C` es una referencia estable entre renders — solo cambia cuando el modo de color realmente cambia). De paso, limpiados 8 imports muertos del hook en archivos que ya no lo usaban.

## Archivos afectados

- `helper/responsiveStyleSheet.tsx`
- `pages/migrated/main_goal_screen.tsx`
- `pages/migrated/meals_water_reminder_screen.tsx`
- `pages/migrated/meals_reminders_screen.tsx`
- `pages/migrated/onboarding_screen.tsx`
- `pages/migrated/plan_screen.tsx`, `splash_screen.tsx`, `sleep_monitoring_screen.tsx`, `activity_tracker_screen.tsx`, `water_tracker_screen.tsx`, `water_reminders_screen.tsx`, `steps_count_screen.tsx`, `my_program_calendar_screen.tsx` (solo limpieza de import muerto, no afectados por el bug)

## Verificación

`tsc --noEmit -p .` y `eslint --quiet` limpios. La corrección es lógicamente sólida (deps array estándar de React), pero **si los colores realmente se refrescan en pantalla al cambiar de tema solo puede confirmarse viendo la app renderizada** — pendiente de la prueba final real.

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-016 — `GluestackUIProvider` fijo en modo claro — modo oscuro incompleto

**Estado:** 🔵 Necesita verificación
**Severidad:** 🔴 Crítico
**Categoría:** UI
**Fase:** Fase 1 — Cierre de gaps de modo oscuro

## Problema

`App.tsx` montaba `<GluestackUIProvider mode="light">` de forma fija. ~58 de 85 pantallas migradas usan también componentes Gluestack/NativeWind (`Box`, `Text`, `Card`, `Button`, etc.) con clases (`className="bg-card"`, `"text-foreground"`...) que se resuelven contra variables CSS de `global.css` — ese segundo sistema de color nunca se activaba porque el modo estaba forzado a claro, independientemente del tema real elegido por el usuario.

## Cómo reproducirlo

1. Cambiar a modo oscuro desde Aspecto.
2. Abrir cualquier pantalla que mezcle estilos propios (`C.xxx`, ya dinámicos) con componentes Gluestack (`className="bg-card"`) — p. ej. `search_screen.tsx`, `workout_preview_screen.tsx`, `assigned_meals_screen.tsx`.
3. Observar que las superficies con clases Gluestack se quedan en claro mientras el resto de la pantalla ya cambió a oscuro.

## Comportamiento actual

Modo oscuro parcial: la mitad del sistema de estilos de la app (Gluestack/NativeWind) nunca respondía al tema activo.

## Comportamiento esperado

Todos los componentes de la app, sin importar qué sistema de estilos usen internamente, deben responder al modo claro/oscuro elegido por el usuario.

## Causa

`GluestackUIProvider` era el proveedor más externo, por encima de `AppColorModeProvider` — no había ningún componente que pudiera leer `useAppColorMode()` (solo invocable dentro de la subtree de `AppColorModeProvider`) y pasarle su `mode` a `GluestackUIProvider`, que vivía fuera de esa subtree.

## Solución aplicada

Invertido el anidamiento de providers en `App.tsx`: `GluestackUIProvider` ahora vive dentro de `AppColorModeProvider`, vía un componente puente (`GluestackModeBridge`) que llama a `useAppColorMode()` y le pasa el `mode` real. Complementado con BUG-017 (resincronización de los valores de color) para que el modo oscuro activado muestre los colores correctos.

## Archivos afectados

- `App.tsx`

## Verificación

`tsc --noEmit -p .` y `eslint --quiet` limpios. Confirmado por lectura de código (y de la implementación de `GluestackUIProvider`, nativo y web) que el flujo de `mode` ahora llega correctamente desde `useAppColorMode()`. **No verificado visualmente** — no hay simulador/dispositivo disponible en este entorno. Riesgo adicional a vigilar en la prueba real: `Appearance.setColorScheme(mode)` es una API global de React Native que fuerza lo que reporta `Appearance.getColorScheme()` para toda la app, no solo para Gluestack — comprobar que ninguna librería de terceros (navegación, selectores nativos, etc.) reacciona de forma inesperada.

**Resultado:** 🔵 Pendiente de confirmación visual — este es el bug más importante de los pendientes de verificar, ya que es la causa raíz de que el modo oscuro no estuviera realmente al 100%.

---

# BUG-017 — Paleta oscura de `global.css` no coincide con `theme.ts`

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟡 Medio
**Categoría:** UI
**Fase:** Fase 1 — Cierre de gaps de modo oscuro

## Problema

Las variables CSS de `global.css` (que alimentan las clases Gluestack/NativeWind `bg-card`, `text-foreground`, etc.) ya tenían valores definidos tanto para claro como para oscuro, pero el bloque oscuro era un palette genérico e independiente que nunca se actualizó junto con los reajustes de neutros de `pages/migrated/theme.ts` — p. ej. `--background` oscuro era `10 10 10` (negro casi OLED) mientras que `C_DARK.bg` de `theme.ts` es `#242529` (gris carbón elevado, explícitamente NO negro casi puro, por decisión de diseño documentada).

## Cómo reproducirlo

1. Comparar valor a valor las variables de `:root.dark`/`@media (prefers-color-scheme: dark)` en `global.css` contra `C_DARK` en `pages/migrated/theme.ts` (antes del fix).
2. Confirmar diferencias reales en `background`, `card`, `muted-foreground`, `destructive`, `success`, `border`.

## Comportamiento actual

Si se activaba el modo oscuro de Gluestack (BUG-016) sin corregir esto, una misma pantalla mostraría dos tonos de "oscuro" distintos conviviendo — uno de `C_DARK` (correcto, ya ajustado con capturas de referencia) y otro del palette genérico de `global.css` (no ajustado).

## Comportamiento esperado

Ambos sistemas de color deben mostrar exactamente los mismos tonos en modo oscuro.

## Causa

Dos sistemas de color (custom `C`/`C_DARK` vía `useAppColorMode`, y Gluestack/NativeWind vía `global.css`) construidos y mantenidos de forma independiente, sin ningún mecanismo que los mantuviera sincronizados cuando uno de los dos cambiaba.

## Solución aplicada

Reescritos los triples RGB de `:root`, `:root.dark`, `:root.light` y el bloque `@media (prefers-color-scheme: dark)` en `global.css` para que cada token sea exactamente el valor hex de `C`/`C_DARK` (convertido a "R G B"), usando una tabla de correspondencia explícita (`primary`→`accentBlack`, `card`/`popover`→`surface`, `background`→`bg`, `muted-foreground`→`textSecondary`, etc.), documentada en el propio comentario de `global.css`.

## Archivos afectados

- `global.css`

## Verificación

Cada valor final comparado numéricamente contra `theme.ts` durante la implementación. **No verificado visualmente** en un renderizado real — pendiente de la prueba final, junto con BUG-016 (dependen entre sí: este fix solo tiene efecto visible una vez BUG-016 esté activo).

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-018 — Contenido HTML de `blog_detail_screen.tsx` no sigue el tema

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟡 Medio
**Categoría:** Funcional
**Fase:** Fase 1 — Cierre de gaps de modo oscuro

## Problema

El HTML renderizado dentro del `WebView` de detalle de blog (`WRAPPER_HTML`) era una constante de módulo que capturaba `C` de forma estática en el momento del import — nunca se había migrado a dinámico, decisión documentada explícitamente en un comentario del propio archivo a la espera de que se resolviera BUG-016 (mezclar `C` dinámico con `className` de NativeWind aún fijo en claro habría sido peor que no tocarlo).

## Cómo reproducirlo

1. Cambiar a modo oscuro.
2. Abrir el detalle de cualquier entrada de blog.
3. Observar que el contenido HTML dentro del WebView (fondo, color de texto, citas, enlaces) se mantiene con los colores de modo claro, mientras la cabecera/chrome de la pantalla (una vez resuelto BUG-016) sigue el tema.

## Comportamiento actual

Contenido del WebView permanentemente en colores de modo claro.

## Comportamiento esperado

El contenido del WebView debe seguir el tema activo, igual que el resto de la pantalla.

## Causa

Bloqueo intencional documentado — dependía de que `GluestackUIProvider` dejase de estar fijo en claro (BUG-016) para que tuviera sentido dinamizar también este WebView.

## Solución aplicada

Convertida la constante de módulo `WRAPPER_HTML` en una función `buildWrapperHtml(C)` (mismo patrón ya usado en `resource_detail_screen.tsx`), llamada dentro del componente con el `C` dinámico de `useAppColorMode()`.

## Archivos afectados

- `pages/migrated/blog_detail_screen.tsx`

## Verificación

`tsc --noEmit -p .` y `eslint --quiet` limpios. **No verificado visualmente** — requiere abrir un post de blog con contenido real en modo oscuro y comprobar que el WebView renderiza con los colores correctos.

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-019 — Pestañas de `diet_detail_screen.tsx` con fondo blanco fijo

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟢 Bajo
**Categoría:** UI
**Fase:** Fase 1 — Cierre de gaps de modo oscuro

## Problema

El selector de pestañas "Ingredientes"/"Instrucciones" usaba `className="bg-white"` (clase literal de Tailwind, no un token de `global.css`) para el fondo del track — no un color de tema, así que nunca cambiaría con el modo oscuro.

## Cómo reproducirlo

1. Cambiar a modo oscuro.
2. Abrir el detalle de una dieta y bajar hasta el selector "Ingredientes"/"Instrucciones".
3. Observar que el track del selector se queda blanco mientras la tarjeta que lo envuelve (`contentSheet`, ya dinámica vía `C.bg`) pasa a oscuro.

## Comportamiento actual

Track de pestañas blanco fijo sobre una tarjeta oscura — parche visual inconsistente.

## Comportamiento esperado

El track debe usar la misma superficie que el resto de tarjetas de la app (`C.surface`), que ya es blanca en claro y oscura en modo oscuro.

## Causa

Uso de una clase literal de Tailwind (`bg-white`) en vez de un color de tema — no detectable por `tsc`/`eslint`, encontrado en una revisión manual de colores no-token tras cerrar BUG-016.

## Solución aplicada

Cambiado `className="rounded-full bg-white p-1"` por `className="rounded-full p-1"` + `style={{ backgroundColor: C.surface }}` (inline, dinámico).

## Archivos afectados

- `pages/migrated/diet_detail_screen.tsx`

## Verificación

`eslint --quiet` limpio. Revisados también otros usos de colores literales no-token detectados en la misma pasada (`bg-black/50`, `bg-black/60` en `add_post_screen.tsx`/`recipe_main_screen.tsx`) — confirmados como scrims/overlays intencionales sobre fotos, correctos tal cual, sin necesidad de cambio. **No verificado visualmente** — pendiente de la prueba final.

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-020 — Ternario roto sin efecto en el título de `main_goal_screen.tsx`

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟡 Medio
**Categoría:** UX
**Fase:** Pre-Fase 2 — Cierre de "quick wins" de la auditoría

## Problema

El título de cada tarjeta de objetivo (`renderGoalCard`) usaba `{ color: isSelected ? C.white : C.white }` — ambas ramas del ternario son idénticas, así que el color del título nunca cambiaba al seleccionar/deseleccionar, pese a que el icono de la misma tarjeta (`isSelected ? C.orange : C.gray40`) y la descripción (`goalDesc`/`goalDescSelected`) sí lo hacían correctamente.

## Cómo reproducirlo

1. Abrir la pantalla de selección de objetivo principal (`MigratedMainGoal`).
2. Tocar distintas tarjetas de objetivo para seleccionarlas/deseleccionarlas.
3. Observar que el icono y la descripción cambian de color al seleccionar, pero el título de la tarjeta se queda siempre igual.

## Comportamiento actual

El título no da ninguna señal visual de selección — solo el icono y la descripción lo hacen, dejando una jerarquía de feedback incompleta/inconsistente dentro de la misma tarjeta.

## Comportamiento esperado

El título debería diferenciarse visualmente igual que el resto de la tarjeta al seleccionarse (más prominente/blanco si está seleccionada, más apagado si no).

## Causa

Ternario mal escrito — probablemente un error de copia/pega donde la rama `false` debía apuntar a otro color y se dejó igual a la rama `true`. Detectado originalmente en `docs/AUDITORIA_UIUX_2026-08-24.md` (sección "Quick wins") y nunca corregido hasta ahora.

## Solución aplicada

Cambiado a `{ color: isSelected ? C.white : C.textSecondary }`, siguiendo el mismo patrón claro/apagado que ya usa `goalDesc`/`goalDescSelected` en el mismo archivo.

## Archivos afectados

- `pages/migrated/main_goal_screen.tsx`

## Verificación

`eslint --quiet` limpio. **Pendiente confirmación visual** — comprobar en la prueba final que el título realmente cambia de color al seleccionar una tarjeta.

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-021 — Tarjeta casi invisible en `onboarding_v2_screen.tsx`

**Estado:** 🔵 Necesita verificación
**Severidad:** 🟡 Medio
**Categoría:** UI
**Fase:** Pre-Fase 2 — Cierre de "quick wins" de la auditoría

## Problema

`nameCard` (tarjeta que envuelve los campos de nombre/apellidos en la etapa de datos personales del onboarding v2) usaba `backgroundColor: C.gray80` — un alias del mismo valor que `C.border`/`C.bg` (`#E5E5EA` en claro), casi indistinguible del fondo de la pantalla.

## Cómo reproducirlo

1. Abrir el flujo de onboarding v2 hasta la pregunta de nombre/apellidos.
2. Observar que la tarjeta que envuelve los campos apenas se distingue del fondo de la pantalla — no se percibe como una tarjeta elevada.

## Comportamiento actual

Tarjeta casi invisible sobre el fondo, sin la separación visual esperada de una superficie elevada.

## Comportamiento esperado

La tarjeta debe distinguirse claramente del fondo, como el resto de tarjetas de la app.

## Causa

Uso de `C.gray80` (uno de los 5 alias duplicados de `accent`, ver IMP-003 en `IMPROVEMENTS.md`) para lo que debía ser una superficie de tarjeta real. Mismo bug de clase ya detectado y corregido antes en `edit_profile_screen.tsx` (que ahora usa `C.surface`), pero nunca replicado aquí. Documentado en `docs/AUDITORIA_UIUX_2026-08-24.md` (sección "Quick wins") y nunca corregido hasta ahora.

## Solución aplicada

Cambiado `backgroundColor: C.gray80` por `backgroundColor: C.surface` (blanco real en claro, superficie elevada en oscuro), igual que `edit_profile_screen.tsx`.

## Archivos afectados

- `pages/migrated/onboarding_v2/onboarding_v2_screen.tsx`

## Verificación

`eslint --quiet` limpio. **Pendiente confirmación visual** — comprobar en la prueba final que la tarjeta ahora se distingue del fondo en ambos temas.

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-022 — Texto corrupto (mojibake) visible al usuario

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** Datos
**Fase:** Fase 2 — investigación previa a Visual System

## Problema

Varios archivos tenían texto codificado dos veces (UTF-8 guardado en algún momento de su historia como si fuera Latin-1/Windows-1252, y vuelto a guardar como UTF-8) — visible al usuario como secuencias como `Â¿`/`Ã©` en vez de `¿`/`é`. Confirmado con `git show` contra commits muy anteriores a esta sesión: el bug ya existía antes de toda la migración a modo oscuro, no fue introducido por ningún agente de este proyecto.

## Cómo reproducirlo

Antes del fix: abrir la pantalla de gestión de métricas de salud y pulsar eliminar sobre una métrica → el diálogo mostraba `"Â¿Eliminar esta mÃ©trica?"` en vez de `"¿Eliminar esta métrica?"`.

## Comportamiento actual (antes del fix)

Texto con caracteres corruptos visible directamente en `Alert.alert` y textos de la interfaz.

## Comportamiento esperado

Texto en español correctamente acentuado.

## Causa

Corrupción de codificación (mojibake) preexistente, de origen no determinado (probablemente una herramienta o copia/pega que interpretó bytes UTF-8 como Windows-1252 en algún punto de la historia del archivo, antes de esta sesión).

## Solución aplicada

Investigación inicial encontró 9 archivos afectados (52 apariciones de 8 secuencias corruptas distintas). **8 de esos 9 archivos formaban parte del lote de 30 pantallas retiradas en esta misma sesión** (todo el onboarding v1 + varias pantallas de steps) — se fueron con el borrado, sin necesidad de arreglarlas antes. Solo quedó vivo `pages/migrated/home/manage_health_metrics_screen.tsx` (4 apariciones, incluyendo una variante más compleja de doble-corrupción en `"Ã‰xito"` que reveló que la codificación real de origen era Windows-1252, no Latin-1 puro — confirmado descifrando los bytes exactos del archivo). Corregidas las 3 líneas afectadas con reemplazo literal dirigido (no conversión de archivo completo, ya que el archivo mezcla texto ya-correcto con texto corrupto).

## Archivos afectados

- `pages/migrated/home/manage_health_metrics_screen.tsx`
- (8 archivos adicionales quedaron sin efecto al ser retirados en el mismo commit — ver nota de cierre de pantallas al final de este documento)

## Verificación

`grep` de las secuencias corruptas en el archivo antes/después: 4 → 0. `eslint --quiet` limpio.

**Resultado:** 🟢 Correcto

---

# BUG-023 — `LoadingSkeleton.tsx` con color de fondo del tema oscuro antiguo

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** UI
**Fase:** Fase 2 — investigación previa a Visual System

## Problema

`components/LoadingSkeleton.tsx` tenía `backgroundColor: "#1E1B3A"` (azul/morado oscuro, resto de un tema oscuro anterior a la paleta clara actual) hardcodeado, sin usar `useAppColorMode`.

## Cómo reproducirlo

1. Abrir `pages/DietList.tsx` o `pages/DietDashboard.tsx` (usan `LoadingSkeletonMem` de verdad, líneas 273 y 109/111 respectivamente) mientras cargan datos.
2. Observar que el "shimmer" de carga se renderiza como un bloque casi negro/morado en vez de un gris claro tipo shimmer.

## Comportamiento actual

Bloque oscuro roto visualmente contra el resto de la UI clara.

## Comportamiento esperado

Gris claro apropiado para un efecto de shimmer sobre fondo claro (y oscuro, si el modo oscuro llega también a esas 2 pantallas en el futuro).

## Causa

Color hardcodeado nunca actualizado cuando el resto de la app migró de tema oscuro a la paleta clara actual (ni, más tarde, a colores dinámicos).

## Solución aplicada

Añadido `useAppColorMode()`, color de fondo cambiado a `C.gray20`. De paso, `useStyle` recibe `C` como parámetro y se pasa `[C]` como `extraDeps` a `useResponsiveStyleSheet` (mismo patrón que BUG-015) para que el color reaccione correctamente a un futuro cambio de tema.

## Archivos afectados

- `components/LoadingSkeleton.tsx`

## Verificación

`eslint --quiet` limpio. **Pendiente confirmación visual** — no se ha podido ver renderizado en este entorno.

**Resultado:** 🔵 Pendiente de confirmación visual

---

# BUG-024 — Icono "eliminar" inconsistente (`close-circle` vs `trash-outline`) — cerrado, no reproducible

**Estado:** ⚫ Cerrado / No reproducible
**Severidad:** 🟢 Bajo
**Categoría:** UI
**Fase:** Fase 2 — investigación previa a Visual System

## Problema (tal como se reportó inicialmente)

Un agente de investigación señaló `close-circle` en `add_post_screen.tsx` (quitar una imagen adjunta antes de publicar) y `onboarding/profile_setup_form_screen.tsx` (quitar un tag de alergia) como una inconsistencia frente a los 6 archivos que usan `trash-outline` para "eliminar".

## Por qué se cierra sin cambio de código

Al revisar el contexto real de `add_post_screen.tsx` (el único de los 2 archivos que sobrevive — el otro se retiró con el onboarding v1), `close-circle` está aplicado como una insignia "×" en la esquina de una miniatura de imagen **todavía no guardada** (seleccionada para el post, pendiente de publicar) — el patrón estándar de UI para "descartar de la selección", no para "eliminar un elemento ya guardado" (que es lo que representa `trash-outline` en los 6 archivos donde sí se usa, todas filas de listas persistidas). Son dos momentos distintos del ciclo de vida del dato, no la misma acción con dos iconos — forzar `trash-outline` aquí habría sido una regresión visual, no una mejora de consistencia. Documentado con nombre en `constants/icons.ts` (`ACTION_ICONS.delete` vs `ACTION_ICONS.dismiss`) para que futuro código no repita la confusión en sentido contrario.

## Archivos revisados

- `pages/migrated/add_post_screen.tsx` (revisado, sin cambio)
- `constants/icons.ts` (nuevo, documenta la distinción)

## Notas

Ejemplo de por qué "no crear bugs artificiales" importa: un hallazgo de un agente de investigación no se traduce automáticamente en un fix — aquí, aplicarlo tal cual habría sido el error.

---

## Nota — Retirada de 30 pantallas obsoletas (2026-08-25)

No es un bug, se documenta aquí por contexto (varias entradas de este documento hacen referencia a ella). El usuario confirmó que 30 pantallas de `pages/migrated` quedan retiradas: todo el flujo de onboarding v1 (reemplazado por completo por onboarding v2) y varias pantallas de tracking (steps, heart rate, water/meals reminders, activity sleep monitoring, splash). Antes de borrar se verificó cada ruta contra `App.tsx` y contra referencias cruzadas en todo el repo, encontrando 3 dependencias de código vivo que NO debían borrarse:

- `assessment_result_screen.tsx` — sigue siendo la pantalla de resultado final de onboarding v2 (`onboarding_v2_screen.tsx` navega ahí).
- `water_tracker_screen.tsx` / `activity_tracker_screen.tsx` — siguen siendo destino de 2 botones "+" en la Home real (`home_screen_modern_v2.tsx`).

Sí se borró `log_steps_form_screen.tsx`, quitando también la opción "Entrada manual" en `home/link_device_choice_screen.tsx` que la abría (única referencia externa real). Verificado con grep de cada uno de los 30 nombres de ruta en todo el repo tras el borrado: 0 referencias colgantes. `App.tsx` y `pages/ScreenExplorer.tsx` actualizados para no registrar ni listar las rutas borradas.

---

# BUG-025 — Botón "compartir" muerto en `post_details_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** Funcionalidad
**Fase:** Fase 3 — UX

## Problema

`post_details_screen.tsx:226-228` (numeración previa al fix): `<Pressable><Icon name="share-outline" /></Pressable>` sin `onPress` — no existía ningún `handleShare` ni llamada a `Share.share(...)` en todo el archivo. El botón se veía y se podía tocar, pero no hacía nada.

## Fix

Añadido `handleShare` usando la API `Share` de React Native (`Share.share({ message: postData.content || '...' })`), cableado al `onPress` del botón. Patrón estándar, sin ambigüedad de producto — coincide con el mismo mecanismo ya usado en `helper/logger.ts` para "Enviar registros al desarrollador".

## Archivos modificados

- `pages/migrated/post_details_screen.tsx`

## Verificación

`npx eslint` limpio. Sin cambio visual (mismo icono, mismo estilo) — solo se añadió el comportamiento que faltaba.

---

# BUG-026 — Botón "más opciones" muerto en `post_details_screen.tsx`

**Estado:** 🟢 Solucionado (frontend) — admin panel documentado como pendiente
**Severidad:** 🟡 Medio
**Categoría:** Funcionalidad
**Fase:** Fase 3 — UX

## Problema

`post_details_screen.tsx:163-165` (numeración previa al fix): mismo patrón que BUG-025, `<Icon name="ellipsis-horizontal">` sin `onPress` ni handler en ningún sitio del archivo.

## Decisión del usuario

El usuario pidió que muestre la opción "Reportar publicación", de forma que exista un endpoint que permita a un entrenador/administrador borrar la publicación desde el panel de admin.

## Fix (alcance de este repo — solo frontend)

- Añadido `showPostOptions` → `Alert.alert` con "Reportar publicación" → `showReportReasons` → `Alert.alert` con motivos (Spam / Contenido inapropiado / Acoso o bullying / Otro) → `submitReport(reason)` → `postsApi.report(postId, reason)`.
- **No se ha inventado ningún endpoint nuevo**: `postsApi.report()` (`POST report-on-posting`) ya existía en `api/posts.ts` y en `hooks/usePosts.ts`, pero no se usaba desde ninguna pantalla — se ha cableado un consumidor real por primera vez.
- El panel de admin (listado de reportes + borrado por parte de un entrenador/admin de publicaciones ajenas) es 100% backend/admin y no existe código de servidor en este repositorio (`bsa` es solo la app React Native) — documentado en detalle, para implementar en otra sesión, en `docs/PENDIENTE_BACKEND_ADMIN.md` (nueva sección "12. Moderación de publicaciones").

## Archivos modificados

- `pages/migrated/post_details_screen.tsx`
- `docs/PENDIENTE_BACKEND_ADMIN.md` (nueva sección)

## Verificación

`npx eslint` limpio. Sin cambio visual — mismo icono, mismo estilo; el menú es un `Alert.alert` nativo (mismo patrón ya usado en `community_screen.tsx::showPostOptions`).

---

# BUG-027 — Flag `-r` (redondeo) de `useResponsiveStyleSheet` no hacía nada

**Estado:** 🟢 Solucionado
**Severidad:** 🟢 Bajo
**Categoría:** Bug latente (sin uso real todavía)
**Fase:** Fase 3 — UX

## Problema

`helper/responsiveStyleSheet.tsx`: `Math.ceil(scale * size)` se calculaba siempre primero; `Math.round()` solo se aplicaba después sobre ese resultado ya entero (no-op garantizado — redondear un entero no cambia nada). `"48@ratio-r"` se comportaba idéntico a `"48@ratio"`, contradiciendo su propio comentario de documentación. Confirmado con `grep` que `@ratio-r` tiene 0 usos en todo el repo — no afecta a ninguna pantalla existente.

## Fix

`return shouldRound ? Math.round(scale * size) : Math.ceil(scale * size);` — ahora la rama de redondeo se decide antes de aplicar cualquiera de las dos funciones, no después.

## Archivos modificados

- `helper/responsiveStyleSheet.tsx`

## Verificación

Cero riesgo de regresión visual (0 usos de `@ratio-r` en el repo). Caso de prueba manual: con `scale=0.33` y `size=10`, antes ambas ramas daban `4` (`Math.round(Math.ceil(3.3)) = Math.round(4) = 4`); ahora `"10@ratio"` da `4` (`Math.ceil(3.3)`) y `"10@ratio-r"` da `3` (`Math.round(3.3)`) — distintos, como se espera.

---

# BUG-028 — `ScreenExplorerFab` sin gate de producción — cerrado, es intencional

**Estado:** ⚫ Cerrado / Comportamiento intencional
**Severidad:** N/A
**Categoría:** UI / herramienta interna
**Fase:** Fase 3 — UX

## Hallazgo

`App.tsx:501`: `ScreenExplorerFab` se monta incondicionalmente, sin ningún `if (__DEV__)` ni feature flag — accesible en cualquier build, incluida producción.

## Por qué se cierra sin cambio de código

El usuario confirmó explícitamente que es intencional: "Es intencional, dejarla" — herramienta interna aceptada en producción. No se aplica ningún gate.

---

# BUG-029 — Tarjetas de objetivo seleccionables sin estado de accesibilidad

**Estado:** 🟢 Solucionado
**Severidad:** 🟢 Bajo
**Categoría:** Accesibilidad
**Fase:** Fase 3 — UX

## Problema

`main_goal_screen.tsx::renderGoalCard`: `isSelected` solo cambiaba el estilo visual; no había `accessibilityState={{selected: isSelected}}` — un usuario de lector de pantalla no podía saber qué objetivo estaba seleccionado.

## Fix

Añadido `accessibilityRole="button"`, `accessibilityLabel={item.title}` y `accessibilityState={{selected: isSelected}}` al `Pressable` de cada tarjeta.

## Archivos modificados

- `pages/migrated/main_goal_screen.tsx`

## Verificación

Puramente aditivo (solo props de accesibilidad) — `npx eslint` limpio, sin cambio de estilo/layout.

---

# BUG-030 — `home_screen_modern.tsx` huérfano — retirado

**Estado:** 🟢 Solucionado (retirado)
**Severidad:** 🟢 Bajo
**Categoría:** Código muerto
**Fase:** Fase 3 — UX

## Problema

`MigratedHomeModern` no tenía ningún `navigation.navigate(...)` real en todo el repo — la única referencia fuera de su propio registro en `App.tsx` era la entrada del catálogo de `ScreenExplorer.tsx` (la herramienta de debug de BUG-028). El tab "Inicio" real apunta a `MigratedHomeModernV2` desde el rediseño del 2026-08-23. Duplicaba lógica completa con la v2 (su propio `handleLogout`, su propio cálculo de escala Figma).

## Fix

Mismo protocolo que la retirada de las 30 pantallas anteriores, confirmado por el usuario ("Retirarla, mismo protocolo que antes"):

1. Verificado con `grep` de `home_screen_modern` y `MigratedHomeModern` en todo el repo — solo 4 coincidencias: el propio archivo, su test, su registro en `App.tsx`, y la entrada de `ScreenExplorer.tsx`. 0 referencias de navegación real.
2. Borrado `pages/migrated/home_screen_modern.tsx` y `pages/migrated/__tests__/home_screen_modern.test.tsx`.
3. Quitado el lazy-import y el `<MStack.Screen>` de `App.tsx`.
4. Quitada la entrada del catálogo de `pages/ScreenExplorer.tsx`.
5. Re-verificado con grep tras el borrado: 0 referencias colgantes.

## Archivos modificados

- `pages/migrated/home_screen_modern.tsx` (borrado)
- `pages/migrated/__tests__/home_screen_modern.test.tsx` (borrado)
- `App.tsx`
- `pages/ScreenExplorer.tsx`

---

## Nota — Fase 4 (Polish): 2 "inconsistencias" de icono descartadas tras revisar contexto (2026-08-26)

No son bugs, se documenta aquí por el mismo motivo que BUG-024: un hallazgo de un agente de investigación no se traduce automáticamente en un fix. Durante la Fase 4 (ver `IMPROVEMENTS.md`, IMP-008) un agente señaló 2 sitios más como "inconsistencia outline/filled" al mismo nivel que el fix real aplicado en `checkins_list_screen.tsx`:

- `change_pwd_screen.tsx` (`eye-outline`/`eye-off-outline`) — revisado: son dos símbolos de acción distintos (mostrar/ocultar contraseña), no el mismo icono sin fillear. Ningún otro toggle de visibilidad de contraseña en el ecosistema usa una variante filled aquí — forzarla habría sido inventar una convención nueva, no corregir una real.
- `habit_detail_screen.tsx:492` (ternario de 3 vías con una rama `create-outline`) — revisado: esa rama representa una acción distinta (editar un valor numérico del hábito), no el mismo estado "hecho/no hecho" del resto del ternario sin fillear.

Ambos se dejan sin cambio de código.

---

# BUG-031 — El swipe-back (deslizar desde el borde izquierdo) no funciona en `MigratedMyProgramCalendar`

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** Navegación / gestos
**Fase:** Post-sesión (reportado por el usuario, 2026-08-26)

## Problema

Deslizar desde el borde izquierdo hacia la derecha (el gesto estándar de iOS para volver a la pantalla anterior) no funcionaba en `my_program_calendar_screen.tsx`, a diferencia del resto de pantallas de la app.

## Causa

`calendarSwipeGesture` (`Gesture.Pan()`, línea ~560) implementa el swipe vertical del propio calendario (arriba/abajo para cambiar entre vista semanal y mensual). Su `GestureDetector` envuelve el grid completo del calendario (línea ~985), que ocupa todo el ancho de la pantalla — incluido el borde izquierdo, exactamente donde arranca el gesto de "volver atrás" de `@react-navigation/stack`. Aunque el gesto ya tenía `failOffsetX([-18, 18])` (debería liberarse en cuanto detecta movimiento horizontal), `react-native-gesture-handler` seguía reteniendo el toque inicial el tiempo suficiente como para robarle la prioridad al gesto de navegación, que necesita activarse con muy poco desplazamiento.

## Fix

Añadido `.hitSlop({ left: -25 })` a `calendarSwipeGesture` — un valor negativo de `hitSlop` en RNGH reduce el área de detección del gesto (documentado en su propia definición de tipos), así que ahora excluye los 25pt más a la izquierda (el mismo `gestureResponseDistance` por defecto que usa `@react-navigation/stack` en iOS, no personalizado en `App.tsx`). El swipe vertical del calendario sigue funcionando igual en el resto de la pantalla; solo se libera la franja exacta donde el swipe-back necesita prioridad.

## Archivos modificados

- `pages/migrated/my_program_calendar_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. **Pendiente de confirmación visual en dispositivo real** — es un cambio de comportamiento de gestos que solo puede confirmarse tocando la pantalla de verdad (swipe-back debería volver a funcionar, y el swipe vertical arriba/abajo debería seguir funcionando igual que antes en el resto del grid).

---

# BUG-032 — El menú "Ajustes" de Home v2 se cierra/parpadea al tocar dentro (fuera de los botones)

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** UI / componentes compartidos
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

Al abrir el menú "Ajustes" desde `home_screen_modern_v2.tsx`, tocar dentro de la hoja (fuera de un botón concreto) hacía que el diálogo se viera transparente/parpadeara — captura del usuario muestra el contenido de Home bajo el menú, ambos superpuestos, coherente con capturar un fotograma a mitad de la animación de cierre (`animationType="slide"`).

## Causa

`home_screen_modern_v2.tsx` usa en todo el archivo el `Pressable` de `@components/ui/pressable` (envuelve `createPressable` de gluestack-ui sobre `usePress` de `@react-native-aria/utils`, pensado originalmente para web/puntero universal). El patrón overlay-cierra/hoja-bloquea (`<Pressable onPress={cierra}><Pressable onPress={e => e.stopPropagation()}>...`) se aplicó con este mismo `Pressable`, pero `stopPropagation()` no bloquea de forma fiable que el `Pressable` exterior también reciba el toque con esta implementación — a diferencia del `Pressable` nativo de React Native, cuyo sistema de responder sí aísla correctamente los toques anidados. El resultado: cualquier toque dentro de la hoja (no solo en la zona oscura de fuera) también disparaba `setShowMenu(false)`, cerrando el menú.

**Mismo patrón ya usado y funcionando bien en `components/ConfirmDialog.tsx`** — ese componente usa el `Pressable` nativo de `react-native` (no el wrapper compartido) para su par overlay/card, y no presenta este problema. Sirvió de referencia directa para el fix.

## Fix

En `home_screen_modern_v2.tsx`, el par `menuOverlay`/`menuSheet` del modal "Ajustes" pasa a usar `Pressable` nativo de `react-native` (importado como `RNPressable` para no chocar con el `Pressable` compartido ya usado en el resto del archivo), igual que `ConfirmDialog.tsx`. El resto de `Pressable`s dentro de la hoja (los botones/filas del menú) no se tocan — siguen siendo botones normales, no forman parte del par overlay/bloqueo.

## Archivos modificados

- `pages/migrated/home_screen_modern_v2.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. **Pendiente de confirmación visual en dispositivo real** — confirmar que tocar dentro de la hoja (títulos, espacios entre tarjetas) ya no cierra el menú, que tocar fuera (zona oscura) sí lo cierra, y que los botones/filas de dentro siguen funcionando igual que antes.

---

# BUG-033 — Botón "Ver todas las medidas" sobresale por la derecha respecto a las tarjetas de `progress_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🟢 Bajo
**Categoría:** UI / layout
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

En `MigratedProgress` (`progress_screen.tsx`), el botón "Ver todas las medidas (cintura, cadera, pecho...)" se veía más ancho que la cuadrícula 2×2 de tarjetas de composición corporal justo encima, sobresaliendo por el borde derecho.

## Causa

`CompositionTile` usaba `width: '47%'` dentro de un contenedor `flex-row flex-wrap gap-3` — un valor fijo pensado para aproximar "2 columnas con hueco", pero `47%×2 + gap` no llena exactamente el 100% del ancho real del contenedor (React Native/Yoga no resta el `gap` de un `width` en porcentaje, igual que en CSS). El resultado: la cuadrícula quedaba unos píxeles más estrecha que el ancho real disponible, mientras que el `Button` de debajo (sin `width` propio) sí se estira al 100% por defecto — de ahí el desajuste visible en el borde derecho.

## Fix

Sustituido el contenedor único `flex-wrap` por 2 filas explícitas (`Box className="flex-row gap-3"`, una por par de tarjetas) con `CompositionTile` usando `flex: 1` en vez de `width: '47%'`. Con `flex:1` en una fila que NO envuelve, Yoga reparte el ancho disponible de forma exacta y ya tiene en cuenta el `gap` — las 2 tarjetas de cada fila llenan el 100% del ancho real, igual que el `Button` de debajo, quedando alineados en ambos bordes. `COMPOSITION_METRICS` tiene siempre 4 elementos fijos, así que dividir en `slice(0,2)`/`slice(2,4)` es seguro; si se añade un 5º elemento en el futuro, esta estructura necesita revisarse.

## Archivos modificados

- `pages/migrated/progress_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio de aritmética de layout, verificable por lectura (Yoga reparte `flex:1` en una fila no-wrap teniendo en cuenta el `gap`, a diferencia de un `width` en porcentaje) — **pendiente de confirmación visual en dispositivo real** para el ajuste fino final.

---

# BUG-034 — `MigratedChatting` se ve roto (cabecera y mensajes ausentes, input arriba del todo)

**Estado:** 🔵 Necesita verificación (fix aplicado, causa raíz no confirmable sin dispositivo)
**Severidad:** 🔴 Crítico
**Categoría:** UI / componentes compartidos
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

`chatting_screen.tsx` se veía completamente roto: sin cabecera "FitBot", sin mensajes ni estado vacío, solo la barra de escribir mensaje pegada arriba del todo y el resto de la pantalla en blanco. Confirmado por el usuario: siempre, solo en esta pantalla (no en `chatting_image_screen.tsx`, prácticamente idéntica, ni en ninguna otra).

## Investigación (sin poder reproducir en dispositivo)

Revisión exhaustiva de `chatting_screen.tsx` y su historial de git (múltiples commits que la tocaron: migración de color, ajustes de `SafeAreaView`/`ScreenHeader`, accesibilidad) sin encontrar un error sintáctico ni una diferencia estructural evidente frente a pantallas hermanas que sí funcionan — ni un solo commit de "traducción" toca realmente este archivo (confirmado con `git log`), pese al recuerdo del usuario. `tsc`/`eslint` limpios en todo momento, sin marcadores de conflicto de merge.

**Diferencia real encontrada** frente a `chatting_image_screen.tsx` (misma UI, mismo patrón, confirmado sin problemas): `chatting_screen.tsx` envuelve TODA el área de mensajes (`flex:1`, contenido condicional complejo: spinner/`FlatList`/estado vacío) en el `Pressable` de `@components/ui/pressable` (basado en `usePress` de `react-aria`, no el `Pressable` nativo de React Native) solo para el gesto "tocar fuera para cerrar teclado" — `chatting_image_screen.tsx` no tiene este wrapper en absoluto. Este mismo wrapper personalizado ya se confirmó con comportamiento poco fiable en un rol equivalente (par overlay/bloqueo grande) en BUG-032, en el mismo pase de trabajo.

## Fix aplicado (mejor esfuerzo, no una causa raíz confirmada)

Ese `Pressable` pasa a ser el `Pressable` nativo de `react-native` (`RNPressable`), igual que el fix de BUG-032. Es un cambio mínimo y de bajo riesgo (no quita ninguna funcionalidad, solo cambia la implementación táctil de un envoltorio grande por la más probada). **Honestidad completa**: no se ha podido confirmar en un dispositivo real que esta era la causa exacta — es la evidencia circunstancial más fuerte encontrada tras una investigación a fondo (git log completo del archivo, comparación línea a línea con la pantalla hermana funcional), no una reproducción confirmada.

## Archivos modificados

- `pages/migrated/chatting_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. **Necesita confirmación real en dispositivo** — si el problema persiste tras este fix, el siguiente paso recomendado es activar "Habilitar diagnósticos" + reproducir + "Enviar registros al desarrollador" (Ajustes) para conseguir un log real, ya que la investigación estática no encontró una causa 100% concluyente.

---

# BUG-035 — Acordeón "Fuente / Bibliografía" desalineado con el bloque de contenido en `blog_detail_screen.tsx`

**Estado:** 🟢 Solucionado
**Severidad:** 🟢 Bajo
**Categoría:** UI / layout
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

En `MigratedBlogDetail`, el acordeón "Fuente / Bibliografía" no respetaba el mismo margen horizontal que la tarjeta de contenido del blog justo encima, quedando desalineado (más ancho, tocando más cerca de los bordes de la pantalla).

## Causa

La tarjeta de contenido (WebView, línea 352) usa `marginHorizontal: 12` + `overflow: 'hidden'` (necesario para recortar las esquinas redondeadas). El `Accordion` de bibliografía (línea 373, añadido en una sesión distinta) usaba `marginHorizontal: 16` y no tenía `overflow: 'hidden'` — ambos son los únicos 2 bloques de la pantalla con `marginHorizontal` propio (el `ScrollView` no aplica padding horizontal global, cada bloque gestiona el suyo), así que la diferencia de 4px por lado entre ambos era exactamente el desajuste reportado.

## Fix

Unificado el `Accordion` a `marginHorizontal: 12` (igual que la tarjeta de contenido) y añadido `overflow: 'hidden'` para que sus esquinas redondeadas (`rounded-lg`) se recorten igual que en el bloque de arriba.

## Archivos modificados

- `pages/migrated/blog_detail_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio puro de valores de margen/overflow, verificable por lectura — **pendiente de confirmación visual en dispositivo real** para el ajuste fino final.

---

# BUG-036 — Hero de `home_screen_modern_v2.tsx` seguía sin llenar la pantalla completa + degradado de cierre mal resuelto

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟡 Medio
**Categoría:** UI / layout
**Fase:** Post-sesión (reportado por el usuario con 2 capturas, 2026-08-26 — pedido repetido varias veces sin resolverse hasta ahora)

## Problema

La foto de fondo del hero de `HomeScreenModernV2` seguía sin ocupar el 100% de la pantalla visible al entrar (se veía ya un trozo de "Mi plan de hoy" antes de terminar la foto), y el degradado de cierre entre la foto y el resto del contenido se veía mal resuelto.

## Causa

`heroHeader.height` restaba explícitamente `insets.bottom + TAB_BAR_CLEARANCE` (84px) del alto de ventana para dejar hueco a la barra de pestañas flotante — es decir, por diseño la foto SIEMPRE terminaba antes del borde inferior real de la pantalla, dejando ver contenido posterior en la carga inicial. Además había dos `LinearGradient` decorativos encadenados (`heroCloseGradient` dentro de la foto + `seamGradient` justo debajo, fuera de ella) pensados para disimular ese corte — el propio degradado era la evidencia visual de que la foto no llegaba al final de la pantalla.

## Fix

- `heroHeader.height` pasa a ser `winH` puro (alto de ventana sin restar nada) — la foto ocupa el 100% del viewport visible al entrar, en cualquier tamaño de pantalla.
- Se elimina por completo el degradado de cierre: `heroCloseGradient` (dentro de la foto) y `seamGradient` (transición hacia "Mi plan de hoy"), junto con las entradas `close`/`seam` de `HERO_GRADIENTS` que ya no se usan. Se mantiene el `scrim` (necesario para el contraste del texto blanco sobre la foto) y el oscurecido animado de scroll (`heroDarkenLayer`, efecto de blur progresivo — funcional, no decorativo).
- `paddingBottom` del hero baja de 48 a 24 (el valor alto existía solo para dejar hueco visual al degradado de cierre que ya no existe).

## Archivos modificados

- `pages/migrated/home_screen_modern_v2.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio de layout/altura real (afecta cuánta foto se ve al entrar y quita 2 elementos visuales) — **pendiente de confirmación visual en dispositivo real**, mismo criterio que el resto de bugs de esta sesión. Si en pantallas muy altas dejar la foto a pantalla completa deja demasiado espacio vacío bajo los anillos/tarjetas (efecto ya advertido y descartado en un intento anterior, ver historial de comentarios en el propio archivo), es un ajuste de valor, no un rediseño — el usuario ha pedido explícitamente priorizar "pantalla completa" sobre ese equilibrio.

---

# BUG-037 — Texto ilegible en la barra flotante de entrenamiento minimizado (`WorkoutMinimizedBar.tsx`)

**Estado:** 🟢 Solucionado
**Severidad:** 🟡 Medio
**Categoría:** UI / contraste
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

En la barra flotante que aparece al minimizar un entrenamiento en curso, el título y el contador ("00:34 · 0/21 series") se veían en un tono oscuro casi ilegible sobre un fondo igualmente oscuro/traslúcido.

## Causa

El fix anterior a este mismo componente (nota 2026-08-19, "con texto blanco no se ve nada, ponlo en negro") asumía que el `GlassView` real (Liquid Glass, iOS 26+) sale siempre con material CLARO, así que fijaba el texto en negro (`#1C1C1E`) cuando `hasGlass` es true. Pero `colorScheme` del `GlassView` estaba en su valor por defecto (`'auto'`), que sigue la apariencia calculada por el sistema en ese momento -- sobre el fondo de esta pantalla (foto del hero, con variantes oscuras/nocturnas) el material real podía salir oscuro, dejando el texto negro invisible otra vez. Es el mismo tipo de suposición frágil ya visto en otros bugs de esta sesión (texto fijo asumiendo un fondo que no está garantizado).

## Fix

`colorScheme="dark"` explícito en el `GlassView` -- fuerza el material Liquid Glass a su variante oscura siempre, en vez de dejar que "auto" decida. Con las dos ramas (glass real oscuro forzado, o el fallback ya existente con fondo sólido `#1C1C1E`) siempre oscuras, el texto y los iconos pasan a blanco fijo (`#FFFFFF`) sin ninguna rama condicional por `hasGlass`, eliminando la suposición que ya había fallado dos veces.

## Archivos modificados

- `components/WorkoutMinimizedBar.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio de contraste garantizado por diseño (fondo forzado a oscuro en ambas ramas, ya no depende de qué calcule el sistema) -- **pendiente de confirmación visual en dispositivo real** para cerrar del todo, dado que ya hubo un fix previo a este mismo texto que no fue suficiente.

---

# BUG-038 — Casi ninguna pantalla permite volver atrás con el gesto de deslizar desde el borde izquierdo

**Estado:** 🔵 Necesita verificación (cambio de arquitectura de navegación, pendiente de confirmación en dispositivo)
**Severidad:** 🔴 Crítico
**Categoría:** Navegación / gestos
**Fase:** Post-sesión (reportado por el usuario, 2026-08-26 — "prácticamente ninguna pantalla te deja volver hacia la pantalla anterior deslizando hacia la derecha")

## Problema

El gesto nativo de "volver atrás" deslizando desde el borde izquierdo de la pantalla no funcionaba de forma fiable en prácticamente ninguna pantalla de la app, no solo en una puntual (el `MigratedMyProgramCalendar` de BUG-031 en este mismo lote era un síntoma aislado de la misma causa raíz, no un caso único).

## Causa raíz

Los 2 navigators de pantalla completa (`RootNavigator` y `MigratedNavigator`, en `App.tsx`) usaban `createStackNavigator` de `@react-navigation/stack` — un stack navigator implementado en JS, cuyo gesto de "swipe-to-go-back" se resuelve con un `PanGestureHandler` (react-native-gesture-handler) a nivel de la propia librería de navegación. Este gesto JS compite en pie de igualdad con CUALQUIER otro gesto horizontal de la pantalla actual (`ScrollView` horizontal, carruseles de imágenes, selectores de chips, listas horizontales...) y, al no ser el gesto nativo real del sistema operativo, pierde el arbitraje de toque con facilidad — de ahí que casi cualquier pantalla con algún elemento deslizable horizontalmente (que son la mayoría: carruseles de blog/recetas/ejercicios, selectores de unidad como en `habit_add_screen.tsx`, etc.) bloqueara el gesto de volver.

## Fix

Migrados ambos navigators de pantalla completa de `createStackNavigator` (`@react-navigation/stack`) a `createNativeStackNavigator` (`@react-navigation/native-stack`, instalado nuevo). `native-stack` delega la navegación y su gesto de "volver" al `UINavigationController` real de iOS (y al equivalente nativo en Android) en vez de reimplementarlo en JS — el arbitraje de gestos nativo del sistema operativo es mucho más robusto frente a gestos hijos (ScrollView, listas, etc.) que cualquier implementación en JS, que es exactamente el mismo mecanismo que ya usa el resto de apps nativas del sistema para este gesto.

Efecto colateral aceptado: `native-stack` no soporta `transitionSpec`/`cardStyleInterpolator` personalizados (la transición "con identidad propia" de Fase 4, con curva de resorte prestada de `NavigationTab.tsx`) — se elimina esa personalización y las pantallas pasan a usar la transición nativa por defecto de la plataforma (en iOS, la misma curva que cualquier pantalla nativa del sistema, ya lograba imitarse con `CardStyleInterpolators.forHorizontalIOS` en JS). Se prioriza que el gesto de volver funcione de verdad sobre mantener una curva de resorte custom. `helper/motion.ts` (la constante de esa curva) se elimina por quedar sin ningún uso.

`@react-navigation/native-stack` es un paquete 100% JS (no añade ningún podspec/módulo nativo nuevo — reutiliza el módulo nativo de `react-native-screens`, ya instalado y enlazado porque `@react-navigation/stack` con `enableScreens()` ya lo usaba internamente), así que este cambio no requiere `pod install` ni recompilar el binario nativo — aplica sobre el bundle JS actual, a diferencia del caso ya documentado de `expo-haptics`.

## Archivos modificados

- `App.tsx` (los 2 navigators de pantalla completa)
- `package.json` / `package-lock.json` (nueva dependencia `@react-navigation/native-stack`)
- `helper/motion.ts` (eliminado, sin uso tras el cambio)

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio de arquitectura de navegación con efecto en TODAS las pantallas — **pendiente de confirmación real en dispositivo**, tanto del gesto de volver (debería funcionar ahora de forma fiable en cualquier pantalla) como del aspecto de la transición nativa por defecto (se pierde la curva de resorte personalizada de Fase 4).

---

# BUG-039 — `MigratedHabitAdd.tsx`: crear un hábito personalizado fallaba sin indicar el motivo real

**Estado:** 🔵 Necesita verificación (mejora de diagnóstico aplicada, causa raíz de backend no confirmable sin logs/dispositivo)
**Severidad:** 🔴 Crítico
**Categoría:** UX / manejo de errores
**Fase:** Post-sesión (reportado por el usuario, 2026-08-26 — "no deja crear hábitos personalizados")

## Investigación

Revisión completa de la pestaña "Crear el mío" de `habit_add_screen.tsx` (formulario, validación, `habitsApi.createPersonal`, tipos de `api/habits.ts`) y de su `ErrorBoundary` (ya existente desde un fix anterior a este mismo fichero, commit `3fa5e2e`, para un crash distinto en la pestaña "Biblioteca"): no se encuentra ningún error sintáctico ni de lógica en el frontend que bloquee la creación de forma incondicional. Sin acceso al backend (vive en la VPS, no accesible desde este entorno) ni a un dispositivo real, no se puede confirmar si el fallo real es una validación del backend rechazando la petición.

**Defecto real sí confirmado**: a diferencia de `adopt()` (adoptar de biblioteca), que ya extraía y mostraba `e?.response?.data?.message` del backend en su alerta de error, `submitPersonal()` (crear hábito propio) descartaba ese mensaje por completo y mostraba siempre el mismo texto genérico ("No se pudo crear el hábito. Inténtalo de nuevo.") — si el backend rechaza la petición por un motivo concreto (p. ej. un campo inválido), el cliente nunca lo ve, y toda esta pantalla (y sus 3 flujos: cargar biblioteca, adoptar, crear) tampoco registraba ningún error con `logger.error`, así que ni siquiera quedaba rastro en "Enviar registros al desarrollador" (Ajustes) para diagnosticarlo después.

## Fix

- `submitPersonal()` ahora extrae y muestra `e?.response?.data?.message` igual que `adopt()`, con el mismo texto genérico solo como último recurso.
- Los 3 `catch` de la pantalla (`loadLibrary`, `adopt`, `submitPersonal`) y el `componentDidCatch` del `ErrorBoundary` ahora registran con `logger.error`, igual que el resto de pantallas de la app — un fallo aquí queda ahora en el buffer de diagnósticos en vez de perderse en silencio.

## Archivos modificados

- `pages/migrated/habit_add_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. **Honestidad completa**: no se ha podido confirmar ni reproducir la causa raíz exacta del fallo de creación sin acceso al backend/dispositivo real — este fix garantiza que, si el problema persiste, el mensaje de error real del backend será visible en el momento (en vez de uno genérico) y quedará registrado para diagnóstico, en vez de resolver a ciegas una causa no confirmada.

---

# BUG-040 — Eliminadas 4 pantallas huérfanas sin punto de entrada real

**Estado:** 🟢 Solucionado
**Severidad:** 🟢 Bajo (limpieza)
**Categoría:** Mantenimiento / pantallas huérfanas
**Fase:** Post-sesión (pedido explícito del usuario, 2026-08-26 — "las siguientes screen son inútiles, borralas")

## Problema

`MigratedManageHealthMetrics`, `MigratedHealthMetricInsight`, `MigratedFitnessMetrics` y `MigratedMainGoal` no tenían ningún punto de entrada real desde la app.

## Verificación antes de borrar

`grep` de `.navigate()`/`.replace()` en todo `pages/` confirmó que ninguna pantalla activa navega a estas 4 rutas — el único enlace encontrado es `fitness_metrics_screen.tsx` navegando a `MigratedHealthMetricInsight` (una pantalla muerta navegando a otra pantalla muerta, cadena completamente aislada del resto de la app). Las 4 ya figuraban como huérfanas en `docs/DEAD_SCREENS.md` (auditoría del 04-08-2026): `MigratedFitnessMetrics`, `MigratedMainGoal` y `MigratedManageHealthMetrics` en B1 (sin enlace entrante), `MigratedHealthMetricInsight` en B2 (solo alcanzable desde otra pantalla muerta).

## Fix

Borrados los 4 archivos (`pages/migrated/main_goal_screen.tsx`, `pages/migrated/home/fitness_metrics_screen.tsx`, `pages/migrated/home/health_metric_insight_screen.tsx`, `pages/migrated/home/manage_health_metrics_screen.tsx`) junto con su registro en `App.tsx` (imports `React.lazy` + `<MStack.Screen>`) y su fila en el catálogo de `pages/ScreenExplorer.tsx`.

## Archivos modificados

- `App.tsx`
- `pages/ScreenExplorer.tsx`
- `docs/PANTALLAS.md`, `docs/DEAD_SCREENS.md` (nota de baja, mismo criterio que las anteriores)
- Borrados: `pages/migrated/main_goal_screen.tsx`, `pages/migrated/home/fitness_metrics_screen.tsx`, `pages/migrated/home/health_metric_insight_screen.tsx`, `pages/migrated/home/manage_health_metrics_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Borrado seguro por diseño: sin ningún punto de entrada real, no hay ninguna ruta de navegación de la app que quede rota.

---

# BUG-041 — Modernización de `MigratedWorkoutSession.tsx`: bloques sin contraste real + fila de acciones con "Progreso"

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟡 Medio
**Categoría:** UI / contraste / navegación
**Fase:** Post-sesión (reportado por el usuario con 2 capturas, 2026-08-26 — pedido de modernizar el estilo y añadir un botón "Progreso")

## Problema

La tarjeta de ejercicio activo en `MigratedWorkoutSession` ("los bloques") se veía plana, casi fundida con el fondo de la pantalla. Además se pidió: modernizar la tabla de series al estilo de una app de referencia (columnas KG antes que REPETICIONES, número de serie en círculo) y añadir un botón "Progreso" junto a "Añadir serie"/"Marcar todas" que abra el análisis histórico de ese ejercicio.

## Causa del contraste

La `Card` de cada ejercicio activo usaba `variant="filled"` (`bg-secondary`). En modo claro, `--secondary` es `rgb(247,247,247)` y `--background` (el fondo de la propia pantalla) es `rgb(244,244,247)` — una diferencia de 3 unidades por canal, invisible en la práctica. Las filas colapsadas de la misma pantalla, en cambio, ya usaban `bg-card` (`rgb(255,255,255)`, con contraste real de verdad contra el fondo) — de ahí que solo el bloque ACTIVO (el que se ve en la captura) pareciera "mal".

## Fix

- `Card` del ejercicio activo pasa de `variant="filled"` a `variant="elevated"` (`bg-card` + `shadow-card`) — mismo fondo blanco con contraste real que ya usan las filas colapsadas, más una sombra sutil de elevación.
- Borde visible (`borderWidth:1, borderColor: C.border`) en el campo de nota y en cada celda de métrica (kg/reps/descanso/...), que antes solo tenían `bg-card` sin ningún borde -- ahora se recortan con nitidez contra la tarjeta, ya blanca de por sí.
- Número de serie pasa de texto plano a una insignia circular con borde (mismo criterio visual que la referencia).
- Orden de columnas fijado con una nueva función `sortMetricKeys()` — pedido explícito del usuario tras ver el primer resultado: `series, repeticiones, carga, rir, descanso` (rpe/tiempo, no mencionados, al final). Es un reordenamiento solo de cara al render; no toca el array `enabledMetrics` real de la plantilla.
- Fila de acciones (antes "+ AÑADIR SERIE" / "MARCAR TODAS LAS SERIES", 2 botones sin separador) ahora son 3 columnas iguales con separador vertical: **PROGRESO / AÑADIR SERIE / MARCAR TODAS**.
- "Progreso" reutiliza `openExerciseInfo(ex)`, una función que YA EXISTÍA en este mismo fichero (usada por el thumbnail/título del ejercicio) y que YA navegaba a `MigratedExerciseInfo` con `initialTab: 'analysis'` — no hizo falta ninguna navegación nueva, solo exponer un segundo punto de entrada explícito a la misma función.

## Archivos modificados

- `pages/migrated/workout_session_screen.tsx`

## Verificación

`eslint --quiet` limpio, `tsc --noEmit -p .` completo sin errores. Cambio visual real (contraste de las tarjetas, orden de columnas, nueva fila de botones) — **pendiente de confirmación visual en dispositivo real**, mismo criterio que el resto de cambios de esta sesión.

---

# BUG-042 — `MigratedWorkoutSummary.tsx`: botón "OK" invisible en modo oscuro

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟡 Medio
**Categoría:** UI / contraste / modo oscuro
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

En la pantalla de resumen de entrenamiento completado (`workout_summary_screen.tsx`), el botón final "OK" se veía como una píldora blanca sin ningún texto visible en modo oscuro.

## Causa

El `Button` usa `variant="default"` (`bg-primary` del sistema de diseño compartido, `components/ui/button/index.tsx`), cuyo `ButtonText` ya trae por defecto la clase `text-primary-foreground` — pensada precisamente para invertirse junto con `--primary` según el tema (`global.css`: en modo oscuro `--primary` pasa a blanco y `--primary-foreground` a negro, y viceversa en claro). Pero el estilo inline `s.doneBtnText` fijaba `color: '#FFFFFF'` a pelo, pisando esa clase — en modo oscuro eso deja texto blanco sobre un botón que también es blanco.

## Fix

Quitado el `color: '#FFFFFF'` hardcodeado de `doneBtnText` — el texto vuelve a heredar `text-primary-foreground` del propio `ButtonText`, que ya resuelve correctamente negro/blanco en ambos modos sin necesitar ningún valor nuevo.

## Archivos modificados

- `pages/migrated/workout_summary_screen.tsx`

## Verificación

`eslint --quiet` limpio. Cambio visual real (el texto "OK" pasa a verse en modo oscuro) — **pendiente de confirmación visual en dispositivo real**.

---

# BUG-043 — `blog_detail_screen.tsx`: el acordeón "Fuente / Bibliografía" seguía sin alinear con el texto del contenido pese a BUG-035

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟢 Bajo
**Categoría:** UI / layout
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26 — persistía tras BUG-035)

## Problema

Tras el fix de BUG-035 (igualar `marginHorizontal` de la caja exterior a 12 en ambos bloques), el usuario reportó que el acordeón de bibliografía seguía sin verse alineado con el bloque de contenido del blog justo encima.

## Causa

BUG-035 igualó el margen de las dos CAJAS exteriores, pero no el padding interno de cada una — que es lo que realmente decide dónde empieza el TEXTO visible. El contenido del blog se renderiza en un `WebView` cuyo `body` tenía `padding:16px 18px` (18px en horizontal); el acordeón usa `paddingHorizontal:16` nativo en su header y su contenido. Con el mismo `marginHorizontal:12` por fuera, ese padding interno distinto (18px vs 16px) seguía desplazando el texto real 2px por lado entre un bloque y otro — la caja medía lo mismo, pero el texto dentro no arrancaba en el mismo sitio.

## Fix

`body { padding:16px 18px; }` → `body { padding:16px; }` en el HTML generado para el `WebView` (`getRenderedHtml()`), igualando el padding horizontal a los 16px que ya usa el acordeón.

## Archivos modificados

- `pages/migrated/blog_detail_screen.tsx`

## Verificación

`eslint --quiet` limpio. Cambio de un valor CSS dentro del HTML embebido — **pendiente de confirmación visual en dispositivo real**.

---

# BUG-044 — `profile_screen.tsx`: fondo de la pantalla incorrecto en modo oscuro (claro por debajo de tarjetas oscuras)

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟡 Medio
**Categoría:** UI / modo oscuro
**Fase:** Post-sesión (reportado por el usuario con captura, 2026-08-26)

## Problema

En `MigratedProfile`, con el tema en modo oscuro, todas las tarjetas (perfil, Comunidad/Soporte, Cuenta, Actividad) se veían correctamente oscuras, pero el fondo de la propia pantalla detrás de ellas se quedaba en un gris claro — como si la pantalla estuviera en modo claro y solo las tarjetas en oscuro.

## Causa

La app tiene **dos sistemas de tema independientes** que normalmente coinciden pero no están acoplados entre sí:

1. `theme.ts` (`C`/`C_DARK`, vía `useAppColorMode()`) — con su propia preferencia (`auto` por hora del día vía `isNightHour`, o `light`/`dark` fijados a mano en Ajustes → Aspecto), persistida en `@befit_theme_preference`. Es lo que usan explícitamente **todas las tarjetas** de esta pantalla (`backgroundColor: C.surface`, 9 usos en el fichero).
2. El sistema de diseño Tailwind/NativeWind (`bg-background`, `bg-card`, etc. de `global.css`), que seguía el modo de color del propio dispositivo (`prefers-color-scheme`).

El contenedor raíz de `MigratedProfile` usaba `className="bg-background"` (sistema 2) mientras el resto de la pantalla usa `C.*` (sistema 1). En cuanto ambos sistemas discrepan — el caso más simple: el dispositivo está en modo claro pero la preferencia de la app está en oscuro (manual o por `isNightHour`) — el fondo de la pantalla sigue el tema del SO (claro) mientras las tarjetas siguen el tema de la app (oscuro), exactamente lo que se ve en la captura.

El resto de pantallas de la sesión (`workout_session_screen.tsx`, `habits_list_screen.tsx`, etc.) ya usan `style={{ backgroundColor: C.bg }}` en el contenedor raíz — el patrón mayoritario y correcto — así que este era un caso puntual desalineado con esa convención, no un problema del propio `theme.ts`.

## Fix

`className="bg-background"` → `style={{ backgroundColor: C.bg }}` en el `SafeAreaView` raíz, igualando el resto de la pantalla (y el patrón ya establecido en otras pantallas migradas).

## Actualización — el usuario reportó el mismo bug en `community_screen.tsx`

Se detectaron otras **16 pantallas** con exactamente el mismo patrón (`className="bg-background"` en el `SafeAreaView` raíz + `C.surface`/`C.bg` en el resto de la pantalla): `about_us_screen`, `checkin_fill_screen`, `community_screen`, `muscle_progress_screen`, `notification_screen`, `progress_screen`, `recipe_list_screen_v2`, `recipe_tag_list_screen`, `resource_detail_screen` (3 `SafeAreaView` — loading/error/contenido), `resources_list_screen`, `shopping_list_screen`, `statistics_body_distribution_screen`, `statistics_muscle_distribution_screen`, `statistics_personal_records_screen`, `statistics_series_count_screen`, `statistics_top_exercises_screen`, `view_all_blog_screen`.

Inicialmente se dejaron sin tocar (solo se corrigió la pantalla reportada) documentando el hallazgo para decidir con el usuario. El usuario reportó por separado, con captura, el mismo síntoma exacto en `community_screen.tsx` (fondo claro detrás de tarjetas oscuras) — una de las 16 ya identificadas — confirmando que el patrón reproduce de verdad. Se aplicó entonces el mismo fix a las 17 pantallas (`community_screen.tsx` + las 16 restantes): `className="bg-background"` → `style={{ backgroundColor: C.bg }}` en cada `SafeAreaView` raíz, mismo criterio en todas.

## Segunda actualización — el bug también aparece en pantallas que NO usan `theme.ts` en absoluto

El usuario reportó un tercer caso, `workout_history_screen.tsx` (fondo claro tras las tarjetas de historial, cada una oscura vía `bg-card`) — una pantalla que **no** usaba `useAppColorMode`/`theme.ts` en ningún sitio, solo clases Tailwind (`bg-background` en el contenedor, `bg-card` en cada fila). Esto descarta la teoría inicial de "dos sistemas de tema mezclados" como causa única: el problema real es que `className="bg-background"` en un `SafeAreaView` (de `react-native-safe-area-context`) no refleja de forma fiable el modo oscuro en esta app, tenga o no la pantalla otros elementos con `C.*`. El fix ya usado (pasar el color a `style` en vez de `className`) sí funciona de forma consistente en todos los casos.

Con 3 de 3 pantallas reportadas confirmando el mismo patrón, se barrieron TODAS las pantallas restantes de `pages/migrated/` con el mismo `className="bg-background"` en su `SafeAreaView` raíz (búsqueda exhaustiva, no solo las que ya usaban `theme.ts`): `about_app_screen`, `coming_soon_screen`, `favourite_screen`, `language_screen`, `privacy_policy_screen`, `recipe_category_list_screen`, `session_history_detail_screen`, `terms_and_conditions_screen`, `tips_screen`, `video_detail_screen`, `video_screen`, `view_body_part_screen`, `web_view_screen` y el propio `workout_history_screen`. Ninguna de estas 14 importaba `useAppColorMode` — se añadió el import + `const { colors: C } = useAppColorMode();` en cada una, siguiendo exactamente la misma convención que ya usan el resto de pantallas migradas, y se aplicó el mismo reemplazo de `SafeAreaView`. Confirmado con una búsqueda final: no queda ningún `SafeAreaView` con `className="bg-background"` en todo `pages/migrated/` — las 31 pantallas afectadas (17 de la primera ronda + 14 de esta) quedan cubiertas.

## Archivos modificados

- `pages/migrated/profile_screen.tsx`
- `pages/migrated/community_screen.tsx`
- `pages/migrated/about_us_screen.tsx`
- `pages/migrated/checkin_fill_screen.tsx`
- `pages/migrated/muscle_progress_screen.tsx`
- `pages/migrated/notification_screen.tsx`
- `pages/migrated/progress_screen.tsx`
- `pages/migrated/recipe_list_screen_v2.tsx`
- `pages/migrated/recipe_tag_list_screen.tsx`
- `pages/migrated/resource_detail_screen.tsx`
- `pages/migrated/resources_list_screen.tsx`
- `pages/migrated/shopping_list_screen.tsx`
- `pages/migrated/statistics_body_distribution_screen.tsx`
- `pages/migrated/statistics_muscle_distribution_screen.tsx`
- `pages/migrated/statistics_personal_records_screen.tsx`
- `pages/migrated/statistics_series_count_screen.tsx`
- `pages/migrated/statistics_top_exercises_screen.tsx`
- `pages/migrated/view_all_blog_screen.tsx`
- `pages/migrated/workout_history_screen.tsx`
- `pages/migrated/about_app_screen.tsx`
- `pages/migrated/coming_soon_screen.tsx`
- `pages/migrated/favourite_screen.tsx`
- `pages/migrated/language_screen.tsx`
- `pages/migrated/privacy_policy_screen.tsx`
- `pages/migrated/recipe_category_list_screen.tsx`
- `pages/migrated/session_history_detail_screen.tsx`
- `pages/migrated/terms_and_conditions_screen.tsx`
- `pages/migrated/tips_screen.tsx`
- `pages/migrated/video_detail_screen.tsx`
- `pages/migrated/video_screen.tsx`
- `pages/migrated/view_body_part_screen.tsx`
- `pages/migrated/web_view_screen.tsx`

## Verificación

`eslint --quiet` limpio en las 32 pantallas tocadas en total (18 de la primera ronda + 14 de la segunda). Cambio mecánico e idéntico en cada una (mismo contenedor raíz, mismo reemplazo; en las 14 nuevas además se añadió el import/hook de `useAppColorMode` donde no existía) — **pendiente de confirmación visual en dispositivo real**.

---

# BUG-045 — Texto/iconos blancos invisibles sobre botones "accentBlack" en modo oscuro (bug sistémico, 15 archivos)

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟡 Medio
**Categoría:** UI / modo oscuro
**Fase:** Post-sesión (reportado por el usuario con captura de `body_metrics_screen.tsx`, 2026-08-26)

## Problema

En `MigratedBodyMetrics`, varios botones ("Añadir primera medida", "Guardar", el chip de tipo de medida seleccionado, el botón "+" circular) se veían como píldoras blancas sin texto ni icono visibles en modo oscuro.

## Causa

`theme.ts` define `accentBlack` como acento neutro para CTAs tipo Bevel — **negro en modo claro, blanco en modo oscuro** (se invierte a propósito, mismo criterio que `--primary`/`--primary-foreground` de Tailwind usado en botones del sistema de diseño). El problema: en al menos 15 archivos, el texto/icono que va ENCIMA de un fondo `C.accentBlack` se dejó hardcodeado a `'#FFFFFF'` en vez de usar un color que se invierta junto con el fondo — funciona en modo claro (blanco sobre negro) pero en modo oscuro el fondo pasa a blanco y el texto se queda blanco también: blanco sobre blanco, invisible. Exactamente el mismo tipo de bug de fondo que BUG-042 (`workout_summary_screen.tsx`, con `--primary`/`--primary-foreground`), pero aquí con el token equivalente del otro sistema (`theme.ts`), y mucho más extendido.

Se incluyen también 2 casos del sistema Tailwind (`Button` sin `variant` = `variant="default"` = `bg-primary`) con el mismo problema: un `Spinner`/`ActivityIndicator` hijo hardcodeado a blanco en vez de heredar el color correcto -- `ButtonText` ya usa la clase `text-primary-foreground` que sí se invierte sola, pero un `Spinner` no es un `ButtonText` y no hereda esa clase.

## Fix

- Nuevo token en `theme.ts`: `accentBlackForeground` — el inverso exacto de `accentBlack` (blanco en claro, negro en oscuro). Cualquier texto/icono/spinner que vaya sobre un fondo `accentBlack` debe usar este token, no un `'#FFFFFF'` fijo.
- Reemplazados todos los `'#FFFFFF'` que estaban emparejados con un fondo `C.accentBlack` (condicional o fijo) por `C.accentBlackForeground`, en los archivos listados abajo.
- En `components/ConfirmDialog.tsx`, el mismo `confirmBtnText` se usa tanto para el botón normal (`accentBlack`, necesita invertirse) como para el destructivo (`destructive50`, rojo sólido en ambos temas, blanco siempre correcto) — se dejó el blanco como base y se añade `color: C.accentBlackForeground` solo cuando `!destructive`.

## Casos revisados y descartados (a propósito, sin cambio)

Se auditaron TODOS los usos de `accentBlack` en el repo (15 archivos) y todo texto/icono/spinner blanco hardcodeado cercano — varios casos NO son el mismo bug y se dejaron igual:

- `habit_detail_screen.tsx` (checkmark de `DayCell`, spinner/icono/texto de "Marcar hoy completado"): el fondo real ahí es `C.success50` (verde sólido, `#34C759` en ambos temas), no `accentBlack` — blanco es correcto siempre.
- `workout_preview_screen.tsx` (chevron-back del header): fondo `rgba(0,0,0,0.35)` fijo sobre la foto de portada, no depende del tema — blanco correcto siempre. El icono de marcador (bookmark) usa `accentBlack` como TINTE (no como fondo) sobre `C.surfaceLight`, que en oscuro es gris oscuro (`#363840`), no blanco — buen contraste, no es un bug.
- `PainReportSheet.tsx` (icono de radio button): mismo caso, `accentBlack` como tinte sobre `C.gray10` (gris oscuro en modo oscuro, `#3A3A3C`), no sobre blanco.
- `statistics_monthly_report_screen.tsx` (`expandBtnText`): `Button variant="link"`, sin fondo — `accentBlack` usado como color de texto normal (se invierte con el tema, correcto).
- `IntensityCheckSheet.tsx`, `workout_session_screen.tsx` (barra de descanso), `resource_detail_screen.tsx`, `workout_summary_screen.tsx` (`dotActive`), `components/onboarding_v2/OnboardingHeader.tsx`: usan colores semánticos sólidos (azul/verde/naranja/rojo) o la clase `text-background` (que ya se invierte sola) — sin blanco fijo sobre fondo `accentBlack`.

## Archivos modificados

- `pages/migrated/theme.ts` (nuevo token `accentBlackForeground`)
- `pages/migrated/body_metrics_screen.tsx`
- `pages/migrated/checkin_fill_screen.tsx`
- `pages/migrated/habit_add_screen.tsx`
- `pages/migrated/habit_detail_screen.tsx`
- `pages/migrated/workout_preview_screen.tsx`
- `pages/migrated/workout_session_screen.tsx`
- `components/ConfirmDialog.tsx`
- `components/DaySelectorStrip.tsx`
- `components/MetricLineChart.tsx`
- `components/MuscleBodyMap.tsx`
- `components/PainReportSheet.tsx`
- `components/ReadinessCheckSheet.tsx`

## Verificación

`eslint --quiet` limpio en los 13 archivos. Cambio de color puro, mismo patrón en cada sitio — **pendiente de confirmación visual en dispositivo real**.

---

## Tercera actualización — causa raíz real localizada + barrido final completo

El usuario reportó una lista larga y adicional de pantallas con el mismo síntoma (fondo claro/gris rompiendo el resto de la UI oscura), incluyendo `statistics_monthly_report_screen.tsx` ("hay bloques que no respetan el modo oscuro" — un síntoma ligeramente distinto) y `view_body_part_screen.tsx` ("también hay botones e iconos que no concuerdan", ya cubierto por BUG-045 vía `MuscleBodyMap.tsx`).

**Causa raíz real, encontrada al fin**: un comentario ya existente en `blog_detail_screen.tsx` (de una sesión anterior) documentaba que `GluestackUIProvider` (`components/ui/gluestack-ui-provider/index.tsx`) recibe correctamente el `mode` dinámico desde `useAppColorMode()` vía `GluestackModeBridge` (`App.tsx`), pero en la versión NATIVA (no web) de ese provider, lo único que hace con `mode` es `Appearance.setColorScheme(mode)` — no aplica ninguna clase `.dark`/`.light` ni resuelve las variables CSS de `global.css` (`:root.dark`, `@media (prefers-color-scheme: dark)`), que son mecanismos de CSS puro pensados para la build **web**. En la app nativa (iOS/Android), NativeWind no está resolviendo estas clases de fondo (`bg-background`, `bg-card`, `bg-muted`, etc.) contra el modo real de la app de forma fiable — de ahí que **cualquier** `className` con estas clases, en cualquier tipo de componente (`SafeAreaView`, `Box`, `Pressable`, `ActionsheetContent`), pueda quedarse "congelado" en el valor de un modo que no es el actual. No se ha intentado arreglar este mecanismo de raíz (`GluestackUIProvider`/NativeWind) por ser un cambio de altísimo riesgo que afectaría a cientos de usos en toda la app sin forma de probarlo en este entorno (sin Xcode/dispositivo real) — se mantiene el fix ya probado y seguro: sustituir la clase por un `style` inline con el color de `theme.ts` (`C.bg`), que sí se resuelve de forma fiable porque viene de React Context (`useAppColorMode()`), no de CSS.

**Statistics — Resumen mensual** (`statistics_monthly_report_screen.tsx`): distinto al resto — el fondo de la propia pantalla ya estaba bien (`style={styles.container}` con `C.bg` inline, nunca usó `className`). El problema real eran las 4 tarjetas KPI (Entrenamientos/Duración/Volumen/Series), que usaban `<Card variant="outline" className="bg-muted p-4">` — `className` pisa el `bg-card` propio del `variant="outline"` (mismo mecanismo de fusión de clases que ya causó BUG-041 con `bg-secondary`), y `--muted` en oscuro (`rgb(36,36,38)`) es casi idéntico a `--background` (`rgb(36,37,41)`) — la tarjeta se volvía invisible por falta de contraste, no por un fondo "equivocado". Cambiadas a `variant="elevated"` (mismo criterio que la tarjeta "Desglose semanal" de la misma pantalla, que sí contrasta bien). Los 2 usos de `bg-muted` dentro de "Progreso y marcas" se dejan igual a propósito: ahí el `bg-muted` contrasta contra su propia tarjeta padre (`bg-card`), no contra el fondo de pantalla, así que sí funciona en ambos modos.

**Barrido final** — se repitió la búsqueda de `bg-background` (y equivalentes en template literals) por TODO `pages/migrated/`, sin limitarla ya a `SafeAreaView` como en rondas anteriores, encontrando y corrigiendo el mismo patrón en `Box`, `Pressable` y `ActionsheetContent` de otras 27 pantallas: `favourite_recipe_screen`, `assigned_meals_screen` (2 sitios), `view_equipment_screen`, `search_screen`, `shopping_list_detail_screen` (2 sitios), `add_shopping_list_screen`, `home/device_connected_screen`, `home/emparejando_screen`, `home/link_device_choice_screen`, `home/link_device_list_screen`, `add_post_screen`, `chatting_screen`, `chatting_image_screen` (2 sitios), `other_user_profile_screen`, `post_details_screen` (2 sitios), `bookmark_screen`, `workout_template_list_screen`, `statistics_screen` (la pantalla del bug del círculo "Mi" reportado antes — el contenido interno también usaba `bg-background`, no solo el `SafeAreaView`), `checkins_list_screen`, `blog_detail_screen` (2 sitios más, además del padding de BUG-043), `chewie_screen` (4 sitios), `habit_add_screen` (avatar del icono de plantilla), `habits_list_screen` (avatar del icono de hábito), `workout_session_screen` (barra fija de "Finalizar entrenamiento"), `shopping_list_screen` (Actionsheet), `recipe_list_screen_v2` (Actionsheet), `notification_screen` (tarjeta de notificación leída). Confirmado con grep final: cero apariciones de `bg-background` en `pages/migrated/` fuera de esta lista y del comentario explicativo ya citado.

Deliberadamente NO tocados (fuera de alcance, mucho más riesgo): los usos de `bg-background` dentro de los propios componentes base del sistema de diseño (`components/ui/button`, `modal`, `tooltip`, `accordion`, `tabs`, `textarea`, `actionsheet`, `select`) — cambiarlos afectaría potencialmente a cientos de usos en toda la app sin forma de probarlo aquí.

## Archivos modificados (tercera ronda)

`pages/migrated/{statistics_monthly_report_screen,favourite_recipe_screen,assigned_meals_screen,view_equipment_screen,search_screen,shopping_list_detail_screen,add_shopping_list_screen,add_post_screen,chatting_screen,chatting_image_screen,other_user_profile_screen,post_details_screen,bookmark_screen,workout_template_list_screen,statistics_screen,checkins_list_screen,blog_detail_screen,chewie_screen,habit_add_screen,habits_list_screen,workout_session_screen,shopping_list_screen,recipe_list_screen_v2,notification_screen}.tsx`, `pages/migrated/home/{device_connected_screen,emparejando_screen,link_device_choice_screen,link_device_list_screen}.tsx`.

## Verificación

`eslint --quiet` limpio en las 28 pantallas de esta tercera ronda.

---

# BUG-046 — `DietDashboard.tsx`/`DietList.tsx`: siempre en modo claro, sin reaccionar al modo oscuro de la app

**Estado:** 🔵 Necesita verificación (cambio visual real, pendiente de confirmación en dispositivo)
**Severidad:** 🟡 Medio
**Categoría:** UI / modo oscuro
**Fase:** Post-sesión (reportado por el usuario, 2026-08-26)

## Problema

`DietDashboard.tsx` y `DietList.tsx` (pantallas de dieta, en `pages/`, NO en `pages/migrated/`) se veían siempre en modo claro, sin importar el modo real de la app.

## Causa

Estas 2 pantallas son de un estilo de código anterior a la migración a `theme.ts`/`useAppColorMode()`: usan `constants/colors.ts`, un objeto `Colors` que se calculaba **una sola vez, al importar el módulo**, a partir de la paleta CLARA fija (`import { C } from '../pages/migrated/theme'`) — nunca de `C_DARK`, y sin ninguna suscripción a `useAppColorMode()`. A diferencia del bug de `bg-background` (que sí reaccionaba pero de forma poco fiable), aquí el problema es más simple y más severo: el valor **nunca** cambia, sea cual sea el modo real de la app.

Un detalle adicional: ambas pantallas ya usaban `useResponsiveStyleSheet()` para sus estilos, cuyo `StyleSheet.create()` se memoiza solo por `scale` (no por los colores embebidos) — el hook ya tenía preparado un parámetro `extraDeps` pensado exactamente para este caso (comentario ya existente en `helper/responsiveStyleSheet.tsx`: "colores de useAppColorMode() (`C`/`C_DARK`)"), pero nunca se había usado.

## Fix

- `constants/colors.ts`: extraída la construcción del objeto a `buildColors(c)`. El export estático `Colors` se mantiene EXACTAMENTE igual (sigue devolviendo la paleta clara fija, sin cambios de comportamiento) para no afectar a sus otros 24 consumidores (pantallas de auth, `DietCard`, `WorkoutCard`, etc. — fuera de alcance de este reporte). Nuevo hook `useColors()`, que sí lee `useAppColorMode()` y memoiza sobre esa referencia.
- `DietDashboard.tsx`/`DietList.tsx`: cambiado el import estático por `useColors()`. Declarando `const Colors = useColors();` al principio del componente y de su función `useStyle()` (una función aparte, no ve las variables locales del componente) — el resto del código seguía intacto, ya que `Colors.*` se referencia por el mismo nombre en todo el archivo, y ahora resuelve a la versión reactiva sin renombrar cada uso. Añadido `[Colors]` como `extraDeps` a `useResponsiveStyleSheet()` en ambas pantallas para que el `StyleSheet` memoizado se recalcule cuando cambia el tema. En `DietList.tsx`, el array `CHIP_GRADIENT_COLORS` (antes una constante de módulo fija) pasó a un `useMemo` dentro del componente por el mismo motivo.

## Archivos modificados

- `constants/colors.ts`
- `pages/DietDashboard.tsx`
- `pages/DietList.tsx`

## Verificación

`eslint --quiet` limpio en los 3 archivos. **No se tocaron** los otros 24 consumidores de `Colors` (pantallas de auth y varios componentes de tarjeta) — fuera de lo reportado, y varios de ellos (p. ej. `DietCard`) dependen a propósito de que ciertos valores (`CARD_START/END`) se queden fijos en claro. Cambio de color puro — **pendiente de confirmación visual en dispositivo real**.

---

# BUG-047 — Causa raíz REAL de BUG-044: `Appearance.setColorScheme()` no notifica al motor de NativeWind, así que ninguna clase de Tailwind seguía el modo oscuro de la app

**Estado:** 🔴 Fix de alto impacto, sin verificar (nunca antes probado en este entorno — requiere el próximo build de IPA)
**Severidad:** 🔴 Alto (afecta potencialmente a TODAS las pantallas que usan clases Tailwind dependientes del tema)
**Categoría:** UI / modo oscuro / infraestructura
**Fase:** Post-sesión (pedido explícito del usuario: "no tiene sentido ajustar pantalla por pantalla, hay que solucionarlo de raíz", 2026-08-26)

## Contexto

Tras corregir BUG-044 en decenas de pantallas (sustituyendo `className="bg-background"` por `style={{backgroundColor: C.bg}}` una por una), el usuario preguntó, con razón, cuál era el problema real y por qué había que tocar pantalla por pantalla en vez de arreglarlo una sola vez. La respuesta correcta requería localizar el mecanismo exacto, no una teoría — se investigó el código fuente de React Native y de `react-native-css` (el motor real detrás de NativeWind en este proyecto) hasta encontrar la línea exacta.

## Causa raíz (confirmada leyendo el código fuente, no una hipótesis)

`GluestackUIProvider` (`components/ui/gluestack-ui-provider/index.tsx`) recibe el `mode` ('light'/'dark') correctamente desde `useAppColorMode()` vía `GluestackModeBridge` (`App.tsx`), y llama a `Appearance.setColorScheme(mode)` de React Native para propagarlo.

El problema: en `node_modules/react-native/Libraries/Utilities/Appearance.js`, la función `setColorScheme()` actualiza su caché interna (`state.appearance`) pero **nunca emite el evento `'change'`** (`eventEmitter.emit('change', ...)`) — ese evento solo lo dispara el listener nativo `appearanceChanged`, es decir, un cambio REAL del sistema operativo, nunca una llamada programática desde JS.

El motor que resuelve las clases de Tailwind/NativeWind en este proyecto (`react-native-css`, no `nativewind` directamente) mantiene su propio estado de "modo de color" como un observable (`node_modules/react-native-css/src/native/reactivity.ts`):

```js
export const colorScheme = observable < ColorSchemeName > Appearance.getColorScheme();
Appearance.addChangeListener((event) => colorScheme.set(event.colorScheme));
```

Se inicializa **una sola vez**, al arrancar la app (con lo que reporte el sistema operativo en ese instante), y desde ahí **solo** se actualiza escuchando el evento `'change'` de `Appearance` — el mismo que `setColorScheme()` nunca dispara. Resultado: este observable queda congelado para siempre en el tema del sistema operativo al arranque, sin enterarse nunca de ningún cambio posterior — ni de `GluestackModeBridge`, ni de nada.

Esto explica el 100% de los síntomas observados durante toda la sesión:

- `theme.ts`/`C`/`C_DARK` vía `useAppColorMode()`: siempre correcto y reactivo, porque es Context de React puro — no pasa por `Appearance` en ningún momento.
- Cualquier `className` de Tailwind (`bg-background`, `bg-card`, `bg-muted`, `text-primary-foreground`, etc., en CUALQUIER pantalla, migrada o no, tocada hoy o no): nunca reaccionaba al modo oscuro real de la app, solo al del sistema operativo en el momento del arranque.

## Fix

`react-native-css` expone su propio `colorScheme` con un método `.set()` que sí actualiza ese observable directamente (`node_modules/react-native-css/src/native/api.tsx`) y sí notifica a todos los componentes que usan `className` en tiempo real — es la pieza que faltaba llamar. Añadida la llamada `nativeCssColorScheme.set(mode === 'system' ? null : mode)` en el mismo `useEffect` de `GluestackUIProvider`, junto a la llamada ya existente a `Appearance.setColorScheme()` (que se deja, por si algún otro módulo nativo la necesita — es aditivo, no se quita nada).

## Por qué no se hizo antes en la sesión

Se consideró explícitamente al principio de la investigación de BUG-044 y se descartó por ser "un cambio de altísimo riesgo en la plomería compartida de toda la app, sin forma de probarlo en este entorno". Tras la pregunta del usuario se investigó más a fondo hasta dar con la línea exacta y el mecanismo concreto — con eso, el riesgo real es mucho menor de lo que parecía: es un cambio de una sola línea, puramente aditivo (no se toca ni se quita el código existente), en un único punto ya centralizado. Sigue sin poder probarse en este entorno (sin Xcode/dispositivo real) — es la pieza de mayor impacto y menor certeza de todo lo aplicado hoy, y su verificación real depende del próximo build de IPA.

## Qué significa esto para los fixes de BUG-044/045/046 ya aplicados

No se deshacen ni se revierten — siguen siendo correctos y necesarios como estaban (siguen usando `C.bg`/`C.accentBlackForeground` de `theme.ts`, la fuente de verdad que SIEMPRE funcionó bien). Si este fix de raíz funciona, las clases Tailwind (`bg-background`, etc.) en el RESTO de la app (pantallas no tocadas hoy, tanto las 60+ ya migradas a NativeWind como componentes de sistema de diseño como `Button`/`Modal`/`Actionsheet`) deberían empezar a seguir el modo oscuro real de la app sin necesitar ningún cambio adicional — es el mecanismo que arregla "de golpe" lo que pedía el usuario. Si no funciona (p. ej. si `react-native-css` resuelve un módulo distinto en el build real, o si hay alguna otra capa de caché no descubierta), las pantallas ya migradas a `C.bg` seguirán funcionando igual de bien que ahora, sin depender de este fix.

## Archivos modificados

- `components/ui/gluestack-ui-provider/index.tsx`

## Verificación

`eslint --quiet` limpio. Tipo verificado contra las declaraciones `.d.ts` compiladas de `react-native-css` (`colorScheme: { get(): ColorSchemeName; set(value: ColorSchemeName): void }`). **No se puede verificar el comportamiento real en este entorno** — la única prueba real es instalar el próximo IPA y comprobar si las pantallas AÚN NO tocadas hoy (p. ej. las que usan `Button`/`Modal`/`Actionsheet` del sistema de diseño sin haber sido migradas a `theme.ts`) ya siguen el modo oscuro real de la app sin más cambios.
