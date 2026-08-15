import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';

interface AskAIButtonProps {
  selectedText: string;
  onAsk: () => void;
  onDismiss: () => void;
  bottomOffset?: number;
}

export function AskAIButton({ selectedText, onAsk, onDismiss, bottomOffset = 20 }: AskAIButtonProps) {
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t } = useI18n();
  if (!selectedText.trim()) return null;

  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: bottomOffset, zIndex: 40 }}>
      <View
        className="rounded-2xl p-3 border shadow-lg shadow-black/20"
        style={{ backgroundColor: theme.surface, borderColor: theme.accentSoft }}
      >
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="font-space-medium text-xs" style={{ color: theme.textMuted }}>{t('common.selectedText')}</Text>
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.7}
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.surfaceAlt }}
          >
            <X size={14} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <Text className="font-space text-sm mb-2.5 leading-[18px]" style={{ color: theme.textSoft }} numberOfLines={2}>
          "{selectedText}"
        </Text>
        <TouchableOpacity onPress={onAsk} activeOpacity={0.85}>
          <View className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-app-brand">
            <Sparkles size={14} color={theme.textInverse} />
            <Text className="font-space-semibold text-sm text-white">{t('mocktest.askAiAction')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
