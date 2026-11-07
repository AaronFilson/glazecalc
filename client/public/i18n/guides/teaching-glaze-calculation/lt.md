---
title: Glazūros skaičiavimo mokymas
lead: 6 užsiėmimai klasei ar studijų grupei: nuo žaliavų ir triašio bandinių iki Segerio formulės skaičiavimo į abi puses ir glazūros defektų. Kiekvienas turi apskaičiuotą pavyzdį, žingsnius programoje Glazecalc, spausdinamą darbo lapą ir klausimus pasitikrinti.
---

## Apie šį rinkinį {#about}

Šis rinkinys skirtas visiems, kurie moko skaičiuoti glazūras: mokyklai, studijos kursui, dirbančių keramikų studijų grupei ar keramikui, kuris mokosi vienas. Jame yra šeši užsiėmimai, o kiekvienas turi tikslus, ką paruošti, apskaičiuotą pavyzdį su tikromis žaliavomis, kaip tai padaryti programoje Glazecalc, darbo lapą ir klausimus pasitikrinti.

Užsiėmimų eilė parinkta pagal paskelbtą studijų grupę: Japonijoje, Ibarakio prefektūros pramonės technologijų centre, veikusią 陶磁器釉薬技術研究会 (keraminių glazūrų technologijų studijų grupę), kuri 2015 m. surengė šešis užsiėmimus 12 jaunų keramikų ir apie juos paskelbė savo tyrimų ataskaitoje. Tęstiniame kurse Kasamos keramikos meno kolegijoje buvo skirtos trys bandinių užduotys po 42, 90 ir 78 glazūras, kiekviena degta oksidacinėje ir redukcinėje atmosferoje. **Programa Glazecalc nesusijusi nei su centru, nei su kolegija.** Mes laikomės jų paskelbtos programos eilės ir žemiau ją cituojame; čia pateiktas tekstas, pavyzdžiai ir darbo lapai – mūsų. Kitų šalių kursai moko tų pačių žingsnių beveik ta pačia tvarka: Turkijoje – Bilecik Şeyh Edebali universiteto SCT305, JAV – Glendale Community College ART 195, Vokietijoje – Reinland-Pfalco žemės keramikos mokyklų mokymo programa, Taivane – 李堅萍 2006 m. straipsnis mokytojams.

Table: Šeši užsiėmimai
Label: Šeši užsiėmimai

| Užsiėmimas | Tema                                                                            | Programoje Glazecalc                    |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| 1          | Žaliavos, ką jos daro, triašio bandiniai                                        | Žaliavos, Mišiniai bandiniams (triašis) |
| 2          | Chemija: elementai, formulės, moliai                                            | Žaliavos puslapis                       |
| 3          | Segerio formulės (UMF) skaitymas, silicio dioksido ir aliuminio oksido diagrama | Recepto puslapis, Stullo diagrama       |
| 4          | Nuo recepto iki Segerio formulės                                                | Kaip apskaičiuojama Segerio formulė     |
| 5          | Nuo Segerio formulės iki recepto                                                | Receptas pagal tikslą                   |
| 6          | Molio masė ir glazūros defektai                                                 | Ribos, Palyginti                        |

### Kaip naudotis

