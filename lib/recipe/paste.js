'use strict';

// Paste-in import: recipes pasted as text or CSV, read into lines of a name
// and an amount, and each name found in the library. Nothing here saves
// anything: the app shows what was read and the person confirms it.
//
// What is read:
//   "Custer Feldspar 25", "EPK 20.5 %", "25 g Silica", "Whiting: 20",
//   "- Silica .... 30", "1. EPK 20", tab- or semicolon-separated columns, CSV
//   (quoted or not), decimal commas (by the reader's decimal mark), weights in
//   g, kg, lb and oz (as grams), and additions marked "+" or under a heading
//   such as "Add", "Additions" or "Colorants". A title is the first line that
//   is not a material; a line of text after the materials with materials
//   below it starts another recipe, as does a line of dashes, or a blank line
//   followed by a material the recipe already has. Totals, column headings,
//   firing notes and links are set aside, so they can be shown.

const { parseNumber, plainDigits, separators, withoutDirectionMarks } = require('./numbers');
const { GENERIC_NAMES } = require('./generic-names');
const { isFiringLine, readsDecimalComma } = require('../cones/firing');

/**
 * @typedef {import('./paste').PastedRecipe} PastedRecipe
 * @typedef {import('./paste').PastedUnit} PastedUnit
 */

/**
 * A line read as a material and its amount, before it joins a recipe (its
 * amount null for a name alone); in a table, marked as an addition, and the
 * recipe its row is in when there is a column for that.
 *
 * @typedef {{ name: string, value: number | null, unit: PastedUnit, addition?: boolean, recipe?: string, spaced?: string, joined?: string }} Item
 */

/**
 * The most a paste can be: characters, lines, and characters in a line that
 * can be a material (a longer line is text, so no pattern is run on it).
 */
const PASTE_LIMITS = { chars: 50000, lines: 2000, line: 300 };

/** Which limit a paste is over ('chars' or 'lines'), or null. */
function pasteTooLong(text) {
  const all = String(text ?? '');
  if (all.length > PASTE_LIMITS.chars) return 'chars';
  let lines = 1;
  for (let i = all.indexOf('\n'); i >= 0; i = all.indexOf('\n', i + 1)) lines++;
  return lines > PASTE_LIMITS.lines ? 'lines' : null;
}

// A number that could be a decimal or digit groups: "1,500" is 1.5 or 1500.
const AMBIGUOUS = /^[1-9]\d{0,2}[.,]\d{3}$/;

/**
 * How a paste writes its numbers, from all of them at once: a number with one
 * separator and other than three digits after it ("22,5", "0.500") is a
 * decimal in that mark; two kinds ("1.234,5") or a repeated one ("1,234,567")
 * say which mark groups. Nothing else is evidence.
 */
function decimalEvidence(text) {
  const seen = { comma: false, point: false };
  const tokens = String(text ?? '')
    .normalize('NFKC')
    .match(/(?<![\d.,])\d[\d.,]*\d(?![\d.,])/g);
  for (const token of tokens ?? []) {
    const commas = (token.match(/,/g) ?? []).length;
    const points = (token.match(/\./g) ?? []).length;
    if (commas && points) seen[token.lastIndexOf(',') > token.lastIndexOf('.') ? 'comma' : 'point'] = true;
    else if (commas > 1) seen.point = true;
    else if (points > 1) seen.comma = true;
    else if ((commas || points) && !AMBIGUOUS.test(token)) seen[commas ? 'comma' : 'point'] = true;
  }
  return seen;
}

/** Whether an ambiguous number, given the evidence, is decided: digit groups where the other mark is the decimal one. */
const groupedByEvidence = (token, seen) =>
  token.includes(',') ? seen.point && !seen.comma : seen.comma && !seen.point;

/**
 * The numbers of a paste that can be read two ways even after reading all of
 * them ("1,500" in a paste whose other numbers use decimal commas: 1.5 or
 * 1500), as pasted, each once, in order. Only for a reader whose mark is
 * 'either'; a chosen mark decides them. parsePaste reads them as the reader's
 * locale does unless told options.reading ('decimal' or 'group').
 */
function ambiguousNumbers(text, mark = 'either') {
  if (mark !== 'either') return [];
  const seen = decimalEvidence(text);
  const found = [];
  for (const token of String(text ?? '')
    .normalize('NFKC')
    .match(/(?<![\d.,])\d[\d.,]*\d(?![\d.,])/g) ?? []) {
    if (AMBIGUOUS.test(token) && !groupedByEvidence(token, seen) && !found.includes(token)) found.push(token);
  }
  return found;
}

/** Grams in each weight a line can be given in; the rest are proportions. */
const WEIGHTS = { g: 1, kg: 1000, lb: 453.59237, oz: 28.349523125 };

/** The words a unit can be written as, and what each is. */
const UNIT_WORDS = {
  '%': '%',
  '٪': '%',
  percent: '%',
  pct: '%',
  g: 'g',
  gr: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',
  gramm: 'g',
  gramos: 'g',
  grammes: 'g',
  kg: 'kg',
  lb: 'lb',
  lbs: 'lb',
  oz: 'oz',
  part: 'parts',
  parts: 'parts',
  pt: 'parts',
  pts: 'parts',
  teile: 'parts',
  parties: 'parts',
  partes: 'parts',
  parti: 'parts',
  delen: 'parts',
  // Chinese, Japanese and Korean: grams, kilograms and parts.
  克: 'g',
  公克: 'g',
  그램: 'g',
  公斤: 'kg',
  千克: 'kg',
  部: 'parts'
};
const UNIT =
  '(%|٪|percent|pct|公克|克|그램|公斤|千克|部|grams|gramm|gramos|grammes|gram|gms|gm|gr|g|kg|lbs|lb|oz|parts|part|pts|pt|teile|parties|partes|parti|delen)';

// A simple fraction or a mixed number ("1/2", "1 1/2"; ½ is written 1/2 first), with a slash or the fraction slash.
const FRACTION = '\\p{Nd}{1,2} \\p{Nd}{1,2}[/⁄]\\p{Nd}{1,2}|\\p{Nd}{1,2}[/⁄]\\p{Nd}{1,2}';
// A number as pasted: digits with points or commas in them, in any script, or a fraction.
const NUMBER = '(' + FRACTION + '|(?:\\p{Nd}[\\p{Nd}.,٫٬]*)|(?:[.,٫]\\p{Nd}+))';
// Between a name and its amount: spaces, a tab, a colon or equals sign, dot leaders, or a dash with spaces.
const GAP = '(?:\\s*(?:\\.{2,}|…+|[:=]|[-–—](?=\\s))\\s*|\\s+)';
const NAME_FIRST = new RegExp('^(.*?\\S)' + GAP + NUMBER + '\\s*' + UNIT + '?\\.?$', 'iu');
const NUMBER_FIRST = new RegExp(
  '^' + NUMBER + '\\s*(?:' + UNIT + '(?![\\p{L}\\p{Nd}]))?\\s*[-–—:x×]?\\s+(\\S.*)$',
  'iu'
);

