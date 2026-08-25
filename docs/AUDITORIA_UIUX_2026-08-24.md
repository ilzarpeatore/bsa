# Auditoría UI/UX — BeFit (React Native + Expo)

**Fecha:** 2026-08-24 · **Alcance:** `pages/migrated/**/*.tsx` (116 archivos), `pages/migrated/theme.ts`, `components/ui/*` (Gluestack), `components/*.tsx`, `global.css`, `App.tsx`.

**Metodología** (para que ninguna cifra de este documento se tome como estimación): cada número viene de `grep`/lectura directa del repo, no de percepción. Los porcentajes de adopción de tokens/componentes son sobre el total real de 116 pantallas. El contraste WCAG está calculado sobre los valores hex exactos de `theme.ts` (fórmula de luminancia relativa W3C), no aproximado a ojo. Además de auditar el sistema completo por grep, se leyeron a fondo 7 pantallas representativas (Home v2, onboarding v2, sesión de entrenamiento, plan diario, buscador de recetas, calendario, y el par EditProfile/ChangePwd) para la parte de jerarquía visual y flujo, que no se puede extraer solo con grep.

Este documento no repite el trabajo de `docs/Paleta_Color_BeFit.md` (ficha de color ya existente y correcta) ni cuestiona decisiones de producto ya cerradas (theme claro, texto casi negro, acento monocromo — ver `docs/Encargo3_Auditoria_Colores.md`). Donde esas decisiones tienen un problema real (contraste, duplicación de nombres), se señala; donde son solo gusto estético, no se toca.

---

## 1. Objetivo

Brief completo en `docs/AUDITORIA_UIUX_BRIEF.md`. Resumen del criterio aplicado: cada hallazgo de este documento está anclado a un archivo:línea real y, cuando aplica, a un número (contraste, tamaño, conteo de adopción) — no hay recomendaciones por gusto personal.

**Veredicto de una línea, para no enterrarlo en la sección 7**: **no existe un Design System real**. Existe un archivo de tokens bien intencionado (`theme.ts`: `RADIUS`, `SPACING`, `TYPE`, `SHADOW`) que prácticamente nadie importa, y 116 pantallas que reinventan sus propios valores de espaciado, radio y tipografía cada vez. Es una colección de pantallas con una paleta de color compartida — el color es, de hecho, el único eje del sistema que sí se sigue de forma consistente.

---

## 2. Auditoría visual completa

### 2.1 Color

**Lo que ya funciona bien** (no tocar): la decisión de fondo gris `#EBEBF0` + superficies blancas para dar jerarquía por contraste de superficie está bien ejecutada y es consistente. Los 6 tokens semánticos con nombre (`statusSuccess/Warning/Danger/Info/Rest/Cycle`) son un patrón correcto y con buena cobertura conceptual (éxito/alerta/atención/info/descanso/ciclo).

**🔴 Problema — 5 nombres de token para el mismo color exacto.**
`theme.ts:24-30,71`: `primary`, `brand50`, `brand60`, `gray70`, `gray80` valen los 5 literalmente `#E5E5EA`. **Por qué**: cuando alguien necesita "el gris de acento" no tiene ninguna señal de cuál de los 5 nombres usar, así que la elección es arbitraria pantalla a pantalla — es exactamente el mecanismo por el que aparecen inconsistencias de nomenclatura de color más adelante en este informe (`plan_screen.tsx` usa la generación vieja de nombres, `edit_profile_screen.tsx` usa la nueva, ambas apuntan a valores que hoy coinciden por casualidad de la migración, no por diseño). **Recomendación**: un solo nombre (`accent` o `brandAccent`), y dejar los otros 4 como alias de compatibilidad marcados `@deprecated` en un comentario, no como opciones activas. **Implementación**: no rompe nada (mismo valor), es un refactor de nombres puro.

**🔴 Problema — un token llamado `white` vale `#000000`.**
`theme.ts:16,67`: `white: "#000000"` y `textWhite: "#000000"`. **Por qué**: esto no es un detalle cosmético — es una trampa activa para cualquiera (humano o IA) que lea el código y asuma que `C.white` es blanco, y lo use donde de verdad hace falta blanco (texto sobre un fondo oscuro, p. ej.). Ya está en uso real como texto en `plan_screen.tsx:782-807` con ese nombre, arrastrado de la migración del theme oscuro. **Recomendación**: renombrar a `textPrimary` (que ya existe con el mismo valor, `theme.ts:68`) en los ~30+ usos reales y eliminar `white`/`textWhite` del objeto. **Implementación**: `grep -rl "C\.white\b" pages/migrated | xargs sed -i` con revisión manual de los casos donde de verdad se quisiera blanco literal (poquísimos, dado que `white` nunca es blanco hoy).

**🟠 Problema — rampa `blue30`/`blue80` invertida entre claro y oscuro.**
`theme.ts:63-64` (claro): `blue30: "#66B2FF"` (claro), `blue80: "#003166"` (oscuro). `theme.ts:152-153` (oscuro): `blue80: "#66B2FF"`, `blue30: "#003166"` — los valores están intercambiados respecto al nombre. Hoy no causa ningún bug visible porque **0 archivos usan `blue30` o `blue80`** (confirmado por grep) — es una trampa dormida, no un incidente activo. **Recomendación**: corregir el orden antes de que alguien los use. 🟡 en vez de 🔴 precisamente porque está sin usar.

**🔴 Problema — contraste WCAG real, calculado sobre los hex de `theme.ts` (modo claro):**

