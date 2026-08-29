// Theme claro estilo Bevel (Encargo 2, 2026-07-31). Migrado desde la paleta
// oscura original — se mantienen los mismos nombres de clave para que las
// 173 pantallas existentes seguuan funcionando sin tocarlas, solo cambian
// los valores. Ver docs/Encargo2_Theme_Bevel.md para el origen de estos
// valores (estimados visualmente de 18 capturas reales de Bevel).
// Encargo 3 (2026-07-31): paleta monocromática — fondo gris claro (#EBEBF0),
// superficies blancas (#FFFFFF), texto en grises/negros (#000000), acento de
// marca en gris claro (#E5E5EA) para mantener el patrón relleno claro +
// texto oscuro. El fondo NO es blanco puro para que las tarjetas blancas
// sigan destacando (jerarquía visual).
// Ajuste de neutros (2026-08-25, pedido explícito con 2 capturas de
// referencia): bg/surface/textPrimary/textSecondary re-muestreados por
// píxel (no a ojo) de las capturas de referencia. `border` NO se tocó --
// las capturas no muestran ningún trazo de borde visible entre tarjetas
// (se separan por espacio + sombra), así que se mantiene el valor anterior
// en vez de inventar uno sin evidencia.
// Fase 1 de la auditoría UI/UX (docs/AUDITORIA_UIUX_2026-08-24.md, Top 10
// #2, 2026-08-25): `textTertiary`/`gray30`/`textMuted` (los 3 son el mismo
// alias documentado en docs/Paleta_Color_BeFit.md) pasan de `#AEAEB2`
// (2.21:1 sobre blanco, falla WCAG AA) a `#8E8E93` (gris "tertiaryLabel"
// estándar de iOS, ~3.26:1). No llega a 4.5:1 -- textSecondary tampoco lo
// hace desde el ajuste de neutros de arriba (viene de las capturas de
// referencia, ~3.37:1), y oscurecer textTertiary hasta 4.5 lo habría
// dejado igual de oscuro que textSecondary, invirtiendo la jerarquía
// (terciario debe leerse MÁS apagado que secundario, no igual). Se llevó
// al mínimo WCAG real disponible sin romper esa jerarquía -- una mejora
// real de 2.21→3.26, no una solución perfecta.
export const C = {
  bg: "#F4F4F7",
  surface: "#FFFFFF",
  surfaceLight: "#FFFFFF",
  border: "#E5E5EA",
  // Nombre canónico del gris de acento (Fase 1, auditoría UI/UX
  // 2026-08-24, sección 2): `gray70`/`gray80`/`brand50`/`brand60`/`primary`
  // valían los 5 literalmente el mismo hex sin ninguna señal de cuál usar
  // -- usar `accent` en código nuevo. Los otros 5 se mantienen como alias
  // de compatibilidad (@deprecated, mismo valor) para no romper las
  // pantallas existentes que ya los referencian.
  accent: "#E5E5EA",
  white: "#262729",
  gray5: "#F7F7F7",
  gray10: "#E5E5EA",
  gray20: "#D1D1D6",
  gray30: "#8E8E93",
  gray40: "#8A8A90",
  gray50: "#8B8C8E",
  gray60: "#3A3A3C",
  /** @deprecated Usa `accent` — mismo valor, nombre no canónico. */
  gray70: "#E5E5EA",
  /** @deprecated Usa `accent` — mismo valor, nombre no canónico. */
  gray80: "#E5E5EA",
  brand5: "rgba(0,0,0,0.08)",
  brand10: "rgba(0,0,0,0.15)",
  brand20: "rgba(0,0,0,0.25)",
  /** @deprecated Usa `accent` — mismo valor, nombre no canónico. */
  brand50: "#E5E5EA",
  /** @deprecated Usa `accent` — mismo valor, nombre no canónico. */
  brand60: "#E5E5EA",
  success: "#34C759",
  success5: "rgba(52,199,89,0.1)",
  success10: "rgba(52,199,89,0.15)",
  success50: "#34C759",
  success60: "#248A3D",
  warning: "#FF9500",
  warning5: "rgba(255,149,0,0.1)",
  warning10: "rgba(255,149,0,0.15)",
  warning40: "#FF9500",
  warning50: "#FF9500",
  warning60: "#C93400",
  destructive: "#FF3B30",
  destructive5: "rgba(255,59,48,0.1)",
  destructive10: "rgba(255,59,48,0.15)",
  destructive20: "rgba(255,59,48,0.25)",
  destructive50: "#FF3B30",
  destructive60: "#D70015",
  blue: "#007AFF",
  blue5: "rgba(0,122,255,0.1)",
  blue10: "rgba(0,122,255,0.15)",
  blue20: "rgba(0,122,255,0.25)",
  blue50: "#007AFF",
  blue60: "#0062CC",
  blue70: "#004999",
  purple: "#A78BFA",
  purple5: "rgba(167,139,250,0.1)",
  purple50: "#A78BFA",
  purple60: "#8B5CF6",
  // Color de marca (pedido explícito 2026-08-29): #49C5B6 en todo el catálogo
  // -- reemplaza al azul-teal pálido #A2CDD4 que llevaba desde el Encargo 3
  // (ese valor ya venía de sustituir un naranja real #FF6B35 sin renombrar
  // esta clave; se mantiene "orange" como nombre por el mismo motivo -- ~120
  // usos en pantallas ya existentes, renombrar es un cambio aparte). Mismo
  // valor en claro y oscuro a propósito: es EL color identificativo, no debe
  // variar por tema. Contraste verificado (fórmula de luminancia relativa
  // WCAG): 2.1:1 sobre blanco/negro -- insuficiente para texto (usar
  // `orange60` en su lugar sobre fondos claros), pero de sobra para rellenos,
  // iconos grandes y el propio material glass (ver components/GlassButton.tsx).
  orange: "#49C5B6",
  // Variante oscurecida para texto/iconos finos sobre fondos claros (mismo
  // patrón que success60/warning60/destructive60/blue60 de abajo) -- ~5.5:1
  // sobre blanco, cumple WCAG AA. En C_DARK no hace falta una variante
  // distinta: el `orange` base ya da ~7.25:1 sobre el fondo oscuro real de
  // la app, así que ahí orange60 reutiliza el mismo valor que orange.
  orange60: "#14766A",
  orangeGradient1: "#49C5B6",
  orangeGradient2: "#14766A",
  amber: "#FF9500",
  blue80: "#003166",
  blue30: "#66B2FF",
  red: "#FF3B30",
  pink: "#FB558B",
  textWhite: "#262729",
  textPrimary: "#262729",
  textSecondary: "#8B8C8E",
  textTertiary: "#8E8E93",
  /** @deprecated Usa `accent` — mismo valor, nombre no canónico. */
  primary: "#E5E5EA",
  primaryLight: "rgba(0,0,0,0.15)",
  gray: "#8B8C8E",
  text: "#262729",
  card: "#FFFFFF",
  textMuted: "#8E8E93",

  // Tokens semánticos con nombre (sección 1 del Encargo 2) — reutilizar
  // estos por significado, en vez de success/warning/destructive/blue
  // sueltos, para pantallas nuevas que sigan el patrón de color de Bevel.
  statusSuccess: "#34C759",
  statusWarning: "#FF9500",
  statusDanger: "#FF3B30",
  statusInfo: "#007AFF",
  statusRest: "#FFCC00",
  statusCycle: "#FFD1DC",

  // Acento neutro para CTAs principales tipo Bevel (botones "Continuar",
  // "Guardar") — negro casi puro, no el brand50/60 morado de la app.
  accentBlack: "#000000",
  // Color de texto/icono correcto sobre un fondo accentBlack -- invierte
  // junto con él (blanco en claro, negro en oscuro, ya que accentBlack pasa
  // a blanco ahí). Antes de este token, muchas pantallas hardcodeaban
  // '#FFFFFF' junto a accentBlack asumiendo modo claro -- texto/icono
  // blanco sobre un botón que en oscuro también es blanco (BUG-045).
  accentBlackForeground: "#FFFFFF",
};

