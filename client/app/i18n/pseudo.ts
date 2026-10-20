import { MessageFormatElement, TYPE, parse } from '@formatjs/icu-messageformat-parser';
import { printAST } from '@formatjs/icu-messageformat-parser/printer.js';

// Pseudo-locales (lib/regions/languages.js), made from the English messages
// in the browser, so they never fall behind it:
//
//   en-XA  every letter accented and each message a third longer, in brackets:
//          "[Šåvé ŕéçîþé ···]". Text not marked for translation stays plain,
//          a word cut short shows a missing bracket, and a layout that cannot
//          take longer words shows it.
//   ar-XB  each piece of text set right to left, on a right-to-left page: a
//          layout that is not mirrored shows it.
//   ja-XC  each English word in Japanese characters, half as many as its
//          letters, with no spaces between them, in corner brackets: "「窯計」".
//          The page is Japanese to the browser, so it shows Japanese's fonts
//          (Linux needs Noto CJK for them), lines broken where there are no
//          spaces, and text shorter than the English.
//   ar-XD  each English word in Arabic letters, on a right-to-left page with Arabic's
//          plural rules (every plural given all six forms) and Arabic-Indic digits
//          (lib/regions/languages.js): real right-to-left text, which the browser
//          sets by its own rules, so a value not kept apart from the words around
//          it ("1240 °C" read as "C° 1240"), a name or a layout not mirrored shows it.
//   hi-XE  each English word in Devanagari, its letters stacked and marked above
//          and below: Hindi's fonts and taller lines, so a box that clips its text
//          or a line set too tight shows it.
//
// Placeholders, plurals and tags keep their ICU form; only the text changes. In
// ar-XD and hi-XE what a translation keeps in Latin stays so: acronyms (SK, LOI),
// units (°C, g), formulas (SiO₂, K2O), names (Glazecalc) and web addresses.

const ACCENTED: Record<string, string> = Object.fromEntries(
  [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter, i) => [
    letter,
    [...'åƀçðéƒĝĥîĵķļɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŢÛṼŴẊÝŽ'][i]!
  ])
);

const RLO = '‮';
const PDF = '‬';

/** Kanji, hiragana and katakana, as a potter's page in Japanese shows them. */
const JAPANESE = [
  ...'釉薬窯焼成陶磁器粘土原料計算配合色見本温度記録保存削除編集表示設定言語地域安全手引注意試験結果材料名前数量単位合計比率酸化物のをにはがでとするアイウエオカキクケコ'
];

/** One English word in Japanese characters: half as many as its letters, the same ones each time. */
function japaneseWord(word: string): string {
  let hash = 0x811c9dc5;
  for (const char of word.toLowerCase()) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  let japanese = '';
  for (let i = 0; i < Math.ceil(word.length / 2); i++) {
    japanese += JAPANESE[hash % JAPANESE.length];
    hash = Math.imul(hash ^ i, 0x01000193) >>> 0;
  }
  return japanese;
}

