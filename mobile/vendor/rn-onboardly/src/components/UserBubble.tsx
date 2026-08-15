import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import type { OnboardlyTheme } from '../types';

type Props = {
  text: string;
  theme: OnboardlyTheme;
};

export const UserBubble: React.FC<Props> = ({ text, theme }) => (
  <Animated.View entering={FadeInRight.duration(300)} style={styles.row}>
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.bubbleUser ?? '#E0ECFF',
          borderRadius: theme.borderRadius,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 16,
          lineHeight: 22,
          color: theme.bubbleUserText ?? theme.text,
          fontFamily: theme.fontFamily,
        }}
      >
        {text}
      </Text>
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  row: { alignSelf: 'flex-end', maxWidth: '82%', marginTop: 8 },
  bubble: { borderBottomRightRadius: 4, padding: 12 },
});
