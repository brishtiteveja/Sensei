import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  loadProgress,
  recordEvent,
  getStreakDays,
  getTodayEntry,
  type ProgressData,
  type DailyEntry,
  type XpEvent,
} from './progress-store';

interface ProgressContextValue {
  data: ProgressData;
  today: DailyEntry | null;
  streak: number;
  totalXp: number;
  streakDays: { date: string; active: boolean }[];
  record: (event: XpEvent) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProgressData>({
    totalXp: 0, currentStreak: 0, longestStreak: 0, dailyHistory: [], lastActiveDate: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const d = await loadProgress();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const record = useCallback(async (event: XpEvent) => {
    const updated = await recordEvent(event);
    setData(updated);
  }, []);

  const today = getTodayEntry(data);
  const streakDays = getStreakDays(data, 7);

  return (
    <ProgressContext.Provider value={{
      data,
      today,
      streak: data.currentStreak,
      totalXp: data.totalXp,
      streakDays,
      record,
      refresh,
      loading,
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
