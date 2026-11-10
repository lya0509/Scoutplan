// Pruebas de la base de datos (reglas de seguridad, disparadores y funciones).
//
// Levanta un Postgres real en memoria (PGlite), recrea lo mínimo de Supabase (auth.uid(),
// roles anon/authenticated/service_role, storage, realtime), ejecuta los SQL del repo en el
// orden en que se aplicaron en producción (cada bloque DOS veces: deben poder repetirse) y
// prueba los permisos entrando como distintos usuarios.
//
//   npm run test:sql
//
// Si una prueba falla, el comando termina con código 1.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { parseBackup, planRestore, restoreBackup, RESTORE_ORDER } from '../../scripts/lib/backupRestore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sqlFile = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const db = new PGlite();
let fails = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { console.log('  ✘', m); fails++; };
const run = async (label, sql) => { try { await db.exec(sql); ok(label); } catch (e) { bad(`${label}: ${e.message}`); } };
const section = (t) => console.log(`\n${t}`);
const U = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;

/** Ejecuta `sql` como el usuario `uid` (rol authenticated). expectOk=false → debe fallar. */
async function as(uid, label, sql, expectOk) {
  try {
    await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('test.uid','${uid}',true); ${sql}; COMMIT;`);
    expectOk ? ok(label) : bad(`${label} → debía FALLAR y pasó`);
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    expectOk ? bad(`${label} → ${e.message}`) : ok(`${label} (rechazado: ${e.message})`);
  }
}
async function rowsAs(uid, sql) {
  await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('test.uid','${uid}',true);`);
  try { return (await db.query(sql)).rows; } finally { await db.exec('COMMIT').catch(() => {}); }
}
async function asRole(role, sql) {
  await db.exec(`SET ROLE ${role}`);
  try { return { rows: (await db.query(sql)).rows }; } catch (e) { return { err: e.message }; } finally { await db.exec('RESET ROLE'); }
}

// ───────────────────────── Supabase mínimo ─────────────────────────
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
CREATE SCHEMA storage; CREATE TABLE storage.objects (id serial, bucket_id text, owner uuid, name text);
CREATE TABLE storage.buckets (id text PRIMARY KEY, public boolean);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE SCHEMA realtime;
CREATE TABLE realtime.messages (id serial, extension text, topic text, payload jsonb);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('test.topic', true) $$;
GRANT USAGE ON SCHEMA realtime TO authenticated; GRANT ALL ON realtime.messages TO authenticated; GRANT USAGE ON ALL SEQUENCES IN SCHEMA realtime TO authenticated; GRANT EXECUTE ON FUNCTION realtime.topic() TO authenticated;

-- Tablas tal como existen en producción (columnas que usan las reglas)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id), name text, email text, role text DEFAULT 'scout', unit text,
  group_name text, region text, district text, cedula text, birth_date date,
  membership_status text DEFAULT 'none', membership_expires_at date,
  avatar_url text, custom_avatar_url text, updated_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now());
