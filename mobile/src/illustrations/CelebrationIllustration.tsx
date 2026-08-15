import React from 'react';
import { Svg, Circle, Path, Polygon, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function CelebrationIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#F4C542"/>
      <Polygon points="100,30 108,70 148,50 118,82 158,100 118,110 148,142 108,120 100,160 92,120 52,142 82,110 42,100 82,82 52,50 92,70" fill="#F5F0EB" opacity="0.3"/>
      <Circle cx="100" cy="100" r="32" fill="#F5F0EB"/>
      <Path d="M82 100 L94 114 L120 84" stroke="#1B7A5A" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Rect x="30" y="40" width="8" height="4" rx="2" fill="#E85D4A" transform="rotate(-30 34 42)"/>
      <Rect x="160" y="35" width="8" height="4" rx="2" fill="#4A9FE8" transform="rotate(20 164 37)"/>
      <Rect x="40" y="150" width="8" height="4" rx="2" fill="#7C5CBF" transform="rotate(45 44 152)"/>
      <Rect x="155" y="145" width="8" height="4" rx="2" fill="#1B7A5A" transform="rotate(-15 159 147)"/>
      <Rect x="25" y="95" width="6" height="3" rx="1.5" fill="#E85D4A" transform="rotate(60 28 96)"/>
      <Rect x="170" y="90" width="6" height="3" rx="1.5" fill="#7C5CBF" transform="rotate(-40 173 91)"/>
      <Circle cx="48" cy="60" r="4" fill="#4A9FE8"/>
      <Circle cx="152" cy="65" r="3" fill="#E85D4A"/>
      <Circle cx="55" cy="130" r="3" fill="#1B7A5A"/>
      <Circle cx="148" cy="125" r="4" fill="#7C5CBF"/>
      <Circle cx="70" cy="35" r="2.5" fill="#F5F0EB"/>
      <Circle cx="130" cy="30" r="2" fill="#E85D4A"/>
      <Circle cx="35" cy="120" r="2" fill="#F4C542"/>
      <Circle cx="168" cy="110" r="2.5" fill="#F4C542"/>
      <Polygon points="78,28 80,34 86,34 81,38 83,44 78,40 73,44 75,38 70,34 76,34" fill="#E85D4A" opacity="0.7"/>
      <Polygon points="140,160 142,166 148,166 143,170 145,176 140,172 135,176 137,170 132,166 138,166" fill="#4A9FE8" opacity="0.7"/>
    </Svg>
  );
}
