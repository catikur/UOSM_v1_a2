#!/usr/bin/env node
/**
 * Veri butunlugu denetimi.
 *
 * Iki katman:
 *  1) Sema dogrulamasi  - alan turleri ve zorunlu alanlar (schema/*.json).
 *  2) Anlamsal denetim  - dosyalar arasi capraz referanslar. Kaynak
 *     uygulamadaki "hizli secim tusu her zaman reddediliyor" hatasi tam
 *     olarak burada, QP-01 denetiminde yakalanir.
 *
 * Cikis kodu: 0 temiz, 1 hata var. Uyarilar derlemeyi durdurmaz.
 */
import { readJson, loadBundle } from './lib/data.mjs';
import { validate } from './lib/mini-schema.mjs';
import { resolveCodeSet, matchCode, isWellFormedIcd, createBundle } from '../src/engine.js';
import { ICONS } from '../src/icons.js';

const errors = [];
const warnings = [];
const fail = (code, message) => errors.push(`[${code}] ${message}`);
const warn = (code, message) => warnings.push(`[${code}] ${message}`);

const bundle = createBundle(loadBundle());

/* -------------------------------------------------- 1) sema dogrulamasi */

const SCHEMA_MAP = [
  ['data/meta.json', 'schema/meta.schema.json', bundle.meta],
  ['data/rules.json', 'schema/rules.schema.json', bundle.rules],
  ['data/tracers.json', 'schema/tracers.schema.json', bundle.tracers],
  ['data/code-sets.json', 'schema/code-sets.schema.json', bundle.codeSets],
  ['data/tumor-markers.json', 'schema/tumor-markers.schema.json', bundle.tumorMarkers],
  ['data/quick-picks.json', 'schema/quick-picks.schema.json', bundle.quickPicks],
  ['data/sources.json', 'schema/sources.schema.json', readJson('data/sources.json')],
];

for (const [dataFile, schemaFile, value] of SCHEMA_MAP) {
  const schema = readJson(schemaFile);
  for (const issue of validate(value, schema)) fail('SCHEMA', `${dataFile} ${issue}`);
}

/* ----------------------------------------------- 2) anlamsal denetimler */

const nodes = new Map(bundle.rules.nodes.map((n) => [n.id, n]));
const codeSetIds = new Set(bundle.codeSets.sets.map((s) => s.id));
const sutRefIds = new Set(bundle.meta.regulation.relevantSections.map((s) => s.id));
const supportedOps = new Set(bundle.rules.predicateOps || []);

/** Bir dugumun tum seceneklerini (tracer uretimli olanlar haric) gezer. */
function* eachOption() {
  for (const node of bundle.rules.nodes) {
    for (const option of node.options || []) yield [node, option];
  }
}

/** Sablondaki {belirtec} adlarini toplar. */
const tokensIn = (text) => [...String(text ?? '').matchAll(/\{([a-zA-Z0-9_.]+)\}/g)].map((m) => m[1]);

const KNOWN_TOKENS = new Set(['code', 'codeLabel', 'tracer', 'tracerCode', 'tracerId', 'facilityId', 'marker.label', 'marker.list']);

// N-01: tekrar eden dugum kimligi
const seenNodeIds = new Set();
for (const node of bundle.rules.nodes) {
  if (seenNodeIds.has(node.id)) fail('N-01', `Tekrar eden dugum kimligi: ${node.id}`);
  seenNodeIds.add(node.id);
}

// N-02: dugum icinde tekrar eden secenek kimligi
for (const node of bundle.rules.nodes) {
  const seen = new Set();
  for (const option of node.options || []) {
    if (seen.has(option.id)) fail('N-02', `${node.id}: tekrar eden secenek kimligi "${option.id}"`);
    seen.add(option.id);
  }
}

// N-03: giris dugumu var mi
if (!nodes.has(bundle.rules.entryNode)) fail('N-03', `entryNode tanimsiz: ${bundle.rules.entryNode}`);

