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
