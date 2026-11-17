import React from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { colors, UNIT_COLORS } from '../theme/colors';
import { contrast, ON_ACCENT_DARK } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { GroupScarf, useGroupScarf } from '../lib/groupScarf';

interface UserScoutAvatarProps {
  unit?: string;
  role?: string;
  size?: number;
  /** true cuando el avatar es el de quien inició sesión: sigue su color de «Personalizar». */
  isOwn?: boolean;
  /** Grupo de la persona dibujada (para su pañoleta). Si falta, se usa el de quien inició sesión. */
  groupName?: string | null;
  /** Pañoleta a dibujar sin consultar la del grupo (vista previa del editor). null = blanca. */
  scarf?: GroupScarf | null;
}

// Geometría de la pañoleta (lienzo de 50 × 50)
const CUELLO = 'M 18.4 21.6 C 20.4 20.6, 22.6 20.1, 25 20.1 C 27.4 20.1, 29.6 20.6, 31.6 21.6 L 25.9 30.6 L 24.1 30.6 Z M 21.9 22.3 L 25 27.6 L 28.1 22.3 C 26.2 21.8, 23.8 21.8, 21.9 22.3 Z';
const PUNTA_IZQ = 'M 23.5 32.6 L 24.8 32.6 L 24.7 38.2 L 22.9 43 L 22.5 38.2 Z';
const PUNTA_DER = 'M 26.5 32.6 L 25.2 32.6 L 25.3 38.2 L 27.1 43 L 27.5 38.2 Z';
const ANCHO_BANDA = 2.6; // grosor de la banda del cuello, de borde a borde

/** Franja en V paralela al borde del cuello; t = 0 en el borde de afuera, 1 en el de adentro. */
function franjaCuello(t: number): string {
  const lx = 18.4 + (21.9 - 18.4) * t, ly = 21.6 + (22.3 - 21.6) * t;
  const ay = 32.0 + (27.6 - 32.0) * t;
  // se alarga hacia arriba (el recorte la deja al ras del borde)
  const ex = lx - 1.6, ey = ly - 1.6 * 1.6;
  return `M ${ex} ${ey} L 25 ${ay} L ${50 - ex} ${ey}`;
}

/** Fondo de partida: el color de la unidad para jóvenes y scouters de unidad;
 *  morado Scout para Jefatura y cargos distritales, regionales y nacionales. */
function fondoPorUnidad(unit?: string, role?: string): string {
  if (role !== 'scout' && role !== 'scouter') return colors.purple;
  const u = (unit || '').toLowerCase();
  const rama = u === 'caminantes' ? 'comunidad' : u;
  // Manada: un amarillo algo más claro que el oficial (#ffb300), que con la figura oscura se veía apagado.
  if (rama === 'manada') return '#ffc61a';
  if (rama === 'tropa' || rama === 'comunidad' || rama === 'clan') return UNIT_COLORS[rama];
  return colors.purple;
}

