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
//
// Placeholders, plurals and tags keep their ICU form; only the text changes.

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
  } else {
    rewrite(ast, (text) => [...text].map((c) => ACCENTED[c] ?? c).join(''));
    const padding = '·'.repeat(Math.max(1, Math.round(message.length / 3)));
    ast.unshift(literal('['));
    ast.push(literal(' ' + padding + ']'));
  }
  return printAST(ast);
}

/** Plain text, such as a guide's, in a pseudo-locale: accented, set right to left, or in Japanese characters. */
export function pseudoText(text: string, code: string): string {
  if (code === 'ar-XB') return text.trim() ? RLO + text + PDF : text;
  if (code === 'ja-XC') return japaneseText(text);
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
