import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SenseiRobot } from '@/components/sensei-robot';
import { TypewriterText } from '@/components/typewriter-text';
import { useAppTheme } from '@/theme';

type Props = {
  title: string;
  subtitle: string;
  isDark: boolean;
  showText?: boolean;
};

const ROBOT_APPEAR_MS = 0;
const TITLE_START_MS = 650;
const SUBTITLE_START_MS = 1900;

export const SenseiIntro: React.FC<Props> = ({
  title,
  subtitle,
  isDark,
  showText = true,
}) => {
  const robotScale = useSharedValue(0);
  const robotOpacity = useSharedValue(0);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    robotOpacity.value = withDelay(
      ROBOT_APPEAR_MS,
      withTiming(1, { duration: 300 })
    );
    robotScale.value = withDelay(
      ROBOT_APPEAR_MS,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    if (!showText) return;
    const t1 = setTimeout(() => setShowTitle(true), TITLE_START_MS);
    const t2 = setTimeout(() => setShowSubtitle(true), SUBTITLE_START_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [robotOpacity, robotScale, showText]);

  const robotStyle = useAnimatedStyle(() => ({
    opacity: robotOpacity.value,
    transform: [{ scale: robotScale.value }],
  }));

  const theme = useAppTheme();
  const primary = theme.aiPrimary;
  const accent = theme.aiAccent;
  const glow = theme.aiGlow;
  const titleColor = theme.text;
  const subtitleColor = theme.textMuted;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={robotStyle}>
        <SenseiRobot size={220} primary={primary} accent={accent} glow={glow} />
      </Animated.View>

      {showText ? <View style={{ height: 24 }} /> : null}

      {showText && showTitle ? (
        <Animated.View entering={FadeInUp.duration(300)}>
          <TypewriterText
            text={title}
            speed={65}
            cursorColor={accent}
            style={{
              color: titleColor,
              fontSize: 26,
              fontFamily: 'SpaceGrotesk_700Bold',
              fontWeight: '800',
              textAlign: 'center',
            }}
          />
        </Animated.View>
      ) : null}

      {showText ? <View style={{ height: 10 }} /> : null}

      {showText && showSubtitle ? (
        <Animated.View entering={FadeIn.duration(350)} style={{ paddingHorizontal: 16 }}>
          <TypewriterText
            text={subtitle}
            speed={35}
            cursor={false}
            style={{
              color: subtitleColor,
              fontSize: 15,
              fontFamily: 'SpaceGrotesk_400Regular',
              textAlign: 'center',
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};