export const UserScoutAvatar: React.FC<UserScoutAvatarProps> = ({ unit, role = 'scout', size = 48, isOwn = false, groupName, scarf }) => {
  const { user } = useAuth();
  const delGrupo = useGroupScarf(groupName || user?.group_name);
  const panoleta = scarf !== undefined ? scarf : delGrupo;
  const { hasCustomColor, basePrimaryColor } = useTheme();
  // El color personalizado solo pinta el avatar propio; el de los demás muestra su unidad.
  const FONDO = isOwn && hasCustomColor && basePrimaryColor ? basePrimaryColor : fondoPorUnidad(unit, role);
  // Figura blanca; oscura solo si el fondo es claro de verdad (amarillo de Manada, celestes…).
  // Es un dibujo grande, no letra: basta menos contraste que el que pide onColor() para texto.
  const fondoClaro = contrast(FONDO, '#ffffff') < 2.4;
  const FIGURA = fondoClaro ? ON_ACCENT_DARK : '#ffffff';
  // Sobre fondo claro la silueta oscura va más tenue para no ensuciar el color.
  const opPersona = fondoClaro ? 0.28 : 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 50 50">
      {/* Círculo base */}
      <Circle cx="25" cy="25" r="23" fill={FONDO} />
      <Circle cx="25" cy="25" r="21.5" fill="none" stroke={FIGURA} strokeOpacity={0.25} strokeWidth="1.5" />

      {/* Persona: silueta tenue para que la pañoleta sea lo que destaca */}
      <Circle cx="25" cy="12" r="5.6" fill={FIGURA} fillOpacity={opPersona} />
      <Path
        d="M 11.5 39 C 11.5 26, 17.5 20, 25 20 C 32.5 20, 38.5 26, 38.5 39 Z"
        fill={FIGURA}
        fillOpacity={opPersona}
      />

      {panoleta ? (
        <>
          {/* Pañoleta del grupo: fondo + franjas (en tamaños pequeños, solo las 3 primeras) */}
          <Defs>
            <ClipPath id="pan-cuello"><Path d={CUELLO} clipRule="evenodd" /></ClipPath>
            <ClipPath id="pan-izq"><Path d={PUNTA_IZQ} /></ClipPath>
            <ClipPath id="pan-der"><Path d={PUNTA_DER} /></ClipPath>
          </Defs>
          <Path d={CUELLO} fillRule="evenodd" fill={panoleta.base} stroke={FIGURA} strokeWidth="0.9" strokeLinejoin="round" />
          <Path d={PUNTA_IZQ} fill={panoleta.base} stroke={FIGURA} strokeWidth="0.9" strokeLinejoin="round" />
          <Path d={PUNTA_DER} fill={panoleta.base} stroke={FIGURA} strokeWidth="0.9" strokeLinejoin="round" />
          <Path d={CUELLO} fillRule="evenodd" fill={panoleta.base} />
          <Path d={PUNTA_IZQ} fill={panoleta.base} />
          <Path d={PUNTA_DER} fill={panoleta.base} />
          {(() => {
            const franjas = size < 64 ? panoleta.stripes.slice(0, 3) : panoleta.stripes;
            const partes = franjas.length + 2; // el fondo ocupa dos partes, del lado de adentro
            const alto = Math.min(0.85, 5.6 / Math.max(1, franjas.length));
            return (
              <>
                <G clipPath="url(#pan-cuello)">
                  {franjas.map((c, i) => (
                    <Path key={i} d={franjaCuello((i + 0.5) / partes)} fill="none" stroke={c}
                      strokeWidth={ANCHO_BANDA / partes + 0.06} strokeLinejoin="miter" />
                  ))}
                </G>
                <G clipPath="url(#pan-izq)">
                  {franjas.map((c, i) => (
                    <Path key={i} d={`M 21.8 ${35.6 + i * alto} L 25.4 ${34.6 + i * alto}`} stroke={c} strokeWidth={alto} />
                  ))}
                </G>
                <G clipPath="url(#pan-der)">
                  {franjas.map((c, i) => (
                    <Path key={i} d={`M 28.2 ${35.6 + i * alto} L 24.6 ${34.6 + i * alto}`} stroke={c} strokeWidth={alto} />
                  ))}
                </G>
              </>
            );
          })()}
        </>
      ) : (
        <>
          {/* Pañoleta sin definir: cuello en V y dos puntas, en el color de la figura */}
          <Path d={CUELLO} fillRule="evenodd" fill={FIGURA} />
          <Path d={PUNTA_IZQ} fill={FIGURA} />
          <Path d={PUNTA_DER} fill={FIGURA} />
        </>
      )}

      {/* Nudo / anillo */}
      <Rect x="22.7" y="29.6" width="4.6" height="3.6" rx="1.1" fill={FONDO} stroke={FIGURA} strokeWidth="1" />
    </Svg>
  );
};
