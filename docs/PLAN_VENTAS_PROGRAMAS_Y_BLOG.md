# Plan: sincronización del blog + venta de programas individuales desde la web

Fecha: 2026-08-27. Repos inspeccionados: `ilzarpeatore/bsa` (la app), `ilzarpeatore/webbs` (la web nueva, Next.js) y **`ilzarpeatore/bckbs`** (el backend Laravel, añadido a la sesión el 2026-08-27 — todo lo que sigue viene de leer su código real, no de documentación de sesiones anteriores). La versión anterior de este documento marcaba varios puntos como "no confirmado" porque el backend no era accesible; esta versión los reemplaza por hechos verificados directamente en `bckbs`, y **corrige una afirmación anterior que resultó ser falsa** (ver más abajo).

## Estado real verificado

**`webbs`** (Next.js 16 + Tailwind, plantilla "habitline-next" parcialmente adaptada):

- Sin sección de blog todavía.
- `pricing/page.tsx` ya tiene copy real (Mensual/Trimestral/Semestral/Anual), pero todos los botones "Empezar" enlazan a `/contact` — no hay checkout ni llamada a ningún backend todavía.

**`bckbs`** (Laravel 11, `composer.json`):

- **Corrección importante**: la documentación de sesiones anteriores de `bsa` afirmaba que _"el webhook de Stripe ya funciona"_. Es falso — **no existe ninguna ruta de webhook en todo el backend** (`grep` de `webhook` en `routes/*.php` y en todo `app/`: cero resultados). Tampoco hay ningún paquete de Stripe instalado (`composer.json` no tiene `stripe/stripe-php`); sí hay `paypal/paypal-server-sdk` como dependencia, pero **sin ninguna ruta ni controlador que lo use** todavía, y `.env.example` no tiene ninguna clave de Stripe ni de PayPal configurada. `config/services.php` solo tiene placeholders vacíos de Stripe (`env('STRIPE_SECRET_KEY')`) sin usar en ningún sitio real. **Conclusión: hoy no hay ninguna pasarela de pago conectada, ni Stripe ni PayPal — es una decisión pendiente, no algo ya construido.**
- Lo que sí existe y funciona de verdad, y es exactamente lo que hace falta para "programas individuales":

## El motor de cumplimiento de compras ya existe (`Package` + `Subscription` + `PackageFulfillmentService`)

Esto es el hallazgo más importante: **no hace falta diseñar un modelo nuevo para "programa individual" — `Package` ya es ese modelo.**

- `app/Models/Package.php`: campos `name`, `duration` + `duration_unit` (`day`/`week`/`month`/`year`), `price`, `training_program_id`, `meal_plan_template_id`, `grants_full_workout_library`, `grants_full_recipe_library`. Comentario textual en el propio modelo: _"un Package puede ser solo-entrenamiento, solo-nutrición, o combinado (ej. 'Definición 3 meses')"_ — literalmente el ejemplo que puso el usuario.
- Un Package **"espalda en 3 semanas"** se crea hoy mismo así: `duration=3`, `duration_unit='week'`, `training_program_id` = el `TrainingProgram` de espalda ya diseñado por el coach. **No hace falta ninguna migración ni modelo nuevo.**
- `App\Http\Controllers\API\Admin\PackageController` ya valida y acepta exactamente esos campos — el panel de admin ya puede crear estos "programas" hoy (asumiendo que el formulario del admin los expone; el backend los acepta).
- `App\Models\Subscription`: al guardarse una fila nueva (evento `saved` en `boot()`), si `!$subscription->fulfilled_at`, dispara automáticamente `PackageFulfillmentService::fulfill($subscription)` — **esto ya es 100% automático e idempotente**, sin que nadie tenga que llamarlo a mano.
- `App\Services\PackageFulfillmentService::fulfill()`: importa el contenido del `Package` al calendario real del cliente — si tiene `training_program_id`, asigna el `TrainingProgram` (`ProgramClientAssignment`); si tiene `meal_plan_template_id`, importa las comidas (`DailyPlanRecipe`) a partir de `subscription_start_date`. También existe `revokeAccess()` para cuando expira (borra solo lo futuro, respeta el historial ya completado).

**Conclusión clave: crear una fila en `subscriptions` con el `package_id` y `user_id` correctos ya dispara TODO el proceso de asignación real al perfil del cliente.** El único hueco real es cómo se llega a crear esa fila desde un pago hecho en la web.

## Rutas que ya existen (`routes/api.php`)

- **Ya públicas hoy** (antes del grupo `auth:sanctum` que empieza en la línea 72, sin ningún middleware): `post-list`/`post-detail` (esto es literalmente el blog — `api/blog.ts` en la app llama a estas mismas rutas), `blog-category-list`, `workout-list`, `diet-list`, `exercise-list`, `product-list`, entre otras.
- **Autenticadas** (dentro del grupo `auth:sanctum`): `package-list`, `subscriptionplan-list`, `subscribe-package` (flujo legacy), `subscribe-to-package` (el que se retiró del lado cliente de la app por política de Apple/Google, pero **sigue existiendo en el backend** — solo se dejó de llamar desde la app).
- **Admin**: `subscriptions-grant-package` (alta manual desde el panel — la vía "admin" que se usa hoy en vez de un pago automático).
- **CORS** (`config/cors.php`): `allowed_origins` solo incluye `localhost:3000/5173/5174` (orígenes de desarrollo) — **el dominio real de la web (`bestronger.es` o el dominio final de despliegue) todavía no está en la lista.** Cambio de una línea cuando se sepa el dominio de producción.

