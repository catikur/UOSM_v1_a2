import fs from 'node:fs';
import crypto from 'node:crypto';
import { p } from './paths.mjs';

/** JSON dosyasini okur; hatali dosyada hangi dosya oldugunu soyler. */
export function readJson(relativePath) {
  const full = p(relativePath);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    throw new Error(`${relativePath} okunamadi: ${error.message}`);
  }
}

/** data/ altindaki tum kaynak dosyalari tek bir pakete toplar. */
export function loadBundle({ generatedAt = null } = {}) {
  return {
    meta: readJson('data/meta.json'),
    rules: readJson('data/rules.json'),
    tracers: readJson('data/tracers.json'),
    codeSets: readJson('data/code-sets.json'),
    tumorMarkers: readJson('data/tumor-markers.json'),
    quickPicks: readJson('data/quick-picks.json'),
    generatedAt,
  };
}

/**
 * Paketin icerik parmak izi. `generatedAt` disarida birakilir; boylece
 * ayni veri her derlemede ayni hash'i uretir (yeniden uretilebilir derleme).
 */
export function bundleHash(bundle) {
  const { generatedAt, ...stable } = bundle;
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}
