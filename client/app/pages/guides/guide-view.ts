import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { baseLanguage, languageFor } from '../../../../lib/regions/languages';
import { LocaleService } from '../../core/locale.service';
import { PreferencesService } from '../../core/preferences.service';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { pseudoText } from '../../i18n/pseudo';
import { fixed, upTo } from '../../shared/format';
import { PageHeader } from '../../shared/page-header';
import { GuideContents, SectionLinks } from './guide-contents';
import { Block, Guide, Inline, Reading, blocks } from './guide-document';
import { FoodLimits } from './food-limits';
import { LocalEquivalents } from './local-equivalents';
import { PoisonLines } from './poison-lines';
import { ShopList } from './shop-list';
import { SilicaLimit } from './silica-limit';

/**
 * A guide as the page draws it, from its Markdown (guide-document.ts): its
 * title, contents, and sections as panels. Everything is drawn by Angular's
 * templates from the parsed text, never as HTML: links in the app are router
 * links, so they stay in the page's language, and parts such as who to call
 * are components. Anything given to it (a note on the guide) goes under the
 * contents.
 */
@Component({
  selector: 'gc-guide-view',
  imports: [
    FoodLimits,
    GuideContents,
    LocalEquivalents,
    NgTemplateOutlet,
    PageHeader,
    PoisonLines,
    RouterLink,
    ShopList,
    SilicaLimit
  ],
  templateUrl: './guide-view.html'
})
export class GuideView {
  readonly guide = input.required<Guide>();
  /** The language the text is in, where it is not the page's (a guide not translated yet). */
  readonly textLanguage = input<string | null>(null);

  private readonly locale = inject(LocaleService);
  /** The English after key terms, where the reader asks for it and the page is not English. */
  private readonly preferences = inject(PreferencesService);
  protected readonly englishTerms = computed(
    () => this.preferences.englishTerms() === 'on' && baseLanguage(this.language) !== 'en'
  );
  private readonly language = inject(PAGE_LANGUAGE);
  protected readonly pageLanguage = this.language;
  /** Over a section of a translation still in English, in the page's language. */
  protected readonly sectionInEnglish = translate('guides.sectionInEnglish');
  private readonly pseudo = !!languageFor(this.language)?.pseudo;

  protected readonly sections = computed(() =>
    this.guide().sections.map((section) => ({ ...section, content: blocks(section.blocks, section.id) }))
  );
  protected readonly intro = computed(() => blocks(this.guide().intro));
  protected readonly contents = computed(() =>
    this.guide().sections.map(({ id, label, language }) => ({
      id,
      label: this.show(label),
      language: language ?? this.textLanguage()
    }))
  );
  /** Links to a section of this page, as the contents' are. */
  protected readonly sectionLinks = new SectionLinks();

  /** Text as the page shows it: as written, or accented in a pseudo-locale. */
  protected show(text: string): string {
    return this.pseudo ? pseudoText(text, this.language) : text;
  }

  /** A temperature in the reader's scale, the other after it: "1,222 °C (2,232 °F)". */
  protected temperature(part: Extract<Inline, { kind: 'temperature' }>): string {
    const [first, second] =
      this.locale.temperature() === 'F' ? [part.fahrenheit, part.celsius] : [part.celsius, part.fahrenheit];
    return `${this.reading(first)} (${this.reading(second)})`;
  }

  /** A glaze's density as the reader measures it: "SG 1.45", "45 °Bé (SG 1.45)" or "29 oz per imperial pint (SG 1.45)". */
  protected density(part: Extract<Inline, { kind: 'density' }>): string {
    const range = (write: (sg: number) => string) => write(part.from) + (part.to === null ? '' : '–' + write(part.to));
    const sg = translate('guides.density.sg', { value: range((value) => fixed(value, 2)) });
    switch (this.locale.density()) {
      // Degrees Baumé, by the guide's arithmetic: SG = 145 ÷ (145 − °Bé).
      case 'baume':
        return translate('guides.density.baume', { value: range((value) => upTo(145 - 145 / value, 0)), sg });
      // Ounces in an imperial pint, whose water weighs about 20 oz.
      case 'pint':
        return translate('guides.density.pint', { value: range((value) => upTo(value * 20, 0)), sg });
      default:
        return sg;
    }
  }

  private reading({ from, to, unit }: Reading): string {
    return upTo(from, 1) + (to === null ? '' : '–' + upTo(to, 1)) + ' ' + unit;
  }

  /** A table's caption as plain text, for the name of its scrolling box when it has no shorter one. */
  protected plain(parts: Inline[]): string {
    return parts
      .map((part) => {
        switch (part.kind) {
          case 'text':
          case 'code':
            return this.show(part.text);
          case 'temperature':
            return this.temperature(part);
          case 'density':
            return this.density(part);
          case 'strong':
          case 'em':
          case 'link':
            return this.plain(part.content);
          default:
            return ' ';
        }
      })
      .join('')
      .trim();
  }

  /** Where a link goes: a page of the app, a section of this page, or elsewhere. */
  protected linkKind(href: string): 'route' | 'here' | 'web' {
    if (href.startsWith('#')) return 'here';
    return href.startsWith('/') ? 'route' : 'web';
  }

  protected path(href: string): string {
    return href.split('#')[0]!;
  }

  protected fragment(href: string): string | undefined {
    return href.split('#')[1];
  }

  /** The template's own lists, typed. */
  protected asBlocks(value: unknown): Block[] {
    return value as Block[];
  }

  protected asInlines(value: unknown): Inline[] {
    return value as Inline[];
  }
}
