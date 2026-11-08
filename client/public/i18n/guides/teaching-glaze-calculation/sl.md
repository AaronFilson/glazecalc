---
title: Poučevanje izračuna glazur
lead: 6 srečanj za razred ali študijsko skupino, od surovin in triaksialnih ploščic do Segerjeve formule, izračunane v obe smeri, in glazurnih napak; vsako s primerom izračuna, koraki v aplikaciji Glazecalc, delovnim listom za tisk in vprašanji za preverjanje.
---

## O tem gradivu {#about}

To gradivo je namenjeno vsem, ki učijo izračun glazur: šoli, delavniškemu tečaju, študijski skupini lončarjev, ki delajo poklicno, ali lončarju, ki se uči sam. Ima šest srečanj, vsako pa ima cilje, kaj pripraviti, primer izračuna z resničnimi surovinami, kako to narediti v aplikaciji Glazecalc, delovni list in vprašanja za preverjanje.

Vrstni red srečanj sledi objavljeni študijski skupini: 陶磁器釉薬技術研究会 (študijska skupina za keramične glazure) Industrijsko-tehnološkega centra prefekture Ibaraki na Japonskem, ki je leta 2015 izvedla šest srečanj za 12 mladih lončarjev in jih opisala v svojem raziskovalnem poročilu. Njen nadaljevalni tečaj na visoki šoli za keramiko v Kasami je postavil tri naloge s ploščicami, pri katerih je bilo glazur 42, 90 oziroma 78, vsaka pa je bila žgana v oksidaciji in v redukciji. **Glazecalc ni povezan s centrom ali s šolo.** Sledimo vrstnemu redu njihovega objavljenega orisa in ga navajamo spodaj; besedilo, primeri in delovni listi tukaj so naši. Tečaji v drugih državah učijo iste korake v skoraj enakem vrstnem redu: SCT305 na Bilecik Şeyh Edebali University v Turčiji, ART 195 na Glendale Community College v ZDA, učni načrt Porenja-Pfalške za keramične šole v Nemčiji in članek 李堅萍 iz leta 2006 za učitelje na Tajvanu.

Table: Šest srečanj
Label: Šest srečanj

| Srečanje | Tema                                                      | V aplikaciji Glazecalc                            |
| -------- | --------------------------------------------------------- | ------------------------------------------------- |
| 1        | Surovine, kaj počnejo, triaksialne ploščice               | Surovine, Testne serije za ploščice (triaksialne) |
| 2        | Kemija: elementi, formule, moli                           | Stran surovine                                    |
| 3        | Branje Segerjeve formule (UMF), diagram kremenica–glinica | Stran recepta, Stullov diagram                    |
| 4        | Od recepta do Segerjeve formule                           | Kako se izračuna Segerjeva formula                |
| 5        | Od Segerjeve formule do recepta                           | Reševanje za cilj                                 |
| 6        | Glinena masa in glazurne napake                           | Meje, Primerjaj                                   |

### Kako uporabljati gradivo

