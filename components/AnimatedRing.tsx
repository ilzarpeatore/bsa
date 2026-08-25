import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useAppColorMode } from '@helper/useAppColorMode';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AnimatedRingProps {
  size?: number;
  strokeWidth?: number;
  percent: number;
  color?: string;
  trackColor?: string;
  duration?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedRing({
  size = 96,
  strokeWidth = 8,
  percent,
  color,
  trackColor,
  duration = 900,
  children,
  style,
}: AnimatedRingProps) {
  const { colors: C } = useAppColorMode();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = useSharedValue(circumference);

  useEffect(() => {
    offset.value = circumference;
    offset.value = withTiming(
      circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100),
      { duration }
    );
  }, [percent, circumference, duration, offset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? C.gray70}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? C.orange}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </View>
    </View>
  );
}
