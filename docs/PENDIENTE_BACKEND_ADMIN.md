# Pendiente de backend y admin panel

Compilado a partir de `docs/TAREAS.md` y `docs/ONBOARDING_V2.md` (estado a 2026-08-23). Cada item indica qué falta, por qué, y el archivo/endpoint de referencia en la app para no tener que re-investigar desde cero. El frontend (app React Native) ya está preparado/cableado para todo esto salvo que se diga lo contrario — en la mayoría de los casos solo falta la pieza de servidor.

**Actualización 2026-09-10 — este documento está desactualizado, verificar en vivo antes de asumir nada de aquí.** Una auditoría contra las App Store Review Guidelines señaló varios endpoints de este documento como "no implementados todavía" (calendario, feedback, borrado de cuenta, onboarding). Se comprobó cada uno en vivo contra `https://testapp.bestronger.es` (backend real de producción, ver `api/client.ts`) con una petición sin token — una ruta que de verdad no existe responde `404 not_found`; una ruta registrada que solo le falta el token responde `401 unauthenticated`. Los 8 endpoints marcados como pendientes en este documento (`POST v1/onboarding/par-q`, `training-questionnaire`, `nutrition-questionnaire`, `complete`, `POST v1/my-calendar-move-assignments`, `POST v1/app-feedback`, `POST v1/delete-account`) devuelven **401, no 404** — es decir, **ya están registrados en el backend**. No se ha podido verificar desde esta sesión (sin token de usuario real) si la lógica de negocio detrás de cada uno es correcta, solo que la ruta existe y no es un placeholder ausente. Antes de reenviar a revisión, probar cada botón afectado con una cuenta real en TestFlight en vez de asumir que sigue roto por lo que dice el resto de este documento.

**Actualización 2026-09-16 (mañana) — items 1, 3, 5 y 6 confirmados 100% resueltos.** Verificado leyendo el código real de `Bckbs`: los 4 controladores (`OnboardingController::parq/trainingQuestionnaire/nutritionQuestionnaire/complete`, `ClientCalendarController::moveAssignments`, `UserController::deleteUserAccount`, `AppFeedbackController::store`) están implementados de verdad, con validación completa y lógica de negocio real — y las 3 decisiones de producto que quedaban abiertas ya se resolvieron: PAR-Q de riesgo marca `flagged_for_review`; borrado de cuenta es inmediato y total; el admin panel de onboarding y de app-feedback también existen y están cableados.

**Actualización 2026-09-16 (tarde) — segunda pasada completa, casi todo lo que quedaba también estaba resuelto.** Se auditó el resto del documento entero contra el código real de `Bckbs`/`bstronger-admin` (no solo los items marcados prioridad alta). Resultado: items 2, 4, 7, 8, 9, 11 (backend), 12 y **toda** la sección "Motor de Auto-Regulación de Carga" (las 9 piezas listadas) ya estaban resueltos — algunos desde hace semanas, sin que nadie actualizara este documento. También se hicieron cambios reales en esta misma sesión: se eliminó por completo el checkout Stripe/PayPal (la sección "Pagos" de abajo describía como "verificado en producción" un webhook que ya no existe) y se construyó reporte de comentarios + bloqueo de usuario (`COMMUNITY_ENABLED` ya está en `true`). El HealthKit/Health Connect que describía la sección de infraestructura tampoco existe ya en el repo — se quitó por completo, no solo se desactivó. El único item de prioridad alta/media que sigue realmente pendiente de este bloque es el **10** (endpoint de readiness real para el hero de Home) y el seguimiento cliente del **11** (que el cliente use el `group` de `recipe_tags` en vez de su heurística de texto). Detalle de cada uno en su sitio, marcado con la fecha de esta verificación.

---

## Prioridad alta — bloquea features ya visibles en la app

### ~~1. Onboarding v2~~ — ✅ RESUELTO (verificado 2026-09-16)

