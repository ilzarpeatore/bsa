# Inventario de TODOs en `pages/migrated`

**Actualizado 2026-09-16 — el recuento de 17 (2026-08-XX) ya no es correcto.** Verificado contra el código real: 3 de los 5 archivos que tenían TODOs ya no existen (`assign_screen.tsx`, `chatting_image_screen.tsx`, `water_reminders_screen.tsx` — borrados o sustituidos en sesiones posteriores), y otros 3 (`add_post_screen.tsx`, `add_shopping_list_screen.tsx`, `bookmark_screen.tsx`) ya no tienen ningún TODO real (sus features se completaron sin que nadie actualizara este inventario). Quedan **2** TODOs reales, ambos en el mismo archivo.

Total: 2 items

| Archivo                               | Línea | TODO                                                                                 |
| -------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `pages/migrated/about_app_screen.tsx` | 37    | `// TODO: Replace with actual API call`                                                |
| `pages/migrated/about_app_screen.tsx` | 91    | `// TODO: navigation.navigate('InAppWebPage', { url: page.url, title: page.title })`   |

`MigratedAboutApp` **sí es alcanzable** hoy (`profile_screen.tsx` → "Acerca de", contradice a `DEAD_SCREENS.md` que la lista como sin enlace entrante — otra prueba de que ese inventario también está desactualizado). `loadAppSettings()` nunca rellena `aboutPages` de verdad (el `TODO` de la línea 37 sigue comentado, sin llamada real a `getAppSettingApi()`), así que la pantalla siempre muestra la lista vacía; y tocar cualquier página de esa lista (línea 91) no navega a ningún sitio. Bajo impacto (pantalla secundaria, "Privacy Policy"/"Terms" ya tienen su propio botón fuera de este bucle, ver `docs/TAREAS.md` sesión 2026-08-28/29 punto 10), pero es un TODO real, no ruido.

## Otras coincidencias de "TODO" en `pages/migrated` (descartadas, no son marcadores de código)

`grep -rn "TODO" pages/migrated/*.tsx` devuelve 6 líneas más, todas la palabra española "todo/TODOS" dentro de un comentario normal (p. ej. "que la cuadrícula rellene TODO el recuadro", "marcaba TODOS los workouts") — no son TODOs pendientes, se listan aquí solo para que quien repita el grep no las cuente por error: `edit_profile_screen.tsx:196`, `habit_detail_screen.tsx:596`, `my_program_calendar_screen.tsx:497`, `view_body_part_screen.tsx:44`, `workout_session_screen.tsx:445`, `about_us_screen.tsx:33` (esta última referencia un TODO *antiguo*, ya resuelto, dentro de un comentario explicativo).
