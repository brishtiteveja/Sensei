import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dikkha_lesson_sessions';

type LessonSessionMap = Record<string, string>;

export async function getSessionForLesson(lessonId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const map: LessonSessionMap = JSON.parse(raw);
    return map[lessonId] || null;
  } catch {
    return null;
  }
}

export async function saveSessionForLesson(lessonId: string, sessionId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map: LessonSessionMap = raw ? JSON.parse(raw) : {};
    map[lessonId] = sessionId;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export async function getAllLessonSessions(): Promise<LessonSessionMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
