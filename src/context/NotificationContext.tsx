import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService, AppNotification } from '../services/notificationService';

interface NotificationContextData {
  notifications: AppNotification[];
  unreadCount: number;
  activeToast: AppNotification | null;
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

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    const list = await notificationService.getUserNotifications(user.id, user.group_name);
    setNotifications(list);
  }, [user?.id, user?.group_name]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setActiveToast(null);
      return;
    }

    refreshNotifications();

    // Suscribirse a cambios en tiempo real vía WebSockets
    const unsubscribe = notificationService.subscribeToLiveNotifications(
      user.id,
      user.group_name || null,
      user.unit || null,
      user.role || null,
      (newNotif) => {
        console.log('🔔 [Live Notification Received]:', newNotif.title);
        
        // Agregar a la lista
        setNotifications(prev => [newNotif, ...prev]);

        // Mostrar Toast flotante en vivo
        setActiveToast(newNotif);

        // Auto-cerrar después de 6 segundos
        setTimeout(() => {
          setActiveToast(curr => (curr?.id === newNotif.id ? null : curr));
        }, 6000);
      }
    );

    return () => {
      unsubscribe();
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
