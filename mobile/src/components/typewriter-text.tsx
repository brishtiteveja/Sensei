import React, { useEffect, useState } from 'react';
import { Text, type TextStyle, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  text: string;
  /** ms per character */
  speed?: number;
  /** ms to wait before typing starts */
  startDelay?: number;
  /** show a blinking cursor at the end */
  cursor?: boolean;
  style?: TextStyle;
  cursorColor?: string;
  onDone?: () => void;
};

export const TypewriterText: React.FC<Props> = ({
  text,
  speed = 70,
  startDelay = 0,
  cursor = true,
  style,
  cursorColor,
  onDone,
}) => {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    setOut('');
    setDone(false);
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          if (timer) clearInterval(timer);
          setDone(true);
          onDone?.();
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [text, speed, startDelay]);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 450 }),
        withTiming(1, { duration: 450 })
      ),
      -1,
      false
    );
  }, []);

  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));

  const color = (style?.color as string | undefined) ?? '#0f172a';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={style}>{out}</Text>
      {cursor && !done ? (
        <Animated.View
          style={[
            {
              width: 3,
              height: (style?.fontSize ?? 16) * 1.1,
              backgroundColor: cursorColor ?? color,
              marginLeft: 4,
              borderRadius: 1,
            },
            cursorStyle,
          ]}
        />
      ) : null}
    </View>
  );
};
