# Changelog

Notable changes to Glazecalc. Versions before 0.3.0 were numbered afterwards, from the history.

## Unreleased

### Added

- **A larger standard library: 109 materials and 34 additives**, from manufacturers' data sheets
  where they exist (ADR 0009).
  - **Modern replacements for every discontinued material:** G-200 EU and Mahavir for Custer,
    Oxford and G-200; Minspar 200 for Kona F-4; Alberta Slip for Albany slip; Gillespie Borate
    for Gerstley, Laguna Borate and Boraq; Wilco UPF for EPK; current Cornwall stone
    substitutes.
  - **More US materials:** Ferro (Vibrantz) and Fusion frits, nepheline syenite A270,
    wollastonite, ball clays and others.
  - **A UK set:** Grolleg, Molochite, Hyplas 71, UK feldspars, and borax, alkaline, calcium
    borate, low-expansion and lead frits.
  - **More additives:** bentonite, zircon, Veegum, Macaloid, carbonates and more.
  - **The old entries stay,** marked discontinued or historical with their substitutes, for
    comparing with old recipes.
  - **Every entry shows its source,** linked and dated, with its other names, status, maker and
    hazards.
  - **The materials and additives pages filter** by name or other name, kind and region. The
    recipe page's list matches other names, marks old entries and remembers the region.
- **Count colorants and additives in the unity formula, or not.** Calculators differ, which makes
  recipes hard to compare.
  - A checkbox under the unity formula chooses. Each additive counts at its weight in the batch.
  - The choice is saved with the recipe; new recipes start with the choice made last.
  - To make this possible, additives are now entered as materials are (fired oxides and LOI) and
    carry their chemistry.

### Changed

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

- Corrected from data sheets:
  - Cobalt oxide is 91% CoO, not 100%.
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
