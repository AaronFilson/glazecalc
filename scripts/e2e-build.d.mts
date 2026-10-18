/** What the client build and the prerendering read, relative to the checkout. */
export const SOURCES: string[];
/** Why the build in `root`/dist must run again, or '' when it is up to date. */
export function staleReason(root?: string): string;
/** Records that a build which started at `started` (ms) finished. */
export function markBuilt(root: string, started: number): void;
/** Runs `fn` holding the checkout's build lock, waiting for another process that holds it. */
export function withLock<T>(
  root: string,
  fn: () => T,
  options?: { waitMs?: number; onWait?: (pid: number) => void }
): T;
