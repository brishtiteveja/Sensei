import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Flame, Zap, Brain, Target, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/theme';
import { useProgress } from '@/gamification/progress-context';
import { usePreferences } from '@/contexts/preferences-context';
import { useI18n } from '@/i18n/i18n-context';
import { AiTutorIllustration } from '@/illustrations/AiTutorIllustration';
import { ExamPrepIllustration } from '@/illustrations/ExamPrepIllustration';

function AnimatedRing({ progress, size, color, bgColor }: { progress: number; size: number; color: string; bgColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 1000, delay: 300, useNativeDriver: false }).start();
  }, [progress]);
  const circumference = Math.PI * (size - 8);
  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: bgColor, position: 'absolute' }} />
      <Animated.View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: color, position: 'absolute', opacity: progress > 0 ? 1 : 0 }} />
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{progress}%</Text>
    </View>
  );
}

const MISSIONS_CONFIG = [
  { id: 'learn', icon: BookOpen, labelKey: 'home.missionLearnLabel', subKey: 'home.missionLearnSub', color: '#2F86EB', route: '/(tabs)/learn' },
  { id: 'practice', icon: Zap, labelKey: 'home.missionPracticeLabel', subKey: 'home.missionPracticeSub', color: '#F59E0B', route: { pathname: '/quiz', params: { count: '10' } } },
  { id: 'review', icon: Brain, labelKey: 'home.missionReviewLabel', subKey: 'home.missionReviewSub', color: '#EF4444', route: { pathname: '/quiz', params: { mode: 'review' } } },
];

