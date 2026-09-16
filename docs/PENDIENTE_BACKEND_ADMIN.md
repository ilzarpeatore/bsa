# Pendiente de backend y admin panel

Compilado a partir de `docs/TAREAS.md` y `docs/ONBOARDING_V2.md` (estado a 2026-08-23). Cada item indica qué falta, por qué, y el archivo/endpoint de referencia en la app para no tener que re-investigar desde cero. El frontend (app React Native) ya está preparado/cableado para todo esto salvo que se diga lo contrario — en la mayoría de los casos solo falta la pieza de servidor.

**Actualización 2026-09-10 — este documento está desactualizado, verificar en vivo antes de asumir nada de aquí.** Una auditoría contra las App Store Review Guidelines señaló varios endpoints de este documento como "no implementados todavía" (calendario, feedback, borrado de cuenta, onboarding). Se comprobó cada uno en vivo contra `https://testapp.bestronger.es` (backend real de producción, ver `api/client.ts`) con una petición sin token — una ruta que de verdad no existe responde `404 not_found`; una ruta registrada que solo le falta el token responde `401 unauthenticated`. Los 8 endpoints marcados como pendientes en este documento (`POST v1/onboarding/par-q`, `training-questionnaire`, `nutrition-questionnaire`, `complete`, `POST v1/my-calendar-move-assignments`, `POST v1/app-feedback`, `POST v1/delete-account`) devuelven **401, no 404** — es decir, **ya están registrados en el backend**. No se ha podido verificar desde esta sesión (sin token de usuario real) si la lógica de negocio detrás de cada uno es correcta, solo que la ruta existe y no es un placeholder ausente. Antes de reenviar a revisión, probar cada botón afectado con una cuenta real en TestFlight en vez de asumir que sigue roto por lo que dice el resto de este documento.

**Actualización 2026-09-16 (mañana) — items 1, 3, 5 y 6 confirmados 100% resueltos.** Verificado leyendo el código real de `Bckbs`: los 4 controladores (`OnboardingController::parq/trainingQuestionnaire/nutritionQuestionnaire/complete`, `ClientCalendarController::moveAssignments`, `UserController::deleteUserAccount`, `AppFeedbackController::store`) están implementados de verdad, con validación completa y lógica de negocio real — y las 3 decisiones de producto que quedaban abiertas ya se resolvieron: PAR-Q de riesgo marca `flagged_for_review`; borrado de cuenta es inmediato y total; el admin panel de onboarding y de app-feedback también existen y están cableados.

**Actualización 2026-09-16 (tarde) — segunda pasada completa, casi todo lo que quedaba también estaba resuelto.** Se auditó el resto del documento entero contra el código real de `Bckbs`/`bstronger-admin` (no solo los items marcados prioridad alta). Resultado: items 2, 4, 7, 8, 9, 11 (backend), 12 y **toda** la sección "Motor de Auto-Regulación de Carga" (las 9 piezas listadas) ya estaban resueltos — algunos desde hace semanas, sin que nadie actualizara este documento. También se hicieron cambios reales en esta misma sesión: se eliminó por completo el checkout Stripe/PayPal (la sección "Pagos" de abajo describía como "verificado en producción" un webhook que ya no existe) y se construyó reporte de comentarios + bloqueo de usuario (`COMMUNITY_ENABLED` ya está en `true`). El HealthKit/Health Connect que describía la sección de infraestructura tampoco existe ya en el repo — se quitó por completo, no solo se desactivó. El único item de prioridad alta/media que sigue realmente pendiente de este bloque es el **10** (endpoint de readiness real para el hero de Home) y el seguimiento cliente del **11** (que el cliente use el `group` de `recipe_tags` en vez de su heurística de texto). Detalle de cada uno en su sitio, marcado con la fecha de esta verificación.

---

## ~~Integración onboarding: 3 campos nuevos + endpoint nuevo~~ — ✅ CLIENTE RESUELTO (2026-09-16 noche, commit `6c8dd0d`)

