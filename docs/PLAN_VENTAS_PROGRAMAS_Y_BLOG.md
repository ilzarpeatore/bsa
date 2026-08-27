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

Con el motor de cumplimiento ya confirmado, el hueco real es mucho más pequeño de lo que parecía:

1. **Elegir pasarela de pago** (Stripe o PayPal) — decisión de negocio pendiente, ver pregunta más abajo. Nada está conectado todavía, así que se puede elegir sin arrastrar trabajo previo.
2. **Backend**: un endpoint nuevo (p. ej. `POST v1/checkout/create-session`, autenticado) que, dado un `package_id`, cree la sesión de pago con la pasarela elegida, y un endpoint de confirmación (webhook de la pasarela, o un endpoint de "confirmar tras redirect" si se evita el webhook) que **cree la fila `Subscription`** con `user_id`+`package_id`+`subscription_start_date` — en cuanto esa fila se guarda, `PackageFulfillmentService` hace el resto solo.
3. **Web (`webbs`)**: página de catálogo de programas (leyendo `package-list`, ya existe autenticado — puede necesitar una variante pública de solo-listado para mostrar precio/descripción sin login, y exigir login solo al pulsar "Comprar"), flujo de login/registro obligatorio antes de pagar (decisión ya tomada), y la integración del checkout de la pasarela elegida.
4. **App (`bsa`)**: no hace falta ninguna pantalla nueva de "Mis programas" — el `TrainingProgram` asignado ya se ve exactamente igual que cualquier otro plan asignado por el coach en "Mi plan de hoy" / el calendario (`ProgramClientAssignment` es el mismo mecanismo que ya consume `workoutHistoryApi.getMyCalendarDayDetail`). Opcional: una notificación push en el momento de la compra (tipo nuevo, o reutilizar el tipo `subscription` que la bandeja de notificaciones ya reconoce).

## Decisión pendiente

¿Stripe o PayPal? El backend ya trae instalado el SDK de PayPal (`paypal/paypal-server-sdk`) pero solo placeholders vacíos de Stripe en la config — ninguno de los dos está realmente conectado, así que la elección es libre.

## Siguiente paso recomendado

1. Decidir la pasarela de pago.
2. Confirmar el dominio final de `webbs` en producción para añadirlo a `cors.php`.
3. Empezar por lo que no depende de la pasarela: la página `/blog` en `webbs` (ya alcanzable hoy) y la página de catálogo de programas (con `package-list`).
4. En paralelo, construir el endpoint de checkout + confirmación en `bckbs` una vez elegida la pasarela.
