import React from 'react';
import { Svg, Circle, Ellipse, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function PhysicsIllustration({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
            <Circle cx="100" cy="100" r="88" fill="#0F172A"/>
            <Ellipse cx="100" cy="100" rx="78" ry="30" stroke="#4A9FE8" strokeWidth="2" opacity="0.4" transform="rotate(-30 100 100)"/>
            <Ellipse cx="100" cy="100" rx="78" ry="30" stroke="#E85D4A" strokeWidth="2" opacity="0.4" transform="rotate(30 100 100)"/>
            <Ellipse cx="100" cy="100" rx="78" ry="30" stroke="#F4C542" strokeWidth="2" opacity="0.4" transform="rotate(90 100 100)"/>
            <Circle cx="100" cy="100" r="18" fill="#4A9FE8"/>
            <Circle cx="100" cy="100" r="12" fill="#1A1A3E"/>
            <Circle cx="96" cy="96" r="6" fill="#E85D4A"/>
            <Circle cx="106" cy="102" r="5" fill="#F4C542"/>
            <Circle cx="98" cy="106" r="4" fill="#E85D4A" opacity="0.7"/>
            <Circle cx="36" cy="66" r="6" fill="#F4C542"/>
            <Circle cx="34" cy="64" r="1.5" fill="#fff" opacity="0.8"/>
            <Circle cx="164" cy="134" r="6" fill="#F4C542"/>
            <Circle cx="162" cy="132" r="1.5" fill="#fff" opacity="0.8"/>
            <Circle cx="100" cy="22" r="6" fill="#E85D4A"/>
            <Circle cx="98" cy="20" r="1.5" fill="#fff" opacity="0.8"/>
            <Path d="M24 162 Q42 148 60 162 Q78 176 96 162 Q114 148 132 162 Q150 176 168 162" stroke="#4A9FE8" strokeWidth="3" fill="none" opacity="0.5"/>
            <Path d="M24 172 Q42 158 60 172 Q78 186 96 172 Q114 158 132 172 Q150 186 168 172" stroke="#4A9FE8" strokeWidth="2" fill="none" opacity="0.25"/>
            <Rect x="44" y="140" width="3" height="10" rx="1" fill="#F4C542" opacity="0.5" transform="rotate(-20 45 145)"/>
            <Rect x="150" y="50" width="3" height="10" rx="1" fill="#F4C542" opacity="0.5" transform="rotate(15 151 55)"/>
            <Rect x="56" y="38" width="2" height="8" rx="1" fill="#E85D4A" opacity="0.4" transform="rotate(-10 57 42)"/>
    </Svg>
  );
}