/** `next` hedefini cozer ve dogrular. */
function checkNext(next, where) {
  const targetId = typeof next === 'string' ? next : next.node;
  const target = nodes.get(targetId);
  if (!target) { fail('N-04', `${where}: tanimsiz dugume atif -> "${targetId}"`); return null; }

  const supplied = new Set(Object.keys((typeof next === 'object' && next.params) || {}));
  for (const required of target.params || []) {
    if (!supplied.has(required)) fail('N-05', `${where}: "${targetId}" dugumu "${required}" parametresini bekliyor ama verilmemis`);
  }
  for (const extra of supplied) {
    if (!(target.params || []).includes(extra)) fail('N-06', `${where}: "${targetId}" dugumunde tanimsiz parametre -> "${extra}"`);
  }
  if (!target.parametric && supplied.size) fail('N-07', `${where}: "${targetId}" parametrik degil ama parametre verilmis`);
  return targetId;
}

// O-01..O-05: secenek tutarliligi
for (const [node, option] of eachOption()) {
  const where = `${node.id}/${option.id}`;
  const outlets = ['next', 'branch', 'outcome'].filter((k) => option[k] !== undefined);
  if (outlets.length !== 1) {
    fail('O-01', `${where}: tam olarak bir tane next/branch/outcome olmali (bulunan: ${outlets.join(', ') || 'hicbiri'})`);
  }

  if (option.next) checkNext(option.next, where);
  for (const [i, arm] of (option.branch || []).entries()) {
    const armOutlets = ['next', 'outcome'].filter((k) => arm[k] !== undefined);
    if (armOutlets.length !== 1) fail('O-02', `${where} dal[${i}]: tam olarak bir tane next/outcome olmali`);
    if (arm.next) checkNext(arm.next, `${where} dal[${i}]`);
    if (arm.when) checkPredicate(arm.when, `${where} dal[${i}].when`);
    for (const ref of arm.outcome?.sutRefs || []) {
      if (!sutRefIds.has(ref)) fail('O-03', `${where} dal[${i}]: tanimsiz SUT atfi -> "${ref}"`);
    }
  }
  if ((option.branch || []).length && !option.branch.some((arm) => !arm.when)) {
    warn('O-04', `${where}: dallanmanin kosulsuz (varsayilan) kolu yok; hicbir kosul tutmazsa akis kirilir`);
  }

  for (const ref of option.outcome?.sutRefs || []) {
    if (!sutRefIds.has(ref)) fail('O-03', `${where}: tanimsiz SUT atfi -> "${ref}"`);
  }
  if (option.visibleWhen) checkPredicate(option.visibleWhen, `${where}.visibleWhen`);
  if (option.icon && !ICONS[option.icon]) fail('O-05', `${where}: tanimsiz ikon -> "${option.icon}"`);
  if (option.setsFacility && !bundle.tracers.facilityLevels.some((f) => f.id === option.setsFacility)) {
    fail('O-06', `${where}: tanimsiz kurum basamagi -> "${option.setsFacility}"`);
  }
}

/** Kosul ifadesindeki isleclerin desteklendigini dogrular. */
function checkPredicate(pred, where) {
  if (pred == null || typeof pred !== 'object') return;
  for (const key of Object.keys(pred)) {
    if (!supportedOps.has(key)) fail('P-01', `${where}: desteklenmeyen kosul isleci -> "${key}"`);
    if (['allOf', 'anyOf'].includes(key)) pred[key].forEach((sub, i) => checkPredicate(sub, `${where}.${key}[${i}]`));
    if (key === 'not') checkPredicate(pred.not, `${where}.not`);
  }
}

// T-01..T-03: sablon belirtecleri
for (const node of bundle.rules.nodes) {
  const declared = new Set((node.params || []).map((name) => `params.${name}`));
  const texts = [node.question, node.hint, ...(node.options || []).flatMap((o) => [
    o.label, o.note, o.outcome?.indication, o.outcome?.reason,
    ...(o.branch || []).flatMap((a) => [a.outcome?.indication, a.outcome?.reason]),
  ])];
  for (const text of texts) {
    for (const token of tokensIn(text)) {
      if (KNOWN_TOKENS.has(token) || declared.has(token)) continue;
      if (token.startsWith('params.')) fail('T-01', `${node.id}: "{${token}}" kullanilmis ama dugumun params listesinde yok`);
      else fail('T-02', `${node.id}: bilinmeyen sablon belirteci -> "{${token}}"`);
    }
  }
  for (const name of node.params || []) {
    const used = texts.some((t) => tokensIn(t).includes(`params.${name}`));
    if (!used) warn('T-03', `${node.id}: "${name}" parametresi tanimli ama hicbir metinde kullanilmiyor`);
  }
}

