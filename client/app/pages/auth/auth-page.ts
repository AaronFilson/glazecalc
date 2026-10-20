import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
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
import { AuthService, SIGN_IN_PROVIDERS, type ProviderId } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { LocaleService } from '../../core/locale.service';
import { sameSitePath } from '../../core/signed-in.guard';
import { languageOfPath, pathIn } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { FieldCheck, FieldChecks, emailAddress, filled, newPassword, samePassword } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { PASSKEYS, passkeyMessage } from './passkeys';
import { ProviderButtons } from './provider-buttons';
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
 *
 * Where Google, GitHub or Microsoft sign-in is on, both forms offer it too
 * (docs/adr/0015-provider-sign-in.md). The provider sends the browser back
 * here with ?provider=<id>, and the page finishes the sign-in: signed in, a
 * second step, or an account that has the provider's email, to sign in to
 * first; once it is, the provider is linked to it.
 */
@Component({
  selector: 'gc-auth-page',
  imports: [
    FieldCheck,
    FormsModule,
    NoticesList,
    ProviderButtons,
    RichText,
    RouterLink,
    SecondStep,
    TranslocoDirective
  ],
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
              <gc-rich
                [text]="t('account.auth.trialNote', { name: trial.name })"
                [links]="{ signup: otherPage('/signup') }"
              />
            </p>
          }

          <form (ngSubmit)="submit()">
            <div class="mb-3">
              <label for="email" class="form-label">{{ t('account.auth.email') }}</label>
              <input
                id="email"
                type="email"
                dir="ltr"
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
              <!-- The problem says it once a password is too short, so the hint steps aside. -->
              @if (signup() && !checks.problem('password')) {
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
            @if (signup() && outsideUs()) {
              <p class="form-text data-notice">
                <gc-rich [text]="t('account.auth.dataNotice')" [links]="{ where: '/privacy#your-choice' }" />
              </p>
            }
            <button type="submit" class="btn btn-primary w-100" [attr.aria-disabled]="busy() || null">
              {{ signup() ? t('account.auth.createAccount') : t('account.auth.signIn') }}
            </button>
          </form>

          @if (providers().length) {
            <div class="provider-first">
              <p class="or" aria-hidden="true">
                <span>{{ t('account.auth.or') }}</span>
              </p>
              <gc-provider-buttons [providers]="providers()" [from]="here" [keep]="keep()" />
            </div>
          }

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
            <!-- The terms bind an account from its start (site/en.json terms.*). -->
            <p class="form-text terms-note">
              <gc-rich [text]="t('account.auth.terms')" [links]="{ terms: '/terms' }" />
            </p>
            <p class="auth-links">
              <gc-rich [text]="t('account.auth.haveAccount')" [links]="{ signin: otherPage('/signin') }" />
            </p>
          } @else {
            <p class="auth-links">
              <a routerLink="/forgot">{{ t('account.auth.forgot') }}</a
              ><br />
              <gc-rich [text]="t('account.auth.newHere')" [links]="{ signup: otherPage('/signup') }" />
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
  /**
   * Whether to say, before an account is made, that accounts are kept in the US and the choice is the
   * reader's (docs/asia-plan.md, decision 10): for every region but the US, and when none is known.
   */
  private readonly locale = inject(LocaleService);
  protected readonly outsideUs = computed(() => this.locale.region() !== 'US');
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

  /** The providers that are on here, once the server has said. */
  protected readonly providers = signal<ProviderId[]>([]);
  /**
   * Where to go once signed in: the page that sent the visitor here (?next=,
   * such as an AI app's consent page), if it is one of this site's
   * (sameSitePath); otherwise home.
   */
  private readonly next = sameSitePath(inject(ActivatedRoute).snapshot?.queryParamMap?.get('next')) ?? '/home';
  /**
   * The sign-in and sign-up pages link to each other and carry ?next= along,
   * so the visitor still comes back to the page that sent them (next is
   * already a same-site path; it is encoded into the link).
   */
  protected otherPage(page: '/signin' | '/signup'): string {
    return this.next === '/home' ? page : page + '?next=' + encodeURIComponent(this.next);
  }
  /**
   * What the provider is given to come back to, in this page's language: the
   * page to go on to, or this page's own address (which the server takes as home).
   */
  protected readonly here = ((page: string) =>
    this.next === '/home' ? page : pathIn(languageOfPath(page), this.next))(
    typeof location === 'undefined' ? '/signin' : location.pathname
  );
  /** Where a provider sign-in goes once finished. */
  private providerNext = this.next;
  /** A provider waiting to be linked once the account with its email is signed in to. */
  private readonly linkWaiting = signal<ProviderId | null>(null);
  private readonly route = inject(ActivatedRoute);
  private readonly signInProviders = inject(SIGN_IN_PROVIDERS);

  private readonly passkeys = inject(PASSKEYS);
  private readonly injector = inject(Injector);
  private readonly passwordField = viewChild<ElementRef<HTMLInputElement>>('passwordField');
  /** Whether to offer signing in with a passkey: on the sign-in form, in a browser that has them. */
  protected readonly passkeysShown = signal(false);
  private left = false;
  /** Counts autofill requests: a newer one, or a passkey request that takes its place, leaves an older one stale. */
  private autofillRun = 0;
  /** Whether the latest autofill request is still starting or waiting for a passkey to be picked. */
  private autofillWaiting = false;

  constructor() {
    // Only in the browser, after the first render: the page is the same as the server would draw it until then.
    afterNextRender(() => {
      this.signInProviders().then(
        (providers) => this.providers.set(providers),
        () => this.providers.set([])
      );
      const provider = this.route.snapshot?.queryParamMap.get('provider');
      if (provider && !this.signup()) void this.finishProvider();
    });
    afterNextRender(() => {
      if (this.signup() || !this.passkeys.supported()) return;
      this.passkeysShown.set(true);
      void this.startAutofill();
    });
    // Halfway through signing in, the menu does not offer to start again (app.ts).
    effect(() => this.auth.secondStepPending.set(this.secondStep() !== null));
    inject(DestroyRef).onDestroy(() => {
      this.left = true;
      this.passkeys.cancel();
      this.auth.secondStepPending.set(false);
    });
  }

  protected async submit(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    this.busy.set(true);
    let failed = false;
    try {
      if (this.signup()) {
        // The confirmation email's link comes back to the page to go on to as well.
        await this.auth.signUp(
          this.email(),
          this.password(),
          this.keep(),
          this.next === '/home' ? undefined : this.next
        );
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
      await this.afterSignIn();
    } catch (err) {
      failed = true;
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
      if (failed) this.resumeAutofill();
    }
  }

  protected signedIn(): Promise<boolean> {
    this.secondStep.set(null);
    return this.afterSignIn();
  }

  /**
   * Signed in: on to the page the sign-in was for. A provider waiting to be
   * linked is linked now, and the account page says so.
   */
  private async afterSignIn(): Promise<boolean> {
    if (this.linkWaiting()) {
      this.linkWaiting.set(null);
      try {
        const result = await this.auth.finishProvider();
        if (result.kind === 'linked') this.auth.providerNotice.set(result.message);
        return this.router.navigateByUrl('/account');
      } catch (err) {
        this.auth.providerNotice.set(errorMessage(err, translate('account.providers.linkFailed')));
        return this.router.navigateByUrl('/account');
      }
    }
    const next = this.providerNext;
    this.providerNext = this.next;
    return this.router.navigateByUrl(next);
  }

  /** The provider has sent the browser back: what its answer came to. */
  private async finishProvider(): Promise<void> {
    // The address loses ?provider, so a reload does not try again.
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.busy.set(true);
    try {
      const result = await this.auth.finishProvider();
      switch (result.kind) {
        case 'signed-in':
          this.providerNext = result.next;
          await this.afterSignIn();
          return;
        case 'second-step':
          this.providerNext = result.next;
          this.email.set(result.email);
          this.passkeys.cancel();
          this.secondStep.set(result.secondStep);
          return;
        case 'sign-in-to-link':
          this.linkWaiting.set(result.provider);
          this.notices.success(result.message);
          return;
        case 'linked':
          this.auth.providerNotice.set(result.message);
          await this.router.navigateByUrl('/account');
          return;
      }
    } catch (err) {
      this.notices.error(errorMessage(err, translate('account.providers.failed')));
    } finally {
      this.busy.set(false);
    }
  }

  /** Back to the password form, the email still filled in, saying why when the second step ran out. */
  protected startOver(message: string | null): void {
    this.secondStep.set(null);
    if (message) this.notices.error(message);
    // Once the form is back: the autofill request needs the email field on the page.
    afterNextRender(
      () => {
        this.passwordField()?.nativeElement.focus();
        this.resumeAutofill();
      },
      { injector: this.injector }
    );
  }

  /** "Sign in with a passkey": a passkey alone, which counts as both steps. */
  protected async passkeySignIn(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    let failed = false;
    try {
      const options = await this.auth.passkeySignInOptions();
      // This takes the place of the autofill request, which the library stops.
      this.autofillRun++;
      this.autofillWaiting = false;
      await this.passkeySignedIn(await this.passkeys.authenticate(options));
    } catch (err) {
      failed = true;
      this.notices.error(passkeyMessage(err, translate('account.auth.signInFailed')));
    } finally {
      this.busy.set(false);
      if (failed) this.resumeAutofill();
    }
  }

  /**
   * Offers the passkeys saved for this site among the email field's
   * suggestions, where the browser can. It waits quietly in the background
   * until one is picked, and stops when the page is left or another passkey
   * request takes its place.
   *
   * It does not start while the password or "Sign in with a passkey" is under
   * way: the library stops the request before it, so it would close that
   * prompt. It starts again when they fail (resumeAutofill).
   */
  private async startAutofill(): Promise<void> {
    const run = ++this.autofillRun;
    const current = () => run === this.autofillRun && !this.left && !this.secondStep();
    this.autofillWaiting = true;
    let response: AuthenticationResponseJSON;
    try {
      if (!(await this.passkeys.autofillSupported()) || !current() || this.busy()) return;
      const options = await this.auth.passkeySignInOptions();
      if (!current() || this.busy()) return;
      response = await this.passkeys.authenticate(options, true);
    } catch {
      // Not offered (no options, an old browser), stopped, or turned down: the button is still there.
      return;
    } finally {
      if (run === this.autofillRun) this.autofillWaiting = false;
    }
    // A passkey picked just as the password went off: the password goes on, and this waits for another try.
    if (this.busy()) return;
    // The password form waits while the passkey is sent.
    this.busy.set(true);
    let failed = false;
    try {
      await this.passkeySignedIn(response);
    } catch (err) {
      failed = true;
      this.notices.error(passkeyMessage(err, translate('account.auth.signInFailed')));
    } finally {
      this.busy.set(false);
      if (failed) this.resumeAutofill();
    }
  }

  /** Starts the autofill request again after something else stopped it, or kept it from starting. */
  private resumeAutofill(): void {
    if (this.passkeysShown() && !this.autofillWaiting && !this.left && !this.secondStep()) void this.startAutofill();
  }

  private async passkeySignedIn(response: AuthenticationResponseJSON): Promise<void> {
    await this.auth.signInWithPasskey(response, this.keep());
    await this.afterSignIn();
  }
}
