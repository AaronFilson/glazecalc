# ಕನ್ನಡ: style sheet and glossary

**Skeleton.** The rules below are decided; the glossary tables are empty, for the glossary research to fill (wave I1 of
`scratch/round8/in-langs/plan.md`; the prompt is made by `docs/translations/process/make-glossary-prompts.js kn`, from
the `kn` entry of `process/wave.js`). Nothing here is translated yet, and Kannada is not offered: `kn` is known to
`lib/regions` ahead of its files.

For translating Glazecalc into Kannada (`kn`), for potters in India (region `IN`: Karnataka). Read
[README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term below. [hi.md](hi.md) is the
model for the shape of this page. Every Kannada message and guide follows this page: one Kannada word for one thing.
India fires by Orton cones by default, with temperatures one tap away, so the Kannada pages must read well with Orton
cones and temperatures and say nothing about SK cones that the English does not say.

**The owner's choices** (`scratch/round8/plan.md`), as for Hindi:

- **Loanwords first.** The studio potters' English loanwords first, in Kannada letters as potters say them, **with the
  Kannada technical term in brackets where it differs**. Each row says which tier it is in: (1) craft words potters say in
  English, (2) materials by the name on the bag, (3) chemistry and physics as the Karnataka textbooks write them, (4)
  health, safety and law in plain Kannada and the words of the Acts.
- **The full stop.** A sentence ends with the Latin full stop ".", as Hindi's do.
- **Digits and grouping.** The translations write 0 to 9 only. CLDR's defaults are the app's: 0 to 9 for Kannada in India
  (Kannada digits ೧೨೩ under the Digits setting), **with Western grouping (1,234,567.5)**, which is CLDR 48's choice for
  Kannada alone among the Indian languages and probably Karnataka's usage. A Kannada-speaking potter should confirm it.
- **`one` covers 0.** In CLDR, Kannada's `one` takes 0 as well as 1 (like Hindi). A plural message's `one` form reads right
  for 0 and keeps `#`; where the English's `one` has no `#` ("this passkey", "it"), the message gets an `=1` form for
  exactly one (the i18n check asks for it).
- **No web font.** The page is drawn in the device's own font (Nirmala UI on Windows, Noto Sans Kannada on Android and
  Linux, Kannada Sangam MN on Apple). Kannada's letters stack below the line, so its lines are taller (`kn-XG`, the
  pseudo-locale, tests it at 320 px). **To test on a real iPhone**: Apple lists Kannada Sangam MN as a download on iOS.

**Sources to read**: the Karnataka Textbook Society's Kannada-medium science texts, the Kannada Development Authority's
glossaries, CSTT, the Kannada Wikipedia, the Microsoft Kannada style guide, and Google's and Apple's Kannada help pages.
Rows are marked **Usage**, **No source** or **Native check** as in hi.md.

## Choices for the owner and a native potter

To be filled by the glossary research, each with a recommendation. Known questions: the kiln word, the genders or classes
loanwords take, the register of buttons, and the grouping above.

## 1. Style sheet

### Register

ನೀವು, never ನೀನು, in the interface, errors, notices, emails, the safety text and the guides alike. Buttons, menus and tabs
as Kannada software writes them (the Microsoft Kannada style guide, Google and Apple); headings as noun phrases. Keep
"must", "should" and "may" (a hedge that must survive) apart, and "must be tested" means the test is done, not passed.
_To be filled: examples of a button, an error, a notice and a guide sentence._

### Buttons, menus, headings, labels and tabs

_To be filled._

### Capitalisation

Kannada has no capitals. Latin words inside Kannada text keep the English's case where they are names, codes, units or
formulas (Orton, SK, UMF, LOI, Ferro 3134, mg/m³, SiO₂). An English loanword is written in Kannada letters, never in Latin
ones, unless it is a trade name, a company or brand, a code or a unit.

### Script and spelling

- Kannada letters as the Karnataka standard writes them, with the virama (್) and the stacked conjuncts.
- **Normalisation and joiners.** Every file is in Unicode form NFC, with no ZWJ or ZWNJ (the i18n check asks for both),
  and only Kannada and Latin letters (the script check).
- **Latin text** inside Kannada: units, formulas, trade names, codes and cone numbers exactly as the English writes them,
  with a space on each side where the English has one.
- **Digits** are 0 to 9 only (see Numbers and units).

### Punctuation

- The full stop "." ends a sentence, with no space before it and one after. A heading, a button and a list item that is
  not a sentence end with nothing.
- Comma, question mark, colon, semicolon as in English, no space before them. No "!" in the app's own voice.
- Quotation marks, parentheses, dashes and the ellipsis: _to be filled_ (Microsoft's Kannada style guide).

### Numbers and units

- **The digits 0 to 9** wherever the English has digits, never Kannada digits (೧ ೨ ೩), which the numbers check does not read.
- **The decimal point and the English's figures** as the English writes them: 1.5; 0.025; 12,500; 1222 °C and 1000 g
  ungrouped. Never ಲಕ್ಷ or ಕೋಟಿ for a figure.
- **Percent** 5%, no space; a range 10–60%. **Units**: the English's symbols in Latin letters (g, kg, mg, mL, L, mm, cm, °C, °F,
  °Bé, mg/m³); inches and feet as Kannada words with the metric figure in brackets as the English gives it.
