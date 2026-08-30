const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vumijajwmhvvzissrqbv.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4OFAGKEFxeT7JpsS5__Fvg_x_lTK-GO';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const VAPID_PUBLIC = 'BKI-1dAzf2KYpi_pK4yrLEBeVE21dNkmMZvNmqi_DzMNDvQ765LxwSc0-J2qvTUcK428jGIvPc_4I3yTUm-uFf4';
const VAPID_PRIVATE = 'T0AG7UHD8QLWi2s7RkK3rMrIZmZf4yK6Jc0JvNyf19E';
const VAPID_SUBJECT = 'mailto:admin@scoutplan.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
          payload
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
