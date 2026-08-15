import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { Check, Lock, Play, Settings, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCourseProgress } from '@/course/course-progress-context';
import { useProgress } from '@/gamification/progress-context';
import { useAppTheme } from '@/theme';
import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/i18n/i18n-context';

import { PhysicsIllustration } from '@/illustrations/PhysicsIllustration';
import { ChemistryIllustration } from '@/illustrations/ChemistryIllustration';
import { MathIllustration } from '@/illustrations/MathIllustration';
import { BiologyIllustration } from '@/illustrations/BiologyIllustration';

type LessonStatus = 'completed' | 'current' | 'locked';

const UNIT_COLORS = ['#2F86EB', '#19B5C9', '#7B57E0', '#E2374A', '#5DBB46', '#F4A300'];
const OFFSETS = [0, -60, 0, 60];

const SUBJECT_ILLUSTRATIONS: Record<string, React.FC<{ size?: number }>> = {
  physics: PhysicsIllustration,
  chemistry: ChemistryIllustration,
  math: MathIllustration,
  biology: BiologyIllustration,
};

function DottedConnector({ unitColor }: { unitColor: string }) {
  return (
    <View className="items-center my-1" style={{ height: 36, justifyContent: 'space-between' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: unitColor, opacity: 0.25 }} />
      ))}
    </View>
  );
}

function LessonNode({
  title, status, offset, isLast, onPress, unitColor,
}: {
  title: string; status: LessonStatus; offset: number;
  isLast: boolean; onPress: () => void; unitColor: string;
}) {
  const theme = useAppTheme();
  const bgColor = status === 'completed' ? theme.success : status === 'current' ? unitColor : '#94a3b8';
  const borderColor = status === 'completed' ? theme.successText : status === 'current' ? unitColor : '#64748b';
  const isCurrent = status === 'current';

  return (
    <View className="items-center">
      <View className="items-center w-[150px]" style={{ transform: [{ translateX: offset }] }}>
        {isCurrent && (
          <View style={{
            width: 76, height: 76, borderRadius: 38, position: 'absolute', top: -4,
            borderWidth: 3, borderColor: unitColor + '33',
          }} />
        )}
        <TouchableOpacity
          activeOpacity={status === 'locked' ? 1 : 0.8}
          onPress={onPress}
          style={{
            width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
            borderWidth: 4, backgroundColor: bgColor, borderColor,
            shadowColor: '#334155', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
          }}
        >
          {status === 'completed' && <Check size={24} color="#fff" />}
          {isCurrent && <Play size={22} color="#fff" fill="#fff" />}
          {status === 'locked' && <Lock size={20} color="#fff" />}
        </TouchableOpacity>
        <Text
          className="mt-2 font-space-semibold text-xs text-center"
          numberOfLines={2}
          style={{ color: status === 'locked' ? theme.textDisabled : theme.text, width: 130 }}
        >
          {title}
        </Text>
      </View>
      {!isLast && <DottedConnector unitColor={unitColor} />}
    </View>
  );
}

