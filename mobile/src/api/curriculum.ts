/**
 * SenseiClaw Curriculum API client — fetches structured curriculum data
 * (subjects, units, lessons, exams) from the SenseiClaw backend.
 */

const SENSEI_BASE_URL =
  process.env.EXPO_PUBLIC_SENSEI_API_URL?.trim() || 'http://167.86.98.204:4050';

export interface CurriculumSubject {
  id: string;
  title: string;
  title_bn: string;
  icon: string;
  target_exams: string[];
  total_units: number;
  total_lessons: number;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  title_bn: string;
  difficulty: string;
  minutes: number;
  concepts: string[];
}

export interface CurriculumUnit {
  id: string;
  title: string;
  title_bn: string;
  icon: string;
  nctb_chapter: string;
  nctb_class: string;
  lesson_count: number;
  lessons: CurriculumLesson[];
}

export interface SubjectDetail {
  subject: string;
  title: string;
  title_bn: string;
  icon: string;
  target_exams: string[];
  total_units: number;
  total_lessons: number;
  units: CurriculumUnit[];
}

export interface ExamInfo {
  subjects: string[];
  label: string;
  label_bn: string;
}

/**
 * Fetch all curriculum subjects.
 */
export async function getSubjects(lang?: string): Promise<CurriculumSubject[]> {
  try {
    // Subject/unit/lesson names are translated server-side. Without `lang` the
    // server returns English, which is what left the curriculum in English beside
    // a fully translated UI.
    const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/subjects${qs}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.subjects || [];
  } catch {
    return [];
  }
}

/**
 * Fetch detailed info for a single subject (including its units and lessons).
 */
export async function getSubjectDetail(subjectId: string, lang?: string): Promise<SubjectDetail | null> {
  try {
    const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/subjects/${subjectId}${qs}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch the exam catalogue.
 */
export async function getExams(): Promise<Record<string, ExamInfo>> {
  try {
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/exams`);
    if (!response.ok) return {};
    const data = await response.json();
    return data.exams || {};
  } catch {
    return {};
  }
}

export interface AdmissionTrack {
  title: string;
  title_local: string;
  description: string;
  icon: string;
  subjects: string[];
  exams: string[];
  weights: Record<string, number>;
}

export interface RegionUniversity {
  name: string;
  name_local: string;
  track: string;
  city: string;
}

export interface RegionConfig {
  id: string;
  name: string;
  name_local: string;
  grade_level: string;
  language: string;
  tracks: Record<string, AdmissionTrack>;
  universities: Record<string, RegionUniversity>;
  subjects: Record<string, { title: string; title_local: string; icon: string }>;
}

export async function getTracks(region?: string): Promise<Record<string, AdmissionTrack>> {
  try {
    const qs = region ? `?region=${region}` : '';
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/tracks${qs}`);
    if (!response.ok) return {};
    const data = await response.json();
    return data.tracks || {};
  } catch {
    return {};
  }
}

export async function getRegion(regionId: string = 'bd'): Promise<RegionConfig | null> {
  try {
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/region/${regionId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getRegions(): Promise<Record<string, { id: string; name: string; name_local: string; language: string }>> {
  try {
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/regions`);
    if (!response.ok) return {};
    const data = await response.json();
    return data.regions || {};
  } catch {
    return {};
  }
}

export interface LanguageInfo {
  name: string;
  name_local: string;
  flag: string;
}

export async function getLanguages(): Promise<Record<string, LanguageInfo>> {
  try {
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/languages`);
    if (!response.ok) return {};
    const data = await response.json();
    return data.languages || {};
  } catch {
    return {};
  }
}

export async function translateQuestion(
  question: Record<string, unknown>,
  targetLang: string,
  sourceLang: string = 'bn',
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${SENSEI_BASE_URL}/curriculum/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, target_lang: targetLang, source_lang: sourceLang }),
    });
    if (!response.ok) return question;
    const data = await response.json();
    return data.translated || question;
  } catch {
    return question;
  }
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  subject: string;
  university: string;
  exam: string;
  year: string;
  correct_answer: string;
}

export interface PracticeSubject {
  name: string;
  count: number;
}

/**
 * Fetch practice questions with optional filters.
 */
export async function getQuestions(params?: {
  subject?: string;
  university?: string;
  chapter?: string;
  limit?: number;
  exclude?: string;
  /**
   * Target language for the question text. The bank is stored in Bangla; the server
   * translates on demand (cached) so the whole app stays in one language. Omit, or
   * pass 'bn', to get the originals untouched.
   */
  lang?: string;
}): Promise<PracticeQuestion[]> {
  try {
    const parts: string[] = [];
    if (params?.subject) parts.push(`subject=${encodeURIComponent(params.subject)}`);
    if (params?.university) parts.push(`university=${encodeURIComponent(params.university)}`);
    if (params?.chapter) parts.push(`chapter=${encodeURIComponent(params.chapter)}`);
    if (params?.limit != null) parts.push(`limit=${params.limit}`);
    if (params?.exclude) parts.push(`exclude=${encodeURIComponent(params.exclude)}`);
    if (params?.lang && params.lang !== 'bn') parts.push(`lang=${encodeURIComponent(params.lang)}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    const response = await fetch(`${SENSEI_BASE_URL}/practice/questions${qs}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.questions || [];
  } catch {
    return [];
  }
}

/**
 * Fetch available practice subjects with question counts.
 */
export async function getPracticeSubjects(): Promise<PracticeSubject[]> {
  try {
    const response = await fetch(`${SENSEI_BASE_URL}/practice/subjects`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.subjects || [];
  } catch {
    return [];
  }
}
