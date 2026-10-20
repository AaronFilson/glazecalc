import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { OFFERED_LANGUAGES, PAGE_LANGUAGE, pathIn } from '../../i18n/language';
import { LanguageLinks } from '../../i18n/language-links';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

/** What Glazecalc is, how its numbers are worked out, and how it is built. */
@Component({
  selector: 'gc-about-page',
  imports: [LanguageLinks, PageHeader, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('site.about.title')" [lead]="t('site.about.lead')" />

    <section class="panel">
      <h2>{{ t('site.about.whatHeading') }}</h2>
      <p>{{ t('site.about.what') }}</p>
      <p>
        <gc-rich [text]="t('site.about.alongside')" [links]="{ advice: '/advice', guides: '/guides' }" />
      </p>
    </section>

    <section class="panel">
      <h2>{{ t('site.about.numbersHeading') }}</h2>
      <p>{{ t('site.about.numbers') }}</p>
      <p>{{ t('site.about.guide') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.about.builtHeading') }}</h2>
      <p>
        <gc-rich [text]="t('site.about.built')" [links]="{ source: 'https://github.com/AaronFilson/glazecalc' }" />
      </p>
      <ul>
        <li>{{ t('site.about.stackBrowser') }}</li>
        <li>{{ t('site.about.stackServer') }}</li>
        <li>{{ t('site.about.stackHosting') }}</li>
        <li>{{ t('site.about.stackDeploy') }}</li>
      </ul>
    </section>

    <section class="panel">
      <h2>{{ t('site.about.creditsHeading') }}</h2>
      <p>
        <gc-rich
          [text]="t('site.about.credits')"
          [links]="{ notices: 'https://github.com/AaronFilson/glazecalc/blob/master/THIRD-PARTY-NOTICES.md' }"
        />
      </p>
    </section>

    <section class="panel">
      <h2>{{ t('site.about.whoHeading') }}</h2>
      <p>
        <gc-rich [text]="t('site.about.who')" [links]="{ issues: 'https://github.com/AaronFilson/glazecalc/issues' }" />
      </p>
      <p class="studio">
        <gc-rich [text]="t('site.about.studio')" [links]="{ studio: 'https://updraftpotterystudio.com/' }" />
      </p>
    </section>

    <!-- Every live language, each in its own name and linked to this page in it, as the footer's chooser is,
         grouped by the part of the world they are spoken in. -->
    @if (languages.length > 1) {
      <section class="panel" aria-labelledby="about-languages-heading">
        <h2 id="about-languages-heading">{{ t('site.about.languagesHeading') }}</h2>
        <p>{{ t('site.about.languages') }}</p>
        <nav aria-labelledby="about-languages-heading">
          <gc-language-links [languages]="languages" [href]="aboutIn" [current]="pageLanguage" [hreflang]="true" />
        </nav>
      </section>
    }
  </ng-container>`
})
export class AboutPage {
  protected readonly languages = inject(OFFERED_LANGUAGES);
  protected readonly pageLanguage = inject(PAGE_LANGUAGE);

  /** This page in a language: /about, /de/about. */
  protected readonly aboutIn = (code: string): string => pathIn(code, '/about');
}
