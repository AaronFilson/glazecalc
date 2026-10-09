import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { FieldCheck, FieldChecks, newPassword, samePassword } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';

/**
 * Chooses a new password from the link in a reset email (/reset#token=...).
 * The token is after the #, so the browser never sends it to the server or
 * puts it in a Referer header. Links from before 2026 (/#/reset?token=...)
 * arrive as /reset?token=... and work too. Opening the page uses nothing up:
 * email link scanners open links too, so the token is only spent when the new
 * password is submitted.
 */
@Component({
  selector: 'gc-reset-page',
  imports: [FieldCheck, FormsModule, NoticesList, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>{{ t('account.reset.heading') }}</h1>
      @if (done(); as message) {
        <p class="done-text" role="status">{{ message }}</p>
        <p>
          <a routerLink="/signin" class="btn btn-success">{{ t('account.reset.signIn') }}</a>
        </p>
      } @else if (!token) {
        <p class="help-text">{{ t('account.reset.incomplete') }}</p>
        <p>
          <a routerLink="/forgot" class="btn btn-light border">{{ t('account.reset.askAgain') }}</a>
        </p>
      } @else {
        <form (ngSubmit)="submit()" class="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div>
            <label for="password">{{ t('account.reset.password') }} </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              minlength="8"
              autocomplete="new-password"
              [(ngModel)]="password"
              [gcField]="checks"
              gcFieldName="password"
            />
          </div>
          <div>
            <label for="confirmation">{{ t('account.reset.confirmation') }} </label>
            <input
              id="confirmation"
              type="password"
              name="confirmation"
              required
              autocomplete="new-password"
              [(ngModel)]="confirmation"
              [gcField]="checks"
              gcFieldName="confirmation"
            />
          </div>
          <button type="submit" class="btn btn-success" [attr.aria-disabled]="busy() || null">
            {{ t('account.reset.save') }}
          </button>
        </form>
        <p class="small">{{ t('account.reset.hint') }}</p>
      }
    </section>
  </ng-container>`
})
export class ResetPage {
  private readonly auth = inject(AuthService);

  protected readonly token = resetToken(inject(ActivatedRoute));
  protected readonly notices = new Notices();
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly checks = new FieldChecks(() => ({
    password: newPassword(this.password),
    confirmation: samePassword(this.confirmation, this.password)
  }));
  protected readonly busy = signal(false);
  protected readonly done = signal<string | null>(null);

  constructor() {
    // Keep the token out of the address bar, history and bookmarks.
    if (this.token) inject(Location).replaceState('/reset');
  }

  protected async submit(): Promise<void> {
    if (!this.token || this.busy() || !this.checks.validate()) return;
    this.busy.set(true);
    try {
      this.done.set(await this.auth.resetPassword(this.token, this.password()));
    } catch (err) {
      if (this.checks.reportServer(err)) return;
      this.notices.error(errorMessage(err, translate('account.reset.failed')));
    } finally {
      this.busy.set(false);
    }
  }
}

/** The token from #token=... (current links) or ?token=... (links from before 2026). */
function resetToken(route: ActivatedRoute): string | null {
  const { fragment, queryParamMap } = route.snapshot;
  return new URLSearchParams(fragment ?? '').get('token') || queryParamMap.get('token');
}
