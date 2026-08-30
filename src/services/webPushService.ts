import { supabase } from '../lib/supabaseClient';

export const VAPID_PUBLIC_KEY = 'BKI-1dAzf2KYpi_pK4yrLEBeVE21dNkmMZvNmqi_DzMNDvQ765LxwSc0-J2qvTUcK428jGIvPc_4I3yTUm-uFf4';
export const VAPID_PRIVATE_KEY = 'T0AG7UHD8QLWi2s7RkK3rMrIZmZf4yK6Jc0JvNyf19E';
export const VAPID_SUBJECT = 'mailto:admin@scoutplan.app';

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

/**
 * Convierte un ArrayBuffer a Base64 URL-safe.
 */
function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convierte un string Base64 URL-safe a Uint8Array.
 */
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Genera el JWT VAPID firmado con ES256 usando Web Crypto API.
 */
async function generateVapidToken(audience: string): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Cryptography API no disponible');
  }

  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT
  };

  const headerStr = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadStr = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerStr}.${payloadStr}`;

  // Clave privada PKCS#8 DER para P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20
  ]);
  const privateKeyBytes = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);

  const importedKey = await cryptoObj.subtle.importKey(
    'pkcs8',
    pkcs8Key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await cryptoObj.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    importedKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBase64 = bufferToBase64Url(signature);
  return `${unsignedToken}.${signatureBase64}`;
}

/**
 * Cifra la carga útil con AES-128-GCM según RFC 8291 para Web Push.
 */
async function encryptPayloadAes128Gcm(
  userP256dhBase64: string,
  userAuthBase64: string,
  payloadText: string
): Promise<Uint8Array> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
  const userPublicKeyBytes = base64UrlToUint8Array(userP256dhBase64);
  const userAuthBytes = base64UrlToUint8Array(userAuthBase64);

  // 1. Generar par de claves efímero local P-256
  const localKeyPair = await cryptoObj.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = new Uint8Array(await cryptoObj.subtle.exportKey('raw', localKeyPair.publicKey));

  // 2. Importar la clave pública del usuario
  const userPublicKey = await cryptoObj.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Obtener el secreto compartido ECDH
  const ecdhSecretBits = await cryptoObj.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    localKeyPair.privateKey,
    256
  );

  // 4. Derivación HKDF para auth y secret
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));

  const ecdhSecretKey = await cryptoObj.subtle.importKey('raw', ecdhSecretBits, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']);

  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...userPublicKeyBytes,
    ...localPublicKeyRaw
  ]);

  const prkBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: userAuthBytes,
      info: keyInfo
    },
    ecdhSecretKey,
    256
  );

  const prkKey = await cryptoObj.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']);

  // Derivar Content Encryption Key (16 bytes)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: cekInfo
    },
    prkKey,
    128
  );
  const cek = await cryptoObj.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);

  // Derivar Nonce (12 bytes)
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: nonceInfo
    },
    prkKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // 5. Preparar el registro con padding (0x02 delimitador según RFC 8291)
  const payloadBytes = new TextEncoder().encode(payloadText);
  const record = new Uint8Array(payloadBytes.length + 2);
  record.set(payloadBytes, 0);
  record[payloadBytes.length] = 0x02;
  record[payloadBytes.length + 1] = 0x00;

  // 6. Cifrar con AES-GCM
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cek,
    record
  );
  const ciphertext = new Uint8Array(ciphertextBuffer);

  // 7. Estructurar la cabecera del cuerpo aes128gcm
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = 65;
  header.set(localPublicKeyRaw, 21);

  const fullBody = new Uint8Array(header.length + ciphertext.length);
  fullBody.set(header, 0);
  fullBody.set(ciphertext, header.length);

  return fullBody;
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
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
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
    // 1. Intentar despacho mediante la función Serverless backend de Vercel (Sin bloqueo de CORS)
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: targetUserId,
            title: payload.title,
            message: payload.body,
            url: payload.url || '/',
            data: payload.data || {}
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.count !== undefined) return json.count;
        }
      }
    } catch (apiErr) {
      console.warn('Aviso intentando dispatch vía /api/send-push:', apiErr);
    }

    // 2. Fallback: Despacho directo con Web Crypto API
    try {
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', targetUserId);

      if (error || !subscriptions || subscriptions.length === 0) {
        return 0;
      }

      let successCount = 0;
      const payloadString = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        image: payload.image,
        tag: payload.tag || `scout_push_${Date.now()}`,
        url: payload.url || '/',
        data: payload.data || {}
      });

      for (const sub of subscriptions) {
        try {
          const endpointUrl = new URL(sub.endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
          const vapidToken = await generateVapidToken(audience);
          const encryptedBody = await encryptPayloadAes128Gcm(sub.p256dh, sub.auth, payloadString);

          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Encoding': 'aes128gcm',
              'TTL': '86400',
              'Urgency': 'high',
              'Authorization': `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`
            },
            body: encryptedBody as any
          });

          if (response.status === 200 || response.status === 201) {
            successCount++;
          } else if (response.status === 404 || response.status === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        } catch (pushErr) {
          console.warn('Aviso enviando Push al endpoint:', sub.endpoint, pushErr);
        }
      }

      return successCount;
    } catch (err) {
      console.warn('Aviso en dispatchBackgroundPushToUser:', err);
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
    // 1. Intentar despacho mediante backend Serverless
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupName: params.groupName,
            unit: params.unit,
            receiverRole: params.role,
            title: params.payload.title,
            message: params.payload.body,
            url: params.payload.url || '/',
            data: params.payload.data || {}
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.count !== undefined) return json.count;
        }
      }
    } catch (apiErr) {
      console.warn('Aviso intentando dispatch masivo vía /api/send-push:', apiErr);
    }

    // 2. Fallback
    try {
      let query = supabase.from('profiles').select('id');
      if (params.role) query = query.eq('role', params.role);
      if (params.groupName) query = query.ilike('group_name', `%${params.groupName}%`);
      if (params.unit) query = query.ilike('unit', `%${params.unit}%`);

      const { data: users } = await query;
      if (!users || users.length === 0) return 0;

      let totalPushed = 0;
      for (const u of users) {
        const count = await this.dispatchBackgroundPushToUser(u.id, params.payload);
        totalPushed += count;
      }
      return totalPushed;
    } catch (err) {
      console.warn('Aviso en dispatchBackgroundPushToGroupOrRole:', err);
      return 0;
    }
  }
}

export const webPushService = new WebPushService();
