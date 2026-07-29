import { useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';

export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    // 1. Botón o gesto de atrás en Android/Nativo
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // Prevenir salida de la pantalla
    });

    // 2. Gesto de atrás o botón retroceso en Web/PWA
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState({ modalOpen: true }, '', window.location.href);
      
      const handlePopState = () => {
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        subscription.remove();
        window.removeEventListener('popstate', handlePopState);
      };
    }

    return () => {
      subscription.remove();
    };
  }, [isOpen, onClose]);
}
