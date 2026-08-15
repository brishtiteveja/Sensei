export interface SolutionStep {
  title: string;
  content: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  year: string;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completedBy: number;
  avgScore: number;
}

export interface SubjectWithSets {
  id: string;
  name: string;
  icon: string;
  sets: QuestionSet[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  solution: SolutionStep[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export interface QuestionSetDetail {
  id: string;
  name: string;
  year: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: Question[];
}

export interface MocktestAnswerResult {
  questionId: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
}

export interface MocktestAttemptResult {
  id: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken: number;
  questionSetId: string;
  answers: MocktestAnswerResult[];
  createdAt: string;
}

export interface MocktestAttemptSummary {
  id: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken: number;
  questionSetId: string;
  createdAt: string;
  questionSet: {
    id: string;
    name: string;
    year: string;
    difficulty: string;
    subject: {
      id: string;
      name: string;
      icon: string;
    };
  };
}

export interface MocktestAttemptDetail {
  id: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken: number;
  questionSetId: string;
  createdAt: string;
  questionSet: {
    id: string;
    name: string;
    year: string;
    difficulty: string;
    subject: {
      id: string;
      name: string;
      icon: string;
    };
  };
  answers: Array<{
    questionId: string;
    selectedIndex: number | null;
    isCorrect: boolean;
    question: {
      id: string;
      text: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
