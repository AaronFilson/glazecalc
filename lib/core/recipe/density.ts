import { labelOf } from '../identity.ts';
import { traitsOf } from '../traits.ts';
import { amountOf } from './amounts.ts';
import type { Amount } from './amounts.ts';
import { oxidesPerGram } from './materials.ts';
import type { MaterialInput, Oxides } from '../types.ts';
import type { Host } from '../host.ts';

// The dry specific gravity (true particle density, g/cm³) of a glaze material
// and of a recipe, for Brongniart's formula (slurry.js). Every value, with the
// sources it was checked against (Handbook of Mineralogy, webmineral, PubChem,
// Wikipedia, manufacturer pages), is in docs/sources/dry-sg-sources.md.
//
// Chemistry alone does not fix a density: the crystal does (silica is 2.65 as
// quartz, 2.33 as cristobalite, 2.20 as fused silica). So:
// - a crystalline standard material takes its mineral's measured density
//   (Handbook of Mineralogy, or the CRC Handbook for made compounds);
// - commercial feldspars, nepheline syenite and Cornwall stones (alkali
//   feldspars, quartz, a little mica: all 2.55 to 2.8) take 2.6, as do clays
//   (kaolinite 2.61 to 2.68, quartz 2.65, mica and illite near 2.8);
// - a frit, being a glass, is worked out from its oxides with Appen's
//   additive partial molar volumes: density = Σ moles × molar mass ÷ Σ moles ×
//   volume (Appen 1949, as tabled in Volf, Mathematical Approach to Glass, 1988);
// - anything else (a material of the potter's own, a blend of minerals whose
//   shares are unknown, a pigment of unknown crystal form) has no estimate.

/** How an estimate was got: a mineral's measured density, a kind's (feldspars, clays), a glass's oxides, or none. */
export type SgBasis = 'mineral' | 'kind' | 'glass' | 'none';

export interface MaterialSg {
  sg: number | null;
  basis: SgBasis;
  /** The mineral, the kind ('feldspar', 'clay') or 'appen' for a glass. */
  source?: string;
  /** Why there is none: one of WHY_NOT's codes. */
  reason?: string;
  /** For a frit with no estimate: the oxides outside the glass factors. */
  oxides?: string[];
}

/** A material as the library or a recipe line keeps it: its kind and chemistry. */
export interface SgMaterial extends MaterialInput {
  category?: string;
  noChemistry?: boolean;
}

/** One line's part in a recipe's estimate: its label (labelOf) and grams. */
export type SgPart = MaterialSg & { label: unknown; grams: number };

/**
 * The densities a host gives the core (host.densities): measured ones by mineral or compound, a kind's
 * (feldspars, clays), and Appen's partial molar volumes of oxides in a glass, cm³ per mole. The catalog's are
 * in lib/catalog/densities.ts, with their sources.
 */
export interface DensityTable {
  readonly minerals: Readonly<Record<string, number>>;
  readonly kinds: Readonly<Record<string, number>>;
  readonly glassVolumes: Readonly<Record<string, number>>;
}

export interface RecipeSg {
  sg: number | null;
  basis: SgBasis | 'mixed';
  reason?: string;
  parts: SgPart[];
  /** Labels (labelOf) of the materials with no estimate, left out. */
  unknown: unknown[];
  /** Their share of the recipe's weight, 0 to 1. */
  unknownShare: number;
}

/** Why a material has no estimate, as a code the app words. */
const WHY_NOT = Object.freeze({
  form: 'crystal-form-unknown',
  mixture: 'mixture-unknown',
  impure: 'impure',
  swelling: 'swelling-clay',
  noChemistry: 'no-chemistry',
  unknown: 'not-classified',
  glassOxides: 'oxides-not-in-factors'
});

/** The weight share of a frit's oxides that may be outside Appen's table and still be passed over. */
const GLASS_IGNORED_SHARE = 0.01;

