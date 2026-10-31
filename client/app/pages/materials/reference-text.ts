import { InjectionToken } from '@angular/core';
import { REFERENCE_LANGUAGES, textKey } from '../../../../lib/regions/languages';
import { codedMessage } from '../../i18n/coded';

/**
 * The languages the cone chart, the list of materials and each material's page are translated into
 * (lib/regions/languages.js); a test provides its own. In any other language the pages show the English,
 * with a notice that they are not translated.
 */
export const REFERENCE_LANGUAGE_LIST = new InjectionToken<readonly string[]>('REFERENCE_LANGUAGE_LIST', {
  providedIn: 'root',
  factory: () => REFERENCE_LANGUAGES
});

/** A standard record's text on a reference page, and whether it is the English standing in for a missing translation. */
export interface ReferenceText {
  text: string;
  /** English in a page of another language: the text is marked lang="en". */
  english: boolean;
}

/**
 * A material's note or hazard, or a cone chart's note, in the page's language. A page of a language the
 * reference pages are translated into shows a text with no translation (a changed note not yet translated)
 * as the English, marked as such; any other page is the English throughout, with its notice, and a page in
 * English has nothing to mark.
 * @param scope where the translation is: materials/ for a material's words, cones/ for a chart's
 */
export function referenceText(
  text: string,
  scope: 'materials' | 'cones',
  language: string,
  translated: readonly string[]
): ReferenceText {
  if (language === 'en' || !translated.includes(language)) return { text, english: false };
  const found = codedMessage(scope, textKey(text));
  return found ? { text: found, english: false } : { text, english: true };
}
