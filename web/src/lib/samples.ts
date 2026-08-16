/**
 * The curated worked-problem sample kit (see repo `samples/`, PR #1).
 *
 * These are hand-picked problems — one per common-mistake per subject and level
 * — with a printed worksheet image, a correct solution, and several solutions
 * that each carry exactly one realistic error. They power Practice's
 * "special examples" mode, where a student solves step by step and the tutor
 * watches for the mistake, instead of drilling random multiple-choice questions.
 *
 * Served as static files under the app's base path (`/sensei/samples/…`), so
 * there is no API call and nothing leaves the box.
 */

export interface SampleSolution {
  name: string; // good_1, bad_1, …
  work: string[];
}

export interface SampleProblem {
  id: string;
  subject: string;
  band: 'basic' | 'advanced';
  level: string;
  slug: string;
  title: string;
  problem: string;
  answer: string | null;
  dir: string;
  images: { ques: string | null; good: string[]; bad: string[] };
  solutions: SampleSolution[];
}

interface Manifest {
  version: number;
  subjects: string[];
  problems: SampleProblem[];
}

/** Absolute, same-origin URL for a path stored in the manifest. */
export function sampleUrl(relPath: string): string {
  return `${import.meta.env.BASE_URL}samples/${relPath}`;
}

let cache: Promise<Manifest> | null = null;

export function loadSamples(): Promise<Manifest> {
  if (!cache) {
    cache = fetch(sampleUrl('manifest.json')).then((r) => {
      if (!r.ok) throw new Error(`samples manifest ${r.status}`);
      return r.json() as Promise<Manifest>;
    });
  }
  return cache;
}

/** Subjects that actually have curated problems, in a stable order. */
export const SAMPLE_SUBJECTS = ['physics', 'chemistry', 'math'] as const;
