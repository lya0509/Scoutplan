// Pruebas de FLUJOS completos (no solo que la pantalla cargue): crear, guardar, marcar y comprobar
// que lo guardado aparece. Corre en teléfono (400 px) y en computadora (1920 px), con el mismo
// Supabase simulado que las pruebas E2E pero conservando lo que se escribe (persist).
//
//   node tests/e2e/flujos.mjs            (compila si hace falta)
//   node tests/e2e/flujos.mjs --solo=cip (solo los flujos cuyo nombre contiene «cip»)
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
const solo = (args.find(a => a.startsWith('--solo=')) || '').split('=')[1];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

// ───────────── utilidades ─────────────
class Falla extends Error {}
const must = (cond, msg) => { if (!cond) throw new Falla(msg); };

/** Elemento visible con ese texto (las pantallas del Drawer pueden estar montadas dos veces). */
function vis(page, text, opts = {}) {
  const loc = typeof text === 'string' ? page.getByText(text, { exact: opts.exact ?? false }) : page.getByText(text);
  return loc.filter({ visible: true }).first();
}
async function click(page, text, opts) {
  const el = vis(page, text, opts);
  await el.waitFor({ state: 'visible', timeout: 8000 }).catch(() => { throw new Falla(`No aparece «${text}»`); });
  await el.click();
  await sleep(opts?.wait ?? 500);
}
async function see(page, text, msg, timeout = 8000) {
  const ok = await vis(page, text).waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  must(ok, msg || `No aparece «${text}»`);
}
async function notSee(page, text, msg) {
  await sleep(300);
  must(!(await vis(page, text).isVisible().catch(() => false)), msg || `No debería aparecer «${text}»`);
}
async function fill(page, placeholder, value) {
  const el = page.getByPlaceholder(placeholder).filter({ visible: true }).first();
  await el.waitFor({ state: 'visible', timeout: 8000 }).catch(() => { throw new Falla(`No aparece el campo «${placeholder}»`); });
  await el.click();
  await el.fill('');
  await el.pressSequentially(value, { delay: 15 });
  return el;
}
async function go(page, route) {
  await page.goto(`http://localhost:${PORT}/${route}`);
  await sleep(2500);
}
/** Simula que se abre el teclado del teléfono (la ventana se encoge) y luego se cierra. */
async function keyboard(page, open) {
  const vp = page.viewportSize();
  if (vp.width > 600) return;
  await page.setViewportSize({ width: vp.width, height: open ? 480 : 860 });
  await sleep(700);
}

