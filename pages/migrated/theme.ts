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
export const C = {
  bg: "#F4F4F7",
  surface: "#FFFFFF",
  surfaceLight: "#FFFFFF",
  border: "#E5E5EA",
  white: "#262729",
  gray5: "#F7F7F7",
  gray10: "#E5E5EA",
  gray20: "#D1D1D6",
  gray30: "#AEAEB2",
  gray40: "#8A8A90",
  gray50: "#8B8C8E",
  gray60: "#3A3A3C",
  gray70: "#E5E5EA",
  gray80: "#E5E5EA",
  brand5: "rgba(0,0,0,0.08)",
  brand10: "rgba(0,0,0,0.15)",
  brand20: "rgba(0,0,0,0.25)",
  brand50: "#E5E5EA",
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
  orange: "#FF6B35",
  orangeGradient1: "#FF8A2B",
  orangeGradient2: "#FF6000",
  amber: "#FF9500",
  blue80: "#003166",
  blue30: "#66B2FF",
  red: "#FF3B30",
  pink: "#FB558B",
  textWhite: "#262729",
  textPrimary: "#262729",
  textSecondary: "#8B8C8E",
  textTertiary: "#AEAEB2",
  primary: "#E5E5EA",
  primaryLight: "rgba(0,0,0,0.15)",
  gray: "#8B8C8E",
  text: "#262729",
  card: "#FFFFFF",
  textMuted: "#AEAEB2",

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
} as const;

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
  orange: "#FF6B35",
  orangeGradient1: "#FF8A2B",
  orangeGradient2: "#FF6000",
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
  orange: ["#FF8A2B", "#FF6000"] as const,
  border: ["rgba(0,0,0,0.08)", "rgba(0,0,0,0)"] as const,
};

// Tokens de espaciado y forma (sección 0.2 del Encargo 2).
export const RADIUS = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const SPACING = {
  cardPadding: 20,
  screenPadding: 16,
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
  screenTitle: { fontSize: 32, fontWeight: "700" as const },
  sectionTitle: { fontSize: 22, fontWeight: "700" as const },
  cardTitle: { fontSize: 17, fontWeight: "600" as const },
  bodyText: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "500" as const, color: C.textSecondary },
  ringValueLarge: { fontSize: 48, fontWeight: "700" as const },
  ringLabel: { fontSize: 15, fontWeight: "500" as const },
} as const;
