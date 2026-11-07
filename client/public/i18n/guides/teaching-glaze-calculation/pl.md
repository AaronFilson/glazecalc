---
title: Jak uczyć obliczania szkliw
lead: 6 spotkań dla klasy lub grupy, od surowców i płytek trójskładnikowych, przez wzór Segera liczony w obie strony, po wady szkliwa. Każde spotkanie ma przykład obliczeń, kroki w aplikacji Glazecalc, arkusz do wydruku i pytania sprawdzające.
---

## O tym materiale {#about}

Ten materiał jest dla każdego, kto uczy obliczania szkliw: dla szkoły, zajęć w pracowni, grupy praktykujących ceramików albo osoby uczącej się samodzielnie. Zawiera sześć spotkań, a każde ma cele, listę rzeczy do przygotowania, przykład obliczeń na prawdziwych surowcach, opis pracy w aplikacji Glazecalc, arkusz i pytania sprawdzające.

Kolejność spotkań wzorowano na opublikowanej grupie studyjnej: 陶磁器釉薬技術研究会 (grupie studyjnej ds. szkliw ceramicznych) przy Ibaraki Prefectural Industrial Technology Center w Japonii, która w 2015 r. poprowadziła sześć spotkań dla 12 młodych ceramików i opisała je w raporcie z badań. Jej kurs kontynuacyjny w szkole ceramiki w Kasamie obejmował trzy zadania z płytkami testowymi, w których było odpowiednio 42, 90 i 78 szkliw, każde wypalone w atmosferze utleniającej i redukcyjnej. **Glazecalc nie jest związany z tym ośrodkiem ani z tą szkołą.** Trzymamy się kolejności z ich opublikowanego programu i podajemy go poniżej; tekst, przykłady i arkusze są nasze. Kursy w innych krajach uczą tych samych kroków w niemal tej samej kolejności: SCT305 na Bilecik Şeyh Edebali University w Turcji, ART 195 w Glendale Community College w USA, program nauczania dla szkół ceramicznych w Nadrenii-Palatynacie w Niemczech oraz artykuł 李堅萍 z 2006 r. dla nauczycieli na Tajwanie.

Table: Sześć spotkań
Label: Sześć spotkań

| Spotkanie | Temat                                                 | W aplikacji Glazecalc                  |
| --------- | ----------------------------------------------------- | -------------------------------------- |
| 1         | Surowce, ich działanie, płytki trójskładnikowe        | Surowce, Mieszanki do płytek testowych |
| 2         | Chemia: pierwiastki, wzory, mole                      | Strona surowca                         |
| 3         | Czytanie wzoru Segera, wykres krzemionka–tlenek glinu | Strona receptury, wykres Stulla        |
| 4         | Od receptury do wzoru Segera                          | Jak oblicza się wzór Segera            |
| 5         | Od wzoru Segera do receptury                          | Dobór do celu                          |
| 6         | Masa ceramiczna i wady szkliwa                        | Limity, Porównaj                       |

### Jak korzystać z materiału

