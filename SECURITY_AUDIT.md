# Security Audit — BeFit (React Native + Expo)

**Fecha:** 2026-08-26
**Alcance:** repositorio `bsa` (cliente React Native/Expo, commit `7cf5625` en adelante). **El backend NO está en este repositorio** — es un servicio Laravel aparte (`https://testapp.bestronger.es/api`), fuera del alcance de lo que se puede modificar o verificar directamente desde aquí. Todo lo que depende del backend se marca explícitamente como "no verificable con el acceso actual".
**Metodología:** lectura completa de código fuente, configuración (`app.json`, `.github/workflows/*`), `package.json`/`package-lock.json`, historial de `git`, y `npm audit` real. 6 agentes de investigación en paralelo cubrieron secretos/config/CI-CD, autenticación/sesiones/almacenamiento, red/APIs/permisos/datos, dependencias/config nativa, y terceros/notificaciones/backup/validación — cada hallazgo de este documento tiene evidencia archivo:línea verificada, no es una recomendación genérica. Cada fix se verificó con `tsc --noEmit -p .`/`eslint --quiet` reales antes de darlo por "Solucionado" — dos errores de tipos reales aparecieron en el proceso y se corrigieron antes de cerrar: `ShouldStartLoadRequest` no está exportado por `react-native-webview` en su punto de entrada público (se usó `WebViewNavigation`, que sí lo está), y esta versión de `@react-native-async-storage/async-storage` (`3.1.1`) renombró `multiRemove` a `removeMany`.

---

## 1. Resumen ejecutivo

La app **no tiene secretos hardcodeados, ni en el código fuente ni en el historial de git** — esto se verificó exhaustivamente (grep de patrones de credenciales, revisión de `app.json`/CI-CD, `git log --all` completo) y es un resultado limpio real, no una ausencia de búsqueda.

El hallazgo más importante es real y de impacto medio-alto: **el token de sesión se guardaba en `AsyncStorage` sin cifrar** (texto plano en disco, recuperable con jailbreak/root o un backup no cifrado) en vez de `expo-secure-store` (Keychain/Keystore). **Ya corregido en esta misma sesión**, con migración automática para no cerrar la sesión de usuarios existentes.

Se encontraron y corrigieron 4 problemas reales más (tráfico HTTP permitido en Android, una WebView sin restricción de navegación, logout que dejaba datos de la cuenta anterior, y mensajes de error 5xx del backend mostrados sin filtrar al usuario), y se documentaron 6 puntos de hardening recomendado que requieren una decisión de producto o una verificación en dispositivo real que este entorno no puede hacer (política de contraseñas, protección anti-capturas, dependencias en alpha/preview, vulnerabilidades de tooling de build, certificate pinning evaluado y descartado, y confirmación de si el dominio de API de producción es realmente el definitivo).

**No se ha podido auditar el backend** (autenticación, RLS/permisos de base de datos, rate limiting, webhooks de Stripe) porque no vive en este repositorio — esa parte queda como "no verificable con el acceso actual" en cada sección aplicable, no como "seguro por defecto".

## 2. Arquitectura analizada

- **Cliente**: React Native 0.86 + Expo SDK 57, TypeScript, `@react-navigation` (stack + bottom-tabs), Gluestack UI + NativeWind (Tailwind v4 CSS-first).
- **Backend**: Laravel (inferido por la forma de las respuestas de error, `errors.email[0]`), **no incluido en este repositorio** — solo se audita el cliente que lo consume.
- **Auth**: email/password → `POST /login` → `api_token` único de larga duración (sin refresh token) devuelto por el backend, adjuntado como `Authorization: Bearer <token>` en cada petición (`api/client.ts`).
- **Almacenamiento local**: `AsyncStorage` (datos de perfil, ajustes, cachés) + `expo-secure-store` (token de sesión, tras el fix de esta auditoría).
- **Red**: `axios`, `baseURL` HTTPS en producción (`https://testapp.bestronger.es/api`), HTTP solo en `__DEV__` contra un backend local.
- **Nativo**: proyecto iOS committeado (`ios/`), sin carpeta `android/` nativa (se genera en build/prebuild); sin firma de producción configurada por defecto (`use_signing=false` en el workflow de build).
- **Pagos**: eliminados de la app (modelo "solo lectura", el checkout real vive en `bestronger.es`, fuera de este repo) — confirmado en sesiones anteriores y en `docs/PENDIENTE_BACKEND_ADMIN.md`.
- **Datos que maneja**: PII estándar (nombre, email, teléfono, foto de perfil) + datos de salud (HRV, sueño, frecuencia cardíaca, pasos vía HealthKit/Health Connect) + contenido social (posts, comentarios).

