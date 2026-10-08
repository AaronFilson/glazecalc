import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PageHeader } from '../../shared/page-header';

const SECTIONS = [
  {
    path: '/recipe',
    title: 'Recipes',
    text: 'Build a glaze from materials and amounts, see its unity formula, and save it.'
  },
  {
    path: '/material',
    title: 'Materials',
    text: 'Add raw materials of your own, from a chemical formula or a supplier’s analysis.'
  },
  {
    path: '/additive',
    title: 'Additives and colorants',
    text: 'Keep the colorants and opacifiers you add on top of a base glaze.'
  },
  { path: '/firing', title: 'Firing logs', text: 'Record times, temperatures and cones for each firing.' },
  { path: '/notes', title: 'Notes', text: 'Keep test results and anything else worth remembering.' },
  { path: '/advice', title: 'Glaze advice', text: 'Tips on mixing, glazing and firing, and your own advice.' },
  {
    path: '/guides',
    title: 'Guides',
    text: 'From what a glaze is to firing it, and keeping everyone safe on the way.'
  }
];

/** The signed-in start page: where to go next. */
@Component({
  selector: 'gc-home-page',
  imports: [PageHeader, RouterLink],
  template: `
    <gc-page-header title="Your studio notebook" [lead]="greeting()" />
    <ul class="home-sections">
      @for (section of sections; track section.path) {
        <li>
          <a [routerLink]="section.path" class="panel home-card">
            <h2>{{ section.title }}</h2>
            <p>{{ section.text }}</p>
          </a>
        </li>
      }
    </ul>
    <p class="muted">
      New to unity formulas? The <a routerLink="/advice">advice page</a> explains the basics, and the
      <a routerLink="/about">about page</a> says how Glazecalc works.
    </p>
  `,
  styles: `
    .home-sections {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      gap: 1rem;
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem;
    }
    .home-card {
      display: block;
      height: 100%;
      margin: 0;
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s;
    }
    .home-card:hover,
    .home-card:focus-visible {
      border-color: var(--gc-primary);
    }
    .home-card h2 {
      font-size: 1.3rem;
      color: var(--gc-primary);
    }
    .home-card p {
      margin: 0;
      color: var(--gc-muted);
    }
  `
})
export class HomePage {
  private readonly auth = inject(AuthService);

  protected readonly sections = SECTIONS;

  protected readonly greeting = computed(() => {
    const email = this.auth.email();
    const trial = this.auth.trial();
    if (email) return 'Signed in as ' + email + '.';
    if (trial) return 'Trying Glazecalc as ' + trial.name + '. Start with a recipe.';
    return 'Pick up where you left off.';
  });
}
