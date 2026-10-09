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
  } else {
    rewrite(ast, (text) => [...text].map((c) => ACCENTED[c] ?? c).join(''));
    const padding = '·'.repeat(Math.max(1, Math.round(message.length / 3)));
    ast.unshift(literal('['));
    ast.push(literal(' ' + padding + ']'));
  }
  return printAST(ast);
}

/** Plain text, such as a guide's, in a pseudo-locale: accented, or set right to left. */
export function pseudoText(text: string, code: string): string {
  if (code === 'ar-XB') return text.trim() ? RLO + text + PDF : text;
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
