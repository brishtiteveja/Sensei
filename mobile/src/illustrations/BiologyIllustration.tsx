import React from 'react';
import { Svg, Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function BiologyIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#2D6B4F"/>
            <Path d="M70 20 Q55 50 70 80 Q85 110 70 140 Q55 170 70 195" stroke="#A8E6CF" strokeWidth="5" fill="none" strokeLinecap="round"/>
            <Path d="M130 20 Q145 50 130 80 Q115 110 130 140 Q145 170 130 195" stroke="#A8E6CF" strokeWidth="5" fill="none" strokeLinecap="round"/>
            <Rect x="72" y="34" width="56" height="5" rx="2" fill="#E85D4A"/>
            <Rect x="68" y="56" width="60" height="5" rx="2" fill="#F4C542"/>
            <Rect x="72" y="78" width="56" height="5" rx="2" fill="#E85D4A"/>
            <Rect x="76" y="100" width="48" height="5" rx="2" fill="#F4C542"/>
            <Rect x="72" y="122" width="56" height="5" rx="2" fill="#E85D4A"/>
            <Rect x="68" y="144" width="60" height="5" rx="2" fill="#F4C542"/>
            <Rect x="72" y="166" width="56" height="5" rx="2" fill="#E85D4A"/>
            <Circle cx="78" cy="36" r="8" fill="#E85D4A"/>
            <SvgText x="78" y="40" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="sans-serif">A</SvgText>
            <Circle cx="122" cy="36" r="8" fill="#F4C542"/>
            <SvgText x="122" y="40" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1A1A3E" fontFamily="sans-serif">T</SvgText>
            <Circle cx="74" cy="58" r="8" fill="#F4C542"/>
            <SvgText x="74" y="62" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1A1A3E" fontFamily="sans-serif">G</SvgText>
            <Circle cx="126" cy="58" r="8" fill="#1B7A5A"/>
            <SvgText x="126" y="62" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="sans-serif">C</SvgText>
            <Path d="M158 24 Q170 40 160 56 Q150 44 158 24 Z" fill="#A8E6CF"/>
            <Line x1="159" y1="28" x2="156" y2="50" stroke="#2D6B4F" strokeWidth="1.5"/>
            <Path d="M30 150 Q18 166 28 180 Q38 168 30 150 Z" fill="#A8E6CF"/>
            <Line x1="29" y1="154" x2="32" y2="174" stroke="#2D6B4F" strokeWidth="1.5"/>
            <Circle cx="168" cy="150" r="14" fill="#A8E6CF" opacity="0.3"/>
            <Circle cx="168" cy="150" r="6" fill="#1B7A5A" opacity="0.6"/>
    </Svg>
  );
}
