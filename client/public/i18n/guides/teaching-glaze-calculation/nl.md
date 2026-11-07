---
title: Glazuurberekening onderwijzen
lead: 6 lessen voor een klas of studiegroep, van grondstoffen en driehoeksmengingen tot de Segerformule in beide richtingen uitgewerkt en glazuurfouten, elk met een uitgewerkt voorbeeld, de stappen in Glazecalc, een werkblad om af te drukken en vragen om te controleren.
---

## Over dit pakket {#about}

Dit pakket is voor iedereen die glazuurberekening onderwijst: een school, een atelierles, een studiegroep van werkende pottenbakkers of een pottenbakker die alleen leert. Het bevat zes lessen, en elke les heeft doelen, wat u moet voorbereiden, een uitgewerkt voorbeeld met echte grondstoffen, hoe u het in Glazecalc doet, een werkblad en vragen om te controleren.

De volgorde van de lessen volgt een gepubliceerde studiegroep: de 陶磁器釉薬技術研究会 (studiegroep voor keramische glazuurtechniek) van het Industrieel Technologiecentrum van de prefectuur Ibaraki in Japan, die in 2015 zes bijeenkomsten hield voor 12 jonge pottenbakkers en daarvan verslag deed in zijn onderzoeksrapport. De vervolgcursus aan de keramiekschool in Kasama gaf drie opdrachten met proefplaatjes van 42, 90 en 78 glazuren, elk gestookt in oxidatie en in reductie. **Glazecalc heeft geen verband met het centrum of de school.** We volgen de volgorde van hun gepubliceerde overzicht en vermelden die hieronder; de tekst, de voorbeelden en de werkbladen hier zijn van ons. Cursussen in andere landen leren dezelfde stappen in bijna dezelfde volgorde: SCT305 van Bilecik Şeyh Edebali University in Turkije, ART 195 van Glendale Community College in de Verenigde Staten, het leerplan van Rijnland-Palts voor keramiekscholen in Duitsland en het artikel uit 2006 van 李堅萍 voor leraren in Taiwan.

Table: De zes lessen
Label: De zes lessen

| Les | Onderwerp                                                        | In Glazecalc                        |
| --- | ---------------------------------------------------------------- | ----------------------------------- |
| 1   | Grondstoffen, wat ze doen, driehoeksmengingen                    | Grondstoffen, Mengingen (triaxiaal) |
| 2   | De chemie: elementen, formules, mol                              | De pagina van een grondstof         |
| 3   | Een Segerformule lezen, het diagram siliciumoxide–aluminiumoxide | De receptpagina, het Stull-diagram  |
| 4   | Van recept naar Segerformule                                     | Hoe de Segerformule wordt berekend  |
| 5   | Van Segerformule naar recept                                     | Oplossen voor een doel              |
| 6   | De kleimassa en glazuurfouten                                    | Limieten, Vergelijken               |

### Zo gebruikt u het

