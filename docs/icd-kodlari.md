<!-- BU DOSYA URETILMISTIR. Elle duzenlemeyin; `npm run docs` calistirin. -->

# ICD-10 kod kumeleri

Eslestirme **onek** mantigiyla yapilir: girilen kod kumede bir kodla basliyorsa eslesir (`C34.1` → `C34`). En uzun onek kazanir.

Durum etiketleri:

- `active` — SUT metninden dogrulanmis, sorunsuz kullanilir.
- `needs-review` — Kaynak veride bulundu fakat dogrulanamadi; kabul edilir, sonucta uyari cikar.
- `proposed` — Ekip tarafindan eklenmesi onerildi; kabul edilir, sonucta uyari cikar.

## `tablo-1`

SUT EK-2/B Tablo-1 - FDG PET/BT onkolojik tani listesi

- **Uygulama:** eslesmeyen kod reddedilir
- **Toplam kod (miras dahil):** 61

| Kod | Tanim | Grup | Durum |
| --- | --- | --- | --- |
| `C00` | Dudak malign neoplazmi | Bas-boyun | active |
| `C01` | Dil kokunun malign neoplazmi | Bas-boyun | active |
| `C02` | Dilin diger ve tanimlanmamis kisimlari | Bas-boyun | active |
| `C03` | Dis eti malign neoplazmi | Bas-boyun | active |
| `C04` | Agiz tabani malign neoplazmi | Bas-boyun | active |
| `C05` | Damak malign neoplazmi | Bas-boyun | active |
| `C06` | Agzin diger ve tanimlanmamis kisimlari | Bas-boyun | active |
| `C07` | Parotis bezi malign neoplazmi | Bas-boyun | active |
| `C08` | Diger majör tukuruk bezleri malign neoplazmi | Bas-boyun | active |
| `C09` | Tonsil malign neoplazmi | Bas-boyun | active |
| `C10` | Orofarenks malign neoplazmi | Bas-boyun | active |
| `C11` | Nazofarenks malign neoplazmi | Bas-boyun | active |
| `C12` | Piriform sinus malign neoplazmi | Bas-boyun | active |
| `C13` | Hipofarenks malign neoplazmi | Bas-boyun | active |
| `C14` | Dudak, agiz ve farenkste diger bolgeler | Bas-boyun | active |
| `C15` | Ozofagus malign neoplazmi | Gastrointestinal | active |
| `C16` | Mide malign neoplazmi | Gastrointestinal | active |
| `C17` | Ince barsak malign neoplazmi | Gastrointestinal | active |
| `C18` | Kolon malign neoplazmi | Gastrointestinal | active |
| `C19` | Rektosigmoid bileske malign neoplazmi | Gastrointestinal | active |
| `C20` | Rektum malign neoplazmi | Gastrointestinal | active |
| `C21` | Anus ve anal kanal malign neoplazmi | Gastrointestinal | active |
| `C22` | Karaciger ve intrahepatik safra yollari | Hepatobiliyer | active |
| `C23` | Safra kesesi malign neoplazmi | Hepatobiliyer | active |
| `C24` | Diger ve tanimlanmamis safra yollari | Hepatobiliyer | active |
| `C25` | Pankreas malign neoplazmi | Hepatobiliyer | active |
| `C26` | Sindirim organlarinda diger/iyi tanimlanmamis bolgeler | Gastrointestinal | active |
| `C32` | Larenks malign neoplazmi | Bas-boyun | active |
| `C34` | Brons ve akciger malign neoplazmi | Toraks | active |
| `C37` | Timus malign neoplazmi | Toraks | active |
| `C38` | Kalp, mediasten ve plevra malign neoplazmi | Toraks | active |
| `C40` | Ekstremite kemik ve eklem kikirdagi | Kemik-yumusak doku | active |
| `C41` | Diger bolge kemik ve eklem kikirdagi | Kemik-yumusak doku | active |
| `C43` | Derinin malign melanomu | Deri | active |
| `C45` | Mezotelyoma | Toraks | active |
| `C49` | Diger bag ve yumusak doku malign neoplazmi | Kemik-yumusak doku | active |
| `C50` | Meme malign neoplazmi | Meme | active |
| `C51` | Vulva malign neoplazmi | Jinekolojik | active |
| `C52` | Vajina malign neoplazmi | Jinekolojik | active |
| `C53` | Serviks uteri malign neoplazmi | Jinekolojik | active |
| `C54` | Korpus uteri malign neoplazmi | Jinekolojik | active |
| `C55` | Uterus malign neoplazmi, kisim belirtilmemis | Jinekolojik | active |
| `C56` | Over malign neoplazmi | Jinekolojik | active |
| `C60` | Penis malign neoplazmi | Uroonkoloji | active |
| `C62` | Testis malign neoplazmi | Uroonkoloji | active |
| `C64` | Bobrek malign neoplazmi (renal pelvis haric) | Uroonkoloji | active |
| `C65` | Renal pelvis malign neoplazmi | Uroonkoloji | active |
| `C66` | Ureter malign neoplazmi | Uroonkoloji | active |
| `C67` | Mesane malign neoplazmi | Uroonkoloji | active |
| `C71` | Beyin malign neoplazmi | Noroonkoloji | active |
| `C73` | Tiroid bezi malign neoplazmi | Endokrin | active |
| `C74` | Adrenal (surrenal) bez malign neoplazmi | Endokrin | active |
| `C80` | Primer bolgesi bilinmeyen malign neoplazm | Diger | active |
| `C81` | Hodgkin lenfoma | Hematoloji | active |
| `C82` | Folikuler lenfoma | Hematoloji | active |
| `C83` | Non-folikuler lenfoma | Hematoloji | active |
| `C84` | Matur T/NK hucreli lenfomalar | Hematoloji | active |
| `C85` | Non-Hodgkin lenfoma, diger ve tanimlanmamis tipler | Hematoloji | active |
| `C90` | Multipl myelom ve malign plazma hucreli neoplazmlar | Hematoloji | active |
| `D48` | Diger/tanimlanmamis bolgelerin belirsiz davranisli neoplazmi | Diger | active |
| `M95` | (Dogrulanmamis) ICD-10'da M95 kas-iskelet sistemi deformitesi kodudur | Dogrulanmali | **needs-review** |

