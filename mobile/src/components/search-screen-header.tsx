import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { useAppTheme } from '@/theme';
import { useTheme } from '@/contexts/theme-context';

interface SearchScreenHeaderProps {
  title: string;
  searchValue?: string;
  onChangeSearch?: (value: string) => void;
  searchPlaceholder?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  hideSearch?: boolean;
}

export function SearchScreenHeader({
  title,
  searchValue = '',
  onChangeSearch,
  searchPlaceholder = 'Search...',
  showBackButton = false,
  onBackPress,
  hideSearch = false,
}: SearchScreenHeaderProps) {
  const { isDark } = useTheme();
  const theme = useAppTheme();

  return (
    <View>
      <AppHeader
        title={title}
        onBack={onBackPress}
        showBackButton={showBackButton}
      />
      {!hideSearch ? (
        <View
          className="px-5 pt-4 pb-4 border-b"
          style={{ backgroundColor: theme.page, borderColor: theme.border }}
        >
          <View
            className="flex-row items-center rounded-[14px] border px-3 h-[46px]"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              ...(isDark ? {} : {
                shadowColor: theme.borderStrong,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }),
            }}
          >
            <View className="mr-2">
              <Search size={16} color={theme.textMuted} />
            </View>
            <TextInput
              className={`flex-1 text-xs font-space p-0 ${
                'text-app-text dark:text-app-text-dark'
              }`}
              value={searchValue}
              onChangeText={onChangeSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
