import { getLanguages, getSubject, getSubjects } from '@/lib/api';
import type { LanguageMap, SubjectDetail, SubjectSummary } from '@/lib/types';
import { useAsync } from './useAsync';
import { useSettings } from '@/state/settings';

/**
 * Process-lifetime cache for curriculum reads.
 *
 * The catalog is static per language, and the course sidebar + lesson view both
 * need the same subject payload — without this, moving between lessons refetches
 * a large tree on every navigation.
 */
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, run: (signal: AbortSignal) => Promise<T>) {
  return (signal: AbortSignal): Promise<T> => {
    const hit = cache.get(key) as Promise<T> | undefined;
    if (hit) return hit;
    // Deliberately not passing `signal` through: one component unmounting must
    // not poison a cached result other components are waiting on.
    void signal;
    const p = run(new AbortController().signal).catch((err) => {
      cache.delete(key); // never cache a failure — retry must actually retry
      throw err;
    });
    cache.set(key, p);
    return p;
  };
}

export function clearCurriculumCache() {
  cache.clear();
}

export function useSubjects() {
  const { language } = useSettings();
  return useAsync<SubjectSummary[]>(
    cached(`subjects:${language}`, () => getSubjects(language)),
    [language],
  );
}

export function useSubject(subjectId: string | undefined) {
  const { language } = useSettings();
  return useAsync<SubjectDetail>(
    cached(`subject:${subjectId}:${language}`, () => getSubject(subjectId!, language)),
    [subjectId, language],
    { enabled: Boolean(subjectId) },
  );
}

export function useLanguages() {
  return useAsync<LanguageMap>(cached('languages', () => getLanguages()), []);
}
