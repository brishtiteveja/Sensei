import React, { useEffect, useState } from 'react';
import { Text, type TextStyle, View } from 'react-native';

type Props = {
  text: string;
  speed?: number;
  startDelay?: number;
  style?: TextStyle;
};

export const TypewriterText: React.FC<Props> = ({
  text,
  speed = 55,
  startDelay = 0,
  style,
}) => {
  const [output, setOutput] = useState('');

  useEffect(() => {
    setOutput('');

    let index = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    const startTimer = setTimeout(() => {
      timer = setInterval(() => {
        index += 1;
        setOutput(text.slice(0, index));

        if (index >= text.length && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (timer) clearInterval(timer);
    };
  }, [speed, startDelay, text]);

  return (
    <View>
      <Text style={style}>{output}</Text>
    </View>
  );
};