Fuente original: documento `INTEGRACION_APP_ONBOARDING_2026-09-16.md` (aportado por otra sesión que trabajó en `Bckbs`, rama `feature/onboarding-safety-and-preferences`). Los 3 endpoints tienen 13 tests de feature en verde contra un esquema MySQL real (`tests/Feature/OnboardingSafetyAndPreferencesTest.php`).

**Cliente (esta app) ya implementado**:

1. **`POST v1/onboarding/par-q`** — `constants/onboardingV2Questions.ts` gana las 3 preguntas nuevas; `parq_pregnant_or_possible`/`parq_menstrual_change_or_stress_fracture` usan el campo `showIf` nuevo del tipo `OnboardingQuestion` (`types/onboardingV2.ts`) para mostrarse/enviarse solo si la respuesta ya dada a `gender` en la etapa 1 es `'female'`; `parq_eating_disorder_history` siempre. `api/onboardingV2.ts` (`ParQPayload`) y `submitStage()` en `onboarding_v2_screen.tsx` ya envían los 3.
2. **`POST v1/onboarding/nutrition-questionnaire`** — las 3 preguntas de disponibilidad de cocina añadidas a la etapa `nutrition_questionnaire`, payload ampliado y enviado.
3. **`POST v1/onboarding/training-availability-update`** — pantalla nueva `pages/migrated/training_availability_screen.tsx` (`MigratedTrainingAvailability`, menú Perfil > Preferencias > "Disponibilidad de entrenamiento"). Decisión de diseño: el backend no expone ningún GET para leer la disponibilidad actual, así que la pantalla **no preselecciona ningún valor por defecto** — el botón "Guardar" se queda deshabilitado hasta que el cliente elige explícitamente días y duración, para no arriesgarse a sobreescribir con un valor que no es el real.

`npx tsc --noEmit` limpio.

