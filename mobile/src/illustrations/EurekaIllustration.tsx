import React from 'react';
import { Svg, Circle, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

interface Props { size?: number; }

export function EurekaIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#F4C542"/>
      <Circle cx="100" cy="80" r="45" fill="#F5F0EB"/>
      <Path d="M88 72 Q94 85 100 72 Q106 85 112 72" stroke="#F4C542" strokeWidth="3" fill="none"/>
      <Rect x="85" y="122" width="30" height="10" rx="3" fill="#D4C5B5"/>
      <Rect x="88" y="130" width="24" height="6" rx="2" fill="#D4C5B5"/>
      <Rect x="91" y="134" width="18" height="6" rx="2" fill="#D4C5B5"/>
      <Rect x="85" y="124" width="30" height="2" fill="#B5A89A" opacity="0.3"/>
      <Rect x="85" y="128" width="30" height="2" fill="#B5A89A" opacity="0.3"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(45 100 80)"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(90 100 80)"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(135 100 80)"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(180 100 80)"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(225 100 80)"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(270 100 80)"/>
      <Rect x="98" y="18" width="4" height="16" rx="2" fill="#F5F0EB" opacity="0.7" transform="rotate(315 100 80)"/>
      <SvgText x="100" y="170" textAnchor="middle" fontSize="22" fontWeight="900" fill="#F5F0EB" fontFamily="sans-serif">বুঝেছি!</SvgText>
      <Polygon points="35,50 37,56 43,56 38,60 40,66 35,62 30,66 32,60 27,56 33,56" fill="#E85D4A" opacity="0.6"/>
      <Polygon points="165,45 167,51 173,51 168,55 170,61 165,57 160,61 162,55 157,51 163,51" fill="#1B7A5A" opacity="0.5"/>
      <Circle cx="40" cy="130" r="4" fill="#E85D4A" opacity="0.4"/>
      <Circle cx="160" cy="125" r="3" fill="#4A9FE8" opacity="0.4"/>
    </Svg>
  );
}
