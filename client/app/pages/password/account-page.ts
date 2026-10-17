import { DatePipe } from '../../shared/format-pipes';
import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import type { FactorProof, IdentityProof, MfaSummary } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { IdentityConfirm } from '../auth/identity-confirm';
import { SectionLinks } from '../guides/guide-contents';
import { ExportSection } from './export-section';
import { FieldCheck, FieldChecks, emailAddress, filled, newPassword, samePassword } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';
import { SettingsSection } from './settings-section';
import { SharedRecipes } from './shared-section';
import { SignInSection } from './sign-in-section';

/** A change on this page that, with two-step sign-in on, asks for a second step too (decision 6). */
type Confirming = 'password' | 'email' | 'delete';

/**
 * The signed-in user's account: settings, changing the password, two-step
 * sign-in, or deleting the account. A trial has settings too, but no password, so it is offered an
 * account instead. While two-step sign-in is on (the two-step section says so
 * when it loads), changing the password or the email and deleting the account
 * ask for the password and a second step in IdentityConfirm, in place of the
 * password field, once the rest of the form is filled in.
 */
@Component({
  selector: 'gc-account-page',
  imports: [
    DatePipe,
    ExportSection,
    FieldCheck,
    FormsModule,
    IdentityConfirm,
    NgTemplateOutlet,
    NoticesList,
    PageHeader,
    RouterLink,
    SettingsSection,
    SharedRecipes,
    SignInSection,
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
      <!-- The page is long: what is on it, so the security sections are a tap away. -->
      <nav class="account-contents" [attr.aria-label]="t('account.account.contents')">
        <ul>
          @for (part of contents; track part.id) {
            <li>
              <a [href]="links.href(part.id)" (click)="links.go($event, part.id)">{{ t(part.label) }}</a>
            </li>
          }
        </ul>
      </nav>
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
      <gc-shared-recipes />

      <section class="auth-text">
        <h2 id="password-heading" tabindex="-1">{{ t('account.account.changeHeading') }}</h2>
        <form (ngSubmit)="submit()" class="account-form">
          @if (!twoStep()) {
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
          }
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
          @if (confirming() !== 'password') {
            <button
              id="password-submit"
              type="submit"
              class="btn btn-light border"
              [attr.aria-disabled]="busy() || null"
            >
              {{ twoStep() ? t('account.mfa.continue') : t('account.account.change') }}
            </button>
          }
        </form>
        @if (confirming() === 'password') {
          <ng-container [ngTemplateOutlet]="confirmStep" />
        }
      </section>

      <gc-sign-in-section (loaded)="mfaLoaded($event)" />

      <section class="auth-text">
        <h2 id="email-heading" tabindex="-1">{{ t('account.account.emailHeading') }}</h2>
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
          @if (!twoStep()) {
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
          }
          @if (confirming() !== 'email') {
            <button id="email-submit" type="submit" class="btn btn-light border" [attr.aria-disabled]="busy() || null">
              {{ twoStep() ? t('account.mfa.continue') : t('account.account.emailSend') }}
            </button>
          }
        </form>
        @if (confirming() === 'email') {
          <ng-container [ngTemplateOutlet]="confirmStep" />
        }
      </section>

      <section class="auth-text">
        <h2 id="sign-out-heading" tabindex="-1">{{ t('account.account.signOutHeading') }}</h2>
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
        <h2 id="delete-heading" tabindex="-1">{{ t('account.account.deleteHeading') }}</h2>
        <p>{{ t('account.account.deleteText') }}</p>
        <form (ngSubmit)="deleteAccount()" class="account-form">
          @if (!twoStep()) {
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
          }
          @if (confirming() !== 'delete') {
            <button
              id="delete-submit"
              type="submit"
              class="btn btn-outline-danger"
              [attr.aria-disabled]="busy() || null"
            >
              {{ t('account.account.delete') }}
            </button>
          }
        </form>
        @if (confirming() === 'delete') {
          <ng-container [ngTemplateOutlet]="confirmStep" />
        }
      </section>
    }

    <ng-template #confirmStep>
      @if (confirming(); as which) {
        <div class="account-form confirm-step">
          <p>{{ t('account.account.confirmStep') }}</p>
          <gc-identity-confirm
            [idPrefix]="which + '-confirm'"
            [mfaOn]="true"
            [hasTotp]="!!mfa()?.totp"
            [hasPasskeys]="!!mfa()?.passkeys?.length"
            [action]="confirmAction()"
            [run]="runConfirmed"
            (cancelled)="closeConfirm(true)"
          />
        </div>
      }
    </ng-template>
  </ng-container>`,
  styles: `
    .account-form {
      max-width: 26rem;
    }
    .account-contents ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0 1.25rem;
      list-style: none;
      margin: -0.75rem 0 1.25rem;
      padding: 0;
    }
    .account-contents a {
      display: inline-block;
      padding: 0.35rem 0;
    }
    /* A finger's height on a phone. */
    @media (max-width: 767.98px) {
      .account-contents a {
        padding: 0.6rem 0;
      }
    }
  `
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  /** The sections, for the contents at the top: each heading's id and its message. */
  protected readonly contents = [
    { id: 'settings-heading', label: marker('account.settings.heading') },
    { id: 'export-heading', label: marker('account.export.heading') },
    { id: 'shared-heading', label: marker('account.shared.heading') },
    { id: 'password-heading', label: marker('account.account.changeHeading') },
    { id: 'mfa-heading', label: marker('account.mfa.heading') },
    { id: 'email-heading', label: marker('account.account.emailHeading') },
    { id: 'sign-out-heading', label: marker('account.account.signOutHeading') },
    { id: 'delete-heading', label: marker('account.account.deleteHeading') }
  ];
  /** Each goes to its section's heading, as a guide's contents do. */
  protected readonly links = new SectionLinks();
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  /** The two-step sign-in section's summary, once it has loaded. */
  protected readonly mfa = signal<MfaSummary | null>(null);
  protected readonly twoStep = computed(() => this.mfa()?.on ?? false);
  /** The change waiting for its second step, if any. */
  protected readonly confirming = signal<Confirming | null>(null);
  protected readonly confirmAction = computed(() => {
    switch (this.confirming()) {
      case 'password':
        return translate('account.account.change');
      case 'email':
        return translate('account.account.emailSend');
      default:
        return translate('account.account.delete');
    }
  });

  protected mfaLoaded(summary: MfaSummary): void {
    this.mfa.set(summary);
    if (!summary.on) this.confirming.set(null);
  }

  /** Closes the second step; a cancelled one gives the focus back to the button that opened it. */
  protected closeConfirm(cancelled = false): void {
    const which = this.confirming();
    this.confirming.set(null);
    if (cancelled && which) {
      afterNextRender(() => document.getElementById(which + '-submit')?.focus(), { injector: this.injector });
    }
  }

  /**
   * Makes the change waiting for its second step once IdentityConfirm has the
   * proof. A problem with this page's own fields (the new password, the new
   * address) closes the step and is shown on the field; anything else is
   * thrown back for IdentityConfirm to show.
   */
  protected readonly runConfirmed = async (proof: IdentityProof): Promise<void> => {
    const { password, ...factor } = proof;
    switch (this.confirming()) {
      case 'password':
        return this.changePassword(password, factor as FactorProof);
      case 'email':
        return this.sendEmailLink(password, factor as FactorProof);
      case 'delete':
        await this.auth.deleteAccount(password, factor as FactorProof);
        await this.router.navigateByUrl('/');
        return;
    }
  };

  protected readonly notices = new Notices();
  protected readonly current = signal('');
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly deletePassword = signal('');
  // With two-step sign-in on, IdentityConfirm asks for the password instead.
  protected readonly changeChecks = new FieldChecks(() => ({
    ...(!this.twoStep() && { current: filled(this.current, translate('account.account.currentMissing')) }),
    password: newPassword(this.password),
    confirmation: samePassword(this.confirmation, this.password)
  }));
  protected readonly deleteChecks = new FieldChecks(() => ({
    ...(!this.twoStep() && {
      deletePassword: filled(this.deletePassword, translate('account.account.deletePasswordMissing'))
    })
  }));
  protected readonly busy = signal(false);

  protected async submit(): Promise<void> {
    if (this.busy() || !this.changeChecks.validate()) return;
    if (this.twoStep()) return this.confirming.set('password');
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

  /** The password change with a second step, from runConfirmed. */
  private async changePassword(current: string, factor: FactorProof): Promise<void> {
    if (!this.changeChecks.validate()) return this.closeConfirm();
    try {
      const message = await this.auth.changePassword(current, this.password(), factor);
      this.closeConfirm();
      this.notices.success(message);
      this.password.set('');
      this.confirmation.set('');
    } catch (err) {
      // The new password (field "password"); the current one, "current", is IdentityConfirm's.
      if (!this.changeChecks.reportServer(err)) throw err;
      this.closeConfirm();
    }
  }

  protected async deleteAccount(): Promise<void> {
    if (this.busy() || !this.deleteChecks.validate()) return;
    if (this.twoStep()) return this.confirming.set('delete');
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
    ...(!this.twoStep() && { emailPassword: filled(this.emailPassword, translate('account.account.currentMissing')) })
  }));

  protected async changeEmail(): Promise<void> {
    if (this.busy() || !this.emailChecks.validate()) return;
    if (this.twoStep()) return this.confirming.set('email');
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

  /** The email change with a second step, from runConfirmed. */
  private async sendEmailLink(password: string, factor: FactorProof): Promise<void> {
    if (!this.emailChecks.validate()) return this.closeConfirm();
    try {
      const message = await this.auth.changeEmail(this.newEmail(), password, factor);
      this.closeConfirm();
      this.notices.success(message);
      this.newEmail.set('');
    } catch (err) {
      // The new address (field "email"); the password is IdentityConfirm's.
      if (!this.emailChecks.reportServer(err, { email: 'newEmail' })) throw err;
      this.closeConfirm();
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
