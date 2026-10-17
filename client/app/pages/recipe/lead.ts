import * as recipe from '../../../../lib/recipe';
import { Additive, RecipeMaterial } from '../../core/models';
import { LibraryMaterial } from './compare';
import { Report, TryMaterial, reportText } from './pool';
import { cautionText, recipeText } from './recipe-messages';

// Replace lead (docs/adr/0011-replacing-lead.md and 0012): an old lead glaze
// rebuilt without lead on a lead-free base frit, or its colorants carried onto
// that frit's 85:15 base with kaolin. The working out is shared with the
// server (lib/recipe/lead.js); this puts what it says in the page's language.

export type { BaseChoice, LeadMode } from '../../../../lib/recipe';
export { leadFreeBases, leadIn, recipeHasLead, roleOf } from '../../../../lib/recipe';

export interface Replacement {
  materials: RecipeMaterial[];
  /** What changed: "China Clay 15 → 10.1", "Standard Borax Frit (Potclays 2263) 61.5, new". */
  changes: string[];
  /** What to expect, and what to watch for: colours, crazing, haze, limits passed. */
  cautions: string[];
  /** What each material does (a rebuild only). */
  report: Report | null;
}

/** More to work with, and limits the potter lifted. */
export interface LeadExtras {
  tries?: TryMaterial[];
  avoid?: string[];
  /** Names of materials whose suggested cap the potter lifted. */
  uncapped?: string[];
}

/**
 * The recipe without lead, on the chosen base frit: rebuilt to the lead-free
 * formula for the firing, or its colorants carried onto the frit's 85:15 base
 * with kaolin. Either way the base comes to the old batch's total, so
 * colorants keep their share of it.
 */
export function replaceLead(
  lines: RecipeMaterial[],
  additives: Additive[],
  find: (name: string) => LibraryMaterial | undefined,
  standard: LibraryMaterial[],
  region: string,
  options: { base: string; celsius: number; mode: recipe.LeadMode } & LeadExtras
): Replacement {
  const replacement = recipe.replaceLead<RecipeMaterial>(lines, additives, find, standard, region, options);
  return {
    materials: replacement.materials,
    changes: replacement.changes.map(recipeText),
    cautions: replacement.cautions.map(cautionText),
    report: replacement.report && reportText(replacement.report)
  };
}
