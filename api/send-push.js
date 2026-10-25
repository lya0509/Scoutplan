const webpush = require('web-push');
const { getAdminSupabase, setCors, requireUser, parseBody } = require('./_auth');

// Las claves VAPID viven SOLO en las variables de entorno de Vercel.
const VAPID_PUBLIC = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@scoutplan.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'Claves VAPID no configuradas en el servidor' });
  }

  // Solo usuarios con sesión iniciada pueden enviar notificaciones.
  const auth = await requireUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const supabase = getAdminSupabase();

  try {
    const body = parseBody(req);
    const { receiverId, groupName, unit, receiverRole, title, message, url, data } = body || {};

    let subs = [];

    if (receiverId) {
      const { data: directSubs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', receiverId);
      subs = directSubs || [];
    } else {
      let userQuery = supabase.from('profiles').select('id');
      if (receiverRole) userQuery = userQuery.eq('role', receiverRole);
      if (groupName) userQuery = userQuery.ilike('group_name', `%${groupName}%`);
      if (unit) userQuery = userQuery.ilike('unit', `%${unit}%`);
      const { data: users } = await userQuery;

      if (users && users.length > 0) {
        const ids = users.map(u => u.id);
        const { data: groupSubs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('user_id', ids);
        subs = groupSubs || [];
      }
    }

    if (!subs || subs.length === 0) {
      return res.status(200).json({ success: true, count: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'Plan Progresivo Scout ⚜️',
      body: message || 'Tienes una nueva actualización en tu Plan Progresivo.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `scout_push_${Date.now()}`,
      url: url || '/',
      data: data || {}
    });

    let sent = 0;
    const sendPromises = subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: {
              p256dh: s.p256dh,
              auth: s.auth
            }
          },
          payload,
          {
            urgency: 'high',
            TTL: 86400
          }
        );
        sent++;
      } catch (err) {
        console.warn('Push dispatch error for endpoint:', s.endpoint, err.statusCode);
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return res.status(200).json({ success: true, count: sent });
  } catch (err) {
    console.error('Error dispatching push in API:', err);
    return res.status(500).json({ error: err.message });
  }
};
