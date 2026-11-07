---
title: Undervisning i glasurberegning
lead: 6 lektioner til en klasse eller en studiegruppe, fra råvarer og triaksiale prøvebrikker til Seger-formlen (UMF) regnet begge veje og glasurfejl, hver med et gennemregnet eksempel, trinnene i Glazecalc, et arbejdsark til udskrivning og kontrolspørgsmål.
---

## Om denne pakke {#about}

Denne pakke er til alle, der underviser i glasurberegning: en skole, et værkstedshold, en studiegruppe af keramikere i arbejde eller en keramiker, der lærer det alene. Den har seks lektioner, og hver lektion har mål, forberedelse, et gennemregnet eksempel med rigtige råvarer, en gennemgang af, hvordan det gøres i Glazecalc, et arbejdsark og kontrolspørgsmål.

Rækkefølgen af lektionerne følger en offentliggjort studiegruppe: 陶磁器釉薬技術研究会 (studiegruppen for keramiske glasurer) ved Ibaraki Prefectural Industrial Technology Center i Japan, som i 2015 afholdt seks lektioner for 12 unge keramikere og beskrev dem i sin forskningsrapport. Dens opfølgende kursus ved keramikskolen i Kasama satte tre opgaver med prøvebrikker på 42, 90 og 78 glasurer, hver brændt i oxidation og i reduktion. **Glazecalc har ingen forbindelse til centret eller skolen.** Vi følger rækkefølgen i deres offentliggjorte oversigt og henviser til den nedenfor; teksten, eksemplerne og arbejdsarkene her er vores egne. Kurser i andre lande underviser i de samme trin i næsten samme rækkefølge: SCT305 ved Bilecik Şeyh Edebali University i Tyrkiet, ART 195 ved Glendale Community College i USA, læreplanen for keramikskoler i Rheinland-Pfalz i Tyskland og artiklen fra 2006 af 李堅萍 for lærere i Taiwan.

Table: De seks lektioner
Label: De seks lektioner

| Lektion | Emne                                                                  | I Glazecalc                                      |
| ------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| 1       | Råvarer, hvad de gør, triaksiale prøvebrikker                         | Råvarer, Blandinger til prøvebrikker (triaksial) |
| 2       | Kemien: grundstoffer, formler, mol                                    | En råvares side                                  |
| 3       | Aflæsning af en Seger-formel, diagrammet over silica og aluminiumoxid | Opskriftssiden, Stull-diagrammet                 |
| 4       | Fra opskrift til Seger-formel                                         | Sådan regnes Seger-formlen ud                    |
| 5       | Fra Seger-formel til opskrift                                         | Beregn mod et mål                                |
| 6       | Lermassen og glasurfejl                                               | Grænser, Sammenlign                              |

### Sådan bruges den

