import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ArcGaugeProps {
  size?: number;
  strokeWidth?: number;
  /** 0-100. */
  percent: number;
  colorStart?: string;
  colorEnd?: string;
  trackColor?: string;
  /** Grados que abarca el arco, centrado arriba. Por defecto deja un hueco
   * abajo (estilo "arcoíris" de gauge de fitness), no un círculo completo. */
  sweepAngle?: number;
  duration?: number;
  /** Si true, dibuja un punto que recorre el arco marcando el % actual
   * (como el "corredor" del mockup de referencia). */
  showMarker?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Convierte un ángulo (grados, convención SVG: 0°=derecha, sentido horario,
// eje Y hacia abajo) a coordenadas sobre un círculo de radio r centrado en
// (cx, cy).
function pointOnCircle(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Arco SVG entre dos ángulos (grados), como path "M...A...". largeArcFlag se
// calcula solo (sweep > 180°) -- llamador no tiene que pensarlo.
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = pointOnCircle(cx, cy, r, startDeg);
  const end = pointOnCircle(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArcFlag = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

// Gauge en arco (no círculo completo) con degradado y un punto que recorre
// el trazo marcando el progreso -- dibujado a mano con react-native-svg,
// pedido explícito para Pasos ("más animado y dinámico" que el anillo plano
// de AnimatedRing). Misma técnica de AnimatedRing (strokeDasharray/
// strokeDashoffset animados con Reanimated) pero generalizada a un arco
// cualquiera en vez de una circunferencia completa: la longitud total del
// arco (r * ánguloEnRadianes) hace de "circunferencia", así que el mismo
// truco de recorte de trazo funciona igual.
export default function ArcGauge({
  size = 240,
  strokeWidth = 14,
  percent,
  colorStart = '#49C5B6',
  colorEnd = '#8FE3C7',
  trackColor = 'rgba(120,120,128,0.16)',
  sweepAngle = 250,
  duration = 900,
  showMarker = true,
  children,
  style,
}: ArcGaugeProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Centrado arriba: en esta convención, "arriba" es -90°. El gauge va de
  // -90 - sweep/2 a -90 + sweep/2, dejando un hueco simétrico abajo.
  const startDeg = -90 - sweepAngle / 2;
  const endDeg = -90 + sweepAngle / 2;
  const sweepRad = (sweepAngle * Math.PI) / 180;
  const arcLength = r * sweepRad;

  const trackD = arcPath(cx, cy, r, startDeg, endDeg);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(clamped / 100, { duration });
  }, [clamped, duration, progress]);

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - progress.value),
  }));

  // Trigonometría del marcador en línea (no se reutiliza pointOnCircle
  // aquí): esta función se ejecuta en la UI thread dentro de un worklet de
  // useAnimatedProps, y pointOnCircle es una función de módulo normal sin
  // directiva 'worklet' -- llamarla desde aquí dependería de que el plugin
  // de Babel de Reanimated la auto-convierta, que no es el patrón
  // explícito/seguro documentado (sí se usa 'worklet' explícito en
  // WaveFillCircle para el mismo caso). Más simple y sin ambigüedad: el
  // cálculo va inline, worklet en mano.
  const markerProps = useAnimatedProps(() => {
    'worklet';
    const deg = startDeg + sweepAngle * progress.value;
    const rad = (deg * Math.PI) / 180;
    return { cx: cx + r * Math.cos(rad), cy: cy + r * Math.sin(rad) };
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="arcGaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colorStart} />
            <Stop offset="1" stopColor={colorEnd} />
          </LinearGradient>
        </Defs>

        <Path d={trackD} stroke={trackColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <AnimatedPath
          d={trackD}
          stroke="url(#arcGaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={arcLength}
          animatedProps={progressProps}
        />
        {showMarker && clamped > 0 && (
          <AnimatedCircle
            r={strokeWidth / 2 + 2}
            fill="#FFFFFF"
            stroke={colorEnd}
            strokeWidth={3}
            animatedProps={markerProps}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}