Los 3 endpoints + `complete` existen y funcionan de verdad en `Bckbs::OnboardingController`, con las tablas `par_q_answers`/`training_questionnaire_answers`/`nutrition_questionnaire_answers` y `users.onboarding_completed_at` ya expuesto como `onboarding_completed` en login/register/update-profile (`UserController.php`, `UserDetailResource.php`). El parche cliente-side de `resolveOnboardingCompleted()` puede retirarse cuando se confirme en dispositivo real que el campo del backend llega bien (no se ha tocado el cliente en esta verificación, solo se confirmó que el backend ya no depende de la aproximación). Admin panel: `admin-onboarding-list`/`admin-onboarding-detail` ya existen (`Bckbs::Admin\OnboardingController`). Decisión de riesgo cardíaco: resuelta — `parq()` marca `flagged_for_review`/`flagged_for_review_at` en el usuario cuando hay riesgo.

### ~~2. Workout demo auto-asignado a usuarios nuevos~~ — ✅ RESUELTO (verificado 2026-09-16)

`database/seeders/DemoWorkoutTemplateSeeder.php` (marca `WorkoutTemplate.is_demo = true`) + `UserController::assignDemoWorkoutIfNeeded()`, llamado desde `register()`. Defensivo: comprueba que el cliente no tenga ya una asignación real antes de tocar nada, y reutiliza el mismo mecanismo del calendario real (`TrainingProgram`/`ProgramClientAssignment`/`ProgramDayAssignment`, programa personal) en vez de una tabla nueva — exactamente como pedía este item.

### ~~3. Reorganizar semana en el calendario~~ — ✅ RESUELTO (verificado 2026-09-16)

`POST v1/my-calendar-move-assignments` existe en `Bckbs::ClientCalendarController::moveAssignments()`, con transacción, verificación de propiedad (`resolveOwnedAssignment`) y validación de que el destino cae en la misma semana ISO — implementación completa, no un stub.

### ~~4. Recursos — imagen por recurso (`image_url`)~~ — ✅ RESUELTO (verificado 2026-09-16)

Columna `image_url` en `resources` (migración `2026_08_30_110001_...`) + `$fillable` en el modelo. `resourceImageSource()` en el cliente ya la usa automáticamente en cuanto el admin la rellene al crear/editar un recurso — no hace falta tocar más el cliente.

### ~~5. "Solicitar función" / "Informar de error"~~ — ✅ RESUELTO (verificado 2026-09-16)

`POST v1/app-feedback` existe en `Bckbs::AppFeedbackController::store()`, con la validación exacta del contrato original. Admin panel también resuelto: `admin-app-feedback-list`/`detail`/`update` (`Bckbs::Admin\AppFeedbackController`) + `AppFeedbackView.tsx` en `bstronger-admin` (listado con filtro por tipo/sección/estado, cambio de estado con confirmación).

---

### ~~6. Borrado de cuenta~~ — ✅ RESUELTO (verificado 2026-09-16)

`POST v1/delete-account` existe en `Bckbs::UserController::deleteUserAccount()`. Decisión de producto ya tomada: borrado inmediato y total (sin periodo de gracia), con guard explícito para que un coach con clientes activos o un admin no pueda autoborrarse por esta vía, y revocación de todos los tokens al momento.

## Prioridad media

### ~~5. Foto de perfil real~~ — ✅ RESUELTO (verificado 2026-09-16)

`UserController::updateProfile` sí acepta el multipart real: `$user->addMediaFromRequest('profile_image')->toMediaCollection('profile_image')` (Spatie MediaLibrary), mismo nombre de campo que manda el cliente.

### ~~6. Cierre de sesión de entrenamiento~~ — ✅ RESUELTO (verificado 2026-09-16)

`POST my-calendar-finish-session` (`ClientCalendarController::finishSession()`) sí es un endpoint de cliente real — duración, `volume_kg`, calorías calculadas (`WorkoutSessionStatsService::computeCalories()`), rating de dificultad, comentario, y calcula los logros de la sesión. No hace falta ningún endpoint nuevo.

### ~~7. Recordatorios locales~~ — ✅ RESUELTO, de forma distinta a la prevista (verificado 2026-09-16)

