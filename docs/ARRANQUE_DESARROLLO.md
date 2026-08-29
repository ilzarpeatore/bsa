# Cómo arrancar BeFit para desarrollo (PC + Samsung)

Checklist para dejar todo funcionando cada vez que se enciende el ordenador.

**Para Claude Code**: si el usuario pide "arranca todo" / "levanta el entorno" / "arranca la app desde cero", este documento tiene todos los comandos exactos para hacerlo sin tener que redescubrir rutas, puertos ni binarios. Ejecuta los pasos 1-5 siempre (son el mínimo para probar la app móvil); los pasos 6 (admin panel) y 7 (MobAI) solo si el usuario los pide explícitamente o si va a necesitar controlar el móvil/el panel web. Usa Bash con `run_in_background: true` para los procesos que quedan corriendo (backend, Metro, admin panel), y verifica cada uno con el comando de chequeo indicado antes de pasar al siguiente paso. No asumas que algo quedó bien solo porque el comando no dio error — comprueba con curl/adb como se indica. Presta atención a la ruta correcta en cada `cd`: cada paso indica la ruta del proyecto donde debe correr ese comando.

## Contexto del proyecto (leer antes de trabajar en tareas nuevas)

**Para Claude Code**: antes de asumir arquitectura o estado del proyecto por tu cuenta, consulta estas fuentes — evitan re-investigar desde cero algo que ya está documentado:

