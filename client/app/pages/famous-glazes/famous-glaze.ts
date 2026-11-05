import { OXIDE_GROUPS, calculateUMF, leadFreeTarget } from '../../../../lib/chemistry';
import { suggestable } from '../../../../lib/recipe/library';
import * as solveLib from '../../../../lib/recipe/solve';
import { Additive, Material, Recipe, RecipeMaterial } from '../../core/models';
import { FamousGlaze, GlazeLine } from './famous-data';

// What a famous glaze's page works out (docs/famous-glazes.md): the native recipe's unity formula, and a
// version from the materials sold where the reader is, solved for that formula (or, for a lead glaze, for
// its lead-free target) by the same solver as Target & Solve (lib/recipe/solve.js).

export * from './famous-data';

const isFlux = (oxide: string): boolean => OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO';

/** The native recipe's unity formula (its base, without the colorants), or null without a recipe. */
export function nativeUnity(glaze: FamousGlaze): Record<string, number> | null {
  if (!glaze.recipe) return null;
  return calculateUMF(glaze.recipe.lines.map((line) => ({ material: line.record, amount: line.amount }))).umf;
}

/**
 * The unity formula the local version aims at: the native recipe's, or for a lead glaze its analysis with
 * the lead's share of the fluxes handed to others (lib/chemistry leadFreeTarget) for the lead-free
 * version's firing. Tin and other oxides a colorant gives are left to the additives.
 */
export function targetUnity(glaze: FamousGlaze): Record<string, number> | null {
  if (!glaze.lead) return nativeUnity(glaze);
  if (!glaze.analysis || !glaze.leadFree) return null;
  const additiveOxides = new Set(
    glaze.leadFree.additives.flatMap((line) => (line.record.fields ?? []).map((field) => field.name))
  );
  const base = Object.fromEntries(
    Object.entries(glaze.analysis.oxides).filter(([oxide]) => !additiveOxides.has(oxide))
  );
  const { moles } = solveLib.targetOf({ kind: 'analysis', oxides: base });
  const target = leadFreeTarget(moles, { celsius: glaze.leadFree.celsius });
  const fluxes = Object.entries(target).reduce((sum, [oxide, amount]) => (isFlux(oxide) ? sum + amount : sum), 0);
  return Object.fromEntries(Object.entries(target).map(([oxide, amount]) => [oxide, amount / fluxes]));
}

/** The kinds of material a base glaze is made of; colorants and the like come as additives. */
const BASE_KINDS = ['feldspar', 'clay', 'frit', 'boron', 'flux', 'silica', 'alumina'];

/**
 * The standard materials a version may use where the reader buys (the library's region: US, UK, EU or
 * AU): sold there, current, no lead, not soluble, and base materials only. '' is the version's own
 * preferred materials (the lead-free proposal's), or none: the reader is asked where they buy.
 */
export function offeredIn(glaze: FamousGlaze, library: string, standard: readonly Material[]): Material[] {
  if (!library) return [...(glaze.leadFree?.prefer ?? [])];
  return standard.filter(
    (material) =>
      BASE_KINDS.includes(material.category ?? '') &&
      !(material as { soluble?: boolean }).soluble &&
      suggestable(material as never, { region: library })
  );
}

export interface LocalVersion {
  /** The base, in percent, as text. */
  materials: RecipeMaterial[];
  additives: Additive[];
  verdict: 'close' | 'fair' | 'poor';
  unity: Record<string, number>;
}

const asAdditive = (line: GlazeLine<Additive>): Additive => ({
  ...line.record,
  amount: String(line.amount),
  unit: 'percent'
});

/** The glaze from the materials offered, solved for its target; null where it cannot be. */
export function localVersion(glaze: FamousGlaze, offered: readonly Material[]): LocalVersion | null {
  const target = targetUnity(glaze);
  if (!target || !offered.length) return null;
  try {
    const solved = solveLib.solveTarget<RecipeMaterial>(
      { kind: 'unity', oxides: target },
      offered.map((material) => ({ material: material as RecipeMaterial, must: false }))
    );
    const additives = (glaze.lead ? (glaze.leadFree?.additives ?? []) : (glaze.recipe?.additives ?? [])).map(
      asAdditive
    );
    return {
      materials: solved.materials,
      additives,
      verdict: solved.report.closeness!.verdict,
      unity: solved.unity
    };
  } catch {
    return null;
  }
}

/** The native recipe as a new recipe for the recipe page, not saved yet; null for a lead glaze or none. */
export function nativeRecipe(glaze: FamousGlaze, title: string): Recipe | null {
  if (glaze.lead || !glaze.recipe) return null;
  return {
    title,
    materials: glaze.recipe.lines.map((line) => ({ ...line.record, amount: String(line.amount) })),
    additives: glaze.recipe.additives.map(asAdditive)
  };
}
