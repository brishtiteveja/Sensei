import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Circle, Play, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/i18n/i18n-context';
import { communityApi, getApiErrorMessage } from '@/api';
import { AppHeader } from '@/components/app-header';
import { SkeletonLoader } from '@/components/skeleton-loader';
import type { CommunityPostDetail } from '@/types';
import { useAppTheme } from '@/theme';
import { MIXED_SUBJECT_ID } from '@/constants/community';

export default function SharedAttemptScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t } = useI18n();
  const pageBg = isDark ? 'bg-app-bg-dark' : 'bg-app-bg';
  const primaryText = isDark ? 'text-app-text-dark' : 'text-app-text';

  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await communityApi.getCommunityPost(postId);
      setPost(response);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // Same subject and length as the shared attempt, in Sensei's own runner.
  // Mixed-subject exams are stored with subject id MIXED_SUBJECT_ID.
  const handleStartMocktest = useCallback(() => {
    const set = post?.attemptDetail.questionSet;
    if (!set) return;
    router.push({
      pathname: '/mocktest-session',
      params: {
        ...(set.subject.id !== MIXED_SUBJECT_ID ? { subject: set.subject.id } : {}),
        title: set.name,
        count: String(post.attemptDetail.total),
        duration: '15',
      },
    } as any);
  }, [post, router]);

  const isOwner = post?.user.id === communityApi.currentLearnerId();

  return (
    <SafeAreaView className={`flex-1 ${pageBg}`} edges={['top']}>
      <AppHeader title={t('community.viewAttempt')} />

      {loading ? (
        <View className="flex-1 px-4 pt-4">
          <SkeletonLoader variant="detail" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm font-space text-center" style={{ color: theme.textSoft }}>{error}</Text>
        </View>
      ) : !post ? null : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          <View className="rounded-2xl p-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <Text className={`text-sm font-space-semibold ${primaryText}`}>
              {post.attemptDetail.questionSet.name} • {post.attemptDetail.questionSet.subject.name}
            </Text>
            <View className="flex-row gap-3 mt-2">
              <Text className="text-xs font-space" style={{ color: theme.textSoft }}>
                {t('community.score')}: {post.attemptDetail.score}/{post.attemptDetail.total}
              </Text>
              <Text className="text-xs font-space" style={{ color: theme.textSoft }}>
                {t('community.percent')}: {post.attemptDetail.percentage}%
              </Text>
            </View>
            <TouchableOpacity
              className="mt-3 rounded-xl px-3 py-2 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: theme.accentStrong }}
              onPress={handleStartMocktest}
              activeOpacity={0.85}
            >
              {isOwner ? (
                <RotateCcw size={14} color={theme.textInverse} />
              ) : (
                <Play size={14} color={theme.textInverse} />
              )}
              <Text className="text-xs font-space-semibold text-white">
                {isOwner ? t('sharedAttempt.tryAgain') : t('sharedAttempt.startMocktest')}
              </Text>
            </TouchableOpacity>
          </View>

          {post.attemptDetail.answers.map((answer, index) => (
            <View
              key={answer.questionId}
              className="rounded-2xl p-4 border"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <Text className={`text-xs font-space-semibold mb-3 ${primaryText}`}>
                {index + 1}. {answer.question.text}
              </Text>

              <View className="gap-2">
                {answer.question.options.map((option, optionIndex) => {
                  const isSelected = answer.selectedIndex === optionIndex;
                  const isCorrect = answer.question.correctIndex === optionIndex;
                  const optionStyle = isCorrect
                    ? { backgroundColor: theme.successBg, borderColor: theme.success }
                    : isSelected
                      ? { backgroundColor: theme.dangerBg, borderColor: theme.danger }
                      : { backgroundColor: theme.surfaceAlt, borderColor: theme.borderStrong };
                  return (
                    <View key={`${answer.questionId}-${optionIndex}`} className="rounded-xl border px-3 py-2 flex-row items-center gap-2" style={optionStyle}>
                      {isCorrect ? (
                        <CheckCircle2 size={14} color={theme.success} />
                      ) : (
                        <Circle size={14} color={theme.textMuted} />
                      )}
                      <Text className="flex-1 text-xs font-space" style={{ color: theme.textSoft }}>{option}</Text>
                    </View>
                  );
                })}
              </View>

              {answer.question.explanation ? (
                <View className="mt-3 rounded-xl p-3 border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
                  <Text className="text-[11px] font-space-medium" style={{ color: theme.textSoft }}>
                    {answer.question.explanation}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
