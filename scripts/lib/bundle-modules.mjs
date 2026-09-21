import fs from 'node:fs';
import { p } from './paths.mjs';

/**
 * Cok kucuk bir ES modul birlestiricisi.
 *
 * Neden kendi yazimimiz: proje uretim bagimliligi tasimasin istiyoruz
 * (tedarik zinciri yuzeyi ve CI suresi). Karsiliginda yalnizca bu projede
 * kullandigimiz sinirli sozdizimini destekler ve desteklemedigi bir bicim
 * gorurse SESSIZCE GECMEZ, derlemeyi durdurur.
 *
 * Desteklenen: `import ... from './x.js'` (yalnizca goreli), bildirimle
 * birlikte gelen adli disa aktarimlar (`export function|class|const|let`).
 * Desteklenmeyen: `export default`, `export { ... }`, `export * from`,
 * dinamik `import()`, ciplak (bare) modul adlari.
 */
const UNSUPPORTED = [
  [/^\s*export\s+default\b/m, 'export default'],
  [/^\s*export\s*\{/m, 'export { ... }'],
  [/^\s*export\s+\*/m, 'export * from'],
  [/\bimport\s*\(/, 'dinamik import()'],
];

const IMPORT_LINE = /^\s*import\s+[^;]*?from\s+['"]([^'"]+)['"]\s*;?\s*$/gm;

export function bundleModules(entryFiles, { footer = '' } = {}) {
  const chunks = [];

  for (const file of entryFiles) {
    const source = fs.readFileSync(p(file), 'utf8');

    for (const [pattern, name] of UNSUPPORTED) {
      if (pattern.test(source)) {
        throw new Error(`${file}: bu birlestirici "${name}" bicimini desteklemiyor. Ya bicimi degistirin ya da gercek bir paketleyiciye gecin.`);
      }
    }

    for (const match of source.matchAll(IMPORT_LINE)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        throw new Error(`${file}: ciplak modul adi desteklenmiyor -> "${specifier}"`);
      }
    }

    const stripped = source
      .replace(IMPORT_LINE, '')
      .replace(/^\s*export\s+(?=(async\s+)?(function|class|const|let|var)\b)/gm, '');

    chunks.push(`/* ==== ${file} ==== */\n${stripped.trim()}\n`);
  }

  return `(function () {\n'use strict';\n\n${chunks.join('\n')}\n${footer}\n})();\n`;
}
