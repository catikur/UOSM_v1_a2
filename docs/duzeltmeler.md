# Duzeltmeler

Bu belge, `legacy/pet_ct_sgk_uygunluk_rehberi.original.html` dosyasinda tespit
edilen sorunlari ve her biri icin yapilani kaydeder. Satir numaralari o dosyaya
aittir ve dogrulanabilir.

Kayit bicimi: **ne yanlisti → neden onemli → ne yapildi → nasil dogrulaniyor**.

Klinik mantigi ilgilendiren duzeltmeler (`H-*`) once, teknik duzeltmeler
(`T-*`) sonra gelir. `H-03`, `H-04` ve `H-07` **klinik onay bekleyen** onerilerdir;
`docs/duzeltmeler.md#acik-konular` bolumune bakiniz.

---

## Klinik ve mantik duzeltmeleri

### H-01 — Radyonuklid tedavi unitesi olan ozel hastane yanlislikla reddediliyordu

**Onem:** Yuksek — dogru olan bir vakayi "odenmez" diye geri ceviriyordu.

**Neydi:** PSMA ve DOTATATE secildiginde akis, ICD kodu bile sorulmadan once
`hospital_check` dugumune gidiyordu (satir 249-250). Bu dugumun tek kabul ettigi
cevap "3. Basamak Resmi Kurum"du; "2. Basamak veya Ozel" secen kullanici hemen
reddediliyordu (satir 261).

Oysa akisin ilerisindeki `psma_tedavi_hosp` dugumu (satir 423-430), radyonuklid
tedavi planlamasi icin **yatakli radyonuklid tedavi unitesi bulunan ozel
hastanelerin de** fatura edebilecegini soyluyordu.

Iki kural birbiriyle celisiyordu ve bastaki kapi her zaman once calisiyordu:
tedavi unitesi olan bir ozel hastane o dugume **hic ulasamiyordu**.

**Ne yapildi:** Bastaki `hospital_check` kapisi kaldirildi. Kurum sorusu, onu
gercekten gerektiren her dala tasindi. Tedavi planlama dali, uc secenekli kendi
dugumunu (`psma_tedavi_merkez`) kullaniyor.

**Dogrulama:** `test/regression.test.mjs` → `H-01: yatakli radyonuklid tedavi
unitesi olan ozel hastane PSMA tedavi planlamasinda uygun`

---

### H-02 — Kurum basamagi iki kez soruluyordu

**Onem:** Orta — kullanici deneyimi ve tutarsiz cevap kabulu.

**Neydi:** PSMA/DOTATATE akislarinda `hospital_check` (satir 257) sorulduktan
sonra, `psma_evreleme_hosp`, `psma_nuks_hosp`, `psma_biopsy_hosp`,
`dota_hosp_evreleme`, `dota_hosp_tani` dugumleri **ayni soruyu tekrar**
soruyordu (satir 402-450).

Daha kotusu: iki soruya celiskili cevap verilebiliyordu (once "3. Basamak",
sonra "2. Basamak") ve uygulama bunu kabul ediyordu.

**Ne yapildi:** Soru bir kez soruluyor. Ayni metni tekrarlayan alti dugum,
tek bir **parametrik** dugume (`common.merkez_3basamak`) indirildi; cagiran
taraf yalnizca `subject` ve `indication` parametrelerini veriyor.

**Dogrulama:** `test/regression.test.mjs` → `H-02: kurum basamagi akis boyunca
yalnizca bir kez sorulur` (dort farkli akista dogrulanir)

---

### H-03 — Kemik PET hizli secimindeki "Prostat (C61)" tusu her zaman reddediyordu

**Onem:** Yuksek — kullaniciya sunulan bir tusa basmak her zaman hatali sonuc
veriyordu.

