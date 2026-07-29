import React from 'react';
import { View, Image } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const BADGE_IMAGES: Record<string, any> = {
  'precursor': require('../../assets/badges/precursor.png'),
  'expedicionario': require('../../assets/badges/expedicionario.png'),
  'descubridor': require('../../assets/badges/descubridor.png'),
  'fundador': require('../../assets/badges/fundador.png'),
  'rover_ciudadano': require('../../assets/badges/rover_ciudadano.png'),
};

interface StageBadgeIconProps {
  stageId: string;
  size?: number;
  isLocked?: boolean;
}

export const StageBadgeIcon: React.FC<StageBadgeIconProps> = ({ stageId, size = 48, isLocked = false }) => {
  if (isLocked) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="2" y="2" width="96" height="96" rx="12" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="4" />
        <Circle cx="50" cy="50" r="28" fill="#CBD5E1" />
        <Path d="M38 48 V40 A12 12 0 0 1 62 40 V48" stroke="#64748B" strokeWidth="5" fill="none" strokeLinecap="round" />
        <Rect x="34" y="48" width="32" height="24" rx="4" fill="#64748B" />
      </Svg>
    );
  }

  const badgeImg = BADGE_IMAGES[stageId];

  if (badgeImg) {
    return (
      <Image
        source={badgeImg}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          resizeMode: 'cover',
        }}
      />
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: '#A61C1C' }} />
  );
};


