import type { AiCreditBalance } from './ai-credits';

export interface ConversationResponse {
  id: string;
  questionId: string;
  selectedText: string | null;
  title: string | null;
  isPublic: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface ConversationMessagePairResponse {
  conversation: ConversationResponse;
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
}

export interface ConversationWithMessages {
  id: string;
  questionId: string;
  selectedText: string | null;
  title: string | null;
  isPublic: boolean;
  completed: boolean;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionListResponse {
  data: ConversationWithMessages[];
  nextCursor: string | null;
  limit: number;
}

export interface GuestConversationMessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface GuestConversationMessagePairResponse {
  userMessage: GuestConversationMessageResponse;
  assistantMessage: GuestConversationMessageResponse;
  balance: AiCreditBalance;
}
