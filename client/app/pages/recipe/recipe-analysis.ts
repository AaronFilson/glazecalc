import { translate } from '@jsverse/transloco';
import { MaterialInput, RecipeLine, calculateUMF, materialWeights } from '../../../../lib/chemistry';
import type { ChemistryError } from '../../../../lib/chemistry';
import { chemistryText } from '../../i18n/coded';
import { Additive, Recipe, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { formatPlain } from '../../shared/format';
import { amountOf, totalOf, unitOf } from './rebase';

// A recipe's chemistry, shared by the recipe page and the print view.

/** Recipes saved by mongoose hold the analysis in a one-element array. */
export function savedAnalysis(recipe: Recipe): RecipeAnalysis | null {
  const computed = Array.isArray(recipe.computed) ? recipe.computed[0] : recipe.computed;
  return computed && computed.uList ? computed : null;
}

export interface Evaluation {
  analysis: RecipeAnalysis | null;
  /** Why there is no unity formula, such as a recipe with no flux. */
  problem: string | null;
  warnings: string[];
}

export interface EvaluateOptions {
  /** Count the colorants and additives in the unity formula too. */
  includeAdditives?: boolean;
  /** The chemistry an additive borrows by name (chemistryOf), for one with no analysis of its own. */
  chemistryOf?: (name: string) => MaterialInput | undefined;
}

/** Whether the unity formula can read a material's or additive's chemistry. */
function hasChemistry(record: MaterialInput): boolean {
  try {
    materialWeights(record);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether an additive is a copy saved before additives carried their LOI
 * (October 2026): oxides, but no percentmole. Its oxides may be the raw
 * formula's (CoO for cobalt carbonate), so they cannot be counted as fired.
 */
const isOldCopy = (additive: Additive): boolean =>
  !additive.percentmole && !additive.chemistryOf && !additive.noChemistry;

/**
 * The unity formula of a recipe. Blank amounts count as 0. Additives are left
 * out unless they are included; then each counts at its weight in the base's
 * unit: a percent of the base's total, or its parts or grams as they are.
 * Stains and other additives with no chemistry add nothing, and an additive
 * whose analysis the unity formula cannot read is left out, with a warning.
 * An old copy in a saved recipe counts with the chemistry of the library's
 * record of that name, or is left out, with a warning, when there is none.
 */
export function evaluate(
  materials: RecipeMaterial[],
  additives: Additive[] = [],
  options: EvaluateOptions = {}
): Evaluation {
  if (!materials.some((m) => amountOf(m.amount) > 0 || (m.amount ?? '').trim() !== '')) {
    return { analysis: null, problem: null, warnings: [] };
  }
  const lines: RecipeLine[] = materials.map((material) => ({ material, amount: material.amount ?? '' }));
  const leftOut: string[] = [];
  if (options.includeAdditives) {
    const baseTotal = totalOf(materials.map((m) => m.amount));
    for (const additive of additives) {
      const amount = amountOf(additive.amount);
      if (!amount) continue;
      const record = isOldCopy(additive) ? (options.chemistryOf?.(additive.name) as Additive | undefined) : additive;
      if (!record || isOldCopy(record)) {
        leftOut.push(translate('recipe.analysis.oldCopy', { name: additive.name }));
        continue;
      }
      if (record.noChemistry) continue;
      const chemistry = record.chemistryOf ? options.chemistryOf?.(record.chemistryOf) : record;
      if (!chemistry || !hasChemistry(chemistry)) {
        leftOut.push(translate('recipe.analysis.noAnalysis', { name: additive.name }));
        continue;
      }
      const weight = unitOf(additive) === 'percent' ? (amount * baseTotal) / 100 : amount;
      lines.push({ material: { ...chemistry, name: additive.name }, amount: weight });
    }
  }
  try {
    const result = calculateUMF(lines);
    // uList is the key saved recipes and older versions of the app use.
    return {
      analysis: { ...result, uList: result.umf },
      problem: null,
      warnings: [...result.warningCodes.map(chemistryText), ...leftOut]
    };
  } catch (e) {
    return { analysis: null, problem: chemistryText(e as ChemistryError), warnings: [] };
  }
}

/** A colorant's amount with its unit, written the reader's way: 2%, 1,5%, 3 parts, 5 g. */
export function additiveAmount(additive: Additive): string {
  const amount = (additive.amount ?? '').trim();
  if (!amount) return '';
  const unit = unitOf(additive);
  const shown = formatPlain(amount);
  if (unit === 'percent') return shown + '%';
  if (unit === 'grams') return shown + ' g';
  // The number decides the plural: 1 part, 1,5 parts (but 1,5 part in French).
  return translate('recipe.analysis.parts', { amount: shown, count: amountOf(amount) });
}
