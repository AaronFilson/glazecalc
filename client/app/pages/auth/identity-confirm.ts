import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { PASSKEY_NAME_MAX } from '../../../../lib/mfa';
import type { FactorProof, IdentityProof } from '../../../../lib/mfa';
import { AuthService, PROVIDER_NAMES, type ProviderId } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Check, FieldCheck, FieldChecks, filled } from '../../shared/field-checks';
import { PASSKEYS, passkeyMessage } from './passkeys';
import { serverCode, totpCheck, totpDigits } from './second-step';

type Mode = 'code' | 'recovery' | 'passkey';

/** A passkey's name: 1 to PASSKEY_NAME_MAX characters. */
export const passkeyNameCheck =
  (value: () => string): Check =>
  () => {
    const name = value().trim();
    return name && name.length <= PASSKEY_NAME_MAX
      ? null
      : translate('account.mfa.nameCheck', { most: PASSKEY_NAME_MAX });
  };

/**
 * "Confirm it is you" before any change to how the account signs in
 * (docs/mfa-plan.md, decision 6): the current password, and once two-step
 * sign-in is on, a current second step as well: a code from the authenticator
 * app, a passkey or a recovery code. It hands the proof (lib/mfa.d.ts
 * IdentityProof) to `run`, which makes the change, and shows what went wrong
 * on the field it was about. Its fields' ids start with `idPrefix`, so the
 * account page's own changes (the email, the password, deleting) can show one
 * while the two-step sign-in section shows another.
 *
 * An account with no password of its own (made with Google, GitHub or Microsoft)
 * confirms with a fresh sign-in with one of its providers instead
 * (docs/adr/0015-provider-sign-in.md): its buttons go to the provider, which
 * sends the browser back to the account page; AuthService.reauth then holds
 * the grant, good for one change within 5 minutes, which this sends in place
 * of the password.
 */
