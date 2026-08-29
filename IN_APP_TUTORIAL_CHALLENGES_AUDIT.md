# Auditoría — Sistema de Tutoriales In-App y Retos

Fecha: 2026-08-29 · Alcance: `store/TutorialContext.tsx`, `components/tutorial/*`, `constants/tutorialChallenges.ts`, y las 8 pantallas que registran `TutorialTarget` o llaman `reportAction`/`startChallenge`.

Convención usada en todo el documento:

- **CONFIRMADO** = verificado leyendo el código real, cita `archivo:línea`.
- **PROBABLE** = inferido del código pero no reproducido en dispositivo.
- **PROPUESTA** = mejora que no corrige un bug existente, es una recomendación.

No se ha modificado ningún archivo de código durante esta auditoría (dos bugs ya corregidos en commits previos de esta misma sesión — `home-habits-link` sin `scrollRef`, y el paso de readiness bloqueando su propio formulario — se mencionan aquí solo como antecedentes, ya están resueltos y pusheados en `claude/app-onboarding-flow-issue-cwekco`).

---

## 1. Resumen ejecutivo

El sistema es **enteramente local** (sin backend propio): un catálogo estático de 7 "retos" (`TUTORIAL_CHALLENGES` en `constants/tutorialChallenges.ts`) se recorre paso a paso mediante un overlay global (`TutorialOverlay`) que oscurece la pantalla y deja un hueco tocable sobre un elemento real (`TutorialTarget`), registrado por coordenadas de pantalla en un `Context` (`TutorialContext`). Cada paso se completa por una **acción real** (navegación observada o `reportAction(id)` llamado desde el punto de éxito real de la pantalla) — nunca por un botón "Siguiente" simulado. El progreso (`doneIds: string[]`) persiste en una única clave de `AsyncStorage`, sin resolución por usuario.

Es una arquitectura sólida en su principio (activar el tutorial no puede hacer trampa: hay que usar la app de verdad), y tiene ya varias correcciones documentadas en su propio código (comentarios "BUG real corregido..." son constantes en estos archivos — el equipo ya ha iterado sobre esto). Pero el mecanismo de "spotlight" tiene **dos modos de fallo estructurales que se repiten** cada vez que se añade un paso nuevo sin pensar en ellos explícitamente:

1. **El target vive fuera de la vista inicial de un `ScrollView`** y no se le pasa `scrollRef` → el hueco nunca aparece, tutorial atascado salvo "Saltar". Ya ha ocurrido 3 veces (`plan-meal-toggle-first`, `home-habits-link`, y — pendiente de confirmar — posiblemente `home-nutrition-link`, ver §7.5).
2. **El target es el botón final de un formulario con varios campos por encima**, y la máscara del overlay bloquea el toque en todo lo que no sea el hueco → los campos de arriba quedan intocables. Ya ocurrió con el paso de readiness (corregido esta sesión, ver §7.1).

El resto de bugs son más puntuales: persistencia de progreso no aislada por usuario (§7.2, confirmado), un `targetId` compartido por accidente entre varias filas de una tabla cuando el primer bloque tiene más de un ejercicio (§7.6), y un reto ("Rellena tu check-in de preparación") que el usuario ya ha pedido explícitamente fusionar con "Accede a tu entrenamiento" en vez de aparecer suelto (§7.7).

No hay backend involucrado en el propio sistema de retos — así que gran parte de los apartados solicitados sobre backend/sincronización/offline del catálogo de retos **no aplican** (sí aplican, y se cubren, para las acciones reales que cada paso observa: enviar readiness, marcar hábito, etc., que sí son llamadas API con su propio manejo de errores ya existente).

---

## 2. Arquitectura actual

```
constants/tutorialChallenges.ts   Catálogo estático (7 retos, N pasos c/u). Sin backend.
        │
store/TutorialContext.tsx         Estado: reto activo, paso activo, targets registrados,
        │                         doneIds persistido. Expone startChallenge/reportAction/
        │                         registerTarget/skipChallenge/resetAll.
        │
        ├── components/tutorial/TutorialTarget.tsx   Envuelve un elemento real, mide su
        │                                             posición (measureInWindow), la registra
        │                                             en el Context, opcionalmente hace scroll
        │                                             para traerlo a la vista.
        │
        └── components/tutorial/TutorialOverlay.tsx  Montado UNA vez en App.tsx. Lee el paso
                                                       activo + su rect registrado, pinta 4
                                                       franjas oscuras alrededor (spotlight) o
                                                       un banner flotante (pasos sin targetId).
```

Puntos de montaje / integración:

- `App.tsx:496-501` — `<TutorialProvider navigationRef={...}>` envuelve `<AppNavigationContainer>`, y `<TutorialOverlay />` se monta como hermano, fuera del árbol de navegación (mismo patrón que `WorkoutMinimizedBar`/`ScreenReviewFab`, con el mismo comentario explicando por qué NO puede vivir dentro de un `<Modal>`: un `Modal` de RN es una ventana nativa aparte, y `pointerEvents="box-none"` no cruza esa frontera — bug real ya corregido, ver `TutorialOverlay.tsx:18-28`).
- `pages/migrated/home_screen_modern_v2.tsx:358-375` — el bloque "Reto para empezar" (`StartupChecklist`) es la única entrada manual al sistema: lista los retos no `hidden`, cada fila llama `startChallenge(challenge.id)`.
- Cada pantalla de destino registra sus propios `<TutorialTarget id="...">` alrededor del elemento real, y llama `reportAction('...')` en el punto exacto donde la acción real ya tuvo éxito (nunca antes).

Modelo de datos (`constants/tutorialChallenges.ts:12-59`):

```ts
type TutorialCompletion =
  | { type: 'navigate'; screen: string | string[] } // completa al aterrizar en esa ruta
  | { type: 'action'; actionId: string }; // completa cuando reportAction(actionId) coincide

interface TutorialStep {
  targetId?: string; // si falta, el paso usa el modo "banner flotante" (sin máscara)
  title: string;
  text: string;
  completion: TutorialCompletion;
  skippable?: boolean; // si el target no aparece en 2.5s, se salta solo (ver §5)
}

interface TutorialChallenge {
  id: string;
  label: string;
  steps: TutorialStep[];
  nextChallengeId?: string; // encadena automáticamente al terminar
  hidden?: boolean; // no aparece en el checklist de Home (solo alcanzable encadenado)
}
```

