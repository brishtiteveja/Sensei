import React from 'react';
import { Svg, Circle, Ellipse, Polygon, Rect } from 'react-native-svg';

interface Props { size?: number; }

export function MountainIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#4A9FE8"/>
      <Circle cx="100" cy="100" r="88" fill="#4A9FE8"/>
      <Polygon points="20,175 80,65 140,175" fill="#2D6B4F" opacity="0.6"/>
      <Polygon points="50,180 130,32 190,180" fill="#1B7A5A"/>
      <Polygon points="130,32 118,62 142,62" fill="#F5F0EB"/>
      <Polygon points="10,180 55,110 100,180" fill="#2D6B4F" opacity="0.5"/>
      <Rect x="128" y="22" width="3" height="30" fill="#1A1A3E"/>
      <Polygon points="131,22 155,30 131,38" fill="#F42A41"/>
      <Circle cx="160" cy="165" r="3" fill="#F4C542" opacity="0.6"/>
      <Circle cx="155" cy="148" r="3" fill="#F4C542" opacity="0.6"/>
      <Circle cx="148" cy="132" r="3" fill="#F4C542" opacity="0.6"/>
      <Circle cx="142" cy="116" r="3" fill="#F4C542" opacity="0.6"/>
      <Circle cx="138" cy="100" r="3" fill="#F4C542" opacity="0.7"/>
      <Circle cx="134" cy="84" r="3" fill="#F4C542" opacity="0.7"/>
      <Circle cx="132" cy="68" r="3" fill="#F4C542" opacity="0.8"/>
      <Circle cx="165" cy="168" r="5" fill="#F5F0EB"/>
      <Rect x="162" y="173" width="6" height="8" rx="2" fill="#F5F0EB"/>
      <Circle cx="45" cy="40" r="16" fill="#F4C542"/>
      <Circle cx="42" cy="38" r="4" fill="#F5F0EB" opacity="0.3"/>
      <Ellipse cx="70" cy="52" rx="18" ry="8" fill="#F5F0EB" opacity="0.2"/>
      <Ellipse cx="160" cy="45" rx="14" ry="6" fill="#F5F0EB" opacity="0.15"/>
    </Svg>
  );
}