@Component({
  selector: 'gc-identity-confirm',
  imports: [FieldCheck, FormsModule, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <form class="identity-confirm" (ngSubmit)="submit()">
      @if (askName()) {
        <div class="mb-3">
          <label [for]="idPrefix() + '-name'" class="form-label">{{ t('account.mfa.name') }}</label>
          <input
            #first
            [id]="idPrefix() + '-name'"
            type="text"
            name="name"
            class="form-control"
            autocomplete="off"
            [gcFieldHint]="idPrefix() + '-name-hint'"
            [attr.maxlength]="nameMax"
            [(ngModel)]="name"
            [gcField]="checks"
            gcFieldName="name"
          />
          <div [id]="idPrefix() + '-name-hint'" class="form-text">{{ t('account.mfa.nameHint') }}</div>
        </div>
      }
      @if (passwordless()) {
        <div class="mb-3 reauth">
          @if (auth.reauth(); as held) {
            <p class="reauth-held">{{ t('account.providers.reauthHeld', { provider: names[held.provider] }) }}</p>
          } @else {
            <p>{{ t('account.providers.reauthIntro') }}</p>
            <div class="reauth-buttons">
              @for (provider of reauthProviders(); track provider) {
                <button
                  type="button"
                  class="btn btn-light border"
                  [attr.data-reauth]="provider"
                  [attr.aria-disabled]="busy() || null"
                  (click)="reauth(provider)"
                >
                  {{ t('account.providers.reauthButton', { provider: names[provider] }) }}
                </button>
              }
            </div>
          }
        </div>
      } @else {
        <div class="mb-3">
          <label [for]="idPrefix() + '-password'" class="form-label">{{ t('account.mfa.password') }}</label>
          <input
            #passwordField
            [id]="idPrefix() + '-password'"
            type="password"
            name="password"
            class="form-control"
            autocomplete="current-password"
            [(ngModel)]="password"
            [gcField]="checks"
            gcFieldName="password"
          />
        </div>
      }
      @if (mfaOn()) {
        <fieldset class="mb-3">
          <legend class="form-label">{{ t('account.mfa.factorLegend') }}</legend>
          @switch (mode()) {
            @case ('code') {
              <label [for]="idPrefix() + '-code'" class="form-label">{{ t('account.secondStep.code') }}</label>
              <input
                #factor
                [id]="idPrefix() + '-code'"
                type="text"
                name="code"
                class="form-control code-input"
                inputmode="numeric"
                autocomplete="one-time-code"
                spellcheck="false"
                [(ngModel)]="code"
                [gcField]="checks"
                gcFieldName="code"
              />
            }
            @case ('recovery') {
              <label [for]="idPrefix() + '-recovery'" class="form-label">{{
                t('account.secondStep.recoveryCode')
              }}</label>
              <input
                #factor
                [id]="idPrefix() + '-recovery'"
                type="text"
                name="recoveryCode"
                class="form-control code-input"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                [gcFieldHint]="idPrefix() + '-recovery-hint'"
                [(ngModel)]="recoveryCode"
                [gcField]="checks"
                gcFieldName="recoveryCode"
              />
              <div [id]="idPrefix() + '-recovery-hint'" class="form-text">
                {{ t('account.secondStep.recoveryHint') }}
              </div>
            }
            @case ('passkey') {
              <p class="form-text mb-0">{{ t('account.mfa.passkeyNext') }}</p>
            }
          }
          <ul class="other-ways">
            @for (other of otherModes(); track other) {
              <li>
                <button type="button" class="btn btn-link p-0" (click)="switchTo(other)">
                  @switch (other) {
                    @case ('code') {
                      {{ t('account.mfa.useApp') }}
                    }
                    @case ('passkey') {
                      {{ t('account.mfa.usePasskey') }}
                    }
                    @default {
                      {{ t('account.mfa.useRecovery') }}
                    }
                  }
                </button>
              </li>
            }
          </ul>
        </fieldset>
      }
      <div role="alert">
        @if (error(); as message) {
          <p class="errors-section">{{ message }}</p>
        }
      </div>
      <div class="confirm-buttons">
        <button type="submit" class="btn btn-primary" [attr.aria-disabled]="busy() || null">{{ action() }}</button>
        <button type="button" class="btn btn-light border" (click)="cancelled.emit()">
          {{ t('account.mfa.cancel') }}
        </button>
      </div>
    </form>
  </ng-container>`,
  styles: `
    .identity-confirm {
      max-width: 26rem;
    }
    .code-input {
      font-family: var(--bs-font-monospace, monospace);
      letter-spacing: 0.1em;
    }
    fieldset {
      border: 0;
      padding: 0;
      margin-left: 0;
      margin-right: 0;
    }
    .other-ways {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0;
    }
    .reauth-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .confirm-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `
})
export class IdentityConfirm implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly passkeys = inject(PASSKEYS);
  private readonly injector = inject(Injector);
  /** Whether two-step sign-in is on: then a current second step is asked for too. */
  readonly mfaOn = input.required<boolean>();
  /** Whether the account has an authenticator app, and passkeys, to confirm with. */
  readonly hasTotp = input(false);
  readonly hasPasskeys = input(false);
  /** The submit button's words, such as "Remove the passkey". */
  readonly action = input.required<string>();
  /** The start of the fields' ids, as in confirm-password and confirm-code. */
  readonly idPrefix = input('confirm');
  /** Asks for a passkey's name too (adding one). */
  readonly askName = input(false);
  /** Makes the change. What it throws is shown here, on the field it was about where there is one. */
  readonly run = input.required<(proof: IdentityProof, name: string) => Promise<void>>();
  readonly cancelled = output<void>();

  protected readonly nameMax = PASSKEY_NAME_MAX;
  protected readonly names = PROVIDER_NAMES;
  /** No password of its own: a fresh provider sign-in confirms instead (the account page has loaded its providers). */
  protected readonly passwordless = computed(() => this.auth.methods()?.passwordless === true);
  /** The linked providers that are on here, to sign in again with. */
  protected readonly reauthProviders = computed((): ProviderId[] => {
    const methods = this.auth.methods();
    if (!methods) return [];
    return methods.linked.map((l) => l.provider).filter((provider) => methods.enabled.includes(provider));
  });
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly code = signal('');
  protected readonly recoveryCode = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly mode = signal<Mode>('recovery');

  private readonly canPasskey = computed(() => this.hasPasskeys() && this.passkeys.supported());
  protected readonly otherModes = computed(() => {
    const modes: Mode[] = [];
    if (this.hasTotp()) modes.push('code');
    if (this.canPasskey()) modes.push('passkey');
    modes.push('recovery');
    return modes.filter((mode) => mode !== this.mode());
  });

  protected readonly checks = new FieldChecks((): Record<string, Check> => {
    const checks: Record<string, Check> = {};
    if (this.askName()) checks['name'] = passkeyNameCheck(this.name);
    if (!this.passwordless()) checks['password'] = filled(this.password, translate('account.account.currentMissing'));
    if (this.mfaOn() && this.mode() === 'code') checks['code'] = totpCheck(this.code);
    if (this.mfaOn() && this.mode() === 'recovery') {
      checks['recoveryCode'] = filled(this.recoveryCode, translate('account.secondStep.recoveryMissing'));
    }
    return checks;
  });

  private readonly first = viewChild<ElementRef<HTMLElement>>('first');
  private readonly passwordField = viewChild<ElementRef<HTMLElement>>('passwordField');
  private readonly factor = viewChild<ElementRef<HTMLElement>>('factor');

  constructor() {
    // Closed while a passkey prompt is open (Cancel, or the section reloaded): the prompt goes too.
    inject(DestroyRef).onDestroy(() => {
      if (this.busy()) this.passkeys.cancel();
    });
  }

  ngOnInit(): void {
    this.mode.set(this.hasTotp() ? 'code' : this.canPasskey() ? 'passkey' : 'recovery');
    afterNextRender(() => (this.first() ?? this.passwordField())?.nativeElement.focus(), { injector: this.injector });
  }

  protected switchTo(mode: Mode): void {
    this.mode.set(mode);
    this.error.set('');
    this.checks.clear('code');
    this.checks.clear('recoveryCode');
    afterNextRender(() => this.factor()?.nativeElement.focus(), { injector: this.injector });
  }

  protected async submit(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    const held = this.passwordless() ? this.auth.reauth() : null;
    if (this.passwordless() && !held) return this.error.set(translate('account.providers.reauthFirst'));
    this.busy.set(true);
    this.error.set('');
    try {
      const factor = this.mfaOn() ? await this.factorProof() : {};
      const owner = held ? { reauth: held.grant } : { password: this.password() };
      await this.run()({ ...owner, ...factor } as IdentityProof, this.name().trim());
      // A provider sign-in confirms one change.
      if (held) this.auth.holdReauth(null);
      this.password.set('');
      this.code.set('');
      this.recoveryCode.set('');
    } catch (err) {
      this.failed(err);
    } finally {
      this.busy.set(false);
    }
  }

  /** Off to the provider to sign in again; it sends the browser back to the account page. */
  protected async reauth(provider: ProviderId): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      window.location.assign(await this.auth.startReauth(provider, window.location.pathname));
    } catch (err) {
      this.error.set(errorMessage(err, translate('account.providers.reauthFailed')));
      this.busy.set(false);
    }
  }

  private async factorProof(): Promise<FactorProof> {
    switch (this.mode()) {
      case 'code':
        return { code: totpDigits(this.code()) };
      case 'passkey':
        return { passkey: await this.passkeys.authenticate(await this.auth.mfaConfirmOptions()) };
      default:
        return { recoveryCode: this.recoveryCode().trim() };
    }
  }

  /** Shows what went wrong on the field it was about, or above the buttons. */
  private failed(err: unknown): void {
    const message = passkeyMessage(err, translate('account.mfa.failed'));
    const field = (err as { error?: { field?: unknown } }).error?.field;
    switch (serverCode(err)) {
      case 'provider-reauth-needed':
        // Used, run out or refused: sign in again.
        this.auth.holdReauth(null);
        break;
      case 'current-password-wrong':
      case 'current-password-needed':
        this.password.set('');
        return this.checks.report('password', message);
      case 'code-wrong':
      case 'code-needed':
        if (this.mode() !== 'code') break;
        this.code.set('');
        return this.checks.report('code', message);
      case 'recovery-code-wrong':
        if (this.mode() !== 'recovery') break;
        return this.checks.report('recoveryCode', message);
      case 'passkey-name':
        if (!this.askName()) break;
        return this.checks.report('name', message);
    }
    if (field === 'password') {
      this.password.set('');
      return this.checks.report('password', message);
    }
    this.error.set(message);
  }
}
