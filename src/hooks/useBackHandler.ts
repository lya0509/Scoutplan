import { useEffect, useRef } from 'react';
import { Platform, BackHandler } from 'react-native';

/**
 * Hook universal para interceptar gestos de retroceso (Android swipe / Botón atrás / Web popstate / Tecla Escape)
 * y cerrar modales suavemente sin salirse de la pantalla ni dejar estados colgados.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isClosedByPopRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    isClosedByPopRef.current = false;

    // 1. Botón físico de atrás y gesto en Android nativo (React Native Native)
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onCloseRef.current) {
        onCloseRef.current();
      }
      return true; // Consume el evento para que no cierre la pantalla
    });

    // 2. En Web / PWA / Navegador Móvil (Chrome, Safari, etc.)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.history.pushState({ modalBackHandler: true, ts: Date.now() }, '');
      } catch (_) {}

      const handlePopState = () => {
        isClosedByPopRef.current = true;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        subscription.remove();
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => {
      subscription.remove();
    };
  }, [isOpen]);
}
