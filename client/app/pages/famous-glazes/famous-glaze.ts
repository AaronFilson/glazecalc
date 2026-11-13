import { calculateUMF } from '../../../../lib/chemistry';
import { Additive, Material, Recipe, RecipeMaterial } from '../../core/models';
import { FamousGlaze, GlazeLine } from './famous-data';

// What a famous glaze's page shows of its chemistry (docs/famous-glazes.md): the native recipe's unity formula,
// and its versions from the materials sold where the reader is (or, for a lead glaze, from its lead-free
// version's own), which the build works out (scripts/famous-glazes.mjs, lib/famous-versions.js) and ships with
// the glaze, so the page solves nothing.

export * from './famous-data';

/** The native recipe's unity formula (its base, without the colorants), or null without a recipe. */
export function nativeUnity(glaze: FamousGlaze): Record<string, number> | null {
  if (!glaze.recipe) return null;
  return calculateUMF(glaze.recipe.lines.map((line) => ({ material: line.record, amount: line.amount }))).umf;
}

export interface LocalVersion {
  /** The base, in percent, by material name. */
  materials: Array<{ name: string; amount: number }>;
  additives: Additive[];
  verdict: 'close' | 'fair' | 'poor';
}

const asAdditive = (line: GlazeLine<Additive>): Additive => ({
  ...line.record,
  amount: String(line.amount),
  unit: 'percent'
});

/**
 * The version made from the materials sold in a region of the library (US, UK, EU, AU or JP), or with none
 * chosen ('') from a lead-free version's own, as the build shipped it, with the glaze's colorants as
 * additives; null where there is none.
 */
export function localVersion(glaze: FamousGlaze, library: string): LocalVersion | null {
  const version = glaze.versions?.[library];
  if (!version) return null;
  return {
    materials: version.lines.map(([name, amount]) => ({ name, amount })),
    additives: (glaze.lead ? (glaze.leadFree?.additives ?? []) : (glaze.recipe?.additives ?? [])).map(asAdditive),
    verdict: version.verdict
  };
}

/**
 * A version's base as a recipe's materials: each material's record, found by its name among the records given
 * (the standard materials for a region's version, a lead-free version's own for its proposal), with its amount
 * as the recipe page writes amounts. Null if any is not among them.
 */
export function versionMaterials(version: LocalVersion, records: readonly Material[]): RecipeMaterial[] | null {
  const materials: RecipeMaterial[] = [];
  for (const line of version.materials) {
    const record = records.find((material) => material.name === line.name);
    if (!record) return null;
    materials.push({ ...structuredClone(record), amount: String(line.amount) });
  }
  return materials;
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