### Dogrulanmayi bekleyenler

- `M95` — Kaynak uygulamanin kod listesinde yer aliyordu fakat M95 onkolojik bir kod degil. Muhtemelen veri giris hatasi (C95/C96 olabilir). SUT Tablo-1 metniyle karsilastirilip ya duzeltilmeli ya da cikarilmalidir. Bkz. docs/duzeltmeler.md#acik-konular

## `naf-onkolojik`

F-18 NaF kemik PET/BT icin gecerli onkolojik tanilar

- **Uygulama:** eslesmeyen kod reddedilir
- **Genisletir:** `tablo-1`
- **Toplam kod (miras dahil):** 62

| Kod | Tanim | Grup | Durum |
| --- | --- | --- | --- |
| `C61` | Prostat malign neoplazmi | Uroonkoloji | **proposed** |

### Dogrulanmayi bekleyenler

- `C61` — Kaynak uygulamada kemik PET hizli secim tuslari C61 sunuyordu fakat dogrulama listesinde C61 yoktu; tusa basan kullanici her zaman 'odenmez' aliyordu. Kemik metastazi degerlendirmesinde prostat kanseri en sik endikasyon oldugu icin kume burada genisletildi. Bkz. docs/duzeltmeler.md#h-02

## `psma-tanilar`

Ga-68 PSMA PET/BT icin gecerli ICD-10 kodlari

- **Uygulama:** eslesmeyen kod reddedilir
- **Toplam kod (miras dahil):** 5

