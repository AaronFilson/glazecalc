---
title: Výučba výpočtu glazúr
lead: 6 lekcií pre triedu alebo študijnú skupinu, od surovín a trojzložkových skúšok až po Segerov vzorec počítaný oboma smermi a chyby glazúr, každá s riešeným príkladom, postupom v aplikácii Glazecalc, pracovným listom na tlač a otázkami na kontrolu.
---

## O tomto balíku {#about}

Tento balík je pre každého, kto učí výpočet glazúr: školu, keramický krúžok, študijnú skupinu skúsených keramikov alebo keramika, ktorý sa učí sám. Má šesť lekcií a každá z nich má ciele, prípravu, riešený príklad so skutočnými surovinami, postup v aplikácii Glazecalc, pracovný list a otázky na kontrolu.

Poradie lekcií vychádza zo zverejnenej študijnej skupiny: 陶磁器釉薬技術研究会 (študijná skupina pre keramické glazúry) Priemyselného technologického centra prefektúry Ibaraki v Japonsku, ktorá v roku 2015 viedla šesť lekcií pre 12 mladých keramikov a opísala ich vo svojej výskumnej správe. Nadväzujúci kurz na keramickej škole v Kasame zadal tri úlohy s doštičkami, so 42, 90 a 78 glazúrami, pričom každá sa vypaľovala oxidačným aj redukčným výpalom. **Glazecalc nie je nijako spojený s týmto centrom ani s touto školou.** Riadime sa poradím v ich zverejnenom prehľade a uvádzame ho nižšie; text, príklady a pracovné listy sú naše. Kurzy v iných krajinách učia tie isté kroky takmer v rovnakom poradí: SCT305 na Bilecik Şeyh Edebali University v Turecku, ART 195 na Glendale Community College v USA, učebné osnovy pre keramické školy v Porýní-Falcku v Nemecku a štúdia 李堅萍 z roku 2006 pre učiteľov na Taiwane.

Table: Šesť lekcií
Label: Šesť lekcií

| Lekcia | Téma                                                            | V aplikácii Glazecalc            |
| ------ | --------------------------------------------------------------- | -------------------------------- |
| 1      | Suroviny, čo robia, trojzložkové skúšky                         | Suroviny, Zmesi (trojuholník)    |
| 2      | Chémia: prvky, vzorce, móly                                     | Stránka suroviny                 |
| 3      | Čítanie Segerovho vzorca, diagram oxid kremičitý – oxid hlinitý | Stránka receptu, Stullov diagram |
| 4      | Od receptu k Segerovmu vzorcu                                   | Ako sa počíta Segerov vzorec     |
| 5      | Od Segerovho vzorca k receptu                                   | Vypočítať podľa cieľa            |
| 6      | Keramická hmota a chyby glazúr                                  | Limity, Porovnať                 |

### Ako to používať

