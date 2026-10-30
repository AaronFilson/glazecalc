# සිංහල: style sheet and glossary

For translating Glazecalc into Sinhala (`si`), in standard written Sinhala as Sri Lanka's schools, government and press
write it, for potters in Sri Lanka (region `LK`). Read [README.md](README.md) first; [terms.md](terms.md) gives the meaning
of every English term below. [hi.md](hi.md) is the model for the shape of this page, with [ta.md](ta.md) and
[kn.md](kn.md). Every Sinhala message and guide follows this page: one Sinhala word for one thing. Sinhala is not offered
yet: `si` is known to `lib/regions` ahead of its files. **Sri Lanka fires by temperature by default** (`lib/regions/index.js`:
`LK`, `cones: 'temperature'`, library `US`), with Orton cones one tap away, and no shop in Sri Lanka is in the region data
(`suppliers.js`: `LK: { shops: [] }`), so the Sinhala pages must read well with temperatures first, with Orton cones where
the reader chooses them, and say nothing about SK cones that the English does not say. Written by the round-9 glossary
research (wave I4, 22 October 2026); nothing here is translated yet. The research scripts and what they fetched are in
`scratch/round9/indic/si/` in the main checkout.

**The owner's choices** (as for Hindi): the register ඔබ; **the studio potters' English loanwords first**, in Sinhala letters
as potters say them (ග්ලේස්, ෆ්‍රිට්, කිල්න්, බිස්ක්), **with the Sinhala technical term in brackets where it differs**;
sentences end with the Latin full stop "."; the digits 0 to 9 (the app formats numbers); a native Sinhala reviewer later.
This page applies that choice in four tiers, and every row says which tier it is in:

1. **Craft words** that studio potters say in English (glaze, frit, kiln, bisque, cone, slip, slurry, crazing,
   pinholing): the loanword in Sinhala letters, with the Sinhala term in brackets at its first use in each guide section
   (ග්ලේස් (ඔපය), කිල්න් (පෝරණුව)).
2. **Materials**: the name on the bag. No Sri Lankan shop's list was found; the Indian shops that ship to the region sell in
   English ("Soda Feldspar 1 Kg", "China Clay Kaolin Calcined", "CS Whiting (G-200)", hi.md and ta.md), and Sri Lanka's
   tile and porcelain industry writes the same names in Sinhala letters (Wikipedia (si), බිම් ගඩොල්: "බෝල මැටි, සිලිකා
   වැලි, කෙයොලින්, ඩොලමයිට්, පෙල්ස්පාර්"). Trade names stay in Latin letters (Ferro 3134, Minspar 200).
3. **Chemistry and physics** (oxide, mole, formula, oxidation, reduction, thermal expansion, viscosity, specific gravity,
   solubility): the Sinhala of Sri Lanka's Sinhala-medium school science, as the Sinhala Wikipedia writes it (ඔක්සයිඩය,
   මවුලය, සූත්‍රය, ඔක්සිකරණය, ඔක්සිහරණය, තාප ප්‍රසාරණය, දුස්ස්‍රාවිතාව, විශිෂ්ට ගුරුත්වය, ද්‍රාව්‍යතාව).
4. **Health, safety and law**: plain Sinhala and the words of Sri Lanka's statutes and agencies (දූවිලි, විෂ සහිත, හානිකර,
   සිලිකෝසිස්, නොඉක්මවන, නොඅඩු), so that every reader understands them; a loanword only where Sinhala has no plain word
   (රෙස්පිරේටරය, HEPA).

Where a loanword collides with an everyday Sinhala word (බිස්කට් for a biscuit, මැට් beside මැටි (clay), ස්ටැබිලයිසර් for a
voltage stabiliser, ග්ලේස් for a cake glaze, ටින් for a can), the row says how the collision is avoided.

