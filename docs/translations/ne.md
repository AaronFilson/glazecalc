# नेपाली: style sheet and glossary

For translating Glazecalc into Nepali (`ne`), for potters in Nepal (region `NP`) and the Nepali speakers of India (Sikkim
and Darjeeling, region `IN`). Read [README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English
term below. [hi.md](hi.md) and [mr.md](mr.md) are the models for the shape of this page, **not for its words**: Nepali
shares Devanagari with Hindi and Marathi, but its words, spellings and grammar are its own (Nepali अणु is a molecule and
परमाणु an atom; Nepali सिसा is both lead and, in everyday speech, glass; Nepali प्रसारण is a broadcast; Nepali तह is a
layer), and no term on this page is copied from hi.md or mr.md. Every Nepali message and guide follows this page: one
Nepali word for one thing. Nepal fires by temperature by default with the US library (`lib/regions/index.js`: `cones:
'temperature'`), with Orton cones one tap away, so the Nepali pages must read well with temperatures and Orton cones and
say nothing about SK cones that the English does not say.

**The owner's choices**, as for Hindi and Marathi:

- **Loanwords first.** The studio potters' English loanwords first, in Devanagari as Nepali-speaking potters say and write
  them (ग्लेज, फ्रिट, किल्न, बिस्की, फायरिङ), **with the Nepali technical term in brackets where it differs**. Each row says
  which tier it is in: (1) craft words potters say in English, (2) materials by the name on the bag, (3) chemistry and
  physics as Nepali-medium school science writes them, (4) health, safety and law in plain Nepali.
- **The full stop.** A sentence ends with the Latin full stop ".", never the danda "।". This is the owner's choice: Nepali
  software mostly does use the danda (Google's Nepali help pages end their sentences with "।"), so it is a deliberate
  departure, kept for the numbers and punctuation checks and for one rule across the Indic pages.
- **Digits and grouping.** The translations write 0 to 9 only. CLDR shows Nepali readers Devanagari digits (१२,३४,५६७.५)
  by default, with Indian grouping, so a page mixes the app's Devanagari figures with the translation's 0 to 9; the Digits
  setting gives 0 to 9 everywhere.
- **The Gregorian calendar.** Nepal's official calendar is the Bikram Sambat (2026 is 2083 BS); the app and every
  translation write Gregorian years only. A year the English gives is that year, never its BS year.
- **A native Nepali reviewer** will check this page later: every row that rests on no Nepali source is marked **No
  source**, and the rows to check first are marked **Native check** (listed at the end of the next section).

**What the sources could and could not give.** Very little is written in Nepali about studio glazes, and lib/regions lists
no shop in Nepal (round 8 found none with its own page). Nepali news about Thimi's potters gives the craft words as Nepali
potters say them: Thimi Ceramics' ware "१२५० डिग्री सेल्सियसमा पोलिन्छ", "बिस्की फायरिङ", "ग्लेज(कलर)", "स्टोनवेयर",
"प्लास्टर मोल्ड" (ekantipur); Parsa's potters "भट्टीमा पकाउने", "काँचो माटो", "चकटी (कुम्हाले चक्र)" (Bizmandu). The Nepali
Wikipedia gives the chemistry (अणु, परमाणु, जस्ता, सिलिकन, काँच "मुख्य कच्चा पदार्थ सिलिका (SiO2)", "पग्लन्छ", "मणिभ",
"लेड क्रिस्टल काँच", "पानीमा अति घुलनशील", "सापेक्षिक घनत्व", "विशिष्ट गुरुत्व ०.८३५"). Google's suggestions for Nepali
(hl=ne, gl=NP) show that Nepali speakers search glazes and cones in English and get Hindi pages for most Devanagari craft
words (see Search terms). Google's Nepali help pages give the sign-in words; Mozilla's Nepali style guide gives register,
plurals and number grouping. The Labour Act, 2017 gives the law's words. **No Microsoft Nepali style guide, no CDC
textbook text, no Nepal Academy dictionary entry, no Nepal Standard and no Nepali kiln manual could be read** (see Not
reached), so the kiln, defect and law rows rest on less, and say so.

Main sources, cited below by short name (all read 22 October 2026):

- **ekantipur**: Kantipur, [बाबुले माटाका भाँडा बनाए, छोराले सेरामिक](https://ekantipur.com/business/2022/03/02/164621102544552740.html)
  (2 March 2022, on Thimi Ceramics, Madhyapur Thimi): "फायरिङ", "१२५० डिग्री सेल्सियसमा पोलिन्छ", "बिस्की फायरिङ",
  "ग्लेज(कलर)", "सेरामिक भाँडा", "स्टोनवेयर", "तापक्रम", "डिग्री सेल्सियस", "माटोको भाँडा", "रङ", "प्लास्टर मोल्ड".
- **Bizmandu**: [पारसाका प्रजापति समुदाय](https://bizmandu.com/content/20261019082918.html) (19 October 2026): "भट्टीमा
  पकाउने", "काँचो माटो", "माटाका भाँडा", "भाँडाकुँडा", "घैँटो", "प्रजापति (कुम्हाल) समुदाय", "चकटी (कुम्हाले चक्र)".
- **newiki**: the Nepali Wikipedia, read through its API ([ne.wikipedia.org](https://ne.wikipedia.org/w/api.php)): अणु ("एक
  अणु, रासायनिक बन्धनद्वारा आयोजित दुई वा बढी परमाणुहरूको … समूह"), परमाणु, जस्ता ("रासायनिक सङ्केत Zn"), सिलिकन, सीसा
  (lead, the article's title), काँच ("मुख्य कच्चा पदार्थ सिलिका (SiO2)", "पग्लन्छ", "मणिभ नबनी एमर्फस ठोस", "लेड क्रिस्टल
  काँच", "बोरो सिलिकेट काँच"), भाँडाकुँडा and पिलेट ("धातु, काठ, सिसा, प्लास्टिक, चिनियाँ माटो": सिसा as glass, चिनियाँ
  माटो as chinaware), टिन ("टिन र सिसा बाट फ्युज": सिसा as lead; "पोर्सिलेन उद्योगहरू"), तामा, फलाम, एल्मुनियम, म्याग्नेसियम
  ("पानीमा उच्च घुलनशीलता"), अमोनिया ("पानीमा अति घुलनशील"), चुन (calcium hydroxide), चुनढुङ्गा, आर्क वेल्डिङ ("धातु पग्लन"),
  फिलामेन्ट चिम ("अक्सिकरण हुन्छ"), हाइड्रोमिटर ("सापेक्षिक घनत्व"), चरेस ("विशिष्ट गुरुत्व ०.८३५"), अप्टिकल फाइबर ("३
  तहमा"), माटो ("अङ्ग्रेजी: Soil").
- **Google**: Google's Nepali help pages: [२ चरण प्रमाणीकरण](https://support.google.com/accounts/answer/185839?hl=ne) ("२
  चरण प्रमाणीकरण अन गर्नुहोस्", "पुष्टि कोड", "ब्याकअप कोड", "हार्डवेयर सेक्युरिटी की", "पासकी", "QR कोड", "Google खाता",
  "पासवर्ड", "विश्वसनीय डिभाइस", "यो कम्प्युटरमा फेरि नमागियोस्", "डिसएबल"; the reader is तपाईं; sentences end in "।"),
  [the 2-Step Verification topic](https://support.google.com/accounts/topic/7189195?hl=ne) ("२ चरण प्रमाणीकरणका लागि सुरक्षा
  साँचो प्रयोग गर्ने तरिका", "Google एपहरू", "प्रतिक्रिया पेस गर्नुहोस्", "खोज बन्द गर्नुहोस्", "AI अनुवादमा त्रुटिहरू हुन
  सक्छन्।", "यो पेजमा"). The Authenticator, backup-code, passkey and sign-out pages are served in English (Not reached).
- **Google suggest**: suggestqueries.google.com with hl=ne and gl=NP (22 October 2026; the script and its output are in
  `scratch/round9/indic/ne/` in the main checkout): see Search terms.
- **Mozilla**: [Mozilla's Nepali localization style guide](https://wiki.mozilla.org/Nepal/Style_Guide): formal register;
  plurals by CLDR, "singular for 1 and plural for other values", plural verbs and adjectives in -आ; the Gregorian calendar
  ("even though Bikram Sambat is the regional calendar"); grouping "1,00,00,000"; brand names never translated; Microsoft's
  terminology as the approved term base. (Its 12-hour clock is not followed: see Numbers and units.)
- **Labour Act**: the Labour Act, 2017 (श्रम ऐन), as [nepallaws.com](https://nepallaws.com/?p=28650) publishes it: Chapter
  12 "व्यवसायजन्य सुरक्षा र स्वास्थ्य सम्बन्धी व्यवस्था" (sections 68 to 83: "दफा ६९ः श्रमिकप्रति रोजगारदाताको कर्तव्य",
  "दफा ७३ः श्रमिकको कर्तव्य", "दफा ७६ः तत्काल खतरा भएमा काम बन्द गर्ने", "दफा ८२ः व्यवसायजन्य रोगको उपचार"); [section
  69](https://nepallaws.com/?p=28656) ("कर्तव्य हुनेछः", "श्रमिकलाई आवश्यकता अनुसार व्यक्तिगत सुरक्षा साधन उपलब्ध गराउने",
  "रासायनिक, भौतिक वा जैविक पदार्थ"); section 61 ("निर्धारण भएकोभन्दा कम नहुने गरी … उपलब्ध गराउनु पर्नेछ", read in a search
  extract).
- **WageIndicator**: [स्वास्थ्य र सुरक्षा](https://wageindicator.org/ne-np/work-in-nepal/labour-law/health-and-safety) (a
  plain-Nepali summary of the Act): "व्यक्तिगत सुरक्षा उपकरणहरू उपलब्ध गराउने", "विष्फोटक वा प्रज्वलनशील धुलो, ग्याँस",
  "रोजगारदाताले … संरक्षण गर्नु पर्छ", "२० वा बढी श्रमिक भएका रोजगारदाताले", "श्रम निरीक्षक".
- **CLDR**: Node 24's ICU 78.3 (CLDR 48) for `ne`: plural categories `one`, `other` (0 is `other`); "१२,३४,५६७.५" (Latin
  digits with `-u-nu-latn`: 12,34,567.5); "५%"; long date "२०२६ अक्टोबर १४" (Latin: "2026 अक्टोबर 14"); 24-hour "20:00";
  months जनवरी, फेब्रुअरी, मार्च, अप्रिल, मे, जुन, जुलाई, अगस्ट, सेप्टेम्बर, अक्टोबर, नोभेम्बर, डिसेम्बर; lists "क, ख र
  ग"; regions नेपाल, भारत, संयुक्त राज्य, संयुक्त अधिराज्य, जर्मनी, जापान, "हङकङ चिनियाँ विशेष प्रशासनिक क्षेत्र", श्रीलङ्का.
- **Regions**: `lib/regions` (index.js, safety.js, workplace.js, suppliers.js, entry `NP`): 102 (ambulance and medical
  emergencies), 100 (police), 101 (fire), from ITU's list last updated in 2012; no poison line; the ministry "स्वास्थ्य तथा
  खाद्य स्वच्छता मन्त्रालय" (mohp.gov.np); "श्रम तथा व्यवसायजन्य सुरक्षा विभाग (Department of Labour and Occupational
  Safety)"; no shop. India's entry (`IN`, for Sikkim and Darjeeling): 112, the National Poisons Information Centre (NPIC),
  AIIMS New Delhi, 1800 116 117.
- **Indian shops**: Bhoomi Pottery's and Clay Station's product names, as mr.md quotes them (read 21 October 2026, not
  re-read): "Ball Clay", "China Clay Kaolin Calcined", "Frit 1009 Lead Based", "Soda Feldspar", "CS Whiting (G-200)",
  "Iron Oxide Red", "Orton Cones", menus "Raw Materials", "Kilns", "Glazes". The names on the bag, in English; no Nepali.

**Not reached:** a Microsoft Nepali style guide (none is published: the search found only Mozilla's, and Microsoft's
terminology blog does not list Nepali); Microsoft's and Apple's Nepali help pages (none found; Apple does not localize to
Nepali); Google's Authenticator, backup-code, passkey and Gmail sign-out pages in Nepali (served in English); the CDC's
Nepali-medium science textbooks (moecdc.gov.np gave no readable text; only an English translation of the Grade 10 book was
found); the Nepal Academy's नेपाली बृहत् शब्दकोश (no online text found); the Law Commission's own PDF of the Labour Act and
the Labour Rules, 2018 (only nepallaws.com's copy of the Act was read); the Consumer Protection Act's text; any Nepal
Standard (NS) for masks or ceramic ware from the Nepal Bureau of Standards and Metrology (none found); any Nepali GHS label
text; Thimi Ceramics' own pages, the Nepal Ceramics Co-operative and any Kathmandu studio's course page in Nepali (none
found; only English pages and the news above); any Nepali kiln maker's or dealer's page; the poison centre of Tribhuvan
University Teaching Hospital (news only, as Regions says). **The kiln, controller, firing-log, defect, safety and law rows
rest on the potters' English and plain Nepali, on no Nepali teaching source.**

## Choices for the owner and a native potter

These are the questions this page cannot settle from sources; each has a recommendation, used below until answered.

- **तपाईं:** the reader is **तपाईं**, with the -नुहोस् imperative (गर्नुहोस्, छान्नुहोस्), as Google's Nepali pages write it
  ("अन गर्नुहोस्", "प्रतिक्रिया पेस गर्नुहोस्"). Never तँ or तिमी; never हजुर, which no Nepali software source read uses.
- **The kiln:** **किल्न**, with (भट्टी) at its first use in each guide section, as the owner's loanword rule says. The
  evidence leans the other way and the owner should know it: Nepali potters and the press say भट्टी (Bizmandu "भट्टीमा
  पकाउने"; Thimi Ceramics' "उच्च-तापक्रम भट्टी"), and Google suggest knows no किल्न in Nepali (it completes to क्लिनिक). But
  भट्टी is also a stove, a brick kiln, a distillery and a furnace (Google suggest: "भट्टी चूल्हा"), and Indian shops sell
  "Kilns". A native potter may choose भट्टी throughout; the change is mechanical.
- **Firing:** the noun **फायरिङ** for a firing (ekantipur, Thimi Ceramics), the verb **पकाउनु** for to fire ("कोन 6 सम्म
  पकाउनुहोस्"; Bizmandu "भट्टीमा पकाउने"), fired **पाकेको** or **पकाइएको**, raw **काँचो** (Bizmandu "काँचो माटो": the
  same pair as raw and cooked food). ekantipur's **पोल्नु** ("पोलिन्छ") is also Nepali for firing, but पोल्नु is also to burn
  or scald, which the safety text needs for burns ("हात पोल्यो"), so it is not used for firing. Native check.
- **Bisque:** **बिस्की** (ekantipur's "बिस्की फायरिङ", what Thimi's potters say), with (पहिलो पकाइ) at first use. Google
  suggest completes both बिस्की and बिस्क to biscuits (बिस्कुट), so the bracket and "बिस्की फायरिङ" carry the sense. Native
  check: studio potters may write बिस्क.
- **Material:** **सामग्री**, the word Nepali cooking recipes head their ingredients with and Nepali's word for materials in
  general (निर्माण सामग्री). Google also uses it for content ("यो मद्दतसम्बन्धी सामग्री"), which the context rules out. The
  alternative is कच्चा पदार्थ (newiki काँच: "मुख्य कच्चा पदार्थ"), kept for "raw materials" in a shop's sense. Native check.
- **Lead:** **सिसा** for the metal and the setting (newiki "टिन र सिसा बाट फ्युज"; the Wikipedia's title spells it सीसा),
  with **(लेड)** at its first use in each guide section, and **lead-free सिसारहित**. सिसा is also everyday Nepali for glass
  (newiki "धातु, काठ, सिसा, प्लास्टिक"; Google suggest "सिसा फुटेको", broken glass), so **glass is always काँच**, never सिसा,
  anywhere in the app, and the lead frit is **सिसायुक्त फ्रिट (लेड फ्रिट)**. Native check, first of all.
- **Soluble and melting:** **घुलनशील** (soluble; newiki "पानीमा अति घुलनशील"), **अघुलनशील**, **थोरै घुलनशील**; to melt
  **पग्लनु** (newiki "पग्लन्छ"), melting point **पग्लने बिन्दु**. Never घुलनशील for melting, never पग्लने for soluble: "a
  low-solubility lead frit" is "कम घुलनशील सिसायुक्त फ्रिट", never "छिटो पग्लने". Check this row first in every safety file.
- **Specific gravity:** **विशिष्ट गुरुत्व** (newiki "विशिष्ट गुरुत्व ०.८३५"), the unitless ratio; school science's
  सापेक्षिक घनत्व (newiki हाइड्रोमिटर) is the same ratio but carries घनत्व, which the app keeps away from a glaze. The setting
  "Glaze density" is **ग्लेजको गाढापन**.
- **Kaolin:** **काओलिन (चाइना क्ले)**, as Indian shops sell it ("China Clay Kaolin Calcined"); never चिनियाँ माटो, which the
  Nepali Wikipedia uses for chinaware (plates made of "चिनियाँ माटो").
- **Guide and manual:** the app's guides are **मार्गदर्शिका**, a kiln's manual is **म्यानुअल** (Google suggest knows
  म्यानुअल). Never the same word, and never म्यानुअल for a manual kiln (हातले चलाउने किल्न). Guidelines are दिशानिर्देश.
- **Save:** **सेभ गर्नुहोस्**, the loanword Nepali apps use, never बचत गर्नुहोस् (बचत is savings, money put by). No Nepali
  source for Save was read; Native check.
- **Turn off:** **बन्द गर्नुहोस्** (switch off; Google "खोज बन्द गर्नुहोस्"), and for a setting **अफ गर्नुहोस्** beside
  Google's "अन गर्नुहोस्". Neither can read as "choose" (छान्नुहोस्). For a kiln, where बन्द could read as "close the lid",
  write "किल्नको स्विच बन्द गर्नुहोस्" or "किल्नको बिजुली बन्द गर्नुहोस्".
- **Poison line:** Nepal has none the app shows (Regions); India's NPIC is shown to Sikkim and Darjeeling. A poison line is
  **विष हेल्पलाइन**, a poison centre **विष सूचना केन्द्र**; no number the English lacks.

**Native check, first:** सिसा for lead (and काँच for glass); घुलनशील against पग्लनु in every safety file; किल्न against
भट्टी; पकाउनु for to fire; बिस्की; सामग्री and its plural; सेभ गर्नुहोस्; ग्लेज's bracket (काँचको पातलो लेप); विशिष्ट गुरुत्व
and गाढापन; सेगर सूत्र and युनिटी; अणुभार; तापीय प्रसार; फ्लक्स's bracket; the defect loanwords
and their brackets; श्वासमार्फत फोक्सोसम्म पुग्ने क्रिस्टलीय सिलिका; the law words (बढीमा, कम्तीमा); should and must (…नु उचित
हुन्छ against …नुपर्छ); मार्गदर्शिका for the guides and the five guides' titles (2.8); र्याम्प written without a joiner;
LOI as तताउँदा हुने तौल घटी.

## 1. Style sheet

### Register

**तपाईं**, polite and plain, in the interface, errors, notices, emails, the safety text and the guides alike: one register,
never तँ, तिमी or हजुर (see Choices). Mozilla's guide asks for formal Nepali, "translate for meaning rather than word for
word", and easy words over saved space: छान्नुहोस्, not चयन गर्नुहोस्; हेर्नुहोस्, not अवलोकन गर्नुहोस्; फेरि प्रयास गर्नुहोस्. The
same plain words in the guides: चाल्नुहोस्, तौल्नुहोस्, मिसाउनुहोस्.

- **Instructions** (guides and help): the -नुहोस् imperative, as Google writes it ("अन गर्नुहोस्"): "ग्लेजलाई 80 मेसको
  चाल्नीबाट दुई पटक चाल्नुहोस्.", "सामग्री तौल्दा रेस्पिरेटर मास्क लगाउनुहोस्." Not the bare imperative (गर, लगा), which is
  तिमी's; not कृपया on every button.
- **Buttons:** the -नुहोस् form, the verb last: सेभ गर्नुहोस्, प्रिन्ट गर्नुहोस्, तुलना गर्नुहोस्, मेटाउनुहोस्, रद्द
  गर्नुहोस्.
- **Errors:** short and impersonal, in the passive -इएन ("could not"), never the computer as "I": "रेसिपी सेभ गर्न सकिएन.
  फेरि प्रयास गर्नुहोस्.", "यो फाइल पढ्न सकिएन.", "केही गडबड भयो." Error as a noun is **त्रुटि** (Google "त्रुटिहरू").
- **Notices:** plain statements: "यो पेज AI ले अनुवाद गरेको हो. अङ्ग्रेजी पेज पढ्न यहाँ हेर्नुहोस्."
- **Guide sentences:** impersonal statements and the -नुहोस् imperative: "ग्लेज धेरै बाक्लो भयो भने फायरिङमा बग्छ.",
  "बिस्की गरिएको भाँडामा ग्लेज सजिलै लगाउन सकिन्छ."
- **Must, should, may** keep apart, as the English has them. Plain …नुपर्छ is "must" in Nepali, so "should" takes another
  form:
  - "must" → **…नुपर्छ** ("मास्क लगाउनुपर्छ"), with **…नैपर्छ** where the English stresses it ("परीक्षण गर्नैपर्छ"); a legal
    duty ("shall") → **…नु पर्नेछ**, as the Labour Act writes it ("उपलब्ध गराउनु पर्नेछ"). "must not" → **…नुहुँदैन** ("सुक्खा
    कुचो प्रयोग गर्नुहुँदैन"), or **न…नुहोस्** in an instruction ("सुक्खा कुचोले नबढार्नुहोस्").
  - "should" → **…नु उचित हुन्छ** ("मास्क लगाउनु उचित हुन्छ") or, in a step, **…नुहोला** ("मास्क लगाउनुहोला"); "should not"
    → **…नु उचित हुँदैन**. Never …नुपर्छ for "should", never उचित हुन्छ for "must".
  - "may" (a hazard, a hedge that must survive) → **…न सक्छ** ("क्यान्सर हुन सक्छ", "यसमा केही मसिना क्वार्ट्ज हुन सक्छ");
    "may" (permission) → **…न सक्नुहुन्छ** ("तपाईं बदल्न सक्नुहुन्छ"). "can" as possibility is also …न सक्छ, never a
    permission.
  - "must be tested" → **परीक्षण गर्नुपर्छ**: the test is done, not passed; never "परीक्षणमा पास हुनुपर्छ".
  - "some" (some fine quartz) → **केही**, never **अलिकति** or **थोरै** (a little). "never" → **कहिल्यै … न-** only where
    the English says never; no सधैँ, पटक्कै or निश्चय the English lacks. "not fully" → **पूर्ण रूपमा … न-**, never "not at
    all".
- **Hedges keep their place and their strength**: "about" → **करिब** or **लगभग**; "usually" → **सामान्यतया**; "often" →
  **धेरैजसो**, never सम्भवतः; "probably" → **सम्भवतः**; "tend to" → **…ने प्रवृत्ति हुन्छ** or **…ने गर्छ** ("बग्ने
  प्रवृत्ति हुन्छ"), never सामान्यतया (the app has separate "tends" and "probably" messages); "may shiver" → **…न सक्छ**;
  "as much as" → **…सम्म** ("चार गुणासम्म"). Add no emphasis the English lacks, and keep a reported practice a report ("is
  opened", not "should be opened"). English capitals for emphasis (NOT, NEVER, CONTAINS LEAD) have no Devanagari form: the
  warning starts with **सावधान:** ("सावधान: सिसा छ"), and NOT or NEVER in a guide becomes the Nepali word in bold
  (**होइन**, **कहिल्यै**); in a JSON message, where bold does not show, the plain word.

### Buttons, menus, headings, labels and tabs

- **Buttons and menu commands:** the -नुहोस् imperative, short (Mozilla: one or two words where the English has them): सेभ
  गर्नुहोस्, प्रिन्ट गर्नुहोस्, तुलना गर्नुहोस्, मेटाउनुहोस्, हटाउनुहोस्, सामग्री थप्नुहोस्. **Save is सेभ गर्नुहोस्**, never
  बचत गर्नुहोस् (Choices). Delete (gone for good) is मेटाउनुहोस्; Remove (taken out of a list) is हटाउनुहोस्.
- **Headings, tabs, page titles:** a noun phrase: "रेसिपी", "सेटिङहरू", "फायरिङ लग", "कोन र हिटवर्क". A heading that
  names an activity takes the -ने form with a noun, or the -नु infinitive: "Mixing the glaze" → "ग्लेज मिसाउने तरिका",
  "Typing amounts" → "मात्रा टाइप गर्नु". A question stays one: "ग्लेज किन बग्छ?"
- **Field labels:** a noun; the colon where the English has one, no space before it: "सामग्रीको नाम:".
- **Confirmations:** "Saved: {name}" → "सेभ भयो: {name}" (the label form, so nothing agrees with {name}); "Removed" →
  "हटाइयो".
- **Progress:** the -दै form and the ellipsis: "Saving…" → "सेभ गर्दै…", "Loading…" → "लोड हुँदै…".

### Capitalisation

Devanagari has no capitals; the English's Title Case and sentence case go with the English words. Latin words inside
Nepali text keep the English's case where they are names, codes, units or formulas (Orton, SK, UMF, LOI, Ferro 3134, N95,
mg/m³, SiO₂), as Google writes "Google खाता", "QR कोड". An English loanword is written in Devanagari (ग्लेज, फ्रिट, किल्न),
never in Latin letters, unless it is a trade name, a trademark (Kiln-Sitter, Zircopax), a company or brand (Google, Skutt),
a code or a unit. A Latin name takes its postposition after a space: "Ferro 3134 मा", "Orton को चार्ट", "Google खाता".

### Script and spelling

- **Devanagari as Nepali writes it**, never Hindi or Marathi spellings. The page is `lang="ne"`, so fonts draw Nepali's own
  forms (झ, the Nepali digit forms where the app shows them).
- **The chandrabindu** is used as Nepali spells the word: भाँडा, काँचो, काँच, धुवाँ, पाँच, गाउँ, साँचो, पिँध, सधैँ,
  घैँटो. Not added to loanwords (ग्लेज, फ्रिट, सिलिका).
- **The halanta** at the end of a word only where Nepali writes it: verb forms (गर्नुहोस्, छन्, सक्छन्, पर्छ), and the
  postposition forms that take it (सम्म, लागि do not); loanwords end without one (ग्लेज, फ्रिट, पासवर्ड, कम्प्युटर), as
  Google writes them.
- **Tatsama words with the nasal consonant** (पञ्चम वर्ण) where Nepali spelling has it: सङ्केत, सङ्ख्या, अङ्ग्रेजी,
  श्रीलङ्का, शङ्कु, चुनढुङ्गा, म्याङ्गनिज, as newiki and CLDR write them; the anusvara in the words Nepali spells with it
  (संयुक्त, संरक्षण, अंश).
- **Loanwords as Nepali spells them** (Google: "ब्याकअप", "डिभाइस", "कम्प्युटर", "सेक्युरिटी"; ekantipur: "फायरिङ",
  "स्टोनवेयर"; newiki: "म्याग्नेसियम", "क्याल्सियम"): the English a of "cat" is **-्या** (ब्याच, म्याट, क्याल्सियम, ब्याकअप);
  v is **भ** (डिभाइस, भेन्ट, भ्याकुम); z is **ज** (ग्लेज, जिंक, जिरकन, क्वार्ट्ज); -ing is **-िङ** (फायरिङ, सेटिङ, क्रेजिङ);
  -ware is **-वेयर** (स्टोनवेयर, अर्थनवेयर); -tion is **-सन** (अक्सिडेसन, भेन्टिलेसन); the open o is **अ** (अक्साइड, कपर,
  बल क्ले, कलर). **No nukta**: Nepali writes फ, ज, ड plain (फ्रिट, ग्लेज), never फ़, ज़.
- **No ZWJ, no ZWNJ, no other invisible character** (the i18n check refuses both). Nepali's eyelash ra (the half र before य, as in
  the word for a rally) is typed with a ZWJ, so it is **not** used: write the plain र्य (र्याम्प, ड्र्याफ्ट), as most Nepali
  web text types it.
  Native check on the look in the app's fonts.
- **Latin text** inside Nepali: units, formulas, trade names, codes and cone numbers exactly as the English writes them,
  with a space on each side where the English has one (10 g, 1222 °C, Orton कोन 6, SiO₂ को).
- **Digits** are 0 to 9 only (see Numbers and units).
- **Every file** in Unicode form NFC, with only Devanagari and Latin letters (the script check).

### Punctuation

- **The full stop "."** ends a sentence, with no space before it and one after: "ग्लेज बग्छ." A heading, a button and a list
  item that is not a sentence end with nothing. Never the danda "।" (the owner's choice; Google's Nepali pages use it).
- **Comma, question mark, colon, semicolon** as in English, no space before them. No "!" in the app's own voice.
- **Quotation marks:** “ ” for quotations and a quoted word (“बोरन ब्लु”), ‘ ’ inside them. **UI names in running text** in
  single curly quotes: "‘तुलना गर्नुहोस्’ छान्नुहोस्". Never the straight ' around a name: before `{`, `}` or `#` ICU reads it
  as a quote (README).
- **Parentheses** as English, no space inside them. The bracketed Nepali term follows the loanword after one space:
  "किल्न (भट्टी)".
- **Dashes:** the en dash for ranges with no spaces (10–60%, कोन 06–04); the em dash sparingly: a comma, a colon or a new
  sentence instead where the English allows.
- **Ellipsis** "…" where the English has one.

### Numbers and units

- **The digits 0 to 9** wherever the English has digits (the international form of Indian numerals), never Devanagari
  digits (० १ २), which the numbers check does not read, even though the app shows Nepali readers Devanagari digits by
  default when it formats a number. Never spelled-out figures where the English has digits.
- **The decimal point and the English's figures** as the English writes them: 1.5; 0.025; 12,500; 1222 °C and 1000 g
  ungrouped. The app groups numbers the Indian way (12,34,567.5), as CLDR and Mozilla write Nepali, when it formats them; a
  translation writes only the English's figures, never लाख or करोड for one ("12,500" stays 12,500, never "साढे बाह्र
  हजार").
- **Percent:** 5%, no space (CLDR "५%"); a range 10–60%. In running text प्रतिशत only where the English spells "percent"
  out as a word with no sign.
- **Units:** the English's symbols in Latin letters, with the English's spacing: g, kg, mg, µg, mL, L, mm, cm, °C, °F, °Bé,
  %, mg/m³; never ग्राम, के.जी., से.मि. or डिग्री सेल्सियस in place of a symbol (the numbers check does not read them;
  डिग्री सेल्सियस only where the English spells "degrees Celsius" out). Inches and feet are the words **इन्च** and **फिट**,
  with the metric figure in brackets as the English gives it: "12 इन्च (30 cm)".
- **A number the English writes as a word** ("two coats", "three tiles", "once", "one number hotter") stays a word, since a
  digit would be a figure the English lacks: "दुई तह", "तीन टाइल", "एक पटक", "एक नम्बर तातो". Where the English has the digit,
  the digit stays: "3 coats" → "3 तह".
- **Dates:** "14 अक्टोबर 2026", "अक्टोबर 2026": the day, the month named beside the year, Latin digits, the Gregorian
  calendar (CLDR's own long form is "2026 अक्टोबर 14"; either order keeps the month beside the year, and a translation
  follows the English's order of figures). **Never a Bikram Sambat or Nepal Sambat year or month** (2026 is never 2083, and
  अक्टोबर is never कात्तिक), and never वि.सं. or सन् added where the English has no era. The month names are CLDR's: जनवरी,
  फेब्रुअरी, मार्च, अप्रिल, मे, जुन, जुलाई, अगस्ट, सेप्टेम्बर, अक्टोबर, नोभेम्बर, डिसेम्बर.
- **Clock times:** the 24-hour clock, **20:00**, with बजे after it if the sentence needs it ("20:00 बजेसम्म"). "8am to
  8pm" → "8:00 देखि 20:00 सम्म"; "8 to 5" → "8:00 देखि 17:00 सम्म" where the English means hours of the day, else as the
  English writes it. Never बिहान, दिउँसो, बेलुका or राति with a 12-hour figure ("राति 8 बजे"), which the check would read as
  8 (Mozilla's 12-hour clock is not followed). "24 hours" → "24 घण्टा"; "24/7" → "24/7" or "24 घण्टा, हप्ताको 7 दिन" (the 7
  is a figure).
- **No figures the English lacks:** no Devanagari digits, no लाख or करोड, no Bikram Sambat years (2074 for the Labour Act's
  2017), no SK or Orton equivalents, no converted units, no NS or IS numbers where the English names none.

### Plural forms

CLDR gives Nepali two cardinal categories, `one` and `other` (Node: `[ 'one', 'other' ]`). **`one` is exactly 1**; 0, 0.5,
1.5, 2 and 21 are `other` (unlike Hindi, whose `one` also covers 0). Mozilla: "singular for 1 and plural for other
values".

| Category | Numbers                 | Example                                                    |
| -------- | ----------------------- | ---------------------------------------------------------- |
| `one`    | 1                       | 1 सामग्री, 1 तह, 1 रेसिपी, 1 टाइल, 1 ग्लेज, 1 घण्टा        |
| `other`  | 0, 0.5, 1.5, 2, 3, 21 … | 0 सामग्री, 2 तह, 3 रेसिपी, 2 टाइल, 5 ग्लेज, 3 फ्रिट, 2 कोन |

Every plural message has both forms, and `=0 {…}` stays where the English has it:
`{count, plural, one {# material} other {# materials}}` → `{count, plural, one {# सामग्री} other {# सामग्री}}`. The
`other` form must read right for 0 ("0 टाइल"), since 0 falls there. Where the English's `one` has no `#` ("your passkey"),
write the Nepali for exactly one, as the English does.

**The noun after a number.** Nepali marks the plural with **-हरू** (Google "एपहरू", "त्रुटिहरू"), but a noun after a number
or a quantity word usually drops it: "3 सामग्री", "2 कोन", "5 ग्लेज", never "3 सामग्रीहरू". Loanwords behave the same (3
फ्रिट, 2 टेस्ट टाइल); none takes the English -s. A noun with no number may take -हरू where the English plural matters ("सबै
सामग्रीहरू", "सेटिङहरू"). Postpositions join the noun with no change to it: "3 कोनमध्ये", "2 घण्टामा", "5 ग्लेजको".

**The verb agrees with the number** (Mozilla: plural verbs and adjectives in -आ/-ए): `one {# सामग्री थपियो} other {# सामग्री
थपिए}`, `one {# तह लगाइयो} other {# तह लगाइए}`; the possessive takes **-को** before a singular noun and **-का** before a plural
one (`one {# रेसिपीको नाम} other {# रेसिपीका नामहरू}`). Nepali marks gender only for women and female animals, so no
material, loanword or record takes a feminine form: every row below is unmarked. A weight or temperature takes no noun:
`{n} g`.

### Placeholders and names

Nepali joins its postpositions to the word (-मा, -को/-का/-की, -लाई, -बाट, -सँग, -सम्म), and **the word does not change before
them** (नेपाल → नेपालमा, नेपालको), so a placeholder whose value is a Nepali word can take them directly:

- **{region}** is a country's or region's name in Nepali from the browser (नेपाल, भारत, संयुक्त राज्य, संयुक्त अधिराज्य, जापान;
  Hong Kong is "हङकङ चिनियाँ विशेष प्रशासनिक क्षेत्र", a region). Join the postposition: "in {region}" → "{region}मा", "{region}'s
  rules" → "{region}का नियमहरू". Never call it देश (a country): where a noun is needed it is **क्षेत्र** ("{region} क्षेत्रमा"
  only where the English says "the region of").
- **{name}, {library}, {count} and Latin names** take the postposition after a space ("{name} मा", "{count} मध्ये",
  "Ferro 3134 मा"), or, better, a generic noun after them that takes it: "{name}'s analysis" → "{name} सामग्रीको विश्लेषण";
  "from {library}" → "{library} सूचीबाट"; "{name} was saved" → "{name} रेसिपी सेभ भयो".
- **-को/-का/-की agree with the noun after them**, never with the placeholder: "{region}को सीमा" (singular), "{region}का नियमहरू"
  (plural or honorific). -की only before a woman.
- **A verb agrees with its subject's number** (and person), so a placeholder subject with an unknown number takes a generic
  singular noun: "{name} is no longer made" → "{name} सामग्री अब बनाइँदैन".

### Cones

Orton cones are written **Orton** in Latin letters wherever the English says Orton, beside **कोन** (the potters' loanword:
Indian shops' "Orton Cones"; Google suggest: Nepali speakers type "कोन 6" and get "cone 6 temperature celsius"; the Nepali
**शङ्कु** in brackets at the first use in each guide section: "कोन (शङ्कु)"): "Orton कोन 6", "कोन 06", "Orton का कोनहरू".
कोन is not कोण (an angle, with ण), so no clash. **SK cones** are SK with the number as printed (SK 6a) where the English has
them. **Seger** is **सेगर** only where the English says Seger: the firing guide's older European cones (सेगर कोन) and the
**सेगर सूत्र** (UMF), which never names a cone. Never give an SK number for an Orton number or the reverse, nor say they are
equal, nor add a cone to "mid fire" or "high fire" where the English has none.

- **One number hotter, one number cooler:** "**एक नम्बर तातो**" and "**एक नम्बर चिसो**" (the guard cone is "एक नम्बर तातो
  कोन"; "कोन 05, कोन 04 भन्दा एक नम्बर चिसो हो"); never माथिल्लो, तल्लो, ठूलो, सानो, or नम्बर बढी/घटी, which would read the
  wrong way (cone 05 is cooler than 04). Where the English says a cone "two numbers lower" or "next higher", write चिसो or
  तातो ("दुई वा तीन नम्बर चिसो SK कोन"). The upper cone of a range is "तातो कोन". "Below cone 03" is "कोन 03 भन्दा चिसो
  फायरिङमा". माथिका/तलका stays only for a place in the kiln (Cones Top, Cones Bottom).
- **cone 06** is written 06 with its zero, never 6.

### The unity formula

**सेगर सूत्र (UMF)** at its first use in each guide section and in the setting, "सेगर सूत्र" afterwards; सूत्र is Nepali's
formula. The app's short "Unity formula" is "सेगर सूत्र", the label "Unity:" is "सेगर:". "unity" as the scaling is
**युनिटी**, explained once as "फ्लक्सहरूको जम्मा एक मानेर" (एक as a word). The three columns: ग्लास फर्मर (RO₂), स्टेबिलाइजर
(R₂O₃), फ्लक्स (R₂O र RO). A glaze recipe is **रेसिपी**: never सूत्र for a recipe. Molecular words use **अणु** (molecule;
newiki: "एक अणु … दुई वा बढी परमाणुहरूको … समूह"), and the atom is **परमाणु**. No Nepali name for the UMF was found (No
source; Native check).

### Gender-neutral wording

Nepali verbs mark gender only for women (गरिन्, गर्छिन्), so the text never guesses the reader's:

- **तपाईं's forms carry no gender**: "तपाईं गर्नुहुन्छ", "तपाईंले गर्नुभयो", "तपाईं बदल्न सक्नुहुन्छ".
- **Imperatives** (-नुहोस्) carry no gender: "चाल्नुहोस्", "लगाउनुहोस्".
- **Impersonal and passive forms**: "रेसिपी सेभ भयो", "यो गर्न सकिन्छ", "मास्क लगाउनु उचित हुन्छ".
- People in general are plural or named by role: "कुमालेहरू", "पटरहरू", "प्रयोगकर्ताहरू", "मानिसहरू"; a generic single
  person takes the unmarked forms (उहाँ, गर्नुहुन्छ), never ऊ … गर्छिन्. **कुमाल** and **प्रजापति** are traditional
  potters' communities (Bizmandu: "प्रजापति (कुम्हाल) समुदाय"), so the guides say **पटर** or **माटोका कलाकार** where the
  English means studio potters in general (Native check).

### The reader in the guides

तपाईं where the sentence needs a subject; steps are -नुहोस् imperatives; explanations are impersonal ("ग्लेज धेरै बाक्लो भयो
भने बग्छ"). Short plain sentences, one Nepali sentence for one English sentence where Nepali allows. Quotations are
translated into “…” and keep their figures as the English writes them. **The bracketed Nepali term** (the rows below that
give one) goes right after the loanword **at its first use in each guide section**, before the `{{en: …}}` mark where the
term has one: "फ्लक्स (पग्लने बिन्दु घटाउने अक्साइड){{en: flux}}". Never in a button, a label, a table heading or a message
of the JSON files; in the glossary of glazing-basics (the definition list), each term line may give it once.

- **A section is a `##` heading** with everything under it down to the next `##`; a `###` subsection does not start a new
  count.
- **The first standalone use** in running text takes the bracket: किल्न (भट्टी), कोन (शङ्कु), and the rows below that give a
  bracket. A word with a postposition takes the bracket before it: "किल्न (भट्टी) मा", "किल्न (भट्टी) को".
- **Not counted:** a fixed compound name (किल्न सिटर, किल्न वाश, किल्न सेल्फ, कोन प्याक, कोन अफसेट, विटनेस कोन, गाइड कोन), a
  table cell, a link's text, a bold list label ("**किल्न:**") and a quotation, where the bracket goes on the next use.
- **`{{en: …}}`** follows the bracket where the term is marked "show English", at its first use in each section, as above.

### The app's feature names

Written exactly as on the button or tab, once the Nepali JSON files exist (recipe/ne.json, library/ne.json, ne.json,
account/ne.json); in running text in single curly quotes, ‘…’, unless the English wraps the name in `<b>`, `**…**` or
another tag: then the tag, without quotes. A name takes its postposition after a generic noun: "‘तुलना गर्नुहोस्’
छान्नुहोस्", "‘मेरा सामग्री’ ट्याबमा", "‘सिसा बदल्नुहोस्’ सुविधा". "Settings" in running text is "सेटिङहरू"; inside
`<settings>…</settings>` write the word the sentence needs ("<settings>सेटिङहरू</settings>मा").

| English                       | Nepali (button, label)                 | In running text                          |
| ----------------------------- | -------------------------------------- | ---------------------------------------- |
| Compare                       | तुलना गर्नुहोस्                        | तुलना; ‘तुलना गर्नुहोस्’ सुविधा          |
| Suggest amounts (and compare) | मात्रा सुझाउनुहोस् (र तुलना गर्नुहोस्) | ‘मात्रा सुझाउनुहोस्’ सुविधा              |
| Match with what I have        | मसँग भएका सामग्रीले मिलाउनुहोस्        | ‘मसँग भएका सामग्रीले मिलाउनुहोस्’ सुविधा |
| Replace lead                  | सिसा बदल्नुहोस्                        | ‘सिसा बदल्नुहोस्’ सुविधा                 |
| Settings                      | सेटिङहरू                               | सेटिङहरू                                 |
| Notebook                      | नोटबुक                                 | स्टुडियो नोटबुक                          |
| Library                       | लाइब्रेरी                              | सामग्रीको लाइब्रेरी                      |
| Standard                      | मानक                                   | मानक सामग्री                             |
| My materials                  | मेरा सामग्री                           | ‘मेरा सामग्री’ ट्याब                     |
| Trial                         | ट्रायल                                 | ट्रायल                                   |

### Law in Nepal

The Labour Act was read in Nepali (Labour Act; WageIndicator); the Labour Rules, the Consumer Protection Act and any Nepal
Standard were not (Not reached), so the words below keep the English's limits exact from the Act's own forms where it has
them; **Native check, and confirm against the Law Commission's texts when a reviewer can reach them**.

- **Limits:** "at most", "no more than", "up to" (a limit) → **बढीमा** or **…भन्दा बढी नहुने** (the limit itself passes):
  "up to 25% nepheline syenite" in a hazard line → "बढीमा 25%". **…सम्म** only where "up to" is no limit: a usage range
  ("60% सम्म प्रयोग गरिन्छ"), a temperature reached ("कोन 6 सम्म पकाउनुहोस्"), a date. "less than", "under", "below" →
  **…भन्दा कम** (it does not reach); "at least", "or more" → **कम्तीमा** or **…वा बढी** (WageIndicator "२० वा बढी
  श्रमिक"), or the Act's **…भन्दा कम नहुने** ("निर्धारण भएकोभन्दा कम नहुने गरी"); "more than", "over", "above" → **…भन्दा
  बढी**. "or less" ("25 mm deep or less", "3% or less") and an "up to" that caps an amount, a rate or a temperature ("up to
  3%", "up to 500 °F/h") are at-most limits too: **बढीमा** or **…भन्दा बढी नहुने**, never "…वा सोभन्दा कम" read loosely or a
  bare सम्म. Never …भन्दा कम for "at most", never …भन्दा बढी for "at least": a slip moves a legal limit.
- **The Act:** the Labour Act, 2017 → **श्रम ऐन (2017)** where the English names it, with the English's year and never
  2074; its Chapter 12 is "व्यवसायजन्य सुरक्षा र स्वास्थ्य" (occupational safety and health; Labour Act); a duty is
  **कर्तव्य**, an employer **रोजगारदाता**, a worker **श्रमिक**, a labour inspector **श्रम निरीक्षक**, personal protective
  equipment **व्यक्तिगत सुरक्षा साधन** (Labour Act section 69; WageIndicator "व्यक्तिगत सुरक्षा उपकरण"), an occupational disease
  **व्यवसायजन्य रोग**. The Labour Rules → **श्रम नियमावली**; the Consumer Protection Act → **उपभोक्ता संरक्षण ऐन** (No source
  read; the usual Nepali titles).
- **No limit, no standard:** Regions found no silica limit and no mask standard in Nepal. "We could not confirm a national
  limit" → "राष्ट्रिय सीमा पुष्टि गर्न सकिएन". An exposure limit → **सम्पर्क सीमा** (exposure = breathing it in at work).
- **Bodies:** **श्रम तथा व्यवसायजन्य सुरक्षा विभाग** (Department of Labour and Occupational Safety, as Regions names it);
  the health ministry **स्वास्थ्य तथा खाद्य स्वच्छता मन्त्रालय**, as Regions names it from mohp.gov.np (checked 21 October
  2026; older texts and the round 9 brief say Ministry of Health and Population, स्वास्थ्य तथा जनसङ्ख्या मन्त्रालय: write the
  name the app shows); the **नेपाल गुणस्तर तथा नापतौल विभाग** (Nepal Bureau of Standards and Metrology) and its Nepal Standards
  (**नेपाल गुणस्तर, NS**) only where the English names them (No source read for the bureau's name; Native check).
- **Who to call:** **102** (एम्बुलेन्स: ambulance and medical emergencies), **100** (प्रहरी, police), **101** (दमकल, fire),
  from Regions, only as the English gives them. India's (for Sikkim and Darjeeling): **112** ("आपत्कालीन नम्बर 112") and the
  **National Poisons Information Centre (NPIC), AIIMS New Delhi**, **1800 116 117**, the name as AIIMS publishes it, in
  English, with a Nepali description once: "विष सूचना केन्द्र".
- **GHS:** no Nepali GHS label text was read. Signal words: "Danger" → **खतरा**, "Warning" → **चेतावनी**; "Not classified"
  → **वर्गीकृत गरिएको छैन** (never हानिरहित, harmless). H-codes kept. Native check.
- **EU and other law**, where the English names it (Directive 84/500/EEC, Directive (EU) 2017/2398, CLP, the FDA's rules,
  India's Code): no Nepali text binds in Nepal; write **युरोपेली सङ्घ (EU) को निर्देशन 84/500/EEC**, **CLP नियमन (EC) No
  1272/2008**, with the number kept, so that the English's scope (the 3 L that applies only to packaging and storage
  vessels) stays as it is. US and UK bodies keep their English names with a Nepali gloss once: OSHA (अमेरिकाको व्यवसायजन्य
  सुरक्षा निकाय), HSE (बेलायतको स्वास्थ्य र सुरक्षा निकाय): "the UK's HSE" → "बेलायतको HSE".

### Agencies, organisations and companies

Nepali marks no gender on them; a name takes the singular verb and -ले as the doer: "HSE ले भन्छ", "FDA ले चेतावनी दिन्छ",
"IARC का अनुसार", "Orton ले भन्छ", "Digitalfire ले बताउँछ". Several names together take the plural ("Potclays र Bath Potters
ले बेच्छन्"); a person takes the honorific ("Derek Au … गर्नुहुन्छ"). Glosses once: NHS (बेलायतको सरकारी स्वास्थ्य सेवा), CDC
(अमेरिकाको रोग नियन्त्रण निकाय), FDA (अमेरिकाको खाद्य तथा औषधि निकाय), EPA (अमेरिकाको वातावरण संरक्षण निकाय), IARC (विश्व
स्वास्थ्य सङ्गठनको क्यान्सर अनुसन्धान निकाय), ECHA (युरोपेली रसायन निकाय).

### Pitfalls

- **Hindi and Marathi look-alikes** (never copy from hi.md or mr.md): Nepali **अणु** is a molecule and **परमाणु** an atom
  (newiki); lead is **सिसा**, glass **काँच**; a coat is **तह** (Nepali तह is a layer; newiki "३ तहमा"); a sieve **चाल्नी**; a
  scale **तराजु**; ash **खरानी**; a pot **भाँडो**, pots **भाँडा**; the foot of a pot **पिँध**; to fire **पकाउनु**; soluble
  **घुलनशील**, to melt **पग्लनु**. Hindi's ज़्यादा, चाहिए, ज़रूरी and Marathi's जास्त, आवश्यक are not Nepali: बढी, …नुपर्छ,
  आवश्यक (Nepali has it too, as "needed").
- **ग्लेज, इनामेल, वार्निस, रङ:** a glaze is **ग्लेज** (the material and the coat; ekantipur); to glaze **ग्लेज लगाउनु**.
  **इनामेल** (enamel on metal, enamel paint), **वार्निस** (varnish) and **रङ/पेन्ट** (paint) are not glazes. ekantipur's
  "ग्लेज(कलर)" shows potters also call a coloured glaze "कलर": the app says ग्लेज for every glaze and **कलरेन्ट** for a
  colorant.
- **फ्रिट and फ्लक्स:** a frit is **फ्रिट** (a factory glass); a flux is **फ्लक्स** (the oxide's role). Not soldering flux
  (झालोको फ्लक्स), not magnetic flux (चुम्बकीय फ्लक्स).
- **किल्न, भट्टी, ओभन, फर्नेस:** a potter's kiln is **किल्न** (भट्टी at the first use per section); भट्टी alone is also a
  stove, a brick kiln and a distillery; **ओभन** a kitchen oven and **फर्नेस** a furnace, used only where the English says
  them.
- **बिस्की and काँचो:** **काँचो** is unfired (काँचो भाँडा, greenware; काँचो माटो); **बिस्की** is the first firing and its ware
  (बिस्की फायरिङ, बिस्की गरिएका भाँडा). Never काँचो for bisque, never बिस्की for unfired ware. **बिस्की is not बिस्कुट** (Google
  suggest completes it to biscuits): say "बिस्की फायरिङ" or "बिस्की गरिएको" at least once per section. **कच्चा पदार्थ** is
  raw materials in a shop's sense.
- **अर्थनवेयर, टेराकोटा, स्टोनवेयर, पोर्सिलेन, चिनियाँ माटो, माटाका भाँडा:** earthenware is **अर्थनवेयर**; **टेराकोटा** is the
  red, usually unglazed low-fired ware, only where the English says terracotta; stoneware is **स्टोनवेयर** (ekantipur);
  porcelain is **पोर्सिलेन** (newiki टिन). **चिनियाँ माटो** is chinaware in everyday Nepali (newiki), never kaolin and never
  porcelain; kaolin is **काओलिन (चाइना क्ले)**. **माटाका भाँडा** is pottery in general (and Nepal's traditional low-fired
  ware), not a translation of earthenware.
- **सिलिका, सिलिकन, सिलिकोन रबर, बालुवा:** silica is **सिलिका** (SiO₂; newiki काँच); the element is **सिलिकन** (newiki);
  silicone rubber **सिलिकोन रबर**. **सिलिका जेल** (Google suggest's top hit) is the drying sachet. Sand is **बालुवा**.
- **ह्वाइटिङ, चुना, चक, चुनढुङ्गा:** whiting is **ह्वाइटिङ** (calcium carbonate, CaCO₃; Clay Station's "CS Whiting"); **चुना**
  is lime (slaked lime, and the lime eaten with paan); **चक** is a blackboard chalk; **चुनढुङ्गा** is limestone (newiki).
  None is used for whiting; "lime" in a frit's name is चुना only there ("सोडा-पोटास-चुना फ्रिट").
- **बोरन, बोरेक्स, बोरिक एसिड:** B₂O₃ is **बोरन (B₂O₃)**, formally बोरन अक्साइड; borax is **बोरेक्स (सोहागा)** (Google suggest:
  "सोहागा"); boric acid is **बोरिक एसिड**. In the safety text, name each as the English does.
- **पोटास and सोडा:** "potash" (K₂O) is **पोटास (K₂O)**, formally पोटासियम अक्साइड; पोटास is also a fertiliser in Nepal
  (Google suggest "पोटास खाद"), so the oxide always has K₂O at its first use in a section. The safety guide's potash
  (potassium carbonate) is **पोटासियम कार्बोनेट**. "soda" (Na₂O) is **सोडा (Na₂O)**, formally सोडियम अक्साइड; soda ash is
  **सोडा एस (सोडियम कार्बोनेट)**; सोडा alone is also soda water, washing soda and baking soda.
- **स्टेन and कलरेन्ट:** a stain (factory-made) is **स्टेन (तयारी रङ)**: स्टेन is also a mark (दाग); a colorant is
  **कलरेन्ट (रङ दिने अक्साइड)**.
- **रेस्पिरेटर, भेन्टिलेटर, भेन्टिलेसन:** a respirator is **रेस्पिरेटर मास्क** at first use, then रेस्पिरेटर; a hospital
  ventilator is **भेन्टिलेटर**, never meant here; ventilation of a room is **हावाको आवतजावत (भेन्टिलेसन)**.
- **मार्गदर्शिका and म्यानुअल:** the app's five guides are **मार्गदर्शिका**; a kiln's, controller's or sitter's manual is
  **म्यानुअल**. Never the same word. A maker's, supplier's or school's own "guide" is **पुस्तिका** (a booklet), **लेख** (an
  article) or **कागजात** (a document), never मार्गदर्शिका; "a guide, not a prediction" is "अनुमानको दिशा मात्र". **गाइड कोन**
  is a cone's name and stays.
- **Save and safe:** Save is **सेभ गर्नुहोस्**, safe is **सुरक्षित** (खानाका लागि सुरक्षित): no clash.
- **रिडक्सन, घटाउ, छुट:** reduction is **रिडक्सन (अपचयन)**; never घटाउ (a decrease) or छुट (a discount).
- **प्रसार and प्रसारण:** thermal expansion is **तापीय प्रसार**; प्रसारण is a broadcast and is never used for it.
- **क्रेजिङ and क्र्याकल:** crazing is **क्रेजिङ** (a defect); crackle is **क्र्याकल** (wanted); a crack through the pot from
  heating or cooling is **डन्टिङ (चिरा)**.
- **विशिष्ट गुरुत्व and घनत्व:** specific gravity is **विशिष्ट गुरुत्व**, a ratio with no unit (1.45); **घनत्व** is density in
  g/cm³ or kg/m³ and is never used for a glaze; a glaze's density (the setting) is **गाढापन**; never लिटरको तौल.
- **लिचिङ:** leaching is **लिचिङ (धातु निस्कनु)**; the leach test is a test of the metals a fired piece releases, not
  narrowed to lead and cadmium.
- **सूत्र and रेसिपी:** a recipe is **रेसिपी**, a chemical formula **सूत्र**, the unity formula **सेगर सूत्र**.
- **प्लास्टिक, स्टेबिलाइजर, सस्पेन्डर, कुकी, म्यानुअल:** loanwords that mean something else in Nepali homes (plastic, a
  voltage stabiliser, braces, a biscuit, a manual): see their rows.
- **Placeholders:** see Placeholders and names.
- **Japanese names:** Hepburn with macrons, with the kanji in brackets where the English writes kanji: tokutō (特等), yontō
  (四等), kanri nōdo (管理濃度), kokka kentei (国家検定), Ōsaka chūdoku 110-ban (大阪中毒110番), ōgata kōn (大型コーン), Kyōto
  zēgeru (京都ゼーゲル), Yūkō Shōji (有恒商事).
- **Words to keep one way across files:** harmonised classification **एकरूप वर्गीकरण**; Error **त्रुटि**; a firing or
  material record **रेकर्ड**, notes and the Notes page **टिपोट/टिपोटहरू** (to record = टिपोट गर्नु, रेकर्ड गर्नु); AI
  assistant **AI सहायक**; translucent **अर्धपारदर्शी**, semi-opaque **अर्ध-अपारदर्शी** (never swapped); a shed **बाहिरको छुट्टै
  कोठा** (never सेड, which would read as a shade); vent **भेन्ट**; "lime" as an oxide or in totals **क्याल्सियम** (चुना only
  in a frit's name).

### Search terms (docs/seo-plan.md, item 9)

Google's suggestions for Nepali (hl=ne, gl=NP, 22 October 2026) show that Nepali speakers search for studio glazes in
English, in Latin letters: **कोन 6** completes to **cone 6 temperature celsius**, **cone 6 glazes**, **cone 6 porcelain
recipe**, **cone 6 firing temp**. In Devanagari, **ग्लेज** completes to a Hindi trading company and glazed paper, **भट्टी**
to stoves and fertiliser (and the Nepali forms भट्टीमा, भट्टीको), **किल्न** to क्लिनिक, **बिस्की** and **बिस्क** to biscuits,
**सेरामिक ग्लेज** and **ग्लेजिङ** to nothing; **माटाका भाँडा**, **कुमालेको चक्र**, **कुमाल जाति**, **स्टोनवेयर क्ले** and
**काओलिन क्ले** are searched. **Proposed title:** "Glazecalc: सेरामिक ग्लेज क्याल्कुलेटर, माटोका भाँडाका लागि निःशुल्क".
**Description terms:** सेरामिक ग्लेज रेसिपी, ग्लेज, माटाका भाँडा, किल्न (भट्टी), फ्रिट, फेल्डस्पार, कोन 6, सेगर सूत्र (UMF),
and the English "glaze calculator" once in brackets. Every Nepali title and description that says ग्लेज carries सेरामिक or
माटाका भाँडा with it.

## 2. Glossary

"show English" marks the terms whose English a reader can ask to see after them (`<en>…</en>`, `{{en: …}}`). **Tier** in
the Notes: 1 craft loanword, 2 material by its bag name, 3 school chemistry and physics, 4 plain Nepali and the law (see
the opening). Nepali marks no grammatical gender on these nouns (Plural forms), so no row gives one. **Usage**: the word
Nepali news, Indian shops, Google's suggestions or the Nepali Wikipedia use, in no Nepali teaching source; **No source**: a
best choice with no Nepali source. A term in brackets after the Nepali is the technical term for the guides' first use per
section.

### 2.1 Glaze and its chemistry

| English                                      | Nepali                                                                | Notes                                                                                                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze                                        | ग्लेज; to glaze ग्लेज लगाउनु; glazed ग्लेज लगाइएको (काँचको पातलो लेप) | **show English**. Tier 1. ekantipur ("ग्लेज(कलर)"); Thimi Ceramics' "सेरामिक ग्लेजिङ". The bracket is No source. Unglazed: ग्लेज नलगाइएको. Not इनामेल, वार्निस or रङ (Pitfalls). **Native check** on the bracket. |
| glass former                                 | ग्लास फर्मर (काँच बनाउने अक्साइड)                                     | **show English**. Tier 1. No source. The RO₂ column, silica. UI "ग्लास फर्मर - RO₂". काँच, never सिसा.                                                                                                            |
| flux                                         | फ्लक्स (पग्लने बिन्दु घटाउने अक्साइड)                                 | **show English**. Tier 1. No source; Native check. Also a category ("फ्लक्स") and "फ्लक्स गर्ने क्षमता" (fluxing power). Not soldering or magnetic flux.                                                          |
| stabilizer                                   | स्टेबिलाइजर (ग्लेजलाई बग्न नदिने अक्साइड)                             | **show English**. Tier 1. No source; Native check. A स्टेबिलाइजर at home is a voltage stabiliser: say "स्टेबिलाइजर अक्साइड" at first use. UI "स्टेबिलाइजर - R₂O₃".                                                |
| oxide                                        | अक्साइड                                                               | Tier 3. newiki ("अल्यूमिनियम अक्साईड", spelled अक्साइड here). Formulas never translated; the app's two names: formal "क्याल्सियम अक्साइड", the potters' "क्याल्सियम".                                             |
| R₂O and RO                                   | R₂O र RO                                                              | Symbols kept. UI "फ्लक्स - RO".                                                                                                                                                                                   |
| alkali, alkaline                             | क्षार; alkaline क्षारीय                                               | Tier 3. newiki (अमोनिया: "क्षारीय प्रकृतिको"). "क्षारीय फ्रिट", "क्षारीय कपर ब्लु". The R₂O oxides, not the pH sense; Native check.                                                                               |
| unity molecular formula (UMF)                | सेगर सूत्र (UMF)                                                      | **show English**. Tier 3. No Nepali name found; Native check. "सेगर सूत्र (UMF)" at first use, then "सेगर सूत्र". "Unity formula" → "सेगर सूत्र", "Unity:" → "सेगर:".                                             |
| unity                                        | युनिटी (फ्लक्सहरूको जम्मा एक मानेर)                                   | Tier 1. No source; Native check. "in unity" → "युनिटीमा"; एक as a word. Not एकता.                                                                                                                                 |
| limit formula (target formula)               | लिमिट सूत्र (लक्ष्य सूत्र)                                            | **show English**. Tier 1. No source. Not a legal limit: never सीमा alone, which the law and the silica text use.                                                                                                  |
| silica to alumina ratio                      | सिलिका-एलुमिना अनुपात                                                 | **show English**. No source (अनुपात, Nepali maths' ratio). UI "सिलिका र एलुमिनाको अनुपात: {ratio}", "सिलिका-एलुमिना {ratio}:1".                                                                                   |
| flux balance                                 | फ्लक्स सन्तुलन                                                        | No source. UI "फ्लक्स सन्तुलन", "सन्तुलन".                                                                                                                                                                        |
| oxide analysis (analysis, chemical analysis) | अक्साइड विश्लेषण (विश्लेषण, रासायनिक विश्लेषण)                        | Tier 3. No source. UI "अक्साइड विश्लेषण, पकाएपछि, तौलअनुसार".                                                                                                                                                     |
| formula (raw formula, fired)                 | सूत्र (काँचो सूत्र; पकाएपछि)                                          | Tier 3. No source read (Nepali chemistry's सूत्र). UI "काँचो सूत्र:", "सूत्र लेख्नुहोस् (पकाएपछिको):", "सूत्र, बिक्रीको रूपमा:". Never रेसिपी.                                                                    |
| loss on ignition (LOI)                       | तताउँदा हुने तौल घटी (LOI)                                            | **show English**. Tier 3. No source; Native check. "तताउँदा हुने तौल घटी (LOI)" at first use; the UI's bare "LOI" stays LOI. Not पोल्दा (Choices: पोल्नु is kept for burns).                                      |
| mole                                         | मोल                                                                   | Tier 3. No source read (Nepali chemistry's मोल). Not the animal or a mark on the skin (कोठी).                                                                                                                     |
| molecular weight                             | अणुभार                                                                | Tier 3. newiki's अणु (molecule); never परमाणु भार (atomic weight). UI "सूत्रको काँचो अणुभार". Native check.                                                                                                       |
| equivalent weight, fired weight              | समतुल्य भार; पकाएपछिको तौल                                            | Tier 3. No source; Native check. UI columns "समतुल्य भार", "पकाएपछिको तौल".                                                                                                                                       |
| melt (noun)                                  | पग्लिएको ग्लेज                                                        | Tier 4. newiki ("पग्लिएका धातुहरू"). "पग्लिएको ग्लेजलाई कडा बनाउँछ", "पग्लिएको ग्लेजबाट ग्यासका फोका".                                                                                                            |
| thermal expansion (expansion)                | तापीय प्रसार (प्रसार)                                                 | **show English**. Tier 3. No source; Native check. Never प्रसारण (a broadcast). UI "प्रसार, ×10⁻⁶/°C"; "CTE" and "x 10^-7/K" kept.                                                                                |
| stiff, fluid, runny (viscosity)              | कडा, तरल, बग्ने (श्यानता)                                             | Tier 3 and 4. No source for श्यानता (Native check). "बग्ने" also describes a thin slurry: context decides.                                                                                                        |
| raw, fired                                   | काँचो; पाकेको (पकाइएको)                                               | Tier 4. Bizmandu ("काँचो माटो", "भट्टीमा पकाउने"). "काँचो ह्वाइटिङ", "काँचो माटो", "पाकेका अक्साइड". Never काँचो for bisque (2.3).                                                                                |
| gloss, satin, matte                          | ग्लसी, साटिन, म्याट                                                   | Tier 1. No source. "चम्किलो" in running text where the English says shiny. साटिन is not the fabric here.                                                                                                          |
| opaque, transparent, translucent, clear      | अपारदर्शी, पारदर्शी, अर्धपारदर्शी, क्लियर                             | Tier 3 and 1. No source read; the usual Nepali words. "क्लियर ग्लेज" is a glaze type, not "स्पष्ट". Semi-opaque is अर्ध-अपारदर्शी, never अर्धपारदर्शी.                                                            |
| stable, durable                              | स्थिर; टिकाउ                                                          | Tier 4. No source (Thimi Ceramics: "टिकाउ भाँडो", in a search summary). "स्थिर ग्लेज" (balanced, resists leaching).                                                                                               |
| crystals, crystalline                        | क्रिस्टल (मणिभ); क्रिस्टलीय                                           | Tier 1 and 3. newiki काँच ("मणिभ नबनी", "लेड क्रिस्टल काँच"). "क्रिस्टलीय ग्लेज". "क्रिस्टलीय सिलिका" is the dust hazard (2.7).                                                                                   |
| boron blue                                   | “बोरन ब्लु”                                                           | Keep the quotes; translate the sense (दुधिलो नीलो-सेतो) where the English explains it. No source.                                                                                                                 |
| celadon                                      | सेलाडन                                                                | Tier 1. No source. Palette "सेलाडन हरियो".                                                                                                                                                                        |
| tenmoku (temmoku)                            | टेन्मोकु                                                              | Tier 1. No source; Native check on the spelling. Palette "टेन्मोकु खिया" (खिया, rust).                                                                                                                            |

### 2.2 Materials and oxides

| English                                           | Nepali                                                       | Notes                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| silica (SiO₂)                                     | सिलिका (SiO₂)                                                | **show English**. Tier 2. newiki काँच ("मुख्य कच्चा पदार्थ सिलिका (SiO2)"), अप्टिकल फाइबर. Not सिलिकन (the element), सिलिकोन रबर or सिलिका जेल. Category "सिलिका".                                                                                                          |
| alumina (Al₂O₃)                                   | एलुमिना (Al₂O₃)                                              | Tier 2. No source (newiki spells the metal एल्युमिनियम). Category "एलुमिना"; formal "एल्युमिनियम अक्साइड".                                                                                                                                                                  |
| boron (B₂O₃)                                      | बोरन (B₂O₃)                                                  | Tier 3. No source. Category "बोरनका स्रोत"; formal "बोरन अक्साइड".                                                                                                                                                                                                          |
| potash (K₂O)                                      | पोटास (K₂O)                                                  | **show English**. Tier 1. Google suggest ("पोटास", "पोटास खाद", "पोटासियम"). Formal पोटासियम अक्साइड. Always with K₂O at first use (पोटास is also a fertiliser). The safety guide's potash is पोटासियम कार्बोनेट: check which. KNaO kept.                                   |
| soda (Na₂O)                                       | सोडा (Na₂O)                                                  | **show English**. Tier 1. newiki (सोडियम). Formal सोडियम अक्साइड. Soda ash is सोडा एस; in firing logs "Soda" is a soda firing (2.4).                                                                                                                                        |
| lithium (Li₂O)                                    | लिथियम (Li₂O)                                                | Tier 2. Clay Station ("Lithium Carbonate", Indian shops). Records' "lithia" → लिथिया.                                                                                                                                                                                       |
| calcium, lime (CaO)                               | क्याल्सियम; lime चुना (CaO)                                  | Tier 3. newiki (थोरियम: "क्याल्सियमको प्रक्रिया"; चुन). The UI says "क्याल्सियम"; चुना only in frit names ("सोडा-पोटास-चुना फ्रिट"). Not the fruit (कागती); "lime green" → "कागती हरियो".                                                                                   |
| magnesium, magnesia (MgO)                         | म्याग्नेसियम; म्याग्नेसिया (MgO)                             | Tier 3. newiki (म्याग्नेसियम). Formal "म्याग्नेसियम अक्साइड".                                                                                                                                                                                                               |
| barium (BaO), barium carbonate                    | बेरियम (BaO), बेरियम कार्बोनेट                               | Tier 2. Clay Station ("CS Barium Carbonate (G)"). विषालु (2.7).                                                                                                                                                                                                             |
| strontium (SrO)                                   | स्ट्रोन्सियम (SrO)                                           | Tier 2. Bhoomi, Clay Station ("Strontium Carbonate").                                                                                                                                                                                                                       |
| zinc (ZnO), zinc oxide                            | जिंक (ZnO), जिंक अक्साइड                                     | Tier 2. Clay Station ("CS Zinc Oxide (G-325)"). newiki's जस्ता is the metal ("रासायनिक सङ्केत Zn"), not used for the oxide. "क्याल्साइन्ड जिंक".                                                                                                                            |
| lead (PbO)                                        | सिसा (लेड) (PbO); its compounds लेड अक्साइड, सिसायुक्त फ्रिट | Tier 3 and 4. newiki ("टिन र सिसा बाट फ्युज"; title सीसा); Bhoomi "Frit 1009 Lead Based". Setting "सिसा". Glass is never सिसा: always काँच (Choices). **Native check**, first of all.                                                                                       |
| iron (red iron oxide, black iron oxide)           | आइरन (रेड आइरन अक्साइड, ब्ल्याक आइरन अक्साइड)                | Tier 2. Bhoomi ("Iron Oxide Red", "Iron Oxide Black"); newiki's फलाम in running chemistry only ("फलामको अक्साइड"). Fe₂O₃ red, Fe₃O₄ black. "Crocus martis" kept.                                                                                                            |
| titanium, titania (TiO₂)                          | टाइटेनियम; टाइटेनिया (TiO₂)                                  | Tier 3. No source. Formal टाइटेनियम डाइअक्साइड.                                                                                                                                                                                                                             |
| raw materials (materials)                         | सामग्री; a shop's raw materials कच्चा पदार्थ                 | Tier 4. Usage (Nepali cooking recipes head their ingredients "सामग्री"); newiki काँच ("कच्चा पदार्थ"); Indian shops' menu "Raw Materials". UI page "सामग्री". **Native check** (Choices).                                                                                   |
| feldspar (spar)                                   | फेल्डस्पार                                                   | **show English**. Tier 2. Bhoomi, Clay Station; Google suggest ("फेल्डस्पार"). "spar" in names stays ("Custer Spar"). Category "फेल्डस्पार र स्टोन".                                                                                                                        |
| potash feldspar, soda feldspar                    | पोटास फेल्डस्पार; सोडा फेल्डस्पार                            | Tier 2. Clay Station ("CS Potash Feldspar", "CS Soda Feldspar"), Bhoomi ("Soda Feldspar"). अर्थोक्लेज; एल्बाइट.                                                                                                                                                             |
| nepheline syenite                                 | नेफेलिन साइनाइट                                              | **show English**. Tier 2. Clay Station ("CS Nepheline Syenite (G-325)"). No Nepali source.                                                                                                                                                                                  |
| Cornish stone (Cornwall stone, china stone)       | कर्निस स्टोन (कर्नवाल स्टोन, चाइना स्टोन)                    | Tier 2. No source. "स्टोन" is a material, not a ढुङ्गा (pebble).                                                                                                                                                                                                            |
| kaolin (UK: china clay)                           | काओलिन (चाइना क्ले)                                          | **show English**. Tier 2. Bhoomi ("China Clay Kaolin Calcined"); Google suggest ("काओलिन क्ले"). चाइना क्ले at first use per section. Never चिनियाँ माटो (Pitfalls). Native check.                                                                                          |
| calcined                                          | क्याल्साइन्ड (पहिल्यै तताइएको)                               | Tier 2. Bhoomi ("Calcined"). The bracket No source. "क्याल्साइन्ड काओलिन", "क्याल्साइन्ड फ्लिन्ट", "क्याल्साइन्ड जिंक".                                                                                                                                                     |
| ball clay                                         | बल क्ले                                                      | **show English**. Tier 2. Bhoomi ("Ball Clay"). "बल" is part of the name (Nepali फुटबल), not a shape.                                                                                                                                                                       |
| bentonite                                         | बेन्टोनाइट                                                   | Tier 2. No source; Indian shops' English.                                                                                                                                                                                                                                   |
| slip clay                                         | स्लिप क्ले                                                   | Tier 2. No source. Not स्लिप (2.3).                                                                                                                                                                                                                                         |
| whiting                                           | ह्वाइटिङ (क्याल्सियम कार्बोनेट)                              | **show English**. Tier 2. Clay Station ("CS Whiting (G-200)"). Not चुना (lime), चक (chalk) or चुनढुङ्गा (limestone).                                                                                                                                                        |
| dolomite, talc                                    | डोलोमाइट; ट्याल्क                                            | Tier 2. Clay Station ("CS Dolomite", "CS Talc"), Bhoomi ("Pottery Talc"). Both supply MgO.                                                                                                                                                                                  |
| wollastonite                                      | वोलास्टोनाइट                                                 | Tier 2. Bhoomi, Clay Station ("Wollastonite").                                                                                                                                                                                                                              |
| flint                                             | फ्लिन्ट                                                      | **show English**. Tier 2. No source. UK: calcined flint; US recipes: ground quartz.                                                                                                                                                                                         |
| quartz (free quartz, free silica)                 | क्वार्ट्ज (मुक्त क्वार्ट्ज, मुक्त सिलिका)                    | Tier 2. Google suggest ("क्वार्ट्ज"); newiki ("क्वार्ज काँच"). "मुक्त सिलिका" is free silica (2.7).                                                                                                                                                                         |
| frit                                              | फ्रिट                                                        | **show English**. Tier 1. Bhoomi ("Frit 1005 Alkaline"), Clay Station ("Ferro Frit 3134"). "फ्रिट गरिएको" (fritted); "बेस फ्रिट", "बोरन फ्रिट", "क्याल्सियम बोरेट फ्रिट" (calcium and boron, not a borosilicate), "हाइ-अल्कलाइन फ्रिट", "सिसारहित फ्रिट", "लेड बाइसिलिकेट". |
| raw borates (borax, colemanite, ulexite)          | काँचो बोरेट (बोरेक्स (सोहागा), कोलेमनाइट, युलेक्साइट)        | Tier 2. Google suggest ("सोहागा", "बोरेक्स"). Gerstley Borate, Gillespie Borate kept.                                                                                                                                                                                       |
| soda ash, bone ash, wood ash                      | सोडा एस, बोन एस (हड्डीको खरानी), काठको खरानी                 | Tier 2. Clay Station's "Tricalcium Phosphate" is bone ash's chemistry. Only wood ash is खरानी in the plain sense; ash glazes "खरानी ग्लेज".                                                                                                                                 |
| colorant                                          | कलरेन्ट (रङ दिने अक्साइड)                                    | **show English**. Tier 1. No source. Category "कलरेन्ट"; UI "कलरेन्ट र एडिटिभ".                                                                                                                                                                                             |
| stain                                             | स्टेन (तयारी रङ)                                             | **show English**. Tier 2. No source (Indian shops' menu "Stains"). स्टेन is also a mark: the bracket at first use. The verb "stain" (a glaze stops staining) → "दाग लाग्नु".                                                                                                |
| cobalt, copper, chrome, manganese, nickel         | कोबाल्ट, कपर, क्रोम, म्याङ्गनिज, निकेल                       | Tier 2. Bhoomi ("Copper Oxide", "Chrome Oxide", "Manganese Dioxide", "Nickel Oxide"). "क्रोम" is chromium oxide, not chrome plating. तामा (newiki) not used for the oxide.                                                                                                  |
| rutile                                            | रुटाइल                                                       | Tier 2. Bhoomi ("Rutile").                                                                                                                                                                                                                                                  |
| opacifier                                         | ओपासिफायर (अपारदर्शी बनाउने सामग्री)                         | Tier 1. No source. जिरकन, टिन अक्साइड, टाइटेनियम डाइअक्साइड.                                                                                                                                                                                                                |
| zircon                                            | जिरकन                                                        | Tier 2. No source. Zirconium silicate; not जिरकोनिया (ZrO₂).                                                                                                                                                                                                                |
| suspender                                         | सस्पेन्डर (ग्लेजलाई पानीमा तैरिरहन दिने सामग्री)             | Tier 1. No source; Native check. सस्पेन्डर alone is braces: the bracket at first use. Category "सस्पेन्डर".                                                                                                                                                                 |
| refractory                                        | रिफ्र्याक्टरी (तापरोधी)                                      | Tier 1. No source. Of materials and kiln parts.                                                                                                                                                                                                                             |
| softening point, half-sphere point (fusion, flow) | सफ्टनिङ पोइन्ट, हाफ-स्फियर पोइन्ट (फ्युजन, फ्लो)             | Tier 1. No source; the frit makers' English. "Fusion" on a Ferro sheet is a melting point (पग्लने बिन्दु), not nuclear fusion (आणविक संलयन).                                                                                                                                |
| substitute (stand-in, replacement)                | विकल्प                                                       | Tier 4. No source. See "like for like" (2.8).                                                                                                                                                                                                                               |
| equivalent (a frit's, as a maker lists it)        | समतुल्य                                                      | Tier 4. "Fusion को सूचीमा Vibrantz 3134 को समतुल्य फ्रिट"; never बराबर with no noun.                                                                                                                                                                                        |
| tin oxide (SnO₂), tin                             | टिन अक्साइड (SnO₂), टिन                                      | Tier 2. newiki (टिन). Not used for a tin can.                                                                                                                                                                                                                               |
| silica sand                                       | सिलिका बालुवा                                                | Tier 2. newiki काँच (silica in बालुवा). No source for the compound.                                                                                                                                                                                                         |
| ore, raw mineral                                  | काँचो खनिज                                                   | Tier 4. No source (records). "पिसिएको प्राकृतिक काँचो खनिज". Not कच्चा पदार्थ (a shop's raw materials).                                                                                                                                                                     |
| mica                                              | अभ्रक (माइका)                                                | Tier 3. No source (records). "फ्लोरिनयुक्त लिथियम-पोटासियम अभ्रक (माइका)"; the bracket at first use.                                                                                                                                                                        |

### 2.3 Clay, ware and firing stages

| English                         | Nepali                                                 | Notes                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| clay body (body)                | क्ले बडी (माटोको मिश्रण)                               | **show English**. Tier 1. No source. Not a human or a car's body: "ग्लेज बडीमा पग्लेर मिसिन्छ", "बडी स्टेन". माटो (Bizmandu, newiki) is clay in general.                                       |
| ware (pot, piece)               | भाँडा (भाँडो)                                          | Tier 4. Bizmandu ("माटाका भाँडा", "भाँडाकुँडा"), ekantipur ("सेरामिक भाँडा"). "काँचो भाँडा", "बिस्की गरिएका भाँडा", "ग्लेज लगाइएका भाँडा"; a piece is "भाँडो".                                 |
| functional ware                 | दैनिक प्रयोगका भाँडा (खानेकुरा र पेयका)                | Tier 4. No source. Not "काम गर्ने".                                                                                                                                                            |
| hollowware, flatware            | गहिरा भाँडा (कप, कचौरा, जग); चेप्टा भाँडा (थाल, प्लेट) | Tier 4. No source. "flatware" here is plates, not cutlery (काँटा-चम्चा).                                                                                                                       |
| earthenware                     | अर्थनवेयर                                              | **show English**. Tier 1. No source (-वेयर as ekantipur writes "स्टोनवेयर"). Described once as "कम तापक्रममा पकाइएका छिद्रयुक्त भाँडा". Not टेराकोटा or माटाका भाँडा (Pitfalls). Native check. |
| stoneware                       | स्टोनवेयर                                              | **show English**. Tier 1. ekantipur ("स्टोनवेयर"), Google suggest ("स्टोनवेयर क्ले"). Described once as "उच्च तापक्रममा पकाइएका, पानी नसोस्ने भाँडा".                                          |
| porcelain                       | पोर्सिलेन                                              | Tier 1. newiki (टिन: "पोर्सिलेन उद्योगहरू"), Google suggest. Never चिनियाँ माटो.                                                                                                               |
| vitreous, vitrification         | काँचजस्तो (भिट्रियस); भिट्रिफिकेसन                     | Tier 1 and 3. No source; Native check.                                                                                                                                                         |
| porous, porosity                | छिद्रयुक्त; छिद्रता                                    | Tier 4. No source read; the standard Nepali words. "बिस्की छिद्रयुक्त रहनु उचित हुन्छ".                                                                                                        |
| mature, maturity                | पूर्ण रूपमा पाक्नु (म्याच्योर हुनु); पूर्ण पाकाइ       | Tier 1 and 4. No source; Native check. Not age.                                                                                                                                                |
| plastic, plasticity             | लचिलो (आकार धरिराख्ने); लचिलोपन                        | Tier 4, an exception to tier 1: प्लास्टिक is the polymer. No source; Native check.                                                                                                             |
| greenware                       | ग्रिनवेयर (काँचो भाँडा)                                | **show English**. Tier 1. Bizmandu ("काँचो माटो") for the bracket. Not green; not बिस्की.                                                                                                      |
| leather-hard                    | लेदर-हार्ड (आधा सुकेको)                                | Tier 1. No source; Native check.                                                                                                                                                               |
| bone dry                        | बोन-ड्राइ (पूरै सुकेको)                                | Tier 1. No source.                                                                                                                                                                             |
| bisque (UK: biscuit)            | बिस्की (पहिलो पकाइ)                                    | **show English**. Tier 1. ekantipur ("बिस्की फायरिङ"). "बिस्की फायरिङ", "बिस्की गरिएको", "सफ्ट/हार्ड बिस्की". Not बिस्कुट; not काँचो. Native check (Choices).                                  |
| glaze firing (UK: glost firing) | ग्लेज फायरिङ (दोस्रो पकाइ)                             | **show English**. Tier 1. ekantipur ("फायरिङ"; a glaze colour after the first low firing).                                                                                                     |
| once-firing (single firing)     | सिङ्गल फायरिङ (एक पटक मात्र पकाउने)                    | **show English**. Tier 1. No source. "एक" as a word.                                                                                                                                           |
| slip                            | स्लिप (पानीमा घोलिएको माटो)                            | Tier 1. No source. Not slipping (चिप्लिनु).                                                                                                                                                    |
| engobe                          | एन्गोब                                                 | Tier 1. No source.                                                                                                                                                                             |
| underglaze                      | अन्डरग्लेज                                             | Tier 1. No source. "अन्डरग्लेज पेन्सिल".                                                                                                                                                       |
| foot                            | पिँध                                                   | Tier 4. No source; Nepali पिँध is the bottom of a pot. "पिँधमा ग्लेज नलगाउनुहोस्" (dry-footing); "पिँध अझ फराकिलो छोड्नुहोस्" = a wider unglazed band. Not खुट्टा. Native check.               |
| low fire, mid fire, high fire   | लो फायर, मिड फायर, हाइ फायर                            | Tier 1. No source. Nouns and adjectives ("मिड-फायर ग्लेज"). Never add a cone the English lacks.                                                                                                |
| raku                            | राकु                                                   | Tier 1. No source.                                                                                                                                                                             |

### 2.4 Kilns, cones and firing

| English                                                                     | Nepali                                                                          | Notes                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| electric kiln, gas kiln, manual kiln                                        | इलेक्ट्रिक किल्न, ग्यास किल्न, हातले चलाउने किल्न                               | Tier 1. Indian shops' menu "Kilns"; भट्टी (Bizmandu) at first use per section (Choices). Never म्यानुअल किल्न. Native check.                                                              |
| firing, fire (verb), load                                                   | फायरिङ; पकाउनु; लोड                                                             | Tier 1 and 4. ekantipur ("फायरिङ"), Bizmandu ("भट्टीमा पकाउने"): "कोन 6 सम्म पकाउनुहोस्". "एक फायरिङ" = one load fired; loading, unloading → किल्न भर्नु, किल्न खाली गर्नु. Native check. |
| kiln shelf (shelf)                                                          | किल्न सेल्फ (सेल्फ)                                                             | Tier 1. No source. "सेल्फ" also means the materials on hand (2.8).                                                                                                                        |
| element                                                                     | एलिमेन्ट                                                                        | Tier 1. No source. Chemical elements in the Materials form are तत्त्व (newiki "रासायनिक तत्व").                                                                                           |
| cone (pyrometric cone)                                                      | कोन (शङ्कु)                                                                     | **show English**. Tier 1. Indian shops ("Orton Cones"); Google suggest ("कोन 6" → "cone 6 …"). Not कोण (an angle). Not an ice-cream cone.                                                 |
| cone number, cone chart                                                     | कोन नम्बर, कोन चार्ट                                                            | Tier 1. No source. 022 to 42; leading zeros kept. Orton's chart.                                                                                                                          |
| self-supporting, large and small (junior) cones, bars                       | सेल्फ-सपोर्टिङ कोन; ठूला र साना (जुनियर) कोन; बार                               | Tier 1. No source (Indian shops' "Self-supporting cones", "Large Cone 6").                                                                                                                |
| witness cone                                                                | विटनेस कोन                                                                      | **show English**. Tier 1. No source.                                                                                                                                                      |
| cone pack                                                                   | कोन प्याक                                                                       | **show English**. Tier 1. No source.                                                                                                                                                      |
| guide cone, firing cone, guard cone                                         | गाइड कोन, फायरिङ कोन, गार्ड कोन                                                 | Tier 1. No source. गाइड is part of the cone's name, not the app's guides.                                                                                                                 |
| heatwork                                                                    | हिटवर्क (तापक्रम र समयको संयुक्त प्रभाव)                                        | **show English**. Tier 1. No source.                                                                                                                                                      |
| heating rate (rate, climb), peak                                            | तापक्रम बढ्ने दर (दर); पिक (सबैभन्दा उच्च तापक्रम)                              | Tier 4. ekantipur ("तापक्रम"). Chart columns "ढिलो", "मध्यम", "छिटो"; log field "दर".                                                                                                     |
| ramp                                                                        | र्याम्प                                                                         | **show English**. Tier 1. No source. Log field "र्याम्प". Written without a joiner (Script and spelling).                                                                                 |
| hold (soak)                                                                 | होल्ड (एउटै तापक्रममा राख्नु)                                                   | **show English**. Tier 1. No source. "10 मिनेटको होल्ड". Not भिजाउनु.                                                                                                                     |
| schedule (firing schedule, program, preset, segment)                        | फायरिङ सेड्युल (प्रोग्राम, प्रिसेट, सेग्मेन्ट)                                  | Tier 1. No source. Not तालिका, which is the firing log's table. Preset names stay as on the controller ("Slow Bisque"). Log field "सेग्मेन्ट".                                            |
| controller                                                                  | कन्ट्रोलर                                                                       | Tier 1. No source. Setting: "तापक्रमअनुसार, किल्न कन्ट्रोलरको प्रोग्रामजस्तै".                                                                                                            |
| cone offset (offset)                                                        | कोन अफसेट                                                                       | Tier 1. No source.                                                                                                                                                                        |
| kiln sitter (Kiln-Sitter, sitter)                                           | किल्न सिटर (Kiln-Sitter)                                                        | **show English**. Tier 1. Kiln-Sitter is Dawson's trademark, kept in Latin. Not a babysitter.                                                                                             |
| sensing rod, claw, weight, trigger plate, cone supports, tube, firing gauge | सेन्सिङ रड, क्ल (पञ्जा), वेट (तौल), ट्रिगर प्लेट, कोन सपोर्ट, ट्युब, फायरिङ गेज | Tier 1. No source; the parts as a Kiln-Sitter manual names them.                                                                                                                          |
| limit timer                                                                 | लिमिट टाइमर                                                                     | Tier 1. No source.                                                                                                                                                                        |
| infinite switch (Off, Low, Medium, High)                                    | इन्फिनिट स्विच (Off, Low, Medium, High)                                         | Tier 1. No source. The positions are the labels printed on the switch, kept in Latin; Native check.                                                                                       |
| pyrometer, thermocouple                                                     | पाइरोमिटर; थर्मोकपल                                                             | Tier 1. No source (newiki writes "हाइड्रोमिटर"). Log fields "प्रोब {n}".                                                                                                                  |
| peephole (spy hole)                                                         | पिपहोल (भित्र हेर्ने प्वाल)                                                     | Tier 1. No source. Log field "पिपहोल".                                                                                                                                                    |
| vent, downdraft vent, hood vent                                             | भेन्ट; डाउनड्राफ्ट भेन्ट; हुड भेन्ट                                             | Tier 1. No source. "किल्न भेन्ट गर्नुहोस्"; a vent hole is "भेन्टको प्वाल".                                                                                                               |
| candling (preheat)                                                          | क्यान्डलिङ (बाँकी चिस्यान निकाल्ने मन्द ताप)                                    | **show English**. Tier 1. No source. The "mirror test" → "ऐनाको परीक्षण".                                                                                                                 |
| burnout                                                                     | बर्नआउट (कार्बन र जैविक पदार्थ जलाउनु)                                          | Tier 1. No source. "अपुग बर्नआउट".                                                                                                                                                        |
| red heat, dull red                                                          | रातो राप; मधुरो रातो राप                                                        | Tier 4. No source.                                                                                                                                                                        |
| quartz inversion                                                            | क्वार्ट्ज इन्भर्सन                                                              | **show English**. Tier 1. No source. At 573 °C (1063 °F).                                                                                                                                 |
| oxidation                                                                   | अक्सिडेसन (अक्सिकरण)                                                            | **show English**. Tier 1. newiki ("अक्सिकरण हुन्छ"). "अक्सिडेसन फायरिङ".                                                                                                                  |
| reduction                                                                   | रिडक्सन (अपचयन)                                                                 | **show English**. Tier 1. No Nepali source for अपचयन (Google suggest shows only Hindi pages); Native check. Never घटाउ or छुट (Pitfalls).                                                 |
| atmosphere                                                                  | किल्नभित्रको वातावरण                                                            | Tier 4. No source. Log field "वातावरण".                                                                                                                                                   |
| drop-and-hold                                                               | ड्रप-एन्ड-होल्ड                                                                 | **show English**. Tier 1. No source.                                                                                                                                                      |
| slow cooling (slow cool)                                                    | स्लो कुलिङ (बिस्तारै चिस्याउनु)                                                 | Tier 1. No source.                                                                                                                                                                        |
| underfired, overfired                                                       | कम पाकेको; बढी पाकेको                                                           | Tier 4. No source. Never काँचो (unfired).                                                                                                                                                 |
| kiln wash                                                                   | किल्न वाश                                                                       | Tier 1. No source. Not washing.                                                                                                                                                           |
| stilt                                                                       | स्टिल्ट                                                                         | Tier 1. No source.                                                                                                                                                                        |
| cookie                                                                      | कुकी (थोपा थाम्ने बिस्कीको चक्का)                                               | Tier 1. No source. कुकी is also a biscuit: the bracket at first use.                                                                                                                      |
| Seger cones, Staffordshire cones, Bullers rings, Holdcroft bars             | सेगर कोन, स्टाफर्डशायर कोन, बुलर्स रिङ, होल्डक्रफ्ट बार                         | Never converted to Orton numbers.                                                                                                                                                         |
| Damper, Primary Air, Secondary Air, Burner, Pilots, Blower                  | ड्याम्पर, प्राइमरी एयर, सेकेन्डरी एयर, बर्नर, पाइलट, ब्लोअर                     | Tier 1. Firing-log fields. "पाइलट" are pilot flames, not people.                                                                                                                          |
| Ox Probe                                                                    | अक्सिजन प्रोब                                                                   | Tier 1.                                                                                                                                                                                   |
| Draw Tile                                                                   | ड्र टाइल                                                                        | Tier 1. No source; a test piece pulled out during the firing.                                                                                                                             |
| Delta, Temp Diff, Cones Top, Cones Bottom                                   | डेल्टा, तापक्रम फरक, माथिका कोन, तलका कोन                                       | Tier 1 and 4. "माथिका/तलका" is the place in the kiln, never a cone hotter or cooler.                                                                                                      |
| Salt, Soda, Sawdust                                                         | नुन, सोडा, काठको धुलो                                                           | Tier 4. "सोडा" here is a soda firing, not Na₂O.                                                                                                                                           |
| Ring {n}                                                                    | रिङ {n}                                                                         | A Bullers (pyrometric) ring reading, not a jewellery ring (औँठी).                                                                                                                         |
| manual (a kiln's, controller's or sitter's)                                 | म्यानुअल (किल्न, कन्ट्रोलर वा सिटरको)                                           | Tier 1. Google suggest ("म्यानुअल"). The app's guides are "मार्गदर्शिका": another word (Pitfalls).                                                                                        |

### 2.5 Defects and glaze fit

| English                     | Nepali                                        | Notes                                                                                                                                                |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze fit (fit)             | ग्लेज फिट (ग्लेज र बडीको मेल)                 | **show English**. Tier 1. No source. Not fitness or a seizure: "तपाईंको क्ले बडीमा बल्लतल्ल फिट भयो". "Over-compressed" → "चाहिनेभन्दा बढी थिचिएको". |
| defect                      | दोष                                           | Tier 4. No source.                                                                                                                                   |
| crazing (craze)             | क्रेजिङ (मसिना चिराहरूको जाल)                 | **show English**. Tier 1. No source; Native check. Not "crazy".                                                                                      |
| crackle                     | क्र्याकल                                      | Tier 1. No source. Crazing made on purpose (raku).                                                                                                   |
| shivering                   | शिभरिङ (किनाराबाट ग्लेजका पत्र उप्किनु)       | **show English**. Tier 1. No source; Native check. Not shivering with cold (काम्नु). The flakes are sharp.                                           |
| crawling (crawl)            | क्रलिङ (ग्लेज खुम्चिनु)                       | **show English**. Tier 1. No source; Native check. The home-safety guide's crawling babies → "बामे सर्ने बच्चा".                                     |
| pinholing (pinholes)        | पिनहोल (सियोजत्रा प्वाल)                      | **show English**. Tier 1. No source; Native check.                                                                                                   |
| blistering (blisters)       | ब्लिस्टरिङ (फोका)                             | Tier 1. No source.                                                                                                                                   |
| running (run, runny)        | ग्लेज बग्नु (बग्ने)                           | Tier 4. No source. Not running as in operating ("भेन्ट चलिरहेको छ"): both occur.                                                                     |
| devitrification             | डिभिट्रिफिकेसन (चिस्सिँदा क्रिस्टल बन्नु)     | **show English**. Tier 1. No source.                                                                                                                 |
| dunting                     | डन्टिङ (चिरा)                                 | **show English**. Tier 1. No source; Native check. A crack through the pot from heating or cooling.                                                  |
| leaching (leach, leachable) | लिचिङ (धातु निस्कनु)                          | **show English**. Tier 1. No source; Native check. Metals dissolving out of a fired glaze into food or drink.                                        |
| specks                      | कालो थोप्ला                                   | Tier 4. No source.                                                                                                                                   |
| milky, clouding             | दुधिलो; धमिलोपन                               | Tier 4. No source.                                                                                                                                   |
| dry, chalky                 | खस्रो, चकजस्तो                                | Tier 4. No source.                                                                                                                                   |
| breaks (over edges)         | किनारामा रङ फेरिनु (ब्रेक)                    | Tier 4. No source. Not फुट्नु.                                                                                                                       |
| flashing (flash)            | फ्ल्यासिङ                                     | Tier 1. No source. Not a camera flash.                                                                                                               |
| thermal shock               | थर्मल शक (अचानक तापक्रम फेरिँदा लाग्ने धक्का) | Tier 1. No source.                                                                                                                                   |

### 2.6 Making and applying glaze

| English                                | Nepali                                         | Notes                                                                                                                                                                                                                                           |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| batch                                  | ब्याच                                          | Tier 1. No source (Nepali spells the a of "cat" -्या, as Google's "ब्याकअप"). "ब्याचअनुसार", "ब्याचको तौल", "ब्याचको आकार", "ब्याच सूची". A supplier's run: "ब्याचदेखि ब्याचसम्म".                                                              |
| batch recipe                           | ब्याच रेसिपी                                   | Tier 1. Google suggest ("रेसिपी"; "cone 6 porcelain recipe" in Latin). Never सूत्र.                                                                                                                                                             |
| base (base glaze), on top              | बेस ग्लेज (बेस); बेसमाथि                       | Tier 1. No source. Not a chemical base (क्षार). "बेस फ्रिट"; UI "बेसमाथि", "बेसको %".                                                                                                                                                           |
| percent, parts (parts by weight)       | प्रतिशत, भाग (तौलअनुसार भाग)                   | Tier 4. No source. UI "बेसको %", "भाग", "ग्राम"; column "भाग".                                                                                                                                                                                  |
| scale (weighing)                       | तराजु                                          | Tier 4. No source; the everyday Nepali word. "0.01 g सम्म पढ्ने तराजु". Scaling a recipe is another word (2.8).                                                                                                                                 |
| tare                                   | टेयर (खाली भाँडो राखेर शून्य बनाउनु)           | Tier 1. No source.                                                                                                                                                                                                                              |
| slurry                                 | स्लरी (पानीमा मिसाइएको ग्लेज)                  | **show English**. Tier 1. No source.                                                                                                                                                                                                            |
| slake                                  | नचलाई पानीमा भिज्न दिनु                        | Tier 4. No source. Not quenching thirst.                                                                                                                                                                                                        |
| sieve (UK also: lawn)                  | चाल्नी                                         | Tier 4. No source; the everyday word. "lawn" is not grass.                                                                                                                                                                                      |
| mesh                                   | मेस                                            | Tier 1. Clay Station's grades ("G-325"). "80 मेस". Mesh numbers never translated.                                                                                                                                                               |
| specific gravity (SG)                  | विशिष्ट गुरुत्व                                | **show English**. Tier 3. newiki ("विशिष्ट गुरुत्व ०.८३५"; हाइड्रोमिटर: "सापेक्षिक घनत्व"). Relative density, a ratio with no unit (1.45), never घनत्व (g/cm³) or a litre weight. `guides.density.sg`: "विशिष्ट गुरुत्व {value}". Native check. |
| pint weight                            | पाइन्ट तौल                                     | Tier 1. No source. An imperial pint (568 ml). Setting "पाइन्ट तौल, एक इम्पेरियल पाइन्टमा कति औंस".                                                                                                                                              |
| degrees Baumé (°Bé), hydrometer        | बोमे डिग्री (°Bé); हाइड्रोमिटर                 | Tier 3. newiki ("हाइड्रोमिटर"). Setting "बोमे डिग्री, हाइड्रोमिटरबाट".                                                                                                                                                                          |
| density (glaze density)                | गाढापन (ग्लेजको गाढापन)                        | Tier 4. No source; Native check. Never घनत्व for a glaze. Setting "ग्लेजको गाढापन".                                                                                                                                                             |
| thixotropy (thixotropic, gelled)       | थिक्सोट्रपी (थिक्सोट्रपिक, जेलजस्तो)           | **show English**. Tier 1. No source.                                                                                                                                                                                                            |
| flocculant (flocculate)                | फ्लोकुलेन्ट (फ्लोकुलेट गर्नु)                  | **show English**. Tier 1. No source.                                                                                                                                                                                                            |
| deflocculant                           | डिफ्लोकुलेन्ट                                  | **show English**. Tier 1. No source.                                                                                                                                                                                                            |
| Epsom salts                            | एप्सम साल्ट                                    | Tier 2. No source. Magnesium sulfate.                                                                                                                                                                                                           |
| CMC gum (gum, binder, brushing medium) | CMC गम (गोंद, बाइन्डर, ब्रसिङ मिडियम)          | Tier 1. No source. "CMC" kept.                                                                                                                                                                                                                  |
| suspension, settle, hard-panning       | पानीमा तैरिरहनु; तल बस्नु; पिँधमा कडा तह जम्नु | Tier 4. No source.                                                                                                                                                                                                                              |
| dipping, pouring, brushing, spraying   | डुबाउनु, खन्याउनु, ब्रसले लगाउनु, स्प्रे गर्नु | Tier 4. No source. "डुबाउने समय", "एक पटक डुबाउनु", "दुई पटक डुबाउनु"; "dipping glaze" → "डिपिङ ग्लेज".                                                                                                                                         |
| coat (coating)                         | तह                                             | Tier 4. newiki (अप्टिकल फाइबर: "३ तहमा"). "तह पातलो राख्नुहोस्", "दुई वा तीन तह". Not a garment.                                                                                                                                                |
| wax resist                             | वाक्स रेजिस्ट (मैन)                            | **show English**. Tier 1. No source.                                                                                                                                                                                                            |
| test tile                              | टेस्ट टाइल                                     | **show English**. Tier 1. No source. Plural "टेस्ट टाइलहरू" where no number precedes.                                                                                                                                                           |
| line blend                             | लाइन ब्लेन्ड                                   | **show English**. Tier 1. No source. Not a queue or a drawn line.                                                                                                                                                                               |
| triaxial blend                         | ट्राइएक्सियल ब्लेन्ड                           | Tier 1. No source.                                                                                                                                                                                                                              |
| lot number                             | लट नम्बर                                       | Tier 1. No source.                                                                                                                                                                                                                              |
| technical data sheet (TDS)             | प्राविधिक डाटा सिट (TDS)                       | Tier 4. No source. Not the safety data sheet.                                                                                                                                                                                                   |

### 2.7 Health and safety

| English                                                               | Nepali                                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dust                                                                  | धुलो                                                                   | Tier 4. WageIndicator ("प्रज्वलनशील धुलो").                                                                                                                                                                                                                                                                                                                                                    |
| respirable crystalline silica (RCS)                                   | श्वासमार्फत फोक्सोसम्म पुग्ने क्रिस्टलीय सिलिका (RCS)                  | **show English**. Tier 4. No Nepali legal text found (Nepal has no silica limit: Regions). Native check.                                                                                                                                                                                                                                                                                       |
| crystalline silica, amorphous silica, cristobalite                    | क्रिस्टलीय सिलिका, अक्रिस्टलीय (एमर्फस) सिलिका, क्रिस्टोबलाइट          | Tier 3. newiki काँच ("मणिभ नबनी एमर्फस ठोस"). No source for अक्रिस्टलीय; Native check.                                                                                                                                                                                                                                                                                                         |
| silicosis, COPD                                                       | सिलिकोसिस; COPD (फोक्सोको दीर्घकालीन अवरोधक रोग)                       | Tier 4. Google suggest ("सिलिकोसिस", Hindi pages). "फोक्सोको गम्भीर, कहिल्यै निको नहुने रोग". COPD kept with a Nepali gloss once; Native check on the gloss.                                                                                                                                                                                                                                   |
| exposure limit, action level                                          | सम्पर्क सीमा; एक्सन लेभल (कदम चाल्नुपर्ने तह)                          | Tier 4. No source (Law in Nepal). Native check.                                                                                                                                                                                                                                                                                                                                                |
| respirator                                                            | रेस्पिरेटर मास्क (रेस्पिरेटर)                                          | Tier 4. No source. रेस्पिरेटर मास्क at first use in a section, then रेस्पिरेटर. Not a भेन्टिलेटर; not a surgical, cloth or "nuisance dust" mask (कपडाको मास्क, सर्जिकल मास्क).                                                                                                                                                                                                                 |
| N95, P100, FFP2, FFP3, P2, P3                                         | N95, P100, FFP2, FFP3, P2, P3                                          | Never translated. Nepal names no mask standard (Regions).                                                                                                                                                                                                                                                                                                                                      |
| half mask, powered respirator (PAPR)                                  | हाफ मास्क; पावर्ड रेस्पिरेटर (PAPR)                                    | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| fit test                                                              | फिट टेस्ट (मास्क अनुहारमा राम्ररी टाँसिन्छ कि भनी गरिने जाँच)          | Tier 1. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| HEPA vacuum (dust Class M)                                            | HEPA भ्याकुम क्लिनर; dust Class M धुलोको वर्ग Class M                  | Tier 4. "HEPA" and "Class M" kept; never the English "dust" left in.                                                                                                                                                                                                                                                                                                                           |
| wet cleaning (wet mop, wet-wipe), dry sweeping                        | भिजेको सफाइ (भिजेको पोछा, भिजेको कपडाले पुछ्नु); सुक्खा कुचोले बढार्नु | Tier 4. No source; everyday words.                                                                                                                                                                                                                                                                                                                                                             |
| local exhaust ventilation (LEV)                                       | लोकल एक्जस्ट भेन्टिलेसन (LEV)                                          | **show English**. Tier 1. No source; explained once as "धुलो बन्ने ठाउँमै तान्ने हुड र पङ्खा".                                                                                                                                                                                                                                                                                                 |
| make-up air                                                           | मेक-अप एयर (बाहिरबाट आउने ताजा हावा)                                   | Tier 1. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| spray booth (water-backed booth), overspray                           | स्प्रे बुथ (पानी भएको बुथ); ओभरस्प्रे                                  | Tier 1. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| fumes (kiln fumes)                                                    | धुवाँ र ग्यास (किल्नबाट निस्कने ग्यास)                                 | Tier 4. No source; WageIndicator ("ग्याँस") shows the other spelling; the app writes ग्यास.                                                                                                                                                                                                                                                                                                    |
| carbon monoxide (CO), CO alarm                                        | कार्बन मोनोअक्साइड (CO); CO अलार्म                                     | Tier 3. No source. "जुन देखिँदैन र जसको गन्ध आउँदैन".                                                                                                                                                                                                                                                                                                                                          |
| metal fume fever, manganism                                           | मेटल फ्युम फिभर (धातुको धुवाँले हुने ज्वरो); म्याङ्गनिज विषाक्तता      | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| safety data sheet (SDS; older: MSDS)                                  | सुरक्षा डाटा सिट (SDS; पुरानो नाम MSDS)                                | Tier 4. No source. Native check.                                                                                                                                                                                                                                                                                                                                                               |
| GHS, pictogram, signal word, hazard statement                         | GHS; चित्रसङ्केत; सङ्केत शब्द; खतरा कथन                                | Tier 4. No Nepali GHS text read; Native check. Signal words "खतरा" (Danger) and "चेतावनी" (Warning); H-codes kept. H302 निलेमा हानिकारक; H301 निलेमा विषालु; H360 प्रजनन क्षमता वा गर्भको बच्चालाई हानि गर्न सक्छ; H361 "suspected of damaging" → "…हानि गर्ने शङ्का छ" (शङ्का, never सक्छ); H350 क्यान्सर गराउन सक्छ; H351 क्यान्सर गराउने शङ्का छ; H372 लामो सम्पर्कले अङ्गहरूलाई हानि गर्छ. |
| Not classified                                                        | वर्गीकृत गरिएको छैन                                                    | Tier 4. Not हानिरहित (harmless). No official Nepali text read.                                                                                                                                                                                                                                                                                                                                 |
| IARC Group 1, 2A, 2B, 3 (carcinogenic)                                | IARC समूह 1, 2A, 2B, 3 (क्यान्सरकारी)                                  | Tier 4. No source. Group 1: "मानिसमा क्यान्सरकारी"; 2A: "मानिसमा सम्भवतः क्यान्सरकारी".                                                                                                                                                                                                                                                                                                        |
| toxic, harmful                                                        | विषालु; हानिकारक                                                       | Tier 4. No source. "निलेमा विषालु" is stronger than "निलेमा हानिकारक": keep them apart.                                                                                                                                                                                                                                                                                                        |
| soluble, insoluble, slightly soluble                                  | घुलनशील, अघुलनशील, थोरै घुलनशील                                        | Tier 3 and 4. newiki ("पानीमा अति घुलनशील", "पानीमा उच्च घुलनशीलता"). "पानीमा (वा पेटको अम्लमा) घुलनशील". Never पग्लने (melting): see Choices. Check this row first.                                                                                                                                                                                                                           |
| swallow (ingestion), breathe in (inhalation)                          | निल्नु; सासमार्फत भित्र लिनु                                           | Tier 4. Plain words, as the guides.                                                                                                                                                                                                                                                                                                                                                            |
| acute, chronic                                                        | तीव्र (एकै पटकमा); दीर्घकालीन (लामो समयमा)                             | Tier 4. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| poison centre (poison line, poison control)                           | विष सूचना केन्द्र                                                      | Tier 4. Nepal shows none (Regions); India's: National Poisons Information Centre (NPIC), AIIMS New Delhi, 1800 116 117. A poison line is विष हेल्पलाइन (see "poison line" below). Native check on the description.                                                                                                                                                                             |
| blood lead test, blood lead reference value                           | रगतमा सिसाको जाँच; रगतमा सिसाको सन्दर्भ मान                            | Tier 4. No source. CDC's 3.5 µg/dL kept.                                                                                                                                                                                                                                                                                                                                                       |
| lead-free (leadless)                                                  | सिसारहित                                                               | Tier 4. No source (Native check with सिसा). Not the same as खानाका लागि सुरक्षित. Both English words → सिसारहित.                                                                                                                                                                                                                                                                               |
| food safe (food-safe)                                                 | खानाका लागि सुरक्षित                                                   | **show English**. Tier 4. No source. In law: releases less lead and cadmium than the limits.                                                                                                                                                                                                                                                                                                   |
| leach test (laboratory leach test, metal release test)                | लिचिङ परीक्षण (भाँडाबाट निस्कने धातुको प्रयोगशाला परीक्षण)             | **show English**. Tier 1 and 4. No source. A test of the metals a fired piece releases; not narrowed to lead and cadmium. Codes kept.                                                                                                                                                                                                                                                          |
| liner glaze                                                           | लाइनर ग्लेज                                                            | **show English**. Tier 1. No source.                                                                                                                                                                                                                                                                                                                                                           |
| contact dermatitis, barrier cream                                     | सम्पर्कबाट हुने छालाको रोग (कन्ट्याक्ट डर्मटाइटिस); ब्यारियर क्रिम     | Tier 4. No source. "ब्यारियर क्रिम पन्जा होइन".                                                                                                                                                                                                                                                                                                                                                |
| infrared (IR), IR-rated welding glasses, shade 3                      | इन्फ्रारेड (IR); IR रोक्ने वेल्डिङ चस्मा; सेड 3                        | Tier 4. No source. Sunglasses (कालो चस्मा) and didymium glasses do not block it.                                                                                                                                                                                                                                                                                                               |
| combustible, clearance, dedicated circuit                             | जल्न सक्ने वस्तु; दूरी; छुट्टै सर्किट                                  | Tier 4. No source (WageIndicator's प्रज्वलनशील is "flammable", stronger: not used for combustible).                                                                                                                                                                                                                                                                                            |
| emergency number; Emergency (a heading); calling the emergency number | आपत्कालीन नम्बर; आपत्काल (heading); आपत्कालीन नम्बरमा फोन गर्नु        | Tier 4. Nepal's: 102 (एम्बुलेन्स), 100 (प्रहरी), 101 (दमकल); India's 112 (Regions). The number only where the English gives it.                                                                                                                                                                                                                                                                |
| 24/7, non-stop                                                        | 24/7 (24 घण्टा, हप्ताको 7 दिन)                                         | "24/7" has a 7: the numbers check needs it.                                                                                                                                                                                                                                                                                                                                                    |
| oxidiser (H272)                                                       | अक्सिडाइजर (H272)                                                      | Tier 3. No source.                                                                                                                                                                                                                                                                                                                                                                             |
| harmonised classification (EU)                                        | एकरूप वर्गीकरण                                                         | Tier 4. No source. "EU को एकरूप वर्गीकरण".                                                                                                                                                                                                                                                                                                                                                     |
| nuisance dust                                                         | झन्झटिलो धुलो (“nuisance dust”)                                        | Tier 4. No source. The English in brackets once, as the masks are labelled so.                                                                                                                                                                                                                                                                                                                 |
| dust mask                                                             | धुलोको मास्क                                                           | Tier 4. No source. "धुलोका मास्क वर्गअनुसार बिक्री हुन्छन्".                                                                                                                                                                                                                                                                                                                                   |
| caustic                                                               | पोल्ने/कोतर्ने खालको (कस्टिक)                                          | Tier 4. No source. The bracket at first use. Here पोल्ने is right: it burns the skin.                                                                                                                                                                                                                                                                                                          |
| antidote                                                              | विषनाशक औषधि (एन्टिडोट)                                                | Tier 4. No source. "यसको कुनै विषनाशक औषधि (एन्टिडोट) छैन".                                                                                                                                                                                                                                                                                                                                    |
| lead frit                                                             | सिसायुक्त फ्रिट (लेड फ्रिट)                                            | **show English**. Tier 1 and 4. Bhoomi "Frit 1009 Lead Based". Lead-free frit सिसारहित फ्रिट. "low-solubility lead frit" → "कम घुलनशील सिसायुक्त फ्रिट", never "छिटो पग्लने".                                                                                                                                                                                                                  |
| poison line (a phone line); poison centre (the body)                  | विष हेल्पलाइन; विष सूचना केन्द्र                                       | Tier 4. One word each in every file: "call the poison line" → "विष हेल्पलाइनमा फोन गर्नुहोस्"; "a poison center decides" → "विष सूचना केन्द्रले निर्णय गर्छ".                                                                                                                                                                                                                                  |
| fire extinguisher                                                     | आगो निभाउने यन्त्र                                                     | Tier 4. No source. "ABC आगो निभाउने यन्त्र". The fire service is दमकल (101).                                                                                                                                                                                                                                                                                                                   |
| personal protective equipment                                         | व्यक्तिगत सुरक्षा साधन                                                 | Tier 4. Labour Act section 69 ("व्यक्तिगत सुरक्षा साधन"); WageIndicator ("व्यक्तिगत सुरक्षा उपकरण").                                                                                                                                                                                                                                                                                           |

### 2.8 The app's own words

| English                                                                                | Nepali                                                                                                                                   | Notes                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recipe (Recipes)                                                                       | रेसिपी (रेसिपी)                                                                                                                          | Google suggest ("रेसिपी"). "नयाँ रेसिपी", "सेभ गरिएको रेसिपी", "मेरा सेभ गरिएका रेसिपी", "रेसिपी क्याल्कुलेटर". Never सूत्र or नुस्खा (a medical or folk remedy).                                                            |
| studio notebook (notebook)                                                             | स्टुडियो नोटबुक (नोटबुक)                                                                                                                 | "तपाईंको स्टुडियो नोटबुक", "ग्लेज नोटबुक".                                                                                                                                                                                   |
| material (Materials)                                                                   | सामग्री (सामग्री)                                                                                                                        | "सामग्रीको नाम:", "सामग्री थप्नुहोस्", "सामग्री पेज". **Native check** (Choices, Plural forms).                                                                                                                              |
| My materials                                                                           | मेरा सामग्री                                                                                                                             | "सर्भरमा भएका मेरा सामग्री:".                                                                                                                                                                                                |
| Standard (standard materials)                                                          | मानक (मानक सामग्री)                                                                                                                      | Tab "मानक ({count})"; "मानक सामग्री:", "भित्रै भएको सूची", "लाइब्रेरी". Not "साधारण".                                                                                                                                        |
| library                                                                                | लाइब्रेरी                                                                                                                                | "तपाईंको क्षेत्रमा बिक्री हुने कुनै पनि सिसारहित फ्रिट लाइब्रेरीमा छैन." Not a पुस्तकालय. The About page's "shared library" is code.                                                                                         |
| additive (Additives)                                                                   | एडिटिभ (एडिटिभ)                                                                                                                          | Nav "एडिटिभ"; page "एडिटिभ र कलरेन्ट"; recipe "कलरेन्ट र एडिटिभ", "कलरेन्ट वा एडिटिभ".                                                                                                                                       |
| amount (Amount)                                                                        | मात्रा (मात्रा)                                                                                                                          | Column "मात्रा"; "मात्रा लेख्नुहोस् (0 पनि चल्छ)."                                                                                                                                                                           |
| Share                                                                                  | हिस्सा                                                                                                                                   | Column: each material's percent of the batch. Not सेयर गर्नु.                                                                                                                                                                |
| To percent, To parts, Scale to a batch, Scale                                          | प्रतिशतमा, भागमा, ब्याचको तौलअनुसार, मात्रा बदल्नुहोस्                                                                                   | "मात्रा बदल्नुहोस्:". Resizing, not the तराजु.                                                                                                                                                                               |
| Batch size, batch list, Weigh in, Weigh, Weighed, Running total, All together          | ब्याचको आकार, ब्याच सूची, तौलेर हाल्नुहोस्, तौल्नुहोस्, तौलियो, अहिलेसम्मको जम्मा, सबै मिलाएर                                            | "ब्याच सूची मात्र: के तौल्ने, चिनो लगाउने कोठासहित".                                                                                                                                                                         |
| Unity formula (Unity)                                                                  | सेगर सूत्र (सेगर)                                                                                                                        | "कलरेन्ट र एडिटिभ पनि यसमा गन्नुहोस्". Where the English names both ("unity molecular formula, also called the Seger formula"): "युनिटी आणविक सूत्र, जसलाई सेगर सूत्र पनि भनिन्छ".                                           |
| Wildcards                                                                              | अन्य अक्साइड                                                                                                                             | Column for oxides outside the three groups. Not तासको जोकर.                                                                                                                                                                  |
| Compare                                                                                | तुलना गर्नुहोस्                                                                                                                          | "दुई रेसिपीको तुलना गर्नुहोस्", "पहिलो रेसिपी", "दोस्रो रेसिपी", "बदल्नुहोस्", "उस्तै".                                                                                                                                      |
| Save, Save and add next recipe, Save as a copy, Print                                  | सेभ गर्नुहोस्; सेभ गरेर अर्को रेसिपी थप्नुहोस्; प्रतिलिपिका रूपमा सेभ गर्नुहोस्; प्रिन्ट गर्नुहोस्                                       | Never बचत गर्नुहोस् (Choices). Native check.                                                                                                                                                                                 |
| swap (Try modern materials and compare, Undo the swap)                                 | साटासाट (आजका सामग्री प्रयोग गरेर हेर्नुहोस् र तुलना गर्नुहोस्, साटासाट फिर्ता लिनुहोस्)                                                 | "आजका सामग्रीले साटियो".                                                                                                                                                                                                     |
| like for like, gram for gram, one for one, pound for pound                             | जस्ताको तस्तै; ग्रामको ग्राम; एकको एक; पाउन्डको पाउन्ड                                                                                   | Idioms: the sense, with words, not digits. (जस्ताको तस्तै is the idiom "just as it is", not the metal जस्ता.)                                                                                                                |
| Suggest amounts and compare                                                            | मात्रा सुझाउनुहोस् र तुलना गर्नुहोस्                                                                                                     | "पुराना सामग्रीले दिने कुरा फिर्ता ल्याउनुहोस्".                                                                                                                                                                             |
| Replace lead (Replace lead and compare)                                                | सिसा बदल्नुहोस् (सिसा बदलेर तुलना गर्नुहोस्)                                                                                             | "कोनसम्म पकाइएको", "ग्लेज फेरि बनाउनुहोस्", "रङलाई सिसारहित बेसमा राख्नुहोस्".                                                                                                                                               |
| Match with what I have (Match and compare)                                             | मसँग भएका सामग्रीले मिलाउनुहोस् (मिलाएर तुलना गर्नुहोस्)                                                                                 | "तपाईंसँग भएका सामग्रीबाट बनाउनुहोस्".                                                                                                                                                                                       |
| materials on hand (the shelf)                                                          | मसँग भएका सामग्री (सेल्फ)                                                                                                                | "सेल्फ" is a figure of speech, not a kiln shelf. Server: "सेल्फ बढीमा {most} सामग्रीको सूची हो."                                                                                                                             |
| Materials to try, Must use                                                             | प्रयोग गरेर हेर्ने सामग्री; प्रयोग गर्नैपर्ने                                                                                            | "…नैपर्ने" here is the English's "must": the label's own word.                                                                                                                                                               |
| Leave it out, Allow more, Add it, Use it instead, Work it out again, What to watch for | यसलाई हटाउनुहोस्; अझ बढी दिनुहोस्; यसलाई थप्नुहोस्; बरु यसलाई प्रयोग गर्नुहोस्; फेरि हिसाब गर्नुहोस्; के कुरामा ध्यान दिने               |                                                                                                                                                                                                                              |
| Discontinued, Hard to get, Historical                                                  | उत्पादन बन्द; पाउन गाह्रो; पुरानो                                                                                                        | "{year} देखि उत्पादन बन्द", "{year} देखि पाउन गाह्रो". {year} is the Gregorian year as given, never a BS year.                                                                                                               |
| Use instead, Similar, Replaces, Also called, Made by, Hazards                          | बरु यो प्रयोग गर्नुहोस्; उस्तै; यसको ठाउँ लिन्छ; यसलाई … पनि भनिन्छ; उत्पादक; खतराहरू                                                    | "रसायन छैन: सेगर सूत्रमा गनिएको छैन", "{name} का रूपमा गनियो".                                                                                                                                                               |
| Kind (All kinds)                                                                       | प्रकार (सबै प्रकार)                                                                                                                      | फेल्डस्पार र स्टोन, क्ले, फ्रिट, बोरनका स्रोत, फ्लक्स, सिलिका, एलुमिना, ओपासिफायर, कलरेन्ट, सस्पेन्डर, अन्य.                                                                                                                 |
| Sold in, Where you work                                                                | यहाँ बिक्री हुन्छ; तपाईं कहाँ काम गर्नुहुन्छ                                                                                             | All regions → "सबै क्षेत्र".                                                                                                                                                                                                 |
| Firing logs (firing record)                                                            | फायरिङ लग                                                                                                                                | "फायरिङको शीर्षक:", "फायरिङ रेकर्ड गर्नुहोस्", "मेरा सेभ गरिएका फायरिङ:".                                                                                                                                                    |
| field, row                                                                             | कोलम; पङ्क्ति                                                                                                                            | "कोलम थप्नुहोस्", "फायरिङ तालिकामा पङ्क्ति थप्नुहोस्". Not a खेत. The firing table is तालिका.                                                                                                                                |
| trial (Your trial, Try it now, Discard trial)                                          | ट्रायल (तपाईंको ट्रायल, अहिले प्रयोग गरेर हेर्नुहोस्, ट्रायल हटाउनुहोस्)                                                                 | Never "पाहुना" (guest).                                                                                                                                                                                                      |
| Typing amounts                                                                         | मात्रा टाइप गर्नु                                                                                                                        | "दशमलवका लागि अल्पविराम वा पूर्णविराम", "दशमलवका लागि अल्पविराम", "दशमलवका लागि पूर्णविराम" (पूर्णविराम here is the point "."). Server: "दशमलव चिह्न".                                                                       |
| Firing (To Orton cones, By temperature, as a kiln controller's program)                | फायरिङ (Orton कोनअनुसार, तापक्रमअनुसार, किल्न कन्ट्रोलरको प्रोग्रामजस्तै)                                                                | "कोनसम्म फायरिङका लागि देखाउनुहोस्", "तापक्रमअनुसार फायरिङका लागि देखाउनुहोस्".                                                                                                                                              |
| Glaze density (Specific gravity, Degrees Baumé, Pint weight)                           | ग्लेजको गाढापन (विशिष्ट गुरुत्व, बोमे डिग्री, पाइन्ट तौल)                                                                                | See 2.6.                                                                                                                                                                                                                     |
| Light or dark, Colors                                                                  | उज्यालो वा अँध्यारो; रङहरू                                                                                                               | Google ("अँध्यारो मोड"). Palette: टेन्मोकु खिया, सेलाडन हरियो, कोबाल्ट नीलो, अक्सब्लड रातो, सिनो सुन्तला, वुड एस जैतुनी.                                                                                                     |
| Batch weights (Grams, Pounds and ounces), Grams on printed batches                     | ब्याचको तौल (ग्राम, पाउन्ड र औंस), प्रिन्ट गरिएका ब्याचमा ग्राम                                                                          | "ग्रामको दशांशसम्म", "पूर्ण शुद्धता".                                                                                                                                                                                        |
| Lead (Off, On, Turn lead on, Keep it off)                                              | सिसा (अफ, अन, सिसा अन गर्नुहोस्, अफ नै राख्नुहोस्)                                                                                       | The metal. Google ("अन गर्नुहोस्"). Never छान्नुहोस् for turn on or off.                                                                                                                                                     |
| English terms (Show the English after key terms)                                       | अङ्ग्रेजी शब्द (मुख्य शब्दपछि अङ्ग्रेजी देखाउनुहोस्)                                                                                     | The setting that shows `<en>`/`{{en: …}}`.                                                                                                                                                                                   |
| Translation notice (About this translation, Suggest a correction, Read the English)    | अनुवादको सूचना (यो अनुवादबारे, सुधार सुझाउनुहोस्, अङ्ग्रेजी पढ्नुहोस्)                                                                   |                                                                                                                                                                                                                              |
| Trash                                                                                  | रद्दी टोकरी                                                                                                                              | No source. "move to the Trash" → रद्दी टोकरीमा सार्नुहोस्; "put back" → फिर्ता राख्नुहोस्.                                                                                                                                   |
| Remove (Yes, remove), Delete my account                                                | हटाउनुहोस् (हो, हटाउनुहोस्); मेरो खाता मेटाउनुहोस्                                                                                       | "यो फिर्ता गर्न सकिँदैन."                                                                                                                                                                                                    |
| guide (Guides)                                                                         | मार्गदर्शिका (मार्गदर्शिकाहरू)                                                                                                           | Native check. Every link, page title and list. A kiln's manual is "म्यानुअल"; a maker's or school's guide पुस्तिका, लेख or कागजात (Pitfalls).                                                                                |
| the five guides' titles                                                                | साधारण किल्नमा फायरिङ; आधारभूत सिद्धान्तदेखि ग्लेज; सुरक्षित मिसाइ र हावाको आवतजावत; आफ्नो परिवारलाई विष नखुवाउनुहोस्; ग्लेज कसरी बनाउने | Firing a basic kiln; Glazing from first principles; Safe mixing and ventilation; Don't poison your family; How to make a glaze. No source; Native check. The same in the front matter, `titles`, `list` and every link text. |
| revoke (Revoke, revoked)                                                               | रद्द गर्नुहोस् (रद्द गरियो) for a token                                                                                                  | Never मेटाउनुहोस् for a revoke. Cancel is also रद्द गर्नुहोस्; where both appear on one screen, revoke is "पहुँच रद्द गर्नुहोस्". Native check.                                                                              |
| sign in, sign out (signed in)                                                          | साइन इन गर्नुहोस्, साइन आउट गर्नुहोस् (साइन इन गरिएको छ)                                                                                 | Google ("साइन इन").                                                                                                                                                                                                          |
| device (signed in on a device)                                                         | डिभाइस (कुनै डिभाइसमा साइन इन)                                                                                                           | Google ("विश्वसनीय डिभाइस").                                                                                                                                                                                                 |
| calculator (glaze calculator)                                                          | क्याल्कुलेटर (सेरामिक ग्लेज क्याल्कुलेटर)                                                                                                | No source. Never without सेरामिक or माटाका भाँडा in a title.                                                                                                                                                                 |
| About (the page)                                                                       | बारेमा                                                                                                                                   |                                                                                                                                                                                                                              |
| record (a firing, material or other saved record); notes                               | रेकर्ड; टिपोट (टिपोटहरू)                                                                                                                 | "तपाईंका आफ्नै सबै रेकर्ड", "यो रेकर्ड प्रयोग गर्नुहोस्"; the Notes page and notes "टिपोटहरू"; to record "टिपोट गर्नु", "रेकर्ड गर्नु".                                                                                      |
| Error (an error)                                                                       | त्रुटि                                                                                                                                   | Google ("त्रुटिहरू"). "सर्भरको त्रुटि", "…ल्याउँदा त्रुटि भयो."                                                                                                                                                              |
| AI assistant                                                                           | AI सहायक                                                                                                                                 | "आफ्नो AI सहायकबाट Glazecalc प्रयोग गर्नुहोस्". Google ("AI अनुवाद").                                                                                                                                                        |
| access token; Connected apps                                                           | एक्सेस टोकन; जोडिएका एपहरू                                                                                                               | Google ("Google एपहरू"). "एक्सेस टोकन रद्द गरियो".                                                                                                                                                                           |
| limits, limit set (Analysis and limits)                                                | लिमिट, लिमिट सेट                                                                                                                         | The app's glaze limits; सीमा stays for ordinary and legal limits. "विश्लेषण र लिमिट".                                                                                                                                        |
| Solve for a target (button Solve)                                                      | लक्ष्यबाट रेसिपी निकाल्नुहोस् (रेसिपी निकाल्नुहोस्)                                                                                      | The recipe page's feature, in ‘ ’ in running text.                                                                                                                                                                           |
| upper cone (of a range); No upper cone                                                 | तातो कोन; तातो कोन छैन                                                                                                                   | Never माथिल्लो कोन (Cones).                                                                                                                                                                                                  |
| guidelines                                                                             | दिशानिर्देश                                                                                                                              | Not मार्गदर्शिका (the app's guides); "a guide, not a prediction" → "अनुमानको दिशा मात्र".                                                                                                                                    |
| shed                                                                                   | बाहिरको छुट्टै कोठा                                                                                                                      | Never सेड (which would read as the shade of welding glasses).                                                                                                                                                                |

### 2.9 Where the potter works

| English                                                                       | Nepali                                                                                                                                            | Notes                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Shops in (the label before a list of countries)                               | पसलहरू:                                                                                                                                           | guides: shops.shopsIn. Nepal has none listed (Regions).                                    |
| raw glaze materials (what a shop sells)                                       | ग्लेजका कच्चा पदार्थ                                                                                                                              | guides: shops.what.materials (Indian shops: "Raw Materials").                              |
| ready-made glazes                                                             | तयारी ग्लेज                                                                                                                                       | guides: shops.what.glazes (Indian shops' menu "Glazes").                                   |
| Packs seen                                                                    | देखिएका प्याक                                                                                                                                     | guides: shops.packs                                                                        |
| A binding limit.                                                              | कानुनले बाँध्ने सीमा.                                                                                                                             | guides: silica.kind.binding                                                                |
| An indicative limit: a guide value, not a legal ceiling.                      | सूचक सीमा: दिशा दिने मान, कानुनी अधिकतम होइन.                                                                                                     | guides: silica.kind.indicative                                                             |
| An assessment criterion, not a binding limit. (Germany)                       | मूल्याङ्कनको मापदण्ड, कानुनले बाँध्ने सीमा होइन.                                                                                                  | guides: silica.kind.assessment                                                             |
| A control concentration (管理濃度) … (Japan)                                  | नियन्त्रण सान्द्रता, जापानीमा kanri nōdo (管理濃度): कार्यस्थलको हावा त्यहाँका मापनबाट जाँच्ने मान, कुनै व्यक्तिले कति सास लिन्छ भन्ने सीमा होइन. | guides: silica.kind.control (Hepburn with macrons, the kanji in brackets: see Pitfalls).   |
| action level (US)                                                             | एक्सन लेभल                                                                                                                                        | guides: silica.actionLevel                                                                 |
| quartz and cristobalite                                                       | क्वार्ट्ज र क्रिस्टोबलाइट                                                                                                                         | guides: silica.both                                                                        |
| Recommended by {abbr}                                                         | {abbr} को सिफारिस                                                                                                                                 | guides: silica.recommended                                                                 |
| The national body for safety at work: <link>{name}</link>.                    | कार्यस्थलको सुरक्षाका लागि राष्ट्रिय निकाय: <link>{name}</link>.                                                                                  | guides: silica.agency. Nepal's: श्रम तथा व्यवसायजन्य सुरक्षा विभाग (Regions).              |
| Kind of piece (food-contact rules)                                            | भाँडाको प्रकार                                                                                                                                    | guides: food.article                                                                       |
| pieces that cannot be filled, or no deeper than 25 mm                         | केही भर्न नमिल्ने भाँडा, वा 25 mm भन्दा बढी गहिरो नभएका                                                                                           | guides: food.category.flat ("भन्दा बढी … नभएका" = at most).                                |
| Pieces that cannot be filled, or less than 2.5 cm deep                        | केही भर्न नमिल्ने भाँडा, वा 2.5 cm भन्दा कम गहिरा                                                                                                 | guides: food.category.jpFlat ("भन्दा कम" = less than).                                     |
| Other pieces under 1.1 L, not for cooking                                     | 1.1 L भन्दा कमका अन्य भाँडा, पकाउन होइन                                                                                                           | guides: food.category.jpSmall                                                              |
| Other pieces from 1.1 L to under 3 L, not for cooking                         | 1.1 L वा बढी र 3 L भन्दा कमका अन्य भाँडा, पकाउन होइन                                                                                              | guides: food.category.jpLarge                                                              |
| Other pieces of 3 L or more, not for cooking                                  | 3 L वा बढीका अन्य भाँडा, पकाउन होइन                                                                                                               | guides: food.category.jpStorage                                                            |
| other pieces that can be filled                                               | केही भर्न मिल्ने अन्य भाँडा                                                                                                                       | guides: food.category.fillable                                                             |
| cooking ware                                                                  | खाना पकाउने भाँडा                                                                                                                                 | guides: food.category.auCooking, jpCooking, myCooking. Here पकाउनु is cooking, by context. |
| The rim of a piece for drinking from: a 2 cm band, inside and out             | पिउने भाँडाको बिट: भित्र र बाहिर 2 cm को पट्टी                                                                                                    | guides: food.category.rimBand                                                              |
| Flatware, no deeper than 25 mm (US)                                           | चेप्टा भाँडा, 25 mm भन्दा बढी गहिरो नभएका                                                                                                         | guides: food.category.flatware                                                             |
| Small hollowware, under 1.1 L, other than cups and mugs (US)                  | साना गहिरा भाँडा, 1.1 L भन्दा कम, कप र मग बाहेक                                                                                                   | guides: food.category.smallHollow                                                          |
| Large hollowware, 1.1 L or more, other than pitchers (US)                     | ठूला गहिरा भाँडा, 1.1 L वा बढी, जग बाहेक                                                                                                          | guides: food.category.largeHollow                                                          |
| average of 6 pieces / any one of 6                                            | 6 भाँडाको औसत / 6 मध्ये कुनै एक                                                                                                                   | guides: food.judged.average, food.judged.each                                              |
| A piece passes if it releases no more than the limit: the law says “at most”. | भाँडोले सीमाभन्दा बढी धातु ननिकाले पास हुन्छ: कानुनले “बढीमा” भन्छ.                                                                               | guides: food.atMost. "बढीमा", "भन्दा बढी नहुने" = at most; "भन्दा कम" = under.             |
| Buying in (the label before a list of countries)                              | खरिद:                                                                                                                                             | guides: equivalents.buyingIn                                                               |
| differs by {grams} g per 100 g                                                | प्रत्येक 100 g मा {grams} g फरक                                                                                                                   | guides: equivalents.apart                                                                  |
| Directive 84/500/EEC (its official name)                                      | युरोपेली सङ्घ (EU) को निर्देशन 84/500/EEC                                                                                                         | regions: no official Nepali text; the number kept. Native check on निर्देशन.               |
| Japan Poison Information Center, Osaka (大阪中毒110番)                        | जापान विष सूचना केन्द्र, ओसाका: Ōsaka chūdoku 110-ban (大阪中毒110番)                                                                             | safety: Japan's lines (Hepburn with macrons, the kanji in brackets).                       |

### 2.10 Signing in

The words Google uses on its Nepali help pages (Microsoft and Apple publish no Nepali help pages that could be found), and
the choice:

| English                                   | Nepali                                | Notes                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| two-step sign-in (2-step verification)    | दुई चरणको साइन इन                     | Google: "२ चरण प्रमाणीकरण" (with a Devanagari digit). The English writes "two-step" as a word, so a digit 2 is a figure the check rejects: write "दुई". Native check.                 |
| authenticator app                         | अथेन्टिकेटर एप                        | Google ("Google Authenticator वा पुष्टि कोड सिर्जना गर्ने अन्य एप", "Google एपहरू"). "अथेन्टिकेटर एपको कोड".                                                                          |
| setup key (the key typed in)              | सेटअप की                              | Usage: Google writes "सेक्युरिटी की"; the setup key's own screen was not read. "की कपी गर्नुहोस्". Not साँचो, kept for nothing here (see security key).                               |
| QR code                                   | QR कोड                                | Google ("QR कोड"), Latin QR as Google writes it.                                                                                                                                      |
| passkey                                   | पासकी                                 | Google ("पासकी"); plural "पासकीहरू" where no number precedes.                                                                                                                         |
| recovery code (backup code)               | रिकभरी कोड                            | Google writes "ब्याकअप कोड"; the app's "Recovery code" is "रिकभरी कोड" every time, never ब्याकअप कोड. Native check.                                                                   |
| the code from the app (verification code) | पुष्टि कोड                            | Google ("पुष्टि कोड").                                                                                                                                                                |
| security key                              | सेक्युरिटी की                         | Google ("हार्डवेयर सेक्युरिटी की"; the topic page also says "सुरक्षा साँचो"). सेक्युरिटी की is kept, so that की is one word across setup key, passkey and security key. Native check. |
| sign in, sign out                         | साइन इन गर्नुहोस्, साइन आउट गर्नुहोस् | Google ("साइन इन"; the sign-out page was not served in Nepali).                                                                                                                       |
| account                                   | खाता                                  | Google ("Google खाता").                                                                                                                                                               |
| password                                  | पासवर्ड                               | Google ("पासवर्ड").                                                                                                                                                                   |
| trusted device                            | विश्वसनीय डिभाइस                      | Google ("विश्वसनीय डिभाइस"; "यो कम्प्युटरमा फेरि नमागियोस्").                                                                                                                         |

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
  numbers, IARC group numbers; the emergency numbers 102, 100, 101 and 112 as the English gives them.
- **Names:** Glazecalc; "UMF" as an abbreviation; Seger, Orton (Orton Ceramic Foundation), Staffordshire, Bullers,
  Holdcroft (Orton and SK in Latin letters; Seger is सेगर in running text, as the Cones subsection says).
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
