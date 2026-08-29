import { useEffect, useRef } from 'react';
import { Platform, BackHandler } from 'react-native';

/**
 * Hook universal para interceptar gestos de retroceso (Android swipe / Botón atrás / Web popstate)
 * y cerrar modales suavemente sin salirse de la pantalla.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const isClosedByPopRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    isClosedByPopRef.current = false;

    // 1. Gesto de atrás y botón físico en Android
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // Consume el evento para que no cierre la aplicación
    });

    // 2. Gesto de retroceso / swipe en Web y PWA
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.history.pushState({ modalOpen: true, timestamp: Date.now() }, '', window.location.href);
      } catch (e) {}

      const handlePopState = () => {
        isClosedByPopRef.current = true;
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        subscription.remove();
        window.removeEventListener('popstate', handlePopState);
        
        // Si el usuario cerró el modal manualmente (tocando la X o el fondo),
        // revertimos el pushState para mantener el historial limpio y que el siguiente gesto funcione
        if (!isClosedByPopRef.current && window.history.state?.modalOpen) {
          try {
            window.history.back();
          } catch (e) {}
        }
      };
    }

    return () => {
      subscription.remove();
    };
  }, [isOpen, onClose]);
}
