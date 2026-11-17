/** The hash kept for an output: the first 16 hex digits of the SHA-256 of its text. */
export function hashOf(text: string): string;
/** Each output as [key, value], in a fixed order. */
export function outputs(): Generator<[string, unknown]>;
/** The hashes now, as an object of key to hash, in the order the outputs come (all of them by default). */
export function hashes(rows?: Iterable<[string, unknown]>): Record<string, string>;
/** What differs from the kept hashes: outputs whose hash changed, outputs gone, and outputs new. */
export function compare(
  kept: Record<string, string>,
  now: Record<string, string>
): { changed: string[]; gone: string[]; added: string[]; same: boolean };
