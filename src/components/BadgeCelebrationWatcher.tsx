// Vigila las etapas del scout y, cuando el Scouter le aprueba una insignia que todavía no vio
// celebrada en este teléfono, muestra la celebración (src/lib/celebration.web.ts). La máxima
// insignia de la rama (última etapa; en el Clan, Rover Ciudadano) tiene su versión especial.
// Revisa al abrir la app, al llegar un aviso de insignia y al volver a la app.
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { dataService } from '../lib/dataService';
import { getStagesForUnit } from '../data/unitTemplates';
import { planCelebrations, isMaxBadge } from '../utils/badgeCelebration';
import { showBadgeCelebration } from '../lib/celebration';
import { STAGE_COLORS } from '../theme/stageColors';
import { BADGE_IMAGES } from './StageBadgeIcon';

const seenKey = (userId: string) => `@scout_celebrated_stages_${userId}`;

export default function BadgeCelebrationWatcher() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const running = useRef(false);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (Platform.OS !== 'web' || !user?.id || user.role !== 'scout') return;
    if (user.account_status === 'pending' || user.account_status === 'rejected') return;
    // Pruebas automáticas: no tapar la pantalla (se prueba aparte con uiTestHelpers.celebrate)
    if (typeof navigator !== 'undefined' && (navigator as any).webdriver) return;
    if (running.current) return;
    running.current = true;
    lastCheck.current = Date.now();
    try {
      const { stages, unit } = getStagesForUnit(user.unit);
      const order = stages.map(s => s.id);
      const statuses = await dataService.getAllStageStatuses(user.id);
      const raw = await AsyncStorage.getItem(seenKey(user.id)).catch(() => null);
      let seen: string[] | null = null;
      try { seen = raw ? JSON.parse(raw) : null; } catch { seen = null; }
      const dates = seen === null ? await dataService.getStageDates(user.id) : {};
      const plan = planCelebrations(statuses, seen, dates, order);
      if (plan.seen === null) return;

      let current = plan.seen;
      await AsyncStorage.setItem(seenKey(user.id), JSON.stringify(current)).catch(() => {});
      for (const stageId of plan.toCelebrate) {
        // Se marca como vista al mostrarla: no se repite aunque se recargue a la mitad
        current = [...current, stageId];
        await AsyncStorage.setItem(seenKey(user.id), JSON.stringify(current)).catch(() => {});
        const idx = order.indexOf(stageId);
        await showBadgeCelebration({
          title: stages[idx]?.title || stageId,
          color: STAGE_COLORS[stageId] || '#7c3aed',
          badge: BADGE_IMAGES[stageId],
          isMax: isMaxBadge(stageId, order),
          unitLabel: unit?.label || 'Clan',
          nextTitle: idx >= 0 ? stages[idx + 1]?.title : undefined,
        });
      }
    } catch (e) {
      console.warn('Celebración de insignias: no se pudo revisar', e);
    } finally {
      running.current = false;
    }
  }, [user?.id, user?.role, user?.unit, user?.account_status]);

  // Al abrir la app / iniciar sesión
  useEffect(() => { check(); }, [check]);

  // Cuando llega un aviso de insignia (el Scouter aprobó con la app abierta)
  const latestBadgeId = notifications.find(n => n.type === 'badge')?.id;
  useEffect(() => { if (latestBadgeId) check(); }, [latestBadgeId, check]);

  // Al volver a la app (estaba en segundo plano)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > 20000) check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  return null;
}
