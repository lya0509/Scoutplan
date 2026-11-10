// Errores que les pasan a los usuarios: se guardan solos en `bug_reports` (los ve la Jefatura
// del grupo en «🐞 Errores de la app»). Si la pantalla se cae entera (AppErrorBoundary) además
// se avisa al equipo por Telegram.
//
// Para no llenar la tabla de ruido:
// - Se ignoran fallos de red / sin internet (son normales y la app ya los maneja), errores de
//   extensiones del navegador y avisos internos sin información («Script error.», ResizeObserver).
// - El mismo error se manda como mucho una vez al día por teléfono, y como mucho 5 por sesión.
// - Sin internet se guardan en el teléfono y se envían al volver la conexión.

import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import { postApi } from './apiClient';
import { isRetryableError } from './offline/net';

const SENT_KEY = '@scout_err_sent_v1';
const PENDING_KEY = '@scout_err_pending_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_SESSION = 5;
const MAX_PENDING = 10;

let installed = false;
let sentThisSession = 0;

const IGNORE = /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|aborterror|the operation was aborted|sin conexi[oó]n|offline|resizeobserver loop|^script error\.?$|chunkloaderror|loading chunk/i;

interface PendingReport { row: Record<string, any>; fatal: boolean; text?: string }

function ls(): Storage | null {
  try { return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null; } catch { return null; }
}
function readJson<T>(key: string, fallback: T): T {
  try { const raw = ls()?.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
  try { ls()?.setItem(key, JSON.stringify(value)); } catch {}
}

/** Versión de la app = huella del archivo principal (cambia en cada publicación). */
function appVersion(): string {
  if (typeof document === 'undefined') return 'desconocida';
  const src = (document.querySelector('script[src*="/_expo/static/js/web/"]') as HTMLScriptElement | null)?.src || '';
  return (src.match(/-([a-f0-9]{8})[a-f0-9]*\.js/) || [])[1] || 'dev';
}

function currentUser(): { id?: string; name?: string; email?: string; role?: string } {
  return readJson<any>('@scout_cached_profile', {}) || {};
}

/** ¿Viene de una extensión del navegador u otro sitio y no de la app? */
function isForeign(stack: string, filename?: string) {
  const text = `${filename || ''}\n${stack}`;
  if (/chrome-extension:|moz-extension:|safari-(web-)?extension:/.test(text)) return true;
  if (typeof location === 'undefined') return false;
  // Si hay rutas de archivos y ninguna es de la app, no es nuestro
  const urls = text.match(/https?:\/\/[^\s)]+/g) || [];
  return urls.length > 0 && !urls.some(u => u.startsWith(location.origin));
}

function signature(message: string, stack: string) {
  const frame = (stack.split('\n').find(l => /\.js|\.tsx?/.test(l)) || '').replace(/\?.*$/, '').replace(/:\d+:\d+\)?$/, '').trim();
  return `${message.slice(0, 120)}|${frame.slice(-120)}`;
}

function shortAgent() {
  if (typeof navigator === 'undefined') return Platform.OS;
  const ua = navigator.userAgent || '';
  const os = /Android [\d.]+/.exec(ua)?.[0] || /iPhone OS [\d_]+/.exec(ua)?.[0]?.replace(/_/g, '.') || (/Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'otro');
  const br = /Edg\/[\d]+/.exec(ua)?.[0] || /SamsungBrowser\/[\d]+/.exec(ua)?.[0] || /Chrome\/[\d]+/.exec(ua)?.[0] || /Firefox\/[\d]+/.exec(ua)?.[0] || /Version\/[\d.]+ .*Safari/.exec(ua)?.[0]?.split(' ')[0] || '';
  const pwa = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches ? ' · instalada' : '';
  return `${os} · ${br}${pwa}`;
}

/**
 * Aviso por Telegram de una pantalla caída. Se reintenta: si la app se cae justo al abrir,
 * la sesión todavía puede estar cargándose y el primer intento sale «Sesión no iniciada».
 */
function notifyTeam(text: string, attempt = 0) {
  postApi('/api/telegram-notify', { text }).catch(() => {
    if (attempt < 3) setTimeout(() => notifyTeam(text, attempt + 1), [1500, 4000, 10000][attempt]);
  });
}

