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

El build phase "Bundle React Native code and images" del proyecto (`ios/bestronger.xcodeproj/project.pbxproj` — renombrado desde `ios/befit.xcodeproj` en el rebrand BeFit→Be Stronger, ver `docs/TAREAS.md`) tiene:

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

## Build number siempre igual → herramientas de sideload no detectan el IPA nuevo (2026-08-29)

Reportado en producción: usuario instaló el IPA del run #68 (build en verde, contenía cambios reales) y no vio ningún cambio — ni el nuevo nombre/icono de la app. Causa: `CFBundleVersion`/`CFBundleShortVersionString` en los `Info.plist` del proyecto son literales (`"1"`/`"1.2.0"`), no `$(CURRENT_PROJECT_VERSION)`/`$(MARKETING_VERSION)` — así que ningún build anterior los había incrementado nunca, todos los IPAs de este repo hasta ahora llevaban exactamente el mismo build number. AltStore (y sideloaders similares) comparan versión antes de reinstalar; con el build number siempre igual, pueden no detectar cambio alguno y dejar corriendo el binario viejo aunque el "update" parezca haber ido bien.

**Fix**: nuevo step "Bump native build number (CFBundleVersion)" en `ios-build.yml`, justo antes de firmar/compilar — pone `CFBundleVersion` a `$GITHUB_RUN_NUMBER` (crece solo en cada ejecución del workflow) en todos los `Info.plist` del proyecto (app + extensiones). Automático desde ahora, no requiere ninguna acción manual en runs futuros.

**Si el problema se repite** (usuario no ve cambios tras instalar un IPA nuevo): antes de sospechar del build, comprobar que la instalación fue de verdad limpia — borrar la app existente del dispositivo por completo y reinstalar desde cero, en vez de fiarse del flujo de "actualizar" del sideloader.

## `pod install` no se puede ejecutar desde este entorno de agente (2026-08-26)

Probado explícitamente: CocoaPods sí se puede instalar como gem en este sandbox Linux (`gem install cocoapods` funciona), pero `pod install` sobre `ios/Podfile` falla siempre en el mismo punto — `use_react_native!` invoca `xcodebuild` para resolver la configuración nativa, y `xcodebuild` no existe fuera de macOS con Xcode instalado. No es un problema de configuración del proyecto, es una limitación de plataforma sin solución posible desde aquí.

**No hace falta workaround**: el workflow `ios-build.yml` ya ejecuta `pod install` como parte de cada build, en un runner macOS de GitHub Actions con Xcode real — cualquier cambio de dependencias nativas (haptics, HealthKit, SecureStore, etc.) se resuelve solo, de forma correcta, en el siguiente build lanzado. No hay ninguna acción pendiente aquí; si se repite el intento de verificar dependencias nativas localmente en una sesión futura, esto ya está confirmado y no merece reintentarse.

## Firma (`use_signing`) y `export_method`

Queda en `false` (default) mientras no haya cuenta de pago de Apple Developer Program configurada (bloqueante documentado en `docs/PENDIENTE_BACKEND_ADMIN.md`, sección HealthKit). Un IPA sin firmar sigue siendo válido para sideload vía herramientas tipo AltStore/Sideloadly, que lo resignan.

**Con `use_signing: true`, el input `export_method` decide para qué sirve el IPA firmado** (2026-08-28, antes el workflow generaba siempre un export `development` sin poder elegirlo):

- `development` (default) — solo instala en dispositivos registrados en el portal de Apple Developer. Sirve para probar en un iPhone de verdad, **no** para subir a App Store Connect/TestFlight.
- `app-store` — el que hace falta para subir a **App Store Connect/TestFlight**. Requiere firmar con un certificado de **Distribution** (no de Development) y un perfil de aprovisionamiento de tipo "App Store", ambos generados desde una cuenta de pago de Apple Developer Program — ver `IOS_CERTIFICATE`/`IOS_PROVISIONING_PROFILE` en los secrets del repo.
- `ad-hoc` — instala en una lista fija de dispositivos registrados por UDID sin pasar por TestFlight, útil para repartir a un grupo pequeño de testers fuera de la tienda.

**No hace falta un Mac propio (ni siquiera una VM) para nada de esto.** `ios-build.yml` ya corre en un runner `macos-latest` de GitHub Actions con Xcode real — generar el certificado y el perfil de aprovisionamiento se hace desde el portal web de Apple Developer (developer.apple.com) + `openssl` para el CSR/`.p12`, ambos sin macOS. Detalle paso a paso pedido explícitamente por el usuario: preguntar en la conversación si hace falta, no repetirlo aquí para no duplicar mantenimiento.

