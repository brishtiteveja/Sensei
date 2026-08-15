import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  OnboardlyProps,
  OnboardlyTheme,
  OnboardlyAnswers,
  OnboardlyColorScheme,
  OnboardlyLocaleStrings,
} from './types';
import { defaultTheme } from './theme/defaultTheme';
import { defaultDarkTheme } from './theme/defaultDarkTheme';
import { QuestionCard } from './components/QuestionCard';
import { ProgressBar } from './components/ProgressBar';

const DEFAULT_LABELS: OnboardlyLocaleStrings = {
  nextLabel: 'Continue',
  skipLabel: 'Skip',
  finishLabel: 'Finish',
  skipAllLabel: 'Skip all',
};

export const OnboardingFlow: React.FC<OnboardlyProps> = ({
  questions,
  theme: themeOverrides,
  darkTheme: darkThemeOverrides,
  colorScheme = 'system',
  animation = 'slide',
  onComplete,
  onSkipAll,
  mascot,
  mascotPosition = 'top',
  localeStrings,
  showProgress = true,
  showBack = true,
}) => {
  const systemScheme = useColorScheme();
  const resolvedColorScheme: Exclude<OnboardlyColorScheme, 'system'> =
    colorScheme === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : colorScheme;

  const theme: OnboardlyTheme =
    resolvedColorScheme === 'dark'
      ? { ...defaultDarkTheme, ...themeOverrides, ...darkThemeOverrides }
      : { ...defaultTheme, ...themeOverrides };
  const labels = { ...DEFAULT_LABELS, ...localeStrings };

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardlyAnswers>({});

  const q = questions[currentStep];
  const selectedIds = (q && answers[q.id]) || [];
  const isLast = currentStep === questions.length - 1;
  const hasOptions = !!q?.options && q.options.length > 0;
  const minSelect = q?.minSelect ?? 1;
  const canContinue = hasOptions ? selectedIds.length >= minSelect : true;

  const setAnswer = useCallback((questionId: string, optionIds: string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIds }));
  }, []);

  const onToggle = (optionId: string) => {
    if (!q) return;
    if (q.multiSelect) {
      const nextIds = selectedIds.includes(optionId)
        ? selectedIds.filter((i) => i !== optionId)
        : [...selectedIds, optionId];
      setAnswer(q.id, nextIds);
    } else {
      setAnswer(q.id, [optionId]);
    }
  };

  const finish = () => {
    const finalAnswers = { ...answers };
    if (q && selectedIds.length) finalAnswers[q.id] = selectedIds;
    onComplete(finalAnswers);
  };

  const handleNext = () => {
    if (!canContinue) return;
    if (isLast) finish();
    else setCurrentStep((s) => s + 1);
  };

  const handleSkip = () => {
    if (isLast) finish();
    else setCurrentStep((s) => s + 1);
  };

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSkipAll = () => {
    if (onSkipAll) onSkipAll();
  };

  if (!q) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 0,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
            paddingHorizontal: 20,
          }}
        >
          {showBack && currentStep > 0 ? (
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={{ marginRight: 12, paddingHorizontal: 4 }}
            >
              <Text style={{ color: theme.text, fontSize: 26, lineHeight: 28 }}>
                ‹
              </Text>
            </Pressable>
          ) : null}
          {showProgress && currentStep > 0 ? (
            <View style={{ flex: 1 }}>
              <ProgressBar
                progress={(currentStep + 1) / questions.length}
                color={theme.primary}
                bg={theme.border}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {onSkipAll && currentStep > 0 ? (
            <Pressable
              onPress={handleSkipAll}
              hitSlop={12}
              style={{ marginLeft: 12 }}
            >
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 14,
                  fontFamily: theme.fontFamily,
                }}
              >
                {labels.skipAllLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {mascot && mascotPosition === 'top' && q.showMascot !== false ? (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            {mascot}
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <QuestionCard
            question={q}
            selectedIds={selectedIds}
            onToggle={onToggle}
            theme={theme}
            animation={animation}
            mascot={
              mascot && mascotPosition === 'above-title' && q.showMascot !== false
                ? mascot
                : undefined
            }
          />
        </ScrollView>

        <View style={{ paddingHorizontal: 20 }}>
          <Pressable
            onPress={handleNext}
            disabled={!canContinue}
            style={{
              backgroundColor: canContinue ? theme.primary : theme.border,
              borderRadius: theme.borderRadius,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: canContinue ? 1 : 0.7,
            }}
          >
            <Text
              style={{
                color: canContinue ? theme.primaryText : theme.textMuted,
                fontSize: 16,
                fontWeight: '700',
                fontFamily: theme.fontFamilyBold,
              }}
            >
              {isLast ? labels.finishLabel : labels.nextLabel}
            </Text>
          </Pressable>
          {q.skippable ? (
            <Pressable
              onPress={handleSkip}
              style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
            >
              <Text
                style={{
                  color: theme.textMuted,
                  fontFamily: theme.fontFamily,
                  fontSize: 14,
                }}
              >
                {labels.skipLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};
