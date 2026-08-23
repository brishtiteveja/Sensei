import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { SENSEI_GRADIENT } from '@/theme/gradient';

/**
 * The moment a student gets one right.
 *
 * Ported in spirit rather than in code: the web version is CSS keyframes on
 * absolutely-positioned spans, none of which survives the trip. Same idea
 * though — two rings expanding out of the answer and a ring of rays firing
 * once, in the product's own colours rather than generic confetti.
 *
 * It fires on mount and ends invisible, so the parent can mount it on a correct
 * answer and forget about it. Nothing here is interactive and nothing is
 * announced: the result is already stated in text next to it, and a screen
 * reader repeating a decoration is noise.
 */

const RAYS = 12;
const RING_MS = 620;
const RAY_MS = 520;

export function CorrectBurst({ size = 180 }: { size?: number }) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ring size={size} delay={0} color={SENSEI_GRADIENT[0]} />
      <Ring size={size} delay={90} color={SENSEI_GRADIENT[2]} />
      {Array.from({ length: RAYS }, (_, i) => (
        <Ray key={i} index={i} size={size} />
      ))}
    </View>
  );
}

function Ring({ size, delay, color }: { size: number; delay: number; color: string }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.quad) }));
  }, [delay, p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.25 + p.value * 0.9 }],
    // Fades as it grows, so the ring reads as dissipating rather than vanishing.
    opacity: (1 - p.value) * 0.55,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

function Ray({ index, size }: { index: number; size: number }) {
  const p = useSharedValue(0);
  const angle = (360 / RAYS) * index;
  // Alternating hues, so the ring of rays carries the gradient rather than one flat colour.
  const color = SENSEI_GRADIENT[index % SENSEI_GRADIENT.length];

  useEffect(() => {
    p.value = withDelay(
      (index % 3) * 40,
      withTiming(1, { duration: RAY_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, p]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.9,
    transform: [
      { rotate: `${angle}deg` },
      // Travels outward from just off-centre to the rim.
      { translateY: -(size * 0.18 + p.value * size * 0.3) },
      { scaleY: 0.6 + p.value * 0.8 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 4,
          height: 16,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
