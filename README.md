# PET/BT SGK Uygunluk Rehberi

SUT (Saglik Uygulama Tebligi) hukumlerine gore PET/BT tetkiklerinin SGK geri
odeme uygunlugunu adim adim degerlendiren karar destek araci.

Kullanici bir radyofarmasotik secer, ICD-10 tani kodunu girer ve klinik
duruma iliskin birkac soruyu yanitlar. Arac, **SGK uygun** veya **kapsam disi**
sonucunu, bildirilecek endikasyon metni ve dayanak SUT maddesiyle birlikte
dondurur.

> **Bu arac bilgilendirme amaclidir ve resmi SUT metninin yerine gecmez.**
> Sonuclar SUT'un yorumlanmasina dayanir, baglayici degildir. Nihai geri odeme
> karari SGK inceleme birimlerine aittir.

---

## Hizli baslangic

```bash
git clone https://github.com/catikur/UOSM_v1_a2.git
cd UOSM_v1_a2
npm run serve        # http://localhost:4173
```

`npm install` gerekmez — projenin **hicbir bagimliligi yoktur**. Node.js 20.10+
yeterlidir.

`index.html` tek basina da calisir: dosyayi cift tiklayip acmak yeterli.
Disariya hicbir istek atmaz, cevrimdisi tam islevseldir.

```bash
npm run verify     # dogrula + test + derleme/belge surukleme denetimi
npm run build      # index.html, bundle.json, manifest uret
npm run docs       # veriden uretilen belgeleri tazele
```

---

## Neler var

| Tetkik | SUT kodu | Kapsam |
| --- | --- | --- |
| F-18 FDG | `801.440` | Tani, evreleme, yeniden evreleme, tedavi yaniti |
| Ga-68 PSMA | `801.365` | Tani, evreleme, biyokimyasal nuks, radyonuklid tedavi |
| Ga-68 DOTATATE | — | NET tani ve evreleme |
| F-18 Kolin | — | Primer hiperparatiroidi |
| F-18 NaF (Kemik PET) | — | Kemik metastazi degerlendirmesi |
| Beyin F-18 FDG | — | Dirençli epilepsi, demans ayirici tanisi |
| FAPI PET/BT | — | **Kapsam disi** |

Her tetkikin tam karar akisi, metin ve akis semasi olarak:
**[docs/klinik-kurallar.md](docs/klinik-kurallar.md)**

---

## Nasil calisiyor

Tek bir tasarim ilkesi var: **klinik bilgi koda girmez.**

SUT kurallari degisir; kod degismez. Karar agaci, ICD kod kumeleri, kurum
sartlari ve tum metinler `data/*.json` icinde yasar. `src/` altindaki kod
yalnizca o veriyi yorumlar.

```
data/*.json      →  Klinik bilgi. Saf veri; fonksiyon icermez.
src/engine.js    →  Karar motoru. DOM yok, ag yok, yan etki yok.
src/app.js       →  UI. Yalnizca cizer; klinik karar vermez.
scripts/build.mjs → Hepsini tek dosyalik index.html'e derler.
```

Karar agaci saf veri oldugu icin:

- **Sema ile dogrulanabilir.** `npm run validate` hem alan tiplerini hem de
  dosyalar arasi capraz referanslari denetler.
- **Belgeler veriden uretilir.** `docs/klinik-kurallar.md` ve
  `docs/icd-kodlari.md` elle yazilmaz, dolayisiyla bayatlayamaz.
- **Kod degistirmeden guncellenir.** Bir esigi degistirmek icin JavaScript
  bilmek gerekmez.

Ornek: bir dallanma kosulu, fonksiyon degil veridir.

```json
{ "when": { "icdStartsWith": ["C43"] }, "next": "melanom_evreleme_kriter" }
```

Ayrinti: **[docs/mimari.md](docs/mimari.md)**

---

## Guncel tutma

