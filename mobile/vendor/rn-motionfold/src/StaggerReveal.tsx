import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  ZoomIn,
  type EntryExitAnimationFunction,
  type AnimationCallback,
} from 'react-native-reanimated';

export type RevealDirection = 'up' | 'down' | 'fade' | 'zoom';

export interface StaggerRevealProps {
  children: ReactNode[];
  stagger?: number;
  duration?: number;
  direction?: RevealDirection;
  initialDelay?: number;
  style?: ViewStyle;
}

function getEntering(direction: RevealDirection, delay: number, duration: number) {
  switch (direction) {
    case 'up':
      return FadeInUp.delay(delay).duration(duration);
    case 'down':
      return FadeInDown.delay(delay).duration(duration);
    case 'zoom':
      return ZoomIn.delay(delay).duration(duration);
    case 'fade':
    default:
      return FadeIn.delay(delay).duration(duration);
  }
}

export function StaggerReveal({
  children,
  stagger = 100,
  duration = 400,
  direction = 'up',
  initialDelay = 0,
  style,
}: StaggerRevealProps) {
  const items = React.Children.toArray(children);

  return (
    <View style={style}>
      {items.map((child, i) => (
        <Animated.View
          key={i}
          entering={getEntering(direction, initialDelay + i * stagger, duration)}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
}

export interface StaggerItemProps {
  children: ReactNode;
  index: number;
  stagger?: number;
  duration?: number;
  direction?: RevealDirection;
  initialDelay?: number;
  style?: ViewStyle;
}

export function StaggerItem({
  children,
  index,
  stagger = 100,
  duration = 400,
  direction = 'up',
  initialDelay = 0,
  style,
}: StaggerItemProps) {
  return (
    <Animated.View
      entering={getEntering(direction, initialDelay + index * stagger, duration)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
