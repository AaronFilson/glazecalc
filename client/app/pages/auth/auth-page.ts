import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Notices, NoticesList } from '../../shared/notices';

/** Sign in and sign up share this page; the route's data.mode picks one. */
@Component({
  selector: 'gc-auth-page',
  imports: [FormsModule, NoticesList, RouterLink],
  template: `
    <gc-notices [notices]="notices" />
    <section class="auth-text">
      <h1>Glaze Calc App</h1>
      <section class="help-text">
        <p>
          The Glaze Calc App is a glaze calculator application, for helping you formulate ceramic glazes.
          It is useful for potters, ceramicists, and students. The Glaze Calc App takes a recipe of materials
          and computes the Unity formula, allowing you to compare glazes effectively. You can create new
          glazes, fix old ones, and understand how to adapt to changing materials.
        </p>
      </section>

      <!-- Bootstrap 5 dropped .form-inline; flex wrapping gives the same one-line form on wide screens. -->
      <form #authForm="ngForm" (ngSubmit)="submit()" class="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div>
          {{ signup() ? 'Make an account? Enter info:' : 'Have an account? Sign in:' }}
        </div>
        <div>
          <label for="email">Email: </label>
          <input id="email" type="email" name="email" required autocomplete="username" [(ngModel)]="email">
        </div>
        <div>
          <label for="password">Password: </label>
          <input id="password" type="password" name="password" required
            [attr.autocomplete]="signup() ? 'new-password' : 'current-password'" [(ngModel)]="password">
          @if (signup()) {
            <label for="confirmation">Confirm Password: </label>
            <input id="confirmation" type="password" name="confirmation" autocomplete="new-password"
              [(ngModel)]="confirmation">
          }
        </div>
        <button type="submit" class="btn btn-success"
          [disabled]="authForm.invalid || busy() || (signup() && confirmation() !== password())">
          {{ signup() ? 'Create New User' : 'Sign In' }}
        </button>
      </form>

      @if (signup()) {
        <p>If you have an account, sign in here : <a routerLink="/signin" class="btn btn-light border">Sign In</a></p>
        <p>
          A note on account creation: Email needs to have the domain (&#64;domain.com), and the password
          needs to be 8 characters long at minimum.
        </p>
      } @else {
        <p>Forgot your password? <a routerLink="/forgot" class="btn btn-light border">Reset it</a></p>
        <p>Ready to create an account? <a routerLink="/signup" class="btn btn-light border">Sign Up</a></p>
      }
    </section>
  `
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly signup = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['mode'] === 'signup')), { initialValue: false });
  protected readonly notices = new Notices();
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly busy = signal(false);
  protected readonly canSubmit = computed(() => !this.signup() || this.password() === this.confirmation());

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    try {
      if (this.signup()) await this.auth.signUp(this.email(), this.password());
      else await this.auth.signIn(this.email(), this.password());
      await this.router.navigateByUrl('/home');
    } catch (err) {
      this.notices.error(errorMessage(err, this.signup()
        ? 'Error: could not create the account.'
        : 'Error: could not sign in.'));
    } finally {
      this.busy.set(false);
    }
  }
}
