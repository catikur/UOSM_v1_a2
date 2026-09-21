# Veri modeli

Klinik bilginin tamami `data/` altindadir. Her dosyanin `schema/` altinda bir
semasi vardir ve `npm run validate` semayi uygular.

| Dosya | Icerik |
| --- | --- |
| `meta.json` | Uygulama ust verisi, izlenen SUT revizyonu, calisma zamani ayarlari |
| `rules.json` | Karar agaci (saf veri) |
| `tracers.json` | Radyofarmasotikler ve kurum basamaklari |
| `code-sets.json` | ICD-10 kod kumeleri |
| `tumor-markers.json` | ICD → tumor belirteci eslemesi |
| `quick-picks.json` | ICD giris ekranindaki kisayollar |
| `sources.json` | Otomatik izlenen resmi kaynaklar |
| `build.lock.json` | **Uretilir.** Derleme parmak izi |
| `sources.lock.json` | **Uretilir.** Kaynak parmak izleri |

> Kod tablolarinin okunur hali: [`icd-kodlari.md`](./icd-kodlari.md)
> Karar agacinin okunur hali: [`klinik-kurallar.md`](./klinik-kurallar.md)
> Ikisi de veriden uretilir (`npm run docs`).

---

## `rules.json` — karar agaci

### Dugum

```json
{
  "id": "fdg_tani",
  "question": "Kitle boyutu ve tetkik amaci?",
  "hint": "Istege bagli aciklama satiri",
  "options": [ /* ... */ ]
}
```

| Alan | Zorunlu | Not |
| --- | --- | --- |
| `id` | evet | `^[a-z0-9_.]+$`. Ortak dugumler `common.` onekiyle |
| `question` | evet | Sablon belirteci kullanabilir |
| `hint` | hayir | Sorunun altinda kucuk punto |
| `options` | evet* | `optionsFrom` yoksa zorunlu |
| `optionsFrom` | hayir | `"tracers"` → secenekler `tracers.json`'dan uretilir |
| `parametric` | hayir | `true` ise yalnizca parametreyle cagrilabilir |
| `params` | hayir | Beklenen parametre adlari |

### Secenek

Her secenegin **tam olarak bir** cikisi olmalidir: `next`, `branch` veya
`outcome`. Dogrulayici bunu zorunlu kilar (**O-01**).

```json
{
  "id": "buyuk",
  "label": "Kitle >= 1 cm",
  "note": "Butonun altindaki aciklama",
  "icon": "ruler",
  "tone": "danger",
  "visibleWhen": { "icdStartsWith": ["C43"] },
  "setsFacility": "tertiary-public",
  "outcome": { "status": "covered", "indication": "Tani", "sutRefs": ["sut-2.4.4.I"] }
}
```

| Alan | Not |
| --- | --- |
| `id` | Dugum icinde benzersiz. Testler ve klavye bu kimlige bakar |
| `label` | Buton metni |
| `note` | Ikincil satir |
| `icon` | `src/icons.js` icinde tanimli olmali (**O-05** denetler) |
| `tone` | `neutral` (varsayilan) veya `danger` (kirmizi kenarlik) |
| `visibleWhen` | Kosul; tutmuyorsa secenek hic cizilmez |
| `setsFacility` | Secim, kurum basamagini duruma yazar |

### Cikis bicimleri

**Dogrudan sonuc:**

```json
{ "outcome": { "status": "not-covered", "reason": "...", "sutRefs": ["sut-2.4.4.I"] } }
```

`status` yalnizca `covered` veya `not-covered` olabilir. `covered` icin
`indication`, `not-covered` icin `reason` yazilir. `sutRefs` girdileri
`meta.json` → `regulation.relevantSections` icinde tanimli olmalidir (**O-03**).

**Baska dugume gecis:**

```json
{ "next": "fdg_evreleme" }
{ "next": { "node": "common.merkez_3basamak",
            "params": { "subject": "...", "indication": "..." } } }
```

