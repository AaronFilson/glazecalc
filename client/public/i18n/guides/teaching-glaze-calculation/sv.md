---
title: Undervisa i glasyrberäkning
lead: 6 träffar för en klass eller studiegrupp, från råvaror och triaxiala provbitar till Segerformeln räknad i båda riktningarna och glasyrfel, var och en med ett räkneexempel, stegen i Glazecalc, ett arbetsblad att skriva ut och kontrollfrågor.
---

## Om det här paketet {#about}

Paketet är till för alla som undervisar i glasyrberäkning: en skola, en kurs i en verkstad, en studiegrupp med yrkesverksamma keramiker eller en keramiker som lär sig på egen hand. Det innehåller sex träffar, och varje träff har mål, förberedelser, ett räkneexempel med verkliga råvaror, hur man gör i Glazecalc, ett arbetsblad och kontrollfrågor.

Träffarnas ordning följer en publicerad studiegrupp: 陶磁器釉薬技術研究会 (studiegruppen för keramiska glasyrer) vid industriteknikcentret i Ibaraki prefektur i Japan, som höll sex träffar för 12 unga keramiker 2015 och redovisade dem i sin forskningsrapport. Den påföljande kursen vid Kasamas högskola för keramisk konst gav tre provbitsuppgifter med 42, 90 och 78 glasyrer, var och en bränd i oxidation och i reduktion. **Glazecalc har ingen koppling till centret eller högskolan.** Vi följer ordningen i deras publicerade upplägg och anger det som källa nedan; texterna, exemplen och arbetsbladen här är våra egna. Kurser i andra länder lär ut samma steg i nästan samma ordning: SCT305 vid Bilecik Şeyh Edebali University i Turkiet, ART 195 vid Glendale Community College i USA, Rheinland-Pfalz läroplan för keramikskolor i Tyskland och uppsatsen från 2006 av 李堅萍 för lärare i Taiwan.

Table: De sex träffarna
Label: De sex träffarna

| Träff | Ämne                                                      | I Glazecalc                     |
| ----- | --------------------------------------------------------- | ------------------------------- |
| 1     | Råvaror, vad de gör, triaxiala provbitar                  | Råvaror, Blandningar (triaxial) |
| 2     | Kemin: grundämnen, formler, mol                           | En råvaras sida                 |
| 3     | Läsa en Segerformel, diagrammet kiseldioxid–aluminiumoxid | Receptsidan, Stull-diagrammet   |
| 4     | Från recept till Segerformel                              | Så räknas Segerformeln ut       |
| 5     | Från Segerformel till recept                              | Beräkna mot ett mål             |
| 6     | Lermassan och glasyrfel                                   | Gränser, Jämför                 |

### Så används paketet

