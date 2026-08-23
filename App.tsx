import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import LiveNotificationToast from './src/components/LiveNotificationToast';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { dataService } from './src/lib/dataService';

export default function App() {
  useEffect(() => {
    // 1. Registro de Service Worker para PWA (Instalación y soporte offline)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker PWA registrado con éxito:', registration.scope);
          })
          .catch((error) => {
            console.warn('⚠️ Error registrando Service Worker:', error);
          });
      });

      // 2. Escuchar reconexión a Internet para sincronizar requisitos pendientes
      const handleOnline = async () => {
        console.log('📶 Conexión restablecida. Sincronizando requisitos pendientes...');
        const res = await dataService.syncPendingRequirements();
        if (res.synced > 0) {
          console.log(`✅ ${res.synced} requisitos sincronizados con Supabase.`);
        }
      };

      window.addEventListener('online', handleOnline);
      // Intentar sincronización inicial al cargar
      dataService.syncPendingRequirements();

      return () => {
        window.removeEventListener('online', handleOnline);
      };
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="auto" />
          <LiveNotificationToast />
          <AppNavigator />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

