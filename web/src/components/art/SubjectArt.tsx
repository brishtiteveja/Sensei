/**
 * Per-subject identity art.
 *
 * One component, parameterised by subject id. `subjectVisual()` maps an id to a
 * hue plus a motif, and `SubjectArt` draws that motif full-bleed inside its
 * parent. Colours are written as `hsl()` off the resolved hue rather than theme
 * tokens, so a single drawing reads correctly on both bright paper and deep
 * space without a second palette.
 *
 * Everything is hand-rolled inline SVG — no sprites, no network.
 */

export type SubjectMotif = 'orbit' | 'hex' | 'curve' | 'geometry' | 'cell' | 'code' | 'glyph' | 'globe';

export interface SubjectVisual {
  hue: number;
  motif: SubjectMotif;
}

const MOTIF_CYCLE: SubjectMotif[] = ['orbit', 'hex', 'curve', 'cell', 'geometry', 'globe'];

/** Deterministic hue for ids we do not recognise, so art stays stable per id. */
function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100_000;
  return h;
}

/**
 * Subject id -> art. Matching is on substrings because the curriculum uses ids
 * like `general_math` / `higher_math` and may grow new ones; anything unknown
 * still gets a stable, distinct look instead of a blank card.
 */
export function subjectVisual(id: string | undefined): SubjectVisual {
  const s = (id ?? '').toLowerCase();

  if (s.includes('physic')) return { hue: 248, motif: 'orbit' };
  if (s.includes('chem')) return { hue: 168, motif: 'hex' };
  if (s.includes('bio') || s.includes('botan') || s.includes('zoo')) return { hue: 142, motif: 'cell' };
  if (s.includes('higher_math') || s.includes('higher math') || s.includes('calculus'))
    return { hue: 286, motif: 'curve' };
  if (s.includes('math') || s.includes('geom') || s.includes('algebra'))
    return { hue: 206, motif: 'geometry' };
  if (s.includes('ict') || s.includes('comput') || s.includes('program'))
    return { hue: 190, motif: 'code' };
  if (
    s.includes('bangla') ||
    s.includes('bengali') ||
    s.includes('english') ||
    s.includes('lang') ||
    s.includes('liter')
  )
    return { hue: 32, motif: 'glyph' };
  if (s.includes('gk') || s.includes('general_know') || s.includes('history') || s.includes('social'))
    return { hue: 322, motif: 'globe' };

  const h = hashHue(s || 'sensei');
  return { hue: h % 360, motif: MOTIF_CYCLE[h % MOTIF_CYCLE.length] };
}

/** A CSS gradient in the subject's hue — handy for tinted headers and chips. */
export function subjectGradient(hue: number, a = 1): string {
  return `linear-gradient(125deg, hsl(${hue} 82% 58% / ${a}), hsl(${(hue + 46) % 360} 84% 62% / ${a}))`;
}

function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/**
 * Full-bleed subject motif. The parent supplies the size and must clip
 * (`overflow-hidden`); the SVG slices a 240x120 canvas to fill it.
 */
export function SubjectArt({
  subject,
  className,
  opacity = 1,
  animate = true,
  wash = true,
}: {
  subject: string | undefined;
  className?: string;
  opacity?: number;
  animate?: boolean;
  /**
   * Draw the tinted background plate. Turn it off when the art is cropped into
   * a corner, where the plate's straight edge would read as a stray rectangle.
   */
  wash?: boolean;
}) {
  const { hue, motif } = subjectVisual(subject);

  const line = `hsl(${hue} 80% 52%)`;
  const line2 = `hsl(${(hue + 44) % 360} 78% 58%)`;
  const soft = `hsl(${hue} 82% 58% / 0.16)`;
  const softer = `hsl(${(hue + 44) % 360} 82% 58% / 0.1)`;
  const drift = animate ? 'animate-float' : undefined;

  return (
    <svg
      className={className}
      viewBox="0 0 240 120"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      {/* a soft wash so the motif never floats on bare card */}
      {wash ? <rect width="240" height="120" fill={soft} /> : null}
      <circle cx="212" cy="6" r="58" fill={softer} />

      {motif === 'orbit' ? <Orbit line={line} line2={line2} drift={drift} /> : null}
      {motif === 'hex' ? <HexLattice line={line} line2={line2} drift={drift} /> : null}
      {motif === 'curve' ? <Curve line={line} line2={line2} drift={drift} /> : null}
      {motif === 'geometry' ? <Geometry line={line} line2={line2} drift={drift} /> : null}
      {motif === 'cell' ? <Cell line={line} line2={line2} drift={drift} /> : null}
      {motif === 'code' ? <Code line={line} line2={line2} drift={drift} /> : null}
      {motif === 'glyph' ? <Glyph line={line} line2={line2} drift={drift} /> : null}
      {motif === 'globe' ? <Globe line={line} line2={line2} drift={drift} /> : null}
    </svg>
  );
}

