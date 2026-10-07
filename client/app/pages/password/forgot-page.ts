import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { FieldCheck, FieldChecks, emailAddress } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';

/** Asks for a password reset email. */
@Component({
  selector: 'gc-forgot-page',
  imports: [FieldCheck, FormsModule, NoticesList, RouterLink],
  template: `
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>Reset your password</h1>
      @if (sent(); as message) {
        <p class="sent-text" role="status">{{ message }}</p>
        <p>Check your inbox and junk folder. If nothing arrives, check the address and ask again.</p>
      } @else {
        <p>Enter the email for your account, and we will send you a link to choose a new password.</p>
        <form (ngSubmit)="submit()" class="d-flex flex-wrap align-items-center gap-3 mb-3">
          <div>
            <label for="email">Email: </label>
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
          <button type="submit" class="btn btn-success" [attr.aria-disabled]="busy() || null">Send reset link</button>
        </form>
      }
      <p><a routerLink="/signin" class="btn btn-light border">Back to sign in</a></p>
    </section>
  `
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
      this.notices.error(errorMessage(err, 'Error: could not send the reset email. Please try again.'));
    } finally {
      this.busy.set(false);
    }
  }
}
