---
title: Enseigner le calcul des émaux
lead: 6 séances pour une classe ou un groupe d’étude, des matières et des tessons triaxiaux à la formule de Seger calculée dans les deux sens et aux défauts d’émail, chacune avec un exemple calculé, les étapes dans Glazecalc, une fiche de travail à imprimer et des questions de vérification.
---

## À propos de ce dossier {#about}

Ce dossier s’adresse à toute personne qui enseigne le calcul des émaux : une école, un cours d’atelier, un groupe d’étude de céramistes en activité, ou un céramiste qui apprend seul. Il comprend six séances, et chacune a ses objectifs, ce qu’il faut préparer, un exemple calculé avec de vraies matières, la manière de le faire dans Glazecalc, une fiche de travail et des questions de vérification.

L’ordre des séances suit un groupe d’étude publié : le 陶磁器釉薬技術研究会 (groupe d’étude sur les émaux céramiques) du Centre technologique industriel de la préfecture d’Ibaraki, au Japon, qui a mené six séances pour 12 jeunes céramistes en 2015 et les a présentées dans son rapport de recherche. Son cours de suivi à l’école de céramique de Kasama a proposé trois exercices de tessons de 42, 90 et 78 émaux, chacun cuit en oxydation et en réduction. **Glazecalc n’a aucun lien avec le centre ni avec l’école.** Nous suivons l’ordre de leur plan publié, et nous le citons plus bas ; le texte, les exemples et les fiches de travail sont les nôtres. Des cours d’autres pays enseignent les mêmes étapes dans presque le même ordre : le SCT305 de Bilecik Şeyh Edebali University en Turquie, l’ART 195 de Glendale Community College aux États-Unis, le programme de Rhénanie-Palatinat pour les écoles de céramique en Allemagne, et l’article de 2006 de 李堅萍 pour les enseignants à Taïwan.

Table: Les six séances
Label: Les six séances

| Séance | Sujet                                                  | Dans Glazecalc                                     |
| ------ | ------------------------------------------------------ | -------------------------------------------------- |
| 1      | Les matières, leur rôle, les tessons triaxiaux         | Matières, Mélanges pour tessons d’essai (triaxial) |
| 2      | La chimie : éléments, formules, moles                  | La page d’une matière                              |
| 3      | Lire une formule de Seger, le diagramme silice–alumine | La page de la recette, le diagramme de Stull       |
| 4      | De la recette à la formule de Seger                    | Comment la formule de Seger est calculée           |
| 5      | De la formule de Seger à la recette                    | Viser une cible                                    |
| 6      | La terre et les défauts d’émail                        | Limites, Comparer                                  |

### Comment l’utiliser

