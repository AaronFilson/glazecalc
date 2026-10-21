# Changelog

Notable changes to Glazecalc. Versions before 0.3.0 were numbered afterwards, from the history.

## 0.5.0 (not yet released)

### Added

- **Sri Lanka and Nepal** as regions, in English (docs/south-asia-mena-plan.md, C3): who to call (1990 Suwa
  Seriya in Sri Lanka, 102 in Nepal, with the police and fire numbers from the ITU's list, said to be last
  updated in 2012), each health ministry and body for safety at work, firing by temperature, prices in rupees.
  No poison line, silica limit, food rule or shop was found for either, and the guides say so.
- **India by state**: three state poison centres after the national one (CMC Vellore, for all India; JSS
  Mysuru, for Karnataka; Karamsad, for the Charotar region of Gujarat), and, under the note that India has no
  national silica limit, the limits Andhra Pradesh's and Rajasthan's new rules set, marked as read only in
  others' copies and not confirmed; Rajasthan's respirable-dust limit is cut off in the copy read, and the
  guide says so.
- **ChatGPT's client metadata document, behind a setting** (docs/adr/0024-authorization-server.md,
  "Amended: ChatGPT's document, private_key_jwt, shared addresses"). ChatGPT names itself by an
  address whose document asks to sign its token requests (`private_key_jwt`) and also lists `none`; it
  was refused as "only public clients". `OAUTH_CIMD_AUTH`, off by default (off, nothing changes):
  `public` takes such a document as a public app and fetches nothing from its keys; `private_key_jwt`
  also takes signed token requests from an app whose document asks for them, with its public keys
  fetched only from its own site, under limits of their own (per asking address, per site and for
  everyone; an app with a working connection outside them, its last good keys used for up to a day
  if its site cannot be reached), kept at most 15 minutes, RSA of 2048 bits
  or more or EC P-256 only; assertions RS256, PS256 or ES256, `iss` and `sub` the client_id, at most
  5 minutes long, each used once
  even by two requests at once, `aud` the issuer (or for now the token endpoint, logged). Never for an
  app that registered itself. The browser tests run it with a stand-in app (`CIMD_TEST_BASE`, taken
  only with `NODE_ENV=test`; the server will not start with it and `NODE_ENV=production`). To try on
  staging first (docs/integrations/directories.md).
- **The teaching companion, phase 2** (docs/adr/0017-mcp-server.md; MCP server 1.3.0). Two public,
  read-only tools: `vary_material` (what one material does across a range, such as whiting 0 to 20 in
  2 to 11 tiles, put on top of a base recipe or in place of another of its materials, with each tile's
  unity formula, expansion, cautions and cone fit, and a trend of what moves) and `compare_recipes`
  (two recipes side by side: chemistry, oxide-by-oxide differences, which materials are in one or both;
  the same comparison `blend_recipes` makes with two steps). Recipe answers to assistants
  (`analyze_recipe`, `check_limits`, the tiles) now say where the recipe sits on the Stull chart (`stull`:
  silica, alumina, region, crazed); the chart itself is not shown in the assistant yet. A new prompt,
  `what_does_this_material_do`, and `glaze_course_lesson` now uses the new tools and offers to save what
  was made, through the existing write tools and the Confirm changes setting. The companion guide to
  John Britt's free glaze course (English only) has exercises for the new tools, names his publisher as
  Union Square & Co. (first published by Lark Books) and links the two books' publisher pages; his videos
  are still only linked by his titles, never embedded or retold. Its count of 52 videos was last read on
  2026-10-19.
- **Dictate your studio notes** (docs/adr/0027-dictation-skill.md). An Agent Skill, `glazecalc-dictation`,
  that a potter installs in their own AI app (Claude, Claude Code, ChatGPT where skills are offered): they talk
  or type as they work, and the assistant turns it into recipes, firing logs, test tile results and notes,
  reads each one back, and saves it through Glazecalc only after a clear yes, never inventing an amount and
  never calling a change saved while it waits for approval. The skill is in `skills/glazecalc-dictation/`,
  served as a ZIP at `/downloads/glazecalc-dictation.zip` (packed at build time by `scripts/build-skills.mjs`)
  and linked from `/assistants` with how to install it (English for now; the page stays out of search). For
  assistants without skills, the MCP server has it as the prompt `dictation` and the resource
  `glazecalc://skills/glazecalc-dictation`. Three new MCP write tools, through the same permission, limits and
  confirm-changes step as the others: `create_firing_log`, `add_firing_rows` (at most 500 rows, the log kept
  as it was) and `link_firing` (a recipe's link to a firing log, with its result of at most 500 characters,
  cone and atmosphere, by the recipe routes' own code); `add_notebook_entry` takes `about`, a recipe, material
  or firing log the note is about. The firing log's columns now live in `lib/cones/firing-fields.js`, shared by
  the Firing page and the server. The skill goes in the ChatGPT directory package
  (docs/integrations/directories.md). The course prompt `glaze_course_lesson` may save with them too: a
  firing log of the test firing, a recipe's result in it, or a note `about` a recipe or firing log, each
  read back first and saved only on a yes.
- **Arabic and Hindi** (docs/translations/ar.md, hi.md): the app, the emails and all five guides, live at
  `/ar/…` (right to left) and `/hi/…`. Arabic is Modern Standard Arabic for the Arab countries, its terms chosen from Arabic
  ceramics sources (Egyptian, Iraqi, Sudanese and Libyan university papers, suppliers, Oman's GHS guide), with all six
  plural forms and impersonal instructions; Hindi uses आप, the potters' loanwords with the formal term in brackets, and
  the Latin full stop (the owner's choice). Each was translated, reviewed in six groups, made consistent across its files
  and back-translated blind (the safety guides and every warning); a native potter's check of the terms marked in the
  style sheets is still welcome. The README counts 34 languages.
- **Groundwork for India's regional languages** (wave I1: Tamil, Marathi, Kannada; none is offered yet). `ta`, `mr` and
  `kn` are known to the language list, the pickers' groups, India's region and the first render's country; their fonts
  (Nirmala UI, Noto, Sangam MN: none served) and line heights are in `client/styles.scss`, with the Odia and Sinhala
  entries ready for the later waves; the Linux test image keeps the Tamil and Kannada Noto fonts. Two pseudo-locales,
  `/ta-XF/` (Tamil) and `/kn-XG/` (Kannada), made from one table of letters per script like `/hi-XE/`, are laid out at
  phone width in the browser tests. The i18n check reads each Indian language's script, requires Unicode form NFC and no
  stray ZWJ or ZWNJ, keeps their 12-hour times (रात 8 बजे) from passing as numbers, and asks for an `=1` form where a
  language's `one` takes 0 as well as 1 (it found four Hindi and six French messages, now fixed). Style-sheet skeletons
  for the glossary research: docs/translations/ta.md, mr.md, kn.md; wave.js has their entries.
- **Target & Solve** (docs/adr/0026-target-and-solve.md). A new page, Solve for a target (`/solve`,
  linked from the recipe page and from Match with what I have): type a unity formula or an oxide
  analysis, or paste one from another app, and get a recipe in percent from the materials you have
  on hand (or any you choose), with how near each oxide comes (close, off or far, and the whole
  close, fair or poor), what each material does, the cautions the recipe page gives, the limits
  panel and the hazards. "Open as a new recipe" puts it on the recipe page, not saved yet. It runs
  on the same engine as Match with what I have (`solveTarget` in `lib/recipe/solve.js`). The MCP
  server has it as `solve_target`, a public tool: the materials by name, or `onHand` for a caller
  that may read the shelf. English only.
- **A public page for each standard material, a list of them, and a cone chart** (docs/seo-plan.md,
  item 17), the pages potters search for. `/materials/<name>` (for example
  `/materials/ferro-frit-3134`) says what the library says of one of its 170 standard materials and
  nothing more: its kind, formula, other names, maker, where it is sold, similar materials (linked where
  they have a page), notes, source and status; its oxide analysis and the unity contribution Glazecalc works
  out from it (the same code the recipe page uses), with its equivalent weight, fired weight and loss on
  ignition; and its hazards as the record gives them, with links to the two safety guides, and a link to the
  recipe calculator. `/materials` lists them by kind. `/cones` shows Orton's cones 022 to 15 (the older
  chart Glazecalc checks by, with its heating rate and source), Orton's own current figures by cone kind
  and heating rate, and the SK cones to 20 with their nominal JIS temperatures, in °C and °F, the reader's
  cones and scale first; the firing guide, the guides list and the safety guides link to them. The addresses are
  apart from the signed-in `/material` page of your own materials. Each is prerendered, in the sitemap, with
  its own title, description, canonical address and structured data (a web page with its trail), is
  readable with JavaScript off, and has no sideways scroll at 320 px. English only for now: they are in
  `ENGLISH_ONLY_PAGES`, so other languages' addresses show the English with a notice and are not indexed, only
  the English is in the sitemap, and the build renders them in English alone. Their words are in
  `client/public/i18n/reference/en.json`, for a later translation wave.
- **Higher cones, for porcelain** (docs/adr/0021-recipe-firing.md, amended
  2026-10-20). Orton cones have a temperature to cone 15 (1431 °C, Orton's older chart for large
  cones at 150 °C an hour, the only Orton figure above 14 we found); cones 16 to 42 are taken
  everywhere and shown with no figure, as Orton publishes none. The picker adds cone 21 and the
  half cones 13½, 14½ and 15½. Orton's own current figures (self-supporting cones at 15, 60 and
  150 °C an hour, large cones at 60 and 150, cone 022 to 14, from its 2016 chart and site) are
  kept beside them, with their source and the date read. A new limits band, "Very high fire,
  cone 12 and up" (1320 °C and hotter, SK 14 up): the published limits stop at cone 10, so no
  set's figures are checked there and the panel says why; the other checks still run. The band
  can be chosen by hand. The firing guide's cone chart goes to cone 14 and says what Orton
  publishes past it. English only.
- **A Digits setting, and digits that follow each country** (docs/i18n-plan.md, Digits; groundwork for
  the Indian subcontinent and the Arabic-speaking countries). Settings offers digits as usual where you
  are (the default), Western digits 0–9, or the language's own digits where it has them, each with a
  sample number. As usual follows CLDR for each country: Arabic-Indic for Arabic in Egypt, Iraq, Jordan
  and the Gulf but the UAE; 0–9 in the UAE and the Maghreb, and for Hindi, Tamil, Sinhala and Urdu in
  Pakistan; Bengali's own in Bangladesh; Devanagari for Marathi and Nepali. The format locale always
  names its digits and calendar (`ar-EG-u-ca-gregory-nu-arab`), so no browser's own data decides
  them and the prerendered page and the browser agree. The number and date formats add those of India
  (Hindi, English), Pakistan (Urdu, English), Bangladesh (Bengali), Egypt, the UAE, Morocco, Algeria,
  Iraq and Jordan (Arabic), Morocco and Algeria (French), Sri Lanka (Sinhala, Tamil) and Nepal (Nepali). Typed
  numbers may now use Indian digit groups (1,00,000 and 12,34,567.5), the Arabic percent sign (٪) and a
  percent sign before or after (5 %, %5), and may carry the marks `Intl` writes to keep a number's
  direction in Arabic text. The translations check reads all of these and asks translations to write
  0–9. Arabic pages will be written for Egypt, Hindi and Tamil for India, Urdu for Pakistan and Bengali
  for Bangladesh once those are regions; nothing a live language shows changes. Kept with the account
  (or trial) like the other settings. English only for now.
- **Groundwork for Arabic and Hindi** (not offered yet): Hindi joins Arabic as a known language (its pages exist,
  unindexed), both with the standard notice, and the translation prompts know them: Modern Standard Arabic for every
  Arab country, right to left, with six plural forms, and Hindi with आप and the potters' loanwords. Arabic's style
  sheet and glossary (331 rows) are in `docs/translations/ar.md`, from an Egyptian supplier, an Iraqi glaze paper,
  Algeria's Arabic Journal officiel and the Microsoft Arabic style guide, with the rows for a native potter marked.
- **Ready for Arabic, Urdu, Hindi and Bengali** (docs/i18n-plan.md, "Right to left, as built"; no new
  language is offered yet). Two pseudo-locales test it on every page: `/ar-XD/` writes each
  message in Arabic letters, right to left, with all six of Arabic's plural forms and Arabic-Indic
  digits, so the browser's own bidirectional rules run as they will for Arabic; `/hi-XE/` writes
  them in Devanagari, stacked and marked above and below. On a right-to-left page, values with
  Latin units read left to right as a whole ("1240 °C", not "C° 1240"), names of recipes,
  materials, notes and apps are kept apart from the text around them, arrows point the way the
  text reads, emails, codes, links and numbers are typed left to right, and a guide's web
  addresses and formulas stay left to right. Bootstrap's sides are mirrored for the parts the app
  uses (1.7 kB of stylesheet), the Stull chart stays left to right, and the blends grid mirrors
  with its corners named where they are drawn. Fonts: the system's own for Arabic (Segoe UI, Noto
  Naskh Arabic, Geeza Pro), Hindi and Bengali (Nirmala UI, Kohinoor, Noto Sans), in taller lines,
  never spaced out or slanted; Urdu's Nastaliq is served with the app (Noto Nastaliq Urdu, OFL, cut
  to Urdu's letters, 193 kB) and fetched by Urdu pages only. Emails in a right-to-left language
  start each line with a right-to-left mark. The Linux browser tests' image adds four of Noto's
  fonts (Naskh Arabic, Sans Arabic, Sans Devanagari, Sans Bengali). English only.