- Vsako srečanje traja približno 2 uri. Za 4. in 5. srečanje potrebujete kalkulatorje ter za vsak par računalnik ali telefon z aplikacijo Glazecalc.
- Primeri izračuna uporabljajo surovine, ki se prodajajo na Japonskem, in številke iz standardne knjižnice aplikacije Glazecalc: 福島長石 (fukushimski glinenec), kreda{{en: whiting}} (石灰石, kalcijev karbonat), kaolin in kremen (珪石). Kjer imate analizo svojega dobavitelja, jo dodajte na [strani Surovine](/material): številke se spremenijo, metoda pa ne.
- Žganje poteka do stožca SK 8, nazivno {{2282 °F; 1250 °C}}. Uporabite stožec, do katerega žge vaš razred; [Žganje po stožcih SK](/guides/firing#sk-cones) pojasni številke SK.
- Za tisk delovnega lista ali načrta ploščic natisnite to stran iz brskalnika. Za shranjevanje receptov, testnih serij in zapiskov je potreben brezplačen račun.

> [!WARNING]
> 1., 3. in 6. srečanje so laboratorijsko delo: tehtanje suhih surovin in žganje. Preden kdor koli tehta surovino, preberite [Najpomembnejše navade](/guides/safe-mixing#habits). Prah suhe glazure je glavna nevarnost.

## 1. srečanje: Surovine in triaksialne ploščice {#materials}

> [!WARNING]
> Suhe surovine tehtajte nežno, čistite mokro in nosite prilegajočo se zaščitno dihalno masko, dokler so praški suhi. Najprej preberite [Glavna nevarnost: prah](/guides/safe-mixing#the-main-hazard) in [Zaščitne dihalne maske](/guides/safe-mixing#respirators).

### Cilji

- Poimenujte tri naloge v glazuri: tvorec stekla, talilo{{en: flux}} in stabilizator.
- Razvrstite 4 pogoste surovine po oksidih, ki jih prinašajo.
- Sestavite triaksialno mešanico in berite njene ploščice kot zemljevid.

### Priprava

- Po ena vreča 福島長石, krede, kaolina in kremena ali surovin, ki jih ima vaš razred.
- [Načrt triaksialnih ploščic](#tile-maps) spodaj, natisnjen, in 21 testnih ploščic na učenca za vsak trikotnik.
- Žgane ploščice iz prejšnje triaksialne serije, če jih imate, da jih podajate naokoli.

### Primer izračuna

Analiza vsake surovine iz knjižnice aplikacije Glazecalc pove, katere okside pusti po žganju. Izguba pri žarenju (LOI) je tisto, kar zgori.

Table: Štiri surovine in kaj prinašajo (masni odstotki, iz knjižnice)
Label: Štiri surovine

| Surovina            | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Njena naloga                         |
| ------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ------------------------------------ |
| 福島長石 (glinenec) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Talilo, s svojo glinico in kremenico |
| Kreda (石灰石)      |    – |     – |     – |    – | 56,03 | 43,97 | Talilo (kalcij)                      |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizator: glavni vir glinice     |
| Kremen (珪石)       |  100 |     – |     – |    – |     – |     – | Tvorec stekla                        |

Glinenec sam pri SK 8 stali v viskozno steklo; kreda sama se ne stali; kremen sam se ne stali. V mešanici se stalijo veliko bolje kot katera koli sama. Triaksialna mešanica pokaže, kje: spodnji načrt ploščic spreminja tri surovine v korakih po ~20 % (18 od 90), v vsaki ploščici pa je 10 % kaolina.

::shops

### V aplikaciji Glazecalc

1. Odprite vsako surovino na [strani Surovine](/material) ali njeno javno stran, na primer [Fukushima Feldspar](/materials/fukushima-feldspar). Zapišite, katere okside prinaša.
2. Naredite tri recepte: 福島長石 90 s kaolinom 10, kreda 90 s kaolinom 10 in kremen 90 s kaolinom 10. Na strani [Testne serije za ploščice](/blends) izberite **Triaksialna (3 recepti)** in 6 vrstic: 21 ploščic, enako kot na načrtu spodaj.
3. Izberite velikost mešanice za vsako ploščico in z **Natisni** natisnite, kaj stehtati. Po žganju shranite ploščice, ki so vam všeč, kot recepte iz risbe ploščic.

### Delovni list

Table: Delovni list 1: kaj prinaša vsaka surovina
Label: Delovni list 1

| Surovina | Oksidi, ki jih prinaša | Tvorec stekla, talilo ali stabilizator? | LOI (%) |
| -------- | ---------------------- | --------------------------------------- | ------- |
| 福島長石 |                        |                                         |         |
| Kreda    |                        |                                         |         |
| Kaolin   |                        |                                         |         |
| Kremen   |                        |                                         |         |

### Preverjanje

- Katera surovina prinese večino glinice in zakaj jo glazura potrebuje?
- Zakaj se oglišče trikotnika s kredo samo ne stali?
- Kje na trikotniku so se vaše ploščice najbolje stalile in kateremu oglišču je bilo to najbliže?

## 2. srečanje: Kemija, ki jo potrebujete {#chemistry}

### Cilji

- Preberite kemijsko formulo: SiO₂, CaO, Al₂O₃, CaCO₃.
- Izračunajte molsko maso iz atomskih mas.
- Pretvorite grame v mole in nazaj.

### Priprava

- Periodni sistem za vsakega učenca in kalkulatorji.
- Atomske mase v spodnji preglednici (standardne vrednosti IUPAC, kot jih uporablja aplikacija Glazecalc).

### Primer izračuna

Table: Atomske mase, uporabljene tukaj (g/mol)
Label: Atomske mase

| Element  | Simbol | Atomska masa |
| -------- | ------ | -----------: |
| Kisik    | O      |       15,999 |
| Ogljik   | C      |       12,011 |
| Natrij   | Na     |        22,99 |
| Aluminij | Al     |       26,982 |
| Silicij  | Si     |       28,085 |
| Kalij    | K      |       39,098 |
| Kalcij   | Ca     |       40,078 |

Formula šteje atome. SiO₂ je en silicij in dva kisika, zato ima en mol maso 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ je 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO je 56,077 g, kreda, CaCO₃, pa 100,086 g; knjižnica aplikacije Glazecalc jo zaokroži na 100,08.

**Mol** je število, kakor ducat: enako število molekul, ne glede na to, katere so. Moli so grami ÷ molska masa:

- 25 g kremena je 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g krede je 20 ÷ 100,08 = 0,200 mol. V peči izgubi ogljikov dioksid (CO₂, 44,009 g/mol) in pusti 0,200 mol CaO, ki ima maso 0,200 × 56,077 = 11,2 g. Ta izguba je njen LOI: 43,97 %.

### V aplikaciji Glazecalc

1. Odprite [Whiting](/materials/whiting) in [Silica](/materials/silica): vsaka stran navaja formulo in mase.
2. Eno molsko maso izračunajte na roke in jo primerjajte s stranjo.

### Delovni list

Table: Delovni list 2: molska masa in moli
Label: Delovni list 2

| Oksid ali surovina | Formula | Molska masa (g/mol) | Grami | Moli |
| ------------------ | ------- | ------------------- | ----- | ---- |
| Kremenica          | SiO₂    |                     | 30    |      |
| Glinica            | Al₂O₃   |                     | 10    |      |
| Kalcijev oksid     | CaO     |                     | 5     |      |
| Kreda              | CaCO₃   |                     | 15    |      |

### Preverjanje

- Koliko gramov ima en mol SiO₂ in kako se to izračuna?
- Zakaj 20 g krede v žgani glazuri pusti manj kot 20 g?
- Zakaj okside primerjamo po molih, ne po gramih?

## 3. srečanje: Branje Segerjeve formule {#reading-the-formula}

> [!WARNING]
> Barvanje glazure pomeni tehtanje barvil, med katerimi nekatera zahtevajo več previdnosti kot osnovne surovine. Najprej preberite [Surovine, ki zahtevajo največ previdnosti](/guides/safe-mixing#materials).

### Cilji

- Preberite tri stolpce Segerjeve formule{{en: unity formula}} (ゼーゲル式, Segerjeva formula): talila, stabilizator, tvorec stekla.
- Poiščite glazuro na diagramu kremenica–glinica in vedite, kaj diagram lahko pove in česa ne.
- Pobarvajte pripravljeno glazuro po korakih in to zapišite.

### Priprava

- Spodnja Segerjeva formula, napisana veliko.
- Pripravljena prozorna glazura in barvilo, na primer rdeči železov oksid (弁柄){{en: red iron oxide}}.

### Primer izračuna

Glazura 4. srečanja, 福島長石 45, kreda 20, kaolin 10 in kremen 25, ima to Segerjevo formulo (številke aplikacije Glazecalc, zaokrožene):

Table: Segerjeva formula v treh stolpcih
Label: Segerjeva formula

| Talila (RO, R₂O) | Stabilizator (R₂O₃) | Tvorec stekla (RO₂) |
| ---------------- | ------------------- | ------------------- |
| K₂O 0,18         | Al₂O₃ 0,43          | SiO₂ 3,45           |
| Na₂O 0,10        |                     |                     |
| CaO 0,72         |                     |                     |

- Talila skupaj dajo 1: to je pravilo formule. Vsako drugo število so moli na vsak mol talil.
- Razmerje kremenica : glinica je 3,45 ÷ 0,43, približno 8: tipična sijajna glazura.
- Večino talil prispeva kalcij, kakor pri večini japonskih apnenih glazur (石灰釉).

Diagram s kremenico po vodoravni osi in glinico po navpični postavi vsako glazuro kot točko. Segerjevi preizkusi in Stullov diagram iz leta 1912 so take vrste, 釉性状図 pa nanese na tak diagram lastne žgane ploščice razreda. Stran recepta v aplikaciji Glazecalc nariše Stullov diagram in ta glazura leži v njegovem sijajnem območju. Stullova območja izvirajo iz njegovih talil in njegovega žganja: vodilo, ne napoved. [Mreža ploščic](#tile-maps) spodaj omogoča razredu, da nariše svoj diagram pri svojem žganju.

::stull-chart

Za barvanje pripravljene glazure, katere recepta ne poznate, Glazecalc ne more izračunati njene formule. Namesto tega dodajte barvilo povrh 100: 100 g suhe glazure z 1, 2 in 3 g železovega oksida, po ena ploščica za vsako količino, žgana v oksidaciji in v redukciji.

### V aplikaciji Glazecalc

1. Na [strani recepta](/recipe) vnesite zgornji recept in preberite njegovo **Segerjevo formulo** in **Stullov diagram**.
2. Kremen spremenite z 25 na 35 in opazujte, kako se točka premakne v desno.
3. Pri osnovi, katere recept imate, naj bo barvilo dodatek in uporabite linijsko testno serijo na strani [Testne serije za ploščice](/blends), da ga spreminjate po korakih.

### Delovni list

Table: Delovni list 3: barvilo v pripravljeni glazuri
Label: Delovni list 3

| Ploščica | Barvilo (g na 100 g) | Oksidacija: kako izgleda | Redukcija: kako izgleda |
| -------- | -------------------- | ------------------------ | ----------------------- |
| 1        | 0                    |                          |                         |
| 2        | 1                    |                          |                         |
| 3        | 2                    |                          |                         |
| 4        | 3                    |                          |                         |

### Preverjanje

- Kateri stolpec Segerjeve formule se sešteje v 1?
- Kakšno je razmerje kremenica : glinica te glazure in kaj nakazuje?
- Zakaj lahko točka v sijajnem območju diagrama v vaši peči še vedno da mat ploščico?

## 4. srečanje: Od recepta do Segerjeve formule {#recipe-to-formula}

### Cilji

- Izračunajte Segerjevo formulo iz recepta na roke.
- Preverite jo z izračunom aplikacije Glazecalc.

### Priprava

- Delovni list 4, štiri analize iz 1. srečanja in kalkulatorji.

### Primer izračuna

Recept: 福島長石 45, kreda 20, kaolin EPK 10, kremen 25. Vsako količino vzemite kot grame. Za vsako surovino grami × odstotek oksida ÷ 100 ÷ molska masa oksida dajo mole oksida. Preglednica prikazuje glavne okside; Glazecalc šteje tudi sledove (železo in titan v kaolinu, magnezij v glinencu).

Table: Moli posameznega oksida v mešanici (100 g)
Label: Moli v mešanici

| Surovina | Grami |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kreda    |    20 |      – |      – | 0,1998 |      – |      – |
| Kaolin   |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kremen   |    25 |      – |      – |      – |      – | 0,4161 |
| Skupaj   |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Talila skupaj dajo 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnezijev oksid) = 0,2847 mol. Z njo delite vsako vsoto:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

To je formula 3. srečanja.

### V aplikaciji Glazecalc

1. Vnesite recept na [strani recepta](/recipe).
2. Odprite **Kako se izračuna Segerjeva formula**. Prikaže te korake s številkami tega recepta: grame, mole vsakega oksida v vsaki surovini, vsote in deljenje s talili.
3. Vsako vrstico primerjajte z delovnim listom. Nato spremenite eno količino in izračunajte samo stolpec, ki se spremeni.

### Delovni list

Table: Delovni list 4: od recepta do Segerjeve formule
Label: Delovni list 4

| Surovina | Grami | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| -------- | ----- | --- | ---- | --- | ----- | ---- |
|          |       |     |      |     |       |      |
|          |       |     |      |     |       |      |
|          |       |     |      |     |       |      |
|          |       |     |      |     |       |      |
| Skupaj   |       |     |      |     |       |      |
| ÷ talila |       |     |      |     |       |      |

### Preverjanje

- Zakaj vsaka velikost mešanice da isto Segerjevo formulo?
- Katere okside prinese kaolin in kateri izmed njih je tu najpomembnejši?
- Zakaj je LOI krede izpuščena iz formule?

## 5. srečanje: Od Segerjeve formule do recepta {#formula-to-recipe}

### Cilji

- Izberite surovine za ciljno formulo in izračunajte, koliko je treba vsake.
- Uporabite Reševanje za cilj in povejte, kako blizu cilju pride.

### Priprava

- Spodnji cilj, delovni list 5 in kalkulatorji; aplikacija Glazecalc z računom.

### Primer izračuna

Cilj: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ in 4,0 SiO₂. Surovine vzemite v tem vrstnem redu, vsako za oksid, ki ga lahko prinese samo ona:

1. **Glinenec, za kalij in natrij.** Ena enota 福島長石 (536,8 g, masa, ki vsebuje en mol talil) prinese 0,94 mol K₂O in Na₂O. Cilj potrebuje 0,3, zato 0,3 ÷ 0,94 = 0,319 enote: 171,4 g. Prinese tudi 0,015 CaO, 0,328 Al₂O₃ in 1,865 SiO₂.
2. **Kreda, za preostali kalcij.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, za preostalo glinico.** 0,4 − 0,328 = 0,072 mol. Kaolin EPK vsebuje en mol Al₂O₃ v 272,6 g, zato 19,6 g, ki prinese tudi 0,149 SiO₂.
4. **Kremen, za preostanek.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Mešanica ima maso 379,0 g. V odstotkih: 福島長石 45,2, kreda 18,1, kaolin 5,2, kremen 31,5. Glinenec določa razmerje med kalijem in natrijem, zato recept da 0,195 K₂O in 0,104 Na₂O: blizu cilja, ne pa natanko na njem.

### V aplikaciji Glazecalc

1. Odprite [Reševanje za cilj](/solve), izberite **Segerjeva formula (moli, talila skupaj dajo 1)** in vnesite cilj.
2. Pod **Surovine** mu dajte 福島長石, kredo, kaolin EPK in kremen ter izberite **Reši**.
3. Rezultat je 福島長石 44,9, kreda 18,2, kaolin 5,6 in kremen 31,3, ob tem pa preglednica, kako blizu pride vsak oksid. Primerjajte ga z računom na roke: reševalnik šteje vse sledove in poišče najboljše ujemanje, ki ga dovoljujejo štiri surovine.
4. Izberite **Odpri kot nov recept** in ga preverite na strani recepta.

### Delovni list

Table: Delovni list 5: od cilja do recepta
Label: Delovni list 5

| Korak | Surovina | Za kateri oksid | Potrebni moli | Grami | Prinese tudi |
| ----- | -------- | --------------- | ------------- | ----- | ------------ |
| 1     |          |                 |               |       |              |
| 2     |          |                 |               |       |              |
| 3     |          |                 |               |       |              |
| 4     |          |                 |               |       |              |

### Preverjanje

- Zakaj glinenec izračunamo prvi?
- Zakaj te štiri surovine ne morejo dati natanko 0,2 K₂O in 0,1 Na₂O?
- Kaj bi dodali surovinam, da vnesete magnezijev oksid?

## 6. srečanje: Glinena masa in glazurne napake {#body-and-defects}

> [!WARNING]
> Žgana glazura lahko v hrano in pijačo sprošča kovine in je lahko videti popolna, medtem ko to počne. Glazure z veliko barija ali z bakrom in vsaka glazura s svincem lahko sproščajo kovine. Samo laboratorijski preskus sproščanja kovin{{en: leach test}} žganega izdelka pokaže, kaj sprošča; noben izračun tega ne more. Preberite [Varnost pri stiku z živili](/guides/glazing-basics#food-safety) in [Surovine, ki zahtevajo največ previdnosti](/guides/safe-mixing#materials).

### Cilji

- Izmerite skrček in vpijanje vode glinene mase.
- Poimenujte pogoste napake, njihove običajne vzroke in prvi popravek.
- Vedite, katere napake naredijo izdelke nevarne.

### Priprava

- Preskusne palčke vaše glinene mase, med mokrim označene na razdalji 100 mm, žgane in nežgane.
- Ploščice z napakami, če jih imate: lasaste razpoke, krčenje glazure, luknjice, odtekanje.

### Primer izračuna

- **Skrček**: (označena dolžina − žgana dolžina) ÷ označena dolžina × 100. Oznaki na razdalji 100 mm, ki po žganju merita 88 mm: skrček 12 %.
- **Vpijanje vode**: (masa po namakanju − suha masa) ÷ suha masa × 100. Žgana palčka z maso 50,0 g, ki ima po namakanju maso 50,6 g: 1,2 %.

Table: Napake, vzroki in prvi popravek v Segerjevi formuli
Label: Napake

| Napaka          | Običajen vzrok                                 | Prvi popravek za poskus                                 |
| --------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Lasaste razpoke | Glazura se krči bolj kot glinena masa          | Manj K₂O in Na₂O; več kalcija, magnezija ali bora       |
| Luščenje        | Glazura se krči precej manj kot glinena masa   | Več K₂O in Na₂O                                         |
| Odtekanje       | Premalo glinice ali predebel nanos             | Več glinice; tanjši nanos                               |
| Krčenje glazure | Prašen biskvit ali debel nanos, ki je razpokal | Očistite biskvit; tanjši nanos                          |
| Luknjice        | Plinski mehurček, ki se ni zacelil             | Zadržanje pri najvišji temperaturi žganja; tanjši nanos |

[Ujemanje glazure in napake](/guides/glazing-basics#fit-and-defects) razloži vsako od njih, s preskusom z ledeno vodo za lasaste razpoke. Izdelkov z lasastimi razpokami ali z luščenjem ne uporabljajte za hrano ali pijačo.

::food-limits

### V aplikaciji Glazecalc

1. Na [strani recepta](/recipe) preberite razdelek **Meje** za svojo glazuro in njeno izračunano raztezanje.
2. Kopirajte recept, zamenjajte nekaj glinenca s kredo in primerjajte oba: v katero smer se je raztezanje premaknilo?

### Delovni list

Table: Delovni list 6: glinena masa
Label: Delovni list 6

| Palčka | Označena dolžina (mm) | Žgana dolžina (mm) | Skrček (%) | Suha masa (g) | Masa po namakanju (g) | Vpijanje (%) |
| ------ | --------------------- | ------------------ | ---------- | ------------- | --------------------- | ------------ |
| 1      | 100                   |                    |            |               |                       |              |
| 2      | 100                   |                    |            |               |                       |              |

### Preverjanje

- Katera napaka izvira iz glazure, ki se krči bolj kot njena glinena masa, in kaj je prvi popravek?
- Zakaj se izdelki z luščenjem nikoli ne smejo uporabljati za hrano?
- Ali lahko izračun pove, da je glazura varna za stik z živili? Kaj lahko?

## Načrti ploščic za tisk {#tile-maps}

### Triaksialni načrt: 42 glazur

Dva trikotnika po 21 ploščic, iz postavitve strani Testne serije za ploščice s 6 vrsticami: ploščica 1 na vrhu (glinenec), spodnja vrstica od krede (levo) do kremena (desno). Trikotnik II je trikotnik I z 1 g rdečega železovega oksida povrh vsakih 100 g, ki se v redukciji obrne proti celadonu (青磁). Žgano v oksidaciji in v redukciji je to 84 ploščic. Količine so grami na 100 g.

Table: Triaksialni načrt: 福島長石, kreda in kremen, z 10 kaolina v vsaki ploščici
Label: Triaksialni načrt

| Ploščica (I) | Ploščica (II) | 福島長石 | Kreda | Kremen | Kaolin | I oks. | I red. | II oks. | II red. |
| ------------ | ------------- | -------: | ----: | -----: | -----: | ------ | ------ | ------- | ------- |
| 1            | 22            |       90 |     0 |      0 |     10 |        |        |         |         |
| 2            | 23            |       72 |    18 |      0 |     10 |        |        |         |         |
| 3            | 24            |       72 |     0 |     18 |     10 |        |        |         |         |
| 4            | 25            |       54 |    36 |      0 |     10 |        |        |         |         |
| 5            | 26            |       54 |    18 |     18 |     10 |        |        |         |         |
| 6            | 27            |       54 |     0 |     36 |     10 |        |        |         |         |
| 7            | 28            |       36 |    54 |      0 |     10 |        |        |         |         |
| 8            | 29            |       36 |    36 |     18 |     10 |        |        |         |         |
| 9            | 30            |       36 |    18 |     36 |     10 |        |        |         |         |
| 10           | 31            |       36 |     0 |     54 |     10 |        |        |         |         |
| 11           | 32            |       18 |    72 |      0 |     10 |        |        |         |         |
| 12           | 33            |       18 |    54 |     18 |     10 |        |        |         |         |
| 13           | 34            |       18 |    36 |     36 |     10 |        |        |         |         |
| 14           | 35            |       18 |    18 |     54 |     10 |        |        |         |         |
| 15           | 36            |       18 |     0 |     72 |     10 |        |        |         |         |
| 16           | 37            |        0 |    90 |      0 |     10 |        |        |         |         |
| 17           | 38            |        0 |    72 |     18 |     10 |        |        |         |         |
| 18           | 39            |        0 |    54 |     36 |     10 |        |        |         |         |
| 19           | 40            |        0 |    36 |     54 |     10 |        |        |         |         |
| 20           | 41            |        0 |    18 |     72 |     10 |        |        |         |         |
| 21           | 42            |        0 |     0 |     90 |     10 |        |        |         |         |

### Segerjeva mreža: 24 glazur

Vsaka ploščica ima ista talila, 0,2 KNaO in 0,8 CaO, iz 福島長石 in krede. Glinica narašča v mreži od vrstice do vrstice navzdol, kremenica pa narašča od stolpca do stolpca v desno. Recepti so bili izračunani po metodi 5. srečanja; Segerjeva formula vsakega, ki jo izračuna Glazecalc, se od njegove glinice razlikuje za največ 0,01 in od njegove kremenice za največ 0,06. Vsako ploščico označite na diagramu kremenice proti glinici in narišite svoja območja: mat, sijajno, premalo žgano, odtekanje.

Table: Segerjeva mreža: 0,2 KNaO, 0,8 CaO, masni odstotki
Label: Segerjeva mreža

| Ploščica | Al₂O₃ | SiO₂ | 福島長石 | Kreda | Kaolin | Kremen | Oksidacija | Redukcija |
| -------- | ----: | ---: | -------: | ----: | -----: | -----: | ---------- | --------- |
| 1        |  0,25 |  2,0 |     46,9 |  32,5 |    3,5 |   17,1 |            |           |
| 2        |  0,25 |  2,5 |     41,8 |  28,9 |    3,1 |   26,2 |            |           |
| 3        |  0,25 |  3,0 |     37,6 |  26,1 |    2,8 |   33,5 |            |           |
| 4        |  0,25 |  3,5 |     34,3 |  23,7 |    2,5 |   39,5 |            |           |
| 5        |  0,25 |  4,0 |     31,4 |  21,7 |    2,3 |   44,5 |            |           |
| 6        |  0,25 |  4,5 |     29,0 |  20,1 |    2,2 |   48,7 |            |           |
| 7        |  0,35 |  2,0 |     44,3 |  30,6 |   13,9 |   11,3 |            |           |
| 8        |  0,35 |  2,5 |     39,6 |  27,4 |   12,4 |   20,5 |            |           |
| 9        |  0,35 |  3,0 |     35,9 |  24,8 |   11,2 |   28,0 |            |           |
| 10       |  0,35 |  3,5 |     32,8 |  22,7 |   10,3 |   34,2 |            |           |
| 11       |  0,35 |  4,0 |     30,2 |  20,9 |    9,5 |   39,5 |            |           |
| 12       |  0,35 |  4,5 |     28,0 |  19,4 |    8,8 |   43,9 |            |           |
| 13       |  0,45 |  2,0 |     41,9 |  29,0 |   23,1 |    6,1 |            |           |
| 14       |  0,45 |  2,5 |     37,7 |  26,1 |   20,8 |   15,4 |            |           |
| 15       |  0,45 |  3,0 |     34,3 |  23,7 |   18,9 |   23,0 |            |           |
| 16       |  0,45 |  3,5 |     31,5 |  21,8 |   17,4 |   29,4 |            |           |
| 17       |  0,45 |  4,0 |     29,1 |  20,1 |   16,0 |   34,8 |            |           |
| 18       |  0,45 |  4,5 |     27,0 |  18,7 |   14,9 |   39,4 |            |           |
| 19       |  0,55 |  2,0 |     39,7 |  27,5 |   31,4 |    1,5 |            |           |
| 20       |  0,55 |  2,5 |     35,9 |  24,9 |   28,4 |   10,8 |            |           |
| 21       |  0,55 |  3,0 |     32,8 |  22,7 |   26,0 |   18,5 |            |           |
| 22       |  0,55 |  3,5 |     30,2 |  20,9 |   23,9 |   25,0 |            |           |
| 23       |  0,55 |  4,0 |     28,0 |  19,4 |   22,1 |   30,5 |            |           |
| 24       |  0,55 |  4,5 |     26,1 |  18,1 |   20,6 |   35,3 |            |           |

Funkcija Testne serije za ploščice v aplikaciji Glazecalc naredi trikotnike in kvadrate s 3 do 66 ploščicami, te mreže pa ne; vsako ploščico odprite kot recept na [strani recepta](/recipe) in od tam natisnite seznam za tehtanje.

## Viri {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): šest srečanj.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: datumi in teme srečanj.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: naloge nadaljevalnega tečaja, 42, 90 in 78 glazur v oksidaciji in v redukciji.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): lasten program centra za izračun glazur.
- Bilecik Şeyh Edebali University, [podatki o predmetu SCT305](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Segerjeva formula v tednih 5, 6 in 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): izračun glazur za šolske učitelje na Tajvanu.
- Glendale Community College, ART 195, povzetek predmeta: Segerjeva formula v tednih 5 do 7 od 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analiza 福島長石 v knjižnici aplikacije Glazecalc.
- IUPAC, standardne atomske mase, kot jih uporablja kemija v aplikaciji Glazecalc.
