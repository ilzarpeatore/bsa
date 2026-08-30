import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from '@components/ui/glass-view';

interface GlassSegmentedBarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

// Envuelve una barra de segmentos tipo píldora ("Biblioteca/Crear el mío",
// "Semana/Mes", pestañas de ExerciseInfo...) en material Liquid Glass real
// en iOS 26+ -- pedido explícito 2026-08-29 ("aplícalo a todos los
// selectores de botones donde pueda ser aplicable"), mismo patrón ya usado
// a mano en plan_screen.tsx (weekdayPickerGlassWrap) antes de que existiera
// este componente compartido.
//
// El `style` de cada pantalla sigue poniendo la forma real (borderRadius,
// padding, marginBottom...); aquí solo se decide el fondo: glass real
// cuando el dispositivo lo soporta, o la misma superficie plana
// (backgroundColor) que ya llevaba cada pantalla en caso contrario --
// isGlassEffectAPIAvailable() ya devuelve false ahí, así que no hace falta
// ninguna rama para Android/iOS<26 aparte de esta.
export default function GlassSegmentedBar({ children, style, className }: GlassSegmentedBarProps) {
  if (!isGlassEffectAPIAvailable()) {
    return (
      <View className={className} style={style}>
        {children}
      </View>
    );
  }
  return (
    <GlassView className={className} glassEffectStyle="regular" style={[style, { backgroundColor: 'transparent' }]}>
      {children}
    </GlassView>
  );
}
