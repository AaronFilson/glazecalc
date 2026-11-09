---
title: Glasuurberekening onderrig
lead: 6 sessies vir 'n klas of studiegroep, van grondstowwe en triaksiale teëls tot die Seger-formule (UMF) in albei rigtings uitgewerk en glasuurfoute, elk met 'n uitgewerkte voorbeeld, die stappe in Glazecalc, 'n werkblad om te druk en vrae om te toets.
---

## Oor hierdie pakket {#about}

Hierdie pakket is vir enigiemand wat glasuurberekening onderrig: 'n skool, 'n ateljeeklas, 'n studiegroep van werkende pottebakkers, of 'n pottebakker wat alleen leer. Dit het ses sessies, en elkeen het sy doelwitte, wat om voor te berei, 'n uitgewerkte voorbeeld met regte grondstowwe, hoe om dit in Glazecalc te doen, 'n werkblad en vrae om te toets.

Die volgorde van die sessies volg 'n gepubliseerde studiegroep: die 陶磁器釉薬技術研究会 (keramiekglasuur-studiegroep) van die Ibaraki Prefectural Industrial Technology Center in Japan, wat in 2015 ses sessies vir 12 jong pottebakkers aangebied en in sy navorsingsverslag daaroor verslag gedoen het. Sy opvolgkursus by die Kasama-kollege vir keramiekkuns het drie teëlopdragte van 42, 90 en 78 glasuurs gestel, elk gebak in oksidasie en in reduksie. **Glazecalc is nie met die sentrum of die kollege verbonde nie.** Ons volg die volgorde van hul gepubliseerde uiteensetting, en voer dit hieronder aan; die teks, voorbeelde en werkblaaie hier is ons eie. Kursusse in ander lande leer dieselfde stappe in byna dieselfde volgorde: Bilecik Şeyh Edebali University se SCT305 in Turkye, Glendale Community College se ART 195 in die VSA, die Rynland-Palts-leerplan vir keramiekskole in Duitsland, en 李堅萍 se 2006-artikel vir onderwysers in Taiwan.

Table: Die ses sessies
Label: Die ses sessies

| Sessie | Onderwerp                                         | In Glazecalc                         |
| ------ | ------------------------------------------------- | ------------------------------------ |
| 1      | Grondstowwe, wat hulle doen, triaksiale teëls     | Grondstowwe, Mengings (triaksiaal)   |
| 2      | Die chemie: elemente, formules, mol               | 'n Grondstof se bladsy               |
| 3      | 'n Seger-formule lees, die silika-alumina-grafiek | Die resepbladsy, die Stull-grafiek   |
| 4      | Van resep tot Seger-formule                       | Hoe die Seger-formule uitgewerk word |
| 5      | Van Seger-formule tot resep                       | Los op vir 'n teiken                 |
| 6      | Die kleiliggaam en glasuurfoute                   | Perke, Vergelyk                      |

### Hoe om dit te gebruik

