import axios from 'axios';
import { Platform } from 'react-native';
import { learnerId } from '@/lib/learner';
import { displayName } from '@/lib/display-name';
import type {
  CommunityListResponse,
  CommunityPost,
  CommunityPostDetail,
  CommunityReactionEmoji,
  CommunityComment,
  CommunityCommentListResponse,
  CommunityAttemptInput,
  CommunityAttemptResult,
} from '@/types';

/*
 * Community is served by Sensei's own backend (backend/sensei/community.py),
 * not by the NestJS API that apiClient points at. It speaks the same wire
 * format as ShikkhaDikkha's community module, so these calls are unchanged
 * from that app apart from the client and how the person is identified.
 *
 * There is no sign-in, so a person is their learner id. That header is an
 * identifier, not a credential -- see the note at the top of community.py.
 */

const ENV_BASE_URL = process.env.EXPO_PUBLIC_COMMUNITY_API_URL?.trim();

// Android emulator uses 10.0.2.2 to reach host localhost
const DEV_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

// No production fallback, for the same reason as client.ts: a guessed host
// fails in confusing ways, an empty one fails immediately and says so.
export const COMMUNITY_BASE_URL = ENV_BASE_URL || (__DEV__ ? DEV_BASE_URL : '');

if (!COMMUNITY_BASE_URL) {
  console.warn('[api] EXPO_PUBLIC_COMMUNITY_API_URL is not set. Community will not work in this build.');
}

const communityClient = axios.create({
  baseURL: COMMUNITY_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

communityClient.interceptors.request.use((config) => {
  config.headers['X-Learner-Id'] = learnerId();
  const name = displayName();
  // Headers are Latin-1; names are usually Bangla.
  if (name) config.headers['X-Learner-Name'] = encodeURIComponent(name);
  return config;
});

/** The id the server knows this person by -- used to tell "my post" apart. */
export function currentLearnerId(): string {
  return learnerId();
}

export async function submitAttempt(input: CommunityAttemptInput): Promise<CommunityAttemptResult> {
  const { data } = await communityClient.post<CommunityAttemptResult>('/mocktest/attempts', input);
  return data;
}

export async function shareAttempt(mocktestAttemptId: string): Promise<CommunityPost> {
  const { data } = await communityClient.post<CommunityPost>('/community/share', { mocktestAttemptId });
  return data;
}

export async function getCommunity(cursor?: string, limit = 10): Promise<CommunityListResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await communityClient.get<CommunityListResponse>('/community', { params });
  return data;
}

export async function getCommunityPost(postId: string): Promise<CommunityPostDetail> {
  const { data } = await communityClient.get<CommunityPostDetail>(`/community/${postId}`);
  return data;
}

type CommunityReactionResponse = {
  myReaction: CommunityReactionEmoji | null;
  reactions: Array<{ emoji: CommunityReactionEmoji; count: number }>;
};

export async function reactToPost(postId: string, emoji: CommunityReactionEmoji): Promise<CommunityReactionResponse> {
  const { data } = await communityClient.post(`/community/${postId}/react`, { emoji });
  return data;
}

export async function reactToComment(commentId: string, emoji: CommunityReactionEmoji): Promise<CommunityReactionResponse> {
  const { data } = await communityClient.post(`/community/comments/${commentId}/react`, { emoji });
  return data;
}

export async function addComment(
  postId: string,
  content: string,
  replyToCommentId?: string,
): Promise<CommunityComment> {
  const { data } = await communityClient.post<CommunityComment>(
    `/community/${postId}/comment`,
    {
      content,
      replyToCommentId,
    },
  );
  return data;
}

export async function getComments(
  postId: string,
  cursor?: string,
  limit = 20,
): Promise<CommunityCommentListResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await communityClient.get<CommunityCommentListResponse>(
    `/community/${postId}/comments`,
    { params },
  );
  return data;
}
