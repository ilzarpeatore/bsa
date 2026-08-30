import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { C } from '../pages/migrated/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface AnimatedGlowBorderProps {
  children: React.ReactNode;
  /** Debe coincidir con el radio real del contenido envuelto -- no se puede leer del hijo. */
  borderRadius?: number;
  strokeWidth?: number;
  /** Duración de una vuelta completa del brillo alrededor del borde (ms). */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

// Borde "con vida" para bloques destacados (pedido explícito 2026-08-29,
// junto al resto de la migración de color de marca): un tramo brillante
// recorre el perímetro en bucle sobre un trazo tenue fijo, en vez de un
// simple borderColor estático -- de ahí "gira sobre sí mismo".
//
// Técnica: react-native-svg + reanimated (mismo patrón que AnimatedRing,
// que ya anima un Circle con strokeDashoffset), pero aquí sobre un Rect
// redondeado en vez de un Circle, y con strokeDasharray fijo en vez de
// creciente -- así el "hueco" entre trazo y trazo se mueve en vez de
// abrirse/cerrarse. El tamaño real (width/height) se necesita en px, no en
// % -- de ahí el onLayout + estado en vez de tallas fijas.
//
// No usa GlassView: esto es un efecto propio con vida (animación), distinto
// del material Liquid Glass real de iOS 26+ que ya cubre Card variant="glass"
// -- se pueden combinar (ver plan_screen.tsx, día seleccionado del
// calendario semanal) envolviendo un Card/GlassView con este componente.
export default function AnimatedGlowBorder({
  children,
  borderRadius = 20,
  strokeWidth = 2.5,
  duration = 3200,
  style,
}: AnimatedGlowBorderProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dashOffset = useSharedValue(0);

  // Perímetro real de un rounded-rect (2 pares de lados rectos + 4 cuartos
  // de círculo de radio borderRadius que forman una circunferencia
  // completa) -- el simplificado 2*(w+h) sobra el recorte de las esquinas y
  // desincroniza la velocidad aparente del brillo entre bloques de distinto
  // tamaño.
  const perimeter = useMemo(() => {
    if (!size.width || !size.height) return 0;
    const r = Math.min(borderRadius, size.width / 2, size.height / 2);
    const straight = 2 * (size.width - 2 * r) + 2 * (size.height - 2 * r);
    const corners = 2 * Math.PI * r;
    return Math.max(straight + corners, 1);
  }, [size, borderRadius]);

  useEffect(() => {
    if (!perimeter) return;
    dashOffset.value = 0;
    dashOffset.value = withRepeat(withTiming(-perimeter, { duration, easing: Easing.linear }), -1, false);
  }, [perimeter, duration, dashOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const dashLength = perimeter * 0.3;
  const gapLength = Math.max(perimeter - dashLength, 1);
  const rx = Math.max(borderRadius - strokeWidth / 2, 0);

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, style]} onLayout={onLayout}>
      {children}
      {size.width > 0 && (
        <Svg
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={C.orange} stopOpacity={0.15} />
              <Stop offset="0.5" stopColor={C.orange} stopOpacity={1} />
              <Stop offset="1" stopColor={C.orangeGradient2} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>
          {/* Trazo tenue fijo -- da el "borde de cristal" base incluso en el
              instante en que el tramo brillante está al otro lado. */}
          <Rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(size.width - strokeWidth, 0)}
            height={Math.max(size.height - strokeWidth, 0)}
            rx={rx}
            stroke={C.orange10}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Tramo brillante que recorre el perímetro en bucle. */}
          <AnimatedRect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(size.width - strokeWidth, 0)}
            height={Math.max(size.height - strokeWidth, 0)}
            rx={rx}
            stroke="url(#glow)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${dashLength} ${gapLength}`}
            animatedProps={animatedProps}
          />
        </Svg>
      )}
    </View>
  );
}
