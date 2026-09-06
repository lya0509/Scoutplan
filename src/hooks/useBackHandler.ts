import { useEffect, useRef } from 'react';
import { Platform, BackHandler } from 'react-native';

/**
 * Hook universal para interceptar gestos de retroceso (Android swipe / Botón atrás / Web popstate)
 * y cerrar modales suavemente sin salirse de la pantalla.
 *
 * Utiliza useRef para onClose para evitar re-ejecuciones del efecto al escribir en campos de texto.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isClosedByPopRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    isClosedByPopRef.current = false;

    // 1. Botón físico de atrás y gesto en Android nativo
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onCloseRef.current) {
        onCloseRef.current();
      }
      return true; // Consume el evento para que no cierre la pantalla
    });

    // 2. En Web, cerrar modal suavemente con tecla Escape sin alterar el historial de rutas
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        subscription.remove();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => {
      subscription.remove();
    };
  }, [isOpen]);
}
