# Pendiente de backend y admin panel

Compilado a partir de `docs/TAREAS.md` y `docs/ONBOARDING_V2.md` (estado a 2026-08-23). Cada item indica qué falta, por qué, y el archivo/endpoint de referencia en la app para no tener que re-investigar desde cero. El frontend (app React Native) ya está preparado/cableado para todo esto salvo que se diga lo contrario — en la mayoría de los casos solo falta la pieza de servidor.

---

## Prioridad alta — bloquea features ya visibles en la app

### 1. Onboarding v2 — 3 cuestionarios (PAR-Q, entrenamiento, nutrición) + estado de completado

Las 36 preguntas ya están construidas y en producción (etapas del `onboarding_v2_screen.tsx`); el cliente ya las envía. Falta:

- **3 endpoints + 3 tablas** — contrato completo (preguntas, JSON de request/response, SQL) ya en `docs/ONBOARDING_V2.md`:
  - `POST v1/onboarding/par-q` → tabla `par_q_answers`
  - `POST v1/onboarding/training-questionnaire` → tabla `training_questionnaire_answers`
  - `POST v1/onboarding/nutrition-questionnaire` → tabla `nutrition_questionnaire_answers`
- **`POST v1/onboarding/complete`** + columna `users.onboarding_completed_at` + devolver `onboarding_completed: boolean` en `UserData` (login/register/update-profile). Sin esto, un usuario que ya completó el onboarding lo vuelve a ver entero si reinstala la app o entra desde otro dispositivo (hoy ese estado solo vive en `AsyncStorage` local). El cliente ya prioriza este campo en cuanto exista (`AuthContext.tsx::resolveOnboardingCompleted()`).
- **Admin panel**: no existe ningún sitio para ver, por cliente, si completó el onboarding ni sus respuestas a los 3 cuestionarios — falta una pantalla/pestaña nueva en la ficha del cliente.
- **Decisión de producto pendiente**: si una respuesta de riesgo cardíaco en el PAR-Q (`parq_heart_condition`/`parq_chest_pain_activity`/`parq_chest_pain_rest_last_month`/`parq_dizziness_balance` = true) debe marcar el perfil para que el coach lo revise antes de asignar un plan.

### 2. Workout demo auto-asignado a usuarios nuevos

Pedido para que el tutorial guiado ("Registra tu primera serie") funcione desde el primer día — sin esto, un usuario nuevo no ve ninguna tarjeta "Tu entrenamiento de hoy" y el tutorial no tiene nada que señalar.

- Sembrar un `WorkoutTemplate` "demo" (con sus `WorkoutTemplateExercise`) una vez en la base de datos — configurando `reps`/`descanso`/`rir`/`rpe` en su primer ejercicio para que el tutorial explique las 4 métricas.
- Al completarse el registro, si el usuario no tiene ningún `ProgramDayAssignment` real todavía, crear una asignación de ese demo para "hoy" — mismo mecanismo que ya usa el calendario real, sin tabla nueva.

### 3. Reorganizar semana en el calendario — endpoint que falta

`my_program_calendar_screen.tsx` ya llama a `workoutHistoryApi.moveCalendarAssignments()` (cambio directo, sin aprobación del coach, pedido explícito por el usuario), pero el endpoint no existe todavía:

- `POST v1/my-calendar-move-assignments` — payload `{ moves: [{ assignment_id, to_date }] }`, valida que cada `assignment_id` pertenezca al cliente autenticado y que `to_date` caiga dentro de la misma semana ISO, actualiza `ProgramDayAssignment.date` directamente. Hasta que exista, "Guardar cambios" falla con "No se pudo guardar".

### 4. Recursos — imagen por recurso (`image_url`)

- Columna `image_url` (string nullable) en `resources`, devuelta en `resource-list`/`resource-detail`.
- UI de admin para subir/asignar la imagen al crear/editar un recurso.
- En cuanto exista, `resourceImageSource()` la usa automáticamente y la app deja de pedir fotos de LoremFlickr — no hace falta tocar más el cliente.

