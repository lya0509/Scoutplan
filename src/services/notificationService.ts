import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { webPushService } from './webPushService';

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

export const OFFICIAL_SYSTEM_ANNOUNCEMENTS: AppNotification[] = [
  {
    id: 'system_maint_2026_08_30',
    title: '🛠️ Comunicado Oficial: Mantenimiento y Actualizaciones del Plan Progresivo',
    message: `Estimada Comunidad Scout:

La plataforma ha completado con éxito un mantenimiento preventivo y optimización integral del módulo de Progresión y Acreditaciones.

📋 Resumen de cambios y mejoras implementadas:
1. 🏅 Previsualización Integral de Etapas: Ahora puedes consultar en cualquier momento los requisitos de tus etapas aprobadas y de las etapas bloqueadas en modo de solo lectura.
2. 🔗 Corrección en Especialidades y Cursos: Se implementó la vinculación individual estricta por etapa y el bloqueo de diplomas ya utilizados para garantizar que no existan especialidades duplicadas.
3. 🏕️ Desglose de Vida de Grupo y Ciclos Institucionales (CIP): Los campamentos, peregrinajes, proyectos de servicio y pernoctas ahora cuentan con contadores exactos y visualización de convalidación clara.
4. 🧹 Reinicio Limpio de Progresión: Se reinició el avance de las etapas a Precursor para permitir un registro limpio y ordenado desde cero. Todas las cuentas de usuario, fotos de perfil, credenciales y certificados subidos a la biblioteca permanecen 100% seguros e intactos.

¡Siempre Listos para Servir!`,
    type: 'alert',
    read: false,
    created_at: new Date('2026-08-30T21:20:00Z').toISOString()
  }
];

