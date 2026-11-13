// Celebración a pantalla completa cuando el Scouter aprueba una insignia (web / app instalada).
// Se dibuja con HTML + CSS que solo anima transform y opacity: la mueve la tarjeta gráfica,
// así va fluida en el teléfono aunque la app esté ocupada. La máxima insignia de la rama tiene
// su versión dorada: fuegos artificiales, lluvia dorada y estrellas.
// @ts-ignore: módulo interno de react-native-web; el mismo que usa <Image> para hallar la URL
import { getAssetByID } from 'react-native-web/dist/modules/AssetRegistry';

export interface CelebrationOptions {
  /** Nombre de la insignia («Precursor», «Rover Ciudadano»). */
  title: string;
  /** Color de la etapa. */
  color: string;
  /** require(...) de la imagen de la insignia. */
  badge: any;
  /** Máxima insignia de la rama: celebración especial. */
  isMax: boolean;
  /** Rama («Clan»). */
  unitLabel?: string;
  /** Siguiente etapa, si hay. */
  nextTitle?: string;
}

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

const CSS = `
.bc-root{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;overflow:hidden;
  color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-tap-highlight-color:transparent;transition:opacity .3s ease}
.bc-root.bc-out{opacity:0}
.bc-back{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(70,26,115,.9),rgba(14,5,28,.95) 72%);animation:bc-fade .35s ease both}
.bc-max .bc-back{background:radial-gradient(circle at 50% 36%,rgba(140,86,10,.92) 0%,rgba(52,16,78,.96) 42%,rgba(6,2,14,.98) 80%)}
.bc-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.bc-center{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 24px;max-width:440px}
.bc-wrap{position:relative;width:var(--bs);height:var(--bs);margin-bottom:38px}
.bc-raysw{position:absolute;left:50%;top:50%;width:0;height:0;animation:bc-raysin .8s ease-out .2s both}
.bc-rays{position:absolute;width:calc(var(--bs)*3.6);height:calc(var(--bs)*3.6);left:calc(var(--bs)*-1.8);top:calc(var(--bs)*-1.8);border-radius:50%;
  background:repeating-conic-gradient(from 0deg,var(--ray) 0deg 7deg,transparent 7deg 20deg);
  -webkit-mask:radial-gradient(circle,#000 16%,transparent 68%);mask:radial-gradient(circle,#000 16%,transparent 68%);
  animation:bc-spin 18s linear infinite;will-change:transform}
.bc-rays.bc-r2{animation-direction:reverse;animation-duration:26s;opacity:.7;
  background:repeating-conic-gradient(from 10deg,var(--ray2) 0deg 4deg,transparent 4deg 26deg)}
.bc-glow{position:absolute;inset:-35%;border-radius:50%;background:radial-gradient(circle,var(--glow) 0%,transparent 65%);
  animation:bc-fade .6s ease .3s both,bc-pulse 2.4s ease-in-out 1.2s infinite}
.bc-ring{position:absolute;inset:-4%;border:3px solid var(--ringc);border-radius:18%;opacity:0;animation:bc-ripple 1.1s ease-out .55s}
.bc-ring.bc-g2{animation-delay:.8s}
.bc-burst{position:absolute;left:50%;top:50%;width:0;height:0}
.bc-patch{position:absolute;inset:0;border-radius:14%;overflow:hidden;background:#fff;
  box-shadow:0 0 0 4px #fff,0 14px 40px rgba(0,0,0,.5);animation:bc-pop .85s cubic-bezier(.2,.9,.3,1.25) .15s both;will-change:transform}
.bc-max .bc-patch{box-shadow:0 0 0 4px #ffd76a,0 0 0 8px rgba(255,215,106,.35),0 18px 50px rgba(0,0,0,.6);
  animation:bc-rise 1.3s cubic-bezier(.2,.8,.25,1.1) .25s both}
.bc-patch img{width:100%;height:100%;object-fit:cover;display:block}
.bc-shine{position:absolute;top:-20%;bottom:-20%;left:0;width:45%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:translateX(-160%) skewX(-12deg);
  animation:bc-shine 1s ease-in-out 1.05s both}
.bc-max .bc-shine{animation:bc-shine 1.1s ease-in-out 1.5s both,bc-shine 1.1s ease-in-out 4s both}
.bc-kicker{font-size:13px;font-weight:800;letter-spacing:2.6px;text-transform:uppercase;color:var(--kick);animation:bc-up .5s ease-out .75s both}
.bc-title{font-size:32px;font-weight:900;line-height:1.1;margin-top:6px;text-shadow:0 3px 18px rgba(0,0,0,.45);animation:bc-up .5s ease-out .85s both}
.bc-msg{font-size:15px;line-height:1.45;opacity:.92;margin-top:10px;animation:bc-up .5s ease-out .95s both}
.bc-btn{margin-top:26px;border:0;border-radius:999px;padding:13px 34px;font:800 16px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  background:#fff;color:#4a1a78;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer;animation:bc-up .5s ease-out 1.15s both}
.bc-btn:focus-visible{outline:3px solid var(--kick);outline-offset:3px}
.bc-max .bc-kicker{font-size:14px;letter-spacing:3.5px;color:#ffd76a;animation:bc-up .6s ease-out 1.25s both}
.bc-max .bc-title{font-size:36px;animation:bc-up .6s ease-out 1.4s both;
  background:linear-gradient(180deg,#fff6d6 0%,#ffd76a 55%,#f0a92b 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:none;filter:drop-shadow(0 3px 14px rgba(255,190,60,.45))}
.bc-max .bc-msg{animation:bc-up .6s ease-out 1.55s both}
.bc-max .bc-btn{background:linear-gradient(180deg,#ffe28a,#f5b73b);color:#3b1600;animation:bc-up .6s ease-out 1.8s both}
.bc-c{position:absolute;left:0;top:0;animation:bc-burst var(--bd) cubic-bezier(.1,.75,.3,1) var(--dl) both;will-change:transform}
.bc-c>i{display:block;width:var(--w);height:var(--h);margin:calc(var(--h)/-2) 0 0 calc(var(--w)/-2);background:var(--col);border-radius:var(--br);
  animation:bc-fall var(--fd) cubic-bezier(.4,0,.8,.6) calc(var(--dl) + var(--bd)*.55) both;will-change:transform,opacity}
.bc-fw{position:absolute;width:0;height:0}
.bc-fw>i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:var(--col);box-shadow:0 0 8px var(--col);
  animation:bc-spark var(--fd) cubic-bezier(.15,.7,.35,1) var(--dl) both;will-change:transform,opacity}
.bc-fw>b{position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.9),rgba(255,220,120,.35) 40%,transparent 70%);animation:bc-flash .45s ease-out var(--dl) both}
.bc-rain{position:absolute;top:-6vh;animation:bc-rainfall var(--fd) linear var(--dl) both;will-change:transform}
.bc-rain>i{display:block;width:var(--w);height:var(--h);background:var(--col);border-radius:2px;animation:bc-flip .9s linear infinite}
.bc-star{position:absolute;width:var(--s);height:var(--s);background:#fff;
  clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);animation:bc-twinkle var(--fd) ease-in-out var(--dl) infinite both}
@keyframes bc-fade{from{opacity:0}to{opacity:1}}
@keyframes bc-spin{to{transform:rotate(360deg)}}
@keyframes bc-raysin{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@keyframes bc-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:.75}}
@keyframes bc-ripple{0%{opacity:.9;transform:scale(.85)}100%{opacity:0;transform:scale(2.1)}}
@keyframes bc-pop{0%{opacity:0;transform:scale(.15) rotate(-30deg)}55%{opacity:1;transform:scale(1.12) rotate(5deg)}78%{transform:scale(.97) rotate(-2deg)}100%{opacity:1;transform:none}}
@keyframes bc-rise{0%{opacity:0;transform:translateY(55vh) scale(.55) rotate(-8deg)}60%{opacity:1;transform:translateY(-16px) scale(1.07) rotate(2deg)}
  80%{transform:translateY(5px) scale(.99)}100%{opacity:1;transform:none}}
@keyframes bc-shine{0%{transform:translateX(-160%) skewX(-12deg)}100%{transform:translateX(330%) skewX(-12deg)}}
@keyframes bc-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes bc-burst{0%{transform:translate(0,0) scale(.4);opacity:0}8%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:1}}
@keyframes bc-fall{0%{transform:none;opacity:1}75%{opacity:1}100%{transform:translateY(var(--fall)) rotate(var(--rot));opacity:0}}
@keyframes bc-spark{0%{transform:translate(0,0) scale(1);opacity:0}6%{opacity:1}70%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
@keyframes bc-flash{0%{opacity:0;transform:scale(.2)}30%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
@keyframes bc-rainfall{from{transform:translate(0,0)}to{transform:translate(var(--dx),116vh)}}
@keyframes bc-flip{0%{transform:rotate(0) scaleX(1)}50%{transform:rotate(180deg) scaleX(.3)}100%{transform:rotate(360deg) scaleX(1)}}
@keyframes bc-twinkle{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.bc-root *,.bc-root *>*{animation:none!important}.bc-fx,.bc-burst,.bc-ring,.bc-shine{display:none}}
`;