interface MotifProps {
  line: string;
  line2: string;
  drift?: string;
}

/* physics — nucleus, electron shells, a travelling wave */
function Orbit({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.6" strokeLinecap="round">
      <g className={drift} style={{ transformOrigin: '178px 46px' }}>
        {[0, 60, 120].map((deg) => (
          <ellipse
            key={deg}
            cx="178"
            cy="46"
            rx="44"
            ry="17"
            stroke={deg === 60 ? line2 : line}
            strokeOpacity="0.7"
            transform={`rotate(${deg} 178 46)`}
          />
        ))}
        <circle cx="178" cy="46" r="5.5" fill={line} />
        <circle cx="214" cy="59" r="3.2" fill={line2} />
        <circle cx="147" cy="30" r="2.6" fill={line} />
      </g>
      <path
        d="M6 96 C 22 74, 38 118, 54 96 S 86 74, 102 96 S 134 118, 150 96"
        stroke={line2}
        strokeOpacity="0.65"
      />
      <path d="M14 34 h34 M14 46 h20" stroke={line} strokeOpacity="0.45" />
    </g>
  );
}

/* chemistry — hex lattice with bond nodes */
function HexLattice({ line, line2, drift }: MotifProps) {
  const cells: Array<[number, number]> = [
    [168, 34],
    [198, 52],
    [168, 70],
    [138, 52],
    [198, 88],
    [228, 34],
  ];
  return (
    <g strokeWidth="1.6" strokeLinejoin="round">
      <g className={drift} style={{ transformOrigin: '182px 56px' }}>
        {cells.map(([x, y], i) => (
          <path
            key={i}
            d={hexPath(x, y, 19)}
            stroke={i % 2 ? line2 : line}
            strokeOpacity={0.68}
            fill={i === 0 ? `${line}18` : 'none'}
          />
        ))}
        <circle cx="168" cy="34" r="3" fill={line} />
        <circle cx="198" cy="88" r="3" fill={line2} />
      </g>
      {/* flask silhouette, lower left */}
      <path
        d="M34 40 v20 L14 96 a6 6 0 0 0 5 9 h40 a6 6 0 0 0 5 -9 L44 60 V40"
        stroke={line}
        strokeOpacity="0.6"
      />
      <path d="M28 40 h22" stroke={line} strokeOpacity="0.6" />
      <path d="M20 88 h38" stroke={line2} strokeOpacity="0.55" />
    </g>
  );
}

/* higher math — a curve, its tangent, and an area sliver */
function Curve({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.6" strokeLinecap="round">
      <path d="M18 100 H228 M28 12 V108" stroke={line} strokeOpacity="0.32" />
      <path
        d="M28 96 C 74 96, 92 18, 130 18 S 190 92, 228 26"
        stroke={line}
        strokeOpacity="0.85"
      />
      <path
        d="M28 96 C 74 96, 92 18, 130 18 S 190 92, 228 26 L228 100 H28 Z"
        fill={line2}
        fillOpacity="0.1"
        stroke="none"
      />
      <path d="M78 104 L146 22" stroke={line2} strokeOpacity="0.7" strokeDasharray="5 6" />
      <g className={drift} style={{ transformOrigin: '130px 18px' }}>
        <circle cx="130" cy="18" r="4.5" fill={line2} />
      </g>
      <path d="M186 66 a10 10 0 0 1 -14 -12" stroke={line2} strokeOpacity="0.7" />
    </g>
  );
}

/* general math — geometry: grid, triangle, circle with radius */
function Geometry({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <g stroke={line} strokeOpacity="0.22">
        {[0, 1, 2, 3].map((i) => (
          <path key={`h${i}`} d={`M8 ${24 + i * 26} H232`} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={`v${i}`} d={`M${24 + i * 38} 10 V112`} />
        ))}
      </g>
      <g className={drift} style={{ transformOrigin: '182px 62px' }}>
        <circle cx="182" cy="62" r="34" stroke={line} strokeOpacity="0.8" />
        <path d="M182 62 L216 62" stroke={line2} strokeOpacity="0.85" />
        <circle cx="182" cy="62" r="3.4" fill={line2} />
      </g>
      <path d="M28 100 L74 26 L120 100 Z" stroke={line2} strokeOpacity="0.8" fill={`${line2}14`} />
      <path d="M62 100 a14 14 0 0 1 12 -14" stroke={line} strokeOpacity="0.6" />
    </g>
  );
}

