import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/app-header';
import { MessageCircle, Send, Smile } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/i18n/i18n-context';
import { showAppToast } from '@/feedback/toast';
import { communityApi, getApiErrorMessage, resolveApiUrl } from '@/api';
import type { CommunityComment, CommunityPost, CommunityReactionEmoji, CommunityUser } from '@/types';
import { useAppTheme } from '@/theme';

const COMMUNITY_REACTIONS: Array<{ emoji: CommunityReactionEmoji; symbol: string }> = [
  { emoji: 'FIRE', symbol: '🔥' },
  { emoji: 'PARTY', symbol: '🎉' },
  { emoji: 'STRONG', symbol: '💪' },
  { emoji: 'HEART', symbol: '❤️' },
  { emoji: 'WOW', symbol: '😮' },
];

const COMMENT_INPUT_EMOJIS = ['😀', '😂', '😍', '🤯', '🔥', '🎉', '💪', '❤️', '😮', '👏', '✅', '📚'];

function formatSeconds(value: number) {
  const min = Math.floor(value / 60);
  const sec = value % 60;
  return `${min}m ${sec}s`;
}

function formatCommunityDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${day} ${month}, ${year}, ${time}`;
}

function userInitials(name: string | null) {
  return (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function UserAvatar({
  user,
  size = 40,
}: {
  user: CommunityUser;
  size?: number;
}) {
  const theme = useAppTheme();
  const uri = resolveApiUrl(user.avatarUrl);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.accent,
      }}
      className="items-center justify-center"
    >
      <Text className="text-white text-xs font-space-bold">{userInitials(user.name)}</Text>
    </View>
  );
}

function AnimatedProgressBar({
  toValue,
  color1,
  color2,
  height = 6,
  bgColor = '#e2e8f0',
  delay = 400,
}: {
  toValue: number;
  color1: string;
  color2: string;
  height?: number;
  bgColor?: string;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, []);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={{ height, backgroundColor: bgColor, borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View style={{ width: widthInterpolated, height, borderRadius: height / 2, overflow: 'hidden' }}>
        <View style={{ flex: 1, backgroundColor: color1 }} />
      </Animated.View>
    </View>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId?: string }>();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  // No sign-in in Sensei: you are your learner id, which is also what the
  // server stamps on your posts and comments.
  const currentUserId = communityApi.currentLearnerId();
  const { t } = useI18n();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsNextCursor, setCommentsNextCursor] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<CommunityComment | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentSheetAnim = useRef(new Animated.Value(0)).current;
  const handledDeepLinkPostIdRef = useRef<string | null>(null);

  const loadCommunity = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await communityApi.getCommunity(undefined, 10);
      setPosts(response.data);
      setNextCursor(response.nextCursor);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const response = await communityApi.getCommunity(nextCursor, 10);
      setPosts((prev) => [...prev, ...response.data]);
      setNextCursor(response.nextCursor);
    } catch {
      // keep current data
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const updateReactionOptimistically = useCallback(
    async (postId: string, emoji: CommunityReactionEmoji) => {
      const previous = posts;
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const normalized = new Map(post.reactions.map((x) => [x.emoji, x.count]));
          const isUnreact = post.myReaction === emoji;

          if (post.myReaction) {
            const current = normalized.get(post.myReaction) ?? 0;
            if (current <= 1) normalized.delete(post.myReaction);
            else normalized.set(post.myReaction, current - 1);
          }

          if (!isUnreact) {
            normalized.set(emoji, (normalized.get(emoji) ?? 0) + 1);
          }

          return {
            ...post,
            myReaction: isUnreact ? null : emoji,
            reactions: COMMUNITY_REACTIONS
              .map((item) => ({ emoji: item.emoji, count: normalized.get(item.emoji) ?? 0 }))
              .filter((item) => item.count > 0),
          };
        }),
      );

      try {
        const response = await communityApi.reactToPost(postId, emoji);
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, myReaction: response.myReaction, reactions: response.reactions }
              : post,
          ),
        );
      } catch {
        setPosts(previous);
      }
    },
    [posts],
  );

  const loadComments = useCallback(async (postId: string, asRefresh = false) => {
    try {
      if (asRefresh) {
        setCommentsRefreshing(true);
      } else {
        setCommentsLoading(true);
      }
      setCommentsError(null);
      const response = await communityApi.getComments(postId, undefined, 20);
      setComments(response.data);
      setCommentsNextCursor(response.nextCursor);
    } catch (err) {
      setCommentsError(getApiErrorMessage(err));
    } finally {
      setCommentsLoading(false);
      setCommentsRefreshing(false);
    }
  }, []);

  const openCommentsModal = useCallback((post: CommunityPost) => {
    setSelectedPost(post);
    setComments([]);
    setCommentsNextCursor(null);
    setCommentInput('');
    setReplyingToComment(null);
    setShowEmojiPicker(false);
    setCommentsError(null);
    setCommentsModalVisible(true);
    commentSheetAnim.setValue(0);
    Animated.timing(commentSheetAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
    void loadComments(post.id);
  }, [commentSheetAnim, loadComments]);

  useEffect(() => {
    const postId = typeof params.postId === 'string' ? params.postId : null;
    if (!postId) return;
    if (handledDeepLinkPostIdRef.current === postId) return;

    const existing = posts.find((post) => post.id === postId);
    if (existing) {
      handledDeepLinkPostIdRef.current = postId;
      openCommentsModal(existing);
      return;
    }

    void communityApi
      .getCommunityPost(postId)
      .then((post) => {
        const normalized = {
          id: post.id,
          createdAt: post.createdAt,
          user: post.user,
          attempt: post.attempt,
          reactions: post.reactions,
          commentsCount: post.commentsCount,
          myReaction: post.myReaction,
        };
        setPosts((prev) =>
          prev.some((item) => item.id === normalized.id)
            ? prev
            : [normalized, ...prev],
        );
        handledDeepLinkPostIdRef.current = postId;
        openCommentsModal(normalized);
      })
      .catch(() => undefined);
  }, [openCommentsModal, params.postId, posts]);

  const closeCommentsModal = useCallback(() => {
    Animated.timing(commentSheetAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setCommentsModalVisible(false);
      setSelectedPost(null);
      setComments([]);
      setCommentsNextCursor(null);
      setCommentInput('');
      setReplyingToComment(null);
      setShowEmojiPicker(false);
      setCommentsError(null);
    });
  }, [commentSheetAnim]);

  const loadMoreComments = useCallback(async () => {
    if (!selectedPost?.id || !commentsNextCursor || commentsLoadingMore) return;
    try {
      setCommentsLoadingMore(true);
      const response = await communityApi.getComments(selectedPost.id, commentsNextCursor, 20);
      setComments((prev) => [...prev, ...response.data]);
      setCommentsNextCursor(response.nextCursor);
    } catch {
      // keep current comments
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [selectedPost?.id, commentsNextCursor, commentsLoadingMore]);

  const submitComment = useCallback(async () => {
    const content = commentInput.trim();
    if (!selectedPost?.id || !content || commentSubmitting) return;
    try {
      setCommentSubmitting(true);
      const newComment = await communityApi.addComment(
        selectedPost.id,
        content,
        replyingToComment?.id,
      );
      setComments((prev) => [newComment, ...prev]);
      setCommentInput('');
      setReplyingToComment(null);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === selectedPost.id
            ? { ...post, commentsCount: post.commentsCount + 1 }
            : post,
        ),
      );
      setSelectedPost((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev));
    } catch (err) {
      showAppToast({ type: 'error', title: t('community.commentFailed'), message: getApiErrorMessage(err) });
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentInput, commentSubmitting, replyingToComment?.id, selectedPost, t]);

  const addEmojiToComment = useCallback((emoji: string) => {
    setCommentInput((prev) => `${prev}${emoji}`);
  }, []);

  const reactToCommentOptimistically = useCallback(
    async (commentId: string, emoji: CommunityReactionEmoji) => {
      const previous = comments;
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id !== commentId) return comment;

          const normalized = new Map(comment.reactions.map((x) => [x.emoji, x.count]));
          const isUnreact = comment.myReaction === emoji;

          if (comment.myReaction) {
            const current = normalized.get(comment.myReaction) ?? 0;
            if (current <= 1) normalized.delete(comment.myReaction);
            else normalized.set(comment.myReaction, current - 1);
          }

          if (!isUnreact) {
            normalized.set(emoji, (normalized.get(emoji) ?? 0) + 1);
          }

          return {
            ...comment,
            myReaction: isUnreact ? null : emoji,
            reactions: COMMUNITY_REACTIONS
              .map((item) => ({ emoji: item.emoji, count: normalized.get(item.emoji) ?? 0 }))
              .filter((item) => item.count > 0),
          };
        }),
      );

      try {
        const response = await communityApi.reactToComment(commentId, emoji);
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? { ...comment, myReaction: response.myReaction, reactions: response.reactions }
              : comment,
          ),
        );
      } catch {
        setComments(previous);
      }
    },
    [comments],
  );

  const pageBg = isDark ? 'bg-app-bg-dark' : 'bg-app-bg';
  const primaryText = isDark ? 'text-app-text-dark' : 'text-app-text';
  const mutedText = isDark ? 'text-app-text-muted-dark' : 'text-app-text-muted';
  const cardClass = 'rounded-[24px] p-4 border shadow-sm shadow-black/10 bg-app-surface dark:bg-app-surface-dark border-app-border dark:border-app-border-dark';
  const sheetTranslateY = commentSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [380, 0],
  });

  return (
    <SafeAreaView className={`flex-1 ${pageBg}`} edges={['top']}>
      <View className={`${pageBg} flex-1`}>
        <AppHeader title={t('community.title')} />
        <View
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: theme.accentStrong }}
        >
          <View>
            <Text className="text-white text-lg font-space-bold">{t('community.title')}</Text>
            <Text className="text-xs font-space" style={{ color: theme.heroTextSoft }}>{t('community.subtitle')}</Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 px-5 pt-4">
            <SkeletonLoader variant="card" count={3} />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-sm font-space text-center" style={{ color: theme.textSoft }}>{error}</Text>
            <TouchableOpacity
              className="mt-4 px-4 py-2 rounded-full"
              style={{ backgroundColor: theme.accentStrong }}
              onPress={() => loadCommunity()}
            >
              <Text className="text-white text-xs font-space-semibold">{t('community.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCommunity(true)} />}
            onMomentumScrollEnd={loadMore}
          >
            {posts.length === 0 ? (
              <View className={cardClass}>
                <Text className="text-xs font-space text-center" style={{ color: theme.textMuted }}>{t('community.empty')}</Text>
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} className={cardClass}>
                  <View className="flex-row items-start gap-3">
                    <UserAvatar user={post.user} size={40} />
                    <View className="flex-1">
                      <Text className={`text-sm font-space-semibold ${primaryText}`}>
                        {post.user.name ?? t('community.anonymous')}
                      </Text>
                      <Text className="text-[11px] font-space" style={{ color: theme.textMuted }}>
                        {post.attempt.questionSet.subject.name}
                      </Text>
                    </View>
                    <Text className={`text-[11px] font-space ${mutedText}`}>
                      {formatCommunityDateTime(post.createdAt)}
                    </Text>
                  </View>

                  <View className="mt-3 p-3 rounded-2xl border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
                    <Text className={`text-xs font-space-semibold ${primaryText}`}>
                      {post.attempt.questionSet.name} • {post.attempt.questionSet.subject.name}
                    </Text>
                    <View className="flex-row flex-wrap mt-2 gap-2">
                      <Text className="text-[11px] font-space" style={{ color: theme.textSoft }}>
                        {t('community.score')}: {post.attempt.score}/{post.attempt.total}
                      </Text>
                      <Text className="text-[11px] font-space" style={{ color: theme.textSoft }}>
                        {t('community.percent')}: {post.attempt.percentage}%
                      </Text>
                      <Text className="text-[11px] font-space" style={{ color: theme.textSoft }}>
                        {t('community.time')}: {formatSeconds(post.attempt.timeTaken)}
                      </Text>
                    </View>
                    <View className="mt-2">
                      <AnimatedProgressBar toValue={post.attempt.percentage} color1={theme.accent} color2={theme.accentStrong} height={6} bgColor={theme.skeletonBase} delay={300} />
                    </View>
                  </View>

                  {post.user.id === currentUserId ? (
                    post.reactions.length > 0 && (
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {post.reactions.map((r) => {
                          const symbol = COMMUNITY_REACTIONS.find((f) => f.emoji === r.emoji)?.symbol;
                          return (
                            <View
                              key={r.emoji}
                              className="px-2.5 py-1.5 rounded-full border flex-row items-center"
                              style={{
                                borderColor: theme.border,
                                backgroundColor: 'transparent',
                              }}
                            >
                              <Text className="text-xs">{symbol}</Text>
                              <Text className="ml-1 text-[11px] font-space-medium" style={{ color: theme.textSoft }}>{r.count}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )
                  ) : (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {COMMUNITY_REACTIONS.map((item) => {
                        const count = post.reactions.find((r) => r.emoji === item.emoji)?.count ?? 0;
                        const active = post.myReaction === item.emoji;
                        return (
                          <TouchableOpacity
                            key={item.emoji}
                            onPress={() => updateReactionOptimistically(post.id, item.emoji)}
                            className="px-2.5 py-1.5 rounded-full border flex-row items-center"
                            style={{
                              borderColor: active ? theme.accent : theme.border,
                              backgroundColor: active ? theme.accentSoft : 'transparent',
                            }}
                          >
                            <Text className="text-xs">{item.symbol}</Text>
                            <Text className="ml-1 text-[11px] font-space-medium" style={{ color: theme.textSoft }}>{count}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <View className="mt-3 flex-row items-center justify-between">
                    <TouchableOpacity
                      className="flex-row items-center gap-1"
                      onPress={() => openCommentsModal(post)}
                    >
                      <MessageCircle size={14} color={theme.textMuted} />
                      <Text className="text-[11px] font-space" style={{ color: theme.textMuted }}>
                        {post.commentsCount} {t('community.comments')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: theme.accentStrong }}
                      onPress={() => router.push(`/community/${post.id}/attempt` as any)}
                    >
                      <Text className="text-white text-[11px] font-space-semibold">{t('community.viewAttempt')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {loadingMore ? (
              <View style={{ marginTop: 8 }}>
                <SkeletonLoader variant="avatarText" count={2} />
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      <BottomSheet visible={commentsModalVisible} onClose={closeCommentsModal} animationType="none" contentBackgroundColor={theme.page}>
          <Animated.View
            className={`${pageBg} rounded-t-[28px] px-5 pt-5 pb-4`}
            style={{
              minHeight: '56%',
              maxHeight: '86%',
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <View className="items-center mb-3">
              <View className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }} />
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-base font-space-semibold ${primaryText}`}>
                {t('community.comments')}
              </Text>
              <Text className="text-[11px] font-space" style={{ color: theme.textMuted }}>
                {selectedPost?.commentsCount ?? 0}
              </Text>
            </View>

            {commentsLoading ? (
              <View className="py-4">
                <SkeletonLoader variant="avatarText" count={4} />
              </View>
            ) : commentsError ? (
              <View className="items-center justify-center py-8">
                <Text className="text-xs font-space text-center" style={{ color: theme.textSoft }}>
                  {commentsError}
                </Text>
                {selectedPost?.id ? (
                  <TouchableOpacity
                    onPress={() => loadComments(selectedPost.id)}
                    className="mt-3 px-4 py-2 rounded-full"
                    style={{ backgroundColor: theme.accentStrong }}
                  >
                    <Text className="text-white text-xs font-space-semibold">{t('community.retry')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
                refreshControl={
                  selectedPost?.id ? (
                    <RefreshControl
                      refreshing={commentsRefreshing}
                      onRefresh={() => loadComments(selectedPost.id, true)}
                    />
                  ) : undefined
                }
                onMomentumScrollEnd={loadMoreComments}
              >
                {comments.length === 0 ? (
                  <View className="rounded-2xl p-3" style={{ backgroundColor: theme.surfaceAlt }}>
                    <Text className="text-xs font-space text-center" style={{ color: theme.textMuted }}>
                      {t('community.noComments')}
                    </Text>
                  </View>
                ) : (
                  comments.map((comment) => (
                    <View
                      key={comment.id}
                      className="rounded-2xl p-3 border"
                      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                    >
                      <View className="flex-row items-start gap-2.5">
                        <UserAvatar user={comment.user} size={32} />
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className={`text-xs font-space-semibold ${primaryText}`}>
                              {comment.user.name ?? t('community.anonymous')}
                            </Text>
                            <Text className={`text-[10px] font-space ${mutedText}`}>
                              {formatCommunityDateTime(comment.createdAt)}
                            </Text>
                          </View>
                          <Text className="text-xs font-space leading-5" style={{ color: theme.textSoft }}>
                            {comment.content}
                          </Text>
                          <View className="mt-2 flex-row items-center justify-between">
                            <TouchableOpacity
                              onPress={() => {
                                setReplyingToComment(comment);
                                setShowEmojiPicker(false);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text className="text-[11px] font-space-semibold" style={{ color: theme.accent }}>
                                {t('community.reply')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {comment.user.id === currentUserId ? (
                            comment.reactions.length > 0 ? (
                              <View className="mt-2 flex-row flex-wrap gap-2">
                                {comment.reactions.map((r) => {
                                  const symbol = COMMUNITY_REACTIONS.find((f) => f.emoji === r.emoji)?.symbol;
                                  return (
                                    <View
                                      key={`${comment.id}-${r.emoji}`}
                                      className="px-2.5 py-1 rounded-full border flex-row items-center"
                                      style={{
                                        borderColor: theme.border,
                                        backgroundColor: 'transparent',
                                      }}
                                    >
                                      <Text className="text-xs">{symbol}</Text>
                                      <Text className="ml-1 text-[11px] font-space-medium" style={{ color: theme.textSoft }}>{r.count}</Text>
                                    </View>
                                  );
                                })}
                              </View>
                            ) : null
                          ) : (
                            <View className="mt-2 flex-row flex-wrap gap-2">
                              {COMMUNITY_REACTIONS.map((item) => {
                                const count = comment.reactions.find((r) => r.emoji === item.emoji)?.count ?? 0;
                                const active = comment.myReaction === item.emoji;
                                return (
                                  <TouchableOpacity
                                    key={`${comment.id}-${item.emoji}`}
                                    onPress={() => reactToCommentOptimistically(comment.id, item.emoji)}
                                    className="px-2.5 py-1 rounded-full border flex-row items-center"
                                    style={{
                                      borderColor: active ? theme.accent : theme.border,
                                      backgroundColor: active ? theme.accentSoft : 'transparent',
                                    }}
                                  >
                                    <Text className="text-xs">{item.symbol}</Text>
                                    <Text className="ml-1 text-[11px] font-space-medium" style={{ color: theme.textSoft }}>{count}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}
                {commentsLoadingMore ? (
                  <View style={{ marginTop: 8 }}>
                    <SkeletonLoader variant="avatarText" count={2} />
                  </View>
                ) : null}
              </ScrollView>
            )}

            {showEmojiPicker ? (
              <View className="mb-2 rounded-2xl p-3" style={{ backgroundColor: theme.surfaceAlt }}>
                <View className="flex-row flex-wrap gap-2">
                  {COMMENT_INPUT_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => addEmojiToComment(emoji)}
                      className="w-9 h-9 rounded-xl items-center justify-center"
                      style={{ backgroundColor: theme.surface }}
                      activeOpacity={0.8}
                    >
                      <Text className="text-lg">{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {replyingToComment ? (
              <View className="mb-2 rounded-2xl px-3 py-2 border flex-row items-center justify-between" style={{ backgroundColor: theme.accentSoft, borderColor: theme.accent }}>
                <View className="flex-1 pr-3">
                  <Text className={`text-[11px] font-space-semibold ${primaryText}`}>
                    {t('community.replyingTo', { name: replyingToComment.user.name ?? t('community.anonymous') })}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className={`text-[11px] font-space ${mutedText}`}
                  >
                    {replyingToComment.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingToComment(null)}>
                  <Text className="text-[11px] font-space-semibold" style={{ color: theme.accent }}>
                    {t('community.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View className={`pt-2 flex-row items-end gap-2 ${pageBg}`}>
              <TouchableOpacity
                onPress={() => setShowEmojiPicker((prev) => !prev)}
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: theme.surfaceAlt }}
                activeOpacity={0.8}
              >
                <Smile size={16} color={theme.textSoft} />
              </TouchableOpacity>
              <TextInput
                className="flex-1 rounded-xl px-3 py-2.5 text-xs font-space"
                style={{ backgroundColor: theme.surfaceAlt, color: theme.text, minHeight: 44, maxHeight: 120 }}
                placeholder={t('community.commentPlaceholder')}
                placeholderTextColor={theme.textMuted}
                value={commentInput}
                onChangeText={setCommentInput}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={commentSubmitting || !commentInput.trim()}
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: theme.accentStrong, opacity: commentSubmitting || !commentInput.trim() ? 0.6 : 1 }}
              >
                <Send size={16} color={theme.textInverse} />
              </TouchableOpacity>
            </View>
          </Animated.View>
      </BottomSheet>
    </SafeAreaView>
  );
}
