/**
 * SenseiClaw API client — connects the mobile app directly to the
 * Socratic AI tutor backend for streaming chat.
 *
 * SenseiClaw handles: Socratic teaching, 17K+ question bank, tools.
 * NestJS backend still handles: auth, credits, session persistence.
 *
 * This module provides:
 * - streamSenseiMessage() — SSE streaming from SenseiClaw /tutor/stream
 * - sendSenseiMessage() — non-streaming from /tutor/query
 * - getSenseiSuggestions() — starter prompts from /tutor/suggestions
 * - getSenseiHint() — Socratic hint for a question
 */

import type { AiStreamEvent } from '@/types';

const SENSEI_BASE_URL =
  process.env.EXPO_PUBLIC_SENSEI_API_URL?.trim() || 'http://167.86.98.204:4050';

export interface SenseiStreamOptions {
  message: string;
  sessionId?: string;
  contextType?: 'free_chat' | 'exam_question' | 'exam_review' | 'topic_study';
  contextData?: Record<string, unknown>;
  language?: string;
}

export interface SenseiSuggestion {
  suggestions: string[];
}

export interface SenseiHintResponse {
  hint: string;
  sessionId: string;
  questionId: string;
}

/**
 * Stream a chat message from SenseiClaw.
 * Translates SenseiClaw SSE events into the app's AiStreamEvent format.
 */
export function streamSenseiMessage(
  options: SenseiStreamOptions,
  onChunk: (event: AiStreamEvent) => void,
): Promise<void> {
  const url = `${SENSEI_BASE_URL}/tutor/stream`;

  return new Promise((resolve, reject) => {
    let collectedText = '';
    let senseiSessionId = '';
    let lastProcessed = 0;
    let gotFirstToken = false;
    let gotDone = false;

    const firstTokenTimeout = setTimeout(() => {
      if (!gotFirstToken) {
        onChunk({ type: 'error', error: 'Response is taking too long. Please try again.' });
        xhr.abort();
        reject(new Error('First token timeout'));
      }
    }, 30000);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onprogress = () => {
      const newText = xhr.responseText.slice(lastProcessed);
      lastProcessed = xhr.responseText.length;
      if (!newText) return;

      const lines = newText.split('\n');
      let currentEventType = '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('event: ')) {
          currentEventType = trimmed.slice(7).trim();
          continue;
        }

        if (!trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (!jsonStr) continue;

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        switch (currentEventType) {
          case 'progress':
            if (data.session_id) {
              senseiSessionId = data.session_id as string;
            }
            break;

          case 'token':
            if (data.text) {
              if (!gotFirstToken) {
                gotFirstToken = true;
                clearTimeout(firstTokenTimeout);
              }
              collectedText += data.text as string;
              onChunk({ type: 'chunk', content: data.text as string });
            }
            break;

          case 'suggestions':
            if (Array.isArray(data.suggestions)) {
              onChunk({ type: 'suggestions', suggestions: data.suggestions as string[] });
            }
            break;

          case 'summary':
            onChunk({ type: 'summary', summary: data as any });
            break;

          case 'tool_use':
          case 'tool_result':
            break;

          case 'done':
            gotDone = true;
            clearTimeout(firstTokenTimeout);
            onChunk({
              type: 'done',
              message: {
                id: `sensei-${Date.now()}`,
                sessionId: senseiSessionId || '',
                role: 'assistant',
                content: collectedText,
                providerKey: 'SENSEI',
                model: (data.model as string) || 'gemini-2.5-flash',
                promptTokens: (data.usage as any)?.input_tokens ?? null,
                completionTokens: (data.usage as any)?.output_tokens ?? null,
                totalTokens: null,
                latencyMs: null,
                createdAt: new Date().toISOString(),
              },
              session: {
                id: senseiSessionId || `sensei-session-${Date.now()}`,
                title: options.message.slice(0, 60),
                lastMessageAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                providerKey: 'SENSEI',
                model: (data.model as string) || 'claude-sonnet-4-6',
              },
              usage: {
                promptTokens: (data.usage as any)?.input_tokens ?? null,
                completionTokens: (data.usage as any)?.output_tokens ?? null,
                totalTokens: null,
              },
            });
            break;

          case 'error':
            onChunk({
              type: 'error',
              error: (data.message as string) || 'SenseiClaw error',
            });
            break;

          default:
            if (data.text) {
              if (!gotFirstToken) {
                gotFirstToken = true;
                clearTimeout(firstTokenTimeout);
              }
              collectedText += data.text as string;
              onChunk({ type: 'chunk', content: data.text as string });
            }
            break;
        }
      }
    };

    xhr.onload = () => {
      clearTimeout(firstTokenTimeout);
      if (!gotDone && collectedText) {
        onChunk({ type: 'error', error: 'Connection closed unexpectedly. Your message may not have been processed.' });
      } else if (!gotDone && !collectedText) {
        onChunk({ type: 'error', error: 'No response received. Please try again.' });
      }
      resolve();
    };
    xhr.onerror = () => {
      clearTimeout(firstTokenTimeout);
      onChunk({ type: 'error', error: 'Network error — check your connection and try again.' });
      reject(new Error('XHR network error'));
    };
    xhr.ontimeout = () => {
      clearTimeout(firstTokenTimeout);
      onChunk({ type: 'error', error: 'Request timed out. Please try again.' });
      reject(new Error('XHR timeout'));
    };
    xhr.onabort = () => {
      clearTimeout(firstTokenTimeout);
      resolve();
    };

    xhr.timeout = 120000;
    xhr.send(JSON.stringify({
      message: options.message,
      session_id: options.sessionId,
      context_type: options.contextType || 'free_chat',
      context_data: { ...options.contextData, language: options.language },
    }));
  });
}

/**
 * Send a non-streaming message to SenseiClaw.
 */
export async function sendSenseiMessage(
  message: string,
  contextType = 'free_chat',
): Promise<{ text: string; sessionId: string }> {
  const response = await fetch(`${SENSEI_BASE_URL}/tutor/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: message }),
  });

  if (!response.ok) {
    throw new Error(`SenseiClaw query failed (${response.status})`);
  }

  const data = await response.json();
  return { text: data.content || '', sessionId: '' };
}

/**
 * Get suggested starter prompts from SenseiClaw.
 */
export async function getSenseiSuggestions(
  contextType = 'free_chat',
  subject?: string,
): Promise<string[]> {
  const params = new URLSearchParams({ context_type: contextType });
  if (subject) params.set('subject', subject);

  try {
    const response = await fetch(
      `${SENSEI_BASE_URL}/tutor/suggestions?${params.toString()}`,
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}

/**
 * Get a Socratic hint for a specific question.
 */
export async function getSenseiHint(
  questionId: string,
  studentAnswer?: string,
): Promise<SenseiHintResponse> {
  const response = await fetch(`${SENSEI_BASE_URL}/tutor/hint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: questionId,
      student_answer: studentAnswer,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hint request failed (${response.status})`);
  }

  return response.json();
}
