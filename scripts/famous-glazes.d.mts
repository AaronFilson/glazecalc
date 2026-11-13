import type { GlazeVersion } from '../lib/famous-versions.js';

/** Where the published glazes' files are written. */
export const OUT: string;
/** `work` bounds each version's search (lib/famous-versions.js); none does unless a test gives one. */
export interface PublishOptions {
  work?: number;
}
/** A published glaze before its prose is put in a language: resolved, with its versions by region. */
export type PublishedGlaze = { slug: string; versions: Record<string, GlazeVersion> } & Record<string, unknown>;
/**
 * The published glazes, resolved, each with its versions by region ('' for a lead-free version's own materials);
 * throws for one marked published that fails the bar, or has a version that cannot be made or would be cut short.
 */
export function publishedGlazes(glazes?: unknown[], options?: PublishOptions): PublishedGlaze[];
/** The published glazes in one language (English by default), as a file's text; throws as publishedGlazes does. */
export function publishedFile(glazes?: unknown[], code?: string, options?: PublishOptions): string;
/** Each language's file's text, by its name ('de.json'); the versions are worked out once for all of them. */
export function publishedFiles(glazes?: unknown[], options?: PublishOptions): Record<string, string>;