- Varje träff tar ungefär 2 timmar. Träff 4 och 5 kräver miniräknare, och en dator eller telefon med Glazecalc för varje par.
- Räkneexemplen använder råvaror som säljs i Japan och siffrorna i Glazecalcs standardbibliotek: 福島長石 (Fukushima-fältspat), krita{{en: whiting}} (石灰石, kalciumkarbonat), en kaolin och kvarts (珪石). Använd den egna leverantörens analys om en sådan finns: lägg till den på [sidan Råvaror](/material), så ändras siffrorna men inte metoden.
- Bränningen sker till SK 8, nominellt {{2282 °F; 1250 °C}}. Använd den kägla som klassen bränner till; [Bränning efter SK-käglor](/guides/firing#sk-cones) förklarar SK-numren.
- Skriv ut sidan från webbläsaren för att få ett arbetsblad eller en provbitskarta på papper. Recept, blandningar och anteckningar kan bara sparas med ett kostnadsfritt konto.

> [!WARNING]
> Träff 1, 3 och 6 är laborationer: torra råvaror vägs upp och bränns. Läs [De viktigaste vanorna](/guides/safe-mixing#habits) innan någon väger upp en råvara. Torrt glasyrdamm är den största faran.

## Träff 1: Råvaror och triaxiala provbitar {#materials}

> [!WARNING]
> Väg upp torra råvaror försiktigt, städa vått och bär ett tillpassat andningsskydd så länge pulvren är torra. Läs först [Den största faran: damm](/guides/safe-mixing#the-main-hazard) och [Andningsskydd](/guides/safe-mixing#respirators).

### Mål

- Namnge de tre uppgifterna i en glasyr: glasbildare, flussmedel{{en: flux}} och stabilisator.
- Sortera 4 vanliga råvaror efter de oxider de tillför.
- Ställa in en triaxial blandning och läsa provbitarna som en karta.

### Förberedelser

- En påse var av 福島長石, krita, en kaolin och kvarts, eller de råvaror klassen har.
- [Provbitskartan för triaxial blandning](#tile-maps) nedan, utskriven, och 21 provbitar per elev för varje triangel.
- Brända provbitar från en tidigare triaxial blandning, om sådana finns, att skicka runt.

### Räkneexempel

Varje råvaras analys, från Glazecalcs bibliotek, anger de oxider som blir kvar efter bränningen. Glödförlust (LOI) är det som brinner bort.

Table: Fyra råvaror och vad de tillför (viktprocent, från biblioteket)
Label: Fyra råvaror

| Råvara              | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Uppgift                                            |
| ------------------- | ---: | ----: | ----: | ---: | ----: | ----: | -------------------------------------------------- |
| 福島長石 (fältspat) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Flussmedel, med egen aluminiumoxid och kiseldioxid |
| Krita (石灰石)      |    – |     – |     – |    – | 56,03 | 43,97 | Flussmedel (kalcium)                               |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilisator: den främsta aluminiumoxiden          |
| Kvarts (珪石)       |  100 |     – |     – |    – |     – |     – | Glasbildare                                        |

Fältspat ensam smälter vid SK 8 till ett trögt glas; krita ensam smälter inte; kvarts ensam smälter inte. Blandade smälter de långt bättre än någon av dem för sig. En triaxial blandning visar var: provbitskartan nedan stegar de tre i steg om ~20 % (18 av 90), med 10 % kaolin i varje provbit.

::shops

### I Glazecalc

1. Öppna varje råvara på [sidan Råvaror](/material), eller dess publika sida, till exempel [Fukushima Feldspar](/materials/fukushima-feldspar). Anteckna vilka oxider den tillför.
2. Gör tre recept: 福島長石 90 med kaolin 10, krita 90 med kaolin 10 och kvarts 90 med kaolin 10. Välj **Triaxial (3 recept)** och 6 rader på [Blandningar](/blends): 21 provbitar, lika många som på kartan nedan.
3. Välj satsen för varje provbit och **Skriv ut** vad som ska vägas. Spara efter bränningen de provbitar som blev bra som recept, från bilden av provbitarna.

### Arbetsblad

Table: Arbetsblad 1: vad varje råvara tillför
Label: Arbetsblad 1

| Råvara   | Oxider den tillför | Glasbildare, flussmedel eller stabilisator? | LOI (%) |
| -------- | ------------------ | ------------------------------------------- | ------- |
| 福島長石 |                    |                                             |         |
| Krita    |                    |                                             |         |
| Kaolin   |                    |                                             |         |
| Kvarts   |                    |                                             |         |

### Kontrollfrågor

- Vilken råvara tillför det mesta av aluminiumoxiden, och varför behöver en glasyr den?
- Varför smälter inte triangelns kritahörn av sig självt?
- Var på triangeln smälte provbitarna bäst, och vilket hörn låg närmast?

## Träff 2: Kemin som behövs {#chemistry}

### Mål

- Läsa en kemisk formel: SiO₂, CaO, Al₂O₃, CaCO₃.
- Räkna ut en molmassa utifrån atomvikter.
- Göra om gram till mol och tillbaka.

### Förberedelser

- Ett periodiskt system för varje elev, och miniräknare.
- Atomvikterna i tabellen nedan (IUPAC:s standardvärden, som Glazecalc använder).

### Räkneexempel

Table: Atomvikter som används här (g/mol)
Label: Atomvikter

| Grundämne | Symbol | Atomvikt |
| --------- | ------ | -------: |
| Syre      | O      |   15,999 |
| Kol       | C      |   12,011 |
| Natrium   | Na     |    22,99 |
| Aluminium | Al     |   26,982 |
| Kisel     | Si     |   28,085 |
| Kalium    | K      |   39,098 |
| Kalcium   | Ca     |   40,078 |

En formel räknar atomer. SiO₂ är en kisel och två syre, så en mol av den väger 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ är 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO är 56,077 g, och krita, CaCO₃, är 100,086 g; Glazecalcs bibliotek avrundar den till 100,08.

En **mol** är ett antal, som ett dussin: lika många molekyler oavsett vilka de är. Mol är gram ÷ molmassa:

- 25 g kvarts är 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g krita är 20 ÷ 100,08 = 0,200 mol. I ugnen förlorar den sin koldioxid (CO₂, 44,009 g/mol) och lämnar 0,200 mol CaO, som väger 0,200 × 56,077 = 11,2 g. Den förlusten är dess LOI: 43,97 %.

### I Glazecalc

1. Öppna [Whiting](/materials/whiting) och [Silica](/materials/silica): varje sida anger formeln och dess vikter.
2. Kontrollera en molmassa för hand mot sidan.

### Arbetsblad

Table: Arbetsblad 2: molmassa och mol
Label: Arbetsblad 2

| Oxid eller råvara | Formel | Molmassa (g/mol) | Gram | Mol |
| ----------------- | ------ | ---------------- | ---- | --- |
| Kvarts            | SiO₂   |                  | 30   |     |
| Aluminiumoxid     | Al₂O₃  |                  | 10   |     |
| Kalciumoxid       | CaO    |                  | 5    |     |
| Krita             | CaCO₃  |                  | 15   |     |

### Kontrollfrågor

- Hur många gram väger en mol SiO₂, och hur räknas det ut?
- Varför lämnar 20 g krita mindre än 20 g i den brända glasyren?
- Varför jämför vi oxider i mol och inte i gram?

## Träff 3: Läsa en Segerformel {#reading-the-formula}

> [!WARNING]
> Att färga en glasyr innebär att väga upp färgmedel, och en del av dem kräver mer försiktighet än basråvarorna. Läs först [Råvaror som kräver mest försiktighet](/guides/safe-mixing#materials).

### Mål

- Läsa de tre kolumnerna i en Segerformel (UMF){{en: unity formula}} (ゼーゲル式): flussmedel, stabilisator, glasbildare.
- Hitta en glasyr i ett diagram över kiseldioxid och aluminiumoxid, och veta vad diagrammet kan och inte kan säga.
- Färga en färdig glasyr i steg och anteckna resultatet.

### Förberedelser

- Segerformeln nedan, uppskriven stort.
- En färdig transparent glasyr och ett färgmedel som röd järnoxid{{en: red iron oxide}} (弁柄).

### Räkneexempel

Glasyren från träff 4, 福島長石 45, krita 20, kaolin 10 och kvarts 25, har denna Segerformel (Glazecalcs siffror, avrundade):

Table: En Segerformel i sina tre kolumner
Label: En Segerformel

| Flussmedel (RO, R₂O) | Stabilisator (R₂O₃) | Glasbildare (RO₂) |
| -------------------- | ------------------- | ----------------- |
| K₂O 0,18             | Al₂O₃ 0,43          | SiO₂ 3,45         |
| Na₂O 0,10            |                     |                   |
| CaO 0,72             |                     |                   |

- Flussmedlen summerar till 1: det är formelns regel. Varje annat tal anger mol per mol flussmedel.
- Förhållandet kiseldioxid till aluminiumoxid är 3,45 ÷ 0,43, ungefär 8: en typisk blank glasyr.
- Kalcium utgör största delen av flussmedlet, som i de flesta japanska kalkglasyrer (石灰釉).

I ett diagram med kiseldioxid på den vågräta axeln och aluminiumoxid på den lodräta blir varje glasyr en punkt. Segers försök och Stulls diagram från 1912 är av det slaget, och ett 釉性状図 lägger en klass egna brända provbitar in i det. Glazecalcs receptsida ritar Stull-diagrammet, och den här glasyren ligger i dess blanka område. Stulls områden kommer från hans egna flussmedel och bränning: en vägledning, inte en förutsägelse. [Rutnätet för provbitar](#tile-maps) nedan låter en klass rita sitt eget diagram vid sin egen bränning.

::stull-chart

Glazecalc kan inte räkna ut formeln för en färdig glasyr vars recept är okänt. Färga den i stället genom att lägga till färgmedlet utöver de 100: 100 g torr glasyr med 1, 2 och 3 g järnoxid, en provbit vardera, brända i oxidation och reduktion.

### I Glazecalc

1. Ange receptet ovan på [receptsidan](/recipe) och läs dess **Segerformel** och **Stull-diagram**.
2. Ändra kvartsen från 25 till 35 och se hur punkten flyttar sig åt höger.
3. För en bas vars recept finns: gör färgmedlet till en tillsats och stega det med en provserie på [Blandningar](/blends).

### Arbetsblad

Table: Arbetsblad 3: ett färgmedel i en färdig glasyr
Label: Arbetsblad 3

| Provbit | Färgmedel (g per 100 g) | Oxidation: hur den ser ut | Reduktion: hur den ser ut |
| ------- | ----------------------- | ------------------------- | ------------------------- |
| 1       | 0                       |                           |                           |
| 2       | 1                       |                           |                           |
| 3       | 2                       |                           |                           |
| 4       | 3                       |                           |                           |

### Kontrollfrågor

- Vilken kolumn i en Segerformel summerar till 1?
- Vilket är den här glasyrens förhållande kiseldioxid till aluminiumoxid, och vad tyder det på?
- Varför kan en punkt i diagrammets blanka område ändå ge en matt provbit i den egna ugnen?

## Träff 4: Från recept till Segerformel {#recipe-to-formula}

### Mål

- Räkna ut en Segerformel utifrån ett recept för hand.
- Jämföra den med Glazecalcs egen uträkning.

### Förberedelser

- Arbetsblad 4, de fyra analyserna från träff 1 och miniräknare.

### Räkneexempel

Receptet: 福島長石 45, krita 20, EPK kaolin 10, kvarts 25. Räkna varje mängd som gram. För varje råvara ger gram × oxidens procenthalt ÷ 100 ÷ dess molmassa antalet mol. Tabellen anger de viktigaste oxiderna; Glazecalc räknar också med spårämnena (kaolinets järn och titan, fältspatens magnesium).

Table: Mol av varje oxid i satsen (100 g)
Label: Mol i satsen

| Råvara   | Gram |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ---: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |   45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Krita    |   20 |      – |      – | 0,1998 |      – |      – |
| Kaolin   |   10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvarts   |   25 |      – |      – |      – |      – | 0,4161 |
| Summa    |  100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Flussmedlen summerar till 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnesiumoxid) = 0,2847 mol. Dividera varje summa med det:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Det är formeln från träff 3.

### I Glazecalc

1. Ange receptet på [receptsidan](/recipe).
2. Öppna **Så räknas Segerformeln ut**. Den visar dessa steg med det här receptets tal: gram, mol av varje oxid i varje råvara, summorna och delningen med flussmedlen.
3. Jämför varje rad med arbetsbladet. Ändra sedan en mängd och räkna bara ut den kolumn som ändras.

### Arbetsblad

Table: Arbetsblad 4: recept till Segerformel
Label: Arbetsblad 4

| Råvara       | Gram | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------ | ---- | --- | ---- | --- | ----- | ---- |
|              |      |     |      |     |       |      |
|              |      |     |      |     |       |      |
|              |      |     |      |     |       |      |
|              |      |     |      |     |       |      |
| Summa        |      |     |      |     |       |      |
| ÷ flussmedel |      |     |      |     |       |      |

### Kontrollfrågor

- Varför ger varje satsstorlek samma Segerformel?
- Vilka oxider tillför kaolinen, och vilken av dem betyder mest här?
- Varför lämnas kritans LOI utanför formeln?

## Träff 5: Från Segerformel till recept {#formula-to-recipe}

### Mål

- Välja råvaror för en målformel och räkna ut hur mycket av var och en.
- Använda Beräkna mot ett mål och säga hur nära det kommer.

### Förberedelser

- Målet nedan, arbetsblad 5 och miniräknare; Glazecalc med ett konto.

### Räkneexempel

Målet: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ och 4,0 SiO₂. Ta råvarorna i den här ordningen, var och en för den oxid som bara den kan tillföra:

1. **Fältspaten, för kalium och natrium.** En enhet 福島長石 (536,8 g, den vikt som innehåller en mol flussmedel) tillför 0,94 mol K₂O och Na₂O. Målet kräver 0,3, så 0,3 ÷ 0,94 = 0,319 enheter: 171,4 g. Den tillför också 0,015 CaO, 0,328 Al₂O₃ och 1,865 SiO₂.
2. **Krita, för resten av kalciumet.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, för resten av aluminiumoxiden.** 0,4 − 0,328 = 0,072 mol. EPK-kaolin innehåller en mol Al₂O₃ per 272,6 g, så 19,6 g, vilket också tillför 0,149 SiO₂.
4. **Kvarts, för resten.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Satsen är 379,0 g. I procent: 福島長石 45,2, krita 18,1, kaolin 5,2, kvarts 31,5. Fältspaten bestämmer förhållandet mellan kalium och natrium, så receptet ger 0,195 K₂O och 0,104 Na₂O: nära målet, men inte exakt.

### I Glazecalc

1. Öppna [Beräkna mot ett mål](/solve), välj **En Segerformel (mol, flussmedlen summerar till 1)** och skriv in målet.
2. Ge den 福島長石, krita, EPK kaolin och kvarts under **Råvarorna** och välj **Beräkna**.
3. Den ger 福島長石 44,9, krita 18,2, kaolin 5,6 och kvarts 31,3, och en tabell över hur nära varje oxid kommer. Jämför med uträkningen för hand: lösaren räknar med alla spårämnen och hittar den bästa anpassning som de fyra råvarorna tillåter.
4. **Öppna som nytt recept** och kontrollera det på receptsidan.

### Arbetsblad

Table: Arbetsblad 5: mål till recept
Label: Arbetsblad 5

| Steg | Råvara | För vilken oxid | Mol som behövs | Gram | Tillför också |
| ---- | ------ | --------------- | -------------- | ---- | ------------- |
| 1    |        |                 |                |      |               |
| 2    |        |                 |                |      |               |
| 3    |        |                 |                |      |               |
| 4    |        |                 |                |      |               |

### Kontrollfrågor

- Varför räknas fältspaten ut först?
- Varför kan de här fyra råvarorna inte ge exakt 0,2 K₂O och 0,1 Na₂O?
- Vad skulle man lägga till bland råvarorna för att få in magnesiumoxid?

## Träff 6: Lermassan och glasyrfel {#body-and-defects}

> [!WARNING]
> En bränd glasyr kan avge metaller till mat och dryck, och den kan se felfri ut medan den gör det. Glasyrer med mycket barium eller med koppar, och varje glasyr med bly, kan avge metaller. Bara ett laboratorietest av metallavgivningen{{en: leach test}} från det brända föremålet visar vad det avger; ingen beräkning kan göra det. Läs [Livsmedelssäkerhet](/guides/glazing-basics#food-safety) och [Råvaror som kräver mest försiktighet](/guides/safe-mixing#materials).

### Mål

- Mäta en lermassas krympning och vattenupptagning.
- Namnge de vanliga felen, deras vanliga orsaker och en första åtgärd.
- Veta vilka fel som gör gods osäkert.

### Förberedelser

- Provstavar av den egna lermassan, märkta med 100 mm mellanrum medan leran är våt, brända och obrända.
- Provbitar med fel, om sådana finns: krackelering, krypning, nålstick, rinning.

### Räkneexempel

- **Krympning**: (märkt längd − bränd längd) ÷ märkt längd × 100. Märken med 100 mm mellanrum som mäter 88 mm efter bränningen: 12 % krympning.
- **Vattenupptagning**: (vikt efter blötläggning − torr vikt) ÷ torr vikt × 100. En bränd stav på 50,0 g som väger 50,6 g efter blötläggning: 1,2 %.

Table: Fel, orsaker och en första åtgärd i Segerformeln
Label: Fel

| Fel          | Vanlig orsak                                     | En första åtgärd att pröva                                |
| ------------ | ------------------------------------------------ | --------------------------------------------------------- |
| Krackelering | Glasyren krymper mer än skärven                  | Mindre K₂O och Na₂O; mer kalcium, magnesiumoxid eller bor |
| Avskalning   | Glasyren krymper betydligt mindre än skärven     | Mer K₂O och Na₂O                                          |
| Rinning      | För lite aluminiumoxid, eller för tjockt         | Mer aluminiumoxid; ett tunnare lager                      |
| Krypning     | Dammigt skröj, eller ett tjockt lager som sprack | Rengör skröjet; ett tunnare lager                         |
| Nålstick     | Gas som inte läkte igen                          | En hålltid vid toppen av bränningen; ett tunnare lager    |

[Passning och glasyrfel](/guides/glazing-basics#fit-and-defects) förklarar vart och ett, med isvattentestet för krackelering. Använd inte krackelerat eller avskalat gods till mat eller dryck.

::food-limits

### I Glazecalc

1. Läs panelen **Gränser** för en egen glasyr på [receptsidan](/recipe), och dess beräknade utvidgning.
2. Kopiera receptet, byt ut en del fältspat mot krita och jämför de två: åt vilket håll rörde sig utvidgningen?

### Arbetsblad

Table: Arbetsblad 6: lermassan
Label: Arbetsblad 6

| Stav | Märkt längd (mm) | Bränd längd (mm) | Krympning (%) | Torr vikt (g) | Vikt efter blötläggning (g) | Vattenupptagning (%) |
| ---- | ---------------- | ---------------- | ------------- | ------------- | --------------------------- | -------------------- |
| 1    | 100              |                  |               |               |                             |                      |
| 2    | 100              |                  |               |               |                             |                      |

### Kontrollfrågor

- Vilket fel kommer av en glasyr som krymper mer än skärven, och vad är en första åtgärd?
- Varför får avskalat gods aldrig användas till mat?
- Kan en beräkning visa att en glasyr är säker för mat? Vad kan visa det?

## Provbitskartor att skriva ut {#tile-maps}

### Triaxialkarta: 42 glasyrer

Två trianglar med 21 provbitar vardera, från layouten för Blandningar med 6 rader: provbit 1 överst (fältspat), nedersta raden från krita (vänster) till kvarts (höger). Triangel II är triangel I med 1 g röd järnoxid utöver varje 100 g, vilket går mot celadon (青磁) vid reduktion. Brända i oxidation och reduktion blir det 84 provbitar. Mängderna är gram per 100 g.

Table: Triaxialkarta: 福島長石, krita och kvarts, med 10 kaolin i varje provbit
Label: Triaxialkarta

| Provbit (I) | Provbit (II) | 福島長石 | Krita | Kvarts | Kaolin | I ox | I red | II ox | II red |
| ----------- | ------------ | -------: | ----: | -----: | -----: | ---- | ----- | ----- | ------ |
| 1           | 22           |       90 |     0 |      0 |     10 |      |       |       |        |
| 2           | 23           |       72 |    18 |      0 |     10 |      |       |       |        |
| 3           | 24           |       72 |     0 |     18 |     10 |      |       |       |        |
| 4           | 25           |       54 |    36 |      0 |     10 |      |       |       |        |
| 5           | 26           |       54 |    18 |     18 |     10 |      |       |       |        |
| 6           | 27           |       54 |     0 |     36 |     10 |      |       |       |        |
| 7           | 28           |       36 |    54 |      0 |     10 |      |       |       |        |
| 8           | 29           |       36 |    36 |     18 |     10 |      |       |       |        |
| 9           | 30           |       36 |    18 |     36 |     10 |      |       |       |        |
| 10          | 31           |       36 |     0 |     54 |     10 |      |       |       |        |
| 11          | 32           |       18 |    72 |      0 |     10 |      |       |       |        |
| 12          | 33           |       18 |    54 |     18 |     10 |      |       |       |        |
| 13          | 34           |       18 |    36 |     36 |     10 |      |       |       |        |
| 14          | 35           |       18 |    18 |     54 |     10 |      |       |       |        |
| 15          | 36           |       18 |     0 |     72 |     10 |      |       |       |        |
| 16          | 37           |        0 |    90 |      0 |     10 |      |       |       |        |
| 17          | 38           |        0 |    72 |     18 |     10 |      |       |       |        |
| 18          | 39           |        0 |    54 |     36 |     10 |      |       |       |        |
| 19          | 40           |        0 |    36 |     54 |     10 |      |       |       |        |
| 20          | 41           |        0 |    18 |     72 |     10 |      |       |       |        |
| 21          | 42           |        0 |     0 |     90 |     10 |      |       |       |        |

### Segerrutnät: 24 glasyrer

Varje provbit har samma flussmedel, 0,2 KNaO och 0,8 CaO, från 福島長石 och krita. Aluminiumoxiden stegar nedåt i rutnätet och kvartsen åt sidan. Recepten räknades ut med metoden från träff 5; Glazecalcs Segerformel för vart och ett ligger inom 0,01 från dess aluminiumoxid och 0,06 från dess kiseldioxid. Markera varje provbit i ett diagram över kiseldioxid mot aluminiumoxid och rita egna områden: matt, blank, underbränd, rinnande.

Table: Segerrutnät: 0,2 KNaO, 0,8 CaO, viktprocent
Label: Segerrutnät

| Provbit | Al₂O₃ | SiO₂ | 福島長石 | Krita | Kaolin | Kvarts | Oxidation | Reduktion |
| ------- | ----: | ---: | -------: | ----: | -----: | -----: | --------- | --------- |
| 1       |  0,25 |  2,0 |     46,9 |  32,5 |    3,5 |   17,1 |           |           |
| 2       |  0,25 |  2,5 |     41,8 |  28,9 |    3,1 |   26,2 |           |           |
| 3       |  0,25 |  3,0 |     37,6 |  26,1 |    2,8 |   33,5 |           |           |
| 4       |  0,25 |  3,5 |     34,3 |  23,7 |    2,5 |   39,5 |           |           |
| 5       |  0,25 |  4,0 |     31,4 |  21,7 |    2,3 |   44,5 |           |           |
| 6       |  0,25 |  4,5 |     29,0 |  20,1 |    2,2 |   48,7 |           |           |
| 7       |  0,35 |  2,0 |     44,3 |  30,6 |   13,9 |   11,3 |           |           |
| 8       |  0,35 |  2,5 |     39,6 |  27,4 |   12,4 |   20,5 |           |           |
| 9       |  0,35 |  3,0 |     35,9 |  24,8 |   11,2 |   28,0 |           |           |
| 10      |  0,35 |  3,5 |     32,8 |  22,7 |   10,3 |   34,2 |           |           |
| 11      |  0,35 |  4,0 |     30,2 |  20,9 |    9,5 |   39,5 |           |           |
| 12      |  0,35 |  4,5 |     28,0 |  19,4 |    8,8 |   43,9 |           |           |
| 13      |  0,45 |  2,0 |     41,9 |  29,0 |   23,1 |    6,1 |           |           |
| 14      |  0,45 |  2,5 |     37,7 |  26,1 |   20,8 |   15,4 |           |           |
| 15      |  0,45 |  3,0 |     34,3 |  23,7 |   18,9 |   23,0 |           |           |
| 16      |  0,45 |  3,5 |     31,5 |  21,8 |   17,4 |   29,4 |           |           |
| 17      |  0,45 |  4,0 |     29,1 |  20,1 |   16,0 |   34,8 |           |           |
| 18      |  0,45 |  4,5 |     27,0 |  18,7 |   14,9 |   39,4 |           |           |
| 19      |  0,55 |  2,0 |     39,7 |  27,5 |   31,4 |    1,5 |           |           |
| 20      |  0,55 |  2,5 |     35,9 |  24,9 |   28,4 |   10,8 |           |           |
| 21      |  0,55 |  3,0 |     32,8 |  22,7 |   26,0 |   18,5 |           |           |
| 22      |  0,55 |  3,5 |     30,2 |  20,9 |   23,9 |   25,0 |           |           |
| 23      |  0,55 |  4,0 |     28,0 |  19,4 |   22,1 |   30,5 |           |           |
| 24      |  0,55 |  4,5 |     26,1 |  18,1 |   20,6 |   35,3 |           |           |

Blandningar för provbitar i Glazecalc gör trianglar och kvadrater med 3 till 66 provbitar, inte det här rutnätet; öppna valfri provbit som ett recept på [receptsidan](/recipe) och skriv ut dess väglista därifrån.

## Källor {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): de sex träffarna.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: träffarnas datum och ämnen.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: den påföljande kursens uppgifter med 42, 90 och 78 glasyrer i oxidation och reduktion.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): centrets eget beräkningsprogram.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Segerformeln i vecka 5, 6 och 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): glasyrberäkning för skollärare i Taiwan.
- Glendale Community College, ART 195 course outline: Segerformeln i vecka 5 till 7 av 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analysen av 福島長石 i Glazecalcs bibliotek.
- IUPAC, standard atomic weights, som Glazecalcs kemi använder dem.
