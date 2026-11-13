import { Injector, afterNextRender } from '@angular/core';
import { reveal } from '../../shared/field-checks';

// Where the focus goes on the recipe page and its parts, once what it goes to is drawn.

/**
 * A style for a part of the editor in a file of its own: what gets the focus in the workbench scrolls clear
 * of the peek bar above it (WCAG 2.4.11), as recipe-page.ts has it for the rest of the editor.
 */
export const CLEAR_OF_PEEK = `
  :host-context(.layout-workbench) :is(input, select, textarea, button, a, summary, [tabindex]) {
    scroll-margin-block-start: 6rem;
  }
  @media (min-width: 992px) {
    :host-context(.layout-workbench) :is(input, select, textarea, button, a, summary, [tabindex]) {
      scroll-margin-block-start: 1rem;
    }
  }
`;

/** Moves the focus to an element, opening a fold or step it is in; nothing when it is not there. */
export function focusShown(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  reveal(element);
  element.focus();
}

/**
 * Gives an element the focus once the page is drawn. Print, compare, share and the swap report are deferred
 * (recipe-page.html, @defer): when one is asked for before its file is in, it draws a moment later, so the
 * focus waits for `deferred` (the element it brings) for up to two seconds. Any other element is looked for
 * once, as before; `fallback` takes the focus where the element is not there.
 */
export function focusWhenDrawn(
  injector: Injector,
  id: string,
  deferred: string | null,
  fallback: string | null = 'recipe-name'
): void {
  const started = Date.now();
  const attempt = (): void => {
    if (document.getElementById(id)) return focusShown(id);
    if (id === deferred && Date.now() - started < 2000) {
      setTimeout(attempt, 20);
      return;
    }
    if (fallback) focusShown(fallback);
  };
  afterNextRender(attempt, { injector });
}
