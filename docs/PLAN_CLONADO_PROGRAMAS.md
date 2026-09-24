# Plan de migración: clonado real de programas por cliente

**Fecha de la auditoría base: 2026-09-17.** Este documento nace del item `0f` de `docs/ROADMAP.md`. Decisión tomada por el usuario: **Opción 1 — clonar de verdad** el programa al asignarlo a un cliente, en vez de extender `ClientExerciseOverride` a nivel estructural (opción 2, descartada). Este plan existe porque clonar es la opción de mayor riesgo de las dos: toca esquema de BD, 5 puntos de entrada de asignación en el backend, y varios flujos en dos frontends sin ningún test automatizado. El objetivo de este documento es secuenciar el trabajo para que cada fase sea reversible y verificable antes de pasar a la siguiente.

No confundir con el item `0f` en sí (que queda resuelto cuando este plan se ejecute completo) — este documento es el "cómo", el roadmap es el "qué".

---

## 0. Estado de ejecución (actualizado 2026-09-17)

**Fases 0-6 y 8 implementadas, probadas y en `Bckbs`/`bstronger-admin` rama `claude/program-modifications-per-client-ovc0k3`. Fase 7 (cutover en producción) NO ejecutada — requiere decisión humana y acceso al VPS, ver más abajo.**

| Fase | Estado | Commit(s) en `Bckbs` |
| --- | --- | --- |
| 0 — Tests de caracterización + entorno sqlite | ✅ Hecho | `bf9411e` |
| 1 — Migraciones aditivas (`source_*_id`/`is_client_copy`) | ✅ Hecho | `113431c` |
| 2 — `ProgramCloningService`/`ProgramAssignmentService` tras feature flag `PROGRAM_CLONING_ENABLED` (default `false`) | ✅ Hecho | `96a8f53` |
| 3 — Fix `SessionProgressionRuleEngine` (Riesgo A) | ✅ Hecho | `507b785` |
| 4 — Test de aislamiento real entre clientes | ✅ Hecho (cubierto dentro del commit de Fase 2, `96a8f53`) | — |
| 5 — Excluir copias de cliente de listados de biblioteca | ✅ Hecho | `9ec785b` |
| 6 — Comando `programs:backfill-clones` (dry-run/`--apply`) | ✅ Hecho, **nunca ejecutado contra datos reales** | `37afbbd` |
| 7 — Cutover en producción | ❌ Pendiente — requiere acceso al VPS y decisión humana, ver checklist abajo | — |
| 8 — Frontend (`bstronger-admin`): deduplicar asignación + aviso de plantilla compartida | ✅ Hecho | `accca33` |
| 9 — "Sincronizar cambios de plantilla" (mejora opcional) | Fuera de alcance, no iniciado | — |

**Validación**: `php artisan test` en verde — 81 passed (302 assertions), los 13 fallos restantes son scaffolding de Laravel Breeze pre-existente y no relacionado (`UserFactory` inexistente en este backend de API), confirmados como pre-existentes antes de tocar nada de este plan.

**Comportamiento en producción hoy: SIN CAMBIOS.** Todo lo anterior vive detrás de `PROGRAM_CLONING_ENABLED` (config `services.program_cloning.enabled`, default `false`) — con el flag desactivado (como está hoy en el `.env` de producción, que no se ha tocado), cada método de los 5 puntos de entrada de asignación se comporta exactamente igual que antes de este plan. El bug reportado por el usuario **sigue existiendo en producción** hasta que se ejecute la Fase 7.

### Checklist para ejecutar la Fase 7 (requiere al humano operando el VPS/GitHub)

