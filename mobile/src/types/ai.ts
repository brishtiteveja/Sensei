export interface AiProviderModelOption {
  id: string;
  label: string;
  isDefault: boolean;
}

export interface AiProviderOption {
  key: string;
  name: string;
  defaultModel: string;
  isDefault: boolean;
  isEnabled: boolean;
  models: AiProviderModelOption[];
}

export interface AiProvidersResponse {
  defaultProvider: string | null;
  providers: AiProviderOption[];
}

export type AiChatRole = 'user' | 'assistant' | 'system';

export interface AiChatSession {
  id: string;
  title: string | null;
  providerKey: string;
  model: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  sessionId: string;
  role: AiChatRole;
  content: string;
  providerKey: string | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AiChatMessageListResponse {
  data: AiChatMessage[];
  nextCursor: string | null;
  limit: number;
}

export interface AiChatSendMessageResponse {
  session: AiChatSession;
  userMessage: AiChatMessage;
  assistantMessage: AiChatMessage;
  provider: {
    key: string;
    model: string;
  };
}

export interface AiChatSessionListResponse {
  data: AiChatSession[];
  nextCursor: string | null;
  limit: number;
}

export interface AiStreamChunkEvent {
  type: 'chunk';
  content: string;
}

export interface AiStreamDoneEvent {
  type: 'done';
  message: AiChatMessage;
  session: AiChatSession;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
}

export interface AiStreamErrorEvent {
  type: 'error';
  error: string;
}

export interface AiStreamSuggestionsEvent {
  type: 'suggestions';
  suggestions: string[];
}

export interface AiStreamSummaryEvent {
  type: 'summary';
  summary: { title: string; concepts: string[]; formula?: string };
}

export type AiStreamEvent = AiStreamChunkEvent | AiStreamDoneEvent | AiStreamErrorEvent | AiStreamSuggestionsEvent | AiStreamSummaryEvent;