No se construyó el backend CRUD que este item pedía — en su lugar, `helper/reminderNotifications.ts` + `helper/customRemindersStorage.ts` resuelven todo 100% en el dispositivo: `expo-notifications` para el scheduling real (diario/semanal, agua/comidas/personalizados) y `AsyncStorage` para persistir la lista de recordatorios personalizados. Decisión de arquitectura razonable — la entrega de la notificación es local de todos modos, así que el backend solo habría servido para sincronizar la lista entre dispositivos, algo que no se pidió. `notification_settings_screen.tsx` ya consume ambos helpers.

### ~~8. OTP~~ — ✅ RESUELTO por eliminación (verificado 2026-09-16)

La pantalla y todo el flujo de OTP ya no existen en `App.tsx` — recuperación de contraseña solo por email (`ForgotPasswordEmailScreen`/`ForgotPasswordOptionsScreen`). No hay nada que construir.

### ~~9. Pantallas de vídeo~~ — ✅ RESUELTO por eliminación (2026-09-16, esta sesión)

`MigratedVideo`/`MigratedVideoDetail` borradas de `App.tsx`/`ScreenExplorer.tsx` — decisión explícita del usuario (sin backend ni plan de construirlo).

### 10. Endpoint GET para `readiness_scores` (Recovery/Strain reales del hero de Home) — sigue pendiente (verificado 2026-09-16)

**Ojo, no confundir con el readiness admin (ficha de cliente) — ese sí se resolvió, ver "Motor de Auto-Regulación" más abajo.** Este item es específicamente el endpoint de **cliente** que sustituiría la aproximación de `computeRecoveryScore()` en el hero de Home. `ReadinessController::summary()` (`readiness-summary`) sigue devolviendo solo el stopgap subjetivo (`combined_score`/`band` calculados a mano en el controlador, el propio código comenta "SOLO subjetivo, no HRV/ACWR real") — `acwr` no aparece en ningún controlador de cliente todavía, solo en un comentario señalando que falta. Sigue haciendo falta un `GET` de cliente que lea de la tabla `readiness_scores` real (la que ya alimenta `ReadinessCalculationService` y que el admin ya puede ver en la ficha del cliente).

El motor de readiness de Fase 4 (`app/Services/ReadinessCalculationService.php`, ver `docs/Motor_Auto_Regulacion_Carga_Instalacion.md` §8) ya calcula cada día en `readiness_scores` un `combined_score`/`band` (cruza HRV/sueño de wearable con el cuestionario subjetivo) y un `acwr` (Acute:Chronic Workload Ratio, carga de entrenamiento) — pero **no existe ningún endpoint que lo exponga al cliente**, solo `POST /health-data-points/sync` (ingesta) y los de `adaptive-week-plans`. Falta un `GET /v1/readiness-scores/today` (o similar) que devuelva `{ combined_score, band, acwr, hrv_z_score, sueno_z_score, subjetivo_score, calculated_at }` del registro más reciente del cliente.

**Por qué importa ahora mismo:** el hero de Home (`home_screen_modern_v2.tsx`) tiene dos anillos "Recovery"/"Strain" que hasta 2026-08-24 eran placeholder fijo ("-%"). Recovery ya se rellenó con una estimación 100% cliente (`computeRecoveryScore()`, media del cuestionario subjetivo diario, ver `docs/TAREAS.md` sesión 2026-08-24) mientras este endpoint no exista — pero es una aproximación deliberadamente más pobre que el `combined_score` real (no incorpora HRV/sueño objetivo). Strain sigue sin ningún dato, ni siquiera aproximado, porque ACWR necesita historial de carga de entrenamiento que hoy solo vive calculado en el backend. En cuanto este endpoint exista, sustituir `computeRecoveryScore()` por el dato real y conectar Strain al `acwr`.

### 11. Categorización real de `recipe_tags` — backend ✅ resuelto (verificado 2026-09-16), falta que el cliente lo use

