# Lanzar un build de IPA (GitHub Actions)

El workflow `.github/workflows/ios-build.yml` (`workflow_dispatch`) compila un `.ipa` en un runner `macos-latest`. Se dispara con `mcp__github__actions_run_trigger` (`method: run_workflow`, `workflow_id: ios-build.yml`, `owner: ilzarpeatore`, `repo: bsa`).

## Inputs correctos para este repo

```json
{
  "build_id": "algo-unico, ej. fecha-hora o sha corto",
  "ios_path": "ios",
  "configuration": "Release"
}
```

- **`ios_path: "ios"` es obligatorio** — el default del workflow es `"."`, pero el proyecto nativo (Podfile, `.xcodeproj`) vive en `ios/`. Con el default, el paso de build no encuentra el workspace/proyecto.
- **`configuration: "Release"` es obligatorio si el IPA se va a instalar y abrir de verdad en un dispositivo.** El default del workflow es `"Debug"` — parece la opción segura/rápida, pero **NO produce una app usable de forma standalone**.

## Por qué `Debug` rompe la app (aprendido en producción, 2026-08-24)

El build phase "Bundle React Native code and images" del proyecto (`ios/befit.xcodeproj/project.pbxproj`) tiene:

```bash
if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
```

Con `configuration: Debug`, el workflow **completa con éxito** (`conclusion: success`) y genera un `.ipa` — pero ese IPA no tiene el bundle de JavaScript embebido, porque `SKIP_BUNDLING=1` se salta ese paso. Al abrir la app en un dispositivo real (sin Metro corriendo), React Native no encuentra ningún script que cargar y crashea inmediatamente con:

```
No script URL provided. Make sure the packager is running or you have
embedded a JS bundle in your application bundle.
unsanitizedScriptURLString = (null)
```

**Esto NO se detecta en el workflow** — el job de GitHub Actions termina en verde igualmente, porque `xcodebuild`/el export del IPA no fallan por faltar el bundle. El único síntoma es la app real crasheando al abrir. Por eso, cualquier build pensado para probarse en un dispositivo (no conectado a Metro) tiene que pedirse explícitamente en `Release`.

`Debug` solo tiene sentido si el APK/IPA va a conectarse a un Metro packager corriendo en la misma red (desarrollo con `npm start`, ver `docs/ARRANQUE_DESARROLLO.md`) — no es el caso de un IPA que alguien va a instalar y abrir de forma independiente.

## Firma (`use_signing`)

Queda en `false` (default) mientras no haya cuenta de pago de Apple Developer Program configurada (bloqueante documentado en `docs/PENDIENTE_BACKEND_ADMIN.md`, sección HealthKit). Un IPA sin firmar sigue siendo válido para sideload vía herramientas tipo AltStore/Sideloadly, que lo resignan.

## Resumen — checklist antes de lanzar un build "de verdad"

- [ ] `ios_path: "ios"`
- [ ] `configuration: "Release"` (salvo que el build sea explícitamente para conectarse a Metro)
- [ ] `build_id` único (se usa para nombrar el `.ipa` final)
