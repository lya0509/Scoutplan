// Utilidades compartidas por las funciones serverless de /api.
// Los archivos que empiezan con "_" no se publican como endpoints en Vercel.
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en el servidor');
  }
  // Si recibimos el token del usuario, las consultas se hacen con SUS permisos (RLS).
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

// Cliente con permisos de servidor: ignora las reglas RLS. Solo se usa dentro de /api.
// Mientras no exista SUPABASE_SERVICE_ROLE_KEY en Vercel, usa la clave pública (comportamiento anterior).
function getAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return getSupabase();
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function setCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || 'https://scoutplan.vercel.app')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

// Verifica el token de sesión de Supabase. Devuelve { user, accessToken } o null.
async function requireUser(req) {
  const header = req.headers.authorization || '';
  const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!accessToken) return null;
  const { data, error } = await getSupabase().auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return { user: data.user, accessToken };
}

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
}

// ¿Qué clave de servidor hay? 'missing' | 'anon' (pegaron la pública por error) | 'ok'.
// Solo lee el campo "role" del token (no revela la clave).
function serviceKeyStatus() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return 'missing';
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role && payload.role !== 'service_role') return 'anon';
    } catch {}
  } else if (key.startsWith('sb_publishable_')) {
    return 'anon';
  }
  return 'ok';
}

module.exports = { getSupabase, getAdminSupabase, setCors, requireUser, parseBody, serviceKeyStatus };
