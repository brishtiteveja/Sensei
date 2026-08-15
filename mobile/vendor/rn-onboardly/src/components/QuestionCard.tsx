import React, { type ReactNode } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import type {
  OnboardlyQuestion,
  OnboardlyTheme,
  OnboardlyAnimation,
} from '../types';
import { AnimatedEmoji } from './AnimatedEmoji';
import { OptionButton } from './OptionButton';
import { TypewriterText } from './TypewriterText';

type Props = {
  question: OnboardlyQuestion;
  selectedIds: string[];
  onToggle: (optionId: string) => void;
  theme: OnboardlyTheme;
  animation: OnboardlyAnimation;
  mascot?: ReactNode;
};

const getEntering = (a: OnboardlyAnimation) => {
  if (a === 'fade') return FadeIn.duration(400);
  if (a === 'spring') return ZoomIn.duration(450);
  if (a === 'slide') return SlideInRight.duration(400);
  return FadeInRight.duration(400);
};

const getExiting = (a: OnboardlyAnimation) => {
  if (a === 'fade') return FadeOut.duration(250);
  if (a === 'spring') return ZoomOut.duration(250);
  if (a === 'slide') return SlideOutLeft.duration(250);
  return FadeOutLeft.duration(250);
};

export const QuestionCard: React.FC<Props> = ({
  question,
  selectedIds,
  onToggle,
  theme,
  animation,
  mascot,
}) => {
  const layout = question.layout ?? 'list';
  const hasCustomContent = Boolean(question.content);
  const options = question.options ?? [];
  const isIntroStep = hasCustomContent && !options.length;

  return (
    <Animated.View
      key={question.id}
      entering={getEntering(animation)}
      exiting={getExiting(animation)}
      style={{
        flex: 1,
        justifyContent: isIntroStep ? 'center' : 'flex-start',
      }}
    >
      {question.content ? (
        <View style={{ alignItems: 'center', marginBottom: question.title ? 24 : 0 }}>
          {question.content}
        </View>
      ) : null}
      {mascot && !hasCustomContent ? (
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          {mascot}
        </View>
      ) : null}
      {question.emoji && !hasCustomContent && !mascot ? (
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <AnimatedEmoji emoji={question.emoji} size={76} />
        </View>
      ) : null}
      {question.title ? (
        question.titleAnimation === 'typewriter' ? (
          <TypewriterText
            text={question.title}
            speed={question.titleAnimationSpeed}
            startDelay={question.titleAnimationDelay}
            style={{
              color: theme.text,
              fontSize: 24,
              fontWeight: '800',
              textAlign: 'center',
              fontFamily: theme.fontFamilyBold,
              marginBottom: 8,
            }}
          />
        ) : (
          <Text
            style={{
              color: theme.text,
              fontSize: 24,
              fontWeight: '800',
              textAlign: 'center',
              fontFamily: theme.fontFamilyBold,
              marginBottom: 8,
            }}
          >
            {question.title}
          </Text>
        )
      ) : null}
      {question.subtitle ? (
        question.subtitleAnimation === 'typewriter' ? (
          <TypewriterText
            text={question.subtitle}
            speed={question.subtitleAnimationSpeed}
            startDelay={question.subtitleAnimationDelay}
            style={{
              color: theme.textMuted,
              fontSize: 15,
              textAlign: 'center',
              fontFamily: theme.fontFamily,
              marginBottom: 24,
              paddingHorizontal: 8,
            }}
          />
        ) : (
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 15,
              textAlign: 'center',
              fontFamily: theme.fontFamily,
              marginBottom: 24,
              paddingHorizontal: 8,
            }}
          >
            {question.subtitle}
          </Text>
        )
      ) : null}
      {!hasCustomContent && options.length > 0 ? (
        <View
          style={{
            flexDirection: layout === 'grid' ? 'row' : 'column',
            flexWrap: layout === 'grid' ? 'wrap' : 'nowrap',
            marginHorizontal: layout === 'grid' ? -6 : 0,
            overflow: 'visible',
          }}
        >
          {options.map((opt) => (
            <View
              key={opt.id}
              style={layout === 'grid' ? { width: '50%' } : undefined}
            >
              <OptionButton
                option={opt}
                selected={selectedIds.includes(opt.id)}
                onPress={() => onToggle(opt.id)}
                theme={theme}
                layout={layout}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
};