async function send(report: PendingReport): Promise<boolean> {
  try {
    const { error } = await supabase.from('bug_reports').insert(report.row);
    if (error) {
      if (isRetryableError(error)) return false;
      return true; // rechazado por la base (p. ej. sin sesión): no reintentar
    }
    if (report.fatal && report.text) notifyTeam(report.text);
    return true;
  } catch (e) {
    return !isRetryableError(e);
  }
}

function queue(report: PendingReport) {
  const pending = readJson<PendingReport[]>(PENDING_KEY, []);
  pending.push(report);
  writeJson(PENDING_KEY, pending.slice(-MAX_PENDING));
}

/** Envía los reportes que quedaron guardados sin internet. */
export async function flushPendingErrors() {
  const pending = readJson<PendingReport[]>(PENDING_KEY, []);
  if (!pending.length) return;
  const left: PendingReport[] = [];
  for (const r of pending) if (!(await send(r))) left.push(r);
  writeJson(PENDING_KEY, left);
}

/**
 * Guarda un error. `fatal` = la pantalla se cayó entera (se avisa también por Telegram).
 * Devuelve true si se registró (o quedó en cola), false si se descartó.
 */
export function reportError(err: unknown, opts: { fatal?: boolean; source?: string; componentStack?: string } = {}): boolean {
  try {
    const e: any = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err ?? 'desconocido'));
    const message = String(e.message || e.name || 'Error sin mensaje').slice(0, 300);
    const stack = String(e.stack || '').slice(0, 1800);
    // (No se usa isRetryableError aquí: sin internet trata TODO error como de red y se perderían
    // justo los fallos del modo sin conexión)
    if (IGNORE.test(message) || e.status === 0 || e.name === 'AbortError') return false;
    if (isForeign(stack, opts.source === 'global' ? e.filename : undefined)) return false;
    const user = currentUser();
    if (!user.id) return false; // sin sesión la base no acepta el reporte
    if (sentThisSession >= MAX_PER_SESSION) return false;

    const sig = signature(message, stack);
    const sent = readJson<Record<string, number>>(SENT_KEY, {});
    const now = Date.now();
    if (sent[sig] && now - sent[sig] < DAY_MS) return false;
    // Recordar solo los del último día
    const fresh: Record<string, number> = {};
    Object.entries(sent).forEach(([k, t]) => { if (now - t < DAY_MS) fresh[k] = t; });
    fresh[sig] = now;
    writeJson(SENT_KEY, fresh);
    sentThisSession++;

    const route = typeof location !== 'undefined' ? location.pathname : '';
    const online = typeof navigator !== 'undefined' && navigator.onLine === false ? 'sin internet' : 'con internet';
    const description = [
      `[Error automático${opts.fatal ? ' · pantalla caída' : ''}] ${message}`,
      `Pantalla: ${route || '?'} · Versión: ${appVersion()} · ${online}`,
      `Equipo: ${shortAgent()}`,
      '',
      stack,
      opts.componentStack ? `\nComponentes:${opts.componentStack.slice(0, 600)}` : '',
    ].join('\n').trim().slice(0, 3000);

    const report: PendingReport = {
      fatal: !!opts.fatal,
      row: {
        user_id: user.id,
        user_name: user.name || 'Usuario',
        user_email: user.email || null,
        user_role: user.role || 'scout',
        description,
        media_url: null,
        status: 'pendiente',
      },
      text: opts.fatal
        ? `🐞 *La app se cayó a un usuario*\n\n👤 ${user.name || 'Usuario'} (${(user.role || 'scout').toUpperCase()})\n📍 ${route}\n\n${message}`
        : undefined,
    };
    send(report).then(done => { if (!done) queue(report); });
    return true;
  } catch {
    return false; // el reportero nunca debe causar otro error
  }
}

/** Escucha los errores sin capturar de toda la app (solo web). Llamar una vez al iniciar. */
export function installErrorReporter() {
  if (installed || Platform.OS !== 'web' || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (ev: ErrorEvent) => {
    const err: any = ev.error || new Error(ev.message);
    if (ev.filename && !err.filename) err.filename = ev.filename;
    reportError(err, { source: 'global' });
  });
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    reportError(ev.reason, { source: 'promesa' });
  });
  window.addEventListener('online', () => { flushPendingErrors().catch(() => {}); });
  setTimeout(() => { flushPendingErrors().catch(() => {}); }, 8000);
}
