import React from 'react';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { colors, UNIT_COLORS } from '../theme/colors';

interface UserScoutAvatarProps {
  unit?: string;
  role?: string;
  size?: number;
}

export const UserScoutAvatar: React.FC<UserScoutAvatarProps> = ({ 
  unit = 'manada', 
  role = 'scout', 
  size = 48 
}) => {
  const cleanUnit = unit.toLowerCase();
  const isScouter = role === 'scouter' || role === 'jefe_grupo';

  // Color de Fondo basado en la Unidad Scout
  const bgColor = UNIT_COLORS[cleanUnit] || colors.primary;
  const strokeColor = '#ffffff';

  // Color de la Pañoleta Scout por defecto o personalizada
  let scarfColor = '#ffffff';
  let scarfSecondary = '#f59e0b';
  let woggleColor = '#78350f'; // Color de cuero para el nudo de pañoleta

  if (cleanUnit === 'manada') {
    scarfColor = '#fef08a';
    scarfSecondary = '#d97706';
  } else if (cleanUnit === 'tropa') {
    scarfColor = '#bbf7d0';
    scarfSecondary = '#15803d';
  } else if (cleanUnit === 'caminantes' || cleanUnit === 'comunidad') {
    scarfColor = '#bfdbfe';
    scarfSecondary = '#1d4ed8';
  } else if (cleanUnit === 'clan') {
    scarfColor = '#fecaca';
    scarfSecondary = '#b91c1c';
  }

  if (isScouter) {
    woggleColor = '#f59e0b'; // Nudo de madera Gilwell
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 50 50">
      {/* CÍRCULO BASE DE FONDO */}
      <Circle cx="25" cy="25" r="23" fill={bgColor} />
      <Circle cx="25" cy="25" r="21.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

      {/* CABEZA SILUETA MINIMALISTA */}
      <Circle cx="25" cy="15" r="6.5" fill="none" stroke={strokeColor} strokeWidth="2.5" />

      {/* HOMBROS SILUETA MINIMALISTA */}
      <Path
        d="M 12 37 C 12 28, 18 26, 25 26 C 32 26, 38 28, 38 37"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* PAÑOLETAL SCOUT VECTORIAL (VECTOR MINIMALISTA) */}
      <G>
        {/* Cuello de la Pañoleta en V */}
        <Path
          d="M 18 26 C 21 30, 29 30, 32 26"
          fill="none"
          stroke={scarfColor}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Punta Izquierda de la Pañoleta */}
        <Path
          d="M 23 31 L 18 43 L 23 41 Z"
          fill={scarfColor}
          stroke={scarfSecondary}
          strokeWidth="1"
        />

        {/* Punta Derecha de la Pañoleta */}
        <Path
          d="M 27 31 L 32 43 L 27 41 Z"
          fill={scarfColor}
          stroke={scarfSecondary}
          strokeWidth="1"
        />

        {/* NUDO / ANILLO DE LA PAÑOLETA (WOGGLE) */}
        <Rect
          x="22.5"
          y="28.5"
          width="5"
          height="4.5"
          rx="1.5"
          fill={woggleColor}
          stroke="#ffffff"
          strokeWidth="0.8"
        />
      </G>
    </Svg>
  );
};
