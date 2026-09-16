# Roadmap Be Stronger

**Última auditoría completa: 2026-09-16.** Este documento se construye contrastando código real contra `docs/PENDIENTE_BACKEND_ADMIN.md`, `docs/TODO_INVENTORY.md` y `docs/DEAD_SCREENS.md` — los tres están actualizados a la misma fecha. Si algo de aquí no coincide con esos documentos, esos tres mandan (tienen el detalle línea a línea); este documento es el resumen priorizado para planificar, no la fuente de verdad de cada endpoint.

**Regla para no repetir la desactualización que motivó esta pasada**: cuando se resuelva un item de aquí, márcalo `~~tachado~~ ✅ RESUELTO (fecha)` en este archivo **y** en el documento de origen (`PENDIENTE_BACKEND_ADMIN.md`/`TODO_INVENTORY.md`/`DEAD_SCREENS.md`) en el mismo commit — no en una sesión futura "cuando se acuerde alguien".

---

## Ya resuelto (auditoría 2026-09-16) — sin acción, solo referencia histórica

Todo esto apareció alguna vez como "pendiente" en algún documento de este repo y ya está confirmado hecho, leyendo el código real de `bsa`/`Bckbs`/`bstronger-admin` (no solo nombres de ruta):

- Onboarding v2 (3 cuestionarios + completado + admin panel)
- Reorganizar semana en el calendario
- "Solicitar función"/"Informar de error" (+ panel admin con filtros)
- Borrado de cuenta
- Workout demo auto-asignado a usuarios nuevos
- Imagen por recurso (`resources.image_url`)
- Subida real de foto de perfil
- Cierre de sesión de entrenamiento (duración/calorías/logros)
- Recordatorios locales (resuelto 100% client-side, sin backend)
- OTP (eliminado)
- Pantallas de vídeo (eliminadas)
- `recipe_tags.group` en backend (falta solo que el cliente lo consuma, ver pendientes)
- Moderación de publicaciones (persistencia del reporte + panel admin + permiso de borrado ampliado)
- Motor de Auto-Regulación de Carga — **las 9 piezas** de integración en el admin panel (sustituciones de ejercicio, feed de logros, readiness admin, reglas de progresión, sugerencias pendientes, planes semanales adaptativos, excepciones de coach, override de experiencia, toggle de semana de descarga)
- Seguridad backend: saneado de 5xx, rate limiting en auth, IDOR en posts/hábitos/métricas, logout en todos los dispositivos
- Checkout Stripe/PayPal — **eliminado** por completo (decisión de negocio: pago 100% presencial)
- Reporte de comentarios + bloqueo de usuario — `COMMUNITY_ENABLED = true`
- Chat/FitBot — **decisión tomada** de dejarlo oculto tras el flag tal cual (es un bot IA privado 1-a-1, sin coach ni otros usuarios de por medio; sin plan de completar la integración de OpenAI por ahora) — cerrado, no es "pendiente"

---

## Pendiente real, priorizado

### Rápido / alta prioridad (código, en este repo)

| # | Qué | Dónde | Complejidad | Duración est. |
|---|---|---|---|---|
| 1 | `GET` readiness real (`combined_score`/`band`/`acwr` de la tabla `readiness_scores`) para sustituir la aproximación `computeRecoveryScore()` del hero de Home y activar "Strain" — **no confundir con el endpoint admin, ese ya existe** | `Bckbs` (endpoint) + `bsa` (swap trivial una vez exista) | M | 2 días |
| 2 | `MigratedRecipeTagList` debe leer `recipe_tags.group` (ya existe en backend) en vez de su heurística de texto (`CATEGORY_DEFS`) | `bsa` | S | <1 día |
| 3 | 2 TODOs reales en `about_app_screen.tsx` (línea 37: `loadAppSettings()` nunca llama a la API real, la lista de páginas siempre sale vacía; línea 91: tocar una página no navega a ningún sitio) — pantalla sí es alcanzable (`profile_screen.tsx` → "Acerca de"), no es código muerto | `bsa` (+ `Bckbs` si `getAppSettingApi()` necesita algo nuevo, a confirmar) | S | <1 día |

