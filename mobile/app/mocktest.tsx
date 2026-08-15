import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Placeholder } from '@/components/placeholder';
import { SkeletonLoader } from '@/components/skeleton-loader';
import {
  ChevronRight,
  BookOpen,
  Star,
  Users,
  Play,
  Timer,
  Search,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { getAllSubjects } from '@/api/mocktest';
import { SearchScreenHeader } from '@/components/search-screen-header';
import type { SubjectWithSets } from '@/types';
import { useAppTheme } from '@/theme';

type ViewState = 'subjects' | 'sets';

const SUBJECT_PAGE_SIZE = 10;

function getDifficultyColor(
  difficulty: string,
  theme: ReturnType<typeof useAppTheme>,
): { bg: string; text: string } {

  switch (difficulty) {
    case 'Easy':   return { bg: theme.easyBg, text: theme.easyText };
    case 'Medium': return { bg: theme.mediumBg, text: theme.mediumText };
    case 'Hard':   return { bg: theme.hardBg, text: theme.hardText };
    default:       return { bg: theme.surfaceAlt, text: theme.textSoft };
  }
}

export default function MocktestScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t } = useI18n();
  const pageBg = isDark ? 'bg-app-bg-dark' : 'bg-app-bg';
  const cardSurface = { backgroundColor: theme.surface, borderColor: theme.border };
  const iconSurface = { backgroundColor: theme.accentSoft };
  const primaryText = isDark ? 'text-app-text-dark' : 'text-app-text';
  const mutedText = isDark ? 'text-app-text-muted-dark' : 'text-app-text-muted';
  const [view, setView] = useState<ViewState>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithSets | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [subjectsList, setSubjectsList] = useState<SubjectWithSets[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [subjectPage, setSubjectPage] = useState(1);
  const [hasMoreSubjects, setHasMoreSubjects] = useState(true);
  const [debouncedSubjectQuery, setDebouncedSubjectQuery] = useState('');

  useEffect(() => {
    if (view !== 'subjects') return;

    const timeout = setTimeout(() => {
      setDebouncedSubjectQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, view]);

  const loadSubjects = (asRefresh = false) => {
    if (view !== 'subjects') return;

    let mounted = true;
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setSubjectsList([]);
    }
    setLoadingMore(false);
    setSubjectPage(1);
    setHasMoreSubjects(true);

    getAllSubjects({
      page: 1,
      limit: SUBJECT_PAGE_SIZE,
      search: debouncedSubjectQuery || undefined,
    })
      .then((result) => {
        if (!mounted) return;
        setSubjectsList(result.data);
        setSubjectPage(result.page);
        setHasMoreSubjects(result.page < result.totalPages);
      })
      .catch(() => {
        if (!mounted) return;
        setSubjectsList([]);
        setHasMoreSubjects(false);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => { mounted = false; };
  };

  useEffect(() => {
    const cleanup = loadSubjects(false);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [debouncedSubjectQuery, view]);

  const goBack = () => {
    setSearchQuery('');
    if (view === 'sets') { setView('subjects'); setSelectedSubject(null); }
    else { router.canGoBack() ? router.back() : router.replace('/(tabs)' as never); }
  };

  const selectSubject = (subject: SubjectWithSets) => {
    setSelectedSubject(subject);
    setSearchQuery('');
    setView('sets');
  };

  const startMocktest = (setId: string) => {
    // STUB: the /mcq/[setId] runner was removed with the question-bank backend.
    void setId;
  };

  const getTitle = (): string => {
    switch (view) {
      case 'subjects': return t('questionBank.mockTest');
      case 'sets':     return selectedSubject?.name ?? t('questionBank.questionSets');
      default:         return '';
    }
  };

  const filteredSets = (selectedSubject?.sets ?? []).filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const loadMoreSubjects = () => {
    if (view !== 'subjects' || loading || loadingMore || !hasMoreSubjects) return;

    const nextPage = subjectPage + 1;
    setLoadingMore(true);

    getAllSubjects({
      page: nextPage,
      limit: SUBJECT_PAGE_SIZE,
      search: debouncedSubjectQuery || undefined,
    })
      .then((result) => {
        setSubjectsList((current) => [
          ...current,
          ...result.data.filter((subject) => !current.some((item) => item.id === subject.id)),
        ]);
        setSubjectPage(result.page);
        setHasMoreSubjects(result.page < result.totalPages);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingMore(false);
      });
  };

  const renderLoading = () => (
    <View className="flex-1 px-5 pt-4">
      <SkeletonLoader variant="list" count={5} />
    </View>
  );

  const renderSubjects = () => {
    if (loading && subjectsList.length === 0) return renderLoading();
    return (
      <FlatList
        data={subjectsList}
        keyExtractor={(subject) => subject.id}
        renderItem={({ item: subject }) => (
          <TouchableOpacity
            className="rounded-[22px] p-4 border flex-row items-center gap-3.5"
            style={[
              cardSurface,
              { shadowColor: theme.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.12 : 0.08, shadowRadius: 14, elevation: 2 },
            ]}
            activeOpacity={0.75}
            onPress={() => selectSubject(subject)}
          >
            <View className="w-12 h-12 rounded-[16px] items-center justify-center shrink-0" style={iconSurface}>
              <Text style={{ fontSize: 22 }}>{subject.icon}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className={`text-xs font-space-semibold ${primaryText}`}>
                {subject.name}
              </Text>
              <Text className={`text-[11px] font-space mt-[3px] ${mutedText}`}>
                {t('questionBank.questionSetsCount', { count: subject.sets.length })}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 100,
          gap: 12,
          flexGrow: subjectsList.length === 0 ? 1 : undefined,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              loadSubjects(true);
            }}
            tintColor={theme.accent}
          />
        }
        onEndReached={loadMoreSubjects}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <SkeletonLoader variant="avatarText" count={2} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Placeholder
            icon={Search}
            title={debouncedSubjectQuery ? t('questionBank.noSubjectsFound') : t('questionBank.noSubjectsAvailable')}
            description={debouncedSubjectQuery ? 'Try another keyword or clear the search.' : 'Subjects will appear here when question bank data is available.'}
          />
        }
      />
    );
  };

  const renderSets = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 12 }} showsVerticalScrollIndicator={false}>
      {filteredSets.map((set) => {
        const diff = getDifficultyColor(set.difficulty, theme);
        return (
          <View
            key={set.id}
            className="rounded-[22px] p-4 border"
            style={[
              cardSurface,
              { shadowColor: theme.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.12 : 0.08, shadowRadius: 14, elevation: 2 },
            ]}
          >
            <View className="flex-row items-start justify-between mb-1">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className={`text-xs font-space-semibold ${primaryText}`}>
                    {set.name}
                  </Text>
                  <View style={{ backgroundColor: diff.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: diff.text }}>
                      {set.difficulty}
                    </Text>
                  </View>
                </View>
                <Text className={`text-[11px] font-space mt-1 ${mutedText}`}>
                  {set.year}
                </Text>
              </View>
              <View className="flex-row items-center gap-0.5 shrink-0">
                <Star size={13} color={theme.warning} fill={theme.warning} />
                <Text className="text-xs font-space-semibold" style={{ color: theme.warning }}>
                  {set.avgScore}%
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 mt-2 mb-3.5">
              <View className="flex-row items-center gap-1">
                <BookOpen size={13} color={theme.textMuted} />
                <Text className={`text-[11px] font-space ${mutedText}`}>
                  {t('questionBank.questionsCount', { count: set.questions })}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Users size={13} color={theme.textMuted} />
                <Text className={`text-[11px] font-space ${mutedText}`}>
                  {t('questionBank.attemptedCount', { count: set.completedBy.toLocaleString() })}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Timer size={13} color={theme.textMuted} />
                <Text className={`text-[11px] font-space ${mutedText}`}>
                  {t('questionBank.minutesShort', { count: 10 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={() => startMocktest(set.id)} className="rounded-[14px] overflow-hidden">
              <View
                style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, backgroundColor: theme.accentStrong }}
              >
                <Play size={15} color={theme.textInverse} />
                <Text className="text-white text-[11px] font-space-semibold">{t('questionBank.mockTest')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView className={`flex-1 ${pageBg}`} edges={['top']}>
      <SearchScreenHeader
        title={getTitle()}
        showBackButton
        onBackPress={goBack}
        searchValue={searchQuery}
        onChangeSearch={setSearchQuery}
        searchPlaceholder={t('questionBank.searchPlaceholder', { view })}
      />

      {view === 'subjects' && renderSubjects()}
      {view === 'sets' && renderSets()}
    </SafeAreaView>
  );
}