CREATE TABLE public.scout_notifications (id serial PRIMARY KEY, scout_id uuid, title text, reason text, is_read boolean, created_at timestamptz DEFAULT now());
CREATE TABLE public.notifications (id text PRIMARY KEY, sender_id uuid, receiver_id uuid, receiver_role text, title text, message text,
  type text, group_name text, unit text, read boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE public.certificates (id serial PRIMARY KEY, scout_id uuid REFERENCES public.profiles(id), category text, title text, level text, file_url text);
CREATE TABLE public.stage_progress (id serial PRIMARY KEY, scout_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, stage_id text, status text);
CREATE TABLE public.calendar_events (id serial PRIMARY KEY, title text, group_name text, created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE);
CREATE TABLE public.push_subscriptions (id serial PRIMARY KEY, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, endpoint text);
CREATE TABLE public.quarterly_plans (id serial PRIMARY KEY, scout_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, group_name text, unit text, quarter text, year int, elaborated_by text);
ALTER TABLE public.quarterly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
`);

// ───────────────────────── Estado previo (SQL ya aplicados) ─────────────────────────
section('Estado previo');
await run('esquema jerárquico (regiones, distritos, grupos)', sqlFile('supabase_national_hierarchy_schema.sql'));
const seg = sqlFile('supabase_rls_seguridad.sql');
await run('mi_rol', seg.slice(seg.indexOf('CREATE OR REPLACE FUNCTION public.mi_rol()'), seg.indexOf('CREATE OR REPLACE FUNCTION public.mi_grupo()')));
await run('reglas de catálogos y avisos previas', `
  CREATE POLICY grupos_leer ON public.scout_groups FOR SELECT TO authenticated USING (true);
  CREATE POLICY distritos_leer ON public.scout_districts FOR SELECT TO authenticated USING (true);
  CREATE POLICY catalogos_admin_distritos ON public.scout_districts FOR ALL TO authenticated USING (public.mi_rol() IN ('admin','nacional')) WITH CHECK (public.mi_rol() IN ('admin','nacional'));
  CREATE POLICY catalogos_admin_grupos ON public.scout_groups FOR ALL TO authenticated USING (public.mi_rol() IN ('admin','nacional')) WITH CHECK (public.mi_rol() IN ('admin','nacional'));
  CREATE POLICY notificaciones_ver ON public.notifications FOR SELECT TO authenticated USING (receiver_id::text = auth.uid()::text OR sender_id::text = auth.uid()::text);
  CREATE POLICY calendario_ver ON public.calendar_events FOR SELECT TO authenticated USING (true);
  GRANT ALL ON public.scout_groups, public.scout_districts, public.scout_regions TO authenticated;`);
await run('supabase_aprobacion_cuentas.sql', sqlFile('supabase_aprobacion_cuentas.sql'));
await run('disparador proteger_perfil y reglas de perfiles', `
  CREATE TRIGGER proteger_perfil BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil();
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY perfiles_ver ON public.profiles FOR SELECT TO authenticated USING (public.puede_gestionar(id::text));
  CREATE POLICY perfiles_editar ON public.profiles FOR UPDATE TO authenticated USING (public.puede_gestionar(id::text)) WITH CHECK (public.puede_gestionar(id::text));`);
await run('supabase_aviso_cuentas_pendientes.sql', sqlFile('supabase_aviso_cuentas_pendientes.sql'));

// Personas: Orión 84 (Jefe, Scouter clan, Rover) y QA (Jefe, futura Comisionada, Rover)
await db.exec(`
INSERT INTO auth.users (id) SELECT ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid FROM generate_series(1, 12) n;
INSERT INTO public.profiles (id, name, email, role, unit, group_name, region, district) VALUES
 ('${U(1)}', 'Jefe Orión',    'j@o.test',  'jefe_grupo', 'grupo', 'Grupo Orión #84', 'miranda', 'guarenas_guatire'),
 ('${U(2)}', 'Scouter Orión', 's@o.test',  'scouter',    'clan',  'Grupo Orión #84', 'miranda', 'guarenas_guatire'),
 ('${U(3)}', 'Rover Orión',   'r@o.test',  'scout',      'clan',  'Grupo Orión #84', 'miranda', 'guarenas_guatire'),
 ('${U(4)}', 'Jefe QA',       'j@qa.test', 'jefe_grupo', 'grupo', 'QA Pruebas', NULL, NULL),
 ('${U(5)}', 'Comisionada QA','c@qa.test', 'scout',      'clan',  'QA Pruebas', NULL, NULL),
 ('${U(6)}', 'Rover QA',      'r@qa.test', 'scout',      'clan',  'QA Pruebas', NULL, NULL);`);

// ───────────────────────── Administración ─────────────────────────
section('supabase_administracion.sql');
const adm = sqlFile('supabase_administracion.sql');
const a2 = adm.indexOf('-- ================= BLOQUE 2'), a3 = adm.indexOf('-- ============ BLOQUE 3');
const qaBlock = `
  INSERT INTO public.scout_regions (id, name, code) VALUES ('qa_region', 'Región QA', 'QA') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.scout_districts (id, region_id, name) VALUES ('qa_distrito', 'qa_region', 'Distrito QA') ON CONFLICT (id) DO NOTHING;
  UPDATE public.profiles SET region = 'qa_region', district = 'qa_distrito' WHERE group_name = 'QA Pruebas';
  UPDATE public.profiles SET role = 'comisionado_distrital' WHERE id = '${U(5)}';
  UPDATE public.scout_groups SET region_id = 'qa_region', district_id = 'qa_distrito' WHERE name = 'QA Pruebas';`;
for (let k = 0; k < 2; k++) {
  await run('bloque 1 (catálogo de grupos)', adm.slice(0, a2));
  await run('bloque 2 (roles y mover de grupo)', adm.slice(a2, a3));
  await run('bloque 3 (grupos en el registro)', adm.slice(a3));
  await run('datos de prueba QA (distrito y Comisionada)', qaBlock);
}
const grupos = await db.query(`SELECT name FROM public.scout_groups ORDER BY name`);
grupos.rows.some(r => r.name === 'Grupo Orión #84') ? ok('Orión 84 en el catálogo con el nombre de los perfiles') : bad('Orión 84 no quedó en el catálogo');
await as(U(2), 'Scouter cambia el rol de un Rover', `UPDATE public.profiles SET role='jefe_grupo' WHERE id='${U(3)}'`, false);
await as(U(1), 'Jefe nombra Scouter a un Rover', `UPDATE public.profiles SET role='scouter' WHERE id='${U(3)}'`, true);
await as(U(1), 'Jefe lo devuelve a Scout', `UPDATE public.profiles SET role='scout' WHERE id='${U(3)}'`, true);
await as(U(1), 'Jefe intenta nombrar admin', `UPDATE public.profiles SET role='admin' WHERE id='${U(3)}'`, false);
await as(U(1), 'Jefe mueve a alguien a otro grupo', `UPDATE public.profiles SET group_name='Grupo Alianza' WHERE id='${U(3)}'`, false);
await as(U(1), 'Jefe cambia su propio rol', `UPDATE public.profiles SET role='scout' WHERE id='${U(1)}'`, false);
await as(U(5), 'Comisionada crea grupo en su distrito', `INSERT INTO public.scout_groups (name, region_id, district_id) VALUES ('QA Pruebas 2','qa_region','qa_distrito')`, true);
await as(U(5), 'Comisionada crea grupo en otro distrito', `INSERT INTO public.scout_groups (name, region_id, district_id) VALUES ('Ajeno','miranda','guarenas_guatire')`, false);
await as(U(5), 'Comisionada mueve a un Rover dentro de su distrito', `UPDATE public.profiles SET group_name='QA Pruebas 2' WHERE id='${U(6)}'`, true);
await as(U(5), 'Comisionada mueve a alguien fuera de su distrito', `UPDATE public.profiles SET district='guarenas_guatire', group_name='Grupo Orión #84' WHERE id='${U(6)}'`, false);
const vis = await rowsAs(U(5), `SELECT name FROM public.profiles`);
vis.every(r => !/Orión/.test(r.name)) ? ok('La Comisionada QA no ve perfiles de Orión') : bad('La Comisionada QA ve perfiles de Orión');
const reg = await asRole('anon', `SELECT name FROM public.grupos_registro()`);
!reg.err && reg.rows.length ? ok(`Sin sesión: grupos_registro() da solo nombres (${reg.rows.length})`) : bad('grupos_registro sin sesión: ' + reg.err);
const anonG = await asRole('anon', `SELECT count(*) FROM public.scout_groups`);
anonG.err ? ok('Sin sesión no se lee la tabla de grupos') : bad('Sin sesión se lee scout_groups');

// ───────────────────────── Historial y borrar cuenta ─────────────────────────
section('supabase_historial_borrado.sql');
const hist = sqlFile('supabase_historial_borrado.sql');
const h2 = hist.indexOf('-- ======================= BLOQUE 2');
for (let k = 0; k < 2; k++) { await run('bloque 1 (historial)', hist.slice(0, h2)); await run('bloque 2 (borrado)', hist.slice(h2)); }
await as(U(1), 'Jefe nombra Scouter a un Rover (queda en el historial)', `UPDATE public.profiles SET role='scouter' WHERE id='${U(3)}'`, true);
await as(U(5), 'Comisionada devuelve al Rover QA a su grupo', `UPDATE public.profiles SET group_name='QA Pruebas' WHERE id='${U(6)}'`, true);
const hJ = await rowsAs(U(1), `SELECT group_name FROM public.audit_log`);
hJ.length && hJ.every(r => r.group_name === 'Grupo Orión #84') ? ok('Jefe Orión ve solo el historial de su grupo') : bad('Historial del Jefe Orión: ' + JSON.stringify(hJ));
const hC = await rowsAs(U(5), `SELECT group_name FROM public.audit_log`);
hC.length && hC.every(r => (r.group_name || '').startsWith('QA')) ? ok('Comisionada ve solo su distrito') : bad('Historial de la Comisionada: ' + JSON.stringify(hC));
(await rowsAs(U(6), `SELECT count(*)::int n FROM public.audit_log`))[0].n === 0 ? ok('Un Rover no ve el historial') : bad('Un Rover ve el historial');
await as(U(1), 'Jefe escribe en el historial', `INSERT INTO public.audit_log (action, detail) VALUES ('rol','falso')`, false);
await as(U(1), 'Jefe borra el historial', `DELETE FROM public.audit_log`, false);
await as(U(6), 'Usuario normal llama a borrar_datos_de_cuenta', `SELECT public.borrar_datos_de_cuenta('${U(3)}')`, false);
// Borrado real de una cuenta temporal (U12) como servidor
await db.exec(`INSERT INTO public.profiles (id, name, role, unit, group_name) VALUES ('${U(12)}', 'Temporal', 'scout', 'clan', 'Grupo Orión #84');
  INSERT INTO public.certificates (scout_id, category, title) VALUES ('${U(12)}', 'x', 'cert');
  INSERT INTO public.stage_progress (scout_id, stage_id, status) VALUES ('${U(12)}', 'precursor', 'En Progreso');
  INSERT INTO public.calendar_events (title, group_name, created_by) VALUES ('Campamento de grupo', 'Grupo Orión #84', '${U(12)}');
  INSERT INTO public.push_subscriptions (user_id, endpoint) VALUES ('${U(12)}', 'x');
  INSERT INTO storage.objects (bucket_id, owner, name) VALUES ('scout-files', '${U(12)}', 'fotos/t.jpg');`);
const files = await asRole('service_role', `SELECT * FROM public.archivos_de_usuario('${U(12)}')`);
await asRole('service_role', `SELECT public.borrar_datos_de_cuenta('${U(12)}')`);
const left = (await db.query(`SELECT (SELECT count(*) FROM public.profiles WHERE id='${U(12)}')::int p, (SELECT count(*) FROM public.certificates WHERE scout_id='${U(12)}')::int c,
  (SELECT count(*) FROM public.push_subscriptions WHERE user_id='${U(12)}')::int ps, (SELECT count(*) FROM public.calendar_events WHERE title='Campamento de grupo')::int ev`)).rows[0];
files.rows?.length === 1 ? ok('archivos_de_usuario encuentra sus archivos') : bad('archivos_de_usuario: ' + JSON.stringify(files));
left.p + left.c + left.ps === 0 ? ok('Borrado: perfil, certificados y suscripciones') : bad('Quedaron datos: ' + JSON.stringify(left));
left.ev === 1 ? ok('El evento del grupo se conserva sin autor') : bad('Se borró un evento del grupo');

// ───────────────────────── CIP oficiales ─────────────────────────
section('supabase_cip_oficiales.sql');
for (let k = 0; k < 2; k++) await run('supabase_cip_oficiales.sql', sqlFile('supabase_cip_oficiales.sql'));
await db.exec(`UPDATE public.profiles SET role='scout' WHERE id='${U(3)}'`);
await as(U(1), 'Jefe Orión crea CIP del grupo', `INSERT INTO public.cip_oficiales (nombre,nivel,group_name,created_by) VALUES ('Día de las Playas','nacional','Grupo Orión #84','${U(1)}')`, true);
await as(U(2), 'Scouter Orión crea CIP del grupo', `INSERT INTO public.cip_oficiales (nombre,nivel,group_name,created_by) VALUES ('Indaba Distrital','distrital','Grupo Orión #84','${U(2)}')`, true);
await as(U(3), 'Rover intenta crear un CIP', `INSERT INTO public.cip_oficiales (nombre,nivel,group_name,created_by) VALUES ('Falso','distrital','Grupo Orión #84','${U(3)}')`, false);
await as(U(1), 'Jefe Orión crea CIP para otro grupo', `INSERT INTO public.cip_oficiales (nombre,nivel,group_name,created_by) VALUES ('Ajeno','distrital','QA Pruebas','${U(1)}')`, false);
await as(U(5), 'Comisionada crea CIP distrital (su distrito)', `INSERT INTO public.cip_oficiales (nombre,nivel,region,district,created_by) VALUES ('Camporee QA','distrital','qa_region','qa_distrito','${U(5)}')`, true);
await as(U(5), 'Comisionada crea CIP nacional', `INSERT INTO public.cip_oficiales (nombre,nivel,region,district,created_by) VALUES ('Jamboree','nacional','qa_region','qa_distrito','${U(5)}')`, false);
const cO = await rowsAs(U(3), `SELECT nombre FROM public.cip_oficiales`);
cO.every(r => r.nombre !== 'Camporee QA') ? ok('Orión no ve el CIP del distrito QA') : bad('Orión ve CIP ajeno');
const cQ = await rowsAs(U(4), `SELECT nombre FROM public.cip_oficiales`);
cQ.every(r => !['Día de las Playas', 'Indaba Distrital'].includes(r.nombre)) ? ok('QA no ve los CIP de Orión') : bad('QA ve CIP de Orión');
await as(U(2), 'Scouter marca asistencia (cip_sel) al Rover', `INSERT INTO public.certificates (scout_id,category,title,level) VALUES ('${U(3)}','cip_sel_descubridor_des_cip_nacional','Día de las Playas','nacional')`, true);
await as(U(3), 'Rover se acredita un CIP a sí mismo', `INSERT INTO public.certificates (scout_id,category,title,level) VALUES ('${U(3)}','cip_sel_descubridor_des_cip_regional','Falso','regional')`, false);
await as(U(3), 'Rover borra un CIP acreditado', `DELETE FROM public.certificates WHERE scout_id='${U(3)}' AND category LIKE 'cip_sel_%'`, false);
await as(U(3), 'Rover pide un CIP anterior (cip_sol)', `INSERT INTO public.certificates (scout_id,category,title,level) VALUES ('${U(3)}','cip_sol_descubridor_des_cip_regional','Indaba 2024','regional')`, true);
await as(U(3), 'Rover registra noches (otra categoría)', `INSERT INTO public.certificates (scout_id,category,title) VALUES ('${U(3)}','aire_libre_precursor_pre_noches','Noche')`, true);

// ───────────────────────── Seguridad y en vivo ─────────────────────────
section('supabase_seguridad_vivo.sql');
const sv = sqlFile('supabase_seguridad_vivo.sql');
const s2 = sv.indexOf('-- ======================= BLOQUE 2'), s3 = sv.indexOf('-- ============ BLOQUE 3');
for (let k = 0; k < 2; k++) {
  await run('bloque 1 (reglas)', sv.slice(0, s2));
  try { await db.exec(sv.slice(s2, s3)); ok('bloque 2 (en vivo)'); } catch (e) {
    if (/publication|wal_level|logical/i.test(e.message)) {
      // PGlite no tiene replicación lógica: se prueban solo las reglas de presencia
      await run('bloque 2 (presencia; la publicación no existe en PGlite)', sv.slice(sv.indexOf('-- 5. «En línea»'), s3).replace(/SELECT 'en vivo listo'[\s\S]*$/, ''));
    } else bad('bloque 2: ' + e.message);
  }
  await run('bloque 3 (diagnóstico)', sv.slice(s3));
}
await db.exec(`INSERT INTO public.profiles (id, name, role, unit, group_name, region, district, account_status) VALUES ('${U(9)}', 'Pendiente Orión', 'scout', 'clan', 'Grupo Orión #84', 'miranda', 'guarenas_guatire', 'pending')`);
await as(U(2), 'Scouter avisa a su grupo (rama clan)', `INSERT INTO public.notifications (id,sender_id,title,message,group_name,unit) VALUES ('n1','${U(2)}','Reunión','Sábado','Grupo Orión #84','clan')`, true);
await as(U(3), 'Rover avisa a sus Scouters', `INSERT INTO public.notifications (id,sender_id,title,message,group_name,receiver_role) VALUES ('n2','${U(3)}','Etapa','Revisar','Grupo Orión #84','scouter')`, true);
await as(U(4), 'Jefe QA intenta avisar a todo Orión', `INSERT INTO public.notifications (id,sender_id,title,message,group_name) VALUES ('n3','${U(4)}','Spam','x','Grupo Orión #84')`, false);
await as(U(4), 'Jefe QA intenta avisar directo a un Rover de Orión', `INSERT INTO public.notifications (id,sender_id,receiver_id,title,message) VALUES ('n4','${U(4)}','${U(3)}','Spam','x')`, false);
await as(U(9), 'Cuenta en revisión intenta avisar a su grupo', `INSERT INTO public.notifications (id,sender_id,title,message,group_name) VALUES ('n5','${U(9)}','x','x','Grupo Orión #84')`, false);
const vR = (await rowsAs(U(3), `SELECT id FROM public.notifications`)).map(r => r.id);
const vS = (await rowsAs(U(2), `SELECT id FROM public.notifications`)).map(r => r.id);
const vQ = (await rowsAs(U(4), `SELECT id FROM public.notifications`)).map(r => r.id);
const vP = (await rowsAs(U(9), `SELECT id FROM public.notifications`)).map(r => r.id);
(vR.includes('n1') && vS.includes('n2') && !vQ.length && !vP.length)
  ? ok('Cada aviso de grupo le llega solo a quien corresponde')
  : bad(`Reparto de avisos: rover ${vR} scouter ${vS} QA ${vQ} pendiente ${vP}`);
async function topicAs(uid, topic, label, expectOk) {
  try {
    await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('test.uid','${uid}',true); SELECT set_config('test.topic','${topic}',true);
      INSERT INTO realtime.messages (extension, topic) VALUES ('presence', '${topic}'); COMMIT;`);
    expectOk ? ok(label) : bad(label + ' → debía fallar');
  } catch (e) { await db.exec('ROLLBACK').catch(() => {}); expectOk ? bad(label + ' → ' + e.message) : ok(label + ' (rechazado)'); }
}
await topicAs(U(3), 'presencia:Grupo Orión #84', 'Rover entra a la presencia de su grupo', true);
await topicAs(U(4), 'presencia:Grupo Orión #84', 'Jefe QA intenta entrar a la presencia de Orión', false);
await topicAs(U(9), 'presencia:Grupo Orión #84', 'Cuenta en revisión intenta entrar a la presencia', false);
await db.exec(`UPDATE public.profiles SET membership_status='approved', membership_expires_at='2025-01-01' WHERE id='${U(3)}'`);
await as(U(3), 'Rover se extiende la anualidad vencida', `UPDATE public.profiles SET membership_expires_at='2099-01-01' WHERE id='${U(3)}'`, false);
await as(U(2), 'Scouter le asigna la anualidad al Rover', `UPDATE public.profiles SET membership_expires_at='2027-01-01' WHERE id='${U(3)}'`, true);
await db.exec(`INSERT INTO public.calendar_events (title, group_name, created_by) VALUES ('[CIP NACIONAL] Viejo', 'Grupo Orión #84', '${U(1)}')`);
(await rowsAs(U(4), `SELECT count(*)::int n FROM public.calendar_events`))[0].n === 0 ? ok('Otro grupo ya no ve los eventos «[CIP…]» de Orión') : bad('Otro grupo ve eventos de Orión');
(await rowsAs(U(9), `SELECT count(*)::int n FROM public.calendar_events`))[0].n === 0 ? ok('Una cuenta en revisión no ve el calendario') : bad('Cuenta en revisión ve el calendario');

