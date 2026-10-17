import * as checksLib from '../../../../lib/recipe/checks';
import { listOf } from '../../shared/format';
import { Additive, Material } from '../../core/models';
import { oxideName } from './pool';
import { cautionText } from './recipe-messages';

// Past a recommended limit, say what the fired glaze will likely do, rather
// than block (docs/adr/0012-choosing-materials.md). The checks themselves are
// shared with the server (lib/recipe/checks.js); this puts what they find in
// the page's language.

export { rawClayPercent } from '../../../../lib/recipe/checks';

export interface CheckInput extends checksLib.CheckInput {
  lines: Array<{ material: Material; amount: string | number | undefined }>;
  additives?: Additive[];
}

/** Warnings, in plain words, for what is past a recommended limit. */
export function pastLimits(input: CheckInput): string[] {
  return checksLib.pastLimits(input).map(cautionText);
}

/**
 * Notes on the recipe's size and small amounts: many materials to buy and
 * weigh, or an amount too small to weigh well in a test batch.
 */
export function sizeNotes(
  lines: Array<{ material: Material; amount: string | number | undefined }>,
  low?: boolean
): string[] {
  return checksLib.sizeNotes(lines, low).map(cautionText);
}

/** "potash, soda": oxide names for a list. */
export const oxideNames = (oxides: string[]): string => listOf(oxides.map(oxideName));
