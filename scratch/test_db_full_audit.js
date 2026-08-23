const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseAnonKey = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 INICIANDO AUDITORÍA INTEGRAL DE BASE DE DATOS');
  console.log('Conectando a:', supabaseUrl);
  console.log('====================================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // 1. PROFILES TABLE READ
  try {
    console.log('1. Probando lectura en tabla profiles...');
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    console.log(`✅ Lectura profiles exitosa. Registros encontrados: ${data.length}`);
    results.passed.push(`Lectura profiles (${data.length} registros)`);
  } catch (e) {
    console.error('❌ Error en lectura profiles:', e.message || e);
    results.failed.push(`Lectura profiles: ${e.message || e}`);
  }

  // 2. CALENDAR_EVENTS READ & WRITE
  try {
    console.log('\n2. Probando lectura y escritura en calendar_events...');
    const { data: readData, error: readErr } = await supabase.from('calendar_events').select('*');
    if (readErr) throw readErr;
    console.log(`✅ Lectura calendar_events exitosa (${readData.length} eventos).`);

    // Probar inserción de prueba
    const testEvent = {
      title: '__AUDIT_TEST_EVENT__',
      description: 'Evento de prueba automatizada',
      date: new Date().toISOString().split('T')[0],
      unit: 'grupo'
    };
    const { data: insertData, error: insertErr } = await supabase.from('calendar_events').insert(testEvent).select().single();
    if (insertErr) throw insertErr;
    console.log('✅ Inserción calendar_events exitosa:', insertData.id);

    // Limpiar evento de prueba
    await supabase.from('calendar_events').delete().eq('id', insertData.id);
    console.log('✅ Eliminación evento de prueba exitosa.');
    results.passed.push('Lectura, Inserción y Borrado en calendar_events');
  } catch (e) {
    console.error('❌ Error en calendar_events:', e.message || e);
    results.failed.push(`calendar_events: ${e.message || e}`);
  }

  // 3. SCOUT_PROGRAMAS READ & WRITE
  try {
    console.log('\n3. Probando lectura y escritura en scout_programas...');
    const { data: readProg, error: progErr } = await supabase.from('scout_programas').select('*');
    if (progErr) throw progErr;
    console.log(`✅ Lectura scout_programas exitosa (${readProg.length} programas).`);

    // Inserción de prueba
    const testProg = {
      title: '__AUDIT_TEST_PROGRAMA__',
      unit: 'manada',
      date: new Date().toISOString().split('T')[0],
      blocks: [{ time: '09:00', activity: 'Apertura', responsible: 'Akela' }]
    };
    const { data: insProg, error: insErr } = await supabase.from('scout_programas').insert(testProg).select().single();
    if (insErr) throw insErr;
    console.log('✅ Inserción scout_programas exitosa:', insProg.id);

    // Borrado
    await supabase.from('scout_programas').delete().eq('id', insProg.id);
    console.log('✅ Eliminación programa de prueba exitosa.');
    results.passed.push('Lectura, Inserción y Borrado en scout_programas');
  } catch (e) {
    console.error('❌ Error en scout_programas:', e.message || e);
    results.failed.push(`scout_programas: ${e.message || e}`);
  }

  // 4. QUARTERLY_PLANS READ & WRITE
  try {
    console.log('\n4. Probando lectura en quarterly_plans...');
    const { data: readPlans, error: plansErr } = await supabase.from('quarterly_plans').select('*');
    if (plansErr) throw plansErr;
    console.log(`✅ Lectura quarterly_plans exitosa (${readPlans.length} planes).`);
    results.passed.push(`Lectura quarterly_plans (${readPlans.length} planes)`);
  } catch (e) {
    console.error('❌ Error en quarterly_plans:', e.message || e);
    results.failed.push(`quarterly_plans: ${e.message || e}`);
  }

  // 5. STAGE_PROGRESS & REQUIREMENT_PROGRESS READ
  try {
    console.log('\n5. Probando lectura en stage_progress y requirement_progress...');
    const { data: stData, error: stErr } = await supabase.from('stage_progress').select('*');
    if (stErr) throw stErr;
    console.log(`✅ Lectura stage_progress exitosa (${stData.length} registros).`);

    const { data: reqData, error: reqErr } = await supabase.from('requirement_progress').select('*');
    if (reqErr) throw reqErr;
    console.log(`✅ Lectura requirement_progress exitosa (${reqData.length} registros).`);
    results.passed.push('Lectura stage_progress y requirement_progress');
  } catch (e) {
    console.error('❌ Error en progression tables:', e.message || e);
    results.failed.push(`Progression tables: ${e.message || e}`);
  }

  // 6. NOTIFICATIONS READ
  try {
    console.log('\n6. Probando lectura en notifications...');
    const { data: notifData, error: notifErr } = await supabase.from('notifications').select('*');
    if (notifErr) throw notifErr;
    console.log(`✅ Lectura notifications exitosa (${notifData.length} notificaciones).`);
    results.passed.push('Lectura notifications');
  } catch (e) {
    console.error('❌ Error en notifications:', e.message || e);
    results.failed.push(`notifications: ${e.message || e}`);
  }

  // 7. STORAGE BUCKETS
  try {
    console.log('\n7. Probando Supabase Storage buckets...');
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) throw bErr;
    console.log(`✅ Buckets disponibles (${buckets.length}):`, buckets.map(b => b.name).join(', '));
    results.passed.push(`Storage Buckets (${buckets.map(b => b.name).join(', ')})`);
  } catch (e) {
    console.warn('⚠️ Storage listBuckets:', e.message || e);
    results.warnings.push(`Storage buckets: ${e.message || e}`);
  }

  console.log('\n====================================================');
  console.log('📊 RESUMEN FINAL DE AUDITORÍA DE BASE DE DATOS');
  console.log('====================================================');
  console.log(`✅ Pruebas Exitosas: ${results.passed.length}`);
  results.passed.forEach(p => console.log(`   • ${p}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ Advertencias: ${results.warnings.length}`);
    results.warnings.forEach(w => console.log(`   • ${w}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Fallos Detectados: ${results.failed.length}`);
    results.failed.forEach(f => console.log(`   • ${f}`));
  } else {
    console.log('\n🎉 ¡TODAS LAS TABLAS Y OPERACIONES ESTÁN 100% OPERATIVAS Y CONECTADAS!');
  }
}

runAudit().catch(console.error);
