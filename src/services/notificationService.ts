import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AppNotification {
  id: string;
  sender_id?: string | null;
  receiver_id?: string | null;
  receiver_role?: string | null;
  title: string;
  message: string;
  type: 'badge' | 'membership' | 'calendar' | 'program' | 'plan' | 'info' | 'alert';
  group_name?: string | null;
  unit?: string | null;
  read: boolean;
  created_at: string;
}

class NotificationService {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<(notification: AppNotification) => void> = new Set();

  /**
   * Obtiene el estado actual del permiso de notificaciones Push del navegador.
   */
  getBrowserPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission;
    }
    return 'unsupported';
  }

  /**
   * Solicita permisos de notificación Push al navegador / dispositivo móvil.
   */
  async requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await window.Notification.requestPermission();
        return perm;
      } catch (e) {
        console.warn('Error solicitando permisos de notificación:', e);
        return 'denied';
      }
    }
    return 'unsupported';
  }

  /**
   * Reproduce un sonido de notificación sutil (usando Web Audio API).
   */
  playNotificationSound() {
    if (typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Tono Scout agradable (Fa#5 -> La5)
        osc.frequency.setValueAtTime(740, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {
        // Silencioso si el navegador bloquea audio sin interacción previa
      }
    }
  }

  /**
   * Emite una notificación Push nativa del sistema operativo (Windows, macOS, Android, iOS PWA).
   */
  triggerSystemPushNotification(title: string, message: string, iconUrl: string = '/favicon.ico') {
    this.playNotificationSound();

    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      try {
        // Si hay un Service Worker activo (PWA / Mobile Chrome), usar showNotification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body: message,
              icon: iconUrl,
              badge: iconUrl,
              vibrate: [200, 100, 200],
              tag: `scout_notif_${Date.now()}`
            } as any);
          }).catch(() => {
            new window.Notification(title, {
              body: message,
              icon: iconUrl
            });
          });
        } else {
          new window.Notification(title, {
            body: message,
            icon: iconUrl
          });
        }

        // Vibración en dispositivos móviles
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (err) {
        console.warn('Aviso mostrando notificación Push del sistema:', err);
      }
    }
  }

  /**
   * Suscribe en tiempo real (WebSockets) a las notificaciones dirigidas al usuario, su grupo o su unidad.
   */
  subscribeToLiveNotifications(
    userId: string,
    groupName: string | null,
    unit: string | null,
    role: string | null,
    onNotification: (notification: AppNotification) => void
  ): () => void {
    this.listeners.add(onNotification);

    if (!this.channel) {
      try {
        this.channel = supabase
          .channel(`notifications_realtime_global_${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              const newNotif = payload.new as AppNotification;
              if (!newNotif) return;

              // Validar si la notificación corresponde a este usuario
              const isDirectUser = Boolean(newNotif.receiver_id && newNotif.receiver_id === userId);
              const isRoleMatch = Boolean(newNotif.receiver_role && role && newNotif.receiver_role.toLowerCase() === role.toLowerCase());
              const isGroupMatch = !newNotif.receiver_id && Boolean(newNotif.group_name && groupName && newNotif.group_name.toLowerCase() === groupName.toLowerCase());
              const isUnitMatch = !newNotif.unit || Boolean(unit && newNotif.unit.toLowerCase() === unit.toLowerCase());

              if (isDirectUser || (isGroupMatch && isUnitMatch) || (isRoleMatch && (isGroupMatch || !newNotif.group_name))) {
                // Notificar en el sistema operativo / PUSH
                this.triggerSystemPushNotification(newNotif.title, newNotif.message);

                this.listeners.forEach(cb => {
                  try {
                    cb(newNotif);
                  } catch (e) {
                    console.error('Error en callback de notificación en vivo:', e);
                  }
                });
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 [Realtime] Conexión de Notificaciones en Vivo:', status);
          });
      } catch (err) {
        console.warn('Aviso inicializando Realtime Channel de Notificaciones:', err);
      }
    }

    return () => {
      this.listeners.delete(onNotification);
      if (this.listeners.size === 0 && this.channel) {
        supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  /**
   * Envía una notificación instantánea a la base de datos (se distribuye en vivo a todos los receptores).
   */
  async sendNotification(params: {
    senderId?: string;
    receiverId?: string;
    receiverRole?: string;
    title: string;
    message: string;
    type?: 'badge' | 'membership' | 'calendar' | 'program' | 'plan' | 'info' | 'alert';
    groupName?: string;
    unit?: string;
  }): Promise<AppNotification | null> {
    try {
      const payload = {
        sender_id: params.senderId || null,
        receiver_id: params.receiverId || null,
        receiver_role: params.receiverRole || null,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        group_name: params.groupName || null,
        unit: params.unit || null,
        read: false
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.warn('Aviso enviando notificación a Supabase:', error.message);
        return null;
      }

      return data as AppNotification;
    } catch (e) {
      console.warn('Error enviando notificación:', e);
      return null;
    }
  }

  /**
   * Obtiene la lista de notificaciones históricas del usuario con filtrado seguro.
   */
  async getUserNotifications(
    userId: string,
    groupName?: string | null,
    role?: string | null,
    unit?: string | null
  ): Promise<AppNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Aviso obteniendo notificaciones:', error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Filtrado robusto en memoria para compatibilidad total
      const filtered = data.filter((item: AppNotification) => {
        if (item.receiver_id && item.receiver_id === userId) return true;

        if (item.receiver_role && role && item.receiver_role.toLowerCase() === role.toLowerCase()) {
          if (!item.group_name || (groupName && item.group_name.toLowerCase() === groupName.toLowerCase())) {
            return true;
          }
        }

        if (!item.receiver_id && !item.receiver_role) {
          if (!item.group_name || (groupName && item.group_name.toLowerCase() === groupName.toLowerCase())) {
            if (!item.unit || (unit && item.unit.toLowerCase() === unit.toLowerCase())) {
              return true;
            }
          }
        }

        return false;
      });

      return filtered;
    } catch (e) {
      console.warn('Error procesando notificaciones:', e);
      return [];
    }
  }

  /**
   * Marca una notificación como leída.
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (e) {
      console.warn('Error marcando notificación leída:', e);
    }
  }

  /**
   * Marca todas las notificaciones del usuario como leídas.
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('receiver_id', userId);
    } catch (e) {
      console.warn('Error marcando todas leídas:', e);
    }
  }
}

export const notificationService = new NotificationService();
