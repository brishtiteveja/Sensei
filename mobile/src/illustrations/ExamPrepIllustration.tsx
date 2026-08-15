import React from 'react';
import { Svg, Circle, Line, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function ExamPrepIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#0F172A"/>
      <Rect x="20" y="130" width="160" height="10" rx="3" fill="#D4C5B5"/>
      <Rect x="30" y="140" width="6" height="40" rx="2" fill="#D4C5B5"/>
      <Rect x="164" y="140" width="6" height="40" rx="2" fill="#D4C5B5"/>
      <Rect x="30" y="108" width="40" height="8" rx="2" fill="#E85D4A"/>
      <Rect x="32" y="100" width="36" height="8" rx="2" fill="#4A9FE8"/>
      <Rect x="28" y="92" width="42" height="8" rx="2" fill="#F4C542"/>
      <Rect x="34" y="84" width="34" height="8" rx="2" fill="#1B7A5A"/>
      <Rect x="80" y="96" width="52" height="36" rx="4" fill="#F5F0EB"/>
      <Rect x="104" y="96" width="2" height="36" fill="#D4C5B5" opacity="0.4"/>
      <Rect x="86" y="102" width="14" height="2" rx="1" fill="#1A1A3E" opacity="0.15"/>
      <Rect x="86" y="108" width="12" height="2" rx="1" fill="#1A1A3E" opacity="0.1"/>
      <Rect x="86" y="114" width="16" height="2" rx="1" fill="#E85D4A" opacity="0.3"/>
      <Rect x="110" y="102" width="16" height="2" rx="1" fill="#1A1A3E" opacity="0.15"/>
      <Rect x="110" y="108" width="12" height="2" rx="1" fill="#1A1A3E" opacity="0.1"/>
      <Rect x="140" y="114" width="4" height="18" rx="1.5" fill="#F4C542" transform="rotate(30 142 123)"/>
      <Circle cx="150" cy="52" r="20" fill="#F5F0EB"/>
      <Circle cx="150" cy="52" r="17" fill="#0F172A"/>
      <Line x1="150" y1="52" x2="150" y2="40" stroke="#F5F0EB" strokeWidth="2" strokeLinecap="round"/>
      <Line x1="150" y1="52" x2="158" y2="56" stroke="#E85D4A" strokeWidth="1.5" strokeLinecap="round"/>
      <Circle cx="150" cy="52" r="2" fill="#F5F0EB"/>
      <Circle cx="55" cy="60" r="20" fill="#F4C542" opacity="0.08"/>
      <Circle cx="55" cy="60" r="12" fill="#F4C542" opacity="0.12"/>
      <Rect x="53" y="72" width="4" height="20" rx="2" fill="#D4C5B5" opacity="0.5"/>
      <Path d="M42 72 Q55 58 68 72" fill="#F4C542" opacity="0.4"/>
      <Rect x="146" y="118" width="14" height="14" rx="3" fill="#D4C5B5"/>
      <Path d="M160 122 Q166 126 160 130" stroke="#D4C5B5" strokeWidth="2" fill="none"/>
      <Path d="M150 114 Q152 108 150 104" stroke="#F5F0EB" strokeWidth="1" opacity="0.2"/>
      <Path d="M154 116 Q156 110 154 106" stroke="#F5F0EB" strokeWidth="1" opacity="0.15"/>
    </Svg>
  );
}