No hay endpoints, no hay tabla en BD, no hay `SecureStore` implicado. El único almacenamiento es:

| Clave AsyncStorage                     | Contenido                              | Dónde                               |
| -------------------------------------- | -------------------------------------- | ----------------------------------- |
| `@bestronger_tutorial_done_challenges` | `string[]` de ids de retos completados | `store/TutorialContext.tsx:5,51-60` |

---

## 3. Auditoría de tutoriales in-app

### Inicio

- **¿Cuándo aparece?** Nunca automáticamente. Solo se activa al tocar una fila del checklist "Reto para empezar" en Home (`startChallenge(id)`), o cuando un reto encadena al siguiente vía `nextChallengeId` (`TutorialContext.tsx:77-83`).
- **¿Para quién?** Para cualquier usuario autenticado — no hay segmentación (nuevo vs. recurrente) ni gate por fecha de registro. El checklist se muestra siempre en Home, marcando `done`/`no done` según `doneIds`.
- **¿Una sola vez?** Cada reto individual sí, en el sentido de que una vez en `doneIds` no vuelve a aparecer como pendiente — pero nada impide re-lanzarlo a mano (tocando la fila del checklist otra vez), ya que `startChallenge` no comprueba `isDone` antes de arrancar (`TutorialContext.tsx:89-92`). **PROBABLE**: tocar un reto ya completado en el checklist lo reinicia igualmente desde el paso 0 sin avisar de que ya estaba hecho — no verificado si la UI del checklist oculta o deshabilita las filas `done` (no se ha leído `StartupChecklist.tsx` en esta pasada, ver §16 P2 para revisarlo).
- **¿Se puede reabrir?** Sí, tocando la fila (ver punto anterior). No hay botón "Ver tutorial de nuevo" en Ajustes — solo existe `resetAll()` en el Context (`TutorialContext.tsx:98-101`, borra `doneIds` por completo), **sin ninguna UI que lo llame** (`docs/TAREAS.md:200`, confirmado también con `grep`: cero resultados de esa función fuera del propio Context).
- **¿Cierra la app durante el tutorial?** El estado del reto activo (`activeChallengeId`, `activeStepIndex`) vive en `useState` normal, **no persiste**. Al reabrir la app, el tutorial no está activo (aunque tampoco se marcó como completado) — el usuario simplemente no ve nada, y tendría que volver a tocar la fila del checklist manualmente. No es un crash ni pérdida de datos reales (los targets no guardan nada de negocio), pero sí pérdida de contexto ("dónde me había quedado").
- **¿Pulsa atrás (back físico/gesto)?** No hay manejo específico. Si "atrás" navega a otra pantalla, el `targetId` del paso activo deja de estar montado → `unregisterTarget` lo limpia (`TutorialTarget.tsx:36-44`) → `TutorialOverlay` deja de pintar nada (`activeTargetRect` vuelve a `null`, `TutorialOverlay.tsx:39`) salvo que el paso sea de tipo banner (sin `targetId`), que sigue flotando sin importar en qué pantalla estés. El reto queda "activo en memoria" pero invisible — mismo síntoma que el bug ya documentado de retos `hidden` sueltos.
- **¿Salta el tutorial?** `skipChallenge()` → `endChallenge(false)` → no se añade a `doneIds`, así que el reto sigue apareciendo como pendiente en el checklist (correcto, "saltar" no es "completar").

### Navegación

No existe "Siguiente"/"Atrás" dentro de un paso — el único control del overlay es "Saltar tutorial" (`TutorialOverlay.tsx:41-44`), que cierra el **reto completo**, no solo el paso. No hay forma de retroceder un paso ni de saltar SOLO el paso activo (existe `skippable` a nivel de paso, pero es automático por timeout de 2.5s, no una acción del usuario).

### Estado

- Completado → `doneIds` (AsyncStorage, ver arriba). **CONFIRMADO** que no se limpia en `logout()` (`store/AuthContext.tsx:165` — el array `removeMany` incluye `'USER'`, `'ONBOARDING_COMPLETED'`, `ACTIVE_SESSION_STORAGE_KEY`, pero no la clave de tutorial). Ver bug 🟠 en §7.2.
- Cambio de usuario en el mismo dispositivo sin cerrar la app: corrección a esta misma auditoría tras leer `App.tsx:495-503` con más cuidado — `TutorialProvider` vive DENTRO de `AuthProvider` (no fuera, como se afirmaba en una versión anterior de este documento), pero eso no cambia la conclusión: `AuthProvider` en sí nunca se desmonta al hacer login/logout (su `state` cambia por reducer, el componente sigue montado), así que `TutorialProvider`, como hijo estático de ese árbol, tampoco se remonta. `doneIds` en memoria persistía igual entre cuentas. **Corregido** (P0-4, ver §16): al vivir dentro de `AuthProvider`, `TutorialContext` puede consumir `useAuth()` directamente sin ciclo de imports, y ahora recarga `doneIds` cada vez que cambia `state.user?.id`.
- Reinstalar la app: `AsyncStorage` se borra con la desinstalación (comportamiento estándar de iOS/Android, a diferencia de `SecureStore`/Keychain, ver el incidente ya documentado en `docs/BUILD_IPA.md` sobre el token de sesión) → `doneIds` vuelve a `[]`, todos los retos aparecen pendientes de nuevo. Correcto y esperado.
- Estado corrupto/ausente: `AsyncStorage.getItem(STORAGE_KEY).then(raw => { if (raw) setDoneIds(JSON.parse(raw)) }).catch(() => {})` (`TutorialContext.tsx:50-56`) — si `raw` existe pero no es JSON válido, `JSON.parse` lanza, cae al `.catch(() => {})` **silencioso**, `doneIds` se queda en `[]` (el valor inicial). No revienta la app, pero pierde silenciosamente el progreso sin loguear el error (a diferencia de otros puntos del código que sí usan `logger.error`, ej. `AuthContext`/`onboarding_v2_screen.tsx`). 🟢 menor, ver §7.8.

### UX

