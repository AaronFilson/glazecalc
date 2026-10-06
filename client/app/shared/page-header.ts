import { Component, input } from '@angular/core';

/** A page's title, with an optional line saying what the page is for. */
@Component({
  selector: 'gc-page-header',
  template: `
    <header class="page-header">
      <h1>{{ title() }}</h1>
      @if (lead()) {
        <p class="lead-text">{{ lead() }}</p>
      }
    </header>
  `
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly lead = input<string>('');
}
