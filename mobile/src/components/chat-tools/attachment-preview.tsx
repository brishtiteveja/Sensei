import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { FileText } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import type { ChatAttachment } from './index';

interface AttachmentPreviewProps {
  attachments: ChatAttachment[];
  onRemove: (index: number) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  const theme = useAppTheme();

  if (attachments.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          gap: 10,
        }}
      >
        {attachments.map((attachment, index) => (
          <View key={`${attachment.uri}-${index}`} style={{ width: 56, height: 56 }}>
            {attachment.type === 'image' || attachment.type === 'drawing' ? (
              <Image
                source={{ uri: attachment.uri }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  backgroundColor: theme.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <FileText size={20} color={theme.textMuted} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 9,
                    color: theme.textMuted,
                    maxWidth: 48,
                    textAlign: 'center',
                  }}
                >
                  {attachment.name.length > 8
                    ? attachment.name.slice(0, 8) + '…'
                    : attachment.name}
                </Text>
              </View>
            )}

            {/* Remove button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onRemove(index)}
              accessibilityLabel="Remove attachment"
              accessibilityRole="button"
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: theme.danger,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '700',
                  lineHeight: 14,
                  marginTop: -1,
                }}
              >
                ×
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
