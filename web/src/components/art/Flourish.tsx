/**
 * Small decorative marks: a rule for section headers and a doodle for empty
 * states. Both are `aria-hidden` and token-coloured so they behave in either
 * theme.
 */

/**
 * The gradient hairline that trails a section heading. Sized by its container,
 * so drop it in a flex row with `flex-1`.
 */
export function SectionRule({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-px ${className ?? ''}`}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgb(var(--s-grad-2) / 0.55), rgb(var(--s-grad-3) / 0.28) 40%, transparent)',
      }}
    />
  );
}

/** A three-dot + spark cluster used to cap section headers. */
export function HeaderSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="8" r="2.5" fill="rgb(var(--s-grad-1) / 0.55)" />
      <circle cx="14" cy="8" r="3.2" fill="rgb(var(--s-grad-2) / 0.7)" />
      <circle cx="25" cy="8" r="2.2" fill="rgb(var(--s-grad-3) / 0.6)" />
      <path
        d="M37 1.5 l1.7 5.3 5.3 1.7 -5.3 1.7 -1.7 5.3 -1.7 -5.3 -5.3 -1.7 5.3 -1.7 Z"
        fill="rgb(var(--s-grad-3) / 0.55)"
      />
    </svg>
  );
}

/**
 * Empty-state doodle: an open book radiating a small constellation. Replaces
 * the flat icon plate so a blank screen still has personality.
 */
export function EmptyDoodle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 104" fill="none" aria-hidden="true">
      <ellipse cx="66" cy="90" rx="52" ry="9" fill="rgb(var(--s-grad-2) / 0.12)" />

      {/* book */}
      <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M66 46 C 56 38, 40 36, 24 38 V80 C 40 78, 56 80, 66 87"
          stroke="rgb(var(--s-grad-1) / 0.85)"
          fill="rgb(var(--s-grad-1) / 0.1)"
        />
        <path
          d="M66 46 C 76 38, 92 36, 108 38 V80 C 92 78, 76 80, 66 87"
          stroke="rgb(var(--s-grad-2) / 0.85)"
          fill="rgb(var(--s-grad-2) / 0.1)"
        />
        <path d="M66 46 V87" stroke="rgb(var(--s-grad-2) / 0.6)" />
      </g>
      <g stroke="rgb(var(--s-grad-1) / 0.35)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M34 50 h20 M34 58 h24 M78 50 h20 M78 58 h16" />
      </g>

      {/* rising constellation */}
      <g className="animate-float">
        <circle cx="66" cy="16" r="4.5" fill="rgb(var(--s-grad-3) / 0.85)" />
        <circle cx="42" cy="24" r="3" fill="rgb(var(--s-grad-2) / 0.7)" />
        <circle cx="92" cy="22" r="3.4" fill="rgb(var(--s-grad-1) / 0.7)" />
        <path
          d="M42 24 L66 16 L92 22"
          stroke="rgb(var(--s-grad-2) / 0.4)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * A quiet ribbon of concentric arcs, used behind page headers to give the top
 * of a screen some structure without competing with the title.
 */
export function HeaderArcs({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 120"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMaxYMid slice"
    >
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx="270"
          cy="34"
          r={40 + i * 26}
          stroke={`rgb(var(--s-grad-${(i % 3) + 1}) / ${0.22 - i * 0.04})`}
          strokeWidth="1.4"
        />
      ))}
      <circle cx="270" cy="34" r="6" fill="rgb(var(--s-grad-2) / 0.35)" />
    </svg>
  );
}