// ───────────────────────── Reglas abiertas (tablas creadas desde el panel) ─────────────────────────
section('supabase_cerrar_reglas_abiertas.sql');
await db.exec(`CREATE TABLE public.unit_subgroups (id serial PRIMARY KEY, nombre text);
  INSERT INTO public.unit_subgroups (nombre) VALUES ('Patrulla Halcones');
  ALTER TABLE public.unit_subgroups ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON public.unit_subgroups TO anon, authenticated;
  CREATE POLICY "Permitir lectura de todos" ON public.unit_subgroups FOR SELECT USING (true);`);
const antes = await asRole('anon', `SELECT count(*)::int n FROM public.unit_subgroups`);
!antes.err && antes.rows[0].n === 1 ? ok('Antes: sin sesión se leía la tabla abierta (simulación del hallazgo)') : bad('La simulación no reprodujo la regla abierta');
for (let k = 0; k < 2; k++) await run('supabase_cerrar_reglas_abiertas.sql', sqlFile('supabase_cerrar_reglas_abiertas.sql'));
const despues = await asRole('anon', `SELECT count(*)::int n FROM public.unit_subgroups`);
despues.err || despues.rows[0].n === 0 ? ok('Después: sin sesión ya no se lee') : bad('Sin sesión todavía se lee la tabla abierta');
(await rowsAs(U(6), `SELECT count(*)::int n FROM public.unit_subgroups`))[0].n === 1 ? ok('Con sesión se sigue leyendo') : bad('Con sesión dejó de leerse');
const regAnon = await asRole('anon', `SELECT count(*)::int n FROM public.grupos_registro()`);
!regAnon.err ? ok('El formulario de registro sigue viendo los grupos (grupos_registro)') : bad('grupos_registro dejó de funcionar: ' + regAnon.err);
const abiertas = await db.query(`SELECT count(*)::int n FROM pg_policies WHERE schemaname='public' AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])`);
abiertas.rows[0].n === 0 ? ok('No queda ninguna regla para anon/public') : bad('Quedan reglas abiertas: ' + abiertas.rows[0].n);

