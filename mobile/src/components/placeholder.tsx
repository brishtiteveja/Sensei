import type { ComponentType } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useTheme } from '@/contexts/theme-context';
import { SkeletonLoader } from '@/components/skeleton-loader';

type PlaceholderVariant = 'default' | 'error';
type PlaceholderIcon = ComponentType<LucideProps>;

interface PlaceholderProps {
  icon: PlaceholderIcon;
  title: string;
  description?: string;
  buttonText?: string;
  onPress?: () => void;
  loading?: boolean;
  variant?: PlaceholderVariant;
}

export function Placeholder({
  icon: Icon,
  title,
  description,
  buttonText,
  onPress,
  loading = false,
  variant = 'default',
}: PlaceholderProps) {
  const { isDark } = useTheme();
  const theme = useAppTheme();

  if (loading) {
    return (
      <View className="w-full px-2 py-4">
        <SkeletonLoader variant="list" count={3} />
      </View>
    );
  }

  const iconBg = variant === 'error'
    ? theme.dangerBg
    : theme.surfaceAlt;
  const iconColor = variant === 'error'
    ? theme.danger
    : theme.accent;
  const titleClass = isDark ? 'text-app-text-dark' : 'text-app-text';
  const descriptionClass = isDark ? 'text-app-text-muted-dark' : 'text-app-text-muted';
  const buttonBg = variant === 'error' ? theme.danger : theme.heroBg;

  return (
    <View
      className="w-full items-center justify-center px-6 py-10 rounded-[20px] border overflow-hidden"
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <View className="w-16 h-16 rounded-[20px] items-center justify-center" style={{ backgroundColor: iconBg }}>
        <Icon size={28} color={iconColor} />
      </View>
      <Text className={`mt-4 text-base font-space-semibold text-center ${titleClass}`}>
        {title}
      </Text>
      {description ? (
        <Text className={`mt-2 text-sm font-space text-center leading-6 ${descriptionClass}`}>
          {description}
        </Text>
      ) : null}
      {buttonText && onPress ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onPress}
          className="mt-5 min-w-[120px] rounded-2xl px-5 py-3 items-center"
          style={{ backgroundColor: buttonBg }}
        >
          <Text className="text-sm font-space-semibold text-white">
            {buttonText}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
