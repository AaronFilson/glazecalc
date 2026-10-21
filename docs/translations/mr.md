# मराठी: style sheet and glossary

**Skeleton.** The rules below are decided; the glossary tables are empty, for the glossary research to fill (wave I1 of
`scratch/round8/in-langs/plan.md`; the prompt is made by `docs/translations/process/make-glossary-prompts.js mr`, from
the `mr` entry of `process/wave.js`). Nothing here is translated yet, and Marathi is not offered: `mr` is known to
`lib/regions` ahead of its files.

For translating Glazecalc into Marathi (`mr`), for potters in India (region `IN`: Maharashtra). Read
[README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term below. [hi.md](hi.md) is the
model for the shape of this page, **not for its words**: Marathi shares Devanagari with Hindi, but many Hindi and Marathi
words look alike and differ in meaning, and a term is never copied from hi.md. Every Marathi message and guide follows
this page: one Marathi word for one thing. India fires by Orton cones by default, with temperatures one tap away, so the
Marathi pages must read well with Orton cones and temperatures and say nothing about SK cones that the English does not
say.

**The owner's choices** (`scratch/round8/plan.md`), as for Hindi:

- **Loanwords first.** The studio potters' English loanwords first, in Devanagari as Marathi-speaking potters say them,
  **with the Marathi technical term in brackets where it differs**. Each row says which tier it is in: (1) craft words
  potters say in English, (2) materials by the name on the bag, (3) chemistry and physics as Balbharati's textbooks write
  them, (4) health, safety and law in plain Marathi and the words of the Acts.
- **The full stop.** A sentence ends with the Latin full stop ".", as Hindi's do. Marathi does not use the danda.
- **Digits and grouping.** The translations write 0 to 9 only. **CLDR shows Marathi readers Devanagari digits (१२३) by
  default**, with Indian grouping (१२,३४,५६७.५), so a page mixes the app's Devanagari figures with the translation's 0 to
  9 inside sentences; the Digits setting gives 0 to 9. This is the owner's choice (CLDR's defaults), as for Bengali.
- **No web font.** The page is drawn in the device's own font (Nirmala UI on Windows, Noto Sans Devanagari on Android and
  Linux, Kohinoor Devanagari on Apple), with `lang="mr"` so that a font draws Marathi's own forms of ल and श. To check in
  `/mr/` on each system once there are pages.

**Sources to read**: Maharashtra's Balbharati textbooks (ebalbharati.in), CSTT, the Marathi Vishwakosh's glossaries, the
Marathi Wikipedia, the Microsoft Marathi style guide, and Google's and Apple's Marathi help pages. Rows are marked
**Usage**, **No source** or **Native check** as in hi.md.

## Choices for the owner and a native potter

To be filled by the glossary research, each with a recommendation. Known questions: तुम्ही or आपण in the interface, the
kiln word, the genders loanwords take, the spelling of झ against Hindi's nukta ज़ (ग्लेझ), and the register of buttons.

## 1. Style sheet

### Register

_To be filled: तुम्ही or आपण (from the Microsoft Marathi style guide), never तू, in the interface, errors, notices, emails,
the safety text and the guides alike; buttons, menus and tabs as Marathi software writes them (जतन करा?). Keep "must",
"should" and "may" (a hedge that must survive) apart, and "must be tested" means the test is done, not passed._

### Buttons, menus, headings, labels and tabs

_To be filled._

### Capitalisation

Devanagari has no capitals. Latin words inside Marathi text keep the English's case where they are names, codes, units or
formulas (Orton, SK, UMF, LOI, Ferro 3134, mg/m³, SiO₂). An English loanword is written in Devanagari, never in Latin
letters, unless it is a trade name, a company or brand, a code or a unit.

### Script and spelling

- Devanagari as Marathi writes it: the anusvara and the chandrabindu as Marathi uses them, the nukta rarely, Marathi's
  own forms of ल and श (the page is `lang="mr"`). Never Hindi spellings.
- **Normalisation and joiners.** Every file is in Unicode form NFC, with no ZWJ or ZWNJ (the i18n check asks for both),
  and only Devanagari and Latin letters (the script check).
- **Latin text** inside Marathi: units, formulas, trade names, codes and cone numbers exactly as the English writes them,
  with a space on each side where the English has one.
- **Digits** are 0 to 9 only (see Numbers and units).

### Punctuation

- The full stop "." ends a sentence, with no space before it and one after, never the danda "।". A heading, a button and
  a list item that is not a sentence end with nothing.
- Comma, question mark, colon, semicolon as in English, no space before them. No "!" in the app's own voice.
- Quotation marks, parentheses, dashes and the ellipsis: _to be filled_ (Microsoft's Marathi style guide).

### Numbers and units

- **The digits 0 to 9** wherever the English has digits, never Devanagari digits (० १ २), which the numbers check does not
  read, even though the app shows Marathi readers Devanagari digits by default when it formats a number.
- **The decimal point and the English's figures** as the English writes them: 1.5; 0.025; 12,500; 1222 °C and 1000 g
  ungrouped. Never लाख or कोटी for a figure.
- **Percent** 5%, no space; a range 10–60%. **Units**: the English's symbols in Latin letters (g, kg, mg, mL, L, mm, cm, °C, °F,
  °Bé, mg/m³); inches and feet as Marathi words with the metric figure in brackets as the English gives it.
