/**
 * Small shared primitives.
 *
 * `Txt` exists so that no screen ever renders a bare <Text>: every string in the app has
 * to go through the bundled Bengali-capable family, or Bangla silently degrades to a
 * system fallback with different metrics (and, on some Android builds, tofu).
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius, space } from '../theme';

export function Txt({
  children,
  size = 15,
  bold,
  color = colors.text,
  style,
  numberOfLines,
  selectable,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: bold ? fonts.bold : fonts.regular,
          fontSize: size,
          // Bengali needs vertical room: matras sit above and below the baseline and
          // clip at the default line height.
          lineHeight: Math.round(size * 1.55),
          color,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    kind === 'primary' ? colors.accent : kind === 'danger' ? 'transparent' : colors.surfaceAlt;
  const fg = kind === 'primary' ? '#0B0F14' : kind === 'danger' ? colors.danger : colors.text;
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          opacity: off ? 0.45 : pressed ? 0.75 : 1,
          borderWidth: kind === 'danger' ? 1 : 0,
          borderColor: colors.danger,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Txt bold color={fg}>{label}</Txt>}
    </Pressable>
  );
}

export function Field(
  props: TextInputProps & { label?: string; containerStyle?: StyleProp<ViewStyle> },
) {
  const { label, style, containerStyle, ...rest } = props;
  return (
    <View style={[{ gap: space.xs }, containerStyle]}>
      {label ? <Txt size={12} color={colors.textDim}>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
        style={[styles.input, style]}
      />
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Coloured status dot + label. Used for the warm/cold indicator. */
export function Dot({ color }: { color: string }) {
  return <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />;
}

export function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Txt size={19} bold>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={12} color={colors.textDim} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <View style={styles.errorNote}>
      <Txt size={13} color={colors.danger}>
        {message}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  errorNote: {
    backgroundColor: 'rgba(229,72,77,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.4)',
    borderRadius: radius.md,
    padding: space.md,
  },
});
