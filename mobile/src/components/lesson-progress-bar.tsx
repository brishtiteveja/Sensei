import React from 'react';
import { View, Text } from 'react-native';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';

interface Props {
  currentStep: number;
  totalSteps: number;
  lessonTitle?: string;
}

const STEP_LABELS_EN = ['Intro', 'Concept', 'Practice', 'Mastery'];
const STEP_LABELS_BN = ['পরিচিতি', 'ধারণা', 'অনুশীলন', 'দক্ষতা'];

export function LessonProgressBar({ currentStep, totalSteps, lessonTitle }: Props) {
  const theme = useAppTheme();
  const { language } = useI18n();
  const labels = language === 'bn' ? STEP_LABELS_BN : STEP_LABELS_EN;
  const steps = totalSteps <= 4 ? labels.slice(0, totalSteps) : labels;
  const progress = Math.min(currentStep / totalSteps, 1);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      {lessonTitle && (
        <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, color: theme.textMuted, marginBottom: 6 }} numberOfLines={1}>
          {lessonTitle}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {steps.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                height: 4, width: '100%', borderRadius: 2,
                backgroundColor: done ? theme.accent : active ? theme.accent + '60' : theme.border,
              }} />
              <Text style={{
                fontFamily: active ? 'SpaceGrotesk_600SemiBold' : 'SpaceGrotesk_400Regular',
                fontSize: 9, marginTop: 3,
                color: done ? theme.accent : active ? theme.text : theme.textDisabled,
              }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
