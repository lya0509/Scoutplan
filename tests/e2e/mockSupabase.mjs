// Supabase simulado para las pruebas de pantallas: la app compilada habla con este "servidor"
// (interceptado con Playwright) en vez de con la base de datos real. Nada sale a internet.
//
// - PostgREST (/rest/v1/<tabla>): devuelve las filas de FIXTURES aplicando los filtros
//   simples que usa la app (eq, neq, in, is, like/ilike, gt/gte/lt/lte). Escrituras → OK.
// - Auth (/auth/v1/user, /token): la sesión del usuario de prueba.
// - Storage: enlaces firmados falsos y una imagen de 1×1.
// - /api/*: responde {} (funciones de Vercel).

export const GROUP = 'Grupo Prueba E2E';

const now = new Date();
const iso = (d) => d.toISOString();
const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
const year = now.getFullYear();
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const USERS = {
  scout: '00000000-0000-4000-8000-0000000e2e01',
  scouter: '00000000-0000-4000-8000-0000000e2e02',
  jefe_grupo: '00000000-0000-4000-8000-0000000e2e03',
  comisionado_distrital: '00000000-0000-4000-8000-0000000e2e04',
  lobato: '00000000-0000-4000-8000-0000000e2e05',
};

function profile(id, role, name, unit, extra = {}) {
  return {
    id, role, name, unit,
    email: `${role}@prueba.e2e`,
    group_name: GROUP,
    cedula: 'V-1234567', phone: '0414-0000000',
    birth_date: '2005-03-10', promise_date: '2019-05-01', join_date: '2018-09-15',
    region: 'reg_e2e', district: 'dist_e2e',
    avatar_url: null, scout_avatar_url: null, custom_avatar_url: null,
    membership_status: 'vigente',
    membership_expires_at: iso(new Date(now.getTime() + 200 * 864e5)),
    membership_rejected_reason: null,
    account_status: 'approved',
    medical_data: { tipoSangre: 'O+', alergias: 'Ninguna' },
    curriculum_data: {},
    last_seen: iso(now),
    created_at: '2025-01-10T12:00:00Z', updated_at: iso(now),
    ...extra,
  };
}

export const PROFILES = {
  scout: profile(USERS.scout, 'scout', 'Joven Prueba', 'clan'),
  scouter: profile(USERS.scouter, 'scouter', 'Scouter Prueba', 'clan'),
  jefe_grupo: profile(USERS.jefe_grupo, 'jefe_grupo', 'Jefa Prueba', 'clan'),
  comisionado_distrital: profile(USERS.comisionado_distrital, 'comisionado_distrital', 'Comisionado Prueba', 'clan'),
  lobato: profile(USERS.lobato, 'scout', 'Lobato Prueba', 'manada'),
};

export const FIXTURES = {
  profiles: Object.values(PROFILES),
  stage_progress: [
    { id: 'sp1', scout_id: USERS.scout, stage_id: 'precursor', status: 'Aprobada', updated_at: '2026-03-01T12:00:00Z' },
    { id: 'sp2', scout_id: USERS.scout, stage_id: 'expedicionario', status: 'En Progreso', updated_at: '2026-06-01T12:00:00Z' },
  ],
  requirement_progress: [
    { id: 'rp1', scout_id: USERS.scout, stage_id: 'expedicionario', requirement_id: 'req_1', completed: true, updated_at: iso(now) },
  ],
  certificates: [
    { id: 'c0000000-0000-4000-8000-000000000001', scout_id: USERS.scout, title: 'Primeros Auxilios', category: 'curso', level: 'Básico', file_url: null, status: 'approved', created_at: '2026-02-01T12:00:00Z' },
  ],
  quarterly_plans: [
    {
      id: 'qp000000-0000-4000-8000-000000000001', scout_id: null, group_name: GROUP, unit: 'clan', quarter, year,
      goals: JSON.stringify({ objetivo: 'Objetivo de prueba', elaborado_por: 'Scouter Prueba' }),
      monthly_activities: [{ id: 'a1', month: MONTHS[now.getMonth()], day: '20', activity: 'Excursión de prueba', place: 'Sede', responsible: 'Scouter Prueba' }],
      status: 'enviado', created_by_name: 'Scouter Prueba', updated_at: iso(now), created_at: iso(now),
    },
  ],
  calendar_events: [
    { id: 'ce000000-0000-4000-8000-000000000001', title: 'Reunión de prueba', date: iso(now).slice(0, 10), unit: 'clan', description: 'Sede', created_at: iso(now) },
  ],
  scout_programas: [
    { id: 'pg000000-0000-4000-8000-000000000001', title: 'Programa de prueba', unit: 'clan', date: iso(new Date(now.getTime() + 7 * 864e5)).slice(0, 10), location: 'Sede', activity_type: 'Reunión', creator_name: 'Scouter Prueba', creator_id: USERS.scouter, group_name: GROUP, created_at: iso(now), updated_at: iso(now) },
  ],
  notifications: [
    { id: 'nt000000-0000-4000-8000-000000000001', title: 'Aviso de prueba', message: 'Bienvenido a las pruebas', target_role: 'all', group_name: GROUP, created_at: iso(now), read_by: [] },
  ],
  scout_notifications: [],
  scout_groups: [{ id: GROUP, name: GROUP, region_id: 'reg_e2e', district_id: 'dist_e2e', active: true }],
  scout_districts: [{ id: 'dist_e2e', region_id: 'reg_e2e', name: 'Distrito Prueba' }],
  scout_regions: [{ id: 'reg_e2e', name: 'Región Prueba' }],
  cip_oficiales: [
    { id: 'cip00000-0000-4000-8000-000000000001', nombre: 'CIP de prueba', nivel: 'distrital', fecha: iso(now).slice(0, 10), lugar: 'Parque', active: true, created_by_name: 'Scouter Prueba' },
  ],
  audit_log: [],
  push_subscriptions: [],
  bug_reports: [],
};

