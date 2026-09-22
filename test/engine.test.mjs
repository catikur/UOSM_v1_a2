import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeIcd, isWellFormedIcd, renderTemplate, evaluatePredicate,
  resolveCodeSet, matchCode, resolveMarker,
} from '../src/engine.js';
import { bundle, newWizard } from './helpers.mjs';

test('normalizeIcd bosluk, ayrac ve kucuk harfi temizler', () => {
  assert.equal(normalizeIcd('  c34 '), 'C34');
  assert.equal(normalizeIcd('c-50.9'), 'C50.9');
  assert.equal(normalizeIcd('e21 0'), 'E210');
  assert.equal(normalizeIcd(null), '');
});

test('normalizeIcd Turkce harfleri ASCII karsiligina cevirir', () => {
  // Turkce klavyede 'ı' ve 'İ' ICD kodlarinda yanlislikla uretilebiliyor.
  assert.equal(normalizeIcd('ı21'), 'I21');
  assert.equal(normalizeIcd('İ21'), 'I21');
});

test('isWellFormedIcd bicim denetimi yapar', () => {
  for (const good of ['C34', 'C50.9', 'E21.0', 'R97.2', 'C7A', 'D3A', 'G40']) {
    assert.ok(isWellFormedIcd(good), `${good} gecerli olmaliydi`);
  }
  for (const bad of ['', 'C', 'C3', 'HELLO', '34C', 'C34..1', '<IMG SRC=X>']) {
    assert.ok(!isWellFormedIcd(bad), `${bad} gecersiz olmaliydi`);
  }
});

test('renderTemplate bilinen belirtecleri doldurur, bilinmeyeni korur', () => {
  const ctx = { code: 'C34', params: { indication: 'Evreleme' }, marker: { label: 'CEA artisi' } };
  assert.equal(renderTemplate('Kod: {code}', ctx), 'Kod: C34');
  assert.equal(renderTemplate('{params.indication}', ctx), 'Evreleme');
  assert.equal(renderTemplate('{marker.label}', ctx), 'CEA artisi');
  assert.equal(renderTemplate('{bilinmeyen}', ctx), '{bilinmeyen}');
});

test('evaluatePredicate mantiksal isleclari degerlendirir', () => {
  const ctx = { code: 'C43.1', tracerId: 'fdg' };
  assert.ok(evaluatePredicate({ icdStartsWith: ['C43'] }, ctx));
  assert.ok(!evaluatePredicate({ icdStartsWith: ['C50'] }, ctx));
  assert.ok(evaluatePredicate({ allOf: [{ icdStartsWith: ['C43'] }, { tracerIs: ['fdg'] }] }, ctx));
  assert.ok(evaluatePredicate({ not: { tracerIs: ['psma'] } }, ctx));
  assert.ok(evaluatePredicate(null, ctx), 'kosul yoksa gorunur kabul edilir');
});

test('evaluatePredicate bilinmeyen isleci sessizce gecmez', () => {
  assert.throws(() => evaluatePredicate({ uydurmaislec: [1] }, {}), /Bilinmeyen kosul isleci/);
});

test('resolveCodeSet extends zincirini birlestirir', () => {
  const base = resolveCodeSet(bundle, 'tablo-1');
  const derived = resolveCodeSet(bundle, 'naf-onkolojik');
  assert.equal(derived.codes.length, base.codes.length + 1, 'naf kumesi tablo-1 + C61 olmali');
  assert.ok(derived.codes.some((c) => c.code === 'C61'));
  assert.ok(derived.codes.some((c) => c.code === 'C34'), 'miras alinan kodlar korunmali');
});

test('matchCode en uzun oneki secer', () => {
  assert.equal(matchCode(bundle, 'tablo-1', 'C349').entry.code, 'C34');
  assert.equal(matchCode(bundle, 'tablo-1', 'C34.1').entry.code, 'C34');
  assert.equal(matchCode(bundle, 'net-tanilar', 'C7A').entry.code, 'C7A');
  assert.equal(matchCode(bundle, 'tablo-1', 'C99').matched, false);
});

test('resolveMarker ICD koduna gore belirtec secer', () => {
  assert.match(resolveMarker(bundle, 'C50.9', 'fdg').label, /CA 15-3/);
  assert.match(resolveMarker(bundle, 'C18', 'fdg').label, /CA 19-9/);
  assert.equal(resolveMarker(bundle, 'C99', 'fdg').label, bundle.tumorMarkers.default.label);
});

test('Wizard basta start dugumunde ve geri alinamaz durumda', () => {
  const wizard = newWizard();
  const view = wizard.currentView();
  assert.equal(view.kind, 'question');
  assert.equal(view.nodeId, 'start');
  assert.equal(wizard.canGoBack, false);
  assert.equal(view.options.length, bundle.tracers.tracers.length);
});

test('Wizard tanimsiz secenekte hata firlatir', () => {
  assert.throws(() => newWizard().choose('olmayan-secenek'), /Tanimsiz secenek/);
});
