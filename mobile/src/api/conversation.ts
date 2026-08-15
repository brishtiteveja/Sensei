import { apiClient } from './client';
import type {
  ConversationMessagePairResponse,
  ConversationWithMessages,
  DiscussionListResponse,
  GuestConversationMessagePairResponse,
} from '@/types';

export async function startConversation(payload: {
  questionId: string;
  selectedText?: string;
  content: string;
}): Promise<ConversationMessagePairResponse> {
  const { data } = await apiClient.post<ConversationMessagePairResponse>(
    '/conversations/start',
    payload,
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  payload: { content: string },
): Promise<ConversationMessagePairResponse> {
  const { data } = await apiClient.post<ConversationMessagePairResponse>(
    `/conversations/${conversationId}/message`,
    payload,
  );
  return data;
}

export async function sendGuestMessage(payload: {
  sessionId: string;
  questionId: string;
  selectedText?: string;
  content: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}): Promise<GuestConversationMessagePairResponse> {
  const { data } = await apiClient.post<GuestConversationMessagePairResponse>(
    '/conversations/guest/message',
    payload,
  );
  return data;
}

export async function closeConversation(conversationId: string): Promise<void> {
  await apiClient.patch(`/conversations/${conversationId}/close`);
}

export async function shareConversation(conversationId: string): Promise<void> {
  await apiClient.patch(`/conversations/${conversationId}/share`);
}

export async function getDiscussions(
  questionId: string,
  cursor?: string,
  limit = 20,
): Promise<DiscussionListResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<DiscussionListResponse>(
    `/questions/${questionId}/discussions`,
    { params },
  );
  return data;
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationWithMessages> {
  const { data } = await apiClient.get<ConversationWithMessages>(
    `/conversations/${conversationId}`,
  );
  return data;
}
