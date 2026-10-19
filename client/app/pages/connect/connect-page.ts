import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { OPEN_PAGE } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

/** What the consent API says about the app asking (server/oauth/interactions.ts). */
export interface ConnectRequest {
  uid: string;
  client: {
    name: string | null;
    source: 'cimd' | 'dcr';
    /** The app's own host, checked: only for an app named by its address (CIMD). */
    host: string | null;
    /** An app that registered itself (DCR): its name is only its own word. */
    selfDescribed: boolean;
  };
  redirect: {
    /** 'https:', 'http:', or an app's own scheme ('cursor:'). */
    scheme: string;
    /** For http and https only. */
    host: string | null;
    /** The person's own computer. */
    loopback: boolean;
    /** An app's own scheme, the whole address: whichever app opens it gets the answer. */
    app: string | null;
  };
  /** An app named by its address that sends the answer to another host. */
  redirectElsewhere: boolean;
  writeRequested: boolean;
  expiresAt: string;
}

/**
 * The consent page (docs/adr/0024-authorization-server.md): an AI app asked to
 * connect to the account, and the authorization server sent the browser here
 * by way of /api/connect/:uid. It says plainly who is asking and where the
 * answer goes: the app's name (marked when it is only the app's own word), its
 * checked address, where the answer goes, with a warning when that is the
 * person's own computer, an app's own link scheme, or another host than the
 * app's. Reading is what it gets; changing records is a separate box, never
 * ticked for the person. Allow and Don't allow send the answer, and the
 * browser goes where the answer says (back to the app). Nothing here is
 * focused or chosen for the person.
 *
 * A visitor who is not signed in signs in first and comes back
 * (signInThenBackGuard); a trial or an unconfirmed email gets the API's
 * refusal, in words.
 */