**What the sources could and could not give.** Sinhala has almost nothing written about studio glazes. Google's
suggestions for Sri Lanka in Sinhala (22 October 2026) show where the words live: **පෝරණුව** completes to "විදුලි පෝරණුව"
(electric kiln), "මැටි පෝරණු", "ගඩොල් පෝරණුව", "දර පෝරණුව"; **කිල්න්** completes to nothing; **ග්ලේස්** completes only to
"චොක්ලට් ග්ලේස්" (a cake glaze); **පිඟන් මැටි** to "පිඟන් මැටි කර්මාන්තය", "පිඟන් මැටි භාණ්ඩ"; **සෙරමික්** to tiles, sinks and
tableware; and potters search for glazes and cones in English ("ceramic glaze sri lanka", "pottery glaze sri lanka", "cone 6
temperature celsius", "glaze meaning in sinhala", "kiln meaning in sinhala"). The Sinhala Wikipedia has the pottery and
chemistry words (කුඹල් කර්මාන්තය, මැටි භාණ්ඩ, පෝසිලේන්, සිරිමැටි, කිරිමැටි, පෝරණු, පුළුස්සා, ඔප දමන ලද, යටි ඔපය, සෙලඩොන්,
ද්‍රවාංකය, ද්‍රාව්‍යතාව, විශිෂ්ට ගුරුත්වය), and Sinhala articles on Sri Lanka's pottery (Roar, Puwath) give the village
potters' words (පෝරණුව, පුළුස්සා ගනියි, පිළිස්සීම, අමු මැටි, කෙයොලින් මැටි, කිරි මැටි, රතු මැටි, සකපෝරුව, කුඹල්කරු).
Google's Sinhala help pages give the sign-in words. **No Sinhala text of a studio-glaze course, a kiln manual, a shop's
list, the Factories Ordinance or an SLS standard could be read** (see Not reached): the rows marked **Usage** rest on
Sinhala articles or Google's suggestions but on no teaching source, and the rows marked **No source** are best choices.
**The kiln-part, controller, firing-log and defect rows rest on the potters' English and on no Sinhala source; the law
rows rest on the Penal Code's wording as the Sinhala Wikipedia quotes it.**

**The rows a native Sinhala potter should check first** (each marked **Native check** below): කිල්න් against පෝරණුව (2.4,
Choices); ග්ලේස් and its bracket ඔපය (2.1); the forms for must and should (Register); උණු වීම for melting and ද්‍රාවණය වීම for
dissolving (2.7); වට්ටෝරුව for recipe (2.8); බිස්ක් and its bracket (2.3); the defect loanwords (2.5); රෙස්පිරේටරය (2.7);
සෙරමික් ශිල්පියා for "potter" (Gender-neutral wording); the five guide titles (2.8); විශිෂ්ට ගුරුත්වය for SG and ග්ලේස්
ඝනත්වය for the setting (2.6); සංග්‍රහය for the library (2.8); වරන්න for sign out (2.10); the GHS words (2.7).

Main sources, cited below by short name (all read 22 October 2026):

- **Wikipedia (si)**: the Sinhala Wikipedia, read through its API (wikitext, full-text hit counts and snippets, langlinks
  from the English titles; `scratch/round9/indic/si/wiki.mjs`):
  - [කුඹල් කර්මාන්තය](https://si.wikipedia.org/wiki/%E0%B6%9A%E0%B7%94%E0%B6%B9%E0%B6%BD%E0%B7%8A_%E0%B6%9A%E0%B6%BB%E0%B7%8A%E0%B6%B8%E0%B7%8F%E0%B6%B1%E0%B7%8A%E0%B6%AD%E0%B6%BA)
    (Pottery): "කුඹල් භාණ්ඩ තැනීමෙහි පිඟන් මැටි භාවිතමය ක්‍රියාව", "මැටිබඳුන්, දැඩි මෘත්තිනා භාණඩ සහ පෝසිලේන්", "නොපුළුස්සන
    ලද "අමු" කුඹල් භාණ්ඩ", "කුඹල්කරුවෙක්".
  - සෙරමික් (පිඟන් මැටි) (Ceramic): "ඔප දමන ලද හෝ ඔප නොදමන ලද වස්තු", "සෙරමික් ද්‍රව්‍ය", "සවිවර හා භංගුරය".
  - මැටි භාණ්ඩ (the langlink of Terracotta): "පදම්කල සවිවර මැට්ටෙන් තනා 1,000 °C පමණ පුළුස්සාගත් භාණ්ඩ මැටි භාණ්ඩ හෙවත්
    ටෙරාකොටා භාණඩ".
  - පෝසිලේන් (Porcelain): "කිරිමැටි වලින් තැනූ භාණ්ඩයක් 1,200 °C … සහ 1,400 °C … අතර උෂ්ණත්වයක පෝරණු තුල පුළුස්සාගත්විට".
  - කෙයලිනයිට් (Kaolinite): "කෙයලිනයිට් අධික මැටි කිරිමැටි හෙවත් පිඟං මැටි ලෙස හැඳින්වේ"; බොරලැස්ගමුව: "ශ්‍රී ලංකාවේ
    විශාලතම පිඟන් මැටි නිධිය".
  - බිම් ගඩොල් (Floor tiles, on Sri Lanka's tile making): "බෝල මැටි, සිලිකා වැලි, කෙයොලින්, ඩොලමයිට්, පෙල්ස්පාර් … අමුද්‍රව්‍ය",
    "ඔපදැමිම් අංශය", "විනිවිද පෙනෙන ඔප තට්ටුවක් දැමීම", "දහන අංශයේදී … සෙ.අ1200 ක උෂ්ණත්වයක", "එක්වරක් ග්ලේස් දැමූ ටයිල්",
    "මැටි ෆිනිෂ් ටයිල්" (a matt finish written as clay: see Pitfalls).
  - ගොර්යෝ, ජොසොන් (Korean ceramics): "අර්ධ වීදුරුමය සහ යටි ඔපය සහිත සෙලඩොන් ඔපදැමූ බඳුනකි", "අර්ධ-වීදුරුමය (stoneware)",
    "සිරිමැටි (පෝසිලේන්)", "බුන්වොන්-රි පෝරණුව".
  - Chemistry: ඔක්සයිඩය ("අයන්(III) ඔක්සයිඩය", "සින්ක් ඔක්සයිඩ්"), මවුලය, රසායනික සූත්‍ර, ඔක්සිකරණය (39 pages),
    ඔක්සිහරණය (18), ද්‍රවාංකය ("ඝන අවස්ථාවේ සිට ද්‍රව අවස්ථාවට පත්වන උෂ්ණත්වයයි"), ද්‍රාව්‍යතාවය ("ජලයේ මඳ වශයෙන් ද්‍රාව්‍ය
    සංයෝගයක්"), "අද්‍රාව්‍ය ලවණ", ඝනත්වය ("විශිෂ්ට ගුරුත්වය හෝ සාපේක්ෂ ඝනත්වය යනු ඝනත්වය, ඒකක රහිත රාශියක් ලෙස
    දැක්වීමට"; ගාර්නට්: "විශිෂ්ට ගුරුත්වය 3.1–4.3"), තාප ප්‍රසාරණය (47), දුස්ස්‍රාවිතාව ("ද්‍රව පෘෂ්ඨ අතර පවතින ඝර්ෂණ බලය";
    ලාවා "උකු බවින් වැඩි"), අණුක ස්කන්ධය, මවුලික ස්කන්ධය, ක්ෂාර ලෝහ, ක්ෂාරීය පාංශු ලෝහ, ස්ඵටික, පාරාන්ධ, පාරදෘශ්‍ය,
    "සිලිකා යනු … මූලද්‍රවයක ඔක්සයිඩය", "ක්‍රිස්ටොබලයිට් (cristobalite) යන ස්ඵටික රූපි අකාරයෙන්", තිරුවානා ("තිරුවානා
    (ක්වෝට්ස්)", "ක්වාර්ට්ස්" 11 pages), "සෝඩා අළු (Na2CO3)", "රෙදිසෝඩා", "පොටෑෂ්" (fertiliser: "මියුරියේට් ඔෆ් පොටෑෂ්"),
    "සින්ක් (තුත්තනාගම්)", "බොරැක්ස්", "බෝරික් අම්ලය", "හුණු", "පිළිස්සූ හුණු", "හුණුගල්", "ඩොලමයිට්", "රූටයිල්", "සර්කෝන්"
    (and ජාගුන්, the langlink of Zircon, which is the gemstone).
  - Elements and safety: ඊයම් ("ඊයම් යනු රසායනික මූලද්‍රව්‍යයකි … උණු කළ විට"), ටින්, කොබෝල්ට්, මැංගනීස්, ලිතියම්, තඹ,
    "යකඩ ඔක්සයිඩ්", ටයිටේනියම් ඩයොක්සයිඩ්, ශ්වසන රෝග ("දූවිලි ශ්වසන පද්ධතිය කෙරෙහි කරන බලපෑම්(ඇස්බැස්ටෝසිස්,සිලිකෝසිස්)"),
    නිදන් ගත පෙනහළු අවහිරවීමේ රෝගය ("(COPD)"), කාබන් මොනොක්සයිඩ් විෂ වීම ("විෂ සහිත වායුවකි"), වස ("විෂ සහිත … හානිකර"
    as two classes), අධෝරක්ත තරංග, චර්ම ප්‍රදාහය, "මුහුණු ආවරණ", "ශ්‍රී ලංකා ප්‍රමිති ආයතනය", "පාරිභෝගික කටයුතු පිළිබද
    අධිකාරිය පනත" (2003 අංක 09), "119 (හදිසි සේවා අංකය)", "1990 “සුව සැරිය” ජාතික ගිලන් රථ සේවාව".
  - Law wording: ශ්‍රී ලංකා දණ්ඩ නීති සංග්‍රහයේ 365 වගන්තිය ("වසර දහයකට නොඅඩු සහ අවුරුදු විස්සක් නොඉක්මවන කාල
    සීමාවක්"); "අවම වශයෙන්", "ට වඩා අඩු".
  - Dates: the citations' "සම්ප්‍රවේශය 31 දෙසැම්බර් 2015", "23 මැයි 2016" (day, Gregorian month, year).
  - Counts (pages containing the words): මැටි භාණ්ඩ 181, පිඟන් මැටි 71, කුඹල් 67, ඔප දැමූ 50, පෝරණුව 3, උඳුන 12, ග්ලේස් 2,
    කිල්න් 0, කේඕලින් 0, සිලිකා 21, ඇලුමිනා 9, ඊයම් 113, ද්‍රවාංකය 63, ද්‍රාව්‍ය 36, දියවේ 7, සාපේක්ෂ ඝනත්වය 104, විශිෂ්ට
    ගුරුත්වය 11, සිලිකෝසිස් 1, නොඉක්මවන 19.
- **Roar**: Roar සිංහල, [ලංකාවේ කුඹල් කර්මාන්තය ගැන දැනගනිමු](https://archive.roar.media/sinhala/main/features/pottery-industry-of-sri-lanka):
  "වියලෙන්නට තැබීමෙන් පසුව පෝරණුවකට දමා පුළුස්සා ගනියි", "මැටි භාණ්ඩ පිළිස්සීම සඳහා … පෝරණු වර්ග", "දේශීය කුඹල්
  කර්මාන්තයේ දී කෙයොලින් මැටි හා රතු මැටි", "ප්‍රාථමික මැටි, ශේෂ මැටි සහ, කිරි මැටි", "සකපෝරුව", "කුඹල්කරුවන්", "රතු
  ආලේපිත බඳුන්".
- **Puwath**: [කුඹල් කර්මාන්තය නොහොත් මැටි කර්මාන්තය ගැන ඔබ නොදත් දේ](https://puwath.lk/article/pottery-1662358176): the
  same words, and "අමු මැටි ගින්නේ පිලිස්සීමෙන් ඇතිවන තද බව", "කුඹල් කාර්මිකයා", "මැටි කාර්මිකයා".
- **Google**: Google's Sinhala help pages: [දෙපියවර සත්‍යාපනය ක්‍රියාත්මක කරන්න](https://support.google.com/accounts/answer/185839?hl=si)
  ("දෙපියවර සත්‍යාපනය", "ආරක්ෂක යතුරක්", "මුරයතුරු", "උපස්ථ කේත", "සත්‍යාපන කේත", "QR කේතයක්", "Google ගිණුම", "මුරපදය",
  "විශ්වාසදායක උපාංගවල දෙවන පියවර මඟ හරින්න", "මෙම උපාංගයෙන් නැවත අසන්න එපා", "ඔබේ Google ගිණුම විවෘත කරන්න.", "…
  තෝරන්න.", "තිරය මත පියවර අනුගමනය කරන්න.", "ආරක්ෂාව සහ පුරනය වීම"),
  [Google Authenticator](https://support.google.com/accounts/answer/1066447?hl=si) ("Google Authenticator සමගින් සත්‍යාපන
  කේත ලබා ගන්න", "QR කේතය ස්කෑන් කරන්න", "ස්ථාපනය කරන්න", "පුරන්න"),
  [backup codes](https://support.google.com/accounts/answer/1187538?hl=si) ("උපස්ථ කේතය සමග පුරන්න", "ඔබේ උපස්ථ කේතය
  කිසිවෙකු සමග බෙදා නොගන්න."), [passkeys](https://support.google.com/accounts/answer/13548313?hl=si) ("මුරපදයක් වෙනුවට
  මුරයතුරක් සමග පුරන්න", "මුරයතුරක් තනන්න", "තිර අගුල", "ඉවත් කරන්න", "ඔබට ඔබේ උපාංගය අගුළු හැරීමට අවශ්‍ය වනු ඇත.");
  [Google Account](https://www.google.com/intl/si/account/about/) ("Google සමග පුරන්න", "ගිණුමක් සාදන්න", "පෞද්ගලිකත්ව
  සැකසීම්", "ඔබේ Google ගිණුමට පුරනය වී, … උපරිමය ලබා ගන්න."). Gmail's sign-out page and Google's privacy policy were served
  in English with `hl=si`.
- **Suggest**: Google suggest, suggestqueries.google.com with hl=si and gl=LK, web and YouTube (`scratch/round9/indic/si/suggest.mjs`;
  see Search terms).
- **CLDR**: Node 24.21's ICU 78.3 (CLDR 48) for `si` (`scratch/round9/indic/si/cldr.mjs`): plural categories `one`, `other`
  (0 and 1 are `one`; 0.5, 1.5, 2, 21, 100 `other`); 1,234,567.5 and 12,500 with Latin digits (numbering system `latn`); 5%;
  the long date "2026 වප් 14" and "2026 වප්" (the traditional month names දුරුතු … උඳුවප්, see Choices); the short time
  "20.00" (with a full stop); "අ, ආ, සහ ඇ"; "දින 3කට පෙර"; region names ශ්‍රී ලංකාව, ඉන්දියාව, එක්සත් ජනපදය, එක්සත් රාජධානිය,
  ජර්මනිය, ජපානය, "හොංකොං විශේෂ පරිපාලන කලාපය චීනය", ඕස්ට්‍රේලියාව (LK's and AU's names carry the ZWJ of a rakaransaya).
- **LK data**: `lib/regions` for `LK` (safety.js, workplace.js), from the round-8 region research (21 October 2026): 1990
  Suwa Seriya (ambulance, free, around the clock), 119 (police), 110 (fire), no poison line shown; the Ministry of Health and
  Mass Media; the National Institute of Occupational Safety and Health (NIOSH); no silica limit and no mask standard found.
- **NIOSH LK**: [NIOSH's Sinhala site](https://www.niosh.gov.lk/index.php?lang=si): "ජාතික වෘත්තීය සුරක්ෂිතතා සහ සෞඛ්‍ය
  ආයතනය", "උපද්‍රව හඳුනා ගැනීම", "වැඩකිරීමේ පරිසරය පිළිබඳ පරීක්ෂණ".
- **Health LK**: [health.gov.lk](https://www.health.gov.lk/): "සෞඛ්‍ය හා ජනමාධ්‍ය අමාත්‍යාංශය".
- **1990**: [1990.lk](https://1990.lk/): "1990 සුවසැරිය", "ක්‍රමවත් ගිලන් රථ සේවයක්".
- **Unicode**: the Unicode list thread [Ambiguity in Sinhala named sequences](https://corp.unicode.org/pipermail/unicode/2016-October/004240.html)
  (October 2016), quoting Unicode's named sequence "SINHALA CONSONANT SIGN REPAYA;0DBB 0DCA 200D" and SLS 1134 (see Script
  and spelling).
- **MS styles**: [Microsoft's list of localization style guides](https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides):
  there is no Sinhala style guide (Nepali, Tamil and the others are listed).

**Not reached**, and so not used: the Department of Official Languages' Sinhala glossaries (පාරිභාෂික ශබ්ද මාලාව), including
the chemistry glossary of 2005 (known only from the National Library's [catalogue](https://unioncatalogue.dlp.gov.lk/Record/batt.67812);
no online copy found); the Educational Publications Department's Sinhala-medium science textbooks (edupub.gov.lk refused
the TLS connection); the Sinhala Dictionary of the Department of Cultural Affairs; the Sinhala text of the Factories
Ordinance, its regulations and the Consumer Affairs Authority Act (the Department of Labour's Sinhala page is images; no
Sinhala text found on LawNet or Parliament's site by search); any SLS standard in Sinhala for masks or ceramic ware; any
Sinhala GHS label text; any Sinhala page of the University of the Visual and Performing Arts' Department of Ceramics, the
National Crafts Council, Dankotuwa, Noritake Lanka or Lanka Tiles (searches found English pages only); the Western
Province's small-industries page in Sinhala (certificate error); any Sinhala kiln manual; Microsoft's Sinhala help pages
(served in English) and any Microsoft Sinhala style guide (none exists); Apple's help pages (no Sinhala edition); a Sinhala
page of Google's for signing out (served in English). The search engines available here return almost nothing for Sinhala
queries.

## Choices for the owner and a native potter

These are the questions this sheet cannot settle from sources; each has a recommendation, used below until answered.

- **The full stop (decided):** sentences end in the Latin full stop **"."**, as Google's Sinhala pages and the Sinhala
  Wikipedia write. The kundaliya (෴) is historical and is never used.
- **The four tiers** (above): loanwords for craft words, the bag's names for materials, the school science's Sinhala for
  chemistry, plain Sinhala for safety. Recommended.
- **Kiln: කිල්න් (පෝරණුව).** **Native check, first.** The owner's rule puts the loanword first, as Hindi does, and this
  page follows it: කිල්න්, with (පෝරණුව) at its first use in each guide section. But පෝරණුව is the everyday word for a
  potter's kiln (Roar, Puwath, Wikipedia (si): "පෝරණු තුල පුළුස්සාගත්විට"), and Google suggest completes "විදුලි පෝරණුව"
  (electric kiln) and "මැටි පෝරණු", while කිල්න් completes to nothing. A native potter may well prefer **පෝරණුව** throughout
  (විදුලි පෝරණුව, ගෑස් පෝරණුව); if so, only the kiln rows change. **උඳුන** is an oven or a hearth, never a kiln.
- **Glaze: ග්ලේස් (ඔපය).** The tile makers write both ("ග්ලේස් දැමූ ටයිල්", "ඔප දැමූ ටයිල්"); ඔපය is the Wikipedia's word for
  a ceramic glaze ("ඔප දමන ලද හෝ ඔප නොදමන ලද", "යටි ඔපය") but also means polish and shine (Google suggest: "මැණික් ඔප දැමීම",
  "පිත්තල භාණ්ඩ ඔප දැමීම"), and ග්ලේස් alone is a cake glaze ("චොක්ලට් ග්ලේස්"): so the loanword first, ඔපය in brackets, and
  **සෙරමික් ග්ලේස්** in titles. **Native check.**
- **Firing: පිළිස්සීම** (to fire **පුළුස්සනවා**, written "පුළුස්සන්න", "පුළුස්සා"), the village potters' and the
  Wikipedia's word (Roar: "පුළුස්සා ගනියි", "පිළිස්සීම"), not a loanword: it is plain, everyone knows it, and Sri Lanka
  fires by temperature. පිළිස්සීම also names a burn on the skin (the Wikipedia's article පිළිස්සීම is burns): in the
  home-safety text a burn is **පිළිස්සුම් තුවාලය**, never පිළිස්සීම alone. **Native check.**
- **Buttons: the polite imperative in -න්න** (සුරකින්න, මුද්‍රණය කරන්න, සසඳන්න, තෝරන්න), as Google's Sinhala writes every
  link and step ("ස්ථාපනය කරන්න", "ක්‍රියාත්මක කරන්න", "පුරන්න"). Never the bare stem (සුරකි) or the familiar -පන්. Sinhala
  software has no shorter command form to choose.
- **Must and should** (Register): **… යුතුය** for must and **… සුදුසුය** for should. Sinhala "යුතුය" is the duty itself, and
  "සුදුසුය" (it is advisable) keeps should from reading as must. **Native check.**
- **Melting and dissolving:** melt **උණු වීම** (උණු වේ, උණු වූ), dissolve **ද්‍රාවණය වීම** (ද්‍රාවණය වේ), soluble **ද්‍රාව්‍ය**,
  insoluble **අද්‍රාව්‍ය**, solubility **ද්‍රාව්‍යතාව**, melting point **ද්‍රවාංකය**. Everyday Sinhala's **දිය වීම** means both
  (the Wikipedia: gallium "අතේ දිය වේ", melts in the hand; CO₂ "ජලය සුළු වශයෙන් දියවේ", dissolves) and is never used in
  the safety text, because a low-solubility frit is not a low-melting one. **Native check.**
- **Recipe: වට්ටෝරුව** (plural වට්ටෝරු), the everyday Sinhala word for a recipe. A potter may say රෙසිපිය; the loanword is
  not used. Never සූත්‍රය (a formula). **Native check.**
- **Potter: සෙරමික් ශිල්පියා** (plural සෙරමික් ශිල්පීන්). **කුඹල්කරු** (Roar) is the village potter and **කුඹල්** also names a
  caste: used only where the English means the traditional potter. **Native check.**
- **Seger in Latin letters.** Orton and SK are in Latin letters; Seger is too (Seger සූත්‍රය), so that the three names read
  alike. **Native check.**
- **Guide and manual:** the app's guides are **මාර්ගෝපදේශය** (plural මාර්ගෝපදේශ), a kiln's manual is **අත්පොත**. Two
  different words everywhere; never ගයිඩ් or මැනුවල්.
- **Specific gravity: විශිෂ්ට ගුරුත්වය**, the Wikipedia's word for relative density as a ratio without units ("ඒකක රහිත
  රාශියක්"), never **ඝනත්වය** (density, kg/m³ or g/cm³) for the figure. The setting "Glaze density" is **ග්ලේස් ඝනත්වය**, the
  one place ඝනත්වය stands, as a heading over SG, Baumé and pint weight. **Native check.**
- **Dates (for the owner):** CLDR 48's long date for `si` is **"2026 වප් 14"**, with the traditional month names (දුරුතු,
  නවම්, … වප්, ඉල්, උඳුවප්), which modern Sinhala prose does not use for Gregorian dates: the Wikipedia writes "31 දෙසැම්බර්
  2015", Google writes Gregorian month names. The translations write **"14 ඔක්තෝබර් 2026"**; dates the app formats itself
  through `Intl` will print "2026 වප් 14" unless the code asks otherwise (a numeric date, 2026-10-14, is CLDR's short form).
  The owner may want the app to format Sinhala dates numerically or with its own month names.
- **Times (for the owner):** CLDR writes Sinhala times with a full stop, **"20.00"**; the translations write **20:00**, which
  the numbers check reads as a time (it rejects ප.ව. and පෙ.ව. with a 12-hour figure).
- **Library: සංග්‍රහය** ("the built-in list"; ද්‍රව්‍ය සංග්‍රහය), not පුස්තකාලය (a book library). **Native check.**
- **Sign out: වරන්න** (Google's Sinhala interface, as remembered; no Sinhala page saying it could be read: Native check), and
  sign in **පුරන්න** (Google).

## 1. Style sheet

### Register

**ඔබ** (ඔබේ, ඔබට), never ඔයා, උඹ or තමුසෙ, in the interface, errors, notices, emails, the safety text and the guides alike,
as Google's Sinhala help writes ("ඔබේ Google ගිණුම විවෘත කරන්න.", "ඔබට ඔබේ උපාංගය අගුළු හැරීමට අවශ්‍ය වනු ඇත."). **Written
Sinhala, not the spoken forms**: statements end in the written verb (**වේ**, **ඇත**, **කරයි**, **-යි**, **-ය**), never the
spoken -නවා, තියෙනවා or ඕනෑ ("ග්ලේස් උණු වේ.", not "ග්ලේස් උණු වෙනවා."); but no archaic literary forms either (no -හ, -හු,
කරන්නේය): Google's plain modern written style. Short sentences, the plain word.

- **Buttons and menu commands:** the polite imperative in **-න්න**, verb last (Google): **සුරකින්න**, **මුද්‍රණය කරන්න**,
  **සසඳන්න**, **ඉවත් කරන්න**, **අවලංගු කරන්න**, **ද්‍රව්‍ය එක් කරන්න**. Not "කරුණාකර සුරකින්න" (no "please" in a button).
- **Instructions** (guides, help, hints): the same **-න්න** form: "ග්ලේස් එක 80 මෙෂ් පෙරහනකින් දෙවරක් පෙරන්න.", "ද්‍රව්‍ය කිරන
  විට රෙස්පිරේටරයක් පළඳින්න." "කරුණාකර" only where the English says please.
- **Errors:** short, saying what did not happen, never the computer in the first person: "වට්ටෝරුව සුරැකිය නොහැකි විය. නැවත
  උත්සාහ කරන්න.", "මෙම ගොනුව කියවිය නොහැක.", "සුරැකීම අසාර්ථක විය." (Google: "බාගත කළ නොහැක").
- **Notices:** plain statements: "මෙම පිටුව AI මගින් පරිවර්තනය කර ඇත. ඉංග්‍රීසි පිටුව කියවීමට මෙතැන බලන්න."
- **Guide sentences:** impersonal statements and -න්න steps: "ග්ලේස් තට්ටුව ඉතා ඝන නම් පිළිස්සීමේදී එය ගලා යයි.", "බිස්ක්
  භාණ්ඩවලට වහාම ග්ලේස් දැමිය හැකිය."
- **Must, should and may** stay apart, as the English has them:
  - "must" → **… යුතුය** ("රෙස්පිරේටරයක් පැළඳිය යුතුය"); a legal duty ("shall", "is required") → **… අනිවාර්ය වේ**. "must not"
    → **… නොකළ යුතුය** / **… නොයුතුය** ("වියළි ඉදල්ලෙන් අතුගා නොදැමිය යුතුය").
  - "should" → **… සුදුසුය** ("මුහුණු ආවරණයක් පැළඳීම සුදුසුය"); "should not" → **… නොකිරීම සුදුසුය** ("වියළිව අතුගෑම නොකිරීම
    සුදුසුය"). Never යුතුය for "should", never නොකළ යුතුය for "should not".
  - "may" (a hazard, a hedge that must survive) → **… විය හැකිය** / **… ඇති කළ හැකිය** ("පිළිකා ඇති කළ හැකිය", "මෙහි සියුම්
    ක්වාර්ට්ස් යම් ප්‍රමාණයක් තිබිය හැකිය"); "may" (permission) → **ඔබට … හැකිය** ("ඔබට දැන් ග්ලේස් දැමිය හැකිය"), with
    ඔබට, so that it reads as the reader's choice.
  - "must be tested" → **අනිවාර්යයෙන් පරීක්ෂා කළ යුතුය**: the test is done, not passed; never "පරීක්ෂණයෙන් සමත් විය
    යුතුය".
  - "some" (some fine quartz) → **යම් ප්‍රමාණයක්** before a mass noun (සියුම් ක්වාර්ට්ස් යම් ප්‍රමාණයක්) and **සමහර** before a
    countable plural (සමහර සාප්පු, සමහර ස්ටේන්), never **ස්වල්පයක්** or **ටිකක්** (a little), which are kept for the English's
    "a little". "never" → **කිසි විටෙක … නො-** only where the English says never.
  - "can" of a hazard or a fault ("the dust can contain", "can shiver") → **… විය හැකිය**, with the thing as the subject;
    "can" of a choice ("you can enter") → **ඔබට … හැකිය**. "will" is not "can": keep the English's certainty as it is.
  - "tend to" → **… නැඹුරුවක් ඇත**; "usually" → **සාමාන්‍යයෙන්**; "often" → **බොහෝ විට**; "mainly" → **ප්‍රධාන වශයෙන්**,
    never **පමණක්** ("only"); "about" → **පමණ** / **ආසන්න වශයෙන්**, never dropped. "unless … or …" keeps **හෝ**.

### Buttons, menus, headings, labels and tabs

- **Buttons and menu commands:** the -න්න form, verb last: සුරකින්න, මුද්‍රණය කරන්න, සසඳන්න, ඉවත් කරන්න, අවලංගු කරන්න,
  පිටපතක් ලෙස සුරකින්න. Turning a setting on and off: **ක්‍රියාත්මක කරන්න**, **ක්‍රියාවිරහිත කරන්න** (Google's title
  "දෙපියවර සත්‍යාපනය ක්‍රියාත්මක කරන්න"; the Wikipedia's "ක්‍රියා විරහිත කර"). "Turn off" is never **තෝරන්න** (choose), and
  "turn off the kiln" at the wall is **විදුලිය විසන්ධි කරන්න** only where the English says unplug or switch off at the wall.
- **Headings, tabs, page titles:** a noun phrase: "වට්ටෝරු", "සැකසීම්", "පිළිස්සුම් සටහන්", "කෝන් සහ හීට්වර්ක්". A heading
  that names an activity takes the verbal noun in **-ීම** (කිරීම, දැමීම): "Mixing the glaze" → "ග්ලේස් මිශ්‍ර කිරීම", "Typing
  amounts" → "ප්‍රමාණ ටයිප් කිරීම". A heading that is a question stays one: "ග්ලේස් ගලා යන්නේ ඇයි?"
- **Field labels:** a noun; the colon where the English has one, no space before it: "ද්‍රව්‍යයේ නම:".
- **Confirmations:** the label form, so nothing has to agree with the value: "Saved: {name}" → "සුරැකිණි: {name}"; "Removed" →
  "ඉවත් කෙරිණි".
- **Progress:** the verbal noun with the ellipsis: "Saving…" → "සුරකිමින්…".

### Capitalisation

Sinhala has no capitals; the English's Title Case and sentence case go with the English words. Emphasis in capitals
(CONTAINS LEAD, LEAD FRIT) has no equivalent: the warning starts with **සැලකිලිමත් වන්න:** ("Caution:") instead ("සැලකිලිමත්
වන්න: ඊයම් අඩංගුය"). Latin words inside Sinhala text keep the English's case where they are names, codes, units or formulas
(Orton, SK, Seger, UMF, LOI, Ferro 3134, N95, mg/m³, SiO₂). An English **loanword is written in Sinhala letters** (ග්ලේස්,
ෆ්‍රිට්, කිල්න්), never in Latin letters, unless it is a trade name, a trademark (Kiln-Sitter, Zircopax), a company or brand
(Google, Skutt), a code or a unit. A Latin word in a Sinhala sentence takes no ending: a Sinhala noun or a postposition
written apart carries it (see Placeholders and names).

### Script and spelling

- **Sinhala letters as the Sri Lankan standard (SLS 1134) writes them**, with the al-lakuna (්) on every bare consonant
  (ග්ලේස්, කිල්න්) and the vowel signs before (කෙ, කො), after (කා, කැ) and below (කු, කූ) the letter as Unicode orders them (the
  sign after the consonant in the file).
- **The ZWJ (U+200D) is correct spelling** in three places, and only there: the **yansaya** (ද්‍රව්‍ය, අවශ්‍ය, සෞඛ්‍ය:
  al-lakuna, ZWJ, ය), the **rakaransaya** (ෆ්‍රිට්, ක්‍රෝම්, ප්‍රතිශතය, ශ්‍රී: al-lakuna, ZWJ, ර) and the **touching letters**
  (a consonant, ZWJ, al-lakuna), which these pages do not need. Keep it there: without it ද්‍රව්‍ය breaks into ද් + ර + ව් + ය on
  screen. The i18n check accepts exactly these (`scripts/i18n-check.mjs`, JOINERS.si).
- **The repaya** (ර් over the next consonant, as in කර්මාන්තය, මාර්තු, ක්වාර්ට්ස්) is written **ර + ් + the consonant, with no
  ZWJ**. Unicode's named sequence for the repaya is ra, al-lakuna, ZWJ (0DBB 0DCA 200D, as the Unicode thread quotes it),
  and SLS 1134 encodes it so; but the Sinhala Wikipedia writes it without the ZWJ (in the eleven pages read: 59 repayas
  without, 1 with), Sinhala keyboards type it so, and the i18n check refuses a ZWJ there. So: no ZWJ in a repaya. Whether
  the app's fonts (Noto Sans Sinhala, Nirmala UI, Sinhala Sangam MN) draw ර්ම as a repaya or as ර් + ම is for the 320 px
  screenshot run to show; both read correctly.
- **Never a ZWNJ**, and no other invisible character (word joiner, direction marks); every file in Unicode form NFC, with
  only Sinhala and Latin letters (the script check).
- **Loanword spelling:** as the Sinhala Wikipedia writes the word where it does (සිලිකා, ඇලුමිනා, ඩොලමයිට්, ක්වාර්ට්ස්,
  ෆෙල්ඩ්ස්පාර්, පෝසිලේන්, සෙලඩොන්, රූටයිල්, සර්කෝන්, බොරැක්ස්), otherwise by the English sound with ෆ for f (ෆ්‍රිට්, ෆ්ලක්ස්),
  ඇ/ඈ for the English a in "cat" (ස්ටැබිලයිසර්), ඕ for "o" (කෝන්), and the long vowels where English has them (ග්ලේස්).
- **Latin text** inside Sinhala: units, formulas, trade names, codes and cone numbers exactly as the English writes them,
  with a space on each side where the English has one (10 g, 1222 °C, Orton කෝන් 6, SiO₂).
- **Digits** are 0 to 9 only (see Numbers and units).

### Punctuation

- **The full stop "."** ends a sentence (Google; the Wikipedia), with no space before it and one after. A heading, a
  button and a list item that is not a sentence end with nothing. Never the kundaliya ෴.
- **Comma, question mark, colon, semicolon** as in English, no space before them. No "!" in the app's own voice.
- **Quotation marks:** “ ” for quotations and for a word quoted (“බෝරෝන් නිල්”), ‘ ’ inside them (the Wikipedia: "1990 “සුව
  සැරිය”"). **UI names in running text** (buttons, tabs, settings) in single curly quotes: "‘සසඳන්න’ තෝරන්න". Never the
  straight ' around a name: before `{`, `}` or `#` ICU reads it as a quote (README).
- **Parentheses** as English, no space inside them.
- **Dashes:** the en dash for a range of figures, no spaces, as the English writes it (10–60%, කෝන් 06–04). Where the English
  has an em dash, a comma, a colon or a new sentence. The **hyphen** joins compounds the English hyphenates (ඩ්‍රොප්-ඇන්ඩ්-හෝල්ඩ්).
- **Ellipsis** "…" where the English has one.

### Numbers and units

- **The digits 0 to 9** wherever the English has digits (CLDR's `si` uses them, numbering system `latn`). Never the Sinhala
  Lith digits (෦ ෧ ෨ ෩ …, historical only), which the numbers check does not read; never spelled-out figures where the
  English has digits.
- **The decimal point and the English's figures as the English writes them:** 1.5; 0.025; 12,500; 1222 °C and 1000 g
  ungrouped. The app groups numbers in threes (1,234,567.5) when it prints them, as CLDR writes Sinhala; a translation
  writes only the English's figures, never ලක්ෂ or කෝටි for one ("12,500" stays 12,500, never "දොළොස් දහස් පන්සියය").
- **Percent:** 5%, no space (CLDR); a range 10–60%. "per cent" in words → **ප්‍රතිශතය** where the English writes the word.
- **Units:** the English's symbols in Latin letters, with the English's spacing: g, kg, mg, µg, mL, L, mm, cm, °C, °F, °Bé, %,
  mg/m³, µg/cm²; never ග්‍රෑ., කි.ග්‍රෑ., සෙ.මී. or සෙ.අ. (the Wikipedia's "සෙ.අ1200": the numbers check does not read them).
  Inches and feet are the words **අඟල්** and **අඩි**, before the figure as Sinhala counts, with the metric figure in brackets as
  the English gives it: "අඟල් 12 (30 cm)".
- **A number the English writes as a word** ("two coats", "three tiles", "once", "one number hotter") stays a word, since a
  digit would be a figure the English lacks and the check rejects it: "තට්ටු දෙකක්", "ටයිල් තුනක්", "එක් වරක්", "එක් අංකයක්
  වඩා උණුසුම්". Where the English has the digit, the digit stays: "3 coats" → "තට්ටු 3ක්".
- **Dates:** "14 ඔක්තෝබර් 2026", "ඔක්තෝබර් 2026": the day, the month named beside the year, the Gregorian calendar, as the
  Wikipedia's citations write it ("31 දෙසැම්බර් 2015"); never a Buddhist-era year (බුද්ධ වර්ෂ) or a Saka year. The month
  names are the Gregorian ones in Sinhala letters: ජනවාරි, පෙබරවාරි, මාර්තු, අප්‍රේල්, මැයි, ජූනි, ජූලි, අගෝස්තු,
  සැප්තැම්බර්, ඔක්තෝබර්, නොවැම්බර්, දෙසැම්බර්; never the traditional months (දුරුතු … වප්, ඉල්, උඳුවප්) that CLDR uses (see
  Choices).
- **Clock times:** the 24-hour clock with a colon, **20:00** (not CLDR's 20.00), with **ට** or **දක්වා** after it as the sentence
  needs ("20:00 දක්වා"). "8am to 8pm" → "08:00 සිට 20:00 දක්වා"; "8 to 5" (hours) → "8:00 සිට 17:00 දක්වා" only where the English
  gives clock times. Never ප.ව. or පෙ.ව., and never උදේ, දවල්, හවස or රෑ with a 12-hour figure ("රෑ 8ට"), which the check reads
  as 8. "24 hours" → "පැය 24 පුරා"; "24/7" stays 24/7.
- **No figures the English lacks:** no Sinhala Lith digits, no ලක්ෂ or කෝටි, no Buddhist-era years, no SK or Orton
  equivalents, no converted units, no SLS numbers where the English names none.

### Plural forms

CLDR gives Sinhala two cardinal categories: `new Intl.PluralRules('si').resolvedOptions().pluralCategories` is
`[ 'one', 'other' ]`. **`one` covers 0 and 1** (like Hindi); 0.5, 1.5, 2, 21 and 100 are `other`.

| Category | Numbers              | Example                                                        |
| -------- | -------------------- | -------------------------------------------------------------- |
| `one`    | 0, 1                 | ද්‍රව්‍ය 0ක්, ද්‍රව්‍ය 1ක්, වට්ටෝරු 1ක්, තට්ටු 1ක්, ග්ලේස් 1ක් |
| `other`  | 0.5, 1.5, 2, 21, 100 | ද්‍රව්‍ය 2ක්, තට්ටු 3ක්, වට්ටෝරු 21ක්, ග්ලේස් 5ක්, ෆ්‍රිට් 3ක් |

**Sinhala counts with the noun first and the figure after it, with -ක්** (CLDR: "දින 3කට පෙර"): the noun stands in its plural
(stem) form for every number, so the `one` and `other` forms are usually the same and read right for 0:
`{count, plural, one {# material} other {# materials}}` → `{count, plural, one {ද්‍රව්‍ය #ක්} other {ද්‍රව්‍ය #ක්}}`. The `one`
form keeps `#` (it must read right for 0). Where the English's `one` has no `#` ("this passkey", "it"), give an **`=1`** form
for exactly one and a `one` form with `#`: `{count, plural, =1 {මෙම මුරයතුර} one {මුරයතුරු #ක්} other {මුරයතුරු #ක්}}` (the
check asks for it). `=0 {…}` stays where the English has it.

The case goes on the figure's -ක් ending, never on the noun: "තට්ටු #කින්" (with # coats), "දින #කට පසු" (after # days),
"ද්‍රව්‍ය #ක" (of # materials). The noun's plural is its stem:

| Noun                 | Singular (definite) | After a figure      | With a case    |
| -------------------- | ------------------- | ------------------- | -------------- |
| ද්‍රව්‍යය (material) | ද්‍රව්‍යය           | ද්‍රව්‍ය #ක්        | ද්‍රව්‍ය #කින් |
| තට්ටුව (coat)        | තට්ටුව              | තට්ටු #ක්           | තට්ටු #කින්    |
| වට්ටෝරුව (recipe)    | වට්ටෝරුව            | වට්ටෝරු #ක්         | වට්ටෝරු #ක     |
| ටයිල් (tile)         | ටයිල් එක            | ටයිල් #ක්           | ටයිල් #කින්    |
| ග්ලේස් (glaze)       | ග්ලේස් එක           | ග්ලේස් #ක්          | ග්ලේස් #ක      |
| ෆ්‍රිට් (frit)       | ෆ්‍රිට් එක          | ෆ්‍රිට් #ක්         | ෆ්‍රිට් #කින්  |
| කෝන් (cone)          | කෝන් එක             | කෝන් #ක්            | කෝන් #කට       |
| සටහන (record)        | සටහන                | සටහන් #ක්           | සටහන් #ක       |
| පැය (hour)           | පැය                 | පැය #ක්             | පැය #කට පසු    |
| විනාඩිය, දිනය        | විනාඩිය, දිනය       | විනාඩි #ක්, දින #ක් | දින #කට පසු    |
| කේතය (code)          | කේතය                | කේත #ක්             | කේත #කින්      |
| මුරයතුර (passkey)    | මුරයතුර             | මුරයතුරු #ක්        | මුරයතුරු #ක    |
| ඔක්සයිඩය (oxide)     | ඔක්සයිඩය            | ඔක්සයිඩ #ක්         | ඔක්සයිඩ #ක     |
| ගැළපීම (match)       | ගැළපීම              | ගැළපීම් #ක්         | ගැළපීම් #කින්  |

**Loanwords** (ග්ලේස්, ෆ්‍රිට්, කෝන්, ටයිල්) are inanimate and do not change for the plural; in running text their oblique plural
takes **-වල** ("ග්ලේස්වල", "කෝන්වල") and the definite singular **එක** written apart ("ග්ලේස් එක") where Sinhala needs one;
written Sinhala uses එක sparingly, so prefer a sentence that needs none ("ග්ලේස් උණු වේ."). **Things are inanimate**
(අප්‍රාණවාචී), so their verbs do not mark gender. A weight or temperature takes no noun: `{n} g`.

### Placeholders and names

Sinhala joins its case endings to the word (-ට, -හි, -යේ, -වලින්, -ගේ), and the ending changes the word (ශ්‍රී ලංකාව →
ශ්‍රී ලංකාවේ); a placeholder or a Latin name cannot take that change. Three ways, in this order:

- **A generic noun after the placeholder**, so the ending goes on a Sinhala word whatever the value: "{name} නම් වට්ටෝරුව
  සුරැකිය නොහැකි විය"; "{name} නම් ද්‍රව්‍යය තවදුරටත් නිෂ්පාදනය නොකෙරේ"; "{library} සංග්‍රහයේ".
- **The label form**, the value after a colon: "Who to call in {region}" → "{region}: අමතන්න"; "Saved: {name}" → "සුරැකිණි:
  {name}"; "Shops in {region}" → "සාප්පු: {region}".
- **A postposition written apart**, which takes no change: **තුළ** (in), **සඳහා** (for), **වෙත** (to), **මගින්** (by),
  **සමඟ** (with), **පමණ** (about): "{region} තුළ", "{name} සඳහා", "{count} දක්වා".

`{region}` is a country's or region's name in Sinhala from the browser (ශ්‍රී ලංකාව, ඉන්දියාව, එක්සත් ජනපදය, එක්සත් රාජධානිය,
ජර්මනිය, ජපානය; Hong Kong is "හොංකොං විශේෂ පරිපාලන කලාපය චීනය", a region, not a country): never "{region} රට" or any word for
country beside it; where a noun is needed, **ප්‍රදේශය** (area) only if the English says region. A number placeholder
(`{count}`, `{n}`, `#`) is a figure, and Sinhala writes the counting ending straight after a figure: "ද්‍රව්‍ය {count}ක්",
"දින {n}කට පසු", as after a digit ("දින 3කට පෙර", CLDR). A name placeholder takes nothing. A trade name in
Latin letters is the same as a placeholder: "Ferro 3134 නම් ෆ්‍රිට් එක", "Ferro 3134 තුළ".

### Cones

Sri Lanka fires by temperature by default; where the reader chooses cones, Orton cones are written **Orton** in Latin letters
wherever the English says Orton, beside **කෝන්** (the potters' word as Indian shops print it, "Orton Cones"; the geometric
cone is කේතුව, given in brackets at the first use in each guide section: "කෝන් (තාප මිනුම් කේතුව)"): "Orton කෝන් 6", "කෝන්
06", "Orton කෝන්". **SK cones** are written SK with the number as printed (SK 6a) where the English has them. **Seger** is
written **Seger** in Latin letters only where the English says Seger: the firing guide's older European Seger cones (Seger
කෝන්) and the **Seger සූත්‍රය** (the unity molecular formula, UMF), which is another thing and never names a cone. Never give
an SK number for an Orton number or the reverse, nor say they are equal, nor add a cone to "mid fire" or "high fire" where
the English has none.

- **One number hotter, one number cooler:** **"එක් අංකයක් වඩා උණුසුම්"** and **"එක් අංකයක් වඩා සිසිල්"** (the guard cone is
  "එක් අංකයක් වඩා උණුසුම් කෝන් එක"); never ඉහළ, පහළ, වැඩි or අඩු for a cone: cone 05 is cooler than 04 ("කෝන් 05, කෝන් 04ට
  වඩා එක් අංකයක් සිසිල්ය").
- **cone 06** is written 06 with its zero; never 6.
- "pyrometric cone" at a definition → "පයිරෝමිතික කෝන් (තාප මිනුම් කේතුව)"; not කේතුව alone in running text.

### The unity formula

**Seger සූත්‍රය (UMF)**: written so at its first use in each guide section and in the setting, "Seger සූත්‍රය" afterwards. The
app's short "Unity formula" is "Seger සූත්‍රය", the label "Unity:" is "Seger:". "unity" as the scaling is **යුනිටි**, explained
once as "ෆ්ලක්ස්වල එකතුව එකක් ලෙස ගෙන" (එකක් as a word: the English has no digit). The three columns: ග්ලාස් ෆෝමර් (RO₂),
ස්ටැබිලයිසර් (R₂O₃), ෆ්ලක්ස් (R₂O සහ RO). "formula" alone in a chemical sense is **සූත්‍රය** (the Wikipedia's "රසායනික
සූත්‍ර"); a glaze recipe is **වට්ටෝරුව**: never සූත්‍රය for a recipe. Where the English names both ("unity molecular formula,
also called the Seger formula"): "යුනිටි අණුක සූත්‍රය, Seger සූත්‍රය ලෙසද හැඳින්වේ". No established Sinhala name for the UMF
was found (No source; Native check).

### Gender-neutral wording

Sinhala's written verbs can mark the subject's gender in the third person (ඔහු කළේය, ඇය කළාය); with ඔබ, imperatives and
passives they do not, so:

- **The reader** is ඔබ, with -න්න steps and "ඔබට … හැකිය"; nothing marks the reader's gender.
- **People in general** are named by role or in the plural (පරිශීලකයා, පුද්ගලයා, සෙරමික් ශිල්පීන්, සේවකයින්, ජනතාව), with
  **ඔවුන්** for "they" and the modern written verb, which does not mark gender ("සෙරමික් ශිල්පීන් බොහෝ විට … භාවිත කරයි",
  or a passive), not the literary plural (කරති) or a gendered past (කළේය, කළාය). Never ඔහු or ඇය for a generic person.
- **"potter"** is **සෙරමික් ශිල්පියා** (Choices); never a gendered form (කුඹල් කාන්තාව) or කුඹල්කරු where the English means
  studio potters.
- **Things, materials, companies and agencies** take the inanimate forms: "Orton පවසයි", "HSE නිර්දේශ කරයි", "ග්ලේස් උණු
  වේ". A named person takes the plain verb ("Derek Au පවසයි").

### The reader in the guides

ඔබ where the sentence needs a subject; steps are -න්න instructions; explanations are impersonal ("ග්ලේස් තට්ටුව ඉතා ඝන නම්
ගලා යයි"). Short plain sentences, as the English, one Sinhala sentence for one English sentence where Sinhala allows.
Quotations from sources are translated into “…” and keep their figures as the English writes them. **The bracketed Sinhala
term** (the tier 1 and 2 rows below that give one) goes right after the loanword at its **first use in each guide section**,
before the `{{en: …}}` mark where the term has one: "ග්ලේස් (ඔපය){{en: glaze}}", "ෆ්ලක්ස් (උණු කාරකය){{en: flux}}", "කිල්න්
(පෝරණුව)". Never in a button, a label, a tab, a table heading or a short message of the JSON files; in the glossary of
glazing-basics (the definition list), each term line may give it once. After the first use in a section, the loanword
alone.

### The app's feature names

Written exactly as on the button or tab; in running text in single curly quotes, ‘…’, unless the English wraps the name in
`<b>` or another tag: then the tag, without quotes. A name takes no case ending: attach a generic noun (විකල්පය, ටැබය, පිටුව,
පහසුකම) and give the ending to that: "‘සසඳන්න’ විකල්පය තෝරන්න", "‘මගේ ද්‍රව්‍ය’ ටැබයේ", "‘ඊයම් ආදේශ කරන්න’ පහසුකම". "Settings"
in running text is **සැකසීම්** (Google: "පෞද්ගලිකත්ව සැකසීම්"); inside `<settings>…</settings>` write the word with the ending
the sentence needs ("<settings>සැකසීම්වල</settings>").

| English                       | Sinhala (button, label)      | In running text                              |
| ----------------------------- | ---------------------------- | -------------------------------------------- |
| Compare                       | සසඳන්න                       | සැසඳීම; ‘සසඳන්න’ පහසුකම                      |
| Suggest amounts (and compare) | ප්‍රමාණ යෝජනා කරන්න (සසඳන්න) | ‘ප්‍රමාණ යෝජනා කරන්න’ පහසුකම                 |
| Match with what I have        | මා සතු දේවලින් ගළපන්න        | ‘මා සතු දේවලින් ගළපන්න’ පහසුකම               |
| Replace lead                  | ඊයම් ආදේශ කරන්න              | ‘ඊයම් ආදේශ කරන්න’ පහසුකම                     |
| Settings                      | සැකසීම්                      | සැකසීම්                                      |
| Notebook                      | සටහන් පොත                    | ස්ටුඩියෝ සටහන් පොත                           |
| Notes (the menu and page)     | සටහන්                        | ‘සටහන්’ පිටුව; never සටහන් පොත               |
| Library                       | සංග්‍රහය                     | ද්‍රව්‍ය සංග්‍රහය                            |
| Standard                      | සම්මත                        | සම්මත ද්‍රව්‍ය                               |
| My materials                  | මගේ ද්‍රව්‍ය                 | ‘මගේ ද්‍රව්‍ය’ ටැබය                          |
| Trial                         | අත්හදා බැලීම                 | අත්හදා බැලීම                                 |
| Guides                        | මාර්ගෝපදේශ                   | මාර්ගෝපදේශය (each of the five), never අත්පොත |

### Law in Sri Lanka

As the law writes it, never paraphrased: the words below are fixed, and the region texts must use them. No Sinhala text of
the Factories Ordinance, its regulations, the Consumer Affairs Authority Act or an SLS standard could be read (see Not
reached); the limit words are those of the Penal Code's Sinhala text as the Sinhala Wikipedia quotes it (section 365: "වසර
දහයකට නොඅඩු සහ අවුරුදු විස්සක් නොඉක්මවන"). The region data cites the English titles; a Sinhala title is given once beside it.

- **Limits:** "at most", "no more than", "up to" → **උපරිම** or **… නොඉක්මවන** (the limit itself passes), in the safety,
  regions and records files and the guides alike: "up to 25% nepheline syenite" in a hazard line → "උපරිම 25%", "no deeper
  than 25 mm" → "ගැඹුර 25 mm නොඉක්මවන". **දක්වා** only where "up to" is no limit: a usage range ("60% දක්වා භාවිත වේ"), a
  temperature reached ("කෝන් 6 දක්වා පුළුස්සන්න"), a time ("{date} දක්වා"). "less than", "under", "below" → **… ට වඩා අඩු** (it
  does not reach it); "at least", "or more" → **අවම වශයෙන්** or **… ට නොඅඩු**; "more than", "over", "above", "exceeding" →
  **… ට වඩා වැඩි** / **… ඉක්මවන**. Never "ට වඩා අඩු" for "at most", never "ඉක්මවන" (exceeding) for "at least" or "at most": a
  slip moves a legal limit. Check every one in the food-contact, silica and mask texts. **Native check** (no Act read).
- **Comparisons:** "more than 400 °F cooler" → "400 °F කට වඩා වැඩියෙන් සිසිල්", "off by more than 25 °F" → "25 °F කට වඩා වැඩියෙන්
  වෙනස් විය හැකිය". A **range** (a cone range, a firing range, a limit set's range for an oxide) is **පරාසය** (පිළිස්සුම් පරාසය,
  Seger සූත්‍ර පරාස), never **සීමාව**, which is a limit. The recipe's status labels say where the glaze sits against the range:
  **පරාසය තුළ**, **පරාසයට වඩා අඩු**, **පරාසයට වඩා වැඩි**, **පරාසයට වඩා බෙහෙවින් අඩු**, **පරාසයට වඩා බෙහෙවින් වැඩි**; never a bare
  **පහළ** or **ඉහළ**, which read as "see below / above".
- **The Factories Ordinance** (No. 45 of 1942) → **කම්හල් ආඥාපනත** (No source: no Sinhala text read; a plain rendering, the
  English title beside it at first use). An exposure limit → **නිරාවරණ සීමාව**; "We found no national limit" → "ජාතික සීමාවක්
  අපට හමු නොවීය". Respirable dust → **ආශ්වාස කළ හැකි දූවිලි**; crystalline silica → **ස්ඵටිකරූපී සිලිකා**; silicosis →
  **සිලිකෝසිස්** (2.7).
- **Masks:** Sri Lanka has no mask standard in the region data; the English's N95, FFP2 and the rest are kept as written.
  **ශ්‍රී ලංකා ප්‍රමිති ආයතනය (SLSI)** (Wikipedia (si)) only where the English names it.
- **Food contact:** the **Consumer Affairs Authority Act, No. 9 of 2003** → **පාරිභෝගික කටයුතු පිළිබඳ අධිකාරිය පනත** (Wikipedia
  (si)), only where the English names it; the region data shows no food-contact rule for Sri Lanka. The English's food-contact
  categories are written plainly (2.9).
- **GHS:** no Sinhala GHS label text was found. The words in 2.7 (අන්තරාය, අවවාදය, අනතුරු ප්‍රකාශය, වර්ගීකරණය කර නැත) are best
  choices; **Native check**.
- **Who to call:** **1990 සුවසැරිය** (1990: "1990 සුවසැරිය"; the Wikipedia writes "1990 “සුව සැරිය”"), the national ambulance
  service, free, around the clock: "1990 සුවසැරිය ගිලන් රථ සේවය"; police **119** ("පොලිස් හදිසි ඇමතුම් අංකය", the Wikipedia's
  "119 (හදිසි සේවා අංකය)"); fire **110** ("ගිනි නිවීමේ සේවය"). **No poison line is shown** for Sri Lanka (LK data): never a number
  the English lacks. A poison line in general is **විෂ තොරතුරු සේවය**, a poison centre **විෂ තොරතුරු මධ්‍යස්ථානය** (No source).
  Bodies: **සෞඛ්‍ය හා ජනමාධ්‍ය අමාත්‍යාංශය** (Ministry of Health and Mass Media, Health LK); **ජාතික වෘත්තීය සුරක්ෂිතතා සහ සෞඛ්‍ය
  ආයතනය (NIOSH)** (NIOSH LK); **කම්කරු දෙපාර්තමේන්තුව** (Department of Labour).
- **EU law**, where the English names it (Directive 84/500/EEC, Directive (EU) 2017/2398, CLP): there is no Sinhala text that
  binds in Sri Lanka; write **යුරෝපා සංගමයේ (EU) විධානය 84/500/EEC**, **CLP රෙගුලාසිය (EC) No 1272/2008**, with the number
  kept, so that the 3 L still applies only to packaging and storage vessels. Indian law (the OSH Code, IS 9473) likewise:
  "ඉන්දියාවේ" with the English name and number. US and UK bodies keep their English names with a Sinhala gloss once: OSHA
  (එක්සත් ජනපදයේ වෘත්තීය සුරක්ෂිතතා ආයතනය), HSE (බ්‍රිතාන්‍යයේ සෞඛ්‍ය හා සුරක්ෂිතතා ආයතනය): "the UK's HSE" → "බ්‍රිතාන්‍යයේ HSE".

### Agencies, organisations and companies

- **Agencies, organisations, companies, makers, suppliers and websites** take the inanimate verb: "HSE පවසයි", "FDA අනතුරු
  අඟවයි", "Orton පවසයි", "Dawson නිර්දේශ කරයි", "Potclays විකුණයි", "Glazy පෙන්වයි".
- Glosses, once per guide: NHS (බ්‍රිතාන්‍යයේ රජයේ සෞඛ්‍ය සේවය), CDC (එක්සත් ජනපදයේ රෝග පාලන ආයතනය), FDA (එක්සත් ජනපදයේ ආහාර හා
  ඖෂධ ආයතනය), EPA (එක්සත් ජනපදයේ පරිසර ආරක්ෂණ ආයතනය), IARC (ලෝක සෞඛ්‍ය සංවිධානයේ පිළිකා පර්යේෂණ ආයතනය), ECHA (යුරෝපීය රසායන
  ද්‍රව්‍ය ආයතනය). No source for the glosses; they describe, they are not official names.

### Pitfalls

- **ග්ලේස්, ඔපය, එනමල්, වාර්නිෂ්, තීන්ත:** a glaze is **ග්ලේස්** (the material and the coat); to glaze **ග්ලේස් දැමීම**; glazed
  **ග්ලේස් දැමූ**. **ඔපය** (the bracket) also means polish and a shine (gems, brass): never ඔපය alone for a glaze in running text
  after its first use. Enamel (on metal) is **එනමල්**, varnish **වාර්නිෂ්**, paint **තීන්ත**: none is a glaze. Bare ග්ලේස් on
  the web is a cake glaze (Google suggest): titles say **සෙරමික් ග්ලේස්**.
- **ෆ්‍රිට් and ෆ්ලක්ස්:** a frit is **ෆ්‍රිට්** (a factory glass); a flux is **ෆ්ලක්ස් (උණු කාරකය)** (the oxide's role). Never
  **ද්‍රාවකය** for a flux: in Sinhala chemistry it is a solvent. Not soldering flux, not magnetic flux (චුම්බක ස්‍රාවය).
- **කිල්න්, පෝරණුව, උඳුන, ඕවනය:** a potter's kiln is **කිල්න් (පෝරණුව)** (see Choices); **ගඩොල් පෝරණුව** is a brick kiln, **පාන්
  පෝරණුව** a bakery oven, both only where the English says so; **උඳුන** is a stove, a hearth or a furnace; **ඕවනය** a kitchen
  oven, used only where the English says oven.
- **බිස්ක්, බිස්කට්, අමු:** **බිස්ක්** is the first firing and its ware (බිස්ක් පිළිස්සීම, බිස්ක් භාණ්ඩ), never **බිස්කට්** (a
  biscuit). Unfired ware is **අමු භාණ්ඩ** (the Wikipedia's "නොපුළුස්සන ලද "අමු" කුඹල් භාණ්ඩ", Puwath's "අමු මැටි"); a material
  not calcined or fritted is also **අමු** (අමු වයිටින්, අමු ඊයම්), and a shop's raw materials are **අමුද්‍රව්‍ය**. Never අමු for
  bisque, never බිස්ක් for unfired ware.
- **අර්තන්වෙයාර්, ටෙරාකොටා, ස්ටෝන්වෙයාර්, පෝසිලේන්, පිඟන් මැටි, සෙරමික්:** earthenware is **අර්තන්වෙයාර් (මැටිබඳුන්)**; **ටෙරාකොටා**
  is the red, usually unglazed low-fired ware, only where the English says terracotta (the Wikipedia equates මැටි භාණ්ඩ and
  terracotta); stoneware is **ස්ටෝන්වෙයාර් (අර්ධ වීදුරුමය භාණ්ඩ)** (the Wikipedia's "අර්ධ-වීදුරුමය (stoneware)"); porcelain is
  **පෝසිලේන් (සිරිමැටි)**. **පිඟන් මැටි** means ceramics in general (the Wikipedia's "සෙරමික් (පිඟන් මැටි)", "පිඟන් මැටි
  කර්මාන්තය") and also china clay (the Wikipedia's "කිරිමැටි හෙවත් පිඟං මැටි", Boralesgamuwa's "පිඟන් මැටි නිධිය"): never used
  for one ware or for kaolin. Ceramics in general is **සෙරමික්**; kaolin is **කෙයොලින් (කිරිමැටි)**, never පිඟන් මැටි.
- **සිලිකා, සිලිකන්, සිලිකොන්, වැලි:** silica is the oxide **සිලිකා** (SiO₂); the element is **සිලිකන්**; silicone rubber is
  **සිලිකොන්**: never සිලිකන් for silica. Sand is **වැලි** ("සිලිකා වැලි" is silica sand).
- **වයිටින්, හුණු, හුණුගල්, හුණු කූරු:** whiting is **වයිටින් (කැල්සියම් කාබනේට්)**; **හුණු** is lime (CaO and slaked lime,
  and the lime eaten with betel), **හුණුගල්** limestone, **හුණු කූරු** chalk. None is used for whiting; "lime" in a frit's name is
  හුණු only there ("සෝඩා-පොටෑෂ්-හුණු ෆ්‍රිට්").
- **බෝරෝන්, බොරැක්ස්, බෝරික් අම්ලය:** B₂O₃ is **බෝරෝන් (B₂O₃)**, formally බෝරෝන් ඔක්සයිඩ්; borax is **බොරැක්ස්**; boric acid is
  **බෝරික් අම්ලය** (all Wikipedia (si)). In the safety text, name each as the English does.
- **පොටෑෂ් and සෝඩා:** "potash" (K₂O) is **පොටෑෂ් (K₂O)**, formally පොටෑසියම් ඔක්සයිඩ්; in Sri Lanka පොටෑෂ් is also the fertiliser
  (the Wikipedia's "මියුරියේට් ඔෆ් පොටෑෂ්"), so the oxide is always written with K₂O at its first use in a section. The safety
  guide's potash (potassium carbonate) is **පොටෑසියම් කාබනේට්**. "soda" (Na₂O) is **සෝඩා (Na₂O)**, formally සෝඩියම් ඔක්සයිඩ්;
  soda ash is **සෝඩා අළු** (Wikipedia (si)); **රෙදිසෝඩා** is washing soda and **බේකින් සෝඩා** baking soda, neither meant here.
- **ඊයම් and ටින්:** lead is **ඊයම් (Pb)**; tin is **ටින්** (Wikipedia (si)), also a tin can in everyday Sinhala: tin oxide is
  always **ටින් ඔක්සයිඩ්**. Check every one: a slip here changes a safety statement.
- **සර්කෝන් and ජාගුන්:** the opacifier zircon (ground zirconium silicate) is **සර්කෝන්** (the Wikipedia's "සර්කෝන්"); **ජාගුන්**
  is the gemstone zircon, famous in Sri Lanka (the langlink of the English article): never used here.
- **ස්ටේන් and කලරන්ට්:** a stain (factory-made) is **ස්ටේන් (සකස් කළ වර්ණය)**: ස්ටේන් is also a mark or dirt. A colorant (any
  oxide that colours) is **කලරන්ට් (වර්ණ කාරකය)**; a pigment in the general sense is **වර්ණකය** (Wikipedia (si)).
- **රෙස්පිරේටරය, වෙන්ටිලේටරය, වාතාශ්‍රය:** a respirator is **රෙස්පිරේටරය (දූවිලි පෙරන ශ්වසන ආවරණය)** at first use, then
  රෙස්පිරේටරය; a hospital ventilator is **කෘත්‍රිම ශ්වසන යන්ත්‍රය (වෙන්ටිලේටරය)**, never meant here; ventilation of a room is
  **වාතාශ්‍රය**; LEV keeps the loanword (2.7). A surgical or cloth mask is **මුහුණු ආවරණය** (the Wikipedia's "මුහුණු ආවරණ"),
  not a respirator.
- **මාර්ගෝපදේශය and අත්පොත:** the app's five guides are **මාර්ගෝපදේශය**; a kiln's, controller's or sitter's manual is
  **අත්පොත**. Never the same word. A maker's, supplier's or school's own "guide" is **ලිපිය** (an article), **පොත් පිංචය** (a
  booklet) or **ලේඛනය** (a document), never මාර්ගෝපදේශය; "a guide, not a prediction" → "එය සටහනක් පමණි, අනාවැකියක් නොවේ".
  **ගයිඩ් කෝන්** (guide cone) is a cone's name and stays.
- **ක්‍රේසිං and ක්‍රැකල්:** crazing is **ක්‍රේසිං** (a defect); crackle is **ක්‍රැකල්** (wanted); a crack through the pot from
  heating or cooling is **ඩන්ටිං**.
- **විශිෂ්ට ගුරුත්වය and ඝනත්වය:** specific gravity is **විශිෂ්ට ගුරුත්වය**, a ratio with no unit (1.45); **ඝනත්වය** is density in
  kg/m³ or g/cm³ and is never used for a glaze's SG figure; never a litre weight, another measure.
- **ලීචිං:** leaching is **ලීචිං (ලෝහ කාන්දු වීම)**; the leach test is a test of the metals a fired piece releases, not
  narrowed to lead and cadmium.
- **ද්‍රාවණය වීම and උණු වීම:** soluble, insoluble, solubility and dissolve are **ද්‍රාව්‍ය**, **අද්‍රාව්‍ය**, **ද්‍රාව්‍යතාව**,
  **ද්‍රාවණය වීම** ("low-solubility frit" → "ද්‍රාව්‍යතාව අඩු ෆ්‍රිට්"); melt is **උණු වීම** ("low-melting" → "අඩු උෂ්ණත්වයකදී උණු
  වන"). Never **දිය වීම**, which means both. A low-solubility lead frit is not a low-melting one: a slip here (made in Kannada
  in round 8) changes a safety statement.
- **මැට් and මැටි:** matte is **මැට් (නොදිලිසෙන)**; **මැටි** is clay. One letter apart: the Wikipedia's tile article wrote "මැටි
  ෆිනිෂ් ටයිල්" for a matt finish. Check every one.
- **ස්ටැබිලයිසර්, සස්පෙන්ඩර්, කුකී, ප්ලාස්ටික්, ලෙඩ්:** loanwords that mean something else in Sri Lanka (a voltage stabiliser,
  braces, a biscuit, the polymer; ලෙඩ් is LED and also a common word for illness, ලෙඩ): see their rows for the wording that
  avoids them. Lead is never ලෙඩ්.
- **Placeholders:** see Placeholders and names.

### Search terms (docs/seo-plan.md, item 9)

Google's suggestions for Sri Lanka (hl=si, gl=LK, web and YouTube, 22 October 2026) show that Sri Lankans search for studio
glazes in English, in Latin letters: **pottery sri lanka**, **ceramics sri lanka**, **pottery workshop sri lanka**, **pottery
class sri lanka**, **pottery classes colombo for adults**, **ceramic glaze sri lanka**, **pottery glaze sri lanka**, **cone 6
temperature celsius**, **cone 6 glazes**, and the definitions **glaze meaning in sinhala** and **kiln meaning in sinhala**.
In Sinhala letters, **පෝරණුව** completes to "විදුලි පෝරණුව", "මැටි පෝරණු", "ගඩොල් පෝරණුව", "පෝරණුව හදන හැටි"; **පිඟන් මැටි** to
"පිඟන් මැටි කර්මාන්තය", "පිඟන් මැටි භාණ්ඩ"; **මැටි භාණ්ඩ** to "මැටි භාණ්ඩ නිෂ්පාදනය", "මැටි භාණ්ඩ පින්තාරු කිරීම"; **සෙරමික්** to
"සෙරමික් කලාව", "සෙරමික් භාණ්ඩ", tiles and sinks; **කුඹල්** to "කුඹල් කර්මාන්තය"; **ග්ලේස්** only to "චොක්ලට් ග්ලේස්"; **කිල්න්**,
**ෆ්‍රිට්**, **කේඕලින්** and **සිලිකෝසිස්** to nothing; **විශිෂ්ට ගුරුත්වය** to school physics. **Proposed title**: "Glazecalc:
සෙරමික් ග්ලේස් ගණකය, සෙරමික් ශිල්පීන්ට නොමිලේ" (ගණකය for calculator; Native check). **Description terms:** සෙරමික් ග්ලේස්
වට්ටෝරු, මැටි භාණ්ඩ, පිඟන් මැටි කර්මාන්තය, විදුලි පෝරණුව, ෆ්‍රිට්, ෆෙල්ඩ්ස්පාර්, කෝන් 6, Seger සූත්‍රය (UMF), and the English
"glaze calculator" once in brackets, since that is what Sri Lankan potters type. Every Sinhala title and description that
says ග්ලේස් carries සෙරමික් or මැටි භාණ්ඩ with it.

## 2. Glossary

"show English" marks the terms whose English a reader can ask to see after them (`<en>…</en>`, `{{en: …}}`). **Tier** in the
Notes: 1 craft loanword, 2 material by its bag name, 3 school chemistry and physics, 4 plain Sinhala and the law (see the
opening). A term in brackets after the Sinhala is the Sinhala term for the guides' first use per section (see The reader in
the guides). Sinhala marks no grammatical gender on things: every loanword is inanimate (අප්‍රාණවාචී), keeps its form in the
plural and takes -වල in the oblique plural ("ග්ලේස්වල", "කෝන්වල"), so the rows give no gender. **Usage**: the word Sinhala
articles or Google's suggestions use, in no Sinhala teaching source; **No source**: a best choice with no Sinhala source;
**Native check**: a Sinhala-speaking potter should confirm it.

### 2.1 Glaze and its chemistry

| English                                      | Sinhala                                                            | Notes                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze                                        | ග්ලේස් (ඔපය); to glaze ග්ලේස් දැමීම (ඔප දැමීම); glazed ග්ලේස් දැමූ | **show English**. Tier 1. Wikipedia (si) (බිම් ගඩොල්: "එක්වරක් ග්ලේස් දැමූ ටයිල්", "ඔප දැමීම් අංශය"; සෙරමික්: "ඔප දමන ලද හෝ ඔප නොදමන ලද"). Unglazed: ග්ලේස් නොදැමූ. Not window glazing, varnish or a cake glaze. **Native check** (Choices).                               |
| glass former                                 | ග්ලාස් ෆෝමර් (වීදුරු සාදකය)                                        | **show English**. Tier 1. No source. The RO₂ column, silica (the Wikipedia: "සිලිකා යනු … ඔක්සයිඩය"). UI "ග්ලාස් ෆෝමර් - RO₂". Native check.                                                                                                                               |
| flux                                         | ෆ්ලක්ස් (උණු කාරකය)                                                | **show English**. Tier 1. No source for the bracket (a plain coinage: "what makes it melt"). Never ද්‍රාවකය (solvent). Also a category ("ෆ්ලක්ස්"), "ෆ්ලක්ස් කිරීමේ හැකියාව" (fluxing power), "ප්‍රබල ෆ්ලක්ස් එකක්". Native check.                                         |
| stabilizer                                   | ස්ටැබිලයිසර් (ස්ථායීකාරකය)                                         | **show English**. Tier 1. Wikipedia (si) (ස්ථායීකාරක, of food and of mood). In Sri Lankan homes a ස්ටැබිලයිසර් is a voltage stabiliser: in running text "ග්ලේස්හි ස්ටැබිලයිසර්" or "ස්ටැබිලයිසර් ඔක්සයිඩය" at first use. UI "ස්ටැබිලයිසර් - R₂O₃".                         |
| oxide                                        | ඔක්සයිඩය (plural ඔක්සයිඩ); in names ඔක්සයිඩ්                       | Tier 3. Wikipedia (si) ("අයන්(III) ඔක්සයිඩය", "නයිට්‍රජන් ඔක්සයිඩ", "සින්ක් ඔක්සයිඩ්"). Formulas never translated; the app's two names: formal "කැල්සියම් ඔක්සයිඩ්", the potters' "කැල්සියම්".                                                                             |
| R₂O and RO                                   | R₂O සහ RO                                                          | Symbols kept. UI "ෆ්ලක්ස් - RO".                                                                                                                                                                                                                                           |
| alkali, alkaline                             | ක්ෂාර; alkaline ක්ෂාරීය                                            | Tier 3. Wikipedia (si) (ක්ෂාර ලෝහ, ක්ෂාරීය පාංශු ලෝහ). "ක්ෂාරීය ෆ්‍රිට්" (alkaline frit), "ක්ෂාරීය තඹ නිල්", "ක්ෂාර බොහෝ ප්‍රමාණයක්". Here the R₂O oxides, not the pH sense.                                                                                               |
| unity molecular formula (UMF)                | Seger සූත්‍රය (UMF)                                                | **show English**. Tier 3. No Sinhala name found; Native check. Seger in Latin letters (Choices); සූත්‍රය as Wikipedia (si) ("රසායනික සූත්‍ර"). "Seger සූත්‍රය (UMF)" at first use, then "Seger සූත්‍රය". The app's "Unity formula" → "Seger සූත්‍රය", "Unity:" → "Seger:". |
| unity                                        | යුනිටි (ෆ්ලක්ස්වල එකතුව එකක් ලෙස ගෙන)                              | Tier 1. No source; Native check. "in unity" → "යුනිටි ලෙස"; එකක් as a word, never the digit. Not එකමුතුව (togetherness).                                                                                                                                                   |
| limit formula (target formula)               | ලිමිට් සූත්‍රය (ඉලක්ක සූත්‍රය)                                     | **show English**. Tier 1. No source. Not a legal limit: never සීමාව alone, which the law and the silica text use.                                                                                                                                                          |
| silica to alumina ratio                      | සිලිකා-ඇලුමිනා අනුපාතය                                             | **show English**. Tier 3. Usage. UI "සිලිකා-ඇලුමිනා අනුපාතය: {ratio}", "සිලිකා-ඇලුමිනා", "සිලිකා-ඇලුමිනා {ratio}:1".                                                                                                                                                       |
| flux balance                                 | ෆ්ලක්ස් තුලනය                                                      | Tier 1. No source. UI "ෆ්ලක්ස් තුලනය", "තුලනය", "ෆ්ලක්ස්වල තුලනය".                                                                                                                                                                                                         |
| oxide analysis (analysis, chemical analysis) | ඔක්සයිඩ විශ්ලේෂණය (විශ්ලේෂණය, රසායනික විශ්ලේෂණය)                   | Tier 3. Usage. UI "විශ්ලේෂණය", "ඔක්සයිඩ විශ්ලේෂණය, පිළිස්සූ පසු, බර අනුව".                                                                                                                                                                                                 |
| formula (raw formula, fired)                 | සූත්‍රය (අමු සූත්‍රය; පිළිස්සූ පසු)                                | Tier 3. Wikipedia (si) ("රසායනික සූත්‍ර", "අණුක සූත්‍රය"). UI "අමු සූත්‍රය:", "සූත්‍රය ඇතුළත් කරන්න (පිළිස්සූ පසු):", "සූත්‍රය, විකිණෙන ආකාරයට:". Never වට්ටෝරුව.                                                                                                          |
| loss on ignition (LOI)                       | දහන හානිය (LOI)                                                    | **show English**. Tier 3. No source; Native check. "දහන හානිය (LOI)" at first use; the UI's bare "LOI" stays LOI.                                                                                                                                                          |
| mole                                         | මවුලය                                                              | Tier 3. Wikipedia (si) (මවුලය, "මවුලික ස්කන්ධය"). Not the animal or a mark on the skin (උපන් ලපය).                                                                                                                                                                         |
| molecular weight                             | අණුක ස්කන්ධය                                                       | Tier 3. Wikipedia (si) ("අණුක ස්කන්ධය 18.0153 gmol-1"): Sinhala chemistry says mass (ස්කන්ධය), not weight (බර). UI "සූත්‍රයේ අමු අණුක ස්කන්ධය". Molar mass: මවුලික ස්කන්ධය.                                                                                                |
| equivalent weight, fired weight              | සමක ස්කන්ධය; පිළිස්සූ පසු බර                                       | Tier 3. No source read for සමක ස්කන්ධය; Native check. UI columns "සමක ස්කන්ධය", "පිළිස්සූ පසු බර".                                                                                                                                                                         |
| melt (noun)                                  | උණු වූ ග්ලේස්                                                      | Tier 4. Wikipedia (si) ("උණු වූ පාෂාණ", ඊයම්: "උණු කළ විට"). "උණු වූ ග්ලේස් උකු කරයි" (stiffens the melt), "උණු වූ ග්ලේස්වලින් වායු බුබුළු". Never දිය වූ.                                                                                                                 |
| thermal expansion (expansion)                | තාප ප්‍රසාරණය (ප්‍රසාරණය)                                          | **show English**. Tier 3. Wikipedia (si) (47 pages). UI "ප්‍රසාරණය, ×10⁻⁶/°C"; "CTE" and "x 10^-7/K" kept.                                                                                                                                                                 |
| stiff, fluid, runny (viscosity)              | උකු, දියාරු, ගලා යන (දුස්ස්‍රාවිතාව)                               | Tier 3 and 4. Wikipedia (si) (දුස්ස්‍රාවිතාව; lava "උකු බවින් වැඩි"). "ගලා යන" also describes a thin slurry: context decides.                                                                                                                                              |
| raw, fired                                   | අමු; පිළිස්සූ                                                      | Tier 4. Wikipedia (si) ("නොපුළුස්සන ලද "අමු" කුඹල් භාණ්ඩ"), Puwath ("අමු මැටි"). "අමු වයිටින්", "අමු මැටි", "අමු ඊයම්"; "පිළිස්සූ ඔක්සයිඩ", "පිළිස්සූ භාණ්ඩය". "Raw-glazed" ware → "නොපිළිස්සූ භාණ්ඩයට ග්ලේස් දමා එක් වරක් පිළිස්සීම". Never අමු for bisque (2.3).         |
| gloss, satin, matte                          | ග්ලොස් (දිලිසෙන), සැටින්, මැට් (නොදිලිසෙන)                         | Tier 1. Usage (the Wikipedia's tile types: "පොලිෂ් ටයිල්", "මැටි ෆිනිෂ් ටයිල්"). **මැට්, never මැටි** (clay): see Pitfalls. සැටින් is not the fabric here.                                                                                                                 |
| opaque, transparent, translucent, clear      | පාරාන්ධ, පාරදෘශ්‍ය, පාරභාසක, ක්ලියර්                               | Tier 3 and 1. Wikipedia (si) (පාරාන්ධ 16 pages, පාරදෘශ්‍ය 32, "පාරාන්ධ හෝ පාරභාෂක වස්තුවක්"). "ක්ලියර් ග්ලේස්" is a glaze type, not "පැහැදිලි" (obvious).                                                                                                                  |
| stable, durable                              | ස්ථායී; කල් පවතින                                                  | Tier 4. Wikipedia (si) (ස්ථායී). "ස්ථායී ග්ලේස්" (balanced, resists leaching), not "ස්ථාවර" (fixed).                                                                                                                                                                       |
| crystals, crystalline                        | ස්ඵටික; ස්ඵටිකරූපී                                                 | Tier 3. Wikipedia (si) (ස්ඵටික 95 pages; "ස්ඵටික රූපි අකාරයෙන්"). "ස්ඵටිකරූපී සිලිකා" is the dust hazard (2.7).                                                                                                                                                            |
| boron blue                                   | “බෝරෝන් නිල්”                                                      | Keep the quotes; translate the sense (කිරි පැහැති නිල්-සුදු) where the English explains it. No source.                                                                                                                                                                     |
| celadon                                      | සෙලඩොන්                                                            | Tier 1. Wikipedia (si) (ගොර්යෝ: "සෙලඩොන් ඔපදැමූ බඳුනකි"). Palette "සෙලඩොන් කොළ".                                                                                                                                                                                           |
| tenmoku (temmoku)                            | ටෙන්මොකු                                                           | Tier 1. No source; Native check on the spelling. Palette "ටෙන්මොකු මලකඩ".                                                                                                                                                                                                  |

### 2.2 Materials and oxides

| English                                           | Sinhala                                                                    | Notes                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| silica (SiO₂)                                     | සිලිකා (SiO₂)                                                              | **show English**. Tier 2. Wikipedia (si) (සිලිකන්: "සිලිකා යනු … මූලද්‍රවයක ඔක්සයිඩය"; බිම් ගඩොල්: "සිලිකා වැලි"). Not සිලිකන් (the element) or සිලිකොන් (the rubber). Category "සිලිකා".                                                                                                       |
| alumina (Al₂O₃)                                   | ඇලුමිනා (Al₂O₃)                                                            | Tier 2. Wikipedia (si) ("ඇලුමිනියම් ඔක්සයිඩ් හෝ ඇලුමිනා"). Category "ඇලුමිනා"; formal "ඇලුමිනියම් ඔක්සයිඩ්".                                                                                                                                                                                    |
| boron (B₂O₃)                                      | බෝරෝන් (B₂O₃)                                                              | Tier 3. Wikipedia (si) ("බෝරෝන් නයිට්‍රයිඩ්"). Category "බෝරෝන් ප්‍රභව"; formal "බෝරෝන් ඔක්සයිඩ්".                                                                                                                                                                                              |
| potash (K₂O)                                      | පොටෑෂ් (K₂O)                                                               | **show English**. Tier 1. Wikipedia (si) ("පොටෑෂ්", also the fertiliser). Formal පොටෑසියම් ඔක්සයිඩ්. Always with K₂O at first use. The safety guide's potash (the material) is පොටෑසියම් කාබනේට්: check which. KNaO kept.                                                                       |
| soda (Na₂O)                                       | සෝඩා (Na₂O)                                                                | **show English**. Tier 1. Usage. Formal සෝඩියම් ඔක්සයිඩ්. Soda ash (Na₂CO₃) is සෝඩා අළු; in firing logs "Soda" is a soda firing (2.4). Not soda water.                                                                                                                                          |
| lithium (Li₂O)                                    | ලිතියම් (Li₂O)                                                             | Tier 2. Wikipedia (si) (ලිතියම්, "ලිතියම් කාබනේට්"). Records' "lithia" → ලිතියා.                                                                                                                                                                                                                |
| calcium, lime (CaO)                               | කැල්සියම්; lime හුණු (CaO)                                                 | Tier 3. Wikipedia (si) (කැල්සියම් කාබනේට්, "කැල්සියම් ඔක්සයිඩ්-CaO හෙවත් පිළිස්සූ හුණු"). The UI says "කැල්සියම්"; හුණු only in frit names. Not the fruit (දෙහි); "lime green" → "දෙහි කොළ".                                                                                                    |
| magnesium, magnesia (MgO)                         | මැග්නීසියම්; මැග්නීසියා (MgO)                                              | Tier 3. Wikipedia (si) (මැග්නීසියම්). Formal "මැග්නීසියම් ඔක්සයිඩ්".                                                                                                                                                                                                                            |
| barium (BaO), barium carbonate                    | බේරියම් (BaO), බේරියම් කාබනේට්                                             | Tier 2. Wikipedia (si) ("බේරියම් ඔක්සයිඩ්"). විෂ සහිත (2.7).                                                                                                                                                                                                                                    |
| strontium (SrO)                                   | ස්ට්‍රොන්ටියම් (SrO)                                                       | Tier 2. Wikipedia (si) (ස්ට්‍රොන්ටියම්).                                                                                                                                                                                                                                                        |
| zinc (ZnO), zinc oxide                            | සින්ක් (ZnO), සින්ක් ඔක්සයිඩ්                                              | Tier 2. Wikipedia (si) ("සින්ක් ඔක්සයිඩ්"; "සින්ක් (තුත්තනාගම්)"): "සින්ක් (තුත්තනාගම්)" at first use. "කැල්සයින් කළ සින්ක්".                                                                                                                                                                   |
| lead (PbO)                                        | ඊයම් (PbO); its compounds ඊයම් ඔක්සයිඩ්, ඊයම් ෆ්‍රිට්, භෂ්මික ඊයම් කාබනේට් | Tier 3 and 4. Wikipedia (si) ("ඊයම් යනු රසායනික මූලද්‍රව්‍යයකි", 113 pages). Never ලෙඩ් (LED; ලෙඩ, illness), never ටින් (tin). Setting "ඊයම්". The frits' product names (lead bisilicate) → "ඊයම් බයිසිලිකේට්".                                                                                 |
| iron (red iron oxide, black iron oxide)           | යකඩ (රතු යකඩ ඔක්සයිඩ්, කළු යකඩ ඔක්සයිඩ්)                                   | Tier 2. Wikipedia (si) ("යකඩ ඔක්සයිඩ්" 20 pages, "ෆෙරික් ඔක්සයිඩ්"); the bag's "Iron Oxide Red". Fe₂O₃ red, Fe₃O₄ black. "Crocus martis" kept. Native check: a potter may say රෙඩ් අයන් ඔක්සයිඩ්.                                                                                               |
| titanium, titania (TiO₂)                          | ටයිටේනියම්; ටයිටේනියා (TiO₂)                                               | Tier 3. Wikipedia (si) (ටයිටේනියම් ඩයොක්සයිඩ්). Formal ටයිටේනියම් ඩයොක්සයිඩ්.                                                                                                                                                                                                                   |
| raw materials (materials)                         | අමුද්‍රව්‍ය; materials ද්‍රව්‍ය                                            | Tier 4. Wikipedia (si) (බිම් ගඩොල්: "අමුද්‍රව්‍ය"; සෙරමික්: "සෙරමික් ද්‍රව්‍ය"). UI page "ද්‍රව්‍ය" (2.8).                                                                                                                                                                                      |
| feldspar (spar)                                   | ෆෙල්ඩ්ස්පාර්                                                               | **show English**. Tier 2. Wikipedia (si) (ෆෙල්ඩ්ස්පාර් 3 pages; also ෆෙල්ස්පාර් 5, පෙල්ස්පාර් 3: not used). "spar" in names stays ("Custer Spar"). Category "ෆෙල්ඩ්ස්පාර් සහ ස්ටෝන්".                                                                                                           |
| potash feldspar, soda feldspar                    | පොටෑෂ් ෆෙල්ඩ්ස්පාර්; සෝඩා ෆෙල්ඩ්ස්පාර්                                     | Tier 2. The bag's names ("Soda Feldspar"). Wikipedia (si) ("ඕර්තොක්ලේස් ෆෙල්ඩ්ස්පාර්", "ප්ලැජියොක්ලේස් ෆෙල්ඩ්ස්පාර්"). Sri Lanka mines feldspar (the Wikipedia's Matale district: "පිඟන් නිෂ්පාදනයට භාවිතා කරන පෙල්ස්පාර් ඛනිජ නිධි").                                                          |
| nepheline syenite                                 | නෙෆලීන් සයනයිට්                                                            | **show English**. Tier 2. No Sinhala source.                                                                                                                                                                                                                                                    |
| Cornish stone (Cornwall stone, china stone)       | කෝර්නිෂ් ස්ටෝන් (කෝර්න්වෝල් ස්ටෝන්, චයිනා ස්ටෝන්)                          | Tier 2. No source. කෝර්- with the repaya, so that it never reads as කෝන් (cone). "ස්ටෝන්" is a material, not a pebble (ගල් කැටය).                                                                                                                                                               |
| kaolin (UK: china clay)                           | කෙයොලින් (කිරිමැටි)                                                        | **show English**. Tier 2. Wikipedia (si) (බිම් ගඩොල්: "කෙයොලින්"; කෙයලිනයිට්: "කිරිමැටි හෙවත් පිඟං මැටි"), Roar and Puwath ("කෙයොලින් මැටි", "කිරි මැටි"). Never පිඟන් මැටි alone (also ceramics).                                                                                              |
| calcined                                          | කැල්සයින් කළ (පෙර පිළිස්සූ)                                                | Tier 2. No Sinhala source. "කැල්සයින් කළ කෙයොලින්", "කැල්සයින් කළ ෆ්ලින්ට්", "කැල්සයින් කළ සින්ක්".                                                                                                                                                                                             |
| ball clay                                         | බෝල මැටි                                                                   | **show English**. Tier 2. Wikipedia (si) (බිම් ගඩොල්: "බෝල මැටි", Sri Lanka's tile makers' word). Native check.                                                                                                                                                                                 |
| bentonite                                         | බෙන්ටොනයිට්                                                                | Tier 2. No Sinhala source.                                                                                                                                                                                                                                                                      |
| slip clay                                         | ස්ලිප් ක්ලේ                                                                | Tier 2. No source. Not ස්ලිප් (2.3).                                                                                                                                                                                                                                                            |
| whiting                                           | වයිටින් (කැල්සියම් කාබනේට්)                                                | **show English**. Tier 2. The bag's "Whiting"; Wikipedia (si) (කැල්සියම් කාබනේට්). Not හුණු (lime), හුණුගල් (limestone) or හුණු කූරු (chalk). Native check.                                                                                                                                     |
| dolomite, talc                                    | ඩොලමයිට්; ටැල්ක්                                                           | Tier 2. Wikipedia (si) (ඩොලමයිට් 21 pages; Sri Lanka's dolomite at Matale). Both supply MgO. ටැල්ක් is not ටැල්කම් පවුඩර්.                                                                                                                                                                      |
| wollastonite                                      | වොලස්ටනයිට්                                                                | Tier 2. No Sinhala source.                                                                                                                                                                                                                                                                      |
| flint                                             | ෆ්ලින්ට් (ගිනිගල්)                                                         | **show English**. Tier 2. No Sinhala source for the bracket. UK: calcined flint; US recipes: ground quartz.                                                                                                                                                                                     |
| quartz (free quartz, free silica)                 | ක්වාර්ට්ස් (තිරුවානා) (නිදහස් ක්වාර්ට්ස්, නිදහස් සිලිකා)                   | Tier 2. Wikipedia (si) (ක්වාර්ට්ස් 11 pages, ක්වාට්ස් 4; "තිරුවානා (ක්වෝට්ස්)"), Google suggest (තිරුවානා: "තිරුවානා ගල්"). තිරුවානා in brackets at first use per section. "නිදහස් සිලිකා" is free silica (2.7).                                                                                |
| frit                                              | ෆ්‍රිට්                                                                    | **show English**. Tier 1. Usage (the shops' "Frit 1005", "Ferro Frit 3134"); no Sinhala source writes it. "ෆ්‍රිට් කළ" (fritted); "බේස් ෆ්‍රිට්", "බෝරෝන් ෆ්‍රිට්", "කැල්සියම් බෝරේට් ෆ්‍රිට්" (calcium and boron, not a borosilicate), "ඊයම් රහිත ෆ්‍රිට්", "ඊයම් ෆ්‍රිට් (ඊයම් බයිසිලිකේට්)". |
| raw borates (borax, colemanite, ulexite)          | අමු බෝරේට (බොරැක්ස්, කොල්මනයිට්, යුලෙක්සයිට්)                              | Tier 2. Wikipedia (si) ("බොරැක්ස් (Na2B4O7·10H2O)"). Gerstley Borate, Gillespie Borate kept.                                                                                                                                                                                                    |
| soda ash, bone ash, wood ash                      | සෝඩා අළු, අස්ථි අළු, දර අළු                                                | Tier 2. Wikipedia (si) ("සෝඩා අළු (Na2CO3)"; "අස්ථි මුසු පිඟන් භාණ්ඩ" for bone china). Only wood ash is අළු of a burnt plant; දර අළු ග්ලේස් (ash glaze).                                                                                                                                        |
| colorant                                          | කලරන්ට් (වර්ණ කාරකය)                                                       | **show English**. Tier 1. No source. වර්ණකය (pigment, Wikipedia (si)) is a related word, not used for colorant. Category "කලරන්ට්"; UI "කලරන්ට් සහ ආකලන ද්‍රව්‍ය".                                                                                                                              |
| stain                                             | ස්ටේන් (සකස් කළ වර්ණය)                                                     | **show English**. Tier 2. The shops' "Stains". ස්ටේන් is also a mark: "(සකස් කළ වර්ණය)" at first use. The verb "stain" (a glaze stops staining) → "පැල්ලම් වීම".                                                                                                                                |
| cobalt, copper, chrome, manganese, nickel         | කොබෝල්ට්, තඹ, ක්‍රෝම්, මැංගනීස්, නිකල්                                     | Tier 2. Wikipedia (si) (කොබෝල්ට්, "තඹ ඔක්සයිඩ්", මැංගනීස්, "ක්‍රෝමියම්", නිකල්). "ක්‍රෝම්" is chromium oxide, not chrome plating. Copper is තඹ (the Sinhala word every reader knows; කොපර් not used).                                                                                           |
| rutile                                            | රූටයිල්                                                                    | Tier 2. Wikipedia (si) ("රූටයිල්(rutile)").                                                                                                                                                                                                                                                     |
| opacifier                                         | ඕපසිෆයර් (පාරාන්ධකාරකය)                                                    | Tier 1. No source; පාරාන්ධ from Wikipedia (si). සර්කෝන්, ටින් ඔක්සයිඩ්, ටයිටේනියම් ඩයොක්සයිඩ්.                                                                                                                                                                                                  |
| zircon                                            | සර්කෝන්                                                                    | Tier 2. Wikipedia (si) ("සර්කෝන්", "සර්කෝනියම්"). **Never ජාගුන්** (the gemstone). Not සර්කෝනියා (ZrO₂).                                                                                                                                                                                        |
| suspender                                         | සස්පෙන්ඩර් (අවලම්බන කාරකය)                                                 | Tier 1. No source; Native check; අවලම්බනය (suspension) is the science word. සස්පෙන්ඩර් alone is braces: the bracket at first use. Category "සස්පෙන්ඩර්".                                                                                                                                        |
| refractory                                        | රිෆ්‍රැක්ටරි (තාප ප්‍රතිරෝධී)                                              | Tier 1. Wikipedia (si) ("උෂ්ණත්ව ප්‍රතිරෝධී"). Of materials and kiln parts.                                                                                                                                                                                                                     |
| softening point, half-sphere point (fusion, flow) | මෘදු වන ලක්ෂ්‍යය, අර්ධ ගෝල ලක්ෂ්‍යය (ෆියුෂන්, ෆ්ලෝ)                        | Tier 3 and 1. No source; the frit makers' English. "Fusion" on a Ferro sheet is a melting point (ද්‍රවාංකය, Wikipedia (si)), not nuclear fusion (න්‍යෂ්ටික විලයනය). The figure is **ෆියුෂන්** (with **ෆ්ලෝ**); the frit maker Fusion is **“Fusion සමාගම”**.                                     |
| substitute (stand-in, replacement)                | ආදේශක ද්‍රව්‍යය                                                            | Tier 4. No source (ආදේශ කරන්න, to replace). See "like for like" (2.8).                                                                                                                                                                                                                          |
| tin oxide (SnO₂), tin                             | ටින් ඔක්සයිඩ් (SnO₂), ටින්                                                 | Tier 3. Wikipedia (si) (ටින්). Never ඊයම් (lead); ටින් alone is also a can.                                                                                                                                                                                                                     |
| grog                                              | ග්‍රොග්                                                                    | Tier 2. The shops' "Grog". No Sinhala source.                                                                                                                                                                                                                                                   |

### 2.3 Clay, ware and firing stages

| English                         | Sinhala                                                                | Notes                                                                                                                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| clay body (body)                | මැටි මිශ්‍රණය (ක්ලේ බොඩි)                                              | **show English**. Tier 4 and 1. No source. මැටි මිශ්‍රණය (the clay mix) reads plainly; ක්ලේ බොඩි in brackets at first use. Not a human body (ශරීරය); "the glaze melts into the body" → "ග්ලේස් එක මැටි මිශ්‍රණය සමඟ උණු වී එක් වේ"; "body stain" → "මැටි ස්ටේන්". Native check. |
| ware (pot, piece)               | භාණ්ඩ (බඳුන, භාණ්ඩය)                                                   | Tier 4. Wikipedia (si), Roar ("මැටි භාණ්ඩ", "බඳුන්"). "අමු භාණ්ඩ", "බිස්ක් භාණ්ඩ", "ග්ලේස් දැමූ භාණ්ඩ"; a piece is "භාණ්ඩය". Not software or merchandise.                                                                                                                       |
| functional ware                 | ආහාර සඳහා භාණ්ඩ                                                        | Tier 4. No source. Pots for food and drink; not "ක්‍රියාකාරී".                                                                                                                                                                                                                  |
| hollowware, flatware            | ගැඹුරු භාණ්ඩ; පැතලි භාණ්ඩ                                              | Tier 4. No source. "flatware" here is plates, not cutlery (හැඳි ගෑරුප්පු).                                                                                                                                                                                                      |
| earthenware                     | අර්තන්වෙයාර් (මැටිබඳුන්)                                               | **show English**. Tier 1. Wikipedia (si) (කුඹල් කර්මාන්තය: "මැටිබඳුන්"). See Pitfalls. Native check.                                                                                                                                                                            |
| stoneware                       | ස්ටෝන්වෙයාර් (අර්ධ වීදුරුමය භාණ්ඩ)                                     | **show English**. Tier 1. Wikipedia (si) ("අර්ධ-වීදුරුමය (stoneware)"; "දැඩි මෘත්තිනා භාණ්ඩ", not used). Native check.                                                                                                                                                          |
| porcelain                       | පෝසිලේන් (සිරිමැටි)                                                    | Tier 2. Wikipedia (si) (පෝසිලේන්; "සිරිමැටි (පෝසිලේන්)").                                                                                                                                                                                                                       |
| vitreous, vitrification         | වීදුරුමය; වීදුරුමය වීම                                                 | Tier 3. Wikipedia (si) ("වීදුරුමය ස්වභාවය", "අර්ධ-වීදුරුමය").                                                                                                                                                                                                                   |
| porous, porosity                | සවිවර; සවිවරතාව                                                        | Tier 3. Wikipedia (si) ("සවිවර මැට්ටෙන්", "සවිවර හා භංගුරය"). "Bisque should stay porous" → "බිස්ක් සවිවරව තිබීම සුදුසුය" (should, Register).                                                                                                                                   |
| mature, maturity                | පරිණත වීම; පරිණතභාවය                                                   | Tier 3. Wikipedia (si) (සෙරමික්: "පරිණත වී ඇත"). Not age.                                                                                                                                                                                                                       |
| plastic, plasticity             | සුනම්‍ය; සුනම්‍යතාව                                                    | Tier 3. Wikipedia (si) (සුනම්‍ය 22 pages). Not the polymer (ප්ලාස්ටික්).                                                                                                                                                                                                        |
| greenware                       | අමු භාණ්ඩ                                                              | **show English**. Tier 4. Wikipedia (si) ("නොපුළුස්සන ලද "අමු" කුඹල් භාණ්ඩ"), Puwath ("අමු මැටි"). Not green (කොළ) in colour.                                                                                                                                                   |
| leather-hard                    | ලෙදර්-හාඩ් (අර්ධ වියළි)                                                | Tier 1. No source. Native check.                                                                                                                                                                                                                                                |
| bone dry                        | සම්පූර්ණයෙන් වියළි                                                     | Tier 4. No source.                                                                                                                                                                                                                                                              |
| bisque (UK: biscuit)            | බිස්ක් (පළමු පිළිස්සීම)                                                | **show English**. Tier 1. No source; Native check. "බිස්ක් පිළිස්සීම", "බිස්ක් කළ", "මෘදු/දැඩි බිස්ක්". Never බිස්කට් (a biscuit).                                                                                                                                              |
| glaze firing (UK: glost firing) | ග්ලේස් පිළිස්සීම                                                       | **show English**. Tier 1. No source.                                                                                                                                                                                                                                            |
| once-firing (single firing)     | එක් වරක් පිළිස්සීම                                                     | **show English**. Tier 4. No source. "එක්" as a word: the English has no digit.                                                                                                                                                                                                 |
| slip                            | ස්ලිප් (මැටි දියරය)                                                    | Tier 1. No source. Not underwear or slipping (ලිස්සීම).                                                                                                                                                                                                                         |
| engobe                          | එන්ගෝබ්                                                                | Tier 1. No source.                                                                                                                                                                                                                                                              |
| underglaze                      | අන්ඩර්ග්ලේස් (යටි ඔපය)                                                 | Tier 1. Wikipedia (si) (ගොර්යෝ: "යටි ඔපය"). "අන්ඩර්ග්ලේස් පැන්සල".                                                                                                                                                                                                              |
| foot                            | පාදම                                                                   | Tier 4. Wikipedia (si) ("පාදමද සහිතව"). Kept free of glaze: "පාදම ග්ලේස් රහිතව තැබීම". "leave a wider foot" → "පාදමේ ග්ලේස් රහිත තීරුව පුළුල් කරන්න".                                                                                                                           |
| low fire, mid fire, high fire   | අඩු උෂ්ණත්ව පිළිස්සීම, මධ්‍යම උෂ්ණත්ව පිළිස්සීම, ඉහළ උෂ්ණත්ව පිළිස්සීම | Tier 4. No source. As adjectives "අඩු උෂ්ණත්ව ග්ලේස්" etc. Here ඉහළ/අඩු describe temperature, not a cone.                                                                                                                                                                       |
| raku                            | රකු                                                                    | Tier 1. No source. A Japanese loanword.                                                                                                                                                                                                                                         |

### 2.4 Kilns, cones and firing

| English                                                                     | Sinhala                                                                          | Notes                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| electric kiln, gas kiln, manual kiln                                        | විදුලි කිල්න්, ගෑස් කිල්න්, අතින් පාලනය කරන කිල්න්                               | Tier 1. Google suggest ("විදුලි පෝරණුව"). The bracket (විදුලි පෝරණුව) at first use. **Native check** (Choices: පෝරණුව throughout).                                                                |
| firing, fire (verb), load                                                   | පිළිස්සීම, පුළුස්සනවා, පිළිස්සුම් තොගය                                           | Tier 4. Roar ("පුළුස්සා ගනියි", "පිළිස්සීම"). "කෝන් 6 දක්වා පුළුස්සන්න"; "loading" පිරවීම, "unloading" ඉවත් කිරීම. Not dismissing someone (සේවයෙන් පහ කිරීම) or a burn (පිළිස්සුම් තුවාලය).       |
| kiln shelf (shelf)                                                          | කිල්න් රාක්කය (රාක්කය)                                                           | Tier 1. No source. "shelf" also means the materials on hand (2.8): there it is රාක්කය in quotes, as a figure of speech.                                                                           |
| element                                                                     | එලිමන්ට් (තාපන දඟරය)                                                             | Tier 1. Usage. The Materials form's chemical elements are මූලද්‍රව්‍ය (Wikipedia (si)).                                                                                                           |
| cone (pyrometric cone)                                                      | කෝන් (තාප මිනුම් කේතුව)                                                          | **show English**. Tier 1. No Sinhala source (Google suggest: "cone 6" in English). See Cones. Not an ice-cream cone (අයිස්ක්‍රීම් කෝන්) or a traffic cone.                                        |
| cone number, cone chart                                                     | කෝන් අංකය, කෝන් වගුව                                                             | Tier 1. No source. Leading zeros kept (06); "Orton's chart" → "Orton වගුව".                                                                                                                       |
| self-supporting, large and small (junior) cones, bars                       | ස්වයං-ආධාරක කෝන්, විශාල සහ කුඩා (ජූනියර්) කෝන්, බාර්                             | Tier 1. No source. "ජූනියර්" is the old name for small.                                                                                                                                           |
| witness cone                                                                | සාක්ෂි කෝන් (විට්නස් කෝන්)                                                       | **show English**. Tier 4 and 1. No source. Native check.                                                                                                                                          |
| cone pack                                                                   | කෝන් කට්ටලය (කෝන් පැක්)                                                          | **show English**. Tier 4 and 1. No source.                                                                                                                                                        |
| guide cone, firing cone, guard cone                                         | ගයිඩ් කෝන්, ෆයරින් කෝන්, ගාඩ් කෝන්                                               | Tier 1. No source. One number cooler, the target, one hotter (see Cones). ගයිඩ් here is a cone's name, not the app's guides.                                                                      |
| heatwork                                                                    | හීට්වර්ක් (තාප කාර්යය)                                                           | **show English**. Tier 1. No source.                                                                                                                                                              |
| heating rate (rate, climb), peak                                            | රත් වීමේ වේගය (වේගය), උපරිම උෂ්ණත්වය                                             | Tier 4. No source. Chart columns "සෙමින්", "මධ්‍යම", "වේගයෙන්"; firing-log field "වේගය".                                                                                                          |
| ramp                                                                        | රැම්ප් (උෂ්ණත්ව වෙනස් වීමේ වේගය)                                                 | **show English**. Tier 1. No source. Firing-log field "රැම්ප්".                                                                                                                                   |
| hold (soak)                                                                 | හෝල්ඩ් (එකම උෂ්ණත්වයේ තබා ගැනීම)                                                 | **show English**. Tier 1. No source. "soak" is the same thing, not soaking in water (පොඟවා තැබීම). Firing-log field "හෝල්ඩ්".                                                                     |
| schedule (firing schedule, program, preset, segment)                        | පිළිස්සුම් කාලසටහන (ප්‍රෝග්‍රෑම්, ප්‍රීසෙට්, සෙග්මන්ට්)                          | Tier 4 and 1. No source. Preset names ("Slow Bisque", "Fast Glaze") stay as on the controller. Firing-log field "සෙග්මන්ට්".                                                                      |
| controller                                                                  | කන්ට්‍රෝලරය                                                                      | Tier 1. No source. Setting: "උෂ්ණත්වය අනුව, කිල්න් කන්ට්‍රෝලරයක ප්‍රෝග්‍රෑම් එකක් ලෙස".                                                                                                           |
| cone offset (offset)                                                        | කෝන් ඕෆ්සෙට් (ඕෆ්සෙට්)                                                           | Tier 1. No source.                                                                                                                                                                                |
| kiln sitter (Kiln-Sitter, sitter)                                           | කිල්න් සිටර් (Kiln-Sitter, සිටර්)                                                | **show English**. Tier 1. "Kiln-Sitter" is Dawson's trademark, in Latin letters. Not a babysitter.                                                                                                |
| sensing rod, claw, weight, trigger plate, cone supports, tube, firing gauge | සෙන්සින් රොඩ්, ක්ලෝ, වේට් (බර), ට්‍රිගර් ප්ලේට්, කෝන් ආධාරක, ටියුබ්, ෆයරින් ගේජ් | Tier 1. No source; follow a local kiln-sitter manual where one exists.                                                                                                                            |
| limit timer                                                                 | ලිමිට් ටයිමරය                                                                    | Tier 1. No source.                                                                                                                                                                                |
| infinite switch (Off, Low, Medium, High)                                    | ඉන්ෆිනිට් ස්විචය (Off, Low, Medium, High)                                        | Tier 1. No source. The positions stay in Latin as the dial prints them, with a Sinhala gloss at first use (Off (ක්‍රියාවිරහිත), Low (අඩු), Medium (මධ්‍යම), High (වැඩි)). Not literally infinite. |
| pyrometer, thermocouple                                                     | පයිරෝමීටරය, තර්මොකපලය (තාප යුග්මය)                                               | Tier 1 and 3. No source. Firing-log fields "ප්‍රෝබ් {n}".                                                                                                                                         |
| peephole (spy hole)                                                         | එබිකම් සිදුර (පීප්හෝල්)                                                          | Tier 4. No source. Firing-log field "එබිකම් සිදුර".                                                                                                                                               |
| vent, downdraft vent, hood vent                                             | වෙන්ට් (දුම් ඉවත් කරන පංකාව), ඩවුන්ඩ්‍රාෆ්ට් වෙන්ට්, හුඩ් වෙන්ට්                 | Tier 1. No source. "vent the kiln" → "කිල්න් එකේ දුම් ඉවත් කරන්න".                                                                                                                                |
| candling (preheat)                                                          | කැන්ඩලිං (පෙර රත් කිරීම)                                                         | **show English**. Tier 1. No source. The "mirror test" → "කැඩපත් පරීක්ෂාව".                                                                                                                       |
| burnout                                                                     | කාබනික ද්‍රව්‍ය දැවී යාම                                                         | Tier 4. No source. "insufficient burnout" → "කාබනික ද්‍රව්‍ය ප්‍රමාණවත් ලෙස දැවී නොයාම".                                                                                                          |
| red heat, dull red                                                          | රතු පැහැයට රත් වීම, අඳුරු රතු                                                    | Tier 4. No source.                                                                                                                                                                                |
| quartz inversion                                                            | ක්වාර්ට්ස් ඉන්වර්ෂන් (ක්වාර්ට්ස් පරිවර්තනය)                                      | **show English**. Tier 1. No source. 573 °C (1063 °F) as the English.                                                                                                                             |
| oxidation                                                                   | ඔක්සිකරණය (ඔක්සිකරණ පිළිස්සීම)                                                   | **show English**. Tier 3. Wikipedia (si) (ඔක්සිකරණය, 39 pages).                                                                                                                                   |
| reduction                                                                   | ඔක්සිහරණය (ඔක්සිහරණ පිළිස්සීම)                                                   | **show English**. Tier 3. Wikipedia (si) (ඔක්සිහරණය, 18 pages; "ඔක්සිකරණ - ඔක්සිහරණ ප්‍රතික්‍රියා"). Not a decrease (අඩු කිරීම) or a discount.                                                    |
| atmosphere                                                                  | කිල්න් වායුගෝලය (වායුගෝලය)                                                       | Tier 4. No source. Firing-log field "වායුගෝලය".                                                                                                                                                   |
| drop-and-hold                                                               | ඩ්‍රොප්-ඇන්ඩ්-හෝල්ඩ්                                                             | **show English**. Tier 1. No source. Explained once as "ඉහළ උෂ්ණත්වයේ සිට ඉක්මනින් සිසිල් කර තබා ගැනීම".                                                                                          |
| slow cooling (slow cool)                                                    | සෙමින් සිසිල් කිරීම                                                              | Tier 4. No source.                                                                                                                                                                                |
| underfired, overfired                                                       | අඩුවෙන් පිළිස්සුණු, වැඩියෙන් පිළිස්සුණු                                          | Tier 4. No source.                                                                                                                                                                                |
| kiln wash                                                                   | කිල්න් වොෂ්                                                                      | Tier 1. No source. Not washing (සේදීම).                                                                                                                                                           |
| stilt                                                                       | ස්ටිල්ට්                                                                         | Tier 1. No source.                                                                                                                                                                                |
| cookie                                                                      | කුකී (බිස්ක් තැටිය)                                                              | Tier 1. No source. Not a biscuit: the bracket at first use.                                                                                                                                       |
| Seger cones, Staffordshire cones, Bullers rings, Holdcroft bars             | Seger කෝන්, Staffordshire කෝන්, Bullers වළලු, Holdcroft බාර්                     | Names in Latin letters; "rings" are වළලු (hoops), never මුදු (finger rings); "bars" බාර්.                                                                                                         |
| Damper, Primary Air, Secondary Air, Burner, Pilots, Blower                  | ඩැම්පරය, ප්‍රාථමික වාතය, ද්විතීයික වාතය, බර්නරය, පයිලට් ගිනිදැල්, බ්ලෝවරය        | Tier 1 and 4. No source. Short column labels. "Pilots" are pilot flames, not people.                                                                                                              |
| Ox Probe                                                                    | ඔක්සිජන් ප්‍රෝබ්                                                                 | Tier 1. No source.                                                                                                                                                                                |
| Draw Tile                                                                   | ඩ්‍රෝ ටයිල් (පිටතට ගන්නා පරීක්ෂණ ටයිල්)                                          | Tier 1. No source. "draw" means pull out.                                                                                                                                                         |
| Delta, Temp Diff, Cones Top, Cones Bottom                                   | Delta, උෂ්ණත්ව වෙනස, ඉහළ කෝන්, පහළ කෝන්                                          | Tier 4. No source. Here ඉහළ and පහළ are places in the kiln, not cone numbers.                                                                                                                     |
| Salt, Soda, Sawdust                                                         | ලුණු, සෝඩා, ලී කුඩු                                                              | Tier 4. No source. "Soda" here is not Na₂O.                                                                                                                                                       |
| Ring {n}                                                                    | වළල්ල {n}                                                                        | The reading of a pyrometric (Bullers or Holdcroft) ring, not a jewellery ring (මුද්ද).                                                                                                            |

### 2.5 Defects and glaze fit

| English                     | Sinhala                                  | Notes                                                                                                                                                               |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze fit (fit)             | ග්ලේස් ගැළපීම (ගැළපීම)                   | **show English**. Tier 4. No source. Not fitness or a seizure. "only just fitted your clay" → "ඔබේ මැටියට යන්තම් ගැළපුණි". "Over-compressed" → "අධික ලෙස සම්පීඩිත". |
| defect                      | දෝෂය                                     | Tier 4. No source.                                                                                                                                                  |
| crazing (craze)             | ක්‍රේසිං (සියුම් ඉරිතැලීම්)              | **show English**. Tier 1. No source. Not "crazy" (පිස්සු).                                                                                                          |
| crackle                     | ක්‍රැකල්                                 | Tier 1. No source. Crazing made on purpose.                                                                                                                         |
| shivering                   | ෂිවරිං (ග්ලේස් පතුරු ගැලවීම)             | **show English**. Tier 1. No source. Not shivering with cold (වෙව්ලීම).                                                                                             |
| crawling (crawl)            | ක්‍රෝලිං (ග්ලේස් හැකිළීම)                | **show English**. Tier 1. No source. The home-safety guide's crawling babies → "බඩගාන ළදරුවන්".                                                                     |
| pinholing (pinholes)        | පින්හෝලිං (ඉඳිකටු සිදුරු)                | **show English**. Tier 1. No source.                                                                                                                                |
| blistering (blisters)       | බුබුළු නැගීම (බුබුළු)                    | Tier 4. No source.                                                                                                                                                  |
| running (run, runny)        | ගලා යාම (ගලා යන)                         | Tier 4. No source. Not running as in operating ("the vent runs" → "වෙන්ට් එක ක්‍රියාත්මක වේ").                                                                      |
| devitrification             | ඩිවිට්‍රිෆිකේෂන් (අනවශ්‍ය ස්ඵටික වර්ධනය) | **show English**. Tier 1. No source.                                                                                                                                |
| dunting                     | ඩන්ටිං (සිසිලන ඉරිතැලීම්)                | **show English**. Tier 1. No source.                                                                                                                                |
| leaching (leach, leachable) | ලීචිං (ලෝහ කාන්දු වීම)                   | **show English**. Tier 1. No source. Not the leech (කූඩැල්ලා).                                                                                                      |
| specks                      | ලප                                       | Tier 4. No source.                                                                                                                                                  |
| milky, clouding             | කිරි පැහැ වීම, බොඳ වීම                   | Tier 4. No source.                                                                                                                                                  |
| dry, chalky                 | වියළි, හුණු වැනි                         | Tier 4. No source.                                                                                                                                                  |
| breaks (over edges)         | දාරවල වර්ණ වෙනස                          | Tier 4. No source. Not breaking apart (කැඩීම).                                                                                                                      |
| flashing (flash)            | ෆ්ලෑෂිං (වර්ණ තැවරීම)                    | Tier 1. No source. Not a camera flash.                                                                                                                              |
| thermal shock               | තාප කම්පනය                               | Tier 3. Wikipedia (si) (9 pages).                                                                                                                                   |

### 2.6 Making and applying glaze

| English                                | Sinhala                                              | Notes                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| batch                                  | බැච් එක (බැච්)                                       | Tier 1. No source. Not baking. "Scale to a batch" → "බැච් එකකට ගළපන්න", "Batch weight" → "බැච් බර", "Batch size" → "බැච් ප්‍රමාණය", "batch list" → "බැච් ලැයිස්තුව". "batch to batch" (a supplier's runs) → "නිෂ්පාදන තොගයෙන් තොගයට".                                                                                                  |
| batch recipe                           | බැච් වට්ටෝරුව                                        | Tier 1 and 4. No source.                                                                                                                                                                                                                                                                                                               |
| base (base glaze), on top              | බේස් ග්ලේස් (මූලික ග්ලේස්), මතට                      | Tier 1. No source. Not a chemical base (භෂ්මය). UI "බේස් එකට අමතරව", "බේස් එකේ %". "base frit" → "බේස් ෆ්‍රිට්".                                                                                                                                                                                                                       |
| percent, parts (parts by weight)       | ප්‍රතිශතය, කොටස් (බර අනුව කොටස්)                     | Tier 4. Wikipedia (si) (ප්‍රතිශතය). UI units "බේස් එකේ %", "කොටස්", "ග්‍රෑම්"; "කොටස්" column.                                                                                                                                                                                                                                         |
| scale (weighing)                       | තරාදිය                                               | Tier 4. Wikipedia (si) (තරාදිය 88 pages). "0.01 g දක්වා කියවන තරාදියක්". A different word from scaling a recipe (පරිමාණය වෙනස් කිරීම, 2.8).                                                                                                                                                                                            |
| tare                                   | ටෙයාර් කිරීම (හිස් බඳුන සමඟ බර බිංදුවට සැකසීම)       | Tier 1. No source.                                                                                                                                                                                                                                                                                                                     |
| slurry                                 | ස්ලරි (ග්ලේස් දියරය)                                 | **show English**. Tier 1. No source.                                                                                                                                                                                                                                                                                                   |
| slake                                  | පොඟවා තැබීම                                          | Tier 4. No source. Not quenching thirst.                                                                                                                                                                                                                                                                                               |
| sieve (UK also: lawn)                  | පෙරහන                                                | Tier 4. Wikipedia (si) (පෙරහන 14 pages). "lawn" is not grass (තණකොළ).                                                                                                                                                                                                                                                                  |
| mesh                                   | මෙෂ්                                                 | Tier 1. No source. Mesh numbers kept: "80 මෙෂ්".                                                                                                                                                                                                                                                                                       |
| specific gravity (SG)                  | විශිෂ්ට ගුරුත්වය (SG)                                | **show English**. Tier 3. Wikipedia (si) (ඝනත්වය: "විශිෂ්ට ගුරුත්වය හෝ සාපේක්ෂ ඝනත්වය … ඒකක රහිත රාශියක්"; ගාර්නට්: "විශිෂ්ට ගුරුත්වය 3.1–4.3"), Google suggest ("විශිෂ්ට ගුරුත්වය යනු"). The app's key `guides.density.sg` writes "විශිෂ්ට ගුරුත්වය {value}" (the figure after it, a ratio). Never ඝනත්වය, never g/cm³. Native check. |
| pint weight                            | පයින්ට් බර                                           | Tier 1. No source. An imperial pint (568 ml): "පයින්ට් බර, ඉම්පීරියල් පයින්ට් එකක අවුන්ස".                                                                                                                                                                                                                                             |
| degrees Baumé (°Bé), hydrometer        | බෝමේ අංශක (°Bé), හයිඩ්‍රොමීටරය                       | Tier 1. No source. Setting "බෝමේ අංශක, හයිඩ්‍රොමීටරයකින්".                                                                                                                                                                                                                                                                             |
| density (glaze density)                | ග්ලේස් ඝනත්වය                                        | Tier 4. Wikipedia (si) (ඝනත්වය). The setting only (Choices); "how much powder is in the slurry".                                                                                                                                                                                                                                       |
| thixotropy (thixotropic, gelled)       | තික්සොට්‍රොපි (තික්සොට්‍රොපික, ජෙලි වැනි වූ)         | **show English**. Tier 1. No source.                                                                                                                                                                                                                                                                                                   |
| flocculant (flocculate)                | ෆ්ලොකියුලන්ට් (ෆ්ලොකියුලේට් කිරීම)                   | **show English**. Tier 1. No source. Epsom salts, vinegar (විනාකිරි), calcium chloride.                                                                                                                                                                                                                                                |
| deflocculant                           | ඩිෆ්ලොකියුලන්ට්                                      | **show English**. Tier 1. No source. Sodium silicate (සෝඩියම් සිලිකේට්), Darvan.                                                                                                                                                                                                                                                       |
| Epsom salts                            | එප්සම් ලවණ                                           | Tier 2. No source. Magnesium sulfate.                                                                                                                                                                                                                                                                                                  |
| CMC gum (gum, binder, brushing medium) | CMC ගම් (ගම්, බන්ධකය)                                | Tier 1. No source. "CMC" kept.                                                                                                                                                                                                                                                                                                         |
| suspension, settle, hard-panning       | අවලම්බනය, තැන්පත් වීම, දැඩි තට්ටුවක් ලෙස තැන්පත් වීම | Tier 3 and 4. No source.                                                                                                                                                                                                                                                                                                               |
| dipping, pouring, brushing, spraying   | ගිල්වීම, වත් කිරීම, බුරුසුවෙන් ආලේප කිරීම, ඉසීම      | Tier 4. No source. "dipping glaze" → "ගිල්වීමට සකස් කළ ග්ලේස්"; "dip time" → "ගිල්වන කාලය"; "single dip", "double dip" → "එක් වරක් ගිල්වීම", "දෙවරක් ගිල්වීම".                                                                                                                                                                         |
| coat (coating)                         | තට්ටුව                                               | Tier 4. Wikipedia (si) (බිම් ගඩොල්: "විනිවිද පෙනෙන ඔප තට්ටුවක්"). "two or three coats" → "තට්ටු දෙකක් හෝ තුනක්". Not a garment (කබාය).                                                                                                                                                                                                 |
| wax resist                             | ඉටි ආවරණය (වැක්ස් රෙසිස්ට්)                          | **show English**. Tier 4 and 1. No source.                                                                                                                                                                                                                                                                                             |
| test tile                              | පරීක්ෂණ ටයිල් (ටෙස්ට් ටයිල්)                         | **show English**. Tier 4 and 1. No source.                                                                                                                                                                                                                                                                                             |
| line blend                             | ලයින් බ්ලෙන්ඩ් (පේළි මිශ්‍රණ පරීක්ෂාව)               | **show English**. Tier 1. No source. "line" is not a queue or a drawn line.                                                                                                                                                                                                                                                            |
| triaxial blend                         | ට්‍රයිඇක්සියල් බ්ලෙන්ඩ් (ත්‍රිකෝණ මිශ්‍රණ පරීක්ෂාව)  | Tier 1. No source.                                                                                                                                                                                                                                                                                                                     |
| lot number                             | ලොට් අංකය                                            | Tier 1. No source.                                                                                                                                                                                                                                                                                                                     |
| technical data sheet (TDS)             | තාක්ෂණික දත්ත පත්‍රිකාව (TDS)                        | Tier 4. No source. Not the safety data sheet.                                                                                                                                                                                                                                                                                          |

### 2.7 Health and safety

| English                                                | Sinhala                                                                    | Notes                                                                                                                                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dust                                                   | දූවිලි                                                                     | Tier 4. Wikipedia (si) (115 pages; ශ්වසන රෝග: "දූවිලි ශ්වසන පද්ධතිය කෙරෙහි කරන බලපෑම්").                                                                                                                       |
| respirable crystalline silica (RCS)                    | ආශ්වාස කළ හැකි ස්ඵටිකරූපී සිලිකා (RCS)                                     | **show English**. Tier 4. Wikipedia (si) (ආශ්වාස; "ස්ඵටික රූපි"). No regulator's Sinhala term found; Native check.                                                                                             |
| crystalline silica, amorphous silica, cristobalite     | ස්ඵටිකරූපී සිලිකා, අස්ඵටික සිලිකා, ක්‍රිස්ටොබලයිට්                         | Tier 3. Wikipedia (si) ("ක්‍රිස්ටොබලයිට් (cristobalite) යන ස්ඵටික රූපි අකාරයෙන්").                                                                                                                             |
| silicosis, COPD                                        | සිලිකෝසිස්, නිදන්ගත පෙනහළු අවහිරතා රෝගය (COPD)                             | Tier 4. Wikipedia (si) (ශ්වසන රෝග: "සිලිකෝසිස්"; "නිදන් ගත පෙනහළු අවහිරවීමේ රෝගය (COPD)").                                                                                                                     |
| exposure limit, action level                           | නිරාවරණ සීමාව, ක්‍රියාමාර්ග මට්ටම (action level)                           | Tier 4. No source (no Sinhala regulation read).                                                                                                                                                                |
| respirator                                             | රෙස්පිරේටරය (දූවිලි පෙරන ශ්වසන ආවරණය)                                      | Tier 1 and 4. No source; Native check. Not a hospital ventilator (කෘත්‍රිම ශ්වසන යන්ත්‍රය); not a surgical, cloth or "nuisance dust" mask (මුහුණු ආවරණය).                                                      |
| N95, P100, FFP2, FFP3, P2, P3                          | N95, P100, FFP2, FFP3, P2, P3                                              | Never translated.                                                                                                                                                                                              |
| half mask, powered respirator (PAPR)                   | අර්ධ මුහුණු රෙස්පිරේටරය, විදුලි පංකා සහිත රෙස්පිරේටරය (PAPR)               | Tier 4 and 1. No source.                                                                                                                                                                                       |
| fit test                                               | ෆිට් ටෙස්ට් (මුහුණට ගැළපීමේ පරීක්ෂාව)                                      | Tier 1. No source.                                                                                                                                                                                             |
| HEPA vacuum (dust Class M)                             | HEPA වැකියුම් ක්ලීනරය (Class M)                                            | Tier 1. No source. "HEPA" and "Class M" kept.                                                                                                                                                                  |
| wet cleaning (wet mop, wet-wipe), dry sweeping         | තෙත් පිරිසිදු කිරීම (තෙත් මොප් කිරීම, තෙත් රෙද්දකින් පිසීම), වියළිව අතුගෑම | Tier 4. No source.                                                                                                                                                                                             |
| local exhaust ventilation (LEV)                        | ස්ථානීය පිටාර වාතාශ්‍රය (LEV)                                              | **show English**. Tier 4. No source; වාතාශ්‍රය is the plain word. "extraction" → "දූවිලි ඉවතට ඇදීම".                                                                                                           |
| make-up air                                            | ආදේශක වාතය                                                                 | Tier 4. No source.                                                                                                                                                                                             |
| spray booth (water-backed booth), overspray            | ස්ප්‍රේ කුටිය (ජල ආවරණ සහිත කුටිය), ඉසින විට පිටතට යන ග්ලේස්               | Tier 1 and 4. No source.                                                                                                                                                                                       |
| fumes (kiln fumes)                                     | දුම සහ වාෂ්ප (කිල්න් දුම)                                                  | Tier 4. No source.                                                                                                                                                                                             |
| carbon monoxide (CO), CO alarm                         | කාබන් මොනොක්සයිඩ් (CO), CO අනතුරු ඇඟවීමේ උපකරණය                            | Tier 3. Wikipedia (si) (කාබන් මොනොක්සයිඩ්; "විෂ සහිත වායුවකි").                                                                                                                                                |
| metal fume fever, manganism                            | ලෝහ දුම් උණ, මැංගනීස් විෂ රෝගය (මැංගනිසම්)                                 | Tier 4. No source.                                                                                                                                                                                             |
| safety data sheet (SDS; older: MSDS)                   | ආරක්ෂිත දත්ත පත්‍රිකාව (SDS; පැරණි MSDS)                                   | Tier 4. No source (no Sri Lankan legal name found).                                                                                                                                                            |
| GHS, pictogram, signal word, hazard statement          | GHS, අනතුරු සංකේතය, අනතුරු සංඥා වචනය, අනතුරු ප්‍රකාශය                      | Tier 4. No Sinhala GHS text found; Native check. "Danger" → **අන්තරාය**, "Warning" → **අවවාදය**. Codes (H360FD) kept.                                                                                          |
| Not classified                                         | වර්ගීකරණය කර නැත                                                           | Tier 4. No source. Not "හානිකර නොවේ" (harmless).                                                                                                                                                               |
| IARC Group 1, 2A, 2B, 3 (carcinogenic)                 | IARC කාණ්ඩ 1, 2A, 2B, 3 (පිළිකා කාරක)                                      | Tier 4. Wikipedia (si) ("පිළිකා කාරක"). Group 1 "මිනිසුන්ට පිළිකා ඇති කරයි", 2A "මිනිසුන්ට පිළිකා ඇති කිරීමට බොහෝ දුරට ඉඩ ඇත", 2B "මිනිසුන්ට පිළිකා ඇති කළ හැකිය".                                             |
| toxic, harmful                                         | විෂ සහිත, හානිකර                                                           | Tier 4. Wikipedia (si) (වස: "විෂ සහිත … හානිකර", two classes). "Toxic if swallowed" → "ගිල්ලොත් විෂ සහිතය"; "Harmful if swallowed" → "ගිල්ලොත් හානිකරය".                                                       |
| soluble, insoluble, slightly soluble                   | ද්‍රාව්‍ය, අද්‍රාව්‍ය, මඳ වශයෙන් ද්‍රාව්‍ය                                 | Tier 3. Wikipedia (si) (ද්‍රාව්‍යතාවය: "ජලයේ මඳ වශයෙන් ද්‍රාව්‍ය"; "අද්‍රාව්‍ය ලවණ"). Solubility ද්‍රාව්‍යතාව; dissolve ද්‍රාවණය වේ. **Never** උණු වීම (melting) or දිය වීම (Choices, Pitfalls). Native check. |
| swallow (ingestion), breathe in (inhalation)           | ගිලීම, ආශ්වාස කිරීම                                                        | Tier 4. Wikipedia (si) (ආශ්වාස).                                                                                                                                                                               |
| acute, chronic                                         | උග්‍ර, නිදන්ගත                                                             | Tier 4. Wikipedia (si) (නිදන්ගත රෝග).                                                                                                                                                                          |
| poison centre (poison line, poison control)            | විෂ තොරතුරු මධ්‍යස්ථානය (විෂ තොරතුරු සේවය)                                 | Tier 4. No source. Sri Lanka shows none (Law in Sri Lanka): never a number. The emergency number is **1990** (ambulance), as LK data gives it.                                                                 |
| blood lead test, blood lead reference value            | රුධිරයේ ඊයම් පරීක්ෂාව, රුධිරයේ ඊයම් යොමු අගය                               | Tier 4. No source.                                                                                                                                                                                             |
| lead-free (leadless)                                   | ඊයම් රහිත                                                                  | Tier 4. No source. Not the same as food safe.                                                                                                                                                                  |
| food safe (food-safe)                                  | ආහාරයට ආරක්ෂිත                                                             | **show English**. Tier 4. No source.                                                                                                                                                                           |
| leach test (laboratory leach test, metal release test) | ලීච් පරීක්ෂාව (රසායනාගාර ලීච් පරීක්ෂාව, ලෝහ මුදාහැරීමේ පරීක්ෂාව)           | Tier 1 and 4. No source. The metals a fired piece releases, not only lead and cadmium. Standard codes kept.                                                                                                    |
| liner glaze                                            | ලයිනර් ග්ලේස් (ආහාර ගැටෙන පෘෂ්ඨයට ග්ලේස්)                                  | **show English**. Tier 1. No source.                                                                                                                                                                           |
| contact dermatitis, barrier cream                      | ස්පර්ශ චර්ම ප්‍රදාහය, ආරක්ෂක ක්‍රීම්                                       | Tier 4. Wikipedia (si) (චර්ම ප්‍රදාහය). A barrier cream is not a glove (අත්වැසුම).                                                                                                                             |
| infrared (IR), IR-rated welding glasses, shade 3       | අධෝරක්ත (IR), IR ආරක්ෂාව සහිත වෑල්ඩින් කණ්ණාඩි, shade 3                    | Tier 3. Wikipedia (si) (අධෝරක්ත තරංග; වෑල්ඩින්). Sunglasses (අව් කණ්ණාඩි) and didymium glasses do not block it.                                                                                                |
| combustible, clearance, dedicated circuit              | දහනශීලී, ඉඩ තැබිය යුතු දුර, වෙනම විදුලි පරිපථය                             | Tier 4. No source.                                                                                                                                                                                             |

### 2.8 The app's own words

| English                                                                                | Sinhala                                                                                                                             | Notes                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recipe (Recipes)                                                                       | වට්ටෝරුව (වට්ටෝරු)                                                                                                                  | Tier 4. No source for a glaze recipe; the everyday word. "නව වට්ටෝරුව", "සුරැකි වට්ටෝරුව", "මා සුරැකි වට්ටෝරු", "වට්ටෝරු ගණකය". Never සූත්‍රය. Native check (Choices).                                                                                |
| studio notebook (notebook)                                                             | ස්ටුඩියෝ සටහන් පොත (සටහන් පොත)                                                                                                      | "ඔබේ ස්ටුඩියෝ සටහන් පොත", "ග්ලේස් සටහන් පොත".                                                                                                                                                                                                         |
| material (Materials)                                                                   | ද්‍රව්‍යය (ද්‍රව්‍ය)                                                                                                                | Wikipedia (si) ("සෙරමික් ද්‍රව්‍ය", "අමුද්‍රව්‍ය"). "ද්‍රව්‍යයේ නම:", "ද්‍රව්‍ය එක් කරන්න", "ද්‍රව්‍ය පිටුව".                                                                                                                                         |
| My materials                                                                           | මගේ ද්‍රව්‍ය                                                                                                                        | "මගේ සේවාදායක ද්‍රව්‍ය:".                                                                                                                                                                                                                             |
| Standard (standard materials)                                                          | සම්මත (සම්මත ද්‍රව්‍ය)                                                                                                              | Tab "සම්මත ({count})"; "සම්මත ද්‍රව්‍ය:", "ඇතුළත් ලැයිස්තුව", "සංග්‍රහය". Not සාමාන්‍ය (ordinary).                                                                                                                                                    |
| library                                                                                | සංග්‍රහය (ද්‍රව්‍ය සංග්‍රහය)                                                                                                        | No source; Native check. "ඔබේ ප්‍රදේශයේ විකිණෙන ඊයම් රහිත ෆ්‍රිට් කිසිවක් සංග්‍රහයේ නැත." Not a book library (පුස්තකාලය). The About page's "shared library" is code.                                                                                  |
| additive (Additives)                                                                   | ආකලන ද්‍රව්‍යය (ආකලන ද්‍රව්‍ය)                                                                                                      | No source; ආකලන as in food additives. Nav "ආකලන ද්‍රව්‍ය"; page "ආකලන ද්‍රව්‍ය සහ කලරන්ට්"; recipe "කලරන්ට් සහ ආකලන ද්‍රව්‍ය", "කලරන්ට් හෝ ආකලන ද්‍රව්‍යය".                                                                                           |
| amount (Amount)                                                                        | ප්‍රමාණය                                                                                                                            | Column "ප්‍රමාණය"; "ප්‍රමාණයක් ඇතුළත් කරන්න (0 ද කමක් නැත)."                                                                                                                                                                                          |
| Share                                                                                  | කොටස                                                                                                                                | Column: each material's percent of the batch. Not බෙදා ගන්න (sharing).                                                                                                                                                                                |
| To percent, To parts, Scale to a batch, Scale                                          | ප්‍රතිශතයට, කොටස්වලට, බැච් එකකට ගළපන්න, පරිමාණය වෙනස් කරන්න                                                                         | "පරිමාණය වෙනස් කරන්න:". Resizing, not the තරාදිය.                                                                                                                                                                                                     |
| Batch size, batch list, Weigh in, Weigh, Weighed, Running total, All together          | බැච් ප්‍රමාණය, බැච් ලැයිස්තුව, බර ඒකකය, කිරන්න, කිරූ, එකතුව මෙතෙක්, සියල්ල එකට                                                      | "බැච් ලැයිස්තුවක් පමණි: කිරිය යුතු දේ, ලකුණු කිරීමට කොටු සමඟ".                                                                                                                                                                                        |
| Unity formula (Unity)                                                                  | Seger සූත්‍රය (Seger)                                                                                                               | "කලරන්ට් සහ ආකලන ද්‍රව්‍ය ද එයට ගණන් කරන්න".                                                                                                                                                                                                          |
| Wildcards                                                                              | වෙනත් ඔක්සයිඩ                                                                                                                       | The column for oxides outside the three groups. Not jokers.                                                                                                                                                                                           |
| Compare                                                                                | සසඳන්න                                                                                                                              | "වට්ටෝරු දෙකක් සසඳන්න", "පළමු වට්ටෝරුව", "දෙවන වට්ටෝරුව", "වෙනස් කරන්න", "සමානයි".                                                                                                                                                                    |
| Save, Save and add next recipe, Save as a copy, Print                                  | සුරකින්න; සුරකින්න සහ ඊළඟ වට්ටෝරුව එක් කරන්න; පිටපතක් ලෙස සුරකින්න; මුද්‍රණය කරන්න                                                  | Google's -න්න form.                                                                                                                                                                                                                                   |
| swap (Try modern materials and compare, Undo the swap)                                 | ආදේශනය (නවීන ද්‍රව්‍ය අත්හදා බලා සසඳන්න, ආදේශනය අහෝසි කරන්න)                                                                        | "නවීන ද්‍රව්‍යවලින් ආදේශ කළා" → "නවීන ද්‍රව්‍යවලින් ආදේශ කෙරිණි".                                                                                                                                                                                     |
| like for like, gram for gram, one for one, pound for pound                             | සමානයකින් සමානයට; ග්‍රෑමයට ග්‍රෑමය; එකකට එකක්; රාත්තලට රාත්තල                                                                       | Idioms: the sense, in words, not digits.                                                                                                                                                                                                              |
| Suggest amounts and compare                                                            | ප්‍රමාණ යෝජනා කර සසඳන්න                                                                                                             | "පැරණි ද්‍රව්‍ය ලබා දුන් දේ නැවත ලබා ගන්න".                                                                                                                                                                                                           |
| Replace lead (Replace lead and compare)                                                | ඊයම් ආදේශ කරන්න (ඊයම් ආදේශ කර සසඳන්න)                                                                                               | "කෝන් දක්වා පිළිස්සූ", "ග්ලේස් එක නැවත ගොඩනඟන්න", "වර්ණ ඊයම් රහිත බේස් එකක තබා ගන්න".                                                                                                                                                                 |
| Match with what I have (Match and compare)                                             | මා සතු දේවලින් ගළපන්න (ගළපා සසඳන්න)                                                                                                 | "ඔබ සතු දේවලින්ම සාදන්න".                                                                                                                                                                                                                             |
| materials on hand (the shelf)                                                          | මා සතු ද්‍රව්‍ය (“රාක්කය”)                                                                                                          | A figure of speech, not a kiln shelf. Server: "රාක්කය යනු උපරිම ද්‍රව්‍ය {most}ක ලැයිස්තුවකි." (උපරිම = at most).                                                                                                                                     |
| Materials to try, Must use                                                             | අත්හදා බැලිය යුතු ද්‍රව්‍ය; අනිවාර්යයෙන් භාවිත කරන්න                                                                                | The label's own "must".                                                                                                                                                                                                                               |
| Leave it out, Allow more, Add it, Use it instead, Work it out again, What to watch for | එය ඉවත් කරන්න; තවත් ඉඩ දෙන්න; එය එක් කරන්න; ඒ වෙනුවට එය භාවිත කරන්න; නැවත ගණනය කරන්න; සැලකිලිමත් විය යුතු දේ                        |                                                                                                                                                                                                                                                       |
| Discontinued, Hard to get, Historical                                                  | නිෂ්පාදනය නවතා ඇත; ලබා ගැනීමට අපහසුයි; ඓතිහාසික                                                                                     | "{year} සිට නිෂ්පාදනය නවතා ඇත", "{year} සිට ලබා ගැනීමට අපහසුයි" (සිට after the year, no ending on it).                                                                                                                                                |
| Use instead, Similar, Replaces, Also called, Made by, Hazards                          | ඒ වෙනුවට භාවිත කරන්න; සමාන; ආදේශ කරයි; වෙනත් නම; නිෂ්පාදකයා; අනතුරු                                                                 | "රසායනය නැත: Seger සූත්‍රයෙන් බැහැර කර ඇත", "{name} ලෙස ගණන් කර ඇත".                                                                                                                                                                                  |
| Kind (All kinds)                                                                       | වර්ගය (සියලු වර්ග)                                                                                                                  | ෆෙල්ඩ්ස්පාර් සහ ස්ටෝන්, මැටි, ෆ්‍රිට්, බෝරෝන් ප්‍රභව, ෆ්ලක්ස්, සිලිකා, ඇලුමිනා, ඕපසිෆයර්, කලරන්ට්, සස්පෙන්ඩර්, වෙනත්.                                                                                                                                 |
| Sold in, Where you work                                                                | විකිණෙන ස්ථානය; ඔබ වැඩ කරන ස්ථානය                                                                                                   | All regions → "සියලු ප්‍රදේශ".                                                                                                                                                                                                                        |
| Firing logs (firing record)                                                            | පිළිස්සුම් සටහන් (පිළිස්සුම් වාර්තාව)                                                                                               | "පිළිස්සීමේ මාතෘකාව:", "පිළිස්සීම සටහන් කරන්න", "මා සුරැකි පිළිස්සීම්:".                                                                                                                                                                              |
| field, row                                                                             | තීරුව; පේළිය                                                                                                                        | "තීරුව එක් කරන්න", "පිළිස්සුම් වගුවට පේළියක් එක් කරන්න". Not a meadow (පිට්ටනිය).                                                                                                                                                                     |
| trial (Your trial, Try it now, Discard trial)                                          | අත්හදා බැලීම (ඔබේ අත්හදා බැලීම, දැන් අත්හදා බලන්න, අත්හදා බැලීම ඉවත දමන්න)                                                          | Never ආගන්තුක (guest).                                                                                                                                                                                                                                |
| Typing amounts                                                                         | ප්‍රමාණ ටයිප් කිරීම                                                                                                                 | "දශම සඳහා කොමාවක් හෝ තිතක්", "දශම සඳහා කොමාවක්", "දශම සඳහා තිතක්". Server: "දශම සලකුණ".                                                                                                                                                               |
| Firing (To Orton cones, By temperature, as a kiln controller's program)                | පිළිස්සීම (Orton කෝන් අනුව, උෂ්ණත්වය අනුව, කිල්න් කන්ට්‍රෝලරයක ප්‍රෝග්‍රෑම් එකක් ලෙස)                                               | Sri Lanka's default is by temperature. "කෝන් අනුව පිළිස්සීම සඳහා පෙන්වන්න", "උෂ්ණත්වය අනුව පිළිස්සීම සඳහා පෙන්වන්න".                                                                                                                                  |
| Glaze density (Specific gravity, Degrees Baumé, Pint weight)                           | ග්ලේස් ඝනත්වය (විශිෂ්ට ගුරුත්වය, බෝමේ අංශක, පයින්ට් බර)                                                                             | See 2.6.                                                                                                                                                                                                                                              |
| Light or dark, Colors                                                                  | ආලෝකමත් හෝ අඳුරු; වර්ණ                                                                                                              | Palette: ටෙන්මොකු මලකඩ, සෙලඩොන් කොළ, කොබෝල්ට් නිල්, ඔක්ස්බ්ලඩ් රතු, ෂිනෝ තැඹිලි, දර අළු ඔලිව්.                                                                                                                                                        |
| Batch weights (Grams, Pounds and ounces), Grams on printed batches                     | බැච් බර (ග්‍රෑම්, රාත්තල් සහ අවුන්ස), මුද්‍රිත බැච්වල ග්‍රෑම්                                                                       | "ග්‍රෑමයෙන් දහයෙන් පංගුවක් දක්වා", "පූර්ණ නිරවද්‍යතාව".                                                                                                                                                                                               |
| Lead (Off, On, Turn lead on, Keep it off)                                              | ඊයම් (ක්‍රියාවිරහිත, ක්‍රියාත්මක, ඊයම් ක්‍රියාත්මක කරන්න, ක්‍රියාවිරහිතව තබන්න)                                                     | The metal. "Off" never තෝරන්න.                                                                                                                                                                                                                        |
| English terms (Show the English after key terms)                                       | ඉංග්‍රීසි පද (ප්‍රධාන පදවලට පසුව ඉංග්‍රීසිය පෙන්වන්න)                                                                               | The setting that shows `<en>`/`{{en: …}}`.                                                                                                                                                                                                            |
| Translation notice (About this translation, Suggest a correction, Read the English)    | පරිවර්තන දැන්වීම (මෙම පරිවර්තනය ගැන, නිවැරදි කිරීමක් යෝජනා කරන්න, ඉංග්‍රීසියෙන් කියවන්න)                                            |                                                                                                                                                                                                                                                       |
| Trash                                                                                  | කුණු කූඩය                                                                                                                           | Usage (Google's Sinhala interface, not read today); Native check.                                                                                                                                                                                     |
| Remove (Yes, remove), Delete my account                                                | ඉවත් කරන්න (ඔව්, ඉවත් කරන්න); මගේ ගිණුම මකන්න                                                                                       | Google ("ඉවත් කරන්න", "මකා දැමීම"). "මෙය අහෝසි කළ නොහැක."                                                                                                                                                                                             |
| guide (Guides)                                                                         | මාර්ගෝපදේශය (මාර්ගෝපදේශ)                                                                                                            | No source; Native check. Every link, page title and list. A kiln's manual is "අත්පොත"; a maker's or school's guide ලිපිය, පොත් පිංචය or ලේඛනය (Pitfalls).                                                                                             |
| the five guides' titles                                                                | සරල කිල්න් එකක් පිළිස්සීම; මූලධර්මවල සිට ග්ලේස් දැමීම; ආරක්ෂිතව මිශ්‍ර කිරීම සහ වාතාශ්‍රය; ඔබේ පවුලට විෂ නොකවන්න; ග්ලේස් සාදන ආකාරය | Firing a basic kiln; Glazing from first principles; Safe mixing and ventilation; Don't poison your family; How to make a glaze. Identical in each front matter, si.json `titles`, guides/si.json `list` and every link text. No source; Native check. |
| manual (a kiln's, controller's or sitter's)                                            | අත්පොත                                                                                                                              | No source; Native check. Never මාර්ගෝපදේශය.                                                                                                                                                                                                           |

### 2.9 Where the potter works

The region texts' recurring labels (guides and regions files), as in hi.md 2.9.

| English                                                                                                                | Sinhala                                                                                                                  | Notes                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shops in (the label before a list of countries)                                                                        | සාප්පු:                                                                                                                  | guides: shops.shopsIn (the label form; Placeholders and names).                                                                                                                                           |
| raw glaze materials (what a shop sells)                                                                                | ග්ලේස් අමුද්‍රව්‍ය                                                                                                       | guides: shops.what.materials (Wikipedia (si): "අමුද්‍රව්‍ය").                                                                                                                                             |
| ready-made glazes                                                                                                      | සූදානම් කළ ග්ලේස්                                                                                                        | guides: shops.what.glazes.                                                                                                                                                                                |
| Packs seen                                                                                                             | දුටු ඇසුරුම්                                                                                                             | guides: shops.packs                                                                                                                                                                                       |
| A binding limit.                                                                                                       | නීතියෙන් බැඳෙන සීමාවකි.                                                                                                  | guides: silica.kind.binding                                                                                                                                                                               |
| An indicative limit: a guide value, not a legal ceiling.                                                               | දර්ශක සීමාවකි: උපදෙස් අගයක් මිස නීතිමය උපරිමයක් නොවේ.                                                                    | guides: silica.kind.indicative. Not මාර්ගෝපදේශ for "guide value".                                                                                                                                         |
| action level (US)                                                                                                      | ක්‍රියාමාර්ග මට්ටම (action level)                                                                                        | guides: silica.actionLevel                                                                                                                                                                                |
| quartz and cristobalite                                                                                                | ක්වාර්ට්ස් සහ ක්‍රිස්ටොබලයිට්                                                                                            | guides: silica.both                                                                                                                                                                                       |
| The national body for safety at work: <link>{name}</link>.                                                             | වැඩබිම් සුරක්ෂිතතාව පිළිබඳ ජාතික ආයතනය: <link>{name}</link>.                                                             | guides: silica.agency. Sri Lanka's: NIOSH, "ජාතික වෘත්තීය සුරක්ෂිතතා සහ සෞඛ්‍ය ආයතනය" (NIOSH LK).                                                                                                         |
| Kind of piece (food-contact rules)                                                                                     | භාණ්ඩයේ වර්ගය                                                                                                            | guides: food.article                                                                                                                                                                                      |
| pieces that cannot be filled, or no deeper than 25 mm                                                                  | පිරවිය නොහැකි භාණ්ඩ, හෝ ගැඹුර 25 mm නොඉක්මවන භාණ්ඩ                                                                       | guides: food.category.flat ("නොඉක්මවන" = at most).                                                                                                                                                        |
| Pieces that cannot be filled, or less than 2.5 cm deep                                                                 | පිරවිය නොහැකි භාණ්ඩ, හෝ ගැඹුර 2.5 cm ට වඩා අඩු භාණ්ඩ                                                                     | guides: food.category.jpFlat ("ට වඩා අඩු" = less than).                                                                                                                                                   |
| other pieces that can be filled                                                                                        | පිරවිය හැකි වෙනත් භාණ්ඩ                                                                                                  | guides: food.category.fillable                                                                                                                                                                            |
| cooking ware                                                                                                           | ඉවුම් පිහුම් භාණ්ඩ                                                                                                       | guides: food.category.auCooking, jpCooking, myCooking                                                                                                                                                     |
| The rim of a piece for drinking from: a 2 cm band, inside and out                                                      | පානය කරන භාණ්ඩයේ මුවවිට: ඇතුළතින් සහ පිටතින් 2 cm තීරුවක්                                                                | guides: food.category.rimBand                                                                                                                                                                             |
| average of 6 pieces / any one of 6                                                                                     | භාණ්ඩ 6ක සාමාන්‍යය / 6න් ඕනෑම එකක්                                                                                       | guides: food.judged.average, food.judged.each                                                                                                                                                             |
| A piece passes if it releases no more than the limit: the law says “at most”.                                          | සීමාව නොඉක්මවා මුදා හරින්නේ නම් භාණ්ඩය සමත් වේ: නීතිය “උපරිම” යැයි කියයි.                                                | guides: food.atMost. "උපරිම", "නොඉක්මවන" = at most; "ට වඩා අඩු" = under.                                                                                                                                  |
| Buying in (the label before a list of countries)                                                                       | මිලදී ගන්නා ස්ථානය:                                                                                                      | guides: equivalents.buyingIn                                                                                                                                                                              |
| differs by {grams} g per 100 g                                                                                         | 100 g කට {grams} g කින් වෙනස් වේ                                                                                         | guides: equivalents.apart                                                                                                                                                                                 |
| Directive 84/500/EEC (its official name)                                                                               | යුරෝපා සංගමයේ (EU) විධානය 84/500/EEC                                                                                     | regions: no Sinhala text binds; the number kept. Native check on විධානය.                                                                                                                                  |
| Japanese names in the firing guide, the records and the region data (kokka kentei, Ōsaka chūdoku 110-ban, ōgata kōn …) | the Sinhala gloss, then the Hepburn romanization with macrons, then the kanji in brackets where the English writes kanji | As the earlier waves: "ජපාන විෂ තොරතුරු මධ්‍යස්ථානය, ඔසාකා, Ōsaka chūdoku 110-ban (大阪中毒110番)", "kokka kentei (国家検定)". Chinese and Korean names keep their own script, as the English gives them. |
| emergency number; Emergency (a heading); calling the emergency number                                                  | හදිසි ඇමතුම් අංකය; හදිසි අවස්ථා (heading); හදිසි ඇමතුම් අංකය ඇමතීම                                                       | Sri Lanka's: 1990 (LK data). "1990 සුවසැරිය (1990)" only where the English gives the number.                                                                                                              |
| 24 hours, every day, free                                                                                              | පැය 24 පුරා, සෑම දිනකම, නොමිලේ                                                                                           | safety: hours. The 24 is the English's figure.                                                                                                                                                            |

### 2.10 Signing in

The words Google uses on its own Sinhala help pages (Microsoft's help pages were served in English; Apple has no Sinhala
pages), and the choice:

| English                                   | Sinhala                   | Notes                                                                                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| two-step sign-in (2-step verification)    | දෙපියවර පුරනය             | Google ("දෙපියවර සත්‍යාපනය", [185839](https://support.google.com/accounts/answer/185839?hl=si); "ආරක්ෂාව සහ පුරනය වීම"). දෙපියවර is a word, so no digit: the English writes "two-step" as a word, and a 2 is a figure the check rejects. Native check. |
| authenticator app                         | සත්‍යාපක යෙදුම            | Google ("සත්‍යාපකය සකසන්න", "සත්‍යාපන කේත යෙදුම්", [1066447](https://support.google.com/accounts/answer/1066447?hl=si)). "සත්‍යාපක යෙදුමේ කේතය".                                                                                                       |
| setup key (the key typed in)              | සැකසුම් යතුර              | No source (Google's page does not name it); යතුර as Google's "ආරක්ෂක යතුර". "යතුර පිටපත් කරන්න".                                                                                                                                                       |
| QR code                                   | QR කේතය                   | Google ("QR කේතය ස්කෑන් කරන්න").                                                                                                                                                                                                                       |
| passkey                                   | මුරයතුර (plural මුරයතුරු) | Google ("මුරපදයක් වෙනුවට මුරයතුරක් සමග පුරන්න", [13548313](https://support.google.com/accounts/answer/13548313?hl=si)). Never ආරක්ෂක යතුර (a security key).                                                                                            |
| recovery code (backup code)               | ප්‍රතිසාධන කේතය           | Google writes "උපස්ථ කේත" for backup codes ([1187538](https://support.google.com/accounts/answer/1187538?hl=si)); the app's "Recovery code" is "ප්‍රතිසාධන කේතය" every time, never උපස්ථ කේතය. No source; Native check.                                |
| the code from the app (verification code) | සත්‍යාපන කේතය             | Google ("සත්‍යාපන කේත ලබා ගන්න").                                                                                                                                                                                                                      |
| security key                              | ආරක්ෂක යතුර               | Google ("ආරක්ෂක යතුරක්", "දෘඪාංග ආරක්ෂක යතුර"). Never මුරයතුර.                                                                                                                                                                                         |
| sign in, sign out                         | පුරන්න, වරන්න             | Google ("පුරන්න", "Google සමග පුරන්න"; the noun පුරනය). වරන්න as remembered from Google's interface; no Sinhala page read says it: Native check. Never ඇතුල් වන්න / ඉවත් වන්න beside them.                                                             |
| account                                   | ගිණුම                     | Google ("Google ගිණුම", "ගිණුමක් සාදන්න").                                                                                                                                                                                                             |
| password                                  | මුරපදය                    | Google ("මුරපදය", "මුරපද").                                                                                                                                                                                                                            |
| trusted device                            | විශ්වාසදායක උපාංගය        | Google ("විශ්වාසදායක උපාංගවල", "මෙම උපාංගයෙන් නැවත අසන්න එපා").                                                                                                                                                                                        |

## 3. Never translated

From terms.md, unchanged:

- **Formulas and symbols:** SiO₂, Al₂O₃, B₂O₃, K₂O, Na₂O, Li₂O, CaO, MgO, BaO, SrO, ZnO, PbO, Fe₂O₃, FeO, Fe₃O₄, TiO₂, ZrO₂,
  ZrSiO₄, CoO, Co₃O₄, CuO, MnO₂, Cr₂O₃, SnO₂, P₂O₅, V₂O₅, CaCO₃, CO, CO₂ and the rest; R₂O, RO, R₂O₃, RO₂; KNaO; "×10⁻⁶/°C"
  and "x 10^-7/K".
- **Cone numbers:** 022 to 42 with their leading zeros (010, 08, 06, 04, 03, 01, 1, 5, 6, 10), SK numbers as printed (SK
  022, SK 015a, SK 6a, SK 20), and the "o'clock" bend positions (the words around them change; the clock figure stays).
- **Mesh numbers:** 50, 60, 80, 100, 120, 200, 325 mesh, -325 mesh, "200#".
- **Units:** °C, °F, K, °Bé, °C/h, °F/h, g, kg, mg, µg, ml/mL, L, lb, oz, fl oz, %, mm, cm, m³, mg/m³, µg/m³, µg/dL, µg/mL,
  µg/cm², µm (inches and feet take the language's word: අඟල්, අඩි, see Numbers and units).
- **Codes and standards:** N95, P100, FFP2, FFP3, P2, P3, KF94, KF80, EN 149, EN 140, AS/NZS 1716, HEPA, Class M, ASTM C738,
  ASTM D-4236, EN 1388, ISO 6486, AS 4371, JIS R 8101, IS 9473, IS 9806 (only where the English names them), the numbers of
  Directives 84/500/EEC and (EU) 2017/2398, CPG Sec. 545.450, 29 CFR 1910.1053, H-codes (H302, H360FD), GHS08, CAS numbers,
  IARC group numbers.
- **Names:** Glazecalc; "UMF" as an abbreviation; Seger, Orton (Orton Ceramic Foundation), Staffordshire, Bullers,
  Holdcroft, all in Latin letters (Seger too, see Choices).
- **Kiln and equipment makers and products:** Skutt (EnviroVent 2, KilnMaster), L&L (DynaTrol), Bartlett, Dawson
  (Kiln-Sitter, LT-3), Bracker's, Nabertherm; controller presets (Slow Bisque, Fast Bisque, Slow Glaze, Fast Glaze, "User
  6"); Digitalfire schedules (BQ1000, PLC6DS, C6DHSC).
- **Materials by trade name:** Ferro and Vibrantz frits (3110, 3124, 3134, 3195, 3249), Fusion frits (F-19 and others),
  Potterycrafts P3124 and P3195, Custer feldspar (Custer Spar), G-200, G-200 EU, G-200 HP, Mahavir, Minspar 200, Kona F-4,
  Norflux, FFF, Gerstley Borate, Gillespie Borate, Laguna Borate, Portabor, EPK, Grolleg, Eckalite, Eckaglas, TWVA, HVAR,
  Zircopax, Superpax, Excelopax, Ultrox, Zircosil, Darvan, Volclay, Bentone, Vansil, NYAD, Alberta Slip, Albany slip,
  Bayferrox, Mason stains, AMACO; Indian shops' codes as printed (CS, G-325, Frit 1005).
- **Sources, agencies and suppliers:** Glazy, Digitalfire, Ceramic Arts Network, Ceramics Monthly, HSE, OSHA, NIOSH, IARC,
  ECHA, FDA, CDC, EPA, NHS, COSHH, NEPSI, Safe Work Australia, WorkSafe New Zealand, SLSI; Laguna, Potclays, Potterycrafts,
  Valentine Clays, Sibelco, Imerys, Walker Ceramics, Bhoomi Pottery, Clay Station and the other suppliers named; the poison
  services in `safety/en.json` (with a Sinhala description once, as Law in Sri Lanka says). Sri Lanka's NIOSH is the
  National Institute of Occupational Safety and Health, not the US NIOSH: name the country beside it where both could be
  meant.
- **Placeholders and tags:** `{name}`, `{count}` and the rest, and `<b>`, `<settings>` and other tags.
