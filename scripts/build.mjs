#!/usr/bin/env node
/**
 * Derleme: data/ + src/ -> index.html (tek dosya) + bundle.json + manifest.
 *
 * Tasarim kararlari
 * -----------------
 * 1) index.html KENDI KENDINE YETER: stil, betik ve veri anlik goruntusu
 *    icine gomulur. Disariya hicbir istek atmaz; file:// uzerinden ve
 *    cevrimdisi calisir.
 * 2) bundle.json ayrica yazilir. Uygulama acilista arka planda bunu cekip
 *    daha yeni bir surum varsa sicak degistirir (bkz. src/app.js).
 * 3) Derleme YENIDEN URETILEBILIR: `generatedAt` saat degil, icerik
 *    parmak izine bagli bir kilit dosyasindan gelir. Ayni girdi -> ayni cikti.
 *    Bu sayede `--check` ile CI'da surukleme (drift) yakalanabilir.
 *
 * Kullanim:
 *   node scripts/build.mjs           # uret ve yaz
 *   node scripts/build.mjs --check   # yazma, calisma agacindakiyle karsilastir
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { p } from './lib/paths.mjs';
import { loadBundle } from './lib/data.mjs';
import { bundleModules } from './lib/bundle-modules.mjs';

const CHECK = process.argv.includes('--check');
const SRC_FILES = ['src/engine.js', 'src/icons.js', 'src/app.js'];
const LOCK_FILE = 'data/build.lock.json';

const FAVICON = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8"><circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/></svg>`,
);

/** HTML metin dugumu icinde guvenli hale getirir (sablon degiskenleri icin). */
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/**
 * JSON'u <script> icine gomerken `</script>` ve satir ayiricilarini kacirir.
 * Aksi halde veri icindeki bir dizge betigi erken kapatabilir.
 */
const LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, 'g');
const escapeJsonForScript = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(LINE_SEPARATORS, (ch) => '\\u' + ch.charCodeAt(0).toString(16));

function contentHash(bundle, script, styles, template) {
  const { generatedAt, ...stableBundle } = bundle;
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableBundle))
    .update(script)
    .update(styles)
    .update(template)
    .digest('hex');
}

function resolveGeneratedAt(hash) {
  let lock = null;
  try { lock = JSON.parse(fs.readFileSync(p(LOCK_FILE), 'utf8')); } catch { /* ilk derleme */ }
  if (lock && lock.contentHash === hash) return { generatedAt: lock.generatedAt, lock, changed: false };
  return { generatedAt: new Date().toISOString(), lock, changed: true };
}

function buildManifest(meta) {
  return {
    name: meta.app.title,
    short_name: meta.app.shortTitle,
    description: meta.app.description,
    lang: meta.app.locale,
    dir: 'ltr',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: meta.app.themeColor,
    icons: [
      { src: `data:image/svg+xml,${FAVICON}`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}

function render(template, values) {
  const missing = [];
  const output = template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) { missing.push(key); return match; }
    return values[key];
  });
  if (missing.length) throw new Error(`Sablonda karsiligi olmayan degisken(ler): ${missing.join(', ')}`);
  return output;
}

function main() {
  const styles = fs.readFileSync(p('src/styles.css'), 'utf8');
  const template = fs.readFileSync(p('src/index.template.html'), 'utf8');
  const script = bundleModules(SRC_FILES, { footer: '\ndocument.addEventListener("DOMContentLoaded", boot);\n' });

  const bundle = loadBundle();
  const hash = contentHash(bundle, script, styles, template);
  const { generatedAt, changed } = resolveGeneratedAt(hash);
  bundle.generatedAt = generatedAt;

  const meta = bundle.meta;
  const html = render(template, {
    TITLE: escapeHtml(meta.app.title),
    SHORT_TITLE: escapeHtml(meta.app.shortTitle),
    DESCRIPTION: escapeHtml(meta.app.description),
    AUTHOR: escapeHtml(meta.app.author),
    DISCLAIMER: escapeHtml(meta.disclaimer.long),
    THEME_COLOR: escapeHtml(meta.app.themeColor),
    DATA_VERSION: escapeHtml(meta.dataVersion),
    GENERATED_AT: escapeHtml(generatedAt),
    FAVICON,
    STYLES: styles,
    SCRIPT: script,
    BUNDLE: escapeJsonForScript(bundle),
  });

  const outputs = {
    'index.html': html,
    'bundle.json': `${JSON.stringify(bundle, null, 2)}\n`,
    'manifest.webmanifest': `${JSON.stringify(buildManifest(meta), null, 2)}\n`,
    [LOCK_FILE]: `${JSON.stringify({ contentHash: hash, generatedAt, dataVersion: meta.dataVersion }, null, 2)}\n`,
  };

  if (CHECK) {
    const drifted = Object.entries(outputs).filter(([file, content]) => {
      let current = null;
      try { current = fs.readFileSync(p(file), 'utf8'); } catch { /* eksik dosya */ }
      return current !== content;
    });
    if (drifted.length) {
      console.error('Uretilen dosyalar kaynakla uyumsuz:');
      for (const [file] of drifted) console.error(`  - ${file}`);
      console.error('\nDuzeltmek icin: npm run build && git add -A');
      process.exit(1);
    }
    console.log('Derleme ciktilari guncel.');
    return;
  }

  for (const [file, content] of Object.entries(outputs)) fs.writeFileSync(p(file), content, 'utf8');

  const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`;
  console.log(`index.html          ${kb(html)}`);
  console.log(`bundle.json         ${kb(outputs['bundle.json'])}`);
  console.log(`manifest            ${kb(outputs['manifest.webmanifest'])}`);
  console.log(`veri surumu         ${meta.dataVersion}`);
  console.log(`icerik parmak izi   ${hash.slice(0, 16)}${changed ? ' (degisti, generatedAt tazelendi)' : ' (degismedi)'}`);
}

main();
