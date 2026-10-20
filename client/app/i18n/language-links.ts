import { Component, computed, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { languageName } from './language';
import { languageSections } from './language-groups';

let nextId = 0;

/**
 * The languages offered, each in its own name and linked to the page in it, by the part of the world they
 * are spoken in: a list that stays short to look at with 45 languages or more, in as many columns as the
 * width holds. Links, not a chooser, so the page can be followed without a script, found by a search
 * engine, and opened in a new tab; the footer remembers the one chosen. Names are set apart (bdi), so a
 * name in another script reads its own way in a page that reads the other.
 */
@Component({
  selector: 'gc-language-links',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @for (section of sections(); track $index) {
      <div class="language-group">
        @if (section.name) {
          <p class="language-group-name" [id]="groupId($index)">{{ t(section.name) }}</p>
        }
        <ul class="language-list" [attr.aria-labelledby]="section.name ? groupId($index) : null">
          @for (code of section.codes; track code) {
            <li>
              <a
                [href]="href()(code)"
                [attr.lang]="code"
                [attr.hreflang]="hreflang() ? code : null"
                translate="no"
                [attr.aria-current]="code === current() ? ariaCurrent() : null"
                (click)="picked.emit({ event: $event, code })"
                ><bdi dir="auto">{{ languageName(code) }}</bdi></a
              >
            </li>
          }
        </ul>
      </div>
    }
  </ng-container>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      text-align: start;
    }
    .language-group + .language-group {
      margin-top: 0.75rem;
    }
    .language-group-name {
      margin: 0 0 0.15rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--gc-muted);
    }
    .language-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
      gap: 0 1rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    /* A link is at least 24px high (WCAG 2.2, 2.5.8). The font is the page's, or the footer's own (styles.scss), which
       sets each name in the device's serif so a page does not fetch Lora's other scripts for one line. */
    a {
      display: inline-block;
      padding-block: 0.2rem;
      overflow-wrap: anywhere;
    }
  `
})
export class LanguageLinks {
  /** The codes of the languages offered. */
  readonly languages = input.required<readonly string[]>();
  /** Where a language's link goes. */
  readonly href = input.required<(code: string) => string>();
  /** The language of this page, which is marked. */
  readonly current = input.required<string>();
  /** How the current language's link is marked: 'page' where it is this page, 'true' where it is only the language. */
  readonly ariaCurrent = input<'page' | 'true'>('page');
  /** Names each link's language with hreflang, for the page that search engines read the languages from. */
  readonly hreflang = input(false);
  /** A link was followed: the footer remembers the choice. */
  readonly picked = output<{ event: MouseEvent; code: string }>();

  protected readonly languageName = languageName;
  protected readonly sections = computed(() => languageSections(this.languages()));
  private readonly uid = 'language-group-' + nextId++;

  protected groupId(index: number): string {
    return this.uid + '-' + index;
  }
}
