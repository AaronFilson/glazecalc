---
title: Learn with John Britt's free glaze course
lead: A companion to John Britt's free online Glaze Course on YouTube, unit by unit: his videos to watch, the Glazecalc guide sections to read, and exercises to try in Glazecalc.
---

## About this companion {#about}

John Britt is a potter and teacher who has made a free online Glaze Course: more than fifty videos on YouTube, from the unity formula to test tiles, clay and firing. **The videos are his.** They are free to watch on [his YouTube channel](https://www.youtube.com/@johnbrittpottery), in [the course's playlist](https://www.youtube.com/playlist?list=PL-Wllepy4jIbCxsXiQRG5GJzbKNUSUvPd). His website, [johnbrittpottery.com](http://johnbrittpottery.com/), has his books and glaze notes, including two books, first published by Lark Books and now published by Union Square & Co., part of Hachette Book Group: _The Complete Guide to High-Fire Glazes: Glazing & Firing at Cone 10_ and _The Complete Guide to Mid-Range Glazes: Glazing and Firing at Cones 4-7_.

Glazecalc is not part of his course, and is not connected with him. This page only links to his videos, by the titles he gave them. It says nothing about what he says in them: watch them for that. What this page adds is what Glazecalc offers beside each unit: the sections of our guides that cover the same ground, and exercises to try with Glazecalc's calculator, or with an AI assistant connected to Glazecalc ([how to connect one](/assistants)).

### How to use it

- Take the units in order, or pick the one you need. Some of his videos are numbered out of order; here they are grouped by subject.
- Watch the videos first. They open on YouTube, and they are in English.
- Then read the guide sections, and try the exercises. You need an account for the exercises that save a recipe, a blend or a firing log.
- The exercises name the tools an assistant can use, such as `analyze_recipe`. In an assistant, the prompt **glaze_course_lesson** sets up a lesson for a unit.
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
3. With an assistant: ask it to run `analyze_recipe` on the same recipe and explain each group of oxides in the answer. Then ask it to run `vary_material` with silica from 0 to 20 on top of the recipe, and say which unity formula numbers move and which do not.

## Unit 2: Limits and the Stull chart {#limits-and-stull}

### Watch

- [Short description of Glaze Limits and Stull diagram (Free Online Glaze Class Pt. 3)](https://www.youtube.com/watch?v=cboV_QYvK4I)
- [Understanding the Stull Chart (Free Online Glaze Class Pt. 4)](https://www.youtube.com/watch?v=vL4dGrZdPEs)

### Read

- [From recipe to unity formula](/guides/glazing-basics#unity-formula): the silica to alumina ratio.
- [Cones and heatwork](/guides/glazing-basics#cones), for what a firing range means.

### Try

1. On the [recipe page](/recipe), set the recipe's firing, then look at the limits panel and the **Stull chart**. Where does your glaze sit, and does the line at the top say its chemistry fits its firing?
2. Change the silica a little at a time and watch the point move on the Stull chart.
3. With an assistant: ask it to run `check_limits` with the recipe and its cone, and explain each caution and the `coneFit` verdict. Its answer also says where the recipe sits on the Stull chart (`stull`). Then ask for `vary_material` with silica from 0 to 30, and which regions of the chart the glaze crosses.

## Unit 3: The oxides and what they do {#oxides}

### Watch

- [Properties of Ceramic Oxides (Free online Glaze Course- Part 5)](https://www.youtube.com/watch?v=6-HZ00qhFqM)
- [Properties of Ceramic oxides: Opacifiers and Colorants (Free Online Glaze Course Part 6)](https://www.youtube.com/watch?v=UApbG8CLaq0)

### Read

- [Frits and raw materials](/guides/glazing-basics#materials)
- [Colorants and opacifiers](/guides/glazing-basics#color)

### Try

1. Open three materials in the [library](/material), such as whiting, a feldspar and a kaolin, and note which oxides each brings to a glaze.
2. With an assistant: ask it to run `get_material` for each and sort their oxides into fluxes, glass formers and stabilizers.
3. Ask the assistant what one material does: `vary_material` with whiting from 0 to 20, then a frit, then talc from 0 to 10, each in the same base recipe. Compare how the unity formula and the Stull chart point move. (The prompt **what_does_this_material_do** sets this up.)

## Unit 4: Color in different base glazes {#color-in-bases}

> [!WARNING]
> Colorants such as copper, chrome and manganese need the most care when mixing. Read [Materials that need most care](/guides/safe-mixing#materials) before you weigh them.

### Watch

- [Cone 6 Burgundy colorants in various glaze bases (Free Online Glaze Class Pt. 7)](https://www.youtube.com/watch?v=_r1pAjX_RQU)
- [Copper in various cone 6 base glazes (Free Online Glaze Class Pt. 8)](https://www.youtube.com/watch?v=XAhOnrUjlkI)

### Read

- [Colorants and opacifiers](/guides/glazing-basics#color)
- [Food safety](/guides/glazing-basics#food-safety): some colorants change how stable a glaze is.

### Try

1. Save two base glazes as recipes, then copy each and add the same colorant to the copies. Compare their unity formulas: what differs in the bases (boron, zinc, magnesium, alkali) that might change the color?
2. On [Blends](/blends), make a line blend from a base to the same base with a colorant, and print what to weigh for each tile.
3. With an assistant: ask it to run `compare_recipes` on two bases, or on a base and the same base with the colorant, and say what differs. Then `blend_recipes` from the base to the colored base for the tiles.

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
3. With an assistant: ask it to run `blend_recipes` with two or three recipes as the corners, or `vary_material` for an ingredient blend of one material, and to say which tiles pass `check_limits` and which look off for the firing. If your assistant is connected to your account, ask it to save the series as a notebook entry. It shows what it will save and waits for your yes.

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

1. Give each tile a code, and write it in a [note](/notes) with the recipe, the clay body and the firing.
2. After the firing, write what each tile showed in the same note, and record the firing in a [firing log](/firing).
3. With an assistant: ask it to run `search_guides` for "test tiles" and summarise what to write down for each tile.

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
3. With an assistant: ask it to run `search_guides` for "specific gravity" and explain the steps for your bucket.

## Unit 8: Where recipes come from, and substitutes {#recipes-and-substitutes}

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
3. With an assistant: ask it to run `suggest_substitutes` on the recipe, then `match_from_materials` with the materials you have, and `compare_recipes` for the original against each. To aim for a unity formula you have chosen, `solve_target` makes a recipe from the materials you have.

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
2. With an assistant: ask it to run `check_limits` with the firing and explain why the `coneFit` check may say it cannot judge some of these glazes.

## Unit 10: Raw materials and geology {#raw-materials}

> [!WARNING]
> Digging and grinding rocks makes dust. Read [The main hazard: dust](/guides/safe-mixing#the-main-hazard) and [Respirators](/guides/safe-mixing#respirators) first.

### Watch

- [Basic Overview of Ceramic Geology For Potters (Video #24 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=DWZsDCHUAvQ)
- [Acquiring and Processing Ceramic Raw Materials (Video #25 in the Free Online Glaze Course)](https://www.youtube.com/watch?v=AitvrEiWyS0)
- [Rocks and Minerals in Ceramics ( #40 in FREE Online Glaze Course)](https://www.youtube.com/watch?v=xiKZkWhyg-U)

### Read

- [Frits and raw materials](/guides/glazing-basics#materials)
- [Materials that need most care](/guides/safe-mixing#materials)

### Try

1. If you have an analysis of a local rock or clay, add it as one of your own materials and use it in a test recipe.
2. With an assistant: ask it to run `get_material` for a feldspar and a kaolin and compare their analyses with your own material's.

## Unit 11: Clay and slip {#clay}

These videos are about clay bodies and slips. Glazecalc works out glazes, not clay bodies, so this unit is for watching.

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

## Unit 12: Firing {#firing}

### Watch

- [How I fire my gas kiln (Video #48 )](https://www.youtube.com/watch?v=WK30mcBTE7g)
- [How I fire my forced air downdraft kiln, with Oxiprobe. (Video #49 in my FREE Online Glaze Course)](https://www.youtube.com/watch?v=IM7Vb6R_H3E)

### Read

- [Cones: what they measure](/guides/firing#cones), in Firing a basic kiln.
- [Glaze firing](/guides/firing#glaze)
- [Venting the kiln](/guides/safe-mixing#kiln)

### Try

1. Start a [firing log](/firing) for your next firing, with columns for time, temperature and cones. A gas kiln's log can add columns such as Ox Probe, Damper and Primary Air.
2. With an assistant: ask it to run `convert_cone_temperature` for the cones you fire to, in both scales.

## One more video {#more}

John Britt's course also has a video on a subject some potters come to for personal reasons:

- [Incorporating cremains into glazes and clay. (Video #36 in the FREE ONLINE GLAZE COURSE)](https://www.youtube.com/watch?v=ZPEafNn6aiE)

## Sources {#sources}

- [John Britt's Free Online Glaze Course, the playlist on YouTube](https://www.youtube.com/playlist?list=PL-Wllepy4jIbCxsXiQRG5GJzbKNUSUvPd)
- [John Britt Pottery on YouTube](https://www.youtube.com/@johnbrittpottery)
- [John Britt Pottery: johnbrittpottery.com](http://johnbrittpottery.com/)
- John Britt, [_The Complete Guide to High-Fire Glazes: Glazing & Firing at Cone 10_](https://www.hachettebookgroup.com/titles/john-britt/the-complete-guide-to-high-fire-glazes/9781600592164), Union Square & Co. (first published by Lark Books)
- John Britt, [_The Complete Guide to Mid-Range Glazes: Glazing and Firing at Cones 4-7_](https://www.hachettebookgroup.com/titles/john-britt/the-complete-guide-to-mid-range-glazes/9781454707776/), Union Square & Co. (first published by Lark Books), 2014
