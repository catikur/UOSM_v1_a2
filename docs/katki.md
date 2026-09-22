# Katki rehberi

## Gereksinim

Node.js 20.10 veya uzeri. Baska hicbir sey yok — `npm install` gerekmez,
bagimlilik yoktur.

## Gunluk dongu

```bash
npm run verify     # dogrula + test + derleme/belge surukleme denetimi
npm run build      # index.html, bundle.json, manifest uret
npm run docs       # veriden uretilen belgeleri tazele
npm run serve      # http://localhost:4173
```

`npm run serve` gerekir cunku `bundle.json` tazelemesi `file://` uzerinde
calismaz (tarayici `fetch`'e izin vermez).

## Commit etmeden once

```bash
npm run verify
```

Uretilen dosyalari **commit etmeyi unutmayin**: `index.html`, `bundle.json`,
`manifest.webmanifest`, `data/build.lock.json`, `docs/klinik-kurallar.md`,
`docs/icd-kodlari.md`. CI bunlarin kaynakla uyumunu bayt duzeyinde dogrular.

## Klinik degisiklikler

Kural degisikligi iceren her PR:

1. **Kaynagi gosterir.** Resmi Gazete tarih/sayi veya SUT madde numarasi.
2. **`dataVersion` degerini artirir** (`data/meta.json`).
3. **Test ekler veya gunceller.** Davranis degisiyorsa testi de degismeli.
4. **`review.lastClinicalReview` tarihini tazeler.**
5. **Belgeleri yeniden uretir** (`npm run docs`).

Kaynaktan emin degilseniz kodu silmeyin: `status: "needs-review"` ile
isaretleyip `reviewNote` yazin ve `docs/duzeltmeler.md#acik-konular` tablosuna
ekleyin. Uygulama davranisi korunur, belirsizlik gorunur olur.

## Test yazma

```js
import { walk } from './helpers.mjs';

test('FDG / evreleme / tedavi baslamadi -> uygun', () => {
  const { view } = walk(['fdg', { icd: 'C34' }, 'evreleme', 'baslamadi']);
  assert.equal(view.status, 'covered');
});
```

`walk()` bir adim dizisi alir: dizge → secenek kimligi, `{ icd: '...' }` → kod
girisi. `trace()` ayni seyi yapar ama gezilen dugum kimliklerini de dondurur
(bir adimin *sorulup sorulmadigini* dogrulamak icin).

Bir hatayi duzeltiyorsaniz once **basarisiz olan testi** yazin ve
`docs/duzeltmeler.md` icinde bir kayit acin. `test/regression.test.mjs`
icindeki her testin basligi, o belgedeki bir kayit kimligiyle baslar.

## Dosya yerlesimi

```
data/        Klinik bilgi (JSON). Degisikliklerin cogu buraya.
schema/      Veri semalari.
src/         Motor, UI, ikonlar, stil, HTML sablonu.
scripts/     Derleme, dogrulama, belge uretimi, kaynak izleme.
test/        node:test testleri.
docs/        Belgeler (bazilari uretilir).
legacy/      Orijinal tek dosyalik surum. Degistirilmez.
index.html   URETILIR. Elle duzenlemeyin.
```

## Uretilen dosyalari elle duzenlemeyin

`index.html`, `bundle.json`, `manifest.webmanifest`,
`docs/klinik-kurallar.md`, `docs/icd-kodlari.md`, `data/*.lock.json`.

Hepsi bir sonraki `npm run build` / `npm run docs` calismasinda uzerine
yazilir. Kaynagini degistirin: `src/`, `data/` veya `scripts/`.

## Kod uslubu

- Yorumlar Turkce, tanimlayicilar Ingilizce.
- Yorum *ne* yaptigini degil *neden* oyle yapildigini anlatir.
- Motor saf kalir: `src/engine.js` icinde DOM, ag veya zaman yok.
- UI klinik karar vermez: `src/app.js` yalnizca `currentView()` ciktisini cizer.
- Sessiz gecme yok: bilinmeyen kosul isleci, ikon veya sablon belirteci hata
  firlatir, varsayilana dusmez.
