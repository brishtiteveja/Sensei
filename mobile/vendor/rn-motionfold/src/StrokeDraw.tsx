import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface StrokeDrawProps {
  d: string;
  pathLength: number;
  stroke?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  viewBox?: string;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function StrokeDraw({
  d,
  pathLength,
  stroke = '#06B6D4',
  strokeWidth = 3,
  width = 200,
  height = 200,
  viewBox = '0 0 200 200',
  delay = 0,
  duration = 1500,
  style,
}: StrokeDrawProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
  }, []);

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  return (
    <View style={style}>
      <Svg width={width} height={height} viewBox={viewBox} fill="none">
        <AnimatedPath
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={pathLength}
          animatedProps={pathProps}
        />
      </Svg>
    </View>
  );
}

export interface CheckmarkDrawProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function CheckmarkDraw({
  size = 80,
  color = '#10B981',
  strokeWidth = 4,
  delay = 0,
  duration = 800,
  style,
}: CheckmarkDrawProps) {
  const circleProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);

  useEffect(() => {
    circleProgress.value = withDelay(
      delay,
      withTiming(1, {
        duration: duration * 0.6,
        easing: Easing.out(Easing.cubic),
      }),
    );
    checkProgress.value = withDelay(
      delay + duration * 0.5,
      withTiming(1, {
        duration: duration * 0.5,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, []);

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const checkPath = `M${size * 0.3} ${size * 0.5} L${size * 0.45} ${size * 0.65} L${size * 0.72} ${size * 0.38}`;
  const checkLen = size * 0.6;

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - circleProgress.value),
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: checkLen * (1 - checkProgress.value),
  }));

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          animatedProps={circleProps}
        />
        <AnimatedPath
          d={checkPath}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={checkLen}
          animatedProps={checkProps}
        />
      </Svg>
    </View>
  );
}
