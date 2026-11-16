// The core's chemistry, nameless and without words (docs/adr/0030-nameless-chemistry-core.md).

export { WORK, WORK_CEILING, bestFit, fitAmounts, molesPerGram, newMeter, oxideMoles } from './fit.js';
export { ATOMIC_WEIGHTS, MOLAR_MASS, OXIDE_GROUPS } from './oxides.js';
export { CONES, boronFor, leadFreeTarget } from './lead.js';
export { EXPANSION, expansion } from './expansion.js';
export { boundedLeastSquares } from './lsq.js';
export { calculateUMF } from './umf.js';
export { closeness } from './closeness.js';
export { materialWeights, oxidesGivenIn, prepareMaterial } from './materials.js';
export { selectMaterials } from './select.js';