// Variante oscura de C, mismas claves exactas (Home v2, 2026-08-21 —
// arranque de modo oscuro automático por hora, ver useAppColorMode). Los
// acentos semánticos (success/warning/destructive/blue/purple/orange) se
// mantienen igual en ambos modos — son colores de sistema tipo iOS, ya
// pensados para funcionar sobre fondo claro u oscuro sin retocar el tono.
// Solo cambia la jerarquía de fondo/superficie/texto/grises, que sí es
// específica de cada modo.
// Ajuste de neutros (2026-08-25, pedido explícito con 2 capturas de
// referencia, modo oscuro): bg/surface/textPrimary/textSecondary
// re-muestreados por píxel de la captura oscura de referencia -- notablemente
// MÁS CLARO que el negro casi puro anterior (#0B0B0D), un gris carbón
// elevado en vez de negro OLED. `border` no se tocó (misma razón que en C:
// sin trazo de borde visible en la captura, las tarjetas se separan por
// espacio, no por borde).
export const C_DARK: typeof C = {
  bg: "#242529",
  surface: "#2E3037",
  surfaceLight: "#363840",
  border: "#3A3A3C",
  accent: "#3A3A3C",
  white: "#FAFAFA",
  gray5: "#242426",
  gray10: "#3A3A3C",
  gray20: "#48484A",
  gray30: "#636366",
  gray40: "#8A8A8E",
  gray50: "#818287",
  gray60: "#C7C7CC",
  gray70: "#3A3A3C",
  gray80: "#3A3A3C",
  brand5: "rgba(255,255,255,0.08)",
  brand10: "rgba(255,255,255,0.15)",
  brand20: "rgba(255,255,255,0.25)",
  brand50: "#3A3A3C",
  brand60: "#3A3A3C",
  success: "#34C759",
  success5: "rgba(52,199,89,0.12)",
  success10: "rgba(52,199,89,0.2)",
  success50: "#34C759",
  success60: "#30D158",
  warning: "#FF9F0A",
  warning5: "rgba(255,159,10,0.12)",
  warning10: "rgba(255,159,10,0.2)",
  warning40: "#FF9F0A",
  warning50: "#FF9F0A",
  warning60: "#FFB340",
  destructive: "#FF453A",
  destructive5: "rgba(255,69,58,0.12)",
  destructive10: "rgba(255,69,58,0.2)",
  destructive20: "rgba(255,69,58,0.3)",
  destructive50: "#FF453A",
  destructive60: "#FF6961",
  blue: "#0A84FF",
  blue5: "rgba(10,132,255,0.12)",
  blue10: "rgba(10,132,255,0.2)",
  blue20: "rgba(10,132,255,0.3)",
  blue50: "#0A84FF",
  blue60: "#409CFF",
  blue70: "#66B2FF",
  purple: "#A78BFA",
  purple5: "rgba(167,139,250,0.14)",
  purple50: "#A78BFA",
  purple60: "#BFA6FF",
  // Mismo valor que en C (ver comentario ahí) -- color de marca fijo, no
  // varía por tema.
  orange: "#49C5B6",
  // Reutiliza el mismo valor que `orange`: en oscuro ya da ~7.25:1 sobre el
  // fondo real de la app (#242529), no hace falta oscurecerlo más.
  orange60: "#49C5B6",
  orangeGradient1: "#49C5B6",
  orangeGradient2: "#14766A",
  amber: "#FF9F0A",
  blue80: "#66B2FF",
  blue30: "#003166",
  red: "#FF453A",
  pink: "#FB558B",
  textWhite: "#FAFAFA",
  textPrimary: "#FAFAFA",
  textSecondary: "#818287",
  textTertiary: "#8A8A8E",
  primary: "#3A3A3C",
  primaryLight: "rgba(255,255,255,0.15)",
  gray: "#818287",
  text: "#FAFAFA",
  card: "#2E3037",
  textMuted: "#8A8A8E",
  statusSuccess: "#34C759",
  statusWarning: "#FF9F0A",
  statusDanger: "#FF453A",
  statusInfo: "#0A84FF",
  statusRest: "#FFD60A",
  statusCycle: "#FFD1DC",
  accentBlack: "#FFFFFF",
  accentBlackForeground: "#000000",
};

