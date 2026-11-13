// Capturas de las pantallas principales para revisar el diseño (no es una prueba: no falla).
//
//   node tests/e2e/screenshots.mjs [carpeta] [--dark] [--wide | --width=1920] [--only=scout,scouter]
//
// Usa la misma app compilada y el mismo Supabase simulado que las pruebas E2E
// (compila si hace falta). Guarda una imagen por pantalla y rol en la carpeta
// (por defecto /tmp/scoutplan-capturas). --wide = pantalla de computadora (1280 px);
// --width=N = otra pantalla de computadora (p. ej. 1920 = 1080p, 2560 = 2K).
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './serve.mjs';
import { attachMockSupabase, fakeSession, PROFILES } from './mockSupabase.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const OUT = args.find(a => !a.startsWith('--')) || path.join(os.tmpdir(), 'scoutplan-capturas');
const dark = args.includes('--dark');
const widthArg = Number((args.find(a => a.startsWith('--width=')) || '').split('=')[1]) || 0;
const wide = args.includes('--wide') || widthArg > 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SID = PROFILES.scout.id;
// Las mismas pantallas que recorren las pruebas E2E (tests/e2e/run.mjs)
const SHOTS = {
  scout: ['inicio', 'perfil', 'plan', 'etapa/expedicionario', 'programas', 'plan-trimestral', 'drive-fotos', 'ficha-medica',
    'curriculo', 'nudos', 'cancionero', 'documentos', 'especialidades', 'certificados', 'actividades', 'calendario',
    'catalogo', 'catalogo?stageId=precursor&reqType=basica'],
  scouter: ['scouter', 'plan-trimestral-standalone', 'programas-actividades', 'drive-fotos-standalone',
    `perfil-completo?scoutId=${SID}`,
    `scouter-revision?scoutId=${SID}&stageId=expedicionario&scoutName=Joven%20Prueba`,
    `scouter-revision?scoutId=${SID}&stageId=descubridor&scoutName=Joven%20Prueba`],
  jefe_grupo: ['jefe-grupo', 'administracion'],
  comisionado_distrital: ['', 'administracion'],
};
// --only=scouter,jefe_grupo  → solo esos roles
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
if (only) for (const k of Object.keys(SHOTS)) if (!only.split(',').includes(k)) delete SHOTS[k];

function distIsForTests() {
  const jsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
  if (!fs.existsSync(jsDir)) return false;
  return fs.readdirSync(jsDir).some(f => f.startsWith('index-') && fs.readFileSync(path.join(jsDir, f), 'utf8').includes('e2eprueba.supabase.co'));
}
if (args.includes('--build') || !distIsForTests()) {
  execSync('npm run build:web', {
    cwd: ROOT, stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: 'https://e2eprueba.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'clave-de-prueba-no-real' },
  });
}

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux64', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

fs.mkdirSync(OUT, { recursive: true });
const server = await startServer(DIST);
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const viewport = widthArg ? { width: widthArg, height: Math.round(widthArg * 0.5) } : wide ? { width: 1280, height: 860 } : { width: 400, height: 860 };
for (const [role, routes] of Object.entries(SHOTS)) {
  const profile = PROFILES[role];
  const context = await browser.newContext({ viewport });
  await attachMockSupabase(context, profile);
  if (context.routeWebSocket) await context.routeWebSocket(/supabase\.co/, ws => ws.close());
  await context.addInitScript(({ session, profile, dark }) => {
    localStorage.setItem('sb-e2eprueba-auth-token', JSON.stringify(session));
    localStorage.setItem('@scout_cached_profile', JSON.stringify(profile));
    localStorage.setItem('onboarding_seen_' + profile.id, 'true');
    localStorage.setItem('app_dark_mode', dark ? 'true' : 'false');
  }, { session: fakeSession(profile), profile, dark });
  const page = await context.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  for (const r of routes) {
    await page.goto(`http://localhost:${server.port}/${r}`);
    await sleep(3500);
    const file = path.join(OUT, `${role}-${(r || 'inicio').replace(/\W+/g, '_')}${dark ? '-oscuro' : ''}${widthArg ? `-${widthArg}` : wide ? '-ancha' : ''}.png`);
    await page.screenshot({ path: file, fullPage: !wide });
  }
  await context.close();
}
await browser.close();
server.close();
console.log('Capturas en', OUT);
