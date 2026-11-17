import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

interface UserScoutAvatarProps {
  /** Se aceptan por compatibilidad; el avatar ya no cambia de color por unidad ni por rol. */
  unit?: string;
  role?: string;
  size?: number;
}

// Un solo color para todos: morado Scout de fondo y figura en blanco, sin colores
// de pañoleta de un grupo concreto.
const FONDO = colors.purple;
const FIGURA = '#ffffff';

export const UserScoutAvatar: React.FC<UserScoutAvatarProps> = ({ size = 48 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 50 50">
      {/* Círculo base */}
      <Circle cx="25" cy="25" r="23" fill={FONDO} />
      <Circle cx="25" cy="25" r="21.5" fill="none" stroke={FIGURA} strokeOpacity={0.25} strokeWidth="1.5" />

      {/* Persona: silueta tenue para que la pañoleta sea lo que destaca */}
      <Circle cx="25" cy="12" r="5.6" fill={FIGURA} fillOpacity={0.45} />
      <Path
        d="M 11.5 39 C 11.5 26, 17.5 20, 25 20 C 32.5 20, 38.5 26, 38.5 39 Z"
        fill={FIGURA}
        fillOpacity={0.45}
      />

      {/* Pañoleta: cuello en V que baja hasta el nudo */}
      <Path
        d="M 18.4 21.6 C 20.4 20.6, 22.6 20.1, 25 20.1 C 27.4 20.1, 29.6 20.6, 31.6 21.6 L 25.9 30.6 L 24.1 30.6 Z M 21.9 22.3 L 25 27.6 L 28.1 22.3 C 26.2 21.8, 23.8 21.8, 21.9 22.3 Z"
        fillRule="evenodd"
        fill={FIGURA}
      />

      {/* Dos puntas largas que cuelgan del nudo */}
      <Path d="M 23.5 32.6 L 24.8 32.6 L 24.7 38.2 L 22.9 43 L 22.5 38.2 Z" fill={FIGURA} />
      <Path d="M 26.5 32.6 L 25.2 32.6 L 25.3 38.2 L 27.1 43 L 27.5 38.2 Z" fill={FIGURA} />

      {/* Nudo / anillo */}
      <Rect x="22.7" y="29.6" width="4.6" height="3.6" rx="1.1" fill={FONDO} stroke={FIGURA} strokeWidth="1" />
    </Svg>
  );
};
