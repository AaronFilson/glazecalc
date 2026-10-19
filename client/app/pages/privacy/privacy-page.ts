import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

/** Where to write about your data (deploy/aws/README.md, section 15). */
export const PRIVACY_ADDRESS = 'privacy@glazecalcapp.com';

const LINKS = {
  account: '/account',
  apps: '/account/apps',
  mail: 'mailto:' + PRIVACY_ADDRESS,
  issues: 'https://github.com/AaronFilson/glazecalc/issues',
  source: 'https://github.com/AaronFilson/glazecalc',
  // AWS Service Terms §1.14: the data processing addendum, the SCCs and the UK and Swiss addenda.
  dpa: 'https://aws.amazon.com/service-terms/',
  // The EU–US adequacy decision, Commission Implementing Decision (EU) 2023/1795.
  dpf: 'https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj',
  edpb: 'https://www.edpb.europa.eu/about-edpb/about-edpb/members_en',
  ico: 'https://ico.org.uk/make-a-complaint/'
};

/** Kept on the visitor's device: one row per purpose, with every name the code uses for it. */
export const STORED: ReadonlyArray<{ names: string[]; kind: string; key: string }> = [
  // server/lib/session.ts: the first name on the site, the second in development (on the site before October 2026; now only cleared there).
  {
    names: ['__Host-glazecalc_session', 'glazecalc_session'],
    kind: marker('site.privacy.storageCookie'),
    key: 'cookie'
  },
  // server/lib/session.ts (oauthName): only while signing in with Google, GitHub or Microsoft.
  {
    names: ['__Host-glazecalc_oauth', 'glazecalc_oauth'],
    kind: marker('site.privacy.storageCookie'),
    key: 'oauthCookie'
  },
  // client/app/core/auth.service.ts
  { names: ['session'], kind: marker('site.privacy.storageLocal'), key: 'session' },
  { names: ['trial'], kind: marker('site.privacy.storageLocal'), key: 'trial' },
  // client/app/core/preferences.service.ts: each preference under its name, the region as preferredRegion.
  {
    names: [
      'weightUnit',
      'gramPrecision',
      'theme',
      'palette',
      'lead',
      'preferredRegion',
      'format',
      'decimalMark',
      'temperature',
      'cones',
      'language',
      'density',
      'englishTerms',
      'notice',
      'recipeHelp',
      'limitSet',
      'currency',
      'calendar'
    ],
    kind: marker('site.privacy.storageLocal'),
    key: 'settings'
  },
  // Only these two can be chosen signed out (app.ts, i18n/translation-notice.ts).
  { names: ['visitor.language', 'visitor.notice'], kind: marker('site.privacy.storageLocal'), key: 'visitor' },
  { names: ['region'], kind: marker('site.privacy.storageLocal'), key: 'region' }, // shared/library-info.ts
  { names: ['includeAdditives'], kind: marker('site.privacy.storageLocal'), key: 'includeAdditives' },
  { names: ['printMode', 'printBatch'], kind: marker('site.privacy.storageLocal'), key: 'print' },
  { names: ['token'], kind: marker('site.privacy.storageLocal'), key: 'token' },
  { names: ['readEnglish'], kind: marker('site.privacy.storageSession'), key: 'readEnglish' }, // i18n/translation-notice.ts
  { names: ['reloadedFor'], kind: marker('site.privacy.storageSession'), key: 'reloadedFor' } // core/stale-build.ts
];

// The keys manager finds the row texts by these.
marker([
  'site.privacy.keys.cookie.purpose',
  'site.privacy.keys.cookie.lasts',
  'site.privacy.keys.oauthCookie.purpose',
  'site.privacy.keys.oauthCookie.lasts',
  'site.privacy.keys.session.purpose',
  'site.privacy.keys.session.lasts',
  'site.privacy.keys.trial.purpose',
  'site.privacy.keys.trial.lasts',
  'site.privacy.keys.settings.purpose',
  'site.privacy.keys.settings.lasts',
  'site.privacy.keys.visitor.purpose',
  'site.privacy.keys.visitor.lasts',
  'site.privacy.keys.region.purpose',
  'site.privacy.keys.region.lasts',
  'site.privacy.keys.includeAdditives.purpose',
  'site.privacy.keys.includeAdditives.lasts',
  'site.privacy.keys.print.purpose',
  'site.privacy.keys.print.lasts',
  'site.privacy.keys.token.purpose',
  'site.privacy.keys.token.lasts',
  'site.privacy.keys.readEnglish.purpose',
  'site.privacy.keys.readEnglish.lasts',
  'site.privacy.keys.reloadedFor.purpose',
  'site.privacy.keys.reloadedFor.lasts'
]);

