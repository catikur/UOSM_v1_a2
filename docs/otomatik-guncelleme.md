# Otomatik guncelleme

Depoyu guncel tutan uc mekanizma var. Ucunun ortak kurali su:

> **Klinik kurallar kendiliginden degismez.** Otomasyon degisikligi *saptar* ve
> insan incelemesi ister; veriyi kendisi duzenlemez.

Bir SUT maddesinin yorumu, otomatik bir metin farkinin karar verebilecegi bir
sey degildir. Yanlis bir otomatik guncelleme, bayat bir veriden daha tehlikelidir.

---

## 1. Resmi kaynak izleme

`scripts/fetch-sources.mjs`, `data/sources.json` icinde tanimli sayfalari ceker,
normallestirir, `sha256` parmak izini alir ve `data/sources.lock.json` ile
karsilastirir.

### Neden normallestirme

Resmi sayfalar her istekte degisen parcalar barindirir: CSRF jetonu, oturum
kimligi, ASP.NET `VIEWSTATE`, ziyaret sayaci. Ham HTML'in hash'i her calismada
farkli cikar ve izleme **kullanilamaz** hale gelir.

Kaynak basina uygulanan kurallar:

| Kural | Ne yapar |
| --- | --- |
| `strip-script` | `<script>` bloklarini atar |
| `strip-style` | `<style>` bloklarini atar |
| `strip-csrf` | CSRF/VIEWSTATE jetonlarini ve gizli alanlari atar |
| `strip-dates` | Tarih ve saat damgalarini atar |
| `collapse-whitespace` | Bosluklari ve `&nbsp;` dizilerini tekler |

### Tarihler konusunda bilincli bir tercih

`mevzuat-sut` kaydinda **`strip-dates` kullanilmaz.** Mevzuat sayfasinda tarih
anlamli bir sinyaldir: yururluk veya degisiklik tarihi. Burada yanlis alarm
riskini, kacirilan bir SUT degisikligine tercih ediyoruz.

Bu karar bir testle sabitlenmistir:
`test/sources.test.mjs` → `mevzuat sayfasinda TARIH degisikligi bilerek alarm uretir`.

### Kullanim

```bash
npm run fetch:sources                  # getir ve karsilastir
npm run fetch:sources -- --write       # parmak izlerini kabul et
npm run fetch:sources -- --only=mevzuat-sut
npm run fetch:sources -- --offline --fixtures=test/fixtures/sources
```

Cikis kodlari: `0` degisiklik yok · `2` degisiklik var · `1` calisma hatasi.

### Yeni kaynak eklemek

`data/sources.json` → `sources` dizisine ekleyin:

```json
{
  "id": "yeni-kaynak",
  "label": "Insan tarafindan okunur ad",
  "url": "https://...",
  "kind": "html",
  "watch": "#content",
  "affects": ["data/rules.json"],
  "normalize": ["strip-script", "strip-csrf", "collapse-whitespace"],
  "enabled": true
}
```

`watch` bir CSS secici degil, kaba bir govde ayiklayicidir: `body` veya `#kimlik`.
Bagimlilik eklememek icin kasitli olarak basit tutulmustur.

Devre disi biraktiginiz bir kaynak `disabledReason` tasimalidir; test bunu
zorunlu kilar.

---

## 2. Zamanlanmis is akisi

`.github/workflows/sut-watch.yml` her Pazartesi 06:00 UTC'de calisir.

```
        ┌──────────────────────────────┐
        │  Kilit dosyasi var mi?       │
        └───────┬──────────────┬───────┘
             hayir           evet
                │               │
     ┌──────────▼────────┐   ┌──▼─────────────────┐
     │ --write ile tohumla│   │ getir + karsilastir│
     │ → PR ac            │   └──┬─────────────────┘
     └────────────────────┘      │
                          degisiklik var mi?
                                 │
                        ┌────────▼────────┐
                        │ konu ac/guncelle│
                        │ (sut-watch etiketi)
                        └─────────────────┘
```

- **Ilk calisma:** Kilit yoktur. Parmak izleri tohumlanir ve taslak bir PR
  acilir. Bos yere konu acilmaz.
- **Sonraki calismalar:** Degisiklik bulunursa `sut-watch` etiketli bir konu
  acilir (ayni baslikta acik konu varsa yorum eklenir).
- **Kilit guncellenmez.** Boylece degisiklik, bir insan ilgilenene kadar her
  hafta raporlanmaya devam eder.

### Degisikligi inceledikten sonra

1. Konudaki baglantidan resmi metni okuyun.
2. Gerekiyorsa `data/` altini guncelleyin, `dataVersion` degerini artirin.
3. `npm run verify && npm run docs && npm run build`
4. Actions → **SUT kaynak izleme** → *Run workflow* → `acknowledge` isaretli.
   Bu, yeni parmak izlerini kabul eden bir PR acar.

---

## 3. Guncellik raporu

`npm run check:updates` tek bir Markdown raporda toplar:

- Derleme suruklemesi (`index.html` kaynakla uyumlu mu)
- Veri dogrulamasi sonucu ve uyarilari
- Resmi kaynaklarin son durumu
- Klinik gozden gecirme tazeligi
- Dogrulanmayi bekleyen kod sayisi

CI'da is ozetine yazilir; ilgilenilmesi gereken bir sey varsa `2` ile cikar.

---

## Ag erisimi hakkinda

`fetch-sources.mjs`, Node'un yerlesik `fetch` islevini kullanir. Bu islev
`HTTPS_PROXY` degiskenini **kendiliginden okumaz**. Vekil sunucu arkasinda
calistiriyorsaniz:

```bash
NODE_USE_ENV_PROXY=1 npm run fetch:sources   # Node >= 22.21
```

GitHub Actions kosucularinda vekil yoktur; ek ayar gerekmez.

Kisitli aglarda (ornegin bazi kurumsal veya otomasyon ortamlarinda) resmi
alan adlari engellenmis olabilir. Bu durumda `--offline --fixtures=...` ile
normallestirme mantigini yerel ornek dosyalar uzerinde calistirabilirsiniz;
gercek izleme CI'da yapilir.

---

## Otomatik olarak yapilmayanlar

Bilincli olarak disarida birakilanlar ve gerekceleri:

| Yapilmaz | Neden |
| --- | --- |
| SUT metninden kural cikarip `rules.json`'i guncellemek | Mevzuat yorumu gerektirir; hatali bir otomatik guncelleme sessizce yanlis klinik karar uretir |
| ICD tanimlarini WHO API'sinden cekmek | API kimlik dogrulamasi ister ve Turkiye uygulamasi WHO listesinden farklilasir; tanimlar veride, gozden gecirilmis halde tutulur |
| Hizli secim kisayollarini otomatik uretmek | Hangi tanilarin kisayola deger oldugu klinik bir tercihtir |
| `data/*.json` degisikliklerini otomatik birlestirmek | Her klinik degisiklik insan onayindan gecer |