- Chaque séance dure environ 2 heures. Les séances 4 et 5 demandent des calculatrices, et un ordinateur ou un téléphone avec Glazecalc par binôme.
- Les exemples calculés utilisent des matières vendues au Japon et les chiffres de la bibliothèque standard de Glazecalc : 福島長石 (feldspath de Fukushima), le carbonate de calcium{{en: whiting}} (石灰石), un kaolin et la silice (珪石). Utilisez l’analyse de votre propre fournisseur si vous en avez une : ajoutez-la sur la [page Matières](/material), et les chiffres changent, mais pas la méthode.
- La cuisson se fait à SK 8, température nominale de {{2282 °F; 1250 °C}}. Utilisez le cône auquel cuit votre classe ; [Cuire aux cônes SK](/guides/firing#sk-cones) explique les numéros SK.
- Pour imprimer une fiche de travail ou un plan de tessons, imprimez cette page depuis le navigateur. Enregistrer des recettes, des mélanges et des notes demande un compte gratuit.

> [!WARNING]
> Les séances 1, 3 et 6 sont des travaux pratiques : pesée de matières sèches et cuisson. Avant que quiconque pèse une matière, lisez [Les habitudes qui comptent le plus](/guides/safe-mixing#habits). La poussière d’émail sèche est le principal danger.

## Séance 1 : les matières et les tessons triaxiaux {#materials}

> [!WARNING]
> Pesez les matières sèches avec douceur, nettoyez à l’humide et portez un masque de protection respiratoire bien ajusté tant que les poudres sont sèches. Lisez d’abord [Le principal danger : la poussière](/guides/safe-mixing#the-main-hazard) et [Masques de protection respiratoire](/guides/safe-mixing#respirators).

### Objectifs

- Nommer les trois rôles dans un émail : vitrifiant{{en: glass former}}, fondant{{en: flux}} et stabilisant{{en: stabilizer}}.
- Classer 4 matières courantes selon les oxydes qu’elles apportent.
- Mettre en place un essai triaxial, et lire ses tessons comme une carte.

### À préparer

- Un sac de 福島長石, de carbonate de calcium, d’un kaolin et de silice, ou les matières dont dispose votre classe.
- Le [plan des tessons triaxiaux](#tile-maps) ci-dessous, imprimé, et 21 tessons d’essai par élève pour chaque triangle.
- Des tessons cuits d’un essai triaxial précédent, si vous en avez, à faire circuler.

### Exemple calculé

L’analyse de chaque matière, tirée de la bibliothèque de Glazecalc, donne les oxydes qu’elle laisse après la cuisson. La perte au feu (PAF){{en: loss on ignition}} est ce qui part à la combustion.

Table: Quatre matières et ce qu’elles apportent (pourcentages en poids, d’après la bibliothèque)
Label: Quatre matières

| Matière                       | SiO₂ | Al₂O₃ |   K₂O | Na₂O |   CaO |   PAF | Son rôle                                            |
| ----------------------------- | ---: | ----: | ----: | ---: | ----: | ----: | --------------------------------------------------- |
| 福島長石 (feldspath)          | 65,4 | 19,53 | 10,76 | 3,77 |  0,49 |  0,18 | Fondant, avec sa propre alumine et sa propre silice |
| Carbonate de calcium (石灰石) |    – |     – |     – |    – | 56,03 | 43,97 | Fondant (calcium)                                   |
| Kaolin EPK                    | 45,7 |  37,4 |  0,33 | 0,06 |  0,18 |  13,9 | Stabilisant : la principale source d’alumine        |
| Silice (珪石)                 |  100 |     – |     – |    – |     – |     – | Vitrifiant                                          |

Le feldspath seul fond à SK 8 en un verre visqueux ; le carbonate de calcium seul ne fond pas ; la silice seule ne fond pas. Mélangés, ils fondent bien mieux que n’importe lequel d’entre eux. Un essai triaxial montre où : le plan des tessons ci-dessous fait varier les trois par pas de ~20 % (18 sur 90), avec 10 % de kaolin dans chaque tesson.

::shops

### Dans Glazecalc

1. Ouvrez chaque matière sur la [page Matières](/material), ou sa page publique, comme [Fukushima Feldspar](/materials/fukushima-feldspar). Notez les oxydes qu’elle apporte.
2. Faites trois recettes : 福島長石 90 avec kaolin 10, carbonate de calcium 90 avec kaolin 10, et silice 90 avec kaolin 10. Sur [Mélanges pour tessons d’essai](/blends), choisissez **Essai triaxial (3 recettes)** et 6 rangées : 21 tessons, comme sur le plan ci-dessous.
3. Choisissez la préparation de chaque tesson, puis **Imprimer** ce qu’il faut peser. Après la cuisson, enregistrez comme recettes les tessons qui vous plaisent, depuis le dessin des tessons.

### Fiche de travail

Table: Fiche de travail 1 : ce qu’apporte chaque matière
Label: Fiche de travail 1

| Matière              | Oxydes apportés | Vitrifiant, fondant ou stabilisant ? | PAF (%) |
| -------------------- | --------------- | ------------------------------------ | ------- |
| 福島長石             |                 |                                      |         |
| Carbonate de calcium |                 |                                      |         |
| Kaolin               |                 |                                      |         |
| Silice               |                 |                                      |         |

### Pour vérifier

- Quelle matière apporte l’essentiel de l’alumine, et pourquoi un émail en a-t-il besoin ?
- Pourquoi le coin du triangle occupé par le carbonate de calcium ne fond-il pas seul ?
- Où sur le triangle vos tessons ont-ils le mieux fondu, et de quel coin était-ce le plus proche ?

## Séance 2 : la chimie dont vous avez besoin {#chemistry}

### Objectifs

- Lire une formule chimique : SiO₂, CaO, Al₂O₃, CaCO₃.
- Calculer une masse molaire à partir des masses atomiques.
- Convertir des grammes en moles, et inversement.

### À préparer

- Un tableau périodique par élève, et des calculatrices.
- Les masses atomiques du tableau ci-dessous (valeurs standard de l’IUPAC, telles que Glazecalc les utilise).

### Exemple calculé

Table: Masses atomiques utilisées ici (g/mol)
Label: Masses atomiques

| Élément   | Symbole | Masse atomique |
| --------- | ------- | -------------: |
| Oxygène   | O       |         15,999 |
| Carbone   | C       |         12,011 |
| Sodium    | Na      |          22,99 |
| Aluminium | Al      |         26,982 |
| Silicium  | Si      |         28,085 |
| Potassium | K       |         39,098 |
| Calcium   | Ca      |         40,078 |

Une formule compte des atomes. SiO₂ est un silicium et deux oxygènes, donc une mole pèse 28,085 + 2 × 15,999 = 60,083 g. Al₂O₃ fait 2 × 26,982 + 3 × 15,999 = 101,961 g. CaO fait 56,077 g, et le carbonate de calcium, CaCO₃, fait 100,086 g ; la bibliothèque de Glazecalc l’arrondit à 100,08.

Une **mole** est un nombre, comme une douzaine : le même nombre de molécules, quelles qu’elles soient. Le nombre de moles est égal aux grammes ÷ la masse molaire :

- 25 g de silice, c’est 25 ÷ 60,083 = 0,416 mol de SiO₂.
- 20 g de carbonate de calcium, c’est 20 ÷ 100,08 = 0,200 mol. Dans le four, il perd son dioxyde de carbone (CO₂, 44,009 g/mol) et laisse 0,200 mol de CaO, qui pèse 0,200 × 56,077 = 11,2 g. Cette perte est sa PAF : 43,97 %.

### Dans Glazecalc

1. Ouvrez [Carbonate de calcium](/materials/whiting) et [Silice](/materials/silica) : chaque page donne la formule et ses masses.
2. Vérifiez une masse molaire à la main, en la comparant à celle de la page.

### Fiche de travail

Table: Fiche de travail 2 : masse molaire et moles
Label: Fiche de travail 2

| Oxyde ou matière     | Formule | Masse molaire (g/mol) | Grammes | Moles |
| -------------------- | ------- | --------------------- | ------- | ----- |
| Silice               | SiO₂    |                       | 30      |       |
| Alumine              | Al₂O₃   |                       | 10      |       |
| Oxyde de calcium     | CaO     |                       | 5       |       |
| Carbonate de calcium | CaCO₃   |                       | 15      |       |

### Pour vérifier

- Combien de grammes pèse une mole de SiO₂, et comment le calcule-t-on ?
- Pourquoi 20 g de carbonate de calcium laissent-ils moins de 20 g dans l’émail cuit ?
- Pourquoi compare-t-on les oxydes en moles et non en grammes ?

## Séance 3 : lire une formule de Seger {#reading-the-formula}

> [!WARNING]
> Colorer un émail suppose de peser des colorants, dont certains demandent plus de précautions que les matières de base. Lisez d’abord [Les matières qui demandent le plus de précautions](/guides/safe-mixing#materials).

### Objectifs

- Lire les trois colonnes d’une formule de Seger (UMF, ゼーゲル式){{en: unity molecular formula}} : fondants, stabilisant, vitrifiant.
- Situer un émail sur un diagramme silice–alumine, et savoir ce que le diagramme peut dire et ce qu’il ne peut pas dire.
- Colorer un émail prêt à l’emploi par étapes, et le consigner.

### À préparer

- La formule de Seger ci-dessous, écrite en grand.
- Un émail transparent prêt à l’emploi, et un colorant comme l’oxyde de fer rouge (弁柄).

### Exemple calculé

L’émail de la séance 4, 福島長石 45, carbonate de calcium 20, kaolin 10 et silice 25, a cette formule de Seger (chiffres de Glazecalc, arrondis) :

Table: Une formule de Seger en trois colonnes
Label: Une formule de Seger

| Fondants (RO, R₂O) | Stabilisant (R₂O₃) | Vitrifiant (RO₂) |
| ------------------ | ------------------ | ---------------- |
| K₂O 0,18           | Al₂O₃ 0,43         | SiO₂ 3,45        |
| Na₂O 0,10          |                    |                  |
| CaO 0,72           |                    |                  |

- Les fondants totalisent 1 : c’est la règle de la formule. Chaque autre nombre est un nombre de moles pour chaque mole de fondants.
- Le rapport silice/alumine est 3,45 ÷ 0,43, soit environ 8 : typique d’un émail brillant.
- Le calcium forme l’essentiel du fondant, comme dans la plupart des émaux japonais à la chaux (石灰釉).

Un diagramme avec la silice en abscisse et l’alumine en ordonnée place chaque émail comme un point. Les essais de Seger et le diagramme de Stull de 1912 sont de ce type, et un 釉性状図 y reporte les tessons cuits d’une classe. La page de la recette de Glazecalc dessine le diagramme de Stull, et cet émail se trouve dans sa région brillante. Les régions de Stull viennent de ses propres fondants et de sa propre cuisson : un repère, pas une prévision. La [grille des tessons](#tile-maps) ci-dessous permet à une classe de dessiner son propre diagramme, à sa propre cuisson.

::stull-chart

Pour colorer un émail prêt à l’emploi dont vous ne connaissez pas la recette, Glazecalc ne peut pas calculer sa formule. Ajoutez plutôt le colorant en ajout aux 100 : 100 g d’émail sec avec 1, 2 et 3 g d’oxyde de fer, un tesson chacun, cuits en oxydation et en réduction.

### Dans Glazecalc

1. Sur la [page de la recette](/recipe), saisissez la recette ci-dessus et lisez sa **Formule de Seger** et son **Diagramme de Stull**.
2. Faites passer la silice de 25 à 35, et regardez le point se déplacer vers la droite.
3. Pour une base dont vous avez la recette, mettez le colorant en ajout et utilisez un essai en ligne sur [Mélanges pour tessons d’essai](/blends) pour le faire varier par étapes.

### Fiche de travail

Table: Fiche de travail 3 : un colorant dans un émail prêt à l’emploi
Label: Fiche de travail 3

| Tesson | Colorant (g pour 100 g) | Oxydation : aspect | Réduction : aspect |
| ------ | ----------------------- | ------------------ | ------------------ |
| 1      | 0                       |                    |                    |
| 2      | 1                       |                    |                    |
| 3      | 2                       |                    |                    |
| 4      | 3                       |                    |                    |

### Pour vérifier

- Dans une formule de Seger, quelle colonne totalise 1 ?
- Quel est le rapport silice/alumine de cet émail, et que suggère-t-il ?
- Pourquoi un point de la région brillante du diagramme peut-il quand même donner un tesson mat dans votre four ?

## Séance 4 : de la recette à la formule de Seger {#recipe-to-formula}

### Objectifs

- Calculer à la main une formule de Seger à partir d’une recette.
- La comparer avec le propre calcul de Glazecalc.

### À préparer

- La fiche de travail 4, les quatre analyses de la séance 1 et des calculatrices.

### Exemple calculé

La recette : 福島長石 45, carbonate de calcium 20, kaolin EPK 10, silice 25. Prenez chaque quantité comme des grammes. Pour chaque matière, grammes × pourcentage de l’oxyde ÷ 100 ÷ sa masse molaire donne ses moles. Le tableau donne les principaux oxydes ; Glazecalc compte aussi les traces (le fer et le titane du kaolin, le magnésium du feldspath).

Table: Moles de chaque oxyde dans la préparation (100 g)
Label: Moles dans la préparation

| Matière              | Grammes |    K₂O |   Na₂O |    CaO |  Al₂O₃ |   SiO₂ |
| -------------------- | ------: | -----: | -----: | -----: | -----: | -----: |
| 福島長石             |      45 | 0,0514 | 0,0274 | 0,0039 | 0,0862 | 0,4898 |
| Carbonate de calcium |      20 |      – |      – | 0,1998 |      – |      – |
| Kaolin               |      10 | 0,0004 | 0,0001 | 0,0003 | 0,0367 | 0,0761 |
| Silice               |      25 |      – |      – |      – |      – | 0,4161 |
| Total                |     100 | 0,0518 | 0,0275 | 0,2041 | 0,1229 | 0,9820 |

Les fondants totalisent 0,0518 + 0,0275 + 0,2041 + 0,0014 (magnésie) = 0,2847 mol. Divisez chaque total par ce nombre :

- K₂O 0,0518 ÷ 0,2847 = 0,18 ; Na₂O 0,10 ; CaO 0,72.
- Al₂O₃ 0,1229 ÷ 0,2847 = 0,43.
- SiO₂ 0,9820 ÷ 0,2847 = 3,45.

C’est la formule de la séance 3.

### Dans Glazecalc

1. Saisissez la recette sur la [page de la recette](/recipe).
2. Ouvrez **Comment la formule de Seger est calculée**. Cette section montre ces étapes avec les chiffres de cette recette : les grammes, les moles de chaque oxyde dans chaque matière, les totaux et la division par les fondants.
3. Comparez chaque ligne avec votre fiche de travail. Puis changez une quantité et calculez seulement la colonne qu’elle modifie.

### Fiche de travail

Table: Fiche de travail 4 : de la recette à la formule de Seger
Label: Fiche de travail 4

| Matière    | Grammes | K₂O | Na₂O | CaO | Al₂O₃ | SiO₂ |
| ---------- | ------- | --- | ---- | --- | ----- | ---- |
|            |         |     |      |     |       |      |
|            |         |     |      |     |       |      |
|            |         |     |      |     |       |      |
|            |         |     |      |     |       |      |
| Total      |         |     |      |     |       |      |
| ÷ fondants |         |     |      |     |       |      |

### Pour vérifier

- Pourquoi n’importe quelle taille de préparation donne-t-elle la même formule de Seger ?
- Quels oxydes le kaolin apporte-t-il, et lequel compte le plus ici ?
- Pourquoi la PAF du carbonate de calcium est-elle laissée de côté dans la formule ?

## Séance 5 : de la formule de Seger à la recette {#formula-to-recipe}

### Objectifs

- Choisir des matières pour une formule cible, et calculer la quantité de chacune.
- Utiliser **Viser une cible**, et dire de combien le résultat s’approche de la cible.

### À préparer

- La cible ci-dessous, la fiche de travail 5 et des calculatrices ; Glazecalc avec un compte.

### Exemple calculé

La cible : 0,2 K₂O, 0,1 Na₂O, 0,7 CaO, 0,4 Al₂O₃ et 4,0 SiO₂. Prenez les matières dans cet ordre, chacune pour l’oxyde qu’elle seule peut apporter :

1. **Le feldspath, pour la potasse et la soude.** Une unité de 福島長石 (536,8 g, la masse qui contient une mole de fondants) apporte 0,94 mol de K₂O et de Na₂O. La cible en demande 0,3, donc 0,3 ÷ 0,94 = 0,319 unité : 171,4 g. Elle apporte aussi 0,015 CaO, 0,328 Al₂O₃ et 1,865 SiO₂.
2. **Le carbonate de calcium, pour le reste du calcium.** 0,7 − 0,015 = 0,685 mol × 100,08 = 68,6 g.
3. **Le kaolin, pour le reste de l’alumine.** 0,4 − 0,328 = 0,072 mol. Le kaolin EPK contient une mole d’Al₂O₃ dans 272,6 g, donc 19,6 g, qui apportent aussi 0,149 SiO₂.
4. **La silice, pour le reste.** 4,0 − 1,865 − 0,149 = 1,986 mol × 60,083 = 119,3 g.

La préparation fait 379,0 g. En pourcentages : 福島長石 45,2, carbonate de calcium 18,1, kaolin 5,2, silice 31,5. Le feldspath fixe le rapport de la potasse à la soude ; la recette donne donc 0,195 K₂O et 0,104 Na₂O : proche de la cible, mais pas exactement dessus.

### Dans Glazecalc

1. Ouvrez [Viser une cible](/solve), choisissez **Une formule de Seger (en moles, les fondants totalisant 1)**, et saisissez la cible.
2. Sous **Les matières**, indiquez 福島長石, carbonate de calcium, kaolin EPK et silice, puis choisissez **Calculer**.
3. Le résultat est 福島長石 44,9, carbonate de calcium 18,2, kaolin 5,6 et silice 31,3, avec un tableau du degré de proximité de chaque oxyde. Comparez-le avec votre calcul à la main : Glazecalc compte toutes les traces, et trouve le meilleur ajustement que permettent les quatre matières.
4. **Ouvrir comme nouvelle recette**, puis vérifiez-la sur la page de la recette.

### Fiche de travail

Table: Fiche de travail 5 : de la cible à la recette
Label: Fiche de travail 5

| Étape | Matière | Pour quel oxyde | Moles nécessaires | Grammes | Apporte aussi |
| ----- | ------- | --------------- | ----------------- | ------- | ------------- |
| 1     |         |                 |                   |         |               |
| 2     |         |                 |                   |         |               |
| 3     |         |                 |                   |         |               |
| 4     |         |                 |                   |         |               |

### Pour vérifier

- Pourquoi calcule-t-on le feldspath en premier ?
- Pourquoi ces quatre matières ne peuvent-elles pas donner exactement 0,2 K₂O et 0,1 Na₂O ?
- Qu’ajouteriez-vous aux matières pour apporter de la magnésie ?

## Séance 6 : la terre et les défauts d’émail {#body-and-defects}

> [!WARNING]
> Un émail cuit peut relarguer des métaux dans les aliments et les boissons, et il peut avoir un aspect parfait pendant qu’il le fait. Les émaux riches en baryum ou contenant du cuivre, et tout émail contenant du plomb, peuvent relarguer. Seul un test de relargage en laboratoire{{en: leach test}} de la pièce cuite montre ce qu’elle relargue ; aucun calcul ne le peut. Lisez [Contact alimentaire](/guides/glazing-basics#food-safety) et [Les matières qui demandent le plus de précautions](/guides/safe-mixing#materials).

### Objectifs

- Mesurer le retrait et l’absorption d’eau d’une terre.
- Nommer les défauts courants, leurs causes habituelles et une première correction.
- Savoir quels défauts rendent les pièces dangereuses.

### À préparer

- Des éprouvettes de votre terre, marquées à 100 mm d’écart quand elles sont humides, cuites et non cuites.
- Des tessons avec des défauts, si vous en avez : tressaillage, retirement, trous d’épingle, coulures.

### Exemple calculé

- **Retrait** : (longueur marquée − longueur après cuisson) ÷ longueur marquée × 100. Des repères espacés de 100 mm qui mesurent 88 mm après la cuisson : 12 % de retrait.
- **Absorption d’eau** : (poids après trempage − poids à sec) ÷ poids à sec × 100. Une éprouvette cuite de 50,0 g qui pèse 50,6 g après trempage : 1,2 %.

Table: Défauts, causes et une première correction dans la formule de Seger
Label: Défauts

| Défaut          | Cause habituelle                                                 | Une première correction à essayer                                 |
| --------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Tressaillage    | L’émail se contracte plus que la terre                           | Moins de K₂O et de Na₂O ; plus de calcium, de magnésie ou de bore |
| Écaillage       | L’émail se contracte beaucoup moins que la terre                 | Plus de K₂O et de Na₂O                                            |
| Coulures        | Trop peu d’alumine, ou une couche trop épaisse                   | Plus d’alumine ; une couche plus mince                            |
| Retirement      | Un biscuit poussiéreux, ou une couche épaisse qui s’est fissurée | Nettoyer le biscuit ; une couche plus mince                       |
| Trous d’épingle | Des bulles de gaz dont les trous ne se sont pas refermés         | Un palier à la température maximale ; une couche plus mince       |

[L’accord terre-émail et les défauts](/guides/glazing-basics#fit-and-defects) explique chacun d’eux, avec le test à l’eau glacée pour le tressaillage. N’utilisez pas de pièces tressaillées ou écaillées pour les aliments ou les boissons.

::food-limits

### Dans Glazecalc

1. Sur la [page de la recette](/recipe), lisez le panneau **Limites** d’un de vos émaux, ainsi que sa dilatation calculée.
2. Copiez la recette, remplacez une partie du feldspath par du carbonate de calcium, et comparez les deux avec **Comparer** : dans quel sens la dilatation a-t-elle varié ?

### Fiche de travail

Table: Fiche de travail 6 : la terre
Label: Fiche de travail 6

| Éprouvette | Longueur marquée (mm) | Longueur après cuisson (mm) | Retrait (%) | Poids à sec (g) | Poids après trempage (g) | Absorption (%) |
| ---------- | --------------------- | --------------------------- | ----------- | --------------- | ------------------------ | -------------- |
| 1          | 100                   |                             |             |                 |                          |                |
| 2          | 100                   |                             |             |                 |                          |                |

### Pour vérifier

- Quel défaut vient d’un émail qui se contracte plus que sa terre, et quelle est une première correction ?
- Pourquoi ne faut-il jamais utiliser pour les aliments une pièce écaillée ?
- Un calcul peut-il vous dire qu’un émail est apte au contact alimentaire ? Qu’est-ce qui le peut ?

## Plans de tessons à imprimer {#tile-maps}

### Plan triaxial : 42 émaux

Deux triangles de 21 tessons, selon la disposition de Mélanges pour tessons d’essai avec 6 rangées : le tesson 1 en haut (feldspath), la rangée du bas allant du carbonate de calcium (à gauche) à la silice (à droite). Le triangle II est le triangle I avec 1 g d’oxyde de fer rouge en ajout à chaque tranche de 100 g, ce qui tire vers le céladon (青磁) en réduction. Cuits en oxydation et en réduction, cela fait 84 tessons. Les quantités sont des grammes pour 100 g.

Table: Plan triaxial : 福島長石, carbonate de calcium et silice, avec 10 de kaolin dans chaque tesson
Label: Plan triaxial

| Tesson (I) | Tesson (II) | 福島長石 | Carbonate de calcium | Silice | Kaolin | I ox. | I réd. | II ox. | II réd. |
| ---------- | ----------- | -------: | -------------------: | -----: | -----: | ----- | ------ | ------ | ------- |
| 1          | 22          |       90 |                    0 |      0 |     10 |       |        |        |         |
| 2          | 23          |       72 |                   18 |      0 |     10 |       |        |        |         |
| 3          | 24          |       72 |                    0 |     18 |     10 |       |        |        |         |
| 4          | 25          |       54 |                   36 |      0 |     10 |       |        |        |         |
| 5          | 26          |       54 |                   18 |     18 |     10 |       |        |        |         |
| 6          | 27          |       54 |                    0 |     36 |     10 |       |        |        |         |
| 7          | 28          |       36 |                   54 |      0 |     10 |       |        |        |         |
| 8          | 29          |       36 |                   36 |     18 |     10 |       |        |        |         |
| 9          | 30          |       36 |                   18 |     36 |     10 |       |        |        |         |
| 10         | 31          |       36 |                    0 |     54 |     10 |       |        |        |         |
| 11         | 32          |       18 |                   72 |      0 |     10 |       |        |        |         |
| 12         | 33          |       18 |                   54 |     18 |     10 |       |        |        |         |
| 13         | 34          |       18 |                   36 |     36 |     10 |       |        |        |         |
| 14         | 35          |       18 |                   18 |     54 |     10 |       |        |        |         |
| 15         | 36          |       18 |                    0 |     72 |     10 |       |        |        |         |
| 16         | 37          |        0 |                   90 |      0 |     10 |       |        |        |         |
| 17         | 38          |        0 |                   72 |     18 |     10 |       |        |        |         |
| 18         | 39          |        0 |                   54 |     36 |     10 |       |        |        |         |
| 19         | 40          |        0 |                   36 |     54 |     10 |       |        |        |         |
| 20         | 41          |        0 |                   18 |     72 |     10 |       |        |        |         |
| 21         | 42          |        0 |                    0 |     90 |     10 |       |        |        |         |

### Grille de Seger : 24 émaux

Chaque tesson a les mêmes fondants, 0,2 KNaO et 0,8 CaO, apportés par 福島長石 et le carbonate de calcium. L’alumine augmente de ligne en ligne vers le bas de la grille, et la silice de colonne en colonne vers la droite. Les recettes ont été calculées par la méthode de la séance 5 ; la formule de Seger de chacune, calculée par Glazecalc, s’écarte au plus de 0,01 pour l’alumine et de 0,06 pour la silice. Reportez chaque tesson sur un diagramme de la silice en regard de l’alumine, et tracez vos propres régions : mat, brillant, sous-cuit, avec coulures.

Table: Grille de Seger : 0,2 KNaO, 0,8 CaO, pourcentages en poids
Label: Grille de Seger

| Tesson | Al₂O₃ | SiO₂ | 福島長石 | Carbonate de calcium | Kaolin | Silice | Oxydation | Réduction |
| ------ | ----: | ---: | -------: | -------------------: | -----: | -----: | --------- | --------- |
| 1      |  0,25 |  2,0 |     46,9 |                 32,5 |    3,5 |   17,1 |           |           |
| 2      |  0,25 |  2,5 |     41,8 |                 28,9 |    3,1 |   26,2 |           |           |
| 3      |  0,25 |  3,0 |     37,6 |                 26,1 |    2,8 |   33,5 |           |           |
| 4      |  0,25 |  3,5 |     34,3 |                 23,7 |    2,5 |   39,5 |           |           |
| 5      |  0,25 |  4,0 |     31,4 |                 21,7 |    2,3 |   44,5 |           |           |
| 6      |  0,25 |  4,5 |     29,0 |                 20,1 |    2,2 |   48,7 |           |           |
| 7      |  0,35 |  2,0 |     44,3 |                 30,6 |   13,9 |   11,3 |           |           |
| 8      |  0,35 |  2,5 |     39,6 |                 27,4 |   12,4 |   20,5 |           |           |
| 9      |  0,35 |  3,0 |     35,9 |                 24,8 |   11,2 |   28,0 |           |           |
| 10     |  0,35 |  3,5 |     32,8 |                 22,7 |   10,3 |   34,2 |           |           |
| 11     |  0,35 |  4,0 |     30,2 |                 20,9 |    9,5 |   39,5 |           |           |
| 12     |  0,35 |  4,5 |     28,0 |                 19,4 |    8,8 |   43,9 |           |           |
| 13     |  0,45 |  2,0 |     41,9 |                 29,0 |   23,1 |    6,1 |           |           |
| 14     |  0,45 |  2,5 |     37,7 |                 26,1 |   20,8 |   15,4 |           |           |
| 15     |  0,45 |  3,0 |     34,3 |                 23,7 |   18,9 |   23,0 |           |           |
| 16     |  0,45 |  3,5 |     31,5 |                 21,8 |   17,4 |   29,4 |           |           |
| 17     |  0,45 |  4,0 |     29,1 |                 20,1 |   16,0 |   34,8 |           |           |
| 18     |  0,45 |  4,5 |     27,0 |                 18,7 |   14,9 |   39,4 |           |           |
| 19     |  0,55 |  2,0 |     39,7 |                 27,5 |   31,4 |    1,5 |           |           |
| 20     |  0,55 |  2,5 |     35,9 |                 24,9 |   28,4 |   10,8 |           |           |
| 21     |  0,55 |  3,0 |     32,8 |                 22,7 |   26,0 |   18,5 |           |           |
| 22     |  0,55 |  3,5 |     30,2 |                 20,9 |   23,9 |   25,0 |           |           |
| 23     |  0,55 |  4,0 |     28,0 |                 19,4 |   22,1 |   30,5 |           |           |
| 24     |  0,55 |  4,5 |     26,1 |                 18,1 |   20,6 |   35,3 |           |           |

Les mélanges de Glazecalc produisent des triangles et des carrés de 3 à 66 tessons, pas cette grille ; ouvrez n’importe quel tesson comme recette sur la [page de la recette](/recipe) et imprimez-en la liste de pesée à partir de là.

## Sources {#sources}

- 吉田博和, 吉田彩美, 寺門秀人, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/research/h27/vol44_26.pdf), 茨城県工業技術センター研究報告 第44号 (2015) : les six séances.
- 茨城県工業技術センター, [陶磁器釉薬技術研究会](https://www.itic.pref.ibaraki.jp/publication/doc/result/h27/H27_3-21.pdf), 平成27年 成果集 : les dates et les sujets des séances.
- 茨城県産業技術イノベーションセンター, [陶磁器用釉薬に関する研修](https://www.itic.pref.ibaraki.jp/publication/doc/result/r1/R1_4-05.pdf), 令和元年 成果集 : les exercices du cours de suivi, de 42, 90 et 78 émaux en oxydation et en réduction.
- 岡部弘文, [釉薬計算プログラムの開発](https://www.itic.pref.ibaraki.jp/publication/doc/research/h16/vol33-20.pdf), 茨城県工業技術センター研究報告 vol33 (2005) : le programme de calcul du centre lui-même.
- Bilecik Şeyh Edebali University, [informations sur le cours SCT305](https://ebs.bilecik.edu.tr/pdf/dersbilgigetir/333775) : la formule de Seger aux semaines 5, 6 et 8.
- 李堅萍, [國立臺北教育大學學報 19(2), 2006, pp. 51–68](https://jepr.ntue.edu.tw/var/file/63/1063/img/1141/19-2-18.pdf) : le calcul des émaux pour les enseignants à Taïwan.
- Glendale Community College, plan du cours ART 195 : la formule de Seger aux semaines 5 à 7 sur 15.
- Ministerium für Bildung Rheinland-Pfalz, Lehrplan Fachschule Keramikgestaltung (2003), Lernmodul 6, Glasuren.
- 佐賀県陶磁器原料株式会社, 釉薬原料の化学分析表 : l’analyse de 福島長石 dans la bibliothèque de Glazecalc.
- IUPAC, masses atomiques standard, telles que la chimie de Glazecalc les utilise.
