/**
 * Gerileme (regression) testleri.
 *
 * Her test, kaynak HTML'de tespit edilen somut bir hatayi sabitler.
 * Kimlikler docs/duzeltmeler.md icindeki kayitlarla birebir eslesir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walk, trace, newWizard, bundle } from './helpers.mjs';
import { matchCode, isWellFormedIcd } from '../src/engine.js';

test('H-01: yatakli radyonuklid tedavi unitesi olan ozel hastane PSMA tedavi planlamasinda uygun', () => {
  // Eski davranis: akisin basindaki "Merkez Basamak Turu?" sorusu ozel hastaneyi
  // daha ICD girilmeden reddediyordu. Oysa tedavi planlamasinda, yatakli
  // radyonuklid tedavi unitesi olan ozel hastaneler de fatura edebiliyor.
  const { view } = walk(['psma', { icd: 'C61' }, 'tedavi', 'tedavi-unitesi']);
  assert.equal(view.status, 'covered');
  assert.match(view.indication, /Radyonuklid tedavi planlamasi/);
});

test('H-02: kurum basamagi akis boyunca yalnizca bir kez sorulur', () => {
  const facilityNodes = ['common.merkez_3basamak', 'psma_tedavi_merkez', 'beyin_demans_rapor'];
  for (const steps of [
    ['psma', { icd: 'C61' }, 'evreleme', 'ucuncu-basamak'],
    ['psma', { icd: 'C61' }, 'nuks', 'ucuncu-basamak'],
    ['dota', { icd: 'C7A' }, 'tanili', 'ucuncu-basamak'],
    ['brain', { icd: 'G40' }, 'epilepsi', 'ucuncu-basamak'],
  ]) {
    const { seen } = trace(steps);
    const asked = seen.filter((id) => facilityNodes.includes(id));
    assert.equal(asked.length, 1, `${steps[0]} akisinda kurum sorusu ${asked.length} kez soruldu: ${seen.join(' > ')}`);
  }
});

test('H-03: kemik PET (NaF) hizli secimindeki C61 kabul edilir', () => {
  // Eski davranis: "Prostat (C61)" tusuna basan kullanici her zaman
  // "SGK Odemez" aliyordu, cunku C61 dogrulama listesinde yoktu.
  const wizard = newWizard();
  wizard.choose('naf');
  const result = wizard.submitIcd('C61');
  assert.equal(result.ok, true);
  assert.equal(result.view.kind, 'question', 'akis devam etmeli, sonuc ekranina dusmemeli');
  assert.equal(walk(['naf', { icd: 'C61' }, 'uygun']).view.status, 'covered');
});

test('H-03: her hizli secim kodu kendi kod kumesinde eslesmeli', () => {
  for (const [tracerId, picks] of Object.entries(bundle.quickPicks.byTracer)) {
    const tracer = bundle.tracers.tracers.find((t) => t.id === tracerId);
    const set = bundle.codeSets.sets.find((s) => s.id === tracer.codeSet);
    for (const pick of picks) {
      const { matched } = matchCode(bundle, tracer.codeSet, pick.code);
      if (set.enforcement === 'block') {
        assert.ok(matched, `${tracerId}/${pick.code} engelleyici kumede eslesmeli`);
      }
    }
  }
});

test('H-04: PSA yuksekligi kisayolu R97.2 kodunu kullanir', () => {
  // R39.1 idrar yapma guclugu kodudur; yukselmis PSA'nin karsiligi R97.2'dir.
  const psa = bundle.quickPicks.byTracer.psma.find((p) => /PSA/i.test(p.label));
  assert.equal(psa.code, 'R97.2');
  const wizard = newWizard();
  wizard.choose('psma');
  assert.equal(wizard.submitIcd('R97.2').view.kind, 'question');
});

test('H-04: eski R39 kodu geriye donuk uyumluluk icin kabul edilir ama uyarir', () => {
  const wizard = newWizard();
  wizard.choose('psma');
  const result = wizard.submitIcd('R39.1');
  assert.equal(result.view.kind, 'question');
  assert.ok(wizard.state.warnings.some((w) => /R39/.test(w)), 'R39 icin uyari uretilmeli');
});

test('H-05: beyin PET onkolojik kodla uyarir (eskiden sessizce kabul ediyordu)', () => {
  const wizard = newWizard();
  wizard.choose('brain');
  const result = wizard.submitIcd('C34');
  assert.equal(result.ok, true, 'warn kumesi akisi engellemez');
  assert.ok(wizard.state.warnings.length > 0, 'beklenmeyen tani grubu icin uyari cikmali');
  assert.match(wizard.state.warnings[0], /beklenen norolojik tani kumesinde degil/);
});

test('H-05: DOTATATE beklenmeyen kodla uyarir', () => {
  const wizard = newWizard();
  wizard.choose('dota');
  wizard.submitIcd('C50');
  assert.ok(wizard.state.warnings.some((w) => /noroendokrin/.test(w)));
});

test('H-06: gizlenen secenek numaralandirmada bosluk birakmaz', () => {
  // Eski surumde etiketler "1." ... "5." diye elle numaralanmisti; 4. secenek
  // gizlendiginde kullanici 1,2,3,5 goruyordu.
  const wizard = newWizard();
  wizard.choose('fdg'); wizard.submitIcd('C34'); wizard.choose('yeniden');
  for (const option of wizard.currentView().options) {
    assert.ok(!/^\d+\./.test(option.label), `secenek etiketi elle numaralanmamali: "${option.label}"`);
  }
});

test('H-07: dogrulanmamis M95 kodu kullaniciya uyari olarak yansir', () => {
  const wizard = newWizard();
  wizard.choose('fdg');
  wizard.submitIcd('M95');
  assert.ok(wizard.state.warnings.some((w) => /M95/.test(w) && /dogrulanmayi bekliyor/.test(w)));
});

test('T-01: bicim disi / betik iceren ICD girisi akisa hic girmez', () => {
  const payloads = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', 'C34<b>', "'; DROP TABLE"];
  for (const payload of payloads) {
    const wizard = newWizard();
    wizard.choose('fdg');
    const result = wizard.submitIcd(payload);
    assert.equal(result.ok, false, `"${payload}" reddedilmeliydi`);
    assert.equal(wizard.state.code, '', 'reddedilen girdi duruma yazilmamali');
    assert.equal(wizard.currentView().kind, 'icd', 'kullanici giris ekraninda kalmali');
    assert.ok(!isWellFormedIcd(payload));
  }
});

test('T-02: geri alma ICD ve kurum durumunu da geri sarar', () => {
  // Eski surumde geri gidildiginde currentIcd/petType duruma yapisik kaliyordu.
  const wizard = newWizard();
  wizard.choose('fdg');
  wizard.submitIcd('C43');
  assert.equal(wizard.state.code, 'C43');

  wizard.back();
  assert.equal(wizard.state.code, '', 'geri alinca kod temizlenmeli');
  assert.equal(wizard.currentView().kind, 'icd');

  wizard.submitIcd('C50');
  wizard.choose('evreleme');
  wizard.choose('baslamadi');
  assert.equal(wizard.currentView().status, 'covered', 'C50 melanom kolu ACMAMALI');
  assert.equal(wizard.currentView().indication, 'Evreleme');
});

test('T-02: geri alma izlenen yolu da kisaltir', () => {
  const wizard = newWizard();
  wizard.choose('fdg');
  wizard.submitIcd('C34');
  wizard.choose('evreleme');
  assert.equal(wizard.currentView().trail.length, 3);
  wizard.back();
  assert.equal(wizard.currentView().trail.length, 2);
  wizard.back();
  assert.equal(wizard.currentView().trail.length, 1);
  wizard.back();
  assert.equal(wizard.currentView().trail.length, 0);
  assert.equal(wizard.canGoBack, false);
});

test('T-02: reset her sey temiz baslar', () => {
  const wizard = newWizard();
  wizard.choose('fdg'); wizard.submitIcd('C34'); wizard.choose('evreleme'); wizard.choose('baslamadi');
  wizard.reset();
  const view = wizard.currentView();
  assert.equal(view.kind, 'question');
  assert.equal(view.nodeId, 'start');
  assert.equal(wizard.state.code, '');
  assert.equal(wizard.state.outcome, null);
  assert.equal(wizard.canGoBack, false);
});

test('T-03: sonuc durumu dugum arama tablosuna hic sorulmaz', () => {
  // Eski kodda state.step bir nesne olabiliyor ve flow[state.step] ile
  // "[object Object]" anahtari aranarak undefined donuyordu.
  const wizard = newWizard();
  wizard.choose('fapi');
  assert.equal(wizard.state.nodeId, 'start', 'sonuc nodeId degil outcome alanina yazilmali');
  assert.ok(wizard.state.outcome);
  assert.equal(wizard.currentView().kind, 'result');
});
