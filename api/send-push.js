const webpush = require('web-push');
const { getSupabase, getAdminSupabase, setCors, requireUser, parseBody } = require('./_auth');

const NATIONAL_ROLES = ['admin', 'nacional'];
const MAX_TITLE = 120;
const MAX_BODY = 500;

// ¿Puede quien envía notificar directamente a ese perfil? Mismo grupo, o su ámbito territorial.
function canReach(sender, receiver) {
  if (sender.group_name && receiver.group_name === sender.group_name) return true;
  if (sender.role === 'comisionado_regional' && sender.region && receiver.region === sender.region) return true;
  if (['comisionado_distrital', 'comisionado'].includes(sender.role) && sender.district && receiver.district === sender.district) return true;
  return false;
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Solo rutas de la propia app ("/algo"); nada de URLs externas ni "//otro-sitio".
function safeAppPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return '/';
  return url.slice(0, 300);
}

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

    // Quién envía: su propio perfil se lee con su token (lo permite RLS).
    const { data: sender } = await getSupabase(auth.accessToken)
      .from('profiles')
      .select('id, role, group_name, district, region')
      .eq('id', auth.user.id)
      .single();
    if (!sender) {
      return res.status(403).json({ error: 'Perfil no encontrado' });
    }
    const isNational = NATIONAL_ROLES.includes(sender.role);

    let subs = [];

    if (receiverId) {
      if (!isNational && receiverId !== sender.id) {
        const { data: receiver } = await supabase
          .from('profiles')
          .select('group_name, district, region')
          .eq('id', receiverId)
          .single();
        if (!receiver || !canReach(sender, receiver)) {
          return res.status(403).json({ error: 'No puedes notificar a ese usuario' });
        }
      }
      const { data: directSubs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', receiverId);
      subs = directSubs || [];
    } else {
      let userQuery = supabase.from('profiles').select('id');
      if (receiverRole) userQuery = userQuery.eq('role', receiverRole);
      if (isNational) {
        if (groupName) userQuery = userQuery.ilike('group_name', `%${escapeLike(groupName)}%`);
      } else {
        // Los envíos masivos de un no-nacional quedan dentro de su propio grupo.
        if (!sender.group_name) {
          return res.status(403).json({ error: 'Sin grupo asignado' });
        }
        userQuery = userQuery.eq('group_name', sender.group_name);
      }
      if (unit) userQuery = userQuery.ilike('unit', `%${escapeLike(unit)}%`);
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
      title: String(title || 'Plan Progresivo Scout ⚜️').slice(0, MAX_TITLE),
      body: String(message || 'Tienes una nueva actualización en tu Plan Progresivo.').slice(0, MAX_BODY),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `scout_push_${Date.now()}`,
      url: safeAppPath(url),
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
