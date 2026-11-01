import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { REFERENCE_LANGUAGE_LIST } from '../materials/reference-text';
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
  },
  {
    path: '/guides/learn-with-john-britt',
    title: marker('guides.list.learnWithJohnBritt.title'),
    text: marker('guides.list.learnWithJohnBritt.text')
  }
] as const;

/**
 * The reference pages guides point to (the cone chart, the standard materials): a guide in a language they
 * are not translated into (REFERENCE_LANGUAGES) does not offer them. A guide names the ones it wants in its
 * route's data: { related: ['cones'] }.
 */
export const REFERENCE_PAGES = {
  cones: {
    path: '/cones',
    title: marker('guides.related.cones.title'),
    text: marker('guides.related.cones.text')
  },
  materials: {
    path: '/materials',
    title: marker('guides.related.materials.title'),
    text: marker('guides.related.materials.text')
  }
} as const;

export type ReferencePage = keyof typeof REFERENCE_PAGES;

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
    @if (english) {
      <h2 id="reference">{{ t('guides.related.heading') }}</h2>
      <ul class="guide-cards">
        @for (page of reference; track page.path) {
          <li>
            <a [routerLink]="page.path" class="panel guide-card">
              <h3>{{ t(page.title) }}</h3>
              <p>{{ t(page.text) }}</p>
            </a>
          </li>
        }
      </ul>
    }
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
    .guide-card h2,
    .guide-card h3 {
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
  protected readonly reference = Object.values(REFERENCE_PAGES);
  /** The reference pages are offered in the languages they are translated into (English is the first). */
  protected readonly english = inject(REFERENCE_LANGUAGE_LIST).includes(inject(PAGE_LANGUAGE));
}
