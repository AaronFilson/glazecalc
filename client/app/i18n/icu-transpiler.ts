import { Injectable, isDevMode } from '@angular/core';
import { TranslocoTranspiler, TranspileParams } from '@jsverse/transloco';
import { MessageFormatElement, TYPE, parse } from '@formatjs/icu-messageformat-parser';
import { IntlMessageFormat } from 'intl-messageformat';
import { languageFor, textLanguage } from '../../../lib/regions/languages';
import { dateTimeFormat, numberFormat } from '../../../lib/regions/locale-fallback';
import { isolateUnits, isolateValues, mirrorArrows } from '../shared/bidi';
import { formatLocale } from '../shared/format';
import { keepsWesternDigits, textDigitsFor, withTextDigits } from '../shared/text-digits';

/**
 * A tag's edges in a written message, in characters no one types, so that
 * text a potter typed (a material called "<b>") stays text: \uE000b\uE001 opens
 * <b> and \uE002b\uE001 closes it. Only gc-rich (i18n/rich-text.ts) reads them.
 */
export const TAG_OPEN = '\uE000';
export const TAG_CLOSE = '\uE002';
export const TAG_END = '\uE001';

/** A message's own words rewritten, its placeholders, plurals and tags kept. */
function rewriteLiterals(elements: MessageFormatElement[], text: (literal: string) => string): void {
  for (const element of elements) {
    if (element.type === TYPE.literal) element.value = text(element.value);
    else if (element.type === TYPE.tag) rewriteLiterals(element.children, text);
    else if (element.type === TYPE.plural || element.type === TYPE.select) {
      for (const option of Object.values(element.options)) rewriteLiterals(option.value, text);
    }
  }
}

/** The names of the tags in a message (<settings>Settings</settings>), anywhere in it. */
export function tagNames(elements: readonly MessageFormatElement[], names = new Set<string>()): Set<string> {
  for (const element of elements) {
    if (element.type === TYPE.tag) {
      names.add(element.value);
      tagNames(element.children, names);
    } else if (element.type === TYPE.plural || element.type === TYPE.select) {
      for (const option of Object.values(element.options)) tagNames(option.value, names);
    }
  }
  return names;
}

/**
 * Messages are ICU MessageFormat, run by FormatJS's intl-messageformat
 * (docs/adr/0013-translations.md): "{count, plural, one {# material} other {#
 * materials}}". The plural form follows the page's language, with CLDR's rules
 * for every language (Czech's for 1,5, Arabic's six forms); numbers inside a
 * message are written as Settings say (shared/format.ts), so German text can
 * show 12.5 for a potter who chose a decimal point.
 *
 * Tags are kept, marked as TAG_OPEN says, for gc-rich (i18n/rich-text.ts) to
 * turn into links and emphasis: a message is never HTML.
 *
 * On a right-to-left page (shared/bidi.ts) a message's arrows point the way it
 * reads, each value with letters in it (a name) is kept apart from the sentence,
 * as <bdi> keeps it, and each value with a Latin unit ("1240 °C") reads left to
 * right, whether the message or a value wrote it.
 *
 * On a Bengali page (shared/text-digits.ts) a message's own figures are shown in the digits its numbers are
 * formatted in (১২২২ °C), unless the reader chose 0–9; its values are left as they are.
 */
@Injectable()
export class IcuTranspiler implements TranslocoTranspiler {
  private language = 'en';
  private page = 'en';
  private textDigits = false;
  private rightToLeft = false;
  private readonly compiled = new Map<
    string,
    { format: IntlMessageFormat; tags: Record<string, (chunks: unknown[]) => string> }
  >();

  private readonly formatters = {
    getNumberFormat: (_locales?: string | string[], options?: Intl.NumberFormatOptions) =>
      numberFormat(formatLocale(), options),
    getDateTimeFormat: (_locales?: string | string[], options?: Intl.DateTimeFormatOptions) =>
      dateTimeFormat(formatLocale(), options),
    getPluralRules: (_locales?: string | string[], options?: Intl.PluralRulesOptions) =>
      new Intl.PluralRules(this.language, options)
  };

  onLangChanged(lang: string): void {
    this.language = textLanguage(lang);
    this.page = lang;
    this.textDigits = !!languageFor(lang)?.textDigits;
    this.rightToLeft = languageFor(lang)?.dir === 'rtl';
    this.compiled.clear();
  }

  transpile({ value, params, key }: TranspileParams): unknown {
    if (typeof value !== 'string') return value;
    const digits = this.textDigits && !keepsWesternDigits(key) ? textDigitsFor(this.page) : null;
    // Plain text needs no formatting, unless it has an apostrophe: ICU writes one as two (d''Azur).
    if (!/[{<']/.test(value)) {
      const text = withTextDigits(value, digits);
      return this.rightToLeft ? isolateUnits(mirrorArrows(text)) : text;
    }
    try {
      const { format, tags } = this.compile(this.rightToLeft ? mirrorArrows(value) : value, digits);
      if (!this.rightToLeft) return format.format({ ...tags, ...params }) as string;
      return isolateUnits(format.format({ ...tags, ...isolateValues(params ?? {}) }) as string);
    } catch (error) {
      // A message that does not fit its values is a mistake to fix, not to show.
      if (isDevMode()) throw new Error(`The message ${key} could not be written: ${(error as Error).message}`);
      return value;
    }
  }

  /** A message ready to format, its own figures in a numbering system's digits where one is given. */
  private compile(message: string, digits: string | null = null) {
    const cacheKey = digits ? digits + '\u0000' + message : message;
    let compiled = this.compiled.get(cacheKey);
    if (!compiled) {
      let source: string | MessageFormatElement[] = message;
      if (digits) {
        source = parse(message);
        rewriteLiterals(source, (text) => withTextDigits(text, digits));
      }
      const format = new IntlMessageFormat(source, this.language, undefined, { formatters: this.formatters });
      const tags = Object.fromEntries(
        [...tagNames(format.getAst())].map((name) => [
          name,
          (chunks: unknown[]) => TAG_OPEN + name + TAG_END + chunks.join('') + TAG_CLOSE + name + TAG_END
        ])
      );
      compiled = { format, tags };
      this.compiled.set(cacheKey, compiled);
    }
    return compiled;
  }
}
