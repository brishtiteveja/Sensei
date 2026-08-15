import React, { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface GlowBorderProps {
  children: ReactNode;
  active?: boolean;
  colors?: string[];
  blur?: number;
  duration?: number;
  size?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const DEFAULT_COLORS = ['#4F46E5', '#06B6D4', '#F4C542', '#E85D4A'];

export function GlowBorder({
  children,
  active = true,
  colors = DEFAULT_COLORS,
  blur = 40,
  duration = 6,
  size = 24,
  borderRadius = 40,
  style,
}: GlowBorderProps) {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: duration * 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      opacity.value = withTiming(0.6, { duration: 800 });
    } else {
      opacity.value = withTiming(0, { duration: 400 });
    }
  }, [active]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Glow layers — 4 offset colored shadows rotating */}
      {colors.map((color, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius,
              borderWidth: 3,
              borderColor: color,
              shadowColor: color,
              shadowOffset: {
                width: Math.cos((i / colors.length) * Math.PI * 2) * size,
                height: Math.sin((i / colors.length) * Math.PI * 2) * size,
              },
              shadowOpacity: 0.8,
              shadowRadius: blur,
              elevation: 0,
            },
            glowStyle,
          ]}
        />
      ))}
      {children}
    </View>
  );
}
