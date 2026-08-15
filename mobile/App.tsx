/**
 * Sensei — offline Socratic tutor for the DGX Spark (GB10).
 *
 * Deliberately no navigation library: four screens do not justify the dependency, and
 * every dependency is something that can fail on a borrowed phone at an event. All four
 * stay mounted and are toggled with `display`, so switching tabs never discards a live
 * stream, a half-typed Bangla message, or an in-flight 60-second diagnosis.
 *
 * Offline contract: the only network destination in this entire app is the base URL the
 * operator types in Settings. Fonts are local .ttf files, there is no analytics SDK, no
 * remote image, no telemetry. The demo ends by pulling the cable.
 */

import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from './src/components/ui';
import ChatScreen from './src/screens/ChatScreen';
import PathScreen from './src/screens/PathScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WorkScreen from './src/screens/WorkScreen';
import { StoreProvider, useStore, type Tab } from './src/state/store';
import { colors, space } from './src/theme';

const TABS: { key: Tab; label: string }[] = [
  { key: 'chat', label: 'Tutor' },
  { key: 'work', label: 'My work' },
  { key: 'path', label: 'Course' },
  { key: 'settings', label: 'Settings' },
];

export default function App() {
  // Bundled locally from assets/fonts -- never a webfont. Hind Siliguri carries both
  // Bengali (with conjunct shaping) and Latin, so one family covers the whole UI.
  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri: require('./assets/fonts/HindSiliguri-Regular.ttf'),
    'HindSiliguri-Bold': require('./assets/fonts/HindSiliguri-Bold.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (fontError) {
    // Rendering with the system font is strictly better than a blank screen; Bengali
    // still shows on both platforms, just with different metrics.
    console.warn('Bundled font failed to load, falling back to system:', fontError);
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { tab, setTab, hydrated } = useStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {!hydrated ? (
        <View style={styles.boot}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={styles.body}>
          <Pane visible={tab === 'chat'}>
            <ChatScreen />
          </Pane>
          <Pane visible={tab === 'work'}>
            <WorkScreen />
          </Pane>
          <Pane visible={tab === 'path'}>
            <PathScreen />
          </Pane>
          <Pane visible={tab === 'settings'}>
            <SettingsScreen />
          </Pane>
        </View>
      )}

      <View style={[styles.tabbar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
              <View style={[styles.tabMark, active && styles.tabMarkActive]} />
              <Txt size={12} bold={active} color={active ? colors.accent : colors.textDim}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * `display: none` rather than conditional rendering: unmounting a screen would tear
 * down whatever it was doing, and the expensive things here take minutes.
 */
function Pane({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return <View style={[styles.pane, !visible && styles.hidden]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  pane: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hidden: { display: 'none' },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabMark: { height: 2, width: 22, borderRadius: 1, backgroundColor: 'transparent' },
  tabMarkActive: { backgroundColor: colors.accent },
});
