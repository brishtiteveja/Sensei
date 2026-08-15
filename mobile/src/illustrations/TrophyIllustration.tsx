import React from 'react';
import { Svg, Circle, Path, Polygon, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function TrophyIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#F4C542"/>
      <Path d="M66 50 L134 50 L126 110 Q120 130 100 134 Q80 130 74 110 Z" fill="#F5F0EB"/>
      <Path d="M78 56 L82 56 L78 100 L74 100 Z" fill="#F4C542" opacity="0.2"/>
      <Path d="M66 58 Q40 58 40 82 Q40 100 60 102" stroke="#F5F0EB" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <Path d="M134 58 Q160 58 160 82 Q160 100 140 102" stroke="#F5F0EB" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <Rect x="92" y="134" width="16" height="18" rx="3" fill="#D4C5B5"/>
      <Rect x="72" y="150" width="56" height="12" rx="4" fill="#F5F0EB"/>
      <Rect x="78" y="160" width="44" height="8" rx="3" fill="#D4C5B5"/>
      <Polygon points="100,72 105,84 118,84 108,92 112,104 100,96 88,104 92,92 82,84 95,84" fill="#F4C542"/>
      <Circle cx="38" cy="36" r="5" fill="#E85D4A"/>
      <Circle cx="162" cy="40" r="4" fill="#1B7A5A"/>
      <Circle cx="30" cy="120" r="3" fill="#4A9FE8"/>
      <Circle cx="170" cy="130" r="4" fill="#E85D4A"/>
      <Rect x="50" y="26" width="4" height="10" rx="2" fill="#7C5CBF" opacity="0.6" transform="rotate(-20 52 31)"/>
      <Rect x="150" y="24" width="4" height="10" rx="2" fill="#F4C542" opacity="0.6" transform="rotate(15 152 29)"/>
      <Rect x="26" y="80" width="4" height="8" rx="2" fill="#1B7A5A" opacity="0.5"/>
      <Rect x="172" y="90" width="4" height="8" rx="2" fill="#7C5CBF" opacity="0.5"/>
      <Circle cx="55" cy="175" r="2" fill="#E85D4A" opacity="0.5"/>
      <Circle cx="145" cy="175" r="2" fill="#4A9FE8" opacity="0.5"/>
    </Svg>
  );
}
