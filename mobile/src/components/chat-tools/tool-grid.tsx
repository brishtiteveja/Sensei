import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import {
  Calculator,
  Pen,
  Mic,
  FunctionSquare,
  Camera,
  Paperclip,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';

export type ToolType =
  | 'calculator'
  | 'drawing'
  | 'voice'
  | 'equation'
  | 'camera'
  | 'file';

interface ToolDef {
  type: ToolType;
  labelKey: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}

const TOOLS: ToolDef[] = [
  { type: 'calculator', labelKey: 'chatTools.calculator', Icon: Calculator },
  { type: 'drawing', labelKey: 'chatTools.drawing', Icon: Pen },
  { type: 'voice', labelKey: 'chatTools.voice', Icon: Mic },
  { type: 'equation', labelKey: 'chatTools.equation', Icon: FunctionSquare },
  { type: 'camera', labelKey: 'chatTools.camera', Icon: Camera },
  { type: 'file', labelKey: 'chatTools.file', Icon: Paperclip },
];

interface ToolGridProps {
  visible: boolean;
  onSelectTool: (tool: ToolType) => void;
}

export function ToolGrid({ visible, onSelectTool }: ToolGridProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, heightAnim]);

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const animatedOpacity = heightAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handlePress = (tool: ToolType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTool(tool);
  };

  return (
    <Animated.View
      style={{
        height: animatedHeight,
        opacity: animatedOpacity,
        overflow: 'hidden',
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        {TOOLS.map(({ type, labelKey, Icon }) => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.7}
            onPress={() => handlePress(type)}
            accessibilityLabel={t(labelKey)}
            accessibilityRole="button"
            style={{
              width: '33.33%',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
              }}
            >
              <Icon size={20} color={theme.accent} />
            </View>
            <Text
              style={{
                fontFamily: 'SpaceGrotesk-Medium',
                fontSize: 12,
                color: theme.textSoft,
              }}
              numberOfLines={1}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}