1. Revisar el diff completo de la rama `claude/program-modifications-per-client-ovc0k3` en los 3 repos (o abrir PRs si se prefiere ese flujo de revisión) y mergear a las ramas por defecto.
2. Desplegar `Bckbs` a staging (o directamente a producción si no hay staging separado) con `PROGRAM_CLONING_ENABLED` **todavía en `false`** — el deploy en sí no debe cambiar nada observable.
3. Ejecutar `php artisan programs:backfill-clones` (dry-run, sin `--apply`) contra la base de datos real para ver el reporte de cuántas asignaciones existentes se convertirían en clones.
4. Revisar ese reporte con el usuario antes de continuar.
5. Ejecutar `php artisan programs:backfill-clones --apply` contra la base de datos real (recomendado: backup previo, aunque el comando no toca la plantilla de biblioteca original, solo crea filas nuevas y reapunta `program_client_assignments.training_program_id`).
6. Verificar manualmente unos cuantos casos (checklist §5 de este documento).
7. Activar `PROGRAM_CLONING_ENABLED=true` en el `.env` de producción y reiniciar el backend (`php artisan config:clear` si hay cache de config).
8. Confirmar con el checklist de QA manual (§5) usando clientes reales o de prueba.
9. Marcar el item `0f` de `docs/ROADMAP.md` como `✅ RESUELTO`.

---

## 1. Diagnóstico (resumen de la auditoría completa)

### 1.1 Esquema actual y por qué existe el bug

- `training_programs` es la plantilla reutilizable (desde la migración `2026_07_16_120001`, que hizo `client_id` nullable **a propósito** para que un programa se pudiera compartir).
- `program_client_assignments` es solo un pivote cliente↔`training_program_id` — **no clona nada**, por diseño explícito (comentario literal en su migración: *"sin duplicar la plantilla"*).
- `program_day_assignments` (los días del calendario) cuelga de `training_program_id`, no de la asignación por cliente, y apunta a un `workout_template_id` también compartido.
- `ClientExerciseOverride` ya resuelve la personalización de **valores** (peso/reps/notas) por cliente sin tocar la plantilla — es el único mecanismo de aislamiento que existe hoy, y solo cubre eso.
- `ProgramCalendarGeneratorService` (el servicio que generó el diseño V2 actual) documenta en su propio docblock que **reemplazó a propósito** a un generador anterior que sí clonaba (`TrainingProgramGeneratorService`, sistema V1 legacy). Es decir: el proyecto clonaba antes, y decidió dejar de hacerlo al construir V2. Este plan revierte esa decisión de forma controlada.

### 1.2 Los 5 puntos de entrada que asignan sin clonar

Todos comparten el mismo sub-patrón (`existing = ProgramClientAssignment::where(...)->first(); update() : create()`), lo cual es una ventaja: un único servicio nuevo los reemplaza a los 5, no hay que reimplementar la lógica cinco veces.

| # | Sitio | Cuándo se dispara |
|---|---|---|
| 1 | `TrainingProgramController::assignClient()` | Coach asigna manualmente desde el panel |
| 2 | `ClientProfileCalendarController::importProgram()` | "Importar programa completo" al calendario combinado del cliente (2 UIs distintas del admin llaman aquí: `ClientCalendarView.tsx` y `UserDetailView.tsx`) |
| 3 | `PackageFulfillmentService::assignTrainingProgram()` | Automático al fulfillar una `Subscription` (Package legacy) |
| 4 | `PlanFulfillmentService::assignTrainingProgram()` | Automático al fulfillar un `PlanSubscription` (sistema nuevo, el que tiene caller real hoy) |
| 5 | `AssignProgramClientCommand` (`programs:assign-client`) | Comando SSH manual, documentado como "misma lógica que el panel" |

### 1.3 Ya existe base de clonado reutilizable

`SectionTemplate::cloneInto(WorkoutTemplate, order)` (`app/Models/SectionTemplate.php:30-49`) ya clona un bloque completo + sus ejercicios (no un enlace vivo, copia real de `prescribed`/`enabled_metrics`). Usado hoy por `WorkoutTemplateController::importSection()`. **Es la pieza que se extiende**, no hay que empezar de cero: falta solo un nivel arriba (clonar `WorkoutTemplate` entero) y encadenarlo con `TrainingProgram` + `ProgramDayAssignment`.

### 1.4 Los dos riesgos críticos que el clonado por sí solo NO resuelve

