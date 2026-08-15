import React from 'react';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function StreakIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#E8924A"/>
            <Path d="M100 30 Q130 70 125 110 Q120 145 100 160 Q80 145 75 110 Q70 70 100 30 Z" fill="#F4C542"/>
            <Path d="M100 60 Q118 85 115 115 Q112 140 100 150 Q88 140 85 115 Q82 85 100 60 Z" fill="#E85D4A"/>
            <Path d="M100 90 Q110 105 108 125 Q106 140 100 145 Q94 140 92 125 Q90 105 100 90 Z" fill="#F5F0EB"/>
            <Path d="M95 45 Q90 60 92 75" stroke="#F5F0EB" strokeWidth="2" fill="none" opacity="0.4"/>
            <Circle cx="40" cy="172" r="7" fill="#F5F0EB"/>
            <Circle cx="58" cy="172" r="7" fill="#F5F0EB"/>
            <Circle cx="76" cy="172" r="7" fill="#F5F0EB"/>
            <Circle cx="94" cy="172" r="7" fill="#F5F0EB"/>
            <Circle cx="112" cy="172" r="7" fill="#F5F0EB"/>
            <Circle cx="130" cy="172" r="7" fill="#F4C542"/>
            <Circle cx="148" cy="172" r="7" fill="#1A1A3E" opacity="0.3"/>
            <Path d="M37 172 L39 175 L44 169" stroke="#1B7A5A" strokeWidth="2" strokeLinecap="round"/>
            <Path d="M55 172 L57 175 L62 169" stroke="#1B7A5A" strokeWidth="2" strokeLinecap="round"/>
            <Path d="M73 172 L75 175 L80 169" stroke="#1B7A5A" strokeWidth="2" strokeLinecap="round"/>
            <Path d="M91 172 L93 175 L98 169" stroke="#1B7A5A" strokeWidth="2" strokeLinecap="round"/>
            <Path d="M109 172 L111 175 L116 169" stroke="#1B7A5A" strokeWidth="2" strokeLinecap="round"/>
            <SvgText x="130" y="176" textAnchor="middle" fontSize="9" fontWeight="900" fill="#1A1A3E" fontFamily="sans-serif">6</SvgText>
            <Circle cx="65" cy="42" r="3" fill="#F4C542" opacity="0.5"/>
            <Circle cx="140" cy="50" r="4" fill="#F4C542" opacity="0.4"/>
            <Circle cx="50" cy="80" r="2" fill="#E85D4A" opacity="0.4"/>
            <Circle cx="152" cy="88" r="3" fill="#E85D4A" opacity="0.3"/>
            <Rect x="55" y="30" width="3" height="8" rx="1" fill="#F4C542" opacity="0.4"/>
            <Rect x="145" y="36" width="3" height="8" rx="1" fill="#F4C542" opacity="0.3"/>
    </Svg>
  );
}
