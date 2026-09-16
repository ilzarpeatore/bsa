# Auditoría de pantallas muertas

**Reescrito por completo el 2026-09-16 (item 20 del roadmap).** El inventario anterior era del 04-08-2026 y llevaba meses desactualizado (190 pantallas registradas entonces; solo **87** hoy — la mayoría de las "muertas" de aquella foto ya se borraron en sesiones intermedias: 27 el 2026-08-18, más otras sueltas el 13/23/26-08 y el 16-09). Este documento sustituye al anterior entero, no lo complementa — no hay ninguna nota de "excepción" que preservar, las pantallas que mencionaban ya no existen.

## Metodología

1. Extraídos los 87 nombres de pantalla únicos registrados en `App.tsx` (`<Stack.Screen>`/`<Tab.Screen>`/`<MStack.Screen>`, cualquier `name=`).
2. Extraído cada destino real de `.navigate(`/`.replace(`/`.push(`/`.reset(` con string literal, en todo `pages/`, `components/`, `App.tsx` — incluyendo los casos dinámicos (`navigation.navigate(item.route)` con `item.route` viniendo de un array de configuración en el mismo archivo: `profile_screen.tsx`, `statistics_screen.tsx`, `home_screen_modern_v2.tsx::navigateFromMenu()`, `components/NavigationTab.tsx::QUICK_ACTIONS` — el menú "+" de la barra flotante).
3. Identificados los puntos de entrada reales (no necesitan referencia entrante): `WelcomeAuth`/`MigratedOnboardingV2`/`Home` (según estado de auth, `App.tsx` línea ~361), `InicioTab` (`initialRouteName` del Tab.Navigator), y las 4 pestañas de la barra inferior (`InicioTab`/`PlanDiarioTab`/`NutritionTab`/`HabitsTab`, alcanzables genéricamente vía `navigation.navigate(route.name)` en `NavigationTab.tsx`, no por nombre literal cada una).
4. **`pages/ScreenExplorer.tsx` (herramienta de desarrollo) se excluye del análisis** — navega dinámicamente a prácticamente cualquier ruta registrada, así que "alcanzable desde ScreenExplorer" no es lo mismo que "alcanzable desde el flujo real de un usuario". Mismo criterio que el documento anterior.

## Resultado: 82 de 87 alcanzables, 5 muertas de verdad

### Las 5 pantallas muertas

| Pantalla | Archivo | Por qué está muerta |
| --- | --- | --- |
| `ExerciseInfo` | `pages/migrated/exercise_info_screen.tsx` | Registro **duplicado**: apunta al mismo componente que `MigratedExerciseInfo` (`App.tsx` líneas 272 y 396), pero nada navega a `ExerciseInfo` por ese nombre — todas las llamadas reales usan `MigratedExerciseInfo`. Seguro borrar el registro `Stack.Screen name="ExerciseInfo"`, no el componente (sigue vivo vía `MigratedExerciseInfo`). |
| `MigratedChewie` | `pages/migrated/chewie_screen.tsx` | Cero referencias en todo el repo fuera de su propio registro en `App.tsx`/`ScreenExplorer.tsx`. |
| `MigratedTermsAndConditions` | `pages/migrated/terms_and_conditions_screen.tsx` | Huérfana **a propósito**: los 2 sitios que antes navegaban aquí (`about_app_screen.tsx`, menú de Ajustes en `home_screen_modern_v2.tsx`) abren ahora la web real (`Linking.openURL('https://bestronger.es/terms-and-conditions/')`) porque esta pantalla interna solo tenía un texto placeholder en inglés sin actualizar — decisión ya documentada en el propio código. |
| `MigratedTips` | `pages/migrated/tips_screen.tsx` | Cero referencias fuera de su registro. |
| `MigratedViewEquipment` | `pages/migrated/view_equipment_screen.tsx` | Cero referencias fuera de su registro — la pantalla hermana `MigratedViewBodyPart` (mismo patrón, filtrar ejercicios) sí es alcanzable desde `search_screen.tsx`, esta no. |

Ninguna de las 5 navega a su vez a otra pantalla que no sea ya alcanzable por otra vía (verificado) — no hay cascada de pantallas "solo alcanzables desde una pantalla muerta" (la categoría B2 del inventario anterior) que reportar esta vez.

### Las 82 alcanzables

El resto — no se listan una a una aquí por ser la mayoría (todas las pantallas de auth, onboarding, home, calendario/workouts, nutrición, hábitos, comunidad, estadísticas, perfil, recursos, tienda de recetas, etc.). Si hace falta confirmar una pantalla concreta, buscar su nombre con `grep -rn "'NOMBRE'" pages/ components/ --include="*.tsx"` (o `"NOMBRE"` con comillas dobles, ambos estilos se usan en el repo) — si aparece fuera de `App.tsx`/`ScreenExplorer.tsx`, es alcanzable.

## Qué hacer con las 5

No se borran en esta pasada (esta tarea era "auditar", no "borrar" — decisión de borrado real es del usuario, mismo criterio que el documento anterior con las pantallas que si se acabaron borrando). Recomendación:

- `ExerciseInfo`: seguro quitar el registro duplicado, cero riesgo (el componente sigue vivo vía `MigratedExerciseInfo`).
- `MigratedTermsAndConditions`: candidata a borrar de verdad — ya no tiene ningún punto de entrada por diseño, y sustituirla por la web real fue una decisión ya tomada, no un vacío accidental.
- `MigratedChewie`/`MigratedTips`/`MigratedViewEquipment`: verificar con el usuario si tiene sentido retomarlas antes de tocar nada (mismo criterio del documento original: "no borrar, el usuario las desarrollará más adelante" salvo que se confirme lo contrario).