| Kod | Tanim | Grup | Durum |
| --- | --- | --- | --- |
| `C61` | Prostat malign neoplazmi | Uroonkoloji | active |
| `D40` | Erkek genital organlarin belirsiz davranisli neoplazmi | Uroonkoloji | active |
| `Z03` | Suphelenilen hastalik icin gozlem ve degerlendirme | Suphe | active |
| `R97` | Anormal tumor belirtecleri (R97.2: yukselmis PSA duzeyi) | Suphe | **proposed** |
| `R39` | Idrar sistemi ile ilgili diger belirti ve bulgular | Suphe | **needs-review** |

### Dogrulanmayi bekleyenler

- `R97` — Kaynak uygulama 'PSA Yuksekligi' kisayolunu R39.1 koduna baglamisti; R39.1 idrar yapma guclugu kodudur. Yukselmis PSA'nin ICD-10 karsiligi R97.2'dir. Bkz. docs/duzeltmeler.md#h-03
- `R39` — Kaynak uygulamadan geriye donuk uyumluluk icin korundu. Klinik olarak PSA yuksekligini karsilamaz; R97.2 tercih edilmelidir.

## `kolin-tanilar`

F-18 Kolin PET/BT - primer hiperparatiroidi

- **Uygulama:** eslesmeyen kod reddedilir
- **Toplam kod (miras dahil):** 1

| Kod | Tanim | Grup | Durum |
| --- | --- | --- | --- |
| `E21` | Hiperparatiroidizm ve paratiroid bezinin diger bozukluklari | Endokrin | active |

## `net-tanilar`

Ga-68 DOTATATE PET/BT - noroendokrin tumor tanilari

- **Uygulama:** eslesmeyen kod uyari uretir, akis surer
- **Toplam kod (miras dahil):** 13

| Kod | Tanim | Grup | Durum |
| --- | --- | --- | --- |
| `C7A` | Malign noroendokrin tumorler | NET | active |
| `C75` | Diger endokrin bezler ve ilgili yapilar | NET | active |
| `C73` | Tiroid bezi malign neoplazmi (medüller tiroid ca dahil) | NET | active |
| `C74` | Adrenal bez malign neoplazmi | NET | active |
| `C25` | Pankreas malign neoplazmi (endokrin pankreas dahil) | NET | active |
| `C17` | Ince barsak malign neoplazmi | NET | active |
| `C18` | Kolon malign neoplazmi | NET | active |
| `C16` | Mide malign neoplazmi | NET | active |
| `C34` | Brons ve akciger malign neoplazmi (bronsial karsinoid) | NET | active |
| `C37` | Timus malign neoplazmi (timik karsinoid) | NET | active |
| `C80` | Primer bolgesi bilinmeyen malign neoplazm | NET | active |
| `D3A` | Benign noroendokrin tumorler | NET | **proposed** |
| `E34.0` | Karsinoid sendrom | NET | **proposed** |

### Dogrulanmayi bekleyenler

- `D3A` — ICD-10-CM benign noroendokrin tumor kodu. Turkiye ICD-10 uygulamasinda karsiligi kurum bazinda degisebilir; SUT metniyle dogrulanmali.
- `E34.0` — Karsinoid sendrom. DOTATATE endikasyonunda klinik olarak anlamli fakat SUT metninde acikca sayilip sayilmadigi dogrulanmali.

## `beyin-tanilar`

Beyin F-18 FDG PET/BT - norolojik endikasyonlar

- **Uygulama:** eslesmeyen kod uyari uretir, akis surer
- **Toplam kod (miras dahil):** 7

| Kod | Tanim | Grup | Durum |
| --- | --- | --- | --- |
| `G30` | Alzheimer hastaligi | Demans | active |
| `G31` | Sinir sisteminin diger dejeneratif hastaliklari | Demans | active |
| `F00` | Alzheimer hastaliginda demans | Demans | active |
| `F01` | Vaskuler demans | Demans | active |
| `F03` | Tanimlanmamis demans | Demans | active |
| `G40` | Epilepsi | Epilepsi | active |
| `G41` | Status epileptikus | Epilepsi | active |

