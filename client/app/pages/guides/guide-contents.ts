import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/** A section of a guide, for its contents list. */
export interface GuideSection {
  id: string;
  label: string;
  /** The language of its heading, where that is not the page's: 'en' until it is translated. */
  language?: string | null;
}

/**
 * Links to the sections of the guide on the page. Each is the guide's own
 * address with the section's id (/de/guides/firing#cones), so it works copied,
 * shared or opened in a new tab. Followed here, it moves the focus to the
 * section's heading (which has tabindex="-1"), so a keyboard or screen reader
 * user carries on reading from there, and the address bar names the section.
 * Made where a component's fields are.
 */
export class SectionLinks {
  private readonly location = inject(Location);
  /** The guide's address in the app, with any query: /guides/firing. */
  private readonly page = this.location.path();

  href(id: string): string {
    return this.location.prepareExternalUrl(this.page + '#' + id);
  }

  go(event: MouseEvent, id: string): void {
    const target = document.getElementById(id);
    // A new tab or window is the browser's to open.
    if (!target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    target.scrollIntoView?.({ block: 'start' });
    target.focus({ preventScroll: true });
    this.location.replaceState(this.page + '#' + id, '', this.location.getState());
  }
}

/** A guide's contents: links to its sections (SectionLinks). */
@Component({
  selector: 'gc-guide-contents',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <nav class="guide-contents" [attr.aria-label]="t('guides.contents')">
      <h2 class="guide-contents-heading">{{ t('guides.contents') }}</h2>
      <ol>
        @for (section of sections(); track section.id) {
          <li [attr.lang]="section.language">
            <a [href]="links.href(section.id)" (click)="links.go($event, section.id)">{{ section.label }}</a>
          </li>
        }
      </ol>
    </nav>
  </ng-container>`
})
export class GuideContents {
  readonly sections = input.required<GuideSection[]>();
  protected readonly links = new SectionLinks();
}
