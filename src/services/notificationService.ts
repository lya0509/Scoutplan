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
          .channel(`notifications_realtime_global`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              const newNotif = payload.new as AppNotification;
              if (!newNotif) return;

              // Validar si la notificación corresponde a este usuario
              const isDirectUser = newNotif.receiver_id && newNotif.receiver_id === userId;
              const isRoleMatch = newNotif.receiver_role && newNotif.receiver_role === role;
              const isGroupMatch = !newNotif.receiver_id && newNotif.group_name && newNotif.group_name === groupName;
              const isUnitMatch = !newNotif.unit || (unit && newNotif.unit.toLowerCase() === unit.toLowerCase());

              if (isDirectUser || (isGroupMatch && isUnitMatch) || (isRoleMatch && isGroupMatch)) {
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
   * Obtiene la lista de notificaciones históricas del usuario.
   */
  async getUserNotifications(userId: string, groupName?: string | null): Promise<AppNotification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (userId) {
        if (groupName) {
          query = query.or(`receiver_id.eq.${userId},and(receiver_id.is.null,group_name.eq.${groupName})`);
        } else {
          query = query.eq('receiver_id', userId);
        }
      }

      const { data, error } = await query;
      if (error) return [];
      return (data || []) as AppNotification[];
    } catch (e) {
      console.warn('Error obteniendo notificaciones:', e);
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
