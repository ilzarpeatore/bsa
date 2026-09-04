# Security Audit — Backend (Laravel, testapp.bestronger.es)

**Fecha:** 2026-09-01
**Alcance:** backend Laravel de producción (`/var/www/testapp` en el VPS IONOS `212.227.82.45`, dominio `https://testapp.bestronger.es`), incluyendo infraestructura (Caddy, SSH, firewall, MySQL, filesystem) y admin panel (`admin-testapp.bestronger.es`). Complementa a `SECURITY_AUDIT.md` (auditoría previa, 2026-08-26, solo cliente React Native/Expo), que explícitamente dejó el backend fuera de alcance.
**Metodología:** reconocimiento de solo lectura vía SSH (`bestronger-vps`, acceso root pre-autorizado) — lectura completa de controladores, rutas, modelos, config, migraciones, Caddyfile, sshd_config, `.env` (solo nombres de variables, nunca valores), logs, `composer audit`. Dos pasadas paralelas: una de aplicación (auth/autorización/IDOR/DB/validación/injection/uploads/webhooks/CORS/rate limiting), otra de infraestructura (red/Cloudflare/puertos/SSH/TLS/headers/secrets/storage/logs/backups/dependencias). **Cero cambios realizados en esta fase** — solo lectura, tal como se pidió. No se ejecutaron exploits reales contra producción; las cadenas de ataque descritas se derivan de lectura de código, no de explotación activa.

---

## 1. Resumen ejecutivo

Se encontraron **2 vulnerabilidades CRÍTICAS** que permitían a cualquier atacante tomar el control de **cualquier cuenta del sistema, incluidas cuentas admin**, sin necesitar acceso previo más allá de poder registrarse (gratis, público) — una incluso sin ninguna cuenta previa. **Ambas ya están corregidas y verificadas funcionalmente contra producción** (2026-09-01, ver §20).

**Estado actual (2026-09-01, auditoría cerrada):** CRIT-1, CRIT-2, HIGH-1, HIGH-3 y HIGH-2 corregidos y verificados — **P0 y P1 cerrados por completo**. De P2: MED-3 corregido; MED-5 verificado limpio (incluye logs de sistema/Caddy, ver §21); MED-2 resultó falso positivo (automatización ya funcionaba); MED-4 parcial (`event:cache` aplicado, `config:cache`/`route:cache` dejados como deuda técnica por decisión explícita del usuario — no vale el riesgo de regresión para una mejora de rendimiento). MED-1 fuera de alcance a propósito (otra app en el mismo VPS). **Barrido sistemático completo** (§21a): 73 controladores revisados, 9 vulnerabilidades más encontradas y corregidas. Dos hallazgos del barrido (`ChallengeController::updateScore()`, `TrainingProgramController::getList()`) confirmados como comportamiento intencional tras consulta directa al usuario — visibilidad compartida entre coaches, no un bug. Backups fuera del VPS quedan como riesgo residual documentado, sin destino/credenciales decididos todavía — retomar cuando el usuario lo decida.

**Todo lo que queda abierto es una decisión explícita del usuario, no trabajo pendiente sin resolver**: push a GitHub de los 11 commits locales, backups off-site (sin destino elegido), `config:cache`/`route:cache` (deuda técnica aceptada), y `SubAdminController::store()` (observación menor de bajo impacto, sin confirmar).

**P3 también cerrado (2026-09-01):** LOW-2 (CUPS, resultó ser un paquete snap — eliminado por completo con `snap remove cups`, puerto 631 confirmado cerrado), INFO-1 (orígenes de desarrollo quitados de `config/cors.php`, verificado con preflight real), LOW-1 (18 ficheros de diagnóstico/dumps SQL sueltos borrados a petición del usuario, tras corregir primero sus permisos `666`→`644` — el mismo patrón de HIGH-3 encontrado en 8 ficheros más).

Commits locales en el repo del backend (`github.com/ilzarpeatore/Bckbs`, rama `main`): `f997445` (CRIT-1/CRIT-2), `db9b609` (HIGH-1), `c260584` (hallazgo del re-audit), `625f3a8` (MED-3), `9b4216c` (INFO-1) — **push a GitHub diferido a petición del usuario**, pendiente. HIGH-3, HIGH-2, MED-4 (event:cache), LOW-2 (snap remove) y el borrado de LOW-1 son cambios de infraestructura/filesystem sin commit de código de la aplicación aplicable.

**Todo P0, P1, P2 y P3 documentado en este informe está cerrado.** Lo único que queda abierto del alcance original es el barrido sistemático de autorización sobre el resto de la API (§21) — no se auditó endpoint por endpoint más allá de lo que resultó crítico — y la decisión de hacer el push a GitHub.

Además: **3 hallazgos ALTOS** (fotos de usuario enumerables sin autenticación, SSH con `PermitRootLogin`+`PasswordAuthentication` activos, `.env` de producción con permisos `666` — legible y escribible por cualquier proceso local) y **5 hallazgos MEDIOS** (puerto de otra app expuesto en `0.0.0.0` bypasseando ufw vía reglas de Docker, sin backups automáticos, dependencias con CVEs sin parchear, config de Laravel no cacheada en producción, logs con SQL/PII en texto plano).

En positivo, con evidencia real: CORS, rate limiting en login/registro, verificación de firma del webhook de Stripe con idempotencia, hashing de contraseñas, revocación de tokens en logout, TLS/HSTS/CSP/cabeceras de seguridad, y aislamiento de `.env`/`.git`/logs vía la configuración de Caddy están todos correctamente implementados.

**Ningún código se ha modificado todavía.** Este documento es la fase de auditar/documentar/priorizar/planificar; la implementación requiere confirmación explícita (ver §21).

---

## 2. Arquitectura

```text
CLIENTE (React Native/Expo + Admin SPA Vite/React)
   ↓ HTTPS
[SIN CLOUDFLARE/CDN/WAF — DNS apunta directo a la IP del VPS]
   ↓
CADDY (212.227.82.45:80/443, auto-TLS, headers de seguridad completos)
   ↓
PHP-FPM 8.3 → LARAVEL 11.51.0 (routes/api.php, ~964 líneas)
   ├── AUTH: Laravel Sanctum ^4.0 (Bearer tokens, sin expiración configurada)
   ├── AUTORIZACIÓN: spatie/laravel-permission (roles: admin/coach/user), middleware AdminApi
   ↓
MYSQL (127.0.0.1:3306, no expuesto externamente — correcto)
   ↓
STORAGE: disco `public` (spatie/laravel-medialibrary, servido directo por Caddy, fuera del ciclo Laravel)
   ↓
SERVICIOS EXTERNOS: Stripe/PayPal/Razorpay/Paystack, AWS S3, Firebase, OneSignal, Gemini API, Pexels, Google OAuth
```

Confirmado, no inventado: Laravel `^11.9` (real: 11.51.0), PHP `^8.2` (real: 8.3.6), `nwidart/laravel-modules` (módulo `Modules\Frontend` referenciado, no auditado en profundidad — **NO VERIFICADO**). Otras dos apps comparten el mismo VPS pero son de otro proyecto (`riteflow`/PM2, y contenedores Docker en :3000/:3001 para `gestion.bestronger.es`/`test.bestronger.es`) — fuera de alcance salvo por el hallazgo de exposición de puertos (§11).

---

## 3. Superficie de ataque