### 5. "Solicitar función" / "Informar de error" — formulario real, falta el endpoint (2026-08-24)

`app_feedback_screen.tsx` (Ajustes → Recursos) ya es un formulario completo y funcional en el cliente — título, descripción, sección relacionada (Entrenamiento/Nutrición/Hábitos/Métricas/Otro), y adjunta el buffer de diagnóstico local si "Habilitar diagnósticos" está activo (`helper/logger.ts::getDiagnosticsReportText()`). Llama a `appFeedbackApi.submit()` (`api/appFeedback.ts`) contra `POST v1/app-feedback`, que todavía no existe — hasta que exista, enviar el formulario falla con el mismo `Alert` de error que cualquier otro formulario de la app cuando el backend responde mal (no es un bug, es el endpoint que falta).

Mismo mecanismo ya usado por la herramienta temporal `ScreenReviewFab`/"Revisar pantalla" (`api/screenReview.ts` → `v1/screen-review-mark`, que sí existe en el backend y sí se ve desde el admin panel) — aplicado aquí a feedback de producto en vez de a la revisión de las 200+ pantallas migradas.

- **`POST v1/app-feedback`** — payload:
  ```json
  {
    "type": "feature_request | bug_report",
    "title": "string, máx 100 caracteres",
    "description": "string",
    "section": "workout | nutrition | habits | metrics | other",
    "section_other": "string opcional, solo si section = other",
    "diagnostics_log": "string opcional, texto plano multilinea",
    "app_version": "string opcional, ej. 1.2.0",
    "platform": "ios | android"
  }
  ```
  Guardar también `user_id` (del token autenticado) y `created_at`. Respuesta: `{ data: { id, ...mismos campos, created_at } }` (el cliente hoy no lee el body de la respuesta, pero conviene devolverlo por consistencia con el resto de la API).
- **Tabla sugerida** `app_feedback`: `id`, `user_id` (FK `users`), `type` (enum), `title`, `description` (text), `section` (enum), `section_other` (nullable), `diagnostics_log` (nullable, text/longtext), `app_version` (nullable), `platform` (nullable), `status` (enum: `open`/`reviewed`/`closed`, default `open` — para que el admin pueda marcarlos como gestionados), `created_at`, `updated_at`.
- **Admin panel**: pantalla nueva (listado + filtro por `type`/`section`/`status`, detalle con el `diagnostics_log` completo) — no existe todavía ningún sitio para verlos, que es justo el problema que este endpoint resuelve para el administrador.

---

## Prioridad media

### 5. Foto de perfil real — verificar subida en backend

`edit_profile_screen.tsx` ya manda la foto como multipart real (`buildProfileFormData()`, mismo patrón que `api/posts.ts`). **Sin verificar contra el backend real**: no hay forma de confirmar desde aquí que `UserController::updateProfile` acepta de verdad un fichero en el campo `profile_image` dentro de un multipart — no hay precedente de subida real de avatar en esta app. Si al probar en dispositivo la foto no se actualiza, revisar primero el nombre de campo esperado por el backend.

### 6. Cierre de sesión de entrenamiento — endpoint de cliente

No existe ningún endpoint de "cerrar sesión de entrenamiento" accesible para un cliente normal — `POST workout-session-review-store` existe pero está protegido por rol admin/coach y su forma de datos no encaja con un cierre de cliente. Hoy "FINALIZAR ENTRENAMIENTO" solo confirma y navega de vuelta (las series ya se guardan una a una vía `my-calendar-log-sets`). Si se quiere un cierre de sesión real (duración total, calorías, etc.), hace falta un endpoint nuevo.

### 7. Recordatorios locales — backend bloqueado

