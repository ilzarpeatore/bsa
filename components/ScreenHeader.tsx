'use client';
import React from 'react';
import { Box } from '@components/ui/box';
import { Heading } from '@components/ui/heading';
import { Button } from '@components/ui/button';
import { Icon } from '@components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable, type GlassStyle } from '@components/ui/glass-view';

const SIDE_SLOT_WIDTH = 40;

interface ScreenHeaderProps {
  title: string;
  /** Omitido en pantallas raiz sin boton de volver (ej. tabs) -- usar hideBack en su lugar. */
  onBack?: () => void;
  hideBack?: boolean;
  /** Slot opcional a la derecha (accion/icono). Sin el, un spacer del mismo
   * ancho que el boton de volver mantiene el titulo centrado de verdad --
   * antes cada pantalla lo hacia a mano y de forma inconsistente (unas
   * centradas, otras no, con tamanos de fuente distintos). */
  rightAction?: React.ReactNode;
  glassEffectStyle?: GlassStyle;
}

// Cabecera compartida (Fase 4 del rollout de Liquid Glass) -- reemplaza el
// patron repetido a mano en pages/migrated/* (Box/HStack + Button/Pressable +
// Heading, cada pantalla con su propio padding/alineacion). Mismo criterio
// que Card/SimpleBottomSheet: GlassView real en iOS 26+, fondo solido
// bg-card como fallback en Android/iOS<26.
//
// Gestiona su propio safe-area top (useSafeAreaInsets), en vez de depender
// de que el SafeAreaView de cada pantalla pinte esa franja -- antes ambos
// pintaban esa zona por separado con colores distintos (SafeAreaView con
// bg-background gris, este header con bg-card blanco de fallback), dejando
// un corte de color justo encima de la cabecera (reportado con captura,
// 2026-08-22). Las pantallas que lo usan deben quitar 'top' de su propio
// edges de SafeAreaView (o el paddingTop manual si no usan SafeAreaView)
// para no duplicar el hueco.
export default function ScreenHeader({ title, onBack, hideBack, rightAction, glassEffectStyle = 'regular' }: ScreenHeaderProps) {
  const hasGlass = isGlassEffectAPIAvailable();
  const insets = useSafeAreaInsets();

  const content = (
    <Box className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 4, paddingBottom: 8 }}>
      {hideBack ? (
        <Box style={{ width: SIDE_SLOT_WIDTH }} />
      ) : (
        <Button variant="ghost" size="icon" onPress={onBack} style={{ width: SIDE_SLOT_WIDTH }}>
          <Icon name="chevron-back" size={24} className="text-foreground" />
        </Button>
      )}
      <Heading size="sm" className="flex-1 text-center" numberOfLines={1} style={{ marginHorizontal: 8 }}>
        {title}
      </Heading>
      {rightAction ?? <Box style={{ width: SIDE_SLOT_WIDTH }} />}
    </Box>
  );

  if (hasGlass) {
    return (
      <GlassView glassEffectStyle={glassEffectStyle} style={{ width: '100%' }}>
        {content}
      </GlassView>
    );
  }
  return <Box className="bg-card w-full">{content}</Box>;
}
