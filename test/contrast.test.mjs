/**
 * Renk kontrasti gerileme testi.
 *
 * Belirtec degerleri src/styles.css'ten okunur; boylece test stil dosyasiyla
 * birlikte yasar. Kucuk punto etiketlerin (WCAG AA: 4.5:1) ve dekoratif
 * ogelerin (3:1) esikleri ayri ayri denetlenir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { p } from '../scripts/lib/paths.mjs';

const css = fs.readFileSync(p('src/styles.css'), 'utf8');

/** Belirli bir secici blogundaki belirtec degerlerini cikarir. */
function tokensFor(selector) {
  const block = css.slice(css.indexOf(selector));
  const body = block.slice(block.indexOf('{') + 1, block.indexOf('}'));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const light = tokensFor(':root {');
const dark = tokensFor(":root[data-theme='dark'],");

const srgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex) => {
  const [r, g, b] = srgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Metin ciftleri: [aciklama, on plan belirteci, arka plan belirteci] */
const TEXT_PAIRS = [
  ['govde metni', '--text', '--surface'],
  ['ikincil metin', '--text-muted', '--surface'],
  ['kart ustu ikincil metin', '--text-muted', '--surface-muted'],
  ['cokuk yuzey ustu ikincil metin', '--text-muted', '--surface-sunken'],
  ['vurgu metni (ICD kodu)', '--accent-text', '--surface-muted'],
];

for (const [theme, tokens] of [['acik', light], ['koyu', dark]]) {
  test(`${theme} tema: metin kontrasti WCAG AA (4.5:1) esigini geciyor`, () => {
    for (const [label, fg, bg] of TEXT_PAIRS) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(ratio >= 4.5, `${theme}/${label}: ${tokens[fg]} uzerine ${tokens[bg]} = ${ratio.toFixed(2)}:1 (>= 4.5 olmali)`);
    }
  });

  test(`${theme} tema: dekoratif ogeler 3:1 esigini geciyor`, () => {
    const ratio = contrast(tokens['--text-faint'], tokens['--surface']);
    assert.ok(ratio >= 3, `${theme}: --text-faint ${ratio.toFixed(2)}:1 (>= 3 olmali)`);
  });

  test(`${theme} tema: sonuc renkleri okunabilir`, () => {
    for (const token of ['--ok', '--danger']) {
      const ratio = contrast(tokens[token], tokens['--surface']);
      assert.ok(ratio >= 3, `${theme}/${token}: ${ratio.toFixed(2)}:1 (baslik puntosu icin >= 3 olmali)`);
    }
  });
}

test('--text-faint yalnizca dekoratif yerlerde kullaniliyor', () => {
  // Kucuk punto ETIKET metni --text-muted kullanmali; --text-faint AA'yi gecmez.
  const uses = [...css.matchAll(/([^{}]*)\{[^}]*color:\s*var\(--text-faint\)/g)].map((m) => m[1].trim().split('\n').pop().trim());
  assert.deepEqual(uses, ['.trail__chip + .trail__chip::before'], `beklenmeyen --text-faint kullanimi: ${uses.join(', ')}`);
});
