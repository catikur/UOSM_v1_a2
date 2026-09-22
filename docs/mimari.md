# Mimari

## Tasarim ilkesi

Tek bir kural: **klinik bilgi koda girmez.**

SUT kurallari degisir; kod degismez. Bu yuzden karar agaci, ICD kod kumeleri,
kurum sartlari ve metinler `data/*.json` icinde yasar. `src/` altindaki kod
yalnizca o veriyi yorumlar.

Bunun pratik karsiliklari:

- Veri **sema ile dogrulanabilir** ve dosyalar arasi tutarliligi denetlenebilir.
- Belgeler **veriden uretilebilir**, dolayisiyla bayatlayamaz.
- Bir esigi degistirmek icin JavaScript bilmek gerekmez.
- Kural degisiklikleri, kod degisikliklerinden ayri gozden gecirilir.

## Katmanlar

```
data/*.json          Klinik bilgi. Saf veri; fonksiyon icermez.
   │
   ├─ schema/*.json  Sema tanimlari (scripts/lib/mini-schema.mjs ile uygulanir)
   │
   ▼
src/engine.js        Karar motoru. DOM yok, ag yok, yan etki yok.
   │                 Tarayicida ve `node --test` altinda ayni kod.
   ▼
src/app.js           UI. Yalnizca cizer; klinik karar vermez.
src/icons.js         Sabit SVG tablosu.
src/styles.css       Tasarim belirtecleri.
   │
   ▼
scripts/build.mjs    Hepsini tek dosyalik index.html'e derler.
```

### `src/engine.js` — karar motoru

Saf bir durum makinesi. Disariya acilan yuzey:

| Uye | Isi |
| --- | --- |
| `new Wizard(bundle)` | Paketi alir, `start` dugumunden baslar |
| `currentView()` | Ekranda gosterilecek her seyi **cozulmus** halde dondurur |
| `choose(optionId)` | Bir secim uygular |
| `submitIcd(raw)` | Kodu normallestirir, dogrular, akisa sokar |
| `back()` / `reset()` | Tam durum anlik goruntusuyle geri alir / sifirlar |

`currentView()` sablonlari doldurulmus, kosullari degerlendirilmis, gizlenecek
secenekleri ayiklanmis bir yapi dondurur. UI katmaninin karar verecek hicbir
seyi kalmaz — testlerin UI'a hic dokunmadan tum klinik mantigi kapsayabilmesi
bu ayrimin sonucudur.

### Kosul ifadeleri

Kaynak uygulamada dallanma JavaScript fonksiyonlariyla yazilmisti:

```js
next: (s) => s.currentIcd.startsWith('C43') ? 'mm_evreleme_kriter' : {...}
```

Simdi veri olarak ifade ediliyor:

```json
{ "when": { "icdStartsWith": ["C43"] }, "next": "melanom_evreleme_kriter" }
```

Desteklenen isleçler `data/rules.json` → `predicateOps` icinde listelidir ve
`scripts/validate.mjs` → **P-01** denetimi, veride yalnizca listedekilerin
kullanildigini zorunlu kilar. Motor bilinmeyen bir islec gorurse **sessizce
gecmez**, hata firlatir.

### Parametrik dugumler

Ayni soruyu farkli baglamlarda soran dugumler tek bir tanima indirgenir:

```json
{
  "id": "common.merkez_3basamak",
  "parametric": true,
  "params": ["subject", "indication"],
  "question": "Islemin yapilacagi merkez basamagi?",
  "options": [
    { "id": "ucuncu-basamak", "outcome": { "status": "covered", "indication": "{params.indication}" } }
  ]
}
```

Cagiran taraf:

```json
{ "next": { "node": "common.merkez_3basamak",
            "params": { "subject": "Evreleme amacli PSMA PET/BT", "indication": "Baslangic evreleme" } } }
```

Bu sayede kaynak uygulamadaki alti kurum dugumu bire, dort tedavi-araligi
dugumu ikiye indi. Dogrulayici eksik (**N-05**) veya fazladan (**N-06**)
parametreyi yakalar.

## Derleme

`scripts/build.mjs` uc dosya uretir:

| Cikti | Ne ise yarar |
| --- | --- |
| `index.html` | Stil, betik ve veri anlik goruntusu icine gomulu tek dosya |
| `bundle.json` | Calisma zamaninda tazeleme icin ayni verinin ayri kopyasi |
| `manifest.webmanifest` | PWA ust verisi (veriden uretilir) |

### Neden tek dosya

`index.html` **disariya hicbir istek atmaz**. Hastane aginda, zayif baglantida
veya USB bellekten `file://` ile acildiginda tam calisir. Bu bir test ile
korunur (`index.html disariya hicbir istek atmaz`).

### Neden yeniden uretilebilir

`generatedAt` saat degil, **icerik parmak izine** baglidir: `data/build.lock.json`
icindeki hash degismediyse zaman damgasi da degismez. Ayni girdi her zaman ayni
ciktiyi verir.

Bunun kazandirdigi sey `--check` modu: CI, `index.html`'in kaynakla uyumlu
oldugunu bayt duzeyinde dogrulayabilir. Biri `data/rules.json`'i degistirip
derlemeyi unuttuysa CI yakalar.

### Modul birlestirme

`scripts/lib/bundle-modules.mjs`, uc ES modulunu tek bir IIFE'ye birlestiren
~40 satirlik bir aractir. Uretim bagimliligi tasimamak icin yazildi.

Sinirli bir sozdizimi altkumesini destekler ve **desteklemedigi bir bicim
gorurse derlemeyi durdurur** (`export default`, `export { }`, dinamik `import()`,
ciplak modul adlari). Yanlis guven olusmaz: proje bu sinirlarin disina cikarsa
derleme gurultuyle basarisiz olur, sessizce bozuk cikti uretmez.

## Calisma zamani tazeleme

Uygulama gomulu anlik goruntuyle **hemen** acilir, sonra arka planda
`bundle.json`'i ceker. Daha yeni bir `dataVersion` varsa paketi sicak degistirir
ve kullaniciya bildirir. Ag yoksa sessizce gomulu surumle devam eder.

Davranis `data/meta.json` → `runtime` altindan ayarlanir:

```json
{ "bundleUrl": "bundle.json", "autoRefresh": true,
  "refreshOnFocus": true, "refreshIntervalMinutes": 60 }
```

Sonuc: GitHub Pages'e yapilan bir yayin, acik duran sekmelere yeniden yukleme
gerektirmeden ulasir.

## Bagimliliklar

Yok. Ne uretim ne gelistirme bagimliligi var.

`package.json` icindeki `devDependencies` bos. Test kosucusu, test ifadeleri,
dosya islemleri ve HTTP istemcisi Node 20+ icinde hazir gelir. Sema
dogrulayicisi (`scripts/lib/mini-schema.mjs`) ve modul birlestirici bu depoda,
toplam ~170 satir.

Gerekcesi: bu bir klinik karar destek araci. Tedarik zinciri yuzeyini sifirda
tutmak, birkaç yuz satir bakim yukune degiyor. Ayrica CI'da `npm install`
adimi yok.
