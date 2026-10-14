import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { map } from 'rxjs';
import type { AuthenticationResponseJSON, SecondStepResponse } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { RichText } from '../../i18n/rich-text';
import { FieldCheck, FieldChecks, emailAddress, filled, newPassword, samePassword } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { PASSKEYS, passkeyMessage } from './passkeys';
import { SecondStep } from './second-step';

/**
 * Sign in and sign up share this page; the route's data.mode picks one. During a
 * trial, signing up turns the trial into the account, keeping its work.
 *
 * Signing in to an account with two-step sign-in takes a second step after the
 * password (SecondStep). Where the browser has passkeys, the sign-in form also
 * offers "Sign in with a passkey", and the email field's suggestions offer the
 * passkeys saved for this site (conditional mediation), either of which signs
 * in without the password (docs/mfa-plan.md, items 12 and 17).
 */
@Component({
  selector: 'gc-auth-page',
  imports: [FieldCheck, FormsModule, NoticesList, RichText, RouterLink, SecondStep, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="auth-card">
      <gc-notices [notices]="notices" />
      <section class="auth-text">
        <h1>{{ heading() }}</h1>
        <p class="muted">{{ lead() }}</p>
        @if (!signup() && auth.lostRecipe(); as title) {
          <p class="errors-section" role="alert">{{ t('signedOut.recipeLost', { title }) }}</p>
        }
        @if (secondStep(); as step) {
          <gc-second-step [step]="step" (signedIn)="signedIn()" (startOver)="startOver($event)" />
        } @else {
          @if (!signup() && auth.trial(); as trial) {
            <p class="trial-note">
              <gc-rich [text]="t('account.auth.trialNote', { name: trial.name })" [links]="{ signup: '/signup' }" />
            </p>
          }

          <form (ngSubmit)="submit()">
            <div class="mb-3">
              <label for="email" class="form-label">{{ t('account.auth.email') }}</label>
              <input
                id="email"
                type="email"
                name="email"
                class="form-control"
                required
                [attr.autocomplete]="signup() ? 'username' : 'username webauthn'"
                [(ngModel)]="email"
                [gcField]="checks"
                gcFieldName="email"
              />
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">{{ t('account.auth.password') }}</label>
              <input
                #passwordField
                id="password"
                type="password"
                name="password"
                class="form-control"
                required
                [attr.minlength]="signup() ? 8 : null"
                [attr.autocomplete]="signup() ? 'new-password' : 'current-password'"
                [(ngModel)]="password"
                [gcField]="checks"
                gcFieldName="password"
              />
              @if (signup()) {
                <div class="form-text">{{ t('account.auth.passwordHint') }}</div>
              }
            </div>
            @if (signup()) {
              <div class="mb-3">
                <label for="confirmation" class="form-label">{{ t('account.auth.confirmation') }}</label>
                <input
                  id="confirmation"
                  type="password"
                  name="confirmation"
                  class="form-control"
                  required
                  autocomplete="new-password"
                  [(ngModel)]="confirmation"
                  [gcField]="checks"
                  gcFieldName="confirmation"
                />
              </div>
            }
            <div class="form-check mb-3">
              <input id="keep" type="checkbox" name="keep" class="form-check-input" [(ngModel)]="keep" />
              <label for="keep" class="form-check-label">{{ t('account.auth.keepSignedIn') }}</label>
            </div>
            <button type="submit" class="btn btn-primary w-100" [attr.aria-disabled]="busy() || null">
              {{ signup() ? t('account.auth.createAccount') : t('account.auth.signIn') }}
            </button>
          </form>

          @if (passkeysShown()) {
            <div class="passkey-first">
              <p class="or" aria-hidden="true">
                <span>{{ t('account.auth.or') }}</span>
              </p>
              <button
                type="button"
                class="btn btn-outline-secondary w-100"
                [attr.aria-disabled]="busy() || null"
                (click)="passkeySignIn()"
              >
                {{ t('account.auth.passkeySignIn') }}
              </button>
              <p class="form-text">{{ t('account.auth.passkeyHint') }}</p>
            </div>
          }

          @if (signup()) {
            <p class="form-text privacy-note">
              <gc-rich [text]="t('account.auth.privacy')" [links]="{ privacy: '/privacy' }" />
            </p>
            <p class="auth-links">
              <gc-rich [text]="t('account.auth.haveAccount')" [links]="{ signin: '/signin' }" />
            </p>
          } @else {
            <p class="auth-links">
              <a routerLink="/forgot">{{ t('account.auth.forgot') }}</a
              ><br />
              <gc-rich [text]="t('account.auth.newHere')" [links]="{ signup: '/signup' }" />
            </p>
          }
        }
      </section>
    </div>
  </ng-container>`,
  styles: `
    .auth-card {
      max-width: 28rem;
      margin: 1rem auto 0;
    }
    .auth-links {
      margin: 1.25rem 0 0;
    }
    .or {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.25rem 0 1rem;
      color: var(--gc-muted);
    }
    .or::before,
    .or::after {
      content: '';
      flex: 1;
      border-top: 1px solid currentColor;
      opacity: 0.4;
    }
    .trial-note {
      background: var(--gc-surface-2);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
    }
  `
})
export class AuthPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly signup = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['mode'] === 'signup')), {
    initialValue: false
  });
  protected readonly notices = new Notices();
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly busy = signal(false);
  protected readonly checks = new FieldChecks(() => ({
    email: emailAddress(this.email),
    password: this.signup()
      ? newPassword(this.password)
      : filled(this.password, translate('account.auth.passwordMissing')),
    ...(this.signup() ? { confirmation: samePassword(this.confirmation, this.password) } : {})
  }));
  protected readonly heading = computed(() =>
    this.secondStep()
      ? translate('account.secondStep.heading')
      : !this.signup()
        ? translate('account.auth.signInHeading')
        : this.auth.trial()
          ? translate('account.auth.keepHeading')
          : translate('account.auth.signUpHeading')
  );
  protected readonly lead = computed(() => {
    if (this.secondStep()) return translate('account.secondStep.signingInAs', { email: this.email() });
    if (!this.signup()) return translate('account.auth.signInLead');
    const trial = this.auth.trial();
    return trial ? translate('account.auth.keepLead', { name: trial.name }) : translate('account.auth.signUpLead');
  });

  /** "Keep me signed in on this device", unticked unless chosen: otherwise the sign-in ends with the browser session. */
  protected readonly keep = signal(false);

  /**
   * The second step still to take after the password, with its pending token.
   * It is held here, in memory only, never in storage: a reload goes back to the password.
   */
  protected readonly secondStep = signal<SecondStepResponse | null>(null);

  private readonly passkeys = inject(PASSKEYS);
  private readonly injector = inject(Injector);
  private readonly passwordField = viewChild<ElementRef<HTMLInputElement>>('passwordField');
  /** Whether to offer signing in with a passkey: on the sign-in form, in a browser that has them. */
  protected readonly passkeysShown = signal(false);
  private left = false;

  constructor() {
    // Only in the browser, after the first render: the page is the same as the server would draw it until then.
    afterNextRender(() => {
      if (this.signup() || !this.passkeys.supported()) return;
      this.passkeysShown.set(true);
      void this.startAutofill();
    });
    inject(DestroyRef).onDestroy(() => {
      this.left = true;
      this.passkeys.cancel();
    });
  }

  protected async submit(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    this.busy.set(true);
    try {
      if (this.signup()) {
        await this.auth.signUp(this.email(), this.password(), this.keep());
      } else {
        const result = await this.auth.signIn(this.email(), this.password(), this.keep());
        if (!result.done) {
          // The password has done its part; it is not kept while the second step waits.
          this.password.set('');
          this.passkeys.cancel();
          this.secondStep.set(result.secondStep);
          return;
        }
      }
      await this.router.navigateByUrl('/home');
    } catch (err) {
      // A problem with one field shows on it; others, such as a wrong password at sign-in, above the form.
      if (this.checks.reportServer(err)) return;
      this.notices.error(
        errorMessage(
          err,
          this.signup() ? translate('account.auth.signUpFailed') : translate('account.auth.signInFailed')
        )
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected signedIn(): Promise<boolean> {
    this.secondStep.set(null);
    return this.router.navigateByUrl('/home');
  }

  /** Back to the password form, the email still filled in, saying why when the second step ran out. */
  protected startOver(message: string | null): void {
    this.secondStep.set(null);
    if (message) this.notices.error(message);
    afterNextRender(() => this.passwordField()?.nativeElement.focus(), { injector: this.injector });
    if (this.passkeysShown()) void this.startAutofill();
  }

  /** "Sign in with a passkey": a passkey alone, which counts as both steps. */
  protected async passkeySignIn(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const options = await this.auth.passkeySignInOptions();
      // This takes the place of the autofill request, which the library stops.
      await this.passkeySignedIn(await this.passkeys.authenticate(options));
    } catch (err) {
      this.notices.error(passkeyMessage(err, translate('account.auth.signInFailed')));
      void this.startAutofill();
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Offers the passkeys saved for this site among the email field's
   * suggestions, where the browser can. It waits quietly in the background
   * until one is picked, and stops when the page is left or another passkey
   * request takes its place.
   */
  private async startAutofill(): Promise<void> {
    let response: AuthenticationResponseJSON;
    try {
      if (!(await this.passkeys.autofillSupported()) || this.left || this.secondStep()) return;
      const options = await this.auth.passkeySignInOptions();
      if (this.left || this.secondStep()) return;
      response = await this.passkeys.authenticate(options, true);
    } catch {
      // Not offered (no options, an old browser), stopped, or turned down: the button is still there.
      return;
    }
    try {
      await this.passkeySignedIn(response);
    } catch (err) {
      this.notices.error(passkeyMessage(err, translate('account.auth.signInFailed')));
      void this.startAutofill();
    }
  }

  private async passkeySignedIn(response: AuthenticationResponseJSON): Promise<void> {
    await this.auth.signInWithPasskey(response, this.keep());
    await this.router.navigateByUrl('/home');
  }
}
