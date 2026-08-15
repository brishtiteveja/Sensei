import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  ChatOnboardingProps,
  ChatStep,
  ChatChoice,
  ChatAnswers,
  OnboardlyTheme,
  OnboardlyColorScheme,
  ChatOnboardingLocaleStrings,
} from './types';
import { defaultTheme } from './theme/defaultTheme';
import { defaultDarkTheme } from './theme/defaultDarkTheme';
import { ProgressBar } from './components/ProgressBar';
import { AiBubble } from './components/AiBubble';
import { UserBubble } from './components/UserBubble';
import { ChipPicker } from './components/ChipPicker';
import { SendFab } from './components/SendFab';
import { TextInputDock } from './components/TextInputDock';

const DEFAULT_LABELS: ChatOnboardingLocaleStrings = {
  continueLabel: 'Continue',
};

function resolvePrompt(
  prompt: string | ((a: ChatAnswers) => string),
  answers: ChatAnswers,
): string {
  return typeof prompt === 'function' ? prompt(answers) : prompt;
}

function resolveOptions(
  opts: ChatChoice[] | ((a: ChatAnswers) => ChatChoice[]) | undefined,
  answers: ChatAnswers,
): ChatChoice[] {
  if (!opts) return [];
  return typeof opts === 'function' ? opts(answers) : opts;
}

function choiceLabel(c: ChatChoice): string {
  return c.emoji ? `${c.emoji} ${c.label}` : c.label;
}

function formatUserAnswer(
  step: ChatStep,
  answer: string | string[],
  answers: ChatAnswers,
): string {
  const opts = resolveOptions(step.options, answers);
  if (Array.isArray(answer)) {
    return answer
      .map((lab) => {
        const c = opts.find((o) => o.label === lab);
        return c ? choiceLabel(c) : lab;
      })
      .join(', ');
  }
  const c = opts.find((o) => o.label === answer);
  return c ? choiceLabel(c) : String(answer);
}

export const ChatOnboardingFlow: React.FC<ChatOnboardingProps> = ({
  steps,
  introMessages = [],
  completionMessage,
  theme: themeOverrides,
  darkTheme: darkThemeOverrides,
  colorScheme = 'system',
  onComplete,
  mascot,
  showProgress = true,
  localeStrings,
  sendIcon,
}) => {
  const systemScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const resolvedScheme: Exclude<OnboardlyColorScheme, 'system'> =
    colorScheme === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : colorScheme;

  const theme: OnboardlyTheme =
    resolvedScheme === 'dark'
      ? { ...defaultDarkTheme, ...themeOverrides, ...darkThemeOverrides }
      : { ...defaultTheme, ...themeOverrides };
  const labels = { ...DEFAULT_LABELS, ...localeStrings };

  const scrollRef = useRef<ScrollView>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<ChatAnswers>({});
  const [text, setText] = useState('');
  const [selection, setSelection] = useState<string[]>([]);

  const done = stepIndex >= steps.length;
  const step = done ? null : steps[stepIndex];
  const progress = stepIndex / (steps.length + 1);

  const options = useMemo(
    () => (step ? resolveOptions(step.options, answers) : []),
    [step, answers],
  );

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const commit = useCallback(
    (value: string | string[]) => {
      const next = { ...answers, [steps[stepIndex].id]: value };
      setAnswers(next);
      setSelection([]);
      setText('');
      setStepIndex((i) => i + 1);
      scrollToEnd();
    },
    [answers, stepIndex, steps, scrollToEnd],
  );

  const onSend = useCallback(() => {
    if (!step) return;
    if (step.type === 'text') {
      if (!text.trim()) return;
      commit(text.trim());
    } else if (step.type === 'single') {
      if (!selection[0]) return;
      commit(selection[0]);
    } else {
      if (!selection.length) return;
      commit(selection);
    }
  }, [step, text, selection, commit]);

  const toggle = useCallback(
    (label: string) => {
      if (!step) return;
      if (step.type === 'single') {
        setSelection([label]);
      } else {
        setSelection((s) => {
          if (s.includes(label)) return s.filter((x) => x !== label);
          if (step.max && s.length >= step.max) return s;
          return [...s, label];
        });
      }
    },
    [step],
  );

  const finish = useCallback(() => {
    onComplete(answers);
  }, [answers, onComplete]);

  const canSend =
    step?.type === 'text' ? text.trim().length > 0 : selection.length > 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showProgress ? (
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
            <ProgressBar
              progress={Math.max(progress, 0.04)}
              color={theme.primary}
              bg={theme.ringTrack ?? theme.border}
            />
          </View>
        ) : null}

        {mascot ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>{mascot}</View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 14,
            gap: 10,
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          {introMessages.map((msg, i) => (
            <AiBubble key={`intro-${i}`} text={msg} theme={theme} />
          ))}

          {steps.slice(0, stepIndex).map((s) => {
            const a = answers[s.id];
            return (
              <View key={s.id}>
                <AiBubble
                  text={resolvePrompt(s.prompt, answers)}
                  theme={theme}
                />
                <UserBubble
                  text={formatUserAnswer(s, a, answers)}
                  theme={theme}
                />
              </View>
            );
          })}

          {step ? (
            <AiBubble
              text={resolvePrompt(step.prompt, answers)}
              theme={theme}
            />
          ) : null}

          {done && completionMessage ? (
            <AiBubble text={completionMessage} theme={theme} />
          ) : null}
        </ScrollView>

        <View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 10,
              backgroundColor: theme.background,
            }}
          >
            {done ? (
              <Pressable
                onPress={finish}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: theme.borderRadius,
                  paddingVertical: 16,
                  alignItems: 'center',
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                    fontSize: 18,
                    fontWeight: '700',
                    fontFamily: theme.fontFamilyBold,
                  }}
                >
                  {labels.continueLabel}
                </Text>
              </Pressable>
            ) : step?.type === 'text' ? (
              <TextInputDock
                value={text}
                onChangeText={setText}
                onSend={onSend}
                canSend={canSend}
                placeholder={step.placeholder}
                helper={step.helper}
                theme={theme}
                sendIcon={sendIcon}
              />
            ) : (
              <>
                <ChipPicker
                  options={options}
                  selection={selection}
                  onToggle={toggle}
                  theme={theme}
                />
                <View style={{ alignItems: 'flex-end' }}>
                  <SendFab
                    enabled={canSend}
                    onPress={onSend}
                    theme={theme}
                    icon={sendIcon}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