// TR-01..TR-04: radyofarmasotikler
const tracerIds = new Set();
for (const tracer of bundle.tracers.tracers) {
  if (tracerIds.has(tracer.id)) fail('TR-01', `Tekrar eden radyofarmasotik kimligi: ${tracer.id}`);
  tracerIds.add(tracer.id);
  if (!ICONS[tracer.icon]) fail('TR-02', `${tracer.id}: tanimsiz ikon -> "${tracer.icon}"`);

  if (tracer.covered) {
    if (!tracer.entryNode || !nodes.has(tracer.entryNode)) fail('TR-03', `${tracer.id}: entryNode tanimsiz -> "${tracer.entryNode}"`);
    if (tracer.askIcd && !codeSetIds.has(tracer.codeSet)) fail('TR-04', `${tracer.id}: tanimsiz kod kumesi -> "${tracer.codeSet}"`);
    const entry = nodes.get(tracer.entryNode);
    if (entry?.parametric) fail('TR-05', `${tracer.id}: entryNode parametrik bir dugum ("${tracer.entryNode}"); parametreler verilemez`);
  } else if (!tracer.notCoveredOutcome) {
    fail('TR-06', `${tracer.id}: covered=false ama notCoveredOutcome tanimlanmamis`);
  }
  for (const ref of tracer.notCoveredOutcome?.sutRefs || []) {
    if (!sutRefIds.has(ref)) fail('TR-07', `${tracer.id}: tanimsiz SUT atfi -> "${ref}"`);
  }
}

// CS-01..CS-03: kod kumeleri
for (const set of bundle.codeSets.sets) {
  try { resolveCodeSet(bundle, set.id); }
  catch (error) { fail('CS-01', `${set.id}: ${error.message}`); }

  if (set.enforcement === 'block' && !set.rejectionMessage) fail('CS-02', `${set.id}: enforcement=block ise rejectionMessage zorunlu`);
  if (set.enforcement === 'warn' && !set.warningMessage) fail('CS-02', `${set.id}: enforcement=warn ise warningMessage zorunlu`);
  for (const message of [set.rejectionMessage, set.warningMessage]) {
    for (const token of tokensIn(message)) {
      if (token !== 'code') fail('CS-03', `${set.id}: mesajda bilinmeyen belirtec -> "{${token}}" (yalnizca {code} kullanilabilir)`);
    }
  }
  if (set.sutRef && !sutRefIds.has(set.sutRef)) fail('CS-04', `${set.id}: tanimsiz SUT atfi -> "${set.sutRef}"`);
  for (const entry of set.codes) {
    if (entry.status && entry.status !== 'active' && !entry.reviewNote) {
      warn('CS-05', `${set.id}/${entry.code}: status="${entry.status}" ama reviewNote yok`);
    }
  }
}

