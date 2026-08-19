import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Eye, Pause, Play, Trash2 } from 'lucide-react-native';

import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { showAppDialog } from '@/feedback/dialog';
import { showAppToast } from '@/feedback/toast';
import {
  attemptsFor,
  deleteAttempt,
  getAttempt,
  listAttempts,
  onAttemptsChange,
  summarize,
  type Attempt,
} from '@/lib/attempts';
import { buildFrames, contactSheet, contactSheetPrompt, stamp } from '@/lib/replay';
import { strokePath } from '@/lib/strokes';
import { coachWork } from '@/api/sensei-work';
import { observe, reportAttempt } from '@/lib/observe';

/**
 * Watching a session back.
 *
 * The list is scoped by problem rather than being one long tape of the day,
 * because "your three goes at the friction question" is a thing a student or a
 * teacher can actually read. Opening one redraws the work from its event log —
 * no video was ever recorded — and "Ask Sensei" tiles the turning points into a
 * contact sheet for the two-stage vision coach, which is the only way the tutor
 * gets to comment on *how* the work developed rather than where it ended up.
 */

const PLAY_MS = 850;

/**
 * Redrawing needs Skia's native module, which Expo Go does not carry. The rest
 * of the screen — the history, the timeline, deleting — works regardless, so
 * only the canvas is replaced rather than the whole screen failing.
 */
class SkiaBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function CanvasUnavailable({
  theme,
  label,
}: {
  theme: ReturnType<typeof useAppTheme>;
  label: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: theme.textMuted, textAlign: 'center', lineHeight: 20 }}>{label}</Text>
    </View>
  );
}

export default function ReplayScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [openId, setOpenId] = useState<string | null>(params.id ?? null);

  return openId ? (
    <ReplayDetail id={openId} onBack={() => setOpenId(null)} />
  ) : (
    <ReplayList onOpen={setOpenId} />
  );
}

// ------------------------------------------------------------------ list ----

