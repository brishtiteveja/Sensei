export type LearningGoalPreference = 'learn' | 'exam' | 'practice' | 'fun';
export type LearningLevelPreference =
  | 'beginner'
  | 'intermediate'
  | 'advanced';
export type OnboardingSubjectPreference =
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'english'
  | 'bangla'
  | 'ict'
  | 'gk';
export type ReminderMomentPreference =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'none';
export type AdmissionTrackPreference =
  | 'university'
  | 'engineering'
  | 'medical'
  | 'all';

export interface UserPreferences {
  learningGoal: LearningGoalPreference | null;
  learningLevel: LearningLevelPreference | null;
  onboardingSubjectKeys: OnboardingSubjectPreference[];
  dailyStudyGoalMinutes: number | null;
  reminderMoment: ReminderMomentPreference | null;
  admissionTrack: AdmissionTrackPreference | null;
  appLanguage: string | null;
  regionId: string | null;
  preferredUniversityIds: string[];
  preferredSubjectIds: string[];
  preferencesUpdatedAt: string | null;
}

export interface LocalPreferencesState extends UserPreferences {
  lastSyncedAt: string | null;
}

export type UpdatePreferencesPayload = Partial<
  Omit<UserPreferences, 'preferencesUpdatedAt'>
>;