const RPC = {
  directorio_grupo: () => FIXTURES.profiles.map(p => ({ id: p.id, name: p.name, unit: p.unit, role: p.role, group_name: p.group_name, scout_avatar_url: null, last_seen: p.last_seen, account_status: p.account_status })),
  grupos_registro: () => [{ name: GROUP }],
  perfil_publico: (body) => FIXTURES.profiles.filter(p => p.id === body?.p_id),
};

const SKIP_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and']);

function matchOne(value, opExpr) {
  let neg = false;
  let expr = opExpr;
  if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4); }
  const dot = expr.indexOf('.');
  const op = expr.slice(0, dot);
  const arg = expr.slice(dot + 1);
  const v = value === undefined ? null : value;
  let res;
  switch (op) {
    case 'eq': res = String(v) === arg; break;
    case 'neq': res = String(v) !== arg; break;
    case 'is': res = arg === 'null' ? v === null : String(v) === arg; break;
    case 'in': {
      const list = arg.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, ''));
      res = list.includes(String(v));
      break;
    }
    case 'like': case 'ilike': {
      const re = new RegExp('^' + arg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*') + '$', op === 'ilike' ? 'i' : '');
      res = re.test(String(v ?? ''));
      break;
    }
    case 'gt': res = String(v) > arg; break;
    case 'gte': res = String(v) >= arg; break;
    case 'lt': res = String(v) < arg; break;
    case 'lte': res = String(v) <= arg; break;
    default: res = true; // filtro que no se simula: no descarta
  }
  return neg ? !res : res;
}

function filterRows(rows, params) {
  return rows.filter(row => {
    for (const [k, val] of params) {
      if (SKIP_PARAMS.has(k)) continue;
      if (!matchOne(row[k], val)) return false;
    }
    return true;
  });
}

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Sesión de Supabase guardada en el navegador (localStorage) para el usuario de prueba. */
export function fakeSession(p, { expired = false } = {}) {
  const exp = Math.floor(Date.now() / 1000) + (expired ? -7200 : 24 * 3600);
  const user = { id: p.id, aud: 'authenticated', role: 'authenticated', email: p.email, user_metadata: { name: p.name, role: p.role, unit: p.unit, group_name: p.group_name }, app_metadata: {}, created_at: p.created_at };
  return {
    access_token: `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: p.id, role: 'authenticated', exp, aud: 'authenticated' })}.firma`,
    refresh_token: 'refresh-e2e',
    token_type: 'bearer',
    expires_in: 24 * 3600,
    expires_at: exp,
    user,
  };
}

/**
 * Conecta el Supabase simulado a un contexto de Playwright.
 * Devuelve un registro de lo que la app pidió (para revisar escrituras inesperadas).
 */
export async function attachMockSupabase(context, currentProfile) {
  const log = { writes: [], unknownTables: new Set() };
  await context.route(/^https:\/\/[a-z0-9-]+\.supabase\.co\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: JSON.stringify(body) });

    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });

    // Auth
    if (url.pathname.startsWith('/auth/v1/')) {
      const session = fakeSession(currentProfile);
      if (url.pathname === '/auth/v1/user') return json(session.user);
      if (url.pathname === '/auth/v1/token') return json(session);
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      return json({});
    }

    // Storage
    if (url.pathname.startsWith('/storage/v1/')) {
      if (url.pathname.includes('/object/sign/') && method === 'POST') {
        const path = url.pathname.split('/object/sign/')[1];
        return json({ signedURL: `/object/sign/${path}?token=e2e` });
      }
      if (method === 'GET') return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG_1PX });
      log.writes.push(`${method} storage ${url.pathname}`);
      return json({ Key: 'e2e', Id: 'e2e' });
    }

    // RPC
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)/);
    if (rpc) {
      const fn = RPC[rpc[1]];
      let body = null;
      try { body = req.postDataJSON(); } catch {}
      return json(fn ? fn(body) : null);
    }

    // PostgREST
    const tbl = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/);
    if (tbl) {
      const table = tbl[1];
      if (method !== 'GET' && method !== 'HEAD') {
        log.writes.push(`${method} ${table}`);
        let body = [];
        try { body = req.postDataJSON(); } catch {}
        return json(Array.isArray(body) ? body : body ? [body] : [], method === 'POST' ? 201 : 200);
      }
      if (!(table in FIXTURES)) log.unknownTables.add(table);
      const rows = filterRows(FIXTURES[table] || [], [...url.searchParams.entries()]);
      const total = rows.length;
      const range = { 'content-range': `0-${Math.max(0, total - 1)}/${total}` };
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', ...range } });
      const accept = req.headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) {
        if (rows.length !== 1) return json({ code: 'PGRST116', details: `The result contains ${rows.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, 406);
        return json(rows[0]);
      }
      return json(rows, 200, range);
    }

    // Realtime u otros: sin respuesta (como si no hubiera servidor)
    return route.abort('connectionrefused');
  });

  // Funciones de Vercel del propio sitio
  await context.route(/\/api\//, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  return log;
}
