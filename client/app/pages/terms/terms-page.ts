import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

const LINKS = {
  source: 'https://github.com/AaronFilson/glazecalc',
  // SECURITY.md, as GitHub shows it.
  security: 'https://github.com/AaronFilson/glazecalc/security/policy',
  privacy: '/privacy',
  hello: 'mailto:hello@glazecalcapp.com',
  abuse: 'mailto:abuse@glazecalcapp.com'
};

/**
 * The terms for using the site at glazecalcapp.com: its server and accounts,
 * not the code, which is the MIT License's. Plain words about fair use of one
 * shared server; how much is allowed is the rate limits' business
 * (server/lib/rate_limit.ts), and the privacy notice says what is kept.
 */
@Component({
  selector: 'gc-terms-page',
  imports: [PageHeader, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('site.terms.title')" [lead]="t('site.terms.lead')" />

    <section class="panel">
      <h2>{{ t('site.terms.shortHeading') }}</h2>
      <p>{{ t('site.terms.short') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.whoHeading') }}</h2>
      <p>{{ t('site.terms.who') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.codeHeading') }}</h2>
      <p><gc-rich [text]="t('site.terms.code')" [links]="links" /></p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.useHeading') }}</h2>
      <ul>
        @for (key of use; track key) {
          <li>{{ t(key) }}</li>
        }
      </ul>
    </section>

    <section class="panel" id="fair-use">
      <h2>{{ t('site.terms.fairHeading') }}</h2>
      <p>{{ t('site.terms.fairIntro') }}</p>
      <ul>
        @for (key of fair; track key) {
          <li><gc-rich [text]="t(key)" [links]="links" /></li>
        }
      </ul>
      <p>{{ t('site.terms.fairScripts') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.stopHeading') }}</h2>
      <p>{{ t('site.terms.stop') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.availableHeading') }}</h2>
      <p>{{ t('site.terms.available') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.warrantyHeading') }}</h2>
      <p>{{ t('site.terms.warranty') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.privacyHeading') }}</h2>
      <p><gc-rich [text]="t('site.terms.privacy')" [links]="links" /></p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.changesHeading') }}</h2>
      <p>{{ t('site.terms.changes') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.terms.contactHeading') }}</h2>
      <p><gc-rich [text]="t('site.terms.contact')" [links]="links" /></p>
    </section>
  </ng-container>`
})
export class TermsPage {
  protected readonly links = LINKS;
  protected readonly use = marker([
    'site.terms.useOwn',
    'site.terms.useAccount',
    'site.terms.useContent',
    'site.terms.useLaw'
  ]);
  protected readonly fair = marker([
    'site.terms.fairAttack',
    'site.terms.fairLoad',
    'site.terms.fairScrape',
    'site.terms.fairAccounts',
    'site.terms.fairMail',
    'site.terms.fairHarm'
  ]);
}
