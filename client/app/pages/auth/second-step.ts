import { HttpErrorResponse } from '@angular/common/http';
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
  linkedSignal,
  output,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { SECOND_STEP_MINUTES, TOTP_DIGITS } from '../../../../lib/mfa';
import type { FactorProof, SecondStepFailure, SecondStepResponse } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Check, FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import { PASSKEYS, passkeyMessage } from './passkeys';

type Mode = 'code' | 'recovery' | 'passkey';

/** The message code of a failed request (server/lib/messages.ts), if it has one. */
export function serverCode(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const code = (err.error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * A code from an authenticator app: its digits, spaces and dashes left out
 * (apps show "123 456"; − and ー are what input methods may give for "-"), and
 * full-width digits from an input method made plain (NFKC), as the server
 * (server/lib/totp.ts) takes them.
 */
export const totpDigits = (value: string): string => value.normalize('NFKC').replace(/[\s\p{Pd}−ー]+/gu, '');

/** The check for an authenticator app's code: the right number of digits. */
export const totpCheck =
  (value: () => string): Check =>
  () =>
    new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(totpDigits(value()))
      ? null
      : translate('account.secondStep.codeFormat', { digits: TOTP_DIGITS });

/**
 * The second step of signing in to an account with two-step sign-in
 * (docs/mfa-plan.md, item 12): a code from the authenticator app, a passkey,
 * or a recovery code. The pending token arrives in `step` and lives only in
 * this component and the page's memory: a reload goes back to the password.
 * After SECOND_STEP_MINUTES, or when the server says the step has run out or
 * had too many wrong codes, it asks the page to start over with why.
 */
@Component({
  selector: 'gc-second-step',
  imports: [FieldCheck, FormsModule, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <p class="second-step-lead">{{ lead() }}</p>
    <div role="alert">
      @if (error(); as message) {
        <p class="errors-section">{{ message }}</p>
      }
    </div>
    @switch (mode()) {
      @case ('code') {
        <form (ngSubmit)="sendCode()">
          <div class="mb-3">
            <label for="second-code" class="form-label">{{ t('account.secondStep.code') }}</label>
            <input
              #first
              id="second-code"
              type="text"
              name="code"
              class="form-control code-input"
              inputmode="numeric"
              autocomplete="one-time-code"
              spellcheck="false"
              aria-describedby="second-code-hint"
              [(ngModel)]="code"
              [gcField]="checks"
              gcFieldName="code"
            />
            <div id="second-code-hint" class="form-text">
              {{ t('account.secondStep.codeHint', { digits: digits }) }}
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-100" [attr.aria-disabled]="busy() || null">
            {{ t('account.secondStep.finish') }}
          </button>
        </form>
      }
      @case ('recovery') {
        <form (ngSubmit)="sendRecoveryCode()">
          <div class="mb-3">
            <label for="second-recovery" class="form-label">{{ t('account.secondStep.recoveryCode') }}</label>
            <input
              #first
              id="second-recovery"
              type="text"
              name="recoveryCode"
              class="form-control code-input"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              aria-describedby="second-recovery-hint"
              [(ngModel)]="recoveryCode"
              [gcField]="checks"
              gcFieldName="recoveryCode"
            />
            <div id="second-recovery-hint" class="form-text">{{ t('account.secondStep.recoveryHint') }}</div>
          </div>
          <button type="submit" class="btn btn-primary w-100" [attr.aria-disabled]="busy() || null">
            {{ t('account.secondStep.finish') }}
          </button>
        </form>
      }
    }
    @if (canPasskey()) {
      <button
        #passkeyButton
        type="button"
        class="btn w-100 passkey-button"
        [class.btn-primary]="mode() === 'passkey'"
        [class.btn-outline-secondary]="mode() !== 'passkey'"
        [attr.aria-disabled]="busy() || null"
        (click)="usePasskey()"
      >
        {{ t('account.secondStep.usePasskey') }}
      </button>
    } @else if (step().methods.passkey) {
      <p class="form-text no-passkeys">{{ t('account.secondStep.noPasskeysHere') }}</p>
    }
    <ul class="other-ways">
      @if (mode() !== 'recovery') {
        <li>
          <button type="button" class="btn btn-link p-0" (click)="switchTo('recovery')">
            {{ t('account.secondStep.useRecovery') }}
          </button>
        </li>
      }
      @if (mode() !== 'code' && step().methods.totp) {
        <li>
          <button type="button" class="btn btn-link p-0" (click)="switchTo('code')">
            {{ t('account.secondStep.useApp') }}
          </button>
        </li>
      }
      <li>
        <button type="button" class="btn btn-link p-0 start-over" (click)="startOver.emit(null)">
          {{ t('account.secondStep.startOver') }}
        </button>
      </li>
    </ul>
    <p class="form-text">{{ t('account.secondStep.reloadNote', { minutes: minutes }) }}</p>
  </ng-container>`,
  styles: `
    .code-input {
      font-family: var(--bs-font-monospace, monospace);
      letter-spacing: 0.1em;
    }
    .passkey-button {
      margin-top: 1rem;
    }
    .other-ways {
      list-style: none;
      padding: 0;
      margin: 1.25rem 0 0;
    }
    .other-ways li + li {
      margin-top: 0.25rem;
    }
  `
})
export class SecondStep implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly passkeys = inject(PASSKEYS);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** The password step's reply: the methods, and the pending token. */
  readonly step = input.required<SecondStepResponse>();
  /** Signed in: how many records a trial on this browser brought. */
  readonly signedIn = output<number>();
  /** Back to the password, with what to say (null when the person chose to). */
  readonly startOver = output<string | null>();

  protected readonly digits = TOTP_DIGITS;
  protected readonly minutes = SECOND_STEP_MINUTES;
  protected readonly code = signal('');
  protected readonly recoveryCode = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly mode = signal<Mode>('code');
  /** The passkey challenge to answer: a passkey try uses one up, and a failed one brings the next. */
  private readonly passkeyOptions = linkedSignal(() => this.step().passkeyOptions);
  protected readonly canPasskey = computed(
    () => this.step().methods.passkey && !!this.passkeyOptions() && this.passkeys.supported()
  );
  protected readonly checks = new FieldChecks((): Record<string, Check> =>
    this.mode() === 'code'
      ? { code: totpCheck(this.code) }
      : this.mode() === 'recovery'
        ? { recoveryCode: required(this.recoveryCode, translate('account.secondStep.recoveryMissing')) }
        : {}
  );
  protected readonly lead = computed(() => {
    switch (this.mode()) {
      case 'code':
        return translate('account.secondStep.leadCode');
      case 'passkey':
        return translate('account.secondStep.leadPasskey');
      default:
        return translate('account.secondStep.leadRecovery');
    }
  });

  private readonly first = viewChild<ElementRef<HTMLElement>>('first');
  private readonly passkeyButton = viewChild<ElementRef<HTMLElement>>('passkeyButton');

  ngOnInit(): void {
    const { methods } = this.step();
    this.mode.set(methods.totp ? 'code' : this.canPasskey() ? 'passkey' : 'recovery');
    this.focusFirst();
    // The server's own clock decides; counting from now keeps a wrong clock here from ending it early.
    // While a passkey or a code is under way, its answer decides instead: this waits for it.
    let timer: ReturnType<typeof setTimeout>;
    const expire = (): void => {
      if (this.busy()) timer = setTimeout(expire, 1000);
      else this.startOver.emit(translate('account.secondStep.expired'));
    };
    timer = setTimeout(expire, this.minutes * 60_000);
    this.destroyRef.onDestroy(() => {
      clearTimeout(timer);
      // A passkey prompt still open would answer a step that is gone.
      if (this.busy()) this.passkeys.cancel();
    });
  }

  protected switchTo(mode: Mode): void {
    this.mode.set(mode);
    this.error.set('');
    this.checks.clear();
    this.focusFirst();
  }

  protected async sendCode(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    await this.finish({ code: totpDigits(this.code()) });
  }

  protected async sendRecoveryCode(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    await this.finish({ recoveryCode: this.recoveryCode().trim() });
  }

  protected async usePasskey(): Promise<void> {
    const options = this.passkeyOptions();
    if (this.busy() || !options) return;
    this.busy.set(true);
    this.error.set('');
    let response;
    try {
      response = await this.passkeys.authenticate(options);
    } catch (err) {
      this.error.set(passkeyMessage(err, translate('account.auth.signInFailed')));
      this.busy.set(false);
      return;
    }
    this.busy.set(false);
    await this.finish({ passkey: response });
  }

  private async finish(proof: FactorProof): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.signedIn.emit(await this.auth.finishSignIn(this.step().pending, proof));
    } catch (err) {
      const message = errorMessage(err, translate('account.auth.signInFailed'));
      const code = serverCode(err);
      const next =
        err instanceof HttpErrorResponse ? (err.error as SecondStepFailure | null)?.passkeyOptions : undefined;
      if (next) this.passkeyOptions.set(next);
      if (code === 'second-step-expired' || code === 'second-step-tries') {
        this.startOver.emit(message);
      } else if ((code === 'code-wrong' || code === 'code-needed') && 'code' in proof) {
        this.code.set('');
        this.checks.report('code', message);
      } else if (code === 'recovery-code-wrong' && 'recoveryCode' in proof) {
        this.checks.report('recoveryCode', message);
      } else {
        this.error.set(message);
      }
    } finally {
      this.busy.set(false);
    }
  }

  /** The focus goes to the field (or the passkey button) the step now asks for. */
  private focusFirst(): void {
    afterNextRender(() => (this.first() ?? this.passkeyButton())?.nativeElement.focus(), { injector: this.injector });
  }
}