- Każde spotkanie trwa około 2 godzin. Na spotkaniach 4 i 5 potrzebne są kalkulatory oraz komputer lub telefon z aplikacją Glazecalc dla każdej pary.
- W przykładach obliczeń użyto surowców sprzedawanych w Japonii i danych ze standardowej biblioteki aplikacji Glazecalc: 福島長石 (skaleń z Fukushimy), kredy (石灰石, węglan wapnia){{en: whiting}}, kaolinu i krzemionki (珪石). Jeśli jest analiza od własnego dostawcy, należy ją dodać na [stronie Surowce](/material): liczby się zmienią, ale metoda nie.
- Wypał odbywa się do SK 8, nominalnie {{2282 °F; 1250 °C}}. Należy użyć stożka, do którego wypala się na zajęciach; liczby SK wyjaśnia część [Wypał według stożków SK](/guides/firing#sk-cones).
- Aby wydrukować arkusz lub mapę płytek, należy wydrukować tę stronę z przeglądarki. Zapisywanie receptur, mieszanek i notatek wymaga bezpłatnego konta.

> [!WARNING]
> Spotkania 1, 3 i 6 to praca w pracowni: odważanie suchych surowców i wypał. Zanim ktokolwiek zacznie ważyć surowce, należy przeczytać [Najważniejsze nawyki](/guides/safe-mixing#habits). Głównym zagrożeniem jest pył z suchego szkliwa.

## Spotkanie 1: Surowce i płytki trójskładnikowe {#materials}

> [!WARNING]
> Suche surowce należy odważać delikatnie, sprzątać na mokro i nosić dobrze dopasowaną półmaskę filtrującą, dopóki proszki są suche. Najpierw należy przeczytać [Główne zagrożenie: pył](/guides/safe-mixing#the-main-hazard) i [Sprzęt ochrony układu oddechowego](/guides/safe-mixing#respirators).

### Cele

- Nazwać trzy role w szkliwie: tlenek szkłotwórczy, topnik{{en: flux}} i stabilizator.
- Posortować 4 popularne surowce według tlenków, które wnoszą.
- Przygotować mieszankę trójskładnikową i odczytywać jej płytki jak mapę.

### Przygotowanie

- Po worku 福島長石, kredy, kaolinu i krzemionki albo surowce, którymi dysponuje klasa.
- Wydrukowana [mapa płytek trójskładnikowych](#tile-maps) z dalszej części oraz 21 płytek testowych na osobę na każdy trójkąt.
- Wypalone płytki z wcześniejszej próby trójskładnikowej, jeśli są, do puszczenia w obieg.

### Przykład obliczeń

Analiza każdego surowca z biblioteki aplikacji Glazecalc podaje tlenki, które zostają po wypale. Strata prażenia (LOI) to to, co się wypala.

Table: Cztery surowce i co wnoszą (procenty masowe, z biblioteki)
Label: Cztery surowce

| Surowiec          | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   LOI | Jego rola                                     |
| ----------------- | ---: | ----: | ----: | ---: | ----: | ----: | --------------------------------------------- |
| 福島長石 (skaleń) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Topnik, z własnym tlenkiem glinu i krzemionką |
| Kreda (石灰石)    |    – |     – |     – |    – | 56,03 | 43,97 | Topnik (wapń)                                 |
| EPK Kaolin        | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizator: główne źródło tlenku glinu      |
| Krzemionka (珪石) |  100 |     – |     – |    – |     – |     – | Tlenek szkłotwórczy                           |

Sam skaleń topi się w SK 8 w lepkie szkło; sama kreda się nie topi; sama krzemionka się nie topi. Zmieszane topią się znacznie lepiej niż każdy z nich z osobna. Pokazuje to mieszanka trójskładnikowa: mapa poniżej zmienia udziały trzech surowców co ~20 % (18 z 90), a w każdej płytce jest 10 % kaolinu.

::shops

### W aplikacji Glazecalc

1. Otworzyć każdy surowiec na [stronie Surowce](/material) lub jego stronę publiczną, na przykład [Fukushima Feldspar](/materials/fukushima-feldspar). Zapisać, jakie tlenki wnosi.
2. Utworzyć trzy receptury: 福島長石 90 z kaolinem 10, kreda 90 z kaolinem 10 oraz krzemionka 90 z kaolinem 10. Na stronie [Mieszanki do płytek testowych](/blends) wybrać **Trójskładnikowa (3 receptury)** i 6 rzędów: wyjdzie 21 płytek, tak jak na mapie poniżej.
3. Wybrać porcję dla każdej płytki i przyciskiem **Drukuj** wydrukować, co trzeba odważyć. Po wypale zapisać wybrane płytki jako receptury z rysunku płytek.

### Arkusz

Table: Arkusz 1: co wnosi każdy surowiec
Label: Arkusz 1

| Surowiec   | Tlenki, które wnosi | Tlenek szkłotwórczy, topnik czy stabilizator? | LOI (%) |
| ---------- | ------------------- | --------------------------------------------- | ------- |
| 福島長石   |                     |                                               |         |
| Kreda      |                     |                                               |         |
| Kaolin     |                     |                                               |         |
| Krzemionka |                     |                                               |         |

### Sprawdzenie

- Który surowiec wnosi większość tlenku glinu i dlaczego szkliwo go potrzebuje?
- Dlaczego narożnik trójkąta z kredą nie topi się samodzielnie?
- W którym miejscu trójkąta płytki stopiły się najlepiej i któremu narożnikowi było ono najbliższe?

## Spotkanie 2: Potrzebna chemia {#chemistry}

### Cele

- Odczytać wzór chemiczny: SiO₂, CaO, Al₂O₃, CaCO₃.
- Obliczyć masę molową z mas atomowych.
- Zamienić gramy na mole i z powrotem.

### Przygotowanie

- Układ okresowy dla każdej osoby i kalkulatory.
- Masy atomowe z tabeli poniżej (standardowe wartości IUPAC, takie jak w aplikacji Glazecalc).

### Przykład obliczeń

Table: Użyte tu masy atomowe (g/mol)
Label: Masy atomowe

| Pierwiastek | Symbol | Masa atomowa |
| ----------- | ------ | -----------: |
| Tlen        | O      |       15,999 |
| Węgiel      | C      |       12,011 |
| Sód         | Na     |        22,99 |
| Glin        | Al     |       26,982 |
| Krzem       | Si     |       28,085 |
| Potas       | K      |       39,098 |
| Wapń        | Ca     |       40,078 |

Wzór zlicza atomy. SiO₂ to jeden atom krzemu i dwa atomy tlenu, więc jeden mol waży 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ to 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO to 56,077 g, a kreda, CaCO₃, to 100,086 g; biblioteka aplikacji Glazecalc zaokrągla ją do 100,08.

**Mol** to liczba, jak tuzin: tyle samo cząsteczek, niezależnie od tego, jakie to cząsteczki. Mole to gramy ÷ masa molowa:

- 25 g krzemionki to 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g kredy to 20 ÷ 100,08 = 0,200 mol. W piecu traci ona dwutlenek węgla (CO₂, 44,009 g/mol) i zostaje 0,200 mol CaO, które waży 0,200 × 56,077 = 11,2 g. Ta strata to jej LOI: 43,97 %.

### W aplikacji Glazecalc

1. Otworzyć [Whiting](/materials/whiting) i [Silica](/materials/silica): każda strona podaje wzór i jego masy.
2. Sprawdzić ręcznie jedną masę molową i porównać ją z wartością na stronie.

### Arkusz

Table: Arkusz 2: masa molowa i mole
Label: Arkusz 2

| Tlenek lub surowiec | Wzór  | Masa molowa (g/mol) | Gramy | Mole |
| ------------------- | ----- | ------------------- | ----- | ---- |
| Krzemionka          | SiO₂  |                     | 30    |      |
| Tlenek glinu        | Al₂O₃ |                     | 10    |      |
| Tlenek wapnia       | CaO   |                     | 5     |      |
| Kreda               | CaCO₃ |                     | 15    |      |

### Sprawdzenie

- Ile gramów waży jeden mol SiO₂ i jak to się oblicza?
- Dlaczego z 20 g kredy w wypalonym szkliwie zostaje mniej niż 20 g?
- Dlaczego tlenki porównujemy w molach, a nie w gramach?

## Spotkanie 3: Czytanie wzoru Segera {#reading-the-formula}

> [!WARNING]
> Barwienie szkliwa oznacza odważanie barwników, a niektóre z nich wymagają większej ostrożności niż surowce bazowe. Najpierw należy przeczytać [Surowce wymagające największej ostrożności](/guides/safe-mixing#materials).

### Cele

- Odczytać trzy kolumny wzoru Segera (UMF){{en: unity formula}} (ゼーゲル式: tak po japońsku nazywa się wzór Segera): topniki, stabilizator, tlenek szkłotwórczy.
- Znaleźć szkliwo na wykresie krzemionka–tlenek glinu i wiedzieć, co ten wykres może, a czego nie może powiedzieć.
- Zabarwić gotowe szkliwo etapami i zapisać wyniki.

### Przygotowanie

- Wzór Segera z przykładu poniżej, zapisany dużymi literami.
- Gotowe przezroczyste szkliwo i barwnik, na przykład czerwony tlenek żelaza{{en: red iron oxide}} (弁柄).

### Przykład obliczeń

Szkliwo ze spotkania 4, czyli 福島長石 45, kreda 20, kaolin 10 i krzemionka 25, ma taki wzór Segera (dane z aplikacji Glazecalc, zaokrąglone):

Table: Wzór Segera w trzech kolumnach
Label: Wzór Segera

| Topniki (RO, R₂O) | Stabilizator (R₂O₃) | Tlenek szkłotwórczy (RO₂) |
| ----------------- | ------------------- | ------------------------- |
| K₂O 0,18          | Al₂O₃ 0,43          | SiO₂ 3,45                 |
| Na₂O 0,10         |                     |                           |
| CaO 0,72          |                     |                           |

- Topniki sumują się do 1: to reguła tego wzoru. Każda inna liczba to mole na każdy mol topników.
- Stosunek krzemionki do tlenku glinu to 3,45 ÷ 0,43, czyli około 8: typowe szkliwo błyszczące.
- Większość topników stanowi wapń, jak w większości japońskich szkliw wapniowych (石灰釉).

Wykres z krzemionką w poziomie i tlenkiem glinu w pionie pokazuje każde szkliwo jako punkt. Próby Segera i wykres Stulla z 1912 r. są tego rodzaju, a 釉性状図 nanosi na taki wykres własne wypalone płytki klasy. Strona receptury w aplikacji Glazecalc rysuje wykres Stulla i to szkliwo leży w jego jasnym obszarze. Obszary Stulla pochodzą z jego własnych topników i wypału: to wskazówka, a nie przewidywanie. [Siatka płytek](#tile-maps) poniżej pozwala klasie narysować własny wykres przy własnym wypale.

::stull-chart

Gdy receptura gotowego szkliwa nie jest znana, aplikacja Glazecalc nie może obliczyć jego wzoru. Zamiast tego barwnik dodaje się ponad 100: 100 g suchego szkliwa z 1, 2 i 3 g tlenku żelaza, po jednej płytce, wypalone w atmosferze utleniającej i redukcyjnej.

### W aplikacji Glazecalc

1. Na [stronie receptury](/recipe) wpisać powyższą recepturę i odczytać jej **Wzór Segera** oraz **Wykres Stulla**.
2. Zmienić ilość krzemionki z 25 na 35 i zobaczyć, jak punkt przesuwa się w prawo.
3. Dla bazy, której receptura jest znana, dodać barwnik jako dodatek i użyć próby liniowej na stronie [Mieszanki do płytek testowych](/blends), aby zmieniać go etapami.

### Arkusz

Table: Arkusz 3: barwnik w gotowym szkliwie
Label: Arkusz 3

| Płytka | Barwnik (g na 100 g) | Wypał utleniający: jak wygląda | Wypał redukcyjny: jak wygląda |
| ------ | -------------------- | ------------------------------ | ----------------------------- |
| 1      | 0                    |                                |                               |
| 2      | 1                    |                                |                               |
| 3      | 2                    |                                |                               |
| 4      | 3                    |                                |                               |

### Sprawdzenie

- Która kolumna wzoru Segera sumuje się do 1?
- Jaki jest stosunek krzemionki do tlenku glinu w tym szkliwie i co on sugeruje?
- Dlaczego punkt w jasnym obszarze wykresu może w tym piecu dać mat?

## Spotkanie 4: Od receptury do wzoru Segera {#recipe-to-formula}

### Cele

- Obliczyć ręcznie wzór Segera z receptury.
- Porównać wynik z własnymi obliczeniami aplikacji Glazecalc.

### Przygotowanie

- Arkusz 4, cztery analizy ze spotkania 1 i kalkulatory.

### Przykład obliczeń

Receptura: 福島長石 45, kreda 20, kaolin EPK 10, krzemionka 25. Każdą ilość należy potraktować jako gramy. Dla każdego surowca gramy × procent tlenku ÷ 100 ÷ jego masa molowa dają liczbę moli. Tabela podaje główne tlenki; aplikacja Glazecalc liczy też śladowe (żelazo i tytan w kaolinie, magnez w skaleniu).

Table: Mole każdego tlenku w porcji (100 g)
Label: Mole w porcji

| Surowiec   | Gramy |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| ---------- | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石   |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Kreda      |    20 |      – |      – | 0,1998 |      – |      – |
| Kaolin     |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Krzemionka |    25 |      – |      – |      – |      – | 0,4161 |
| Razem      |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Topniki sumują się do 0,0518 + 0,0275 + 0,2041 + 0,0014 (tlenek magnezu) = 0,2847 mol. Każdą sumę dzieli się przez tę liczbę:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

To jest wzór ze spotkania 3.

### W aplikacji Glazecalc

1. Wpisać recepturę na [stronie receptury](/recipe).
2. Otworzyć **Jak oblicza się wzór Segera**. Pokazuje on te kroki z liczbami tej receptury: gramy, mole każdego tlenku w każdym surowcu, sumy i dzielenie przez topniki.
3. Porównać każdy wiersz z arkuszem. Potem zmienić jedną ilość i obliczyć tylko tę kolumnę, którą ta zmiana dotyczy.

### Arkusz

Table: Arkusz 4: od receptury do wzoru Segera
Label: Arkusz 4

| Surowiec  | Gramy | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| --------- | ----- | --- | ---- | --- | ----- | ---- |
|           |       |     |      |     |       |      |
|           |       |     |      |     |       |      |
|           |       |     |      |     |       |      |
|           |       |     |      |     |       |      |
| Razem     |       |     |      |     |       |      |
| ÷ topniki |       |     |      |     |       |      |

### Sprawdzenie

- Dlaczego każda wielkość porcji daje ten sam wzór Segera?
- Jakie tlenki wnosi kaolin i który z nich ma tu największe znaczenie?
- Dlaczego LOI kredy pomija się we wzorze Segera?

## Spotkanie 5: Od wzoru Segera do receptury {#formula-to-recipe}

### Cele

- Dobrać surowce do docelowego wzoru i obliczyć, ile którego potrzeba.
- Użyć funkcji Dobór do celu i powiedzieć, jak blisko celu wypada wynik.

### Przygotowanie

- Cel z przykładu poniżej, arkusz 5 i kalkulatory; aplikacja Glazecalc z kontem.

### Przykład obliczeń

Cel: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ i 4,0 SiO₂. Surowce bierze się w tej kolejności, każdy ze względu na tlenek, który tylko on może wnieść:

1. **Skaleń, dla potasu i sodu.** Jedna jednostka 福島長石 (536,8 g, masa zawierająca jeden mol topników) wnosi 0,94 mol K₂O i Na₂O. Cel wymaga 0,3, więc 0,3 ÷ 0,94 = 0,319 jednostki: 171,4 g. Wnosi też 0,015 CaO, 0,328 Al₂O₃ i 1,865 SiO₂.
2. **Kreda, dla reszty wapnia.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolin, dla reszty tlenku glinu.** 0,4 − 0,328 = 0,072 mol. Kaolin EPK zawiera jeden mol Al₂O₃ w 272,6 g, więc potrzeba 19,6 g, które wnoszą też 0,149 SiO₂.
4. **Krzemionka, dla reszty.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Porcja waży 379,0 g. W procentach: 福島長石 45,2, kreda 18,1, kaolin 5,2, krzemionka 31,5. Skaleń ustala stosunek potasu do sodu, więc receptura daje 0,195 K₂O i 0,104 Na₂O: blisko celu, ale nie dokładnie w cel.

### W aplikacji Glazecalc

1. Otworzyć [Dobór do celu](/solve), wybrać **Wzór Segera (mole, topniki sumują się do 1)** i wpisać cel.
2. W części **Surowce** podać 福島長石, kredę, kaolin EPK i krzemionkę, po czym wybrać **Dobierz**.
3. Wynik to 福島長石 44,9, kreda 18,2, kaolin 5,6 i krzemionka 31,3 oraz tabela, jak blisko celu wypada każdy tlenek. Porównać go z obliczeniami ręcznymi: solver liczy każdy ślad i znajduje najlepsze dopasowanie, na jakie pozwalają cztery surowce.
4. Wybrać **Otwórz jako nową recepturę** i sprawdzić ją na stronie receptury.

### Arkusz

Table: Arkusz 5: od celu do receptury
Label: Arkusz 5

| Krok | Surowiec | Dla którego tlenku | Potrzebne mole | Gramy | Wnosi też |
| ---- | -------- | ------------------ | -------------- | ----- | --------- |
| 1    |          |                    |                |       |           |
| 2    |          |                    |                |       |           |
| 3    |          |                    |                |       |           |
| 4    |          |                    |                |       |           |

### Sprawdzenie

- Dlaczego skaleń oblicza się jako pierwszy?
- Dlaczego te cztery surowce nie mogą dać dokładnie 0,2 K₂O i 0,1 Na₂O?
- Co należałoby dodać do surowców, aby wprowadzić tlenek magnezu?

## Spotkanie 6: Masa ceramiczna i wady szkliwa {#body-and-defects}

> [!WARNING]
> Wypalone szkliwo może uwalniać metale do żywności i napojów, i może przy tym wyglądać doskonale. Uwalniać metale mogą szkliwa o dużej zawartości baru lub z miedzią oraz każde szkliwo z ołowiem. To, co się uwalnia, pokaże wyłącznie laboratoryjne badanie uwalniania metali{{en: leach test}} z wypalonego naczynia; żadne obliczenie tego nie pokaże. Należy przeczytać [Bezpieczeństwo w kontakcie z żywnością](/guides/glazing-basics#food-safety) i [Surowce wymagające największej ostrożności](/guides/safe-mixing#materials).

### Cele

- Zmierzyć skurcz i nasiąkliwość masy ceramicznej.
- Nazwać typowe wady, ich zwykłe przyczyny i pierwszą poprawkę.
- Wiedzieć, które wady czynią wyroby niebezpiecznymi.

### Przygotowanie

- Beleczki testowe z własnej masy ceramicznej, ze znaczkami co 100 mm zrobionymi na mokro: wypalone i niewypalone.
- Płytki z wadami, jeśli są: pęknięciami włoskowatymi, zbieganiem się szkliwa, nakłuciami, spływaniem.

### Przykład obliczeń

- **Skurcz**: (zaznaczona długość − długość po wypale) ÷ zaznaczona długość × 100. Znaczki co 100 mm, które po wypale dzieli 88 mm: skurcz 12 %.
- **Nasiąkliwość**: (masa po namoczeniu − masa sucha) ÷ masa sucha × 100. Wypalona beleczka o masie 50,0 g, która po namoczeniu waży 50,6 g: 1,2 %.

Table: Wady, przyczyny i pierwsza poprawka we wzorze Segera
Label: Wady

| Wada                  | Zwykła przyczyna                                   | Pierwsza poprawka do wypróbowania                        |
| --------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Pęknięcia włoskowate  | Szkliwo kurczy się bardziej niż czerep             | Mniej K₂O i Na₂O; więcej wapnia, tlenku magnezu lub boru |
| Odpryskiwanie szkliwa | Szkliwo kurczy się znacznie mniej niż czerep       | Więcej K₂O i Na₂O                                        |
| Spływanie szkliwa     | Zbyt mało tlenku glinu lub zbyt gruba warstwa      | Więcej tlenku glinu; cieńsza warstwa                     |
| Zbieganie się szkliwa | Zakurzony biskwit lub gruba warstwa, która spękała | Oczyścić biskwit; cieńsza warstwa                        |
| Nakłucia              | Gaz, po którym ślad nie zasklepił się              | Przetrzymanie w temperaturze maksymalnej wypału; cieńsza warstwa           |

Część [Dopasowanie szkliwa i wady](/guides/glazing-basics#fit-and-defects) wyjaśnia każdą z nich, razem z próbą z lodowatą wodą dla pęknięć włoskowatych. Wyrobów z pęknięciami włoskowatymi ani z odpryskującym szkliwem nie należy używać do żywności ani napojów.

::food-limits

### W aplikacji Glazecalc

1. Na [stronie receptury](/recipe) odczytać panel **Limity** dla własnego szkliwa oraz jego obliczoną rozszerzalność.
2. Skopiować recepturę, zamienić część skalenia na kredę i porównać obie receptury: w którą stronę przesunęła się rozszerzalność?

### Arkusz

Table: Arkusz 6: masa ceramiczna
Label: Arkusz 6

| Beleczka | Zaznaczona długość (mm) | Długość po wypale (mm) | Skurcz (%) | Masa sucha (g) | Masa po namoczeniu (g) | Nasiąkliwość (%) |
| -------- | ----------------------- | ---------------------- | ---------- | -------------- | ---------------------- | ---------------- |
| 1        | 100                     |                        |            |                |                        |                  |
| 2        | 100                     |                        |            |                |                        |                  |

### Sprawdzenie

- Jaka wada powstaje, gdy szkliwo kurczy się bardziej niż masa ceramiczna, i jaka jest pierwsza poprawka?
- Dlaczego wyrobów z odpryskującym szkliwem nigdy nie wolno używać do żywności?
- Czy obliczenie może wykazać, że szkliwo jest bezpieczne w kontakcie z żywnością? Co może to wykazać?

## Mapy płytek do wydruku {#tile-maps}

### Mapa próby trójskładnikowej: 42 szkliwa

Dwa trójkąty po 21 płytek, z układu na stronie Mieszanki do płytek testowych przy 6 rzędach: płytka 1 na górze (skaleń), dolny rząd od kredy (po lewej) do krzemionki (po prawej). Trójkąt II to trójkąt I z 1 g czerwonego tlenku żelaza ponad każde 100 g, co w atmosferze redukcyjnej zmierza ku celadonowi (青磁). Po wypale w atmosferze utleniającej i redukcyjnej daje to 84 płytki. Ilości to gramy na 100 g.

Table: Mapa próby trójskładnikowej: 福島長石, kreda i krzemionka, z 10 kaolinu w każdej płytce
Label: Mapa próby trójskładnikowej

| Płytka (I) | Płytka (II) | 福島長石 | Kreda | Krzemionka | Kaolin | I utl. | I red. | II utl. | II red. |
| ---------- | ----------- | -------: | ----: | ---------: | -----: | ------ | ------ | ------- | ------- |
| 1          | 22          |       90 |     0 |          0 |     10 |        |        |         |         |
| 2          | 23          |       72 |    18 |          0 |     10 |        |        |         |         |
| 3          | 24          |       72 |     0 |         18 |     10 |        |        |         |         |
| 4          | 25          |       54 |    36 |          0 |     10 |        |        |         |         |
| 5          | 26          |       54 |    18 |         18 |     10 |        |        |         |         |
| 6          | 27          |       54 |     0 |         36 |     10 |        |        |         |         |
| 7          | 28          |       36 |    54 |          0 |     10 |        |        |         |         |
| 8          | 29          |       36 |    36 |         18 |     10 |        |        |         |         |
| 9          | 30          |       36 |    18 |         36 |     10 |        |        |         |         |
| 10         | 31          |       36 |     0 |         54 |     10 |        |        |         |         |
| 11         | 32          |       18 |    72 |          0 |     10 |        |        |         |         |
| 12         | 33          |       18 |    54 |         18 |     10 |        |        |         |         |
| 13         | 34          |       18 |    36 |         36 |     10 |        |        |         |         |
| 14         | 35          |       18 |    18 |         54 |     10 |        |        |         |         |
| 15         | 36          |       18 |     0 |         72 |     10 |        |        |         |         |
| 16         | 37          |        0 |    90 |          0 |     10 |        |        |         |         |
| 17         | 38          |        0 |    72 |         18 |     10 |        |        |         |         |
| 18         | 39          |        0 |    54 |         36 |     10 |        |        |         |         |
| 19         | 40          |        0 |    36 |         54 |     10 |        |        |         |         |
| 20         | 41          |        0 |    18 |         72 |     10 |        |        |         |         |
| 21         | 42          |        0 |     0 |         90 |     10 |        |        |         |         |

### Siatka Segera: 24 szkliwa

Każda płytka ma te same topniki, 0,2 KNaO i 0,8 CaO, z 福島長石 i kredy. Tlenek glinu zmienia się w dół siatki, a krzemionka w poprzek. Receptury obliczono metodą ze spotkania 5; wzór Segera każdej z nich, liczony w aplikacji Glazecalc, mieści się w granicach 0,01 dla tlenku glinu i 0,06 dla krzemionki. Każdą płytkę należy zaznaczyć na wykresie krzemionki względem tlenku glinu i narysować własne obszary: matowy, błyszczący, niedopalony, spływający.

Table: Siatka Segera: 0,2 KNaO, 0,8 CaO, procenty masowe
Label: Siatka Segera

| Płytka | Al₂O₃ | SiO₂ | 福島長石 | Kreda | Kaolin | Krzemionka | Wypał utleniający | Wypał redukcyjny |
| ------ | ----: | ---: | -------: | ----: | -----: | ---------: | ----------------- | ---------------- |
| 1      |  0,25 |  2,0 |     46,9 |  32,5 |    3,5 |       17,1 |                   |                  |
| 2      |  0,25 |  2,5 |     41,8 |  28,9 |    3,1 |       26,2 |                   |                  |
| 3      |  0,25 |  3,0 |     37,6 |  26,1 |    2,8 |       33,5 |                   |                  |
| 4      |  0,25 |  3,5 |     34,3 |  23,7 |    2,5 |       39,5 |                   |                  |
| 5      |  0,25 |  4,0 |     31,4 |  21,7 |    2,3 |       44,5 |                   |                  |
| 6      |  0,25 |  4,5 |     29,0 |  20,1 |    2,2 |       48,7 |                   |                  |
| 7      |  0,35 |  2,0 |     44,3 |  30,6 |   13,9 |       11,3 |                   |                  |
| 8      |  0,35 |  2,5 |     39,6 |  27,4 |   12,4 |       20,5 |                   |                  |
| 9      |  0,35 |  3,0 |     35,9 |  24,8 |   11,2 |       28,0 |                   |                  |
| 10     |  0,35 |  3,5 |     32,8 |  22,7 |   10,3 |       34,2 |                   |                  |
| 11     |  0,35 |  4,0 |     30,2 |  20,9 |    9,5 |       39,5 |                   |                  |
| 12     |  0,35 |  4,5 |     28,0 |  19,4 |    8,8 |       43,9 |                   |                  |
| 13     |  0,45 |  2,0 |     41,9 |  29,0 |   23,1 |        6,1 |                   |                  |
| 14     |  0,45 |  2,5 |     37,7 |  26,1 |   20,8 |       15,4 |                   |                  |
| 15     |  0,45 |  3,0 |     34,3 |  23,7 |   18,9 |       23,0 |                   |                  |
| 16     |  0,45 |  3,5 |     31,5 |  21,8 |   17,4 |       29,4 |                   |                  |
| 17     |  0,45 |  4,0 |     29,1 |  20,1 |   16,0 |       34,8 |                   |                  |
| 18     |  0,45 |  4,5 |     27,0 |  18,7 |   14,9 |       39,4 |                   |                  |
| 19     |  0,55 |  2,0 |     39,7 |  27,5 |   31,4 |        1,5 |                   |                  |
| 20     |  0,55 |  2,5 |     35,9 |  24,9 |   28,4 |       10,8 |                   |                  |
| 21     |  0,55 |  3,0 |     32,8 |  22,7 |   26,0 |       18,5 |                   |                  |
| 22     |  0,55 |  3,5 |     30,2 |  20,9 |   23,9 |       25,0 |                   |                  |
| 23     |  0,55 |  4,0 |     28,0 |  19,4 |   22,1 |       30,5 |                   |                  |
| 24     |  0,55 |  4,5 |     26,1 |  18,1 |   20,6 |       35,3 |                   |                  |

Funkcja Mieszanki do płytek testowych w aplikacji Glazecalc tworzy trójkąty i kwadraty od 3 do 66 płytek, a nie tę siatkę; każdą płytkę można otworzyć jako recepturę na [stronie receptury](/recipe) i stamtąd wydrukować listę odważek.

## Źródła {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): sześć spotkań.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: daty i tematy spotkań.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: zadania kursu kontynuacyjnego, w których było 42, 90 i 78 szkliw w atmosferze utleniającej i redukcyjnej.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): własny program obliczeniowy ośrodka.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): wzór Segera w tygodniach 5, 6 i 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): obliczanie szkliw dla nauczycieli szkolnych na Tajwanie.
- Glendale Community College, ART 195 course outline: wzór Segera w tygodniach od 5 do 7 z 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: analiza 福島長石 w bibliotece aplikacji Glazecalc.
- IUPAC, standardowe masy atomowe, takie jak w obliczeniach aplikacji Glazecalc.