/**
 * What Glazecalc stores, why, where, and for how long: the notice GDPR Article 13 asks for.
 * Keep it true when the app changes; docs/processing-record.md says the same for the owner.
 */
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
      <h2>{{ t('site.privacy.whoHeading') }}</h2>
      <p>{{ t('site.privacy.who') }}</p>
      <p class="privacy-contact"><gc-rich [text]="t('site.privacy.contact')" [links]="links" /></p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.storedHeading') }}</h2>
      <ul>
        @for (key of stored; track key) {
          <li><gc-rich [text]="t(key)" /></li>
        }
      </ul>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.basisHeading') }}</h2>
      <ul>
        <li><gc-rich [text]="t('site.privacy.basisContract')" /></li>
        <li><gc-rich [text]="t('site.privacy.basisInterests')" /></li>
      </ul>
      <p>{{ t('site.privacy.basisNone') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.whereHeading') }}</h2>
      <p><gc-rich [text]="t('site.privacy.hosting')" [links]="links" /></p>
      <p><gc-rich [text]="t('site.privacy.transfer')" [links]="links" /></p>
      <p>{{ t('site.privacy.noThirdParties') }}</p>
      <p><gc-rich [text]="t('site.privacy.providers')" /></p>
    </section>

    <!-- AI apps connected with OAuth (server/oauth/, docs/adr/0024-authorization-server.md, "Notices"). -->
    <section class="panel" id="ai-apps">
      <h2>{{ t('site.privacy.appsHeading') }}</h2>
      <p>{{ t('site.privacy.appsIntro') }}</p>
      <ul>
        @for (key of apps; track key) {
          <li><gc-rich [text]="t(key)" [links]="links" /></li>
        }
      </ul>
    </section>

    <!-- Linked from the sign-up page, for everyone outside the US (pages/auth/auth-page.ts). -->
    <section class="panel" id="your-choice">
      <h2>{{ t('site.privacy.choiceHeading') }}</h2>
      <p>{{ t('site.privacy.choiceProject') }}</p>
      <p>{{ t('site.privacy.choiceNoAccount') }}</p>
      <p><gc-rich [text]="t('site.privacy.choiceOwnCopy')" [links]="links" /></p>
      <p>{{ t('site.privacy.choiceDecision') }}</p>
      <p>{{ t('site.privacy.choiceNoWarranty') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.keptHeading') }}</h2>
      <ul>
        @for (key of kept; track key) {
          <li><gc-rich [text]="t(key)" /></li>
        }
      </ul>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.rightsHeading') }}</h2>
      <p><gc-rich [text]="t('site.privacy.rightsIntro')" [links]="links" /></p>
      <ul>
        <li><gc-rich [text]="t('site.privacy.rightsExport')" /></li>
        <li><gc-rich [text]="t('site.privacy.rightsCorrect')" /></li>
        <li><gc-rich [text]="t('site.privacy.rightsDelete')" /></li>
        <li><gc-rich [text]="t('site.privacy.rightsSignOut')" /></li>
      </ul>
      <p><gc-rich [text]="t('site.privacy.rightsAsk')" [links]="links" /></p>
      <p><gc-rich [text]="t('site.privacy.rightsComplain')" [links]="links" /></p>
    </section>

    <section class="panel" id="storage">
      <h2>{{ t('site.privacy.storageHeading') }}</h2>
      <p>{{ t('site.privacy.storageIntro') }}</p>
      <div class="guide-table-scroll" tabindex="0" role="region" [attr.aria-label]="t('site.privacy.storageLabel')">
        <table class="guide-table storage-table">
          <thead>
            <tr>
              <th scope="col">{{ t('site.privacy.storageName') }}</th>
              <th scope="col">{{ t('site.privacy.storagePurpose') }}</th>
              <th scope="col">{{ t('site.privacy.storageLasts') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of storedOnDevice; track row.key) {
              <tr>
                <th scope="row">
                  <span class="storage-names" translate="no">
                    @for (name of row.names; track name) {
                      <code>{{ name }}</code>
                    }
                  </span>
                  <span class="storage-kind">{{ t(row.kind) }}</span>
                </th>
                <td><gc-rich [text]="t('site.privacy.keys.' + row.key + '.purpose')" /></td>
                <td>{{ t('site.privacy.keys.' + row.key + '.lasts') }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p>{{ t('site.privacy.storageNote') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.childrenHeading') }}</h2>
      <p>{{ t('site.privacy.children') }}</p>
    </section>

    <section class="panel">
      <h2>{{ t('site.privacy.changesHeading') }}</h2>
      <p>{{ t('site.privacy.changes') }}</p>
    </section>
  </ng-container>`,
  styles: `
    .storage-table th[scope='row'] {
      font-weight: normal;
      min-width: 9rem;
    }
    .storage-names {
      display: flex;
      flex-wrap: wrap;
      gap: 0 0.5rem;
    }
    .storage-kind {
      display: block;
      font-size: 0.85rem;
      color: var(--gc-muted);
    }
  `
})
export class PrivacyPage {
  protected readonly links = LINKS;
  protected readonly storedOnDevice = STORED;
  protected readonly stored = marker([
    'site.privacy.storedAccount',
    'site.privacy.storedShelf',
    'site.privacy.storedPrices',
    'site.privacy.storedEmailChange',
    'site.privacy.storedSignIn',
    'site.privacy.storedProviders',
    'site.privacy.storedSaved',
    'site.privacy.storedTrash',
    'site.privacy.storedShares',
    'site.privacy.storedTokens',
    'site.privacy.storedActivity',
    'site.privacy.storedLimits',
    'site.privacy.storedTrial',
    'site.privacy.storedResets',
    'site.privacy.storedLogs',
    'site.privacy.storedDeletions',
    'site.privacy.storedMail',
    'site.privacy.storedInbound'
  ]);
  protected readonly apps = marker([
    'site.privacy.appsStored',
    'site.privacy.appsFetched',
    'site.privacy.appsKept',
    'site.privacy.appsEnd',
    'site.privacy.appsTheirs'
  ]);
  protected readonly kept = marker([
    'site.privacy.keptAccount',
    'site.privacy.keptTrash',
    'site.privacy.keptShares',
    'site.privacy.keptTokens',
    'site.privacy.keptActivity',
    'site.privacy.keptLimits',
    'site.privacy.keptTrial',
    'site.privacy.keptResets',
    'site.privacy.keptSignIn',
    'site.privacy.keptProviders',
    'site.privacy.keptBackups',
    'site.privacy.keptDeletions',
    'site.privacy.keptLogs',
    'site.privacy.keptMail',
    'site.privacy.keptInbound'
  ]);
}
