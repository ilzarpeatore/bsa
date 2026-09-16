# Inventario de TODOs en `pages/migrated`

**Actualizado 2026-09-16 — el recuento de 17 (2026-08-XX) ya no es correcto.** Verificado contra el código real: 3 de los 5 archivos que tenían TODOs ya no existen (`assign_screen.tsx`, `chatting_image_screen.tsx`, `water_reminders_screen.tsx` — borrados o sustituidos en sesiones posteriores), y otros 3 (`add_post_screen.tsx`, `add_shopping_list_screen.tsx`, `bookmark_screen.tsx`) ya no tienen ningún TODO real (sus features se completaron sin que nadie actualizara este inventario).

**Actualización 2026-09-16 (más tarde) — los 2 últimos también resueltos.** Total: **0 items.**

Los 2 TODOs de `about_app_screen.tsx` (línea 37 `// TODO: Replace with actual API call`, línea 91 `// TODO: navigation.navigate('InAppWebPage', ...)`) resultaron ser un bucle muerto: `aboutPages`/`loadAppSettings()` nunca llegaron a implementarse en ninguna sesión desde que se creó la pantalla, así que ese `.map()` nunca renderizaba nada — "Política de privacidad", "Términos", "Sobre nosotros" y "Licencias de terceros" (los 4 botones reales de la pantalla) son completamente independientes de ese bucle y siempre funcionaron. En vez de completar una feature que nadie pidió, se borró el andamiaje muerto (`aboutPages`, `loadingRef`, `loadAppSettings()`, el `.map()`) — resuelve los 2 TODOs sin añadir código nuevo.

`MigratedAboutApp` **sí es alcanzable** (`profile_screen.tsx` → "Acerca de"). Esta nota originalmente señalaba una contradicción con `DEAD_SCREENS.md` (que en su versión del 04-08-2026 la listaba sin enlace entrante); ese documento se reescribió por completo el 2026-09-16 y ya no contiene ese falso positivo — `MigratedAboutApp` no aparece entre las 5 pantallas muertas reales. Se deja la nota como referencia histórica de por qué ambos inventarios estaban desactualizados.

## Otras coincidencias de "TODO" en `pages/migrated` (descartadas, no son marcadores de código)

`grep -rn "TODO" pages/migrated/*.tsx` devuelve 6 líneas más, todas la palabra española "todo/TODOS" dentro de un comentario normal (p. ej. "que la cuadrícula rellene TODO el recuadro", "marcaba TODOS los workouts") — no son TODOs pendientes, se listan aquí solo para que quien repita el grep no las cuente por error: `edit_profile_screen.tsx:196`, `habit_detail_screen.tsx:596`, `my_program_calendar_screen.tsx:497`, `view_body_part_screen.tsx:44`, `workout_session_screen.tsx:445`, `about_us_screen.tsx:33` (esta última referencia un TODO *antiguo*, ya resuelto, dentro de un comentario explicativo).
