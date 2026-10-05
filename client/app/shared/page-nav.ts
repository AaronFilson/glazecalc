import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

const PAGES = ['additive', 'advice', 'firing', 'home', 'material', 'notes', 'recipe'];

/** The links to the other pages, with a warning when nobody is signed in. */
@Component({
  selector: 'gc-page-nav',
  imports: [RouterLink],
  template: `
    @if (!auth.signedIn()) {
      <header class="header-text">
        Oops! It seems you are not signed in. This will keep you from using the app. Go to
        <a routerLink="/signin">signin</a> or make a new account here: <a routerLink="/signup">signup</a>.
      </header>
    }
    <nav aria-label="Pages">
      <h3>You are on the <b>{{ title() }}</b> page.</h3>
      Links to pages:
      @for (page of otherPages(); track page) {
        <a [routerLink]="'/' + page" class="btn btn-light border">{{ page }}</a>
      }
    </nav>
  `
})
export class PageNav {
  protected readonly auth = inject(AuthService);

  /** The current page, as its route path. */
  readonly current = input.required<string>();

  protected readonly title = computed(() => {
    const page = this.current();
    return page.charAt(0).toUpperCase() + page.slice(1);
  });
  protected readonly otherPages = computed(() => PAGES.filter((page) => page !== this.current()));
}
