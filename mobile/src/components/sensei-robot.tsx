import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  Ellipse,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size?: number;
  primary?: string;
  accent?: string;
  glow?: string;
};

const SenseiRobotImpl: React.FC<Props> = ({
  size = 200,
  primary = '#6366F1',
  accent = '#22D3EE',
  glow = '#1e1b4b',
}) => {
  const float = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const antenna = useSharedValue(0.6);
  const wave = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(-0.04, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.04, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    blink.value = withRepeat(
      withSequence(
        withDelay(2400, withTiming(0.05, { duration: 90 })),
        withTiming(1, { duration: 120 }),
        withTiming(0.05, { duration: 90 }),
        withTiming(1, { duration: 120 }),
      ),
      -1,
      false,
    );
    antenna.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    wave.value = withSequence(
      withTiming(-2.4, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(-2.0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withTiming(-2.5, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withTiming(-2.0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withTiming(-2.5, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withDelay(180, withTiming(0, { duration: 460, easing: Easing.inOut(Easing.cubic) })),
    );

    return () => {
      cancelAnimation(float);
      cancelAnimation(tilt);
      cancelAnimation(blink);
      cancelAnimation(antenna);
      cancelAnimation(wave);
    };
  }, []);

  const robotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value },
      { rotate: `${tilt.value}rad` },
    ],
  }));

  const leftEyeProps = useAnimatedProps(() => ({ ry: 6 * blink.value }));
  const rightEyeProps = useAnimatedProps(() => ({ ry: 6 * blink.value }));

  const antennaBulbProps = useAnimatedProps(() => ({
    r: interpolate(antenna.value, [0.5, 1], [4, 6]),
    opacity: interpolate(antenna.value, [0.5, 1], [0.7, 1]),
  }));
  const antennaGlowProps = useAnimatedProps(() => ({
    r: interpolate(antenna.value, [0.5, 1], [10, 14]),
    opacity: interpolate(antenna.value, [0.5, 1], [0.15, 0.4]),
  }));

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wave.value}rad` }],
  }));

  const armWidth = size * 0.16;
  const armHeight = size * 0.34;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={[{ width: size, height: size }, robotStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          <Defs>
            <LinearGradient id="body" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={primary} stopOpacity="1" />
              <Stop offset="1" stopColor={primary} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="bodyShade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.12" />
            </LinearGradient>
            <LinearGradient id="head" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#E2E8F0" stopOpacity="1" />
              <Stop offset="1" stopColor="#E2E8F0" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="headShade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.1" />
            </LinearGradient>
            <RadialGradient id="face" cx="0.5" cy="0.4" r="0.7">
              <Stop offset="0" stopColor="#0F172A" stopOpacity="1" />
              <Stop offset="1" stopColor="#0F172A" stopOpacity="1" />
            </RadialGradient>
            <LinearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0F172A" stopOpacity="1" />
              <Stop offset="1" stopColor="#0F172A" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="arm" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={primary} stopOpacity="1" />
              <Stop offset="1" stopColor={primary} stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="hand" cx="0.35" cy="0.3" r="0.7">
              <Stop offset="0" stopColor="#E2E8F0" stopOpacity="1" />
              <Stop offset="1" stopColor="#E2E8F0" stopOpacity="1" />
            </RadialGradient>
            <LinearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#475569" stopOpacity="1" />
              <Stop offset="1" stopColor="#475569" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="pole" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={primary} stopOpacity="1" />
              <Stop offset="1" stopColor={primary} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Ground shadow */}
          <Ellipse cx="100" cy="190" rx="52" ry="6" fill="#000" opacity="0.22" />
          <Ellipse cx="100" cy="190" rx="34" ry="3" fill="#000" opacity="0.18" />

          {/* Antenna pole */}
          <Rect x="96" y="28" width="8" height="16" rx="3" fill="url(#pole)" />
          <AnimatedCircle cx="100" cy="22" fill={glow} animatedProps={antennaGlowProps} />
          <AnimatedCircle cx="100" cy="22" fill={accent} animatedProps={antennaBulbProps} />
          <Circle cx="98" cy="20" r="1.2" fill="#ffffff" opacity="0.9" />

          {/* Left arm (static, resting) */}
          <Rect x="40" y="116" width="14" height="42" rx="6" fill="url(#arm)" />
          <Circle cx="47" cy="164" r="10" fill="url(#hand)" />
          <Circle cx="44" cy="161" r="2.5" fill="#ffffff" opacity="0.6" />

          {/* Body */}
          <Rect x="52" y="112" width="96" height="64" rx="20" fill="url(#body)" />
          <Rect x="52" y="112" width="96" height="64" rx="20" fill="url(#bodyShade)" />
          <Path
            d="M62 116 Q100 110 138 116 L138 122 Q100 118 62 122 Z"
            fill="#ffffff"
            opacity="0.28"
          />
          <Rect x="72" y="128" width="56" height="34" rx="10" fill="url(#screen)" />
          <Rect x="72" y="128" width="56" height="6" rx="3" fill="#ffffff" opacity="0.08" />
          <Circle cx="100" cy="145" r="10" fill={accent} opacity="0.18" />
          <Circle cx="100" cy="145" r="6" fill={accent} opacity="0.5" />
          <Circle cx="100" cy="145" r="2.5" fill="#ffffff" />

          {/* Neck */}
          <Rect x="88" y="100" width="24" height="14" rx="5" fill="#94A3B8" />
          <Rect x="88" y="100" width="24" height="4" rx="2" fill="#ffffff" opacity="0.45" />

          {/* Head */}
          <Rect x="44" y="46" width="112" height="62" rx="24" fill="url(#head)" />
          <Rect x="44" y="46" width="112" height="62" rx="24" fill="url(#headShade)" />
          <Path
            d="M58 50 Q100 44 142 50 L142 56 Q100 50 58 56 Z"
            fill="#ffffff"
            opacity="0.6"
          />
          <Rect x="56" y="60" width="88" height="40" rx="18" fill="url(#face)" />
          <Rect x="58" y="62" width="84" height="6" rx="3" fill="#334155" opacity="0.5" />

          {/* Cheeks */}
          <Circle cx="62" cy="88" r="4" fill={accent} opacity="0.7" />
          <Circle cx="138" cy="88" r="4" fill={accent} opacity="0.7" />

          {/* Eyes (animated blink via ry) */}
          <AnimatedEllipse
            cx="84"
            cy="80"
            rx="6"
            fill={accent}
            animatedProps={leftEyeProps}
          />
          <AnimatedEllipse
            cx="116"
            cy="80"
            rx="6"
            fill={accent}
            animatedProps={rightEyeProps}
          />
          <Circle cx="86" cy="78" r="1.6" fill="#ffffff" opacity="0.9" />
          <Circle cx="118" cy="78" r="1.6" fill="#ffffff" opacity="0.9" />

          {/* Mouth */}
          <Path
            d="M88 92 Q100 99 112 92"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Feet */}
          <Rect x="66" y="172" width="24" height="12" rx="5" fill="url(#foot)" />
          <Rect x="110" y="172" width="24" height="12" rx="5" fill="url(#foot)" />
          <Rect x="68" y="173" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.25" />
          <Rect x="112" y="173" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.25" />
        </Svg>

        {/* Right arm — rotates around the shoulder (top-left of this wrapper)
            so it can lift and wave hello cleanly. */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: size * 0.58,
              left: size * 0.745,
              width: armWidth,
              height: armHeight,
              transformOrigin: 'top left',
            },
            armStyle,
          ]}
        >
          <Svg
            width={armWidth}
            height={armHeight}
            viewBox="0 0 24 64"
            fill="none"
          >
            <Defs>
              <LinearGradient id="arm2" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={primary} stopOpacity="1" />
                <Stop offset="1" stopColor={primary} stopOpacity="1" />
              </LinearGradient>
              <RadialGradient id="hand2" cx="0.35" cy="0.3" r="0.7">
                <Stop offset="0" stopColor="#E2E8F0" stopOpacity="1" />
                <Stop offset="1" stopColor="#E2E8F0" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="14" height="44" rx="6" fill="url(#arm2)" />
            <Circle cx="7" cy="50" r="10" fill="url(#hand2)" />
            <Circle cx="4" cy="47" r="2.5" fill="#ffffff" opacity="0.7" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export const SenseiRobot = memo(SenseiRobotImpl);
