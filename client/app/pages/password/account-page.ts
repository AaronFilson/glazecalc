import { DatePipe } from '../../shared/format-pipes';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { ExportSection } from './export-section';
import { FieldCheck, FieldChecks, emailAddress, filled, newPassword, samePassword } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';
import { SettingsSection } from './settings-section';

/**
 * The signed-in user's account: settings, changing the password, or deleting
 * the account. A trial has settings too, but no password, so it is offered an
 * account instead.
 */
@Component({
  selector: 'gc-account-page',
  imports: [
    DatePipe,
    ExportSection,
    FieldCheck,
    FormsModule,
    NoticesList,
    PageHeader,
    RouterLink,
    SettingsSection,
    TranslocoDirective
  ],
  template: `<ng-container *transloco="let t">
    @if (auth.trial(); as trial) {
      <gc-page-header
        [title]="t('account.account.trialTitle')"
        [lead]="t('account.account.trialLead', { name: trial.name })"
      />
      <section class="auth-text trial-account">
        <h2>{{ t('account.account.keepHeading') }}</h2>
        <p>
          {{ t('account.account.keepText', { date: (trial.expiresAt | gcDate: 'weekday'), name: trial.name }) }}
        </p>
        <a routerLink="/signup" class="btn btn-primary">{{ t('account.account.createAccount') }}</a>
      </section>
      <gc-settings />
      <gc-export />
    } @else {
      <gc-page-header
        [title]="t('account.account.title')"
        [lead]="auth.email() ? t('account.account.signedInAs', { email: auth.email() }) : ''"
      />
      <gc-notices [notices]="notices" />
      @if (auth.unverified()) {
        <section class="auth-text unverified-email">
          <h2>{{ t('account.account.unverifiedHeading') }}</h2>
          <p>{{ t('account.account.unverifiedText', { email: auth.email() }) }}</p>
          <button type="button" class="btn btn-light border" (click)="resend()" [attr.aria-disabled]="busy() || null">
            {{ t('account.account.resend') }}
          </button>
        </section>
      }
      <gc-settings />
      <gc-export />

      <section class="auth-text">
        <h2>{{ t('account.account.changeHeading') }}</h2>
        <form (ngSubmit)="submit()" class="account-form">
          <div class="mb-3">
            <label for="current" class="form-label">{{ t('account.account.current') }}</label>
            <input
              id="current"
              type="password"
              name="current"
              class="form-control"
              required
              autocomplete="current-password"
              [(ngModel)]="current"
              [gcField]="changeChecks"
              gcFieldName="current"
            />
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">{{ t('account.account.password') }}</label>
            <input
              id="password"
              type="password"
              name="password"
              class="form-control"
              required
              minlength="8"
              autocomplete="new-password"
              [(ngModel)]="password"
              [gcField]="changeChecks"
              gcFieldName="password"
            />
            <div class="form-text">{{ t('account.account.passwordHint') }}</div>
          </div>
          <div class="mb-3">
            <label for="confirmation" class="form-label">{{ t('account.account.confirmation') }}</label>
            <input
              id="confirmation"
              type="password"
              name="confirmation"
              class="form-control"
              required
              autocomplete="new-password"
              [(ngModel)]="confirmation"
              [gcField]="changeChecks"
              gcFieldName="confirmation"
            />
          </div>
          <button type="submit" class="btn btn-primary" [attr.aria-disabled]="busy() || null">
            {{ t('account.account.change') }}
          </button>
        </form>
      </section>

      <section class="auth-text">
        <h2>{{ t('account.account.emailHeading') }}</h2>
        <p>{{ t('account.account.emailText') }}</p>
        <form (ngSubmit)="changeEmail()" class="account-form">
          <div class="mb-3">
            <label for="new-email" class="form-label">{{ t('account.account.newEmail') }}</label>
            <input
              id="new-email"
              type="email"
              name="newEmail"
              class="form-control"
              required
              autocomplete="email"
              [(ngModel)]="newEmail"
              [gcField]="emailChecks"
              gcFieldName="newEmail"
            />
          </div>
          <div class="mb-3">
            <label for="email-password" class="form-label">{{ t('account.account.emailPassword') }}</label>
            <input
              id="email-password"
              type="password"
              name="emailPassword"
              class="form-control"
              required
              autocomplete="current-password"
              [(ngModel)]="emailPassword"
              [gcField]="emailChecks"
              gcFieldName="emailPassword"
            />
          </div>
          <button type="submit" class="btn btn-primary" [attr.aria-disabled]="busy() || null">
            {{ t('account.account.emailSend') }}
          </button>
        </form>
      </section>

      <section class="auth-text">
        <h2>{{ t('account.account.signOutHeading') }}</h2>
        <p>{{ t('account.account.signOutText') }}</p>
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="signOutEverywhere()"
          [attr.aria-disabled]="busy() || null"
        >
          {{ t('account.account.signOutButton') }}
        </button>
      </section>

      <section class="auth-text">
        <h2>{{ t('account.account.deleteHeading') }}</h2>
        <p>{{ t('account.account.deleteText') }}</p>
        <form (ngSubmit)="deleteAccount()" class="account-form">
          <div class="mb-3">
            <label for="delete-password" class="form-label">{{ t('account.account.deletePassword') }}</label>
            <input
              id="delete-password"
              type="password"
              name="deletePassword"
              class="form-control"
              required
              autocomplete="current-password"
              [(ngModel)]="deletePassword"
              [gcField]="deleteChecks"
              gcFieldName="deletePassword"
            />
          </div>
          <button type="submit" class="btn btn-outline-danger" [attr.aria-disabled]="busy() || null">
            {{ t('account.account.delete') }}
          </button>
        </form>
      </section>
    }
  </ng-container>`,
  styles: `
    .account-form {
      max-width: 26rem;
    }
  `
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly notices = new Notices();
  protected readonly current = signal('');
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly deletePassword = signal('');
  protected readonly changeChecks = new FieldChecks(() => ({
    current: filled(this.current, translate('account.account.currentMissing')),
    password: newPassword(this.password),
    confirmation: samePassword(this.confirmation, this.password)
  }));
  protected readonly deleteChecks = new FieldChecks(() => ({
    deletePassword: filled(this.deletePassword, translate('account.account.deletePasswordMissing'))
  }));
  protected readonly busy = signal(false);

  protected async submit(): Promise<void> {
    if (this.busy() || !this.changeChecks.validate()) return;
    this.busy.set(true);
    try {
      this.notices.success(await this.auth.changePassword(this.current(), this.password()));
      this.current.set('');
      this.password.set('');
      this.confirmation.set('');
    } catch (err) {
      if (this.changeChecks.reportServer(err)) return;
      this.notices.error(errorMessage(err, translate('account.account.changeFailed')));
    } finally {
      this.busy.set(false);
    }
  }

  protected async deleteAccount(): Promise<void> {
    if (this.busy() || !this.deleteChecks.validate()) return;
    this.busy.set(true);
    try {
      await this.auth.deleteAccount(this.deletePassword());
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.deletePassword.set('');
      // The server calls the password it checks "password".
      if (this.deleteChecks.reportServer(err, { password: 'deletePassword' })) return;
      this.notices.error(errorMessage(err, translate('account.account.deleteFailed')));
    } finally {
      this.busy.set(false);
    }
  }

  // Changing the email, confirming it, and signing out everywhere.
  protected readonly newEmail = signal('');
  protected readonly emailPassword = signal('');
  protected readonly emailChecks = new FieldChecks(() => ({
    newEmail: emailAddress(this.newEmail),
    emailPassword: filled(this.emailPassword, translate('account.account.currentMissing'))
  }));

  protected async changeEmail(): Promise<void> {
    if (this.busy() || !this.emailChecks.validate()) return;
    this.busy.set(true);
    try {
      this.notices.success(await this.auth.changeEmail(this.newEmail(), this.emailPassword()));
      this.newEmail.set('');
      this.emailPassword.set('');
    } catch (err) {
      this.emailPassword.set('');
      // The server calls the fields "email" and "password".
      if (this.emailChecks.reportServer(err, { email: 'newEmail', password: 'emailPassword' })) return;
      this.notices.error(errorMessage(err, translate('account.account.emailFailed')));
    } finally {
      this.busy.set(false);
    }
  }

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

  protected async signOutEverywhere(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.signOutEverywhere();
      await this.router.navigateByUrl('/signin');
    } catch (err) {
      this.notices.error(errorMessage(err, translate('account.account.signOutFailed')));
    } finally {
      this.busy.set(false);
    }
  }
}
