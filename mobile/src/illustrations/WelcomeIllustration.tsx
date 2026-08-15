import React from 'react';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function WelcomeIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#006A4E"/>
      <Rect x="75" y="55" width="50" height="70" rx="18" fill="#E8924A"/>
      <Rect x="78" y="38" width="12" height="34" rx="6" fill="#E8924A"/>
      <Rect x="92" y="32" width="12" height="38" rx="6" fill="#E8924A"/>
      <Rect x="106" y="36" width="12" height="34" rx="6" fill="#E8924A"/>
      <Rect x="118" y="44" width="11" height="28" rx="5.5" fill="#E8924A"/>
      <Rect x="63" y="68" width="16" height="26" rx="8" fill="#E8924A" transform="rotate(-15 71 81)"/>
      <Path d="M82 80 Q100 76 118 82" stroke="#D4785A" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <Rect x="134" y="48" width="18" height="3" rx="1.5" fill="#F4C542" opacity="0.5"/>
      <Rect x="138" y="58" width="14" height="3" rx="1.5" fill="#F4C542" opacity="0.4"/>
      <Rect x="136" y="68" width="16" height="3" rx="1.5" fill="#F4C542" opacity="0.3"/>
      <Rect x="46" y="50" width="16" height="3" rx="1.5" fill="#F4C542" opacity="0.4"/>
      <Rect x="50" y="60" width="12" height="3" rx="1.5" fill="#F4C542" opacity="0.3"/>
      <Rect x="20" y="130" width="70" height="24" rx="10" fill="#F5F0EB"/>
      <SvgText x="55" y="146" textAnchor="middle" fontSize="11" fontWeight="700" fill="#006A4E" fontFamily="sans-serif">আসসালামু আলাইকুম</SvgText>
      <Rect x="110" y="140" width="72" height="24" rx="10" fill="#F4C542"/>
      <SvgText x="146" y="156" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1A1A3E" fontFamily="sans-serif">নমস্কার!</SvgText>
      <Rect x="50" y="164" width="50" height="20" rx="8" fill="#E85D4A" opacity="0.8"/>
      <SvgText x="75" y="178" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F5F0EB" fontFamily="sans-serif">Hello!</SvgText>
      <Circle cx="36" cy="36" r="4" fill="#F4C542" opacity="0.6"/>
      <Circle cx="165" cy="30" r="3" fill="#F5F0EB" opacity="0.5"/>
      <Circle cx="170" cy="110" r="5" fill="#F4C542" opacity="0.3"/>
      <Rect x="28" y="96" width="3" height="10" rx="1" fill="#F5F0EB" opacity="0.4"/>
      <Rect x="24" y="100" width="10" height="3" rx="1" fill="#F5F0EB" opacity="0.4"/>
    </Svg>
  );
}
