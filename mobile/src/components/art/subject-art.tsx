/**
 * Per-subject identity art (React Native port of web `SubjectArt`).
 *
 * One component, parameterised by subject id. `subjectVisual()` maps an id to a
 * hue plus a motif, and `SubjectArt` draws that motif on a 240x120 canvas.
 * Colours are written as `hsl()`/`hsla()` off the resolved hue rather than theme
 * tokens, so a single drawing reads correctly on both bright paper and deep
 * space without a second palette.
 *
 * Note: React Native's colour parser only understands the legacy comma form
 * (`hsl(248, 82%, 58%)` / `hsla(248, 82%, 58%, 0.16)`), never the CSS Color 4
 * space-separated form the web file uses — every colour here is comma form.
 *
 * Everything is hand-rolled inline SVG — no sprites, no network.
 */

import React from 'react';
import { Svg, G, Circle, Ellipse, Path, Rect } from 'react-native-svg';

// Geometry and hue mapping come from shared/art, so the web client and this one
// cannot drift apart again. Only the drawing below is platform-specific.
import { subjectVisual, hexPath } from '@art/subjects';

export type { SubjectMotif, SubjectVisual } from '@art/subjects';
export { subjectVisual, subjectGradientColors } from '@art/subjects';

export function SubjectArt({
  subject,
  width = 240,
  height = 120,
  opacity = 1,
  wash = true,
}: {
  subject: string | undefined;
  width?: number;
  height?: number;
  opacity?: number;
  /**
   * Draw the tinted background plate. Turn it off when the art is cropped into
   * a corner, where the plate's straight edge would read as a stray rectangle.
   */
  wash?: boolean;
}) {
  const { hue, motif } = subjectVisual(subject);
  const hue2 = (hue + 44) % 360;

  const line = `hsl(${hue}, 80%, 52%)`;
  const line2 = `hsl(${hue2}, 78%, 58%)`;
  // Translucent variants of the two line colours; the web file got these by
  // suffixing an 8-digit-hex alpha, which RN cannot parse.
  const lineA = (a: number) => `hsla(${hue}, 80%, 52%, ${a})`;
  const line2A = (a: number) => `hsla(${hue2}, 78%, 58%, ${a})`;
  const soft = `hsla(${hue}, 82%, 58%, 0.16)`;
  const softer = `hsla(${hue2}, 82%, 58%, 0.1)`;

  const props: MotifProps = { line, line2, lineA, line2A };

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 240 120"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      opacity={opacity}
    >
      {/* a soft wash so the motif never floats on bare card */}
      {wash ? <Rect width="240" height="120" fill={soft} /> : null}
      <Circle cx="212" cy="6" r="58" fill={softer} />

      {motif === 'orbit' ? <Orbit {...props} /> : null}
      {motif === 'hex' ? <HexLattice {...props} /> : null}
      {motif === 'curve' ? <Curve {...props} /> : null}
      {motif === 'geometry' ? <Geometry {...props} /> : null}
      {motif === 'cell' ? <Cell {...props} /> : null}
      {motif === 'code' ? <Code {...props} /> : null}
      {motif === 'glyph' ? <Glyph {...props} /> : null}
      {motif === 'globe' ? <Globe {...props} /> : null}
    </Svg>
  );
}

interface MotifProps {
  line: string;
  line2: string;
  /** `line` at the given alpha. */
  lineA: (a: number) => string;
  /** `line2` at the given alpha. */
  line2A: (a: number) => string;
}

