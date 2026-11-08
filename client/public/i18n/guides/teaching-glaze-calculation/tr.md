---
title: Sır hesabının öğretilmesi
lead: Bir sınıf ya da çalışma grubu için 6 oturum; hammaddelerden ve üçgen test karolarından, iki yönde de çalışılan Seger formülüne ve sır kusurlarına kadar. Her birinde çözümlü bir örnek, Glazecalc’teki adımlar, yazdırılacak bir çalışma kâğıdı ve kontrol soruları var.
---

## Bu paket hakkında {#about}

Bu paket, sır hesabı öğreten herkes içindir: bir okul, bir atölye sınıfı, çalışan seramikçilerden oluşan bir çalışma grubu ya da tek başına öğrenen bir seramikçi. Altı oturumu vardır ve her birinde amaçlar, hazırlık, gerçek hammaddelerle çözümlü bir örnek, Glazecalc’te nasıl yapılacağı, bir çalışma kâğıdı ve kontrol soruları bulunur.

Oturumların sırası, yayımlanmış bir çalışma grubunu izler: Japonya’daki Ibaraki Eyaleti Sanayi Teknolojisi Merkezi’nin 陶磁器釉薬技術研究会 (seramik sırı teknolojisi çalışma grubu). Grup 2015’te 12 genç seramikçi için altı oturum yürüttü ve bunları araştırma raporunda bildirdi. Kasama seramik sanatı kolejindeki devam kursu, her biri oksidasyonda ve redüksiyonda pişirilen, sırasıyla 42, 90 ve 78 sırlık üç karo ödevi verdi. **Glazecalc, merkezle ya da kolejle bağlantılı değildir.** Yayımlanmış taslaklarının sırasını izliyoruz ve aşağıda kaynak gösteriyoruz; buradaki metin, örnekler ve çalışma kâğıtları bize aittir. Başka ülkelerdeki dersler aynı adımları hemen hemen aynı sırayla öğretir: Türkiye’de Bilecik Şeyh Edebali Üniversitesi’nin SCT305 dersi, ABD’de Glendale Community College ART 195 dersi, Almanya’da Rheinland-Pfalz eyaletinin seramik okulları müfredatı ve Tayvan’da öğretmenler için yazılmış 李堅萍 makalesi (2006).

Table: Altı oturum
Label: Altı oturum

| Oturum | Konu                                                | Glazecalc’te                                       |
| ------ | --------------------------------------------------- | -------------------------------------------------- |
| 1      | Hammaddeler, ne yaptıkları, üçgen test karoları     | Hammaddeler, Test karoları için karışımlar (üçgen) |
| 2      | Kimya: elementler, formüller, mol                   | Bir hammaddenin sayfası                            |
| 3      | Seger formülünün okunması, silis ve alümina grafiği | Reçete sayfası, Stull diyagramı                    |
| 4      | Reçeteden Seger formülüne                           | Seger formülü nasıl hesaplanır                     |
| 5      | Seger formülünden reçeteye                          | Hedefe göre çözüm                                  |
| 6      | Bünye ve sır kusurları                              | Sınırlar, Karşılaştır                              |

### Nasıl kullanılır

