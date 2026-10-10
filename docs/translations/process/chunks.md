# The parts of Glazecalc to translate

In each path, `<code>` is your language's code. Paths are under C:\Users\bellows\gh\glazecalc.

## app

- `client/public/i18n/en.json` → `client/public/i18n/<code>.json` (225 messages): the page titles (`titles`, shown in
  the browser tab, so keep them short), the menu (`nav`), the trial banner, the footer, notices, the oxide names
  (`oxides`: the common names of oxides, such as silica and alumina), the firing log's column names (`firingFields`: a
  kiln log's columns, from the potter's own records: Spy is a reading through the spy hole or peephole; Ring {n} is
  the reading of pyrometric ring n, a Buller's or Holdcroft ring; Probe {n} a thermocouple; Ox Probe an oxygen probe;
  Draw Tile a test ring drawn out of a hot kiln; Pilots a gas kiln's pilot burners; Salt, Soda and Sawdust are kinds
  of firing; keep them short, they head table columns), the glaze colour palettes (`palettes`: names of colour schemes
  for the charts, such as Tenmoku rust and Celadon green), the material categories, the library's regions, a
  material's status, the forms for a material's chemistry, the field checks (form error messages), the shelf ("Match
  with what I have"), the translation notice (`notice`: it says the page was translated by AI; translate it plainly),
  and the unity formula's column heads (`unity`). `meta.description` is the description search engines show (under
  160 characters).
- `client/public/i18n/site/en.json` → `client/public/i18n/site/<code>.json` (89 messages): the landing page, About,
  Privacy (translate faithfully: it describes what the app stores; do not add legal terms the English lacks), the page
  not found, and the advice page.
- `client/public/i18n/account/en.json` → `client/public/i18n/account/<code>.json` (146 messages): signing in and up,
  forgotten and reset passwords, the account page, and Settings (each setting's name, its choices, what saving one
  says, and its help; the lead setting's warning is safety text).

## parts

- `client/public/i18n/library/en.json` → `client/public/i18n/library/<code>.json` (42): the pages for the potter's
  own materials and additives.
- `client/public/i18n/notebook/en.json` → `client/public/i18n/notebook/<code>.json` (62): the home page once signed
  in, the firing logs, notes and the trash.
- `client/public/i18n/guides/en.json` → `client/public/i18n/guides/<code>.json` (118): the list of guides, the notes
  on a guide page, the who-to-call table's headings and labels (`poison`: safety text), how a glaze's density is
  written (`density`: `sg` writes a specific gravity in your language's words or abbreviation, as the glossary gives it (German "spez. Gewicht {value}", Spanish "densidad {value}"); keep `°Bé` and the units as they are; "oz per imperial pint" may be translated), and
  the guides' parts for the reader's country: shops (`shops`), the workplace limit for silica dust (`silica`: safety
  text), the limits on lead and cadmium a glazed piece may release (`food`: safety text; the kinds of piece in
  `food.category` follow your language's official text of Directive 84/500/EEC where it names them) and the closest
  materials sold where the potter buys (`equivalents`, whose `{library}` select takes a code: keep its branches).
  `{region}` is a country's name in the page's language: write each sentence so it reads with any country.
- `client/public/i18n/server/en.json` → `client/public/i18n/server/<code>.json` (63): the server's messages, shown as
  plain text (no tags). The `…-choices` messages answer a setting saved with a value not on its list.
- `client/public/i18n/chemistry/en.json` → `client/public/i18n/chemistry/<code>.json` (21): the calculation's errors
  and warnings, plain text.
- `client/public/i18n/safety/en.json` → `client/public/i18n/safety/<code>.json` (100): the words in the who-to-call
  table for each country (services, hours, notes), plain text. Names of services keep their own language (the
  German Giftnotruf stays German in every translation); translate only the English words around them, such as
  "24 hours" or "children only". Phone numbers are not in this file.
- `client/public/i18n/regions/en.json` → `client/public/i18n/regions/<code>.json` (14): notes in the region data
  (on shops, the silica limits and food-contact rules), plain text; the EU directive's name takes its official form
  in your language. Safety text.
- **The two emails**, in `server/lib/account_mail.ts` (read the `en` entries there, but do not edit that file):
  write your translation as JSON to
  `{SCRATCH}emails\<code>.json`,
  shaped `{ "reset": { "subject": "…", "text": "…" }, "changed": { "subject": "…", "text": "…" } }`, with the
  values written as placeholders: `{account}`, `{link}`, `{minutes}`, `{app}` in the reset email, and `{account}`,
  `{forgot}`, `{app}` in the other. Keep the line breaks (`\n`) where the English has them, and the signature as it
  is: `\n-- \nGlazecalc, {app}\n`.

## recipe

- `client/public/i18n/recipe/en.json` → `client/public/i18n/recipe/<code>.json` (425 messages): the recipe page, the
  heart of the app: the recipe table, the unity formula and analysis, the library of materials beside it, "Try modern
  materials", help, printing, Compare, Replace lead (safety text), the checks on a recipe, the report of a
  substitution, and the pool of materials it may use. Many messages have plural forms and tags: keep them exactly.

## records

- `client/public/i18n/records/en.json` → `client/public/i18n/records/<code>.json` (366 messages, 86 KB): the notes
  and hazards of the standard materials and additives, and the advice page's articles, keyed by a hash of their
  English. Plain text, no tags. Material, mineral, mine, company and product names stay as they are (Custer Feldspar,
  Minspar 200, Gerstley Borate, Ferro 3134, EPK); chemical formulas too. The hazards are safety text: translate them
  exactly. Work through the file in batches (say 60 entries at a time) and make sure every key is there at the end.

## glazing-basics

- `client/public/i18n/guides/glazing-basics/en.md` → `client/public/i18n/guides/glazing-basics/<code>.md`: the guide
  "Glazing from first principles": what a glaze is, and a glossary of every term a new potter meets (a definition
  list). This guide sets the terms for the rest, so follow the glossary exactly, and give each defined term its
  English in brackets where it differs, as `Fritte (frit)` in the term line.

## making-a-glaze

- `client/public/i18n/guides/making-a-glaze/en.md` → `client/public/i18n/guides/making-a-glaze/<code>.md`: "How to
  make a glaze": buying, storing, weighing, mixing, sieving, testing, records. Its `{{SG …}}` values stay exactly.

## safe-mixing

- `client/public/i18n/guides/safe-mixing/en.md` → `client/public/i18n/guides/safe-mixing/<code>.md`: "Safe mixing
  and ventilation". Safety text throughout: translate exactly, keep every limit, filter class (FFP2, N95, P100) and
  agency name (OSHA, HSE, NIOSH: keep the names, and translate a description of what they are where the English gives
  one). It will be translated back into English and compared with the original.

## home-safety

- `client/public/i18n/guides/home-safety/en.md` → `client/public/i18n/guides/home-safety/<code>.md`: "Don't poison
  your family": pottery at home with children and pets. Safety text throughout; the title is deliberately blunt, keep
  that. Phone numbers stay exactly as written. It will be translated back into English and compared with the
  original.

## firing

- `client/public/i18n/guides/firing/en.md` → `client/public/i18n/guides/firing/<code>.md` (55 KB, the longest): "Firing
  a basic kiln": cones, kiln sitters, manual kilns, schedules. Its many `{{… °F; … °C}}` values, tables and
  `:::orton` / `:::temperature` parts stay exactly; the switch settings (Low, Medium, High) are translated as the
  glossary says. Work through it section by section.