**`IOS_PROVISIONING_PROFILE_WIDGETS` (opcional, 2026-08-31)** — perfil "App Store" separado para `bestrongerWidgetsExtension` (la extensión de Live Activities, bundle id `com.pfndesign.bestronger.bestrongerWidgets`), también en base64. Cualquier app extension necesita su propio App ID + perfil, distinto del de la app principal — un `PROVISIONING_PROFILE_SPECIFIER` global no vale para los dos a la vez (fallo real del run #77: `Provisioning profile ... has app ID X, which does not match the bundle ID Y`). El nombre del perfil que se genere en Apple tiene que ser literalmente `Be Stronger Widgets App Store` — así está hardcodeado en `project.pbxproj` (target `bestrongerWidgetsExtension`, Release). Si el proyecto suma más app extensions en el futuro, cada una necesita su propio secret + su propio `PROVISIONING_PROFILE_SPECIFIER` en el pbxproj, siguiendo este mismo patrón.

**El ARCHIVE y el EXPORT son dos pasos independientes, cada uno necesita conocer los perfiles de cada target por su cuenta** (fallo real del run #79, distinto del #77): el archive firma bien con lo que ya diga `project.pbxproj` por target, pero el export (`xcodebuild -exportArchive`) arma su propio `ExportOptions.plist` con un mapeo explícito bundle-id→perfil — si a ese mapeo le falta la extensión, falla con `exportArchive "X.appex" requires a provisioning profile` aunque el archive haya ido perfecto. El workflow ya añade la entrada del widget al `ExportOptions.plist` automáticamente cuando `IOS_PROVISIONING_PROFILE_WIDGETS` está configurado (variables `WIDGETS_APP_BUNDLE_ID`/`WIDGETS_PROFILE_NAME`, extraídas del propio perfil) -- si se añade una extension nueva en el futuro, este paso también hay que replicarlo, no solo el del pbxproj/archive.

## Subida automática a App Store Connect/TestFlight (`upload_to_app_store`, 2026-08-31)

Pedido explícito: el usuario no tiene Mac, así que no puede usar Transporter para subir el `.ipa` una vez generado. Nuevo input `upload_to_app_store` (bool, default `false`) — cuando es `true` (y `use_signing: true` + `export_method: "app-store"`), un paso nuevo del workflow (`Upload to App Store Connect`) sube el `.ipa` firmado directamente desde el runner `macos-latest` con `xcrun altool --upload-app`, sin intervención manual.

**Requiere 3 secrets nuevos, distintos de los de firma** (`IOS_CERTIFICATE`/`IOS_CERTIFICATE_PASSWORD`/`IOS_PROVISIONING_PROFILE` son para firmar el binario; estos son para autenticar la subida a App Store Connect):

- `APPSTORE_API_KEY_ID` — el Key ID de la API key
- `APPSTORE_API_ISSUER_ID` — el Issuer ID de la cuenta (mismo para todas las keys de esa cuenta)
- `APPSTORE_API_KEY_P8` — el contenido del archivo `AuthKey_XXXXXXXXXX.p8`, **en base64** (igual que `IOS_CERTIFICATE`/`IOS_PROVISIONING_PROFILE` — no el `.p8` en crudo)

**Cómo generar la API key** (appstoreconnect.apple.com, no developer.apple.com — es un portal distinto, misma cuenta):

1. [appstoreconnect.apple.com/access/integrations/api](https://appstoreconnect.apple.com/access/integrations/api) → pestaña **"Team Keys"**
2. Pulsa **"+"** para generar una key nueva
3. Nombre libre (p.ej. "CI Upload"), rol **"App Manager"** (o "Admin") — el mínimo que permite subir builds
4. Apple te enseña el `.p8` **una sola vez** — descárgalo en el momento, no se puede volver a descargar después (si se pierde, hay que generar una key nueva)
5. Apunta el **Key ID** y el **Issuer ID** (visible en la misma pantalla, arriba de la tabla de keys)
6. Codifica el `.p8` en base64 (`base64 -w0 AuthKey_XXXXXXXXXX.p8`) y súbelo como `APPSTORE_API_KEY_P8`

Sin `upload_to_app_store: true`, el workflow se comporta exactamente igual que antes (solo deja el `.ipa` como artifact descargable) — este paso es 100% opt-in, no afecta a ningún build existente.

## Resumen — checklist antes de lanzar un build "de verdad"

- [ ] `ios_path: "ios"`
- [ ] `configuration: "Release"` (salvo que el build sea explícitamente para conectarse a Metro)
- [ ] `build_id` único (se usa para nombrar el `.ipa` final)
- [ ] Si es para App Store Connect/TestFlight: `use_signing: true` + `export_method: "app-store"` + secrets de certificado de Distribution/perfil "App Store" configurados
- [ ] Si además quieres que se suba solo (sin Mac/Transporter): `upload_to_app_store: true` + secrets `APPSTORE_API_KEY_ID`/`APPSTORE_API_ISSUER_ID`/`APPSTORE_API_KEY_P8` configurados