**Neydi:** Kemik PET (F-18 NaF) ICD giris ekraninda "Prostat (C61)" hizli secim
tusu vardi (satir 551). Ancak `bone` dali dogrulamayi `tablo1Codes` uzerinden
yapiyordu (satir 520-522) ve **C61 o listede yoktu** (satir 242).

Sonuc: tusa basan her kullanici "SGK Odemez" aliyordu. Kemik metastazi
degerlendirmesinde prostat kanseri en sik endikasyon oldugu icin bu, aracin en
gorunur hatasiydi.

**Ne yapildi:** Kod kumeleri radyofarmasotik basina ayrildi. Kemik PET artik
kendi kumesini (`naf-onkolojik`) kullaniyor; bu kume `tablo-1` kumesini
`extends` ile miras alip uzerine `C61` ekliyor. Kod tekrari yok.

C61 kaydi `status: "proposed"` olarak isaretli: kabul ediliyor, fakat sonuc
ekraninda klinik onay bekledigini belirten bir uyari gosteriliyor.

**Tekrarini onleme:** `scripts/validate.mjs` icindeki **QP-01** denetimi, her
hizli secim kodunun ilgili kod kumesinde eslestigini zorunlu kilar. Bu hata
artik CI'dan gecemez.

**Dogrulama:**
- `test/regression.test.mjs` → `H-03: kemik PET (NaF) hizli secimindeki C61 kabul edilir`
- `test/regression.test.mjs` → `H-03: her hizli secim kodu kendi kod kumesinde eslesmeli`
- `test/tooling.test.mjs` → `dogrulayici: kod kumesinde olmayan hizli secimi yakalar (QP-01)`

---

### H-04 — "PSA Yuksekligi" kisayolu yanlis ICD koduna bagliydi

**Onem:** Orta — yanlis kodla islem bildirimi.

**Neydi:** PSMA ekranindaki "PSA Yuksekligi" tusu `R39.1` kodunu giriyordu
(satir 544). ICD-10'da **R39.1 "idrar yapma ile ilgili diger guclukler"**
demektir (tereddut, zayif akim, catallanma). Yukselmis PSA duzeyinin karsiligi
**R97.2**'dir (`R97` = anormal tumor belirtecleri).

**Ne yapildi:** Kisayol `R97.2` kodunu kullaniyor. `R97` oneki PSMA kod
kumesine eklendi. Eski `R39` oneki, geriye donuk uyumluluk icin kabul edilmeye
devam ediyor, fakat girildiginde kullaniciya "klinik olarak PSA yuksekligini
karsilamaz, R97.2 tercih edilmelidir" uyarisi cikiyor.

**Dogrulama:**
- `test/regression.test.mjs` → `H-04: PSA yuksekligi kisayolu R97.2 kodunu kullanir`
- `test/regression.test.mjs` → `H-04: eski R39 kodu geriye donuk uyumluluk icin kabul edilir ama uyarir`

---

### H-05 — Beyin PET ve DOTATATE hicbir ICD dogrulamasi yapmiyordu

**Onem:** Orta — sessiz yanlis pozitif.

**Neydi:** `validateICD` fonksiyonunda `brain` ve `dota` dallari girilen kodu
hic denetlemiyordu (satir 513-515 ve 524-526): ne girilirse girilsin akis
devam ediyordu.

Somut sonuc: Beyin PET secip `C34` (akciger kanseri) girmek, Alzheimer
endikasyonundan "SGK UYGUN" sonucu uretiyordu.

**Ne yapildi:** Iki dal icin de kod kumeleri tanimlandi (`beyin-tanilar`,
`net-tanilar`). Bu kumeler `enforcement: "warn"` ile calisir: beklenmeyen bir
kod **akisi durdurmaz** (eski davranis korunur) ama sonuc ekraninda acik bir
uyari gosterilir. Boylece gercek bir kural uydurmadan bosluk kapatilmis olur.

