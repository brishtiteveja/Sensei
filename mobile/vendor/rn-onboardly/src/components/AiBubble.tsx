import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import type { OnboardlyTheme } from '../types';

type Props = {
  text: string;
  theme: OnboardlyTheme;
};

export const AiBubble: React.FC<Props> = ({ text, theme }) => (
  <Animated.View entering={FadeInLeft.duration(300)} style={styles.row}>
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.bubbleAi ?? '#F0F4FA',
          borderRadius: theme.borderRadius,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 16,
          lineHeight: 22,
          color: theme.bubbleAiText ?? theme.text,
          fontFamily: theme.fontFamily,
        }}
      >
        {text}
      </Text>
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  row: { alignSelf: 'flex-start', maxWidth: '86%' },
  bubble: { borderBottomLeftRadius: 4, padding: 12 },
});
