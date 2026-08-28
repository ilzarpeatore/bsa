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

## Parte 1 — Blog: IMPLEMENTADO en `webbs` (2026-08-28)

`/blog` y `/blog/[slug]` construidos en `webbs` (commit `8f4877d`, mergeado con las páginas de servicio de otra sesión y pusheado a `main`), consumiendo `post-list`/`blog-category-list`/`post-detail` server-side (Server Components de Next.js) — la petición nunca sale del navegador del visitante, así que no hace falta tocar `cors.php` para esto (el CORS del dominio de producción sigue pendiente solo por si algún día se necesita fetch client-side).

- **`/blog`**: listado con filtro por categoría (`?category=slug`, resuelto contra `blog-category-list`) y paginación (`?page=N`), grid de tarjetas (imagen, categoría, título, extracto, fecha).
- **`/blog/[slug]`**: artículo completo. Requirió un cambio pequeño en `bckbs` (commit `61cc547`, pusheado a `main`): `PostController::getDetail()` ahora acepta `slug` además de `id` (el slug ya existía y es único por post vía `Post::getSlugOptions()`, autogenerado al crear — sin migraciones nuevas), sin tocar el uso por `id` que ya hace la app (`bsa/api/blog.ts`).
- **No confirmado**: si `content`/`bibliography` en el admin panel real se guardan como HTML o texto plano — la validación del backend (`API\Admin\PostController::getValidationRules()`) solo exige `nullable|string`, sin pista del editor real. Se resolvió con un renderer adaptativo (`src/components/blog/RichText.tsx` en `webbs`): si detecta una etiqueta HTML la renderiza como HTML, si no, como texto plano con saltos de línea — funciona correctamente en ambos casos, verificado con un mock local de ambas variantes.
- **Verificación real hecha**: `tsc --noEmit` y `npm run build` limpios en `webbs`, más un servidor mock local reproduciendo exactamente las formas de `PostResource`/`BlogCategory` (leídas del código real de `bckbs`) para probar listado, filtro por categoría, ambas ramas de `RichText`, y slug inexistente (404 correcto). **No verificado**: contra la API real (`testapp.bestronger.es`) ni con datos reales del admin panel — el host está bloqueado por la política de red de este entorno (403 del proxy), pendiente de comprobar en un entorno con esa conectividad o directamente en producción.

## Parte 2 — Venta de programas individuales: lo que realmente falta construir

Con el motor de cumplimiento ya confirmado, el hueco real es mucho más pequeño de lo que parecía. **Decisión tomada con el usuario: ambas pasarelas — Stripe (tarjeta + Bizum + Link) y PayPal, ambas disponibles como opción en el mismo checkout.**

### El punto exacto donde conecta cualquier pasarela

`Subscription::boot()` (línea 27-40 de `app/Models/Subscription.php`) dispara `PackageFulfillmentService::fulfill()` automáticamente en cuanto se guarda una fila con `status === config('constant.SUBSCRIPTION_STATUS.ACTIVE')` **y** `payment_status === 'paid'`. El propio comentario del código (línea 22-26) dice textualmente que este mecanismo se diseñó para funcionar igual "sin importar quién cree/edite la Subscription (admin de prueba hoy, gateway de pago real más adelante)" — **está construido a propósito para esto**. No hay que tocar `Subscription`, `Package` ni `PackageFulfillmentService` para nada de lo que sigue; solo hay que crear correctamente esa fila desde cada pasarela.

Campos ya disponibles en `Subscription` para registrar la pasarela usada (sin migraciones nuevas): `payment_type` (string — p. ej. `'stripe_card'`, `'stripe_bizum'`, `'stripe_link'`, `'paypal'`), `txn_id` (ID de la transacción/orden de la pasarela), `transaction_detail` (JSON — el payload completo del evento, para auditoría), `callback` (libre).

### Diseño técnico — Stripe: IMPLEMENTADO en el backend (2026-08-27)

**Stripe** — una única Checkout Session con `payment_method_types: ['card', 'bizum', 'link']`; Stripe muestra las 3 opciones y el cliente elige una en su propia UI de checkout (no hace falta construir 3 flujos distintos, es una sola integración).

