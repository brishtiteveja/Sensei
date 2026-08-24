import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/contexts/theme-context';

/**
 * The background stack: three colour washes, a dot mesh, and some loose
 * geometry drifting behind the content.
 *
 * This is what makes the web app read as tinted paper in light mode and deep
 * space in dark, rather than as a white rectangle with widgets on it. The
 * phone had nothing equivalent, which is most of why the two apps looked like
 * different products even after the palette matched.
 *
 * Softness is radial gradients, not blur — same reasoning as the web: a blur
 * is a per-frame cost on a scrolling screen, a gradient is one cheap paint.
 * Nothing here animates. On the web the shapes drift on a CSS keyframe; on a
 * phone that would mean a permanently-running Reanimated loop behind every
 * screen, which is a real battery cost for something nobody looks at directly.
 *
 * Decorative throughout: no touch handling, and invisible to a screen reader.
 */

const WASHES = [
  { cx: 0.16, cy: 0.1, r: 0.62, color: '#6366F1' },
  { cx: 0.92, cy: 0.3, r: 0.55, color: '#C026D3' },
  { cx: 0.5, cy: 0.95, r: 0.6, color: '#14B8A6' },
];

export function Aurora() {
  const { isDark } = useTheme();
  // Light mode wants a whisper; a dark page can take real colour before the
  // text on top of it starts to suffer.
  const washAlpha = isDark ? [0.3, 0.24, 0.2] : [0.16, 0.12, 0.1];
  const line = isDark ? '#8B5CF6' : '#6366F1';
  const shapeAlpha = isDark ? 0.32 : 0.18;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <Defs>
          {WASHES.map((w, i) => (
            <RadialGradient key={i} id={`wash${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={w.color} stopOpacity={washAlpha[i]} />
              <Stop offset="100%" stopColor={w.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>

        {WASHES.map((w, i) => (
          <Ellipse
            key={i}
            cx={w.cx * 390}
            cy={w.cy * 844}
            rx={w.r * 390}
            ry={w.r * 420}
            fill={`url(#wash${i})`}
          />
        ))}

        {/* Loose geometry — an orbit, a triangle, a plus grid, a wave. Few
            nodes on purpose; this sits behind everything on every screen. */}
        <G opacity={shapeAlpha}>
          <Ellipse
            cx={300}
            cy={130}
            rx={78}
            ry={32}
            stroke={line}
            strokeWidth={1.4}
            fill="none"
            transform="rotate(-24 300 130)"
          />
          <Circle cx={300} cy={130} r={52} stroke={line} strokeWidth={1.2} strokeDasharray="4 10" fill="none" />
          <Circle cx={352} cy={96} r={3.5} fill="#D946EF" />

          <Path
            d="M70 470 L104 528 L36 528 Z"
            stroke="#14B8A6"
            strokeWidth={1.4}
            strokeLinejoin="round"
            fill="none"
          />

          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => {
              const x = 268 + c * 34;
              const y = 640 + r * 34;
              return (
                <G key={`${r}-${c}`} stroke={line} strokeWidth={1.1} strokeLinecap="round">
                  <Path d={`M${x - 5} ${y} H${x + 5}`} />
                  <Path d={`M${x} ${y - 5} V${y + 5}`} />
                </G>
              );
            }),
          )}

          <Path
            d="M20 760 C 70 720, 120 800, 170 760 S 268 720, 318 760"
            stroke={line}
            strokeWidth={1.4}
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
}
