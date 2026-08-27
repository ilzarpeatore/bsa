# Plan: sincronización del blog + venta de programas individuales desde la web

Fecha: 2026-08-27. Repos inspeccionados: `ilzarpeatore/bsa` (la app) y `ilzarpeatore/webbs` (la web nueva, Next.js). El backend/admin (Laravel) **no está subido a GitHub** — no ha podido inspeccionarse directamente en esta sesión. Todo lo que se dice sobre el backend viene de `docs/PENDIENTE_BACKEND_ADMIN.md`/`docs/TAREAS.md` (documentación de sesiones anteriores) y debe tratarse como **no verificado hasta que alguien con acceso al backend lo confirme**.

## Estado real verificado en `webbs` (2026-08-27)

- Next.js 16 + Tailwind, sobre una plantilla comercial ("habitline-next", `package.json:2`) ya parcialmente adaptada a BeStronger.
- Páginas existentes: `home`, `about`, `contact`, `download`, `faqs`, `pricing`, `privacy-policy`, `waitlist`. **No hay ninguna sección de blog todavía.**
- `pricing/components/PricingPlans.tsx` ya tiene copy real (Mensual/Trimestral/Semestral/Anual, precios en €, texto "El pago se gestiona fuera de la app, directamente en bestronger.es"), pero **todos los botones "Empezar" enlazan a `/contact`** — no hay ningún checkout de pago automatizado todavía, ni Stripe, ni ningún cliente de API hacia el backend (`grep` de `stripe|fetch|axios|api\.` en `src/` no encontró nada). Hoy el modelo real es: el cliente rellena el formulario de contacto y el coach le da de alta manualmente.

## Parte 1 — Sincronizar el blog de la app con el de la web

**Recomendación: no sincronizar dos blogs — que ambos lean del mismo sitio.**

El blog de la app (`api/blog.ts` en `bsa`) ya vive en el backend de Laravel con contenido real (15 artículos sembrados, 3 categorías: Entrenamiento/Nutrición/Hábitos, con bibliografía). Si la web tuviera su propio blog (WordPress, un CMS aparte, o posts hardcodeados en Next.js), habría que mantener el contenido dos veces y sincronizarlo a mano o con un job — una fuente de errores innecesaria. Como el backend ya es la fuente real, lo correcto es que la web **consuma el mismo backend**, no que tenga su propia copia.

### Lo que hace falta (backend, sin confirmar desde aquí)

1. Un endpoint **público** (sin token de sesión de usuario) para listar/leer posts — hoy `blogApi` en la app probablemente exige el Bearer token del cliente logueado; la web no tiene ni debe tener esa sesión. Si el backend ya separa rutas públicas de privadas, puede que ya exista o sea trivial de exponer (mismo controlador, sin el middleware de auth). Si no, es un endpoint nuevo de solo lectura.
2. CORS habilitado para el dominio de la web (`bestronger.es`) en esas rutas públicas.
3. Confirmar que el contenido llega como HTML ya sanitizado (la app lo renderiza en un WebView con sanitizado propio — ver `blog_detail_screen.tsx`) para poder reutilizar el mismo HTML en la web sin reprocesarlo.

### Lo que se construye en `webbs` (sin depender del backend hasta que el punto 1 exista)

- Rutas `/blog` (listado, con categoría) y `/blog/[slug]` (detalle), usando Server Components de Next.js con `fetch` server-side (revalidado cada X minutos vía ISR — no hace falta tiempo real, los posts no cambian cada minuto).
- Mismo criterio editorial que la app: 3 categorías, bibliografía visible.
- Mientras el endpoint público no exista, esta sección puede maquetarse con datos de ejemplo y conectarse en cuanto el backend lo exponga — no bloquea el resto de la web.

## Parte 2 — Venta de programas individuales desde la web, con asignación automática en la app

Ejemplos citados por el usuario: "programa de 3 semanas de crecimiento de espalda", "1 mes de definición" — compras puntuales (pago único), distintas de los planes de coaching recurrentes que ya están en `pricing/page.tsx` (mensual/trimestral/semestral/anual).

**Decisión ya tomada con el usuario:** el checkout exige cuenta creada/logueada en la app **antes** de pagar (no compra libre por email a vincular después) — así el backend siempre sabe exactamente qué usuario es en el momento del pago, sin lógica de reclamar compras después.

### Flujo completo propuesto

