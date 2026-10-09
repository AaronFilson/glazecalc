import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
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
  </ng-container>`
})
export class AboutPage {}
