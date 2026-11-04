// Types for lib/recipe/density.js (see index.d.ts): dry specific gravity, g/cm³.

/** How an estimate was got: a mineral's measured density, a kind's (feldspars, clays), a glass's oxides, or none. */
export type SgBasis = 'mineral' | 'kind' | 'glass' | 'none';

export interface MaterialSg {
  sg: number | null;
  basis: SgBasis;
  /** The mineral, the kind ('feldspar', 'clay') or 'appen' for a glass. */
  source?: string;
  /** Why there is none: crystal-form-unknown, mixture-unknown, impure, swelling-clay, no-chemistry, not-classified, oxides-not-in-factors. */
  reason?: string;
  /** For a frit with no estimate: the oxides outside the glass factors. */
  oxides?: string[];
}

export interface RecipeSg {
  sg: number | null;
  basis: SgBasis | 'mixed';
  reason?: string;
  parts: Array<MaterialSg & { name: string; grams: number }>;
  /** Names of the materials with no estimate, left out. */
  unknown: string[];
  /** Their share of the recipe's weight, 0 to 1. */
  unknownShare: number;
}

export const MINERALS: Readonly<Record<string, number>>;
export const KINDS: Readonly<Record<string, number>>;
export const GLASS_VOLUMES: Readonly<Record<string, number>>;
export const MOST_UNKNOWN_SHARE: number;
export function glassDensity(perGram: Record<string, number>): { sg: number | null; outside: string[] };
/** A material as the library or a recipe line keeps it: its name, kind and chemistry (fields). */
export interface SgMaterial {
  name?: string;
  category?: string;
  noChemistry?: boolean;
  /** 'Standard' for a library record: only those are known by name. */
  ownedBy?: string;
  fields?: ReadonlyArray<{ name: string; amount?: string | number }>;
}
export function materialSg(material: SgMaterial): MaterialSg;
export function recipeDrySg(lines: ReadonlyArray<SgMaterial & { amount?: string }>): RecipeSg;
