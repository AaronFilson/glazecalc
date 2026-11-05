# isiZulu: umhlahlandlela wesitayela nohlu lwamagama (style sheet and glossary)

The rules and terms for translating Glazecalc into Zulu (`zu`), standard isiZulu as the Pan South African Language Board
(PanSALB) and South African schools write it, for potters in South Africa. Read [README.md](README.md) first;
[terms.md](terms.md) gives the meaning of every English term. Every zu message and guide follows this page. South
Africa's region (ZA) fires by Orton cones and °C.

**Notice.** Zulu is a `plainNotice` language (`lib/regions/languages.js`): machine translation of Zulu is weak to
middling (docs/i18n-plan.md, "After the EU"), and most South African potters online choose English.

**What the sources could and could not give** (research 2026-11-01). Zulu pottery (_ukubumba_; the beer pot _ukhamba_,
burnished and smoke-fired by women potters of KwaZulu-Natal, such as the Magwaza and Nala families) gives everyday words:
_ubumba_ (clay), _ukubumba_ (to mould pots), _imbiza_ / _ukhamba_ (pots). Glaze chemistry is taught in English (Durban
University of Technology, the old Rorke's Drift art centre's ceramics), so most technical terms are **English loans**,
written with Zulu's noun prefix and a hyphen (_i-glaze_, _i-UMF_). Rows with no source read today are **Native
check**; the owner's ruling of 2026-11-01 holds.

Main sources, cited below by short name:

- **Doke**: C. M. Doke and B. W. Vilakazi, _Zulu–English Dictionary_, and the Oxford _isiZulu–English_ school
  dictionary: everyday words (_ubumba_, _uthuli_, _ushevu_, _umthofu_). Known works; not re-read online today.
- **PanSALB**: the Zulu National Lexicography Unit and the Department of Arts and Culture's term lists (science and
  health terms in isiZulu). No ceramics list found.
- **MS / Google**: Microsoft's isiZulu terminology and Google's interface (_Londoloza_ Save, _Susa_ Delete, _Khansela_
  Cancel, _Izilungiselelo_ Settings, _Ngena_ / _Phuma_). **Native check**.
