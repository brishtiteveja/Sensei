import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { OnboardlyAnswers } from 'rn-onboardly';
import { getApiErrorMessage, userApi } from '@/api';
import { useAuth } from '@/contexts/auth-context';
import type { User } from '@/types';
import type {
  LocalPreferencesState,
  OnboardingSubjectPreference,
  ReminderMomentPreference,
  UpdatePreferencesPayload,
  UserPreferences,
} from '@/types/preferences';

const STORAGE_KEY = '@preferences/user_preferences_v1';

const EMPTY_PREFERENCES: LocalPreferencesState = {
  learningGoal: null,
  learningLevel: null,
  onboardingSubjectKeys: [],
  dailyStudyGoalMinutes: null,
  reminderMoment: null,
  admissionTrack: null,
  appLanguage: null,
  regionId: null,
  preferredUniversityIds: [],
  preferredSubjectIds: [],
  preferencesUpdatedAt: null,
  lastSyncedAt: null,
};

interface SavePreferencesResult {
  syncedToBackend: boolean;
  errorMessage: string | null;
}

interface PreferencesContextValue {
  preferences: LocalPreferencesState;
  isReady: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
  saveOnboardingAnswers: (answers: OnboardlyAnswers) => Promise<void>;
  updatePreferences: (
    payload: UpdatePreferencesPayload,
    options?: { syncToBackend?: boolean },
  ) => Promise<SavePreferencesResult>;
  refreshFromBackend: () => Promise<UserPreferences | null>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function uniqueStrings<T extends string>(values: T[] | undefined | null): T[] {
  return Array.from(new Set((values ?? []).filter(Boolean))) as T[];
}

function normalizePreferences(
  input?: Partial<LocalPreferencesState> | null,
): LocalPreferencesState {
  return {
    learningGoal: input?.learningGoal ?? null,
    learningLevel: input?.learningLevel ?? null,
    onboardingSubjectKeys: uniqueStrings(
      input?.onboardingSubjectKeys as OnboardingSubjectPreference[] | undefined,
    ),
    dailyStudyGoalMinutes: input?.dailyStudyGoalMinutes ?? null,
    reminderMoment: input?.reminderMoment ?? null,
    admissionTrack: input?.admissionTrack ?? null,
    appLanguage: input?.appLanguage ?? null,
    regionId: input?.regionId ?? null,
    preferredUniversityIds: uniqueStrings(input?.preferredUniversityIds),
    preferredSubjectIds: uniqueStrings(input?.preferredSubjectIds),
    preferencesUpdatedAt: input?.preferencesUpdatedAt ?? null,
    lastSyncedAt: input?.lastSyncedAt ?? null,
  };
}

function hasMeaningfulPreferences(preferences: LocalPreferencesState): boolean {
  return Boolean(
    preferences.learningGoal ||
      preferences.learningLevel ||
      preferences.dailyStudyGoalMinutes ||
      preferences.reminderMoment ||
      preferences.onboardingSubjectKeys.length ||
      preferences.preferredUniversityIds.length ||
      preferences.preferredSubjectIds.length,
  );
}

function mapAnswersToPreferences(
  answers: OnboardlyAnswers,
): UpdatePreferencesPayload {
  const nextReminder = answers.reminder?.[0] as
    | ReminderMomentPreference
    | undefined;
  const nextStudyGoal = answers.goal_time?.[0];
  const parsedStudyGoal =
    nextStudyGoal && ['5', '10', '20', '30'].includes(nextStudyGoal)
      ? Number(nextStudyGoal)
      : null;

  return {
    learningGoal:
      (answers.goal?.[0] as LocalPreferencesState['learningGoal']) ?? null,
    learningLevel:
      (answers.level?.[0] as LocalPreferencesState['learningLevel']) ?? null,
    onboardingSubjectKeys: uniqueStrings(
      answers.subjects as OnboardingSubjectPreference[] | undefined,
    ),
    dailyStudyGoalMinutes: parsedStudyGoal,
    reminderMoment: nextReminder ?? null,
    admissionTrack:
      (answers.admission_track?.[0] as LocalPreferencesState['admissionTrack']) ?? null,
    appLanguage: (answers.app_language?.[0] as string) ?? null,
    regionId: (answers.region?.[0] as string) ?? answers.app_region?.[0] as string ?? null,
    preferredUniversityIds: uniqueStrings(answers.target_universities as string[] | undefined),
  };
}

function mapUserToPreferences(user: User): LocalPreferencesState {
  return normalizePreferences({
    learningGoal: user.learningGoal,
    learningLevel: user.learningLevel,
    onboardingSubjectKeys: user.onboardingSubjectKeys,
    dailyStudyGoalMinutes: user.dailyStudyGoalMinutes,
    reminderMoment: user.reminderMoment,
    preferredUniversityIds: user.preferredUniversityIds,
    preferredSubjectIds: user.preferredSubjectIds,
    preferencesUpdatedAt: user.preferencesUpdatedAt,
    lastSyncedAt: user.preferencesUpdatedAt,
  });
}

function mergePreferencesIntoUser(
  user: User,
  preferences: UserPreferences,
): User {
  return {
    ...user,
    learningGoal: preferences.learningGoal,
    learningLevel: preferences.learningLevel,
    onboardingSubjectKeys: preferences.onboardingSubjectKeys,
    dailyStudyGoalMinutes: preferences.dailyStudyGoalMinutes,
    reminderMoment: preferences.reminderMoment,
    preferredUniversityIds: preferences.preferredUniversityIds,
    preferredSubjectIds: preferences.preferredSubjectIds,
    preferencesUpdatedAt: preferences.preferencesUpdatedAt,
  };
}

async function persistPreferences(preferences: LocalPreferencesState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

// STUB: Sensei ships without push notifications, so the reminder preference is
// stored with the rest of the preferences but never scheduled on the device.
async function applyReminderPreference(
  _reminderMoment: ReminderMomentPreference | null,
) {
  return;
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, isAuthenticated, setUser } = useAuth();
  const [preferences, setPreferences] =
    useState<LocalPreferencesState>(EMPTY_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const lastReconciledSignatureRef = useRef<string | null>(null);

  const setAndPersistPreferences = useCallback(
    async (next: LocalPreferencesState) => {
      const normalized = normalizePreferences(next);
      setPreferences(normalized);
      await persistPreferences(normalized);
      await applyReminderPreference(normalized.reminderMoment);
      return normalized;
    },
    [],
  );

  const syncLocalToBackend = useCallback(
    async (localState: LocalPreferencesState): Promise<SavePreferencesResult> => {
      if (!isAuthenticated || !state.user) {
        return { syncedToBackend: false, errorMessage: null };
      }

      setIsSyncing(true);
      setLastSyncError(null);

      try {
        const updatedUser = await userApi.updateMyPreferences({
          learningGoal: localState.learningGoal,
          learningLevel: localState.learningLevel,
          onboardingSubjectKeys: localState.onboardingSubjectKeys,
          dailyStudyGoalMinutes: localState.dailyStudyGoalMinutes,
          reminderMoment: localState.reminderMoment,
          preferredUniversityIds: localState.preferredUniversityIds,
          preferredSubjectIds: localState.preferredSubjectIds,
        });
        setUser(updatedUser);
        await setAndPersistPreferences(mapUserToPreferences(updatedUser));
        return { syncedToBackend: true, errorMessage: null };
      } catch (err) {
        const message = getApiErrorMessage(err);
        setLastSyncError(message);
        return { syncedToBackend: false, errorMessage: message };
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated, setAndPersistPreferences, setUser, state.user],
  );

  const updatePreferences = useCallback(
    async (
      payload: UpdatePreferencesPayload,
      options?: { syncToBackend?: boolean },
    ): Promise<SavePreferencesResult> => {
      const nextLocal = normalizePreferences({
        ...preferences,
        ...payload,
        preferencesUpdatedAt: new Date().toISOString(),
      });

      await setAndPersistPreferences(nextLocal);

      if (!isAuthenticated || options?.syncToBackend === false) {
        return { syncedToBackend: false, errorMessage: null };
      }

      return syncLocalToBackend(nextLocal);
    },
    [isAuthenticated, preferences, setAndPersistPreferences, syncLocalToBackend],
  );

  const saveOnboardingAnswers = useCallback(
    async (answers: OnboardlyAnswers) => {
      await updatePreferences(mapAnswersToPreferences(answers));
    },
    [updatePreferences],
  );

  const refreshFromBackend = useCallback(async (): Promise<UserPreferences | null> => {
    if (!isAuthenticated || !state.user) {
      return null;
    }

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const remote = await userApi.getMyPreferences();
      const mergedUser = mergePreferencesIntoUser(state.user, remote);
      setUser(mergedUser);
      await setAndPersistPreferences(
        normalizePreferences({
          ...remote,
          lastSyncedAt: remote.preferencesUpdatedAt,
        }),
      );
      return remote;
    } catch (err) {
      setLastSyncError(getApiErrorMessage(err));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, setAndPersistPreferences, setUser, state.user]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || cancelled) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<LocalPreferencesState>;
        if (!cancelled) {
          setPreferences(normalizePreferences(parsed));
        }
      } catch {
        if (!cancelled) {
          setPreferences(EMPTY_PREFERENCES);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !state.user) {
      return;
    }

    const signature = `${state.user.id}:${state.user.preferencesUpdatedAt ?? 'none'}:${preferences.preferencesUpdatedAt ?? 'none'}`;
    if (lastReconciledSignatureRef.current === signature) {
      return;
    }
    lastReconciledSignatureRef.current = signature;

    const remote = mapUserToPreferences(state.user);
    const localUpdatedAt = preferences.preferencesUpdatedAt
      ? new Date(preferences.preferencesUpdatedAt).getTime()
      : 0;
    const remoteUpdatedAt = remote.preferencesUpdatedAt
      ? new Date(remote.preferencesUpdatedAt).getTime()
      : 0;

    if (!hasMeaningfulPreferences(preferences) && remoteUpdatedAt > 0) {
      void setAndPersistPreferences(remote);
      return;
    }

    if (localUpdatedAt > remoteUpdatedAt) {
      void syncLocalToBackend(preferences);
      return;
    }

    if (remoteUpdatedAt > localUpdatedAt) {
      void setAndPersistPreferences(remote);
      return;
    }

    if (remoteUpdatedAt > 0 && preferences.lastSyncedAt !== remote.preferencesUpdatedAt) {
      void setAndPersistPreferences({
        ...preferences,
        lastSyncedAt: remote.preferencesUpdatedAt,
      });
    }
  }, [
    isAuthenticated,
    isReady,
    preferences,
    setAndPersistPreferences,
    state.user,
    syncLocalToBackend,
  ]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      isReady,
      isSyncing,
      lastSyncError,
      saveOnboardingAnswers,
      updatePreferences,
      refreshFromBackend,
    }),
    [
      preferences,
      isReady,
      isSyncing,
      lastSyncError,
      saveOnboardingAnswers,
      updatePreferences,
      refreshFromBackend,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
