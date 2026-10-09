import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { PageHeader } from '../../shared/page-header';

/** The guides, in the order a new potter would read them; title and text are message keys. */
export const GUIDES = [
  {
    path: '/guides/glazing-basics',
    title: marker('guides.list.glazingBasics.title'),
    text: marker('guides.list.glazingBasics.text')
  },
  {
    path: '/guides/making-a-glaze',
    title: marker('guides.list.makingAGlaze.title'),
    text: marker('guides.list.makingAGlaze.text')
  },
  {
    path: '/guides/safe-mixing',
    title: marker('guides.list.safeMixing.title'),
    text: marker('guides.list.safeMixing.text')
  },
  {
    path: '/guides/home-safety',
    title: marker('guides.list.homeSafety.title'),
    text: marker('guides.list.homeSafety.text')
  },
  {
    path: '/guides/firing',
    title: marker('guides.list.firing.title'),
    text: marker('guides.list.firing.text')
  }
] as const;

/** The guides for new potters, listed. */
@Component({
  selector: 'gc-guides-page',
  imports: [PageHeader, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('guides.list.title')" [lead]="t('guides.list.lead')" />
    <ul class="guide-cards">
      @for (guide of guides; track guide.path) {
        <li>
          <a [routerLink]="guide.path" class="panel guide-card">
            <h2>{{ t(guide.title) }}</h2>
            <p>{{ t(guide.text) }}</p>
          </a>
        </li>
      }
    </ul>
    <p class="guide-note">{{ t('guides.list.note') }}</p>
  </ng-container>`,
  styles: `
    .guide-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      gap: 1rem;
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem;
    }
    .guide-card {
      display: block;
      height: 100%;
      margin: 0;
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s;
    }
    .guide-card:hover,
    .guide-card:focus-visible {
      border-color: var(--gc-primary);
    }
    .guide-card h2 {
      font-size: 1.3rem;
      color: var(--gc-primary);
    }
    .guide-card p {
      margin: 0;
      color: var(--gc-muted);
    }
  `
})
export class GuidesPage {
  protected readonly guides = GUIDES;
}