// QP-01: her hizli secim kodu, ilgili radyofarmasotigin kod kumesinde eslesmeli.
// Kaynak uygulamadaki "Prostat (C61)" tusu bu denetimle yakalanirdi.
for (const [tracerId, picks] of Object.entries(bundle.quickPicks.byTracer)) {
  const tracer = bundle.tracers.tracers.find((t) => t.id === tracerId);
  if (!tracer) { fail('QP-00', `quick-picks: tanimsiz radyofarmasotik -> "${tracerId}"`); continue; }
  if (!tracer.askIcd) { fail('QP-02', `${tracerId}: askIcd=false oldugu halde hizli secim tanimlanmis`); continue; }

  for (const pick of picks) {
    if (!isWellFormedIcd(pick.code)) fail('QP-03', `${tracerId}/${pick.code}: ICD-10 bicimine uymuyor`);
    const { matched, entry } = matchCode(bundle, tracer.codeSet, pick.code);
    const set = bundle.codeSets.sets.find((s) => s.id === tracer.codeSet);
    if (!matched && set.enforcement === 'block') {
      fail('QP-01', `${tracerId}/${pick.code}: "${tracer.codeSet}" kumesinde yok; tusa basan kullanici her zaman "odenmez" alir`);
    }
    if (!matched && set.enforcement === 'warn') {
      warn('QP-01', `${tracerId}/${pick.code}: "${tracer.codeSet}" kumesinde yok; kullaniciya uyari cikacak`);
    }
    if (entry?.status && entry.status !== 'active') {
      warn('QP-04', `${tracerId}/${pick.code}: "${entry.status}" durumundaki bir koda kisayol veriliyor`);
    }
    if (pick.icon && !ICONS[pick.icon]) fail('QP-05', `${tracerId}/${pick.code}: tanimsiz ikon -> "${pick.icon}"`);
  }
}

// R-01: erisilemeyen dugum var mi
const reachable = new Set();
(function walk(nodeId) {
  if (!nodeId || reachable.has(nodeId) || !nodes.has(nodeId)) return;
  reachable.add(nodeId);
  const node = nodes.get(nodeId);
  if (node.optionsFrom === 'tracers') {
    for (const tracer of bundle.tracers.tracers) if (tracer.entryNode) walk(tracer.entryNode);
  }
  for (const option of node.options || []) {
    if (typeof option.next === 'string') walk(option.next);
    else if (option.next?.node) walk(option.next.node);
    for (const arm of option.branch || []) {
      if (typeof arm.next === 'string') walk(arm.next);
      else if (arm.next?.node) walk(arm.next.node);
    }
  }
})(bundle.rules.entryNode);

for (const node of bundle.rules.nodes) {
  if (!reachable.has(node.id)) warn('R-01', `"${node.id}" dugumune hicbir yerden ulasilamiyor (olu kural)`);
}

// M-01: tumor belirteci eslemeleri
for (const mapping of bundle.tumorMarkers.mappings) {
  for (const code of mapping.codes) {
    if (!/^[A-Z][0-9][0-9A-Z]/.test(code)) fail('M-01', `tumor-markers: gecersiz kod oneki -> "${code}"`);
  }
}
for (const override of bundle.tumorMarkers.tracerOverrides || []) {
  if (!tracerIds.has(override.tracer)) fail('M-02', `tumor-markers: tanimsiz radyofarmasotik -> "${override.tracer}"`);
}

// RV-01: klinik gozden gecirme tazeligi
const review = bundle.meta.review;
if (review?.lastClinicalReview && review?.reviewIntervalDays) {
  const ageDays = Math.floor((Date.now() - Date.parse(review.lastClinicalReview)) / 86_400_000);
  if (ageDays > review.reviewIntervalDays) {
    warn('RV-01', `Son klinik gozden gecirmenin uzerinden ${ageDays} gun gecti (hedef: ${review.reviewIntervalDays}). data/meta.json -> review.lastClinicalReview guncellenmeli.`);
  }
}

/* ------------------------------------------------------------- raporlama */

const stats = {
  dugum: bundle.rules.nodes.length,
  radyofarmasotik: bundle.tracers.tracers.length,
  'kod kumesi': bundle.codeSets.sets.length,
  'toplam kod': bundle.codeSets.sets.reduce((sum, s) => sum + s.codes.length, 0),
  'hizli secim': Object.values(bundle.quickPicks.byTracer).flat().length,
};
console.log(Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join('  |  '));

// Uyarilar basarisizlik degildir; stdout'a yazilir ki check-updates raporuna girsin.
for (const message of warnings) console.log(`UYARI  ${message}`);
for (const message of errors) console.error(`HATA   ${message}`);

if (errors.length) {
  console.error(`\n${errors.length} hata bulundu.`);
  process.exit(1);
}
console.log(`\nDogrulama temiz${warnings.length ? ` (${warnings.length} uyari)` : ''}.`);
