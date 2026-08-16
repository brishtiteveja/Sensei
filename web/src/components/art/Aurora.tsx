/**
 * The app's background stack.
 *
 * Three drifting colour washes, a dot mesh, a top grid, and a handful of
 * floating geometric shapes. Everything here is decorative: `aria-hidden`,
 * `pointer-events-none`, and fixed-position so it never lives inside a scroll
 * container. Colour comes from `--s-aurora-*` in tokens.css, which is what
 * makes light mode read as tinted paper and dark mode as deep space.
 *
 * No `filter: blur()` anywhere — the softness is radial gradients, which cost
 * one cheap paint instead of a per-frame blur.
 */
export function Aurora() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="s-aurora-blob s-aurora-1" />
      <div className="s-aurora-blob s-aurora-2" />
      <div className="s-aurora-blob s-aurora-3" />
      <div className="s-grid" />
      <div className="s-mesh" />
      <FloatingShapes />
    </div>
  );
}

/**
 * Loose geometry drifting behind the content — an orbit ring, a triangle, a
 * plus-grid, a sine wave and a hex. Deliberately few nodes; the whole set is
 * under 30 path commands.
 */
function FloatingShapes() {
  const stroke = 'rgb(var(--s-grad-2) / 0.5)';
  const stroke2 = 'rgb(var(--s-grad-1) / 0.45)';
  const stroke3 = 'rgb(var(--s-aurora-3) / 0.55)';

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      style={{ opacity: 'var(--s-shape-a)' }}
    >
      {/* orbit ring, top right */}
      <g className="animate-float" style={{ transformOrigin: '1180px 170px' }}>
        <ellipse
          cx="1180"
          cy="170"
          rx="128"
          ry="52"
          stroke={stroke}
          strokeWidth="1.5"
          transform="rotate(-24 1180 170)"
        />
        <ellipse
          cx="1180"
          cy="170"
          rx="86"
          ry="86"
          stroke={stroke2}
          strokeWidth="1.5"
          strokeDasharray="4 10"
        />
        <circle cx="1298" cy="122" r="5" fill="rgb(var(--s-grad-3) / 0.8)" />
      </g>

      {/* triangle, mid left — kept clear of the 248px nav rail, which is
          translucent and would otherwise show a shape through itself */}
      <g
        className="animate-float"
        style={{ animationDelay: '-4s', transformOrigin: '420px 520px' }}
      >
        <path
          d="M420 470 L472 560 L368 560 Z"
          stroke={stroke3}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* plus grid, lower right */}
      <g stroke={stroke2} strokeWidth="1.4" strokeLinecap="round" className="animate-pulse-soft">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const x = 1080 + c * 46;
            const y = 660 + r * 46;
            return (
              <g key={`${r}-${c}`}>
                <path d={`M${x - 6} ${y} H${x + 6}`} />
                <path d={`M${x} ${y - 6} V${y + 6}`} />
              </g>
            );
          }),
        )}
      </g>

      {/* sine wave, bottom left */}
      <path
        className="animate-float"
        style={{ animationDelay: '-7s' }}
        d="M330 800 C 440 740, 540 860, 650 800 S 860 740, 970 800"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* hexagon, top left */}
      <path
        className="animate-float"
        style={{ animationDelay: '-2.5s' }}
        d="M560 96 L596 117 L596 159 L560 180 L524 159 L524 117 Z"
        stroke={stroke3}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* stray nodes */}
      <circle cx="640" cy="140" r="3.5" fill="rgb(var(--s-grad-2) / 0.7)" />
      <circle cx="840" cy="620" r="4.5" fill="rgb(var(--s-aurora-3) / 0.65)" />
      <circle cx="520" cy="330" r="3" fill="rgb(var(--s-grad-1) / 0.6)" />
    </svg>
  );
}
