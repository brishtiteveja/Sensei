export type LeaderboardCriteria =
  | 'totalScore'
  | 'averageScore'
  | 'totalAttempts'
  | 'fastestTime';

export type LeaderboardTimeRange = 'weekly' | 'monthly' | 'all';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  totalScore: number;
  averageScore: number;
  totalAttempts: number;
  fastestTime: number;
  activeDays: number;
  metricValue: number;
}

export interface LeaderboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface LeaderboardResponse {
  criteria: LeaderboardCriteria;
  timeRange: LeaderboardTimeRange;
  topThree: LeaderboardEntry[];
  list: LeaderboardEntry[];
  pagination: LeaderboardPagination;
  currentUser: LeaderboardEntry | null;
}