`set_reminder_screen.tsx`/`reminder_screen.tsx` no tienen ningún endpoint CRUD de recordatorios individuales (solo existe `set-reminder-settings`, que solo acepta las claves agregadas de agua/comidas). Bloqueado también en el cliente por falta de una librería de notificaciones locales instalada — hay que decidir ambas piezas juntas antes de conectar esto de verdad.

### 8. OTP — sin backend real

`otp_screen.tsx` navega a la verificación, pero no existe ningún endpoint de "enviar OTP" en el backend ni integración de Firebase Phone Auth. Requiere un proveedor de SMS/Firebase o un endpoint dedicado.

### 9. Pantallas de video — decidir

No existe ningún módulo de video en `routes/api.php`. Pendiente decidir si se construye ese backend (subida/streaming) o se elimina esta sección de la app.

### 10. Endpoint GET para `readiness_scores` (Recovery/Strain reales del hero de Home)

El motor de readiness de Fase 4 (`app/Services/ReadinessCalculationService.php`, ver `docs/Motor_Auto_Regulacion_Carga_Instalacion.md` §8) ya calcula cada día en `readiness_scores` un `combined_score`/`band` (cruza HRV/sueño de wearable con el cuestionario subjetivo) y un `acwr` (Acute:Chronic Workload Ratio, carga de entrenamiento) — pero **no existe ningún endpoint que lo exponga al cliente**, solo `POST /health-data-points/sync` (ingesta) y los de `adaptive-week-plans`. Falta un `GET /v1/readiness-scores/today` (o similar) que devuelva `{ combined_score, band, acwr, hrv_z_score, sueno_z_score, subjetivo_score, calculated_at }` del registro más reciente del cliente.

**Por qué importa ahora mismo:** el hero de Home (`home_screen_modern_v2.tsx`) tiene dos anillos "Recovery"/"Strain" que hasta 2026-08-24 eran placeholder fijo ("-%"). Recovery ya se rellenó con una estimación 100% cliente (`computeRecoveryScore()`, media del cuestionario subjetivo diario, ver `docs/TAREAS.md` sesión 2026-08-24) mientras este endpoint no exista — pero es una aproximación deliberadamente más pobre que el `combined_score` real (no incorpora HRV/sueño objetivo). Strain sigue sin ningún dato, ni siquiera aproximado, porque ACWR necesita historial de carga de entrenamiento que hoy solo vive calculado en el backend. En cuanto este endpoint exista, sustituir `computeRecoveryScore()` por el dato real y conectar Strain al `acwr`.

### 11. Categorización real de `recipe_tags` (hoy es una heurística por texto en el cliente)

`recipetag-list` devuelve las etiquetas de receta **completamente planas** — solo `{id, title, slug, status, recipe_tag_image}`, sin ningún campo de agrupación/categoría. La pantalla `MigratedRecipeTagList` (`pages/migrated/recipe_tag_list_screen.tsx`) llegó a tener 40-60 chips sueltos en un único wrap, ilegible ("esta screen es una locura"), así que se agrupan client-side por **coincidencia de palabras clave en el título** (`CATEGORY_DEFS`, rediseñado 2026-08-24 en 8 categorías: Duración, Pérdida de grasa, Subida de masa muscular, Rendimiento deportivo, Recetas de comunidades de España, Países, Tipo de dieta, Tipo de receta, más "Otros" de cierre). **Es una heurística de texto, no un contrato con el backend** — cualquier tag cuyo título no contenga ninguna de las palabras clave cae en "Otros", y el resultado depende por completo de cómo el equipo de contenido haya titulado cada tag (ej. una etiqueta literal "Andalucía" sin adjetivo "andaluza" no clasificaría en Comunidades de España con el regex actual).

