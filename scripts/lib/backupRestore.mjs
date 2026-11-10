// Lógica para restaurar un respaldo hecho por api/backup.js. La comparten:
//   - scripts/restore-backup.mjs (restaura en Supabase de verdad, por la API REST)
//   - tests/sql/run.mjs           (restaura en un Postgres de prueba para comprobar que funciona)
//
// Restaurar = «upsert» por id: las filas del respaldo se vuelven a escribir (si existen se
// actualizan con los datos del respaldo, si faltan se crean). NO se borra nada que exista
// ahora y no esté en el respaldo. Así sirve para recuperar datos perdidos o dañados sin
// perder lo que se cargó después.
import zlib from 'zlib';

/** Orden de escritura: primero lo que otras tablas necesitan (territorio → perfiles → lo demás). */
export const RESTORE_ORDER = [
  'scout_regions', 'scout_districts', 'scout_groups',
  'profiles',
  'stage_progress', 'requirement_progress', 'certificates', 'quarterly_plans',
  'calendar_events', 'scout_programas', 'cip_oficiales',
  'notifications', 'scout_notifications', 'bug_reports', 'audit_log',
];

/** Columna que identifica cada fila (todas las tablas de la app usan `id`). */
export const primaryKeyOf = () => 'id';

/** Lee un respaldo (.json.gz o .json) y comprueba que tenga el formato de api/backup.js. */
export function parseBackup(buffer) {
  const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
  const text = (isGzip ? zlib.gunzipSync(buffer) : buffer).toString('utf8');
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un respaldo válido (no es JSON).');
  }
  if (!payload || typeof payload !== 'object' || !payload.tables || typeof payload.tables !== 'object') {
    throw new Error('El archivo no tiene el formato de respaldo de Plan Progresivo (falta «tables»).');
  }
  return payload;
}

/**
 * Qué se va a restaurar y en qué orden. `only` limita a algunas tablas.
 * Tablas del respaldo que no están en RESTORE_ORDER van al final (por si se agregan nuevas).
 */
export function planRestore(payload, { only } = {}) {
  const names = Object.keys(payload.tables);
  const ordered = [
    ...RESTORE_ORDER.filter((t) => names.includes(t)),
    ...names.filter((t) => !RESTORE_ORDER.includes(t)).sort(),
  ];
  const wanted = only && only.length ? ordered.filter((t) => only.includes(t)) : ordered;
  const unknown = only ? only.filter((t) => !names.includes(t)) : [];
  return {
    createdAt: payload.createdAt || null,
    unknown,
    tables: wanted.map((t) => ({ table: t, rows: Array.isArray(payload.tables[t]) ? payload.tables[t] : [] })),
  };
}

/**
 * Escribe el plan con `writer(table, rows)` en tandas. Si una tanda falla se anota el error
 * y se sigue con lo demás (para no dejar la restauración a medias por una tabla).
 * Devuelve { table: { rows, written, errors: [mensaje] } }.
 */
export async function restoreBackup(plan, writer, { batchSize = 500, onProgress } = {}) {
  const summary = {};
  for (const { table, rows } of plan.tables) {
    const s = { rows: rows.length, written: 0, errors: [] };
    summary[table] = s;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      try {
        await writer(table, batch);
        s.written += batch.length;
      } catch (e) {
        s.errors.push(`filas ${i + 1}-${i + batch.length}: ${e.message || e}`);
      }
      if (onProgress) onProgress(table, s);
    }
  }
  return summary;
}
