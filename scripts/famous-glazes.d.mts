/** Where the published glazes' file is written. */
export const OUT: string;
/** The published glazes, resolved, as the file's text; throws for one marked published that fails the bar. */
export function publishedFile(glazes?: unknown[]): string;