### Datos que solo tú puedes dar (sin código real que escribir)

| # | Qué | Bloqueado por |
|---|---|---|
| 4 | `APP_STORE_ID` en `constants/appLinks.ts` | Publicar la ficha en App Store Connect primero |
| 5 | `PLAY_STORE_PUBLISHED = true` | Publicar la ficha en Play Console primero |
| 6 | `SOCIAL_LINKS` en `constants/appLinks.ts` | Cuentas reales de redes sociales, si existen |

### Contenido — tarea de panel admin, no de código

| # | Qué |
|---|---|
| 7 | Marcar manualmente qué `WorkoutTemplate`/`Recipe` son `is_exclusive`/`is_premium` (el flag ya funciona) |
| 8 | Catálogo de `Diets` real (hoy solo 1 fila de prueba) |
| 9 | Fotos reales de las 5276 recetas (100% placeholder hoy); antes decidir subida manual vs. integración por lote y revisar licencias de imágenes |
| 10 | Bibliografía real de los 4 posts del blog (el acordeón ya existe en la app) |

### Infraestructura / seguridad operativa — fuera de este repo, requiere acceso al VPS

| # | Qué |
|---|---|
| 11 | Auditar claves SSH autorizadas en el VPS (`/root/.ssh/authorized_keys`), quitar las obsoletas |
| 12 | Confirmar que la contraseña de la BD de producción es robusta |
| 13 | Rotar la contraseña de la cuenta `demo@bestronger.app` (expuesta en el incidente de recuperación de datos del 2026-08-05, si sigue siendo la misma) |
| 14 | Revisar si algún otro usuario en producción tiene contraseña por defecto/predecible |

### Auditoría de datos (no bloqueante)

| # | Qué |
|---|---|
| 15 | Confirmar si algún hábito personalizado creado antes del 2026-08-05 se perdió en el incidente `migrate:fresh` de esa fecha, y recrearlo a mano si falta |

### Diferido explícitamente (sin fecha, según demanda real de negocio)

| # | Qué | Complejidad |
|---|---|---|
| 16 | Wearables (Garmin/Fitbit/Apple Watch/Galaxy Watch) — sin backend propio | XL |
| 17 | Integración Strava (OAuth2 + webhooks + `strava_connections`) | L |
| 18 | HealthKit/Health Connect — **ya no es "reactivar", es construir desde cero**: el código (`helper/health.ts`, entitlements, pantallas de emparejamiento) se eliminó por completo el 2026-09-10, no solo se ocultó tras un flag | L, condicionado a Apple Developer Program de pago ($99/año) |
| 19 | Web (`webbs`): catálogo `/programas` + checkout — solo si el modelo de negocio pasa a venta online (hoy es 100% presencial) | L |

### Deuda técnica transversal

| # | Qué | Complejidad | Duración est. |
|---|---|---|---|
| 20 | Rehacer la auditoría de alcanzabilidad de `DEAD_SCREENS.md` — el recuento de 190/70/120 es del 04-08-2026 y ya no es correcto (confirmado 2026-09-16: al menos una entrada, `MigratedAboutApp`, es un falso positivo — sí es alcanzable) | M | 2-3 días |
| 21 | Los 2 TODOs reales de `about_app_screen.tsx` — ver item 3 arriba, ya contado ahí, no duplicar esfuerzo |

---

## Cómo se llegó a esta lista

Este roadmap nació de una sesión anterior que asumió como "pendiente" todo lo que decían los documentos internos sin verificar contra el código — varios items resultaron ya estar hechos (a veces desde hace semanas). La lección aplicada aquí y en `PENDIENTE_BACKEND_ADMIN.md`/`TODO_INVENTORY.md`/`DEAD_SCREENS.md`: cada item de este documento se verificó leyendo el archivo/endpoint real citado, no solo el nombre de la ruta o lo que decía un documento anterior. Cuando un item de aquí se resuelva, actualizar ambos sitios en el mismo commit — es la única forma de que esto no vuelva a desincronizarse.