- Každá lekcia trvá približne 2 hodiny. Lekcie 4 a 5 vyžadujú kalkulačky a pre každú dvojicu počítač alebo telefón s aplikáciou Glazecalc.
- Riešené príklady používajú suroviny predávané v Japonsku a hodnoty zo štandardnej knižnice aplikácie Glazecalc: 福島長石 (fukušimský živec), kriedu (石灰石, uhličitan vápenatý){{en: whiting}}, kaolín a kremeň (珪石). Ak máte rozbor od svojho dodávateľa, použite ho: pridajte ho na [stránke Suroviny](/material) a čísla sa zmenia, postup nie.
- Výpal je na kužeľ SK 8, menovitá teplota {{2282 °F; 1250 °C}}. Použite kužeľ, na ktorý vypaľuje vaša trieda; [Výpal podľa kužeľov SK](/guides/firing#sk-cones) vysvetľuje čísla SK.
- Ak chcete vytlačiť pracovný list alebo plán doštičiek, vytlačte túto stránku z prehliadača. Na ukladanie receptov, zmesí a poznámok je potrebný bezplatný účet.

> [!WARNING]
> Lekcie 1, 3 a 6 sú laboratórna práca: vážia sa suché suroviny a vypaľuje sa. Skôr než niekto navažuje akúkoľvek surovinu, prečítajte si [Najdôležitejšie návyky](/guides/safe-mixing#habits). Hlavným nebezpečenstvom je prach zo suchej glazúry.

## Lekcia 1: Suroviny a trojzložkové skúšky {#materials}

> [!WARNING]
> Suché suroviny vážte opatrne, upratujte na mokro a kým sú prášky suché, noste dobre priliehajúci respirátor. Najprv si prečítajte [Hlavné nebezpečenstvo: prach](/guides/safe-mixing#the-main-hazard) a [Respirátory](/guides/safe-mixing#respirators).

### Ciele

- Pomenujte tri úlohy v glazúre: sklotvorný oxid, tavivo{{en: flux}} a stabilizátor.
- Roztrieďte 4 bežné suroviny podľa oxidov, ktoré prinášajú.
- Zostavte trojzložkovú zmes a čítajte jej doštičky ako mapu.

### Príprava

- Jedno vrece každej zo surovín: 福島長石, kriedy, kaolínu a kremeňa, alebo suroviny, ktoré má vaša trieda.
- [Plán trojzložkových doštičiek](#tile-maps) nižšie, vytlačený, a 21 skúšobných doštičiek na študenta pre každý trojuholník.
- Vypálené doštičky z predchádzajúcej trojzložkovej skúšky, ak ich máte, aby ste ich mohli podávať dookola.

### Riešený príklad

Rozbor každej suroviny z knižnice aplikácie Glazecalc uvádza oxidy, ktoré po výpale zostanú. Strata žíhaním (SŽ) je to, čo zhorí.

Table: Štyri suroviny a čo prinášajú (hmotnostné percentá, z knižnice)
Label: Štyri suroviny

| Surovina         | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |    SŽ | Úloha                                                  |
| ---------------- | ---: | ----: | ----: | ---: | ----: | ----: | ------------------------------------------------------ |
| 福島長石 (živec) | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Tavivo, s vlastným oxidom hlinitým a oxidom kremičitým |
| Krieda (石灰石)  |    – |     – |     – |    – | 56,03 | 43,97 | Tavivo (vápnik)                                        |
| Kaolín EPK       | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilizátor: hlavný zdroj oxidu hlinitého             |
| Kremeň (珪石)    |  100 |     – |     – |    – |     – |     – | Sklotvorný oxid                                        |

Samotný živec sa pri kuželi SK 8 pretaví na viskózne sklo; samotná krieda sa nepretaví; samotný kremeň sa nepretaví. Po zmiešaní sa tavia oveľa lepšie než ktorákoľvek z nich osobitne. Trojzložková zmes ukáže, kde: plán doštičiek nižšie mení tri suroviny po krokoch ~20 % (18 z 90), pričom každá doštička obsahuje 10 % kaolínu.

::shops

### V aplikácii Glazecalc

1. Otvorte každú surovinu na [stránke Suroviny](/material) alebo jej verejnú stránku, napríklad [Fukushima Feldspar](/materials/fukushima-feldspar). Poznačte si, aké oxidy prináša.
2. Vytvorte tri recepty: 福島長石 90 s kaolínom 10, krieda 90 s kaolínom 10 a kremeň 90 s kaolínom 10. V časti [Zmesi na skúšobné doštičky](/blends) vyberte **Trojuholník (3 recepty)** a 6 riadkov: 21 doštičiek, rovnako ako v pláne nižšie.
3. Vyberte dávku pre každú doštičku a pomocou **Tlačiť** vytlačte, čo sa má navážiť. Po výpale uložte doštičky, ktoré sa vám páčia, ako recepty z obrázka doštičiek.

### Pracovný list

Table: Pracovný list 1: čo každá surovina prináša
Label: Pracovný list 1

| Surovina | Oxidy, ktoré prináša | Sklotvorný oxid, tavivo alebo stabilizátor? | SŽ (%) |
| -------- | -------------------- | ------------------------------------------- | ------ |
| 福島長石 |                      |                                             |        |
| Krieda   |                      |                                             |        |
| Kaolín   |                      |                                             |        |
| Kremeň   |                      |                                             |        |

### Kontrola

- Ktorá surovina prináša väčšinu oxidu hlinitého a prečo ho glazúra potrebuje?
- Prečo sa roh trojuholníka s kriedou sám o sebe nepretaví?
- Kde na trojuholníku sa vaše doštičky pretavili najlepšie a ktorému rohu to bolo najbližšie?

## Lekcia 2: Chémia, ktorú potrebujete {#chemistry}

### Ciele

- Čítajte chemický vzorec: SiO₂, CaO, Al₂O₃, CaCO₃.
- Vypočítajte molárnu hmotnosť z atómových hmotností.
- Premieňajte gramy na móly a naspäť.

### Príprava

- Periodická tabuľka pre každého študenta a kalkulačky.
- Atómové hmotnosti z tabuľky nižšie (štandardné hodnoty IUPAC, aké používa Glazecalc).

### Riešený príklad

Table: Tu použité atómové hmotnosti (g/mol)
Label: Atómové hmotnosti

| Prvok   | Značka | Atómová hmotnosť |
| ------- | ------ | ---------------: |
| Kyslík  | O      |           15,999 |
| Uhlík   | C      |           12,011 |
| Sodík   | Na     |            22,99 |
| Hliník  | Al     |           26,982 |
| Kremík  | Si     |           28,085 |
| Draslík | K      |           39,098 |
| Vápnik  | Ca     |           40,078 |

Vzorec počíta atómy. SiO₂ je jeden atóm kremíka a dva atómy kyslíka, takže jeden mól váži 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ je 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO je 56,077 g a krieda, CaCO₃, je 100,086 g; knižnica aplikácie Glazecalc ju zaokrúhľuje na 100,08.

**Mól** je počet, ako tucet: rovnaký počet molekúl, nech ide o čokoľvek. Móly sú gramy ÷ molárna hmotnosť:

- 25 g kremeňa je 25 ÷ 60,083 = 0,416 mol SiO₂.
- 20 g kriedy je 20 ÷ 100,08 = 0,200 mol. V peci stratí oxid uhličitý (CO₂, 44,009 g/mol) a zostane z nej 0,200 mol CaO, ktorý váži 0,200 × 56,077 = 11,2 g. Táto strata je jej SŽ: 43,97 %.

### V aplikácii Glazecalc

1. Otvorte [Kriedu](/materials/whiting) a [Kremeň](/materials/silica): každá stránka uvádza vzorec a jeho hmotnosti.
2. Jednu molárnu hmotnosť vypočítajte ručne a porovnajte ju so stránkou.

### Pracovný list

Table: Pracovný list 2: molárna hmotnosť a móly
Label: Pracovný list 2

| Oxid alebo surovina | Vzorec | Molárna hmotnosť (g/mol) | Gramy | Móly |
| ------------------- | ------ | ------------------------ | ----- | ---- |
| Kremeň              | SiO₂   |                          | 30    |      |
| Oxid hlinitý        | Al₂O₃  |                          | 10    |      |
| Oxid vápenatý       | CaO    |                          | 5     |      |
| Krieda              | CaCO₃  |                          | 15    |      |

### Kontrola

- Koľko gramov váži jeden mól SiO₂ a ako sa to vypočíta?
- Prečo 20 g kriedy zanechá vo vypálenej glazúre menej než 20 g?
- Prečo porovnávame oxidy v mólach, a nie v gramoch?

## Lekcia 3: Čítanie Segerovho vzorca {#reading-the-formula}

> [!WARNING]
> Zafarbenie glazúry znamená vážiť farbivá a niektoré z nich vyžadujú väčšiu opatrnosť než základné suroviny. Najprv si prečítajte [Suroviny, ktoré si vyžadujú najväčšiu opatrnosť](/guides/safe-mixing#materials).

### Ciele

- Prečítajte tri stĺpce Segerovho vzorca (UMF){{en: unity formula}} (ゼーゲル式): tavivá, stabilizátor, sklotvorný oxid.
- Nájdite glazúru na diagrame oxid kremičitý – oxid hlinitý a vedzte, čo vám diagram môže a čo nemôže povedať.
- Zafarbte hotovú glazúru po krokoch a zaznamenajte to.

### Príprava

- Segerov vzorec uvedený nižšie, napísaný veľkými písmenami.
- Hotová transparentná glazúra a farbivo, napríklad červený oxid železa (弁柄){{en: red iron oxide}}.

### Riešený príklad

Glazúra z lekcie 4, 福島長石 45, krieda 20, kaolín 10 a kremeň 25, má tento Segerov vzorec (hodnoty z aplikácie Glazecalc, zaokrúhlené):

Table: Segerov vzorec v troch stĺpcoch
Label: Segerov vzorec

| Tavivá (RO, R₂O) | Stabilizátor (R₂O₃) | Sklotvorný oxid (RO₂) |
| ---------------- | ------------------- | --------------------- |
| K₂O 0,18         | Al₂O₃ 0,43          | SiO₂ 3,45             |
| Na₂O 0,10        |                     |                       |
| CaO 0,72         |                     |                       |

- Tavivá dávajú spolu 1: to je pravidlo vzorca. Každé ďalšie číslo udáva móly na jeden mól taviv.
- Pomer SiO₂ : Al₂O₃ je 3,45 ÷ 0,43, približne 8: typická lesklá glazúra.
- Väčšinu taviva tvorí vápnik, ako vo väčšine japonských vápenatých glazúr (石灰釉).

Diagram s oxidom kremičitým vodorovne a oxidom hlinitým zvisle zakreslí každú glazúru ako bod. Segerove skúšky a Stullov diagram z roku 1912 sú tohto druhu a 釉性状図 do neho zakresľuje vypálené doštičky vlastnej triedy. Stránka receptu v aplikácii Glazecalc kreslí Stullov diagram a táto glazúra leží v jeho lesklej oblasti. Stullove oblasti vychádzajú z jeho vlastných taviv a výpalu: sú orientáciou, nie predpoveďou. [Mriežka doštičiek](#tile-maps) nižšie umožní triede nakresliť si vlastný diagram pri vlastnom výpale.

::stull-chart

Pri zafarbení hotovej glazúry, ktorej recept nepoznáte, Glazecalc nevie vypočítať jej vzorec. Farbivo preto pridajte navyše k 100: 100 g suchej glazúry s 1, 2 a 3 g oxidu železa, každá po jednej doštičke, vypálené oxidačným aj redukčným výpalom.

### V aplikácii Glazecalc

1. Na [stránke receptu](/recipe) zadajte vyššie uvedený recept a prečítajte si jeho **Segerov vzorec** a **Stullov diagram**.
2. Zmeňte kremeň z 25 na 35 a sledujte, ako sa bod posunie doprava.
3. Pri základnej glazúre, ktorej recept máte, urobte z farbiva prísadu navyše a použite skúšobný rad v časti [Zmesi na skúšobné doštičky](/blends), aby ste ho zvyšovali po krokoch.

### Pracovný list

Table: Pracovný list 3: farbivo v hotovej glazúre
Label: Pracovný list 3

| Doštička | Farbivo (g na 100 g) | Oxidácia: ako vyzerá | Redukcia: ako vyzerá |
| -------- | -------------------- | -------------------- | -------------------- |
| 1        | 0                    |                      |                      |
| 2        | 1                    |                      |                      |
| 3        | 2                    |                      |                      |
| 4        | 3                    |                      |                      |

### Kontrola

- Ktorý stĺpec Segerovho vzorca dáva spolu 1?
- Aký je pomer SiO₂ : Al₂O₃ tejto glazúry a čo naznačuje?
- Prečo môže bod v lesklej oblasti diagramu vo vašej peci stále dať matnú doštičku?

## Lekcia 4: Od receptu k Segerovmu vzorcu {#recipe-to-formula}

### Ciele

- Vypočítajte Segerov vzorec z receptu ručne.
- Porovnajte ho s vlastným výpočtom aplikácie Glazecalc.

### Príprava

- Pracovný list 4, štyri rozbory z lekcie 1 a kalkulačky.

### Riešený príklad

Recept: 福島長石 45, krieda 20, kaolín EPK 10, kremeň 25. Každé množstvo berte ako gramy. Pre každú surovinu dajú gramy × percento oxidu ÷ 100 ÷ jeho molárna hmotnosť móly oxidu. Tabuľka uvádza hlavné oxidy; Glazecalc počíta aj stopové množstvá (železo a titán v kaolíne, horčík v živci).

Table: Móly jednotlivých oxidov v dávke (100 g)
Label: Móly v dávke

| Surovina | Gramy |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------- | ----: | -----: | -----: | -----: | -----: | -----: |
| 福島長石 |    45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Krieda   |    20 |      – |      – | 0,1998 |      – |      – |
| Kaolín   |    10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Kremeň   |    25 |      – |      – |      – |      – | 0,4161 |
| Spolu    |   100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Tavivá dávajú spolu 0,0518 + 0,0275 + 0,2041 + 0,0014 (horčík) = 0,2847 mol. Každý súčet vydeľte týmto číslom:

- K₂O 0,0518 ÷ 0,2847 = 0,18; Na₂O 0,10; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

To je vzorec z lekcie 3.

### V aplikácii Glazecalc

1. Zadajte recept na [stránke receptu](/recipe).
2. Otvorte **Ako sa počíta Segerov vzorec**. Ukáže tieto kroky s číslami tohto receptu: gramy, móly každého oxidu v každej surovine, súčty a delenie taviv.
3. Porovnajte každý riadok so svojím pracovným listom. Potom zmeňte jedno množstvo a prepočítajte iba ten stĺpec, ktorý sa mení.

### Pracovný list

Table: Pracovný list 4: od receptu k Segerovmu vzorcu
Label: Pracovný list 4

| Surovina | Gramy | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| -------- | ----- | --- | ---- | --- | ----- | ---- |
|          |       |     |      |     |       |      |
|          |       |     |      |     |       |      |
|          |       |     |      |     |       |      |
|          |       |     |      |     |       |      |
| Spolu    |       |     |      |     |       |      |
| ÷ tavivá |       |     |      |     |       |      |

### Kontrola

- Prečo každá veľkosť dávky dá ten istý Segerov vzorec?
- Ktoré oxidy kaolín prináša a ktorý z nich je tu najdôležitejší?
- Prečo sa SŽ kriedy do vzorca nezapočítava?

## Lekcia 5: Od Segerovho vzorca k receptu {#formula-to-recipe}

### Ciele

- Vyberte suroviny pre cieľový vzorec a vypočítajte, koľko ktorej treba.
- Použite stránku Vypočítať podľa cieľa a povedzte, ako blízko sa k cieľu dostane.

### Príprava

- Cieľ nižšie, pracovný list 5 a kalkulačky; aplikácia Glazecalc s účtom.

### Riešený príklad

Cieľ: 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ a 4,0 SiO₂. Suroviny vezmite v tomto poradí, každú pre oxid, ktorý môže priniesť iba ona:

1. **Živec, na draslík a sodík.** Jedna jednotka 福島長石 (536,8 g, hmotnosť, ktorá obsahuje jeden mól taviv) prináša 0,94 mol K₂O a Na₂O. Cieľ vyžaduje 0,3, takže 0,3 ÷ 0,94 = 0,319 jednotky: 171,4 g. Prináša aj 0,015 CaO, 0,328 Al₂O₃ a 1,865 SiO₂.
2. **Krieda, na zvyšok vápnika.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Kaolín, na zvyšok oxidu hlinitého.** 0,4 − 0,328 = 0,072 mol. Kaolín EPK obsahuje jeden mól Al₂O₃ v 272,6 g, takže 19,6 g, ktoré prinesú aj 0,149 SiO₂.
4. **Kremeň, na zvyšok.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

Dávka váži 379,0 g. V percentách: 福島長石 45,2, krieda 18,1, kaolín 5,2, kremeň 31,5. Pomer draslíka a sodíka určuje živec, takže recept dá 0,195 K₂O a 0,104 Na₂O: blízko cieľa, nie presne na ňom.

### V aplikácii Glazecalc

1. Otvorte [Vypočítať podľa cieľa](/solve), vyberte **Segerov vzorec (móly, tavivá dávajú spolu 1)** a zadajte cieľ.
2. V časti **Suroviny** zadajte 福島長石, kriedu, kaolín EPK a kremeň a vyberte **Vypočítať**.
3. Výsledok je 福島長石 44,9, krieda 18,2, kaolín 5,6 a kremeň 31,3 a tabuľka, ako blízko sa dostane každý oxid. Porovnajte ho so svojím ručným výpočtom: Glazecalc započíta každé stopové množstvo a nájde najlepšiu zhodu, akú štyri suroviny dovoľujú.
4. Vyberte **Otvoriť ako nový recept** a skontrolujte ho na stránke receptu.

### Pracovný list

Table: Pracovný list 5: od cieľa k receptu
Label: Pracovný list 5

| Krok | Surovina | Pre ktorý oxid | Potrebné móly | Gramy | Prináša aj |
| ---- | -------- | -------------- | ------------- | ----- | ---------- |
| 1    |          |                |               |       |            |
| 2    |          |                |               |       |            |
| 3    |          |                |               |       |            |
| 4    |          |                |               |       |            |

### Kontrola

- Prečo sa živec počíta ako prvý?
- Prečo tieto štyri suroviny nemôžu dať presne 0,2 K₂O a 0,1 Na₂O?
- Čo by ste k surovinám pridali, aby sa dostal do glazúry horčík?

## Lekcia 6: Keramická hmota a chyby glazúr {#body-and-defects}

> [!WARNING]
> Vypálená glazúra môže uvoľňovať kovy do jedla a nápojov a môže pritom vyzerať dokonale. Vylúhovať sa môžu glazúry s vysokým obsahom bária alebo s meďou a každá glazúra s olovom. Čo vypálený kus uvoľňuje, ukáže iba laboratórna skúška vylúhovania kovov{{en: leach test}}; žiadny výpočet to neukáže. Prečítajte si [Bezpečnosť pri styku s potravinami](/guides/glazing-basics#food-safety) a [Suroviny, ktoré si vyžadujú najväčšiu opatrnosť](/guides/safe-mixing#materials).

### Ciele

- Zmerajte zmrštenie a nasiakavosť keramickej hmoty.
- Pomenujte bežné chyby, ich obvyklé príčiny a prvú úpravu.
- Vedzte, ktoré chyby robia výrobky nebezpečnými.

### Príprava

- Skúšobné tyčinky z vašej keramickej hmoty, označené za mokra vo vzdialenosti 100 mm, vypálené aj nevypálené.
- Doštičky s chybami, ak ich máte: trhlinkovanie, stiahnutie glazúry, vpichy, stekanie.

### Riešený príklad

- **Zmrštenie**: (označená dĺžka − dĺžka po výpale) ÷ označená dĺžka × 100. Značky vo vzdialenosti 100 mm, ktoré po výpale merajú 88 mm: zmrštenie 12 %.
- **Nasiakavosť**: (hmotnosť po namočení − hmotnosť v suchom stave) ÷ hmotnosť v suchom stave × 100. Vypálená tyčinka s hmotnosťou 50,0 g, ktorá po namočení váži 50,6 g: 1,2 %.

Table: Chyby, príčiny a prvá úprava v Segerovom vzorci
Label: Chyby

| Chyba              | Obvyklá príčina                                       | Čo skúsiť ako prvé                                 |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------- |
| Trhlinkovanie      | Glazúra sa zmršťuje viac než črep                     | Menej K₂O a Na₂O; viac vápnika, horčíka alebo bóru |
| Odlupovanie        | Glazúra sa zmršťuje oveľa menej než črep              | Viac K₂O a Na₂O                                    |
| Stekanie           | Príliš málo oxidu hlinitého alebo príliš hrubá vrstva | Viac oxidu hlinitého; tenšia vrstva                |
| Stiahnutie glazúry | Zaprášený prežah alebo hrubá vrstva, ktorá popraskala | Očistiť prežah; tenšia vrstva                      |
| Vpichy             | Plyn, po ktorom sa povrch nezahojil                   | Výdrž pri konečnej teplote výpalu; tenšia vrstva   |

Časť [Zladenie glazúry s črepom a chyby](/guides/glazing-basics#fit-and-defects) vysvetľuje každú z nich spolu so skúškou v ľadovej vode na trhlinkovanie. Výrobky s trhlinkami alebo s odlupovaním glazúry nepoužívajte na jedlo ani nápoje.

::food-limits

### V aplikácii Glazecalc

1. Na [stránke receptu](/recipe) si prečítajte panel **Limity** pre svoju glazúru a jej vypočítanú rozťažnosť.
2. Skopírujte recept, časť živca nahraďte kriedou a oba recepty porovnajte: ktorým smerom sa rozťažnosť posunula?

### Pracovný list

Table: Pracovný list 6: keramická hmota
Label: Pracovný list 6

| Tyčinka | Označená dĺžka (mm) | Dĺžka po výpale (mm) | Zmrštenie (%) | Hmotnosť v suchom stave (g) | Hmotnosť po namočení (g) | Nasiakavosť (%) |
| ------- | ------------------- | -------------------- | ------------- | --------------------------- | ------------------------ | --------------- |
| 1       | 100                 |                      |               |                             |                          |                 |
| 2       | 100                 |                      |               |                             |                          |                 |

### Kontrola

- Ktorá chyba vzniká pri glazúre, ktorá sa zmršťuje viac než jej črep, a čo je prvá úprava?
- Prečo sa výrobky s odlupovaním glazúry nesmú nikdy používať na jedlo?
- Dá sa výpočtom zistiť, že glazúra je bezpečná na styk s potravinami? Čo to zistiť dokáže?

## Plány doštičiek na tlač {#tile-maps}

### Plán trojzložkovej skúšky: 42 glazúr

Dva trojuholníky po 21 doštičkách, z rozloženia Zmesí so 6 riadkami: doštička 1 hore (živec), spodný riadok od kriedy (vľavo) po kremeň (vpravo). Trojuholník II je trojuholník I s 1 g červeného oxidu železa navyše na každých 100 g, čo sa pri redukčnom výpale mení smerom k seladonu (青磁). Pri oxidačnom aj redukčnom výpale je to 84 doštičiek. Množstvá sú gramy na 100 g.

Table: Plán trojzložkovej skúšky: 福島長石, krieda a kremeň, s 10 kaolínu v každej doštičke
Label: Plán trojzložkovej skúšky

| Doštička (I) | Doštička (II) | 福島長石 | Krieda | Kremeň | Kaolín | I oxid. | I red. | II oxid. | II red. |
| ------------ | ------------- | -------: | -----: | -----: | -----: | ------- | ------ | -------- | ------- |
| 1            | 22            |       90 |      0 |      0 |     10 |         |        |          |         |
| 2            | 23            |       72 |     18 |      0 |     10 |         |        |          |         |
| 3            | 24            |       72 |      0 |     18 |     10 |         |        |          |         |
| 4            | 25            |       54 |     36 |      0 |     10 |         |        |          |         |
| 5            | 26            |       54 |     18 |     18 |     10 |         |        |          |         |
| 6            | 27            |       54 |      0 |     36 |     10 |         |        |          |         |
| 7            | 28            |       36 |     54 |      0 |     10 |         |        |          |         |
| 8            | 29            |       36 |     36 |     18 |     10 |         |        |          |         |
| 9            | 30            |       36 |     18 |     36 |     10 |         |        |          |         |
| 10           | 31            |       36 |      0 |     54 |     10 |         |        |          |         |
| 11           | 32            |       18 |     72 |      0 |     10 |         |        |          |         |
| 12           | 33            |       18 |     54 |     18 |     10 |         |        |          |         |
| 13           | 34            |       18 |     36 |     36 |     10 |         |        |          |         |
| 14           | 35            |       18 |     18 |     54 |     10 |         |        |          |         |
| 15           | 36            |       18 |      0 |     72 |     10 |         |        |          |         |
| 16           | 37            |        0 |     90 |      0 |     10 |         |        |          |         |
| 17           | 38            |        0 |     72 |     18 |     10 |         |        |          |         |
| 18           | 39            |        0 |     54 |     36 |     10 |         |        |          |         |
| 19           | 40            |        0 |     36 |     54 |     10 |         |        |          |         |
| 20           | 41            |        0 |     18 |     72 |     10 |         |        |          |         |
| 21           | 42            |        0 |      0 |     90 |     10 |         |        |          |         |

### Segerova mriežka: 24 glazúr

Každá doštička má rovnaké tavivá, 0,2 KNaO a 0,8 CaO, z 福島長石 a kriedy. Oxid hlinitý sa mení smerom nadol po mriežke a oxid kremičitý smerom doprava. Recepty boli vypočítané postupom z lekcie 5; Segerov vzorec každého z nich podľa aplikácie Glazecalc sa líši najviac o 0,01 v oxide hlinitom a o 0,06 v oxide kremičitom. Označte každú doštičku na diagrame oxid kremičitý oproti oxidu hlinitému a nakreslite si vlastné oblasti: matná, lesklá, nedopálená, stekanie.

Table: Segerova mriežka: 0,2 KNaO, 0,8 CaO, hmotnostné percentá
Label: Segerova mriežka

| Doštička | Al₂O₃ | SiO₂ | 福島長石 | Krieda | Kaolín | Kremeň | Oxidácia | Redukcia |
| -------- | ----: | ---: | -------: | -----: | -----: | -----: | -------- | -------- |
| 1        |  0,25 |  2,0 |     46,9 |   32,5 |    3,5 |   17,1 |          |          |
| 2        |  0,25 |  2,5 |     41,8 |   28,9 |    3,1 |   26,2 |          |          |
| 3        |  0,25 |  3,0 |     37,6 |   26,1 |    2,8 |   33,5 |          |          |
| 4        |  0,25 |  3,5 |     34,3 |   23,7 |    2,5 |   39,5 |          |          |
| 5        |  0,25 |  4,0 |     31,4 |   21,7 |    2,3 |   44,5 |          |          |
| 6        |  0,25 |  4,5 |     29,0 |   20,1 |    2,2 |   48,7 |          |          |
| 7        |  0,35 |  2,0 |     44,3 |   30,6 |   13,9 |   11,3 |          |          |
| 8        |  0,35 |  2,5 |     39,6 |   27,4 |   12,4 |   20,5 |          |          |
| 9        |  0,35 |  3,0 |     35,9 |   24,8 |   11,2 |   28,0 |          |          |
| 10       |  0,35 |  3,5 |     32,8 |   22,7 |   10,3 |   34,2 |          |          |
| 11       |  0,35 |  4,0 |     30,2 |   20,9 |    9,5 |   39,5 |          |          |
| 12       |  0,35 |  4,5 |     28,0 |   19,4 |    8,8 |   43,9 |          |          |
| 13       |  0,45 |  2,0 |     41,9 |   29,0 |   23,1 |    6,1 |          |          |
| 14       |  0,45 |  2,5 |     37,7 |   26,1 |   20,8 |   15,4 |          |          |
| 15       |  0,45 |  3,0 |     34,3 |   23,7 |   18,9 |   23,0 |          |          |
| 16       |  0,45 |  3,5 |     31,5 |   21,8 |   17,4 |   29,4 |          |          |
| 17       |  0,45 |  4,0 |     29,1 |   20,1 |   16,0 |   34,8 |          |          |
| 18       |  0,45 |  4,5 |     27,0 |   18,7 |   14,9 |   39,4 |          |          |
| 19       |  0,55 |  2,0 |     39,7 |   27,5 |   31,4 |    1,5 |          |          |
| 20       |  0,55 |  2,5 |     35,9 |   24,9 |   28,4 |   10,8 |          |          |
| 21       |  0,55 |  3,0 |     32,8 |   22,7 |   26,0 |   18,5 |          |          |
| 22       |  0,55 |  3,5 |     30,2 |   20,9 |   23,9 |   25,0 |          |          |
| 23       |  0,55 |  4,0 |     28,0 |   19,4 |   22,1 |   30,5 |          |          |
| 24       |  0,55 |  4,5 |     26,1 |   18,1 |   20,6 |   35,3 |          |          |

Zmesi v aplikácii Glazecalc vytvárajú trojuholníky a štvorce s 3 až 66 doštičkami, nie túto mriežku; ľubovoľnú doštičku otvorte ako recept na [stránke receptu](/recipe) a zoznam na váženie vytlačte odtiaľ.

## Zdroje {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015): šesť lekcií.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集: termíny a témy lekcií.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集: úlohy nadväzujúceho kurzu so 42, 90 a 78 glazúrami pri oxidačnom a redukčnom výpale.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005): vlastný výpočtový program centra.
- Bilecik Şeyh Edebali University, [SCT305 course information](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775): Segerov vzorec v 5., 6. a 8. týždni.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf): výpočet glazúr pre školských učiteľov na Taiwane.
- Glendale Community College, ART 195 course outline: Segerov vzorec v 5. až 7. týždni z 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表: rozbor 福島長石 v knižnici aplikácie Glazecalc.
- IUPAC, standard atomic weights, ako ich používa chémia v aplikácii Glazecalc.