- Her oturum yaklaşık 2 saat sürer. 4. ve 5. oturumlarda hesap makineleri ve her çift için Glazecalc açılabilen bir bilgisayar ya da telefon gerekir.
- Çözümlü örnekler Japonya’da satılan hammaddeleri ve Glazecalc’in standart kütüphanesindeki değerleri kullanır: 福島長石 (Fukushima feldspatı), kalsit{{en: whiting}} (石灰石, kalsiyum karbonat), bir kaolen ve silis (珪石). Elinizde kendi tedarikçinizin analizi varsa onu kullanın: [Hammaddeler](/material) sayfasına ekleyin; sayılar değişir, ama yöntem değişmez.
- Pişirim SK 8’dir, nominal {{2282 °F; 1250 °C}}. Sınıfınızın pişirdiği piramidi kullanın; SK numaralarını [SK piramitleriyle pişirim](/guides/firing#sk-cones) rehberi açıklar.
- Bir çalışma kâğıdını ya da karo haritasını yazdırmak için bu sayfayı tarayıcıdan yazdırın. Reçeteleri, karışımları ve notları kaydetmek için ücretsiz bir hesap gerekir.

> [!WARNING]
> Oturum 1, 3 ve 6 laboratuvar çalışmasıdır: kuru hammaddeleri tartmak ve pişirmek. Herhangi biri bir hammadde tartmadan önce [En önemli alışkanlıklar](/guides/safe-mixing#habits) bölümünü okuyun. Kuru sır tozu asıl tehlikedir.

## 1. oturum: Hammaddeler ve üçgen test karoları {#materials}

> [!WARNING]
> Kuru hammaddeleri nazikçe tartın, ıslak temizleyin ve tozlar kuruyken yüzünüze oturan bir solunum koruyucu maske takın. Önce [Asıl tehlike: toz](/guides/safe-mixing#the-main-hazard) ve [Solunum koruyucu maskeler](/guides/safe-mixing#respirators) bölümlerini okuyun.

### Amaçlar

- Bir sırdaki üç görevi adlandırın: cam yapıcı{{en: glass former}}, ergitici{{en: flux}} ve stabilizatör{{en: stabilizer}}.
- 4 yaygın hammaddeyi getirdikleri oksitlere göre ayırın.
- Bir üçgen karışım testi kurun ve karolarını bir harita olarak okuyun.

### Hazırlık

- 福島長石, kalsit, bir kaolen ve silisten birer torba ya da sınıfınızdaki hammaddeler.
- Aşağıdaki [üçgen karışım karo haritası](#tile-maps), yazdırılmış; her üçgen için öğrenci başına 21 test karosu.
- Varsa önceki bir üçgen karışım testinden pişmiş karolar, elden ele dolaştırmak için.

### Çözümlü örnek

Glazecalc kütüphanesindeki her hammaddenin analizi, pişirimden sonra bıraktığı oksitleri verir. Kızdırma kaybı (K.K.){{en: loss on ignition}}, yanıp giden kısımdır.

Table: Dört hammadde ve getirdikleri (ağırlıkça yüzde, kütüphaneden)
Label: Dört hammadde

| Hammadde            | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |  K.K. | Görevi                                          |
| ------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ----------------------------------------------- |
| 福島長石 (feldspat) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Ergitici; kendi alüminası ve silisiyle birlikte |
| Kalsit (石灰石)     |    – |     – |     – |    – | 56,03 | 43,97 | Ergitici (kalsiyum)                             |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizatör: başlıca alümina kaynağı           |
| Silis (珪石)        |  100 |     – |     – |    – |     – |     – | Cam yapıcı                                      |

Tek başına feldspat SK 8’de erir ve viskoz bir cam olur; kalsit tek başına erimez; silis tek başına erimez. Karıştırıldıklarında, her birinden çok daha iyi erirler. Bir üçgen karışım testi bunun nerede olduğunu gösterir: aşağıdaki karo haritası üçünü ~%20 aralıklarla (90’dan 18) değiştirir ve her karoda %10 kaolen vardır.

::shops

### Glazecalc’te

1. Her hammaddeyi [Hammaddeler](/material) sayfasında ya da [Fukushima Feldspar](/materials/fukushima-feldspar) gibi herkese açık sayfasında açın. Hangi oksitleri getirdiğini not edin.
2. Üç reçete hazırlayın: 福島長石 90 ile kaolen 10, kalsit 90 ile kaolen 10 ve silis 90 ile kaolen 10. [Test karoları için karışımlar](/blends) sayfasında **Üçgen (3 reçete)** ve 6 sıra seçin: 21 karo, aşağıdaki haritayla aynı.
3. Her karo için tartım miktarını seçin ve tartılacakları **Yazdır** ile yazdırın. Pişirimden sonra beğendiğiniz karoları karoların çiziminden reçete olarak kaydedin.

### Çalışma kâğıdı

Table: Çalışma kâğıdı 1: her hammadde ne getirir
Label: Çalışma kâğıdı 1

| Hammadde | Getirdiği oksitler | Cam yapıcı, ergitici ya da stabilizatör? | K.K. (%) |
| -------- | ------------------ | ---------------------------------------- | -------- |
| 福島長石 |                    |                                          |          |
| Kalsit   |                    |                                          |          |
| Kaolen   |                    |                                          |          |
| Silis    |                    |                                          |          |

### Kontrol

- Alüminanın çoğunu hangi hammadde getirir ve bir sır buna neden ihtiyaç duyar?
- Üçgenin kalsit köşesi neden kendi başına erimez?
- Karolarınız üçgenin neresinde en iyi eridi ve bu hangi köşeye en yakındı?

## 2. oturum: İhtiyaç duyduğunuz kimya {#chemistry}

### Amaçlar

- Bir kimyasal formülü okuyun: SiO₂, CaO, Al₂O₃, CaCO₃.
- Atom ağırlıklarından bir mol kütlesi hesaplayın.
- Gramı mole, molü grama çevirin.

### Hazırlık

- Her öğrenci için bir periyodik tablo ve hesap makineleri.
- Aşağıdaki tablodaki atom ağırlıkları (IUPAC’ın standart değerleri; Glazecalc’in kullandığı gibi).

### Çözümlü örnek

Table: Burada kullanılan atom ağırlıkları (g/mol)
Label: Atom ağırlıkları

| Element   | Simge | Atom ağırlığı |
| --------- | ----- | ------------: |
| Oksijen   | O     |        15,999 |
| Karbon    | C     |        12,011 |
| Sodyum    | Na    |         22,99 |
| Alüminyum | Al    |        26,982 |
| Silisyum  | Si    |        28,085 |
| Potasyum  | K     |        39,098 |
| Kalsiyum  | Ca    |        40,078 |

Bir formül atomları sayar. SiO₂ bir silisyum ve iki oksijendir, bu yüzden bir molü 28,085 + 2 × 15,999 = 60,083 g gelir. Al₂O₃ 2 × 26,982 + 3 × 15,999 = 101,961 g’dır. CaO 56,077 g’dır ve kalsit, CaCO₃, 100,086 g’dır; Glazecalc’in kütüphanesi bunu 100,08’e yuvarlar.

**Mol** bir sayıdır, tıpkı bir düzine gibi: moleküller ne olursa olsun aynı sayıda molekül. Mol, gram ÷ mol kütlesidir:

- 25 g silis 25 ÷ 60,083 = 0,416 mol SiO₂ eder.
- 20 g kalsit 20 ÷ 100,08 = 0,200 mol eder. Fırında karbondioksidini (CO₂, 44,009 g/mol) kaybeder ve 0,200 mol CaO bırakır; bu da 0,200 × 56,077 = 11,2 g gelir. Bu kayıp kızdırma kaybıdır: %43,97.

### Glazecalc’te

1. [Whiting](/materials/whiting) ve [Silica](/materials/silica) sayfalarını açın: her sayfa formülü ve ağırlıklarını verir.
2. Bir mol kütlesini elle hesaplayıp sayfadakiyle karşılaştırın.

### Çalışma kâğıdı

Table: Çalışma kâğıdı 2: mol kütlesi ve mol
Label: Çalışma kâğıdı 2

| Oksit ya da hammadde | Formül | Mol kütlesi (g/mol) | Gram | Mol |
| -------------------- | ------ | ------------------- | ---- | --- |
| Silis                | SiO₂   |                     | 30   |     |
| Alümina              | Al₂O₃  |                     | 10   |     |
| Kalsiyum oksit       | CaO    |                     | 5    |     |
| Kalsit               | CaCO₃  |                     | 15   |     |

### Kontrol

- Bir mol SiO₂ kaç gram gelir ve bu nasıl hesaplanır?
- 20 g kalsit, pişmiş sırda neden 20 g’dan az bırakır?
- Oksitleri neden gramla değil molle karşılaştırırız?

## 3. oturum: Seger formülünün okunması {#reading-the-formula}

> [!WARNING]
> Bir sırrı renklendirmek renklendirici tartmak demektir; bunlardan bazıları temel hammaddelerden daha fazla dikkat ister. Önce [En çok dikkat gerektiren hammaddeler](/guides/safe-mixing#materials) bölümünü okuyun.

### Amaçlar

- Bir Seger formülünün (ゼーゲル式, UMF){{en: unity formula}} üç sütununu okuyun: ergiticiler, stabilizatör, cam yapıcı.
- Bir sırrı silis ve alümina grafiğinde bulun ve grafiğin neyi söyleyip neyi söyleyemeyeceğini bilin.
- Hazır bir sırrı adım adım renklendirin ve kaydedin.

### Hazırlık

- Aşağıdaki Seger formülü, büyük yazılmış.
- Hazır, şeffaf bir sır ve kırmızı demir oksit (弁柄) gibi bir renklendirici.

### Çözümlü örnek

Oturum 4’teki sır, yani 福島長石 45, kalsit 20, kaolen 10 ve silis 25, şu Seger formülüne sahiptir (Glazecalc’in değerleri, yuvarlanmış):

Table: Üç sütunlu bir Seger formülü
Label: Bir Seger formülü

| Ergiticiler (RO, R₂O) | Stabilizatör (R₂O₃) | Cam yapıcı (RO₂) |
| --------------------- | ------------------- | ---------------- |
| K₂O 0,18              | Al₂O₃ 0,43          | SiO₂ 3,45        |
| Na₂O 0,10             |                     |                  |
| CaO 0,72              |                     |                  |

- Ergiticiler toplamda 1 eder: formülün kuralı budur. Diğer her sayı, her bir mol ergitici için moldür.
- Silis/alümina oranı 3,45 ÷ 0,43, yaklaşık 8: tipik bir parlak sır.
- Ergiticinin çoğu kalsiyumdur, çoğu Japon kireç sırrında (石灰釉) olduğu gibi.

Silisin yatay, alüminanın dikey eksende olduğu bir grafik her sırrı bir nokta olarak yerleştirir. Seger’in denemeleri ve Stull’un 1912 tarihli grafiği bu türdendir; bir 釉性状図 ise bir sınıfın kendi pişirdiği karoları bunun üzerine yerleştirir. Glazecalc’in reçete sayfası Stull diyagramını çizer ve bu sır onun parlak bölgesinde yer alır. Stull’un bölgeleri kendi ergiticilerinden ve pişiriminden gelir: bir kılavuzdur, bir tahmin değildir. Aşağıdaki [karo ızgarası](#tile-maps), bir sınıfın kendi pişiriminde kendi grafiğini çizmesini sağlar.

::stull-chart

Reçetesini bilmediğiniz hazır bir sırrı renklendirirken Glazecalc formülünü hesaplayamaz. Bunun yerine renklendiriciyi 100’ün üzerine ekleyin: 100 g kuru sır ile 1, 2 ve 3 g demir oksit, her biri için bir karo, oksidasyonda ve redüksiyonda pişirilir.

### Glazecalc’te

1. [Reçete sayfasında](/recipe) yukarıdaki reçeteyi girin ve **Seger formülü** ile **Stull diyagramını** okuyun.
2. Silisi 25’ten 35’e değiştirin ve noktanın sağa doğru hareket etmesini izleyin.
3. Reçetesini bildiğiniz bir temel için renklendiriciyi katkı yapın ve adım adım artırmak için [Test karoları için karışımlar](/blends) sayfasında doğrusal karışım testi kullanın.

### Çalışma kâğıdı

Table: Çalışma kâğıdı 3: hazır bir sırda renklendirici
Label: Çalışma kâğıdı 3

| Karo | Renklendirici (100 g başına g) | Oksidasyon: nasıl görünüyor | Redüksiyon: nasıl görünüyor |
| ---- | ------------------------------ | --------------------------- | --------------------------- |
| 1    | 0                              |                             |                             |
| 2    | 1                              |                             |                             |
| 3    | 2                              |                             |                             |
| 4    | 3                              |                             |                             |

### Kontrol

- Bir Seger formülünde hangi sütun toplamda 1 eder?
- Bu sırrın silis/alümina oranı nedir ve neyi düşündürür?
- Grafiğin parlak bölgesindeki bir nokta, sizin fırınınızda neden yine de mat bir karo verebilir?

## 4. oturum: Reçeteden Seger formülüne {#recipe-to-formula}

### Amaçlar

- Bir reçeteden Seger formülünü elle hesaplayın.
- Glazecalc’in kendi hesabıyla karşılaştırarak kontrol edin.

### Hazırlık

- Çalışma kâğıdı 4, 1. oturumdaki dört analiz ve hesap makineleri.

### Çözümlü örnek

Reçete: 福島長石 45, kalsit 20, EPK kaolen 10, silis 25. Her miktarı gram olarak alın. Her hammadde için gram × oksidin yüzdesi ÷ 100 ÷ mol kütlesi, molünü verir. Tablo ana oksitleri verir; Glazecalc eser miktarları da sayar (kaolenin demiri ve titanyumu, feldspatın magnezyumu).

Table: Tartımdaki her oksidin molü (100 g)
Label: Tartımdaki mol

| Hammadde | Gram |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ---: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |   45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kalsit   |   20 |      – |      – | 0,1998 |      – |      – |
| Kaolen   |   10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Silis    |   25 |      – |      – |      – |      – | 0,4161 |
| Toplam   |  100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Ergiticiler toplamda 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnezyum oksit) = 0,2847 mol eder. Her toplamı buna bölün:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Bu, 3. oturumdaki formüldür.

### Glazecalc’te

1. Reçeteyi [reçete sayfasına](/recipe) girin.
2. **Seger formülü nasıl hesaplanır** bölümünü açın. Bu adımları bu reçetenin sayılarıyla gösterir: gramlar, her hammaddedeki her oksidin molü, toplamlar ve ergiticilere bölme.
3. Her satırı çalışma kâğıdınızla karşılaştırın. Sonra bir miktarı değiştirin ve yalnızca değiştirdiği sütunu hesaplayın.

### Çalışma kâğıdı

Table: Çalışma kâğıdı 4: reçeteden Seger formülüne
Label: Çalışma kâğıdı 4

| Hammadde      | Gram | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------- | ---- | --- | ---- | --- | ----- | ---- |
|               |      |     |      |     |       |      |
|               |      |     |      |     |       |      |
|               |      |     |      |     |       |      |
|               |      |     |      |     |       |      |
| Toplam        |      |     |      |     |       |      |
| ÷ ergiticiler |      |     |      |     |       |      |

### Kontrol

- Hangi tartım miktarı olursa olsun neden aynı Seger formülü çıkar?
- Kaolen hangi oksitleri getirir ve bunlardan hangisi burada en önemlidir?
- Kalsitin kızdırma kaybı neden formülün dışında bırakılır?

## 5. oturum: Seger formülünden reçeteye {#formula-to-recipe}

### Amaçlar

- Hedef bir formül için hammaddeleri seçin ve her birinden ne kadar gerektiğini hesaplayın.
- Hedefe göre çözüm özelliğini kullanın ve hedefe ne kadar yaklaştığını söyleyin.

### Hazırlık

- Aşağıdaki hedef, çalışma kâğıdı 5 ve hesap makineleri; hesap açılmış bir Glazecalc.

### Çözümlü örnek

Hedef: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ ve 4,0 SiO₂. Hammaddeleri bu sırayla alın; her biri yalnızca onun getirebildiği oksit için:

1. **Feldspat, potasyum ve sodyum için.** Bir birim 福島長石 (536,8 g, bir mol ergitici içeren ağırlık) 0,94 mol K₂O ve Na₂O getirir. Hedef 0,3 ister, yani 0,3 ÷ 0,94 = 0,319 birim: 171,4 g. Ayrıca 0,015 CaO, 0,328 Al₂O₃ ve 1,865 SiO₂ getirir.
2. **Kalsit, kalsiyumun geri kalanı için.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolen, alüminanın geri kalanı için.** 0,4 − 0,328 = 0,072 mol. EPK kaolenin 272,6 g’ında bir mol Al₂O₃ vardır, yani 19,6 g; bu da 0,149 SiO₂ getirir.
4. **Silis, geri kalanı için.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Tartım 379,0 g’dır. Yüzde olarak: 福島長石 45,2, kalsit 18,1, kaolen 5,2, silis 31,5. Potasyum/sodyum oranını feldspat belirler; bu yüzden reçete 0,195 K₂O ve 0,104 Na₂O verir: hedefe yakın, tam hedefte değil.

### Glazecalc’te

1. [Hedefe göre çözüm](/solve) sayfasını açın, **Bir Seger formülü (mol; ergiticiler toplamda 1 eder)** seçeneğini seçin ve hedefi yazın.
2. **Hammaddeler** altına 福島長石, kalsit, EPK kaolen ve silisi girin ve **Çöz** düğmesine basın.
3. 福島長石 44,9, kalsit 18,2, kaolen 5,6 ve silis 31,3 sonucunu ve her oksidin ne kadar yaklaştığını gösteren bir tablo verir. Elle yaptığınız hesapla karşılaştırın: çözücü her eser miktarı sayar ve dört hammaddenin izin verdiği en iyi uyumu bulur.
4. **Yeni reçete olarak aç** seçeneğini seçin ve reçete sayfasında kontrol edin.

### Çalışma kâğıdı

Table: Çalışma kâğıdı 5: hedeften reçeteye
Label: Çalışma kâğıdı 5

| Adım | Hammadde | Hangi oksit için | Gereken mol | Gram | Ayrıca getirdiği |
| ---- | -------- | ---------------- | ----------- | ---- | ---------------- |
| 1    |          |                  |             |      |                  |
| 2    |          |                  |             |      |                  |
| 3    |          |                  |             |      |                  |
| 4    |          |                  |             |      |                  |

### Kontrol

- Feldspat neden ilk hesaplanır?
- Bu dört hammadde neden tam olarak 0,2 K₂O ve 0,1 Na₂O veremez?
- Magnezyum oksidi getirmek için hammaddelere ne eklerdiniz?

## 6. oturum: Bünye ve sır kusurları {#body-and-defects}

> [!WARNING]
> Pişmiş bir sır yiyeceğe ve içeceğe metal salabilir ve bunu yaparken kusursuz görünebilir. Baryumu yüksek ya da bakır içeren sırlar ve kurşun içeren her sır metal salabilir. Neyi saldığını yalnızca pişmiş kabın laboratuvar salım testi{{en: leach test}} gösterir; hiçbir hesap göstermez. [Gıdaya uygunluk](/guides/glazing-basics#food-safety) ve [En çok dikkat gerektiren hammaddeler](/guides/safe-mixing#materials) bölümlerini okuyun.

### Amaçlar

- Bir bünyenin büzülmesini ve su emmesini ölçün.
- Yaygın kusurları, olağan nedenlerini ve denenecek ilk çözümü adlandırın.
- Hangi kusurların ürünü güvensiz yaptığını bilin.

### Hazırlık

- Bünyenizin test çubukları: ıslakken 100 mm aralıkla işaretlenmiş, pişmiş ve pişmemiş.
- Kusurlu karolar, varsa: sır çatlağı, toplanma, iğne deliği, akma.

### Çözümlü örnek

- **Büzülme**: (işaretli uzunluk − pişmiş uzunluk) ÷ işaretli uzunluk × 100. Aralarında 100 mm olan işaretler pişirimden sonra 88 mm ölçülürse: %12 büzülme.
- **Su emme**: (ıslatma sonrası ağırlık − kuru ağırlık) ÷ kuru ağırlık × 100. Ağırlığı 50,0 g olan pişmiş bir çubuk ıslatıldıktan sonra 50,6 g gelirse: %1,2.

Table: Kusurlar, nedenleri ve Seger formülünde denenecek ilk çözüm
Label: Kusurlar

| Kusur         | Olağan neden                               | Denenecek ilk çözüm                                                 |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Sır çatlağı   | Sır bünyeden daha fazla büzülür            | K₂O ve Na₂O daha az; kalsiyum, magnezyum oksit ya da bor daha fazla |
| Sır kavlaması | Sır bünyeden çok daha az büzülür           | K₂O ve Na₂O daha fazla                                              |
| Akma          | Alümina çok az ya da sır çok kalın         | Daha fazla alümina; daha ince bir kat                               |
| Toplanma      | Tozlu bisküvi ya da çatlayan kalın bir kat | Bisküviyi temizleyin; daha ince bir kat                             |
| İğne deliği   | Üstü kapanıp iyileşmeyen gaz               | Pişirimin en yüksek sıcaklığında bekletme; daha ince bir kat        |

[Sır-bünye uyumu ve sır kusurları](/guides/glazing-basics#fit-and-defects) bölümü her birini, sır çatlağı için buzlu su testiyle birlikte açıklar. Sır çatlağı ya da kavlaması olan ürünleri yiyecek ve içecek için kullanmayın.

::food-limits

### Glazecalc’te

1. [Reçete sayfasında](/recipe) kendi sırlarınızdan biri için **Sınırlar** panelini ve hesaplanan genleşmesini okuyun.
2. Reçeteyi kopyalayın, feldspatın bir kısmını kalsitle değiştirin ve ikisini karşılaştırın: genleşme hangi yöne hareket etti?

### Çalışma kâğıdı

Table: Çalışma kâğıdı 6: bünye
Label: Çalışma kâğıdı 6

| Çubuk | İşaretli uzunluk (mm) | Pişmiş uzunluk (mm) | Büzülme (%) | Kuru ağırlık (g) | Islatılmış ağırlık (g) | Su emme (%) |
| ----- | --------------------- | ------------------- | ----------- | ---------------- | ---------------------- | ----------- |
| 1     | 100                   |                     |             |                  |                        |             |
| 2     | 100                   |                     |             |                  |                        |             |

### Kontrol

- Hangi kusur, bünyesinden daha fazla büzülen bir sırdan gelir ve ilk çözüm nedir?
- Kavlama olan ürün neden yiyecek için asla kullanılmamalıdır?
- Bir hesap, bir sırrın gıdaya uygun olduğunu söyleyebilir mi? Ne söyleyebilir?

## Yazdırılacak karo haritaları {#tile-maps}

### Üçgen karışım haritası: 42 sır

Her biri 21 karodan oluşan iki üçgen, Test karoları için karışımların 6 sıralı düzeninden: 1 numaralı karo en üstte (feldspat), alt sıra soldaki kalsitten sağdaki silise. Üçgen II, her 100 g’ın üzerine 1 g kırmızı demir oksit eklenmiş üçgen I’dir; redüksiyonda seladon (青磁) yönüne döner. Oksidasyonda ve redüksiyonda pişirildiğinde bu 84 karo eder. Miktarlar 100 g başına gramdır.

Table: Üçgen karışım haritası: 福島長石, kalsit ve silis, her karoda 10 kaolen
Label: Üçgen karışım haritası

| Karo (I) | Karo (II) | 福島長石 | Kalsit | Silis | Kaolen | I oks | I red | II oks | II red |
| -------- | --------- | -------: | -----: | ----: | -----: | ----- | ----- | ------ | ------ |
| 1        | 22        |       90 |      0 |     0 |     10 |       |       |        |        |
| 2        | 23        |       72 |     18 |     0 |     10 |       |       |        |        |
| 3        | 24        |       72 |      0 |    18 |     10 |       |       |        |        |
| 4        | 25        |       54 |     36 |     0 |     10 |       |       |        |        |
| 5        | 26        |       54 |     18 |    18 |     10 |       |       |        |        |
| 6        | 27        |       54 |      0 |    36 |     10 |       |       |        |        |
| 7        | 28        |       36 |     54 |     0 |     10 |       |       |        |        |
| 8        | 29        |       36 |     36 |    18 |     10 |       |       |        |        |
| 9        | 30        |       36 |     18 |    36 |     10 |       |       |        |        |
| 10       | 31        |       36 |      0 |    54 |     10 |       |       |        |        |
| 11       | 32        |       18 |     72 |     0 |     10 |       |       |        |        |
| 12       | 33        |       18 |     54 |    18 |     10 |       |       |        |        |
| 13       | 34        |       18 |     36 |    36 |     10 |       |       |        |        |
| 14       | 35        |       18 |     18 |    54 |     10 |       |       |        |        |
| 15       | 36        |       18 |      0 |    72 |     10 |       |       |        |        |
| 16       | 37        |        0 |     90 |     0 |     10 |       |       |        |        |
| 17       | 38        |        0 |     72 |    18 |     10 |       |       |        |        |
| 18       | 39        |        0 |     54 |    36 |     10 |       |       |        |        |
| 19       | 40        |        0 |     36 |    54 |     10 |       |       |        |        |
| 20       | 41        |        0 |     18 |    72 |     10 |       |       |        |        |
| 21       | 42        |        0 |      0 |    90 |     10 |       |       |        |        |

### Seger ızgarası: 24 sır

Her karoda ergiticiler aynıdır: 福島長石 ve kalsitten gelen 0,2 KNaO ve 0,8 CaO. Alümina ızgarada satırlar boyunca aşağı inildikçe artar, silis de sütunlar boyunca sağa gidildikçe artar. Reçeteler 5. oturumdaki yöntemle hesaplanmıştır; Glazecalc’in hesapladığı her Seger formülü, alümina için en fazla 0,01, silis için en fazla 0,06 sapar. Her karoyu silisin alümina karşısındaki grafiğinde işaretleyin ve kendi bölgelerinizi çizin: mat, parlak, az pişmiş, akma.

Table: Seger ızgarası: 0,2 KNaO, 0,8 CaO, ağırlıkça yüzde
Label: Seger ızgarası

| Karo | Al₂O₃ | SiO₂ | 福島長石 | Kalsit | Kaolen | Silis | Oksidasyon | Redüksiyon |
| ---- | ----: | ---: | -------: | -----: | -----: | ----: | ---------- | ---------- |
| 1    |  0,25 |  2,0 |     46,9 |   32,5 |    3,5 |  17,1 |            |            |
| 2    |  0,25 |  2,5 |     41,8 |   28,9 |    3,1 |  26,2 |            |            |
| 3    |  0,25 |  3,0 |     37,6 |   26,1 |    2,8 |  33,5 |            |            |
| 4    |  0,25 |  3,5 |     34,3 |   23,7 |    2,5 |  39,5 |            |            |
| 5    |  0,25 |  4,0 |     31,4 |   21,7 |    2,3 |  44,5 |            |            |
| 6    |  0,25 |  4,5 |     29,0 |   20,1 |    2,2 |  48,7 |            |            |
| 7    |  0,35 |  2,0 |     44,3 |   30,6 |   13,9 |  11,3 |            |            |
| 8    |  0,35 |  2,5 |     39,6 |   27,4 |   12,4 |  20,5 |            |            |
| 9    |  0,35 |  3,0 |     35,9 |   24,8 |   11,2 |  28,0 |            |            |
| 10   |  0,35 |  3,5 |     32,8 |   22,7 |   10,3 |  34,2 |            |            |
| 11   |  0,35 |  4,0 |     30,2 |   20,9 |    9,5 |  39,5 |            |            |
| 12   |  0,35 |  4,5 |     28,0 |   19,4 |    8,8 |  43,9 |            |            |
| 13   |  0,45 |  2,0 |     41,9 |   29,0 |   23,1 |   6,1 |            |            |
| 14   |  0,45 |  2,5 |     37,7 |   26,1 |   20,8 |  15,4 |            |            |
| 15   |  0,45 |  3,0 |     34,3 |   23,7 |   18,9 |  23,0 |            |            |
| 16   |  0,45 |  3,5 |     31,5 |   21,8 |   17,4 |  29,4 |            |            |
| 17   |  0,45 |  4,0 |     29,1 |   20,1 |   16,0 |  34,8 |            |            |
| 18   |  0,45 |  4,5 |     27,0 |   18,7 |   14,9 |  39,4 |            |            |
| 19   |  0,55 |  2,0 |     39,7 |   27,5 |   31,4 |   1,5 |            |            |
| 20   |  0,55 |  2,5 |     35,9 |   24,9 |   28,4 |  10,8 |            |            |
| 21   |  0,55 |  3,0 |     32,8 |   22,7 |   26,0 |  18,5 |            |            |
| 22   |  0,55 |  3,5 |     30,2 |   20,9 |   23,9 |  25,0 |            |            |
| 23   |  0,55 |  4,0 |     28,0 |   19,4 |   22,1 |  30,5 |            |            |
| 24   |  0,55 |  4,5 |     26,1 |   18,1 |   20,6 |  35,3 |            |            |

Glazecalc’in Test karoları için karışımlar özelliği 3 ile 66 karo arasında üçgenler ve kareler üretir, bu ızgarayı değil; herhangi bir karoyu [reçete sayfasında](/recipe) reçete olarak açın ve tartım listesini oradan yazdırın.

## Kaynaklar {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): altı oturum.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: oturumların tarihleri ve konuları.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: devam kursunun oksidasyonda ve redüksiyonda 42, 90 ve 78 sırlık ödevleri.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): merkezin kendi hesaplama programı.
- Bilecik Şeyh Edebali Üniversitesi, [SCT305 ders bilgileri](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): 5., 6. ve 8. haftalarda Seger formülü.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): Tayvan’daki okul öğretmenleri için sır hesabı.
- Glendale Community College, ART 195 ders taslağı: 15 haftanın 5. ile 7. haftaları arasında Seger formülü.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: Glazecalc’in kütüphanesindeki 福島長石 analizi.
- IUPAC, standart atom ağırlıkları, Glazecalc’in kimyasının kullandığı biçimde.
