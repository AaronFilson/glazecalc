# Yorùbá: ìtọ́sọ́nà ọ̀nà kíkọ àti atúmọ̀ ọ̀rọ̀ (style sheet and glossary)

The rules and terms for translating Glazecalc into Yoruba (`yo`), standard Yoruba (Yorùbá àjùmọ̀lò) in the Nigerian
orthography, **with every tone mark written**, for potters in Nigeria (and Benin, whose Yoruba readers can read it).
Read [README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term. Every yo message and
guide follows this page. Nigeria has no region in the app yet; it fires by temperature (°C) by default.

**Notice.** Yoruba is a `plainNotice` language (`lib/regions/languages.js`): machine translation of Yoruba is weak,
above all at tone marks (docs/i18n-plan.md, "After the EU").

**What the sources could and could not give** (research 2026-11-01). Yoruba pottery (Ìlọrin, Abẹ́òkúta, Ọ̀yọ́; women
potters, open firing) gives everyday words: _amọ̀_ (clay), _ìkòkò_ (pot), _amọ̀kòkò_ (potter), _sun_ (to fire). Studio
glaze chemistry is taught in English (Obafemi Awolowo University's and Yaba College of Technology's ceramics
programmes), so most technical terms are **English loans** in Latin letters, with a short Yoruba gloss. Rows with no
source read today are **Native check**; the owner's ruling of 2026-11-01 holds.

Main sources, cited below by short name:

- **Abraham**: R. C. Abraham, _Dictionary of Modern Yoruba_ (1958), and the University of Lagos / Ìbàdàn
  _Yorùbá Dictionary_ projects: everyday words with tones (_amọ̀_, _ìkòkò_, _eruku_, _májèlé_, _òjé_). Known works; not
  re-read online today.
- **Orthography**: the Yoruba Orthography Committee's standard (1966, 1974) as Nigerian schools teach it: ẹ ọ ṣ with
  a dot below, high tone acute, low tone grave, mid tone unmarked, syllabic n/m toned (ń, ǹ, ḿ).
- **Google / MS**: Google's and Microsoft's Yoruba interfaces (_Fi pamọ́_ Save, _Pa rẹ́_ Delete, _Fagilé_ Cancel, _Wọlé_ /
  _Jáde_). **Native check**.
- **CLDR**: Node 24 `Intl` for yo (scratch/round10/c-l34/intl-and-fonts.mjs): "12,345.5", dates "14 Oṣù Ọ̀wàrà 2026",
  times **"20:5"** (CLDR yo's short time has an unpadded minute: an owner question, section 4); plural category
  `other` **only**. Chrome lacks Yoruba's data; the app writes it from Node's (`scripts/locale-fallback.mjs`, yo-NG).

Not reached: any Yoruba ceramics course page, an SDS in Yoruba, Nigerian law in Yoruba.

## 1. Style sheet

**Tone marks and NFC.** Every word carries its full tone marks and dots, always, in buttons and headings too: a word
without them is a different word or none (_òjé_ lead, _oje_ sap). Text is stored in **NFC**: precomposed letters where
Unicode has them (á à é è í ì ó ò ú ù ń ẹ ọ ṣ), and where it has none, the dotted letter followed by the combining tone
mark: **ẹ́** = ẹ U+1EB9 + U+0301, **ẹ̀** = ẹ + U+0300, **ọ́** / **ọ̀** likewise, **ḿ** U+1E3F. Never a tone mark before
the dot (NFC orders them: dot below first), never a combining dot on a precomposed accented letter, never a Vietnamese
letter (ệ, ộ) in their place. The check reads the text in NFC (scripts/i18n-check.mjs).

**Register.** Respectful: the plural/honorific **ẹ** for "you" ("Ẹ yan ohun èlò.", "Ẹ sẹ́ glaze lẹ́ẹ̀mejì."), never the
familiar _o_. Buttons: the bare verb ("Fi pamọ́", "Pa rẹ́"). **Native check**.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the bare verb phrase: "Fi pamọ́", "Fi pamọ́ bí ẹ̀dà", "Tẹ̀ jáde", "Fi wé", "Ṣàfikún ohun
  èlò", "Pa rẹ́", "Bẹ́ẹ̀ni, yọ ọ́ kúrò". No full stop.
- Headings and tabs: a noun phrase ("Àwọn ìlànà glaze", "Ètò", "Àkọsílẹ̀ ìsun").
- Field labels: a noun, with the colon where the English has one.
- Ongoing actions: "Ó ń yọ kúrò…", "Ó ń gbé wọlé…".

**Capitalisation.** Sentence case; a capital on the letter, the tone mark kept (_Ọ̀wàrà_, _Èdè_). Trade names as they
are.

**Punctuation and spacing.** Latin, as English. Ranges: en dash, unit once.

**Numbers.** Digits 0–9 always, never the Yoruba counting words for a figure the English writes in digits. Decimal
**point** (1.5), thousands with a comma (12,500 g); four-digit temperatures as the English writes them (1222 °C). Dates
as the app prints them. The 24-hour clock (20:00), never "aago mẹ́jọ alẹ́" for 20:00.

**Plural forms.** CLDR yo has only `other`: every plural message has a single `other` form with `#` (as Japanese).
Yoruba marks the plural with _àwọn_ before the noun, or not at all after a number:

```
{count, plural, other {Ohun èlò # ni a fi kún un}}
```

**Cones.** The loan **cone** ("cone 6", "sun dé cone 6"). Seger and SK cones never converted. **Native check**.

**The unity formula.** "UMF (unity molecular formula)" at first use, then UMF. English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** **Native check** on all.

| English                                   | yo                                    |
| ----------------------------------------- | ------------------------------------- |
| Compare                                   | Fi wé                                 |
| Settings                                  | Ètò                                   |
| Library                                   | Ibi ìkówèésí                          |
| My materials                              | Àwọn ohun èlò mi                      |
| Glazing basics                            | Ìpìlẹ̀ glaze                           |
| How to make a glaze                       | Bí a ṣe ń ṣe glaze                    |
| Safe mixing and ventilation               | Pípò láìléwu àti afẹ́fẹ́ tó mọ́          |
| Firing a basic kiln                       | Sísun nínú kiln tí kò díjú            |
| Don't poison your family                  | **Ẹ má ṣe fi májèlé pa ìdílé yín**    |
| Learn with John Britt's free glaze course | Ẹ kọ́ pẹ̀lú ẹ̀kọ́ glaze ọ̀fẹ́ ti John Britt |

**Pitfalls.**

- _àwọ̀_ is colour and paint: never "glaze". _glaze_ stays a loan (gloss _ìdán amọ̀_ at first use; **Native check**).
- A kiln is not _ààrò_ (a hearth or cooking fire) or an oven: keep **kiln** with the gloss _iná ìsun amọ̀_ at first
  use. **Native check**.
- _ilẹ̀_ is soil; clay is **amọ̀**.
- Lead is **òjé**; untoned or mistoned it reads as another word (_oje_ sap or juice). Write **òjé (lead, Pb)** at first
  use on each page and keep **(Pb)** in every warning.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see.

### 2.1 Glaze, materials and chemistry

| English                        | yo                              | Notes                          |
| ------------------------------ | ------------------------------- | ------------------------------ |
| glaze **show English**         | glaze (ìdán amọ̀)                | Loan. **Native check**         |
| UMF, LOI, SG                   | UMF, LOI, SG                    | Kept.                          |
| oxide                          | oxide                           | Loan.                          |
| gloss, matte                   | dídán, láìdán (matte)           | **Native check**               |
| flux                           | flux (ohun tí ń yọ́ ọ)           | **Native check**               |
| raw materials                  | ohun èlò                        | **Native check**               |
| feldspar, kaolin, silica, frit | feldspar, kaolin, silica, frit  | Loans, as on the bag.          |
| colorant                       | ohun àwọ̀                        | **Native check**               |
| lead, barium, cadmium          | òjé (lead, Pb), barium, cadmium | Abraham (_òjé_). Symbols kept. |

### 2.2 Clay, ware, kilns and firing

| English                           | yo                                | Notes                   |
| --------------------------------- | --------------------------------- | ----------------------- |
| pottery, potter                   | iṣẹ́ amọ̀; amọ̀kòkò                  | Abraham.                |
| clay                              | amọ̀                               | Abraham.                |
| pot                               | ìkòkò                             | Abraham.                |
| earthenware, stoneware, porcelain | earthenware, stoneware, porcelain | Loans. **Native check** |
| bisque                            | bisque (ìsun àkọ́kọ́)               | **Native check**        |
| kiln                              | kiln (iná ìsun amọ̀)               | **Native check**        |
| firing, to fire                   | ìsun; sun                         | Abraham.                |
| cone                              | cone                              | Loan.                   |
| cooling                           | títutù                            | **Native check**        |

### 2.3 Defects and making

| English               | yo                                                            | Notes                                                                         |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| crazing               | crazing (ìfọ́ wẹ́wẹ́)                                            | **Native check**                                                              |
| leaching, leach test  | ìṣàn irin jáde (leaching); ìdánwò ìṣàn irin jáde (leach test) | Metals in general (lead, cadmium, barium), never lead alone. **Native check** |
| opaque, opacifier     | dínà ìmọ́lẹ̀ (opaque); ohun ìdínà ìmọ́lẹ̀ (opacifier)             | Stops light passing; never _ṣú_ / _ṣókùnkùn_ (dark). **Native check**         |
| dull, cloud(y), milky | dín dídán kù; rí bí wàrà                                      | Never _ṣú_ (darken). **Native check**                                         |
| soluble, dissolve     | yọ́ nínú omi (in water / the body)                             | Not melting in the kiln: say "nínú omi" or "nínú ara". **Native check**       |
| clear glaze           | glaze tí ó mọ́ kedere                                          | Transparent, never _funfun_ (white). **Native check**                         |
| kiln wash             | kiln wash (ohun ìbora pẹpẹ kiln)                              | The protective coating on kiln shelves. **Native check**                      |
| witness cone          | cone ẹlẹ́rìí (witness cone)                                    | **Native check**                                                              |
| inch, foot            | íǹṣì; ẹsẹ̀ bàtà                                                | Metric figure in brackets as the English gives it.                            |
| invalid               | kò tọ́                                                         | Not _kò bófin mu_ ("unlawful"); keep that only for unlawful content.          |
| batch                 | batch                                                         | Loan.                                                                         |
| scale                 | òṣùwọ̀n                                                        | Abraham.                                                                      |
| sieve                 | asẹ́; sẹ́ (verb)                                                | Abraham.                                                                      |
| test tile             | test tile (táílì ìdánwò)                                      | **Native check**                                                              |

### 2.4 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English and digits.

| English                       | yo                                      | Notes                                                         |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| dust                          | eruku                                   | Abraham.                                                      |
| respirable crystalline silica | eruku silica crystalline tí a ń mí sínú | Keep "crystalline". **Native check**                          |
| safety data sheet (SDS)       | ìwé ìsọfúnni ààbò                       | One form; not _ìwé ààbò_ or _ìwé dátà ààbò_. **Native check** |
| combustible                   | tí ó lè jóná                            | **Native check**                                              |
| early, too soon               | ní kùtùkùtù; ṣáájú àkókò                | Never "in the morning" or "on time". **Native check**         |
| less, fewer, reduce           | X tí ó dín kù; dín … kù                 | Never _díẹ̀ sí i_ ("a little more").                           |
| silicosis                     | silicosis (àrùn ẹ̀dọ̀fóró)                | **Native check**                                              |
| respirator                    | respirator (ìbòjú èémí)                 | **Native check**                                              |
| poison, toxic                 | májèlé; olóró                           | Abraham.                                                      |
| food safe                     | láìléwu fún oúnjẹ                       | **Native check**                                              |
| lead-free                     | láìní òjé (lead-free)                   | **Native check**                                              |
| at most / no more than        | kò ju … lọ; ó pọ̀ jù lọ                  | "less than" is _kéré sí_: never for "at most".                |
| at least                      | ó kéré tán                              |                                                               |

**Who to call.** Nigeria is not in the region data: no number is named. For the record: Nigeria 112, **not verified**
on an official page; no poison line confirmed.

### 2.5 The app's own words

| English              | yo                                       |
| -------------------- | ---------------------------------------- |
| recipe               | ìlànà (ìlànà glaze)                      |
| Save, Save as a copy | Fi pamọ́, Fi pamọ́ bí ẹ̀dà                  |
| Delete, Remove       | Pa rẹ́, Yọ kúrò                           |
| Cancel               | Fagilé                                   |
| Sign in, Sign out    | Wọlé, Jáde                               |
| account, password    | àkáǹtì, ọ̀rọ̀ aṣínà                        |
| Translation notice   | "AI ló túmọ̀ ojú-ìwé yìí láti èdè Gẹ̀ẹ́sì." |

**Native check** on the whole table.

## 3. Never translated

Formulas, cone numbers, units, codes, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG, Orton, Seger,
HEPA, FFP2/FFP3, N95, GHS codes**; Glazecalc.

## 4. Choices for the owner and a native potter

1. **CLDR's time "20:5"**: Node's (and so the fallback data's) short time for yo prints the minute without its zero.
   The app shows what Intl gives; a fix would be an override in `scripts/locale-fallback.mjs` (owner call; a CLDR bug
   report is the clean way).
2. **ẹ (honorific) for "you"**: chosen. Confirm.
3. **glaze, kiln, cone** as English loans with glosses: confirm.
