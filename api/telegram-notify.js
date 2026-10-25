// Envía sugerencias y reportes de error al chat de Telegram del equipo.
// El token del bot vive SOLO en las variables de entorno de Vercel.
const { setCors, requireUser, parseBody } = require('./_auth');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const MAX_TEXT = 3500; // Telegram admite 4096 caracteres en mensajes y 1024 en pies de foto.

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ error: 'Telegram no configurado en el servidor' });
  }

  const auth = await requireUser(req);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  try {
    const { text, photoUrl, photoDataUrl } = parseBody(req);
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Falta el texto' });
    }
    const message = text.slice(0, MAX_TEXT);
    const api = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    let tgRes;

    if (typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:image')) {
      const [meta, b64] = photoDataUrl.split(',');
      const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png';
      const form = new FormData();
      form.append('chat_id', TELEGRAM_CHAT_ID);
      form.append('caption', message.slice(0, 1024));
      form.append('parse_mode', 'Markdown');
      form.append('photo', new Blob([Buffer.from(b64, 'base64')], { type: mime }), 'evidencia_fallo.png');
      tgRes = await fetch(`${api}/sendPhoto`, { method: 'POST', body: form });
    } else if (typeof photoUrl === 'string' && photoUrl.startsWith('https://')) {
      tgRes = await fetch(`${api}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: photoUrl,
          caption: message.slice(0, 1024),
          parse_mode: 'Markdown',
        }),
      });
    } else {
      tgRes = await fetch(`${api}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }),
      });
    }

    if (!tgRes.ok) {
      console.warn('Telegram respondió', tgRes.status);
      return res.status(502).json({ error: 'No se pudo enviar a Telegram' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error enviando a Telegram:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};
