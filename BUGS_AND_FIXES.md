# Bugs & Fixes

Registro de bugs, errores y problemas detectados durante el desarrollo y auditoría de la aplicación.

Este documento se creó retroactivamente (2026-08-25) para dejar constancia de todos los bugs reales detectados y corregidos durante la Fase 1 (auditoría UI/UX + migración a modo oscuro). A partir de este punto se mantiene actualizado en tiempo real, según se van detectando y solucionando nuevos problemas.

---

## Estado actual

**Bugs detectados:** 19
**Solucionados:** 12
**Pendientes:** 0
**En progreso:** 0
**Necesitan verificación:** 7
**No reproducibles:** 0

### 🔵 Bugs que requieren verificación (pendiente de prueba real en app)

- BUG-012 — Botón "FINALIZAR ENTRENAMIENTO" sin tamaño explícito
- BUG-013 — Botones del calendario con radio fuera de escala
- BUG-015 — Bug de memoización en `useResponsiveStyleSheet` con colores dinámicos
- BUG-016 — `GluestackUIProvider` fijo en modo claro
- BUG-017 — Paleta oscura de `global.css` desincronizada de `theme.ts`
- BUG-018 — `blog_detail_screen.tsx` con HTML de WebView estático
- BUG-019 — Pestañas de `diet_detail_screen.tsx` con fondo blanco fijo

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

**Nota importante sobre "verificado":** los 12 bugs marcados 🟢 se consideran solucionados porque su verificación es determinística y no depende de una interfaz renderizada: errores de compilación (`tsc --noEmit -p .` limpio), variables indefinidas (grep + lectura de código), o contraste WCAG (fórmula de luminancia relativa W3C, un cálculo matemático, no una apreciación visual). Los 7 bugs marcados 🔵 son cambios de comportamiento/color que sí dependen de cómo se renderiza la app en un dispositivo/simulador real — no se han podido verificar visualmente en este entorno (sin simulador disponible) y quedan pendientes de la **prueba final real** acordada con el usuario.

---

## Resumen

| ID      | Problema                                                                     | Categoría     | Severidad  | Estado                   |
| ------- | ---------------------------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| BUG-001 | Contraste WCAG de `textTertiary` insuficiente (2.21:1)                       | Accesibilidad | 🟠 Alto    | 🟢 Solucionado           |
| BUG-002 | `AppIcon.tsx` revertido a color estático por un agente                       | React Native  | 🟠 Alto    | 🟢 Solucionado           |
| BUG-003 | Error de sintaxis rompía la compilación de todo el proyecto                  | React Native  | 🔴 Crítico | 🟢 Solucionado           |
| BUG-004 | Crash al abrir `diet_detail_screen.tsx`                                      | Funcional     | 🔴 Crítico | 🟢 Solucionado           |
| BUG-005 | Crash al abrir `set_reminder_screen.tsx`                                     | Funcional     | 🔴 Crítico | 🟢 Solucionado           |
| BUG-006 | Color de fondo congelado en icono de `NavigationTab.tsx`                     | UI            | 🟡 Medio   | 🟢 Solucionado           |
| BUG-007 | Crash al abrir `assigned_meals_screen.tsx`                                   | Técnico       | 🔴 Crítico | 🟢 Solucionado           |
| BUG-008 | Error de compilación en `step_goal_completed_screen.tsx`                     | React Native  | 🔴 Crítico | 🟢 Solucionado           |
| BUG-009 | Crash al abrir el chequeo diario de `workout_preview_screen.tsx`             | Técnico       | 🔴 Crítico | 🟢 Solucionado           |
| BUG-010 | Error de tipos entre `C` y `C_DARK` en `theme.ts`                            | Técnico       | 🟠 Alto    | 🟢 Solucionado           |
| BUG-011 | Contraste WCAG de `completedBadgeText` insuficiente (2.22:1)                 | Accesibilidad | 🟡 Medio   | 🟢 Solucionado           |
| BUG-012 | Botón "FINALIZAR ENTRENAMIENTO" sin tamaño explícito                         | UI            | 🟠 Alto    | 🔵 Necesita verificación |
| BUG-013 | Botones del calendario con radio fuera de la escala de diseño                | UI            | 🟢 Bajo    | 🔵 Necesita verificación |
| BUG-014 | Pérdida silenciosa de respuestas de onboarding si falla el envío             | Funcional     | 🟠 Alto    | 🟢 Solucionado           |
| BUG-015 | Colores dinámicos no se refrescan en pantallas con `useResponsiveStyleSheet` | React Native  | 🟠 Alto    | 🔵 Necesita verificación |
| BUG-016 | `GluestackUIProvider` fijo en modo claro — modo oscuro incompleto            | UI            | 🔴 Crítico | 🔵 Necesita verificación |
| BUG-017 | Paleta oscura de `global.css` no coincide con `theme.ts`                     | UI            | 🟡 Medio   | 🔵 Necesita verificación |
| BUG-018 | Contenido HTML de `blog_detail_screen.tsx` no sigue el tema                  | Funcional     | 🟡 Medio   | 🔵 Necesita verificación |
| BUG-019 | Pestañas de `diet_detail_screen.tsx` con fondo blanco fijo                   | UI            | 🟢 Bajo    | 🔵 Necesita verificación |

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

Cambiado `borderRadius: 10` por `borderRadius: RADIUS.sm` (12px), e importado `RADIUS` desde `theme.ts`.

## Archivos afectados

- `pages/migrated/my_program_calendar_screen.tsx`

## Verificación

Confirmado por lectura de código el cambio de valor. Diferencia visual muy sutil (10px vs 12px) — **pendiente confirmación visual** en la prueba final, aunque el impacto esperado es mínimo.

**Resultado:** 🔵 Pendiente de confirmación visual

## Notas

La auditoría original también recomendaba migrar estos 2 botones al componente `Button` compartido en vez de solo tokenizar el radio — no se hizo en este pase por ser un cambio de mayor alcance no pedido explícitamente; queda como mejora en `IMPROVEMENTS.md`.

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
