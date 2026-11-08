---
title: Predarea calculului glazurilor
lead: 6 lecții pentru o clasă sau un grup de studiu, de la materiile prime și plăcuțele triaxiale până la formula Seger calculată în ambele sensuri și defectele glazurii, fiecare cu un exemplu rezolvat, pașii în Glazecalc, o fișă de lucru de tipărit și întrebări de verificare.
---

## Despre acest pachet {#about}

Acest pachet este pentru oricine predă calculul glazurilor: o școală, un curs de atelier, un grup de studiu al unor ceramiști care lucrează deja sau un ceramist care învață singur. Are șase lecții, iar fiecare are obiective, ce trebuie pregătit, un exemplu rezolvat cu materii prime reale, cum se face în Glazecalc, o fișă de lucru și întrebări de verificare.

Ordinea lecțiilor urmează un grup de studiu publicat: 陶磁器釉薬技術研究会 (grupul de studiu pentru glazuri ceramice) al Centrului de Tehnologie Industrială al Prefecturii Ibaraki din Japonia, care a ținut șase lecții pentru 12 tineri ceramiști în 2015 și le-a prezentat în raportul său de cercetare. Cursul care a urmat, la colegiul de artă ceramică din Kasama, a dat trei teme cu plăcuțe, de 42, 90 și 78 de glazuri, fiecare arsă în atmosferă oxidantă și în atmosferă reducătoare. **Glazecalc nu are nicio legătură cu centrul sau cu colegiul.** Urmăm ordinea schiței lor publicate și o cităm mai jos; textul, exemplele și fișele de lucru de aici sunt ale noastre. Cursurile din alte țări predau aceiași pași în aproape aceeași ordine: SCT305 de la Bilecik Şeyh Edebali University din Turcia, ART 195 de la Glendale Community College din SUA, programa pentru școlile de ceramică din Renania-Palatinat din Germania și lucrarea din 2006 a lui 李堅萍 pentru profesorii din Taiwan.

Table: Cele șase lecții
Label: Cele șase lecții

| Lecția | Subiectul                                                 | În Glazecalc                         |
| ------ | --------------------------------------------------------- | ------------------------------------ |
| 1      | Materiile prime, ce fac ele, plăcuțele triaxiale          | Materii prime, Amestecuri (triaxial) |
| 2      | Chimia: elemente, formule, moli                           | Pagina unei materii prime            |
| 3      | Citirea unei formule Seger (UMF), diagrama silice–alumină | Pagina rețetei, diagrama Stull       |
| 4      | De la rețetă la formula Seger                             | Cum se calculează formula Seger      |
| 5      | De la formula Seger la rețetă                             | Rezolvare după o țintă               |
| 6      | Corpul ceramic și defectele glazurii                      | Limite, Comparați                    |

### Cum se folosește

