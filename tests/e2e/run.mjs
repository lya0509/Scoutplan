// Pruebas automáticas de las pantallas (E2E) sobre la app compilada.
//
//   npm run test:e2e            → compila (expo export + sw.js) y prueba
//   node tests/e2e/run.mjs      → prueba el dist/ que ya existe
//   node tests/e2e/run.mjs --only=scout   (o scouter, jefe_grupo, comisionado_distrital, editor, offline)
//
// No toca la base de datos real: Supabase está simulado (tests/e2e/mockSupabase.mjs).
// Por cada rol abre sus pantallas y revisa:
//   1. que no haya errores de JavaScript sin capturar,
//   2. que aparezca el contenido esperado y nada se quede cargando,
//   3. en modo oscuro, que ningún texto tenga contraste menor a 3:1.
// Además prueba abrir la app SIN internet con la sesión vencida (falla del 2026-11-09).
//
// Navegador: Chromium de Playwright (~/.cache/ms-playwright). Si no está:
//   npx playwright-core install chromium      (o define CHROMIUM_PATH)
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './serve.mjs';
import { attachMockSupabase, fakeSession, PROFILES } from './mockSupabase.mjs';
import { contrastAudit } from './contrast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- Rutas por rol y texto que debe aparecer ----------
const SCOUT_ROUTES = [
  ['inicio', /¡Hola, Joven/],
  ['perfil', /Foto Scout/],
  ['plan', /Mi Plan Progresivo/],
  ['etapa/expedicionario', /Expedicionario/],
  ['programas', /Programas de Actividades/],
  ['plan-trimestral', /TRIMESTRE DE CLAN/i],
  ['drive-fotos', /Drive/i],
  ['ficha-medica', /Ficha Médica/],
  ['curriculo', /Currículum/],
  ['nudos', /Nudos y Amarres/],
  ['cancionero', /Cancionero|Canciones/],
  ['documentos', /Documentos/],
  ['especialidades', /Especialidades/],
  ['certificados', /Acreditaciones|Certificados/],
  ['actividades', /Biblioteca Scout|Actividades/],
  ['calendario', /Calendario de Actividades/],
  ['catalogo', /Seleccionadas/],
];
const PLAN = {
  scout: SCOUT_ROUTES,
  scouter: [
    ['scouter', /Scouts|Panel/],
    ['plan-trimestral-standalone', /TRIMESTRE/i],
    ['programas-actividades', /Programas de Actividades/],
    ['drive-fotos-standalone', /Drive/i],
    [`perfil-completo?scoutId=${PROFILES.scout.id}`, /Joven Prueba/],
  ],
  jefe_grupo: [
    ['jefe-grupo', /Panel Jefe de Grupo/],
    ['administracion', /Roles|Miembros|Administración/i],
  ],
  comisionado_distrital: [
    ['', /Grupos|Comisionad/i],
    ['administracion', /Roles|Miembros|Administración/i],
  ],
};

// ---------- Utilidades ----------
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(base)) {
    const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
    for (const d of dirs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        const p = path.join(base, d, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return undefined; // que Playwright use el suyo
}

function supabaseStorageKey() {
  const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
  const url = (env.match(/EXPO_PUBLIC_SUPABASE_URL=(\S+)/) || [])[1] || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const ref = (url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/) || [])[1];
  if (!ref) throw new Error('No se encontró EXPO_PUBLIC_SUPABASE_URL (.env) para armar la sesión de prueba.');
  return `sb-${ref}-auth-token`;
}

let fails = 0;
// Capturas de las pantallas que fallan, para ver qué pasó
const SHOTS = path.join(os.tmpdir(), 'scoutplan-e2e-fallas');
fs.rmSync(SHOTS, { recursive: true, force: true });
async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, name.replace(/[^\w-]+/g, '_') + '.png');
  await page.screenshot({ path: file }).catch(() => {});
  console.log('    captura:', file);
}
const results = [];
const ok = (m) => { console.log('  ✔', m); results.push(['ok', m]); };
const bad = (m) => { console.log('  ✘', m); results.push(['fail', m]); fails++; };

