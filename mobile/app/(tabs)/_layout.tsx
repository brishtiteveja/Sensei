import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useEffect } from 'react';
import { Home, BookOpen, Brain, Zap, BarChart3 } from 'lucide-react-native';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme } from '@/theme';
import { AiTutorIllustration } from '@/illustrations/AiTutorIllustration';

const TAB_ICONS = {
  index: Home,
  learn: BookOpen,
  'ai-chat': Brain,
  practice: Zap,
  progress: BarChart3,
};

const TAB_LABEL_KEYS = {
  index: 'tabs.home',
  learn: 'tabs.learn',
  'ai-chat': 'tabs.dikkha',
  practice: 'tabs.practice',
  progress: 'tabs.progress',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="ai-chat" />
      <Tabs.Screen name="practice" />
      <Tabs.Screen name="progress" />
    </Tabs>
  );
}

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  return (
    <View
      className="flex-row items-center px-2 border-t"
      style={{ backgroundColor: theme.page, borderColor: theme.border, paddingBottom: insets.bottom, height: 64 + insets.bottom }}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const isCenter = index === 2;

        const IconComponent = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
        const labelKey = TAB_LABEL_KEYS[route.name as keyof typeof TAB_LABEL_KEYS];
        const label = labelKey ? t(labelKey) : null;
        if (!IconComponent || !label) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center justify-center"
              activeOpacity={0.85}
              style={{ marginTop: -18 }}
            >
              <View style={{
                width: 58, height: 58, borderRadius: 29,
                backgroundColor: theme.accentStrong,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: theme.accent, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
                borderWidth: 3, borderColor: theme.page,
              }}>
                <AiTutorIllustration size={36} />
              </View>
              <Text className="text-[10px] font-space-bold mt-1" style={{ color: isFocused ? theme.accent : theme.textMuted }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center justify-center h-14 gap-1"
            activeOpacity={0.7}
          >
            {IconComponent && (
              <IconComponent
                size={22}
                color={isFocused ? theme.accent : theme.textMuted}
              />
            )}
            <Text className="text-[11px] font-space-medium mt-0.5" style={{ color: isFocused ? theme.accent : theme.textMuted }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
