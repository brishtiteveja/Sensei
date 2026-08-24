import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nProvider } from '@/i18n/i18n-context';
import { useI18n } from '@/i18n/i18n-context';
import { CourseProgressProvider } from '@/course/course-progress-context';
import { ProgressProvider } from '@/gamification/progress-context';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { PreferencesProvider } from '@/contexts/preferences-context';
import { AppToastViewport } from '@/feedback/toast';
import { AppDialogViewport } from '@/feedback/dialog';
import { useAppTheme, useThemeVariables } from '@/theme';
import { Aurora } from '@/components/art/aurora';
import { FloatingSensei } from '@/components/floating-sensei';
import { hydrateLearner } from '@/lib/learner';
import { hydrateObserve } from '@/lib/observe';
import { hydrateAttempts, pruneEmpty } from '@/lib/attempts';

void SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark, isReady: isThemeReady } = useTheme();
  const theme = useAppTheme();
  const { isReady: isLanguageReady } = useI18n();
  const { state, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!state.isLoading && isThemeReady && isLanguageReady) {
      SplashScreen.hideAsync();
    }
  }, [isLanguageReady, isThemeReady, state.isLoading]);

  /*
   * Bring the recorder up before anything can record into it: the learner id
   * that tags every event, the recorder's own flag and session, and the
   * attempt history. All three keep in-memory state so the paths that write to
   * them (gestures, answers) stay synchronous. Empty attempts from a previous
   * run are dropped here rather than shown as blank rows in the history.
   */
  useEffect(() => {
    void (async () => {
      await hydrateLearner();
      await Promise.all([hydrateObserve(), hydrateAttempts()]);
      pruneEmpty();
    })();
  }, []);

  useEffect(() => {
    if (state.isLoading) return;

    const [firstSegment, secondSegment] = segments as string[];

    if (!state.hasCompletedOnboarding) {
      if (firstSegment !== 'welcome-onboarding') {
        router.replace('/welcome-onboarding');
      }
      return;
    }

    if (!isAuthenticated) {
      if (firstSegment === undefined || firstSegment === 'index') {
        router.replace('/(tabs)/ai-chat');
      }
      return;
    }

    if (firstSegment === undefined || firstSegment === 'index') {
      router.replace('/(tabs)/ai-chat');
    }
  }, [isAuthenticated, router, segments, state.hasCompletedOnboarding, state.isLoading]);

  if (state.isLoading || !isThemeReady || !isLanguageReady) {
    return (
      <View
        className={
          isDark
            ? 'flex-1 items-center justify-center bg-app-bg-dark'
            : 'flex-1 items-center justify-center bg-app-bg'
        }
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View
      className={
        isDark
          ? 'flex-1 dark bg-app-bg-dark'
          : 'flex-1 bg-app-bg'
      }
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Behind every screen. Screens paint their own surfaces on top, so this
          shows through the page margins rather than under the content. */}
      <Aurora />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            // Transparent so the Aurora behind the navigator shows through the
            // page margins. The root View below still supplies the page colour,
            // so nothing renders on bare black during a transition.
            backgroundColor: 'transparent',
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="choose-language" />
        <Stack.Screen name="welcome-onboarding" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="my-preferences" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="lesson-detail" />
        <Stack.Screen name="mocktest" />
        <Stack.Screen name="mocktest-session" />
        <Stack.Screen name="notebook" />
        <Stack.Screen name="replay" />
      </Stack>
    </View>
  );
}

function ThemedAppShell() {
  const themeVariables = useThemeVariables();

  return (
    <View style={themeVariables} className="flex-1">
      <AppContent />
      {/* Above the app, below toasts and dialogs -- the owl should never
          cover the message it just caused. */}
      <FloatingSensei />
      <AppToastViewport />
      <AppDialogViewport />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Don't hide splash here — AppContent handles it after auth hydration
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617' }} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <PreferencesProvider>
            <I18nProvider>
              <ProgressProvider>
                <CourseProgressProvider>
                  <ThemedAppShell />
                </CourseProgressProvider>
              </ProgressProvider>
            </I18nProvider>
          </PreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
