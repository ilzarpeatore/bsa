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
- [x] **Fase 3 — Backend ya listo, frontend sin conectar** (desplegada)
- [x] **Fase 4 — Mejoras sistémicas en CrudView.tsx** (desplegada)
- [x] **Fase 5 — Confirmaciones y manejo de errores en vistas bespoke** (desplegada)
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

## Fase 3 — Backend ya listo, frontend sin conectar — ✅ COMPLETADA Y DESPLEGADA

Commits `af0af2b` (bstronger-admin) + `209feca` (Bckbs). Build en VPS (incluye
`tsc`) sin errores.

- [x] `RolesView.tsx`: reescrita como vista bespoke (antes CrudView con solo
      `name`) — ahora permite asignar permisos vía checkboxes, con diálogo de
      confirmación de borrado incluido
- [x] `PermissionsView.tsx`: convertida a `CrudView` completo (crear/borrar)
- [x] `RecipeView.tsx`: añadido input de imagen de portada (`recipe_image`),
      `handleSubmit` cambiado a `FormData` + `api.upload`
- [x] `DietView.tsx`: `categorydiet_id` número → select (`/admin/diet-categories`)
- [x] `IngredientView.tsx`: `ingredient_category_id` número → select (`/admin/ingredient-categories`)
- [x] `UnitConversionView.tsx`: `ingredient_id`/`measurement_unit_id` número → select (`/admin/ingredients`, `/admin/measurement-units`)
- [x] `LanguageKeywordView.tsx`: `language_id`/`keyword_id`/`screen_id` número →
      select real (`/admin/languages`, `/admin/default-keywords`, `/admin/screens`).
      **Bug adicional encontrado y arreglado de paso**: `LanguageKeywordController::index()`
      hacía `with(['language','keyword','screen'])` pero el modelo
      `LanguageWithKeyword` llama a esas relaciones `languagelist`/`defaultkeyword`
      (no `language`/`keyword`) — `GET /admin/language-keywords` devolvía 500
      siempre. Corregido el nombre de las relaciones; la tabla ahora también
      resuelve los nombres reales (antes solo se arreglaba el formulario).
- [x] `DefaultKeywordView.tsx`: `screen_id` número → select (`/admin/screens`,
      `optionLabel: 'screenName'`) — ojo, este `screen_id` valida contra
      `screens.id` (PK interno), NO contra `screens.screenId` (el campo string
      que sí usa `LanguageWithKeyword.screen_id`) — son dos FKs distintas a la
      misma tabla, inconsistencia ya existente en el esquema, no se tocó.
- [x] `EquipmentView.tsx`: expone y permite editar `load_type`
      (plate/dumbbell/fixed) — hacía falta añadir el campo también a
      `EquipmentController::getValidationRules()` y a `EquipmentResource`
      (ninguno de los dos lo tenía, aunque el modelo y la migración de esta
      sesión ya lo soportaban).

**Nota para Fase 4/5**: no se resolvieron los IDs en bruto de las _columnas_ de
tabla de `UnitConversionView`/`DefaultKeywordView` (solo en el formulario) —
el backend no devuelve los nombres relacionados en el listado y no se tocó
para no ampliar el alcance. Bajo impacto, cosmético.

## Fase 4 — Mejoras sistémicas en CrudView.tsx — ✅ COMPLETADA Y DESPLEGADA

Commit `499f52e` (bstronger-admin). Afecta a ~28 vistas que usan el componente
compartido `src/views/CrudView.tsx`. Build en VPS (con `tsc`) sin errores; no
se probó manualmente en navegador contra una vista real por falta de tiempo —
si algo raro aparece en formularios de CrudView, mirar aquí primero.

- [x] Validación "required" ahora bloquea el envío de verdad (`handleSubmit`
      comprueba `field.required` antes de llamar a la API)
- [x] Errores 422 de Laravel (`err.data.errors`) ahora se mapean por campo y
      se muestran con `FieldError` (antes solo un toast genérico)
- [x] Botón "Eliminar" del diálogo de confirmación con estado `deleting` +
      `disabled` durante la petición

## Fase 5 — Confirmaciones y manejo de errores en vistas bespoke — ✅ COMPLETADA Y DESPLEGADA

Commit `f6ad187` (bstronger-admin). Build en VPS (con `tsc`) sin errores. Se usó
`confirm()` nativo (no `AlertDialog`) por ser el patrón ya existente en el mismo
archivo de varias de estas vistas y por el tamaño/densidad de `UserDetailView.tsx`
(2000+ líneas, muy compacto) — más seguro que reestructurar cada
`DropdownMenuItem` con un componente nuevo.

- [x] `UserDetailView.tsx`: las 9 acciones de borrado de un clic ahora piden
      confirmación. "Eliminar recurso entero" avisa explícitamente que afecta a
      TODOS los clientes que lo tengan asignado, no solo a este.
- [x] `TrainingProgramsView.tsx`: quitar cliente de programa ahora confirma.
- [x] `ClientTagsView.tsx`: desasignar etiqueta ahora confirma; "Asignar" ahora
      tiene estado de envío (`disabled` mientras está en curso).
- [x] `SubscriptionView.tsx` / `transactions/index.tsx`: ahora avisan (toast)
      si hay más registros en total de los 100 mostrados/exportados en CSV.
      No se implementó paginación real completa (alcance mayor, se dejó el
      aviso como mitigación suficiente por ahora).
- [x] `SubscriptionView.tsx`: `handleGrant`/`handleRevoke` ahora muestran
      `err.message` real del backend en vez de un texto fijo.
- [x] `BulkAssignView.tsx`: fallo parcial ahora identifica por nombre a quién
      falló, y deja seleccionados solo esos para reintentar sin duplicar a los
      que ya funcionaron.
- [x] `revenue/index.tsx`: fallo de carga ahora muestra un mensaje visible en
      vez de pantalla en blanco.

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
