# Changelog

Notable changes to Glazecalc. Versions before 0.3.0 were numbered afterwards, from the history.

## 0.5.0 (not yet released)

### Added

- **Where you work, and numbers your way** (the groundwork for other languages,
  [plan](docs/i18n-plan.md)). Settings gain:
  - **Where you work:** the EU countries, the US, UK, Australia and New Zealand. It sets the
    defaults below and which standard materials are listed; until chosen, your browser's region does.
  - **Numbers and dates:** as your language and region write them (12.345,6 in Germany, 12 345,6
    in France), or a format you choose.
  - **Typing amounts** with a comma or a point for decimals, or only one of them. A recipe typed as
    12,5 in Germany is saved as 12.5 and opens the same anywhere.
  - **Temperatures** in °C or °F, and **firing** to Orton cones or by temperature: both follow your
    region until you choose. Replace lead names firings the same way.
- **Who to call, for your region**, in the home-safety guide: the emergency number, poison lines
  and animal poison lines for each of the 31 regions, each checked on an official page (dated, with
  its source), and only those that could be checked. It says where a country has no public poison
  line.
- **The guides follow where you work**, for each of the 31 regions, each fact checked on the law's,
  the agency's or the shop's own page and dated (and any country can be chosen to compare):
  - **Shops** that sell raw glaze materials to potters (up to four per country, or shops elsewhere that
    deliver there), with what they sell, the packs seen and some materials by the shop's own names.
  - **The materials sold where you buy** closest to those a recipe names from elsewhere, by the
    library's analyses: Custer feldspar, say, against the potash feldspars sold in the EU.
  - **The workplace limit for silica dust** in your country, the law that sets it, and the national
    body for safety at work.
  - **The limits on lead and cadmium** a glazed piece may release, as your country's law states them,
    including the far lower Benelux limits since May 2026.
  - **Who to call** now covers Malta and Portugal, and links the health ministry where no public poison
    line could be confirmed (Lithuania shows 112 alone, as its ministry's site could not be read).
- **In German, French, Spanish, Italian, Polish and Portuguese.** Every page, the five guides,
  the standard materials' notes and hazards, the server's messages and the password emails, in the
  formal register, with each language's potters' terms (a glossary per language, built from
  suppliers' catalogues). Each was translated by AI, reviewed part by part, and its safety text
  translated back into English and compared with the original. Every translated page says it was
  translated by AI and links to a form to suggest a better wording; [CONTRIBUTING.md](CONTRIBUTING.md)
  says how to help.
- **In Bulgarian, Croatian, Czech, Danish, Dutch, Finnish, Greek, Hungarian, Romanian, Slovak,
  Slovenian and Swedish**, the second wave, made the same way, then
  checked for consistency across each language's files: the same word for the guides, never the word
  for a kiln's own manual, and the same guide titles in every link and list.
- **In Lithuanian**, the third wave, made the same way. The reviews' lessons went into the prompts as
  the wave ran: "may not melt fully" is not "may not melt at all", a rule a translation of the recipe
  checks had broken.
- **Ready for other languages** ([ADR 13](docs/adr/0013-translations.md),
  [how to write text](docs/translating.md)). Every piece of text the app shows now comes from a
  messages file, in ICU MessageFormat through Transloco, so a language is added by translating
  files.
  - Each language has its own addresses (`/de/recipe`), with English at the ones it has
    today. Search engines are told about each page's languages, and the sitemap lists them.
  - **Settings:** your language (once there is more than one), and how you read glaze density
    (specific gravity, degrees Baumé, or pint weight). A translated page offers the English
    after key terms, and a notice that it was translated by AI, with a GitHub form to suggest a
    correction.
  - **The guides** are now Markdown, one file per language. Temperatures show in your scale first,
    and the firing guide shows firing to cones or by temperature, as you fire, with the other a
    click away. Glaze densities show your way.
  - The chemistry's and the server's messages, the standard materials' notes and hazards, and who
    to call can all be translated. A translation of a hazard shows only for exactly the English it
    was made from.
  - **Checks in CI:** every key has its English and every English is used; translations keep the
    English's placeholders, tags and the plural forms their language needs; each page tested in a
    pseudo-locale shows no text left unmarked; and a mirrored right-to-left page was tried in
    Arabic.

- **Compare two recipes side by side**
  ([#6](https://github.com/AaronFilson/glazecalc/issues/6)). **Compare**, beside Save or on a
  saved recipe, lines up their unity formulas oxide by oxide with the change from the first to
  the second, then the silica to alumina ratio, flux balance and LOI, and each recipe's materials.
  - Colorants count as each recipe says, or in both, or in neither, to compare like with like;
    it says when the two count them differently.
  - Prints on one page; Back, or the browser's Back, returns to the recipe as it was.
- **Old recipes with modern materials.** A recipe that uses a material that is discontinued,
  historical or hard to get says what is used now (preferring one sold in your region).
  **Try modern materials and compare** swaps them in, one for one at the same amount, as a new
  recipe, and compares it with the old one; **Undo the swap** puts it back.
  - A swap is called like for like only when the two give much the same oxides gram for gram
    (Custer Spar and G-200 EU). Others, such as niter to a soda frit or red lead to a lead frit,
    say to work the amount out again, and a replacement that still has lead says so.
  - **Suggest amounts and compare,** for a swap that is not like for like, works the amounts out
    again to bring the old recipe's unity formula back, changing as few as it can: red lead 55,
    china clay 15, silica 30 becomes lead bisilicate frit 81.6, china clay 9.7, silica 6.2.
    When the new material cannot bring back something the old one gave (a soda frit has almost
    no potash), it asks which material should, offering the best three sold in your region, or
    none ([ADR 10](docs/adr/0010-suggested-amounts.md)).
- **Lead, off unless chosen** ([ADR 11](docs/adr/0011-replacing-lead.md)). Settings gains Lead,
  off by default: materials with lead are not listed to add or suggested, and turning it on asks
  once, with the handling and food-contact warning. Recipes that already have lead still open,
  with a warning that says how much lead is in the glaze.
  - **Replace lead** asks the cone and which lead-free frit to build on (the three best sold in
    your region), then rebuilds the glaze: its silica and alumina kept, lead's share of the fluxes
    given to soda and potash, calcium and a little zinc, and boron set for the firing (about 0.5
    at cone 04). Or it keeps the colour on a lead-free base of the frit and kaolin, 85 to 15.
  - The new recipe says what to expect: colours that need lead (Naples yellow, chrome reds),
    copper turning bluer, honey glazes less warm, possible clouding and crazing, and that having
    no lead does not by itself make ware safe with food.
- **Choosing materials, and saying why** ([ADR 12](docs/adr/0012-choosing-materials.md)).
  - **Materials to try:** Suggest amounts and Replace lead take any number of materials from the
    library or your own, each perhaps marked **Must use**. The match uses those that help, as few as
    it can.
  - **How the new recipe was made,** beside the comparison and under Materials. It says what each
    material supplies ("all the potash and 71% of the alumina") and whether the match needs it, what
    else would help, near-identical choices, and oxides nothing on offer has. It also says what to
    watch for.
  - Its buttons work the recipe out again from the old one:
    - **Leave it out** (and **Allow them again**);
    - **Add it**;
    - **Use it instead**, for a near-identical material;
    - **Allow more**, past a suggested cap;
    - **Try other materials**.
  - **Replace lead** picks up to four materials beside the base frit, from those sold in your
    region:
    - a partner frit;
    - feldspar or wollastonite;
    - a little whiting, dolomite or zinc where they melt.

    The base frits are ones their makers sell as bases, so calcium borate and craze-cure frits are
    not offered as bases. It keeps at least 10% clay so the glaze stays suspended, and leaves zinc
    out with chrome, iron or copper or below cone 03. To keep the colour, it offers only bases with
    enough alumina.

  - **Past a recommended limit, it says what the glaze will likely do** rather than refuse, in two
    strengths ("tends to", "will probably"), by firing, and only where the old recipe was not
    already past it. Limits cover:
    - boron, alumina, soda and potash, magnesia and zinc;
    - raw whiting at low fire, fluorine and soluble materials, and too much or too little clay;
    - a frit doing the wrong job;
    - expansion;
    - many materials, and amounts too small to weigh.
  - Materials that dissolve in water (borax, soda ash, niter) or give off fluorine (fluorspar,
    cryolite) are no longer suggested, though you can still add them.
- **Match with what I have.** On any recipe, choose the materials you have on hand, from the
  library, your own, or the recipe in one click. The match makes the recipe again from only those,
  as near its fired oxides as they allow, as a new recipe compared with the old one. The list is
  kept with your account for next time.
- **Guides for new potters** (Guides, in the menu), each with its sources and the points where
  they disagree:
  - **Glazing from first principles:** what a glaze is, and every word a recipe, a bag or a cone
    chart uses, with a glossary.
  - **How to make a glaze:** buying, storing, weighing, mixing, sieving, specific gravity, test
    tiles, line blends and records.
  - **Safe mixing and ventilation:** silica dust, respirators by region, wet cleaning, spraying,
    venting the kiln, the materials that need most care, and safety data sheets.
  - **Don't poison your family:** pottery at home with children and pets, with poison lines for
    the US, UK, Ireland, EU, Australia and New Zealand.
  - **Firing a basic kiln:** cones and how to read them, kiln sitters, and manual kilns, with
    published schedules for bisque and glaze firings in °F and °C.
- **Calculated thermal expansion** in Compare, old against new, worked out as Digitalfire's
  Insight and Glazy do it (each fired oxide's weight percent times its coefficient): Leach's 4321
  comes to 7.49, as in Glazy. Replace lead says when the expansion rises, since crazing is the
  commonest failure of a converted glaze.
- **Your own colors** ([#13](https://github.com/AaronFilson/glazecalc/issues/13)): Settings
  chooses light, dark, or as the device is set, and a palette for buttons, links and tabs named
  for glazes: tenmoku rust, celadon green, cobalt blue, oxblood red, shino orange or wood ash
  olive. Each meets WCAG AA contrast in light and dark, checked by axe on every palette.
  - Kept with the account, so they follow it to every device; this browser's copy is applied
    before the page first paints, so it never flashes in the wrong colors.
  - Printed recipes stay black on white.
- **Problems show on the fields themselves**
  ([#9](https://github.com/AaronFilson/glazecalc/issues/9)), on every form: sign-in and sign-up,
  password reset and change, deleting the account, materials, additives, firing logs, notes,
  advice and recipes.
  - A field with a problem is outlined, marked for screen readers (aria-invalid), and says what
    is wrong under it: "Enter an amount (0 is fine).", "The two passwords do not match."
  - Fields are checked when you leave one with something in it, and all of them when you save;
    the focus goes to the first problem. A mark goes as soon as the field is fixed.
  - The server says which field a problem is about, so "An account with that email already
    exists" shows on the email field.
  - Buttons are no longer greyed out without saying why; pressing one says what to fix.
- **Print a recipe for the glaze room** ([#4](https://github.com/AaronFilson/glazecalc/issues/4)).
  - **Print**, beside Save or on a saved recipe, lays it out for paper: one page on Letter or A4,
    black on white whatever the screen's theme.
  - Print the whole recipe, with its unity formula, flux balance, oxide analysis, LOI and notes,
    or just a batch list: what to weigh for a batch of any size, a running total for weighing
    into one bucket, and a box to tick for each.
  - Colorants given as a percent of the base are that percent of the batch; those in parts or
    grams scale with the base. A saved PDF is named after the recipe.
  - Back, or the browser's Back, returns to the recipe just as it was. A saved recipe's print
    view has its own address, so a reload or a bookmark opens it again.
- **Settings, on the account page,** kept with the account so they hold on every device; trials
  have them too.
  - Batch weights in grams, or in pounds and ounces (2 lb 3.5 oz). The print view can change
    this as well, and **Scale to a batch** on the recipe page follows it: the batch is in pounds,
    and each amount shows its weight in pounds and ounces under it. Colorants in grams become
    parts there, since they would now be pounds.
  - Grams to a tenth (4938.2 g, with hundredths under 10 g), or in full (4938.23517 g).
- **A larger standard library: 167 materials and 37 additives**, from manufacturers' data sheets
  where they exist (ADR 0009).
  - **Modern replacements for every discontinued material:** G-200 EU and Mahavir for Custer,
    Oxford and G-200; Minspar 200 for Kona F-4; Alberta Slip for Albany slip; Gillespie Borate
    for Gerstley, Laguna Borate and Boraq; Wilco UPF for EPK; current Cornwall stone
    substitutes.
  - **More US materials:** Ferro (Vibrantz) and Fusion frits, nepheline syenite A270,
    wollastonite, ball clays and others.
  - **An EU set:** German, French, Spanish, Italian, Swiss and Swedish feldspars (Sibelco
    Norflux, Bodmer, Ceradel, Prodesco, Sila); Zettlitz and other European kaolins, a Westerwald
    and a Sibelco ball clay, and two bentonites; and the frits German and Dutch recipes name by
    number: Vibrantz (ex-Degussa) 90xxx (90255 and 90428 from Hans Wolbring's formulas), Mondré & Manz, Reimbold & Strick and Keramikos,
    including clearly marked lead frits. Grolleg, Molochite, Hyplas 71, Sibelco FFF, the
    nepheline syenites, H&G Cornwall Stone and the Ferro frits are marked as sold in the EU too,
    and "Sold in" offers EU.
  - **An Australia and New Zealand set:** the Eckalite kaolins, New Zealand halloysite, Claypro
    ball clay, a Thai potash feldspar and an Indian soda feldspar as sold there, Walker's
    synthetic Cornish stone, Sibelco Lang Lang silica and Trubond bentonite. Also the Ferro
    Australia frits that Australian recipes name (4110, 4124, 4108, 4131, 4113, 4171 and 9146,
    all now replaced by the US frits, and the 4064 lead bisilicate, clearly marked), and the
    Clay Ceram of older recipes. The US frits, Grolleg, EPK, Molochite, nepheline syenite A270,
    Gerstley Borate and others are marked as sold there too, and "Sold in" offers AU and NZ.
  - **A UK set:** Grolleg, Molochite, Hyplas 71, UK feldspars, and borax, alkaline, calcium
    borate, low-expansion and lead frits.
  - **More additives:** bentonite, zircon, Veegum, Macaloid, carbonates and more.
  - **The old entries stay,** marked discontinued or historical with their substitutes, for
    comparing with old recipes.
  - **Your own additives can have no oxide analysis,** such as a commercial stain; recipes leave
    them out of the unity formula.
  - **Every entry shows its source,** linked when it is online and dated when the source is,
    with its other names, status and maker, and hazards where the data sheet gives them.
  - **The materials and additives pages filter** by name or other name, kind and region. The
    recipe page's list matches other names, marks old entries and remembers the region.
- **Count colorants and additives in the unity formula, or not.** Calculators differ, which makes
  recipes hard to compare.
  - A checkbox under the Unity formula heading chooses. Each additive counts at its weight in the batch.
  - The choice is saved with the recipe; new recipes start with the choice made last.
  - To make this possible, additives are now entered as materials are (fired oxides and LOI) and
    carry their chemistry.
- `npm run test:e2e:linux` runs the browser tests on Linux in Docker, in the Ubuntu that CI
  uses (through WSL on Windows), on the working tree as it is; `npm run test:all:linux` runs
  every suite that way. Linux's wider fonts break layouts that pass on Windows.

### Changed

- **Plainer English where translators misread it**, in the guides, and every language with it:
  cooking ware of any size is in the food-contact category (not only over 3 L); small children and pets
  cannot understand a warning sign, so keep them behind a locked door (not only those who cannot);
  be there when the firing ends, rather than for all of it; keep cats out of the studio (read as
  "outdoors"); and a test tile on a kiln-washed shelf.
- **Shave shortly before you work**, the safe-mixing guide now says: shaving that morning does not meet
  the 8- or 12-hour guidance for an evening's work, as the guide had claimed. In every language.
- CI runs on Ubuntu 24.04 (26.04's kernel stops MongoDB 8 and later), image builds and deploys on
  26.04, each named rather than `ubuntu-latest`, so a new Ubuntu (and its fonts) comes by choice.

- **The recipe page, rebuilt for entering recipes quickly:**
  - The unity formula updates as you type, beside the recipe on a computer and in a line under it
    on a phone; there is no Compute button.
  - Materials and additives are added from a library with separate tabs for your own and the
    standard ones, each a whole list with a filter; one click adds, and the cursor goes to the
    amount.
  - Each material shows its share of the batch, with the total under the list.
  - Change the scale: to percent, to the smallest whole parts (3 flint, 2 dolomite, with exact
    amounts kept for the rest), or to the grams of a batch. New amounts keep up to five decimal
    places, so small ones are not rounded away. An amount that is not a number stops it, rather
    than the proportions changing around it.
  - Each colorant or additive is given as a % of the base, in parts or in grams. When the scale
    changes, a percent stays as it is; parts and grams change with the base. Recipes saved
    before read as percent.
  - Save keeps the recipe on the page and saving again updates it; "Save and add next recipe" starts a
    new one; "Save as a copy" keeps the original; Open brings a saved recipe back to change it,
    asking first, at the top of the editor, if there are changes not saved. Why a save did not
    happen shows beside the buttons. Changes made while a save is on its way still count as not
    saved, and a save that returns after another recipe was opened is not tied to it.
  - Instructions at the top of the page, which can be hidden; the browser remembers, and a link
    brings them back.
- On a phone, visitors can sign in from the header without opening the menu.
- **Removing a saved record** (a recipe, material, additive, firing log, note or advice) works
  the same on every list. Each record has its own Remove button, which asks first, in place,
  and says what else changes. The question starts on Cancel, Escape closes it, and once the
  record is gone the focus moves to the next one. Several can be removed at once; if one cannot
  be, the question says why. This replaces a toggle at the bottom of each list that showed a
  button on every record and removed with one click. The messages name the record: Removed
  "Celadon".
- Messages are announced reliably by screen readers, and a new message about saving or removing
  replaces the last one on the same subject instead of clearing the others.
- Chemical formulas show their counts as subscripts everywhere: the oxides of each material and
  additive (P₂O₅, not P2O5), the oxides chosen for a new one, raw formulas, and error messages.
  Formulas can be typed with plain numbers (CaCO3, 2CaO•3B2O3•5H2O) and show as CaCO₃ and
  2CaO•3B₂O₃•5H₂O; coefficients and analysis amounts stay as they are.
- The formula of each of your own additives is shown in your list; it was saved but never shown.
- A test checks every standard material's raw formula against its oxides and LOI.
- Standard materials, checked against manufacturers' data sheets and ceramics references:
  - Custer Spar is Pacer's typical analysis with its iron and LOI, and is marked discontinued
    (Pacer closed in October 2023), with G-200 EU and Mahavir as substitutes.
  - "Magnesium Carbonate" is renamed for what it is, magnesite; Light Magnesium Carbonate,
    which potters usually buy (43.1% MgO, not 47.8%), is added.
  - "Calcium Borate" is renamed Colemanite (theoretical), and Colemanite (commercial) is added
    from Etimine's analysis: about 40% B₂O₃, not 50.8%.
  - Spodumene is labelled theoretical; China Clay is noted as theoretical kaolin; Cornwall
    Stone is noted as no longer quarried.
- Standard additives:
  - Zircon (zirconium silicate: Zircopax, Superpax, Ultrox and others) is added; recipes that
    say Zircopax mean it, not zirconium oxide.
  - Titanium dioxide is added as an additive as well as a material.
  - Cobalt oxide is Co₃O₄, as sold, and black iron oxide is Fe₃O₄ (magnetite). "Magnetic
    iron" was the same product and is merged into black iron oxide.
  - Notes are corrected from ceramics references and safety data sheets. The temperatures
    that came from an older book are replaced: cobalt oxide becomes CoO at 900–950 C, not
    800 C; manganese dioxide never becomes MnO in air; black copper oxide melts at about
    1326 C; copper carbonate decomposes from 290 C rather than melting; tin oxide melts at
    about 1630 C; the 932 C given for praseodymium oxide was the metal's melting point. Cobalt
    oxide is about 1.5 times as strong as cobalt carbonate, not 1.4. Hazards follow current
    classifications: praseodymium oxide is an irritant, not "very toxic"; cobalt and nickel
    compounds are carcinogens by inhalation.
- `npm run seed` removes standard records that are no longer in the data files.

### Fixed

- **The example beside "Specific gravity"** in Settings (SG 1.45) is a message, so each language
  writes it its own way (spez. Gewicht 1,45), not in English.
- **From a full review of the project** (eight reviewers by area, each finding checked and given
  a test):
  - **Your work:** the recipe page asks before you leave it with unsaved changes (a link, a
    reload, the language switch, signing out), and says what was lost when a session ends. The
    materials on hand list is no longer emptied after a failed fetch.
  - **Numbers your way:** a print batch, a material's analysis and colorant amounts are typed and
    shown the reader's way (5.000 g in German no longer prints a 5 g batch); "1e3" and "0x10" are
    no longer counted as amounts.
  - **Security:** no open redirect through `/en//`; a path with `$` or many dots can no longer
    rewrite the page or stall the server; a reset link stops working when the email changes; the
    reset limit is per hour as documented; accounts have a cap of 2000 records of each kind.
  - **Pages:** an unknown address answers 404, a trailing slash redirects, and link previews are
    in the page's language. A new page opens at its top with the focus on its heading, and a
    guide's section links can be copied and shared.
  - **Suggestions:** "would bring it a little closer" lists only materials that do, and shared
    caps (whiting and dolomite at low fire) are met exactly.
  - **Library:** common colorants (cobalt, copper, chrome, iron oxide and more) are listed in
    every region, not only the US and UK; Ireland's library follows the UK's; old materials swap
    to one sold in your region; your own material wins over a standard one of the same name.
  - **Deploys:** a failed deploy rolls back to the image that was running; a nightly backup is
    uploaded only once complete; self-hosted email settings reach the container.
  - **Text:** "by 1999" no longer shows inside translated sentences, apostrophes show once, and
    server field checks are translated.
- **Library data, checked against data sheets and safety sheets:**
  - Every material and additive now has a hazard line from its safety data sheet (47 had none),
    and 18 more sources carry their date.
  - Black cobalt oxide counts as 92.7% CoO with 6.3% lost in firing (it was 90.9% and 8.2%).
  - Potclays' low-expansion frit has 1.1% lithium oxide, not 0.1%: Potclays' own 2010 sheet
    prints 0.10, but its formula on the same sheet gives 1.06%. CTM's calcium borate frit uses
    the analysis CTM printed from 2016 on.
  - Better sources: Potclays' own 2010 frit sheet for its four frits, Carl Jäger's data sheet
    for Kaolin 233, and Hans Wolbring's formulas for Vibrantz 90368 and 90328; nine more sources
    carry their date. Potterycrafts' 2025 sheet shows its potash feldspar is now Sibelco's
    Norflux K 11, which is marked as sold in the UK.
  - Veegum T has its own magnesium-rich analysis instead of bentonite's.
  - Discontinued years for Kona F-4 (2009), Oxford Spar and lepidolite (by 1997), Godfrey Spar
    (by 1999, and a potash feldspar, not soda), CTM's calcium borate frit (by 2025), Laguna
    Borate (2012) and Boraq (by 2018).

- Corrected from data sheets:
  - Cobalt carbonate is 58% CoO.
  - Copper carbonate is 70% CuO.
  - Rutile is about 95% TiO₂ with under 1% iron.
  - Manganese dioxide ore gives about 61% MnO.
- The nickel note's unsupported "unstable above 1200 C" is gone.
- The tables of materials and additives styled the text inside each cell as a cell of its own.
- Oxford Spar's analysis had a quarter less silica per unit of flux than the published one;
  it now uses the published analysis, and is marked discontinued.
- A material with a trace oxide, such as 0.04% Fe₂O₃, no longer warns that its stored
  equivalent weight is wrong: the 4-place rounding of tiny amounts set it off.
- Rutile was entered as one FeO to each TiO₂, which is ilmenite. It is now titanium dioxide with
  some iron: 0.05 Fe₂O₃ to each TiO₂, about 9% iron oxide by weight.
- Praseodymium oxide is Pr₆O₁₁, the form sold for stains, not PrO₂.

### Removed

- `.git-blame-ignore-revs`: the reformat it named was squashed into the 0.3.0 merge.

## 0.3.0 (2026-10-05)

### Added

- **Try it now:** visitors can use the whole app as a trial with a generated name ("speckled
  quiet kilns") and no email, then keep their work by creating an account, or discard it. Trials
  are removed after 14 days ([ADR 7](docs/adr/0007-trials-as-real-accounts.md)).
- A new intro page with a live example (Leach's 4321 celadon worked out in the browser), and
  public About, Privacy and Advice pages.
- A new look: a pottery palette with a dark mode that follows the system setting, a navigation
  bar with a phone menu, page titles, a footer, a logo and icons, a web app manifest, a share
  preview image, a sitemap and `robots.txt`.
- Deleting your account from the account page.
- A logo made from a photo of a gas kiln's burners, and a link to Updraft Pottery Studio, the
  author's pottery, in the footer and on the About page.
- A README with screenshots, an architecture diagram and highlights, and a case study.
- Architecture decision records in `docs/adr/`, and this changelog.
- Structured server logs: JSON lines in production, plain text in development (`LOG_LEVEL`).
- Automated accessibility checks (axe) on every page in light and dark mode, in the browser tests.

### Changed

- Plain URL paths (`/recipe` instead of `/#/recipe`); old links, including emailed reset links,
  still work.
- Changing your email or deleting your account needs your current password.
- The standard materials, additives, advice and recipes lists are public and cached for 5 minutes.
- The server tests run against the app in-process, with one database emptied at the start, so no
  server or port is needed and test files no longer depend on each other.
- **The server is TypeScript** (ES modules) that Node 24 runs directly, with no build step;
  `npm run typecheck` checks it in CI. `server/main.ts` starts it and `server/app.ts` is the
  Express app ([ADR 8](docs/adr/0008-typescript-server-without-a-build.md)).
- One route factory serves the seven kinds of record, and every route uses async/await with errors
  handled in one place. `var` is gone from the JavaScript.
- **Sign-in moved to an httpOnly, SameSite=Strict cookie** that scripts on the page cannot read,
  with a check that refuses changes coming from other sites, and `POST /api/signout`. Responses no
  longer contain tokens; scripts send `Authorization: Bearer`, and the old `token` header is gone.
  Everyone signs in again once ([ADR 5](docs/adr/0005-sign-in-tokens.md)).
- Signing in during a trial brings the trial's work into the account.
- Each material or additive in a recipe being built sits on one line: name, amount, remove.
- Seed data moved to `data/*.ndjson`; `MONGOLAB_URI` is now `MONGODB_URI`.
- Strict TypeScript and strict template checking; the whole repository is formatted with
  Prettier, checked in CI.

### Fixed

- The page no longer jumps while loading (layout shift 0.64 to 0 on the intro page).
- Outlined delete buttons had too little contrast on tinted backgrounds.
- After a deploy, links in a tab opened earlier did nothing, because the old page code they asked
  for was gone; the page now loads afresh instead.
- The intro photo shows fired cone packs; its caption called them glaze flow tests.
- "Skip to content" reloaded the app at the start page; it now moves focus to the page.
- A sign-in that expired while the site was closed left a page full of errors; pages that need a
  session now ask the server first and go to the sign-in page.
- Requests sent at the same moment could store more than a trial's 25 records of a kind; the
  count is now taken in one database step.
- Checking the current password (changing the email or password, deleting the account) is limited
  to 10 tries in 15 minutes per account, so a stolen session cannot guess it.

### Removed

- `index.js` (it only loaded `server.js`) and the 292 KB background photo (now a 35-87 KB WebP).

## 0.2.0 (2026-10-05)

The 2017 app rebuilt and put back online.

### Added

- An Angular 22 client (standalone components, signals, no zone.js) replacing AngularJS, with
  Vitest unit tests and Playwright browser tests.
- A glaze chemistry library shared by the client and the tests, checked against values worked out
  by hand ([ADR 4](docs/adr/0004-shared-chemistry.md)).
- Password reset by email through Amazon SES: hashed, single-use links that last 30 minutes, and a
  notice when a password changes ([ADR 6](docs/adr/0006-email-through-ses-smtp.md)).
- Production on one EC2 instance with Docker Compose, nginx and Let's Encrypt, deployed from
  GitHub Actions through OIDC and SSM with no SSH, with backups, snapshots and alarms
  ([ADR 1](docs/adr/0001-one-ec2-instance.md), [ADR 2](docs/adr/0002-keyless-deploys.md),
  [ADR 3](docs/adr/0003-nginx-and-lets-encrypt.md)).
- A health check at `/api/health`, rate limits on sign-in, sign-up and reset, and a content
  security policy with subresource integrity.

### Changed

- Express 5, Mongoose 9, MongoDB 9 and Node 24.
- Sign-in tokens are pinned to HS256 and carry a version, so changing the password signs out every
  other device ([ADR 5](docs/adr/0005-sign-in-tokens.md)). Passwords are hashed without blocking
  the server.
- Every query is limited to the signed-in user's own records, and mistakes in requests get a 400
  with a message instead of a server error.

## 0.1.0 (2017-06-21)

The original app: AngularJS 1, gulp and webpack, Express 4 and MongoDB, with recipes, materials,
additives, firing logs, notes and advice.
