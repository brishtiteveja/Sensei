import React from 'react';
import { Svg, Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function PracticeIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#E85D4A"/>
            <Circle cx="100" cy="95" r="60" fill="#F5F0EB"/>
            <Circle cx="100" cy="95" r="48" fill="#E85D4A" opacity="0.2"/>
            <Circle cx="100" cy="95" r="36" fill="#F5F0EB"/>
            <Circle cx="100" cy="95" r="24" fill="#E85D4A" opacity="0.2"/>
            <Circle cx="100" cy="95" r="12" fill="#F4C542"/>
            <Circle cx="100" cy="95" r="4" fill="#1A1A3E"/>
            <Line x1="145" y1="50" x2="104" y2="91" stroke="#1A1A3E" strokeWidth="3" strokeLinecap="round"/>
            <Polygon points="100,91 108,85 106,95" fill="#1A1A3E"/>
            <Rect x="144" y="42" width="14" height="5" rx="2" fill="#1B7A5A" transform="rotate(10 151 44)"/>
            <Rect x="148" y="48" width="14" height="5" rx="2" fill="#4A9FE8" transform="rotate(-10 155 50)"/>
            <Path d="M38 148 L44 156 L56 140" stroke="#F5F0EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M140 150 L146 158 L158 142" stroke="#F4C542" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="46" cy="52" r="8" fill="#F4C542" opacity="0.5"/>
            <Circle cx="46" cy="52" r="4" fill="#F4C542"/>
            <Circle cx="158" cy="120" r="6" fill="#F5F0EB" opacity="0.4"/>
    </Svg>
  );
}
