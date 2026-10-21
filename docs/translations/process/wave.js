// What the prompt makers share: the repo, the scratch folder, the branch, the
// languages of the waves to come, and filling a template's {PLACEHOLDERS}
// ({REPO}, {BRANCH} and {SCRATCH} in every one).
//
// Set GLAZECALC_SCRATCH to the session's scratch folder (absolute) before
// running any maker; the prompts and the agents' work files go there.
// GLAZECALC_BRANCH names the branch in the prompts (default: the current one).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
// The checkout the prompts name as the repo: this one, a worktree's own folder
// when run in a worktree, never the main checkout (docs/asia-plan.md, "Lessons
// from Japan, applied to Türkiye", 1). Written as Windows writes it.
const REPO = ROOT.replace(/\//g, '\\');
const HERE = __dirname;

const scratchDir = process.env.GLAZECALC_SCRATCH;
if (!scratchDir || !path.isAbsolute(scratchDir)) {
  throw new Error('Set GLAZECALC_SCRATCH to the scratch folder, as an absolute path.');
}
/** The scratch folder, with forward slashes (for Node) and as Windows writes it (for the prompts). */
const SCRATCH = path.resolve(scratchDir).replace(/\\/g, '/') + '/';
const SCRATCH_WIN = SCRATCH.replace(/\//g, '\\');

const BRANCH =
  process.env.GLAZECALC_BRANCH ||
  execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

// The languages still to translate. `country` is who reads it, as the prompts
// say it; `region` the region code in lib/regions; `shops` and `termbank` what
// the glossary's research starts from. Add the next wave's languages here.
//
// A language outside the EU (or with needs the European languages lacked) may
// also give `kilns`, `law` and `terms`, which replace the EU's research lines
// of the glossary prompt (EU_SOURCES), and `notes`: { glossary, translate,
// review, backtranslate }, each a list of rules added to that kind of prompt
// for this language only. The other languages' prompts stay as they were.
const LANGUAGES = {
  ga: {
    language: 'Irish',
    country: 'Ireland',
    region: 'IE',
    shops:
      'Irish shops sell in English (lib/regions/suppliers.js lists DBI Pottery Supplies and RPM Supplies): look for Irish-language ceramics teaching, art-school and Gaeltacht craft sources, and Irish-language school texts on art and chemistry.',
    termbank: 'téarma.ie, the National Terminology Database for Irish (Foras na Gaeilge), and focloir.ie'
  },
  mt: {
    language: 'Maltese',
    country: 'Malta',
    region: 'MT',
    shops:
      'The region data found no shop in Malta; Maltese pottery is taught in Maltese and English (MCAST, the University of Malta): look for Maltese-language craft and school sources, and use shops selling into Malta only to see what is on the bag.',
    termbank:
      'the Maltese terminology of the National Council for the Maltese Language (Kunsill Nazzjonali tal-Ilsien Malti) and IATE'
  },
  // Asia's first (docs/asia-plan.md, Phase D). Japan fires by SK cones (JIS R
  // 8101) and measures a glaze in Baumé; its law has its own wording for
  // limits (以下, never 未満, for "at most").
  ja: {
    language: 'Japanese',
    country: 'Japan',
    region: 'JP',
    shops:
      "lib/regions/suppliers.js lists three, each with the page read: 陶芸百貨店, 丸二陶料 and ヤマニファーストセラミック. Read also the catalogues of the makers whose materials and glazes they sell (feldspar, silica, frit and glaze makers' product sheets, which give a material's name as the bag prints it), and 有恒商事 (Yuko Trading)'s SK cone pages, the cone seller the firing guide names.",
    termbank:
      'the Japanese Industrial Standards for terms (JIS Z 8000 for quantities and units; the JIS R ceramics standards, among them JIS R 8101 for SK cones and the vocabulary of fine ceramics and refractories, as the JIS listings on jisc.go.jp show them), and 文部科学省 学術用語集 (化学編 and others; on the J-GLOBAL or the NII term search)',
    kilns:
      "Japanese kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Japan, and the shops' kiln pages; they give the words for kiln parts, controllers and firing steps (素焼き, 本焼き, 還元).",
    law: 'Japanese law as e-Gov 法令検索 (laws.e-gov.go.jp) writes it, and the official texts of 厚生労働省 (MHLW) and 消費者庁 (CAA, which has set food-contact standards since 2024): 食品衛生法 and 食品、添加物等の規格基準 (ceramic ware, 陶磁器製の器具又は容器包装: its kinds of piece, 加熱調理用器具, and its limits written with 以下), 労働安全衛生法, 粉じん障害防止規則 and 作業環境評価基準 (管理濃度, and its formula for silica dust, written E = 3.0/(1.19Q + 1)), 防じんマスクの規格 (国家検定, DS and RS masks, 区分), the GHS labels and safety data sheets as JIS Z 7252 and JIS Z 7253 word them (危険, 警告, the Japanese H-statements, 安全データシート); the bodies: 日本中毒情報センター (大阪中毒110番, つくば中毒110番), 子ども医療電話相談 (#8000), and 日本産業衛生学会 (JSOH) and its 許容濃度等の勧告. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Japanese text: say what the Japanese pages of 厚生労働省, JETRO or the EU delegation call it, or describe it plainly with the number kept;',
    terms:
      'the term banks of Japanese ({TERMBANK}); IATE has no Japanese. For software conventions (register, buttons, punctuation, brackets, katakana long vowels, spaces beside Latin letters and digits), the Microsoft Japanese style guide and the JTF 日本語標準スタイルガイド (Japan Translation Federation).',
    notes: {
      glossary: [
        "Terms come first from manufacturers' and shops' catalogues (the names printed on the bag: 福島長石, 釜戸長石, 合成土灰), then from textbooks and the term banks. Say which source each row rests on.",
        'Style sheet: name the subsection "EU law" "Law in Japan"; under "Capitalisation" say that Japanese has none and how Latin words inside Japanese text are written; under "Gender-neutral wording" say what applies (titles, 彼/彼女, job names). Add three subsections: "Script and characters" (常用漢字, kana for words the law and shops write in kana, katakana long vowels, no simplified hanzi: the check rejects 铁, 设), "Spaces" (no spaces between Japanese words; whether a space goes between Japanese and a Latin word, a trade name or a figure, from the style guides, with examples; never a full-width space), and "Japanese and Markdown" (in the guides, `**` and `*` next to 「」, （） or 。 inside the emphasis do not render: keep the brackets and punctuation outside it).',
        'Register: です/ます in messages and guides; buttons, menus, tabs and headings in the forms Japanese software uses (nouns, 保存, 削除; する-verbs without する), from the Microsoft Japanese style guide. Give examples of a button, an error and a guide sentence.',
        'Cones: SK cones are always written "SK" with the number as printed (SK 6a, SK 015a), never named ゼーゲル as a label. ゼーゲル appears only where the English says Seger: the Seger formula (ゼーゲル式, beside "UMF"), the older European Seger cones of the firing guide (say how to keep them apart from SK cones, which Japanese potters often call ゼーゲル), and 立つゼーゲル, the name Orton self-supporting cones are sold under. Orton cones keep the name Orton wherever an SK number could be read instead. Never give an SK number for an Orton number or the reverse, nor any equivalence, in a row or an example. Give the wording for "one number hotter/cooler" that holds for SK 022 to SK 20.',
        'Numbers: half-width digits always, never full-width (１２), kanji numerals (十二) or 万 for a figure the English writes in digits, and never circled numbers (①). Where the English writes a number as a word (two coats, three tiles), the check reads no number there, so a digit would be a figure the English lacks: say how to write it (kanji such as 二度, 三つ, or rewording). Thousands with a comma (1,000), the decimal point (1.5). Units as half-width symbols as the English writes them (1222 °C, 10 g, 5%), keeping the unit of a range where the English has it (10 to 60% is 10～60%, not 10%～60%), inches and feet as インチ and フィート. Dates in the Western calendar, 2026年10月14日, never the era (令和); the check reads 10月 as the English October. Times on the 24-hour clock (20時, 20:00, 8時から17時まで), never 午前 or 午後, which the check rejects.',
        'Plural forms: Japanese has only `other` in CLDR. Every plural message is written `{count, plural, other {…}}`, with the counter inside `other` ({count, plural, other {#種類の原料}}, #件, #回, #枚); `=0` stays where the English has it. Give the counter for each counted noun the app uses.',
        'Punctuation: 。 and 、 (not ．or ，), 「」 for quotations and names of buttons and pages, 『』 inside 「」 or for titles of works, full-width （） around Japanese text and half-width () around Latin text, and the range sign. Say which you chose for each.',
        'Placeholders take particles after them ({region}では, {name}を); say how to build a sentence around {region} (a country name), {count} and {name} so it reads with any value.',
        'Law terms as the law writes them, with the English they translate: "at most", "no more than" and "or less" are 以下, never 未満 (which is "less than", "under"); "or more" and "at least" are 以上; "over" and "more than" are を超える; control concentration is 管理濃度 (a yardstick for the air of a work area, not a personal exposure limit); cooking ware in the food-contact table is 加熱調理用器具; the poison lines are 大阪中毒110番 and つくば中毒110番 (日本中毒情報センター), the children\'s line 子ども医療電話相談 (#8000); JSOH is 日本産業衛生学会. The silica formula keeps the law\'s figures, half-width: 3.0 / (1.19Q + 1).',
        'Specific gravity: 比重 (relative density, a ratio without units, not 密度 in g/cm³); Baumé is ボーメ (°Bé, read on a ボーメ比重計). Give `guides.density.sg` as 比重 with the figure.',
        "Pitfalls to settle: 釉薬 vs 釉 vs うわぐすり; 窯 vs 炉 vs 電気窯 vs オーブン; 素焼き (bisque) vs 本焼き (glaze firing); 陶器 vs 炻器 vs 磁器 (earthenware, stoneware, porcelain); 珪石 vs 硅石 vs ケイ石 (the shops write 硅石, the term bank ケイ素 for silicon); 石灰石 or 炭酸カルシウム for whiting; 溶出試験 for the leach test (not narrowed to lead and cadmium); 防じんマスク vs 呼吸用保護具 vs 換気扇 (respirator vs ventilator); the app's guides (ガイド) vs a kiln's manual (取扱説明書).",
        'No rule may ask for figures the English lacks: no era years, no added SK or Orton equivalents, no converted units, no 万. The numbers check rejects every one.'
      ],
      translate: [
        'Register: です/ます in messages and guides; buttons, menus and headings as the style sheet gives them.',
        'SK cones are written "SK" with the number as printed (SK 6a), never named ゼーゲル; ゼーゲル only where the English says Seger or quotes it in Japanese (京都ゼーゲル, 立つゼーゲル), as the style sheet says. Never give an SK number for an Orton number or the reverse, nor say they are equal.',
        'Numbers: half-width digits wherever the English has digits, never full-width, kanji numerals, 万 or circled numbers; a number the English writes as a word stays a word (二度, 三つ), since a digit would be a figure the English lacks. Units half-width as the English writes them. Dates 2026年10月14日 (Western calendar). Times on the 24-hour clock (20時, 20:00), never 午前 or 午後.',
        'Plural forms: Japanese has only `other`; write `{count, plural, other {…}}` with the counter the style sheet gives inside it (#種類, #件, #回), and keep `=0` where the English has it.',
        'Punctuation: 。 and 、; brackets and quotation marks as the style sheet gives them. No spaces between Japanese words; spaces beside Latin words, trade names and figures as the style sheet says; never a full-width space.',
        'Law terms as the law writes them: "at most", "no more than", "or less" are 以下, never 未満 ("less than", "under" are 未満); 管理濃度 (control concentration); 加熱調理用器具 (cooking ware, in the food-contact table); 大阪中毒110番, つくば中毒110番, 子ども医療電話相談; JSOH is 日本産業衛生学会. `guides.silica.formulaValue` keeps `{numerator} / ({factor}Q + 1) mg/m³` as it is, half-width.',
        'The food-contact bullet above names Directive 84/500/EEC: it has no official Japanese text, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        'In the guides, keep 「」, （） and 。 outside `**` and `*`: Markdown does not draw the emphasis when a bracket or a stop is just inside it.'
      ],
      review: [
        'Japanese: "at most", "no more than" and "or less" are 以下, never 未満; "less than" and "under" are 未満; "or more" and "at least" 以上. A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Japanese: SK cones written "SK" as printed and never called ゼーゲル; no SK number given for an Orton number or the reverse.',
        'Japanese: half-width digits, never full-width, kanji numerals, 万 or circled numbers where the English has digits; dates in the Western calendar; the 24-hour clock, never 午前 or 午後; plural messages with `other` only and the counter inside it.',
        'Japanese: です/ます; 。 and 、; no spaces between Japanese words, and spaces beside Latin text as the style sheet says; no simplified hanzi; no bracket or stop just inside `**` or `*` in the guides.',
        "Japanese: the law's and the bodies' own names: 管理濃度, 加熱調理用器具, 大阪中毒110番, つくば中毒110番, 子ども医療電話相談, 日本産業衛生学会 (JSOH)."
      ],
      backtranslate: [
        '以下 means "at most" (the limit itself passes); 未満 means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        '管理濃度 (control concentration) is a yardstick for the air of a work area, not a limit on what one person breathes; check that the translation still says so.',
        'Names of Japanese services and bodies (大阪中毒110番, 子ども医療電話相談, 日本産業衛生学会) stay in Japanese: compare what they refer to.'
      ]
    }
  },
  // Phase E's Turkish (docs/asia-plan.md, Phase E, point 5, and "Lessons from
  // Japan, applied to Türkiye"). Türkiye fires by temperature and reads a glaze
  // as specific gravity, litre weight (g/L) or bome; its shops call Orton cones
  // "Seger piramidi"; its law follows the EU's in Turkish (mevzuat.gov.tr).
  tr: {
    language: 'Turkish',
    country: 'Türkiye',
    region: 'TR',
    shops:
      'lib/regions/suppliers.js lists three, each with the page read: Pega Seramik (pegaseramik.com.tr, Hammaddeler ve Oksitler), Tecnodieci Shopping (tecnodiecishopping.com, Ham Maddeler; it sells "Seger Piramidi (Orton)") and Seramiksir (seramiksir.com, Hammaddeler). Read also what the Turkish producers publish (Esan of Eczacıbaşı for feldspar and kaolin, Kaltun for feldspar and quartz, Eti Maden for colemanite, ulexite and the boron products), which give a material\'s name as the bag prints it (sodyum feldspat, kolemanit, üleksit).',
    termbank:
      "the Ministry of National Education's MEGEP modules for ceramics and glass technology (megep.meb.gov.tr; \"Sırlama ve Pişirim\" and its neighbours: sır, astar, bisküvi, sırlı pişirim, litre ağırlığı, boumetre, daldırma, püskürtme), the Turkish Standards (TS, TS EN, as TSE's catalogue names them), and TDK's dictionaries and term lists (sozluk.gov.tr) where they can be reached",
    kilns:
      "Turkish kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Türkiye, the shops' kiln and kiln-furniture pages, and Aslan & Canduran, Seramik Pişirim Teknikleri ve Fırınları; they give the words for kiln parts, controllers and firing steps (bisküvi pişirimi, sırlı pişirim, indirgen pişirim).",
    law: 'Turkish law as mevzuat.gov.tr and the Resmî Gazete write it: Tozla Mücadele Yönetmeliği (RG 05.11.2013/28812; solunabilir toz, kristal yapıda SiO2, its Ek-1 and the formula 10 mg/m³ / (%SiO2 + 2)), Türk Gıda Kodeksi Gıda ile Temas Eden Seramik Malzemeler Tebliği (2012/30; its kategoriler, kurşun ve kadmiyum migrasyonu and its limits), Kişisel Koruyucu Donanım Yönetmeliği (RG 01.05.2019/30761) and the FFP classes of TS EN 149, the Turkish CLP: Kimyasalların Sınıflandırılması, Etiketlenmesi ve Ambalajlanması Hakkında Yönetmelik (SEA; the signal words (uyarı kelimeleri) Tehlike and Dikkat, zararlılık ifadeleri, the Turkish H-statements) and Güvenlik Bilgi Formları Hakkında Yönetmelik (güvenlik bilgi formu); the bodies: Sağlık Bakanlığı and its Ulusal Zehir Danışma Merkezi (UZEM, 114), 112 Acil Çağrı Merkezi, Çalışma ve Sosyal Güvenlik Bakanlığı İş Sağlığı ve Güvenliği Genel Müdürlüğü. Where the English names EU law (Directive 84/500/EEC, CLP, Directive (EU) 2017/2398), use the name the Turkish regulations or the Turkish pages of the EU delegation give it, keeping the number;',
    terms:
      "the term banks and teaching texts of Turkish ({TERMBANK}); IATE has Turkish for some terms, since Türkiye is a candidate country, but check each against Turkish usage. For software conventions (register, buttons, punctuation, quotation marks, capitals), the Microsoft Turkish style guide and TDK's Yazım Kılavuzu (spelling, capitals, apostrophes before suffixes, numbers).",
    notes: {
      glossary: [
        "Terms come first from the shops' catalogues and the producers' product names (the names printed on the bag: sodyum feldspat, potasyum feldspat, kuvars, kaolen, kolemanit, frit), then from the MEB MEGEP modules, Arcasoy & Başkırkan's Seramik Teknolojisi and the university departments (Hacettepe, Anadolu, Kütahya Dumlupınar), then the term banks. Say which source each row rests on.",
        'Style sheet: name the subsection "EU law" "Law in Türkiye" (the Turkish regulations that follow the EU directives, and how the English\'s EU names are written). Under "Capitalisation", give the dotted and dotless i in capitals (i/İ, ı/I: İSTANBUL, KUVARS, SIR, not ISTANBUL or SİR), that text the app sets in capitals by CSS is cased by the page\'s language, and TDK\'s rules for titles and headings. Add a subsection "Suffixes after names, numbers and placeholders": the apostrophe before a suffix on a proper name, a number or an abbreviation (Türkiye\'de, 1222 °C\'de, SK 6\'da, FFP2\'yi), vowel harmony and consonant changes after a figure read aloud, and why {region}, {name} and {count} cannot take one (the value is unknown): a generic noun beside the placeholder takes the suffix instead ({name} adlı tarif), and {region}, which may be a region such as Hong Kong and is never called a country, follows a colon (Mağazalar: {region}).',
        'Register: siz forms, as Turkish software and the MEB texts use (Kaydedin or Kaydet? say which form buttons take, from the Microsoft Turkish style guide and current Turkish software: buttons and menus are usually the bare verb stem or a noun, Kaydet, Sil, messages and guides use -iniz/-ınız and the polite imperative -in/-ın). Give examples of a button, an error and a guide sentence.',
        'Cones: Turkish shops call Orton cones "Seger piramidi" (Tecnodieci sells "Seger Piramidi (Orton)"). Orton cones are named as Orton wherever the English says Orton (Orton piramidi or Orton konisi, from the sources; "Seger piramidi" may stand beside it once, in brackets, where a potter would look for the shop\'s word). SK cones are SK, named "SK (JIS R 8101)" where the English names the standard, and SK with the number as printed (SK 6a) elsewhere: the numbers check would reject 8101 where the English lacks it. German Seger cones are "Seger" only where the English says Seger (the firing guide\'s older European cones). "Seger formülü" is the unity formula, a different thing: it never names a cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler" (bir numara daha sıcak/soğuk, or what the sources say).',
        "Numbers: as CLDR's Turkish gives them and the app formats them (Intl, tr): decimal comma (1,5), thousands with a point (1.222) or none (1222 °C), the percent sign before the number (%5, %0,5) and once before a range (%10–60, which the check reads as the English 10–60%), a space before units (1222 °C, 10 g), dates as 14 Ekim 2026 with the month's name kept beside its year (never a numeric date the check cannot match to the English's month name), times on the 24-hour clock written saat 20.00 as TDK writes it (never 20:00, which the check reads as 20 and 00, nor öğleden sonra 8). Digits where the English has digits; a number the English writes as a word (two coats, three tiles) stays a word (iki kat, üç karo), since a digit would be a figure the English lacks. Official names with digits are names: keep 112, 114 and UZEM whole, never as words.",
        'Plural forms: Turkish has `one` and `other` in CLDR (cardinal). A noun after a number stays singular (1 malzeme, 2 malzeme, 5 malzeme), so both forms usually read the same; the check still wants both (`{count, plural, one {# malzeme} other {# malzeme}}`), and `=0` stays where the English has it. Give an example with a glaze word and with a suffix after the count (# malzemeyle).',
        'Specific gravity: özgül ağırlık (relative density, a ratio without units: 1,45), not yoğunluk in g/cm³; `guides.density.sg` writes "özgül ağırlık {value}". Litre weight (litre ağırlığı, g/L, 1450 g/L) is what MEB and potters read by a graduated cylinder, but it is another figure: never give it where the English gives specific gravity, as the check would reject the figure. Baumé is bome (°Bé, read on a boumetre). Say which word the Settings labels use.',
        'Law terms as the regulations write them, with the English they translate: "at most", "no more than" are en fazla or the law\'s own "… değerlerin üstünde olamaz"; "less than", "under" are "-den az" / "altında"; "over", "more than" "üzerinde" / "aşan"; "at least" en az. Keep them apart: a slip moves a legal limit. Respirable dust is solunabilir toz; crystalline silica kristal yapıda SiO2 (or kristal silika, from the sources); the 8-hour TWA is ZAOD (zaman ağırlıklı ortalama değer); lead and cadmium release is kurşun ve kadmiyum migrasyonu; the Tebliğ\'s kinds of piece in its own words (pişirme kapları for cooking ware), without its category numbers, which the English lacks. The poison line is Ulusal Zehir Danışma Merkezi (UZEM), 114; the emergency number 112. Source titles keep their dates and numbers exactly (RG 05.11.2013/28812, Tebliğ No: 2012/30).',
        'No added emphasis: mutlaka, kesinlikle, her zaman, asla only where the English has must/always/never or the like; give the forms that keep "should" (-meli/-malı? or önerilir) and "must" apart, and "may" (-ebilir) as a hedge that must survive.',
        "Pitfalls to settle: sır vs emaye vs vernik (glaze, enamel, varnish); frit vs ergitici (flux); fırın (kiln) vs mutfak fırını (oven); bisküvi pişirimi vs sırlı pişirim; çömlek vs toprak kap vs fayans vs pişmiş toprak (earthenware, faience, terracotta); taş seramik/stoneware (gres?) and porselen; kalsit vs tebeşir vs kireç (whiting is calcium carbonate, not lime); the material vs the oxide (kuvars vs SiO2, silis); toz maskesi vs solunum koruyucu vs havalandırma (respirator vs ventilation); the app's guides (rehber) vs a kiln's manual (kullanım kılavuzu): two different words.",
        'No rule may ask for figures the English lacks: no added SK or Orton equivalents, no litre weight for a specific gravity, no converted units, no standard numbers (JIS R 8101, TS EN 149) where the English has none. The numbers check rejects every one.'
      ],
      translate: [
        'Register: siz forms in messages and guides (the polite imperative -in/-ın, -iniz/-ınız); buttons, menus and headings as the style sheet gives them.',
        'Cones: Orton cones are Orton wherever the English says Orton ("Seger piramidi" only beside it, as the style sheet says); SK cones are SK with the number as printed; Seger only where the English says Seger; "Seger formülü" is the unity formula, never a cone. Never give an SK number for an Orton number or the reverse, nor say they are equal.',
        'Numbers as Turkish writes them: 1,5; 1222 °C (four digits ungrouped, as the app prints them) and 12.500 g; %5, and a range %10–60; 14 Ekim 2026 (the month named, beside its year); the 24-hour clock as saat 20.00, never 20:00. Digits wherever the English has digits; a number the English writes as a word stays a word (iki kat), since a digit would be a figure the English lacks. Official names with digits stay whole (112, UZEM 114).',
        "Capitals: dotted and dotless i keep their own capitals (İ, I): KUVARS, İSTANBUL. A suffix on a name, number or abbreviation takes an apostrophe (Türkiye'de, 1222 °C'de); a placeholder never takes a suffix: put a generic noun beside it, as the style sheet says.",
        'Plural forms: Turkish has `one` and `other`; write both, with the noun singular after the number (# malzeme), and keep `=0` where the English has it.',
        'Specific gravity is özgül ağırlık with the English\'s figure (`guides.density.sg`: "özgül ağırlık {value}"); never turn it into litre weight (g/L), which is another figure. Baumé is bome (°Bé).',
        'No added emphasis: never add mutlaka, kesinlikle, her zaman or asla where the English has no such word; keep should, must and may apart as the style sheet says.',
        'Law terms as the regulations write them: "at most", "no more than" en fazla; "less than", "under" -den az / altında; "over" üzerinde / aşan. Solunabilir toz, kristal yapıda SiO2, ZAOD, kurşun ve kadmiyum migrasyonu as the style sheet gives them. `guides.silica.formulaValue` keeps its placeholders and figures as they are. Source titles keep their dates and numbers exactly (RG 05.11.2013/28812, Tebliğ No: 2012/30).',
        "The food-contact text names Directive 84/500/EEC: Türkiye's Tebliğ (2012/30) follows it with the same categories and figures; name the directive as the style sheet says, keeping its number, so that the 3 L still applies only to packaging and storage vessels."
      ],
      review: [
        'Turkish: "at most" and "no more than" are en fazla (or the law\'s "üstünde olamaz"), never "-den az" or "altında" ("less than", "under"). A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Turkish: Orton cones named as Orton (the shops\' "Seger piramidi" only beside it); SK cones as SK; Seger only where the English says Seger; "Seger formülü" never a cone; no SK number for an Orton number or the reverse.',
        "Turkish: 1,5 with a comma, %5 before the number (a range %10–60), dates with the month named beside the year, times as saat 20.00 (never 20:00); a number the English writes as a word stays a word; specific gravity as özgül ağırlık with the English's figure, never litre weight.",
        'Turkish: siz forms; İ and I in capitals; an apostrophe before a suffix on a name or number, and no suffix on a placeholder; plural messages with both `one` and `other`.',
        'Turkish: no mutlaka, kesinlikle, her zaman or asla where the English has none, and no should turned into must or a may dropped.'
      ],
      backtranslate: [
        'en fazla means "at most" (the limit itself passes); "-den az" and "altında" mean "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis (mutlaka, kesinlikle, her zaman, asla) and of obligation (-meli, zorunlu) are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        'Names of Turkish services and bodies (Ulusal Zehir Danışma Merkezi, 114, 112, Sağlık Bakanlığı) stay in Turkish: compare what they refer to.'
      ]
    }
  },
  // Wave 1's other three (docs/asia-plan.md, Phase D): Traditional Chinese as
  // Taiwan writes it (Hong Kong reads it too, decision 5), Korean and
  // Simplified Chinese, each with the standard notice. Chinese and Korean
  // fire mostly by temperature, write the Seger formula 塞格式 / 제게르식, and
  // their laws word limits as 以下 / 이하 ("at most"). Traditional and
  // Simplified are written separately, never one converted from the other:
  // silicon is 矽 in Taiwan and 硅 on the mainland.
  'zh-Hant': {
    language: 'Traditional Chinese',
    country: 'Taiwan (Hong Kong reads the same page)',
    region: 'TW',
    shops:
      "lib/regions has no TW region yet (Phase C); the shops are still to find. Look for Taiwan's pottery suppliers (陶藝材料行, many around 鶯歌 in New Taipei) and their category and product pages (釉藥原料, 長石, 矽石 or 石英, 高嶺土, 熔塊, 測溫錐), and the catalogues of the makers whose materials and glazes they sell, which give a material's name as the bag prints it. Read Hong Kong shops' pages too, only to see where Hong Kong's words differ.",
    termbank:
      "國家教育研究院 樂詞網 (terms.naer.edu.tw: its 陶瓷, 化學, 礦物 and 材料 term lists, Taiwan's official bilingual terms), the CNS standards as the 經濟部標準檢驗局 catalogue names them, and 教育部《重編國語辭典修訂本》",
    kilns:
      "kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Taiwan (電窯, 瓦斯窯), the shops' kiln pages, and the teaching pages of 鶯歌陶瓷博物館 and the universities' ceramics departments (國立臺灣藝術大學, 臺南藝術大學); they give the words for kiln parts, controllers and firing steps (素燒, 釉燒, 還原燒).",
    law: "Taiwan's law as 全國法規資料庫 (law.moj.gov.tw) writes it: 勞工作業場所容許暴露標準 (its silica rows, 可呼吸性粉塵, 結晶型游離二氧化矽 and its formula; the limit from 2027-01-01 in its 附表), 食品器具容器包裝衛生標準 (ceramic ware, 陶瓷器: its kinds of piece and its limits for 鉛 and 鎘, written with 以下), 危害性化學品標示及通識規則 (the GHS labels: 危險, 警告, the Chinese H-statements, 安全資料表 SDS) and CNS 15030; the respirator classes of the CNS standards; the bodies: 衛生福利部, 勞動部職業安全衛生署, 臺北榮民總醫院 毒藥物防治諮詢中心 (02-2871-7121). Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Chinese text: say what Taiwan's official pages (衛福部食藥署, BSMI) or the EU's Taiwan office call it, or describe it plainly with the number kept;",
    terms:
      'the term banks of Taiwan ({TERMBANK}); IATE has no Chinese. For software conventions (register, buttons, punctuation, 「」, spaces beside Latin letters and digits), the Microsoft Traditional Chinese (Taiwan) style guide and 教育部《重訂標點符號手冊》.',
    notes: {
      glossary: [
        "Follow docs/translations/ja.md and tr.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from manufacturers' and shops' catalogues (the names printed on the bag), then from textbooks, the universities' course pages and 樂詞網. Say which source each row rests on, with its link.",
        "Taiwan's usage throughout, which Hong Kong also reads (docs/asia-plan.md, decision 5): never a mainland word where Taiwan has its own (軟體 not 软件, 設定 not 設置, 檔案 not 文件, 登入 not 登錄, 帳戶 or 帳號, 預設 not 默認, 資訊 not 信息, 程式 not 程序, 列印 not 打印, 網路 not 網絡). Where Hong Kong's word differs a lot (軟件, 登入 vs 登錄), keep Taiwan's and list the pair in the Notes. Write the page from Taiwan's sources, never by converting Simplified Chinese: the zh-Hans page is written separately.",
        'Style sheet: name the subsection "EU law" "Law in Taiwan"; under "Capitalisation" say that Chinese has none and how Latin words inside Chinese text are written; under "Gender-neutral wording" say what applies (他/她, 您). Add three subsections: "Script and characters" (Traditional characters as Taiwan\'s 教育部 standard writes them (臺 or 台: say which), 矽 for silicon, never 硅, and the other pairs the check rejects in scripts/i18n-check.mjs, SCRIPT_PAIRS: 鉀 鈉 鈣 鎂 鋅 鋁 鐵 燒 窯 溫…), "Spaces" (no spaces between Chinese words; whether a space goes between Chinese and a Latin word, a trade name or a figure, from the style guides, with examples; never a full-width space), and "Chinese and Markdown" (in the guides, `**` and `*` next to 「」, （） or 。 inside the emphasis do not render: keep the brackets and punctuation outside it).',
        "Register: 您 or no pronoun, as Taiwan's software does (the Microsoft style guide); buttons, menus, tabs and headings short (儲存, 刪除, 設定), messages and guides in plain polite sentences. Give examples of a button, an error and a guide sentence.",
        'Cones: SK cones are always written "SK" with the number as printed (SK 6a, SK 015a), named "SK (JIS R 8101)" only where the English names the standard; Orton cones keep the name Orton. Give the word for a pyrometric cone as Taiwan\'s shops and teachers use it (測溫錐, 三角錐, 熔錐? say which, from the sources). 塞格 appears only where the English says Seger: the Seger formula (塞格式, beside "UMF"; say whether 塞格式 or 塞格爾式 or 釉式, from the NTUA and NTUE papers on 塞格式) and the older European Seger cones of the firing guide. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler".',
        'Numbers: half-width digits always, never full-width (１２), Chinese numerals (十二) or 萬 for a figure the English writes in digits. Where the English writes a number as a word (two coats, three tiles), the check reads no number there, so a digit would be a figure the English lacks: say how to write it (兩層, 三片, or rewording). Thousands with a comma (1,000), the decimal point (1.5). Units as half-width symbols as the English writes them (1222 °C, 10 g, 5%), keeping the unit of a range where the English has it (10 to 60% as 10～60% or 10–60%: say which), inches and feet as 英寸 and 英尺. Dates in the Western calendar, 2026年10月14日, never the 民國 year (民國115年), which is a figure the English lacks; the check reads 10月 as the English October. Times on the 24-hour clock (20:00, 20時, 8:00 至 17:00), never 上午, 下午 or 晚上, which the check rejects.',
        'Plural forms: Chinese has only `other` in CLDR. Every plural message is written `{count, plural, other {…}}`, with the counter inside `other` ({count, plural, other {# 種原料}}, # 個, # 次, # 張); `=0` stays where the English has it. Give the counter for each counted noun the app uses.',
        'Punctuation: full-width ，。、；：！？ in Chinese text; 「」 for quotations and names of buttons and pages, 『』 inside 「」, 《》 for titles of works; full-width （） around Chinese text and half-width () around Latin text; the range sign. Say which you chose for each.',
        'Placeholders: {region} is a country name, {name} a recipe or material, {count} a number; say how to build a sentence around them so it reads with any value (在{region}, 「{name}」).',
        'Law terms as the law writes them, with the English they translate: "at most", "no more than" and "or less" are 以下 (the limit itself passes), never 未滿 or 低於 ("less than", "under"); "or more" and "at least" are 以上; "over" and "more than" are 超過. Respirable dust and crystalline silica in the words of 勞工作業場所容許暴露標準; the poison line is 臺北榮總毒藥物防治諮詢中心. Silicosis is 矽肺症 (from the sources).',
        "Specific gravity: 比重 (relative density, a ratio without units, not 密度 in g/cm³); Baumé as Taiwan's potters write it (波美, 波美度, °Bé; from the sources). Give `guides.density.sg` as 比重 with the figure.",
        'Two-step sign-in: add a table "2.10 Signing in" after the last one, with the words Google, Apple and Microsoft use in Traditional Chinese (Taiwan) on their own help pages (link each): two-step sign-in (two-step verification), authenticator app, setup key, passkey, recovery code (backup code), the code from the app, security key, sign in, sign out, account, password. Say which you chose and why.',
        "Pitfalls to settle: 釉 vs 釉藥 vs 琺瑯 vs 亮光漆 (glaze, enamel, varnish); 熔塊 vs 助熔劑 (frit vs flux); 窯 vs 爐 vs 烤箱; 素燒 vs 釉燒; 陶器 vs 炻器 vs 瓷器 (earthenware, stoneware, porcelain); 矽石 vs 石英 vs 二氧化矽 (the material vs the oxide); 碳酸鈣 vs 石灰石 vs 石灰 (whiting is calcium carbonate, not lime); 溶出試驗 for the leach test (not narrowed to lead and cadmium); 防塵口罩 vs 呼吸防護具 vs 抽風機 (respirator vs ventilation); the app's guides (指南) vs a kiln's manual (使用說明書): two different words.",
        'No rule may ask for figures the English lacks: no 民國 years, no added SK or Orton equivalents, no converted units, no 萬. The numbers check rejects every one.'
      ],
      translate: [
        "Taiwan's usage and Traditional characters as the style sheet gives them (矽, 軟體, 設定, 檔案, 登入); never a mainland word, and never a character the check's SCRIPT_PAIRS rejects.",
        'SK cones are written "SK" with the number as printed (SK 6a); Orton cones keep the name Orton; 塞格 only where the English says Seger. Never give an SK number for an Orton number or the reverse, nor say they are equal.',
        'Numbers: half-width digits wherever the English has digits, never full-width, Chinese numerals or 萬; a number the English writes as a word stays a word (兩層, 三片), since a digit would be a figure the English lacks. Units half-width as the English writes them. Dates 2026年10月14日 (Western calendar, never 民國). Times on the 24-hour clock (20:00, 20時), never 上午, 下午 or 晚上.',
        'Plural forms: Chinese has only `other`; write `{count, plural, other {…}}` with the counter the style sheet gives inside it, and keep `=0` where the English has it.',
        'Punctuation: full-width ，。、 and 「」 as the style sheet gives them. No spaces between Chinese words; spaces beside Latin words, trade names and figures as the style sheet says; never a full-width space.',
        'Law terms as the law writes them: "at most", "no more than", "or less" are 以下, never 未滿 or 低於 ("less than", "under"); "over" is 超過. `guides.silica.formulaValue` keeps its placeholders and figures as they are, half-width.',
        'The food-contact text names Directive 84/500/EEC: it has no official Chinese text, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        'In the guides, keep 「」, （） and 。 outside `**` and `*`: Markdown does not draw the emphasis when a bracket or a stop is just inside it.',
        'No added emphasis: never add 務必, 一定, 絕對 or 總是 where the English has no such word; keep should (應, 建議), must (必須) and may (可能) apart as the style sheet says.'
      ],
      review: [
        'Traditional Chinese: "at most", "no more than" and "or less" are 以下, never 未滿 or 低於; "less than" and "under" are 未滿 or 低於; "or more" and "at least" 以上. A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Traditional Chinese: Taiwan\'s words and characters (矽, never 硅; 軟體, 設定, 檔案, 登入), never a mainland word or a Simplified character; SK cones written "SK" as printed; no SK number given for an Orton number or the reverse.',
        'Traditional Chinese: half-width digits, never full-width, Chinese numerals or 萬 where the English has digits; dates in the Western calendar, never 民國; the 24-hour clock, never 上午, 下午 or 晚上; plural messages with `other` only and the counter inside it.',
        'Traditional Chinese: full-width ，。、 and 「」; no spaces between Chinese words, and spaces beside Latin text as the style sheet says; no bracket or stop just inside `**` or `*` in the guides; no 務必, 一定 or 絕對 the English lacks.'
      ],
      backtranslate: [
        '以下 means "at most" (the limit itself passes); 未滿 and 低於 mean "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation (務必, 一定, 絕對, 必須, 應) are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        "Names of Taiwan's services and bodies (臺北榮總毒藥物防治諮詢中心, 衛生福利部, 勞動部職業安全衛生署) stay in Chinese: compare what they refer to."
      ]
    }
  },
  ko: {
    language: 'Korean',
    country: 'South Korea',
    region: 'KR',
    shops:
      "lib/regions has no KR region yet (Phase C), and its research found no Korean shop: look for Korea's pottery suppliers (도예 재료, 유약 원료, 도자기 재료 쇼핑몰; many around 이천 and 여주) and their category and product pages (장석, 규석, 고령토 or 카올린, 프릿, 유약, 제게르 콘 or 오튼 콘), and the catalogues of the makers whose materials and glazes they sell, which give a material's name as the bag prints it.",
    termbank:
      "국립국어원's 표준국어대사전 and 우리말샘 (stdict.korean.go.kr, opendict.korean.go.kr), 대한화학회's chemistry terms (the 화학술어 and element names), the KS standards for ceramics and refractories (KS L, as the e-나라표준인증 catalogue names them), and 한국세라믹학회 and 한국세라믹기술원 term pages",
    kilns:
      "Korean kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Korea (전기가마, 가스가마), the shops' kiln pages, and the teaching pages of 한국도자재단 and the universities' ceramics departments; they give the words for kiln parts, controllers and firing steps (초벌, 재벌, 환원 소성).",
    law: 'Korean law as 국가법령정보센터 (law.go.kr) writes it: 산업안전보건법 and 고용노동부 고시 화학물질 및 물리적인자의 노출기준 (its silica rows, 결정체 석영 and 크리스토발라이트, 호흡성), 식품의약품안전처 고시 기구 및 용기·포장의 기준 및 규격 (도자기제: its kinds of piece and its limits for 납 and 카드뮴, written with 이하), 보호구 안전인증 고시 (방진마스크 특급, 1급, 2급), 화학물질의 분류·표시 및 물질안전보건자료에 관한 기준 (the GHS labels: 위험, 경고, the Korean H-statements, 물질안전보건자료 MSDS); the bodies: 고용노동부, 한국산업안전보건공단 (KOSHA), 식품의약품안전처, 보건복지부, 119. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Korean text: say what Korean official pages (식약처, KOTRA, the EU delegation) call it, or describe it plainly with the number kept;',
    terms:
      "the term banks of Korean ({TERMBANK}); IATE has no Korean. For software conventions (register, buttons, punctuation, spacing, loanword spelling as 국립국어원's 외래어 표기법 gives it), the Microsoft Korean style guide and 국립국어원's 한글 맞춤법.",
    notes: {
      glossary: [
        "Follow docs/translations/ja.md and tr.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from manufacturers' and shops' catalogues (the names printed on the bag), then from Korean ceramics textbooks, university course pages and the term banks. Say which source each row rests on, with its link.",
        "Hangul only: scripts/i18n-check.mjs (checkHanja) rejects any run of Chinese characters in a Korean message or guide unless it appears somewhere in docs/translations/ko.md, so every hanja written in this page becomes allowed. Write no Chinese or Japanese characters in this page at all, except a term's hanja that a translator may give after it in brackets (say which, if any, and why: usually none). Give Chinese and Japanese sources' titles in English or by their link only, and write the Japanese and Chinese terms you compare with in romanization (zeegerushiki, saigeshi).",
        'Style sheet: name the subsection "EU law" "Law in Korea"; under "Capitalisation" say that Korean has none and how Latin words inside Korean text are written; under "Gender-neutral wording" say what applies (그, 그녀, 사용자, 님). Add three subsections: "Script and spelling" (Hangul only, as above; loanwords as 외래어 표기법 spells them and as the shops write them, where the two differ say which), "Spaces" (띄어쓰기 as 한글 맞춤법 gives it: between words, not before particles; a number and its unit or counter, 10 g, 3개; with examples), and "Korean and Markdown" (in the guides, `**` and `*` with a bracket or a stop just inside the emphasis and a particle just after it (**"유약"**은) do not render: say how to write them).',
        'Register: say which ending each kind of text takes, from the Microsoft Korean style guide and current Korean software (Google, Apple, Samsung, Naver, Kakao): the plan proposes 합쇼체 (-습니다) for notices, warnings and the safety text and 해요체 (-어요) for the interface; confirm or correct it with sources, and keep one choice throughout. Buttons, menus, tabs and headings as nouns or noun forms (저장, 삭제, 설정). Give examples of a button, an error, a notice and a guide sentence.',
        'Particles after placeholders and figures: 은/는, 이/가, 을/를, 와/과, (으)로 depend on whether the word before ends in a consonant, which {name}, {region} and {count} cannot tell. Say how to build a sentence around them: particles that do not alternate (에서, 에, 의, 도), a generic noun after the placeholder ({region} 지역에서, 레시피 {name}을(를)?), or the (이)가 form; give the choice and examples. Read the Microsoft Korean style guide on variables.',
        'Cones: SK cones are always written "SK" with the number as printed (SK 6a, SK 015a), named "SK (JIS R 8101)" only where the English names the standard; Orton cones keep the name Orton. Korean potters may call SK cones 제게르 콘 as Japanese potters say ゼーゲル: say how to keep them apart from the older European Seger cones of the firing guide and from Orton. Give the Korean for the Seger formula (제게르식, 제게르 식 or 세게르식? beside "UMF"; confirm from Korean textbooks and papers, koreascience.kr) and for a pyrometric cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler".',
        'Numbers: half-width digits always, never full-width or 만 for a figure the English writes in digits. Where the English writes a number as a word (two coats, three tiles), the check reads no number there, so a digit would be a figure the English lacks: say how to write it (두 번, 세 장, or rewording). Thousands with a comma (1,000), the decimal point (1.5). Units as half-width symbols as the English writes them (1222 °C, 10 g, 5%), keeping the unit of a range where the English has it (10 to 60% as 10~60%: say which sign), inches and feet as 인치 and 피트. Dates as 2026년 10월 14일 (the check reads 10월 as the English October). Times on the 24-hour clock (20:00, 20시, 8시부터 17시까지), never 오전 or 오후, which the check rejects.',
        'Plural forms: Korean has only `other` in CLDR. Every plural message is written `{count, plural, other {…}}`, with the counter inside `other` ({count, plural, other {원료 #개}} or {#가지 원료}, #번, #장); `=0` stays where the English has it. Give the counter for each counted noun the app uses.',
        'Punctuation: Korean uses the Latin marks (. , ? ! : ;), with the quotation marks 한글 맞춤법 gives (" " and \' \', or 「」 for titles?) and the range sign; say which you chose for each, and for button and page names.',
        'Law terms as the law writes them, with the English they translate: "at most", "no more than" and "or less" are 이하 (the limit itself passes), never 미만 ("less than", "under"); "or more" and "at least" are 이상; "over" and "more than" are 초과. Respirable crystalline silica and the exposure standard (노출기준, TWA) in the words of the 고용노동부 고시; respirator classes 특급, 1급, 2급; the food-contact limits in the words of 기구 및 용기·포장의 기준 및 규격. Silicosis is 규폐증.',
        'Specific gravity: 비중 (relative density, a ratio without units, not 밀도 in g/cm³); Baumé as Korean potters write it (보메, °Bé; from the sources). Give `guides.density.sg` as 비중 with the figure.',
        'Two-step sign-in: add a table "2.10 Signing in" after the last one, with the words Google, Apple and Microsoft use in Korean on their own help pages (link each): two-step sign-in (2단계 인증?), authenticator app, setup key, passkey, recovery code (backup code), the code from the app, security key, sign in, sign out, account, password. Say which you chose and why.',
        "Pitfalls to settle: 유약 vs 에나멜 vs 바니시 (glaze, enamel, varnish); 프릿 vs 융제 or 매용제 (frit vs flux); 가마 vs 오븐; 초벌 vs 재벌 (bisque vs glaze firing); 도기 vs 석기 vs 자기 (earthenware, stoneware, porcelain; and 옹기, 분청, 청자, 백자 as Korean kinds of ware, only where the English names them); 규석 vs 석영 vs 실리카 (the material vs the oxide); 탄산칼슘 vs 석회석 vs 석회 (whiting is calcium carbonate, not lime); 용출 시험 for the leach test (not narrowed to lead and cadmium); 방진마스크 vs 호흡보호구 vs 환기 (respirator vs ventilation); the app's guides (가이드 or 안내서?) vs a kiln's manual (사용 설명서): two different words.",
        'No rule may ask for figures the English lacks: no added SK or Orton equivalents, no converted units, no 만. The numbers check rejects every one.'
      ],
      translate: [
        'Register as the style sheet gives it (the plan proposes 합쇼체 for notices, warnings and the safety text, 해요체 for the interface); buttons, menus and headings as nouns.',
        "Hangul only: no hanja unless the style sheet gives that term's hanja (the check rejects any other). Spaces between words as 한글 맞춤법 gives them.",
        'Particles after {name}, {region} and {count} as the style sheet says (a particle that does not alternate, or a generic noun beside the placeholder), so the sentence reads with any value.',
        'SK cones are written "SK" with the number as printed (SK 6a); Orton cones keep the name Orton; 제게르 only where the English says Seger or the style sheet allows it. Never give an SK number for an Orton number or the reverse, nor say they are equal.',
        'Numbers: half-width digits wherever the English has digits, never 만; a number the English writes as a word stays a word (두 번, 세 장), since a digit would be a figure the English lacks. Units half-width as the English writes them. Dates 2026년 10월 14일. Times on the 24-hour clock (20:00, 20시), never 오전 or 오후.',
        'Plural forms: Korean has only `other`; write `{count, plural, other {…}}` with the counter the style sheet gives inside it, and keep `=0` where the English has it.',
        'Law terms as the law writes them: "at most", "no more than", "or less" are 이하, never 미만 ("less than", "under"); "over" is 초과. `guides.silica.formulaValue` keeps its placeholders and figures as they are, half-width.',
        'The food-contact text names Directive 84/500/EEC: it has no official Korean text, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        'In the guides, keep quotation marks, brackets and stops outside `**` and `*`, and a particle straight after the closing mark only where the style sheet says it renders.',
        'No added emphasis: never add 반드시, 꼭, 절대 or 항상 where the English has no such word; keep should (-는 것이 좋습니다, 권장), must (-해야 합니다) and may (-ㄹ 수 있습니다) apart as the style sheet says.'
      ],
      review: [
        'Korean: "at most", "no more than" and "or less" are 이하, never 미만; "less than" and "under" are 미만; "or more" and "at least" 이상; "over" 초과. A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Korean: Hangul only (no hanja the style sheet does not give); spaces between words; particles after placeholders that read with any value; the register the style sheet gives for each kind of text.',
        'Korean: SK cones written "SK" as printed; no SK number given for an Orton number or the reverse; half-width digits, never 만; the 24-hour clock, never 오전 or 오후; plural messages with `other` only and the counter inside it.',
        'Korean: no 반드시, 꼭, 절대 or 항상 the English lacks, and no should turned into must or a may dropped.'
      ],
      backtranslate: [
        '이하 means "at most" (the limit itself passes); 미만 means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation (반드시, 꼭, 절대, 항상, -해야 합니다) are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        'Names of Korean services and bodies (고용노동부, 한국산업안전보건공단, 식품의약품안전처, 119) stay in Korean: compare what they refer to.'
      ]
    }
  },
  'zh-Hans': {
    language: 'Simplified Chinese',
    country: 'mainland China (Singapore and Malaysia read the same page)',
    region: 'CN',
    shops:
      "lib/regions has no CN region yet (Phase C); the shops are still to find. Look for mainland China's pottery suppliers (陶艺材料, 釉料原料; many in 景德镇 and 佛山, and on their own sites rather than marketplaces where possible) and their category and product pages (长石, 石英, 高岭土, 熔块, 釉料, 测温锥), and the catalogues of the makers whose materials and glazes they sell, which give a material's name as the bag prints it. Read 景德镇陶瓷大学's course pages too.",
    termbank:
      "全国科学技术名词审定委员会 (CNTERM, termonline.cn: its 化学, 材料科学 and 硅酸盐 terms), the GB and GB/T standards as SAMR's openstd.samr.gov.cn names them (GB/T 13794-2017 标准测温锥 among them), and 《现代汉语词典》",
    kilns:
      "kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in China (电窑, 气窑), the shops' kiln pages, and the teaching pages of 景德镇陶瓷大学 and other universities' ceramics departments; they give the words for kiln parts, controllers and firing steps (素烧, 釉烧, 还原烧).",
    law: "Chinese law and standards as the official sites write them (the standards' texts on openstd.samr.gov.cn and the copies on China CDC's site): GBZ 2.1-2019 工作场所有害因素职业接触限值 第1部分：化学有害因素 (its silica dust rows, by free-SiO2 content, 呼尘 and 总尘, PC-TWA), GB 4806.4-2016 食品安全国家标准 陶瓷制品 (its kinds of piece and its limits for 铅 and 镉, written with ≤ or 以下), GB 2626-2019 呼吸防护 自吸过滤式防颗粒物呼吸器 (KN90, KN95, KN100; KP), GB 30000 (the GHS labels: 危险, 警告, the Chinese H-statements) and GB/T 16483 (安全技术说明书, SDS); the bodies: 国家卫生健康委员会, 应急管理部, 中国疾病预防控制中心 and its 中毒咨询热线, 120. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Chinese text: say what Chinese official pages or the EU delegation to China call it, or describe it plainly with the number kept;",
    terms:
      'the term banks of Chinese ({TERMBANK}); IATE has no Chinese. For software conventions (register, buttons, punctuation, spaces beside Latin letters and digits), the Microsoft Simplified Chinese style guide and GB/T 15834-2011 标点符号用法.',
    notes: {
      glossary: [
        "Follow docs/translations/ja.md and tr.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from manufacturers' and shops' catalogues (the names printed on the bag), then from textbooks, 景德镇陶瓷大学 and other course pages and CNTERM. Say which source each row rests on, with its link.",
        'Mainland usage throughout, which Singapore and Malaysia also read: Simplified characters as 《通用规范汉字表》 gives them and mainland words (软件, 设置, 文件, 登录, 账户, 默认, 信息, 程序, 打印, 网络). Write the page from mainland sources, never by converting Traditional Chinese: the zh-Hant page is written separately.',
        'Style sheet: name the subsection "EU law" "Law in China"; under "Capitalisation" say that Chinese has none and how Latin words inside Chinese text are written; under "Gender-neutral wording" say what applies (他/她, 您). Add three subsections: "Script and characters" (Simplified characters, 硅 for silicon, and the pairs the check rejects in scripts/i18n-check.mjs, SCRIPT_PAIRS: 矽 鉀 鈉 鈣 鋁 鐵 燒 窯 溫…, which a Simplified message must never contain), "Spaces" (no spaces between Chinese words; whether a space goes between Chinese and a Latin word, a trade name or a figure, from the style guides, with examples; never a full-width space), and "Chinese and Markdown" (in the guides, `**` and `*` next to “”, （） or 。 inside the emphasis do not render: keep the brackets and punctuation outside it).',
        "Silicon is 硅 (二氧化硅, 硅酸盐), never 矽, which the check rejects in a Simplified file. GBZ 2.1-2019 still names its row 矽尘 and the disease 矽肺 (硅肺 in other texts): say how the app writes silica dust and silicosis (硅尘, 硅肺), with the sources, and note that the law's own name uses 矽, for the owner to decide.",
        'Register: 您 or no pronoun, as mainland software does (the Microsoft style guide); buttons, menus, tabs and headings short (保存, 删除, 设置), messages and guides in plain polite sentences. Give examples of a button, an error and a guide sentence.',
        'Cones: SK cones are always written "SK" with the number as printed (SK 6a, SK 015a), named "SK (JIS R 8101)" only where the English names the standard; Orton cones keep the name Orton. Give the word for a pyrometric cone (测温锥, as GB/T 13794-2017 标准测温锥 writes it, or 三角锥 as shops do? say which, from the sources). 塞格 appears only where the English says Seger: the Seger formula (塞格式, beside "UMF"; say whether 塞格式, 塞格尔式 or 釉式, from Chinese textbooks and 景德镇 sources) and the older European Seger cones of the firing guide. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler".',
        'Numbers: half-width digits always, never full-width (１２), Chinese numerals (十二) or 万 for a figure the English writes in digits. Where the English writes a number as a word (two coats, three tiles), the check reads no number there, so a digit would be a figure the English lacks: say how to write it (两层, 三片, or rewording). Thousands with a comma (1,000), the decimal point (1.5). Units as half-width symbols as the English writes them (1222 °C, 10 g, 5%), keeping the unit of a range where the English has it (10 to 60% as 10%～60% or 10～60%: say which, from GB/T 15835), inches and feet as 英寸 and 英尺. Dates as 2026年10月14日 (the check reads 10月 as the English October). Times on the 24-hour clock (20:00, 20点, 8:00 至 17:00), never 上午, 下午 or 晚上, which the check rejects.',
        'Plural forms: Chinese has only `other` in CLDR. Every plural message is written `{count, plural, other {…}}`, with the counter inside `other` ({count, plural, other {# 种原料}}, # 个, # 次, # 张); `=0` stays where the English has it. Give the counter for each counted noun the app uses.',
        'Punctuation: full-width ，。、；：！？ in Chinese text (GB/T 15834-2011); “” and ‘’ for quotations and names of buttons and pages, 《》 for titles of works; full-width （） around Chinese text and half-width () around Latin text; the range sign. Say which you chose for each.',
        'Placeholders: {region} is a country name, {name} a recipe or material, {count} a number; say how to build a sentence around them so it reads with any value (在{region}, “{name}”).',
        'Law terms as the law writes them, with the English they translate: "at most", "no more than" and "or less" are 不超过 or 以下 or ≤ as the standard writes them (the limit itself passes), never 低于 or 小于 ("less than", "under"); "or more" and "at least" are 以上 or 不低于; "over" and "more than" are 超过. Respirable dust (呼尘), total dust (总尘), PC-TWA and the free-SiO2 bands in GBZ 2.1\'s own words; the respirator classes KN95 and KP as GB 2626 writes them; the poison line is 中国疾控中心 中毒咨询热线.',
        'Specific gravity: 比重 (relative density, a ratio without units, not 密度 in g/cm³); Baumé as Chinese potters write it (波美度, °Bé; from the sources). Give `guides.density.sg` as 比重 with the figure.',
        'Two-step sign-in: add a table "2.10 Signing in" after the last one, with the words Google, Apple and Microsoft use in Simplified Chinese on their own help pages (link each; and the words of mainland apps, WeChat or Alipay, where they differ): two-step sign-in (two-step verification), authenticator app, setup key, passkey (通行密钥?), recovery code (backup code), the code from the app, security key, sign in, sign out, account, password. Say which you chose and why.',
        "Pitfalls to settle: 釉 vs 釉料 vs 搪瓷 vs 清漆 (glaze, enamel, varnish); 熔块 vs 熔剂 (frit vs flux); 窑 vs 炉 vs 烤箱; 素烧 vs 釉烧; 陶器 vs 炻器 vs 瓷器 (earthenware, stoneware, porcelain); 石英 vs 硅石 vs 二氧化硅 (the material vs the oxide); 碳酸钙 vs 石灰石 vs 石灰 (whiting is calcium carbonate, not lime); 溶出试验 for the leach test (not narrowed to lead and cadmium); 防尘口罩 vs 呼吸防护用品 vs 排风扇 (respirator vs ventilation); 釉果 and 釉灰 are Jingdezhen materials, only where the English names them; the app's guides (指南) vs a kiln's manual (使用说明书): two different words.",
        'No rule may ask for figures the English lacks: no added SK or Orton equivalents, no converted units, no 万, no standard numbers (GB 4806.4-2016, GBZ 2.1-2019) where the English has none. The numbers check rejects every one.'
      ],
      translate: [
        "Mainland usage and Simplified characters as the style sheet gives them (硅, 软件, 设置, 文件, 登录); never a Traditional character the check's SCRIPT_PAIRS rejects (矽 among them).",
        'SK cones are written "SK" with the number as printed (SK 6a); Orton cones keep the name Orton; 塞格 only where the English says Seger. Never give an SK number for an Orton number or the reverse, nor say they are equal.',
        'Numbers: half-width digits wherever the English has digits, never full-width, Chinese numerals or 万; a number the English writes as a word stays a word (两层, 三片), since a digit would be a figure the English lacks. Units half-width as the English writes them. Dates 2026年10月14日. Times on the 24-hour clock (20:00, 20点), never 上午, 下午 or 晚上.',
        'Plural forms: Chinese has only `other`; write `{count, plural, other {…}}` with the counter the style sheet gives inside it, and keep `=0` where the English has it.',
        'Punctuation: full-width ，。、 and “” as the style sheet gives them. No spaces between Chinese words; spaces beside Latin words, trade names and figures as the style sheet says; never a full-width space.',
        'Law terms as the standards write them: "at most", "no more than", "or less" are 不超过 or 以下, never 低于 or 小于 ("less than", "under"); "over" is 超过. `guides.silica.formulaValue` keeps its placeholders and figures as they are, half-width.',
        'The food-contact text names Directive 84/500/EEC: it has no official Chinese text, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        'In the guides, keep “”, （） and 。 outside `**` and `*`: Markdown does not draw the emphasis when a bracket or a stop is just inside it.',
        'No added emphasis: never add 务必, 一定, 绝对 or 总是 where the English has no such word; keep should (应, 建议), must (必须) and may (可能) apart as the style sheet says.'
      ],
      review: [
        'Simplified Chinese: "at most", "no more than" and "or less" are 不超过 or 以下, never 低于 or 小于; "less than" and "under" are 低于 or 小于; "or more" and "at least" 以上 or 不低于. A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Simplified Chinese: mainland words and Simplified characters (硅, never 矽; 软件, 设置, 登录), never a Taiwan word or a Traditional character; SK cones written "SK" as printed; no SK number given for an Orton number or the reverse.',
        'Simplified Chinese: half-width digits, never full-width, Chinese numerals or 万 where the English has digits; the 24-hour clock, never 上午, 下午 or 晚上; plural messages with `other` only and the counter inside it.',
        'Simplified Chinese: full-width ，。、 and “”; no spaces between Chinese words, and spaces beside Latin text as the style sheet says; no bracket or stop just inside `**` or `*` in the guides; no 务必, 一定 or 绝对 the English lacks.'
      ],
      backtranslate: [
        '不超过 and 以下 mean "at most" (the limit itself passes); 低于 and 小于 mean "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation (务必, 一定, 绝对, 必须, 应) are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        'Names of Chinese services and bodies (中国疾控中心 中毒咨询热线, 国家卫生健康委员会, 120) stay in Chinese: compare what they refer to.'
      ]
    }
  },
  // Wave 2's other three (docs/asia-plan.md, Phase E), each with the standard notice: Indonesian
  // first (the best-scored), then Vietnamese, then Thai. All three have only `other` in CLDR, write
  // 1,5 (id, vi) or 1.5 (th), and are read by the numbers check for their 24-hour clocks (pukul 20.00,
  // 20:30, 20.00 น.). Thai has no spaces between words and uses Western digits; its dates are Gregorian.
  id: {
    language: 'Indonesian',
    country: 'Indonesia',
    region: 'ID',
    shops:
      "lib/regions has no ID region yet (Phase C), and its research found no Indonesian shop for glaze materials and kilns: look for Indonesia's ceramics suppliers and their category and product pages (bahan glasir keramik, felspar, kaolin, silika, frit, oksida, stain, tungku, kerucut), the mineral suppliers whose pages give a material's name as it is sold (Sathir's Potassium Feldspar), and the catalogues of the makers whose materials and glazes they sell.",
    termbank:
      "Badan Pengembangan dan Pembinaan Bahasa's KBBI Daring and its term bank (Pangkalan Data Istilah, glosarium.kemdikbud.go.id), the SNI standards for ceramics as the BSN catalogue names them, and the school and university ceramics texts (Politeknik, ISI, the Kemdikbud SMK pages)",
    kilns:
      "Indonesian kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Indonesia (tungku, kiln), the shops' kiln pages, and the vocational ceramics courses' pages; they give the words for kiln parts, controllers and firing steps (bakar biskuit, bakar glasir, oksidasi, reduksi).",
    law: 'Indonesian law as peraturan.go.id and JDIH write it: Peraturan Menteri Ketenagakerjaan No. 5 Tahun 2018 (Keselamatan dan Kesehatan Kerja Lingkungan Kerja: nilai ambang batas, silika kristalin, kuarsa, kristobalit, the "(R)" for respirable), Peraturan BPOM No. 11 Tahun 2026 tentang Kemasan Pangan (Lampiran I.D Keramik: pangan, batas maksimal, the extraction in 4% acetic acid), the SNI for respirators (masker, respirator) as the BSN catalogue names them, the Indonesian GHS and safety data sheets (kata sinyal Bahaya and Peringatan, pernyataan bahaya, lembar data keselamatan); the bodies: Kementerian Ketenagakerjaan, Kementerian Kesehatan (119, the medical emergency service), BPOM. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Indonesian text: write what Indonesian pages of BPOM, the Ministry of Trade or the EU delegation call it, or describe it plainly with the number kept;',
    terms:
      'the term banks of Indonesian ({TERMBANK}); IATE has no Indonesian. For software conventions (register, buttons, punctuation, spelling, affixes), the Microsoft Indonesian style guide, the Ejaan yang Disempurnakan Edisi V and KBBI.',
    notes: {
      glossary: [
        'Follow docs/translations/tr.md, ko.md and ja.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from shops\' and makers\' catalogues (the names printed on the bag), then from textbooks, university and vocational course pages and the term banks. Say which source each row rests on, with its link; mark rows with no Indonesian source "No source" and rows for a native potter **Native check**.',
        'Style sheet: name the subsection "EU law" "Law in Indonesia" (and say how the English\'s EU names are written); add the subsections the existing language-specific pages carry (Script, spelling and spaces; Placeholders and names; Choices for the owner). Say which wording of "at most", "less than" and "at least" the law uses, and keep them apart.',
        'No rule may ask for figures the English lacks: no added SK or Orton equivalents, no converted units, no Buddhist-era or other-era years, no standard numbers where the English has none. The numbers check rejects every one.',
        'Cones: Orton cones are named Orton wherever the English says Orton; SK cones are SK with the number as printed where the English has them; Seger only where the English says Seger (the firing guide\'s older European cones), and the Seger formula (the unity molecular formula, UMF) never names a cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler", never higher or lower.',
        "Specific gravity is the language's relative-density word with the English's figure, never density in kg/m³ or a litre weight; Baumé as the sources write it. Say which word the Settings labels use.",
        'Plural forms: CLDR gives this language only `other`. Every plural message is written `{count, plural, other {…}}` with the classifier inside it; `=0` stays where the English has it. Give a classifier for each counted noun the app uses.',
        "Pitfalls to settle: glaze vs coating/paint/enamel/varnish; frit vs flux; kiln vs oven; bisque vs raw (unfired); earthenware, stoneware, porcelain; the material vs the oxide (silica vs silicon vs silicone); whiting vs lime; boron vs boric acid vs borax; soda and potash as oxides vs soda ash and potassium carbonate; respirator vs ventilator vs ventilation; the app's guides vs a kiln's manual: two different words.",
        'Two-step sign-in: add the table "2.10 Signing in" after the last one, with the words Google and Apple use on their own help pages in the language (link each): two-step sign-in, authenticator app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account, password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the English lacks.',
        'Register: "Anda" and standard Indonesian (baku), as the Microsoft Indonesian style guide, Google and Apple write it; no "kamu". Buttons are the bare verb (Simpan, Cetak, Hapus), headings noun phrases in sentence case; requests are the bare verb or "silakan"; "jangan" for do not, "jangan pernah" for never; harus, sebaiknya, dapat/bisa and boleh kept apart.',
        'Numbers: decimal comma and thousands point (1,5; 12.500), four-digit temperatures ungrouped (1222 °C), 5% with no space, a range 10–60%; dates 14 Oktober 2026 (the month named, capital O); times on the 24-hour clock with a point and pukul before the hour (pukul 20.00, pukul 20.30, 20.00 WIB; "pukul 08.00 sampai pukul 17.00", pukul repeated), never pukul 8 malam (the check keeps it whole and reports it). A number the English writes as a word stays a word (dua lapis).',
        'Affixes and placeholders: di- cannot attach to a placeholder and -nya cannot follow one; put a generic noun beside it (resep {name}, di {region}). No reduplicated plural after a figure (5 bahan, not bahan-bahan).',
        'Law terms: tidak lebih dari, paling banyak or batas maksimal for "at most"; kurang dari for "less than". Silica: nilai ambang batas (NAB), silika kristalin; the food-contact text says pangan.',
        'Specific gravity: berat jenis (relative density), never massa jenis; guides.density.sg writes "berat jenis {value}". Whiting is kalsium karbonat, never kapur. Glasir must be paired with keramik in titles (glasir alone is also a food icing).',
        'Poison line: none is confirmed for Indonesia: where the English says "poison line", the Indonesian text names the emergency number (119 for medical emergencies, 112 general), as the region data will.'
      ],
      translate: [
        "Style sheet and glossary: docs/translations/id.md. Every term as it gives it; where a row says Native check, use the row's choice and list the sentence in your flags for the reviewer.",
        'Cones: Orton cones are Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where the English says Seger; the Seger formula (UMF) is never a cone. Never give an SK number for an Orton number or the reverse, nor say they are equal. "One number hotter/cooler" as the style sheet gives it, never higher or lower.',
        'Numbers as the style sheet gives them: decimal mark, thousands, percent, units as the English writes them (1222 °C, 10 g), dates with the month named (or as its number where the style sheet says so), times on the 24-hour clock written as the style sheet says. Digits wherever the English has digits; a number the English writes as a word stays a word, since a digit would be a figure the English lacks.',
        'Plural forms: this language has only `other`; write `{count, plural, other {…}}` with the classifier the style sheet gives inside it, and keep `=0` where the English has it.',
        'Should, must and may as the style sheet gives them, kept apart; no emphasis word (never, always, absolutely) the English lacks; "must be tested" means the test is done, not passed.',
        'The food-contact text names Directive 84/500/EEC: it has no official text in this language, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        "Japanese names in the guides and region notes (the firing guide's) are Hepburn romanization with the English gloss, never Japanese script.",
        'Register: "Anda" (or no pronoun), bare-verb buttons, sentence case; di- and -nya never on a placeholder; berat jenis (not massa jenis) for specific gravity; pukul 20.00 and pukul 20.30 for times; the decimal comma and the thousands point.'
      ],
      review: [
        'Indonesian: "at most", "no more than" and "up to" use the law\'s word for at most and never the word for "less than" or "under"; "at least" and "or more" never the word for "more than". A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Indonesian: SK cones written "SK" as printed; Orton cones named Orton; Seger only where the English says Seger; the Seger formula never a cone; no SK number given for an Orton number or the reverse; "one number hotter/cooler", never higher or lower.',
        "Indonesian: the numbers as the style sheet writes them; a number the English writes as a word stays a word; times on the 24-hour clock in the form the style sheet gives (the numbers check rejects 12-hour forms); specific gravity as the relative-density word with the English's figure.",
        'Indonesian: should, must and may kept apart; no emphasis the English lacks; no should turned into must and no may dropped; plural messages with `other` only and the classifier inside it.',
        'Indonesian: Anda and standard Indonesian throughout; no di- or -nya on a placeholder; the decimal comma (1,5) and thousands point (12.500), 1222 °C unspaced; times as pukul 20.00 (never pukul 8 malam); berat jenis, never massa jenis; glasir paired with keramik in titles.'
      ],
      backtranslate: [
        'The law\'s word for "at most" means "at most" (the limit itself passes); the word for "less than" means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        'Names of services and bodies stay in the language: compare what they refer to.',
        'tidak lebih dari and paling banyak mean "at most"; kurang dari means "less than"; harus is "must", sebaiknya "should", dapat "may": translate each back exactly as it reads.'
      ]
    }
  },
  vi: {
    language: 'Vietnamese',
    country: 'Vietnam',
    region: 'VN',
    shops:
      "lib/regions has no VN region yet (Phase C), and its research found no Vietnamese shop with an official price list: look for Vietnam's pottery suppliers (LaTacita, Vườn Nhà Gốm, and the shops of Bát Tràng) and their category and product pages (nguyên liệu men gốm, men, màu oxit, bột màu, frit, trường thạch or fenspat, cao lanh, thạch anh, lò nung, côn), and the catalogues of the makers whose materials they sell (Ceragroup, Ceratech).",
    termbank:
      "Vietnamese Wikipedia's ceramics articles (Men gốm, Gốm, Khuyết tật men), the Vietnamese national standards (TCVN) for ceramics as the STAMEQ catalogue names them, and the university ceramics and silicate-technology courses (Đại học Bách khoa Hà Nội, Đại học Bách khoa TP.HCM)",
    kilns:
      "Vietnamese kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Vietnam (lò nung điện, lò nung gas), the shops' kiln pages and kiln-rental services (cho thuê lò nung), and the Bát Tràng workshops' pages; they give the words for kiln parts, controllers and firing steps (nung mộc, nung men, oxy hóa, khử).",
    law: 'Vietnamese law as vbpl.vn and thuvienphapluat.vn write it: QCVN 02:2019/BYT (Thông tư 02/2019/TT-BYT: giá trị giới hạn tiếp xúc cho phép đối với bụi, silic tự do, bụi hô hấp), QCVN 12-4:2015/BYT (Thông tư 47/2015/TT-BYT: bao bì, dụng cụ làm bằng thủy tinh, gốm, sứ và tráng men tiếp xúc trực tiếp với thực phẩm, giới hạn thôi nhiễm), the Law on Chemicals and its GHS decrees (từ cảnh báo, câu cảnh báo nguy hiểm, phiếu an toàn hóa chất), the TCVN for respirators (khẩu trang lọc bụi) as the STAMEQ catalogue names them; the bodies: Bộ Y tế, Bộ Lao động - Thương binh và Xã hội, Trung tâm Chống độc Bệnh viện Bạch Mai, the emergency numbers 113, 114 and 115. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Vietnamese text: write what Vietnamese pages of the Ministry of Industry and Trade or the EU delegation call it, or describe it plainly with the number kept;',
    terms:
      "the term banks of Vietnamese ({TERMBANK}); IATE has no Vietnamese. For software conventions (register, buttons, punctuation, tone-mark style, loanwords), the Microsoft Vietnamese style guide and the Ministry of Education's spelling rules.",
    notes: {
      glossary: [
        'Follow docs/translations/tr.md, ko.md and ja.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from shops\' and makers\' catalogues (the names printed on the bag), then from textbooks, university and vocational course pages and the term banks. Say which source each row rests on, with its link; mark rows with no Vietnamese source "No source" and rows for a native potter **Native check**.',
        'Style sheet: name the subsection "EU law" "Law in Vietnam" (and say how the English\'s EU names are written); add the subsections the existing language-specific pages carry (Script, spelling and spaces; Placeholders and names; Choices for the owner). Say which wording of "at most", "less than" and "at least" the law uses, and keep them apart.',
        'No rule may ask for figures the English lacks: no added SK or Orton equivalents, no converted units, no Buddhist-era or other-era years, no standard numbers where the English has none. The numbers check rejects every one.',
        'Cones: Orton cones are named Orton wherever the English says Orton; SK cones are SK with the number as printed where the English has them; Seger only where the English says Seger (the firing guide\'s older European cones), and the Seger formula (the unity molecular formula, UMF) never names a cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler", never higher or lower.',
        "Specific gravity is the language's relative-density word with the English's figure, never density in kg/m³ or a litre weight; Baumé as the sources write it. Say which word the Settings labels use.",
        'Plural forms: CLDR gives this language only `other`. Every plural message is written `{count, plural, other {…}}` with the classifier inside it; `=0` stays where the English has it. Give a classifier for each counted noun the app uses.',
        "Pitfalls to settle: glaze vs coating/paint/enamel/varnish; frit vs flux; kiln vs oven; bisque vs raw (unfired); earthenware, stoneware, porcelain; the material vs the oxide (silica vs silicon vs silicone); whiting vs lime; boron vs boric acid vs borax; soda and potash as oxides vs soda ash and potassium carbonate; respirator vs ventilator vs ventilation; the app's guides vs a kiln's manual: two different words.",
        'Two-step sign-in: add the table "2.10 Signing in" after the last one, with the words Google and Apple use on their own help pages in the language (link each): two-step sign-in, authenticator app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account, password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the English lacks.',
        'Register: "bạn" and standard Vietnamese, as the Microsoft Vietnamese style guide, Google and Apple write it; no quý khách, anh or chị, no sentence-final particles (nhé, ạ). Buttons are the bare verb or noun (Lưu, In, So sánh), requests use hãy or vui lòng; không for do not, tuyệt đối không for never; phải, nên, có thể and không được kept apart.',
        'Script: every Vietnamese text in NFC (precomposed letters), the new tone-mark style (hòa, khóa, thủy), syllables written apart, chemical names by the Vietnamese nomenclature (canxi cacbonat), oxit not ôxít; say which tone-mark style Google and Apple use and why this one is chosen.',
        'Numbers: decimal comma and thousands point (1,5; 12.500), four-digit temperatures ungrouped (1222 °C), 5% with no space, a range 10–60%; dates 14 tháng 10 năm 2026 (the check reads "tháng 10" as the English October, so the month is written as a number); times on the 24-hour clock (20:00 or 20 giờ on the hour, 20:30 with minutes, never 20 giờ 30 and never "8 giờ tối", which the check keeps whole and reports). A number the English writes as a word stays a word (hai lớp).',
        'Law terms: không quá, không vượt quá or tối đa for "at most"; dưới for "less than". Silica: giới hạn tiếp xúc, bụi hô hấp, silic tự do or silica tinh thể; the leach is thôi nhiễm.',
        'Specific gravity: tỷ trọng (relative density), never khối lượng riêng; guides.density.sg writes "tỷ trọng {value}". Whiting is canxi cacbonat, never vôi. "men" must be paired with gốm in titles (men alone is also yeast). A recipe is công thức men, a chemical formula công thức hóa học, the unity formula công thức Seger.',
        'Poison line: no public Vietnamese poison line is confirmed (Bạch Mai\'s Trung tâm Chống độc has a unit page only): where the English says "poison line", the Vietnamese text names the emergency number (115), as the region data will.'
      ],
      translate: [
        "Style sheet and glossary: docs/translations/vi.md. Every term as it gives it; where a row says Native check, use the row's choice and list the sentence in your flags for the reviewer.",
        'Cones: Orton cones are Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where the English says Seger; the Seger formula (UMF) is never a cone. Never give an SK number for an Orton number or the reverse, nor say they are equal. "One number hotter/cooler" as the style sheet gives it, never higher or lower.',
        'Numbers as the style sheet gives them: decimal mark, thousands, percent, units as the English writes them (1222 °C, 10 g), dates with the month named (or as its number where the style sheet says so), times on the 24-hour clock written as the style sheet says. Digits wherever the English has digits; a number the English writes as a word stays a word, since a digit would be a figure the English lacks.',
        'Plural forms: this language has only `other`; write `{count, plural, other {…}}` with the classifier the style sheet gives inside it, and keep `=0` where the English has it.',
        'Should, must and may as the style sheet gives them, kept apart; no emphasis word (never, always, absolutely) the English lacks; "must be tested" means the test is done, not passed.',
        'The food-contact text names Directive 84/500/EEC: it has no official text in this language, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        "Japanese names in the guides and region notes (the firing guide's) are Hepburn romanization with the English gloss, never Japanese script.",
        'Register: "bạn" (or no pronoun), bare-verb buttons, sentence case, no particles; NFC and the new tone-mark style; tỷ trọng (not khối lượng riêng) for specific gravity; dates "14 tháng 10 năm 2026" and times 20:00, 20:30 (never 20 giờ 30, never giờ tối).'
      ],
      review: [
        'Vietnamese: "at most", "no more than" and "up to" use the law\'s word for at most and never the word for "less than" or "under"; "at least" and "or more" never the word for "more than". A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Vietnamese: SK cones written "SK" as printed; Orton cones named Orton; Seger only where the English says Seger; the Seger formula never a cone; no SK number given for an Orton number or the reverse; "one number hotter/cooler", never higher or lower.',
        "Vietnamese: the numbers as the style sheet writes them; a number the English writes as a word stays a word; times on the 24-hour clock in the form the style sheet gives (the numbers check rejects 12-hour forms); specific gravity as the relative-density word with the English's figure.",
        'Vietnamese: should, must and may kept apart; no emphasis the English lacks; no should turned into must and no may dropped; plural messages with `other` only and the classifier inside it.',
        'Vietnamese: "bạn" throughout, no particles; every text in NFC with one tone-mark style; the decimal comma (1,5) and thousands point (12.500), 1222 °C unspaced; dates as "14 tháng 10 năm 2026" with the month as a number; times as 20:30 (never 8 giờ tối); tỷ trọng, never khối lượng riêng; men paired with gốm in titles; công thức men, công thức hóa học and công thức Seger kept apart.'
      ],
      backtranslate: [
        'The law\'s word for "at most" means "at most" (the limit itself passes); the word for "less than" means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        'Names of services and bodies stay in the language: compare what they refer to.',
        'không quá, không vượt quá and tối đa mean "at most"; dưới means "less than"; phải is "must", nên "should", có thể "may": translate each back exactly as it reads.'
      ]
    }
  },
  th: {
    language: 'Thai',
    country: 'Thailand',
    region: 'TH',
    shops:
      "lib/regions has no TH region yet (Phase C), and its research found no Thai shop with a price list it could read: look for Thailand's ceramics suppliers (Cerawan, Siam Ceramic Supply, Potteryclaythailand) and their category and product pages (น้ำเคลือบ, เคมีภัณฑ์ วัตถุดิบในงานเคลือบ, หินฟันม้า, ดินขาว, ควอตซ์, สีสะเตน, เตาเผา, โคน), and the catalogues of the makers whose materials and glazes they sell.",
    termbank:
      "the Royal Society's (Royal Institute's) dictionary and term lists (royin.go.th), the Thai industrial standards (TIS) for ceramics as the TISI catalogue names them, the Thai university ceramics departments' theses and course pages (Srinakharinwirot, Chiang Mai, Rajamangala), and the Thai Ceramic Society",
    kilns:
      "Thai kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Thailand (เตาเผาไฟฟ้า, เตาเผาแก๊ส), the shops' kiln pages, and the university pages; they give the words for kiln parts, controllers and firing steps (เผาดิบ, เผาเคลือบ, ออกซิเดชัน, รีดักชัน).",
    law: "Thai law as ratchakitcha.soc.go.th and the agencies write it: the Department of Labour Protection and Welfare's notification on ขีดจำกัดความเข้มข้นของสารเคมีอันตราย (2017: ซิลิกา คริสตัลลีน, the average over the normal working time), the Ministry of Public Health's notification No. 92 of 1985 on ceramic ware (ภาชนะแบบแบน, ภาชนะแบบลึก, ภาชนะหุงต้ม, ภาชนะบรรจุอาหารสำหรับทารก, ได้ไม่เกิน), the Industrial Works Department's GHS notification (คำสัญญาณ, ข้อความแสดงความเป็นอันตราย, เอกสารข้อมูลความปลอดภัย), the TIS for respirators as the TISI catalogue names them; the bodies: กรมสวัสดิการและคุ้มครองแรงงาน, กระทรวงสาธารณสุข, สำนักงานคณะกรรมการอาหารและยา (อย.), ศูนย์พิษวิทยารามาธิบดี (1367), the emergency numbers 191, 1669 and 199. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Thai text: write what Thai pages of อย. or the EU delegation call it, or describe it plainly with the number kept;",
    terms:
      "the term banks and teaching texts of Thai ({TERMBANK}); IATE has no Thai. For software conventions (register, buttons, punctuation, spaces, particles), the Microsoft Thai style guide and the Royal Society's spelling.",
    notes: {
      glossary: [
        'Follow docs/translations/tr.md, ko.md and ja.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from shops\' and makers\' catalogues (the names printed on the bag), then from textbooks, university and vocational course pages and the term banks. Say which source each row rests on, with its link; mark rows with no Thai source "No source" and rows for a native potter **Native check**.',
        'Style sheet: name the subsection "EU law" "Law in Thailand" (and say how the English\'s EU names are written); add the subsections the existing language-specific pages carry (Script, spelling and spaces; Placeholders and names; Choices for the owner). Say which wording of "at most", "less than" and "at least" the law uses, and keep them apart.',
        'No rule may ask for figures the English lacks: no added SK or Orton equivalents, no converted units, no Buddhist-era or other-era years, no standard numbers where the English has none. The numbers check rejects every one.',
        'Cones: Orton cones are named Orton wherever the English says Orton; SK cones are SK with the number as printed where the English has them; Seger only where the English says Seger (the firing guide\'s older European cones), and the Seger formula (the unity molecular formula, UMF) never names a cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler", never higher or lower.',
        "Specific gravity is the language's relative-density word with the English's figure, never density in kg/m³ or a litre weight; Baumé as the sources write it. Say which word the Settings labels use.",
        'Plural forms: CLDR gives this language only `other`. Every plural message is written `{count, plural, other {…}}` with the classifier inside it; `=0` stays where the English has it. Give a classifier for each counted noun the app uses.',
        "Pitfalls to settle: glaze vs coating/paint/enamel/varnish; frit vs flux; kiln vs oven; bisque vs raw (unfired); earthenware, stoneware, porcelain; the material vs the oxide (silica vs silicon vs silicone); whiting vs lime; boron vs boric acid vs borax; soda and potash as oxides vs soda ash and potassium carbonate; respirator vs ventilator vs ventilation; the app's guides vs a kiln's manual: two different words.",
        'Two-step sign-in: add the table "2.10 Signing in" after the last one, with the words Google and Apple use on their own help pages in the language (link each): two-step sign-in, authenticator app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account, password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the English lacks.',
        'Register: plain polite Thai with no sentence-final particles (no ครับ, ค่ะ, นะ), a gender-neutral voice; คุณ only where the sentence needs it, dropped elsewhere; กรุณา or โปรด in error text; buttons are the bare verb or noun (บันทึก, พิมพ์, เปรียบเทียบ); ต้อง, ควร, อาจ and ได้ kept apart; ห้าม for must not and do not, never "เด็ดขาด" the English lacks.',
        'Script and spaces: no spaces between Thai words; a space between phrases and sentences, no full stop at the end of a sentence; a space on both sides of Latin text and figures; no space between a Thai word and a placeholder that stands for a Thai name ({region}); no ๆ or ฯ; Western digits only, never Thai digits. Say how U+200B or <wbr> may be used for a loanword that breaks badly, and that none goes in by default.',
        'Numbers: Western digits, decimal point and thousands comma (1.5; 12,500), four-digit temperatures ungrouped (1222 °C), 5% with no space, a range 10–60%; dates 14 ตุลาคม ค.ศ. 2026, Gregorian with ค.ศ., never a Buddhist-era year (พ.ศ. 2569), which the English lacks; times on the 24-hour clock with a point and น. (20.00 น., 20.30 น., "08.00 น. ถึง 17.00 น." with น. repeated), never ตี, บ่าย or ทุ่ม with a figure. A number the English writes as a word stays a word (สองชั้น, ร้อนกว่าหนึ่งเบอร์).',
        'Law terms: ไม่เกิน or ได้ไม่เกิน for "at most"; น้อยกว่า for "less than"; ตั้งแต่ … ขึ้นไป for "at least". Silica: ซิลิกา คริสตัลลีน and ขีดจำกัดความเข้มข้น as the DLPW writes them; the food-contact text uses ภาชนะแบบแบน, ภาชนะแบบลึก and ภาชนะหุงต้ม.',
        'Specific gravity: ความถ่วงจำเพาะ (relative density), never ความหนาแน่น; guides.density.sg writes "ความถ่วงจำเพาะ {value}". Whiting is แคลเซียมคาร์บอเนต, never ปูนขาว or ดินสอพอง. "เคลือบ" must be paired with เซรามิก or สูตรเคลือบ in titles (เคลือบเซรามิก alone is a car coating). "ดิบ" (unfired) and "เผาดิบ" (bisque firing) are never taken for each other. A recipe is สูตรเคลือบ, a chemical formula สูตรเคมี, the unity formula สูตรเซเกอร์.',
        'Poison line: the Ramathibodi Poison Center, 1367, is confirmed and may be named (ศูนย์พิษวิทยารามาธิบดี); where the English says "poison line" without naming one, name 1367 as the region data will.'
      ],
      translate: [
        "Style sheet and glossary: docs/translations/th.md. Every term as it gives it; where a row says Native check, use the row's choice and list the sentence in your flags for the reviewer.",
        'Cones: Orton cones are Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where the English says Seger; the Seger formula (UMF) is never a cone. Never give an SK number for an Orton number or the reverse, nor say they are equal. "One number hotter/cooler" as the style sheet gives it, never higher or lower.',
        'Numbers as the style sheet gives them: decimal mark, thousands, percent, units as the English writes them (1222 °C, 10 g), dates with the month named (or as its number where the style sheet says so), times on the 24-hour clock written as the style sheet says. Digits wherever the English has digits; a number the English writes as a word stays a word, since a digit would be a figure the English lacks.',
        'Plural forms: this language has only `other`; write `{count, plural, other {…}}` with the classifier the style sheet gives inside it, and keep `=0` where the English has it.',
        'Should, must and may as the style sheet gives them, kept apart; no emphasis word (never, always, absolutely) the English lacks; "must be tested" means the test is done, not passed.',
        'The food-contact text names Directive 84/500/EEC: it has no official text in this language, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        "Japanese names in the guides and region notes (the firing guide's) are Hepburn romanization with the English gloss, never Japanese script.",
        'Register: no particles (ครับ, ค่ะ, นะ), คุณ only where needed, bare-verb buttons; no spaces inside words, a space between phrases and sentences, none at the end of a sentence, a space on both sides of Latin text and figures, none between a Thai word and {region}; Western digits only; no ๆ or ฯ.',
        'Dates "14 ตุลาคม ค.ศ. 2026" (never พ.ศ.); times "20.00 น." and "20.30 น." with น. after every hour; ความถ่วงจำเพาะ (not ความหนาแน่น) for specific gravity; no zero-width spaces unless the style sheet says a word needs one.'
      ],
      review: [
        'Thai: "at most", "no more than" and "up to" use the law\'s word for at most and never the word for "less than" or "under"; "at least" and "or more" never the word for "more than". A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Thai: SK cones written "SK" as printed; Orton cones named Orton; Seger only where the English says Seger; the Seger formula never a cone; no SK number given for an Orton number or the reverse; "one number hotter/cooler", never higher or lower.',
        "Thai: the numbers as the style sheet writes them; a number the English writes as a word stays a word; times on the 24-hour clock in the form the style sheet gives (the numbers check rejects 12-hour forms); specific gravity as the relative-density word with the English's figure.",
        'Thai: should, must and may kept apart; no emphasis the English lacks; no should turned into must and no may dropped; plural messages with `other` only and the classifier inside it.',
        'Thai: no particles (ครับ, ค่ะ, นะ); spaces only between phrases and sentences, none inside a word, a space on both sides of Latin text and figures; Western digits, never Thai digits; 1.5 with a point and 12,500 with a comma, 1222 °C unspaced; dates with ค.ศ. and never a Buddhist-era year; times as 20.00 น. with น. after each hour; ความถ่วงจำเพาะ, never ความหนาแน่น; เคลือบ paired with เซรามิก in titles; ดิบ and เผาดิบ kept apart.'
      ],
      backtranslate: [
        'The law\'s word for "at most" means "at most" (the limit itself passes); the word for "less than" means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation are translated back as strongly as they read: one the English lacks is a difference in meaning.',
        'Names of services and bodies stay in the language: compare what they refer to.',
        'ไม่เกิน and ได้ไม่เกิน mean "at most"; น้อยกว่า means "less than"; ต้อง is "must", ควร "should", อาจ "may", ห้าม "must not": translate each back exactly as it reads.'
      ]
    }
  },
  // The Indian subcontinent and Arabic's first two (README.md, "Indian subcontinent and Arabic,
  // Phase D"), each with the standard notice. Arabic is Modern Standard Arabic, one page for more
  // than 20 countries (Egypt's first), right to left, with all six plural forms, the Latin units
  // kept left to right, and impersonal forms where "you" would be masculine or feminine. Hindi is
  // India's, with आप and the studio potters' English loanwords first. Both write the digits 0 to 9:
  // the app gives each region its own digits and grouping when it formats a number.
  ar: {
    language: 'Arabic',
    // One Modern Standard Arabic page for more than 20 countries: Egypt first, then the United Arab
    // Emirates, Morocco and Algeria (the notes say so).
    country: 'the Arab countries',
    region: 'EG',
    shops:
      "lib/regions has no EG, AE, MA or DZ region yet (Phase C), and their research (scratch/round6/research/eg-ae-ma-dz.md in the main checkout) found no shop in Egypt, Morocco or Algeria whose own site shows raw glaze materials; in the UAE, Art Central Pottery (artcentralpottery.com, Abu Dhabi) sells US raw materials under their English names. Look for Arabic-language pottery and ceramics suppliers and their category and product pages (glaze materials, feldspar, kaolin, silica or quartz, frit, oxides, stains, kilns, cones), the Arabic product sheets and catalogues of the makers whose materials they sell, Egyptian and Gulf ceramics producers' pages, and Arabic pottery courses (the ceramics departments of Egypt's faculties of applied arts and fine arts, and of the Gulf's and the Maghreb's art schools), which give the words potters use.",
    termbank:
      "the unified dictionaries of ALECSO's Arabization Coordination Bureau (مكتب تنسيق التعريب, Rabat: chemistry, physics, geology and mineralogy, industrial safety, and any on ceramics and glass), the Arabic Language Academy in Cairo (مجمع اللغة العربية بالقاهرة) and its term lists, the Arabic texts of the Gulf standards (GSO) and of the Saudi Food and Drug Authority (SFDA), the Egyptian standards (ES, as the Egyptian Organization for Standardization's catalogue, eos.org.eg, names them), and Arabic Wikipedia's ceramics articles",
    kilns:
      "Arabic kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in Egypt, the Gulf and the Maghreb (Nabertherm's and other makers' Arabic pages and agents), the shops' kiln pages, and the faculties' course pages; they give the words for kiln parts, controllers and firing steps (the first or biscuit firing, the glaze firing, oxidation, reduction).",
    law: "the law and official texts in Arabic: Egypt's Labour Law 12 of 2003 and Ministerial Decree 211 of 2003 (occupational exposure limits; respirable dust and crystalline silica), the Egyptian standards ES 6528/2008 (respirable crystalline silica) and ES 7809-2/2022 (ceramic cookware: release of lead and cadmium) as eos.org.eg names them in Arabic, the Arabic texts of the Gulf standards (GSO ISO 6486-2, ceramic ware in contact with food) and of SFDA (the GHS: its signal words, hazard statements and safety data sheet), the UAE federal portal's Arabic pages (u.ae/ar), Algeria's Journal officiel in Arabic (joradp.dz: the joint order of 16 January 2019 on ceramic objects in contact with food); the bodies: Egypt's Ministry of Health and Population (وزارة الصحة والسكان) and its Ambulance Authority (123), the UAE's Ministry of Health and Prevention, Morocco's poison centre (Centre Anti Poison et de Pharmacovigilance du Maroc, CAPM, capm-sante.ma: its Arabic name as its own pages write it). Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Arabic text: write what the Arabic pages of the EU delegations or the Gulf standards call it, or describe it plainly with the number kept;",
    terms:
      'the term banks and teaching texts of Arabic ({TERMBANK}); IATE has no Arabic. For software conventions (register, buttons, punctuation, right-to-left text with Latin words and figures inside it, digits), the Microsoft Arabic style guide and the Arabic help pages of Google, Apple and Microsoft.',
    notes: {
      glossary: [
        "Follow docs/translations/th.md, vi.md, id.md, tr.md and ja.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from shops' and makers' catalogues (the names printed on the bag), then from Arabic ceramics textbooks, the faculties' course pages and Arabic Wikipedia, then from ALECSO's unified dictionaries. Say which source each row rests on, with its link; mark rows with no Arabic source \"No source\" and rows for a native potter **Native check**.",
        "One page in Modern Standard Arabic for every Arab country (more than 20; the regions come as Egypt, then the United Arab Emirates, Morocco and Algeria): no Egyptian, Gulf, Levantine or Maghrebi colloquial word, spelling or grammar (ى and ي, the hamzas and ة as the standard writes them). Where the Mashriq (Egypt, the Levant, Iraq, the Gulf) and the Maghreb (Morocco, Algeria, Tunisia, often from French) name a thing differently, choose the pan-Arab term, ALECSO's unified one where potters would understand it, and give the regional variants in the Notes. Where the pan-Arab sources disagree, Egypt's usage first: its pages are written first.",
        'Style sheet: name the subsection "EU law" "Law in the Arab countries" (Egypt\'s decrees and ES standards, the Gulf standards, Algeria\'s joint order, and how the English\'s EU names are written); under "Capitalisation" say that Arabic has none and how Latin words inside Arabic text are written. Add three subsections: "Script, direction and spaces" (right to left; Latin runs (°C, g, SiO2, Ferro 3134, Orton, addresses) stay as the English writes them and run left to right, which the app isolates; a figure and its unit stay together in the English\'s order; the Arabic comma ، semicolon ؛ and question mark ؟, the full stop as in English; no tatweel (ـ); short vowels only where a word would be misread, such as a passive; a space beside Latin text and figures as the English has it), "Numbers in the translation files" (below) and "Arabic and Markdown" (`**` and `*` around Arabic words, Latin punctuation and brackets kept outside the emphasis, and what direction a list item or paragraph that starts with a Latin word or a figure takes: start it with an Arabic word).',
        'Gender-neutral wording: Arabic marks gender in "you", in verbs and in adjectives, so the reader is never addressed by a masculine or feminine form where it can be avoided: impersonal and passive forms (يُنصح بـ, يجب, يمكن), verbal nouns (المصدر) for instructions, buttons and headings (حفظ, حذف, اختيار المادة), and a sentence about the recipe or the glaze rather than about the reader. Where "you" cannot be avoided, say which form (what Microsoft, Google and Apple Arabic do, from their pages), and never a slash form (ـكَ/ـكِ). Give examples of a button, an error, a notice and a guide sentence.',
        'Register: formal Modern Standard Arabic as Arabic software writes it (the Microsoft Arabic style guide, Google, Apple): buttons, menus and tabs as verbal nouns (حفظ, طباعة, مقارنة), headings as noun phrases, errors as short plain statements. Give the forms that keep "must" (يجب), "should" (يُنصح بـ, ينبغي) and "may" (قد with the present, as a hedge that must survive; يمكن for "can") apart, and that "must be tested" means the test is done, not passed; "some" (some fine quartz) is not "a little" (قليل).',
        "Numbers: the translation files write the digits 0 to 9 only, never Arabic-Indic (٠١٢٣) or Persian (۰۱۲۳) digits: the app writes each country's own digits when it formats a number (Arabic-Indic for Egypt and the Gulf, 0 to 9 for the UAE and the Maghreb), and the numbers check reads 0 to 9. The decimal point and thousands comma as the English writes them (1.5; 12,500; 1222 °C ungrouped), never the Arabic decimal separator ٫ or thousands separator ٬; 5% with the Latin percent sign, never ٪; units as the English's symbols, in Latin letters (10 g, 1222 °C, mg/m³), never Arabic abbreviations (غ, م°); inches and feet as the words بوصة and قدم with the metric figure in brackets as the English gives it. Where the English writes a number as a word (two coats, three tiles), it stays a word (طبقتان, ثلاث بلاطات), since a digit would be a figure the English lacks. Dates with the month named beside the year (14 أكتوبر 2026): give the month names CLDR's Arabic uses (يناير to ديسمبر) and the Levant's and the Maghreb's, and which the text uses; never a Hijri date. Times on the 24-hour clock (20:00), never ص or م (8 م), which the check would read as 8.",
        'Plural forms: Arabic has all six CLDR categories (cardinal): zero (0), one (1), two (2), few (3 to 10, and 103 to 110), many (11 to 99, and 111 to 199), other (100, 101, 102, fractions such as 1.5). Every plural message needs all six, even where it has `=0` (the check asks for them all), and `=0` stays where the English has it. Give each with a glaze word and the form the noun takes: the singular for one (مادة واحدة), the dual for two (مادتان, and مادتين after a preposition or as an object), the plural for few (# مواد), the singular in the accusative for many (# مادة), the singular in the genitive for other (# مادة). Say whether one and two keep `#` (Arabic says مادة واحدة and مادتان, without the figure; the check does not ask for `#`), and what zero reads.',
        'Cones: Orton cones are named Orton wherever the English says Orton (the trade name in Latin letters, beside the Arabic word for a pyrometric cone: give it from the sources, and say whether the shops write مخروط or another word); SK cones are SK with the number as printed; Seger only where the English says Seger (the firing guide\'s older European cones), and the Seger formula (the unity molecular formula, UMF; give its Arabic name and spelling of Seger from textbooks) never names a cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler", never higher or lower.',
        "Specific gravity is the relative-density word with the English's figure (a ratio without units), never density (الكثافة) in g/cm³ or a litre weight; say which of الكثافة النسبية, الوزن النوعي and الثقل النوعي the sources use and which the app uses (`guides.density.sg`, with the figure after it). Baumé as the sources write it (°Bé).",
        'Law terms, with the English they translate: "at most", "no more than" and "up to" (لا يزيد على, بحد أقصى?) never the words for "less than" or "under" (أقل من); "at least" and "or more" (لا يقل عن, على الأقل?) never "more than" (أكثر من); confirm each from the Egyptian decree, the ES and GSO standards and Algeria\'s joint order, and keep them apart. Respirable dust, crystalline silica, the 8-hour average, the release of lead and cadmium and silicosis in the words those texts use.',
        'Poison line: none is confirmed for Egypt, the UAE or Algeria (the region research); Morocco\'s CAPM is. Where the English says "poison line" without naming one, the text says the words for a poison line plainly, and the region data names the number.',
        'Two-step sign-in: add the table "2.10 Signing in" after the last one, with the words Google, Apple and Microsoft use on their own Arabic help pages (link each): two-step sign-in, authenticator app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account, password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the English lacks.',
        "Pitfalls to settle: glaze vs paint and coating (طلاء alone is paint), enamel (المينا) and varnish; frit vs flux; kiln vs oven (فرن is both: say how the kiln is kept apart); bisque firing vs raw (unfired) ware; earthenware, stoneware, porcelain (فخار, خزف and their Egyptian and Maghrebi senses); the material vs the oxide (silica vs silicon vs silicone, which Arabic may write alike); whiting (calcium carbonate) vs lime; boron vs borax vs boric acid; soda and potash as oxides vs soda ash and potassium carbonate; a respirator vs a ventilator vs ventilation; the app's guides vs a kiln's manual (دليل may be both: give two different words).",
        'No rule may ask for figures the English lacks: no Arabic-Indic digits, no Hijri years, no added SK or Orton equivalents, no converted units, no standard or decree numbers (ES, GSO) where the English has none. The numbers check rejects every one.'
      ],
      translate: [
        "Style sheet and glossary: docs/translations/ar.md. Every term as it gives it; where a row says Native check, use the row's choice and list the sentence in your flags for the reviewer.",
        'Modern Standard Arabic for every Arab country: no colloquial words, spellings or grammar; the pan-Arab terms the style sheet gives.',
        'Gender-neutral wording as the style sheet gives it: impersonal and passive forms and verbal nouns, never a masculine or feminine "you" where it can be avoided, never a slash form.',
        'Numbers: the digits 0 to 9 only, never Arabic-Indic (٠١٢) or Persian (۰۱۲) digits; 1.5 with a point and 12,500 with a comma as the English writes them, never ٫ or ٬; 5% with the Latin sign, never ٪; units in Latin letters as the English writes them (10 g, 1222 °C). A number the English writes as a word stays a word (طبقتان), since a digit would be a figure the English lacks. Dates with the month named beside the year, as the style sheet says; times on the 24-hour clock (20:00), never ص or م.',
        'Plural forms: all six (zero, one, two, few, many, other) in every plural message, with the noun in the form the style sheet gives for each; keep `=0` where the English has it.',
        'Latin runs (units, formulas such as SiO2, trade names, cone numbers, addresses) stay exactly as the English writes them; Arabic punctuation (، ؛ ؟) in Arabic text; no tatweel.',
        'Cones: Orton cones are Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where the English says Seger; the Seger formula (UMF) is never a cone. Never give an SK number for an Orton number or the reverse, nor say they are equal. "One number hotter/cooler" as the style sheet gives it, never higher or lower.',
        'Should, must and may as the style sheet gives them, kept apart (يُنصح بـ, يجب, قد); no emphasis word (دائماً, أبداً, إطلاقاً, حتماً) the English lacks; "must be tested" means the test is done, not passed.',
        'The food-contact text names Directive 84/500/EEC: it has no official Arabic text, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        "Japanese names in the guides and region notes (the firing guide's) are Hepburn romanization with the English gloss, never Japanese script."
      ],
      review: [
        'Arabic: "at most", "no more than" and "up to" use the law\'s words for at most and never the words for "less than" or "under"; "at least" and "or more" never "more than". A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Arabic: the digits 0 to 9 only (never ٠١٢ or ۰۱۲), 1.5 with a point, 5% with the Latin sign; units, formulas and trade names in Latin letters exactly as the English writes them; a number the English writes as a word stays a word; times on the 24-hour clock, never ص or م.',
        'Arabic: all six plural forms in every plural message, each with the noun in the right form (singular, dual, plural, accusative and genitive singular); Modern Standard Arabic, no colloquial words; no masculine or feminine "you" where an impersonal form or a verbal noun would do.',
        'Arabic: SK cones written "SK" as printed; Orton cones named Orton; Seger only where the English says Seger; the Seger formula never a cone; no SK number given for an Orton number or the reverse; "one number hotter/cooler", never higher or lower; specific gravity as the style sheet\'s relative-density word with the English\'s figure.',
        'Arabic: should, must and may kept apart; no emphasis the English lacks; no should turned into must and no may dropped.'
      ],
      backtranslate: [
        'The law\'s words for "at most" (لا يزيد على, بحد أقصى) mean "at most" (the limit itself passes); أقل من means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation are translated back as strongly as they read: one the English lacks is a difference in meaning. يجب is "must", يُنصح بـ and ينبغي "should", قد with the present "may".',
        'Names of services and bodies stay in Arabic: compare what they refer to.'
      ]
    }
  },
  hi: {
    language: 'Hindi',
    country: 'India',
    region: 'IN',
    shops:
      'lib/regions has no IN region yet (Phase C). Its research (scratch/round6/research/in-pk-bd.md in the main checkout) read three Indian shops, which sell in English: Bhoomi Pottery (in.bhoomi.com: its Artha Pottery raw materials, "Soda Feldspar 1 Kg", "China Clay Kaolin Calcined", Ferro frits, Orton cones), Clay Station (online.claystation.in, Bengaluru: "CS Potash Feldspar (G-325)", "CS China Clay (G)", "CS Whiting (G-200)", Ferro frits, Orton cones) and Sara (sarashop.in, Chennai: its glazes labelled by cone). Read their pages for the names on the bag; then look for Hindi pages of Indian studio potters and courses, the pottery clusters (Khurja, Delhi\'s Kumhar Gram), the Khadi and Village Industries Commission\'s and the Development Commissioner (Handicrafts)\'s Hindi pages on pottery, and CSIR-CGCRI\'s Khurja centre, to see which words Hindi-speaking potters use.',
    termbank:
      "the Commission for Scientific and Technical Terminology (CSTT, cstt.education.gov.in: its glossaries of chemistry, ceramics and glass, mineralogy and chemical engineering, and its definitional dictionaries), the NCERT Hindi chemistry textbooks (रसायन विज्ञान, classes 11 and 12, ncert.nic.in), and the Hindi titles of the Bureau of Indian Standards' standards (as BIS's catalogue gives them)",
    kilns:
      "Indian kiln makers' and dealers' catalogues and manuals for the electric and gas kilns sold to potters in India, the shops' kiln pages (Bhoomi, Clay Station), and the pottery courses' and KVIC's pages (its electric wheels and kilns for potters); they give the words for kiln parts, controllers and firing steps (bisque firing, glaze firing, oxidation, reduction) as Indian potters say them.",
    law: "Indian law in its Hindi texts (the Gazette of India, egazette.gov.in; India Code, indiacode.nic.in; the Legislative Department's Hindi versions): the Occupational Safety, Health and Working Conditions Code, 2020 (s.88 leaves exposure limits to each state; silicosis is a notifiable disease) and the Factories Act, 1948 it replaced, the Hindi titles of BIS's IS 9473 (filtering half masks: FFP1, FFP2, FFP3) and IS 9806 (toxic materials released from ceramic ware in contact with food), the Hazardous Chemicals rules and the GHS labels in Hindi where any (signal words, hazard statements, safety data sheet: say what you found); the bodies: the Ministry of Health and Family Welfare (स्वास्थ्य और परिवार कल्याण मंत्रालय), AIIMS's National Poisons Information Centre (NPIC, 1800 116 117), 112 (ERSS), the Directorate General Occupational Safety and Health (DGOSH), the Bureau of Indian Standards (भारतीय मानक ब्यूरो), each by its own Hindi name where its pages give one. Where the English names EU law (Directive 84/500/EEC, CLP), there is no official Hindi text: write what Indian official Hindi pages call it, or describe it plainly with the number kept;",
    terms:
      "the term banks and teaching texts of Hindi ({TERMBANK}); IATE has no Hindi. For software conventions (register, buttons, punctuation, nukta, anusvara and chandrabindu, loanword spelling), the Microsoft Hindi style guide, the Central Hindi Directorate's standard spelling (मानक हिंदी वर्तनी), and the Hindi help pages of Google, Apple and Microsoft.",
    notes: {
      glossary: [
        'Follow docs/translations/th.md, vi.md, id.md, tr.md and ja.md as well as fi.md and hr.md: they are the models for a language outside the EU. Terms come first from the shops\' and makers\' names (printed on the bag, in English), then from what Hindi-speaking potters and courses say, then from CSTT and NCERT. Say which source each row rests on, with its link; mark rows with no Hindi source "No source" and rows for a native potter **Native check**.',
        "The owner's choice: the studio potters' English loanwords first, in Devanagari as potters say them (ग्लेज़, फ्रिट and the like), with CSTT's term in brackets where it differs. Give both in each such row, say where the bracketed term appears (at a term's first use in each guide section, as `{{en: …}}` is used, and never in a button or a short label), and give the gender each loanword takes in potters' usage (the verb and का/की/के agree with it).",
        'Register: आप, with its verb forms (-इए, -ें), never तुम or तू; buttons, menus and tabs as Hindi software writes them (from the Microsoft Hindi style guide, Google and Apple: सहेजें, हटाएँ, रद्द करें?), headings as noun phrases. Hindi verbs show the subject\'s gender in many tenses: say how the text avoids guessing the reader\'s (the forms Hindi software uses with आप, or impersonal and passive forms). Give examples of a button, an error, a notice and a guide sentence. Keep "must" (ज़रूरी है, अनिवार्य?), "should" (चाहिए) and "may" (सकता है, as a hedge that must survive) apart, and say that "must be tested" means the test is done, not passed.',
        'Style sheet: name the subsection "EU law" "Law in India" (the Hindi texts of the Acts and BIS standards, and how the English\'s EU names are written); under "Capitalisation" say that Devanagari has none and how Latin words inside Hindi text are written. Add a subsection "Script and spelling" (Devanagari as the Central Hindi Directorate standardises it: the nukta in loanwords (ज़, फ़), anusvara and chandrabindu, the danda । at the end of a sentence, the comma and question mark as in English; Latin units, formulas and trade names kept as the English writes them).',
        "Numbers: the digits 0 to 9 (the international form of Indian numerals, Constitution Art. 343(1)), never Devanagari digits (०१२), which the numbers check does not read. The decimal point (1.5) and the English's figures as it writes them (12,500; 1222 °C ungrouped): the app groups numbers the Indian way (12,34,567.5) when it formats them, so the translations write only the English's figures, never लाख or करोड़ for one. 5% with no space; units as the English's symbols (10 g, 1222 °C); inches and feet as इंच and फ़ुट with the metric figure in brackets as the English gives it. Where the English writes a number as a word (two coats), it stays a word (दो परतें), since a digit would be a figure the English lacks. Dates 14 अक्टूबर 2026 (the month named beside the year), Gregorian, never a Vikram Samvat or Saka year. Times on the 24-hour clock (20:00), never सुबह, दोपहर, शाम or रात with a 12-hour figure (रात 8 बजे), which the check would read as 8.",
        "Plural forms: Hindi has `one` and `other` in CLDR (cardinal), and `one` covers 0 and 1 (and fractions below 1), so the `one` form must read right for 0 as well as 1. Every plural message has both, and `=0` stays where the English has it. Give each with a glaze word and the noun's plural (direct and oblique: सामग्री, सामग्रियाँ, सामग्रियों; परत, परतें), and how a loanword takes the plural (ग्लेज़, फ्रिट).",
        'Postpositions after placeholders: {name}, {region} and {count} take में, का/की/के, को and से after them unchanged, but का/की/के agree with the noun that follows; say how to build a sentence around each so it reads with any value ({region} में, रेसिपी {name}).',
        'Cones: Orton cones are named Orton wherever the English says Orton (the trade name in Latin letters, beside the potters\' word for a cone: कोन?); SK cones are SK with the number as printed; Seger only where the English says Seger (the firing guide\'s older European cones), and the Seger formula (the unity molecular formula, UMF) never names a cone. Never give an SK number for an Orton number or the reverse, nor any equivalence. Give the wording for "one number hotter/cooler", never higher or lower.',
        'Specific gravity is the relative-density word with the English\'s figure (a ratio without units), never density (घनत्व) in g/cm³ or a litre weight: say which of विशिष्ट गुरुत्व, आपेक्षिक घनत्व and the potters\' "SG" the sources use and which the app uses (`guides.density.sg`, with the figure after it). Baumé as the sources write it (°Bé).',
        'Law terms, with the English they translate: "at most", "no more than" and "up to" (अधिकतम, से अधिक नहीं?) never "less than" or "under" (से कम); "at least" (कम से कम) never "more than" (से अधिक); confirm each from the Hindi texts of the Acts and standards, and keep them apart. Respirable dust, crystalline silica and silicosis (सिलिकोसिस) in the words those texts use.',
        "Poison line: AIIMS's National Poisons Information Centre (1800 116 117, 24 hours, toll free) is verified (the region research): give its Hindi name from AIIMS's pages, and the words for a poison line.",
        'Two-step sign-in: add the table "2.10 Signing in" after the last one, with the words Google, Apple and Microsoft use on their own Hindi help pages (link each): two-step sign-in, authenticator app, setup key, QR code, passkey, recovery code, the code from the app, security key, sign in, sign out, account, password, trusted device. The English writes "two-step" as a word, so a digit 2 is a figure the English lacks.',
        "Pitfalls to settle: glaze vs enamel (मीनाकारी), varnish and paint; frit vs flux; kiln (भट्ठी, भट्टी, किल्न) vs oven; bisque firing vs raw (unfired) ware (कच्चा); earthenware, terracotta, stoneware and porcelain (चीनी मिट्टी may mean porcelain or china clay: keep them apart); the material vs the oxide (silica vs silicon vs silicone); whiting (calcium carbonate) vs lime (चूना) and chalk (खड़िया); boron vs borax (सुहागा) vs boric acid; soda and potash as oxides vs soda ash and potassium carbonate; a respirator vs a ventilator vs ventilation; the app's guides vs a kiln's manual: two different words.",
        'No rule may ask for figures the English lacks: no Devanagari digits, no लाख or करोड़, no Vikram Samvat or Saka years, no added SK or Orton equivalents, no converted units, no IS numbers where the English has none. The numbers check rejects every one.'
      ],
      translate: [
        "Style sheet and glossary: docs/translations/hi.md. Every term as it gives it; where a row says Native check, use the row's choice and list the sentence in your flags for the reviewer.",
        "आप and its verb forms; the potters' loanwords first, with CSTT's term in brackets only where the style sheet says; the reader's gender never guessed, as the style sheet says.",
        'A sentence ends with the Latin full stop "." (no space before it), never the danda "।": the owner\'s choice.',
        "Numbers: the digits 0 to 9 only, never Devanagari digits (०१२), लाख or करोड़; 1.5 with a point and the English's figures as it writes them; 5% and units as the English writes them (10 g, 1222 °C). A number the English writes as a word stays a word (दो परतें), since a digit would be a figure the English lacks. Dates 14 अक्टूबर 2026; times on the 24-hour clock (20:00), never सुबह, शाम or रात with a 12-hour figure.",
        'Plural forms: `one` and `other` in every plural message, `one` reading right for 0 as well as 1; keep `=0` where the English has it.',
        'Cones: Orton cones are Orton wherever the English says Orton; SK cones are SK with the number as printed; Seger only where the English says Seger; the Seger formula (UMF) is never a cone. Never give an SK number for an Orton number or the reverse, nor say they are equal. "One number hotter/cooler" as the style sheet gives it, never higher or lower.',
        'Should, must and may as the style sheet gives them, kept apart (चाहिए, ज़रूरी, सकता है); no emphasis word (हमेशा, कभी नहीं, बिल्कुल, ज़रूर) the English lacks; "must be tested" means the test is done, not passed.',
        'The food-contact text names Directive 84/500/EEC: it has no official Hindi text, so write the EU categories plainly, so that the 3 L still applies only to packaging and storage vessels.',
        "Japanese names in the guides and region notes (the firing guide's) are Hepburn romanization with the English gloss, never Japanese script."
      ],
      review: [
        'Hindi: "at most", "no more than" and "up to" use the law\'s words for at most (अधिकतम, से अधिक नहीं) and never "less than" or "under" (से कम); "at least" (कम से कम) never "more than". A slip here moves a legal limit. Check every one in the food-contact, silica and safety text.',
        'Hindi: the digits 0 to 9 only, never Devanagari digits, लाख or करोड़; units and figures as the English writes them; a number the English writes as a word stays a word; times on the 24-hour clock; `one` and `other` in every plural message, `one` reading right for 0.',
        "Hindi: आप throughout; the potters' loanwords and CSTT's bracketed terms as the style sheet gives them; no guess at the reader's gender; SK cones written \"SK\" as printed, Orton cones named Orton, no SK number given for an Orton number or the reverse; specific gravity as the style sheet's relative-density word with the English's figure.",
        'Hindi: should, must and may kept apart; no emphasis the English lacks; no should turned into must and no may dropped.',
        'Hindi: every sentence ends with the Latin full stop ".", never the danda "।" (the owner\'s choice).'
      ],
      backtranslate: [
        'अधिकतम and से अधिक नहीं mean "at most" (the limit itself passes); से कम means "less than" (it does not). Translate each back exactly as it reads: a limit that moved from one to the other is a difference in meaning.',
        'Words of emphasis and obligation are translated back as strongly as they read: one the English lacks is a difference in meaning. ज़रूरी and अनिवार्य are "must", चाहिए "should", सकता है "may".',
        'Names of services and bodies stay in Hindi: compare what they refer to.'
      ]
    }
  }
};

