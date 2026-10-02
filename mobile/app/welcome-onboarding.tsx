import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  StaggerItem,
  DepthTunnel,
  type DepthTunnelItem,
} from 'rn-motionfold';
import {
  ChatOnboardingFlow,
  PersonalizingLoader,
  type ChatStep,
  type ChatAnswers,
  type OnboardlyColorScheme,
  type PlanTile,
} from 'rn-onboardly';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { usePreferences } from '@/contexts/preferences-context';
import { useI18n } from '@/i18n/i18n-context';
import { useAppTheme } from '@/theme';
import { DEFAULT_REGION } from '@/constants/languages';
import { setDisplayName } from '@/lib/display-name';
import {
  MathIllustration,
  PhysicsIllustration,
  ChemistryIllustration,
  BiologyIllustration,
  EnglishIllustration,
  BanglaIllustration,
  ICTIllustration,
  GKIllustration,
  AiTutorIllustration,
  PracticeIllustration,
  ProgressIllustration,
  WelcomeIllustration,
  RocketIllustration,
  DiOwlLogo,
} from '@/illustrations';

type ChatPhase = 'welcome' | 'features' | 'chat' | 'personalizing';

// ---------------------------------------------------------------------------
// Shared: Pill button (Imprint style)
// ---------------------------------------------------------------------------

