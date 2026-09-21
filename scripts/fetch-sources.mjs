#!/usr/bin/env node
/**
 * Resmi kaynaklari getirir, normallestirir ve parmak izlerini kilit dosyasiyla
 * karsilastirir. Degisiklik bulursa cikis kodu 2 doner; CI bu kodu gorup
 * bir konu (issue) acar.
 *
 * Kullanim:
 *   node scripts/fetch-sources.mjs              # getir ve karsilastir
 *   node scripts/fetch-sources.mjs --write      # kilit dosyasini guncelle
 *   node scripts/fetch-sources.mjs --only=<id>  # tek kaynak
 *   node scripts/fetch-sources.mjs --offline --fixtures=test/fixtures/sources
 *
 * Cikis kodlari: 0 degisiklik yok | 2 degisiklik var | 1 calisma hatasi
 */
import fs from 'node:fs';
import path from 'node:path';
import { p } from './lib/paths.mjs';
import { readJson } from './lib/data.mjs';
import { fetchWithRetry, sha256 } from './lib/fetch.mjs';
import { canonicalize } from './lib/normalize.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const WRITE = flag('write');
const OFFLINE = flag('offline');
const FIXTURES = value('fixtures');
const ONLY = value('only');
const LOCK_PATH = 'data/sources.lock.json';

const registry = readJson('data/sources.json');
const lock = (() => {
  try { return readJson(LOCK_PATH); } catch { return { schemaVersion: 1, sources: {} }; }
})();

/** Cevrimdisi modda ag yerine yerel ornek dosyalari okunur (test icin). */
async function load(source) {
  if (OFFLINE) {
    if (!FIXTURES) return { ok: false, error: 'cevrimdisi mod icin --fixtures gerekli' };
    const file = path.join(p(FIXTURES), `${source.id}.html`);
    if (!fs.existsSync(file)) return { ok: false, error: `ornek dosya yok: ${file}` };
    return { ok: true, status: 200, body: fs.readFileSync(file, 'utf8') };
  }
  return fetchWithRetry(source.url, {
    userAgent: registry.userAgent,
    timeoutMs: registry.requestTimeoutMs,
    retries: registry.retries,
    log: (message) => console.log(message),
  });
}

const results = [];

for (const source of registry.sources) {
  if (ONLY && source.id !== ONLY) continue;
  if (!source.enabled && !ONLY) {
    results.push({ id: source.id, state: 'skipped', detail: source.disabledReason || 'devre disi' });
    continue;
  }

  console.log(`> ${source.id}  ${source.url}`);
  const response = await load(source);

  if (!response.ok) {
    results.push({ id: source.id, state: 'error', detail: response.error });
    console.log(`  HATA: ${response.error}`);
    continue;
  }

  const canonical = canonicalize(response.body, source);
  const hash = sha256(canonical);
  const previous = lock.sources?.[source.id];

  if (!previous) {
    results.push({ id: source.id, state: 'new', hash, bytes: canonical.length });
    console.log(`  YENI  ${hash.slice(0, 16)} (${canonical.length} karakter)`);
  } else if (previous.hash !== hash) {
    results.push({ id: source.id, state: 'changed', hash, previousHash: previous.hash, since: previous.checkedAt, affects: source.affects || [], label: source.label, url: source.url });
    console.log(`  DEGISTI  ${previous.hash.slice(0, 16)} -> ${hash.slice(0, 16)}`);
  } else {
    results.push({ id: source.id, state: 'unchanged', hash });
    console.log(`  degismedi  ${hash.slice(0, 16)}`);
  }

  if (WRITE) {
    lock.sources ??= {};
    lock.sources[source.id] = { hash, bytes: canonical.length, checkedAt: new Date().toISOString(), url: source.url };
  }
}

if (WRITE) {
  lock.schemaVersion = 1;
  lock.updatedAt = new Date().toISOString();
  fs.writeFileSync(p(LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  console.log(`\n${LOCK_PATH} guncellendi.`);
}

const changed = results.filter((r) => r.state === 'changed' || r.state === 'new');
const errored = results.filter((r) => r.state === 'error');

console.log('\n--- ozet ---');
for (const r of results) console.log(`${r.state.padEnd(10)} ${r.id}${r.detail ? `  (${r.detail})` : ''}`);

// CI'nin okuyabilmesi icin makine dostu rapor.
fs.writeFileSync(p('.tmp-sources-report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2), 'utf8');

if (errored.length && !changed.length) {
  console.error(`\n${errored.length} kaynak getirilemedi.`);
  process.exit(1);
}
if (changed.length) {
  console.log(`\n${changed.length} kaynakta degisiklik var. Veri dosyalari gozden gecirilmeli.`);
  process.exit(2);
}
console.log('\nTum kaynaklar degismemis.');
