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

## 2. Qué hacer con los datos — ya decidido por la política de privacidad publicada

**Actualización 2026-08-28: esto ya NO es una decisión abierta.** El texto real de la política de privacidad (`docs/PRIVACY_POLICY_ES.md`, la misma que se publica en `bestronger.es/privacy-policy`) ya compromete explícitamente, por escrito y de cara al usuario:

> "Al confirmar la eliminación, tu cuenta y tus datos personales (incluidos los del cuestionario de salud y los sincronizados desde Apple Health/Health Connect) se borran de forma definitiva, salvo la información que estemos obligados a conservar por ley durante el plazo legal correspondiente (por ejemplo, facturas por obligaciones fiscales)."

Esto fija dos cosas que la implementación tiene que respetar tal cual:

1. **Nada de "periodo de gracia" ofrecido al usuario ni a soporte.** No cabe una versión de la antigua "Opción B" de este documento que ofreciera recuperar una cuenta borrada por error — la política promete borrado definitivo al confirmar, no "recuperable durante 30 días si escribes a soporte". Si soporte quiere ese margen, tiene que ser un detalle interno invisible (ver punto 3), nunca algo que se le diga al usuario.
2. **Lo único que sobrevive es lo exigido por ley** (ejemplo textual de la propia política: facturas por obligaciones fiscales) — y en este proyecto esas facturas ni siquiera viven aquí: el checkout/pago es 100% externo en `bestronger.es` (Stripe/PayPal, ver `docs/PENDIENTE_BACKEND_ADMIN.md`), así que lo que este backend conserva por obligación legal debería ser mínimo o inexistente. Todo lo demás — cuestionario de salud, HRV/sueño de Health, entrenamientos, chat, posts — se borra de verdad.

### Implementación recomendada

1. Al recibir la petición: revocar todos los `personal_access_tokens` del usuario (cierra sesión en todos los dispositivos al instante) y devolver éxito al cliente — desde el punto de vista del usuario, ya está hecho.
2. **En el mismo request o en un job que corra en segundos/minutos (no días):** borrar de verdad las filas de las tablas de la sección 3, o anonimizar irreversiblemente lo que por eficiencia se prefiera anonimizar en vez de borrar en cascada (ej. filas que el coach necesita conservar por integridad referencial de su propio histórico — anonimizar el `user_id` a un id sin PII, no dejar rastro identificable).
3. Un margen técnico interno de horas (no días, y nunca ofrecido como "recuperable") antes de la purga física de storage/backups es aceptable por motivos puramente operativos (ej. que un job nocturno de borrado de ficheros no compita con el tráfico en horario punta) — pero no debe ser una feature de recuperación de cara al usuario ni a soporte, porque contradice directamente lo ya publicado.
4. Sacar al usuario de la lista de clientes activos del coach de inmediato.

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
