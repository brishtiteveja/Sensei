import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  FadeInUp,
  runOnJS,
} from 'react-native-reanimated';
import type {
  PersonalizingLoaderProps,
  OnboardlyTheme,
  OnboardlyColorScheme,
} from './types';
import { defaultTheme } from './theme/defaultTheme';
import { defaultDarkTheme } from './theme/defaultDarkTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 150;
const STROKE = 9;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const DEFAULT_MESSAGES = [
  'Analyzing your preferences...',
  'Building your personalized path...',
  'Almost ready!',
];

const DEFAULT_LABELS = {
  getMyPlanLabel: 'Get My Plan',
  personalizingLabel: 'Personalizing your learning plan...',
  readyLabel: 'Your plan is ready!',
};

export const PersonalizingLoader: React.FC<PersonalizingLoaderProps> = ({
  planTitle,
  planTiles = [],
  socialProofMessages,
  mascot,
  theme: themeOverrides,
  darkTheme: darkThemeOverrides,
  colorScheme = 'system',
  onComplete,
  localeStrings,
}) => {
  const systemScheme = useColorScheme();
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
  const messages = socialProofMessages ?? DEFAULT_MESSAGES;

  const [ready, setReady] = useState(false);
  const [displayPct, setDisplayPct] = useState(0);

  const progress = useSharedValue(0);
  const mascotScale = useSharedValue(1);
  const ringGlow = useSharedValue(0);

  const markReady = () => setReady(true);

  useEffect(() => {
    // Non-linear eased progress: fast start → slow middle → burst finish
    // Phase 1: 0→35% in 1.2s (fast, building confidence)
    progress.value = withSequence(
      withTiming(0.35, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      }),
      // Phase 2: 35→70% in 2s (slower, "processing" feel)
      withTiming(0.7, {
        duration: 2000,
        easing: Easing.inOut(Easing.quad),
      }),
      // Phase 3: 70→92% in 1s (picking up)
      withTiming(0.92, {
        duration: 1000,
        easing: Easing.inOut(Easing.cubic),
      }),
      // Phase 4: 92→100% in 0.6s (burst to finish)
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Mascot pulse at completion
    const totalDuration = 1200 + 2000 + 1000 + 600;
    mascotScale.value = withDelay(
      totalDuration - 100,
      withSequence(
        withSpring(1.15, { damping: 6, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 150 }),
      ),
    );

    // Ring glow pulse at completion
    ringGlow.value = withDelay(
      totalDuration - 200,
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, []);

  // Sync shared value → JS state for text display + ready flag
  useDerivedValue(() => {
    const p = Math.round(progress.value * 100);
    runOnJS(setDisplayPct)(p);
    if (p >= 100) {
      runOnJS(markReady)();
    }
  });

  // Animated ring stroke
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  // Mascot bounce at completion
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  // Ring glow effect
  const glowStyle = useAnimatedStyle(() => ({
    opacity: ringGlow.value * 0.4,
    transform: [{ scale: 1 + ringGlow.value * 0.15 }],
  }));

  const msgIndex =
    messages.length <= 1
      ? 0
      : displayPct < 50
        ? 0
        : displayPct < 90
          ? Math.min(1, messages.length - 1)
          : messages.length - 1;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.ringWrap}>
          {/* Glow ring behind */}
          <Animated.View
            style={[
              styles.glowRing,
              { borderColor: theme.primary },
              glowStyle,
            ]}
          />
          <Svg width={RING} height={RING}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={theme.ringTrack ?? theme.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={theme.primary}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRC}
              animatedProps={ringProps}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          {mascot ? (
            <Animated.View style={[styles.ringCenter, mascotStyle]}>
              {mascot}
            </Animated.View>
          ) : null}
        </View>

        <Animated.Text
          entering={FadeIn.delay(200).duration(400)}
          style={[
            styles.pct,
            { color: theme.primary, fontFamily: theme.fontFamilyBold },
          ]}
        >
          {displayPct}%
        </Animated.Text>

        <Text
          style={[
            styles.headline,
            { color: theme.text, fontFamily: theme.fontFamilyBold },
          ]}
        >
          {ready ? labels.readyLabel : labels.personalizingLabel}
        </Text>

        {!ready ? (
          <Animated.View
            entering={FadeInUp.delay(300).duration(400)}
            style={[
              styles.msgPill,
              { borderColor: theme.ringTrack ?? theme.border },
            ]}
          >
            <Text
              style={{
                fontSize: 15,
                color: theme.primary,
                textAlign: 'center',
                fontWeight: '500',
                lineHeight: 21,
                fontFamily: theme.fontFamily,
              }}
            >
              {messages[msgIndex]}
            </Text>
          </Animated.View>
        ) : (
          <>
            {planTiles.length > 0 ? (
              <Animated.View
                entering={FadeInUp.duration(500)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: theme.card,
                    borderRadius: theme.borderRadius,
                  },
                ]}
              >
                {planTitle ? (
                  <Text
                    style={[
                      styles.planTitle,
                      {
                        color: theme.textMuted,
                        fontFamily: theme.fontFamilyBold,
                      },
                    ]}
                  >
                    {planTitle}
                  </Text>
                ) : null}
                <View style={styles.tileGrid}>
                  {planTiles.map((t, i) => (
                    <Animated.View
                      key={t.label}
                      entering={FadeInUp.delay(i * 80).duration(400)}
                      style={[
                        styles.tile,
                        {
                          backgroundColor: theme.background,
                          borderRadius: theme.borderRadius - 4,
                          width: t.wide ? '100%' : '47%',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tileLabel,
                          {
                            color: theme.textMuted,
                            fontFamily: theme.fontFamilyBold,
                          },
                        ]}
                      >
                        {t.emoji ? `${t.emoji} ` : ''}
                        {t.label}
                      </Text>
                      <Text
                        style={[
                          styles.tileValue,
                          { color: theme.text, fontFamily: theme.fontFamily },
                        ]}
                        numberOfLines={1}
                      >
                        {t.value}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <Animated.View
              entering={FadeInUp.delay(planTiles.length * 80 + 200).duration(500)}
              style={{ width: '100%' }}
            >
              <Pressable
                onPress={onComplete}
                style={[
                  styles.cta,
                  {
                    backgroundColor: theme.primary,
                    borderRadius: theme.borderRadius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                    fontSize: 19,
                    fontWeight: '700',
                    fontFamily: theme.fontFamilyBold,
                  }}
                >
                  {labels.getMyPlanLabel}
                </Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  ringWrap: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { position: 'absolute' },
  glowRing: {
    position: 'absolute',
    width: RING + 20,
    height: RING + 20,
    borderRadius: (RING + 20) / 2,
    borderWidth: 3,
    opacity: 0,
  },
  pct: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center' as const,
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 22,
  },
  msgPill: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
  },
  planCard: { width: '100%', padding: 16, marginTop: 22 },
  planTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { padding: 12 },
  tileLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  tileValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  cta: {
    width: '100%',
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
