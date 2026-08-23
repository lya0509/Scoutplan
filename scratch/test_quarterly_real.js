const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseAnonKey = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealQuarterly() {
  // 1. Obtener un scout real de profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, name, group_name').limit(1);
  if (pErr || !profiles || profiles.length === 0) {
    console.log('No profiles found to test with.');
    return;
  }
  const testScout = profiles[0];
  console.log(`Usando perfil de prueba: ${testScout.name} (${testScout.id})`);

  // 2. Insertar plan trimestral real
  const planPayload = {
    scout_id: testScout.id,
    quarter: 'Q3',
    year: 2026,
    elaborated_by: testScout.name,
    goals: 'Objetivo de prueba automatizada',
    general_objectives: 'Objetivo de prueba automatizada',
    trimestre_goals: 'Meta 1, Meta 2',
    specific_objectives: 'Obj específico 1',
    educational_areas: { corporalidad: true, creatividad: true, afectividad: true, espiritualidad: true, caracter: true, sociabilidad: true },
    monthly_activities: [{ id: '1', month: 'Julio', day: '12', activity: 'Actividad Real', place: 'Sede Scout', responsible: 'Dirigente' }],
    status: 'Enviado'
  };

  console.log('Insertando plan trimestral en Supabase...');
  const { data: insData, error: insErr } = await supabase
    .from('quarterly_plans')
    .insert(planPayload)
    .select()
    .single();

  if (insErr) {
    console.error('❌ Error en insert quarterly_plans:', insErr);
  } else {
    console.log('✅ Plan trimestral guardado con ÉXITO en Supabase. ID:', insData.id);

    // 3. Consultar plan trimestral
    const { data: readData, error: readErr } = await supabase
      .from('quarterly_plans')
      .select('*')
      .eq('id', insData.id)
      .single();

    if (readErr) {
      console.error('❌ Error leyendo plan:', readErr);
    } else {
      console.log('✅ Plan recuperado de Supabase con éxito:');
      console.log('   - Elaborado por:', readData.elaborated_by);
      console.log('   - Trimestre:', readData.quarter, readData.year);
      console.log('   - Actividades:', readData.monthly_activities?.length);
    }

    // 4. Limpiar
    await supabase.from('quarterly_plans').delete().eq('id', insData.id);
    console.log('✅ Plan de prueba limpiado correctamente.');
  }
}

testRealQuarterly().catch(console.error);
