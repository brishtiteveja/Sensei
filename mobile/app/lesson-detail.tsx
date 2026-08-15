import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Zap, BookOpen, MessageCircle } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { curriculumApi } from '@/api';
import type { PracticeQuestion } from '@/api/curriculum';
import { useProgress } from '@/gamification/progress-context';
import { recordAnswer } from '@/gamification/subject-mastery';
import { recordWrongQuestion, clearWrongQuestion } from '@/gamification/wrong-questions';
import { AiTutorIllustration } from '@/illustrations/AiTutorIllustration';

type Tab = 'prep' | 'concept';
type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function LessonDetailScreen() {
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const useBn = language === 'bn';
  const router = useRouter();
  const {
    lessonId, lessonTitle, unitTitle, unitTitleBn,
    concepts, subjectId, fromLearn,
  } = useLocalSearchParams<{
    lessonId?: string;
    lessonTitle?: string;
    unitTitle?: string;
    unitTitleBn?: string;
    concepts?: string;
    subjectId?: string;
    fromLearn?: string;
  }>();

  const [activeTab, setActiveTab] = useState<Tab>('prep');

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [finished, setFinished] = useState(false);
  const { record } = useProgress();

  const resetQuiz = () => {
    setCurrentIdx(0);
    setSelected(null);
    setAnswerState('unanswered');
    setScore(0);
    setAnswered(0);
    setFinished(false);
  };

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const chapter = unitTitleBn || unitTitle || '';
    let qs = await curriculumApi.getQuestions({
      chapter: chapter || undefined,
      subject: subjectId || undefined,
      limit: 10,
      lang: language,
    });
    // Fall back to subject-only when chapter+subject combo returns nothing
    if (qs.length === 0 && chapter && subjectId) {
      qs = await curriculumApi.getQuestions({ subject: subjectId, limit: 10, lang: language });
    }
    setQuestions(qs);
    resetQuiz();
    setLoading(false);
  }, [unitTitleBn, unitTitle, subjectId, language]);

  useEffect(() => {
    if (activeTab === 'prep') loadQuestions();
  }, [loadQuestions, activeTab]);

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
    const prompt = t('quiz.askDikkhaPrompt', {
      question: q.question,
      selectedId: selected ?? '',
      selectedText: selectedOpt?.text ?? '',
      correctId: correctOpt?.id ?? '',
      correctText: correctOpt?.text ?? '',
    });
    record('ai_interaction');
    router.push({
      pathname: '/(tabs)/ai-chat',
      params: { prompt, autoStart: '1', lessonId, lessonTitle },
    });
  };

  const openConceptChat = () => {
    const conceptList = concepts || '';
    const prompt = useBn
      ? `${lessonTitle} বিষয়ে পড়াশোনা শুরু করি। এই পাঠের মূল বিষয়: ${conceptList}। আমাকে এই topic ধাপে ধাপে শেখাও।`
      : `Let's study ${lessonTitle}. Key topics: ${conceptList}. Teach me step by step.`;
    router.push({
      pathname: '/(tabs)/ai-chat',
      params: {
        prompt,
        autoStart: '1',
        fromLearn: '1',
        lessonId: lessonId || '',
        lessonTitle: lessonTitle || '',
      },
    });
  };

  const headerTitle = lessonTitle || t('lessonDetail.title');

  const renderTabSelector = () => (
    <View className="flex-row mx-4 mt-3 rounded-xl p-1" style={{ backgroundColor: theme.surfaceAlt }}>
      <TouchableOpacity
        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg"
        style={{ backgroundColor: activeTab === 'prep' ? theme.surface : 'transparent' }}
        activeOpacity={0.7}
        onPress={() => setActiveTab('prep')}
      >
        <Zap size={14} color={activeTab === 'prep' ? theme.accent : theme.textMuted} />
        <Text className="font-space-semibold text-sm" style={{ color: activeTab === 'prep' ? theme.accent : theme.textMuted }}>
          {t('lessonDetail.tabPrep')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg"
        style={{ backgroundColor: activeTab === 'concept' ? theme.surface : 'transparent' }}
        activeOpacity={0.7}
        onPress={() => setActiveTab('concept')}
      >
        <BookOpen size={14} color={activeTab === 'concept' ? theme.accent : theme.textMuted} />
        <Text className="font-space-semibold text-sm" style={{ color: activeTab === 'concept' ? theme.accent : theme.textMuted }}>
          {t('lessonDetail.tabConcept')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPrepLoading = () => (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={theme.accent} />
      <Text className="font-space-medium text-sm mt-3" style={{ color: theme.textMuted }}>
        {t('quiz.loading')}
      </Text>
    </View>
  );

  const renderPrepEmpty = () => (
    <View className="flex-1 items-center justify-center px-8">
      <Text style={{ fontSize: 44 }}>📝</Text>
      <Text className="font-space-bold text-lg text-center mt-3" style={{ color: theme.text }}>
        {t('lessonDetail.noChapterQuestions')}
      </Text>
      <Text className="font-space text-sm text-center mt-2" style={{ color: theme.textMuted }}>
        {t('lessonDetail.noChapterQuestionsSub')}
      </Text>
      <TouchableOpacity
        className="mt-5 flex-row items-center gap-2 px-5 py-3 rounded-xl"
        style={{ backgroundColor: theme.heroBg }}
        onPress={openConceptChat}
      >
        <AiTutorIllustration size={20} />
        <Text className="font-space-semibold text-sm text-white">{t('lessonDetail.learnWithAI')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPrepFinished = () => {
    const pct = answered > 0 ? Math.round((score / answered) * 100) : 0;
    return (
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
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl"
            style={{ backgroundColor: theme.heroBg }}
            onPress={openConceptChat}
          >
            <AiTutorIllustration size={20} />
            <Text className="font-space-bold text-sm text-white">{t('lessonDetail.learnWithAI')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderPrepQuiz = () => (
    <>
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
          <View className="flex-1" />
          <Text className="font-space-semibold text-xs" style={{ color: theme.accent }}>{currentIdx + 1}/{questions.length}</Text>
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

            if (showCorrect) { bg = '#DCFCE7'; border = '#22C55E'; textColor = '#166534'; }
            else if (showWrong) { bg = '#FEE2E2'; border = '#EF4444'; textColor = '#991B1B'; }
            else if (isSelected) { bg = theme.accentSoft; border = theme.accent; }

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
            <View className="rounded-2xl p-4" style={{ backgroundColor: answerState === 'correct' ? '#DCFCE7' : '#FEF3C7' }}>
              <Text className="font-space-semibold text-sm" style={{ color: answerState === 'correct' ? '#166534' : '#92400E' }}>
                {answerState === 'correct' ? t('quiz.feedbackCorrect') : t('quiz.feedbackWrong')}
              </Text>
            </View>

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

      {/* Floating Sensei on wrong answer */}
      {answerState === 'wrong' && (
        <View style={{ position: 'absolute', bottom: 76, right: 12, alignItems: 'flex-end' }}>
          <View style={{
            backgroundColor: theme.heroBg,
            borderRadius: 16, borderBottomRightRadius: 4,
            paddingHorizontal: 12, paddingVertical: 8,
            marginBottom: 6, marginRight: 8,
          }}>
            <Text className="font-space-bold text-[11px] text-white">{t('quiz.companionBubble')}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleAskSensei}
            style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: theme.accentStrong,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: theme.page,
            }}
          >
            <AiTutorIllustration size={38} />
          </TouchableOpacity>
        </View>
      )}

      {/* Score bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <Text className="font-space text-xs" style={{ color: theme.textMuted }}>{t('quiz.scoreBar', { score: String(score), answered: String(answered) })}</Text>
        <Text className="font-space text-xs" style={{ color: theme.textMuted }}>
          {answered > 0 ? `${Math.round((score / answered) * 100)}%` : '—'}
        </Text>
      </View>
    </>
  );

  const renderConceptTab = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Lesson info card */}
      <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: theme.surface }}>
        <Text className="font-space-bold text-lg mb-2" style={{ color: theme.text }}>{lessonTitle}</Text>
        {unitTitle && (
          <Text className="font-space text-xs mb-3" style={{ color: theme.textMuted }}>{unitTitle}</Text>
        )}
        {concepts && (
          <View className="flex-row flex-wrap gap-2">
            {concepts.split(',').map((c, i) => (
              <View key={i} className="rounded-full px-3 py-1" style={{ backgroundColor: theme.accentSoft }}>
                <Text className="font-space-medium text-xs" style={{ color: theme.accent }}>{c.trim()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* AI Tutor CTA */}
      <TouchableOpacity
        className="rounded-2xl p-5 flex-row items-center gap-4"
        style={{ backgroundColor: theme.heroBg }}
        activeOpacity={0.85}
        onPress={openConceptChat}
      >
        <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <AiTutorIllustration size={40} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-space-bold text-base">{t('lessonDetail.askDikkhaTitle')}</Text>
          <Text className="text-white/60 font-space text-xs mt-1">{t('lessonDetail.askDikkhaSub')}</Text>
        </View>
      </TouchableOpacity>

      {/* Suggested questions */}
      <View className="mt-5 gap-3">
        <Text className="font-space-semibold text-sm" style={{ color: theme.text }}>{t('lessonDetail.suggestedQuestions')}</Text>
        {[
          useBn ? `${lessonTitle} সম্পর্কে সহজ ভাষায় বুঝিয়ে দাও` : `Explain ${lessonTitle} in simple terms`,
          useBn ? `${lessonTitle} এর মূল সূত্রগুলো কী?` : `What are the key formulas for ${lessonTitle}?`,
          useBn ? `এই topic থেকে admission test এ কী ধরনের প্রশ্ন আসে?` : `What types of questions come from this topic in exams?`,
        ].map((q, i) => (
          <TouchableOpacity
            key={i}
            className="rounded-xl p-4 flex-row items-center gap-3 border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            activeOpacity={0.7}
            onPress={() => {
              router.push({
                pathname: '/(tabs)/ai-chat',
                params: { prompt: q, autoStart: '1', lessonId, lessonTitle },
              });
            }}
          >
            <MessageCircle size={16} color={theme.accent} />
            <Text className="flex-1 font-space text-sm" style={{ color: theme.text }}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
          <ArrowLeft size={18} color={theme.textSoft} />
        </TouchableOpacity>
        <Text className="flex-1 font-space-bold text-base text-center mx-2" numberOfLines={1} style={{ color: theme.text }}>
          {headerTitle}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab selector */}
      {renderTabSelector()}

      {/* Tab content */}
      {activeTab === 'prep' ? (
        loading ? renderPrepLoading() :
        questions.length === 0 ? renderPrepEmpty() :
        finished ? renderPrepFinished() :
        question ? renderPrepQuiz() : renderPrepEmpty()
      ) : (
        renderConceptTab()
      )}
    </SafeAreaView>
  );
}
