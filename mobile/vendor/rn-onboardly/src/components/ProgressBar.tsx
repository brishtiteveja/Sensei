import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  progress: number;
  color: string;
  bg: string;
};

export const ProgressBar: React.FC<Props> = ({ progress, color, bg }) => {
  const animated = useDerivedValue(() =>
    withTiming(progress, { duration: 450 })
  );
  const style = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, animated.value * 100))}%`,
  }));
  return (
    <View
      style={{
        height: 8,
        backgroundColor: bg,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          { height: '100%', backgroundColor: color, borderRadius: 4 },
          style,
        ]}
      />
    </View>
  );
};
