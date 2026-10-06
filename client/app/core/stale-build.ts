import { NavigationError } from '@angular/router';

const RELOADED_KEY = 'reloadedFor';
const ONE_MINUTE = 60_000;

/**
 * Each page's code is a separate file named after its contents, and a new build
 * replaces those files. A tab opened before a deploy still asks for the old
 * files, gets a 404, and the link does nothing. Loading the address afresh picks
 * up the new build. A second failure for the same address within a minute is left
 * alone, so a real outage cannot cause a reload loop.
 */
export function reloadIfCodeIsMissing(
  error: NavigationError,
  location: Pick<Location, 'assign'> = window.location,
  storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage
): void {
  if (!isMissingCode(error.error)) return;
  try {
    const last = JSON.parse(storage.getItem(RELOADED_KEY) ?? 'null') as { url?: string; at?: number } | null;
    if (last && last.url === error.url && Date.now() - (last.at ?? 0) < ONE_MINUTE) return;
    storage.setItem(RELOADED_KEY, JSON.stringify({ url: error.url, at: Date.now() }));
  } catch {
    // Without storage there is no loop guard, so do not reload.
    return;
  }
  location.assign(error.url);
}

/** A failed import of a page's code file, as each browser words it. */
export function isMissingCode(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /dynamically imported module|Importing a module script failed/i.test(message);
}