/** A glass's density from its fired oxides per gram, or null with the oxides it cannot take. */
function glassDensity(host: Host, perGram: Oxides): { sg: number | null; outside: string[] } {
  let mass = 0;
  let volume = 0;
  let other = 0;
  let total = 0;
  const outside: string[] = [];
  for (const [oxide, grams] of Object.entries(perGram)) {
    if (!(grams > 0)) continue;
    total += grams;
    const v = host.densities.glassVolumes[oxide];
    if (v === undefined || !host.oxides.molarMass[oxide]) {
      other += grams;
      outside.push(oxide);
      continue;
    }
    const moles = grams / host.oxides.molarMass[oxide];
    mass += grams;
    volume += moles * v;
  }
  if (!(total > 0) || !(volume > 0) || other / total > GLASS_IGNORED_SHARE) return { sg: null, outside };
  return { sg: mass / volume, outside };
}

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * A material's dry SG: { sg, basis, source } where basis is 'mineral' (its
 * mineral's measured density), 'kind' (feldspars or clays, 2.6), 'glass'
 * (a frit, from Appen's factors) or 'none' (sg null, with a reason code).
 * A material whose traits name its mineral (traits.density: { mineral, reason },
 * the mineral null with why there is no estimate) goes by that; a mineral the
 * host's table lacks is no estimate, with the unknown reason.
 */
function materialSg(host: Host, material: SgMaterial): MaterialSg {
  const known = material ? traitsOf(host, material).density : undefined;
  if (known && typeof known === 'object') {
    const key = known.mineral;
    if (key === null) return { sg: null, basis: 'none', reason: known.reason ?? WHY_NOT.unknown };
    if (Object.hasOwn(host.densities.kinds, key)) return { sg: host.densities.kinds[key]!, basis: 'kind', source: key };
    // A mineral the host's table does not have is no estimate, as an unknown material is: never an undefined SG,
    // which a recipe's sum would turn into NaN. Only the table's own keys count ('toString' is no mineral).
    if (!Object.hasOwn(host.densities.minerals, key)) return { sg: null, basis: 'none', reason: WHY_NOT.unknown };
    return { sg: host.densities.minerals[key]!, basis: 'mineral', source: key };
  }
  if (material?.noChemistry) return { sg: null, basis: 'none', reason: WHY_NOT.noChemistry };
  const category = material?.category;
  if (category === 'frit') {
    const perGram = oxidesPerGram(host, material);
    const { sg, outside } = perGram ? glassDensity(host, perGram) : { sg: null, outside: [] };
    if (sg === null) return { sg: null, basis: 'none', reason: WHY_NOT.glassOxides, oxides: outside };
    return { sg: round(sg), basis: 'glass', source: 'appen' };
  }
  if (host.densities.kinds[category as string])
    return { sg: host.densities.kinds[category as string], basis: 'kind', source: category };
  return { sg: null, basis: 'none', reason: WHY_NOT.unknown };
}

/** The share of a recipe's weight that may have no estimate and still let the rest give one. */
const MOST_UNKNOWN_SHARE = 0.05;

/**
 * A recipe's dry SG: its weight ÷ the sum of each material's weight ÷ its SG.
 * Lines are materials with their amounts as saved. Materials without an
 * estimate may make up at most 5% of the weight; they are then left out, and
 * `unknownShare` says how much was. Basis: 'mineral', 'kind', 'glass' when
 * every part has the one basis, 'mixed' otherwise, or 'none' (sg null).
 */
function recipeDrySg(host: Host, lines: ReadonlyArray<SgMaterial & { amount?: Amount }>): RecipeSg {
  const parts = (lines ?? []).map((line): SgPart => {
    const grams = amountOf(line.amount);
    return {
      label: labelOf(host, line),
      grams: Number.isFinite(grams) && grams > 0 ? grams : 0,
      ...materialSg(host, line)
    };
  });
  const total = parts.reduce((sum, part) => sum + part.grams, 0);
  if (!(total > 0)) return { sg: null, basis: 'none', reason: 'no-amounts', parts, unknown: [], unknownShare: 0 };
  const known = parts.filter((part) => part.grams > 0 && part.sg !== null);
  const unknown = parts.filter((part) => part.grams > 0 && part.sg === null);
  const knownGrams = known.reduce((sum, part) => sum + part.grams, 0);
  const unknownShare = unknown.reduce((sum, part) => sum + part.grams, 0) / total;
  const unknownLabels = unknown.map((part) => part.label);
  // The epsilon lets exactly 5% through whatever the floating point makes of it.
  if (!known.length || unknownShare > MOST_UNKNOWN_SHARE + 1e-9) {
    return { sg: null, basis: 'none', reason: 'too-much-unknown', parts, unknown: unknownLabels, unknownShare };
  }
  const volume = known.reduce((sum, part) => sum + part.grams / part.sg!, 0);
  const bases = [...new Set(known.map((part) => part.basis))];
  return {
    sg: round(knownGrams / volume),
    basis: bases.length === 1 ? bases[0] : 'mixed',
    parts,
    unknown: unknownLabels,
    unknownShare
  };
}

export { WHY_NOT, MOST_UNKNOWN_SHARE, glassDensity, materialSg, recipeDrySg };
