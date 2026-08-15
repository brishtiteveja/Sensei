import React from 'react';
import { Svg, Circle, Rect, Polygon, Path, Ellipse, Line, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function EnglishIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#7C5CBF" />
      <Rect x="24" y="40" width="100" height="56" rx="16" fill="#F4C542" />
      <Polygon points="50,96 62,96 44,112" fill="#F4C542" />
      <SvgText x="74" y="62" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A1A3E" fontFamily="sans-serif">আমি শিখছি</SvgText>
      <SvgText x="74" y="82" textAnchor="middle" fontSize="11" fill="#1A1A3E" opacity="0.5" fontFamily="sans-serif">I am learning</SvgText>
      <Rect x="76" y="90" width="105" height="56" rx="16" fill="#F5F0EB" />
      <Polygon points="148,146 136,146 154,162" fill="#F5F0EB" />
      <SvgText x="128" y="114" textAnchor="middle" fontSize="16" fontWeight="900" fill="#7C5CBF" fontFamily="Georgia, serif">Hello!</SvgText>
      <SvgText x="128" y="132" textAnchor="middle" fontSize="11" fill="#7C5CBF" opacity="0.5" fontFamily="sans-serif">হ্যালো!</SvgText>
      <Path d="M108 88 Q116 82 124 88" stroke="#F5F0EB" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Polygon points="124,85 128,89 122,91" fill="#F5F0EB" />
      <SvgText x="170" y="42" fontSize="28" fontWeight="900" fill="#F5F0EB" opacity="0.2" fontFamily="Georgia, serif">A</SvgText>
      <SvgText x="22" y="170" fontSize="22" fontWeight="900" fill="#F5F0EB" opacity="0.15" fontFamily="sans-serif">ক</SvgText>
      <Circle cx="40" cy="168" r="14" fill="#F5F0EB" opacity="0.12" />
      <Ellipse cx="40" cy="168" rx="14" ry="6" stroke="#F5F0EB" strokeWidth="1" opacity="0.15" />
      <Line x1="26" y1="168" x2="54" y2="168" stroke="#F5F0EB" strokeWidth="1" opacity="0.1" />
      <Circle cx="168" cy="68" r="4" fill="#E85D4A" opacity="0.5" />
      <Circle cx="30" cy="28" r="3" fill="#A8E6CF" opacity="0.4" />
    </Svg>
  );
}