function PillButton({
  label,
  onPress,
  bg,
  color,
}: {
  label: string;
  onPress: () => void;
  bg: string;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: bg,
        borderRadius: 18,
        paddingVertical: 17,
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
          color,
          fontSize: 19,
          fontWeight: '700',
          fontFamily: 'SpaceGrotesk_700Bold',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// =========================================================================
// Chat onboarding: welcome + features phases
// =========================================================================

function WelcomePhase({
  onNext,
  t,
  theme,
}: {
  onNext: () => void;
  t: (k: string) => string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={{ alignItems: 'center', marginTop: 24 }}
        >
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: theme.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 6,
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
            }}
          >
            <WelcomeIllustration size={190} />
          </View>
        </Animated.View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            marginTop: 6,
          }}
        >
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: theme.success,
            }}
          />
          <Text
            style={{
              fontSize: 14,
              color: theme.textMuted,
              fontWeight: '600',
              fontFamily: 'SpaceGrotesk_400Regular',
            }}
          >
            {t('onboarding.welcomeOnlineLearners').replace('{count}', '12,143')}
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '900',
              color: theme.text,
              textAlign: 'center',
              marginTop: 24,
              fontFamily: 'SpaceGrotesk_700Bold',
            }}
          >
            {t('onboarding.welcomeHeadline')}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.textMuted,
              textAlign: 'center',
              marginTop: 10,
              paddingHorizontal: 16,
              lineHeight: 22,
              fontFamily: 'SpaceGrotesk_400Regular',
            }}
          >
            {t('onboarding.welcomeSubcopy')}
          </Text>
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 14,
              color: theme.textMuted,
              fontFamily: 'SpaceGrotesk_400Regular',
            }}
          >
            {t('onboarding.welcomeLoginPrompt')}{' '}
            <Text style={{ color: theme.accent, fontWeight: '700' }}>
              {t('onboarding.welcomeLoginLink')}
            </Text>
          </Text>
        </View>
        <PillButton
          label={t('onboarding.welcomeCta')}
          onPress={onNext}
          bg={theme.accent}
          color={theme.textInverse}
        />
        <Text
          style={{
            fontSize: 12,
            color: theme.textMuted,
            textAlign: 'center',
            marginTop: 14,
            lineHeight: 17,
            fontFamily: 'SpaceGrotesk_400Regular',
          }}
        >
          {t('onboarding.welcomeLegal')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// =========================================================================
// Shared: DepthTunnel + particle backdrop (splash and welcome screens)
// =========================================================================

const TUNNEL_CARDS: (DepthTunnelItem & { ci: number })[] = Array.from(
  { length: 18 },
  (_, i) => ({
    id: `s${i}`,
    x: 10 + ((i * 31 + 17) % 80),
    y: 8 + ((i * 23 + 11) % 84),
    ci: i % 9,
  }),
);

const CARD_COLORS = [
  '#1A1A3E', '#0F172A', '#1B7A5A', '#2D6B4F',
  '#7C5CBF', '#006A4E', '#1A1A3E', '#E8924A', '#6366F1',
];

const MOSAIC_ILLUSTRATIONS = [
  MathIllustration,
  PhysicsIllustration,
  ChemistryIllustration,
  BiologyIllustration,
  EnglishIllustration,
  BanglaIllustration,
  ICTIllustration,
  GKIllustration,
  AiTutorIllustration,
];


function Particle({
  x,
  y,
  size,
  color,
  delay: d,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000 + d * 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000 + d * 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(drift.value, [0, 1], [0, -8]) }],
    opacity: interpolate(drift.value, [0, 0.5, 1], [0.12, 0.25, 0.12]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const PARTICLES = [
  { x: 30, y: 80, size: 6, color: '#4F46E5', delay: 0 },
  { x: 280, y: 140, size: 4, color: '#06B6D4', delay: 300 },
  { x: 60, y: 300, size: 5, color: '#F4C542', delay: 600 },
  { x: 310, y: 400, size: 3, color: '#4F46E5', delay: 200 },
  { x: 20, y: 500, size: 5, color: '#06B6D4', delay: 800 },
  { x: 250, y: 60, size: 4, color: '#F4C542', delay: 400 },
  { x: 150, y: 200, size: 3, color: '#4F46E5', delay: 100 },
  { x: 340, y: 280, size: 5, color: '#06B6D4', delay: 700 },
  { x: 80, y: 600, size: 4, color: '#F4C542', delay: 500 },
  { x: 200, y: 450, size: 3, color: '#4F46E5', delay: 900 },
];

// =========================================================================
// Shared: Features carousel
// =========================================================================

type FeatureSlide = {
  key: string;
  title: string;
  subtitle: string;
  Illustration: React.FC<{ size?: number }>;
};

function FeaturesPhase({
  onNext,
  t,
  theme,
  showProgressBar,
}: {
  onNext: () => void;
  t: (k: string) => string;
  theme: ReturnType<typeof useAppTheme>;
  showProgressBar?: boolean;
}) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slides: FeatureSlide[] = useMemo(
    () => [
      {
        key: 'tutor',
        title: t('onboarding.featureTutorTitle'),
        subtitle: t('onboarding.featureTutorSub'),
        Illustration: AiTutorIllustration,
      },
      {
        key: 'practice',
        title: t('onboarding.featurePracticeTitle'),
        subtitle: t('onboarding.featurePracticeSub'),
        Illustration: PracticeIllustration,
      },
      {
        key: 'progress',
        title: t('onboarding.featureProgressTitle'),
        subtitle: t('onboarding.featureProgressSub'),
        Illustration: ProgressIllustration,
      },
    ],
    [t],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      if (i !== index) setIndex(i);
    },
    [index, width],
  );

  const onContinue = useCallback(() => {
    if (index < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
    } else {
      onNext();
    }
  }, [index, slides.length, width, onNext]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      {showProgressBar && (
        <View
          style={{
            height: 4,
            backgroundColor: theme.border,
            marginHorizontal: 22,
            borderRadius: 2,
            marginTop: 8,
          }}
        >
          <View
            style={{
              height: 4,
              width: `${((index + 1) / slides.length) * 100}%`,
              backgroundColor: theme.accent,
              borderRadius: 2,
            }}
          />
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 24 }}
      >
        {slides.map((s) => (
          <View
            key={s.key}
            style={{ width, alignItems: 'center', paddingHorizontal: 20 }}
          >
            <View
              style={{
                width: '92%',
                backgroundColor: theme.surface,
                borderRadius: 24,
                padding: 30,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 260,
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <s.Illustration size={180} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 7,
            marginBottom: 18,
          }}
        >
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 20 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === index ? theme.accent : theme.border,
              }}
            />
          ))}
        </View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '900',
            color: theme.text,
            textAlign: 'center',
            fontFamily: 'SpaceGrotesk_700Bold',
          }}
        >
          {slides[index].title}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.textMuted,
            textAlign: 'center',
            marginTop: 10,
            paddingHorizontal: 24,
            lineHeight: 22,
            fontFamily: 'SpaceGrotesk_400Regular',
          }}
        >
          {slides[index].subtitle}
        </Text>
        <View style={{ marginTop: 22 }}>
          <PillButton
            label={t('onboarding.continue')}
            onPress={onContinue}
            bg={theme.accent}
            color={theme.textInverse}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// =========================================================================
