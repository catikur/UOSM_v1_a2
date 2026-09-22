import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walk, trace, newWizard } from './helpers.mjs';

test('FDG / evreleme / tedavi baslamadi -> uygun', () => {
  const { view } = walk(['fdg', { icd: 'C34' }, 'evreleme', 'baslamadi']);
  assert.equal(view.kind, 'result');
  assert.equal(view.status, 'covered');
  assert.equal(view.indication, 'Evreleme');
  assert.equal(view.code, 'C34');
  assert.equal(view.codeEntry.label, 'Brons ve akciger malign neoplazmi');
});

test('FDG / evreleme / tedavi basladi -> kapsam disi', () => {
  const { view } = walk(['fdg', { icd: 'C34' }, 'evreleme', 'basladi']);
  assert.equal(view.status, 'not-covered');
  assert.match(view.reason, /tedavi oncesinde/);
});

test('FDG / melanom evrelemesi ek kriter dugumune dallanir', () => {
  const { seen, view } = trace(['fdg', { icd: 'C43' }, 'evreleme', 'baslamadi']);
  assert.ok(seen.includes('melanom_evreleme_kriter'), 'C43 icin ek kriter sorulmali');
  assert.equal(view.kind, 'question');

  const covered = walk(['fdg', { icd: 'C43' }, 'evreleme', 'baslamadi', 'saglaniyor']);
  assert.equal(covered.view.status, 'covered');
  assert.match(covered.view.indication, /malign melanom/);

  const rejected = walk(['fdg', { icd: 'C43' }, 'evreleme', 'baslamadi', 'saglanmiyor']);
  assert.equal(rejected.view.status, 'not-covered');
  assert.match(rejected.view.reason, /Breslow/);
});

test('FDG / melanom disi kod ek kriter sormaz', () => {
  const { seen } = trace(['fdg', { icd: 'C50' }, 'evreleme', 'baslamadi']);
  assert.ok(!seen.includes('melanom_evreleme_kriter'));
});

test('FDG / tani kitle boyutu kurallari', () => {
  assert.equal(walk(['fdg', { icd: 'C34' }, 'tani', 'buyuk']).view.status, 'covered');
  assert.equal(walk(['fdg', { icd: 'C34' }, 'tani', 'kucuk']).view.status, 'not-covered');
  assert.equal(walk(['fdg', { icd: 'C34' }, 'tani', 'tarama']).view.status, 'not-covered');
});

test('FDG / kemoterapi yaniti protokol degisikligi sartina bagli', () => {
  assert.equal(walk(['fdg', { icd: 'C18' }, 'yanit', 'kemo', 'uygun']).view.status, 'covered');
  assert.equal(walk(['fdg', { icd: 'C18' }, 'yanit', 'kemo', 'protokol-ayni']).view.status, 'not-covered');
  assert.equal(walk(['fdg', { icd: 'C18' }, 'yanit', 'kemo', 'sure-kisa']).view.status, 'not-covered');
});

test('FDG / parametrik sure dugumu her tedavi icin dogru metni uretir', () => {
  const rt = newWizard();
  ['fdg'].forEach((s) => rt.choose(s));
  rt.submitIcd('C34');
  rt.choose('yanit');
  rt.choose('rt');
  const view = rt.currentView();
  assert.match(view.question, /Radyoterapi uzerinden/);
  assert.equal(view.options[0].label, '3 ay veya daha fazla gecti');

  const radio = newWizard();
  radio.choose('fdg');
  radio.submitIcd('C34');
  radio.choose('yanit');
  radio.choose('radyonuklid');
  assert.match(radio.currentView().question, /Radyonuklid tedavi uzerinden/);
  assert.equal(radio.currentView().options[0].label, '1 ay veya daha fazla gecti');

  const rejected = walk(['fdg', { icd: 'C34' }, 'yanit', 'radyonuklid', 'sure-kisa']);
  assert.match(rejected.view.reason, /en az 1 ay/);
});

