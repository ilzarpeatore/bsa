import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useResponsiveStyleSheet } from "@helper/responsiveStyleSheet";
import { useAppColorMode } from "@helper/useAppColorMode";

interface Props {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
}

function LoadingSkeleton({ width, height, borderRadius }: Props) {
  const { colors: C } = useAppColorMode();
  const styles = useStyle(C);
  const pulse = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const containerStyle = [
    styles.skeleton,
    width != null ? { width } : undefined,
    height != null ? { height } : undefined,
    borderRadius != null ? { borderRadius } : undefined,
  ];

  return <Animated.View style={[containerStyle, pulseStyle]} />;
}

export const LoadingSkeletonMem = React.memo(LoadingSkeleton);

function useStyle(C: ReturnType<typeof useAppColorMode>['colors']) {
  return useResponsiveStyleSheet(
    {
      skeleton: {
        width: "100%",
        height: "20@ratio",
        backgroundColor: C.gray20,
        borderRadius: "8@ratio",
      },
    },
    [C]
  );
}
