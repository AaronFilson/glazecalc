# தமிழ்: style sheet and glossary

**Skeleton.** The rules below are decided; the glossary tables are empty, for the glossary research to fill (wave I1 of
`scratch/round8/in-langs/plan.md`; the prompt is made by `docs/translations/process/make-glossary-prompts.js ta`, from
the `ta` entry of `process/wave.js`). Nothing here is translated yet, and Tamil is not offered: `ta` is known to
`lib/regions` ahead of its files.

For translating Glazecalc into Tamil (`ta`), for potters in India (region `IN`: Tamil Nadu and Puducherry). Sri Lankan,
Singaporean and Malaysian Tamil differ in some words; the pages are written for India. Read [README.md](README.md) first;
[terms.md](terms.md) gives the meaning of every English term below. [hi.md](hi.md) is the model for the shape of this
page. Every Tamil message and guide follows this page: one Tamil word for one thing. India fires by Orton cones by
default, with temperatures one tap away, so the Tamil pages must read well with Orton cones and temperatures and say
nothing about SK cones that the English does not say.

**The owner's choices** (`scratch/round8/plan.md`), as for Hindi:

- **Loanwords first.** The studio potters' English loanwords first, in Tamil letters as potters say them, **with the
  textbook term in brackets where it differs**. Tamil textbooks and the state's Sorkuvai corpus coin pure-Tamil words that
  studio potters do not use, so each row says which tier it is in: (1) craft words potters say in English, (2) materials
  by the name on the bag, (3) chemistry and physics as the Tamil Nadu textbooks write them, (4) health, safety and law in
  plain Tamil and the words of the Acts.
- **The full stop.** A sentence ends with the Latin full stop ".", as Hindi's do.
- **Digits and grouping.** The translations write 0 to 9 only. The app shows each reader's digits and Indian grouping when
  it formats a number (CLDR's: 0 to 9 for Tamil in India, and Tamil digits under the Digits setting).
- **No web font.** The page is drawn in the device's own font (Nirmala UI on Windows, Noto Sans Tamil on Android and Linux,
  Tamil Sangam MN on Apple). Tamil's wide letters and long words are tested at 320 px (`ta-XF`, the pseudo-locale).

**Sources to read** (the glossary research reports what it could and could not reach, as hi.md does): the Tamil Nadu
Textbook and Educational Services Corporation's Tamil-medium chemistry texts, the Sorkuvai term corpus, the Tamil Virtual
Academy's glossaries, CSTT, the Tamil Wikipedia, the Microsoft Tamil style guide, and Google's and Apple's Tamil help
pages. Rows are marked **Usage** (a word potters or shops use, in no teaching source), **No source** (a best choice) or
**Native check** (a Tamil-speaking potter should confirm it).

## Choices for the owner and a native potter

To be filled by the glossary research, each with a recommendation. Known questions: the Grantha letters in loanwords (ஜ ஷ
ஸ ஹ க்ஷ), pure-Tamil against loanword for each tier-1 term, the kiln word, the genders or classes loanwords take, and the
register of buttons (the polite imperative Tamil software uses).

## 1. Style sheet

### Register

நீங்கள், never நீ, in the interface, errors, notices, emails, the safety text and the guides alike. Buttons, menus and
tabs as Tamil software writes them (the Microsoft Tamil style guide, Google and Apple); headings as noun phrases. Keep
"must", "should" and "may" (a hedge that must survive) apart, and "must be tested" means the test is done, not passed.
_To be filled: examples of a button, an error, a notice and a guide sentence._

### Buttons, menus, headings, labels and tabs

_To be filled._

### Capitalisation

Tamil has no capitals. Latin words inside Tamil text keep the English's case where they are names, codes, units or
formulas (Orton, SK, UMF, LOI, Ferro 3134, mg/m³, SiO₂). An English loanword is written in Tamil letters, never in Latin
ones, unless it is a trade name, a company or brand, a code or a unit.

### Script and spelling

- Tamil letters as the Tamil Nadu government's standard spelling writes them, with the pulli (்) and the vowel signs
  before, above and below a letter.
- Grantha letters in loanwords: _to be filled_.
- **Normalisation and joiners.** Every file is in Unicode form NFC, with no ZWJ or ZWNJ (the i18n check asks for both),
  and only Tamil and Latin letters (the script check).
- **Latin text** inside Tamil: units, formulas, trade names, codes and cone numbers exactly as the English writes them,
  with a space on each side where the English has one.
- **Digits** are 0 to 9 only (see Numbers and units).

### Punctuation

- The full stop "." ends a sentence, with no space before it and one after. A heading, a button and a list item that is
  not a sentence end with nothing.
- Comma, question mark, colon, semicolon as in English, no space before them. No "!" in the app's own voice.
- Quotation marks, parentheses, dashes and the ellipsis: _to be filled_ (Microsoft's Tamil style guide).

### Numbers and units

- **The digits 0 to 9** wherever the English has digits, never Tamil digits (௧ ௨ ௩), which the numbers check does not read.
- **The decimal point and the English's figures** as the English writes them: 1.5; 0.025; 12,500; 1222 °C and 1000 g
  ungrouped. Never இலட்சம் or கோடி for a figure.
- **Percent** 5%, no space; a range 10–60%. **Units**: the English's symbols in Latin letters (g, kg, mg, mL, L, mm, cm, °C, °F,
  °Bé, mg/m³); inches and feet as Tamil words with the metric figure in brackets as the English gives it.
