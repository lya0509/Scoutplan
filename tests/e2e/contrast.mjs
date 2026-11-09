// Se ejecuta DENTRO de la página (page.evaluate): contraste WCAG de cada texto visible
// contra su fondo real (mezclando capas semitransparentes y la opacidad heredada).
// Devuelve [{ ratio, text, color, bg }] de los textos bajo 4,5 (3 si es grande o negrita).
export function contrastAudit() {
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; } }
    let base = parse(getComputedStyle(document.body).backgroundColor);
    if (!base || base.a === 0) base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base);
    return base;
  };
  // Texto con letras o números (los emojis se dibujan a color y no cuentan)
  const HAS_TEXT = /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/;
  const out = [];
  const seen = new Set();
  document.querySelectorAll('div,span,a,button').forEach((el) => {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!txt || !HAS_TEXT.test(txt)) return;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2 || box.right <= 0 || box.left >= innerWidth) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') return;
    let op = 1;
    for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op < 0.05) return;
    const fg0 = parse(cs.color);
    if (!fg0) return;
    const bg = bgOf(el);
    const fg = blend({ ...fg0, a: fg0.a * op }, bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) {
      const key = txt.slice(0, 40) + cs.color;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ ratio, text: txt.slice(0, 60), color: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
    }
  });
  return out.sort((a, b) => a.ratio - b.ratio);
}
