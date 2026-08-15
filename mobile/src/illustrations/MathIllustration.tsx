import React from 'react';
import { Svg, Circle, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function MathIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#1A1A3E"/>
            <Line x1="30" y1="100" x2="170" y2="100" stroke="#2A2A5E" strokeWidth="1"/>
            <Line x1="100" y1="30" x2="100" y2="170" stroke="#2A2A5E" strokeWidth="1"/>
            <Line x1="40" y1="60" x2="160" y2="60" stroke="#2A2A5E" strokeWidth="0.5"/>
            <Line x1="40" y1="140" x2="160" y2="140" stroke="#2A2A5E" strokeWidth="0.5"/>
            <Line x1="60" y1="40" x2="60" y2="160" stroke="#2A2A5E" strokeWidth="0.5"/>
            <Line x1="140" y1="40" x2="140" y2="160" stroke="#2A2A5E" strokeWidth="0.5"/>
            <Polygon points="58,148 100,52 142,148" fill="#F4C542"/>
            <Circle cx="130" cy="80" r="32" fill="#E85D4A" opacity="0.85"/>
            <Rect x="42" y="72" width="48" height="48" rx="4" fill="#1B7A5A" opacity="0.9"/>
            <SvgText x="100" y="120" textAnchor="middle" fontSize="42" fontWeight="900" fill="#F5F0EB" fontFamily="Georgia, serif">π</SvgText>
            <Rect x="148" y="132" width="20" height="5" rx="2" fill="#F4C542"/>
            <Rect x="155.5" y="124.5" width="5" height="20" rx="2" fill="#F4C542"/>
            <Rect x="32" y="42" width="18" height="4" rx="2" fill="#E85D4A"/>
            <Rect x="32" y="50" width="18" height="4" rx="2" fill="#E85D4A"/>
            <Circle cx="155" cy="50" r="4" fill="#F4C542" opacity="0.6"/>
            <Circle cx="45" cy="155" r="3" fill="#1B7A5A" opacity="0.6"/>
            <Circle cx="160" cy="160" r="5" fill="#E85D4A" opacity="0.4"/>
    </Svg>
  );
}