**Dogrulama:**
- `test/regression.test.mjs` → `H-05: beyin PET onkolojik kodla uyarir (eskiden sessizce kabul ediyordu)`
- `test/regression.test.mjs` → `H-05: DOTATATE beklenmeyen kodla uyarir`

---

### H-06 — Gizlenen secenek, numaralandirmada bosluk birakiyordu

**Onem:** Dusuk — kozmetik, fakat guven kirici.

**Neydi:** Yeniden evreleme ekranindaki secenekler etiketlerinde elle
numaralanmisti: `"1. Biyopsi..."`, `"2. Tumor Markiri..."`, `"3. Goruntuleme..."`,
`"4. Malign Melanom..."`, `"5. Kanit yok..."` (satir 353-390).

4. secenek yalnizca melanom/lenfoma kodlarinda gorunuyordu (satir 388). Diger
tum tanilarda kullanici **1, 2, 3, 5** goruyordu.

**Ne yapildi:** Elle numaralandirma kaldirildi. Klavye kisayolu numaralari
(1-9) UI katmaninda, gorunur secenekler uzerinden uretiliyor; her zaman
kesintisiz.

**Dogrulama:** `test/regression.test.mjs` → `H-06: gizlenen secenek
numaralandirmada bosluk birakmaz`

---

### H-07 — Onkolojik olmayan `M95` kodu FDG listesindeydi

**Onem:** Orta — dogrulanmasi gereken veri sorunu.

**Neydi:** `tablo1Codes` dizisinde `'M95'` yer aliyordu (satir 242). ICD-10'da
**M95 "kas-iskelet sistemi ve bag dokusunun diger edinilmis deformiteleri"**
demektir; onkolojik bir kod degildir. Dizideki komsulari (`C90`, `C49`, `C80`,
`D48`) dusunuldugunde bir veri giris hatasi olmasi kuvvetle muhtemeldir.

**Ne yapildi:** Kod **kaldirilmadi** — klinik kurali tek tarafli degistirmek
dogru olmazdi. Bunun yerine `status: "needs-review"` ile isaretlendi: kabul
edilmeye devam ediyor (davranis korundu), fakat girildiginde kullaniciya
dogrulanmayi bekledigi bildiriliyor ve `npm run check:updates` raporunda
listeleniyor.

