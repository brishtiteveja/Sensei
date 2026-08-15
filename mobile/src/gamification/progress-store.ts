import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'dikkha_progress';

export interface DailyEntry {
  date: string;
  xp: number;
  questionsAnswered: number;
  correctAnswers: number;
  lessonsCompleted: number;
  aiInteractions: number;
}

export interface ProgressData {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  dailyHistory: DailyEntry[];
  lastActiveDate: string | null;
}

const EMPTY: ProgressData = {
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  dailyHistory: [],
  lastActiveDate: null,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function loadProgress(): Promise<ProgressData> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return { ...EMPTY };
    return JSON.parse(raw) as ProgressData;
  } catch {
    return { ...EMPTY };
  }
}

async function save(data: ProgressData): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function ensureToday(data: ProgressData): DailyEntry {
  const today = todayStr();
  let entry = data.dailyHistory.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, xp: 0, questionsAnswered: 0, correctAnswers: 0, lessonsCompleted: 0, aiInteractions: 0 };
    data.dailyHistory.push(entry);
    if (data.dailyHistory.length > 90) {
      data.dailyHistory = data.dailyHistory.slice(-90);
    }
  }
  return entry;
}

function updateStreak(data: ProgressData): void {
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (data.lastActiveDate === today) return;

  if (data.lastActiveDate === yesterday) {
    data.currentStreak += 1;
  } else if (data.lastActiveDate !== today) {
    data.currentStreak = 1;
  }

  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }
  data.lastActiveDate = today;
}

export type XpEvent = 'lesson_complete' | 'correct_answer' | 'wrong_answer' | 'ai_interaction' | 'quiz_complete';

const XP_VALUES: Record<XpEvent, number> = {
  lesson_complete: 10,
  correct_answer: 2,
  wrong_answer: 0,
  ai_interaction: 1,
  quiz_complete: 5,
};

export async function recordEvent(event: XpEvent): Promise<ProgressData> {
  const data = await loadProgress();
  const entry = ensureToday(data);
  const xp = XP_VALUES[event];

  entry.xp += xp;
  data.totalXp += xp;

  switch (event) {
    case 'correct_answer':
      entry.questionsAnswered += 1;
      entry.correctAnswers += 1;
      break;
    case 'wrong_answer':
      entry.questionsAnswered += 1;
      break;
    case 'lesson_complete':
      entry.lessonsCompleted += 1;
      break;
    case 'ai_interaction':
      entry.aiInteractions += 1;
      break;
  }

  updateStreak(data);
  await save(data);
  return data;
}

export function getStreakDays(data: ProgressData, days: number = 7): { date: string; active: boolean }[] {
  const result: { date: string; active: boolean }[] = [];
  const activeDates = new Set(data.dailyHistory.filter(e => e.xp > 0).map(e => e.date));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    result.push({ date: ds, active: activeDates.has(ds) });
  }
  return result;
}

export function getTodayEntry(data: ProgressData): DailyEntry | null {
  return data.dailyHistory.find(e => e.date === todayStr()) ?? null;
}
