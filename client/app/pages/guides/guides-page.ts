import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';

/** The guides, in the order a new potter would read them. */
export const GUIDES = [
  {
    path: '/guides/glazing-basics',
    title: 'Glazing from first principles',
    text: 'What a glaze is, how it melts, and every word you will meet on a recipe or a bag, explained.'
  },
  {
    path: '/guides/making-a-glaze',
    title: 'How to make a glaze',
    text: 'Buying, storing, weighing, mixing and sieving a glaze, then testing it and keeping records.'
  },
  {
    path: '/guides/safe-mixing',
    title: 'Safe mixing and ventilation',
    text: 'Dust, respirators, cleaning, the materials that need most care, and venting the kiln.'
  },
  {
    path: '/guides/home-safety',
    title: "Don't poison your family",
    text: 'Pottery at home with children and pets: storage, dust, the kiln, and what to do if something is swallowed.'
  },
  {
    path: '/guides/firing',
    title: 'Firing a basic kiln',
    text: 'Cones, kiln sitters and manual switches, with schedules for bisque and glaze firings.'
  }
] as const;

/** The guides for new potters, listed. */
@Component({
  selector: 'gc-guides-page',
  imports: [PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="Guides"
      lead="Plain-language guides for new potters: from what a glaze is to firing it, and keeping everyone safe on the way."
    />
    <ul class="guide-cards">
      @for (guide of guides; track guide.path) {
        <li>
          <a [routerLink]="guide.path" class="panel guide-card">
            <h2>{{ guide.title }}</h2>
            <p>{{ guide.text }}</p>
          </a>
        </li>
      }
    </ul>
    <p class="guide-note">
      These guides gather what manufacturers, safety agencies and experienced potters publish, with the sources at the
      end of each. They are a starting point, not a substitute for your materials' safety data sheets, your kiln's
      manual or local rules.
    </p>
  `,
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