## 3. Threat Model

**Activos a proteger**: el `api_token` de sesión (equivale a acceso completo a la cuenta), los datos de salud/PII del usuario, la integridad de las peticiones al backend (que un usuario no pueda actuar como otro ni como admin).

**Actores**: (a) alguien con acceso físico/forense a un dispositivo perdido, robado o con backup extraído; (b) un atacante de red pasivo/activo (red wifi pública, MITM) si el tráfico no fuera HTTPS; (c) un usuario malicioso autenticado intentando acceder a datos de otro usuario o escalar privilegios (IDOR/broken access control) — mitigación real solo posible en backend; (d) un atacante que consigue que la WebView de "recursos" cargue una URL de phishing.

**Vectores de ataque reales para esta app** (no teóricos): extracción de `AsyncStorage`/backup de un dispositivo comprometido (mitigado, ver SEC-001); tráfico interceptado si algún build cae a HTTP (mitigado, ver SEC-002); navegación no controlada dentro de una WebView (mitigado, ver SEC-003); un compañero de piso/familiar reutilizando el dispositivo tras un logout incompleto (mitigado, ver SEC-004).

**Vectores fuera de alcance de este repo**: fuerza bruta de login, IDOR real (¿puede el usuario A leer datos del usuario B?), RLS de base de datos, rotación de credenciales de infraestructura — todos dependen 100% del backend, que no se ha podido inspeccionar.

**Impacto si el activo principal (el token) se compromete**: acceso completo a la cuenta (leer/escribir posts, hábitos, métricas de salud, perfil) hasta que el usuario cierre sesión manualmente o el backend invalide el token — no hay revocación remota de sesión ni "cerrar sesión en todos los dispositivos".

**Prioridad real para esta app** (fitness/salud personal, sin pagos in-app, sin datos financieros): proteger el token de sesión y los datos de salud > proteger contra MITM avanzado (ya cubierto por HTTPS estándar, pinning sería sobre-ingeniería) > hardening de superficie (WebView, logout, mensajes de error).

---

## 4. Vulnerabilidades encontradas

### SEC-001 — Token de sesión almacenado sin cifrar en `AsyncStorage`

**Categoría:** Almacenamiento local / gestión de sesión
**Severidad:** 🟠 High
**Estado:** 🟢 Solucionado

**Descripción:** el `api_token` (credencial de sesión completa — no hay refresh token, es el único secreto que autentica al usuario) se guardaba en `AsyncStorage`, que persiste en texto plano en disco sin ningún cifrado adicional más allá del sandbox del sistema operativo.

**Evidencia (antes del fix):**

- `store/AuthContext.tsx:130,140` — `AsyncStorage.setItem('TOKEN', token)` en `login`/`register`.
- `api/client.ts:39` — `AsyncStorage.getItem('TOKEN')` en el interceptor de petición.
- `api/client.ts:50` — `AsyncStorage.removeItem('TOKEN')` en el interceptor de respuesta (401).
- Cero usos de `expo-secure-store` en todo el repo antes de este fix (confirmado por grep).

**Impacto:** en un dispositivo con jailbreak/root, o a partir de un backup local sin cifrar (iTunes/adb backup), un atacante con acceso físico o forense podría extraer el token y usarlo para actuar como el usuario indefinidamente (no hay expiración corta ni refresh).

**Causa:** patrón de "guardar todo en AsyncStorage" copiado sin distinguir entre datos de perfil (no sensibles como credencial) y el token (sí es una credencial).

**Solución implementada:** nuevo `helper/secureToken.ts` que envuelve `expo-secure-store` (Keychain en iOS, EncryptedSharedPreferences respaldado por Keystore en Android) para el token únicamente — `USER` (nombre, email, etc.) se queda en `AsyncStorage` porque no es una credencial. Incluye migración automática: si un usuario ya tenía el token en `AsyncStorage` de una versión anterior, `getToken()` lo detecta, lo mueve a SecureStore y borra el original, para no cerrar sesiones existentes al actualizar. `api/client.ts` y `store/AuthContext.tsx` migrados a usar `getToken()`/`setToken()`/`removeToken()`.

