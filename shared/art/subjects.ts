/**
 * Which drawing a subject gets, and in which hue — one definition, both clients.
 *
 * This is the piece that had already diverged. The web matches English ids like
 * `general_math`; the phone stores localised names, so every subject there fell
 * through to the hash and drew an arbitrary motif until the aliases below were
 * added. Sharing the map means the web inherits that fix for free.
 *
 * Pure data and pure functions: no JSX, no SVG elements, nothing that assumes a
 * DOM or a native runtime. The motif *drawings* stay per-platform, because one
 * needs <circle> and the other needs <Circle>.
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
/**
 * Subject names in the languages the app actually stores them in.
 *
 * The web matcher assumes English ids like `general_math`. This client keys
 * mastery and practice off localised names — Bengali on the Bangladesh
 * curriculum — which would fall through to the hash and give physics an
 * arbitrary hue. Matching the name means the art means something.
 */
const ALIASES: [string[], SubjectVisual][] = [
  [['পদার্থ', 'भौतिक', 'física', 'fisika', 'fizik', '物理'], { hue: 248, motif: 'orbit' }],
  [['রসায়ন', 'रसायन', 'química', 'kimia', '化学'], { hue: 168, motif: 'hex' }],
  [['জীব', 'जीव', 'biología', 'biologi', '生物'], { hue: 142, motif: 'cell' }],
  [['উচ্চতর গণিত', 'उच्च गणित', '高等数学'], { hue: 286, motif: 'curve' }],
  [['গণিত', 'गणित', 'matemática', 'matematika', '数学'], { hue: 206, motif: 'geometry' }],
  [['সাধারণ জ্ঞান', 'सामान्य ज्ञान', '常识'], { hue: 322, motif: 'globe' }],
  [['বাংলা', 'english', 'ইংরেজি', 'अंग्रेज़ी', '英语'], { hue: 32, motif: 'glyph' }],
];

export function subjectVisual(id: string | undefined): SubjectVisual {
  const s = (id ?? '').toLowerCase();

  for (const [names, visual] of ALIASES) {
    if (names.some((n) => s.includes(n.toLowerCase()))) return visual;
  }

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

/**
 * The two endpoints of the subject's gradient, in order. RN has no CSS gradient
 * string, so callers feed these to `expo-linear-gradient` (or use the first as a
 * flat tint) instead of the web's `subjectGradient()`.
 */
export function subjectGradientColors(hue: number, a = 1): [string, string] {
  const h2 = (hue + 46) % 360;
  return a >= 1
    ? [`hsl(${hue}, 82%, 58%)`, `hsl(${h2}, 84%, 62%)`]
    : [`hsla(${hue}, 82%, 58%, ${a})`, `hsla(${h2}, 84%, 62%, ${a})`];
}

export function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/**
 * Subject motif on a 240x120 canvas. `width`/`height` size the SVG box and the
 * drawing slices to fill it, so a wide, short box crops rather than squashes.
 */
