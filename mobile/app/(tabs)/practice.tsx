import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Clock, Sparkles, RotateCcw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme } from '@/theme';

// `id` is the filter key the server matches against the question bank; `nameKey` is
// only ever the display label. They must stay separate -- passing the translated label
// as the filter returned zero questions in every language except bn/en.
const subjects = [
  { id: 'physics', emoji: '⚛️', nameKey: 'practice.subjectPhysics', color: '#6366F1' },
  { id: 'chemistry', emoji: '⚗️', nameKey: 'practice.subjectChemistry', color: '#10B981' },
  { id: 'higher_math', emoji: '📐', nameKey: 'practice.subjectHigherMath', color: '#F59E0B' },
  { id: 'biology', emoji: '🧬', nameKey: 'practice.subjectBiology', color: '#EC4899' },
  { id: 'general_math', emoji: '➕', nameKey: 'practice.subjectGeneralMath', color: '#8B5CF6' },
  { id: 'english', emoji: '📖', nameKey: 'practice.subjectEnglish', color: '#3B82F6' },
];

export default function PracticeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useTheme();
  const theme = useAppTheme();

  const navigateToChat = (prompt: string) => {
    router.push({ pathname: '/(tabs)/ai-chat', params: { prompt, autoStart: '1' } });
  };

  const navigateToQuiz = (subject?: string, title?: string) => {
    router.push({ pathname: '/quiz', params: { subject, title } } as any);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.page }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-5 pb-2">
          <Text className="text-xl font-space-bold" style={{ color: theme.text }}>
            {t('practice.title')}
          </Text>
          <Text className="text-sm font-space mt-1" style={{ color: theme.textMuted }}>
            {t('practice.subtitle')}
          </Text>
        </View>

        {/* Mode Cards */}
        <View className="flex-row px-5 mt-4 gap-3">
          <TouchableOpacity
            className="flex-1 rounded-[20px] p-4 border"
            style={{ backgroundColor: theme.accentSoft, borderColor: theme.accent }}
            activeOpacity={0.8}
            onPress={() => navigateToQuiz(undefined, t('practice.quickPracticeTitle'))}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: theme.accent }}>
              <Zap size={20} color={theme.textInverse} />
            </View>
            <Text className="text-sm font-space-semibold" style={{ color: theme.text }}>
              {t('practice.quickPractice')}
            </Text>
            <Text className="text-[11px] font-space mt-1" style={{ color: theme.textMuted }}>
              {t('practice.quickPracticeSub')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 rounded-[20px] p-4 border"
            style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/mocktest-session', params: { duration: '15', count: '30', title: t('practice.mockExamTitle') } } as any)}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: theme.warning }}>
              <Clock size={20} color={theme.textInverse} />
            </View>
            <Text className="text-sm font-space-semibold" style={{ color: theme.text }}>
              {t('practice.mockExam')}
            </Text>
            <Text className="text-[11px] font-space mt-1" style={{ color: theme.textMuted }}>
              {t('practice.mockExamSub')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sensei Challenge Card */}
        <View className="mx-5 mt-4">
          <View className="rounded-[20px] p-5 overflow-hidden" style={{ backgroundColor: theme.heroBg }}>
            <View className="flex-row items-center gap-2 mb-2">
              <Sparkles size={20} color={theme.textInverse} />
              <Text className="text-base font-space-bold text-white">
                {t('practice.dikkhaChallenge')}
              </Text>
            </View>
            <Text className="text-xs font-space text-white/75 mb-4">
              {t('practice.dikkhaChallengeDesc')}
            </Text>
            <TouchableOpacity
              className="self-start rounded-xl px-5 py-2.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              activeOpacity={0.8}
              onPress={() =>
                navigateToChat(
                  t('practice.challengePrompt'),
                )
              }
            >
              <Text className="text-sm font-space-semibold text-white">
                {t('practice.startChallenge')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Subject Grid */}
        <View className="px-5 mt-6">
          <Text className="text-sm font-space-semibold mb-3" style={{ color: theme.text }}>
            {t('practice.chooseSubject')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {subjects.map((s) => {
              const subjectName = t(s.nameKey);
              return (
                <TouchableOpacity
                  key={s.nameKey}
                  className="rounded-[20px] p-4 border"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    width: '47.5%',
                  }}
                  activeOpacity={0.8}
                  onPress={() => navigateToQuiz(s.id, subjectName)}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: `${s.color}20` }}
                  >
                    <Text className="text-lg">{s.emoji}</Text>
                  </View>
                  <Text className="text-xs font-space-semibold" style={{ color: theme.text }}>
                    {subjectName}
                  </Text>
                  <Text className="text-[11px] font-space mt-1" style={{ color: theme.accent }}>
                    {t('practice.practiceAction')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Wrong Answers Review */}
        <View className="mx-5 mt-6">
          <TouchableOpacity
            className="rounded-[20px] p-4 flex-row items-center gap-3.5 border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            activeOpacity={0.8}
            onPress={() =>
              navigateToChat(
                t('practice.reviewPrompt'),
              )
            }
          >
            <View className="w-11 h-11 rounded-[14px] items-center justify-center" style={{ backgroundColor: theme.dangerBg ?? `${theme.danger}15` }}>
              <RotateCcw size={20} color={theme.danger} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-space-semibold" style={{ color: theme.text }}>
                {t('practice.wrongAnswerReview')}
              </Text>
              <Text className="text-[11px] font-space mt-0.5" style={{ color: theme.textMuted }}>
                {t('practice.wrongAnswerReviewSub')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