// Hora local (0-23) a partir de la cual se considera "de noche" para el
// modo oscuro automático -- mismo criterio que usa la foto de noche del
// hero de Home v2 (ver getHeroImageForHour), para que ambos cambien juntos.
export function isNightHour(hour: number): boolean {
  return hour >= 21 || hour < 5;
}

export const FONT = {
  light: "Gilroy-Light",
  regular: "Gilroy-Regular",
  medium: "Gilroy-Medium",
  semiBold: "Gilroy-SemiBold",
  bold: "Gilroy-Bold",
  extraBold: "Gilroy-ExtraBold",
  black: "Gilroy-Black",
};

export const GRADIENT = {
  accent: ["#E5E5EA", "#E5E5EA"] as const,
  card: ["#FFFFFF", "#F7F7F7"] as const,
  // Color de marca (pedido explícito 2026-08-29, ver comentario junto a
  // C.orange) -- `brand` es el nombre correcto para código nuevo; `orange`
  // se mantiene como alias con el mismo valor (sin uso real detectado hoy,
  // pero se corrige igual para no dejar un naranja real #FF8A2B/#FF6000
  // desincronizado del C.orange actual).
  brand: ["#49C5B6", "#14766A"] as const,
  /** @deprecated Usa `brand` -- mismo valor, nombre no canónico. */
  orange: ["#49C5B6", "#14766A"] as const,
  border: ["rgba(0,0,0,0.08)", "rgba(0,0,0,0)"] as const,
};

