import React from 'react';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function EmptyStateIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#D4C5B5" opacity="0.3"/>
      <Rect x="55" y="70" width="90" height="70" rx="8" fill="#D4C5B5" opacity="0.4"/>
      <Path d="M55 70 L45 52 L100 44 L155 52 L145 70" fill="#D4C5B5" opacity="0.5"/>
      <Path d="M100 44 L100 70" stroke="#F5F0EB" strokeWidth="1" opacity="0.2"/>
      <Rect x="55" y="70" width="90" height="70" rx="8" fill="none" stroke="#F5F0EB" strokeWidth="2" opacity="0.3"/>
      <Circle cx="100" cy="105" r="20" stroke="#F5F0EB" strokeWidth="2" strokeDasharray="4 4" opacity="0.2"/>
      <SvgText x="100" y="112" textAnchor="middle" fontSize="20" fontWeight="700" fill="#F5F0EB" opacity="0.3" fontFamily="Georgia, serif">?</SvgText>
      <Circle cx="65" cy="155" r="3" fill="#F5F0EB" opacity="0.15"/>
      <Circle cx="100" cy="160" r="4" fill="#F5F0EB" opacity="0.1"/>
      <Circle cx="135" cy="155" r="3" fill="#F5F0EB" opacity="0.12"/>
      <Circle cx="80" cy="162" r="2" fill="#F5F0EB" opacity="0.08"/>
      <Circle cx="120" cy="158" r="2.5" fill="#F5F0EB" opacity="0.1"/>
      <Circle cx="160" cy="38" r="4" fill="#F4C542" opacity="0.4"/>
      <Circle cx="158" cy="36" r="1" fill="#F5F0EB" opacity="0.6"/>
    </Svg>
  );
}
