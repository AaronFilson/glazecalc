import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import type { IdentityProof, MfaSummary } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { TokensService } from '../../core/tokens.service';
import { Check, FieldCheck, FieldChecks } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { IdentityConfirm } from '../auth/identity-confirm';
import { serverCode } from '../auth/second-step';

/** The longest name a token may have (server/routes/token_routes.ts TOKEN_NAME_MAX). */
export const TOKEN_NAME_MAX = 100;

/** A token's name: 1 to TOKEN_NAME_MAX characters. */
const nameCheck =
  (value: () => string): Check =>
  () => {
    const name = value().trim();
    return name && name.length <= TOKEN_NAME_MAX
      ? null
      : translate('account.tokens.nameCheck', { most: TOKEN_NAME_MAX });
  };

/**
 * "Access tokens" on the account page (docs/integrations-plan.md, item 27):
 * tokens the person makes for their own AI assistant or script, to read their
 * records ("Read only", the default) or to read and change them ("Read and
 * change", for a shorter time: the server sends the lifetimes each may have).
 * Making one asks for the password (for an
 * account with no password, a fresh sign-in with Google, GitHub or Microsoft) and, with
 * two-step sign-in on, a second step (IdentityConfirm), as other changes to
 * how the account is reached do. The new token is shown once, to copy; the
 * list of tokens, with Revoke, is on Connected apps (connections-page.ts),
 * which this links to. A trial has no section (the account page
 * leaves it out), and an account whose email is not yet confirmed is asked
 * to confirm it first, with the link sent again on request.
 */