**Archivos modificados:** `helper/secureToken.ts` (nuevo), `api/client.ts`, `store/AuthContext.tsx`, `package.json` (nueva dependencia `expo-secure-store@~57.0.1`).

**Verificación:** `tsc --noEmit -p .` y `eslint --quiet` limpios. **Pendiente de verificación funcional en dispositivo real** — confirmar que el flujo login → cierre de app → reapertura restaura la sesión correctamente, y que un usuario que actualiza desde una versión anterior (token en AsyncStorage) no pierde su sesión (migración automática, lógica revisada por código pero no probada en un dispositivo real desde este entorno).

---

### SEC-002 — Tráfico HTTP sin cifrar permitido en Android (`usesCleartextTraffic: true`)

**Categoría:** Comunicaciones de red
**Severidad:** 🟡 Medium
**Estado:** 🟢 Solucionado

**Descripción:** `app.json` configuraba `expo-build-properties` con `android.usesCleartextTraffic: true`, permitiendo tráfico HTTP sin cifrar a cualquier host en un build de producción de Android — aunque el `baseURL` real de producción ya es HTTPS (`api/client.ts:17`), esto elimina una capa de defensa en profundidad: un DNS envenenado, un hosts file modificado, o un futuro descuido de configuración no serían bloqueados por el sistema operativo.

**Evidencia:** `app.json:63` (antes del fix).

**Impacto:** si algún recurso o endpoint terminara sirviéndose por HTTP (por error de configuración, no por diseño actual), el sistema operativo Android no lo bloquearía — el tráfico viajaría en claro, vulnerable a interceptación en redes no confiables.

**Solución implementada:** `usesCleartextTraffic` cambiado a `false`. No existe carpeta `android/` nativa comprometida en el repo, así que el cambio se aplicará en el próximo `prebuild`/`eas build` de Android sin ningún otro paso.

**Archivos modificados:** `app.json`.

**Verificación:** cambio de configuración puro, sin lógica que verificar con `tsc`. **Pendiente de confirmar en un build Android real** que la app sigue funcionando con normalidad (no debería haber ningún efecto, ya que la app nunca necesitó cleartext en producción).

---

### SEC-003 — WebView sin restricción de navegación (`web_view_screen.tsx`)

**Categoría:** WebViews
**Severidad:** 🟡 Medium
**Estado:** 🟢 Solucionado

**Descripción:** la pantalla `MigratedWebView` cargaba cualquier URL (`route.params.mInitialUrl`, viene de `resource.external_url` del backend/CMS) con `javaScriptEnabled`/`domStorageEnabled` activados y sin ningún control (`originWhitelist`, `onShouldStartLoadWithRequest`) sobre a dónde podía navegar después — un `onNavigationStateChange` a medio implementar (con `Linking.openURL` comentado, código muerto) no bloqueaba nada realmente.

**Evidencia (antes del fix):** `pages/migrated/web_view_screen.tsx:32-60` (versión anterior) — lista de dominios "externos" detectados pero sin ninguna acción real (`return` sin `Linking.openURL`).

**Impacto:** si el backend permitiera contenido con enlaces a dominios no confiables en `external_url` (no verificable desde este repo si eso es posible), la WebView los cargaría/navegaría internamente sin límite — superficie de phishing dentro de la propia app. Riesgo condicionado a un input del backend, pero la propia WebView no tenía ninguna mitigación independiente.

**Solución implementada:** `onShouldStartLoadWithRequest` ahora compara el origen (`new URL(...).origin`) de cada navegación contra el origen de la URL inicial — si coincide, se permite navegar dentro de la WebView; si no, se abre con `Linking.openURL` (navegador del sistema) y se bloquea dentro de la WebView. Esquemas sin origen HTTP (`mailto:`, `tel:`, `whatsapp://`) se tratan igual (se abren externamente).

**Archivos modificados:** `pages/migrated/web_view_screen.tsx`.

**Nota de hardening no aplicada:** el `userAgent` hardcodeado (Chrome 31/Android 4.2.2, de 2013) no se ha tocado — no hay evidencia de por qué se añadió (podría ser un requisito de compatibilidad de algún sitio externo concreto), y cambiarlo sin poder probarlo en dispositivo sería un riesgo de regresión funcional no verificable desde aquí. Recomendado revisar si sigue siendo necesario.