- **A number the English writes as a word** stays a word, since a digit would be a figure the English lacks.
- **Dates**: "14 அக்டோபர் 2026" (CLDR's long form: _to be checked against the sources_), the Gregorian calendar, never a
  Tamil-calendar or Saka year. Month names: _to be filled_.
- **Clock times**: the 24-hour clock, 20:00, never காலை, மாலை or இரவு with a 12-hour figure (இரவு 8 மணிக்கு), which the
  check would read as 8.
- **No figures the English lacks**: no Tamil digits, no இலட்சம் or கோடி, no calendar years of the region's own, no SK or
  Orton equivalents, no converted units, no IS numbers where the English names none.

### Plural forms

CLDR gives Tamil two cardinal categories, `one` and `other`; **0 is `other`**, and `one` is exactly 1 (unlike Hindi,
Kannada and Gujarati). Every plural message has both forms, and `=0 {…}` stays where the English has it. _To be filled:
the noun in each form for the app's nouns (material, coat, recipe, tile, glaze, frit, cone, hour, minute, day, passkey)._

### Placeholders and names

Tamil joins case endings to the word (-இல், -ஐ, -இன், -க்கு), and a placeholder takes none. _To be filled: how to build a
sentence around {name}, {region}, {count} and {library} so it reads with any value._

### Cones

Orton cones are named Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where
the English says Seger, and the Seger formula (UMF) never names a cone. Never an SK number for an Orton number or the
reverse, nor any equivalence. _To be filled: the potters' word for a cone, and the wording for "one number hotter/cooler",
never higher or lower._

### The unity formula

_To be filled._

### Gender-neutral wording

Tamil verbs and adjectives mostly do not mark the reader's gender with நீங்கள். _To be filled: the forms Tamil software uses._

### The reader in the guides

_To be filled: where the bracketed textbook term appears (at a term's first use in each guide section, as `{{en: …}}` is
used, and never in a button or a short label)._

### The app's feature names

_To be filled._

### Law in India

_To be filled from the Tamil texts of the Occupational Safety, Health and Working Conditions Code, 2020, the Factories
Act, 1948, the Tamil Nadu Factories Rules, BIS's IS 9473 and IS 9806, and the GHS labels: the law's words for "at most",
"no more than", "up to" (அதிகபட்சம், மிகாமல்?) against "less than" (குறைவாக?), and "at least" (குறைந்தபட்சம்?). The words
for respirable dust, crystalline silica and silicosis. How the English's EU names are written (there is no official
Tamil text of Directive 84/500/EEC or CLP)._

### Agencies, organisations and companies

AIIMS's National Poisons Information Centre (1800 116 117, 24 hours, toll free) is verified (the India region research).
_To be filled: its Tamil name from AIIMS's pages, if it has one, and the other bodies' names._

### Pitfalls

_To be filled: glaze vs enamel, varnish and paint; frit vs flux; kiln vs oven or furnace; bisque vs raw ware; earthenware,
terracotta, stoneware, porcelain and china clay; silica vs silicon vs silicone; whiting vs lime and chalk; boron vs borax
vs boric acid; a respirator vs a ventilator vs ventilation; the app's guides vs a kiln's manual._

### Search terms (docs/seo-plan.md, item 9)

_To be filled._

## 2. Glossary

**Tier** in the Notes: 1 craft loanword, 2 material by its bag name, 3 textbook chemistry and physics, 4 plain Tamil and
the law. A term in brackets after the Tamil is the textbook term for the guides' first use per section.

### 2.1 Glaze and its chemistry

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.2 Materials and oxides

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.3 Clay, ware and firing stages

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.4 Kilns, cones and firing

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.5 Defects and glaze fit

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.6 Making and applying glaze

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.7 Health and safety

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.8 The app's own words

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.9 Where the potter works

| English | Tamil | Notes |
| ------- | ----- | ----- |

### 2.10 Signing in

The words Google, Apple and Microsoft use on their own Tamil help pages (link each): two-step sign-in, authenticator app,
setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account, password,
trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the check rejects.

| English | Tamil | Notes |
| ------- | ----- | ----- |

## 3. Never translated

As in hi.md, from terms.md, unchanged: formulas and symbols (SiO₂, K₂O, R₂O, RO), cone numbers with their leading zeros,
SK numbers as printed, mesh numbers, units (°C, °F, K, °Bé, g, kg, mg, mL, L, mm, cm, %, mg/m³), codes and standards (N95,
FFP2, EN 149, JIS R 8101, H-codes, CAS numbers), the names Glazecalc, UMF, Orton and Seger, and kiln and equipment makers
and products (Skutt, L&L, Bartlett, Kiln-Sitter).
