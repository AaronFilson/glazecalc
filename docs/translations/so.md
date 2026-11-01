# Soomaali: hagaha qoraalka iyo qaamuuska ereyada (style sheet and glossary)

The rules and terms for translating Glazecalc into Somali (`so`), standard Somali (Af-Maxaa) in the official Latin
alphabet of 1972, as the BBC Somali service and Somalia's schools write it, for potters in Somalia, Djibouti, Ethiopia's
Somali Region and Kenya's North Eastern Province, and the diaspora. Read [README.md](README.md) first;
[terms.md](terms.md) gives the meaning of every English term. Every so message and guide follows this page. Of those
countries only Kenya (KE) has a region in the app; it fires by temperature (°C).

**Notice.** Somali is a `plainNotice` language (`lib/regions/languages.js`): machine translation of Somali is weak
(docs/i18n-plan.md, "After the EU").

**What the sources could and could not give** (research 2026-11-01). Somali has everyday words for clay and pots from
the traditional craft (_dhoobo_ clay, _dheri_ cooking pot, _weel_ vessel), and incense burners (_dabqaad_) are still
made of clay. No studio-ceramics teaching in Somali was found: glaze chemistry is an **English loan** domain, written as
English spells it with a short Somali gloss. Rows with no source read today are **Native check**; the owner's ruling of
2026-11-01 holds.

Main sources, cited below by short name:

- **Zorc**: R. David Zorc and Madina M. Osman, _Somali–English Dictionary_ (Dunwoody, 1993), and the Somali Academy's
  word lists: everyday words (_dhoobo_, _dheri_, _boodh_, _sun_, _rasaas_). Known works; not re-read online today.
- **BBC**: BBC Somali's usage for health and science words.
- **Google / MS**: Google's and Microsoft's Somali interfaces (_Kaydi_ Save, _Tirtir_ Delete, _Jooji_ Cancel,
  _Dejinta_ Settings, _Gal_ / _Ka bax_). **Native check**.
- **CLDR**: Node 24 `Intl` for so (scratch/round10/c-l34/intl-and-fonts.mjs): "12,345.5", dates "Oktoobar 14, 2026",
  times "8:05 GD" for so-SO (12-hour) and "20:05" for so-KE; plural categories `one` (1 only) and `other`. Chrome lacks
  Somali's data; the app writes it from Node's (`scripts/locale-fallback.mjs`, so-SO).
- **Region data**: Kenya's 922 (verified 2026-10-30, `lib/regions/safety.js`).

Not reached: a Somali SDS, Somali occupational safety law, any Somali ceramics page.

## 1. Style sheet

**Alphabet.** Latin, NFC, the 1972 spelling: **c** (ʿayn), **x** (ḥ), **q**, **dh**, **kh**, **sh**, and the apostrophe
**'** for the glottal stop (_ba'an_), written as ASCII U+0027 or ʼ U+02BC consistently: this sheet takes U+0027, as
Somali print does. Long vowels doubled (_aa ee ii oo uu_). No tone marks.

