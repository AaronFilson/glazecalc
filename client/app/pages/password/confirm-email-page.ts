import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Notices, NoticesList } from '../../shared/notices';

/**
 * Confirms an email address from the link in an email (/confirm-email#token=...):
 * the one sent at sign-up, or the one sent to the new address of an email
 * change. Like the reset page, the token is after the #, and opening the page
 * uses nothing up (email link scanners open links too): the token is only
 * spent when the button is pressed.
 */
@Component({
  selector: 'gc-confirm-email-page',
  imports: [NoticesList, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>{{ t('account.confirmEmail.heading') }}</h1>
      @if (done(); as result) {
        <p class="done-text" role="status">{{ result.message }}</p>
        <p>
          @if (result.changed || !auth.signedIn()) {
            <a routerLink="/signin" class="btn btn-success">{{ t('account.confirmEmail.signIn') }}</a>
          } @else {
            <a routerLink="/account" class="btn btn-success">{{ t('account.confirmEmail.account') }}</a>
          }
        </p>
      } @else if (!token) {
        <p class="help-text">{{ t('account.confirmEmail.incomplete') }}</p>
        <p>
          <a routerLink="/account" class="btn btn-light border">{{ t('account.confirmEmail.account') }}</a>
        </p>
      } @else {
        <p>{{ t('account.confirmEmail.intro') }}</p>
        <button type="button" class="btn btn-success" (click)="confirm()" [attr.aria-disabled]="busy() || null">
          {{ t('account.confirmEmail.confirm') }}
        </button>
      }
    </section>
  </ng-container>`
})
export class ConfirmEmailPage {
  protected readonly auth = inject(AuthService);

  protected readonly token = linkToken(inject(ActivatedRoute));
  protected readonly notices = new Notices();
  protected readonly busy = signal(false);
  protected readonly done = signal<{ message: string; changed: boolean } | null>(null);

  constructor() {
    // Keep the token out of the address bar, history and bookmarks.
    if (this.token) inject(Location).replaceState('/confirm-email');
  }

  protected async confirm(): Promise<void> {
    if (!this.token || this.busy()) return;
    this.busy.set(true);
    try {
      this.done.set(await this.auth.confirmEmail(this.token));
    } catch (err) {
      this.notices.error(errorMessage(err, translate('account.confirmEmail.failed')));
    } finally {
      this.busy.set(false);
    }
  }
}

/** The token from #token=... */
function linkToken(route: ActivatedRoute): string | null {
  return new URLSearchParams(route.snapshot.fragment ?? '').get('token');
}
