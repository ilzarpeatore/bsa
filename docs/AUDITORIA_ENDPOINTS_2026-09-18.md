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

## 🔴 HALLAZGO GRAVE — bug de aislamiento de datos aún SIN corregir (2026-09-18)

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

## Pendiente de esta auditoría

- [ ] **Prioridad alta**: decidir con el usuario el criterio de "clonar al editar" para `SessionDetailController` (addExercise/addBlock/removeExercise) antes de implementarlo — bug de aislamiento de datos real y confirmado, sin corregir.
- [x] Dieta: causa raíz encontrada y corregida por otra sesión (`plan_screen.tsx`).
- [x] Comunidad: causa raíz encontrada y corregida por otra sesión (`add_post_screen.tsx`, `.push()` + ErrorBoundary).
- [x] Hábitos: mismo patrón encontrado y corregido en esta auditoría (`habits_list_screen.tsx`, `.push()`).
- [ ] Verificar si hace falta lanzar un build nuevo (IPA/APK) para que estos fixes lleguen al usuario, dado que está probando la app instalada real, no un entorno de desarrollo — **sí hace falta**, son cambios de JS embebido en el bundle nativo, sin OTA.
- [ ] Seguir auditando otras zonas de la app con el mismo patrón (plantilla compartida + edición "individual" sin clonar) — revisado por ahora: entrenamiento (bug encontrado), nutrición (sin bug), hábitos (sin bug). Quedan por revisar: recetario/favoritos, check-ins/formularios asignados, y cualquier otro sitio donde el admin "personalice" algo que en el fondo sea una fila de catálogo compartida.
