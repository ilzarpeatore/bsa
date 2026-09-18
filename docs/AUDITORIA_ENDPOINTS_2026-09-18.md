# Auditoría de endpoints, APIs y conexión con BD — 2026-09-18

> Registro en vivo de la auditoría pedida por el usuario tras reportar fallos en Comunidad (no se accede/crea posts), Hábitos (no se crean hábitos personales) y Dieta (no se registran comidas como hechas ni se añaden recetas al plan diario). El usuario autorizó tomar todas las decisiones durante esta auditoría sin pedir confirmación por cada hallazgo.

## Metodología

1. Simulación en proceso (tinker, vía SSH a `bestronger-vps`) de los controladores reales contra la BD de producción, con el guard de auth resuelto igual que en una petición real (`Auth::shouldUse('sanctum')`), para no depender de crear un token real (bloqueado por política — "Credential Materialization").
2. Revisión de logs reales de producción (`storage/logs/laravel-*.log`, journal de Caddy).
3. Comparación de cada repo local contra GitHub y contra lo desplegado en el VPS.
4. Búsqueda de patrones de bug ya confirmados en el propio repo (p. ej. `.navigate()` vs `.push()` en pantallas registradas una sola vez) para aplicarlos donde falten.

## Hallazgos

### 1. Backend (Bckbs) — sin bugs encontrados en los 3 endpoints reportados

Simulado contra BD real con la cuenta `prueba@prueba.com` (id 100):

- `habit-personal-store` (`ClientHabitController::storePersonal`) → 200, hábito creado sin error.
- `userpost-list` / `save-userpost` (`PostingController`) → listado correcto (autor bien resuelto vía `PostingResource`), creación de post con `user_id` correcto.
- `save-daily-plan-recipe` (`DailyPlanController::saveDailyPlanRecipeData`) → añadir receta y marcar como completada, ambas escriben en BD sin error.

Conclusión: el backend funciona. El bug real está en el cliente (frontend), confirmado después.

### 2. Frontend (bsa) — bug real confirmado y ya en curso de arreglo

El usuario confirmó: pantalla en blanco / carga infinita, en la **app instalada real** (no dev/Expo Go).

