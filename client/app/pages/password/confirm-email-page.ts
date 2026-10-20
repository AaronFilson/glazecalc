import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { sameSitePath } from '../../core/signed-in.guard';
import { Notices, NoticesList } from '../../shared/notices';

/**
 * Confirms an email address from the link in an email (/confirm-email#token=...):
 * the one sent at sign-up, or the one sent to the new address of an email
 * change. Like the reset page, the token is after the #, and opening the page
 * uses nothing up (email link scanners open links too): the token is only
 * spent when the button is pressed.
 *
 * A sign-up made on the way to another page, such as an AI app's consent page
 * (?next= on the sign-up page), has that page in the link too (&next=), and
 * once the address is confirmed the page goes on there: at once when signed
 * in, through the sign-in page otherwise. Only a page of this site (sameSitePath).
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
            <a routerLink="/signin" [queryParams]="next ? { next } : null" class="btn btn-success">{{
              t('account.confirmEmail.signIn')
            }}</a>
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
  private readonly router = inject(Router);

  private readonly link = new URLSearchParams(inject(ActivatedRoute).snapshot.fragment ?? '');
  /** The token from #token=... */
  protected readonly token = this.link.get('token');
  /** The page to go on to once confirmed, from &next=...: a page of this site, or none. */
  protected readonly next = sameSitePath(this.link.get('next'));
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
      const result = await this.auth.confirmEmail(this.token);
      this.done.set(result);
      // A changed address signs out everywhere, so that one goes through the sign-in page.
      if (this.next && !result.changed && this.auth.signedIn()) await this.router.navigateByUrl(this.next);
    } catch (err) {
      this.notices.error(errorMessage(err, translate('account.confirmEmail.failed')));
    } finally {
      this.busy.set(false);
    }
  }
}
