---
title: Learn with John Britt's free glaze course
lead: A companion to John Britt's free online Glaze Course on YouTube, unit by unit: his videos to watch, the Glazecalc guide sections to read, and exercises to try in Glazecalc.
---

## About this companion {#about}

John Britt is a potter and teacher who has made a free online Glaze Course: more than fifty videos on YouTube, from the unity formula to test tiles, clay and firing. **The videos are his.** They are free to watch on [his YouTube channel](https://www.youtube.com/@johnbrittpottery), in [the course's playlist](https://www.youtube.com/playlist?list=PL-Wllepy4jIbCxsXiQRG5GJzbKNUSUvPd). His website, [johnbrittpottery.com](http://johnbrittpottery.com/), has his books and glaze notes, including two books, now published by Union Square & Co., part of Hachette Book Group (both first came out under Lark imprints): _The Complete Guide to High-Fire Glazes: Glazing & Firing at Cone 10_ and _The Complete Guide to Mid-Range Glazes: Glazing and Firing at Cones 4-7_.

Glazecalc is not part of his course, and is not connected with him. This page only links to his videos, by the titles he gave them. It says nothing about what he says in them: watch them for that. What this page adds is what Glazecalc offers beside each unit: the sections of our guides that cover the same ground, and exercises to try with Glazecalc's calculator, or with an AI assistant connected to Glazecalc ([how to connect one](/assistants)).

### How to use it

- Take the units in order, or pick the one you need. Some of his videos are numbered out of order; here they are grouped by subject.
- The numbers are his. His list has no video 32 and no video 42, and he gave the number 49 to two videos. Two videos that are promotions (46 and 51) and a question and answer video are left out here.
- Watch the videos first. They open on YouTube, and they are in English.
- Then read the guide sections, and try the exercises. You need an account for the exercises that save a recipe, a blend or a firing log.
- Last, answer the questions under **Check** in your own words. The guide sections hold the answers.
- The exercises say in plain words what to ask an assistant, with the name of the tool it uses in brackets, such as (`analyze_recipe`). In an assistant, the prompt **glaze_course_lesson** sets up a lesson for a unit.
- Ask an assistant that is connected to your account to save a series of tiles as a notebook entry, or a tile you liked as a recipe. It shows what it will save and waits for your yes, and with **Confirm changes** on, nothing is saved until you approve it on the website.

> [!WARNING]
> Several units are lab work: weighing and mixing dry materials, and firing. Before you mix anything, read the [safe mixing guide](/guides/safe-mixing): dry glaze dust is the main hazard, and a fitted respirator, wet cleaning and lids on containers are the habits that matter most.

## Unit 1: The unity formula {#unity-formula}

### Watch

- [Description of UMF (Unity Molecular Formula) Structure (Free Online Glaze Class Pt. 1 )](https://www.youtube.com/watch?v=YNWdd6R6a4Q)
- [Calculating a UMF formula from a batch recipe. (Free Online Glaze Class Pt. 2)](https://www.youtube.com/watch?v=DXJcyOiAhU0)
- [Advantages and Disadvantages of UMF Unity Molecular Formula ( video 23 in FREE Online Glaze Course)](https://www.youtube.com/watch?v=Q8lkZbcmIa8)

### Read

- [From recipe to unity formula](/guides/glazing-basics#unity-formula), in Glazing from first principles.
- [What a glaze is](/guides/glazing-basics#what-a-glaze-is), if the words are new.

### Try

1. Start a [recipe](/recipe) with a simple glaze you have, and watch its unity formula change as you add each material.
2. Open **How the unity formula is worked out** on the recipe page and follow each step with your recipe's numbers. Then work one material out by hand and compare.
3. With an assistant: ask it to work out the unity formula of the same recipe (`analyze_recipe`) and explain each group of oxides. Then ask it to add silica from 0 to 20 on top of the recipe (`vary_material`), and say which numbers move and which do not.

### Check

- In a unity formula, which group of oxides adds up to 1?
- Why do two recipes with different materials sometimes have almost the same unity formula?
- When you add silica, why do the flux numbers stay the same?

## Unit 2: Limits and the Stull chart {#limits-and-stull}

### Watch

- [Short description of Glaze Limits and Stull diagram (Free Online Glaze Class Pt. 3)](https://www.youtube.com/watch?v=cboV_QYvK4I)
- [Understanding the Stull Chart (Free Online Glaze Class Pt. 4)](https://www.youtube.com/watch?v=vL4dGrZdPEs)

### Read

- [Limits and the Stull chart](/guides/glazing-basics#stull-chart): what the chart shows, and what it does not.
- [Food safety](/guides/glazing-basics#food-safety): what limit formulas are, and why they prove nothing.
- [From recipe to unity formula](/guides/glazing-basics#unity-formula): the silica to alumina ratio.
- [Cones and heatwork](/guides/glazing-basics#cones), for what a firing range means.

### Try

1. On the [recipe page](/recipe), set the recipe's firing, then look at the limits panel and the **Stull chart**. Where does your glaze sit, and does the line at the top say its chemistry fits its firing?
2. Change the silica a little at a time and watch the point move on the Stull chart.
3. With an assistant: ask it to check the recipe against the limits for its cone (`check_limits`), and explain each caution, whether the chemistry fits the firing, and where the recipe sits on the Stull chart. Then ask it to add silica from 0 to 30 (`vary_material`), and which regions of the chart the glaze crosses.

### Check

- Stull fired his tests at about which cone, and why does that matter for a cone 6 glaze?
- Does a point in the chart's "crazed" region mean the glaze will craze on your clay? What tells you that?
- Can a glaze inside the limits still be unsafe for food? Why?

## Unit 3: The oxides and what they do {#oxides}

### Watch

- [Properties of Ceramic Oxides (Free online Glaze Course- Part 5)](https://www.youtube.com/watch?v=6-HZ00qhFqM)
- [Properties of Ceramic oxides: Opacifiers and Colorants (Free Online Glaze Course Part 6)](https://www.youtube.com/watch?v=UApbG8CLaq0)

### Read

- [What a glaze is](/guides/glazing-basics#what-a-glaze-is): the three jobs oxides do.
- [Frits and raw materials](/guides/glazing-basics#materials)
- [Colorants and opacifiers](/guides/glazing-basics#color)

### Try

1. Open three materials in the [library](/material), such as whiting, a feldspar and a kaolin, and note which oxides each brings to a glaze.
2. With an assistant: ask it to look up each material (`get_material`) and sort their oxides into fluxes, glass formers and stabilizers.
3. Ask the assistant what one material does: add whiting from 0 to 20, then a frit, then talc from 0 to 10, each to the same base recipe (`vary_material`). Compare how the unity formula and the Stull chart point move. (The prompt **what_does_this_material_do** sets this up.)

### Check

- Which oxide is the main glass former, which is the main stabilizer, and what are two fluxes?
- Why is a frit used in place of a raw material that would give the same oxides?
- What does an opacifier do to a glaze?

## Unit 4: Color in different base glazes {#color-in-bases}

> [!WARNING]
> Colorants such as copper, chrome and manganese need the most care when mixing. Read [Materials that need most care](/guides/safe-mixing#materials) before you weigh them.

### Watch

- [Cone 6 Burgundy colorants in various glaze bases (Free Online Glaze Class Pt. 7)](https://www.youtube.com/watch?v=_r1pAjX_RQU)
- [Copper in various cone 6 base glazes (Free Online Glaze Class Pt. 8)](https://www.youtube.com/watch?v=XAhOnrUjlkI)

### Read

- [Colorants and opacifiers](/guides/glazing-basics#color)
- [Food safety](/guides/glazing-basics#food-safety): some colorants change how stable a glaze is.
- [From recipe to unity formula](/guides/glazing-basics#unity-formula): additions on top of the 100.

### Try

1. Save two base glazes as recipes, then copy each and add the same colorant to the copies, as an addition on top of the 100. Compare their unity formulas: what differs in the bases (boron, zinc, magnesium, alkali) that might change the color?
2. On [Blends](/blends), make a line blend from a base to the same base with a colorant, and print what to weigh for each tile.
3. With an assistant: ask it to compare the two bases only, without the colorant (`compare_recipes`), and say what differs. Then add the colorant to each base as an addition on top of the 100.

Colorant oxides count as fluxes in the unity formula. So a colorant changes the unity formula a little, too.

### Check

- Why can the same colorant give different colors in two base glazes?
- What does "an addition on top of the 100" mean?
- In the colorants table, which colorant is also a flux, and what does a lot of it do?

## Unit 5: Blending and testing methods {#blending}

> [!WARNING]
> Lab work. Read the [safe mixing guide](/guides/safe-mixing) first, above all [Habits that matter most](/guides/safe-mixing#habits).

### Watch

- [Understanding the Triaxial Blend (Free Online Glaze Course Part 9 Practical lab work)](https://www.youtube.com/watch?v=PMwi9K6_fOk)
- [Ian Currie Systematic Blend (Free Online Glaze Course Part 10 Practical lab work)](https://www.youtube.com/watch?v=oe4KgunSR_Q)
- [How to run a Volumetric Line Blend for Pottery Glazes (Free Online Glaze Course Part 11 Lab)](https://www.youtube.com/watch?v=1ty81TEAiEk)
- [Volumetric Color Blend Glaze Test (Part 1) (Free Online Glaze Course Part 12 Lab)](https://www.youtube.com/watch?v=1mXUeBdDFKQ)
- [Volumetric Color Blending (Part 2) (Free Online Glaze Course Part 13 Lab)](https://www.youtube.com/watch?v=98-9t8T6I8M)
- [Easy Glaze Testing (color blend) (part 1) (Free Online Glaze Course Part 16 Lab)](https://www.youtube.com/watch?v=Bmt55y-mbtc)
- [Easy Glaze Testing (Part 2 color blend) (Free Online Glaze Course Part 17 Lab)](https://www.youtube.com/watch?v=EZCppt2rSpI)
- [Progression Test (Free Online Glaze Course Part 19 Lab)](https://www.youtube.com/watch?v=Q7csS5t5pRo)
- [Combination Grid Test cone 6 ( video 22 in FREE Online Glaze Course)](https://www.youtube.com/watch?v=iDSr-SbWboY)
- [Combination Grid Over/Under -Part 2 (Video #22.1 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=ggWYOHowdgM)
- [Easy Glaze Testing Part 3: INGREDIENT BLEND (video 33 of FREE online glaze course)](https://www.youtube.com/watch?v=dLO_EOjvu-4)
- [Easy GlazeTesting PART 4 (Ingredient Blend) ( Video #34 in the FREE Online Glaze Course)](https://www.youtube.com/watch?v=opd-brS6OZc)

### Read

- [Test tiles and line blends](/guides/making-a-glaze#testing), in How to make a glaze.
- [Weighing](/guides/making-a-glaze#weighing)

### Try

1. On [Blends](/blends), set up a triaxial blend from three of your recipes, choose the number of rows, and print what to weigh for each tile.
2. Fire the tiles, then save the ones you like as recipes from the drawing of the tiles.
3. With an assistant: ask it to blend two or three recipes as the corners (`blend_recipes`), or to step one material up and down (`vary_material`), and to say which tiles stay inside the limits for the firing (`check_limits`) and which look off. If your assistant is connected to your account, ask it to save the series as a notebook entry. It shows what it will save and waits for your yes.

### Check

- In a line blend, what changes from one tile to the next?
- How many glazes do you start from in a triaxial blend, and how are the tiles laid out?
- Why do you write a code on every tile before it is fired?

## Unit 6: Test tiles and melt tests {#test-tiles-and-melt}

> [!WARNING]
> Lab work. Read the [safe mixing guide](/guides/safe-mixing) first. Set test tiles on a dish or a scrap of bisque, since a melt test is meant to run.

### Watch

- [Melt Tests (Free Online Glaze Course Part 14 Lab)](https://www.youtube.com/watch?v=7uQmd8NVfds)
- [Extruding Test Tiles (Free Online Glaze Course Part 18 Lab)](https://www.youtube.com/watch?v=XNjctMsjT5M)

### Read

- [Test tiles and line blends](/guides/making-a-glaze#testing)
- [Keeping records](/guides/making-a-glaze#records)

### Try

1. Give each tile a code, and write it in a [note](/notes) with the record below: the recipe, the clay body and the firing.
2. After the firing, write what each tile showed in the same note, and record the firing in a [firing log](/firing).
3. With an assistant: ask it to search the guides for "test tiles" (`search_guides`) and say what to write down for each tile.

A record for each tile, to copy into a note:

- **Tile code:**
- **Recipe and version:**
- **Clay body:**
- **Thickness** (number of dips, or the SG):
- **Kiln, cone, and where in the kiln:**
- **Firing log:**
- **What it looked like:**
- **Next test:**

### Check

- Why is a melt test set on a dish or a scrap of bisque?
- What are three things to write down for every tile?

## Unit 7: Glaze slurry and application {#slurry-and-application}

> [!WARNING]
> Lab work. Read the [safe mixing guide](/guides/safe-mixing) first, above all [Cleaning, clothes and hands](/guides/safe-mixing#cleaning).

### Watch

- [Deflocculated and Flocculated Glazes (Free Online Glaze Course Part 15 Lab)](https://www.youtube.com/watch?v=fpQns05RdVU)
- [Concepts in Glaze Thickness and Application ( part 21 of Free Online Glaze Course)](https://www.youtube.com/watch?v=0EYZJesDjDw)
- [Glaze Thickness or Specific Gravity #41 in my Free Online Glaze Course](https://www.youtube.com/watch?v=PYt9L_L6Xwo)

### Read

- [Specific gravity](/guides/making-a-glaze#specific-gravity), in How to make a glaze.
- [Specific gravity and application](/guides/glazing-basics#application), in Glazing from first principles.

### Try

1. Weigh 100 mL of a glaze you have, then use **Specific gravity and water** on its [recipe page](/recipe) to see how much water brings it to the SG you want.
2. Save that SG as the recipe's target, so it is there the next time you mix it.
3. With an assistant: give it what 100 mL of your glaze weighs, the litres in the bucket and the SG you want, and ask how much water to add or pour off (`specific_gravity_water`).

### Check

- 100 mL of a glaze weighs 145 g. What is its specific gravity?
- Which dips a thicker coat in the same time: a glaze at SG 1.40 or at SG 1.50?
- Why can two glazes at the same SG go on at different thicknesses?

## Unit 8: Where recipes come from, and substitutes {#recipes-and-substitutes}

> [!WARNING]
> Testing a substitute means weighing raw materials. Borates such as Gerstley Borate dissolve a little in water. Read [Materials that need most care](/guides/safe-mixing#materials) and [Habits that matter most](/guides/safe-mixing#habits) first.

### Watch

- [ORIGINS OF GLAZE RECIPES (Video #37 in the FREE online glaze course)](https://www.youtube.com/watch?v=0_tI2JZHLNA)
- [Gerstley borate and substitute testing. (Video #38 in FREE ONLINE GLAZE COURSE)](https://www.youtube.com/watch?v=Pc9dfDIf8i0)
- [Versatility of the Hansen 5 x 20 recipe PART 1 with a discussion of variations. VIDEO #43](https://www.youtube.com/watch?v=ZM1TqZC3jKI)
- [Versatility of Hansen 5x20 glaze, PART 2, It is #44 in the Free Online Glaze Course.](https://www.youtube.com/watch?v=6Bq-ShJyI0k)
- [The Versatility of 5 x 20 PART 3 (#47 in the FREE On-line Glaze Course)](https://www.youtube.com/watch?v=dOPeUiFMZ8A)

### Read

- [Frits and raw materials](/guides/glazing-basics#materials)
- [Buying materials](/guides/making-a-glaze#buying-materials)

### Try

1. Enter a recipe that uses Gerstley Borate on the [recipe page](/recipe) and choose **Try modern materials and compare**. Compare the two unity formulas.
2. Add the materials you have on hand, then use **Make it from what you have** to remake a recipe from only those.
3. With an assistant: ask it for substitutes for the old materials in the recipe (`suggest_substitutes`), then to remake it from the materials you have (`match_from_materials`), and to compare the original with each (`compare_recipes`). To aim for a unity formula you have chosen, ask it to make a recipe for it from the materials you have (`solve_target`).

### Check

- Why can a recipe made with the same material names come out different in your studio?
- What do you compare to tell whether a substitute is close: the recipes or the unity formulas?
- Why must a substitute still be tested on a tile?

## Unit 9: Special surfaces {#special-surfaces}

> [!WARNING]
> Some of these surfaces use larger amounts of colorants, or reduction firing. Read [Materials that need most care](/guides/safe-mixing#materials) and [Venting the kiln](/guides/safe-mixing#kiln) first.

### Watch

- [Overview of Shino Glazes ( Video #31 in the FREE online Glaze Course). "RECIPES" are on my website.](https://www.youtube.com/watch?v=F178U4FX-Vg)
- [Crater Glaze Exploration cone 6 ( #39 in my Free Online Glaze Course.)](https://www.youtube.com/watch?v=SB3sPj37PX8)
- [Secrets of Oil Spot Glazes #49 in my FREE Online Glaze Course](https://www.youtube.com/watch?v=sNJq1cLDw5I)
- [RUST-Explorations into faux ceramic rust surfaces. #50 in my FREE Online Glaze Course](https://www.youtube.com/watch?v=BzBmvqhV8KM)
- [Sculptural Ceramic Surfaces 2026 (#45 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=4VIf9OgX0io)

### Read

- [Oxidation and reduction](/guides/glazing-basics#atmosphere)
- [Glaze fit and defects](/guides/glazing-basics#fit-and-defects): some surfaces are defects put to use.

### Try

1. Enter a special-surface recipe on the [recipe page](/recipe) and read its limits panel. Which cautions are the point of the surface, and which still matter? A surface for sculpture is not one for a mug.
2. With an assistant: ask it to check the recipe against the limits for its firing (`check_limits`), and explain why it may say it cannot judge whether some of these glazes fit the firing.

### Check

- Which defect do some potters want on purpose, and what is it called then?
- Why is a surface made for sculpture not right for a mug?

## Unit 10: Raw materials and geology {#raw-materials}

> [!WARNING]
> Digging and grinding rocks makes dust. Read [The main hazard: dust](/guides/safe-mixing#the-main-hazard) and [Respirators](/guides/safe-mixing#respirators) first.

### Watch

- [Basic Overview of Ceramic Geology For Potters (Video #24 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=DWZsDCHUAvQ)
- [Acquiring and Processing Ceramic Raw Materials (Video #25 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=AitvrEiWyS0)
- [Rocks and Minerals in Ceramics ( #40 in FREE Online Glaze Course)](https://www.youtube.com/watch?v=xiKZkWhyg-U)

### Read

- [Frits and raw materials](/guides/glazing-basics#materials)
- [The main hazard: dust](/guides/safe-mixing#the-main-hazard) and [Respirators](/guides/safe-mixing#respirators)
- [Materials that need most care](/guides/safe-mixing#materials)

### Try

1. If you have an analysis of a local rock or clay, add it as one of your own materials and use it in a test recipe.
2. With an assistant: ask it to look up a feldspar and a kaolin (`get_material`) and compare their analyses with your own material's.

### Check

- Why do you need an analysis before a local rock can go into a recipe?
- What is the main hazard when you grind rocks, and what protects you from it?

## Unit 11: Clay and slip {#clay}

These videos are about clay bodies and slips. Glazecalc works out glazes, not clay bodies, so there is little to calculate here. If you dig or mix clay yourself, read the warning first.

> [!WARNING]
> Digging, drying and sieving wild clay makes dust, and clay dust can have silica in it; how much depends on the clay. You do not know what else a wild clay holds. Read [The main hazard: dust](/guides/safe-mixing#the-main-hazard) and [Respirators](/guides/safe-mixing#respirators) first.

### Watch

- [Understanding Slip in Ceramics (Free Online Glaze Class Pt. 20 )](https://www.youtube.com/watch?v=qilS20pRdzY)
- [Types of Clay (Video #26 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=I-LpbF0wOZ4)
- [Properties of Clay - Physical characteristics: Video #27 of the Free online glaze course](https://www.youtube.com/watch?v=7_Ml0a_Me7k)
- [Clay Bodies Free online Glaze Course #28](https://www.youtube.com/watch?v=sUC2QcLI4OA)
- [Practical Examples of Clay Bodies #29 in the Free on-line Glaze Course](https://www.youtube.com/watch?v=mJATUP2ftaA)
- [Wild Clay #30 in Free Online Glaze Class](https://www.youtube.com/watch?v=0Vq445iD9i8)
- [Nerikomi (Neriage) ( Video 35 in my FREE Online Glaze course)](https://www.youtube.com/watch?v=6VURyRMDY9E)

### Read

- [Clay, coatings and the two firings](/guides/glazing-basics#clay-and-firings)
- [Glaze fit and defects](/guides/glazing-basics#fit-and-defects): the clay body and the glaze must fit each other.

### Try

1. Write down the clay bodies you use, with their firing range, in a [note](/notes), and test every glaze on each of them.

### Check

- Why must every glaze be tested on each clay body you use?
- What two firings does most pottery go through, and what does each do?

## Unit 12: Firing {#firing}

> [!WARNING]
> Every firing gives off fumes, and a kiln can make carbon monoxide. A gas kiln or a reduction firing makes more of it. Vent the kiln and the room, and keep away from the hot kiln and its parts: they burn. Read [Venting the kiln](/guides/safe-mixing#kiln) first.

### Watch

- [How I fire my gas kiln (Video #48 )](https://www.youtube.com/watch?v=WK30mcBTE7g)
- [How I fire my forced air downdraft kiln, with Oxiprobe. (Video #49 in my FREE Online Glaze Course)](https://www.youtube.com/watch?v=IM7Vb6R_H3E)

### Read

- [Cones: what they measure](/guides/firing#cones), in Firing a basic kiln.
- [Glaze firing](/guides/firing#glaze)
- [Venting the kiln](/guides/safe-mixing#kiln)

### Try

1. Start a [firing log](/firing) for your next firing, with columns for time, temperature and cones. A gas kiln's log can add columns such as Ox Probe, Damper and Primary Air.
2. With an assistant: ask it for the temperature of the cones you fire to, in both scales (`convert_cone_temperature`).

### Check

- Does a cone measure temperature? What does it measure?
- Why must a kiln and its room be vented during a firing?

## One more video {#more}

John Britt's course also has a video on a subject some potters come to for personal reasons:

- [Incorporating cremains into glazes and clay. (Video #36 in the FREE ONLINE GLAZE COURSE)](https://www.youtube.com/watch?v=ZPEafNn6aiE)

## Sources {#sources}

- [John Britt's Free Online Glaze Course, the playlist on YouTube](https://www.youtube.com/playlist?list=PL-Wllepy4jIbCxsXiQRG5GJzbKNUSUvPd)
- [John Britt Pottery on YouTube](https://www.youtube.com/@johnbrittpottery)
- [John Britt Pottery: johnbrittpottery.com](http://johnbrittpottery.com/)
- John Britt, [_The Complete Guide to High-Fire Glazes: Glazing & Firing at Cone 10_](https://www.hachettebookgroup.com/titles/john-britt/the-complete-guide-to-high-fire-glazes/9781600592164), Union Square & Co. (first published by Lark Books, 2004)
- John Britt, [_The Complete Guide to Mid-Range Glazes: Glazing and Firing at Cones 4-7_](https://www.hachettebookgroup.com/titles/john-britt/the-complete-guide-to-mid-range-glazes/9781454707776/), Union Square & Co. (first published by Lark Ceramics), 2014