- Overlay: 4 `Box` oscuras (`rgba(0,0,0,0.72)`) recortando un hueco con borde naranja (`TutorialOverlay.tsx:110-121`), tooltip con contador "X · paso/total", título, texto, hint "Tócalo para continuar" con icono de mano. Diseño coherente con el resto de la app (mismos tokens `C`/`FONT`/`RADIUS`).
- Posicionamiento del tooltip: decide arriba/abajo del hueco según espacio disponible (`spaceBelow > 160`, `TutorialOverlay.tsx:68-69`) — razonable, cubre la mayoría de casos, pero no contempla que el propio tooltip pueda no caber en pantallas muy pequeñas (no hay clamp de altura ni scroll dentro del tooltip).
- Safe areas: usa `useSafeAreaInsets()` para el botón "Saltar" (`top: insets.top + 10`) y el banner (`bottom: insets.bottom + 24`) — correcto.
- Accesibilidad: no se han encontrado `accessibilityLabel`/`accessibilityRole` en `TutorialOverlay.tsx` ni `TutorialTarget.tsx` — un lector de pantalla no anunciaría el contenido del coach-mark ni el hueco tocable de forma diferenciada del resto de la pantalla oscurecida. 🟢 mejora, no bloqueante (la app en general parece no tener una capa de accesibilidad extensa).
- Tamaños de pantalla: el spotlight se calcula con `Dimensions.get('window')` en el cuerpo del componente función (no un hook reactivo) — en un dispositivo que rota o cambia de tamaño (split-screen Android/iPad), `screenH` podría quedar desactualizado hasta el siguiente render. Bajo impacto (RN en iOS/Android normalmente fuerza remount o el layout ya dispara re-render por otras vías), pero no es el patrón recomendado (`useWindowDimensions()` sí es reactivo, y ya se usa en otras pantallas de esta misma app, ej. `home_screen_modern_v2.tsx:376`).

---

## 4-5. Bugs encontrados (con severidad, causa raíz, estados)

