import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { FieldCheck, FieldChecks, emailAddress } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';

/** Asks for a password reset email. */
@Component({
  selector: 'gc-forgot-page',
  imports: [FieldCheck, FormsModule, NoticesList, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>{{ t('account.forgot.heading') }}</h1>
      @if (sent(); as message) {
        <p class="sent-text" role="status">{{ message }}</p>
        <p>{{ t('account.forgot.checkInbox') }}</p>
      } @else {
        <p>{{ t('account.forgot.intro') }}</p>
        <form (ngSubmit)="submit()" class="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div>
            <label for="email">{{ t('account.forgot.email') }} </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autocomplete="username"
              [(ngModel)]="email"
              [gcField]="checks"
              gcFieldName="email"
            />
          </div>
          <button type="submit" class="btn btn-success" [attr.aria-disabled]="busy() || null">
            {{ t('account.forgot.send') }}
          </button>
        </form>
      }
      <p>
        <a routerLink="/signin" class="btn btn-light border">{{ t('account.forgot.back') }}</a>
      </p>
    </section>
  </ng-container>`
})
export class ForgotPage {
  private readonly auth = inject(AuthService);

  protected readonly notices = new Notices();
  protected readonly email = signal('');
  protected readonly busy = signal(false);
  protected readonly sent = signal<string | null>(null);
  protected readonly checks = new FieldChecks(() => ({ email: emailAddress(this.email) }));

  protected async submit(): Promise<void> {
    if (this.busy() || !this.checks.validate()) return;
    this.busy.set(true);
    try {
      this.sent.set(await this.auth.requestReset(this.email()));
    } catch (err) {
      if (this.checks.reportServer(err)) return;
      this.notices.error(errorMessage(err, translate('account.forgot.failed')));
    } finally {
      this.busy.set(false);
    }
  }
}