- **CLDR**: Node 24 `Intl` for zu (scratch/round10/c-l34/intl-and-fonts.mjs): "12,345.5", dates "Okthoba 14, 2026",
  times "20:05"; plural categories `one` and `other`, where **`one` covers 0 as well as 1** (as Amharic's and
  Hindi's). Chrome lacks Zulu's data; the app writes it from Node's (`scripts/locale-fallback.mjs`, zu-ZA).
- **Region data**: South Africa's 10177, 10111, 112 and the Poisons Information Helpline 0861 555 777, verified
  2026-10-30 (`lib/regions/safety.js`).

Not reached: a Zulu SDS, South African chemical regulations in isiZulu, any Zulu ceramics course page.

## 1. Style sheet

**Register.** Respectful and direct, one reader addressed in the singular (_wena_, verb prefix _u-_): "Khetha
okokwakha.", "Hlunga i-glaze kabili.", "Gqoka i-respirator." The plural _nina_ (prefix _ni-_) is used in public notices
to many; this app speaks to one. **Native check**.

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the imperative: "Londoloza", "Londoloza njengekhophi", "Phrinta", "Qhathanisa", "Engeza
  okokwakha", "Susa", "Yebo, susa". No full stop.
- Headings and tabs: a noun phrase ("Izindlela zokwenza i-glaze", "Izilungiselelo", "Amarekhodi okushisa").
- Field labels: a noun, with the colon where the English has one.
- Ongoing actions: "Iyasusa…", "Iyalayisha…".

**Loanwords and prefixes.** Zulu words take a noun-class prefix. An English loan, abbreviation or name takes the
prefix with a hyphen and keeps its own spelling: _i-glaze_ (class 9, plural _ama-glaze_, 6), _i-UMF_, _i-kiln_,
_e-Orton_ / _ku-cone 6_ (locative), _nge-Glazecalc_. Never a capital after the prefix unless the word has one
(_i-UMF_, _i-glaze_). Agreement follows the class. **Native check** on each class.

**Capitalisation.** Sentence case. Proper nouns keep their capital after a prefix: _eNingizimu Afrika_, _ngesiNgisi_.

**Punctuation and spacing.** Latin, as English. Ranges: en dash, unit once.

**Numbers.** Digits 0–9 always. Decimal **point** (1.5), thousands with a comma (12,500 g), as CLDR zu prints; four-digit
temperatures as the English writes them (1222 °C). A figure after a noun is joined by the copula with a hyphen
(_okungu-3_, _angu-#_); never a prefix glued to a placeholder without one. **Native check**. Dates as the app prints
them. The 24-hour clock (20:00).

**Plural forms.** CLDR zu: `one` is **0 and 1**. `one` keeps `#`; where the English `one` has no `#` ("This
material"), add `=1` for it and keep `one` with `#` (it shows for 0), as Amharic does:

```
{count, plural, =1 {Lokhu okokwakha} one {Okokwakha #} other {Okokwakha okungu-#}}
```

**Cones.** The loan: **i-cone** ("i-cone 6", "shisa kuze kube ku-cone 6"), with Orton's name. Seger and SK cones never
converted. **Native check**.

**The unity formula.** "i-UMF (unity molecular formula)" at first use. English kept: UMF, LOI, SG.

**Feature names and the guides' titles.** **Native check** on all.

| English                                   | zu                                                 |
| ----------------------------------------- | -------------------------------------------------- |
| Compare                                   | Qhathanisa                                         |
| Settings                                  | Izilungiselelo                                     |
| Library                                   | Umtapo                                             |
| My materials                              | Okokwakha kwami                                    |
| Glazing basics                            | Izisekelo ze-glaze                                 |
| How to make a glaze                       | Indlela yokwenza i-glaze                           |
| Safe mixing and ventilation               | Ukuxuba ngokuphepha nomoya ohlanzekile             |
| Firing a basic kiln                       | Ukushisa ku-kiln elula                             |
| Don't poison your family                  | **Ungawadliseli ushevu umndeni wakho**             |
| Learn with John Britt's free glaze course | Funda ngesifundo samahhala se-glaze sikaJohn Britt |

**Pitfalls.**

- _upende_ is paint: never "glaze".
- _uhhavini_ is a kitchen oven and _isitofu_ a stove: never for a kiln. Keep **i-kiln** with the gloss _isithando
  sokushisa izitsha zobumba_ at first use. **Native check**.
- _umhlabathi_ is soil; clay is **ubumba**.
- Lead is **umthofu**, which some readers also know as a word for a pencil's "lead" and for bullets: write **umthofu
  (lead, Pb)** at first use on each page and keep **(Pb)** in every warning. **Native check**.

## 2. Glossary

**show English** marks terms whose English a reader can ask to see.

### 2.1 Glaze, materials and chemistry

| English                        | zu                                      | Notes                  |
| ------------------------------ | --------------------------------------- | ---------------------- |
| glaze **show English**         | i-glaze (9; ama-glaze 6)                | Loan. **Native check** |
| UMF, LOI, SG                   | i-UMF, i-LOI, i-SG                      | Kept with prefix.      |
| oxide                          | i-oxide                                 | Loan.                  |
| gloss, matte                   | ecwebezelayo, engacwebezeli (matte)     | **Native check**       |
| raw materials                  | okokwakha; izinto zokwakha              | **Native check**       |
| feldspar, kaolin, silica, frit | i-feldspar, i-kaolin, i-silica, i-frit  | Loans.                 |
| colorant                       | okokufaka umbala                        | **Native check**       |
| lead, barium, cadmium          | umthofu (lead, Pb), i-barium, i-cadmium | Doke (_umthofu_).      |

### 2.2 Clay, ware, kilns and firing

| English                           | zu                                      | Notes                   |
| --------------------------------- | --------------------------------------- | ----------------------- |
| pottery, potter                   | ukubumba; umbumbi                       | Doke.                   |
| clay                              | ubumba                                  | Doke.                   |
| pot                               | imbiza; ukhamba (beer pot)              | Doke.                   |
| earthenware, stoneware, porcelain | i-earthenware, i-stoneware, i-porcelain | Loans. **Native check** |
| bisque                            | i-bisque (ukushisa kokuqala)            | **Native check**        |
| kiln                              | i-kiln (isithando)                      | **Native check**        |
| firing, to fire                   | ukushisa; shisa                         | **Native check**        |
| cooling                           | ukupholisa                              |                         |

### 2.3 Defects and making

| English              | zu                                                   | Notes                                                                             |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| crazing              | i-crazing (imifantu emincane)                        | **Native check**                                                                  |
| leaching, leach test | ukuvuza kwezinsimbi; ukuphuma kwezinsimbi (leaching) | Metals in general (lead, cadmium, barium…), never lead alone. **Native check**    |
| batch                | i-batch                                              | Loan.                                                                             |
| scale                | isikali                                              |                                                                                   |
| sieve                | isihlungo; hlunga (verb)                             | Doke.                                                                             |
| test tile            | i-test tile                                          | Loan.                                                                             |
| opaque, opacifier    | ingabonisi (i-opaque); i-opacifier                   | Stops light passing (usually white), never "dark". **Native check**               |
| clear glaze          | i-glaze ebonisa ngaphakathi (transparent)            | Transparent, never "white". **Native check**                                      |
| soluble, dissolve    | -ncibilika emanzini / emzimbeni                      | Always name the water or body, so it is not melting in the kiln. **Native check** |
| kiln wash            | i-kiln wash                                          | Loan: the coating on kiln shelves.                                                |
| witness cone         | i-witness cone                                       | Loan.                                                                             |
| inch, foot           | iyintshi (amayintshi), ifidi (amafidi)               | "engu-1/4 yeyintshi". **Native check**                                            |
| early, too soon      | ngaphambi kwesikhathi                                | Never "in the morning". **Native check**                                          |
| less, fewer          | okuncane; -nciphisa                                  | Never "a little more". **Native check**                                           |

### 2.4 Health and safety

Never softened: a lead, barium or silica warning reads as strongly as the English. Chemical names and figures in
English and digits.

| English                       | zu                                                                          | Notes                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| dust                          | uthuli                                                                      | Doke.                                                                    |
| respirable crystalline silica | i-silica eyikristalu ehogelwayo; uthuli lwe-silica eyikristalu oluhogelwayo | Always _eyikristalu_ (not "ye-crystal"); never drop it. **Native check** |
| safety data sheet (SDS)       | ishidi ledatha yokuphepha (SDS)                                             | **Native check**                                                         |
| combustible                   | okungasha (combustible: noma yini engasha)                                  | **Native check**                                                         |
| silicosis                     | i-silicosis (isifo samaphaphu)                                              | **Native check**                                                         |
| respirator                    | i-respirator                                                                | Loan.                                                                    |
| poison, toxic                 | ushevu; -noshevu                                                            | Doke.                                                                    |
| food safe                     | iphephile ekudleni                                                          | **Native check**                                                         |
| lead-free                     | engenamthofu (lead-free)                                                    | **Native check**                                                         |
| at most / no more than        | okungeqile ku-; kuze kufike ku- (ubuningi)                                  | "less than" is _ngaphansi kuka-_: never for "at most".                   |
| at least                      | okungenani                                                                  |                                                                          |

**Who to call.** As the region data prints for South Africa: 10177 (ambulance), 10111 (police), 112 from a mobile, and
the Poisons Information Helpline 0861 555 777 (verified 2026-10-30). Nothing else.

### 2.5 The app's own words

| English              | zu                                                |
| -------------------- | ------------------------------------------------- |
| recipe               | iresiphi (ye-glaze); plural amaresiphi            |
| additive             | isithasiselo (izithasiselo)                       |
| access token         | i-access token (ama-access token)                 |
| Save, Save as a copy | Londoloza, Londoloza njengekhophi                 |
| Delete, Remove       | Susa, Khipha                                      |
| Cancel               | Khansela                                          |
| Sign in, Sign out    | Ngena, Phuma                                      |
| account, password    | i-akhawunti, iphasiwedi                           |
| Translation notice   | "Leli khasi lihunyushwe yi-AI lisuka esiNgisini." |

**Native check** on the whole table.

### 2.6 Round 14 terms (2026-11-04)

No Zulu ceramics source read for these; built from Doke's everyday words (_umlotha_ ash, _izinhlanga_ stalks,
_ilayisi_ rice, _itshe_ stone, _ukushisa isikhumba_ to burn the skin). **Native check** on all.

| English                      | zu                                                   | Notes                                         |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| wood ash                     | umlotha wezinkuni                                    | Doke _umlotha_.                               |
| synthetic ash (合成土灰)     | okufakwa esikhundleni okwenziwe (synthetic) kwe-土灰 | Japanese name kept, as the English.           |
| rice-straw ash (藁灰)        | umlotha wezinhlanga zelayisi                         |                                               |
| isu ash (柞灰)               | umlotha we-isu                                       |                                               |
| porcelain stone (瓷石)       | itshe le-porcelain                                   |                                               |
| caustic                      | uyashisa isikhumba (caustic)                         | English kept in brackets for the safety text. |
| slurry                       | i-slurry                                             | Loan.                                         |
| drop-and-hold; hold          | ukwehlisa nokulinda (drop-and-hold); ukulinda        |                                               |
| glass former; stabilizer     | umakhi wengilazi; isiqinisi                          |                                               |
| line blend, triaxial blend   | i-line blend, i-triaxial blend                       | Loans.                                        |
| shivering, crawling, dunting | i-shivering, i-crawling, i-dunting                   | Loans, glossed in the guide.                  |

## 3. Never translated

Formulas, cone numbers, units, codes, kiln makers, trade names, placeholders and tags; **UMF, LOI, SG, Orton, Seger,
HEPA, FFP2/FFP3, N95, GHS codes**; Glazecalc (with its prefix: _i-Glazecalc_).

## 4. Choices for the owner and a native potter

1. **Loans with hyphenated prefixes** (_i-glaze_, _i-kiln_): the PanSALB style for new loans. Confirm.
2. **Singular _u-_** for the reader: confirm.
3. Most South African potters read English: Zulu is offered for those who prefer it.
