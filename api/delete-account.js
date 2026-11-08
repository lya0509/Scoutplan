// Borrar mi cuenta: SOLO la propia, con sesión iniciada y confirmación escrita ("BORRAR").
// 1) borra los archivos de la persona en scout-files, 2) borra sus datos personales
//    (borrar_datos_de_cuenta: lo del grupo se conserva sin autor), 3) borra el usuario de Auth.
const { getAdminSupabase, setCors, requireUser, parseBody, serviceKeyStatus } = require('./_auth');

module.exports = async (req, res) => {
  setCors(req, res);
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return res.status(401).json({ error: 'login_required' });

  let body;
  try { body = parseBody(req); } catch { return res.status(400).json({ error: 'bad_request' }); }
  if (!body || body.confirm !== 'BORRAR') {
    return res.status(400).json({ error: 'confirm_required', message: 'Escribe BORRAR para confirmar.' });
  }

  const keyStatus = serviceKeyStatus();
  if (keyStatus !== 'ok') return res.status(503).json({ error: keyStatus === 'anon' ? 'wrong_key_type' : 'not_configured' });

  const uid = auth.user.id;
  const admin = getAdminSupabase();

  try {
    // 1. Archivos
    const { data: files, error: fe } = await admin.rpc('archivos_de_usuario', { p_uid: uid });
    if (fe) throw new Error('No se pudo leer la lista de archivos: ' + fe.message);
    const paths = (files || []).map((f) => f.name).filter(Boolean);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from('scout-files').remove(paths.slice(i, i + 100));
      if (error) throw new Error('No se pudieron borrar los archivos: ' + error.message);
    }

    // 2. Datos personales (y registro en el historial)
    const { error: de } = await admin.rpc('borrar_datos_de_cuenta', { p_uid: uid });
    if (de) throw new Error('No se pudieron borrar los datos: ' + de.message);

    // 3. Usuario de inicio de sesión
    const { error: ue } = await admin.auth.admin.deleteUser(uid);
    if (ue) throw new Error('Se borraron los datos, pero no el usuario de inicio de sesión: ' + ue.message);

    return res.status(200).json({ success: true, files: paths.length });
  } catch (err) {
    console.error('delete-account:', err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
