import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dikkha_subject_mastery';

export interface SubjectStats {
  totalAnswered: number;
  correctAnswers: number;
  accuracy: number;
  lastPracticed: string;
}

export type MasteryData = Record<string, SubjectStats>;

export async function loadMastery(): Promise<MasteryData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function recordAnswer(subject: string, correct: boolean): Promise<MasteryData> {
  const data = await loadMastery();
  if (!data[subject]) {
    data[subject] = { totalAnswered: 0, correctAnswers: 0, accuracy: 0, lastPracticed: '' };
  }
  const s = data[subject];
  s.totalAnswered += 1;
  if (correct) s.correctAnswers += 1;
  s.accuracy = Math.round((s.correctAnswers / s.totalAnswered) * 100);
  s.lastPracticed = new Date().toISOString().slice(0, 10);
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

export function getWeakSubjects(data: MasteryData, threshold: number = 60): string[] {
  return Object.entries(data)
    .filter(([_, stats]) => stats.totalAnswered >= 5 && stats.accuracy < threshold)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .map(([subject]) => subject);
}

export function getStrongSubjects(data: MasteryData, threshold: number = 80): string[] {
  return Object.entries(data)
    .filter(([_, stats]) => stats.totalAnswered >= 5 && stats.accuracy >= threshold)
    .sort((a, b) => b[1].accuracy - a[1].accuracy)
    .map(([subject]) => subject);
}
