import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps } from 'react-native';

type Props = TextInputProps & {
  /** Alto mínimo; si no se da, se usa el `height` del estilo. */
  minHeight?: number;
  /** Alto máximo antes de mostrar barra de desplazamiento (por defecto, sin límite). */
  maxHeight?: number;
};

/**
 * Caja de texto de varias líneas que crece con el texto (teléfono, tablet y
 * computadora) y se recalcula cuando cambia el ancho de la ventana.
 */
export default function AutoGrowTextInput({ minHeight, maxHeight, style, value, onContentSizeChange, ...rest }: Props) {
  const flat = StyleSheet.flatten(style) || {};
  const { height: styleHeight, ...restStyle } = flat as any;
  const min = minHeight ?? (typeof styleHeight === 'number' ? styleHeight : 44);
  const ref = useRef<any>(null);
  const [nativeHeight, setNativeHeight] = useState(min);

  // Web: se mide el <textarea> real (alto «auto» → scrollHeight), así también se encoge.
  const resizeWeb = useCallback(() => {
    const el: HTMLTextAreaElement | null = ref.current;
    if (Platform.OS !== 'web' || !el || !el.style) return;
    el.style.height = 'auto';
    const border = el.offsetHeight - el.clientHeight;
    const wanted = Math.max(min, el.scrollHeight + border);
    const h = maxHeight ? Math.min(wanted, maxHeight) : wanted;
    el.style.height = `${h}px`;
    el.style.overflowY = maxHeight && wanted > maxHeight ? 'auto' : 'hidden';
  }, [min, maxHeight]);

  useLayoutEffect(() => { resizeWeb(); }, [value, resizeWeb]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el: HTMLElement | null = ref.current;
    if (!el || typeof window === 'undefined') return;
    let lastWidth = el.clientWidth;
    const onWidth = () => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        resizeWeb();
      }
    };
    const RO = (window as any).ResizeObserver;
    if (RO) {
      const ro = new RO(onWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', resizeWeb);
    return () => window.removeEventListener('resize', resizeWeb);
  }, [resizeWeb]);

  return (
    <TextInput
      ref={ref}
      multiline
      value={value}
      textAlignVertical="top"
      {...rest}
      style={[restStyle, Platform.OS === 'web' ? { minHeight: min } : { height: maxHeight ? Math.min(nativeHeight, maxHeight) : nativeHeight }]}
      onContentSizeChange={e => {
        if (Platform.OS !== 'web') {
          const pad = ((restStyle as any).paddingVertical ?? 8) * 2 + 2;
          setNativeHeight(Math.max(min, Math.ceil(e.nativeEvent.contentSize.height + pad)));
        }
        onContentSizeChange?.(e);
      }}
    />
  );
}
