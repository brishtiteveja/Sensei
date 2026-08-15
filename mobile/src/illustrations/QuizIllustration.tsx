import React from 'react';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props { size?: number; }

export function QuizIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#F4C542"/>
            <Rect x="48" y="38" width="104" height="140" rx="10" fill="#F5F0EB"/>
            <Rect x="78" y="28" width="44" height="20" rx="6" fill="#D4C5B5"/>
            <Rect x="88" y="24" width="24" height="12" rx="6" fill="#1A1A3E"/>
            <Rect x="62" y="58" width="76" height="4" rx="2" fill="#1A1A3E" opacity="0.2"/>
            <Rect x="62" y="68" width="52" height="4" rx="2" fill="#1A1A3E" opacity="0.15"/>
            <Rect x="62" y="84" width="76" height="22" rx="6" fill="#1B7A5A" opacity="0.15"/>
            <Circle cx="74" cy="95" r="6" fill="#1B7A5A"/>
            <Path d="M71 95 L73 98 L78 91" stroke="#F5F0EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Rect x="84" y="92" width="40" height="4" rx="2" fill="#1A1A3E" opacity="0.25"/>
            <Rect x="62" y="112" width="76" height="22" rx="6" fill="#E85D4A" opacity="0.1"/>
            <Circle cx="74" cy="123" r="6" fill="#E85D4A" opacity="0.3"/>
            <Rect x="84" y="120" width="36" height="4" rx="2" fill="#1A1A3E" opacity="0.15"/>
            <Rect x="62" y="140" width="76" height="22" rx="6" fill="#1A1A3E" opacity="0.05"/>
            <Circle cx="74" cy="151" r="6" fill="#1A1A3E" opacity="0.15"/>
            <Rect x="84" y="148" width="44" height="4" rx="2" fill="#1A1A3E" opacity="0.12"/>
            <SvgText x="160" y="58" fontSize="36" fontWeight="900" fill="#1A1A3E" opacity="0.15" fontFamily="Georgia, serif">?</SvgText>
            <Circle cx="164" cy="82" r="12" fill="#1B7A5A"/>
            <Path d="M158 82 L162 87 L171 76" stroke="#F5F0EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="38" cy="50" r="14" fill="#E85D4A"/>
            <SvgText x="38" y="55" textAnchor="middle" fontSize="12" fontWeight="900" fill="#F5F0EB" fontFamily="sans-serif">A+</SvgText>
    </Svg>
  );
}
