import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ChatChoice, OnboardlyTheme } from '../types';

type Props = {
  options: ChatChoice[];
  selection: string[];
  onToggle: (label: string) => void;
  theme: OnboardlyTheme;
};

export const ChipPicker: React.FC<Props> = ({
  options,
  selection,
  onToggle,
  theme,
}) => (
  <View style={styles.wrap}>
    {options.map((o) => {
      const active = selection.includes(o.label);
      return (
        <Pressable
          key={o.label}
          onPress={() => onToggle(o.label)}
          style={[
            styles.chip,
            {
              borderColor: theme.chipBorder ?? theme.primary,
              borderRadius: 999,
              backgroundColor: active
                ? theme.chipActiveBg ?? theme.primary
                : 'transparent',
            },
          ]}
        >
          {o.emoji ? <Text style={{ fontSize: 15 }}>{o.emoji}</Text> : null}
          <Text
            style={[
              styles.text,
              {
                color: active
                  ? theme.chipActiveText ?? theme.primaryText
                  : theme.text,
                fontFamily: theme.fontFamilyBold ?? theme.fontFamily,
              },
            ]}
          >
            {o.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  text: { fontSize: 15, fontWeight: '600' },
});
