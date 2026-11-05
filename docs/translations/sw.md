# Kiswahili: mwongozo wa mtindo na faharasa (style sheet and glossary)

The rules and terms for translating Glazecalc into Swahili (`sw`), Kiswahili sanifu (standard Swahili) as Kenya and
Tanzania write it in schools, government and the press, for potters in Kenya, Tanzania and Uganda. Read
[README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term. Every sw message and guide
follows this page: one Swahili word for one thing. Kenya's region (KE) fires by temperature (°C); Tanzania and Uganda
have no region in the app yet.

**Notice.** Swahili is **not** a `plainNotice` language today (`lib/regions/languages.js`): the plan's default left it
on the standard notice, since machine translation of Swahili is middling rather than weak. This is an **owner
question** (section 6, item 1): with so many terms below marked Native check, the plain notice (as ga, mt, am) may be
the safer choice.

**What the sources could and could not give** (research 2026-10-31). No Kenyan or Tanzanian ceramics-supply catalogue
in Swahili was found: shops in Nairobi, Dar es Salaam and Kampala sell in English, and studio potters (Kenya's growing
studio scene, Kenyatta University's and the University of Nairobi's design departments) teach glaze chemistry in
English. Swahili has everyday words for clay, pot, firing and kiln from the traditional craft (_ufinyanzi_, _mfinyanzi_,
_udongo wa mfinyanzi_, _tanuru_, _kuchoma_), which are standard dictionary words (TUKI _Kamusi ya Kiswahili Sanifu_,
BAKITA). The glaze chemistry has none: almost every technical term below is an **English loan**, given in Latin letters
with a short Swahili gloss. Rows with no source read today are marked **Native check**; the owner's ruling of
2026-11-01 holds: native checks wait for real readers' corrections, and do not block the wave.

Main sources, cited below by short name:

- **TUKI**: Taasisi ya Uchunguzi wa Kiswahili (now TATAKI, University of Dar es Salaam), _Kamusi ya Kiswahili Sanifu_
  and _English–Swahili Dictionary_: the everyday words (_ufinyanzi_, _tanuru_, _udongo_, _vumbi_, _sumu_). Known
  standard works; not re-read online today.
- **BAKITA**: Baraza la Kiswahili la Taifa (Tanzania's National Swahili Council), the body that approves new terms;
  **BAKIKE** (Kenya's Baraza la Kiswahili la Kenya). No ceramics term list from either was found.
- **MS**: Microsoft's Swahili language portal and style guide (Swahili Windows and Office): software words
  (_Hifadhi_ for Save, _Futa_ for Delete, _Ghairi_ for Cancel, _Mipangilio_ for Settings, _Ingia_ / _Toka_ for sign
  in / out). **Native check** against the live guide; Google's Swahili interface uses the same words.
- **CLDR**: the app's `Intl` for sw (Node 24): "1,234.5" (comma for thousands, decimal **point**), dates "14 Oktoba
  2026", 24-hour times "20:00"; plural categories `one` (1 only) and `other` (server test `regions_tests.ts`, wave L2).
- **Region data**: Kenya's emergency number 922 (national ambulance dispatch, `lib/regions/safety.js`, read on a
  government page 2026-10-30). The translation copies only the numbers the English and the region data print.

Not reached: any Swahili ceramics textbook or course page, any SDS in Swahili, Kenya's or Tanzania's occupational
health law in Swahili (OSHA Kenya 2007 and Tanzania's OSHA are published in English).

## 1. Style sheet

**Register.** Friendly and respectful, addressing one reader as _wewe_ through the verb (second-person singular
subject prefix _u-_): "Chagua malighafi.", "Chuja glaze mara mbili.", "Vaa barakoa ya kupumua." Never the plural _ninyi_
for one reader. _Tafadhali_ only where the English says "please". "We" (the app) as _sisi_ / _tu-_ where the English
has it ("Tunapendekeza…").

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the **imperative / bare verb stem** as Swahili software writes them: "Hifadhi",
  "Hifadhi kama nakala", "Chapisha", "Linganisha", "Ongeza malighafi", "Futa", "Ndiyo, ondoa". No full stop.
- Instructions in sentences: the imperative or subjunctive ("Andika kiasi (0 ni sawa).").
- Headings, page titles, tabs and menus: a noun phrase ("Mapishi ya glaze", "Mipangilio", "Kumbukumbu za kuchoma").
- Field labels: a noun, with the colon where the English has one ("Jina la malighafi:").
- Ongoing actions: "Inaondoa…", "Inapakia…".
- Errors: "Could not discard the trial." → "Haikuwezekana kutupa jaribio."

**Capitalisation.** Sentence case everywhere. Months (_Oktoba_), days and languages take a capital in Swahili as in
English. Trade names keep their form (Orton, Seger, Glazecalc).

**Noun classes.** Every loanword takes a noun class; give it in the glossary. Most English loans go to class 9/10
(_glaze_ → "glaze hii", plural "glaze hizi"; _frit_ → "frit hii"); people to 1/2 (_mfinyanzi_ / _wafinyanzi_).
Agreement follows the class: "glaze **i**liyochomwa" (9), "malighafi **i**liyopimwa" (9/10), "tanuru **li**mewaka"
(5, _tanuru_ is class 5/6: _matanuru_). **Native check** on each loan's class.

**Punctuation and spacing.** Latin punctuation as English: "." ends a sentence, "“…”" for quotations, no space before
; : ! ?. Ranges: en dash, unit once: "1222–1240 °C", "koni 06–04".

**Numbers.** Digits 0–9 always. Decimal **point** (1.5), thousands with a comma (12,500 g), as CLDR sw and the app
print; four-digit temperatures as the English writes them (1222 °C). A space before °C and unit symbols, none before %
(15%). Dates "14 Oktoba 2026". Times on the 24-hour clock (20:00). **Never Swahili time** (_saa mbili usiku_ for
20:00, counted from 06:00): the check would read 2 for the English's 20, and readers would be an hour-count off. Where
the English writes a number as a word ("two coats"), it stays a word (_tabaka mbili_).

**Plural forms.** CLDR sw has `one` (exactly 1) and `other`, as English: no `=1` is needed. Swahili marks the plural on
the noun's class prefix, not with a suffix, so both forms are written in full:

```
{count, plural, one {Malighafi # imeongezwa} other {Malighafi # zimeongezwa}}
{count, plural, one {Kichocheo # cha glaze} other {Vichocheo # vya glaze}}
```

**Placeholders.** Swahili agrees with the noun, not the value: build sentences so {region}, {name} and {count} sit
after a noun that fixes the class ("katika nchi ya {region}", "malighafi iitwayo {name}").

**Cones.** Orton's: **koni ya Orton** (class 9/10, _koni_), "cone 6" → "koni 6"; "cone 06" → "koni 06"; "fire to cone
6" → "choma hadi koni 6". Seger and SK cones are different series, never converted.

**The unity formula.** **fomula ya Seger (UMF)** at first use, then "UMF". English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** The exact label, inside the tag or bold the English uses.

| English                                   | sw                                             |
| ----------------------------------------- | ---------------------------------------------- |
| Compare                                   | Linganisha                                     |
| Settings                                  | Mipangilio                                     |
| Library                                   | Maktaba                                        |
| My materials                              | Malighafi zangu                                |
| Glazing basics                            | Misingi ya glaze                               |
| How to make a glaze                       | Jinsi ya kutengeneza glaze                     |
| Safe mixing and ventilation               | Kuchanganya kwa usalama na hewa safi           |
| Firing a basic kiln                       | Kuchoma katika tanuru rahisi                   |
| Don't poison your family                  | **Usiitie familia yako sumu**                  |
| Learn with John Britt's free glaze course | Jifunze na kozi ya bure ya glaze ya John Britt |

The home-safety title keeps the owner's blunt form, never softened. **Native check** on all titles.

**Pitfalls.**

- _rangi_ is paint or colour: never "glaze". _glaze_ stays a loan (with _rangi ya kioo_ as the gloss at first use).
- _tanuru_ (kiln) vs _jiko_ / _oveni_ (cooking stove, oven): never the kitchen words for a kiln.
- _udongo_ is soil as well as clay: say _udongo wa mfinyanzi_ for clay where it could be read as garden soil.
- _silika_ (silica) ≠ _silikoni_ (silicone); _risasi_ is a bullet, lead the metal is **risasi (madini)** in some
  dictionaries and **lead** in Kenyan English-medium teaching: write **madini ya risasi (lead, Pb)** at first use.
  **Native check**.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see. Class: the noun class (9/10 unless given).

### 2.1 Glaze and its chemistry

| English                       | sw                                | Notes                                                      |
| ----------------------------- | --------------------------------- | ---------------------------------------------------------- |
| glaze **show English**        | glaze (9/10); kupaka glaze        | Loan; gloss _rangi ya kioo_ at first use. **Native check** |
| unity molecular formula (UMF) | fomula ya Seger (UMF)             | UMF kept. **Native check**                                 |
| loss on ignition (LOI)        | upotevu wa uzito kwa moto (LOI)   | LOI kept. **Native check**                                 |
| oxide                         | oksidi (9/10)                     | Chemistry textbooks (secondary school, Kenya/Tanzania).    |
| mole                          | moli                              | Chemistry textbooks.                                       |
| thermal expansion             | upanuzi wa joto                   | **Native check**                                           |
| gloss, satin, matte           | ng'avu, satin, isiyong'aa (matte) | **Native check**                                           |
| flux                          | flux (kiyeyushi)                  | **Native check**                                           |

### 2.2 Materials and oxides

| English               | sw                                          | Notes                                                       |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| raw materials         | malighafi (9/10)                            | TUKI. "Materials" → "Malighafi".                            |
| feldspar              | feldspar                                    | Loan, as on the bag.                                        |
| kaolin, ball clay     | kaolini; ball clay                          | Loans. **Native check**                                     |
| silica, flint         | silika                                      | Chemistry textbooks.                                        |
| whiting               | whiting (kalsiamu kaboneti)                 | **Native check**                                            |
| frit                  | frit                                        | Loan.                                                       |
| colorant, stain       | kitia rangi (7/8); stain                    | **Native check**                                            |
| lead, barium, cadmium | madini ya risasi (lead), bariamu, kadimiamu | Chemical names; symbols kept (Pb, Ba, Cd). **Native check** |
| lithium, boron, zinc  | lithiamu, boroni, zinki                     | Chemistry textbooks.                                        |

### 2.3 Clay, ware and firing stages

| English                           | sw                                          | Notes                              |
| --------------------------------- | ------------------------------------------- | ---------------------------------- |
| pottery, potter                   | ufinyanzi; mfinyanzi (1/2)                  | TUKI.                              |
| clay, clay body                   | udongo wa mfinyanzi; mchanganyiko wa udongo | TUKI / **Native check**            |
| pot, ware                         | chungu (7/8), vyombo vya udongo             | TUKI.                              |
| earthenware, stoneware, porcelain | earthenware, stoneware, porcelaini          | Loans with gloss. **Native check** |
| bisque                            | bisque (kuchoma kwa kwanza)                 | **Native check**                   |
| glaze firing                      | kuchoma glaze                               | **Native check**                   |
| slip, engobe                      | slip (udongo wa majimaji); engobe           | **Native check**                   |

### 2.4 Kilns, cones and firing

| English              | sw                                  | Notes                  |
| -------------------- | ----------------------------------- | ---------------------- |
| kiln                 | tanuru (5/6, matanuru)              | TUKI.                  |
| electric / gas kiln  | tanuru la umeme / la gesi           |                        |
| firing, to fire      | kuchoma; uchomaji                   | TUKI.                  |
| cone                 | koni (9/10)                         | Loan. **Native check** |
| kiln shelf           | rafu ya tanuru                      | **Native check**       |
| oxidation, reduction | oksidesheni, upunguzaji (reduction) | **Native check**       |
| cooling              | kupoa                               |                        |

### 2.5 Defects

| English   | sw                                 | Notes            |
| --------- | ---------------------------------- | ---------------- |
| crazing   | crazing (nyufa ndogo kwenye glaze) | **Native check** |
| crawling  | crawling (glaze kujikunja)         | **Native check** |
| pinholing | pinholes (vitundu vidogo)          | **Native check** |
| leaching  | kuvuja kwa madini                  | **Native check** |

### 2.6 Making and applying glaze

| English          | sw                    | Notes            |
| ---------------- | --------------------- | ---------------- |
| batch            | kundi (5/6); batch    | **Native check** |
| scale            | mizani                | TUKI.            |
| sieve            | chujio (7/8); kuchuja | TUKI.            |
| specific gravity | SG (uzito linganishi) | **Native check** |
| test tile        | kigae cha majaribio   | **Native check** |

### 2.7 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English/digits (Pb, BaCO₃, 0.025 mg/m³).

| English                       | sw                                     | Notes                                           |
| ----------------------------- | -------------------------------------- | ----------------------------------------------- |
| dust                          | vumbi                                  | TUKI.                                           |
| respirable crystalline silica | silika fuwele inayovutwa kwenye mapafu | **Native check**                                |
| silicosis                     | silikosisi (ugonjwa wa mapafu)         | **Native check**                                |
| respirator                    | barakoa ya kupumua (respirator)        | **Native check**                                |
| poison, toxic                 | sumu; -enye sumu                       | TUKI.                                           |
| food safe                     | salama kwa chakula                     | **Native check**                                |
| lead-free                     | bila madini ya risasi (lead-free)      | **Native check**                                |
| at most / no more than        | isiyozidi; si zaidi ya                 | "less than" is _chini ya_: never for "at most". |
| at least                      | angalau; si chini ya                   |                                                 |

**Who to call.** The translation names only what the English and the region data print. For the record:

| Country  | Number    | Status                                                                                                                     |
| -------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Kenya    | 922       | Verified (national ambulance dispatch; `lib/regions/safety.js`)                                                            |
| Tanzania | 112       | **Not verified** on an official page (secondary sources only; reported unreliable outside Dar es Salaam). Not in the data. |
| Uganda   | 112 / 999 | **Not verified**. Not in the data.                                                                                         |

No poison line in Kenya, Tanzania or Uganda was confirmed.

### 2.8 The app's own words

| English              | sw                                                  |
| -------------------- | --------------------------------------------------- |
| recipe               | kichocheo (7/8) cha glaze                           |
| Save, Save as a copy | Hifadhi, Hifadhi kama nakala                        |
| Delete, Remove       | Futa, Ondoa                                         |
| Cancel               | Ghairi                                              |
| Sign in, Sign out    | Ingia, Toka                                         |
| Settings             | Mipangilio                                          |
| account, password    | akaunti, nenosiri                                   |
| Trash                | Tupio                                               |
| Translation notice   | "Ukurasa huu umetafsiriwa kutoka Kiingereza na AI." |

**Native check** on the whole table (MS).

## 3. Never translated

Formulas, cone numbers, units, codes and standards, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG,
Orton, Seger, HEPA, FFP2/FFP3, N95, GHS codes (H350)**; Glazecalc (class 9: "Glazecalc hii").

## 4. Search terms

**Native check**: _glaze ya ufinyanzi_, _kikokotoo cha glaze_, _ufinyanzi Kenya_.

## 5. Catch-up terms

| English  | sw         | Notes                         |
| -------- | ---------- | ----------------------------- |
| passkey  | passkey    | Kept, as Google's sw screens. |
| SK cones | koni za SK |                               |

### 5.1 Consistency pass (L2, 2026-10-31)

One form per concept across the app, records, reference, guides and emails.

| English                  | sw                                                 | Notes                                                                                        |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| witness cone             | koni shahidi (9/10)                                | "koni shahidi (witness cone)" at first use. Not _koni ya ushahidi_ / _koni ya kuthibitisha_. |
| heatwork                 | kazi ya joto (heatwork)                            | English in brackets (or show English) at first use, then _kazi ya joto_.                     |
| leach test               | kipimo cha kuvuja kwa madini                       | "(leach test)" may follow at first use.                                                      |
| slurry                   | tope (5/6) la glaze                                | "tope (slurry)" at first use; class 5: "tope **li**nabaki". Not bare _slurry_.               |
| flocculant, deflocculant | kiganisha (flocculant); kimiminisha (deflocculant) | English in brackets at first use. **Native check**                                           |
| opacifier                | kizuia mwanga (7/8)                                | Not _kiziba mwanga_. **Native check**                                                        |
| kiln wash                | kiln wash                                          | Loan. Not _kiosha-tanuru_.                                                                   |
| studio (pottery)         | karakana (9/10)                                    | Not _studio_; place names (Updraft Pottery Studio) and quoted English titles keep "Studio".  |
| vacuum cleaner           | kisafishaji cha kufyonza vumbi (7/8)               | Not _kivuta-vumbi_. Extraction hoods and booths stay _kivuta hewa_ / _kivuta moshi_.         |
| kiln sitter              | kiln sitter                                        | Loan. Never glossed _kidhibiti_ (that is the controller).                                    |
| controller (kiln)        | kidhibiti (7/8)                                    | Electronic controller only.                                                                  |
| limit timer              | kipima muda cha ukomo (limit timer)                |                                                                                              |

### 5.2 Round 14 terms (2026-11-04)

No Swahili ceramics source was found for these (section 0's search, repeated); each is built from TUKI's everyday words
(_jivu_ ash, _mabua_ straw, _mpunga_ rice, _jiwe_ stone, _bandia_ artificial). **Native check** on all.

| English                    | sw                                    | Notes                                                    |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- |
| wood ash                   | jivu la kuni (5/6)                    | TUKI _jivu_.                                             |
| synthetic ash (合成土灰)   | mbadala bandia wa 土灰                | The Japanese name kept, as the English keeps it.         |
| rice-straw ash (藁灰)      | jivu la mabua ya mpunga               |                                                          |
| isu ash (柞灰)             | jivu la isu                           |                                                          |
| porcelain stone (瓷石)     | jiwe la porcelaini                    |                                                          |
| caustic (ash)              | huunguza ngozi (caustic)              | English in brackets: the safety meaning must be clear.   |
| specification (product)    | vipimo vya bidhaa                     | Colemanite: "limits, not a typical analysis" → _mipaka_. |
| drop-and-hold              | kushusha na kusubiri (drop-and-hold)  |                                                          |
| hold (firing)              | kusubiri (hold)                       |                                                          |
| line blend, triaxial blend | line blend, triaxial blend            | Loans.                                                   |
| glass former, stabilizer   | kiunda kioo (7/8), kiimarishaji (7/8) |                                                          |
| liner glaze                | glaze ya ndani (liner glaze)          |                                                          |

## 6. Choices for the owner and a native potter

1. **plainNotice for Swahili?** Standard notice today (plan default). Recommend the plain notice, given the loan-heavy
   glossary and the number of Native check rows. Owner call.
2. **glaze as a loan** with _rangi ya kioo_ as gloss: confirm.
3. **Kenyan vs Tanzanian usage**: where they differ, the sheet takes Tanzania's BAKITA form, Kenya's in Notes.
