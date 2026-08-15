import React, { type ReactNode } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { OnboardlyTheme } from '../types';
import { SendFab } from './SendFab';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  canSend: boolean;
  placeholder?: string;
  helper?: string;
  theme: OnboardlyTheme;
  sendIcon?: ReactNode;
};

export const TextInputDock: React.FC<Props> = ({
  value,
  onChangeText,
  onSend,
  canSend,
  placeholder,
  helper,
  theme,
  sendIcon,
}) => (
  <View>
    {helper ? (
      <View
        style={[
          styles.helper,
          {
            backgroundColor: theme.bubbleAi ?? '#E8F1FE',
            borderRadius: theme.borderRadius,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 14,
            color: theme.text,
            fontWeight: '500',
            fontFamily: theme.fontFamily,
          }}
        >
          {helper}
        </Text>
      </View>
    ) : null}
    <View style={styles.row}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg ?? '#F0F0F2',
            borderRadius: theme.borderRadius,
            color: theme.text,
            fontFamily: theme.fontFamily,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSend}
        returnKeyType="send"
      />
      <SendFab enabled={canSend} onPress={onSend} theme={theme} icon={sendIcon} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  helper: { paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
});
