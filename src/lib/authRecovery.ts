/**
 * Recuperación de contraseña (web).
 *
 * El cliente de Supabase tiene `detectSessionInUrl: false`, así que el enlace del correo
 * ("…/#access_token=…&refresh_token=…&type=recovery") se lee aquí a mano, una sola vez al
 * abrir la app. Mientras la persona no escriba su contraseña nueva, la app queda en
 * "modo recuperación" (también si recarga la página).
 */

const RECOVERY_FLAG = '@pw_recovery';

export interface RecoveryLink {
  tokens?: { access_token: string; refresh_token: string };
  error?: string;
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && !!window.location;
}

/** Lee y BORRA de la barra de direcciones los datos del enlace de recuperación. */
export function readRecoveryLink(): RecoveryLink | null {
  if (!hasWindow()) return null;
  const raw = (window.location.hash || '').replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const type = params.get('type');
  const errorCode = params.get('error_code') || params.get('error');
  if (!type && !errorCode) return null;

  // Quitar el token de la URL (que no quede en el historial ni se comparta por error)
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {}

  if (errorCode) {
    const expired = /expired|otp_expired/i.test(errorCode + ' ' + (params.get('error_description') || ''));
    return {
      error: expired
        ? 'El enlace para cambiar la contraseña ya venció o ya se usó. Pide uno nuevo con «¿Olvidaste tu contraseña?».'
        : 'El enlace para cambiar la contraseña no es válido. Pide uno nuevo con «¿Olvidaste tu contraseña?».',
    };
  }
  if (type !== 'recovery') return null;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { tokens: { access_token, refresh_token } };
}

export function setRecoveryFlag(on: boolean) {
  if (!hasWindow()) return;
  try {
    if (on) window.sessionStorage.setItem(RECOVERY_FLAG, '1');
    else window.sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {}
}

export function hasRecoveryFlag(): boolean {
  if (!hasWindow()) return false;
  try { return window.sessionStorage.getItem(RECOVERY_FLAG) === '1'; } catch { return false; }
}

/** Dirección a la que debe volver el enlace del correo. */
export function recoveryRedirectUrl(): string | undefined {
  if (!hasWindow()) return undefined;
  return window.location.origin + '/';
}
