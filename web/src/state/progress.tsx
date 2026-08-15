import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readJSON, removeKey, writeJSON } from '@/lib/storage';
import { dayKey, daysBetween, pct } from '@/lib/utils';

/**
 * Learner progress.
 *
 * The Sensei API on this box exposes no `/learner/*` route, so progress is kept
 * in localStorage. Everything here is deliberately shaped like a server
 * resource so swapping in a real endpoint later is a change to this file only.
 */

export interface LessonRecord {
  lessonId: string;
  subjectId: string;
  unitId: string;
  concepts: string[];
  completedAt: number;
  minutes: number;
}

export interface PracticeRecord {
  questionId: string;
  subjectId: string;
  correct: boolean;
  at: number;
}

export interface LastVisited {
  subjectId: string;
  unitId: string;
  lessonId: string;
  lessonTitle: string;
  subjectTitle: string;
  at: number;
}

interface ProgressState {
  version: 1;
  lessons: Record<string, LessonRecord>;
  practice: PracticeRecord[];
  lastVisited: LastVisited | null;
  streak: { count: number; lastDay: string | null };
}

const EMPTY: ProgressState = {
  version: 1,
  lessons: {},
  practice: [],
  lastVisited: null,
  streak: { count: 0, lastDay: null },
};

const STORE_KEY = 'progress.v1';

interface ProgressApi {
  state: ProgressState;
  completeLesson: (r: Omit<LessonRecord, 'completedAt'>) => void;
  uncompleteLesson: (lessonId: string) => void;
  isLessonComplete: (lessonId: string) => boolean;
  recordVisit: (v: Omit<LastVisited, 'at'>) => void;
  recordPractice: (r: Omit<PracticeRecord, 'at'>) => void;
  reset: () => void;
  /** Fraction 0–100 of lessons done in a subject, given its total. */
  subjectPercent: (subjectId: string, totalLessons: number) => number;
  subjectLessonsDone: (subjectId: string) => number;
  conceptMastery: () => Array<{ concept: string; hits: number; subjects: string[] }>;
  totals: {
    lessonsDone: number;
    minutes: number;
    practiceTotal: number;
    practiceCorrect: number;
    accuracy: number;
  };
}

const Ctx = createContext<ProgressApi | null>(null);

function touchStreak(streak: ProgressState['streak']): ProgressState['streak'] {
  const today = dayKey();
  if (streak.lastDay === today) return streak;
  if (streak.lastDay && daysBetween(streak.lastDay, today) === 1) {
    return { count: streak.count + 1, lastDay: today };
  }
  return { count: 1, lastDay: today };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => {
    const loaded = readJSON<ProgressState>(STORE_KEY, EMPTY);
    // Defensive: a hand-edited or older payload should not crash the app.
    return {
      ...EMPTY,
      ...loaded,
      lessons: loaded?.lessons ?? {},
      practice: Array.isArray(loaded?.practice) ? loaded.practice : [],
      streak: loaded?.streak ?? EMPTY.streak,
    };
  });

  useEffect(() => {
    writeJSON(STORE_KEY, state);
  }, [state]);

  const completeLesson = useCallback((r: Omit<LessonRecord, 'completedAt'>) => {
    setState((s) => ({
      ...s,
      lessons: { ...s.lessons, [r.lessonId]: { ...r, completedAt: Date.now() } },
      streak: touchStreak(s.streak),
    }));
  }, []);

  const uncompleteLesson = useCallback((lessonId: string) => {
    setState((s) => {
      const next = { ...s.lessons };
      delete next[lessonId];
      return { ...s, lessons: next };
    });
  }, []);

  const recordVisit = useCallback((v: Omit<LastVisited, 'at'>) => {
    setState((s) => {
      if (s.lastVisited?.lessonId === v.lessonId) return s;
      return { ...s, lastVisited: { ...v, at: Date.now() }, streak: touchStreak(s.streak) };
    });
  }, []);

  const recordPractice = useCallback((r: Omit<PracticeRecord, 'at'>) => {
    setState((s) => ({
      ...s,
      // Keep the tail bounded so localStorage never grows without limit.
      practice: [...s.practice, { ...r, at: Date.now() }].slice(-500),
      streak: touchStreak(s.streak),
    }));
  }, []);

  const reset = useCallback(() => {
    removeKey(STORE_KEY);
    setState(EMPTY);
  }, []);

  const api = useMemo<ProgressApi>(() => {
    const lessonList = Object.values(state.lessons);
    const practiceCorrect = state.practice.filter((p) => p.correct).length;

    return {
      state,
      completeLesson,
      uncompleteLesson,
      recordVisit,
      recordPractice,
      reset,
      isLessonComplete: (id) => Boolean(state.lessons[id]),
      subjectLessonsDone: (subjectId) =>
        lessonList.filter((l) => l.subjectId === subjectId).length,
      subjectPercent: (subjectId, totalLessons) =>
        pct(lessonList.filter((l) => l.subjectId === subjectId).length, totalLessons),
      conceptMastery: () => {
        const map = new Map<string, { hits: number; subjects: Set<string> }>();
        for (const l of lessonList) {
          for (const c of l.concepts ?? []) {
            const entry = map.get(c) ?? { hits: 0, subjects: new Set<string>() };
            entry.hits += 1;
            entry.subjects.add(l.subjectId);
            map.set(c, entry);
          }
        }
        return [...map.entries()]
          .map(([concept, v]) => ({ concept, hits: v.hits, subjects: [...v.subjects] }))
          .sort((a, b) => b.hits - a.hits || a.concept.localeCompare(b.concept));
      },
      totals: {
        lessonsDone: lessonList.length,
        minutes: lessonList.reduce((sum, l) => sum + (l.minutes || 0), 0),
        practiceTotal: state.practice.length,
        practiceCorrect,
        accuracy: pct(practiceCorrect, state.practice.length),
      },
    };
  }, [state, completeLesson, uncompleteLesson, recordVisit, recordPractice, reset]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
