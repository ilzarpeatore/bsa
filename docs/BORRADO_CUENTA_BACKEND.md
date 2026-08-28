# Borrado de cuenta — lo que falta en el backend

**Fecha:** 2026-08-28
**Por qué existe este documento:** Apple (App Store Review Guideline 5.1.1(v)) y Google Play exigen que, si una app permite crear una cuenta, también permita **eliminarla desde dentro de la app**, sin depender de un email o llamada a soporte. Es un requisito de publicación, no una mejora de producto — sin esto la app no pasa review de Apple.

**Lo que ya existe (este repo, cliente React Native):**

- Botón "Eliminar cuenta" en `pages/migrated/edit_profile_screen.tsx` (Ajustes → Editar perfil → "Zona de peligro"), con doble confirmación (`Alert.alert` en dos pasos, la segunda con estilo destructivo) porque es una acción irreversible.
- `authApi.deleteAccount()` en `api/auth.ts` → `POST v1/delete-account`, sin payload obligatorio (solo un `reason` opcional para contexto del coach).
- Al recibir éxito, el cliente llama a `logout()` de `AuthContext` (revoca el token localmente, limpia `AsyncStorage`, vuelve a la pantalla de login).
- **El endpoint no existe en el backend todavía** — hoy este botón falla con 404 (mismo patrón que otros formularios ya construidos en el cliente a la espera de su pieza de servidor, ver `docs/PENDIENTE_BACKEND_ADMIN.md`).

**Lo que hace falta implementar en el backend Laravel** (`fitness-backend`, repo separado, no accesible desde esta sesión):

---

## 1. Endpoint

```
POST /api/v1/delete-account
Authorization: Bearer <api_token>
Body (opcional): { "reason": "string" }
Respuesta: { "message": "Cuenta eliminada correctamente." }
```

- Igual que el resto de endpoints "de mi cuenta" (`update-profile`, `change-password`), el usuario objetivo sale del token autenticado — **no** recibe un `user_id` en el payload. Esto evita que un cliente pueda borrar la cuenta de otro.
- Debe funcionar para cualquier `user_type` normal (cliente de entrenamiento), pero **ver la sección 4 sobre coaches** antes de dejarlo abierto a todos los roles.

## 2. Qué hacer con los datos — decisión de producto necesaria

Hay dos estrategias válidas según GDPR (aplica: usuarios en España) y ambas cumplen el requisito de Apple/Google, pero tienen implicaciones de negocio distintas. **Se necesita decidir cuál usar antes de implementar** — no es una decisión que se pueda tomar solo desde el código:

### Opción A — Borrado inmediato y total (más simple, más arriesgado)

Al llamar al endpoint: borrar en cascada todas las filas del usuario en todas las tablas que lo referencian (ver lista en la sección 3), sin posibilidad de recuperación.

- Riesgo real: un usuario que pulsa el botón por error (o un coach que gestiona la cuenta de un cliente y se equivoca) pierde el historial de entrenamiento del cliente sin ninguna vía de recuperación, y el coach pierde ese historial también (relevante para un negocio de entrenamiento personal, donde ese historial tiene valor de negocio más allá del propio usuario).
- Cumple igualmente el requisito de Apple/Google (ellos no exigen periodo de gracia, solo que el borrado sea real y no dependa de contactar soporte).

### Opción B — Soft-delete inmediato + purga real diferida (recomendado)

Al llamar al endpoint, **inmediatamente**:

1. Revocar todos los `personal_access_tokens` del usuario (cierra sesión en todos los dispositivos al instante — igual de "borrado" desde el punto de vista del usuario y de la revisión de Apple/Google, que solo miran que la cuenta deje de ser usable).
2. Marcar `users.status = 'deleted'` (o columna nueva `deleted_at`, soft-delete estilo Laravel `SoftDeletes`) — el login con esa cuenta deja de funcionar inmediatamente.
3. Anonimizar los campos directamente identificativos: `email` → algo tipo `deleted-{id}@deleted.bestronger.es` (único, para no romper el `unique` de la columna si el usuario quisiera crear una cuenta nueva con el mismo email real), `first_name`/`last_name` → `"Usuario eliminado"`, `phone_number` → null, borrar `profile_image` del storage.
4. Sacar al usuario de la lista de clientes activos del coach (para que no siga apareciendo en el panel del entrenador como cliente real).

