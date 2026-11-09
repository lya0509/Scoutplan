// Respaldo semanal de la base de datos (el plan gratuito de Supabase no tiene copias automáticas).
// Lo ejecuta el cron de Vercel (vercel.json). Exige SIEMPRE «Authorization: Bearer <CRON_SECRET>».
// Copia todas las tablas a un .json.gz en el bucket PRIVADO «respaldos» (solo la clave de
// servicio puede leerlo) y conserva las últimas 8 copias. Las fotos y archivos no se copian:
// siguen en el bucket scout-files.
const zlib = require('zlib');
const { getAdminSupabase, serviceKeyStatus } = require('./_auth');

const BUCKET = 'respaldos';
const KEEP = 8;
const TABLES = [
  'profiles', 'stage_progress', 'requirement_progress', 'certificates', 'quarterly_plans',
  'calendar_events', 'scout_programas', 'notifications', 'scout_notifications', 'bug_reports',
  'audit_log', 'cip_oficiales', 'scout_groups', 'scout_regions', 'scout_districts',
];

async function dumpTable(admin, table) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from(table).select('*').range(from, from + PAGE - 1);
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return null; // la tabla no existe
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  if (serviceKeyStatus() !== 'ok') return res.status(503).json({ error: 'not_configured' });

  const admin = getAdminSupabase();
  try {
    // Bucket privado (se crea la primera vez)
    const { data: buckets } = await admin.storage.listBuckets();
    if (!(buckets || []).some((b) => b.id === BUCKET)) {
      const { error } = await admin.storage.createBucket(BUCKET, { public: false });
      if (error && !/already exists/i.test(error.message)) throw new Error('No se pudo crear el bucket: ' + error.message);
    }

    const tables = {};
    const counts = {};
    for (const t of TABLES) {
      const rows = await dumpTable(admin, t);
      if (rows === null) continue;
      tables[t] = rows;
      counts[t] = rows.length;
    }
    const payload = { app: 'Plan Progresivo Scout', createdAt: new Date().toISOString(), counts, tables };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload)));
    const name = `respaldo-${new Date().toISOString().slice(0, 10)}.json.gz`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(name, gz, { contentType: 'application/gzip', upsert: true });
    if (upErr) throw new Error('No se pudo guardar el respaldo: ' + upErr.message);

    // Conservar solo las últimas KEEP copias
    const { data: files } = await admin.storage.from(BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
    const old = (files || []).filter((f) => f.name.startsWith('respaldo-')).slice(KEEP).map((f) => f.name);
    if (old.length) await admin.storage.from(BUCKET).remove(old);

    return res.status(200).json({ success: true, file: name, kb: Math.round(gz.length / 1024), counts, removed: old.length });
  } catch (err) {
    console.error('backup:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
};
