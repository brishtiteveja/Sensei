import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { curriculumApi } from '@/api';
import type { CurriculumSubject, SubjectDetail } from '@/api/curriculum';

export type { CurriculumSubject, SubjectDetail };

type CourseProgressContextValue = {
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  subjects: CurriculumSubject[];
  subjectDetail: SubjectDetail | null;
  completedLessonIds: string[];
  currentLessonId: string | null;
  totalXp: number;
  loading: boolean;
  completeLesson: (lessonId: string) => void;
};

const storageKey = (id: string) => `course_progress_${id}`;

const CourseProgressContext = createContext<CourseProgressContextValue | undefined>(undefined);

export function CourseProgressProvider({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  const [selectedSubjectId, setSelectedSubjectId] = useState('physics');
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { curriculumApi.getSubjects(language).then(setSubjects); }, [language]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      const [detail, stored] = await Promise.all([
        curriculumApi.getSubjectDetail(selectedSubjectId, language),
        AsyncStorage.getItem(storageKey(selectedSubjectId)),
      ]);
      if (cancelled) return;
      setSubjectDetail(detail);
      if (stored) {
        const parsed = JSON.parse(stored) as { completedLessonIds: string[]; totalXp: number };
        setCompletedLessonIds(parsed.completedLessonIds);
        setTotalXp(parsed.totalXp);
      } else {
        setCompletedLessonIds([]);
        setTotalXp(0);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // `language` matters: without it a language switch would keep showing the
    // previously-fetched, previously-translated curriculum tree.
  }, [selectedSubjectId, language]);

  const currentLessonId = useMemo(() => {
    if (!subjectDetail) return null;
    for (const unit of subjectDetail.units)
      for (const lesson of unit.lessons)
        if (!completedLessonIds.includes(lesson.id)) return lesson.id;
    return null;
  }, [subjectDetail, completedLessonIds]);

  const completeLesson = useCallback((lessonId: string) => {
    if (completedLessonIds.includes(lessonId)) return;
    const nextCompleted = [...completedLessonIds, lessonId];
    const nextXp = totalXp + 10;
    setCompletedLessonIds(nextCompleted);
    setTotalXp(nextXp);
    AsyncStorage.setItem(
      storageKey(selectedSubjectId),
      JSON.stringify({ completedLessonIds: nextCompleted, totalXp: nextXp }),
    );
  }, [completedLessonIds, totalXp, selectedSubjectId]);

  const value = useMemo<CourseProgressContextValue>(() => ({
    selectedSubjectId, setSelectedSubjectId, subjects, subjectDetail,
    completedLessonIds, currentLessonId, totalXp, loading, completeLesson,
  }), [
    selectedSubjectId, subjects, subjectDetail, completedLessonIds,
    currentLessonId, totalXp, loading, completeLesson,
  ]);

  return <CourseProgressContext.Provider value={value}>{children}</CourseProgressContext.Provider>;
}

export function useCourseProgress() {
  const ctx = useContext(CourseProgressContext);
  if (!ctx) throw new Error('useCourseProgress must be used inside CourseProgressProvider');
  return ctx;
}
