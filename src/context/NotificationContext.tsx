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
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
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
    const res = await notificationService.requestBrowserNotificationPermission(user?.id);
    setPushStatus(res);
    if (res === 'granted') {
      notificationService.triggerSystemPushNotification(
        '🔔 Notificaciones Activadas',
        '¡Genial! Ahora recibirás alertas automáticas de insignias, actividades y aprobaciones en segundo plano.'
      );
    }
    return res;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setActiveToast(null);
      knownIdsRef.current.clear();
      return;
    }

    // Actualizar estado de permisos y refrescar suscripción Web Push en segundo plano
    const currentPerm = notificationService.getBrowserPermissionStatus();
    setPushStatus(currentPerm);
    if (currentPerm === 'granted') {
      notificationService.requestBrowserNotificationPermission(user.id);
    }

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
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (user?.id) {
      await notificationService.markAsRead(id, user.id);
    } else {
      await notificationService.markAsRead(id);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user?.id) {
      await notificationService.markAllAsRead(user.id);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (user?.id) {
      await notificationService.deleteNotification(id, user.id);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    if (user?.id) {
      await notificationService.clearAllNotifications(user.id);
    }
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
        deleteNotification,
        clearAllNotifications,
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