/** The fractions Unicode writes as one character, as typed with a slash. */
const VULGAR = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅐': '1/7', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅑': '1/9', '⅒': '1/10' }; // prettier-ignore
const VULGAR_AFTER = /(\p{Nd})?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])/gu;
/** "1½" as "1 1/2", "½" as " 1/2": before NFKC, which writes ½ as 1⁄2 and so 1½ as 11⁄2. */
const withSlashes = (text) =>
  text.replace(VULGAR_AFTER, (all, whole, one) => (whole ? whole + ' ' : ' ') + VULGAR[one]);
// A fraction as a recipe writes one: a smaller number over 2 to 16, after a whole number or not. "30/80" or "2/75"
// in a name ("Molochite 30/80") is no amount, nor a date ("12/03").
const SIMPLE_FRACTION = /^(?:(\d{1,2}) )?(\d{1,2})[/⁄](\d{1,2})$/;
/** Whether a number over another is a fraction as a recipe writes one. */
const isFraction = (top, bottom) => top >= 1 && bottom >= 2 && bottom <= 16 && top < bottom;
/**
 * Whether a line has a fraction as a recipe writes one ("Bentonite 1/2 tsp", "¼"), so it is never another recipe's
 * title. "Shino 50/50" has none.
 */
const hasFraction = (text) =>
  /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/u.test(text) ||
  [...plainDigits(text).matchAll(/(?<![\d/⁄])(\d{1,2})\s*[/⁄]\s*(\d{1,2})(?![\d/⁄])/g)].some(([, top, bottom]) =>
    isFraction(Number(top), Number(bottom))
  );

/** An amount as pasted, a fraction ("1 1/2" is 1.5) or a number as options.read reads it; null for neither. */
function amountOf(token, options) {
  const fraction = plainDigits(token).match(SIMPLE_FRACTION);
  if (!fraction) return /[/⁄]/.test(token) ? null : options.read(token);
  const [whole, top, bottom] = fraction.slice(1).map((part) => Number(part ?? 0));
  return isFraction(top, bottom) ? whole + top / bottom : null;
}

/**
 * A function of text, remembered for each text it is given: matching a paste's names compares each with every
 * record's names, so a record's name is prepared once, not once a line. Forgotten in full past `size` texts.
 */
const remembered = (read, size = 20000) => {
  const known = new Map();
  return (text) => {
    const key = String(text ?? '');
    let value = known.get(key);
    if (value === undefined) {
      if (known.size >= size) known.clear();
      value = read(key);
      known.set(key, value);
    }
    return value;
  };
};

/** Text as names are compared: NFKC (full-width letters are plain ones), in lower case, spaces as one. */
const folded = remembered((text) =>
  String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
);

/**
 * Text with only its letters and digits, without accents, for a looser
 * comparison: "G-200" is "G200", "Feldspath" and "Feldspäth" are alike, and a
 * Turkish dotless ı is an i.
 */
const compact = remembered((text) =>
  folded(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{Nd}]/gu, '')
);

/** The words of a name as compared: letters and digits apart ("G200" is "g", "200"). */
const wordsOf = remembered((text) =>
  Object.freeze(
    folded(text)
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/ß/g, 'ss')
      .replace(/ı/g, 'i')
      .replace(/(\p{L})(?=\p{Nd})|(\p{Nd})(?=\p{L})/gu, '$1$2 ')
      .split(/[^\p{L}\p{Nd}]+/u)
      .filter((word) => word && !STOP_WORDS.has(word))
  )
);

// Words that say nothing about which material it is.
const STOP_WORDS = new Set(['the', 'of', 'and', 'mesh', 'm', 'x']);

