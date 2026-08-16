/**
 * Dashboard hero illustration — a knowledge-graph constellation.
 *
 * The motif is the product thesis in one drawing: scattered concepts, the
 * links between them, and a bright orbit sweeping through. It renders white-on-
 * gradient (it sits on the indigo hero card), so all colour is `currentColor`
 * plus fixed white alphas — no theme branching needed.
 *
 * Node/edge counts are hand-authored and small (13 nodes, 14 edges).
 */

interface Node {
  x: number;
  y: number;
  r: number;
  /** Bright nodes are "mastered"; the rest are the frontier. */
  hot?: boolean;
  /** Staggered pulse so the constellation breathes instead of blinking. */
  delay?: number;
}

const NODES: Node[] = [
  { x: 40, y: 132, r: 4 },
  { x: 74, y: 74, r: 6, hot: true, delay: -0.6 },
  { x: 128, y: 126, r: 5, delay: -2.1 },
  { x: 118, y: 44, r: 4, delay: -1.2 },
  { x: 176, y: 88, r: 9, hot: true },
  { x: 168, y: 168, r: 5, hot: true, delay: -2.8 },
  { x: 232, y: 42, r: 5, delay: -1.7 },
  { x: 240, y: 130, r: 6, delay: -0.9 },
  { x: 224, y: 196, r: 4, delay: -3.4 },
  { x: 292, y: 82, r: 5, hot: true, delay: -2.4 },
  { x: 300, y: 166, r: 4, delay: -1.4 },
  { x: 96, y: 194, r: 4, delay: -3.1 },
  { x: 274, y: 24, r: 3, delay: -0.3 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 4],
  [4, 5],
  [4, 6],
  [4, 7],
  [5, 8],
  [6, 9],
  [7, 9],
  [7, 10],
  [8, 10],
  [2, 11],
];

export function HeroConstellation({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 340 230"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="s-hero-halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s-hero-orbit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <circle cx="176" cy="104" r="132" fill="url(#s-hero-halo)" />

      {/* sweeping orbits around the densest cluster */}
      <g className="animate-spin-slow" style={{ transformOrigin: '176px 104px' }}>
        <ellipse
          cx="176"
          cy="104"
          rx="118"
          ry="52"
          stroke="url(#s-hero-orbit)"
          strokeWidth="1.6"
          transform="rotate(-18 176 104)"
        />
        <ellipse
          cx="176"
          cy="104"
          rx="90"
          ry="90"
          stroke="#fff"
          strokeOpacity="0.2"
          strokeWidth="1.4"
          strokeDasharray="3 11"
        />
      </g>

      <g stroke="#fff" strokeOpacity="0.34" strokeWidth="1.3" strokeLinecap="round">
        {EDGES.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} />
        ))}
      </g>

      <g>
        {NODES.map((n, i) => (
          <g key={i}>
            {n.hot ? (
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r + 7}
                fill="#fff"
                fillOpacity="0.14"
                className="animate-pulse-soft"
                style={{ animationDelay: `${n.delay ?? 0}s` }}
              />
            ) : null}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill="#fff"
              fillOpacity={n.hot ? 0.95 : 0.55}
              className={n.hot ? undefined : 'animate-pulse-soft'}
              style={n.hot ? undefined : { animationDelay: `${n.delay ?? 0}s` }}
            />
          </g>
        ))}
      </g>

      {/* a spark travelling the frontier */}
      <g className="animate-float" style={{ transformOrigin: '292px 82px' }}>
        <path
          d="M292 62 l3.5 12 12 3.5 -12 3.5 -3.5 12 -3.5 -12 -12 -3.5 12 -3.5 Z"
          fill="#fff"
          fillOpacity="0.8"
        />
      </g>
    </svg>
  );
}

/**
 * A quieter constellation for surfaces that are not the indigo hero — the
 * empty "continue learning" card, the tutor panel. Uses theme tokens so it
 * works on light and dark card fills.
 */
export function ConstellationMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <g
        stroke="rgb(var(--s-grad-2) / 0.45)"
        strokeWidth="1.3"
        strokeLinecap="round"
      >
        <path d="M28 88 L58 44 L96 66 L132 30" />
        <path d="M58 44 L74 96 L96 66" />
        <path d="M96 66 L128 92" />
      </g>
      <g fill="rgb(var(--s-grad-1))">
        <circle cx="28" cy="88" r="3.5" fillOpacity="0.7" />
        <circle cx="58" cy="44" r="5" />
        <circle cx="96" cy="66" r="6" fill="rgb(var(--s-grad-2))" />
        <circle cx="132" cy="30" r="4" fill="rgb(var(--s-grad-3))" />
        <circle cx="74" cy="96" r="3.5" fillOpacity="0.7" />
        <circle cx="128" cy="92" r="3" fillOpacity="0.55" />
      </g>
      <ellipse
        cx="96"
        cy="66"
        rx="52"
        ry="22"
        stroke="rgb(var(--s-grad-3) / 0.3)"
        strokeWidth="1.2"
        transform="rotate(-16 96 66)"
      />
    </svg>
  );
}
