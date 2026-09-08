#!/usr/bin/env python3
"""Inyecta un signingConfigs.release real en android/app/build.gradle.

Por que existe: el build.gradle que genera 'expo prebuild' en el SDK 57 de
este proyecto NO define ningun signingConfigs.release ni lee propiedades
MYAPP_* (a diferencia de la plantilla clasica de React Native que documenta
reactnative.dev/docs/signed-apk-android) -- el buildType release queda
hardcodeado a 'signingConfig signingConfigs.debug'. Confirmado corriendo
'expo prebuild --platform android' e inspeccionando el archivo generado
(run 34267068990 del workflow fallo la verificacion previa -- un simple
grep por MYAPP_UPLOAD_STORE_FILE/MYAPP_RELEASE_STORE_FILE -- porque
ninguno de los dos aparece en ningun sitio del archivo).

Este script parchea el archivo a mano en vez de asumir que ese hook ya
existe. Si la plantilla de 'expo prebuild' cambia en una futura version del
SDK y alguno de los bloques esperados no aparece, falla explicitamente con
un mensaje claro en vez de dejar el build firmado en silencio con la
keystore de debug.
"""
import sys

PATH = "android/app/build.gradle"

DEBUG_SIGNING_BLOCK = """        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }"""

RELEASE_SIGNING_CONFIG = """        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }"""

RELEASE_BUILDTYPE_OLD = "signingConfig signingConfigs.debug\n            def enableShrinkResources"
RELEASE_BUILDTYPE_NEW = "signingConfig signingConfigs.release\n            def enableShrinkResources"


def fail(message):
    print(f"::error::{message}", file=sys.stderr)
    sys.exit(1)


def main():
    with open(PATH) as f:
        content = f.read()

    if DEBUG_SIGNING_BLOCK not in content:
        fail(
            f"No se encontro el bloque signingConfigs.debug esperado en {PATH} -- "
            "la plantilla de 'expo prebuild' cambio respecto a lo verificado. "
            "Ajustar android-inject-release-signing.py a mano (ver docs/BUILD_AAB.md)."
        )
    content = content.replace(DEBUG_SIGNING_BLOCK, RELEASE_SIGNING_CONFIG, 1)

    if RELEASE_BUILDTYPE_OLD not in content:
        fail(
            f"No se encontro 'signingConfig signingConfigs.debug' en el buildType release de {PATH} -- "
            "ajustar android-inject-release-signing.py a mano (ver docs/BUILD_AAB.md)."
        )
    content = content.replace(RELEASE_BUILDTYPE_OLD, RELEASE_BUILDTYPE_NEW, 1)

    with open(PATH, "w") as f:
        f.write(content)

    print(f"{PATH} parcheado: signingConfigs.release inyectado y buildTypes.release apuntando a el.")


if __name__ == "__main__":
    main()