async function newContext(browser, profile, { dark = false, expired = false, userDataDir } = {}) {
  const STORAGE_KEY = supabaseStorageKey();
  const opts = { viewport: { width: 400, height: 860 }, serviceWorkers: 'allow' };
  const context = userDataDir
    ? await chromium.launchPersistentContext(userDataDir, { executablePath: findChromium(), headless: true, ...opts })
    : await browser.newContext(opts);
  const log = await attachMockSupabase(context, profile);
  if (context.routeWebSocket) await context.routeWebSocket(/supabase\.co/, ws => ws.close());
  const session = fakeSession(profile, { expired });
  await context.addInitScript(({ STORAGE_KEY, session, profile, dark }) => {
    // Solo la primera vez en este origen: así una prueba puede cambiar luego la sesión
    if (localStorage.getItem('__e2e_seeded')) return;
    localStorage.setItem('__e2e_seeded', '1');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('@scout_cached_profile', JSON.stringify(profile));
    localStorage.setItem('@scout_cached_session', JSON.stringify(session));
    localStorage.setItem('onboarding_seen_' + profile.id, 'true');
    localStorage.setItem('app_dark_mode', dark ? 'true' : 'false');
  }, { STORAGE_KEY, session, profile, dark });
  return { context, log };
}

/** Espera a que aparezca `expect` y no haya ruedas de carga visibles (máx. `timeout`). */
async function settle(page, expect, timeout = 12000) {
  const t0 = Date.now();
  let state = { found: false, spinners: 0 };
  while (Date.now() - t0 < timeout) {
    state = await page.evaluate((src) => {
      const re = new RegExp(src.source, src.flags);
      const visible = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.right > 0 && b.left < innerWidth; };
      const spinners = [...document.querySelectorAll('[role="progressbar"]')].filter(visible).length;
      // Solo el texto visible (hay pantallas montadas dos veces y el menú lateral fuera de pantalla)
      // (React parte «¡Hola, {nombre}!» en varios nodos del mismo elemento: se unen sin espacio)
      let text = '';
      let prev = null;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement;
        if (!el || !visible(el)) continue;
        text += (el === prev ? '' : ' ') + walker.currentNode.textContent;
        prev = el;
      }
      return { found: re.test(text.replace(/\s+/g, ' ')), spinners };
    }, { source: expect.source, flags: expect.flags });
    if (state.found && state.spinners === 0) return { ...state, ms: Date.now() - t0 };
    await sleep(300);
  }
  return { ...state, ms: Date.now() - t0 };
}

async function checkRoutes(browser, role, base) {
  const profile = PROFILES[role];
  for (const dark of [false, true]) {
    console.log(`\n▶ ${role} — modo ${dark ? 'oscuro' : 'claro'}`);
    const { context, log } = await newContext(browser, profile, { dark });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
    page.on('dialog', d => d.dismiss().catch(() => {}));
    for (const [route, expect] of PLAN[role]) {
      errors.length = 0;
      await page.goto(`${base}/${route}`);
      const st = await settle(page, expect);
      const label = `/${route}`;
      if (!st.found) bad(`${label}: no apareció ${expect}`);
      else if (st.spinners) bad(`${label}: se queda cargando (${st.spinners} rueda(s) tras ${st.ms} ms)`);
      else if (errors.length) bad(`${label}: error de JavaScript: ${errors[0]}`);
      else if (dark) {
        const low = (await page.evaluate(contrastAudit)).filter(i => i.ratio < 3);
        if (low.length) bad(`${label}: ${low.length} texto(s) ilegibles en modo oscuro, p. ej. «${low[0].text}» (contraste ${low[0].ratio.toFixed(2)})`);
        else ok(`${label} (${st.ms} ms, contraste OK)`);
      } else ok(`${label} (${st.ms} ms)`);
      if (results[results.length - 1][0] === 'fail') await shot(page, `${role}-${dark ? 'oscuro' : 'claro'}-${route}`);
    }
    if (log.unknownTables.size) console.log('    (tablas sin datos de prueba:', [...log.unknownTables].join(', ') + ')');
    await context.close();
  }
}

