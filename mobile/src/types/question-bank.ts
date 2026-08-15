export interface QuestionBankSubjectBrief {
  id: string;
  name: string;
  icon: string;
}

export interface QuestionBankUniversity {
  id: string;
  name: string;
  shortName: string;
  colorName: string;
  gradient: string[];
  subjects: QuestionBankSubjectBrief[];
}

export interface QuestionBankQuestionSet {
  id: string;
  name: string;
  year: string;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completedBy: number;
  avgScore: number;
  universityShortName?: string;
}

export interface QuestionBankSubjectWithSets {
  id: string;
  name: string;
  icon: string;
  sets: QuestionBankQuestionSet[];
}

export interface QuestionBankQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  solution: Array<{
    title: string;
    content: string;
  }>;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export interface QuestionBankQuestionSetDetail {
  id: string;
  name: string;
  year: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: QuestionBankQuestion[];
}
