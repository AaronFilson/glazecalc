import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { AuthService } from '../../core/auth.service';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

// Each section's title and text are the keys of their messages, translated where they are shown.
// Recipes opens at the saved recipes, a potter's collection.
const SECTIONS: { path: string; fragment?: string; title: string; text: string }[] = [
  {
    path: '/recipe',
    fragment: 'saved-recipes',
    title: marker('notebook.home.sections.recipe.title'),
    text: marker('notebook.home.sections.recipe.text')
  },
  {
    path: '/material',
    title: marker('notebook.home.sections.material.title'),
    text: marker('notebook.home.sections.material.text')
  },
  {
    path: '/additive',
    title: marker('notebook.home.sections.additive.title'),
    text: marker('notebook.home.sections.additive.text')
  },
  {
    path: '/firing',
    title: marker('notebook.home.sections.firing.title'),
    text: marker('notebook.home.sections.firing.text')
  },
  {
    path: '/notes',
    title: marker('notebook.home.sections.notes.title'),
    text: marker('notebook.home.sections.notes.text')
  },
  {
    path: '/advice',
    title: marker('notebook.home.sections.advice.title'),
    text: marker('notebook.home.sections.advice.text')
  },
  {
    path: '/guides',
    title: marker('notebook.home.sections.guides.title'),
    text: marker('notebook.home.sections.guides.text')
  },
  {
    path: '/account',
    title: marker('notebook.home.sections.account.title'),
    text: marker('notebook.home.sections.account.text')
  }
];

/** The signed-in start page: where to go next. */
@Component({
  selector: 'gc-home-page',
  imports: [PageHeader, RichText, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('notebook.home.title')" [lead]="greeting()" />
    <!-- Just after signing up: one next step, and the emailed link to open. -->
    @if (welcome || auth.unverified()) {
      <section class="panel home-welcome" aria-labelledby="home-welcome-heading">
        <h2 id="home-welcome-heading">
          {{ welcome ? t('notebook.home.welcome.heading') : t('notebook.home.welcome.confirmHeading') }}
        </h2>
        @if (welcome) {
          <p>{{ t('notebook.home.welcome.text') }}</p>
          <a routerLink="/recipe" class="btn btn-primary">{{ t('notebook.home.welcome.firstRecipe') }}</a>
        }
        @if (auth.unverified()) {
          <p class="home-confirm">
            <gc-rich
              [text]="
                t(welcome ? 'notebook.home.welcome.confirm' : 'notebook.home.welcome.confirmText', {
                  email: auth.email()
                })
              "
              [links]="{ account: '/account' }"
            />
          </p>
        }
      </section>
    }
    <ul class="home-sections">
      @for (section of sections; track section.path) {
        <li>
          <a [routerLink]="section.path" [fragment]="section.fragment" class="panel home-card">
            <h2>{{ t(section.title) }}</h2>
            <p>{{ t(section.text) }}</p>
          </a>
        </li>
      }
    </ul>
    <p class="muted">
      <gc-rich [text]="t('notebook.home.newHere')" [links]="{ advice: '/advice', about: '/about' }" />
    </p>
  </ng-container>`,
  styles: `
    /* An email address may be one long word: break it anywhere rather than widen the page on a phone. */
    .home-confirm {
      overflow-wrap: anywhere;
    }
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
    .home-welcome {
      border-inline-start: 4px solid var(--gc-primary);
    }
    .home-welcome h2 {
      font-size: 1.4rem;
    }
    .home-welcome .btn + .home-confirm,
    .home-confirm:last-child {
      margin: 1rem 0 0;
    }
    .home-welcome h2 + .home-confirm {
      margin-top: 0;
    }
  `
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  /** Just signed up: welcomed once, on this first visit. */
  protected readonly welcome = this.auth.welcome();

  constructor() {
    this.auth.welcome.set(false);
  }

  protected readonly sections = SECTIONS;

  protected readonly greeting = computed(() => {
    const email = this.auth.email();
    const trial = this.auth.trial();
    if (email) return translate('notebook.home.signedInAs', { email });
    if (trial) return translate('notebook.home.trying', { name: trial.name });
    return translate('notebook.home.welcomeBack');
  });
}