**Riesgo A — `SessionProgressionRule.scope_type = programa_especifico` dejará de matchear, en silencio.**
El motor de Auto-Regulación de Carga permite vincular una regla de progresión a un `training_program_id` de biblioteca elegido por el coach. Su propio enum (`ScopeType.php`) documenta que esto **asume el bug actual como funcionalidad**: "aplica a cualquier cliente que esté corriendo ese programa concreto". Si clonamos sin más, cada cliente tendrá un `training_program_id` nuevo (el clon), distinto del que el coach eligió al crear la regla — `SessionProgressionRuleEngine::applicableRules()` dejará de encontrar coincidencias para siempre, sin error visible. Esto **debe resolverse como parte del mismo cambio**, no después: el clon necesita guardar de dónde viene (`source_training_program_id`) y el motor necesita resolver contra ese origen, no contra el id directo.

**Riesgo B — Ningún test cubre hoy que `addBlock`/`addExercise`/`removeExercise` queden aislados tras clonar.**
`SessionDetailController::addExercise()/addBlock()/removeExercise()` (líneas 532-613) son el foco exacto del bug reportado por el usuario: escriben directo sobre la plantilla resuelta desde `program_day_assignment_id`. El clonado los arregla automáticamente **si y solo si** cada `WorkoutTemplate` de cliente resultante es realmente exclusivo — pero como hoy no hay ningún test que lo verifique, hace falta escribir uno como parte de la propia migración, no confiar en que "clonar ya lo arregla".

### 1.5 Otros hallazgos relevantes (no bloqueantes, pero a tener en cuenta)

- `RealCalendarController`/`ProgramCalendarController` (todas sus mutaciones: `moveAssignment`, `duplicateWeek`, `swapWeeks`, `assignWeekDay`, etc.) operan siempre por `training_program_id` puro — correcto mientras se use para editar la plantilla de biblioteca (antes de asignar), pero hay que documentar explícitamente que **nunca** deben recibir el `training_program_id` de un clon de cliente.
- `Plan.training_program_id` / `Package.training_program_id` (paywall/entitlements, `PackageAccessService`) referencian siempre la plantilla de **biblioteca** — el gating de acceso no debe tocarse, debe seguir comparando contra IDs de biblioteca, nunca contra clones.
- `WorkoutTemplateController::getList()` ya filtra `whereDoesntHave('programDayAssignments')` para no mezclar plantillas sueltas con instancias de import — hay que asegurarse de que las copias de cliente (que sí tendrán `programDayAssignments()`) no se cuelen como "plantillas sueltas reutilizables" en la biblioteca del coach.
- `UserController::assignDemoWorkoutIfNeeded()` auto-asigna un `WorkoutTemplate is_demo=true` compartido a todo cliente nuevo — decisión explícita a tomar: ¿se clona también el demo, o se deja compartido a propósito por ser de bajo riesgo de edición? (recomendación: dejarlo fuera del alcance inicial, ver §4).
- **Frontend — 3 puntos de entrada de asignación, no 2**: además de (1) y (2) de la tabla anterior, `UserDetailView.tsx` tiene su propia copia de `handleImportProgram` (llama al mismo endpoint que `ClientCalendarView.tsx`, pero es código duplicado) — limpiar esa duplicación de paso.
- **`WorkoutPreviewModal.tsx`** es el componente de mayor riesgo/mayor beneficio en el admin: cuando se abre con `clientId` (desde `UserDetailView`), sus mutaciones de estructura no llevan `client_id` — dependen 100% de que el backend le entregue ya el `workout_template_id` correcto (el clon). Es el componente a verificar manualmente con más cuidado tras el cutover.
- **Cero tests automatizados** en los tres repos para este dominio (confirmado por grep exhaustivo). Cualquier fase que toque código de asignación/calendario se hace hoy sin red de seguridad — ver §3.0.

---

## 2. Diseño objetivo del esquema

Cambios aditivos (no rompen nada existente al añadirse):

