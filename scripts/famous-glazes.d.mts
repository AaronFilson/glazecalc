/** Where the published glazes' files are written. */
export const OUT: string;
/** The published glazes, resolved, in one language (English by default), as a file's text; throws for one marked published that fails the bar. */
export function publishedFile(glazes?: unknown[], code?: string): string;
/** Each language's file's text, by its name ('de.json'). */
export function publishedFiles(glazes?: unknown[]): Record<string, string>;
