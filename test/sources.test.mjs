/**
 * Kaynak izleme testleri: normallestirmenin sahte alarm uretmedigini dogrular.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, normalize, extractBody, AVAILABLE_RULES } from '../scripts/lib/normalize.mjs';
import { sha256 } from '../scripts/lib/fetch.mjs';
import { readJson } from '../scripts/lib/data.mjs';

const source = readJson('data/sources.json').sources.find((s) => s.id === 'mevzuat-sut');

const page = (token, date, body) => `<!doctype html><html><head><style>.a{color:red}</style></head>
<body>
  <input type="hidden" name="__RequestVerificationToken" value="${token}">
  <script>var t = "${token}";</script>
  <div id="content"><h1>Saglik Uygulama Tebligi</h1><p>${body}</p><p>Guncelleme: ${date}</p></div>
</body></html>`;

test('degisen oturum jetonu parmak izini degistirmez', () => {
  const a = sha256(canonicalize(page('JETON-A', '30.04.2024', 'PET goruntuleme kurallari'), source));
  const b = sha256(canonicalize(page('JETON-B', '30.04.2024', 'PET goruntuleme kurallari'), source));
  assert.equal(a, b, 'yalnizca CSRF/oturum degeri degisince alarm uretilmemeli');
});

test('mevzuat sayfasinda TARIH degisikligi bilerek alarm uretir', () => {
  // data/sources.json -> mevzuat-sut kaydinda 'strip-dates' KULLANILMAZ.
  // Mevzuat sayfasinda tarih anlamli bir sinyaldir (yurulurluk/degisiklik
  // tarihi). Burada yanlis alarm riskini, kacirilan bir SUT degisikligine
  // tercih ediyoruz. Bu test o karari sabitler.
  const a = sha256(canonicalize(page('JETON-A', '30.04.2024', 'PET goruntuleme kurallari'), source));
  const b = sha256(canonicalize(page('JETON-A', '15.09.2025', 'PET goruntuleme kurallari'), source));
  assert.notEqual(a, b);
});

test('strip-dates acik olan kaynakta tarih farki yok sayilir', () => {
  const noisy = { kind: 'html', watch: 'body', normalize: ['strip-script', 'strip-dates', 'collapse-whitespace'] };
  const a = sha256(canonicalize(page('X', '30.04.2024 09:00', 'Duyuru'), noisy));
  const b = sha256(canonicalize(page('X', '01.05.2024 17:45', 'Duyuru'), noisy));
  assert.equal(a, b);
});

test('gercek icerik degisikligi parmak izini degistirir', () => {
  const a = sha256(canonicalize(page('JETON-A', '30.04.2024', 'PET goruntuleme kurallari'), source));
  const b = sha256(canonicalize(page('JETON-A', '30.04.2024', 'PET goruntuleme kurallari DEGISTI'), source));
  assert.notEqual(a, b);
});

test('bosluk ve &nbsp; farklari parmak izini degistirmez', () => {
  const a = sha256(canonicalize('<body><p>Bir   iki</p></body>', source));
  const b = sha256(canonicalize('<body>\n  <p>Bir&nbsp;&nbsp;iki</p>\n</body>', source));
  assert.equal(a, b);
});

test('extractBody id secicisini destekler', () => {
  const html = '<body><div id="content">ICERIK</div><div id="other">baska</div></body>';
  assert.equal(extractBody(html, '#content').trim(), 'ICERIK');
});

test('bilinmeyen normallestirme kurali sessizce gecilmez', () => {
  assert.throws(() => normalize('x', ['olmayan-kural']), /Bilinmeyen normallestirme kurali/);
});

test('data/sources.json yalnizca tanimli kurallari kullanir ve https ister', () => {
  for (const s of readJson('data/sources.json').sources) {
    assert.ok(s.url.startsWith('https://'), `${s.id}: https olmali`);
    for (const rule of s.normalize || []) {
      assert.ok(AVAILABLE_RULES.includes(rule), `${s.id}: tanimsiz kural "${rule}"`);
    }
    if (!s.enabled) assert.ok(s.disabledReason, `${s.id}: devre disi kaynak gerekcesini belirtmeli`);
  }
});
