---
title: Mázszámítás tanítása
lead: 6 alkalom egy osztály vagy tanulócsoport számára, a nyersanyagoktól és a háromszög-próbalapoktól a mindkét irányban kiszámított Seger-képleten át a mázhibákig, mindegyikhez kidolgozott példával, a Glazecalc használatával, kinyomtatható munkalappal és ellenőrző kérdésekkel.
---

## A csomagról {#about}

Ez a csomag mindenkinek szól, aki mázszámítást tanít: iskolának, műhelyi tanfolyamnak, gyakorló fazekasok tanulócsoportjának, vagy a magában tanuló fazekasnak. Hat alkalomból áll, és mindegyikben van célkitűzés, előkészítendő eszközök, valós nyersanyagokkal végzett kidolgozott példa, a Glazecalc használata, munkalap és ellenőrző kérdések.

Az alkalmak sorrendje egy közzétett tanulócsoportét követi: a 陶磁器釉薬技術研究会 (kerámiamáz-technológiai tanulócsoport) a japán Ibaraki prefektúra ipari technológiai központjában 2015-ben hat alkalmat tartott 12 fiatal fazekas számára, és kutatási jelentésében beszámolt róluk. A folytatásként a kaszamai kerámiaművészeti főiskolán tartott tanfolyam három próbalap-feladatot adott, 42, 90 és 78 mázzal, mindegyiket oxidáló és redukciós égetésben égetve. **A Glazecalc nem áll kapcsolatban sem a központtal, sem a főiskolával.** Közzétett vázlatuk sorrendjét követjük, és lent hivatkozunk rá; a szöveg, a példák és a munkalapok a mieink. Más országok tanfolyamai majdnem ugyanilyen sorrendben tanítják ugyanezeket a lépéseket: a törökországi Bilecik Şeyh Edebali Egyetem SCT305 kurzusa, az amerikai Glendale Community College ART 195 kurzusa, a németországi Rajna-vidék–Pfalz tartomány kerámiaiskoláinak tanterve, és 李堅萍 2006-os, tajvani tanároknak szóló tanulmánya.

Table: A hat alkalom
Label: A hat alkalom

| Alkalom | Téma                                                              | A Glazecalcban                      |
| ------- | ----------------------------------------------------------------- | ----------------------------------- |
| 1       | Nyersanyagok, mit csinálnak, háromszög-próbalapok                 | Nyersanyagok, Keverékek (háromszög) |
| 2       | A kémia: elemek, képletek, mólok                                  | Egy nyersanyag oldala               |
| 3       | A Seger-képlet (UMF) olvasása, a szilícium-dioxid–timföld diagram | A recept oldala, a Stull-diagram    |
| 4       | Receptből Seger-képlet                                            | Hogyan számítható ki a Seger-képlet |
| 5       | Seger-képletből recept                                            | Számítás célérték szerint           |
| 6       | A massza és a mázhibák                                            | Határértékek, Összehasonlítás       |

### A használat módja