// Tokens de espaciado y forma (sección 0.2 del Encargo 2).
// Escala ampliada (Fase 2 — Visual System, docs/AUDITORIA_UIUX_2026-08-24.md
// sección 13): xs/md se AÑADEN, sm/lg/pill CAMBIAN de valor respecto a la
// escala anterior (antes sm:12,md:20,lg:28 -- ahora sm:12,md:16,lg:20,xl:28).
// El único consumidor real de antes (components/TrendCard.tsx, RADIUS.md)
// se migró a RADIUS.lg en el mismo cambio para conservar su mismo radio
// renderizado (20px, sin cambio visual) -- revisar cualquier otro futuro
// uso de RADIUS.md/lg contra esta tabla, no contra la escala vieja.
export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Escala genérica de 8 pasos (Fase 2, sección 13 de la auditoría) + 2 alias
// de intención que se mantienen por claridad semántica.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  cardPadding: 20,
  screenPadding: 20,
  gapBetweenCards: 12,
  gapBetweenSections: 28,
} as const;

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
} as const;

// Tipografía estimada (sección 0.3 del Encargo 2).
export const TYPE = {
  // 32 no se usaba en ningún lado salvo este propio token (verificado); 28
  // sí aparece de forma natural en el código real -- se alinea el token al
  // uso existente en vez de al revés (Fase 2, sección 13 de la auditoría).
  screenTitle: { fontSize: 28, fontWeight: "700" as const },
  sectionTitle: { fontSize: 22, fontWeight: "700" as const },
  cardTitle: { fontSize: 17, fontWeight: "600" as const },
  bodyText: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "500" as const, color: C.textSecondary },
  ringValueLarge: { fontSize: 48, fontWeight: "700" as const },
  ringLabel: { fontSize: 15, fontWeight: "500" as const },
} as const;