**Kosullu dallanma:**

```json
{
  "branch": [
    { "when": { "icdStartsWith": ["C43"] }, "next": "melanom_evreleme_kriter" },
    { "outcome": { "status": "covered", "indication": "Evreleme" } }
  ]
}
```

Kollar sirayla denenir, ilk tutan kazanir. **Son kolun `when` alani olmamalidir**
(varsayilan kol); aksi halde dogrulayici uyarir (**O-04**).

### Kosul isleçleri

| Islec | Ornek |
| --- | --- |
| `icdStartsWith` | `{ "icdStartsWith": ["C43", "C81"] }` |
| `tracerIs` | `{ "tracerIs": ["dota"] }` |
| `facilityIs` | `{ "facilityIs": ["tertiary-public"] }` |
| `allOf` / `anyOf` | `{ "allOf": [ {...}, {...} ] }` |
| `not` | `{ "not": { "tracerIs": ["psma"] } }` |
| `always` | `{ "always": true }` |

Yeni bir islec eklemek: `src/engine.js` → `evaluatePredicate` icine kolu yaz,
`data/rules.json` → `predicateOps` listesine adini ekle, `scripts/validate.mjs`
→ `describePredicate` icine okunur karsiligini ekle (belge uretimi icin).

### Sablon belirtecleri

| Belirtec | Deger |
| --- | --- |
| `{code}` | Girilen ICD kodu |
| `{codeLabel}` | Kodun tanimi |
| `{tracer}` / `{tracerCode}` | Radyofarmasotik adi / SUT kodu |
| `{marker.label}` / `{marker.list}` | Kod icin secilen tumor belirteci |
| `{params.X}` | Dugum parametresi |

Bilinmeyen bir belirtec dogrulamayi durdurur (**T-02**); parametre olarak
yazilip `params` icinde bildirilmeyen belirtec de oyle (**T-01**).

---

## `code-sets.json` — ICD kod kumeleri

```json
{
  "id": "naf-onkolojik",
  "label": "F-18 NaF kemik PET/BT icin gecerli onkolojik tanilar",
  "sutRef": "sut-2.4.4.I",
  "extends": ["tablo-1"],
  "enforcement": "block",
  "rejectionMessage": "Girilen {code} kodu ... tanimli degil.",
  "codes": [
    { "code": "C61", "label": "Prostat malign neoplazmi", "group": "Uroonkoloji",
      "status": "proposed", "reviewNote": "..." }
  ]
}
```

**Eslestirme** onek mantigiyladir: `C34.1` girildiginde `C34` eslesir. Birden
fazla kod eslesirse **en uzun onek** kazanir (`C7A`, `C7` ile karismaz).

**`extends`** kume birlesimi kurar; ayni kod iki kez varsa yereldeki kazanir.
Dongu olursa dogrulayici durdurur (**CS-01**).

**`enforcement`**:

| Deger | Davranis | `rejectionMessage` / `warningMessage` |
| --- | --- | --- |
| `block` | Eslesmeyen kod reddedilir, akis biter | `rejectionMessage` zorunlu |
| `warn` | Eslesmeyen kod uyari uretir, akis surer | `warningMessage` zorunlu |

`warn`, kural metninden emin olunmayan yerlerde kullanilir: kullanicinin onunu
kesmeden bosluk isaretlenir.

**`status`**:

| Deger | Anlam |
| --- | --- |
| `active` (varsayilan) | Dogrulanmis |
| `needs-review` | Kabul edilir, sonucta uyari cikar |
| `proposed` | Ekip onerisi; kabul edilir, sonucta uyari cikar |

`active` olmayan her kayit `reviewNote` tasimali (**CS-05**) ve
`docs/duzeltmeler.md#acik-konular` icinde izlenmelidir.

---

## `tracers.json` — radyofarmasotikler

