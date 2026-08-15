import React from 'react';
import { Svg, Circle, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function ChoosePathIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#1A1A3E"/>
      <Rect x="90" y="140" width="20" height="50" rx="4" fill="#D4C5B5"/>
      <Path d="M100 140 Q80 120 50 80 Q40 65 38 50" stroke="#D4C5B5" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <Path d="M100 140 Q120 120 150 80 Q160 65 162 50" stroke="#D4C5B5" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <Circle cx="82" cy="118" r="2" fill="#1A1A3E" opacity="0.3"/>
      <Circle cx="64" cy="98" r="2" fill="#1A1A3E" opacity="0.3"/>
      <Circle cx="50" cy="78" r="2" fill="#1A1A3E" opacity="0.3"/>
      <Circle cx="118" cy="118" r="2" fill="#1A1A3E" opacity="0.3"/>
      <Circle cx="136" cy="98" r="2" fill="#1A1A3E" opacity="0.3"/>
      <Circle cx="150" cy="78" r="2" fill="#1A1A3E" opacity="0.3"/>
      <Rect x="22" y="26" width="32" height="28" rx="6" fill="#4A9FE8"/>
      <Rect x="26" y="30" width="10" height="3" rx="1" fill="#F5F0EB" opacity="0.5"/>
      <Rect x="26" y="36" width="14" height="3" rx="1" fill="#F5F0EB" opacity="0.4"/>
      <Rect x="26" y="42" width="8" height="3" rx="1" fill="#F5F0EB" opacity="0.3"/>
      <SvgText x="38" y="20" textAnchor="middle" fontSize="16" fill="#4A9FE8">📚</SvgText>
      <Rect x="146" y="26" width="32" height="28" rx="6" fill="#F4C542"/>
      <Polygon points="162,30 166,38 174,38 168,43 170,52 162,47 154,52 156,43 150,38 158,38" fill="#F5F0EB" opacity="0.6"/>
      <SvgText x="162" y="20" textAnchor="middle" fontSize="16" fill="#F4C542">🏆</SvgText>
      <Circle cx="100" cy="148" r="8" fill="#F5F0EB"/>
      <Rect x="94" y="156" width="12" height="16" rx="4" fill="#F5F0EB"/>
      <SvgText x="100" y="138" textAnchor="middle" fontSize="18" fontWeight="900" fill="#F4C542" fontFamily="Georgia, serif">?</SvgText>
      <Circle cx="76" cy="60" r="3" fill="#1B7A5A" opacity="0.4"/>
      <Circle cx="124" cy="58" r="3" fill="#E85D4A" opacity="0.4"/>
    </Svg>
  );
}