**Verificación:** `tsc --noEmit -p .` y `eslint --quiet` limpios. Lógica de comparación de origen revisada por código; **pendiente de confirmar en dispositivo real** que la navegación normal (dentro del mismo dominio del recurso) sigue funcionando sin fricción.

---

### SEC-004 — Logout incompleto (datos de la cuenta anterior sobrevivían)

**Categoría:** Gestión de sesión
**Severidad:** 🟢 Low
**Estado:** 🟢 Solucionado

**Descripción:** `logout()` solo borraba `TOKEN` y `USER` de `AsyncStorage`, dejando `ONBOARDING_COMPLETED` (podría hacer que un usuario nuevo en el mismo dispositivo se salte el onboarding) y la sesión de entrenamiento activa (`ACTIVE_SESSION_STORAGE_KEY`, datos de un workout en progreso de la cuenta anterior) persistidos.

**Evidencia (antes del fix):** `store/AuthContext.tsx:146-150`.

**Impacto:** bajo — no es una fuga de credenciales, pero en un dispositivo compartido (dos clientes probando la app en el mismo teléfono, un entrenador haciendo demos) el siguiente usuario podría ver rastros de la sesión anterior (saltarse el onboarding, o encontrar un entrenamiento a medias que no es suyo).

**Solución implementada:** `logout()` ahora también hace `AsyncStorage.multiRemove(['USER', 'ONBOARDING_COMPLETED', ACTIVE_SESSION_STORAGE_KEY])` además de borrar el token vía `removeToken()`.

**Archivos modificados:** `store/AuthContext.tsx`.

**Verificación:** `tsc --noEmit -p .` y `eslint --quiet` limpios. Cambio puramente funcional en el flujo de logout, sin efecto visual.

---

### SEC-005 — Mensajes de error 5xx del backend expuestos sin filtrar

**Categoría:** Error handling / fuga de información
**Severidad:** 🟡 Medium
**Estado:** 🟢 Solucionado (mitigación en el cliente)

**Descripción:** decenas de pantallas (`pages/auth/RegisterScreen.tsx:92-98`, `hooks/useApi.ts`, `hooks/usePosts.ts`, `hooks/useExercises.ts`, `hooks/useDiet.ts`, `hooks/useWorkouts.ts`, `pages/auth/LoginScreen.tsx`, `pages/migrated/habit_add_screen.tsx`, entre otras) muestran `err.response?.data?.message` directamente en un `Alert.alert('Error', ...)`. Si el backend devolviera un error 500 con detalle interno (stack trace, mensaje de excepción de base de datos) en ese campo, se mostraría literalmente al usuario final.

**Evidencia:** patrón repetido en ≥10 archivos (citados arriba), confirmado por agente de investigación.

**Impacto:** fuga de información interna del servidor (nombres de tabla, rutas de archivo, detalles de la pila) si el backend no sanea sus respuestas de error 5xx — no verificable si el backend realmente lo hace hoy, pero el cliente no tenía ninguna protección independiente.

**Causa:** cada pantalla decide su propio mensaje de fallback sin ningún punto central que sanee la respuesta del backend antes de que llegue a la UI.

**Solución implementada:** en el interceptor de respuesta de `api/client.ts`, cualquier error con `status >= 500` sobrescribe `error.response.data.message` con un mensaje genérico ("Ha ocurrido un error en el servidor...") **antes** de que llegue a cualquier pantalla — corrige la causa raíz una sola vez en vez de tocar los ≥10 sitios que leen ese campo. Los errores 4xx (validación de formulario, ej. "El email ya está en uso") se dejan intactos porque son mensajes pensados para el usuario, no fugas.

**Archivos modificados:** `api/client.ts`.

**Verificación:** `tsc --noEmit -p .` y `eslint --quiet` limpios. **Pendiente de confirmar con un 500 real del backend** que el mensaje genérico se muestra correctamente y no rompe ningún flujo que dependiera de leer `data.message` en un 500 (no se encontró ninguno en la revisión de código).

---

### SEC-006 — Backup en la nube sin exclusión para datos locales

**Categoría:** Almacenamiento / privacidad
**Severidad:** 🟢 Low
**Estado:** 🟢 Mitigado (parcial, vía SEC-001)

