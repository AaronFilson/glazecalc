/** True only in a release made to remove a broken service worker (deploy/README.md). */
export const KILL_SWITCH: boolean;
/** The page the worker shows for an address while offline, in the browser build. */
export const SHELL: string;
/** The collections of the standard library the build writes a copy of for the recipe page. */
export const LIBRARY: string[];
/** index.html as the offline page: the app's root with a nonce for its styles, the same for the same page. */
export function shellOf(indexHtml: string): { nonce: string; html: string };
/** A standard record as the API sends it. */
export function asSent(record: Record<string, unknown>): Record<string, unknown>;
/** Writes the offline page, the standard library, ngsw.json and the workers into the browser build. */
export function addServiceWorker(
  browser?: string,
  configFile?: string,
  kill?: boolean
): Promise<{ hashTable: Record<string, string>; index: string }>;
