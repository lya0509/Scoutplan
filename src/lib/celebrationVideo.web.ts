// Video MP4 de la celebración de una insignia, con el nombre del scout, para descargar o compartir.
// Se crea en el propio teléfono (nada se sube a ningún servidor): la escena se dibuja cuadro a
// cuadro en un <canvas> y se codifica a MP4 (H.264) con mediabunny / WebCodecs. Si el navegador no
// tiene WebCodecs, se graba en tiempo real con MediaRecorder (WebM o MP4, según el navegador).
// Formato vertical 720×1280 (estados de WhatsApp, historias).
// @ts-ignore: módulo interno de react-native-web; el mismo que usa <Image> para hallar la URL
import { getAssetByID } from 'react-native-web/dist/modules/AssetRegistry';
import { LOGO_BOX, LOGO_ROPE, LOGO_FLEUR, LOGO_KNOT } from './scoutLogoPaths';

export interface CelebrationVideoOptions {
  title: string;
  color: string;
  badge: any;
  isMax: boolean;
  /** Nombre del scout («Juan Laya»). */
  name: string;
  groupName?: string;
  unitLabel?: string;
  /** «13 de noviembre de 2026». */
  dateText?: string;
  nextTitle?: string;
}

const W = 720;
const H = 1280;
const FPS = 30;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ---------- utilidades ----------
function assetUri(src: any): string {
  try {
    if (typeof src === 'number') {
      const a = getAssetByID(src);
      return a ? `${a.httpServerLocation}/${a.name}.${a.type}` : '';
    }
    if (typeof src === 'string') return src;
    return src?.uri || src?.default || '';
  } catch {
    return '';
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Números al azar repetibles: el video sale igual cada vez. */
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const prog = (t: number, start: number, dur: number) => clamp01((t - start) / dur);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Interpola entre puntos clave [[momento 0–1, valor]] con suavizado entre cada par. */
function keys(x: number, pts: [number, number][]) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, v0] = pts[i - 1];
      const [x1, v1] = pts[i];
      return lerp(v0, v1, easeInOut((x - x0) / (x1 - x0)));
    }
  }
  return pts[pts.length - 1][1];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Ajusta el tamaño de letra para que el texto quepa en el ancho. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let s = size;
  for (; s > 18; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return s;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  try { (ctx as any).letterSpacing = `${px}px`; } catch { /* navegador sin letterSpacing */ }
}

// ---------- escena ----------
type Draw = (ctx: CanvasRenderingContext2D, t: number) => void;