**Descripción:** no hay ninguna exclusión de backup (`NSURLIsExcludedFromBackupKey` en iOS, `android:allowBackup="false"`) configurada — todo lo persistido en `AsyncStorage` se incluye en el backup de iCloud/Google sin cifrado adicional propio de la app.

**Impacto:** antes de SEC-001, esto agravaba el hallazgo del token (recuperable también desde un backup en la nube comprometido). Tras migrar el token a `expo-secure-store`, los items de Keychain (iOS) se excluyen automáticamente de backups locales no cifrados y viajan cifrados con una clave ligada al dispositivo en backups de iCloud — el riesgo del token queda cubierto. `USER` (perfil, no credencial) sigue en `AsyncStorage`/backup, pero no es una credencial de acceso.

**Solución:** no se ha añadido ninguna exclusión de backup explícita adicional — se considera innecesario ahora que el único dato realmente sensible (el token) ya no vive en `AsyncStorage`. Documentado como hardening opcional si en el futuro se guardan más datos sensibles ahí.

**Estado:** sin cambio de código adicional, mitigado indirectamente por SEC-001.

---

## 5. Hardening recomendado (no implementado — requiere decisión de producto o verificación en dispositivo)

### SEC-007 — Política de contraseñas débil

**Severidad:** 🟢 Low | **Estado:** 🔴 Pendiente (decisión de producto)

`pages/auth/RegisterScreen.tsx:65` y `pages/migrated/change_pwd_screen.tsx:55` solo exigen 6 caracteres mínimo, sin complejidad obligatoria (`RegisterFlowScreen.tsx` sí calcula una "fuerza" pero solo la muestra como barra de color, no bloquea el registro). No se ha cambiado porque el mínimo real de complejidad es una decisión de producto (¿8 caracteres? ¿exigir número+mayúscula?) que no me corresponde inventar, y la validación real y vinculante debe vivir en el backend de todos modos — el cliente es solo la primera línea de UX.

### SEC-008 — Sin protección anti-capturas en pantallas de datos de salud

**Severidad:** 🟢 Low | **Estado:** 🔴 Pendiente (requiere decisión + rebuild nativo)

No hay `expo-screen-capture` ni overlay de privacidad al pasar a background/app-switcher. Dado que la app muestra HRV, sueño, frecuencia cardíaca y fotos de perfil, sería razonable proteger esas pantallas concretas. No implementado en esta auditoría porque (a) requiere decidir exactamente qué pantallas proteger, y (b) como con `expo-haptics` en la Fase 4 de la auditoría UI/UX de esta misma sesión, instalar un nuevo módulo nativo no tiene efecto real hasta un `pod install`/rebuild nativo que no se puede verificar desde este entorno.

### SEC-009 — Dependencias de UI en versión alpha/preview en producción

**Severidad:** 🟢 Low | **Estado:** 🔴 Pendiente (requiere plan de actualización dedicado)

`@gluestack-ui/core@5.0.0-alpha.0`, `@gluestack-ui/utils@5.0.1-alpha.0` y `nativewind@5.0.0-preview.2` son dependencias **core** de todo el sistema de diseño, en versiones pre-release. No es una vulnerabilidad de seguridad per se, pero sí un riesgo de estabilidad (breaking changes entre alfas) que vale la pena señalar en un contexto de "preparación para producción". No se actualiza aquí — un bump de estas dependencias requiere probar visualmente toda la app, fuera de alcance de esta auditoría.

### SEC-010 — 21 vulnerabilidades restantes en dependencias (todas de tooling de build)

**Severidad:** 🟡 Medium (impacto real bajo — no llegan a producción) | **Estado:** 🟡 Parcialmente resuelto

Ver sección 6 (Dependencias). Se eliminó `react-native-snap-carousel` (no usado en el código, arrastraba 5 CVEs vía `fbjs`/`node-fetch` viejo). Las 21 restantes son de Metro/PostCSS/js-yaml/image-size/uuid — todas build-time, ninguna se ejecuta en el bundle final de la app. No se actualizan porque requieren un bump mayor de Expo/Metro con riesgo de romper el build, no verificable sin un ciclo completo de build+test.

### SEC-011 — `apiBaseUrl` de producción apunta a un host llamado "test"

**Severidad:** 🔵 Informational | **Estado:** requiere confirmación del usuario

