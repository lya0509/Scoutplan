// Aviso al teléfono de «Cuenta por aprobar». Lo llama la app justo después de registrarse.
// No elige destinatarios: avisa SOLO a quienes la base de datos ya notificó en la campanita
// (disparador avisar_cuenta_pendiente) en los últimos 15 minutos, y solo si la cuenta de
// quien llama está en revisión. Repetir la llamada no acumula avisos (misma etiqueta).
const webpush = require('web-push');
const { getAdminSupabase, setCors, requireUser, serviceKeyStatus } = require('./_auth');

const VAPID_PUBLIC = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@scoutplan.app';
if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

module.exports = async (req, res) => {
  setCors(req, res);
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return res.status(401).json({ error: 'login_required' });
  if (serviceKeyStatus() !== 'ok') return res.status(503).json({ error: 'not_configured' });
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return res.status(200).json({ success: true, count: 0, note: 'sin VAPID' });

  const admin = getAdminSupabase();
  try {
    const { data: me } = await admin.from('profiles')
      .select('id, name, unit, group_name, account_status').eq('id', auth.user.id).single();
    if (!me || me.account_status !== 'pending' || !me.name) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: notes } = await admin.from('scout_notifications')
      .select('scout_id, title, reason')
      .like('title', '🕓 Cuenta por aprobar%')
      .like('reason', `${me.name.replace(/[\\%_]/g, (c) => `\\${c}`)} se registró%`)
      .gte('created_at', since);
    const ids = Array.from(new Set((notes || []).map((n) => n.scout_id))).filter(Boolean);
    if (!ids.length) return res.status(200).json({ success: true, count: 0 });

    const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', ids);
    const payload = JSON.stringify({
      title: '🕓 Cuenta por aprobar',
      body: `${me.name} se registró en ${(me.unit || '').toUpperCase() || 'el grupo'} de ${me.group_name}. Toca para revisarla.`.slice(0, 300),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `pending_${me.id}`,
      url: '/',
    });
    let sent = 0;
    await Promise.allSettled((subs || []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { urgency: 'high', TTL: 86400 });
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }));
    return res.status(200).json({ success: true, count: sent });
  } catch (err) {
    console.error('pending-push:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
