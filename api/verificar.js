// Verificación del carnet: GET /api/verificar?id=<uuid>  (requiere sesión iniciada)
// Quien escanea el QR del carnet, con su cuenta de la app, ve SOLO nombre, grupo,
// rama/cargo y estado de la membresía. Sin sesión: 401. Nunca devuelve cédula, teléfono,
// foto, correo ni datos médicos.
const { getAdminSupabase, serviceKeyStatus, requireUser } = require('./_auth');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_LABEL = {
  scouter: 'Scouter / Dirigente',
  jefe_grupo: 'Jefe de Grupo',
  comisionado_distrital: 'Comisionado Distrital',
  comisionado_regional: 'Comisionado Regional',
  nacional: 'Equipo Nacional',
  admin: 'Equipo Nacional',
};

function todayCaracas() {
  // Fecha local de Venezuela (UTC-4) en AAAA-MM-DD
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Sin sesión no se muestra nada (ni siquiera si el carnet existe)
  const auth = await requireUser(req).catch(() => null);
  if (!auth) return res.status(401).json({ error: 'login_required' });

  const id = String((req.query && req.query.id) || '').trim();
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'invalid_id' });

  const keyStatus = serviceKeyStatus();
  if (keyStatus !== 'ok') {
    // missing: falta la variable; anon: se pegó la clave pública en vez de la service_role
    return res.status(503).json({ error: keyStatus === 'anon' ? 'wrong_key_type' : 'not_configured' });
  }

  try {
    const { data, error } = await getAdminSupabase()
      .from('profiles')
      .select('name, group_name, unit, role, membership_status, membership_expires_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(404).json({ error: 'not_found' });
    }

    const expires = data.membership_expires_at ? String(data.membership_expires_at).slice(0, 10) : null;
    let status = 'sin_membresia';
    if (data.membership_status === 'approved' && expires) {
      status = expires >= todayCaracas() ? 'vigente' : 'vencida';
    } else if (data.membership_status === 'pending_approval' || data.membership_status === 'pending') {
      status = 'por_aprobar';
    }

    const cargo = data.role === 'scout'
      ? (data.unit ? String(data.unit).charAt(0).toUpperCase() + String(data.unit).slice(1) : 'Joven Scout')
      : ROLE_LABEL[data.role] || 'Miembro';

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      name: data.name || 'Miembro ASV',
      group: data.group_name || null,
      cargo,
      status,
      expires: status === 'vigente' || status === 'vencida' ? expires : null,
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('verificar:', e && (e.code || ''), e && e.message);
    // Solo el código técnico (sin datos) para poder diagnosticar desde fuera.
    const code = String((e && (e.code || e.status || e.name)) || 'unknown').slice(0, 20);
    console.error('verificar:', e && e.message);
    return res.status(500).json({ error: 'server_error', code });
  }
};