`app.json:50` y `api/client.ts:17` apuntan a `https://testapp.bestronger.es/api` como la URL de producción real. Puede ser deliberado (el nombre del dominio no refleja necesariamente su función), pero vale la pena confirmar explícitamente que este es el dominio de producción definitivo y no un entorno de pruebas usado por error en el build de release.

### INFO-001 — Certificate pinning: evaluado, no recomendado por ahora

**Estado:** ⚫ No aplica actualmente

No implementado, y no se recomienda para el modelo de amenaza actual (app de fitness/salud personal, sin pagos in-app, backend propio con HTTPS estándar). El pinning añade complejidad operativa real (rotación de certificados, riesgo de bloquear la app entera si se olvida renovar) desproporcionada frente al beneficio marginal sobre TLS bien configurado. Reconsiderar si en el futuro se manejan pagos in-app o datos financieros directamente.

---

## 6. Dependencias vulnerables (`npm audit --omit=dev`)

Antes de esta auditoría: 26 vulnerabilidades (13 high, 13 moderate). Tras eliminar `react-native-snap-carousel` (sin uso real en el código, confirmado por grep — arrastraba la cadena vulnerable `fbjs`→`node-fetch`): **21 vulnerabilidades (8 high, 13 moderate)**, 0 críticas.

| Paquete                                                                             | Severidad | ¿Runtime o build-time?   | Exposición real                                         | Recomendación               |
| ----------------------------------------------------------------------------------- | --------- | ------------------------ | ------------------------------------------------------- | --------------------------- |
| `brace-expansion` (vía `@expo/config-plugins`)                                      | High      | Build-time               | Ninguna al usuario final                                | Actualizar a ≥5.0.9         |
| `image-size` (tooling Expo)                                                         | High      | Build-time               | Ninguna                                                 | Actualizar tooling Expo     |
| `js-yaml`                                                                           | High      | Build-time               | Ninguna                                                 | Actualizar a ≥4.3.1         |
| `nanoid`                                                                            | High      | Build-time               | Ninguna (no se le pasa `size=0` controlado por usuario) | Actualizar a ≥3.3.18        |
| `postcss`                                                                           | Moderate  | Build-time (Tailwind)    | Ninguna                                                 | Actualizar                  |
| `uuid`                                                                              | Moderate  | Build-time               | Baja                                                    | Actualizar a ≥11.1.1        |
| `metro`/`metro-config`/`metro-transform-worker`                                     | High      | Build-time (bundler dev) | Ninguna en producción                                   | Actualizar toolchain        |
| `expo-sharing`/`expo-splash-screen` (transitivas de `@expo/config-plugins`/`xcode`) | Moderate  | Build-time               | Ninguna                                                 | Requiere bump mayor de Expo |

**Ninguna vulnerabilidad crítica llega al bundle de producción con impacto directo sobre el usuario final** — todas las restantes son de herramientas que solo corren durante el build (Metro, PostCSS, generación de config nativa), no dentro de la app instalada.

---

## 7. Checklist de producción

