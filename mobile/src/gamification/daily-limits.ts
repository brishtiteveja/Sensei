import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dikkha_daily_usage';

interface DailyUsage {
  date: string;
  aiMessages: number;
  quizSessions: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getUsage(): Promise<DailyUsage> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const usage = JSON.parse(raw) as DailyUsage;
      if (usage.date === todayStr()) return usage;
    }
  } catch {}
  return { date: todayStr(), aiMessages: 0, quizSessions: 0 };
}

async function saveUsage(usage: DailyUsage): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(usage));
}

export async function recordAiMessage(): Promise<{ count: number; limitReached: boolean }> {
  const usage = await getUsage();
  usage.aiMessages += 1;
  usage.date = todayStr();
  await saveUsage(usage);
  return { count: usage.aiMessages, limitReached: usage.aiMessages >= 5 };
}

export async function recordQuizSession(): Promise<{ count: number; limitReached: boolean }> {
  const usage = await getUsage();
  usage.quizSessions += 1;
  usage.date = todayStr();
  await saveUsage(usage);
  return { count: usage.quizSessions, limitReached: usage.quizSessions >= 3 };
}

export async function getDailyUsage(): Promise<DailyUsage> {
  return getUsage();
}

export async function isProUser(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('dikkha_pro_status');
    if (raw) {
      const status = JSON.parse(raw);
      return status.isPro && new Date(status.expiresAt) > new Date();
    }
  } catch {}
  return false;
}