- **Confirm before changes** (docs/adr/0025-confirm-before-changes.md). On Connected apps, an
  account can choose that changes from assistants, apps and access tokens wait for its approval:
  never (the default), only removals, or every change. It holds back an assistant that misbehaves
  or was led astray by what it read; a token's holder is trusted as the person chose. A waiting
  change has its own page, `/confirm/<id>`, the only place it is approved: signed in, on the
  website. The page shows each field the change sets as it is now and would be (long text cut
  short, with "Show all"); for a removal, what the record was called before this app changed it
  and how long ago; an app that registered itself marked "self-described"; every other change
  waiting from the same app, with "Approve all" and "Decline all" covering exactly those shown;
  and, once decided, what came of it. No token can approve one, and it is made once, after the
  token, its permission and the record are checked again. An assistant whose client supports URL
  elicitation (MCP 2026-07-28) is asked to open the page; any other, including one that offers
  only a form of its own, is told to ask the person to approve it at the link, and a retry never
  makes the change itself. A script on the REST routes gets `202` with the change's id and link,
  and asks `GET /api/pending-changes/:id` for what came of it. Every route a token can change
  records through asks, the recipe's firing links included (taking one off is a removal); a test
  checks every such route and every write tool. At most 5 changes wait from one token or app and
  20 per account; asking counts against the limits on changes; revoking a token or app ends its
  waiting changes; a confirmed removal counts once against its token's removals. A personal token
  can be made with "Changes from this token need no confirmation". Asking less sends the owner an
  email; a change waits 30 minutes at most, and what it would do is removed once it is decided.
  `get_my_settings` shows the choice. English only.
- **The consent page for AI apps, and a notice for each connection** (docs/adr/0024-authorization-server.md).
  An app such as Claude or ChatGPT that asks to connect sends the person to `/connect/<id>`, after
  signing in if needed (the sign-in page now takes `?next=`, this site's pages only). It shows the
  app's name, marked "self-described" when the app registered itself; its checked address; where
  the answer goes, with a warning when that is the person's own computer, an app's own link scheme
  (shown whole: `evilapp://claude.ai/cb` is not claude.ai), or another host than the app's; what
  it can read; and "Also let it change my records", never ticked for the person. Trials and
  unconfirmed emails are told why they cannot connect. Each new connection emails the account,
  naming the app, its host and whether it can change records, with a link to Connected apps,
  which now marks self-described apps. The `/assistants` page explains the two ways to connect.
  The consent API reports a redirect's host for http and https only. English only for now.
- **The shelf over REST, with one Undo.** A token that can change records may add or remove one
  material at a time (`POST /api/shelf/add` and `/remove`, by `key` or `name`) and put back the
  shelf as it was before the last change (`POST /api/shelf/undo`, one step); `GET /api/shelf`
  takes a token that can read the shelf. The website's own changes, and an assistant's
  `add_to_shelf` and `remove_from_shelf`, keep the earlier list for that Undo too; a new MCP tool,
  `undo_shelf_change`, puts it back. A token's shelf changes are written to the activity log, and
  the earlier list goes with the account's export and deletion. The website has no Undo button
  for it yet. English only.
- **Blend tiles for assistants and a chemistry table on the Blends page.** A new public MCP tool,
  `blend_recipes`, works out the tiles of a line blend between two recipes (2 to 11 steps) or a
  triaxial blend between three (2 to 6 rows): each tile's shares, its recipe in percent, its key
  unity formula figures, silica to alumina, expansion, the names of its limit cautions and, with a
  firing, its cone fit. With two recipes and two steps it compares them oxide by oxide. It says it
  is a calculation, not a test result. On the Blends page, a closed "Chemistry per tile" table
  shows silica to alumina, boron, expansion, the number of cautions and, when a recipe has a
  firing, the cone fit. The comparison of two unity formulas moved to `lib/recipe/compare.js`, so
  the app and the server share it. English only for now.
- **An OAuth authorization server for AI assistants** (docs/adr/0024-authorization-server.md), the
  server side: apps such as Claude and ChatGPT will connect to a person's records by asking on the
  website, once the consent page ships. oidc-provider 9.12.2 under `/oauth/`, with its metadata at
  `/.well-known/oauth-authorization-server`; the code flow with PKCE (S256) only, refresh tokens
  that rotate (a second use ends the connection), `iss` in every answer, and tokens for the MCP
  endpoint alone, opaque and for an hour. Apps name themselves by an https address (CIMD, fetched
  only from the public internet, under limits) or register themselves (limited, and gone after 7
  days unused). A connection reads; it may change records only when the app asks and the person
  ticks it, and an app that may only read is asked to step up (403 `insufficient_scope`). Each
  connection is a row beside the access tokens: read-only ones last 60 days from their last use,
  ones that change records 90 days; revoking one, a password reset or "Sign out everywhere" stops
  all its tokens at once. The consent API is `/api/connect/:uid`; the page, the notice email and the
  privacy notice follow.
- **Connected apps** (`/account/apps`, docs/integrations-plan.md items 3 and 27): one page lists
  the account's access tokens and OAuth connections with what each may do (read only, or read and
  change), when it was made and last used, when it stops working, and how many records it made,
  changed, moved to the Trash, put back or undid in the last 90 days. A row opens out to show its
  recent activity (50 lines a page) and the Trash entries it moved, each with Put back, and Put all
  back, which skips any record whose place is already taken. Revoke and Revoke all ask for a
  confirming click; Revoke uses the same revoking as the account page. Making a token stays on the
  account page, whose list of tokens moved here and left a link. `GET /api/connections`,
  `GET /api/connections/:id/activity`, `GET /api/connections/:id/trash`,
  `POST /api/connections/:id/restore-all`, `DELETE /api/connections/:id` and `DELETE
/api/connections`: the web session only, every query the account's own. A Trash entry now
  records which token moved it (`tokenId`, from the REST routes and the `move_to_trash` tool);
  older entries are matched through the activity log. The privacy notice says the activity also
  shows on Connected apps. English only for now.
