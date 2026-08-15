import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, User, RotateCcw, ChevronRight } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/i18n/i18n-context';
import { useProgress } from '@/gamification/progress-context';
import { loadMastery, type MasteryData } from '@/gamification/subject-mastery';
import { useState, useEffect } from 'react';

const SUBJECT_KEYS = [
  { emoji: '⚛️', nameKey: 'progress.subjectPhysics', id: 'পদার্থবিজ্ঞান' },
  { emoji: '🧪', nameKey: 'progress.subjectChemistry', id: 'রসায়ন' },
  { emoji: '📐', nameKey: 'progress.subjectHigherMath', id: 'গণিত' },
  { emoji: '🧬', nameKey: 'progress.subjectBiology', id: 'জীববিজ্ঞান' },
  { emoji: '🔢', nameKey: 'progress.subjectGeneralMath', id: 'সাধারণ জ্ঞান' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Palash Roy', points: '99', color: '#F59E0B', initial: 'P' },
  { rank: 2, name: 'mehedi hasan', points: '98', color: '#8B5CF6', initial: 'M' },
  { rank: 3, name: 'আমির', points: '97.5', color: '#10B981', initial: 'আ' },
];

function Card({ children, style, theme }: { children: React.ReactNode; style?: object; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View className="mx-4 rounded-2xl p-4" style={[{ backgroundColor: theme.surface }, style]}>
      {children}
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { state: authState } = useAuth();

  const { streak, totalXp, streakDays, today: todayEntry, data: progressData } = useProgress();
  const [mastery, setMastery] = useState<MasteryData>({});

  useEffect(() => { loadMastery().then(setMastery); }, []);

  const userName = authState.user?.name || t('progress.studentFallback');
  const initial = userName.slice(0, 1).toUpperCase();

  const dayLabels = [t('progress.daySun'), t('progress.dayMon'), t('progress.dayTue'), t('progress.dayWed'), t('progress.dayThu'), t('progress.dayFri'), t('progress.daySat')];
  const last7 = streakDays.map((sd, i) => {
    const d = new Date(sd.date);
    return { day: d.getDay(), date: d.getDate(), isToday: i === streakDays.length - 1, active: sd.active };
  });

  const handleRestartOnboarding = async () => {
    await AsyncStorage.multiRemove(['has_completed_onboarding', 'language_chosen', 'app_language', 'app_region']);
    router.replace('/welcome-onboarding' as any);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* 1. Profile Header */}
        <View className="px-5 pt-5 pb-14 rounded-b-3xl" style={{ backgroundColor: theme.heroBg }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-14 h-14 rounded-full items-center justify-center bg-white/20">
                <Text className="text-white text-lg font-space-bold">{initial}</Text>
              </View>
              <View>
                <Text className="text-white text-base font-space-bold">{userName}</Text>
                <View className="flex-row items-center mt-1 rounded-full px-2.5 py-0.5 bg-white/15">
                  <Text className="text-white/90 text-[11px] font-space-semibold">BUET 🎯</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/my-preferences' as any)} className="mt-1">
              <Settings size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Stats Row */}
        <View className="mx-4 -mt-8 rounded-2xl p-4 flex-row items-center justify-around shadow-lg shadow-black/15" style={{ backgroundColor: theme.surface }}>
          {[
            { emoji: '🔥', value: String(streak), label: 'streak' },
            { emoji: '⭐', value: String(totalXp), label: 'XP' },
            { emoji: '📚', value: String(todayEntry?.lessonsCompleted ?? 0), label: 'lessons' },
            { emoji: '🎯', value: todayEntry && todayEntry.questionsAnswered > 0 ? `${Math.round((todayEntry.correctAnswers / todayEntry.questionsAnswered) * 100)}%` : '—', label: 'accuracy' },
          ].map((s, i) => (
            <View key={i} className="items-center gap-1">
              <Text className="text-lg">{s.emoji}</Text>
              <Text className="text-sm font-space-bold" style={{ color: theme.text }}>{s.value}</Text>
              <Text className="text-[10px] font-space" style={{ color: theme.textMuted }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 3. Streak Calendar */}
        <View className="mt-4">
          <Card theme={theme}>
            <Text className="text-sm font-space-bold mb-3" style={{ color: theme.text }}>{t('progress.streakCalendar')}</Text>
            <View className="flex-row justify-between mb-3">
              {last7.map((d, i) => (
                <View key={i} className="items-center gap-1.5">
                  <Text className="text-[10px] font-space" style={{ color: theme.textMuted }}>
                    {dayLabels[d.day]}
                  </Text>
                  <View
                    className="w-8 h-8 rounded-lg items-center justify-center"
                    style={[
                      d.active
                        ? { backgroundColor: theme.accent }
                        : { borderWidth: 1.5, borderColor: theme.border },
                      d.isToday && !d.active
                        ? { borderColor: theme.accent, borderWidth: 2 }
                        : {},
                    ]}
                  >
                    <Text
                      className="text-[11px] font-space-semibold"
                      style={{ color: d.active ? theme.textInverse : theme.textMuted }}
                    >
                      {d.date}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text className="text-xs font-space text-center" style={{ color: theme.textSoft }}>
              {t('progress.dayStreak', { count: String(streak) })}
            </Text>
          </Card>
        </View>

        {/* 4. Subject Mastery */}
        <View className="mt-4">
          <Card theme={theme}>
            <Text className="text-sm font-space-bold mb-3" style={{ color: theme.text }}>{t('progress.subjectMastery')}</Text>
            {SUBJECT_KEYS.map((subj, i) => {
              const stats = mastery[subj.id];
              const pct = stats?.accuracy ?? 0;
              return (
              <View key={i} className="flex-row items-center gap-2.5 mb-3">
                <Text className="text-base w-7 text-center">{subj.emoji}</Text>
                <Text className="text-xs font-space-semibold w-24" style={{ color: theme.text }} numberOfLines={1}>
                  {t(subj.nameKey)}
                </Text>
                <View className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.surfaceAlt }}>
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: theme.accent }}
                  />
                </View>
                <Text className="text-[11px] font-space-semibold w-8 text-right" style={{ color: theme.textMuted }}>
                  {pct}%
                </Text>
              </View>
            );
            })}
          </Card>
        </View>

        {/* 5. Leaderboard Preview */}
        <View className="mt-4">
          <Card theme={theme}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-space-bold" style={{ color: theme.text }}>{t('progress.leaderboard')}</Text>
              <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: theme.warningBg }}>
                <Text className="text-[10px] font-space-semibold" style={{ color: theme.warningText }}>{t('progress.ironLeague')}</Text>
              </View>
            </View>
            {LEADERBOARD.map((entry) => (
              <View key={entry.rank} className="flex-row items-center py-2.5 gap-3">
                <Text className="text-xs font-space-bold w-5 text-center" style={{ color: theme.textMuted }}>
                  {entry.rank}
                </Text>
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: entry.color + '22' }}
                >
                  <Text className="text-xs font-space-bold" style={{ color: entry.color }}>{entry.initial}</Text>
                </View>
                <Text className="flex-1 text-xs font-space-semibold" style={{ color: theme.text }}>{entry.name}</Text>
                <Text className="text-[11px] font-space" style={{ color: theme.textSoft }}>{entry.points} {t('progress.points')}</Text>
              </View>
            ))}
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-center mt-2 pt-2"
              style={{ borderTopWidth: 1, borderTopColor: theme.border }}
              /* STUB: leaderboard screen removed (no leaderboard backend) — no-op. */
              onPress={() => {}}
            >
              <Text className="text-xs font-space-semibold mr-1" style={{ color: theme.accent }}>{t('progress.seeAll')}</Text>
              <ChevronRight size={14} color={theme.accent} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* 6. Quick Links */}
        <View className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.surface }}>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5 gap-3"
            activeOpacity={0.7}
            /* STUB: /profile was removed (no auth backend) — opens preferences instead. */
            onPress={() => router.push('/my-preferences' as any)}
          >
            <User size={18} color={theme.accent} />
            <Text className="flex-1 text-xs font-space-semibold" style={{ color: theme.text }}>{t('progress.profileSettings')}</Text>
            <ChevronRight size={16} color={theme.borderStrong} />
          </TouchableOpacity>
          <View className="h-px ml-12" style={{ backgroundColor: theme.border }} />
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5 gap-3"
            activeOpacity={0.7}
            onPress={handleRestartOnboarding}
          >
            <RotateCcw size={18} color={theme.accent} />
            <Text className="flex-1 text-xs font-space-semibold" style={{ color: theme.text }}>{t('progress.restartOnboarding')}</Text>
            <ChevronRight size={16} color={theme.borderStrong} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
