import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/theme';
import { useTheme } from '@/contexts/theme-context';

interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showBackButton?: boolean;
}

export function AppHeader({ title, onBack, right, showBackButton = true }: AppHeaderProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();

  const handleBack = onBack ?? (() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  });

  return (
    <View
      className="px-5 py-4 border-b flex-row items-center gap-3"
      style={{ backgroundColor: theme.page, borderColor: theme.border }}
    >
      {showBackButton ? (
        <TouchableOpacity
          className="w-9 h-9 rounded-xl items-center justify-center shrink-0"
          style={{ backgroundColor: theme.surfaceAlt }}
          onPress={handleBack}
          activeOpacity={0.75}
        >
          <ArrowLeft size={18} color={isDark ? theme.textSoft : theme.textSoft} />
        </TouchableOpacity>
      ) : (
        <View className="w-9 h-9 shrink-0" />
      )}
      {title ? (
        <Text
          className={`flex-1 text-base font-space-semibold ${
            isDark ? 'text-app-text-dark' : 'text-app-text'
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}
      {right ?? null}
    </View>
  );
}