function ReplayList({ onOpen }: { onOpen: (id: string) => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<Attempt[]>(() => listAttempts());

  useEffect(() => onAttemptsChange(() => setItems(listAttempts())), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>
          {t('replay.title')}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ textAlign: 'center', color: theme.textMuted, lineHeight: 21 }}>
            {t('replay.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          {items.map((a) => {
            const strokes = a.events.filter((e) => e.type === 'sketch.shape').length;
            return (
              <Pressable
                key={a.id}
                onPress={() => onOpen(a.id)}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 14,
                }}
              >
                <Text numberOfLines={1} style={{ fontWeight: '600', color: theme.text }}>
                  {a.problemTitle || t('replay.untitled')}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12.5, color: theme.textMuted }}>
                  {t('replay.meta', {
                    events: String(a.events.length),
                    strokes: String(strokes),
                  })}
                  {a.outcome ? ` · ${t(`replay.outcome.${a.outcome}`)}` : ''}
                  {a.closedAt ? '' : ` · ${t('replay.open')}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- detail ----

function ReplayDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t, language } = useI18n();

  const attempt = useMemo(() => getAttempt(id), [id]);
  const frames = useMemo(() => buildFrames(attempt?.events ?? []), [attempt]);

  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [asking, setAsking] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frame = frames[Math.min(i, frames.length - 1)] ?? null;

  // Step forward on a timer while playing, stopping at the end rather than
  // looping — a replay that restarts silently is disorienting.
  useEffect(() => {
    if (!playing) return;
    if (i >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setI((n) => n + 1), PLAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, i, frames.length]);

  /** Drag anywhere on the track to scrub. */
  const scrub = Gesture.Pan()
    .onBegin(() => setPlaying(false))
    .onUpdate((e) => {
      if (!size.w || frames.length < 2) return;
      const ratio = Math.max(0, Math.min(1, e.x / size.w));
      setI(Math.round(ratio * (frames.length - 1)));
    });

  const askSensei = useCallback(async () => {
    if (!attempt || asking) return;
    setAsking(true);
    setVerdict(null);
    let sheet: ReturnType<typeof contactSheet> = null;
    try {
      sheet = contactSheet(frames);
    } catch {
      // Skia has no native module here (Expo Go). Say so rather than dying.
      setVerdict(t('replay.needsDevBuild'));
      setAsking(false);
      return;
    }
    if (!sheet) {
      showAppToast({ message: t('replay.nothingDrawn'), type: 'info' });
      setAsking(false);
      return;
    }
    observe('coach.ask', { from: 'replay', attempt: attempt.id });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const r = await coachWork(
        sheet.image,
        contactSheetPrompt(sheet.captions, attempt.problemText || attempt.problemTitle),
        language,
      );
      if (r.coach) {
        observe('coach.reply', { status: r.coach.status, from: 'replay' });
        setVerdict([r.coach.hint, r.coach.question].filter(Boolean).join('\n\n'));
      } else {
        // No vision model loaded server-side. Say so plainly rather than
        // pretending the work was read.
        setVerdict(r.reason ?? t('replay.noVision'));
      }
    } catch {
      setVerdict(t('replay.askFailed'));
    } finally {
      setAsking(false);
    }
  }, [attempt, asking, frames, language, t]);

  const remove = useCallback(() => {
    showAppDialog({
      title: t('replay.deleteTitle'),
      message: t('replay.deleteBody'),
      actions: [
        { label: t('chatTools.close'), variant: 'cancel' },
        {
          label: t('replay.delete'),
          variant: 'destructive',
          onPress: () => {
            deleteAttempt(id);
            onBack();
          },
        },
      ],
    });
  }, [id, onBack, t]);

  // The one-row account of this sitting goes to the dataset when it is opened
  // for review, which is the point at which it is certainly finished.
  useEffect(() => {
    if (!attempt) return;
    const no = attemptsFor(attempt.problemKey).findIndex((a) => a.id === attempt.id) + 1;
    reportAttempt(summarize(attempt, no || 1));
  }, [attempt]);

  if (!attempt || !frames.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: theme.textMuted, textAlign: 'center' }}>{t('replay.empty')}</Text>
          <Pressable onPress={onBack} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.accent, fontWeight: '600' }}>{t('chatTools.close')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const progress = frames.length < 2 ? 1 : i / (frames.length - 1);
  const scale = frame ? Math.min(size.w / frame.source.w, size.h / frame.source.h) || 1 : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={onBack} hitSlop={10}>
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, fontWeight: '700', color: theme.text }}>
          {attempt.problemTitle || t('replay.untitled')}
        </Text>
        <Pressable onPress={remove} hitSlop={10}>
          <Trash2 size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* The work, redrawn at this instant */}
      <View
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{
          marginHorizontal: 14,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: theme.border,
          aspectRatio: 3 / 4,
        }}
      >
        <SkiaBoundary fallback={<CanvasUnavailable theme={theme} label={t('replay.needsDevBuild')} />}>
          <Canvas style={{ flex: 1 }}>
            {(frame?.strokes ?? []).map((s, n) => (
              <Path
                key={n}
                path={strokePath(s, scale)}
                color={s.tool === 'eraser' ? '#FFFFFF' : s.color}
                style="stroke"
                strokeWidth={Math.max(1, s.width * scale)}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
        </SkiaBoundary>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
        <Text style={{ fontSize: 12.5, color: theme.textMuted }}>
          {stamp(frame?.at ?? 0)} · {frame?.label} · {i + 1}/{frames.length}
        </Text>

        {/* Scrub track */}
        <GestureDetector gesture={scrub}>
          <View style={{ paddingVertical: 12 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceAlt }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${progress * 100}%`,
                  backgroundColor: theme.accent,
                }}
              />
            </View>
          </View>
        </GestureDetector>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => {
              if (i >= frames.length - 1) setI(0);
              setPlaying((p) => !p);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.accent,
            }}
          >
            {playing ? (
              <Pause size={18} color={theme.textInverse} />
            ) : (
              <Play size={18} color={theme.textInverse} />
            )}
          </Pressable>

          <Pressable
            onPress={askSensei}
            disabled={asking}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 22,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              opacity: asking ? 0.6 : 1,
            }}
          >
            {asking ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Eye size={17} color={theme.accent} />
            )}
            <Text style={{ fontWeight: '600', color: theme.text }}>
              {asking ? t('replay.reading') : t('replay.ask')}
            </Text>
          </Pressable>
        </View>
      </View>

      {verdict ? (
        <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ padding: 14 }}>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
            }}
          >
            <Text style={{ color: theme.text, lineHeight: 21 }}>{verdict}</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/ai-chat')}
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: theme.accent, fontWeight: '600' }}>{t('replay.continue')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
