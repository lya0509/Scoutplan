// Recordatorio automático de membresía (lo dispara el Cron de Vercel una vez al día).
// Avisa a 30 y a 7 días del vencimiento:
//   - al propio miembro (aviso en la app + notificación push),
//   - a los Scouters de su misma rama y grupo (un solo aviso con todos los nombres;
//     si la rama no tiene Scouter, a la Jefatura),
//   - si quien vence es un Scouter, al Jefe de Grupo.
// Si se ejecuta dos veces el mismo día no repite avisos (se revisa lo ya enviado en 20 h).
const webpush = require('web-push');
const { getAdminSupabase } = require('./_auth');

const DAYS = [30, 7];
const VAPID_PUBLIC = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@scoutplan.app';
const pushReady = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (pushReady) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

// Fecha de Venezuela (UTC-4) en AAAA-MM-DD, desplazada `add` días.
function dayCaracas(add = 0) {
  return new Date(Date.now() - 4 * 3600 * 1000 + add * 86400000).toISOString().slice(0, 10);
}
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
const fmt = (d) => d.split('-').reverse().join('/');
const norm = (s) => String(s || '').trim().toLowerCase();

async function alreadySent(db, userId, title) {
  const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const { data } = await db
    .from('scout_notifications')
    .select('id')
    .eq('scout_id', userId)
    .eq('title', title)
    .gte('created_at', since)
    .limit(1);
  return Boolean(data && data.length);
}

async function notify(db, userId, title, message, stats) {
  if (await alreadySent(db, userId, title)) {
    stats.skipped++;
    return;
  }
  const { error } = await db.from('scout_notifications').insert({ scout_id: userId, title, reason: message, is_read: false });
  if (error) {
    console.warn('No se pudo guardar el aviso:', error.message);
    stats.errors++;
    return;
  }
  stats.notified++;
  if (!pushReady) return;
  const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId);
  const payload = JSON.stringify({
    title, body: message, icon: '/icon-192.png', badge: '/icon-192.png',
    tag: `membresia_${userId}_${dayCaracas()}`, url: '/', data: { type: 'membership' },
  });
  await Promise.allSettled((subs || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      stats.pushes++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }));
}

module.exports = async function handler(req, res) {
  // Vercel envía "Authorization: Bearer <CRON_SECRET>" cuando esa variable existe.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'not_configured' });
  }

  const db = getAdminSupabase();
  const today = dayCaracas();
  const stats = { today, expiring: 0, notified: 0, skipped: 0, pushes: 0, errors: 0 };

  try {
    const maxDay = Math.max(...DAYS);
    const { data: expiring, error } = await db
      .from('profiles')
      .select('id, name, role, unit, group_name, membership_expires_at')
      .eq('membership_status', 'approved')
      .gte('membership_expires_at', today)
      .lt('membership_expires_at', dayCaracas(maxDay + 1));
    if (error) throw error;

    const due = (expiring || [])
      .map((p) => ({ ...p, expires: String(p.membership_expires_at).slice(0, 10) }))
      .map((p) => ({ ...p, days: daysBetween(today, p.expires) }))
      .filter((p) => DAYS.includes(p.days));
    stats.expiring = due.length;
    if (!due.length) return res.status(200).json(stats);

    // 1. Aviso al propio miembro
    for (const p of due) {
      const title = p.days === 7 ? 'Tu membresía ASV vence en 7 días' : 'Tu membresía ASV vence en 30 días';
      const message = `Tu carnet vence el ${fmt(p.expires)}. Renueva el pago con la ASV y registra la nueva fecha en la app para que tu Jefatura la apruebe.`;
      await notify(db, p.id, title, message, stats);
    }

    // 2. Aviso agrupado a los responsables (Scouters de la rama; Jefe de Grupo para los Scouters)
    const groups = [...new Set(due.map((p) => p.group_name).filter(Boolean))];
    if (groups.length) {
      const { data: leaders } = await db
        .from('profiles')
        .select('id, role, unit, group_name')
        .in('role', ['scouter', 'jefe_grupo'])
        .in('group_name', groups);

      const inbox = new Map(); // leaderId -> { days -> [nombres] }
      const add = (leaderId, p) => {
        if (leaderId === p.id) return;
        if (!inbox.has(leaderId)) inbox.set(leaderId, new Map());
        const byDay = inbox.get(leaderId);
        if (!byDay.has(p.days)) byDay.set(p.days, []);
        byDay.get(p.days).push(p.name || 'Un miembro');
      };
      for (const p of due) {
        const sameGroup = (leaders || []).filter((l) => norm(l.group_name) === norm(p.group_name));
        if (p.role === 'scout') {
          const scouters = sameGroup.filter((l) => l.role === 'scouter' && norm(l.unit) === norm(p.unit));
          // Rama sin Scouter registrado: el aviso va a la Jefatura
          (scouters.length ? scouters : sameGroup.filter((l) => l.role === 'jefe_grupo')).forEach((l) => add(l.id, p));
        } else if (p.role === 'scouter') {
          sameGroup.filter((l) => l.role === 'jefe_grupo').forEach((l) => add(l.id, p));
        }
      }
      for (const [leaderId, byDay] of inbox) {
        for (const [days, names] of byDay) {
          const title = `Membresías por vencer en ${days} días`;
          const list = names.length > 6 ? `${names.slice(0, 6).join(', ')} y ${names.length - 6} más` : names.join(', ');
          const message = names.length === 1
            ? `La membresía de ${list} vence en ${days} días. Recuérdale renovarla.`
            : `Vencen en ${days} días las membresías de: ${list}. Recuérdales renovarlas.`;
          await notify(db, leaderId, title, message, stats);
        }
      }
    }

    return res.status(200).json(stats);
  } catch (e) {
    console.error('membership-reminders:', e && e.message);
    return res.status(500).json({ ...stats, error: 'server_error' });
  }
};
