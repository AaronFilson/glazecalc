# Afrikaans: stylgids en woordelys (style sheet and glossary)

The rules and terms for translating Glazecalc into Afrikaans (`af`), standard Afrikaans as the _Afrikaanse Woordelys en
Spelreëls_ (AWS) spells it, for potters in South Africa and Namibia. Read [README.md](README.md) first;
[terms.md](terms.md) gives the meaning of every English term. Every af message and guide follows this page: one
Afrikaans word for one thing. South Africa's region (ZA) fires by Orton cones and °C; Namibia has no region in the app
yet.

**Notice.** Afrikaans is **not** a `plainNotice` language (`lib/regions/languages.js`): machine translation of Afrikaans
is strong (close to Dutch), so it has the standard notice, as the plan says (scratch/round10/c-africa-latam/plan.md,
row 5).

**What the sources could and could not give** (research 2026-11-01). Afrikaans, unlike the other African languages of
this round, has its own ceramics words from a long studio and school tradition (Ceramics Southern Africa, the old
Technikon and university ceramics departments, Afrikaans hobby books): _glasuur_, _oond_, _erdewerk_, _steengoed_,
_porselein_, _veldspaat_, _kaolien_, _biskwiet_. Most are close to Dutch (docs/translations/nl.md), which is a useful
check but not a source: where Afrikaans differs from Dutch, Afrikaans wins. Today's suppliers in South Africa
(Potclays, Ceramic Matters, Cape suppliers) sell in English, so bag names are English. Rows with no source read today
are **Native check**; the owner's ruling of 2026-11-01 holds: native checks wait for readers' corrections and do not
block the wave.

Main sources, cited below by short name:

- **AWS**: _Afrikaanse Woordelys en Spelreëls_ (Die Taalkommissie, 2017 edition) for spelling, compounds and hyphens.
  Known standard work; not re-read online today.
- **HAT**: _Verklarende Handwoordeboek van die Afrikaanse Taal_, for everyday words (_klei_, _pot_, _oond_, _stof_,
  _gif_). Known standard work.
- **nl.md**: the Dutch sheet of this repository, as a cross-check for chemistry and ceramics terms.
- **MS**: Microsoft's Afrikaans terminology (Windows, Office): _Stoor_, _Skrap_, _Kanselleer_, _Instellings_, _Meld
  aan_ / _Meld af_. **Native check** against the live portal.
- **CLDR**: the app's `Intl` for af (Node 24, scratch/round10/c-l34/intl-and-fonts.mjs): "12 345,5" (a space for
  thousands, decimal **comma**), dates "14 Oktober 2026", 24-hour times "20:05" for af-ZA (af-NA prints "8:05 nm."),
  plural categories `one` (1 only) and `other`. Chrome has Afrikaans' data, so no fallback is needed.
- **Region data**: South Africa's emergency numbers (10177 ambulance, 10111 police, 112 from a mobile) and the
  Poisons Information Helpline 0861 555 777, all verified 2026-10-30 (`lib/regions/safety.js`).

Not reached: an Afrikaans SDS, the Afrikaans text of South Africa's Hazardous Chemical Agents Regulations (published in
English), any current Afrikaans ceramics course page.

## 1. Style sheet

**Register.** Direct and friendly, addressing one reader as _jy_: "Kies 'n grondstof.", "Sif die glasuur twee keer.",
"Dra 'n respirator." Not the formal _u_, which reads stiff in software today (Microsoft and Google use _jy_). **Native
check**. "We" (the app) as _ons_ where the English has it.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the **imperative** (the bare verb): "Stoor", "Stoor as afskrif", "Druk", "Vergelyk",
  "Voeg grondstof by", "Skrap", "Ja, verwyder". No full stop.
- Instructions in sentences: the imperative ("Tik die hoeveelheid in (0 is reg).").
- Headings, page titles, tabs and menus: a noun phrase ("Glasuurresepte", "Instellings", "Bakrekords").
- Field labels: a noun, with the colon where the English has one ("Naam van grondstof:").
- Ongoing actions: "Verwyder tans…", "Laai tans…".
- Errors: "Could not discard the trial." → "Kon nie die toets weggooi nie." (the double negative _nie … nie_ is
  correct Afrikaans, never a mistake to fix).

