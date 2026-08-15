import React from 'react';
import { Svg, Circle, Ellipse, Polygon, Rect } from 'react-native-svg';

interface Props { size?: number; }

export function GiftIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#7C5CBF"/>
      <Rect x="48" y="95" width="104" height="72" rx="8" fill="#1B7A5A"/>
      <Rect x="42" y="80" width="116" height="20" rx="6" fill="#2D6B4F"/>
      <Rect x="92" y="80" width="16" height="87" rx="2" fill="#F4C542"/>
      <Rect x="42" y="84" width="116" height="12" fill="#F4C542"/>
      <Ellipse cx="82" cy="72" rx="16" ry="14" fill="#F4C542" transform="rotate(-20 82 72)"/>
      <Ellipse cx="82" cy="72" rx="10" ry="8" fill="#7C5CBF" transform="rotate(-20 82 72)"/>
      <Ellipse cx="118" cy="72" rx="16" ry="14" fill="#F4C542" transform="rotate(20 118 72)"/>
      <Ellipse cx="118" cy="72" rx="10" ry="8" fill="#7C5CBF" transform="rotate(20 118 72)"/>
      <Circle cx="100" cy="78" r="8" fill="#F4C542"/>
      <Polygon points="42,40 44,46 50,46 45,50 47,56 42,52 37,56 39,50 34,46 40,46" fill="#F4C542" opacity="0.6"/>
      <Polygon points="158,38 160,44 166,44 161,48 163,54 158,50 153,54 155,48 150,44 156,44" fill="#E85D4A" opacity="0.5"/>
      <Polygon points="168,100 170,104 174,104 171,107 172,111 168,108 164,111 165,107 162,104 166,104" fill="#F5F0EB" opacity="0.4"/>
      <Circle cx="30" cy="60" r="3" fill="#F5F0EB" opacity="0.3"/>
      <Circle cx="172" cy="70" r="4" fill="#F4C542" opacity="0.3"/>
      <Rect x="50" y="32" width="4" height="8" rx="2" fill="#E85D4A" opacity="0.4" transform="rotate(15 52 36)"/>
      <Rect x="148" y="28" width="4" height="8" rx="2" fill="#1B7A5A" opacity="0.4" transform="rotate(-10 150 32)"/>
    </Svg>
  );
}
