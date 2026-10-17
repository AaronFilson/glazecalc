import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { OFFERED_LANGUAGES, PAGE_LANGUAGE, languageName, pathIn } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

/** What Glazecalc is, how its numbers are worked out, and how it is built. */
@Component({
  selector: 'gc-about-page',
  imports: [PageHeader, RichText, TranslocoDirective],
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
      <h2>{{ t('site.about.whoHeading') }}</h2>
      <p>
        <gc-rich [text]="t('site.about.who')" [links]="{ issues: 'https://github.com/AaronFilson/glazecalc/issues' }" />
      </p>
      <p class="studio">
        <gc-rich [text]="t('site.about.studio')" [links]="{ studio: 'https://updraftpotterystudio.com/' }" />
      </p>
    </section>

    <!-- Every live language, each in its own name and linked to this page in it, as the footer's chooser is. -->
    @if (languages.length > 1) {
      <section class="panel" aria-labelledby="about-languages-heading">
        <h2 id="about-languages-heading">{{ t('site.about.languagesHeading') }}</h2>
        <p>{{ t('site.about.languages') }}</p>
        <nav aria-labelledby="about-languages-heading">
          <ul class="about-languages">
            @for (code of languages; track code) {
              <li>
                <a
                  [href]="aboutIn(code)"
                  [attr.lang]="code"
                  [attr.hreflang]="code"
                  translate="no"
                  [attr.aria-current]="code === pageLanguage ? 'page' : null"
                  >{{ languageName(code) }}</a
                >
              </li>
            }
          </ul>
        </nav>
      </section>
    }
  </ng-container>`,
  styles: `
    .about-languages {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      list-style: none;
      padding: 0;
      margin: 0;
    }
  `
})
export class AboutPage {
  protected readonly languages = inject(OFFERED_LANGUAGES);
  protected readonly pageLanguage = inject(PAGE_LANGUAGE);
  protected readonly languageName = languageName;

  /** This page in a language: /about, /de/about. */
  protected aboutIn(code: string): string {
    return pathIn(code, '/about');
  }
}