@Component({
  selector: 'gc-connect-page',
  imports: [PageHeader, RichText, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('account.connect.title')" />

    @if (refusal(); as message) {
      <section class="panel">
        <p class="errors-section" role="alert">{{ message }}</p>
        <p>
          <a routerLink="/account">{{ t('account.connect.toAccount') }}</a>
        </p>
      </section>
    } @else if (answered()) {
      <section class="panel">
        <p role="status">{{ t('account.connect.sending') }}</p>
      </section>
    } @else if (request(); as r) {
      <section class="panel connect" aria-labelledby="connect-app">
        <p class="small muted">{{ t('account.connect.asking') }}</p>
        <h2 id="connect-app" class="app-name">
          {{ r.client.name || t('account.connect.noName') }}
          @if (r.client.selfDescribed) {
            <span class="badge-self">{{ t('account.connect.selfDescribed') }}</span>
          }
        </h2>
        @if (r.client.selfDescribed) {
          <p class="small">{{ t('account.connect.selfDescribedNote') }}</p>
        }
        @if (auth.email(); as email) {
          <p class="small muted">{{ t('account.connect.account', { email }) }}</p>
        }

        <dl class="hosts">
          @if (r.client.host) {
            <dt>{{ t('account.connect.appAddress') }}</dt>
            <dd>
              <strong class="host">{{ r.client.host }}</strong>
              <span class="small muted"> {{ t('account.connect.checked') }}</span>
            </dd>
          }
          <dt>{{ t('account.connect.answerTo') }}</dt>
          <dd>
            @if (r.redirect.loopback) {
              <strong>{{ t('account.connect.ownComputer') }}</strong>
              <span class="host"> ({{ r.redirect.host }})</span>
            } @else if (r.redirect.app) {
              <strong>{{ t('account.connect.appOnDevice', { scheme: r.redirect.scheme }) }}</strong>
              <span class="host address"> {{ r.redirect.app }}</span>
            } @else {
              <strong class="host">{{ r.redirect.host }}</strong>
            }
          </dd>
        </dl>

        @if (r.redirect.loopback) {
          <div class="warning" role="note">
            <p>{{ t('account.connect.loopbackWarning') }}</p>
            @if (r.writeRequested) {
              <p>{{ t('account.connect.loopbackWriteWarning') }}</p>
            }
          </div>
        }
        @if (r.redirect.app) {
          <div class="warning" role="note">
            <p>{{ t('account.connect.appSchemeWarning', { scheme: r.redirect.scheme }) }}</p>
          </div>
        }
        @if (r.redirectElsewhere) {
          <div class="warning" role="note">
            <p>
              {{ t('account.connect.elsewhereWarning', { app: r.client.host, answer: r.redirect.host }) }}
            </p>
          </div>
        }

        <h3 class="h5">{{ t('account.connect.canHeading') }}</h3>
        <p>{{ t('account.connect.canRead') }}</p>
        @if (r.writeRequested) {
          <div class="write-choice">
            <input
              type="checkbox"
              id="connect-write"
              #writeBox
              [checked]="write()"
              (change)="write.set(writeBox.checked)"
              aria-describedby="connect-write-warning"
            />
            <label for="connect-write">{{ t('account.connect.alsoWrite') }}</label>
            <p id="connect-write-warning" class="small write-warning">{{ t('account.connect.writeWarning') }}</p>
          </div>
        } @else {
          <p class="small muted">{{ t('account.connect.readOnly') }}</p>
        }

        <p class="small">
          <gc-rich
            [text]="t('account.connect.privacy')"
            [links]="{ privacy: '/privacy#ai-apps', apps: '/account/apps' }"
          />
        </p>

        <div class="answer">
          <button type="button" class="btn btn-primary" [attr.aria-disabled]="busy() || null" (click)="decide('allow')">
            {{ t('account.connect.allow') }}
          </button>
          <button
            type="button"
            class="btn btn-light border"
            [attr.aria-disabled]="busy() || null"
            (click)="decide('deny')"
          >
            {{ t('account.connect.deny') }}
          </button>
        </div>
        @if (failed(); as message) {
          <p class="errors-section" role="alert">{{ message }}</p>
        }
      </section>
    } @else {
      <section class="panel">
        <p class="muted" role="status">{{ t('account.connect.loading') }}</p>
      </section>
    }
  </ng-container>`,
  styles: `
    .app-name {
      overflow-wrap: anywhere;
    }
    .badge-self {
      display: inline-block;
      vertical-align: middle;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--gc-border);
      background: var(--gc-surface-2);
      color: var(--gc-text);
    }
    .hosts dt {
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .hosts dd {
      margin: 0;
    }
    .host {
      overflow-wrap: anywhere;
    }
    .address {
      display: block;
      font-family: var(--bs-font-monospace, monospace);
    }
    .warning,
    .write-warning {
      background: var(--gc-danger-bg);
      color: var(--gc-danger-text);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      margin-bottom: 1rem;
    }
    .warning p:last-child {
      margin-bottom: 0;
    }
    .write-choice {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.5rem;
      margin-bottom: 1rem;
    }
    .write-choice label {
      font-weight: 600;
    }
    .write-choice .write-warning {
      flex-basis: 100%;
      margin: 0;
    }
    .answer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `
})
export class ConnectPage {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly openPage = inject(OPEN_PAGE);
  private readonly uid = String(inject(ActivatedRoute).snapshot.paramMap.get('uid') ?? '');

  /** What the app asked, once loaded. */
  protected readonly request = signal<ConnectRequest | null>(null);
  /** The API's refusal (a trial, an unconfirmed email, a request that ended), in words. */
  protected readonly refusal = signal<string | null>(null);
  /** An answer that could not be sent. */
  protected readonly failed = signal<string | null>(null);
  /** "Also let it change my records": never ticked for the person. */
  protected readonly write = signal(false);
  protected readonly busy = signal(false);
  /** Answered: the browser is on its way back to the app. */
  protected readonly answered = signal(false);
  private readonly address = computed(() => this.apiBase + '/connect/' + encodeURIComponent(this.uid));

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.request.set(
        await firstValueFrom(this.http.get<ConnectRequest>(this.address(), { headers: { accept: 'application/json' } }))
      );
    } catch (err) {
      this.refusal.set(errorMessage(err, translate('account.connect.loadFailed')));
    }
  }

  protected async decide(decision: 'allow' | 'deny'): Promise<void> {
    const request = this.request();
    if (this.busy() || !request) return;
    this.busy.set(true);
    this.failed.set(null);
    try {
      const body = { decision, write: decision === 'allow' && request.writeRequested && this.write() };
      const { redirectTo } = await firstValueFrom(this.http.post<{ redirectTo: string }>(this.address(), body));
      this.answered.set(true);
      this.openPage(redirectTo);
    } catch (err) {
      const message = errorMessage(err, translate('account.connect.answerFailed'));
      // A refusal of the whole request (it ended, or the account may not connect) replaces the page.
      if (err && typeof err === 'object' && 'status' in err && (err.status === 403 || err.status === 404)) {
        this.refusal.set(message);
      } else {
        this.failed.set(message);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
