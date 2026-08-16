import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { SkeletonLoader } from '@/components/skeleton-loader';
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  BookOpen,
  Atom,
  Calculator,
  Languages,
  Trash2,
  Plus,
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  Mic,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { aiApi, aiCreditsApi, senseiApi, getApiErrorMessage } from '@/api';
import { useAuth } from '@/contexts/auth-context';
import { useProgress } from '@/gamification/progress-context';
import { saveConversation, loadHistory, deleteConversation, type ConversationEntry } from '@/gamification/conversation-history';
import { saveSessionForLesson } from '@/gamification/lesson-sessions';
import { LessonProgressBar } from '@/components/lesson-progress-bar';
import { ConceptSummaryCard } from '@/components/concept-summary-card';
import { ProPaywall } from '@/components/pro-paywall';
import type { AiChatSession, AiCreditBalance } from '@/types';
import { showAppDialog } from '@/feedback/dialog';
import { showAppToast } from '@/feedback/toast';
import { useAppTheme } from '@/theme';
import { getGuestAiSessionId } from '@/lib/guest-ai-session';
import { FormattedText } from '@/components/formatted-text';
import { ToolGrid, CalculatorSheet, pickImage, pickFile, useVoiceInput, DrawingCanvas, EquationEditor, AttachmentPreview } from '@/components/chat-tools';
import type { ToolType, ChatAttachment } from '@/components/chat-tools';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface SuggestedTopic {
  labelKey: string;
  Icon: React.ComponentType<any>;
  iconBg: string;
  iconBgDark: string;
  iconColor: string;
}

const SUGGESTED_TOPICS: SuggestedTopic[] = [
  { labelKey: 'aiChat.topicQuantum', Icon: Atom, iconBg: '#EDE9FE', iconBgDark: '#312E81', iconColor: '#9333EA' },
  { labelKey: 'aiChat.topicCalculus', Icon: Calculator, iconBg: '#E0E7FF', iconBgDark: '#0F172A', iconColor: '#7C3AED' },
  { labelKey: 'aiChat.topicBanglaGrammar', Icon: BookOpen, iconBg: '#F1F5F9', iconBgDark: '#0F172A', iconColor: '#10B981' },
  { labelKey: 'aiChat.topicEnglishVocab', Icon: Languages, iconBg: '#FBBF24', iconBgDark: '#D97706', iconColor: '#D97706' },
  { labelKey: 'aiChat.topicStudyTechniques', Icon: Lightbulb, iconBg: '#F87171', iconBgDark: '#EF4444', iconColor: '#F43F5E' },
];

function formatRelativeTime(dateStr: string, t: (key: string, options?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const then = Date.parse(dateStr);
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('aiChat.justNow');
  if (minutes < 60) return t('aiChat.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('aiChat.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('aiChat.daysAgo', { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return t('aiChat.weeksAgo', { count: weeks });
  return new Date(then).toLocaleDateString();
}

function TypingIndicator({ isDark }: { isDark: boolean }) {
  const theme = useAppTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    const a1 = createBounce(dot1, 0);
    const a2 = createBounce(dot2, 160);
    const a3 = createBounce(dot3, 320);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View className="flex-row items-end gap-2 mb-3">
      <View className="w-7 h-7 rounded-[9px] items-center justify-center mt-0.5 shrink-0" style={{ backgroundColor: theme.accentSoft }}>
        <Sparkles size={12} color={theme.accent} />
      </View>
      <View className="flex-row items-center rounded-[20px] px-4 py-3.5 gap-[5px]" style={{ borderBottomLeftRadius: 4, backgroundColor: theme.surfaceAlt }}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            className="w-[7px] h-[7px] rounded-full"
            style={{ transform: [{ translateY: dot }], backgroundColor: theme.textDisabled }}
          />
        ))}
      </View>
    </View>
  );
}

function mapApiMessage(message: {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}): Message {
  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    text: message.content,
    timestamp: Date.parse(message.createdAt) || Date.now(),
  };
}

