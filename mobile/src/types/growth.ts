export interface SubjectStat {
  subjectId: string;
  subjectName: string;
  universityName: string;
  totalAttempts: number;
  averageAccuracy: number;
  totalQuestions: number;
}

export interface WeeklyActivityDay {
  date: string;
  dayLabel: string;
  questionsAnswered: number;
  quizzesAttempted: number;
  studyMinutes: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface GrowthLevel {
  rank: number;
  label: string;
  minScore: number;
  maxScore: number;
}

export interface GrowthScoreBreakdown {
  accuracyScore: number;
  activityScore: number;
  streakScore: number;
  improvementScore: number;
}

export interface GrowthSummary {
  growthScore: number;
  streak: number;
  longestStreak: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  totalStudyTimeMinutes: number;
  aiChatUsed: number;
  askAiUsed: number;
  communityPosts: number;
  communityComments: number;
  daysActiveThisMonth: number;
  level: GrowthLevel;
  strongSubjects: SubjectStat[];
  weakSubjects: SubjectStat[];
  weeklyActivity: WeeklyActivityDay[];
  scoreBreakdown: GrowthScoreBreakdown;
}