```json
{
  "id": "naf",
  "label": "F-18 NaF (Kemik PET)",
  "sutCode": null,
  "icon": "tracer-bone",
  "order": 50,
  "covered": true,
  "codeSet": "naf-onkolojik",
  "entryNode": "naf_durum",
  "askIcd": true,
  "icdPrompt": "Onkolojik tani ICD-10 kodunu girin",
  "summary": "Kemik metastazi degerlendirmesinde..."
}
```

`order` ilk ekrandaki siralamayi belirler. `covered: false` olan bir
radyofarmasotik `notCoveredOutcome` tasimak zorundadir (**TR-06**) ve ICD
sorulmadan dogrudan sonuc dondurur (FAPI boyledir).

`entryNode` parametrik bir dugum olamaz (**TR-05**): parametre verecek bir
cagiran yoktur.

---

## `quick-picks.json` — kisayollar

```json
{ "byTracer": { "naf": [ { "code": "C61", "label": "Prostat", "icon": "prostate" } ] } }
```

**Her kod, ilgili radyofarmasotigin kod kumesinde eslesmek zorundadir.**
Dogrulayici bunu **QP-01** ile zorunlu kilar.

Bu denetim kaynak uygulamadaki en gorunur hatayi (kemik PET'te "Prostat (C61)"
tusuna basan kullanicinin her zaman "odenmez" almasi) yeniden olusmaktan
alikoyar. Bkz. `docs/duzeltmeler.md#h-03`.

---

## `tumor-markers.json`

```json
{
  "default": { "markers": [], "label": "Ilgili tumor belirtecinde artis" },
  "mappings": [
    { "codes": ["C50"], "markers": ["CA 15-3", "CEA"], "label": "Tumor belirteci (CA 15-3 / CEA) artisi" }
  ],
  "tracerOverrides": [
    { "tracer": "dota", "markers": ["Kromogranin A"], "label": "..." }
  ]
}
```

Sirasiyla: `mappings` icinde ilk eslesen kayit → radyofarmasotik gecersiz
kilma → `default`.

---

## `meta.json`

`dataVersion` bicimi `YYYY.MM.DD+N`'dir: tarih izlenen SUT revizyonunu, `+N`
o revizyona dayali veri revizyonunu gosterir. Veride anlamli bir degisiklik
yaptiginizda **`+N` degerini artirin** — calisma zamani tazeleme bu alana bakar.

`review.lastClinicalReview` ve `reviewIntervalDays`, tazelik denetimini besler:
aralik asildiginda `npm run validate` uyarir (**RV-01**) ve haftalik guncellik
raporu isaretler.

---

## Tipik degisiklikler

### Bir esigi degistirmek

SUT "kemoterapi sonrasi 15 gun" suresini degistirdiyse: `data/rules.json`
icinde `fdg_yanit_kemo` dugumunun secenek etiketlerini ve
`outcome.reason` metnini guncelleyin. Kod dokunulmaz.

### Yeni bir ICD kodu eklemek

`data/code-sets.json` icinde ilgili kumenin `codes` dizisine ekleyin. Kaynaktan
dogrulanmadiysa `status: "proposed"` ve `reviewNote` verin.

### Yeni bir radyofarmasotik eklemek

1. `data/tracers.json` → kayit ekleyin (`order`, `codeSet`, `entryNode`).
2. `data/code-sets.json` → gerekiyorsa kod kumesi ekleyin.
3. `data/rules.json` → giris dugumunu ve alt dugumleri ekleyin.
4. `src/icons.js` → `icon` alaninda kullandiginiz adi ekleyin.
5. `npm run verify && npm run docs && npm run build`

Kod yazmaniz gereken tek yer ikon tablosudur.

### Yeni bir kurum basamagi eklemek

`data/tracers.json` → `facilityLevels` dizisine ekleyin; ardindan ilgili
seceneklerde `setsFacility` ile atif yapin (**O-06** tanimsiz kimligi yakalar).
