/**
 * Celebration burst for a correct practice answer.
 *
 * Pure CSS/SVG: two expanding rings and twelve rays that fire once on mount
 * and then sit invisible (`animation-fill-mode: both` ends at opacity 0). It is
 * absolutely positioned and `pointer-events-none`, so it cannot interfere with
 * the answer buttons underneath, and it is `aria-hidden` — the result is
 * already announced by the feedback panel's `role="status"`.
 *
 * `prefers-reduced-motion` collapses the animation durations to ~0 in
 * index.css, which lands every element on its final (invisible) frame.
 */
const RAYS = Array.from({ length: 12 }, (_, i) => i);

export function CorrectBurst({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-visible ${className ?? ''}`}
    >
      <span className="absolute left-0 top-0 h-full w-full">
        {/* expanding rings */}
        <span
          className="absolute inset-0 animate-burst-ring rounded-full"
          style={{ boxShadow: '0 0 0 2px rgb(var(--s-success) / 0.75)' }}
        />
        <span
          className="absolute inset-0 animate-burst-ring rounded-full"
          style={{
            boxShadow: '0 0 0 2px rgb(var(--s-success) / 0.4)',
            animationDelay: '120ms',
          }}
        />
      </span>

      {/* rays + confetti dots */}
      <svg
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 100 100"
        fill="none"
      >
        <g
          className="animate-burst-spark"
          style={{ transformOrigin: '50px 50px' }}
          stroke="rgb(var(--s-success))"
          strokeWidth="2.6"
          strokeLinecap="round"
        >
          {RAYS.map((i) => {
            const a = (Math.PI / 6) * i;
            const x1 = 50 + Math.cos(a) * 22;
            const y1 = 50 + Math.sin(a) * 22;
            const x2 = 50 + Math.cos(a) * (i % 2 ? 34 : 42);
            const y2 = 50 + Math.sin(a) * (i % 2 ? 34 : 42);
            return (
              <line
                key={i}
                x1={x1.toFixed(1)}
                y1={y1.toFixed(1)}
                x2={x2.toFixed(1)}
                y2={y2.toFixed(1)}
                strokeOpacity={i % 2 ? 0.5 : 0.85}
              />
            );
          })}
        </g>
        <g
          className="animate-burst-spark"
          style={{ transformOrigin: '50px 50px', animationDelay: '90ms' }}
        >
          {RAYS.filter((i) => i % 3 === 0).map((i) => {
            const a = (Math.PI / 6) * i + 0.5;
            return (
              <circle
                key={i}
                cx={(50 + Math.cos(a) * 46).toFixed(1)}
                cy={(50 + Math.sin(a) * 46).toFixed(1)}
                r="3"
                fill="rgb(var(--s-grad-2))"
                fillOpacity="0.8"
              />
            );
          })}
        </g>
      </svg>
    </span>
  );
}

/**
 * The larger version shown on the end-of-set results card: a laurel of rays
 * behind the trophy plate.
 */
export function ScoreBurst({ className, tone }: { className?: string; tone: 'success' | 'warning' }) {
  const c = tone === 'success' ? 'rgb(var(--s-success))' : 'rgb(var(--s-warning))';
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="62" stroke={c} strokeOpacity="0.18" strokeWidth="1.6" />
      <circle
        cx="100"
        cy="100"
        r="82"
        stroke={c}
        strokeOpacity="0.12"
        strokeWidth="1.4"
        strokeDasharray="4 10"
      />
      <g stroke={c} strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 16 }, (_, i) => {
          const a = (Math.PI / 8) * i;
          const long = i % 2 === 0;
          return (
            <line
              key={i}
              x1={(100 + Math.cos(a) * 68).toFixed(1)}
              y1={(100 + Math.sin(a) * 68).toFixed(1)}
              x2={(100 + Math.cos(a) * (long ? 92 : 80)).toFixed(1)}
              y2={(100 + Math.sin(a) * (long ? 92 : 80)).toFixed(1)}
              strokeOpacity={long ? 0.32 : 0.16}
            />
          );
        })}
      </g>
    </svg>
  );
}
