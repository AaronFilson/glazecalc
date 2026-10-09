import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { RichText } from '../../i18n/rich-text';
import { FieldCheck, FieldChecks, emailAddress, filled, newPassword, samePassword } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';

/**
 * Sign in and sign up share this page; the route's data.mode picks one. During a
 * trial, signing up turns the trial into the account, keeping its work.
 */
@Component({
  selector: 'gc-auth-page',
  imports: [FieldCheck, FormsModule, NoticesList, RichText, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="auth-card">
      <gc-notices [notices]="notices" />
      <section class="auth-text">
        <h1>{{ heading() }}</h1>
        <p class="muted">{{ lead() }}</p>
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
              autocomplete="username"
              [(ngModel)]="email"
              [gcField]="checks"
              gcFieldName="email"
            />
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">{{ t('account.auth.password') }}</label>
            <input
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
          <button type="submit" class="btn btn-primary w-100" [attr.aria-disabled]="busy() || null">
            {{ signup() ? t('account.auth.createAccount') : t('account.auth.signIn') }}
          </button>
        </form>

        @if (signup()) {
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
    !this.signup()
      ? translate('account.auth.signInHeading')
      : this.auth.trial()
        ? translate('account.auth.keepHeading')
        : translate('account.auth.signUpHeading')
  );
  protected readonly lead = computed(() => {
    if (!this.signup()) return translate('account.auth.signInLead');
    const trial = this.auth.trial();
    return trial ? translate('account.auth.keepLead', { name: trial.name }) : translate('account.auth.signUpLead');
  });

  protected async submit(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    this.busy.set(true);
    try {
      if (this.signup()) await this.auth.signUp(this.email(), this.password());
      else await this.auth.signIn(this.email(), this.password());
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
}
