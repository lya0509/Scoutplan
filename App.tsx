import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import LiveNotificationToast from './src/components/LiveNotificationToast';
import BadgeCelebrationWatcher from './src/components/BadgeCelebrationWatcher';
import OfflineStatusBanner from './src/components/OfflineStatusBanner';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { dataService } from './src/lib/dataService'; // registra los manejadores de la cola offline
import { outbox } from './src/lib/offline/outbox';
import { initGraphifyBridge } from './src/lib/graphifyBridge';
import { installErrorReporter } from './src/lib/errorReporter';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import UpdateAvailableBanner from './src/components/UpdateAvailableBanner';

export default function App() {
  useEffect(() => {
    initGraphifyBridge();
    // Errores que les pasan a los usuarios → bug_reports (los ve la Jefatura del grupo)
    installErrorReporter();
    // 1. Registro de Service Worker para PWA (Instalación y soporte offline inmediato)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ Service Worker PWA registrado con éxito:', registration.scope);
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          })
          .catch((error) => {
            console.warn('⚠️ Error registrando Service Worker:', error);
          });
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }

    }

    // 2. Cola offline: envía lo hecho sin internet al volver la conexión, al volver
    //    a la app y cada 30 s (ver src/lib/offline/outbox.ts)
    void dataService; // asegura que los manejadores de la cola estén registrados
    outbox.startAutoSync();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="auto" />
          <LiveNotificationToast />
          <BadgeCelebrationWatcher />
          <AppErrorBoundary>
            <AppNavigator />
          </AppErrorBoundary>
          <OfflineStatusBanner />
          <UpdateAvailableBanner />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

