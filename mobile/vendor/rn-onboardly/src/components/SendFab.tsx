import React, { type ReactNode } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import type { OnboardlyTheme } from '../types';

type Props = {
  enabled: boolean;
  onPress: () => void;
  theme: OnboardlyTheme;
  icon?: ReactNode;
};

export const SendFab: React.FC<Props> = ({ enabled, onPress, theme, icon }) => (
  <Pressable
    disabled={!enabled}
    onPress={onPress}
    style={[
      styles.fab,
      {
        backgroundColor: enabled
          ? theme.fabBg ?? theme.primary
          : theme.fabDisabledBg ?? theme.border,
      },
    ]}
  >
    {icon ?? <Text style={styles.arrow}>{'↑'}</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  arrow: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
