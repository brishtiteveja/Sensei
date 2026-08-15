import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react-native';
import { AiTutorIllustration } from '@/illustrations/AiTutorIllustration';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { curriculumApi } from '@/api';
import type { PracticeQuestion } from '@/api/curriculum';
import { useProgress } from '@/gamification/progress-context';
import { recordQuizSession } from '@/gamification/daily-limits';
import { recordAnswer } from '@/gamification/subject-mastery';
import { recordWrongQuestion, clearWrongQuestion, loadWrongQuestions } from '@/gamification/wrong-questions';
import { ProPaywall } from '@/components/pro-paywall';

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function QuizScreen() {
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { subject, university, title, count, mode } = useLocalSearchParams<{
    subject?: string;
    university?: string;
    title?: string;
    count?: string;
    mode?: string;
  }>();
  const questionCount = Math.max(1, Math.min(parseInt(count || '10', 10) || 10, 30));
  const isReviewMode = mode === 'review';

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showProPaywall, setShowProPaywall] = useState(false);
  const { record } = useProgress();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    let qs: PracticeQuestion[];
    if (isReviewMode) {
      // Review mode: re-test questions the user previously got wrong
      const wrong = await loadWrongQuestions();
      qs = wrong.slice(0, questionCount).map((w) => w.question);
    } else {
      qs = await curriculumApi.getQuestions({
        subject: subject || undefined,
        university: university || undefined,
        limit: questionCount,
        lang: language,
      });
    }
    setQuestions(qs);
    setCurrentIdx(0);
    setSelected(null);
    setAnswerState('unanswered');
    setScore(0);
    setAnswered(0);
    setFinished(false);
    setLoading(false);
  }, [subject, university, questionCount, isReviewMode, language]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const question = questions[currentIdx];

  const handleSelect = (optionId: string) => {
    if (answerState !== 'unanswered') return;
    setSelected(optionId);
    const isCorrect = question.options.find(o => o.id === optionId)?.isCorrect ?? false;
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    setAnswered(a => a + 1);
    if (isCorrect) setScore(s => s + 1);
    record(isCorrect ? 'correct_answer' : 'wrong_answer');
    if (question.subject) recordAnswer(question.subject, isCorrect);
    // Track wrong questions for the review module; clear when answered right
    if (isCorrect) {
      void clearWrongQuestion(question.id);
    } else {
      void recordWrongQuestion(question);
    }
  };

  const handleNext = () => {
    if (currentIdx >= questions.length - 1) {
      setFinished(true);
      record('quiz_complete');
      recordQuizSession().then(({ limitReached }) => {
        if (limitReached) setTimeout(() => setShowProPaywall(true), 2000);
      });
      return;
    }
    setCurrentIdx(i => i + 1);
    setSelected(null);
    setAnswerState('unanswered');
  };

  const handleAskSensei = () => {
    const q = question;
    const selectedOpt = q.options.find(o => o.id === selected);
    const correctOpt = q.options.find(o => o.isCorrect);
    const prompt = t('quiz.askDikkhaPrompt', { question: q.question, selectedId: selected ?? '', selectedText: selectedOpt?.text ?? '', correctId: correctOpt?.id ?? '', correctText: correctOpt?.text ?? '' });
    record('ai_interaction');
    router.push({
      pathname: '/(tabs)/ai-chat',
      params: { prompt, autoStart: '1' },
    });
  };

  const headerTitle = title || subject || t('quiz.fallbackTitle');

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.page }}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text className="font-space-medium text-sm mt-3" style={{ color: theme.textMuted }}>{t('quiz.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (questions.length === 0 || !question) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-8" style={{ backgroundColor: theme.page }}>
        {isReviewMode ? (
          <>
            <Text style={{ fontSize: 44 }}>🎉</Text>
            <Text className="font-space-bold text-lg text-center mt-3" style={{ color: theme.text }}>{t('quiz.noMistakesTitle')}</Text>
            <Text className="font-space text-sm text-center mt-2" style={{ color: theme.textMuted }}>{t('quiz.noMistakesSub')}</Text>
          </>
        ) : (
          <>
            <Text className="font-space-bold text-lg text-center" style={{ color: theme.text }}>{t('quiz.noQuestionsTitle')}</Text>
            <Text className="font-space text-sm text-center mt-2" style={{ color: theme.textMuted }}>{t('quiz.noQuestionsSub')}</Text>
          </>
        )}
        <TouchableOpacity className="mt-6 px-6 py-3 rounded-xl" style={{ backgroundColor: theme.accent }} onPress={() => router.back()}>
          <Text className="font-space-semibold text-sm text-white">{t('quiz.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (finished) {
    const pct = Math.round((score / answered) * 100);
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View className="items-center">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-4" style={{ backgroundColor: pct >= 70 ? theme.successBg : theme.warningBg }}>
              <Text style={{ fontSize: 36 }}>{pct >= 70 ? '🎯' : '💪'}</Text>
            </View>
            <Text className="font-space-bold text-2xl" style={{ color: theme.text }}>
              {pct >= 70 ? t('quiz.resultGood') : t('quiz.resultTryMore')}
            </Text>
            <Text className="font-space text-base mt-2" style={{ color: theme.textMuted }}>
              {t('quiz.scoreDisplay', { score: String(score), answered: String(answered), pct: String(pct) })}
            </Text>
          </View>

          <View className="mt-8 gap-3">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl"
              style={{ backgroundColor: theme.accent }}
              onPress={loadQuestions}
            >
              <RotateCcw size={18} color="#fff" />
              <Text className="font-space-bold text-sm text-white">{t('quiz.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border"
              style={{ borderColor: theme.border }}
              onPress={() => router.back()}
            >
              <ArrowLeft size={18} color={theme.textSoft} />
              <Text className="font-space-semibold text-sm" style={{ color: theme.textSoft }}>{t('quiz.goBack')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
          <ArrowLeft size={18} color={theme.textSoft} />
        </TouchableOpacity>
        <Text className="flex-1 font-space-bold text-base text-center" style={{ color: theme.text }}>{headerTitle}</Text>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: theme.accentSoft }}>
          <Text className="font-space-semibold text-xs" style={{ color: theme.accent }}>{currentIdx + 1}/{questions.length}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-1 mx-4 mt-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
        <View className="h-full rounded-full" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, backgroundColor: theme.accent }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Question meta */}
        <View className="flex-row items-center gap-2 mb-2">
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surfaceAlt }}>
            <Text className="font-space text-[11px]" style={{ color: theme.textMuted }}>{question.university}</Text>
          </View>
          {question.year && (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surfaceAlt }}>
              <Text className="font-space text-[11px]" style={{ color: theme.textMuted }}>{question.year}</Text>
            </View>
          )}
        </View>

        {/* Question text */}
        <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.surface }}>
          <Text className="font-space-medium text-base leading-7" style={{ color: theme.text }}>{question.question}</Text>
        </View>

        {/* Options */}
        <View className="gap-3">
          {question.options.map((opt) => {
            const isSelected = selected === opt.id;
            const showCorrect = answerState !== 'unanswered' && opt.isCorrect;
            const showWrong = answerState === 'wrong' && isSelected;

            let bg = theme.surface;
            let border = theme.border;
            let textColor = theme.text;

            if (showCorrect) {
              bg = '#DCFCE7';
              border = '#22C55E';
              textColor = '#166534';
            } else if (showWrong) {
              bg = '#FEE2E2';
              border = '#EF4444';
              textColor = '#991B1B';
            } else if (isSelected) {
              bg = theme.accentSoft;
              border = theme.accent;
            }

            return (
              <TouchableOpacity
                key={opt.id}
                className="flex-row items-center rounded-2xl px-4 py-4 border"
                style={{ backgroundColor: bg, borderColor: border }}
                activeOpacity={answerState !== 'unanswered' ? 1 : 0.7}
                onPress={() => handleSelect(opt.id)}
              >
                <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: showCorrect ? '#22C55E' : showWrong ? '#EF4444' : theme.surfaceAlt }}>
                  {showCorrect ? (
                    <CheckCircle2 size={18} color="#fff" />
                  ) : showWrong ? (
                    <XCircle size={18} color="#fff" />
                  ) : (
                    <Text className="font-space-bold text-sm" style={{ color: isSelected ? theme.accent : theme.textMuted }}>{opt.id}</Text>
                  )}
                </View>
                <Text className="flex-1 font-space text-sm leading-5" style={{ color: textColor }}>{opt.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Post-answer actions */}
        {answerState !== 'unanswered' && (
          <View className="mt-5 gap-3">
            {/* Feedback */}
            <View className="rounded-2xl p-4" style={{ backgroundColor: answerState === 'correct' ? '#DCFCE7' : '#FEF3C7' }}>
              <Text className="font-space-semibold text-sm" style={{ color: answerState === 'correct' ? '#166534' : '#92400E' }}>
                {answerState === 'correct' ? t('quiz.feedbackCorrect') : t('quiz.feedbackWrong')}
              </Text>
            </View>

            {/* Next button — inline */}

            {/* Next button */}
            <TouchableOpacity
              className="items-center py-4 rounded-2xl"
              style={{ backgroundColor: theme.accent }}
              onPress={handleNext}
            >
              <Text className="font-space-bold text-sm text-white">
                {currentIdx >= questions.length - 1 ? t('quiz.seeResults') : t('quiz.nextQuestion')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Score bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <Text className="font-space text-xs" style={{ color: theme.textMuted }}>{t('quiz.scoreBar', { score: String(score), answered: String(answered) })}</Text>
        <Text className="font-space text-xs" style={{ color: theme.textMuted }}>
          {answered > 0 ? `${Math.round((score / answered) * 100)}%` : '—'}
        </Text>
      </View>

      {/* Floating Sensei companion — appears on wrong answer */}
      {answerState === 'wrong' && (
        <View style={{ position: 'absolute', bottom: 76, right: 12, alignItems: 'flex-end' }}>
          {/* Speech bubble */}
          <View style={{
            backgroundColor: theme.heroBg,
            borderRadius: 16, borderBottomRightRadius: 4,
            paddingHorizontal: 12, paddingVertical: 8,
            marginBottom: 6, marginRight: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
          }}>
            <Text className="font-space-bold text-[11px] text-white">{t('quiz.companionBubble')}</Text>
          </View>
          {/* Avatar button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleAskSensei}
            style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: theme.accentStrong,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: theme.accent, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
              borderWidth: 3, borderColor: theme.page,
            }}
          >
            <AiTutorIllustration size={38} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
    <ProPaywall
      visible={showProPaywall}
      onClose={() => setShowProPaywall(false)}
      /* STUB: /subscription removed (no payments backend) — paywall just closes. */
      onSubscribe={() => { setShowProPaywall(false); }}
    />
    </>
  );
}
