# Contexto del proyecto — orientación para retomar el trabajo

Documento de arranque para una sesión nueva (otra cuenta, otro Claude). No repite el historial detallado — eso ya vive en `docs/TAREAS.md` — esto es el mapa para orientarse rápido y no repetir descubrimientos ya hechos.

## Qué es esto

App de coaching fitness real (BeStronger/BeFit), con coaches reales gestionando clientes reales desde un panel admin. Son **3 proyectos separados**:

1. **Esta app** (React Native + Expo + TypeScript) — repo GitHub `ilzarpeatore/befit-react-app`, **renombrado a `ilzarpeatore/bsa`** (git push/API redirige automáticamente; ambos nombres pueden aparecer en URLs/mensajes antiguos, es el mismo repo).
2. **Backend Laravel** (`fitness-backend`) — vive en el VPS de producción (`testapp.bestronger.es`) y en una copia local en la máquina Windows del usuario (`C:/laragon/www/fitness-backend`). **No es un repo de GitHub alcanzable desde una sesión cloud** salvo que se conecte explícitamente.
3. **Panel admin** (Next.js/Vite) — en el VPS, `/var/www/testapp/admin`. Tampoco alcanzable desde una sesión cloud salvo conexión explícita.

**Si tu sesión no tiene acceso a los repos 2 y 3, no puedes implementar backend/admin — solo documentar el contrato exacto que necesita quien lo haga.** Ver `docs/PENDIENTE_BACKEND_ADMIN.md` para el punch-list actual, y seguir ese mismo patrón (endpoint esperado, payload JSON, esquema SQL sugerido) para cualquier cosa nueva que descubras pendiente.

## Documentación ya existente — leer esto antes de investigar por tu cuenta

- **`docs/TAREAS.md`** — el documento canónico. Historial fechado de _todo_ lo hecho (✅) y pendiente (🔲/⚠️), con causa raíz de cada bug real encontrado. Es largo (~2000 líneas) — no lo leas entero de una vez, usa grep por palabra clave o por fecha, o `graft ask`.
- **`docs/PENDIENTE_BACKEND_ADMIN.md`** — punch-list consolidado de todo lo que falta en backend/admin, ya extraído y priorizado de TAREAS.md.
- **`docs/ONBOARDING_V2.md`** — contrato completo del onboarding de 4 etapas (datos personales/PAR-Q/entrenamiento/nutrición): preguntas, payloads JSON, esquema SQL sugerido para las 3 tablas pendientes.
- **`docs/DEAD_SCREENS.md`** / **`docs/PANTALLAS.md`** — inventario de pantallas vivas/muertas. Son snapshots **congelados a propósito** (no editar las listas core) — se añaden notas "Excepción (fecha)" encima cuando algo cambia después del snapshot.
- **`graft/`** — índice de código navegable de todo el repo. Antes de grepear a mano, prueba `graft ask "<lo que necesitas>" --source`, `graft grep "<literal>"`, `graft skeleton <archivo>` o `graft callers <símbolo>` — es mucho más barato en tokens.

## Arquitectura de esta app

- **Theme**: `pages/migrated/theme.ts` — paleta monocromática estilo Bevel (`C` = claro, `C_DARK` = oscuro), fondo gris claro `#EBEBF0` + superficies blancas `#FFFFFF`. Casi todas las pantallas importan `C` como objeto estático; **solo Home v2** usa el hook dinámico `useAppColorMode()` (`helper/useAppColorMode.ts`) para modo oscuro real. `theme.ts` tiene 62 errores de `tsc` conocidos y no bloqueantes (mismatch de tipos literales entre `C`/`C_DARK`, causa documentada en el propio archivo) — cualquier error de typecheck _fuera_ de `theme.ts` es real.
- **Navegación**: `App.tsx` — `RootNavigator` (auth → onboarding v2 → main), `MigratedNavigator` contiene ~200 pantallas en `pages/migrated/`. 4 pestañas reales con barra flotante (`components/NavigationTab.tsx`): Home, Plan diario, Nutrición, Hábitos — **solo esas 4 rutas** (`MigratedHomeModernV2`/`MigratedMyProgramCalendar`/`MigratedPlan`/`MigratedHabits`) muestran la barra; cualquier otra pantalla está apilada, sin barra.
- **Overlays globales**, montados como hermanos del `NavigationContainer` en `App.tsx` (mismo patrón para cualquier UI que deba verse en toda la app): `ScreenReviewFab` (herramienta temporal de QA, backend real), `ScreenExplorerFab` (acceso dev a `pages/ScreenExplorer.tsx`), `WorkoutMinimizedBar`, `TutorialOverlay`.
- **Tutorial guiado**: `store/TutorialContext.tsx` + `constants/tutorialChallenges.ts` + `components/tutorial/*`. Checklist de retos con spotlight sobre elementos reales de la UI, se completa con acciones reales (nunca un botón "Siguiente"). Progreso persistido **solo en AsyncStorage local** (no hay backend todavía — ver pendientes).
- **Onboarding v2**: pantalla única `pages/migrated/onboarding_v2/onboarding_v2_screen.tsx` recorre `constants/onboardingV2Questions.ts` (36 preguntas, 4 etapas) con índice interno. `api/onboardingV2.ts` tiene los payloads ya tipados; 3 de los 4 endpoints todavía no existen en el backend (ver `docs/ONBOARDING_V2.md`).
- **Auth**: `store/AuthContext.tsx` — `onboarding_completed` ahora prioriza un campo server-side (`UserData.onboarding_completed`) sobre un flag local de `AsyncStorage`, con fallback mientras el backend no lo mande.

