import React from 'react';
import { Svg, Circle, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function BanglaIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#006A4E" />
      <Rect x="88" y="30" width="24" height="100" rx="4" fill="#F5F0EB" />
      <Rect x="60" y="50" width="16" height="80" rx="4" fill="#F5F0EB" opacity="0.7" transform="rotate(-8 68 90)" />
      <Rect x="124" y="50" width="16" height="80" rx="4" fill="#F5F0EB" opacity="0.7" transform="rotate(8 132 90)" />
      <Rect x="44" y="128" width="112" height="12" rx="4" fill="#F5F0EB" />
      <Rect x="54" y="138" width="92" height="8" rx="3" fill="#D4C5B5" />
      <Circle cx="100" cy="72" r="18" fill="#F42A41" />
      <SvgText x="100" y="170" textAnchor="middle" fontSize="28" fontWeight="900" fill="#F4C542" fontFamily="sans-serif">অ আ ক</SvgText>
      <Circle cx="32" cy="32" r="10" fill="#F42A41" opacity="0.3" />
      <Circle cx="32" cy="32" r="5" fill="#F42A41" opacity="0.5" />
      <Circle cx="168" cy="32" r="10" fill="#F4C542" opacity="0.3" />
      <Circle cx="168" cy="32" r="5" fill="#F4C542" opacity="0.5" />
      <Circle cx="32" cy="168" r="8" fill="#F4C542" opacity="0.3" />
      <Circle cx="168" cy="168" r="8" fill="#F42A41" opacity="0.3" />
      <Circle cx="50" cy="100" r="3" fill="#F5F0EB" opacity="0.4" />
      <Circle cx="150" cy="100" r="3" fill="#F5F0EB" opacity="0.4" />
    </Svg>
  );
}
