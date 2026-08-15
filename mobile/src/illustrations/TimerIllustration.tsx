import React from 'react';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props { size?: number; }

export function TimerIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#E85D4A"/>
      <Rect x="60" y="30" width="80" height="8" rx="3" fill="#F5F0EB"/>
      <Rect x="60" y="162" width="80" height="8" rx="3" fill="#F5F0EB"/>
      <Path d="M68 38 L68 80 Q68 100 100 100 Q132 100 132 80 L132 38 Z" fill="#F5F0EB" opacity="0.2"/>
      <Path d="M68 162 L68 120 Q68 100 100 100 Q132 100 132 120 L132 162 Z" fill="#F5F0EB" opacity="0.2"/>
      <Path d="M72 38 L72 65 Q72 78 100 85 Q128 78 128 65 L128 38 Z" fill="#F4C542" opacity="0.7"/>
      <Rect x="98" y="85" width="4" height="30" rx="2" fill="#F4C542" opacity="0.6"/>
      <Path d="M72 162 L72 145 Q72 135 100 130 Q128 135 128 145 L128 162 Z" fill="#F4C542"/>
      <Circle cx="97" cy="118" r="1.5" fill="#F4C542" opacity="0.5"/>
      <Circle cx="103" cy="122" r="1" fill="#F4C542" opacity="0.4"/>
      <Circle cx="100" cy="126" r="1.5" fill="#F4C542" opacity="0.6"/>
      <SvgText x="100" y="190" textAnchor="middle" fontSize="12" fontWeight="800" fill="#F5F0EB" opacity="0.6" fontFamily="sans-serif">৫:০০</SvgText>
      <Rect x="40" y="60" width="3" height="10" rx="1" fill="#F4C542" opacity="0.4"/>
      <Rect x="36" y="64" width="10" height="3" rx="1" fill="#F4C542" opacity="0.4"/>
      <Rect x="155" y="55" width="3" height="10" rx="1" fill="#F5F0EB" opacity="0.3"/>
      <Rect x="151" y="59" width="10" height="3" rx="1" fill="#F5F0EB" opacity="0.3"/>
    </Svg>
  );
}