export default function LearnScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useI18n();
  const { streak, totalXp: gamificationXp } = useProgress();
  const {
    subjects, selectedSubjectId, setSelectedSubjectId,
    subjectDetail, completedLessonIds, currentLessonId,
    totalXp, loading, completeLesson,
  } = useCourseProgress();

  const allLessons = subjectDetail?.units.flatMap((u) => u.lessons) ?? [];
  const completedCount = allLessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const totalCount = allLessons.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const SubjectIllustration = SUBJECT_ILLUSTRATIONS[selectedSubjectId];

  const unitStartIndices = useMemo(() => {
    const indices: number[] = [];
    let running = 0;
    for (const unit of subjectDetail?.units ?? []) {
      indices.push(running);
      running += unit.lessons.length;
    }
    return indices;
  }, [subjectDetail]);

  const handleLessonTap = useCallback(async (
    lessonId: string, status: LessonStatus, title: string,
    concepts?: string[], unitTitle?: string, unitTitleBn?: string,
  ) => {
    if (status === 'locked') return;
    if (status !== 'completed') completeLesson(lessonId);

    router.push({
      pathname: '/lesson-detail',
      params: {
        lessonId,
        lessonTitle: title,
        unitTitle: unitTitle || '',
        unitTitleBn: unitTitleBn || '',
        concepts: concepts?.join(', ') || '',
        subjectId: selectedSubjectId,
        fromLearn: '1',
      },
    });
  }, [completeLesson, router, selectedSubjectId]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      {/* Hero Header */}
      <View className="px-5 pt-4 pb-5 rounded-b-3xl" style={{ backgroundColor: theme.heroBg }}>
        <View className="flex-row items-center justify-between">
          <Text className="font-space-bold text-xl" style={{ color: '#fff' }}>{t('tabs.learn')}</Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: '#ffffff22' }}>
              <Star size={14} color="#FBBF24" fill="#FBBF24" />
              <Text className="font-space-bold text-sm" style={{ color: '#fff' }}>{gamificationXp} XP</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/my-preferences')}>
              <Settings size={22} color="#ffffffcc" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Subject Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          {subjects.map((subj) => {
            const active = subj.id === selectedSubjectId;
            return (
              <TouchableOpacity
                key={subj.id} activeOpacity={0.8}
                onPress={() => setSelectedSubjectId(subj.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: active ? theme.accent : theme.surface,
                  borderWidth: active ? 0 : 1, borderColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 16, ...(active ? { textShadowColor: '#ffffff88', textShadowRadius: 6 } : {}) }}>{subj.icon}</Text>
                <Text className="font-space-semibold text-sm" style={{ color: active ? '#fff' : theme.text }}>{subj.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading */}
        {loading && <View className="mx-4 mt-4"><SkeletonLoader variant="card" count={3} /></View>}

        {/* Empty state */}
        {!loading && !subjectDetail && (
          <View className="mx-4 mt-8 items-center py-12 rounded-2xl" style={{ backgroundColor: theme.surface }}>
            <Text className="font-space-semibold text-base" style={{ color: theme.textMuted }}>{t('courses.noCourseData')}</Text>
          </View>
        )}

        {/* Subject Header Card */}
        {!loading && subjectDetail && selectedSubject && (
          <View className="mx-4 mt-3 rounded-2xl p-4 flex-row items-center" style={{ backgroundColor: theme.surface }}>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text style={{ fontSize: 28 }}>{selectedSubject.icon}</Text>
                <Text className="font-space-bold text-lg" style={{ color: theme.text }}>{selectedSubject.title}</Text>
              </View>
              <Text className="font-space-medium text-xs mt-1" style={{ color: theme.textMuted }}>
                {t('courses.lessonsCompleted', { current: String(completedCount), total: String(totalCount) })}
              </Text>
              <View className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                <View className="h-full rounded-full" style={{ width: `${progressPct * 100}%`, backgroundColor: theme.success }} />
              </View>
            </View>
            {SubjectIllustration && (
              <View className="ml-3"><SubjectIllustration size={60} /></View>
            )}
          </View>
        )}

        {/* Unit sections */}
        {!loading && subjectDetail?.units.map((unit, unitIdx) => {
          const unitColor = UNIT_COLORS[unitIdx % UNIT_COLORS.length];
          const lessonNodes = unit.lessons.map((lesson, lessonIdx) => {
            const nodeIdx = unitStartIndices[unitIdx] + lessonIdx;
            const status: LessonStatus = completedLessonIds.includes(lesson.id)
              ? 'completed' : lesson.id === currentLessonId ? 'current' : 'locked';
            const offset = OFFSETS[nodeIdx % OFFSETS.length];
            const isLastInUnit = lessonIdx === unit.lessons.length - 1;
            const isLastGlobal = unitIdx === subjectDetail.units.length - 1 && isLastInUnit;

            return (
              <LessonNode
                key={lesson.id} title={lesson.title} status={status}
                offset={offset} isLast={isLastGlobal}
                onPress={() => handleLessonTap(lesson.id, status, lesson.title, lesson.concepts, unit.title, unit.title_bn)}
                unitColor={unitColor}
              />
            );
          });

          return (
            <View key={unit.id} className="mt-4">
              {/* Unit Header */}
              <View className="mx-4 rounded-2xl px-4 py-3 flex-row items-center overflow-hidden" style={{ backgroundColor: unitColor + '18' }}>
                <View style={{ position: 'absolute', right: 12, opacity: 0.05 }}>
                  <Text style={{ fontSize: 60 }}>{unit.icon}</Text>
                </View>
                <Text style={{ fontSize: 22 }}>{unit.icon}</Text>
                <View className="flex-1 ml-3">
                  <Text className="font-space-bold text-sm" style={{ color: unitColor }}>{unit.title}</Text>
                  <Text className="font-space-medium text-xs" style={{ color: theme.textMuted }}>{t('courses.chapter', { num: unit.nctb_chapter })}</Text>
                </View>
                <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: unitColor + '22' }}>
                  <Text className="font-space-semibold text-xs" style={{ color: unitColor }}>{t('courses.lessonsCount', { count: String(unit.lesson_count) })}</Text>
                </View>
              </View>

              <View className="mt-2 mx-4 rounded-3xl py-4 px-4" style={{ backgroundColor: theme.surface }}>
                {lessonNodes}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