// ───────────────────────── Plan Trimestral de la unidad ─────────────────────────
section('supabase_plan_unidad_visible.sql');
await db.exec(`CREATE POLICY planes_trimestrales ON public.quarterly_plans FOR ALL TO authenticated
    USING ((scout_id IS NOT NULL AND public.puede_gestionar(scout_id::text)) OR (scout_id IS NULL AND group_name = public.mi_grupo()))
    WITH CHECK ((scout_id IS NOT NULL AND public.puede_gestionar(scout_id::text)) OR (scout_id IS NULL AND group_name = public.mi_grupo()));
  INSERT INTO public.profiles (id, name, role, unit, group_name, region, district) VALUES ('${U(11)}', 'Otro Rover Orión', 'scout', 'clan', 'Grupo Orión #84', 'miranda', 'guarenas_guatire');
  INSERT INTO public.quarterly_plans (scout_id, group_name, unit, quarter, year, elaborated_by) VALUES
    ('${U(2)}', 'Grupo Orión #84', 'clan', 'Q4', 2026, 'Scouter Orión'),
    ('${U(11)}', 'Grupo Orión #84', 'clan', 'Q4', 2026, 'Plan personal de otro Rover');`);
const antesPlan = await rowsAs(U(3), `SELECT elaborated_by FROM public.quarterly_plans`);
!antesPlan.some(r => r.elaborated_by === 'Scouter Orión') ? ok('Antes: el Rover no veía el plan de su unidad (reproduce el error)') : bad('La simulación no reproduce el error');
for (let k = 0; k < 2; k++) await run('supabase_plan_unidad_visible.sql', sqlFile('supabase_plan_unidad_visible.sql'));
const vRover = (await rowsAs(U(3), `SELECT elaborated_by FROM public.quarterly_plans`)).map(r => r.elaborated_by);
vRover.includes('Scouter Orión') ? ok('Ahora el Rover ve el plan de su unidad') : bad('El Rover sigue sin ver el plan de la unidad');
!vRover.includes('Plan personal de otro Rover') ? ok('El Rover NO ve el plan personal de otro Rover') : bad('El Rover ve planes personales ajenos');
(await rowsAs(U(4), `SELECT count(*)::int n FROM public.quarterly_plans`))[0].n === 0 ? ok('Otro grupo no ve los planes de Orión') : bad('Otro grupo ve planes de Orión');
(await rowsAs(U(9), `SELECT count(*)::int n FROM public.quarterly_plans`))[0].n === 0 ? ok('Una cuenta en revisión no ve los planes') : bad('Cuenta en revisión ve planes');
await as(U(3), 'El Rover intenta modificar el plan de la unidad', `UPDATE public.quarterly_plans SET elaborated_by='hackeado' WHERE elaborated_by='Scouter Orión'`, true);
(await db.query(`SELECT count(*)::int n FROM public.quarterly_plans WHERE elaborated_by='hackeado'`)).rows[0].n === 0 ? ok('…pero no cambia nada (solo lectura)') : bad('El Rover pudo modificar el plan de la unidad');

