---
title: Glazūru aprēķinu mācīšana
lead: 6 nodarbības grupai vai mācību pulciņam, no izejvielām un trīsstūra provēm līdz Zēgera formulai abos virzienos un glazūras defektiem, katrai ar aprēķina piemēru, darbībām lietotnē Glazecalc, drukājamu darba lapu un pārbaudes jautājumiem.
---

## Par šo komplektu {#about}

Šis komplekts paredzēts ikvienam, kas māca glazūru aprēķinus: skolai, darbnīcas nodarbībai, strādājošu keramiķu mācību grupai vai keramiķim, kas mācās viens. Tajā ir sešas nodarbības, un katrai ir mērķi, sagatavošanās, aprēķina piemērs ar īstām izejvielām, darbības lietotnē Glazecalc, darba lapa un pārbaudes jautājumi.

Nodarbību secība atbilst publicētai mācību grupai: Japānas Ibaraki prefektūras Rūpniecības tehnoloģiju centra 陶磁器釉薬技術研究会 (keramikas glazūru izpētes grupai), kas 2015. gadā novadīja sešas nodarbības 12 jauno keramiķu grupai un aprakstīja tās savā pētījumu ziņojumā. Tās turpinājuma kurss Kasamas keramikas mākslas koledžā uzdeva trīs provju uzdevumus ar glazūru skaitu 42, 90 un 78, katru apdedzinot oksidējošā un reducējošā vidē. **Lietotne Glazecalc nav saistīta ne ar centru, ne ar koledžu.** Mēs sekojam viņu publicētā plāna secībai un to citējam tālāk; teksts, piemēri un darba lapas šeit ir mūsu pašu. Citu valstu kursos tās pašas darbības māca gandrīz tādā pašā secībā: Bilecik Şeyh Edebali universitātes SCT305 Turcijā, Glendale Community College ART 195 ASV, Reinzemes-Pfalces mācību programma keramikas skolām Vācijā un 李堅萍 2006. gada raksts skolotājiem Taivānā.

Table: Sešas nodarbības
Label: Sešas nodarbības

| Nodarbība | Tēma                                                                      | Lietotnē Glazecalc                     |
| --------- | ------------------------------------------------------------------------- | -------------------------------------- |
| 1         | Izejvielas, ko tās dara, trīsstūra provju sērijas                         | Izejvielas, Maisījumi provēm (trīsasu) |
| 2         | Ķīmija: elementi, formulas, moli                                          | Izejvielas lapa                        |
| 3         | Zēgera formulas lasīšana, silīcija dioksīda un alumīnija oksīda diagramma | Receptes lapa, Stala diagramma         |
| 4         | No receptes līdz Zēgera formulai                                          | Kā tiek aprēķināta Zēgera formula      |
| 5         | No Zēgera formulas līdz receptei                                          | Risināšana pēc mērķa                   |
| 6         | Masa un glazūras defekti                                                  | Robežvērtības, Salīdzināt              |

### Kā to izmantot

