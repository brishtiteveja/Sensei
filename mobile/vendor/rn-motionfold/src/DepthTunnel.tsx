import React, { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export interface DepthTunnelItem {
  id: string | number;
  x: number;
  y: number;
}

export interface DepthTunnelProps<T extends DepthTunnelItem = DepthTunnelItem> {
  items: T[];
  cycleDuration?: number;
  perspective?: number;
  prefill?: boolean;
  children: (item: T, index: number) => ReactNode;
  style?: ViewStyle;
}

function TunnelItem<T extends DepthTunnelItem>({
  item,
  index,
  total,
  cycleDuration,
  prefill,
  children,
}: {
  item: T;
  index: number;
  total: number;
  cycleDuration: number;
  prefill: boolean;
  children: (item: T, index: number) => ReactNode;
}) {
  const progress = useSharedValue(prefill ? (index / total) : 0);
  const stagger = (index / total) * cycleDuration * 1000;

  useEffect(() => {
    if (prefill) {
      progress.value = withRepeat(
        withTiming(1, {
          duration: cycleDuration * 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      progress.value = withDelay(
        stagger,
        withRepeat(
          withTiming(1, {
            duration: cycleDuration * 1000,
            easing: Easing.linear,
          }),
          -1,
          false,
        ),
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value % 1;
    const scale = interpolate(p, [0, 1], [0.03, 1.4], Extrapolation.CLAMP);
    const opacity = interpolate(
      p,
      [0, 0.1, 0.85, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(
      p,
      [0, 1],
      [0, (item.x - 50) * 4],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      p,
      [0, 1],
      [0, (item.y - 50) * 4],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${item.x}%` as any,
          top: `${item.y}%` as any,
        },
        animatedStyle,
      ]}
    >
      {children(item, index)}
    </Animated.View>
  );
}

export function DepthTunnel<T extends DepthTunnelItem>({
  items,
  cycleDuration = 7,
  perspective = 1200,
  prefill = false,
  children,
  style,
}: DepthTunnelProps<T>) {
  return (
    <View
      style={[
        {
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {items.map((item, i) => (
        <TunnelItem
          key={item.id}
          item={item}
          index={i}
          total={items.length}
          cycleDuration={cycleDuration}
          prefill={prefill}
          children={children}
        />
      ))}
    </View>
  );
}
