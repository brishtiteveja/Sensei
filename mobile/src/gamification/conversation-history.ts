import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'dikkha_conversation_history';
const MAX_CONVERSATIONS = 100;

export interface ConversationEntry {
  sessionId: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lessonId?: string;
}

export async function loadHistory(): Promise<ConversationEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ConversationEntry[];
  } catch {
    return [];
  }
}

export async function saveConversation(entry: ConversationEntry): Promise<void> {
  const history = await loadHistory();
  const idx = history.findIndex(h => h.sessionId === entry.sessionId);
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...entry, updatedAt: new Date().toISOString() };
  } else {
    history.unshift(entry);
  }
  const trimmed = history.slice(0, MAX_CONVERSATIONS);
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
}

export async function deleteConversation(sessionId: string): Promise<void> {
  const history = await loadHistory();
  const filtered = history.filter(h => h.sessionId !== sessionId);
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
}