@Component({
  selector: 'gc-tokens-section',
  imports: [FieldCheck, FormsModule, IdentityConfirm, NoticesList, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="auth-text tokens-section" aria-labelledby="tokens-heading">
      <h2 id="tokens-heading" tabindex="-1">{{ t('account.tokens.heading') }}</h2>
      <p>{{ t('account.tokens.intro') }}</p>
      <p>
        <a routerLink="/assistants">{{ t('account.tokens.howTo') }}</a>
      </p>
      <!-- The list of tokens, with Revoke, is on Connected apps. -->
      <p class="see-apps">
        {{ t('account.tokens.seeThem') }}
        <a routerLink="/account/apps">{{ t('account.tokens.seeThemLink') }}</a>
      </p>
      <gc-notices [notices]="notices" />

      @if (made(); as token) {
        <div class="new-token-panel">
          <h3 id="new-token-heading" tabindex="-1" #panelHeading>{{ t('account.tokens.newHeading') }}</h3>
          <p>{{ madeCanWrite() ? t('account.tokens.newTextWrite') : t('account.tokens.newText') }}</p>
          <label for="new-token" class="form-label">{{ t('account.tokens.newLabel') }}</label>
          <input
            id="new-token"
            class="form-control new-token"
            type="text"
            dir="ltr"
            readonly
            [value]="token"
            (focus)="selectAll($event)"
            spellcheck="false"
            autocomplete="off"
          />
          <div class="panel-buttons">
            <button type="button" class="btn btn-light border" (click)="copy(token)">
              {{ t('account.tokens.copy') }}
            </button>
            <button type="button" class="btn btn-primary" (click)="done()">{{ t('account.tokens.done') }}</button>
          </div>
          <p role="status" class="form-text copied">{{ copied() }}</p>
        </div>
      }

      @if (loadFailed()) {
        <p class="help-text">{{ t('account.tokens.loadFailed') }}</p>
      } @else if (service.list(); as list) {
        <h3 class="h5 mt-4" id="token-create-heading">{{ t('account.tokens.createHeading') }}</h3>
        @if (auth.unverified()) {
          <!-- Only with a confirmed email (owner decision): the server refuses one before. -->
          <p class="needs-email">{{ t('account.tokens.confirmEmailFirst', { email: auth.email() }) }}</p>
          <button
            type="button"
            class="btn btn-light border resend-confirmation"
            [attr.aria-disabled]="busy() || null"
            (click)="resend()"
          >
            {{ t('account.tokens.resend') }}
          </button>
        } @else if (service.working().length >= list.most) {
          <p class="help-text">{{ t('account.tokens.limit', { most: list.most }) }}</p>
        } @else {
          <form class="account-form" (ngSubmit)="start()">
            <div class="mb-3">
              <label for="token-name" class="form-label">{{ t('account.tokens.name') }}</label>
              <input
                id="token-name"
                type="text"
                name="tokenName"
                class="form-control"
                autocomplete="off"
                [attr.maxlength]="nameMax"
                [gcFieldHint]="'token-name-hint'"
                [(ngModel)]="name"
                [gcField]="checks"
                gcFieldName="name"
              />
              <div id="token-name-hint" class="form-text">{{ t('account.tokens.nameHint') }}</div>
            </div>
            <fieldset class="mb-3">
              <legend class="form-label scope-legend">{{ t('account.tokens.scope') }}</legend>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  name="tokenScope"
                  id="token-scope-read"
                  value="data:read"
                  aria-describedby="token-scope-read-hint"
                  [ngModel]="scope()"
                  (ngModelChange)="chooseScope($event)"
                />
                <label class="form-check-label" for="token-scope-read">{{ t('account.tokens.readOnly') }}</label>
                <div id="token-scope-read-hint" class="form-text">{{ t('account.tokens.scopeNote') }}</div>
              </div>
              @if (list.scopes.includes('data:write')) {
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="tokenScope"
                    id="token-scope-write"
                    value="data:write"
                    aria-describedby="token-scope-write-hint"
                    [ngModel]="scope()"
                    (ngModelChange)="chooseScope($event)"
                  />
                  <label class="form-check-label" for="token-scope-write">{{ t('account.tokens.readWrite') }}</label>
                  <div id="token-scope-write-hint" class="form-text">{{ t('account.tokens.scopeWriteNote') }}</div>
                </div>
              }
            </fieldset>
            @if (scope() === 'data:write') {
              <div class="form-check mb-3">
                <input
                  class="form-check-input"
                  type="checkbox"
                  name="tokenNoConfirm"
                  id="token-no-confirm"
                  aria-describedby="token-no-confirm-hint"
                  [(ngModel)]="noConfirm"
                />
                <label class="form-check-label" for="token-no-confirm">{{ t('account.tokens.noConfirm') }}</label>
                <div id="token-no-confirm-hint" class="form-text">{{ t('account.tokens.noConfirmHint') }}</div>
              </div>
            }
            <div class="mb-3">
              <label for="token-days" class="form-label">{{ t('account.tokens.expiry') }}</label>
              <select id="token-days" name="tokenDays" class="form-select" [(ngModel)]="days">
                @for (choice of expiryChoices(); track choice) {
                  <option [ngValue]="choice">{{ t('account.tokens.days', { count: choice }) }}</option>
                }
              </select>
              <div class="form-text">
                {{ t('account.tokens.expiryHint') }}
                @if (scope() === 'data:write') {
                  {{ t('account.tokens.expiryWriteHint', { count: writeMost() }) }}
                }
              </div>
            </div>
            @if (!confirming()) {
              <button
                id="token-submit"
                type="submit"
                class="btn btn-light border"
                [attr.aria-disabled]="busy() || null"
              >
                {{ t('account.mfa.continue') }}
              </button>
            }
          </form>
          @if (confirming()) {
            <div class="account-form confirm-step">
              <p>{{ t('account.tokens.confirmStep') }}</p>
              <gc-identity-confirm
                idPrefix="token-confirm"
                [mfaOn]="!!mfa()?.on"
                [hasTotp]="!!mfa()?.totp"
                [hasPasskeys]="!!mfa()?.passkeys?.length"
                [action]="t('account.tokens.create')"
                [run]="runConfirmed"
                (cancelled)="cancelConfirm()"
              />
            </div>
          }
        }
      }
    </section>
  </ng-container>`,
  styles: `
    .account-form {
      max-width: 26rem;
    }
    .scope-legend {
      font-size: inherit;
    }
    .new-token-panel {
      border: 1px solid var(--bs-border-color);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .new-token {
      font-family: var(--bs-font-monospace);
    }
    .panel-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
  `
})
export class TokensSection implements OnInit {
  protected readonly service = inject(TokensService);
  protected readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  /** The two-step sign-in section's summary, once it has loaded: whether a second step is asked for too. */
  readonly mfa = input<MfaSummary | null>(null);

  protected readonly notices = new Notices();
  protected readonly nameMax = TOKEN_NAME_MAX;
  protected readonly name = signal('');
  protected readonly days = signal(30);
  /** What the new token may do: read only (the default), or read and change. */
  protected readonly scope = signal<'data:read' | 'data:write'>('data:read');
  /** "Changes from this token need no confirmation" (docs/adr/0025): unticked, and only for a token that can change records. */
  protected readonly noConfirm = signal(false);
  /** Whether the token just made can change records, for the words beside it. */
  protected readonly madeCanWrite = signal(false);
  /** The lifetimes the chosen scope may have: a token that changes records has the shorter ones. */
  protected readonly expiryChoices = computed(() => {
    const list = this.service.list();
    if (!list) return [];
    return this.scope() === 'data:write' ? (list.writeExpiryDays ?? []) : list.expiryDays;
  });
  /** The longest a token that changes records may last. */
  protected readonly writeMost = computed(() => Math.max(0, ...(this.service.list()?.writeExpiryDays ?? [])));
  protected readonly busy = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly confirming = signal(false);
  /** The token just made, shown until "Done"; kept nowhere else. */
  protected readonly made = signal<string | null>(null);
  protected readonly copied = signal('');
  protected readonly checks = new FieldChecks(() => ({ name: nameCheck(this.name) }));
  private readonly panelHeading = viewChild<ElementRef<HTMLElement>>('panelHeading');

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.service.load();
      this.days.set(list.defaultDays);
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** Chooses what the token may do; a lifetime the choice does not allow becomes its longest. */
  protected chooseScope(scope: 'data:read' | 'data:write'): void {
    this.scope.set(scope);
    const choices = this.expiryChoices();
    if (choices.length && !choices.includes(this.days())) this.days.set(Math.max(...choices));
  }

  protected start(): void {
    if (this.busy() || !this.checks.validate()) return;
    this.confirming.set(true);
  }

  protected cancelConfirm(): void {
    this.confirming.set(false);
    afterNextRender(() => document.getElementById('token-submit')?.focus(), { injector: this.injector });
  }

  /** Makes the token once IdentityConfirm has the proof; a problem with the name closes the step and shows there. */
  protected readonly runConfirmed = async (proof: IdentityProof): Promise<void> => {
    if (!this.checks.validate()) {
      this.confirming.set(false);
      return;
    }
    try {
      const write = this.scope() === 'data:write';
      const { token } = await this.service.create(
        this.name().trim(),
        this.days(),
        proof,
        this.scope(),
        write && this.noConfirm()
      );
      this.confirming.set(false);
      this.madeCanWrite.set(this.scope() === 'data:write');
      this.name.set('');
      this.scope.set('data:read');
      this.noConfirm.set(false);
      this.copied.set('');
      this.made.set(token);
      afterNextRender(() => this.panelHeading()?.nativeElement.focus(), { injector: this.injector });
    } catch (err) {
      switch (serverCode(err)) {
        case 'token-name':
          this.confirming.set(false);
          this.checks.report('name', errorMessage(err, translate('account.tokens.failed')));
          return;
        case 'token-needs-confirmed-email':
          this.auth.unverified.set(true);
          this.confirming.set(false);
          this.notices.error(errorMessage(err, translate('account.tokens.failed')));
          return;
        case 'token-limit':
        case 'token-expiry-choices':
        case 'token-write-expiry':
        case 'token-scope-choices':
          this.confirming.set(false);
          this.notices.error(errorMessage(err, translate('account.tokens.failed')));
          return;
      }
      throw err;
    }
  };

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected async copy(text: string): Promise<void> {
    this.copied.set('');
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(translate('account.tokens.copied'));
    } catch {
      this.copied.set(translate('account.tokens.copyFailed'));
    }
  }

  /** Forgets the new token: it is not shown again. */
  protected done(): void {
    this.made.set(null);
    this.copied.set('');
    afterNextRender(() => document.getElementById('tokens-heading')?.focus(), { injector: this.injector });
  }

  /** Sends the confirmation link again, as the account page's own "Confirm your email" does. */
  protected async resend(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      this.notices.success(await this.auth.resendVerification());
    } catch (err) {
      this.notices.error(errorMessage(err, translate('account.account.resendFailed')));
    } finally {
      this.busy.set(false);
    }
  }
}
