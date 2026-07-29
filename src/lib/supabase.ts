import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Usaremos variables de entorno en producción.
// Para el desarrollo y simulación rápida, dejamos unos placeholders o la URL de un proyecto Supabase de prueba si existiera.
// Al ser un prototipo con atajo de desarrollador (login simulado local), 
// podemos usar el propio AsyncStorage o mockear este cliente si no hay credenciales reales aún.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
