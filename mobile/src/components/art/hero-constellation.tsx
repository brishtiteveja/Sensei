import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

/**
 * The dashboard hero illustration — a knowledge-graph constellation.
 *
 * The motif is the product thesis in one drawing: scattered concepts, the links
 * between them, and a bright orbit sweeping through. Bright nodes are mastered,
 * the dim ones are the frontier.
 *
 * Node and edge coordinates are copied verbatim from the web component, because
 * *that* is the part worth sharing — the geometry is the drawing. What could not
 * come across is the CSS: the web spins the orbits, pulses the frontier nodes
 * and floats the spark on keyframes, none of which exists here. Static, it
 * reads the same; animating it would mean a Reanimated loop behind the home
 * screen for a decoration.
 *
 * White-on-gradient by design — it sits on the indigo hero, so every colour is
 * a white alpha and no theme branching is needed.
 */

import { NODES, EDGES } from '@art/constellation';

export function HeroConstellation({ width = 340, height = 230 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 340 230" fill="none" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <RadialGradient id="heroHalo" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor="#fff" stopOpacity={0.28} />
          <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="heroOrbit" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#fff" stopOpacity={0.1} />
          <Stop offset="55%" stopColor="#fff" stopOpacity={0.75} />
          <Stop offset="100%" stopColor="#fff" stopOpacity={0.1} />
        </LinearGradient>
      </Defs>

      <Circle cx={176} cy={104} r={132} fill="url(#heroHalo)" />

      {/* sweeping orbits around the densest cluster */}
      <Ellipse
        cx={176}
        cy={104}
        rx={118}
        ry={52}
        stroke="url(#heroOrbit)"
        strokeWidth={1.6}
        transform="rotate(-18 176 104)"
        fill="none"
      />
      <Ellipse
        cx={176}
        cy={104}
        rx={90}
        ry={90}
        stroke="#fff"
        strokeOpacity={0.2}
        strokeWidth={1.4}
        strokeDasharray="3 11"
        fill="none"
      />

      <G stroke="#fff" strokeOpacity={0.34} strokeWidth={1.3} strokeLinecap="round">
        {EDGES.map(([a, b]) => (
          <Line key={`${a}-${b}`} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} />
        ))}
      </G>

      {NODES.map((n, i) => (
        <G key={i}>
          {n.hot ? <Circle cx={n.x} cy={n.y} r={n.r + 7} fill="#fff" fillOpacity={0.14} /> : null}
          <Circle cx={n.x} cy={n.y} r={n.r} fill="#fff" fillOpacity={n.hot ? 0.95 : 0.55} />
        </G>
      ))}

      {/* a spark on the frontier */}
      <Path
        d="M292 62 l3.5 12 12 3.5 -12 3.5 -3.5 12 -3.5 -12 -12 -3.5 12 -3.5 Z"
        fill="#fff"
        fillOpacity={0.8}
      />
    </Svg>
  );
}