```
training_programs
  + source_training_program_id  BIGINT NULLABLE, FK → training_programs.id
  + is_client_copy              BOOLEAN DEFAULT false

workout_templates
  + source_workout_template_id  BIGINT NULLABLE, FK → workout_templates.id
  + is_client_copy              BOOLEAN DEFAULT false
```

- `is_client_copy = true` ⟺ esta fila es la copia exclusiva de una asignación concreta (nunca aparece en biblioteca/listados de reutilización).
- `source_*_id` guarda el linaje: de qué plantilla de biblioteca viene el clon. Se usa para (a) el motor de progresión (Riesgo A), (b) mostrar "basado en: X" en el frontend si se quiere, (c) una futura función de "aplicar cambios de la plantilla a este cliente" (mitiga el contra de perder la propagación automática, ver §4).
- `program_client_assignments.training_program_id` pasa a apuntar **siempre** a la copia clonada del cliente, nunca a la plantilla de biblioteca.
- `program_day_assignments` no necesita columna nueva: al colgar de `training_program_id`, y ese id ser ya exclusivo del cliente tras clonar, queda aislado automáticamente.
- `workout_template_blocks.source_section_template_id` ya existe con este mismo patrón (referencia informativa, no funcional) — se reutiliza el mismo estilo para los campos nuevos.

---

## 3. Plan de migración por fases

Cada fase es individualmente reversible y no depende de que la siguiente se ejecute inmediatamente después.

### Fase 0 — Tests de caracterización (antes de tocar nada)

Dado que hay cero cobertura, escribir tests de **comportamiento actual** (no del comportamiento deseado) para las 4 zonas de mayor riesgo, en este orden:

1. `SessionDetailController::addExercise/addBlock/removeExercise` — hoy: confirmar (documentar con un test) que SÍ mutan la plantilla compartida cuando dos `ProgramClientAssignment` distintos apuntan al mismo `training_program_id`. Este test **debe fallar tras la migración** (es la prueba de que el bug se corrigió) — se reescribe en la Fase 4, no se descarta.
2. `TrainingProgramController::assignClient` + `ClientProfileCalendarController::importProgram` — snapshot del comportamiento actual (no clona, comparte fila).
3. `SessionProgressionRuleEngine::applicableRules` con `scope_type=programa_especifico` — test que confirma que hoy matchea cualquier cliente del programa.
4. `MesocycleClosureService::closeEligibleAssignments` — snapshot de comportamiento actual (ya está bien diseñado, pero sirve de red de seguridad ante refactors accidentales).

Sin esta fase, no hay forma de verificar objetivamente que las fases siguientes no rompieron nada.

### Fase 1 — Migraciones aditivas (sin cambio de comportamiento)

Añadir las columnas de §2 (nullable, default false). Desplegable en producción sin ningún cambio funcional — cero riesgo, sirve para probar el pipeline de despliegue antes de tocar lógica.

### Fase 2 — Servicio de clonado centralizado

Nuevo `ProgramCloningService` (o extender `SectionTemplate::cloneInto` un nivel arriba):

```
clone(TrainingProgram $library, Client $client): TrainingProgram
  → clona TrainingProgram (source_training_program_id = library.id, is_client_copy = true)
  → por cada WorkoutTemplate único referenciado en los ProgramDayAssignment de $library:
      clona WorkoutTemplate (source_workout_template_id, is_client_copy = true)
      clona sus WorkoutTemplateBlock + WorkoutTemplateExercise (reutilizando el patrón de SectionTemplate::cloneInto)
  → clona ProgramDayAssignment apuntando a los WorkoutTemplate ya clonados
  → devuelve el TrainingProgram clon
```

Nuevo `ProgramAssignmentService::assignOrRenew(client, libraryProgram, ...)` que envuelve la lógica `existing ? update() : create()` de los 5 puntos de entrada, llamando a `ProgramCloningService::clone()` en el caso de creación. **Los 5 sitios de §1.2 pasan a llamar a este único servicio** — no se reimplementa 5 veces.

