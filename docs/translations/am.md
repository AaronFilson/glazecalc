# አማርኛ: የአጻጻፍ መመሪያ እና መዝገበ ቃላት (style sheet and glossary)

The rules and terms for translating Glazecalc into Amharic (`am`), as Ethiopia writes it in government, schools and the
press, for potters in Ethiopia. Read [README.md](README.md) first; [terms.md](terms.md) gives the meaning of every
English term. Every am message and guide follows this page: one Amharic word for one thing. Ethiopia has no region in
the app yet (the plan's ET waits for a confirmed emergency number).

**Notice: plainNotice.** Amharic is a `plainNotice` language (`lib/regions/languages.js`, docs/i18n-plan.md "later
regions"), as Irish and Maltese: machine translation of Amharic is weak, so its notice says so plainly, points to the
English, and a line of it stays on every page once closed. Write every message so the English stays one click away;
never hide or shorten the notice's text.

**What the sources could and could not give** (research 2026-10-31). Ethiopia has a large traditional pottery craft
(ሸክላ ሥራ, mostly women potters, open firing), but studio glaze chemistry is taught in English (Addis Ababa
University's Alle School of Fine Arts and Design, technical colleges). No Amharic glaze, kiln or SDS source was found.
The craft words below are standard dictionary words (Kesate Birhan Tesema's _የአማርኛ መዝገበ ቃላት_; the Ethiopian
Languages Research Center's dictionaries), not re-read online today; every chemistry term is an **English loan** in
Ethiopic letters with the English in brackets at first use, or the English itself. **Every row is Native check** unless
marked otherwise. Owner ruling 2026-11-01: native checks wait for readers' corrections and do not block the wave.

Main sources: **Dict.** (the dictionaries above, everyday words); **MS** (Microsoft's Amharic Windows and Office
terminology: ያስቀምጡ / አስቀምጥ Save, ሰርዝ Delete, ይቅር Cancel, ቅንብሮች Settings, ግባ / ውጣ sign in / out; **Native
check** against the live guide); **CLDR** (the app's `Intl` for am, Node 24: "1,234.5", decimal point, 24-hour "20:00",
Gregorian dates "14 ኦክቶበር 2026"; plural categories `one` (**0 and 1**: i = 0 or n = 1) and `other`).

## 1. Style sheet

**Script.** Ethiopic (Ge'ez fidel), U+1200–U+137F, in Unicode's composed syllables, NFC. Latin letters only for what
section 3 keeps (formulas, units, codes, trade names). No Ethiopic of another language's spelling (Tigrinya) for an
Amharic word. Words are separated by spaces, as modern Amharic writes them; the old word divider ፡ (U+1361) is
**never** used.

**Punctuation (the rule).**

- Full stop: **።** (U+1362, አራት ነጥብ) ends every sentence, with no space before it. Never a Latin "." after
  Ethiopic text. After a figure or a Latin unit at a sentence's end, still ። ("እስከ 1240 °C ያቃጥሉ።").
- Comma: **፣** (U+1363, ነጠላ ሰረዝ) between items and clauses. A Latin "," stays only inside a figure (12,500).
- Semicolon: **፤** (U+1364, ድርብ ሰረዝ).
- Colon: **፥** (U+1365) or the Latin ":" in a field label (the app's labels end in ":"; use ":" there for the
  layout). **Native check**.
- Question mark: **?** (Latin; the Ethiopic ፧ is rare today). Exclamation: **!**.
- Quotations: **«…»** (Amharic print uses guillemets). Brackets: Latin ( ).
- Ranges: en dash, unit once: "1222–1240 °C".

**Register.** Polite, respectful second person: address the reader with the formal **እርስዎ** forms (polite imperative
_ይምረጡ_, _ያስቀምጡ_, _ይልበሱ_), never the familiar አንተ/አንቺ forms, which also mark gender. Polite forms are
gender-neutral: use them everywhere, so no message assumes the reader's gender.

**Buttons and headings.** Buttons: the polite imperative or the verbal noun, as MS uses ("አስቀምጥ" / "ያስቀምጡ":
pick one, MS's form, for every button; **Native check**); no ።. Headings and tabs: noun phrases ("ቅንብሮች",
"የግላዝ አዘገጃጀቶች"). Errors: "… አልተቻለም።".

**Numbers.** The digits **0–9** always, **never Ethiopic numerals** (፩ ፪ ፫ …, U+1369–137C), which the numbers check
does not read and which have no zero. Decimal point (1.5), thousands with a comma (12,500 g), as CLDR am prints; the
English's figures as it writes them (1222 °C). A space before °C and unit symbols, none before %. **Dates: Gregorian**
as the app prints them ("14 ኦክቶበር 2026"), **never the Ethiopian calendar** (its year is 7–8 behind: 2026 is 2018/2019
E.C.), which the check would read as a figure the English lacks. **Times: the 24-hour clock (20:00), never Ethiopian
time** (counted from 06:00: 20:00 is "ከምሽቱ 2 ሰዓት"), which reads 2 for 20 and is off by six hours. A number the
English writes as a word stays a word (ሁለት ንብርብር).

**Plural forms.** CLDR am has `one` and `other`, and **`one` covers 0 and 1** (as Hindi's and Kannada's). So:

- `one` keeps `#`, since it also prints for 0.
- Where the English `one` has no `#`, add `=1` for exactly one and keep `one` with `#` (the check asks for it).
- Amharic marks plurals with -ዎች / -ኦች; after a numeral the singular is also common ("3 ጥሬ ዕቃ"): use the plural
  suffix in `other` for clarity.

```
{count, plural, =1 {ይህ ጥሬ ዕቃ} one {# ጥሬ ዕቃ} other {# ጥሬ ዕቃዎች}}
```

**Placeholders.** Amharic is verb-final and adds case markers to nouns (የ- "of", በ- "in/with", -ን object): never
attach a prefix or suffix to a placeholder ("በ{region}" breaks for a Latin name); put a noun before it ("በ{region}
አገር" → write "በአገሩ {region}" or "{region} ውስጥ"). **Native check** on the pattern.

**Cones.** **ኮን** (cone) with the number: "cone 6" → "ኮን 6"; Orton named: "የOrton ኮን 6". Seger and SK cones are
different series, never converted.

**The unity formula.** "የሴገር ፎርሙላ (UMF)" at first use, then "UMF". UMF, LOI, SG kept in Latin.

**The guides' titles** (**Native check**):

| English                                   | am                          |
| ----------------------------------------- | --------------------------- |
| Glazing basics                            | የግላዝ መሠረታዊ ነገሮች             |
| Making a glaze                            | ግላዝ ማዘጋጀት                   |
| Safe mixing and ventilation               | በጥንቃቄ መቀላቀል እና አየር ማናፈሻ     |
| Firing a basic kiln                       | ቀላል እቶን ማቃጠል                |
| Don't poison your family                  | **ቤተሰብዎን አይመርዙ**            |
| Learn with John Britt's free glaze course | በJohn Britt ነጻ የግላዝ ኮርስ ይማሩ |

The home-safety title keeps the owner's blunt form, never softened.

**Pitfalls.**

- **እርሳስ** is both lead (the metal) and a pencil. Write **እርሳስ (lead, Pb)** at every first use on a page, and in
  every safety warning keep "(Pb)". Never soften a lead warning to "may" where the English says "is".
- **ምድጃ** is a cooking stove or oven; a kiln is **እቶን** (furnace, kiln). Never ምድጃ for a kiln.
- **ቀለም** is paint, colour or ink: never for glaze. Glaze is the loan **ግላዝ (glaze)**.
- **አፈር** is soil; potter's clay is **ሸክላ** (also "pottery").
- ሲሊካ (silica) ≠ ሲሊከን (silicon) ≠ ሲሊኮን (silicone).
- **pencil ≠ እርሳስ** here: እርሳስ is kept for lead (Pb). An underglaze pencil is **የunderglaze መጻፊያ**; never እርሳስ
  for a pencil.
- No Latin word with an Amharic plural suffix for stains ("stainዎች"): write **stain ማቅለሚያዎች**.
- Colons in running prose, headings and bold labels are **፥**, never the Latin ":" (only a field label ending a
  string keeps ":") and never ፤ for an English colon.

## 2. Glossary

Every row **Native check** unless noted.

### 2.1 Glaze and chemistry

| English                       | am                   | Notes                       |
| ----------------------------- | -------------------- | --------------------------- |
| glaze **show English**        | ግላዝ (glaze)          | Loan.                       |
| unity molecular formula (UMF) | የሴገር ፎርሙላ (UMF)      |                             |
| loss on ignition (LOI)        | በእሳት የሚጠፋ ክብደት (LOI) |                             |
| oxide                         | ኦክሳይድ                | School chemistry.           |
| mole                          | ሞል                   | School chemistry.           |
| flux                          | ፍለክስ (flux)          |                             |
| thermal expansion             | የሙቀት መስፋፋት           |                             |
| gloss, matte                  | አንጸባራቂ, ደብዛዛ (matte) |                             |
| opacifier                     | ኦፓሲፋየር (opacifier)   | Loan; not ግልጽነት ቀናሽ, አደብዛዥ. |
| heatwork                      | የሙቀት ሥራ (heatwork)   | Never bare "heatwork".      |

### 2.2 Materials

| English               | am                                     | Notes         |
| --------------------- | -------------------------------------- | ------------- |
| raw materials         | ጥሬ ዕቃዎች                                | Dict.         |
| feldspar, kaolin      | ፌልድስፓር, ካኦሊን                           | Loans.        |
| silica                | ሲሊካ                                    |               |
| whiting               | whiting (ካልሲየም ካርቦኔት)                  |               |
| frit                  | ፍሪት (frit)                             |               |
| lead, barium, cadmium | እርሳስ (lead, Pb), ባሪየም (Ba), ካድሚየም (Cd) | Symbols kept. |
| zinc, lithium, boron  | ዚንክ, ሊቲየም, ቦሮን                         |               |
| colorant, stain       | ማቅለሚያ; stain                           |               |

### 2.3 Clay, ware and firing

| English                           | am                            | Notes  |
| --------------------------------- | ----------------------------- | ------ |
| clay, pottery                     | ሸክላ; ሸክላ ሥራ                   | Dict.  |
| potter                            | ሸክላ ሠሪ                        | Dict.  |
| pot, ware                         | ድስት, የሸክላ ዕቃዎች                | Dict.  |
| earthenware, stoneware, porcelain | earthenware, stoneware, ፖርሲሊን | Loans. |
| bisque                            | የመጀመሪያ ማቃጠል (bisque)          |        |
| glaze firing                      | የግላዝ ማቃጠል                     |        |

### 2.4 Kilns and firing

| English              | am                        | Notes         |
| -------------------- | ------------------------- | ------------- |
| kiln                 | እቶን                       | Dict.         |
| electric / gas kiln  | የኤሌክትሪክ / የጋዝ እቶን         |               |
| to fire, firing      | ማቃጠል                      | Dict.         |
| cone                 | ኮን                        | Loan.         |
| kiln shelf           | የእቶን መደርደሪያ               |               |
| oxidation, reduction | ኦክሲዴሽን, ሪዳክሽን (reduction) |               |
| cooling              | ማቀዝቀዝ                     |               |
| witness cone         | ምስክር ኮን (witness cone)    | Not የምስክር ኮን. |
| kiln wash            | የእቶን ቅብ (kiln wash)       |               |

### 2.5 Defects

| English    | am                           |
| ---------- | ---------------------------- |
| crazing    | crazing (በግላዙ ላይ ጥቃቅን ስንጥቆች) |
| crawling   | crawling (ግላዙ መሰብሰብ)         |
| pinholing  | pinholes (ጥቃቅን ቀዳዳዎች)        |
| leaching   | ብረቶች መውጣት (leaching)         |
| leach test | የብረቶች መውጣት ምርመራ (leach test) |

### 2.6 Making glaze

| English           | am                                   |
| ----------------- | ------------------------------------ |
| batch             | ባች (batch)                           |
| scale             | ሚዛን                                  |
| sieve             | ወንፊት; ማጣራት                           |
| specific gravity  | SG (አንጻራዊ ክብደት)                      |
| test tile         | የሙከራ ንጣፍ                             |
| underglaze pencil | የunderglaze መጻፊያ (underglaze pencil) |
| hard water        | ብዙ ማዕድን የተሟሟበት ውሃ (hard water)       |

### 2.7 Health and safety

Never softened: lead, barium and silica warnings read as strongly as the English; chemical names and figures in
English/digits (Pb, BaCO₃, 0.025 mg/m³). Because machine translation is weak here, the back-translation of every
safety sentence is compared line by line with the English before go-live.

| English                       | am                              | Notes                                         |
| ----------------------------- | ------------------------------- | --------------------------------------------- |
| dust                          | አቧራ                             | Dict.                                         |
| respirable crystalline silica | ወደ ሳንባ የሚገባ ክሪስታል ሲሊካ           |                                               |
| silicosis                     | ሲሊኮሲስ (የሳንባ በሽታ)                |                                               |
| respirator                    | የመተንፈሻ ጭምብል (respirator)        |                                               |
| poison, toxic                 | መርዝ; መርዛማ                       | Dict.                                         |
| food safe                     | ለምግብ ደህንነቱ የተጠበቀ                |                                               |
| lead-free                     | ከእርሳስ (lead) ነጻ                 |                                               |
| at most / no more than        | ቢበዛ; ከ… ያልበለጠ                   | "less than" is ከ… ያነሰ: never for "at most".   |
| at least                      | ቢያንስ                            |                                               |
| safety data sheet (SDS)       | የደህንነት መረጃ ሉህ (SDS); plural ሉሆች | Not …ሰነድ, …ወረቀት. "SDS" alone after first use. |

**Who to call (Ethiopia).** Secondary sources give 907 (ambulance, Red Cross), 991 (police), 939 (fire); one gives 911.
**None verified on an official Ethiopian page**, so none is in the region data; the translation names only what the
English and the data print. No poison line found.

### 2.8 The app's own words (MS; Native check)

| English                | am                                                             |
| ---------------------- | -------------------------------------------------------------- |
| recipe                 | የግላዝ አዘገጃጀት                                                    |
| Save                   | አስቀምጥ                                                          |
| Delete, Remove         | ሰርዝ, አስወግድ                                                     |
| Cancel                 | ይቅር                                                            |
| Sign in, Sign out      | ግባ, ውጣ                                                         |
| Settings               | ቅንብሮች                                                          |
| library (of materials) | ቤተ መጻሕፍት (never ቤተ መዛግብት, "archives")                          |
| account, password      | መለያ, የይለፍ ቃል                                                   |
| passkey                | የይለፍ ቁልፍ (passkey)                                             |
| Translation notice     | "ይህ ገጽ ከእንግሊዝኛ በAI ተተርጉሟል። ትርጉሙ ደካማ ሊሆን ይችላል፤ እንግሊዝኛውን ይመልከቱ።" |

### 2.9 Round 14 terms (2026-11-04)

No Amharic ceramics source read for these; built from Dict. everyday words (አመድ ash, ገለባ straw, ሩዝ rice, ድንጋይ
stone). **Native check** on all.

| English                    | am                                    | Notes                                         |
| -------------------------- | ------------------------------------- | --------------------------------------------- |
| wood ash                   | የእንጨት አመድ                             | Dict.                                         |
| synthetic ash (合成土灰)   | ለ土灰 ሰው ሠራሽ ምትክ                      | Japanese name kept, as the English.           |
| rice-straw ash (藁灰)      | የሩዝ ገለባ አመድ                           |                                               |
| isu ash (柞灰)             | isu አመድ                               |                                               |
| porcelain stone (瓷石)     | የፖርሲሊን ድንጋይ                           |                                               |
| caustic                    | ቆዳን ያቃጥላል (caustic)                   | English kept in brackets for the safety text. |
| slurry                     | slurry (የግላዝ ዝቃጭ)                     | Gloss at first use.                           |
| drop-and-hold; hold        | ዝቅ ማድረግ እና ማቆየት (drop-and-hold); ማቆየት |                                               |
| glass former; stabilizer   | መስታወት ሠሪ; ማረጋጊያ                       |                                               |
| line blend, triaxial blend | line blend, triaxial blend            | Kept in Latin.                                |
| product specification      | የምርት መግለጫ                             |                                               |

## 3. Never translated

Formulas, cone numbers, units, codes, trade names, placeholders and tags; **UMF, LOI, SG, Orton, Seger, HEPA,
FFP2/FFP3, N95, GHS codes**; Glazecalc in Latin letters.

## 4. Search terms

**Native check**: ግላዝ, የሸክላ ሥራ, ሸክላ ኢትዮጵያ.

## 5. Choices for the owner and a native potter

1. Buttons: MS's imperative form (አስቀምጥ) or the polite form (ያስቀምጡ)? Sheet: MS's, pending its live guide.
2. Field-label colon: Latin ":" (sheet) or Ethiopic ፥.
3. Whether the safety guides are translated or link the English for a plainNotice language: owner ruled 2026-10-31
   "safety guides translated in every language (blind back-translation as usual)".