// ───────────────────────── Errores de la app (bug_reports) ─────────────────────────
section('supabase_errores_app.sql');
// La tabla se creó desde el panel de Supabase: aquí con las columnas que usa la app y las
// reglas que dejó supabase_rls_correcciones.sql
await db.exec(`CREATE TABLE public.bug_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, user_name text, user_email text,
    user_role text, description text, media_url text, status text, created_at timestamptz DEFAULT now());
  ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON public.bug_reports TO authenticated, service_role;
  CREATE POLICY reportes_crear ON public.bug_reports FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id::text = auth.uid()::text);
  CREATE POLICY reportes_admin ON public.bug_reports FOR ALL TO authenticated USING (public.mi_rol() IN ('admin', 'nacional')) WITH CHECK (public.mi_rol() IN ('admin', 'nacional'));`);
await as(U(3), 'El Rover guarda un error automático a su nombre', `INSERT INTO public.bug_reports (user_id, user_name, description, status) VALUES ('${U(3)}', 'Rover', '[Error automático] TypeError en Inicio', 'pendiente')`, true);
await as(U(3), 'El Rover intenta guardar un reporte a nombre de otro', `INSERT INTO public.bug_reports (user_id, description) VALUES ('${U(1)}', 'falso')`, false);
await as(U(4), 'Jefe de otro grupo guarda un error propio', `INSERT INTO public.bug_reports (user_id, description) VALUES ('${U(4)}', '[Error automático] de QA')`, true);
const jefeAntes = await rowsAs(U(1), `SELECT count(*)::int n FROM public.bug_reports`);
jefeAntes[0].n === 0 ? ok('Antes: la Jefatura no veía ningún reporte (solo admin)') : bad('La simulación no reproduce el estado previo');
for (let k = 0; k < 2; k++) await run('supabase_errores_app.sql', sqlFile('supabase_errores_app.sql'));
const vJefe = (await rowsAs(U(1), `SELECT description FROM public.bug_reports`)).map(r => r.description);
vJefe.includes('[Error automático] TypeError en Inicio') ? ok('La Jefatura ve los errores de su grupo') : bad('La Jefatura no ve los errores de su grupo');
!vJefe.includes('[Error automático] de QA') ? ok('…pero no los de otro grupo') : bad('La Jefatura ve errores de otro grupo');
(await rowsAs(U(2), `SELECT count(*)::int n FROM public.bug_reports`))[0].n === 0 ? ok('El Scouter no ve los reportes') : bad('El Scouter ve reportes');
(await rowsAs(U(3), `SELECT count(*)::int n FROM public.bug_reports`))[0].n === 0 ? ok('El joven no ve los reportes') : bad('El joven ve reportes');
const anonBug = await asRole('anon', `SELECT count(*)::int n FROM public.bug_reports`);
anonBug.err || anonBug.rows[0].n === 0 ? ok('Sin sesión no se ve nada') : bad('Sin sesión se ven reportes');
await as(U(1), 'La Jefatura intenta borrar un reporte', `DELETE FROM public.bug_reports`, true);
(await db.query(`SELECT count(*)::int n FROM public.bug_reports`)).rows[0].n === 2 ? ok('…pero no borra nada (solo lectura)') : bad('La Jefatura pudo borrar reportes');

