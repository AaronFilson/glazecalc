import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Notices, NoticesList } from '../../shared/notices';

/** The signed-in user's account: change the password. */
@Component({
  selector: 'gc-account-page',
  imports: [FormsModule, NoticesList, RouterLink],
  template: `
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>Your account</h1>
      @if (auth.token()) {
        @if (auth.email(); as email) {
          <p>Signed in as {{ email }}.</p>
        }
        <h2 class="h4">Change your password</h2>
        <form #changeForm="ngForm" (ngSubmit)="submit()" class="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div>
            <label for="current">Current password: </label>
            <input id="current" type="password" name="current" required autocomplete="current-password"
              [(ngModel)]="current">
          </div>
          <div>
            <label for="password">New password: </label>
            <input id="password" type="password" name="password" required minlength="8" autocomplete="new-password"
              [(ngModel)]="password">
          </div>
          <div>
            <label for="confirmation">Confirm new password: </label>
            <input id="confirmation" type="password" name="confirmation" required autocomplete="new-password"
              [(ngModel)]="confirmation">
          </div>
          <button type="submit" class="btn btn-success" [disabled]="changeForm.invalid || !matches() || busy()">
            Change password
          </button>
        </form>
        <p class="small">At least 8 characters. Other devices signed in to this account will be signed out.</p>
        @if (password() && confirmation() && !matches()) {
          <p class="small text-danger">The two new passwords do not match.</p>
        }
      } @else {
        <p class="help-text">Please <a routerLink="/signin">sign in</a> to change your password.</p>
      }
    </section>
  `
})
export class AccountPage {
  protected readonly auth = inject(AuthService);

  protected readonly notices = new Notices();
  protected readonly current = signal('');
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly matches = computed(() => this.password() === this.confirmation());
  protected readonly busy = signal(false);

  protected async submit(): Promise<void> {
    if (!this.matches() || this.busy()) return;
    this.busy.set(true);
    try {
      this.notices.success(await this.auth.changePassword(this.current(), this.password()));
      this.current.set('');
      this.password.set('');
      this.confirmation.set('');
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: could not change the password. Please try again.'));
    } finally {
      this.busy.set(false);
    }
  }
}
