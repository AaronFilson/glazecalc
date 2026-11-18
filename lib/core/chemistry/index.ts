// The core's chemistry, nameless and without words (docs/adr/0030-nameless-chemistry-core.md).

export { WORK, WORK_CEILING, bestFit, fitAmounts, molesPerGram, newMeter, oxideMoles } from './fit.ts';
export { FLUX_GROUPS, isFlux, isOxide, isVolatile, molarMass } from './oxides.ts';
export { boronFor, leadFreeTarget } from './lead.ts';
export { expansion } from './expansion.ts';
export { boundedLeastSquares } from './lsq.ts';
export { calculateUMF } from './umf.ts';
export { closeness } from './closeness.ts';
export { materialWeights, oxidesGivenIn, prepareMaterial } from './materials.ts';
export { selectMaterials } from './select.ts';
