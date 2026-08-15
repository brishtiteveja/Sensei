export type CommunityReactionEmoji = 'FIRE' | 'PARTY' | 'STRONG' | 'HEART' | 'WOW';

export interface CommunityUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface CommunityReactionSummary {
  emoji: CommunityReactionEmoji;
  count: number;
}

export interface CommunityAttemptSummary {
  id: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken: number;
  createdAt: string;
  questionSet: {
    id: string;
    name: string;
    year: string;
    subject: {
      id: string;
      name: string;
    };
  };
}

export interface CommunityPost {
  id: string;
  createdAt: string;
  user: CommunityUser;
  attempt: CommunityAttemptSummary;
  reactions: CommunityReactionSummary[];
  commentsCount: number;
  myReaction: CommunityReactionEmoji | null;
}

export interface CommunityAttemptDetail {
  id: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken: number;
  createdAt: string;
  questionSet: {
    id: string;
    name: string;
    year: string;
    subject: {
      id: string;
      name: string;
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

export interface CommunityPostDetail extends CommunityPost {
  attemptDetail: CommunityAttemptDetail;
}

export interface CommunityComment {
  id: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: string;
  user: CommunityUser;
  reactions: CommunityReactionSummary[];
  myReaction: CommunityReactionEmoji | null;
}

export interface CommunityListResponse {
  data: CommunityPost[];
  nextCursor: string | null;
  limit: number;
}

export interface CommunityCommentListResponse {
  data: CommunityComment[];
  nextCursor: string | null;
  limit: number;
}
