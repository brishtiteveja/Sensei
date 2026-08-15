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
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: theme.page,
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
      </Stack>
    </View>
  );
}

function ThemedAppShell() {
  const themeVariables = useThemeVariables();

  return (
    <View style={themeVariables} className="flex-1">
      <AppContent />
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
