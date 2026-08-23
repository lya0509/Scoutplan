const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseAnonKey = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOperations() {
  console.log('Testing scout_programas upsert and select...');
  const testId = `test_prog_${Date.now()}`;
  const { data: upsertData, error: upsertErr } = await supabase.from('scout_programas').upsert({
    id: testId,
    title: 'Programa de Prueba Automatizada',
    date: '2026-08-23',
    location: 'Parque Nacional El Ávila',
    activity_type: 'Reunión de Unidad',
    unit: 'clan',
    is_sinodal: false,
    selected_units: ['clan'],
    participant_projection: '12 Rovers',
    general_objective: 'Probar conectividad de base de datos',
    specific_objectives: ['Verificar escritura', 'Verificar lectura'],
    specific_metas: ['100% de éxito'],
    selected_sdgs: [1, 2, 3],
    indicators: {
      corporalidad: ['Ind 1'],
      creatividad: [],
      caracter: [],
      afectividad: [],
      sociabilidad: [],
      espiritualidad: []
    },
    schedule: [{ time: '08:00', activity: 'Apertura e Izada', responsible: 'Jefe Clan' }],
    important_notes: 'Nota de prueba',
    registration_badge_id: 'reg_2026',
    creator_name: 'Robot Auditor',
    group_name: 'Grupo Scout Orión #84',
    updated_at: new Date().toISOString()
  }).select().single();

  if (upsertErr) {
    console.error('❌ Error guardando en scout_programas:', upsertErr);
  } else {
    console.log('✅ Programa guardado con éxito en Supabase:', upsertData.title, '(ID:', upsertData.id, ')');
  }

  // Leerlo de vuelta
  const { data: fetchProg, error: fetchErr } = await supabase.from('scout_programas').select('*').eq('id', testId).single();
  if (fetchErr) {
    console.error('❌ Error leyendo de scout_programas:', fetchErr);
  } else {
    console.log('✅ Programa recuperado de la BD con éxito:', fetchProg.title, 'Fecha:', fetchProg.date, 'Ubicación:', fetchProg.location);
  }

  // Eliminarlo
  const { error: delErr } = await supabase.from('scout_programas').delete().eq('id', testId);
  if (delErr) console.error('❌ Error borrando:', delErr);
  else console.log('✅ Programa de prueba eliminado correctamente.');

  // Probar quarterly_plans
  console.log('\nTesting quarterly_plans upsert and select...');
  const testPlanId = `test_plan_${Date.now()}`;
  const { data: planData, error: planErr } = await supabase.from('quarterly_plans').upsert({
    id: testPlanId,
    unit: 'tropa',
    year: 2026,
    quarter: 3,
    months_data: [
      { name: 'Julio', activities: [{ day: 5, title: 'Prueba', type: 'tropa' }] }
    ],
    group_name: 'Grupo Scout Orión #84',
    status: 'Borrador'
  }).select().single();

  if (planErr) {
    console.error('❌ Error guardando en quarterly_plans:', planErr);
  } else {
    console.log('✅ Plan trimestral guardado con éxito en Supabase:', planData.id);
  }

  // Leerlo
  const { data: readPlan, error: readPlanErr } = await supabase.from('quarterly_plans').select('*').eq('id', testPlanId).single();
  if (readPlanErr) {
    console.error('❌ Error leyendo de quarterly_plans:', readPlanErr);
  } else {
    console.log('✅ Plan trimestral recuperado con éxito:', readPlan.unit, 'Trimestre:', readPlan.quarter);
  }

  // Eliminar
  await supabase.from('quarterly_plans').delete().eq('id', testPlanId);
  console.log('✅ Plan trimestral de prueba eliminado.');
}

testOperations().catch(console.error);