| Par                                              | Contraste  | WCAG AA (texto normal ≥4.5:1)                                   |
| ------------------------------------------------ | ---------- | --------------------------------------------------------------- |
| `textTertiary` (#AEAEB2) / `surface` (#FFFFFF)   | **2.21:1** | ❌ Falla                                                        |
| `textTertiary` / `bg` (#EBEBF0)                  | **1.86:1** | ❌ Falla                                                        |
| `warning` (#FF9500) como texto/icono / `surface` | **2.20:1** | ❌ Falla                                                        |
| `success` (#34C759) como texto/icono / `surface` | **2.22:1** | ❌ Falla                                                        |
| `gray40` (#8A8A90) / `surface`                   | 3.43:1     | ⚠️ Solo válido para texto grande/iconos (≥3:1), no texto normal |
| `destructive` (#FF3B30) / `surface`              | 3.55:1     | ⚠️ Solo texto grande/iconos                                     |
| `blue` (#007AFF) / `surface`                     | 4.02:1     | ⚠️ Solo texto grande/iconos                                     |
| `textSecondary` (#6B6B70) / `bg`                 | 4.46:1     | ⚠️ Falla por 0.04, límite real                                  |
| `textSecondary` / `surface`                      | 5.30:1     | ✅ OK                                                           |

Dato irónico y revelador: la misma comparación en **modo oscuro** (`textTertiary` #8A8A8E sobre `surface` #1C1C1E) da **4.95:1 — sí cumple AA**. El modo oscuro, que casi nadie ve (sección 9), tiene _mejor_ contraste que el modo claro, que ve el 100% de los usuarios reales hoy. Esto confirma que la paleta se ajustó a ojo, no con una herramienta de contraste.

**Dónde impacta de verdad** (no es un problema teórico): `textTertiary` se usa en `habit_detail_screen.tsx:515,575` (placeholder y etiqueta de día de la semana a `fontSize:11`) y `my_program_calendar_screen.tsx:1241`. `success`/`warning` como color de texto/icono se usan en 5 archivos, incluyendo `my_program_calendar_screen.tsx:1302` (`completedBadgeText`, `fontSize:11.5`) y los iconos de tipo de notificación en `notification_screen.tsx:29,31`. Texto pequeño + contraste 2.2:1 es exactamente la combinación que WCAG existe para prevenir.

**Recomendación**: oscurecer `textTertiary` a algo con ≥4.5:1 sobre blanco (p. ej. `#8E8E93`, el gray de iOS para "tertiary label", da ~3.9:1 — habría que subir un poco más, `#7A7A80` da ~4.6:1), y no usar `success`/`warning` "puros" como color de texto — usar sus variantes `60` (más oscuras: `success60 #248A3D` da contraste ~4.9:1, `warning60 #C93400` da ~5.6:1) para cualquier uso como texto/icono pequeño, reservando el tono base para fondos/badges donde el contraste lo pone el texto oscuro encima, no el propio color.

**🟡 Problema — dos sistemas de color paralelos, uno casi sin usar.**
`global.css` define tokens de Gluestack/NativeWind (`--primary`, `--background`...) independientes de `theme.ts`. Confirmado en `docs/Encargo3_Auditoria_Colores.md:74-80`: es una decisión ya documentada, no un descubrimiento nuevo, pero sigue siendo deuda activa — cualquier componente de `components/ui/*` que use clases de NativeWind (`bg-primary`, etc.) en vez de recibir color por prop, se desincroniza del theme real la primera vez que alguien cambie `theme.ts` sin tocar `global.css`. **Recomendación**: si `components/ui/*` va a ganar adopción real (sección 3 dice que hoy es parcial), hay que decidir una fuente de verdad única — o generar `global.css` desde `theme.ts` en build, o dejar de usar clases de color de NativeWind en los componentes compartidos y pasar siempre `color`/`style` explícito.

### 2.2 Tipografía

**Familia**: Gilroy, con 7 pesos definidos (`light/regular/medium/semiBold/bold/extraBold/black`). Buena elección para "premium" — es una familia geométrica con buen carácter en mayúsculas/números, coherente con el estilo Bevel que ya se persigue.

**🟠 Problema — 2 de los 7 pesos están muertos.**
`FONT.light`: **0 usos** en 116 archivos. `FONT.black`: **1 uso**. Mientras tanto `FONT.bold` se usa en 51 archivos, `semiBold` en 37, `medium` en 31, `regular` en 32. **Por qué importa**: cargar 2 variantes de fuente que nunca se pintan es peso de bundle/memoria sin beneficio, y da falsa sensación de que hay más matices tipográficos disponibles de los que realmente se usan. **Recomendación**: si `light`/`black` no tienen un caso de uso planeado a corto plazo, no cargarlos (`expo-font`) — reduce el bundle sin cambiar nada visible.

**🔴 Problema — no existe una escala tipográfica en uso real (aunque una está definida).**
`theme.ts:225-233` define `TYPE` (`screenTitle:32`, `sectionTitle:22`, `cardTitle:17`, `bodyText:15`, `label:13`, más 2 tokens de anillos). **`TYPE` tiene 0 importaciones en las 116 pantallas** (confirmado por grep y confirmado independientemente por el agente que leyó las 7 pantallas representativas — ninguna de las 7 lo usa). En su lugar, cada pantalla declara `fontSize` como número suelto. Distribución real de `fontSize` en todo `pages/migrated` (top 15 valores, con conteo de apariciones):

`14`→104 · `13`→81 · `12`→71 · `16`→67 · `11`→47 · `15`→38 · `18`→31 · `24`→14 · `20`→13 · `22`→10 · `10`→9 · `28`→8 · `17`→7 · `26`→6 · `40`/`32`→5 c/u

Al menos **19 valores distintos** de `fontSize` en la app, para lo que debería ser una escala de 6-8 pasos. Ejemplo concreto de "título de pantalla" con 4 valores distintos entre 6 pantallas revisadas a fondo: onboarding (título de pregunta) = 24 (`onboarding_v2_screen.tsx:449`); calendario (header) = 20 (`my_program_calendar_screen.tsx:1122`); modal de plan = 18 (`plan_screen.tsx:812`); título de sección en recetas = 16 (`recipe_main_screen.tsx:393`). Ninguno coincide con `TYPE.sectionTitle` (22) ni `TYPE.screenTitle` (32).

**Recomendación**: no es un problema de "faltan tokens" — es un problema de **adopción cero de los tokens que ya existen**. Antes de inventar una escala nueva, hay que decidir migrar las pantallas reales a `TYPE` (o a la escala ampliada que se propone en la sección 13) y hacerlo cumplir con una regla de lint (`no-restricted-syntax` de ESLint puede prohibir `fontSize: <número literal>` fuera de `theme.ts`).

**🟠 Problema — line-height y letter-spacing no están en el sistema de tokens en absoluto.**
`TYPE` no define `lineHeight` ni `letterSpacing` en ninguno de sus 7 estilos (`theme.ts:225-233`). Cuando SÍ se define `lineHeight` en una pantalla (56 archivos lo hacen), es un número suelto elegido por esa pantalla sin relación con el `fontSize` que acompaña — no hay una fórmula (p. ej. "1.3× el tamaño de fuente") aplicada de forma consistente. `letterSpacing` aparece en solo 16 archivos, prácticamente al azar. **Por qué importa**: el line-height es el factor con más impacto real en legibilidad de párrafos largos (descripciones de recetas, notas de blog, textos de onboarding) y hoy depende de que cada desarrollador se acuerde de ponerlo bien cada vez.

**🟡 Problema — títulos "gritan" con `extraBold` en contextos donde `bold` bastaría.**
`onboarding_v2_screen.tsx:449` usa `FONT.extraBold` para el título de cada pregunta (fontSize 24) — un peso reservado normalmente para display/hero, aplicado aquí a un H2 de flujo repetitivo. No es incorrecto, pero contribuye a que no haya diferencia perceptible entre "el título más importante de la app" (el hero de Home, o un `screenTitle`) y "el título de una pregunta de formulario" — ambos compiten por el mismo nivel de peso visual.

### 2.3 Iconos

**Base**: única librería, `@expo/vector-icons` (Ionicons) — confirmado, 0 mezclas con otras librerías de iconos. Esto es correcto y no hace falta cambiarlo.

**🟠 Problema — mezcla outline/filled sin regla.**
De 478 usos de icono con nombre explícito: **140 son `-outline` (29.3%)**, **338 son la variante sólida (70.7%)**. No hay un patrón sistemático de "outline = inactivo, filled = activo" — ambos estilos conviven en la misma pantalla sin criterio (confirmado por el agente de investigación revisando ejemplos reales). **Por qué importa**: mezclar grosor de trazo en la misma vista (outline es más ligero visualmente que filled) genera ruido visual de bajo nivel — el ojo percibe inconsistencia de "peso" aunque no sepa nombrarla. **Recomendación**: adoptar la convención más común en apps móviles de referencia (iOS system, y la propia Bevel que se usa de inspiración): `-outline` para estado por defecto/inactivo, versión sólida para estado activo/seleccionado — y aplicarlo también en botones de navegación (tabs) de forma sistemática.

**🟠 Problema — el mismo concepto usa iconos distintos según la pantalla.**

| Concepto         | Variantes encontradas                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Volver           | `arrow-back` (`onboarding_screen.tsx:83`, `home/heart_rate_history_screen.tsx:60`) vs `chevron-back` (`coming_soon_screen.tsx:21`, `statistics_screen.tsx:124`)              |
| Editar           | `pencil` (`profile_screen.tsx:180`) vs `create-outline` (`shopping_list_detail_screen.tsx:208`, `meals_water_reminder_screen.tsx:37`)                                        |
| Guardar/favorito | `heart`/`heart-outline` (`recipe_main_screen.tsx:217,245`) vs `bookmark`/`bookmark-outline` (`bookmark_screen.tsx:215`) vs `star-outline` (`home_screen_modern_v2.tsx:1674`) |
| Eliminar/quitar  | `trash-outline` (`shopping_list_detail_screen.tsx:212`) vs `remove-circle` (`home/step_goal_screen.tsx:88`) vs `close-circle` (13 usos más)                                  |

**Por qué importa**: un usuario que aprende "el icono de basura significa eliminar" en una pantalla no puede transferir ese aprendizaje a otra que usa `remove-circle` para lo mismo — rompe la "consistencia" que el propio brief pide explícitamente. **Recomendación**: fijar un mapa canónico `concepto → nombre de icono` (una constante, ej. `constants/icons.ts`, mismo patrón que ya existe para hábitos en `constants/habitIcons.ts`) y migrar.

**🟡 Problema — dispersión de tamaños sin escala.**
Al menos 15 tamaños distintos de icono en uso (`18`→131 usos, `20`→100, `22`→62, `24`→43, `16`→41, `14`→27, `26`→21, `28`→18, `32`→17, `40`→16, `48`→14, `64`→11, y más). `18`/`20` concentran el 41% de todos los usos — hay ya una escala implícita mayoritaria, solo falta declararla como tal.

**🟡 Problema — 3 formas de renderizar un icono compiten entre sí.**
`AppIcon` (wrapper con fondo circular/cuadrado + icono): 7 archivos, 64 usos. `Icon` (wrapper simple de `@components/ui/icon`, sin fondo): 70 archivos, 380 usos — el patrón dominante real. `Ionicons` importado directo de `@expo/vector-icons`, saltándose ambos wrappers: **15 archivos, 113 usos** (`water_reminders_screen.tsx`, `steps_count_screen.tsx`, `statistics_screen.tsx`, `profile_screen.tsx`, `main_goal_screen.tsx`, `workout_summary_screen.tsx`, entre otros). **Por qué importa**: los 113 usos que saltan directo a `Ionicons` pierden cualquier ventaja que `Icon`/`AppIcon` fueran a dar (soporte de `className`, tokens de color) — son His código que ya no se beneficia de un futuro cambio centralizado en el wrapper.

### 2.4 Espaciado

**🔴 Problema — el "spacing system" existente tiene 4 tokens con nombre y 0 uso real.**
`theme.ts:207-212`: `SPACING.cardPadding` (20), `screenPadding` (16), `gapBetweenCards` (12), `gapBetweenSections` (28). **0 archivos de 116 los importan.** No es una escala genérica reutilizable (como la que pide el brief, `4/8/12/16/20/24/32/40`) — son 4 valores atados a un uso semántico muy concreto, sin cubrir la mayoría de necesidades reales (gap entre un icono y su texto, padding de un botón, margen entre un título y su subtítulo, etc.), lo que probablemente explica en parte por qué nadie los adoptó: no dan para todos los casos.

**Padding horizontal de pantalla, comparado entre las 6 pantallas leídas a fondo**: onboarding 20 (`onboarding_v2_screen.tsx:448`), edit_profile/change_pwd 20, recipe_main **16**, plan **6** (`plan_screen.tsx:779` — notablemente distinto; el margen visual real lo pone el padding interno de 20 de `Card`, no una decisión de esta pantalla). Tres valores distintos para "el margen del contenido respecto al borde de la pantalla", que debería ser el valor más estandarizado de toda la app.

**Recomendación**: sustituir los 4 tokens actuales por una escala genérica de 8 pasos (sección 13) y mantener 1-2 alias semánticos (`screenPadding`, `cardPadding`) que apunten a esa escala, no que la sustituyan.

---

## 3. Componentes

Inventario real de `components/ui/*` (Gluestack): `accordion`, `actionsheet`, `avatar`, `badge`, `box`, `button`, `card`, `checkbox`, `divider`, `fab`, `form-control`, `glass-view`, `heading`, `hstack`, `icon`, `input`, `menu`, `modal`, `popover`, `pressable`, `radio`, `select`, `slider`, `spinner`, `stepper`, `switch`, `tabs`, `text`, `textarea`, `tooltip`, `vstack`. Es una librería de primitivos razonablemente completa — **no falta construir componentes base**, falta adoptarlos.

| Componente                                                 | Adopción real (de 116 pantallas)                                                                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/button` (Button)                                       | 44 archivos (38%)                                                                                                                                    |
| `ui/card` (Card)                                           | 18 archivos (15.5%)                                                                                                                                  |
| `ui/badge` (Badge)                                         | 4 archivos (3.4%)                                                                                                                                    |
| `ui/modal` (Modal)                                         | 1 archivo — vs. 3 archivos que usan el `Modal` nativo de React Native directamente                                                                   |
| `ScreenHeader` (custom, no Gluestack)                      | 45 archivos (39%)                                                                                                                                    |
| `SimpleBottomSheet` (custom, único bottom sheet de la app) | — (sin medir adopción exacta, pero es la única implementación, correcto)                                                                             |
| `LoadingSkeleton.tsx` (custom, existe)                     | **0 archivos**                                                                                                                                       |
| `EmptyState.tsx` (custom, existe)                          | **0 archivos**                                                                                                                                       |
| Ninguno de los anteriores (`ActivityIndicator` suelto)     | **25 archivos** para loading                                                                                                                         |
| No existe componente `Chip`                                | — (los selectores tipo chip de esta misma sesión, `appearance_screen.tsx`, `app_feedback_screen.tsx`, se construyeron a mano por falta de primitivo) |
| No existe componente `Toast`                               | — (todo el feedback no-bloqueante usa `Alert.alert`, que SÍ bloquea la interacción — ver 3.1)                                                        |

### 3.1 Hallazgos por componente

**🔴 Buttons — 4 alturas/radios distintos para "el botón más importante de la pantalla" en solo 4 pantallas comparadas:**

- Onboarding "Continuar": `size="lg"` + `radius="pill"` → altura mínima `min-h-10`, pill (`onboarding_v2_screen.tsx:253-255`).
- Sesión de entrenamiento "FINALIZAR ENTRENAMIENTO" (la acción más crítica de toda la app — cierra la sesión activa): `radius="pill"` **sin `size`** → cae al tamaño `default` de `components/ui/button/index.tsx` (sin `min-h`), **más pequeño** que el botón de "Continuar" del onboarding (`workout_session_screen.tsx:1348-1350`).
- `change_pwd_screen.tsx` "Guardar": sin `radius` ni `size` → `rounded-md` (20px), no pill (línea 178-180).
- `my_program_calendar_screen.tsx` "Enviar solicitud"/"Guardar cambios": no usa el componente `Button` compartido en absoluto — `StyleSheet` a mano con `borderRadius: 10` (línea 1332), un valor que ni siquiera pertenece a la escala `RADIUS` (`sm:12, md:20, lg:28`).

**Por qué es 🔴 y no 🟡**: el botón de finalizar entrenamiento — probablemente el CTA que más se pulsa en toda la app, sesión tras sesión — es visualmente _menos_ prominente que un botón de onboarding que el usuario ve una sola vez en la vida. Es lo opuesto a la jerarquía que debería tener.

**Recomendación**: forzar `size` explícito siempre que se use `Button` (lint rule o wrapper que no permita omitirlo), y migrar los 2 casos que usan `StyleSheet` a mano al componente compartido.

**🟠 Cards — 2 lenguajes visuales paralelos, ninguno "erróneo" en sí mismo:**
`Card` compartido (usado por `plan_screen`, `my_program_calendar_screen`, `workout_session_screen` vía variantes `ghost/filled/elevated`): radio 20px, padding 20px (`global.css:158,162`). El rediseño reciente de `edit_profile_screen.tsx`/`change_pwd_screen.tsx` (esta misma sesión de trabajo) construyó su propia tarjeta a mano (`borderRadius:16`, filas con separador) — coherente _entre esas 2 pantallas_, pero es una segunda implementación de "tarjeta blanca" que no extiende el componente `Card` ya existente. `recipe_main_screen.tsx` añade un tercer radio de card (18px, `featuredCard`, línea 401) usado solo ahí. Tres radios de card (20/16/18) para un mismo concepto visual.

**🟡 Selectores tipo chip — no hay componente, cada pantalla construye el suyo.**
`appearance_screen.tsx` (tarjetas de tema con borde resaltado) y `app_feedback_screen.tsx` (chips de sección) — ambos de esta sesión — son dos implementaciones distintas del mismo concepto (opción seleccionable en una lista horizontal), sin nada compartido salvo el criterio visual "borde/relleno resaltado en la opción activa" aplicado por convención, no por componente.

**🟠 Loading states — sin componente, y sin siquiera color/tamaño consistente entre los 25 usos ad hoc de `ActivityIndicator`:**
`color` varía entre `C.orange`, `C.textPrimary`, `C.textSecondary`, `C.white`, y literales hex sueltos `"#000000"` (`favourite_screen.tsx:122,196`, `view_equipment_screen.tsx:141` — hardcoded, ni siquiera usa un token). `size` mezcla `"large"`/`"small"`/default sin relación clara con si es carga de pantalla completa o inline. Casi ninguno acompaña el spinner con texto ("Cargando…"). Mientras tanto, `LoadingSkeleton.tsx` está construido y tiene cero usos.

**🟠 Empty states — patrón textual repetido pero sin componente ni icono, con al menos 15 definiciones de estilo `empty*` distintas** (`community_screen.tsx:289`, `view_all_blog_screen.tsx:198`, `favourite_screen.tsx:130,204`, `habits_list_screen.tsx:199`, `my_program_calendar_screen.tsx:1010`, `recipe_main_screen.tsx:350`, entre otras) — todas solo texto centrado, sin icono ilustrativo, cada una con su propio estilo local. `EmptyState.tsx` existe, 0 usos.

**🟡 No existe Toast/Snackbar — todo el feedback no-crítico usa `Alert.alert` (bloqueante).**
`Alert.alert(` aparece **106 veces en 36 archivos**. Es el único mecanismo real de feedback al usuario más allá de navegar o cambiar un estado en pantalla. Un `Alert` del sistema es apropiado para confirmaciones destructivas (borrar, cerrar sesión — donde de hecho se usa bien, ver `home_screen_modern_v2.tsx`, "Borrar caché"), pero es una interrupción excesiva para feedback de bajo riesgo (p. ej. "guardado con éxito"), donde una app premium usaría un toast no bloqueante de 2 segundos.

---

## 4. Border radius, sombras y profundidad

**🔴 Problema — dispersión de border-radius sin relación con la escala definida.**
`RADIUS` en `theme.ts:200-205` define 4 valores: `sm:12, md:20, lg:28, pill:999`. Distribución real de `borderRadius` en las 116 pantallas (top 15, con conteo):

`12`→78 · `20`→30 · `16`→30 · `4`→24 · `10`→23 · `8`→22 · `14`→19 · `3`→11 · `2`→10 · `6`→8 · `5`→8 · `60`→7 · `26`→6 · `18`→6

**Dato clave, no obvio**: los dos valores más usados (`12` y `20`) coinciden _exactamente_ con `RADIUS.sm` y `RADIUS.md` — es decir, la intención de diseño ya converge sola hacia la escala definida en la mayoría de los casos, solo que por número literal, no por importar el token. Esto convierte la migración en un refactor de bajo riesgo (no cambia el resultado visual en la mayoría de los ~108 usos de 12/20), no un rediseño. El resto de valores (`4,10,8,14,3,2,6,5,60,26,18`...) son radios "huérfanos" sin ningún token que los represente — hace falta ampliar la escala (sección 13), no solo forzar el uso de la que ya existe.

**🟠 Problema — un único nivel de sombra para todos los tipos de superficie.**
`SHADOW` (`theme.ts:214-222`) define un solo token, `SHADOW.card`, usado en **6 archivos**. No hay elevación distinta para: una card en reposo vs. un modal flotante encima de todo vs. un FAB vs. un bottom sheet — todos, si usan sombra, comparten el mismo `shadowOpacity:0.04/shadowRadius:8`. **Evidencia de que las sombras son básicamente solo-iOS en la práctica**: `elevation` (la propiedad que Android necesita para renderizar sombra) aparece en solo **2 archivos** fuera del propio token, y `shadowOpacity` suelto (fuera del token) en solo **1 archivo**. La inmensa mayoría de `Box`/`Card` custom con intención de "flotar" sobre el fondo probablemente no proyectan ninguna sombra visible en Android.

**Recomendación**: definir 3-4 niveles de elevación (sección 13) que incluyan siempre el par `shadow*` (iOS) + `elevation` (Android) — nunca uno sin el otro.

---

## 5. Jerarquía visual (qué percibe el usuario en los primeros 2-3 segundos)

### Home v2 (`home_screen_modern_v2.tsx`) — pantalla de entrada de la app

El hero adaptativo ocupa la mayor parte del primer viewport (altura `Math.max(r(360), winH - insets.bottom - TAB_BAR_CLEARANCE)`), con degradado por franja horaria/foto de "mood" y saludo — buena jerarquía de entrada, un solo elemento domina. Justo debajo, sin embargo, hay que hacer scroll para llegar a "Mi plan de hoy" (la información accionable real): en un dispositivo pequeño, el hero por sí solo puede ocupar la pantalla completa, empujando el contenido útil fuera del primer vistazo — el elemento más grande de la pantalla es decorativo (saludo + foto), no accionable.

### `onboarding_v2_screen.tsx`

Una pregunta, un input, un botón "Continuar" por pantalla — la mejor jerarquía visual de las 7 pantallas revisadas, sin competencia de elementos. 🟡 Único hallazgo: la tarjeta de la pregunta de nombre (`nameCard`, línea 471) usa `C.gray80` (`#E5E5EA`, idéntico a `C.border`) — casi indistinguible del fondo `C.bg` (`#EBEBF0`). Es el mismo bug que ya se había detectado y corregido en `edit_profile_screen.tsx` (que ahora usa `C.surface`, blanco real, según su propio comentario en línea 553-556) — pero sigue sin corregirse en onboarding, la primera impresión de la app para un usuario nuevo.

### `workout_session_screen.tsx`

6 bloques de información (cabecera + 3 stats en vivo + contador de ejercicios + "añadir ejercicio") antes de llegar al ejercicio activo — demasiados elementos con peso visual similar compitiendo antes del contenido real. Dentro de la tarjeta de ejercicio, el dato de "carga sugerida" del motor de auto-regulación (potencialmente el dato más valioso de la pantalla) se pinta a `fontSize:9.5` (línea 1107) — por debajo de cualquier mínimo legible, justo bajo una tabla horizontal ya apretada de inputs de 72px.

### `plan_screen.tsx`

Jerarquía top-down correcta (macros → comidas), pero dentro de cada tarjeta de comida el título genérico de la franja horaria ("Desayuno", `C.white`=negro, texto primario) pesa visualmente más que el nombre real de la receta añadida (`C.gray50`, texto secundario) — la etiqueta pesa más que el contenido que describe.

### `recipe_main_screen.tsx`

Buen flujo de exploración sin competencia por atención — el problema aquí no es de jerarquía sino de comportamiento inconsistente: las recetas del carrusel destacado no tienen botón de favorito, las mismas recetas más abajo en su franja horaria sí lo tienen (ver sección 7).

### `my_program_calendar_screen.tsx`

4 iconos de acción sin etiqueta, mismo peso visual, apretados en una píldora de `padding:3` en la esquina superior derecha (líneas 872-897) — reordenar, cancelar selección, vista calendario, vista lista, todos compitiendo en un espacio de ~140px de ancho sin ninguna jerarquía entre ellos pese a tener consecuencias muy distintas (una es destructiva/anulable, otras son solo de visualización).

### `edit_profile_screen.tsx` / `change_pwd_screen.tsx`

Patrón limpio de tarjeta blanca + badge de icono de color por fila — la mejor jerarquía de las pantallas de formulario revisadas, con una excepción real: las filas "Nombre" y "Apellidos" comparten icono y color de badge (`person-outline`/`C.blue` en ambas, `edit_profile_screen.tsx:327,346`) — el propio sistema de diferenciación por color que el rediseño introdujo falla en sus dos primeras filas.

---

## 6. UX y navegación

**Arquitectura**: `@react-navigation/stack` (JS, no native-stack) + tab bar custom (`NavigationTab.tsx`) con menú "+" flotante y menú de Ajustes como modal. No se detectan problemas estructurales de navegación en sí (rutas bien nombradas, sin ciclos raros).

**🔴 Problema — errores de red silenciosos, el usuario nunca se entera.**
De una muestra de ~60 bloques `catch` revisados por el agente de investigación, ~20 solo hacen `logger.error(...)` sin ningún aviso visual, y varios están completamente vacíos:

- `water_tracker_screen.tsx:44-47,91-92` → `catch (e) {}` — vacío.
- `youtube_player_screen.tsx:71-73,174` → `catch(e) {}` — vacío.
- `shopping_list_detail_screen.tsx:65-68` → revierte estado local pero no avisa.
- `other_user_profile_screen.tsx:61-63`, `body_metrics_screen.tsx:57-60,104-107,121-123`, `community_screen.tsx:58-61` → solo log.
- `onboarding_v2_screen.tsx:168-174` → si `submitStage()` falla al final de una etapa, `handleContinue` avanza igual a la siguiente pregunta como si el envío hubiese ido bien — en el flujo de onboarding, donde perder una respuesta es especialmente costoso de detectar después.

**Por qué es crítico**: el usuario interpreta "silencio" como "funcionó". Cuando falla sin avisar, la próxima señal de que algo fue mal llega mucho más tarde (datos que no aparecen, progreso que no se guardó) y sin ninguna pista de dónde se rompió. **Recomendación**: regla mínima — todo `catch` que sigue a una acción iniciada por el usuario (no un fetch de fondo silencioso) debe terminar en un `Alert`/toast visible, aunque sea genérico ("No se pudo guardar, inténtalo de nuevo"). Los catches de fetch de fondo (ej. analíticas, prefetch) pueden seguir silenciosos.

**🟠 Problema — "¿qué tengo que hacer ahora?" tras pulsar un icono de modo en el calendario.**
En `my_program_calendar_screen.tsx`, pulsar "reordenar" o "cancelar" no cambia el aspecto del propio botón pulsado (sin color activo, sin estado "pressed" persistente) — el único indicio de que el modo cambió es que el texto del header, dos líneas más abajo, pasa de "Mi programa" a "Reorganiza tu semana" (línea 861). Fácil de no advertir en un primer vistazo.

**🟡 Problema — modo oscuro presentado como ajuste funcional, pero no lo es para casi ninguna pantalla** (ver detalle completo en sección 9 — se repite aquí porque es, ante todo, un problema de UX/confianza: el switch de "Aspecto" promete un comportamiento que el 95%+ de la app no cumple).

**Descubribilidad — puntos positivos**: el menú "+" y el menú de Ajustes (ampliado en esta misma sesión con Aviso legal, diagnóstico, feedback) están bien organizados por secciones con label. El onboarding guiado (tutorial con spotlight, ya documentado en sesiones anteriores) es un patrón correcto para descubribilidad de funciones nuevas.

---

## 7. Consistencia entre pantallas

Consolidando los hallazgos de las secciones 2-6, comparados entre sí:

| Elemento                       | Valores distintos encontrados                                                                                               | Evidencia                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Radio del CTA principal        | `pill+lg` / `pill sin size` / `rounded-md 20` / `10` (fuera de escala)                                                      | Onboarding vs. Workout vs. ChangePwd vs. Calendar                                                 |
| Radio de "card"                | `20` (Card compartido) / `16` (edit_profile/change_pwd/onboarding nameCard) / `18` (recipe_main)                            | `global.css:158` vs. `edit_profile_screen.tsx:558` vs. `recipe_main_screen.tsx:401`               |
| Padding horizontal de scroll   | `20` / `16` / `6`                                                                                                           | Onboarding+EditProfile+ChangePwd vs. Recipe vs. Plan (`plan_screen.tsx:779`)                      |
| Implementación de cabecera     | `ScreenHeader` compartido / `OnboardingHeader` propio / header inline custom (workout) / header custom sin glass (calendar) | 4 patrones en 6 pantallas                                                                         |
| Generación de nombres de color | Tokens "nuevos" (`textPrimary`, `textSecondary`, `surface`) / tokens heredados del theme oscuro (`C.white`, `C.gray40/50`)  | `edit_profile_screen.tsx` vs. `plan_screen.tsx:782-807`                                           |
| Icono para "volver"            | `arrow-back` / `chevron-back`                                                                                               | Ver sección 2.3                                                                                   |
| Icono para "editar"            | `pencil` / `create-outline`                                                                                                 | Ver sección 2.3                                                                                   |
| Botón de favorito en receta    | Presente / ausente para la misma receta según la sección de pantalla                                                        | `recipe_main_screen.tsx:309-320` (carrusel, sin botón) vs. `:195` (`renderRecipeCard`, con botón) |
| Color de `ActivityIndicator`   | `C.orange` / `C.textPrimary` / `C.textSecondary` / `C.white` / `"#000000"` hardcoded                                        | 5 archivos distintos, ver sección 3.1                                                             |

**Veredicto**: no hay un Design System real — hay una paleta de color compartida (bien) y una biblioteca de primitivos Gluestack disponible pero con adopción parcial (38% Button, 15.5% Card, 3.4% Badge). El resto (tipografía, spacing, radio, sombra) se decide pantalla a pantalla.

---

## 8. Accesibilidad

**🔴 Problema — casi cero uso de props de accesibilidad.**
De 116 pantallas: `accessibilityLabel` aparece en **1 archivo, 1 vez** (`workout_session_screen.tsx:1232`). `accessibilityRole`: **0 apariciones en toda la carpeta**. `accessibilityHint`: **0**. `accessible=`: 1 uso, y para _ocultar_ un elemento del árbol de accesibilidad (`chatting_screen.tsx:158`), no para exponerlo. **Por qué es crítico**: prácticamente ningún botón, tab, badge de estado o control custom declara su rol semántico — un usuario de VoiceOver/TalkBack no puede saber, sin adivinar, qué es un elemento ni qué hace al tocarlo, en casi toda la app.

**Agravante — los primitivos compartidos tampoco lo resuelven por debajo**: se revisó el código fuente de `components/ui/checkbox` y `components/ui/radio` (construidos sobre `createCheckbox`/`createRadio` de `@gluestack-ui/core`) — ninguno de los dos setea `accessibilityRole` ni `accessibilityState` internamente. Toda la semántica depende de que cada pantalla la añada a mano, y ninguna lo hace hoy. El `Switch` compartido sí hereda el rol "switch" gratis al envolver el `Switch` nativo del SO, pero tampoco añade `accessibilityLabel` propio.

**Recomendación**: no es viable arreglarlo pantalla por pantalla en un solo esfuerzo — la palanca de mayor impacto es añadir `accessibilityRole`/`accessibilityState` **dentro** de los wrappers compartidos (`Icon`, `AppIcon` como botón, `Checkbox`, `Radio`, `Card` cuando es pulsable) para que la mejora se propague automáticamente a todos los usos futuros, y auditar en paralelo los ~10-15 flujos más críticos (login, registro, sesión de entrenamiento, checkout de plan) a mano.

**🟠 Problema — 139 botones de icono pequeño sin `hitSlop`.**
`hitSlop` se usa en solo **10 de 116 archivos** (8.6%). Se detectaron **139 bloques `Pressable`** que envuelven un icono ≤20px sin `hitSlop` cercano — por ejemplo `profile_screen.tsx:175-180` (botón editar foto, contenedor 28×28, icono 12px), o los 4 botones de toggle de vista en `my_program_calendar_screen.tsx:873-895` (icono 18px cada uno, sin `hitSlop`, apretados con `gap:2`). El área táctil recomendada mínima (Apple HIG / Material) es 44×44pt — con un contenedor de 28-36px y sin `hitSlop`, varios de estos botones quedan por debajo incluso antes de contar el `hitSlop` que falta.

**🟡 Problema — dependencia exclusiva del color para indicar estado, con un bug real de paso.**
`checkins_list_screen.tsx:151-154`: icono fijo (`pulse-outline`), solo cambia `color`/`backgroundColor` para "pendiente" vs. "al día". `appearance_screen.tsx:75`: solo el color distingue el tema seleccionado del resto. **Bug real encontrado de paso**: `main_goal_screen.tsx:112` — `color: isSelected ? C.white : C.white` — un ternario que compara dos ramas idénticas, no cambia nada visualmente pese a la intención evidente de marcar el estado seleccionado. Es un bug de código real, no un problema de diseño, y probablemente explica por qué esa pantalla en concreto se siente "sin feedback de selección" si alguien lo reportó alguna vez.

**Ejemplos correctos** (para no dar la impresión de que nunca se hace bien): `workout_session_screen.tsx:1134-1137`, `body_metrics_screen.tsx:214` y `progress_screen.tsx:70` cambian el _nombre_ del icono además del color al cambiar de estado — el patrón correcto, y ya existe en la base de código como referencia a seguir.

---

## 9. Responsive / diferentes dispositivos

**🔴 Problema — 3 estrategias de responsive coexistiendo, y la más usada por volumen (`ninguna`) es la mayoritaria.**
Existe un helper compartido y bien construido, `helper/responsiveStyleSheet.tsx` (`useScale`/`useResponsiveStyleSheet`, escala basada en un diseño de referencia Figma de 375×812, con memoización correcta y una API de anotación de string `"48@ratio"`). Se usa en **20 pantallas**. Sin embargo:

- `home_screen_modern.tsx` y `home_screen_modern_v2.tsx` (las 2 pantallas de Home, entre las más complejas de la app) **reimplementan exactamente la misma matemática en local** — `FIGMA_W = 375` / `FIGMA_H = 812` (`home_screen_modern_v2.tsx:75-76`) son literalmente los mismos valores que `FigmaLayout = { w: 375, h: 812 }` del helper compartido (`helper/responsiveStyleSheet.tsx:9`) — con una API distinta (`const r = useCallback((n) => Math.round(n * sc), [sc])`, una función wrapper por valor en vez de anotación de string).
- Las **~92 pantallas restantes** no usan ninguna de las dos — valores de `fontSize`/padding/radio en píxeles fijos, sin escalar según el tamaño real de pantalla.

**Por qué importa**: en un iPhone SE (chico) o un iPad en modo compacto, las ~92 pantallas sin escalar van a verse desproporcionadas respecto a las 22 que sí escalan (20 + las 2 de Home con su propia versión) — inconsistencia de "sensación de tamaño" entre secciones de la misma app. Además, la duplicación en Home v2 es puro riesgo de mantenimiento: cualquier mejora futura al helper compartido (p. ej. añadir un tope máximo de escala para tablets) no llega a las 2 pantallas más visitadas de la app a menos que alguien recuerde actualizarlas a mano también.

**Recomendación**: migrar Home v1/v2 al helper compartido (mismo resultado matemático, cero cambio visual) y decidir, para las ~92 pantallas sin escalar, si el criterio es "no hace falta escalar contenido de listas/formularios simples" (razonable) o si es deuda pendiente — pero que sea una decisión explícita, no un olvido.

**🟠 Problema — Dynamic Island / safe areas: correctamente resueltas donde `ScreenHeader` se usa (39% de las pantallas), a mano en el resto.**
`ScreenHeader` gestiona su propio `useSafeAreaInsets` internamente (documentado en su propio comentario de cabecera, con un bug real ya corregido de "corte de color bajo la status bar" en sesiones anteriores). Pero **10 archivos usan `useSafeAreaInsets` directamente** fuera de `ScreenHeader` — si alguno de esos 10 también usa `ScreenHeader` en la misma pantalla, hay riesgo latente de padding duplicado (el mismo bug de clase que ya se corrigió una vez). No se confirmó ningún caso activo en esta pasada, pero es una superficie de riesgo real dado el patrón repetido del bug.

**🟡 Problema — formularios con poco uso de `KeyboardAvoidingView`.**
Solo **9 de 116 archivos (7.8%)** usan `KeyboardAvoidingView`. Mitigado parcialmente porque la mayoría de formularios están dentro de un `ScrollView`, pero en pantallas con inputs cerca del borde inferior (p. ej. las filas de peso/altura de `edit_profile_screen.tsx`, con botones de unidad de solo ~21px de alto justo debajo) el teclado puede tapar el control sin que haya nada que lo compense automáticamente.

**🟡 Android — sombras / elevación**: ver sección 4 (`elevation` en solo 2 archivos) — es tanto un problema de profundidad visual como de "diferentes dispositivos", porque el resultado visual de la misma pantalla es distinto entre iOS (sombra suave por `shadowOpacity`) y Android (sin relieve, porque falta `elevation`).

---

## 10. Microinteracciones y animaciones

**🔴 Problema — feedback háptico: 0 usos en toda la app.**
`expo-haptics` no se usa **ni una sola vez** en las 116 pantallas — ni siquiera en acciones de alto significado como completar una serie de entrenamiento, marcar un hábito, o guardar un formulario. Para una app de fitness (donde el usuario a menudo interactúa con el teléfono con las manos sudadas/en movimiento, sin mirar de cerca), el haptic es una señal de confirmación barata de implementar (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` en un `onPress`) con alto impacto percibido de "calidad premium".

**🟠 Problema — animación real solo en el 6% de las pantallas, y sin patrón compartido entre ese 6%.**
`react-native-reanimated` se usa en solo 7/116 archivos (Home v2, `plan_screen`, `assigned_meals_screen`, `workout_session_screen`, `my_program_calendar_screen`, `diet_detail_screen`, `blog_detail_screen`). Otras 2 pantallas (`home/emparejando_screen.tsx`, `home/step_goal_completed_screen.tsx`) usan la API `Animated` nativa de React Native — un mecanismo completamente distinto, sin relación con las 7 anteriores. **92% de las pantallas no tienen ninguna animación.** No hace falta que la tengan todas (el propio brief pide evitar animación innecesaria), pero el hecho de que 2 mecanismos distintos convivan sin razón aparente (no hay ningún caso de uso en esas 2 pantallas que reanimated no pudiera cubrir) es deuda técnica, no una decisión de producto.

**🟠 Problema — feedback de "press" (tocar un botón) ausente en la mayoría de los `Pressable`.**
La app migró completamente a `Pressable` (**0 usos de `TouchableOpacity`** — dato positivo, sin fragmentación de API táctil). Pero de **431 apariciones de `Pressable` en 97 archivos**, solo **32 archivos (~33%)** configuran el render-prop `({ pressed }) => ...` para dar feedback visual de que el toque se registró — el resto se queda con el comportamiento por defecto (ripple de Android si aplica; en iOS, sin `pressed`, no hay ningún feedback visual salvo el que dé el propio SO, que para `Pressable` es ninguno). Donde sí se usa, el valor de opacidad tampoco está fijado (`0.2` en algunos sitios, `0.7` en otros, sin relación entre pantallas).

**🟢 Transiciones de navegación: 100% las de por defecto de `@react-navigation/stack`.**
`App.tsx` solo configura `headerShown: false` — cero `cardStyleInterpolator`/`transitionSpec`/`TransitionPresets` custom en todo el repo. No es un problema urgente (las transiciones por defecto son correctas y predecibles), pero es la palanca de "sensación premium" más barata de las pendientes en esta sección — una transición de deslizamiento con la duración/curva ajustada a la identidad de marca cuesta poco y se nota en cada navegación de la app, literalmente cientos de veces por sesión de uso.

---

## 11. Código y arquitectura de UI

Resumen consolidado (cada punto ya está evidenciado en las secciones anteriores, aquí se agrupa la lectura de arquitectura):

| Capa                                      | Estado                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens (`RADIUS`/`SPACING`/`TYPE`) | Definidos, adopción real: 1 / 0 / 0 archivos de 116                                                                                |
| Color (`C`)                               | Definido y sí se usa ampliamente, pero con 5 alias para 1 color y un token (`white`) con nombre invertido a su valor               |
| Tipografía centralizada (`FONT`)          | Sí se usa (pesos), pero sin tamaño/line-height/letter-spacing centralizados                                                        |
| Sombra/elevación                          | 1 solo nivel definido, usado en 6 archivos; Android (`elevation`) casi ausente fuera de ahí                                        |
| Responsive scaling                        | Helper compartido bien construido, usado en 20/116; reimplementado en local (duplicado) en las 2 pantallas de Home; ausente en ~92 |
| Componentes (`Button`/`Card`/`Badge`)     | Existen, adopción parcial (38%/15.5%/3.4%)                                                                                         |
| Componentes construidos sin usar          | `LoadingSkeleton.tsx`, `EmptyState.tsx` — 0 usos cada uno                                                                          |
| Iconos                                    | Librería única (bien), pero 3 formas de renderizar (`AppIcon`/`Icon`/`Ionicons` directo) y sin mapa canónico de concepto→icono     |
| Accesibilidad                             | Sin soporte ni a nivel de pantalla ni dentro de los primitivos compartidos                                                         |
| Sistema de color paralelo (`global.css`)  | Existe, casi sin uso real, riesgo de desincronización si `components/ui/*` gana adopción                                           |

**Conclusión de arquitectura**: el problema no es "falta infraestructura" — hay tokens, hay una librería de componentes razonable, hay un helper de responsive bien hecho. El problema es que **nada obliga a usarlos**: no hay reglas de ESLint que prohíban `fontSize`/`borderRadius`/`padding` como número literal fuera de `theme.ts`, así que cada pantalla nueva reincide por defecto en el patrón de "número suelto que se ve bien en Figma", que es exactamente como se llegó a la dispersión medida en las secciones 2 y 4.

---

## 12. Formato de hallazgo (referencia)

Todos los hallazgos de este documento ya siguen el formato PROBLEMA / POR QUÉ / RECOMENDACIÓN / PRIORIDAD / IMPLEMENTACIÓN embebido en las secciones 2-11 (marcados con 🔴🟠🟡🟢 en línea, junto a la evidencia de archivo:línea). Esta sección existe solo como referencia al criterio de prioridad usado:

- 🔴 **Crítico**: rompe una promesa hecha al usuario (modo oscuro que no funciona), falla WCAG en un caso de uso real y visible, o el CTA más usado de la app es visualmente inconsistente/pequeño.
- 🟠 **Importante**: inconsistencia visible entre pantallas que un usuario atento notaría, o deuda que crece con cada pantalla nueva si no se corrige la causa raíz.
- 🟡 **Mejora**: pulido que eleva la percepción de calidad pero no bloquea ni confunde a nadie hoy.
- 🟢 **Opcional**: bien tal cual está; se documenta como oportunidad, no como defecto.

---

## 13. Design System propuesto

No sustituye `docs/Paleta_Color_BeFit.md` (que documenta correctamente la paleta ya decidida) — lo complementa cerrando los huecos que esta auditoría encontró (contraste, duplicidad de nombres, escalas que faltan).

### Colors

Mantener la paleta ya decidida (monocromo + 6 semánticos), con estas correcciones:

| Rol                         | Token propuesto | Valor (claro)                         | Cambio respecto a hoy                                                                |
| --------------------------- | --------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| Primary / acento de marca   | `accent`        | `#E5E5EA`                             | Un solo nombre — deprecar `primary`/`brand50`/`brand60`/`gray70`/`gray80` como alias |
| Texto principal             | `textPrimary`   | `#000000`                             | Eliminar `white`/`textWhite` (mismo valor, nombre engañoso)                          |
| Texto secundario            | `textSecondary` | `#6B6B70`                             | Sin cambio                                                                           |
| Texto terciario/placeholder | `textTertiary`  | `#7A7A80` (o similar)                 | **Oscurecer** — el valor actual `#AEAEB2` falla WCAG AA (2.21:1)                     |
| Background                  | `bg`            | `#EBEBF0`                             | Sin cambio                                                                           |
| Surface                     | `surface`       | `#FFFFFF`                             | Sin cambio                                                                           |
| Border                      | `border`        | `#E5E5EA`                             | Sin cambio                                                                           |
| Success (fondo/badge)       | `success`       | `#34C759`                             | Sin cambio como fondo                                                                |
| Success (texto/icono)       | `successText`   | `#248A3D` (=`success60` ya existente) | Nuevo uso obligatorio cuando el color va sobre texto pequeño                         |
| Warning (fondo/badge)       | `warning`       | `#FF9500`                             | Sin cambio como fondo                                                                |
| Warning (texto/icono)       | `warningText`   | `#C93400` (=`warning60` ya existente) | Nuevo uso obligatorio como texto                                                     |
| Error/destructivo           | `destructive`   | `#FF3B30`                             | Válido solo para texto grande/iconos (3.55:1)                                        |
| Info                        | `info`          | `#007AFF`                             | Válido solo para texto grande/iconos (4.02:1)                                        |

### Typography

Sustituye/amplía `TYPE` con line-height y letter-spacing explícitos (ausentes hoy):

| Estilo            | Tamaño | Peso      | Line-height | Letter-spacing |
| ----------------- | ------ | --------- | ----------- | -------------- |
| Display           | 40     | extraBold | 46          | -0.5           |
| H1 (screenTitle)  | 28     | bold      | 34          | -0.3           |
| H2 (sectionTitle) | 22     | bold      | 28          | 0              |
| H3 (cardTitle)    | 17     | semiBold  | 22          | 0              |
| Body              | 15     | regular   | 21          | 0              |
| Body small        | 13     | regular   | 18          | 0              |
| Caption           | 12     | medium    | 16          | 0.1            |
| Button            | 15     | semiBold  | 20          | 0.2            |

(`screenTitle` baja de 32 a 28 respecto al `TYPE` actual — 32 no se usa en ningún lado hoy salvo el propio token; 28 sí aparece de forma natural en el código real, alineando el token con el uso existente en vez de al revés.)

### Spacing

Escala genérica de 8 pasos, exactamente la que sugiere el brief — sustituye el enfoque "4 tokens semánticos sin cobertura completa" por una escala + 2 alias:

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`

Alias que se mantienen por claridad de intención: `screenPadding = 20` (converge con el valor mayoritario real, no el 16 actual — ver sección 2.4), `cardPadding = 20`.

### Border radius

`xs: 8 · sm: 12 · md: 16 · lg: 20 · xl: 28 · pill: 999`

(Se añade `xs:8` y `md:16` respecto a la escala actual de 3 pasos — cubren los dos huecos más usados en la práctica, 8 y 16, que hoy no tienen token.)

### Shadows / elevation

3 niveles, cada uno con su par iOS+Android obligatorio:

| Nivel  | Uso                               | shadowOpacity / shadowRadius / offset | elevation |
| ------ | --------------------------------- | ------------------------------------- | --------- |
| `low`  | Card en reposo                    | 0.04 / 8 / (0,2)                      | 1         |
| `mid`  | Elemento flotante (FAB, dropdown) | 0.10 / 12 / (0,4)                     | 4         |
| `high` | Modal / bottom sheet              | 0.18 / 24 / (0,8)                     | 12        |

### Buttons

Variantes: `primary` (fondo `accent`, texto `textPrimary`), `secondary` (borde, fondo transparente), `destructive` (fondo `destructive10`, texto `destructive`), `ghost` (solo texto). Tamaños obligatorios (nunca omitir `size`): `sm` (36px alto), `md` (44px — el mínimo táctil recomendado), `lg` (52px). Radio: siempre `pill` para CTAs primarios de ancho completo o contenido, `lg` (20px) para botones secundarios en línea.

### Inputs

Estados obligatorios a definir una vez en el componente compartido, no por pantalla: `default`, `focused` (borde `accent`), `error` (borde `destructive`, texto de ayuda en `destructive`), `disabled` (opacidad 0.4). Altura mínima 44px.

### Cards

2 variantes con nombre, no 3 implementaciones distintas por convención tácita: `card` (radio `lg`=20, sombra `low`, la del componente `Card` ya existente) y `cardCompact` (radio `md`=16, sombra `low`, para listas de filas como perfil/ajustes) — cubriendo con nombre lo que hoy son `Card` y la implementación a mano de `edit_profile_screen.tsx` por separado.

### Icons

Ionicons como única librería (ya es así, mantener). Tamaños con nombre: `xs:14 · sm:18 · md:20 · lg:24 · xl:32`. Regla: `-outline` para estado inactivo/por defecto, versión sólida para estado activo/seleccionado. Mapa canónico concepto→icono en `constants/icons.ts` (mismo patrón que `constants/habitIcons.ts`) para los 4+ conceptos ya detectados con variantes inconsistentes (volver, editar, guardar/favorito, eliminar).

---

## 14. Priorización final

### 🔴 TOP 10 cambios más importantes

| #   | Problema                                                                                                                       | Solución                                                                                                                                                          | Impacto esperado                                                                     | Dificultad                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | Modo oscuro solo funciona en 5/116 pantallas (incluida la barra de navegación inferior, siempre clara)                         | Decidir: o se completa la migración a `useAppColorMode` en todas las pantallas, o se retira el switch de "Aspecto" hasta que esté completo                        | Alto — hoy es un ajuste que miente al usuario                                        | Alta (migrar 111 pantallas) o Baja (ocultar el switch temporalmente) |
| 2   | `textTertiary` falla WCAG AA (2.21:1) y se usa en placeholders/etiquetas reales                                                | Oscurecer el token a ~`#7A7A80`                                                                                                                                   | Alto — accesibilidad real, cambio de 1 valor                                         | Muy baja                                                             |
| 3   | `success`/`warning` como color de texto/icono fallan WCAG (~2.2:1) en 5 archivos                                               | Usar `success60`/`warning60` (ya existen) para texto/icono, reservar el tono base para fondos                                                                     | Alto                                                                                 | Baja                                                                 |
| 4   | Botón "Finalizar entrenamiento" (CTA más usado de la app) es más pequeño que el de un flujo de onboarding por falta de `size`  | Añadir `size="lg"` explícito; auditar los ~44 usos de `Button` sin `size`                                                                                         | Alto — jerarquía del CTA más crítico                                                 | Muy baja                                                             |
| 5   | `RADIUS`/`SPACING`/`TYPE` definidos pero con 1/0/0 archivos que los usan de 116                                                | Regla de ESLint que prohíba número literal en `fontSize`/`borderRadius`/`padding` fuera de `theme.ts`; migrar por lotes empezando por las pantallas más visitadas | Muy alto a medio plazo — es la raíz de la mayoría de inconsistencias de este informe | Alta (adopción gradual)                                              |
| 6   | Catches vacíos o solo-log en flujos iniciados por el usuario (onboarding incluido)                                             | Todo catch de una acción de usuario debe terminar en feedback visible                                                                                             | Alto — confianza y depurabilidad                                                     | Media                                                                |
| 7   | Home v1/v2 reimplementan en local el helper de responsive ya compartido (`FIGMA_W/H` duplicado)                                | Migrar a `useResponsiveStyleSheet`/`useScale`                                                                                                                     | Medio — mantenibilidad, mismo resultado visual                                       | Media                                                                |
| 8   | 0 uso de `accessibilityRole`/`accessibilityLabel` en toda la app; checkbox/radio compartidos tampoco lo resuelven internamente | Añadir accesibilidad dentro de los primitivos compartidos primero (efecto multiplicador)                                                                          | Alto para usuarios de lector de pantalla                                             | Media-alta                                                           |
| 9   | `LoadingSkeleton`/`EmptyState` construidos con 0 adopción; 25 pantallas con `ActivityIndicator` inconsistente en color/tamaño  | Adoptar los componentes ya existentes en las pantallas de mayor tráfico primero                                                                                   | Medio — percepción de pulido                                                         | Baja-media                                                           |
| 10  | 5 nombres de token para el mismo color (`primary`/`brand50`/`brand60`/`gray70`/`gray80`) y `white`=`#000000`                   | Consolidar nombres, deprecar alias, renombrar `white`→`textPrimary` en los usos reales                                                                            | Medio — mantenibilidad y legibilidad de código                                       | Baja                                                                 |

### Quick wins (alto impacto visual, bajo esfuerzo)

- Corregir `main_goal_screen.tsx:112` (ternario roto `C.white : C.white`) — 1 línea, restaura feedback de selección real.
- Corregir `nameCard` de `onboarding_v2_screen.tsx` (usa `C.gray80`, casi invisible sobre el fondo) → `C.surface`, mismo fix que ya se aplicó en `edit_profile_screen.tsx`.
- Diferenciar el badge de icono de "Nombre" vs. "Apellidos" en `edit_profile_screen.tsx` (hoy comparten icono y color).
- Añadir `hitSlop={{top:8,bottom:8,left:8,right:8}}` a los 4 botones de toggle de `my_program_calendar_screen.tsx` (34×30px, por debajo del mínimo táctil).
- Subir `paddingVertical` de los botones de unidad (`edit_profile_screen.tsx`, hoy ~21px de alto) a un mínimo de 10-12px.
- Añadir 1-2 llamadas de `Haptics.impactAsync` en las acciones más repetidas (completar serie, marcar hábito) — cambio de minutos, alto impacto percibido.
- Unificar el color de `ActivityIndicator` en las 25 pantallas que lo usan suelto a un único token (`C.textSecondary` o `accent`).

### Redesign roadmap

**Fase 1 — Critical**
Corregir contraste WCAG de `textTertiary`/`success`/`warning` como texto. Decidir el futuro del modo oscuro (completar o retirar el switch). Uniformar tamaño/radio del CTA principal en las pantallas de mayor tráfico (Home, sesión de entrenamiento, calendario). Cerrar los catches silenciosos en flujos críticos (onboarding, sesión de entrenamiento, formularios de perfil).

**Fase 2 — Visual System**
Ampliar y hacer cumplir `RADIUS`/`SPACING`/`TYPE`/`SHADOW` (regla de lint + migración por lotes). Consolidar nombres de color duplicados. Definir el mapa canónico de iconos por concepto. Adoptar `LoadingSkeleton`/`EmptyState` en las pantallas de mayor tráfico. Unificar las 2-3 implementaciones paralelas de "card".

**Fase 3 — UX**
Añadir accesibilidad a los primitivos compartidos (`Checkbox`/`Radio`/`Icon` como botón/`Card` pulsable). Resolver el `hitSlop` faltante en los 139 casos detectados, priorizando por frecuencia de uso. Introducir un componente Toast para feedback no bloqueante (dejar `Alert.alert` solo para confirmaciones destructivas). Migrar Home v1/v2 al helper de responsive compartido.

**Fase 4 — Polish**
Haptics en acciones frecuentes. Feedback de "press" consistente en el ~67% de `Pressable` que hoy no lo tiene. Transición de navegación con identidad propia (duración/curva de marca) en vez del default de `@react-navigation/stack`. Consistencia de outline/filled en iconos según estado activo/inactivo.