// Chat steps builder
// =========================================================================

function buildChatSteps(t: (k: string) => string): ChatStep[] {
  return [
    {
      id: 'name',
      type: 'text',
      prompt: t('onboarding.chatNamePrompt'),
      helper: t('onboarding.chatNameHelper'),
      placeholder: t('onboarding.chatNamePlaceholder'),
    },
    {
      id: 'admission_track',
      type: 'single',
      prompt: (a) => t('onboarding.chatTrackPrompt').replace('{name}', String(a.name || '')),
      options: () => [
        { label: t('onboarding.trackEngineering'), emoji: '⚙️' },
        { label: t('onboarding.trackMedical'), emoji: '🏥' },
        { label: t('onboarding.trackUniversity'), emoji: '🏛️' },
        { label: t('onboarding.trackAll'), emoji: '📚' },
      ],
    },
    {
      id: 'goal',
      type: 'single',
      prompt: (a) =>
        t('onboarding.chatGoalPrompt').replace('{name}', String(a.name || '')),
      options: () => [
        { label: t('onboarding.goalLearn'), emoji: '📚' },
        { label: t('onboarding.goalExam'), emoji: '📝' },
        { label: t('onboarding.goalPractice'), emoji: '⚡' },
        { label: t('onboarding.goalFun'), emoji: '🎉' },
      ],
    },
    {
      id: 'level',
      type: 'single',
      prompt: t('onboarding.chatLevelPrompt'),
      options: () => [
        { label: t('onboarding.levelBeginner'), emoji: '🌱' },
        { label: t('onboarding.levelIntermediate'), emoji: '🌿' },
        { label: t('onboarding.levelAdvanced'), emoji: '🌳' },
      ],
    },
    {
      id: 'subjects',
      type: 'multi',
      max: 4,
      prompt: t('onboarding.chatSubjectsPrompt'),
      options: () => [
        { label: t('onboarding.subjectMath'), emoji: '🔢' },
        { label: t('onboarding.subjectPhysics'), emoji: '⚛️' },
        { label: t('onboarding.subjectChemistry'), emoji: '🧪' },
        { label: t('onboarding.subjectBiology'), emoji: '🧬' },
        { label: t('onboarding.subjectEnglish'), emoji: '📖' },
        { label: t('onboarding.subjectBangla'), emoji: '🇧🇩' },
        { label: t('onboarding.subjectIct'), emoji: '💻' },
        { label: t('onboarding.subjectGk'), emoji: '🌍' },
      ],
    },
    {
      id: 'goal_time',
      type: 'single',
      prompt: t('onboarding.chatGoalTimePrompt'),
      options: () => [
        { label: t('onboarding.goalTime5'), emoji: '🍃' },
        { label: t('onboarding.goalTime10'), emoji: '🔥' },
        { label: t('onboarding.goalTime20'), emoji: '🚀' },
        { label: t('onboarding.goalTime30'), emoji: '👑' },
      ],
    },
    {
      id: 'reminder',
      type: 'single',
      prompt: t('onboarding.chatReminderPrompt'),
      options: () => [
        { label: t('onboarding.reminderMorning'), emoji: '🌅' },
        { label: t('onboarding.reminderAfternoon'), emoji: '☀️' },
        { label: t('onboarding.reminderEvening'), emoji: '🌙' },
        { label: t('onboarding.reminderNone'), emoji: '🙅' },
      ],
    },
  ];
}

// =========================================================================
// Root screen — splash → welcome → chat onboarding
// =========================================================================