`recipe_tags.group` ya existe (migración `2026_08_30_110003_add_group_to_recipe_tags_table.php`, string libre, `$fillable`) — exactamente la solución "más simple" que proponía este item. **`recipe_category` sigue sin el mismo campo** (verificado, `$fillable` de `RecipeCategory` solo tiene `title`/`slug`/`status`) — si se aborda esto en el admin, seguir aplicando el mismo patrón ahí también.

Lo que queda es 100% cliente: `MigratedRecipeTagList` (`pages/migrated/recipe_tag_list_screen.tsx`) todavía agrupa con la heurística de texto (`CATEGORY_DEFS`) en vez de leer `group` de la respuesta de `recipetag-list` — sustituir eso ya no depende de nadie más.

Motivo original (por si se retoma): `MigratedRecipeTagList` llegó a tener 40-60 chips sueltos en un único wrap, ilegible, de ahí la heurística de agrupar por palabras clave del título en vez de esperar al backend.

### ~~12. Moderación de publicaciones~~ — ✅ RESUELTO por completo (verificado 2026-09-16)

Las 3 piezas que faltaban ya están hechas:

- `report-on-posting` sí persiste en una tabla real consultable (`ReportPosting::create()` → `report_postings`).
- Admin panel: `ReportedPostingView.tsx` (`/reported-postings`) — listado + restaurar/banear/eliminar, conectado a `postings/{id}/status` y `admin-posting-delete`.
- Permiso de borrado ampliado: `PostingController::deletePostdata()` ya acepta `isOwner || isAdmin` (comentario explícito en el código citando "item 12 del backlog" como motivo del cambio).

El pedido original era "que el entrenador o administrador pueda borrar el post desde el admin panel" — esa pieza (panel + permiso ampliado) es 100% backend/admin y queda fuera de este repo (solo frontend de la app). El resto de este item (checkbox de motivo, confirmación al usuario tras reportar) ya está resuelto en el cliente.

---

## Motor de Auto-Regulación de Carga — integración en el admin panel — ✅ TODO RESUELTO (verificado 2026-09-16)

Esta sección completa (las 9 piezas que en algún momento estuvieron sin conectar) ya está resuelta, con `bstronger-admin` ya con repo propio (`git log`/`git pull` normales, ya no vive sin control de versiones en la VPS como decía la nota original). Verificado leyendo el código real de ambos repos, no solo nombres de ruta:

- **Sustituciones de ejercicio** — CRUD admin completo (`GET/POST/PUT/DELETE admin/exercise-substitutions`, `Admin\ExerciseSubstitutionController`) + `ExerciseSubstitutionsView.tsx` en el panel.
- **Achievement events / feed de logros** — `GET admin/achievement-events` (`AchievementEventController::adminIndex`) + tab "Feed de logros" dentro de `UserDetailView.tsx` (ficha del cliente), filtrable por cliente.
- **Readiness scores (admin)** — `GET admin/users/{user}/readiness` (`ReportController::clientReadiness`) + tab de readiness en `UserDetailView.tsx`, mostrando `combined_score`/`band`/`acwr`/`hrv_z_score`/`sueno_z_score` reales — justo lo que pedía este item. (No confundir con el endpoint de **cliente** para el hero de Home, ese sigue pendiente, ver item 10 más arriba.)
- **Reglas de progresión** — `ProgressionRulesView.tsx` conectado al CRUD admin existente.
- **Sugerencias de progresión pendientes** — `ProgressionDecisionsView.tsx` conectado a `approve/edit/reject`.
- **Planes semanales adaptativos** — integrado dentro del propio Panel de Excepciones (`useCoachExceptions.ts` ya llama a `adaptive-week-plans/{id}/approve|reject`), no como pantalla aparte.
- **Excepciones de coach** — `CoachExceptionsView.tsx` conectado.
- **Override de experiencia del cliente** — formulario/diálogo en `UserDetailView.tsx` (`handleSaveTrainingExperience`) conectado a `admin-onboarding-training-experience-update`.
- **Marcar semana de descarga (`is_deload`)** — toggle real por semana en `TrainingProgramsView.tsx` (`handleToggleDeload`), con badge visual "Descarga" en el calendario del mesociclo.

