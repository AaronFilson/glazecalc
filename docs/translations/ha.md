# Hausa: jagorar salo da ƙamus (style sheet and glossary)

The rules and terms for translating Glazecalc into Hausa (`ha`), standard Hausa (Kano-based, as the BBC Hausa, VOA Hausa
and Nigerian schools write it) in the Latin script (_boko_), for potters in Nigeria and Niger. Read
[README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term. Every ha message and guide
follows this page: one Hausa word for one thing. Neither Nigeria nor Niger has a region in the app yet; both fire by
temperature (°C) by default.

**Notice.** Hausa is a `plainNotice` language (`lib/regions/languages.js`), as ga, mt, sw and am: machine translation
of Hausa is weak (docs/i18n-plan.md, "After the EU"), so the notice says so plainly, points to the English, and a line
of it stays on every page once closed.

**What the sources could and could not give** (research 2026-11-01). Hausa has a strong pottery tradition (_tukwane_,
women potters of Kano, Zaria and Niger; Abuja's Ladi Kwali Pottery Centre, Ladi Kwali being a Gwari potter) with
everyday words for clay, pot, firing and the potter (_yumɓu_, _tukunya_, _gasa_, _maginiya_ / _magini_). Studio glaze
chemistry is taught in English (Ahmadu Bello University Zaria, Kano's polytechnics), so almost every technical term is an
**English loan**, written in Latin letters as English spells it, with a short Hausa gloss. Rows with no source read
today are **Native check**; the owner's ruling of 2026-11-01 holds.

Main sources, cited below by short name:

- **Bargery / Newman**: G. P. Bargery's _Hausa–English Dictionary_ (1934) and Paul Newman's _Modern Hausa–English
  Dictionary_ (Newman and Newman) and Roxana Ma Newman's _English–Hausa Dictionary_: everyday words (_yumɓu_, _tukunya_,
  _ƙura_, _guba_, _darma_). Known standard works; not re-read online today.
- **CNHN**: the Centre for the Study of Nigerian Languages (Bayero University Kano) and its Hausa spelling rules (hooked
  letters ɓ ɗ ƙ, ʼy).
- **BBC**: BBC Hausa's usage for science and health words.
- **MS / Google**: Microsoft's Hausa terminology and Google's Hausa interface (_Ajiye_ Save, _Share_ Delete, _Soke_
  Cancel, _Saituna_ Settings, _Shiga_ / _Fita_). **Native check**.
- **CLDR**: Node 24 `Intl` for ha (scratch/round10/c-l34/intl-and-fonts.mjs): "12,345.5" (comma for thousands, decimal
  **point**), dates "14 Oktoba, 2026", times "20:05"; plural categories `one` (1 only) and `other`. Chrome lacks Hausa's
  data; the app writes it from Node's (`scripts/locale-fallback.mjs`, ha-NG).

Not reached: any Hausa ceramics course page, any SDS in Hausa, Nigeria's occupational safety law in Hausa (published in
English).

## 1. Style sheet

**Script and spelling.** Latin (_boko_), NFC. The hooked letters are their own letters, never plain b d k y: **ɓ**
(U+0253, Ɓ U+0181), **ɗ** (U+0257, Ɗ U+018A), **ƙ** (U+0199, Ƙ U+0198). The glottalised y: Nigeria writes **ʼy**
(U+02BC then y: _ʼya'ya_), Niger writes **ƴ** (U+01B4); this sheet follows Nigeria's ʼy. Never an ASCII apostrophe
for the hook letters' sounds. Tone and vowel length are **not** written (standard practice), apart from a dictionary
citation.

**Register.** Respectful and plain. Buttons and instructions in the **imperative**, which Hausa does not mark for
gender ("Zaɓi kayan aiki.", "Tace glaze sau biyu."). Where a pronoun is needed, the plural _ku_ (respectful, and
neither man's _ka_ nor woman's _ki_): "Kuna iya…". **Native check**.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the imperative: "Ajiye", "Ajiye a matsayin kwafi", "Buga", "Kwatanta", "Ƙara kaya",
  "Share", "Eh, cire". No full stop.
- Headings, page titles, tabs and menus: a noun phrase ("Girke-girken glaze", "Saituna", "Bayanan gasa").
- Field labels: a noun, with the colon where the English has one ("Sunan kaya:").
- Ongoing actions: "Ana cirewa…", "Ana lodawa…".
- Errors: "Could not discard the trial." → "Ba a iya watsar da gwajin ba." (the negative _ba … ba_ frames the clause).

**Capitalisation.** Sentence case. Months and days with a capital (_Oktoba_, _Litinin_). Trade names keep their form.

**Punctuation and spacing.** Latin, as English: "…" quotations, no space before ; : ! ?. Ranges: en dash, unit once.

**Numbers.** Digits 0–9 always. Decimal **point** (1.5), thousands with a comma (12,500 g), as CLDR ha and the app print;
four-digit temperatures as the English writes them (1222 °C). A space before °C; none before %. Dates as the app prints
them ("14 Oktoba, 2026"). The 24-hour clock (20:00); never "ƙarfe takwas na dare" for 20:00 (the check would read 8).

**Plural forms.** CLDR ha: `one` (1 only) and `other`, as English; no `=1` needed. Hausa plurals are often irregular
(_tukunya_ → _tukwane_): write each form in full.

```
{count, plural, one {Tukunya # an gasa} other {Tukwane # an gasa}}
```

**Cones.** **kwan Orton** is not established: keep the loan **cone** ("cone 6", "gasa har zuwa cone 6"), with
_mazugi_ as a gloss at first use. **Native check**. Seger and SK cones never converted.

**The unity formula.** "UMF (unity molecular formula)" at first use, then UMF. English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** **Native check** on all.

| English                                   | ha                                             |
| ----------------------------------------- | ---------------------------------------------- |
| Compare                                   | Kwatanta                                       |
| Settings                                  | Saituna                                        |
| Library                                   | Laburare                                       |
| My materials                              | Kayana                                         |
| Glazing basics                            | Tushen glaze                                   |
| How to make a glaze                       | Yadda ake haɗa glaze                           |
| Safe mixing and ventilation               | Haɗawa cikin aminci da iska mai kyau           |
| Firing a basic kiln                       | Gasa a cikin murhu mai sauƙi                   |
| Don't poison your family                  | **Kada ka sa wa iyalinka guba**                |
| Learn with John Britt's free glaze course | Koyi da kwas ɗin glaze na kyauta na John Britt |

The home-safety title keeps the owner's blunt form (here the singular _ka_ is the idiom's; **Native check**).

**Pitfalls.**

- _fenti_ is paint: never "glaze". _glaze_ stays a loan.
- A kiln is not a kitchen stove (_murhu_ is a hearth or stove): write **kiln (murhun gasa tukwane)** at first use, then
  _kiln_. **Native check**.
- _ƙasa_ is soil and ground; clay is **yumɓu** (also spelt _yumbu_ in older print; write _yumɓu_).
- _darma_ is lead, and in some speech also tin; _harsashi_ is a bullet. Write **darma (lead, Pb)** at first use on each
  page and keep **(Pb)** in every warning.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see.

### 2.1 Glaze and its chemistry

| English                       | ha                            | Notes                  |
| ----------------------------- | ----------------------------- | ---------------------- |
| glaze **show English**        | glaze; shafa glaze (verb)     | Loan. **Native check** |
| unity molecular formula (UMF) | UMF                           | Loan.                  |
| loss on ignition (LOI)        | LOI (raguwar nauyi a wuta)    | **Native check**       |
| oxide                         | oxide (ogsaid)                | Loan. **Native check** |
| mole                          | mole                          | Loan.                  |
| thermal expansion             | faɗaɗawa saboda zafi          | **Native check**       |
| gloss, satin, matte           | mai sheƙi, satin, marar sheƙi | **Native check**       |
| flux                          | flux (mai narkarwa)           | **Native check**       |

### 2.2 Materials and oxides

| English               | ha                                | Notes                          |
| --------------------- | --------------------------------- | ------------------------------ |
| raw materials         | kayan aiki; kaya                  | **Native check**               |
| feldspar, kaolin      | feldspar, kaolin                  | Loans, as on the bag.          |
| silica                | silica                            | Loan.                          |
| frit                  | frit                              | Loan.                          |
| colorant, stain       | mai launi; stain                  | **Native check**               |
| lead, barium, cadmium | darma (lead, Pb), barium, cadmium | Symbols kept. **Native check** |

### 2.3 Clay, ware and firing

| English                           | ha                                | Notes                   |
| --------------------------------- | --------------------------------- | ----------------------- |
| pottery, potter                   | ginin tukwane; maginiya / magini  | Newman.                 |
| clay                              | yumɓu                             | Newman.                 |
| pot                               | tukunya (pl. tukwane)             | Newman.                 |
| earthenware, stoneware, porcelain | earthenware, stoneware, porcelain | Loans. **Native check** |
| bisque                            | bisque (gasa ta farko)            | **Native check**        |
| glaze firing                      | gasa glaze                        | **Native check**        |
| slip                              | slip (yumɓu mai ruwa)             | **Native check**        |

### 2.4 Kilns, cones and firing

| English              | ha                         | Notes            |
| -------------------- | -------------------------- | ---------------- |
| kiln                 | kiln (murhun gasa tukwane) | **Native check** |
| firing, to fire      | gasa                       | Newman.          |
| cone                 | cone (mazugi)              | **Native check** |
| oxidation, reduction | oxidation, reduction       | Loans.           |
| cooling              | hucewa                     | **Native check** |

### 2.5 Defects and making

| English          | ha                            | Notes            |
| ---------------- | ----------------------------- | ---------------- |
| crazing          | crazing (ƙananan tsage-tsage) | **Native check** |
| crawling         | crawling                      | Loan.            |
| leaching         | zubar ƙarfe (leaching)        | **Native check** |
| batch            | batch (haɗi)                  | **Native check** |
| scale            | sikeli                        | Loan, everyday.  |
| sieve            | rariya; tace (verb)           | Newman.          |
| specific gravity | SG                            | Loan.            |
| test tile        | test tile (tayil ɗin gwaji)   | **Native check** |

### 2.6 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English and digits (Pb, BaCO₃, 0.025 mg/m³).

| English                       | ha                                   | Notes                                          |
| ----------------------------- | ------------------------------------ | ---------------------------------------------- |
| dust                          | ƙura                                 | Newman.                                        |
| respirable crystalline silica | ƙurar silica da ake shaƙa            | **Native check**                               |
| silicosis                     | silicosis (cutar huhu)               | **Native check**                               |
| respirator                    | respirator (abin rufe hanci da baki) | **Native check**                               |
| poison, toxic                 | guba; mai guba                       | Newman.                                        |
| food safe                     | lafiya ga abinci                     | **Native check**                               |
| lead-free                     | babu darma (lead-free)               | **Native check**                               |
| at most / no more than        | bai wuce … ba; mafi yawa             | "less than" is _ƙasa da_: never for "at most". |
| at least                      | aƙalla                               |                                                |

**Who to call.** The region data has neither Nigeria nor Niger, so the translation names no number. For the record:

| Country | Number | Status                                                                     |
| ------- | ------ | -------------------------------------------------------------------------- |
| Nigeria | 112    | **Not verified** on an official page (secondary sources). Not in the data. |
| Niger   | none   | No number read on an official page. Not in the data.                       |

No poison line confirmed in either country.

### 2.7 The app's own words

| English              | ha                                            |
| -------------------- | --------------------------------------------- |
| recipe               | girke-girke (of a glaze: tsarin glaze)        |
| Save, Save as a copy | Ajiye, Ajiye a matsayin kwafi                 |
| Delete, Remove       | Share, Cire                                   |
| Cancel               | Soke                                          |
| Sign in, Sign out    | Shiga, Fita                                   |
| account, password    | asusu, kalmar sirri                           |
| Trash                | Kwandon shara                                 |
| Translation notice   | "AI ce ta fassara wannan shafi daga Turanci." |

**Native check** on the whole table.

## 3. Never translated

Formulas, cone numbers, units, codes and standards, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG,
Orton, Seger, HEPA, FFP2/FFP3, N95, GHS codes (H350)**; Glazecalc.

## 4. Choices for the owner and a native potter

1. **ʼy (Nigeria) or ƴ (Niger)**: Nigeria's ʼy chosen, as most readers are Nigerian. Confirm.
2. **"recipe"**: _girke-girke_ is a cooking recipe; _tsarin glaze_ may read better for a glaze. A Hausa potter to choose.
3. **kiln and cone** as English loans with glosses: confirm.