/* physics — nucleus, electron shells, a travelling wave */
function Orbit({ line, line2 }: MotifProps) {
  return (
    <G strokeWidth="1.6" strokeLinecap="round">
      <G>
        {[0, 60, 120].map((deg) => (
          <Ellipse
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
        <Circle cx="178" cy="46" r="5.5" fill={line} />
        <Circle cx="214" cy="59" r="3.2" fill={line2} />
        <Circle cx="147" cy="30" r="2.6" fill={line} />
      </G>
      <Path
        d="M6 96 C 22 74, 38 118, 54 96 S 86 74, 102 96 S 134 118, 150 96"
        stroke={line2}
        strokeOpacity="0.65"
      />
      <Path d="M14 34 h34 M14 46 h20" stroke={line} strokeOpacity="0.45" />
    </G>
  );
}

/* chemistry — hex lattice with bond nodes */
function HexLattice({ line, line2, lineA }: MotifProps) {
  const cells: Array<[number, number]> = [
    [168, 34],
    [198, 52],
    [168, 70],
    [138, 52],
    [198, 88],
    [228, 34],
  ];
  return (
    <G strokeWidth="1.6" strokeLinejoin="round">
      <G>
        {cells.map(([x, y], i) => (
          <Path
            key={i}
            d={hexPath(x, y, 19)}
            stroke={i % 2 ? line2 : line}
            strokeOpacity={0.68}
            fill={i === 0 ? lineA(0.09) : 'none'}
          />
        ))}
        <Circle cx="168" cy="34" r="3" fill={line} />
        <Circle cx="198" cy="88" r="3" fill={line2} />
      </G>
      {/* flask silhouette, lower left */}
      <Path
        d="M34 40 v20 L14 96 a6 6 0 0 0 5 9 h40 a6 6 0 0 0 5 -9 L44 60 V40"
        stroke={line}
        strokeOpacity="0.6"
      />
      <Path d="M28 40 h22" stroke={line} strokeOpacity="0.6" />
      <Path d="M20 88 h38" stroke={line2} strokeOpacity="0.55" />
    </G>
  );
}

/* higher math — a curve, its tangent, and an area sliver */
function Curve({ line, line2 }: MotifProps) {
  return (
    <G strokeWidth="1.6" strokeLinecap="round">
      <Path d="M18 100 H228 M28 12 V108" stroke={line} strokeOpacity="0.32" />
      <Path
        d="M28 96 C 74 96, 92 18, 130 18 S 190 92, 228 26"
        stroke={line}
        strokeOpacity="0.85"
      />
      <Path
        d="M28 96 C 74 96, 92 18, 130 18 S 190 92, 228 26 L228 100 H28 Z"
        fill={line2}
        fillOpacity="0.1"
        stroke="none"
      />
      <Path d="M78 104 L146 22" stroke={line2} strokeOpacity="0.7" strokeDasharray="5 6" />
      <G>
        <Circle cx="130" cy="18" r="4.5" fill={line2} />
      </G>
      <Path d="M186 66 a10 10 0 0 1 -14 -12" stroke={line2} strokeOpacity="0.7" />
    </G>
  );
}

/* general math — geometry: grid, triangle, circle with radius */
function Geometry({ line, line2, line2A }: MotifProps) {
  return (
    <G strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <G stroke={line} strokeOpacity="0.22">
        {[0, 1, 2, 3].map((i) => (
          <Path key={`h${i}`} d={`M8 ${24 + i * 26} H232`} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Path key={`v${i}`} d={`M${24 + i * 38} 10 V112`} />
        ))}
      </G>
      <G>
        <Circle cx="182" cy="62" r="34" stroke={line} strokeOpacity="0.8" />
        <Path d="M182 62 L216 62" stroke={line2} strokeOpacity="0.85" />
        <Circle cx="182" cy="62" r="3.4" fill={line2} />
      </G>
      <Path d="M28 100 L74 26 L120 100 Z" stroke={line2} strokeOpacity="0.8" fill={line2A(0.08)} />
      <Path d="M62 100 a14 14 0 0 1 12 -14" stroke={line} strokeOpacity="0.6" />
    </G>
  );
}

/* biology — cell with nucleus and organelles, plus a veined leaf */
function Cell({ line, line2, lineA, line2A }: MotifProps) {
  return (
    <G strokeWidth="1.6" strokeLinecap="round">
      <G>
        <Path
          d="M176 14 c34 0 50 20 50 44 s-18 46 -50 46 -50 -22 -50 -46 16 -44 50 -44 Z"
          stroke={line}
          strokeOpacity="0.75"
          fill={lineA(0.07)}
        />
        <Circle cx="176" cy="58" r="15" stroke={line2} strokeOpacity="0.85" fill={line2A(0.09)} />
        <Circle cx="176" cy="58" r="4" fill={line2} />
        <Ellipse cx="146" cy="40" rx="8" ry="5" stroke={line2} strokeOpacity="0.6" transform="rotate(-24 146 40)" />
        <Ellipse cx="206" cy="82" rx="9" ry="5" stroke={line2} strokeOpacity="0.6" transform="rotate(18 206 82)" />
        <Ellipse cx="204" cy="34" rx="6" ry="4" stroke={line} strokeOpacity="0.5" />
      </G>
      {/* leaf */}
      <Path
        d="M18 104 C 18 62, 46 34, 88 30 C 88 72, 60 100, 18 104 Z"
        stroke={line}
        strokeOpacity="0.7"
        fill={lineA(0.06)}
      />
      <Path d="M20 102 L86 32" stroke={line2} strokeOpacity="0.7" />
      <Path d="M40 88 L44 62 M58 74 L62 50 M30 96 L32 78" stroke={line2} strokeOpacity="0.45" />
    </G>
  );
}

/* ICT — brackets, a node tree, binary rain */
function Code({ line, line2 }: MotifProps) {
  return (
    <G strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M52 34 L26 60 L52 86" stroke={line} strokeOpacity="0.8" />
      <Path d="M84 34 L110 60 L84 86" stroke={line} strokeOpacity="0.8" />
      <Path d="M76 26 L60 94" stroke={line2} strokeOpacity="0.6" />
      <G>
        <Path d="M184 26 V48 M184 48 L156 74 M184 48 L212 74" stroke={line2} strokeOpacity="0.7" />
        <Circle cx="184" cy="22" r="6" fill={line} />
        <Circle cx="156" cy="78" r="5" fill={line2} />
        <Circle cx="212" cy="78" r="5" fill={line2} />
      </G>
      <G fill={line} fillOpacity="0.35">
        {[0, 1, 2, 3].map((i) => (
          <Circle key={i} cx={132 + i * 9} cy={104} r="2.4" />
        ))}
      </G>
    </G>
  );
}

/* language — quotation swash over a writing baseline */
function Glyph({ line, line2, lineA, line2A }: MotifProps) {
  return (
    <G strokeWidth="1.7" strokeLinecap="round">
      <G>
        <Path
          d="M148 66 c0 -22 12 -34 30 -38 -10 8 -14 14 -14 22 h14 v22 Z"
          stroke={line}
          strokeOpacity="0.8"
          fill={lineA(0.08)}
        />
        <Path
          d="M192 66 c0 -22 12 -34 30 -38 -10 8 -14 14 -14 22 h14 v22 Z"
          stroke={line2}
          strokeOpacity="0.8"
          fill={line2A(0.08)}
        />
      </G>
      <Path d="M18 44 h96 M18 62 h72 M18 80 h108 M148 92 h74" stroke={line} strokeOpacity="0.4" />
      <Path
        d="M18 104 c 26 -20, 44 12, 68 -6 s 40 -18, 62 2"
        stroke={line2}
        strokeOpacity="0.7"
      />
    </G>
  );
}

/* general knowledge — globe with meridians and a couple of stars */
function Globe({ line, line2, lineA }: MotifProps) {
  return (
    <G strokeWidth="1.6" strokeLinecap="round">
      <G>
        <Circle cx="178" cy="58" r="40" stroke={line} strokeOpacity="0.8" fill={lineA(0.06)} />
        <Ellipse cx="178" cy="58" rx="16" ry="40" stroke={line2} strokeOpacity="0.6" />
        <Ellipse cx="178" cy="58" rx="34" ry="40" stroke={line2} strokeOpacity="0.35" />
        <Path d="M140 44 H216 M140 72 H216" stroke={line2} strokeOpacity="0.55" />
      </G>
      <Path d="M40 36 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill={line} fillOpacity="0.6" />
      <Path d="M86 86 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill={line2} fillOpacity="0.5" />
      <Path d="M18 106 h84" stroke={line} strokeOpacity="0.35" />
    </G>
  );
}
