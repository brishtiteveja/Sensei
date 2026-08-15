import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Placeholder } from '@/components/placeholder';
import { getApiErrorMessage, questionBankApi } from '@/api';
import { useAuth } from '@/contexts/auth-context';
import { usePreferences } from '@/contexts/preferences-context';
import { showAppToast } from '@/feedback/toast';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme } from '@/theme';
import type { SemanticTokens } from '@/theme/tokens';
import type {
  LearningGoalPreference,
  LearningLevelPreference,
  OnboardingSubjectPreference,
  ReminderMomentPreference,
  UpdatePreferencesPayload,
} from '@/types/preferences';

type UniversityOption = {
  id: string;
  name: string;
  shortName: string;
  subjects: Array<{ id: string; name: string }>;
};

type PreferencesFormState = {
  learningGoal: LearningGoalPreference | null;
  learningLevel: LearningLevelPreference | null;
  onboardingSubjectKeys: OnboardingSubjectPreference[];
  dailyStudyGoalMinutes: number | null;
  reminderMoment: ReminderMomentPreference | null;
  preferredUniversityIds: string[];
  preferredSubjectIds: string[];
};

function SelectableChip({
  label,
  selected,
  theme,
  onPress,
}: {
  label: string;
  selected: boolean;
  theme: SemanticTokens;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: selected ? theme.accent : theme.borderStrong,
        backgroundColor: selected ? theme.accentSoft : theme.surface,
      }}
    >
      <Text
        className="text-sm font-space-semibold"
        style={{ color: selected ? theme.accent : theme.textDisabled }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: SemanticTokens;
}) {
  return (
    <View
      className="rounded-[24px] p-4"
      style={{ backgroundColor: theme.surface }}
    >
      <Text
        className="mb-3 text-xs font-space-semibold uppercase"
        style={{ color: theme.textMuted }}
      >
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export default function MyPreferencesScreen() {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { isAuthenticated } = useAuth();
  const {
    preferences,
    isReady,
    isSyncing,
    updatePreferences,
    refreshFromBackend,
  } = usePreferences();
  const [form, setForm] = useState<PreferencesFormState | null>(null);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const loadData = useCallback(
    async (asRefresh = false) => {
      if (!isReady) {
        return;
      }

      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        // Both remote calls are OPTIONAL and must not gate the screen. They were
        // previously awaited together in a Promise.all whose rejection skipped
        // setForm() entirely -- and because the render guard is `loading || !form`,
        // the screen then sat on the loading placeholder forever with no way out.
        // Sensei has no REST backend behind these, so that was the normal path, not
        // an edge case: the settings screen simply never opened.
        const [uniResult, remoteResult] = await Promise.allSettled([
          questionBankApi.getUniversities(),
          isAuthenticated ? refreshFromBackend() : Promise.resolve(null),
        ]);

        if (uniResult.status === 'fulfilled') {
          setUniversities(
            uniResult.value.map((item) => ({
              id: item.id,
              name: item.name,
              shortName: item.shortName,
              subjects: item.subjects.map((subject) => ({
                id: subject.id,
                name: subject.name,
              })),
            })),
          );
        } else {
          // No university list available; the rest of the screen still works.
          setUniversities([]);
        }

        if (remoteResult.status === 'rejected') {
          setError(getApiErrorMessage(remoteResult.reason));
        }

        // Always seed the form, falling back to locally-stored preferences, so the
        // screen renders whether or not anything remote answered.
        const src =
          (remoteResult.status === 'fulfilled' ? remoteResult.value : null) ??
          preferencesRef.current;
        setForm({
          learningGoal: src.learningGoal,
          learningLevel: src.learningLevel,
          onboardingSubjectKeys: src.onboardingSubjectKeys,
          dailyStudyGoalMinutes: src.dailyStudyGoalMinutes,
          reminderMoment: src.reminderMoment,
          preferredUniversityIds: src.preferredUniversityIds,
          preferredSubjectIds: src.preferredSubjectIds,
        });
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, isReady, refreshFromBackend],
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }
    void loadData(false);
  }, [isReady, loadData]);

  const academicSubjects = useMemo(() => {
    const seen = new Set<string>();
    return universities.flatMap((uni) =>
      uni.subjects.filter((subject) => {
        if (seen.has(subject.id)) {
          return false;
        }
        seen.add(subject.id);
        return true;
      }),
    );
  }, [universities]);

  const initialSnapshot = useMemo(
    () => JSON.stringify({
      learningGoal: preferences.learningGoal,
      learningLevel: preferences.learningLevel,
      onboardingSubjectKeys: preferences.onboardingSubjectKeys,
      dailyStudyGoalMinutes: preferences.dailyStudyGoalMinutes,
      reminderMoment: preferences.reminderMoment,
      preferredUniversityIds: preferences.preferredUniversityIds,
      preferredSubjectIds: preferences.preferredSubjectIds,
    }),
    [preferences],
  );
  const currentSnapshot = form ? JSON.stringify(form) : '';
  const hasChanges = Boolean(form) && currentSnapshot !== initialSnapshot;

  const updateField = useCallback(
    <K extends keyof PreferencesFormState>(
      key: K,
      value: PreferencesFormState[K],
    ) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const toggleMultiValue = useCallback(
    (
      key: 'onboardingSubjectKeys' | 'preferredUniversityIds' | 'preferredSubjectIds',
      value: string,
    ) => {
      setForm((prev) => {
        if (!prev) return prev;
        const list = prev[key] as string[];
        return {
          ...prev,
          [key]: list.includes(value)
            ? list.filter((item) => item !== value)
            : [...list, value],
        };
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form || saving) {
      return;
    }

    setSaving(true);
    const payload: UpdatePreferencesPayload = { ...form };
    const result = await updatePreferences(payload);
    setSaving(false);

    if (result.errorMessage) {
      showAppToast({
        type: 'error',
        title: t('preferences.savedLocallyTitle'),
        message: result.errorMessage,
      });
      return;
    }

    showAppToast({
      type: 'success',
      title: t('preferences.savedTitle'),
      message: isAuthenticated
        ? t('preferences.savedMessage')
        : t('preferences.savedGuestMessage'),
    });
  }, [form, isAuthenticated, saving, t, updatePreferences]);

  const goalOptions: Array<{ value: LearningGoalPreference; label: string }> = [
    { value: 'learn', label: t('onboarding.goalLearn') },
    { value: 'exam', label: t('onboarding.goalExam') },
    { value: 'practice', label: t('onboarding.goalPractice') },
    { value: 'fun', label: t('onboarding.goalFun') },
  ];
  const levelOptions: Array<{ value: LearningLevelPreference; label: string }> = [
    { value: 'beginner', label: t('onboarding.levelBeginner') },
    { value: 'intermediate', label: t('onboarding.levelIntermediate') },
    { value: 'advanced', label: t('onboarding.levelAdvanced') },
  ];
  const onboardingSubjectOptions: Array<{
    value: OnboardingSubjectPreference;
    label: string;
  }> = [
    { value: 'math', label: t('onboarding.subjectMath') },
    { value: 'physics', label: t('onboarding.subjectPhysics') },
    { value: 'chemistry', label: t('onboarding.subjectChemistry') },
    { value: 'biology', label: t('onboarding.subjectBiology') },
    { value: 'english', label: t('onboarding.subjectEnglish') },
    { value: 'bangla', label: t('onboarding.subjectBangla') },
    { value: 'ict', label: t('onboarding.subjectIct') },
    { value: 'gk', label: t('onboarding.subjectGk') },
  ];
  const studyGoalOptions = [
    { value: 5, label: t('onboarding.goalTime5') },
    { value: 10, label: t('onboarding.goalTime10') },
    { value: 20, label: t('onboarding.goalTime20') },
    { value: 30, label: t('onboarding.goalTime30') },
  ];
  const reminderOptions: Array<{
    value: ReminderMomentPreference;
    label: string;
  }> = [
    { value: 'morning', label: t('onboarding.reminderMorning') },
    { value: 'afternoon', label: t('onboarding.reminderAfternoon') },
    { value: 'evening', label: t('onboarding.reminderEvening') },
    { value: 'none', label: t('onboarding.reminderNone') },
  ];

  if (loading || !form) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-app-bg-dark' : 'bg-app-bg'}`} edges={['top']}>
        <AppHeader title={t('preferences.title')} />
        <Placeholder
          icon={SlidersHorizontal}
          title={t('preferences.loadingTitle')}
          loading
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-app-bg-dark' : 'bg-app-bg'}`} edges={['top']}>
        <AppHeader title={t('preferences.title')} />
        <Placeholder
          icon={SlidersHorizontal}
          title={t('preferences.errorTitle')}
          description={error}
          buttonText={t('common.retry')}
          onPress={() => {
            void loadData(false);
          }}
          variant="error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-app-bg-dark' : 'bg-app-bg'}`} edges={['top']}>
      <AppHeader title={t('preferences.title')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadData(true);
            }}
            tintColor={theme.accentStrong}
          />
        }
      >
        <Section title={t('preferences.learningGoal')} theme={theme}>
          {goalOptions.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.learningGoal === option.value}
              theme={theme}
              onPress={() =>
                updateField(
                  'learningGoal',
                  form.learningGoal === option.value ? null : option.value,
                )
              }
            />
          ))}
        </Section>

        <Section title={t('preferences.level')} theme={theme}>
          {levelOptions.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.learningLevel === option.value}
              theme={theme}
              onPress={() =>
                updateField(
                  'learningLevel',
                  form.learningLevel === option.value ? null : option.value,
                )
              }
            />
          ))}
        </Section>

        <Section title={t('preferences.interestedSubjects')} theme={theme}>
          {onboardingSubjectOptions.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.onboardingSubjectKeys.includes(option.value)}
              theme={theme}
              onPress={() => toggleMultiValue('onboardingSubjectKeys', option.value)}
            />
          ))}
        </Section>

        <Section title={t('preferences.dailyGoal')} theme={theme}>
          {studyGoalOptions.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.dailyStudyGoalMinutes === option.value}
              theme={theme}
              onPress={() =>
                updateField(
                  'dailyStudyGoalMinutes',
                  form.dailyStudyGoalMinutes === option.value ? null : option.value,
                )
              }
            />
          ))}
        </Section>

        <Section title={t('preferences.reminder')} theme={theme}>
          {reminderOptions.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={form.reminderMoment === option.value}
              theme={theme}
              onPress={() =>
                updateField(
                  'reminderMoment',
                  form.reminderMoment === option.value ? null : option.value,
                )
              }
            />
          ))}
        </Section>

        <Section title={t('preferences.preferredUniversities')} theme={theme}>
          {universities.map((uni) => (
            <SelectableChip
              key={uni.id}
              label={uni.shortName}
              selected={form.preferredUniversityIds.includes(uni.id)}
              theme={theme}
              onPress={() => toggleMultiValue('preferredUniversityIds', uni.id)}
            />
          ))}
        </Section>

        <Section title={t('preferences.questionBankSubjects')} theme={theme}>
          {academicSubjects.map((subject) => (
            <SelectableChip
              key={subject.id}
              label={subject.name}
              selected={form.preferredSubjectIds.includes(subject.id)}
              theme={theme}
              onPress={() => toggleMultiValue('preferredSubjectIds', subject.id)}
            />
          ))}
        </Section>

        <TouchableOpacity
          onPress={() => {
            void handleSave();
          }}
          disabled={!hasChanges || saving}
          activeOpacity={0.85}
          className="mt-1 rounded-2xl"
          style={{
            opacity: !hasChanges || saving ? 0.7 : 1,
            backgroundColor: theme.accentStrong,
          }}
        >
          <View className="h-14 flex-row items-center justify-center gap-2">
            {(saving || isSyncing) ? (
              <ActivityIndicator size="small" color={theme.textInverse} />
            ) : null}
            <Text className="text-sm font-space-bold text-white">
              {t('preferences.saveButton')}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
