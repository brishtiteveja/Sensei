import React from 'react';
import { Svg, Circle, Path, Polygon, Rect, Line, Text as SvgText } from 'react-native-svg';

interface Props {
  size?: number;
}

export function DiOwlLogo({ size = 160 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx="100" cy="100" r="88" fill="#4F46E5" />
      {/* Owl body */}
      <Path d="M55 85 Q55 155 100 165 Q145 155 145 85 Q145 55 100 45 Q55 55 55 85 Z" fill="#F5F0EB" />
      {/* Ear tufts */}
      <Polygon points="65,58 74,36 83,58" fill="#F5F0EB" />
      <Polygon points="117,58 126,36 135,58" fill="#F5F0EB" />
      {/* Eye sockets */}
      <Circle cx="80" cy="82" r="20" fill="#4F46E5" />
      <Circle cx="120" cy="82" r="20" fill="#4F46E5" />
      {/* AI circuit iris rings */}
      <Circle cx="80" cy="82" r="14" stroke="#06B6D4" strokeWidth="2.5" fill="none" />
      <Circle cx="120" cy="82" r="14" stroke="#06B6D4" strokeWidth="2.5" fill="none" />
      {/* Glowing pupils */}
      <Circle cx="80" cy="82" r="7" fill="#06B6D4" />
      <Circle cx="120" cy="82" r="7" fill="#06B6D4" />
      {/* Highlights */}
      <Circle cx="77" cy="79" r="2.5" fill="#F5F0EB" opacity="0.8" />
      <Circle cx="117" cy="79" r="2.5" fill="#F5F0EB" opacity="0.8" />
      {/* Beak */}
      <Polygon points="100,98 93,110 107,110" fill="#F4C542" />
      {/* দী on belly */}
      <SvgText x="100" y="148" textAnchor="middle" fontSize="38" fontWeight="900" fill="#4F46E5" fontFamily="sans-serif" opacity="0.85">দী</SvgText>
      {/* Circuit traces */}
      <Line x1="55" y1="75" x2="35" y2="75" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="35" y1="75" x2="35" y2="55" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="35" cy="51" r="4" fill="#06B6D4" />
      <Line x1="145" y1="75" x2="165" y2="75" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="165" y1="75" x2="165" y2="55" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="165" cy="51" r="4" fill="#06B6D4" />
      <Line x1="100" y1="165" x2="100" y2="180" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
      <Circle cx="100" cy="184" r="3" fill="#06B6D4" />
      {/* Gold sparkle crown */}
      <Circle cx="100" cy="28" r="5" fill="#F4C542" />
      <Rect x="98" y="18" width="4" height="8" rx="1" fill="#F4C542" opacity="0.6" />
      <Rect x="94" y="26" width="12" height="3" rx="1" fill="#F4C542" opacity="0.6" />
      {/* Wing chevrons */}
      <Path d="M60 115 L70 125 L60 135" stroke="#D4C5B5" strokeWidth="2" fill="none" opacity="0.35" />
      <Path d="M140 115 L130 125 L140 135" stroke="#D4C5B5" strokeWidth="2" fill="none" opacity="0.35" />
    </Svg>
  );
}