/** A heading, as compared: without a colon, brackets or a percent sign at the end. */
const headingOf = (text) =>
  folded(text)
    // Arabic vowel marks and the stretching line are not part of the word ("الملوِّنات" is "الملونات").
    .replace(/[ً-ْٰـ]/g, '')
    // Urdu letters as the Arabic keyboard writes them (ی ے ى as ي, ک as ك, ہ as ه), so either spelling matches.
    .replace(/[یےى]/g, 'ي')
    .replace(/ک/g, 'ك')
    .replace(/ہ/g, 'ه')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[:%*#=_\-–—.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Headings over additions, in the languages the app is in or that potters paste from.
const ADD_HEADINGS = new Set(
  (
    '+|add|adds|add ins|add in|added|addition|additions|additive|additives|colorant|colorants|colourant|colourants|' +
    'color|colors|colour|colours|stain|stains|oxide|oxides|opacifier|opacifiers|extra|extras|plus|' +
    'zusatz|zusätze|zugabe|zugaben|ajout|ajouts|aggiunte|aggiunta|añadidos|adiciones|aditivos|adições|' +
    'toevoegingen|toevoeging|tillsatser|tilsætninger|tilsetninger|lisäaineet|lisäykset|dodatki|přísady|prísady|' +
    'adalékok|lisandid|priedai|piedevas|dodaci|dodatki|aditivi|πρόσθετα|добавки|aditivi|katkılar|ilaveler|' +
    '添加|添加物|添加剂|添加劑|外加|外加料|着色剂|著色劑|呈色剂|呈色劑|' +
    '追加|追加分|外割|添加剤|添加材|着色剤|첨가|첨가물|첨가제|추가|발색제|착색제|' +
    'สารเติมแต่ง|ส่วนที่เติมเพิ่ม|ส่วนเติม|เติมเพิ่ม|สารให้สี|' +
    'phụ gia|chất phụ gia|phần thêm|thêm|bổ sung|chất tạo màu|chất màu|' +
    'tambahan|bahan tambahan|aditif|bahan aditif|zat aditif|pewarna|zat pewarna|' +
    // Arabic (without vowel marks: headingOf drops them).
    'إضافات|الإضافات|إضافة|الإضافة|اضافات|ملونات|الملونات|مواد ملونة|المواد الملونة|ملون|أصباغ|الأصباغ|صبغات|الصبغات|' +
    'صبغة|أكاسيد|الأكاسيد|أكاسيد وملونات|الملونات والإضافات|' +
    // Hindi.
    'एडिटिव|एडिटिव्स|कलरेंट|कलरेंट्स|रंजक|स्टेन|ऑक्साइड|ऑक्साइड्स|अतिरिक्त सामग्री|अतिरिक्त|कलरेंट और एडिटिव|' +
    // Urdu.
    'اضافی مادہ|اضافی مادے|اضافی مواد|اضافہ|اضافے|اضافات|رنگ|رنگ دار آکسائیڈز|رنگ دار آکسائیڈ|رنگ دینے والا آکسائیڈ|' +
    'رنگ دینے والے آکسائیڈ|آکسائیڈ|آکسائیڈز|اسٹین|اسٹینز|رنگ دار آکسائیڈز اور اضافی مادے|اوپر سے شامل|' +
    // Bengali.
    'সংযোজন|রঞ্জক উপাদান|রঞ্জক|রং দেওয়ার অক্সাইড|অক্সাইড|সিরামিক স্টেইন|স্টেইন|উপরে যোগ|রঞ্জক উপাদান ও সংযোজন|' +
    // Tamil.
    'சேர்க்கை|சேர்க்கைகள்|சேர்க்கைப் பொருள்|சேர்க்கைப் பொருட்கள்|கலரன்ட்|கலரன்ட்கள்|ஸ்டெயின்|ஆக்சைடு|ஆக்சைடுகள்|' +
    'நிறமூட்டி|கலரன்ட்களும் சேர்க்கைப் பொருட்களும்|பேஸுக்கு மேல்|' +
    // Marathi.
    'ॲडिटिव्ह|कलरंट|रंगद्रव्य|रंगद्रव्ये|स्टेन|ऑक्साइड|भर|कलरंट आणि ॲडिटिव्ह|बेसच्या वर|' +
    // Kannada.
    'ಸೇರ್ಪಡೆ|ಸೇರ್ಪಡೆಗಳು|ಆಡಿಟಿವ್|ಆಡಿಟಿವುಗಳು|ಕಲರೆಂಟ್|ಕಲರೆಂಟುಗಳು|ಬಣ್ಣಕಾರಕ|ಸ್ಟೇನ್|ಆಕ್ಸೈಡ್|ಆಕ್ಸೈಡುಗಳು|' +
    'ಕಲರೆಂಟುಗಳು ಮತ್ತು ಆಡಿಟಿವುಗಳು|ಬೇಸಿನ ಮೇಲೆ'
  )
    .split('|')
    .map(headingOf)
);
const BASE_HEADINGS = new Set(
  (
    'base|base glaze|base recipe|glaze|recipe|ingredients|materials|batch|basis|grundglasur|grundrezept|rezept|' +
    'recette|base de l émail|ricetta|base|receta|recept|basisglazuur|resepti|przepis|receptura|alap|retsept|' +
    'базова|основа|taban|基础釉|基礎釉|基礎|기본 유약|基礎釉薬|' +
    // Arabic.
    'الأساس|أساس|الطلاء الأساسي|طلاء أساسي|الخلطة|خلطة|مواد الأساس|المواد|مواد|المادة|المكونات|مكونات|' +
    // Hindi.
    'बेस|बेस ग्लेज़|बेस रेसिपी|ग्लेज़|रेसिपी|सामग्री|बेस सामग्री|' +
    // Urdu.
    'بنیادی گلیز|بنیادی|بنیاد|ریسیپی|مواد|بنیادی مواد|اجزا|اجزاء|' +
    // Bengali.
    'মূল গ্লেজ|মূল উপাদান|বেস|বেস গ্লেজ|রেসিপি|উপাদান|' +
    // Tamil.
    'பேஸ்|பேஸ் கிளேஸ்|ரெசிபி|மூலப்பொருள்|மூலப்பொருட்கள்|பேஸ் மூலப்பொருட்கள்|' +
    // Marathi.
    'बेस ग्लेझ|साहित्य|बेस साहित्य|' +
    // Kannada.
    'ಬೇಸ್|ಬೇಸ್ ಗ್ಲೇಜ್|ರೆಸಿಪಿ|ಸಾಮಗ್ರಿ|ಸಾಮಗ್ರಿಗಳು|ಬೇಸ್ ಸಾಮಗ್ರಿಗಳು'
  )
    .split('|')
    .map(headingOf)
);
// Words of a column heading row: "Material, Amount", "Ingredient %".
const MATERIAL_COLUMNS = new Set(
  'material|materials|ingredient|ingredients|name|raw material|raw materials|rohstoff|rohstoffe|matière|matières|matière première|materiale|materia prima|materias primas|grondstof|grondstoffen|materiaal|råvara|surowiec|surovina|原料|원료'.split(
    '|'
  )
);
const AMOUNT_COLUMNS = new Set(
  '%|amount|amounts|percent|percentage|weight|parts|qty|quantity|batch|grams|g|menge|anteil|gewicht|teile|quantité|poids|pourcentage|quantità|peso|cantidad|porcentaje|hoeveelheid|gewicht|mängd|ilość|množství|量|配合|함량|비율'.split(
    '|'
  )
);
const RECIPE_COLUMNS = new Set(
  'recipe|glaze|recipe name|glaze name|title|rezept|glasur|recette|émail|ricetta|smalto|receta|esmalte|recept|glazuur|glasyr|釉|유약'.split(
    '|'
  )
);
const ADDITION_COLUMNS = new Set('addition|add|additive|type|role'.split('|'));

/** A total line: "Total 100", "Summe: 100,0". */
const TOTAL =
  /^(?:total|totals|sum|subtotal|grand total|gesamt|summe|insgesamt|totaal|totale|somme|suma|razem|celkem|spolu|yhteensä|i alt|totalt|összesen|kokku|iš viso|kopā|ukupno|skupaj|σύνολο|итого|общо|toplam|合计|合計|总计|總計|합계)(?![\p{L}\p{Nd}])/u;

/** A line about the firing or the glaze, not a material: "Cone 6", "^6", "SG 1.45", "1240 °C". */
const NOT_A_MATERIAL =
  /^(?:(?:\^|δ|△)\s*\p{Nd}|(?:cone|cones|kegel|seger|orton|sk|temp|temperature|firing|fired|atmosphere|oxidation|reduction|sg|s\.g\.|specific gravity|loi|coe|si:al|cost|price|source|notes?|glazy|digitalfire|brennen|brand|cuisson|cottura|cocción)(?![\p{L}\p{Nd}]))/u;

/** A line that only separates two recipes: dashes, equals signs, stars or underscores. */
const SEPARATOR = /^\s*(?:[-=*_~#]\s*){3,}$/;

/** "1. ", "2) ", "- ", "* ", "• " before a line. */
// A title that ends in a number ("Leach 4321"): words, then one whole number.
const TITLE_WITH_NUMBER = /^\p{L}[\p{L}\p{M}'’.\s-]*\s\p{Nd}+$/u;
const LIST_MARK = /^\s*(?:[-*•·◦▪‣]+\s+|\(?\d{1,2}[.)]\s+(?=\D))/u;

/**
 * A comma-separated row whose first cell is a name the library has that ends in a digit, with a digit after the
 * comma ("Ferro Frit 3134,20", "Ferro Frit 3134,20,5"), which cellsOf takes for one cell with a decimal comma in
 * it; or null. options.isName says what is a name.
 */
function namedRow(text, options) {
  if (/[\t;]/.test(text)) return null;
  for (const comma of text.matchAll(/(?<=\p{Nd}),(?=\p{Nd})/gu)) {
    const name = text.slice(0, comma.index).trim();
    if (options.isName(name)) {
      return {
        delimiter: ',',
        cells: [
          name,
          ...text
            .slice(comma.index + 1)
            .split(',')
            .map((cell) => cell.trim())
        ],
        text
      };
    }
  }
  return null;
}

/**
 * Cells of a delimited row: tab, semicolon or comma separated, with CSV's
 * quotes ("Feldspar, potash","25"), and the row as given. Null for a line with
 * no delimiter.
 */
function cellsOf(text) {
  // A comma between digits is a decimal comma ("25,5"), not a column.
  const commas = /,/.test(text.replace(/(?<=\p{Nd}),(?=\p{Nd})/gu, ''));
  const delimiter = text.includes('\t') ? '\t' : text.includes(';') ? ';' : commas ? ',' : null;
  if (!delimiter) return null;
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell.trim()) {
      quoted = true;
      cell = '';
    } else if (char === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  cells.push(cell.trim());
  return { delimiter, cells, text };
}

// An amount with its thousands set apart by a space ("1 500", "12 500"; NFKC makes a no-break, narrow no-break
// or thin space a plain one), at the end of a line ("Silica 1 500 g") or at its start ("1 500 g Silica").
const SPACED = '\\p{Nd}{1,3}(?: \\p{Nd}{3})+';
const SPACED_LAST = new RegExp('(?<=\\s)(' + SPACED + ')(?=(?:[.,٫]\\p{Nd}+)?\\s*' + UNIT + '?\\.?$)', 'iu');
const SPACED_FIRST = new RegExp(
  '^(' + SPACED + ')(?=(?:[.,٫]\\p{Nd}+)?\\s*(?:' + UNIT + '(?![\\p{L}\\p{Nd}]))?\\s*[-–—:x×]?\\s+\\p{L})',
  'iu'
);

/**
 * How a line whose amount may have its thousands set apart by a space ("Silica 1 500") is read until the reader
 * chooses: as one number ('group') where their language writes thousands so (French "1 500", Russian, Swedish:
 * Intl's group mark is a space), else with the first group the end of the name ('apart').
 */
const spacedReading = (locale = 'en') => (/^\s$/u.test(separators(locale).group) ? 'group' : 'apart');

/** A pasted number with its unit after it ("20,5 %", "250g"), or null. */
function amountCell(text, options) {
  const match = String(text)
    .normalize('NFKC')
    .trim()
    // A cell holds only its amount, so a space in it sets thousands apart ("1 500"), in any language.
    .replace(new RegExp('^' + SPACED + '(?!\\p{Nd})', 'u'), (all) => all.replace(/ /g, ''))
    .match(new RegExp('^' + NUMBER + '\\s*' + UNIT + '?\\.?$', 'iu'));
  if (!match) return null;
  const value = amountOf(match[1], options);
  if (value === null || value < 0) return null;
  return { value, unit: match[2] ? UNIT_WORDS[match[2].toLowerCase()] : null };
}

/** An amount in grams for a weight, or as it is; its unit as the import keeps it. */
function inUnits(amount) {
  if (amount.unit && WEIGHTS[amount.unit]) return { value: amount.value * WEIGHTS[amount.unit], unit: 'g' };
  return { value: amount.value, unit: amount.unit };
}

/** Whether a row of cells (or the words of a line) is a column heading row, and which column is which. */
function headingRow(cells) {
  const names = cells.map(headingOf);
  if (!names.some((name) => MATERIAL_COLUMNS.has(name) || AMOUNT_COLUMNS.has(name))) return null;
  const known = (name) =>
    !name ||
    MATERIAL_COLUMNS.has(name) ||
    AMOUNT_COLUMNS.has(name) ||
    RECIPE_COLUMNS.has(name) ||
    ADDITION_COLUMNS.has(name) ||
    /^(?:code|id|no|nr|#|notes?|comment|comments|oxide|analysis|cost|price|supplier)$/.test(name);
  if (!names.every(known)) return null;
  const find = (set) => names.findIndex((name) => set.has(name));
  return {
    material: find(MATERIAL_COLUMNS),
    amount: find(AMOUNT_COLUMNS),
    recipe: names.findIndex((name, i) => RECIPE_COLUMNS.has(name) && i !== find(MATERIAL_COLUMNS)),
    addition: find(ADDITION_COLUMNS),
    count: cells.length
  };
}

/**
 * A heading row known by its place, in any language: a delimited row of words, with no digit, over rows of the
 * same delimiter, written as it is, whose numbers are in the same columns, as a spreadsheet's are
 * ("Rohstoff,Menge,Preis" over "Kalifeldspat,30,2"). A row may have one cell more, a whole number after its
 * last, as a decimal comma makes it (rowItem asks). Its columns are the lists' words where it has them ("Menge"),
 * else the column of names and the first column of numbers after it. Null when it is not one.
 */
function placedHeading(row, below, options) {
  const count = row.cells.length;
  if (row.cells.some((cell) => /\p{Nd}/u.test(cell) || marksAddition(cell))) return null;
  // A comma and a space between words, over rows written without one ("Shino, carbon trap" over "Custer,40"): a title.
  const spacedAfter = (text) => text.includes(row.delimiter + ' ');
  if (spacedAfter(row.text) && !below.some((under) => spacedAfter(under.text))) return null;
  // The columns a row has numbers in, as text ("1,2"), or null when it has none or is not as wide as the heading.
  const numbersIn = ({ cells }) => {
    if (cells.length !== count && !(cells.length === count + 1 && /^\d+$/.test(cells[count]))) return null;
    return (
      cells
        .slice(0, count)
        .flatMap((cell, i) => (amountCell(cell, options) ? [i] : []))
        .join() || null
    );
  };
  const first = numbersIn(below[0]);
  if (!first || below.some((under) => numbersIn(under) !== first)) return null;
  const numbered = first.split(',').map(Number);
  const names = row.cells.map(headingOf);
  const find = (set) => names.findIndex((name) => set.has(name));
  const material =
    find(MATERIAL_COLUMNS) >= 0
      ? find(MATERIAL_COLUMNS)
      : below[0].cells.findIndex((cell, i) => !numbered.includes(i) && /\p{L}/u.test(cell));
  if (material < 0 || numbered.includes(material)) return null;
  return {
    material,
    amount: numbered.includes(find(AMOUNT_COLUMNS))
      ? find(AMOUNT_COLUMNS)
      : (numbered.find((i) => i > material) ?? numbered[0]),
    recipe: names.findIndex((name, i) => RECIPE_COLUMNS.has(name) && i !== material),
    addition: find(ADDITION_COLUMNS),
    count
  };
}

/** Whether a cell marks its row as an addition: "+", "add", "addition", "yes". */
const marksAddition = (cell) => /^(?:\+|add|addition|additive|yes)$/i.test(headingOf(cell) || cell.trim());

/**
 * A line of text as a material and an amount: "Custer Feldspar 25",
 * "EPK 20.5 %", "25 g Silica". Null when there is no amount at its end or start.
 * `at` is its line in the paste.
 */
function textItem(text, options, at) {
  let line = withSlashes(text)
    .normalize('NFKC')
    .trim()
    // A full stop after the amount, as at the end of a sentence ("Silica 30."): not part of the number.
    .replace(/(?<=\s\p{Nd}(?:[\p{Nd}.,٫٬]*\p{Nd})?)\.$/u, '')
    // A percent sign before the amount, as Turkish writes it ("Silica %20"): after it, as the rest of the paste is read.
    .replace(/(?<=\s)%\s?(\p{Nd}[\p{Nd}.,٫٬]*)$/u, '$1%');
  // Digit groups set apart by a space ("Silica 1 500 g", "1 500 g Silica"): one number, 1500, or the first group
  // the end of the name, "Silica 1" at 500. A name the library has that ends in the groups before the last
  // ("Minspar 200 300 g", "Mondré & Manz Frit V 15 098 980") is that name, and the last group its amount, with
  // nothing to ask. Any other such line keeps the amount as pasted (spaced), in every language, so the page asks,
  // and is read as the reader chose for it, else as their language writes thousands (options.spacedFor).
  const last = line.match(SPACED_LAST);
  const groups = last ?? line.match(SPACED_FIRST);
  let spaced = {};
  if (groups && !(last && options.isName(line.slice(0, last.index) + last[1].replace(/ \p{Nd}+$/u, '')))) {
    spaced = { spaced: groups[1] };
    if (options.spacedFor(at) === 'group') {
      line = line.slice(0, groups.index) + groups[1].replace(/ /g, '') + line.slice(groups.index + groups[1].length);
    }
  }
  const nameFirst = line.match(NAME_FIRST);
  const numberFirst = line.match(NUMBER_FIRST);
  const fromNumberFirst = () => {
    const value = amountOf(numberFirst[1], options);
    // "325 mesh silica": the 325 is the mesh, not an amount.
    if (
      value !== null &&
      value >= 0 &&
      /\p{L}/u.test(numberFirst[3]) &&
      !/^mesh(?![\p{L}\p{Nd}])/iu.test(numberFirst[3])
    ) {
      return {
        name: numberFirst[3].trim(),
        ...inUnits({ value, unit: numberFirst[2] ? UNIT_WORDS[numberFirst[2].toLowerCase()] : null }),
        ...spaced
      };
    }
    return null;
  };
  // A number at each end ("19 g Ferro Frit 3124", "30 Ferro Frit 3134"): the amount is the first where a unit
  // follows it, or where the name after it is one the library has and the name before the last is not.
  const amountFirst =
    nameFirst &&
    numberFirst &&
    (!!numberFirst[2] || (options.isName(numberFirst[3].trim()) && !options.isName(nameFirst[1].trim())));
  const first = amountFirst ? fromNumberFirst() : null;
  if (first) return first;
  // A known name that ends in a number before a fraction ("Tile 6 1/2"): that name, and the fraction its amount.
  const mixed = nameFirst?.[2].match(/^(\p{Nd}+) (\S+)$/u);
  const [named, token] =
    mixed && options.isName(nameFirst[1].trim() + ' ' + mixed[1])
      ? [nameFirst[1].trim() + ' ' + mixed[1], mixed[2]]
      : [nameFirst?.[1], nameFirst?.[2]];
  if (nameFirst) {
    const value = amountOf(token, options);
    if (value !== null && value >= 0 && /(?<![\p{L}\p{Nd}])mesh$/iu.test(named) && !/\p{Nd}/u.test(named)) {
      // "Silica mesh 200": the number is the mesh, part of the name, never the amount.
      return { name: line, value: null, unit: null };
    }
    if (value !== null && value >= 0) {
      // A column of grams before the percent ("Custer 250.0 25.0%"): the name stops before it.
      let name = named.trim();
      for (let more; !options.isName(name) && (more = name.match(/^(.*\S)\s+\p{Nd}+[.,]\p{Nd}+\s*(?:%|g)?$/u));) {
        name = more[1];
      }
      return {
        name,
        ...inUnits({ value, unit: nameFirst[3] ? UNIT_WORDS[nameFirst[3].toLowerCase()] : null }),
        ...spaced
      };
    }
  }
  const after = numberFirst && !amountFirst ? fromNumberFirst() : null;
  if (after) return after;
  // A mesh size with no amount ("Silica 200 mesh", "325 mesh silica"): a name alone.
  if (
    /\p{Nd}\s*mesh(?![\p{L}\p{Nd}])|(?<![\p{L}\p{Nd}])mesh\s*\p{Nd}/iu.test(line) &&
    /\p{L}/u.test(line.replace(/mesh/gi, ''))
  ) {
    return { name: line, value: null, unit: null };
  }
  return null;
}

/**
 * A delimited row as a material and an amount, by the heading row's columns
 * when there was one; otherwise the first cell of text is the name and the
 * first number after it the amount. Null when it has no name and amount.
 */
function rowItem(row, columns, options) {
  const cells = row.cells;
  // "+ Tin oxide" in a name's cell: an addition.
  const plus = (cell) => /^\+\s*/.test(cell.trim());
  const named = (cell) => cell.trim().replace(/^\+\s*/, '');
  const byColumns = columns && columns.material >= 0 && columns.amount >= 0;
  // Two whole numbers with only a comma between them in a comma-separated row ("EPK,20,5"), where the reader writes
  // commas for decimals: one number with a decimal comma (20.5), or two columns (20 and 5). With no heading row, the
  // last two cells of a row of three; under one, the amount's cell and the next, when the row has one cell more than
  // the heading ("Material,Amount" over "Silica,30,5"); a row as wide as its heading ("Material,Amount,Notes" over
  // "Silica,30,5") has each cell in its column. The line says so (joined), for the page to ask, and is read as
  // options.joined says, one number until the reader chooses. Never with a quote or a space beside that comma
  // ("EPK","20","5" or "EPK, 20, 5"), which a decimal comma never has.
  const at = !columns
    ? cells.length === 3
      ? 1
      : -1
    : byColumns && cells.length === columns.count + 1
      ? columns.amount
      : -1;
  const pair = at >= 0 ? cells[at] + ',' + cells[at + 1] : '';
  const joined =
    at >= 0 &&
    row.delimiter === ',' &&
    /^\d+$/.test(cells[at]) &&
    /^\d+$/.test(cells[at + 1] ?? '') &&
    (at + 2 === cells.length ? row.text.endsWith(pair) : row.text.includes(pair + ',')) &&
    (options.mark === 'comma' || (options.mark !== 'point' && options.decimal === ','))
      ? pair
      : null;
  // The number a decimal, as the page shows it, whatever the paste's other numbers say.
  const decimal = joined && options.joined === 'decimal' ? Number(joined.replace(',', '.')) : null;
  if (decimal !== null && !columns) {
    // The first cell the name, as in any row.
    const name = cells[0];
    if (!/\p{L}/u.test(name) || amountCell(name, options) || marksAddition(name)) return null;
    return { name: named(name), value: decimal, unit: null, addition: plus(name), joined };
  }
  if (byColumns) {
    // One number: the two cells as one, so each cell after them is in its column again.
    const by = decimal !== null ? [...cells.slice(0, at), joined, ...cells.slice(at + 2)] : cells;
    const cell = by[columns.material] ?? '';
    const name = named(cell);
    const amount = decimal !== null ? { value: decimal, unit: null } : amountCell(by[columns.amount] ?? '', options);
    if (!name || !amount || !/\p{L}/u.test(name)) return null;
    return {
      name,
      ...inUnits(amount),
      recipe: columns.recipe >= 0 ? (by[columns.recipe] ?? '').trim() : '',
      addition: plus(cell) || (columns.addition >= 0 && marksAddition(by[columns.addition] ?? '')),
      ...(joined && { joined })
    };
  }
  const nameAt = cells.findIndex((cell) => /\p{L}/u.test(cell) && !amountCell(cell, options) && !marksAddition(cell));
  if (nameAt < 0) return null;
  let amountAt = cells.findIndex((cell, i) => i > nameAt && amountCell(cell, options));
  if (amountAt < 0) amountAt = cells.findIndex((cell) => amountCell(cell, options));
  if (amountAt < 0) return null;
  const others = cells.filter((cell, i) => i !== nameAt && i !== amountAt);
  return {
    name: named(cells[nameAt]),
    ...inUnits(amountCell(cells[amountAt], options)),
    addition: plus(cells[nameAt]) || others.some(marksAddition),
    ...(joined && { joined })
  };
}

/**
 * Recipes read from pasted text, each with its title (or null), its notes
 * (lines of text that are not materials), its lines, and what was set aside.
 *
 * options.mark and options.locale say how the reader writes numbers (see
 * numbers.js). options.isName(text) may say whether text is a material's
 * whole name, so "Frit 3134" alone is a material with no amount rather than
 * "Frit" at 3134. options.known(text) may say whether a name is like any
 * material at all (even only closely), so it is never read as a title.
 */
function parsePaste(text, options = {}) {
  const settings = {
    mark: options.mark ?? 'either',
    locale: options.locale ?? 'en',
    isName: options.isName ?? (() => false),
    known: options.known ?? (() => false)
  };
  // One decision for the whole paste: a number that could be a decimal or digit groups is read by what the
  // rest of the paste writes, else as chosen (options.reading), else as the reader's locale does.
  const seen = decimalEvidence(text);
  settings.read = (token) => {
    if (settings.mark === 'either' && AMBIGUOUS.test(token.trim())) {
      const sep = token.includes(',') ? ',' : '.';
      if (groupedByEvidence(token, seen) || options.reading === 'group') return Number(token.trim().replace(sep, ''));
      if (options.reading === 'decimal') return Number(token.trim().replace(sep, '.'));
    }
    return parseNumber(token, settings.mark, settings.locale);
  };
  settings.decimal = new Intl.NumberFormat(settings.locale).formatToParts(1.5).find((p) => p.type === 'decimal')?.value;
  // Thousands set apart by a space ("1 500"): each such line read as the reader chose, for the paste or for that
  // line (options.spaced), else as their language writes thousands (spacedReading).
  const spacedAs = spacedReading(settings.locale);
  settings.spacedFor = (line) => {
    const chosen = options.spaced && typeof options.spaced === 'object' ? options.spaced[line] : options.spaced;
    return chosen === 'group' || chosen === 'apart' ? chosen : spacedAs;
  };
  // A comma-separated row whose amount can be one number with a decimal comma or two columns ("EPK,20,5"): one
  // number, as before, unless the reader chose two columns; each such line says so.
  settings.joined = options.joined === 'columns' ? 'columns' : 'decimal';
  settings.decimalComma = readsDecimalComma(settings.mark, settings.locale);
  // Past the limits nothing is read: the app says so (pasteTooLong), and a caller that does not still cannot be slowed.
  if (pasteTooLong(text)) return [];
  const rows = String(text ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/);

  const recipes = [];
  // Typed, as it is set in start() as well as here: the loop below would otherwise read it as only ever null.
  /** @type {PastedRecipe | null} */
  let recipe = null;
  let inAdditions = false;
  // Whether the additions section has had a line yet: a blank line before one is part of the heading's gap.
  let additionsStarted = false;
  let columns = null;
  let afterBlank = false;
  const start = (title) => {
    recipe = { title: title || null, notes: [], lines: [], skipped: [] };
    recipes.push(recipe);
    inAdditions = false;
    additionsStarted = false;
    return recipe;
  };
  const current = () => recipe ?? start(null);

  // What each line is, read once: the next material decides what a line of text before it is.
  const read = rows.map((raw, index) => classify(raw, index));
  // A heading row known by its place (placedHeading), in any language: a row of words that starts its rows.
  for (let i = 0; i < read.length; i++) {
    const { kind, delimited } = read[i];
    if (kind !== 'text' || !delimited || read[i - 1]?.kind === 'item') continue;
    const below = [];
    for (let j = i + 1; read[j]?.kind === 'item' && read[j].delimited?.delimiter === delimited.delimiter; j++) {
      below.push(read[j].delimited);
    }
    const columns = below.length ? placedHeading(delimited, below, settings) : null;
    if (columns) read[i] = { kind: 'columns', line: read[i].line, text: read[i].text, columns };
  }
  function classify(raw, index) {
    const line = index + 1;
    const text = raw.trimEnd();
    // Read without the marks that keep a number's direction in Arabic text ("19.5‎%‎", "١٩٫٥٪؜"): not seen, and
    // in the way of every pattern. The line is kept as pasted.
    const trimmed = withoutDirectionMarks(text).trim();
    if (!trimmed) return { kind: 'blank', line, text };
    if (SEPARATOR.test(trimmed)) return { kind: 'separator', line, text };
    // Too long to be a material: set aside as text before any pattern runs on it.
    if (trimmed.length > PASTE_LIMITS.line) return { kind: 'text', line, text };
    // A known name before a comma and its amount ("Ferro Frit 3134,20"): the comma ends the name, though there is a
    // digit each side of it.
    const row = namedRow(trimmed, settings) ?? cellsOf(trimmed);
    const delimited = row && row.cells.filter(Boolean).length > 1 ? row : null;
    const heading = delimited
      ? headingRow(delimited.cells)
      : (headingRow([trimmed]) ?? headingRow(trimmed.split(/\s{2,}/)) ?? headingRow(trimmed.split(/\s+/)));
    if (heading && !/\p{Nd}/u.test(trimmed.replace(/%/g, ''))) return { kind: 'columns', line, text, columns: heading };
    const head = headingOf(trimmed);
    if (ADD_HEADINGS.has(head)) return { kind: 'add', line, text };
    if (BASE_HEADINGS.has(head)) return { kind: 'base', line, text };
    if (/:\/\//.test(trimmed)) return { kind: 'text', line, text };

    let body = trimmed.replace(LIST_MARK, '');
    let addition = false;
    const plus = body.match(/^\+\s*(.*)$/) ?? body.match(/^(?:add|additions?)\s*:\s*(.+)$/i);
    if (plus && plus[1]) {
      body = plus[1];
      addition = true;
    }
    if (TOTAL.test(folded(body))) return { kind: 'total', line, text };
    // Nothing but a firing, clearly ("Cone 6", "C/6", "^6", "6½ ox", "ox/red"): a note of the recipe it is in,
    // read into its firing on import. A number alone ("06", "5.5") stays what it was, a total set aside.
    if (isFiringLine(body, { decimalComma: settings.decimalComma })) return { kind: 'firing', line, text };
    if (NOT_A_MATERIAL.test(folded(body)) || /°\s*[cf]\b|\d\s*°/i.test(body)) return { kind: 'text', line, text };

    /** @type {Item | null} */
    let item = null;
    if (delimited) item = rowItem(delimited, null, settings);
    if (!item && settings.isName(body)) item = { name: body, value: null, unit: null };
    if (!item) item = textItem(body, settings, line);
    if (!item) {
      if (amountCell(body.replace(/^[^\p{L}\p{Nd}]+/u, ''), settings)) return { kind: 'total', line, text };
      // A fraction that is not an amount ("Bentonite 1/2 tsp"): never another recipe's title.
      return { kind: 'text', line, text, delimited, fraction: hasFraction(body) };
    }
    if (TOTAL.test(folded(item.name)) || NOT_A_MATERIAL.test(folded(item.name))) {
      return { kind: TOTAL.test(folded(item.name)) ? 'total' : 'text', line, text };
    }
    return { kind: 'item', line, text, item: { ...item, addition: addition || !!item.addition }, delimited };
  }

  const nextItem = (from) => {
    for (let i = from; i < read.length; i++) {
      if (read[i].kind === 'item') return read[i];
      if (!['blank', 'add', 'base', 'firing'].includes(read[i].kind)) return null;
    }
    return null;
  };

  /**
   * Whether an item that opens a block is the recipe's title, read as a name and an amount: words and one
   * whole number ("Leach 4321"), no unit, a name like no material, with at least two base materials
   * under it whose amounts together are less than its number. A first material not in the library
   * ("Hawthorn Bond 40" over 60 more) stays a material.
   */
  const titleItem = (entry, i) => {
    const { item } = entry;
    if (entry.delimited || item.addition || item.unit || inAdditions) return false;
    if (!Number.isInteger(item.value) || !TITLE_WITH_NUMBER.test(entry.text.trim())) return false;
    if (settings.isName(item.name) || settings.known(item.name)) return false;
    let total = 0;
    let count = 0;
    for (let j = i + 1; j < read.length && read[j].kind === 'item'; j++) {
      const next = read[j].item;
      if (next.addition) break;
      if (next.value === null) return false;
      total += next.value;
      count++;
    }
    return count >= 2 && item.value > total;
  };

  for (let i = 0; i < read.length; i++) {
    const entry = read[i];
    switch (entry.kind) {
      case 'blank':
        afterBlank = true;
        // A blank line ends a section of additions that has had lines: what follows is the base again.
        if (inAdditions && additionsStarted) inAdditions = false;
        continue;
      case 'separator':
        if (recipe && (recipe.lines.length || recipe.title)) recipe = null;
        columns = null;
        break;
      case 'columns':
        columns = entry.columns;
        current().skipped.push({ line: entry.line, text: entry.text, why: 'columns' });
        break;
      case 'add':
        current();
        inAdditions = true;
        additionsStarted = false;
        break;
      case 'base':
        current();
        inAdditions = false;
        break;
      case 'total':
        current().skipped.push({ line: entry.line, text: entry.text, why: 'total' });
        break;
      case 'firing': {
        // A firing is the current recipe's, its title when it has nothing yet. It starts a recipe only as a
        // title set off by a blank line with materials straight under it ("…\n\nCone 6 Wood\nCuster 60"),
        // never inside one ("Whiting 20\nCone 6\nAdd:\nTin 2").
        const next = read.slice(i + 1).find((e) => e.kind !== 'blank');
        if (!recipe || (!recipe.lines.length && !recipe.title)) current().title = entry.text.trim();
        else if (afterBlank && recipe.lines.length && next?.kind === 'item') start(entry.text.trim());
        else recipe.notes.push(entry.text.trim());
        break;
      }
      case 'text': {
        const has = recipe && recipe.lines.length;
        if (has && !entry.fraction && nextItem(i + 1)) start(entry.text.trim());
        else if (!recipe || (!recipe.lines.length && !recipe.title)) current().title = entry.text.trim();
        else current().notes.push(entry.text.trim());
        break;
      }
      case 'item': {
        const opens = !recipe || (!recipe.lines.length && !recipe.title);
        if ((opens || (afterBlank && recipe.lines.length)) && titleItem(entry, i)) {
          if (opens) current().title = entry.text.trim();
          else start(entry.text.trim());
          break;
        }
        let item = entry.item;
        if (columns && entry.delimited) item = rowItem(entry.delimited, columns, settings) ?? item;
        if (item.recipe && (!recipe || recipe.title !== item.recipe)) start(item.recipe);
        else if (
          afterBlank &&
          recipe &&
          !inAdditions &&
          recipe.lines.some((l) => folded(l.name) === folded(item.name))
        ) {
          start(null);
        }
        if (inAdditions) additionsStarted = true;
        current().lines.push({
          line: entry.line,
          text: entry.text.trim(),
          name: item.name,
          amount: item.value,
          unit: item.unit,
          addition: inAdditions || !!item.addition,
          ...(item.spaced && { spaced: item.spaced }),
          ...(item.joined && { joined: item.joined })
        });
        break;
      }
    }
    afterBlank = false;
  }
  return recipes.filter((r) => r.lines.length || r.title);
}

/** Whether amounts add up to about 100, as a recipe in percent does. */
const aboutHundred = (total) => Math.abs(total - 100) <= 0.5;

/**
 * The amounts of a read recipe as the app keeps them: base materials as
 * plain numbers ("20.5"), weights in grams; and each addition's unit, a
 * percent of the base when it says so or when the base adds up to 100,
 * grams when it was weighed, and otherwise parts in the base's unit.
 */
function importAmounts(recipe) {
  const base = recipe.lines.filter((line) => !line.addition && line.amount !== null);
  const baseTotal = base.reduce((sum, line) => sum + line.amount, 0);
  const percentBase = aboutHundred(baseTotal);
  const plain = (value) => (value === null ? '' : String(Number(value.toFixed(5))));
  return recipe.lines.map((line) => {
    if (!line.addition) return { amount: plain(line.amount) };
    const unit =
      line.unit === '%' || (line.unit !== 'g' && percentBase) ? 'percent' : line.unit === 'g' ? 'grams' : 'parts';
    return { amount: plain(line.amount), unit };
  });
}

/**
 * The record a pasted name means, found in the order given (a potter's own
 * records first, as findNamed does):
 *   name     the record's name, whatever its case, width or punctuation
 *   alias    one of its other names
 *   close    the one record whose name is close enough to take as meant
 *   choose   several are close and none stands out, or the name is a generic
 *            word (generic-names.js): the person chooses
 *   none     nothing is close
 * With the record taken (none for choose and none), and the closest records,
 * best first, to choose from (up to `limit`).
 */
function matchName(name, records, limit = 5) {
  const wanted = folded(name);
  const loose = compact(name);
  const query = prepared(name);
  const result = (how, record, candidates) => ({ how, record: record ?? null, candidates: candidates ?? [] });
  if (!loose) return result('none');

  const byName = records.find((record) => folded(record.name) === wanted);
  if (byName) return result('name', byName, [byName]);
  const byAlias = records.find((record) => (record.aliases ?? []).some((alias) => folded(alias) === wanted));
  if (byAlias) return result('alias', byAlias, [byAlias]);

  // Alike but for punctuation, spaces or accents: "G200", "Nepheline-Syenite".
  const looseName = records.filter((record) => compact(record.name) === loose);
  const looseAlias = records.filter(
    (record) => !looseName.includes(record) && (record.aliases ?? []).some((alias) => compact(alias) === loose)
  );
  const loosely = [...looseName, ...looseAlias];
  if (loosely.length === 1 || (looseName.length === 1 && loosely.length > 1)) {
    return result(looseName.length ? 'name' : 'alias', loosely[0], [loosely[0]]);
  }
  if (loosely.length > 1) return result('choose', null, loosely.slice(0, limit));

  // A mesh size ("Silica 200 mesh") is a regional product's name or none of them: never taken silently.
  if (/(?<![\p{L}\p{Nd}])mesh(?![\p{L}\p{Nd}])|\p{Nd}\s*#/iu.test(wanted)) {
    const near = records
      .map((record) => ({
        record,
        score: Math.max(...[record.name, ...(record.aliases ?? [])].map((n) => likenessOf(query, prepared(n))))
      }))
      .filter((entry) => entry.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.record);
    return near.length ? result('choose', null, near) : result('none');
  }

  const generic = genericCandidates(loose, records, limit);
  // Two or more of the table's: those. Just one (the records have few): it, then the close ones.
  if (generic.length > 1) return result('choose', null, generic);

  const scored = records
    .map((record) => ({
      record,
      score: Math.max(...[record.name, ...(record.aliases ?? [])].map((n) => likenessOf(query, prepared(n))))
    }))
    .filter((entry) => entry.score >= 0.45)
    .sort((a, b) => b.score - a.score);
  if (generic.length) {
    const more = scored.map((entry) => entry.record).filter((record) => record !== generic[0]);
    return result('choose', null, [...generic, ...more].slice(0, limit));
  }
  const candidates = scored.slice(0, limit).map((entry) => entry.record);
  if (!scored.length) return result('none');
  // Several names have every word of this one and differ only by a qualifier ("Nickel oxide, green" and
  // ", black"): none is the one meant.
  const queryWords = wordsOf(name);
  const containing = scored.filter((entry) => {
    const words = wordsOf(entry.record.name);
    return queryWords.every((word) => words.includes(word));
  });
  if (containing.length > 1) {
    const rest = candidates.filter((record) => !containing.some((entry) => entry.record === record));
    return result('choose', null, [...containing.map((entry) => entry.record), ...rest].slice(0, limit));
  }
  const [best, second] = scored;
  if (best.score >= 0.6 && (!second || best.score - second.score >= 0.1))
    return result('close', best.record, candidates);
  return result('choose', null, candidates);
}

/** A generic word's table, by the word as compared (letters and digits only). */
const GENERIC_BY_WORD = new Map(GENERIC_NAMES.flatMap((entry) => entry.words.map((word) => [compact(word), entry])));

/**
 * The records to offer for a generic word ("Kaolin", "Zircopax"), the table's
 * most common first, then any other close ones to fill up to `limit`; none
 * when the name is not a generic word or the records have none of its list.
 */
function genericCandidates(loose, records, limit) {
  const entry = GENERIC_BY_WORD.get(loose);
  if (!entry) return [];
  const offered = [];
  for (const wanted of entry.offer.map(folded)) {
    const record = records.find((r) => folded(r.name) === wanted);
    if (record && !offered.includes(record)) offered.push(record);
  }
  return offered.slice(0, limit);
}

/**
 * How well two words match: 1 the same, 0.75 when one starts the other ("carb",
 * "carbonate") or long ones are a letter apart ("nephaline"), 0 otherwise.
 * Numbers match only themselves.
 */
function wordMatch(a, b) {
  if (a === b) return 1;
  if (hasDigit(a) || hasDigit(b)) return 0;
  if (a.length >= 2 && b.startsWith(a)) return 0.75;
  if (b.length >= 3 && a.startsWith(b)) return 0.75;
  return a.length >= 5 && b.length >= 5 && oneApart(a, b) ? 0.75 : 0;
}

/** Whether a word has a digit in it. */
const DIGIT = /\p{Nd}/u;
const hasDigit = (word) => DIGIT.test(word);

/** Whether one letter changed, added or taken out turns one word into the other. */
function oneApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** The pairs of letters of a string, each with how many times it has it. */
const pairsIn = remembered((text) => {
  const pairs = new Map();
  for (let i = 0; i < text.length - 1; i++) pairs.set(text.slice(i, i + 2), (pairs.get(text.slice(i, i + 2)) ?? 0) + 1);
  return pairs;
});

/** How alike the letters of two strings are, 0 to 1: shared pairs of letters (Dice's coefficient). */
function pairsAlike(a, b) {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const [mine, theirs] = [pairsIn(a), pairsIn(b)];
  let shared = 0;
  theirs.forEach((count, pair) => (shared += Math.min(count, mine.get(pair) ?? 0)));
  return (2 * shared) / (a.length + b.length - 2);
}

/**
 * How close a pasted name is to a record's name, 0 to 1: mostly how many of
 * the pasted words the name has, then how much of the name they cover, then
 * how alike the letters are. Numbers must be the same: "Frit 3134" is not
 * "Frit 3124".
 */
function likeness(pasted, recordName) {
  return likenessOf(prepared(pasted), prepared(recordName));
}

/** A name as likeness compares it: its words and its letters and digits, worked out once. */
const prepared = remembered((text) => {
  return { words: wordsOf(text), letters: compact(text) };
});

/** likeness, of two prepared names. */
function likenessOf(pasted, record) {
  const query = pasted.words;
  const words = record.words;
  if (!query.length || !words.length) return 0;
  const used = new Set();
  let found = 0;
  let exact = 0;
  let numberMissed = false;
  for (const word of query) {
    let at = -1;
    let best = 0;
    for (let i = 0; i < words.length; i++) {
      const match = used.has(i) ? 0 : wordMatch(word, words[i]);
      if (match > best) {
        at = i;
        best = match;
      }
    }
    if (at >= 0) {
      used.add(at);
      found += best;
      if (best === 1) exact++;
    } else if (hasDigit(word)) numberMissed = true;
  }
  let score =
    0.6 * (found / query.length) +
    0.25 * (used.size / words.length) +
    0.15 * pairsAlike(pasted.letters, record.letters);
  // Every word on both sides, as near as typed: this is the name, with a slip in it.
  if (used.size === words.length && used.size === query.length && found > exact) score += 0.1;
  // A number the name has too, but a different one: another material.
  const otherNumber = numberMissed && words.some((word) => hasDigit(word) && !query.includes(word));
  return otherNumber ? score * 0.5 : score;
}

module.exports = {
  PASTE_LIMITS,
  ambiguousNumbers,
  pasteTooLong,
  parsePaste,
  spacedReading,
  importAmounts,
  matchName,
  likeness,
  foldedName: folded,
  compactName: compact
};
