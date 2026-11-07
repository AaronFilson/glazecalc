---
title: Poučavanje izračuna glazura
lead: 6 susreta za razred ili skupinu za učenje, od sirovina i trokutnih nizova pločica do Segerove formule izračunane u oba smjera i grešaka glazure, svaki s riješenim primjerom, koracima u aplikaciji Glazecalc, radnim listom za ispis i pitanjima za provjeru.
---

## O ovom paketu {#about}

Ovaj je paket za sve koji podučavaju izračun glazura: školu, radionicu, skupinu za učenje lončara koji se time bave ili osobu koja sama uči. Ima šest susreta, a svaki ima ciljeve, što pripremiti, riješen primjer sa stvarnim sirovinama, kako to napraviti u aplikaciji Glazecalc, radni list i pitanja za provjeru.

Redoslijed susreta prati objavljenu studijsku skupinu: 陶磁器釉薬技術研究会 (studijska skupina za keramičke glazure) Industrijskog tehnološkog centra prefekture Ibaraki u Japanu, koja je 2015. održala šest susreta za 12 mladih lončara i izvijestila o njima u svom istraživačkom izvješću. Njezin nastavni tečaj na koledžu keramičke umjetnosti Kasama zadao je tri zadatka s probnim pločicama za 42, 90 i 78 glazura, a svaki je pečen oksidacijskim i redukcijskim pečenjem. **Glazecalc nije povezan s tim centrom ni s tim koledžom.** Pratimo redoslijed njihova objavljenog nacrta i navodimo ga niže; tekst, primjeri i radni listovi ovdje naši su. Tečajevi u drugim zemljama uče iste korake gotovo istim redoslijedom: kolegij SCT305 sveučilišta Bilecik Şeyh Edebali u Turskoj, kolegij ART 195 ustanove Glendale Community College u SAD-u, nastavni plan Porajnja-Falačke za škole keramike u Njemačkoj i rad 李堅萍 iz 2006. za nastavnike na Tajvanu.

Table: Šest susreta
Label: Šest susreta

| Susret | Tema                                                             | U aplikaciji Glazecalc              |
| ------ | ---------------------------------------------------------------- | ----------------------------------- |
| 1      | Sirovine, što rade, trokutni niz pločica                         | Sirovine, Mješavine (trokutni niz)  |
| 2      | Kemija: elementi, formule, molovi                                | Stranica sirovine                   |
| 3      | Čitanje Segerove formule, dijagram silicijeva dioksida i glinice | Stranica recepta, Stullov dijagram  |
| 4      | Od recepta do Segerove formule                                   | Kako se izračunava Segerova formula |
| 5      | Od Segerove formule do recepta                                   | Izračun prema cilju                 |
| 6      | Keramička masa i greške glazure                                  | Granice, Usporedi                   |

### Kako ga koristiti