/** The glossary prompt's research lines for an EU language: kiln manuals, EU law, term banks. */
const EU_SOURCES = {
  KILNS: "kiln makers' manuals in {LANGUAGE} (Nabertherm publishes many languages; also Rohde, Uhlig);",
  LAW: 'the {LANGUAGE} texts of EU law on EUR-Lex: Regulation (EC) No 1272/2008 (CLP: hazard words, H-statements, "safety data sheet"), Directive 84/500/EEC (ceramic articles in contact with food: its name and its categories of articles, which the food-contact text must follow), Directive 2004/37/EC (carcinogens; respirable crystalline silica), and the national law on chemical agents at work and its silica limit;',
  TERMS:
    'IATE (iate.europa.eu) and the national term bank of {LANGUAGE} ({TERMBANK}), and the Microsoft {LANGUAGE} style guide for software conventions (register, buttons, punctuation, quotation marks).'
};

/** A language's research lines for the glossary prompt: its own, or the EU's. */
const sources = (code) => {
  const l = LANGUAGES[code];
  return { KILNS: l.kilns || EU_SOURCES.KILNS, LAW: l.law || EU_SOURCES.LAW, TERMS: l.terms || EU_SOURCES.TERMS };
};

/**
 * A language's own rules for one kind of prompt, as {NOTES}: nothing for most
 * languages. In a review prompt they join the list of rulings (item 9); in the
 * others they are a list of their own.
 */