**Lo que se necesita para hacerlo bien de verdad:** añadir un campo de grupo/categoría real a `recipe_tags` — lo más simple, una columna `group` (enum o string corto: `duration | fat_loss | muscle_gain | performance | spain_regional | country | diet | meal_type | other`) que el admin pueda fijar al crear/editar cada tag; lo más flexible, una tabla `recipe_tag_groups` (`id`, `key`, `label`, `icon`, `sort_order`) + FK `recipe_tags.recipe_tag_group_id`, para poder añadir/renombrar grupos desde el admin sin desplegar la app. `recipetag-list` debería devolver ese grupo (o anidar ya la respuesta por grupo) para que el cliente deje de adivinar por texto.

**Mismo problema, alcance más amplio (no verificado en esta sesión, mencionar por si aplica):** `recipe_category` (el concepto separado de "categorías" que usa `MigratedRecipeCategoryList`, `RecipeCategory` en `api/recipes.ts`) podría tener la misma limitación de lista plana sin agrupación — no se investigó a fondo porque no era el pedido de esta sesión (solo `MigratedRecipeTagList`), pero si se aborda el backend de tags, vale la pena revisar si categorías tiene el mismo hueco.

### 12. Moderación de publicaciones — reportar + borrado desde admin (2026-08-25)

`post_details_screen.tsx` tenía el botón "más opciones" (icono `ellipsis-horizontal`) sin `onPress`, sin ningún menú detrás. Se ha cableado en el cliente para abrir "Reportar publicación" → llama a `postsApi.report(postId, reason)` (`api/posts.ts`, `POST report-on-posting` con `{ posting_id, reason }`), que ya existía en el wrapper de API pero no se usaba desde ninguna pantalla — no se ha inventado ningún endpoint nuevo en el cliente.

Lo que falta confirmar/construir en el backend y el admin panel para que esto sirva de algo:

- **Verificar que `report-on-posting` persiste el reporte** en una tabla consultable (sugerida `posting_reports`: `id`, `posting_id` FK, `reporter_user_id` FK, `reason` (string/enum), `status` (enum `pending`/`reviewed`/`dismissed`, default `pending`), `created_at`) — hoy no hay forma de confirmar desde este repo (solo frontend) si el endpoint ya hace esto o solo responde OK sin guardar nada.
- **Admin panel**: pantalla nueva de "Publicaciones reportadas" — listado (con el `reason`, quién reportó, contenido/autor del post, fecha) + acción de borrar el post directamente desde ahí. No existe ningún sitio hoy para que un entrenador/admin vea reportes.
- **Permiso de borrado ampliado**: `postsApi.deletePost()` (`POST delete-userpost`) ya existe y se usa en `community_screen.tsx`, pero ahí solo se ofrece al propio autor (`item.canEdit`, que viene del backend). Para que un entrenador/admin pueda borrar la publicación de otro usuario desde el panel, el backend necesita permitir `delete-userpost` también a roles admin/coach sobre posts ajenos (hoy no verificable desde aquí si `delete-userpost` ya contempla esto o solo acepta al propietario).

El pedido original era "que el entrenador o administrador pueda borrar el post desde el admin panel" — esa pieza (panel + permiso ampliado) es 100% backend/admin y queda fuera de este repo (solo frontend de la app). El resto de este item (checkbox de motivo, confirmación al usuario tras reportar) ya está resuelto en el cliente.

---

## Pagos — checkout externo (no es trabajo de este backend/admin, pero es el bloqueante real)

La compra **dentro de la app se eliminó por completo** (cumplimiento de políticas de Apple/Google): el cliente paga en la web `bestronger.es`, la app es solo login + contenido ya desbloqueado. Todo el lado de este repo/backend/admin ya está construido y verificado en producción:

- `GET my-plan` (solo lectura, ya sirve a "Mi plan" en la app).
- `POST webhooks/stripe` — verificado de punta a punta con payloads firmados reales, idempotente.

**Lo que falta es 100% externo a este proyecto:**

