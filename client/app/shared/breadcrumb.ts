import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import type { Crumb } from './structured-data';

/**
 * The trail from the home page to this page, drawn above the page's title, to the W3C's breadcrumb pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a navigation landmark holding an ordered list, a
 * link for each page but the last, and the last marked as the current page. The separators are drawn by the
 * stylesheet, so a screen reader does not read them, and they turn round on a right-to-left page.
 *
 * It takes the same `crumbs` as the page's BreadcrumbList (shared/structured-data.ts, referencePage and
 * article), so what search engines read and what the visitor sees are one list. The paths are without the
 * language, as RouterLink wants them: the links stay in the page's language like every other link.
 */
@Component({
  selector: 'gc-breadcrumb',
  imports: [RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <nav class="crumbs" [attr.aria-label]="t('nav.breadcrumb')">
      <ol>
        @for (crumb of crumbs(); track crumb.path; let last = $last) {
          <li>
            @if (last) {
              <span aria-current="page">{{ crumb.name }}</span>
            } @else {
              <a [routerLink]="crumb.path">{{ crumb.name }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  </ng-container>`,
  styles: `
    .crumbs {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      color: var(--gc-muted);
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 0.15rem 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      overflow-wrap: anywhere;
    }
    li + li::before {
      content: '\\203A';
      content: '\\203A' / '';
      display: inline-block;
      margin-inline-end: 0.5rem;
    }
    :host-context([dir='rtl']) li + li::before {
      transform: scaleX(-1);
    }
    a {
      color: inherit;
    }
  `
})
export class Breadcrumb {
  /** The trail, the home page first and this page last (shared/structured-data.ts, Crumb). */
  readonly crumbs = input.required<ReadonlyArray<Crumb>>();
}