test('FDG / yeniden evreleme belirtec metni ICD koduna gore degisir', () => {
  const meme = newWizard();
  meme.choose('fdg'); meme.submitIcd('C50'); meme.choose('yeniden');
  const memeOption = meme.currentView().options.find((o) => o.id === 'markir');
  assert.match(memeOption.label, /CA 15-3/);
  assert.match(memeOption.note, /C50/);

  const over = newWizard();
  over.choose('fdg'); over.submitIcd('C56'); over.choose('yeniden');
  assert.match(over.currentView().options.find((o) => o.id === 'markir').label, /CA 125/);
});

test('FDG / rutin izlem secenegi yalnizca melanom ve lenfomada gorunur', () => {
  const lenfoma = newWizard();
  lenfoma.choose('fdg'); lenfoma.submitIcd('C81'); lenfoma.choose('yeniden');
  assert.ok(lenfoma.currentView().options.some((o) => o.id === 'rutin-izlem'));

  const akciger = newWizard();
  akciger.choose('fdg'); akciger.submitIcd('C34'); akciger.choose('yeniden');
  assert.ok(!akciger.currentView().options.some((o) => o.id === 'rutin-izlem'));
});

test('PSMA / evreleme 3. basamakta uygun, 2. basamakta degil', () => {
  assert.equal(walk(['psma', { icd: 'C61' }, 'evreleme', 'ucuncu-basamak']).view.status, 'covered');
  const rejected = walk(['psma', { icd: 'C61' }, 'evreleme', 'ikinci-basamak']);
  assert.equal(rejected.view.status, 'not-covered');
  assert.match(rejected.view.reason, /Evreleme amacli PSMA PET\/BT yalnizca 3\. Basamak/);
});

test('DOTATATE / tanili NET 3. basamakta uygun', () => {
  const { view } = walk(['dota', { icd: 'C7A' }, 'tanili', 'ucuncu-basamak']);
  assert.equal(view.status, 'covered');
  assert.equal(view.indication, 'Evreleme / yeniden evreleme');
});

test('Kolin / MIBI negatif sarti', () => {
  assert.equal(walk(['choline', { icd: 'E21.0' }, 'uygun']).view.status, 'covered');
  assert.equal(walk(['choline', { icd: 'E21.0' }, 'uygun-degil']).view.status, 'not-covered');
});

test('Kemik PET / rapor sarti', () => {
  assert.equal(walk(['naf', { icd: 'C50' }, 'uygun']).view.status, 'covered');
  assert.equal(walk(['naf', { icd: 'C50' }, 'uygun-degil']).view.status, 'not-covered');
});

test('Beyin PET / epilepsi ve demans kollari', () => {
  assert.equal(walk(['brain', { icd: 'G40' }, 'epilepsi', 'ucuncu-basamak']).view.status, 'covered');
  assert.equal(walk(['brain', { icd: 'G30' }, 'demans', 'uygun']).view.status, 'covered');
  assert.equal(walk(['brain', { icd: 'G30' }, 'demans', 'uygun-degil']).view.status, 'not-covered');
});

test('FAPI dogrudan kapsam disi doner ve ICD sormaz', () => {
  const { view } = walk(['fapi']);
  assert.equal(view.kind, 'result');
  assert.equal(view.status, 'not-covered');
  assert.match(view.reason, /FAPI/);
});

test('Tablo-1 disi kod FDG icin reddedilir', () => {
  const wizard = newWizard();
  wizard.choose('fdg');
  const result = wizard.submitIcd('C61');
  assert.equal(result.ok, true, 'akis devam eder, sonuc olarak reddedilir');
  assert.equal(result.view.status, 'not-covered');
  assert.match(result.view.reason, /Tablo-1/);
});

test('Sonuc SUT dayanagini cozulmus halde tasir', () => {
  const { view } = walk(['fdg', { icd: 'C34' }, 'evreleme', 'baslamadi']);
  assert.ok(view.sutRefs.length > 0);
  assert.match(view.sutRefs[0].label, /SUT 2\.4\.4\.I/);
});
