import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
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
  imports: [FormsModule, NoticesList, RouterLink],
  template: `
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>Choose a new password</h1>
      @if (done(); as message) {
        <p class="done-text" role="status">{{ message }}</p>
        <p><a routerLink="/signin" class="btn btn-success">Sign in</a></p>
      } @else if (!token) {
        <p class="help-text">This page needs the link from a password reset email, and this one is incomplete.</p>
        <p><a routerLink="/forgot" class="btn btn-light border">Ask for a new link</a></p>
      } @else {
        <form #resetForm="ngForm" (ngSubmit)="submit()" class="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div>
            <label for="password">New password: </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              minlength="8"
              autocomplete="new-password"
              [(ngModel)]="password"
            />
          </div>
          <div>
            <label for="confirmation">Confirm new password: </label>
            <input
              id="confirmation"
              type="password"
              name="confirmation"
              required
              autocomplete="new-password"
              [(ngModel)]="confirmation"
            />
          </div>
          <button type="submit" class="btn btn-success" [disabled]="resetForm.invalid || !matches() || busy()">
            Save new password
          </button>
        </form>
        <p class="small">At least 8 characters. Every device signed in to the account will be signed out.</p>
        @if (password() && confirmation() && !matches()) {
          <p class="small text-danger">The two passwords do not match.</p>
        }
      }
    </section>
  `
})
export class ResetPage {
  private readonly auth = inject(AuthService);

  protected readonly token = resetToken(inject(ActivatedRoute));
  protected readonly notices = new Notices();
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly matches = computed(() => this.password() === this.confirmation());
  protected readonly busy = signal(false);
  protected readonly done = signal<string | null>(null);

  constructor() {
    // Keep the token out of the address bar, history and bookmarks.
    if (this.token) inject(Location).replaceState('/reset');
  }

  protected async submit(): Promise<void> {
    if (!this.token || !this.matches() || this.busy()) return;
    this.busy.set(true);
    try {
      this.done.set(await this.auth.resetPassword(this.token, this.password()));
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: could not change the password. Please try again.'));
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
