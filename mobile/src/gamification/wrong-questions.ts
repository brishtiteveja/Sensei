import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PracticeQuestion } from '@/api/curriculum';

const KEY = 'dikkha_wrong_questions';
const MAX_STORED = 100;

export interface WrongQuestion {
  question: PracticeQuestion;
  missedAt: string; // ISO timestamp
}

export async function loadWrongQuestions(): Promise<WrongQuestion[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/** Record a question the user got wrong. De-dupes by question id and keeps
 *  the most recent MAX_STORED. */
export async function recordWrongQuestion(question: PracticeQuestion): Promise<void> {
  const list = await loadWrongQuestions();
  const filtered = list.filter((w) => w.question.id !== question.id);
  filtered.unshift({ question, missedAt: new Date().toISOString() });
  const trimmed = filtered.slice(0, MAX_STORED);
  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
}

/** Remove a question from the wrong list once the user answers it correctly. */
export async function clearWrongQuestion(questionId: string): Promise<void> {
  const list = await loadWrongQuestions();
  const filtered = list.filter((w) => w.question.id !== questionId);
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
}

export async function getWrongQuestionCount(): Promise<number> {
  return (await loadWrongQuestions()).length;
}
