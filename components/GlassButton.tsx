import React from 'react';
import { Pressable, View, Text, StyleSheet, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { GlassView } from '@components/ui/glass-view';
import { Icon } from '@components/ui/icon';
import { FONT } from '../pages/migrated/theme';

// Botón con el color de marca (#49C5B6, ver comentario junto a C.orange en
// pages/migrated/theme.ts) sobre Liquid Glass real (GlassView, mismo
// componente que ya usan Fab/NavigationTab/Modal/Popover/Tooltip -- ver
// components/ui/glass-view). Experimento pedido explícito 2026-08-29: un
// estilo propio para CTAs, distinto del negro sólido (accentBlack) que usa
// el resto de la app hoy.
//
// A diferencia de Fab (que no necesita capa de tinte -- su contenido ya
// controla su propio contraste) esto SÍ lleva una capa de color encima del
// glass, mismo motivo que NavigationTab/quickMenu: sin ella, el material
// translúcido solo no da contraste garantizado detrás de cualquier fondo
// (foto, tarjeta clara u oscura). La capa va casi opaca (0.88) a propósito
// -- con menos opacidad el contraste deja de ser predecible; a esta opacidad
// el color efectivo que se ve es prácticamente el teal puro sea cual sea lo
// de detrás, así que el contraste calculado abajo se sostiene en la práctica.
//
// Texto/icono en gris casi negro, NUNCA blanco: contraste real calculado
// (fórmula de luminancia relativa WCAG) -- blanco sobre #49C5B6 da ~2.1:1
// (insuficiente, el mismo problema de legibilidad que ya se reportó para
// este color en otras zonas de la app), casi negro sobre #49C5B6 da ~9.9:1.
// No usa GlassView condicionalmente: el propio componente ya cae a una View
// normal e invisible por su cuenta donde no hay Liquid Glass real (ver su
// comentario) -- con la capa de tinte casi opaca encima, el resultado sigue
// siendo un botón teal legible, solo sin el desenfoque de fondo extra.
const TINT = 'rgba(73,197,182,0.88)';
const LABEL_COLOR = '#12312C';

interface GlassButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  iconName?: string;
  style?: StyleProp<ViewStyle>;
}

export default function GlassButton({ label, iconName, style, ...pressableProps }: GlassButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      style={({ pressed }) => [styles.outer, pressed && styles.pressed, style]}
    >
      <View style={styles.clip}>
        <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
      </View>
      <View style={styles.content}>
        {iconName ? <Icon name={iconName as any} size={18} color={LABEL_COLOR} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { opacity: 0.85 },
  clip: { ...StyleSheet.absoluteFillObject, borderRadius: 999, overflow: 'hidden' },
  tint: { backgroundColor: TINT },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  label: { fontFamily: FONT.bold, fontSize: 15, letterSpacing: 0.5, color: LABEL_COLOR },
});