- Egy alkalom kb. 2 óráig tart. A 4. és az 5. alkalomhoz számológép kell, és minden párnak egy számítógép vagy telefon, amelyen a Glazecalc fut.
- A kidolgozott példák Japánban kapható nyersanyagokat és a Glazecalc beépített könyvtárának adatait használják: 福島長石 (Fukushima-földpát), mészkőliszt{{en: whiting}} (石灰石, kalcium-karbonát), egy kaolin és kvarcliszt (珪石). Ha van saját forgalmazójának összetétele, adja hozzá a [Nyersanyagok oldalon](/material): a számok megváltoznak, a módszer nem.
- Az égetés SK 8, névlegesen {{2282 °F; 1250 °C}}. Használja azt a gúlát, amelyre az osztály éget; az SK-számokat az [Égetés SK-gúlákra](/guides/firing#sk-cones) című rész magyarázza el.
- Munkalap vagy próbalap-térkép nyomtatásához nyomtassa ki ezt az oldalt a böngészőből. A receptek, keverékek és jegyzetek mentéséhez ingyenes fiók kell.

> [!WARNING]
> Az 1., a 3. és a 6. alkalom laborgyakorlat: száraz nyersanyagok bemérése és égetés. Mielőtt bárki bármit bemérne, olvassa el [A legfontosabb szokások](/guides/safe-mixing#habits) című részt. A száraz máz pora a fő veszély.

## 1. alkalom: nyersanyagok és háromszög-próbalapok {#materials}

> [!WARNING]
> A száraz nyersanyagokat óvatosan mérje be, nedvesen takarítson, és amíg a porok szárazak, jól illeszkedő légzésvédőt viseljen. Előbb olvassa el [A fő veszély: a por](/guides/safe-mixing#the-main-hazard) és [Légzésvédők](/guides/safe-mixing#respirators) című részt.

### Célok

- Nevezze meg a máz három feladatát: üvegképző, olvasztóanyag{{en: flux}} és stabilizáló.
- Soroljon be 4 gyakori nyersanyagot aszerint, milyen oxidokat visznek be.
- Állítson össze háromszög-próbát, és olvassa a próbalapjait térképként.

### Előkészületek

- Egy-egy zacskó 福島長石, mészkőliszt, kaolin és kvarcliszt, vagy azok a nyersanyagok, amelyek az osztálynál megvannak.
- Az alábbi [háromszög-próba térképe](#tile-maps) kinyomtatva, és háromszögenként diákonként 21 próbalap.
- Egy korábbi háromszög-próba kiégetett próbalapjai, ha vannak, körbeadásra.

### Kidolgozott példa

Az egyes nyersanyagok összetétele a Glazecalc könyvtárából megmutatja, milyen oxidokat hagy hátra égetés után. Az izzítási veszteség (LOI) az, ami kiég belőle.

Table: Négy nyersanyag és amit behoznak (tömegszázalék, a könyvtárból)
Label: Négy nyersanyag

| Nyersanyag           | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Szerepe                                                |
| -------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ------------------------------------------------------ |
| 福島長石 (földpát)   | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Olvasztóanyag, saját timfölddel és szilícium-dioxiddal |
| Mészkőliszt (石灰石) |    – |     – |     – |    – | 56,03 | 43,97 | Olvasztóanyag (kalcium)                                |
| EPK Kaolin           | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizáló: a fő timföldforrás                        |
| Kvarcliszt (珪石)    |  100 |     – |     – |    – |     – |     – | Üvegképző                                              |

A földpát egyedül SK 8-on megolvad merev üveggé; a mészkőliszt egyedül nem olvad meg; a kvarcliszt egyedül sem olvad meg. Összekeverve sokkal jobban olvadnak, mint bármelyik külön. A háromszög-próba megmutatja, hol: az alábbi próbalap-térkép a hármat ~20%-os lépésekben (90-ből 18) lépteti, minden próbalapon 10% kaolinnal.

::shops

### A Glazecalc használata

1. Nyissa meg az egyes nyersanyagokat a [Nyersanyagok oldalon](/material), vagy a nyilvános oldalukat, például a [Fukushima Feldspar](/materials/fukushima-feldspar) oldalt. Jegyezze fel, milyen oxidokat visznek be.
2. Készítsen három receptet: 福島長石 90 és kaolin 10, mészkőliszt 90 és kaolin 10, valamint kvarcliszt 90 és kaolin 10. A [Keverékek](/blends) oldalon válassza a **Háromszög-próba (3 recept)** lehetőséget és 6 sort: ez 21 próbalap, ugyanannyi, mint az alábbi térképen.
3. Válassza ki az adagot az egyes próbalapokhoz, és a **Nyomtatás** gombbal nyomtassa ki, mit kell bemérni. Az égetés után a tetsző próbalapokat mentse receptként a próbalapok rajzából.

### Munkalap

Table: 1. munkalap: mit visz be az egyes nyersanyag
Label: 1. munkalap

| Nyersanyag  | Behozott oxidok | Üvegképző, olvasztóanyag vagy stabilizáló? | LOI (%) |
| ----------- | --------------- | ------------------------------------------ | ------- |
| 福島長石    |                 |                                            |         |
| Mészkőliszt |                 |                                            |         |
| Kaolin      |                 |                                            |         |
| Kvarcliszt  |                 |                                            |         |

### Ellenőrzés

- Melyik nyersanyag hozza a timföld nagy részét, és miért kell a mázban timföld?
- Miért nem olvad meg magától a háromszög mészkőliszt-sarka?
- A háromszög melyik részén olvadtak meg a legjobban a próbalapjai, és melyik sarokhoz esett az a legközelebb?

## 2. alkalom: a szükséges kémia {#chemistry}

### Célok

- Olvasson el egy kémiai képletet: SiO₂, CaO, Al₂O₃, CaCO₃.
- Számítson ki moláris tömeget az atomtömegekből.
- Váltson át grammot mólra, és vissza.

### Előkészületek

- Mindenkinek egy periódusos rendszer, és számológépek.
- Az alábbi táblázat atomtömegei (az IUPAC standard értékei, ahogy a Glazecalc használja).

### Kidolgozott példa

Table: Itt használt atomtömegek (g/mol)
Label: Atomtömegek

| Elem      | Jel | Atomtömeg |
| --------- | --- | --------: |
| Oxigén    | O   |    15,999 |
| Szén      | C   |    12,011 |
| Nátrium   | Na  |     22,99 |
| Alumínium | Al  |    26,982 |
| Szilícium | Si  |    28,085 |
| Kálium    | K   |    39,098 |
| Kalcium   | Ca  |    40,078 |

A képlet atomokat számol. Az SiO₂ egy szilícium- és két oxigénatom, így egy mólja 28,085 + 2 × 15,999 = 60,083 g. Az Al₂O₃ 2 × 26,982 + 3 × 15,999 = 101,961 g. A CaO 56,077 g, a mészkőliszt, vagyis a CaCO₃ pedig 100,086 g; a Glazecalc könyvtára ezt 100,08-ra kerekíti.

A **mól** számosság, mint a tucat: ugyanannyi molekula, bármilyenek is. A mólok száma gramm ÷ moláris tömeg:

- 25 g kvarcliszt 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g mészkőliszt 20 ÷ 100,08 = 0,200 mol. A kemencében elveszíti a szén-dioxidját (CO₂, 44,009 g/mol), és 0,200 mol CaO marad belőle, amely 0,200 × 56,077 = 11,2 g. Ez a veszteség a LOI: 43,97%.

### A Glazecalc használata

1. Nyissa meg a [Whiting](/materials/whiting) és a [Silica](/materials/silica) oldalt: mindegyik megadja a képletet és a tömegeket.
2. Számítson ki kézzel egy moláris tömeget, és vesse össze az oldalon szereplővel.

### Munkalap

Table: 2. munkalap: moláris tömeg és mólok
Label: 2. munkalap

| Oxid vagy nyersanyag | Képlet | Moláris tömeg (g/mol) | Gramm | Mól |
| -------------------- | ------ | --------------------- | ----- | --- |
| Szilícium-dioxid     | SiO₂   |                       | 30    |     |
| Timföld              | Al₂O₃  |                       | 10    |     |
| Kalcium-oxid         | CaO    |                       | 5     |     |
| Mészkőliszt          | CaCO₃  |                       | 15    |     |

### Ellenőrzés

- Hány grammot nyom 1 mól SiO₂, és hogyan számítható ki?
- Miért marad 20 g mészkőlisztből kevesebb mint 20 g a kiégetett mázban?
- Miért az oxidokat mólban hasonlítják össze, nem grammban?

## 3. alkalom: a Seger-képlet olvasása {#reading-the-formula}

> [!WARNING]
> Egy máz színezéséhez színezőanyagokat kell bemérni, amelyek némelyike nagyobb gondosságot igényel, mint az alapnyersanyagok. Előbb olvassa el [A legnagyobb figyelmet igénylő nyersanyagok](/guides/safe-mixing#materials) című részt.

### Célok

- Olvassa el a Seger-képlet{{en: unity formula}} három oszlopát (ゼーゲル式, a Seger-képlet japán neve): olvasztóanyagok, stabilizáló, üvegképző.
- Keressen meg egy mázat egy szilícium-dioxid–timföld diagramon, és tudja, mit mondhat el a diagram, és mit nem.
- Színezzen lépésenként egy kész mázat, és jegyezze fel.

### Előkészületek

- Az alábbi Seger-képlet nagyra felírva.
- Egy kész, átlátszó máz, és egy színezőanyag, például vörös vas-oxid (弁柄){{en: red iron oxide}}.

### Kidolgozott példa

A 4. alkalom mázának, a 福島長石 45, mészkőliszt 20, kaolin 10 és kvarcliszt 25 összetételűnek ez a Seger-képlete (a Glazecalc értékei, kerekítve):

Table: Seger-képlet három oszlopban
Label: Seger-képlet

| Olvasztóanyagok (RO, R₂O) | Stabilizáló (R₂O₃) | Üvegképző (RO₂) |
| ------------------------- | ------------------ | --------------- |
| K₂O 0,18                  | Al₂O₃ 0,43         | SiO₂ 3,45       |
| Na₂O 0,10                 |                    |                 |
| CaO 0,72                  |                    |                 |

- Az olvasztóanyagok összege 1: ez a képlet szabálya. Minden más szám mól, egy mól olvasztóanyagra vetítve.
- A szilícium-dioxid és a timföld aránya 3,45 ÷ 0,43, körülbelül 8: tipikus fényes máz.
- Az olvasztóanyag nagy része kalcium, mint a legtöbb japán meszes mázban (石灰釉).

Az a diagram, amelynek vízszintes tengelyén a szilícium-dioxid, függőleges tengelyén a timföld áll, minden mázat egy pontként helyez el. Seger kísérletei és Stull 1912-es diagramja ilyen típusú, a 釉性状図 pedig az osztály saját kiégetett próbalapjait vetíti rá. A Glazecalc recept oldala megrajzolja a Stull-diagramot, és ez a máz a fényes tartományába esik. Stull tartományai a saját olvasztóanyagaiból és égetéséből származnak: útmutató, nem előrejelzés. Az alábbi [próbalap-rács](#tile-maps) lehetővé teszi, hogy egy osztály a saját égetésénél megrajzolja a saját diagramját.

::stull-chart

Egy olyan kész máz színezéséhez, amelynek nem ismeri a receptjét, a Glazecalc nem tudja kiszámítani a képletét. Ehelyett a színezőanyagot a 100 fölött adja hozzá: 100 g száraz máz 1, 2 és 3 g vas-oxiddal, egy-egy próbalap, oxidáló és redukciós égetésben égetve.

### A Glazecalc használata

1. A [recept oldalon](/recipe) írja be a fenti receptet, és olvassa le a **Seger-képletet** és a **Stull-diagramot**.
2. Változtassa a kvarclisztet 25-ről 35-re, és nézze, ahogy a pont jobbra mozdul.
3. Olyan alapmáznál, amelynek ismeri a receptjét, tegye a színezőanyagot hozzáadássá, és a [Keverékek](/blends) oldalon próbasorral lépcsőztesse.

### Munkalap

Table: 3. munkalap: színezőanyag egy kész mázban
Label: 3. munkalap

| Próbalap | Színezőanyag (g 100 g-onként) | Oxidáló égetés: milyen lett | Redukciós égetés: milyen lett |
| -------- | ----------------------------- | --------------------------- | ----------------------------- |
| 1        | 0                             |                             |                               |
| 2        | 1                             |                             |                               |
| 3        | 2                             |                             |                               |
| 4        | 3                             |                             |                               |

### Ellenőrzés

- A Seger-képletben melyik oszlop összege 1?
- Mekkora ennek a máznak a szilícium-dioxid és a timföld aránya, és mire utal?
- Miért adhat egy pont a diagram fényes tartományában mégis matt próbalapot az Ön kemencéjében?

## 4. alkalom: receptből Seger-képlet {#recipe-to-formula}

### Célok

- Számítson ki kézzel Seger-képletet egy receptből.
- Vesse össze a Glazecalc saját számításával.

### Előkészületek

- A 4. munkalap, az 1. alkalom négy összetétele és számológépek.

### Kidolgozott példa

A recept: 福島長石 45, mészkőliszt 20, EPK kaolin 10, kvarcliszt 25. Vegye az egyes mennyiségeket grammnak. Nyersanyagonként a gramm × az oxid százaléka ÷ 100 ÷ a moláris tömege adja a mólokat. A táblázat a fő oxidokat adja; a Glazecalc a nyomokat is számolja (a kaolin vasát és titánját, a földpát magnéziumát).

Table: Az egyes oxidok mólja az adagban (100 g)
Label: Mólok az adagban

| Nyersanyag  | Gramm |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ----------- | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石    |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Mészkőliszt |    20 |      – |      – | 0,1998 |      – |      – |
| Kaolin      |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvarcliszt  |    25 |      – |      – |      – |      – | 0,4161 |
| Összesen    |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Az olvasztóanyagok összege 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnézia) = 0,2847 mol. Ossza el vele az összes végösszeget:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Ez a 3. alkalom képlete.

### A Glazecalc használata

1. Írja be a receptet a [recept oldalon](/recipe).
2. Nyissa meg a **Hogyan számítható ki a Seger-képlet** részt. Ennek a receptnek a számaival mutatja ezeket a lépéseket: a grammokat, az egyes oxidok mólját az egyes nyersanyagokban, az összegeket, és az olvasztóanyagokkal való osztást.
3. Vesse össze az egyes sorokat a munkalapjával. Aztán változtasson meg egy mennyiséget, és csak azt az oszlopot számolja ki újra, amelyet az érint.

### Munkalap

Table: 4. munkalap: receptből Seger-képlet
Label: 4. munkalap

| Nyersanyag        | Gramm | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ----------------- | ----- | --- | ---- | --- | ----- | ---- |
|                   |       |     |      |     |       |      |
|                   |       |     |      |     |       |      |
|                   |       |     |      |     |       |      |
|                   |       |     |      |     |       |      |
| Összesen          |       |     |      |     |       |      |
| ÷ olvasztóanyagok |       |     |      |     |       |      |

### Ellenőrzés

- Miért ad bármilyen adagméret ugyanazt a Seger-képletet?
- Milyen oxidokat hoz a kaolin, és melyik számít közülük itt a legtöbbet?
- Miért marad ki a mészkőliszt LOI-ja a képletből?

## 5. alkalom: Seger-képletből recept {#formula-to-recipe}

### Célok

- Válasszon nyersanyagokat egy célképlethez, és számítsa ki, mennyi kell mindegyikből.
- Használja a Számítás célérték szerint funkciót, és mondja meg, mennyire közelíti meg a célt.

### Előkészületek

- Az alábbi célérték, az 5. munkalap és számológépek; a Glazecalc fiókkal.

### Kidolgozott példa

A célérték: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ és 4,0 SiO₂. Vegye a nyersanyagokat ebben a sorrendben, mindegyiket arra az oxidra, amelyet csak az tud behozni:

1. **A földpát, a káliumra és a nátriumra.** Egy egység 福島長石 (536,8 g, az a tömeg, amely egy mól olvasztóanyagot tartalmaz) 0,94 mol K₂O-t és Na₂O-t hoz be. A célérték 0,3-at kér, tehát 0,3 ÷ 0,94 = 0,319 egység: 171,4 g. Behoz emellett 0,015 CaO-t, 0,328 Al₂O₃-t és 1,865 SiO₂-t is.
2. **Mészkőliszt, a maradék kalciumra.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, a maradék timföldre.** 0,4 − 0,328 = 0,072 mol. Az EPK kaolin 272,6 g-ban tartalmaz egy mól Al₂O₃-t, tehát 19,6 g kell, amely 0,149 SiO₂-t is behoz.
4. **Kvarcliszt, a maradékra.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Az adag 379,0 g. Százalékban: 福島長石 45,2, mészkőliszt 18,1, kaolin 5,2, kvarcliszt 31,5. A földpát szabja meg a kálium és a nátrium arányát, így a recept 0,195 K₂O-t és 0,104 Na₂O-t ad: közel a célhoz, de nem pontosan rajta.

### A Glazecalc használata

1. Nyissa meg a [Számítás célérték szerint](/solve) oldalt, válassza a **Seger-képlet (mólok; az olvasztóanyagok összege 1)** lehetőséget, és írja be a célértéket.
2. A nyersanyagok listájában (**A nyersanyagok**) adja meg a 福島長石, a mészkőlisztet, az EPK kaolint és a kvarclisztet, majd válassza a **Számítás** lehetőséget.
3. Eredményül 福島長石 44,9, mészkőliszt 18,2, kaolin 5,6 és kvarcliszt 31,3 adódik, és egy táblázat arról, mennyire közelíti meg az egyes oxidokat. Vesse össze a kézi számítással: a megoldó minden nyomot is számol, és megkeresi a legjobb illeszkedést, amelyet a négy nyersanyag megenged.
4. Válassza a **Megnyitás új receptként** lehetőséget, és ellenőrizze a recept oldalon.

### Munkalap

Table: 5. munkalap: célértékből recept
Label: 5. munkalap

| Lépés | Nyersanyag | Melyik oxidra | Szükséges mól | Gramm | Mit hoz be még |
| ----- | ---------- | ------------- | ------------- | ----- | -------------- |
| 1     |            |               |               |       |                |
| 2     |            |               |               |       |                |
| 3     |            |               |               |       |                |
| 4     |            |               |               |       |                |

### Ellenőrzés

- Miért a földpátot kell először kiszámítani?
- Miért nem tud ez a négy nyersanyag pontosan 0,2 K₂O-t és 0,1 Na₂O-t adni?
- Milyen nyersanyagot adna hozzá, hogy magnézia kerüljön a receptbe?

## 6. alkalom: a massza és a mázhibák {#body-and-defects}

> [!WARNING]
> A kiégetett máz fémeket oldhat ki az ételbe és az italba, és közben tökéletesen is nézhet ki. A báriumban gazdag mázak, a rezet tartalmazó mázak és minden ólmos máz kioldódhat. Hogy mit enged ki, azt csak a kiégetett edény laboratóriumi kioldódási vizsgálata{{en: leach test}} mutatja meg; semmilyen számítás nem képes rá. Olvassa el az [Élelmiszer-biztonság](/guides/glazing-basics#food-safety) és [A legnagyobb figyelmet igénylő nyersanyagok](/guides/safe-mixing#materials) című részt.

### Célok

- Mérje meg a massza zsugorodását és vízfelvételét.
- Nevezze meg a gyakori mázhibákat, szokásos okaikat és az első javítási kísérletet.
- Tudja, mely hibák teszik veszélyessé az árut.

### Előkészületek

- A használt massza próbarúdjai, nedvesen 100 mm távolságban megjelölve, kiégetve és égetetlenül.
- Hibás próbalapok, ha vannak: hajszálrepedés, összehúzódás, tűszúrás, lefolyás.

### Kidolgozott példa

- **Zsugorodás**: (jelölt hossz − kiégetett hossz) ÷ jelölt hossz × 100. A 100 mm-re jelölt pontok, amelyek égetés után 88 mm-re vannak egymástól: 12% zsugorodás.
- **Vízfelvétel**: (áztatás utáni tömeg − száraz tömeg) ÷ száraz tömeg × 100. Egy kiégetett 50,0 g-os rúd, amely áztatás után 50,6 g: 1,2%.

Table: Mázhibák, okok és első javítási kísérlet a Seger-képletben
Label: Mázhibák

| Hiba           | Szokásos ok                                   | Első javítási kísérlet                                |
| -------------- | --------------------------------------------- | ----------------------------------------------------- |
| Hajszálrepedés | A máz jobban zsugorodik, mint a massza        | Kevesebb K₂O és Na₂O; több kalcium, magnézia vagy bór |
| Lepattogzás    | A máz jóval kevésbé zsugorodik, mint a massza | Több K₂O és Na₂O                                      |
| Lefolyás       | Túl kevés timföld, vagy túl vastag réteg      | Több timföld; vékonyabb réteg                         |
| Összehúzódás   | Poros zsenge, vagy vastag, megrepedt réteg    | Tisztítsa meg a zsengét; vékonyabb réteg              |
| Tűszúrás       | Gáz, amely nem záródott be                    | Hőntartás a csúcshőmérsékleten; vékonyabb réteg       |

[A máz illeszkedése és mázhibák](/guides/glazing-basics#fit-and-defects) mindegyiket elmagyarázza, a hajszálrepedés jeges vizes próbájával együtt. Hajszálrepedezett vagy lepattogzott árut ne használjon étel vagy ital számára.

::food-limits

### A Glazecalc használata

1. A [recept oldalon](/recipe) olvassa le egy saját mázához a **Határértékek** panelt és a számított hőtágulást.
2. Másolja le a receptet, cserélje ki a földpát egy részét mészkőlisztre, és hasonlítsa össze a kettőt: merre mozdult a hőtágulás?

### Munkalap

Table: 6. munkalap: a massza
Label: 6. munkalap

| Rúd | Jelölt hossz (mm) | Kiégetett hossz (mm) | Zsugorodás (%) | Száraz tömeg (g) | Áztatott tömeg (g) | Vízfelvétel (%) |
| --- | ----------------- | -------------------- | -------------- | ---------------- | ------------------ | --------------- |
| 1   | 100               |                      |                |                  |                    |                 |
| 2   | 100               |                      |                |                  |                    |                 |

### Ellenőrzés

- Melyik hiba származik abból, hogy a máz jobban zsugorodik, mint a massza, és mi az első javítási kísérlet?
- Miért nem szabad lepattogzott árut soha élelmiszerhez használni?
- Meg tudja-e mondani egy számítás, hogy egy máz élelmiszerrel érintkezésre alkalmas? Mi tudja megmondani?

## Nyomtatható próbalap-térképek {#tile-maps}

### Háromszög-próba térképe: 42 máz

Két háromszög 21-21 próbalappal, a Keverékek elrendezéséből, 6 sorral: az 1. próbalap van felül (földpát), az alsó sor a mészkőlisztől (balra) a kvarclisztig (jobbra) tart. A II. háromszög az I. háromszög, minden 100 g fölé 1 g vörös vas-oxiddal, amely redukcióban a szeladon (青磁) felé hajlik. Oxidáló és redukciós égetésben égetve ez 84 próbalap. A mennyiségek gramm 100 g-onként.

Table: Háromszög-próba térképe: 福島長石, mészkőliszt és kvarcliszt, minden próbalapon 10 kaolinnal
Label: Háromszög-próba térképe

| Próbalap (I) | Próbalap (II) | 福島長石 | Mészkőliszt | Kvarcliszt | Kaolin | I ox | I red | II ox | II red |
| ------------ | ------------- | -------: | ----------: | ---------: | -----: | ---- | ----- | ----- | ------ |
| 1            | 22            |       90 |           0 |          0 |     10 |      |       |       |        |
| 2            | 23            |       72 |          18 |          0 |     10 |      |       |       |        |
| 3            | 24            |       72 |           0 |         18 |     10 |      |       |       |        |
| 4            | 25            |       54 |          36 |          0 |     10 |      |       |       |        |
| 5            | 26            |       54 |          18 |         18 |     10 |      |       |       |        |
| 6            | 27            |       54 |           0 |         36 |     10 |      |       |       |        |
| 7            | 28            |       36 |          54 |          0 |     10 |      |       |       |        |
| 8            | 29            |       36 |          36 |         18 |     10 |      |       |       |        |
| 9            | 30            |       36 |          18 |         36 |     10 |      |       |       |        |
| 10           | 31            |       36 |           0 |         54 |     10 |      |       |       |        |
| 11           | 32            |       18 |          72 |          0 |     10 |      |       |       |        |
| 12           | 33            |       18 |          54 |         18 |     10 |      |       |       |        |
| 13           | 34            |       18 |          36 |         36 |     10 |      |       |       |        |
| 14           | 35            |       18 |          18 |         54 |     10 |      |       |       |        |
| 15           | 36            |       18 |           0 |         72 |     10 |      |       |       |        |
| 16           | 37            |        0 |          90 |          0 |     10 |      |       |       |        |
| 17           | 38            |        0 |          72 |         18 |     10 |      |       |       |        |
| 18           | 39            |        0 |          54 |         36 |     10 |      |       |       |        |
| 19           | 40            |        0 |          36 |         54 |     10 |      |       |       |        |
| 20           | 41            |        0 |          18 |         72 |     10 |      |       |       |        |
| 21           | 42            |        0 |           0 |         90 |     10 |      |       |       |        |

### Seger-rács: 24 máz

Minden próbalapon azonos az olvasztóanyag: 0,2 KNaO és 0,8 CaO, amelyet 福島長石 és mészkőliszt ad. A timföld sorról sorra nő a rácson lefelé haladva, a szilícium-dioxid pedig oszlopról oszlopra nő jobbra haladva. A recepteket az 5. alkalom módszerével számítottuk ki; mindegyik Seger-képlete a Glazecalc szerint a rács timföldértékétől legfeljebb 0,01-del, szilícium-dioxid-értékétől legfeljebb 0,06-del tér el. Jelölje be az egyes próbalapokat egy szilícium-dioxid–timföld diagramon, és rajzolja meg a saját tartományait: matt, fényes, alulégetett, lefolyó.

Table: Seger-rács: 0,2 KNaO, 0,8 CaO, tömegszázalék
Label: Seger-rács

| Próbalap | Al₂O₃ | SiO₂ | 福島長石 | Mészkőliszt | Kaolin | Kvarcliszt | Oxidáló égetés | Redukciós égetés |
| -------- | ----: | ---: | -------: | ----------: | -----: | ---------: | -------------- | ---------------- |
| 1        |  0,25 |  2,0 |     46,9 |        32,5 |    3,5 |       17,1 |                |                  |
| 2        |  0,25 |  2,5 |     41,8 |        28,9 |    3,1 |       26,2 |                |                  |
| 3        |  0,25 |  3,0 |     37,6 |        26,1 |    2,8 |       33,5 |                |                  |
| 4        |  0,25 |  3,5 |     34,3 |        23,7 |    2,5 |       39,5 |                |                  |
| 5        |  0,25 |  4,0 |     31,4 |        21,7 |    2,3 |       44,5 |                |                  |
| 6        |  0,25 |  4,5 |     29,0 |        20,1 |    2,2 |       48,7 |                |                  |
| 7        |  0,35 |  2,0 |     44,3 |        30,6 |   13,9 |       11,3 |                |                  |
| 8        |  0,35 |  2,5 |     39,6 |        27,4 |   12,4 |       20,5 |                |                  |
| 9        |  0,35 |  3,0 |     35,9 |        24,8 |   11,2 |       28,0 |                |                  |
| 10       |  0,35 |  3,5 |     32,8 |        22,7 |   10,3 |       34,2 |                |                  |
| 11       |  0,35 |  4,0 |     30,2 |        20,9 |    9,5 |       39,5 |                |                  |
| 12       |  0,35 |  4,5 |     28,0 |        19,4 |    8,8 |       43,9 |                |                  |
| 13       |  0,45 |  2,0 |     41,9 |        29,0 |   23,1 |        6,1 |                |                  |
| 14       |  0,45 |  2,5 |     37,7 |        26,1 |   20,8 |       15,4 |                |                  |
| 15       |  0,45 |  3,0 |     34,3 |        23,7 |   18,9 |       23,0 |                |                  |
| 16       |  0,45 |  3,5 |     31,5 |        21,8 |   17,4 |       29,4 |                |                  |
| 17       |  0,45 |  4,0 |     29,1 |        20,1 |   16,0 |       34,8 |                |                  |
| 18       |  0,45 |  4,5 |     27,0 |        18,7 |   14,9 |       39,4 |                |                  |
| 19       |  0,55 |  2,0 |     39,7 |        27,5 |   31,4 |        1,5 |                |                  |
| 20       |  0,55 |  2,5 |     35,9 |        24,9 |   28,4 |       10,8 |                |                  |
| 21       |  0,55 |  3,0 |     32,8 |        22,7 |   26,0 |       18,5 |                |                  |
| 22       |  0,55 |  3,5 |     30,2 |        20,9 |   23,9 |       25,0 |                |                  |
| 23       |  0,55 |  4,0 |     28,0 |        19,4 |   22,1 |       30,5 |                |                  |
| 24       |  0,55 |  4,5 |     26,1 |        18,1 |   20,6 |       35,3 |                |                  |

A Glazecalc Keverékek oldala 3 és 66 közötti számú próbalapból álló háromszögeket és négyzeteket készít, ezt a rácsot nem; nyissa meg bármelyik próbalapot receptként a [recept oldalon](/recipe), és onnan nyomtassa ki a bemérési listáját.

## Források {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): a hat alkalom.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: az alkalmak időpontjai és témái.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: a folytatásként tartott tanfolyam 42, 90 és 78 mázas, oxidáló és redukciós égetésű feladatai.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): a központ saját számítóprogramja.
- Bilecik Şeyh Edebali University, [SCT305 kurzusinformáció](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): a Seger-képlet az 5., 6. és 8. héten.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): mázszámítás tajvani iskolai tanároknak.
- Glendale Community College, ART 195 kurzusleírás: a Seger-képlet a 15 hét közül az 5–7. héten.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: a 福島長石 összetétele a Glazecalc könyvtárában.
- IUPAC, standard atomtömegek, ahogy a Glazecalc kémiája használja.
