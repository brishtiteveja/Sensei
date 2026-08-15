import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, CheckCircle2, XCircle, MessageCircleQuestion, ChevronRight, RotateCcw, Flag } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { curriculumApi } from '@/api';
import type { PracticeQuestion } from '@/api/curriculum';
import { useProgress } from '@/gamification/progress-context';

export default function MockTestSession() {
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { record } = useProgress();
  const { subject, duration, count, title } = useLocalSearchParams<{
    subject?: string;
    duration?: string;
    count?: string;
    title?: string;
  }>();

  const durationMins = parseInt(duration || '15', 10);
  const questionCount = parseInt(count || '30', 10);

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(durationMins * 60);
  const [finished, setFinished] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const qs = await curriculumApi.getQuestions({
      subject: subject || undefined,
      limit: questionCount,
      lang: language,
    });
    setQuestions(qs);
    setLoading(false);
  }, [subject, questionCount, language]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  useEffect(() => {
    if (loading || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setFinished(true);
          record('quiz_complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, finished]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = (optionId: string) => {
    if (finished || !questions[currentIdx]) return;
    const isCorrect = questions[currentIdx].options.find(o => o.id === optionId)?.isCorrect ?? false;
    record(isCorrect ? 'correct_answer' : 'wrong_answer');
    setAnswers(prev => ({ ...prev, [currentIdx]: optionId }));
  };

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    record('quiz_complete');
  };

  const handleConfirmSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      Alert.alert(
        t('mocktest.confirmSubmitTitle'),
        t('mocktest.confirmSubmitBody', { count: String(unanswered) }),
        [{ text: t('mocktest.confirmNo'), style: 'cancel' }, { text: t('mocktest.confirmYes'), onPress: handleSubmit }]
      );
    } else {
      handleSubmit();
    }
  };

  const score = (questions || []).reduce((acc: number, q: PracticeQuestion, idx: number) => {
    const selected = answers[idx];
    if (!selected) return acc;
    const correct = q.options.find(o => o.id === selected)?.isCorrect;
    return acc + (correct ? 1 : 0);
  }, 0);

  const answered = Object.keys(answers).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const headerTitle = title || subject || t('mocktest.fallbackTitle');
  const isUrgent = timeLeft < 60;
  const question = questions[currentIdx];

  if (loading || !questions.length || !question) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.page }}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text className="font-space-medium text-sm mt-3" style={{ color: theme.textMuted }}>{t('mocktest.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.page }}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text className="font-space-medium text-sm mt-3" style={{ color: theme.textMuted }}>{t('mocktest.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (finished && !reviewing) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View className="items-center">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-4" style={{ backgroundColor: pct >= 60 ? theme.successBg : theme.warningBg }}>
              <Text style={{ fontSize: 36 }}>{pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '💪'}</Text>
            </View>
            <Text className="font-space-bold text-2xl" style={{ color: theme.text }}>
              {pct >= 80 ? t('mocktest.resultExcellent') : pct >= 60 ? t('mocktest.resultGood') : t('mocktest.resultNeedsWork')}
            </Text>
            <Text className="font-space text-lg mt-2" style={{ color: theme.textMuted }}>
              {t('mocktest.scoreCorrect', { score: String(score), total: String(questions.length), pct: String(pct) })}
            </Text>
            <Text className="font-space text-sm mt-1" style={{ color: theme.textMuted }}>
              {t('mocktest.timeUsed', { time: formatTime(durationMins * 60 - timeLeft) })}
            </Text>
          </View>

          <View className="flex-row gap-3 mt-6">
            <View className="flex-1 rounded-2xl p-4 items-center" style={{ backgroundColor: '#DCFCE7' }}>
              <Text className="font-space-bold text-xl" style={{ color: '#166534' }}>{score}</Text>
              <Text className="font-space text-xs mt-1" style={{ color: '#166534' }}>{t('mocktest.correctLabel')}</Text>
            </View>
            <View className="flex-1 rounded-2xl p-4 items-center" style={{ backgroundColor: '#FEE2E2' }}>
              <Text className="font-space-bold text-xl" style={{ color: '#991B1B' }}>{answered - score}</Text>
              <Text className="font-space text-xs mt-1" style={{ color: '#991B1B' }}>{t('mocktest.wrongLabel')}</Text>
            </View>
            <View className="flex-1 rounded-2xl p-4 items-center" style={{ backgroundColor: theme.surfaceAlt }}>
              <Text className="font-space-bold text-xl" style={{ color: theme.textMuted }}>{questions.length - answered}</Text>
              <Text className="font-space text-xs mt-1" style={{ color: theme.textMuted }}>{t('mocktest.skippedLabel')}</Text>
            </View>
          </View>

          <View className="mt-6 gap-3">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl"
              style={{ backgroundColor: theme.accent }}
              onPress={() => setReviewing(true)}
            >
              <Flag size={18} color="#fff" />
              <Text className="font-space-bold text-sm text-white">{t('mocktest.reviewAnswers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border"
              style={{ borderColor: theme.border }}
              onPress={() => router.back()}
            >
              <ArrowLeft size={18} color={theme.textSoft} />
              <Text className="font-space-semibold text-sm" style={{ color: theme.textSoft }}>{t('mocktest.goBack')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (reviewing) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
        <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <TouchableOpacity onPress={() => setReviewing(false)} className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
            <ArrowLeft size={18} color={theme.textSoft} />
          </TouchableOpacity>
          <Text className="flex-1 font-space-bold text-base text-center" style={{ color: theme.text }}>{t('mocktest.reviewTitle')}</Text>
          <View className="w-9" />
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {questions.map((q, idx) => {
            const selected = answers[idx];
            const correctOpt = q.options.find(o => o.isCorrect);
            const isCorrect = selected && q.options.find(o => o.id === selected)?.isCorrect;
            const isWrong = selected && !isCorrect;
            const skipped = !selected;
            return (
              <View key={idx} className="mb-4 rounded-2xl p-4 border" style={{ backgroundColor: theme.surface, borderColor: isCorrect ? '#22C55E' : isWrong ? '#EF4444' : theme.border }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: isCorrect ? '#DCFCE7' : isWrong ? '#FEE2E2' : theme.surfaceAlt }}>
                    {isCorrect ? <CheckCircle2 size={14} color="#22C55E" /> : isWrong ? <XCircle size={14} color="#EF4444" /> : <Text className="font-space text-[10px]" style={{ color: theme.textMuted }}>{idx + 1}</Text>}
                  </View>
                  <Text className="flex-1 font-space-medium text-xs" style={{ color: theme.textMuted }}>{q.university} {q.year}</Text>
                </View>
                <Text className="font-space text-sm mb-2" style={{ color: theme.text }}>{q.question}</Text>
                {selected && !isCorrect && (
                  <Text className="font-space text-xs mb-1" style={{ color: '#991B1B' }}>{t('mocktest.yourAnswer', { id: selected, text: q.options.find(o => o.id === selected)?.text ?? '' })}</Text>
                )}
                <Text className="font-space text-xs" style={{ color: '#166534' }}>{t('mocktest.correctAnswer', { id: correctOpt?.id ?? '', text: correctOpt?.text ?? '' })}</Text>
                {isWrong && (
                  <TouchableOpacity
                    className="flex-row items-center gap-2 mt-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: theme.heroBg }}
                    onPress={() => {
                      const selectedOpt = q.options.find(o => o.id === selected);
                      record('ai_interaction');
                      router.push({
                        pathname: '/(tabs)/ai-chat',
                        params: {
                          prompt: t('mocktest.askDikkhaPrompt', { question: q.question, selectedId: selected, selectedText: selectedOpt?.text ?? '', correctId: correctOpt?.id ?? '', correctText: correctOpt?.text ?? '' }),
                          autoStart: '1',
                        },
                      });
                    }}
                  >
                    <MessageCircleQuestion size={14} color="#fff" />
                    <Text className="font-space-semibold text-xs text-white">{t('mocktest.askDikkha')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      {/* Header with timer */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
          <ArrowLeft size={18} color={theme.textSoft} />
        </TouchableOpacity>
        <Text className="flex-1 font-space-bold text-sm text-center" style={{ color: theme.text }}>{headerTitle}</Text>
        <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: isUrgent ? '#FEE2E2' : theme.surfaceAlt }}>
          <Clock size={14} color={isUrgent ? '#EF4444' : theme.accent} />
          <Text className="font-space-bold text-sm" style={{ color: isUrgent ? '#EF4444' : theme.accent }}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* Question number strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
        {questions.map((_, idx) => {
          const isAnswered = idx in answers;
          const isCurrent = idx === currentIdx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => setCurrentIdx(idx)}
              className="w-9 h-9 rounded-lg items-center justify-center"
              style={{
                backgroundColor: isCurrent ? theme.accent : isAnswered ? theme.accentSoft : theme.surfaceAlt,
                borderWidth: isCurrent ? 0 : 1,
                borderColor: theme.border,
              }}
            >
              <Text className="font-space-bold text-xs" style={{ color: isCurrent ? '#fff' : isAnswered ? theme.accent : theme.textMuted }}>
                {idx + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Question meta */}
        <View className="flex-row items-center gap-2 mb-2">
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surfaceAlt }}>
            <Text className="font-space text-[11px]" style={{ color: theme.textMuted }}>{question?.university}</Text>
          </View>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: theme.surfaceAlt }}>
            <Text className="font-space text-[11px]" style={{ color: theme.textMuted }}>{t('mocktest.questionOf', { current: String(currentIdx + 1), total: String(questions.length) })}</Text>
          </View>
        </View>

        {/* Question */}
        <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.surface }}>
          <Text className="font-space-medium text-base leading-7" style={{ color: theme.text }}>{question?.question}</Text>
        </View>

        {/* Options */}
        <View className="gap-3">
          {question?.options.map((opt) => {
            const isSelected = answers[currentIdx] === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                className="flex-row items-center rounded-2xl px-4 py-4 border"
                style={{
                  backgroundColor: isSelected ? theme.accentSoft : theme.surface,
                  borderColor: isSelected ? theme.accent : theme.border,
                }}
                activeOpacity={0.7}
                onPress={() => handleSelect(opt.id)}
              >
                <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: isSelected ? theme.accent : theme.surfaceAlt }}>
                  <Text className="font-space-bold text-sm" style={{ color: isSelected ? '#fff' : theme.textMuted }}>{opt.id}</Text>
                </View>
                <Text className="flex-1 font-space text-sm leading-5" style={{ color: theme.text }}>{opt.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <TouchableOpacity
          className="flex-1 items-center py-3.5 rounded-xl border"
          style={{ borderColor: theme.border }}
          disabled={currentIdx <= 0}
          onPress={() => setCurrentIdx(i => i - 1)}
        >
          <Text className="font-space-semibold text-sm" style={{ color: currentIdx <= 0 ? theme.textDisabled : theme.text }}>{t('mocktest.previous')}</Text>
        </TouchableOpacity>

        {currentIdx < questions.length - 1 ? (
          <TouchableOpacity
            className="flex-1 items-center py-3.5 rounded-xl"
            style={{ backgroundColor: theme.accent }}
            onPress={() => setCurrentIdx(i => i + 1)}
          >
            <Text className="font-space-semibold text-sm text-white">{t('mocktest.next')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-1 items-center py-3.5 rounded-xl"
            style={{ backgroundColor: theme.success }}
            onPress={handleConfirmSubmit}
          >
            <Text className="font-space-bold text-sm text-white">{t('mocktest.submit')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
