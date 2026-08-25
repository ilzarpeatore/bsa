import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColorMode } from '@helper/useAppColorMode';

export interface AppIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  bg?: string;
  containerSize?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function AppIcon({
  name,
  size = 18,
  color,
  bg,
  containerSize = 36,
  borderRadius,
  style,
}: AppIconProps) {
  const { colors: C } = useAppColorMode();
  return (
    <View
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: borderRadius ?? containerSize / 2,
          backgroundColor: bg ?? C.brand10,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? C.textPrimary} />
    </View>
  );
}