// ───────────────────────── Respaldo y restauración ─────────────────────────
// Se arma un respaldo igual al de api/backup.js, se «pierden» y dañan datos, se restaura con
// la misma lógica que scripts/restore-backup.mjs y se compara con el original.
section('Respaldo semanal: restaurar (scripts/restore-backup.mjs)');
await db.exec(`ALTER ROLE service_role BYPASSRLS;`); // como en Supabase: la clave de servicio no pasa por las reglas
const BACKUP_TABLES = ['profiles', 'stage_progress', 'requirement_progress', 'certificates', 'quarterly_plans',
  'calendar_events', 'scout_programas', 'notifications', 'scout_notifications', 'bug_reports',
  'audit_log', 'cip_oficiales', 'scout_groups', 'scout_regions', 'scout_districts'];
const existing = [];
for (const t of BACKUP_TABLES) if ((await db.query(`SELECT to_regclass('public.${t}') r`)).rows[0].r) existing.push(t);
await db.exec(`INSERT INTO public.certificates (scout_id, category, title, level) VALUES ('${U(3)}', 'curso', 'Primeros Auxilios (respaldo)', 'Básico');
  INSERT INTO public.stage_progress (scout_id, stage_id, status) VALUES ('${U(3)}', 'precursor', 'Aprobada');`);
