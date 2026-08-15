import React from 'react';
import { Svg, Circle, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function RocketIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#0F172A"/>
      <Circle cx="30" cy="40" r="2" fill="#F5F0EB" opacity="0.6"/>
      <Circle cx="55" cy="25" r="1.5" fill="#F5F0EB" opacity="0.4"/>
      <Circle cx="150" cy="35" r="2" fill="#F5F0EB" opacity="0.5"/>
      <Circle cx="170" cy="60" r="1.5" fill="#F5F0EB" opacity="0.3"/>
      <Circle cx="40" cy="80" r="1" fill="#F5F0EB" opacity="0.4"/>
      <Circle cx="165" cy="90" r="1.5" fill="#F5F0EB" opacity="0.3"/>
      <Circle cx="28" cy="130" r="1" fill="#F4C542" opacity="0.5"/>
      <Circle cx="175" cy="140" r="1" fill="#4A9FE8" opacity="0.4"/>
      <Path d="M100 24 Q112 50 112 90 L112 130 L88 130 L88 90 Q88 50 100 24 Z" fill="#F5F0EB"/>
      <Path d="M100 24 Q106 40 108 55 L92 55 Q94 40 100 24 Z" fill="#E85D4A"/>
      <Circle cx="100" cy="78" r="12" fill="#4A9FE8"/>
      <Circle cx="100" cy="78" r="8" fill="#0F172A"/>
      <Circle cx="97" cy="75" r="2" fill="#4A9FE8" opacity="0.5"/>
      <Rect x="88" y="100" width="24" height="6" fill="#E85D4A"/>
      <Path d="M88 110 L68 140 L88 135 Z" fill="#E85D4A"/>
      <Path d="M112 110 L132 140 L112 135 Z" fill="#E85D4A"/>
      <Path d="M92 130 Q96 150 100 165 Q104 150 108 130" fill="#F4C542"/>
      <Path d="M95 130 Q98 145 100 155 Q102 145 105 130" fill="#E85D4A"/>
      <Path d="M97 130 Q99 140 100 148 Q101 140 103 130" fill="#F5F0EB"/>
      <Circle cx="85" cy="165" r="8" fill="#D4C5B5" opacity="0.3"/>
      <Circle cx="115" cy="168" r="6" fill="#D4C5B5" opacity="0.25"/>
      <Circle cx="95" cy="175" r="10" fill="#D4C5B5" opacity="0.2"/>
      <Circle cx="108" cy="178" r="7" fill="#D4C5B5" opacity="0.15"/>
      <Rect x="60" y="55" width="16" height="2" rx="1" fill="#F5F0EB" opacity="0.2"/>
      <Rect x="128" y="70" width="20" height="2" rx="1" fill="#F5F0EB" opacity="0.2"/>
      <Rect x="55" y="95" width="22" height="2" rx="1" fill="#F5F0EB" opacity="0.15"/>
    </Svg>
  );
}
