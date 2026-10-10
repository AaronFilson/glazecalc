import { CanDeactivateFn } from '@angular/router';

/** A page that can hold work not saved yet, and asks before it is left for another. */
export interface AsksBeforeLeaving {
  /** True to leave now; otherwise the answer to its question, when it comes. */
  canLeave(): boolean | Promise<boolean>;
}

/**
 * Asks the page before a link in the app leaves it (the recipe page, about
 * changes not saved). A reload or a link out of the app is the browser's to
 * ask about: the page listens for beforeunload.
 */
export const askBeforeLeaving: CanDeactivateFn<AsksBeforeLeaving> = (page) => page?.canLeave() ?? true;