Uc mekanizma, ortak bir kuralla:
**klinik kurallar kendiliginden degismez** — otomasyon degisikligi *saptar*,
veriyi insan gunceller.

| Mekanizma | Ne yapar |
| --- | --- |
| Haftalik kaynak izleme | Resmi sayfalari ceker, gurultuyu ayiklar, parmak izi degisirse `sut-watch` etiketli bir konu acar |
| `npm run check:updates` | Derleme suruklemesi, veri uyarilari, kaynak durumu, gozden gecirme tazeligi ve bekleyen kodlari tek raporda toplar |
| Calisma zamani tazeleme | Uygulama acilista gomulu veriyle baslar, arka planda `bundle.json`'i kontrol eder, daha yeni surum varsa sicak degistirir |

Ayrinti: **[docs/otomatik-guncelleme.md](docs/otomatik-guncelleme.md)**

---

## Orijinal surumden farklar

Proje, tek dosyalik bir HTML prototipinden gelistirildi. O dosya
`legacy/pet_ct_sgk_uygunluk_rehberi.original.html` icinde **degistirilmeden**
duruyor; asagidaki iddialar ona karsi dogrulanabilir.

Bulunup duzeltilen 19 sorunun tamami, neden onemli olduklari ve hangi testle
sabitlendikleri: **[docs/duzeltmeler.md](docs/duzeltmeler.md)**

En dikkat cekici uc tanesi:

- **Kemik PET'te "Prostat (C61)" tusu her zaman "odenmez" veriyordu.** Tus
  sunuluyordu ama C61 dogrulama listesinde yoktu. Artik kod kumeleri
  radyofarmasotik basina tanimli ve bir denetim (`QP-01`), sunulan her
  kisayolun kabul edilebilir oldugunu zorunlu kiliyor.
- **Yatakli radyonuklid tedavi unitesi olan ozel hastaneler reddediliyordu.**
  Akisin basindaki kurum kapisi, ilerideki "ozel hastane de fatura edebilir"
  kuralina ulasilmasini engelliyordu. Kurum sorusu artik onu gercekten
  gerektiren dala tasindi ve bir kez soruluyor.
- **Kullanici girdisi kacirilmadan HTML'e yaziliyordu.** ICD alanina girilen
  isaretleme calisiyordu. Artik girdi bicim dogrulamasindan geciyor ve UI
  kullanici verisi iceren hicbir yerde `innerHTML` kullanmiyor.

---

## Belgeler

| Belge | Icerik |
| --- | --- |
| [klinik-kurallar.md](docs/klinik-kurallar.md) | Tum karar akislari (uretilir) |
| [icd-kodlari.md](docs/icd-kodlari.md) | ICD-10 kod kumeleri (uretilir) |
| [mimari.md](docs/mimari.md) | Katmanlar, motor, derleme |
| [veri-modeli.md](docs/veri-modeli.md) | Veri dosyalarinin alanlari, tipik degisiklikler |
| [otomatik-guncelleme.md](docs/otomatik-guncelleme.md) | Kaynak izleme ve otomasyon |
| [duzeltmeler.md](docs/duzeltmeler.md) | Orijinal surumdeki hatalar ve cozumleri |
| [katki.md](docs/katki.md) | Katki rehberi |
| [CHANGELOG.md](docs/CHANGELOG.md) | Surum gunlugu |

---

## Durum

- **Izlenen SUT revizyonu:** 30 Nisan 2024 (R.G. 32532)
- **Veri surumu:** `2024.04.30+1`
- **Klinik onay bekleyen kayit:** 5 — bkz.
  [acik konular](docs/duzeltmeler.md#acik-konular)

Uygulama bu kayitlari kabul eder, fakat sonuc ekraninda dogrulanmayi
bekledikleri acikca belirtilir.

---

## Lisans

[MIT](LICENSE) · Gelistirici: Dr. A. Y.