**Capitalisation.** Sentence case. Months, days and language names take **no** capital in Afrikaans (_oktober_ in
running text; the app's Intl writes "14 Oktober 2026" in dates, leave that as it prints). Trade names keep their form.
_'n_ at the start of a sentence: the next word takes the capital ("'n Glasuur…"). Never "'N".

**Compounds.** Afrikaans writes compounds as one word (AWS): _glasuurresep_, _glasuurbak_, _toetsteël_, _oondrak_.
A hyphen where vowels collide or with an abbreviation, number or English loan: "UMF-waarde", "kegel-6-glasuur" (or
"glasuur vir kegel 6"), "Orton-kegel".

**Punctuation and spacing.** Latin, as English. Quotation marks "…" (and '…' inside). No space before ; : ! ?. Ranges:
en dash, unit once: "1222–1240 °C".

**Numbers.** Digits 0–9 always. Decimal **comma** (1,5), thousands with a **non-breaking** space U+00A0 (12 500 g; a plain space reads as two numbers to the check), as CLDR af and
the app print; four-digit temperatures as the English writes them (1222 °C, no space inside). A space before °C and
unit symbols; none before % (15%). Dates "14 Oktober 2026". The 24-hour clock (20:00). Where the English writes a
number as a word, it stays a word (_twee lae_).

**Plural forms.** CLDR af: `one` (exactly 1) and `other`, as English; no `=1` needed.

```
{count, plural, one {# grondstof bygevoeg} other {# grondstowwe bygevoeg}}
```

**Cones.** **Orton-kegel**: "cone 6" → "kegel 6"; "cone 06" → "kegel 06"; "fire to cone 6" → "bak tot kegel 6".
Seger and SK cones are other series, never converted. **Native check** on _kegel_ (some potters say _keël_; _kegel_ is
the AWS spelling of the ceramic sense).

**The unity formula.** **Seger-formule (UMF)** at first use, then "UMF". English kept: UMF, LOI, SG.

**Feature names and the guides' titles.**

| English                                   | af                                          |
| ----------------------------------------- | ------------------------------------------- |
| Compare                                   | Vergelyk                                    |
| Settings                                  | Instellings                                 |
| Library                                   | Biblioteek                                  |
| My materials                              | My grondstowwe                              |
| Glazing basics                            | Glasuur: die basiese beginsels              |
| How to make a glaze                       | Hoe om 'n glasuur te maak                   |
| Safe mixing and ventilation               | Veilig meng en ventilasie                   |
| Firing a basic kiln                       | 'n Eenvoudige oond bak                      |
| Don't poison your family                  | **Moenie jou gesin vergiftig nie**          |
| Learn with John Britt's free glaze course | Leer met John Britt se gratis glasuurkursus |

The home-safety title keeps the owner's blunt form. **Native check** on all titles.

**Pitfalls.**

- _verf_ is paint: never "glaze". _glasuur_ is glaze; _glaseer_ the verb.
- _oond_ (kiln) is also a kitchen oven: say _keramiekoond_ or _pottebakkersoond_ where it could be read so (the
  first time on a page); never _stoof_.
- _klei_ (clay) vs _grond_ (soil).
- _silika_ (silica) ≠ _silikoon_ (silicone).
- _lood_ is the metal lead (pencil is _potlood_): no other common meaning, so no "(Pb)" is required; keep "Pb"
  wherever the English gives the symbol.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see.

### 2.1 Glaze and its chemistry

| English                       | af                      | Notes                               |
| ----------------------------- | ----------------------- | ----------------------------------- |
| glaze **show English**        | glasuur; glaseer (verb) | HAT; nl _glazuur_.                  |
| unity molecular formula (UMF) | Seger-formule (UMF)     | **Native check**                    |
| loss on ignition (LOI)        | gloeiverlies (LOI)      | nl _gloeiverlies_. **Native check** |
| oxide                         | oksied                  | School chemistry.                   |
| mole                          | mol                     | School chemistry.                   |
| thermal expansion             | termiese uitsetting     |                                     |
| gloss, satin, matte           | blink, satyn, mat       | **Native check**                    |
| flux                          | vloeimiddel             | **Native check**                    |

### 2.2 Materials and oxides

| English               | af                    | Notes                        |
| --------------------- | --------------------- | ---------------------------- |
| raw materials         | grondstowwe           | "Materials" → "Grondstowwe". |
| feldspar              | veldspaat             | HAT.                         |
| kaolin, ball clay     | kaolien; balklei      | _balklei_ **Native check**   |
| silica, flint         | silika                | School chemistry.            |
| whiting               | kalksteen (whiting)   | **Native check**             |
| frit                  | frit                  | Loan.                        |
| colorant, stain       | kleurstof; stain      | **Native check**             |
| lead, barium, cadmium | lood, barium, kadmium | Symbols kept (Pb, Ba, Cd).   |
| lithium, boron, zinc  | litium, boor, sink    | School chemistry.            |

### 2.3 Clay, ware and firing stages

| English                           | af                             | Notes                             |
| --------------------------------- | ------------------------------ | --------------------------------- |
| pottery, potter                   | pottebakkery; pottebakker      | HAT.                              |
| clay, clay body                   | klei; kleiliggaam              | **Native check** on _kleiliggaam_ |
| earthenware, stoneware, porcelain | erdewerk, steengoed, porselein | HAT.                              |
| bisque                            | biskwiet; biskwietbak (firing) | **Native check**                  |
| glaze firing                      | glasuurbak                     | **Native check**                  |
| slip, engobe                      | glipklei (slip); engobe        | **Native check**                  |

### 2.4 Kilns, cones and firing

| English              | af                   | Notes                                    |
| -------------------- | -------------------- | ---------------------------------------- |
| kiln                 | oond (keramiekoond)  | HAT.                                     |
| electric / gas kiln  | elektriese / gasoond |                                          |
| firing, to fire      | bak; die bak         | **Native check** (_brand_ is also heard) |
| cone                 | kegel                | **Native check**                         |
| kiln shelf           | oondrak              | **Native check**                         |
| oxidation, reduction | oksidasie, reduksie  |                                          |
| cooling              | afkoeling            |                                          |

### 2.5 Defects

| English   | af                       | Notes            |
| --------- | ------------------------ | ---------------- |
| crazing   | haarlynbarsies (crazing) | **Native check** |
| crawling  | kruip (crawling)         | **Native check** |
| pinholing | speldeprikgaatjies       | **Native check** |
| leaching  | uitloging                | **Native check** |

### 2.6 Making and applying glaze

| English          | af                   | Notes            |
| ---------------- | -------------------- | ---------------- |
| batch            | mengsel; bondel      | **Native check** |
| scale            | skaal                |                  |
| sieve            | sif                  |                  |
| specific gravity | soortlike gewig (SG) |                  |
| test tile        | toetsteël            | **Native check** |

### 2.7 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures as the
English writes them (Pb, BaCO₃, 0,025 mg/m³ with the decimal comma).

| English                       | af                            | Notes                                            |
| ----------------------------- | ----------------------------- | ------------------------------------------------ |
| dust                          | stof                          |                                                  |
| respirable crystalline silica | inasembare kristallyne silika | **Native check**                                 |
| silicosis                     | silikose                      |                                                  |
| respirator                    | respirator; asemhalingsmasker | **Native check**                                 |
| poison, toxic                 | gif; giftig                   |                                                  |
| food safe                     | voedselveilig                 |                                                  |
| lead-free                     | loodvry                       |                                                  |
| at most / no more than        | hoogstens; nie meer as … nie  | "less than" is _minder as_: never for "at most". |
| at least                      | ten minste                    |                                                  |

**Who to call.** The translation names only what the English and the region data print. For the record:

| Country      | Number                                      | Status                                                          |
| ------------ | ------------------------------------------- | --------------------------------------------------------------- |
| South Africa | 10177 (ambulance), 10111 (police), 112      | Verified 2026-10-30 (`lib/regions/safety.js`)                   |
| South Africa | 0861 555 777 (Poisons Information Helpline) | Verified 2026-10-30                                             |
| Namibia      | none                                        | No number read on an official page; Namibia is not in the data. |

### 2.8 The app's own words

| English              | af                                              |
| -------------------- | ----------------------------------------------- |
| recipe               | resep (glasuurresep)                            |
| Save, Save as a copy | Stoor, Stoor as afskrif                         |
| Delete, Remove       | Skrap, Verwyder                                 |
| Cancel               | Kanselleer                                      |
| Sign in, Sign out    | Meld aan, Meld af                               |
| Settings             | Instellings                                     |
| account, password    | rekening, wagwoord                              |
| Trash                | Asblik                                          |
| Translation notice   | "Hierdie bladsy is deur KI uit Engels vertaal." |

**Native check** on the whole table (MS).

## 3. Never translated

Formulas, cone numbers, units, codes and standards, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG,
Orton, Seger, HEPA, FFP2/FFP3, N95, GHS codes (H350)**; Glazecalc.

## 4. Search terms

**Native check**: _glasuur sakrekenaar_, _glasuurresepte_, _pottebakkery Suid-Afrika_.

## 5. Choices for the owner and a native potter

1. **_jy_ or _u_**: _jy_ chosen (current software use). Confirm.
2. **kegel vs keël** for a pyrometric cone: _kegel_ chosen. A South African potter to confirm.
3. Most South African potters read English: Afrikaans is offered for those who prefer it, not as ZA's default.
