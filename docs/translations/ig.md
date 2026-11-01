# Igbo: ntụzịaka ụdị ide na nchịkọta okwu (style sheet and glossary)

The rules and terms for translating Glazecalc into Igbo (`ig`), standard Igbo (Igbo Izugbe) in the Ọnwụ orthography, as
Nigerian schools and the Society for Promoting Igbo Language and Culture (SPILC) write it, for potters in Nigeria. Read
[README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term. Every ig message and guide
follows this page. Nigeria has no region in the app yet; it fires by temperature (°C) by default.

**Notice.** Igbo is a `plainNotice` language (`lib/regions/languages.js`): machine translation of Igbo is weak
(docs/i18n-plan.md, "After the EU").

**What the sources could and could not give** (research 2026-11-01). Igbo pottery (Ishiagu, Inyi, Afikpo; women potters,
open firing) gives everyday words: _ụrọ_ (clay), _ite_ (pot), _ọkpụ ite_ (potter). The University of Nigeria, Nsukka's
ceramics teaching is in English, so most technical terms are **English loans**, written as English spells them with a
short Igbo gloss. Rows with no source read today are **Native check**; the owner's ruling of 2026-11-01 holds.

Main sources, cited below by short name:

- **Echeruo**: Michael J. C. Echeruo, _Igbo–English Dictionary_ (1998), and Kay Williamson's _Igbo–English Dictionary_:
  everyday words (_ụrọ_, _ite_, _ájá_, _nsí_). Known works; not re-read online today.
- **SPILC / Nkọwa**: the standard Igbo orthography (Ọnwụ, 1961) and SPILC's _Igbo Metalanguage_ (Ọkọwa Okwu) for school
  terms.
- **Google / MS**: Google's and Microsoft's Igbo interfaces (_Chekwaa_ Save, _Hichapụ_ Delete, _Kagbuo_ Cancel,
  _Ntọala_ Settings, _Banye_ / _Pụọ_). **Native check**.
- **CLDR**: Node 24 `Intl` for ig (scratch/round10/c-l34/intl-and-fonts.mjs): "12,345.5", dates "14 Ọktoba 2026",
  times "20:05"; plural category `other` **only**. Chrome lacks Igbo's data; the app writes it from Node's
  (`scripts/locale-fallback.mjs`, ig-NG).

Not reached: an Igbo ceramics course page, an SDS in Igbo, Nigerian law in Igbo.

## 1. Style sheet

**Letters and NFC.** The dotted vowels and ṅ are letters of their own, never plain i o u n: **ị** (U+1ECB), **ọ**
(U+1ECD), **ụ** (U+1EE5), **ṅ** (U+1E45), and their capitals Ị Ọ Ụ Ṅ, precomposed (NFC). Digraphs _ch gb gh gw kp kw
nw ny sh_ as written. Tone marks are **not** written in running text (standard practice), only where two words would
otherwise be confused in a warning; then high tone acute, low tone grave, on the precomposed letter, NFC
(_ọ́_ = ọ + U+0301).

**Register.** Respectful and plain: one reader addressed as _gị_ / the imperative singular ("Họrọ ihe eji arụ ọrụ.",
"Fụchaa glaze ugboro abụọ."). The plural _unu_ for one reader sounds formal-distant in software; **Native check**.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the imperative: "Chekwaa", "Chekwaa dịka mbipụta", "Bipụta", "Tụlee", "Tinye ihe",
  "Hichapụ", "Ee, wepụ". No full stop.
- Headings and tabs: a noun phrase ("Usoro glaze", "Ntọala", "Ndekọ ọkụ").
- Field labels: a noun, with the colon where the English has one.
- Ongoing actions: "Na-ewepụ…", "Na-ebugo…".

**Capitalisation.** Sentence case; capital dotted letters precomposed (Ọ, not O + combining dot).

**Punctuation and spacing.** Latin, as English. Ranges: en dash, unit once.

**Numbers.** Digits 0–9 always. Decimal **point** (1.5), thousands with a comma (12,500 g); four-digit temperatures as
the English writes them (1222 °C). Dates as the app prints them. The 24-hour clock (20:00).

**Plural forms.** CLDR ig has only `other`: every plural message has a single `other` form with `#` (as Japanese).
Igbo nouns do not change for the plural; the number says it:

```
{count, plural, other {Agbakwunyela ihe #}}
```

**Cones.** The loan **cone** ("cone 6", "gbaa ọkụ ruo cone 6"). Seger and SK cones never converted. **Native check**.

**The unity formula.** "UMF (unity molecular formula)" at first use. English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** **Native check** on all.

| English                                   | ig                                              |
| ----------------------------------------- | ----------------------------------------------- |
| Compare                                   | Tụlee                                           |
| Settings                                  | Ntọala                                          |
| Library                                   | Ọbá akwụkwọ                                     |
| My materials                              | Ihe m                                           |
| Glazing basics                            | Ntọala glaze                                    |
| How to make a glaze                       | Otu esi eme glaze                               |
| Safe mixing and ventilation               | Ịgwakọta n'enweghị ihe ize ndụ na ikuku dị ọcha |
| Firing a basic kiln                       | Ịgba ọkụ na kiln dị mfe                         |
| Don't poison your family                  | **Ewela nsí gbuo ezinụlọ gị**                   |
| Learn with John Britt's free glaze course | Mụta na nkuzi glaze n'efu nke John Britt        |

**Pitfalls.**

- _agba_ / _ụcha_ is colour or paint: never "glaze".
- A kiln is not _ekwu_ (the cooking hearth) or an oven: keep **kiln** with a gloss (_ebe a na-agba ite ọkụ_) at first
  use. **Native check**.
- _ala_ is soil and land; clay is **ụrọ**.
- No settled Igbo word for the metal lead was found (dictionaries vary; the English "lead" also means "to lead"):
  write **lead (Pb)** as a loan, with the symbol in every warning. **Native check**.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see.

### 2.1 Glaze, materials and chemistry

| English                        | ig                                      | Notes                  |
| ------------------------------ | --------------------------------------- | ---------------------- |
| glaze **show English**         | glaze                                   | Loan. **Native check** |
| UMF, LOI, SG                   | UMF, LOI, SG                            | Kept.                  |
| oxide                          | oxide                                   | Loan.                  |
| gloss, matte                   | na-egbuke egbuke, anaghị egbuke (matte) | **Native check**       |
| raw materials                  | ihe eji arụ ọrụ; ihe                    | **Native check**       |
| feldspar, kaolin, silica, frit | feldspar, kaolin, silica, frit          | Loans.                 |
| colorant                       | ihe na-enye agba                        | **Native check**       |
| lead, barium, cadmium          | lead (Pb), barium, cadmium              | Loans; symbols kept.   |

### 2.2 Clay, ware, kilns and firing

| English                           | ig                                | Notes                     |
| --------------------------------- | --------------------------------- | ------------------------- |
| pottery, potter                   | ịkpụ ite; ọkpụ ite                | Echeruo. **Native check** |
| clay                              | ụrọ                               | Echeruo.                  |
| pot                               | ite                               | Echeruo.                  |
| earthenware, stoneware, porcelain | earthenware, stoneware, porcelain | Loans.                    |
| bisque                            | bisque (ọkụ mbụ)                  | **Native check**          |
| kiln                              | kiln                              | Loan. **Native check**    |
| firing, to fire                   | ịgba ọkụ; gbaa ọkụ                | **Native check**          |
| cooling                           | ịjụ oyi                           | **Native check**          |

### 2.3 Defects and making

| English   | ig                        | Notes            |
| --------- | ------------------------- | ---------------- |
| crazing   | crazing (obere mgbawa)    | **Native check** |
| leaching  | leaching (ọpụpụ nke lead) | **Native check** |
| batch     | batch                     | Loan.            |
| scale     | ihe ọtụtụ                 | **Native check** |
| sieve     | nyọ (verb); ihe nyọ       | **Native check** |
| test tile | test tile                 | Loan.            |

### 2.4 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English and digits.

| English                       | ig                        | Notes                                         |
| ----------------------------- | ------------------------- | --------------------------------------------- |
| dust                          | ájá; uzuzu                | Echeruo. **Native check**                     |
| respirable crystalline silica | uzuzu silica a na-eku ume | **Native check**                              |
| silicosis                     | silicosis (ọrịa ngụgụ)    | **Native check**                              |
| respirator                    | respirator                | Loan.                                         |
| poison, toxic                 | nsí; nwere nsí            | Echeruo.                                      |
| food safe                     | dị mma maka nri           | **Native check**                              |
| lead-free                     | enweghị lead (lead-free)  | **Native check**                              |
| at most / no more than        | agaghị karịa              | "less than" is _erughị_: never for "at most". |
| at least                      | opekata mpe               |                                               |

**Who to call.** Nigeria is not in the region data: no number is named. Nigeria 112 is **not verified** on an official
page; no poison line confirmed.

### 2.5 The app's own words

| English              | ig                                       |
| -------------------- | ---------------------------------------- |
| recipe               | usoro (usoro glaze)                      |
| Save, Save as a copy | Chekwaa, Chekwaa dịka mbipụta            |
| Delete, Remove       | Hichapụ, Wepụ                            |
| Cancel               | Kagbuo                                   |
| Sign in, Sign out    | Banye, Pụọ                               |
| account, password    | akaụntụ, okwuntughe                      |
| Translation notice   | "AI sụgharịrị ibe a site n'asụsụ Bekee." |

**Native check** on the whole table.

## 3. Never translated

Formulas, cone numbers, units, codes, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG, Orton, Seger,
HEPA, FFP2/FFP3, N95, GHS codes**; Glazecalc.

## 4. Choices for the owner and a native potter

1. **lead** as an English loan with (Pb): no Igbo word confirmed. A native reader to supply one.
2. **Tone marks** left out of running text (standard): confirm.
3. **_gị_ (singular)** for the reader: confirm.
