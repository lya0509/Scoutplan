// Paso final de `npm run build:web`: genera dist/sw.js con la lista de archivos que el
// service worker debe descargar para que la app funcione sin internet.
//
// Incluye: todo dist/_expo (JS, también los trozos que se cargan bajo demanda como
// pdf-lib), dist/assets, íconos, plantillas .docx/.pdf, imágenes de /nudos y solo las
// imágenes de /programa_assets que el código usa. Las guías de /documentos NO se
// incluyen (son ~45 MB): se descargan desde la pantalla Documentos (~56 MB con las de especialidades).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');

if (!fs.existsSync(DIST)) {
  console.error('[build-sw] No existe dist/. Ejecuta primero `expo export -p web`.');
  process.exit(1);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

// Codificar igual que el navegador: encodeURIComponent convierte "@" en "%40", pero la app
// pide "/assets/node_modules/@react-navigation/…" y la caché no coincidía (sin internet
// el ☰ y la flecha de volver salían como cuadros). Se dejan sin codificar los caracteres
// que el navegador no codifica en una ruta.
const encodeSegment = seg => encodeURIComponent(seg).replace(/%(24|26|2B|2C|3B|3D|3A|40)/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
const toUrl = abs => '/' + path.relative(DIST, abs).split(path.sep).map(encodeSegment).join('/');

// Texto de todo el código fuente, para saber qué archivos de programa_assets se usan
const sourceText = [path.join(ROOT, 'App.tsx'), ...walk(SRC)]
  .filter(f => /\.(tsx?|jsx?)$/.test(f))
  .map(f => fs.readFileSync(f, 'utf8'))
  .join('\n');

const files = [];
const add = abs => { if (fs.existsSync(abs) && fs.statSync(abs).isFile()) files.push(abs); };

walk(path.join(DIST, '_expo')).forEach(add);
walk(path.join(DIST, 'assets')).forEach(add);
walk(path.join(DIST, 'nudos')).forEach(add);
// Visor de PDF dentro de la app (pdf.js, ~1,5 MB): para ver guías guardadas sin conexión
walk(path.join(DIST, 'pdfjs')).filter(f => f.endsWith('.js')).forEach(add);
fs.readdirSync(DIST)
  .filter(n => /\.(png|ico|docx|pdf|json)$/i.test(n) && n !== 'metadata.json')
  .forEach(n => add(path.join(DIST, n)));
walk(path.join(DIST, 'programa_assets'))
  .filter(f => sourceText.includes(path.basename(f)))
  .forEach(add);

const unique = [...new Set(files)].sort();
const urls = unique.map(toUrl);

const hash = crypto.createHash('sha1');
unique.forEach(f => {
  hash.update(f);
  hash.update(String(fs.statSync(f).size));
  if (f.includes(`${path.sep}_expo${path.sep}`) || f.endsWith('.json')) hash.update(fs.readFileSync(f));
});
hash.update(fs.readFileSync(path.join(DIST, 'index.html')));
const buildId = hash.digest('hex').slice(0, 12);

let sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
if (!sw.includes("'__BUILD_ID__'")) throw new Error('[build-sw] public/sw.js no tiene el marcador __BUILD_ID__');
sw = sw.replace("'__BUILD_ID__'", `'${buildId}'`);
sw = `self.__PRECACHE__ = ${JSON.stringify(urls)};\n` + sw;
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
fs.copyFileSync(path.join(ROOT, 'public', 'manifest.json'), path.join(DIST, 'manifest.json'));

const totalMb = unique.reduce((acc, f) => acc + fs.statSync(f).size, 0) / 1024 / 1024;
console.log(`[build-sw] sw.js listo: build ${buildId}, ${urls.length} archivos, ${totalMb.toFixed(1)} MB para uso offline.`);