const snapshot = async (t) => (await db.query(`SELECT to_jsonb(x) j FROM public.${t} x ORDER BY x.id::text`)).rows.map(r => JSON.stringify(r.j));
// 1. Respaldo (como lo arma api/backup.js: select * con la clave de servicio, JSON comprimido)
const backupTables = {};
const before = {};
for (const t of existing) {
  const r = await asRole('service_role', `SELECT * FROM public.${t}`);
  backupTables[t] = r.rows.map(row => JSON.parse(JSON.stringify(row)));
  before[t] = await snapshot(t);
}
const gz = zlib.gzipSync(Buffer.from(JSON.stringify({ app: 'Plan Progresivo Scout', createdAt: new Date().toISOString(), tables: backupTables })));
const totalRows = Object.values(backupTables).reduce((a, r) => a + r.length, 0);
totalRows > 10 ? ok(`respaldo armado: ${existing.length} tablas, ${totalRows} filas`) : bad('el respaldo de prueba quedó casi vacío');
// 2. Desastre: se borran certificados, etapas y planes, se daña un perfil; después llega un dato nuevo
await db.exec(`DELETE FROM public.certificates; DELETE FROM public.stage_progress; DELETE FROM public.quarterly_plans;
  UPDATE public.profiles SET name = 'DAÑADO', unit = 'tropa' WHERE id = '${U(3)}';
  INSERT INTO public.calendar_events (title, group_name) VALUES ('Evento cargado DESPUÉS del respaldo', 'Grupo Orión #84');`);
