# Runasimi: qillqay kamachiy, simikuna (style sheet and glossary)

The rules and terms for translating Glazecalc into Quechua (`qu`), for potters in Peru and Bolivia (and Quechua readers
in Ecuador and Argentina). Read [README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English
term; [es-419.md](es-419.md) gives the Latin American Spanish terms Quechua borrows. Every qu message and guide follows
this page. Peru, Bolivia and Ecuador have no region in the app yet; all fire by temperature (°C) by default.

**Notice.** Quechua is a `plainNotice` language (`lib/regions/languages.js`): machine translation of Quechua is poor,
and the owner asked for **extra review** for it (scratch/round10/plan.md, section C). Most Quechua speakers read Spanish
online too, so the plain notice points to the English and the reader may choose es-419.

## 0. Which Quechua

Quechua is a family, not one language. This sheet writes **Southern Quechua** (_Qhichwa_, ISO 639-3 `quz`/`quy`
under the macrolanguage `qu`) in its **Cusco-Collao** form, with Ayacucho (Chanka) forms in Notes where they differ:

- Southern Quechua is the largest variety (most of Peru's and nearly all of Bolivia's speakers) and the most written
  one: Peru's Ministry of Education (MINEDU) school books, Bolivia's, the Peruvian Constitution's and the Bible's
  Quechua editions, and Google's and Microsoft's Quechua interfaces are all Southern Quechua.
- Cusco-Collao keeps the aspirated and ejective stops (_ph th chh kh qh_, _p' t' ch' k' q'_), so a Cusco text is
  readable in Ayacucho (which lacks them), not always the other way round.
- Ecuador's Kichwa (_Kichwa Unificado_) and Central Quechua (Áncash, Huánuco) are different enough that a reader there
  may prefer Spanish: noted for the owner, not served separately.

**Alphabet.** Peru's official alphabet (Resolución Ministerial 1218-85-ED, 1985; confirmed by Ley 29735, 2011) has
**three vowels: a i u**; Bolivia's unified alphabet (1984) has the same three. _e_ and _o_ are written only in Spanish
loans and names. The Academia Mayor de la Lengua Quechua (Cusco) prefers five vowels; this sheet follows the official
three-vowel spelling (_qillqa_, _runasimi_, _kuchuy_), because it is what schools and government texts print. **Native
check**.

**What the sources could and could not give** (research 2026-11-01). The Andes have an old pottery tradition
(_saña_ / _manka_ cooking pots, _urpu_ large jars; Pucará and Quinua in Peru) with Quechua words: _mituy_ / _mitu_
(clay), _manka_ (pot), _saña_ / _sañu_ (fired ware), _ruphachiy_ (to fire, to burn). Studio glaze chemistry has no
Quechua terms; potters in Peru and Bolivia use **Spanish**: _esmalte_, _horno_, _cono_, _frita_, _feldespato_. So
technical terms are Spanish loans (as es-419.md gives them), not English ones. Rows with no source read today are
**Native check**; given the owner's "extra review", every Quechua part is reviewed twice before go-live.

Main sources, cited below by short name:

- **AMLQ**: Academia Mayor de la Lengua Quechua, _Diccionario Quechua–Español–Quechua_ (Cusco, 2005): everyday words
  (_mitu_, _manka_, _ruphay_, _hampi_). Known work; not re-read online today.
- **MINEDU**: Peru's Ministry of Education Quechua materials and its _Manual de escritura quechua sureño_ (2013) for
  spelling and suffixes.
- **es-419.md**: the Spanish terms (loans).
- **Google / MS**: Google's and Microsoft's Quechua interfaces (Microsoft's Quechua (Peru) language pack). **Native
  check**.
- **CLDR**: Node 24 `Intl` for qu (scratch/round10/c-l34/intl-and-fonts.mjs): qu-PE "12,345.5", qu-BO "12.345,5"
  (the reader's region decides), dates "14 Octubre 2026", times "8:05 p.m." (12-hour); plural categories `one` (1
  only) and `other`, as English. CLDR's Quechua data is basic; Chrome lacks it; the app writes it from Node's
  (`scripts/locale-fallback.mjs`, qu-PE).

Not reached: any Quechua ceramics text, any Quechua SDS, Peruvian or Bolivian safety law in Quechua.

## 1. Style sheet

**Register.** Respectful, one reader addressed in the second person singular; buttons and instructions in the
imperative _-y_ ("Akllay", "Waqaychay"); the polite request _-ripuy_ / _-ykuy_ (_Qhawariykuy_) in sentences where the
English is a request. **Native check**.

**Suffixes.** Quechua is agglutinative: case, person and evidential suffixes join the word. On a Spanish loan they
join directly (_hornopi_ "in the kiln", _esmaltekuna_ "glazes"); on an abbreviation, number or placeholder, after a
hyphen (_UMF-ta_, _cono 6-kama_ "up to cone 6"); never glued to a placeholder (put a noun before it: "material {name}
sutiyuq"). Evidentials: use the direct _-mi_ / _-n_ for facts in the app's text; never the reportative _-si_ (it says
"they say") in a safety warning.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the imperative: "Waqaychay", "Copiata hina waqaychay", "Imprimiy", "Tupachiy", "Material
  yapay", "Pichay", "Arí, qichuy". No full stop.
- Headings and tabs: a noun phrase ("Esmalte rurana", "Allichanakuna", "Ruphachiy qillqakuna").
- Field labels: a noun, with the colon where the English has one.

**Capitalisation.** Sentence case. Month names as the app prints them (Spanish: _Octubre_).

**Punctuation and spacing.** Latin, as Spanish: ¿…? and ¡…! where a question or exclamation is long; the apostrophe of
the ejectives is ASCII **'** (U+0027) inside the word (_p'aki_, _t'uru_), consistently. Ranges: en dash, unit once.

**Numbers.** Digits 0–9 always, never number words for a figure the English writes in digits. The app formats numbers
for the reader's region (Peru 1.5 and 12,500; Bolivia 1,5 and 12.500): in the text, write figures **as the English
writes them** (1.5; 12,500 g; 1222 °C) and the reader's region formats the app's own numbers. **Owner question**
(section 4): Bolivian readers will then see two styles. The 24-hour clock in the text (20:00), as the English has it.

**Plural forms.** `one` (1 only) and `other` (CLDR qu, as English). Quechua marks the plural with _-kuna_, and not
after a number: both forms are written in full.

```
{count, plural, one {# material yapasqa} other {# material yapasqa}}
```

**Cones.** **cono** (Spanish loan): "cono 6", "cono 6-kama ruphachiy". Seger and SK never converted.

**The unity formula.** "UMF (fórmula unitaria, unity molecular formula)" at first use. English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** **Native check** on all.

| English                                   | qu                                                         |
| ----------------------------------------- | ---------------------------------------------------------- |
| Compare                                   | Tupachiy                                                   |
| Settings                                  | Allichanakuna                                              |
| Library                                   | Qillqa wasi                                                |
| My materials                              | Materialniykuna                                            |
| Glazing basics                            | Esmalte yachaypa qallariynin                               |
| How to make a glaze                       | Imaynatataq esmalteta ruranki                              |
| Safe mixing and ventilation               | Mana manchakuspa chaqruy, wayra puriynin                   |
| Firing a basic kiln                       | Huch'uy hornopi ruphachiy                                  |
| Don't poison your family                  | **Ama ayllu-masiykita miyuwan wañuchiychu**                |
| Learn with John Britt's free glaze course | John Brittpa mana qullqiyuq esmalte yachachiyninwan yachay |

**Pitfalls.**

- _llimp'i_ is colour and paint: never "glaze". Glaze is **esmalte** (Spanish loan).
- A kiln is **horno**, never _q'uncha_ (the kitchen hearth). **Native check**.
- _allpa_ is earth and soil; clay is **mitu** (Ayacucho _mitu_ too); write _mitu allpa_ where it could read "mud".
- Lead is **titi** (also tin in some areas): write **titi (plomo, Pb)** at first use on each page and keep **(Pb)** in
  every warning. **Native check**.
- _hampi_ is medicine; poison is **miyu** (the home-safety title too). Never _hampi_ or _hampi-ruru_ for poison.
- Cusco-Collao forms, not Chanka/Ayacucho: water **unu** (never _yaku_), drink **ukyay** (not _upyay_), many
  **achka** (not _ashka_), true **chiqaq** (not _cheqaq_). Melting in the kiln is **chulluy** (never _unuyay_, which
  now reads "turn into water"), so water and melting never share a root.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see. Spanish loans as es-419.md gives them.

### 2.1 Glaze, materials and chemistry

| English                        | qu                                | Notes                        |
| ------------------------------ | --------------------------------- | ---------------------------- |
| glaze **show English**         | esmalte                           | Spanish loan.                |
| UMF, LOI, SG                   | UMF, LOI, SG                      | Kept.                        |
| oxide                          | óxido                             | Spanish loan.                |
| gloss, matte                   | lliphiq, mana lliphiq (mate)      | **Native check**             |
| raw materials                  | materialkuna                      | Spanish loan + _-kuna_.      |
| feldspar, kaolin, silica, frit | feldespato, caolín, sílice, frita | Spanish loans (es-419.md).   |
| colorant                       | llimp'iq                          | **Native check**             |
| lead, barium, cadmium          | titi (plomo, Pb), bario, cadmio   | AMLQ (_titi_). Symbols kept. |

### 2.2 Clay, ware, kilns and firing

| English                           | qu                             | Notes            |
| --------------------------------- | ------------------------------ | ---------------- |
| pottery, potter                   | saña ruray; saña ruraq         | **Native check** |
| clay                              | mitu                           | AMLQ.            |
| pot                               | manka                          | AMLQ.            |
| earthenware, stoneware, porcelain | loza de barro, gres, porcelana | Spanish loans.   |
| bisque                            | bizcocho (ñawpaq ruphachiy)    | **Native check** |
| kiln                              | horno                          | Spanish loan.    |
| firing, to fire                   | ruphachiy                      | AMLQ.            |
| cooling                           | chiriyachiy                    | **Native check** |

### 2.3 Defects and making

| English              | qu                                                                              | Notes                                                        |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| crazing              | cuarteado (huch'uy p'akisqakuna)                                                | **Native check**                                             |
| leaching, leach test | metalkuna lluqsiynin (lixiviación); metalkuna lluqsiyninpaq prueba (leach test) | Metals in general, never lead alone. **Native check**        |
| batch                | lote                                                                            | Spanish loan.                                                |
| scale                | balanza                                                                         | Spanish loan.                                                |
| sieve                | tamiz; suysuy (verb)                                                            | AMLQ (_suysuy_).                                             |
| test tile            | probeta                                                                         | Spanish loan. Only the tile: never the measuring cylinder.   |
| graduated cylinder   | tupuna tubo (marcasqa tubo)                                                     | Never _probeta_ (Spanish "probeta" is also the cylinder).    |
| line blend           | mezcla lineal                                                                   | Spanish loan.                                                |
| kiln wash            | horno tablakunata amachaq llut'ana (kiln wash)                                  | Shelf coating; never _horno lavado_, never _p'acha_ (cloth). |
| witness cone         | cono testigo                                                                    | Spanish order (noun first); never _testigo cono_.            |
| melt, fuse           | chulluy; chullusqa; mana chullusqa (unfused)                                    | Never _unuyay_.                                              |
| fluid (runny glaze)  | unu hina puriq                                                                  | **Native check**                                             |

### 2.4 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English/Spanish and digits. Every safety part has a second review (owner: extra review).

| English                       | qu                                                | Notes                                                                                     |
| ----------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| dust                          | ñut'u allpa; polvo                                | **Native check**                                                                          |
| respirable crystalline silica | samaykuspa ukhuman yaykuq sílice cristalina ñut'u | Never drop _cristalina_ (or its gloss "(sílice cristalina respirable)"). **Native check** |
| safety data sheet (SDS)       | seguridad datos p'anqa                            | Never _hoja de datos de seguridad_; "(SDS)" only where the English has it.                |
| combustible                   | rawrayta atiq                                     | **Native check**                                                                          |
| over a direct flame           | chiqan nina hawanpi                               | Never _nina rawrayta_ (reads "burning fire").                                             |
| water                         | unu                                               | Cusco-Collao. Never _yaku_ (Chanka).                                                      |
| soluble, dissolve             | unupi chulluq; (wiksa) ácidopi chulluq            | Always with _unupi_ / _ácidopi_, so it never reads "melts" (kiln).                        |
| opaque, opacifier             | opaco (k'anchay mana pasaq); opacificante         | Stops light, usually white; never "dark".                                                 |
| clear glaze                   | ch'uya esmalte                                    | Transparent, never "white" (_yuraq_).                                                     |
| inch, foot                    | pulgada, pie                                      | Spanish loans.                                                                            |
| early, too soon               | ñawpaqta; mana tiempollanpi                       | Never "in the morning". **Native check**                                                  |
| less, fewer, reduce           | aswan pisi; pisiyachiy                            | Never _aswan_ alone or "a little more".                                                   |
| supplier                      | qhatuq                                            | Never _rantiq_ (buyer). _rantikuq_ (seller) also understood. **Native check**             |
| dry                           | ch'aki                                            | Never _chaki_ (that is foot: "chakinpi" = on its foot, correct).                          |
| silicosis                     | silicosis (surq'an unquy)                         | **Native check**                                                                          |
| respirator                    | respirador                                        | Spanish loan.                                                                             |
| poison, toxic                 | miyu; miyuyuq                                     | AMLQ. Never bare _hampi_.                                                                 |
| food safe                     | mikhunapaq mana manchakuy                         | **Native check**                                                                          |
| lead-free                     | mana titiyuq (sin plomo)                          | **Native check**                                                                          |
| at most / no more than        | aswanqa … kama; mana … aswanchu                   | "less than" is _… manta pisi_: never for "at most". **Native check**                      |
| at least                      | pisimanta pisi                                    | **Native check**                                                                          |

**Who to call.** None of Peru, Bolivia or Ecuador is in the region data: no number is named. No
number for them has been read on an official page yet (the region work will); no poison line confirmed.

### 2.5 The app's own words

| English              | qu                                               |
| -------------------- | ------------------------------------------------ |
| recipe               | rurana (esmalte rurana)                          |
| Save, Save as a copy | Waqaychay, Copiata hina waqaychay                |
| Delete, Remove       | Pichay, Qichuy                                   |
| Cancel               | Saqiy                                            |
| Sign in, Sign out    | Yaykuy, Lluqsiy                                  |
| account, password    | cuenta, pakasqa simi                             |
| Translation notice   | "Kay p'anqataqa AI-mi inglés simimanta t'ikran." |
| access token         | yaykuna token                                    |
| notes                | apuntekuna                                       |
| Trash                | Q'upa                                            |

**Native check** on the whole table.

### 2.6 Round 14 terms (2026-11-04)

No Quechua ceramics source read; built from AMLQ everyday words (_uchpa_ ash, _ichhu_ straw, _rumi_ stone, _t'uru_
mud) and es-419 loans. **Native check** on all; the safety lines need the owner's extra review.

| English                  | qu                                        | Notes                              |
| ------------------------ | ----------------------------------------- | ---------------------------------- |
| wood ash                 | k'aspi uchpa                              |                                    |
| synthetic ash (合成土灰) | 土灰 nisqapa ruranasqa (sintético) rantin | Japanese name kept.                |
| rice-straw ash (藁灰)    | arroz ichhu uchpa                         |                                    |
| isu ash (柞灰)           | isu uchpa                                 |                                    |
| porcelain stone (瓷石)   | porcelana rumi                            |                                    |
| caustic                  | qarata ruphachin (cáustico)               | Spanish kept for the safety text.  |
| avoid (breathing)        | (samaykuymanta) karunchakuy               | Not _ama munaychu_ ("don't want"). |
| powder; sludge           | ñut'u; t'uru                              |                                    |
| supplier                 | qhatuq                                    | As 2.4.                            |
| drop-and-hold; hold      | urayachiy suyay; suyay                    |                                    |
| glass former; stabilizer | vidrio ruraq; takyachiq                   |                                    |
| flux                     | fundente                                  | es-419 loan.                       |

## 3. Never translated

Formulas, cone numbers, units, codes, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG, Orton, Seger,
HEPA, FFP2/FFP3, N95, GHS codes**; Glazecalc.

## 4. Choices for the owner and a native potter

1. **Variety**: Southern Quechua, Cusco-Collao, three-vowel official spelling. Confirm (or Ayacucho-Chanka spelling,
   which drops the aspirates and ejectives).
2. **Spanish loans** for glaze terms (not English): confirm.
3. **Bolivia's number style** in the text (figures as the English writes them, while the app's own numbers follow the
   region): confirm.
4. **qu-EC** (Kichwa) readers get Southern Quechua when they ask for Quechua: acceptable, or offer Spanish first?
5. **Extra review**: two Opus reviews per part and a blind back-translation of every safety part before go-live; a
   native reviewer still wanted.
