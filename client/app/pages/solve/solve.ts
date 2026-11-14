import { MESSAGES } from '../../../../lib/chemistry';
import type { ChemistryError, Closeness } from '../../../../lib/chemistry';
import type { FiringBand } from '../../../../lib/recipe/limits';
import { RecipeError } from '../../../../lib/recipe/messages';
import * as solveLib from '../../../../lib/recipe/solve';
import { RecipeMaterial } from '../../core/models';
import { chemistryText } from '../../i18n/coded';
import { Report, TryMaterial, reportText } from '../recipe/pool';
import { cautionText, recipeText } from '../recipe/recipe-messages';

// Solve for a target (docs/adr/0026-target-and-solve.md): a recipe from the
// materials given whose unity formula comes as near a typed target as they
// allow. The solving is shared with the server's solve_target
// (lib/recipe/solve.js); this puts what it says in the page's language.

export type TargetKind = 'unity' | 'analysis';

export interface Solved {
  /** The recipe, its amounts in percent as text. */
  materials: RecipeMaterial[];
  /** The target's unity formula, and the recipe's. */
  target: Record<string, number>;
  unity: Record<string, number>;
  /** What a unity formula's fluxes added up to as typed (1 for an analysis). */
  fluxes: number;
  report: Report;
  /** How near each oxide comes (lib/chemistry/closeness.js). */
  closeness: Closeness;
}

/** What was asked: the target, and the materials it may use. */
export interface SolveRun {
  kind: TargetKind;
  oxides: Record<string, number>;
  tries: TryMaterial[];
  /** Names left out, and raw clays whose hold is lifted. */
  avoid: string[];
  uncapped: string[];
}

/**
 * The recipe for the target, from the materials to try; an Error in the
 * page's language when it cannot be made (an oxide the app does not know, no
 * flux, no materials, none with the target's oxides).
 */
export function solve(run: SolveRun): Solved {
  let solved: solveLib.Solved<RecipeMaterial>;
  try {
    solved = solveLib.solveTarget<RecipeMaterial>(
      { kind: run.kind, oxides: run.oxides },
      run.tries as Array<{ material: RecipeMaterial; must: boolean }>,
      { avoid: run.avoid, uncapped: run.uncapped }
    );
  } catch (error) {
    // The library says why in a code; the page says it in words. The chemistry's own too: no flux in
    // what the materials chosen bring.
    if (error instanceof RecipeError)
      throw new SolveProblem(recipeText(error), error.code, error.params?.['of'] === 'offered');
    const coded = error as ChemistryError;
    if (coded?.code && coded.code in MESSAGES) throw new SolveProblem(chemistryText(coded), coded.code);
    throw error;
  }
  return {
    materials: solved.materials,
    target: solved.target,
    unity: solved.unity,
    fluxes: solved.fluxes,
    report: reportText(solved.report),
    closeness: solved.report.closeness!
  };
}

/** Why a target could not be solved, in words, with the library's code, and whether it is the materials'. */
export class SolveProblem extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly ofMaterials = false
  ) {
    super(message);
  }
}

/** The recipe page's cautions for the solved recipe, for the firing chosen: past a limit, and too small to weigh. */
export const cautionsOf = (solved: Solved, band: FiringBand | ''): string[] =>
  solveLib.solveCautions(solved.materials, solved.unity, band ? { band } : {}).map(cautionText);

export const parseTarget = solveLib.parseTarget;