function ensureCss() {
  if (document.getElementById('bc-css')) return;
  const s = document.createElement('style');
  s.id = 'bc-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function el(tag: string, cls: string, style?: Record<string, string>, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) for (const k in style) e.style.setProperty(k, style[k]);
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/** Confeti que sale disparado desde el centro de la insignia y cae. */
function confettiBurst(target: HTMLElement, colors: string[], count: number, delay: number, spread: number) {
  for (let i = 0; i < count; i++) {
    const ang = rnd(0, Math.PI * 2);
    const dist = rnd(spread * 0.35, spread);
    const w = rnd(6, 11);
    const round = Math.random() < 0.3;
    const c = el('i', 'bc-c', {
      '--dx': `${Math.cos(ang) * dist}px`,
      '--dy': `${Math.sin(ang) * dist * 0.85 - rnd(20, 80)}px`,
      '--bd': `${rnd(0.7, 1.05)}s`,
      '--dl': `${delay + rnd(0, 0.12)}s`,
      '--fd': `${rnd(1.6, 2.6)}s`,
      '--fall': `${rnd(160, 380)}px`,
      '--rot': `${rnd(-540, 540)}deg`,
      '--w': `${round ? w * 0.9 : w}px`,
      '--h': `${round ? w * 0.9 : w * rnd(0.4, 0.6)}px`,
      '--br': round ? '50%' : '2px',
      '--col': pick(colors),
    });
    c.appendChild(document.createElement('i'));
    target.appendChild(c);
  }
}

/** Un fuego artificial: destello y chispas en círculo. */
function firework(fx: HTMLElement, x: number, y: number, delay: number, colors: string[]) {
  const fw = el('div', 'bc-fw', { left: `${x}px`, top: `${y}px`, '--dl': `${delay}s` });
  fw.appendChild(el('b', ''));
  const n = 22;
  const r = rnd(70, 115);
  const col = pick(colors);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rnd(-0.08, 0.08);
    const d = r * rnd(0.75, 1.05);
    fw.appendChild(el('i', '', {
      '--dx': `${Math.cos(ang) * d}px`,
      '--dy': `${Math.sin(ang) * d + rnd(10, 30)}px`,
      '--dl': `${delay}s`,
      '--fd': `${rnd(0.9, 1.3)}s`,
      '--col': Math.random() < 0.25 ? '#ffffff' : col,
    }));
  }
  fx.appendChild(fw);
}

