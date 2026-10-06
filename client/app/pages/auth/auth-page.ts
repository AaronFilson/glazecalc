import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Notices, NoticesList } from '../../shared/notices';

/**
 * Sign in and sign up share this page; the route's data.mode picks one. During a
 * trial, signing up turns the trial into the account, keeping its work.
 */
@Component({
  selector: 'gc-auth-page',
  imports: [FormsModule, NoticesList, RouterLink],
  template: `
    <div class="auth-card">
      <gc-notices [notices]="notices" />
      <section class="auth-text">
        <h1>{{ heading() }}</h1>
        <p class="muted">{{ lead() }}</p>
        @if (!signup() && auth.trial(); as trial) {
          <p class="trial-note">
            Already have an account? Signing in brings what you made as {{ trial.name }} into it. New here?
            <a routerLink="/signup">Create an account</a> to keep it instead.
          </p>
        }

        <form #authForm="ngForm" (ngSubmit)="submit()">
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              class="form-control"
              required
              autocomplete="username"
              [(ngModel)]="email"
            />
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              class="form-control"
              required
              [attr.minlength]="signup() ? 8 : null"
              [attr.autocomplete]="signup() ? 'new-password' : 'current-password'"
              [(ngModel)]="password"
            />
            @if (signup()) {
              <div class="form-text">At least 8 characters.</div>
            }
          </div>
          @if (signup()) {
            <div class="mb-3">
              <label for="confirmation" class="form-label">Confirm password</label>
              <input
                id="confirmation"
                type="password"
                name="confirmation"
                class="form-control"
                autocomplete="new-password"
                [(ngModel)]="confirmation"
              />
            </div>
          }
          <button
            type="submit"
            class="btn btn-primary w-100"
            [disabled]="authForm.invalid || busy() || (signup() && confirmation() !== password())"
          >
            {{ signup() ? 'Create account' : 'Sign in' }}
          </button>
        </form>

        @if (signup()) {
          <p class="auth-links">Already have an account? <a routerLink="/signin">Sign in</a></p>
        } @else {
          <p class="auth-links">
            <a routerLink="/forgot">Forgot your password? Reset it</a><br />
            New here? <a routerLink="/signup">Create a free account</a>
          </p>
        }
      </section>
    </div>
  `,
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
  protected readonly canSubmit = computed(() => !this.signup() || this.password() === this.confirmation());
  protected readonly heading = computed(() =>
    !this.signup() ? 'Sign in' : this.auth.trial() ? 'Keep your work' : 'Create your account'
  );
  protected readonly lead = computed(() => {
    if (!this.signup()) return 'Welcome back to your glaze notebook.';
    const trial = this.auth.trial();
    return trial
      ? 'Keep everything you made as ' + trial.name + ': add your email and a password. It stays free.'
      : 'Free. Your recipes, materials and notes are kept private to your account.';
  });

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    try {
      if (this.signup()) await this.auth.signUp(this.email(), this.password());
      else await this.auth.signIn(this.email(), this.password());
      await this.router.navigateByUrl('/home');
    } catch (err) {
      this.notices.error(
        errorMessage(err, this.signup() ? 'Error: could not create the account.' : 'Error: could not sign in.')
      );
    } finally {
      this.busy.set(false);
    }
  }
}
