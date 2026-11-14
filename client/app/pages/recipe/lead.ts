import * as leadLib from '../../../../lib/recipe/lead';
import { Additive, RecipeMaterial } from '../../core/models';
import { MaterialInput } from '../../../../lib/chemistry';
import { LibraryMaterial } from './compare';
import { Report, TryMaterial, reportText } from './pool';
import { plainAmount } from './rebase';
import { unityLines } from './recipe-analysis';
import { cautionText, recipeText } from './recipe-messages';

// Replace lead (docs/adr/0011-replacing-lead.md and 0012): an old lead glaze
// rebuilt without lead on a lead-free base frit, or its colorants carried onto
// that frit's 85:15 base with kaolin. The working out is shared with the
// server (lib/recipe/lead.js); this puts what it says in the page's language.

export type { BaseChoice, LeadMode } from '../../../../lib/recipe/lead';
export { leadFreeBases, leadIn, recipeHasLead } from '../../../../lib/recipe/lead';
export { roleOf } from '../../../../lib/recipe/materials';

/**
 * The lines the lead and barium warnings read: the materials and the additives too (a lead frit or
 * red lead added as a colorant), whether or not the unity formula counts the additives, at their
 * weights as it would count them.
 */
function warnedLines(
  materials: RecipeMaterial[],
  additives: Additive[],
  chemistryOf?: (name: string) => MaterialInput | undefined
): RecipeMaterial[] {
  // An additive's weight is a number, written plainly: String(0.0000001), "1e-7", reads as no amount, no lead.
  return unityLines(materials, additives, { includeAdditives: true, chemistryOf }).lines.map(
    (line) =>
      ({
        ...(line.material as RecipeMaterial),
        amount: typeof line.amount === 'number' ? plainAmount(line.amount) : String(line.amount)
      }) as RecipeMaterial
  );
}

/** The lead in a recipe, for its caution, in its materials and additives. Null without lead. */
export function leadOf(
  materials: RecipeMaterial[],
  additives: Additive[],
  chemistryOf?: (name: string) => MaterialInput | undefined
): { unity: number; percent: number } | null {
  const lines = warnedLines(materials, additives, chemistryOf);
  return leadLib.recipeHasLead(lines) ? leadLib.leadIn(lines) : null;
}

/** The barium in a recipe, for the caution beside lead's: BaO past 0.10 in the unity formula, likely to leach from 0.40. */
export function bariumOf(
  materials: RecipeMaterial[],
  additives: Additive[],
  chemistryOf?: (name: string) => MaterialInput | undefined
): { unity: number; likely: boolean } | null {
  return leadLib.bariumIn(warnedLines(materials, additives, chemistryOf));
}

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
  options: { base: string; celsius: number; mode: leadLib.LeadMode } & LeadExtras
): Replacement {
  const replacement = leadLib.replaceLead<RecipeMaterial>(lines, additives, find, standard, region, options);
  return {
    materials: replacement.materials,
    changes: replacement.changes.map(recipeText),
    cautions: replacement.cautions.map(cautionText),
    report: replacement.report && reportText(replacement.report)
  };
}