async function checkOffline(browser, base) {
  console.log('\n▶ Sin internet: abrir la app con la sesión vencida');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoutplan-e2e-'));
  try {
    // 1. Primera visita con internet: se instala la app (service worker) y se guardan datos
    let { context } = await newContext(null, PROFILES.scout, { userDataDir: dir });
    let page = context.pages()[0] || await context.newPage();
    await page.goto(`${base}/inicio`);
    let st = await settle(page, /¡Hola, Joven/);
    if (!st.found) { bad('primera visita con internet: no cargó el Inicio'); await shot(page, 'offline-primera-visita'); await context.close(); return; }
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 30000 })
      .catch(() => {});
    await sleep(6000); // precarga offline (warmup) a los 4 s de entrar
    // Vencer la sesión guardada (como si hubieran pasado horas)
    const key = supabaseStorageKey();
    await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 7200; localStorage.setItem(k, JSON.stringify(s)); }, key);
    await context.close();

    // 2. Abrir de nuevo, ahora sin internet
    ({ context } = await newContext(null, PROFILES.scout, { userDataDir: dir }));
    await context.setOffline(true);
    page = context.pages()[0] || await context.newPage();
    await page.goto(`${base}/inicio`).catch(() => {});
    st = await settle(page, /¡Hola, Joven/, 8000);
    if (st.found && !st.spinners) ok(`Inicio sin internet en ${st.ms} ms`);
    else bad(`Inicio sin internet: ${st.found ? 'se queda cargando' : 'no aparece'} tras ${st.ms} ms`);

    // 3. Pantalla nunca abierta con internet: debe tener datos (precarga)
    await page.goto(`${base}/plan-trimestral`).catch(() => {});
    st = await settle(page, /Excursión de prueba|Scouter Prueba/, 8000);
    if (st.found) ok('Plan Trimestral sin internet muestra los datos guardados por la precarga');
    else bad('Plan Trimestral sin internet: faltan los datos de la precarga');

    // 4. Al volver internet la sesión se renueva sola (sin sacar a la persona)
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await sleep(3000);
    const exp = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').expires_at || 0, key);
    if (exp * 1000 > Date.now()) ok('al volver internet la sesión se renovó');
    else bad('al volver internet la sesión sigue vencida');
    await context.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Editor de Programas: calendario de fecha e indicadores (modales separados del archivo). */
async function checkProgramaEditor(browser, base) {
  console.log('\n▶ Editor de Programas (Scouter): fecha e indicadores');
  const { context } = await newContext(browser, PROFILES.scouter);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  try {
    await page.goto(`${base}/programa-editor`);
    const st = await settle(page, /Buscar en Catálogo Oficial ASV/);
    if (!st.found) { bad('el editor no abrió'); await shot(page, 'editor-abrir'); return; }

    // Fecha: abrir el calendario y elegir «Próx. Sábado»
    await page.getByText(/^(\d{4}-\d{2}-\d{2}|Seleccionar fecha\.\.\.)$/).first().click();
    await page.getByText('Seleccionar Fecha', { exact: true }).waitFor({ timeout: 5000 });
    await page.getByText('⚜️ Próx. Sábado').click();
    const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    const sat = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await page.getByText(sat, { exact: true }).first().waitFor({ timeout: 5000 })
      .then(() => ok(`calendario: «Próx. Sábado» puso ${sat}`), async () => { bad('calendario: la fecha no cambió'); await shot(page, 'editor-fecha'); });

    // Indicadores: abrir el catálogo, marcar el primero y cerrar
    await page.getByText('Buscar en Catálogo Oficial ASV').first().click();
    const firstStage = page.getByText(/^Etapa /).first();
    await firstStage.waitFor({ timeout: 5000 });
    const indicatorText = await firstStage.evaluate(el => el.nextElementSibling?.textContent || el.parentElement?.lastElementChild?.textContent || '');
    await firstStage.click();
    await page.getByText('Listo', { exact: true }).click();
    await sleep(500);
    const shown = indicatorText && await page.getByText(indicatorText.trim()).count();  // en la lista va con «• » delante
    if (shown) ok(`indicadores: se agregó «${indicatorText.slice(0, 40)}…»`);
    else { bad('indicadores: el indicador elegido no aparece en la lista'); await shot(page, 'editor-indicador'); }
    if (errors.length) bad(`editor: error de JavaScript: ${errors[0]}`);
  } catch (e) {
    bad(`editor: ${e.message.split('\n')[0]}`);
    await shot(page, 'editor-error');
  } finally {
    await context.close();
  }
}

// ---------- Principal ----------
if (args.includes('--build') || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('Compilando la app (npm run build:web)…');
  execSync('npm run build:web', { cwd: ROOT, stdio: 'inherit' });
}

const server = await startServer(DIST);
const base = `http://localhost:${server.port}`;
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const t0 = Date.now();
try {
  for (const role of Object.keys(PLAN)) {
    if (!only || only === role) await checkRoutes(browser, role, base);
  }
  if (!only || only === 'editor') await checkProgramaEditor(browser, base);
  if (!only || only === 'offline') await checkOffline(browser, base);
} finally {
  await browser.close();
  server.close();
}
const passed = results.filter(r => r[0] === 'ok').length;
console.log(`\n${fails ? '✘' : '✔'} ${passed} correctas, ${fails} con fallas (${Math.round((Date.now() - t0) / 1000)} s)`);
process.exit(fails ? 1 : 0);
