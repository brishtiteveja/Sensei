import { apiClient, API_BASE_URL } from './client';
import { getTokens } from '@/lib/token-storage';
import type {
  AiProvidersResponse,
  AiChatSession,
  AiChatSessionListResponse,
  AiChatMessageListResponse,
  AiChatSendMessageResponse,
  AiStreamEvent,
} from '@/types';
import type { GuestAiMessageResponse } from '@/types/ai-credits';

export async function getProviders(): Promise<AiProvidersResponse> {
  const { data } = await apiClient.get<AiProvidersResponse>('/ai/providers');
  return data;
}

export async function getUserSessions(
  cursor?: string,
  limit = 20,
): Promise<AiChatSessionListResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<AiChatSessionListResponse>(
    '/ai/chat/sessions',
    { params },
  );
  return data;
}

export async function createChatSession(payload?: {
  title?: string;
  providerKey?: string;
  model?: string;
}): Promise<AiChatSession> {
  const { data } = await apiClient.post<AiChatSession>('/ai/chat/sessions', payload ?? {});
  return data;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/ai/chat/sessions/${sessionId}`);
}

export async function getChatSessionMessages(
  sessionId: string,
  cursor?: string,
  limit = 20,
): Promise<AiChatMessageListResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<AiChatMessageListResponse>(
    `/ai/chat/sessions/${sessionId}/messages`,
    { params },
  );
  return data;
}

export async function sendChatMessage(
  sessionId: string,
  payload: {
    content: string;
    providerKey?: string;
    model?: string;
  },
): Promise<AiChatSendMessageResponse> {
  const { data } = await apiClient.post<AiChatSendMessageResponse>(
    `/ai/chat/sessions/${sessionId}/messages`,
    payload,
  );
  return data;
}

export async function sendGuestMessage(
  sessionId: string,
  content: string,
): Promise<GuestAiMessageResponse> {
  const { data } = await apiClient.post<GuestAiMessageResponse>(
    '/ai/guest/message',
    { sessionId, content },
  );
  return data;
}

export async function streamChatMessage(
  sessionId: string,
  payload: {
    content: string;
    providerKey?: string;
    model?: string;
  },
  onChunk: (event: AiStreamEvent) => void,
): Promise<void> {
  const tokens = await getTokens();
  const url = `${API_BASE_URL}/ai/chat/sessions/${sessionId}/messages/stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken
        ? { Authorization: `Bearer ${tokens.accessToken}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(errorBody || `Stream request failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error('No response body for stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as AiStreamEvent;
          onChunk(event);
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