- Svaki susret traje otprilike 2 sata. Susreti 4 i 5 traže kalkulatore te računalo ili telefon s aplikacijom Glazecalc za svaki par.
- Riješeni primjeri koriste sirovine koje se prodaju u Japanu i brojke iz standardne biblioteke aplikacije Glazecalc: 福島長石 (feldspat Fukushima), kredu (石灰石, kalcijev karbonat), kaolin i kvarc (珪石). Ako imate analizu svog dobavljača, upotrijebite je: dodajte je na [stranici Sirovine](/material) i brojke će se promijeniti, ali metoda neće.
- Pečenje je na stožac SK 8, nazivno {{2282 °F; 1250 °C}}. Koristite stožac na koji peče vaš razred; brojeve SK objašnjava [Pečenje na stošce SK](/guides/firing#sk-cones).
- Radni list ili kartu pločica ispišete tako da ovu stranicu ispišete iz preglednika. Za spremanje recepata, mješavina i napomena treba besplatan račun.

> [!WARNING]
> Susreti 1, 3 i 6 su praktični rad: vaganje suhih sirovina i pečenje. Prije nego što itko odvaže ijednu sirovinu, pročitajte [Najvažnije navike](/guides/safe-mixing#habits). Prašina suhe glazure glavna je opasnost.

## Susret 1: Sirovine i trokutni niz pločica {#materials}

> [!WARNING]
> Suhe sirovine vagajte nježno, čistite mokro i nosite zaštitnu masku koja dobro prianja dok su praškovi suhi. Prvo pročitajte [Glavna opasnost: prašina](/guides/safe-mixing#the-main-hazard) i [Zaštitne maske](/guides/safe-mixing#respirators).

### Ciljevi

- Imenovati tri uloge u glazuri: staklotvorac{{en: glass former}}, topitelj{{en: flux}} i stabilizator{{en: stabilizer}}.
- Razvrstati 4 uobičajene sirovine prema oksidima koje donose.
- Postaviti trokutni niz proba i čitati njegove pločice kao kartu.

### Priprema

- Po jedna vreća 福島長石, krede, kaolina i kvarca ili sirovine koje vaš razred ima.
- [Karta pločica trokutnog niza](#tile-maps) dolje, ispisana, i 21 probna pločica po osobi za svaki trokut.
- Pečene pločice iz ranijeg trokutnog niza, ako ih imate, da ih polaznici mogu pogledati iz ruke u ruku.

### Riješen primjer

Analiza svake sirovine, iz biblioteke aplikacije Glazecalc, daje okside koje ostavlja nakon pečenja. Gubitak žarenjem (LOI){{en: loss on ignition}} je ono što izgori.

Table: Četiri sirovine i što donose (maseni postotak, iz biblioteke)
Label: Četiri sirovine

| Sirovina            | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Uloga                                                  |
| ------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ------------------------------------------------------ |
| 福島長石 (feldspat) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Topitelj, s vlastitom glinicom i silicijevim dioksidom |
| Kreda (石灰石)      |    – |     – |     – |    – | 56,03 | 43,97 | Topitelj (kalcij)                                      |
| EPK Kaolin          | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizator: glavni izvor glinice                     |
| Kvarc (珪石)        |  100 |     – |     – |    – |     – |     – | Staklotvorac                                           |

Sam feldspat se na SK 8 tali u viskozno staklo; sama kreda se ne tali; sam kvarc se ne tali. Pomiješani, tale se mnogo bolje od bilo koje od tih sirovina. Trokutni niz proba pokazuje gdje: karta pločica dolje mijenja te tri sirovine u koracima od 20 %, s 10 % kaolina u svakoj pločici.

::shops

### U aplikaciji Glazecalc

1. Otvorite svaku sirovinu na [stranici Sirovine](/material) ili njezinu javnu stranicu, na primjer [Fukushima Feldspar](/materials/fukushima-feldspar). Zabilježite koje okside donosi.
2. Napravite tri recepta: 福島長石 90 s kaolinom 10, kreda 90 s kaolinom 10 i kvarc 90 s kaolinom 10. Na stranici [Mješavine za probne pločice](/blends) odaberite **Trokutni niz (3 recepta)** i 6 redaka: 21 pločica, isto kao na karti dolje.
3. Odaberite smjesu za svaku pločicu i gumbom **Ispiši** ispišite što treba odvagati. Nakon pečenja spremite pločice koje vam se sviđaju kao recepte iz prikaza pločica.

### Radni list

Table: Radni list 1: što koja sirovina donosi
Label: Radni list 1

| Sirovina | Oksidi koje donosi | Staklotvorac, topitelj ili stabilizator? | LOI (%) |
| -------- | ------------------ | ---------------------------------------- | ------- |
| 福島長石 |                    |                                          |         |
| Kreda    |                    |                                          |         |
| Kaolin   |                    |                                          |         |
| Kvarc    |                    |                                          |         |

### Provjera

- Koja sirovina donosi većinu glinice i zašto je glazuri ona potrebna?
- Zašto se kut trokuta s kredom ne tali sam od sebe?
- Gdje su se na trokutu vaše pločice najbolje rastalile i kojem je kutu to mjesto bilo najbliže?

## Susret 2: Kemija koja vam treba {#chemistry}

### Ciljevi

- Čitati kemijsku formulu: SiO₂, CaO, Al₂O₃, CaCO₃.
- Izračunati molarnu masu iz atomskih masa.
- Pretvoriti grame u molove i natrag.

### Priprema

- Periodni sustav elemenata za svaku osobu i kalkulatori.
- Atomske mase iz donje tablice (standardne vrijednosti IUPAC-a, kako ih koristi Glazecalc).

### Riješen primjer

Table: Atomske mase korištene ovdje (g/mol)
Label: Atomske mase

| Element  | Simbol | Atomska masa |
| -------- | ------ | -----------: |
| Kisik    | O      |       15,999 |
| Ugljik   | C      |       12,011 |
| Natrij   | Na     |        22,99 |
| Aluminij | Al     |       26,982 |
| Silicij  | Si     |       28,085 |
| Kalij    | K      |       39,098 |
| Kalcij   | Ca     |       40,078 |

Formula broji atome. SiO₂ je jedan silicij i dva kisika, pa jedan mol te tvari ima masu 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ je 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO je 56,077 g, a kreda, CaCO₃, 100,086 g; biblioteka aplikacije Glazecalc zaokružuje je na 100,08.

**Mol** je broj, poput tuceta: isti broj molekula bez obzira na to koje su. Molovi su grami ÷ molarna masa:

- 25 g kvarca je 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g krede je 20 ÷ 100,08 = 0,200 mol. U peći gubi ugljikov dioksid (CO₂, 44,009 g/mol) i ostavlja 0,200 mol CaO, što ima masu 0,200 × 56,077 = 11,2 g. Taj gubitak je njezin gubitak žarenjem (LOI): 43,97 %.

### U aplikaciji Glazecalc

1. Otvorite [Whiting](/materials/whiting) i [Silica](/materials/silica): svaka stranica navodi formulu i njezine mase.
2. Jednu molarnu masu izračunajte ručno i usporedite je sa stranicom.

### Radni list

Table: Radni list 2: molarna masa i molovi
Label: Radni list 2

| Oksid ili sirovina | Formula | Molarna masa (g/mol) | Grami | Molovi |
| ------------------ | ------- | -------------------- | ----- | ------ |
| Kvarc              | SiO₂    |                      | 30    |        |
| Glinica            | Al₂O₃   |                      | 10    |        |
| Kalcijev oksid     | CaO     |                      | 5     |        |
| Kreda              | CaCO₃   |                      | 15    |        |

### Provjera

- Koliko grama ima jedan mol SiO₂ i kako se to izračuna?
- Zašto 20 g krede u pečenoj glazuri ostavlja manje od 20 g?
- Zašto okside uspoređujemo po molovima, a ne po gramima?

## Susret 3: Čitanje Segerove formule {#reading-the-formula}

> [!WARNING]
> Bojenje glazure znači vaganje bojila, a neka od njih traže više opreza od osnovnih sirovina. Prvo pročitajte [Sirovine koje traže najviše opreza](/guides/safe-mixing#materials).

### Ciljevi

- Čitati tri stupca Segerove formule (UMF){{en: unity formula}} (ゼーゲル式, japanski naziv Segerove formule): topitelji, stabilizator, staklotvorac.
- Pronaći glazuru na dijagramu silicijeva dioksida i glinice i znati što dijagram može, a što ne može reći.
- Postupno obojiti gotovu glazuru i zabilježiti rezultat.

### Priprema

- Segerova formula iz primjera dolje, napisana velikim brojkama.
- Gotova prozirna glazura i bojilo, na primjer crveni željezni oksid{{en: red iron oxide}} (弁柄).

### Riješen primjer

Glazura iz susreta 4, 福島長石 45, kreda 20, kaolin 10 i kvarc 25, ima ovu Segerovu formulu (brojke iz aplikacije Glazecalc, zaokružene):

Table: Segerova formula u tri stupca
Label: Segerova formula

| Topitelji (RO, R₂O) | Stabilizator (R₂O₃) | Staklotvorac (RO₂) |
| ------------------- | ------------------- | ------------------ |
| K₂O 0,18            | Al₂O₃ 0,43          | SiO₂ 3,45          |
| Na₂O 0,10           |                     |                    |
| CaO 0,72            |                     |                    |

- Topitelji se zbrajaju u 1: to je pravilo formule. Svaki drugi broj označava molove na svaki mol topitelja.
- Omjer SiO₂ i Al₂O₃ je 3,45 ÷ 0,43, otprilike 8: tipična sjajna glazura.
- Većinu topitelja čini kalcij, kao u većini japanskih vapnenih glazura (石灰釉).

Dijagram sa silicijevim dioksidom po vodoravnoj i glinicom po okomitoj osi prikazuje svaku glazuru kao točku. Segerovi pokusi i Stullov dijagram iz 1912. takve su vrste, a 釉性状図 prikazuje na njemu pločice koje je razred sam ispekao. Stranica recepta aplikacije Glazecalc crta Stullov dijagram, a ova glazura leži u njegovu sjajnom području. Stullova područja potječu od njegovih vlastitih topitelja i pečenja: orijentir, a ne predviđanje. [Mreža pločica](#tile-maps) dolje omogućuje razredu da nacrta vlastiti dijagram za vlastito pečenje.

::stull-chart

Za bojenje gotove glazure čiji recept ne znate Glazecalc ne može izračunati formulu. Umjesto toga dodajte bojilo povrh 100: 100 g suhe glazure s 1, 2 i 3 g željeznog oksida, po jedna pločica, pečena oksidacijskim i redukcijskim pečenjem.

### U aplikaciji Glazecalc

1. Na [stranici recepta](/recipe) unesite gornji recept i pročitajte njegovu **Segerovu formulu** i **Stullov dijagram**.
2. Promijenite kvarc s 25 na 35 i gledajte kako se točka pomiče udesno.
3. Za osnovu čiji recept imate napravite bojilo dodatkom i koristite niz proba na stranici [Mješavine za probne pločice](/blends) da ga postupno mijenjate.

### Radni list

Table: Radni list 3: bojilo u gotovoj glazuri
Label: Radni list 3

| Pločica | Bojilo (g na 100 g) | Oksidacijsko pečenje: kako izgleda | Redukcijsko pečenje: kako izgleda |
| ------- | ------------------- | ---------------------------------- | --------------------------------- |
| 1       | 0                   |                                    |                                   |
| 2       | 1                   |                                    |                                   |
| 3       | 2                   |                                    |                                   |
| 4       | 3                   |                                    |                                   |

### Provjera

- Koji se stupac u Segerovoj formuli zbraja u 1?
- Koliki je omjer SiO₂ i Al₂O₃ ove glazure i što on sugerira?
- Zašto točka u sjajnom području dijagrama u vašoj peći ipak može dati mat pločicu?

## Susret 4: Od recepta do Segerove formule {#recipe-to-formula}

### Ciljevi

- Ručno izračunati Segerovu formulu iz recepta.
- Provjeriti je prema izračunu aplikacije Glazecalc.

### Priprema

- Radni list 4, četiri analize iz susreta 1 i kalkulatori.

### Riješen primjer

Recept: 福島長石 45, kreda 20, EPK kaolin 10, kvarc 25. Svaku količinu uzmite kao grame. Za svaku sirovinu grami × postotak oksida ÷ 100 ÷ molarna masa daju molove. Tablica daje glavne okside; Glazecalc broji i tragove (željezo i titanij u kaolinu, magnezij u feldspatu).

Table: Molovi svakog oksida u smjesi (100 g)
Label: Molovi u smjesi

| Sirovina | Grami |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kreda    |    20 |      – |      – | 0,1998 |      – |      – |
| Kaolin   |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvarc    |    25 |      – |      – |      – |      – | 0,4161 |
| Ukupno   |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Topitelji se zbrajaju u 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnezija) = 0,2847 mol. Podijelite svaki zbroj njime:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

To je formula iz susreta 3.

### U aplikaciji Glazecalc

1. Unesite recept na [stranici recepta](/recipe).
2. Otvorite **Kako se izračunava Segerova formula**. Prikazuje ove korake s brojkama ovog recepta: grame, molove svakog oksida u svakoj sirovini, zbrojeve i dijeljenje s topiteljima.
3. Usporedite svaki redak sa svojim radnim listom. Zatim promijenite jednu količinu i izračunajte samo stupac koji se mijenja.

### Radni list

Table: Radni list 4: od recepta do Segerove formule
Label: Radni list 4

| Sirovina    | Grami | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ----------- | ----- | --- | ---- | --- | ----- | ---- |
|             |       |     |      |     |       |      |
|             |       |     |      |     |       |      |
|             |       |     |      |     |       |      |
|             |       |     |      |     |       |      |
| Ukupno      |       |     |      |     |       |      |
| ÷ topitelji |       |     |      |     |       |      |

### Provjera

- Zašto svaka veličina smjese daje istu Segerovu formulu?
- Koje okside donosi kaolin i koji je od njih ovdje najvažniji?
- Zašto se LOI krede izostavlja iz formule?

## Susret 5: Od Segerove formule do recepta {#formula-to-recipe}

### Ciljevi

- Odabrati sirovine za ciljnu formulu i izračunati koliko je svake potrebno.
- Koristiti funkciju Izračun prema cilju i reći koliko mu se približava.

### Priprema

- Cilj dolje, radni list 5 i kalkulatori; Glazecalc s računom.

### Riješen primjer

Cilj: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ i 4,0 SiO₂. Sirovine uzimajte ovim redom, svaku za oksid koji može donijeti samo ona:

1. **Feldspat, za kalij i natrij.** Jedna jedinica sirovine 福島長石 (536,8 g, masa koja sadrži jedan mol topitelja) donosi 0,94 mol K₂O i Na₂O. Cilj traži 0,3, pa je 0,3 ÷ 0,94 = 0,319 jedinica: 171,4 g. Donosi i 0,015 CaO, 0,328 Al₂O₃ i 1,865 SiO₂.
2. **Kreda, za ostatak kalcija.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, za ostatak glinice.** 0,4 − 0,328 = 0,072 mol. EPK kaolin sadrži jedan mol Al₂O₃ u 272,6 g, pa je potrebno 19,6 g, što donosi i 0,149 SiO₂.
4. **Kvarc, za ostatak.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Smjesa ima 379,0 g. U postocima: 福島長石 45,2, kreda 18,1, kaolin 5,2, kvarc 31,5. Feldspat određuje omjer kalija i natrija, pa recept daje 0,195 K₂O i 0,104 Na₂O: blizu cilja, ali ne točno na njemu.

### U aplikaciji Glazecalc

1. Otvorite [Izračun prema cilju](/solve), odaberite **Segerova formula (molovi, topitelji se zbrajaju u 1)** i upišite cilj.
2. Pod **Sirovine** dajte mu 福島長石, kredu, EPK kaolin i kvarc te odaberite **Izračunaj**.
3. Daje 福島長石 44,9, kreda 18,2, kaolin 5,6 i kvarc 31,3 te tablicu koliko se svaki oksid približava. Usporedite je sa svojim ručnim računom: rješavač broji svaki trag i traži najbolje podudaranje koje četiri sirovine dopuštaju.
4. Odaberite **Otvori kao novi recept** i provjerite ga na stranici recepta.

### Radni list

Table: Radni list 5: od cilja do recepta
Label: Radni list 5

| Korak | Sirovina | Za koji oksid | Potrebni molovi | Grami | Donosi i |
| ----- | -------- | ------------- | --------------- | ----- | -------- |
| 1     |          |               |                 |       |          |
| 2     |          |               |                 |       |          |
| 3     |          |               |                 |       |          |
| 4     |          |               |                 |       |          |

### Provjera

- Zašto se feldspat računa prvi?
- Zašto ove četiri sirovine ne mogu dati točno 0,2 K₂O i 0,1 Na₂O?
- Što biste dodali sirovinama da biste unijeli magnezij?

## Susret 6: Keramička masa i greške glazure {#body-and-defects}

> [!WARNING]
> Pečena glazura može otpuštati metale u hranu i piće, a pritom može izgledati savršeno. Glazure s mnogo barija ili s bakrom i svaka glazura s olovom mogu otpuštati metale. Samo laboratorijsko ispitivanje otpuštanja metala iz pečenog predmeta{{en: leach test}} pokazuje što se otpušta; nijedan izračun to ne može. Pročitajte [Sigurnost hrane](/guides/glazing-basics#food-safety) i [Sirovine koje traže najviše opreza](/guides/safe-mixing#materials).

### Ciljevi

- Izmjeriti skupljanje i upijanje vode keramičke mase.
- Imenovati česte greške, njihove uobičajene uzroke i prvi popravak.
- Znati koje greške čine predmete nesigurnima.

### Priprema

- Probne šipke vaše keramičke mase, označene na razmaku od 100 mm dok su mokre, pečene i nepečene.
- Pločice s greškama, ako ih imate: pucanje, povlačenje, rupičavost, curenje.

### Riješen primjer

- **Skupljanje**: (označena duljina − duljina nakon pečenja) ÷ označena duljina × 100. Oznake na razmaku od 100 mm koje nakon pečenja mjere 88 mm: skupljanje 12 %.
- **Upijanje vode**: (masa nakon namakanja − masa suhe šipke) ÷ masa suhe šipke × 100. Pečena šipka od 50,0 g koja nakon namakanja ima masu 50,6 g: 1,2 %.

Table: Greške, uzroci i prvi popravak u Segerovoj formuli
Label: Greške

| Greška             | Uobičajeni uzrok                                 | Prvi popravak koji treba isprobati                 |
| ------------------ | ------------------------------------------------ | -------------------------------------------------- |
| Pucanje glazure    | Glazura se skuplja više od keramičke mase        | Manje K₂O i Na₂O; više kalcija, magnezija ili bora |
| Ljuštenje glazure  | Glazura se skuplja mnogo manje od keramičke mase | Više K₂O i Na₂O                                    |
| Curenje glazure    | Premalo glinice ili predebeo sloj                | Više glinice; tanji sloj                           |
| Povlačenje glazure | Prašnjav biskvit ili debeo sloj koji je napukao  | Očistite biskvit; tanji sloj                       |
| Rupičavost         | Rupice od plina koje se nisu zatvorile           | Zadržavanje na kraju pečenja; tanji sloj           |

[Usklađenost glazure i greške](/guides/glazing-basics#fit-and-defects) objašnjava svaku od njih, s testom ledenom vodom za pucanje glazure. Predmete s pucanjem ili ljuštenjem glazure nemojte koristiti za hranu i piće.

::food-limits

### U aplikaciji Glazecalc

1. Na [stranici recepta](/recipe) pročitajte odjeljak **Granice** za neku svoju glazuru i njezino izračunano rastezanje.
2. Kopirajte recept, zamijenite dio feldspata kredom i usporedite ta dva recepta: u kojem se smjeru pomaknulo rastezanje?

### Radni list

Table: Radni list 6: keramička masa
Label: Radni list 6

| Šipka | Označena duljina (mm) | Duljina nakon pečenja (mm) | Skupljanje (%) | Masa suhe šipke (g) | Masa nakon namakanja (g) | Upijanje (%) |
| ----- | --------------------- | -------------------------- | -------------- | ------------------- | ------------------------ | ------------ |
| 1     | 100                   |                            |                |                     |                          |              |
| 2     | 100                   |                            |                |                     |                          |              |

### Provjera

- Koja greška nastaje od glazure koja se skuplja više od keramičke mase i koji je prvi popravak?
- Zašto se predmeti s ljuštenjem glazure nikada ne smiju koristiti za hranu?
- Može li izračun reći da je glazura sigurna za hranu? Što to može?

## Karte pločica za ispis {#tile-maps}

### Karta trokutnog niza: 42 glazure

Dva trokuta od po 21 pločice, prema rasporedu iz Mješavina za probne pločice sa 6 redaka: pločica 1 je na vrhu (feldspat), a donji red ide od krede (lijevo) do kvarca (desno). Trokut II je trokut I s 1 g crvenog željeznog oksida povrh svakih 100 g, što u redukciji prelazi prema seladonu (青磁). Pečeno oksidacijskim i redukcijskim pečenjem, to je 84 pločice. Količine su u gramima na 100 g.

Table: Karta trokutnog niza: 福島長石, kreda i kvarc, s 10 kaolina u svakoj pločici
Label: Karta trokutnog niza

| Pločica (I) | Pločica (II) | 福島長石 | Kreda | Kvarc | Kaolin | I oks. | I red. | II oks. | II red. |
| ----------- | ------------ | -------: | ----: | ----: | -----: | ------ | ------ | ------- | ------- |
| 1           | 22           |       90 |     0 |     0 |     10 |        |        |         |         |
| 2           | 23           |       72 |    18 |     0 |     10 |        |        |         |         |
| 3           | 24           |       72 |     0 |    18 |     10 |        |        |         |         |
| 4           | 25           |       54 |    36 |     0 |     10 |        |        |         |         |
| 5           | 26           |       54 |    18 |    18 |     10 |        |        |         |         |
| 6           | 27           |       54 |     0 |    36 |     10 |        |        |         |         |
| 7           | 28           |       36 |    54 |     0 |     10 |        |        |         |         |
| 8           | 29           |       36 |    36 |    18 |     10 |        |        |         |         |
| 9           | 30           |       36 |    18 |    36 |     10 |        |        |         |         |
| 10          | 31           |       36 |     0 |    54 |     10 |        |        |         |         |
| 11          | 32           |       18 |    72 |     0 |     10 |        |        |         |         |
| 12          | 33           |       18 |    54 |    18 |     10 |        |        |         |         |
| 13          | 34           |       18 |    36 |    36 |     10 |        |        |         |         |
| 14          | 35           |       18 |    18 |    54 |     10 |        |        |         |         |
| 15          | 36           |       18 |     0 |    72 |     10 |        |        |         |         |
| 16          | 37           |        0 |    90 |     0 |     10 |        |        |         |         |
| 17          | 38           |        0 |    72 |    18 |     10 |        |        |         |         |
| 18          | 39           |        0 |    54 |    36 |     10 |        |        |         |         |
| 19          | 40           |        0 |    36 |    54 |     10 |        |        |         |         |
| 20          | 41           |        0 |    18 |    72 |     10 |        |        |         |         |
| 21          | 42           |        0 |     0 |    90 |     10 |        |        |         |         |

### Segerova mreža: 24 glazure

Svaka pločica ima iste topitelje, 0,2 KNaO i 0,8 CaO, iz 福島長石 i krede. Glinica se mijenja od retka do retka mreže, a silicijev dioksid od stupca do stupca. Recepti su izračunani metodom iz susreta 5; Segerova formula svakog od njih, izračunana u aplikaciji Glazecalc, odstupa najviše za 0,01 u glinici i za 0,06 u silicijevu dioksidu. Ucrtajte svaku pločicu u dijagram silicijeva dioksida naspram glinice i nacrtajte vlastita područja: mat, sjajno, nedovoljno pečeno, curenje.

Table: Segerova mreža: 0,2 KNaO, 0,8 CaO, maseni postotak
Label: Segerova mreža

| Pločica | Al₂O₃ | SiO₂ | 福島長石 | Kreda | Kaolin | Kvarc | Oksidacija | Redukcija |
| ------- | ----: | ---: | -------: | ----: | -----: | ----: | ---------- | --------- |
| 1       |  0,25 |  2,0 |     46,9 |  32,5 |    3,5 |  17,1 |            |           |
| 2       |  0,25 |  2,5 |     41,8 |  28,9 |    3,1 |  26,2 |            |           |
| 3       |  0,25 |  3,0 |     37,6 |  26,1 |    2,8 |  33,5 |            |           |
| 4       |  0,25 |  3,5 |     34,3 |  23,7 |    2,5 |  39,5 |            |           |
| 5       |  0,25 |  4,0 |     31,4 |  21,7 |    2,3 |  44,5 |            |           |
| 6       |  0,25 |  4,5 |     29,0 |  20,1 |    2,2 |  48,7 |            |           |
| 7       |  0,35 |  2,0 |     44,3 |  30,6 |   13,9 |  11,3 |            |           |
| 8       |  0,35 |  2,5 |     39,6 |  27,4 |   12,4 |  20,5 |            |           |
| 9       |  0,35 |  3,0 |     35,9 |  24,8 |   11,2 |  28,0 |            |           |
| 10      |  0,35 |  3,5 |     32,8 |  22,7 |   10,3 |  34,2 |            |           |
| 11      |  0,35 |  4,0 |     30,2 |  20,9 |    9,5 |  39,5 |            |           |
| 12      |  0,35 |  4,5 |     28,0 |  19,4 |    8,8 |  43,9 |            |           |
| 13      |  0,45 |  2,0 |     41,9 |  29,0 |   23,1 |   6,1 |            |           |
| 14      |  0,45 |  2,5 |     37,7 |  26,1 |   20,8 |  15,4 |            |           |
| 15      |  0,45 |  3,0 |     34,3 |  23,7 |   18,9 |  23,0 |            |           |
| 16      |  0,45 |  3,5 |     31,5 |  21,8 |   17,4 |  29,4 |            |           |
| 17      |  0,45 |  4,0 |     29,1 |  20,1 |   16,0 |  34,8 |            |           |
| 18      |  0,45 |  4,5 |     27,0 |  18,7 |   14,9 |  39,4 |            |           |
| 19      |  0,55 |  2,0 |     39,7 |  27,5 |   31,4 |   1,5 |            |           |
| 20      |  0,55 |  2,5 |     35,9 |  24,9 |   28,4 |  10,8 |            |           |
| 21      |  0,55 |  3,0 |     32,8 |  22,7 |   26,0 |  18,5 |            |           |
| 22      |  0,55 |  3,5 |     30,2 |  20,9 |   23,9 |  25,0 |            |           |
| 23      |  0,55 |  4,0 |     28,0 |  19,4 |   22,1 |  30,5 |            |           |
| 24      |  0,55 |  4,5 |     26,1 |  18,1 |   20,6 |  35,3 |            |           |

Mješavine za probne pločice u aplikaciji Glazecalc izrađuju trokute i kvadrate od 3 do 66 pločica, a ne ovu mrežu; otvorite bilo koju pločicu kao recept na [stranici recepta](/recipe) i odande ispišite popis za vaganje.

## Izvori {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): šest susreta.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: datumi i teme susreta.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: zadaci nastavnog tečaja s 42, 90 i 78 glazura u oksidaciji i redukciji.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): vlastiti program centra za izračun.
- Bilecik Şeyh Edebali University, [informacije o kolegiju SCT305](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Segerova formula u tjednima 5, 6 i 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, str. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): izračun glazura za školske nastavnike na Tajvanu.
- Glendale Community College, opis kolegija ART 195: Segerova formula u tjednima 5 – 7 od 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analiza sirovine 福島長石 u biblioteci aplikacije Glazecalc.
- IUPAC, standardne atomske mase, kako ih koristi kemija u aplikaciji Glazecalc.