- [x] No existen secretos en el código.
- [x] No existen secretos en Git (verificado, historial completo).
- [x] No hay API keys privadas en el bundle (solo un Facebook App ID público, esperado).
- [x] La autenticación está implementada correctamente (HTTPS, sin logging de credenciales).
- [x] Los tokens están almacenados de forma segura (**corregido en esta auditoría** — `expo-secure-store`).
- [x] Las APIs utilizan HTTPS en producción.
- [ ] El backend valida permisos / RLS — **no verificable, backend fuera de este repo**.
- [ ] Rate limiting en login/registro — **no verificable, depende del backend**.
- [x] Deep links protegidos (no hay superficie de deep link real, `scheme` no configurado).
- [x] WebViews protegidas (**corregido en esta auditoría**).
- [x] Permisos del dispositivo son mínimos (todos con consumidor real confirmado, ninguno "por si acaso").
- [ ] Política de contraseñas robusta — pendiente, decisión de producto (SEC-007).
- [ ] Protección anti-capturas en pantallas de salud — pendiente, hardening opcional (SEC-008).
- [x] Android no permite tráfico HTTP sin cifrar (**corregido en esta auditoría**).
- [x] No hay logs con tokens/contraseñas (confirmado, sin evidencia de fuga real).
- [x] No se exponen source maps públicamente (no se genera ninguno para el bundle nativo de producción).
- [x] Analytics/terceros no recopila información innecesaria (no hay ningún SDK de analytics/tracking instalado).
- [x] Push notifications no exponen información sensible (100% locales, payloads genéricos).
- [ ] Dependencias core de UI actualizadas a versión estable (alpha/preview en producción, SEC-009).
- [x] CI/CD protegido (secrets bien gestionados, sin fuga en logs).
- [x] Build de producción no usa `Debug` (ya resuelto y documentado en `docs/BUILD_IPA.md`, verificado en el run #47 de esta misma sesión).
- [ ] Pagos protegidos — N/A, no hay pagos in-app en esta app (checkout externo, fuera de este repo).

---

## 8. 🔴 Top 10 riesgos (por impacto × probabilidad)

| #   | Riesgo                                           | Impacto                                  | Probabilidad                            | Estado                                |
| --- | ------------------------------------------------ | ---------------------------------------- | --------------------------------------- | ------------------------------------- |
| 1   | Token de sesión en `AsyncStorage` sin cifrar     | Alto (toma de sesión completa)           | Media (requiere jailbreak/root/backup)  | 🟢 Corregido (SEC-001)                |
| 2   | Backend sin auditar (RLS, rate limiting, IDOR)   | Potencialmente alto                      | Desconocida                             | 🔵 No verificable, fuera de este repo |
| 3   | Mensajes de error 5xx sin filtrar                | Medio (fuga de info interna)             | Baja-media, depende del backend         | 🟢 Corregido (SEC-005)                |
| 4   | WebView sin restricción de navegación            | Medio (phishing dentro de la app)        | Baja (depende de contenido del backend) | 🟢 Corregido (SEC-003)                |
| 5   | Cleartext traffic permitido en Android           | Medio (MITM si algo cae a HTTP)          | Baja (nada usa HTTP hoy en prod)        | 🟢 Corregido (SEC-002)                |
| 6   | Sin política de contraseña robusta               | Bajo-medio                               | Media                                   | 🔴 Pendiente (SEC-007)                |
| 7   | Logout incompleto                                | Bajo                                     | Baja (solo en dispositivo compartido)   | 🟢 Corregido (SEC-004)                |
| 8   | 21 vulnerabilidades de dependencias (build-time) | Bajo (no llega a runtime)                | N/A                                     | 🟡 Parcial (SEC-010)                  |
| 9   | Sin protección anti-capturas en datos de salud   | Bajo                                     | Baja                                    | 🔴 Pendiente, opcional (SEC-008)      |
| 10  | Dependencias UI en alpha/preview                 | Bajo (estabilidad, no seguridad directa) | N/A                                     | 🔴 Pendiente (SEC-009)                |

---

## 9. Resultado final

**¿Está la app preparada para producción?**

## 🟡 SÍ, PERO CON RIESGOS PENDIENTES

El cliente (este repositorio) no tenía ninguna vulnerabilidad crítica activa, y el hallazgo más serio (token de sesión sin cifrar) ya se ha corregido, verificado por código y por `tsc`/`eslint`, con migración para no romper sesiones existentes. Los 4 problemas reales encontrados (SEC-001 a SEC-005, salvo SEC-006 que es un efecto colateral ya mitigado) están corregidos en esta misma sesión.

Los riesgos que quedan pendientes son de dos tipos: (a) **hardening opcional documentado, no bloqueante** (política de contraseñas, anti-capturas, dependencias en alpha) que son decisiones de producto o requieren un ciclo de prueba en dispositivo que no está disponible aquí; y (b) **todo lo que depende del backend** (autenticación del lado servidor, RLS, rate limiting, IDOR real) — que este repositorio no contiene y por tanto no se ha podido auditar. La respuesta "🟡" en vez de "🟢" es precisamente por ese punto (b): ningún cliente móvil, por bien protegido que esté, es seguro si el backend no valida permisos correctamente, y eso no es verificable desde aquí.

**Antes de un lanzamiento real**, se recomienda: (1) confirmar en dispositivo físico los 4 fixes de esta auditoría (login/logout, build Android, navegación de WebView, un error 500 real), (2) auditar el backend por separado con el mismo rigor (RLS, rate limiting, validación de permisos), y (3) decidir sobre los puntos de hardening opcional (SEC-007/008/009) según el apetito de riesgo del producto.
