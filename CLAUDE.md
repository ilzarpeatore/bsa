# BeFit (bsa) — notas para Claude Code

## Lanzar un build de IPA

Antes de disparar `.github/workflows/ios-build.yml` (`workflow_dispatch`), leer **`docs/BUILD_IPA.md`**.

Resumen crítico: los inputs por defecto del workflow (`ios_path: "."`, `configuration: "Debug"`) **NO** sirven para un IPA que alguien vaya a instalar y abrir en un dispositivo real — hay que pasar explícitamente `ios_path: "ios"` y `configuration: "Release"`. Con `Debug`, el job de GitHub Actions termina en verde (`conclusion: success`) pero el `.ipa` resultante no lleva el bundle de JS embebido (`SKIP_BUNDLING=1`), y la app crashea al abrir con "No script URL provided" — el workflow no detecta este fallo, solo se ve al abrir la app real. Detalle completo y por qué en `docs/BUILD_IPA.md`.