/* biology — cell with nucleus and organelles, plus a veined leaf */
function Cell({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.6" strokeLinecap="round">
      <g className={drift} style={{ transformOrigin: '176px 58px' }}>
        <path
          d="M176 14 c34 0 50 20 50 44 s-18 46 -50 46 -50 -22 -50 -46 16 -44 50 -44 Z"
          stroke={line}
          strokeOpacity="0.75"
          fill={`${line}12`}
        />
        <circle cx="176" cy="58" r="15" stroke={line2} strokeOpacity="0.85" fill={`${line2}18`} />
        <circle cx="176" cy="58" r="4" fill={line2} />
        <ellipse cx="146" cy="40" rx="8" ry="5" stroke={line2} strokeOpacity="0.6" transform="rotate(-24 146 40)" />
        <ellipse cx="206" cy="82" rx="9" ry="5" stroke={line2} strokeOpacity="0.6" transform="rotate(18 206 82)" />
        <ellipse cx="204" cy="34" rx="6" ry="4" stroke={line} strokeOpacity="0.5" />
      </g>
      {/* leaf */}
      <path
        d="M18 104 C 18 62, 46 34, 88 30 C 88 72, 60 100, 18 104 Z"
        stroke={line}
        strokeOpacity="0.7"
        fill={`${line}10`}
      />
      <path d="M20 102 L86 32" stroke={line2} strokeOpacity="0.7" />
      <path d="M40 88 L44 62 M58 74 L62 50 M30 96 L32 78" stroke={line2} strokeOpacity="0.45" />
    </g>
  );
}

/* ICT — brackets, a node tree, binary rain */
function Code({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M52 34 L26 60 L52 86" stroke={line} strokeOpacity="0.8" />
      <path d="M84 34 L110 60 L84 86" stroke={line} strokeOpacity="0.8" />
      <path d="M76 26 L60 94" stroke={line2} strokeOpacity="0.6" />
      <g className={drift} style={{ transformOrigin: '184px 60px' }}>
        <path d="M184 26 V48 M184 48 L156 74 M184 48 L212 74" stroke={line2} strokeOpacity="0.7" />
        <circle cx="184" cy="22" r="6" fill={line} />
        <circle cx="156" cy="78" r="5" fill={line2} />
        <circle cx="212" cy="78" r="5" fill={line2} />
      </g>
      <g fill={line} fillOpacity="0.35">
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={132 + i * 9} cy={104} r="2.4" />
        ))}
      </g>
    </g>
  );
}

/* language — quotation swash over a writing baseline */
function Glyph({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.7" strokeLinecap="round">
      <g className={drift} style={{ transformOrigin: '176px 48px' }}>
        <path
          d="M148 66 c0 -22 12 -34 30 -38 -10 8 -14 14 -14 22 h14 v22 Z"
          stroke={line}
          strokeOpacity="0.8"
          fill={`${line}14`}
        />
        <path
          d="M192 66 c0 -22 12 -34 30 -38 -10 8 -14 14 -14 22 h14 v22 Z"
          stroke={line2}
          strokeOpacity="0.8"
          fill={`${line2}14`}
        />
      </g>
      <path d="M18 44 h96 M18 62 h72 M18 80 h108 M148 92 h74" stroke={line} strokeOpacity="0.4" />
      <path
        d="M18 104 c 26 -20, 44 12, 68 -6 s 40 -18, 62 2"
        stroke={line2}
        strokeOpacity="0.7"
      />
    </g>
  );
}

/* general knowledge — globe with meridians and a couple of stars */
function Globe({ line, line2, drift }: MotifProps) {
  return (
    <g strokeWidth="1.6" strokeLinecap="round">
      <g className={drift} style={{ transformOrigin: '178px 58px' }}>
        <circle cx="178" cy="58" r="40" stroke={line} strokeOpacity="0.8" fill={`${line}10`} />
        <ellipse cx="178" cy="58" rx="16" ry="40" stroke={line2} strokeOpacity="0.6" />
        <ellipse cx="178" cy="58" rx="34" ry="40" stroke={line2} strokeOpacity="0.35" />
        <path d="M140 44 H216 M140 72 H216" stroke={line2} strokeOpacity="0.55" />
      </g>
      <path d="M40 36 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill={line} fillOpacity="0.6" />
      <path d="M86 86 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill={line2} fillOpacity="0.5" />
      <path d="M18 106 h84" stroke={line} strokeOpacity="0.35" />
    </g>
  );
}

/**
 * The small square that stands in for a subject in lists: a hue-tinted
 * gradient plate with the motif ghosted behind the curriculum's own emoji.
 */
export function SubjectTile({
  subject,
  icon,
  className,
  size = 'md',
}: {
  subject: string | undefined;
  icon?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { hue } = subjectVisual(subject);
  const box = size === 'lg' ? 'h-16 w-16 text-3xl' : size === 'sm' ? 'h-10 w-10 text-lg' : 'h-12 w-12 text-2xl';

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl leading-none ${box} ${className ?? ''}`}
      style={{
        backgroundImage: subjectGradient(hue, 0.18),
        boxShadow: `inset 0 0 0 1px hsl(${hue} 70% 55% / 0.3)`,
      }}
    >
      <SubjectArt
        subject={subject}
        className="absolute inset-0 h-full w-full"
        opacity={0.55}
        animate={false}
      />
      <span className="relative">{icon ?? '📘'}</span>
    </span>
  );
}
