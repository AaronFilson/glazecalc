# ਪੰਜਾਬੀ: style sheet and glossary

For translating Glazecalc into Punjabi (`pa`), in Gurmukhi, for potters in India (region `IN`: Punjab). Read
[README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term below. [hi.md](hi.md) and
[mr.md](mr.md) are the models for the shape of this page, **not for its words**: Punjabi is close to Hindi, but no term on
this page is copied from hi.md, and several Hindi words mean something else in Punjabi or are not Punjabi at all (Hindi
सीसा is lead, Punjabi ਸ਼ੀਸ਼ਾ is glass or a mirror and ਸਿੱਕਾ is lead and also a coin; Hindi छलनी is a sieve, Punjabi ਛਾਨਣੀ;
Hindi चाहिए and ज़रूरी become ਚਾਹੀਦਾ and ਲਾਜ਼ਮੀ, which are kept apart below). Every Punjabi message and guide follows this
page: one Punjabi word for one thing. India fires by Orton cones by default, with temperatures one tap away, so the
Punjabi pages must read well with Orton cones and temperatures and say nothing about SK cones that the English does not
say.

**The owner's choices** (as for Hindi and Marathi):

- **Loanwords first.** The studio potters' English loanwords first, in Gurmukhi as Punjabi-speaking potters say them
  (ਗਲੇਜ਼, ਫ਼ਰਿਟ, ਕਿਲਨ, ਬਿਸਕ), **with the Punjabi technical term in brackets where it differs**. Each row says which tier it
  is in: (1) craft words potters say in English, (2) materials by the name on the bag, (3) chemistry and physics as
  Punjabi-medium science writes them, (4) health, safety and law in plain Punjabi.
- **The full stop.** A sentence ends with the Latin full stop ".". **This goes against the sources**: Microsoft's Punjabi
  style guide (MS 4.1.15, "A full stop or period (.) is used as (।) in Punjabi") and Google's Punjabi pages end sentences
  with the danda ।. The owner chose "." for Punjabi as for Hindi; the danda is never written. If the owner reverses this,
  the change is mechanical (the i18n check would need a Punjabi rule like Bengali's).
- **Digits and grouping.** The translations write 0 to 9 only. CLDR shows Punjabi readers 0 to 9 by default (`pa`'s
  numbering system is `latn`), with Indian grouping (12,34,567.5); the Digits setting's native choice shows Gurmukhi digits
  (੧੨,੩੪,੫੬੭.੫), which the translations never write.
- **The plain notice.** Punjabi has the plain translation notice (machine translation is weakest here: lib/regions/
  languages.js), so this page and a native reviewer carry more weight than for Hindi.
- **A native Punjabi reviewer** will check this page later: every row that rests on no Punjabi source is marked **No
  source**, and the rows to check first are marked **Native check** (listed at the end of the next section).

**What the sources could and could not give.** Almost nothing is written in Punjabi about studio glazes. The Indian
shops sell in English (Bhoomi, Clay Station), and Google's suggestions for Punjabi (hl=pa, gl=IN, 21 October 2026) know
no Gurmukhi search for ਗਲੇਜ਼, ਕਿਲਨ, ਪੌਟਰੀ, ਫੈਲਡਸਪਾਰ, ਪੋਰਸਲੇਨ or ਕੋਨ 6 at all; ਬਿਸਕ completes to biscuits, ਜਿਸਤ to "even
number", ਚੀਨੀ ਮਿੱਟੀ to crockery and dinner sets, and ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ to "in english". The Punjabi Wikipedia has a few
pottery and craft articles (ਪੌਟਰੀ, ਘੁਮਿਆਰ, ਆਵੀ ਪਾਉਣੀ, ਜੈਪੁਰ ਦੇ ਨੀਲੇ ਮਿੱਟੀ ਦੇ ਬਰਤਨ) and the chemistry words (ਆਕਸਾਈਡ,
ਸਿਲਿਕਾ, ਸਿੱਕਾ, ਜਿਸਤ, ਮੋਲ, ਅਣੂ, ਪਰਮਾਣੂ, ਆਕਸੀਕਰਨ, ਘੁਲਣਸ਼ੀਲ, ਬੋਰੈਕਸ). Microsoft's Punjabi style guide gives register,
punctuation, plurals of loanwords and error wording. **No Punjabi legal text, no PSEB textbook, no Punjabi University
glossary, no CSTT glossary and no Google, Microsoft or Apple Punjabi help page could be read** (see Not reached), so the
law rows, the sign-in rows and many technical brackets rest on less, and say so.

Main sources, cited below by short name (all read 21 October 2026):

- **Bhoomi**: Bhoomi Pottery, [Artha Pottery raw materials](https://in.bhoomi.com/collections/artha-pottery-raw-materials-india):
  "Ball Clay 1 Kg", "Barium Sulfate", "Calcium Borate 100 gms", "China Clay Kaolin Calcined 1 Kg", "Chrome Oxide", "Copper
  Oxide", "Fire Clay 1 Kg", "Frit 1003 1 Kg", "Frit 1005 Alkaline 750°C Luster, Raku, Crystalline 1 Kg", "Frit 1006 High
  Alkaline. Special Purpose High Soda Frit", "Frit 1007 Transparent Crackle & Raku", "Frit 1009 Lead Based 1 Kg", "Grog -
  Coarse", "Ilmenite", "Iron Oxide Black", "Iron Oxide Red", "Magnesium Carbonate", "Magnesium Oxide", "Manganese
  Dioxide", "Nickel Oxide", "Pottery Talc 1 Kg", "Rutile", "Soda Feldspar 1 Kg", "Strontium Carbonate", "Wollastonite";
  clays "Terracotta", "Earthenware", "Stoneware", "Porcelain", "Raku Clay"; menus "Clay", "Glazes", "Raw Materials",
  "Tools", "Equipment", "Kilns".
- **Clay Station**: Clay Station, Bengaluru, [flux menu](https://online.claystation.in/collections/flux-menu): "CS Potash
  Feldspar (G-325)", "CS Soda Feldspar (G-325)", "CS Nepheline Syenite (G-325)", "CS Whiting (G-200)", "CS Dolomite
  (G-325)", "CS Talc (G1-200)", "CS Zinc Oxide (G-325)", "CS Barium Carbonate (G)", "CS Tricalcium Phosphate (G-200)",
  "Lithium Carbonate (G-200)", "CS Wollastonite (G-325)", "Ferro Frit 3134"; menus "Clay", "Glazes", "Raw Materials",
  "Studio Equipment".
- **pawiki**: the Punjabi Wikipedia, read through its API ([pa.wikipedia.org](https://pa.wikipedia.org/w/api.php); the
  script and its output are in `scratch/round9/indic/work-pa/` in the main checkout): ਆਵੀ ਪਾਉਣੀ ("ਘੁਮਿਆਰ ਜਿਸ ਬੜੀ ਭੱਠੀ
  ਵਿਚ ਭਾਂਡੇ ਪਕਾਉਂਦੇ ਹਨ, ਉਸ ਨੂੰ ਆਵੀ ਕਹਿੰਦੇ ਹਨ", "ਭਾਂਡੇ ਚੱਕ ਉੱਪਰ", "ਸੁੱਕੇ ਭਾਂਡਿਆ ਨੂੰ ਆਵੀ ਵਿਚ ਚਿਣਿਆ ਜਾਂਦਾ ਸੀ"); ਪੌਟਰੀ ("ਮਿੱਟੀ
  ਦੇ ਭਾਂਡੇ, ਪੱਥਰ ਦੇ ਭਾਂਡੇ, ਪੋਰਸਲੀਨ ਦੇ ਭਾਂਡੇ"); ਘੁਮਿਆਰ ("ਇੱਕ ਜਾਤ ਜਾਂ ਭਾਈਚਾਰਾ … ਜਿਸ ਲਈ ਅੰਗਰੇਜ਼ੀ ਸ਼ਬਦ ਪੌਟਰ ਹੈ"; also a
  millipede); ਜੈਪੁਰ ਦੇ ਨੀਲੇ ਮਿੱਟੀ ਦੇ ਬਰਤਨ ("ਸਿਰੇਮਿਕ ਫਰਿਟ ਸਮੱਗਰੀ", "ਚਮਕਦਾਰ ਅਤੇ ਘੱਟ ਅੱਗ ਵਾਲੇ", "ਕੋਬਾਲਟ ਨੀਲੇ"); ਛੱਤ ਦੀਆਂ
  ਟਾਇਲਾਂ ("ਵਾਟਰਪ੍ਰੂਫ ਗਲੇਜ਼ ਹੁੰਦਾ ਹੈ"); ਬੋਰੈਕਸ ("ਬਰਤਨ ਦੇ ਗਲੇਜ਼ ਦੇ ਇੱਕ ਹਿੱਸੇ ਵਜੋਂ", "ਮੀਨਾਕਾਰੀ", "ਪਾਣੀ ਵਿੱਚ ਘੁਲ ਜਾਂਦਾ ਹੈ",
  "ਘੱਟੋ-ਘੱਟ 10%"); ਕੱਚ ("ਸਿਲਿਕਾ (ਸਿਲਿਕਨ ਡਾਈਆਕਸਾਈਡ, ਜਾਂ ਕੁਆਰਟਜ਼)", "ਲਗਭਗ 70% ਸਿਲਿਕਾ ਹੁੰਦਾ ਹੈ", "ਆਕਾਰਹੀਣ ਠੋਸ",
  "ਸੋਡਾ-ਚੂਨਾ ਗਲਾਸ"); ਸਿਲੀਕਾਨ ਡਾਈਆਕਸਾਈਡ ("ਸਿਲੀਕਾਨ ਡਾਈਆਕਸਾਈਡ ਜਾਂ ਸਿਲੀਕਾ … SiO2"); ਸਿੱਕਾ (ਧਾਤ) ("ਸਿੱਕਾ ਇੱਕ ਰਸਾਇਣਕ ਤੱਤ
  ਹੈ ਜਿਹਦਾ ਨਿਸ਼ਾਨ Pb"); ਸਿੱਕੇ ਨਾਲ ਜ਼ਹਿਰ ਫੈਲਣਾ (lead poisoning); ਜਿਸਤ ("ਜਿਸਤ (ਅੰਗ੍ਰੇਜ਼ੀ: Zinc)"); ਮੋਲ (ਇਕਾਈ); ਅਣੂ ("ਅਣੂ
  (ਅੰਗਰੇਜ਼ੀ: molecule)"); ਪਰਮਾਣੂ ("ਪਰਮਾਣੂ (… ਅੰਗਰੇਜ਼ੀ: atom)", "ਪਰਮਾਣੂ-ਭਾਰ"); ਰਿਡਾਕਸ ("ਰਿਡੱਕਸ਼ਨ (ਅਣਾਆਕਸੀਕਰਨ) ਅਤੇ
  ਆਕਸੀਕਰਨ"); ਆਕਸਾਈਡ ("ਆਕਸਾਈਡਾਂ"); ਸੋਡੀਅਮ ਕਲੋਰਾਈਡ ("ਘੁਲਣਸ਼ੀਲ ਨਮਕ", "ਅਘੁਲਣਸ਼ੀਲ ਨਮਕ"); ਪੌਲੀਵਿਨਾਇਲ ਕਲੋਰਾਈਡ ("ਥੋੜ੍ਹਾ
  ਘੁਲਣਸ਼ੀਲ"); ਖ਼ਾਰ ("ਇੱਕ ਘੁਲਣਸ਼ੀਲ ਖ਼ਾਰ ਨੂੰ ਅਲਕਲੀ ਕਹਿ ਦਿੱਤਾ ਜਾਂਦਾ ਹੈ"); ਕੈਲਸ਼ੀਅਮ ("ਖਾਰੀ ਧਰਤੀ ਧਾਤ", "ਸਟ੍ਰੋਂਟੀਅਮ ਅਤੇ
  ਬੇਰੀਅਮ"); ਚੂਨਾ ("ਕੈਲਸੀਅਮ ਆਕਸਾਈਡ ਜਾਂ ਕੈਲਸੀਅਮ ਹਾਈਡ੍ਰੋਕਸਾਈਡ ਹੀ ਚੂਨੇ"); ਚੂਨੇਦਾਰ ਚਟਾਨ ("ਚੂਨਾ ਪੱਥਰ", "ਚਾਕ"); ਕਾਰਬਨ
  ਮੋਨੋਆਕਸਾਈਡ ("ਰੰਗਹੀਨ, ਗੰਧਹੀਨ"); ਜ਼ਹਿਰ ("ਜ਼ਹਿਰ ਜਾਂ ਵਿਹੁ"); ਭੱਠੀ (a grain-roasting hearth), ਪੰਜਾਬੀ ਭੱਠੀ (a tandoor),
  ਨਿਊਕਲੀ ਭੱਠੀ ("ਪਰਮਾਣੂ ਭੱਠੀ", a nuclear reactor), ਧਮਨ ਭੱਠੀ (a blast furnace); ਪੋਟਾਸ਼ ("ਪੋਟਾਸ਼ੀਅਮ ਨਾਲ ਭਰਪੂਰ ਖਾਦਾਂ"); ਸੁਹਾਗਾ
  (a farm plank-harrow).
- **MS**: [Microsoft Punjabi (India) Localization Style Guide](https://download.microsoft.com/download/6/e/1/6e182831-d6d0-40cd-869d-d3642702faf5/pan-ind-StyleGuide.pdf)
  (2023; its text layer garbles some letters, ਿ for ਸ, ਗ and ਵ among them: read through them): 2.1 ("clear, friendly and
  concise"; Pick, choose "ਚੁਣੋ"), 2.2.1 ("ਕੀ ਤੁਸੀਂ ਜਾਰੀ ਰੱਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?", "ਆਪਣੇ PC ਨੂੰ ਇੱਕ ਨਾਮ ਦਿਓ", "PC ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਉੱਚ
  ਕੰਟਰਾਸਟ ਨੂੰ ਬੰਦ ਕਰੋ", "ਪਾਸਵਰਡ ਸਹੀ ਨਹੀਂ ਹੈ"), 3.1 ("ਤੁਸੀਂ ਕਲਿੱਕ ਕੀਤਾ", not "ਤੂੰ ਨੇ"; "ਤੁਸੀਂ ਨਹੀਂ ਗਏ"; generic people in
  the plural, ਲੋਕ, ਵਿਅਕਤੀ; never ਉਸਦਾ/ਉਸਦੀ for a generic person), 3.2 (Select "ਚੁਣੋ", not Click "ਕਲਿੱਕ ਕਰੋ"), 4.1.2
  (acronyms kept; "ਮਲਟੀ-ਫੈਕਟਰ ਪ੍ਰਮਾਣੀਕਰਨ (multifactor authentication, MFA)"), 4.1.5 ("USB ਡਰਾਈਵ", "Windows ਪਾਸਵਰਡ":
  a Latin name before a Punjabi noun), 4.1.8 (three genders by MS's count; agreement), 4.1.9 (ਦਾ, ਦੇ, ਦੀ, ਦਿਆਂ, ਦੀਆਂ;
  no genitive on a trademark), 4.1.12 (loanword plurals "ਕਲਾਇੰਟਾਂ", "ਵੈੱਬਸਾਈਟਾਂ", "ਡਾਉਨਲੋਡ"; direct and oblique), 4.1.13
  (postpositions apart: ਵਿੱਚ, ਨੂੰ, ਤੋਂ, ਨਾਲ, ਲਈ; "ਟੈਬ ‘ਤੇ"), 4.1.15 (comma and colon as English; hyphen with no spaces,
  "ਈ-ਮੇਲ"; en dash for ranges, "15–20"; ellipsis "..."; the period written as ।; “ ” and ‘ ’; parentheses), 4.1.19 (no
  special symbol rules), 4.1.20 ("ਐਕਸੈਸ ਵਰਜਿਤ।"; "may" as ਸਕਦੀ ਹੈ), 5.4.2 ("ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ ਹੈ।", "ਖੋਲ੍ਹ ਨਹੀਂ ਸਕਦਾ",
  "ਕਨੈਕਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ ਰਿਹਾ", "ਉਪਲਬਧ ਨਹੀਂ ਹੈ", "%s ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ", ਤਰੁੱਟੀ for an error), 5.4.4 (Save "ਸੁਰੱਖਿਅਤ ਕਰੋ",
  Print "ਪ੍ਰਿੰਟ/ਛਪਾਈ", Cancel "ਰੱਦ ਕਰੋ", Delete "ਮਿਟਾਓ", Help "ਮਦਦ"; Delete from server "ਹਟਾਓ").
- **Google suggest**: suggestqueries.google.com with hl=pa and gl=IN, web and YouTube (21 October 2026; the script and its
  output are in `scratch/round9/indic/work-pa/`): see Search terms; also "ਸਿਲਿਕਾ ਡਸ੍ਟ", "ਸਿਲੀਕੋਸਿਸ ਕੀ ਹੈ", "ਚਿੱਟਾ ਸੁਹਾਗਾ",
  "ਸੁਹਾਗਾ meaning in english", "ਘੁਲਣਸ਼ੀਲ meaning in english", "ਜਿਸਤ ਸੰਖਿਆ", "ਘੁਮਿਆਰ ਜਾਤ", "ਘੁਮਿਆਰ ਕੀੜਾ", "chini mitti
  dinner set", "ਬਿਸਕੁਟ" for ਬਿਸਕ, "ਫਰਿੱਜ" for ਫਰਿੱਟ, "mask n95 respirator".
- **CLDR**: Node 24's ICU 78.3 (CLDR 48) for `pa`: plural categories `one`, `other` (0 and 1 are `one`; 0.5, 1.5 and 2 are
  `other`); "12,34,567.5" in Latin digits by default (Gurmukhi with `-u-nu-guru`: ੧੨,੩੪,੫੬੭.੫); "5%"; long date "14 ਅਕਤੂਬਰ
  2026"; month and year "ਅਕਤੂਬਰ 2026"; the default short time "8:00 PM" (12-hour), 24-hour "20:00"; the month names; lists
  "ੳ, ਅ ਅਤੇ ੲ"; region names ਭਾਰਤ, "ਹਾਂਗ ਕਾਂਗ ਐਸਏਆਰ ਚੀਨ", "ਸੰਯੁਕਤ ਰਾਜ (ਅਮਰੀਕਾ)", ਯੂਨਾਈਟਡ ਕਿੰਗਡਮ, ਜਰਮਨੀ, ਜਪਾਨ,
  ਪਾਕਿਸਤਾਨ, ਕੈਨੇਡਾ, ਆਸਟ੍ਰੇਲੀਆ, ਨਿਊਜ਼ੀਲੈਂਡ; language names ਪੰਜਾਬੀ, ਅੰਗਰੇਜ਼ੀ.
- **Regions**: `lib/regions` (safety.js, workplace.js, food.js, suppliers.js, entry `IN`): 112 (ERSS); the National Poisons
  Information Centre (NPIC), AIIMS New Delhi, 1800 116 117, 24 hours, toll free; the state centres (CMC Vellore, JSS
  Mysuru); DGOSH; the OSH Code, 2020, s.88 (each state sets its limits); IS 9473:2002 (FFP1 to FFP3); IS 9806:2001
  (voluntary, so not shown).

**Not reached:** Google's Punjabi help pages (support.google.com with hl=pa serves the English body under a Punjabi
"ਤੁਹਾਡੇ ਵੱਲੋਂ ਬੇਨਤੀ ਕੀਤਾ ਪੰਨਾ ਫ਼ਿਲਹਾਲ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।", which shows Google's danda and ਤੁਸੀਂ; Google's
Safety Center has no Punjabi page), Microsoft's and Apple's Punjabi help pages (none found), CSTT's glossaries, PSEB's
Punjabi-medium chemistry and physics books and Punjabi University Patiala's dictionaries (web search found none online),
any Punjabi text of the Occupational Safety, Health and Working Conditions Code, the Factories Act or the Punjab Factory
Rules, the Punjabi titles of IS 9473 and IS 9806, any Punjabi GHS label text, AIIMS's and DGOSH's Punjabi pages (none
found), and any Punjabi pottery course, studio page or kiln manual (search found no Gurmukhi page for Mohali, Ropar,
Ludhiana or Hoshiarpur's potters, Aura Pottery or Andretta; Andretta is in Himachal Pradesh and writes in English). **The
kiln, controller, firing-log, defect, law and sign-in rows rest on the potters' English and plain Punjabi, on no Punjabi
source.**

## Choices for the owner and a native potter

These are the questions this page cannot settle from sources; each has a recommendation, used below until answered.

- **ਤੁਸੀਂ or ਆਪ:** **ਤੁਸੀਂ**, with the -ਓ imperative (ਕਰੋ, ਚੁਣੋ, ਹਟਾਓ). Both Microsoft (MS 2.2.1, 3.1: "ਕੀ ਤੁਸੀਂ ਜਾਰੀ ਰੱਖਣਾ
  ਚਾਹੁੰਦੇ ਹੋ?", "ਤੁਸੀਂ ਕਲਿੱਕ ਕੀਤਾ" not "ਤੂੰ ਨੇ ਕਲਿੱਕ ਕੀਤਾ") and Google's Punjabi notice ("ਤੁਹਾਡੇ ਵੱਲੋਂ", "ਤੁਹਾਡੀ ਭਾਸ਼ਾ") use
  ਤੁਸੀਂ; ਆਪ is the very formal or reverential pronoun, and Punjabi software does not address the reader with it (MS lists ਆਪ
  only as a pronoun, and uses ਆਪਣਾ, "one's own", throughout). Never ਤੂੰ.
- **The kiln:** **ਕਿਲਨ**, with (ਭੱਠੀ) at its first use in each guide section, as the owner's loanword rule says. ਭੱਠੀ alone
  is a grain-roasting hearth, a tandoor, a blast furnace and a nuclear reactor in pawiki (ਭੱਠੀ, ਪੰਜਾਬੀ ਭੱਠੀ, ਧਮਨ ਭੱਠੀ, ਨਿਊਕਲੀ
  ਭੱਠੀ), and a ਭੱਠਾ is a brick kiln. pawiki's **ਆਵੀ** is the village potter's kiln ("ਘੁਮਿਆਰ ਜਿਸ ਬੜੀ ਭੱਠੀ ਵਿਚ ਭਾਂਡੇ ਪਕਾਉਂਦੇ
  ਹਨ"), a heap of pots, dung cakes and sawdust fired in the open: used only where the English means a traditional or pit
  firing, never for an electric or gas kiln. A native potter may choose ਭੱਠੀ throughout; the change is mechanical.
- **Firing:** the noun **ਫਾਇਰਿੰਗ** (f.) for a firing, the verb **ਪਕਾਉਣਾ** for to fire ("ਕੋਨ 6 ਤੱਕ ਪਕਾਓ"), as pawiki writes
  it ("ਭਾਂਡੇ ਪਕਾਉਂਦੇ ਹਨ"); fired ware is **ਪੱਕਿਆ** (ਪੱਕੇ ਭਾਂਡੇ), unfired **ਕੱਚਾ** (ਕੱਚੇ ਭਾਂਡੇ), the everyday Punjabi pair. Native
  check.
- **Material:** **ਸਮੱਗਰੀ** (f.; pawiki "ਸਿਰੇਮਿਕ ਫਰਿਟ ਸਮੱਗਰੀ", "ਸਮੱਗਰੀਆਂ"), plural **ਸਮੱਗਰੀਆਂ**. Microsoft also uses ਸਮੱਗਰੀ
  for "content" ("ਵਿਅਕਤੀਗਤ ਸਮੱਗਰੀ"), which the context here rules out; the alternative is ਪਦਾਰਥ (m., a substance). Native
  check, first of all.
- **Lead:** **ਲੈੱਡ (ਸਿੱਕਾ)**: the loanword first, as Bhoomi's bag says ("Frit 1009 Lead Based"), with pawiki's ਸਿੱਕਾ
  ("ਸਿੱਕਾ (ਧਾਤ)", "ਸਿੱਕੇ ਨਾਲ ਜ਼ਹਿਰ ਫੈਲਣਾ") in brackets at its first use in each section. **ਸਿੱਕਾ alone is also a coin**, so a
  button "ਸਿੱਕਾ ਬਦਲੋ" would read "change the coin": the setting, buttons and labels say ਲੈੱਡ. Lead-free **ਲੈੱਡ-ਰਹਿਤ**. Never
  Hindi सीसा, never ਸੀਸਾ or ਸ਼ੀਸ਼ਾ (glass, a mirror). A native potter may prefer ਸਿੱਕਾ in the safety text; Native check.
- **Specific gravity:** **ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ** with (ਸਾਪੇਖੀ ਘਣਤਾ) at its first use in a section: the unitless ratio, which
  potters read as "SG"; ਸਾਪੇਖੀ ਘਣਤਾ is school physics' relative density (No source: no Punjabi text was read; Google suggest
  knows neither ਸਾਪੇਖੀ ਘਣਤਾ nor ਵਿਸ਼ਿਸ਼ਟ ਗੁਰੂਤਾ). `guides.density.sg`: "ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ {value}". The setting "Glaze density" is
  **ਗਲੇਜ਼ ਦਾ ਗਾੜ੍ਹਾਪਣ** (thickness), never ਘਣਤਾ (density in g/cm³). Native check.
- **Kaolin:** **ਕਾਓਲਿਨ (ਚਾਈਨਾ ਕਲੇ)**, as Indian shops sell it ("China Clay Kaolin Calcined"); never ਚੀਨੀ ਮਿੱਟੀ, which
  Punjabi uses for crockery and porcelain (Google suggest: "chini mitti dinner set", "chini mitti cup set"; pawiki "ਚੀਨੀ
  ਮਿੱਟੀ ਦੇ ਭਾਂਡਿਆਂ").
- **Guide and manual:** the app's guides are **ਗਾਈਡ** (f.), a kiln's manual is **ਮੈਨੂਅਲ** (m.). Never the same word, and
  never ਮੈਨੂਅਲ for a manual kiln (ਹੱਥ ਨਾਲ ਚਲਾਇਆ ਜਾਣ ਵਾਲਾ ਕਿਲਨ). ਗਾਈਡ ਕੋਨ (guide cone) is a cone's name and stays.
- **Save:** **ਸੇਵ ਕਰੋ**, not Microsoft's ਸੁਰੱਖਿਅਤ ਕਰੋ (MS 5.4.4): ਸੁਰੱਖਿਅਤ is "safe" throughout this app's safety text (ਭੋਜਨ
  ਲਈ ਸੁਰੱਖਿਅਤ, ਸੁਰੱਖਿਅਤ ਮਿਲਾਉਣਾ), and a reader must never meet one word for both. No source for ਸੇਵ ਕਰੋ (Native check).
- **The genders of loanwords:** chosen by analogy (MS 4.1.8, 4.1.12) and marked in each row; pawiki fixes ਗਲੇਜ਼ (m.:
  "ਗਲੇਜ਼ ਹੁੰਦਾ ਹੈ") and ਸਿਲਿਕਾ (m.: "70% ਸਿਲਿਕਾ ਹੁੰਦਾ ਹੈ"); a native potter should confirm ਫ਼ਰਿਟ (m.), ਕਿਲਨ (m.), ਸਲਿੱਪ
  (f.), ਫਾਇਰਿੰਗ (f.), ਰੈਸਿਪੀ (f.) and ਕੋਨ (m.) first.
- **The full stop:** "." (the owner's choice), against MS and Google's । (see the opening).
- **Poison line:** AIIMS's National Poisons Information Centre (1800 116 117) is verified (Regions); no Punjabi name was
  found, so the name stays as published, with a Punjabi description once: **ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ**.

**Native check, first:** ਸਮੱਗਰੀ and its plural; ਲੈੱਡ against ਸਿੱਕਾ; ਕਿਲਨ against ਭੱਠੀ; ਪਕਾਉਣਾ for to fire; ਸੇਵ ਕਰੋ for Save;
the genders above; ਗਲੇਜ਼'s bracket (ਕੱਚ ਵਰਗੀ ਪਰਤ); ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ and ਗਾੜ੍ਹਾਪਣ; ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ and ਯੂਨਿਟੀ; ਅੱਗ ਨਾਲ ਭਾਰ
ਘਾਟਾ (LOI); ਅਣਵੀ ਭਾਰ; ਫ਼ਲਕਸ (ਪਿਘਲਾਉਣ ਵਾਲਾ); ਰਿਡਕਸ਼ਨ's bracket; the defect loanwords and their brackets; ਸਾਹ ਰਾਹੀਂ ਅੰਦਰ
ਜਾਣ ਵਾਲੀ ਕ੍ਰਿਸਟਲਿਨ ਸਿਲਿਕਾ; the law words (ਵੱਧ ਤੋਂ ਵੱਧ, ਘੱਟੋ-ਘੱਟ); ਗਾਈਡ for the guides; the five guides' titles (2.8);
ਛਾਨਣੀ and ਤੱਕੜੀ; ਲਾਜ਼ਮੀ against ਚਾਹੀਦਾ (Register); the hedge "tend to" as ਦਾ ਰੁਝਾਨ (Register).

## 1. Style sheet

### Register

**ਤੁਸੀਂ**, polite and plain, in the interface, errors, notices, emails, the safety text and the guides alike: one
register, never ਤੂੰ (see Choices). Microsoft's voice is "clear, friendly and concise … conversation observed in everyday
settings" (MS 2.1): ਚੁਣੋ, not ਚੋਣ ਕਰੋ; ਬਦਲੋ, not ਪਰਿਵਰਤਿਤ ਕਰੋ; ਵੇਖੋ, not ਹਵਾਲਾ ਲਓ; ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ. The same plain words in
the guides: ਛਾਣੋ, ਤੋਲੋ, ਰਲਾਓ.

- **Instructions** (guides and help): the -ਓ imperative, as MS writes it ("ਇਸ ਫਾਈਲ ਨੂੰ ਮਿਟਾਓ।", written here with "."):
  "ਗਲੇਜ਼ ਨੂੰ 80 ਮੈੱਸ਼ ਦੀ ਛਾਨਣੀ ਵਿੱਚੋਂ ਦੋ ਵਾਰ ਛਾਣੋ.", "ਸਮੱਗਰੀਆਂ ਤੋਲਦੇ ਸਮੇਂ ਰੈਸਪੀਰੇਟਰ ਪਹਿਨੋ." Not the -ਣਾ ਚਾਹੀਦਾ ਹੈ form for
  an instruction (that is "should"), not ਕਿਰਪਾ ਕਰਕੇ on every button (MS keeps it for messages that ask a favour).
- **Buttons:** the -ਓ form, the verb last: ਸੇਵ ਕਰੋ, ਪ੍ਰਿੰਟ ਕਰੋ, ਤੁਲਨਾ ਕਰੋ, ਮਿਟਾਓ, ਰੱਦ ਕਰੋ.
- **Errors:** short, impersonal, never the computer as "I" (MS 5.4.2): "ਰੈਸਿਪੀ ਸੇਵ ਨਹੀਂ ਹੋ ਸਕੀ. ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ.", "ਇਹ ਫਾਈਲ
  ਪੜ੍ਹੀ ਨਹੀਂ ਜਾ ਸਕੀ.", "ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ ਹੈ." (MS's own, with "." for ।).
- **Notices:** plain statements: "ਇਸ ਪੰਨੇ ਦਾ ਅਨੁਵਾਦ AI ਨੇ ਕੀਤਾ ਹੈ. ਅੰਗਰੇਜ਼ੀ ਪੰਨਾ ਪੜ੍ਹਨ ਲਈ ਇੱਥੇ ਵੇਖੋ."
- **Guide sentences:** impersonal statements and the -ਓ imperative: "ਜੇ ਗਲੇਜ਼ ਬਹੁਤ ਮੋਟਾ ਹੋਵੇ ਤਾਂ ਫਾਇਰਿੰਗ ਵਿੱਚ ਵਗਦਾ ਹੈ.",
  "ਬਿਸਕ ਕੀਤੇ ਭਾਂਡੇ ਉੱਤੇ ਗਲੇਜ਼ ਛੇਤੀ ਲੱਗ ਜਾਂਦਾ ਹੈ."
- **Should, must, may** keep apart, as the English has them:
  - "must" → **…ਣਾ ਲਾਜ਼ਮੀ ਹੈ** ("ਮਾਸਕ ਪਹਿਨਣਾ ਲਾਜ਼ਮੀ ਹੈ"); a legal duty ("shall") → **ਲਾਜ਼ਮੀ ਹੋਵੇਗਾ** or **ਲਾਜ਼ਮੀ ਹੈ**.
    "must not" → **ਨਾ …ਓ** in an instruction ("ਸੁੱਕਾ ਝਾੜੂ ਨਾ ਵਰਤੋ") or **…ਣਾ ਮਨ੍ਹਾ ਹੈ** for a rule.
  - "should" → **…ਣਾ ਚਾਹੀਦਾ ਹੈ** ("ਮਾਸਕ ਪਹਿਨਣਾ ਚਾਹੀਦਾ ਹੈ"); "should not" → **ਨਹੀਂ …ਣਾ ਚਾਹੀਦਾ** ("ਸੁੱਕਾ ਝਾੜੂ ਨਹੀਂ
    ਵਰਤਣਾ ਚਾਹੀਦਾ"). **Never ਲਾਜ਼ਮੀ or ਜ਼ਰੂਰੀ for "should", never ਚਾਹੀਦਾ for "must".** ਜ਼ਰੂਰੀ ("necessary") is kept for
    "necessary", "essential" and "required" where the English says so.
  - "may" (a hazard, a hedge that must survive) → **…ਸਕਦਾ/ਸਕਦੀ ਹੈ** with the hazard as subject ("ਕੈਂਸਰ ਹੋ ਸਕਦਾ ਹੈ", "ਇਸ
    ਵਿੱਚ ਕੁਝ ਬਰੀਕ ਕੁਆਰਟਜ਼ ਹੋ ਸਕਦਾ ਹੈ"; MS 4.1.20: "ਰੂਪਾਂਤਰਿਤ ਕਰਨ ਦਾ ਜਤਨ ਕਰ ਸਕਦੀ ਹੈ"); "may" (permission) → **ਤੁਸੀਂ
    …ਸਕਦੇ ਹੋ** ("ਤੁਸੀਂ ਬਦਲ ਸਕਦੇ ਹੋ"). The possibility never takes ਤੁਸੀਂ as its subject, so it cannot read as permission.
  - "must be tested" → **ਦੀ ਜਾਂਚ ਕਰਨੀ ਲਾਜ਼ਮੀ ਹੈ**: the test is done, not passed; never "ਜਾਂਚ ਵਿੱਚ ਪਾਸ ਹੋਣਾ ਲਾਜ਼ਮੀ".
  - "some" (some fine quartz) → **ਕੁਝ**, never **ਥੋੜ੍ਹਾ** (a little). "never" → **ਕਦੇ ਵੀ … ਨਹੀਂ/ਨਾ** only where the
    English says never; no ਹਮੇਸ਼ਾ, ਬਿਲਕੁਲ or ਜ਼ਰੂਰ the English lacks. "not fully" → **ਪੂਰੀ ਤਰ੍ਹਾਂ … ਨਹੀਂ**, never "not at all".
- **Hedges keep their place and their strength** (the earlier reviews found each of these lost once): "about" →
  **ਲਗਭਗ** (pawiki "ਲਗਭਗ 70%") or **ਤਕਰੀਬਨ**; "usually" → **ਆਮ ਤੌਰ ਉੱਤੇ**; "often" → **ਅਕਸਰ**; "probably" → **ਸੰਭਵ ਤੌਰ
  ਉੱਤੇ** or **ਜ਼ਿਆਦਾ ਸੰਭਾਵਨਾ ਹੈ ਕਿ**; "perhaps", "maybe" → **ਸ਼ਾਇਦ**, never for "probably"; "tend to" → **…ਣ ਦਾ ਰੁਝਾਨ
  ਹੁੰਦਾ ਹੈ** or **…ਣ ਵੱਲ ਝੁਕਦਾ ਹੈ** ("ਵਗਣ ਦਾ ਰੁਝਾਨ ਹੁੰਦਾ ਹੈ"), never ਆਮ ਤੌਰ ਉੱਤੇ (the app has separate "tends" and
  "probably" messages, and ਆਮ ਤੌਰ ਉੱਤੇ is "usually"); "may shiver" → **…ਸਕਦਾ ਹੈ**, never a plain "does"; "as much as" →
  **…ਤੱਕ** ("ਚਾਰ ਗੁਣਾ ਤੱਕ"). Add no emphasis the English lacks ("even trace amounts"), and keep a reported practice a
  report ("is opened", not "should be opened").
- **Capitals for emphasis.** Gurmukhi has no capitals. English capitals for emphasis (NOT, NEVER in a guide) become the
  Punjabi word in bold (**ਨਹੀਂ**, **ਕਦੇ ਵੀ ਨਹੀਂ**); in a JSON message, where bold does not show, the plain word. A warning
  in capitals (CONTAINS LEAD, LEAD FRIT) starts with **ਸਾਵਧਾਨ:** instead ("ਸਾਵਧਾਨ: ਇਸ ਵਿੱਚ ਲੈੱਡ ਹੈ").
- **Turn off and choose.** "Turn off", "switch off" → **ਬੰਦ ਕਰੋ** (MS: "ਉੱਚ ਕੰਟਰਾਸਟ ਨੂੰ ਬੰਦ ਕਰੋ"); "turn on" → **ਚਾਲੂ
  ਕਰੋ** (MS: "Windows Update ਚਾਲੂ ਕਰੋ"); "choose", "select", "pick" → **ਚੁਣੋ** (MS 2.1.1, 3.2). ਬੰਦ cannot be read as
  "choose"; never ਕੱਢੋ (take out, also "pick") for turning a kiln off.

### Buttons, menus, headings, labels and tabs

- **Buttons and menu commands:** the -ਓ imperative, short: ਸੇਵ ਕਰੋ, ਪ੍ਰਿੰਟ ਕਰੋ, ਤੁਲਨਾ ਕਰੋ, ਮਿਟਾਓ, ਹਟਾਓ, ਸਮੱਗਰੀ ਜੋੜੋ.
  **Save is ਸੇਵ ਕਰੋ** (Choices). Print is ਪ੍ਰਿੰਟ ਕਰੋ (MS "ਪ੍ਰਿੰਟ"), Cancel ਰੱਦ ਕਰੋ, Delete ਮਿਟਾਓ (a whole record or the
  account), Remove ਹਟਾਓ (take out of a list or recipe), Help ਮਦਦ (MS 5.4.4).
- **Headings, tabs, page titles:** a noun phrase: "ਰੈਸਿਪੀਆਂ", "ਸੈਟਿੰਗਾਂ", "ਫਾਇਰਿੰਗ ਲੌਗ", "ਕੋਨ ਅਤੇ ਹੀਟਵਰਕ". A heading that
  names an activity takes the verbal noun in -ਣਾ: "Mixing the glaze" → "ਗਲੇਜ਼ ਰਲਾਉਣਾ", "Typing amounts" → "ਮਾਤਰਾ ਟਾਈਪ
  ਕਰਨਾ" (MS 4.1.20: "ਭੇਜੋ—ਭੇਜਣਾ"). A question stays one: "ਗਲੇਜ਼ ਕਿਉਂ ਵਗਦਾ ਹੈ?"
- **Field labels:** a noun; the colon where the English has one, no space before it (MS 4.1.15: "ਪੂਰਾ ਕੰਪਿਊਟਰ ਨਾਂ:"):
  "ਸਮੱਗਰੀ ਦਾ ਨਾਂ:".
- **Confirmations:** "Saved: {name}" → "ਸੇਵ ਕੀਤਾ: {name}" (the label form, so nothing agrees with {name}); "Removed" →
  "ਹਟਾਇਆ ਗਿਆ".
- **Progress:** the ਰਿਹਾ ਹੈ form and the ellipsis (MS 4.1.15: "ਅੱਪਡੇਟ ਡਾਉਨਲੋਡ ਹੋ ਰਹੇ ਹਨ..."): "Saving…" → "ਸੇਵ ਹੋ ਰਿਹਾ
  ਹੈ…".

### Capitalisation

Gurmukhi has no capitals; the English's Title Case and sentence case go with the English words. Latin words inside
Punjabi text keep the English's case where they are names, codes, units or formulas (Orton, SK, UMF, LOI, Ferro 3134,
N95, mg/m³, SiO₂). An English loanword is written in Gurmukhi (ਗਲੇਜ਼, ਫ਼ਰਿਟ, ਕਿਲਨ), never in Latin letters, unless it is a
trade name, a trademark (Kiln-Sitter, Zircopax), a company or brand (Google, Skutt), a code or a unit. A Latin name takes
its postposition after a space, as MS writes it ("Windows ਪਾਸਵਰਡ", "Azure ਵਿੱਚ", "Microsoft ਨੂੰ"): "Ferro 3134 ਵਿੱਚ",
"Orton ਦਾ ਚਾਰਟ"; no genitive is glued to a trademark (MS 4.1.9).

### Script and spelling

- **Gurmukhi as the Punjab standard writes it**, never Hindi spellings in Gurmukhi letters.
- **Tippi and bindi.** **Tippi** (ੰ) for a nasal after a short vowel or the inherent a, and with ੁ and ੂ: ਕੰਮ, ਰੰਗ, ਚੰਗਾ,
  ਮੁੰਡਾ, ਹੁੰਦਾ, ਚਾਹੁੰਦੇ, ਸੰਖਿਆ. **Bindi** (ਂ) after a long vowel: ਹਾਂ, ਨਹੀਂ, ਮੈਂ, ਭਾਂਡੇ, ਟਾਈਲਾਂ, ਸਮੱਗਰੀਆਂ, ਤੋਂ, ਗੋਂਦ. The plural
  and oblique endings take bindi (-ਾਂ, -ੀਆਂ, -ਿਆਂ).
- **Addak** (ੱ) before a doubled consonant, as Punjabi spells it: ਕੱਚ, ਮਿੱਟੀ, ਪੱਕਾ, ਸਮੱਗਰੀ, ਇੱਕ, ਵਿੱਚ, ਛੱਡੋ, ਕੁੱਲ, ਅੱਗ;
  in loanwords where potters double the sound: ਸਲਿੱਪ, ਲੈੱਡ, ਸੈੱਟਅੱਪ, ਮੈੱਸ਼. Never addak and tippi on one syllable.
- **Nukta letters.** ਸ਼ ਖ਼ ਗ਼ ਜ਼ ਫ਼ ਲ਼ are written as the letter and a nukta (U+0A3C), which is their NFC form (the precomposed
  U+0A33, U+0A36, U+0A59 to U+0A5B and U+0A5E decompose so under NFC; the i18n check asks for NFC). **ਜ਼** for the English z
  (ਗਲੇਜ਼, ਜ਼ਿੰਕ, ਜ਼ਿਰਕਾਨ, ਕੁਆਰਟਜ਼, ਬ੍ਰਾਂਜ਼) and the z of Persian loans (ਜ਼ਹਿਰ, ਲਾਜ਼ਮੀ, ਜ਼ਰੂਰੀ); **ਫ਼** for the English f (ਫ਼ਰਿਟ,
  ਫ਼ਲਕਸ, ਫ਼ਾਰਮੂਲਾ, ਫ਼ੈਕਟਰੀ, ਸਪੈਸਿਫ਼ਿਕ); **ਸ਼** for sh (ਸ਼ਿਵਰਿੰਗ, ਸ਼ੈਲਫ਼); **ਖ਼** and **ਗ਼** only in words the standard spells so
  (ਖ਼ਤਰਾ, ਖ਼ਾਰ). Words Punjabi writes without a nukta stay so: ਗਲਤ, ਗਲਤੀ (as MS writes ਗਲਤ), ਫਾਇਰਿੰਗ (pawiki, MS "ਫਾਈਲ").
  **Native check** on the nukta in ਫਾਇਰਿੰਗ and ਫਾਈਲ, which Punjabi software writes without one.
- **Subjoined letters** as the standard writes them: pairin ਰ (੍ਰ: ਪ੍ਰਿੰਟ, ਕ੍ਰੋਮ, ਕ੍ਰਿਸਟਲ, ਪ੍ਰਤੀਸ਼ਤ), pairin ਹ (੍ਹ: ਪੜ੍ਹੋ, ਗਾੜ੍ਹਾ,
  ਮਨ੍ਹਾ, ਤਰ੍ਹਾਂ), pairin ਵ (੍ਵ) only where the standard has it.
- **Joiners.** No ZWJ or ZWNJ anywhere; Gurmukhi needs neither (the i18n check rejects both), and only Gurmukhi and Latin
  letters (the script check).
- **Hyphens** in compounds as Punjabi writes them (MS 4.1.15: "ਈ-ਮੇਲ"): ਲੈੱਡ-ਰਹਿਤ, ਡ੍ਰਾਪ-ਐਂਡ-ਹੋਲਡ, ਲੈਦਰ-ਹਾਰਡ, ਘੱਟੋ-ਘੱਟ.
- **Latin text** inside Punjabi: units, formulas, trade names, codes and cone numbers exactly as the English writes them,
  with a space on each side where the English has one (10 g, 1222 °C, Orton ਕੋਨ 6, SiO₂ ਦਾ).
- **Digits** are 0 to 9 only (see Numbers and units).
- **The elided ਉੱਤੇ.** Punjabi often writes "on" as ’ਤੇ (MS "ਟੈਬ ‘ਤੇ"; pawiki "ਆਧਾਰਿਤ 'ਤੇ"). In this app write **ਉੱਤੇ** in
  full (pawiki: "ਮੁੱਖ ਤੌਰ ਉੱਤੇ"), never ’ਤੇ or 'ਤੇ: a straight ' before `{`, `}` or `#` is an ICU quote (README), and ‘ is
  kept for UI names.

### Punctuation

- **The full stop "."** ends a sentence, with no space before it and one after: "ਗਲੇਜ਼ ਵਗਦਾ ਹੈ." A heading, a button and
  a list item that is not a sentence end with nothing. **Never the danda "।"** and never a pipe "|" for one (the owner's
  choice, against MS 4.1.15 and Google; see the opening).
- **Comma, question mark, colon, semicolon** as in English, no space before them (MS 4.1.15). No "!" in the app's own
  voice.
- **Quotation marks:** “ ” for quotations and a quoted word (“ਬੋਰਾਨ ਬਲੂ”), ‘ ’ inside them (MS 4.1.15). **UI names in
  running text** in single curly quotes: "‘ਤੁਲਨਾ ਕਰੋ’ ਚੁਣੋ". Never the straight ' around a name: before `{`, `}` or `#` ICU
  reads it as a quote (README).
- **Parentheses** as English, no space inside them (MS 4.1.15).
- **Dashes:** the en dash for ranges with no spaces (10–60%, ਕੋਨ 06–04; MS 4.1.15: "ਪੰਨਾ ਸੰਖਿਆ 15–20"); the em dash
  sparingly: a comma, a colon or a new sentence instead where the English allows.
- **Ellipsis** "…" where the English has one.

### Numbers and units

- **The digits 0 to 9** wherever the English has digits (the international form of Indian numerals, and CLDR's default
  for `pa`), never Gurmukhi digits (੦ ੧ ੨ ੩), which the numbers check does not read. Never spelled-out figures where the
  English has digits.
- **The decimal point and the English's figures** as the English writes them: 1.5; 0.025; 12,500; 1222 °C and 1000 g
  ungrouped. The app groups numbers the Indian way (12,34,567.5) when it formats them; a translation writes only the
  English's figures, never ਲੱਖ or ਕਰੋੜ for one ("12,500" stays 12,500, never "ਸਾਢੇ ਬਾਰਾਂ ਹਜ਼ਾਰ").
- **Percent:** 5%, no space (CLDR "5%"); a range 10–60%. In running text ਪ੍ਰਤੀਸ਼ਤ only where the English spells "percent"
  out as a word with no sign.
- **Units:** the English's symbols in Latin letters, with the English's spacing: g, kg, mg, µg, mL, L, mm, cm, °C, °F,
  °Bé, %, mg/m³; never ਗ੍ਰਾ., ਕਿ. ਗ੍ਰਾ., ਸੈ.ਮੀ. or °ਸੈ. (MS 4.1.1 lists them; the numbers check does not read them), and no
  space removed where the English has one (MS 4.1.19 allows "5MB"; this app does not). Inches and feet are the words
  **ਇੰਚ** and **ਫੁੱਟ**, with the metric figure in brackets as the English gives it: "12 ਇੰਚ (30 cm)".
- **A number the English writes as a word** ("two coats", "three tiles", "once", "one number hotter") stays a word, since
  a digit would be a figure the English lacks: "ਦੋ ਪਰਤਾਂ", "ਤਿੰਨ ਟਾਈਲਾਂ", "ਇੱਕ ਵਾਰ", "ਇੱਕ ਨੰਬਰ ਵੱਧ ਗਰਮ". Where the English
  has the digit, the digit stays: "3 coats" → "3 ਪਰਤਾਂ".
- **Dates:** CLDR's long form with Latin digits: "14 ਅਕਤੂਬਰ 2026" (no comma), "ਅਕਤੂਬਰ 2026": the month named beside the
  year, the Gregorian calendar, never a Nanakshahi or Bikrami (Vikrami) year, never ਸੰਨ or ਈ. added. The month names are
  CLDR's: ਜਨਵਰੀ, ਫ਼ਰਵਰੀ, ਮਾਰਚ, ਅਪ੍ਰੈਲ, ਮਈ, ਜੂਨ, ਜੁਲਾਈ, ਅਗਸਤ, ਸਤੰਬਰ, ਅਕਤੂਬਰ, ਨਵੰਬਰ, ਦਸੰਬਰ.
- **Clock times:** the 24-hour clock, **20:00**, with ਵਜੇ after it if the sentence needs it ("20:00 ਵਜੇ ਤੱਕ"), although
  CLDR's default for `pa` is the 12-hour "8:00 PM". "8am to 8pm" → "8:00 ਤੋਂ 20:00"; "8 to 5" → "8:00 ਤੋਂ 17:00" where the
  English means hours of the day, else as the English writes it. Never ਸਵੇਰੇ, ਦੁਪਹਿਰੇ, ਸ਼ਾਮ or ਰਾਤ with a 12-hour figure
  ("ਰਾਤ 8 ਵਜੇ", MS's "ਦੁਪਹਿਰ 1:00–2:00 ਵਜੇ"), which the check would read as 8. "24 hours" → "24 ਘੰਟੇ"; "24/7" → "24/7"
  or "24 ਘੰਟੇ, ਹਫ਼ਤੇ ਦੇ 7 ਦਿਨ" (the 7 is a figure).
- **No figures the English lacks:** no Gurmukhi digits, no ਲੱਖ or ਕਰੋੜ, no Nanakshahi or Bikrami years, no SK or Orton
  equivalents, no converted units, no IS numbers (IS 9473, IS 9806) where the English names none.

### Plural forms

CLDR gives Punjabi two cardinal categories, `one` and `other` (Node: `[ 'one', 'other' ]`; the rule is n = 0..1). **`one`
covers 0 as well as 1** (like Hindi); 0.5, 1.5, 2 and 21 are `other`.

| Category | Numbers                 | Example                                                                       |
| -------- | ----------------------- | ----------------------------------------------------------------------------- |
| `one`    | 0, 1                    | 0 ਸਮੱਗਰੀ, 1 ਸਮੱਗਰੀ, 1 ਪਰਤ, 1 ਰੈਸਿਪੀ, 1 ਟਾਈਲ, 1 ਗਲੇਜ਼, 0 ਘੰਟੇ, 1 ਘੰਟਾ          |
| `other`  | 0.5, 1.5, 2, 3, 21, 100 | 2 ਸਮੱਗਰੀਆਂ, 3 ਪਰਤਾਂ, 21 ਰੈਸਿਪੀਆਂ, 2 ਟਾਈਲਾਂ, 5 ਗਲੇਜ਼, 3 ਫ਼ਰਿਟ, 2 ਕੋਨ, 1.5 ਘੰਟੇ |

Every plural message has both forms, and `=0 {…}` stays where the English has it:
`{count, plural, one {# material} other {# materials}}` → `{count, plural, one {# ਸਮੱਗਰੀ} other {# ਸਮੱਗਰੀਆਂ}}`. **The
`one` form must read right for 0 as well as 1**, so it keeps `#` and never says ਇੱਕ for the number: "0 ਸਮੱਗਰੀ", "0 ਟਾਈਲ"
are accepted Punjabi for a count (Native check); a masculine noun in -ਾ, whose singular "0 ਘੰਟਾ" reads wrong, takes its
plural in `one` as well, with an `=1` form for exactly one: `=1 {# ਘੰਟਾ} one {# ਘੰਟੇ} other {# ਘੰਟੇ}`
(`#`, never a written 1, which would be a figure the English lacks). **Where the English's
`one` has no `#`** ("this passkey", "it"), give an `=1 {…}` form for exactly one, as the English says it, and a `one`
form with `#` for 0: `{count, plural, =1 {ਇਹ ਪਾਸਕੀ} one {# ਪਾਸਕੀਆਂ} other {# ਪਾਸਕੀਆਂ}}` (the check asks for it).

How the noun takes the number, in the direct case and the oblique (before ਵਿੱਚ, ਨੂੰ, ਤੋਂ, ਦਾ/ਦੀ/ਦੇ, ਉੱਤੇ, ਨਾਲ):

| Noun (gender)        | One (direct)        | Other (direct)    | Other (oblique)                 |
| -------------------- | ------------------- | ----------------- | ------------------------------- |
| ਸਮੱਗਰੀ (f.)          | # ਸਮੱਗਰੀ            | # ਸਮੱਗਰੀਆਂ        | # ਸਮੱਗਰੀਆਂ ਵਿੱਚ                 |
| ਪਰਤ (f.)             | # ਪਰਤ               | # ਪਰਤਾਂ           | # ਪਰਤਾਂ ਵਿੱਚ                    |
| ਰੈਸਿਪੀ (f.)          | # ਰੈਸਿਪੀ            | # ਰੈਸਿਪੀਆਂ        | # ਰੈਸਿਪੀਆਂ ਵਿੱਚ                 |
| ਟਾਈਲ (f.)            | # ਟਾਈਲ              | # ਟਾਈਲਾਂ          | # ਟਾਈਲਾਂ ਉੱਤੇ                   |
| ਗਲੇਜ਼ (m.)           | # ਗਲੇਜ਼             | # ਗਲੇਜ਼           | # ਗਲੇਜ਼ਾਂ ਵਿੱਚ                  |
| ਫ਼ਰਿਟ (m.)           | # ਫ਼ਰਿਟ             | # ਫ਼ਰਿਟ           | # ਫ਼ਰਿਟਾਂ ਵਿੱਚ                  |
| ਕੋਨ (m.)             | # ਕੋਨ               | # ਕੋਨ             | # ਕੋਨਾਂ ਵਿੱਚੋਂ                  |
| ਫਾਇਰਿੰਗ (f.)         | # ਫਾਇਰਿੰਗ           | # ਫਾਇਰਿੰਗਾਂ       | # ਫਾਇਰਿੰਗਾਂ ਵਿੱਚ                |
| ਘੰਟਾ (m.)            | =1 # ਘੰਟਾ; # ਘੰਟੇ   | # ਘੰਟੇ            | # ਘੰਟਿਆਂ ਵਿੱਚ                   |
| ਮਿੰਟ, ਦਿਨ (m.)       | # ਮਿੰਟ, # ਦਿਨ       | # ਮਿੰਟ, # ਦਿਨ     | # ਮਿੰਟਾਂ ਵਿੱਚ, # ਦਿਨਾਂ ਵਿੱਚ     |
| ਅੱਖਰ (m.)            | # ਅੱਖਰ              | # ਅੱਖਰ            | # ਅੱਖਰਾਂ ਦਾ                     |
| ਕੋਡ, ਡੀਵਾਈਸ (m., f.) | # ਕੋਡ, # ਡੀਵਾਈਸ     | # ਕੋਡ, # ਡੀਵਾਈਸਾਂ | # ਕੋਡਾਂ ਵਿੱਚੋਂ, # ਡੀਵਾਈਸਾਂ ਉੱਤੇ |
| ਪਾਸਕੀ (f.)           | # ਪਾਸਕੀ             | # ਪਾਸਕੀਆਂ         | # ਪਾਸਕੀਆਂ ਵਿੱਚ                  |
| ਭਾਂਡਾ (m.)           | =1 # ਭਾਂਡਾ; # ਭਾਂਡੇ | # ਭਾਂਡੇ           | # ਭਾਂਡਿਆਂ ਉੱਤੇ                  |

A masculine noun ending in a consonant (ਗਲੇਜ਼, ਫ਼ਰਿਟ, ਕੋਨ, ਆਕਸਾਈਡ, ਮਿੰਟ) is unchanged in the direct plural and takes -ਾਂ in the
oblique; a masculine noun in -ਾ takes -ੇ (ਭਾਂਡਾ → ਭਾਂਡੇ, ਘੰਟਾ → ਘੰਟੇ) and -ਿਆਂ in the oblique; a feminine noun takes -ਾਂ
(ਟਾਈਲਾਂ, ਪਰਤਾਂ) or -ਆਂ after ੀ (ਸਮੱਗਰੀਆਂ, ਰੈਸਿਪੀਆਂ) in both cases (MS 4.1.12: "ਕਲਾਇੰਟਾਂ", "ਵੈੱਬਸਾਈਟਾਂ", "ਕੁਰਸੀਆਂ"). The
craft loanwords that are masculine stay unchanged in the direct plural (5 ਗਲੇਜ਼, 3 ਫ਼ਰਿਟ). A verb or participle agrees with
the noun in each form: `one {# ਸਮੱਗਰੀ ਜੋੜੀ ਗਈ} other {# ਸਮੱਗਰੀਆਂ ਜੋੜੀਆਂ ਗਈਆਂ}`, `one {# ਕੋਨ ਜੋੜਿਆ ਗਿਆ} other {# ਕੋਨ ਜੋੜੇ
ਗਏ}`. A weight or temperature takes no noun: `{n} g`.

### Placeholders and names

Punjabi writes its postpositions apart from the word (ਵਿੱਚ, ਨੂੰ, ਤੋਂ, ਨਾਲ, ਲਈ, ਉੱਤੇ; MS 4.1.13), and a word before them goes
into its oblique form (ਭਾਂਡਾ → ਭਾਂਡੇ ਵਿੱਚ, ਕੈਨੇਡਾ → ਕੈਨੇਡਾ ਵਿੱਚ, since names are rarely inflected). The possessive **ਦਾ/ਦੀ/ਦੇ/
ਦੀਆਂ agrees with the noun that follows it** (MS 4.1.9), not with the word before it. A placeholder or a Latin name cannot
change, so:

- **Postpositions after a placeholder are written apart, with a space**, as MS writes them after a Latin name ("Azure
  ਵਿੱਚ", "Microsoft ਨੂੰ"): "{region} ਵਿੱਚ", "{name} ਤੋਂ", "{library} ਵਿੱਚੋਂ", "{count} ਸਮੱਗਰੀਆਂ ਵਿੱਚ". This reads with any
  value, since a name before a postposition need not change.
- **ਦਾ/ਦੀ/ਦੇ after a placeholder agrees with the following noun**: "{region} ਦੇ ਨਿਯਮ" (m. pl.), "{region} ਦੀ ਸੀਮਾ" (f.),
  "{name} ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ" (m.). Nothing in the sentence agrees with the placeholder itself.
- **A verb agrees with its subject's gender**, so a placeholder must not be the subject of a gendered verb: put a generic
  noun beside it and let the noun take the verb: "{name} was saved" → "{name} ਰੈਸਿਪੀ ਸੇਵ ਹੋ ਗਈ" (ਰੈਸਿਪੀ, f.), or "{name}
  ਨਾਂ ਦੀ ਰੈਸਿਪੀ …"; "{name} is no longer made" → "{name} ਸਮੱਗਰੀ ਹੁਣ ਨਹੀਂ ਬਣਦੀ". Present-tense ਹੈ and ਹਨ carry no gender
  (MS 5.4.2: "%s ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ"), so "{name} ਉਪਲਬਧ ਨਹੀਂ ਹੈ" needs no noun.
- **A count:** `{count}` before its noun, the noun in the plural category's form (Plural forms).

`{region}` is a country's or region's name in Punjabi from the browser (ਭਾਰਤ, ਸੰਯੁਕਤ ਰਾਜ (ਅਮਰੀਕਾ), ਯੂਨਾਈਟਡ ਕਿੰਗਡਮ, ਜਰਮਨੀ,
ਜਪਾਨ; Hong Kong is "ਹਾਂਗ ਕਾਂਗ ਐਸਏਆਰ ਚੀਨ", a region). Never call it ਦੇਸ਼: the generic noun is **ਖੇਤਰ** (region; MS
"ਤੁਹਾਡੇ ਖੇਤਰ ਵਿੱਚ"): "in {region}" → "{region} ਵਿੱਚ" or "{region} ਖੇਤਰ ਵਿੱਚ" where the sentence needs a noun. A trade name in
Latin letters is the same: "Ferro 3134 ਫ਼ਰਿਟ", "Ferro 3134 ਵਿੱਚ".

### Cones

Orton cones are written **Orton** in Latin letters wherever the English says Orton, beside **ਕੋਨ** (m., the potters'
loanword: Bhoomi and Clay Station sell "Orton Cones"; the Punjabi ਸ਼ੰਕੂ in brackets at the first use in each guide section:
"ਕੋਨ (ਸ਼ੰਕੂ)"): "Orton ਕੋਨ 6", "ਕੋਨ 06", "Orton ਦੇ ਕੋਨ". **ਕੋਨ is not ਕੋਣ** (an angle) or **ਕੋਨਾ** (a corner): write ਕੋਨ
with the dental ਨ, and never use it for an angle; a cone's bend position is "ਝੁਕਣ ਦੀ ਸਥਿਤੀ". Native check. **SK cones** are
SK with the number as printed (SK 6a) where the English has them. **Seger** is **ਸੇਗਰ** only where the English says Seger:
the firing guide's older European cones (ਸੇਗਰ ਕੋਨ) and the **ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ** (UMF), which never names a cone. Never give an
SK number for an Orton number or the reverse, nor say they are equal, nor add a cone to "mid fire" or "high fire" where
the English has none.

- **One number hotter, one number cooler:** "**ਇੱਕ ਨੰਬਰ ਵੱਧ ਗਰਮ**" and "**ਇੱਕ ਨੰਬਰ ਵੱਧ ਠੰਢਾ**" (the guard cone is "ਇੱਕ
  ਨੰਬਰ ਵੱਧ ਗਰਮ ਕੋਨ"); never ਉੱਚਾ, ਨੀਵਾਂ, ਉੱਪਰਲਾ, ਹੇਠਲਾ, ਵੱਡਾ, ਛੋਟਾ or ਨੰਬਰ ਘੱਟ/ਵੱਧ: cone 05 is cooler than 04 ("ਕੋਨ 05, ਕੋਨ
  04 ਨਾਲੋਂ ਇੱਕ ਨੰਬਰ ਵੱਧ ਠੰਢਾ ਹੈ"). Where the English says a cone "two numbers lower" or "next higher", write ਵੱਧ ਠੰਢਾ or ਵੱਧ
  ਗਰਮ ("ਦੋ ਜਾਂ ਤਿੰਨ ਨੰਬਰ ਵੱਧ ਠੰਢਾ SK ਕੋਨ"), so it cannot read the other way round. The upper cone of a range is "ਵੱਧ ਗਰਮ
  ਕੋਨ". "Below cone 03" is "ਕੋਨ 03 ਨਾਲੋਂ ਠੰਢੀ ਫਾਇਰਿੰਗ ਲਈ". ਉੱਪਰਲੇ/ਹੇਠਲੇ stays only for a place in the kiln (Cones Top, Cones
  Bottom).
- **cone 06** is written 06 with its zero, never 6.

### The unity formula

**ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ (UMF)**: so at its first use in each guide section and in the setting, "ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ" afterwards; ਫ਼ਾਰਮੂਲਾ
is pawiki's word for a chemical formula ("ਰਸਾਇਣਕ ਫ਼ਾਰਮੂਲਾ SiO2"), m. The app's short "Unity formula" is "ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ",
the label "Unity:" is "ਸੇਗਰ:". "unity" as the scaling is **ਯੂਨਿਟੀ**, explained once as "ਫ਼ਲਕਸਾਂ ਦਾ ਜੋੜ ਇੱਕ ਮੰਨ ਕੇ" (ਇੱਕ as a
word). The three columns: ਗਲਾਸ ਫ਼ਾਰਮਰ (RO₂), ਸਟੈਬਿਲਾਈਜ਼ਰ (R₂O₃), ਫ਼ਲਕਸ (R₂O ਅਤੇ RO). A glaze recipe is **ਰੈਸਿਪੀ**: never
ਫ਼ਾਰਮੂਲਾ or ਨੁਸਖ਼ਾ for a recipe. Molecular words use **ਅਣੂ** (molecule; pawiki "ਅਣੂ (ਅੰਗਰੇਜ਼ੀ: molecule)"), never ਪਰਮਾਣੂ,
which is the atom (pawiki "ਪਰਮਾਣੂ (… atom)"). No Punjabi name for the UMF was found (No source; Native check).

### Gender-neutral wording

Punjabi verbs show gender in the past, the future and the participles, so the text never guesses the reader's:

- **Imperatives** (-ਓ) carry no gender: "ਛਾਣੋ", "ਪਹਿਨੋ".
- **ਤੁਸੀਂ takes the plural**, which Punjabi software uses for any reader (MS 3.1: "ਤੁਸੀਂ ਨਹੀਂ ਗਏ", not "ਤੂੰ ਨਹੀਂ ਗਈ"): "ਤੁਸੀਂ
  ਕਰਦੇ ਹੋ", "ਤੁਸੀਂ ਬਦਲ ਸਕਦੇ ਹੋ". Prefer forms with no gender at all where they read naturally: the imperative, "ਤੁਸੀਂ … ਹੋ" in
  the present, the passive.
- **The transitive past agrees with the object**, not with ਤੁਸੀਂ: "ਤੁਸੀਂ ਰੈਸਿਪੀ ਸੇਵ ਕੀਤੀ" (ਰੈਸਿਪੀ, f.); "ਤੁਸੀਂ ਕਲਿੱਕ ਕੀਤਾ"
  (MS).
- **Impersonal and passive forms** (MS 4.1.20, 5.4.2): "ਰੈਸਿਪੀ ਸੇਵ ਕੀਤੀ ਗਈ", "ਇਹ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ", "ਮਾਸਕ ਪਹਿਨਣਾ
  ਚਾਹੀਦਾ ਹੈ".
- People in general are plural or named by role (MS 3.1): "ਪੌਟਰ", "ਵਰਤੋਂਕਾਰ", "ਲੋਕ", "ਵਿਅਕਤੀ"; a generic single person
  takes the plural ਉਹ, never ਉਸਦਾ/ਉਸਦੀ (MS 3.1). **ਘੁਮਿਆਰ** is the traditional potter, a caste name and also a millipede
  (pawiki; Google suggest: "ਘੁਮਿਆਰ ਜਾਤ", "ਘੁਮਿਆਰ ਕੀੜਾ"): the guides say **ਪੌਟਰ** (pawiki "ਅੰਗਰੇਜ਼ੀ ਸ਼ਬਦ ਪੌਟਰ") or "ਮਿੱਟੀ ਦਾ
  ਕੰਮ ਕਰਨ ਵਾਲੇ" where the English means studio potters in general (Native check).

### The reader in the guides

ਤੁਸੀਂ where the sentence needs a subject; steps are -ਓ imperatives; explanations are impersonal ("ਜੇ ਗਲੇਜ਼ ਬਹੁਤ ਮੋਟਾ ਹੋਵੇ
ਤਾਂ ਵਗਦਾ ਹੈ"). Short plain sentences, one Punjabi sentence for one English sentence where Punjabi allows. Quotations are
translated into “…” and keep their figures as the English writes them, with the original name kept where the English
names it. **The bracketed Punjabi term** (the rows below that give one) goes right after the loanword **at its first use
in each guide section**, before the `{{en: …}}` mark where the term has one: "ਫ਼ਲਕਸ (ਪਿਘਲਾਉਣ ਵਾਲਾ){{en: flux}}". Never in a
button, a label, a table heading or a message of the JSON files; in the glossary of glazing-basics (the definition list),
each term line may give it once.

The rule as the guides follow it (from the Marathi and Hindi reviews):

- **A section is a `##` heading** with everything under it down to the next `##`; a `###` subsection does not start a new
  count.
- **The first standalone use** in running text takes the bracket: ਕਿਲਨ (ਭੱਠੀ), ਕੋਨ (ਸ਼ੰਕੂ), ਲੈੱਡ (ਸਿੱਕਾ), and the rows below
  that give a bracket. An inflected word takes the bracket before its postposition: "ਕਿਲਨ (ਭੱਠੀ) ਵਿੱਚ", "ਕਿਲਨ (ਭੱਠੀ) ਦਾ".
- **Not counted:** a fixed compound name (ਕਿਲਨ ਸਿਟਰ, ਕਿਲਨ ਵਾਸ਼, ਕਿਲਨ ਸ਼ੈਲਫ਼, ਕੋਨ ਪੈਕ, ਕੋਨ ਆਫ਼ਸੈੱਟ, ਵਿਟਨੈੱਸ ਕੋਨ, ਗਾਈਡ ਕੋਨ),
  a table cell, a link's text, a bold list label ("**ਕਿਲਨ:**") and a quotation, where the bracket goes on the next use.
- **`{{en: …}}`** follows the bracket where the term is marked "show English", at its first use in each section, as above.

### The app's feature names

Written exactly as on the button or tab, checked against the language's own recipe, library, account and main JSON files
once they exist (the translators read `client/public/i18n/<scope>/pa.json` before quoting a name in a guide); in running
text in single curly quotes, ‘…’, unless the English wraps the name in `<b>`, `**…**` or another tag: then the tag,
without quotes. A name takes no ending, so attach a generic noun: "‘ਤੁਲਨਾ ਕਰੋ’ ਚੁਣੋ", "‘ਮੇਰੀਆਂ ਸਮੱਗਰੀਆਂ’ ਟੈਬ ਵਿੱਚ", "‘ਲੈੱਡ
ਬਦਲੋ’ ਸਹੂਲਤ". "Settings" in running text is "ਸੈਟਿੰਗਾਂ" (MS "PC ਸੈਟਿੰਗਾਂ"); inside `<settings>…</settings>` write the word the
sentence needs ("<settings>ਸੈਟਿੰਗਾਂ</settings> ਵਿੱਚ").

| English                       | Punjabi (button, label)         | In running text                         |
| ----------------------------- | ------------------------------- | --------------------------------------- |
| Compare                       | ਤੁਲਨਾ ਕਰੋ                       | ਤੁਲਨਾ; ‘ਤੁਲਨਾ ਕਰੋ’ ਸਹੂਲਤ                |
| Suggest amounts (and compare) | ਮਾਤਰਾ ਸੁਝਾਓ (ਅਤੇ ਤੁਲਨਾ ਕਰੋ)     | ‘ਮਾਤਰਾ ਸੁਝਾਓ’ ਸਹੂਲਤ                     |
| Match with what I have        | ਮੇਰੇ ਕੋਲ ਮੌਜੂਦ ਸਮੱਗਰੀ ਨਾਲ ਮਿਲਾਓ | ‘ਮੇਰੇ ਕੋਲ ਮੌਜੂਦ ਸਮੱਗਰੀ ਨਾਲ ਮਿਲਾਓ’ ਸਹੂਲਤ |
| Replace lead                  | ਲੈੱਡ ਬਦਲੋ                       | ‘ਲੈੱਡ ਬਦਲੋ’ ਸਹੂਲਤ                       |
| Settings                      | ਸੈਟਿੰਗਾਂ                        | ਸੈਟਿੰਗਾਂ                                |
| Notebook                      | ਨੋਟਬੁੱਕ                         | ਸਟੂਡੀਓ ਨੋਟਬੁੱਕ                          |
| Library                       | ਲਾਇਬ੍ਰੇਰੀ                       | ਸਮੱਗਰੀਆਂ ਦੀ ਲਾਇਬ੍ਰੇਰੀ                   |
| Standard                      | ਮਿਆਰੀ                           | ਮਿਆਰੀ ਸਮੱਗਰੀਆਂ                          |
| My materials                  | ਮੇਰੀਆਂ ਸਮੱਗਰੀਆਂ                 | ‘ਮੇਰੀਆਂ ਸਮੱਗਰੀਆਂ’ ਟੈਬ                   |
| Trial                         | ਟ੍ਰਾਇਲ                          | ਟ੍ਰਾਇਲ                                  |

### Law in India

No Punjabi text of the Acts or standards could be read (Not reached), so the words below are plain Punjabi chosen to keep
the English's limits exact; **Native check, and confirm against the Punjabi texts when a reviewer can reach them**. The
region data cites the English titles; a Punjabi title is given once beside them.

- **Limits:** "at most", "no more than", "up to" (a limit) → **ਵੱਧ ਤੋਂ ਵੱਧ** or **…ਤੋਂ ਵੱਧ ਨਹੀਂ** (the limit itself passes):
  "up to 25% nepheline syenite" in a hazard line → "ਵੱਧ ਤੋਂ ਵੱਧ 25%". **…ਤੱਕ** only where "up to" is no limit: a usage
  range ("60% ਤੱਕ ਵਰਤਦੇ ਹਨ"), a temperature reached ("ਕੋਨ 6 ਤੱਕ ਪਕਾਓ"), a date. "less than", "under", "below" → **…ਤੋਂ
  ਘੱਟ** (it does not reach); "at least", "or more" → **ਘੱਟੋ-ਘੱਟ** (pawiki: "ਘੱਟੋ-ਘੱਟ 10%") or **…ਜਾਂ ਵੱਧ**; "more than",
  "over", "above" → **…ਤੋਂ ਵੱਧ**. "or less" ("25 mm deep or less", "3% or less") and an "up to" that caps an amount, a rate
  or a temperature ("up to 3%", "up to 500 °F/h", "open at up to 250 °F") are at-most limits too: **ਵੱਧ ਤੋਂ ਵੱਧ** or
  **…ਤੋਂ ਵੱਧ ਨਹੀਂ**, never "…ਜਾਂ ਉਸ ਤੋਂ ਘੱਟ" or a bare ਤੱਕ. Never ਤੋਂ ਘੱਟ for "at most", never ਤੋਂ ਵੱਧ for "at least": a
  slip moves a legal limit. Check every one in the food-contact, silica and mask texts, the records' amounts and the
  guides.
- **The Code:** the Occupational Safety, Health and Working Conditions Code, 2020 → **ਕਿੱਤਾਮੁਖੀ ਸੁਰੱਖਿਆ, ਸਿਹਤ ਅਤੇ ਕੰਮਕਾਜੀ
  ਹਾਲਤਾਂ ਕੋਡ, 2020** (No source: no official Punjabi title found; keep the English beside it once). Section 88 leaves the
  limits to the states: "each state sets its own limit" → "ਹਰ ਰਾਜ ਆਪਣੀ ਸੀਮਾ ਆਪ ਤੈਅ ਕਰਦਾ ਹੈ"; "We could not confirm a
  national limit" → "ਅਸੀਂ ਕਿਸੇ ਰਾਸ਼ਟਰੀ ਸੀਮਾ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਕਰ ਸਕੇ". An exposure limit → **ਸੰਪਰਕ ਸੀਮਾ** (exposure = ਸੰਪਰਕ, as the
  English means breathing it in at work). The Factories Act, 1948 → **ਫ਼ੈਕਟਰੀਆਂ ਐਕਟ, 1948** (No source; the Punjabi
  government's English-derived usage, ਕਾਰਖ਼ਾਨਾ ਐਕਟ also seen in Hindi-influenced texts: Native check). Silicosis →
  **ਸਿਲੀਕੋਸਿਸ** (Google suggest: "ਸਿਲੀਕੋਸਿਸ ਕੀ ਹੈ").
- **Masks:** IS 9473:2002 (filtering half masks against particles, classes FFP1, FFP2, FFP3), from the **ਭਾਰਤੀ ਮਿਆਰ
  ਬਿਊਰੋ (BIS)**; its Punjabi title was not read: describe it as "ਕਣਾਂ ਤੋਂ ਬਚਾਉਣ ਵਾਲੇ ਫ਼ਿਲਟਰ ਵਾਲੇ ਹਾਫ਼ ਮਾਸਕ" and keep the
  number and the classes as the English gives them.
- **Food contact:** India has no mandatory rule for ceramic ware (IS 9806:2001 is voluntary; none is shown). The English's
  food-contact categories are written plainly (2.9).
- **GHS:** no Punjabi GHS label text was read. Signal words: "Danger" → **ਖ਼ਤਰਾ**, "Warning" → **ਚੇਤਾਵਨੀ**; "Not
  classified" → **ਵਰਗੀਕ੍ਰਿਤ ਨਹੀਂ** (never ਹਾਨੀ-ਰਹਿਤ, harmless). H-codes kept. Native check.
- **Who to call:** **112** ("ਐਮਰਜੈਂਸੀ ਨੰਬਰ 112": police, fire and ambulance, ERSS); the **National Poisons Information
  Centre (NPIC), AIIMS New Delhi**, **1800 116 117**, 24 ਘੰਟੇ, ਟੋਲ-ਫ਼ਰੀ (the name as AIIMS publishes it, in English; a
  Punjabi description once: "ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ"). Bodies: **ਸਿਹਤ ਅਤੇ ਪਰਿਵਾਰ ਭਲਾਈ ਮੰਤਰਾਲਾ** (Ministry of Health and
  Family Welfare), **ਕਿਰਤ ਅਤੇ ਰੁਜ਼ਗਾਰ ਮੰਤਰਾਲਾ** (Ministry of Labour and Employment), **DGOSH** (its Punjabi name was not
  found; keep DGOSH with the English name). No source for the Punjabi ministry names; Native check.
- **EU law**, where the English names it (Directive 84/500/EEC, Directive (EU) 2017/2398, CLP): there is no official
  Punjabi text; write **ਯੂਰਪੀ ਸੰਘ (EU) ਦਾ ਨਿਰਦੇਸ਼ 84/500/EEC**, **CLP ਨਿਯਮ (EC) No 1272/2008**, with the number kept, so that
  the English's scope (the 3 L that applies only to packaging and storage vessels) stays as it is. US and UK bodies keep
  their English names with a Punjabi gloss once: OSHA (ਅਮਰੀਕਾ ਦੀ ਕਿੱਤਾਮੁਖੀ ਸੁਰੱਖਿਆ ਸੰਸਥਾ), HSE (ਬ੍ਰਿਟੇਨ ਦੀ ਸਿਹਤ ਅਤੇ ਸੁਰੱਖਿਆ
  ਸੰਸਥਾ): "the UK's HSE" → "ਬ੍ਰਿਟੇਨ ਦੀ HSE".

### Agencies, organisations and companies

- **Agencies and organisations are feminine**, as ਸੰਸਥਾ is, with or without the gloss: "HSE ਕਹਿੰਦੀ ਹੈ", "FDA ਚੇਤਾਵਨੀ
  ਦਿੰਦੀ ਹੈ", "IARC ਅਨੁਸਾਰ". NHS (ਬ੍ਰਿਟੇਨ ਦੀ ਸਰਕਾਰੀ ਸਿਹਤ ਸੇਵਾ), CDC (ਅਮਰੀਕਾ ਦੀ ਰੋਗ ਨਿਯੰਤਰਣ ਸੰਸਥਾ), FDA (ਅਮਰੀਕਾ ਦੀ ਖ਼ੁਰਾਕ ਅਤੇ
  ਦਵਾਈ ਸੰਸਥਾ), EPA (ਅਮਰੀਕਾ ਦੀ ਵਾਤਾਵਰਣ ਸੁਰੱਖਿਆ ਸੰਸਥਾ), IARC (ਵਿਸ਼ਵ ਸਿਹਤ ਸੰਗਠਨ ਦੀ ਕੈਂਸਰ ਖੋਜ ਸੰਸਥਾ), ECHA (ਯੂਰਪੀ ਰਸਾਇਣ
  ਸੰਸਥਾ).
- **Companies, makers, suppliers and websites are feminine too**, as ਕੰਪਨੀ is: "Orton ਕਹਿੰਦੀ ਹੈ", "Dawson ਸੁਝਾਉਂਦੀ ਹੈ",
  "Digitalfire ਦੱਸਦੀ ਹੈ". One rule for every name keeps the verbs consistent across files (the Hindi reviews found makers
  masculine in one guide and feminine in another). A data sheet (ਸ਼ੀਟ, SDS) is feminine. Several names together take the
  plural ("Potclays ਅਤੇ Bath Potters ਵੇਚਦੀਆਂ ਹਨ"); a person takes the plural of respect ("Derek Au … ਕਰਦੇ ਹਨ"). Native
  check.

### Pitfalls

- **Hindi look-alikes** (never copy from hi.md): lead is **ਲੈੱਡ (ਸਿੱਕਾ)**, never सीसा or ਸ਼ੀਸ਼ਾ (glass, a mirror); a sieve is
  **ਛਾਨਣੀ** (Hindi छलनी); "should" is **ਚਾਹੀਦਾ**, "must" **ਲਾਜ਼ਮੀ**; "and" is **ਅਤੇ** (CLDR's list), never और; "in" is
  **ਵਿੱਚ**, never में; percent **ਪ੍ਰਤੀਸ਼ਤ** (pawiki "30 ਪ੍ਰਤੀਸ਼ਤ"); "more", "less" **ਵੱਧ**, **ਘੱਟ** (not अधिक, कम); the
  possessive **ਦਾ/ਦੀ/ਦੇ** (not का/की/के). Zinc is **ਜ਼ਿੰਕ**: pawiki's **ਜਿਸਤ** is also "even" (Google suggest: "ਜਿਸਤ ਸੰਖਿਆ"),
  so it is not used.
- **ਗਲੇਜ਼, ਮੀਨਾਕਾਰੀ, ਵਾਰਨਿਸ਼, ਪੇਂਟ:** a glaze is **ਗਲੇਜ਼** (the material and the coat; pawiki "ਬਰਤਨ ਦੇ ਗਲੇਜ਼"); to glaze
  **ਗਲੇਜ਼ ਲਾਉਣਾ**. **ਮੀਨਾਕਾਰੀ** (enamelling on metal and inlay; pawiki), **ਈਨੈਮਲ ਪੇਂਟ**, **ਵਾਰਨਿਸ਼** (varnish) and **ਰੰਗ/
  ਪੇਂਟ** (paint) are not glazes. pawiki's **ਚਮਕਦਾਰ** ("ਚਮਕਦਾਰ ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ", glazed ware) is shine, the gloss of a surface:
  not used for glaze.
- **ਫ਼ਰਿਟ and ਫ਼ਲਕਸ:** a frit is **ਫ਼ਰਿਟ** (a factory glass; written with the nukta and no addak, since Google suggest
  completes ਫਰਿੱਟ to ਫਰਿੱਜ, a fridge); a flux is **ਫ਼ਲਕਸ (ਪਿਘਲਾਉਣ ਵਾਲਾ)** (the oxide's role). Not soldering flux (pawiki's
  machine-made "ਸੋਲਡਰਿੰਗ ਪ੍ਰਵਾਹ"), not magnetic flux.
- **ਕਿਲਨ, ਭੱਠੀ, ਭੱਠਾ, ਆਵੀ, ਓਵਨ, ਤੰਦੂਰ:** a potter's kiln is **ਕਿਲਨ** (ਭੱਠੀ at the first use per section); ਭੱਠੀ alone is also a
  grain roaster, a tandoor, a blast furnace and a nuclear reactor (pawiki); a **ਭੱਠਾ** is a brick kiln; **ਆਵੀ** the village
  potter's open kiln (Choices); **ਓਵਨ** a kitchen oven, used only where the English says oven; **ਤੰਦੂਰ** never.
- **ਬਿਸਕ and ਕੱਚਾ:** **ਕੱਚਾ** is unfired (ਕੱਚੇ ਭਾਂਡੇ, greenware; ਕੱਚੀ ਮਿੱਟੀ); **ਬਿਸਕ** is the first firing and its ware (ਬਿਸਕ
  ਫਾਇਰਿੰਗ, ਬਿਸਕ ਕੀਤੇ ਭਾਂਡੇ). Never ਕੱਚਾ for bisque, never ਬਿਸਕ for unfired ware. **ਬਿਸਕ is not ਬਿਸਕੁਟ** (Google suggest
  completes ਬਿਸਕ to biscuits): say "ਬਿਸਕ ਫਾਇਰਿੰਗ" or "ਬਿਸਕ ਕੀਤੇ" at least once per section. **ਕੱਚਾ ਮਾਲ** is raw materials in
  a shop's sense. **ਕੱਚਾ is not ਕੱਚ** (glass): ਕੱਚ ਵਰਗਾ is glassy.
- **ਅਰਥਨਵੇਅਰ, ਟੈਰਾਕੋਟਾ, ਸਟੋਨਵੇਅਰ, ਪੋਰਸਲੀਨ, ਚੀਨੀ ਮਿੱਟੀ:** earthenware is **ਅਰਥਨਵੇਅਰ**; pawiki's ਪੌਟਰੀ article names the three
  classes "ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ, ਪੱਥਰ ਦੇ ਭਾਂਡੇ, ਪੋਰਸਲੀਨ ਦੇ ਭਾਂਡੇ", but **ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ** is also pottery in general (Google suggest
  "ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ in english"), so it is used for pottery, not for earthenware; **ਟੈਰਾਕੋਟਾ** (pawiki; Bhoomi "Terracotta")
  is the red, usually unglazed low-fired ware, used only where the English says terracotta; stoneware is **ਸਟੋਨਵੇਅਰ**
  (ਪੱਥਰ ਦੇ ਭਾਂਡੇ in the bracket once); porcelain is **ਪੋਰਸਲੀਨ** (pawiki). **ਚੀਨੀ ਮਿੱਟੀ** is crockery (Google suggest) and
  porcelain: never used for kaolin or for porcelain; kaolin is **ਕਾਓਲਿਨ (ਚਾਈਨਾ ਕਲੇ)**. **ਚੀਨੀ** alone is also sugar.
- **ਸਿਲਿਕਾ, ਸਿਲੀਕਾਨ, ਸਿਲੀਕੋਨ ਰਬੜ, ਰੇਤ:** silica is **ਸਿਲਿਕਾ** (SiO₂; pawiki "ਸਿਲਿਕਾ (ਸਿਲਿਕਨ ਡਾਈਆਕਸਾਈਡ, ਜਾਂ ਕੁਆਰਟਜ਼)";
  Google suggest knows ਸਿਲਿਕਾ, not ਸਿਲੀਕਾ); the element is **ਸਿਲੀਕਾਨ** (pawiki); silicone rubber **ਸਿਲੀਕੋਨ ਰਬੜ** (always
  with ਰਬੜ). **ਸਿਲਿਕਾ ਜੈੱਲ** is the drying sachet. Sand is **ਰੇਤ** (pawiki "ਰੇਤ ਦੇ ਮੁੱਖ ਤੱਤ ਸਿਲਿਕਾ").
- **ਵਾਈਟਿੰਗ, ਚੂਨਾ, ਚਾਕ, ਚੂਨਾ ਪੱਥਰ:** whiting is **ਵਾਈਟਿੰਗ** (calcium carbonate, CaCO₃; Clay Station's "CS Whiting"); **ਚੂਨਾ**
  is lime (CaO and slaked lime; pawiki "ਕੈਲਸੀਅਮ ਆਕਸਾਈਡ ਜਾਂ ਕੈਲਸੀਅਮ ਹਾਈਡ੍ਰੋਕਸਾਈਡ ਹੀ ਚੂਨੇ"), also the lime eaten with paan;
  **ਚਾਕ** is chalk (and blackboard chalk; "chalk mitti" in Google suggest is a modelling clay); **ਚੂਨਾ ਪੱਥਰ** is limestone
  (pawiki). None is used for whiting; "lime" in a frit's name is ਚੂਨਾ only there ("ਸੋਡਾ-ਪੋਟਾਸ਼-ਚੂਨਾ ਫ਼ਰਿਟ", as pawiki writes
  "ਸੋਡਾ-ਚੂਨਾ ਗਲਾਸ").
- **ਬੋਰਾਨ, ਬੋਰੈਕਸ, ਬੋਰਿਕ ਐਸਿਡ:** B₂O₃ is **ਬੋਰਾਨ (B₂O₃)**, formally ਬੋਰਾਨ ਆਕਸਾਈਡ; borax is **ਬੋਰੈਕਸ (ਸੁਹਾਗਾ)** (pawiki
  ਬੋਰੈਕਸ; Google suggest "ਚਿੱਟਾ ਸੁਹਾਗਾ"; ਸੁਹਾਗਾ alone is also a farm plank-harrow in pawiki, so the bracket only); boric acid
  is **ਬੋਰਿਕ ਐਸਿਡ**. In the safety text, name each as the English does.
- **ਪੋਟਾਸ਼ and ਸੋਡਾ:** "potash" (K₂O) is **ਪੋਟਾਸ਼ (K₂O)**, formally ਪੋਟਾਸ਼ੀਅਮ ਆਕਸਾਈਡ; ਪੋਟਾਸ਼ is also a fertiliser in Punjab
  (pawiki "ਪੋਟਾਸ਼ੀਅਮ ਨਾਲ ਭਰਪੂਰ ਖਾਦਾਂ"), so the oxide always has K₂O at its first use in a section. The safety guide's potash
  (potassium carbonate) is **ਪੋਟਾਸ਼ੀਅਮ ਕਾਰਬੋਨੇਟ**. "soda" (Na₂O) is **ਸੋਡਾ (Na₂O)**, formally ਸੋਡੀਅਮ ਆਕਸਾਈਡ; soda ash is
  **ਸੋਡਾ ਐਸ਼**; ਸੋਡਾ alone is also washing soda, baking soda and soda water.
- **ਸਟੇਨ and ਕਲਰੈਂਟ:** a stain (factory-made) is **ਸਟੇਨ (ਤਿਆਰ ਰੰਗ-ਪਦਾਰਥ)**: ਸਟੇਨ is also a mark; a colorant is **ਕਲਰੈਂਟ
  (ਰੰਗ-ਪਦਾਰਥ)**.
- **ਰੈਸਪੀਰੇਟਰ, ਵੈਂਟੀਲੇਟਰ, ਹਵਾਦਾਰੀ:** a respirator is **ਰੈਸਪੀਰੇਟਰ ਮਾਸਕ** at first use, then ਰੈਸਪੀਰੇਟਰ (Google suggest:
  "mask n95 respirator"); a hospital ventilator is **ਵੈਂਟੀਲੇਟਰ**, never meant here; ventilation of a room is **ਹਵਾਦਾਰੀ**
  (ਵੈਂਟੀਲੇਸ਼ਨ in LEV only).
- **ਗਾਈਡ and ਮੈਨੂਅਲ:** the app's guides are **ਗਾਈਡ** (f.); a kiln's, controller's or sitter's manual is **ਮੈਨੂਅਲ** (m.).
  Never the same word. A maker's, supplier's or school's own "guide" is **ਕਿਤਾਬਚਾ** (a booklet), **ਲੇਖ** (an article) or
  **ਦਸਤਾਵੇਜ਼** (a document; MS), never ਗਾਈਡ; "a guide, not a prediction" is "ਦਿਸ਼ਾ ਦੱਸਣ ਵਾਲਾ ਅੰਦਾਜ਼ਾ"; "guidelines" are
  **ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼**. **ਗਾਈਡ ਕੋਨ** is a cone's name and stays.
- **Save and safe:** Save is **ਸੇਵ ਕਰੋ**, never ਸੁਰੱਖਿਅਤ ਕਰੋ (Choices).
- **ਰਿਡਕਸ਼ਨ, ਕਟੌਤੀ, ਘਾਟਾ:** reduction is **ਰਿਡਕਸ਼ਨ (ਅਣ-ਆਕਸੀਕਰਨ)** (pawiki "ਰਿਡੱਕਸ਼ਨ (ਅਣਾਆਕਸੀਕਰਨ)"); never **ਕਟੌਤੀ** (a cut, a
  discount) or **ਘਾਟਾ** (a loss, a decrease).
- **ਕ੍ਰੇਜ਼ਿੰਗ and ਕ੍ਰੈਕਲ:** crazing is **ਕ੍ਰੇਜ਼ਿੰਗ** (a defect); crackle is **ਕ੍ਰੈਕਲ** (wanted; Bhoomi "Transparent Crackle"); a
  crack through the pot from heating or cooling is **ਡੰਟਿੰਗ (ਤਰੇੜ)**.
- **ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ and ਘਣਤਾ:** specific gravity is **ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ (ਸਾਪੇਖੀ ਘਣਤਾ)**, a ratio with no unit (1.45);
  **ਘਣਤਾ** alone is density in g/cm³ or kg/m³ and is never used for a glaze; a glaze's density (the setting) is
  **ਗਾੜ੍ਹਾਪਣ**; never ਲੀਟਰ ਦਾ ਭਾਰ (litre weight).
- **ਲੀਚਿੰਗ:** leaching is **ਲੀਚਿੰਗ (ਧਾਤਾਂ ਦਾ ਰਿਸਣਾ)**; the leach test is a test of the metals a fired piece releases, not
  narrowed to lead and cadmium.
- **ਘੁਲਣਸ਼ੀਲ and ਪਿਘਲਣਾ (soluble is not melting):** soluble is **ਘੁਲਣਸ਼ੀਲ** (dissolving; pawiki "ਘੁਲਣਸ਼ੀਲ ਨਮਕ"), to melt is
  **ਪਿਘਲਣਾ** (pawiki "ਪਿਘਲੇ ਹੋਏ ਰੂਪ"). "low-solubility lead frit" → "ਘੱਟ ਘੁਲਣਸ਼ੀਲਤਾ ਵਾਲਾ ਲੈੱਡ ਫ਼ਰਿਟ", never "ਘੱਟ ਪਿਘਲਣ
  ਵਾਲਾ", which would say it melts low. Check this pair first in every safety text.
- **ਫ਼ਾਰਮੂਲਾ and ਰੈਸਿਪੀ:** a recipe is **ਰੈਸਿਪੀ**, a chemical formula **ਫ਼ਾਰਮੂਲਾ**, the unity formula **ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ**;
  **ਨੁਸਖ਼ਾ** (a remedy, a prescription) is never used.
- **ਪਲਾਸਟਿਕ, ਸਟੈਬਿਲਾਈਜ਼ਰ, ਸਸਪੈਂਡਰ, ਕੁਕੀ, ਮੈਨੂਅਲ, ਸ਼ੈਲਫ਼:** loanwords that mean something else in Punjabi homes (plastic, a
  voltage stabiliser, braces, a biscuit, a manual, a shop or kitchen shelf): see their rows.
- **ਅਣੂ and ਪਰਮਾਣੂ:** a molecule is **ਅਣੂ**, an atom **ਪਰਮਾਣੂ** (pawiki); molecular weight ਅਣਵੀ ਭਾਰ, never ਪਰਮਾਣੂ ਭਾਰ (atomic
  weight).
- **Placeholders:** see Placeholders and names.
- **Japanese names:** Hepburn with macrons, with the kanji in brackets where the English writes kanji: tokutō (特等), yontō
  (四等), kanri nōdo (管理濃度), kokka kentei (国家検定), Ōsaka chūdoku 110-ban (大阪中毒110番), ōgata kōn (大型コーン),
  Kyōto zēgeru (京都ゼーゲル), Yūkō Shōji (有恒商事).
- **Words to keep the same across files** (from the Marathi and Hindi reviews, settled here for Punjabi before the first
  file): harmonised classification **ਇੱਕਸਾਰ ਵਰਗੀਕਰਨ**; Error **ਗਲਤੀ** (f.; "ਸਰਵਰ ਦੀ ਗਲਤੀ", "…ਲਿਆਉਂਦੇ ਸਮੇਂ ਗਲਤੀ ਹੋਈ.";
  MS's ਤਰੁੱਟੀ is not used, Native check); a firing or material record **ਰਿਕਾਰਡ** (m.), notes and the Notes page **ਨੋਟ/ਨੋਟਸ**
  (to record = ਦਰਜ ਕਰਨਾ); AI assistant **AI ਸਹਾਇਕ** (m.); translucent **ਪਾਰਭਾਸੀ**, semi-opaque **ਅਰਧ-ਅਪਾਰਦਰਸ਼ੀ** (never
  swapped); a shed **ਬਾਹਰ ਵੱਖਰਾ ਕਮਰਾ** (never ਸ਼ੈੱਡ, which reads as the shade of welding glasses); flux **ਫ਼ਲਕਸ**, solvent
  **ਘੋਲਕ**; vent **ਵੈਂਟ**; "lime" as an oxide or in totals **ਕੈਲਸ਼ੀਅਮ** (ਚੂਨਾ only in a frit's name).

### Search terms (docs/seo-plan.md, item 9)

Google's suggestions for Punjabi (hl=pa, gl=IN, web and YouTube, 21 October 2026) show that Punjabi speakers do not search
for studio glazes in Gurmukhi at all: **ਗਲੇਜ਼**, **ਗਲੇਜ**, **ਸਿਰੇਮਿਕ ਗਲੇਜ਼**, **ਕਿਲਨ**, **ਪੌਟਰੀ**, **ਪੋਰਸਲੇਨ**,
**ਫੈਲਡਸਪਾਰ**, **ਫਰਿੱਟ** and **ਕੋਨ 6** complete to nothing (or to a fridge and songs); **ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ** completes to "mitti
de bhande in english", "mitti de bhande near me" and "ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ ਬਣਾਉਣ ਵਾਲਾ"; **ਚੀਨੀ ਮਿੱਟੀ** to crockery in Latin
letters; **ਭੱਠੀ** to songs; **ਸਿਲਿਕਾ** to "ਸਿਲਿਕਾ ਡਸ੍ਟ". The searches that exist are in English or romanised Punjabi.
**Proposed title**: "Glazecalc: ਸਿਰੇਮਿਕ ਗਲੇਜ਼ ਕੈਲਕੁਲੇਟਰ, ਪੌਟਰੀ ਲਈ ਮੁਫ਼ਤ". **Description terms:** ਸਿਰੇਮਿਕ ਗਲੇਜ਼ ਰੈਸਿਪੀ,
ਪੌਟਰੀ ਗਲੇਜ਼, ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ, ਫ਼ਰਿਟ, ਫੈਲਡਸਪਾਰ, ਕੋਨ 6, ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ (UMF), and the English "glaze calculator" once in
brackets. Every Punjabi title and description that says ਗਲੇਜ਼ carries ਸਿਰੇਮਿਕ or ਪੌਟਰੀ with it.

## 2. Glossary

"show English" marks the terms whose English a reader can ask to see after them (`<en>…</en>`, `{{en: …}}`). **Tier** in
the Notes: 1 craft loanword, 2 material by its bag name, 3 school chemistry and physics, 4 plain Punjabi and the law (see
the opening). **m.**, **f.**: the gender the verb and ਦਾ/ਦੀ/ਦੇ take (Punjabi has two grammatical genders in agreement;
MS's "neuter" class agrees as masculine). **Usage**: the word Indian shops, Google's suggestions or pawiki use, in no
Punjabi teaching source; **No source**: a best choice with no Punjabi source. A term in brackets after the Punjabi is the
technical term for the guides' first use per section.

### 2.1 Glaze and its chemistry

| English                                      | Punjabi                                                       | Notes                                                                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze                                        | ਗਲੇਜ਼; to glaze ਗਲੇਜ਼ ਲਾਉਣਾ; glazed ਗਲੇਜ਼ ਲੱਗੇ (ਕੱਚ ਵਰਗੀ ਪਰਤ) | **show English**. Tier 1. m. pawiki ("ਬਰਤਨ ਦੇ ਗਲੇਜ਼", "ਵਾਟਰਪ੍ਰੂਫ ਗਲੇਜ਼ ਹੁੰਦਾ ਹੈ"). The bracket is No source: pawiki's ਚਮਕਦਾਰ is shine (Pitfalls). Unglazed: ਬਿਨਾਂ ਗਲੇਜ਼. **Native check** on the bracket. Never ਮੀਨਾਕਾਰੀ.  |
| glass former                                 | ਗਲਾਸ ਫ਼ਾਰਮਰ (ਕੱਚ ਬਣਾਉਣ ਵਾਲਾ ਆਕਸਾਈਡ)                           | **show English**. Tier 1. m. No source. The RO₂ column, silica. UI "ਗਲਾਸ ਫ਼ਾਰਮਰ - RO₂".                                                                                                                                    |
| flux                                         | ਫ਼ਲਕਸ (ਪਿਘਲਾਉਣ ਵਾਲਾ)                                          | **show English**. Tier 1. m. No source; Native check. Also a category ("ਫ਼ਲਕਸ") and "ਫ਼ਲਕਸ ਕਰਨ ਦੀ ਤਾਕਤ" (fluxing power). Not soldering or magnetic flux; not pawiki's machine-made ਪ੍ਰਵਾਹ.                                 |
| stabilizer                                   | ਸਟੈਬਿਲਾਈਜ਼ਰ (ਸਥਿਰ ਕਰਨ ਵਾਲਾ)                                   | **show English**. Tier 1. m. No source; Native check. A ਸਟੈਬਿਲਾਈਜ਼ਰ at home is a voltage stabiliser: say "ਗਲੇਜ਼ ਦਾ ਸਟੈਬਿਲਾਈਜ਼ਰ" or "ਸਟੈਬਿਲਾਈਜ਼ਰ ਆਕਸਾਈਡ" at first use. UI "ਸਟੈਬਿਲਾਈਜ਼ਰ - R₂O₃".                             |
| oxide                                        | ਆਕਸਾਈਡ                                                        | Tier 3. m. pawiki ("ਆਕਸਾਈਡ", "ਆਕਸਾਈਡਾਂ"), Bhoomi ("Iron Oxide Red"). Formulas never translated; the app's two names: formal "ਕੈਲਸ਼ੀਅਮ ਆਕਸਾਈਡ", the potters' "ਕੈਲਸ਼ੀਅਮ".                                                    |
| R₂O and RO                                   | R₂O ਅਤੇ RO                                                    | Symbols kept. UI "ਫ਼ਲਕਸ - RO".                                                                                                                                                                                             |
| alkali, alkaline                             | ਅਲਕਲੀ; alkaline ਖਾਰੀ                                          | Tier 3. f. pawiki ("ਘੁਲਣਸ਼ੀਲ ਖ਼ਾਰ ਨੂੰ ਅਲਕਲੀ", "ਖਾਰੀ ਧਰਤੀ ਧਾਤ"). "ਖਾਰੀ ਫ਼ਰਿਟ" (Bhoomi "Alkaline"), "ਖਾਰੀ ਕਾਪਰ ਬਲੂ". The R₂O oxides, not the pH sense; ਖ਼ਾਰ alone is a chemical base. Native check.                          |
| unity molecular formula (UMF)                | ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ (UMF)                                           | **show English**. Tier 3. m. No Punjabi name found; Native check. ਫ਼ਾਰਮੂਲਾ as pawiki ("ਰਸਾਇਣਕ ਫ਼ਾਰਮੂਲਾ"). "ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ (UMF)" at first use, then "ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ". "Unity formula" → "ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ", "Unity:" → "ਸੇਗਰ:". |
| unity                                        | ਯੂਨਿਟੀ (ਫ਼ਲਕਸਾਂ ਦਾ ਜੋੜ ਇੱਕ ਮੰਨ ਕੇ)                            | Tier 1. f. No source; Native check. "in unity" → "ਯੂਨਿਟੀ ਵਿੱਚ"; ਇੱਕ as a word. Not ਏਕਤਾ (togetherness).                                                                                                                    |
| limit formula (target formula)               | ਲਿਮਿਟ ਫ਼ਾਰਮੂਲਾ (ਟੀਚਾ ਫ਼ਾਰਮੂਲਾ)                                | **show English**. Tier 1. m. No source. Not a legal limit: never ਸੀਮਾ alone, which the law and the silica text use.                                                                                                        |
| silica to alumina ratio                      | ਸਿਲਿਕਾ-ਐਲੂਮਿਨਾ ਅਨੁਪਾਤ                                         | **show English**. m. No source (ਅਨੁਪਾਤ, school maths' ratio). UI "ਸਿਲਿਕਾ ਅਤੇ ਐਲੂਮਿਨਾ ਦਾ ਅਨੁਪਾਤ: {ratio}", "ਸਿਲਿਕਾ-ਐਲੂਮਿਨਾ {ratio}:1".                                                                                      |
| flux balance                                 | ਫ਼ਲਕਸ ਸੰਤੁਲਨ                                                  | m. No source. UI "ਫ਼ਲਕਸ ਸੰਤੁਲਨ", "ਸੰਤੁਲਨ", "ਫ਼ਲਕਸਾਂ ਦਾ ਸੰਤੁਲਨ".                                                                                                                                                            |
| oxide analysis (analysis, chemical analysis) | ਆਕਸਾਈਡ ਵਿਸ਼ਲੇਸ਼ਣ (ਵਿਸ਼ਲੇਸ਼ਣ, ਰਸਾਇਣਕ ਵਿਸ਼ਲੇਸ਼ਣ)                | Tier 3. m. No source (ਰਸਾਇਣਕ as pawiki). UI "ਆਕਸਾਈਡ ਵਿਸ਼ਲੇਸ਼ਣ, ਪਕਾਉਣ ਤੋਂ ਬਾਅਦ, ਭਾਰ ਅਨੁਸਾਰ".                                                                                                                                |
| formula (raw formula, fired)                 | ਫ਼ਾਰਮੂਲਾ (ਕੱਚਾ ਫ਼ਾਰਮੂਲਾ; ਪਕਾਉਣ ਤੋਂ ਬਾਅਦ)                      | Tier 3. m. pawiki ("ਰਸਾਇਣਕ ਫ਼ਾਰਮੂਲਾ SiO2"). UI "ਕੱਚਾ ਫ਼ਾਰਮੂਲਾ:", "ਫ਼ਾਰਮੂਲਾ ਲਿਖੋ (ਪਕਾਉਣ ਤੋਂ ਬਾਅਦ ਦਾ):", "ਫ਼ਾਰਮੂਲਾ, ਜਿਵੇਂ ਵਿਕਦਾ ਹੈ:". Never ਰੈਸਿਪੀ; pawiki's ਸੂਤਰ not used.                                                  |
| loss on ignition (LOI)                       | ਅੱਗ ਨਾਲ ਭਾਰ ਘਾਟਾ (LOI)                                        | **show English**. Tier 3. m. No source; Native check. Indian shops and labs write "LOI". "ਅੱਗ ਨਾਲ ਭਾਰ ਘਾਟਾ (LOI)" at first use; the UI's bare "LOI" stays LOI.                                                             |
| mole                                         | ਮੋਲ                                                           | Tier 3. m. pawiki ("ਮੋਲ (ਇਕਾਈ)"). Not the animal or a mark on the skin (ਤਿਲ).                                                                                                                                              |
| molecular weight                             | ਅਣਵੀ ਭਾਰ                                                      | Tier 3. m. pawiki's ਅਣੂ and "ਪਰਮਾਣੂ-ਭਾਰ"; never ਪਰਮਾਣੂ ਭਾਰ (atomic weight). UI "ਫ਼ਾਰਮੂਲੇ ਦਾ ਕੱਚਾ ਅਣਵੀ ਭਾਰ". Native check.                                                                                                  |
| equivalent weight, fired weight              | ਤੁੱਲ ਭਾਰ; ਪਕਾਉਣ ਤੋਂ ਬਾਅਦ ਦਾ ਭਾਰ                               | Tier 3. m. No source; Native check. UI columns "ਤੁੱਲ ਭਾਰ", "ਪਕਾਉਣ ਤੋਂ ਬਾਅਦ ਦਾ ਭਾਰ".                                                                                                                                        |
| melt (noun)                                  | ਪਿਘਲਿਆ ਗਲੇਜ਼                                                  | Tier 4. m. pawiki ("ਪਿਘਲੇ ਹੋਏ ਰੂਪ"). "ਪਿਘਲੇ ਗਲੇਜ਼ ਨੂੰ ਗਾੜ੍ਹਾ ਕਰਦਾ ਹੈ", "ਪਿਘਲੇ ਗਲੇਜ਼ ਵਿੱਚੋਂ ਗੈਸ ਦੇ ਬੁਲਬੁਲੇ".                                                                                                                |
| thermal expansion (expansion)                | ਥਰਮਲ ਫੈਲਾਅ (ਫੈਲਾਅ)                                            | **show English**. Tier 3. m. No source; Native check. UI "ਫੈਲਾਅ, ×10⁻⁶/°C"; "CTE" and "x 10^-7/K" kept.                                                                                                                    |
| stiff, fluid, runny (viscosity)              | ਗਾੜ੍ਹਾ, ਪਤਲਾ, ਵਗਣ ਵਾਲਾ (ਲੇਸ)                                  | Tier 4. No source for ਲੇਸ in this sense (Native check). "ਵਗਣ ਵਾਲਾ" also describes a thin slurry: context decides.                                                                                                          |
| raw, fired                                   | ਕੱਚਾ; ਪੱਕਿਆ                                                   | Tier 4. pawiki ("ਭਾਂਡੇ ਪਕਾਉਂਦੇ ਹਨ"; "ਕੱਚੀਆਂ ਧਾਤਾਂ"). "ਕੱਚੀ ਵਾਈਟਿੰਗ", "ਕੱਚੀ ਮਿੱਟੀ", "ਪਕਾਉਣ ਤੋਂ ਬਾਅਦ ਦੇ ਆਕਸਾਈਡ", "ਪੱਕਿਆ ਭਾਂਡਾ". Never ਕੱਚਾ for bisque (2.3).                                                                 |
| gloss, satin, matte                          | ਗਲਾਸੀ, ਸਾਟਿਨ, ਮੈਟ                                             | Tier 1. No source. "ਚਮਕਦਾਰ" in running text where the English says shiny. ਸਾਟਿਨ is not the fabric here.                                                                                                                    |
| opaque, transparent, translucent, clear      | ਅਪਾਰਦਰਸ਼ੀ, ਪਾਰਦਰਸ਼ੀ, ਪਾਰਭਾਸੀ, ਕਲੀਅਰ                           | Tier 3 and 1. pawiki ("ਪਾਰਦਰਸ਼ੀ"); the rest No source. "ਕਲੀਅਰ ਗਲੇਜ਼" is a glaze type, not "ਸਾਫ਼". Semi-opaque is ਅਰਧ-ਅਪਾਰਦਰਸ਼ੀ, never ਪਾਰਭਾਸੀ (translucent).                                                               |
| stable, durable                              | ਸਥਿਰ; ਟਿਕਾਊ                                                   | Tier 4. No source. "ਸਥਿਰ ਗਲੇਜ਼" (balanced, resists leaching).                                                                                                                                                              |
| crystals, crystalline                        | ਕ੍ਰਿਸਟਲ; ਕ੍ਰਿਸਟਲਿਨ                                            | Tier 3. pawiki ("ਕ੍ਰਿਸਟਲਿਨ ਠੋਸ", "ਗੈਰ-ਕ੍ਰਿਸਟਲਲਾਈਨ"). Bhoomi "Crystalline" frits: "ਕ੍ਰਿਸਟਲਿਨ ਗਲੇਜ਼". "ਕ੍ਰਿਸਟਲਿਨ ਸਿਲਿਕਾ" is the dust hazard (2.7).                                                                           |
| boron blue                                   | “ਬੋਰਾਨ ਬਲੂ”                                                   | Keep the quotes; translate the sense (ਦੁੱਧ ਵਰਗਾ ਨੀਲਾ-ਚਿੱਟਾ) where the English explains it. No source.                                                                                                                      |
| celadon                                      | ਸੇਲਾਡਾਨ                                                       | Tier 1. m. No source. Palette "ਸੇਲਾਡਾਨ ਹਰਾ".                                                                                                                                                                               |
| tenmoku (temmoku)                            | ਟੈਨਮੋਕੂ                                                       | Tier 1. m. No source; Native check on the spelling. Palette "ਟੈਨਮੋਕੂ ਜੰਗਾਲ".                                                                                                                                               |

### 2.2 Materials and oxides

| English                                           | Punjabi                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| silica (SiO₂)                                     | ਸਿਲਿਕਾ (SiO₂)                                                  | **show English**. Tier 2. m. pawiki ("ਸਿਲਿਕਾ (ਸਿਲਿਕਨ ਡਾਈਆਕਸਾਈਡ, ਜਾਂ ਕੁਆਰਟਜ਼)", "70% ਸਿਲਿਕਾ ਹੁੰਦਾ ਹੈ"), Google suggest ("ਸਿਲਿਕਾ ਡਸ੍ਟ"). Not ਸਿਲੀਕਾਨ (the element), ਸਿਲੀਕੋਨ ਰਬੜ or ਸਿਲਿਕਾ ਜੈੱਲ. Category "ਸਿਲਿਕਾ". Native check on the gender.                                                                                                                                                                        |
| alumina (Al₂O₃)                                   | ਐਲੂਮਿਨਾ (Al₂O₃)                                                | Tier 2. f. No source (pawiki's metal "ਐਲੂਮੀਨੀਅਮ"). Category "ਐਲੂਮਿਨਾ"; formal "ਐਲੂਮੀਨੀਅਮ ਆਕਸਾਈਡ".                                                                                                                                                                                                                                                                                                                   |
| boron (B₂O₃)                                      | ਬੋਰਾਨ (B₂O₃)                                                   | Tier 3. m. No source. Category "ਬੋਰਾਨ ਦੇ ਸਰੋਤ"; formal "ਬੋਰਾਨ ਆਕਸਾਈਡ".                                                                                                                                                                                                                                                                                                                                              |
| potash (K₂O)                                      | ਪੋਟਾਸ਼ (K₂O)                                                   | **show English**. Tier 1. m. pawiki ("ਪੋਟਾਸ਼"). Formal ਪੋਟਾਸ਼ੀਅਮ ਆਕਸਾਈਡ. Always with K₂O at first use (ਪੋਟਾਸ਼ is also a fertiliser). The safety guide's potash is ਪੋਟਾਸ਼ੀਅਮ ਕਾਰਬੋਨੇਟ: check which. KNaO kept.                                                                                                                                                                                                       |
| soda (Na₂O)                                       | ਸੋਡਾ (Na₂O)                                                    | **show English**. Tier 1. m. pawiki ("ਸੋਡਾ-ਚੂਨਾ ਗਲਾਸ"). Formal ਸੋਡੀਅਮ ਆਕਸਾਈਡ. Soda ash is ਸੋਡਾ ਐਸ਼; in firing logs "Soda" is a soda firing (2.4).                                                                                                                                                                                                                                                                   |
| lithium (Li₂O)                                    | ਲਿਥੀਅਮ (Li₂O)                                                  | Tier 2. m. Clay Station ("Lithium Carbonate"). Records' "lithia" → ਲਿਥੀਆ.                                                                                                                                                                                                                                                                                                                                           |
| calcium, lime (CaO)                               | ਕੈਲਸ਼ੀਅਮ; lime ਚੂਨਾ (CaO)                                      | Tier 3. m. pawiki ("ਕੈਲਸ਼ੀਅਮ", "ਚੂਨਾ"). The UI says "ਕੈਲਸ਼ੀਅਮ"; ਚੂਨਾ only in frit names ("ਸੋਡਾ-ਪੋਟਾਸ਼-ਚੂਨਾ ਫ਼ਰਿਟ"). Not the fruit (ਨਿੰਬੂ); "lime green" → "ਤੋਤੇ ਰੰਗਾ ਹਰਾ".                                                                                                                                                                                                                                          |
| magnesium, magnesia (MgO)                         | ਮੈਗਨੀਸ਼ੀਅਮ; ਮੈਗਨੀਸ਼ੀਆ (MgO)                                    | Tier 3. m. Bhoomi ("Magnesium Oxide", "Magnesium Carbonate"). Formal "ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ".                                                                                                                                                                                                                                                                                                                           |
| barium (BaO), barium carbonate                    | ਬੇਰੀਅਮ (BaO), ਬੇਰੀਅਮ ਕਾਰਬੋਨੇਟ                                  | Tier 2. m. pawiki ("ਬੇਰੀਅਮ"), Clay Station ("CS Barium Carbonate (G)"). ਜ਼ਹਿਰੀਲਾ (2.7).                                                                                                                                                                                                                                                                                                                             |
| strontium (SrO)                                   | ਸਟ੍ਰੋਂਟੀਅਮ (SrO)                                               | Tier 2. m. pawiki ("ਸਟ੍ਰੋਂਟੀਅਮ"), Bhoomi, Clay Station ("Strontium Carbonate").                                                                                                                                                                                                                                                                                                                                     |
| zinc (ZnO), zinc oxide                            | ਜ਼ਿੰਕ (ZnO), ਜ਼ਿੰਕ ਆਕਸਾਈਡ                                      | Tier 2. m. Clay Station ("CS Zinc Oxide (G-325)"). pawiki's ਜਿਸਤ is also "even" (Google suggest "ਜਿਸਤ ਸੰਖਿਆ"): not used. "ਕੈਲਸਾਈਂਡ ਜ਼ਿੰਕ".                                                                                                                                                                                                                                                                          |
| lead (PbO)                                        | ਲੈੱਡ (ਸਿੱਕਾ) (PbO); its compounds ਲੈੱਡ ਆਕਸਾਈਡ, ਲੈੱਡ ਵਾਲਾ ਫ਼ਰਿਟ | Tier 2 and 3. m. Bhoomi ("Frit 1009 Lead Based"); pawiki ("ਸਿੱਕਾ (ਧਾਤ)", "ਸਿੱਕੇ ਨਾਲ ਜ਼ਹਿਰ ਫੈਲਣਾ"). Setting "ਲੈੱਡ". ਸਿੱਕਾ alone is also a coin (Choices). Never Hindi सीसा or ਸ਼ੀਸ਼ਾ. Native check.                                                                                                                                                                                                                  |
| iron (red iron oxide, black iron oxide)           | ਆਇਰਨ (ਰੈੱਡ ਆਇਰਨ ਆਕਸਾਈਡ, ਬਲੈਕ ਆਇਰਨ ਆਕਸਾਈਡ)                      | Tier 2. m. Bhoomi ("Iron Oxide Red", "Iron Oxide Black"); Punjabi ਲੋਹਾ in running chemistry only. Fe₂O₃ red, Fe₃O₄ black. "Crocus martis" kept.                                                                                                                                                                                                                                                                     |
| titanium, titania (TiO₂)                          | ਟਾਈਟੇਨੀਅਮ; ਟਾਈਟੇਨੀਆ (TiO₂)                                     | Tier 3. m. No source. Formal ਟਾਈਟੇਨੀਅਮ ਡਾਈਆਕਸਾਈਡ.                                                                                                                                                                                                                                                                                                                                                                   |
| raw materials (materials)                         | ਸਮੱਗਰੀਆਂ; a shop's raw materials ਕੱਚਾ ਮਾਲ                      | Tier 4. f. pawiki ("ਸਿਰੇਮਿਕ ਫਰਿਟ ਸਮੱਗਰੀ", "ਸਮੱਗਰੀਆਂ"); Bhoomi's and Clay Station's menu "Raw Materials" → ਕੱਚਾ ਮਾਲ. UI page "ਸਮੱਗਰੀਆਂ". **Native check** (Choices).                                                                                                                                                                                                                                                 |
| feldspar (spar)                                   | ਫੈਲਡਸਪਾਰ                                                       | **show English**. Tier 2. m. Bhoomi, Clay Station. No Punjabi source (Google suggest: none). "spar" in names stays ("Custer Spar"). Category "ਫੈਲਡਸਪਾਰ ਅਤੇ ਸਟੋਨ".                                                                                                                                                                                                                                                   |
| potash feldspar, soda feldspar                    | ਪੋਟਾਸ਼ ਫੈਲਡਸਪਾਰ; ਸੋਡਾ ਫੈਲਡਸਪਾਰ                                 | Tier 2. m. Clay Station ("CS Potash Feldspar", "CS Soda Feldspar"), Bhoomi ("Soda Feldspar 1 Kg"). ਆਰਥੋਕਲੇਜ਼; ਐਲਬਾਈਟ.                                                                                                                                                                                                                                                                                               |
| nepheline syenite                                 | ਨੈਫ਼ੇਲੀਨ ਸਾਇਨਾਈਟ                                               | **show English**. Tier 2. m. Clay Station ("CS Nepheline Syenite (G-325)"). No Punjabi source.                                                                                                                                                                                                                                                                                                                      |
| Cornish stone (Cornwall stone, china stone)       | ਕੌਰਨਿਸ਼ ਸਟੋਨ (ਕੌਰਨਵਾਲ ਸਟੋਨ, ਚਾਈਨਾ ਸਟੋਨ)                        | Tier 2. m. No source. "ਸਟੋਨ" is a material, not a ਪੱਥਰ (pebble).                                                                                                                                                                                                                                                                                                                                                    |
| kaolin (UK: china clay)                           | ਕਾਓਲਿਨ (ਚਾਈਨਾ ਕਲੇ)                                             | **show English**. Tier 2. f. Bhoomi ("China Clay Kaolin Calcined"). ਚਾਈਨਾ ਕਲੇ at first use per section. Never ਚੀਨੀ ਮਿੱਟੀ (Pitfalls). No Punjabi source; Native check on the spelling.                                                                                                                                                                                                                               |
| calcined                                          | ਕੈਲਸਾਈਂਡ (ਪਹਿਲਾਂ ਤਪਾਇਆ)                                        | Tier 2. Bhoomi ("Calcined"). The bracket No source. "ਕੈਲਸਾਈਂਡ ਕਾਓਲਿਨ", "ਕੈਲਸਾਈਂਡ ਫ਼ਲਿੰਟ", "ਕੈਲਸਾਈਂਡ ਜ਼ਿੰਕ".                                                                                                                                                                                                                                                                                                         |
| ball clay                                         | ਬਾਲ ਕਲੇ                                                        | **show English**. Tier 2. f. Bhoomi ("Ball Clay 1 Kg"). "ਬਾਲ" is part of the name. No Punjabi source.                                                                                                                                                                                                                                                                                                               |
| bentonite                                         | ਬੈਂਟੋਨਾਈਟ                                                      | Tier 2. m. No source; Indian shops' English.                                                                                                                                                                                                                                                                                                                                                                        |
| slip clay                                         | ਸਲਿੱਪ ਕਲੇ                                                      | Tier 2. f. No source. Not ਸਲਿੱਪ (2.3).                                                                                                                                                                                                                                                                                                                                                                              |
| whiting                                           | ਵਾਈਟਿੰਗ (ਕੈਲਸ਼ੀਅਮ ਕਾਰਬੋਨੇਟ)                                    | **show English**. Tier 2. f. Clay Station ("CS Whiting (G-200)"); pawiki ("ਕੈਲਸ਼ੀਅਮ ਕਾਰਬੋਨੇਟ"). Not ਚੂਨਾ (lime), ਚਾਕ (chalk) or ਚੂਨਾ ਪੱਥਰ (limestone). Native check on the gender.                                                                                                                                                                                                                                  |
| dolomite, talc                                    | ਡੋਲੋਮਾਈਟ; ਟੈਲਕ                                                 | Tier 2. m. Clay Station ("CS Dolomite", "CS Talc"), Bhoomi ("Pottery Talc"), pawiki ("ਡੋਲੋਮਾਈਟ ਚਟਾਨ"). Both supply MgO.                                                                                                                                                                                                                                                                                             |
| wollastonite                                      | ਵੋਲਾਸਟੋਨਾਈਟ                                                    | Tier 2. m. Bhoomi, Clay Station ("Wollastonite").                                                                                                                                                                                                                                                                                                                                                                   |
| flint                                             | ਫ਼ਲਿੰਟ                                                         | **show English**. Tier 2. m. No source. UK: calcined flint; US recipes: ground quartz.                                                                                                                                                                                                                                                                                                                              |
| quartz (free quartz, free silica)                 | ਕੁਆਰਟਜ਼ (ਖੁੱਲ੍ਹਾ ਕੁਆਰਟਜ਼, ਖੁੱਲ੍ਹੀ ਸਿਲਿਕਾ)                      | Tier 2. m. pawiki ("ਕੁਆਰਟਜ਼"). "ਖੁੱਲ੍ਹੀ ਸਿਲਿਕਾ" is free silica (2.7): loose, not bound in another mineral; No source for ਖੁੱਲ੍ਹਾ in this sense, Native check.                                                                                                                                                                                                                                                       |
| frit                                              | ਫ਼ਰਿਟ                                                          | **show English**. Tier 1. m. Bhoomi ("Frit 1003", "Frit 1005 Alkaline"), Clay Station ("Ferro Frit 3134"), pawiki ("ਸਿਰੇਮਿਕ ਫਰਿਟ", without the nukta). Native check on the gender. "ਫ਼ਰਿਟ ਕੀਤਾ" (fritted); "ਬੇਸ ਫ਼ਰਿਟ", "ਬੋਰਾਨ ਫ਼ਰਿਟ", "ਕੈਲਸ਼ੀਅਮ ਬੋਰੇਟ ਫ਼ਰਿਟ" (calcium and boron, not a borosilicate; Bhoomi "Calcium Borate"), "ਹਾਈ-ਅਲਕਲਾਈਨ ਫ਼ਰਿਟ" (Bhoomi "High Alkaline"), "ਲੈੱਡ-ਰਹਿਤ ਫ਼ਰਿਟ", "ਲੈੱਡ ਬਾਈਸਿਲੀਕੇਟ". |
| raw borates (borax, colemanite, ulexite)          | ਕੱਚੇ ਬੋਰੇਟ (ਬੋਰੈਕਸ (ਸੁਹਾਗਾ), ਕੋਲੇਮੇਨਾਈਟ, ਯੂਲੈਕਸਾਈਟ)            | Tier 2. m. pawiki ("ਬੋਰੈਕਸ … ਪਾਣੀ ਵਿੱਚ ਘੁਲ ਜਾਂਦਾ ਹੈ"), Google suggest ("ਚਿੱਟਾ ਸੁਹਾਗਾ"). Gerstley Borate, Gillespie Borate kept.                                                                                                                                                                                                                                                                                     |
| soda ash, bone ash, wood ash                      | ਸੋਡਾ ਐਸ਼, ਬੋਨ ਐਸ਼ (ਹੱਡੀਆਂ ਦੀ ਸੁਆਹ), ਲੱਕੜ ਦੀ ਸੁਆਹ               | Tier 2. f. (ਸੁਆਹ). No source. Clay Station's "Tricalcium Phosphate" is bone ash's chemistry. Only wood ash is ਸੁਆਹ in the plain sense; ash glazes "ਸੁਆਹ ਵਾਲੇ ਗਲੇਜ਼".                                                                                                                                                                                                                                                |
| colorant                                          | ਕਲਰੈਂਟ (ਰੰਗ-ਪਦਾਰਥ)                                             | **show English**. Tier 1. m. No source. Category "ਕਲਰੈਂਟ"; UI "ਕਲਰੈਂਟ ਅਤੇ ਐਡਿਟਿਵ".                                                                                                                                                                                                                                                                                                                                  |
| stain                                             | ਸਟੇਨ (ਤਿਆਰ ਰੰਗ-ਪਦਾਰਥ)                                          | **show English**. Tier 2. m. No source (Indian shops' "Stains"). ਸਟੇਨ is also a mark: the bracket at first use. The verb "stain" (a glaze stops staining) → "ਦਾਗ਼ ਪੈਣਾ".                                                                                                                                                                                                                                            |
| cobalt, copper, chrome, manganese, nickel         | ਕੋਬਾਲਟ, ਕਾਪਰ, ਕ੍ਰੋਮ, ਮੈਂਗਨੀਜ਼, ਨਿਕਲ                            | Tier 2. m. pawiki ("ਕੋਬਾਲਟ", "ਨਿਕਲ", "ਕੋਬਾਲਟ ਨੀਲੇ"); Bhoomi ("Copper Oxide", "Chrome Oxide", "Manganese Dioxide", "Nickel Oxide"). "ਕ੍ਰੋਮ" is chromium oxide, not chrome plating. ਤਾਂਬਾ not used for the oxide.                                                                                                                                                                                                     |
| rutile                                            | ਰੂਟਾਈਲ                                                         | Tier 2. m. Bhoomi ("Rutile 100 gms").                                                                                                                                                                                                                                                                                                                                                                               |
| opacifier                                         | ਓਪੈਸੀਫ਼ਾਇਰ (ਅਪਾਰਦਰਸ਼ੀ ਬਣਾਉਣ ਵਾਲਾ)                              | Tier 1. m. No source. ਜ਼ਿਰਕਾਨ, ਟਿਨ ਆਕਸਾਈਡ, ਟਾਈਟੇਨੀਅਮ ਡਾਈਆਕਸਾਈਡ.                                                                                                                                                                                                                                                                                                                                                     |
| zircon                                            | ਜ਼ਿਰਕਾਨ                                                        | Tier 2. m. No source. Zirconium silicate; not ਜ਼ਿਰਕੋਨੀਆ (ZrO₂).                                                                                                                                                                                                                                                                                                                                                     |
| suspender                                         | ਸਸਪੈਂਡਰ (ਗਲੇਜ਼ ਨੂੰ ਪਾਣੀ ਵਿੱਚ ਤੈਰਦਾ ਰੱਖਣ ਵਾਲੀ ਸਮੱਗਰੀ)           | Tier 1. m. No source; Native check. ਸਸਪੈਂਡਰ alone is braces: the bracket at first use. Category "ਸਸਪੈਂਡਰ".                                                                                                                                                                                                                                                                                                          |
| refractory                                        | ਰਿਫ੍ਰੈਕਟਰੀ (ਤਾਪ-ਰੋਧੀ)                                          | Tier 1. No source. Of materials and kiln parts.                                                                                                                                                                                                                                                                                                                                                                     |
| softening point, half-sphere point (fusion, flow) | ਸਾਫ਼ਟਨਿੰਗ ਪੁਆਇੰਟ, ਹਾਫ਼-ਸਫ਼ੀਅਰ ਪੁਆਇੰਟ (ਫ਼ਿਊਜ਼ਨ, ਫ਼ਲੋ)           | Tier 1. m. No source; the frit makers' English. "Fusion" on a Ferro sheet is a melting point, not nuclear fusion (ਨਿਊਕਲੀ ਸੰਯੋਜਨ).                                                                                                                                                                                                                                                                                   |
| substitute (stand-in, replacement)                | ਬਦਲ                                                            | Tier 4. m. No source. See "like for like" (2.8).                                                                                                                                                                                                                                                                                                                                                                    |
| equivalent (a frit's, as a maker lists it)        | ਸਮਾਨ                                                           | Tier 4. "Fusion ਦੀ ਸੂਚੀ ਵਿੱਚ Vibrantz 3134 ਦੇ ਸਮਾਨ ਫ਼ਰਿਟ"; never ਬਰਾਬਰ with no noun.                                                                                                                                                                                                                                                                                                                                |
| tin oxide (SnO₂), tin                             | ਟਿਨ ਆਕਸਾਈਡ (SnO₂), ਟਿਨ                                         | Tier 2. m. pawiki ("ਟੀਨ ਅਤੇ ਸਿੱਕਾ"). Punjabi ਕਲੀ is tinning; not used for the oxide.                                                                                                                                                                                                                                                                                                                                |
| silica sand                                       | ਸਿਲਿਕਾ ਰੇਤ                                                     | Tier 2. f. pawiki ("ਰੇਤ ਦੇ ਮੁੱਖ ਤੱਤ ਸਿਲਿਕਾ").                                                                                                                                                                                                                                                                                                                                                                       |
| ore, raw mineral                                  | ਕੱਚੀ ਧਾਤ; ਕੱਚਾ ਖਣਿਜ                                            | Tier 4. pawiki ("ਕੱਚੀ ਧਾਤ ਤੋਂ ਧਾਤ ਨੂੰ ਗਾਲਣ", "ਖਣਿਜ"). "ਪੀਸਿਆ ਕੁਦਰਤੀ ਕੱਚਾ ਖਣਿਜ". Not ਕੱਚਾ ਮਾਲ (a shop's raw materials).                                                                                                                                                                                                                                                                                              |
| mica                                              | ਅਬਰਕ (ਮਾਈਕਾ)                                                   | Tier 3. m. No source (records). "ਫ਼ਲੋਰੀਨ ਵਾਲਾ ਲਿਥੀਅਮ-ਪੋਟਾਸ਼ੀਅਮ ਅਬਰਕ (ਮਾਈਕਾ)"; the bracket at first use.                                                                                                                                                                                                                                                                                                             |

### 2.3 Clay, ware and firing stages

| English                         | Punjabi                                                     | Notes                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| clay body (body)                | ਕਲੇ ਬਾਡੀ (ਮਿੱਟੀ ਦਾ ਮਿਸ਼ਰਣ)                                  | **show English**. Tier 1. f. No source. Not a human or a car's body: "ਗਲੇਜ਼ ਬਾਡੀ ਵਿੱਚ ਪਿਘਲ ਕੇ ਰਲ ਜਾਂਦਾ ਹੈ", "ਬਾਡੀ ਸਟੇਨ". ਮਿੱਟੀ (pawiki) is clay in general.                              |
| ware (pot, piece)               | ਭਾਂਡੇ (ਭਾਂਡਾ)                                               | Tier 4. m. pawiki ("ਭਾਂਡੇ ਪਕਾਉਂਦੇ ਹਨ", "ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ"). "ਕੱਚੇ ਭਾਂਡੇ", "ਬਿਸਕ ਕੀਤੇ ਭਾਂਡੇ", "ਗਲੇਜ਼ ਲੱਗੇ ਭਾਂਡੇ"; a piece is "ਭਾਂਡਾ" or "ਪੀਸ".                                              |
| functional ware                 | ਰੋਜ਼ਾਨਾ ਵਰਤੋਂ ਦੇ ਭਾਂਡੇ (ਖਾਣ-ਪੀਣ ਲਈ)                         | Tier 4. m. No source. Not "ਕੰਮ ਕਰਨ ਵਾਲੇ".                                                                                                                                                |
| hollowware, flatware            | ਡੂੰਘੇ ਭਾਂਡੇ (ਕੱਪ, ਕੌਲੀਆਂ, ਜੱਗ); ਚਪਟੇ ਭਾਂਡੇ (ਪਲੇਟਾਂ, ਥਾਲੀਆਂ) | Tier 4. m. No source. "flatware" here is plates, not cutlery (ਛੁਰੀ-ਕਾਂਟੇ).                                                                                                               |
| earthenware                     | ਅਰਥਨਵੇਅਰ                                                    | **show English**. Tier 1. m. No source (Bhoomi "Earthenware"). Described once as "ਘੱਟ ਤਾਪ ਉੱਤੇ ਪੱਕੇ ਛੇਕਦਾਰ ਭਾਂਡੇ". Not ਟੈਰਾਕੋਟਾ, not ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ in general (Pitfalls). Native check. |
| stoneware                       | ਸਟੋਨਵੇਅਰ                                                    | **show English**. Tier 1. m. Bhoomi ("Stoneware"); pawiki's "ਪੱਥਰ ਦੇ ਭਾਂਡੇ" in the bracket once, described as "ਉੱਚੇ ਤਾਪ ਉੱਤੇ ਪੱਕੇ, ਪਾਣੀ ਨਾ ਸੋਖਣ ਵਾਲੇ ਭਾਂਡੇ".                             |
| porcelain                       | ਪੋਰਸਲੀਨ                                                     | Tier 1. m. pawiki ("ਪੋਰਸਲੀਨ ਦੇ ਭਾਂਡੇ"), Bhoomi ("Porcelain"). Never ਚੀਨੀ ਮਿੱਟੀ.                                                                                                          |
| vitreous, vitrification         | ਕੱਚ ਵਰਗਾ (ਵਿਟ੍ਰੀਫ਼ਾਈਡ); ਵਿਟ੍ਰੀਫ਼ਿਕੇਸ਼ਨ                      | Tier 1 and 4. No source; ਕੱਚ as pawiki. Native check.                                                                                                                                    |
| porous, porosity                | ਛੇਕਦਾਰ; ਛੇਕਦਾਰਪਣ                                            | Tier 4. No source (pawiki's ਖੁੰਭ article: "ਮੁਸਾਮ (ਛੇਕ)"). "ਬਿਸਕ ਛੇਕਦਾਰ ਰਹਿਣਾ ਚਾਹੀਦਾ ਹੈ". Native check.                                                                                   |
| mature, maturity                | ਮੈਚਿਓਰ ਹੋਣਾ (ਪੂਰਾ ਪੱਕਣਾ); ਮੈਚਿਓਰਿਟੀ                         | Tier 1. No source; Native check. Not age.                                                                                                                                                |
| plastic, plasticity             | ਲਚਕੀਲੀ (ਆਕਾਰ ਫੜਨ ਵਾਲੀ); ਲਚਕ                                 | Tier 4, an exception to tier 1: ਪਲਾਸਟਿਕ is the polymer. No source; Native check.                                                                                                         |
| greenware                       | ਗ੍ਰੀਨਵੇਅਰ (ਕੱਚੇ ਭਾਂਡੇ)                                      | **show English**. Tier 1. m. No source. Not green; not ਬਿਸਕ.                                                                                                                             |
| leather-hard                    | ਲੈਦਰ-ਹਾਰਡ (ਅੱਧ-ਸੁੱਕਿਆ)                                      | Tier 1. No source; Native check.                                                                                                                                                         |
| bone dry                        | ਬੋਨ-ਡ੍ਰਾਈ (ਪੂਰਾ ਸੁੱਕਿਆ)                                     | Tier 1. No source.                                                                                                                                                                       |
| bisque (UK: biscuit)            | ਬਿਸਕ (ਪਹਿਲੀ ਪਕਾਈ)                                           | **show English**. Tier 1. m. No source. "ਬਿਸਕ ਫਾਇਰਿੰਗ", "ਬਿਸਕ ਕੀਤਾ", "ਸਾਫ਼ਟ/ਹਾਰਡ ਬਿਸਕ". Not ਬਿਸਕੁਟ (Google suggest completes ਬਿਸਕ to biscuits); not ਕੱਚਾ.                                |
| glaze firing (UK: glost firing) | ਗਲੇਜ਼ ਫਾਇਰਿੰਗ (ਦੂਜੀ ਪਕਾਈ)                                   | **show English**. Tier 1. f. No source.                                                                                                                                                  |
| once-firing (single firing)     | ਸਿੰਗਲ ਫਾਇਰਿੰਗ (ਇੱਕੋ ਵਾਰ ਪਕਾਉਣਾ)                             | **show English**. Tier 1. f. No source. "ਇੱਕ" as a word.                                                                                                                                 |
| slip                            | ਸਲਿੱਪ (ਪਾਣੀ ਵਿੱਚ ਘੋਲੀ ਮਿੱਟੀ)                                | Tier 1. f. pawiki ("ਸਲਿੱਪ-ਪੇਂਟਡ"). Not slipping or a receipt (ਪਰਚੀ, also "slip"). Native check on the gender.                                                                            |
| engobe                          | ਐਂਗੋਬ                                                       | Tier 1. m. No source.                                                                                                                                                                    |
| underglaze                      | ਅੰਡਰਗਲੇਜ਼                                                   | Tier 1. m. No source. "ਅੰਡਰਗਲੇਜ਼ ਪੈਨਸਿਲ".                                                                                                                                                |
| foot                            | ਥੱਲਾ                                                        | Tier 4. m. No source; Punjabi ਥੱਲਾ is the bottom of a pot. "ਥੱਲੇ ਉੱਤੇ ਗਲੇਜ਼ ਨਾ ਲਾਓ" (dry-footing); "ਥੱਲਾ ਹੋਰ ਚੌੜਾ ਛੱਡੋ" = a wider unglazed band. Not ਪੈਰ. Native check.                  |
| low fire, mid fire, high fire   | ਲੋ ਫਾਇਰ, ਮਿਡ ਫਾਇਰ, ਹਾਈ ਫਾਇਰ                                 | Tier 1. No source (pawiki's "ਘੱਟ ਅੱਗ ਵਾਲੇ" for low-fired). Nouns and adjectives ("ਮਿਡ-ਫਾਇਰ ਗਲੇਜ਼"). Never add a cone the English lacks.                                                  |
| raku                            | ਰਾਕੂ                                                        | Tier 1. m. Bhoomi ("Raku Clay", "Frit 1007 Transparent Crackle & Raku"). No Punjabi source.                                                                                              |

### 2.4 Kilns, cones and firing

| English                                                                     | Punjabi                                                           | Notes                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| electric kiln, gas kiln, manual kiln                                        | ਇਲੈਕਟ੍ਰਿਕ ਕਿਲਨ, ਗੈਸ ਕਿਲਨ, ਹੱਥ ਨਾਲ ਚਲਾਇਆ ਜਾਣ ਵਾਲਾ ਕਿਲਨ             | Tier 1. m. Bhoomi's menu "Kilns"; ਭੱਠੀ at first use per section (Choices). Never ਮੈਨੂਅਲ ਕਿਲਨ. Native check.                                                                                                 |
| firing, fire (verb), load                                                   | ਫਾਇਰਿੰਗ; ਪਕਾਉਣਾ; ਲੋਡ                                              | Tier 1 and 4. ਫਾਇਰਿੰਗ f.; ਪਕਾਉਣਾ as pawiki writes it ("ਭਾਂਡੇ ਪਕਾਉਂਦੇ ਹਨ"): "ਕੋਨ 6 ਤੱਕ ਪਕਾਓ". "ਇੱਕ ਫਾਇਰਿੰਗ" = one load fired; loading, unloading → ਕਿਲਨ ਭਰਨਾ (pawiki's ਚਿਣਨਾ), ਕਿਲਨ ਖਾਲੀ ਕਰਨਾ. Native check. |
| kiln shelf (shelf)                                                          | ਕਿਲਨ ਸ਼ੈਲਫ਼ (ਸ਼ੈਲਫ਼)                                              | Tier 1. f. No source; Native check on the gender. "ਸ਼ੈਲਫ਼" also means the materials on hand (2.8).                                                                                                          |
| element                                                                     | ਐਲੀਮੈਂਟ                                                           | Tier 1. m. No source. Chemical elements in the Materials form are ਤੱਤ (pawiki "ਰਸਾਇਣਕ ਤੱਤ").                                                                                                                |
| cone (pyrometric cone)                                                      | ਕੋਨ (ਸ਼ੰਕੂ)                                                       | **show English**. Tier 1. m. Bhoomi and Clay Station sell "Orton Cones". Not ਕੋਣ (an angle) or ਕੋਨਾ (a corner): see Cones. Not an ice-cream cone.                                                           |
| cone number, cone chart                                                     | ਕੋਨ ਨੰਬਰ, ਕੋਨ ਚਾਰਟ                                                | Tier 1. m. No source. 022 to 42; leading zeros kept. Orton's chart.                                                                                                                                         |
| self-supporting, large and small (junior) cones, bars                       | ਸੈਲਫ਼-ਸਪੋਰਟਿੰਗ ਕੋਨ; ਵੱਡੇ ਅਤੇ ਛੋਟੇ (ਜੂਨੀਅਰ) ਕੋਨ; ਬਾਰ               | Tier 1. m. No source (Indian shops' "Self-supporting cones", "Large Cone 6").                                                                                                                               |
| witness cone                                                                | ਵਿਟਨੈੱਸ ਕੋਨ                                                       | **show English**. Tier 1. m. No source.                                                                                                                                                                     |
| cone pack                                                                   | ਕੋਨ ਪੈਕ                                                           | **show English**. Tier 1. m. No source.                                                                                                                                                                     |
| guide cone, firing cone, guard cone                                         | ਗਾਈਡ ਕੋਨ, ਫਾਇਰਿੰਗ ਕੋਨ, ਗਾਰਡ ਕੋਨ                                   | Tier 1. m. No source. ਗਾਈਡ is part of the cone's name, not the app's guides.                                                                                                                                |
| heatwork                                                                    | ਹੀਟਵਰਕ (ਤਾਪ ਅਤੇ ਸਮੇਂ ਦਾ ਕੁੱਲ ਅਸਰ)                                 | **show English**. Tier 1. m. No source.                                                                                                                                                                     |
| heating rate (rate, climb), peak                                            | ਤਾਪ ਵਧਣ ਦੀ ਦਰ (ਦਰ); ਪੀਕ (ਸਭ ਤੋਂ ਵੱਧ ਤਾਪ)                          | Tier 4. f. (ਦਰ). No source. Chart columns "ਹੌਲੀ", "ਦਰਮਿਆਨੀ", "ਤੇਜ਼"; log field "ਦਰ".                                                                                                                        |
| ramp                                                                        | ਰੈਂਪ                                                              | **show English**. Tier 1. m. No source. Log field "ਰੈਂਪ".                                                                                                                                                   |
| hold (soak)                                                                 | ਹੋਲਡ (ਇੱਕੋ ਤਾਪ ਉੱਤੇ ਰੱਖਣਾ)                                        | **show English**. Tier 1. m. No source. "10 ਮਿੰਟ ਦਾ ਹੋਲਡ". Not ਭਿਉਣਾ (soaking in water).                                                                                                                    |
| schedule (firing schedule, program, preset, segment)                        | ਫਾਇਰਿੰਗ ਸ਼ਡਿਊਲ (ਪ੍ਰੋਗਰਾਮ, ਪ੍ਰੀਸੈੱਟ, ਸੈਗਮੈਂਟ)                      | Tier 1. m. No source. Preset names stay as on the controller ("Slow Bisque"). Log field "ਸੈਗਮੈਂਟ".                                                                                                          |
| controller                                                                  | ਕੰਟਰੋਲਰ                                                           | Tier 1. m. No source. Setting: "ਤਾਪ ਅਨੁਸਾਰ, ਕਿਲਨ ਕੰਟਰੋਲਰ ਦੇ ਪ੍ਰੋਗਰਾਮ ਵਾਂਗ".                                                                                                                                 |
| cone offset (offset)                                                        | ਕੋਨ ਆਫ਼ਸੈੱਟ                                                       | Tier 1. m. No source.                                                                                                                                                                                       |
| kiln sitter (Kiln-Sitter, sitter)                                           | ਕਿਲਨ ਸਿਟਰ (Kiln-Sitter)                                           | **show English**. Tier 1. m. Kiln-Sitter is Dawson's trademark, kept in Latin. Not a babysitter.                                                                                                            |
| sensing rod, claw, weight, trigger plate, cone supports, tube, firing gauge | ਸੈਂਸਿੰਗ ਰਾਡ, ਕਲਾਅ, ਵੇਟ, ਟ੍ਰਿਗਰ ਪਲੇਟ, ਕੋਨ ਸਪੋਰਟ, ਟਿਊਬ, ਫਾਇਰਿੰਗ ਗੇਜ | Tier 1. No source; the parts as a Kiln-Sitter manual names them. The sitter's weight is "ਵੇਟ (ਭਾਰ)".                                                                                                        |
| limit timer                                                                 | ਲਿਮਿਟ ਟਾਈਮਰ                                                       | Tier 1. m. No source.                                                                                                                                                                                       |
| infinite switch (Off, Low, Medium, High)                                    | ਇਨਫ਼ਿਨਿਟ ਸਵਿੱਚ (Off, Low, Medium, High)                           | Tier 1. m. No source. The positions are the labels printed on the switch, kept in Latin; Native check.                                                                                                      |
| pyrometer, thermocouple                                                     | ਪਾਇਰੋਮੀਟਰ; ਥਰਮੋਕਪਲ                                                | Tier 1. m. No source. Log fields "ਪ੍ਰੋਬ {n}".                                                                                                                                                               |
| peephole (spy hole)                                                         | ਪੀਪਹੋਲ (ਅੰਦਰ ਵੇਖਣ ਵਾਲਾ ਛੇਕ)                                       | Tier 1. m. No source. Log field "ਪੀਪਹੋਲ".                                                                                                                                                                   |
| vent, downdraft vent, hood vent                                             | ਵੈਂਟ; ਡਾਊਨਡ੍ਰਾਫ਼ਟ ਵੈਂਟ; ਹੁੱਡ ਵੈਂਟ                                 | Tier 1. m. No source. "ਕਿਲਨ ਨੂੰ ਵੈਂਟ ਕਰੋ"; a vent hole is "ਵੈਂਟ ਦਾ ਛੇਕ".                                                                                                                                    |
| candling (preheat)                                                          | ਕੈਂਡਲਿੰਗ (ਨਮੀ ਕੱਢਣ ਲਈ ਹਲਕਾ ਸੇਕ)                                   | **show English**. Tier 1. f. No source. The "mirror test" → "ਸ਼ੀਸ਼ੇ ਵਾਲੀ ਜਾਂਚ" (ਸ਼ੀਸ਼ਾ, a mirror, only here).                                                                                               |
| burnout                                                                     | ਬਰਨਆਊਟ (ਕਾਰਬਨ ਅਤੇ ਜੈਵਿਕ ਪਦਾਰਥ ਸੜਨਾ)                               | Tier 1. m. No source. "ਅਧੂਰਾ ਬਰਨਆਊਟ".                                                                                                                                                                       |
| red heat, dull red                                                          | ਲਾਲ ਸੇਕ; ਮੱਧਮ ਲਾਲ ਸੇਕ                                             | Tier 4. m. No source.                                                                                                                                                                                       |
| quartz inversion                                                            | ਕੁਆਰਟਜ਼ ਇਨਵਰਜ਼ਨ                                                   | **show English**. Tier 1. m. No source. At 573 °C (1063 °F).                                                                                                                                                |
| oxidation                                                                   | ਆਕਸੀਡੇਸ਼ਨ (ਆਕਸੀਕਰਨ)                                               | **show English**. Tier 1. f. pawiki ("ਆਕਸੀਕਰਨ"). "ਆਕਸੀਡੇਸ਼ਨ ਫਾਇਰਿੰਗ".                                                                                                                                       |
| reduction                                                                   | ਰਿਡਕਸ਼ਨ (ਅਣ-ਆਕਸੀਕਰਨ)                                              | **show English**. Tier 1. f. pawiki ("ਰਿਡੱਕਸ਼ਨ (ਅਣਾਆਕਸੀਕਰਨ)", whose ਅਣਾ- reads as a typo for ਅਣ-). Never ਕਟੌਤੀ or ਘਾਟਾ (Pitfalls). Native check on the bracket.                                             |
| atmosphere                                                                  | ਕਿਲਨ ਦਾ ਮਾਹੌਲ                                                     | Tier 4. m. No source. Log field "ਮਾਹੌਲ".                                                                                                                                                                    |
| drop-and-hold                                                               | ਡ੍ਰਾਪ-ਐਂਡ-ਹੋਲਡ                                                    | **show English**. Tier 1. m. No source.                                                                                                                                                                     |
| slow cooling (slow cool)                                                    | ਸਲੋ ਕੂਲਿੰਗ (ਹੌਲੀ-ਹੌਲੀ ਠੰਢਾ ਕਰਨਾ)                                  | Tier 1. f. No source (pawiki "ਤੇਜ਼ ਕੂਲਿੰਗ").                                                                                                                                                                |
| underfired, overfired                                                       | ਘੱਟ ਪੱਕਿਆ; ਵੱਧ ਪੱਕਿਆ                                              | Tier 4. No source. Never ਕੱਚਾ (unfired).                                                                                                                                                                    |
| kiln wash                                                                   | ਕਿਲਨ ਵਾਸ਼                                                         | Tier 1. m. No source. Not washing.                                                                                                                                                                          |
| stilt                                                                       | ਸਟਿਲਟ                                                             | Tier 1. m. No source.                                                                                                                                                                                       |
| cookie                                                                      | ਕੁਕੀ (ਤੁਪਕੇ ਰੋਕਣ ਵਾਲੀ ਬਿਸਕ ਦੀ ਟਿੱਕੀ)                              | Tier 1. f. No source. ਕੁਕੀ is also a biscuit (and a web cookie, MS 4.1.15): the bracket at first use.                                                                                                       |
| Seger cones, Staffordshire cones, Bullers rings, Holdcroft bars             | ਸੇਗਰ ਕੋਨ, ਸਟੈਫ਼ਰਡਸ਼ਾਇਰ ਕੋਨ, ਬੁਲਰਜ਼ ਰਿੰਗ, ਹੋਲਡਕ੍ਰਾਫ਼ਟ ਬਾਰ          | Never converted to Orton numbers.                                                                                                                                                                           |
| Damper, Primary Air, Secondary Air, Burner, Pilots, Blower                  | ਡੈਂਪਰ, ਪ੍ਰਾਇਮਰੀ ਏਅਰ, ਸੈਕੰਡਰੀ ਏਅਰ, ਬਰਨਰ, ਪਾਇਲਟ, ਬਲੋਅਰ              | Tier 1. Firing-log fields. "ਪਾਇਲਟ" are pilot flames, not people.                                                                                                                                            |
| Ox Probe                                                                    | ਆਕਸੀਜਨ ਪ੍ਰੋਬ                                                      | Tier 1. m.                                                                                                                                                                                                  |
| Draw Tile                                                                   | ਡ੍ਰਾ ਟਾਈਲ                                                         | Tier 1. f. No source; a test piece pulled out during the firing.                                                                                                                                            |
| Delta, Temp Diff, Cones Top, Cones Bottom                                   | ਡੈਲਟਾ, ਤਾਪ ਫ਼ਰਕ, ਉੱਪਰਲੇ ਕੋਨ, ਹੇਠਲੇ ਕੋਨ                            | Tier 1 and 4. "ਉੱਪਰਲੇ/ਹੇਠਲੇ" is the place in the kiln, never a cone hotter or cooler.                                                                                                                       |
| Salt, Soda, Sawdust                                                         | ਲੂਣ, ਸੋਡਾ, ਬੂਰਾ                                                   | Tier 4. pawiki ("ਲੱਕੜਾਂ ਦਾ ਬੂਰਾ", for the village kiln). "ਸੋਡਾ" here is a soda firing, not Na₂O.                                                                                                            |
| Ring {n}                                                                    | ਰਿੰਗ {n}                                                          | A Bullers (pyrometric) ring reading, not a jewellery ring (ਮੁੰਦਰੀ, ਛੱਲਾ).                                                                                                                                   |
| manual (a kiln's, controller's or sitter's)                                 | ਮੈਨੂਅਲ (ਕਿਲਨ, ਕੰਟਰੋਲਰ ਜਾਂ ਸਿਟਰ ਦਾ)                                | Tier 1. m. No source. The app's guides are "ਗਾਈਡ": another word (Pitfalls).                                                                                                                                 |

### 2.5 Defects and glaze fit

| English                     | Punjabi                                          | Notes                                                                                                                                                |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze fit (fit)             | ਗਲੇਜ਼ ਫ਼ਿੱਟ (ਗਲੇਜ਼ ਅਤੇ ਬਾਡੀ ਦਾ ਮੇਲ)              | **show English**. Tier 1. m. No source. Not fitness or a seizure: "ਤੁਹਾਡੀ ਕਲੇ ਬਾਡੀ ਉੱਤੇ ਮਸਾਂ ਹੀ ਫ਼ਿੱਟ ਹੋਇਆ". "Over-compressed" → "ਲੋੜ ਤੋਂ ਵੱਧ ਦਬਿਆ". |
| defect                      | ਨੁਕਸ                                             | Tier 4. m. No source.                                                                                                                                |
| crazing (craze)             | ਕ੍ਰੇਜ਼ਿੰਗ (ਵਾਲਾਂ ਵਰਗੀਆਂ ਬਰੀਕ ਤਰੇੜਾਂ ਦਾ ਜਾਲ)      | **show English**. Tier 1. f. No source; Native check. Not "crazy".                                                                                   |
| crackle                     | ਕ੍ਰੈਕਲ                                           | Tier 1. m. Bhoomi ("Transparent Crackle"). Crazing made on purpose (raku).                                                                           |
| shivering                   | ਸ਼ਿਵਰਿੰਗ (ਕਿਨਾਰਿਆਂ ਤੋਂ ਗਲੇਜ਼ ਦੀਆਂ ਪੇਪੜੀਆਂ ਉੱਡਣਾ) | **show English**. Tier 1. f. No source; Native check. Not shivering with cold (ਕੰਬਣਾ). The flakes are sharp.                                         |
| crawling (crawl)            | ਕ੍ਰਾਲਿੰਗ (ਗਲੇਜ਼ ਦਾ ਸੁੰਗੜਨਾ)                      | **show English**. Tier 1. f. No source; Native check. The home-safety guide's crawling babies → "ਰਿੜ੍ਹਦੇ ਬੱਚੇ".                                      |
| pinholing (pinholes)        | ਪਿਨਹੋਲ (ਸੂਈ ਜਿੰਨੇ ਛੇਕ)                           | **show English**. Tier 1. m. No source; Native check.                                                                                                |
| blistering (blisters)       | ਬਲਿਸਟਰਿੰਗ (ਛਾਲੇ)                                 | Tier 1. f. No source.                                                                                                                                |
| running (run, runny)        | ਗਲੇਜ਼ ਦਾ ਵਗਣਾ (ਵਗਣ ਵਾਲਾ)                         | Tier 4. No source. Not running as in operating ("ਵੈਂਟ ਚੱਲ ਰਿਹਾ ਹੈ"): both occur.                                                                     |
| devitrification             | ਡੀਵਿਟ੍ਰੀਫ਼ਿਕੇਸ਼ਨ (ਠੰਢਾ ਹੁੰਦਿਆਂ ਕ੍ਰਿਸਟਲ ਬਣਨਾ)     | **show English**. Tier 1. f. No source.                                                                                                              |
| dunting                     | ਡੰਟਿੰਗ (ਤਰੇੜ)                                    | **show English**. Tier 1. f. No source; Native check. A crack through the pot from heating or cooling.                                               |
| leaching (leach, leachable) | ਲੀਚਿੰਗ (ਧਾਤਾਂ ਦਾ ਰਿਸਣਾ)                          | **show English**. Tier 1. f. No source; Native check. Metals dissolving out of a fired glaze into food or drink.                                     |
| specks                      | ਕਾਲੇ ਧੱਬੇ                                        | Tier 4. m. No source.                                                                                                                                |
| milky, clouding             | ਦੁੱਧੀਆ; ਧੁੰਦਲਾਪਣ                                 | Tier 4. No source.                                                                                                                                   |
| dry, chalky                 | ਖੁਰਦਰਾ, ਚਾਕ ਵਰਗਾ                                 | Tier 4. No source.                                                                                                                                   |
| breaks (over edges)         | ਕਿਨਾਰਿਆਂ ਉੱਤੇ ਰੰਗ ਬਦਲਣਾ (ਬ੍ਰੇਕ)                  | Tier 4. No source. Not ਟੁੱਟਣਾ.                                                                                                                       |
| flashing (flash)            | ਫ਼ਲੈਸ਼ਿੰਗ                                        | Tier 1. f. No source. Not a camera flash.                                                                                                            |
| thermal shock               | ਥਰਮਲ ਸ਼ਾਕ (ਅਚਾਨਕ ਤਾਪ ਬਦਲਣ ਦਾ ਝਟਕਾ)               | Tier 1. m. No source.                                                                                                                                |

### 2.6 Making and applying glaze

| English                                | Punjabi                                                 | Notes                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| batch                                  | ਬੈਚ                                                     | Tier 1. m. No source. "ਬੈਚ ਅਨੁਸਾਰ", "ਬੈਚ ਦਾ ਭਾਰ", "ਬੈਚ ਦਾ ਆਕਾਰ", "ਬੈਚ ਸੂਚੀ". A supplier's run: "ਬੈਚ ਤੋਂ ਬੈਚ".                                                                                                       |
| batch recipe                           | ਬੈਚ ਰੈਸਿਪੀ                                              | Tier 1. f. No source. Never ਫ਼ਾਰਮੂਲਾ or ਨੁਸਖ਼ਾ.                                                                                                                                                                     |
| base (base glaze), on top              | ਬੇਸ ਗਲੇਜ਼ (ਬੇਸ); ਬੇਸ ਤੋਂ ਉੱਪਰ                           | Tier 1. m. No source. Not a chemical base (ਖ਼ਾਰ). "ਬੇਸ ਫ਼ਰਿਟ"; UI "ਬੇਸ ਤੋਂ ਉੱਪਰ", "ਬੇਸ ਦਾ %".                                                                                                                       |
| percent, parts (parts by weight)       | ਪ੍ਰਤੀਸ਼ਤ, ਹਿੱਸੇ (ਭਾਰ ਅਨੁਸਾਰ ਹਿੱਸੇ)                      | Tier 4. pawiki ("30 ਪ੍ਰਤੀਸ਼ਤ"). UI "ਬੇਸ ਦਾ %", "ਹਿੱਸੇ", "ਗ੍ਰਾਮ"; column "ਹਿੱਸੇ".                                                                                                                                    |
| scale (weighing)                       | ਤੱਕੜੀ                                                   | Tier 4. f. No source; the everyday Punjabi word (a digital one: "ਡਿਜੀਟਲ ਤੱਕੜੀ"). "0.01 g ਤੱਕ ਪੜ੍ਹਨ ਵਾਲੀ ਤੱਕੜੀ". Scaling a recipe is another word (2.8). Native check (ਕੰਡਾ is the alternative).                     |
| tare                                   | ਟੇਅਰ (ਖਾਲੀ ਭਾਂਡੇ ਸਮੇਤ ਜ਼ੀਰੋ ਕਰਨਾ)                       | Tier 1. m. No source.                                                                                                                                                                                               |
| slurry                                 | ਸਲਰੀ (ਗਲੇਜ਼ ਦਾ ਪਾਣੀ ਵਾਲਾ ਘੋਲ)                           | **show English**. Tier 1. f. No source.                                                                                                                                                                             |
| slake                                  | ਬਿਨਾਂ ਹਿਲਾਏ ਭਿੱਜਣ ਦੇਣਾ                                  | Tier 4. No source. Not quenching thirst.                                                                                                                                                                            |
| sieve (UK also: lawn)                  | ਛਾਨਣੀ                                                   | Tier 4. f. No source; the everyday Punjabi word (Hindi छलनी differs). To sieve ਛਾਣਨਾ. "lawn" is not grass.                                                                                                          |
| mesh                                   | ਮੈੱਸ਼                                                   | Tier 1. m. Clay Station's grades ("G-325"). "80 ਮੈੱਸ਼". Mesh numbers never translated.                                                                                                                              |
| specific gravity (SG)                  | ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ (ਸਾਪੇਖੀ ਘਣਤਾ)                        | **show English**. Tier 1 and 3. f. No source (Choices). Relative density, a ratio with no unit (1.45), never ਘਣਤਾ alone (g/cm³) or a litre weight. `guides.density.sg`: "ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ {value}". Native check. |
| pint weight                            | ਪਿੰਟ ਭਾਰ                                                | Tier 1. m. No source. An imperial pint (568 ml). Setting "ਪਿੰਟ ਭਾਰ, ਇੱਕ ਇੰਪੀਰੀਅਲ ਪਿੰਟ ਵਿੱਚ ਔਂਸ".                                                                                                                    |
| degrees Baumé (°Bé), hydrometer        | ਬੋਮੇ ਡਿਗਰੀ (°Bé); ਹਾਈਡ੍ਰੋਮੀਟਰ                           | Tier 3. No source. Setting "ਬੋਮੇ ਡਿਗਰੀ, ਹਾਈਡ੍ਰੋਮੀਟਰ ਤੋਂ".                                                                                                                                                           |
| density (glaze density)                | ਗਾੜ੍ਹਾਪਣ (ਗਲੇਜ਼ ਦਾ ਗਾੜ੍ਹਾਪਣ)                            | Tier 4. m. No source; Native check. Never ਘਣਤਾ for a glaze. Setting "ਗਲੇਜ਼ ਦਾ ਗਾੜ੍ਹਾਪਣ".                                                                                                                            |
| thixotropy (thixotropic, gelled)       | ਥਿਕਸੋਟ੍ਰਾਪੀ (ਥਿਕਸੋਟ੍ਰਾਪਿਕ, ਜੈੱਲ ਵਰਗਾ)                   | **show English**. Tier 1. f. No source.                                                                                                                                                                             |
| flocculant (flocculate)                | ਫ਼ਲਾਕੂਲੈਂਟ (ਫ਼ਲਾਕੂਲੇਟ ਕਰਨਾ)                             | **show English**. Tier 1. m. No source.                                                                                                                                                                             |
| deflocculant                           | ਡੀਫ਼ਲਾਕੂਲੈਂਟ                                            | **show English**. Tier 1. m. No source.                                                                                                                                                                             |
| Epsom salts                            | ਐਪਸਮ ਸਾਲਟ                                               | Tier 2. m. No source. Magnesium sulfate.                                                                                                                                                                            |
| CMC gum (gum, binder, brushing medium) | CMC ਗੂੰਦ (ਗੂੰਦ, ਬਾਈਂਡਰ, ਬਰੱਸ਼ਿੰਗ ਮੀਡੀਅਮ)                | Tier 1 and 4. f. (ਗੂੰਦ). No source. "CMC" kept.                                                                                                                                                                     |
| suspension, settle, hard-panning       | ਪਾਣੀ ਵਿੱਚ ਤੈਰਦੇ ਰਹਿਣਾ; ਹੇਠਾਂ ਬੈਠਣਾ; ਥੱਲੇ ਸਖ਼ਤ ਪਰਤ ਜੰਮਣਾ | Tier 4. No source.                                                                                                                                                                                                  |
| dipping, pouring, brushing, spraying   | ਡੁਬੋਣਾ, ਡੋਲ੍ਹਣਾ, ਬੁਰਸ਼ ਨਾਲ ਲਾਉਣਾ, ਸਪ੍ਰੇ ਕਰਨਾ            | Tier 4. No source. "ਡੁਬੋਣ ਦਾ ਸਮਾਂ", "ਇੱਕ ਵਾਰ ਡੁਬੋਣਾ", "ਦੋ ਵਾਰ ਡੁਬੋਣਾ"; "dipping glaze" → "ਡਿੱਪਿੰਗ ਗਲੇਜ਼".                                                                                                           |
| coat (coating)                         | ਪਰਤ                                                     | Tier 4. f. pawiki ("ਮੋਟੀ ਜਿਹੀ ਪਰਤ ਚੜ੍ਹ ਜਾਂਦੀ ਹੈ", "ਆਕਸਾਈਡ-ਨਾਈਟਰਾਈਡ ਪਰਤ"). "ਪਰਤ ਪਤਲੀ ਰੱਖੋ", "ਦੋ ਜਾਂ ਤਿੰਨ ਪਰਤਾਂ". Not a garment.                                                                                      |
| wax resist                             | ਵੈਕਸ ਰਿਜ਼ਿਸਟ                                            | **show English**. Tier 1. m. No source.                                                                                                                                                                             |
| test tile                              | ਟੈਸਟ ਟਾਈਲ                                               | **show English**. Tier 1. f. No source (pawiki's "ਟਾਇਲਾਂ" for roof tiles). Plural ਟੈਸਟ ਟਾਈਲਾਂ.                                                                                                                      |
| line blend                             | ਲਾਈਨ ਬਲੈਂਡ                                              | **show English**. Tier 1. m. No source. Not a queue or a drawn line.                                                                                                                                                |
| triaxial blend                         | ਟ੍ਰਾਈਐਕਸੀਅਲ ਬਲੈਂਡ                                       | Tier 1. m. No source.                                                                                                                                                                                               |
| lot number                             | ਲਾਟ ਨੰਬਰ                                                | Tier 1. m. No source.                                                                                                                                                                                               |
| technical data sheet (TDS)             | ਤਕਨੀਕੀ ਡਾਟਾ ਸ਼ੀਟ (TDS)                                  | Tier 4. f. No source. Not the safety data sheet.                                                                                                                                                                    |

### 2.7 Health and safety

| English                                                               | Punjabi                                                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| dust                                                                  | ਧੂੜ                                                                    | Tier 4. f. The everyday word.                                                                                                                                                                                                                                                                                                                                                                                                  |
| respirable crystalline silica (RCS)                                   | ਸਾਹ ਰਾਹੀਂ ਅੰਦਰ ਜਾਣ ਵਾਲੀ ਕ੍ਰਿਸਟਲਿਨ ਸਿਲਿਕਾ (RCS)                         | **show English**. Tier 4. f. No Punjabi legal text read; explained once as "ਫੇਫੜਿਆਂ ਦੇ ਅੰਦਰ ਤੱਕ ਪਹੁੰਚਣ ਵਾਲੀ ਬਰੀਕ ਕ੍ਰਿਸਟਲਿਨ ਸਿਲਿਕਾ". Native check.                                                                                                                                                                                                                                                                              |
| crystalline silica, amorphous silica, cristobalite                    | ਕ੍ਰਿਸਟਲਿਨ ਸਿਲਿਕਾ, ਗੈਰ-ਕ੍ਰਿਸਟਲਿਨ ਸਿਲਿਕਾ, ਕ੍ਰਿਸਟੋਬੈਲਾਈਟ                  | Tier 3. pawiki ("ਕ੍ਰਿਸਟਲਿਨ", "ਗੈਰ-ਕ੍ਰਿਸਟਲਲਾਈਨ … ਆਕਾਰਹੀਣ ਠੋਸ" for glass). Native check on ਗੈਰ-ਕ੍ਰਿਸਟਲਿਨ.                                                                                                                                                                                                                                                                                                                        |
| silicosis, COPD                                                       | ਸਿਲੀਕੋਸਿਸ; COPD (ਫੇਫੜਿਆਂ ਦੀ ਲੰਮੀ ਰੁਕਾਵਟ ਵਾਲੀ ਬਿਮਾਰੀ)                   | Tier 4. m. Google suggest ("ਸਿਲੀਕੋਸਿਸ ਕੀ ਹੈ"). "ਫੇਫੜਿਆਂ ਦੀ ਗੰਭੀਰ, ਕਦੇ ਠੀਕ ਨਾ ਹੋਣ ਵਾਲੀ ਬਿਮਾਰੀ". COPD kept with a Punjabi gloss once; Native check on the gloss.                                                                                                                                                                                                                                                                 |
| exposure limit, action level                                          | ਸੰਪਰਕ ਸੀਮਾ; ਐਕਸ਼ਨ ਲੈਵਲ (ਕਾਰਵਾਈ ਦਾ ਪੱਧਰ)                                | Tier 4. f.; m. No source (Law in India). Native check.                                                                                                                                                                                                                                                                                                                                                                         |
| respirator                                                            | ਰੈਸਪੀਰੇਟਰ ਮਾਸਕ (ਰੈਸਪੀਰੇਟਰ)                                             | Tier 4. m. Google suggest ("mask n95 respirator", in Latin). ਰੈਸਪੀਰੇਟਰ ਮਾਸਕ at first use in a section, then ਰੈਸਪੀਰੇਟਰ. Not a ਵੈਂਟੀਲੇਟਰ; not a surgical, cloth or "nuisance dust" mask (ਕੱਪੜੇ ਦਾ ਮਾਸਕ, ਸਰਜੀਕਲ ਮਾਸਕ).                                                                                                                                                                                                            |
| N95, P100, FFP2, FFP3, P2, P3                                         | N95, P100, FFP2, FFP3, P2, P3                                          | Never translated. India: FFP1, FFP2, FFP3 under IS 9473:2002 (Regions).                                                                                                                                                                                                                                                                                                                                                        |
| half mask, powered respirator (PAPR)                                  | ਹਾਫ਼ ਮਾਸਕ; ਪਾਵਰਡ ਰੈਸਪੀਰੇਟਰ (PAPR)                                      | Tier 4. m. No source.                                                                                                                                                                                                                                                                                                                                                                                                          |
| fit test                                                              | ਫ਼ਿੱਟ ਟੈਸਟ (ਮਾਸਕ ਚਿਹਰੇ ਉੱਤੇ ਠੀਕ ਬੈਠਦਾ ਹੈ ਜਾਂ ਨਹੀਂ ਦੀ ਜਾਂਚ)             | Tier 1. m. No source.                                                                                                                                                                                                                                                                                                                                                                                                          |
| HEPA vacuum (dust Class M)                                            | HEPA ਵੈਕਿਊਮ ਕਲੀਨਰ; dust Class M ਧੂੜ ਦੀ ਸ਼੍ਰੇਣੀ Class M                 | Tier 4. m. "HEPA" and "Class M" kept; never the English "dust" left in.                                                                                                                                                                                                                                                                                                                                                        |
| wet cleaning (wet mop, wet-wipe), dry sweeping                        | ਗਿੱਲੀ ਸਫ਼ਾਈ (ਗਿੱਲਾ ਪੋਚਾ, ਗਿੱਲੇ ਕੱਪੜੇ ਨਾਲ ਪੂੰਝਣਾ); ਸੁੱਕਾ ਝਾੜੂ           | Tier 4. No source; everyday words.                                                                                                                                                                                                                                                                                                                                                                                             |
| local exhaust ventilation (LEV)                                       | ਲੋਕਲ ਐਗਜ਼ੌਸਟ ਵੈਂਟੀਲੇਸ਼ਨ (LEV)                                          | **show English**. Tier 1. f. No source; explained once as "ਧੂੜ ਜਿੱਥੇ ਬਣਦੀ ਹੈ ਉੱਥੇ ਹੀ ਖਿੱਚ ਲੈਣ ਵਾਲਾ ਹੁੱਡ ਅਤੇ ਪੱਖਾ".                                                                                                                                                                                                                                                                                                             |
| make-up air                                                           | ਮੇਕ-ਅੱਪ ਏਅਰ (ਬਾਹਰੋਂ ਆਉਣ ਵਾਲੀ ਤਾਜ਼ੀ ਹਵਾ)                                | Tier 1. f. No source.                                                                                                                                                                                                                                                                                                                                                                                                          |
| spray booth (water-backed booth), overspray                           | ਸਪ੍ਰੇ ਬੂਥ (ਪਾਣੀ ਵਾਲਾ ਬੂਥ); ਓਵਰਸਪ੍ਰੇ                                    | Tier 1. m. No source.                                                                                                                                                                                                                                                                                                                                                                                                          |
| fumes (kiln fumes)                                                    | ਧੂੰਆਂ ਅਤੇ ਗੈਸਾਂ (ਕਿਲਨ ਵਿੱਚੋਂ ਨਿਕਲਦੀਆਂ ਗੈਸਾਂ)                           | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                                                             |
| carbon monoxide (CO), CO alarm                                        | ਕਾਰਬਨ ਮੋਨੋਆਕਸਾਈਡ (CO); CO ਅਲਾਰਮ                                        | Tier 3. f. pawiki ("ਕਾਰਬਨ ਮੋਨੋਆਕਸਾਈਡ … ਰੰਗਹੀਨ, ਗੰਧਹੀਨ … ਗੈਸ"). "ਜੋ ਨਾ ਦਿਸਦੀ ਹੈ ਅਤੇ ਨਾ ਹੀ ਇਸ ਦੀ ਗੰਧ ਆਉਂਦੀ ਹੈ".                                                                                                                                                                                                                                                                                                                  |
| metal fume fever, manganism                                           | ਮੈਟਲ ਫ਼ਿਊਮ ਫ਼ੀਵਰ (ਧਾਤ ਦੇ ਧੂੰਏਂ ਨਾਲ ਹੋਣ ਵਾਲਾ ਬੁਖ਼ਾਰ); ਮੈਂਗਨੀਜ਼ ਦਾ ਜ਼ਹਿਰ | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                                                             |
| safety data sheet (SDS; older: MSDS)                                  | ਸੇਫ਼ਟੀ ਡਾਟਾ ਸ਼ੀਟ (SDS; ਪੁਰਾਣਾ ਨਾਂ MSDS)                                | Tier 4. f. No source; India's chemical rules say "Material Safety Data Sheet" in English. Native check.                                                                                                                                                                                                                                                                                                                        |
| GHS, pictogram, signal word, hazard statement                         | GHS; ਚਿੱਤਰ-ਚਿੰਨ੍ਹ; ਸੰਕੇਤ ਸ਼ਬਦ; ਖ਼ਤਰਾ ਕਥਨ                               | Tier 4. No Punjabi GHS text read; Native check. Signal words "ਖ਼ਤਰਾ" (Danger) and "ਚੇਤਾਵਨੀ" (Warning); H-codes kept. H302 ਨਿਗਲਣ ਉੱਤੇ ਨੁਕਸਾਨਦੇਹ; H301 ਨਿਗਲਣ ਉੱਤੇ ਜ਼ਹਿਰੀਲਾ; H360 ਜਣਨ ਸਮਰੱਥਾ ਜਾਂ ਗਰਭ ਵਿਚਲੇ ਬੱਚੇ ਨੂੰ ਨੁਕਸਾਨ ਪਹੁੰਚਾ ਸਕਦਾ ਹੈ; H361 "suspected of damaging" → "…ਨੁਕਸਾਨ ਪਹੁੰਚਾਉਣ ਦਾ ਸ਼ੱਕ ਹੈ" (ਸ਼ੱਕ, never ਸਕਦਾ); H350 ਕੈਂਸਰ ਕਰ ਸਕਦਾ ਹੈ; H351 ਕੈਂਸਰ ਕਰਨ ਦਾ ਸ਼ੱਕ ਹੈ; H372 ਲੰਮੇ ਸੰਪਰਕ ਨਾਲ ਅੰਗਾਂ ਨੂੰ ਨੁਕਸਾਨ ਪਹੁੰਚਾਉਂਦਾ ਹੈ. |
| Not classified                                                        | ਵਰਗੀਕ੍ਰਿਤ ਨਹੀਂ                                                         | Tier 4. Not ਹਾਨੀ-ਰਹਿਤ (harmless). No official Punjabi text read.                                                                                                                                                                                                                                                                                                                                                               |
| IARC Group 1, 2A, 2B, 3 (carcinogenic)                                | IARC ਗਰੁੱਪ 1, 2A, 2B, 3 (ਕੈਂਸਰਕਾਰੀ)                                    | Tier 4. No source (pawiki's "ਗਰੁੱਪ 14 ਤੱਤ" for the word ਗਰੁੱਪ). Group 1: "ਮਨੁੱਖਾਂ ਲਈ ਕੈਂਸਰਕਾਰੀ"; 2A: "ਮਨੁੱਖਾਂ ਲਈ ਸੰਭਵ ਤੌਰ ਉੱਤੇ ਕੈਂਸਰਕਾਰੀ".                                                                                                                                                                                                                                                                                     |
| toxic, harmful                                                        | ਜ਼ਹਿਰੀਲਾ; ਨੁਕਸਾਨਦੇਹ                                                    | Tier 4. pawiki ("ਜ਼ਹਿਰੀਲੇ ਮਾਦੇ", "ਨੁਕਸਾਨਦੇਹ ਪ੍ਰਭਾਵ"). "ਨਿਗਲਣ ਉੱਤੇ ਜ਼ਹਿਰੀਲਾ" is stronger than "ਨਿਗਲਣ ਉੱਤੇ ਨੁਕਸਾਨਦੇਹ": keep them apart.                                                                                                                                                                                                                                                                                          |
| soluble, insoluble, slightly soluble                                  | ਘੁਲਣਸ਼ੀਲ, ਅਘੁਲਣਸ਼ੀਲ, ਥੋੜ੍ਹਾ ਘੁਲਣਸ਼ੀਲ                                   | Tier 3. pawiki ("ਘੁਲਣਸ਼ੀਲ ਨਮਕ", "ਅਘੁਲਣਸ਼ੀਲ ਨਮਕ", "ਥੋੜ੍ਹਾ ਘੁਲਣਸ਼ੀਲ"), Google suggest ("ਘੁਲਣਸ਼ੀਲ meaning in english"). "ਪਾਣੀ (ਜਾਂ ਪੇਟ ਦੇ ਤੇਜ਼ਾਬ) ਵਿੱਚ ਘੁਲਣਸ਼ੀਲ". **Never ਪਿਘਲਣ ਵਾਲਾ (melting)** for soluble (Pitfalls).                                                                                                                                                                                                          |
| swallow (ingestion), breathe in (inhalation)                          | ਨਿਗਲਣਾ; ਸਾਹ ਰਾਹੀਂ ਅੰਦਰ ਲੈਣਾ                                            | Tier 4. pawiki ("ਨਿਗਲੇ ਜਾਣ ਉੱਤੇ"). Plain words, as the guides.                                                                                                                                                                                                                                                                                                                                                                 |
| acute, chronic                                                        | ਤੀਬਰ (ਇੱਕੋ ਵਾਰ ਵਿੱਚ); ਲੰਮੇ ਸਮੇਂ ਦਾ (ਹੌਲੀ-ਹੌਲੀ)                         | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                                                             |
| poison centre (poison line, poison control)                           | ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ                                                    | Tier 4. m. ਜ਼ਹਿਰ as pawiki ("ਜ਼ਹਿਰ ਜਾਂ ਵਿਹੁ"). India's: National Poisons Information Centre (NPIC), AIIMS New Delhi, 1800 116 117 (Regions; no Punjabi name found). A poison line is ਜ਼ਹਿਰ ਹੈਲਪਲਾਈਨ (see "poison line" below). Native check on the description.                                                                                                                                                                |
| blood lead test, blood lead reference value                           | ਖ਼ੂਨ ਵਿੱਚ ਲੈੱਡ ਦੀ ਜਾਂਚ; ਖ਼ੂਨ ਵਿੱਚ ਲੈੱਡ ਦਾ ਹਵਾਲਾ ਮੁੱਲ                   | Tier 4. No source. CDC's 3.5 µg/dL kept.                                                                                                                                                                                                                                                                                                                                                                                       |
| lead-free (leadless)                                                  | ਲੈੱਡ-ਰਹਿਤ                                                              | Tier 4. No source. Not the same as ਭੋਜਨ ਲਈ ਸੁਰੱਖਿਅਤ. Both English words → ਲੈੱਡ-ਰਹਿਤ.                                                                                                                                                                                                                                                                                                                                           |
| food safe (food-safe)                                                 | ਭੋਜਨ ਲਈ ਸੁਰੱਖਿਅਤ                                                       | **show English**. Tier 4. No source. In law: releases less lead and cadmium than the limits. ਸੁਰੱਖਿਅਤ is kept for "safe": Save is ਸੇਵ ਕਰੋ.                                                                                                                                                                                                                                                                                     |
| leach test (laboratory leach test, metal release test)                | ਲੀਚਿੰਗ ਟੈਸਟ (ਲੈਬ ਵਿੱਚ ਧਾਤਾਂ ਦੇ ਰਿਸਣ ਦੀ ਜਾਂਚ)                           | **show English**. Tier 1 and 4. No source. A test of the metals a fired piece releases; not narrowed to lead and cadmium. Codes kept.                                                                                                                                                                                                                                                                                          |
| liner glaze                                                           | ਲਾਈਨਰ ਗਲੇਜ਼                                                            | **show English**. Tier 1. m. No source.                                                                                                                                                                                                                                                                                                                                                                                        |
| contact dermatitis, barrier cream                                     | ਸੰਪਰਕ ਨਾਲ ਚਮੜੀ ਦੀ ਸੋਜ (ਕਾਂਟੈਕਟ ਡਰਮੇਟਾਈਟਿਸ); ਬੈਰੀਅਰ ਕਰੀਮ                | Tier 4. No source. "ਬੈਰੀਅਰ ਕਰੀਮ ਦਸਤਾਨਾ ਨਹੀਂ ਹੈ".                                                                                                                                                                                                                                                                                                                                                                               |
| infrared (IR), IR-rated welding glasses, shade 3                      | ਇਨਫ਼ਰਾਰੈੱਡ (IR); IR ਰੋਕਣ ਵਾਲੀ ਵੈਲਡਿੰਗ ਐਨਕ; ਸ਼ੇਡ 3                      | Tier 4. No source. Sunglasses (ਧੁੱਪ ਵਾਲੀ ਐਨਕ) and didymium glasses do not block it.                                                                                                                                                                                                                                                                                                                                            |
| combustible, clearance, dedicated circuit                             | ਜਲਣਸ਼ੀਲ; ਫ਼ਾਸਲਾ; ਵੱਖਰਾ ਸਰਕਟ                                            | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                                                             |
| emergency number; Emergency (a heading); calling the emergency number | ਐਮਰਜੈਂਸੀ ਨੰਬਰ; ਐਮਰਜੈਂਸੀ (heading); ਐਮਰਜੈਂਸੀ ਨੰਬਰ ਉੱਤੇ ਫ਼ੋਨ ਕਰਨਾ        | Tier 4. India's: 112 (Regions). "ਐਮਰਜੈਂਸੀ ਨੰਬਰ (112)" only where the English gives the number.                                                                                                                                                                                                                                                                                                                                 |
| 24/7, non-stop                                                        | 24/7 (24 ਘੰਟੇ, ਹਫ਼ਤੇ ਦੇ 7 ਦਿਨ)                                         | "24/7" has a 7: the numbers check needs it.                                                                                                                                                                                                                                                                                                                                                                                    |
| oxidiser (H272)                                                       | ਆਕਸੀਡਾਈਜ਼ਰ (H272)                                                      | Tier 3. m. No source.                                                                                                                                                                                                                                                                                                                                                                                                          |
| harmonised classification (EU)                                        | ਇੱਕਸਾਰ ਵਰਗੀਕਰਨ                                                         | Tier 4. m. No source. "EU ਦਾ ਇੱਕਸਾਰ ਵਰਗੀਕਰਨ".                                                                                                                                                                                                                                                                                                                                                                                  |
| nuisance dust                                                         | ਤੰਗ ਕਰਨ ਵਾਲੀ ਧੂੜ (“nuisance dust”)                                     | Tier 4. f. No source (safe-mixing). The English in brackets once, as the masks are labelled so.                                                                                                                                                                                                                                                                                                                                |
| dust mask                                                             | ਧੂੜ ਵਾਲਾ ਮਾਸਕ                                                          | Tier 4. m. No source (regions). "ਧੂੜ ਵਾਲੇ ਮਾਸਕ ਸ਼੍ਰੇਣੀ ਅਨੁਸਾਰ ਵਿਕਦੇ ਹਨ".                                                                                                                                                                                                                                                                                                                                                       |
| caustic                                                               | ਖੋਰਨ ਵਾਲਾ (ਕਾਸਟਿਕ)                                                     | Tier 4. No source (records). The bracket at first use.                                                                                                                                                                                                                                                                                                                                                                         |
| antidote                                                              | ਤੋੜ (ਐਂਟੀਡੋਟ)                                                          | Tier 4. m. No source (home-safety). "ਇਸ ਦਾ ਕੋਈ ਤੋੜ (ਐਂਟੀਡੋਟ) ਨਹੀਂ ਹੈ". Native check.                                                                                                                                                                                                                                                                                                                                           |
| lead frit                                                             | ਲੈੱਡ ਵਾਲਾ ਫ਼ਰਿਟ                                                        | **show English**. Tier 1 and 4. m. Bhoomi "Frit 1009 Lead Based". Lead-free frit ਲੈੱਡ-ਰਹਿਤ ਫ਼ਰਿਟ. A warning in capitals (LEAD FRIT) starts "ਸਾਵਧਾਨ:" (Register).                                                                                                                                                                                                                                                               |
| poison line (a phone line); poison centre (the body)                  | ਜ਼ਹਿਰ ਹੈਲਪਲਾਈਨ; ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ                                    | Tier 4. f.; m. One word each in every file: "call the poison line" → "ਜ਼ਹਿਰ ਹੈਲਪਲਾਈਨ ਉੱਤੇ ਫ਼ੋਨ ਕਰੋ"; "a poison center decides" → "ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ ਤੈਅ ਕਰਦਾ ਹੈ". The NPIC's description is ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ.                                                                                                                                                                                                             |
| fire extinguisher                                                     | ਅੱਗ ਬੁਝਾਊ ਯੰਤਰ                                                         | Tier 4. m. No source. "ABC ਅੱਗ ਬੁਝਾਊ ਯੰਤਰ". The fire service is ਫ਼ਾਇਰ ਬ੍ਰਿਗੇਡ (safety).                                                                                                                                                                                                                                                                                                                                        |

### 2.8 The app's own words

| English                                                                                | Punjabi                                                                                                                         | Notes                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recipe (Recipes)                                                                       | ਰੈਸਿਪੀ (ਰੈਸਿਪੀਆਂ)                                                                                                               | f. No source (Google suggest knows no Gurmukhi glaze search). "ਨਵੀਂ ਰੈਸਿਪੀ", "ਸੇਵ ਕੀਤੀ ਰੈਸਿਪੀ", "ਮੇਰੀਆਂ ਸੇਵ ਕੀਤੀਆਂ ਰੈਸਿਪੀਆਂ", "ਰੈਸਿਪੀ ਕੈਲਕੁਲੇਟਰ". Never ਫ਼ਾਰਮੂਲਾ or ਨੁਸਖ਼ਾ.                                                  |
| studio notebook (notebook)                                                             | ਸਟੂਡੀਓ ਨੋਟਬੁੱਕ (ਨੋਟਬੁੱਕ)                                                                                                        | f. "ਤੁਹਾਡੀ ਸਟੂਡੀਓ ਨੋਟਬੁੱਕ", "ਗਲੇਜ਼ ਨੋਟਬੁੱਕ".                                                                                                                                                                                 |
| material (Materials)                                                                   | ਸਮੱਗਰੀ (ਸਮੱਗਰੀਆਂ)                                                                                                               | f. "ਸਮੱਗਰੀ ਦਾ ਨਾਂ:", "ਸਮੱਗਰੀਆਂ ਜੋੜੋ", "ਸਮੱਗਰੀਆਂ ਵਾਲਾ ਪੰਨਾ". **Native check** (Choices, Plural forms).                                                                                                                        |
| My materials                                                                           | ਮੇਰੀਆਂ ਸਮੱਗਰੀਆਂ                                                                                                                 | f. pl. "ਸਰਵਰ ਉੱਤੇ ਮੇਰੀਆਂ ਸਮੱਗਰੀਆਂ:".                                                                                                                                                                                         |
| Standard (standard materials)                                                          | ਮਿਆਰੀ (ਮਿਆਰੀ ਸਮੱਗਰੀਆਂ)                                                                                                          | Tab "ਮਿਆਰੀ ({count})"; "ਮਿਆਰੀ ਸਮੱਗਰੀਆਂ:", "ਬਿਲਟ-ਇਨ ਸੂਚੀ", "ਲਾਇਬ੍ਰੇਰੀ". Not "ਆਮ".                                                                                                                                             |
| library                                                                                | ਲਾਇਬ੍ਰੇਰੀ                                                                                                                       | f. MS ("ਲਾਇਬ੍ਰੇਰੀ ਅਤੇ ਫੋਲਡਰ"). "ਤੁਹਾਡੇ ਖੇਤਰ ਵਿੱਚ ਵਿਕਣ ਵਾਲਾ ਕੋਈ ਲੈੱਡ-ਰਹਿਤ ਫ਼ਰਿਟ ਲਾਇਬ੍ਰੇਰੀ ਵਿੱਚ ਨਹੀਂ ਹੈ." Not a book library (ਪੁਸਤਕਾਲਾ). The About page's "shared library" is code.                                            |
| additive (Additives)                                                                   | ਐਡਿਟਿਵ (ਐਡਿਟਿਵ)                                                                                                                 | m. Nav "ਐਡਿਟਿਵ"; page "ਐਡਿਟਿਵ ਅਤੇ ਕਲਰੈਂਟ"; recipe "ਕਲਰੈਂਟ ਅਤੇ ਐਡਿਟਿਵ", "ਕਲਰੈਂਟ ਜਾਂ ਐਡਿਟਿਵ".                                                                                                                                  |
| amount (Amount)                                                                        | ਮਾਤਰਾ (ਮਾਤਰਾ)                                                                                                                   | f. pawiki ("ਪਦਾਰਥ ਦੀ ਮਾਤਰਾ"). Column "ਮਾਤਰਾ"; "ਮਾਤਰਾ ਲਿਖੋ (0 ਵੀ ਠੀਕ ਹੈ)."                                                                                                                                                    |
| Share                                                                                  | ਹਿੱਸਾ                                                                                                                           | m. Column: each material's percent of the batch. Not MS's ਸਾਂਝਾ ਕਰੋ (to share).                                                                                                                                              |
| To percent, To parts, Scale to a batch, Scale                                          | ਪ੍ਰਤੀਸ਼ਤ ਵਿੱਚ, ਹਿੱਸਿਆਂ ਵਿੱਚ, ਬੈਚ ਦੇ ਭਾਰ ਅਨੁਸਾਰ, ਪੈਮਾਨਾ ਬਦਲੋ                                                                     | "ਪੈਮਾਨਾ ਬਦਲੋ:". Resizing, not the ਤੱਕੜੀ.                                                                                                                                                                                     |
| Batch size, batch list, Weigh in, Weigh, Weighed, Running total, All together          | ਬੈਚ ਦਾ ਆਕਾਰ, ਬੈਚ ਸੂਚੀ, ਤੋਲ ਕੇ ਪਾਓ, ਤੋਲੋ, ਤੋਲਿਆ, ਹੁਣ ਤੱਕ ਦਾ ਜੋੜ, ਸਾਰੇ ਇਕੱਠੇ                                                      | "ਸਿਰਫ਼ ਬੈਚ ਸੂਚੀ: ਕੀ ਤੋਲਣਾ ਹੈ, ਨਿਸ਼ਾਨ ਲਾਉਣ ਲਈ ਖ਼ਾਨਿਆਂ ਨਾਲ".                                                                                                                                                                   |
| Unity formula (Unity)                                                                  | ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ (ਸੇਗਰ)                                                                                                            | m. "ਕਲਰੈਂਟ ਅਤੇ ਐਡਿਟਿਵ ਵੀ ਇਸ ਵਿੱਚ ਗਿਣੋ". Where the English names both ("unity molecular formula, also called the Seger formula"): "ਯੂਨਿਟੀ ਅਣਵੀ ਫ਼ਾਰਮੂਲਾ, ਜਿਸ ਨੂੰ ਸੇਗਰ ਫ਼ਾਰਮੂਲਾ ਵੀ ਕਹਿੰਦੇ ਹਨ".                                 |
| Wildcards                                                                              | ਹੋਰ ਆਕਸਾਈਡ                                                                                                                      | Column for oxides outside the three groups. Not ਤਾਸ਼ ਦੇ ਜੋਕਰ.                                                                                                                                                                |
| Compare                                                                                | ਤੁਲਨਾ ਕਰੋ                                                                                                                       | "ਦੋ ਰੈਸਿਪੀਆਂ ਦੀ ਤੁਲਨਾ ਕਰੋ", "ਪਹਿਲੀ ਰੈਸਿਪੀ", "ਦੂਜੀ ਰੈਸਿਪੀ", "ਬਦਲੋ", "ਇੱਕੋ ਜਿਹਾ".                                                                                                                                              |
| Save, Save and add next recipe, Save as a copy, Print                                  | ਸੇਵ ਕਰੋ; ਸੇਵ ਕਰੋ ਅਤੇ ਅਗਲੀ ਰੈਸਿਪੀ ਜੋੜੋ; ਕਾਪੀ ਵਜੋਂ ਸੇਵ ਕਰੋ; ਪ੍ਰਿੰਟ ਕਰੋ                                                            | Never ਸੁਰੱਖਿਅਤ ਕਰੋ (Choices). MS ("ਪ੍ਰਿੰਟ").                                                                                                                                                                                 |
| swap (Try modern materials and compare, Undo the swap)                                 | ਅਦਲਾ-ਬਦਲੀ (ਅੱਜ ਦੀਆਂ ਸਮੱਗਰੀਆਂ ਵਰਤ ਕੇ ਵੇਖੋ ਅਤੇ ਤੁਲਨਾ ਕਰੋ, ਅਦਲਾ-ਬਦਲੀ ਵਾਪਸ ਲਓ)                                                      | f. "ਅੱਜ ਦੀਆਂ ਸਮੱਗਰੀਆਂ ਨਾਲ ਬਦਲਿਆ".                                                                                                                                                                                            |
| like for like, gram for gram, one for one, pound for pound                             | ਜਿਉਂ ਦਾ ਤਿਉਂ; ਗ੍ਰਾਮ ਦੇ ਬਦਲੇ ਗ੍ਰਾਮ; ਇੱਕ ਦੇ ਬਦਲੇ ਇੱਕ; ਪੌਂਡ ਦੇ ਬਦਲੇ ਪੌਂਡ                                                           | Idioms: the sense, with words, not digits.                                                                                                                                                                                   |
| Suggest amounts and compare                                                            | ਮਾਤਰਾ ਸੁਝਾਓ ਅਤੇ ਤੁਲਨਾ ਕਰੋ                                                                                                       | "ਪੁਰਾਣੀਆਂ ਸਮੱਗਰੀਆਂ ਤੋਂ ਜੋ ਮਿਲਦਾ ਸੀ ਉਹ ਵਾਪਸ ਲਿਆਓ".                                                                                                                                                                            |
| Replace lead (Replace lead and compare)                                                | ਲੈੱਡ ਬਦਲੋ (ਲੈੱਡ ਬਦਲੋ ਅਤੇ ਤੁਲਨਾ ਕਰੋ)                                                                                             | "ਕੋਨ ਤੱਕ ਪਕਾਇਆ", "ਗਲੇਜ਼ ਦੁਬਾਰਾ ਬਣਾਓ", "ਰੰਗ ਲੈੱਡ-ਰਹਿਤ ਬੇਸ ਉੱਤੇ ਰੱਖੋ". Never ਸਿੱਕਾ ਬਦਲੋ (change the coin; Choices).                                                                                                            |
| Match with what I have (Match and compare)                                             | ਮੇਰੇ ਕੋਲ ਮੌਜੂਦ ਸਮੱਗਰੀ ਨਾਲ ਮਿਲਾਓ (ਮਿਲਾਓ ਅਤੇ ਤੁਲਨਾ ਕਰੋ)                                                                           | "ਤੁਹਾਡੇ ਕੋਲ ਜੋ ਹੈ ਉਸ ਤੋਂ ਬਣਾਓ".                                                                                                                                                                                              |
| materials on hand (the shelf)                                                          | ਮੇਰੇ ਕੋਲ ਮੌਜੂਦ ਸਮੱਗਰੀਆਂ (ਸ਼ੈਲਫ਼)                                                                                                | f. pl. "ਸ਼ੈਲਫ਼" is a figure of speech, not a kiln shelf. Server: "ਸ਼ੈਲਫ਼ ਵੱਧ ਤੋਂ ਵੱਧ {most} ਸਮੱਗਰੀਆਂ ਦੀ ਸੂਚੀ ਹੈ."                                                                                                            |
| Materials to try, Must use                                                             | ਵਰਤ ਕੇ ਵੇਖਣ ਲਈ ਸਮੱਗਰੀਆਂ; ਵਰਤਣੀ ਲਾਜ਼ਮੀ                                                                                           | "ਲਾਜ਼ਮੀ" here is the English's "must": the label's own word.                                                                                                                                                                 |
| Leave it out, Allow more, Add it, Use it instead, Work it out again, What to watch for | ਇਸ ਨੂੰ ਛੱਡ ਦਿਓ; ਹੋਰ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ; ਇਸ ਨੂੰ ਜੋੜੋ; ਇਸ ਦੀ ਥਾਂ ਇਹ ਵਰਤੋ; ਦੁਬਾਰਾ ਹਿਸਾਬ ਲਾਓ; ਕਿਸ ਗੱਲ ਦਾ ਧਿਆਨ ਰੱਖਣਾ ਹੈ                   |                                                                                                                                                                                                                              |
| Discontinued, Hard to get, Historical                                                  | ਬਣਨਾ ਬੰਦ; ਮਿਲਣਾ ਔਖਾ; ਪੁਰਾਣੀ                                                                                                     | "{year} ਤੋਂ ਬਣਨਾ ਬੰਦ", "{year} ਤੋਂ ਮਿਲਣਾ ਔਖਾ".                                                                                                                                                                               |
| Use instead, Similar, Replaces, Also called, Made by, Hazards                          | ਇਸ ਦੀ ਥਾਂ ਵਰਤੋ; ਮਿਲਦੀ-ਜੁਲਦੀ; ਇਸ ਦੀ ਥਾਂ ਲੈਂਦੀ ਹੈ; ਇਸ ਨੂੰ … ਵੀ ਕਹਿੰਦੇ ਹਨ; ਬਣਾਉਣ ਵਾਲੀ ਕੰਪਨੀ; ਖ਼ਤਰੇ                                 | "ਰਸਾਇਣ ਨਹੀਂ: ਸੇਗਰ ਫ਼ਾਰਮੂਲੇ ਵਿੱਚ ਨਹੀਂ ਗਿਣੀ ਗਈ", "{name} ਵਜੋਂ ਗਿਣੀ ਗਈ".                                                                                                                                                        |
| Kind (All kinds)                                                                       | ਕਿਸਮ (ਸਾਰੀਆਂ ਕਿਸਮਾਂ)                                                                                                            | ਫੈਲਡਸਪਾਰ ਅਤੇ ਸਟੋਨ, ਕਲੇ, ਫ਼ਰਿਟ, ਬੋਰਾਨ ਦੇ ਸਰੋਤ, ਫ਼ਲਕਸ, ਸਿਲਿਕਾ, ਐਲੂਮਿਨਾ, ਓਪੈਸੀਫ਼ਾਇਰ, ਕਲਰੈਂਟ, ਸਸਪੈਂਡਰ, ਹੋਰ.                                                                                                                      |
| Sold in, Where you work                                                                | ਇੱਥੇ ਵਿਕਦੀ ਹੈ; ਤੁਸੀਂ ਕਿੱਥੇ ਕੰਮ ਕਰਦੇ ਹੋ                                                                                          | All regions → "ਸਾਰੇ ਖੇਤਰ".                                                                                                                                                                                                   |
| Firing logs (firing record)                                                            | ਫਾਇਰਿੰਗ ਲੌਗ                                                                                                                     | m. "ਫਾਇਰਿੰਗ ਦਾ ਸਿਰਲੇਖ:", "ਫਾਇਰਿੰਗ ਦਰਜ ਕਰੋ", "ਮੇਰੀਆਂ ਸੇਵ ਕੀਤੀਆਂ ਫਾਇਰਿੰਗਾਂ:".                                                                                                                                                  |
| field, row                                                                             | ਕਾਲਮ; ਕਤਾਰ                                                                                                                      | "ਕਾਲਮ ਜੋੜੋ", "ਫਾਇਰਿੰਗ ਸਾਰਣੀ ਵਿੱਚ ਕਤਾਰ ਜੋੜੋ". Not a ਖੇਤ.                                                                                                                                                                      |
| trial (Your trial, Try it now, Discard trial)                                          | ਟ੍ਰਾਇਲ (ਤੁਹਾਡਾ ਟ੍ਰਾਇਲ, ਹੁਣੇ ਵਰਤ ਕੇ ਵੇਖੋ, ਟ੍ਰਾਇਲ ਹਟਾਓ)                                                                           | m. Never "ਮਹਿਮਾਨ" (guest).                                                                                                                                                                                                   |
| Typing amounts                                                                         | ਮਾਤਰਾ ਟਾਈਪ ਕਰਨਾ                                                                                                                 | "ਦਸ਼ਮਲਵ ਲਈ ਕੌਮਾ ਜਾਂ ਬਿੰਦੂ", "ਦਸ਼ਮਲਵ ਲਈ ਕੌਮਾ", "ਦਸ਼ਮਲਵ ਲਈ ਬਿੰਦੂ". Server: "ਦਸ਼ਮਲਵ ਚਿੰਨ੍ਹ". No source; Native check.                                                                                                           |
| Firing (To Orton cones, By temperature, as a kiln controller's program)                | ਫਾਇਰਿੰਗ (Orton ਕੋਨਾਂ ਅਨੁਸਾਰ, ਤਾਪ ਅਨੁਸਾਰ, ਕਿਲਨ ਕੰਟਰੋਲਰ ਦੇ ਪ੍ਰੋਗਰਾਮ ਵਾਂਗ)                                                         | "ਕੋਨ ਤੱਕ ਫਾਇਰਿੰਗ ਲਈ ਵਿਖਾਓ", "ਤਾਪ ਅਨੁਸਾਰ ਫਾਇਰਿੰਗ ਲਈ ਵਿਖਾਓ".                                                                                                                                                                   |
| Glaze density (Specific gravity, Degrees Baumé, Pint weight)                           | ਗਲੇਜ਼ ਦਾ ਗਾੜ੍ਹਾਪਣ (ਸਪੈਸਿਫ਼ਿਕ ਗ੍ਰੈਵਿਟੀ, ਬੋਮੇ ਡਿਗਰੀ, ਪਿੰਟ ਭਾਰ)                                                                    | See 2.6.                                                                                                                                                                                                                     |
| Light or dark, Colors                                                                  | ਹਲਕਾ ਜਾਂ ਗੂੜ੍ਹਾ; ਰੰਗ                                                                                                            | Palette: ਟੈਨਮੋਕੂ ਜੰਗਾਲ, ਸੇਲਾਡਾਨ ਹਰਾ, ਕੋਬਾਲਟ ਨੀਲਾ, ਆਕਸਬਲੱਡ ਲਾਲ, ਸ਼ੀਨੋ ਸੰਤਰੀ, ਵੁੱਡ ਐਸ਼ ਜ਼ੈਤੂਨੀ.                                                                                                                                |
| Batch weights (Grams, Pounds and ounces), Grams on printed batches                     | ਬੈਚ ਦੇ ਭਾਰ (ਗ੍ਰਾਮ, ਪੌਂਡ ਅਤੇ ਔਂਸ), ਪ੍ਰਿੰਟ ਕੀਤੇ ਬੈਚਾਂ ਵਿੱਚ ਗ੍ਰਾਮ                                                                  | "ਗ੍ਰਾਮ ਦੇ ਦਸਵੇਂ ਹਿੱਸੇ ਤੱਕ", "ਪੂਰੀ ਸਟੀਕਤਾ".                                                                                                                                                                                   |
| Lead (Off, On, Turn lead on, Keep it off)                                              | ਲੈੱਡ (ਬੰਦ, ਚਾਲੂ, ਲੈੱਡ ਚਾਲੂ ਕਰੋ, ਬੰਦ ਰੱਖੋ)                                                                                       | m. The metal. ਬੰਦ/ਚਾਲੂ as MS (Register).                                                                                                                                                                                     |
| English terms (Show the English after key terms)                                       | ਅੰਗਰੇਜ਼ੀ ਸ਼ਬਦ (ਮੁੱਖ ਸ਼ਬਦਾਂ ਤੋਂ ਬਾਅਦ ਅੰਗਰੇਜ਼ੀ ਵਿਖਾਓ)                                                                             | The setting that shows `<en>`/`{{en: …}}`.                                                                                                                                                                                   |
| Translation notice (About this translation, Suggest a correction, Read the English)    | ਅਨੁਵਾਦ ਬਾਰੇ ਸੂਚਨਾ (ਇਸ ਅਨੁਵਾਦ ਬਾਰੇ, ਸੁਧਾਰ ਸੁਝਾਓ, ਅੰਗਰੇਜ਼ੀ ਪੜ੍ਹੋ)                                                                 |                                                                                                                                                                                                                              |
| Trash                                                                                  | ਰੱਦੀ                                                                                                                            | f. No source. "move to the Trash" → ਰੱਦੀ ਵਿੱਚ ਭੇਜੋ; "put back" ਵਾਪਸ ਰੱਖੋ.                                                                                                                                                    |
| Remove (Yes, remove), Delete my account                                                | ਹਟਾਓ (ਹਾਂ, ਹਟਾਓ); ਮੇਰਾ ਖਾਤਾ ਮਿਟਾਓ                                                                                               | MS ("ਹਟਾਓ", "ਮਿਟਾਓ"). "ਇਹ ਵਾਪਸ ਨਹੀਂ ਹੋ ਸਕਦਾ."                                                                                                                                                                                |
| guide (Guides)                                                                         | ਗਾਈਡ (ਗਾਈਡਾਂ)                                                                                                                   | f. Native check. Every link, page title and list. A kiln's manual is "ਮੈਨੂਅਲ"; a maker's or school's guide ਕਿਤਾਬਚਾ, ਲੇਖ or ਦਸਤਾਵੇਜ਼ (Pitfalls).                                                                              |
| the five guides' titles                                                                | ਸਾਦੇ ਕਿਲਨ ਦੀ ਫਾਇਰਿੰਗ; ਮੁੱਢਲੇ ਸਿਧਾਂਤਾਂ ਤੋਂ ਗਲੇਜ਼; ਸੁਰੱਖਿਅਤ ਰਲਾਉਣਾ ਅਤੇ ਹਵਾਦਾਰੀ; ਆਪਣੇ ਪਰਿਵਾਰ ਨੂੰ ਜ਼ਹਿਰ ਤੋਂ ਬਚਾਓ; ਗਲੇਜ਼ ਕਿਵੇਂ ਬਣਾਈਏ | Firing a basic kiln; Glazing from first principles; Safe mixing and ventilation; Don't poison your family; How to make a glaze. No source; Native check. The same in the front matter, `titles`, `list` and every link text. |
| revoke (Revoke, revoked)                                                               | ਵਾਪਸ ਲਓ (ਵਾਪਸ ਲਿਆ) for a token                                                                                                  | Never ਮਿਟਾਓ for a revoke, and not ਰੱਦ ਕਰੋ, which is Cancel (MS): "ਐਕਸੈਸ ਟੋਕਨ ਵਾਪਸ ਲਿਆ ਗਿਆ". Native check.                                                                                                                    |
| sign in, sign out (signed in)                                                          | ਸਾਈਨ ਇਨ ਕਰੋ, ਸਾਈਨ ਆਊਟ ਕਰੋ (ਸਾਈਨ ਇਨ ਹੈ)                                                                                          | No Punjabi help page read (2.10). MS's older "ਲੌਗਔਨ" not used.                                                                                                                                                               |
| device (signed in on a device)                                                         | ਡੀਵਾਈਸ (ਕਿਸੇ ਡੀਵਾਈਸ ਉੱਤੇ ਸਾਈਨ ਇਨ)                                                                                               | f. No source (MS's "USB ਡਰਾਈਵ" for the pattern). Native check on the gender.                                                                                                                                                 |
| calculator (glaze calculator)                                                          | ਕੈਲਕੁਲੇਟਰ (ਸਿਰੇਮਿਕ ਗਲੇਜ਼ ਕੈਲਕੁਲੇਟਰ)                                                                                             | m. pawiki ("ਸਿਰੇਮਿਕ"). Never without ਸਿਰੇਮਿਕ/ਪੌਟਰੀ in a title.                                                                                                                                                               |
| About (the page)                                                                       | ਬਾਰੇ                                                                                                                            | "Glazecalc ਬਾਰੇ".                                                                                                                                                                                                            |
| record (a firing, material or other saved record); notes                               | ਰਿਕਾਰਡ; ਨੋਟ (ਨੋਟਸ)                                                                                                              | m.; m. "ਤੁਹਾਡੇ ਆਪਣੇ ਸਾਰੇ ਰਿਕਾਰਡ", "ਇਹ ਰਿਕਾਰਡ ਵਰਤੋ"; the Notes page "ਨੋਟਸ"; to record "ਦਰਜ ਕਰਨਾ".                                                                                                                             |
| Error (an error)                                                                       | ਗਲਤੀ                                                                                                                            | f. MS 5.4.2 ("ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ ਹੈ."; MS's ਤਰੁੱਟੀ not used). "ਸਰਵਰ ਦੀ ਗਲਤੀ", "…ਲਿਆਉਂਦੇ ਸਮੇਂ ਗਲਤੀ ਹੋਈ." Native check.                                                                                                            |
| AI assistant                                                                           | AI ਸਹਾਇਕ                                                                                                                        | m. "ਆਪਣੇ AI ਸਹਾਇਕ ਤੋਂ Glazecalc ਵਰਤੋ".                                                                                                                                                                                       |
| access token; Connected apps                                                           | ਐਕਸੈਸ ਟੋਕਨ; ਕਨੈਕਟ ਕੀਤੀਆਂ ਐਪਾਂ                                                                                                   | m.; f. pl. MS ("ਐਕਸੈਸ", "ਐਪਸ"). "ਐਕਸੈਸ ਟੋਕਨ ਵਾਪਸ ਲਿਆ ਗਿਆ".                                                                                                                                                                   |
| limits, limit set (Analysis and limits)                                                | ਲਿਮਿਟਾਂ, ਲਿਮਿਟ ਸੈੱਟ                                                                                                             | f. The app's glaze limits; ਸੀਮਾ stays for ordinary and legal limits. "ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਲਿਮਿਟਾਂ".                                                                                                                                |
| Solve for a target (button Solve)                                                      | ਟੀਚੇ ਤੋਂ ਰੈਸਿਪੀ ਕੱਢੋ (ਰੈਸਿਪੀ ਕੱਢੋ)                                                                                              | The recipe page's feature, in ‘ ’ in running text.                                                                                                                                                                           |
| upper cone (of a range); No upper cone                                                 | ਵੱਧ ਗਰਮ ਕੋਨ; ਕੋਈ ਵੱਧ ਗਰਮ ਕੋਨ ਨਹੀਂ                                                                                               | m. Never ਉੱਪਰਲਾ ਕੋਨ (Cones).                                                                                                                                                                                                 |
| guidelines                                                                             | ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼                                                                                                                   | m. pl. Not ਗਾਈਡ (the app's guides); "a guide, not a prediction" ਦਿਸ਼ਾ ਦੱਸਣ ਵਾਲਾ ਅੰਦਾਜ਼ਾ.                                                                                                                                     |
| shed                                                                                   | ਬਾਹਰ ਵੱਖਰਾ ਕਮਰਾ                                                                                                                 | m. Never ਸ਼ੈੱਡ (the shade of welding glasses).                                                                                                                                                                               |

### 2.9 Where the potter works

| English                                                                       | Punjabi                                                                                                                                                           | Notes                                                                                    |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Shops in (the label before a list of countries)                               | ਦੁਕਾਨਾਂ:                                                                                                                                                          | guides: shops.shopsIn                                                                    |
| raw glaze materials (what a shop sells)                                       | ਗਲੇਜ਼ ਦਾ ਕੱਚਾ ਮਾਲ                                                                                                                                                 | guides: shops.what.materials (Bhoomi, Clay Station: "Raw Materials").                    |
| ready-made glazes                                                             | ਤਿਆਰ ਗਲੇਜ਼                                                                                                                                                        | guides: shops.what.glazes (Bhoomi's menu "Glazes").                                      |
| Packs seen                                                                    | ਵੇਖੇ ਗਏ ਪੈਕ                                                                                                                                                       | guides: shops.packs                                                                      |
| A binding limit.                                                              | ਕਾਨੂੰਨੀ ਤੌਰ ਉੱਤੇ ਲਾਜ਼ਮੀ ਸੀਮਾ.                                                                                                                                     | guides: silica.kind.binding                                                              |
| An indicative limit: a guide value, not a legal ceiling.                      | ਸੰਕੇਤਕ ਸੀਮਾ: ਦਿਸ਼ਾ ਦੱਸਣ ਵਾਲਾ ਮੁੱਲ, ਕਾਨੂੰਨੀ ਉੱਪਰਲੀ ਹੱਦ ਨਹੀਂ.                                                                                                       | guides: silica.kind.indicative                                                           |
| An assessment criterion, not a binding limit. (Germany)                       | ਮੁਲਾਂਕਣ ਦੀ ਕਸੌਟੀ, ਲਾਜ਼ਮੀ ਸੀਮਾ ਨਹੀਂ.                                                                                                                               | guides: silica.kind.assessment                                                           |
| A control concentration (管理濃度) … (Japan)                                  | ਨਿਯੰਤਰਣ ਗਾੜ੍ਹਾਪਣ, ਜਪਾਨੀ ਵਿੱਚ kanri nōdo (管理濃度): ਕੰਮ ਵਾਲੀ ਥਾਂ ਦੀ ਹਵਾ ਨੂੰ ਉੱਥੋਂ ਦੇ ਮਾਪਾਂ ਨਾਲ ਪਰਖਣ ਦਾ ਮਿਆਰ, ਕੋਈ ਵਿਅਕਤੀ ਕਿੰਨਾ ਸਾਹ ਰਾਹੀਂ ਲੈਂਦਾ ਹੈ ਇਸ ਦੀ ਸੀਮਾ ਨਹੀਂ. | guides: silica.kind.control (Hepburn with macrons, the kanji in brackets: Pitfalls).     |
| action level (US)                                                             | ਐਕਸ਼ਨ ਲੈਵਲ                                                                                                                                                        | guides: silica.actionLevel                                                               |
| quartz and cristobalite                                                       | ਕੁਆਰਟਜ਼ ਅਤੇ ਕ੍ਰਿਸਟੋਬੈਲਾਈਟ                                                                                                                                         | guides: silica.both                                                                      |
| Recommended by {abbr}                                                         | {abbr} ਦੀ ਸਿਫ਼ਾਰਸ਼                                                                                                                                                | guides: silica.recommended (MS "ਅਸੀਂ ਸਿਫ਼ਾਰਸ਼ ਕਰਦੇ ਹਾਂ").                                |
| The national body for safety at work: <link>{name}</link>.                    | ਕੰਮ ਵਾਲੀ ਥਾਂ ਦੀ ਸੁਰੱਖਿਆ ਲਈ ਰਾਸ਼ਟਰੀ ਸੰਸਥਾ: <link>{name}</link>.                                                                                                    | guides: silica.agency. India's: DGOSH.                                                   |
| Kind of piece (food-contact rules)                                            | ਭਾਂਡੇ ਦੀ ਕਿਸਮ                                                                                                                                                     | guides: food.article                                                                     |
| pieces that cannot be filled, or no deeper than 25 mm                         | ਜਿਨ੍ਹਾਂ ਵਿੱਚ ਕੁਝ ਭਰਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ ਅਜਿਹੇ ਭਾਂਡੇ, ਜਾਂ 25 mm ਤੋਂ ਵੱਧ ਡੂੰਘੇ ਨਹੀਂ                                                                                      | guides: food.category.flat ("ਤੋਂ ਵੱਧ ਨਹੀਂ" = at most).                                   |
| Pieces that cannot be filled, or less than 2.5 cm deep                        | ਜਿਨ੍ਹਾਂ ਵਿੱਚ ਕੁਝ ਭਰਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ ਅਜਿਹੇ ਭਾਂਡੇ, ਜਾਂ 2.5 cm ਤੋਂ ਘੱਟ ਡੂੰਘੇ                                                                                          | guides: food.category.jpFlat ("ਤੋਂ ਘੱਟ" = less than).                                    |
| Other pieces under 1.1 L, not for cooking                                     | 1.1 L ਤੋਂ ਘੱਟ ਦੇ ਹੋਰ ਭਾਂਡੇ, ਖਾਣਾ ਪਕਾਉਣ ਲਈ ਨਹੀਂ                                                                                                                    | guides: food.category.jpSmall                                                            |
| Other pieces from 1.1 L to under 3 L, not for cooking                         | 1.1 L ਜਾਂ ਵੱਧ ਅਤੇ 3 L ਤੋਂ ਘੱਟ ਦੇ ਹੋਰ ਭਾਂਡੇ, ਖਾਣਾ ਪਕਾਉਣ ਲਈ ਨਹੀਂ                                                                                                    | guides: food.category.jpLarge                                                            |
| Other pieces of 3 L or more, not for cooking                                  | 3 L ਜਾਂ ਵੱਧ ਦੇ ਹੋਰ ਭਾਂਡੇ, ਖਾਣਾ ਪਕਾਉਣ ਲਈ ਨਹੀਂ                                                                                                                      | guides: food.category.jpStorage                                                          |
| other pieces that can be filled                                               | ਜਿਨ੍ਹਾਂ ਵਿੱਚ ਕੁਝ ਭਰਿਆ ਜਾ ਸਕਦਾ ਹੈ ਅਜਿਹੇ ਹੋਰ ਭਾਂਡੇ                                                                                                                  | guides: food.category.fillable                                                           |
| cooking ware                                                                  | ਖਾਣਾ ਪਕਾਉਣ ਵਾਲੇ ਭਾਂਡੇ                                                                                                                                             | guides: food.category.auCooking, jpCooking, myCooking (ਪਕਾਉਣਾ here is cooking: context). |
| The rim of a piece for drinking from: a 2 cm band, inside and out             | ਪੀਣ ਵਾਲੇ ਭਾਂਡੇ ਦਾ ਕੰਢਾ: ਅੰਦਰ ਅਤੇ ਬਾਹਰ 2 cm ਦੀ ਪੱਟੀ                                                                                                                | guides: food.category.rimBand                                                            |
| Flatware, no deeper than 25 mm (US)                                           | ਚਪਟੇ ਭਾਂਡੇ, 25 mm ਤੋਂ ਵੱਧ ਡੂੰਘੇ ਨਹੀਂ                                                                                                                              | guides: food.category.flatware                                                           |
| Small hollowware, under 1.1 L, other than cups and mugs (US)                  | ਛੋਟੇ ਡੂੰਘੇ ਭਾਂਡੇ, 1.1 L ਤੋਂ ਘੱਟ, ਕੱਪਾਂ ਅਤੇ ਮੱਗਾਂ ਤੋਂ ਇਲਾਵਾ                                                                                                        | guides: food.category.smallHollow                                                        |
| Large hollowware, 1.1 L or more, other than pitchers (US)                     | ਵੱਡੇ ਡੂੰਘੇ ਭਾਂਡੇ, 1.1 L ਜਾਂ ਵੱਧ, ਜੱਗਾਂ ਤੋਂ ਇਲਾਵਾ                                                                                                                  | guides: food.category.largeHollow                                                        |
| average of 6 pieces / any one of 6                                            | 6 ਭਾਂਡਿਆਂ ਦੀ ਔਸਤ / 6 ਵਿੱਚੋਂ ਕੋਈ ਇੱਕ                                                                                                                               | guides: food.judged.average, food.judged.each                                            |
| A piece passes if it releases no more than the limit: the law says “at most”. | ਜੇ ਭਾਂਡਾ ਸੀਮਾ ਤੋਂ ਵੱਧ ਧਾਤ ਨਹੀਂ ਛੱਡਦਾ ਤਾਂ ਉਹ ਪਾਸ ਹੁੰਦਾ ਹੈ: ਕਾਨੂੰਨ “ਵੱਧ ਤੋਂ ਵੱਧ” ਕਹਿੰਦਾ ਹੈ.                                                                         | guides: food.atMost. "ਵੱਧ ਤੋਂ ਵੱਧ", "ਤੋਂ ਵੱਧ ਨਹੀਂ" = at most; "ਤੋਂ ਘੱਟ" = under.         |
| Buying in (the label before a list of countries)                              | ਖ਼ਰੀਦ:                                                                                                                                                            | guides: equivalents.buyingIn                                                             |
| differs by {grams} g per 100 g                                                | ਹਰ 100 g ਪਿੱਛੇ {grams} g ਦਾ ਫ਼ਰਕ                                                                                                                                  | guides: equivalents.apart                                                                |
| Directive 84/500/EEC (its official name)                                      | ਯੂਰਪੀ ਸੰਘ (EU) ਦਾ ਨਿਰਦੇਸ਼ 84/500/EEC                                                                                                                              | regions: no official Punjabi text; the number kept. Native check on ਨਿਰਦੇਸ਼.             |
| Japan Poison Information Center, Osaka (大阪中毒110番)                        | ਜਪਾਨ ਜ਼ਹਿਰ ਜਾਣਕਾਰੀ ਕੇਂਦਰ, ਓਸਾਕਾ: Ōsaka chūdoku 110-ban (大阪中毒110番)                                                                                            | safety: Japan's lines (Hepburn with macrons, the kanji in brackets).                     |

### 2.10 Signing in

No Google, Microsoft or Apple Punjabi help page could be read (Not reached: Google serves its help pages' bodies in
English under hl=pa). The words below follow Microsoft's Punjabi style guide where it has them (ਪਾਸਵਰਡ, ਖਾਤਾ, ਕੁੰਜੀ for a
product key, ਪ੍ਰਮਾਣੀਕਰਨ in "ਮਲਟੀ-ਫੈਕਟਰ ਪ੍ਰਮਾਣੀਕਰਨ", ਐਪਸ) and the loanwords Indian phones show otherwise; **every row is a
Native check**.

| English                                   | Punjabi                       | Notes                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| two-step sign-in (2-step verification)    | ਦੋ-ਪੜਾਵੀ ਸਾਈਨ ਇਨ              | m. No source (Google's Punjabi page not reached). The English writes "two-step" as a word, so a digit 2 is a figure the check rejects: write "ਦੋ".                             |
| authenticator app                         | ਪ੍ਰਮਾਣੀਕਰਨ ਐਪ (ਔਥੈਂਟੀਕੇਟਰ ਐਪ) | f. MS ("ਮਲਟੀ-ਫੈਕਟਰ ਪ੍ਰਮਾਣੀਕਰਨ", "ਐਪਸ"). The loanword in the bracket once, since the apps are named so (Google Authenticator, Microsoft Authenticator). "ਪ੍ਰਮਾਣੀਕਰਨ ਐਪ ਦਾ ਕੋਡ". |
| setup key (the key typed in)              | ਸੈੱਟਅੱਪ ਕੁੰਜੀ                 | f. MS ("ਉਤਪਾਦ ਕੁੰਜੀ", "ਇਹ ਕੁੰਜੀ ਰਜਿਸਟਰ ਕਰੋ"). "ਕੁੰਜੀ ਕਾਪੀ ਕਰੋ".                                                                                                                |
| QR code                                   | QR ਕੋਡ                        | m. Latin QR, as Google and MS write codes (MS 4.1.5: "USB ਡਰਾਈਵ").                                                                                                             |
| passkey                                   | ਪਾਸਕੀ                         | f. No source. Plural ਪਾਸਕੀਆਂ (Plural forms).                                                                                                                                   |
| recovery code (backup code)               | ਰਿਕਵਰੀ ਕੋਡ                    | m. No source. The app's "Recovery code" is "ਰਿਕਵਰੀ ਕੋਡ" every time, never ਬੈਕਅੱਪ ਕੋਡ.                                                                                          |
| the code from the app (verification code) | ਪੁਸ਼ਟੀਕਰਨ ਕੋਡ                 | m. MS ("ਪੁਸ਼ਟੀ ਕਰਨ ਲਈ"). "ਐਪ ਤੋਂ ਮਿਲਿਆ ਪੁਸ਼ਟੀਕਰਨ ਕੋਡ".                                                                                                                         |
| security key                              | ਸੁਰੱਖਿਆ ਕੁੰਜੀ                 | f. MS's ਕੁੰਜੀ. ਸੁਰੱਖਿਆ (security) is not ਸੁਰੱਖਿਅਤ (safe), and Save is ਸੇਵ ਕਰੋ, so no clash.                                                                                    |
| sign in, sign out                         | ਸਾਈਨ ਇਨ ਕਰੋ, ਸਾਈਨ ਆਊਟ ਕਰੋ     | No source. MS's older ਲੌਗਔਨ is not used.                                                                                                                                       |
| account                                   | ਖਾਤਾ                          | m. MS ("ਖਾਤਾ ਤਸਵੀਰ", "ਇੰਟਰਨੈੱਟ ਖਾਤੇ"). "Google ਖਾਤਾ", "ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ".                                                                                                      |
| password                                  | ਪਾਸਵਰਡ                        | m. MS ("ਪਾਸਵਰਡ ਸਹੀ ਨਹੀਂ ਹੈ", "Windows ਪਾਸਵਰਡ").                                                                                                                                |
| trusted device                            | ਭਰੋਸੇਯੋਗ ਡੀਵਾਈਸ               | f. No source. "ਇਸ ਡੀਵਾਈਸ ਉੱਤੇ ਦੁਬਾਰਾ ਨਾ ਪੁੱਛੋ".                                                                                                                                |

## 3. Never translated

From terms.md, unchanged:

- **Formulas and symbols:** SiO₂, Al₂O₃, B₂O₃, K₂O, Na₂O, Li₂O, CaO, MgO, BaO, SrO, ZnO, PbO, Fe₂O₃, FeO, Fe₃O₄, TiO₂,
  ZrO₂, ZrSiO₄, CoO, Co₃O₄, CuO, MnO₂, Cr₂O₃, SnO₂, P₂O₅, V₂O₅, CaCO₃, CO, CO₂ and the rest; R₂O, RO, R₂O₃, RO₂; KNaO;
  "×10⁻⁶/°C" and "x 10^-7/K".
- **Cone numbers:** 022 to 42 with their leading zeros (010, 08, 06, 04, 03, 01, 1, 5, 6, 10), SK numbers as printed
  (SK 022, SK 015a, SK 6a, SK 20), and the "o'clock" bend positions (the words around them change; the clock figure
  stays).
- **Mesh numbers:** 50, 60, 80, 100, 120, 200, 325 mesh, -325 mesh, "200#".
- **Units:** °C, °F, K, °Bé, °C/h, °F/h, g, kg, mg, µg, ml/mL, L, lb, oz, fl oz, %, mm, cm, m³, mg/m³, µg/m³, µg/dL,
  µg/mL, µg/cm², µm (inches and feet take the language's word: see Numbers and units).
- **Codes and standards:** N95, P100, FFP2, FFP3, P2, P3, EN 149, EN 140, AS/NZS 1716, HEPA, Class M, ASTM C738, ASTM
  D-4236, EN 1388, ISO 6486, AS 4371, JIS R 8101, IS 9473 and IS 9806 where the English names them, the numbers of
  Directives 84/500/EEC and (EU) 2017/2398, CPG Sec. 545.450, 29 CFR 1910.1053, H-codes (H302, H360FD), GHS08, CAS
  numbers, IARC group numbers.
- **Names:** Glazecalc; "UMF" as an abbreviation; Seger, Orton (Orton Ceramic Foundation), Staffordshire, Bullers,
  Holdcroft (Orton and SK in Latin letters; Seger is ਸੇਗਰ in running text, as the Cones subsection says).
- **Kiln and equipment makers and products:** Skutt (EnviroVent 2, KilnMaster), L&L (DynaTrol), Bartlett, Dawson
  (Kiln-Sitter, LT-3), Bracker's; controller presets (Slow Bisque, Fast Bisque, Slow Glaze, Fast Glaze, "User 6");
  Digitalfire schedules (BQ1000, PLC6DS, C6DHSC).
- **Materials by trade name:** Ferro and Vibrantz frits (3110, 3124, 3134, 3195, 3249), Fusion frits (F-19 and others),
  Potterycrafts P3124 and P3195, Custer feldspar (Custer Spar), G-200, G-200 EU, G-200 HP, Mahavir, Minspar 200, Kona
  F-4, Norflux, FFF, Gerstley Borate, Gillespie Borate, Laguna Borate, Portabor, EPK, Grolleg, Eckalite, Eckaglas, TWVA,
  HVAR, Zircopax, Superpax, Excelopax, Ultrox, Zircosil, Darvan, Volclay, Bentone, Vansil, NYAD, Alberta Slip, Albany
  slip, Bayferrox, Mason stains, AMACO; Indian shops' codes as printed (CS, G-325, Frit 1005).
- **Sources, agencies and suppliers:** Glazy, Digitalfire, Ceramic Arts Network, Ceramics Monthly, HSE, OSHA, NIOSH,
  IARC, ECHA, FDA, CDC, EPA, NHS, COSHH, NEPSI, Safe Work Australia, WorkSafe New Zealand, AIIMS, NPIC, BIS, DGOSH;
  Laguna, Potclays, Potterycrafts, Valentine Clays, Sibelco, Imerys, Walker Ceramics, Bhoomi, Clay Station and the other
  suppliers named; the poison services in `safety/en.json`.
- **Placeholders and tags:** `{name}`, `{count}` and the rest, and `<b>`, `<settings>` and other tags.
