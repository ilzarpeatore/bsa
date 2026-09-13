# Auditoría panel admin (bstronger-admin + Bckbs) — 2026-09-13

Seguimiento de la auditoría completa pedida por el usuario ("dejar el panel cien
por cien operativo") + segunda ronda de seguridad/patrones repetibles. Este
documento se actualiza cada vez que se completa una fase, para poder retomar el
trabajo si la sesión se corta (rate limit, etc.) sin perder el hilo.

**Repos afectados** (ninguno es este — se clonan en el scratchpad de la sesión y
se despliegan en la VPS `bestronger-vps` tras cada fix):

- Backend: `github.com/ilzarpeatore/Bckbs` → `/var/www/testapp` en la VPS
- Admin panel: `github.com/ilzarpeatore/bstronger-admin` → `/var/www/testapp/admin` en la VPS

**Flujo de trabajo por fase**: clonar/pull en scratchpad → editar → commit → push
→ `git pull` + cache-clear (Bckbs) / `npm run build` (bstronger-admin) en la VPS
→ verificar → marcar como hecho aquí.

## Estado global

- [x] **Fase 0 — Seguridad** (desplegada y verificada)
- [x] **Fase 1 — Bugs de datos que se autodestruyen** (desplegada)
- [x] **Fase 2 — Funcionalidad crítica rota o falsa** (desplegada)
- [ ] **Fase 3 — Backend ya listo, frontend sin conectar** (en curso, ver detalle)
- [ ] **Fase 4 — Mejoras sistémicas en CrudView.tsx**
- [ ] **Fase 5 — Confirmaciones y manejo de errores en vistas bespoke**
- [ ] **Fase 6 — Limpieza de menú**

---

## Fase 0 — Seguridad (Bckbs) — ✅ COMPLETADA Y DESPLEGADA

Commit `8c6f9fa` (Bckbs). Verificado con curl que `user-detail` y
`client/subscription` devuelven 401 sin token, y `form-feedback` devuelve 404.

- [x] `client/subscription` y `user-detail`: añadido `auth:sanctum`, ignorado
      `client_id`/`id` arbitrario del request (siempre `auth()->id()`)
- [x] `update-user-status`: ya no acepta `id` ajeno, solo opera sobre el propio usuario
- [x] `Comment::scopeMyComment`: ya no confía en `request('user_id')`
- [x] `CommentController::updateComment`: ya no hace `fill($request->all())` (mass assignment)
- [x] `CommentReplyController::saveCommentReply`: añadida comprobación de propiedad (`myCommentReply()`)
- [x] `form-feedback` (cliente, duplicado sin proteger): ruta eliminada

## Fase 1 — Bugs de datos que se autodestruyen — ✅ COMPLETADA Y DESPLEGADA

Commits `99988bb` (bstronger-admin).

- [x] `RecipeView.tsx`: `openEdit` ahora precarga categorías/etiquetas reales (antes `sync([])` las borraba)
- [x] `BannerSliderView.tsx`: `api.put+FormData` → `api.upload(...,'PUT')`
- [x] `ExerciseView.tsx`: mismo fix, rompía TODAS las ediciones de ejercicio

## Fase 2 — Funcionalidad crítica rota o falsa — ✅ COMPLETADA Y DESPLEGADA

Commits `e55b17d` (bstronger-admin) + `e52565b` (Bckbs).

- [x] `ReportController::coachingMetrics()`: quitado `rand(60,80)`, mínimo forzado de 3, coaches ficticios de fallback
- [x] `dashboardKpis()`: quitados 5 KPIs con literales fijos (entrenamientos completados, cumplimiento dietas, checkins, tasa respuesta)
- [x] `checkins()`: calculado de verdad desde `FormSubmission` (antes 720/590 fijos)
- [x] `/reports`: quitados filtros falsos "Gimnasio"/"Programa" (nombres de plantilla); "Coach" ahora real + filtra de verdad en los 5 métodos de informes (`usersSummary`/`sessions`/`checkins`/`subscriptions`/`payments`)
- [x] SEGURIDAD extra encontrada de paso: `usersSummary()` interpolaba `group_by` directo en `selectRaw()` sin whitelist (inyección SQL) — arreglado
- [x] `/pages/user-profile`: conectado a `GET /admin/me` / `POST /admin/update-profile` / `POST /admin/change-password` (ya existían sin usar); quitadas secciones sin campo real (dirección, redes sociales, cargo)
- [x] `/reported-postings`: añadidas acciones restaurar/banear/eliminar (backend ya existía)

## Fase 3 — Backend ya listo, frontend sin conectar — 🔶 EN CURSO

**Escritos en el scratchpad pero TODAVÍA NO commiteados/desplegados** (verificar
con `git status` en `bstronger-admin/` del scratchpad antes de repetir trabajo):

- [x] `RolesView.tsx`: reescrita como vista bespoke (antes CrudView con solo
      `name`) — ahora permite asignar permisos vía checkboxes, con diálogo de
      confirmación de borrado incluido
- [x] `PermissionsView.tsx`: convertida a `CrudView` completo (crear/borrar)
- [x] `RecipeView.tsx`: añadido input de imagen de portada (`recipe_image`),
      `handleSubmit` cambiado a `FormData` + `api.upload` (ojo: booleans deben
      mandarse como `'1'`/`'0'`, no `String(true)`, porque la regla `boolean` de
      Laravel no acepta el string `"true"`)
- [x] `DietView.tsx`: `categorydiet_id` número → select (`/admin/diet-categories`)
- [x] `IngredientView.tsx`: `ingredient_category_id` número → select (`/admin/ingredient-categories`)
- [x] `UnitConversionView.tsx`: `ingredient_id`/`measurement_unit_id` número → select (`/admin/ingredients`, `/admin/measurement-units`)
- [ ] **`LanguageKeywordView.tsx`**: `language_id`/`keyword_id`/`screen_id` número →
      select — PENDIENTE, es una vista bespoke (no usa CrudView), hay que
      editar los 3 `<Input type='number'>` del diálogo (líneas ~154-166) a
      selects cargando `/admin/languages`, `/admin/language-table-list` o el
      endpoint real de keywords, y `/admin/screens`. Confirmar primero los
      endpoints reales de opciones antes de escribir el fetch.
- [ ] **`DefaultKeywordView.tsx`**: `screen_id` número → select — PENDIENTE,
      mismo criterio, confirmar el endpoint real de `/admin/screens` primero.
- [ ] **`EquipmentView.tsx`**: no expone `load_type` (plate/dumbbell/fixed,
      campo añadido esta sesión para el motor de auto-regulación de carga) —
      PENDIENTE, añadir un `type: 'select'` con esas 3 opciones fijas
      (`options`, no `endpoint`, ya que son un enum fijo del backend).

**Al terminar Fase 3**: commit + push `bstronger-admin`, `npm run build` en la
VPS, marcar esta sección como ✅ completa.

## Fase 4 — Mejoras sistémicas en CrudView.tsx — ⬜ NO EMPEZADA

Afecta a ~28 vistas que usan el componente compartido `src/views/CrudView.tsx`.
Probar contra `SubAdminView`, `RolesView` (ya no lo usa, usar otra), `PackageView`,
`DietView` antes de dar por bueno.

- [ ] Validación "required" es solo cosmética (`CrudView.tsx:378-380`) — no
      bloquea el envío. Comprobar `fields.filter(f => f.required)` en
      `handleSubmit` antes de llamar a la API.
- [ ] Errores 422 de Laravel se muestran genéricos (`CrudView.tsx:190-191`) —
      `err.data.errors` existe (`ApiError` en `api.ts`) pero nunca se lee, y
      existe `FieldError` (`components/ui/field.tsx`) sin usar. Mapear cada
      mensaje al campo correspondiente.
- [ ] Botón "Eliminar" del diálogo de confirmación sin `disabled` durante la
      petición (`CrudView.tsx:439`) — doble clic dispara dos `DELETE`.

## Fase 5 — Confirmaciones y manejo de errores en vistas bespoke — ⬜ NO EMPEZADA

- [ ] `UserDetailView.tsx`: ~9 acciones de borrado de un clic sin confirmación
      (notas, objetivos, limitaciones, fotos, métricas, tareas, quitar
      entrenamiento, desasignar recurso). La más grave: **"Eliminar recurso
      entero"** (línea ~1560) borra el recurso para TODOS los clientes que lo
      tengan asignado, un solo clic desde la ficha de un cliente concreto.
      Envolver en `AlertDialog` (patrón ya usado en `UsersView`/`TwoFactorView`/
      `LoginDevicesView`).
- [ ] `TrainingProgramsView.tsx:1314`: quitar cliente de programa sin
      confirmación (la vista ya usa `confirm()` en otra acción, línea 719 —
      mismo patrón).
- [ ] `ClientTagsView.tsx`: desasignar etiqueta sin confirmación (inconsistente
      con borrar la etiqueta global, que sí la tiene); botón "Asignar" sin
      `disabled` durante el envío.
- [ ] `SubscriptionView.tsx` / `transactions/index.tsx`: tope fijo de 100
      registros sin paginación real ni aviso; exportación CSV solo exporta esos
      100 sin avisar de que puede haber más.
- [ ] `SubscriptionView.tsx`: `handleGrant`/`handleRevoke` descartan el error
      real del backend (`catch { toast.error('mensaje fijo') }`) — capturar
      `err` y mostrar `err.message`.
- [ ] `BulkAssignView.tsx`: fallo parcial no identifica a quién falló —
      acumular y mostrar nombres/IDs de los fallidos, no solo el conteo.
- [ ] `revenue/index.tsx`: fallo de carga silencioso (pantalla en blanco) —
      mostrar mensaje de error. Baja prioridad (solo lectura).

## Fase 6 — Limpieza de menú — ⬜ NO EMPEZADA

- [ ] Quitar `/apps/notes` y `/apps/tickets` del sidebar (sin backend,
      plantilla original sin propósito en este producto) — mismo criterio ya
      aplicado a `/posts` esta sesión (ver `sidebaritems.ts`, sección
      "Aplicaciones").
- [ ] No tocar `Level.rate` (campo sin uso detectado, posiblemente vestigial)
      ni el límite de push notifications a la cuenta demo (documentado como
      incompleto a propósito, no es un bug nuevo).

---

## Ronda 2 de auditoría (patrones transversales) — hallazgos ya incorporados arriba

Se lanzaron 3 auditorías adicionales de solo lectura buscando específicamente
seguridad/IDOR, patrones de sync/FormData repetidos, y errores silenciosos.
Dos completaron con éxito (seguridad → Fase 0; errores silenciosos → Fase 4/5).
La tercera (sync/relaciones y FormData en TODO el panel, más allá de lo ya
conocido) **falló por rate limit de la sesión** antes de terminar — ya había
completado su hallazgo principal (bug de `ExerciseView.tsx`, incorporado en
Fase 1) pero no llegó a confirmar si hay más instancias del mismo patrón en
vistas no revisadas todavía. **Si se retoma esta sesión, considerar relanzar
esa auditoría específica** (bugs de `sync()`/`FormData` en vistas de
`coaching/`, `community/`, `commerce/` no cubiertas por las 5 auditorías
originales por área) antes de dar la Fase 4-6 por completamente cerrada.

## Cómo retomar si se corta la sesión

1. Clonar de nuevo (o `git pull` si el scratchpad sigue vivo) `Bckbs` y
   `bstronger-admin` en el scratchpad de la nueva sesión.
2. Leer este documento, ir a la primera casilla `[ ]` sin marcar.
3. `git status` en cada repo clonado del scratchpad viejo (si el scratchpad
   sigue accesible) para ver si hay cambios sin commitear de una fase a medio
   terminar — no asumir que todo lo "hecho" en este doc ya está en git si la
   sección todavía dice 🔶 EN CURSO en vez de ✅.
4. Seguir el plan completo original también está en
   `~/.claude/plans/crispy-enchanting-pie.md` de esa sesión (puede no
   sobrevivir a un corte de sesión — este documento es la fuente de verdad
   más duradera).
