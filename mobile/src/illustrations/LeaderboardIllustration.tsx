import React from 'react';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props { size?: number; }

export function LeaderboardIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#6366F1"/>
      <Rect x="30" y="110" width="46" height="60" rx="6" fill="#D4C5B5"/>
      <SvgText x="53" y="146" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1A1A3E" opacity="0.3" fontFamily="sans-serif">২</SvgText>
      <Circle cx="53" cy="94" r="12" fill="#4A9FE8"/>
      <Rect x="45" y="106" width="16" height="6" rx="3" fill="#4A9FE8"/>
      <Circle cx="53" cy="94" r="5" fill="#D4C5B5"/>
      <Rect x="77" y="82" width="46" height="88" rx="6" fill="#F4C542"/>
      <SvgText x="100" y="130" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1A1A3E" opacity="0.3" fontFamily="sans-serif">১</SvgText>
      <Circle cx="100" cy="62" r="14" fill="#F5F0EB"/>
      <Rect x="90" y="76" width="20" height="8" rx="4" fill="#F5F0EB"/>
      <Circle cx="100" cy="62" r="6" fill="#F4C542"/>
      <SvgText x="100" y="66" textAnchor="middle" fontSize="8" fontWeight="900" fill="#1A1A3E" fontFamily="sans-serif">★</SvgText>
      <Path d="M90 46 L92 38 L96 44 L100 34 L104 44 L108 38 L110 46 Z" fill="#F4C542"/>
      <Rect x="124" y="120" width="46" height="50" rx="6" fill="#E8924A"/>
      <SvgText x="147" y="152" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1A1A3E" opacity="0.3" fontFamily="sans-serif">৩</SvgText>
      <Circle cx="147" cy="106" r="11" fill="#E85D4A"/>
      <Rect x="140" y="117" width="14" height="5" rx="2.5" fill="#E85D4A"/>
      <Circle cx="147" cy="106" r="4.5" fill="#E8924A"/>
      <Circle cx="40" cy="35" r="3" fill="#F4C542" opacity="0.5"/>
      <Circle cx="165" cy="30" r="4" fill="#E85D4A" opacity="0.4"/>
      <Rect x="55" y="28" width="5" height="3" rx="1" fill="#1B7A5A" opacity="0.5" transform="rotate(20 57 29)"/>
      <Rect x="140" y="25" width="5" height="3" rx="1" fill="#4A9FE8" opacity="0.4" transform="rotate(-25 142 26)"/>
    </Svg>
  );
}