Contrato completo de cada endpoint sigue documentado en `Bckbs`: `docs/Motor_Autorregulacion_Analisis.md` y `docs/Handoff_Rondas1-6_Verificacion.md`, por si hace falta el detalle de payloads/migraciones.

---

## Pagos — 100% presencial, checkout eliminado (2026-09-16)

**Esta sección estaba desactualizada de verdad** — describía como "construido y verificado en producción" un webhook de Stripe que ya no existe. Historial: el modelo de negocio real, confirmado con el usuario el 2026-09-13, es pago presencial (tarjeta o efectivo, directamente con el coach) — nunca por app ni por web. El checkout de Stripe/PayPal (dos sistemas en paralelo: uno vía `Plan`/`PlanSubscription` con webhook, otro más nuevo vía `Package`/`Subscription`) se había construido pero nunca se activó con credenciales reales. El 2026-09-16 se decidió y ejecutó eliminarlo por completo en vez de dejarlo construido-pero-inactivo (mismo criterio ya aplicado en la app para HealthKit): se borraron `StripeWebhookController`, `CheckoutController`, las 5 rutas asociadas, la config de `stripe`/`paypal`/`frontend_url`, y las dependencias de composer.

**Lo que sigue existiendo, sin cambios** — el acceso se sigue concediendo exactamente igual que siempre, vía alta manual del admin (`PlanSubscriptionController::grantPlan()` → `PackageFulfillmentService`/`PlanFulfillmentService`, sin relación con el checkout retirado):

- `GET my-plan` (solo lectura, ya sirve a "Mi plan" en la app).
- `POST admin/plan-subscriptions-grant` — la vía real de alta hoy.

No queda ningún trabajo pendiente en esta área salvo que el modelo de negocio cambie a venta online de verdad, en cuyo caso habría que reconstruir el checkout desde cero (contrato de referencia si hace falta: `docs/PLAN_VENTAS_PROGRAMAS_Y_BLOG.md`, aunque ya no describe código que exista).

### 13. Crear las 6 guías compartidas como `resources` (2026-08-30)

Hasta ahora estas 6 guías vivían como 6 screens nativas de React Native
(`pages/migrated/*_guide_screen.tsx`, con un componente compartido
`GuideBlocks.tsx`), registradas a mano en `App.tsx`. Se han quitado del
código a propósito: cualquier guía nueva (o cambio en una existente)
obligaba a tocar código y sacar un build nuevo de la app, y ese no es el
flujo correcto para contenido que un entrenador quiere poder publicar o
actualizar él mismo. El sistema correcto para esto ya existe y ya está en
producción: `resources` (`api/resources.ts`, `resources_list_screen.tsx`,
`resource_detail_screen.tsx`) — scope `shared`/`assigned`, contenido HTML
renderizado en un WebView con el tema (claro/oscuro) de la app.

**Qué falta crear en el admin panel** — 6 filas nuevas en `resources`, todas
con `scope: "shared"`, `type: "article"`. El HTML de cada una (fragmento,
sin `<style>` propio para que herede el tema de la app — ver nota de
`buildWrapperHtml()` en `resource_detail_screen.tsx`) está en
`docs/resources-html/` de este repo:

| Título                       | Categoría (`category`) | Archivo HTML                                      |
| ---------------------------- | ---------------------- | ------------------------------------------------- |
| Guía de Autogestión          | `entrenamiento`        | `docs/resources-html/guia-autogestion.html`       |
| Guía de Sobrentrenamiento    | `entrenamiento`        | `docs/resources-html/guia-sobrentrenamiento.html` |
| Guía de Suplementación       | `nutricion`            | `docs/resources-html/guia-suplementacion.html`    |
| Guía de Sueño y Recuperación | `habitos_mindset`      | `docs/resources-html/guia-sueno.html`             |
| Guía de Gestión del Estrés   | `habitos_mindset`      | `docs/resources-html/guia-gestion-estres.html`    |
| Manual de Mentalidad         | `habitos_mindset`      | `docs/resources-html/guia-mentalidad.html`        |

