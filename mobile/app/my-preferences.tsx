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
import {
  Check,
  ChevronRight,
  Cloud,
  Cpu,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { Placeholder } from '@/components/placeholder';
import { ModelSelectorModal } from '@/components/model-selector-modal';
import { adminApi, getApiErrorMessage, questionBankApi } from '@/api';
import type { ModelCatalog, SetModelResult } from '@/api/admin';
import { LANGUAGE_OPTIONS } from '@/constants/languages';
import { useAuth } from '@/contexts/auth-context';
import { usePreferences } from '@/contexts/preferences-context';
import { showAppToast } from '@/feedback/toast';
import { useI18n } from '@/i18n/i18n-context';
import type { Language } from '@/i18n/translations';
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

/**
 * Full-width row for the language list and the model picker trigger. It lives in
 * the same Section card as the chips and reuses the chip's selected/idle colours
 * so it reads as part of the existing screen.
 */
function SettingRow({
  selected = false,
  disabled = false,
  theme,
  onPress,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  theme: SemanticTokens;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      className="w-full rounded-2xl border px-4 py-3"
      style={{
        opacity: disabled ? 0.6 : 1,
        borderColor: selected ? theme.accent : theme.borderStrong,
        backgroundColor: selected ? theme.accentSoft : theme.surface,
      }}
    >
      <View className="flex-row items-center gap-3">{children}</View>
    </TouchableOpacity>
  );
}

export default function MyPreferencesScreen() {
  const { t, language, setLanguage } = useI18n();
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
  const [modelCatalog, setModelCatalog] = useState<ModelCatalog | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState('');
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [modelWarning, setModelWarning] = useState<string | null>(null);

  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  /**
   * The model catalogue is optional: it lives on SenseiClaw, not the REST
   * backend. A failure must land on a disabled section with a retry, never on a
   * spinner that never resolves (the bug this screen already had once).
   */
  const loadModelCatalog = useCallback(async () => {
    setModelLoading(true);
    setModelError('');
    try {
      const catalog = await adminApi.getModelCatalog();
      setModelCatalog(catalog);
    } catch (err) {
      setModelCatalog(null);
      setModelError(getApiErrorMessage(err));
    } finally {
      setModelLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModelCatalog();
  }, [loadModelCatalog]);

  const handleLanguageSelect = useCallback(
    (code: Language) => {
      if (code === language) return;
      // Persisted by the i18n provider; curriculum/question fetches key off
      // `language`, so the content re-fetches itself in the new language.
      setLanguage(code);
      showAppToast({
        type: 'success',
        title: t('languageSettings.changedTitle'),
        message: t('languageSettings.changedMessage'),
      });
    },
    [language, setLanguage, t],
  );

  const handleModelSwitched = useCallback(
    (result: SetModelResult) => {
      setModelWarning(result.warning);
      setModelCatalog((prev) =>
        prev
          ? {
              ...prev,
              current: { mode: result.mode, model: result.model },
              // A local switch leaves the new model resident in memory.
              residentLocalModel:
                result.mode === 'local' ? result.model : prev.residentLocalModel,
            }
          : prev,
      );
      setModelModalVisible(false);
      showAppToast({
        type: result.warning ? 'info' : 'success',
        title: t('modelSelector.switchedTitle'),
        message: result.warning ?? t('modelSelector.switchedMessage', { model: result.model }),
      });
    },
    [t],
  );

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

  const currentModelLabel = useMemo(() => {
    if (!modelCatalog) return '';
    const { mode, model } = modelCatalog.current;
    const list = mode === 'local' ? modelCatalog.local : modelCatalog.cloud;
    return list.find((entry) => entry.id === model)?.label || model;
  }, [modelCatalog]);

  const currentModelSubtitle = useMemo(() => {
    if (!modelCatalog) return '';
    const { mode, model } = modelCatalog.current;
    const parts = [
      mode === 'local' ? t('modelSelector.modeLocal') : t('modelSelector.modeCloud'),
    ];
    if (mode === 'local') {
      const entry = modelCatalog.local.find((item) => item.id === model);
      if (entry) {
        parts.push(entry.vision ? t('modelSelector.vision') : t('modelSelector.textOnly'));
      }
      if (modelCatalog.residentLocalModel === model) {
        parts.push(t('modelSelector.loadedNoWait'));
      }
    }
    return parts.join(' · ');
  }, [modelCatalog, t]);

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
              void loadModelCatalog();
            }}
            tintColor={theme.accentStrong}
          />
        }
      >
        <Section title={t('languageSettings.title')} theme={theme}>
          <Text
            className="mb-1 w-full text-[11px] font-space"
            style={{ color: theme.textMuted }}
          >
            {t('languageSettings.description')}
          </Text>
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = language === option.code;
            return (
              <SettingRow
                key={option.code}
                selected={isActive}
                theme={theme}
                onPress={() => handleLanguageSelect(option.code)}
              >
                <Text style={{ fontSize: 22 }}>{option.flag}</Text>
                <View className="flex-1">
                  <Text
                    className="text-sm font-space-semibold"
                    style={{ color: isActive ? theme.accent : theme.text }}
                  >
                    {option.nativeName}
                  </Text>
                  {option.nativeName !== option.englishName ? (
                    <Text
                      className="mt-0.5 text-[11px] font-space"
                      style={{ color: theme.textMuted }}
                    >
                      {option.englishName}
                    </Text>
                  ) : null}
                </View>
                {isActive ? <Check size={18} color={theme.accent} /> : null}
              </SettingRow>
            );
          })}
        </Section>

        <Section title={t('modelSelector.title')} theme={theme}>
          {modelLoading ? (
            <View className="w-full flex-row items-center gap-2 py-2">
              <ActivityIndicator size="small" color={theme.accentStrong} />
              <Text className="text-xs font-space" style={{ color: theme.textMuted }}>
                {t('modelSelector.loading')}
              </Text>
            </View>
          ) : !modelCatalog ? (
            <View className="w-full gap-2">
              <View className="flex-row items-center gap-2">
                <TriangleAlert size={16} color={theme.warningText} />
                <Text
                  className="flex-1 text-sm font-space-semibold"
                  style={{ color: theme.textSoft }}
                >
                  {t('modelSelector.unavailable')}
                </Text>
              </View>
              <Text className="text-[11px] font-space" style={{ color: theme.textMuted }}>
                {modelError || t('modelSelector.unavailableHint')}
              </Text>
              <View className="flex-row">
                <SelectableChip
                  label={t('common.retry')}
                  selected={false}
                  theme={theme}
                  onPress={() => {
                    void loadModelCatalog();
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              <SettingRow theme={theme} onPress={() => setModelModalVisible(true)}>
                {modelCatalog.current.mode === 'local' ? (
                  <Cpu size={18} color={theme.accent} />
                ) : (
                  <Cloud size={18} color={theme.accent} />
                )}
                <View className="flex-1">
                  <Text className="text-sm font-space-semibold" style={{ color: theme.text }}>
                    {currentModelLabel}
                  </Text>
                  <Text
                    className="mt-0.5 text-[11px] font-space"
                    style={{ color: theme.textMuted }}
                  >
                    {currentModelSubtitle}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </SettingRow>
              {modelWarning ? (
                <View
                  className="w-full flex-row items-start gap-2 rounded-2xl p-3"
                  style={{ backgroundColor: theme.warningBg }}
                >
                  <TriangleAlert size={16} color={theme.warningText} />
                  <Text
                    className="flex-1 text-[11px] font-space"
                    style={{ color: theme.warningText }}
                  >
                    {modelWarning}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </Section>

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

      <ModelSelectorModal
        visible={modelModalVisible}
        catalog={modelCatalog}
        onClose={() => setModelModalVisible(false)}
        onSwitched={handleModelSwitched}
      />
    </SafeAreaView>
  );
}
