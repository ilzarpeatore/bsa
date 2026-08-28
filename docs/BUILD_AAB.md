# Lanzar un build de Android (GitHub Actions)

El workflow `.github/workflows/android-build.yml` (`workflow_dispatch`) compila un `.apk`/`.aab` en un runner `ubuntu-latest`. Se dispara con `mcp__github__actions_run_trigger` (`method: run_workflow`, `workflow_id: android-build.yml`, `owner: ilzarpeatore`, `repo: bsa`).

**Estado (2026-08-28): workflow recién creado, sin ninguna ejecución real todavía.** No hay carpeta `android/` nativa en el repo (se genera en el propio job vía `expo prebuild --platform android`, igual que `ios/` se genera en `prebuild-ios.yml` pero sin committearla), y este entorno de agente no tiene Android SDK/Gradle para poder probarlo en local antes de documentarlo — mismo tipo de limitación ya documentado para `pod install` en `docs/BUILD_IPA.md`. **La primera vez que se lance, revisar el log completo del step "Build Android" aunque termine en verde**, no solo el resumen.

## Inputs

```json
{
  "build_id": "algo-unico, ej. fecha-hora o sha corto",
  "build_format": "apk",
  "use_signing": false
}
```

- **`build_format`**: `"apk"` para instalar/probar en un dispositivo Android directamente (sideload). `"aab"` (Android App Bundle) es el formato que exige Google Play Console para publicar — un `.apk` no se puede subir a Play Store.
- **`use_signing`**: `false` (default) produce un build firmado con la keystore de **debug** que genera `expo prebuild` automáticamente — instalable y funcional en un dispositivo, pero Play Console lo rechazará (necesita la keystore de release real). `true` firma con la keystore real vía los secrets de abajo — **obligatorio** para cualquier `aab` que se vaya a subir a Play Console.

## A diferencia de iOS: aquí no hay equivalente al bug de `SKIP_BUNDLING`

El workflow de iOS (`ios-build.yml`) tiene un input `configuration` (Debug/Release) porque el proyecto nativo saltaba el empaquetado de JS en `Debug` sin avisar. Este workflow de Android **siempre construye la variante `release`** de Gradle (`assembleRelease`/`bundleRelease`), que sí empaqueta el JS bundle igual que el equivalente `Release` de iOS — no hay un input de configuración porque no hace falta, no hay una trampa equivalente que evitar aquí. La única decisión real es `use_signing` (con qué keystore se firma esa release), no si se empaqueta el JS.

## Firma real (`use_signing: true`) — requiere 4 secrets nuevos en el repo

No configurados todavía. Hay que crearlos en `Settings → Secrets and variables → Actions` del repo antes de poder usar `use_signing: true`:

| Secret | Contenido |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | El fichero `.keystore`/`.jks` de release, codificado en base64 (`base64 -i mi-release.keystore \| pbcopy` en Mac, o `base64 -w0 mi-release.keystore` en Linux) |
| `ANDROID_KEYSTORE_PASSWORD` | Contraseña del keystore |
| `ANDROID_KEY_ALIAS` | Alias de la clave dentro del keystore |
| `ANDROID_KEY_PASSWORD` | Contraseña de esa clave (puede coincidir con la del keystore) |

### Cómo generar el keystore de release (una sola vez, guardar para siempre)

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore befit-release.keystore \
  -alias befit-release-key \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Guardar `befit-release.keystore` + sus contraseñas fuera de este repo, en un gestor de contraseñas real.** Si se pierde, no se puede recuperar, y Google Play no permite subir una actualización de una app existente firmada con una keystore distinta a la original — perder este fichero obliga a publicar la app como una ficha nueva desde cero, perdiendo reseñas/instalaciones/histórico. (Nota: si en algún momento se activa **Play App Signing** de Google al crear la ficha, Google gestiona la keystore final de firma de la app y esta keystore local pasa a ser solo la de "subida" (upload key) — igual de importante no perderla, pero el riesgo de "perder la app para siempre" se mitiga porque Google puede reemitir la upload key en ese caso.)

### Por qué el workflow verifica en vez de asumir

El paso "Install release keystore" escribe `android/gradle.properties` con **dos** juegos de nombres de propiedad (`MYAPP_UPLOAD_*` y `MYAPP_RELEASE_*`) porque la plantilla oficial de React Native ha usado ambos nombres según la versión, y no se ha podido confirmar en este entorno cuál genera exactamente `expo prebuild` en el SDK 57 de este proyecto. Después de escribirlas, el step comprueba con `grep` que `android/app/build.gradle` (ya generado por el prebuild de un paso antes) de verdad referencia alguno de los dos nombres — si no encuentra ninguno, **falla el build explícitamente** en vez de generar en silencio un `.aab` firmado con la keystore de debug (que Play Console rechazaría de todas formas, pero sin decir por qué). Si eso pasa, hay que abrir el log, mirar el `android/app/build.gradle` real generado en ese run, y ajustar el nombre de propiedad en este workflow al que ese archivo espera de verdad.

## `versionCode`/`buildNumber`

`app.json` ya define `android.versionCode: 1` e `ios.buildNumber: "1"` (añadido 2026-08-28, antes no existían — sin ellos, Expo asumía `1` en cada build de forma silenciosa). **Google Play rechaza subir dos `.aab` con el mismo `versionCode`** — hay que incrementar `android.versionCode` en `app.json` a mano antes de cada build que se vaya a subir a Play Console (mismo criterio que subir `expo.version`/`ios.buildNumber` para App Store).

## Resumen — checklist antes de lanzar un build "de verdad"

- [ ] `build_id` único
- [ ] `build_format: "aab"` si es para subir a Play Console (`"apk"` sirve para probar en un dispositivo)
- [ ] `use_signing: true` + los 4 secrets configurados, si el build es para Play Console
- [ ] `android.versionCode` subido en `app.json` respecto al último build ya subido a Play Console
- [ ] Primera ejecución real: revisar el log completo del step de firma/build, no solo el resumen en verde
