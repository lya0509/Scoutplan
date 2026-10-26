import React from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { UNIT_COLORS, colors } from '../theme/colors';

interface ScoutUserIconProps {
  unit?: string | null;
  size?: number;
}

// Silueta de usuario con pañoleta scout del color de la unidad (encabezado del Inicio).
export function ScoutUserIcon({ unit, size = 30 }: ScoutUserIconProps) {
  const unitKey = (unit || '').toLowerCase() === 'caminantes' ? 'comunidad' : (unit || '').toLowerCase();
  const scarf = UNIT_COLORS[unitKey] || UNIT_COLORS.grupo;
  // Los ids de los recortes deben ser únicos por instancia y válidos dentro de url(#...)
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const circleClip = `sui_c_${uid}`;
  const bodyClip = `sui_b_${uid}`;
  const body = 'M9 66 C9 47 19 37 32 37 C45 37 55 47 55 66 Z';

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id={circleClip}>
          <Circle cx={32} cy={32} r={30} />
        </ClipPath>
        <ClipPath id={bodyClip}>
          <Path d={body} />
        </ClipPath>
      </Defs>
      <Circle cx={32} cy={32} r={30} fill="#ffffff" />
      <G clipPath={`url(#${circleClip})`}>
        <Path d={body} fill={colors.primary} />
        <G clipPath={`url(#${bodyClip})`}>
          <Path d="M22.5 38.6 L32 58 L41.5 38.6 Q32 44.5 22.5 38.6 Z" fill={scarf} stroke="#ffffff" strokeWidth={1.4} strokeLinejoin="round" />
          <Path d="M19 36.4 Q32 45.4 45 36.4 L45.8 40.4 Q32 49.4 18.2 40.4 Z" fill={scarf} stroke="#ffffff" strokeWidth={1.2} strokeLinejoin="round" />
        </G>
        <Rect x={28.6} y={43.8} width={6.8} height={5.2} rx={2.2} fill={colors.gold} stroke="#ffffff" strokeWidth={0.9} />
      </G>
      <Circle cx={32} cy={21.5} r={10.5} fill={colors.primary} />
      <Circle cx={32} cy={32} r={30} fill="none" stroke={scarf} strokeWidth={2.5} />
    </Svg>
  );
}
