/** Wire types. Mirrors backend/sensei/server.py -- keep in sync by hand. */

export type Health = {
  status: string;
  pinned_model: string;
  resident_model: string | null;
  /** false means the next request eats a 1-5 minute cold swap. */
  warm: boolean;
  offline_mode: boolean;
};

export type Turn = { role: 'user' | 'assistant'; content: string };

export type TutorStreamRequest = {
  learner_id: string;
  message: string;
  lesson?: string | null;
  /** Set to let the graph redirect teaching to an upstream weak concept. */
  concept_id?: string | null;
  history: Turn[];
};

export type PathConcept = {
  id: string;
  name: string;
  name_local: string | null;
  prereqs: string[];
  mastery: number;
};

export type CoursePath = {
  next: string | null;
  unlocked: string[];
  concepts: PathConcept[];
};

export type LearnerProfile = {
  id: string;
  name: string | null;
  language: string;
  exam: string | null;
  exam_date: string | null;
  strengths: string[];
  weaknesses: string[];
  recent_mistakes: string[];
};

export type Diagnosis = {
  diagnosis: string;
  tutor_opening: string;
};

/** Matches backend/sensei/graph.py MASTERY_THRESHOLD. */
export const MASTERY_THRESHOLD = 0.7;
