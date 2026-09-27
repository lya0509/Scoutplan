import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line, G, Text as SvgText, Polygon } from 'react-native-svg';

interface ManualVisualDiagramProps {
  itemId: string;
  stepIndex: number; // 0 = final/general, 1, 2, 3...
  isDarkMode: boolean;
  primaryColor: string;
}

export const ManualVisualDiagram: React.FC<ManualVisualDiagramProps> = ({
  itemId,
  stepIndex,
  isDarkMode,
  primaryColor
}) => {
  const bgCanvas = isDarkMode ? '#1e293b' : '#f8fafc';
  const borderCanvas = isDarkMode ? '#334155' : '#e2e8f0';
  const cordA = '#ef4444'; // Cuerda / Chicote A (Rojo)
  const cordB = '#3b82f6'; // Cuerda / Chicote B (Azul)
  const woodColor = '#854d0e'; // Madero / Tronco
  const woodLight = '#a16207';
  const fireColor = '#f97316';
  const fireYellow = '#fde047';
  const stoneColor = isDarkMode ? '#64748b' : '#94a3b8';

  const renderDiagram = () => {
    switch (itemId) {
      // ==========================================
      // 1. NUDO RIZO O LLANO
      // ==========================================
      case 'nudo_llano': {
        if (stepIndex === 1) {
          // Paso 1: Dos cuerdas paralelas frente a frente
          return (
            <Svg width="100%" height="160" viewBox="0 0 280 160">
              <Line x1="40" y1="60" x2="120" y2="60" stroke={cordA} strokeWidth="8" strokeLinecap="round" />
              <Line x1="160" y1="100" x2="240" y2="100" stroke={cordB} strokeWidth="8" strokeLinecap="round" />
              <SvgText x="50" y="45" fill={cordA} fontSize="11" fontWeight="bold">Extremo A (Izq)</SvgText>
              <SvgText x="170" y="125" fill={cordB} fontSize="11" fontWeight="bold">Extremo B (Der)</SvgText>
              <Path d="M 120 60 Q 140 60 140 80" stroke={cordA} strokeWidth="8" fill="none" strokeDasharray="4,4" />
              <Path d="M 160 100 Q 140 100 140 80" stroke={cordB} strokeWidth="8" fill="none" strokeDasharray="4,4" />
            </Svg>
          );
        } else if (stepIndex === 2) {
          // Paso 2: Cruce A sobre B y por debajo
          return (
            <Svg width="100%" height="160" viewBox="0 0 280 160">
              <Path d="M 40 60 L 110 60 Q 140 60 140 80 Q 140 100 110 100 L 40 100" stroke={cordA} strokeWidth="8" fill="none" strokeLinecap="round" />
              <Path d="M 240 100 L 170 100 Q 140 100 140 80 Q 140 60 170 60 L 240 60" stroke={cordB} strokeWidth="8" fill="none" strokeLinecap="round" />
              <SvgText x="60" y="40" fill={primaryColor} fontSize="11" fontWeight="bold">1er Cruce: Izquierda sobre Derecha</SvgText>
              <Circle cx="140" cy="80" r="10" fill={primaryColor + '30'} />
            </Svg>
          );
        } else if (stepIndex === 3) {
          // Paso 3: Cruce derecho sobre izquierdo
          return (
            <Svg width="100%" height="160" viewBox="0 0 280 160">
              <Path d="M 40 80 C 100 40, 120 120, 160 80 C 180 60, 200 60, 240 60" stroke={cordA} strokeWidth="7" fill="none" strokeLinecap="round" />
              <Path d="M 40 100 C 80 100, 100 100, 120 80 C 140 60, 180 120, 240 100" stroke={cordB} strokeWidth="7" fill="none" strokeLinecap="round" />
              <SvgText x="50" y="30" fill={primaryColor} fontSize="11" fontWeight="bold">2do Cruce: Derecha sobre Izquierda</SvgText>
              <Path d="M 120 40 L 160 40" stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrow)" />
            </Svg>
          );
        } else {
          // Resultado final: Nudo rizo apretado y simétrico
          return (
            <Svg width="100%" height="160" viewBox="0 0 280 160">
              {/* Bucle izquierdo (Cuerda A) */}
              <Path d="M 30 70 L 100 70 C 140 70, 140 110, 100 110 L 30 110" stroke={cordA} strokeWidth="9" fill="none" strokeLinecap="round" />
              {/* Bucle derecho entrelazado (Cuerda B) */}
              <Path d="M 250 70 L 180 70 C 120 70, 120 110, 180 110 L 250 110" stroke={cordB} strokeWidth="9" fill="none" strokeLinecap="round" />
              {/* Chicotes saliendo en el mismo sentido */}
              <Circle cx="120" cy="70" r="5" fill="#ffffff" />
              <Circle cx="160" cy="110" r="5" fill="#ffffff" />
              <SvgText x="75" y="40" fill="#16a34a" fontSize="12" fontWeight="bold">✓ Nudo Rizo Simétrico y Azocado</SvgText>
              <SvgText x="70" y="145" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Ambos chicotes salen juntos por el mismo plano</SvgText>
            </Svg>
          );
        }
      }

      // ==========================================
      // 2. BALLESTRINQUE
      // ==========================================
      case 'ballestrinque': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Tronco/Madero vertical */}
            <Rect x="120" y="10" width="40" height="140" rx="6" fill={woodColor} stroke={woodLight} strokeWidth="2" />
            <Line x1="128" y1="20" x2="128" y2="135" stroke={woodLight} strokeWidth="1.5" strokeDasharray="10,6" />
            <Line x1="148" y1="25" x2="148" y2="130" stroke={woodLight} strokeWidth="1.5" strokeDasharray="12,8" />

            {/* Cuerda dando vuelta y cruzando en X */}
            <Path d="M 40 50 L 120 50 Q 165 50 165 75 Q 165 95 120 95 L 80 110" stroke={cordA} strokeWidth="8" fill="none" strokeLinecap="round" />
            <Path d="M 120 65 L 165 100" stroke={cordB} strokeWidth="8" strokeLinecap="round" />
            <Path d="M 80 110 L 220 110" stroke={cordA} strokeWidth="8" strokeLinecap="round" />

            {/* Indicador de cruce */}
            <Circle cx="140" cy="75" r="8" fill={primaryColor + '40'} stroke={primaryColor} strokeWidth="2" />
            <SvgText x="70" y="25" fill={primaryColor} fontSize="11" fontWeight="bold">Cruce en "X" mordiendo el tronco</SvgText>
            <SvgText x="75" y="145" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Tensión en ambos sentidos impide que se resbale</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 3. AS DE GUÍA
      // ==========================================
      case 'as_de_guia': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Firme que sube */}
            <Line x1="90" y1="20" x2="90" y2="70" stroke={cordB} strokeWidth="8" strokeLinecap="round" />
            {/* El lago/seno */}
            <Circle cx="90" cy="85" r="18" fill="none" stroke={cordB} strokeWidth="7" />
            {/* La gaza fija inferior */}
            <Path d="M 90 103 C 70 145, 170 145, 140 90" stroke={cordA} strokeWidth="8" fill="none" strokeLinecap="round" />
            {/* Chicote saliendo del lago, rodeando el firme y volviendo a entrar */}
            <Path d="M 90 85 C 90 60, 130 50, 130 75 C 130 90, 105 85, 95 85" stroke={cordA} strokeWidth="6" fill="none" strokeLinecap="round" />
            <SvgText x="35" y="25" fill={primaryColor} fontSize="11" fontWeight="bold">Gaza fija de salvamento (No corrediza)</SvgText>
            <SvgText x="60" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">"La serpiente sale del lago, rodea el árbol y entra de nuevo"</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 4. AMARRE CUADRADO
      // ==========================================
      case 'amarre_cuadrado': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Madero horizontal */}
            <Rect x="20" y="65" width="240" height="30" rx="5" fill={woodColor} stroke={woodLight} strokeWidth="2" />
            {/* Madero vertical cruzado */}
            <Rect x="125" y="15" width="30" height="130" rx="5" fill={woodLight} stroke={woodColor} strokeWidth="2" />

            {/* Vueltas cuadradas alrededor de la unión */}
            <Rect x="115" y="55" width="50" height="50" rx="3" fill="none" stroke={cordA} strokeWidth="6" />
            <Rect x="119" y="59" width="42" height="42" rx="3" fill="none" stroke={cordB} strokeWidth="5" />

            {/* Ahorcado central */}
            <Circle cx="140" cy="80" r="14" fill="none" stroke="#eab308" strokeWidth="4" strokeDasharray="3,3" />

            <SvgText x="50" y="30" fill={primaryColor} fontSize="11" fontWeight="bold">3 vueltas de amarre + 2 de ahorcado</SvgText>
            <SvgText x="60" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Remate con ballestrinque en el madero vertical</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 5. AMARRE DIAGONAL
      // ==========================================
      case 'amarre_diagonal': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            <G transform="translate(140, 80) rotate(45) translate(-140, -80)">
              <Rect x="30" y="65" width="220" height="30" rx="5" fill={woodColor} stroke={woodLight} strokeWidth="2" />
            </G>
            <G transform="translate(140, 80) rotate(-45) translate(-140, -80)">
              <Rect x="30" y="65" width="220" height="30" rx="5" fill={woodLight} stroke={woodColor} strokeWidth="2" />
            </G>
            {/* Vueltas diagonales abrazando */}
            <Circle cx="140" cy="80" r="26" fill="none" stroke={cordA} strokeWidth="6" />
            <Circle cx="140" cy="80" r="16" fill="none" stroke="#eab308" strokeWidth="5" />
            <SvgText x="55" y="25" fill={primaryColor} fontSize="11" fontWeight="bold">Inicia con Vuelta de Braza diagonal</SvgText>
            <SvgText x="70" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Une maderos que tienden a separarse en X</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 6. FOGATA PIRÁMIDE
      // ==========================================
      case 'fogata_piramide': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Suelo / Base de piedras */}
            <Rect x="20" y="130" width="240" height="6" rx="3" fill={stoneColor} />
            <Circle cx="50" cy="132" r="8" fill={stoneColor} />
            <Circle cx="70" cy="133" r="7" fill={stoneColor} />
            <Circle cx="210" cy="133" r="7" fill={stoneColor} />
            <Circle cx="230" cy="132" r="8" fill={stoneColor} />

            {/* Leños en pirámide / tipi */}
            <Line x1="75" y1="130" x2="140" y2="40" stroke={woodColor} strokeWidth="10" strokeLinecap="round" />
            <Line x1="205" y1="130" x2="140" y2="40" stroke={woodColor} strokeWidth="10" strokeLinecap="round" />
            <Line x1="110" y1="130" x2="140" y2="45" stroke={woodLight} strokeWidth="7" strokeLinecap="round" />
            <Line x1="170" y1="130" x2="140" y2="45" stroke={woodLight} strokeWidth="7" strokeLinecap="round" />

            {/* Llamas de fuego en el centro */}
            <Path d="M 140 120 Q 125 90 140 70 Q 155 90 140 120" fill={fireYellow} />
            <Path d="M 140 120 Q 132 100 140 85 Q 148 100 140 120" fill={fireColor} />

            <SvgText x="70" y="25" fill="#f97316" fontSize="11" fontWeight="bold">🔥 Entrada de viento orientada a barlovento</SvgText>
            <SvgText x="60" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Yesca en el corazón + cono de ramitas secas</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 7. FOGATA POLINESIA / POZO
      // ==========================================
      case 'fogata_polinesia': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Superficie de tierra */}
            <Line x1="10" y1="45" x2="70" y2="45" stroke="#78350f" strokeWidth="5" />
            <Line x1="210" y1="45" x2="270" y2="45" stroke="#78350f" strokeWidth="5" />
            {/* Pozo excavado */}
            <Path d="M 70 45 L 85 135 L 195 135 L 210 45" stroke="#78350f" strokeWidth="4" fill={isDarkMode ? '#0f172a' : '#fef3c7'} />

            {/* Leños apoyados en las paredes */}
            <Line x1="90" y1="130" x2="75" y2="55" stroke={woodColor} strokeWidth="8" strokeLinecap="round" />
            <Line x1="190" y1="130" x2="205" y2="55" stroke={woodColor} strokeWidth="8" strokeLinecap="round" />

            {/* Cama de brasas en el fondo */}
            <Circle cx="120" cy="125" r="8" fill="#ea580c" />
            <Circle cx="140" cy="125" r="9" fill="#facc15" />
            <Circle cx="160" cy="125" r="8" fill="#ea580c" />

            <SvgText x="55" y="25" fill="#f97316" fontSize="11" fontWeight="bold">Protegida del viento fuerte • Sin humo</SvgText>
            <SvgText x="65" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Pozo de 40 cm revestido con leños cónicos</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 8. LENGUA DE SEÑAS: SALUDO SCOUT
      // ==========================================
      case 'senas_saludo_scout': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Mano con 3 dedos extendidos y pulgar sobre meñique */}
            <Rect x="110" y="80" width="60" height="60" rx="14" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" />
            {/* 3 Dedos centrales alzados */}
            <Rect x="115" y="25" width="12" height="60" rx="6" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" />
            <Rect x="134" y="20" width="12" height="65" rx="6" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" />
            <Rect x="153" y="25" width="12" height="60" rx="6" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" />

            {/* Pulgar cubriendo el meñique */}
            <Path d="M 120 95 Q 140 95 155 105" stroke="#be185d" strokeWidth="7" strokeLinecap="round" />
            <SvgText x="40" y="18" fill="#be185d" fontSize="11" fontWeight="bold">3 Dedos: Dios/Patria, Prójimo, Ley Scout</SvgText>
            <SvgText x="55" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">"El fuerte protege al débil" (Pulgar sobre meñique)</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 9. PISTAS Y RASTREO: DIRECCIÓN
      // ==========================================
      case 'pista_direccion': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Flecha formada por piedras y ramas */}
            <Line x1="60" y1="80" x2="200" y2="80" stroke={woodLight} strokeWidth="12" strokeLinecap="round" />
            <Polygon points="220,80 175,50 175,110" fill="#16a34a" />
            {/* Piedras a los lados */}
            <Circle cx="80" cy="55" r="10" fill={stoneColor} />
            <Circle cx="120" cy="105" r="9" fill={stoneColor} />
            <Circle cx="160" cy="55" r="11" fill={stoneColor} />

            <SvgText x="70" y="30" fill="#16a34a" fontSize="12" fontWeight="bold">➜ Seguir esta Dirección</SvgText>
            <SvgText x="55" y="145" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Señalizar en el suelo a la derecha del camino</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // 10. PRIMEROS AUXILIOS: CABESTRILLO
      // ==========================================
      case 'auxilios_panuelo': {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            {/* Tronco humano esquemático */}
            <Circle cx="140" cy="35" r="15" fill={isDarkMode ? '#475569' : '#cbd5e1'} />
            <Path d="M 100 80 Q 140 60 180 80 L 175 140 L 105 140 Z" fill={isDarkMode ? '#334155' : '#e2e8f0'} />

            {/* Pañuelo triangular formando cabestrillo */}
            <Polygon points="140,65 95,115 165,115" fill={primaryColor} opacity={0.85} />
            {/* Nudo rizo en la nuca */}
            <Circle cx="140" cy="62" r="5" fill="#ef4444" />

            <SvgText x="60" y="20" fill={primaryColor} fontSize="11" fontWeight="bold">Cabestrillo con Pañuelo Scout</SvgText>
            <SvgText x="45" y="152" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Brazo en ángulo de 90° con los dedos visibles</SvgText>
          </Svg>
        );
      }

      // ==========================================
      // CASO GENÉRICO PARA EL RESTO DE TÉCNICAS
      // ==========================================
      default: {
        return (
          <Svg width="100%" height="160" viewBox="0 0 280 160">
            <Rect x="40" y="30" width="200" height="100" rx="12" fill={primaryColor + '10'} stroke={primaryColor + '40'} strokeWidth="2" />
            <Circle cx="140" cy="70" r="26" fill={primaryColor + '25'} />
            <Path d="M 125 70 L 155 70 M 140 55 L 140 85" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" />
            <SvgText x="60" y="115" fill={primaryColor} fontSize="11" fontWeight="bold">Esquema Técnico Scout Offline</SvgText>
            <SvgText x="50" y="145" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize="10">Representación visual paso a paso disponible</SvgText>
          </Svg>
        );
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgCanvas, borderColor: borderCanvas }]}>
      {renderDiagram()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginVertical: 10
  }
});
