# Degisiklik gunlugu

Bicim: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/).
Surumleme: uygulama surumu `package.json`'da, veri surumu
`data/meta.json` → `dataVersion` alanindadir.

## [2.0.0] — 2026-09-21

Tek dosyalik prototipten veri odakli, test edilen bir projeye gecis.

### Eklendi

- `data/*.json`: klinik bilginin tamami veriye tasindi; karar agaci saf veri.
- `schema/*.json` ve bagimliliksiz sema dogrulayicisi.
- `scripts/validate.mjs`: sema + dosyalar arasi capraz referans denetimi
  (kod kumeleri, dugum atiflari, parametreler, ikonlar, SUT atiflari,
  erisilemeyen kurallar).
- `scripts/build.mjs`: tek dosyalik, kendi kendine yeten `index.html`;
  yeniden uretilebilir derleme ve `--check` ile surukleme denetimi.
- `scripts/gen-docs.mjs`: `docs/klinik-kurallar.md` ve `docs/icd-kodlari.md`
  veriden uretilir (Mermaid akis semalari dahil).
- `scripts/fetch-sources.mjs`: resmi kaynak izleme, gurultu normallestirme.
- `scripts/check-updates.mjs`: tek sayfalik guncellik raporu.
- 64 test (`node:test`), 15'i gerileme testi.
- GitHub Actions: CI, Pages yayini, haftalik SUT kaynak izleme.
- Calisma zamani veri tazeleme: acilista gomulu anlik goruntu, arka planda
  `bundle.json` kontrolu, daha yeni surum varsa sicak degistirme.
- Koyu tema, klavye gezinmesi (1-9 / Backspace / Esc), canli bolge
  duyurulari, sonuc ozetini panoya kopyalama, yazdirma duzeni.
- PWA manifesti (veriden uretilir).

### Degisti

- Tailwind CDN yerine tasarim belirtecli el yazimi CSS; webfont kaldirildi.
  `index.html` artik disariya hicbir istek atmiyor.
- Ayni kurum sorusunu soran 6 dugum tek parametrik dugume indi;
  4 tedavi-araligi dugumunun 3'u tek parametrik dugume indi.
- Geri alma, adim kimligi yerine tam durum anlik goruntusu kullaniyor.

### Duzeltildi

Tam liste ve dogrulama: [`duzeltmeler.md`](./duzeltmeler.md).

- **H-01** Yatakli radyonuklid tedavi unitesi olan ozel hastane, PSMA tedavi
  planlamasinda yanlislikla reddediliyordu.
- **H-02** Kurum basamagi iki kez soruluyor, celiskili cevap kabul ediliyordu.
- **H-03** Kemik PET hizli secimindeki "Prostat (C61)" tusu her zaman
  "odenmez" veriyordu.
- **H-04** "PSA Yuksekligi" kisayolu R39.1 (idrar yapma guclugu) koduna
  bagliydi; R97.2 olmali.
- **H-05** Beyin PET ve DOTATATE hicbir ICD dogrulamasi yapmiyordu.
- **H-06** Gizlenen secenek, elle numaralandirmada bosluk birakiyordu.
- **H-07** Onkolojik olmayan `M95` kodu FDG listesindeydi (isaretlendi).
- **T-01** Kullanici girdisi kacirilmadan `innerHTML`'e enterpole ediliyordu.
- **T-02** Geri alma ICD/kurum durumunu geri sarmiyordu.
- **T-03** Sonuc nesnesi dugum arama tablosuna anahtar olarak veriliyordu.
- **T-04** Dogrulama hatasi icin `alert()` kullaniliyordu.
- **T-05** `user-scalable=no` yakinlastirmayi engelliyordu (WCAG 1.4.4).
- **T-06** Uretimde Tailwind CDN derleyicisi calisiyordu.
- **T-07** Tanimsiz/gecersiz CSS siniflari (`hide-scrollbar`,
  `shadow-current/30`, eksik `danger:hover`).
- **T-08** Bozuk SVG yollari (giris sembolu, `refresh` ikonu).
- **T-09** Giris ekrani klavyeyle acilamiyordu.
- **T-10** PWA ust verisi vardi ama manifest yoktu.
- **T-11** Koyu tema yoktu.
- **T-12** Klinik bilgi kodun icine gomuluydu.

## [1.0.0]

Tek dosyalik ilk surum. `legacy/pet_ct_sgk_uygunluk_rehberi.original.html`
icinde degistirilmeden saklaniyor.