// ──────────────────────────────────────────────
// Conversation List View
// ──────────────────────────────────────────────
function ConversationListView({
  isDark,
  conversations,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  hasMore,
  onSelect,
  onDelete,
  onNewChat,
  onQuickTopic,
  t,
  language,
}: {
  isDark: boolean;
  conversations: AiChatSession[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onSelect: (session: AiChatSession) => void;
  onDelete: (session: AiChatSession) => void;
  onNewChat: () => void;
  onQuickTopic: (prompt: string) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
  language: string;
}) {
  const theme = useAppTheme();
  const sparkleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [sparkleAnim]);

  if (loading && conversations.length === 0) {
    return (
      <View className="flex-1 px-4 pt-4">
        <SkeletonLoader variant="list" count={5} />
      </View>
    );
  }

  if (!loading && conversations.length === 0) {
    const quickTopics = [
      { icon: '⚛️', label: language === 'bn' ? 'পদার্থবিজ্ঞান শেখাও' : 'Teach me Physics', prompt: language === 'bn' ? 'আমাকে পদার্থবিজ্ঞান শেখাও' : 'Teach me Physics', color: '#2F86EB' },
      { icon: '⚗️', label: language === 'bn' ? 'রসায়ন প্রশ্ন দাও' : 'Chemistry questions', prompt: language === 'bn' ? 'রসায়ন থেকে প্রশ্ন দাও' : 'Give me Chemistry questions', color: '#10B981' },
      { icon: '📐', label: language === 'bn' ? 'গণিত সমাধান করো' : 'Solve Math problems', prompt: language === 'bn' ? 'গণিত সমস্যা সমাধান করতে সাহায্য করো' : 'Help me solve Math problems', color: '#7C3AED' },
      { icon: '🧬', label: language === 'bn' ? 'জীববিজ্ঞান বুঝিয়ে বলো' : 'Explain Biology', prompt: language === 'bn' ? 'জীববিজ্ঞান বুঝিয়ে বলো' : 'Explain Biology concepts', color: '#EC4899' },
      { icon: '🎯', label: language === 'bn' ? 'BUET প্রশ্ন প্র্যাকটিস' : 'BUET practice', prompt: language === 'bn' ? 'BUET ভর্তি পরীক্ষার প্রশ্ন দাও' : 'Give me BUET admission questions', color: '#F59E0B' },
      { icon: '💡', label: language === 'bn' ? 'আজকের দুর্বল বিষয়' : 'My weak topics', prompt: language === 'bn' ? 'আমার দুর্বল বিষয় থেকে প্রশ্ন দাও' : 'Quiz me on my weak subjects', color: '#EF4444' },
    ];
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        <Text className="font-space-bold text-lg mb-1" style={{ color: theme.text }}>
          {language === 'bn' ? 'Sensei-কে জিজ্ঞেস করো' : 'Ask Sensei'}
        </Text>
        <Text className="font-space text-sm mb-5" style={{ color: theme.textMuted }}>
          {language === 'bn' ? 'যেকোনো বিষয়ে সাহায্য নাও' : 'Get help on any topic'}
        </Text>

        <View style={{ gap: 8 }}>
          {quickTopics.map((topic) => (
            <TouchableOpacity
              key={topic.label}
              activeOpacity={0.7}
              onPress={() => onQuickTopic(topic.prompt)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: theme.surface, borderRadius: 14,
                paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1, borderColor: theme.border,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: topic.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{topic.icon}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: theme.text }}>
                {topic.label}
              </Text>
              <ChevronRight size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onNewChat}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.accentStrong, marginTop: 20 }}
        >
          <Plus size={18} color={theme.textInverse} />
          <Text className="font-space-semibold text-sm text-white">{t('aiChat.startNewChat')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.3}
      renderItem={({ item }) => (
        <TouchableOpacity
          className="flex-row items-center rounded-2xl p-4 mb-2.5 border"
          activeOpacity={0.7}
          onPress={() => onSelect(item)}
          onLongPress={() => onDelete(item)}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            ...(isDark ? {} : { shadowColor: theme.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }),
          }}
        >
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: theme.accentSoft }}>
            <Sparkles size={18} color={theme.accent} />
          </View>
          <View className="flex-1 mr-2">
            <Text className="font-space-semibold text-[15px] mb-0.5" style={{ color: theme.text }} numberOfLines={1}>
              {item.title || t('aiChat.newConversation')}
            </Text>
            <Text className="font-space text-xs" style={{ color: theme.textMuted }}>
              {formatRelativeTime(item.lastMessageAt || item.updatedAt, t)}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.textMuted} />
        </TouchableOpacity>
      )}
    />
  );
}

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────
export default function AiChatScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const { isAuthenticated, state: authState } = useAuth();
  const { prompt, autoStart, fromLearn, lessonId, sessionId: paramSessionId, lessonTitle } = useLocalSearchParams<{
    prompt?: string;
    autoStart?: string;
    fromLearn?: string;
    lessonId?: string;
    sessionId?: string;
    lessonTitle?: string;
  }>();
  const shouldOpenComposer =
    autoStart === '1' ||
    autoStart === 'true' ||
    (typeof prompt === 'string' && prompt.trim().length > 0);

  // -- List state --
  const [conversations, setConversations] = useState<AiChatSession[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listCursor, setListCursor] = useState<string | null>(null);

  // -- Chat state --
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    paramSessionId ? paramSessionId : shouldOpenComposer ? '__new__' : null,
  );

  // When lesson changes, reset chat to that lesson's session
  useEffect(() => {
    if (!lessonId) return;
    const sid = paramSessionId || '__new__';
    setActiveSessionId(sid);
    setActiveSessionTitle(lessonTitle || null);
    setMessages([]);
    setFollowUpSuggestions([]);
    setConceptSummary(null);
    setLessonStep(0);
    senseiSessionRef.current = paramSessionId || null;
  }, [lessonId, paramSessionId]);
  const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(lessonTitle || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<AiCreditBalance | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [toolGridVisible, setToolGridVisible] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [showProPaywall, setShowProPaywall] = useState(false);
  const dailyAiCount = useRef(0);
  const [lessonStep, setLessonStep] = useState(0);
  const [conceptSummary, setConceptSummary] = useState<{ title: string; concepts: string[]; formula?: string } | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  // Voice input
  const {
    isListening,
    transcript,
    isAvailable: voiceAvailable,
    startListening,
    stopListening,
  } = useVoiceInput();
  const micPulse = useRef(new Animated.Value(1)).current;

  const seededPromptRef = useRef(false);
  const autoStartHandledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const plusRotation = useRef(new Animated.Value(0)).current;
  const sendingRef = useRef(false);
  const senseiSessionRef = useRef<string | null>(paramSessionId || null);
  const { record: recordXp } = useProgress();

  const showCreditGate = useCallback(() => {
    setShowProPaywall(true);
    return;

    // Legacy credit gate — kept for reference
    if (!isAuthenticated) {
      showAppDialog({
        title: 'Login required',
        message: 'Your guest AI credits are finished. Log in or register to get 30 more free credits.',
        actions: [
          { label: 'Not now', variant: 'cancel' },
          { label: 'Login / Register', onPress: () => {} }, // STUB: /login removed (no auth backend)
        ],
      });
      return;
    }

    showAppDialog({
      title: 'Buy AI credits',
      message: 'Your free AI credits are finished. Buy a credit package or view plans to continue.',
      actions: [
        { label: 'Cancel', variant: 'cancel' },
        { label: 'View Plans', onPress: () => {} }, // STUB: /subscription removed (no payments backend)
        { label: 'Buy Credits', onPress: () => {} }, // STUB: /ai-credits removed (no credits backend)
      ],
    });
  }, [isAuthenticated, router]);

  const refreshCreditBalance = useCallback(async () => {
    try {
      if (isAuthenticated) {
        setCreditBalance(await aiCreditsApi.getUserBalance());
        return;
      }
      const sessionId = guestSessionId ?? (await getGuestAiSessionId());
      setGuestSessionId(sessionId);
      setCreditBalance(await aiCreditsApi.getGuestBalance(sessionId));
    } catch {
      // Credit state is non-blocking for screen load; send still relies on backend.
    }
  }, [guestSessionId, isAuthenticated]);

  // Header rotation animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
    ).start();
  }, [rotateAnim]);

  const rotateDeg = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ── Conversation List ──

  const fetchConversations = useCallback(async (cursor?: string | null) => {
    if (!isAuthenticated) {
      setConversations([]);
      setListCursor(null);
      return;
    }
    try {
      const response = await aiApi.getUserSessions(cursor ?? undefined, 20);
      if (cursor) {
        setConversations((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newItems = response.data.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newItems];
        });
      } else {
        setConversations(response.data);
      }
      setListCursor(response.nextCursor);
    } catch {
      // silently fail on list refresh
    }
  }, [isAuthenticated]);

  const refreshList = useCallback(async () => {
    setListRefreshing(true);
    await fetchConversations(null);
    setListRefreshing(false);
  }, [fetchConversations]);

  const loadMoreConversations = useCallback(() => {
    if (listCursor) {
      void fetchConversations(listCursor);
    }
  }, [listCursor, fetchConversations]);

  // Initial load
  useEffect(() => {
    (async () => {
      if (authState.isLoading) return;
      setListLoading(true);
      await fetchConversations(null);
      setListLoading(false);
    })();
  }, [authState.isLoading, fetchConversations]);

  useEffect(() => {
    if (!authState.isLoading) {
      void refreshCreditBalance();
    }
  }, [authState.isLoading, refreshCreditBalance]);

  // Refresh list when tab is focused
  useFocusEffect(
    useCallback(() => {
      void refreshCreditBalance();
      if (!listLoading) {
        void fetchConversations(null);
      }
    }, [fetchConversations, listLoading, refreshCreditBalance]),
  );

  // ── Session Selection ──

  const openSession = useCallback(async (session: AiChatSession) => {
    setActiveSessionId(session.id);
    setActiveSessionTitle(session.title);
    setMessages([]);
    setHistoryCursor(null);
    setErrorMessage(null);
    setMessagesLoading(true);

    try {
      const response = await aiApi.getChatSessionMessages(session.id, undefined, 30);
      setMessages(response.data.map(mapApiMessage));
      setHistoryCursor(response.nextCursor);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const goBackToList = useCallback(() => {
    // If we came from Learn tab, navigate back explicitly (router.back doesn't work between tabs)
    if (fromLearn === '1') {
      router.setParams({ fromLearn: '', prompt: '', autoStart: '', lessonId: '', sessionId: '' });
      router.navigate('/(tabs)/learn' as any);
      return;
    }
    senseiSessionRef.current = null;
    setActiveSessionId(null);
    setActiveSessionTitle(null);
    setMessages([]);
    setInput('');
    setErrorMessage(null);
    setHistoryCursor(null);
    sendingRef.current = false;
    setIsTyping(false);
    setAttachments([]);
    setActiveTool(null);
    setToolGridVisible(false);
    plusRotation.setValue(0);
    void fetchConversations(null);
  }, [fetchConversations, plusRotation, fromLearn, prompt, router]);

  const startNewChat = useCallback(() => {
    senseiSessionRef.current = null;
    setActiveSessionId('__new__');
    setActiveSessionTitle(null);
    setMessages([]);
    setInput('');
    setErrorMessage(null);
    setHistoryCursor(null);
    setAttachments([]);
  }, []);

  useEffect(() => {
    if (!shouldOpenComposer || autoStartHandledRef.current) return;
    autoStartHandledRef.current = true;
    startNewChat();
    if (typeof prompt === 'string' && prompt.trim()) {
      setTimeout(() => void sendMessage(prompt.trim()), 400);
    }
    router.setParams({ autoStart: '' });
  }, [shouldOpenComposer, startNewChat, router]);

  const deleteSession = useCallback((session: AiChatSession) => {
    showAppDialog({
      title: t('aiChat.deleteTitle'),
      message: t('aiChat.deleteBody', { title: session.title || t('aiChat.newConversation') }),
      actions: [
        { label: t('common.cancel'), variant: 'cancel' },
        {
          label: t('common.delete'),
          variant: 'destructive',
          onPress: async () => {
            try {
              await aiApi.deleteChatSession(session.id);
              setConversations((prev) => prev.filter((s) => s.id !== session.id));
              if (activeSessionId === session.id) {
                goBackToList();
              }
            } catch (error) {
              showAppToast({
                type: 'error',
                title: t('common.error'),
                message: getApiErrorMessage(error),
              });
            }
          },
        },
      ],
    });
  }, [activeSessionId, goBackToList, t]);

  // ── Chat Logic ──

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const ensureSession = async (title?: string) => {
    if (!isAuthenticated) return '__guest__';
    if (activeSessionId && activeSessionId !== '__new__') return activeSessionId;
    const session = await aiApi.createChatSession(title ? { title: title.slice(0, 80) } : undefined);
    setActiveSessionId(session.id);
    setActiveSessionTitle(session.title);
    setHistoryCursor(null);
    return session.id;
  };

  const loadOlderMessages = async () => {
    const sid = activeSessionId;
    if (!sid || sid === '__new__' || !historyCursor || loadingOlder) return;
    try {
      setLoadingOlder(true);
      const response = await aiApi.getChatSessionMessages(sid, historyCursor, 20);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const older = response.data
          .map(mapApiMessage)
          .filter((message) => !existingIds.has(message.id));
        return [...older, ...prev];
      });
      setHistoryCursor(response.nextCursor);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || sendingRef.current) return;
    if (creditBalance && creditBalance.availableCredits <= 0) {
      showCreditGate();
      return;
    }

    // Build message text including attachment indicators
    let messageText = trimmed;
    if (attachments.length > 0) {
      const attachmentTexts = attachments.map(a => {
        if (a.type === 'image') return '[\u{1F4F7} Image attached]';
        if (a.type === 'drawing') return '[\u{270F}\u{FE0F} Drawing attached]';
        return `[\u{1F4CE} ${a.name}]`;
      });
      messageText = messageText
        ? messageText + '\n' + attachmentTexts.join('\n')
        : attachmentTexts.join('\n');
    }

    const tempUserId = `temp-${Date.now()}`;
    const streamingId = `streaming-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempUserId,
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    sendingRef.current = true;
    setErrorMessage(null);
    setLastFailedMessage(null);
    setFollowUpSuggestions([]);
    setMessages((prev) => [...prev, optimisticMessage]);
    setInput('');
    setAttachments([]);
    setIsTyping(true);
    scrollToBottom();

    try {
      // Use SenseiClaw directly for Socratic tutoring (both guest and authenticated)
      let streamStarted = false;

      await senseiApi.streamSenseiMessage(
        {
          message: messageText,
          sessionId: senseiSessionRef.current ?? undefined,
          contextType: lessonId ? 'topic_study' : 'free_chat',
          contextData: lessonId ? { lesson_id: lessonId, lesson_step: lessonStep + 1 } : undefined,
          language,
        },
        (event) => {
          if (event.type === 'chunk') {
            if (!streamStarted) {
              streamStarted = true;
              setIsTyping(false);
              setMessages((prev) => [
                ...prev,
                { id: streamingId, role: 'assistant', text: event.content, timestamp: Date.now() },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingId
                    ? { ...msg, text: msg.text + event.content }
                    : msg,
                ),
              );
            }
            scrollToBottom();
          } else if (event.type === 'done') {
            setMessages((prev) => {
              const withoutStreaming = prev.filter(
                (msg) => msg.id !== streamingId,
              );
              return [
                ...withoutStreaming,
                mapApiMessage(event.message),
              ];
            });

            if (event.session) {
              senseiSessionRef.current = event.session.id;
              setActiveSessionId(event.session.id);
              setActiveSessionTitle(event.session.title);
              // Map lesson → session so tapping the same lesson reopens this chat
              if (lessonId) {
                saveSessionForLesson(lessonId, event.session.id);
              }
              saveConversation({
                sessionId: event.session.id,
                title: event.session.title || trimmed.slice(0, 60),
                lastMessage: event.message?.content?.slice(0, 100) || '',
                messageCount: messages.length + 2,
                createdAt: event.session.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lessonId: lessonId || undefined,
              });
            }
            recordXp('ai_interaction');
            dailyAiCount.current += 1;
            if (lessonId) {
              setLessonStep(s => Math.min(s + 1, 4));
            }
            if (dailyAiCount.current >= 5) {
              setTimeout(() => setShowProPaywall(true), 1500);
            }
          } else if (event.type === 'summary') {
            setConceptSummary(event.summary);
          } else if (event.type === 'suggestions') {
            setFollowUpSuggestions(event.suggestions);
          } else if (event.type === 'error') {
            setErrorMessage(event.error);
            setLastFailedMessage(trimmed);
            setIsTyping(false);
          }
        },
      );

      if (!streamStarted) {
        setIsTyping(false);
      }
    } catch (error) {
      // Fallback to non-streaming SenseiClaw on stream failure
      try {
        const response = await senseiApi.sendSenseiMessage(trimmed);
        setMessages((prev) => {
          const remaining = prev.filter(
            (msg) => msg.id !== streamingId,
          );
          return [
            ...remaining,
            {
              id: `sensei-${Date.now()}`,
              role: 'assistant' as const,
              text: response.text,
              timestamp: Date.now(),
            },
          ];
        });
      } catch (fallbackError) {
        const message = getApiErrorMessage(fallbackError);
        setErrorMessage(message);
        setLastFailedMessage(trimmed);
      }
    } finally {
      setIsTyping(false);
      sendingRef.current = false;
      void refreshCreditBalance();
      scrollToBottom();
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y <= 24) {
      void loadOlderMessages();
    }
  };

  const toggleToolGrid = useCallback(() => {
    setToolGridVisible((prev) => {
      const next = !prev;
      if (next) {
        Keyboard.dismiss();
      }
      Animated.spring(plusRotation, {
        toValue: next ? 1 : 0,
        useNativeDriver: true,
      }).start();
      return next;
    });
  }, [plusRotation]);

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      setActiveTool(tool);
      setToolGridVisible(false);
      Animated.spring(plusRotation, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    [plusRotation],
  );

  const plusRotateInterpolation = plusRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Handle camera tool activation
  useEffect(() => {
    if (activeTool !== 'camera') return;

    showAppDialog({
      title: t('chatTools.camera'),
      message: '',
      actions: [
        { label: t('common.cancel'), variant: 'cancel' },
        {
          label: t('chatTools.imageFromCamera'),
          onPress: async () => {
            const result = await pickImage('camera');
            if (result) {
              setAttachments((prev) => [
                ...prev,
                { type: 'image', uri: result.uri, name: result.fileName },
              ]);
            }
          },
        },
        {
          label: t('chatTools.imageFromGallery'),
          onPress: async () => {
            const result = await pickImage('gallery');
            if (result) {
              setAttachments((prev) => [
                ...prev,
                { type: 'image', uri: result.uri, name: result.fileName },
              ]);
            }
          },
        },
      ],
    });

    setActiveTool(null);
  }, [activeTool, t]);

  // Handle file tool activation
  useEffect(() => {
    if (activeTool !== 'file') return;

    (async () => {
      const result = await pickFile();
      if (result && 'error' in result) {
        showAppToast({
          type: 'error',
          title: t('common.error'),
          message: t('chatTools.fileTooBig'),
        });
      } else if (result && 'file' in result) {
        setAttachments((prev) => [
          ...prev,
          { type: 'file', uri: result.file.uri, name: result.file.name },
        ]);
      }
      setActiveTool(null);
    })();
  }, [activeTool, t]);

  // Handle voice tool activation
  useEffect(() => {
    if (activeTool !== 'voice') return;

    if (!voiceAvailable) {
      showAppToast({
        type: 'error',
        title: t('chatTools.voice'),
        message: t('chatTools.voiceNotAvailable'),
      });
      setActiveTool(null);
      return;
    }

    void startListening();
    setActiveTool(null);
  }, [activeTool, voiceAvailable, startListening, t]);

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Pulsing animation when listening
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(micPulse, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    micPulse.setValue(1);
  }, [isListening, micPulse]);

  // Seed prompt from navigation params
  useEffect(() => {
    if (seededPromptRef.current) return;
    const initialPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!initialPrompt) return;
    seededPromptRef.current = true;
    startNewChat();
    setTimeout(() => void sendMessage(initialPrompt), 100);
    router.setParams({ prompt: '' });
  }, [prompt, router]);

  // ── Render ──

  const showingList = !activeSessionId;

  return (
    <>
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.page }} edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View className="flex-1" style={{ backgroundColor: isDark ? theme.page : '#F8F7FF' }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 pt-2 pb-4"
          style={{
            backgroundColor: theme.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center gap-3">
            {!showingList && (
              <TouchableOpacity
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: theme.surfaceAlt }}
                onPress={goBackToList}
                activeOpacity={0.7}
              >
                <ArrowLeft size={18} color={theme.textSoft} />
              </TouchableOpacity>
            )}
            {showingList ? (
              <View
                style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentStrong }}
              >
                <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
                  <Sparkles size={20} color={theme.textInverse} />
                </Animated.View>
              </View>
            ) : null}
            <View className="gap-[2px]">
              <Text
                className="font-space-bold text-lg"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {showingList ? t('aiChat.title') : (activeSessionTitle || lessonTitle || t('aiChat.newChat'))}
              </Text>
              {showingList && (
                <View className="flex-row items-center gap-1.5">
                  <View className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: theme.success }} />
                  <Text className="font-space text-xs" style={{ color: theme.textMuted }}>{t('aiChat.alwaysAvailable')}</Text>
                </View>
              )}
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {creditBalance ? (
              <TouchableOpacity
                className="h-9 px-3 rounded-[10px] flex-row items-center gap-1.5"
                style={{ backgroundColor: theme.surfaceAlt }}
                activeOpacity={0.75}
                onPress={creditBalance.availableCredits <= 0 ? showCreditGate : undefined}
              >
                <Sparkles size={14} color={theme.accent} />
                <Text className="font-space-semibold text-xs" style={{ color: theme.textSoft }}>
                  {creditBalance.availableCredits}
                </Text>
              </TouchableOpacity>
            ) : null}
            {showingList ? (
              <TouchableOpacity
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: theme.surfaceAlt }}
                onPress={startNewChat}
                activeOpacity={0.7}
              >
                <Plus size={18} color={theme.accent} />
              </TouchableOpacity>
            ) : (
              activeSessionId && activeSessionId !== '__new__' && (
                <TouchableOpacity
                  className="w-9 h-9 rounded-[10px] items-center justify-center"
                  style={{ backgroundColor: theme.surfaceAlt }}
                  onPress={() => {
                    const session = conversations.find((s) => s.id === activeSessionId);
                    if (session) deleteSession(session);
                  }}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Lesson Progress Bar — shows when in a lesson */}
        {!showingList && lessonId && fromLearn === '1' && (
          <LessonProgressBar
            currentStep={lessonStep}
            totalSteps={4}
            lessonTitle={lessonTitle || activeSessionTitle || prompt?.slice(0, 50)}
          />
        )}

        {/* Body */}
        {showingList ? (
          <ConversationListView
            isDark={isDark}
            conversations={conversations}
            loading={listLoading}
            refreshing={listRefreshing}
            onRefresh={refreshList}
            onLoadMore={loadMoreConversations}
            hasMore={!!listCursor}
            onSelect={openSession}
            onDelete={deleteSession}
            onNewChat={startNewChat}
            onQuickTopic={(p) => { startNewChat(); setTimeout(() => void sendMessage(p), 300); }}
            t={t}
            language={language}
          />
        ) : (
          <>
            {/* Chat Messages */}
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerStyle={[
                { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
                messages.length === 0 && !messagesLoading ? { flexGrow: 1 } : {},
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {messagesLoading ? (
                <View className="py-2">
                  <SkeletonLoader variant="avatarText" count={5} />
                </View>
              ) : messages.length === 0 ? (
                lessonId && lessonTitle ? (
                <View className="flex-1 items-center pt-6 pb-2">
                  <View className="mb-4">
                    <View style={{ width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSoft }}>
                      <BookOpen size={40} color={theme.accent} />
                    </View>
                  </View>
                  <Text className="font-space-bold text-xl text-center mb-2.5" style={{ color: theme.text }}>{lessonTitle}</Text>
                  <Text className="font-space text-sm text-center leading-[22px] mb-6 px-2" style={{ color: theme.textMuted }}>
                    {language === 'bn' ? 'এই পাঠ শুরু করতে নিচের যেকোনো একটি ট্যাপ করো' : 'Tap any option below to start this lesson'}
                  </Text>
                  {[
                    { label: language === 'bn' ? `${lessonTitle} শেখাও` : `Teach me ${lessonTitle}`, icon: Lightbulb, bg: '#FBBF2420', color: '#F59E0B' },
                    { label: language === 'bn' ? 'ধাপে ধাপে ব্যাখ্যা করো' : 'Explain step by step', icon: BookOpen, bg: '#3B82F620', color: '#3B82F6' },
                    { label: language === 'bn' ? 'অনুশীলনের প্রশ্ন দাও' : 'Give me practice questions', icon: Sparkles, bg: '#7C3AED20', color: '#7C3AED' },
                  ].map(({ label, icon: Icon, bg, color }) => (
                    <TouchableOpacity
                      key={label}
                      className="flex-row items-center self-stretch gap-3 py-2.5 px-3.5 rounded-[14px] mb-2 border"
                      style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                      activeOpacity={0.75}
                      onPress={() => void sendMessage(label)}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={color} />
                      </View>
                      <Text className="font-space-medium text-sm" style={{ color: theme.textSoft }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                ) : (
                <View className="flex-1 items-center pt-6 pb-2">
                  <View className="mb-4">
                    <View
                      style={{ width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSoft }}
                    >
                      <Sparkles size={40} color={theme.accent} />
                    </View>
                  </View>
                  <Text className="font-space-bold text-xl text-center mb-2.5" style={{ color: theme.text }}>{t('aiChat.emptyTitle')}</Text>
                  <Text className="font-space text-sm text-center leading-[22px] mb-6 px-2" style={{ color: theme.textMuted }}>
                    {t('aiChat.emptyBody')}
                  </Text>
                  <Text className="font-space-semibold text-sm self-start mb-2.5" style={{ color: theme.textSoft }}>{t('aiChat.suggestedTopics')}</Text>
                  {SUGGESTED_TOPICS.map(({ labelKey, Icon, iconBg, iconBgDark, iconColor }) => (
                    <TouchableOpacity
                      key={labelKey}
                      className="flex-row items-center self-stretch gap-3 py-2.5 px-3.5 rounded-[14px] mb-2 border"
                      style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                      activeOpacity={0.75}
                      onPress={() => void sendMessage(t(labelKey))}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: isDark ? iconBgDark : iconBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={iconColor} />
                      </View>
                      <Text className="font-space-medium text-sm" style={{ color: theme.textSoft }}>{t(labelKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                )
              ) : (
                <>
                  {loadingOlder && (
                    <View className="py-3">
                      <SkeletonLoader variant="avatarText" count={2} />
                    </View>
                  )}
                  {messages.map((msg) => (
                    <View key={msg.id}>
                      {msg.role === 'user' ? (
                        <View className="flex-row justify-end mb-3.5">
                          <View
                            className="rounded-2xl px-4 py-3 max-w-[82%]"
                            style={{
                              borderBottomRightRadius: 6,
                              backgroundColor: theme.accent,
                              shadowColor: theme.accent,
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.2,
                              shadowRadius: 6,
                              elevation: 3,
                            }}
                          >
                            <Text className="font-space text-sm text-white leading-[22px]">{msg.text}</Text>
                          </View>
                        </View>
                      ) : (
                        <View className="mb-5">
                          <View className="flex-row items-start gap-2.5">
                            <View
                              className="w-8 h-8 rounded-full items-center justify-center mt-1 shrink-0"
                              style={{
                                backgroundColor: theme.accentSoft,
                                borderWidth: 1.5,
                                borderColor: theme.accent + '30',
                              }}
                            >
                              <Sparkles size={14} color={theme.accent} />
                            </View>
                            <View
                              className="rounded-2xl px-4 py-3 flex-1"
                              style={{
                                borderBottomLeftRadius: 6,
                                backgroundColor: theme.surface,
                                borderLeftWidth: 3,
                                borderLeftColor: theme.accent + '40',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.04,
                                shadowRadius: 4,
                                elevation: 1,
                              }}
                            >
                              <FormattedText
                                text={msg.text}
                                style={{ color: theme.text }}
                                accentColor={theme.accent}
                              />
                            </View>
                          </View>
                          <TouchableOpacity
                            className="flex-row items-center gap-1.5 self-start ml-[42px] mt-2 py-1 px-2.5 rounded-full"
                            style={{
                              backgroundColor: theme.accentSoft,
                            }}
                            activeOpacity={0.7}
                            onPress={() => void handleCopy(msg.id, msg.text)}
                          >
                            {copiedId === msg.id ? <Check size={12} color={theme.success} /> : <Copy size={12} color={theme.accent} />}
                            <Text className="font-space-medium text-[11px]" style={{ color: copiedId === msg.id ? theme.success : theme.accent }}>
                              {copiedId === msg.id ? t('common.copied') : t('common.copy')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                  {conceptSummary && !isTyping && (
                    <ConceptSummaryCard
                      title={conceptSummary.title}
                      concepts={conceptSummary.concepts}
                      formula={conceptSummary.formula}
                    />
                  )}
                  {isTyping ? <TypingIndicator isDark={isDark} /> : null}
                </>
              )}
            </ScrollView>

            {/* Follow-up Suggestions */}
            {followUpSuggestions.length > 0 && !isTyping && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6, gap: 6, alignItems: 'center' }}
                style={{ maxHeight: 44 }}
              >
                {followUpSuggestions.map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.75}
                    onPress={() => void sendMessage(suggestion)}
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      height: 34,
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.accent + '25',
                      shadowColor: theme.accent,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text className="font-space-medium text-[12px]" numberOfLines={1} style={{ color: theme.accent }}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Quick Tool Shortcuts — always visible */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 4, gap: 5, alignItems: 'center' }}
              style={{ backgroundColor: theme.surface, borderTopWidth: 1, borderColor: theme.border, maxHeight: 36 }}
            >
              {/* Notebook opens a full screen, so it navigates rather than
                  going through handleToolSelect like the in-composer tools. */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/notebook')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: theme.surfaceAlt,
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  height: 28,
                }}
              >
                <Text style={{ fontSize: 12 }}>📓</Text>
                <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'SpaceGrotesk_500Medium' }}>
                  {t('chatTools.notebook')}
                </Text>
              </TouchableOpacity>
              {([
                { type: 'camera' as const, icon: '📷', label: t('chatTools.camera') },
                { type: 'equation' as const, icon: '∑', label: t('chatTools.equation') },
                { type: 'calculator' as const, icon: '🧮', label: t('chatTools.calculator') },
                { type: 'drawing' as const, icon: '✏️', label: t('chatTools.drawing') },
                { type: 'file' as const, icon: '📎', label: t('chatTools.file') },
                { type: 'voice' as const, icon: '🎙️', label: 'ভয়েস' },
              ] as const).map((tool) => (
                <TouchableOpacity
                  key={tool.type}
                  activeOpacity={0.7}
                  onPress={() => handleToolSelect(tool.type)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: theme.surfaceAlt,
                    borderRadius: 14,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    height: 28,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{tool.icon}</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'SpaceGrotesk_500Medium' }}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Full Tool Grid — toggles with + button */}
            <ToolGrid visible={toolGridVisible} onSelectTool={handleToolSelect} />

            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <AttachmentPreview
                attachments={attachments}
                onRemove={(index) => setAttachments(prev => prev.filter((_, i) => i !== index))}
              />
            )}

            {/* Input Bar */}
            <View
              className="px-4 pt-3 pb-3"
              style={{
                backgroundColor: theme.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {errorMessage ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 10, marginBottom: 8, gap: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text className="font-space text-xs flex-1" style={{ color: '#991B1B' }}>{errorMessage}</Text>
                  {lastFailedMessage ? (
                    <TouchableOpacity
                      onPress={() => {
                        const retryText = lastFailedMessage;
                        setErrorMessage(null);
                        setLastFailedMessage(null);
                        // Remove the failed user bubble so retry doesn't duplicate it
                        setMessages((prev) => {
                          const lastUserIdx = [...prev].reverse().findIndex(
                            (m) => m.role === 'user' && m.text === retryText,
                          );
                          if (lastUserIdx === -1) return prev;
                          const idx = prev.length - 1 - lastUserIdx;
                          return prev.filter((_, i) => i !== idx);
                        });
                        void sendMessage(retryText);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 }}
                    >
                      <RefreshCw size={12} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold' }}>
                        {language === 'bn' ? 'আবার' : 'Retry'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setErrorMessage(null)}>
                      <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
              <View className="flex-row items-end gap-2.5 rounded-2xl border px-3.5 py-2" style={{ backgroundColor: theme.page, borderColor: theme.border }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={toggleToolGrid}
                >
                  <Animated.View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: theme.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [{ rotate: plusRotateInterpolation }],
                    }}
                  >
                    <Plus size={18} color={theme.accent} />
                  </Animated.View>
                </TouchableOpacity>
                <TextInput
                  className="flex-1 min-h-[44px] max-h-[120px] font-space text-sm leading-[20px] py-2"
                  style={{ color: theme.text }}
                  value={input}
                  onChangeText={setInput}
                  placeholder={t('aiChat.inputPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  maxLength={500}
                  onSubmitEditing={() => void sendMessage(input)}
                  returnKeyType="send"
                  onFocus={() => {
                    if (toolGridVisible) {
                      setToolGridVisible(false);
                      Animated.spring(plusRotation, {
                        toValue: 0,
                        useNativeDriver: true,
                      }).start();
                    }
                  }}
                />
                {isListening ? (
                  <TouchableOpacity activeOpacity={0.8} onPress={stopListening}>
                    <Animated.View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.danger,
                        transform: [{ scale: micPulse }],
                      }}
                    >
                      <Mic size={18} color={theme.textInverse} />
                    </Animated.View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={(input.trim() || attachments.length > 0) ? 0.8 : 1}
                    onPress={() => void sendMessage(input)}
                    disabled={(!input.trim() && attachments.length === 0) || isTyping}
                  >
                    <View
                      style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: (input.trim() || attachments.length > 0) && creditBalance?.availableCredits !== 0 ? theme.accentStrong : theme.accentDisabled }}
                    >
                      <Send size={18} color={theme.textInverse} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Calculator Tool */}
            <CalculatorSheet
              visible={activeTool === 'calculator'}
              onClose={() => setActiveTool(null)}
              onInsert={(text) => {
                setInput((prev) => prev + text);
                setActiveTool(null);
              }}
            />

            {/* Drawing Tool — only mount when active to avoid Suspense fallback flash */}
            {activeTool === 'drawing' && (
              <DrawingCanvas
                visible
                onClose={() => setActiveTool(null)}
                onSend={(uri: string) => {
                  setAttachments((prev) => [
                    ...prev,
                    { type: 'drawing', uri, name: 'drawing.png' },
                  ]);
                  setActiveTool(null);
                }}
              />
            )}

            {/* Equation Editor */}
            <EquationEditor
              visible={activeTool === 'equation'}
              onClose={() => setActiveTool(null)}
              onInsert={(latex) => {
                setInput((prev) => (prev ? prev + ' ' + latex : latex));
                setActiveTool(null);
              }}
            />
          </>
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>

    <ProPaywall
      visible={showProPaywall}
      onClose={() => setShowProPaywall(false)}
      onSubscribe={(plan) => {
        // STUB: /subscription removed (no payments backend) — paywall just closes.
        setShowProPaywall(false);
      }}
    />
    </>
  );
}