1. **Catálogo en la web**: una página `/programas` (o sección dentro de `/pricing`) que lista cada programa individual (título, duración, precio, descripción, imagen) — contenido curado por el coach, servido por el backend (mismo criterio que el blog: una fuente, no datos hardcodeados en la web que haya que actualizar a mano en dos sitios).
2. **Antes de pagar, login obligatorio**: al tocar "Comprar" en un programa, si no hay sesión, la web pide iniciar sesión o registrarse (mismo backend de auth que ya usa la app — un usuario con cuenta en la app puede loguearse también en la web, y viceversa, si comparten backend de auth). Sin cuenta válida, no se puede continuar al pago.
3. **Checkout**: la web crea una Stripe Checkout Session pidiéndosela al backend (nunca se crea desde el frontend con la clave secreta) — el backend adjunta como metadata el `user_id` real (ya conocido, porque el usuario está logueado) y el `program_id` comprado.
4. **Confirmación de pago**: Stripe llama al webhook del backend (`POST webhooks/stripe`, que según la documentación de sesiones anteriores ya existe y está verificado para las suscripciones recurrentes — **hay que confirmar si soporta también pagos únicos** o si hace falta extenderlo). El backend, al confirmar el pago:
   - Crea las asignaciones de entrenamiento del programa comprado en el calendario de ese cliente (mismo mecanismo que ya usa un coach para asignar un `WorkoutTemplate`/día de programa — reutilizar, no reinventar), **o**
   - Si el programa se modela como un `WorkoutTemplate` marcado `is_exclusive`, simplemente concede `is_accessible=true` para ese cliente y ese template (mecanismo que, según la documentación, ya existe para contenido premium/exclusivo, solo que hoy no hay ningún contenido de producción marcado así todavía).
5. **El cliente lo ve en la app**: en cuanto abre la app (o recibe una notificación push — el sistema de notificaciones de la bandeja ya soporta un tipo `subscription`, reutilizable o extendible a un nuevo tipo `program_purchased`), el programa comprado aparece asignado — en "Mi plan de hoy" si empieza ya, o en una sección nueva tipo "Mis programas" si son varios acumulados con distintas fechas de inicio.

### Qué ya existiría en el backend, sin confirmar (según documentación previa)

- Modelo `Package`/`Subscription` + `access_tier` (`free`/`subscriber`/`personal`).
- Flags `is_exclusive`/`is_premium` + `is_accessible` en `WorkoutTemplate` y `Recipe`, con `PackageAccessService` decidiendo el acceso.
- `POST webhooks/stripe` funcionando para las suscripciones recurrentes.
- Endpoint de solo lectura `GET my-plan`.

**Ninguno de estos puntos se ha podido verificar en esta sesión** porque el backend no está en un repositorio accesible. Antes de construir nada sobre ellos, hay que confirmar con quien tenga acceso al backend que existen tal cual se describen y que `Package` (pensado para suscripciones recurrentes) es reutilizable para una compra única, o si hace falta un modelo nuevo (`Program`/`OneTimePurchase`) en paralelo.

### Piezas que sí se pueden construir ya, en los repos disponibles

**En `webbs`:**

- Página de catálogo de programas (aunque sea con datos de ejemplo hasta que el backend exponga el endpoint real).
- Flujo de login/registro obligatorio antes del botón de pago (reutilizando el backend de auth existente).
- Integración del cliente de Stripe Checkout (una vez el backend exponga el endpoint para crear la sesión).

**En `bsa` (la app):**

- Si no existe ya, una pantalla/sección "Mis programas" o una ampliación de "Mi plan de hoy" que distinga entre el plan asignado por el coach y un programa comprado independientemente — **a confirmar**: hoy no se ha localizado ninguna pantalla así en la app; puede hacer falta una nueva.
- Un nuevo tipo de notificación push (`program_purchased`) si se quiere avisar en el momento en vez de esperar a que el cliente abra la app.

### Siguiente paso recomendado

Antes de escribir código de checkout: conseguir acceso al repositorio del backend (o que quien lo tenga confirme los 4 puntos de la lista de arriba) para no construir sobre suposiciones. Si el backend no se va a subir a GitHub, se puede seguir trabajando dándome la especificación exacta de sus endpoints reales (rutas, payloads, respuestas) para diseñar la integración del lado de la web/app con precisión, aunque no pueda verificarla yo mismo en código.
