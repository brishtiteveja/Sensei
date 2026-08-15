import React from 'react';
import { Svg, Circle, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function ProgressIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#1B7A5A"/>
      <Rect x="36" y="140" width="22" height="32" rx="4" fill="#A8E6CF"/>
      <Rect x="64" y="115" width="22" height="57" rx="4" fill="#A8E6CF"/>
      <Rect x="92" y="90" width="22" height="82" rx="4" fill="#F4C542"/>
      <Rect x="120" y="70" width="22" height="102" rx="4" fill="#F4C542"/>
      <Rect x="148" y="45" width="22" height="127" rx="4" fill="#E85D4A"/>
      <Path d="M47 138 L75 113 L103 88 L131 68 L159 43" stroke="#F5F0EB" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="47" cy="138" r="4" fill="#F5F0EB"/>
      <Circle cx="75" cy="113" r="4" fill="#F5F0EB"/>
      <Circle cx="103" cy="88" r="4" fill="#F5F0EB"/>
      <Circle cx="131" cy="68" r="4" fill="#F5F0EB"/>
      <Circle cx="159" cy="43" r="5" fill="#F5F0EB"/>
      <Polygon points="159,28 165,38 153,38" fill="#F5F0EB"/>
      <Rect x="28" y="26" width="52" height="24" rx="10" fill="#F5F0EB"/>
      <SvgText x="54" y="43" textAnchor="middle" fontSize="14" fontWeight="900" fill="#1B7A5A" fontFamily="sans-serif">+87%</SvgText>
      <Rect x="170" y="22" width="3" height="10" rx="1" fill="#F4C542" opacity="0.6"/>
      <Rect x="166" y="26" width="10" height="3" rx="1" fill="#F4C542" opacity="0.6"/>
    </Svg>
  );
}