## Gotchas de código ya descubiertos (no los redescubras)

- **`StyleSheet.absoluteFillObject` no existe en los tipos de RN de este proyecto** — usar el objeto explícito `{position:'absolute', top:0, left:0, right:0, bottom:0}`.
- **`@components/ui/text`'s `Text`** siempre aplica su propio `size`/`weight` por className salvo que se pase explícito — un `<Text style={{color:...}}>` anidado NO hereda correctamente `fontSize`/`fontFamily` del padre vía herencia de RN, porque el estilo propio del componente gana. Hay que repetir `fontSize`/`lineHeight`/`fontFamily` explícitos.
- **`@components/ui/textarea`** no tiene fondo en modo claro por defecto (solo `dark:bg-input/30`) — añadir `backgroundColor: C.surface` a mano si se necesita.
- **`GlassView` (expo-glass-effect)** no aplica su propio `borderRadius` de forma fiable (falla por timing en el módulo nativo). Patrón establecido: separar un contenedor "Root" que lleve el borde, de un wrapper interno `overflow:'hidden'` sin borde propio que solo contenga el `GlassView` — ver `components/ui/fab/index.tsx` como referencia.
- **RN `<Modal>`** se presenta en una ventana nativa separada — `pointerEvents="box-none"` no basta para dejar pasar toques a la pantalla de debajo. Para overlays globales que deben ser semi-transparentes y tocables, usar una `<View>` absoluta normal montada en `App.tsx` (mismo patrón que `WorkoutMinimizedBar`/`TutorialOverlay`), nunca `Modal`.
- **Gilroy Bold/ExtraBold sin `lineHeight` explícito se recorta en iOS** — patrón recurrente de bug de texto/emoji cortado.
- **El wrapper `apiClient.get()`**: `res.data?.data` a veces da `undefined` — usar `res.data?.data || res.data || []`.
- **`Select` controlado en el admin (Next.js/Base UI)**: el valor inicial debe ser siempre string (`''`), nunca `undefined`, o el componente se rompe al primer cambio.

## Build de IPA (CI)

Workflow `.github/workflows/ios-build.yml`, disparo manual (`workflow_dispatch`) vía GitHub Actions.

- **Pasa siempre `ios_path: "ios"` explícito.** El proyecto nativo vive en `ios/` (no en la raíz), pero el default del input es `"."` — sin pasarlo, `xcodebuild` no encuentra el workspace/scheme y el build falla en ~5 segundos con "no contiene un proyecto Xcode" (error real que cometí y corregí en esta sesión).
- **`use_signing: false` siempre** — decisión deliberada del proyecto: no hay cuenta de pago Apple Developer Program, así que CI nunca firma. El usuario firma el IPA localmente con MobAI/iloader usando un Apple ID personal/gratuito — por eso los perfiles de aprovisionamiento gratuitos expiran cada 7 días y hay que volver a firmar periódicamente. Esto **no es un bug**, no lo "arregles" activando `use_signing`.
- `configuration: "Release"` es lo habitual para builds reales.
- Convención de `build_id`: algo descriptivo, ej. `ipa-master-<sha-corto>-release` o `-retry`.
- Un build sano tarda ~15-20 min. Si termina en segundos con fallo, casi seguro es un problema de configuración del propio disparo (como el de `ios_path`), no del código — revisa el log del step "Build IPA" antes de asumir que el código está roto.

## Convenciones de trabajo establecidas en esta sesión

- Rama de trabajo larga: `claude/setup-screen-navigator-dxvcj1`. Se mergea a `master` **solo cuando el usuario lo pide explícitamente** ("mergee a master") — nunca por iniciativa propia. Lo mismo para lanzar builds de IPA.
- Tras cualquier cambio: `npx eslint <archivo>` (rápido) + `npx tsc --noEmit -p .` completo en background (lento, 10-20 min). **Nunca lanzar dos typechecks a la vez** — el proyecto es grande y satura memoria (ha causado OOM-kills en esta sesión). Esperar a que termine uno antes de lanzar el siguiente.
- Cualquier bug real encontrado y corregido, o feature pendiente de backend, se documenta en `docs/TAREAS.md` con fecha y el patrón ya establecido (título con ✅/🔲/⚠️, causa raíz, qué se hizo, qué queda pendiente). No hace falta preguntar si documentar — es la convención ya asumida en todo el historial.
- Commits en español, descriptivos, explicando la causa raíz cuando aplica (no solo "qué" cambió).
- El pre-commit hook corre `eslint --fix`/`prettier` automáticamente sobre los archivos staged — normal ver reformateos menores tras cada commit.

## Estado ahora mismo

- `master` está al día con todo el trabajo de esta sesión (último merge: fix de tipos en `AuthContext.tsx`/`api/auth.ts`).
- Último build de IPA verificado con éxito: run #44 (`ipa-master-d0cd3af-retry`), sin firmar, listo para firmar localmente.
- Pendiente real de backend/admin: ver `docs/PENDIENTE_BACKEND_ADMIN.md` completo. Lo más urgente ahí mismo: los 3 endpoints del onboarding (PAR-Q/entrenamiento/nutrición) + marcar `onboarding_completed` server-side + el workout demo auto-asignado a usuarios nuevos.