- Fiecare lecție durează aproximativ 2 ore. Lecțiile 4 și 5 cer calculatoare și, pentru fiecare pereche, un computer sau un telefon cu Glazecalc.
- Exemplele rezolvate folosesc materii prime vândute în Japonia și cifrele din biblioteca standard Glazecalc: 福島長石 (feldspat Fukushima), carbonat de calciu (石灰石, cretă){{en: whiting}}, un caolin și silice (珪石). Dacă aveți analiza propriului furnizor, adăugați-o pe [pagina Materii prime](/material): cifrele se schimbă, dar metoda nu.
- Arderea se face la SK 8, {{2282 °F; 1250 °C}} nominal. Folosiți conul la care ardeți în clasă; [Arderea la conuri SK](/guides/firing#sk-cones) explică numerele SK.
- Ca să tipăriți o fișă de lucru sau o hartă de plăcuțe, imprimați această pagină din browser. Salvarea rețetelor, a amestecurilor și a notițelor cere un cont gratuit.

> [!WARNING]
> Lecțiile 1, 3 și 6 sunt lucrări de laborator: cântărirea materiilor prime uscate și arderea. Înainte ca cineva să cântărească o materie primă, citiți [Obiceiurile care contează cel mai mult](/guides/safe-mixing#habits). Praful de glazură uscat este pericolul principal.

## Lecția 1: Materiile prime și plăcuțele triaxiale {#materials}

> [!WARNING]
> Cântăriți materiile prime uscate cu mișcări blânde, curățați umed și purtați o mască de protecție respiratorie bine ajustată cât timp pulberile sunt uscate. Citiți mai întâi [Pericolul principal: praful](/guides/safe-mixing#the-main-hazard) și [Măști de protecție respiratorie](/guides/safe-mixing#respirators).

### Obiective

- Numiți cele trei roluri dintr-o glazură: formatorul de sticlă, fondantul{{en: flux}} și stabilizatorul.
- Sortați 4 materii prime uzuale după oxizii pe care îi aduc.
- Alcătuiți un amestec triaxial și citiți plăcuțele lui ca pe o hartă.

### De pregătit

- Câte un sac de 福島長石, carbonat de calciu, un caolin și silice, sau materiile prime pe care le are clasa dumneavoastră.
- [Harta plăcuțelor triaxiale](#tile-maps) de mai jos, tipărită, și câte 21 de plăcuțe de test pentru fiecare cursant, pentru fiecare triunghi.
- Plăcuțe arse dintr-un amestec triaxial anterior, dacă le aveți, ca să le dați din mână în mână.

### Exemplu rezolvat

Analiza fiecărei materii prime, din biblioteca Glazecalc, arată oxizii pe care îi lasă după ardere. Pierderea la calcinare (PC){{en: loss on ignition}} este ceea ce se degajă la ardere.

Table: Patru materii prime și ce aduc ele (procente de masă, din bibliotecă)
Label: Patru materii prime

| Materia primă               | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |    PC | Rolul ei                                  |
| --------------------------- | ---: | ----: | ----: | ---: | ----: | ----: | ----------------------------------------- |
| 福島長石 (feldspat)         | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Fondant, cu propria alumină și silice     |
| Carbonat de calciu (石灰石) |    – |     – |     – |    – | 56,03 | 43,97 | Fondant (calciu)                          |
| EPK Kaolin                  | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizator: sursa principală de alumină |
| Silice (珪石)               |  100 |     – |     – |    – |     – |     – | Formator de sticlă                        |

Feldspatul singur se topește la SK 8 într-o sticlă vâscoasă; carbonatul de calciu singur nu se topește; silicea singură nu se topește. Amestecate, se topesc mult mai bine decât oricare dintre ele. Un amestec triaxial arată unde: harta de plăcuțe de mai jos variază cele trei materii în pași de ~20 % (18 din 90), cu 10 % caolin în fiecare plăcuță.

::shops

### În Glazecalc

1. Deschideți fiecare materie primă pe [pagina Materii prime](/material) sau pagina ei publică, de exemplu [Fukushima Feldspar](/materials/fukushima-feldspar). Notați ce oxizi aduce.
2. Faceți trei rețete: 福島長石 90 cu caolin 10, carbonat de calciu 90 cu caolin 10 și silice 90 cu caolin 10. În [Amestecuri pentru plăcuțe de test](/blends) alegeți **Triaxial (3 rețete)** și 6 rânduri: 21 de plăcuțe, la fel ca pe harta de mai jos.
3. Alegeți cantitatea de preparat pentru fiecare plăcuță și **Tipăriți** ce trebuie cântărit. După ardere, salvați ca rețete plăcuțele care vă plac, din desenul plăcuțelor.

### Fișa de lucru

Table: Fișa de lucru 1: ce aduce fiecare materie primă
Label: Fișa de lucru 1

| Materia primă      | Oxizii pe care îi aduce | Formator de sticlă, fondant sau stabilizator? | PC (%) |
| ------------------ | ----------------------- | --------------------------------------------- | ------ |
| 福島長石           |                         |                                               |        |
| Carbonat de calciu |                         |                                               |        |
| Caolin             |                         |                                               |        |
| Silice             |                         |                                               |        |

### Verificare

- Care materie primă aduce cea mai mare parte din alumină și de ce are nevoie o glazură de ea?
- De ce nu se topește singur colțul cu carbonat de calciu al triunghiului?
- Unde în triunghi s-au topit cel mai bine plăcuțele dumneavoastră și de care colț erau cel mai aproape?

## Lecția 2: Chimia de care aveți nevoie {#chemistry}

### Obiective

- Citiți o formulă chimică: SiO₂, CaO, Al₂O₃, CaCO₃.
- Calculați o masă molară din masele atomice.
- Transformați gramele în moli și invers.

### De pregătit

- Un tabel periodic pentru fiecare cursant și calculatoare.
- Masele atomice din tabelul de mai jos (valorile standard IUPAC, așa cum le folosește Glazecalc).

### Exemplu rezolvat

Table: Mase atomice folosite aici (g/mol)
Label: Mase atomice

| Element  | Simbol | Masa atomică |
| -------- | ------ | -----------: |
| Oxigen   | O      |       15,999 |
| Carbon   | C      |       12,011 |
| Sodiu    | Na     |        22,99 |
| Aluminiu | Al     |       26,982 |
| Siliciu  | Si     |       28,085 |
| Potasiu  | K      |       39,098 |
| Calciu   | Ca     |       40,078 |

O formulă numără atomi. SiO₂ înseamnă un siliciu și doi oxigeni, deci un mol din ea cântărește 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ este 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO are 56,077 g, iar carbonatul de calciu (cretă), CaCO₃, are 100,086 g; biblioteca Glazecalc îl rotunjește la 100,08.

Un **mol** este un număr, ca o duzină: același număr de molecule, oricare ar fi ele. Molii sunt grame ÷ masa molară:

- 25 g de silice înseamnă 25 ÷ 60,083 = 0,416 mol de SiO₂.
- 20 g de carbonat de calciu înseamnă 20 ÷ 100,08 = 0,200 mol. În cuptor pierde dioxidul de carbon (CO₂, 44,009 g/mol) și rămân 0,200 mol de CaO, care cântărește 0,200 × 56,077 = 11,2 g. Această pierdere este pierderea lui la calcinare: 43,97 %.

### În Glazecalc

1. Deschideți [Whiting](/materials/whiting) și [Silica](/materials/silica): fiecare pagină dă formula și masele ei.
2. Verificați de mână o masă molară cu cea de pe pagină.

### Fișa de lucru

Table: Fișa de lucru 2: masa molară și moli
Label: Fișa de lucru 2

| Oxid sau materie primă | Formula | Masa molară (g/mol) | Grame | Moli |
| ---------------------- | ------- | ------------------- | ----- | ---- |
| Silice                 | SiO₂    |                     | 30    |      |
| Alumină                | Al₂O₃   |                     | 10    |      |
| Oxid de calciu         | CaO     |                     | 5     |      |
| Carbonat de calciu     | CaCO₃   |                     | 15    |      |

### Verificare

- Câte grame cântărește un mol de SiO₂ și cum se calculează?
- De ce 20 g de carbonat de calciu lasă mai puțin de 20 g în glazura arsă?
- De ce comparăm oxizii în moli, nu în grame?

## Lecția 3: Citirea unei formule Seger {#reading-the-formula}

> [!WARNING]
> Colorarea unei glazuri înseamnă cântărirea de coloranți, dintre care unii cer mai multă grijă decât materiile prime de bază. Citiți mai întâi [Materiile prime care cer cea mai mare grijă](/guides/safe-mixing#materials).

### Obiective

- Citiți cele trei coloane ale unei formule Seger (UMF){{en: unity formula}} (ゼーゲル式): fondanți, stabilizator, formator de sticlă.
- Găsiți o glazură pe o diagramă silice–alumină și aflați ce poate și ce nu poate să vă spună diagrama.
- Colorați în pași o glazură gata preparată și notați rezultatul.

### De pregătit

- Formula Seger de mai jos, scrisă mare.
- O glazură transparentă gata preparată și un colorant, de exemplu oxid roșu de fier (弁柄){{en: red iron oxide}}.

### Exemplu rezolvat

Glazura din lecția 4, 福島長石 45, carbonat de calciu 20, caolin 10 și silice 25, are această formulă Seger (cifrele Glazecalc, rotunjite):

Table: O formulă Seger în cele trei coloane
Label: O formulă Seger

| Fondanți (RO, R₂O) | Stabilizator (R₂O₃) | Formator de sticlă (RO₂) |
| ------------------ | ------------------- | ------------------------ |
| K₂O 0,18           | Al₂O₃ 0,43          | SiO₂ 3,45                |
| Na₂O 0,10          |                     |                          |
| CaO 0,72           |                     |                          |

- Fondanții însumează 1: aceasta este regula formulei. Fiecare alt număr înseamnă moli la un mol de fondanți.
- Raportul silice–alumină este 3,45 ÷ 0,43, aproximativ 8: o glazură lucioasă tipică.
- Calciul este cea mai mare parte din fondant, ca în majoritatea glazurilor japoneze cu calciu (石灰釉).

O diagramă cu silicea pe orizontală și alumina pe verticală așază fiecare glazură ca un punct. Testele lui Seger și diagrama lui Stull din 1912 sunt de acest fel, iar o 釉性状図 așază pe ea plăcuțele arse ale unei clase. Pagina rețetei din Glazecalc desenează diagrama Stull, iar această glazură se află în regiunea ei lucioasă. Regiunile lui Stull vin din propriii lui fondanți și din arderea lui: o orientare, nu o predicție. [Grila de plăcuțe](#tile-maps) de mai jos îi permite unei clase să-și deseneze propria diagramă la propria ardere.

::stull-chart

Ca să colorați o glazură gata preparată a cărei rețetă nu o cunoașteți, Glazecalc nu-i poate calcula formula. În schimb, adăugați colorantul peste cele 100: 100 g de glazură uscată cu 1, 2 și 3 g de oxid de fier, câte o plăcuță, arse în atmosferă oxidantă și în atmosferă reducătoare.

### În Glazecalc

1. Pe [pagina rețetei](/recipe) introduceți rețeta de mai sus și citiți **Formula Seger** și **Diagrama Stull**.
2. Schimbați silicea de la 25 la 35 și urmăriți cum punctul se mută spre dreapta.
3. Pentru o bază a cărei rețetă o aveți, faceți din colorant un adaos și folosiți un amestec liniar în [Amestecuri pentru plăcuțe de test](/blends) ca să-l variați în pași.

### Fișa de lucru

Table: Fișa de lucru 3: un colorant într-o glazură gata preparată
Label: Fișa de lucru 3

| Plăcuța | Colorant (g la 100 g) | Ardere oxidantă: cum arată | Ardere reducătoare: cum arată |
| ------- | --------------------- | -------------------------- | ----------------------------- |
| 1       | 0                     |                            |                               |
| 2       | 1                     |                            |                               |
| 3       | 2                     |                            |                               |
| 4       | 3                     |                            |                               |

### Verificare

- Într-o formulă Seger, care coloană însumează 1?
- Care este raportul silice–alumină al acestei glazuri și ce sugerează?
- De ce un punct din regiunea lucioasă a diagramei poate da totuși o plăcuță mată în cuptorul dumneavoastră?

## Lecția 4: De la rețetă la formula Seger {#recipe-to-formula}

### Obiective

- Calculați de mână o formulă Seger dintr-o rețetă.
- Verificați-o cu calculul propriu al Glazecalc.

### De pregătit

- Fișa de lucru 4, cele patru analize din lecția 1 și calculatoare.

### Exemplu rezolvat

Rețeta: 福島長石 45, carbonat de calciu 20, caolin EPK 10, silice 25. Socotiți fiecare cantitate ca grame. Pentru fiecare materie primă, grame × procentul oxidului ÷ 100 ÷ masa lui molară dau molii ei. Tabelul dă oxizii principali; Glazecalc numără și urmele (fierul și titanul din caolin, magneziul din feldspat).

Table: Molii fiecărui oxid în amestec (100 g)
Label: Moli în amestec

| Materia primă      | Grame |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ------------------ | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石           |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Carbonat de calciu |    20 |      – |      – | 0,1998 |      – |      – |
| Caolin             |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Silice             |    25 |      – |      – |      – |      – | 0,4161 |
| Total              |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Fondanții însumează 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnezie) = 0,2847 mol. Împărțiți fiecare total la această valoare:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

Aceasta este formula din lecția 3.

### În Glazecalc

1. Introduceți rețeta pe [pagina rețetei](/recipe).
2. Deschideți **Cum se calculează formula Seger**. Arată acești pași cu cifrele acestei rețete: gramele, molii fiecărui oxid din fiecare materie primă, totalurile și împărțirea la fondanți.
3. Comparați fiecare linie cu fișa dumneavoastră de lucru. Apoi schimbați o cantitate și calculați numai coloana pe care o schimbă.

### Fișa de lucru

Table: Fișa de lucru 4: de la rețetă la formula Seger
Label: Fișa de lucru 4

| Materia primă | Grame | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ------------- | ----- | --- | ---- | --- | ----- | ---- |
|               |       |     |      |     |       |      |
|               |       |     |      |     |       |      |
|               |       |     |      |     |       |      |
|               |       |     |      |     |       |      |
| Total         |       |     |      |     |       |      |
| ÷ fondanți    |       |     |      |     |       |      |

### Verificare

- De ce orice mărime a amestecului dă aceeași formulă Seger?
- Ce oxizi aduce caolinul și care dintre ei contează cel mai mult aici?
- De ce pierderea la calcinare a carbonatului de calciu nu intră în formulă?

## Lecția 5: De la formula Seger la rețetă {#formula-to-recipe}

### Obiective

- Alegeți materii prime pentru o formulă țintă și calculați cât din fiecare.
- Folosiți Rezolvare după o țintă și spuneți cât de aproape ajunge.

### De pregătit

- Ținta de mai jos, fișa de lucru 5 și calculatoare; Glazecalc cu un cont.

### Exemplu rezolvat

Ținta: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ și 4,0 SiO₂. Luați materiile prime în această ordine, fiecare pentru oxidul pe care numai ea îl poate aduce:

1. **Feldspatul, pentru potasiu și sodiu.** O unitate de 福島長石 (536,8 g, masa care conține un mol de fondanți) aduce 0,94 mol de K₂O și Na₂O. Ținta cere 0,3, deci 0,3 ÷ 0,94 = 0,319 unități: 171,4 g. Aduce și 0,015 CaO, 0,328 Al₂O₃ și 1,865 SiO₂.
2. **Carbonatul de calciu, pentru restul calciului.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Caolinul, pentru restul aluminei.** 0,4 − 0,328 = 0,072 mol. Caolinul EPK conține un mol de Al₂O₃ în 272,6 g, deci 19,6 g, care aduc și 0,149 SiO₂.
4. **Silicea, pentru rest.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Cantitatea de preparat este 379,0 g. În procente: 福島長石 45,2, carbonat de calciu 18,1, caolin 5,2, silice 31,5. Feldspatul fixează raportul dintre potasiu și sodiu, deci rețeta dă 0,195 K₂O și 0,104 Na₂O: aproape de țintă, dar nu exact.

### În Glazecalc

1. Deschideți [Rezolvare după o țintă](/solve), alegeți **O formulă Seger (moli, fondanții însumând 1)** și introduceți ținta.
2. La **Materiile prime** dați-i 福島長石, carbonat de calciu, caolin EPK și silice, apoi alegeți **Rezolvați**.
3. Dă 福島長石 44,9, carbonat de calciu 18,2, caolin 5,6 și silice 31,3, plus un tabel cu cât de aproape ajunge fiecare oxid. Comparați-l cu calculul dumneavoastră de mână: programul de calcul numără toate urmele și găsește cea mai bună potrivire pe care o permit cele patru materii prime.
4. **Deschideți ca rețetă nouă** și verificați-o pe pagina rețetei.

### Fișa de lucru

Table: Fișa de lucru 5: de la țintă la rețetă
Label: Fișa de lucru 5

| Pasul | Materia primă | Pentru ce oxid | Moli necesari | Grame | Aduce și |
| ----- | ------------- | -------------- | ------------- | ----- | -------- |
| 1     |               |                |               |       |          |
| 2     |               |                |               |       |          |
| 3     |               |                |               |       |          |
| 4     |               |                |               |       |          |

### Verificare

- De ce se calculează feldspatul primul?
- De ce aceste patru materii prime nu pot da exact 0,2 K₂O și 0,1 Na₂O?
- Ce ați adăuga la materiile prime ca să aduceți magnezie?

## Lecția 6: Corpul ceramic și defectele glazurii {#body-and-defects}

> [!WARNING]
> O glazură arsă poate ceda metale în alimente și în băuturi și poate arăta perfect în timp ce o face. Glazurile bogate în bariu sau cu cupru și orice glazură cu plumb pot ceda metale. Numai un test de laborator privind migrarea metalelor{{en: leach test}}, făcut pe vasul ars, arată ce eliberează acesta; niciun calcul nu poate. Citiți [Siguranța alimentară](/guides/glazing-basics#food-safety) și [Materiile prime care cer cea mai mare grijă](/guides/safe-mixing#materials).

### Obiective

- Măsurați contracția și absorbția de apă ale unui corp ceramic.
- Numiți defectele obișnuite, cauzele lor uzuale și o primă soluție.
- Aflați ce defecte fac piesele nesigure.

### De pregătit

- Baghete de test din argila dumneavoastră, marcate la 100 mm distanță cât sunt umede, arse și nearse.
- Plăcuțe cu defecte, dacă le aveți: fisurare, retragerea glazurii, înțepături, curgere.

### Exemplu rezolvat

- **Contracția**: (lungimea marcată − lungimea după ardere) ÷ lungimea marcată × 100. Mărci la 100 mm distanță care măsoară 88 mm după ardere: contracție de 12 %.
- **Absorbția de apă**: (masa după scufundarea în apă − masa uscată) ÷ masa uscată × 100. O baghetă arsă de 50,0 g care cântărește 50,6 g după scufundarea în apă: 1,2 %.

Table: Defecte, cauze și o primă soluție în formula Seger
Label: Defecte

| Defect              | Cauza obișnuită                                          | O primă soluție de încercat                              |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Fisurarea           | Glazura se contractă mai mult decât corpul ceramic       | Mai puțin K₂O și Na₂O; mai mult calciu, magnezie sau bor |
| Exfolierea          | Glazura se contractă mult mai puțin decât corpul ceramic | Mai mult K₂O și Na₂O                                     |
| Curgerea            | Prea puțină alumină sau un strat prea gros               | Mai multă alumină; un strat mai subțire                  |
| Retragerea glazurii | Biscuit prăfuit sau un strat gros care a crăpat          | Curățați biscuitul; un strat mai subțire                 |
| Înțepăturile        | Gaz după care glazura nu s-a închis la loc               | O menținere la temperatura maximă; un strat mai subțire  |

[Compatibilitatea glazurii cu ciobul și defectele](/guides/glazing-basics#fit-and-defects) explică fiecare defect, cu testul cu apă cu gheață pentru fisurare. Nu folosiți pentru mâncare sau băutură piesele fisurate sau exfoliate.

::food-limits

### În Glazecalc

1. Pe [pagina rețetei](/recipe) citiți panoul **Limite** pentru o glazură de-a dumneavoastră și dilatarea ei calculată.
2. Copiați rețeta, înlocuiți o parte din feldspat cu carbonat de calciu și comparați cele două: în ce sens s-a mișcat dilatarea?

### Fișa de lucru

Table: Fișa de lucru 6: corpul ceramic
Label: Fișa de lucru 6

| Baghetă | Lungime marcată (mm) | Lungime după ardere (mm) | Contracție (%) | Masă uscată (g) | Masă după scufundare în apă (g) | Absorbție (%) |
| ------- | -------------------- | ------------------------ | -------------- | --------------- | ------------------------------- | ------------- |
| 1       | 100                  |                          |                |                 |                                 |               |
| 2       | 100                  |                          |                |                 |                                 |               |

### Verificare

- Ce defect provine dintr-o glazură care se contractă mai mult decât corpul ceramic și care este o primă soluție?
- De ce nu trebuie folosite niciodată pentru mâncare piesele exfoliate?
- Poate un calcul să vă spună că o glazură este sigură pentru alimente? Dar ce poate?

## Hărți de plăcuțe de tipărit {#tile-maps}

### Harta triaxială: 42 de glazuri

Două triunghiuri de câte 21 de plăcuțe, după aranjarea din Amestecuri cu 6 rânduri: plăcuța 1 sus (feldspat), rândul de jos de la carbonat de calciu (stânga) la silice (dreapta). Triunghiul II este triunghiul I cu 1 g de oxid roșu de fier peste fiecare 100 g, care virează spre celadon (青磁) în ardere reducătoare. Arse în atmosferă oxidantă și în atmosferă reducătoare, sunt 84 de plăcuțe. Cantitățile sunt grame la 100 g.

Table: Harta triaxială: 福島長石, carbonat de calciu și silice, cu 10 caolin în fiecare plăcuță
Label: Harta triaxială

| Plăcuța (I) | Plăcuța (II) | 福島長石 | Carbonat de calciu | Silice | Caolin | I oxidant | I reducător | II oxidant | II reducător |
| ----------- | ------------ | -------: | -----------------: | -----: | -----: | --------- | ----------- | ---------- | ------------ |
| 1           | 22           |       90 |                  0 |      0 |     10 |           |             |            |              |
| 2           | 23           |       72 |                 18 |      0 |     10 |           |             |            |              |
| 3           | 24           |       72 |                  0 |     18 |     10 |           |             |            |              |
| 4           | 25           |       54 |                 36 |      0 |     10 |           |             |            |              |
| 5           | 26           |       54 |                 18 |     18 |     10 |           |             |            |              |
| 6           | 27           |       54 |                  0 |     36 |     10 |           |             |            |              |
| 7           | 28           |       36 |                 54 |      0 |     10 |           |             |            |              |
| 8           | 29           |       36 |                 36 |     18 |     10 |           |             |            |              |
| 9           | 30           |       36 |                 18 |     36 |     10 |           |             |            |              |
| 10          | 31           |       36 |                  0 |     54 |     10 |           |             |            |              |
| 11          | 32           |       18 |                 72 |      0 |     10 |           |             |            |              |
| 12          | 33           |       18 |                 54 |     18 |     10 |           |             |            |              |
| 13          | 34           |       18 |                 36 |     36 |     10 |           |             |            |              |
| 14          | 35           |       18 |                 18 |     54 |     10 |           |             |            |              |
| 15          | 36           |       18 |                  0 |     72 |     10 |           |             |            |              |
| 16          | 37           |        0 |                 90 |      0 |     10 |           |             |            |              |
| 17          | 38           |        0 |                 72 |     18 |     10 |           |             |            |              |
| 18          | 39           |        0 |                 54 |     36 |     10 |           |             |            |              |
| 19          | 40           |        0 |                 36 |     54 |     10 |           |             |            |              |
| 20          | 41           |        0 |                 18 |     72 |     10 |           |             |            |              |
| 21          | 42           |        0 |                  0 |     90 |     10 |           |             |            |              |

### Grila Seger: 24 de glazuri

Fiecare plăcuță are aceiași fondanți, 0,2 KNaO și 0,8 CaO, din 福島長石 și carbonat de calciu. Alumina crește de la un rând la altul, în josul grilei, iar silicea crește de la o coloană la alta, spre dreapta. Rețetele au fost calculate prin metoda din lecția 5; formula Seger a fiecăreia, calculată de Glazecalc, se încadrează la cel mult 0,01 de alumina ei și 0,06 de silicea ei. Marcați fiecare plăcuță pe o diagramă silice–alumină și desenați-vă propriile regiuni: mat, lucios, ars insuficient, curgere.

Table: Grila Seger: 0,2 KNaO, 0,8 CaO, procente de masă
Label: Grila Seger

| Plăcuța | Al₂O₃ | SiO₂ | 福島長石 | Carbonat de calciu | Caolin | Silice | Ardere oxidantă | Ardere reducătoare |
| ------- | ----: | ---: | -------: | -----------------: | -----: | -----: | --------------- | ------------------ |
| 1       |  0,25 |  2,0 |     46,9 |               32,5 |    3,5 |   17,1 |                 |                    |
| 2       |  0,25 |  2,5 |     41,8 |               28,9 |    3,1 |   26,2 |                 |                    |
| 3       |  0,25 |  3,0 |     37,6 |               26,1 |    2,8 |   33,5 |                 |                    |
| 4       |  0,25 |  3,5 |     34,3 |               23,7 |    2,5 |   39,5 |                 |                    |
| 5       |  0,25 |  4,0 |     31,4 |               21,7 |    2,3 |   44,5 |                 |                    |
| 6       |  0,25 |  4,5 |     29,0 |               20,1 |    2,2 |   48,7 |                 |                    |
| 7       |  0,35 |  2,0 |     44,3 |               30,6 |   13,9 |   11,3 |                 |                    |
| 8       |  0,35 |  2,5 |     39,6 |               27,4 |   12,4 |   20,5 |                 |                    |
| 9       |  0,35 |  3,0 |     35,9 |               24,8 |   11,2 |   28,0 |                 |                    |
| 10      |  0,35 |  3,5 |     32,8 |               22,7 |   10,3 |   34,2 |                 |                    |
| 11      |  0,35 |  4,0 |     30,2 |               20,9 |    9,5 |   39,5 |                 |                    |
| 12      |  0,35 |  4,5 |     28,0 |               19,4 |    8,8 |   43,9 |                 |                    |
| 13      |  0,45 |  2,0 |     41,9 |               29,0 |   23,1 |    6,1 |                 |                    |
| 14      |  0,45 |  2,5 |     37,7 |               26,1 |   20,8 |   15,4 |                 |                    |
| 15      |  0,45 |  3,0 |     34,3 |               23,7 |   18,9 |   23,0 |                 |                    |
| 16      |  0,45 |  3,5 |     31,5 |               21,8 |   17,4 |   29,4 |                 |                    |
| 17      |  0,45 |  4,0 |     29,1 |               20,1 |   16,0 |   34,8 |                 |                    |
| 18      |  0,45 |  4,5 |     27,0 |               18,7 |   14,9 |   39,4 |                 |                    |
| 19      |  0,55 |  2,0 |     39,7 |               27,5 |   31,4 |    1,5 |                 |                    |
| 20      |  0,55 |  2,5 |     35,9 |               24,9 |   28,4 |   10,8 |                 |                    |
| 21      |  0,55 |  3,0 |     32,8 |               22,7 |   26,0 |   18,5 |                 |                    |
| 22      |  0,55 |  3,5 |     30,2 |               20,9 |   23,9 |   25,0 |                 |                    |
| 23      |  0,55 |  4,0 |     28,0 |               19,4 |   22,1 |   30,5 |                 |                    |
| 24      |  0,55 |  4,5 |     26,1 |               18,1 |   20,6 |   35,3 |                 |                    |

Amestecurile din Glazecalc fac triunghiuri și pătrate de 3 până la 66 de plăcuțe, nu această grilă; deschideți orice plăcuță ca rețetă pe [pagina rețetei](/recipe) și tipăriți de acolo lista de cântărire.

## Surse {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): cele șase lecții.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: datele și subiectele lecțiilor.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: temele cursului următor, de 42, 90 și 78 de glazuri în ardere oxidantă și reducătoare.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): programul de calcul al centrului însuși.
- Bilecik Şeyh Edebali University, [informații despre cursul SCT305](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): formula Seger în săptămânile 5, 6 și 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): calculul glazurilor pentru profesorii din Taiwan.
- Glendale Community College, schița cursului ART 195: formula Seger în săptămânile de la 5 la 7 din 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analiza lui 福島長石 din biblioteca Glazecalc.
- IUPAC, mase atomice standard, așa cum le folosește chimia din Glazecalc.
