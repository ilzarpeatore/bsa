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

## Bloqueantes de infraestructura (no son "implementar", pero condicionan features reales)

- **HealthKit en iOS requiere Apple Developer Program de pago ($99/año)** — el proyecto firma sus IPA con un Apple ID personal/gratuito, y Apple no concede la capability HealthKit a cuentas gratuitas. Hasta entonces, "Apple Salud" queda oculto en iOS (Android/Health Connect no tiene esta restricción). Cuando se resuelva: añadir `com.apple.developer.healthkit`(`.background-delivery`) a `befit.entitlements`, configurar `DEVELOPMENT_TEAM` real, reactivar la tarjeta en `link_device_choice_screen.tsx`.
- **Apple Health / Health Connect** (el resto de la integración): librerías instaladas y `helper/health.ts` construido, pero requiere `expo prebuild` + rebuild nativo completo (Android+iOS) para poder probarse siquiera — no ejecutado todavía por ser una acción de mayor alcance.
- **Wearables (Garmin/Fitbit/Apple Watch/Galaxy Watch)**: sin backend propio, diferido explícitamente.

## Seguridad — auditoría pendiente

No es un incidente, es preventivo:

- Qué claves SSH están autorizadas en el VPS (`/root/.ssh/authorized_keys`) y si alguna es obsoleta.
- Si la contraseña de la BD de producción es robusta.
- Rotar la contraseña de la cuenta `demo@bestronger.app` si sigue siendo la puesta durante el incidente de recuperación de datos del 2026-08-05.
- Revisar si hay algún otro usuario con contraseña por defecto/predecible en producción.

## Auditoría de datos pendiente (no bloqueante)

- Confirmar si algún hábito personalizado real (creado antes del 2026-08-05) se perdió en el incidente `migrate:fresh` que borró la base de datos en vivo ese día, y recrearlo a mano si falta.

---

_No incluido aquí a propósito: trabajo puramente de frontend (rediseños visuales, el error de tipos de `theme.ts`, cambiar iconos a SF Symbols/Material Symbols, limpieza de imports muertos) — nada de eso requiere backend ni admin panel._
