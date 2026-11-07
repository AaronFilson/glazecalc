---
title: Lasitelaskennan opettaminen
lead: 6 opetuskertaa luokalle tai opintoryhmälle, raaka-aineista ja kolmiokokeen koepaloista Segerin kaavaan, jota lasketaan molempiin suuntiin, ja lasitevirheisiin, ja jokaisessa on laskuesimerkki, Glazecalcin vaiheet, tulostettava tehtävämoniste ja tarkistuskysymykset.
---

## Tietoja tästä paketista {#about}

Tämä paketti on tarkoitettu kaikille, jotka opettavat lasitelaskentaa: koululle, työpajan kurssille, työskentelevien keraamikkojen opintoryhmälle tai yksin opiskelevalle keraamikolle. Siinä on kuusi opetuskertaa, ja jokaisessa on tavoitteet, valmistelut, laskuesimerkki oikeilla raaka-aineilla, ohje Glazecalcissa tekemiseen, tehtävämoniste ja tarkistuskysymykset.

Opetuskertojen järjestys noudattaa julkaistua opintoryhmää: Japanin Ibarakin prefektuurin teollisuusteknologiakeskuksen 陶磁器釉薬技術研究会 (keraamisten lasitteiden tekniikan opintoryhmä) piti vuonna 2015 kuusi opetuskertaa 12 nuorelle keraamikolle ja raportoi ne tutkimusraportissaan. Sen jatkokurssilla Kasaman keramiikkataiteen oppilaitoksessa oli kolme koepalatehtävää, joissa oli 42, 90 ja 78 lasitetta, ja jokainen poltettiin hapettavassa{{en: oxidation}} ja pelkistävässä{{en: reduction}} poltossa. **Glazecalcilla ei ole yhteyttä keskukseen eikä oppilaitokseen.** Noudatamme heidän julkaisemansa suunnitelman järjestystä ja viittaamme siihen alla; tässä olevat tekstit, esimerkit ja tehtävämonisteet ovat omiamme. Muiden maiden kurssit opettavat samat vaiheet lähes samassa järjestyksessä: Turkissa kurssi SCT305 (Bilecik Şeyh Edebali University), Yhdysvalloissa kurssi ART 195 (Glendale Community College), Saksassa Rheinland-Pfalzin osavaltion keramiikkakoulujen opetussuunnitelma ja Taiwanissa 李堅萍 vuonna 2006 julkaisema opettajille suunnattu artikkeli.

Table: Kuusi opetuskertaa
Label: Kuusi opetuskertaa

| Opetuskerta | Aihe                                                                   | Glazecalcissa                                 |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| 1           | Raaka-aineet, niiden tehtävät, kolmiokokeen koepalat                   | Raaka-aineet, Seokset koepaloille (kolmiokoe) |
| 2           | Kemia: alkuaineet, kaavat, moolit                                      | Raaka-aineen sivu                             |
| 3           | Segerin kaavan (UMF) lukeminen, piidioksidin ja alumiinioksidin kaavio | Reseptisivu, Stullin kartta                   |
| 4           | Reseptistä Segerin kaavaan                                             | Miten Segerin kaava lasketaan                 |
| 5           | Segerin kaavasta reseptiin                                             | Ratkaise tavoitteen mukaan                    |
| 6           | Savimassa ja lasitevirheet                                             | Raja-arvot, Vertaa                            |

### Paketin käyttö