function buildScene(o: CelebrationVideoOptions, badge: HTMLImageElement | null): { draw: Draw; duration: number } {
  const max = o.isMax;
  const rnd = seeded(max ? 84 : 7);
  const r = (a: number, b: number) => a + rnd() * (b - a);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const duration = max ? 8.5 : 6;
  const gold = ['#ffd76a', '#ffe9a8', '#f5b73b', '#fff6d6', '#ffffff'];
  const colors = max ? [...gold, '#c084fc', o.color] : [o.color, '#ffffff', '#ffd76a', '#c084fc', '#60a5fa', '#34d399'];

  const cx = W / 2;
  const cy = max ? 455 : 470;
  const size = max ? 330 : 300;

  // Rayos de luz: se dibujan una vez y luego solo se giran
  const R = 560;
  const rays = document.createElement('canvas');
  rays.width = rays.height = R * 2;
  {
    const g = rays.getContext('2d')!;
    const layer = (n: number, width: number, col: string, off: number) => {
      g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        g.beginPath();
        g.moveTo(R, R);
        g.arc(R, R, R, a, a + width);
        g.closePath();
        g.fill();
      }
    };
    layer(18, 0.12, max ? 'rgba(255,205,90,0.38)' : 'rgba(255,255,255,0.17)', 0);
    if (max) layer(14, 0.06, 'rgba(255,240,190,0.25)', 0.2);
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(R, R, 0, R, R, R);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(0.16, 'rgba(0,0,0,1)');
    m.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.fillStyle = m;
    g.fillRect(0, 0, R * 2, R * 2);
  }

  // Confeti que sale disparado desde la insignia
  const burstAt = max ? 1.0 : 0.42;
  const confetti = Array.from({ length: max ? 120 : 110 }, () => {
    const ang = r(0, Math.PI * 2);
    const sp = r(420, 1050);
    const w = r(10, 18);
    const round = rnd() < 0.3;
    return {
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.85 - r(80, 260),
      w: round ? w * 0.85 : w, h: round ? w * 0.85 : w * r(0.4, 0.6), round,
      col: pick(colors), rot: r(0, 6.3), vr: r(-9, 9), flip: r(4, 10),
      delay: r(0, 0.12), life: r(2.4, 3.4),
    };
  });

  // Fuegos artificiales (solo la máxima)
  const fireworks: { x: number; y: number; t0: number; col: string; sparks: { a: number; s: number; white: boolean }[] }[] = [];
  if (max) {
    const spots = [[0.22, 0.17], [0.78, 0.13], [0.5, 0.08], [0.15, 0.33], [0.85, 0.3], [0.33, 0.11], [0.67, 0.24]];
    [0.9, 4.4].forEach(start => spots.forEach(([fx, fy], i) => {
      fireworks.push({
        x: W * fx + r(-25, 25), y: H * fy + r(-20, 20), t0: start + i * 0.45,
        col: pick(gold.concat(['#c084fc', '#f472b6'])),
        sparks: Array.from({ length: 26 }, (_, k) => ({ a: (k / 26) * Math.PI * 2 + r(-0.08, 0.08), s: r(150, 230), white: rnd() < 0.25 })),
      });
    }));
  }
  const rain = max ? Array.from({ length: 70 }, () => ({
    x: r(0, W), t0: r(1.2, 7), dur: r(2.6, 4.2), w: r(10, 16), h: r(5, 8), col: pick(gold), sway: r(10, 40), ph: r(0, 6.3), flip: r(5, 9),
  })) : [];
  const stars = max ? Array.from({ length: 18 }, () => ({ x: r(30, W - 30), y: r(40, H - 200), t0: r(0.6, 3), per: r(1.6, 2.8), s: r(10, 20) })) : [];

  const logo = {
    rope: new Path2D(LOGO_ROPE),
    fleur: new Path2D(LOGO_FLEUR),
    knot: LOGO_KNOT.map(d => new Path2D(d)),
  };

  const textIn = (ctx: CanvasRenderingContext2D, t: number, start: number, y: number, fn: () => void) => {
    const p = easeOut(prog(t, start, 0.55));
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(0, (1 - p) * 22);
    fn();
    ctx.restore();
    void y;
  };

  const draw: Draw = (ctx, t) => {
    // Fondo
    const bg = ctx.createRadialGradient(cx, cy - 40, 30, cx, cy, H * 0.95);
    if (max) {
      bg.addColorStop(0, '#8c560a');
      bg.addColorStop(0.38, '#34104e');
      bg.addColorStop(1, '#06020e');
    } else {
      bg.addColorStop(0, '#5b2397');
      bg.addColorStop(0.55, '#2b0d4f');
      bg.addColorStop(1, '#0e051c');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Estrellas
    stars.forEach(s => {
      if (t < s.t0) return;
      const a = Math.max(0, Math.sin(((t - s.t0) / s.per) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(s.x, s.y);
      ctx.scale(0.3 + 0.7 * a, 0.3 + 0.7 * a);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const k = s.s / 2;
      ctx.moveTo(0, -k); ctx.lineTo(k * 0.22, -k * 0.22); ctx.lineTo(k, 0); ctx.lineTo(k * 0.22, k * 0.22);
      ctx.lineTo(0, k); ctx.lineTo(-k * 0.22, k * 0.22); ctx.lineTo(-k, 0); ctx.lineTo(-k * 0.22, -k * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Rayos
    const rp = easeOut(prog(t, 0.2, 0.8));
    if (rp > 0) {
      ctx.save();
      ctx.globalAlpha = rp;
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.35);
      ctx.scale(0.3 + 0.7 * rp, 0.3 + 0.7 * rp);
      ctx.drawImage(rays, -R, -R);
      ctx.restore();
    }

    // Resplandor detrás de la insignia
    const gp = prog(t, 0.3, 0.6);
    if (gp > 0) {
      const pulse = t > 1.2 ? 1 + 0.08 * Math.sin((t - 1.2) * 2.6) : 1;
      const gr = size * 0.95 * pulse;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      glow.addColorStop(0, max ? 'rgba(255,200,70,0.6)' : `${o.color}aa`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = gp;
      ctx.fillStyle = glow;
      ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
      ctx.restore();
    }

    // Ondas
    [0.55, 0.8].forEach(t0 => {
      const p = prog(t, t0, 1.1);
      if (p <= 0 || p >= 1) return;
      const s = size * (0.85 + 1.25 * easeOut(p)) * 1.08;
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - p);
      ctx.strokeStyle = max ? '#ffd76a' : '#ffffff';
      ctx.lineWidth = 5;
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.18);
      ctx.stroke();
      ctx.restore();
    });

    // Confeti (detrás del texto, delante de los rayos)
    confetti.forEach(c => {
      const dt = t - burstAt - c.delay;
      if (dt <= 0 || dt > c.life) return;
      const k = 2.2;
      const f = (1 - Math.exp(-k * dt)) / k;
      const x = cx + c.vx * f;
      const y = cy + c.vy * f + 260 * dt * dt;
      const a = dt > c.life * 0.7 ? 1 - (dt - c.life * 0.7) / (c.life * 0.3) : 1;
      ctx.save();
      ctx.globalAlpha = clamp01(a) * clamp01(dt / 0.08);
      ctx.translate(x, y);
      ctx.rotate(c.rot + c.vr * dt);
      ctx.scale(1, Math.cos(dt * c.flip));
      ctx.fillStyle = c.col;
      if (c.round) {
        ctx.beginPath();
        ctx.arc(0, 0, c.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      }
      ctx.restore();
    });

    // Insignia
    let bScale: number, bRot: number, bY: number, bAlpha: number;
    if (max) {
      const p = prog(t, 0.25, 1.3);
      bY = keys(p, [[0, H * 0.55], [0.6, -16], [0.8, 5], [1, 0]]);
      bScale = keys(p, [[0, 0.55], [0.6, 1.07], [0.8, 0.99], [1, 1]]);
      bRot = keys(p, [[0, -8], [0.6, 2], [1, 0]]) * Math.PI / 180;
      bAlpha = clamp01(p / 0.3);
    } else {
      const p = prog(t, 0.15, 0.85);
      bY = 0;
      bScale = keys(p, [[0, 0.15], [0.55, 1.12], [0.78, 0.97], [1, 1]]);
      bRot = keys(p, [[0, -30], [0.55, 5], [0.78, -2], [1, 0]]) * Math.PI / 180;
      bAlpha = clamp01(p / 0.3);
    }
    if (bAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = bAlpha;
      ctx.translate(cx, cy + bY);
      ctx.rotate(bRot);
      ctx.scale(bScale, bScale);
      const half = size / 2;
      const rad = size * 0.14;
      // borde y sombra
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = max ? '#ffd76a' : '#ffffff';
      roundRect(ctx, -half - 8, -half - 8, size + 16, size + 16, rad + 8);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save();
      roundRect(ctx, -half, -half, size, size, rad);
      ctx.clip();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-half, -half, size, size);
      if (badge) {
        ctx.imageSmoothingEnabled = true;
        (ctx as any).imageSmoothingQuality = 'high';
        ctx.drawImage(badge, -half, -half, size, size);
      }
      // brillo que cruza
      (max ? [1.5, 4] : [1.05]).forEach(t0 => {
        const sp = prog(t, t0, 1.0);
        if (sp <= 0 || sp >= 1) return;
        const bx = lerp(-size * 1.3, size * 1.3, easeInOut(sp));
        const band = ctx.createLinearGradient(bx - size * 0.25, 0, bx + size * 0.25, 0);
        band.addColorStop(0, 'rgba(255,255,255,0)');
        band.addColorStop(0.5, 'rgba(255,255,255,0.7)');
        band.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.transform(1, 0, -0.22, 1, 0, 0);
        ctx.fillStyle = band;
        ctx.fillRect(-size * 2, -half * 1.4, size * 4, size * 1.4);
        ctx.restore();
      });
      ctx.restore();
      ctx.restore();
    }

    // Fuegos artificiales
    fireworks.forEach(fw => {
      const dt = t - fw.t0;
      if (dt <= 0 || dt > 1.4) return;
      if (dt < 0.45) {
        const fp = dt / 0.45;
        const fr = 30 + 70 * fp;
        const fl = ctx.createRadialGradient(fw.x, fw.y, 0, fw.x, fw.y, fr);
        fl.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - fp)})`);
        fl.addColorStop(0.4, `rgba(255,220,120,${0.35 * (1 - fp)})`);
        fl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fl;
        ctx.fillRect(fw.x - fr, fw.y - fr, fr * 2, fr * 2);
      }
      const k = 3;
      const f = (1 - Math.exp(-k * dt)) / k;
      const a = dt > 0.8 ? 1 - (dt - 0.8) / 0.6 : 1;
      fw.sparks.forEach(s => {
        const x = fw.x + Math.cos(s.a) * s.s * f * 3;
        const y = fw.y + Math.sin(s.a) * s.s * f * 3 + 40 * dt * dt;
        ctx.globalAlpha = clamp01(a) * 0.35;
        ctx.fillStyle = s.white ? '#fff' : fw.col;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = clamp01(a);
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    });

    // Lluvia dorada
    rain.forEach(d => {
      const p = (t - d.t0) / d.dur;
      if (p <= 0 || p >= 1) return;
      ctx.save();
      ctx.translate(d.x + Math.sin(p * 6 + d.ph) * d.sway, -20 + (H + 60) * p);
      ctx.rotate(p * 9 + d.ph);
      ctx.scale(Math.cos(p * d.flip * 3), 1);
      ctx.fillStyle = d.col;
      ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    });

    // Encabezado
    textIn(ctx, t, 0.1, 0, () => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      setSpacing(ctx, 4);
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('PLAN PROGRESIVO SCOUT', cx, 78);
      setSpacing(ctx, 0);
      if (o.groupName) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        fitFont(ctx, o.groupName, 600, 21, W - 80);
        ctx.fillText(o.groupName, cx, 110);
      }
    });

    // Textos
    const T0 = max ? 1.25 : 0.75;
    const step = max ? 0.15 : 0.1;
    ctx.textAlign = 'center';
    textIn(ctx, t, T0, 0, () => {
      ctx.fillStyle = max ? '#ffd76a' : '#e9d5ff';
      setSpacing(ctx, max ? 6 : 5);
      ctx.font = `800 ${max ? 27 : 25}px ${FONT}`;
      ctx.fillText(max ? '★ MÁXIMA INSIGNIA ★' : '¡INSIGNIA APROBADA!', cx, 722);
      setSpacing(ctx, 0);
    });
    textIn(ctx, t, T0 + step, 0, () => {
      const line = `¡Felicidades, ${o.name}!`;
      ctx.fillStyle = '#ffffff';
      fitFont(ctx, line, 700, 42, W - 70);
      ctx.fillText(line, cx, 790);
    });
    textIn(ctx, t, T0 + step * 2, 0, () => {
      const s = fitFont(ctx, o.title, 900, max ? 84 : 78, W - 60);
      if (max) {
        const g = ctx.createLinearGradient(0, 885 - s, 0, 885);
        g.addColorStop(0, '#fff6d6');
        g.addColorStop(0.55, '#ffd76a');
        g.addColorStop(1, '#f0a92b');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(255,190,60,0.5)';
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
      }
      ctx.shadowBlur = 24;
      ctx.fillText(o.title, cx, 885);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    });
    textIn(ctx, t, T0 + step * 3, 0, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      const l1 = o.dateText ? `Aprobada el ${o.dateText}` : 'Insignia aprobada';
      fitFont(ctx, l1, 600, 29, W - 80);
      ctx.fillText(l1, cx, 952);
      const l2 = max
        ? `Completaste el Plan Progresivo${o.unitLabel ? ` del ${o.unitLabel}` : ''}`
        : (o.nextTitle ? `Ahora vas por ${o.nextTitle}. ¡Sigue así!` : '¡Sigue así!');
      ctx.fillStyle = max ? 'rgba(255,230,160,0.95)' : 'rgba(255,255,255,0.7)';
      fitFont(ctx, l2, 600, 27, W - 80);
      ctx.fillText(l2, cx, 998);
    });

    // Pie: logo scout y nombre de la app
    textIn(ctx, t, max ? 2.1 : 1.3, 0, () => {
      const ls = 74 / LOGO_BOX.w;
      ctx.save();
      ctx.translate(cx - 37, 1118);
      ctx.scale(ls, ls);
      ctx.translate(-LOGO_BOX.x, -LOGO_BOX.y);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill(logo.rope, 'evenodd');
      logo.knot.forEach(k => ctx.fill(k, 'evenodd'));
      ctx.fill(logo.fleur, 'evenodd');
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `600 22px ${FONT}`;
      ctx.fillText('Plan Progresivo · Scouts de Venezuela', cx, 1236);
    });
  };

  return { draw, duration };
}

// ---------- codificación ----------
export function canMakeCelebrationVideo(): boolean {
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas') as any;
  return typeof (window as any).VideoEncoder === 'function'
    || (typeof (window as any).MediaRecorder === 'function' && typeof c.captureStream === 'function');
}

async function encodeWithWebCodecs(canvas: HTMLCanvasElement, draw: Draw, duration: number, onProgress: (p: number) => void): Promise<Blob | null> {
  if (typeof (window as any).VideoEncoder !== 'function') return null;
  const mb = await import('mediabunny');
  if (!(await mb.canEncodeVideo('avc', { width: W, height: H }))) return null;
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
  const source = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: mb.QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: FPS });
  await output.start();
  const ctx = canvas.getContext('2d')!;
  const frames = Math.round(duration * FPS);
  for (let i = 0; i < frames; i++) {
    draw(ctx, i / FPS);
    await source.add(i / FPS, 1 / FPS);
    if (i % 5 === 0) onProgress(i / frames);
  }
  await output.finalize();
  const buf = (output.target as any).buffer as ArrayBuffer | null;
  return buf ? new Blob([buf], { type: 'video/mp4' }) : null;
}

async function encodeWithRecorder(canvas: HTMLCanvasElement, draw: Draw, duration: number, onProgress: (p: number) => void): Promise<Blob> {
  const MR = (window as any).MediaRecorder;
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MR.isTypeSupported?.(m)) || '';
  const ctx = canvas.getContext('2d')!;
  draw(ctx, 0);
  const stream = (canvas as any).captureStream(FPS);
  const rec = new MR(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e: any) => { if (e.data?.size) chunks.push(e.data); };
  const done = new Promise<void>(res => { rec.onstop = () => res(); });
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>(resolve => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      draw(ctx, Math.min(t, duration));
      onProgress(Math.min(t / duration, 1));
      if (t >= duration) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  return new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' });
}

/** Crea el video. Devuelve el archivo listo para descargar o compartir. */
export async function createCelebrationVideo(o: CelebrationVideoOptions, onProgress: (p: number) => void = () => {}): Promise<File> {
  const img = await loadImage(assetUri(o.badge));
  const { draw, duration } = buildScene(o, img);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  let blob: Blob | null = null;
  try {
    blob = await encodeWithWebCodecs(canvas, draw, duration, onProgress);
  } catch (e) {
    console.warn('Video de insignia: WebCodecs falló, se graba en tiempo real', e);
    blob = null;
  }
  if (!blob) blob = await encodeWithRecorder(canvas, draw, duration, onProgress);
  onProgress(1);
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const clean = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `Insignia-${clean(o.title)}-${clean(o.name) || 'Scout'}.${ext}`;
  return new File([blob], fileName, { type: blob.type });
}

/** Para pruebas y vista previa: dibuja un cuadro de la escena en un canvas. */
export async function renderCelebrationFrame(o: CelebrationVideoOptions, t: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(assetUri(o.badge));
  const { draw } = buildScene(o, img);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  draw(canvas.getContext('2d')!, t);
  return canvas;
}

// ---------- ventana: crear, ver, descargar y compartir ----------
const DIALOG_CSS = `
.cv-root{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(10,4,20,.78);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.cv-card{width:100%;max-width:380px;max-height:100%;overflow:auto;background:#1c1030;color:#fff;border-radius:20px;padding:20px;
  box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.cv-title{font-size:18px;font-weight:800}
.cv-sub{font-size:14px;opacity:.8;line-height:1.4}
.cv-bar{width:100%;height:10px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.cv-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#a855f7,#ffd76a);border-radius:999px;transition:width .2s}
.cv-video{width:100%;max-height:52vh;aspect-ratio:9/16;object-fit:contain;border-radius:14px;background:#000}
.cv-btns{display:flex;flex-direction:column;gap:10px;width:100%}
.cv-btn{border:0;border-radius:12px;padding:13px 16px;font:700 15px/1.1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;cursor:pointer;width:100%}
.cv-pri{background:#7c3aed;color:#fff}
.cv-sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)}
.cv-btn:focus-visible{outline:3px solid #ffd76a;outline-offset:2px}
`;

/** Abre la ventana que crea el video (con barra de avance) y luego lo muestra con Descargar / Compartir. */
export function openCelebrationVideo(o: CelebrationVideoOptions): void {
  if (!document.getElementById('cv-css')) {
    const s = document.createElement('style');
    s.id = 'cv-css';
    s.textContent = DIALOG_CSS;
    document.head.appendChild(s);
  }
  const root = document.createElement('div');
  root.className = 'cv-root';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', `Video de la insignia ${o.title}`);
  const card = document.createElement('div');
  card.className = 'cv-card';
  card.innerHTML = '<div class="cv-title"></div><div class="cv-sub">Creando tu video… 0 %</div><div class="cv-bar"><i></i></div>';
  (card.querySelector('.cv-title') as HTMLElement).textContent = `Tu video: ${o.title}`;
  root.appendChild(card);
  document.body.appendChild(root);

  let url = '';
  let closed = false;
  const close = () => {
    closed = true;
    if (url) URL.revokeObjectURL(url);
    root.remove();
  };
  const sub = card.querySelector('.cv-sub') as HTMLElement;
  const bar = card.querySelector('.cv-bar > i') as HTMLElement;
  const cancel = document.createElement('button');
  cancel.className = 'cv-btn cv-sec';
  cancel.type = 'button';
  cancel.textContent = 'Cancelar';
  cancel.onclick = close;
  card.appendChild(cancel);

  createCelebrationVideo(o, p => {
    const pct = Math.round(p * 100);
    sub.textContent = `Creando tu video… ${pct} %`;
    bar.style.width = `${pct}%`;
  }).then(file => {
    if (closed) return;
    url = URL.createObjectURL(file);
    card.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'cv-title';
    title.textContent = '¡Tu video está listo!';
    const video = document.createElement('video');
    video.className = 'cv-video';
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = true;
    const btns = document.createElement('div');
    btns.className = 'cv-btns';
    const dl = document.createElement('button');
    dl.className = 'cv-btn cv-pri';
    dl.type = 'button';
    dl.textContent = 'Descargar video';
    dl.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    btns.appendChild(dl);
    const nav: any = navigator;
    if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
      const sh = document.createElement('button');
      sh.className = 'cv-btn cv-sec';
      sh.type = 'button';
      sh.textContent = 'Compartir (WhatsApp, etc.)';
      sh.onclick = () => { nav.share({ files: [file], title: `Insignia ${o.title}` }).catch(() => {}); };
      btns.appendChild(sh);
    }
    const cl = document.createElement('button');
    cl.className = 'cv-btn cv-sec';
    cl.type = 'button';
    cl.textContent = 'Cerrar';
    cl.onclick = close;
    btns.appendChild(cl);
    card.appendChild(title);
    card.appendChild(video);
    card.appendChild(btns);
    setTimeout(() => { try { dl.focus({ preventScroll: true }); } catch { /* */ } }, 50);
  }).catch(err => {
    if (closed) return;
    console.warn('Video de insignia: no se pudo crear', err);
    card.innerHTML = '<div class="cv-title">No se pudo crear el video</div><div class="cv-sub">Este navegador no permite crear videos. Prueba con Chrome actualizado.</div>';
    const cl = document.createElement('button');
    cl.className = 'cv-btn cv-sec';
    cl.type = 'button';
    cl.textContent = 'Cerrar';
    cl.onclick = close;
    card.appendChild(cl);
  });
}