Y **en un job programado** (ej. `php artisan schedule`, corriendo cada noche), pasados N días (sugerido: 30) desde `deleted_at`, purgar de verdad las filas de las tablas de la sección 3 para las cuentas marcadas `deleted` desde hace más de N días.

Esto es compatible con Apple/Google (la cuenta deja de ser utilizable al instante, que es lo que revisan) y da un margen de seguridad ante un borrado accidental o un caso de soporte ("me arrepentí, ¿podéis recuperar mi cuenta?"), muy relevante en una app donde los clientes pagan a un coach y el error de un cliente no debería poder borrar sin remedio el trabajo del coach.

**Recomendación de esta nota:** Opción B. Pero es una decisión de producto/negocio, confirmar con el usuario antes de implementar.

## 3. Tablas afectadas — qué borrar/anonimizar

El ERD completo del backend está en `docs/backend-app-analysis.md` (120+ tablas). No hace falta releer ese documento entero para esto — la forma correcta de encontrar la lista exacta es una query real contra el schema, no adivinarla aquí:

```sql
-- Encuentra todas las tablas con una FK hacia users(id) — esa es la lista real
-- de qué hay que borrar/anonimizar, no hay que mantenerla a mano en este doc.
SELECT
  tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.referenced_table_name = 'users';
```

Categorías esperadas (a partir del ERD ya documentado, para orientar el trabajo, **verificar contra el schema real antes de implementar**):

- **Estrictamente personal, borrar sin más (Opción A o B tras el periodo de gracia):** `user_profiles`, `health_data_points`/`readiness_scores` (datos de salud — GDPR trata esto como categoría especial, mayor motivo para borrarlo de verdad), `checkin_answers`/`form_submissions`, `body_metrics`/`usergraph` (peso, medidas), `posts`/`comments`/`posting_reports` propios, `chat_messages`, `notifications`, `device_tokens`, `personal_access_tokens`.
- **Compartido con el coach (el negocio del coach depende de esto) — anonimizar el vínculo a persona, pero considerar conservar el dato agregado:** `program_day_assignments`/historial de series completadas (`workout logs`) — el coach puede necesitar este histórico por motivos de facturación/seguimiento con su propio cliente fuera de la app; evaluar si conservarlo con el `user_id` sustituido por un id anónimo en vez de borrarlo del todo.
- **Relación coach↔cliente:** liberar `coach_id`/`is_personal_client` — si el usuario borrado es cliente de un coach, ese coach debe dejar de verlo en su lista de clientes activos.
- **Roles/permisos:** `model_has_roles`, `admin_login_history`/`admin_login_devices` si aplica.

## 4. Caso especial: cuentas de coach

Este endpoint es para que un **cliente** borre su propia cuenta desde la app. Si el usuario autenticado es un coach con clientes asignados (`is_personal_client` inverso, o el rol admin/coach), **no debería poder auto-borrarse por esta vía** — borrar un coach implicaría decidir qué pasa con todos sus clientes activos, un caso mucho más delicado que no está cubierto por este flujo. Sugerencia: el endpoint devuelve un error explícito (`403`, mensaje "Contacta con soporte para dar de baja una cuenta de entrenador") si `user.user_type` es coach/admin, y esa gestión se hace a mano desde el admin panel.

## 5. Notificación / confirmación

No es obligatorio para Apple/Google, pero es buena práctica: enviar un email de confirmación ("Tu cuenta en BeFit ha sido eliminada") al email original (antes de anonimizarlo) cuando se procesa la baja.

## 6. Lo que el cliente (esta app) ya no necesita tocar

Una vez este endpoint exista con la respuesta `{ message }`, el flujo del cliente ya está completo — no hace falta ningún cambio en `pages/migrated/edit_profile_screen.tsx` ni en `api/auth.ts`. Si el contrato de respuesta cambia (por ejemplo, si se decide que la baja necesita confirmación por email antes de completarse, en vez de ser inmediata), avisar para adaptar el mensaje que ve el usuario tras pulsar "Eliminar definitivamente" — hoy el cliente asume que un 200 significa "ya está borrada".
