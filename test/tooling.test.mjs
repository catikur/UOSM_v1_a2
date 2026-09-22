/**
 * Arac zinciri testleri: derleme ciktisinin ozellikleri ve dogrulayicinin
 * gercekten hata yakaladiginin kaniti.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { p } from '../scripts/lib/paths.mjs';

const read = (file) => fs.readFileSync(p(file), 'utf8');

test('index.html derlenmis ve calisma agaciyla senkron', () => {
  const output = execFileSync('node', [p('scripts/build.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(output, /guncel/);
});

test('index.html disariya hicbir istek atmaz (tek dosya, cevrimdisi calisir)', () => {
  const html = read('index.html');
  const external = [...html.matchAll(/(?:src|href)\s*=\s*"(https?:)?\/\/[^"]*"/gi)].map((m) => m[0]);
  assert.deepEqual(external, [], `dis kaynak bulundu: ${external.join(', ')}`);
  assert.ok(!/@import\s+url\(/i.test(html), 'CSS @import ile dis kaynak cekilmemeli');
  assert.ok(!/cdn\.tailwindcss\.com/.test(html), 'uretimde Tailwind CDN kullanilmamali');
});

test('viewport yakinlastirmayi engellemiyor (WCAG 1.4.4)', () => {
  const html = read('index.html');
  const viewport = html.match(/<meta name="viewport"[^>]*>/)[0];
  assert.ok(!/user-scalable\s*=\s*no/i.test(viewport), viewport);
  assert.ok(!/maximum-scale\s*=\s*1/i.test(viewport), viewport);
});

test('gomulu veri paketi okunabilir ve tam', () => {
  const html = read('index.html');
  const snapshot = html.match(/<script type="application\/json" id="bundle-snapshot">([\s\S]*?)<\/script>/)[1];
  const bundle = JSON.parse(snapshot);
  for (const key of ['meta', 'rules', 'tracers', 'codeSets', 'tumorMarkers', 'quickPicks']) {
    assert.ok(bundle[key], `paket "${key}" bolumunu icermeli`);
  }
  assert.equal(bundle.meta.dataVersion, JSON.parse(read('bundle.json')).meta.dataVersion);
});

test('gomulu JSON betigi erken kapatamaz', () => {
  const html = read('index.html');
  const snapshot = html.match(/<script type="application\/json" id="bundle-snapshot">([\s\S]*?)<\/script>/)[1];
  assert.ok(!snapshot.includes('</script'), 'kacislanmamis </script dizgesi bulundu');
  assert.ok(!/<\//.test(snapshot), 'JSON icinde kacislanmamis "</" bulundu');
});

test('derleme yeniden uretilebilir (ayni girdi -> ayni cikti)', () => {
  // Calisma agacindaki dosyaya degil, ust uste iki derlemeye bakar:
  // boylece test bayat bir index.html'den etkilenmez.
  execFileSync('node', [p('scripts/build.mjs')], { encoding: 'utf8' });
  const first = read('index.html');
  execFileSync('node', [p('scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(read('index.html'), first, 'ikinci derleme farkli cikti uretti');
});

test('manifest ve bundle.json uretiliyor', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.length > 0);
  assert.ok(JSON.parse(read('bundle.json')).generatedAt);
});

/* -------- dogrulayicinin gercekten yakaladiginin kaniti -------- */

/** Projeyi gecici bir dizine kopyalar, veriyi bozar ve dogrulayiciyi calistirir. */
function validateWithMutation(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uosm-validate-'));
  try {
    for (const folder of ['data', 'schema', 'src', 'scripts']) {
      fs.cpSync(p(folder), path.join(dir, folder), { recursive: true });
    }
    const dataFile = path.join(dir, 'data');
    mutate({
      read: (name) => JSON.parse(fs.readFileSync(path.join(dataFile, name), 'utf8')),
      write: (name, value) => fs.writeFileSync(path.join(dataFile, name), JSON.stringify(value, null, 2)),
    });
    try {
      execFileSync('node', [path.join(dir, 'scripts', 'validate.mjs')], { encoding: 'utf8', stdio: 'pipe' });
      return { failed: false, output: '' };
    } catch (error) {
      return { failed: true, output: `${error.stdout || ''}${error.stderr || ''}` };
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('dogrulayici: kod kumesinde olmayan hizli secimi yakalar (QP-01)', () => {
  // Kaynak uygulamadaki H-03 hatasinin ta kendisi.
  const result = validateWithMutation(({ read, write }) => {
    const picks = read('quick-picks.json');
    picks.byTracer.fdg.push({ code: 'C61', label: 'Prostat' });
    write('quick-picks.json', picks);
  });
  assert.ok(result.failed, 'dogrulama basarisiz olmaliydi');
  assert.match(result.output, /QP-01/);
  assert.match(result.output, /C61/);
});

test('dogrulayici: tanimsiz dugume atfi yakalar (N-04)', () => {
  const result = validateWithMutation(({ read, write }) => {
    const rules = read('rules.json');
    rules.nodes.find((n) => n.id === 'fdg_amac').options[0].next = 'olmayan_dugum';
    write('rules.json', rules);
  });
  assert.ok(result.failed);
  assert.match(result.output, /N-04/);
});

test('dogrulayici: eksik parametreyi yakalar (N-05)', () => {
  const result = validateWithMutation(({ read, write }) => {
    const rules = read('rules.json');
    const option = rules.nodes.find((n) => n.id === 'psma_amac').options.find((o) => o.id === 'evreleme');
    delete option.next.params.indication;
    write('rules.json', rules);
  });
  assert.ok(result.failed);
  assert.match(result.output, /N-05/);
});

test('dogrulayici: tanimsiz ikonu yakalar (O-05)', () => {
  const result = validateWithMutation(({ read, write }) => {
    const rules = read('rules.json');
    rules.nodes.find((n) => n.id === 'fdg_amac').options[0].icon = 'olmayan-ikon';
    write('rules.json', rules);
  });
  assert.ok(result.failed);
  assert.match(result.output, /O-05/);
});

test('dogrulayici: sema ihlalini yakalar (SCHEMA)', () => {
  const result = validateWithMutation(({ read, write }) => {
    const meta = read('meta.json');
    meta.app.themeColor = 'mavi';
    write('meta.json', meta);
  });
  assert.ok(result.failed);
  assert.match(result.output, /SCHEMA/);
});

test('dogrulayici: bilinmeyen sablon belirtecini yakalar (T-02)', () => {
  const result = validateWithMutation(({ read, write }) => {
    const rules = read('rules.json');
    rules.nodes.find((n) => n.id === 'fdg_tani').question = 'Kitle boyutu {uydurma}?';
    write('rules.json', rules);
  });
  assert.ok(result.failed);
  assert.match(result.output, /T-02/);
});