- La página de checkout real en `bestronger.es` (fuera de este repo) — el contrato que necesita (`client_reference_id` = user id, `metadata.plan_id` = plan comprado en la Stripe Checkout Session) ya está documentado.
- Credenciales reales de Stripe (`STRIPE_SECRET_KEY`/`STRIPE_PUBLIC_KEY`/`STRIPE_WEBHOOK_SECRET`, hoy vacías en `.env`).

## Contenido — tareas de panel admin, no de código

- **Ningún `WorkoutTemplate`/`Recipe` de producción está marcado `is_exclusive`/`is_premium` todavía** — el flag ya existe y funciona, falta que el coach decida y marque manualmente qué contenido es exclusivo desde el admin.
- **Catálogo de `Diets`**: solo 1 fila real ("test"). Si se quiere publicar contenido real ahí, hay que crearlo desde el admin.
- **Recetas**: de 5276, 297 quedaron marcadas `inactive` por estar vacías (76 sin ingredientes ni pasos, 221 con pasos pero sin ingredientes); otras 22 tienen ingredientes pero macros en 0; más ampliamente, 429 tienen `protein` en 0/null. Ninguna de las 5276 recetas tiene foto real subida (100% placeholder) — diferido explícitamente, decidir entre subida manual desde el admin o una integración por lote (revisar licencias de imágenes antes).
- **Blog**: bibliografía real vacía en los 4 posts existentes — el acordeón ya está construido en la app, solo falta que el coach la rellene desde el admin.

## Configuración pendiente — datos externos, no backend/admin (2026-08-24)

El menú de Ajustes (`home_screen_modern_v2.tsx`) tiene 3 filas construidas y funcionando en cuanto se rellene una constante en `constants/appLinks.ts` — ningún endpoint ni tabla nueva, solo valores que hoy están vacíos a propósito (mientras estén vacíos, la app avisa "aún no configurado" en vez de abrir un enlace roto):

- **`SUPPORT_EMAIL`** — email real de soporte. Alimenta "Solicitar una función" e "Informar de un error" (abren un `mailto:` con el asunto ya puesto).
- **`APP_STORE_ID`** — ID numérico de la ficha de App Store (el de la URL pública, no el bundle identifier). Alimenta "Valora BeFit en la tienda" en iOS.
- **`PLAY_STORE_PUBLISHED`** — pasar a `true` cuando la ficha de Google Play esté publicada (el `package` ya se lee de `app.json`, no hace falta duplicarlo). Alimenta la misma fila en Android.
- **`SOCIAL_LINKS`** — array de `{ name, icon, url }`, uno por red social real (Instagram/X/etc.). Vacío = la fila de iconos no se muestra en absoluto.

"Enviar registros al desarrollador" y "Habilitar diagnósticos" ya son 100% funcionales sin configuración externa — no dependen de este archivo (ver `helper/logger.ts`: buffer local en memoria + `Share.share()`, sin SDK de terceros).

## Bloqueantes de infraestructura (no son "implementar", pero condicionan features reales)

- **HealthKit en iOS requiere Apple Developer Program de pago ($99/año)** — el proyecto firma sus IPA con un Apple ID personal/gratuito, y Apple no concede la capability HealthKit a cuentas gratuitas. Hasta entonces, "Apple Salud" queda oculto en iOS (Android/Health Connect no tiene esta restricción). Cuando se resuelva: añadir `com.apple.developer.healthkit`(`.background-delivery`) a `befit.entitlements`, configurar `DEVELOPMENT_TEAM` real, reactivar la tarjeta en `link_device_choice_screen.tsx`.
- **Apple Health / Health Connect** (el resto de la integración): librerías instaladas y `helper/health.ts` construido, pero requiere `expo prebuild` + rebuild nativo completo (Android+iOS) para poder probarse siquiera — no ejecutado todavía por ser una acción de mayor alcance.
- **Wearables (Garmin/Fitbit/Apple Watch/Galaxy Watch)**: sin backend propio, diferido explícitamente.
- **Strava (2026-08-28)**: integración vía Strava API v3 (OAuth2) para traer sesiones/actividades y calcular carga de entrenamiento (mismo motor que HRV/sueño/FC de `readiness_scores`). Diferido explícitamente — no es para esta versión. Requiere: OAuth2 gestionado desde el backend Laravel (redirect_uri propio, refresh de `access_token` cada 6h), tabla `strava_connections` (tokens por usuario), y preferiblemente suscripción a webhooks de Strava (evita el rate limit de polling, ~200 req/15min y ~2000 req/día por app, compartido entre todos los usuarios) en vez de `GET /athlete/activities` por polling. El campo `suffer_score` de cada actividad es el candidato más directo para alimentar la carga sin tener que descargar streams completos. Nada de esto existe todavía ni en la app ni en el backend.