const notes = (code, kind) => {
  const list = (LANGUAGES[code].notes || {})[kind] || [];
  if (!list.length) return '';
  if (kind === 'review') return list.map((note) => `\n   - ${note}`).join('');
  return `\n\nFor {LANGUAGE} in particular:\n\n${list.map((note) => `- ${note}`).join('\n')}`;
};

/** The language codes named on the command line, each one known here. */
const codes = (argv = process.argv.slice(2)) => {
  if (!argv.length) throw new Error('Which languages? For example: ga mt');
  for (const code of argv) {
    if (!LANGUAGES[code]) throw new Error(`${code}: add it to LANGUAGES in wave.js first.`);
  }
  return argv;
};

/** A template from this folder with its {PLACEHOLDERS} filled; fails if one is left. */
const fill = (name, values) => {
  let text = fs.readFileSync(path.join(HERE, name), 'utf8');
  const all = { REPO, BRANCH, SCRATCH: SCRATCH_WIN, ...values };
  // Twice: a value may name another ({LANGUAGE} in a language's notes).
  for (let pass = 0; pass < 2; pass++) {
    for (const [key, value] of Object.entries(all)) text = text.split(`{${key}}`).join(value);
  }
  const left = text.match(/\{[A-Z_]{3,}\}/);
  if (left) throw new Error(`${name}: ${left[0]} is not filled.`);
  return text;
};

/** Writes a file under the scratch folder, making its folder. */
const write = (relative, text) => {
  const file = SCRATCH + relative;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
};

/** chunks.md, filled, in the scratch folder: the translation parts and their files. Returns its Windows path. */
const chunks = () => {
  write('chunks.md', fill('chunks.md', {}));
  return SCRATCH_WIN + 'chunks.md';
};

module.exports = {
  ROOT,
  REPO,
  HERE,
  SCRATCH,
  SCRATCH_WIN,
  BRANCH,
  LANGUAGES,
  codes,
  fill,
  write,
  chunks,
  sources,
  notes
};
