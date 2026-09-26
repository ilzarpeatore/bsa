# BeFit (bsa) — notas para Claude Code

## Lanzar un build de IPA

Antes de disparar `.github/workflows/ios-build.yml` (`workflow_dispatch`), leer **`docs/BUILD_IPA.md`**.

Resumen crítico: los inputs por defecto del workflow (`ios_path: "."`, `configuration: "Debug"`) **NO** sirven para un IPA que alguien vaya a instalar y abrir en un dispositivo real — hay que pasar explícitamente `ios_path: "ios"` y `configuration: "Release"`. Con `Debug`, el job de GitHub Actions termina en verde (`conclusion: success`) pero el `.ipa` resultante no lleva el bundle de JS embebido (`SKIP_BUNDLING=1`), y la app crashea al abrir con "No script URL provided" — el workflow no detecta este fallo, solo se ve al abrir la app real. Detalle completo y por qué en `docs/BUILD_IPA.md`.

Herramientas de desarrollo (Screen Explorer, `DEV_TOOLS_ENABLED`): las decide cada build con el input `dev_tools` (default `false`) de `ios-build.yml`/`android-build.yml` — `true` solo para builds internos/QA, nunca en builds de tienda. Ya no se cambia `constants/featureFlags.ts` a mano (2026-09-24).

## Lanzar un build de Android (APK/AAB)

Antes de disparar `.github/workflows/android-build.yml` (`workflow_dispatch`), leer **`docs/BUILD_AAB.md`** — workflow nuevo (2026-08-28), sin ninguna ejecución real todavía verificada. Para Play Console hace falta `build_format: "aab"` + `use_signing: true` con los 4 secrets de keystore configurados (`ANDROID_KEYSTORE_BASE64` y compañía, ver el doc) — sin `use_signing`, el build queda firmado con la keystore de debug y Play Console lo rechaza. Detalle completo, cómo generar la keystore, y por qué el workflow verifica en vez de asumir el nombre de propiedad de Gradle, en `docs/BUILD_AAB.md`.

## Panel de Tareas del admin — sincronización con `docs/ROADMAP.md`

El admin panel (`bstronger-admin`, ruta `/tasks`, pestaña "Desarrollo") muestra una copia sincronizada de la sección "Pendiente real, priorizado" de este `docs/ROADMAP.md`. **Convención (2026-09-16): cada vez que edites esa sección de `docs/ROADMAP.md`** (añadas, resuelvas o cambies un item), sincroniza también el admin panel llamando a:

```
POST https://testapp.bestronger.es/api/admin/task-sync
Authorization: Bearer <TASKS_SYNC_TOKEN>
Content-Type: application/json

{
  "source_repo": "bsa",
  "items": [
    { "source_key": "0a", "title": "...", "description": "...", "status": "pending|in_progress|completed", "source_url": "https://github.com/ilzarpeatore/bsa/blob/master/docs/ROADMAP.md" }
  ]
}
```

El payload debe ser la lista **completa** de items pendientes de `bsa` en ese momento (no solo el que cambió) — el endpoint hace upsert por `source_key` y **cierra automáticamente** (`status: completed`) cualquier tarea `dev` que ya no venga en el payload (resuelta en el roadmap). Backend: `Bckbs::TaskController::sync()` (PR #20). Frontend: `bstronger-admin::TasksView.tsx` (PR #18).

**Credencial**: token Sanctum con ability `tasks:sync`, guardado localmente en `TASKS_SYNC_TOKEN.txt` en la raíz de este repo (gitignored, variable `TASKS_SYNC_TOKEN=<token>`) — no está en git ni en ningún secret de GitHub, solo en el filesystem local del usuario. Si el archivo no existe: pide al usuario que te confirme si ya existe uno, o genera uno nuevo por SSH al VPS (`bestronger-vps`) con —

```
php artisan tinker --execute="App\Models\User::where('user_type','admin')->first()->createToken('claude-tasks-sync', ['tasks:sync'])->plainTextToken"
```

— y pídele **a él** que lo guarde en ese archivo: el clasificador de auto-mode de Claude Code bloquea que Claude escriba o materialice credenciales directamente (visto en vivo el 2026-09-16), así que no lo intentes tú mismo, solo genera el token y pásaselo en texto para que lo guarde.

## Despliegue manual al VPS (backend y panel) — lo aprendido el 2026-09-27

GitHub Actions está bloqueado por facturación en los repos privados (`Bckbs`, `bstronger-admin`), así que se despliega a mano por SSH (`bestronger-vps`, ver también la memoria del proyecto). **Antes de nada, comprobar la rama local**: los clones locales de `Bckbs` y `bstronger-admin` suelen estar en una rama de trabajo, no en `main` (un `git push origin HEAD` creó por error una rama remota). Los repos son `main`.

- **Backend** (`/var/www/testapp`): `git pull --ff-only` → `chown -R www-data:www-data app database routes` → `sudo -u www-data php artisan migrate --force` → `sudo -u www-data php artisan route:cache` (las rutas están cacheadas: sin esto los endpoints nuevos dan 404) → `systemctl reload php8.3-fpm`. Verificar con una petición real dentro de una transacción con rollback.
- **Panel** (`/var/www/testapp/admin`, repo propio): copia `cp -a dist dist.bak.$(date +%Y%m%d%H%M%S)` → `git pull --ff-only` → `npm run build` **como root** (`node_modules/.vite-temp` es de root y con `www-data` falla con `EACCES`) → `chown -R www-data:www-data dist`. Un build que falla deja el `dist` viejo: comprobar la fecha de `dist/index.html` y que el sitio público sirve el `index-*.js` nuevo.
- **`tinker` en producción**: `sudo -u www-data env HOME=/tmp php artisan tinker --execute="..."` (sin `HOME=/tmp` `psysh` falla al escribir en `/var/www/.config`). No ejecutar `artisan` como root sin `chown` posterior (ver «Root-owned cache»).
- **Scripts largos**: el shell se come las barras invertidas de heredocs y `python -c`; escribirlos con el `Write` y ejecutarlos.
