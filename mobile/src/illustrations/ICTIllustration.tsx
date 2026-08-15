import React from 'react';
import { Svg, Circle, Rect, Line, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function ICTIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#1A1A3E" />
      <Rect x="36" y="36" width="128" height="90" rx="10" fill="#0F172A" />
      <Rect x="44" y="44" width="112" height="74" rx="6" fill="#1B7A5A" opacity="0.15" />
      <Rect x="54" y="54" width="20" height="4" rx="2" fill="#1B7A5A" />
      <Rect x="78" y="54" width="40" height="4" rx="2" fill="#4A9FE8" />
      <Rect x="62" y="64" width="32" height="4" rx="2" fill="#F4C542" />
      <Rect x="98" y="64" width="18" height="4" rx="2" fill="#E85D4A" />
      <Rect x="62" y="74" width="24" height="4" rx="2" fill="#1B7A5A" />
      <Rect x="90" y="74" width="36" height="4" rx="2" fill="#4A9FE8" />
      <Rect x="54" y="84" width="14" height="4" rx="2" fill="#F4C542" />
      <Rect x="72" y="84" width="44" height="4" rx="2" fill="#E85D4A" />
      <Rect x="62" y="94" width="28" height="4" rx="2" fill="#1B7A5A" />
      <Rect x="94" y="94" width="20" height="4" rx="2" fill="#F4C542" />
      <Rect x="54" y="104" width="16" height="4" rx="2" fill="#4A9FE8" />
      <Rect x="90" y="126" width="20" height="14" rx="3" fill="#0F172A" />
      <Rect x="74" y="138" width="52" height="8" rx="4" fill="#0F172A" />
      <Line x1="30" y1="160" x2="80" y2="160" stroke="#4A9FE8" strokeWidth="2" opacity="0.4" />
      <Line x1="120" y1="160" x2="170" y2="160" stroke="#4A9FE8" strokeWidth="2" opacity="0.4" />
      <Circle cx="80" cy="160" r="4" fill="#4A9FE8" />
      <Circle cx="120" cy="160" r="4" fill="#4A9FE8" />
      <Circle cx="30" cy="160" r="3" fill="#F4C542" />
      <Circle cx="170" cy="160" r="3" fill="#F4C542" />
      <Circle cx="80" cy="175" r="3" fill="#E85D4A" />
      <Circle cx="120" cy="175" r="3" fill="#E85D4A" />
      <SvgText x="24" y="30" fontSize="8" fill="#4A9FE8" opacity="0.3" fontFamily="monospace">01101</SvgText>
    </Svg>
  );
}
