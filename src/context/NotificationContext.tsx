import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationService, AppNotification } from '../services/notificationService';

interface NotificationContextData {
  notifications: AppNotification[];
  unreadCount: number;
  activeToast: AppNotification | null;
  pushStatus: 'granted' | 'denied' | 'default' | 'unsupported';
  requestPushPermission: () => Promise<'granted' | 'denied' | 'default' | 'unsupported'>;
  dismissToast: () => void;
  showManualToast: (title: string, message: string, type?: AppNotification['type']) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(() => {
    return notificationService.getBrowserPermissionStatus();
  });

  const knownIdsRef = useRef<Set<string>>(new Set());

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    const list = await notificationService.getUserNotifications(
      user.id,
      user.group_name || null,
      user.role || null,
      user.unit || null
    );

    // Detectar si llegaron nuevas notificaciones no leídas en el sondeo
    const newItems = list.filter(item => !knownIdsRef.current.has(item.id) && !item.read);
    list.forEach(item => knownIdsRef.current.add(item.id));

    if (newItems.length > 0 && knownIdsRef.current.size > list.length) {
      // Tomar la más reciente y mostrarla
      const latest = newItems[0];
      notificationService.triggerSystemPushNotification(latest.title, latest.message);
      setActiveToast(latest);
      setTimeout(() => {
        setActiveToast(curr => (curr?.id === latest.id ? null : curr));
      }, 6000);
    }

    setNotifications(list);
  }, [user?.id, user?.group_name, user?.role, user?.unit]);

  const requestPushPermission = useCallback(async () => {
    const res = await notificationService.requestBrowserNotificationPermission();
    setPushStatus(res);
    if (res === 'granted') {
      notificationService.triggerSystemPushNotification(
        '🔔 Notificaciones Activadas',
        '¡Genial! Ahora recibirás alertas automáticas de insignias, actividades y aprobaciones.'
      );
    }
    return res;
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setActiveToast(null);
      knownIdsRef.current.clear();
      return;
    }

    // Actualizar estado de permisos
    setPushStatus(notificationService.getBrowserPermissionStatus());

    refreshNotifications();

    // 1. Suscribirse a cambios en tiempo real vía WebSockets
    const unsubscribe = notificationService.subscribeToLiveNotifications(
      user.id,
      user.group_name || null,
      user.unit || null,
      user.role || null,
      (newNotif) => {
        console.log('🔔 [Live Notification Received]:', newNotif.title);
        knownIdsRef.current.add(newNotif.id);

        // Agregar a la lista
        setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);

        // Mostrar Toast flotante en vivo
        setActiveToast(newNotif);

        // Auto-cerrar después de 6 segundos
        setTimeout(() => {
          setActiveToast(curr => (curr?.id === newNotif.id ? null : curr));
        }, 6000);
      }
    );

    // 2. Respaldo de sondeo inteligente cada 12 segundos (Smart Polling Fallback)
    const interval = setInterval(() => {
      refreshNotifications();
    }, 12000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, user?.group_name, user?.unit, user?.role, refreshNotifications]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const showManualToast = useCallback((title: string, message: string, type: AppNotification['type'] = 'info') => {
    const toastObj: AppNotification = {
      id: `manual_${Date.now()}`,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    notificationService.triggerSystemPushNotification(title, message);
    setActiveToast(toastObj);
    setTimeout(() => {
      setActiveToast(curr => (curr?.id === toastObj.id ? null : curr));
    }, 6000);
  }, []);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        pushStatus,
        requestPushPermission,
        dismissToast,
        showManualToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  return useContext(NotificationContext);
}
