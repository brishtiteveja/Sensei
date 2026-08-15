import { Redirect } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/i18n/i18n-context';

const LANGUAGE_CHOSEN_KEY = 'language_chosen';

export default function Index() {
  const { state, isAuthenticated } = useAuth();
  const [languageChosen, setLanguageChosen] = useState<boolean | null>(null);

  const { setLanguage } = useI18n();

  useEffect(() => {
    AsyncStorage.multiGet([LANGUAGE_CHOSEN_KEY, 'app_language']).then((vals) => {
      const chosen = vals[0][1];
      const lang = vals[1][1];
      if (lang) setLanguage(lang as any);
      setLanguageChosen(!!chosen);
    });
  }, []);

  if (state.isLoading || languageChosen === null) return null;

  if (!languageChosen) return <Redirect href="/choose-language" />;
  if (!state.hasCompletedOnboarding) return <Redirect href="/welcome-onboarding" />;
  return <Redirect href="/(tabs)" />;
}
