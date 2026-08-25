# BeFit — Ficha de color

> Todos los colores en uso en la app, agrupados por lo que significan, no por dónde viven en el archivo.

- **Fuente**: `pages/migrated/theme.ts`
- **Motor**: Gluestack-UI · `global.css`
- **Actualizado**: 25 ago 2026 — neutros (fondo/superficie/texto) re-muestreados por píxel de 2 capturas de referencia, claro y oscuro (ver abajo). Reemplaza a la actualización del 31 jul 2026 (paleta monocromática, que sigue vigente en todo lo demás: acento de marca, estados semánticos).

**Metodología de esta actualización**: los valores marcados **Medido** se extrajeron con muestreo de píxel real (Python/Pillow, color dominante de un recorte) de las 2 capturas de referencia que el usuario proporcionó — no son estimaciones a ojo. `border` no se tocó: ninguna de las 2 capturas muestra un trazo de borde visible entre tarjetas (se separan por espacio + sombra), así que inventar un valor sin evidencia habría sido peor que dejar el anterior.

**Leyenda**

- **Alias** — mismo color, más de un nombre de clave en el código.
- **Rampa** — variantes de opacidad/tono de un mismo tinte.

---

## 01 · Fondo y superficies

Fondo gris muy claro (no blanco puro) para que las tarjetas blancas destaquen por jerarquía visual.

| Color | Hex       | Nombre                        | Alias                                            | Uso                                                                                                      | Fuente                                  |
| ----- | --------- | ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| ⬜    | `#F4F4F7` | Fondo de app (claro)          | `bg`                                             | Fondo detrás de todas las pantallas                                                                      | Medido                                  |
| ⬜    | `#FFFFFF` | Superficie / tarjeta (claro)  | `surface` · `surfaceLight` · `card`              | Fondo blanco de tarjetas e inputs sobre el gris de app                                                   | Medido (sin cambio, ya era blanco puro) |
| ⬛    | `#242529` | Fondo de app (oscuro)         | `bg` (`C_DARK`)                                  | Antes `#0B0B0D` (negro OLED) — el oscuro de referencia es notablemente más claro, un gris carbón elevado | Medido                                  |
| ⬛    | `#2E3037` | Superficie / tarjeta (oscuro) | `surface` · `surfaceLight`\* · `card` (`C_DARK`) | Antes `#1C1C1E`                                                                                          | Medido                                  |
| ⬜    | `#E5E5EA` | Borde / divisor (claro)       | `border` · `gray10`                              | Sin cambio — sin evidencia de un trazo de borde en las capturas                                          | Sin tocar                               |
| ⬛    | `#3A3A3C` | Borde / divisor (oscuro)      | `border` (`C_DARK`)                              | Sin cambio, mismo motivo                                                                                 | Sin tocar                               |

\* `surfaceLight` (oscuro) se ajustó de forma proporcional a `#363840` (un paso más claro que `surface`, misma relación que antes) — no hay una superficie "elevada" distinta en las 2 capturas para medirla aparte.

---

## 02 · Texto

Mismos nombres de clave que en la migración anterior (`white`, `textPrimary`...) para no tocar las pantallas existentes — solo cambió el valor.

| Color | Hex       | Nombre                    | Alias                                          | Uso                                                                                                                                                                                                                                   | Fuente    |
| ----- | --------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| ⬛    | `#262729` | Texto principal (claro)   | `white` · `textWhite` · `textPrimary` · `text` | Títulos y cuerpo de texto de máximo contraste — antes `#000000`, ahora un casi-negro real (no puro), 14.95:1 sobre blanco                                                                                                             | Medido    |
| ⬜    | `#FAFAFA` | Texto principal (oscuro)  | igual, en `C_DARK`                             | Antes `#F2F2F7`                                                                                                                                                                                                                       | Medido    |
| ⬜    | `#8B8C8E` | Texto secundario (claro)  | `textSecondary` · `gray` · `gray50`            | Etiquetas, subtítulos, metadatos — antes `#6B6B70`. **Nota de contraste**: 3.37:1 sobre blanco, por debajo de WCAG AA para texto normal (4.5:1) — la propia captura de referencia tiene el mismo problema, no es un error de medición | Medido    |
| ⬛    | `#818287` | Texto secundario (oscuro) | igual, en `C_DARK`                             | Antes `#AEAEB2`                                                                                                                                                                                                                       | Medido    |
| ⬜    | `#AEAEB2` | Texto terciario           | `textTertiary` · `textMuted` · `gray30`        | Placeholders y estados deshabilitados — **sin tocar, sin evidencia en las 2 capturas**. Sigue siendo el hallazgo de `docs/AUDITORIA_UIUX_2026-08-24.md` (2.21:1 sobre blanco, falla WCAG AA)                                          | Sin tocar |

---

## 01b · Colores nuevos vistos en la referencia, sin token todavía

Presentes en las capturas de referencia pero sin mapear a un token existente — no se aplicaron a `theme.ts` porque no hay evidencia de que deban sustituir un color semántico ya definido (podría ser un acento puntual, no un color de sistema). Pendiente de decidir con el usuario:

| Color | Hex                                    | Dónde aparece                                                                                                                                                                         | Fuente |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 🟠    | `#EB4F27`                              | Icono/barra de "Energía" (rayo) — más rojo que `orange` (`#FF6B35`) actual                                                                                                            | Medido |
| 🔵    | `#C7DCED` (claro) / `#DFF6FE` (oscuro) | Círculo de avatar con iniciales — nótese que es MÁS CLARO en oscuro que en claro (invertido respecto al resto de la paleta)                                                           | Medido |
| 🟢    | `#7BC390`                              | Punto de estado junto a "Estrés de hoy" — igual en ambos modos (coherente con que los semánticos no cambian entre claro/oscuro), pero más apagado que el `success` actual (`#34C759`) | Medido |