- Elke les duurt ongeveer 2 uur. Voor les 4 en 5 hebt u rekenmachines nodig, en per twee personen een computer of telefoon met Glazecalc.
- De uitgewerkte voorbeelden gebruiken grondstoffen die in Japan worden verkocht en de cijfers uit de standaardbibliotheek van Glazecalc: 福島長石 (Fukushima-veldspaat), krijt (石灰石, calciumcarbonaat), een kaolien en kwarts (珪石). Gebruik de analyse van uw eigen leverancier als u die hebt: voeg die toe op de [pagina Grondstoffen](/material), dan veranderen de getallen, maar niet de methode.
- Er wordt gestookt tot SK 8, nominaal {{2282 °F; 1250 °C}}. Gebruik de kegel waartoe uw klas stookt; [Stoken op SK-kegels](/guides/firing#sk-cones) legt SK-nummers uit.
- Om een werkblad of een plaatjeskaart af te drukken, drukt u deze pagina af vanuit de browser. Voor het opslaan van recepten, mengingen en notities is een gratis account nodig.

> [!WARNING]
> Les 1, 3 en 6 zijn practicum: droge grondstoffen afwegen en stoken. Lees [De belangrijkste gewoonten](/guides/safe-mixing#habits) voordat iemand een grondstof afweegt. Droog glazuurstof is het grootste gevaar.

## Les 1: Grondstoffen en driehoeksmengingen {#materials}

> [!WARNING]
> Weeg droge grondstoffen voorzichtig af, maak nat schoon en draag een goed sluitend adembeschermingsmasker zolang de poeders droog zijn. Lees eerst [Het grootste gevaar: stof](/guides/safe-mixing#the-main-hazard) en [Adembescherming](/guides/safe-mixing#respirators).

### Doelen

- Benoem de drie taken in een glazuur: glasvormer{{en: glass former}}, smeltmiddel{{en: flux}} en stabilisator{{en: stabilizer}}.
- Sorteer 4 gangbare grondstoffen naar de oxiden die ze inbrengen.
- Stel een triaxiale menging in en lees de proefplaatjes als een kaart.

### Voorbereiden

- Van elk een zak 福島長石, krijt{{en: whiting}}, een kaolien en kwarts, of de grondstoffen die uw klas heeft.
- De [kaart van de driehoeksmenging](#tile-maps) hieronder, afgedrukt, en 21 proefplaatjes per student voor elke driehoek.
- Gebakken plaatjes van een eerdere driehoeksmenging, als u die hebt, om rond te laten gaan.

### Uitgewerkt voorbeeld

De analyse van elke grondstof, uit de bibliotheek van Glazecalc, geeft de oxiden die er na het stoken van overblijven. Het gloeiverlies{{en: loss on ignition}} (LOI) is wat wegbrandt.

Table: Vier grondstoffen en wat ze inbrengen (gewichtsprocent, uit de bibliotheek)
Label: Vier grondstoffen

| Grondstof            | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Taak                                                   |
| -------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ------------------------------------------------------ |
| 福島長石 (veldspaat) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Smeltmiddel, met eigen aluminiumoxide en siliciumoxide |
| Krijt (石灰石)       |    – |     – |     – |    – | 56,03 | 43,97 | Smeltmiddel (calcium)                                  |
| EPK Kaolin           | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilisator: het belangrijkste aluminiumoxide         |
| Kwarts (珪石)        |  100 |     – |     – |    – |     – |     – | Glasvormer                                             |

Veldspaat alleen smelt bij SK 8 tot een taai glas; krijt alleen smelt niet; kwarts alleen smelt niet. Gemengd smelten ze veel beter dan elk afzonderlijk. Een driehoeksmenging laat zien waar: de kaart hieronder zet de drie in stappen van ~20% (18 van 90), met 10% kaolien in elk plaatje.

::shops

### In Glazecalc

1. Open elke grondstof op de [pagina Grondstoffen](/material), of de openbare pagina ervan, zoals [Fukushima-veldspaat](/materials/fukushima-feldspar). Noteer welke oxiden ze inbrengt.
2. Maak drie recepten: 福島長石 90 met kaolien 10, krijt 90 met kaolien 10 en kwarts 90 met kaolien 10. Kies bij [Mengingen voor proefplaatjes](/blends) **Triaxiaal (3 recepten)** en 6 rijen: 21 plaatjes, net als de kaart hieronder.
3. Kies de hoeveelheid voor elk plaatje en kies **Afdrukken** voor wat u moet afwegen. Sla na het stoken de plaatjes die u mooi vindt op als recepten, vanuit de tekening van de plaatjes.

### Werkblad

Table: Werkblad 1: wat elke grondstof inbrengt
Label: Werkblad 1

| Grondstof | Oxiden die ze inbrengt | Glasvormer, smeltmiddel of stabilisator? | LOI (%) |
| --------- | ---------------------- | ---------------------------------------- | ------- |
| 福島長石  |                        |                                          |         |
| Krijt     |                        |                                          |         |
| Kaolien   |                        |                                          |         |
| Kwarts    |                        |                                          |         |

### Controleren

- Welke grondstof brengt het meeste aluminiumoxide in, en waarom heeft een glazuur dat nodig?
- Waarom smelt de krijthoek van de driehoek niet op zichzelf?
- Waar op de driehoek smolten uw plaatjes het best, en welke hoek was daar het dichtst bij?

## Les 2: De chemie die u nodig hebt {#chemistry}

### Doelen

- Lees een scheikundige formule: SiO₂, CaO, Al₂O₃, CaCO₃.
- Bereken een molmassa uit atoomgewichten.
- Reken gram om in mol, en terug.

### Voorbereiden

- Een periodiek systeem voor elke student, en rekenmachines.
- De atoomgewichten in de tabel hieronder (de standaardwaarden van IUPAC, zoals Glazecalc ze gebruikt).

### Uitgewerkt voorbeeld

Table: Atoomgewichten die hier worden gebruikt (g/mol)
Label: Atoomgewichten

| Element   | Symbool | Atoomgewicht |
| --------- | ------- | -----------: |
| Zuurstof  | O       |       15,999 |
| Koolstof  | C       |       12,011 |
| Natrium   | Na      |        22,99 |
| Aluminium | Al      |       26,982 |
| Silicium  | Si      |       28,085 |
| Kalium    | K       |       39,098 |
| Calcium   | Ca      |       40,078 |

Een formule telt atomen. SiO₂ is één silicium en twee zuurstof, dus één mol ervan weegt 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ is 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO is 56,077 g, en krijt, CaCO₃, is 100,086 g; de bibliotheek van Glazecalc rondt dat af op 100,08.

Een **mol** is een aantal, zoals een dozijn: evenveel moleculen, welke het ook zijn. Mol is gram ÷ molmassa:

- 25 g kwarts is 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g krijt is 20 ÷ 100,08 = 0,200 mol. In de oven verliest het zijn koolstofdioxide (CO₂, 44,009 g/mol) en blijft er 0,200 mol CaO over, die 0,200 × 56,077 = 11,2 g weegt. Dat verlies is het gloeiverlies: 43,97%.

### In Glazecalc

1. Open [Krijt](/materials/whiting) en [Kwarts](/materials/silica): elke pagina geeft de formule en de gewichten.
2. Reken één molmassa met de hand na en vergelijk die met de pagina.

### Werkblad

Table: Werkblad 2: molmassa en mol
Label: Werkblad 2

| Oxide of grondstof | Formule | Molmassa (g/mol) | Gram | Mol |
| ------------------ | ------- | ---------------- | ---- | --- |
| Siliciumoxide      | SiO₂    |                  | 30   |     |
| Aluminiumoxide     | Al₂O₃   |                  | 10   |     |
| Calciumoxide       | CaO     |                  | 5    |     |
| Krijt              | CaCO₃   |                  | 15   |     |

### Controleren

- Hoeveel gram weegt één mol SiO₂, en hoe wordt dat berekend?
- Waarom blijft er van 20 g krijt minder dan 20 g over in het gebakken glazuur?
- Waarom vergelijken we oxiden in mol en niet in gram?

## Les 3: Een Segerformule lezen {#reading-the-formula}

> [!WARNING]
> Een glazuur kleuren betekent kleurstoffen afwegen, en sommige daarvan vragen meer zorg dan de basisgrondstoffen. Lees eerst [Grondstoffen die de meeste zorg vragen](/guides/safe-mixing#materials).

### Doelen

- Lees de drie kolommen van een Segerformule{{en: unity molecular formula}} (UMF; in het Japans ゼーゲル式): smeltmiddelen, stabilisator, glasvormer.
- Zoek een glazuur op een diagram van siliciumoxide en aluminiumoxide, en weet wat het diagram wel en niet kan zeggen.
- Kleur een kant-en-klaar glazuur in stappen en leg het vast.

### Voorbereiden

- De Segerformule hieronder, groot opgeschreven.
- Een kant-en-klaar transparant glazuur en een kleurstof zoals ijzeroxide rood{{en: red iron oxide}} (弁柄).

### Uitgewerkt voorbeeld

Het glazuur van les 4, 福島長石 45, krijt 20, kaolien 10 en kwarts 25, heeft deze Segerformule (cijfers van Glazecalc, afgerond):

Table: Een Segerformule in zijn drie kolommen
Label: Een Segerformule

| Smeltmiddelen (RO, R₂O) | Stabilisator (R₂O₃) | Glasvormer (RO₂) |
| ----------------------- | ------------------- | ---------------- |
| K₂O 0,18                | Al₂O₃ 0,43          | SiO₂ 3,45        |
| Na₂O 0,10               |                     |                  |
| CaO 0,72                |                     |                  |

- De smeltmiddelen tellen samen op tot 1: dat is de regel van de formule. Elk ander getal is mol per mol smeltmiddelen.
- Siliciumoxide tot aluminiumoxide is 3,45 ÷ 0,43, ongeveer 8: een typisch glanzend glazuur.
- Calcium vormt het grootste deel van het smeltmiddel, zoals in de meeste Japanse kalkglazuren (石灰釉).

Een diagram met siliciumoxide horizontaal en aluminiumoxide verticaal zet elk glazuur uit als een punt. De proeven van Seger en het diagram van Stull uit 1912 zijn van dit soort, en een 釉性状図 zet de eigen gebakken plaatjes van een klas erop. De receptpagina van Glazecalc tekent het Stull-diagram, en dit glazuur ligt in het glanzende gebied. De gebieden van Stull komen van zijn eigen smeltmiddelen en zijn eigen stook: een richtlijn, geen voorspelling. Met het [plaatjesraster](#tile-maps) hieronder kan een klas bij de eigen stook een eigen diagram tekenen.

::stull-chart

Als u een kant-en-klaar glazuur wilt kleuren waarvan u het recept niet kent, kan Glazecalc de formule ervan niet berekenen. Voeg de kleurstof dan toe bovenop de 100: 100 g van het droge glazuur met 1, 2 en 3 g ijzeroxide, één plaatje elk, gestookt in oxidatie en reductie.

### In Glazecalc

1. Voer op de [receptpagina](/recipe) het recept hierboven in en lees de **Segerformule** en het **Stull-diagram**.
2. Verander de kwarts van 25 in 35 en zie het punt naar rechts verschuiven.
3. Voor een basisglazuur waarvan u het recept hebt, maakt u van de kleurstof een toevoeging en gebruikt u een proevenreeks bij [Mengingen voor proefplaatjes](/blends) om die in stappen te doorlopen.

### Werkblad

Table: Werkblad 3: een kleurstof in een kant-en-klaar glazuur
Label: Werkblad 3

| Plaatje | Kleurstof (g per 100 g) | Oxidatie: hoe het eruitziet | Reductie: hoe het eruitziet |
| ------- | ----------------------- | --------------------------- | --------------------------- |
| 1       | 0                       |                             |                             |
| 2       | 1                       |                             |                             |
| 3       | 2                       |                             |                             |
| 4       | 3                       |                             |                             |

### Controleren

- Welke kolom van een Segerformule telt op tot 1?
- Wat is de verhouding siliciumoxide tot aluminiumoxide van dit glazuur, en wat zegt die?
- Waarom kan een punt in het glanzende gebied van het diagram toch een mat plaatje in uw oven geven?

## Les 4: Van recept naar Segerformule {#recipe-to-formula}

### Doelen

- Bereken met de hand een Segerformule uit een recept.
- Controleer die aan de hand van de eigen berekening van Glazecalc.

### Voorbereiden

- Werkblad 4, de vier analyses uit les 1 en rekenmachines.

### Uitgewerkt voorbeeld

Het recept: 福島長石 45, krijt 20, EPK-kaolien 10, kwarts 25. Neem elke hoeveelheid als gram. Voor elke grondstof geeft gram × het percentage van het oxide ÷ 100 ÷ zijn molmassa de mol. De tabel geeft de belangrijkste oxiden; Glazecalc telt ook de sporen mee (het ijzer en titaan van de kaolien, het magnesium van de veldspaat).

Table: Mol van elk oxide in de hoeveelheid (100 g)
Label: Mol in de hoeveelheid

| Grondstof | Gram |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| --------- | ---: | -----: | -----: | -----: | -----: | -----: |
| 福島長石  |   45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Krijt     |   20 |      – |      – | 0,1998 |      – |      – |
| Kaolien   |   10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kwarts    |   25 |      – |      – |      – |      – | 0,4161 |
| Totaal    |  100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

De smeltmiddelen tellen op tot 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesia) = 0,2847 mol. Deel elk totaal erdoor:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Dat is de formule van les 3.

### In Glazecalc

1. Voer het recept in op de [receptpagina](/recipe).
2. Open **Hoe de Segerformule wordt berekend**. Het toont deze stappen met de getallen van dit recept: gram, de mol van elk oxide in elke grondstof, de totalen en de deling door de smeltmiddelen.
3. Vergelijk elke regel met uw werkblad. Verander dan één hoeveelheid en bereken alleen de kolom die daardoor verandert.

### Werkblad

Table: Werkblad 4: van recept naar Segerformule
Label: Werkblad 4

| Grondstof       | Gram | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| --------------- | ---- | --- | ---- | --- | ----- | ---- |
|                 |      |     |      |     |       |      |
|                 |      |     |      |     |       |      |
|                 |      |     |      |     |       |      |
|                 |      |     |      |     |       |      |
| Totaal          |      |     |      |     |       |      |
| ÷ smeltmiddelen |      |     |      |     |       |      |

### Controleren

- Waarom geeft elke hoeveelheid dezelfde Segerformule?
- Welke oxiden brengt de kaolien in, en welke daarvan is hier het belangrijkst?
- Waarom blijft het gloeiverlies van krijt buiten de formule?

## Les 5: Van Segerformule naar recept {#formula-to-recipe}

### Doelen

- Kies grondstoffen voor een doelformule en bereken hoeveel van elk.
- Gebruik Oplossen voor een doel en zeg hoe dichtbij het komt.

### Voorbereiden

- Het doel hieronder, werkblad 5 en rekenmachines; Glazecalc met een account.

### Uitgewerkt voorbeeld

Het doel: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ en 4,0 SiO₂. Neem de grondstoffen in deze volgorde, elk voor het oxide dat alleen die kan inbrengen:

1. **De veldspaat, voor het kalium en het natrium.** Eén eenheid 福島長石 (536,8 g, het gewicht dat één mol smeltmiddelen bevat) brengt 0,94 mol K₂O en Na₂O in. Het doel heeft 0,3 nodig, dus 0,3 ÷ 0,94 = 0,319 eenheden: 171,4 g. Het brengt ook 0,015 CaO, 0,328 Al₂O₃ en 1,865 SiO₂ in.
2. **Krijt, voor de rest van het calcium.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolien, voor de rest van het aluminiumoxide.** 0,4 − 0,328 = 0,072 mol. EPK-kaolien bevat één mol Al₂O₃ in 272,6 g, dus 19,6 g, die ook 0,149 SiO₂ inbrengt.
4. **Kwarts, voor de rest.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Samen weegt het 379,0 g. In procenten: 福島長石 45,2, krijt 18,1, kaolien 5,2, kwarts 31,5. De veldspaat bepaalt de verhouding van kalium tot natrium, dus het recept geeft 0,195 K₂O en 0,104 Na₂O: dichtbij het doel, maar er niet op.

### In Glazecalc

1. Open [Oplossen voor een doel](/solve), kies **Een Segerformule (mol, met de smeltmiddelen samen 1)** en typ het doel.
2. Geef bij **De grondstoffen** 福島長石, krijt, EPK-kaolien en kwarts, en kies **Oplossen**.
3. Het geeft 福島長石 44,9, krijt 18,2, kaolien 5,6 en kwarts 31,3, en een tabel met hoe dichtbij elk oxide komt. Vergelijk het met uw handberekening: de oplosser telt elk spoor mee en vindt de beste benadering die de vier grondstoffen toelaten.
4. Kies **Openen als nieuw recept** en controleer het op de receptpagina.

### Werkblad

Table: Werkblad 5: van doel naar recept
Label: Werkblad 5

| Stap | Grondstof | Voor welk oxide | Benodigde mol | Gram | Brengt ook in |
| ---- | --------- | --------------- | ------------- | ---- | ------------- |
| 1    |           |                 |               |      |               |
| 2    |           |                 |               |      |               |
| 3    |           |                 |               |      |               |
| 4    |           |                 |               |      |               |

### Controleren

- Waarom wordt de veldspaat als eerste berekend?
- Waarom kunnen deze vier grondstoffen niet precies 0,2 K₂O en 0,1 Na₂O geven?
- Wat zou u aan de grondstoffen toevoegen om magnesia in te brengen?

## Les 6: De kleimassa en glazuurfouten {#body-and-defects}

> [!WARNING]
> Een gebakken glazuur kan metalen afgeven aan eten en drinken, en het kan er perfect uitzien terwijl dat gebeurt. Glazuren met veel barium of met koper, en elk glazuur met lood, kunnen metalen afgeven. Alleen een migratietest{{en: leach test}} van het gebakken stuk in een laboratorium laat zien wat het afgeeft; geen enkele berekening kan dat. Lees [Voedselveiligheid](/guides/glazing-basics#food-safety) en [Grondstoffen die de meeste zorg vragen](/guides/safe-mixing#materials).

### Doelen

- Meet de krimp en de waterabsorptie van een kleimassa.
- Benoem de gangbare glazuurfouten, hun gebruikelijke oorzaken en een eerste oplossing.
- Weet welke fouten werk onveilig maken.

### Voorbereiden

- Proefstaafjes van uw kleimassa, nat 100 mm uit elkaar gemarkeerd, gebakken en ongebakken.
- Plaatjes met fouten, als u die hebt: haarscheuren, samentrekken, speldenprikken, aflopen.

### Uitgewerkt voorbeeld

- **Krimp**: (gemarkeerde lengte − lengte na het stoken) ÷ gemarkeerde lengte × 100. Merktekens 100 mm uit elkaar die na het stoken 88 mm meten: 12% krimp.
- **Waterabsorptie**: (gewicht na het weken − droog gewicht) ÷ droog gewicht × 100. Een gebakken staafje van 50,0 g dat na het weken 50,6 g weegt: 1,2%.

Table: Fouten, oorzaken en een eerste oplossing in de Segerformule
Label: Fouten

| Fout           | Gebruikelijke oorzaak                           | Een eerste oplossing om te proberen                             |
| -------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Haarscheuren   | Het glazuur krimpt meer dan de scherf           | Minder K₂O en Na₂O; meer calcium, magnesia of boor              |
| Afspringen     | Het glazuur krimpt veel minder dan de scherf    | Meer K₂O en Na₂O                                                |
| Aflopen        | Te weinig aluminiumoxide, of te dik             | Meer aluminiumoxide; een dunnere laag                           |
| Samentrekken   | Stoffig biscuit, of een dikke laag die scheurde | Maak het biscuit schoon; een dunnere laag                       |
| Speldenprikken | Gas dat niet dichtliep                          | Een houdtijd op het hoogste punt van de stook; een dunnere laag |

[Passing en glazuurfouten](/guides/glazing-basics#fit-and-defects) legt elke fout uit, met de ijswatertest voor haarscheuren. Gebruik geen werk met haarscheuren of afgesprongen glazuur voor eten of drinken.

::food-limits

### In Glazecalc

1. Lees op de [receptpagina](/recipe) het paneel **Limieten** voor een glazuur van u, en de berekende uitzetting.
2. Kopieer het recept, vervang wat veldspaat door krijt en vergelijk de twee: welke kant ging de uitzetting op?

### Werkblad

Table: Werkblad 6: de kleimassa
Label: Werkblad 6

| Staafje | Gemarkeerde lengte (mm) | Lengte na het stoken (mm) | Krimp (%) | Droog gewicht (g) | Gewicht na het weken (g) | Absorptie (%) |
| ------- | ----------------------- | ------------------------- | --------- | ----------------- | ------------------------ | ------------- |
| 1       | 100                     |                           |           |                   |                          |               |
| 2       | 100                     |                           |           |                   |                          |               |

### Controleren

- Welke fout komt van een glazuur dat meer krimpt dan de scherf, en wat is een eerste oplossing?
- Waarom mag werk met afgesprongen glazuur nooit voor eten worden gebruikt?
- Kan een berekening u vertellen dat een glazuur voedselveilig is? Wat kan dat wel?

## Plaatjeskaarten om af te drukken {#tile-maps}

### Kaart van de driehoeksmenging: 42 glazuren

Twee driehoeken van 21 plaatjes, volgens de opzet van Mengingen met 6 rijen: plaatje 1 bovenaan (veldspaat), de onderste rij van krijt (links) tot kwarts (rechts). Driehoek II is driehoek I met 1 g rood ijzeroxide bovenop elke 100 g, wat in reductie richting celadon (青磁) gaat. Gestookt in oxidatie en reductie zijn dat 84 plaatjes. De hoeveelheden zijn gram per 100 g.

Table: Kaart van de driehoeksmenging: 福島長石, krijt en kwarts, met 10 kaolien in elk plaatje
Label: Kaart van de driehoeksmenging

| Plaatje (I) | Plaatje (II) | 福島長石 | Krijt | Kwarts | Kaolien | I ox | I red | II ox | II red |
| ----------- | ------------ | -------: | ----: | -----: | ------: | ---- | ----- | ----- | ------ |
| 1           | 22           |       90 |     0 |      0 |      10 |      |       |       |        |
| 2           | 23           |       72 |    18 |      0 |      10 |      |       |       |        |
| 3           | 24           |       72 |     0 |     18 |      10 |      |       |       |        |
| 4           | 25           |       54 |    36 |      0 |      10 |      |       |       |        |
| 5           | 26           |       54 |    18 |     18 |      10 |      |       |       |        |
| 6           | 27           |       54 |     0 |     36 |      10 |      |       |       |        |
| 7           | 28           |       36 |    54 |      0 |      10 |      |       |       |        |
| 8           | 29           |       36 |    36 |     18 |      10 |      |       |       |        |
| 9           | 30           |       36 |    18 |     36 |      10 |      |       |       |        |
| 10          | 31           |       36 |     0 |     54 |      10 |      |       |       |        |
| 11          | 32           |       18 |    72 |      0 |      10 |      |       |       |        |
| 12          | 33           |       18 |    54 |     18 |      10 |      |       |       |        |
| 13          | 34           |       18 |    36 |     36 |      10 |      |       |       |        |
| 14          | 35           |       18 |    18 |     54 |      10 |      |       |       |        |
| 15          | 36           |       18 |     0 |     72 |      10 |      |       |       |        |
| 16          | 37           |        0 |    90 |      0 |      10 |      |       |       |        |
| 17          | 38           |        0 |    72 |     18 |      10 |      |       |       |        |
| 18          | 39           |        0 |    54 |     36 |      10 |      |       |       |        |
| 19          | 40           |        0 |    36 |     54 |      10 |      |       |       |        |
| 20          | 41           |        0 |    18 |     72 |      10 |      |       |       |        |
| 21          | 42           |        0 |     0 |     90 |      10 |      |       |       |        |

### Segerraster: 24 glazuren

Elk plaatje heeft dezelfde smeltmiddelen, 0,2 KNaO en 0,8 CaO, uit 福島長石 en krijt. Het aluminiumoxide neemt toe naar beneden langs de rijen, en het siliciumoxide neemt toe naar rechts langs de kolommen. De recepten zijn uitgewerkt met de methode van les 5; de Segerformule van elk, door Glazecalc berekend, wijkt voor aluminiumoxide hooguit 0,01 af en voor siliciumoxide hooguit 0,06. Zet elk plaatje uit op een diagram van siliciumoxide tegen aluminiumoxide en teken uw eigen gebieden: mat, glanzend, te laag gestookt, aflopend.

Table: Segerraster: 0,2 KNaO, 0,8 CaO, gewichtsprocent
Label: Segerraster

| Plaatje | Al₂O₃ | SiO₂ | 福島長石 | Krijt | Kaolien | Kwarts | Oxidatie | Reductie |
| ------- | ----: | ---: | -------: | ----: | ------: | -----: | -------- | -------- |
| 1       |  0,25 |  2,0 |     46,9 |  32,5 |     3,5 |   17,1 |          |          |
| 2       |  0,25 |  2,5 |     41,8 |  28,9 |     3,1 |   26,2 |          |          |
| 3       |  0,25 |  3,0 |     37,6 |  26,1 |     2,8 |   33,5 |          |          |
| 4       |  0,25 |  3,5 |     34,3 |  23,7 |     2,5 |   39,5 |          |          |
| 5       |  0,25 |  4,0 |     31,4 |  21,7 |     2,3 |   44,5 |          |          |
| 6       |  0,25 |  4,5 |     29,0 |  20,1 |     2,2 |   48,7 |          |          |
| 7       |  0,35 |  2,0 |     44,3 |  30,6 |    13,9 |   11,3 |          |          |
| 8       |  0,35 |  2,5 |     39,6 |  27,4 |    12,4 |   20,5 |          |          |
| 9       |  0,35 |  3,0 |     35,9 |  24,8 |    11,2 |   28,0 |          |          |
| 10      |  0,35 |  3,5 |     32,8 |  22,7 |    10,3 |   34,2 |          |          |
| 11      |  0,35 |  4,0 |     30,2 |  20,9 |     9,5 |   39,5 |          |          |
| 12      |  0,35 |  4,5 |     28,0 |  19,4 |     8,8 |   43,9 |          |          |
| 13      |  0,45 |  2,0 |     41,9 |  29,0 |    23,1 |    6,1 |          |          |
| 14      |  0,45 |  2,5 |     37,7 |  26,1 |    20,8 |   15,4 |          |          |
| 15      |  0,45 |  3,0 |     34,3 |  23,7 |    18,9 |   23,0 |          |          |
| 16      |  0,45 |  3,5 |     31,5 |  21,8 |    17,4 |   29,4 |          |          |
| 17      |  0,45 |  4,0 |     29,1 |  20,1 |    16,0 |   34,8 |          |          |
| 18      |  0,45 |  4,5 |     27,0 |  18,7 |    14,9 |   39,4 |          |          |
| 19      |  0,55 |  2,0 |     39,7 |  27,5 |    31,4 |    1,5 |          |          |
| 20      |  0,55 |  2,5 |     35,9 |  24,9 |    28,4 |   10,8 |          |          |
| 21      |  0,55 |  3,0 |     32,8 |  22,7 |    26,0 |   18,5 |          |          |
| 22      |  0,55 |  3,5 |     30,2 |  20,9 |    23,9 |   25,0 |          |          |
| 23      |  0,55 |  4,0 |     28,0 |  19,4 |    22,1 |   30,5 |          |          |
| 24      |  0,55 |  4,5 |     26,1 |  18,1 |    20,6 |   35,3 |          |          |

Mengingen voor proefplaatjes van Glazecalc maakt driehoeken en vierkanten van 3 tot 66 plaatjes, niet dit raster; open elk plaatje als recept op de [receptpagina](/recipe) en druk daar de afweeglijst af.

## Bronnen {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): de zes bijeenkomsten.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: de data en onderwerpen van de bijeenkomsten.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: de opdrachten van de vervolgcursus met 42, 90 en 78 glazuren in oxidatie en reductie.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): het eigen rekenprogramma van het centrum.
- Bilecik Şeyh Edebali University, [SCT305 cursusinformatie](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): de Segerformule in week 5, 6 en 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): glazuurberekening voor leraren in Taiwan.
- Glendale Community College, ART 195 cursusoverzicht: de Segerformule in week 5 tot 7 van 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: de analyse van 福島長石 in de bibliotheek van Glazecalc.
- IUPAC, standaard atoomgewichten, zoals de scheikunde van Glazecalc ze gebruikt.