- **A number the English writes as a word** stays a word, since a digit would be a figure the English lacks.
- **Dates**: "14 ऑक्टोबर 2026", the month named beside the year (CLDR's long form: _to be checked against the sources_), the
  Gregorian calendar, never a Shaka year. Month names: _to be filled_.
- **Clock times**: the 24-hour clock, 20:00, never सकाळी, दुपारी, संध्याकाळी or रात्री with a 12-hour figure (रात्री 8
  वाजता), which the check would read as 8.
- **No figures the English lacks**: no Devanagari digits, no लाख or कोटी, no Shaka years, no SK or Orton equivalents, no
  converted units, no IS numbers where the English names none.

### Plural forms

CLDR gives Marathi two cardinal categories, `one` and `other`; **0 is `other`**, and `one` is exactly 1 (unlike Hindi).
Every plural message has both forms, and `=0 {…}` stays where the English has it. _To be filled: the noun in each form for
the app's nouns (material, coat, recipe, tile, glaze, frit, cone, hour, minute, day, passkey), with the case endings._

### Placeholders and names

Marathi joins postpositions and case endings to the word (-मध्ये, -चा/ची/चे, -ला, -ने), and the possessive agrees with the
noun that follows. _To be filled: how to build a sentence around {name}, {region}, {count} and {library} so it reads with
any value._

### Cones

Orton cones are named Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where
the English says Seger, and the Seger formula (UMF) never names a cone. Never an SK number for an Orton number or the
reverse, nor any equivalence. _To be filled: the potters' word for a cone, and the wording for "one number hotter/cooler",
never higher or lower._

### The unity formula

_To be filled._

### Gender-neutral wording

_To be filled: Marathi verbs show the subject's gender in many tenses; the forms Marathi software uses with the reader._

### The reader in the guides

_To be filled: where the bracketed Marathi term appears (at a term's first use in each guide section, as `{{en: …}}` is
used, and never in a button or a short label)._

### The app's feature names

_To be filled._

### Law in India

_To be filled from the Marathi texts of the Occupational Safety, Health and Working Conditions Code, 2020, the Factories
Act, 1948, the Maharashtra Factories Rules, BIS's IS 9473 and IS 9806, and the GHS labels: the law's words for "at most",
"no more than", "up to" (जास्तीत जास्त, पेक्षा जास्त नाही?) against "less than" (पेक्षा कमी), and "at least" (किमान?). The
words for respirable dust, crystalline silica and silicosis. How the English's EU names are written (there is no official
Marathi text of Directive 84/500/EEC or CLP)._

### Agencies, organisations and companies

AIIMS's National Poisons Information Centre (1800 116 117, 24 hours, toll free) is verified (the India region research).
_To be filled: its Marathi name from AIIMS's pages, if it has one, and the other bodies' names._

### Pitfalls

_To be filled: the Hindi and Marathi false friends first (words that look alike and differ), then glaze vs enamel,
varnish and paint; frit vs flux; kiln vs oven or furnace; bisque vs raw ware; earthenware, terracotta, stoneware,
porcelain and china clay; silica vs silicon vs silicone; whiting vs lime and chalk; boron vs borax vs boric acid; a
respirator vs a ventilator vs ventilation; the app's guides vs a kiln's manual._

### Search terms (docs/seo-plan.md, item 9)

_To be filled._

## 2. Glossary

**Tier** in the Notes: 1 craft loanword, 2 material by its bag name, 3 textbook chemistry and physics, 4 plain Marathi and
the law. A term in brackets after the Marathi is the technical term for the guides' first use per section.

### 2.1 Glaze and its chemistry

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.2 Materials and oxides

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.3 Clay, ware and firing stages

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.4 Kilns, cones and firing

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.5 Defects and glaze fit

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.6 Making and applying glaze

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.7 Health and safety

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.8 The app's own words

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.9 Where the potter works

| English | Marathi | Notes |
| ------- | ------- | ----- |

### 2.10 Signing in

The words Google, Apple and Microsoft use on their own Marathi help pages (link each): two-step sign-in, authenticator
app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account,
password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the check rejects.

| English | Marathi | Notes |
| ------- | ------- | ----- |

## 3. Never translated

As in hi.md, from terms.md, unchanged: formulas and symbols (SiO₂, K₂O, R₂O, RO), cone numbers with their leading zeros,
SK numbers as printed, mesh numbers, units (°C, °F, K, °Bé, g, kg, mg, mL, L, mm, cm, %, mg/m³), codes and standards (N95,
FFP2, EN 149, JIS R 8101, H-codes, CAS numbers), the names Glazecalc, UMF, Orton and Seger, and kiln and equipment makers
and products (Skutt, L&L, Bartlett, Kiln-Sitter).
