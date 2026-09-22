#!/usr/bin/env node
/**
 * "Depo guncel mi?" raporu.
 *
 * Tek yerde toplar:
 *   - derleme suruklemesi (index.html kaynakla uyumlu mu)
 *   - veri dogrulamasi
 *   - resmi kaynaklarda degisiklik (data/sources.lock.json)
 *   - klinik gozden gecirme tazeligi
 *   - dogrulanmayi bekleyen kod sayisi
 *
 * Markdown rapor uretir; CI bunu is ozetine ve gerekirse acilan konuya yazar.
 *
 * Cikis kodlari: 0 her sey guncel | 2 ilgilenilmesi gereken bir sey var
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { p } from './lib/paths.mjs';
import { readJson, loadBundle } from './lib/data.mjs';

const lines = [];
const attention = [];
const say = (text = '') => lines.push(text);

const bundle = loadBundle();
const meta = bundle.meta;

say(`# Guncellik raporu`);
say();
say(`| Alan | Deger |`);
say(`| --- | --- |`);
say(`| Veri surumu | \`${meta.dataVersion}\` |`);
say(`| Izlenen SUT revizyonu | ${meta.regulation.trackedRevision.label} (${meta.regulation.trackedRevision.effectiveDate}) |`);
say(`| Rapor tarihi | ${new Date().toISOString().slice(0, 10)} |`);
say();

/** Bir komutu calistirip basari/cikti dondurur. */
function run(label, args) {
  try {
    const stdout = execFileSync('node', args, { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, stdout };
  } catch (error) {
    return { ok: false, code: error.status, stdout: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

/* ---- 1) derleme suruklemesi ---- */
const build = run('build', [p('scripts/build.mjs'), '--check']);
say(`## Derleme`);
if (build.ok) {
  say(`- Uretilen dosyalar kaynakla uyumlu.`);
} else {
  attention.push('Derleme ciktilari bayat: `npm run build` calistirilip commit edilmeli.');
  say(`- **Uyumsuz.** \`npm run build\` gerekiyor.`);
  say('```');
  say(build.stdout.trim());
  say('```');
}
say();

/* ---- 2) veri dogrulamasi ---- */
const validate = run('validate', [p('scripts/validate.mjs')]);
say(`## Veri dogrulamasi`);
if (validate.ok) {
  const warningCount = (validate.stdout.match(/^UYARI/gm) || []).length;
  say(`- Temiz${warningCount ? ` (${warningCount} uyari)` : ''}.`);
  for (const line of validate.stdout.split('\n').filter((l) => l.startsWith('UYARI'))) say(`  - ${line.replace(/^UYARI\s+/, '')}`);
} else {
  attention.push('Veri dogrulamasi basarisiz.');
  say(`- **Basarisiz.**`);
  say('```');
  say(validate.stdout.trim());
  say('```');
}
say();

/* ---- 3) resmi kaynaklar ---- */
say(`## Resmi kaynaklar`);
let sourcesLock = null;
try { sourcesLock = readJson('data/sources.lock.json'); } catch { /* henuz yok */ }

let report = null;
try { report = JSON.parse(fs.readFileSync(p('.tmp-sources-report.json'), 'utf8')); } catch { /* bu calismada getirilmedi */ }

if (report) {
  say(`Son kontrol: ${report.checkedAt}`);
  say();
  say(`| Kaynak | Durum |`);
  say(`| --- | --- |`);
  for (const result of report.results) say(`| \`${result.id}\` | ${result.state}${result.detail ? ` - ${result.detail}` : ''} |`);
  const changed = report.results.filter((r) => r.state === 'changed');
  if (changed.length) {
    attention.push(`${changed.length} resmi kaynakta degisiklik var.`);
    say();
    say(`### Degisen kaynaklar`);
    for (const c of changed) {
      say(`- **${c.label || c.id}** — ${c.url}`);
      if (c.affects?.length) say(`  - Etkilenebilecek dosyalar: ${c.affects.map((f) => `\`${f}\``).join(', ')}`);
      say(`  - Parmak izi: \`${c.previousHash?.slice(0, 12)}\` → \`${c.hash?.slice(0, 12)}\``);
    }
  }
} else if (sourcesLock) {
  say(`Bu calismada kaynak getirilmedi. Kilit dosyasindaki son durum:`);
  say();
  say(`| Kaynak | Son kontrol |`);
  say(`| --- | --- |`);
  for (const [id, entry] of Object.entries(sourcesLock.sources || {})) say(`| \`${id}\` | ${entry.checkedAt} |`);
} else {
  say(`- Henuz kaynak kilidi olusturulmamis (\`npm run fetch:sources -- --write\`).`);
}
say();

/* ---- 4) klinik gozden gecirme ---- */
say(`## Klinik gozden gecirme`);
const review = meta.review;
if (review?.lastClinicalReview) {
  const ageDays = Math.floor((Date.now() - Date.parse(review.lastClinicalReview)) / 86_400_000);
  say(`- Son gozden gecirme: ${review.lastClinicalReview} (${ageDays} gun once, hedef aralik ${review.reviewIntervalDays} gun)`);
  if (ageDays > review.reviewIntervalDays) {
    attention.push(`Klinik gozden gecirme ${ageDays} gundur yapilmamis.`);
    say(`- **Gozden gecirme zamani geldi.**`);
  }
} else {
  say(`- Tanimlanmamis.`);
}
say();

/* ---- 5) dogrulanmayi bekleyen kodlar ---- */
const pending = bundle.codeSets.sets.flatMap((set) =>
  set.codes.filter((c) => c.status && c.status !== 'active').map((c) => ({ set: set.id, ...c })));
say(`## Dogrulanmayi bekleyen kodlar`);
if (pending.length) {
  say(`| Kume | Kod | Durum |`);
  say(`| --- | --- | --- |`);
  for (const item of pending) say(`| \`${item.set}\` | \`${item.code}\` | ${item.status} |`);
  say();
  say(`Ayrinti: \`docs/duzeltmeler.md\``);
} else {
  say(`- Yok.`);
}
say();

/* ---- sonuc ---- */
say(`## Sonuc`);
if (attention.length) {
  for (const item of attention) say(`- [ ] ${item}`);
} else {
  say(`- Depo guncel; yapilacak bir sey yok.`);
}

const markdown = `${lines.join('\n')}\n`;
fs.writeFileSync(p('.tmp-update-report.md'), markdown, 'utf8');
process.stdout.write(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_attention=${attention.length ? 'true' : 'false'}\n`);
}

process.exit(attention.length ? 2 : 0);
