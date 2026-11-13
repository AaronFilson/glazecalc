// Types for lib/famous-versions.js (docs/famous-glazes.md).

import type { Meter } from './chemistry';
import type { MaterialRecord } from './recipe/library';

/** What a version is worked out from: a glaze as its page reads it (lib/famous-glazes.js resolveGlaze). */
export interface ResolvedGlaze {
  slug: string;
  lead: boolean;
  recipe: { lines: Array<{ record: MaterialRecord; amount: number }> } | null;
  analysis: { oxides: Record<string, number> } | null;
  leadFree: {
    celsius: number;
    additives: Array<{ record: { fields?: Array<{ name: string }> } }>;
    prefer: MaterialRecord[];
  } | null;
}

/** A version as the build ships it: each line [the material's name, its percent of the base], and how near it comes. */
export interface GlazeVersion {
  lines: Array<[string, number]>;
  verdict: 'close' | 'fair' | 'poor';
}

/** The library's regions a version is made for, as the page offers them. */
export const VERSION_REGIONS: readonly string[];

/** The standard materials as the app's bundle has them, in the order of data/materials.ndjson. */
export function standardMaterials(): MaterialRecord[];

/** The unity formula a version aims at: the native recipe's, or a lead glaze's lead-free target; null with none. */
export function targetUnity(glaze: ResolvedGlaze): Record<string, number> | null;

/** The materials a version may use: a region's base materials ('US' to 'JP'), or for '' a lead-free version's own. */
export function offeredIn(
  glaze: ResolvedGlaze,
  library: string,
  materials?: readonly MaterialRecord[]
): MaterialRecord[];

/**
 * The glaze made from the materials offered, solved for its target on the meter given (one that never cuts
 * if not); null with nothing to aim at or nothing offered; throws a RecipeError as solveTarget does.
 */
export function versionOf(glaze: ResolvedGlaze, offered: readonly MaterialRecord[], meter?: Meter): GlazeVersion | null;

/**
 * Every version of a glaze by the region it is made for ('' for a lead-free version's own materials), what
 * keeps any from being shipped, and the most work a search did. `work` bounds each search (never, if not given).
 */
export function glazeVersions(
  glaze: ResolvedGlaze,
  options?: { materials?: readonly MaterialRecord[]; work?: number }
): { versions: Record<string, GlazeVersion>; problems: string[]; used: number };
