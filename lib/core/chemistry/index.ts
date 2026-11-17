// The core's chemistry, nameless and without words (docs/adr/0030-nameless-chemistry-core.md).

export { WORK, WORK_CEILING, bestFit, fitAmounts, molesPerGram, newMeter, oxideMoles } from './fit.ts';
export { ATOMIC_WEIGHTS, MOLAR_MASS, OXIDE_GROUPS } from './oxides.ts';
export { CONES, boronFor, leadFreeTarget } from './lead.ts';
export { EXPANSION, expansion } from './expansion.ts';
export { boundedLeastSquares } from './lsq.ts';
export { calculateUMF } from './umf.ts';
export { closeness } from './closeness.ts';
export { materialWeights, oxidesGivenIn, prepareMaterial } from './materials.ts';
export { selectMaterials } from './select.ts';
