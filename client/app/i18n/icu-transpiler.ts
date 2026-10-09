import { Injectable, isDevMode } from '@angular/core';
import { TranslocoTranspiler, TranspileParams } from '@jsverse/transloco';
import { MessageFormatElement, TYPE } from '@formatjs/icu-messageformat-parser';
import { IntlMessageFormat } from 'intl-messageformat';
import { textLanguage } from '../../../lib/regions/languages';
import { formatLocale } from '../shared/format';

/**
 * A tag's edges in a written message, in characters no one types, so that
 * text a potter typed (a material called "<b>") stays text: \uE000b\uE001 opens
 * <b> and \uE002b\uE001 closes it. Only gc-rich (i18n/rich-text.ts) reads them.
 */
export const TAG_OPEN = '\uE000';
export const TAG_CLOSE = '\uE002';
export const TAG_END = '\uE001';

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
 */
@Injectable()
export class IcuTranspiler implements TranslocoTranspiler {
  private language = 'en';
  private readonly compiled = new Map<
    string,
    { format: IntlMessageFormat; tags: Record<string, (chunks: unknown[]) => string> }
  >();

  private readonly formatters = {
    getNumberFormat: (_locales?: string | string[], options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(formatLocale(), options),
    getDateTimeFormat: (_locales?: string | string[], options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(formatLocale(), options),
    getPluralRules: (_locales?: string | string[], options?: Intl.PluralRulesOptions) =>
      new Intl.PluralRules(this.language, options)
  };

  onLangChanged(lang: string): void {
    this.language = textLanguage(lang);
    this.compiled.clear();
  }

  transpile({ value, params, key }: TranspileParams): unknown {
    if (typeof value !== 'string' || !/[{<]/.test(value)) return value;
    try {
      const { format, tags } = this.compile(value);
      return format.format({ ...tags, ...params }) as string;
    } catch (error) {
      // A message that does not fit its values is a mistake to fix, not to show.
      if (isDevMode()) throw new Error(`The message ${key} could not be written: ${(error as Error).message}`);
      return value;
    }
  }

  private compile(message: string) {
    let compiled = this.compiled.get(message);
    if (!compiled) {
      const format = new IntlMessageFormat(message, this.language, undefined, { formatters: this.formatters });
      const tags = Object.fromEntries(
        [...tagNames(format.getAst())].map((name) => [
          name,
          (chunks: unknown[]) => TAG_OPEN + name + TAG_END + chunks.join('') + TAG_CLOSE + name + TAG_END
        ])
      );
      compiled = { format, tags };
      this.compiled.set(message, compiled);
    }
    return compiled;
  }
}
