import React from 'react';
import { Svg, Circle, Line, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function ChemistryIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#1B7A5A"/>
            <Path d="M78 50 L78 110 L50 170 Q48 176 54 178 L146 178 Q152 176 150 170 L122 110 L122 50" fill="#F5F0EB"/>
            <Rect x="78" y="38" width="44" height="16" rx="4" fill="#F5F0EB"/>
            <Rect x="72" y="34" width="56" height="8" rx="4" fill="#D4C5B5"/>
            <Path d="M62 148 L138 148 L150 170 Q152 176 146 178 L54 178 Q48 176 50 170 Z" fill="#E85D4A" opacity="0.85"/>
            <Path d="M66 148 L134 148 L130 156 L70 156 Z" fill="#F4C542" opacity="0.3"/>
            <Circle cx="88" cy="160" r="5" fill="#F4C542" opacity="0.7"/>
            <Circle cx="108" cy="152" r="7" fill="#F4C542" opacity="0.5"/>
            <Circle cx="96" cy="142" r="4" fill="#F4C542" opacity="0.6"/>
            <Circle cx="116" cy="164" r="3" fill="#F4C542" opacity="0.8"/>
            <Circle cx="80" cy="148" r="3" fill="#F4C542" opacity="0.4"/>
            <Circle cx="92" cy="28" r="3" fill="#F5F0EB" opacity="0.3"/>
            <Circle cx="100" cy="22" r="4" fill="#F5F0EB" opacity="0.2"/>
            <Circle cx="110" cy="26" r="2.5" fill="#F5F0EB" opacity="0.25"/>
            <Circle cx="160" cy="60" r="10" fill="#E85D4A"/>
            <Circle cx="175" cy="48" r="7" fill="#F4C542"/>
            <Circle cx="175" cy="72" r="7" fill="#F4C542"/>
            <Line x1="160" y1="60" x2="175" y2="48" stroke="#F5F0EB" strokeWidth="2.5"/>
            <Line x1="160" y1="60" x2="175" y2="72" stroke="#F5F0EB" strokeWidth="2.5"/>
            <Circle cx="36" cy="80" r="8" fill="#F4C542"/>
            <Circle cx="24" cy="68" r="6" fill="#E85D4A"/>
            <Line x1="36" y1="80" x2="24" y2="68" stroke="#F5F0EB" strokeWidth="2"/>
    </Svg>
  );
}