Detrás de un feature flag (config, no hardcodeado) para poder activarlo solo en staging primero.

### Fase 3 — Resolver el Riesgo A (motor de progresión)

Modificar `SessionProgressionRuleEngine::resolveTrainingProgramIdForSession()`/`applicableRules()` para que, al comparar contra `scope_id` de una regla `programa_especifico`, resuelva primero `source_training_program_id` del clon del cliente (si existe) y compare contra eso, no contra el id directo del clon. Test dedicado: crear una regla sobre el programa de biblioteca X, clonar X para 2 clientes, verificar que la regla aplica a ambos.

### Fase 4 — Verificar el Riesgo B (aislamiento real)

Test de regresión explícito: 2 `ProgramClientAssignment` con el mismo programa de biblioteca origen → cada uno con su copia clonada → `addExercise()` en la sesión del cliente A → assert de que el `WorkoutTemplate` del cliente B **no cambió** y que la plantilla de biblioteca tampoco. Este es el test que prueba que el bug reportado por el usuario está cerrado.

### Fase 5 — Excluir copias de biblioteca/listados

`WorkoutTemplateController::getList()` y `TrainingProgramController::getList()` (o su query base): añadir `where('is_client_copy', false)` (o equivalente) para que las copias de cliente nunca aparezcan como "plantilla suelta reutilizable" en el panel del coach.

### Fase 6 — Backfill de asignaciones ya existentes

Script idempotente (comando Artisan, dry-run por defecto):

1. Por cada `ProgramClientAssignment` activo hoy, si su `training_program_id` es compartido por ≥2 asignaciones (o simplemente por todas, para simplificar): clonar y re-apuntar esa asignación al clon nuevo, dejando `source_training_program_id` = id original.
2. **Modo dry-run primero**: solo reporta cuántas asignaciones/plantillas se verían afectadas, sin escribir nada.
3. Ejecutar contra una copia de la BD de producción antes de tocar producción real.
4. Verificación antes/después: conteo de `program_day_assignments` y `workout_template_exercises` por cliente debe ser idéntico antes y después del backfill (mismo contenido, distinta fila).
5. Ejecutar en producción por lotes (transacción por asignación, no una transacción gigante) para no bloquear el sistema si el catálogo es grande.

### Fase 7 — Cutover

Activar el feature flag de la Fase 2 en producción para asignaciones **nuevas**. Mantener monitorización (logs de `ProgramCloningService`, conteo de filas creadas) unos días antes de dar por cerrado el punto 1.2 de la lista original de 5 sitios.

### Fase 8 — Frontend

- Bloquear (o avisar explícitamente) la edición del "calendario del programa" (`TrainingProgramsView.tsx`, rutas `real-calendar-*`) cuando ese programa ya tenga asignaciones activas — hoy esa vista asume que siempre edita la plantilla maestra; tras el backfill esto sigue siendo cierto por diseño (la plantilla de biblioteca nunca se vuelve `is_client_copy`), pero conviene un aviso/guard explícito para que un futuro cambio no lo rompa por accidente.
- Deduplicar `handleImportProgram`/`handleAssignDirect` entre `ClientCalendarView.tsx` y `UserDetailView.tsx` (mismo endpoint, código repetido).
- Verificar manualmente `WorkoutPreviewModal.tsx` con `clientId` tras el cutover (ver checklist §5) — es el componente de mayor riesgo de UI.
- Opcional: exponer `source_training_program_id`/`source_workout_template_id` en los payloads de detalle para que el frontend pueda mostrar "basado en: <título de la plantilla>" (útil para soporte/depuración, no imprescindible para el fix).

### Fase 9 (opcional, mejora futura — no bloqueante para cerrar el bug)

Función "aplicar cambios de la plantilla a clientes no personalizados": usando `source_training_program_id`/`source_workout_template_id`, ofrecer al coach un botón "actualizar a la versión de biblioteca" por cliente, para recuperar de forma **explícita y opt-in** el beneficio de propagación que se pierde al clonar (antes era automático e implícito — y ahí estaba el bug). Fuera del alcance de este plan salvo que el usuario lo pida después.

