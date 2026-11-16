import React from 'react';
import { View, Image } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export const BADGE_IMAGES: Record<string, any> = {
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
  const { theme } = useTheme();
  if (isLocked) {
    return (
      <View style={{ width: size, height: size, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.subText, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={Math.round(size * 0.45)} color={theme.subText} />
      </View>
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
          borderRadius: 10,
          resizeMode: 'cover',
        }}
      />
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: '#A61C1C' }} />
  );
};


