import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { AuthService } from '../../core/auth.service';
import { RichText } from '../../i18n/rich-text';
import { PageHeader } from '../../shared/page-header';

// Each section's title and text are the keys of their messages, translated where they are shown.
const SECTIONS = [
  {
    path: '/recipe',
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
  }
];

/** The signed-in start page: where to go next. */
@Component({
  selector: 'gc-home-page',
  imports: [PageHeader, RichText, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('notebook.home.title')" [lead]="greeting()" />
    <ul class="home-sections">
      @for (section of sections; track section.path) {
        <li>
          <a [routerLink]="section.path" class="panel home-card">
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
    if (email) return translate('notebook.home.signedInAs', { email });
    if (trial) return translate('notebook.home.trying', { name: trial.name });
    return translate('notebook.home.welcomeBack');
  });
}