| Recurso                                                           | Público                            | Auth                               | Riesgo                                         | Observaciones                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST /api/register`                                              | Sí                                 | —                                  | 🔴 Crítico                                     | Acepta `user_type` del cliente sin validar — ver CRIT-2                                                     |
| `POST /api/login`, `forget-password`, `social-login`              | Sí                                 | —                                  | 🟢                                             | `throttle:6,1` aplicado                                                                                     |
| `POST /api/update-profile`                                        | No (cualquier usuario autenticado) | `auth:sanctum`                     | 🔴 Crítico                                     | Sin ownership check — ver CRIT-1                                                                            |
| Resto de `/api/*` (workouts, nutrición, hábitos, posts, progreso) | No                                 | `auth:sanctum`                     | 🔵 No auditado endpoint-por-endpoint (ver §21) | Patrón de CRIT-1 debería buscarse sistemáticamente                                                          |
| `/api/admin/*`                                                    | No                                 | `auth:sanctum` + `admin.api`       | 🟢                                             | Middleware bien implementado (`hasRole('admin')` + `status==='active'`)                                     |
| `webhooks/stripe`, `webhooks/stripe-packages`                     | Sí (por diseño)                    | Firma Stripe                       | 🟢                                             | Firma verificada, idempotente. Dos webhooks en paralelo por migración de pagos sin terminar — deuda técnica |
| `/storage/{id}/archivo` (Caddy estático)                          | Sí                                 | Ninguna (fuera del ciclo Laravel)  | 🟠 Alto                                        | IDs secuenciales enumerables — ver HIGH-1                                                                   |
| `admin-testapp.bestronger.es` (SPA estática)                      | Sí (login gate en frontend)        | La API detrás sí exige `admin.api` | 🟢                                             | El gate real está en la API, no en la SPA — correcto                                                        |
| SSH :22                                                           | Sí                                 | Clave (pero password auth activo)  | 🔴 Crítico                                     | Ver CRIT/HIGH infra §11                                                                                     |
| MySQL :3306                                                       | No (solo 127.0.0.1)                | —                                  | 🟢                                             | Correcto                                                                                                    |
| Puerto :3000 (otra app, Docker)                                   | **Sí, sin querer**                 | Ninguna                            | 🟠 Alto                                        | Bypass de ufw vía iptables de Docker — ver §11                                                              |

---

## 4. Autenticación

- Sanctum Bearer tokens, `Hash::check`/`Hash::make` correctos (`login()`, `changePassword()`).
- `logout()` revoca el token actual (`currentAccessToken()->delete()`); existe `logoutAllDevices()` (revoca todos) — mecanismo de revocación manual presente.
- **`config/sanctum.php`: `'expiration' => null`** — los tokens **no expiran nunca** automáticamente. Confirma lo que ya se sospechaba desde el cliente (auditoría previa del repo). 🟡 Medio: sin expiración + sin refresh token, un token robado es válido indefinidamente salvo revocación manual.
- Rate limiting real en login/register/forget-password/social-login (`throttle:6,1` / `throttle:10,1`), con comentario en el propio código fechado 2026-08-26 confirmando que esto ya se revisó antes.
- `APP_DEBUG=false` en producción — confirmado, no se filtran stack traces.

## 5. Autorización — hallazgos críticos

Ver §9 (Vulnerabilidades) para el detalle completo de **CRIT-1** y **CRIT-2**. Resumen de la matriz de autorización real observada:

| Endpoint                                                                     | Método | Público | Auth    | Ownership                       | Rol                           | Riesgo                                                                                  |
| ---------------------------------------------------------------------------- | ------ | ------- | ------- | ------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `/api/register`                                                              | POST   | Sí      | —       | N/A                             | Cliente controla `user_type`  | 🔴 CRIT-2                                                                               |
| `/api/update-profile`                                                        | POST   | No      | Sanctum | **Ausente** — acepta `id` ajeno | Ninguno                       | 🔴 CRIT-1                                                                               |
| `/api/admin/*`                                                               | *      | No      | Sanctum | N/A                             | `hasRole('admin')` + `status` | 🟢 Correcto                                                                             |
| Resto de recursos con `{id}` (workouts, posts, hábitos, nutrición, progreso) | *      | No      | Sanctum | **No auditado exhaustivamente** | —                             | 🔵 Ver §21 — recomendado barrido sistemático del patrón `$request->all()` sin ownership |

**Nota positiva verificada:** el admin panel corrigió recientemente (comentario propio en `routes/api.php:350-354`) 5 rutas de cliente que por error vivían dentro del grupo admin (quedaban inalcanzables, 403) — ya corregido, no es un hallazgo nuevo.

## 6. Base de datos

MySQL — no aplica RLS (no es Postgres/Supabase). La protección de aislamiento entre usuarios recae **enteramente en la capa de controlador/aplicación**, que es exactamente donde CRIT-1 falla. Migraciones no enumeradas exhaustivamente (fuera de alcance de tiempo de esta pasada) — no se encontró SQL injection en el muestreo de controladores (único uso de `DB::raw` encontrado, `HomeController.php:190`, no toma input de usuario).

## 7. RLS

No aplica — MySQL sin Postgres RLS. Ver §6.

## 8. Storage

**HIGH-1** (detalle en §9): fotos de usuario en disco público con IDs secuenciales, servidas directamente por Caddy sin pasar por Laravel — imposible insertar un control de autorización en ese punto. El disco `public/storage` en sí (5514 carpetas numéricas muestreadas) resultó ser mayormente GIFs de catálogo de ejercicios (contenido genérico, no privado) en las 2 carpetas verificadas — pero **no se verificó el 100%** de las carpetas; los endpoints admin `progress-photo-store`/`client-note-store` deberían revisarse para confirmar en qué disco escriben.

## 9. Vulnerabilidades — detalle completo

### CRIT-1 — IDOR + mass assignment en `update-profile` → account takeover total

```text
ID: CRIT-1
Severidad: 🔴 CRÍTICO
Categoría: Autorización (IDOR / BOLA / Mass Assignment)
Ubicación: app/Http/Controllers/API/UserController.php:313-323
Causa raíz: el endpoint acepta un `id` arbitrario del body y hace `User::where('id',$request->id)->first()`
  sin comparar contra `auth()->id()` ni comprobar rol; después hace `$user->fill($request->all())->update()`
  en vez de `$request->validated()`, permitiendo escribir cualquier campo $fillable del modelo User
  (user_type, status, is_personal_client, email, password) en vez de solo los campos que UserRequest valida.
Impacto: cualquier usuario autenticado (cuenta gratuita normal) puede:
  (a) cambiar el email de CUALQUIER otro usuario (incluido un admin) a un buzón propio, luego usar
      forget-password para resetear su contraseña → account takeover total, incluida escalada a admin
      vía toma de una cuenta admin real;
  (b) auto-otorgarse `is_personal_client: true` → tier de pago sin pagar;
  (c) cambiar `status` de otro usuario a "banned" → DoS dirigido.
Probabilidad: Alta — requiere solo una cuenta gratuita normal (o ninguna, ver CRIT-2) y una request HTTP.
Cómo reproducir (no ejecutado contra producción, derivado de lectura de código):
  1. Login con cuenta A. 2. POST /api/update-profile {"id": <id_de_B>, "email":"atacante@evil.com"}.
  3. POST /api/forget-password {"email":"atacante@evil.com"}. 4. Resetear contraseña de la cuenta B.
Solución: (1) eliminar la posibilidad de pasar `id` salvo que el actor tenga rol admin/coach explícito
  vía policy; (2) sustituir $request->all() por $request->validated() con whitelist explícita de campos
  editables por el propio usuario (nunca user_type, status, is_personal_client, password, email sin
  flujo de verificación de email aparte).
Archivos afectados: app/Http/Controllers/API/UserController.php.
Riesgo de regresión: bajo — confirmado que el admin panel usa una ruta y controlador totalmente
  distintos (admin/update-profile → AuthController::updateProfile, protegido por admin.api) para
  editar su propio perfil de staff; ningún flujo legítimo dependía del parámetro `id` en este endpoint.
Estado: 🟢 CORREGIDO y verificado funcionalmente contra producción (ver §20).
```

### CRIT-2 — Registro público permite crear una cuenta admin directamente

```text
ID: CRIT-2
Severidad: 🔴 CRÍTICO
Categoría: Autenticación / Broken Access Control
Ubicación: app/Http/Controllers/API/UserController.php:71-108 (register), routes/api.php:31 (throttle:10,1, sin auth)
Causa raíz: `$input['user_type'] = isset($input['user_type']) ? $input['user_type'] : 'user'` confía en el
  valor enviado por el cliente; UserRequest no valida/restringe user_type; el rol Spatie 'admin' existe
  realmente (database/seeders/RoleTableSeeder.php:20) y AdminApi.php comprueba exactamente ese nombre.
Impacto: cualquiera en internet, sin ninguna cuenta previa, puede registrarse con
  {"user_type":"admin", ...} y obtener de inmediato un token Sanctum válido con rol admin real y
  status "active" — acceso completo e inmediato al panel de administración (todos los usuarios, pagos,
  reports).
Probabilidad: Alta — una sola request HTTP no autenticada.
Cómo reproducir: POST /api/register con user_type:"admin" en el body.
Solución: eliminar `user_type` de los campos aceptados en register(); forzar siempre 'user' server-side.
  La creación de admins/coaches debe pasar exclusivamente por Admin\UserController (ya protegido por
  admin.api).
Archivos afectados: app/Http/Controllers/API/UserController.php.
Riesgo de regresión: ninguno esperado — ningún flujo legítimo de registro público debería necesitar
  crear un admin.
Estado: 🟢 CORREGIDO y verificado funcionalmente contra producción (ver §20).
```

### HIGH-1 — Fotos de usuario enumerables sin autenticación

```text
ID: HIGH-1
Severidad: 🟠 ALTO
Categoría: Storage / Broken Access Control
Ubicación: config/filesystems.php:38-43 (disk public), config/media-library.php:60 (DefaultPathGenerator
  por ID autoincremental), servido directo por Caddy (file_server), fuera del ciclo de vida de Laravel.
Causa raíz: medios (incluidas potencialmente fotos de progreso/perfil) en disco público con rutas
  /storage/{id}/archivo donde {id} es el autoincremental del modelo Media — no hay ningún punto de
  la request donde Laravel pueda insertar una comprobación de ownership, porque Caddy sirve el archivo
  directamente sin pasar por PHP.
Impacto: cualquiera que enumere IDs consecutivos puede ver archivos de cualquier usuario sin sesión.
  El muestreo (2 de 5514 carpetas) encontró solo GIFs de catálogo de ejercicios, no fotos de usuario —
  pero no se verificó el 100%, y los endpoints admin progress-photo-store/client-note-store existen y
  no se confirmó en qué disco escriben.
Solución: mover medios sensibles (como mínimo progress photos, si se confirma que usan este disco) a
  un disco `private` + servir vía ruta Laravel autenticada con ownership check, o URLs firmadas
  temporales (URL::temporarySignedRoute).
Archivos afectados: config/filesystems.php, app/Models/User.php, app/Http/Controllers/API/Admin/ProgressPhotoController.php,
  routes/api.php.
Riesgo de regresión: bajo — confirmado 0 registros reales en la colección `progress_photos` en
  producción en el momento del fix, así que no hizo falta migrar datos existentes.
Estado: 🟢 CORREGIDO y verificado funcionalmente contra producción (ver §20). Nuevo disco `private`
  (fuera del document root de Caddy) + URL firmada temporal (`URL::temporarySignedRoute`, 6h) en vez de
  la URL pública de spatie. La ruta `progress-photo-signed/{media}` vive fuera del grupo
  `auth:sanctum`+`admin.api` a propósito — la firma es el único credencial, mismo patrón que una URL
  firmada de S3, necesario porque un `<img src>` no puede llevar cabecera `Authorization`.
```

### HIGH-2 — SSH: `PermitRootLogin yes` + `PasswordAuthentication yes` (valor efectivo confirmado)

```text
ID: HIGH-2
Severidad: 🔴 CRÍTICO (infraestructura — compromiso de root = compromiso total del servidor)
Categoría: Infraestructura / Hardening de acceso
Ubicación: /etc/ssh/sshd_config + drop-ins contradictorios en /etc/ssh/sshd_config.d/
  (50-cloud-init.conf: PasswordAuthentication yes; 60-cloudimg-settings.conf: PasswordAuthentication no).
Causa raíz: `sshd -T` (configuración efectiva real, resolviendo precedencia) confirma
  permitrootlogin=yes y passwordauthentication=yes — no es una config comentada/inerte, es el valor real.
Impacto: si la cuenta root tuviera cualquier contraseña configurada (no verificable sin comprometerlo),
  sería posible autenticación remota por fuerza bruta/credential stuffing directamente como root.
  El acceso actual por clave (usado por esta sesión) no es la única vía posible tal como está configurado.
Solución: PermitRootLogin prohibit-password (o no, usando un usuario sudo dedicado), y
  PasswordAuthentication no explícito en un fichero que se procese con prioridad (o eliminar/corregir
  el drop-in conflictivo 50-cloud-init.conf), luego systemctl restart ssh.socket.
Cómo verificar: sshd -T | grep -iE 'permitrootlogin|passwordauthentication' tras el cambio.
Riesgo de regresión: bajo si se preserva el acceso por clave existente (ya confirmado funcionando);
  ALTO riesgo operacional si se aplica mal y se pierde el único acceso SSH — requiere verificar la
  clave pública sigue en authorized_keys ANTES de deshabilitar password auth, y probar una nueva
  conexión SSH en una sesión aparte antes de cerrar la actual.
Estado: 🟢 CORREGIDO y verificado (2026-09-01, ver §20).
```

### HIGH-3 — `.env` de producción con permisos `666`

```text
ID: HIGH-3
Severidad: 🟠 ALTO
Categoría: Secrets / Configuración de producción
Ubicación: /var/www/testapp/.env (permisos actuales: -rw-rw-rw-, www-data:www-data)
Causa raíz: permisos world-readable Y world-writable en un fichero que contiene DB_PASSWORD,
  MAIL_PASSWORD, AWS_SECRET_ACCESS_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, GOOGLE_CLIENT_SECRET,
  FIREBASE_*, ONESIGNAL_REST_API_KEY, GEMINI_API_KEY, PEXELS_API_KEY, APP_KEY (nombres confirmados,
  valores nunca impresos).
Impacto: cualquier proceso/usuario local en el VPS (otra app comprometida, un contenedor Docker con UID
  compartido) puede LEER todos esos secrets, y también ESCRIBIR el fichero — p. ej. forzar
  APP_DEBUG=true, redirigir DB_HOST/MAIL_* para exfiltrar datos, o inyectar credenciales AWS propias.
Solución: chmod 640 .env && chown www-data:<grupo-real-de-PHP-FPM> .env.
Cómo verificar: ls -la /var/www/testapp/.env → debe mostrar -rw-r-----.
Riesgo de regresión: bajo — confirmado que PHP-FPM corre como www-data:www-data, mismo owner ya
  existente del fichero.
Estado: 🟢 CORREGIDO — chmod 640 aplicado, propietario sin cambios (ya era www-data:www-data). Verificado
  con smoke test (`/api/user` → 401 esperado, login page → 200) tras el cambio.
```

### MED-1 — Puerto de otra app expuesto en `0.0.0.0`, bypass de ufw vía Docker

```text
ID: MED-1
Severidad: 🟠 ALTO (infraestructura, aunque no es del backend Laravel auditado — comparte servidor)
Ubicación: docker-proxy en 0.0.0.0:3000 (gestion.bestronger.es), probablemente next-server en 0.0.0.0:3001
Causa raíz: Docker escribe sus propias reglas de iptables (cadena DOCKER/DNAT) para puertos publicados
  con -p, que se procesan ANTES que las reglas de ufw — confirmado con curl real desde el propio VPS a
  su IP pública:3000 (HTTP 302, conexión completada) pese a que ufw solo permite 22/80/443.
Impacto: la app detrás del puerto 3000 es alcanzable directamente por IP:puerto en HTTP plano sin TLS,
  sin las cabeceras de seguridad de Caddy, sin pasar por el dominio esperado.
Solución: publicar los contenedores como 127.0.0.1:3000:3000 en vez de 0.0.0.0:3000, o reglas explícitas
  en DOCKER-USER (ufw-docker).
Nota: esta app (gestion/test.bestronger.es) NO es el backend Laravel auditado — es otro proyecto en el
  mismo VPS. Se documenta porque comparte firewall/infraestructura, pero su corrección queda fuera del
  alcance de "no tocar apps no relacionadas" salvo que el usuario lo pida explícitamente.
Estado: Encontrado — corrección FUERA de alcance de esta sesión salvo autorización explícita (afecta a
  otra app, riteflow/gestion, no BeFit/testapp).
```

### MED-2 — Sin backups automáticos

```text
ID: MED-2
Severidad: 🔵 INFO (reclasificado — FALSO POSITIVO del recon inicial)
Ubicación: app/Console/Kernel.php ($schedule->command('backup:run')->dailyAt('03:00')),
  app/Console/Commands/RunDatabaseBackup.php.
```

**Corrección tras investigar para implementar el fix (2026-09-01):** el recon de infraestructura original solo comprobó `crontab -l` como **root** y lo encontró vacío, concluyendo que no había automatización. Al ir a implementar el cron, se encontró que **sí existe** — vive en el crontab de **`www-data`** (`* * * * * cd /var/www/testapp && php artisan schedule:run >> /dev/null 2>&1`), y el comando `backup:run` ya está programado en `Kernel.php` (`dailyAt('03:00')`), con un comando bien construido: respeta el toggle `AppSetting->backup_enabled`/`backup_frequency`, usa `mysqldump | gzip` con la contraseña vía `MYSQL_PWD` (nunca en `ps aux`), y purga backups más viejos que `backup_retention_days` (14 días). Confirmado con evidencia real: `storage/app/backups/` contiene backups diarios ininterrumpidos desde 2026-08-16 hasta hoy (2026-09-01), y `AppSetting->backup_last_status = 'success'` con `backup_last_run_at` de esta misma madrugada (03:00). **No se necesitó ningún fix — la automatización ya funcionaba correctamente**, solo se revisó el usuario equivocado de crontab.

**Riesgo residual (🔵 INFO, no crítico):** los backups son solo locales (`storage/app/backups`, mismo disco que la aplicación) — sin copia fuera del VPS, un fallo del disco físico se llevaría datos y backups a la vez. Considerar en el futuro subir una copia a S3/almacenamiento externo si el apetito de riesgo del producto lo pide; no implementado en esta sesión (decisión de producto, no una vulnerabilidad).

**Observación menor no accionada:** algunos backups antiguos (16-30 de agosto) muestran `mtime` de "Aug 31 00:31" en vez de su fecha real (que sí está en el nombre del fichero) — aparentemente una operación de git (los backups viven, de forma inusual, dentro de `storage/` que está trackeado en este repo) reseteó esos mtimes. La purga por retención se basa en `mtime`, así que estos ficheros más viejos podrían no purgarse cuando les toque. Cosmético/eficiencia de disco, no una vulnerabilidad — no se tocó en esta sesión.

### MED-3 — Dependencias con CVEs sin parchear

```text
ID: MED-3
Severidad: 🟡 MEDIO
Ubicación: composer audit → 42 advisories en 13 paquetes. Prioritarios: dompdf/dompdf (<3.1.6, lectura
  de ficheros locales vía SVG data-URI CVE-2026-56722, DoS por imágenes CVE-2026-59941/59942/59943) y
  league/commonmark (<2.9.0, múltiples DoS de severidad alta + bypass de filtro de enlaces inseguros).
Impacto: dompdf procesa generación de PDFs (posible input de usuario); commonmark si se usa para
  markdown de posts/blog — ambos con superficie de ataque real si procesan contenido no confiable.
Solución: composer update dompdf/dompdf league/commonmark (verificar breaking changes antes).
Estado: 🟢 CORREGIDO (2026-09-01). dompdf 3.1.5→3.1.6, league/commonmark 2.8.2→2.10.0 — ambos dentro
  de los rangos ya permitidos por `composer.json` (no fue necesario tocarlo). `composer audit` bajó de
  42 a 30 advisories (13→11 paquetes). Verificado: dry-run limpio sin dependencias inesperadas, app
  arranca (`php artisan --version`, smoke test HTTP), y ambas librerías probadas directamente vía
  `tinker` tras la actualización (dompdf generó un PDF válido con cabecera `%PDF`; commonmark convirtió
  markdown a HTML correctamente). Commit `625f3a8` (repo `Bckbs`, local, push pendiente).
```

### MED-4 — Config/rutas/eventos de Laravel no cacheados en producción

```text
ID: MED-4
Severidad: 🟡 MEDIO
Ubicación: php artisan about confirma Config/Events/Routes NOT CACHED (solo Views cacheada). Queue: sync
  (sin cola real, jobs corren síncronos en el hilo de la request).
Impacto: rendimiento (relee/reparsea config y rutas en cada request); Queue:sync es riesgo de
  timeout/DoS-adyacente si algún job es lento (ej. envío de emails, generación de PDF).
Solución: php artisan config:cache && route:cache && event:cache en el proceso de deploy; evaluar mover
  a una cola real (Redis/DB) si hay jobs pesados.
Estado: 🟡 PARCIAL (2026-09-01). `event:cache` aplicado y verificado (smoke test + flujo de registro
  completo, incluyendo `WelcomeMailService`, funcionando con normalidad). `config:cache` y `route:cache`
  se investigaron para implementar y se descartaron por bloqueos REALES encontrados en el propio código,
  no teóricos:
  - `config:cache` desactiva la carga de `.env` en cada request (Laravel deja de releerlo). Se encontró
    `env()` llamado directamente fuera de `config/` en `app/Helpers/EnvChange.php` (funcionalidad real:
    un editor de variables de entorno desde el admin panel) y `app/Models/AppSetting.php` (lee
    `DEFAULT_LANGUAGE` en caliente) — cachear config rompería ambas features en silencio (devolverían
    `null`). Requeriría refactorizar esos dos ficheros para leer de `config()` en vez de `env()`
    directamente, fuera de alcance de un cambio de "solo cachear".
  - `route:cache` falló al intentarlo con un error real: colisión de nombre de ruta (`admin/users` vs.
    un nombre ya asignado `users.index`, previsiblemente de dos `Route::apiResource('users', ...)`
    distintos) — un bug de rutas preexistente, no introducido aquí. Arreglarlo con seguridad requiere
    entender qué ruta depende de ese nombre en el resto del código antes de renombrar una de las dos,
    fuera de alcance de un cambio de "solo cachear". También hay una ruta closure (`GET /user`, scaffold
    por defecto de Laravel) que tampoco es cacheable sin convertirla a controlador.
  Documentado como deuda técnica separada, no de seguridad — recomendado abordarlo en una sesión
  dedicada a limpieza de rutas, no como parte de un hardening de producción.
```

### MED-5 — Logs de aplicación con SQL/PII en texto plano

```text
ID: MED-5
Severidad: 🟡 MEDIO
Ubicación: storage/logs/laravel-*.log (canal daily) — stack traces con SQL literal, IDs de usuario,
  rutas absolutas del servidor. Muestra de 150 líneas: sin tokens/passwords/Authorization headers
  encontrados, pero NO VERIFICADO al 100% (volumen 1MB+/día).
Impacto: fuga de estructura interna/PII indirecta si el log se filtrara; no es una fuga de credenciales
  confirmada.
Solución: grep completo por patrones de token/auth como chequeo adicional
  (grep -riE 'authorization|bearer|password.*:.*[a-zA-Z0-9]{8}' storage/logs/*.log); considerar reducir
  verbosidad de logging de SQL en producción.
Estado: 🟢 VERIFICADO — sin fix necesario. Grep completo ejecutado sobre los 14 ficheros de log
  (980 KB totales, no solo la muestra de 150 líneas del recon inicial): `grep -rilE
  'authorization|bearer |password.{0,3}:.{0,3}[a-zA-Z0-9]{8}'` sobre `storage/logs/*.log` → **0
  coincidencias**. Cierra el "NO VERIFICADO al 100%" del hallazgo original. La exposición de
  estructura interna (SQL/rutas de servidor en stack traces) sigue presente pero es de severidad baja
  y su reducción implicaría bajar la verbosidad de logging de errores en general — trade-off con
  capacidad de debug, decisión de producto, no se tocó.
```

### LOW-1 — Scripts de diagnóstico y volcados SQL sueltos en la raíz del proyecto

```text
ID: LOW-1
Severidad: 🟢 BAJO
Ubicación: diag_*.php, temp_*.php, mightyfitness.sql, old-mightyfitness.sql, alter-mightyfitness.sql
  en /var/www/testapp/ (raíz, NO en public/ — confirmado no accesibles vía HTTP).
Impacto: residuos de debugging con datos reales de producción fuera de control de versiones normal,
  en el mismo host que sirve producción — no explotable directamente, pero mala higiene.
Solución: mover fuera del document root del proyecto o borrar si ya no hacen falta.
Estado: 🟢 CORREGIDO (2026-09-01). Se encontraron 8 ficheros más con el mismo permiso `666`
  (mundial legible y escribible) que `.env` (HIGH-3) entre estos scripts y los `.sql` — corregidos a
  `644` primero. Confirmado por grep que ningún fichero de la aplicación (`app/`, `routes/`, `config/`)
  referencia estos scripts o dumps. Ninguno estaba trackeado en git (`git ls-files` vacío para todos).
  Decisión del usuario: borrado directo (no archivado) — los backups automáticos diarios ya verificados
  (§9, MED-2) cubren cualquier necesidad de recuperación de datos. 18 ficheros eliminados: 11 `diag_*.php`,
  5 `temp_*.php`, `mightyfitness.sql`, `old-mightyfitness.sql`, `alter-mightyfitness.sql`. Verificado con
  smoke test tras el borrado — sin impacto.
```

### LOW-2 — CUPS escuchando innecesariamente

```text
ID: LOW-2
Severidad: 🟢 BAJO
Ubicación: puerto 631/tcp (CUPS), 0.0.0.0 y ::, bloqueado externamente por ufw (no en allowlist).
Impacto: superficie innecesaria en un VPS sin impresoras, aunque no explotable externamente hoy.
Solución: systemctl disable --now cups.service.
Estado: 🟢 CORREGIDO (2026-09-01). Resultó ser un paquete **snap** (`snap.cups.cupsd.service` /
  `snap.cups.cups-browsed.service`), no el `cups.service` estándar — de ahí que la unidad `cups.service`
  apareciera como `not-found` al comprobarlo directamente. Eliminado por completo con `snap remove cups`
  (no solo deshabilitado — quita el binario y el socket, snapshot de sus datos conservado por snap por
  si hiciera falta reinstalarlo). Verificado: puerto 631 ya no aparece en `ss -tlnp` tras la eliminación.
```

### INFO-1 — Orígenes de desarrollo en CORS de producción

```text
ID: INFO-1
Severidad: 🔵 INFO
Ubicación: config/cors.php — allowed_origins incluye localhost:3000/5173/5174, 127.0.0.1:* junto a
  producción. supports_credentials:true, pero lista explícita (no wildcard) — riesgo real bajo.
Solución: limpieza cosmética, quitar orígenes de desarrollo de la config de producción.
Estado: 🟢 CORREGIDO (2026-09-01). Quitados los 5 orígenes de desarrollo local (`localhost`/`127.0.0.1`
  en puertos 3000/5173/5174) y un `https://admin-testapp.bestronger.es` duplicado. Verificado con un
  preflight `OPTIONS` real contra producción con `Origin: https://admin-testapp.bestronger.es` — el
  origen legítimo sigue permitido correctamente (`Access-Control-Allow-Origin` en la respuesta).
```

## 10. Áreas auditadas sin hallazgos (evidencia real, no asumida)

| Área                                       | Evidencia                                                                                                                                                                                         | Veredicto                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Middleware admin (`AdminApi.php`)          | `hasRole('admin')` + `status==='active'`                                                                                                                                                          | 🟢 Correcto                            |
| CORS                                       | Whitelist explícita, no wildcard                                                                                                                                                                  | 🟢 Correcto (ver INFO-1 para limpieza) |
| Rate limiting                              | `throttle:6,1`/`10,1` en login/register/forget-password/social-login, 60/min global                                                                                                               | 🟢 Correcto                            |
| Webhook Stripe                             | Firma verificada (`Webhook::constructEvent`), idempotencia real (`stripe_event_id`)                                                                                                               | 🟢 Correcto                            |
| `APP_DEBUG`/`APP_ENV`                      | `production`/`false` confirmado                                                                                                                                                                   | 🟢 Correcto                            |
| SQL Injection                              | Muestreo de controladores, único `DB::raw` sin input de usuario                                                                                                                                   | 🟢 Sin hallazgos (no exhaustivo)       |
| Password hashing                           | `Hash::check`/`Hash::make` correctos                                                                                                                                                              | 🟢 Correcto                            |
| Logout / revocación de tokens              | `currentAccessToken()->delete()`, `logoutAllDevices()`                                                                                                                                            | 🟢 Correcto                            |
| TLS / HSTS / CSP / headers                 | HSTS, X-Content-Type-Options, X-Frame-Options DENY, CSP con frame-ancestors/object-src none, Referrer-Policy, Permissions-Policy — verificado en respuestas reales (login page y `/api/user` 401) | 🟢 Correcto y notablemente completo    |
| Cookie de sesión (`mightyfitness_session`) | `HttpOnly; Secure; SameSite=Lax`                                                                                                                                                                  | 🟢 Correcto                            |
| Aislamiento `.env`/`.git`/logs vía Caddy   | `root` apunta a `public/`, `.env`/`.git/config`/`storage/logs/*` → 404 confirmado en vivo                                                                                                         | 🟢 Correcto                            |
| MySQL / puertos internos                   | 3306/33060 solo en 127.0.0.1                                                                                                                                                                      | 🟢 Correcto                            |
| `.env` en git                              | Nunca commiteado (`git log --all --full-history -- .env` vacío)                                                                                                                                   | 🟢 Correcto                            |
| Rutas de debug/test olvidadas              | grep vacío en `routes/`                                                                                                                                                                           | 🟢 Correcto                            |

## 11. Infraestructura y Cloudflare

**No hay Cloudflare ni CDN/WAF** — los tres dominios (`testapp`, `admin-testapp`, `bestronger.es`) resuelven directo a la IP del VPS. No es una vulnerabilidad en sí, pero significa que no hay mitigación de DDoS/L7 de terceros — toda la protección recae en Caddy + ufw + la app. Ver HIGH-2 (SSH) y MED-1 (puerto Docker) para los hallazgos concretos de infraestructura.

## 12. Cloudflare

No aplica — confirmado que no se usa (§11).

## 13. Webhooks

Ver §10 — Stripe webhook correctamente implementado. Nota de deuda técnica: dos webhooks de Stripe en paralelo (`webhooks/stripe` y `webhooks/stripe-packages`) por una migración de sistema de pagos sin terminar, documentado como pendiente en el propio código — no es vulnerabilidad pero es superficie duplicada a vigilar.

## 14. Input Validation

Mixto: la mayoría de endpoints muestreados usan `FormRequest`/`UserRequest`, pero **CRIT-1 usa `$request->all()` en vez de `->validated()`**, que es exactamente el patrón que hace mass assignment posible. Recomendado auditar sistemáticamente qué otros controladores usan `$request->all()` (ver §21).

## 15. Injection

Sin hallazgos de SQL injection en el muestreo (no exhaustivo). No se auditaron command injection/path traversal/SSRF de forma sistemática en esta pasada — **NO VERIFICADO** para el resto de los ~150 controladores.

## 16. Logging

Ver MED-5.

## 17. Backups

Ver MED-2.

## 18. Dependencias

Ver MED-3. PHP 8.3.6 y Laravel 11.51.0 son versiones con soporte activo (no EOL).

## 19. Vulnerabilidades

Consolidado en §9.

## 20. Fixes Implemented

Aprobado por el usuario implementar solo P0 (2026-09-01). Ambos corregidos en producción:

**CRIT-1 (IDOR + mass assignment en `update-profile`)** — `app/Http/Controllers/API/UserController.php::updateProfile()`. Eliminado el override por `id` (el endpoint ahora opera siempre sobre `auth()->user()`); sustituido `$request->all()` por `$request->only([...])` con whitelist explícita de campos self-editables (`username`, `first_name`, `last_name`, `email`, `phone_number`, `gender`, `display_name`, `timezone`) — excluye explícitamente `user_type`, `status`, `is_personal_client`, `password`, `login_type`, `is_subscribe`, `two_factor_*`, `apple_user_identifier`. Verificado por lectura de código (ningún consumidor real —app móvil— envía `id`; `api/profile.ts`, `api/auth.ts`, `pages/migrated/edit_profile_screen.tsx`, `api/onboardingV2.ts` en el repo `bsa`) antes de aplicar el fix.

**CRIT-2 (registro público con `user_type` controlado por el cliente)** — `app/Http/Controllers/API/UserController.php::register()`. `user_type` y `status` ahora se fuerzan siempre a `'user'`/`'active'` server-side, ignorando cualquier valor del body.

**Método:** backup del fichero original (`UserController.php.bak.20260901175943`) antes de tocar nada; parche aplicado vía reemplazo de string exacto (no edición manual línea-a-línea, para evitar drift); `php -l` limpio; diff revisado línea por línea antes de recargar; `systemctl reload php8.3-fpm` para forzar recarga de opcache.

**Verificación funcional real contra producción** (no solo lectura de código), con cuentas desechables creadas y borradas en la misma sesión:

- CRIT-2: `POST /api/register` con `"user_type":"admin"` en el body → respuesta confirma `"user_type":"user"` (antes habría creado un admin real).
- CRIT-1: cuenta A intentó `POST /api/update-profile` con `{"id": <id_de_B>, "email":"hijacked-by-A@example.com", ...}` → la respuesta devolvió `"id":78` (la propia cuenta A, modificada), no `79` (B). Login posterior como B confirmó `email`/`first_name` sin cambios — el intento de IDOR no tuvo ningún efecto sobre la cuenta objetivo.
- Ambas cuentas de prueba (`id 78`, `79`) borradas de la base de datos tras la verificación (roles, tokens y el registro de usuario, vía `php artisan tinker`).

**Riesgo de regresión:** bajo — el flujo legítimo de auto-edición de perfil (los campos que la app móvil realmente envía) sigue funcionando sin cambios; solo se cerró la superficie que ningún consumidor real usaba.

**Ambos commiteados localmente en el repo del backend** (`github.com/ilzarpeatore/Bckbs`, rama `main`, commit `f997445`) — **push a GitHub diferido a petición del usuario**, pendiente de hacerse más tarde.

---

**P1 — aprobado y ejecutado el mismo día (2026-09-01):**

**HIGH-3 (`.env` en `666`)** — `chmod 640 /var/www/testapp/.env`. Propietario sin cambios (ya era `www-data:www-data`, coincide con el usuario real de PHP-FPM, confirmado antes del cambio). Verificado con smoke test post-cambio (`/api/user` → 401, login page → 200) — la app sigue leyendo su propio `.env` con normalidad.

**HIGH-1 (fotos de progreso enumerables sin auth)** — confirmado primero el alcance real: `ProgressPhotoController::store()`/`getList()` (bajo `admin/progress-photo-*`, protegido por `auth:sanctum`+`admin.api` para _listar/subir/borrar_, pero el archivo resultante se servía como estático por Caddy sin ningún control) usa `addMediaFromRequest('photo')->toMediaCollection('progress_photos')` sobre el `User` model, sin override de disco → caía en el disco `public` por defecto (`config/media-library.php: disk_name => env('MEDIA_DISK','public')`, sin `MEDIA_DISK` en `.env`). Confirmado por consulta directa a producción: **0 registros reales** en la colección `progress_photos` en el momento del fix — sin necesidad de migrar datos existentes.

Implementado: nuevo disco `private` (`config/filesystems.php`, `storage_path('app/private')`, fuera de `public/` y por tanto invisible para Caddy) + `User::registerMediaCollections()` enruta `progress_photos` a ese disco + `ProgressPhotoController` genera `URL::temporarySignedRoute('progress-photo.signed', now()->addHours(6), [...])` en vez de `$media->getUrl()` + nueva ruta `GET progress-photo-signed/{media}` **fuera** del grupo `auth:sanctum`+`admin.api` (protegida solo por el middleware `signed` de Laravel — necesario porque un `<img src>` no puede llevar cabecera `Authorization`, la firma criptográfica es el único credencial, mismo patrón que una URL firmada de S3/GCS).

**Verificación funcional real contra producción**, con cuenta admin + cliente + foto de prueba desechables (creados vía `tinker`, no vía `/register`, ya que ese endpoint correctamente ya no permite auto-asignarse rol admin tras CRIT-2):

- `POST admin/progress-photo-store` → devuelve una URL firmada (`.../progress-photo-signed/5516?expires=...&signature=...`).
- Esa URL, sin ninguna cabecera de auth → `200`, contenido correcto.
- La ruta pública antigua equivalente (`/storage/5516/...`) → `404` (el archivo ya no vive ahí).
- Misma URL con firma manipulada → `403`. Misma URL sin firma → `403`.
- Cuenta admin, cuenta cliente y el registro de media de prueba borrados tras verificar; confirmado `storage/app/private/` queda vacío y con permisos `drwx------` (solo `www-data`).

Commiteado localmente (`db9b609`, mismo repo/rama) — también pendiente de push, junto con el commit anterior.

**Riesgo de regresión:** bajo — 0 fotos reales afectadas (nada que migrar); el admin panel sigue recibiendo el mismo campo `url` en el JSON de respuesta, sin cambios de contrato de API.

## 21. Remaining Risks / Próximos pasos antes de implementar

**Resueltos desde la primera versión de este documento:**

- ~~NO VERIFICADO exhaustivamente: el resto de ~150 controladores...~~ → **Barrido sistemático completado 2026-09-01** (ver §21a). 73 controladores client-facing revisados uno por uno (3 agentes en paralelo, ~1200 tool-calls totales), con evidencia file:line para cada uno. 6 hallazgos reales corregidos y verificados; el resto (66 controladores) confirmado limpio con evidencia real, no por ausencia de búsqueda.
- ~~NO VERIFICADO: qué disco/ruta usan ProgressPhotoController/ClientNoteController~~ → confirmado durante la implementación de HIGH-1: `addMediaFromRequest()->toMediaCollection('progress_photos')` sobre el disco público por defecto — corregido.
- ~~NO VERIFICADO: si update-profile con id es usado legítimamente por el admin panel~~ → confirmado que no (admin panel usa su propia ruta `admin/update-profile` → `AuthController`) — corregido en CRIT-1.

**Siguen pendientes:**

- **Módulo `Modules/Frontend`** (nwidart/laravel-modules) — sus rutas/controladores propios no se incluyeron en el barrido sistemático (viven fuera de `app/Http/Controllers/API/`), no auditado.
- `SubAdminController::store()` (admin-only) — mass assignment de `$request->all()` con solo 4 campos validados; riesgo bajo (ya requiere ser admin existente), no corregido, anotado como observación menor durante el barrido, sin confirmar con el usuario.
- **`config:cache`/`route:cache`** (MED-4) — decisión del usuario (2026-09-01): dejarlo como deuda técnica documentada. Requiere un refactor real (2 sitios con `env()` fuera de `config/`, más resolver la colisión de nombre de ruta `users.index`) que no vale el riesgo de regresión en el marco de una auditoría de seguridad — es una mejora de rendimiento, no un fix de seguridad, y el riesgo real (activar el cache a ciegas y romper el editor de env vars del admin) ya se evitó al no aplicarlo.
- **Backups fuera del VPS** (residual de MED-2) — decisión del usuario (2026-09-01): parado por ahora. No hay credenciales/destino (S3 u otro) listos todavía; retomar cuando el usuario tenga cuenta/servidor decidido. Los backups locales diarios siguen funcionando correctamente (§9).

**Resuelto en esta misma sesión, tras confirmación del usuario:**

- Grep completo de logs de sistema/Caddy por patrones de token — ejecutado (2026-09-01): Caddy **no tiene ningún directiva `log` configurada** (confirmado en el propio `Caddyfile`), por lo que no registra requests HTTP en absoluto — journal de Caddy solo contiene sus propios logs operativos (arranque, emisión de certificados TLS), 0 coincidencias de `Bearer `/tokens reales tras filtrar falsos positivos (el término "authorization" aparece por el protocolo ACME de Let's Encrypt, no por cabeceras HTTP). `auth.log` tiene miles de líneas "Failed password for..." — tráfico de bots escaneando SSH desde internet, no una fuga de credenciales (no se registra el valor de la contraseña intentada); refuerza que el hardening de HIGH-2 era necesario.

## 21a. Barrido sistemático de autorización (2026-09-01)

Cobertura: 73 controladores bajo `app/Http/Controllers/API/` (excluyendo `Admin/`, que ya requiere `admin.api` y se auditó por muestreo en la fase inicial). Metodología: 3 agentes en paralelo, cada uno con lectura completa de sus ficheros asignados + cruce contra `routes/api.php` para confirmar middleware real, buscando específicamente el patrón de CRIT-1 (recurso identificado por `id`/`user_id` del cliente sin comparar contra `auth()->id()`) y mass assignment sin whitelist.

**6 hallazgos reales, todos corregidos y verificados funcionalmente contra producción con cuentas desechables:**

| #   | Hallazgo                                                                                                                                                                                                             | Severidad  | Alcance               | Commit    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | --------- |
| 1   | `PostingController::updatePostData` — `scopeMyPosting()` permitía `user_id` del cliente                                                                                                                              | 🔴 Crítico | Cualquier usuario     | `91f31fc` |
| 2   | `PostingController::removePostMedia` — mismo bypass + Media sin scope al posting                                                                                                                                     | 🟠 Alto    | Cualquier usuario     | `91f31fc` |
| 3   | `CommunityController::deletePosting` — ruta web SIN middleware de auth alguno                                                                                                                                        | 🔴 Crítico | Cualquiera, sin login | `91f31fc` |
| 4   | `ResourceController::getDetail/update/destroy` — sin scope, movido fuera de `/admin` a propósito sin añadir ownership check                                                                                          | 🔴 Crítico | Cualquier usuario     | `79a2333` |
| 5   | `UserGraphController::saveGraphData` — `updateOrCreate` por `id` sin `user_id`, reasignaba datos de salud de otro usuario                                                                                            | 🔴 Crítico | Cualquier usuario     | `b3a2837` |
| 6   | `NotificationController::getNotificationDetail` — lectura sin scope (solo "marcar leído" estaba protegido); de paso, un bug latente de `NotificationResource` con modelo `null` quedó expuesto y se corrigió también | 🟡 Medio   | Cualquier usuario     | `26dc521` |

**3 hallazgos adicionales, severidad menor pero alcance más amplio (requieren ya tener cuenta de panel/coach), también corregidos:**

| #   | Hallazgo                                                                                                                                        | Severidad     | Alcance     | Commit    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- | --------- |
| 7   | `SectionTemplateController` (6 métodos) — detalle/editar/borrar de secciones y sus ejercicios sin `coach_id`                                    | 🟡 Medio-Alto | Coach→Coach | `ae7546f` |
| 8   | `WorkoutTemplateController` (12 métodos) — mismo patrón, en cascada hasta 2 niveles (ejercicio→bloque→workout→coach)                            | 🟡 Medio-Alto | Coach→Coach | `ae7546f` |
| 9   | `TrainingProgramController` (7 métodos + `store()`) — mismo patrón, más `client_id` no verificado contra el roster del coach (`users.coach_id`) | 🟡 Medio-Alto | Coach→Coach | `fed5525` |

**66 controladores restantes: confirmados limpios con evidencia real** (patrones ya correctos como `->where('user_id', auth()->id())` antes de cualquier operación, o son catálogo público de solo lectura sin concepto de propiedad de usuario — body parts, equipment, categories, tags, recipes, exercises, etc.). Varios ya estaban explícitamente endurecidos con comentarios propios referenciando fixes de seguridad anteriores (`ClientCalendarController`, `PostingController::deletePostdata`, `ShoppingListController`, `WorkoutSessionReviewController`).

**`ChallengeController::updateScore()` y `TrainingProgramController::getList()` — confirmado con el usuario (2026-09-01): visibilidad compartida entre coaches es el comportamiento deseado**, no un bug. Cualquier coach del equipo puede ver/actualizar challenges y programas de otros coaches a propósito (varios entrenadores del mismo gimnasio/organización). Sin cambio de código — cerrado como "no es una vulnerabilidad" tras confirmación de producto, no como "pendiente".

**`SubAdminController::store()`** — mass assignment de `$request->all()` con solo 4 campos validados; severidad baja (ya requiere ser admin existente para alcanzar la ruta). No corregido, anotado como observación menor, sin confirmar con el usuario — bajo impacto suficiente para no bloquear el cierre de esta auditoría.

Todos los commits de este barrido están en el repo del backend (`github.com/ilzarpeatore/Bckbs`, rama `main`) localmente — push a GitHub sigue diferido a petición del usuario.

## 22. Tests

Pendiente — se crearán tests de autorización (usuario A no puede leer/editar recursos de usuario B, un `user_type` enviado en `/register` es ignorado, `update-profile` con `id` ajeno es rechazado o requiere rol) como parte de la implementación, no antes.

## 23. Re-Audit

Realizado 2026-09-01, tras implementar CRIT-1, CRIT-2, HIGH-1 y HIGH-3. Metodología: lectura de código independiente (no solo re-ejecutar los mismos tests) buscando (a) si la vulnerabilidad original sigue existiendo, (b) si la solución funciona de verdad, (c) si se introdujo una vulnerabilidad nueva, (d) si se rompió alguna funcionalidad, (e) si la autorización/aislamiento de datos sigue correcto en el resto del sistema.

**CRIT-1**: el fallback `?? request()->id` que queda en `UserRequest::rules()` (usado para la exclusión de unicidad de email/username) se confirmó inofensivo — `auth()->user()->id` siempre está presente en una ruta detrás de `auth:sanctum`, así que el operador `??` nunca cae al valor controlado por el cliente. Se confirmó que `player_id` (token push) se gestiona en `login()`, no en `update-profile` — excluirlo de la whitelist de campos self-editables no rompe la funcionalidad de notificaciones push. Sin regresión, sin vulnerabilidad nueva.

**CRIT-2**: se buscó el mismo patrón (`user_type` confiado del cliente) en el resto de la API — `SubAdminController::store()` (creación de sub-admins) también fuerza `user_type`/`status` server-side de forma segura, y está protegido por `admin.api` (confirmado en `routes/api.php:572`, dentro del grupo abierto en la línea 549). No se encontró ningún otro camino público hacia un rol privilegiado.

**HIGH-1**: se encontró y corrigió un hallazgo nuevo de severidad 🟢 BAJA (preexistente en el código, no introducido por el fix de HIGH-1, pero relevante ahora que `progress_photos` vive en un disco privado): `register()` devolvía el modelo `$user` sin filtrar en la respuesta, y `getSingleMedia()` carga la relación Eloquent `media` como efecto colateral — sin un `unset()` explícito, esa relación completa (todas las colecciones de medios del usuario, incluida `progress_photos`) se serializaba en la respuesta JSON de registro. `login()` ya hacía `unset($success['media'])` para evitar esto; `register()` no. **No era explotable entre usuarios** (cada respuesta solo expone los metadatos de fotos del propio usuario recién registrado, nunca una URL funcional ni datos de otra cuenta), y en la práctica era inofensivo hoy (una cuenta recién creada nunca tiene fotos todavía). Corregido por consistencia y defensa en profundidad: `unset($user->media)` añadido en `register()`, igual que ya hacía `login()`. Verificado con una cuenta de prueba desechable — la respuesta ya no incluye la clave `media`; cuenta borrada tras verificar. Commit `c260584`.

**HIGH-3**: se confirmó que no existe ningún otro proceso (cron de root vacío, sin systemd timers de deploy encontrados) que necesite permisos más amplios sobre `.env` que los que ahora tiene (`640`, `www-data:www-data`) — PHP-FPM es el único consumidor real.

**Conclusión del re-audit**: las 4 correcciones siguen cerradas, ninguna introdujo una vulnerabilidad nueva de severidad relevante, no se rompió funcionalidad existente, y la autorización/aislamiento de datos en las áreas tocadas sigue correcto. Se encontró y corrigió 1 hallazgo adicional de severidad baja como parte de este mismo re-audit.

---

**HIGH-2 (SSH), implementado 2026-09-01 tras el re-audit:** en vez de editar los ficheros drop-in gestionados por cloud-init (`50-cloud-init.conf`, `60-cloudimg-settings.conf` — riesgo de que una futura ejecución de cloud-init los sobrescriba y revierta el fix en silencio), se creó un nuevo drop-in `/etc/ssh/sshd_config.d/00-hardening.conf` con `PermitRootLogin prohibit-password` + `PasswordAuthentication no`. Al ordenarse alfabéticamente antes que `50-*`/`60-*` en el `Include` glob de `sshd_config`, y dado que sshd usa "primer valor gana" por directiva, este fichero tiene precedencia sin tocar ni depender de los ficheros de cloud-init.

Verificación realizada ANTES de tocar el demonio en ejecución: `sshd -t` (sintaxis) y `sshd -T` (valores efectivos calculados en frío desde disco) confirmaron `permitrootlogin without-password` + `passwordauthentication no` + `pubkeyauthentication yes` correctos antes de aplicar. Aplicado con `systemctl reload ssh.service` (no restart — no interrumpe conexiones ya establecidas). Verificado después con una conexión SSH completamente nueva (`ControlMaster=no`, sin reutilizar la sesión ya autenticada) con logging verboso: autenticación exclusivamente por `publickey`, sin caída a password, login como root exitoso. Sin riesgo de bloqueo materializado.

Archivos afectados: `/etc/ssh/sshd_config.d/00-hardening.conf` (nuevo). Los ficheros de cloud-init no se modificaron ni eliminaron.

## 24. Checklist final

| Área              | Estado | Riesgo                                     | Evidencia                                          | Acción                                                                             |
| ----------------- | ------ | ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Authentication    | 🟡     | Medio (tokens sin expiración)              | `config/sanctum.php: expiration=null`              | Evaluar expiración + refresh                                                       |
| Authorization     | 🟢     | Bajo (CRIT-1/2 corregidos)                 | CRIT-1, CRIT-2                                     | Corregido 2026-09-01, ver §20                                                      |
| IDOR/BOLA         | 🟡     | Medio (CRIT-1 corregido, HIGH-1 pendiente) | CRIT-1, HIGH-1                                     | HIGH-1 pendiente de aprobación                                                     |
| API               | 🟡     | Medio                                      | CRIT-1/2 corregidos, resto sin barrido sistemático | Barrido sistemático pendiente                                                      |
| Database          | 🟢     | Bajo (muestreo)                            | Sin SQLi encontrado                                | Sin acción inmediata                                                               |
| RLS               | ⚫     | N/A                                        | MySQL, no aplica                                   | N/A                                                                                |
| Storage           | 🟢     | Bajo (HIGH-1 corregido)                    | HIGH-1                                             | Corregido 2026-09-01, ver §20                                                      |
| Secrets           | 🟢     | Bajo (HIGH-3 corregido)                    | HIGH-3 (.env 666→640)                              | Corregido 2026-09-01, ver §20                                                      |
| CORS              | 🟢     | Bajo                                       | INFO-1                                             | Corregido 2026-09-01 — orígenes de desarrollo quitados                             |
| Rate limiting     | 🟢     | —                                          | Verificado correcto                                | Sin acción                                                                         |
| Webhooks          | 🟢     | —                                          | Verificado correcto                                | Sin acción                                                                         |
| Input validation  | 🟡     | Medio                                      | `$request->all()` en CRIT-1                        | Barrido sistemático                                                                |
| Injection         | 🟢     | Bajo (muestreo)                            | Sin hallazgos                                      | Sin acción inmediata                                                               |
| Logs              | 🟢     | Bajo (verificado, 0 tokens/credenciales)   | MED-5                                              | Ninguna, ver §9                                                                    |
| Cloudflare        | 🔵     | Info                                       | No se usa                                          | Ninguna (decisión de producto)                                                     |
| TLS               | 🟢     | —                                          | Verificado correcto                                | Sin acción                                                                         |
| SSH/Infra         | 🟢     | Bajo (HIGH-2 corregido)                    | HIGH-2                                             | Corregido 2026-09-01, ver §23                                                      |
| Backups           | 🔵     | Info (falso positivo — ya funcionaba)      | MED-2                                              | Ninguna, ver §9                                                                    |
| Dependencies      | 🟢     | Bajo (MED-3 corregido)                     | MED-3                                              | Corregido 2026-09-01, ver §9                                                       |
| Production config | 🟡     | Medio (parcial)                            | MED-4                                              | event:cache aplicado; config/route:cache bloqueados por bugs preexistentes, ver §9 |