- Hver lektion varer cirka 2 timer. Lektion 4 og 5 kræver lommeregnere og en computer eller telefon med Glazecalc til hvert par.
- De gennemregnede eksempler bruger råvarer, der sælges i Japan, og tallene i Glazecalcs standardbibliotek: 福島長石 (Fukushima-feldspat), kridt{{en: whiting}} (石灰石, calciumkarbonat), en kaolin og kvarts (珪石). Brug analysen fra egen leverandør, hvis der er en: tilføj den på [siden Råvarer](/material), så ændres tallene, men ikke metoden.
- Brændingen er til SK 8, nominelt {{2282 °F; 1250 °C}}. Brug den kegle, klassen brænder til; [Brænding efter SK-kegler](/guides/firing#sk-cones) forklarer SK-numrene.
- Et arbejdsark eller et kort over prøvebrikker udskrives ved at udskrive denne side fra browseren. Opskrifter, blandinger og noter kan kun gemmes med en gratis konto.

> [!WARNING]
> Lektion 1, 3 og 6 er laboratoriearbejde: afvejning af tørre råvarer og brænding. Læs [De vaner, der betyder mest](/guides/safe-mixing#habits), før nogen vejer en råvare. Tørt glasurstøv er den største fare.

## Lektion 1: Råvarer og triaksiale prøvebrikker {#materials}

> [!WARNING]
> Vej tørre råvarer forsigtigt, gør rent med vand, og bær et åndedrætsværn med god pasform, så længe pulverne er tørre. Læs først [Den største fare: støv](/guides/safe-mixing#the-main-hazard) og [Åndedrætsværn](/guides/safe-mixing#respirators).

### Mål

- Navngiv glasurens tre opgaver: glasdanner, flusmiddel{{en: flux}} og stabilisator.
- Sortér 4 almindelige råvarer efter de oxider, de leverer.
- Opstil en triaksial blanding, og aflæs dens brikker som et kort.

### Forberedelse

- En sæk af hver af 福島長石, kridt, en kaolin og kvarts, eller de råvarer, klassen har.
- Det [triaksiale kort over prøvebrikker](#tile-maps) nedenfor, udskrevet, og 21 prøvebrikker pr. elev til hver trekant.
- Brændte brikker fra et tidligere triaksialt forsøg, hvis de findes, til at sende rundt.

### Gennemregnet eksempel

Hver råvares analyse fra Glazecalcs bibliotek angiver de oxider, den efterlader efter brænding. Glødetab{{en: loss on ignition}} er det, der brænder væk.

Table: Fire råvarer og det, de leverer (vægtprocent, fra biblioteket)
Label: Fire råvarer

| Råvare              | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO | Glødetab | Opgave                                              |
| ------------------- | ---: | ----: | ----: | ---: | ----: | -------: | --------------------------------------------------- |
| 福島長石 (feldspat) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |     0,18 | Flusmiddel med egen aluminiumoxid og silica         |
| Kridt (石灰石)      |    – |     – |     – |    – | 56,03 |    43,97 | Flusmiddel (calcium)                                |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |     13,9 | Stabilisator: den vigtigste kilde til aluminiumoxid |
| Kvarts (珪石)       |  100 |     – |     – |    – |     – |        – | Glasdanner                                          |

Feldspat alene smelter ved SK 8 til et sejt glas; kridt alene smelter ikke; kvarts alene smelter ikke. Blandet smelter de langt bedre end hver for sig. En triaksial blanding viser, hvor: kortet nedenfor ændrer de tre i trin på ~20 % (18 af 90), med 10 % kaolin i hver brik.

::shops

### I Glazecalc

1. Åbn hver råvare på [siden Råvarer](/material) eller dens offentlige side, for eksempel [Fukushima Feldspar](/materials/fukushima-feldspar). Notér, hvilke oxider den leverer.
2. Lav tre opskrifter: 福島長石 90 med kaolin 10, kridt 90 med kaolin 10 og kvarts 90 med kaolin 10. Vælg **Triaksial (3 opskrifter)** og 6 rækker på [Blandinger til prøvebrikker](/blends): 21 brikker, det samme som kortet nedenfor.
3. Vælg portionen til hver brik, og **Udskriv** det, der skal afvejes. Efter brændingen gemmes de brikker, der blev gode, som opskrifter ud fra tegningen af brikkerne.

### Arbejdsark

Table: Arbejdsark 1: hvad hver råvare leverer
Label: Arbejdsark 1

| Råvare   | Oxider, den leverer | Glasdanner, flusmiddel eller stabilisator? | Glødetab (%) |
| -------- | ------------------- | ------------------------------------------ | ------------ |
| 福島長石 |                     |                                            |              |
| Kridt    |                     |                                            |              |
| Kaolin   |                     |                                            |              |
| Kvarts   |                     |                                            |              |

### Kontrolspørgsmål

- Hvilken råvare leverer det meste af aluminiumoxiden, og hvorfor har en glasur brug for den?
- Hvorfor smelter kridthjørnet af trekanten ikke af sig selv?
- Hvor i trekanten smeltede brikkerne bedst, og hvilket hjørne lå det nærmest?

## Lektion 2: Den kemi, der skal bruges {#chemistry}

### Mål

- Aflæs en kemisk formel: SiO₂, CaO, Al₂O₃, CaCO₃.
- Beregn en molmasse ud fra atomvægte.
- Omregn gram til mol og tilbage.

### Forberedelse

- Et periodisk system til hver elev og lommeregnere.
- Atomvægtene i tabellen nedenfor (IUPAC’s standardværdier, som Glazecalc bruger dem).

### Gennemregnet eksempel

Table: Atomvægte, der bruges her (g/mol)
Label: Atomvægte

| Grundstof | Symbol | Atomvægt |
| --------- | ------ | -------: |
| Ilt       | O      |   15,999 |
| Kulstof   | C      |   12,011 |
| Natrium   | Na     |    22,99 |
| Aluminium | Al     |   26,982 |
| Silicium  | Si     |   28,085 |
| Kalium    | K      |   39,098 |
| Calcium   | Ca     |   40,078 |

En formel tæller atomer. SiO₂ er ét silicium og to ilt, så ét mol af det vejer 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ er 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO er 56,077 g, og kridt, CaCO₃, er 100,086 g; Glazecalcs bibliotek runder det til 100,08.

Et **mol** er et antal, som et dusin: det samme antal molekyler, uanset hvad de er. Mol er gram ÷ molmasse:

- 25 g silica er 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g kridt er 20 ÷ 100,08 = 0,200 mol. I ovnen mister det sin kuldioxid (CO₂, 44,009 g/mol) og efterlader 0,200 mol CaO, som vejer 0,200 × 56,077 = 11,2 g. Det tab er dets glødetab: 43,97 %.

### I Glazecalc

1. Åbn [Kridt](/materials/whiting) og [Kvarts](/materials/silica): hver side angiver formlen og dens vægte.
2. Kontrollér én molmasse i hånden mod siden.

### Arbejdsark

Table: Arbejdsark 2: molmasse og mol
Label: Arbejdsark 2

| Oxid eller råvare | Formel | Molmasse (g/mol) | Gram | Mol |
| ----------------- | ------ | ---------------- | ---- | --- |
| Silica            | SiO₂   |                  | 30   |     |
| Aluminiumoxid     | Al₂O₃  |                  | 10   |     |
| Calciumoxid       | CaO    |                  | 5    |     |
| Kridt             | CaCO₃  |                  | 15   |     |

### Kontrolspørgsmål

- Hvor mange gram vejer ét mol SiO₂, og hvordan regnes det ud?
- Hvorfor efterlader 20 g kridt mindre end 20 g i den brændte glasur?
- Hvorfor sammenlignes oxider i mol og ikke i gram?

## Lektion 3: Aflæsning af en Seger-formel {#reading-the-formula}

> [!WARNING]
> At farve en glasur betyder at veje farvestoffer, og nogle af dem kræver mere omhu end grundråvarerne. Læs først [Råvarer, der kræver mest omhu](/guides/safe-mixing#materials).

### Mål

- Aflæs de tre kolonner i en Seger-formel (UMF){{en: unity formula}}, på japansk ゼーゲル式: flusmidler, stabilisator, glasdanner.
- Find en glasur i et diagram over silica og aluminiumoxid, og vid, hvad diagrammet kan og ikke kan fortælle.
- Farv en færdig glasur i trin, og notér det.

### Forberedelse

- Seger-formlen nedenfor, skrevet stort op.
- En færdig transparent glasur og et farvestof som rødt jernoxid (弁柄){{en: red iron oxide}}.

### Gennemregnet eksempel

Glasuren fra lektion 4, 福島長石 45, kridt 20, kaolin 10 og kvarts 25, har denne Seger-formel (Glazecalcs tal, afrundet):

Table: En Seger-formel i sine tre kolonner
Label: En Seger-formel

| Flusmidler (RO, R₂O) | Stabilisator (R₂O₃) | Glasdanner (RO₂) |
| -------------------- | ------------------- | ---------------- |
| K₂O 0,18             | Al₂O₃ 0,43          | SiO₂ 3,45        |
| Na₂O 0,10            |                     |                  |
| CaO 0,72             |                     |                  |

- Flusmidlerne giver tilsammen 1: det er formlens regel. Hvert af de andre tal er mol pr. mol flusmiddel.
- Silica til aluminiumoxid er 3,45 ÷ 0,43, cirka 8: en typisk blank glasur.
- Calcium udgør det meste af flusmidlet, som i de fleste japanske kalkglasurer (石灰釉).

Et diagram med silica ud ad og aluminiumoxid op ad placerer hver glasur som et punkt. Segers forsøg og Stulls diagram fra 1912 er af den slags, og et 釉性状図 afsætter en klasses egne brændte brikker i det. Glazecalcs opskriftsside tegner Stull-diagrammet, og denne glasur ligger i dets blanke område. Stulls områder kommer fra hans egne flusmidler og brænding: en rettesnor, ikke en forudsigelse. [Brikkegitteret](#tile-maps) nedenfor lader en klasse tegne sit eget diagram ved sin egen brænding.

::stull-chart

Til at farve en færdig glasur, hvis opskrift er ukendt, kan Glazecalc ikke regne formlen ud. Læg i stedet farvestoffet oven i de 100: 100 g af den tørre glasur med 1, 2 og 3 g jernoxid, én brik til hver, brændt i oxidation og i reduktion.

### I Glazecalc

1. Indtast opskriften ovenfor på [opskriftssiden](/recipe), og aflæs dens **Seger-formel** og **Stull-diagram**.
2. Ændr silicaen fra 25 til 35, og se punktet flytte sig mod højre.
3. For en grundglasur, hvis opskrift er kendt, gøres farvestoffet til en tilsætning, og en prøverække på [Blandinger til prøvebrikker](/blends) bruges til at trappe det op.

### Arbejdsark

Table: Arbejdsark 3: et farvestof i en færdig glasur
Label: Arbejdsark 3

| Brik | Farvestof (g pr. 100 g) | Oxidation: hvordan den ser ud | Reduktion: hvordan den ser ud |
| ---- | ----------------------- | ----------------------------- | ----------------------------- |
| 1    | 0                       |                               |                               |
| 2    | 1                       |                               |                               |
| 3    | 2                       |                               |                               |
| 4    | 3                       |                               |                               |

### Kontrolspørgsmål

- Hvilken kolonne i en Seger-formel giver tilsammen 1?
- Hvad er denne glasurs forhold mellem silica og aluminiumoxid, og hvad antyder det?
- Hvorfor kan et punkt i diagrammets blanke område alligevel give en mat brik i den ovn, der bruges?

## Lektion 4: Fra opskrift til Seger-formel {#recipe-to-formula}

### Mål

- Regn en Seger-formel ud fra en opskrift i hånden.
- Kontrollér den mod Glazecalcs egen udregning.

### Forberedelse

- Arbejdsark 4, de fire analyser fra lektion 1 og lommeregnere.

### Gennemregnet eksempel

Opskriften: 福島長石 45, kridt 20, EPK-kaolin 10, kvarts 25. Læs hver mængde som gram. For hver råvare giver gram × oxidens procent ÷ 100 ÷ dens molmasse dens mol. Tabellen viser hovedoxiderne; Glazecalc tæller også sporstofferne med (kaolinens jern og titan, feldspatens magnesium).

Table: Mol af hvert oxid i portionen (100 g)
Label: Mol i portionen

| Råvare   | Gram |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ---: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |   45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kridt    |   20 |      – |      – | 0,1998 |      – |      – |
| Kaolin   |   10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvarts   |   25 |      – |      – |      – |      – | 0,4161 |
| I alt    |  100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Flusmidlerne giver tilsammen 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesia) = 0,2847 mol. Del hver sum med det:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Det er formlen fra lektion 3.

### I Glazecalc

1. Indtast opskriften på [opskriftssiden](/recipe).
2. Åbn **Sådan regnes Seger-formlen ud**. Den viser disse trin med denne opskrifts tal: gram, mol af hvert oxid i hver råvare, summerne og divisionen med flusmidlerne.
3. Sammenlign hver linje med arbejdsarket. Ændr derefter én mængde, og regn kun den kolonne ud, som den ændrer.

### Arbejdsark

Table: Arbejdsark 4: opskrift til Seger-formel
Label: Arbejdsark 4

| Råvare       | Gram | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------ | ---- | --- | ---- | --- | ----- | ---- |
|              |      |     |      |     |       |      |
|              |      |     |      |     |       |      |
|              |      |     |      |     |       |      |
|              |      |     |      |     |       |      |
| I alt        |      |     |      |     |       |      |
| ÷ flusmidler |      |     |      |     |       |      |

### Kontrolspørgsmål

- Hvorfor giver enhver portionsstørrelse den samme Seger-formel?
- Hvilke oxider leverer kaolinen, og hvilket af dem betyder mest her?
- Hvorfor er kridtets glødetab udeladt af formlen?

## Lektion 5: Fra Seger-formel til opskrift {#formula-to-recipe}

### Mål

- Vælg råvarer til en målformel, og regn ud, hvor meget der skal bruges af hver.
- Brug Beregn mod et mål, og sig, hvor tæt det kommer på.

### Forberedelse

- Målet nedenfor, arbejdsark 5 og lommeregnere; Glazecalc med en konto.

### Gennemregnet eksempel

Målet: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ og 4,0 SiO₂. Tag råvarerne i denne rækkefølge, hver til det oxid, som kun den kan levere:

1. **Feldspaten, til kalium og natrium.** Én enhed 福島長石 (536,8 g, den vægt, der rummer ét mol flusmidler) leverer 0,94 mol K₂O og Na₂O. Målet kræver 0,3, så 0,3 ÷ 0,94 = 0,319 enheder: 171,4 g. Den leverer også 0,015 CaO, 0,328 Al₂O₃ og 1,865 SiO₂.
2. **Kridt, til resten af calciumet.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, til resten af aluminiumoxiden.** 0,4 − 0,328 = 0,072 mol. EPK-kaolin rummer ét mol Al₂O₃ i 272,6 g, så 19,6 g, som også leverer 0,149 SiO₂.
4. **Kvarts, til resten.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Portionen er 379,0 g. Som procent: 福島長石 45,2, kridt 18,1, kaolin 5,2, kvarts 31,5. Feldspaten fastlægger forholdet mellem kalium og natrium, så opskriften giver 0,195 K₂O og 0,104 Na₂O: tæt på målet, men ikke præcis det.

### I Glazecalc

1. Åbn [Beregn mod et mål](/solve), vælg **En Seger-formel (mol, flusmidlerne giver tilsammen 1)**, og skriv målet.
2. Giv den under **Råvarerne** 福島長石, kridt, EPK-kaolin og kvarts, og vælg **Beregn**.
3. Den giver 福島長石 44,9, kridt 18,2, kaolin 5,6 og kvarts 31,3 samt en tabel over, hvor tæt hvert oxid kommer på. Sammenlign det med udregningen i hånden: løseren tæller hvert sporstof med og finder den bedste tilpasning, som de fire råvarer tillader.
4. **Åbn som ny opskrift**, og kontrollér den på opskriftssiden.

### Arbejdsark

Table: Arbejdsark 5: mål til opskrift
Label: Arbejdsark 5

| Trin | Råvare | Til hvilket oxid | Mol, der skal bruges | Gram | Leverer også |
| ---- | ------ | ---------------- | -------------------- | ---- | ------------ |
| 1    |        |                  |                      |      |              |
| 2    |        |                  |                      |      |              |
| 3    |        |                  |                      |      |              |
| 4    |        |                  |                      |      |              |

### Kontrolspørgsmål

- Hvorfor regnes feldspaten ud først?
- Hvorfor kan disse fire råvarer ikke give præcis 0,2 K₂O og 0,1 Na₂O?
- Hvilken råvare kan tilføjes for at få magnesia med?

## Lektion 6: Lermassen og glasurfejl {#body-and-defects}

> [!WARNING]
> En brændt glasur kan afgive metaller til mad og drikke, og den kan se helt perfekt ud, mens den gør det. Glasurer med meget barium eller med kobber og enhver glasur med bly kan afgive metaller. Kun en migrationstest{{en: leach test}} af den brændte pot i et laboratorium viser, hvad den afgiver; ingen beregning kan det. Læs [Fødevaresikkerhed](/guides/glazing-basics#food-safety) og [Råvarer, der kræver mest omhu](/guides/safe-mixing#materials).

### Mål

- Mål en lermasses svind og vandoptagelse.
- Navngiv de almindelige fejl, deres sædvanlige årsager og en første rettelse.
- Vid, hvilke fejl der gør gods usikkert.

### Forberedelse

- Prøvestave af lermassen, mærket med 100 mm afstand, mens den var våd, brændte og ubrændte.
- Brikker med fejl, hvis de findes: krakelering, kravling, nålestik, løb.

### Gennemregnet eksempel

- **Svind**: (mærkelængde − brændt længde) ÷ mærkelængde × 100. Mærker med 100 mm afstand, der måler 88 mm efter brænding: 12 % svind.
- **Vandoptagelse**: (vægt efter iblødsætning − tør vægt) ÷ tør vægt × 100. En brændt stav på 50,0 g, der vejer 50,6 g efter iblødsætning: 1,2 %.

Table: Fejl, årsager og en første rettelse i Seger-formlen
Label: Fejl

| Fejl        | Sædvanlig årsag                                       | En første rettelse at prøve                              |
| ----------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Krakelering | Glasuren svinder mere end skærven                     | Mindre K₂O og Na₂O; mere calcium, magnesia eller bor     |
| Afskalning  | Glasuren svinder langt mindre end skærven             | Mere K₂O og Na₂O                                         |
| Løb         | For lidt aluminiumoxid, eller for tyk                 | Mere aluminiumoxid; et tyndere lag                       |
| Kravling    | Støvet forglødet gods, eller et tykt lag, der revnede | Gør det forglødede gods rent; et tyndere lag             |
| Nålestik    | Gas, der ikke nåede at lukke sig                      | En holdetid ved toptemperaturen; et tyndere lag |

[Glasurtilpasning og glasurfejl](/guides/glazing-basics#fit-and-defects) forklarer hver enkelt, med isvandstesten for krakelering. Brug ikke krakeleret eller afskallet gods til mad eller drikke.

::food-limits

### I Glazecalc

1. Aflæs panelet **Grænser** for en af egne glasurer og dens beregnede udvidelse på [opskriftssiden](/recipe).
2. Kopiér opskriften, udskift noget feldspat med kridt, og sammenlign de to: hvilken vej flyttede udvidelsen sig?

### Arbejdsark

Table: Arbejdsark 6: lermassen
Label: Arbejdsark 6

| Stav | Mærkelængde (mm) | Brændt længde (mm) | Svind (%) | Tør vægt (g) | Vægt efter iblødsætning (g) | Vandoptagelse (%) |
| ---- | ---------------- | ------------------ | --------- | ------------ | --------------------------- | ----------------- |
| 1    | 100              |                    |           |              |                             |                   |
| 2    | 100              |                    |           |              |                             |                   |

### Kontrolspørgsmål

- Hvilken fejl kommer af en glasur, der svinder mere end skærven, og hvad er en første rettelse?
- Hvorfor må afskallet gods aldrig bruges til mad?
- Kan en beregning fortælle, at en glasur er sikker til mad? Hvad kan?

## Kort over prøvebrikker til udskrivning {#tile-maps}

### Triaksialt kort: 42 glasurer

To trekanter med 21 brikker, efter layoutet i Blandinger til prøvebrikker med 6 rækker: brik 1 øverst (feldspat), nederste række fra kridt (til venstre) til kvarts (til højre). Trekant II er trekant I med 1 g rødt jernoxid oven i hver 100 g, hvilket går i retning af seladon (青磁) i reduktion. Brændt i oxidation og i reduktion er det 84 brikker. Mængderne er gram pr. 100 g.

Table: Triaksialt kort: 福島長石, kridt og kvarts, med 10 kaolin i hver brik
Label: Triaksialt kort

| Brik (I) | Brik (II) | 福島長石 | Kridt | Kvarts | Kaolin | I oxid. | I reduk. | II oxid. | II reduk. |
| -------- | --------- | -------: | ----: | -----: | -----: | ------- | -------- | -------- | --------- |
| 1        | 22        |       90 |     0 |      0 |     10 |         |          |          |           |
| 2        | 23        |       72 |    18 |      0 |     10 |         |          |          |           |
| 3        | 24        |       72 |     0 |     18 |     10 |         |          |          |           |
| 4        | 25        |       54 |    36 |      0 |     10 |         |          |          |           |
| 5        | 26        |       54 |    18 |     18 |     10 |         |          |          |           |
| 6        | 27        |       54 |     0 |     36 |     10 |         |          |          |           |
| 7        | 28        |       36 |    54 |      0 |     10 |         |          |          |           |
| 8        | 29        |       36 |    36 |     18 |     10 |         |          |          |           |
| 9        | 30        |       36 |    18 |     36 |     10 |         |          |          |           |
| 10       | 31        |       36 |     0 |     54 |     10 |         |          |          |           |
| 11       | 32        |       18 |    72 |      0 |     10 |         |          |          |           |
| 12       | 33        |       18 |    54 |     18 |     10 |         |          |          |           |
| 13       | 34        |       18 |    36 |     36 |     10 |         |          |          |           |
| 14       | 35        |       18 |    18 |     54 |     10 |         |          |          |           |
| 15       | 36        |       18 |     0 |     72 |     10 |         |          |          |           |
| 16       | 37        |        0 |    90 |      0 |     10 |         |          |          |           |
| 17       | 38        |        0 |    72 |     18 |     10 |         |          |          |           |
| 18       | 39        |        0 |    54 |     36 |     10 |         |          |          |           |
| 19       | 40        |        0 |    36 |     54 |     10 |         |          |          |           |
| 20       | 41        |        0 |    18 |     72 |     10 |         |          |          |           |
| 21       | 42        |        0 |     0 |     90 |     10 |         |          |          |           |

### Seger-gitter: 24 glasurer

Hver brik har de samme flusmidler, 0,2 KNaO og 0,8 CaO, fra 福島長石 og kridt. Aluminiumoxiden stiger nedad i gitteret, række for række, og silicaen stiger på tværs af gitteret, kolonne for kolonne. Opskrifterne er regnet ud efter metoden fra lektion 5; Glazecalcs Seger-formel for hver af dem kommer inden for 0,01 af aluminiumoxiden og 0,06 af silicaen. Afsæt hver brik i et diagram over silica mod aluminiumoxid, og tegn egne områder: mat, blank, underbrændt, løbende.

Table: Seger-gitter: 0,2 KNaO, 0,8 CaO, vægtprocent
Label: Seger-gitter

| Brik | Al₂O₃ | SiO₂ | 福島長石 | Kridt | Kaolin | Kvarts | Oxidation | Reduktion |
| ---- | ----: | ---: | -------: | ----: | -----: | -----: | --------- | --------- |
| 1    |  0,25 |  2,0 |     46,9 |  32,5 |    3,5 |   17,1 |           |           |
| 2    |  0,25 |  2,5 |     41,8 |  28,9 |    3,1 |   26,2 |           |           |
| 3    |  0,25 |  3,0 |     37,6 |  26,1 |    2,8 |   33,5 |           |           |
| 4    |  0,25 |  3,5 |     34,3 |  23,7 |    2,5 |   39,5 |           |           |
| 5    |  0,25 |  4,0 |     31,4 |  21,7 |    2,3 |   44,5 |           |           |
| 6    |  0,25 |  4,5 |     29,0 |  20,1 |    2,2 |   48,7 |           |           |
| 7    |  0,35 |  2,0 |     44,3 |  30,6 |   13,9 |   11,3 |           |           |
| 8    |  0,35 |  2,5 |     39,6 |  27,4 |   12,4 |   20,5 |           |           |
| 9    |  0,35 |  3,0 |     35,9 |  24,8 |   11,2 |   28,0 |           |           |
| 10   |  0,35 |  3,5 |     32,8 |  22,7 |   10,3 |   34,2 |           |           |
| 11   |  0,35 |  4,0 |     30,2 |  20,9 |    9,5 |   39,5 |           |           |
| 12   |  0,35 |  4,5 |     28,0 |  19,4 |    8,8 |   43,9 |           |           |
| 13   |  0,45 |  2,0 |     41,9 |  29,0 |   23,1 |    6,1 |           |           |
| 14   |  0,45 |  2,5 |     37,7 |  26,1 |   20,8 |   15,4 |           |           |
| 15   |  0,45 |  3,0 |     34,3 |  23,7 |   18,9 |   23,0 |           |           |
| 16   |  0,45 |  3,5 |     31,5 |  21,8 |   17,4 |   29,4 |           |           |
| 17   |  0,45 |  4,0 |     29,1 |  20,1 |   16,0 |   34,8 |           |           |
| 18   |  0,45 |  4,5 |     27,0 |  18,7 |   14,9 |   39,4 |           |           |
| 19   |  0,55 |  2,0 |     39,7 |  27,5 |   31,4 |    1,5 |           |           |
| 20   |  0,55 |  2,5 |     35,9 |  24,9 |   28,4 |   10,8 |           |           |
| 21   |  0,55 |  3,0 |     32,8 |  22,7 |   26,0 |   18,5 |           |           |
| 22   |  0,55 |  3,5 |     30,2 |  20,9 |   23,9 |   25,0 |           |           |
| 23   |  0,55 |  4,0 |     28,0 |  19,4 |   22,1 |   30,5 |           |           |
| 24   |  0,55 |  4,5 |     26,1 |  18,1 |   20,6 |   35,3 |           |           |

Funktionen Blandinger til prøvebrikker i Glazecalc laver trekanter og firkanter med 3 til 66 brikker, ikke dette gitter; åbn en vilkårlig brik som opskrift på [opskriftssiden](/recipe), og udskriv dens afvejningsliste derfra.

## Kilder {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): de seks lektioner.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: lektionernes datoer og emner.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: det opfølgende kurses opgaver med 42, 90 og 78 glasurer i oxidation og reduktion.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): centrets eget beregningsprogram.
- Bilecik Şeyh Edebali University, [SCT305 kursusinformation](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Seger-formlen i uge 5, 6 og 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, s. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): glasurberegning for skolelærere i Taiwan.
- Glendale Community College, ART 195 kursusoversigt: Seger-formlen i uge 5 til 7 af 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analysen af 福島長石 i Glazecalcs bibliotek.
- IUPAC, standardatomvægte, som Glazecalcs kemi bruger dem.
