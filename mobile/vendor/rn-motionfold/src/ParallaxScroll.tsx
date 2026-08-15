import React, { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export interface ParallaxScrollProps {
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function ParallaxScroll({
  children,
  style,
  contentContainerStyle,
}: ParallaxScrollProps) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <ParallaxScrollContext.Provider value={scrollY}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={style}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </Animated.ScrollView>
    </ParallaxScrollContext.Provider>
  );
}

const ParallaxScrollContext = React.createContext<Animated.SharedValue<number>>(
  { value: 0 } as any,
);

export interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number;
  offset?: number;
  style?: ViewStyle;
}

export function ParallaxLayer({
  children,
  speed = 0.5,
  offset = 0,
  style,
}: ParallaxLayerProps) {
  const scrollY = React.useContext(ParallaxScrollContext);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [offset - 500, offset, offset + 500],
      [50 * speed, 0, -50 * speed],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