**Backend — sigue siendo lo único que falta para que esto funcione en producción**: [`Bckbs` PR #19](https://github.com/ilzarpeatore/Bckbs/pull/19) creado (sin conflictos con `main`, comparado por API — los 2 commits de diferencia en `main` tocan `readiness-scores-latest`, sin solapar archivos) pero **sin fusionar** — pendiente de tu confirmación explícita antes de tocar el backend de producción. Después de fusionar, falta el deploy a la VPS (`git pull`, ver item `0c` de `docs/ROADMAP.md`).

**Nota de producto, no bloqueante**: clientes que ya completaron el onboarding antes del 2026-09-16 tienen estos 3 campos nuevos de par-q/nutrición a `NULL` en BD — sin backfill posible, decisión de si se les vuelve a preguntar en la app queda pendiente.

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

### ~~10. Endpoint GET para `readiness_scores` (Recovery/Strain reales del hero de Home)~~ — ✅ RESUELTO (2026-09-16)

**No confundir con el readiness admin (ficha de cliente) — ese es otro endpoint, ya resuelto antes, ver "Motor de Auto-Regulación" más abajo.** Este item era el endpoint de **cliente**: `GET v1/readiness-scores-latest` (`Bckbs::ReadinessController::latest()`, PR [`Bckbs#18`](https://github.com/ilzarpeatore/Bckbs/pull/18) — código escrito y verificado con `route:list`/`php -l`, pendiente de mergear/desplegar) devuelve `{ has_data, date, combined_score, band, acwr, hrv_z_score, sueno_z_score, subjetivo_score, calculated_at }` del `readiness_scores` más reciente del cliente autenticado.

Cliente ya cableado (`home_screen_modern_v2.tsx`): el anillo Recovery prioriza `combined_score` real en cuanto `has_data` es `true`, cayendo a la estimación subjetiva (`computeRecoveryScore()`) solo cuando no hay datos todavía; Strain ahora muestra el `acwr` real normalizado a 0-100 (`normalizeAcwr()`, réplica exacta de la fórmula del backend) en vez del placeholder fijo "-%" — sigue en placeholder solo cuando no hay `acwr` (no tiene fallback subjetivo, no hay forma honesta de aproximarlo).

**Nota real, importante para expectativas**: `hrv_z_score`/`sueno_z_score` van a salir siempre `null` en la práctica — la app ya no sincroniza datos de wearable (`helper/health.ts` se eliminó del repo, ver sección de infraestructura más abajo), así que `combined_score` hoy se compone solo de `subjetivo_score` + `acwr`, no del cruce completo HRV/sueño/subjetivo que describe el documento original del Motor.

### ~~11. Categorización real de `recipe_tags`~~ — ✅ RESUELTO por completo (backend 2026-09-16, cliente 2026-09-16)

`recipe_tags.group` ya existe (migración `2026_08_30_110003_add_group_to_recipe_tags_table.php`, string libre, `$fillable`, devuelto por `RecipeTagResource`) — exactamente la solución "más simple" que proponía este item. `MigratedRecipeTagList` (`pages/migrated/recipe_tag_list_screen.tsx::classifyTag()`) ya lo usa primero cuando el admin lo ha rellenado para un tag (`GROUP_KEY_BY_BACKEND_VALUE`), y cae a la heurística de texto original (`CATEGORY_DEFS`) solo para los tags que el admin todavía no ha categorizado — sin heurística "a ciegas" para el catálogo ya etiquetado, y sin romper nada mientras se migra el resto.

**`recipe_category` sigue sin el mismo campo** (verificado, `$fillable` de `RecipeCategory` solo tiene `title`/`slug`/`status`) — si se aborda esto en el admin, aplicar el mismo patrón ahí también.

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

### Deuda de verificación — ✅ Rondas 7-16 verificadas contra BD real (2026-09-16 noche), 1 bug crítico encontrado

Lo de arriba (las 9 piezas) es sobre el ADMIN PANEL. Esta sección es sobre el motor backend en sí — `docs/Motor_Autorregulacion_Analisis.md` en `Bckbs`, 45 ítems en 16 rondas. Hasta esta sesión solo las Rondas 1-6 (ítems 1-22) se habían probado contra datos reales (VPS, 2026-09-07, 1 bug encontrado y corregido — `JSON_CONTAINS`, commit `49d8d6e`); las Rondas 7-16 (ítems 23-45) solo habían pasado `php -l` en un sandbox sin BD.

**Metodología**: todas las pruebas corrieron en la propia VPS (`bestronger-vps`, `/var/www/testapp`, ya en `main` `3637166` tras el deploy de esta misma sesión) dentro de `DB::beginTransaction()`/`rollBack()` — nada quedó persistido salvo el bugfix real (ver abajo). IDs de cliente/ejercicio/coach reales del propio `testapp.bestronger.es`, con datos sintéticos solo donde no había suficiente historial real (p. ej. no existía ninguna fila en `exercise_substitutions` todavía).

**Verificado por ejecución real contra BD (24 aserciones, todas en verde):**

- **Ítem 25** (nivel de experiencia) — `resolveNivelExperiencia()`: sin fila → `null`; `effectiveExperienceMonths()` prioriza el override del coach sobre lo autoevaluado. Correcto.
- **Ítem 30/32** (sustitución inteligente) — `findSubstitution()` prioriza la variante etiquetada con el motivo inferido, cae a la genérica sin `category` si no hay etiquetada; `resolveSubstitutionStartingWeight()` con `carga_ratio=0.8` propone `referencia×0.8` exacto. Correcto.
- **Ítem 40** (redondeo por `increment_kg`) — con `increment_kg=1.25` (ejercicio real "Press inclinado con barra") el resultado redondea a múltiplos de 1.25 ignorando el `RoundingMode` de la regla; sin `increment_kg` cae correctamente al `RoundingMode` de la regla. Correcto.
- **Ítem 41** (`rol_ejercicio`) — con un bloque real de 2 ejercicios (`workout_template_block_id=485`), el de menor `sequence` devuelve 1.0 (principal), el otro 0.0 (accesorio); sin slot prescrito, `null`. Correcto.
- **Ítem 42** (`dolor_reciente_no_bloqueante`) — sin reportes → 0.0; molestia leve intensidad<4 → 1.0; intensidad≥4 (bloqueante) → 0.0. Correcto.
- **Ítem 43** (N-de-M, el cambio conceptual más grande del lote) — grupo de 3 condiciones con `min_condiciones_requeridas=2` en una de ellas, cumpliendo exactamente 2 de 3 → la regla **gana**; el mismo grupo sin ese campo configurado exige las 3 (AND estricto) → **pierde** con solo 2 de 3. Correcto, sin regresión para reglas ya existentes.
- **Ítem 45** (semana de descarga) — `detectOutliers()`: en semana de descarga una bajada fuerte (50 vs. media 100) suprime el outlier; una subida fuerte (150) lo sigue marcando igual que siempre; fuera de semana de descarga, comportamiento idéntico al de antes (sin regresión). `markWeekDeload()`: `UPDATE` masivo actualiza las 7 filas reales de una semana de un programa real; una semana sin filas devuelve 0 actualizadas (404 en el controlador). Correcto.
- **Ítems 33-36** (feed de logros) — umbral de mejora escalado por experiencia (novato 4% / intermedio 2.5% / avanzado 1%) correcto en los 3 casos; el fix del bug real de Rondas 1-15 (`MEJOR_MARCA_RECIENTE` autoanulándose) **sigue funcionando**: un guardado que supera el "mejor reciente" (95) pero no el histórico (100) genera `MEJOR_MARCA_RECIENTE` con `previous_best` correcto, y NO genera `pr_carga`; `MANTIENE_FUERZA_EN_DEFICIT` se genera una vez para un cliente `lose_fat` un 2% por debajo de su histórico y NO se repite el mismo día (cooldown). Correcto.

**Verificado por lectura de código (lógica simple/trivial, o ya cubierta indirectamente arriba), sin ejecución dedicada:** ítem 26-29 (tonelaje — `volumen_total` confirmado poblado con datos reales de sesiones recientes durante la exploración, fórmula igual a `MuscleVolumeService`), ítem 38 (`reps_en_tope_rango`, usa el mismo `resolveLastPrescribed()` ya ejercitado indirectamente), ítem 39 (`rir_delta_serie_top`, lectura directa de columna, sin lógica), ítem 37 (`averageBestSet`, media de `TREND_WINDOW=3` sesiones con comparación por epsilon, coincide exacto con el código), ítem 44 (`acciones_bajada_en_sesion`, propiedad de instancia no reseteada en `resetEvaluationCache()`, confirmado por lectura).

**Gap real encontrado (menor, no bloqueante)**: `inferSubstitutionMotivo()` (ítem 31) no mapea `DOLOR_RECIENTE_NO_BLOQUEANTE` (Ronda 13) a un motivo `'dolor'` — el propio comentario del código ya lo señala como pendiente ("debería mapear a 'dolor' aquí"). Si una regla de sustitución usa esa variable, `findSubstitution()` no prioriza una variante etiquetada `dolor`, cae a la genérica. Fácil de arreglar si se quiere cerrar del todo.

### ~~🔴 Bug crítico~~ — ✅ RESUELTO Y DESPLEGADO (2026-09-16 noche) — `maybeRecordPrReps` rompía el guardado de series para clientes de pago

Hallazgo colateral de la verificación de arriba, no parte del checklist original. `ClientExerciseLogObserver::maybeRecordPrReps()` generaba `WHERE id IN (SELECT ... LIMIT 200)` — MySQL 8.0.46 **rechaza siempre** un `LIMIT` dentro de una subquery de `IN` (`Error 1235`, restricción real del motor, confirmada con una query de solo lectura antes de tocar nada, independiente de los datos). Se dispara en **todo guardado de serie con peso y reps de cualquier cliente con `access_tier != 'free'`** (`writeAchievementEvents()` la llama sin try/catch, y `logSets()` no envuelve la creación del log) — el cliente recibía un 500 al guardar cada serie. Probablemente sin incidencia reportada todavía porque este entorno tiene muy pocos clientes de pago activos.

**Fix**: [`Bckbs` PR #21](https://github.com/ilzarpeatore/Bckbs/pull/21) — resuelve las IDs candidatas en una query aparte (`pluck`) antes del `whereIn` principal, mismo resultado sin el `LIMIT` dentro del `IN`. **Fusionado a `main` (commit `9fba012`) y desplegado a la VPS** con confirmación explícita del usuario (2026-09-16 noche). Verificado dos veces contra la BD real (transacción con rollback, nada persistido): antes del fix, contra código aislado (query sola); después del fix, **contra el código ya desplegado en producción disparando el observer real completo** (`ClientExerciseLog::create()`) — ya no lanza excepción, y genera correctamente `pr_reps`/`pr_carga`/`mejora_e1rm` con los valores y `previous_best` esperados en una secuencia de 3 guardados reales.

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

## Ronda 3 de auditoría de seguridad — checklist de otra sesión (2026-09-16 noche)

Lista traída de otra sesión de Claude Code que auditó `bckbs`/`bstronger-admin` con foco en permisos/auth/dependencias. Se clasifica aquí qué requiere tu decisión/acceso y qué es ejecutable ya. **Corrección respecto a esa sesión**: esta sesión sí tiene acceso SSH al VPS (`bestronger-vps`, ver memoria) — los items 7 y 8 que aquella marcó como "no puedo hacerlo" sí son ejecutables desde aquí, solo que igualmente conviene tu confirmación antes de tocar el servidor de producción.

| #   | Tarea                                                                                                                                                                                                              | Estado                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ANTHROPIC_API_KEY` como secret en `bsa`/`Bckbs`/`bstronger-admin` (necesario para que el check `security-review`/`Claude Code Security Review` deje de fallar en cada PR, ver hallazgo de esta sesión 2026-09-16) | **Verificado: falta en los 3 repos** (`bstronger-admin` no tiene ningún secret configurado todavía). Solo tú puedes añadirlo — GitHub cifra secrets del lado del cliente, no hay API de lectura/escritura de valor disponible aquí |
| 2   | Verificar nombres reales de permisos Spatie en `bckbs` contra lo asumido en `bstronger-admin`                                                                                                                      | Lectura de código, sin riesgo — ejecutable ahora mismo si se pide                                                                                                                                                                  |
| 3   | Verificar dónde se asigna `user_type` (admin/sub_admin/coach) en todo `bckbs`                                                                                                                                      | Lectura de código, sin riesgo — límite real: no verificable contra datos de producción sin acceso a la BD real                                                                                                                     |
| 4   | Expiración/refresh de token (Sanctum) en `bckbs`+`bsa`                                                                                                                                                             | **Requiere tu luz verde** — fuerza reautenticación a usuarios reales pasado N días, cambio de comportamiento de login                                                                                                              |
| 5   | Migrar token del admin panel a cookie httpOnly (`bckbs`+`bstronger-admin`)                                                                                                                                         | **Requiere tu luz verde** — cambio de arquitectura de auth (CORS/CSRF)                                                                                                                                                             |
| 6   | Subir `laravel/framework` (3 advisories abiertas)                                                                                                                                                                  | **Requiere tu luz verde** — salto de versión mayor, puede traer breaking changes; plan: subir + correr suite de tests + arreglar lo que rompa                                                                                      |
| 7   | Confirmar que los scripts raíz de `bckbs` no son alcanzables por HTTP en el VPS                                                                                                                                    | Ejecutable desde aquí (SSH a `bestronger-vps`) — pendiente de que se pida                                                                                                                                                          |
| 8   | Hardening del VPS                                                                                                                                                                                                  | Ejecutable desde aquí igual que el 7, pero es cambio de superficie de un servidor de producción — pedir confirmación explícita antes de tocar nada                                                                                 |
| 9   | Pentest real contra el entorno                                                                                                                                                                                     | **No iniciar por iniciativa propia** — necesita autorización explícita y, idealmente, un staging separado de producción                                                                                                            |

## Auditoría de datos pendiente (no bloqueante)

- Confirmar si algún hábito personalizado real (creado antes del 2026-08-05) se perdió en el incidente `migrate:fresh` que borró la base de datos en vivo ese día, y recrearlo a mano si falta.

---

_No incluido aquí a propósito: trabajo puramente de frontend (rediseños visuales, el error de tipos de `theme.ts`, cambiar iconos a SF Symbols/Material Symbols, limpieza de imports muertos) — nada de eso requiere backend ni admin panel._
