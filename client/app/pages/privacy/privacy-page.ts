import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

/** What Glazecalc stores, why, where, and for how long. Keep it true when the app changes. */
@Component({
  selector: 'gc-privacy-page',
  imports: [PageHeader, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('site.privacy.title')" [lead]="t('site.privacy.lead')" />

    <section class="panel">
      <h2>{{ t('site.privacy.shortHeading') }}</h2>
      <p>{{ t('site.privacy.short') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.storedHeading') }}</h2>
      <ul>
        <li><gc-rich [text]="t('site.privacy.storedAccount')" /></li>
        <li><gc-rich [text]="t('site.privacy.storedTrial')" /></li>
        <li><gc-rich [text]="t('site.privacy.storedSaved')" /></li>
        <li><gc-rich [text]="t('site.privacy.storedResets')" /></li>
        <li><gc-rich [text]="t('site.privacy.storedBrowser')" /></li>
      </ul>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.emailHeading') }}</h2>
      <p>{{ t('site.privacy.email') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.hostingHeading') }}</h2>
      <ul>
        <li>{{ t('site.privacy.logs') }}</li>
        <li>{{ t('site.privacy.backups') }}</li>
        <li>{{ t('site.privacy.hosting') }}</li>
      </ul>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.deletingHeading') }}</h2>
      <p>
        <gc-rich [text]="t('site.privacy.deleting')" [links]="{ account: '/account' }" />
      </p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.questionsHeading') }}</h2>
      <p>
        <gc-rich
          [text]="t('site.privacy.questions')"
          [links]="{ issues: 'https://github.com/AaronFilson/glazecalc/issues' }"
        />
      </p>
    </section>
  </ng-container>`
})
export class PrivacyPage {}