export default function WelcomeOnboardingScreen() {
  const router = useRouter();
  const { isDark, colorScheme } = useTheme();
  const { completeOnboarding } = useAuth();
  const { saveOnboardingAnswers } = usePreferences();
  const { t, language } = useI18n();
  const theme = useAppTheme();

  // Language/country picker is now phase 0 of the onboarding itself.
  // It is switched off until multi-language is ready, so the screen starts in
  // 'done' and Bangladesh / Bangla is applied on mount -- no splash, nothing
  // between "Welcome to Sensei!" and the chat. The picker UI below is
  // commented out, not deleted. To bring it back: start in 'splash', restore
  // the timer below, and uncomment the picker.
  const [langPhase, setLangPhase] = useState<'splash' | 'pick' | 'done'>('done');
  const { setLanguage } = useI18n();

  useEffect(() => {
    void handleCountryPick(DEFAULT_REGION.id, DEFAULT_REGION.lang);
  }, []);

  // useEffect(() => {
  //   if (langPhase !== 'splash') return;
  //   const timer = setTimeout(() => setLangPhase('pick'), 4000);
  //   return () => clearTimeout(timer);
  // }, [langPhase]);

  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleCountryPick = async (countryId: string, lang: string) => {
    setLanguage(lang as any);
    await AsyncStorage.setItem('language_chosen', lang);
    await AsyncStorage.setItem('app_language', lang);
    await AsyncStorage.setItem('app_region', countryId);
    setLangPhase('done');
  };

  // False while the "Welcome to Sensei!" screen is up; true once it hands off
  // to the chat onboarding (the Continue button -- there is no auto-advance).
  const [chatStarted, setChatStarted] = useState(false);

  const [chatPhase, setChatPhase] = useState<ChatPhase>('chat');
  const [chatAnswers, setChatAnswers] = useState<ChatAnswers>({});
  const chatSteps = useMemo(() => buildChatSteps(t), [t]);

  // -----------------------------------------------------------------------
  // Shared: final complete handler
  // -----------------------------------------------------------------------
  const handleFinalComplete = useCallback(async () => {
    const mapped: Record<string, string[]> = Object.fromEntries(
      Object.entries(chatAnswers).map(([k, v]) => [
        k,
        Array.isArray(v) ? v : [v],
      ]),
    );

    await saveOnboardingAnswers(mapped);
    // The only name Sensei has for a student; shown on their community posts.
    if (typeof chatAnswers.name === 'string') await setDisplayName(chatAnswers.name);
    completeOnboarding();
    router.replace('/(tabs)' as any);
  }, [
    chatAnswers,
    completeOnboarding,
    router,
    saveOnboardingAnswers,
  ]);

  // -----------------------------------------------------------------------
  // Plan tiles shown on the personalizing screen
  // -----------------------------------------------------------------------
  const planTiles: PlanTile[] = useMemo(() => {
    const a = chatAnswers;
    return [
      {
        label: t('onboarding.planGoalLabel'),
        value: String(a.goal || '—'),
        emoji: '🎯',
      },
      {
        label: t('onboarding.planLevelLabel'),
        value: String(a.level || '—'),
        emoji: '📊',
      },
      {
        label: t('onboarding.planSubjectsLabel'),
        value: Array.isArray(a.subjects)
          ? a.subjects.join(', ')
          : String(a.subjects || '—'),
        emoji: '📚',
        wide: true,
      },
      {
        label: t('onboarding.planDailyLabel'),
        value: String(a.goal_time || '—'),
        emoji: '⏱️',
      },
      {
        label: t('onboarding.planReminderLabel'),
        value: String(a.reminder || '—'),
        emoji: '🔔',
      },
    ];
  }, [chatAnswers, t]);

  const planTitle = useMemo(() => {
    if (chatAnswers.name) {
      return `${String(chatAnswers.name).toUpperCase()}'S ${t('onboarding.planTitleLabel')}`;
    }
    return t('onboarding.planTitleLabel');
  }, [chatAnswers, t]);

  // -----------------------------------------------------------------------
  // Personalizing loader (end of the chat onboarding)
  // -----------------------------------------------------------------------
  const personalizingPhase = (
    <PersonalizingLoader
      planTitle={planTitle}
      planTiles={planTiles}
      socialProofMessages={[
        t('onboarding.personalizingMsg1'),
        t('onboarding.personalizingMsg2'),
        t('onboarding.personalizingMsg3'),
      ]}
      mascot={<RocketIllustration size={92} />}
      colorScheme={colorScheme as OnboardlyColorScheme}
      onComplete={handleFinalComplete}
      theme={{
        primary: theme.accent,
        card: isDark ? theme.surface : '#F3F4F6',
        ringTrack: isDark ? theme.border : '#E4ECF6',
        fontFamily: 'SpaceGrotesk_400Regular',
        fontFamilyBold: 'SpaceGrotesk_700Bold',
        borderRadius: 18,
      }}
      darkTheme={{
        background: theme.page,
        text: theme.text,
        textMuted: theme.textMuted,
        primaryText: theme.textInverse,
      }}
      localeStrings={{
        personalizingLabel: t('onboarding.personalizingTitle'),
        readyLabel: t('onboarding.personalizingReady'),
        getMyPlanLabel: t('onboarding.personalizingGetPlan'),
      }}
    />
  );

  // =======================================================================
  // Welcome to Sensei — hands off to the chat onboarding
  // =======================================================================
  if (!chatStarted) {
    // Country picker is off for now, so there is nothing to go back to.
    // const goBackToCountryPicker = () => {
    //   setLangPhase('pick');
    // };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
        {/* Back button -- returns once the country picker does. */}
        {/* <View style={{ position: 'absolute', top: 50, left: 16, zIndex: 10 }}>
          <Pressable onPress={goBackToCountryPicker} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, color: theme.textMuted }}>‹</Text>
          </Pressable>
        </View> */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Background: DepthTunnel */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }}>
            <DepthTunnel items={TUNNEL_CARDS} cycleDuration={14} prefill>
              {(item: any) => {
                const Illust = MOSAIC_ILLUSTRATIONS[item.ci];
                return (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      backgroundColor: CARD_COLORS[item.ci],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Illust size={44} />
                  </View>
                );
              }}
            </DepthTunnel>
          </View>

          {/* Subtle particle constellation */}
          {PARTICLES.map((p, i) => (
            <Particle key={i} {...p} />
          ))}

          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
            <StaggerItem index={0} stagger={150} direction="zoom" initialDelay={100}>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                    backgroundColor: theme.page,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: theme.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 28,
                    elevation: 8,
                  }}
                >
                  <DiOwlLogo size={110} />
                </View>
              </View>
            </StaggerItem>

            <StaggerItem index={1} stagger={150} direction="up" initialDelay={100}>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: '900',
                  color: theme.text,
                  textAlign: 'center',
                  marginTop: 24,
                  fontFamily: 'SpaceGrotesk_700Bold',
                }}
              >
                {t('onboarding.welcomeHeadline')}
              </Text>
            </StaggerItem>

            <View style={{ marginTop: 32 }}>
              <StaggerItem index={2} stagger={150} direction="up" initialDelay={100}>
                <PillButton
                  label={t('onboarding.continue')}
                  onPress={() => setChatStarted(true)}
                  bg={theme.accent}
                  color={theme.textInverse}
                />
              </StaggerItem>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================================
  // PHASE 0: Splash + Country/Language picker (before any onboarding)
  // =======================================================================
  if (langPhase === 'splash') {
    const splashBg = isDark ? '#09090B' : '#0F172A';
    return (
      <View style={{ flex: 1, backgroundColor: splashBg }}>
        {/* DepthTunnel — visible immediately, fills entire screen */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}>
          <DepthTunnel items={TUNNEL_CARDS} cycleDuration={10} prefill>
            {(item: any) => {
              const Illust = MOSAIC_ILLUSTRATIONS[item.ci];
              return (
                <View style={{
                  width: 64, height: 64, borderRadius: 16,
                  backgroundColor: CARD_COLORS[item.ci],
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Illust size={50} />
                </View>
              );
            }}
          </DepthTunnel>
        </View>

        {/* Center logo — fades in */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View entering={ZoomIn.delay(300).duration(600).springify()}>
            <View style={{
              width: 130, height: 130, borderRadius: 65,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2, shadowRadius: 30,
            }}>
              <AiTutorIllustration size={100} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(800).duration(500)} style={{ marginTop: 20, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 24 }}>
              {[0, 1, 2].map(i => (
                <Animated.View
                  key={i}
                  entering={FadeIn.delay(1200 + i * 200).duration(400)}
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' }}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Country picker (phase 'pick') -- commented out until multi-language is
  // ready; the splash now picks DEFAULT_REGION (Bangladesh) instead. Uncomment
  // this block and restore setLangPhase('pick') in the splash timer to bring it back.
//   const COMING_SOON_LANGS = [
//     '🇫🇷 Français', '🇩🇪 Deutsch', '🇯🇵 日本語', '🇰🇷 한국어', '🇸🇦 العربية',
//     '🇧🇷 Português', '🇹🇷 Türkçe', '🇷🇺 Русский', '🇹🇭 ไทย', '🇻🇳 Tiếng Việt',
//     '🇵🇰 اردو', '🇳🇵 नेपाली', '🇱🇰 සිංහල', '🇵🇭 Filipino', '🇰🇭 ភាសាខ្មែរ',
//     '🇲🇲 မြန်မာ', '🇪🇹 አማርኛ', '🇰🇪 Kiswahili', '🇮🇹 Italiano', '🇵🇱 Polski',
//   ];
// 
//   if (langPhase === 'pick') {
//     const countries = [
//       { id: 'bd', flag: '🇧🇩', name: 'বাংলাদেশ', nameEn: 'Bangladesh', lang: 'bn' },
//       { id: 'in', flag: '🇮🇳', name: 'भारत', nameEn: 'India', lang: 'hi' },
//       { id: 'cn', flag: '🇨🇳', name: '中国', nameEn: 'China', lang: 'zh' },
//       { id: 'gb', flag: '🇬🇧', name: 'United Kingdom', nameEn: 'United Kingdom', lang: 'en' },
//       { id: 'es', flag: '🇪🇸', name: 'España', nameEn: 'Spain', lang: 'es' },
//       { id: 'idn', flag: '🇮🇩', name: 'Indonesia', nameEn: 'Indonesia', lang: 'id' },
//       { id: 'my', flag: '🇲🇾', name: 'Malaysia', nameEn: 'Malaysia', lang: 'ms' },
//       { id: 'ng', flag: '🇳🇬', name: 'Nigeria', nameEn: 'Nigeria', lang: 'ha' },
//     ];
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
//         {/* Coming Soon Modal */}
//         {showComingSoon && (
//           <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
//             <Pressable onPress={() => setShowComingSoon(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
//               <Animated.View entering={FadeInUp.duration(350)} style={{ backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 40, maxHeight: '75%' }}>
//                 <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 }} />
//                 <View style={{ alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 }}>
//                   <Text style={{ fontSize: 40, marginBottom: 8 }}>🌍</Text>
//                   <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: theme.text, textAlign: 'center' }}>
//                     More languages coming soon!
//                   </Text>
//                   <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
//                     We're expanding to support students worldwide.{'\n'}Request your language and we'll prioritize it.
//                   </Text>
//                 </View>
//                 <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8, paddingBottom: 16 }}>
//                   {COMING_SOON_LANGS.map((lang, i) => (
//                     <Animated.View key={lang} entering={ZoomIn.delay(i * 30).duration(200)}>
//                       <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.border }}>
//                         <Text style={{ fontSize: 13, color: theme.textSoft, fontFamily: 'SpaceGrotesk_500Medium' }}>{lang}</Text>
//                       </View>
//                     </Animated.View>
//                   ))}
//                 </ScrollView>
//                 <View style={{ paddingHorizontal: 24, gap: 10 }}>
//                   <Pressable
//                     onPress={() => { setShowComingSoon(false); handleCountryPick('other', 'en'); }}
//                     style={{ backgroundColor: theme.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
//                   >
//                     <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold' }}>Continue in English</Text>
//                   </Pressable>
//                   <Pressable onPress={() => setShowComingSoon(false)} style={{ alignItems: 'center', paddingVertical: 10 }}>
//                     <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' }}>Go back</Text>
//                   </Pressable>
//                 </View>
//               </Animated.View>
//             </Pressable>
//           </View>
//         )}
// 
//         <Animated.View entering={FadeInUp.duration(400)} style={{ flex: 1, paddingTop: 20 }}>
//           <View style={{ alignItems: 'center', marginBottom: 20, paddingHorizontal: 24 }}>
//             <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
//               <WelcomeIllustration size={64} />
//             </View>
//             <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: theme.text, textAlign: 'center', marginTop: 14 }}>
//               Where are you from?
//             </Text>
//           </View>
//           <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
//             {countries.map((c, i) => (
//               <Animated.View key={c.id} entering={FadeInUp.delay(i * 40).duration(250)}>
//                 <Pressable
//                   onPress={() => handleCountryPick(c.id, c.lang)}
//                   style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 6, borderWidth: 1, borderColor: theme.border }}
//                 >
//                   <Text style={{ fontSize: 24 }}>{c.flag}</Text>
//                   <View style={{ flex: 1 }}>
//                     <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: theme.text }}>{c.name}</Text>
//                     {c.name !== c.nameEn && <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{c.nameEn}</Text>}
//                   </View>
//                 </Pressable>
//               </Animated.View>
//             ))}
//             <Animated.View entering={FadeInUp.delay(countries.length * 40).duration(250)}>
//               <Pressable
//                 onPress={() => setShowComingSoon(true)}
//                 style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 6, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }}
//               >
//                 <Text style={{ fontSize: 24 }}>🌍</Text>
//                 <View style={{ flex: 1 }}>
//                   <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: theme.textMuted }}>Other</Text>
//                   <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: theme.textDisabled, marginTop: 1 }}>20+ languages coming soon</Text>
//                 </View>
//               </Pressable>
//             </Animated.View>
//           </ScrollView>
//         </Animated.View>
//       </SafeAreaView>
//     );
//   }

  // =======================================================================
  // Chat onboarding
  // =======================================================================
  if (chatPhase === 'welcome') {
    return (
      <WelcomePhase
        onNext={() => setChatPhase('features')}
        t={t}
        theme={theme}
      />
    );
  }

  if (chatPhase === 'features') {
    return (
      <FeaturesPhase
        onNext={() => setChatPhase('chat')}
        t={t}
        theme={theme}
      />
    );
  }

  if (chatPhase === 'chat') {
    return (
      <ChatOnboardingFlow
        steps={chatSteps}
        introMessages={[
          t('onboarding.chatIntro1'),
          t('onboarding.chatIntro2'),
        ]}
        completionMessage={t('onboarding.chatDoneMsg')}
        colorScheme={colorScheme as OnboardlyColorScheme}
        onComplete={(answers) => {
          setChatAnswers(answers);
          setChatPhase('personalizing');
        }}
        mascot={<AiTutorIllustration size={64} />}
        theme={{
          primary: theme.accent,
          bubbleAi: isDark ? theme.surface : '#F0F4FA',
          bubbleUser: theme.accentSoft,
          bubbleAiText: theme.text,
          bubbleUserText: theme.text,
          inputBg: isDark ? theme.surface : '#F0F0F2',
          chipBorder: theme.accent,
          chipActiveBg: theme.accent,
          chipActiveText: theme.textInverse,
          fabBg: theme.accent,
          fabDisabledBg: theme.accentSoft,
          fontFamily: 'SpaceGrotesk_400Regular',
          fontFamilyBold: 'SpaceGrotesk_700Bold',
          borderRadius: 16,
        }}
        darkTheme={{
          background: theme.page,
          text: theme.text,
          textMuted: theme.textMuted,
          border: theme.border,
          primaryText: theme.textInverse,
        }}
        localeStrings={{ continueLabel: t('onboarding.continue') }}
      />
    );
  }

  return personalizingPhase;
}