/** Text in Japanese characters, with Japanese's full stops and commas, and no spaces beside them. */
function japaneseText(text: string): string {
  return text
    .replace(/[A-Za-z]+(?:['’][A-Za-z]+)*/g, japaneseWord)
    .replace(/(?<=[\u3040-\u30ff\u4e00-\u9fff])\.(?=\s|$)/gu, '。')
    .replace(/(?<=[\u3040-\u30ff\u4e00-\u9fff]),(?=\s)/gu, '、')
    .replace(/(?<=[\u3000-\u30ff\u4e00-\u9fff])\s+|\s+(?=[\u3000-\u30ff\u4e00-\u9fff])/gu, '');
}

/** Units and names a translation keeps in Latin letters. */
const KEPT_WORDS = new Set(['g', 'kg', 'lb', 'lbs', 'oz', 'ml', 'mm', 'cm', 'Glazecalc', 'Orton', 'Google', 'GitHub']);

/**
 * Whether a word stays in Latin letters: a unit, a name, an acronym (SK, LOI), part of a formula (SiO₂, K2O,
 * °C) or of a standard's number (JIS R 8101).
 */
function keptLatin(word: string, before: string, after: string): boolean {
  return (
    KEPT_WORDS.has(word) ||
    /^[A-Z]{2,}s?$/.test(word) ||
    (/^[A-Z]$/.test(word) && /^ \d/.test(after)) ||
    /[A-Z]/.test(word.slice(1)) ||
    /[\d\u2080-\u2089°]/.test(before) ||
    /[\d\u2080-\u2089]/.test(after.charAt(0))
  );
}

/**
 * Text with each word written anew, and its punctuation, but for web addresses and the Latin a
 * translation keeps.
 */
function eachWord(text: string, write: (word: string) => string, punctuate: (text: string) => string): string {
  return text
    .split(/((?:https?:\/\/|www\.)\S+)/)
    .map((part, i) =>
      i % 2
        ? part
        : punctuate(
            part.replace(/[A-Za-z]+(?:['’][A-Za-z]+)*/g, (word: string, at: number) =>
              keptLatin(word, part[at - 1] ?? '', part.slice(at + word.length, at + word.length + 2))
                ? word
                : write(word)
            )
          )
    )
    .join('');
}

/** Arabic letters for English ones, the same each time. */
const ARABIC: Record<string, string> = Object.fromEntries(
  [...'abcdefghijklmnopqrstuvwxyz'].map((letter, i) => [
    letter,
    'ا ب ك د ي ف غ ه ي ج ك ل م ن و ب ق ر س ت و ف و كس ي ز'.split(' ')[i]!
  ])
);

/** Text in Arabic letters, with Arabic's comma, semicolon and question mark. */
function arabicText(text: string): string {
  return eachWord(
    text,
    (word) => [...word.toLowerCase()].map((letter) => ARABIC[letter] ?? '').join(''),
    (part) =>
      part
        .replace(/,(?=\s|$)/g, '،')
        .replace(/;/g, '؛')
        .replace(/\?/g, '؟')
  );
}

/** Devanagari consonants for English ones, some stacked two high (ड्ड, ट्ठ, ग्ग). */
const CONSONANTS: Record<string, string> = {
  b: 'ब',
  c: 'च',
  d: 'ड्ड',
  f: 'फ़',
  g: 'ग्ग',
  h: 'ह',
  j: 'ज',
  k: 'क्ष',
  l: 'ल',
  m: 'म',
  n: 'न',
  p: 'प',
  q: 'क़',
  r: 'र',
  s: 'स',
  t: 'ट्ठ',
  v: 'व',
  w: 'व',
  x: 'क्स',
  y: 'य',
  z: 'ज़'
};
/** Each vowel on its own, and as the sign it takes after a consonant (ि and े over the line, ु under it). */
const VOWELS: Record<string, [string, string]> = {
  a: ['अ', 'ा'],
  e: ['ए', 'े'],
  i: ['इ', 'ि'],
  o: ['ओ', 'ो'],
  u: ['उ', 'ु']
};

/** One English word in Devanagari: a capital with र् over it, a last bare consonant with ृ under it, and ँ over its end. */
function devanagariWord(word: string): string {
  let written = '';
  let bare = false;
  for (const char of word) {
    const letter = char.toLowerCase();
    const vowel = VOWELS[letter];
    if (vowel) {
      written += bare ? vowel[1] : vowel[0];
      bare = false;
    } else if (CONSONANTS[letter]) {
      written += (char === letter ? '' : 'र्') + CONSONANTS[letter];
      bare = true;
    }
  }
  return written + (bare ? 'ृ' : '') + 'ँ';
}

/** Text in Devanagari, with a danda (।) for a full stop. */
function hindiText(text: string): string {
  return eachWord(text, devanagariWord, (part) => part.replace(/(?<=[\u0900-\u097f])\.(?=\s|$)/gu, '।'));
}

/** Arabic's plural forms. A plural is given all six, each a copy of its "other", so every one is used. */
const ARABIC_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

function withArabicForms(elements: MessageFormatElement[]): void {
  for (const element of elements) {
    if (element.type === TYPE.tag) withArabicForms(element.children);
    else if (element.type === TYPE.plural || element.type === TYPE.select) {
      for (const option of Object.values(element.options)) withArabicForms(option.value);
      const other = element.options['other'];
      if (element.type === TYPE.plural && element.pluralType === 'cardinal' && other) {
        for (const form of ARABIC_FORMS) element.options[form] ??= structuredClone(other);
      }
    }
  }
}

function rewrite(elements: MessageFormatElement[], text: (literal: string) => string): void {
  for (const element of elements) {
    if (element.type === TYPE.literal) element.value = text(element.value);
    else if (element.type === TYPE.tag) rewrite(element.children, text);
    else if (element.type === TYPE.plural || element.type === TYPE.select) {
      for (const option of Object.values(element.options)) rewrite(option.value, text);
    }
  }
}

const literal = (value: string): MessageFormatElement => ({ type: TYPE.literal, value });

/** One message in a pseudo-locale. */
export function pseudoMessage(message: string, code: string): string {
  const ast = parse(message);
  if (code === 'ar-XB') {
    rewrite(ast, (text) => (text.trim() ? RLO + text + PDF : text));
  } else if (code === 'ja-XC') {
    rewrite(ast, japaneseText);
    ast.unshift(literal('「'));
    ast.push(literal('」'));
  } else if (code === 'ar-XD') {
    withArabicForms(ast);
    rewrite(ast, arabicText);
  } else if (code === 'hi-XE') {
    rewrite(ast, hindiText);
  } else {
    rewrite(ast, (text) => [...text].map((c) => ACCENTED[c] ?? c).join(''));
    const padding = '·'.repeat(Math.max(1, Math.round(message.length / 3)));
    ast.unshift(literal('['));
    ast.push(literal(' ' + padding + ']'));
  }
  return printAST(ast);
}

/** Plain text, such as a guide's, in a pseudo-locale: accented, set right to left, or in other letters. */
export function pseudoText(text: string, code: string): string {
  if (code === 'ar-XB') return text.trim() ? RLO + text + PDF : text;
  if (code === 'ja-XC') return japaneseText(text);
  if (code === 'ar-XD') return arabicText(text);
  if (code === 'hi-XE') return hindiText(text);
  return [...text].map((c) => ACCENTED[c] ?? c).join('');
}

/** A whole translation file in a pseudo-locale. */
export function pseudoTranslation<T>(translation: T, code: string): T {
  if (typeof translation === 'string') return pseudoMessage(translation, code) as T;
  if (translation && typeof translation === 'object') {
    return Object.fromEntries(
      Object.entries(translation).map(([key, value]) => [key, pseudoTranslation(value, code)])
    ) as T;
  }
  return translation;
}