// ───────────── flujos ─────────────
const FLOWS = [
  {
    name: 'scouter · cip: crear un CIP nuevo (escribiendo con el teclado abierto) y marcar asistencia',
    role: 'scouter',
    async run(page, db) {
      await go(page, 'scouter');
      await click(page, 'Gestionar CIP', { wait: 1500 });
      await click(page, 'Nuevo CIP', { exact: true });
      const nombre = await fill(page, 'Día Mundial de las Playas 2026', 'CIP');
      await keyboard(page, true);
      await nombre.pressSequentially(' Flujo Prueba', { delay: 15 });
      await sleep(800);
      const v = await page.getByPlaceholder('Día Mundial de las Playas 2026').filter({ visible: true }).first().inputValue().catch(() => null);
      must(v === 'CIP Flujo Prueba', `El formulario se cerró o se vació mientras se escribía (quedó: ${JSON.stringify(v)})`);
      await keyboard(page, false);
      await fill(page, 'Playa Los Caracas', 'Parque del Este');
      await click(page, 'Crear CIP', { wait: 1500 });
      must(db.cip_oficiales.some(c => c.nombre === 'CIP Flujo Prueba'), 'El CIP no se guardó en la base de datos');
      await see(page, 'CIP Flujo Prueba', 'El CIP creado no aparece en la lista');
      await click(page, 'CIP Flujo Prueba', { wait: 1500 });
      await see(page, 'Marca quiénes asistieron', 'No abre la lista de asistencia');
      await click(page, 'Contará para Expedicionario', { wait: 1500 });
      await see(page, 'Asistencia marcada', 'No queda marcada la asistencia');
    },
  },

  {
    name: 'inicio de sesión: entrar con correo y contraseña',
    role: 'scout',
    noSession: true,
    async run(page) {
      await go(page, '');
      await fill(page, 'correo', 'scout@prueba.e2e').catch(async () => fill(page, 'Correo', 'scout@prueba.e2e'));
      const pass = page.locator('input[type="password"]').filter({ visible: true }).first();
      await pass.fill('clave-de-prueba');
      await click(page, 'Ingresar', { exact: true, wait: 3500 });
      await see(page, /¡Hola, Joven/, 'Después de entrar no llega al inicio del joven');
    },
  },
  {
    name: 'joven · catálogo: elegir una actividad básica y guardarla',
    role: 'scout',
    async run(page, db) {
      await go(page, 'etapa/expedicionario');
      await click(page, 'Actividades Básicas (12 cualquier área)', { wait: 2000 });
      await click(page, 'Participar en ceremonias de su religión');
      await click(page, /GUARDAR SELECCIÓN/i, { wait: 2000 });
      must(db.requirement_progress.some(r => String(r.requirement_id).startsWith('act_') && r.completed && r.stage_id === 'expedicionario'), 'La actividad no se guardó');
    },
  },
  {
    name: 'joven · vida de grupo: registrar un campamento',
    role: 'scout',
    async run(page, db) {
      await go(page, 'etapa/expedicionario');
      await click(page, 'Vida de Grupo (1 Campamento)', { wait: 1500 });
      await click(page, '+ Registrar Campamento');
      await fill(page, 'Ej: Campamento de Unidad Rover / Campamento Anual de Grupo', 'Campamento Flujo');
      await fill(page, 'Ej: Hacienda La Calceta / Campo Escuela Scout', 'Sede');
      await fill(page, 'AAAA-MM-DD (Ej: 2025-05-18)', '2026-10-10');
      await click(page, 'Guardar Registro', { wait: 2000 });
      must(db.certificates.some(c => String(c.category).startsWith('vida_grupo_expedicionario_exp_vg_campamento')), 'El campamento no se guardó');
    },
  },
  {
    name: 'joven · noches al aire libre: registrar noches',
    role: 'scout',
    async run(page, db) {
      await go(page, 'etapa/expedicionario');
      await page.mouse.wheel(0, 2000); await sleep(500);
      await click(page, 'Noches de Vida al Aire Libre (7 noches)', { wait: 1500 });
      await click(page, /Registrar Campamento \/ Noches/);
      await fill(page, '2024-10-15', '2026-10-10');
      await fill(page, 'Ej: Campamento Anual El Jarillo / Parque Guatopo', 'Parque Flujo');
      await click(page, /GUARDAR REGISTRO/, { wait: 2000 });
      must(db.certificates.some(c => String(c.category).startsWith('aire_libre_expedicionario')), 'Las noches no se guardaron');
    },
  },
  {
    name: 'joven · especialidad: no hay «Marcar Directo», solo subir certificado',
    role: 'scout',
    async run(page) {
      await go(page, 'etapa/expedicionario');
      await click(page, 'Especialidades (1 Bronce)', { wait: 1500 });
      await see(page, 'Subir Nueva', 'No aparece «Subir Nueva»');
      await notSee(page, 'Marcar Directo', 'Sigue apareciendo «Marcar Directo»');
    },
  },
  {
    name: 'joven · certificados: sin foto no deja guardar; con foto sí',
    role: 'scout',
    async run(page, db, { dialogs }) {
      await go(page, 'certificados');
      await click(page, 'Agregar Acreditación', { wait: 1000 });
      await fill(page, 'Ej: Especialidad de Campismo / Primeros Auxilios', 'Campismo Flujo');
      await click(page, 'Guardar Acreditación', { wait: 1000 });
      must(dialogs.some(d => /Falta el certificado/.test(d)), 'Dejó guardar una especialidad sin foto');
      must(!db.certificates.some(c => c.title === 'Campismo Flujo'), 'Se guardó sin foto');
      const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
      await click(page, /Seleccionar Foto\/Diploma/);
      await (await chooser).setFiles({ name: 'diploma.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
      await sleep(1500);
      await click(page, 'Guardar Acreditación', { wait: 2500 });
      must(db.certificates.some(c => c.title === 'Campismo Flujo'), 'Con foto tampoco se guardó');
    },
  },
  {
    name: 'joven · ficha médica: cambiar un dato y guardar',
    role: 'scout',
    async run(page, db) {
      await go(page, 'ficha-medica');
      await fill(page, 'Padre / Madre / Representante Legal', 'Madre Flujo');
      await click(page, 'Guardar Ficha Médica', { wait: 2500 });
      const p = db.profiles.find(x => x.id === PROFILES.scout.id);
      must(JSON.stringify(p.medical_data || {}).includes('Madre Flujo'), 'La ficha médica no se guardó');
    },
  },
  {
    name: 'joven · currículum: cambiar un dato y guardar',
    role: 'scout',
    async run(page, db) {
      await go(page, 'curriculo');
      await fill(page, 'Ej: Caracas, Miranda', 'Caracas Flujo');
      await click(page, 'Guardar Datos del Currículum', { wait: 2500 });
      const p = db.profiles.find(x => x.id === PROFILES.scout.id);
      must(JSON.stringify(p.curriculum_data || {}).includes('Caracas Flujo'), 'El currículum no se guardó');
    },
  },
  {
    name: 'joven · navegar por todo el menú lateral',
    role: 'scout',
    async run(page) {
      await go(page, 'inicio');
      const items = ['Plan Progresivo', 'Programas de Actividades', 'Plan Trimestral', 'Drive de Fotos', 'Ficha Médica', 'Mis Certificados', 'Calendario'];
      for (const it of items) {
        const vp = page.viewportSize();
        await page.getByLabel(/menu|menú|Show navigation menu/i).filter({ visible: true }).first().click().catch(() => {});
        await sleep(600);
        await click(page, it, { exact: true, wait: 1500 });
        if (vp.width < 600) await notSee(page, 'Cerrar Sesión', `El menú no se cerró al entrar a «${it}»`).catch(() => {});
      }
    },
  },
  {
    name: 'scouter · revisión: editar requisitos y convalidar uno sin registro',
    role: 'scouter',
    async run(page, db, { dialogs }) {
      await go(page, `scouter-revision?scoutId=${PROFILES.scout.id}&stageId=expedicionario&scoutName=Joven%20Prueba`);
      await click(page, /^✏️ Editar requisitos$/, { wait: 800 });
      await click(page, 'Especialidades (1 Plata)', { wait: 1500 });
      must(dialogs.some(d => /Convalidar sin registro/i.test(d)), 'No pidió confirmar la convalidación sin registro');
      must(db.requirement_progress.some(r => r.requirement_id === 'exp_esp_plata' && r.completed), 'No quedó marcado el requisito');
    },
  },
  {
    name: 'scouter · membresía: asignar fecha a un joven',
    role: 'scouter',
    async run(page, db) {
      await go(page, 'scouter');
      await click(page, /Asignar|Editar/, { wait: 800 });
      await click(page, 'Confirmar Fecha', { wait: 2000 });
      const p = db.profiles.find(x => x.id === PROFILES.scout.id);
      must(p.membership_status === 'pending_approval' || p.membership_expires_at, 'No se guardó la fecha de membresía');
    },
  },
  {
    name: 'scouter · programas: crear un programa nuevo',
    role: 'scouter',
    async run(page, db) {
      await go(page, 'programas-actividades');
      await click(page, 'Nuevo Programa', { wait: 1200 });
      await click(page, 'No, actividad Extraordinaria / Otros', { wait: 2500 });
      await fill(page, 'Ej: Hermandad Scout / Presentación de Proyectos', 'Programa Flujo');
      await fill(page, 'Ej: Caracas / Terreno 25', 'Sede Flujo');
      await click(page, 'Guardar', { exact: true, wait: 1500 });
      await click(page, 'Guardar Boceto', { exact: true, wait: 2500 });
      must(db.scout_programas.some(p => p.title === 'Programa Flujo'), 'El programa no se guardó');
    },
  },
  {
    name: 'jefe · crear actividad / asamblea en el calendario',
    role: 'jefe_grupo',
    async run(page, db) {
      await go(page, 'jefe-grupo');
      await click(page, '+ Nueva Actividad / Asamblea', { wait: 800 });
      await fill(page, 'Ej: Asamblea General de Dirigentes / Campamento Grupal', 'Asamblea Flujo');
      await click(page, 'Publicar en Calendario', { wait: 2000 });
      must(db.calendar_events.some(e => e.title === 'Asamblea Flujo'), 'La actividad no se guardó');
    },
  },
  {
    name: 'jefe · gestionar CIP desde el panel de jefatura',
    role: 'jefe_grupo',
    async run(page, db) {
      await go(page, 'jefe-grupo');
      await click(page, 'CIP', { exact: true, wait: 1500 });
      await click(page, 'Nuevo CIP', { exact: true });
      const nombre = await fill(page, 'Día Mundial de las Playas 2026', 'CIP');
      await keyboard(page, true);
      await nombre.pressSequentially(' Jefatura', { delay: 15 });
      await keyboard(page, false);
      await click(page, 'Crear CIP', { wait: 1500 });
      must(db.cip_oficiales.some(c => c.nombre === 'CIP Jefatura'), 'El CIP no se guardó (o el formulario se vació)');
    },
  },
  {
    name: 'jefe · administración: abrir la ficha de una persona',
    role: 'jefe_grupo',
    async run(page) {
      await go(page, 'administracion');
      await click(page, 'Lobato Prueba', { wait: 1000 });
      await see(page, /Rol|Unidad/, 'No abre la ficha de la persona');
    },
  },
  {
    name: 'comisionado · filtrar por grupo y abrir el censo territorial',
    role: 'comisionado_distrital',
    async run(page) {
      await go(page, '');
      await click(page, 'Grupo Prueba E2E', { exact: true, wait: 800 });
      await click(page, 'Censo Territorial', { wait: 1500 });
      await see(page, /Excel|PDF/, 'No abre el censo');
    },
  },

  {
    name: 'joven · enviar la etapa completa a revisión',
    role: 'scout',
    async run(page, db, { dialogs }) {
      const ids = ['exp_basicas', 'exp_opcionales', 'exp_esp_bronce', 'exp_esp_plata', 'exp_vg_campamento', 'exp_vg_peregrinaje', 'exp_vg_proyecto',
        'exp_cip_distrital', 'exp_cip_regional', 'exp_cip_nacional', 'exp_cursos', 'exp_noches'];
      for (const id of ids) db.requirement_progress.push({ id: 'rp_' + id, scout_id: PROFILES.scout.id, stage_id: 'expedicionario', requirement_id: id, completed: true, updated_at: new Date().toISOString() });
      await go(page, 'etapa/expedicionario');
      await click(page, 'ENVIAR ETAPA A REVISIÓN', { exact: true, wait: 800 });
      await click(page, 'Enviar', { exact: true, wait: 2500 });
      must(db.stage_progress.find(r => r.stage_id === 'expedicionario').status === 'En Revision', `La etapa no quedó en revisión (avisos: ${dialogs.slice(-2).join(' | ')})`);
    },
  },
  {
    name: 'scouter · devolver una ficha incompleta',
    role: 'scouter',
    async run(page, db) {
      db.stage_progress.find(r => r.stage_id === 'expedicionario').status = 'En Revision';
      await go(page, `scouter-revision?scoutId=${PROFILES.scout.id}&stageId=expedicionario&scoutName=Joven%20Prueba`);
      await click(page, 'APROBAR Y FINALIZAR', { exact: true, wait: 800 });
      await click(page, '¿SEGURO? HAZ CLIC PARA DEVOLVER FICHA', { exact: true, wait: 2500 });
      must(db.stage_progress.find(r => r.stage_id === 'expedicionario').status !== 'En Revision', 'La ficha no se devolvió');
    },
  },
  {
    name: 'scouter · aprobar una etapa completa enviada a revisión',
    role: 'scouter',
    async run(page, db) {
      db.stage_progress.find(r => r.stage_id === 'expedicionario').status = 'En Revision';
      const ids = ['exp_basicas', 'exp_opcionales', 'exp_esp_bronce', 'exp_esp_plata', 'exp_vg_campamento', 'exp_vg_peregrinaje', 'exp_vg_proyecto',
        'exp_cip_distrital', 'exp_cip_regional', 'exp_cip_nacional', 'exp_cursos', 'exp_noches'];
      for (const id of ids) db.requirement_progress.push({ id: 'rp_' + id, scout_id: PROFILES.scout.id, stage_id: 'expedicionario', requirement_id: id, completed: true, updated_at: new Date().toISOString() });
      await go(page, `scouter-revision?scoutId=${PROFILES.scout.id}&stageId=expedicionario&scoutName=Joven%20Prueba`);
      await click(page, 'APROBAR Y FINALIZAR', { exact: true, wait: 800 });
      await click(page, '¿SEGURO? HAZ CLIC PARA APROBAR', { exact: true, wait: 2500 });
      must(db.stage_progress.find(r => r.stage_id === 'expedicionario').status === 'Aprobada', 'La etapa no quedó aprobada');
    },
  },
  {
    name: 'scouter · plan trimestral: editar y guardar',
    role: 'scouter',
    async run(page, db) {
      await go(page, 'plan-trimestral-standalone');
      await click(page, /Deseas modificar las actividades/, { wait: 1000 });
      await fill(page, 'Nombre del Joven / Rover / Dirigente', 'Scouter Flujo');
      await click(page, 'Guardar Plan Trimestral Oficial', { wait: 3000 });
      must(JSON.stringify(db.quarterly_plans).includes('Scouter Flujo'), 'El plan trimestral no se guardó');
    },
  },
  {
    name: 'jefe · aprobar una cuenta nueva',
    role: 'jefe_grupo',
    async run(page, db) {
      db.profiles.push({ ...PROFILES.lobato, id: '00000000-0000-4000-8000-0000000e2e99', name: 'Nuevo Pendiente', email: 'nuevo@prueba.e2e', account_status: 'pending', created_at: new Date().toISOString() });
      await go(page, 'jefe-grupo');
      await see(page, 'Nuevo Pendiente', 'La cuenta nueva no aparece para aprobar');
      await page.getByLabel('Aprobar cuenta de Nuevo Pendiente').filter({ visible: true }).first().click();
      await sleep(2500);
      must(db.profiles.find(p => p.name === 'Nuevo Pendiente').account_status === 'approved', 'La cuenta no quedó aprobada');
    },
  },
];

// ───────────── ejecución ─────────────
const VIEWPORTS = [['teléfono', { width: 400, height: 860 }], ['computadora', { width: 1920, height: 1000 }]];
const server = await startServer(DIST);
const PORT = server.port;
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const results = [];
const shotsDir = path.join(os.tmpdir(), 'scoutplan-flujos');
fs.mkdirSync(shotsDir, { recursive: true });

for (const [vpName, viewport] of VIEWPORTS) {
  for (const flow of FLOWS.filter(f => !solo || f.name.includes(solo))) {
    const profile = PROFILES[flow.role];
    const context = await browser.newContext({ viewport });
    const log = await attachMockSupabase(context, profile, { persist: true });
    if (context.routeWebSocket) await context.routeWebSocket(/supabase\.co/, ws => ws.close());
    await context.addInitScript(({ session, profile, noSession }) => {
      if (!noSession) {
        localStorage.setItem('sb-e2eprueba-auth-token', JSON.stringify(session));
        localStorage.setItem('@scout_cached_profile', JSON.stringify(profile));
      }
      localStorage.setItem('onboarding_seen_' + profile.id, 'true');
      localStorage.setItem('app_dark_mode', 'false');
    }, { session: fakeSession(profile), profile, noSession: !!flow.noSession });
    const page = await context.newPage();
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.accept().catch(() => {}); });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message || e)));
    const t0 = Date.now();
    let error = null;
    try {
      await flow.run(page, log.db, { dialogs, log });
      if (errors.length) throw new Falla(`Error de JavaScript: ${errors[0]}`);
    } catch (e) {
      error = e instanceof Falla ? e.message : `Error inesperado: ${e.message}`;
      const shot = path.join(shotsDir, `${vpName}-${flow.name.replace(/\W+/g, '_').slice(0, 60)}.png`);
      await page.screenshot({ path: shot }).catch(() => {});
      error += `\n      captura: ${shot}${dialogs.length ? `\n      avisos: ${dialogs.slice(-3).join(' | ').slice(0, 300)}` : ''}`;
    }
    results.push({ vpName, name: flow.name, error, ms: Date.now() - t0 });
    console.log(`  ${error ? '✗' : '✔'} [${vpName}] ${flow.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)${error ? `\n      ${error}` : ''}`);
    await context.close();
  }
}
await browser.close();
server.close();
const bad = results.filter(r => r.error);
console.log(`\n${bad.length ? '✗' : '✔'} ${results.length - bad.length} flujos correctos, ${bad.length} con fallas`);
process.exit(bad.length ? 1 : 0);
