import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Camera, History, MessageCircle } from 'lucide-react-native';

import { SenseiOwl } from '@/components/art/sensei-owl';
import { BottomSheet } from '@/components/bottom-sheet';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { showAppToast } from '@/feedback/toast';
import { pickImage } from '@/components/chat-tools';
import { coachWork } from '@/api/sensei-work';
import { toDataUri } from '@/lib/image';
import { observe } from '@/lib/observe';

/**
 * Sensei as a presence, not a tab.
 *
 * The web client's owl follows the cursor around and wanders off to point at
 * features. Almost none of that survives the trip to a phone: there is no
 * cursor to follow, and a 390pt-wide screen has no margin for a character to
 * roam in — it would be standing on the work. What ports is the part that
 * mattered: something always within thumb reach that will look at what you are
 * doing.
 *
 * So the phone owl is deliberately calmer. It sits where you leave it, snaps to
 * whichever edge is nearer so it never covers the middle of the page, and
 * pulses when the tutor has been working. Its first action is the camera,
 * because on a phone the fastest path from "stuck" to "being taught" is
 * photographing the page — which is the one thing the laptop cannot do well.
 */

const POS_KEY = 'dikkha_owl_pos';
const SIZE = 58;
const MARGIN = 12;

/** Screens where a floating tutor is redundant or in the way. */
const HIDDEN_ON = ['/ai-chat', '/welcome-onboarding', '/choose-language', '/replay', '/notebook'];

export function FloatingSensei() {
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const win = Dimensions.get('window');
  const x = useSharedValue(win.width - SIZE - MARGIN);
  const y = useSharedValue(win.height * 0.62);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Restore where it was left. Until that resolves it stays hidden, so it does
  // not visibly jump from the default corner to the remembered one.
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(POS_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { x: number; y: number };
          // Clamped on read: the phone may have been rotated, or this may be a
          // different device, and a remembered position can land off-screen.
          x.value = Math.min(Math.max(MARGIN, saved.x), win.width - SIZE - MARGIN);
          y.value = Math.min(Math.max(MARGIN * 6, saved.y), win.height - SIZE - MARGIN * 8);
        }
      } catch {
        /* defaults are fine */
      }
      setReady(true);
    })();
  }, [win.height, win.width, x, y]);

  const persist = useCallback((nx: number, ny: number) => {
    void AsyncStorage.setItem(POS_KEY, JSON.stringify({ x: nx, y: ny })).catch(() => undefined);
  }, []);

  const drag = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
      scale.value = withSpring(1.08);
    })
    .onUpdate((e) => {
      x.value = startX.value + e.translationX;
      y.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      // Snap to the nearer edge. A floating button loose in the middle of a
      // phone screen covers content wherever it lands.
      const toLeft = x.value + SIZE / 2 < win.width / 2;
      const nx = toLeft ? MARGIN : win.width - SIZE - MARGIN;
      const ny = Math.min(Math.max(MARGIN * 6, y.value), win.height - SIZE - MARGIN * 8);
      x.value = withSpring(nx, { damping: 18 });
      y.value = withSpring(ny, { damping: 18 });
      scale.value = withSpring(1);
      runOnJS(persist)(nx, ny);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(setOpen)(true);
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  /** A double pulse while the tutor is reading, so waiting has a heartbeat. */
  useEffect(() => {
    if (!busy) {
      scale.value = withSpring(1);
      return;
    }
    scale.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 420 }), withTiming(1, { duration: 420 })),
      -1,
      false,
    );
  }, [busy, scale]);

  /**
   * Photograph the work and get a question back. The two-stage coach reads the
   * page first, so what comes back is a question about *this* page rather than
   * a general answer.
   */
  const lookAtMyWork = useCallback(async () => {
    setOpen(false);
    const shot = await pickImage('camera');
    if (!shot) return;

    setBusy(true);
    observe('coach.ask', { from: 'owl' });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const image = await toDataUri(shot.uri);
      const result = await coachWork(image, undefined, language);
      if (result.coach) {
        observe('coach.reply', { status: result.coach.status, from: 'owl' });
        showAppToast({
          type: 'info',
          title: result.coach.hint,
          message: result.coach.question,
          duration: 9000,
        });
      } else {
        showAppToast({ type: 'info', message: result.reason ?? t('coach.noVision') });
      }
    } catch {
      showAppToast({ type: 'error', message: t('coach.failed') });
    } finally {
      setBusy(false);
    }
  }, [language, t]);

  if (!ready || HIDDEN_ON.some((p) => pathname?.includes(p))) return null;

  return (
    <>
      <GestureDetector gesture={Gesture.Exclusive(drag, tap)}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: SIZE,
              height: SIZE,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            },
            style,
          ]}
        >
          <SenseiOwl size={SIZE} />
        </Animated.View>
      </GestureDetector>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ padding: 18, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
            {t('owl.title')}
          </Text>

          <OwlAction
            icon={<Camera size={19} color={theme.accent} />}
            label={t('owl.lookAtWork')}
            hint={t('owl.lookAtWorkHint')}
            onPress={() => void lookAtMyWork()}
            theme={theme}
          />
          <OwlAction
            icon={<History size={19} color={theme.accent} />}
            label={t('replay.title')}
            hint={t('owl.replayHint')}
            onPress={() => {
              setOpen(false);
              router.push('/replay');
            }}
            theme={theme}
          />
          <OwlAction
            icon={<MessageCircle size={19} color={theme.accent} />}
            label={t('owl.ask')}
            hint={t('owl.askHint')}
            onPress={() => {
              setOpen(false);
              router.push('/(tabs)/ai-chat');
            }}
            theme={theme}
          />
        </View>
      </BottomSheet>
    </>
  );
}

function OwlAction({
  icon,
  label,
  hint,
  onPress,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: theme.surfaceAlt,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.accentSoft,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: theme.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>{hint}</Text>
      </View>
    </Pressable>
  );
}
