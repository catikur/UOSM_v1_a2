#!/usr/bin/env node
/**
 * Klinik dokumantasyonu VERIDEN uretir.
 *
 * Elle yazilan bir kural belgesi kacinilmaz olarak veriden ayrisir. Bu yuzden
 * karar agaci, kod kumeleri ve belirtec eslemeleri docs/ altina buradan
 * uretilir; CI `--check` ile uretim ciktisinin guncel oldugunu dogrular.
 *
 *   node scripts/gen-docs.mjs          # uret ve yaz
 *   node scripts/gen-docs.mjs --check  # bayatlamis mi diye bak
 */
import fs from 'node:fs';
import { p } from './lib/paths.mjs';
import { loadBundle } from './lib/data.mjs';
import { createBundle, resolveCodeSet, renderTemplate } from '../src/engine.js';

const CHECK = process.argv.includes('--check');
const bundle = createBundle(loadBundle());
const nodes = new Map(bundle.rules.nodes.map((n) => [n.id, n]));

const BANNER = '<!-- BU DOSYA URETILMISTIR. Elle duzenlemeyin; `npm run docs` calistirin. -->';

/** Mermaid etiketleri icinde sorun cikaran karakterleri temizler. */
const mermaidLabel = (text) => String(text).replace(/"/g, "'").replace(/[\r\n]+/g, ' ').replace(/[[\]{}()]/g, '').trim();
const short = (text, limit = 46) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text);

/** Parametreleri yerine koyarak bir dugumun okunur halini uretir. */
function instantiate(nodeId, params) {
  const node = nodes.get(nodeId);
  const ctx = { params, code: 'ICD', codeLabel: '', tracer: '', tracerCode: '', marker: { label: 'Tumor belirteci artisi', list: '' } };
  return {
    node,
    question: renderTemplate(node.question, ctx),
    hint: node.hint ? renderTemplate(node.hint, ctx) : null,
    options: (node.options || []).map((option) => ({
      raw: option,
      label: renderTemplate(option.label, ctx),
      note: option.note ? renderTemplate(option.note, ctx) : null,
      visibleWhen: option.visibleWhen,
      outcome: option.outcome && {
        status: option.outcome.status,
        indication: option.outcome.indication ? renderTemplate(option.outcome.indication, ctx) : null,
        reason: option.outcome.reason ? renderTemplate(option.outcome.reason, ctx) : null,
      },
      branch: option.branch,
      next: option.next,
    })),
  };
}