- Katra nodarbība ilgst apmēram 2 stundas. Nodarbībām 4 un 5 vajadzīgi kalkulatori un katram pārim dators vai tālrunis ar lietotni Glazecalc.
- Aprēķina piemēros izmantotas Japānā pārdotās izejvielas un lietotnes Glazecalc standarta bibliotēkas skaitļi: 福島長石 (Fukušimas laukšpats), krīts (石灰石, kalcija karbonāts){{en: whiting}}, kaolīns un kvarcs (珪石). Ja jums ir sava piegādātāja analīze, izmantojiet to: pievienojiet to lapā [Izejvielas](/material), un skaitļi mainīsies, bet metode ne.
- Apdedzināšana notiek līdz SK 8, nominālā temperatūra {{2282 °F; 1250 °C}}. Izmantojiet konusu, līdz kuram apdedzina jūsu grupa; SK numurus paskaidro [Apdedzināšana pēc SK konusiem](/guides/firing#sk-cones).
- Lai izdrukātu darba lapu vai provju izkārtojumu, drukājiet šo lapu no pārlūkprogrammas. Recepšu, provju maisījumu un piezīmju saglabāšanai vajadzīgs bezmaksas konts.

> [!WARNING]
> Nodarbības 1, 3 un 6 ir praktiski laboratorijas darbi: tajās sver sausas izejvielas un apdedzina. Pirms kāds sāk svērt izejvielas, izlasiet [Svarīgākie paradumi](/guides/safe-mixing#habits). Sausas glazūras putekļi ir galvenā bīstamība.

## Nodarbība 1: Izejvielas un trīsstūra provju sērijas {#materials}

> [!WARNING]
> Sausas izejvielas sveriet uzmanīgi, uzkopiet mitrā veidā un, kamēr pulveri ir sausi, valkājiet pareizi pieguļošu respiratoru. Vispirms izlasiet [Galvenā bīstamība: putekļi](/guides/safe-mixing#the-main-hazard) un [Respiratori](/guides/safe-mixing#respirators).

### Mērķi

- Nosaukt trīs uzdevumus glazūrā: stikla veidotājs, kusnis{{en: flux}} un stabilizators.
- Sašķirot 4 izplatītas izejvielas pēc oksīdiem, ko tās dod.
- Izveidot trīsstūra provju sēriju un lasīt tās proves kā karti.

### Sagatavošanās

- Pa vienam maisiņam ar 福島長石, krītu, kaolīnu un kvarcu vai ar izejvielām, kas ir jūsu grupai.
- Zemāk redzamais [trīsstūra provju izkārtojums](#tile-maps), izdrukāts, un 21 prove uz vienu cilvēku katram trīsstūrim.
- Apdedzinātas proves no iepriekšējas trīsstūra provju sērijas, ja tādas ir, ko nodot apskatei.

### Aprēķina piemērs

Katras izejvielas analīze no lietotnes Glazecalc bibliotēkas norāda, kādi oksīdi tai paliek pēc apdedzināšanas. Karsēšanas zudumi ir tas, kas izdeg.

Table: Četras izejvielas un tas, ko tās dod (masas procenti, no bibliotēkas)
Label: Četras izejvielas

| Izejviela            | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO | Karsēšanas zudumi | Uzdevums                                             |
| -------------------- | ---: | ----: | ----: | ---: | ----: | ----------------: | ---------------------------------------------------- |
| 福島長石 (laukšpats) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |              0,18 | Kusnis ar savu alumīnija oksīdu un silīcija dioksīdu |
| Krīts (石灰石)       |    – |     – |     – |    – | 56,03 |             43,97 | Kusnis (kalcijs)                                     |
| EPK Kaolin           | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |              13,9 | Stabilizators: galvenais alumīnija oksīda avots      |
| Kvarcs (珪石)        |  100 |     – |     – |    – |     – |                 – | Stikla veidotājs                                     |

Apdedzinot līdz SK 8, laukšpats vien izkūst par stigru stiklu; krīts vien neizkūst; kvarcs vien neizkūst. Sajaukti tie kūst daudz labāk nekā jebkurš no tiem atsevišķi. Trīsstūra provju sērija parāda, kur tieši: zemāk redzamajā izkārtojumā šie trīs mainās ar ~20% soli (18 no 90), un katrā provē ir 10% kaolīna.

::shops

### Lietotnē Glazecalc

1. Atveriet katru izejvielu lapā [Izejvielas](/material) vai tās publiskajā lapā, piemēram, [Fukushima Feldspar](/materials/fukushima-feldspar). Pierakstiet, kādus oksīdus tā dod.
2. Izveidojiet trīs receptes: 福島長石 90 ar kaolīnu 10, krīts 90 ar kaolīnu 10 un kvarcs 90 ar kaolīnu 10. Lapā [Maisījumi provēm](/blends) izvēlieties **Trīsasu (3 receptes)** un 6 rindas: tās ir 21 prove, tāpat kā zemāk redzamajā izkārtojumā.
3. Izvēlieties porciju katrai provei un ar **Drukāt** izdrukājiet, ko nosvērt. Pēc apdedzināšanas saglabājiet sev tīkamās proves kā receptes no provju zīmējuma.

### Darba lapa

Table: Darba lapa 1: ko dod katra izejviela
Label: Darba lapa 1

| Izejviela | Oksīdi, ko tā dod | Stikla veidotājs, kusnis vai stabilizators? | Karsēšanas zudumi (%) |
| --------- | ----------------- | ------------------------------------------- | --------------------- |
| 福島長石  |                   |                                             |                       |
| Krīts     |                   |                                             |                       |
| Kaolīns   |                   |                                             |                       |
| Kvarcs    |                   |                                             |                       |

### Pārbaude

- Kura izejviela dod lielāko daļu alumīnija oksīda, un kāpēc glazūrai tas vajadzīgs?
- Kāpēc trīsstūra krīta stūris viens pats neizkūst?
- Kur uz trīsstūra jūsu proves izkusa vislabāk, un kuram stūrim tas bija vistuvāk?

## Nodarbība 2: Nepieciešamā ķīmija {#chemistry}

### Mērķi

- Lasīt ķīmisko formulu: SiO₂, CaO, Al₂O₃, CaCO₃.
- Aprēķināt molmasu no atommasām.
- Pārvērst gramus molos un atpakaļ.

### Sagatavošanās

- Periodiskā tabula katram cilvēkam un kalkulatori.
- Atommasas zemāk esošajā tabulā (IUPAC standartvērtības, kādas lieto lietotne Glazecalc).

### Aprēķina piemērs

Table: Šeit lietotās atommasas (g/mol)
Label: Atommasas

| Elements  | Simbols | Atommasa |
| --------- | ------- | -------: |
| Skābeklis | O       |   15,999 |
| Ogleklis  | C       |   12,011 |
| Nātrijs   | Na      |    22,99 |
| Alumīnijs | Al      |   26,982 |
| Silīcijs  | Si      |   28,085 |
| Kālijs    | K       |   39,098 |
| Kalcijs   | Ca      |   40,078 |

Formula uzskaita atomus. SiO₂ ir viens silīcija atoms un divi skābekļa atomi, tāpēc viens mols tā sver 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ ir 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO ir 56,077 g, bet krīts, CaCO₃, ir 100,086 g; lietotnes Glazecalc bibliotēka to noapaļo līdz 100,08.

**Mols** ir skaits, kā ducis: vienāds molekulu skaits neatkarīgi no tā, kādas tās ir. Moli ir grami ÷ molmasa:

- 25 g kvarca ir 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g krīta ir 20 ÷ 100,08 = 0,200 mol. Krāsnī tas zaudē savu oglekļa dioksīdu (CO₂, 44,009 g/mol) un paliek 0,200 mol CaO, kas sver 0,200 × 56,077 = 11,2 g. Šis zudums ir tā karsēšanas zudumi: 43,97%.

### Lietotnē Glazecalc

1. Atveriet [Whiting](/materials/whiting) un [Silica](/materials/silica): katras lapā ir formula un tās masas.
2. Vienu molmasu pārbaudiet ar rokām, salīdzinot ar lapā redzamo.

### Darba lapa

Table: Darba lapa 2: molmasa un moli
Label: Darba lapa 2

| Oksīds vai izejviela | Formula | Molmasa (g/mol) | Grami | Moli |
| -------------------- | ------- | --------------- | ----- | ---- |
| Silīcija dioksīds    | SiO₂    |                 | 30    |      |
| Alumīnija oksīds     | Al₂O₃   |                 | 10    |      |
| Kalcija oksīds       | CaO     |                 | 5     |      |
| Krīts                | CaCO₃   |                 | 15    |      |

### Pārbaude

- Cik gramu sver viens mols SiO₂, un kā to aprēķina?
- Kāpēc 20 g krīta apdedzinātā glazūrā atstāj mazāk nekā 20 g?
- Kāpēc oksīdus salīdzina molos, nevis gramos?

## Nodarbība 3: Zēgera formulas lasīšana {#reading-the-formula}

> [!WARNING]
> Glazūras krāsošana nozīmē krāsvielu svēršanu, un dažām no tām vajadzīga lielāka piesardzība nekā pamatizejvielām. Vispirms izlasiet [Izejvielas, kam vajadzīga vislielākā piesardzība](/guides/safe-mixing#materials).

### Mērķi

- Lasīt Zēgera formulas{{en: unity formula}} (ゼーゲル式) trīs kolonnas: kušņi, stabilizators, stikla veidotājs.
- Atrast glazūru silīcija dioksīda un alumīnija oksīda diagrammā un zināt, ko diagramma var un ko nevar pateikt.
- Pakāpeniski nokrāsot gatavu glazūru un to pierakstīt.

### Sagatavošanās

- Zemāk redzamā Zēgera formula, uzrakstīta lielā formātā.
- Gatava caurspīdīga glazūra un krāsviela, piemēram, sarkanais dzelzs oksīds (弁柄).

### Aprēķina piemērs

Nodarbības 4 glazūrai (福島長石 45, krīts 20, kaolīns 10 un kvarcs 25) ir šāda Zēgera formula (lietotnes Glazecalc skaitļi, noapaļoti):

Table: Zēgera formula trijās kolonnās
Label: Zēgera formula

| Kušņi (RO, R₂O) | Stabilizators (R₂O₃) | Stikla veidotājs (RO₂) |
| --------------- | -------------------- | ---------------------- |
| K₂O 0,18        | Al₂O₃ 0,43           | SiO₂ 3,45              |
| Na₂O 0,10       |                      |                        |
| CaO 0,72        |                      |                        |

- Kušņu summa ir 1: tāds ir formulas noteikums. Katrs pārējais skaitlis ir moli uz vienu molu kušņu.
- Silīcija dioksīda un alumīnija oksīda attiecība ir 3,45 ÷ 0,43, apmēram 8: tipiska spīdīga glazūra.
- Lielāko daļu kušņu veido kalcijs, tāpat kā vairumā Japānas kalcija glazūru (石灰釉).

Diagramma, kurā silīcija dioksīds ir horizontālajā asī un alumīnija oksīds vertikālajā, ikvienu glazūru attēlo kā punktu. Zēgera izmēģinājumi un Stala 1912. gada diagramma ir šāda veida, un 釉性状図 uz tās attēlo grupas paša apdedzinātās proves. Lietotnes Glazecalc receptes lapa zīmē Stala diagrammu, un šī glazūra atrodas tās spīdīgajā apgabalā. Stala apgabali radušies no viņa paša kušņiem un apdedzināšanas: tas ir orientieris, nevis prognoze. Zemāk redzamais [provju režģis](#tile-maps) ļauj grupai uzzīmēt pašai savu diagrammu savā apdedzināšanā.

::stull-chart

Ja gatavai glazūrai, kuras recepti nezināt, vēlaties mainīt krāsu, lietotne Glazecalc tās formulu aprēķināt nevar. Tā vietā krāsvielu pievienojiet papildus šiem 100: 100 g sausas glazūras ar 1, 2 un 3 g dzelzs oksīda, katrai pa vienai provei, apdedzinot oksidējošā un reducējošā vidē.

### Lietotnē Glazecalc

1. [Receptes lapā](/recipe) ievadiet iepriekš minēto recepti un izlasiet sadaļas **Zēgera formula** un **Stala diagramma**.
2. Nomainiet kvarcu no 25 uz 35 un vērojiet, kā punkts pārvietojas pa labi.
3. Pamatglazūrai, kuras recepti zināt, krāsvielu ierakstiet kā piedevu un tās pakāpenisku maiņu veidojiet ar provju rindu lapā [Maisījumi provēm](/blends).

### Darba lapa

Table: Darba lapa 3: krāsviela gatavā glazūrā
Label: Darba lapa 3

| Prove | Krāsviela (g uz 100 g) | Oksidējošā vide: kā izskatās | Reducējošā vide: kā izskatās |
| ----- | ---------------------- | ---------------------------- | ---------------------------- |
| 1     | 0                      |                              |                              |
| 2     | 1                      |                              |                              |
| 3     | 2                      |                              |                              |
| 4     | 3                      |                              |                              |

### Pārbaude

- Kura Zēgera formulas kolonna dod summu 1?
- Kāda ir šīs glazūras silīcija dioksīda un alumīnija oksīda attiecība, un uz ko tā norāda?
- Kāpēc punkts diagrammas spīdīgajā apgabalā jūsu krāsnī tomēr var dot matētu provi?

## Nodarbība 4: No receptes līdz Zēgera formulai {#recipe-to-formula}

### Mērķi

- Aprēķināt Zēgera formulu no receptes ar rokām.
- Salīdzināt to ar lietotnes Glazecalc paša aprēķinu.

### Sagatavošanās

- Darba lapa 4, četras analīzes no nodarbības 1 un kalkulatori.

### Aprēķina piemērs

Recepte: 福島長石 45, krīts 20, EPK kaolīns 10, kvarcs 25. Uzskatiet katru daudzumu par gramiem. Katrai izejvielai grami × oksīda procents ÷ 100 ÷ tās molmasa dod molus. Tabulā ir galvenie oksīdi; lietotne Glazecalc ieskaita arī niecīgos piemaisījumus (kaolīna dzelzi un titānu, laukšpata magniju).

Table: Katra oksīda moli porcijā (100 g)
Label: Moli porcijā

| Izejviela | Grami |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| --------- | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石  |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Krīts     |    20 |      – |      – | 0,1998 |      – |      – |
| Kaolīns   |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvarcs    |    25 |      – |      – |      – |      – | 0,4161 |
| Kopā      |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Kušņu summa ir 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnija oksīds) = 0,2847 mol. Daliet katru kopsummu ar to:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Tā ir nodarbības 3 formula.

### Lietotnē Glazecalc

1. Ievadiet recepti [receptes lapā](/recipe).
2. Atveriet **Kā tiek aprēķināta Zēgera formula**. Tajā ar šīs receptes skaitļiem redzami šie soļi: grami, katra oksīda moli katrā izejvielā, kopsummas un dalīšana ar kušņiem.
3. Salīdziniet katru rindu ar savu darba lapu. Pēc tam mainiet vienu daudzumu un aprēķiniet tikai to kolonnu, ko tas maina.

### Darba lapa

Table: Darba lapa 4: no receptes līdz Zēgera formulai
Label: Darba lapa 4

| Izejviela | Grami | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| --------- | ----- | --- | ---- | --- | ----- | ---- |
|           |       |     |      |     |       |      |
|           |       |     |      |     |       |      |
|           |       |     |      |     |       |      |
|           |       |     |      |     |       |      |
| Kopā      |       |     |      |     |       |      |
| ÷ kušņi   |       |     |      |     |       |      |

### Pārbaude

- Kāpēc jebkurš porcijas lielums dod vienu un to pašu Zēgera formulu?
- Kādus oksīdus dod kaolīns, un kurš no tiem šeit ir svarīgākais?
- Kāpēc krīta karsēšanas zudumi formulā nav ieskaitīti?

## Nodarbība 5: No Zēgera formulas līdz receptei {#formula-to-recipe}

### Mērķi

- Izvēlēties izejvielas mērķa formulai un aprēķināt, cik no katras vajadzīgs.
- Izmantot sadaļu Risināšana pēc mērķa un pateikt, cik tuvu tā nonāk.

### Sagatavošanās

- Zemāk redzamais mērķis, darba lapa 5 un kalkulatori; lietotne Glazecalc ar kontu.

### Aprēķina piemērs

Mērķis: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ un 4,0 SiO₂. Izejvielas ņemiet šādā secībā, katru tam oksīdam, ko var dot tikai tā:

1. **Laukšpats – kālijam un nātrijam.** Viena 福島長石 vienība (536,8 g, svars, kas satur vienu molu kušņu) dod 0,94 mol K₂O un Na₂O. Mērķim vajag 0,3, tātad 0,3 ÷ 0,94 = 0,319 vienības: 171,4 g. Tā dod arī 0,015 CaO, 0,328 Al₂O₃ un 1,865 SiO₂.
2. **Krīts – atlikušajam kalcijam.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolīns – atlikušajam alumīnija oksīdam.** 0,4 − 0,328 = 0,072 mol. EPK kaolīns satur vienu molu Al₂O₃ 272,6 g, tātad 19,6 g, kas dod arī 0,149 SiO₂.
4. **Kvarcs – pārējam.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Porcija ir 379,0 g. Procentos: 福島長石 45,2, krīts 18,1, kaolīns 5,2, kvarcs 31,5. Laukšpats nosaka kālija un nātrija attiecību, tāpēc recepte dod 0,195 K₂O un 0,104 Na₂O: tuvu mērķim, bet ne tieši tā.

### Lietotnē Glazecalc

1. Atveriet [Risināšana pēc mērķa](/solve), izvēlieties **Zēgera formula (moli, kušņi kopā dod 1)** un ierakstiet mērķi.
2. Sadaļā **Izejvielas** norādiet 福島長石, krītu, EPK kaolīnu un kvarcu un izvēlieties **Atrisināt**.
3. Tā dod: 福島長石 44,9, krīts 18,2, kaolīns 5,6 un kvarcs 31,3, kā arī tabulu, cik tuvu nonāk katrs oksīds. Salīdziniet to ar savu aprēķinu ar rokām: risinātājs ņem vērā katru niecīgo piemaisījumu un atrod vislabāko atbilstību, ko šīs četras izejvielas ļauj.
4. Izvēlieties **Atvērt kā jaunu recepti** un pārbaudiet to receptes lapā.

### Darba lapa

Table: Darba lapa 5: no mērķa līdz receptei
Label: Darba lapa 5

| Solis | Izejviela | Kuram oksīdam | Vajadzīgie moli | Grami | Dod arī |
| ----- | --------- | ------------- | --------------- | ----- | ------- |
| 1     |           |               |                 |       |         |
| 2     |           |               |                 |       |         |
| 3     |           |               |                 |       |         |
| 4     |           |               |                 |       |         |

### Pārbaude

- Kāpēc laukšpats jāaprēķina pirmais?
- Kāpēc šīs četras izejvielas nevar dot tieši 0,2 K₂O un 0,1 Na₂O?
- Ko jūs pievienotu izejvielām, lai ienestu magnija oksīdu?

## Nodarbība 6: Masa un glazūras defekti {#body-and-defects}

> [!WARNING]
> No apdedzinātas glazūras pārtikā un dzērienos var izdalīties metāli, un glazūra var izskatīties nevainojama, kamēr tas notiek. Glazūras ar lielu bārija daudzumu vai ar varu un jebkura glazūra ar svinu var izskaloties. Tikai apdedzinātā trauka metālu izskalošanās laboratorijas pārbaude{{en: leach test}} parāda, ko tas izdala; neviens aprēķins to nespēj. Izlasiet [Drošība saskarē ar pārtiku](/guides/glazing-basics#food-safety) un [Izejvielas, kam vajadzīga vislielākā piesardzība](/guides/safe-mixing#materials).

### Mērķi

- Izmērīt masas saraušanos un ūdens uzsūkšanos.
- Nosaukt izplatītākos defektus, to parastos cēloņus un pirmo labojumu.
- Zināt, kuri defekti padara izstrādājumus nedrošus.

### Sagatavošanās

- Jūsu mālu masas testa stienīši, mitrā stāvoklī atzīmēti ar 100 mm atstarpi, apdedzināti un neapdedzināti.
- Proves ar defektiem, ja tādas ir: matplaisas, glazūras savilkšanās, adatas dūrieni, notecēšana.

### Aprēķina piemērs

- **Saraušanās**: (atzīmētais garums − garums pēc apdedzināšanas) ÷ atzīmētais garums × 100. Atzīmes ar 100 mm atstarpi, kas pēc apdedzināšanas mēra 88 mm: saraušanās 12%.
- **Ūdens uzsūkšanās**: (masa pēc iemērcēšanas − sausā masa) ÷ sausā masa × 100. Apdedzināts 50,0 g stienītis, kas pēc iemērcēšanas sver 50,6 g: 1,2%.

Table: Defekti, cēloņi un pirmais labojums Zēgera formulā
Label: Defekti

| Defekts              | Parastais cēlonis                                   | Pirmais mēģināmais labojums                                |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Matplaisas           | Glazūra saraujas vairāk nekā masa                   | Mazāk K₂O un Na₂O; vairāk kalcija, magnija oksīda vai bora |
| Glazūras atšķelšanās | Glazūra saraujas daudz mazāk nekā masa              | Vairāk K₂O un Na₂O                                         |
| Notecēšana           | Pārāk maz alumīnija oksīda vai pārāk bieza kārta    | Vairāk alumīnija oksīda; plānāka kārta                     |
| Glazūras savilkšanās | Putekļains biskvīts vai bieza kārta, kas ieplaisāja | Biskvīta notīrīšana; plānāka kārta                         |
| Adatas dūrieni       | Gāze, pēc kuras palikušie caurumiņi nav aizdzijuši  | Noturēšana apdedzināšanas maksimumā; plānāka kārta         |

[Glazūras un masas saderība un defekti](/guides/glazing-basics#fit-and-defects) skaidro katru no tiem, kā arī ledus ūdens pārbaudi matplaisām. Neizmantojiet ēdienam vai dzērienam izstrādājumus, kuriem ir matplaisas vai glazūras atšķelšanās.

::food-limits

### Lietotnē Glazecalc

1. Savai glazūrai [receptes lapā](/recipe) izlasiet paneli **Robežvērtības** un tās aprēķināto termisko izplešanos.
2. Nokopējiet recepti, daļu laukšpata nomainiet pret krītu un salīdziniet abas: uz kuru pusi pārvietojās izplešanās?

### Darba lapa

Table: Darba lapa 6: mālu masa
Label: Darba lapa 6

| Stienītis | Atzīmētais garums (mm) | Garums pēc apdedzināšanas (mm) | Saraušanās (%) | Sausā masa (g) | Masa pēc iemērcēšanas (g) | Uzsūkšanās (%) |
| --------- | ---------------------- | ------------------------------ | -------------- | -------------- | ------------------------- | -------------- |
| 1         | 100                    |                                |                |                |                           |                |
| 2         | 100                    |                                |                |                |                           |                |

### Pārbaude

- Kurš defekts rodas no glazūras, kas saraujas vairāk nekā tās masa, un kāds ir pirmais labojums?
- Kāpēc izstrādājumus ar atšķeltu glazūru nekad nedrīkst lietot ēdienam?
- Vai aprēķins var pateikt, ka glazūra ir droša saskarei ar pārtiku? Kas to var?

## Provju izkārtojumi drukāšanai {#tile-maps}

### Trīsstūra izkārtojums: 42 glazūras

Divi trīsstūri ar 21 provi katrs, no maisījumu lapas izkārtojuma ar 6 rindām: prove 1 augšā (laukšpats), apakšējā rinda no krīta (pa kreisi) līdz kvarcam (pa labi). II trīsstūris ir I trīsstūris ar 1 g sarkanā dzelzs oksīda papildus katriem 100 g, kas reducējošā vidē pāriet uz seladona (青磁) pusi. Apdedzinot oksidējošā un reducējošā vidē, tās ir 84 proves. Daudzumi ir grami uz 100 g.

Table: Trīsstūra izkārtojums: 福島長石, krīts un kvarcs, katrā provē 10 kaolīna
Label: Trīsstūra izkārtojums

| Prove (I) | Prove (II) | 福島長石 | Krīts | Kvarcs | Kaolīns | I oksidējošā | I reducējošā | II oksidējošā | II reducējošā |
| --------- | ---------- | -------: | ----: | -----: | ------: | ------------ | ------------ | ------------- | ------------- |
| 1         | 22         |       90 |     0 |      0 |      10 |              |              |               |               |
| 2         | 23         |       72 |    18 |      0 |      10 |              |              |               |               |
| 3         | 24         |       72 |     0 |     18 |      10 |              |              |               |               |
| 4         | 25         |       54 |    36 |      0 |      10 |              |              |               |               |
| 5         | 26         |       54 |    18 |     18 |      10 |              |              |               |               |
| 6         | 27         |       54 |     0 |     36 |      10 |              |              |               |               |
| 7         | 28         |       36 |    54 |      0 |      10 |              |              |               |               |
| 8         | 29         |       36 |    36 |     18 |      10 |              |              |               |               |
| 9         | 30         |       36 |    18 |     36 |      10 |              |              |               |               |
| 10        | 31         |       36 |     0 |     54 |      10 |              |              |               |               |
| 11        | 32         |       18 |    72 |      0 |      10 |              |              |               |               |
| 12        | 33         |       18 |    54 |     18 |      10 |              |              |               |               |
| 13        | 34         |       18 |    36 |     36 |      10 |              |              |               |               |
| 14        | 35         |       18 |    18 |     54 |      10 |              |              |               |               |
| 15        | 36         |       18 |     0 |     72 |      10 |              |              |               |               |
| 16        | 37         |        0 |    90 |      0 |      10 |              |              |               |               |
| 17        | 38         |        0 |    72 |     18 |      10 |              |              |               |               |
| 18        | 39         |        0 |    54 |     36 |      10 |              |              |               |               |
| 19        | 40         |        0 |    36 |     54 |      10 |              |              |               |               |
| 20        | 41         |        0 |    18 |     72 |      10 |              |              |               |               |
| 21        | 42         |        0 |     0 |     90 |      10 |              |              |               |               |

### Zēgera režģis: 24 glazūras

Katrai provei ir vieni un tie paši kušņi, 0,2 KNaO un 0,8 CaO, no 福島長石 un krīta. Alumīnija oksīds palielinās režģī no rindas uz rindu uz leju, un silīcija dioksīds palielinās no kolonnas uz kolonnu pa labi. Receptes aprēķinātas pēc nodarbības 5 metodes; lietotnes Glazecalc aprēķinātā katras receptes Zēgera formula atšķiras ne vairāk kā par 0,01 alumīnija oksīda un par 0,06 silīcija dioksīda daudzumā. Atzīmējiet katru provi silīcija dioksīda un alumīnija oksīda diagrammā un uzzīmējiet savus apgabalus: matēts, spīdīgs, nepietiekami apdedzināts, notecējis.

Table: Zēgera režģis: 0,2 KNaO, 0,8 CaO, masas procenti
Label: Zēgera režģis

| Prove | Al₂O₃ | SiO₂ | 福島長石 | Krīts | Kaolīns | Kvarcs | Oksidējošā | Reducējošā |
| ----- | ----: | ---: | -------: | ----: | ------: | -----: | ---------- | ---------- |
| 1     |  0,25 |  2,0 |     46,9 |  32,5 |     3,5 |   17,1 |            |            |
| 2     |  0,25 |  2,5 |     41,8 |  28,9 |     3,1 |   26,2 |            |            |
| 3     |  0,25 |  3,0 |     37,6 |  26,1 |     2,8 |   33,5 |            |            |
| 4     |  0,25 |  3,5 |     34,3 |  23,7 |     2,5 |   39,5 |            |            |
| 5     |  0,25 |  4,0 |     31,4 |  21,7 |     2,3 |   44,5 |            |            |
| 6     |  0,25 |  4,5 |     29,0 |  20,1 |     2,2 |   48,7 |            |            |
| 7     |  0,35 |  2,0 |     44,3 |  30,6 |    13,9 |   11,3 |            |            |
| 8     |  0,35 |  2,5 |     39,6 |  27,4 |    12,4 |   20,5 |            |            |
| 9     |  0,35 |  3,0 |     35,9 |  24,8 |    11,2 |   28,0 |            |            |
| 10    |  0,35 |  3,5 |     32,8 |  22,7 |    10,3 |   34,2 |            |            |
| 11    |  0,35 |  4,0 |     30,2 |  20,9 |     9,5 |   39,5 |            |            |
| 12    |  0,35 |  4,5 |     28,0 |  19,4 |     8,8 |   43,9 |            |            |
| 13    |  0,45 |  2,0 |     41,9 |  29,0 |    23,1 |    6,1 |            |            |
| 14    |  0,45 |  2,5 |     37,7 |  26,1 |    20,8 |   15,4 |            |            |
| 15    |  0,45 |  3,0 |     34,3 |  23,7 |    18,9 |   23,0 |            |            |
| 16    |  0,45 |  3,5 |     31,5 |  21,8 |    17,4 |   29,4 |            |            |
| 17    |  0,45 |  4,0 |     29,1 |  20,1 |    16,0 |   34,8 |            |            |
| 18    |  0,45 |  4,5 |     27,0 |  18,7 |    14,9 |   39,4 |            |            |
| 19    |  0,55 |  2,0 |     39,7 |  27,5 |    31,4 |    1,5 |            |            |
| 20    |  0,55 |  2,5 |     35,9 |  24,9 |    28,4 |   10,8 |            |            |
| 21    |  0,55 |  3,0 |     32,8 |  22,7 |    26,0 |   18,5 |            |            |
| 22    |  0,55 |  3,5 |     30,2 |  20,9 |    23,9 |   25,0 |            |            |
| 23    |  0,55 |  4,0 |     28,0 |  19,4 |    22,1 |   30,5 |            |            |
| 24    |  0,55 |  4,5 |     26,1 |  18,1 |    20,6 |   35,3 |            |            |

Lietotnes Glazecalc sadaļā Maisījumi provēm var izveidot trīsstūrus un kvadrātus (provju skaits: no 3 līdz 66), bet ne šo režģi; atveriet jebkuru provi kā recepti [receptes lapā](/recipe) un izdrukājiet tās svēršanas sarakstu no turienes.

## Avoti {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): sešas nodarbības.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: nodarbību datumi un tēmas.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: turpinājuma kursa uzdevumi (glazūru skaits: 42, 90 un 78, oksidējošā un reducējošā vidē).
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): paša centra aprēķinu programma.
- Bilecik Şeyh Edebali University, [SCT305 kursa informācija](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Zēgera formula nedēļās 5, 6 un 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): glazūru aprēķini skolotājiem Taivānā.
- Glendale Community College, ART 195 kursa apraksts: Zēgera formula nedēļās no 5 līdz 7 (no 15).
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: 福島長石 analīze lietotnes Glazecalc bibliotēkā.
- IUPAC, standarta atommasas, kādas lieto lietotnes Glazecalc ķīmija.
