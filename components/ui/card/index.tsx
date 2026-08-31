'use client';
import React from 'react';
import { View, type ViewProps } from 'react-native';
import { tva, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { GlassView, type GlassStyle } from '@components/ui/glass-view';

// Una sola capa de fondo por variante — a propósito, para que envolver en
// GlassView (expo-glass-effect) fuera un cambio puntual aquí, no en cada
// pantalla. Reemplaza el patrón repetido a mano en pages/migrated/* (bg +
// border + radius + padding en cada StyleSheet).
//
// variant="glass" es opt-in — NO es el default de Card, a propósito. Cambiar
// el default habría afectado a las 93 pantallas ya migradas sin haberlo
// visto en un dispositivo real todavía. `bg-card/80` es el fondo de reserva
// para Android/iOS<26, donde GlassView cae a una <View> normal (ver
// components/ui/glass-view) — sin esto se vería transparente ahí.
const cardStyle = tva({
  base: 'rounded-md p-card-padding',
  variants: {
    variant: {
      outline: 'bg-card border border-border',
      elevated: 'bg-card shadow-card',
      filled: 'bg-secondary',
      ghost: 'bg-card',
      glass: 'bg-card/80',
    },
  },
});

type ICardProps = ViewProps &
  VariantProps<typeof cardStyle> & {
    className?: string;
    /** Solo con variant="glass" — ver GlassViewProps de expo-glass-effect. @default 'regular' */
    glassEffectStyle?: GlassStyle;
    /** Solo con variant="glass". */
    tintColor?: string;
    /**
     * Solo con variant="glass". Omite el wrapper propio de recorte
     * (overflow:hidden + borderRadius) cuando quien llama ya envuelve este
     * Card en OTRO contenedor que recorta al mismo radio (p.ej.
     * AnimatedGlowBorder) -- anidar dos overflow:hidden alrededor del
     * GlassView nativo (UIVisualEffectView con Liquid Glass real) le impide
     * renderizar su brillo dinámico propio, el mismo timing de montaje ya
     * documentado abajo pero agravado por el doble recorte. @default false
     */
    disableSelfClip?: boolean;
  };

const Card = React.forwardRef<React.ComponentRef<typeof View>, ICardProps>(
  function Card(
    { className, variant = 'outline', glassEffectStyle = 'regular', tintColor, disableSelfClip, ...props },
    ref
  ) {
    const resolvedClassName = cardStyle({ variant, class: className });
    if (variant === 'glass') {
      if (disableSelfClip) {
        return (
          <GlassView
            glassEffectStyle={glassEffectStyle}
            tintColor={tintColor}
            className={resolvedClassName}
            {...props}
            ref={ref}
          />
        );
      }
      // GlassView (expo-glass-effect) solo aplica su borderRadius nativo
      // cuando el Liquid Glass real esta disponible y ya se monto -- sin
      // este wrapper, la esquina de la card se ve cuadrada por detras
      // cuando falla ese timing (ver misma nota en WorkoutMinimizedBar.tsx).
      // radius-md del design system (global.css) duplicado aqui a proposito
      // como red de seguridad -- el className original sigue intacto abajo.
      return (
        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
          <GlassView
            glassEffectStyle={glassEffectStyle}
            tintColor={tintColor}
            className={resolvedClassName}
            {...props}
            ref={ref}
          />
        </View>
      );
    }
    return (
      <View
        className={resolvedClassName}
        {...props}
        ref={ref}
      />
    );
  }
);

Card.displayName = 'Card';
export { Card };