- Kiekvienas užsiėmimas trunka apie 2 valandas. 4 ir 5 užsiėmimams reikia skaičiuotuvų ir kiekvienai porai – kompiuterio ar telefono su Glazecalc.
- Pavyzdžiuose naudojamos Japonijoje parduodamos žaliavos ir Glazecalc standartinės bibliotekos skaičiai: 福島長石 (Fukušimos lauko špatas{{en: feldspar}}), kreida{{en: whiting}} (石灰石, kalcio karbonatas), kaolinas{{en: kaolin}} ir kvarcas{{en: silica}} (珪石). Jei turite savo tiekėjo analizę, pridėkite ją [puslapyje Žaliavos](/material): skaičiai pasikeis, bet metodas – ne.
- Degama iki SK 8, nominalioji temperatūra {{2282 °F; 1250 °C}}. Naudokite piroskopą, iki kurio degama jūsų klasėje; apie SK numerius pasakoja skyrius [Degimas pagal SK piroskopus](/guides/firing#sk-cones).
- Norėdami atspausdinti darbo lapą ar bandinių išdėstymo schemą, spausdinkite šį puslapį iš naršyklės. Receptams, mišiniams ir užrašams įrašyti reikia nemokamos paskyros.

> [!WARNING]
> 1, 3 ir 6 užsiėmimai yra laboratoriniai darbai: sausų žaliavų svėrimas ir degimas. Prieš pradedant sverti bet kurią žaliavą, perskaitykite [Svarbiausi įpročiai](/guides/safe-mixing#habits). Sausos glazūros dulkės yra pagrindinis pavojus.

## 1 užsiėmimas: žaliavos ir triašio bandiniai {#materials}

> [!WARNING]
> Sausas žaliavas sverkite atsargiai, valykite drėgnai ir, kol milteliai sausi, dėvėkite gerai priglundantį respiratorių. Pirmiausia perskaitykite [Pagrindinis pavojus: dulkės](/guides/safe-mixing#the-main-hazard) ir [Respiratoriai](/guides/safe-mixing#respirators).

### Tikslai

- Įvardyti tris glazūros sudedamųjų dalių vaidmenis: stiklą sudarantis oksidas{{en: glass former}}, fliusas{{en: flux}} ir stabilizatorius{{en: stabilizer}}.
- Išskirstyti 4 dažnas žaliavas pagal oksidus, kuriuos jos suteikia.
- Sudaryti triašio mišinį ir skaityti jo bandinius kaip žemėlapį.

### Pasiruošimas

- Po maišą 福島長石, kreidos, kaolino ir kvarco arba jūsų klasės turimos žaliavos.
- Atspausdinta žemiau pateikta [triašio bandinių išdėstymo schema](#tile-maps) ir 21 bandinys{{en: test tile}} kiekvienam mokiniui kiekvienam trikampiui.
- Anksčiau degti triašio bandiniai, jei jų turite, kad būtų galima paduoti iš rankų į rankas.

### Apskaičiuotas pavyzdys

Kiekvienos žaliavos analizė iš Glazecalc bibliotekos parodo, kokius oksidus ji palieka po degimo. Degimo nuostoliai (LOI){{en: loss on ignition}} – tai, kas išdega.

Table: Keturios žaliavos ir ką jos suteikia (masės procentai, iš bibliotekos)
Label: Keturios žaliavos

| Žaliava                 | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Jos vaidmuo                                                 |
| ----------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ----------------------------------------------------------- |
| 福島長石 (lauko špatas) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Fliusas, turintis savo aliuminio oksido ir silicio dioksido |
| Kreida (石灰石)         |    – |     – |     – |    – | 56,03 | 43,97 | Fliusas (kalcis)                                            |
| EPK kaolinas            | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizatorius: pagrindinis aliuminio oksido šaltinis      |
| Kvarcas (珪石)          |  100 |     – |     – |    – |     – |     – | Stiklą sudarantis oksidas                                   |

Vien lauko špatas ties SK 8 išsilydo į klampų stiklą; vien kreida neišsilydo; vien kvarcas neišsilydo. Sumaišytos jos išsilydo kur kas geriau nei kuri nors viena. Triašio mišinys parodo, kur: žemiau pateiktoje bandinių schemoje trys žaliavos keičiamos ~20 % žingsniais (18 iš 90), o kiekviename bandinyje yra 10 % kaolino.

::shops

### Programoje Glazecalc

1. Atidarykite kiekvieną žaliavą [puslapyje Žaliavos](/material) arba jos viešame puslapyje, pavyzdžiui, [Fukushima Feldspar](/materials/fukushima-feldspar). Užsirašykite, kokius oksidus ji suteikia.
2. Sudarykite tris receptus: 福島長石 90 su kaolinu 10, kreida 90 su kaolinu 10 ir kvarcas 90 su kaolinu 10. Puslapyje [Mišiniai bandiniams](/blends) pasirinkite **Triašis (3 receptai)** ir 6 eilutes: gausite 21 bandinį, tiek pat, kiek žemiau pateiktoje schemoje.
3. Nustatykite kiekvieno bandinio užmaišą ir paspauskite **Spausdinti**, kad atspausdintumėte, ką pasverti. Po degimo patikusius bandinius įrašykite kaip receptus iš bandinių piešinio.

### Darbo lapas

Table: Darbo lapas 1: ką suteikia kiekviena žaliava
Label: Darbo lapas 1

| Žaliava  | Suteikiami oksidai | Stiklą sudarantis oksidas, fliusas ar stabilizatorius? | LOI (%) |
| -------- | ------------------ | ------------------------------------------------------ | ------- |
| 福島長石 |                    |                                                        |         |
| Kreida   |                    |                                                        |         |
| Kaolinas |                    |                                                        |         |
| Kvarcas  |                    |                                                        |         |

### Pasitikrinimas

- Kuri žaliava suteikia daugiausia aliuminio oksido ir kodėl jo reikia glazūrai?
- Kodėl trikampio kampas, kuriame vien kreida, pats neišsilydo?
- Kurioje trikampio vietoje jūsų bandiniai išsilydė geriausiai ir prie kurio kampo ta vieta buvo arčiausiai?

## 2 užsiėmimas: reikalinga chemija {#chemistry}

### Tikslai

- Skaityti cheminę formulę: SiO₂, CaO, Al₂O₃, CaCO₃.
- Iš atominių masių apskaičiuoti molekulinę masę.
- Gramus paversti medžiagos kiekiu (mol) ir atvirkščiai.

### Pasiruošimas

- Periodinė lentelė kiekvienam mokiniui ir skaičiuotuvai.
- Žemiau esančios lentelės atominės masės (IUPAC standartinės vertės, tokios, kokias naudoja Glazecalc).

### Apskaičiuotas pavyzdys

Table: Čia naudojamos atominės masės (g/mol)
Label: Atominės masės

| Elementas | Simbolis | Atominė masė |
| --------- | -------- | -----------: |
| Deguonis  | O        |       15,999 |
| Anglis    | C        |       12,011 |
| Natris    | Na       |        22,99 |
| Aliuminis | Al       |       26,982 |
| Silicis   | Si       |       28,085 |
| Kalis     | K        |       39,098 |
| Kalcis    | Ca       |       40,078 |

Formulė skaičiuoja atomus. SiO₂ – tai vienas silicio ir du deguonies atomai, todėl 1 mol jo masė yra 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ yra 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO yra 56,077 g, o kreida{{en: whiting}}, CaCO₃, – 100,086 g; Glazecalc bibliotekoje ji suapvalinta iki 100,08.

**Molis** (mol) – tai kiekio vienetas, panašus į tuziną: tiek pat molekulių, kad ir kokios jos būtų. Kiekis (mol) yra gramai ÷ molekulinė masė:

- 25 g kvarco{{en: silica}} yra 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g kreidos yra 20 ÷ 100,08 = 0,200 mol. Krosnyje ji netenka anglies dioksido (CO₂, 44,009 g/mol) ir lieka 0,200 mol CaO, kuris sveria 0,200 × 56,077 = 11,2 g. Šis nuostolis yra jos LOI: 43,97 %.

### Programoje Glazecalc

1. Atidarykite [Kreida](/materials/whiting) ir [Kvarcas](/materials/silica): kiekviename puslapyje nurodyta formulė ir jos masės.
2. Vieną molekulinę masę apskaičiuokite ranka ir palyginkite su puslapyje nurodyta.

### Darbo lapas

Table: Darbo lapas 2: molekulinė masė ir kiekis (mol)
Label: Darbo lapas 2

| Oksidas ar žaliava | Formulė | Molekulinė masė (g/mol) | Gramai | Kiekis (mol) |
| ------------------ | ------- | ----------------------- | ------ | ------------ |
| Silicio dioksidas  | SiO₂    |                         | 30     |              |
| Aliuminio oksidas  | Al₂O₃   |                         | 10     |              |
| Kalcio oksidas     | CaO     |                         | 5      |              |
| Kreida             | CaCO₃   |                         | 15     |              |

### Pasitikrinimas

- Kiek gramų sveria 1 mol SiO₂ ir kaip tai apskaičiuojama?
- Kodėl iš 20 g kreidos išdegusioje glazūroje lieka mažiau nei 20 g?
- Kodėl oksidus lyginame pagal kiekį (mol), o ne pagal gramus?

## 3 užsiėmimas: Segerio formulės skaitymas {#reading-the-formula}

> [!WARNING]
> Glazūros spalvinimas reiškia dažiklių svėrimą, o kai kurioms iš jų reikia daugiau atsargumo nei pagrindinėms žaliavoms. Pirmiausia perskaitykite [Žaliavos, su kuriomis reikia elgtis atsargiausiai](/guides/safe-mixing#materials).

### Tikslai

- Perskaityti tris Segerio formulės{{en: unity formula}} stulpelius (ゼーゲル式, Segerio formulė): fliusus, stabilizatorių, stiklą sudarantį oksidą.
- Rasti glazūrą silicio dioksido ir aliuminio oksido diagramoje ir žinoti, ką diagrama gali ir ko negali pasakyti.
- Palaipsniui nuspalvinti paruoštą glazūrą ir tai užfiksuoti.

### Pasiruošimas

- Žemiau pateikta Segerio formulė, užrašyta stambiai.
- Paruošta skaidri glazūra ir dažiklis, pavyzdžiui, raudonasis geležies oksidas (弁柄).

### Apskaičiuotas pavyzdys

4 užsiėmimo glazūros – 福島長石 45, kreida 20, kaolinas 10 ir kvarcas 25 – Segerio formulė tokia (Glazecalc skaičiai, suapvalinti):

Table: Segerio formulė trijuose stulpeliuose
Label: Segerio formulė

| Fliusai (RO, R₂O) | Stabilizatorius (R₂O₃) | Stiklą sudarantis oksidas (RO₂) |
| ----------------- | ---------------------- | ------------------------------- |
| K₂O 0,18          | Al₂O₃ 0,43             | SiO₂ 3,45                       |
| Na₂O 0,10         |                        |                                 |
| CaO 0,72          |                        |                                 |

- Fliusų suma lygi 1: tokia yra formulės taisyklė. Kiekvienas kitas skaičius rodo kiekį (mol) 1 mol fliusų.
- Silicio dioksido ir aliuminio oksido santykis yra 3,45 ÷ 0,43, apie 8: tipinė blizgi glazūra.
- Didžiąją fliusų dalį sudaro kalcis, kaip daugumoje Japonijos kalkinių glazūrų (石灰釉).

Diagrama, kurios horizontalioje ašyje yra silicio dioksidas, o vertikalioje – aliuminio oksidas, kiekvieną glazūrą pažymi tašku. Segerio bandymai ir Stullo 1912 m. diagrama yra tokio tipo, o 釉性状図 ant jos užneša paties kurso išdegtus bandinius. Glazecalc recepto puslapyje nubraižoma Stullo diagrama, ir ši glazūra patenka į jos blizgią sritį. Stullo sritys gautos iš jo paties fliusų ir degimo: tai orientyras, o ne prognozė. Žemiau esantis [bandinių tinklelis](#tile-maps) leidžia kursui nubraižyti savo diagramą pagal savo degimą.

::stull-chart

Jei norite nuspalvinti paruoštą glazūrą, kurios recepto nežinote, Glazecalc negali apskaičiuoti jos formulės. Vietoj to dažiklį pridėkite papildomai prie 100: 100 g sausos glazūros su 1, 2 ir 3 g geležies oksido, po vieną bandinį, degtus oksidacinėje{{en: oxidation}} ir redukcinėje{{en: reduction}} atmosferoje.

### Programoje Glazecalc

1. [Recepto puslapyje](/recipe) įveskite aukščiau pateiktą receptą ir perskaitykite jo **Segerio formulę** ir **Stullo diagramą**.
2. Pakeiskite kvarco kiekį iš 25 į 35 ir stebėkite, kaip taškas pasislenka į dešinę.
3. Jei turite bazinės glazūros receptą, dažiklį įveskite kaip priedą ir pakopomis jį keiskite linijine bandinių serija{{en: line blend}} puslapyje [Mišiniai bandiniams](/blends).

### Darbo lapas

Table: Darbo lapas 3: dažiklis paruoštoje glazūroje
Label: Darbo lapas 3

| Bandinys | Dažiklis (g 100 g) | Oksidacinis degimas: kaip atrodo | Redukcinis degimas: kaip atrodo |
| -------- | ------------------ | -------------------------------- | ------------------------------- |
| 1        | 0                  |                                  |                                 |
| 2        | 1                  |                                  |                                 |
| 3        | 2                  |                                  |                                 |
| 4        | 3                  |                                  |                                 |

### Pasitikrinimas

- Kurio Segerio formulės stulpelio suma lygi 1?
- Koks šios glazūros silicio dioksido ir aliuminio oksido santykis ir ką jis rodo?
- Kodėl diagramos blizgios srities taškas jūsų krosnyje vis tiek gali duoti matinį bandinį?

## 4 užsiėmimas: nuo recepto iki Segerio formulės {#recipe-to-formula}

### Tikslai

- Ranka apskaičiuoti Segerio formulę iš recepto.
- Palyginti ją su paties Glazecalc skaičiavimu.

### Pasiruošimas

- 4 darbo lapas, keturios 1 užsiėmimo analizės ir skaičiuotuvai.

### Apskaičiuotas pavyzdys

Receptas: 福島長石 45, kreida 20, EPK kaolinas 10, kvarcas 25. Kiekvieną kiekį laikykite gramais. Kiekvienai žaliavai: gramai × oksido procentas ÷ 100 ÷ jo molekulinė masė duoda kiekį (mol). Lentelėje pateikti pagrindiniai oksidai; Glazecalc skaičiuoja ir pėdsakinius oksidus (kaolino geležį ir titaną, lauko špato magnį).

Table: Kiekvieno oksido kiekis užmaiše, mol (100 g)
Label: Kiekis užmaiše

| Žaliava  | Gramai |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | -----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |     45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kreida   |     20 |      – |      – | 0,1998 |      – |      – |
| Kaolinas |     10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kvarcas  |     25 |      – |      – |      – |      – | 0,4161 |
| Iš viso  |    100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Fliusų suma: 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnio oksidas) = 0,2847 mol. Kiekvieną sumą padalykite iš jos:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Tai 3 užsiėmimo formulė.

### Programoje Glazecalc

1. Įveskite receptą [recepto puslapyje](/recipe).
2. Atidarykite **Kaip apskaičiuojama Segerio formulė**. Joje šie žingsniai parodyti su šio recepto skaičiais: gramai, kiekvieno oksido kiekis (mol) kiekvienoje žaliavoje, sumos ir dalyba iš fliusų.
3. Palyginkite kiekvieną eilutę su savo darbo lapu. Tada pakeiskite vieną kiekį ir apskaičiuokite tik tą stulpelį, kurį jis keičia.

### Darbo lapas

Table: Darbo lapas 4: nuo recepto iki Segerio formulės
Label: Darbo lapas 4

| Žaliava  | Gramai | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| -------- | ------ | --- | ---- | --- | ----- | ---- |
|          |        |     |      |     |       |      |
|          |        |     |      |     |       |      |
|          |        |     |      |     |       |      |
|          |        |     |      |     |       |      |
| Iš viso  |        |     |      |     |       |      |
| ÷ fliusų |        |     |      |     |       |      |

### Pasitikrinimas

- Kodėl bet kokio dydžio užmaišas duoda tą pačią Segerio formulę?
- Kokius oksidus suteikia kaolinas ir kuris iš jų čia svarbiausias?
- Kodėl kreidos LOI neįtraukiamas į formulę?

## 5 užsiėmimas: nuo Segerio formulės iki recepto {#formula-to-recipe}

### Tikslai

- Parinkti žaliavas tikslinei formulei ir apskaičiuoti, kiek kiekvienos reikia.
- Naudoti funkciją Receptas pagal tikslą ir pasakyti, kiek arti tikslo ji prieina.

### Pasiruošimas

- Žemiau pateiktas tikslas, 5 darbo lapas ir skaičiuotuvai; Glazecalc su paskyra.

### Apskaičiuotas pavyzdys

Tikslas: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ ir 4,0 SiO₂. Žaliavas imkite tokia tvarka, kiekvieną – tam oksidui, kurį gali suteikti tik ji:

1. **Lauko špatas – kaliui ir natriui.** Vienas 福島長石 vienetas (536,8 g – masė, kurioje yra 1 mol fliusų) suteikia 0,94 mol K₂O ir Na₂O kartu. Tikslui reikia 0,3, todėl 0,3 ÷ 0,94 = 0,319 vieneto: 171,4 g. Jis taip pat suteikia 0,015 CaO, 0,328 Al₂O₃ ir 1,865 SiO₂.
2. **Kreida – likusiam kalciui.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolinas – likusiam aliuminio oksidui.** 0,4 − 0,328 = 0,072 mol. EPK kaolino 272,6 g yra 1 mol Al₂O₃, todėl reikia 19,6 g; jie suteikia ir 0,149 SiO₂.
4. **Kvarcas – visam likusiam.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Užmaišas sveria 379,0 g. Procentais: 福島長石 45,2, kreida 18,1, kaolinas 5,2, kvarcas 31,5. Kalio ir natrio santykį nustato lauko špatas, todėl receptas duoda 0,195 K₂O ir 0,104 Na₂O: arti tikslo, bet ne tiksliai jį pataiko.

### Programoje Glazecalc

1. Atidarykite [Receptas pagal tikslą](/solve), pasirinkite **Segerio formulė (moliai, fliusų suma lygi 1)** ir įveskite tikslą.
2. Skiltyje **Žaliavos** nurodykite 福島長石, kreidą, EPK kaoliną ir kvarcą ir pasirinkite **Spręsti**.
3. Gausite 福島長石 44,9, kreida 18,2, kaolinas 5,6 ir kvarcas 31,3 bei lentelę, kiek arti tikslo prieina kiekvienas oksidas. Palyginkite su skaičiavimu ranka: sprendiklis skaičiuoja kiekvieną pėdsakinį oksidą ir randa geriausią derinį, kurį leidžia tos keturios žaliavos.
4. Pasirinkite **Atidaryti kaip naują receptą** ir patikrinkite jį recepto puslapyje.

### Darbo lapas

Table: Darbo lapas 5: nuo tikslo iki recepto
Label: Darbo lapas 5

| Žingsnis | Žaliava | Kuriam oksidui | Reikia (mol) | Gramai | Taip pat suteikia |
| -------- | ------- | -------------- | ------------ | ------ | ----------------- |
| 1        |         |                |              |        |                   |
| 2        |         |                |              |        |                   |
| 3        |         |                |              |        |                   |
| 4        |         |                |              |        |                   |

### Pasitikrinimas

- Kodėl lauko špatas apskaičiuojamas pirmas?
- Kodėl iš šių keturių žaliavų negalima gauti tiksliai 0,2 K₂O ir 0,1 Na₂O?
- Ką pridėtumėte prie žaliavų, kad atsirastų magnio oksido?

## 6 užsiėmimas: molio masė ir glazūros defektai {#body-and-defects}

> [!WARNING]
> Išdegusi glazūra gali išskirti metalų į maistą ir gėrimus, ir tai darydama gali atrodyti nepriekaištingai. Glazūros, kuriose daug bario, ar su variu, ir bet kuri glazūra su švinu gali išskirti metalų. Tik išdegto indo laboratorinis metalų išsiskyrimo tyrimas{{en: leach test}} parodo, ką jis išskiria; jokie skaičiavimai to nepasako. Perskaitykite [Tinkamumas liestis su maistu](/guides/glazing-basics#food-safety) ir [Žaliavos, su kuriomis reikia elgtis atsargiausiai](/guides/safe-mixing#materials).

### Tikslai

- Išmatuoti molio masės susitraukimą ir vandens sugeriamumą.
- Įvardyti dažnus defektus, jų įprastas priežastis ir pirmąjį pataisymą.
- Žinoti, kurie defektai daro dirbinius nesaugius.

### Pasiruošimas

- Jūsų molio masės bandymo juostelės, kol drėgnos pažymėtos 100 mm atstumu, degtos ir nedegtos.
- Bandiniai su defektais, jei jų turite: trūkinėjimas, susitraukimas į salas, adatinės skylutės, nubėgimas.

### Apskaičiuotas pavyzdys

- **Susitraukimas degant**: (pažymėtas ilgis − ilgis po degimo) ÷ pažymėtas ilgis × 100. Žymės 100 mm atstumu, kurios po degimo išmatuojamos 88 mm: susitraukimas 12 %.
- **Vandens sugeriamumas**: (masė po mirkymo − sausa masė) ÷ sausa masė × 100. 50,0 g sveriantis išdegtas bandinys, kuris po mirkymo sveria 50,6 g: 1,2 %.

Table: Defektai, priežastys ir pirmasis pataisymas Segerio formulėje
Label: Defektai

| Defektas              | Įprasta priežastis                                      | Ką pirmiausia išbandyti                                                      |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Trūkinėjimas          | Glazūra susitraukia labiau nei šukė                     | Mažiau K₂O ir Na₂O; daugiau kalcio, magnio oksido ar boro                    |
| Atšokimas             | Glazūra susitraukia kur kas mažiau nei šukė             | Daugiau K₂O ir Na₂O                                                          |
| Nubėgimas             | Per mažai aliuminio oksido arba per storas sluoksnis    | Daugiau aliuminio oksido; plonesnis sluoksnis                                |
| Susitraukimas į salas | Dulkėtas biskvitas arba storas sluoksnis, kuris suskilo | Nuvalykite biskvitą; plonesnis sluoksnis                                     |
| Adatinės skylutės     | Dujos, po kurių skylutės neužsilydė                     | Išlaikymas aukščiausioje degimo temperatūroje; plonesnis sluoksnis |

[Glazūros ir šukės suderinamumas ir defektai](/guides/glazing-basics#fit-and-defects) paaiškina kiekvieną defektą, taip pat ledinio vandens bandymą trūkinėjimui nustatyti. Trūkinėjusių ar atšokusių dirbinių nenaudokite maistui ar gėrimams.

::food-limits

### Programoje Glazecalc

1. [Recepto puslapyje](/recipe) savo glazūrai perskaitykite skyrių **Ribos** ir apskaičiuotą plėtimąsi.
2. Nukopijuokite receptą, dalį lauko špato pakeiskite kreida ir palyginkite abu receptus: kuria kryptimi pasislinko plėtimasis?

### Darbo lapas

Table: Darbo lapas 6: molio masė
Label: Darbo lapas 6

| Juostelė | Pažymėtas ilgis (mm) | Ilgis po degimo (mm) | Susitraukimas degant (%) | Sausa masė (g) | Masė po mirkymo (g) | Sugeriamumas (%) |
| -------- | -------------------- | -------------------- | ------------------------ | -------------- | ------------------- | ---------------- |
| 1        | 100                  |                      |                          |                |                     |                  |
| 2        | 100                  |                      |                          |                |                     |                  |

### Pasitikrinimas

- Koks defektas atsiranda, kai glazūra susitraukia labiau nei šukė, ir koks pirmasis pataisymas?
- Kodėl atšokusių dirbinių niekada negalima naudoti maistui?
- Ar skaičiavimas gali parodyti, kad glazūra tinkama liestis su maistu? Kas gali?

## Spausdinamos bandinių išdėstymo schemos {#tile-maps}

### Triašio schema: 42 glazūros

Du trikampiai po 21 bandinį, pagal puslapio Mišiniai bandiniams išdėstymą su 6 eilutėmis: 1 bandinys viršuje (lauko špatas), apatinė eilutė nuo kreidos (kairėje) iki kvarco (dešinėje). II trikampis yra I trikampis, prie kiekvienų 100 g papildomai pridėjus 1 g raudonojo geležies oksido, kuris redukcinėje atmosferoje linksta į seladoną (青磁). Degant oksidacinėje ir redukcinėje atmosferoje, tai 84 bandiniai. Kiekiai – gramai 100 g.

Table: Triašio schema: 福島長石, kreida ir kvarcas, kiekviename bandinyje po 10 kaolino
Label: Triašio schema

| Bandinys (I) | Bandinys (II) | 福島長石 | Kreida | Kvarcas | Kaolinas | I oks. | I red. | II oks. | II red. |
| ------------ | ------------- | -------: | -----: | ------: | -------: | ------ | ------ | ------- | ------- |
| 1            | 22            |       90 |      0 |       0 |       10 |        |        |         |         |
| 2            | 23            |       72 |     18 |       0 |       10 |        |        |         |         |
| 3            | 24            |       72 |      0 |      18 |       10 |        |        |         |         |
| 4            | 25            |       54 |     36 |       0 |       10 |        |        |         |         |
| 5            | 26            |       54 |     18 |      18 |       10 |        |        |         |         |
| 6            | 27            |       54 |      0 |      36 |       10 |        |        |         |         |
| 7            | 28            |       36 |     54 |       0 |       10 |        |        |         |         |
| 8            | 29            |       36 |     36 |      18 |       10 |        |        |         |         |
| 9            | 30            |       36 |     18 |      36 |       10 |        |        |         |         |
| 10           | 31            |       36 |      0 |      54 |       10 |        |        |         |         |
| 11           | 32            |       18 |     72 |       0 |       10 |        |        |         |         |
| 12           | 33            |       18 |     54 |      18 |       10 |        |        |         |         |
| 13           | 34            |       18 |     36 |      36 |       10 |        |        |         |         |
| 14           | 35            |       18 |     18 |      54 |       10 |        |        |         |         |
| 15           | 36            |       18 |      0 |      72 |       10 |        |        |         |         |
| 16           | 37            |        0 |     90 |       0 |       10 |        |        |         |         |
| 17           | 38            |        0 |     72 |      18 |       10 |        |        |         |         |
| 18           | 39            |        0 |     54 |      36 |       10 |        |        |         |         |
| 19           | 40            |        0 |     36 |      54 |       10 |        |        |         |         |
| 20           | 41            |        0 |     18 |      72 |       10 |        |        |         |         |
| 21           | 42            |        0 |      0 |      90 |       10 |        |        |         |         |

### Segerio tinklelis: 24 glazūros

Visų bandinių fliusai vienodi, 0,2 KNaO ir 0,8 CaO, iš 福島長石 ir kreidos. Aliuminio oksido kiekis keičiasi tinklelio eilutėmis žemyn, silicio dioksido – skersai. Receptai apskaičiuoti 5 užsiėmimo metodu; kiekvieno jų Glazecalc Segerio formulė nuo tikslo skiriasi ne daugiau kaip 0,01 aliuminio oksido ir 0,06 silicio dioksido. Pažymėkite kiekvieną bandinį silicio dioksido ir aliuminio oksido diagramoje ir nubrėžkite savo sritis: matinė, blizgi, nepakankamai išdegta, nubėganti.

Table: Segerio tinklelis: 0,2 KNaO, 0,8 CaO, masės procentai
Label: Segerio tinklelis

| Bandinys | Al₂O₃ | SiO₂ | 福島長石 | Kreida | Kaolinas | Kvarcas | Oksidacinis | Redukcinis |
| -------- | ----: | ---: | -------: | -----: | -------: | ------: | ----------- | ---------- |
| 1        |  0,25 |  2,0 |     46,9 |   32,5 |      3,5 |    17,1 |             |            |
| 2        |  0,25 |  2,5 |     41,8 |   28,9 |      3,1 |    26,2 |             |            |
| 3        |  0,25 |  3,0 |     37,6 |   26,1 |      2,8 |    33,5 |             |            |
| 4        |  0,25 |  3,5 |     34,3 |   23,7 |      2,5 |    39,5 |             |            |
| 5        |  0,25 |  4,0 |     31,4 |   21,7 |      2,3 |    44,5 |             |            |
| 6        |  0,25 |  4,5 |     29,0 |   20,1 |      2,2 |    48,7 |             |            |
| 7        |  0,35 |  2,0 |     44,3 |   30,6 |     13,9 |    11,3 |             |            |
| 8        |  0,35 |  2,5 |     39,6 |   27,4 |     12,4 |    20,5 |             |            |
| 9        |  0,35 |  3,0 |     35,9 |   24,8 |     11,2 |    28,0 |             |            |
| 10       |  0,35 |  3,5 |     32,8 |   22,7 |     10,3 |    34,2 |             |            |
| 11       |  0,35 |  4,0 |     30,2 |   20,9 |      9,5 |    39,5 |             |            |
| 12       |  0,35 |  4,5 |     28,0 |   19,4 |      8,8 |    43,9 |             |            |
| 13       |  0,45 |  2,0 |     41,9 |   29,0 |     23,1 |     6,1 |             |            |
| 14       |  0,45 |  2,5 |     37,7 |   26,1 |     20,8 |    15,4 |             |            |
| 15       |  0,45 |  3,0 |     34,3 |   23,7 |     18,9 |    23,0 |             |            |
| 16       |  0,45 |  3,5 |     31,5 |   21,8 |     17,4 |    29,4 |             |            |
| 17       |  0,45 |  4,0 |     29,1 |   20,1 |     16,0 |    34,8 |             |            |
| 18       |  0,45 |  4,5 |     27,0 |   18,7 |     14,9 |    39,4 |             |            |
| 19       |  0,55 |  2,0 |     39,7 |   27,5 |     31,4 |     1,5 |             |            |
| 20       |  0,55 |  2,5 |     35,9 |   24,9 |     28,4 |    10,8 |             |            |
| 21       |  0,55 |  3,0 |     32,8 |   22,7 |     26,0 |    18,5 |             |            |
| 22       |  0,55 |  3,5 |     30,2 |   20,9 |     23,9 |    25,0 |             |            |
| 23       |  0,55 |  4,0 |     28,0 |   19,4 |     22,1 |    30,5 |             |            |
| 24       |  0,55 |  4,5 |     26,1 |   18,1 |     20,6 |    35,3 |             |            |

Glazecalc puslapyje Mišiniai bandiniams sudaromi 3–66 bandinių trikampiai ir kvadratai, o ne šis tinklelis; kiekvieną bandinį atidarykite kaip receptą [recepto puslapyje](/recipe) ir iš ten atspausdinkite jo svėrimo sąrašą.

## Šaltiniai {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): šeši užsiėmimai.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: užsiėmimų datos ir temos.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: tęstinio kurso užduotys – 42, 90 ir 78 glazūros oksidacinėje ir redukcinėje atmosferoje.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): paties centro skaičiavimo programa.
- Bilecik Şeyh Edebali University, [SCT305 kurso informacija](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Segerio formulė 5, 6 ir 8 savaitėmis.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): glazūrų skaičiavimas Taivano mokyklų mokytojams.
- Glendale Community College, ART 195 kurso aprašas: Segerio formulė nuo 5 iki 7 savaitės iš 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: 福島長石 analizė Glazecalc bibliotekoje.
- IUPAC, standartinės atominės masės, tokios, kokias naudoja Glazecalc chemijos skaičiavimai.
