/** Shapes returned by the SenseiClaw API. Only fields the UI actually reads. */

export interface SubjectSummary {
  id: string;
  title: string;
  title_bn?: string;
  icon?: string;
  target_exams?: string[];
  total_units: number;
  total_lessons: number;
}

export interface LessonSummary {
  id: string;
  title: string;
  title_bn?: string;
  difficulty?: string;
  minutes?: number;
  concepts?: string[];
}

export interface Unit {
  id: string;
  title: string;
  title_bn?: string;
  icon?: string;
  nctb_chapter?: string;
  nctb_class?: string;
  lesson_count?: number;
  lessons: LessonSummary[];
}

export interface SubjectDetail {
  subject: string;
  title: string;
  title_bn?: string;
  icon?: string;
  target_exams?: string[];
  total_units: number;
  total_lessons: number;
  units: Unit[];
}

export type TeachingStepType = 'intro' | 'concept' | 'teach' | 'practice' | 'mastery';

export interface TeachingStep {
  step: number;
  type: TeachingStepType | string;
  prompt: string;
}

export interface LessonContent {
  lesson_id?: string;
  has_content: boolean;
  title?: string;
  learning_objectives?: string[];
  teaching_steps?: TeachingStep[];
  key_formulas?: string[];
  common_mistakes?: string[];
  practice_prompts?: string[];
  real_world_example?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  subject?: string;
  university?: string;
  exam?: string;
  year?: string;
  correct_answer?: string;
}

export interface LanguageInfo {
  name: string;
  name_local: string;
  flag?: string;
}

export type LanguageMap = Record<string, LanguageInfo>;

export interface CloudModel {
  id: string;
  label: string;
  note?: string;
}

export interface LocalModel {
  id: string;
  label: string;
  vision: boolean;
}

export interface ModelCatalog {
  current: { mode: 'local' | 'cloud' | string; model: string };
  resident_local_model?: string | null;
  cloud: CloudModel[];
  local: LocalModel[];
  local_swap_warning?: string;
}

export interface ModelSwitchResult {
  ok: boolean;
  mode?: string;
  model?: string;
  vision?: boolean;
  warning?: string;
}

export interface TutorHealth {
  status: string;
  engines?: number;
}

export type ContextType = 'free_chat' | 'topic_study' | 'exam_review';

export interface TutorContextData {
  language: string;
  lesson_id?: string;
  lesson_step?: number;
  subject?: string;
  question_id?: string;
  [key: string]: unknown;
}

export interface TutorRequest {
  message: string;
  session_id?: string | null;
  context_type: ContextType;
  context_data: TutorContextData;
}
