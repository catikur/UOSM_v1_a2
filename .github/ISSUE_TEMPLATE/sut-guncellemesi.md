---
name: SUT guncellemesi
about: Yeni bir SUT revizyonunu veya kural degisikligini bildirin
title: 'SUT guncellemesi: '
labels: sut-guncelleme
---

## Degisikligin kaynagi

- Resmi Gazete tarihi/sayisi:
- Ilgili SUT maddesi (orn. 2.4.4.I):
- Baglanti:

## Degisen kural

Eski hukum ve yeni hukum, mumkunse alintiyla:

## Etkilenen dosyalar

- [ ] `data/meta.json` (revizyon etiketi ve `dataVersion`)
- [ ] `data/rules.json` (karar dugumleri)
- [ ] `data/code-sets.json` (ICD kod kumeleri)
- [ ] `data/tracers.json` (radyofarmasotik/kurum sartlari)
- [ ] `data/tumor-markers.json`
- [ ] `data/quick-picks.json`

## Kontrol listesi

- [ ] Degisiklik `docs/klinik-kurallar.md` ile karsilastirildi
- [ ] `npm run verify` temiz
- [ ] Degisen davranis icin test eklendi/guncellendi
- [ ] `data/meta.json` -> `review.lastClinicalReview` tazelendi
