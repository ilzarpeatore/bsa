# Auditoría de pantallas muertas

**Reescrito por completo el 2026-09-16 (item 20 del roadmap).** El inventario anterior era del 04-08-2026 y llevaba meses desactualizado (190 pantallas registradas entonces; solo **87** hoy — la mayoría de las "muertas" de aquella foto ya se borraron en sesiones intermedias: 27 el 2026-08-18, más otras sueltas el 13/23/26-08 y el 16-09). Este documento sustituye al anterior entero, no lo complementa — no hay ninguna nota de "excepción" que preservar, las pantallas que mencionaban ya no existen.

**Actualización 2026-09-16 (más tarde) — las 5 pantallas muertas identificadas abajo, borradas.** Usuario confirmó explícitamente borrar las 5 (incluidas las 3 sin motivo conocido, sin retomarlas) — ver items 22-24 de `docs/ROADMAP.md`. Sección "Las 5 pantallas muertas" se deja como referencia histórica de qué se borró y por qué; el estado actual es que **las 87 pantallas restantes son todas alcanzables**.

**Actualización 2026-09-16 (misma noche) — `MigratedViewEquipment` recuperada.** A diferencia de las otras 4, era la única de las 3 "sin motivo conocido" que estaba 100% funcional (datos reales de `exercisesApi.getEquipment()`, mismo patrón que `MigratedViewBodyPart`) — solo le faltaba un punto de entrada, no una reescritura. Se restauró el archivo y su registro en `App.tsx`/`ScreenExplorer.tsx` desde el commit previo al borrado (`git show 4230fbc:pages/migrated/view_equipment_screen.tsx`). Sigue sin punto de entrada real todavía (vuelve a quedar "muerta" en el sentido estricto de este documento) — pendiente añadir un filtro "Por equipamiento" en algún sitio (candidato natural: `search_screen.tsx`, junto al filtro por zona del cuerpo que ya navega a `MigratedViewBodyPart`).

## Metodología

1. Extraídos los 87 nombres de pantalla únicos registrados en `App.tsx` (`<Stack.Screen>`/`<Tab.Screen>`/`<MStack.Screen>`, cualquier `name=`).
2. Extraído cada destino real de `.navigate(`/`.replace(`/`.push(`/`.reset(` con string literal, en todo `pages/`, `components/`, `App.tsx` — incluyendo los casos dinámicos (`navigation.navigate(item.route)` con `item.route` viniendo de un array de configuración en el mismo archivo: `profile_screen.tsx`, `statistics_screen.tsx`, `home_screen_modern_v2.tsx::navigateFromMenu()`, `components/NavigationTab.tsx::QUICK_ACTIONS` — el menú "+" de la barra flotante).
3. Identificados los puntos de entrada reales (no necesitan referencia entrante): `WelcomeAuth`/`MigratedOnboardingV2`/`Home` (según estado de auth, `App.tsx` línea ~361), `InicioTab` (`initialRouteName` del Tab.Navigator), y las 4 pestañas de la barra inferior (`InicioTab`/`PlanDiarioTab`/`NutritionTab`/`HabitsTab`, alcanzables genéricamente vía `navigation.navigate(route.name)` en `NavigationTab.tsx`, no por nombre literal cada una).
4. **`pages/ScreenExplorer.tsx` (herramienta de desarrollo) se excluye del análisis** — navega dinámicamente a prácticamente cualquier ruta registrada, así que "alcanzable desde ScreenExplorer" no es lo mismo que "alcanzable desde el flujo real de un usuario". Mismo criterio que el documento anterior.

## Resultado (en el momento de la auditoría): 82 de 87 alcanzables, 5 muertas de verdad

### Las 5 pantallas muertas (borradas el 2026-09-16)

| Pantalla                     | Archivo                                          | Por qué está muerta                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ExerciseInfo`               | `pages/migrated/exercise_info_screen.tsx`        | Registro **duplicado**: apunta al mismo componente que `MigratedExerciseInfo` (`App.tsx` líneas 272 y 396), pero nada navega a `ExerciseInfo` por ese nombre — todas las llamadas reales usan `MigratedExerciseInfo`. Seguro borrar el registro `Stack.Screen name="ExerciseInfo"`, no el componente (sigue vivo vía `MigratedExerciseInfo`).                            |
| `MigratedChewie`             | `pages/migrated/chewie_screen.tsx`               | Cero referencias en todo el repo fuera de su propio registro en `App.tsx`/`ScreenExplorer.tsx`.                                                                                                                                                                                                                                                                          |
| `MigratedTermsAndConditions` | `pages/migrated/terms_and_conditions_screen.tsx` | Huérfana **a propósito**: los 2 sitios que antes navegaban aquí (`about_app_screen.tsx`, menú de Ajustes en `home_screen_modern_v2.tsx`) abren ahora la web real (`Linking.openURL('https://bestronger.es/terms-and-conditions/')`) porque esta pantalla interna solo tenía un texto placeholder en inglés sin actualizar — decisión ya documentada en el propio código. |
| `MigratedTips`               | `pages/migrated/tips_screen.tsx`                 | Cero referencias fuera de su registro.                                                                                                                                                                                                                                                                                                                                   |
| `MigratedViewEquipment`      | `pages/migrated/view_equipment_screen.tsx`       | Cero referencias fuera de su registro — la pantalla hermana `MigratedViewBodyPart` (mismo patrón, filtrar ejercicios) sí es alcanzable desde `search_screen.tsx`, esta no.                                                                                                                                                                                               |

Ninguna de las 5 navega a su vez a otra pantalla que no sea ya alcanzable por otra vía (verificado) — no hay cascada de pantallas "solo alcanzables desde una pantalla muerta" (la categoría B2 del inventario anterior) que reportar esta vez.

### Las 82 alcanzables

El resto — no se listan una a una aquí por ser la mayoría (todas las pantallas de auth, onboarding, home, calendario/workouts, nutrición, hábitos, comunidad, estadísticas, perfil, recursos, tienda de recetas, etc.). Si hace falta confirmar una pantalla concreta, buscar su nombre con `grep -rn "'NOMBRE'" pages/ components/ --include="*.tsx"` (o `"NOMBRE"` con comillas dobles, ambos estilos se usan en el repo) — si aparece fuera de `App.tsx`/`ScreenExplorer.tsx`, es alcanzable.

## Qué se hizo con las 5

Usuario confirmó borrar las 5 (2026-09-16, más tarde el mismo día que esta auditoría) — incluidas las 3 sin motivo conocido, sin retomarlas:

- `ExerciseInfo`: registro duplicado quitado de `App.tsx` (el componente sigue vivo vía `MigratedExerciseInfo`, cero riesgo confirmado).
- `MigratedTermsAndConditions`: registro y `pages/migrated/terms_and_conditions_screen.tsx` borrados.
- `MigratedChewie`, `MigratedTips`: registro y archivo (`chewie_screen.tsx`, `tips_screen.tsx`) borrados.
- `MigratedViewEquipment`: borrada y luego **recuperada la misma noche** (ver actualización arriba) — sigue en el repo, registrada, pero todavía sin punto de entrada real.

Las 4 entradas correspondientes se quitaron de `pages/ScreenExplorer.tsx` (herramienta de desarrollo) para no dejar rutas muertas en su listado; la de `MigratedViewEquipment` se volvió a añadir al recuperarla. `npx tsc --noEmit` limpio tras el borrado, sin referencias colgantes.