- **[Esquema de arquitectura — BeFit App](https://claude.ai/code/artifact/0d4b2bbf-b3bb-4c16-8ff0-53dbd8831ecf)** (artifact) — mapa visual de las 4 láminas del proyecto: Nutrición, Entrenamiento, Niveles de acceso (Full access / Free / Paquetes de pago), y Recursos. Incluye diagramas de flujo, qué está construido vs. qué es brecha (`gap`), bugs reales encontrados y corregidos, y una sección final de "Decisiones abiertas" con las preguntas de producto/arquitectura pendientes. Es el resumen ejecutivo más alto nivel — empezar por aquí para entender el estado general antes de entrar en detalle.
- **`docs/TAREAS.md`** — historial detallado de trabajo de conexión backend/app: qué se completó (con el motivo, archivos y endpoints exactos) y qué queda pendiente por prioridad. Tiene el detalle de implementación que el artifact no cubre (nombres de archivo, líneas de código, bugs concretos). Consultar antes de retomar cualquier tarea de la sección "Pendientes".
- **`docs/backend-app-analysis.md`** — análisis técnico del backend + app: diagrama entidad-relación completo (ERD, ~150 tablas), diagrama de arquitectura cliente-servidor, diagramas de flujo de datos por feature, y un gap analysis de qué está conectado de punta a punta vs. admin-only/backend-only vs. no conectado en absoluto.
- **`docs/PANTALLAS.md`** — catálogo de las 173 pantallas de la app: archivo real, nombre de ruta en `App.tsx`, título visible, APIs que consume hoy, y el controlador Laravel correspondiente (o el endpoint sugerido si aún no está conectada). Consultar antes de tocar o navegar hacia cualquier pantalla para saber su estado real de conexión.

## Rutas de los proyectos

| Proyecto | Ruta | Rol |
|---|---|---|
| App React Native (Expo) — la actual | `C:\Users\hamza\Desktop\PROYECTOS\APP\BeFit react\React App` | App móvil en desarrollo activo |
| Backend Laravel | `C:\Users\hamza\Desktop\PROYECTOS\APP\mightyfitness\fitness-backend` | API que consumen la app React y el admin panel |
| Admin panel (Vite + React) | `C:\Users\hamza\Desktop\PROYECTOS\APP\Next.js admin panel` | Panel de administración web (pese al nombre de la carpeta, es Vite, no Next.js) |
| App Flutter — legacy | `C:\Users\hamza\Desktop\PROYECTOS\APP\mightyfitness\mightyfitness_flutter` | Versión anterior de la app, ya no se desarrolla; solo se consulta como referencia de comportamiento/contrato de API (ver `PANTALLAS WORKOUT.md`) |
| PHP de Laragon | `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe` | No está en el PATH del sistema — hay que usar la ruta completa |

## 1. Arrancar Laragon

Abre Laragon y pulsa **Start All** (Apache + MySQL). El backend de la app corre con `php artisan serve`, no directamente con el Apache de Laragon, pero MySQL sí lo necesita (la base de datos vive ahí) y usamos el PHP que trae Laragon.

## 2. Arrancar el backend (Laravel)

Ruta: `C:\Users\hamza\Desktop\PROYECTOS\APP\mightyfitness\fitness-backend`

```powershell
C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan serve --host=0.0.0.0 --port=8000
```

- `--host=0.0.0.0` es obligatorio: sin esto el servidor solo acepta conexiones locales y el teléfono no puede llegar.
- Dejar corriendo en segundo plano mientras se use la app. Si se cierra, el backend se cae y la app deja de recibir datos.
- Si `php` da "command not found" al usarlo sin ruta completa, es porque no está en el PATH del sistema.
- Si aparece el error **"Please provide a valid cache path"**, falta la carpeta `storage/framework` (se ignora en git). Crearla con:
  ```powershell
  mkdir storage\framework\cache\data, storage\framework\sessions, storage\framework\testing, storage\framework\views
  ```

**Verificación:**
```bash
curl -s -m 5 -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8000/api/get-appsetting
```
Debe devolver `HTTP 200`.

## 3. Arrancar Metro (el bundler de la app React)

Ruta: `C:\Users\hamza\Desktop\PROYECTOS\APP\BeFit react\React App`

```powershell
npm start
```

Dejar corriendo en segundo plano. Esperar a que aparezca `Starting Metro Bundler`.

**Verificación** (repetir cada pocos segundos hasta que responda, puede tardar unos segundos en arrancar):
```bash
curl -s -m 5 http://127.0.0.1:8081/status
```
Debe responder `packager-status:running`. Si no responde nada (se queda colgado sin dar timeout ni respuesta), el proceso quedó zombie de una sesión anterior — matar el proceso que ocupa el puerto 8081 y volver a correr `npm start`.

## 4. Conectar el Samsung por USB

1. Cable USB conectado, depuración USB activada en el teléfono.
2. Verificar que lo detecta:
   ```bash
   adb devices
   ```
3. **Paso crítico — configurar los túneles USB** (sin esto la app no puede descargar el bundle de Metro ni llegar a la API):
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:8000 tcp:8000
   ```
   Hay que repetir esto cada vez que se reconecta el cable o se reinicia `adb`/el teléfono — no es permanente. Verificar con `adb reverse --list` (debe mostrar ambos).

## 5. Abrir la app

La app ya está instalada en el teléfono (build de debug/dev-client). Abrirla directamente, o forzar un reinicio limpio del proceso si ya estaba abierta desde antes:

```bash
adb shell am force-stop com.pfndesign.bestronger
adb shell monkey -p com.pfndesign.bestronger -c android.intent.category.LAUNCHER 1
```

Debería conectar sola a Metro y cargar los datos reales del backend. Confirmar viendo el log:
```bash
timeout 30 adb logcat -v time | grep --line-buffered -iE "ReactNativeJS|AxiosError|Unable to load"
```
Debe aparecer `Running "main"` sin ningún `AxiosError` ni `Unable to load script`.

## 6. Arrancar el admin panel (Vite + React)

Ruta: `C:\Users\hamza\Desktop\PROYECTOS\APP\Next.js admin panel`

```powershell
npm run dev
```

Sirve en `http://localhost:5173` (puerto por defecto de Vite). Ya tiene su propio `.env` apuntando a `http://localhost:8000/api` (el mismo backend del paso 2) — no necesita `adb reverse` ni configuración de IP porque corre en el navegador del propio PC, no en el teléfono.

**Verificación:**
```bash
curl -s -m 5 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5173
```
Debe devolver `HTTP 200`.

## 7. Verificar MobAI (control de dispositivo desde Claude Code)

MobAI es la app de escritorio (`C:\Program Files\MobAI\MobAI.exe`) que expone el servidor MCP que usa Claude Code para controlar el Samsung (skill `controlling-mobile-devices`). No se arranca por terminal como los demás procesos — es una app normal de Windows que debe estar abierta. Normalmente ya está corriendo en segundo plano; solo hay que comprobarlo, no relanzarlo salvo que falte.

**Verificación:**
```bash
tasklist | grep -i mobai
```
Debe aparecer `MobAI.exe`. Si no aparece, abrir la app manualmente desde el menú de inicio o ejecutando `C:\Program Files\MobAI\MobAI.exe`.

También se puede confirmar que el servidor MCP está conectado con:
```bash
claude mcp list
```
Debe mostrar `mobai: http://127.0.0.1:8686/mcp (HTTP) - ✔ Connected`.

## Resumen rápido (orden de arranque)

1. Laragon → Start All
2. `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan serve --host=0.0.0.0 --port=8000` (en `fitness-backend`, background)
3. `npm start` (en `React App`, background)
4. `adb reverse tcp:8081 tcp:8081` y `adb reverse tcp:8000 tcp:8000`
5. Abrir/relanzar la app en el Samsung
6. `npm run dev` (en `Next.js admin panel`, background) — solo si se va a trabajar en el panel web
7. Comprobar que `MobAI.exe` está corriendo (normalmente ya lo está) — solo si se va a controlar el móvil desde Claude Code

## Si algo no carga — checklist de diagnóstico

| Síntoma | Causa probable | Cómo confirmarlo |
|---|---|---|
| `AxiosError: Network Error` en los logs | Backend caído o `adb reverse` no configurado | `curl http://127.0.0.1:8000/api/get-appsetting` debe devolver JSON; `adb reverse --list` debe mostrar los dos túneles |
| App se queda en blanco, sin errores en el log | Metro colgado sirviendo un bundle viejo/zombie | `curl http://127.0.0.1:8081/status` — si no responde, matar el proceso y relanzar `npm start` |
| Cambios de código no se reflejan nunca en el teléfono | La app instalada es un build de *release*, no dev-client | `adb shell run-as com.pfndesign.bestronger id` — si dice "not debuggable", hay que reinstalar con `npm run android` (recompila y reinstala; tarda varios minutos) |
| Build de `npm run android` falla con error de CMake/Gradle sobre una ruta que ya no existe (ej. una carpeta con nombre antiguo del proyecto) | Cachés de compilación con rutas absolutas viejas | Borrar `android/.gradle`, `android/app/.cxx`, `android/app/build`, `android/build` y reintentar (fuerza recompilación completa, tarda varios minutos) |
| Admin panel no conecta a la API | Backend caído | Mismo chequeo que arriba: `curl http://127.0.0.1:8000/api/get-appsetting` |
| El PC recibió una IP nueva al reiniciar | No debería afectar (ver nota abajo) | — |

## Notas

- La API de la app React (`api/client.ts`) usa `http://localhost:8000/api` en modo desarrollo, tunelizado vía `adb reverse tcp:8000 tcp:8000` — por eso **no importa qué IP tenga el PC**, mientras se conecte por USB y se ejecute ese `adb reverse` en cada sesión (paso 4). Si algún día se prueba sin cable USB (solo WiFi), esto no funciona y hay que volver a usar la IP real del PC en `app.json` (`extra.apiBaseUrl`).
- No borrar `storage/framework` del backend ni `android/.gradle` / `android/app/.cxx` del proyecto React sin necesidad — son cachés de compilación, pero recrearlas de cero fuerza una recompilación completa que tarda varios minutos.
- Todos los procesos de este checklist (backend, Metro, admin panel) deben quedar corriendo en segundo plano simultáneamente — no se cierran unos a otros.
