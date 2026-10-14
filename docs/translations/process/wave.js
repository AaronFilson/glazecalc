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