- **A companion to John Britt's free glaze course** (/guides/learn-with-john-britt): a sixth
  guide, in English only, with one section for each of 12 units of his free online Glaze Course on
  YouTube. Each unit links his videos by the titles he gave them (never copied, retold or
  embedded), credits him, his site and his two glaze books, says Glazecalc is not connected with
  him, and adds the Glazecalc guide sections to read and one to three exercises on the recipe page,
  Blends, the specific gravity calculator, firing logs and the MCP tools; the lab units send the
  reader to the safe mixing guide first. Every language shows the English with the "not
  translated" notice; search engines get the English address only (canonical, noindex on the other
  languages' copies, no hreflang, the English alone in the sitemap), and the translation checks
  expect no copies (`ENGLISH_ONLY_PAGES` in lib/pages.js). The MCP prompt `glaze_course_lesson`
  (unit completed from the units' names; recipe, cone and language optional) reads the units from
  the same guide (server/mcp/course.ts) and attaches the unit and its guide sections.
  `node scripts/live-check.mjs --videos` checks by hand that the videos are still on YouTube.
- **Chemistry against the stated cone** (docs/adr/0022-chemistry-against-the-stated-cone.md): one
  line at the top of the recipe page's limits panel says whether the glaze's chemistry fits its
  firing, the recipe's stated cone or the band chosen in the panel. It gives a note only when boron
  (against Matt Katz's rule, _Ceramics Monthly_ 2012) and silica or alumina (against Hesselberth &
  Roy's cone 6 and 10 figures, or the UK limits at low fire) agree that the glaze looks like
  another firing, whatever limit set is chosen; a range across bands is told which end it looks
  closer to; cone 6 against cone 10 is worded softest, since chemistry tells them apart only
  roughly. It says when it can't judge (lead, lithium, much soda and potash or zinc, raku, salt,
  soda, wood and pit firings, ash, cones 01 to 3, SK cones with no measured temperature), never
  calls a glaze a pass, and every note shows its sources and says it is a guide, not a test. Also
  `coneFit` in the MCP tools `get_recipe` and `check_limits` (with a firing); not on print or
  shared pages. Katz's rule now starts from his own 1305 °C for cone 10 (was 1300 °C), so the "too
  little boron" check and replacing lead ask for 0.01 more boron. English only for now.
- **Sign in with Microsoft** (docs/adr/0023-microsoft-sign-in.md), beside Google and GitHub, for
  personal and work or school accounts, with Microsoft's own button. Accounts are found by the
  Microsoft tenant and the account's id, never by email: Microsoft's email is not taken on trust,
  so a new account made with it confirms its address with the emailed link, as after signing up,
  and an email another Glazecalc account has is refused, to be linked from the account page once
  signed in. Confirming a change on an account without a password asks Microsoft for the password
  again. Off until its settings exist (deploy/README.md); the privacy notice names Microsoft. The
  provider messages and texts that now name Microsoft show in English until the next translation
  round.
- **Access tokens that can change records.** On the account page a token can now be made to
  "Read only" or to "Read and change" (still confirmed with the password and, with two-step
  sign-in on, a second step); one that can change records lasts at most 90 days, and the notice
  email and the token list say what each can do. With it, scripts can create, change, undo and
  move to the Trash every kind of record through the same routes as the website, and AI
  assistants get eight MCP tools: `create_recipe` (Glazecalc works out the unity formula),
  `update_recipe`, `add_notebook_entry`, `add_my_material`, `update_my_material`, `add_to_shelf`,
  `remove_from_shelf` and `move_to_trash` (the Trash only, never deleted). A read-only token is
  refused by them and changes nothing. Every change keeps the record as it was, so it can be
  undone, and is written to the activity log. Safeguards: changes with tokens are limited to 60 a
  minute and 5,000 a day per account (apart from reads), each token still moves at most 100
  records an hour to the Trash, and an account keeps at most 20,000 earlier versions (the oldest
  go first, never the one from before a token's changes). The "Use Glazecalc from your AI
  assistant" page says how to use such a token safely. English only for now.

- **Terms of use** at `/terms`, linked from every page's footer: Glazecalc is free for your own
  glazes, records and learning, as a hobby, for teaching or in business; the code stays under the
  MIT License, and the terms are for the site. They ask users not to break the shared server
  (no attacks, floods, scraping, getting round limits, spare accounts or unwanted email), welcome
  scripts and AI assistants with an access token, say the site may refuse requests or close an
  account that puts it at risk, and that it is provided as is. English only for now; the next
  translation round brings the other languages.

- **A recipe states its firing** (docs/adr/0021-recipe-firing.md): under the notes, the cone as you give it in Orton, SK
  or a temperature (stored as entered, never converted), or a claimed range with a tick for each cone you have actually
  fired it to (the tested cone shows first); Orton 022 to 13, half cones and 14 to 42; atmosphere (oxidation, reduction,
  neutral) and process (wood, soda, salt, raku, pit); for a temperature, the rate over the last hour and the hold; a
  schedule note and a witness cone. Conversions into your own scale are shown beside it, marked approximate, using
  Kyoto's measured SK bends only (SK 8 and 10 as temperatures; other SK cones show no temperature, never the JIS
  figures); SK and Orton are matched by Kyoto's same-kiln table (see Changed). The limits panel takes its band from the firing and shows both
  bands side by side for a range across them (cone 6–10); the band picker still overrides. A **food surface** flag brings
  a note that food safety depends on firing to the tested cone (test a range at its low end). **Firing logs** link to
  recipes both ways, each with a result note, and can fill in the tested cones. **Duplicate for another cone**, cone and
  atmosphere filters on the saved recipes, the firing on the mix ticket, print and shared page (the author's scale first),
  paste-in reading "Cone 6 ox", "^6", "SK8" (SK 6a's chart number), "1240°C", "6½", "cone 4,5" (cones 4 and 5) or
  "ox/red" (a firing line never splits a recipe, and a title such as "Red" or "Salt" is not read as a firing), Glazy's
  Cone and Atmospheres in the recipes CSV (Orton cones marked Δ, so a spreadsheet keeps "06"), and the firing in the MCP
  tools (`get_recipe`; `list_recipes` by cone, across scales by measured equivalents, and by atmosphere). Firing log
  links change one at a time, so two open pages never undo each other's; a log in the Trash is hidden and comes back
  with it. A shared recipe shows the firing's schedule note only with the notes. Existing recipes show the firing as
  not stated.
- **Results by cone** on the recipe page (docs/adr/0021-recipe-firing.md): a card for each cone and atmosphere a glaze
  was fired at (cone 6 oxidation and cone 6 reduction are two cards), with the cone's approximate temperature, its
  limits band and how many limit cautions the glaze has there, your summary of how it came out, and the firing logs
  fired there with their result notes. A linked log is placed at its cone and atmosphere when it names just one within
  the stated firing (its Atmosphere column read for "ox", "reduction", "red" or "neutral"); otherwise you place it from
  its card. A summary outside a firing stated later is kept and marked outside. The summaries are printed, shown on a
  shared page only with the notes (never the logs), carried by versions, Undo, the Trash and the export, given by the
  MCP `get_recipe` (`coneResults`, and each firing's `cone` and `atmosphere`), and left behind by Save as copy and
  Duplicate for another cone.
- **Analysis, limits and a Stull chart on the recipe page**, under the recipe, as you type: each
  oxide's moles, mole % and fired weight %, the loss on ignition and the calculated thermal
  expansion (an estimate, with the coefficients named); the unity formula against a limit set,
  Hesselberth & Roy's stable glaze limits by default (cone 6 and cone 10, their "Recommended Stable
  Glaze 'Limits'" table of September 2000, linked to their book on Google Books) or Glazecalc's own, chosen there and kept with your settings, shown as
  guidelines rather than pass or fail and not applied at low fire; and Stull's chart (1912) of
  silica against alumina with the glaze's point, Stull's regions and the set's ranges, described
  in words too. A recipe keeps the firing it is for. The recipe help explains them.
- **Recipe numbers, after review.** Choosing the firing "not chosen" on a saved recipe is now kept;
  the limits table and the swap checks agree at a limit (a maximum is reached at its figure, and a
  thin glaze uses the thin boron figure); the SG calculator's sentences follow a language switch and
  are announced to a screen reader once typing pauses; a glaze with less alumina than Stull's lowest
  region is "unclassified", not bright; the note for oxides a set has no range for is short (Glazecalc's
  own set says what it checks, Hesselberth & Roy's names oxides present in a meaningful amount); a
  lead replacement for a cone sets the recipe's firing when it has none; and a limit set that cannot
  be saved goes back to the one before, in the table and in the note under the suggestions.
- **Specific gravity and water** on the recipe page, by Brongniart's formula: what a bucket of
  glaze holds, the water to add (or pour off) to reach the SG you want, and the water for a new
  batch, with densities as SG, Baumé or pint weight as Settings say, volumes in litres or US or
  imperial gallons, and weights in kilograms or pounds and ounces.
- **A target SG kept with the recipe.** The SG calculator can save the SG you want as the recipe's
  `sgTarget` (1 to 2.5, kept, versioned and exported with the recipe, and cleared with one click),
  for the mix ticket to read.
- **Credits.** The Stull chart's regions are credited on the About page and in
  `THIRD-PARTY-NOTICES.md`, with Derek Au's MIT notice as the licence asks.
- **Cost per batch.** The recipe page gives a price box for each material and additive (per kg, or
  per lb with weights in pounds) and shows what a batch of the size entered costs, and the cost per
  kg or lb of dry glaze. A material with no price is named, never guessed. Prices are kept with the
  account, in one currency chosen in Settings (the region's until then; never converted), private
  to it: they are in Download my data, go when the account is deleted, and join the account from a
  trial in the same currency. Shared code in `lib/recipe/cost.js`.
- **Hazards and a safety line** on the recipe page and on the print: each hazard statement the
  recipe's materials and additives carry (the standard library's, from suppliers' safety data
  sheets, as listed in the library), once, with the materials it is for; those with none named; and
  links to the safety guides.
- **A mix ticket** in the batch-list print: a batch number (typed, or a line to write it on), the
  date, the recipe's target SG with a line for the reading when the recipe has one, and lines for
  who weighed and mixed it and who checked it, with the hazards.
- **Batch cost on the print**, optionally: a "Show the batch cost" tick on the print page, off each time, so a
  mix ticket handed to someone shows no prices unless chosen. It gives the cost of the batch size
  printed and the cost per kg or lb, names materials with no price, and fetches no prices unless
  ticked.
- **Paste in recipes** (`/import`, linked from the recipe page). Paste recipes copied from a website
  (Glazy, Digitalfire), a spreadsheet (tab, semicolon or comma columns, CSV quotes) or notes: each
  line is read as a material and its amount, before or after the name, in percent, parts, grams,
  kilograms, pounds or ounces, with decimal commas as the reader's settings write them. Colorants
  marked "+" or under a heading such as "Additions" (in many languages) are additions; titles,
  firing notes, totals and column headings are told apart; several recipes in one paste are split
  at their titles or a line of dashes. Each line shows the material it was taken for (by name,
  another name, or a best guess to check), or asks for a choice where several are close or none is
  found; any line can take another material or amount, or be left out. Nothing is saved until
  Save, and a trial's or an account's limit stops the saving where the server says so. The reading
  and matching are pure functions in `lib/recipe/paste.js`.
  A generic word ("Kaolin", "Ball clay", "Feldspar", "Frit", "Zircopax" and other makers' names for
  zircon) is never matched to one product: the library's products of that kind are offered as a
  choice, most common first, from the table in `lib/recipe/generic-names.js`. A name or alias the
  library has exactly (such as "Silica" or "Whiting") still wins.
- **Home cards for Paste in recipes and Blends for test tiles**, beside the other sections.
- **Blends for test tiles** (`/blends`, from the recipe page and each saved recipe's More). A line
  blend between two saved recipes, a biaxial blend between four or a triaxial blend between three,
  up to 21 tiles in a line, 8 by 8 or 11 rows: the tiles drawn as they are laid out and numbered,
  a list of what to weigh for each tile for a chosen test batch, to print, and the tiles chosen
  saved as recipes in percent. The tiles and their recipes come from `lib/recipe/blends.js`.
- **Share a recipe by link** ([ADR 0020](docs/adr/0020-share-links.md)). Share, under a saved
  recipe's More, makes a read-only link that anyone can open without an account: the recipe as it
  is now, its unity formula and the working, in the viewer's language. The link is 256 random bits
  after `#` (so no log or Referer holds it), shown once and stored only as a hash; a new link
  replaces it, Stop sharing ends it, and moving the recipe to the Trash ends it too. It never shows
  the owner's email or account, ids, material notes or prices, and the recipe's notes only when
  the owner ticks them. Shared pages are never indexed and are rate-limited. Trials cannot share.
  The privacy page, the data download and account deletion include share links.
  The account page lists every recipe the account shares (a link to the recipe, since when, whether
  its notes show) with Stop sharing for each; it never shows a link again. Links do not expire.
  The privacy page's line on print choices now names the worksheet too.
  A password reset and Sign out everywhere stop every share link of the account (the reset's
  notice email says so); a password change keeps them. Restoring a recipe from the Trash never
  shares it again, and a link made as its recipe is trashed is taken back. An additive that
  borrows a chemistry no longer sends the names of the owner's own materials. A shared recipe's
  429 replies carry the no-index headers too.
- **Show the working:** how the unity (Seger) formula comes from a recipe, step by step (grams,
  each material's oxides and their moles, the totals, the fluxes added up, each oxide divided by
  them), with the recipe's own numbers and the same answer as the recipe page. From the unity
  formula's panel, as a third kind of print (a worksheet), and on a shared recipe.
- **Sign in with Google or GitHub** ([ADR 0015](docs/adr/0015-provider-sign-in.md), integrations
  plan Phase 1), on the sign-in and sign-up pages, wherever the owner has set a provider up (off
  until then). An account is found by the provider's own id for the person, never by email. A new
  account is made only from an email the provider has verified, with no password until one is set
  through "Forgot password". When an account already has that email, nothing is joined until the
  person signs in to it once, the usual way, and then only if its own email is confirmed, so an
  account made in someone else's name can never take over their Google or GitHub. Two-step
  sign-in still asks for its second step after the provider. The account page lists Google and
  GitHub, and links or unlinks each after the password (and a second step when it is on), with a
  notice email; the last way into an account is never removed. Linking or unlinking signs the account
  out on its other devices, and keeps this one signed in. A password reset by email unlinks every
  provider (someone who got in may have linked their own), and its notice says they can be linked
  again from the account page; changing the password while signed in keeps them. An account made with a provider, which has no password,
  confirms changing its email, deleting itself, two-step sign-in and linking or unlinking by
  signing in again with one of its providers (Google is asked to sign the person in again, and
  its answer must say it did; GitHub offers no way to ask): that sign-in counts only for the same account, in the
  same sign-in session on the same browser, for one change within 5 minutes, and a second step still follows when
  two-step sign-in is on. Nothing but the provider's id is
  kept: no name, picture or provider token. A trial on the browser comes along into the account.
  The export lists the linked providers, and the privacy notice and the record of processing say
  what is kept. The provider's one-time code and state stay out of nginx's access log and the
  app's error log (`enable-https.sh` is run again for the nginx part, deploy/README.md). New English text only, for the next translation wave.
- **Access tokens** ([integrations plan](docs/integrations-plan.md), Phase 3): the account page's
  new "Access tokens" section makes a token for your own AI assistant or script, which can read
  your recipes, materials, notebook and firing logs but change nothing. Making one asks for the
  password, and the second step when two-step sign-in is on, and only once the account's email is
  confirmed (the section asks for that first, and sends the link again); the token is shown once, to copy.
  Each stops working after 7, 30, 90 or 365 days (30 unless chosen), up to 10 at once, and can be
  revoked one by one or all together. An email says when one is made and, 7 days ahead, when one
  is about to stop working. After a password change the page lists the tokens still working,
  with "Revoke all". Trials cannot make tokens. In English for now.
- **Glazecalc's tools for AI assistants** ([ADR 0017](docs/adr/0017-mcp-server.md)): `POST /mcp`
  serves the Model Context Protocol, for Claude Code, VS Code, Cursor, Gemini CLI and others. With
  no account: search the library, a material's data, a recipe's unity formula, the limit checks,
  substitutes for old materials, a recipe remade from given materials, and cones and
  temperatures, with cautions in the language asked for. With an access token: your own recipes,
  materials, shelf, notebook, firing logs and settings, and Match with what I have on your shelf.
  `search_guides` finds what the guides say, in the language asked for (English where it has
  nothing), with addresses to cite; the guides, materials and cone charts are also resources, and
  four ready-made prompts diagnose a glaze fault, make a recipe lead-free, replace discontinued
  materials or explain a recipe. Limited to 60 requests a minute and 2,000 a day per address (120
  and 5,000 per account with a token) and 10 substitutions or matches a minute; the privacy page
  says so. CI checks the endpoint with the official MCP conformance suite and the MCP Inspector
  (`npm run test:mcp`), and `server.json` lists it in the MCP Registry as
  `com.glazecalcapp/glazecalc` once the owner publishes it. A new page, "Use Glazecalc from your AI assistant" (`/assistants`, English
  for now), shows how to add it.
- **The Trash and Undo.** Removing a recipe, material, note or other record moves it to the Trash,
  where it waits 30 days; the removal notice has Undo, and the Trash page puts records back, deletes
  them for good or empties the Trash. Each saved change keeps the version before it (the last 20,
  for 90 days), and the recipe page's "Saved" notice offers Undo.
- **Foundations for access tokens** ([integrations plan](docs/integrations-plan.md), Phase 0):
  one table for personal tokens and OAuth grants (hashed, always expiring), a shared check,
  `data:read` and `data:write` scopes with default deny (only the record routes take a token), an
  activity log of what tokens do (90 days, titles only), and revocation of every token by a
  password reset or "Sign out everywhere".
- **A full Content-Security-Policy from nginx** (`default-src 'self'`), on top of the app's
  header and the build's `<meta>` policy; the e2e check loads every page under all three.
- **Groundwork for Indonesian, Vietnamese and Thai** (not offered yet): the three are known languages (their pages exist, unindexed), with style sheets and glossaries in `docs/translations`, prompts for their translation, and Thai dates in the Gregorian calendar until a Calendar setting exists. The landing page's small heading no longer spaces out Thai letters.
- **Two-step sign-in**, optional, on the account page ([ADR 0014](docs/adr/0014-two-step-sign-in.md),
  [plan](docs/mfa-plan.md)). An authenticator app (a QR code or a key to type), passkeys (named,
  renamed and removed, up to ten) and ten recovery codes, shown once. Signing in then takes the
  password and a second step; a passkey alone signs in too, from its button or the email field's
  suggestions. Every change asks for the password and, once two-step sign-in is on, a second step,
  and signs out other devices. It needs a confirmed email, and trials don't have it. Emails tell
  the account when a step is added or removed, when a recovery code is used, when new codes are
  made and when two-step sign-in turns off. Someone who has lost every step and code can ask the
  owner to turn it off after seven days ([data requests](docs/data-requests.md)); signing in or
  confirming a change with any step cancels such a request. Authenticator keys are encrypted with
  a key of their own (`MFA_KEY`), and recovery codes are kept only as keyed hashes.
- **Ready for a staging copy:** `SITE_URL`, `SITE_LABEL`, `NOINDEX` and `MAIL_ALLOWLIST` set,
  from the environment alone, the address passkeys belong to, a "Staging" label, no indexing and
  mail to the owner only.
- **A staging copy on the production instance**, deployed by hand for testing a branch in real
  browsers: `scripts/build-staging.sh` builds any commit on the owner's PC for arm64 and pushes it
  (or uploads it to S3); `deploy/staging.sh` runs it at staging.glazecalcapp.com on port 3001 in
  its own Compose project, with its own MongoDB database and user, secrets and mail allowlist, and
  can stop it, empty its database and report on it; `enable-https.sh --with-staging` adds the name
  to the certificate and nginx. The owner's one-time steps are in deploy/README.md, "Staging".
- **Fewer steps by hand for a release.** A **Deploy staging** workflow puts any pushed branch or
  commit on staging: it builds the arm64 image on GitHub's own arm64 runners and runs `staging.sh`
  through SSM with a role that may run only that, after the owner approves. `staging.sh` takes its
  own files and staging's nginx site from the commit it deploys, and `deploy.sh` backs up MongoDB
  before each production deploy, installs nginx's files from the deployed commit
  (`deploy/install-nginx.sh`, checked with `nginx -t` and put back if rejected), and goes back to
  the previous version if the app logs that it could not build its indexes. After each deploy the
  **Live checks** workflow checks the site from outside: the health check and security headers,
  every language's home page, the public pages in a browser with no Content-Security-Policy
  violation, and the MCP endpoint (`npm run test:live`). **Deploy** now starts by itself once a
  master commit's image is published, and waits for the owner's approval. One script,
  `deploy/aws/setup-github-deploy.sh`, makes or updates the AWS roles and command documents both
  workflows use, and the first production deploy brings staging's scripts up to date.
- **More room for assistants with an access token:** the tools for AI assistants (MCP) allow an
  account using a token 300 requests a minute and 20,000 a day (from 120 and 5,000); without a
  token it stays 60 and 2,000 per address.
- **Pages that search engines and link previews can read.** The public pages (home, guides,
  advice, about, privacy, sign-up) are drawn to plain HTML when the app is built, in every
  language, so the text is there before any script runs; the app then takes the page over in
  place. Each page has its own title and description in every language, the home page and the guides carry structured data, and link
  previews name the page's language and the others offered ([ADR 16](docs/adr/0016-prerendered-public-pages.md),
  [plan](docs/seo-plan.md)).
- **In Turkish.** Türkiye is a region (112, UZEM, silica limit, food-contact limits, shops), and
  Glazecalc is fully translated into Turkish, the password emails included.
- **In Traditional Chinese, Korean and Simplified Chinese** (繁體中文, 한국어, 简体中文), at their own
  addresses (`/zh-Hant/recipe`, `/ko/recipe`, `/zh-Hans/recipe`), made the same way: a style sheet and
  glossary for each (Traditional Chinese as Taiwan writes it, never converted from Simplified),
  reviewed, made consistent and the safety text checked by translating it back. That found Korean
  advice softer than the English ("it is best" where the English says should or never) and a word
  for overfiring that can read as underfiring, both fixed. That makes 29 languages. Every account
  email is in all three.
- **In Thai, Vietnamese and Indonesian** (ภาษาไทย, Tiếng Việt, Bahasa Indonesia), at their own
  addresses (`/th/recipe`, `/vi/recipe`, `/id/recipe`), made the same way, every account email
  included, and the regions of Thailand, Vietnam and Indonesia in their own language. Translating
  the safety text back found the everyday Vietnamese word for a dust mask where the English means a
  rated respirator, fixed (khẩu trang lọc bụi đạt chuẩn), as was the same slip in Chinese. Thai
  pages were checked at phone width for clipped tone marks and labels that cannot wrap; none were
  found. That makes 32 languages. Visitors from all three countries see the sign-up page's notice
  on where accounts are kept.
- **Where your account is kept, and your choice.** The sign-up page tells everyone outside the US
  (and anyone whose region is not known) that Glazecalc is a free, open-source project, that
  accounts are kept on servers in the United States, that the guides and a trial need no account,
  that anyone can run their own copy, and that whether to make an account here is their own
  decision, for which the project accepts no responsibility. A new section of the privacy page says
  the same at more length, for everyone. In every language.
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
- **In Estonian, Latvian and Lithuanian**, the third wave, made the same way. The reviews' lessons went into the prompts as
  the wave ran: "may not melt fully" is not "may not melt at all", a rule a translation of the recipe
  checks had broken.
- **In Irish and Maltese**, the fourth wave, made the same way. AI translates them less well than
  most languages, so their notice says so plainly, points to the English, and a line of it stays at
  the top of every page once closed. The numbers check now takes each language's decimal mark from
  CLDR, as both write 1.5 as English does. The back-translations found a cell both had misread ("a
  barium frit or strontium"); checked in every live language, the Portuguese now reads plainly too.
- **In Japanese** (日本語), the first language outside the EU, at its own addresses (`/ja/recipe`),
  made the same way: a style sheet and glossary from suppliers' catalogues (ゼーゲル式, SK cones named
  as SK), the 24-hour clock, reviewed, made consistent and the safety text checked by translating it
  back, which found eight slips in meaning, fixed. That makes 25 languages. The SK firing guide
  section, Japan's poison lines, silica limit and food-contact rules, and the password emails are
  in Japanese too.
- **Every language caught up.** All 25 translations now have everything added since they were
  made: the text on where accounts are kept (sign-up and privacy pages), each page's own title and
  search description (written from research into what potters search for in each language, each
  under 160 characters), and the text for Japan and Türkiye (the SK firing section, their poison
  lines, silica limits and food-contact rules). Reviewed the same way as the waves: the safety text
  and the SK section translated back into English blind and compared, plurals checked, poison lines
  named as their own countries name them, and the Seger formula never confused with SK cones. The
  English was made plainer where translators misread it (the SK guide cone, Kyoto cones, plurals,
  the JSOH line). Every language has 0 messages and 0 guide sections still in English.
- **SK cones (JIS R 8101)** as a third way to fire, in Settings beside Orton cones and temperature,
  and in the firing guide: setting large cones, guide, firing and guard cones, Kyoto cones, and the
  SK 022 to SK 20 chart with each figure marked nominal (JIS), its source and the date checked. SK and
  Orton numbers are never turned into each other. The new guide section is translated into every
  language.
- **Japan as a region** (in Japanese or English). It fires by SK cones and reads glaze density in
  degrees Baumé until you choose otherwise, and lists the US materials until Japan's own are added.
  The guides give, each from an official page with its date:
  - **Who to call:** 119, and the Japan Poison Information Center's two public lines (Osaka and
    Tsukuba, 24 hours, free), which take only acute poisoning that has happened, not long-term
    exposure; and #8000 for medical advice about a child.
  - **Silica:** the control concentration (管理濃度) as the law gives it, 3.0 / (1.19Q + 1) mg/m³ for
    a work area's air by its free silica content Q, 0.025 mg/m³ for dust that is all free silica,
    the Japan Society for Occupational Health's recommended 0.03 mg/m³ beside it, and the dust mask
    classes sold there (DS2 or RS2; DS3 or RS3).
  - **Lead and cadmium** in the law's own units: µg/cm² for flat ware, three sizes and cooking ware
    in µg/mL, each a most.
  - **Three shops** selling raw glaze materials, by their own names.
- **Türkiye as a region** (in English for now). It fires by temperature and reads glaze density as
  specific gravity until you choose otherwise (Orton cones and Baumé are a setting away), and lists
  the EU's materials. The guides give, each from an official page with its date:
  - **Who to call:** 112 for every emergency service, and the National Poison Information Centre
    (UZEM) on 114, 24 hours, every day.
  - **Silica:** the binding limit as the dust regulation gives it, 10 / (Q + 2) mg/m³ by the dust's
    silica content Q: 0.098 mg/m³ for dust that is all quartz, half that for cristobalite and
    tridymite. Türkiye has not adopted the EU's limit. FFP2 or FFP3 dust masks.
  - **Lead and cadmium:** the Tebliğ's limits, the EU directive's figures, with its rule for three
    samples.
  - **Three shops** selling raw glaze materials, by their own names.
- **South Korea, Taiwan, Singapore and Malaysia as regions** (in Korean, Traditional Chinese or
  English; Singapore and Malaysia stay in English). Each fires by temperature until you choose otherwise and lists the US
  materials. The guides give, each from an official page with its source and date, and leave out
  what could not be checked:
  - **Who to call:** Korea 119, which also gives medical advice (no national public poison line was
    found); Taiwan 119 and the Taipei Veterans General Hospital's poison centre (24 hours, free);
    Singapore 995 (no public poison line on an official page, so the health ministry is linked);
    Malaysia 999 and the National Poison Centre, with its hours.
  - **Silica:** Korea's exposure standard (0.05 mg/m³, indicative), Taiwan's new limit of 0.1 mg/m³
    with the day it applies from (1 January 2027), and Singapore's and Malaysia's binding limits
    (0.1 for quartz, 0.05 for cristobalite); dust mask classes for Korea (1급, 특급), Taiwan (D2, D3)
    and Malaysia (N95).
  - **Lead and cadmium** in each law's units: Korea's five kinds of piece, Taiwan's in ppm (said as
    mg/L), Singapore's lead only, and Malaysia's 2026 limits with four pieces judged.
  - **Shops** by their own names: two in Korea, one in Taiwan, two in Singapore; none was found in
    Malaysia, and the page says so.
- **China, Hong Kong, Indonesia, Thailand and the Philippines as regions** (in English; Hong Kong
  also reads Traditional Chinese, and the Philippines stays in English). Each fires by temperature
  until you choose otherwise and lists the US materials. The guides give, each from an official page
  with its source and date, and leave out what could not be checked:
  - **Who to call:** China 120 (with 119 and 110); Hong Kong 999, with the Department of Health
    linked (its poison centre answers professionals only); Indonesia 119, with the health ministry
    linked; Thailand 1669 and the Ramathibodi Poison Center on 1367, 24 hours; the Philippines 911
    and the National Poison Management and Control Center, 24 hours and free.
  - **Silica:** China's binding limits by the dust's free silica content (0.7, 0.3 and 0.2 mg/m³),
    Hong Kong's guide values (0.1 for quartz, 0.05 for cristobalite), and Indonesia's and Thailand's
    binding 0.025 mg/m³. The Philippines' limit could not be read, and the page says so.
  - **Lead and cadmium:** Indonesia's 2026 limits, with the third of three tests held to them, and
    Thailand's, all in mg/L. China's could not be read, and Hong Kong has none of its own found.
  - **Shops:** none was found in any of the five, and the page says so.
- **A Calendar setting.** Dates are shown in the Gregorian calendar by default everywhere, Thai pages
  too; Settings offers the Thai Buddhist era (2569) and Japanese eras (令和8年) for readers who want
  them, each with a sample date. Every date the app shows follows it (firing logs, recipe dates,
  prints, shared recipes, the account's and the trash's dates); numbers do not change, dates are still
  typed in the browser's Gregorian date fields and saved as they were, and emails stay Gregorian. Kept
  with the account (or trial) like the other settings.
- **Three Japanese materials** in the standard library: Amakusa pottery stone (天草陶石), Fukushima
  feldspar (福島長石) and Kamado feldspar (釜戸長石), each a typical analysis from one supplier in
  Arita (佐賀県陶磁器原料) to check against your own supplier's, and each with what makes it differ:
  Amakusa stone's grades by iron, Fukushima feldspar's grades and a research institute's sample, and
  that Kamado feldspar is an aplite with much free quartz, not to be swapped for a feldspar weight for
  weight. They are listed as sold in Japan (the library's regions gain JP), so the local-equivalents
  guide offers their closest match elsewhere. Mikumo feldspar (Digitalfire's analysis only) and
  natural ashes (no analysis found) are not added.
- **Vietnam as a region** (in English until Vietnamese is translated), firing by temperature until
  you choose otherwise, with the US materials, prices in dong, and numbers and dates as vi-VN.
  - **Who to call:** 115 for an ambulance, with 113 (police) and 114 (fire). Official government
    pages list the three numbers but not what each is for, so the roles follow Circular 22/2014 as
    secondary pages quote it, and the page says so plainly; a plan to merge them into 113, from 2027
    at the earliest, may change them. No public poison line could be
    confirmed (Bạch Mai's Poison Control Centre gives no hours or callers for its number).
  - **Silica:** QCVN 02:2019/BYT's binding 0.1 mg/m³ for free silica in respirable dust (0.3 in all
    the dust), and **lead and cadmium** under QCVN 12-4:2015/BYT, six kinds of ceramic piece; both
    read in a legal database's copy of the regulation, as the government's own pages could not be
    read, and the page says that too.
  - **Shops:** none was found, and the page says so.
- **India, Pakistan, Bangladesh, Egypt, the United Arab Emirates, Morocco and Algeria as regions**
  (docs/south-asia-mena-plan.md), in English until their languages are translated; French pages
  show Morocco's and Algeria's too. India fires by Orton cones, the others by temperature, until you
  choose otherwise; all list the US materials, read °C and specific gravity, and price in their own
  money (rupees, taka, pounds, dirhams, dinars). Arabic pages, not offered yet, are written for Egypt.
  The guides give, each from an official page with its source and date, and leave out what could not
  be checked:
  - **Who to call:** India 112, and the National Poisons Information Centre at AIIMS (1800 116 117,
    toll free, 24 hours, or its Delhi number); Pakistan Rescue 1122, run by each province, with 15 for
    the police in Punjab; Bangladesh 999, with the health directorate's 24-hour call centre (16263) as
    medical advice, not a poison line; Egypt 123 for an ambulance (with 122 and 180); the UAE 998 (with
    999 and 997); Morocco 141, and its poison centre, CAPM, day and night, at the price of a local call,
    on 0801 000 180 or 05 37 68 64 64, both linked; Algeria 14 for civil protection. Where no public
    poison line could be confirmed, the health ministry is linked, except the UAE's and Algeria's, whose
    sites could not be read. Abu Dhabi's poison service is not shown.
  - **Silica:** no limit is shown for any of them. For India the page says each state sets its own
    under the 2020 OSH Code, and links DGOSH; India's dust masks are FFP2 and FFP3 (IS 9473).
    Bangladesh links its factories inspectorate.
  - **Lead and cadmium:** Algeria's order of 16 January 2019, the EU directive's limits, with its rule
    for a piece up to 50% over. India's IS 9806 is a voluntary standard, so it is not shown.
  - **Shops:** two in India and two in Abu Dhabi; none was found in the others, and the page says so.
  - A poison line's other number can now have its own link (Morocco's), kept on one line and read
    left to right in any language. English only.
- **Groundwork for East and Southeast Asia**, before any of its languages:
  - **Numbers and dates** can be written as in Japan, Korea, mainland China and Taiwan (Simplified and
    Traditional Chinese each keep their script in any region), Hong Kong, Singapore, Malaysia,
    Thailand, Vietnam, Indonesia, Turkey and the Philippines.
  - **Amounts** typed in full-width digits (１２．５), or with the ideographic full stop (12。5), read
    as 12.5, and a box waits for a Japanese, Chinese or Korean input method to finish before saving.
  - **Lists of materials** sort as the page's language sorts, and their filters find full-width
    letters (ＦＲＩＴ finds Frit).
  - **A language's address in other capitals** (`/DE/guides`) goes to its own (`/de/guides`), and each
    page sends its language in a `Content-Language` header and its `og:locale` for link previews.
- **The firing guide's cone end point** is a 90° bend, the 5 o'clock position, as Orton's chart says (it
  said 6 o'clock, a cone touching the shelf), and its worked heating rate divides the temperature climbed. In every
  language.
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
  - **Ready for Japanese, Chinese, Korean and Thai** (none offered yet): each page in them names
    the device's own serif for its script, so a browser need not fall back to a thin one; emphasis
    is bold, not a slanted copy of the letters; and lines break as the language breaks them. A
    Japanese pseudo-locale (`/ja-XC/`) tests every page in characters with no spaces, at a phone's
    width, and Linux tests install the CJK and Thai fonts to draw it. CI checks that Korean
    translations are in Hangul, and that the app loads nothing from Google, a CDN or a captcha, so
    it stays reachable from China.

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
- **Your data, in your hands** ([plan](docs/eu-data-plan.md)). On the account page:
  - **Download my data:** everything in your account as one JSON file, or your recipes and your own
    materials as spreadsheet-ready CSV files. Trials can download too.
  - **Change your email:** a link goes to the new address, and the change happens only when it is
    opened; the old address is told. Every device is signed out afterwards.
  - **Sign out everywhere,** in one step, on every device.
  - **Confirm your email:** a new account gets a link to confirm its address, so no one can tie
    someone else's address to an account.
- **Keep me signed in on this device**, an unticked box when you sign in or sign up. Without it you
  are signed out when the browser closes; with it, after 7 days, as before. Trials keep their 14 days.
- **Deleting your account sends a confirmation,** saying backup copies are gone within 30 days. If a
  backup is ever restored, accounts deleted since it was made are deleted again before the site goes
  back online.
- **Real addresses for people to write to:** privacy@, security@, abuse@, postmaster@, hello@ and
  contact@glazecalcapp.com reach the owner (the setup is in `deploy/aws/`). `security.txt` and
  `SECURITY.md` say where to report a security problem.

### Changed

- **"Choose your country or region"**: the guides' region list and the prompts under it ask for a country or region
  (the owner's choice), as Hong Kong and Taiwan are among the places listed. In every language, in the words its
  region list already uses ("countries and regions"). So does the making-a-glaze guide's line on shops ("choose
  another country or region"), in every language, and the MCP server's guide text, in English, says what the
  website shows "in your country or region".
- **The reference pages link the home safety guide by its title, "Don't poison your family"** (English; the
  reference pages are not translated yet), where they said "Glaze safety at home".
- **Limits that suit AI apps' shared addresses** (ADR 24, the same amendment). Claude's and ChatGPT's
  servers send everyone's requests from a few addresses, so limits are now keyed on what a request has
  proven. The token endpoint counts per address only what it refuses (300 in 15 minutes), per account
  its refreshes (100 in 15 minutes, a `429` that leaves the refresh token working; codes are not
  counted, so none is lost to it, and a copied refresh token still ends its connection), and
  everyone's refusals together (20,000 in 15 minutes); it counted every request per address (300).
  Past a count on refusals, a request whose code or refresh token the server holds still goes
  through, so a flood of junk from many addresses cannot stop a working connection. An IPv6 address
  counts with its whole /48 (was /56) at the token endpoint, for MCP without a token, for apps
  registering themselves and for app documents and keys fetched, so one cheap /48 counts once.
  Subscription streams are 3 per account (were 3 per address, signed in or not). The MCP tools without
  a token keep their limits per address, with ceilings for everyone without a token together: 3,000
  requests and 200 substitutions or matches a minute. Registering (DCR) is otherwise unchanged.
- **The Origin check on `/mcp` is tested to the letter**: `null`, a slash at the end, other letter
  cases, a lookalike host, the port written out and two Origin headers are refused before any limit
  counts, as before; a refusal is logged at debug level with the Origin, for the real-client test.
- **Enter in a recipe amount goes back to the list to add from.** With an amount typed, Enter in a
  material's amount moves the focus to the materials list's filter, ready for the next one (an
  additive's amount to the additives' list). Before, Enter did nothing there, and it still sends no
  form. A missing or unreadable amount keeps the focus, marked, and its problem is said to screen
  readers.
- **The recipe's safety note puts the condition on the home-safety guide only**: "See Safe mixing
  and ventilation. If children or pets are about, see Don't poison your family too." Every live
  language says the same (the translations whose sentence could be read as covering both links are
  rewritten, Arabic and Hindi among them; the others keep their words), and the fingerprints follow
  the new English.
- **Hong Kong is not called a country.** The guides' region messages (shops, the silica limit,
  food-contact rules, poison lines, materials sold nearby) and their labels said "this country" or
  "the country {region}" in many languages; they now put the place after a colon or say "here", as
  the English does, in Czech, Slovak, Slovenian, Polish, Estonian, Irish, Latvian, Turkish, Finnish,
  Italian, French, Croatian, Greek, Hungarian, Lithuanian, Maltese, German, Spanish, Portuguese,
  Dutch and Bulgarian, and Japanese, Korean and Chinese say "country or region". The style sheets
  that told translators to call {region} a country say otherwise now. Also: Slovenian "Velja od
  {date}" follows its own date rule ("Začetek veljavnosti: {date}"), and two Korean safe-mixing
  lines read "should" as "should" again, not "must".
- **Assistants ask you to sign in when they need your records** (docs/adr/0024, "Amended: sign-in
  when a tool needs it"). Without a token, the MCP endpoint now lists the tools that read and change
  your own records too, with the same titles and hints; calling one answers HTTP 401 with the
  challenge that sends the app to Glazecalc's sign-in and consent page (`data:read`, and
  `data:write` too for a tool that changes records, still unticked on the page). Claude starts
  sign-in only on such a 401, so before this a Claude custom connector never offered to connect.
  The public tools still need nothing. Server instructions say so. The directory submissions are
  prepared in `docs/integrations/directories.md`.
- **A match says how near it comes, and keeps raw clay where its own check wants it**
  (docs/adr/0012, "Amended: how near a match comes"). In a staging test an assistant asked to
  replace Gerstley Borate read `match_from_materials`' score (a miss of 20.5) as a wide miss and
  built a recipe by hand whose alumina came out 26% low; the tool's match was within 2% on alumina
  and silica, and nearer on every oxide. Its score was the only measure it gave, and its 27% raw
  clay drew its own "will probably crack" caution. Now a match's report has its closeness: each
  oxide of the new unity formula against the old, as close, off or far, and a verdict (close, fair
  or poor). The MCP tools that fit amounts (`match_from_materials`, `match_with_what_i_have`,
  `suggest_substitutes`) answer it with each oxide's old and new value, difference and percent and a
  sentence, and now also the caps that cost match (`capped`), which `allowMore` lifts. Match with
  what I have and Suggest amounts hold raw clay to 20% of the batch (or the recipe's own share)
  where that costs the match little, a calcined kaolin on hand taking up the rest, and keep at
  least 10% (or what the recipe had) of the recipe's raw clay, so calcined kaolin does not take all
  of it; where only raw clay can bring the alumina back, the chemistry comes first and the caution
  says to swap part of it for calcined kaolin. On the website, Allow more lifts the hold. When
  nothing offered supplies one of the recipe's fluxes (lithia with no lithium on hand), the other
  fluxes make up its share, so silica comes out about 5% high rather than 26%. The clay caution no
  longer repeats what the old recipe already had. Underneath, the fit takes caps on a share of the
  batch, and an amount tried back at its start can no longer break a cap. English only.

- **The Orton chart says what it is.** Glazecalc's Orton figures from cone 06 up were labelled
  "large cones at 60 °C an hour" but are the large-cone column at 150 °C an hour of Orton's older
  chart (as determined at the US National Bureau of Standards, reprinted by W P Dawson and
  FireRight), the same chart Katz's cone 10 at 1305 °C comes from. The figures are unchanged, so
  no band, check or note changes; the label says so, and cones 022 to 07 now take the same
  column (600 to 984 °C). English only.
- **The cone check does not judge past cone 10** (docs/adr/0022, amended 2026-10-20). Katz's rule
  and Hesselberth & Roy's figures stop at cone 10, so a firing hotter than that (Orton 10½ up,
  SK 13 up, above 1305 °C, or the new top band) gets "can't compare" rather than being held to
  cone 10's figures. A range from within the figures to past them (cone 9–11) still gets a
  "looks cooler" note, judged at its cool end.
- **MCP: every cone, read as the recipe page reads it.** `check_limits`, `get_recipe` and
  `blend_recipes` take Orton cones 022 to 42 and SK cones SK 022 to 20 (before: Orton 06 to 6
  only, so "Cone 10 is not in Glazecalc's Orton chart"), and temperatures to 1600 °C. A cone is
  checked in its band, not by a converted temperature (SK 8 is mid fire, as on the page, not
  high fire by its JIS 1250 °C); from cone 12 up the answer has `limitsNote`.
  `convert_cone_temperature` gives Orton's current figures by heating rate beside Glazecalc's,
  says when a cone has no figure, and no longer claims SK cones to 42; `glazecalc://cones` has
  both Orton charts. `create_recipe` and `update_recipe` take the band `top`.
- **A searchable, grouped list for the language and the region, and grouped language lists** (for
  45 languages and more, and the right-to-left ones to come). In Settings, the language and the
  region are chosen from a combobox (the WAI-ARIA pattern, no new library) instead of a plain
  `select`: type to narrow it, by a language's own name or its English name (`german`, `deu` or
  `deutsch` finds Deutsch; `turkce` finds Türkçe; `日本` finds 日本語), arrow keys, Page Up and Page Down, Enter
  to choose, Escape to close and put the choice back; the number of matches and "No language
  matches" are said to a screen reader and shown. Each language is named in itself with its English
  name beside it, and the current one is marked (a check mark, and `aria-selected`). Languages are
  grouped by the part of the world they are mostly spoken in (English first, then East Asia, Europe,
  Middle East and North Africa, South Asia, Southeast Asia); regions by continent, named in the
  page's language with the English name beside it, which the search finds too. The guides' "Shops
  in", "Rules in" and similar region lists are the same list. The footer's folded language list and
  the about page's full list are grouped under the same headings and laid out in columns that fit
  the window (two at 320 px). Names are set in `<bdi>` and the styles use logical properties, so
  Arabic and Urdu will mirror correctly. A group is a line in `lib/regions/groups.js`, which a
  server test requires for every language and region. What is saved is unchanged (the language's
  code, the region's code). English only: the headings and "No language matches" are translated
  with the next wave.
- **Asia's region data, checked again** (2026-10-19, English only; docs/asia-plan.md, Phase C).
  Every value keeps its source, check date and status, and no unconfirmed safety value is shown.
  - **China:** China CDC's national poison hotline, 010-83132345, from China CDC's own page, which
    tells the public to call it; no official page gives its hours or cost, and the page says so.
    Lead and cadmium under GB 4806.4—2016, read in the issued standard on a Guangdong regulator's
    site: six kinds of piece, each "at most", in force since 2017-04-19, cooking ware tested hot
    (3.0 / 0.30 mg/L, not the 0.5 / 0.05 an earlier note gave from memory). Dust masks KN95 and
    KN100 (GB 2626-2019), read secondhand.
  - **Hong Kong:** the food-contact block now says there is no law with figures for ceramic ware
    (the Centre for Food Safety, 2009; Cap. 132 and Cap. 456), with no table. One shop, Hearty
    Ceramic (Tai Kok Tsui).
  - **Taiwan:** the silica limit in force until 31 December 2026, 10 / (Q + 2) mg/m³ for respirable
    dust with 10% or more crystalline silica, read in the law site's own table, is shown above the
    2027 limit, each under its dates, until 2027.
  - **Indonesia:** BPOM 11/2026 in force since 2026-06-30, with a year more for ware already on the
    market.
  - **Thailand:** two shops, Pottery Clay Thailand and Cerawan.
  - **The Philippines:** the OSH Standards' binding silica formula, 10 / (Q + 2) mg/m³ for quartz and
    half for cristobalite and tridymite, read in an archived copy of the Department of Labor and
    Employment's own file, which the page says. Two shops in Quezon City, Tahanan Pottery and
    Odangputik Pottery (clay and ready-made glazes).
  - **Vietnam:** 113, 114 and 115 are read with their roles on official pages, so the caution that
    they were not is gone (the `reported` status with it); calls are free, and while the numbers
    merge into 113 (planned for 2027–2028) all three work. QCVN 12-4:2015/BYT read in the Official
    Gazette, so verified; its note no longer says its test method is required. Dust masks FFP2 and
    FFP3 (TCVN 13409:2021, the same as EN 149), read secondhand.
  - **Japan:** #8000 is answered by nurses or doctors, and the prefectures' pages read say the
    advice is free and the call is paid by the caller. The food note gives the 2025 revision's dates
    and the transition to 2030, and that the 2008 limits did not change. The firing guide adds how
    JIS R 2204, a laboratory standard for refractories, sets SK cones (marked face at 80°, foot about
    4 mm deep), said to be a test, not a rule for pots.
  - **Türkiye:** UZEM (114) is free, around the clock, for the public and health workers, from
    official government pages.
  - **South Korea:** no change; there is still no national public poison line.
- **The privacy notice says what connecting an AI app means** (a new section, "Connecting an AI
  app", with the ADR 0024 notices): what is kept for each connected app (its name and address as
  it gives them, where it sends you back, what it may do, its dates, its codes and tokens only as
  hashes, what it did), that Glazecalc's server fetches an app's details from the app's own
  address and keeps them 1 to 24 hours in memory, how long each part lasts (60 days from the last
  renewal for an app that reads, 90 days from the yes for one that may change records, 7 or 30
  days for an app that registered itself), how to end a connection, and that the app answers for
  what it does with your records under its own privacy policy. It also names the shelf's list
  before its last change, kept for one Undo. The terms of use add that connecting an app is your
  choice and that you answer for what an app you allow does in your account. The record of
  processing (docs/processing-record.md) has a new activity, Connected AI apps, and names AI apps
  as separate controllers, with no new processor. English only for now.
- **MCP `check_limits` follows the account's own limit set.** Called with a personal access token
  that may read preferences and no `limitSet`, it checks against the limit set saved in the
  account's settings (the recipe page's own, Hesselberth & Roy's until changed), as `get_recipe`
  does; with no token, or a `limitSet` given, nothing changes ("glazecalc" is still the default
  without an account). Its description says so.
- **SK and Orton cones are matched by Kyoto's same-kiln table** (docs/adr/0021-recipe-firing.md, amended): the
  conversion beside a recipe's cone, and an assistant's search across the two scales, now use the Kyoto municipal
  institute's own Orton column, bent in the same kiln at the same rate as its SK cones, instead of Orton's chart at a
  different heating rate. Orton 4 is now SK 7 (was SK 8) and Orton 6 is SK 9 (was SK 10); SK 7, 9, 11, 13 and 14 and
  Orton 8, 11 and 12 now have a match. The firing guide's Kyoto cones paragraph says so (English; the other
  languages follow with the next translation round).
- **Guides end with "More guides"**, links to the other guides with their summaries, drawn into the prerendered page so
  search engines follow them. The home safety guide is called by its own title, "Don't poison your family", in the
  guides list, the "More guides" block and its page title too (the owner's choice, in every language: each language's
  own title for the guide).

- **The recipe page's firing, less repeated and shorter on a phone.** When the firing block has a
  cone, the limits panel says "From the recipe's firing: Mid fire" as text, with "Choose another"
  to bring back the picker (now labelled "Limits for"); the cone check line is unchanged. The firing
  block and linked firings fold under a "Firing: cone 6, oxidation" summary ("Firing: not set"
  when empty): open when empty and on wide screens, closed on a phone once a firing is set.
- **A new firing log starts with Time, Temperature (°F or °C as you read temperatures) and Cone**,
  each removable; logs already saved are unchanged. The duplicate "Add a field above" line is gone.
- The settings labels for how you fire read "Orton cones", "SK cones, JIS R 8101" and "Temperature,
  as a kiln controller's program". English only for now.
- **One limit on what an account keeps.** An account keeps up to 100,000 records of every kind
  together (recipes, materials, notes, firing logs and the rest), in place of 2,000 of each kind;
  `ACCOUNT_MAX_RECORDS` still sets another. Trials keep their own limits.

- **One email after a password reset.** A reset stops the account's access tokens and connected
  apps, unlinks Google and GitHub, and stops its share links, all in the same step, and its notice
  lists what it stopped, a line for each (with how many tokens, and which providers to link again);
  a reset that stopped nothing sends the changed-password email, in the account's language, as
  before. Sign out everywhere stops the tokens and the share links too.
- **Easier to find your way**, from a review of the app's usability (2026-10-16):
  - **The menu says "Account"** (or "Trial account"), with a round initial and the email in small
    text under it, and turns the palette's color when hovered or on the account page, like the other
    links. On a phone it comes first after the pages, beside Sign out, and the initial shows beside
    Menu too; a long email shortens with an ellipsis, and between a phone and a wide screen
    "Account" stands alone. Home has an "Account and settings" card.
  - **A new account is welcomed on Home**, once, with "Start your first recipe", and asked to open
    the emailed link until it has.
  - **The account page lists its sections at the top**, each a link to its heading, so the
    password, two-step sign-in and deleting are a tap away; and its buttons are plain, the filled
    one kept for the main action of a step under way.
  - **The footer's 28 languages are one line**, "Language: English", that opens the list.
  - **On a phone**, every button and menu link is a finger's height (44px), and text in fields is
    16px, so iPhones no longer zoom into a field.
  - **Two-step sign-in** shows On or Off beside its heading, says "9 of 10 recovery codes left",
    names its two buttons that remove the app apart, and asks for the code in a box the code's size.
  - **Sign-up** no longer shows the password hint under the problem that says the same.
  - **While a sign-in waits for its second step**, the menu no longer offers to sign in again.
  - **The recipe page starts with your saved recipes**, newest first, each with its date, a count
    and a filter once there are more than five (the first eight, then "Show all"). A recipe's name
    opens it; "Show details" shows it, and Print, Compare and Remove (last, in the danger color) are
    under "More". Home's Recipes card opens at them.
  - **The recipe page's help is one line**, "How the recipe calculator works", unless the account
    has no recipes yet; opened or hidden, it stays so on every device, kept with the account's
    settings. The privacy page lists it with the other settings.
  - **Materials and Additives start with your own**, saying so when there are none yet, then
    the form to add one, laid out like the recipe and account forms (labels above the fields, in
    sentence case, without colons), then the standard list: four columns (name, weights,
    analysis), each record's notes, formula, substitutes, source and hazards under "Details", and
    the first 25 until "Show all" or a filter.
  - **Firing logs and Notes look like the rest of the app**: each field's label above it, in
    sentence case and without colons; a saved firing is headed by its title ("Fired in Car kiln on
    …"); and each says what to do while it is empty ("None yet", "Add a field above, then add
    rows", and "Add a field first" beside the row button until there is one).
  - **The editor's heading is the recipe's title** ("New recipe" until it has one), and its button
    says "Start a new recipe".

- **The session cookie is `__Host-glazecalc_session` in production, and the older
  `glazecalc_session` is no longer read there**, so a cookie set for the whole domain by a
  subdomain or a network faking one cannot sign a browser into someone else's account. Everyone
  signed in signs in once more after this release; the older cookie is cleared, as the site set
  it and as set for the site's domain, whenever a session is set or ended.
- **The Docker image's dependency and client build stages run on the build machine's own platform**
  (`--platform=$BUILDPLATFORM`), so a cross build for arm64 needs no emulation for the Angular
  build. CI builds each platform natively, so its images are the same as before.
- **Lora, served with the app**, for every heading and paragraph, with Noto Serif for what Lora lacks
  (Greek, and the subscripts of formulas such as SiO₂). A page now lays out the same on every device
  instead of in each one's own font, and the browser tests measure what people see.
- **The browser tests run in Playwright's own image**, in CI and in `npm run test:e2e:linux` alike, so
  a layout that passes locally passes in CI.
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
- **Your settings are stored in your browser only when you change them there,** not copied at every
  sign-in. Signing out takes the account's copies off the device, and deleting the account removes
  them all.
- **Stricter security headers:** pages load nothing from other sites, and signed-in answers from the
  server are never cached.
- **Logs are kept for a limited time:** the web server's for 14 days, the system's for 14 days, the
  containers' by size. A failed email logs only its error code, and the database no longer logs
  queries.
- **The database requires a password,** even on the server's own network.
- The unused `settings` field is gone from accounts.
- Dependency updates: Angular 22.2, Playwright 1.64, Mongoose 9.11, nodemailer 10 and others; the
  Node types stay with Node 24, the version the app runs on.

### Fixed

- **Hindi and French messages written for exactly one stay so**: their `one` plural form takes 0 as well as 1, so
  the six messages whose English means a single thing ("your passkey", "your access token", "it") now give that text
  for 1 only (`=1`), and a count of 0 reads as the plural. A server test keeps every such message so in each language
  whose `one` takes 0.
- **Vanadium oxide's H361fd reads as the GHS words it stands for**: "suspected of damaging fertility or the unborn
  child", where the library said only "fertility and unborn child". Every language has its official wording: the
  CLP's Annex III (H361) in the EU's languages (Estonian and Latvian keep H361fd's own two sentences, as their style
  sheets ask), JIS Z 7253 in Japanese, Oman's 2024 GHS guide in Arabic, and the forms the national GHS texts and safety
  data sheets use in the others.
- **The tests' fake sign-in provider (`OAUTH_TEST_BASE`) is taken only with `NODE_ENV=test`.** It
  was taken whenever `NODE_ENV` was not `production`, so a stray setting on a server started another
  way would have sent sign-in, and the ID tokens' keys, to another address. The server now will not
  start with it set and `NODE_ENV=production`, and logs a warning when it is on.
- **An access token that does not work is answered 401, even past its address's limit.** Past 30 in
  15 minutes from one address the answer was `429`, which tells an app to wait, so an assistant
  behind a shared address (Claude's, ChatGPT's) could not refresh or sign in again. It is now `401`
  with the same `WWW-Authenticate` challenge (`/mcp`) or RFC 6750's (`/api`), the words saying to wait.
- **Two ways round the consent page for AI apps closed** (docs/adr/0024-authorization-server.md, "An
  outside report"). An app may no longer send its answer to this site's own addresses, where the page
  would have named glazecalcapp.com as the place the answer goes. And Allow takes a click only once the
  page has been in front for a second, so a click meant for something else (the second half of a
  double-click on another site that brings the page forward) cannot land on it.
- **Sign-in keeps the page you were going to.** "Create a free account" and "Sign in" on the sign-in and
  sign-up pages carry `?next=` (this site's pages only) so an AI app's consent page is not lost; and a
  session that has gone stale sends you to sign-in with the page you were on, which you come back to.
- **A sign-up keeps that page through the menu and the confirmation email.** The menu's "Sign in"
  and "Create a free account" links carry the sign-in or sign-up page's `?next=` as well. A sign-up
  sends it to the server, which puts it in the confirmation email's link after the token
  (`/confirm-email#token=…&next=…`), without its language, and only when it is one of the app's
  pages (checked as for a provider sign-in, `nextPage` in server/lib/pages.ts); the page checks it
  again (`sameSitePath`). Once the address is confirmed, the page goes there: at once when signed
  in, through the sign-in page otherwise. So an AI app's consent page, which needs a confirmed
  email, is not lost on the way. A trial kept as an account, and a provider sign-up whose email
  still needs confirming, do the same; the link sent again from the account page has none.
- **Romanian emails write their counts as Romanian does:** "30 de zile" and "24 de ore", but "7
  zile" and "1 zi". The mailer gives those emails the number and its noun together, chosen by
  Romanian's plural forms; the texts had "{days} zile" and "{hours} ore", wrong from 20 on, and
  "{days} de zile", wrong below 20.
- **English made plain where round 5's translators found it unclear** (each is translated again in
  the next wave): the privacy notice says access tokens and connections are kept until they expire
  and then for 30 days more, not "up to" 30; Taiwan's emergency note says plainly what 112 does
  when a mobile phone has no signal; the firing guide's kiln-watch line says to stay nearby and
  check the kiln while it fires, and to fire only when an adult will be home and awake through the
  whole firing, as the home-safety guide does; the recipe page's dust line says you must keep the
  dust out of your lungs; the safe-mixing guide quotes the University of Utah on lead in the kiln
  as its page now reads ("vaporizes at a relatively low temperature"; fired to stoneware
  temperatures, "the lead will vaporize"), instead of "lower temperatures" lower than nothing
  named; and Vietnam's silica note says how a measurement is compared with its limit.
- **Indonesian says "catatan" for a record throughout:** the older server messages, the privacy
  notice's Trash line and the Empty Trash question still said "item".

- **The OAuth authorization server, after its security review** (docs/adr/0024, "Review fixes"):
  addresses under `/oauth/` answer only as written (`/oauth/REGISTER` or `/oauth/register/` no
  longer slip past the registration limits); fetches of apps' documents (CIMD) are limited per
  address and per host as well as for everyone, and an app someone has connected keeps working
  from a copy of its document kept with the connection, whatever else is fetched; refused
  registrations no longer count towards everyone's day; the guard blocks IPv4-compatible and SIIT
  IPv6 addresses; and the consent API hands the authorization server the site's own host and scheme.
- **A test of the sign-in notice email no longer fails now and then under load.** The app sends
  such a notice after its reply, so a busy machine could be slow to write it; the mail helper for
  tests now waits for sends in progress (`mailer.idle`) and for up to 10 s, and the test timeout is
  15 s. Test-only; the app sends the same mail.
- **nginx's logs are rotated and deleted after 14 days, as the privacy notice says.** Debian's cloud
  image has no logrotate, and the instance was set up without it, so nothing was ever rotated:
  `setup-instance.sh` now installs it, and a deploy installs it on an instance that lacks it.

- **Two guide corrections, in every language:** the glazing guide no longer suggests blowing or
  dry-brushing dust off bisque, which puts silica dust in the air; it says to wipe it with a barely
  damp sponge, as the safety guide does. The firing guide's cone clock now reads as Orton's chart
  and FAQ do: the end point is the tip level with the base, a cone touching the shelf is at 6
  o'clock, and Orton counts anywhere from 5 to 6 o'clock as properly fired.
- **The compare table's headings no longer have wide gaps between words** ("Satin white"): the
  numbers' tabular figures are kept to the number cells, as in the printed recipe, the guides'
  tables and the landing page's example.
- **On a phone, setting up an authenticator app** keeps the step's number beside the first line of
  its label when the label wraps.

- **Sign-in email addresses are no longer written to the web server's log.** Signing in sends the
  address as the HTTP Basic user name, which nginx's default log format recorded beside the IP
  address; its own format now leaves the user name out.
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
