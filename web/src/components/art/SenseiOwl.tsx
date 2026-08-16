/**
 * The Sensei owl — the same mark the Expo app ships as its launcher icon,
 * ported from `mobile/src/illustrations/DiOwlLogo.tsx` to plain SVG so the web
 * client wears one identity with the phone app.
 *
 * Geometry, palette and proportions are kept identical to the mobile original;
 * only the react-native-svg primitives are swapped for their DOM equivalents.
 * If the mobile mark changes, change it here too.
 */

/** Palette lifted verbatim from the mobile logo. */
const INDIGO = '#4F46E5';
const CREAM = '#F5F0EB';
const CYAN = '#06B6D4';
const GOLD = '#F4C542';
const WING = '#D4C5B5';

export function SenseiOwl({
  size = 40,
  className,
  plate = true,
  glyph,
  title,
}: {
  size?: number;
  className?: string;
  /**
   * Draw the indigo disc behind the owl. Off when the mark sits on a coloured
   * chip that already supplies its own background.
   */
  plate?: boolean;
  /**
   * Character on the owl's belly. The mobile icon carries `দী` for Dikkha;
   * this client ships eight languages, so a Bengali glyph would be wrong in
   * seven of them and the belly is left clean unless a caller asks for one.
   */
  glyph?: string;
  /** Sets an accessible name. Without it the mark is decorative. */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {plate ? <circle cx="100" cy="100" r="88" fill={INDIGO} /> : null}

      {/* body */}
      <path d="M55 85 Q55 155 100 165 Q145 155 145 85 Q145 55 100 45 Q55 55 55 85 Z" fill={CREAM} />
      {/* ear tufts */}
      <polygon points="65,58 74,36 83,58" fill={CREAM} />
      <polygon points="117,58 126,36 135,58" fill={CREAM} />

      {/* eye sockets, circuit irises, glowing pupils */}
      <circle cx="80" cy="82" r="20" fill={INDIGO} />
      <circle cx="120" cy="82" r="20" fill={INDIGO} />
      <circle cx="80" cy="82" r="14" stroke={CYAN} strokeWidth="2.5" fill="none" />
      <circle cx="120" cy="82" r="14" stroke={CYAN} strokeWidth="2.5" fill="none" />
      <circle cx="80" cy="82" r="7" fill={CYAN} />
      <circle cx="120" cy="82" r="7" fill={CYAN} />
      <circle cx="77" cy="79" r="2.5" fill={CREAM} opacity="0.8" />
      <circle cx="117" cy="79" r="2.5" fill={CREAM} opacity="0.8" />

      {/* beak */}
      <polygon points="100,98 93,110 107,110" fill={GOLD} />

      {glyph ? (
        <text
          x="100"
          y="148"
          textAnchor="middle"
          fontSize="38"
          fontWeight="900"
          fill={INDIGO}
          fontFamily="sans-serif"
          opacity="0.85"
        >
          {glyph}
        </text>
      ) : null}

      {/* circuit traces */}
      <line x1="55" y1="75" x2="35" y2="75" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="35" y1="75" x2="35" y2="55" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="35" cy="51" r="4" fill={CYAN} />
      <line
        x1="145"
        y1="75"
        x2="165"
        y2="75"
        stroke={CYAN}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="165"
        y1="75"
        x2="165"
        y2="55"
        stroke={CYAN}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="165" cy="51" r="4" fill={CYAN} />
      <line x1="100" y1="165" x2="100" y2="180" stroke={CYAN} strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="184" r="3" fill={CYAN} />

      {/* gold sparkle crown */}
      <circle cx="100" cy="28" r="5" fill={GOLD} />
      <rect x="98" y="18" width="4" height="8" rx="1" fill={GOLD} opacity="0.6" />
      <rect x="94" y="26" width="12" height="3" rx="1" fill={GOLD} opacity="0.6" />

      {/* wing chevrons */}
      <path d="M60 115 L70 125 L60 135" stroke={WING} strokeWidth="2" fill="none" opacity="0.35" />
      <path
        d="M140 115 L130 125 L140 135"
        stroke={WING}
        strokeWidth="2"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}

/**
 * The owl reduced to its face, for chat avatars and nav icons where the full
 * mark's circuit traces and crown collapse into noise below ~24px.
 */
export function SenseiOwlGlyph({
  size = 20,
  className,
  color = 'currentColor',
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* head outline + tufts as one silhouette */}
      <path
        d="M10 20 Q10 40 24 44 Q38 40 38 20 Q38 10 24 7 Q10 10 10 20 Z"
        stroke={color}
        strokeWidth="2.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M13 12 L15.5 4 L20 10" stroke={color} strokeWidth="2.6" strokeLinejoin="round" fill="none" />
      <path d="M35 12 L32.5 4 L28 10" stroke={color} strokeWidth="2.6" strokeLinejoin="round" fill="none" />
      {/* eyes */}
      <circle cx="18.5" cy="21" r="4.6" stroke={color} strokeWidth="2.4" fill="none" />
      <circle cx="29.5" cy="21" r="4.6" stroke={color} strokeWidth="2.4" fill="none" />
      <circle cx="18.5" cy="21" r="1.7" fill={color} />
      <circle cx="29.5" cy="21" r="1.7" fill={color} />
      {/* beak */}
      <path d="M24 27 L21.5 31.5 L26.5 31.5 Z" fill={color} />
    </svg>
  );
}
