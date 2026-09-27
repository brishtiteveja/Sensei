import { learnerId } from '@/lib/learner';
import { backendClient as communityClient } from './backend-client';
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
 * Community is served by Sensei's own backend (backend/sensei/community.py).
 * It speaks the same wire format as ShikkhaDikkha's community module, so these
 * calls are unchanged from that app apart from the client (see
 * backend-client.ts) and how the person is identified.
 */

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