**Register.** Respectful and direct, one reader addressed in the singular imperative ("Dooro walax.", "Shaandhee
glaze-ka laba jeer."). Somali's imperative plural (_-a_ / _-ina_) only for several readers. **Native check**.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the imperative: "Kaydi", "Kaydi nuqul ahaan", "Daabac", "Isbarbardhig", "Ku dar walax",
  "Tirtir", "Haa, ka saar". No full stop.
- Headings and tabs: a noun phrase ("Habab glaze", "Dejinta", "Diiwaanka gubidda").
- Field labels: a noun, with the colon where the English has one.
- Ongoing actions: "Waa la saarayaa…", "Waa la soo rarayaa…".

**Definite article.** Somali's article is a suffix (_-ka_, _-ta_, _-ga_, _-da_, _-ha_, _-a_): an English loan or
abbreviation takes it after a hyphen (_glaze-ka_, _UMF-ta_, _kiln-ka_); never glued to a placeholder ({name}-ka is
wrong: put a noun before it, "walaxda {name}").

**Capitalisation.** Sentence case. Months and days take a capital (_Oktoobar_).

**Punctuation and spacing.** Latin, as English. Ranges: en dash, unit once.

**Numbers.** Digits 0–9 always. Decimal **point** (1.5), thousands with a comma (12,500 g); four-digit temperatures as
the English writes them (1222 °C). Dates as the app prints them. Times as the English writes them on the 24-hour clock
(20:00), never "8-da fiidnimo" for 20:00 (the check would read 8).

**Plural forms.** CLDR so: `one` (1 only) and `other`, as English; no `=1` needed. Somali plurals change the noun
(_dheri_ → _dheryo_): write both in full.

```
{count, plural, one {# walax ayaa lagu daray} other {# walxood ayaa lagu daray}}
```

**Cones.** The loan **cone** ("cone 6", "gub ilaa cone 6"). Seger and SK cones never converted. **Native check**.

**The unity formula.** "UMF (unity molecular formula)" at first use. English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** **Native check** on all.

| English                                   | so                                                   |
| ----------------------------------------- | ---------------------------------------------------- |
| Compare                                   | Isbarbardhig                                         |
| Settings                                  | Dejinta                                              |
| Library                                   | Maktabadda                                           |
| My materials                              | Walxahayga                                           |
| Glazing basics                            | Aasaaska glaze-ka                                    |
| How to make a glaze                       | Sida loo sameeyo glaze                               |
| Safe mixing and ventilation               | Isku-darka ammaanka ah iyo hawo-wareejinta           |
| Firing a basic kiln                       | Gubidda kiln fudud                                   |
| Don't poison your family                  | **Ha sumayn qoyskaaga**                              |
| Learn with John Britt's free glaze course | Ku baro koorsada glaze ee bilaashka ah ee John Britt |

**Pitfalls.**

- _rinji_ is paint and _midab_ colour: never "glaze".
- A kiln is not a cooking stove (_burjiko_) or oven (_foorno_): keep **kiln** with a gloss (_foornada dhoobada lagu
  dubo_) at first use. **Native check**.
- _carro_ is soil; clay is **dhoobo**.
- Lead is **rasaas**, which is also the everyday word for bullets and ammunition: write **rasaas (lead, Pb)** at first
  use on each page and keep **(Pb)** in every warning. **Native check** (some write _leedh_).

## 2. Glossary

**show English** marks terms whose English a reader can ask to see.

### 2.1 Glaze, materials and chemistry

| English                        | so                                 | Notes                  |
| ------------------------------ | ---------------------------------- | ---------------------- |
| glaze **show English**         | glaze (-ka)                        | Loan. **Native check** |
| UMF, LOI, SG                   | UMF, LOI, SG                       | Kept.                  |
| oxide                          | oksaydh                            | **Native check**       |
| gloss, matte                   | dhalaalaya, aan dhalaalayn (matte) | **Native check**       |
| raw materials                  | walxo (sg. walax)                  | **Native check**       |
| feldspar, kaolin, silica, frit | feldspar, kaolin, silica, frit     | Loans.                 |
| colorant                       | midabeeye                          | **Native check**       |
| lead, barium, cadmium          | rasaas (lead, Pb), barium, cadmium | Zorc (_rasaas_).       |

### 2.2 Clay, ware, kilns and firing

| English                           | so                                | Notes                  |
| --------------------------------- | --------------------------------- | ---------------------- |
| pottery, potter                   | dhoobo-samayn; dhoobo-sameeye     | **Native check**       |
| clay                              | dhoobo                            | Zorc.                  |
| pot                               | dheri (pl. dheryo); weel          | Zorc.                  |
| earthenware, stoneware, porcelain | earthenware, stoneware, porcelain | Loans.                 |
| bisque                            | bisque (gubidda koowaad)          | **Native check**       |
| kiln                              | kiln                              | Loan. **Native check** |
| firing, to fire                   | gubid; gub                        | **Native check**       |
| cooling                           | qaboojin                          |                        |

### 2.3 Defects and making

| English   | so                            | Notes            |
| --------- | ----------------------------- | ---------------- |
| crazing   | crazing (dillaac yaryar)      | **Native check** |
| leaching  | leaching (rasaas ka soo baxa) | **Native check** |
| batch     | batch                         | Loan.            |
| scale     | miisaan                       | Zorc.            |
| sieve     | shaandho; shaandhee (verb)    | Zorc.            |
| test tile | test tile                     | Loan.            |

### 2.4 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English and digits.

| English                       | so                                  | Notes                                         |
| ----------------------------- | ----------------------------------- | --------------------------------------------- |
| dust                          | boodh                               | Zorc.                                         |
| respirable crystalline silica | boodhka silica ee la neefsado       | **Native check**                              |
| silicosis                     | silicosis (cudur sambabada)         | **Native check**                              |
| respirator                    | respirator (maaskarada neefsashada) | **Native check**                              |
| poison, toxic                 | sun; sumaysan                       | Zorc.                                         |
| food safe                     | ammaan u ah cuntada                 | **Native check**                              |
| lead-free                     | aan rasaas lahayn (lead-free)       | **Native check**                              |
| at most / no more than        | ugu badnaan; aan ka badnayn         | "less than" is _ka yar_: never for "at most". |
| at least                      | ugu yaraan                          |                                               |

**Who to call.** The translation names only what the English and the region data print:

| Country  | Number | Status                                                        |
| -------- | ------ | ------------------------------------------------------------- |
| Kenya    | 922    | Verified 2026-10-30 (`lib/regions/safety.js`)                 |
| Somalia  | none   | No number read on an official page. Not in the data.          |
| Djibouti | none   | No number read on an official page. Not in the data.          |
| Ethiopia | none   | None confirmed (as docs/translations/am.md). Not in the data. |

No poison line confirmed in any of them.

### 2.5 The app's own words

| English              | so                                       |
| -------------------- | ---------------------------------------- |
| recipe               | hab (habka glaze-ka)                     |
| Save, Save as a copy | Kaydi, Kaydi nuqul ahaan                 |
| Delete, Remove       | Tirtir, Ka saar                          |
| Cancel               | Jooji                                    |
| Sign in, Sign out    | Gal, Ka bax                              |
| account, password    | akoon, furaha sirta                      |
| Translation notice   | "Boggan waxaa Ingiriisi ka turjumay AI." |

**Native check** on the whole table.

## 3. Never translated

Formulas, cone numbers, units, codes, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG, Orton, Seger,
HEPA, FFP2/FFP3, N95, GHS codes**; Glazecalc.

## 4. Choices for the owner and a native potter

1. **rasaas or leedh** for lead: _rasaas_ chosen (dictionary word) with (Pb) always. A native reader to confirm.
2. **so-SO's 12-hour time** ("8:05 GD"): the app prints what Intl gives for the reader's region; translations write
   the English's 24-hour figures.
3. No Somali region yet besides Kenya: Somalia, Djibouti and Ethiopia need their own (emergency numbers unverified).
