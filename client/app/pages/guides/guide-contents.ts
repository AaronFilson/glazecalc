import { Component, input } from '@angular/core';

/** A section of a guide, for its contents list. */
export interface GuideSection {
  id: string;
  label: string;
}

/**
 * A guide's contents: links to its sections. A link moves the focus to the
 * section's heading (which has tabindex="-1"), so a keyboard or screen reader
 * user carries on reading from there.
 */
@Component({
  selector: 'gc-guide-contents',
  template: `
    <nav class="guide-contents" aria-label="On this page">
      <h2 class="guide-contents-heading">On this page</h2>
      <ol>
        @for (section of sections(); track section.id) {
          <li>
            <a [href]="'#' + section.id" (click)="go($event, section.id)">{{ section.label }}</a>
          </li>
        }
      </ol>
    </nav>
  `
})
export class GuideContents {
  readonly sections = input.required<GuideSection[]>();

  protected go(event: Event, id: string): void {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView?.({ block: 'start' });
    target.focus({ preventScroll: true });
  }
}
