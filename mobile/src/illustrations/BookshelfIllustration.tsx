import React from 'react';
import { Svg, Circle, Ellipse, Rect } from 'react-native-svg';

interface Props { size?: number; }

export function BookshelfIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#2D6B4F"/>
      <Rect x="28" y="72" width="144" height="4" rx="1" fill="#D4C5B5"/>
      <Rect x="32" y="30" width="16" height="42" rx="2" fill="#E85D4A"/>
      <Rect x="34" y="34" width="2" height="34" rx="1" fill="#F5F0EB" opacity="0.3"/>
      <Rect x="50" y="36" width="14" height="36" rx="2" fill="#4A9FE8"/>
      <Rect x="66" y="28" width="18" height="44" rx="2" fill="#F4C542"/>
      <Rect x="70" y="32" width="10" height="3" rx="1" fill="#1A1A3E" opacity="0.2"/>
      <Rect x="70" y="38" width="6" height="3" rx="1" fill="#1A1A3E" opacity="0.15"/>
      <Rect x="86" y="40" width="12" height="32" rx="2" fill="#7C5CBF"/>
      <Rect x="100" y="32" width="20" height="40" rx="2" fill="#1B7A5A"/>
      <Rect x="104" y="36" width="12" height="3" rx="1" fill="#F5F0EB" opacity="0.3"/>
      <Rect x="122" y="38" width="14" height="34" rx="2" fill="#E8924A"/>
      <Rect x="138" y="34" width="16" height="38" rx="2" fill="#F2A7B3"/>
      <Rect x="156" y="42" width="12" height="30" rx="2" fill="#4A9FE8" opacity="0.7"/>
      <Rect x="28" y="130" width="144" height="4" rx="1" fill="#D4C5B5"/>
      <Rect x="32" y="90" width="18" height="40" rx="2" fill="#F4C542"/>
      <Rect x="52" y="96" width="14" height="34" rx="2" fill="#1B7A5A"/>
      <Rect x="68" y="88" width="16" height="42" rx="2" fill="#E85D4A"/>
      <Rect x="86" y="94" width="12" height="36" rx="2" fill="#4A9FE8"/>
      <Rect x="100" y="92" width="16" height="38" rx="2" fill="#7C5CBF" transform="rotate(8 108 111)"/>
      <Circle cx="140" cy="118" r="10" fill="#4A9FE8" opacity="0.6"/>
      <Ellipse cx="140" cy="118" rx="10" ry="4" stroke="#F5F0EB" strokeWidth="0.5" opacity="0.3"/>
      <Rect x="156" y="112" width="8" height="18" rx="3" fill="#E8924A" opacity="0.7"/>
      <Circle cx="160" cy="106" r="8" fill="#A8E6CF"/>
      <Circle cx="155" cy="102" r="5" fill="#1B7A5A" opacity="0.7"/>
      <Rect x="28" y="170" width="144" height="4" rx="1" fill="#D4C5B5" opacity="0.5"/>
      <Rect x="36" y="140" width="22" height="30" rx="2" fill="#F5F0EB"/>
      <Rect x="40" y="146" width="14" height="3" rx="1" fill="#2D6B4F" opacity="0.3"/>
      <Rect x="40" y="152" width="10" height="3" rx="1" fill="#2D6B4F" opacity="0.2"/>
      <Rect x="62" y="144" width="16" height="26" rx="2" fill="#E85D4A" opacity="0.8"/>
      <Rect x="80" y="138" width="14" height="32" rx="2" fill="#F4C542" opacity="0.8"/>
      <Circle cx="90" y="24" cy="24" r="3" fill="#F4C542" opacity="0.4"/>
    </Svg>
  );
}
