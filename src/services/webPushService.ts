import { supabase } from '../lib/supabaseClient';
import { postApi } from '../lib/apiClient';

// Solo la clave PÚBLICA va en la app. La privada vive en el servidor (Vercel).
export const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || '';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Convierte una clave pública VAPID en Base64 URL-safe a Uint8Array para PushManager.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Compara la clave con la que se creó una suscripción existente. */
function sameKey(existing: ArrayBuffer | null | undefined, expected: Uint8Array): boolean {
  if (!existing) return false;
  const a = new Uint8Array(existing);
  if (a.length !== expected.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== expected[i]) return false;
  return true;
}

class WebPushService {
  /**
   * Suscribe el dispositivo actual al sistema de Web Push en segundo plano y pantalla de bloqueo.
   */
  async registerDevicePushSubscription(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('ℹ️ Web Push Manager no soportado en este navegador.');
      return false;
    }

    try {
      if (!VAPID_PUBLIC_KEY) {
        console.warn('Falta EXPO_PUBLIC_VAPID_PUBLIC_KEY: notificaciones push desactivadas.');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription = await registration.pushManager.getSubscription();

      // Si la suscripción se creó con una clave VAPID anterior, ya no sirve: se renueva.
      if (subscription && !sameKey(subscription.options?.applicationServerKey, applicationServerKey)) {
        const oldEndpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', oldEndpoint);
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any
        });
      }

      if (subscription) {
        const subJson = subscription.toJSON();
        const endpoint = subJson.endpoint;
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (endpoint && p256dh && auth) {
          try {
            await supabase
              .from('push_subscriptions')
              .upsert(
                {
                  user_id: userId,
                  endpoint,
                  p256dh,
                  auth,
                  user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web App',
                  updated_at: new Date().toISOString()
                },
                { onConflict: 'endpoint' }
              );

            console.log('✅ Dispositivo suscrito exitosamente a Web Push en segundo plano.');
            return true;
          } catch (dbErr) {
            console.warn('Aviso guardando suscripción en base de datos:', dbErr);
            return true;
          }
        }
      }
    } catch (err: any) {
      console.warn('Aviso al suscribir dispositivo a Web Push:', err?.message || err);
    }
    return false;
  }

  /**
   * Envía un mensaje Push en segundo plano a todos los dispositivos registrados del destinatario.
   */
  async dispatchBackgroundPushToUser(
    targetUserId: string,
    payload: PushPayload
  ): Promise<number> {
    // El envío se hace en el servidor (/api/send-push), que es el único que tiene la clave privada.
    try {
      const json = await postApi<{ count?: number }>('/api/send-push', {
        receiverId: targetUserId,
        title: payload.title,
        message: payload.body,
        url: payload.url || '/',
        data: payload.data || {}
      });
      return json.count ?? 0;
    } catch (err) {
      console.warn('Aviso enviando push vía /api/send-push:', err);
      return 0;
    }
  }

  /**
   * Envía un mensaje Push a un rol o grupo entero.
   */
  async dispatchBackgroundPushToGroupOrRole(params: {
    groupName?: string;
    unit?: string;
    role?: string;
    payload: PushPayload;
  }): Promise<number> {
    try {
      const json = await postApi<{ count?: number }>('/api/send-push', {
        groupName: params.groupName,
        unit: params.unit,
        receiverRole: params.role,
        title: params.payload.title,
        message: params.payload.body,
        url: params.payload.url || '/',
        data: params.payload.data || {}
      });
      return json.count ?? 0;
    } catch (err) {
      console.warn('Aviso en envío masivo vía /api/send-push:', err);
      return 0;
    }
  }
}

export const webPushService = new WebPushService();
