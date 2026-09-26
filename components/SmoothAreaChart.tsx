import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line } from 'react-native-svg';
import { svgPathProperties } from 'svg-path-properties';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Extraído aparte a propósito: useAnimatedProps es un Hook y no se puede
// llamar dentro de un .map() (violaría las Reglas de los Hooks -- un
// componente propio por punto sí puede llamarlo en su propio nivel superior).
function AnimatedDot({
  cx,
  cy,
  color,
  radius,
  progress,
}: {
  cx: number;
  cy: number;
  color: string;
  radius: number;
  progress: SharedValue<number>;
}) {
  const dotProps = useAnimatedProps(() => ({
    r: radius * progress.value,
  }));
  return <AnimatedCircle cx={cx} cy={cy} fill={color} animatedProps={dotProps} />;
}

export interface SmoothAreaChartPoint {
  label: string;
  value: number;
  /** Marca el punto como "conseguido" (color de acierto) -- p.ej. día que
   * alcanzó el objetivo. */
  achieved?: boolean;
  isToday?: boolean;
}

export interface SmoothAreaChartProps {
  data: SmoothAreaChartPoint[];
  /** Línea de referencia horizontal (objetivo) -- un solo valor: si el
   * objetivo cambia día a día se usa el más reciente no nulo como
   * referencia aproximada, no una línea escalonada por día. */
  goalValue?: number | null;
  height?: number;
  color?: string;
  achievedColor?: string;
  goalColor?: string;
  labelColor?: string;
  duration?: number;
}

interface Pt {
  x: number;
  y: number;
}

// Catmull-Rom -> Bézier cúbica: fórmula estándar para suavizar una polilínea
// de puntos en una curva continua (sin librería de gráficos). Cada tramo
// pi->pi+1 usa los puntos vecinos (clamped en los extremos, duplicando el
// primero/último) para calcular los dos puntos de control de la cúbica.
function catmullRomPath(points: Pt[]): string {
  if (points.length < 2) return '';
  const p = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

// Gráfico de área con curva suave, dibujado a mano con react-native-svg
// (Catmull-Rom para la curva) + Reanimated (trazo que se "dibuja" al
// aparecer, puntos que hacen pop) -- pedido explícito para reemplazar las
// barras planas de "Esta semana" en Agua y Pasos por algo "más animado y
// dinámico", sin instalar una librería de gráficos nueva.
//
// La longitud exacta del trazo (para el efecto de dibujado con
// strokeDasharray/strokeDashoffset) se mide con svg-path-properties
// (dependencia YA instalada en el proyecto, usada también en
// components/WorkoutProgress.tsx) -- con una curva Bézier no hay fórmula
// cerrada simple para la longitud, así que en vez de aproximarla a mano se
// mide el path real ya construido.
export default function SmoothAreaChart({
  data,
  goalValue,
  height = 120,
  color = '#49C5B6',
  achievedColor = '#34C759',
  goalColor = 'rgba(120,120,128,0.4)',
  labelColor = '#8B8C8E',
  duration = 900,
}: SmoothAreaChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const PADDING_TOP = 14;
  const PADDING_BOTTOM = 4;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const maxValue = Math.max(1, ...data.map((d) => d.value), goalValue ?? 0);

  const points: Pt[] = useMemo(() => {
    if (width <= 0 || data.length === 0) return [];
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    return data.map((d, i) => ({
      x: data.length > 1 ? i * step : width / 2,
      y: PADDING_TOP + plotHeight - (d.value / maxValue) * plotHeight,
    }));
  }, [data, width, maxValue, plotHeight]);

  const linePath = useMemo(() => catmullRomPath(points), [points]);
  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;
  }, [linePath, points, height]);

  const lineLength = useMemo(() => {
    if (!linePath) return 0;
    try {
      return new svgPathProperties(linePath).getTotalLength();
    } catch {
      return 0;
    }
  }, [linePath]);

  const drawProgress = useSharedValue(0);
  const dotsProgress = useSharedValue(0);
  useEffect(() => {
    if (lineLength <= 0) return;
    drawProgress.value = 0;
    dotsProgress.value = 0;
    drawProgress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
    dotsProgress.value = withDelay(duration * 0.5, withTiming(1, { duration: 350, easing: Easing.out(Easing.back(2)) }));
  }, [lineLength, duration, drawProgress, dotsProgress]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLength * (1 - drawProgress.value),
  }));
  const areaOpacityProps = useAnimatedProps(() => ({
    opacity: drawProgress.value,
  }));

  const goalY =
    goalValue != null && goalValue > 0 ? PADDING_TOP + plotHeight - (goalValue / maxValue) * plotHeight : null;

  return (
    <View onLayout={onLayout}>
      {width > 0 && points.length > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaFillGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {goalY != null && (
            <Line
              x1={0}
              y1={goalY}
              x2={width}
              y2={goalY}
              stroke={goalColor}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          )}

          {areaPath && (
            <AnimatedPath d={areaPath} fill="url(#areaFillGradient)" animatedProps={areaOpacityProps} />
          )}

          {linePath && (
            <AnimatedPath
              d={linePath}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={lineLength}
              animatedProps={lineProps}
            />
          )}

          {points.map((pt, i) => {
            const d = data[i];
            const dotColor = d.achieved ? achievedColor : color;
            return (
              <React.Fragment key={i}>
                {d.isToday && <Circle cx={pt.x} cy={pt.y} r={9} fill={dotColor} opacity={0.2} />}
                <AnimatedDot
                  cx={pt.x}
                  cy={pt.y}
                  color={dotColor}
                  radius={d.isToday ? 5.5 : 4}
                  progress={dotsProgress}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      )}
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.label,
              { color: d.isToday ? color : labelColor },
              d.isToday && styles.labelToday,
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  labelToday: {
    fontWeight: '700',
  },
});