---

## 4. Mejoras necesarias adicionales (deuda técnica destapada por la auditoría, no directamente el bug)

- **Unificar los 5 puntos de entrada de asignación** en `ProgramAssignmentService` (ya cubierto en Fase 2, pero es una mejora en sí misma incluso al margen del clonado — hoy están duplicados y pueden desincronizarse).
- **Escribir tests de caracterización antes de cualquier refactor futuro** en este dominio (Fase 0 dejará una base; ampliarla con el tiempo, ya que hoy la cobertura es cero en los tres repos).
- **Nombrar explícitamente en el código/documentación** qué controladores operan sobre "ID de biblioteca" vs "ID de instancia de cliente" (`RealCalendarController`/`ProgramCalendarController` = biblioteca; `SessionDetailController`/`ClientCalendarController` = instancia de cliente) — hoy solo se distingue por convención tácita, no por tipo ni nombre de parámetro.
- **Decidir explícitamente el caso del demo template** (`UserController::assignDemoWorkoutIfNeeded`) — dejar fuera del clonado inicial es razonable (bajo riesgo, se edita poco), pero debe ser una decisión consciente, no un olvido.
- **Añadir tests frontend mínimos** (Vitest/RTL en `bstronger-admin`) para `WorkoutPreviewModal` y `SessionDetailView` antes de tocarlos — hoy cero cobertura ahí también.
- **Confirmar qué rutas llevan montado `CheckSubscriptionAccess`** (no se encontró con grep directo en `routes/api.php` — revisar el alias en `bootstrap/app.php`/`Kernel.php`) para asegurar que el gating de suscripción nunca reciba un ID de copia de cliente.

---

## 5. Checklist de QA manual (frontend sin tests automatizados)

Verificar a mano tras el cutover (Fase 7), con al menos 2 clientes distintos con el mismo programa de biblioteca asignado:

- [ ] Asignar el mismo programa a 2 clientes (los 3 flujos: `TrainingProgramsView` → "Asignar clientes", `ClientCalendarView` → "Importar programa", `UserDetailView` → "Importar programa").
- [ ] Añadir un ejercicio a una sesión del cliente A (`SessionDetailView`) → confirmar que el cliente B no lo ve, y que la plantilla en `WorkoutTemplatesView`/biblioteca tampoco cambió.
- [ ] Quitar un ejercicio de una sesión del cliente A → mismo check.
- [ ] Añadir un bloque nuevo a una sesión del cliente A → mismo check.
- [ ] Abrir `WorkoutPreviewModal` con `clientId` desde `UserDetailView` para el cliente A, editar estructura → confirmar aislamiento respecto a B y a biblioteca.
- [ ] Confirmar que ninguna copia de cliente aparece en `WorkoutTemplatesView` (biblioteca de plantillas sueltas) ni en el selector de `TrainingProgramsView`.
- [ ] Confirmar que una regla de progresión con scope "programa específico" sobre la plantilla de biblioteca sigue aplicando a ambos clientes A y B.
- [ ] Confirmar que el gating de acceso (Plan/Package con `training_program_id`) sigue funcionando para el catálogo — no debe verse afectado, pero es el tipo de regresión silenciosa que solo aparece en producción real.
- [ ] Confirmar en la app cliente (`bsa`) que el calendario, sesión activa e historial de completados de ambos clientes se ven correctamente tras el backfill (riesgo bajo según la auditoría, pero es la superficie que ve el usuario final).

---

## 6. Fuera de alcance de este plan

- Función de "sincronizar cambios de plantilla a clientes" (Fase 9) — mejora futura opcional, no bloqueante.
- Clonado del workout demo auto-asignado (`is_demo`) — decisión pendiente, bajo riesgo, se documenta pero no se resuelve aquí.
- Migrar el sistema V1 legacy (`workouts`/`workout_days`, `TrainingProgramGeneratorService`) — dominio distinto, no mezclar con este esfuerzo.