class NotificationService {
  private broadcastChannel: RealtimeChannel | null = null;
  private listeners: Set<(notification: AppNotification) => void> = new Set();
  private processedIds: Set<string> = new Set();

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
   * Solicita permisos de notificación Push al navegador / dispositivo móvil y suscribe en segundo plano.
   */
  async requestBrowserNotificationPermission(userId?: string): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await window.Notification.requestPermission();
        if (perm === 'granted' && userId) {
          await webPushService.registerDevicePushSubscription(userId);
        }
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

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
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

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (err) {
        console.warn('Aviso mostrando notificación Push del sistema:', err);
      }
    }
  }

  /**
   * Guarda una notificación en el historial local del usuario.
   */
  private async saveLocalNotification(userId: string, notification: AppNotification) {
    try {
      const key = `@scout_notifications_storage_${userId}`;
      const raw = await AsyncStorage.getItem(key);
      const list: AppNotification[] = raw ? JSON.parse(raw) : [];

      if (!list.some(n => n.id === notification.id)) {
        const updated = [notification, ...list].slice(0, 100);
        await AsyncStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Error guardando notificación local:', e);
    }
  }

  /**
   * Suscribe en tiempo real (WebSockets + Broadcast Channel) a las notificaciones dirigidas al usuario.
   */
  subscribeToLiveNotifications(
    userId: string,
    groupName: string | null,
    unit: string | null,
    role: string | null,
    onNotification: (notification: AppNotification) => void
  ): () => void {
    this.listeners.add(onNotification);

    if (!this.broadcastChannel) {
      try {
        this.broadcastChannel = (supabase as any)
          .channel('scout_realtime_notifications_hub')
          .on('broadcast', { event: 'scout_notification' }, ({ payload }: any) => {
            const newNotif = payload as AppNotification;
            if (!newNotif || this.processedIds.has(newNotif.id)) return;

            const isGlobal = !newNotif.receiver_id && !newNotif.receiver_role && !newNotif.group_name;
            const isDirectUser = Boolean(newNotif.receiver_id && newNotif.receiver_id === userId);
            const isRoleMatch = Boolean(newNotif.receiver_role && role && newNotif.receiver_role.toLowerCase() === role.toLowerCase());
            const isGroupMatch = !newNotif.receiver_id && Boolean(newNotif.group_name && groupName && newNotif.group_name.toLowerCase() === groupName.toLowerCase());
            const isUnitMatch = !newNotif.unit || Boolean(unit && newNotif.unit.toLowerCase() === unit.toLowerCase());

            if (isGlobal || isDirectUser || (isGroupMatch && isUnitMatch) || (isRoleMatch && (isGroupMatch || !newNotif.group_name))) {
              this.processedIds.add(newNotif.id);
              this.saveLocalNotification(userId, newNotif);
              this.triggerSystemPushNotification(newNotif.title, newNotif.message);

              this.listeners.forEach(cb => {
                try { cb(newNotif); } catch (e) {}
              });
            }
          })
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload: any) => {
              const newNotif = payload.new as AppNotification;
              if (!newNotif || this.processedIds.has(newNotif.id)) return;

              const isGlobal = !newNotif.receiver_id && !newNotif.receiver_role && !newNotif.group_name;
              const isDirectUser = Boolean(newNotif.receiver_id && newNotif.receiver_id === userId);
              const isRoleMatch = Boolean(newNotif.receiver_role && role && newNotif.receiver_role.toLowerCase() === role.toLowerCase());
              const isGroupMatch = !newNotif.receiver_id && Boolean(newNotif.group_name && groupName && newNotif.group_name.toLowerCase() === groupName.toLowerCase());
              const isUnitMatch = !newNotif.unit || Boolean(unit && newNotif.unit.toLowerCase() === unit.toLowerCase());

              if (isGlobal || isDirectUser || (isGroupMatch && isUnitMatch) || (isRoleMatch && (isGroupMatch || !newNotif.group_name))) {
                this.processedIds.add(newNotif.id);
                this.saveLocalNotification(userId, newNotif);
                this.triggerSystemPushNotification(newNotif.title, newNotif.message);

                this.listeners.forEach(cb => {
                  try { cb(newNotif); } catch (e) {}
                });
              }
            }
          )
          .subscribe((status: any) => {
            console.log('📡 [Realtime Hub] Conexión de Notificaciones en Vivo:', status);
          });
      } catch (err) {
        console.warn('Aviso inicializando Realtime Channel:', err);
      }
    }

    return () => {
      this.listeners.delete(onNotification);
      if (this.listeners.size === 0 && this.broadcastChannel) {
        supabase.removeChannel(this.broadcastChannel);
        this.broadcastChannel = null;
      }
    };
  }

  /**
   * Envía una notificación instantánea (Broadcast en Vivo + Base de Datos + Almacenamiento Local).
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
    const notifObj: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender_id: params.senderId || null,
      receiver_id: params.receiverId || null,
      receiver_role: params.receiverRole || null,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      group_name: params.groupName || null,
      unit: params.unit || null,
      read: false,
      created_at: new Date().toISOString()
    };

    // 1. Guardar en almacenamiento local del receptor
    if (params.receiverId) {
      await this.saveLocalNotification(params.receiverId, notifObj);
    }
    await this.saveLocalNotification('global_all', notifObj);

    // 2. Transmisión Instantánea por WebSocket Broadcast
    try {
      if (this.broadcastChannel) {
        await this.broadcastChannel.send({
          type: 'broadcast',
          event: 'scout_notification',
          payload: notifObj
        });
      } else {
        const tempChannel = supabase.channel('scout_realtime_notifications_hub');
        tempChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await tempChannel.send({
              type: 'broadcast',
              event: 'scout_notification',
              payload: notifObj
            });
          }
        });
      }
    } catch (e) {
      console.warn('Aviso enviando broadcast en vivo:', e);
    }

    // 3. Persistir en base de datos Supabase
    try {
      await supabase.from('notifications').insert(notifObj);
    } catch (e) {}

    try {
      if (params.receiverId) {
        await supabase.from('scout_notifications').insert({
          scout_id: params.receiverId,
          title: params.title,
          reason: params.message,
          is_read: false
        });
      }
    } catch (e) {}

    // 4. Despacho de Web Push en Segundo Plano (Despierta teléfonos y PCs con app cerrada)
    try {
      const pushPayload = {
        title: params.title,
        body: params.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `scout_push_${notifObj.id}`,
        url: '/',
        data: {
          id: notifObj.id,
          type: notifObj.type,
          receiverId: params.receiverId
        }
      };

      if (params.receiverId) {
        webPushService.dispatchBackgroundPushToUser(params.receiverId, pushPayload);
      } else if (params.groupName || params.unit || params.receiverRole) {
        webPushService.dispatchBackgroundPushToGroupOrRole({
          groupName: params.groupName,
          unit: params.unit,
          role: params.receiverRole,
          payload: pushPayload
        });
      }
    } catch (pushErr) {
      console.warn('Aviso despachando Web Push en segundo plano:', pushErr);
    }

    return notifObj;
  }

  /**
   * Obtiene la lista de notificaciones históricas del usuario (Supabase + LocalStorage unificados).
   */
  async getUserNotifications(
    userId: string,
    groupName?: string | null,
    role?: string | null,
    unit?: string | null
  ): Promise<AppNotification[]> {
    const combinedMap = new Map<string, AppNotification>();

    // Cargar IDs leídos y eliminados localmente
    let readIdsSet = new Set<string>();
    let deletedIdsSet = new Set<string>();
    try {
      const rawRead = await AsyncStorage.getItem(`@scout_notifications_read_ids_${userId}`);
      if (rawRead) readIdsSet = new Set(JSON.parse(rawRead));

      const rawDeleted = await AsyncStorage.getItem(`@scout_notifications_deleted_ids_${userId}`);
      if (rawDeleted) deletedIdsSet = new Set(JSON.parse(rawDeleted));
    } catch (e) {}

    // 0. Cargar comunicados oficiales del sistema
    OFFICIAL_SYSTEM_ANNOUNCEMENTS.forEach(ann => {
      if (!deletedIdsSet.has(ann.id)) {
        const isRead = readIdsSet.has(ann.id);
        combinedMap.set(ann.id, { ...ann, read: isRead });
      }
    });

    // 1. Cargar desde almacenamiento local
    try {
      const rawUser = await AsyncStorage.getItem(`@scout_notifications_storage_${userId}`);
      if (rawUser) {
        const list: AppNotification[] = JSON.parse(rawUser);
        list.forEach(item => {
          if (!deletedIdsSet.has(item.id)) {
            combinedMap.set(item.id, {
              ...item,
              read: item.read || readIdsSet.has(item.id)
            });
          }
        });
      }

      const rawGlobal = await AsyncStorage.getItem('@scout_notifications_storage_global_all');
      if (rawGlobal) {
        const list: AppNotification[] = JSON.parse(rawGlobal);
        list.forEach(item => {
          if (deletedIdsSet.has(item.id)) return;
          const isGlobal = !item.receiver_id && !item.receiver_role && !item.group_name;
          const isDirectUser = item.receiver_id === userId;
          const isRoleMatch = Boolean(item.receiver_role && role && item.receiver_role.toLowerCase() === role.toLowerCase());
          const isGroupMatch = !item.receiver_id && Boolean(item.group_name && groupName && item.group_name.toLowerCase() === groupName.toLowerCase());
          const isUnitMatch = !item.unit || Boolean(unit && item.unit.toLowerCase() === unit.toLowerCase());

          if (isGlobal || isDirectUser || (isGroupMatch && isUnitMatch) || (isRoleMatch && (isGroupMatch || !item.group_name))) {
            const isRead = item.read || readIdsSet.has(item.id) || (combinedMap.has(item.id) && combinedMap.get(item.id)!.read);
            combinedMap.set(item.id, { ...item, read: Boolean(isRead) });
          }
        });
      }
    } catch (e) {}

    // 2. Cargar desde Supabase tabla 'notifications'
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        data.forEach((item: AppNotification) => {
          if (deletedIdsSet.has(item.id)) return;
          const isGlobal = !item.receiver_id && !item.receiver_role && !item.group_name;
          const isDirectUser = item.receiver_id === userId;
          const isRoleMatch = Boolean(item.receiver_role && role && item.receiver_role.toLowerCase() === role.toLowerCase());
          const isGroupMatch = !item.receiver_id && Boolean(item.group_name && groupName && item.group_name.toLowerCase() === groupName.toLowerCase());
          const isUnitMatch = !item.unit || Boolean(unit && item.unit.toLowerCase() === unit.toLowerCase());

          if (isGlobal || isDirectUser || (isGroupMatch && isUnitMatch) || (isRoleMatch && (isGroupMatch || !item.group_name))) {
            const isRead = item.read || readIdsSet.has(item.id) || (combinedMap.has(item.id) && combinedMap.get(item.id)!.read);
            combinedMap.set(item.id, { ...item, read: Boolean(isRead) });
          }
        });
      }
    } catch (e) {}

    // 3. Cargar desde Supabase tabla 'scout_notifications' (si existían allí)
    try {
      const { data: legacyData } = await supabase
        .from('scout_notifications')
        .select('*')
        .eq('scout_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (legacyData && legacyData.length > 0) {
        legacyData.forEach((item: any) => {
          const legacyId = `legacy_${item.id}`;
          if (deletedIdsSet.has(legacyId)) return;
          if (!combinedMap.has(legacyId)) {
            const isRead = Boolean(item.is_read) || readIdsSet.has(legacyId);
            combinedMap.set(legacyId, {
              id: legacyId,
              receiver_id: userId,
              title: item.title || 'Notificación Scout',
              message: item.reason || item.message || '',
              type: item.title?.includes('Aprobada') ? 'badge' : (item.title?.includes('Ficha') ? 'alert' : 'info'),
              read: isRead,
              created_at: item.created_at || new Date().toISOString()
            });
          }
        });
      }
    } catch (e) {}

    const results = Array.from(combinedMap.values());
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return results;
  }

  /**
   * Marca una notificación como leída en almacenamiento local y base de datos.
   */
  async markAsRead(notificationId: string, userId?: string): Promise<void> {
    if (userId) {
      try {
        const readKey = `@scout_notifications_read_ids_${userId}`;
        const rawRead = await AsyncStorage.getItem(readKey);
        const readSet: string[] = rawRead ? JSON.parse(rawRead) : [];
        if (!readSet.includes(notificationId)) {
          readSet.push(notificationId);
          await AsyncStorage.setItem(readKey, JSON.stringify(readSet));
        }

        const userKey = `@scout_notifications_storage_${userId}`;
        const rawUser = await AsyncStorage.getItem(userKey);
        if (rawUser) {
          const list: AppNotification[] = JSON.parse(rawUser);
          const updated = list.map(n => n.id === notificationId ? { ...n, read: true } : n);
          await AsyncStorage.setItem(userKey, JSON.stringify(updated));
        }
      } catch (e) {}
    }

    try {
      const globalKey = '@scout_notifications_storage_global_all';
      const rawGlobal = await AsyncStorage.getItem(globalKey);
      if (rawGlobal) {
        const list: AppNotification[] = JSON.parse(rawGlobal);
        const updated = list.map(n => n.id === notificationId ? { ...n, read: true } : n);
        await AsyncStorage.setItem(globalKey, JSON.stringify(updated));
      }
    } catch (e) {}

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (e) {}

    try {
      if (notificationId.startsWith('legacy_')) {
        const rawId = notificationId.replace('legacy_', '');
        await supabase
          .from('scout_notifications')
          .update({ is_read: true })
          .eq('id', rawId);
      }
    } catch (e) {}
  }

  /**
   * Marca todas las notificaciones del usuario como leídas.
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const userKey = `@scout_notifications_storage_${userId}`;
      const raw = await AsyncStorage.getItem(userKey);
      const list: AppNotification[] = raw ? JSON.parse(raw) : [];
      const updated = list.map(n => ({ ...n, read: true }));
      await AsyncStorage.setItem(userKey, JSON.stringify(updated));

      const readKey = `@scout_notifications_read_ids_${userId}`;
      const allIds = list.map(n => n.id);
      await AsyncStorage.setItem(readKey, JSON.stringify(allIds));
    } catch (e) {}

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('receiver_id', userId);
    } catch (e) {}

    try {
      await supabase
        .from('scout_notifications')
        .update({ is_read: true })
        .eq('scout_id', userId);
    } catch (e) {}
  }

  /**
   * Elimina una notificación individual de la bandeja.
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const delKey = `@scout_notifications_deleted_ids_${userId}`;
      const rawDel = await AsyncStorage.getItem(delKey);
      const delSet: string[] = rawDel ? JSON.parse(rawDel) : [];
      if (!delSet.includes(notificationId)) {
        delSet.push(notificationId);
        await AsyncStorage.setItem(delKey, JSON.stringify(delSet));
      }

      const userKey = `@scout_notifications_storage_${userId}`;
      const rawUser = await AsyncStorage.getItem(userKey);
      if (rawUser) {
        const list: AppNotification[] = JSON.parse(rawUser);
        const filtered = list.filter(n => n.id !== notificationId);
        await AsyncStorage.setItem(userKey, JSON.stringify(filtered));
      }
    } catch (e) {}

    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
    } catch (e) {}

    try {
      if (notificationId.startsWith('legacy_')) {
        const rawId = notificationId.replace('legacy_', '');
        await supabase.from('scout_notifications').delete().eq('id', rawId);
      }
    } catch (e) {}
  }

  /**
   * Limpia y vacía toda la bandeja de notificaciones.
   */
  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const userKey = `@scout_notifications_storage_${userId}`;
      const raw = await AsyncStorage.getItem(userKey);
      if (raw) {
        const list: AppNotification[] = JSON.parse(raw);
        const delKey = `@scout_notifications_deleted_ids_${userId}`;
        const rawDel = await AsyncStorage.getItem(delKey);
        const delSet: string[] = rawDel ? JSON.parse(rawDel) : [];
        list.forEach(n => {
          if (!delSet.includes(n.id)) delSet.push(n.id);
        });
        await AsyncStorage.setItem(delKey, JSON.stringify(delSet));
        await AsyncStorage.removeItem(userKey);
      }
    } catch (e) {}

    try {
      await supabase.from('notifications').delete().eq('receiver_id', userId);
    } catch (e) {}

    try {
      await supabase.from('scout_notifications').delete().eq('scout_id', userId);
    } catch (e) {}
  }
}

export const notificationService = new NotificationService();