Karar icin bkz. [Acik konular](#acik-konular).

**Dogrulama:** `test/regression.test.mjs` → `H-07: dogrulanmamis M95 kodu
kullaniciya uyari olarak yansir`

---

## Teknik duzeltmeler

### T-01 — Kullanici girdisi HTML'e kacirilmadan enterpole ediliyordu

**Onem:** Yuksek — siteler arasi betik calistirma (XSS).

**Neydi:** ICD girdisi `state.currentIcd`'ye yazilip sablon dizgesiyle dogrudan
`innerHTML`'e veriliyordu (satir 656 ve 372):

```js
<div class="...">${state.currentIcd || "-"}</div>
```

Girdi yalnizca `trim().toUpperCase()` uygulanip alinmisti (satir 495); HTML
etiketleri buyuk/kucuk harfe duyarsiz oldugu icin `<IMG SRC=X ONERROR=...>`
gibi bir girdi calisan isaretlemeye donusuyordu. Tek kullanicilik (self-XSS)
bir yuzey olsa da, paylasilan bir klinik terminalde onemsenmesi gerekir.

**Ne yapildi:** Iki katmanli:

1. **Girdi dogrulamasi:** Kod, `^[A-Z][0-9][0-9A-Z](\.?[0-9A-Z]{1,4})?$`
   bicimine uymuyorsa akisa hic girmez (`src/engine.js` → `isWellFormedIcd`).
2. **Cizim:** UI artik kullanici verisi iceren hicbir yerde `innerHTML`
   kullanmiyor; tum metinler `textContent` ile yaziliyor
   (`src/app.js` → `el()`). `innerHTML` yalnizca `src/icons.js` icindeki
   sabit SVG tablosu icin kullaniliyor ve o tablo hicbir girdiyle
   birlestirilmiyor.

Ayrica derleme, gomulu JSON icindeki `<` karakterlerini ve U+2028/U+2029
ayiricilarini kaciriyor; veri icindeki bir dizge `<script>` blogunu erken
kapatamiyor.

**Dogrulama:**
- `test/regression.test.mjs` → `T-01: bicim disi / betik iceren ICD girisi akisa hic girmez`
- `test/tooling.test.mjs` → `gomulu JSON betigi erken kapatamaz`

---

### T-02 — Geri alma durumu tam geri sarmiyordu

**Onem:** Yuksek — yanlis sonuc uretebiliyordu.

**Neydi:** Geri butonu yalnizca adim kimligini ve etiketi geri aliyordu
(satir 707-713):

```js
state.step = state.history.pop();
state.labels.pop();
```

`state.currentIcd` ve `state.petType` duruma **yapisik kaliyordu**. Somut
senaryo: C43 (melanom) girip geri donup C50 (meme) girmek. `currentIcd`
guncellenene kadar melanom dallanmasi (satir 286) hala eski kodu goruyordu.

**Ne yapildi:** Gecmis, adim kimligi degil **tam durum anlik goruntusu** olarak
saklaniyor (`src/engine.js` → `_snapshot`). Geri alma, ICD, kurum, uyarilar ve
izlenen yol dahil her seyi o ana geri sariyor.

**Dogrulama:** `test/regression.test.mjs` → uc ayri test
(`geri alma ICD ve kurum durumunu da geri sarar`, `geri alma izlenen yolu da
kisaltir`, `reset her sey temiz baslar`)

---

### T-03 — Sonuc nesnesi dugum arama tablosuna anahtar olarak veriliyordu

**Onem:** Dusuk — gizli hata kaynagi.

**Neydi:** `state.step` bazen bir dizge (`'fdg_main'`), bazen bir nesne
(`{ result: 'no', detail: ... }`) oluyordu. `render()` once sunu yapiyordu
(satir 603):

```js
const current = flow[state.step];   // nesne -> flow["[object Object]"] -> undefined
```

Sonuc kontrolu bundan **sonra** geliyordu (satir 604). Calisiyordu, ama
kazara: tek bir tur alaninin iki anlami vardi.

**Ne yapildi:** Durum makinesinde ayri alanlar var: `nodeId` her zaman bir
dugum kimligi, `outcome` her zaman bir sonuc. Ikisi karismiyor.

**Dogrulama:** `test/regression.test.mjs` → `T-03: sonuc durumu dugum arama
tablosuna hic sorulmaz`

---

### T-04 — Dogrulama hatasi icin `alert()` kullaniliyordu

**Neydi:** Bos ICD girisinde `alert("Lütfen ICD-10 kodunu giriniz!")`
(satir 496). Tarayici diyalogu akisi kesiyor, ekran okuyucuya baglami
aktarmiyor ve mobilde rahatsiz edici.

**Ne yapildi:** Alanin altinda, `role="alert"` tasiyan satir ici hata mesaji.
Odak girdi alanina geri veriliyor, mesaj canli bolgeye de yaziliyor. Bos girdi
ve bicim hatasi icin ayri, aciklayici metinler var.

---

### T-05 — Yakinlastirma kapaliydi (WCAG 1.4.4 ihlali)

**Neydi:** `maximum-scale=1.0, user-scalable=no` (satir 5). Az goren
kullanicilar sayfayi buyutemiyordu.

**Ne yapildi:** Kisitlar kaldirildi; `viewport-fit=cover` eklendi (centikli
ekranlar icin). Metin boyutlari `rem` tabanli, tarayici yazi tipi ayarina uyar.

**Dogrulama:** `test/tooling.test.mjs` → `viewport yakinlastirmayi engellemiyor
(WCAG 1.4.4)`

---

### T-06 — Uretimde Tailwind CDN derleyicisi calisiyordu

**Neydi:** `<script src="https://cdn.tailwindcss.com">` (satir 12). Bu betik,
tarayicida calisan bir JIT derleyicisidir; Tailwind'in kendi belgeleri uretim
icin kullanilmamasi gerektigini soyler. Cizimi bloke eder, her acilista ag
ister ve cevrimdisi calismayi imkansiz kilar.

Ayrica `@import url('https://fonts.googleapis.com/...')` (satir 14) ikinci bir
bloke edici dis istek ekliyordu.

**Ne yapildi:** Ikisi de kaldirildi. Yerine tasarim belirtecleri (CSS ozel
ozellikleri) uzerine kurulu el yazimi `src/styles.css` geldi; yazi tipi olarak
sistem yigini kullaniliyor (`Inter` kuruluysa o secilir).

Sonuc: `index.html` **disariya hicbir istek atmiyor**. `file://` uzerinden ve
cevrimdisi tam calisiyor.

**Dogrulama:** `test/tooling.test.mjs` → `index.html disariya hicbir istek
atmaz (tek dosya, cevrimdisi calisir)`

---

### T-07 — Tanimsiz ve gecersiz CSS siniflari

**Neydi:** Uc ayri sorun:

| Sinif | Nerede | Sorun |
| --- | --- | --- |
| `hide-scrollbar` | satir 160 | Hicbir yerde tanimli degildi; WebKit'te kaydirma cubugu gorunuyordu |
| `shadow-current/30` | satir 663 | Gecerli bir Tailwind sinifi degil; hicbir sey uretmiyordu |
| `.btn-3d.danger:hover` | satir 60-65 | Tanimlanmamisti; kirmizi butonun uzerine gelince kenarlik maviye donuyordu |

**Ne yapildi:** Uculu de `src/styles.css` icinde dogru sekilde tanimlandi
(`.trail__list` kaydirma cubugu gizleme, `--shadow-md` belirteci,
`.choice--danger:hover`).

---

### T-08 — Bozuk SVG yollari

**Neydi:** Iki ikonun yol verisi hataliydi:

- Giris ekrani sembolu (satir 112): `c2 1.5-2 4 0 5.5` — ikinci kontrol
  noktasinda eksi isareti ayraci yiyor, egri beklenmedik yere gidiyordu.
- `refresh` ikonu (satir 219): `l5.3 4.26` bitis noktasi `viewBox="0 0 24 24"`
  disina tasiyordu; ok ucu kirpiliyordu.

**Ne yapildi:** Giris sembolu temiz bir atom cizimiyle degistirildi; `refresh`
ikonu standart iki parcali (yay + ok ucu) bicimine getirildi. Tum ikonlar tek
bir yerde toplandi (`src/icons.js`) ve `scripts/validate.mjs` → **O-05/TR-02**
denetimi, veride atif yapilan her ikonun var oldugunu zorunlu kilar.

---

### T-09 — Giris ekrani klavyeyle acilamiyordu

**Neydi:** Splash bir `<div onclick="startApp()">` idi (satir 100). Sekme ile
odaklanilamiyor, Enter/Space ile tetiklenemiyordu; klavye veya ekran okuyucu
kullanan biri uygulamaya **hic giremiyordu**.

**Ne yapildi:** Gercek bir `<button>` oldu. Ayrica: canli bolge (`aria-live`)
ile her adim duyuruluyor, odak adim degistiginde yonetiliyor, `1-9` ile secenek
secimi, `Backspace` ile geri, `Esc` ile basa donus calisiyor.

---

### T-10 — PWA ust verisi vardi ama manifest yoktu

**Neydi:** `apple-mobile-web-app-capable`, `theme-color`,
`apple-mobile-web-app-title` etiketleri mevcuttu (satir 6-9) fakat
`manifest.webmanifest` yoktu. Uygulama gercekte **yuklenebilir degildi**; iOS
disindaki tarayicilarda ana ekrana ekleme duzgun calismiyordu.

**Ne yapildi:** `scripts/build.mjs` manifesti veriden uretiyor (ad, kisa ad,
aciklama, tema rengi, ikon hepsi `data/meta.json`'dan). HTML'e `<link
rel="manifest">` eklendi.

---

### T-11 — Koyu tema yoktu

**Neydi:** Sabit acik tema. Giris ekrani koyu, uygulama acikti ve
`theme-color` elle degistiriliyordu (satir 191) — yarim kalmis bir niyet.

**Ne yapildi:** Tum renkler CSS ozel ozelligi oldu; `prefers-color-scheme`
destekleniyor ve ust cubuktaki dugmeyle elle de degistirilebiliyor. Secim
`localStorage`'da saklaniyor (gizli sekmede sessizce devre disi kaliyor).

---

### T-12 — Klinik bilgi kodun icine gomuluydu

**Onem:** Yuksek — projenin guncellenebilirligini engelleyen asil sorun.

**Neydi:** ICD listesi (satir 242), karar agaci (satir 244-487), tumor
belirteci eslemeleri (satir 360-371) ve hizli secimler (satir 537-557)
JavaScript nesne ve fonksiyonlari icindeydi. SUT'ta bir esik degisse
(orn. "15 gun" → "21 gun") kod duzenlemek gerekiyordu; dogrulanabilir,
gozden gecirilebilir bir veri yuzeyi yoktu.

**Ne yapildi:** Tum klinik bilgi `data/*.json` altina tasindi. Karar agaci
**saf veridir** — fonksiyon icermez; kosullar (`{"icdStartsWith": ["C43"]}`)
ve sablonlar (`{params.indication}`) veri olarak ifade edilir.

Kazanimlari: sema ile dogrulanabilir, dosyalar arasi capraz referanslari
denetlenebilir, veriden belge uretilebilir, kod degistirmeden guncellenebilir.

Ayrinti: `docs/veri-modeli.md`.

---

## Acik konular

Asagidakiler **klinik onay bekliyor**. Uygulama bunlari kabul eder fakat
kullaniciya uyari gosterir; `npm run check:updates` raporunda da listelenirler.

| Kod | Kume | Durum | Karar gereken |
| --- | --- | --- | --- |
| `M95` | `tablo-1` | `needs-review` | SUT Tablo-1 metniyle karsilastirilmali. Onkolojik bir kod degil; dizide `C95`/`C96` yerine yanlis yazilmis olabilir. Dogrulanip **duzeltilmeli veya cikarilmali**. |
| `C61` | `naf-onkolojik` | `proposed` | Kemik PET icin prostat kanserinin gecerli tani oldugu SUT metninden teyit edilmeli (bkz. H-03). |
| `R97` | `psma-tanilar` | `proposed` | Yukselmis PSA icin SUT'un kabul ettigi kodun R97.2 oldugu teyit edilmeli (bkz. H-04). |
| `R39` | `psma-tanilar` | `needs-review` | Kaynak uygulamadan devralindi. Teyit sonrasi **cikarilmasi** onerilir. |
| `D3A`, `E34.0` | `net-tanilar` | `proposed` | DOTATATE endikasyonunda SUT'un bu kodlari sayip saymadigi teyit edilmeli. |

Bir konu kapatildiginda: ilgili kaydin `status` alanini `active` yapin (veya
kodu silin), `reviewNote` alanini kaldirin, `data/meta.json` icindeki
`review.lastClinicalReview` tarihini tazeleyin ve `npm run verify` calistirin.

---

## Ozet

| Kategori | Sayi |
| --- | --- |
| Klinik/mantik duzeltmesi | 7 |
| Teknik duzeltme | 12 |
| Gerileme testiyle sabitlenen | 15 test |
| Klinik onay bekleyen | 5 kayit |