let queue: Promise<void> = Promise.resolve();

/** Espera a que no esté la animación de inicio (public/index.html). */
function afterSplash(): Promise<void> {
  return new Promise(resolve => {
    const t0 = Date.now();
    const tick = () => {
      if (!document.getElementById('scout-splash') || Date.now() - t0 > 20000) resolve();
      else setTimeout(tick, 200);
    };
    tick();
  });
}

function render(o: CelebrationOptions): Promise<void> {
  return new Promise(resolve => {
    ensureCss();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const max = o.isMax;
    const bs = Math.round(Math.min(W * (max ? 0.46 : 0.4), max ? 190 : 160));
    const gold = ['#ffd76a', '#ffe9a8', '#f5b73b', '#fff6d6', '#ffffff'];
    const colors = max ? [...gold, '#c084fc', o.color] : [o.color, '#ffffff', '#ffd76a', '#c084fc', '#60a5fa', '#34d399'];

    const root = el('div', `bc-root${max ? ' bc-max' : ''}`, {
      '--bs': `${bs}px`,
      '--ray': max ? 'rgba(255,205,90,.32)' : 'rgba(255,255,255,.15)',
      '--ray2': max ? 'rgba(255,240,190,.22)' : 'rgba(255,255,255,.08)',
      '--glow': max ? 'rgba(255,200,70,.55)' : `${o.color}66`,
      '--ringc': max ? '#ffd76a' : '#ffffff',
      '--kick': max ? '#ffd76a' : '#e9d5ff',
    });
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'bc-title');

    root.appendChild(el('div', 'bc-back'));
    const fx = el('div', 'bc-fx');
    root.appendChild(fx);

    const center = el('div', 'bc-center');
    const wrap = el('div', 'bc-wrap');
    const raysw = el('div', 'bc-raysw');
    raysw.appendChild(el('div', 'bc-rays'));
    raysw.appendChild(el('div', 'bc-rays bc-r2'));
    wrap.appendChild(raysw);
    wrap.appendChild(el('div', 'bc-glow'));
    wrap.appendChild(el('div', 'bc-ring'));
    wrap.appendChild(el('div', 'bc-ring bc-g2'));
    const burst = el('div', 'bc-burst');
    wrap.appendChild(burst);
    const patch = el('div', 'bc-patch');
    const img = document.createElement('img');
    img.alt = `Insignia ${o.title}`;
    img.src = assetUri(o.badge);
    patch.appendChild(img);
    patch.appendChild(el('div', 'bc-shine'));
    wrap.appendChild(patch);
    center.appendChild(wrap);

    const kicker = el('div', 'bc-kicker');
    kicker.textContent = max ? '★ Máxima insignia ★' : '¡Insignia aprobada!';
    const title = el('div', 'bc-title');
    title.id = 'bc-title';
    title.textContent = o.title;
    const msg = el('div', 'bc-msg');
    msg.textContent = max
      ? `Completaste el Plan Progresivo${o.unitLabel ? ` del ${o.unitLabel}` : ''}. Llegaste a lo más alto: ¡felicitaciones!`
      : `Tu Scouter aprobó tu etapa.${o.nextTitle ? ` Ahora vas por ${o.nextTitle}.` : ''} ¡Sigue así!`;
    const btn = el('button', 'bc-btn') as HTMLButtonElement;
    btn.type = 'button';
    btn.textContent = max ? '¡Lo logré!' : '¡Genial!';
    center.appendChild(kicker);
    center.appendChild(title);
    center.appendChild(msg);
    center.appendChild(btn);
    root.appendChild(center);

    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!still) {
      confettiBurst(burst, colors, max ? 70 : 64, max ? 1.0 : 0.42, Math.min(W, 520) * 0.62);
      if (max) {
        // Fuegos artificiales en la mitad de arriba, uno tras otro
        const spots = [[0.22, 0.2], [0.78, 0.16], [0.5, 0.1], [0.15, 0.42], [0.85, 0.38], [0.35, 0.14], [0.66, 0.3]];
        spots.forEach(([fx0, fy0], i) => firework(fx, W * fx0 + rnd(-20, 20), H * fy0 + rnd(-15, 15), 0.9 + i * 0.45, gold.concat(['#c084fc', '#f472b6'])));
        // Lluvia dorada
        for (let i = 0; i < 46; i++) {
          const r = el('div', 'bc-rain', {
            left: `${rnd(0, 100)}vw`,
            '--dx': `${rnd(-40, 40)}px`,
            '--dl': `${rnd(1.2, 4.2)}s`,
            '--fd': `${rnd(2.6, 4.2)}s`,
            '--w': `${rnd(6, 10)}px`,
            '--h': `${rnd(3, 5)}px`,
            '--col': pick(gold),
          });
          r.appendChild(document.createElement('i'));
          fx.appendChild(r);
        }
        // Estrellas que titilan
        for (let i = 0; i < 16; i++) {
          fx.appendChild(el('i', 'bc-star', {
            left: `${rnd(4, 96)}vw`, top: `${rnd(3, 92)}vh`,
            '--s': `${rnd(8, 16)}px`, '--dl': `${rnd(0.6, 3)}s`, '--fd': `${rnd(1.6, 2.8)}s`,
          }));
        }
      }
    }

    document.body.appendChild(root);
    try { (navigator as any).vibrate?.(max ? [90, 60, 90, 60, 260] : [60, 40, 120]); } catch { /* sin vibración */ }

    let closed = false;
    const openedAt = Date.now();
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      root.classList.add('bc-out');
      setTimeout(() => { root.remove(); resolve(); }, 320);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
    btn.addEventListener('click', close);
    // Tocar fuera también cierra, pero no en el primer segundo (para no cerrarla sin querer)
    root.addEventListener('click', e => { if (e.target !== btn && Date.now() - openedAt > 1500) close(); });
    document.addEventListener('keydown', onKey);
    setTimeout(() => { try { btn.focus({ preventScroll: true }); } catch { /* */ } }, max ? 1900 : 1200);
  });
}

/** Muestra la celebración (una tras otra si hay varias). Termina cuando el scout la cierra. */
export function showBadgeCelebration(o: CelebrationOptions): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  queue = queue.then(afterSplash).then(() => render(o)).catch(() => {});
  return queue;
}