// 3. Restaurar con la misma lógica del script (aquí escribe en Postgres en vez de la API REST)
const sqlWriter = async (table, rows) => {
  const cols = Object.keys(rows[0]);
  const q = cols.map(c => `"${c}"`).join(', ');
  const upd = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
  await db.exec('SET ROLE service_role');
  try {
    await db.query(`INSERT INTO public.${table} (${q}) SELECT ${q} FROM json_populate_recordset(NULL::public.${table}, $1::json)
      ON CONFLICT (id) DO ${upd ? 'UPDATE SET ' + upd : 'NOTHING'}`, [JSON.stringify(rows)]);
  } finally { await db.exec('RESET ROLE'); }
};
const plan = planRestore(parseBackup(gz));
plan.tables.map(t => t.table).indexOf('profiles') < plan.tables.map(t => t.table).indexOf('certificates')
  ? ok('orden de restauración: perfiles antes que certificados') : bad('orden de restauración incorrecto');
const summary = await restoreBackup(plan, sqlWriter, { batchSize: 3 });
const restoreErrors = Object.entries(summary).flatMap(([t, s]) => s.errors.map(e => `${t}: ${e}`));
restoreErrors.length === 0 ? ok('la restauración no dio errores (los disparadores de seguridad no la bloquean)') : bad('errores al restaurar: ' + restoreErrors.slice(0, 3).join(' | '));
// 4. Comparar
let same = true;
for (const t of existing) {
  if (t === 'audit_log' || t === 'calendar_events') continue; // el historial suma lo que hizo la restauración; el evento nuevo se revisa abajo
  const now = await snapshot(t);
  if (JSON.stringify(now) !== JSON.stringify(before[t])) { same = false; bad(`«${t}» no quedó igual que en el respaldo (${now.length} vs ${before[t].length} filas)`); }
}
if (same) ok('certificados, etapas, planes y perfiles quedaron exactamente como en el respaldo');
const cal = (await db.query(`SELECT title FROM public.calendar_events`)).rows.map(r => r.title);
cal.includes('Evento cargado DESPUÉS del respaldo') ? ok('lo cargado después del respaldo NO se borra') : bad('la restauración borró datos nuevos');
before.calendar_events.every(j => cal.includes(JSON.parse(j).title)) ? ok('los eventos del respaldo están todos') : bad('faltan eventos del respaldo');
if (existing.includes('audit_log')) {
  const ids = new Set((await db.query(`SELECT id::text FROM public.audit_log`)).rows.map(r => r.id));
  backupTables.audit_log.every(r => ids.has(String(r.id))) ? ok('el historial del respaldo se conserva') : bad('se perdieron filas del historial');
}
// 5. Archivos que no son respaldos
let rejected = 0;
for (const junk of [Buffer.from('hola'), Buffer.from('{"otra":"cosa"}'), zlib.gzipSync(Buffer.from('[1,2]'))]) {
  try { parseBackup(junk); } catch { rejected++; }
}
rejected === 3 ? ok('rechaza archivos que no son respaldos') : bad('aceptó un archivo que no es respaldo');
RESTORE_ORDER.length >= BACKUP_TABLES.length && BACKUP_TABLES.every(t => RESTORE_ORDER.includes(t))
  ? ok('toda tabla que respalda api/backup.js tiene su lugar en el orden de restauración') : bad('hay tablas del respaldo sin orden de restauración');
await db.exec(`ALTER ROLE service_role NOBYPASSRLS;`);

console.log(fails ? `\n✘ ${fails} prueba(s) fallaron` : '\n✔ Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