---

## 03 · Estados semánticos

Los 6 tokens con nombre — usar por significado (`statusX`), no por el color suelto. Sin cambios respecto a la versión anterior: son los únicos colores "de verdad" (no neutros) de toda la paleta.

### Éxito

| Hex       | Alias                                     | Uso                                   |
| --------- | ----------------------------------------- | ------------------------------------- |
| `#34C759` | `statusSuccess` · `success` · `success50` | Rango normal, activo, hábito cumplido |

Rampa: `success5` `rgba(52,199,89,0.1)` (10%) · `success10` `rgba(52,199,89,0.15)` (15%) · `success60` `#248A3D`

### Atención

| Hex       | Alias                                                  | Uso                                 |
| --------- | ------------------------------------------------------ | ----------------------------------- |
| `#FF9500` | `statusWarning` · `warning` · `warning40/50` · `amber` | Por debajo de lo normal, no crítico |

Rampa: `warning5` `rgba(255,149,0,0.1)` (10%) · `warning10` `rgba(255,149,0,0.15)` (15%) · `warning60` `#C93400`

### Alerta

| Hex       | Alias                                                    | Uso                                     |
| --------- | -------------------------------------------------------- | --------------------------------------- |
| `#FF3B30` | `statusDanger` · `destructive` · `destructive50` · `red` | Enfermo/a, hábito no cumplido, cancelar |

Rampa: `destructive5` `rgba(255,59,48,0.1)` (10%) · `destructive20` `rgba(255,59,48,0.25)` (25%) · `destructive60` `#D70015`

### Selección / info

| Hex       | Alias                            | Uso                                         |
| --------- | -------------------------------- | ------------------------------------------- |
| `#007AFF` | `statusInfo` · `blue` · `blue50` | Descansando, día activo, check seleccionado |

Rampa: `blue5` `rgba(0,122,255,0.1)` (10%) · `blue30` `#66B2FF` · `blue60` `#0062CC` · `blue70` `#004999`

### Descanso

| Hex       | Alias        | Uso                                   |
| --------- | ------------ | ------------------------------------- |
| `#FFCC00` | `statusRest` | Sueño — sin variantes tonales todavía |

### Ciclo

| Hex       | Alias         | Uso                                             |
| --------- | ------------- | ----------------------------------------------- |
| `#FFD1DC` | `statusCycle` | Categoría Biología — distinto del pink de marca |

---

## 04 · Marca y acento

**Cambio principal de esta actualización**: el acento de marca dejó de ser un color (morado, y después beige) y pasó a ser un gris neutro — mismo patrón "relleno claro + texto oscuro encima" de antes, pero sin tinte de ningún color. `brand5/10/20` (las rampas de opacidad) pasaron de `rgba(227,220,217,X)` (beige) a `rgba(0,0,0,X)` (negro).

| Hex       | Nombre           | Alias                                                   | Uso                                                                                                    |
| --------- | ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `#E5E5EA` | Acento de marca  | `primary` · `brand50` · `brand60` · `gray70` · `gray80` | Botón "+", chips activos, botones principales — con texto/icono en `#000000` encima                    |
| `#000000` | CTA estilo Bevel | `accentBlack`                                           | Botones "Continuar" / "Guardar" — mismo negro que el texto principal, sin significado semántico propio |

Rampa del acento de marca: `brand5` `rgba(0,0,0,0.08)` (8%) · `brand10` `rgba(0,0,0,0.15)` (15%) · `brand20` `rgba(0,0,0,0.25)` (25%)

---

## 05 · Grises neutros

Escala `gray5`→`gray60`. `gray70` y `gray80` no son grises propios — son alias del acento de marca (ver grupo 04), que ahora también es gris, así que visualmente coinciden con `gray10`.

| Hex       | Nombre   | Uso                                        |
| --------- | -------- | ------------------------------------------ |
| `#F7F7F7` | `gray5`  | Igual que `surfaceLight` en la práctica    |
| `#D1D1D6` | `gray20` | Sin uso semántico propio todavía           |
| `#8A8A90` | `gray40` | Estado "neutral" activo del TriStateToggle |
| `#3A3A3C` | `gray60` | El gris más oscuro de la escala neutra     |

---

## 06 · Acentos secundarios

Colores decorativos con un solo uso puntual — no forman parte del sistema semántico del grupo 03 ni se vieron afectados por el cambio a monocromo (son ilustrativos, no de marca).

| Hex       | Nombre             | Alias                 | Uso                                                            |
| --------- | ------------------ | --------------------- | -------------------------------------------------------------- |
| `#FF6B35` | Naranja decorativo | `orange`              | Degradado de rachas / iconos de fuego                          |
| `#A78BFA` | Lila secundario    | `purple` · `purple50` | Único resto de tono morado en la app — decorativo, no de marca |
| `#FB558B` | Rosa de marca      | `pink`                | Distinto del `statusCycle` (grupo 03) — más saturado           |

Rampa del naranja: `orangeGradient1` `#FF8A2B` · `orangeGradient2` `#FF6000`
Rampa del lila: `purple60` `#8B5CF6`

---

_BeFit App — React Native / Expo. Generado a partir del código actual de `theme.ts`, no estimado._