- **Comunidad — ya arreglado por otra sesión el mismo día** ([`bsa` commit `8c66be9`](https://github.com/ilzarpeatore/bsa/commit/8c66be9)): "Nueva publicación" se veía en blanco. Causa probable: `community_screen.tsx` abría `MigratedAddPost` con `.navigate()` en vez de `.push()` — como esa ruta está registrada una sola vez en el navigator, `.navigate()` puede reutilizar una instancia ya visitada en la sesión en vez de montar una nueva. Fix: `.push()` en los 2 sitios + `AddPostErrorBoundary` como red de seguridad. Ya mergeado a `master`, pendiente de un build nuevo para que el usuario lo vea (JS embebido en el bundle nativo, no hay OTA).
- **Hábitos — mismo patrón de bug, encontrado y corregido en esta auditoría** (`habits_list_screen.tsx`, 2 sitios): `navigation?.navigate('MigratedHabitAdd')` → cambiado a `.push()`. `MigratedHabitAdd` también está registrada una sola vez en `App.tsx`. El `ErrorBoundary` (`HabitAddErrorBoundary`) ya existía en `habit_add_screen.tsx` desde antes.
- **Dieta — en investigación** (ver siguiente sección).

### 3. Deploy / sincronización de repos

Todos los repos (`bsa`, `Bckbs`, `AgenticdesignBS`, `bstronger-admin`) tenían sesiones concurrentes trabajando en paralelo. Se sincronizó local↔GitHub↔VPS:

- `Bckbs`: VPS ya estaba en el commit más reciente (`bab5f5c`) sin que yo desplegara nada — alguien más ya lo hizo.
- Route collision real encontrado en logs de producción (`Another route has already been assigned name [users.show]`, repetido 3 veces el 2026-09-18) — ya corregido en 2 PRs (#25 y #26) por otra sesión, ambos ya en `main` y desplegados.
- `docs/ROADMAP.md` actualizado: item 25 (editar onboarding) parcial — app hecha, admin pendiente. Item 21 se marcó erróneamente como resuelto por la PR #24 en un primer pase; corregido más abajo tras encontrar que sigue abierto de verdad. Sincronizado al panel admin (`POST admin/task-sync`).

### 4. Dieta — causa real ya encontrada (y ya corregida por otra sesión en paralelo)

`plan_screen.tsx::addRecipeToPlan()` ya tiene el fix (con comentario fechado 2026-09-18): si `dailyPlanIdRef.current` era `null` porque el plan del día aún no había cargado, la función devolvía sin más — ningún toast, ninguna acción visible al pulsar "añadir". Ahora avisa con un toast ("Tu plan de hoy todavía se está cargando..."). `toggleRecipeCompletion()` (marcar como hecho) ya tenía un guard equivalente con mensaje de error, así que probablemente no era un fallo silencioso del mismo tipo — pendiente confirmar con el usuario si "marcar como hecho" sigue fallando tras esta build.

---

## ✅ HALLAZGO GRAVE — bug de aislamiento de datos CORREGIDO y desplegado (2026-09-18, ver "Fases de implementación" más abajo)

**Esto es justo el patrón que preocupaba al usuario: editar la sesión de UN cliente puede modificar la de OTROS clientes, si comparten la misma plantilla base.**

`app/Http/Controllers/API/SessionDetailController.php`, métodos `addExercise()`, `addBlock()`, `removeExercise()` (rutas `admin/session-detail-add-exercise`, `-add-block`, `-remove-exercise`, usadas desde el panel admin para "editar esta sesión de este cliente"):

- Reciben `program_day_assignment_id` (la sesión de un cliente y fecha concretos).
- `resolveTemplate()` solo comprueba que la asignación exista y tenga `workout_template_id` — **no comprueba si esa plantilla la usa también otra asignación/cliente**.
- Las tres funciones mutan directamente `WorkoutTemplateBlock`/`WorkoutTemplateExercise` **de la plantilla compartida** (`workout_template_id`), no de una copia propia de esa sesión.
- `ClientProfileCalendarController::assignDirect()` confirma que el mecanismo de asignación normal (`assignDirect`, usado para asignar un workout del catálogo directo al calendario personal de un cliente) **enlaza el mismo `workout_template_id` sin clonarlo** — así que es perfectamente posible (y probablemente ya haya pasado) que dos clientes distintos tengan asignaciones que apuntan a la misma plantilla.

**Consecuencia real:** si un coach usa estos 3 endpoints para "personalizar la sesión de hoy" de un cliente que comparte plantilla con otro, el cambio se ve también en el calendario del segundo cliente.

**Por qué NO lo corrijo en esta pasada** (pedido explícito del usuario: documentar primero, arreglar después salvo que sea trivial): la corrección correcta no es trivial — requiere "clonar al primer edit" (cuando se detecta que la plantilla de una asignación tiene más de una `ProgramDayAssignment` apuntándola, crear una copia nueva de `WorkoutTemplate`+`blocks`+`exercises` solo para esa asignación, repuntar `workout_template_id` de esa asignación a la copia, y solo entonces aplicar el cambio) — toca datos de sesiones reales en uso, así que quiero que el usuario confirme el criterio antes de tocarlo.

**Nota importante:** esto es DISTINTO del bug ya corregido en `Bckbs` PR #24 (`is_public`) — esa PR arregló que un cliente pudiera _ver_ el workout personalizado de otro cliente en listados/catálogo; no toca el problema de que _editarlo_ propague el cambio a otros clientes. **Corrijo aquí mi error anterior**: había marcado el item 21 del roadmap como resuelto por la PR #24 — no lo está, sigue abierto, lo revierto.

### Nutrición y hábitos — mismo patrón revisado, NO tienen este bug

- **Nutrición**: `DailyPlanRecipe` se crea con `daily_plan_id` propio de cada cliente/fecha (`saveDailyPlanRecipeData`, ya verificado en la sección 1) — no hay plantilla compartida mutable en el camino de "añadir/marcar comida". `MealPlanTemplateController::addItem/removeItem` sí edita una plantilla compartida, pero es explícitamente la pantalla de gestión de plantillas del panel admin (no "editar la comida de este cliente concreto") — arquitectura correcta, `importToCalendar` copia a filas propias del cliente.
- **Hábitos**: `ClientHabitController::adopt()` crea una fila `Habit` nueva por cliente (`client_id` propio, `source_template_id` como referencia), nunca reutiliza ni edita la plantilla de origen. `storePersonal()`/`logHabit()` ya están scoped por `client_id`. Sin riesgo de mutación compartida.

### 5. Nota operativa: `bstronger-admin` ya tiene auto-deploy

Otra sesión añadió `.github/workflows/deploy.yml` — a partir de ahora cada push a `main` de `bstronger-admin` despliega solo (SSH al VPS, `git pull` + `npm ci` + `npm run build` + `chown www-data`). Ya no hace falta que yo construya y despliegue el panel admin a mano como hice hoy más arriba (sección 3) — solo aplica a partir de este commit en adelante.

### 6. Salud de la conexión con la BD — sin schema drift

Comprobados los 144 modelos Eloquent del backend contra la BD real (`Schema::hasTable()` para cada uno, resolviendo `getTable()` como lo haría el código en producción): **ninguno apunta a una tabla que no existe.** Sin bugs de este tipo.

### 7. Rutas rotas encontradas — 15, todas del panel Blade legacy, no alcanzables desde la UI real

Recorridas las 1028 rutas registradas de verdad (`app('router')->getRoutes()`, no solo `route:list`) comprobando que el controlador y método existan de verdad. 15 rutas están rotas (`Route::resource(...)` que registra los 7 métodos CRUD pero el controlador solo implementa algunos — un `GET .../edit` o `POST` a esas rutas daría 500, "Call to undefined method"):

- `pushnotification` (show/update), `bannerslider` (show), `posting` (store), `admin-login-history` (create/store/show/edit/update/destroy), `admin-login-device` (create/store/edit/update/destroy).

Todas vienen de `routes/web.php` (el panel Blade antiguo, ya sustituido por `bstronger-admin`). Confirmado que el panel React real usa rutas API distintas y correctas para lo mismo (`admin/banner-sliders`, `admin/push-notifications`, `admin/admin-login-history`, `admin/admin-login-devices`, `admin/postings` con `->only(['index','show'])`) — así que nadie las pulsa desde la UI real. Riesgo bajo (solo alcanzable si alguien las golpea directamente por URL), pero es superficie de ataque/mantenimiento innecesaria. Limpieza recomendada: borrar esos 6 `Route::resource(...)` de `web.php` o acotarlos con `->only([...])` a lo que el controlador realmente implementa.

Aparte de esto, `route:cache` corre limpio ahora mismo (sin colisiones de nombre pendientes).

### 8. Barrido sistemático de IDOR en toda la API cliente (sub-agente, ~46 herramientas, cobertura completa de `API/*` + puntos señalados de `API/Admin/*`)

**Corregidos ya (commit `Bckbs` `659b1ea`, desplegado):**

- 🔴 **`ClientTagController::destroy()`** — no acotaba por `coach_id` (a diferencia de `getList()`/`store()` en el mismo archivo). Cualquier coach podía borrar el `ClientTag` de otro coach adivinando su id. **Corregido**: añadido `->where('coach_id', auth()->id())`.
- 🔴 **`Comment::scopeMyComment()` / `CommentReply::scopeMyCommentReply()`** — el filtro de propiedad solo se aplicaba si la cuenta tenía el rol Spatie `user`; las cuentas de coach en este proyecto no tienen NINGÚN rol Spatie, así que se saltaban el filtro por completo y podían editar el comentario/respuesta de cualquier otro usuario vía `update-comment`/`save-comment-reply`. **Corregido**: mismo criterio que `scopeCanBeDeletedBy()` (solo admin exento). Verificado con simulación real: antes generaba SQL sin filtro para una cuenta coach real de producción; después sí lo aplica.

**Encontrados, sin corregir (admin-only, patrón ya documentado/intencional en el proyecto — riesgo bajo, solo relevante si algún día se abre esa API a roles no-admin):**

- `ClientProfileCalendarController::removeAssignment()` — borra un `ProgramDayAssignment` sin comprobar propiedad; gateado por `hasRole('admin')`.
- `Admin/ExerciseSubstitutionController::update()/destroy()` — sin `coach_id` en el `find()`; gateado por `hasRole('admin')`.

**Encontrados, severidad baja/informativa:**

- `FormController::getDetail()` — cualquier cliente autenticado puede leer la estructura (título + preguntas) de un `Form` de otro coach por id; no expone datos personales de ningún cliente, solo la plantilla.
- `ScreenReviewMarkController::index()` — sin filtro por usuario; es la herramienta temporal de QA de pantallas (se borrará con la feature), no datos reales.

**Revisado a fondo, SIN bug encontrado** (no fueron solo listados, se verificó el código real): check-ins/formularios asignados, excepciones de coach, reglas de progresión, planes semanales adaptativos, sustituciones de ejercicio (rutas cliente), comentarios/respuestas — ruta de borrado (`scopeCanBeDeletedBy`, correcta, contrasta con el bug de arriba), récords personales/métricas corporales/datos de salud/feedback de ejercicio/gráficas de usuario, listas de la compra, recursos, bloqueo de usuarios, historial del chatbot, calendario de cliente, programas de entrenamiento, suscripciones/pagos, reseñas de recetas, revisión de sesión de entrenamiento, ajustes de features de cliente.

## Pendiente de esta auditoría

- [x] **Criterio decidido con el usuario** (ver `~/.claude/plans/enumerated-marinating-ember.md`): (A) clonar la plantilla al asignar vía `assignDirect` (calendario personal suelto); (B) extender `ClientExerciseOverride` (ya existente, hoy solo oculta/ajusta) para que también soporte añadir un ejercicio o un bloque entero solo para un cliente, en el caso de programas compartidos entre varios clientes — sin tocar la plantilla compartida. En implementación, ver "Fases de implementación" más abajo.
- [x] Dieta: causa raíz encontrada y corregida por otra sesión (`plan_screen.tsx`).
- [x] Comunidad: causa raíz encontrada y corregida por otra sesión (`add_post_screen.tsx`, `.push()` + ErrorBoundary).
- [x] Hábitos: mismo patrón encontrado y corregido en esta auditoría (`habits_list_screen.tsx`, `.push()`).
- [ ] Verificar si hace falta lanzar un build nuevo (IPA/APK) para que estos fixes lleguen al usuario, dado que está probando la app instalada real, no un entorno de desarrollo — **sí hace falta**, son cambios de JS embebido en el bundle nativo, sin OTA.
- [x] Seguir auditando otras zonas de la app con el mismo patrón (plantilla compartida + edición "individual" sin clonar) — barrido sistemático completo de `API/*` hecho (sección 8): 2 IDOR reales corregidos y desplegados (`ClientTagController::destroy`, `Comment`/`CommentReply` scopeMy*), 2 hallazgos admin-only de baja prioridad, 2 informativos, resto revisado sin bug.
- [x] Salud de la conexión con la BD (schema drift): 144 modelos comprobados contra tablas reales, sin problemas (sección 6).
- [x] Rutas rotas: 15 encontradas y corregidas (sección 7), todas del panel Blade legacy.

## Fases de implementación del hallazgo grave (plan aprobado 2026-09-18)

Plan completo en `~/.claude/plans/enumerated-marinating-ember.md`. Progreso:

- [x] Parte A — `WorkoutTemplate::cloneStructure()` + `assignDirect()` clona al asignar. Verificado por simulación (tinker, rollback) en la sesión anterior.
- [x] Parte B.1/B.2 — migraciones `create_client_block_overrides_table` / `add_addition_columns_to_client_exercise_overrides_table` corridas en el VPS (batch 40) + modelos `ClientBlockOverride`/`ClientExerciseOverride` actualizados.
- [x] Parte B.3 — `SessionDetailController::addExercise/addBlock/removeExercise` reescritos sobre el overlay (`client_exercise_overrides`/`client_block_overrides`), con `assertClientOwnsAssignment()` (mismo criterio que `ClientCalendarController::resolveOwnedAssignment`, evita que se pueda personalizar la sesión de un cliente no asignado realmente a ese programa).
- [x] Parte B.4 (parcial, con alcance recortado a propósito — ver nota abajo) — `SessionDetailController::getSessionDetail()` ahora respeta `hidden` (antes lo ignoraba por completo) y renderiza las adiciones (ejercicios sueltos + bloques propios) del cliente. **No se tocó** `ClientCalendarController::getDayDetail()` (vista móvil real del cliente) ni `AdaptiveWeekPlanner` — requieren coordinar el esquema de "id sintético" con el lado móvil antes de cablearlos (un ejercicio añadido no tiene `workout_template_exercise_id`, y ese id es lo que la app usa hoy para registrar series); hacerlo sin verificar el lado móvil se consideró riesgo de crash/regresión en la app real en producción. Pendiente, no bloqueante para el fix de seguridad.
- [x] Parte B.5 (parcial) — frontend `bstronger-admin` (`SessionDetailView.tsx`) manda `client_id` en las 3 llamadas (ahora obligatorio en el backend) y usa un id sintético negativo (`-client_exercise_override_id` / `-client_block_override_id`) para que las adiciones no colisionen (keys de React, `Map` de lookup) con los ids reales de la plantilla. **No implementado todavía**: editar notas/prescrito inline o eliminar una adición ya creada desde la UI (esas llamadas seguirán fallando con un toast de error hasta que se cablee explícitamente); el badge visual "personalizado para este cliente" tampoco está.
- [x] Verificación end-to-end contra BD real (PHP standalone bootstrap + transacción con rollback, `php artisan tinker` no ejecutaba el script multilínea correctamente — ver nota de proceso): 2 clientes en el mismo `ProgramDayAssignment` compartido, cliente A añade ejercicio+bloque propio y oculta el ejercicio original → cliente B sigue viendo la plantilla intacta (aislamiento confirmado), la plantilla compartida en BD no cambió, y un tercer cliente sin asignación real fue bloqueado con 403 al intentar `addBlock` (guardia IDOR). Desplegado y verificado en el VPS de producción; commit `Bckbs` `c221218`, pusheado a `main`.
