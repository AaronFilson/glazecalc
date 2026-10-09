import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'gc-not-found-page',
  imports: [RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="help-text not-found">
      <h1>{{ t('site.notFound.heading') }}</h1>
      <p>{{ t('site.notFound.text') }}</p>
      <a [routerLink]="auth.hasSession() ? '/home' : '/'" class="btn btn-primary">{{ t('site.notFound.start') }}</a>
    </section>
  </ng-container>`,
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
