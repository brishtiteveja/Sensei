import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

/**
 * The Sensei owl.
 *
 * The web client and the Expo launcher icon already wear this mark; this is the
 * same geometry as `web/src/components/art/SenseiOwl.tsx`, drawn with
 * react-native-svg so the phone app stops looking like a different product from
 * the site. Proportions and palette are identical on purpose — if the mark
 * changes, change it in both.
 */

/** Palette, shared with the web mark and the launcher icon. */
const INDIGO = '#4F46E5';
const CREAM = '#F5F0EB';
const CYAN = '#06B6D4';
const GOLD = '#F4C542';
const WING = '#D4C5B5';

export function SenseiOwl({
  size = 40,
  plate = true,
  glyph,
  /**
   * Where the pupils look, each -1..1. The web owl tracks the cursor; a phone
   * has no cursor, so this is driven by what the app is doing — nudged when the
   * tutor is thinking, centred otherwise.
   */
  gaze,
}: {
  size?: number;
  /**
   * Draw the indigo disc behind the owl. Off when the mark sits on a coloured
   * chip that already supplies its own background.
   */
  plate?: boolean;
  /**
   * Character on the owl's belly. The launcher icon carries `দী` for Dikkha;
   * this app ships eight languages, so a Bengali glyph would be wrong in seven
   * of them and the belly is left clean unless a caller asks for one.
   */
  glyph?: string;
  gaze?: { x: number; y: number };
}) {
  const gx = Math.max(-1, Math.min(1, gaze?.x ?? 0)) * 4.5;
  const gy = Math.max(-1, Math.min(1, gaze?.y ?? 0)) * 3.5;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {plate ? <Circle cx="100" cy="100" r="88" fill={INDIGO} /> : null}

      {/* body */}
      <Path d="M55 85 Q55 155 100 165 Q145 155 145 85 Q145 55 100 45 Q55 55 55 85 Z" fill={CREAM} />
      {/* ear tufts */}
      <Polygon points="65,58 74,36 83,58" fill={CREAM} />
      <Polygon points="117,58 126,36 135,58" fill={CREAM} />

      {/* eye sockets and circuit irises */}
      <Circle cx="80" cy="82" r="20" fill={INDIGO} />
      <Circle cx="120" cy="82" r="20" fill={INDIGO} />
      <Circle cx="80" cy="82" r="14" stroke={CYAN} strokeWidth="2.5" fill="none" />
      <Circle cx="120" cy="82" r="14" stroke={CYAN} strokeWidth="2.5" fill="none" />

      {/* pupils, which are the part that moves */}
      <G translateX={gx} translateY={gy}>
        <Circle cx="80" cy="82" r="7" fill={CYAN} />
        <Circle cx="120" cy="82" r="7" fill={CYAN} />
        <Circle cx="77" cy="79" r="2.5" fill={CREAM} opacity={0.8} />
        <Circle cx="117" cy="79" r="2.5" fill={CREAM} opacity={0.8} />
      </G>

      {/* beak */}
      <Polygon points="100,98 93,110 107,110" fill={GOLD} />

      {glyph ? (
        <SvgText
          x="100"
          y="148"
          textAnchor="middle"
          fontSize="38"
          fontWeight="900"
          fill={INDIGO}
          opacity={0.85}
        >
          {glyph}
        </SvgText>
      ) : null}

      {/* circuit traces */}
      <Line x1="55" y1="75" x2="35" y2="75" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="35" y1="75" x2="35" y2="55" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="35" cy="51" r="4" fill={CYAN} />
      <Line
        x1="145"
        y1="75"
        x2="165"
        y2="75"
        stroke={CYAN}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Line
        x1="165"
        y1="75"
        x2="165"
        y2="55"
        stroke={CYAN}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Circle cx="165" cy="51" r="4" fill={CYAN} />
      <Line x1="100" y1="165" x2="100" y2="180" stroke={CYAN} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="100" cy="184" r="3" fill={CYAN} />

      {/* gold sparkle crown */}
      <Circle cx="100" cy="28" r="5" fill={GOLD} />
      <Rect x="98" y="18" width="4" height="8" rx="1" fill={GOLD} opacity={0.6} />
      <Rect x="94" y="26" width="12" height="3" rx="1" fill={GOLD} opacity={0.6} />

      {/* wing chevrons */}
      <Path d="M60 115 L70 125 L60 135" stroke={WING} strokeWidth="2" fill="none" opacity={0.35} />
      <Path
        d="M140 115 L130 125 L140 135"
        stroke={WING}
        strokeWidth="2"
        fill="none"
        opacity={0.35}
      />
    </Svg>
  );
}

/**
 * The owl reduced to its face, for chat avatars and tab icons where the full
 * mark's circuit traces and crown collapse into noise below ~24px.
 */
export function SenseiOwlGlyph({
  size = 20,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* head outline and tufts as one silhouette */}
      <Path
        d="M10 20 Q10 40 24 44 Q38 40 38 20 Q38 10 24 7 Q10 10 10 20 Z"
        stroke={color}
        strokeWidth="2.6"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M13 12 L15.5 4 L20 10"
        stroke={color}
        strokeWidth="2.6"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M35 12 L32.5 4 L28 10"
        stroke={color}
        strokeWidth="2.6"
        strokeLinejoin="round"
        fill="none"
      />
      {/* eyes */}
      <Circle cx="18.5" cy="21" r="4.6" stroke={color} strokeWidth="2.4" fill="none" />
      <Circle cx="29.5" cy="21" r="4.6" stroke={color} strokeWidth="2.4" fill="none" />
      <Circle cx="18.5" cy="21" r="1.7" fill={color} />
      <Circle cx="29.5" cy="21" r="1.7" fill={color} />
      {/* beak */}
      <Path d="M24 27 L21.5 31.5 L26.5 31.5 Z" fill={color} />
    </Svg>
  );
}
