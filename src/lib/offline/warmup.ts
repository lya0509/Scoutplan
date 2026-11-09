// Precarga para usar la app SIN internet.
//
// Cada pantalla guarda una copia de sus datos cuando se abre con internet (cachedQuery).
// El problema: una pantalla que nunca se abrió con internet salía vacía sin conexión.
// Aquí, apenas hay internet y sesión, se piden en segundo plano los datos de TODAS las
// pantallas del usuario, así quedan guardados en el teléfono aunque no las haya abierto.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataService } from '../dataService';
import { programaService } from '../programaService';
import { loadCalendarEvents } from '../calendarData';
import { isOnline } from './net';

const LAST_RUN_KEY = '@scout_warmup_at_';
/** No repetir la precarga completa más de una vez cada 10 minutos. */
const MIN_INTERVAL_MS = 10 * 60 * 1000;

interface WarmupUser {
  id: string;
  role?: string | null;
  unit?: string | null;
  group_name?: string | null;
}

let running: Promise<void> | null = null;

function currentQuarter(d = new Date()) {
  return { quarter: `Q${Math.floor(d.getMonth() / 3) + 1}`, year: d.getFullYear() };
}

export function warmOfflineData(user: WarmupUser | null | undefined, opts: { force?: boolean } = {}): Promise<void> {
  if (!user?.id || !isOnline()) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    try {
      const key = LAST_RUN_KEY + user.id;
      if (!opts.force) {
        const last = Number(await AsyncStorage.getItem(key).catch(() => null)) || 0;
        if (Date.now() - last < MIN_INTERVAL_MS) return;
      }

      const id = user.id;
      const group = user.group_name || '';
      const unit = (user.unit || 'clan').toLowerCase();
      const { quarter, year } = currentQuarter();

      // Cada tarea guarda su propia copia; si una falla, las demás siguen.
      const tasks: (() => Promise<unknown>)[] = [
        // Plan Progresivo, etapas y requisitos
        () => dataService.getAllStageStatuses(id),
        () => dataService.getStageDates(id),
        () => dataService.getRequirementRows(id),
        () => dataService.getProgressForAllStages(id),
        () => dataService.getCompletedCatalogActivityIds(id),
        // Certificados y registros de cada requisito (noches, vida de grupo, CIP, vínculos)
        () => dataService.getCertificates(id),
        () => dataService.getAllLinkedCertificates(id),
        () => dataService.getCipCatalog(),
        // Perfil completo: Ficha Médica y Currículum
        () => dataService.getProfileRow(id),
        // Plan Trimestral de la unidad (trimestre actual) e historial
        () => dataService.getUnitSharedQuarterlyPlan(group, unit, quarter, year),
        () => dataService.getQuarterlyPlan(id, quarter, year),
        () => dataService.getQuarterlyPlansHistory(id, group || undefined, unit),
        // Programas de Actividades, Calendario y compañeros de la unidad
        () => programaService.getProgramas(),
        () => loadCalendarEvents(user),
        () => dataService.getUnitRoversDirectory(group, unit),
      ];

      let failures = 0;
      // De a pocas para no saturar una conexión lenta
      for (let i = 0; i < tasks.length; i += 4) {
        const results = await Promise.allSettled(tasks.slice(i, i + 4).map(t => t()));
        failures += results.filter(r => r.status === 'rejected').length;
        if (!isOnline()) return; // se cayó la conexión a mitad: reintentar en la próxima
      }
      if (failures < tasks.length) await AsyncStorage.setItem(key, String(Date.now())).catch(() => {});
    } catch (e) {
      console.warn('[warmup] Precarga offline incompleta:', e);
    } finally {
      running = null;
    }
  })();
  return running;
}
