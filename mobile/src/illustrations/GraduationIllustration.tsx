import React from 'react';
import { Svg, Circle, Path, Polygon, Rect } from 'react-native-svg';

interface Props { size?: number; }

export function GraduationIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#1A1A3E"/>
      <Polygon points="100,45 160,70 100,88 40,70" fill="#1A1A3E" stroke="#F5F0EB" strokeWidth="2"/>
      <Polygon points="100,45 160,70 100,88 40,70" fill="#F5F0EB" opacity="0.1"/>
      <Circle cx="100" cy="68" r="5" fill="#F4C542"/>
      <Path d="M100 68 L100 58 L130 48" stroke="#F4C542" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <Circle cx="130" cy="48" r="4" fill="#F4C542"/>
      <Rect x="127" y="52" width="6" height="14" rx="2" fill="#F4C542"/>
      <Path d="M60 78 Q60 90 100 95 Q140 90 140 78" stroke="#F5F0EB" strokeWidth="2" fill="none"/>
      <Rect x="72" y="115" width="56" height="40" rx="6" fill="#F5F0EB"/>
      <Circle cx="72" cy="135" r="6" fill="#D4C5B5"/>
      <Circle cx="128" cy="135" r="6" fill="#D4C5B5"/>
      <Rect x="82" y="124" width="36" height="3" rx="1" fill="#1A1A3E" opacity="0.2"/>
      <Rect x="86" y="132" width="28" height="3" rx="1" fill="#1A1A3E" opacity="0.15"/>
      <Rect x="90" y="140" width="20" height="3" rx="1" fill="#1A1A3E" opacity="0.1"/>
      <Circle cx="100" cy="148" r="6" fill="#E85D4A"/>
      <Path d="M96 154 L94 166" stroke="#E85D4A" strokeWidth="2"/>
      <Path d="M104 154 L106 166" stroke="#E85D4A" strokeWidth="2"/>
      <Circle cx="38" cy="40" r="3" fill="#F4C542" opacity="0.6"/>
      <Circle cx="165" cy="35" r="4" fill="#E85D4A" opacity="0.5"/>
      <Circle cx="30" cy="120" r="2" fill="#4A9FE8" opacity="0.4"/>
      <Circle cx="172" cy="115" r="3" fill="#1B7A5A" opacity="0.4"/>
      <Rect x="50" y="30" width="6" height="3" rx="1" fill="#7C5CBF" opacity="0.5" transform="rotate(25 53 31)"/>
      <Rect x="148" y="26" width="6" height="3" rx="1" fill="#F4C542" opacity="0.4" transform="rotate(-20 151 27)"/>
      <Polygon points="170,78 172,84 178,84 173,88 175,94 170,90 165,94 167,88 162,84 168,84" fill="#F4C542" opacity="0.4"/>
    </Svg>
  );
}
