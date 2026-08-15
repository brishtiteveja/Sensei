import React from 'react';
import { Svg, Circle, Rect, Path, Ellipse, Line, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function GKIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#E8924A" />
      <Circle cx="100" cy="108" r="52" fill="#4A9FE8" />
      <Path d="M80 72 Q90 68 95 75 L98 85 Q92 90 85 88 L78 80 Z" fill="#1B7A5A" />
      <Path d="M102 70 Q120 65 130 78 L135 95 Q125 100 118 92 L108 80 Z" fill="#1B7A5A" />
      <Path d="M70 100 Q78 95 88 100 L92 115 Q85 120 75 115 Z" fill="#2D6B4F" />
      <Path d="M110 98 Q125 95 135 105 L138 118 Q128 125 118 118 L112 108 Z" fill="#2D6B4F" />
      <Path d="M88 125 Q100 120 112 128 L108 140 Q100 145 92 140 Z" fill="#1B7A5A" />
      <Ellipse cx="100" cy="108" rx="52" ry="20" stroke="#fff" strokeWidth="1" opacity="0.15" />
      <Ellipse cx="100" cy="108" rx="20" ry="52" stroke="#fff" strokeWidth="1" opacity="0.15" />
      <Line x1="48" y1="108" x2="152" y2="108" stroke="#fff" strokeWidth="1" opacity="0.1" />
      <Circle cx="78" cy="82" r="12" fill="#fff" opacity="0.12" />
      <Circle cx="100" cy="36" r="18" fill="#F4C542" />
      <Rect x="94" y="52" width="12" height="8" rx="2" fill="#D4C5B5" />
      <Rect x="96" y="58" width="8" height="3" rx="1" fill="#D4C5B5" />
      <Path d="M96 38 Q100 44 104 38" stroke="#E8924A" strokeWidth="2" fill="none" />
      <Rect x="98" y="12" width="4" height="8" rx="2" fill="#F4C542" opacity="0.6" />
      <Rect x="120" y="22" width="4" height="8" rx="2" fill="#F4C542" opacity="0.5" transform="rotate(45 122 26)" />
      <Rect x="76" y="22" width="4" height="8" rx="2" fill="#F4C542" opacity="0.5" transform="rotate(-45 78 26)" />
      <SvgText x="158" y="70" fontSize="24" fontWeight="900" fill="#F5F0EB" opacity="0.3" fontFamily="Georgia, serif">?</SvgText>
      <Circle cx="40" cy="45" r="3" fill="#F4C542" opacity="0.5" />
    </Svg>
  );
}
