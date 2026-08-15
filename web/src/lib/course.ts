import type { LessonSummary, SubjectDetail, Unit } from './types';

export type LessonState = 'completed' | 'current' | 'available' | 'locked';

export interface FlatLesson {
  lesson: LessonSummary;
  unit: Unit;
  unitIndex: number;
  lessonIndex: number;
  /** Position in the whole course, used for prev/next and gating. */
  ordinal: number;
  state: LessonState;
}

export interface CourseOutline {
  flat: FlatLesson[];
  byId: Map<string, FlatLesson>;
  totalLessons: number;
  completedCount: number;
  percent: number;
  /** First lesson that is not yet complete — the "current" one. */
  current: FlatLesson | null;
}

/**
 * Flattens a subject into an ordered lesson list and assigns each lesson a
 * state.
 *
 * Gating follows the course path idea in docs/PLAN.md: everything up to and
 * including the first incomplete lesson is open, the rest reads as locked.
 * The UI still lets a student open a locked lesson — a hard block is the wrong
 * behaviour for a tutor, and it makes the product undemoable — so "locked" here
 * is a recommendation, not an ACL.
 */
export function buildOutline(
  subject: SubjectDetail | null | undefined,
  isComplete: (lessonId: string) => boolean,
): CourseOutline {
  const flat: FlatLesson[] = [];
  const byId = new Map<string, FlatLesson>();

  if (!subject) {
    return { flat, byId, totalLessons: 0, completedCount: 0, percent: 0, current: null };
  }

  let ordinal = 0;
  (subject.units ?? []).forEach((unit, unitIndex) => {
    (unit.lessons ?? []).forEach((lesson, lessonIndex) => {
      const entry: FlatLesson = {
        lesson,
        unit,
        unitIndex,
        lessonIndex,
        ordinal: ordinal++,
        state: 'locked',
      };
      flat.push(entry);
      byId.set(lesson.id, entry);
    });
  });

  const firstIncomplete = flat.findIndex((f) => !isComplete(f.lesson.id));
  const currentIndex = firstIncomplete === -1 ? flat.length : firstIncomplete;

  for (const f of flat) {
    if (isComplete(f.lesson.id)) f.state = 'completed';
    else if (f.ordinal === currentIndex) f.state = 'current';
    else if (f.ordinal < currentIndex) f.state = 'available';
    else f.state = 'locked';
  }

  const completedCount = flat.filter((f) => f.state === 'completed').length;

  return {
    flat,
    byId,
    totalLessons: flat.length,
    completedCount,
    percent: flat.length ? Math.round((completedCount / flat.length) * 100) : 0,
    current: flat[currentIndex] ?? null,
  };
}

export function unitProgress(unit: Unit, isComplete: (id: string) => boolean) {
  const lessons = unit.lessons ?? [];
  const done = lessons.filter((l) => isComplete(l.id)).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}