const SUBJECTS_QUICK = [
  { icon: '⚛️', name: 'Physics', nameKey: 'home.subjectPhysics', color: '#2F86EB' },
  { icon: '⚗️', name: 'Chemistry', nameKey: 'home.subjectChemistry', color: '#19B5C9' },
  { icon: '📐', name: 'Math', nameKey: 'home.subjectMath', color: '#7B57E0' },
  { icon: '🧬', name: 'Biology', nameKey: 'home.subjectBiology', color: '#22C55E' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { state: authState } = useAuth();
  const { t } = useI18n();

  const { streak, totalXp, today } = useProgress();
  const { preferences } = usePreferences();
  const track = preferences.admissionTrack;
  const trackLabel = track === 'engineering' ? t('home.trackEngineering') : track === 'medical' ? t('home.trackMedical') : track === 'university' ? t('home.trackUniversity') : null;
  const trackUniversities = preferences.preferredUniversityIds;
  const userName = authState.user?.name?.split(' ')[0] ?? t('home.studentFallback');
  const todayXp = today?.xp ?? 0;
  const dailyTarget = 50;
  const dailyProgress = Math.min(Math.round((todayXp / dailyTarget) * 100), 100);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <View className="px-5 pt-4 pb-16 rounded-b-[28px]" style={{ backgroundColor: theme.heroBg }}>
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <AiTutorIllustration size={28} />
              </View>
              <View>
                <Text className="text-white/60 text-xs font-space">{t('home.welcome')}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white text-lg font-space-bold">{userName}</Text>
                  {trackLabel && (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Text className="text-white/80 text-[10px] font-space-semibold">{trackLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <Flame size={14} color="#F59E0B" />
                <Text className="text-white text-xs font-space-bold">{streak}</Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                /* STUB: /profile was removed (no auth backend) — the gear now opens preferences. */
                onPress={() => router.push('/my-preferences' as any)}
              >
                <Settings size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Progress Ring */}
          <View className="items-center">
            <AnimatedRing progress={dailyProgress} size={80} color="#22C55E" bgColor="rgba(255,255,255,0.15)" />
            <Text className="text-white/70 text-xs font-space-medium mt-2">{t('home.todayProgressRing')}</Text>
          </View>
        </View>

        {/* Today's Missions */}
        <View className="px-5 -mt-10">
          <View className="rounded-[20px] p-4" style={{ backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Target size={16} color={theme.accent} />
                <Text className="font-space-bold text-sm" style={{ color: theme.text }}>{t('home.todayGoals')}</Text>
              </View>
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.accentSoft }}>
                <Text className="text-[11px] font-space-semibold" style={{ color: theme.accent }}>{t('home.goalsCounter', { done: '0', total: '3' })}</Text>
              </View>
            </View>

            {MISSIONS_CONFIG.map((mission, i) => {
              const Icon = mission.icon;
              return (
                <TouchableOpacity
                  key={mission.id}
                  className="flex-row items-center gap-3 py-3"
                  style={i < MISSIONS_CONFIG.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : undefined}
                  activeOpacity={0.7}
                  onPress={() => router.push(mission.route as any)}
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: mission.color + '18' }}>
                    <Icon size={18} color={mission.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-space-semibold text-sm" style={{ color: theme.text }}>{t(mission.labelKey)}</Text>
                    <Text className="font-space text-xs mt-0.5" style={{ color: theme.textMuted }}>{t(mission.subKey)}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ask Sensei CTA */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            className="rounded-[20px] p-4 flex-row items-center gap-3.5"
            style={{ backgroundColor: theme.heroBg }}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/ai-chat')}
          >
            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <AiTutorIllustration size={36} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-space-bold">{t('home.askDikkha')}</Text>
              <Text className="text-white/60 text-xs font-space mt-0.5">{t('home.askDikkhaSub')}</Text>
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Quick Subject Access */}
        <View className="px-5 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-space-bold text-sm" style={{ color: theme.text }}>{t('home.quickPractice')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/practice')} className="flex-row items-center gap-1">
              <Text className="text-xs font-space-medium" style={{ color: theme.accent }}>{t('home.seeAllPractice')}</Text>
              <ChevronRight size={13} color={theme.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {SUBJECTS_QUICK.map((subj) => (
              <TouchableOpacity
                key={subj.name}
                className="rounded-[18px] p-4 items-center"
                style={{ backgroundColor: theme.surface, width: 110, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
                activeOpacity={0.8}
                // `subject` is a filter key matched server-side against the question
                // bank, so it must be the stable English id -- never the translated
                // label. Passing the display name only ever worked for bn/en and
                // silently returned zero questions in every other language.
                onPress={() => router.push({ pathname: '/quiz', params: { subject: subj.name, title: t(subj.nameKey) } })}
              >
                <View className="w-12 h-12 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: subj.color + '15' }}>
                  <Text style={{ fontSize: 22 }}>{subj.icon}</Text>
                </View>
                <Text className="font-space-semibold text-xs text-center" style={{ color: theme.text }}>{t(subj.nameKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* University Practice Cards */}
        {trackUniversities.length > 0 && (
          <View className="px-5 mt-5">
            <Text className="font-space-bold text-sm mb-3" style={{ color: theme.text }}>{t('home.admissionPrep')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {trackUniversities.map((uni) => (
                <TouchableOpacity
                  key={uni}
                  className="rounded-2xl px-5 py-4 items-center"
                  style={{ backgroundColor: theme.surface, minWidth: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/quiz', params: { university: uni, title: t('home.uniQuestions', { uni: uni.toUpperCase() }) } } as any)}
                >
                  <Text className="font-space-bold text-base" style={{ color: theme.accent }}>{uni.toUpperCase()}</Text>
                  <Text className="font-space text-[10px] mt-1" style={{ color: theme.textMuted }}>{t('home.questionPractice')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Continue Learning */}
        <View className="px-5 mt-5">
          <TouchableOpacity
            className="rounded-[20px] p-4 flex-row items-center gap-3 border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/learn')}
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: theme.successBg }}>
              <BookOpen size={20} color={theme.success} />
            </View>
            <View className="flex-1">
              <Text className="font-space-semibold text-sm" style={{ color: theme.text }}>{t('home.continueLearning')}</Text>
              <Text className="font-space text-xs mt-0.5" style={{ color: theme.textMuted }}>{t('home.continueLearningTopic')}</Text>
            </View>
            <ChevronRight size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 5-Minute Challenge */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            className="rounded-[20px] p-4 flex-row items-center gap-3 border"
            style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/quiz', params: { count: '5', title: t('home.fiveMinChallenge') } })}
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: theme.warning }}>
              <Zap size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-space-bold text-sm" style={{ color: theme.warningText }}>{t('home.fiveMinChallenge')}</Text>
              <Text className="font-space text-xs mt-0.5" style={{ color: theme.warningText }}>{t('home.fiveMinChallengeSub')}</Text>
            </View>
            <Zap size={16} color={theme.warning} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