- **A number the English writes as a word** stays a word, since a digit would be a figure the English lacks.
- **Dates**: the month named beside the year, the Gregorian calendar, never a Shaka year. CLDR writes Kannada's long date
  with the month first ("ಅಕ್ಟೋಬರ್ 14, 2026"): _to be checked against the sources_. Month names: _to be filled_.
- **Clock times**: the 24-hour clock, 20:00, never ಬೆಳಿಗ್ಗೆ, ಮಧ್ಯಾಹ್ನ, ಸಂಜೆ or ರಾತ್ರಿ with a 12-hour figure (ರಾತ್ರಿ 8
  ಗಂಟೆಗೆ), which the check would read as 8.
- **No figures the English lacks**: no Kannada digits, no ಲಕ್ಷ or ಕೋಟಿ, no Shaka years, no SK or Orton equivalents, no
  converted units, no IS numbers where the English names none.

### Plural forms

CLDR gives Kannada two cardinal categories, `one` and `other`, and **`one` covers 0 and 1** (and fractions below 1): 0 and
1 are `one`, 2 and 1.5 are `other`. Every plural message has both forms, and `=0 {…}` stays where the English has it. The
`one` form reads right for 0 as well as 1, so it keeps `#`. Where the English's `one` has no `#`, add an `=1` form for
exactly one: `{count, plural, =1 {This passkey} one {# passkey} other {These # passkeys}}`. _To be filled: the noun in each
form for the app's nouns (material, coat, recipe, tile, glaze, frit, cone, hour, minute, day, passkey)._

### Placeholders and names

Kannada joins case endings to the word (-ನಲ್ಲಿ, -ಅನ್ನು, -ಗೆ, -ನ), and a placeholder takes none. _To be filled: how to build a
sentence around {name}, {region}, {count} and {library} so it reads with any value._

### Cones

Orton cones are named Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where
the English says Seger, and the Seger formula (UMF) never names a cone. Never an SK number for an Orton number or the
reverse, nor any equivalence. _To be filled: the potters' word for a cone, and the wording for "one number hotter/cooler",
never higher or lower._

### The unity formula

_To be filled._

### Gender-neutral wording

_To be filled: the forms Kannada software uses with ನೀವು._

### The reader in the guides

_To be filled: where the bracketed Kannada term appears (at a term's first use in each guide section, as `{{en: …}}` is
used, and never in a button or a short label)._

### The app's feature names

_To be filled._

### Law in India

_To be filled from the Kannada texts of the Occupational Safety, Health and Working Conditions Code, 2020, the Factories
Act, 1948, the Karnataka Factories Rules, BIS's IS 9473 and IS 9806, and the GHS labels: the law's words for "at most",
"no more than", "up to" (ಗರಿಷ್ಠ, ಮೀರಬಾರದು?) against "less than" (ಕಡಿಮೆ?), and "at least" (ಕನಿಷ್ಠ?). The words for respirable
dust, crystalline silica and silicosis. How the English's EU names are written (there is no official Kannada text of
Directive 84/500/EEC or CLP)._

### Agencies, organisations and companies

AIIMS's National Poisons Information Centre (1800 116 117, 24 hours, toll free) is verified (the India region research).
_To be filled: its Kannada name from AIIMS's pages, if it has one, and the other bodies' names._

### Pitfalls

_To be filled: glaze vs enamel, varnish and paint; frit vs flux; kiln vs oven or furnace; bisque vs raw ware; earthenware,
terracotta, stoneware, porcelain and china clay; silica vs silicon vs silicone; whiting vs lime and chalk; boron vs borax
vs boric acid; a respirator vs a ventilator vs ventilation; the app's guides vs a kiln's manual._

### Search terms (docs/seo-plan.md, item 9)

_To be filled._

## 2. Glossary

**Tier** in the Notes: 1 craft loanword, 2 material by its bag name, 3 textbook chemistry and physics, 4 plain Kannada and
the law. A term in brackets after the Kannada is the technical term for the guides' first use per section.

### 2.1 Glaze and its chemistry

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.2 Materials and oxides

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.3 Clay, ware and firing stages

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.4 Kilns, cones and firing

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.5 Defects and glaze fit

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.6 Making and applying glaze

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.7 Health and safety

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.8 The app's own words

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.9 Where the potter works

| English | Kannada | Notes |
| ------- | ------- | ----- |

### 2.10 Signing in

The words Google, Apple and Microsoft use on their own Kannada help pages (link each): two-step sign-in, authenticator
app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account,
password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the check rejects.

| English | Kannada | Notes |
| ------- | ------- | ----- |

## 3. Never translated

As in hi.md, from terms.md, unchanged: formulas and symbols (SiO₂, K₂O, R₂O, RO), cone numbers with their leading zeros,
SK numbers as printed, mesh numbers, units (°C, °F, K, °Bé, g, kg, mg, mL, L, mm, cm, %, mg/m³), codes and standards (N95,
FFP2, EN 149, JIS R 8101, H-codes, CAS numbers), the names Glazecalc, UMF, Orton and Seger, and kiln and equipment makers
and products (Skutt, L&L, Bartlett, Kiln-Sitter).