const describePredicate = (pred) => {
  if (!pred) return null;
  if (pred.icdStartsWith) return `ICD kodu ${pred.icdStartsWith.map((c) => `\`${c}\``).join(' / ')} ile basliyorsa`;
  if (pred.tracerIs) return `radyofarmasotik ${pred.tracerIs.join(' / ')} ise`;
  if (pred.facilityIs) return `kurum ${pred.facilityIs.join(' / ')} ise`;
  if (pred.not) return `degilse: ${describePredicate(pred.not)}`;
  if (pred.allOf) return pred.allOf.map(describePredicate).join(' VE ');
  if (pred.anyOf) return pred.anyOf.map(describePredicate).join(' VEYA ');
  return JSON.stringify(pred);
};

/* ------------------------------------------------ metin agaci uretimi */

function renderTree(nodeId, params, depth, out, seen) {
  const key = `${nodeId}:${JSON.stringify(params)}`;
  const pad = '  '.repeat(depth);
  if (seen.has(key)) { out.push(`${pad}- _(yukarida tanimlanan \`${nodeId}\` adimina doner)_`); return; }
  seen.add(key);

  const view = instantiate(nodeId, params);
  out.push(`${pad}- **${view.question}**${view.node.parametric ? ` _(parametrik dugum \`${nodeId}\`)_` : ''}`);
  if (view.hint) out.push(`${pad}  - _${view.hint}_`);

  for (const option of view.options) {
    const condition = option.visibleWhen ? ` _(yalnizca ${describePredicate(option.visibleWhen)})_` : '';
    out.push(`${pad}  - ${option.label}${condition}`);
    if (option.note) out.push(`${pad}    - _${option.note}_`);

    if (option.outcome) {
      out.push(`${pad}    - ${formatOutcome(option.outcome)}`);
    } else if (option.branch) {
      for (const arm of option.branch) {
        const when = arm.when ? `${describePredicate(arm.when)}` : 'diger tum durumlarda';
        out.push(`${pad}    - ${when}:`);
        if (arm.outcome) out.push(`${pad}      - ${formatOutcome(arm.outcome)}`);
        else renderTree(targetOf(arm.next), paramsOf(arm.next, params), depth + 3, out, seen);
      }
    } else if (option.next) {
      renderTree(targetOf(option.next), paramsOf(option.next, params), depth + 2, out, seen);
    }
  }
}

const targetOf = (next) => (typeof next === 'string' ? next : next.node);
const paramsOf = (next, parentParams) => {
  if (typeof next === 'string') return {};
  const ctx = { params: parentParams };
  return Object.fromEntries(Object.entries(next.params || {}).map(([k, v]) => [k, renderTemplate(v, ctx)]));
};

const formatOutcome = (outcome) =>
  outcome.status === 'covered'
    ? `**UYGUN** — bildirilecek endikasyon: _${outcome.indication}_`
    : `**KAPSAM DISI** — ${outcome.reason}`;

/* --------------------------------------------------- mermaid uretimi */

function renderMermaid(entryNodeId, tracerLabel) {
  const lines = ['```mermaid', 'flowchart TD'];
  const ids = new Map();
  let counter = 0;
  const idFor = (key) => {
    if (!ids.has(key)) ids.set(key, `n${counter++}`);
    return ids.get(key);
  };

  const seen = new Set();
  (function walk(nodeId, params) {
    const key = `${nodeId}:${JSON.stringify(params)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const view = instantiate(nodeId, params);
    const from = idFor(key);
    lines.push(`  ${from}["${mermaidLabel(short(view.question, 52))}"]`);

    for (const option of view.options) {
      const edge = mermaidLabel(short(option.label, 40));

      if (option.outcome) {
        const leaf = `${from}_${mermaidLabel(option.raw.id).replace(/\W/g, '')}`;
        const text = option.outcome.status === 'covered' ? `UYGUN: ${short(option.outcome.indication || '', 34)}` : 'KAPSAM DISI';
        lines.push(`  ${leaf}(["${mermaidLabel(text)}"])`);
        lines.push(`  ${from} -->|"${edge}"| ${leaf}`);
        lines.push(`  class ${leaf} ${option.outcome.status === 'covered' ? 'ok' : 'no'};`);
      } else if (option.branch) {
        for (const [i, arm] of option.branch.entries()) {
          const guard = arm.when ? mermaidLabel(short(describePredicate(arm.when), 34)) : 'diger';
          if (arm.outcome) {
            const leaf = `${from}_b${i}`;
            const text = arm.outcome.status === 'covered' ? `UYGUN: ${short(arm.outcome.indication || '', 30)}` : 'KAPSAM DISI';
            lines.push(`  ${leaf}(["${mermaidLabel(text)}"])`);
            lines.push(`  ${from} -->|"${edge} / ${guard}"| ${leaf}`);
            lines.push(`  class ${leaf} ${arm.outcome.status === 'covered' ? 'ok' : 'no'};`);
          } else {
            const childParams = paramsOf(arm.next, params);
            walk(targetOf(arm.next), childParams);
            lines.push(`  ${from} -->|"${edge} / ${guard}"| ${idFor(`${targetOf(arm.next)}:${JSON.stringify(childParams)}`)}`);
          }
        }
      } else if (option.next) {
        const childParams = paramsOf(option.next, params);
        walk(targetOf(option.next), childParams);
        lines.push(`  ${from} -->|"${edge}"| ${idFor(`${targetOf(option.next)}:${JSON.stringify(childParams)}`)}`);
      }
    }
  })(entryNodeId, {});

  lines.push('  classDef ok fill:#d1fae5,stroke:#059669,color:#064e3b;');
  lines.push('  classDef no fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;');
  lines.push('```');
  return lines.join('\n');
}

/* ------------------------------------------------------ belge: kurallar */

function buildClinicalDoc() {
  const out = [];
  const rev = bundle.meta.regulation.trackedRevision;

  out.push(BANNER, '');
  out.push('# Klinik kurallar');
  out.push('');
  out.push(`Bu belge \`data/rules.json\`, \`data/tracers.json\` ve \`data/code-sets.json\` dosyalarindan uretilir.`);
  out.push(`Uygulamanin gercekte calistirdigi kurallarla birebir aynidir.`);
  out.push('');
  out.push(`- **Izlenen revizyon:** ${rev.label} (yururluk ${rev.effectiveDate}${rev.gazetteNumber ? `, R.G. ${rev.gazetteNumber}` : ''})`);
  out.push(`- **Veri surumu:** \`${bundle.meta.dataVersion}\``);
  out.push('');
  out.push(`> ${bundle.meta.disclaimer.long}`);
  out.push('');

  out.push('## Radyofarmasotikler');
  out.push('');
  out.push('| Tetkik | SUT kodu | Kapsam | ICD kod kumesi | Baslangic adimi |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const tracer of [...bundle.tracers.tracers].sort((a, b) => a.order - b.order)) {
    out.push(`| ${tracer.label} | ${tracer.sutCode ? `\`${tracer.sutCode}\`` : '—'} | ${tracer.covered ? 'Odenir' : '**Odenmez**'} | ${tracer.codeSet ? `\`${tracer.codeSet}\`` : '—'} | ${tracer.entryNode ? `\`${tracer.entryNode}\`` : '—'} |`);
  }
  out.push('');

  for (const tracer of [...bundle.tracers.tracers].sort((a, b) => a.order - b.order)) {
    out.push(`## ${tracer.label}`);
    out.push('');
    out.push(tracer.summary);
    out.push('');

    if (!tracer.covered) {
      out.push(`**Sonuc:** KAPSAM DISI — ${tracer.notCoveredOutcome.reason}`);
      out.push('');
      continue;
    }

    if (tracer.askIcd) {
      const set = resolveCodeSet(bundle, tracer.codeSet);
      out.push(`**ICD-10 on kosulu:** \`${set.id}\` kumesi, ${set.codes.length} kod, `
        + `${set.enforcement === 'block' ? 'eslesmeyen kod **reddedilir**' : 'eslesmeyen kod **uyari** uretir fakat akis surer'}.`);
      out.push('');
    }

    out.push('### Karar akisi');
    out.push('');
    renderTree(tracer.entryNode, {}, 0, out, new Set());
    out.push('');
    out.push('### Akis semasi');
    out.push('');
    out.push(renderMermaid(tracer.entryNode, tracer.label));
    out.push('');
  }

  out.push('## Tumor belirteci eslemesi');
  out.push('');
  out.push('Yeniden evreleme adiminda secenek metni, girilen ICD koduna gore kisisellestirilir.');
  out.push('');
  out.push('| ICD onekleri | Belirtecler |');
  out.push('| --- | --- |');
  for (const mapping of bundle.tumorMarkers.mappings) {
    out.push(`| ${mapping.codes.map((c) => `\`${c}\``).join(', ')} | ${mapping.markers.join(', ')} |`);
  }
  out.push(`| _(eslesme yok)_ | ${bundle.tumorMarkers.default.label} |`);
  out.push('');

  return `${out.join('\n')}\n`;
}

/* ---------------------------------------------------- belge: kodlar */

function buildCodeDoc() {
  const out = [BANNER, '', '# ICD-10 kod kumeleri', ''];
  out.push('Eslestirme **onek** mantigiyla yapilir: girilen kod kumede bir kodla basliyorsa eslesir (`C34.1` → `C34`). En uzun onek kazanir.');
  out.push('');
  out.push('Durum etiketleri:');
  out.push('');
  for (const [status, meaning] of Object.entries(bundle.codeSets.statusMeanings)) {
    out.push(`- \`${status}\` — ${meaning}`);
  }
  out.push('');

  for (const set of bundle.codeSets.sets) {
    const resolved = resolveCodeSet(bundle, set.id);
    out.push(`## \`${set.id}\``);
    out.push('');
    out.push(`${set.label}`);
    out.push('');
    out.push(`- **Uygulama:** ${set.enforcement === 'block' ? 'eslesmeyen kod reddedilir' : 'eslesmeyen kod uyari uretir, akis surer'}`);
    if (set.extends?.length) out.push(`- **Genisletir:** ${set.extends.map((id) => `\`${id}\``).join(', ')}`);
    out.push(`- **Toplam kod (miras dahil):** ${resolved.codes.length}`);
    out.push('');

    const own = set.codes;
    if (own.length) {
      out.push('| Kod | Tanim | Grup | Durum |');
      out.push('| --- | --- | --- | --- |');
      for (const entry of own) {
        out.push(`| \`${entry.code}\` | ${entry.label} | ${entry.group || '—'} | ${entry.status && entry.status !== 'active' ? `**${entry.status}**` : 'active'} |`);
      }
      out.push('');
    }

    const flagged = own.filter((c) => c.status && c.status !== 'active');
    if (flagged.length) {
      out.push('### Dogrulanmayi bekleyenler');
      out.push('');
      for (const entry of flagged) out.push(`- \`${entry.code}\` — ${entry.reviewNote}`);
      out.push('');
    }
  }
  return `${out.join('\n')}\n`;
}

/* ------------------------------------------------------------ yazma */

const outputs = {
  'docs/klinik-kurallar.md': buildClinicalDoc(),
  'docs/icd-kodlari.md': buildCodeDoc(),
};

if (CHECK) {
  const stale = Object.entries(outputs).filter(([file, content]) => {
    let current = null;
    try { current = fs.readFileSync(p(file), 'utf8'); } catch { /* eksik */ }
    return current !== content;
  });
  if (stale.length) {
    console.error('Uretilen belgeler bayat:');
    for (const [file] of stale) console.error(`  - ${file}`);
    console.error('\nDuzeltmek icin: npm run docs');
    process.exit(1);
  }
  console.log('Uretilen belgeler guncel.');
} else {
  for (const [file, content] of Object.entries(outputs)) {
    fs.writeFileSync(p(file), content, 'utf8');
    console.log(`${file}  ${(Buffer.byteLength(content) / 1024).toFixed(1)} kB`);
  }
}
