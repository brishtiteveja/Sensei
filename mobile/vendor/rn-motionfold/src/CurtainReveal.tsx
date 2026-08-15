import React, { useEffect, useState, type ReactNode } from 'react';
import { View, type ViewStyle, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated';

export type CurtainExit = 'up' | 'down' | 'fade';

export interface CurtainRevealProps {
  children: ReactNode;
  curtainContent?: ReactNode;
  curtainColor?: string;
  hold?: number;
  duration?: number;
  exit?: CurtainExit;
  disabled?: boolean;
  onComplete?: () => void;
  style?: ViewStyle;
}

export function CurtainReveal({
  children,
  curtainContent,
  curtainColor = '#09090B',
  hold = 1.6,
  duration = 0.9,
  exit = 'up',
  disabled = false,
  onComplete,
  style,
}: CurtainRevealProps) {
  const { height } = useWindowDimensions();
  const [lifted, setLifted] = useState(disabled);
  const curtainY = useSharedValue(0);
  const curtainOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(disabled ? 1 : 0);

  const markLifted = () => {
    setLifted(true);
    onComplete?.();
  };

  useEffect(() => {
    if (disabled) return;

    const holdMs = hold * 1000;
    const durMs = duration * 1000;

    if (exit === 'fade') {
      curtainOpacity.value = withDelay(
        holdMs,
        withTiming(0, { duration: durMs, easing: Easing.inOut(Easing.cubic) }),
      );
    } else {
      const dir = exit === 'down' ? height : -height;
      curtainY.value = withDelay(
        holdMs,
        withTiming(dir, { duration: durMs, easing: Easing.inOut(Easing.cubic) }),
      );
    }

    contentOpacity.value = withDelay(
      holdMs + durMs * 0.3,
      withTiming(1, { duration: durMs * 0.7 }),
    );

    const timer = setTimeout(markLifted, holdMs + durMs);
    return () => clearTimeout(timer);
  }, [disabled]);

  const curtainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: curtainY.value }],
    opacity: curtainOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={[{ flex: 1, position: 'relative' }, style]}>
      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        {children}
      </Animated.View>

      {!lifted && (
        <Animated.View
          style={[
            {
              ...fullCover,
              backgroundColor: curtainColor,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            },
            curtainStyle,
          ]}
        >
          {curtainContent}
        </Animated.View>
      )}
    </View>
  );
}

const fullCover: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
