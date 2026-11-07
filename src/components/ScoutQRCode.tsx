import React, { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';

interface Props {
  value: string;
  size?: number;
  color?: string;
  background?: string;
}

/**
 * Código QR dibujado en el propio teléfono (funciona sin internet).
 * Todas las celdas oscuras van en un único <Path> para que se dibuje rápido.
 */
export function ScoutQRCode({ value, size = 85, color = '#000000', background = '#ffffff' }: Props) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  // Margen de 2 celdas alrededor para que los lectores lo detecten bien
  const quiet = 2;
  const box = count + quiet * 2;

  return (
    <Svg width={size} height={size} viewBox={`${-quiet} ${-quiet} ${box} ${box}`} accessibilityLabel="Código QR del carnet">
      <Rect x={-quiet} y={-quiet} width={box} height={box} fill={background} />
      <Path d={path} fill={color} />
    </Svg>
  );
}
