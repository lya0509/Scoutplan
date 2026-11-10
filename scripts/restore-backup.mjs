#!/usr/bin/env node
// Restaurar un respaldo semanal (api/backup.js) en Supabase.
//
// Necesita la clave de servicio (NUNCA la subas al repositorio). Cópiala de
// Vercel → scoutplan → Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY
// y pásala solo para este comando:
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/restore-backup.mjs --list
//       → lista los respaldos guardados en el bucket «respaldos»
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/restore-backup.mjs respaldo-2026-11-15.json.gz
//       → PRUEBA: descarga (o lee el archivo local) y muestra qué se restauraría. No escribe nada.
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/restore-backup.mjs respaldo-2026-11-15.json.gz --apply
//       → restaura de verdad (upsert por id: no borra lo que se cargó después del respaldo)
//
//   --tables profiles,certificates   → solo esas tablas
//
// Limitación: el respaldo no incluye las CUENTAS (usuarios de Supabase Auth). Si se borra una
// cuenta, su perfil no se puede restaurar hasta que la persona vuelva a registrarse con el
// mismo id (Supabase Auth); el resto de sus datos se restauran cuando su perfil exista.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseBackup, planRestore, restoreBackup, primaryKeyOf } from './lib/backupRestore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET = 'respaldos';
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const a = args.find((x) => x.startsWith(name + '=')); if (a) return a.split('=')[1]; const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

function supabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) return process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/EXPO_PUBLIC_SUPABASE_URL=(\S+)/);
    if (m) return m[1];
  }
  return '';
}

const URL_BASE = supabaseUrl().replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });

function needKey(what) {
  if (!URL_BASE) throw new Error('Falta la URL de Supabase (EXPO_PUBLIC_SUPABASE_URL en .env o SUPABASE_URL).');
  if (!KEY) throw new Error(`Para ${what} hace falta SUPABASE_SERVICE_ROLE_KEY (ver instrucciones al inicio del archivo).`);
  if (KEY.startsWith('sb_publishable_') || KEY === process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Esa es la clave PÚBLICA. Hace falta la clave de servicio (service_role / sb_secret_…).');
  }
}

async function listBackups() {
  needKey('listar los respaldos');
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 100, sortBy: { column: 'name', order: 'desc' } }),
  });
  if (!res.ok) throw new Error(`No se pudo listar el bucket «${BUCKET}» (${res.status}): ${await res.text()}`);
  return (await res.json()).filter((f) => f.name && f.name.startsWith('respaldo-'));
}

async function loadBackup(nameOrPath) {
  if (fs.existsSync(nameOrPath)) return fs.readFileSync(nameOrPath);
  needKey('descargar el respaldo');
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${encodeURIComponent(nameOrPath)}`, { headers: headers() });
  if (!res.ok) throw new Error(`No se encontró «${nameOrPath}» ni como archivo local ni en el bucket (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

/** Escribe filas por la API REST con «upsert» (on_conflict=id). */
async function restWriter(table, rows) {
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?on_conflict=${primaryKeyOf(table)}`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    let msg = await res.text();
    try { const j = JSON.parse(msg); msg = [j.code, j.message, j.details].filter(Boolean).join(' · '); } catch {}
    throw new Error(`${res.status} ${msg}`);
  }
}

async function main() {
  if (flag('--list')) {
    const files = await listBackups();
    if (!files.length) return console.log('No hay respaldos todavía en el bucket «respaldos».');
    console.log('Respaldos guardados (el más reciente primero):');
    for (const f of files) console.log(`  ${f.name}  ${f.metadata?.size ? Math.round(f.metadata.size / 1024) + ' KB' : ''}`);
    return;
  }

  const source = args.find((a) => !a.startsWith('--') && a !== opt('--tables'));
  if (!source) {
    console.log('Uso: node scripts/restore-backup.mjs --list | <respaldo.json.gz> [--tables a,b] [--apply]');
    process.exit(1);
  }
  const only = opt('--tables') ? opt('--tables').split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const plan = planRestore(parseBackup(await loadBackup(source)), { only });
  if (plan.unknown.length) console.log(`⚠ No están en el respaldo: ${plan.unknown.join(', ')}`);

  console.log(`Respaldo del ${plan.createdAt ? new Date(plan.createdAt).toLocaleString('es-VE') : '(sin fecha)'}`);
  for (const t of plan.tables) console.log(`  ${t.table.padEnd(22)} ${t.rows.length} filas`);

  if (!flag('--apply')) {
    console.log('\nEsto fue solo una PRUEBA: no se escribió nada. Para restaurar de verdad agrega --apply');
    return;
  }

  needKey('restaurar');
  console.log(`\nRestaurando en ${URL_BASE} …`);
  const summary = await restoreBackup(plan, restWriter);
  let errors = 0;
  for (const [table, s] of Object.entries(summary)) {
    const mark = s.errors.length ? '✘' : '✔';
    console.log(`  ${mark} ${table.padEnd(22)} ${s.written}/${s.rows}`);
    s.errors.forEach((e) => console.log(`      ${e}`));
    errors += s.errors.length;
  }
  console.log(errors ? `\nTerminó con ${errors} error(es): revisa las líneas marcadas con ✘.` : '\n✔ Restauración completa.');
  process.exit(errors ? 1 : 0);
}

main().catch((e) => { console.error('✘', e.message); process.exit(1); });