Pega el contenido de cada archivo tal cual en el campo `content` del
recurso correspondiente al crearlo desde el admin. No hace falta ninguna
imagen de cabecera — `resource_detail_screen.tsx` no muestra ninguna para
recursos de tipo artículo, solo para la miniatura en el carrusel del Home;
`image_url` ya existe en el backend (ver punto 4 más arriba, resuelto) por
si se quiere rellenar para esa miniatura.

**Lo que se pierde al migrar de screen nativa a HTML** (aceptado
explícitamente, pedido 2026-08-30): la calculadora de dosis de
suplementos, la calculadora de horas de sueño, los acordeones con estado
y los checklists interactivos de la Guía de Sueño/Estrés eran interactivos
de verdad (React state) en las screens nativas — en HTML (sin `<script>`,
saneado por seguridad en `sanitizeHtml()`) pasan a ser contenido de
referencia estático (tablas con ejemplos, listas). El HTML ya sustituye
cada calculadora por una tabla de ejemplo para 2-3 escenarios habituales.

**No se puede crear esto desde el propio repo de la app** — `api/resources.ts`
solo expone `getList`/`getDetail` (lectura), sin ningún endpoint de
creación/edición; la gestión de contenido de `resources` es 100% admin
panel, fuera de este repo.

## Contenido — tareas de panel admin, no de código

- **Ningún `WorkoutTemplate`/`Recipe` de producción está marcado `is_exclusive`/`is_premium` todavía** — el flag ya existe y funciona, falta que el coach decida y marque manualmente qué contenido es exclusivo desde el admin.
- **Catálogo de `Diets`**: solo 1 fila real ("test"). Si se quiere publicar contenido real ahí, hay que crearlo desde el admin.
- **Recetas**: de 5276, 297 quedaron marcadas `inactive` por estar vacías (76 sin ingredientes ni pasos, 221 con pasos pero sin ingredientes); otras 22 tienen ingredientes pero macros en 0; más ampliamente, 429 tienen `protein` en 0/null. Ninguna de las 5276 recetas tiene foto real subida (100% placeholder) — diferido explícitamente, decidir entre subida manual desde el admin o una integración por lote (revisar licencias de imágenes antes).
- **Blog**: bibliografía real vacía en los 4 posts existentes — el acordeón ya está construido en la app, solo falta que el coach la rellene desde el admin.

## Configuración pendiente — datos externos, no backend/admin (actualizado 2026-09-16)

El menú de Ajustes tiene 2 filas (antes 3) construidas y funcionando en cuanto se rellenen estas constantes en `constants/appLinks.ts` — ningún endpoint ni tabla nueva, solo datos reales que solo el usuario tiene:

- ~~`SUPPORT_EMAIL`~~ — **ya no existe en `appLinks.ts`, obsoleto.** "Solicitar una función"/"Informar de un error" dejaron de ser un `mailto:` — son un formulario real contra `POST v1/app-feedback` (ver item 5 de prioridad alta, resuelto), con su propio panel admin. El archivo lo documenta explícitamente: "NO usan este archivo".
- **`APP_STORE_ID`** — ID numérico de la ficha de App Store (el de la URL pública, no el bundle identifier). Sigue vacío — solo se puede rellenar una vez la app tenga ficha publicada en App Store Connect.
- **`PLAY_STORE_PUBLISHED`** — sigue en `false`. Pasar a `true` cuando la ficha de Google Play esté publicada.
- **`SOCIAL_LINKS`** — sigue vacío (`[]`). Array de `{ name, icon, url }`, uno por red social real.

"Enviar registros al desarrollador" y "Habilitar diagnósticos" ya son 100% funcionales sin configuración externa — no dependen de este archivo (ver `helper/logger.ts`: buffer local en memoria + `Share.share()`, sin SDK de terceros).

## Bloqueantes de infraestructura (no son "implementar", pero condicionan features reales)

