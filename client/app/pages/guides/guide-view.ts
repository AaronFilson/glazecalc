import { DOCUMENT, LocationStrategy, NgTemplateOutlet } from '@angular/common';
import { Component, SecurityContext, computed, forwardRef, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { Router, RouterLink } from '@angular/router';
import { baseLanguage, languageFor } from '../../../../lib/regions/languages';
import { LocaleService } from '../../core/locale.service';
import { PreferencesService } from '../../core/preferences.service';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { pseudoText } from '../../i18n/pseudo';
import { isolated, ltr, withLatinIsolated } from '../../shared/bidi';
import { fixed, upTo } from '../../shared/format';
import { textDigitsFor, withTextDigits } from '../../shared/text-digits';
import { PageHeader } from '../../shared/page-header';
import { StructuredData, article, pageAddress } from '../../shared/structured-data';
import { GuideContents, SectionLinks } from './guide-contents';
import { Block, Guide, GuideSection, Inline, Reading, blocks } from './guide-document';
import { GuideInline, GuideRow, InlineContext } from './guide-inline';
import { GUIDES, REFERENCE_PAGES, ReferencePage } from './guides-page';
import { FoodLimits } from './food-limits';
import { LocalEquivalents } from './local-equivalents';
import { PoisonLines } from './poison-lines';
import { ShopList } from './shop-list';
import { SilicaLimit } from './silica-limit';

/**
 * A guide as the page draws it, from its Markdown (guide-document.ts): its
 * title, contents, and sections as panels. Everything is drawn by Angular's
 * templates from the parsed text, never as HTML, the text of each block by
 * the gcInline directive (guide-inline.ts): links in the app open in the app
 * as router links do, so they stay in the page's language, and parts such as
 * who to call are components. Anything given to it (a note on the guide) goes under the
 * contents.
 */
@Component({
  selector: 'gc-guide-view',
  imports: [
    FoodLimits,
    GuideContents,
    GuideInline,
    GuideRow,
    LocalEquivalents,
    NgTemplateOutlet,
    PageHeader,
    PoisonLines,
    RouterLink,
    ShopList,
    SilicaLimit,
    StructuredData,
    TranslocoDirective
  ],
  templateUrl: './guide-view.html',
  providers: [{ provide: InlineContext, useExisting: forwardRef(() => GuideView) }]
})
export class GuideView implements InlineContext {
  readonly guide = input.required<Guide>();
  /** The language the text is in, where it is not the page's (a guide not translated yet). */
  readonly textLanguage = input<string | null>(null);
  /** Reference pages the guide points to, after its text (guides-page.ts, REFERENCE_PAGES). */
  readonly related = input<ReadonlyArray<(typeof REFERENCE_PAGES)[ReferencePage]>>([]);

  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly locationStrategy = inject(LocationStrategy);
  private readonly sanitizer = inject(DomSanitizer);
  /** The English after key terms, where the reader asks for it and the page is not English. */
  private readonly preferences = inject(PreferencesService);
  readonly englishTerms = computed(
    () => this.preferences.englishTerms() === 'on' && baseLanguage(this.language) !== 'en'
  );
  private readonly language = inject(PAGE_LANGUAGE);
  protected readonly pageLanguage = this.language;
  private readonly pathname = inject(DOCUMENT).location.pathname;
  /** What search engines read about the guide (shared/structured-data.ts). */
  protected readonly structured = computed(() => {
    const { title, lead, modified } = this.guide();
    return article(
      title,
      lead,
      this.textLanguage() ?? this.language,
      pageAddress(this.language, this.pathname),
      modified
    );
  });
  /**
   * The other guides, for the block at the end of the page (search engines follow these links, and they
   * are in the prerendered page): every guide of the list (guides-page.ts) but this one, so a guide added
   * there appears here with no other change.
   */
  protected readonly moreGuides = computed(() => {
    const here = this.pathname.replace(/\/+$/, '');
    return GUIDES.filter((guide) => !here.endsWith(guide.path));
  });
  /** Over a section of a translation still in English, in the page's language. */
  protected readonly sectionInEnglish = translate('guides.sectionInEnglish');
  private readonly pseudo = !!languageFor(this.language)?.pseudo;

  /**
   * The sections as drawn. A section whose Markdown is unchanged when the guide is read again (the other way of
   * firing, chosen in Settings or found after the first render) is the same object, so its views are kept as
   * they are and only the sections that differ are drawn.
   */
  private drawnSections = new Map<string, GuideSection & { content: Block[] }>();
  protected readonly sections = computed(() => {
    const drawn = new Map<string, GuideSection & { content: Block[] }>();
    const sections = this.guide().sections.map((section) => {
      const key = [section.id, section.language, ...section.blocks.map((block) => block.raw)].join('\n');
      const same = this.drawnSections.get(key) ?? { ...section, content: blocks(section.blocks, section.id) };
      drawn.set(key, same);
      return same;
    });
    this.drawnSections = drawn;
    return sections;
  });
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

  /**
   * Text as the page shows it: as written, or accented in a pseudo-locale; its web addresses and formulas
   * kept left to right on a right-to-left page (shared/bidi.ts); its figures in the digits the page's numbers
   * are in, on a Bengali page (shared/text-digits.ts).
   */
  show(text: string): string {
    return this.showCode(withTextDigits(text, textDigitsFor(this.language)));
  }

  /** Code as the page shows it: as `show`, but its figures as written. */
  private showCode(text: string): string {
    return withLatinIsolated(this.pseudo ? pseudoText(text, this.language) : text);
  }

  /** A temperature in the reader's scale, the other after it: "1,222 °C (2,232 °F)", left to right in Arabic. */
  temperature(part: Extract<Inline, { kind: 'temperature' }>): string {
    const [first, second] =
      this.locale.temperature() === 'F' ? [part.fahrenheit, part.celsius] : [part.celsius, part.fahrenheit];
    return ltr(`${this.reading(first)} (${this.reading(second)})`);
  }

  /** A glaze's density as the reader measures it: "SG 1.45", "45 °Bé (SG 1.45)" or "29 oz per imperial pint (SG 1.45)". */
  density(part: Extract<Inline, { kind: 'density' }>): string {
    return isolated(this.densityText(part));
  }

  private densityText(part: Extract<Inline, { kind: 'density' }>): string {
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
            return this.show(part.text);
          case 'code':
            return this.showCode(part.text);
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
  private linkKind(href: string): 'route' | 'here' | 'web' {
    if (href.startsWith('#')) return 'here';
    return href.startsWith('/') ? 'route' : 'web';
  }

  /** A page of the app, with its section, as RouterLink makes it. */
  private urlTree(href: string) {
    const [path, fragment] = href.split('#');
    return this.router.createUrlTree([path], { fragment });
  }

  linkHref(href: string): string {
    switch (this.linkKind(href)) {
      case 'here':
        return this.sectionLinks.href(href.slice(1));
      case 'route':
        return this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.urlTree(href)));
      default:
        // As a [href] binding would have it: an address that could run script is not followed.
        return this.sanitizer.sanitize(SecurityContext.URL, href) ?? '';
    }
  }

  follow(event: MouseEvent, href: string): void {
    switch (this.linkKind(href)) {
      case 'here':
        this.sectionLinks.go(event, href.slice(1));
        return;
      case 'route':
        // As RouterLink does: a new tab or window is the browser's to open.
        if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
        event.preventDefault();
        void this.router.navigateByUrl(this.urlTree(href));
        return;
    }
  }

  /** A list item that is only a line of text, drawn straight into its <li>. */
  protected onlyText(item: Block[]): Inline[] | null {
    return item.length === 1 && item[0]!.kind === 'text' ? item[0]!.content : null;
  }

  /** The template's own lists, typed. */
  protected asBlocks(value: unknown): Block[] {
    return value as Block[];
  }
}
