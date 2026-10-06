import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'gc-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="help-text not-found">
      <h1>Page not found</h1>
      <p>There is no page at this address. It may have moved, or the link may be mistyped.</p>
      <a [routerLink]="auth.hasSession() ? '/home' : '/'" class="btn btn-primary">Go to the start page</a>
    </section>
  `,
  styles: `
    .not-found {
      max-width: 36rem;
      margin: 2rem auto;
    }
  `
})
export class NotFoundPage {
  protected readonly auth = inject(AuthService);
}