- **HealthKit/Apple Health/Health Connect — actualizado 2026-09-16: ya no está "deshabilitado", está eliminado del repo.** `helper/health.ts` ya no existe, `HEALTH_SYNC_ENABLED` no aparece en ningún sitio del código — la integración entera se quitó (no solo se ocultó tras un flag, como decía la versión anterior de esta nota). El bloqueante de fondo (Apple no concede HealthKit a un Apple ID gratuito, $99/año de Apple Developer Program) sigue siendo real si algún día se quiere retomar, pero hoy es un "construir desde cero", no "reactivar" — no hay entitlements, permisos ni pantallas de emparejamiento esperando un flag.
- **Wearables (Garmin/Fitbit/Apple Watch/Galaxy Watch)**: sin backend propio, diferido explícitamente.
- **Strava (2026-08-28)**: integración vía Strava API v3 (OAuth2) para traer sesiones/actividades y calcular carga de entrenamiento (mismo motor que HRV/sueño/FC de `readiness_scores`). Diferido explícitamente — no es para esta versión. Requiere: OAuth2 gestionado desde el backend Laravel (redirect_uri propio, refresh de `access_token` cada 6h), tabla `strava_connections` (tokens por usuario), y preferiblemente suscripción a webhooks de Strava (evita el rate limit de polling, ~200 req/15min y ~2000 req/día por app, compartido entre todos los usuarios) en vez de `GET /athlete/activities` por polling. El campo `suffer_score` de cada actividad es el candidato más directo para alimentar la carga sin tener que descargar streams completos. Nada de esto existe todavía ni en la app ni en el backend.

## Seguridad — auditoría pendiente

No es un incidente, es preventivo:

- Qué claves SSH están autorizadas en el VPS (`/root/.ssh/authorized_keys`) y si alguna es obsoleta.
- Si la contraseña de la BD de producción es robusta.
- Rotar la contraseña de la cuenta `demo@bestronger.app` si sigue siendo la puesta durante el incidente de recuperación de datos del 2026-08-05.
- Revisar si hay algún otro usuario con contraseña por defecto/predecible en producción.

### De la auditoría de ciberseguridad del cliente (2026-08-26, ver `SECURITY_AUDIT.md`) — ✅ las 4 verificadas y resueltas (2026-09-16)

El cliente (esta app) ya se auditó a fondo y se corrigieron 6 problemas reales encontrados (token de sesión sin cifrar, tráfico HTTP en Android, WebView sin restricción, logout incompleto, mensajes de error 5xx sin filtrar, contraseña mínima débil). Lo que quedaba pendiente del lado del backend se verificó leyendo el código real de `Bckbs` (ya con repo, ya no hace falta acceso al servidor):

- **Saneado de 5xx** — `app/Exceptions/Handler.php::render()` ya nunca devuelve `message`/stack trace crudo de un 5xx a un cliente API, **independientemente de `APP_DEBUG`** (comentario explícito citando esta misma auditoría) — no depende de que la config de producción esté bien puesta.
- **Rate limiting** — `login`/`forget-password`/`social-mail-login`/`social-otp-login` bajo `throttle:6,1`, `register`/`check-invite-code` bajo `throttle:10,1` (comentario cita "Auditoría de seguridad 2026-08-26").
- **IDOR** — revisado `HabitController`/`ClientHabitController` (hábitos), `PostingController` (posts/comentarios) y `BodyMetricController` (métricas): los 3 controladores client-facing verifican propiedad explícitamente (`where('client_id', auth()->id())` o equivalente `isOwner`/`isAdmin`), con comentarios propios citando fixes de auditorías previas (2026-09-13).
- **Cerrar sesión en todos los dispositivos** — `POST logout-all-devices` (`UserController::logoutAllDevices`) ya existe.

## Auditoría de datos pendiente (no bloqueante)

- Confirmar si algún hábito personalizado real (creado antes del 2026-08-05) se perdió en el incidente `migrate:fresh` que borró la base de datos en vivo ese día, y recrearlo a mano si falta.

---

_No incluido aquí a propósito: trabajo puramente de frontend (rediseños visuales, el error de tipos de `theme.ts`, cambiar iconos a SF Symbols/Material Symbols, limpieza de imports muertos) — nada de eso requiere backend ni admin panel._