## Seguridad — auditoría pendiente

No es un incidente, es preventivo:

- Qué claves SSH están autorizadas en el VPS (`/root/.ssh/authorized_keys`) y si alguna es obsoleta.
- Si la contraseña de la BD de producción es robusta.
- Rotar la contraseña de la cuenta `demo@bestronger.app` si sigue siendo la puesta durante el incidente de recuperación de datos del 2026-08-05.
- Revisar si hay algún otro usuario con contraseña por defecto/predecible en producción.

### De la auditoría de ciberseguridad del cliente (2026-08-26, ver `SECURITY_AUDIT.md`)

El cliente (esta app) ya se auditó a fondo y se corrigieron 6 problemas reales encontrados (token de sesión sin cifrar, tráfico HTTP en Android, WebView sin restricción, logout incompleto, mensajes de error 5xx sin filtrar, contraseña mínima débil). Lo que queda pendiente depende 100% del backend (Laravel, no está en este repo) y no se ha podido verificar:

- **Sanear los mensajes de error 5xx en origen** — el cliente ya mitiga esto (sobrescribe `message` en cualquier respuesta `status>=500` antes de mostrarla), pero es un parche, no la causa raíz. Confirmar que `APP_DEBUG=false` en producción y que el `Handler` de excepciones de Laravel no devuelve `message`/stack trace crudo en las respuestas JSON de error — si hoy lo hace, cualquier 500 real sigue filtrando detalle interno en los logs del servidor aunque el cliente ya no lo muestre.
- **Rate limiting en login/registro/recuperación de contraseña/OTP** — no verificable desde el cliente. Confirmar que las rutas de auth tienen `throttle` (o equivalente) aplicado; sin esto, la app es vulnerable a fuerza bruta y credential stuffing.
- **IDOR / control de acceso real** — confirmar que endpoints como `userpost-detail?id=`, los de hábitos (`habit_id`), métricas corporales, etc. verifican que el recurso solicitado pertenece al usuario autenticado (o a su coach) antes de devolverlo o modificarlo. No se pudo probar sin acceso al backend — el cliente solo confirma que estos IDs viajan como parámetros normales, el control de acceso real tiene que vivir aquí.
- **Cerrar sesión en todos los dispositivos / revocación de tokens** — hoy no existe ningún mecanismo (el `api_token` no expira ni se puede invalidar remotamente salvo que el usuario haga logout manual en ese mismo dispositivo). Si se quiere ofrecer "cerrar sesión en todos los dispositivos" o revocar un token robado, hace falta un endpoint nuevo + lógica de invalidación en el backend.

## Auditoría de datos pendiente (no bloqueante)

- Confirmar si algún hábito personalizado real (creado antes del 2026-08-05) se perdió en el incidente `migrate:fresh` que borró la base de datos en vivo ese día, y recrearlo a mano si falta.

---

_No incluido aquí a propósito: trabajo puramente de frontend (rediseños visuales, el error de tipos de `theme.ts`, cambiar iconos a SF Symbols/Material Symbols, limpieza de imports muertos) — nada de eso requiere backend ni admin panel._
