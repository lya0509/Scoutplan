import { supabase } from './supabaseClient';

const PRODUCTION_ORIGIN = 'https://scoutplan.vercel.app';

/** URL de una función de /api: relativa en Vercel, absoluta en desarrollo local. */
export function apiUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return path;
  }
  return `${PRODUCTION_ORIGIN}${path}`;
}

/**
 * POST a una función de /api enviando el token de sesión del usuario,
 * para que el servidor pueda verificar quién hace la petición.
 */
export async function postApi<T = any>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Sesión no iniciada');

  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  return res.json();
}