| #   | Bug                                                                                      | Severidad                               | Reproducción                                                                                                              | Causa raíz                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Impacto                                                                                                                                                                  | Solución                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Paso de readiness bloqueaba su propio formulario                                         | 🔴 Crítico                              | Iniciar "Registra tu primera serie" con el readiness diario pendiente                                                     | `targetId` apuntaba al botón de enviar (al final del scroll); la máscara del overlay bloquea el toque en todo lo que no sea el hueco, tapando las 4 preguntas de arriba. Botón además `disabled` hasta responder las 4. `workout_preview_screen.tsx:162` (antes del fix)                                                                                                                                                                                                                                                                                 | Tutorial irrecuperable salvo "Saltar" — bloquea el reto más importante (primer entrenamiento)                                                                            | **Ya corregido** (commit `e54ee5e`, esta sesión): paso sin `targetId`, modo banner sin máscara                                                                                                   |
| 2   | `home-habits-link` sin `scrollRef`                                                       | 🔴 Crítico                              | Iniciar "Marca un hábito como hecho" con la sección Hábitos fuera de la vista inicial                                     | `TutorialTarget` solo hace auto-scroll si recibe `scrollRef` (`TutorialTarget.tsx:53-67`); `home-habits-link` no lo recibía, a diferencia de `home-nutrition-link` en el mismo fichero                                                                                                                                                                                                                                                                                                                                                                   | Hueco nunca visible, reto irrecuperable salvo "Saltar"                                                                                                                   | **Ya corregido** (commit `6955f2a`, esta sesión)                                                                                                                                                 |
| 3   | Persistencia de `doneIds` no aislada por usuario                                         | 🟠 Alto                                 | Usuario A completa retos → logout → login usuario B en el mismo dispositivo, sin cerrar la app (o incluso cerrándola)     | `logout()` en `store/AuthContext.tsx` no incluía la clave `@bestronger_tutorial_done_challenges` en su `AsyncStorage.removeMany([...])`; además `TutorialContext` nunca reaccionaba a cambios de sesión                                                                                                                                                                                                                                                                                                                                                  | Usuario B veía retos ya "hechos" que nunca completó — dato de progreso cruzado entre cuentas en un dispositivo compartido                                                | **Ya corregido**: clave añadida al `removeMany` de `logout()`; `TutorialContext` consume `useAuth()` (vive dentro de `AuthProvider`) y recarga/resetea `doneIds` cuando cambia `state.user?.id`  |
| 4   | `workout-session-first-set-toggle` no filtra por `exIdx`                                 | 🟡 Medio                                | Un entrenamiento donde el primer bloque tiene más de un ejercicio                                                         | La condición es `blockIdx === 0 && rowIdx === 0` (`workout_session_screen.tsx:1959`) — a diferencia de la de las métricas, que sí exige `exIdx === 0` (línea 1897-1901). Con block 0 teniendo 2+ ejercicios, el mismo `id="workout-session-first-set-toggle"` se registra en la fila 0 de CADA ejercicio de ese bloque, pisándose entre sí en `targetsRef.current` (`registerTarget`, `TutorialContext.tsx:103-106`)                                                                                                                                     | El spotlight puede terminar señalando el círculo de un ejercicio distinto al que el usuario está mirando, o parpadear entre posiciones según orden de montaje/desmontaje | **Ya corregido**: `exIdx === 0` añadido a la condición, igual que ya hacía la de métricas                                                                                                        |
| 5   | `resetAll()` sin UI que lo invoque                                                       | 🟢 Bajo                                 | —                                                                                                                         | Función completa y funcional en el Context (`TutorialContext.tsx:98-101`), pero cero llamadas fuera de la propia definición (confirmado por grep)                                                                                                                                                                                                                                                                                                                                                                                                        | Un usuario que quiera "volver a ver el tutorial" no tiene forma de hacerlo sin desinstalar la app                                                                        | Añadir una fila en Ajustes que llame `resetAll()` — ya documentado como pendiente en `docs/TAREAS.md:200`                                                                                        |
| 6   | `JSON.parse` de `doneIds` corrupto falla en silencio                                     | 🟢 Bajo                                 | AsyncStorage con un valor no-JSON bajo esa clave (improbable en uso normal, posible tras una migración de formato futura) | `catch(() => {})` sin log (`TutorialContext.tsx:55`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Progreso de retos se pierde sin rastro para depurar                                                                                                                      | **Ya corregido**: `logger.error` con el patrón ya usado en el resto de la app, mantiene el fallback a `[]`                                                                                       |
| 7   | "Rellena tu check-in de preparación" duplica conceptualmente "Accede a tu entrenamiento" | 🟡 Medio (UX, no técnico)               | Ver el checklist de Home con un check-in pendiente                                                                        | `complete-checkin` es un reto visible independiente que YA encadena a `access-workout` vía `nextChallengeId` (`tutorialChallenges.ts:291`) — pero al no ser `hidden`, también aparece como fila suelta en el checklist, dando la impresión de ser dos retos distintos cuando conceptualmente son el mismo viaje                                                                                                                                                                                                                                          | Confusión de producto — pedido explícito del usuario de fusionarlos                                                                                                      | **Ya corregido**: se elimina el reto suelto `complete-checkin`, su paso pasa a ser el primero de `access-workout` (mismo `skippable: true`, mismo `targetId`/`completion`)                       |
| 8   | `access-nutrition-plan` reportado como "no redirige a la posición correcta"              | 🟡 Medio — **no reproducido en código** | Reportado por el usuario, no confirmado leyendo el código                                                                 | `home-nutrition-link` SÍ tiene `scrollRef={scrollRef}` ya en el código actual (`home_screen_modern_v2.tsx:1378`) — a diferencia de `home-habits-link` (bug #2), aquí no se encontró una ausencia estructural equivalente. Candidato más probable: condición de carrera entre el `setTimeout(measure, 80)` de `TutorialTarget` (`TutorialTarget.tsx:36-44,53-67`) y el layout real cuando el contenido de encima (tarjetas dinámicas, imágenes) todavía se está midiendo/re-flotando — el scroll podría ejecutarse contra una `y` que cambia poco después | Si se reproduce, el síntoma sería "el scroll se queda corto o se pasa" en vez de "no hace nada" (diferente del bug #2, que era binario)                                  | Ver §16 P1 — sustituir el `setTimeout` fijo de 80ms por una espera basada en `InteractionManager.runAfterInteractions` + reintento si el layout cambia, en vez de un único disparo a tiempo fijo |

---

## 6. Auditoría del sistema de retos

Catálogo tras P0-3 (`constants/tutorialChallenges.ts`), 6 retos, 4 visibles en el checklist de Home + 2 encadenados (`hidden`) — `complete-checkin` ya no existe como entrada suelta, su único paso vive ahora como primer paso de `access-workout`:

| id                      | Visible en checklist | Pasos                                                                                    | Encadena a       | Backend real detrás                                                   |
| ----------------------- | -------------------- | ---------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `access-workout`        | Sí                   | 2 (check-in de preparación, skippable → tocar tarjeta "hoy")                             | `log-first-set`  | `checkinsApi.submit` + navegación pura                                |
| `log-first-set`         | No (hidden)          | 8 (readiness → iniciar → reps → carga → rir → descanso → rpe → marcar serie → finalizar) | —                | `readinessApi.submit`, marcar serie (local + sync del propio workout) |
| `add-habit`             | Sí                   | 3 (ir a hábitos → "+" → elegir/crear)                                                    | —                | `habitsApi.adopt` (`habit_add_screen.tsx:115,178`)                    |
| `mark-habit-done`       | Sí                   | 2 (ir a hábitos → marcar círculo)                                                        | —                | `habitsApi.logHabit` (`habits_list_screen.tsx:106-109`)               |
| `access-nutrition-plan` | Sí                   | 1 (tocar enlace nutrición)                                                               | `mark-meal-done` | Navegación pura                                                       |
| `mark-meal-done`        | No (hidden)          | 1 (marcar comida)                                                                        | —                | Llamada real de marcar comida en `plan_screen.tsx`                    |

**No hay "desbloqueo" en el sentido de dependencias entre retos** (ninguno exige que otro esté `done` antes de poder iniciarse) — el único acoplamiento es el encadenado automático (`nextChallengeId`), que es unidireccional y solo determina QUÉ empieza después de terminar uno, no qué está disponible.

**No hay duración, repetición ni recompensa** en el sistema actual — cada reto se completa una vez y desaparece de "pendientes" en el checklist. No existen streaks, puntos, ni ningún tipo de gamificación more allá del propio catálogo. Si el producto quiere eso, es una funcionalidad nueva, no un bug de la actual (`docs/TAREAS.md:200` ya apunta a "13 retos 'descubre más'" como catálogo pendiente de ampliar, sin mencionar recompensas).

---

## 7. Estados y máquina de estados

### 7.1 Estados reales que el sistema ya modela

Por **reto**, implícito en `doneIds` + `activeChallengeId`:

```
NO_INICIADO  (no está en doneIds, activeChallengeId !== este id)
    │ startChallenge(id)
    ▼
ACTIVO        (activeChallengeId === id, activeStepIndex apunta al paso actual)
    │                          │
    │ completar todos          │ skipChallenge()
    │ los pasos                │
    ▼                          ▼
COMPLETADO (en doneIds)    NO_INICIADO (vuelve a pendiente, no se marca done)
```

No existe un estado `PAUSADO` explícito — cerrar la app o navegar fuera equivale a un abandono silencioso que dejar el reto "activo en memoria" pero sin overlay visible (ver §3, "cierra la app durante el tutorial"), indistinguible externamente de `NO_INICIADO` salvo que technically `activeChallengeId` sigue apuntando a él hasta el próximo `startChallenge`/`skipChallenge`.

### 7.2 ¿Hace falta una máquina de estados explícita más rica?

**No para el catálogo actual.** Los 5 estados de arriba cubren exactamente lo que el producto necesita hoy: no hay expiración, no hay repetición programada, no hay fallo (una acción real que falla — ej. `readinessApi.submit` — simplemente no completa el paso y dispara un toast de error, el usuario puede reintentar sin penalización). Añadir `FAILED`/`EXPIRED`/`PAUSED` como estados formales sería sobre-ingeniería para un catálogo de 7 retos estáticos sin backend. Si en el futuro se añaden retos con fecha límite o repetición (ej. "check-in diario" ya es semi-recurrente en la práctica, aunque hoy se modela solo como una acción real observada, no como un reto de tutorial que se repite), entonces sí valdría la pena revisar esto — no antes.

### 7.3 Por paso

Dentro de un reto activo, cada paso es: `PENDIENTE` (activeStepIndex apunta a él, target aún sin registrar o registrado esperando la acción) → `COMPLETADO` (avanza `activeStepIndex`) — y opcionalmente `SALTADO_AUTO` si `skippable: true` y el target no aparece en 2.5s (`TutorialContext.tsx:135-146`). No hay "saltar este paso" manual, solo "saltar el reto entero".

---

## 8. Persistencia — qué falta y qué está bien

**Bien:**

- Progreso de retos en AsyncStorage, formato simple (`string[]`), sin necesidad de sincronizar con backend (correcto: es metadato de UX local, no dato de negocio del usuario).
- Las ACCIONES reales que cada paso observa (enviar readiness, marcar hábito, marcar comida, enviar check-in) sí van al backend con su propio manejo de errores ya existente — el tutorial solo "escucha" su éxito, no duplica su persistencia.

**Falta (ver bug #3):**

- Aislar `doneIds` por usuario — o bien prefijando la clave con el id de usuario (`@bestronger_tutorial_done_challenges:${userId}`), o bien limpiándola explícitamente en `logout()` y recargándola en `login()`/`restoreToken()`.

**No aplica:**

- Offline: el sistema de retos en sí no hace ninguna llamada de red propia — solo observa acciones reales que ya tienen su propio comportamiento offline (ej. `readinessApi.submit` con catch → toast, no bloquea nada del tutorial). No hay nada que sincronizar al volver la conexión porque no hay estado de retos en el backend.

---

## 9. Condiciones de completado — ¿alguna ambigua?

Revisadas las 15 `completion` del catálogo: **todas están atadas a una acción real, ninguna se completa por abrir una pantalla sin más** (la más cercana a eso es `type: 'navigate'`, pero incluso esa exige que el router realmente cambie de ruta, no que el usuario "vea" algo). Esto es un acierto de diseño explícito y documentado en los propios comentarios del catálogo.

Único matiz: los pasos `skippable: true` (5 de los 8 de `log-first-set`, más los de readiness/check-in/habit-add-button) se completan por **timeout**, no por acción — esto es intencional y correcto para datos que pueden no existir en ese entrenamiento concreto (ej. un ejercicio sin RIR configurado), pero significa que un usuario que sí tenga esos campos disponibles y tarde más de 2.5s en interactuar verá el paso "saltarse solo" sin haber hecho nada — comportamiento correcto por diseño, pero vale la pena confirmarlo con el equipo de producto si 2.5s es el tiempo deseado (no hay ninguna señal de que sea un valor mal calibrado, solo se documenta como parámetro fijo a tener en cuenta).

---

## 10. UX del flujo — perspectiva de usuario real

- **¿Sabe qué tiene que hacer?** Sí, cada paso tiene título + texto explicativo específico.
- **¿Sabe por qué?** Parcial — los textos explican el QUÉ ("toca aquí para..."), no siempre el PORQUÉ del producto (ej. el paso de RIR sí explica el concepto, pero "Marca una serie como hecha" no explica por qué importa registrar series). Menor, no bloqueante.
- **¿Sabe qué ha completado / qué le queda?** Sí, el contador "reto · paso/total" en el tooltip (`TutorialOverlay.tsx:96-98`) y el checklist de Home con estado done/pendiente por reto.
- **¿Puede volver atrás?** No dentro de un reto (ver §3, "Navegación") — solo saltar el reto completo. Fricción menor si el usuario se equivoca de paso, pero dado que cada paso es una acción real (no una pantalla informativa), "volver atrás" tiene poco sentido de producto aquí.
- **¿Puede retomar el proceso?** Solo re-tocando la fila del checklist, que reinicia desde el paso 0 (no desde donde lo dejó) — ver bug potencial en §3 sobre si el checklist permite re-tocar retos `done`.
- **¿Dead ends?** El único real identificado es el bug #1 (ya corregido) — con el fix aplicado, no se han encontrado otros callejones sin salida confirmados en el catálogo actual.

---

## 11. UX/UI — específico

- Overlay, tooltip, spotlight: coherentes con el design system existente (mismos tokens de color/fuente/radio que el resto de la app), sin proponer rediseño.
- Loading/empty/error states: el tutorial no tiene sus propios estados de carga (no hace llamadas de red propias) — hereda los de la pantalla real que envuelve, lo cual es correcto (no debe duplicar esa lógica).
- Único hallazgo real de UI: falta feedback de accesibilidad (§3), y el 🟢 de `Dimensions.get('window')` no reactivo.

---

## 12. Edge cases — comportamiento actual vs. esperado

| Caso                                                                 | Comportamiento actual (CONFIRMADO por código)                                                                                                                                                                                                                                                                                                                                                                                     | ¿Correcto?                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cierra la app en mitad del tutorial                                  | Estado en memoria se pierde, `doneIds` no cambia, reto sigue pendiente                                                                                                                                                                                                                                                                                                                                                            | Aceptable — no hay pérdida de datos reales                                                                                                                                                                                                                                               |
| Pulsa el hueco repetidamente antes de que la acción real tenga éxito | No hay debounce explícito en `reportAction`, pero como depende de la acción real (ej. `onSubmit` con `disabled={saving}` en el botón de readiness), el propio botón ya se protege contra doble-tap en los casos revisados                                                                                                                                                                                                         | Aceptable, delegado correctamente a cada pantalla                                                                                                                                                                                                                                        |
| Navega atrás / cambia de pantalla                                    | Target se desregistra (`unregisterTarget`), overlay deja de pintar el spotlight (pasos con `targetId`); pasos banner (sin `targetId`) siguen flotando en cualquier pantalla                                                                                                                                                                                                                                                       | Parcialmente correcto — el banner "persiguiendo" al usuario a pantallas no relacionadas podría confundir, pero no se ha encontrado un caso real en el catálogo actual donde esto ocurra de forma dañina (el único paso banner es "Elige o crea tu hábito", ya dentro del flujo correcto) |
| Pierde conexión durante una acción del tutorial                      | Delegado a la pantalla real (ej. `readinessApi.submit` → catch → toast, no avanza el paso)                                                                                                                                                                                                                                                                                                                                        | Correcto, consistente en todas las pantallas revisadas                                                                                                                                                                                                                                   |
| API tarda demasiado                                                  | Mismo comportamiento que arriba — el paso simplemente no avanza hasta que la promesa resuelve                                                                                                                                                                                                                                                                                                                                     | Aceptable                                                                                                                                                                                                                                                                                |
| Cambia de cuenta                                                     | Bug #3 — `doneIds` cruza cuentas                                                                                                                                                                                                                                                                                                                                                                                                  | **Incorrecto**, confirmado                                                                                                                                                                                                                                                               |
| Reinstala la app                                                     | `doneIds` vuelve a `[]` vía borrado de AsyncStorage                                                                                                                                                                                                                                                                                                                                                                               | Correcto                                                                                                                                                                                                                                                                                 |
| Varios dispositivos                                                  | Sin sincronización de `doneIds` entre dispositivos (100% local) — un reto completado en el móvil no se marca done en otro dispositivo del mismo usuario                                                                                                                                                                                                                                                                           | Comportamiento esperado dado que no hay backend para esto; si el producto quiere sincronización cross-device, es una funcionalidad nueva, no un bug                                                                                                                                      |
| Completa pasos fuera de orden                                        | No es posible por diseño — solo el paso `activeStepIndex` tiene su target "activo" (`registerTarget` solo actualiza `activeTargetRect` si `activeStep?.targetId === id`, `TutorialContext.tsx:103-106`); tocar el elemento real de un paso futuro sin pasar por el actual simplemente no hace nada especial del tutorial (la acción real de negocio sí ocurre igual, solo que el tutorial no la "escucha" hasta que sea su turno) | Correcto                                                                                                                                                                                                                                                                                 |
| Accede directamente a un reto "bloqueado"                            | No existe el concepto de bloqueo entre retos (§6) — no aplica                                                                                                                                                                                                                                                                                                                                                                     |
| Datos locales modificados a mano                                     | `doneIds` es un array de strings sin validación de que los ids existan en `TUTORIAL_CHALLENGES` — un id inventado simplemente nunca hará match en `isDone()` de forma útil, pero tampoco rompe nada (`.includes()` es seguro con cualquier string)                                                                                                                                                                                | Aceptable, sin riesgo                                                                                                                                                                                                                                                                    |
| Datos antiguos de versión anterior                                   | Mismo mecanismo de arriba — si un reto se renombra o elimina del catálogo, su id viejo en `doneIds` queda "huérfano" (no rompe, simplemente nunca hace match)                                                                                                                                                                                                                                                                     | Aceptable, sin riesgo, aunque acumula basura en el array indefinidamente (bajo impacto, son strings cortos)                                                                                                                                                                              |

---

## 13. Rendimiento y estabilidad

- **Listeners sin limpiar**: revisado — `useFocusEffect` en `TutorialTarget` limpia su timeout y desregistra el target en el cleanup (`TutorialTarget.tsx:36-44`); el listener de navegación en `TutorialContext` se desuscribe correctamente (`TutorialContext.tsx:157-168`). No se han encontrado leaks.
- **Timers sin limpiar**: el `setTimeout` del auto-skip (`TutorialContext.tsx:144`) y el del auto-scroll (`TutorialTarget.tsx:57-66`) ambos limpian correctamente en su cleanup.
- **Re-renders**: `TutorialOverlay` se re-renderiza en cada cambio de `activeTargetRect`/`activeStep` (esperado, es un overlay reactivo pequeño). No se ha detectado un patrón de re-render en cascada hacia el resto de la app — el Context expone funciones memoizadas con `useCallback` en casi todos los casos.
- **Race conditions**: la más real es la ya descrita en el bug #8 (candidato, no confirmado) — el `setTimeout(80ms)` fijo del auto-scroll corriendo antes de que el layout final esté asentado.
- **Requests duplicadas**: no aplica — el sistema de retos no hace requests propias.

---

## 14. Arquitectura del código

- **Separación de responsabilidades**: buena — `TutorialContext` (estado puro), `TutorialTarget` (medición/registro), `TutorialOverlay` (presentación), `tutorialChallenges.ts` (datos) están claramente separados, cada uno con una sola responsabilidad.
- **Código duplicado**: mínimo — el patrón `isTutorialMetric ? <TutorialTarget>...</TutorialTarget> : ...` se repite en 3-4 sitios (`workout_session_screen.tsx`, `habits_list_screen.tsx`, `home_screen_modern_v2.tsx`) pero es una repetición razonable dado que cada uno envuelve un elemento distinto — extraerlo a un helper no aportaría mucho.
- **Lógica de negocio en UI**: el único caso borderline es que cada pantalla decide POR SU CUENTA cuándo llamar `reportAction` — es el diseño correcto (evita instrumentar cada pantalla desde un sitio central que no puede conocer el momento exacto de éxito de cada acción), pero significa que añadir un paso nuevo siempre requiere tocar la pantalla de destino, no solo el catálogo. Aceptado como coste necesario del enfoque "nunca completar por un botón simulado".
- **Componentes demasiado grandes**: no es un problema del sistema de tutorial en sí — es un problema (si acaso) de las pantallas que lo integran (`workout_session_screen.tsx` es un fichero grande, pero por su propia complejidad de negocio, no por el tutorial).
- **Dependencias circulares**: ninguna encontrada.

**Conclusión de arquitectura: no hace falta refactorizar el sistema.** Es sólido. Los bugs encontrados son de "un caso concreto se olvidó de seguir el patrón ya establecido" (scrollRef, exIdx), no de diseño.

---

## 15. Flujo ideal por reto (estado actual documentado como flujo, con el fix de #1 y #2 ya aplicado)

### `access-workout` → `log-first-set` (viaje completo "primer entrenamiento")

```
Home: checklist "Accede a tu entrenamiento de hoy"
  ↓ usuario toca la fila → startChallenge('access-workout')
Home: paso 0 -- check-in de preparación (home-checkin-card, fusionado aquí en P0-3, antes era el reto suelto "complete-checkin")
  Qué ve: hueco tocable sobre la tarjeta de check-in SI hay uno pendiente hoy
  Acción requerida: rellenar y enviar el check-in real
  Condición: reportAction('checkin_submitted') desde checkinsApi.submit
  Si no hay check-in pendiente hoy: skippable, se salta solo a los 2.5s (el target nunca se registra)
  ↓
Home: paso 1 -- spotlight sobre la tarjeta "Tu entrenamiento de hoy" (home-today-workout-card)
  Qué ve: hueco tocable + tooltip "Toca esta tarjeta para abrir el entrenamiento que te toca hoy"
  Acción requerida: tocar la tarjeta real
  Condición para continuar: navegación real a MigratedWorkoutPreview
  Si abandona: reto queda "activo en memoria", invisible fuera de Home; al volver a Home, el checklist lo sigue marcando pendiente, puede re-tocarlo
  ↓ completion: navigate MigratedWorkoutPreview → avanza Y ENCADENA a 'log-first-set'
WorkoutPreview: si el readiness de hoy está pendiente → ReadinessForm se muestra ENTERA en vez del preview
  Paso "Cómo llegas hoy" — SIN targetId (banner flotante, pantalla interactiva completa)
  Qué ve: banner abajo con el texto, sin oscurecer nada
  Acción requerida: responder las 4 preguntas y pulsar "CONTINUAR AL ENTRENAMIENTO"
  Condición: reportAction('readiness_submitted') desde el onSubmit real (o automático si el readiness ya no hacía falta)
  Datos guardados: readinessApi.submit (backend real)
  ↓
WorkoutPreview: spotlight sobre "INICIAR ENTRENAMIENTO" (workout-preview-start-button)
  Condición: navigate MigratedWorkoutSession
  ↓
WorkoutSession: spotlight secuencial sobre reps → carga → rir → descanso → rpe
  (cada uno SOLO en la fila 0 del ejercicio 0 del bloque 0; skippable si esa métrica no existe en este entrenamiento)
  Condición de cada uno: onFocus del campo real (reportAction('metric_focus_<key>'))
  ↓
WorkoutSession: spotlight sobre el círculo de completar la primera serie (workout-session-first-set-toggle)
  Condición: reportAction('workout_set_logged') al marcar la serie real
  ↓
WorkoutSession: spotlight sobre "FINALIZAR ENTRENAMIENTO" (workout-session-finish-button, sticky, siempre visible)
  Condición: navigate MigratedWorkoutFeedback
  Nota: si el usuario no marcó NINGUNA serie, onFinish muestra un modal de confirmación en vez de navegar directo — no debería ocurrir en el flujo guiado normal porque el paso anterior ya exige marcar una
  ↓
Reto 'log-first-set' → doneIds. Checklist de Home refleja "Accede a tu entrenamiento" como completado.
```

### `add-habit`

```
Home: checklist "Añade un nuevo hábito"
  ↓ startChallenge('add-habit')
Home: spotlight sobre el enlace "Hábitos" (home-habits-link, CON scrollRef ya aplicado)
  Condición: navigate ['MigratedHabits', 'MigratedHabitAdd'] (acepta cualquiera de las dos rutas)
  ↓
HabitsList (si había hábitos): spotlight sobre el botón "+" (habits-add-button, skippable)
  Si aterrizó ya en HabitAdd directamente (sin hábitos previos), este paso se salta solo — el botón no existe en esa pantalla
  Condición: navigate MigratedHabitAdd
  ↓
HabitAdd: banner "Elige o crea tu hábito" (sin targetId)
  Condición: reportAction('habit_added') desde habitsApi.adopt (dos puntos de llamada: elegir de biblioteca o crear propio)
  ↓
Reto → doneIds.
```

### `mark-habit-done`

```
Home → home-habits-link (mismo bridge que add-habit, ahora con scrollRef) → HabitsList
  ↓
HabitsList: spotlight sobre el círculo del primer hábito (habit-toggle-first)
  Condición: reportAction('habit_marked_done') desde habitsApi.logHabit
  ↓
Reto → doneIds.
```

### `access-nutrition-plan` → `mark-meal-done`

```
Home: spotlight sobre "Añadir comidas" (home-nutrition-link, YA tiene scrollRef — ver bug #8, no reproducido en código)
  Condición: navigate MigratedPlan → encadena a mark-meal-done
  ↓
PlanScreen: spotlight sobre el círculo de la primera comida (plan-meal-toggle-first, YA tiene scrollRef desde una corrección anterior)
  Condición: reportAction('meal_marked_done')
  ↓
Reto → doneIds.
```

---

## 16. Plan de solución

### P0 — Bloqueantes (ya resueltos en esta sesión, dejar como referencia)

- **P0-1**: Paso de readiness bloqueaba su formulario — **HECHO**, commit `e54ee5e`.
- **P0-2**: `home-habits-link` sin `scrollRef` — **HECHO**, commit `6955f2a`.

### P0 — Implementadas (2026-08-29, tras "Procede")

- **P0-3**: Fusionar `complete-checkin` con `access-workout` (bug #7, pedido explícito del usuario). **HECHO.**
  - Solución aplicada: se eliminó el reto suelto `complete-checkin`; su único paso (mismo `targetId: 'home-checkin-card'`, mismo `completion`/`skippable`) pasa a ser el PRIMER paso de `access-workout`, antes del paso "Tu entrenamiento de hoy". Decisión tomada (la opción que más fielmente cumple "esa parte debe hacerse en el reto de acceder al primer entrenamiento", tal cual lo pidió el usuario, no la de eliminarlo del catálogo).
  - Archivos: `constants/tutorialChallenges.ts`.
  - Cómo comprobar: el checklist de Home ya no muestra "Rellena tu check-in de preparación" como fila independiente; al iniciar "Accede a tu entrenamiento de hoy" con un check-in pendiente, el primer spotlight es el del check-in (se salta solo a los 2.5s si no hay ninguno pendiente).

- **P0-4**: Aislar `doneIds` por usuario (bug #3). **HECHO.**
  - Solución aplicada: `logout()` (`store/AuthContext.tsx`) añade `'@bestronger_tutorial_done_challenges'` a su `AsyncStorage.removeMany([...])` existente. `TutorialContext.tsx` consume `useAuth()` directamente (es seguro: `TutorialProvider` vive DENTRO de `AuthProvider` en `App.tsx`, sin ciclo de imports ya que `AuthContext` no importa nada de `TutorialContext`) y recarga `doneIds` desde AsyncStorage (resetea `activeChallengeId`/`activeStepIndex` de paso) cada vez que cambia `state.user?.id`, distinguiendo la carga inicial de montaje (que no debe disparar este reseteo) de un cambio real de sesión.
  - Archivos: `store/AuthContext.tsx`, `store/TutorialContext.tsx`.
  - Cómo comprobar: login con cuenta A, completar un reto, logout, login con cuenta B en el mismo dispositivo (misma sesión de app, sin reiniciarla) → el checklist de B no debe mostrar ningún reto como completado.

### P1 — Importantes

- **P1-1**: Bug #8 (`access-nutrition-plan`) — **NO implementado a propósito.** Sigue sin reproducirse en código (home-nutrition-link ya tiene `scrollRef`); la auditoría original ya marcaba esto como "investigar/confirmar en dispositivo real antes de tocar el mecanismo de scroll", y cambiar el timing de `TutorialTarget.tsx` (usado por los 8+ targets existentes) sin poder verificarlo interactivamente es más riesgo que beneficio sin esa confirmación previa. Queda pendiente de reproducir.
- **P1-2**: Corregir `exIdx` en `workout-session-first-set-toggle` (bug #4). **HECHO.** Archivo: `pages/migrated/workout_session_screen.tsx` (condición del target, ahora exige `blockIdx === 0 && exIdx === 0 && rowIdx === 0`, igual que la de métricas).
- **P1-3**: Loguear el error de `JSON.parse` corrupto (bug #6) con `logger.error`, mismo patrón que el resto de la app. **HECHO**, mismo commit que P0-4 (`store/TutorialContext.tsx`).

### P2 — Mejoras (implementadas 2026-08-29, tras "Continúa con las siguientes fases")

- **P2-1**: Botón "Reiniciar tutorial" en el menú de Ajustes (Home v2), llama a `resetAll()` (ya existía, solo faltaba la UI) — pedido ya documentado en `docs/TAREAS.md:200`. **HECHO.**
- **P2-2**: `StartupChecklist.tsx` sí permitía re-tocar retos ya `done` (confirmado, `startChallenge` nunca comprobaba `isDone`) — se deshabilita el tap en filas completadas. **HECHO.**
- **P2-3**: `Dimensions.get('window')` sustituido por `useWindowDimensions()` en `TutorialOverlay.tsx`. **HECHO.**
- **P2-4**: `accessibilityLabel`/`accessibilityRole` añadidos al botón "Saltar tutorial" y al tooltip/banner del coach-mark (el hueco tocable en sí no lleva ninguno — es espacio vacío sin componente propio al que anclarlo, el contenido real ya lo anuncia el tooltip). **HECHO.**

### P3 — Futuro

- **P3-1**: Ampliar el catálogo con los "13 retos descubre más" ya mencionados en `docs/TAREAS.md:200` (fuera del alcance de esta auditoría, es contenido nuevo, no un bug).
- **P3-2**: Si el producto quiere sincronizar el progreso de tutorial entre dispositivos del mismo usuario, se necesitaría un endpoint de backend nuevo — no existe hoy y no es una carencia, es una decisión de producto no tomada todavía.

---

## 17. Plan de testing

**Functional**: recorrer los 7 retos de principio a fin en dispositivo real (no en el simulador, dado que el bug #1 y #2 solo eran visibles con contenido real desplazado), confirmando que cada paso muestra su spotlight/banner correcto y avanza SOLO tras la acción real.

**Regression**: tras aplicar P0-3/P0-4/P1-2, repetir el recorrido completo de `log-first-set` (el más largo) y `add-habit`/`mark-habit-done` (los que comparten bridge) para confirmar que no se rompió el encadenamiento.

**Navigation**: probar "atrás" físico/gesto en mitad de cada reto, confirmar que el overlay desaparece sin dejar el spotlight fantasma sobre una pantalla equivocada.

**Persistence**: completar un reto, matar la app (no solo backgroundear), reabrir, confirmar que sigue marcado `done`. Tras P0-4: login/logout con dos cuentas distintas en el mismo dispositivo, confirmar aislamiento.

**Offline**: desconectar red durante el paso de readiness/check-in/marcar hábito, confirmar que se muestra el toast de error existente de cada pantalla y el paso NO avanza; reconectar y reintentar, confirmar que sí avanza.

**Error de API**: forzar una respuesta 4xx/5xx en `readinessApi.submit`/`checkinsApi.submit`/`habitsApi.logHabit` (mock o backend de pruebas) y confirmar el mismo comportamiento que offline.

**Device testing**: iPhone pequeño (SE) y grande (Pro Max), un Android gama media — confirmar que el tooltip no se corta ni se sale de pantalla, y que el auto-scroll de `home-habits-link`/`home-nutrition-link` realmente centra el elemento en pantallas con menos alto visible.

**UX testing**: sesión con un usuario real que nunca haya visto la app, sin más instrucción que "usa el tutorial" — confirmar que completa los 7 retos sin pedir ayuda externa.

---

## 18. Checklist final por reto

Aplicable a los 7 (marcar por reto al verificar en dispositivo tras aplicar P0/P1):

```
[ ] Reto aparece en el checklist de Home (o correctamente oculto si es `hidden`)
[ ] Tutorial inicial (spotlight/banner) aparece sin necesitar scroll manual
[ ] Todos los pasos son accesibles (ningún target queda fuera de vista)
[ ] Ningún paso bloquea el toque a un elemento que el usuario necesita usar antes de completar el paso
[ ] Progreso avanza SOLO con la acción real (no con un tap directo sobre el hueco)
[ ] Estado persistente tras cerrar/reabrir la app
[ ] Estado aislado por usuario (tras P0-4)
[ ] Back físico/gesto no deja el overlay en un estado fantasma
[ ] Cierre de app en mitad del reto no corrompe doneIds
[ ] Reanudación (re-tocar el reto desde el checklist) funciona igual que la primera vez
[ ] Error de API en la acción real controlado (toast, no avanza, se puede reintentar)
[ ] Offline controlado igual que error de API
[ ] Finalización marca `doneIds` correctamente
[ ] Encadenamiento (`nextChallengeId`) dispara el siguiente reto sin volver al checklist
[ ] UI consistente con el resto de la app (confirmado, sin cambios de design system)
[ ] Responsive en pantallas pequeñas y grandes
[ ] Sin errores de consola/logger durante el recorrido completo
```

---

## Mejoras futuras (fuera de P0-P3, solo ideas)

- Botón "saltar SOLO este paso" además de "saltar el reto completo", si el producto detecta que los usuarios abandonan el reto entero por un único paso confuso.
- Analítica de en qué paso concreto abandonan más usuarios cada reto (hoy no hay ningún tracking de abandono, solo de completado vía `doneIds`).