- Elke sessie neem ongeveer 2 uur. Sessies 4 en 5 het sakrekenaars nodig, en 'n rekenaar of foon met Glazecalc vir elke paar.
- Die uitgewerkte voorbeelde gebruik grondstowwe wat in Japan verkoop word en die syfers in Glazecalc se standaardbiblioteek: 福島長石 (Fukushima-veldspaat), kalksteen (whiting) (石灰石, kalsiumkarbonaat), 'n kaolien en silika (珪石). Gebruik jou eie verskaffer se ontleding as jy een het: voeg dit by op die [grondstowwebladsy](/material), en die getalle verander, maar nie die metode nie.
- Die bak is SK 8, {{2282 °F; 1250 °C}} nominaal. Gebruik die kegel waartoe jou klas bak; [Bak tot SK-kegels](/guides/firing#sk-cones) verduidelik SK-nommers.
- Om 'n werkblad of 'n teëlkaart te druk, druk hierdie bladsy vanuit die blaaier. Om resepte, mengings en notas te stoor, is 'n gratis rekening nodig.

> [!WARNING]
> Sessies 1, 3 en 6 is laboratoriumwerk: droë grondstowwe weeg en bak. Lees [Gewoontes wat die meeste saak maak](/guides/safe-mixing#habits) voordat iemand 'n grondstof weeg. Droë glasuurstof is die grootste gevaar.

## Sessie 1: Grondstowwe en triaksiale teëls {#materials}

> [!WARNING]
> Weeg droë grondstowwe saggies, maak nat skoon, en dra 'n respirator wat pas terwyl die poeiers droog is. Lees eers [Die grootste gevaar: stof](/guides/safe-mixing#the-main-hazard) en [Respirators](/guides/safe-mixing#respirators).

### Doelwitte

- Noem die drie take in 'n glasuur: glasvormer, vloeimiddel en stabiliseerder.
- Sorteer 4 algemene grondstowwe volgens die oksiede wat hulle bring.
- Stel 'n triaksiale mengsel op, en lees sy teëls as 'n kaart.

### Berei voor

- 'n Sak elk van 福島長石, kalksteen (whiting), 'n kaolien en silika, of die grondstowwe wat jou klas het.
- Die [triaksiale teëlkaart](#tile-maps) hieronder, gedruk, en 21 toetsteëls per student vir elke driehoek.
- Gebakte teëls van 'n vroeëre triaksiale mengsel, as jy dit het, om rond te gee.

### Uitgewerkte voorbeeld

Elke grondstof se ontleding, uit Glazecalc se biblioteek, gee die oksiede wat dit ná die bak agterlaat. Gloeiverlies (LOI) is wat wegbrand.

Table: Vier grondstowwe en wat hulle bring (persent volgens gewig, uit die biblioteek)
Label: Vier grondstowwe

| Grondstof            | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Sy taak                                   |
| -------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ----------------------------------------- |
| 福島長石 (veldspaat) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Vloeimiddel, met sy eie alumina en silika |
| Kalksteen (石灰石)   |    – |     – |     – |    – | 56,03 | 43,97 | Vloeimiddel (kalsium)                     |
| EPK Kaolin           | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabiliseerder: die hoofalumina           |
| Silika (珪石)        |  100 |     – |     – |    – |     – |     – | Glasvormer                                |

Veldspaat alleen smelt by SK 8 tot 'n stywe glas; kalksteen alleen smelt nie; silika alleen smelt nie. Gemeng smelt hulle baie beter as enige een van hulle. 'n Triaksiale mengsel wys waar: die teëlkaart hieronder verander die drie in stappe van ~20% (18 van 90), met 10% kaolien in elke teël.

::shops

### In Glazecalc

1. Maak elke grondstof op die [grondstowwebladsy](/material) oop, of sy openbare bladsy, soos [Fukushima Feldspar](/materials/fukushima-feldspar). Let op watter oksiede dit bring.
2. Maak drie resepte: 福島長石 90 met kaolien 10, kalksteen 90 met kaolien 10, en silika 90 met kaolien 10. Kies op [Mengings](/blends) **Triaksiaal (3 resepte)** en 6 rye: 21 teëls, dieselfde as die kaart hieronder.
3. Kies die bondel vir elke teël en **Druk** wat om te weeg. Stoor ná die bak die teëls waarvan jy hou as resepte, uit die tekening van die teëls.

### Werkblad

Table: Werkblad 1: wat elke grondstof bring
Label: Werkblad 1

| Grondstof | Oksiede wat dit bring | Glasvormer, vloeimiddel of stabiliseerder? | LOI (%) |
| --------- | --------------------- | ------------------------------------------ | ------- |
| 福島長石  |                       |                                            |         |
| Kalksteen |                       |                                            |         |
| Kaolien   |                       |                                            |         |
| Silika    |                       |                                            |         |

### Kontroleer

- Watter grondstof bring die meeste van die alumina, en hoekom het 'n glasuur dit nodig?
- Hoekom smelt die kalksteenhoek van die driehoek nie alleen nie?
- Waar op die driehoek het jou teëls die beste gesmelt, en watter hoek was dit die naaste aan?

## Sessie 2: Die chemie wat jy nodig het {#chemistry}

### Doelwitte

- Lees 'n chemiese formule: SiO₂, CaO, Al₂O₃, CaCO₃.
- Werk 'n molêre massa uit atoomgewigte uit.
- Verander gram in mol, en terug.

### Berei voor

- 'n Periodieke tabel vir elke student, en sakrekenaars.
- Die atoomgewigte in die tabel hieronder (IUPAC se standaardwaardes, soos Glazecalc dit gebruik).

### Uitgewerkte voorbeeld

Table: Atoomgewigte wat hier gebruik word (g/mol)
Label: Atoomgewigte

| Element   | Simbool | Atoomgewig |
| --------- | ------- | ---------: |
| Suurstof  | O       |     15,999 |
| Koolstof  | C       |     12,011 |
| Natrium   | Na      |      22,99 |
| Aluminium | Al      |     26,982 |
| Silikon   | Si      |     28,085 |
| Kalium    | K       |     39,098 |
| Kalsium   | Ca      |     40,078 |

'n Formule tel atome. SiO₂ is een silikon en twee suurstof, so een mol daarvan weeg 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ is 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO is 56,077 g, en kalksteen (whiting), CaCO₃, is 100,086 g; Glazecalc se biblioteek rond dit af tot 100,08.

'n **Mol** is 'n telling, soos 'n dosyn: dieselfde getal molekules, wat dit ook al is. Mol is gram ÷ molêre massa:

- 25 g silika is 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g kalksteen is 20 ÷ 100,08 = 0,200 mol. In die oond verloor dit sy koolstofdioksied (CO₂, 44,009 g/mol) en laat 0,200 mol CaO oor, wat 0,200 × 56,077 = 11,2 g weeg. Daardie verlies is sy LOI: 43,97%.

### In Glazecalc

1. Maak [Whiting](/materials/whiting) en [Silica](/materials/silica) oop: elke bladsy gee die formule en sy gewigte.
2. Kontroleer een molêre massa met die hand teen die bladsy.

### Werkblad

Table: Werkblad 2: molêre massa en mol
Label: Werkblad 2

| Oksied of grondstof | Formule | Molêre massa (g/mol) | Gram | Mol |
| ------------------- | ------- | -------------------- | ---- | --- |
| Silika              | SiO₂    |                      | 30   |     |
| Alumina             | Al₂O₃   |                      | 10   |     |
| Kalsiumoksied       | CaO     |                      | 5    |     |
| Kalksteen           | CaCO₃   |                      | 15   |     |

### Kontroleer

- Hoeveel gram weeg een mol SiO₂, en hoe word dit uitgewerk?
- Hoekom laat 20 g kalksteen minder as 20 g in die gebakte glasuur oor?
- Hoekom vergelyk ons oksiede volgens mol, nie volgens gram nie?

## Sessie 3: 'n Seger-formule lees {#reading-the-formula}

> [!WARNING]
> Om 'n glasuur te kleur beteken om kleurstowwe te weeg, waarvan sommige meer sorg verg as die basisgrondstowwe. Lees eers [Grondstowwe wat die meeste sorg verg](/guides/safe-mixing#materials).

### Doelwitte

- Lees die drie kolomme van 'n Seger-formule (ゼーゲル式): vloeimiddels, stabiliseerder, glasvormer.
- Vind 'n glasuur op 'n silika-alumina-grafiek, en weet wat die grafiek jou wel en nie kan vertel nie.
- Kleur 'n klaargemaakte glasuur in stappe, en teken dit aan.

### Berei voor

- Die Seger-formule hieronder, groot uitgeskryf.
- 'n Klaargemaakte deursigtige glasuur, en 'n kleurstof soos rooi ysteroksied (弁柄).

### Uitgewerkte voorbeeld

Die glasuur van sessie 4, 福島長石 45, kalksteen 20, kaolien 10 en silika 25, het hierdie Seger-formule (Glazecalc se syfers, afgerond):

Table: 'n Seger-formule in sy drie kolomme
Label: 'n Seger-formule

| Vloeimiddels (RO, R₂O) | Stabiliseerder (R₂O₃) | Glasvormer (RO₂) |
| ---------------------- | --------------------- | ---------------- |
| K₂O 0,18               | Al₂O₃ 0,43            | SiO₂ 3,45        |
| Na₂O 0,10              |                       |                  |
| CaO 0,72               |                       |                  |

- Die vloeimiddels tel op tot 1: dit is die reël van die formule. Elke ander getal is mol vir elke mol vloeimiddels.
- Silika tot alumina is 3,45 ÷ 0,43, ongeveer 8: 'n tipiese blink glasuur.
- Kalsium is die meeste van die vloeimiddel, soos in die meeste Japannese kalkglasuurs (石灰釉).

'n Grafiek met silika dwarsoor en alumina op plaas elke glasuur as 'n punt. Seger se toetse en Stull se grafiek van 1912 is van hierdie soort, en 'n 釉性状図 kaart 'n klas se eie gebakte teëls daarop. Glazecalc se resepbladsy teken die Stull-grafiek, en hierdie glasuur sit in sy helder gebied. Stull se gebiede kom van sy eie vloeimiddels en bak: 'n riglyn, nie 'n voorspelling nie. Die [teëlrooster](#tile-maps) hieronder laat 'n klas sy eie grafiek teken by sy eie bak.

::stull-chart

Om 'n klaargemaakte glasuur te kleur waarvan jy nie die resep ken nie, kan Glazecalc nie sy formule uitwerk nie. Voeg die kleurstof eerder bo-op die 100 by: 100 g van die droë glasuur met 1, 2 en 3 g ysteroksied, een teël elk, gebak in oksidasie en reduksie.

### In Glazecalc

1. Tik op die [resepbladsy](/recipe) die resep hierbo in en lees sy **Seger-formule** en **Stull-grafiek**.
2. Verander die silika van 25 na 35, en kyk hoe die punt na regs beweeg.
3. Maak vir 'n basis waarvan jy die resep het die kleurstof 'n byvoeging en gebruik 'n lynmengsel op [Mengings](/blends) om dit in stappe te verander.

### Werkblad

Table: Werkblad 3: 'n kleurstof in 'n klaargemaakte glasuur
Label: Werkblad 3

| Teël | Kleurstof (g per 100 g) | Oksidasie: hoe dit lyk | Reduksie: hoe dit lyk |
| ---- | ----------------------- | ---------------------- | --------------------- |
| 1    | 0                       |                        |                       |
| 2    | 1                       |                        |                       |
| 3    | 2                       |                        |                       |
| 4    | 3                       |                        |                       |

### Kontroleer

- Watter kolom van 'n Seger-formule tel op tot 1?
- Wat is hierdie glasuur se silika-tot-alumina-verhouding, en wat dui dit aan?
- Hoekom kan 'n punt in die grafiek se helder gebied steeds 'n matte teël in jou oond gee?

## Sessie 4: Van resep tot Seger-formule {#recipe-to-formula}

### Doelwitte

- Werk 'n Seger-formule met die hand uit 'n resep uit.
- Kontroleer dit teen Glazecalc se eie werkswyse.

### Berei voor

- Werkblad 4, die vier ontledings van sessie 1, en sakrekenaars.

### Uitgewerkte voorbeeld

Die resep: 福島長石 45, kalksteen 20, EPK-kaolien 10, silika 25. Neem elke hoeveelheid as gram. Vir elke grondstof gee gram × die oksied se persent ÷ 100 ÷ sy molêre massa sy mol. Die tabel gee die hoofoksiede; Glazecalc tel die spore ook (die kaolien se yster en titaan, die veldspaat se magnesium).

Table: Mol van elke oksied in die bondel (100 g)
Label: Mol in die bondel

| Grondstof | Gram |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| --------- | ---: | -----: | -----: | -----: | -----: | -----: |
| 福島長石  |   45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kalksteen |   20 |      – |      – | 0,1998 |      – |      – |
| Kaolien   |   10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Silika    |   25 |      – |      – |      – |      – | 0,4161 |
| Totaal    |  100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Die vloeimiddels tel op tot 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesia) = 0,2847 mol. Deel elke totaal daardeur:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Dit is die formule van sessie 3.

### In Glazecalc

1. Tik die resep op die [resepbladsy](/recipe) in.
2. Maak **Hoe die Seger-formule uitgewerk word** oop. Dit wys hierdie stappe met hierdie resep se getalle: gram, die mol van elke oksied in elke grondstof, die totale, en die deling deur die vloeimiddels.
3. Vergelyk elke reël met jou werkblad. Verander dan een hoeveelheid en werk net die kolom uit wat dit verander.

### Werkblad

Table: Werkblad 4: resep tot Seger-formule
Label: Werkblad 4

| Grondstof      | Gram | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| -------------- | ---- | --- | ---- | --- | ----- | ---- |
|                |      |     |      |     |       |      |
|                |      |     |      |     |       |      |
|                |      |     |      |     |       |      |
|                |      |     |      |     |       |      |
| Totaal         |      |     |      |     |       |      |
| ÷ vloeimiddels |      |     |      |     |       |      |

### Kontroleer

- Hoekom gee enige bondelgrootte dieselfde Seger-formule?
- Watter oksiede bring die kaolien, en watter daarvan maak hier die meeste saak?
- Hoekom word kalksteen se LOI uit die formule weggelaat?

## Sessie 5: Van Seger-formule tot resep {#formula-to-recipe}

### Doelwitte

- Kies grondstowwe vir 'n teikenformule, en werk uit hoeveel van elk.
- Gebruik Los op vir 'n teiken, en sê hoe naby dit kom.

### Berei voor

- Die teiken hieronder, werkblad 5, en sakrekenaars; Glazecalc met 'n rekening.

### Uitgewerkte voorbeeld

Die teiken: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ en 4,0 SiO₂. Neem die grondstowwe in hierdie volgorde, elk vir die oksied wat net dit kan bring:

1. **Die veldspaat, vir die kali en soda.** Een eenheid 福島長石 (536,8 g, die gewig wat een mol vloeimiddels bevat) bring 0,94 mol K₂O en Na₂O. Die teiken het 0,3 nodig, dus 0,3 ÷ 0,94 = 0,319 eenhede: 171,4 g. Dit bring ook 0,015 CaO, 0,328 Al₂O₃ en 1,865 SiO₂.
2. **Kalksteen, vir die res van die kalsium.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolien, vir die res van die alumina.** 0,4 − 0,328 = 0,072 mol. EPK-kaolien bevat een mol Al₂O₃ in 272,6 g, dus 19,6 g, wat ook 0,149 SiO₂ bring.
4. **Silika, vir die res.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Die bondel is 379,0 g. As persent: 福島長石 45,2, kalksteen 18,1, kaolien 5,2, silika 31,5. Die veldspaat bepaal die verhouding van kali tot soda, so die resep gee 0,195 K₂O en 0,104 Na₂O: naby die teiken, nie daarop nie.

### In Glazecalc

1. Maak [Los op vir 'n teiken](/solve) oop, kies **'n Seger-formule**, en tik die teiken in.
2. Gee dit onder **Die grondstowwe** 福島長石, kalksteen, EPK-kaolien en silika, en kies **Los op**.
3. Dit gee 福島長石 44,9, kalksteen 18,2, kaolien 5,6 en silika 31,3, en 'n tabel van hoe naby elke oksied kom. Vergelyk dit met jou handwerk: die oplosser tel elke spoor, en vind die beste passing wat die vier grondstowwe toelaat.
4. **Maak oop as 'n nuwe resep**, en kontroleer dit op die resepbladsy.

### Werkblad

Table: Werkblad 5: teiken tot resep
Label: Werkblad 5

| Stap | Grondstof | Vir watter oksied | Mol nodig | Gram | Bring ook |
| ---- | --------- | ----------------- | --------- | ---- | --------- |
| 1    |           |                   |           |      |           |
| 2    |           |                   |           |      |           |
| 3    |           |                   |           |      |           |
| 4    |           |                   |           |      |           |

### Kontroleer

- Hoekom word die veldspaat eerste uitgewerk?
- Hoekom kan hierdie vier grondstowwe nie presies 0,2 K₂O en 0,1 Na₂O gee nie?
- Wat sou jy by die grondstowwe voeg om magnesia in te bring?

## Sessie 6: Die kleiliggaam en glasuurfoute {#body-and-defects}

> [!WARNING]
> 'n Gebakte glasuur kan metale in kos en drank vrystel, en dit kan perfek lyk terwyl dit dit doen. Glasuurs met baie barium of met koper, en enige glasuur met lood, kan uitloog. Net 'n laboratorium-uitlogingstoets van die gebakte pot wys wat dit vrystel; geen berekening kan dit nie. Lees [Voedselveiligheid](/guides/glazing-basics#food-safety) en [Grondstowwe wat die meeste sorg verg](/guides/safe-mixing#materials).

### Doelwitte

- Meet 'n liggaam se krimping en waterabsorpsie.
- Noem die algemene foute, hul gewone oorsake en 'n eerste oplossing.
- Weet watter foute ware onveilig maak.

### Berei voor

- Toetsstawe van jou kleiliggaam, nat gemerk 100 mm uitmekaar, gebak en ongebak.
- Teëls met foute, as jy dit het: haarlynbarsies, kruip, speldeprikgaatjies, loop.

### Uitgewerkte voorbeeld

- **Krimping**: (gemerkte lengte − gebakte lengte) ÷ gemerkte lengte × 100. Merke 100 mm uitmekaar wat ná die bak 88 mm meet: 12% krimping.
- **Waterabsorpsie**: (gewig ná indompeling − droë gewig) ÷ droë gewig × 100. 'n Gebakte staaf van 50,0 g wat ná indompeling 50,6 g weeg: 1,2%.

Table: Foute, oorsake en 'n eerste oplossing in die Seger-formule
Label: Foute

| Fout               | Gewone oorsaak                                      | 'n Eerste oplossing om te probeer                  |
| ------------------ | --------------------------------------------------- | -------------------------------------------------- |
| Haarlynbarsies     | Die glasuur krimp meer as die liggaam               | Minder K₂O en Na₂O; meer kalsium, magnesia of boor |
| Afskilfering       | Die glasuur krimp baie minder as die liggaam        | Meer K₂O en Na₂O                                   |
| Loop               | Te min alumina, of te dik                           | Meer alumina; 'n dunner laag                       |
| Kruip              | Stowwerige biskwiet, of 'n dik laag wat gekraak het | Maak die biskwiet skoon; 'n dunner laag            |
| Speldeprikgaatjies | Gasborrel wat nie toegegroei het nie                | 'n Houtyd by die top van die bak; 'n dunner laag   |

[Glasuurpassing en foute](/guides/glazing-basics#fit-and-defects) verduidelik elkeen, met die yswatertoets vir haarlynbarsies. Moenie ware met haarlynbarsies of afskilfering vir kos of drank gebruik nie.

::food-limits

### In Glazecalc

1. Lees op die [resepbladsy](/recipe) die **Perke**-paneel vir een van jou glasuurs, en sy berekende uitsetting.
2. Kopieer die resep, ruil 'n deel van die veldspaat vir kalksteen, en vergelyk die twee: watter kant toe het die uitsetting beweeg?

### Werkblad

Table: Werkblad 6: die kleiliggaam
Label: Werkblad 6

| Staaf | Gemerkte lengte (mm) | Gebakte lengte (mm) | Krimping (%) | Droë gewig (g) | Gewig ná indompeling (g) | Absorpsie (%) |
| ----- | -------------------- | ------------------- | ------------ | -------------- | ------------------------ | ------------- |
| 1     | 100                  |                     |              |                |                          |               |
| 2     | 100                  |                     |              |                |                          |               |

### Kontroleer

- Watter fout kom van 'n glasuur wat meer as sy liggaam krimp, en wat is 'n eerste oplossing?
- Hoekom moet ware met afskilfering nooit vir kos gebruik word nie?
- Kan 'n berekening jou vertel dat 'n glasuur voedselveilig is? Wat kan?

## Teëlkaarte om te druk {#tile-maps}

### Triaksiale kaart: 42 glasuurs

Twee driehoeke van 21 teëls, uit Mengings se uitleg met 6 rye: teël 1 bo-aan (veldspaat), die onderste ry van kalksteen (links) tot silika (regs). Driehoek II is driehoek I met 1 g rooi ysteroksied bo-op elke 100 g, wat in reduksie na seladon (青磁) neig. Gebak in oksidasie en reduksie is dit 84 teëls. Hoeveelhede is gram per 100 g.

Table: Triaksiale kaart: 福島長石, kalksteen en silika, met 10 kaolien in elke teël
Label: Triaksiale kaart

| Teël (I) | Teël (II) | 福島長石 | Kalksteen | Silika | Kaolien | I oks | I red | II oks | II red |
| -------- | --------- | -------: | --------: | -----: | ------: | ----- | ----- | ------ | ------ |
| 1        | 22        |       90 |         0 |      0 |      10 |       |       |        |        |
| 2        | 23        |       72 |        18 |      0 |      10 |       |       |        |        |
| 3        | 24        |       72 |         0 |     18 |      10 |       |       |        |        |
| 4        | 25        |       54 |        36 |      0 |      10 |       |       |        |        |
| 5        | 26        |       54 |        18 |     18 |      10 |       |       |        |        |
| 6        | 27        |       54 |         0 |     36 |      10 |       |       |        |        |
| 7        | 28        |       36 |        54 |      0 |      10 |       |       |        |        |
| 8        | 29        |       36 |        36 |     18 |      10 |       |       |        |        |
| 9        | 30        |       36 |        18 |     36 |      10 |       |       |        |        |
| 10       | 31        |       36 |         0 |     54 |      10 |       |       |        |        |
| 11       | 32        |       18 |        72 |      0 |      10 |       |       |        |        |
| 12       | 33        |       18 |        54 |     18 |      10 |       |       |        |        |
| 13       | 34        |       18 |        36 |     36 |      10 |       |       |        |        |
| 14       | 35        |       18 |        18 |     54 |      10 |       |       |        |        |
| 15       | 36        |       18 |         0 |     72 |      10 |       |       |        |        |
| 16       | 37        |        0 |        90 |      0 |      10 |       |       |        |        |
| 17       | 38        |        0 |        72 |     18 |      10 |       |       |        |        |
| 18       | 39        |        0 |        54 |     36 |      10 |       |       |        |        |
| 19       | 40        |        0 |        36 |     54 |      10 |       |       |        |        |
| 20       | 41        |        0 |        18 |     72 |      10 |       |       |        |        |
| 21       | 42        |        0 |         0 |     90 |      10 |       |       |        |        |

### Seger-rooster: 24 glasuurs

Elke teël het dieselfde vloeimiddels, 0,2 KNaO en 0,8 CaO, van 福島長石 en kalksteen. Alumina neem toe teen die rye van die rooster af, en silika neem toe dwarsoor die kolomme. Die resepte is uitgewerk volgens die metode van sessie 5; Glazecalc se Seger-formule van elkeen kom binne 0,01 van sy alumina en 0,06 van sy silika. Merk elke teël op 'n grafiek van silika teen alumina, en teken jou eie gebiede: mat, blink, onderbak, loop.

Table: Seger-rooster: 0,2 KNaO, 0,8 CaO, persent volgens gewig
Label: Seger-rooster

| Teël | Al₂O₃ | SiO₂ | 福島長石 | Kalksteen | Kaolien | Silika | Oksidasie | Reduksie |
| ---- | ----: | ---: | -------: | --------: | ------: | -----: | --------- | -------- |
| 1    |  0,25 |  2,0 |     46,9 |      32,5 |     3,5 |   17,1 |           |          |
| 2    |  0,25 |  2,5 |     41,8 |      28,9 |     3,1 |   26,2 |           |          |
| 3    |  0,25 |  3,0 |     37,6 |      26,1 |     2,8 |   33,5 |           |          |
| 4    |  0,25 |  3,5 |     34,3 |      23,7 |     2,5 |   39,5 |           |          |
| 5    |  0,25 |  4,0 |     31,4 |      21,7 |     2,3 |   44,5 |           |          |
| 6    |  0,25 |  4,5 |     29,0 |      20,1 |     2,2 |   48,7 |           |          |
| 7    |  0,35 |  2,0 |     44,3 |      30,6 |    13,9 |   11,3 |           |          |
| 8    |  0,35 |  2,5 |     39,6 |      27,4 |    12,4 |   20,5 |           |          |
| 9    |  0,35 |  3,0 |     35,9 |      24,8 |    11,2 |   28,0 |           |          |
| 10   |  0,35 |  3,5 |     32,8 |      22,7 |    10,3 |   34,2 |           |          |
| 11   |  0,35 |  4,0 |     30,2 |      20,9 |     9,5 |   39,5 |           |          |
| 12   |  0,35 |  4,5 |     28,0 |      19,4 |     8,8 |   43,9 |           |          |
| 13   |  0,45 |  2,0 |     41,9 |      29,0 |    23,1 |    6,1 |           |          |
| 14   |  0,45 |  2,5 |     37,7 |      26,1 |    20,8 |   15,4 |           |          |
| 15   |  0,45 |  3,0 |     34,3 |      23,7 |    18,9 |   23,0 |           |          |
| 16   |  0,45 |  3,5 |     31,5 |      21,8 |    17,4 |   29,4 |           |          |
| 17   |  0,45 |  4,0 |     29,1 |      20,1 |    16,0 |   34,8 |           |          |
| 18   |  0,45 |  4,5 |     27,0 |      18,7 |    14,9 |   39,4 |           |          |
| 19   |  0,55 |  2,0 |     39,7 |      27,5 |    31,4 |    1,5 |           |          |
| 20   |  0,55 |  2,5 |     35,9 |      24,9 |    28,4 |   10,8 |           |          |
| 21   |  0,55 |  3,0 |     32,8 |      22,7 |    26,0 |   18,5 |           |          |
| 22   |  0,55 |  3,5 |     30,2 |      20,9 |    23,9 |   25,0 |           |          |
| 23   |  0,55 |  4,0 |     28,0 |      19,4 |    22,1 |   30,5 |           |          |
| 24   |  0,55 |  4,5 |     26,1 |      18,1 |    20,6 |   35,3 |           |          |

Glazecalc se Mengings maak driehoeke en vierkante van 3 tot 66 teëls, nie hierdie rooster nie; maak enige teël as 'n resep oop op die [resepbladsy](/recipe) en druk sy bondellys van daar af.

## Bronne {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): die ses sessies.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: die sessies se datums en onderwerpe.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: die opvolgkursus se opdragte van 42, 90 en 78 glasuurs in oksidasie en reduksie.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): die sentrum se eie berekeningsprogram.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): die Seger-formule in weke 5, 6 en 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): glasuurberekening vir skoolonderwysers in Taiwan.
- Glendale Community College, ART 195 course outline: die Seger-formule in weke 5 tot 7 van 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: die ontleding van 福島長石 in Glazecalc se biblioteek.
- IUPAC, standard atomic weights, soos Glazecalc se chemie dit gebruik.
