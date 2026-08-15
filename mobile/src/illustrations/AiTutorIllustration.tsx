import React from 'react';
import { Svg, Circle, Line, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function AiTutorIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#6366F1"/>
            <Path d="M70 100 Q60 70 80 55 Q95 44 110 55 Q125 44 138 60 Q150 78 140 100 Q150 120 135 138 Q120 150 105 142 Q90 152 75 140 Q58 125 70 100 Z" fill="#F5F0EB"/>
            <Path d="M85 60 Q100 80 90 100" stroke="#6366F1" strokeWidth="2.5" fill="none" opacity="0.4"/>
            <Path d="M110 58 Q95 78 105 98" stroke="#6366F1" strokeWidth="2.5" fill="none" opacity="0.4"/>
            <Path d="M72 95 Q90 88 105 100 Q120 88 138 95" stroke="#6366F1" strokeWidth="2" fill="none" opacity="0.3"/>
            <Circle cx="82" cy="75" r="5" fill="#E85D4A"/>
            <Circle cx="78" cy="100" r="5" fill="#F4C542"/>
            <Circle cx="85" cy="125" r="5" fill="#1B7A5A"/>
            <Circle cx="118" cy="72" r="5" fill="#4A9FE8"/>
            <Circle cx="125" cy="98" r="5" fill="#E85D4A"/>
            <Circle cx="115" cy="122" r="5" fill="#F4C542"/>
            <Line x1="82" y1="75" x2="118" y2="72" stroke="#F4C542" strokeWidth="1.5" opacity="0.5"/>
            <Line x1="78" y1="100" x2="125" y2="98" stroke="#E85D4A" strokeWidth="1.5" opacity="0.5"/>
            <Line x1="85" y1="125" x2="115" y2="122" stroke="#4A9FE8" strokeWidth="1.5" opacity="0.5"/>
            <Line x1="82" y1="75" x2="78" y2="100" stroke="#1B7A5A" strokeWidth="1" opacity="0.3"/>
            <Line x1="78" y1="100" x2="85" y2="125" stroke="#E85D4A" strokeWidth="1" opacity="0.3"/>
            <Line x1="118" y1="72" x2="125" y2="98" stroke="#F4C542" strokeWidth="1" opacity="0.3"/>
            <Line x1="125" y1="98" x2="115" y2="122" stroke="#1B7A5A" strokeWidth="1" opacity="0.3"/>
            <Rect x="42" y="56" width="3" height="12" rx="1" fill="#F4C542" opacity="0.6"/>
            <Rect x="37" y="61" width="12" height="3" rx="1" fill="#F4C542" opacity="0.6"/>
            <Rect x="152" y="48" width="3" height="10" rx="1" fill="#E85D4A" opacity="0.5"/>
            <Rect x="148" y="52" width="10" height="3" rx="1" fill="#E85D4A" opacity="0.5"/>
            <Rect x="40" y="152" width="50" height="18" rx="8" fill="#F5F0EB" opacity="0.8"/>
            <Rect x="44" y="157" width="22" height="3" rx="1" fill="#6366F1" opacity="0.4"/>
            <Rect x="44" y="163" width="16" height="3" rx="1" fill="#6366F1" opacity="0.3"/>
            <Rect x="110" y="158" width="50" height="18" rx="8" fill="#4A9FE8" opacity="0.5"/>
            <Rect x="114" y="163" width="20" height="3" rx="1" fill="#F5F0EB" opacity="0.5"/>
            <Rect x="114" y="169" width="14" height="3" rx="1" fill="#F5F0EB" opacity="0.4"/>
    </Svg>
  );
}