- `POST v1/checkout/stripe/create-session` (auth): recibe `package_id`, crea la Checkout Session (metadata: `user_id`, `package_id`), devuelve la URL de Stripe a la que redirigir. ✅ Implementado: `App\Http\Controllers\API\V1\CheckoutController::createStripeSession()`.
- `POST webhooks/stripe` (público, verificado por firma — `Stripe-Signature` header, sin `auth:sanctum`, sin CSRF): en `checkout.session.completed`, crea la `Subscription` con `payment_type` según el método real usado (Stripe lo informa en el evento), `status='active'`, `payment_status='paid'`, `txn_id` = el ID de la Checkout Session (usado también para idempotencia — reintentos de Stripe no duplican la Subscription). ✅ Implementado: `CheckoutController::stripeWebhook()`/`fulfillStripeSession()`.
- `GET package-catalog` (público, sin login): mismo listado que `package-list` pero accesible sin sesión, para que la web muestre precios antes de que el usuario inicie sesión. ✅ Implementado, reutiliza `PackageController::getList()`.
- Backend: `stripe/stripe-php` (`^21.3`) instalado en `composer.json`/`composer.lock`. `config/services.php` y `.env.example` documentan `STRIPE_SECRET_KEY`/`STRIPE_PUBLIC_KEY`/`STRIPE_WEBHOOK_SECRET` (todavía vacíos — sin credenciales reales en ningún archivo del repo). Commit `cdf1cba` en `bckbs`, pusheado a `main`.
- **Pendiente antes de poder probar de verdad**: claves de prueba/sandbox de Stripe (el usuario dijo que las buscaría), un `.env` local en `bckbs` con esas claves + credenciales de base de datos (no committeado, nunca se sube), y añadir el dominio de producción de `webbs` a `config/cors.php`.

### Diseño técnico — PayPal: IMPLEMENTADO en el backend (2026-08-27)

**PayPal** — el SDK (`paypal/paypal-server-sdk`) ya estaba instalado, sin usar; ahora sí está cableado.

- `POST v1/checkout/paypal/create-order` (auth): recibe `package_id`, crea la orden PayPal (`custom_id` = `user_id:package_id`, PayPal no tiene un campo "metadata" libre como Stripe), devuelve `order_id` + `approve_url` (el link `rel=approve` de PayPal al que redirigir al cliente). ✅ Implementado: `CheckoutController::createPaypalOrder()`.
- `POST v1/checkout/paypal/capture-order` (auth, llamado por el frontend tras la aprobación del cliente en PayPal — no hay webhook de PayPal, a diferencia de Stripe, porque aquí es el propio frontend quien recibe la vuelta desde paypal.com y dispara la confirmación): captura la orden, valida `status === 'COMPLETED'`, crea la `Subscription` igual que en el caso de Stripe (idempotente por `txn_id` = order id de PayPal). ✅ Implementado: `CheckoutController::capturePaypalOrder()`.
- Backend: `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`PAYPAL_MODE` (`sandbox`/`live`) documentados en `.env.example`, `config/services.php` ya los expone. Commit `e660f75` en `bckbs`, pusheado a `main`.
- **Pendiente antes de poder probar de verdad**: credenciales sandbox de PayPal (aún no pedidas al usuario — Stripe fue lo primero). El flujo de `capture-order` en la web (`webbs`) necesita una página `/checkout/paypal-retorno` que lea `order_id` de la query string que PayPal añade a `return_url` y llame a este endpoint.

### Resto del flujo (sin cambios respecto a la versión anterior de este documento)

- **Web (`webbs`)**: catálogo de programas (`package-list`, con variante pública de solo-listado si se quiere mostrar precio sin login), login/registro obligatorio antes de pagar, botones "Pagar con tarjeta/Bizum" (Stripe) y "Pagar con PayPal" en el mismo checkout.
- **App (`bsa`)**: no hace falta ninguna pantalla nueva — el programa comprado se ve como cualquier otro plan asignado por el coach, vía el mismo `ProgramClientAssignment`/calendario que ya existe.
- **CORS**: añadir el dominio final de `webbs` a `config/cors.php` en cuanto se conozca.

## Siguiente paso recomendado

**Backend (`bckbs`) — hecho**: los 4 endpoints de checkout (Stripe: create-session + webhook; PayPal: create-order + capture-order) están implementados, verificados (`php -l`, resolución de clases del SDK) y pusheados a `main` (commits `cdf1cba`, `e660f75`). Sin credenciales reales en ningún archivo — todo vía `env()`.

Pendiente ahora:

1. **Credenciales de prueba/sandbox** de Stripe y PayPal — sin esto no se puede probar el flujo end-to-end (el usuario dijo que buscaría las de Stripe; las de PayPal aún no se han pedido).
2. **Web (`webbs`)** — el blog ya está hecho (ver Parte 1 arriba), falta el resto:
   - ~~`/blog` y `/blog/[slug]`~~ — hecho.
   - `/programas` (catálogo, consume `package-catalog`, ya público).
   - Login/registro obligatorio antes de pagar (decisión ya tomada).
   - Botón "Comprar" → llama a `checkout/stripe/create-session` o `checkout/paypal/create-order` según el método elegido, redirige a la URL/link devuelto.
   - `/checkout/exito` (Stripe), `/checkout/paypal-retorno` (llama a `capture-order` con el `order_id` de la query string) y `/checkout/cancelado`.
3. **CORS**: añadir el dominio de producción de `webbs` a `config/cors.php` en cuanto se conozca (hoy solo `localhost:3000/5173/5174`).
