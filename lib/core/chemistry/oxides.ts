import { problem } from '../problem.ts';
import type { Host } from '../host.ts';
import type { OxideGroup, OxideTable } from '../types.ts';

// The core holds no table of elements or oxides (docs/adr/0031-functional-core.md): it reads the host's,
// host.oxides (Glazecalc's is the catalog's OXIDES, lib/catalog/oxides.ts). What it keeps is the definition
// the unity formula rests on: R2O and RO together are the fluxes, which it puts at 1.0.
const FLUX_GROUPS: readonly OxideGroup[] = Object.freeze(['R2O', 'RO']);

/** The grams in a mole of a formula ('Al2O3'), from the host's atomic weights. */
const molarMass = function (host: { readonly oxides: Pick<OxideTable, 'atomicWeights'> }, formula: string): number {
  const weights = host.oxides.atomicWeights;
  let mass = 0;
  let matched = '';
  formula.replace(/([A-Z][a-z]?)(\d*)/g, (token: string, element: string, count: string): string => {
    if (!weights[element]) throw problem('unknown-element', { element, formula });
    mass += weights[element] * (count ? parseInt(count, 10) : 1);
    matched += token;
    return token;
  });
  if (matched !== formula) throw problem('bad-formula', { formula });
  return mass;
};

/** Whether a formula is one of the host's oxides. */
const isOxide = (host: Host, formula: string): boolean => Object.hasOwn(host.oxides.groups, formula);
/** Whether a formula is driven off in firing (it counts toward the loss on ignition). */
const isVolatile = (host: Host, formula: string): boolean => host.oxides.volatiles.indexOf(formula) !== -1;
/** Whether an oxide is a flux: in R2O or RO. */
const isFlux = (host: Host, formula: string): boolean =>
  FLUX_GROUPS.indexOf(host.oxides.groups[formula] as OxideGroup) !== -1;

export { FLUX_GROUPS, isFlux, isOxide, isVolatile, molarMass };
