// Pruebas automáticas de las pantallas (E2E) sobre la app compilada.
//
//   npm run test:e2e            → compila (expo export + sw.js) y prueba
//   node tests/e2e/run.mjs      → reutiliza dist/ si ya está compilado para pruebas (si no, compila)
//   node tests/e2e/run.mjs --only=scout   (o scouter, jefe_grupo, comisionado_distrital, editor, errores, offline)
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
  // Etapa ya aprobada: el catálogo avisa que es solo consulta (caso real 2026-11-13)
  ['catalogo?stageId=precursor&reqType=basica', /solo puedes consultar/],
];
const PLAN = {
  scout: SCOUT_ROUTES,
  scouter: [
    ['scouter', /Scouts|Panel/],
    ['plan-trimestral-standalone', /TRIMESTRE/i],
    ['programas-actividades', /Programas de Actividades/],
    ['drive-fotos-standalone', /Drive/i],
    [`perfil-completo?scoutId=${PROFILES.scout.id}`, /Joven Prueba/],
    // La ficha se abre en modo consulta; una etapa a la que el joven no llega no se puede aprobar
    [`scouter-revision?scoutId=${PROFILES.scout.id}&stageId=expedicionario&scoutName=Joven%20Prueba`, /Editar requisitos/],
    [`scouter-revision?scoutId=${PROFILES.scout.id}&stageId=descubridor&scoutName=Joven%20Prueba`, /Etapa bloqueada/],
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

// La app de prueba se compila SIEMPRE con esta URL y clave de mentira (aquí y en GitHub):
// así las pruebas nunca dependen del .env ni pueden tocar la base real.
const E2E_SUPABASE_URL = 'https://e2eprueba.supabase.co';
const E2E_SUPABASE_KEY = 'clave-de-prueba-no-real';

function supabaseStorageKey() {
  return 'sb-e2eprueba-auth-token';
}

/** ¿El dist/ actual se compiló para las pruebas (con la URL de mentira)? */
function distIsForTests() {
  const jsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
  if (!fs.existsSync(path.join(DIST, 'index.html')) || !fs.existsSync(jsDir)) return false;
  return fs.readdirSync(jsDir).some(f => f.startsWith('index-') && fs.readFileSync(path.join(jsDir, f), 'utf8').includes('e2eprueba.supabase.co'));
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

    // Descripción de la dinámica: la caja crece con el texto y se encoge al ensanchar la ventana
    const desc = page.locator('textarea[placeholder^="Explica las reglas"]').first();
    await desc.fill('Armarán una matriz evaluando la urgencia por caducidad y la necesidad nutricional, luego trazarán la ruta más rápida considerando distancias y tráfico para proteger la cadena de frío, y cerrarán con una matriz de riesgos para actuar ante cualquier imprevisto en el camino.');
    await sleep(300);
    const size = () => desc.evaluate(el => ({ h: el.clientHeight, sh: el.scrollHeight }));
    const narrow = await size();
    await page.setViewportSize({ width: 1280, height: 860 }); await sleep(400);
    const wide = await size();
    await page.setViewportSize({ width: 400, height: 860 }); await sleep(400);
    if (narrow.sh <= narrow.h + 1 && wide.sh <= wide.h + 1 && wide.h < narrow.h) ok(`descripción: la caja se ajusta al texto (${narrow.h} px en teléfono, ${wide.h} px en computadora)`);
    else { bad(`descripción: la caja no se ajusta al texto (${JSON.stringify({ narrow, wide })})`); await shot(page, 'editor-descripcion'); }

    // Cronograma: arrastrar la última actividad (#n) hasta el primer lugar
    await page.getByText('Agregar Actividad').click(); await sleep(200);
    const titleInputs = page.locator('input[placeholder^="Ej: Rompehielo"]');
    const n = await titleInputs.count();
    await titleInputs.nth(n - 1).fill('ULTIMA');
    const grip = page.getByText(`#${n}`, { exact: true }).first();
    await grip.scrollIntoViewIfNeeded();
    const gb = await grip.boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) { await page.mouse.move(gb.x + gb.width / 2, Math.max(5, gb.y - i * 30)); await sleep(25); }
    await sleep(2500);   // cerca del borde la lista se desplaza sola
    await page.mouse.up(); await sleep(400);
    const order = await titleInputs.evaluateAll(els => els.map(e => e.value));
    if (order[0] === 'ULTIMA') ok(`cronograma: arrastrar #${n} lo lleva al primer lugar`);
    else { bad(`cronograma: el arrastre no movió la actividad (${order.join(' / ')})`); await shot(page, 'editor-arrastre'); }
    if (errors.length) bad(`editor: error de JavaScript: ${errors[0]}`);
  } catch (e) {
    bad(`editor: ${e.message.split('\n')[0]}`);
    await shot(page, 'editor-error');
  } finally {
    await context.close();
  }
}