- Jokainen opetuskerta kestää noin 2 tuntia. Opetuskerroilla 4 ja 5 tarvitaan laskimia sekä jokaiselle parille tietokone tai puhelin, jossa on Glazecalc.
- Laskuesimerkeissä käytetään Japanissa myytäviä raaka-aineita ja Glazecalcin vakiokirjaston lukuja: 福島長石 (Fukushiman maasälpä), liitu{{en: whiting}} (石灰石, kalsiumkarbonaatti), kaoliini{{en: kaolin}} ja kvartsi{{en: silica}} (珪石). Käytä oman toimittajan analyysiä, jos sellainen on: lisää se [Raaka-aineet-sivulle](/material), jolloin luvut muuttuvat, mutta menetelmä ei.
- Polttokeila on SK 8, nimellisesti {{2282 °F; 1250 °C}}. Käytä keilaa, johon luokka polttaa; [Poltto SK-keiloihin](/guides/firing#sk-cones) selittää SK-numerot.
- Tehtävämonisteen tai koepalakartan saa tulostettua tulostamalla tämän sivun selaimesta. Reseptien, seosten ja muistiinpanojen tallentaminen vaatii ilmaisen tilin.

> [!WARNING]
> Opetuskerrat 1, 3 ja 6 ovat laboratoriotyötä: kuivien raaka-aineiden punnitsemista ja polttoa. Ennen kuin kukaan punnitsee raaka-ainetta, lue [Tärkeimmät työtavat](/guides/safe-mixing#habits). Kuiva lasitepöly on suurin vaara.

## Opetuskerta 1: raaka-aineet ja kolmiokoe {#materials}

> [!WARNING]
> Punnitse kuivat raaka-aineet varovasti, siivoa märkänä ja käytä tiiviisti istuvaa hengityksensuojainta, kun jauheet ovat kuivia. Lue ensin [Suurin vaara: pöly](/guides/safe-mixing#the-main-hazard) ja [Hengityksensuojaimet](/guides/safe-mixing#respirators).

### Tavoitteet

- Nimeä lasitteen kolme tehtävää: lasinmuodostaja{{en: glass former}}, sulattaja{{en: flux}} ja tasapainottaja{{en: stabilizer}}.
- Lajittele 4 yleistä raaka-ainetta niiden tuomien oksidien mukaan.
- Tee kolmiokoe{{en: triaxial blend}} ja lue sen koepalat{{en: test tile}} karttana.

### Valmistelut

- Pussillinen kutakin: 福島長石, liitu{{en: whiting}}, kaoliini{{en: kaolin}} ja kvartsi{{en: silica}}, tai luokan omat raaka-aineet.
- Alla oleva tulostettu [kolmiokokeen koepalakartta](#tile-maps) ja 21 koepalaa jokaista kolmiota kohti jokaiselle opiskelijalle.
- Aiempien kolmiokokeiden poltetut koepalat kierrätettäviksi, jos niitä on.

### Laskuesimerkki

Jokaisen raaka-aineen analyysi Glazecalcin kirjastosta kertoo, mitä oksideja siitä jää polton jälkeen. Polttohäviö{{en: loss on ignition}} (LOI) on se, mikä palaa pois.

Table: Neljä raaka-ainetta ja mitä ne tuovat (painoprosentteina, kirjaston arvot)
Label: Neljä raaka-ainetta

| Raaka-aine          | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO | Polttohäviö | Tehtävä                                                  |
| ------------------- | ---: | ----: | ----: | ---: | ----: | ----------: | -------------------------------------------------------- |
| 福島長石 (maasälpä) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |        0,18 | Sulattaja, jolla on omaa alumiinioksidia ja piidioksidia |
| Liitu (石灰石)      |    – |     – |     – |    – | 56,03 |       43,97 | Sulattaja (kalsium)                                      |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |        13,9 | Tasapainottaja: tärkein alumiinioksidin lähde            |
| Kvartsi (珪石)      |  100 |     – |     – |    – |     – |           – | Lasinmuodostaja                                          |

Pelkkä maasälpä{{en: feldspar}} sulaa SK 8 -poltossa jäykäksi lasiksi; pelkkä liitu ei sula; pelkkä kvartsi ei sula. Seoksena ne sulavat paljon paremmin kuin mikään niistä yksin. Kolmiokoe näyttää, missä: alla oleva koepalakartta porrastaa kolmea raaka-ainetta ~20 %:n askelin (18 90:stä), ja jokaisessa koepalassa on 10 % kaoliinia.

::shops

### Glazecalcissa

1. Avaa jokainen raaka-aine [Raaka-aineet-sivulla](/material) tai sen julkisella sivulla, esimerkiksi [Fukushima Feldspar](/materials/fukushima-feldspar). Merkitse muistiin, mitä oksideja se tuo.
2. Tee kolme reseptiä: 福島長石 90 ja kaoliini 10, liitu 90 ja kaoliini 10 sekä kvartsi 90 ja kaoliini 10. Valitse [Seokset koepaloille](/blends) -sivulla **Kolmiokoe (3 reseptiä)** ja 6 riviä: 21 koepalaa, sama kuin alla olevassa kartassa.
3. Valitse kunkin koepalan erä ja **Tulosta** punnittavat määrät. Polton jälkeen mieluisat koepalat voi tallentaa resepteiksi koepalojen kuvasta.

### Tehtävämoniste

Table: Tehtävämoniste 1: mitä kukin raaka-aine tuo
Label: Tehtävämoniste 1

| Raaka-aine | Tuomat oksidit | Lasinmuodostaja, sulattaja vai tasapainottaja? | Polttohäviö (%) |
| ---------- | -------------- | ---------------------------------------------- | --------------- |
| 福島長石   |                |                                                |                 |
| Liitu      |                |                                                |                 |
| Kaoliini   |                |                                                |                 |
| Kvartsi    |                |                                                |                 |

### Tarkistuskysymykset

- Mikä raaka-aine tuo suurimman osan alumiinioksidista, ja miksi lasite tarvitsee sitä?
- Miksi kolmion liitukulma ei sula yksin?
- Missä kolmion kohdassa omat koepalat sulivat parhaiten, ja mihin kulmaan se oli lähimpänä?

## Opetuskerta 2: tarvittava kemia {#chemistry}

### Tavoitteet

- Lue kemiallista kaavaa: SiO₂, CaO, Al₂O₃, CaCO₃.
- Laske moolimassa atomipainoista.
- Muunna grammat moleiksi ja takaisin.

### Valmistelut

- Jaksollinen järjestelmä ja laskin jokaiselle opiskelijalle.
- Alla olevan taulukon atomipainot (IUPACin vakioarvot, kuten Glazecalc niitä käyttää).

### Laskuesimerkki

Table: Tässä käytetyt atomipainot (g/mol)
Label: Atomipainot

| Alkuaine | Symboli | Atomipaino |
| -------- | ------- | ---------: |
| Happi    | O       |     15,999 |
| Hiili    | C       |     12,011 |
| Natrium  | Na      |      22,99 |
| Alumiini | Al      |     26,982 |
| Pii      | Si      |     28,085 |
| Kalium   | K       |     39,098 |
| Kalsium  | Ca      |     40,078 |

Kaava laskee atomit. SiO₂ on yksi pii ja kaksi happea, joten yksi mooli sitä painaa 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ on 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO on 56,077 g, ja liitu{{en: whiting}} eli CaCO₃ on 100,086 g; Glazecalcin kirjasto pyöristää sen arvoon 100,08.

**Mooli** on lukumäärä, kuten tusina: sama määrä molekyylejä riippumatta siitä, mitä ne ovat. Moolit ovat grammat ÷ moolimassa:

- Kvartsia 25 g on 25 ÷ 60,083 = 0,416 mol SiO₂.
- Liitua 20 g on 20 ÷ 100,08 = 0,200 mol. Uunissa se menettää hiilidioksidinsa (CO₂, 44,009 g/mol) ja jäljelle jää 0,200 mol CaO, jonka paino on 0,200 × 56,077 = 11,2 g. Tämä häviö on sen polttohäviö{{en: loss on ignition}}: 43,97 %.

### Glazecalcissa

1. Avaa [Whiting](/materials/whiting) ja [Silica](/materials/silica): kummankin sivulla on kaava ja painot.
2. Tarkista yksi moolimassa käsin sivun arvoa vasten.

### Tehtävämoniste

Table: Tehtävämoniste 2: moolimassa ja moolit
Label: Tehtävämoniste 2

| Oksidi tai raaka-aine | Kaava | Moolimassa (g/mol) | Grammat | Moolit |
| --------------------- | ----- | ------------------ | ------- | ------ |
| Piidioksidi           | SiO₂  |                    | 30      |        |
| Alumiinioksidi        | Al₂O₃ |                    | 10      |        |
| Kalsiumoksidi         | CaO   |                    | 5       |        |
| Liitu                 | CaCO₃ |                    | 15      |        |

### Tarkistuskysymykset

- Paljonko yksi mooli SiO₂ painaa grammoina, ja miten se lasketaan?
- Miksi 20 g liitua jättää poltettuun lasitteeseen vähemmän kuin 20 g?
- Miksi oksideja verrataan moolien eikä grammojen mukaan?

## Opetuskerta 3: Segerin kaavan lukeminen {#reading-the-formula}

> [!WARNING]
> Lasitteen värjääminen tarkoittaa väriaineiden punnitsemista, ja osa niistä vaatii enemmän varovaisuutta kuin pohjalasitteen raaka-aineet. Lue ensin [Eniten varovaisuutta vaativat raaka-aineet](/guides/safe-mixing#materials).

### Tavoitteet

- Lue Segerin kaavan{{en: unity formula}} (japaniksi ゼーゲル式) kolme saraketta: sulattajat, tasapainottaja, lasinmuodostaja.
- Etsi lasite piidioksidin ja alumiinioksidin kaaviosta ja tiedä, mitä kaavio voi ja ei voi kertoa.
- Väritä valmis lasite vaiheittain ja kirjaa tulos.

### Valmistelut

- Alla oleva Segerin kaava kirjoitettuna suurella.
- Valmis läpinäkyvä lasite ja väriaine{{en: colorant}}, kuten punainen rautaoksidi (弁柄).

### Laskuesimerkki

Opetuskerran 4 lasitteen (福島長石 45, liitu 20, kaoliini 10 ja kvartsi 25) Segerin kaava on tämä (Glazecalcin luvut, pyöristettyinä):

Table: Segerin kaava kolmessa sarakkeessa
Label: Segerin kaava

| Sulattajat (RO, R₂O) | Tasapainottaja (R₂O₃) | Lasinmuodostaja (RO₂) |
| -------------------- | --------------------- | --------------------- |
| K₂O 0,18             | Al₂O₃ 0,43            | SiO₂ 3,45             |
| Na₂O 0,10            |                       |                       |
| CaO 0,72             |                       |                       |

- Sulattajien summa on 1: se on kaavan sääntö. Kukin muu luku kertoo moolimäärän sulattajien yhtä moolia kohti.
- Piidioksidin ja alumiinioksidin suhde on 3,45 ÷ 0,43, noin 8: tyypillinen kiiltävä lasite.
- Kalsium on suurin osa sulattajista, kuten useimmissa japanilaisissa kalkkilasitteissa (石灰釉).

Kaaviossa, jossa piidioksidi on vaaka-akselilla ja alumiinioksidi pystyakselilla, jokainen lasite on piste. Segerin kokeet ja Stullin vuoden 1912 kaavio ovat tätä lajia, ja 釉性状図 sijoittaa luokan omat poltetut koepalat sille. Glazecalcin reseptisivu piirtää Stullin kaavion, ja tämä lasite sijaitsee sen kiiltävällä alueella. Stullin alueet perustuvat hänen omiin sulattajiinsa ja polttoonsa: ne ovat ohje, eivät ennuste. Alla oleva [koepalaruudukko](#tile-maps) antaa luokan piirtää oman kaavionsa omalla poltollaan.

::stull-chart

Kun väritetään valmista lasitetta, jonka reseptiä ei tiedetä, Glazecalc ei voi laskea sen kaavaa. Lisää väriaine sen sijaan 100:n päälle: 100 g kuivaa lasitetta ja lisäksi 1, 2 ja 3 g rautaoksidia, yksi koepala kustakin, poltettuna hapettavassa{{en: oxidation}} ja pelkistävässä{{en: reduction}} poltossa.

### Glazecalcissa

1. Kirjoita yllä oleva resepti [reseptisivulla](/recipe) ja lue sen **Segerin kaava** ja **Stullin kartta**.
2. Muuta kvartsi 25:stä 35:een ja katso, kuinka piste siirtyy oikealle.
3. Kun pohjalasitteen resepti tiedetään, tee väriaineesta lisäys ja porrasta sitä koesarjalla{{en: line blend}} [Seokset koepaloille](/blends) -sivulla.

### Tehtävämoniste

Table: Tehtävämoniste 3: väriaine valmiissa lasitteessa
Label: Tehtävämoniste 3

| Koepala | Väriaine (g/100 g) | Hapettava poltto: miltä näyttää | Pelkistävä poltto: miltä näyttää |
| ------- | ------------------ | ------------------------------- | -------------------------------- |
| 1       | 0                  |                                 |                                  |
| 2       | 1                  |                                 |                                  |
| 3       | 2                  |                                 |                                  |
| 4       | 3                  |                                 |                                  |

### Tarkistuskysymykset

- Minkä sarakkeen summa on Segerin kaavassa 1?
- Mikä on tämän lasitteen piidioksidin ja alumiinioksidin suhde, ja mitä se antaa ymmärtää?
- Miksi kaavion kiiltävällä alueella oleva piste voi silti antaa matan koepalan omassa uunissa?

## Opetuskerta 4: reseptistä Segerin kaavaan {#recipe-to-formula}

### Tavoitteet

- Laske Segerin kaava reseptistä käsin.
- Tarkista se Glazecalcin oman laskennan avulla.

### Valmistelut

- Tehtävämoniste 4, opetuskerran 1 neljä analyysiä ja laskimet.

### Laskuesimerkki

Resepti: 福島長石 45, liitu 20, EPK-kaoliini 10, kvartsi 25. Käsitä jokainen määrä grammoina. Kunkin raaka-aineen moolit saadaan laskemalla grammat × oksidin prosenttiosuus ÷ 100 ÷ sen moolimassa. Taulukossa on pääoksidit; Glazecalc laskee mukaan myös hivenaineet (kaoliinin raudan ja titaanin, maasälvän magnesiumin).

Table: Kunkin oksidin moolit erässä (100 g)
Label: Moolit erässä

| Raaka-aine | Grammat |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ---------- | ------: | -----: | -----: | -----: | -----: | -----: |
| 福島長石   |      45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Liitu      |      20 |      – |      – | 0,1998 |      – |      – |
| Kaoliini   |      10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvartsi    |      25 |      – |      – |      – |      – | 0,4161 |
| Yhteensä   |     100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Sulattajien summa on 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesiumoksidi) = 0,2847 mol. Jaa jokainen summa sillä:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Se on opetuskerran 3 kaava.

### Glazecalcissa

1. Kirjoita resepti [reseptisivulla](/recipe).
2. Avaa **Miten Segerin kaava lasketaan**. Se näyttää nämä vaiheet tämän reseptin luvuilla: grammat, kunkin oksidin moolit kussakin raaka-aineessa, summat ja jakolasku sulattajilla.
3. Vertaa jokaista riviä tehtävämonisteeseesi. Muuta sitten yhtä määrää ja laske vain se sarake, jota se muuttaa.

### Tehtävämoniste

Table: Tehtävämoniste 4: resepti Segerin kaavaksi
Label: Tehtävämoniste 4

| Raaka-aine   | Grammat | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------ | ------- | --- | ---- | --- | ----- | ---- |
|              |         |     |      |     |       |      |
|              |         |     |      |     |       |      |
|              |         |     |      |     |       |      |
|              |         |     |      |     |       |      |
| Yhteensä     |         |     |      |     |       |      |
| ÷ sulattajat |         |     |      |     |       |      |

### Tarkistuskysymykset

- Miksi mikä tahansa eräkoko antaa saman Segerin kaavan?
- Mitä oksideja kaoliini tuo, ja mikä niistä on tässä tärkein?
- Miksi liidun polttohäviö jätetään pois kaavasta?

## Opetuskerta 5: Segerin kaavasta reseptiin {#formula-to-recipe}

### Tavoitteet

- Valitse raaka-aineet tavoitekaavalle ja laske, paljonko kutakin tarvitaan.
- Käytä Ratkaise tavoitteen mukaan -toimintoa ja sano, kuinka lähelle se pääsee.

### Valmistelut

- Alla oleva tavoite, tehtävämoniste 5 ja laskimet; Glazecalc ja tili.

### Laskuesimerkki

Tavoite: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ ja 4,0 SiO₂. Ota raaka-aineet tässä järjestyksessä, kukin sille oksidille, jonka vain se voi tuoda:

1. **Maasälpä{{en: feldspar}}, kaliumille ja natriumille.** Yksi yksikkö 福島長石 (536,8 g, paino, joka sisältää yhden moolin sulattajia) tuo K₂O:ta ja Na₂O:ta yhteensä 0,94 mol. Tavoite vaatii 0,3, joten 0,3 ÷ 0,94 = 0,319 yksikköä: 171,4 g. Se tuo mukanaan myös seuraavat: CaO 0,015, Al₂O₃ 0,328 ja SiO₂ 1,865.
2. **Liitu{{en: whiting}}, loppu kalsium.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaoliini{{en: kaolin}}, loput alumiinioksidista.** 0,4 − 0,328 = 0,072 mol. EPK-kaoliinia 272,6 g sisältää yhden moolin Al₂O₃, joten tarvitaan 19,6 g, ja se tuo mukanaan myös SiO₂ 0,149.
4. **Kvartsi{{en: silica}}, loput.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Erä on 379,0 g. Prosentteina: 福島長石 45,2, liitu 18,1, kaoliini 5,2, kvartsi 31,5. Maasälpä määrää kaliumin ja natriumin suhteen, joten resepti antaa K₂O 0,195 ja Na₂O 0,104: lähellä tavoitetta, mutta ei sama.

### Glazecalcissa

1. Avaa [Ratkaise tavoitteen mukaan](/solve), valitse **Segerin kaava (moolit, sulattajien summa 1)** ja kirjoita tavoite.
2. Anna kohdassa **Raaka-aineet** raaka-aineiksi 福島長石, liitu, EPK-kaoliini ja kvartsi ja valitse **Ratkaise**.
3. Se antaa tulokseksi: 福島長石 44,9, liitu 18,2, kaoliini 5,6 ja kvartsi 31,3, sekä taulukon siitä, kuinka lähelle kukin oksidi pääsee. Vertaa sitä käsin tehtyyn laskuun: ratkaisija laskee kaikki hivenaineet ja löytää parhaan sovituksen, jonka neljä raaka-ainetta sallivat.
4. Valitse **Avaa uutena reseptinä** ja tarkista se reseptisivulla.

### Tehtävämoniste

Table: Tehtävämoniste 5: tavoitteesta reseptiin
Label: Tehtävämoniste 5

| Vaihe | Raaka-aine | Mille oksidille | Tarvittavat moolit | Grammat | Tuo myös |
| ----- | ---------- | --------------- | ------------------ | ------- | -------- |
| 1     |            |                 |                    |         |          |
| 2     |            |                 |                    |         |          |
| 3     |            |                 |                    |         |          |
| 4     |            |                 |                    |         |          |

### Tarkistuskysymykset

- Miksi maasälpä lasketaan ensin?
- Miksi nämä neljä raaka-ainetta eivät voi antaa täsmälleen K₂O 0,2 ja Na₂O 0,1?
- Mitä raaka-aineisiin lisättäisiin, jotta mukaan saataisiin magnesiumoksidia?

## Opetuskerta 6: savimassa ja lasitevirheet {#body-and-defects}

> [!WARNING]
> Poltetusta lasitteesta voi liueta metalleja ruokaan ja juomaan, ja lasite voi näyttää täydelliseltä, vaikka niin tapahtuu. Runsaasti bariumia sisältävistä tai kuparia sisältävistä lasitteista ja kaikista lyijyä sisältävistä lasitteista metalleja voi liueta. Vain poltetun esineen metallien liukenemisen laboratoriotesti{{en: leach test}} näyttää, mitä siitä siirtyy; mikään laskelma ei sitä kerro. Lue [Elintarviketurvallisuus](/guides/glazing-basics#food-safety) ja [Eniten varovaisuutta vaativat raaka-aineet](/guides/safe-mixing#materials).

### Tavoitteet

- Mittaa massan{{en: clay body}} kutistuminen ja vedenimukyky.
- Nimeä yleiset lasitevirheet, niiden tavalliset syyt ja ensimmäinen korjaus.
- Tiedä, mitkä lasitevirheet tekevät esineestä turvattoman.

### Valmistelut

- Oman savimassan koesauvat, joihin on merkitty märkänä 100 mm:n välein, poltettuina ja polttamattomina.
- Koepalat, joissa on virheitä, jos niitä on: säröily, kuroutuminen, neulanreiät, valuminen.

### Laskuesimerkki

- **Kutistuminen**: (merkitty pituus − poltettu pituus) ÷ merkitty pituus × 100. Jos 100 mm:n välein olevat merkit mittaavat polton jälkeen 88 mm, kutistuminen on 12 %.
- **Vedenimukyky**: (paino liottamisen jälkeen − kuivapaino) ÷ kuivapaino × 100. Poltettu 50,0 g:n sauva, joka painaa liottamisen jälkeen 50,6 g: 1,2 %.

Table: Lasitevirheet, syyt ja ensimmäinen korjaus Segerin kaavassa
Label: Lasitevirheet

| Virhe        | Tavallinen syy                                               | Kokeiltava ensimmäinen korjaus                                       |
| ------------ | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Säröily      | Lasite kutistuu enemmän kuin massa                           | Vähemmän K₂O ja Na₂O; enemmän kalsiumia, magnesiumoksidia tai booria |
| Hilseily     | Lasite kutistuu paljon vähemmän kuin massa                   | Enemmän K₂O ja Na₂O                                                  |
| Valuminen    | Liian vähän alumiinioksidia tai liian paksu kerros           | Enemmän alumiinioksidia; ohuempi kerros                              |
| Kuroutuminen | Pölyinen raakapoltettu pinta tai paksu kerros, joka halkeili | Puhdista raakapoltettu pinta; ohuempi kerros                         |
| Neulanreiät  | Kaasu, jonka reiät eivät sulkeutuneet                        | Haudutus huippulämpötilassa; ohuempi kerros                              |

[Lasitteen ja massan yhteensopivuus sekä lasitevirheet](/guides/glazing-basics#fit-and-defects) selittää jokaisen, ja siinä on säröilyn jäävesitesti. Älä käytä säröillyttä tai hilseillyttä esinettä ruokaan tai juomaan.

::food-limits

### Glazecalcissa

1. Lue [reseptisivulla](/recipe) oman lasitteen **Raja-arvot**-paneeli ja laskettu lämpölaajeneminen.
2. Kopioi resepti, vaihda osa maasälvästä liitun tilalle ja vertaa näitä kahta: mihin suuntaan lämpölaajeneminen siirtyi?

### Tehtävämoniste

Table: Tehtävämoniste 6: savimassa
Label: Tehtävämoniste 6

| Sauva | Merkitty pituus (mm) | Poltettu pituus (mm) | Kutistuminen (%) | Kuivapaino (g) | Liotettu paino (g) | Vedenimukyky (%) |
| ----- | -------------------- | -------------------- | ---------------- | -------------- | ------------------ | ---------------- |
| 1     | 100                  |                      |                  |                |                    |                  |
| 2     | 100                  |                      |                  |                |                    |                  |

### Tarkistuskysymykset

- Mikä virhe syntyy lasitteesta, joka kutistuu enemmän kuin massa, ja mikä on ensimmäinen korjaus?
- Miksi hilseillyttä esinettä ei saa koskaan käyttää ruokaan?
- Voiko laskelma kertoa, että lasite on elintarvikekäyttöön sopiva? Mikä voi?

## Tulostettavat koepalakartat {#tile-maps}

### Kolmiokokeen kartta: 42 lasitetta

Kaksi 21 koepalan kolmiota, Seokset koepaloille -sivun 6 rivin asettelun mukaan: koepala 1 on ylhäällä (maasälpä), alin rivi kulkee liidusta (vasemmalla) kvartsiin (oikealla). Kolmio II on kolmio I, kun jokaisen 100 g:n päälle lisätään 1 g punaista rautaoksidia, mikä kääntyy pelkistävässä poltossa kohti seladonia (青磁). Hapettavassa ja pelkistävässä poltossa poltettuna se on 84 koepalaa. Määrät ovat g/100 g.

Table: Kolmiokokeen kartta: 福島長石, liitu ja kvartsi, jokaisessa koepalassa 10 kaoliinia
Label: Kolmiokokeen kartta

| Koepala (I) | Koepala (II) | 福島長石 | Liitu | Kvartsi | Kaoliini | I hap. | I pelk. | II hap. | II pelk. |
| ----------- | ------------ | -------: | ----: | ------: | -------: | ------ | ------- | ------- | -------- |
| 1           | 22           |       90 |     0 |       0 |       10 |        |         |         |          |
| 2           | 23           |       72 |    18 |       0 |       10 |        |         |         |          |
| 3           | 24           |       72 |     0 |      18 |       10 |        |         |         |          |
| 4           | 25           |       54 |    36 |       0 |       10 |        |         |         |          |
| 5           | 26           |       54 |    18 |      18 |       10 |        |         |         |          |
| 6           | 27           |       54 |     0 |      36 |       10 |        |         |         |          |
| 7           | 28           |       36 |    54 |       0 |       10 |        |         |         |          |
| 8           | 29           |       36 |    36 |      18 |       10 |        |         |         |          |
| 9           | 30           |       36 |    18 |      36 |       10 |        |         |         |          |
| 10          | 31           |       36 |     0 |      54 |       10 |        |         |         |          |
| 11          | 32           |       18 |    72 |       0 |       10 |        |         |         |          |
| 12          | 33           |       18 |    54 |      18 |       10 |        |         |         |          |
| 13          | 34           |       18 |    36 |      36 |       10 |        |         |         |          |
| 14          | 35           |       18 |    18 |      54 |       10 |        |         |         |          |
| 15          | 36           |       18 |     0 |      72 |       10 |        |         |         |          |
| 16          | 37           |        0 |    90 |       0 |       10 |        |         |         |          |
| 17          | 38           |        0 |    72 |      18 |       10 |        |         |         |          |
| 18          | 39           |        0 |    54 |      36 |       10 |        |         |         |          |
| 19          | 40           |        0 |    36 |      54 |       10 |        |         |         |          |
| 20          | 41           |        0 |    18 |      72 |       10 |        |         |         |          |
| 21          | 42           |        0 |     0 |      90 |       10 |        |         |         |          |

### Seger-ruudukko: 24 lasitetta

Jokaisessa koepalassa on samat sulattajat, 0,2 KNaO ja 0,8 CaO; ne tulevat maasälvästä 福島長石 ja liidusta. Alumiinioksidi porrastuu ruudukossa alaspäin ja piidioksidi sivusuunnassa. Reseptit laskettiin opetuskerran 5 menetelmällä; Glazecalcin laskema kunkin Segerin kaava poikkeaa tavoitteesta alumiinioksidin osalta enintään 0,01 ja piidioksidin osalta enintään 0,06. Merkitse jokainen koepala piidioksidin ja alumiinioksidin kaavioon ja piirrä omat alueesi: matta, kiiltävä, alipoltettu, valuva.

Table: Seger-ruudukko: 0,2 KNaO, 0,8 CaO, painoprosentteina
Label: Seger-ruudukko

| Koepala | Al₂O₃ | SiO₂ | 福島長石 | Liitu | Kaoliini | Kvartsi | Hapettava | Pelkistävä |
| ------- | ----: | ---: | -------: | ----: | -------: | ------: | --------- | ---------- |
| 1       |  0,25 |  2,0 |     46,9 |  32,5 |      3,5 |    17,1 |           |            |
| 2       |  0,25 |  2,5 |     41,8 |  28,9 |      3,1 |    26,2 |           |            |
| 3       |  0,25 |  3,0 |     37,6 |  26,1 |      2,8 |    33,5 |           |            |
| 4       |  0,25 |  3,5 |     34,3 |  23,7 |      2,5 |    39,5 |           |            |
| 5       |  0,25 |  4,0 |     31,4 |  21,7 |      2,3 |    44,5 |           |            |
| 6       |  0,25 |  4,5 |     29,0 |  20,1 |      2,2 |    48,7 |           |            |
| 7       |  0,35 |  2,0 |     44,3 |  30,6 |     13,9 |    11,3 |           |            |
| 8       |  0,35 |  2,5 |     39,6 |  27,4 |     12,4 |    20,5 |           |            |
| 9       |  0,35 |  3,0 |     35,9 |  24,8 |     11,2 |    28,0 |           |            |
| 10      |  0,35 |  3,5 |     32,8 |  22,7 |     10,3 |    34,2 |           |            |
| 11      |  0,35 |  4,0 |     30,2 |  20,9 |      9,5 |    39,5 |           |            |
| 12      |  0,35 |  4,5 |     28,0 |  19,4 |      8,8 |    43,9 |           |            |
| 13      |  0,45 |  2,0 |     41,9 |  29,0 |     23,1 |     6,1 |           |            |
| 14      |  0,45 |  2,5 |     37,7 |  26,1 |     20,8 |    15,4 |           |            |
| 15      |  0,45 |  3,0 |     34,3 |  23,7 |     18,9 |    23,0 |           |            |
| 16      |  0,45 |  3,5 |     31,5 |  21,8 |     17,4 |    29,4 |           |            |
| 17      |  0,45 |  4,0 |     29,1 |  20,1 |     16,0 |    34,8 |           |            |
| 18      |  0,45 |  4,5 |     27,0 |  18,7 |     14,9 |    39,4 |           |            |
| 19      |  0,55 |  2,0 |     39,7 |  27,5 |     31,4 |     1,5 |           |            |
| 20      |  0,55 |  2,5 |     35,9 |  24,9 |     28,4 |    10,8 |           |            |
| 21      |  0,55 |  3,0 |     32,8 |  22,7 |     26,0 |    18,5 |           |            |
| 22      |  0,55 |  3,5 |     30,2 |  20,9 |     23,9 |    25,0 |           |            |
| 23      |  0,55 |  4,0 |     28,0 |  19,4 |     22,1 |    30,5 |           |            |
| 24      |  0,55 |  4,5 |     26,1 |  18,1 |     20,6 |    35,3 |           |            |

Glazecalcin Seokset koepaloille -sivu tekee 3–66 koepalan kolmioita ja neliöitä, ei tätä ruudukkoa; avaa mikä tahansa koepala reseptinä [reseptisivulla](/recipe) ja tulosta sen punnituslista sieltä.

## Lähteet {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): kuusi opetuskertaa.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: opetuskertojen päivämäärät ja aiheet.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: jatkokurssin tehtävät, 42, 90 ja 78 lasitetta hapettavassa ja pelkistävässä poltossa.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): keskuksen oma laskentaohjelma.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Segerin kaava viikoilla 5, 6 ja 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): lasitelaskenta opettajille Taiwanissa.
- Glendale Community College, ART 195 course outline: Segerin kaava viikoilla 5–7 kurssin 15 viikosta.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: 福島長石-maasälvän analyysi Glazecalcin kirjastossa.
- IUPAC, standard atomic weights, sellaisina kuin Glazecalcin kemia niitä käyttää.
