import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

type Props = {
  emoji: string;
  size?: number;
};

export const AnimatedEmoji: React.FC<Props> = ({ emoji, size = 80 }) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 7, stiffness: 120 });
    rotate.value = withRepeat(
      withSequence(
        withTiming(-0.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [emoji]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}rad` }],
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
};