## Parte 1 — Blog: ya no hace falta nada nuevo en el backend

Como `post-list`/`post-detail`/`blog-category-list` **ya son públicas**, la web puede consumirlas hoy mismo, sin tocar el backend (salvo añadir su dominio a `cors.php` cuando se despliegue). Recomendación sin cambios: la web NO debe tener su propio blog — construir `/blog` y `/blog/[slug]` en `webbs` con `fetch` server-side contra `https://testapp.bestronger.es/api/post-list` / `.../post-detail` (URL de producción confirmada en `api/client.ts` de la app), reutilizando el mismo contenido que ya ve la app.

## Parte 2 — Venta de programas individuales: lo que realmente falta construir

Con el motor de cumplimiento ya confirmado, el hueco real es mucho más pequeño de lo que parecía. **Decisión tomada con el usuario: ambas pasarelas — Stripe (tarjeta + Bizum + Link) y PayPal, ambas disponibles como opción en el mismo checkout.**

### El punto exacto donde conecta cualquier pasarela

`Subscription::boot()` (línea 27-40 de `app/Models/Subscription.php`) dispara `PackageFulfillmentService::fulfill()` automáticamente en cuanto se guarda una fila con `status === config('constant.SUBSCRIPTION_STATUS.ACTIVE')` **y** `payment_status === 'paid'`. El propio comentario del código (línea 22-26) dice textualmente que este mecanismo se diseñó para funcionar igual "sin importar quién cree/edite la Subscription (admin de prueba hoy, gateway de pago real más adelante)" — **está construido a propósito para esto**. No hay que tocar `Subscription`, `Package` ni `PackageFulfillmentService` para nada de lo que sigue; solo hay que crear correctamente esa fila desde cada pasarela.

Campos ya disponibles en `Subscription` para registrar la pasarela usada (sin migraciones nuevas): `payment_type` (string — p. ej. `'stripe_card'`, `'stripe_bizum'`, `'stripe_link'`, `'paypal'`), `txn_id` (ID de la transacción/orden de la pasarela), `transaction_detail` (JSON — el payload completo del evento, para auditoría), `callback` (libre).

### Diseño técnico propuesto

**Stripe** — una única Checkout Session con `payment_method_types: ['card', 'bizum', 'link']`; Stripe muestra las 3 opciones y el cliente elige una en su propia UI de checkout (no hace falta construir 3 flujos distintos, es una sola integración).

- `POST v1/checkout/stripe/create-session` (auth): recibe `package_id`, crea la Checkout Session (metadata: `user_id`, `package_id`), devuelve la URL de Stripe a la que redirigir.
- `POST webhooks/stripe` (público, verificado por firma — `Stripe-Signature` header, sin `auth:sanctum`, sin CSRF): en `checkout.session.completed`, crea la `Subscription` con `payment_type` según el método real usado (Stripe lo informa en el evento), `status='active'`, `payment_status='paid'`, `txn_id` = el `payment_intent`.
- Backend: instalar `stripe/stripe-php` (no está en `composer.json` todavía), añadir `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` a `.env` (no en `.env.example` todavía).

**PayPal** — el SDK (`paypal/paypal-server-sdk`) ya está instalado, sin usar.

- `POST v1/checkout/paypal/create-order` (auth): recibe `package_id`, crea la orden PayPal, devuelve el ID/URL de aprobación.
- `POST v1/checkout/paypal/capture-order` (auth, llamado por el frontend tras la aprobación del cliente en PayPal) **o** un webhook de PayPal (`POST webhooks/paypal`, verificado con el header de verificación de PayPal) — cualquiera de los dos crea la `Subscription` igual que en el caso de Stripe.
- Backend: añadir `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`PAYPAL_MODE` (`sandbox`/`live`) a `.env`.

### Resto del flujo (sin cambios respecto a la versión anterior de este documento)

- **Web (`webbs`)**: catálogo de programas (`package-list`, con variante pública de solo-listado si se quiere mostrar precio sin login), login/registro obligatorio antes de pagar, botones "Pagar con tarjeta/Bizum" (Stripe) y "Pagar con PayPal" en el mismo checkout.
- **App (`bsa`)**: no hace falta ninguna pantalla nueva — el programa comprado se ve como cualquier otro plan asignado por el coach, vía el mismo `ProgramClientAssignment`/calendario que ya existe.
- **CORS**: añadir el dominio final de `webbs` a `config/cors.php` en cuanto se conozca.

## Siguiente paso recomendado

1. Cuentas/credenciales reales (o de prueba/sandbox para empezar) de Stripe y PayPal — hacen falta antes de escribir el código de checkout, no después.
2. Empezar por lo que no depende de ninguna pasarela: la página `/blog` en `webbs` (ya alcanzable hoy) y la página de catálogo de programas (`package-list`).
3. En paralelo, construir los 4 endpoints nuevos en `bckbs` (2 de creación de sesión/orden + 2 de confirmación) en cuanto haya credenciales de prueba.
4. Añadir el dominio de producción de `webbs` a `cors.php`.
