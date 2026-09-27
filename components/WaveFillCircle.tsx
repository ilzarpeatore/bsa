import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, ClipPath, Circle, Path, LinearGradient, Stop, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface WaveFillCircleProps {
  size?: number;
  /** 0-100. Nivel de agua real -- anima suavemente al cambiar. */
  percent: number;
  /** Color principal del agua (degradado hacia una versión más oscura). */
  color?: string;
  colorDark?: string;
  trackColor?: string;
  duration?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Círculo que se llena de agua con una superficie ondulada animada, en vez
// del anillo de progreso plano que usa el resto de la app (AnimatedRing) --
// pedido explícito para la pantalla de Agua: "más animada y dinámica",
// dibujado a mano con react-native-svg + Reanimated, sin librería de
// gráficos nueva.
//
// Técnica: dos ondas senoidales superpuestas (fases y velocidades distintas,
// para que no se vea como "una sola ola" mecánica) recortadas dentro de un
// <ClipPath> circular. Cada onda es un <Path> cuyo atributo `d` se
// recalcula en un worklet de useAnimatedProps -- a diferencia de
// AnimatedRing (que solo anima strokeDashoffset sobre una geometría fija),
// aquí la FORMA del path cambia cada frame, así que hace falta reconstruir
// la cadena "d" completa en la UI thread en vez de animar un solo número.
// El nivel de agua (cuánto sube la ola) es un shared value aparte que
// interpola con withTiming al cambiar `percent`; la fase de la onda gira
// sin parar con withRepeat(..., -1) para el efecto de oleaje continuo.
export default function WaveFillCircle({
  size = 220,
  percent,
  color = '#0A84FF',
  colorDark,
  trackColor,
  duration = 900,
  children,
  style,
}: WaveFillCircleProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const levelProgress = useSharedValue(0); // 0 = vacío, 1 = lleno
  const phase = useSharedValue(0);

  useEffect(() => {
    levelProgress.value = withTiming(clamped / 100, { duration });
  }, [clamped, duration, levelProgress]);

  useEffect(() => {
    // Bucle infinito 0 -> 2π -- al ser periódica la función seno, el salto
    // al reiniciar el bucle es invisible (misma forma en 0 y en 2π).
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3200, easing: Easing.linear }),
      -1,
      false
    );
  }, [phase]);

  // Fórmula compartida por las dos ondas: una fila de puntos senoidales de
  // x=0 a x=size, cerrando el path hacia abajo y hacia los lados para que
  // quede sólido por debajo de la superficie (fill, no solo stroke).
  const buildWavePath = (waterY: number, amp: number, wavelength: number, ph: number) => {
    'worklet';
    const points = 24;
    let d = `M 0 ${waterY}`;
    for (let i = 1; i <= points; i++) {
      const x = (size * i) / points;
      const y = waterY + amp * Math.sin((x / wavelength) * Math.PI * 2 + ph);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L ${size} ${size} L 0 ${size} Z`;
    return d;
  };

  const backProps = useAnimatedProps(() => {
    const waterY = size - levelProgress.value * size;
    return { d: buildWavePath(waterY, 5, size * 0.9, phase.value * 0.8 + Math.PI) };
  });

  const frontProps = useAnimatedProps(() => {
    const waterY = size - levelProgress.value * size;
    return { d: buildWavePath(waterY, 7, size * 0.65, phase.value) };
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <ClipPath id="waveClip">
            <Circle cx={size / 2} cy={size / 2} r={size / 2 - 3} />
          </ClipPath>
          <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.85} />
            <Stop offset="1" stopColor={colorDark ?? color} stopOpacity={1} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 3}
          fill="none"
          stroke={trackColor ?? 'rgba(120,120,128,0.16)'}
          strokeWidth={2}
        />

        <G clipPath="url(#waveClip)">
          {/* Onda trasera: más lenta, más tenue -- da profundidad ("parallax"
              de líquido) sin duplicar el coste de la onda principal. */}
          <AnimatedPath animatedProps={backProps} fill={color} opacity={0.35} />
          {/* Onda delantera: la que de verdad marca el nivel, con degradado. */}
          <AnimatedPath animatedProps={frontProps} fill="url(#waveGradient)" />
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}