/** Errores de la app: se registran solos (una vez) y la Jefatura los ve en su panel. */
async function checkErrorReporting(browser, base) {
  console.log('\n▶ Errores de la app: registro automático y panel de Jefatura');
  // 1. Un joven sufre un error: se guarda en bug_reports una sola vez
  let { context, log } = await newContext(browser, PROFILES.scout);
  let page = await context.newPage();
  try {
    await page.goto(`${base}/inicio`);
    await settle(page, /¡Hola, Joven/);
    await page.evaluate(() => {
      setTimeout(() => { throw new Error('Prueba E2E: algo falló'); }, 0);
      setTimeout(() => { throw new Error('Prueba E2E: algo falló'); }, 50);   // repetido: no se manda dos veces
      Promise.reject(new Error('Prueba E2E: promesa rechazada'));
      setTimeout(() => { throw new TypeError('Failed to fetch'); }, 80);     // de red: se ignora
    });
    await sleep(2500);
    const reports = log.inserts.filter(i => i.table === 'bug_reports').flatMap(i => [].concat(i.body));
    const texts = reports.map(r => r.description || '');
    const same = texts.filter(t => t.includes('Prueba E2E: algo falló')).length;
    same === 1 ? ok('un error de la app se registra (y repetido, una sola vez)') : bad(`el error se registró ${same} veces (esperaba 1)`);
    texts.some(t => t.includes('promesa rechazada')) ? ok('también las promesas rechazadas') : bad('no se registró la promesa rechazada');
    !texts.some(t => t.includes('Failed to fetch')) ? ok('los fallos de red no se registran (son normales sin internet)') : bad('se registró un fallo de red');
    const r = reports[0] || {};
    r.user_id === PROFILES.scout.id && /Pantalla: \/inicio/.test(r.description || '') && r.description.startsWith('[Error automático')
      ? ok('el reporte lleva quién, en qué pantalla y el detalle') : bad('al reporte le faltan datos: ' + JSON.stringify(r).slice(0, 200));
  } finally {
    await context.close();
  }

  // 2. La Jefatura abre «🐞 Errores de la app»
  ({ context, log } = await newContext(browser, PROFILES.jefe_grupo));
  page = await context.newPage();
  try {
    await page.goto(`${base}/jefe-grupo`);
    await settle(page, /Panel Jefe de Grupo/);
    await page.getByText('Errores de la app', { exact: true }).first().click();
    const st = await settle(page, /Cannot read properties of undefined/, 6000);
    const manual = await page.getByText('No me deja subir el certificado').count();
    if (st.found && manual) ok('la Jefatura ve los errores automáticos y los reportes manuales');
    else { bad('el panel de errores no muestra los reportes'); await shot(page, 'errores-panel'); }
  } finally {
    await context.close();
  }
}

// ---------- Principal ----------
if (args.includes('--build') || !distIsForTests()) {
  console.log('Compilando la app para las pruebas (npm run build:web con Supabase de mentira)…');
  execSync('npm run build:web', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY: E2E_SUPABASE_KEY },
  });
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
  if (!only || only === 'errores') await checkErrorReporting(browser, base);
  if (!only || only === 'offline') await checkOffline(browser, base);
} finally {
  await browser.close();
  server.close();
}
const passed = results.filter(r => r[0] === 'ok').length;
console.log(`\n${fails ? '✘' : '✔'} ${passed} correctas, ${fails} con fallas (${Math.round((Date.now() - t0) / 1000)} s)`);
process.exit(fails ? 1 : 0);
