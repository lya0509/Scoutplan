import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;
  private onlineUserIds: Set<string> = new Set();
  private listeners: Set<(onlineIds: Set<string>) => void> = new Set();
  private heartbeatTimer: any = null;

  /**
   * Inicializa la suscripción de presencia para el usuario conectado.
   */
  init(user: { id: string; name?: string | null; unit?: string | null; group_name?: string | null; role?: string | null }) {
    if (!user?.id) return;
    this.currentUserId = user.id;

    // Si ya existe un canal previo para otro usuario, destruirlo
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    try {
      this.channel = supabase.channel('scout_presence_global', {
        config: {
          presence: { key: user.id }
        }
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel) return;
          const state = this.channel.presenceState();
          const activeIds = new Set<string>();

          Object.keys(state).forEach((key) => {
            activeIds.add(key);
            const userPresences = state[key] as any[];
            userPresences?.forEach(p => {
              if (p?.user_id) activeIds.add(p.user_id);
            });
          });

          // Asegurar que el usuario actual siempre se considere online
          if (this.currentUserId) {
            activeIds.add(this.currentUserId);
          }

          this.onlineUserIds = activeIds;
          this.notifyListeners();
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.onlineUserIds.add(key);
          newPresences?.forEach((p: any) => {
            if (p?.user_id) this.onlineUserIds.add(p.user_id);
          });
          this.notifyListeners();
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (key !== this.currentUserId) {
            this.onlineUserIds.delete(key);
            leftPresences?.forEach((p: any) => {
              if (p?.user_id && p.user_id !== this.currentUserId) {
                this.onlineUserIds.delete(p.user_id);
              }
            });
            this.notifyListeners();
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && this.channel) {
            await this.channel.track({
              user_id: user.id,
              name: user.name || 'Scout',
              unit: user.unit || 'clan',
              group_name: user.group_name || 'Grupo Scout Orión #84',
              online_at: new Date().toISOString()
            });

            // Enviar primer heartbeat
            this.sendDatabaseHeartbeat(user.id);
          }
        });

      // Iniciar heartbeat cada 25 segundos
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        if (this.currentUserId) {
          this.sendDatabaseHeartbeat(this.currentUserId);
          if (this.channel) {
            this.channel.track({
              user_id: user.id,
              name: user.name || 'Scout',
              online_at: new Date().toISOString()
            }).catch(() => {});
          }
        }
      }, 25000);

    } catch (e) {
      console.warn('Aviso iniciando PresenceService:', e);
    }
  }

  private async sendDatabaseHeartbeat(userId: string) {
    try {
      await supabase.from('profiles').update({
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    } catch (err) {
      // Silencioso
    }
  }

  private notifyListeners() {
    const copy = new Set(this.onlineUserIds);
    this.listeners.forEach(cb => {
      try {
        cb(copy);
      } catch (e) {
        console.error('Error en listener de PresenceService:', e);
      }
    });
  }

  /**
   * Suscribe un componente para recibir actualizaciones en vivo de usuarios online.
   */
  subscribe(callback: (onlineIds: Set<string>) => void): () => void {
    this.listeners.add(callback);
    callback(new Set(this.onlineUserIds));

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Consulta si un usuario específico está en línea.
   */
  isUserOnline(userId?: string | null, lastSeenIso?: string | null): boolean {
    if (!userId) return false;
    if (this.currentUserId && userId === this.currentUserId) return true;
    if (this.onlineUserIds.has(userId)) return true;

    // Respaldo por timestamp en base de datos (< 5 minutos)
    if (lastSeenIso) {
      try {
        const lastSeenTime = new Date(lastSeenIso).getTime();
        const diffMs = Date.now() - lastSeenTime;
        if (diffMs < 5 * 60 * 1000) return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.onlineUserIds.clear();
    this.listeners.clear();
    this.currentUserId = null;
  }
}

export const presenceService = new PresenceService();
